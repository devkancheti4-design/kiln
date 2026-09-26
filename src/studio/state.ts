// Studio state: one site (pages + pictures) with undo/redo.
// The source of each page is the truth; panels patch it, the code editor edits it directly.
// Pages share one design: after any change, the shared parts are mirrored to every other page.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Content } from '../engine/content';
import type { Assets } from '../engine/exporter';
import { numberOf } from '../engine/genome';
import { copySiteFields, type PageDoc, type PageKind, pageStarter, rerenderPages, sameSiteFields, siteInfo, syncPages, uniqueSlug } from '../engine/pages';
import { applyContent, getMarkup, identify } from '../engine/patch';
import { HOME, renderMarkup } from '../engine/render';

export type { PageDoc };

export interface Doc {
  pages: PageDoc[]; // pages[0] is the home page
  assets: Assets;
}

export const home = (d: Doc) => d.pages[0];

interface HistoryState {
  past: Doc[];
  present: Doc;
  future: Doc[];
  group: string;
  at: number;
}

export function useDocHistory(initial: Doc) {
  const [h, setH] = useState<HistoryState>({ past: [], present: initial, future: [], group: '', at: 0 });

  const update = useCallback((fn: (d: Doc) => Doc, group?: string) => {
    setH((s) => {
      const next = fn(s.present);
      if (next === s.present || (next.pages === s.present.pages && next.assets === s.present.assets)) return s;
      const now = performance.now();
      const merge = !!group && group === s.group && now - s.at < 1200;
      return {
        past: merge ? s.past : [...s.past.slice(-200), s.present],
        present: next,
        future: [],
        group: group ?? '',
        at: now,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setH((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], group: '', at: 0 } : s));
  }, []);
  const redo = useCallback(() => {
    setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), group: '', at: 0 } : s));
  }, []);
  /** Ends the current merge group so the next change becomes its own undo step. */
  const seal = useCallback(() => setH((s) => (s.group ? { ...s, group: '' } : s)), []);

  return { doc: h.present, canUndo: h.past.length > 0, canRedo: h.future.length > 0, update, undo, redo, seal };
}

export type Step = 'shape' | 'glaze' | 'carve' | 'code';

/** A page's markup was edited by hand when it no longer matches what Carve would render. */
export function pageLocked(pages: PageDoc[], p: PageDoc): boolean {
  return getMarkup(p.source) !== renderMarkup(p.content, siteInfo(pages, p.slug));
}

export interface StudioApi {
  doc: Doc;
  /** the page being edited */
  page: PageDoc;
  current: string;
  setCurrent: (slug: string) => void;
  /** true when the current page's markup was edited by hand (Carve would overwrite it) */
  locked: boolean;
  number: number | null; // catalog number of the home page, or null for an original
  /** change the current page's source (design changes are mirrored to every page) */
  patch: (fn: (src: string) => string, group?: string) => void;
  setContent: (fn: (c: Content) => Content, group?: string) => void;
  setSource: (src: string, group?: string) => void;
  /** replace several pages' sources at once (from a linked folder); unknown slugs become new pages */
  setSources: (pages: { slug: string; source: string }[], group?: string) => void;
  setAssets: (fn: (a: Assets) => Assets) => void;
  rebuildPage: () => void;
  addPage: (kind: PageKind, title: string) => string;
  removePage: (slug: string) => void;
  movePage: (slug: string, dir: -1 | 1) => void;
  renamePage: (slug: string, patch: { slug?: string; nav?: string }) => void;
  seal: () => void;
  undo: () => void;
  redo: () => void;
  goToCode: (offset?: number, select?: [number, number]) => void;
}

export const StudioContext = createContext<StudioApi | null>(null);

export function useStudio(): StudioApi {
  const api = useContext(StudioContext);
  if (!api) throw new Error('useStudio outside the studio');
  return api;
}

function replacePage(pages: PageDoc[], slug: string, fn: (p: PageDoc) => PageDoc): PageDoc[] {
  return pages.map((p) => (p.slug === slug ? fn(p) : p));
}

export function useStudioApi(hist: ReturnType<typeof useDocHistory>, goToCode: StudioApi['goToCode']): StudioApi {
  const { doc, update, seal, undo, redo } = hist;
  const [wanted, setCurrent] = useState(HOME);
  const current = doc.pages.some((p) => p.slug === wanted) ? wanted : HOME;
  const page = doc.pages.find((p) => p.slug === current) ?? doc.pages[0];
  const locked = useMemo(() => pageLocked(doc.pages, page), [doc.pages, page]);
  const h = doc.pages[0];
  const identity = useMemo(() => identify(h.source, h.content), [h.source, h.content]);

  return useMemo<StudioApi>(() => {
    const onCurrent = (d: Doc, fn: (p: PageDoc) => PageDoc): Doc => ({ ...d, pages: syncPages(replacePage(d.pages, current, fn), current) });
    return {
      doc,
      page,
      current,
      setCurrent,
      locked,
      number: identity ? numberOf(identity) : null,
      patch: (fn, group) => update((d) => onCurrent(d, (p) => ({ ...p, source: fn(p.source) })), group),
      setContent: (fn, group) =>
        update((d) => {
          const before = d.pages.find((p) => p.slug === current)!;
          const content = fn(before.content);
          const wasLocked = pageLocked(d.pages, before);
          let pages = replacePage(d.pages, current, (p) => ({ ...p, content, source: wasLocked ? p.source : applyContent(p.source, content, siteInfo(d.pages, p.slug)) }));
          if (!sameSiteFields(before.content, content) && pages.length > 1) {
            // the name, logo, top-bar button and footer are the same on every page
            pages = pages.map((p) => (p.slug === current ? p : { ...p, content: copySiteFields(content, p.content) }));
            pages = rerenderPages(pages, (p) => p.slug !== current && pageLocked(d.pages, d.pages.find((q) => q.slug === p.slug)!));
          }
          return { ...d, pages };
        }, group),
      setSource: (source, group) => update((d) => onCurrent(d, (p) => ({ ...p, source })), group),
      setSources: (list, group) =>
        update((d) => {
          let pages = d.pages;
          for (const { slug, source } of list) {
            if (pages.some((p) => p.slug === slug)) pages = replacePage(pages, slug, (p) => (p.source === source ? p : { ...p, source }));
            else pages = [...pages, { slug, nav: slug.replace(/-/g, ' '), source, content: { ...structuredClone(pages[0].content), sections: [] } }];
          }
          return pages === d.pages ? d : { ...d, pages: syncPages(pages, list[0]?.slug ?? HOME) };
        }, group),
      setAssets: (fn) => update((d) => ({ ...d, assets: fn(d.assets) })),
      rebuildPage: () => update((d) => onCurrent(d, (p) => ({ ...p, source: applyContent(p.source, p.content, siteInfo(d.pages, p.slug)) }))),
      addPage: (kind, title) => {
        const slug = uniqueSlug(title || kind, doc.pages.map((p) => p.slug));
        update((d) => {
          const base = d.pages[0];
          const content = pageStarter(kind, base.content, title);
          const nav = (title.trim() || kind.charAt(0).toUpperCase() + kind.slice(1)).slice(0, 24);
          const pages = [...d.pages, { slug, nav, source: base.source, content }];
          // every page starts as a copy of the home file with its own words carved in
          return { ...d, pages: rerenderPages(pages, (p) => p.slug !== slug && pageLocked(d.pages, d.pages.find((q) => q.slug === p.slug)!)) };
        }, 'page');
        return slug;
      },
      removePage: (slug) =>
        update((d) => {
          if (slug === HOME) return d;
          const pages = d.pages.filter((p) => p.slug !== slug);
          return { ...d, pages: rerenderPages(pages, (p) => pageLocked(d.pages, d.pages.find((q) => q.slug === p.slug)!)) };
        }),
      movePage: (slug, dir) =>
        update((d) => {
          const i = d.pages.findIndex((p) => p.slug === slug);
          const j = i + dir;
          if (i < 1 || j < 1 || j >= d.pages.length) return d;
          const pages = [...d.pages];
          [pages[i], pages[j]] = [pages[j], pages[i]];
          return { ...d, pages: rerenderPages(pages, (p) => pageLocked(d.pages, d.pages.find((q) => q.slug === p.slug)!)) };
        }),
      renamePage: (slug, patchIn) =>
        update((d) => {
          if (slug === HOME && patchIn.slug !== undefined) return d;
          const nextSlug = patchIn.slug !== undefined ? uniqueSlug(patchIn.slug, d.pages.filter((p) => p.slug !== slug).map((p) => p.slug)) : slug;
          const pages = d.pages.map((p) => (p.slug === slug ? { ...p, slug: nextSlug, nav: patchIn.nav ?? p.nav } : p));
          const out = { ...d, pages: rerenderPages(pages, (p) => pageLocked(d.pages, d.pages.find((q) => q.slug === (p.slug === nextSlug ? slug : p.slug))!)) };
          if (nextSlug !== slug) setCurrent((c) => (c === slug ? nextSlug : c));
          return out;
        }, 'rename'),
      seal,
      undo,
      redo,
      goToCode,
    };
  }, [doc, page, current, locked, identity, update, seal, undo, redo, goToCode]);
}
