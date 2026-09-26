// Studio state: one document (source + words + pictures) with undo/redo.
// The source is the truth; panels patch it, the code editor edits it directly.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Content } from '../engine/content';
import type { Assets } from '../engine/exporter';
import { numberOf } from '../engine/genome';
import { applyContent, getMarkup, identify } from '../engine/patch';
import { renderMarkup } from '../engine/render';

export interface Doc {
  source: string;
  content: Content;
  assets: Assets;
}

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
      if (next === s.present || (next.source === s.present.source && next.content === s.present.content && next.assets === s.present.assets)) return s;
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

export interface StudioApi {
  doc: Doc;
  /** true when the page markup was edited by hand (Carve would overwrite it) */
  locked: boolean;
  number: number | null; // catalog number, or null for an original
  patch: (fn: (src: string) => string, group?: string) => void;
  setContent: (fn: (c: Content) => Content, group?: string) => void;
  setSource: (src: string, group?: string) => void;
  setAssets: (fn: (a: Assets) => Assets) => void;
  rebuildPage: () => void;
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

export function useStudioApi(
  hist: ReturnType<typeof useDocHistory>,
  goToCode: StudioApi['goToCode'],
): StudioApi {
  const { doc, update, seal, undo, redo } = hist;
  const locked = useMemo(() => getMarkup(doc.source) !== renderMarkup(doc.content), [doc.source, doc.content]);
  const identity = useMemo(() => identify(doc.source, doc.content), [doc.source, doc.content]);

  return useMemo<StudioApi>(
    () => ({
      doc,
      locked,
      number: identity ? numberOf(identity) : null,
      patch: (fn, group) => update((d) => ({ ...d, source: fn(d.source) }), group),
      setContent: (fn, group) =>
        update((d) => {
          const content = fn(d.content);
          const markupLocked = getMarkup(d.source) !== renderMarkup(d.content);
          return { ...d, content, source: markupLocked ? d.source : applyContent(d.source, content) };
        }, group),
      setSource: (source, group) => update((d) => ({ ...d, source }), group),
      setAssets: (fn) => update((d) => ({ ...d, assets: fn(d.assets) })),
      rebuildPage: () => update((d) => ({ ...d, source: applyContent(d.source, d.content) })),
      seal,
      undo,
      redo,
      goToCode,
    }),
    [doc, locked, identity, update, seal, undo, redo, goToCode],
  );
}
