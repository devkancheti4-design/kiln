// The Studio: shape, glaze, carve and code one piece, then fire it.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPiece, type Piece, savePiece } from '../app/db';
import { usePref } from '../app/prefs';
import { niceNumber, pieceFromNumber } from '../app/pieces';
import { go, type Route } from '../app/router';
import { ThemeToggle } from '../app/theme';
import { formatNumber } from '../engine/genome';
import { cx, Modal, Segmented, toast } from '../ui/controls';
import {
  IconBack,
  IconCarve,
  IconCode,
  IconDesktop,
  IconFire,
  IconGlaze,
  IconGuide,
  IconInspect,
  IconKeyboard,
  IconPhone,
  IconRedo,
  IconShape,
  IconShelf,
  IconTablet,
  IconUndo,
} from '../ui/icons';
import { CarvePanel } from './CarvePanel';
import { FireDialog } from './FireDialog';
import { GlazePanel } from './GlazePanel';
import { FolderProvider, OpenInButton } from './OpenIn';
import { type Device, type PickInfo, Preview } from './Preview';
import { ShapePanel } from './ShapePanel';
import { type Doc, type Step, StudioContext, useDocHistory, useStudioApi } from './state';
import { HOME } from '../engine/render';

const CodePanel = lazy(() => import('./CodePanel').then((m) => ({ default: m.CodePanel })));

export interface CodeTarget {
  offset: number;
  select?: [number, number];
  nonce: number;
}

export function Studio({ route }: { route: Route }) {
  const [state, setState] = useState<{ piece: Piece; persisted: boolean } | null | 'missing'>(null);

  useEffect(() => {
    let alive = true;
    if (route.page === 'design') setState({ piece: pieceFromNumber(route.number), persisted: false });
    else if (route.page === 'studio')
      getPiece(route.id).then((p) => {
        if (alive) setState(p ? { piece: p, persisted: true } : 'missing');
      });
    return () => {
      alive = false;
    };
  }, [route]);

  if (state === 'missing')
    return (
      <div className="k-empty" style={{ minHeight: '100vh' }}>
        <h2>That piece is not on this shelf.</h2>
        <p>It may have been made on another device, or deleted.</p>
        <a className="k-btn k-btn-primary" href="#/shelf">
          Go to your shelf
        </a>
      </div>
    );
  if (!state)
    return (
      <div className="k-loading">
        <span className="k-loading-wheel" />
      </div>
    );
  return <StudioInner piece={state.piece} persisted={state.persisted} />;
}

const STEPS: { id: Step; label: string; icon: React.ReactNode; key: string }[] = [
  { id: 'shape', label: 'Shape', icon: <IconShape />, key: '1' },
  { id: 'glaze', label: 'Glaze', icon: <IconGlaze />, key: '2' },
  { id: 'carve', label: 'Carve', icon: <IconCarve />, key: '3' },
  { id: 'code', label: 'Code', icon: <IconCode />, key: '4' },
];

const STEP_INTRO: Record<Step, { title: string; text: string }> = {
  shape: { title: 'Shape', text: 'The form of your site. Every control here changes one line of code — the line is shown under it.' },
  glaze: { title: 'Glaze', text: 'Color, type and texture. Three colors paint the whole site; the engine mixes the rest.' },
  carve: { title: 'Carve', text: 'Your name, your words, your pictures. Everything stays on this device.' },
  code: { title: 'Code', text: 'The real file. Change anything — drag numbers, click colors, or type.' },
};

function StudioInner({ piece, persisted: persistedAtStart }: { piece: Piece; persisted: boolean }) {
  const initialDoc = useMemo<Doc>(
    () => ({ pages: [{ slug: HOME, nav: '', source: piece.source, content: piece.content }, ...(piece.pages ?? [])], assets: piece.assets }),
    [piece],
  );
  const hist = useDocHistory(initialDoc);
  const [meta, setMeta] = useState({ id: piece.id, title: piece.title, created: piece.created, origin: piece.origin, fired: piece.fired });
  const persisted = useRef(persistedAtStart);
  const [saved, setSaved] = useState(persistedAtStart);
  const [step, setStep] = usePref<Step>('studio-step', 'shape');
  const [device, setDevice] = usePref<Device>('studio-device', typeof innerWidth === 'number' && innerWidth < 900 ? 'phone' : 'desktop');
  const [inspect, setInspect] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [fireOpen, setFireOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [codeTarget, setCodeTarget] = useState<CodeTarget | null>(null);
  const [pick, setPick] = useState<PickInfo | null>(null);

  const goToCode = useCallback(
    (offset?: number, select?: [number, number]) => {
      setStep('code');
      if (offset !== undefined) setCodeTarget({ offset, select, nonce: performance.now() });
    },
    [setStep],
  );

  const api = useStudioApi(hist, goToCode);
  const doc = hist.doc;

  // Autosave — a fresh design becomes a piece on the shelf the moment you change anything.
  const docRef = useRef(doc);
  docRef.current = doc;
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const lockedRef = useRef(api.locked);
  lockedRef.current = api.locked;
  const saveNow = useCallback(async () => {
    const d = docRef.current;
    const m = metaRef.current;
    await savePiece({
      id: m.id,
      title: m.title,
      created: m.created,
      updated: Date.now(),
      source: d.pages[0].source,
      content: d.pages[0].content,
      markupLocked: lockedRef.current,
      assets: d.assets,
      pages: d.pages.slice(1).map((p) => ({ slug: p.slug, nav: p.nav, source: p.source, content: p.content })),
      origin: m.origin,
      fired: m.fired,
    });
    if (!persisted.current) {
      persisted.current = true;
      history.replaceState(null, '', `#/studio/${m.id}`);
      toast('Saved to your shelf — it keeps saving as you work.');
    }
    setSaved(true);
  }, []);
  useEffect(() => {
    if (!persisted.current && doc === initialDoc && meta.title === piece.title) return;
    setSaved(false);
    const t = setTimeout(saveNow, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, meta]);

  // Keep the title in step with the name until someone renames the piece.
  const brand = doc.pages[0].content.brand;
  const lastBrand = useRef(brand);
  useEffect(() => {
    const before = lastBrand.current;
    if (brand !== before) {
      setMeta((m) => (m.title === before ? { ...m, title: brand } : m));
      lastBrand.current = brand;
    }
  }, [brand]);

  // Links between pages in the preview switch the page being edited.
  const [scrollHash, setScrollHash] = useState<string | null>(null);
  const onLink = useCallback(
    (href: string) => {
      const m = /^([\w-]+)\.html(#[\w-]*)?$/.exec(href);
      if (!m) return false;
      if (!doc.pages.some((p) => p.slug === m[1])) return false;
      api.setCurrent(m[1]);
      setScrollHash(m[2] || '#top');
      return true;
    },
    [doc.pages, api],
  );

  // The outline that follows the code cursor only makes sense while the code is open.
  useEffect(() => {
    if (step !== 'code') setHighlight(null);
  }, [step]);

  const onPick = useCallback(
    (p: PickInfo) => {
      setPick(p);
      setHighlight(p.offset);
      setInspect(false);
      goToCode(p.offset);
    },
    [goToCode],
  );

  // Keyboard: 1–4 steps, ⌘Z / ⇧⌘Z, I inspect, D device, F fire, ⌘S save.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // the code editor already handled it
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"], .cm-editor');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        hist.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toast(persisted.current ? 'Saved on this device. Kiln saves as you work.' : 'Change anything and Kiln saves it to your shelf.');
        return;
      }
      if (typing || mod || e.altKey) return;
      const s = STEPS.find((x) => x.key === e.key);
      if (s) return setStep(s.id);
      if (e.key === 'i' || e.key === 'I') setInspect((v) => !v);
      if (e.key === 'd' || e.key === 'D') setDevice((d) => (d === 'desktop' ? 'tablet' : d === 'tablet' ? 'phone' : 'desktop'));
      if (e.key === 'f' || e.key === 'F') setFireOpen(true);
      if (e.key === 'Escape') setInspect(false);
      if (e.key === '?') setKeysOpen(true);
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [hist, setStep, setDevice]);

  const badge = api.number ? (
    <span className="k-badge" data-tip="This exact design is in the catalog">
      {niceNumber(api.number)}
    </span>
  ) : (
    <span className="k-badge k-badge-glaze" data-tip={`Thrown from No. ${formatNumber(meta.origin)} — changed beyond the catalog`}>
      ✦ Original · one of one
    </span>
  );

  return (
    <StudioContext.Provider value={api}>
      <FolderProvider pieceId={meta.id} title={meta.title} ensureSaved={saveNow}>
      <div className="s-studio" data-step={step}>
        <header className="s-top">
          <div className="s-top-left">
            <a className="k-icon-btn" href={persisted.current ? '#/shelf' : '#/'} aria-label="Back" data-tip={persisted.current ? 'Back to your shelf' : 'Back to the wheel'}>
              <IconBack />
            </a>
            <input
              className="s-title"
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              aria-label="Piece name"
              spellCheck={false}
            />
            {badge}
            <span className={cx('s-saved', saved && 'is-saved')}>{persisted.current ? (saved ? 'Saved' : 'Saving…') : 'Not on your shelf yet'}</span>
          </div>
          <div className="s-top-mid">
            <Segmented<Device>
              size="sm"
              label="Device"
              value={device}
              onChange={setDevice}
              options={[
                { value: 'desktop', label: <IconDesktop size={16} />, tip: 'Desktop (D)' },
                { value: 'tablet', label: <IconTablet size={16} />, tip: 'Tablet' },
                { value: 'phone', label: <IconPhone size={16} />, tip: 'Phone' },
              ]}
            />
          </div>
          <div className="s-top-right">
            <button type="button" className={cx('k-icon-btn s-hide-sm', inspect && 'is-on')} onClick={() => setInspect((v) => !v)} data-tip="Point at anything to see its code (I)" aria-pressed={inspect}>
              <IconInspect />
            </button>
            <button type="button" className="k-icon-btn s-hide-sm" onClick={hist.undo} disabled={!hist.canUndo} data-tip="Undo (⌘Z)" aria-label="Undo">
              <IconUndo />
            </button>
            <button type="button" className="k-icon-btn s-hide-sm" onClick={hist.redo} disabled={!hist.canRedo} data-tip="Redo (⇧⌘Z)" aria-label="Redo">
              <IconRedo />
            </button>
            <ThemeToggle />
            <span className="s-hide-sm">
              <OpenInButton compact />
            </span>
            <button type="button" className="k-btn k-btn-primary s-fire-btn" onClick={() => setFireOpen(true)}>
              <IconFire size={17} />
              Fire
            </button>
          </div>
        </header>

        <nav className="s-rail" aria-label="Steps">
          {STEPS.map((s) => (
            <button key={s.id} type="button" className={cx('s-rail-btn', step === s.id && 'is-on')} onClick={() => setStep(s.id)} aria-current={step === s.id}>
              {s.icon}
              <span>{s.label}</span>
              <kbd>{s.key}</kbd>
            </button>
          ))}
          <div className="s-rail-sep" />
          <a className="s-rail-btn s-rail-small" href="#/guide">
            <IconGuide />
            <span>Guide</span>
          </a>
          <a className="s-rail-btn s-rail-small" href="#/shelf">
            <IconShelf />
            <span>Shelf</span>
          </a>
          <button type="button" className="s-rail-btn s-rail-small" onClick={() => setKeysOpen(true)}>
            <IconKeyboard />
            <span>Keys</span>
          </button>
        </nav>

        <main className="s-stage">
          <Preview
            source={api.page.source}
            pageKey={api.current}
            scrollTo={scrollHash}
            assets={doc.assets}
            device={device}
            inspect={inspect}
            highlight={highlight}
            onPick={onPick}
            onLink={onLink}
          />
          {doc.pages.length > 1 && (
            <nav className="s-pagebar" aria-label="Pages">
              {doc.pages.map((p) => (
                <button key={p.slug} type="button" className={cx(api.current === p.slug && 'is-on')} onClick={() => { api.setCurrent(p.slug); setScrollHash('#top'); }}>
                  {p.slug}.html
                </button>
              ))}
            </nav>
          )}
          <button type="button" className="s-device-fab" onClick={() => setDevice(device === 'phone' ? 'desktop' : 'phone')}>
            {device === 'phone' ? <IconDesktop size={15} /> : <IconPhone size={15} />}
            {device === 'phone' ? 'Desktop view' : 'Phone view'}
          </button>
          {inspect && <div className="s-inspect-hint">Point at anything on the page, then click to see its code. <kbd className="k-kbd">Esc</kbd></div>}
        </main>

        <aside className="s-panel" aria-label={STEP_INTRO[step].title}>
          {step !== 'code' && (
            <header className="s-panel-head">
              <h2>{STEP_INTRO[step].title}</h2>
              <p>{STEP_INTRO[step].text}</p>
            </header>
          )}
          <div className={cx('s-panel-body', step === 'code' && 's-panel-code')}>
            {step === 'shape' && <ShapePanel />}
            {step === 'glaze' && <GlazePanel />}
            {step === 'carve' && <CarvePanel />}
            {step === 'code' && (
              <Suspense fallback={<div className="k-loading"><span className="k-loading-wheel" /></div>}>
                <CodePanel target={codeTarget} pick={pick} onCursorTag={setHighlight} />
              </Suspense>
            )}
          </div>
        </aside>
      </div>

      <FireDialog
        open={fireOpen}
        onClose={() => setFireOpen(false)}
        title={meta.title}
        origin={meta.origin}
        onFired={(fired: { at: number; serial: string }) => setMeta((m) => ({ ...m, fired }))}
      />
      <Modal open={keysOpen} onClose={() => setKeysOpen(false)} title="Keyboard">
        <h2>Keyboard</h2>
        <div className="s-keys">
          {[
            ['1 – 4', 'Shape, Glaze, Carve, Code'],
            ['Space', 'Spin the wheel (in Shape)'],
            ['I', 'Inspect — point at the page to find its code'],
            ['D', 'Desktop / tablet / phone'],
            ['F', 'Fire (download)'],
            ['⌘ Z', 'Undo'],
            ['⇧ ⌘ Z', 'Redo'],
            ['⌘ F', 'Find in code (in Code)'],
            ['Drag a number', 'Scrub values in the code'],
          ].map(([k, v]) => (
            <div key={k} className="s-key-row">
              <kbd className="k-kbd">{k}</kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Modal>
      </FolderProvider>
    </StudioContext.Provider>
  );
}

export function goHome() {
  go('');
}
