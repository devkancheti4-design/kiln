// The code editor: CodeMirror 6 with three Kiln touches —
//   · drag any number in CSS to scrub it (the page updates live)
//   · click a color swatch to pick a new color
//   · lines that change from the panels or undo flash so you see what moved
import { autocompletion, closeBrackets, closeBracketsKeymap, type CompletionContext, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { bracketMatching, codeFolding, foldEffect, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Annotation, EditorState, type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  crosshairCursor,
  Decoration,
  type DecorationSet,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';
import { FACES } from '../engine/typefaces';
import { TOKEN_DOCS } from '../engine/render';
import { SWITCH_REF } from '../guide/reference';

const External = Annotation.define<boolean>();

// ------------------------------------------------------------------ flash

const addFlash = StateEffect.define<{ from: number; to: number }>();
const clearFlash = StateEffect.define<null>();
const flashLine = Decoration.line({ class: 'cm-flash' });
const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearFlash)) deco = Decoration.none;
      if (e.is(addFlash)) {
        const b = new RangeSetBuilder<Decoration>();
        const doc = tr.state.doc;
        const a = doc.lineAt(Math.min(e.value.from, doc.length)).number;
        const z = doc.lineAt(Math.min(e.value.to, doc.length)).number;
        for (let n = a; n <= Math.min(z, a + 40); n++) b.add(doc.line(n).from, doc.line(n).from, flashLine);
        deco = b.finish();
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ------------------------------------------------------------------ scrub + swatches

const NUM = /-?(?:\d+\.\d+|\d+|\.\d+)(?:px|rem|em|%|deg|s|ms|vh|vw|cqi|fr|ch)?/g;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function styleRegions(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /<style\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const from = m.index + m[0].length;
    const to = text.indexOf('</style>', from);
    if (to < 0) break;
    out.push([from, to]);
    re.lastIndex = to;
  }
  return out;
}

class Swatch extends WidgetType {
  constructor(readonly color: string) {
    super();
  }
  eq(o: Swatch) {
    return o.color === this.color;
  }
  toDOM() {
    const s = document.createElement('span');
    s.className = 'cm-swatch';
    s.style.background = this.color;
    s.title = 'Click to pick a color';
    return s;
  }
  ignoreEvent() {
    return false;
  }
}

const scrubMark = Decoration.mark({ class: 'cm-scrub', attributes: { title: 'Drag to change' } });

function buildDecos(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const regions = styleRegions(text);
  const b = new RangeSetBuilder<Decoration>();
  const items: { from: number; to: number; deco: Decoration }[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (const [rf, rt] of regions) {
      const a = Math.max(from, rf);
      const z = Math.min(to, rt);
      if (a >= z) continue;
      const chunk = text.slice(a, z);
      // skip comments inside CSS
      const comments: [number, number][] = [];
      const cre = /\/\*[\s\S]*?\*\//g;
      let cm: RegExpExecArray | null;
      while ((cm = cre.exec(text.slice(rf, rt)))) comments.push([rf + cm.index, rf + cm.index + cm[0].length]);
      const inComment = (p: number) => comments.some(([x, y]) => p >= x && p < y);
      let m: RegExpExecArray | null;
      NUM.lastIndex = 0;
      while ((m = NUM.exec(chunk))) {
        const p = a + m.index;
        const before = text[p - 1] ?? ' ';
        const after = text[p + m[0].length] ?? ' ';
        if (/[\w#.$-]/.test(before) || /[\w-]/.test(after) || inComment(p)) continue;
        items.push({ from: p, to: p + m[0].length, deco: scrubMark });
      }
      HEX.lastIndex = 0;
      while ((m = HEX.exec(chunk))) {
        const p = a + m.index;
        if (inComment(p)) continue;
        items.push({ from: p, to: p, deco: Decoration.widget({ widget: new Swatch(m[0]), side: -1 }) });
      }
    }
  }
  items.sort((x, y) => x.from - y.from || (x.to === x.from ? -1 : 1));
  for (const it of items) b.add(it.from, it.to, it.deco);
  return b.finish();
}

const scrubPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecos(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildDecos(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const UNITS_NONNEG = new Set(['px', 'rem', 'em', '%', 'ch', 'vh', 'vw', 'cqi', 's', 'ms', 'fr']);

function scrubHandlers(onScrubEnd: () => void): Extension {
  return EditorView.domEventHandlers({
    mousedown(e, view) {
      const el = e.target as HTMLElement;
      if (e.button !== 0) return false;
      if (el.classList?.contains('cm-swatch')) {
        const pos = view.posAtDOM(el);
        const m = /^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/.exec(view.state.sliceDoc(pos, pos + 9));
        if (!m) return false;
        e.preventDefault();
        let from = pos;
        let to = pos + m[0].length;
        const input = document.createElement('input');
        input.type = 'color';
        const v = m[0].length === 4 ? `#${m[0][1]}${m[0][1]}${m[0][2]}${m[0][2]}${m[0][3]}${m[0][3]}` : m[0].slice(0, 7);
        input.value = v.toLowerCase();
        input.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px;opacity:0;pointer-events:none`;
        document.body.append(input);
        input.addEventListener('input', () => {
          view.dispatch({ changes: { from, to, insert: input.value }, userEvent: 'input.color' });
          to = from + input.value.length;
        });
        input.addEventListener('change', () => {
          input.remove();
          onScrubEnd();
        });
        input.addEventListener('blur', () => setTimeout(() => input.remove(), 200));
        input.click();
        return true;
      }
      if (!el.classList?.contains('cm-scrub')) return false;
      const start = view.posAtDOM(el);
      const text = el.textContent ?? '';
      const m = /^(-?(?:\d+\.\d+|\d+|\.\d+))(.*)$/.exec(text);
      if (!m) return false;
      e.preventDefault();
      const v0 = parseFloat(m[1]);
      const unit = m[2];
      const decimals = (m[1].split('.')[1] ?? '').length;
      const base = decimals > 0 ? 10 ** -decimals : 1;
      const pxPer = decimals > 0 ? 1.5 : 3;
      const x0 = e.clientX;
      let from = start;
      let to = start + text.length;
      let moved = false;
      view.dom.classList.add('is-scrubbing');
      const move = (ev: MouseEvent) => {
        const dx = ev.clientX - x0;
        if (!moved && Math.abs(dx) < 3) return;
        moved = true;
        const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
        let nv = v0 + Math.round(dx / pxPer) * base * mult;
        if (v0 >= 0 && UNITS_NONNEG.has(unit)) nv = Math.max(0, nv);
        const d = ev.altKey ? decimals + 1 : decimals;
        const insert = `${+nv.toFixed(d)}${unit}`;
        if (view.state.sliceDoc(from, to) === insert) return;
        view.dispatch({ changes: { from, to, insert }, userEvent: 'input.scrub' });
        to = from + insert.length;
      };
      const up = (ev: MouseEvent) => {
        removeEventListener('mousemove', move);
        removeEventListener('mouseup', up);
        view.dom.classList.remove('is-scrubbing');
        if (!moved) {
          const pos = view.posAtCoords({ x: ev.clientX, y: ev.clientY }) ?? from;
          view.dispatch({ selection: { anchor: pos } });
          view.focus();
        } else onScrubEnd();
        from = to;
      };
      addEventListener('mousemove', move);
      addEventListener('mouseup', up);
      return true;
    },
  });
}

// ------------------------------------------------------------------ completions for Kiln's own words

function kilnCompletions(ctx: CompletionContext) {
  const sw = ctx.matchBefore(/data-(form|texture|motion|scene|interact)=["'][\w-]*/);
  if (sw) {
    const which = /data-(\w+)/.exec(sw.text)![1];
    const q = sw.text.search(/["']/);
    return {
      from: sw.from + q + 1,
      options: SWITCH_REF[which].values.map((v) => ({ label: v, type: 'enum', detail: which })),
    };
  }
  const tok = ctx.matchBefore(/var\(--[\w-]*/);
  if (tok) {
    return { from: tok.from + 4, options: TOKEN_DOCS.filter((d) => d.name.startsWith('--')).map((d) => ({ label: d.name, type: 'variable', detail: d.hint })) };
  }
  const font = ctx.matchBefore(/--font-(display|body)\s*:\s*["'][\w ]*/);
  if (font) {
    const q = font.text.search(/["']/);
    return { from: font.from + q + 1, options: FACES.map((f) => ({ label: f.family, type: 'text', detail: f.kind, apply: f.family })) };
  }
  const art = ctx.matchBefore(/class="art art-\d*/);
  if (art) return { from: art.to - (art.text.length - art.text.lastIndexOf('-') - 1), options: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), type: 'enum', detail: `art-${i + 1}` })) };
  return null;
}

// ------------------------------------------------------------------ look

const highlight = HighlightStyle.define([
  { tag: [t.tagName, t.angleBracket], color: 'var(--tok-tag)' },
  { tag: t.attributeName, color: 'var(--tok-attr)' },
  { tag: [t.attributeValue, t.string], color: 'var(--tok-str)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--tok-comment)', fontStyle: 'italic' },
  { tag: [t.propertyName, t.definition(t.variableName)], color: 'var(--tok-prop)' },
  { tag: [t.number, t.unit], color: 'var(--tok-num)' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--tok-kw)' },
  { tag: [t.className, t.labelName], color: 'var(--tok-class)' },
  { tag: [t.variableName, t.name], color: 'var(--tok-var)' },
  { tag: [t.atom, t.bool, t.constant(t.name), t.color], color: 'var(--tok-atom)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--tok-fn)' },
  { tag: [t.punctuation, t.separator, t.bracket], color: 'var(--tok-punct)' },
  { tag: t.content, color: 'var(--tok-text)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--k-canvas)', color: 'var(--tok-text)' },
  '.cm-scroller': { fontFamily: 'var(--k-mono)', lineHeight: '1.65' },
  '.cm-content': { padding: '14px 0 40vh', caretColor: 'var(--k-clay)' },
  '.cm-gutters': { backgroundColor: 'var(--k-canvas)', color: 'var(--k-muted)', border: 'none', paddingLeft: '6px' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--k-text)' },
  '.cm-activeLine': { backgroundColor: 'var(--k-active-line)' },
  '.cm-cursor': { borderLeftColor: 'var(--k-clay)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--k-selection) !important' },
  '.cm-foldPlaceholder': { background: 'var(--k-clay-soft)', border: '1px solid rgba(226,112,58,.4)', color: 'var(--k-clay-2)', padding: '0 8px', borderRadius: '6px', fontFamily: 'var(--k-font)', fontSize: '11px' },
  '.cm-tooltip': { border: '1px solid var(--k-line-2)', background: 'var(--k-raised)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--k-shadow)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { background: 'var(--k-clay-soft)', color: 'var(--k-text)' },
  '.cm-panels': { background: 'var(--k-panel)', color: 'var(--k-text)', borderColor: 'var(--k-line)' },
  '.cm-searchMatch': { backgroundColor: 'rgba(226, 112, 58, 0.25)' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(134, 194, 173, 0.18)' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(134, 194, 173, 0.25)', outline: 'none' },
});

// ------------------------------------------------------------------ component

export interface EditorTarget {
  offset: number;
  select?: [number, number];
  nonce: number;
}

export function CodeEditor({
  value,
  onChange,
  onUndo,
  onRedo,
  onSeal,
  onCursor,
  target,
  foldEngine = true,
  viewRef,
  ownHistory = false,
  minimal = false,
}: {
  value: string;
  onChange: (v: string, group: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSeal: () => void;
  onCursor?: (pos: number) => void;
  target?: EditorTarget | null;
  foldEngine?: boolean;
  viewRef?: React.MutableRefObject<EditorView | null>;
  /** use CodeMirror's own undo (for small editors that are not part of a studio history) */
  ownHistory?: boolean;
  minimal?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const cbs = useRef({ onChange, onUndo, onRedo, onSeal, onCursor });
  cbs.current = { onChange, onUndo, onRedo, onSeal, onCursor };

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter({ openText: '▾', closedText: '▸' }),
        codeFolding({ placeholderText: '… folded — click to open' }),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(highlight),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ icons: false }),
        EditorState.languageData.of(() => [{ autocomplete: kilnCompletions }]),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        ownHistory
          ? [history(), keymap.of(historyKeymap)]
          : Prec.highest(
              keymap.of([
                { key: 'Mod-z', run: () => (cbs.current.onUndo(), true), preventDefault: true },
                { key: 'Mod-Shift-z', run: () => (cbs.current.onRedo(), true), preventDefault: true },
                { key: 'Mod-y', run: () => (cbs.current.onRedo(), true), preventDefault: true },
              ]),
            ),
        minimal ? [EditorView.theme({ '.cm-content': { padding: '10px 0 24px' } }), EditorView.lineWrapping] : [],
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
        html({ autoCloseTags: true }),
        theme,
        flashField,
        scrubPlugin,
        scrubHandlers(() => cbs.current.onSeal()),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !u.transactions.some((tr) => tr.annotation(External))) {
            const scrub = u.transactions.some((tr) => tr.isUserEvent('input.scrub') || tr.isUserEvent('input.color'));
            cbs.current.onChange(u.state.doc.toString(), scrub ? 'scrub' : 'type');
          }
          if (u.selectionSet || u.docChanged) cbs.current.onCursor?.(u.state.selection.main.head);
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current! });
    view.current = v;
    if (viewRef) viewRef.current = v;
    if (foldEngine) {
      const text = value;
      const open = /<style\b[^>]*id=["']engine["'][^>]*>/i.exec(text);
      if (open) {
        const from = v.state.doc.lineAt(open.index + open[0].length).to;
        const close = text.indexOf('</style>', from);
        if (close > from) v.dispatch({ effects: foldEffect.of({ from, to: v.state.doc.lineAt(close).from - 1 }) });
      }
      const scene = /<script\b[^>]*id=["']scene["'][^>]*>/i.exec(text);
      if (scene) {
        const from = v.state.doc.lineAt(scene.index + scene[0].length).to;
        const close = text.indexOf('</script>', from);
        if (close > from) v.dispatch({ effects: foldEffect.of({ from, to: v.state.doc.lineAt(close).from - 1 }) });
      }
    }
    return () => {
      v.destroy();
      view.current = null;
      if (viewRef) viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changes from outside (panels, undo, folder sync) land as a minimal edit and flash.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur === value) return;
    let a = 0;
    const max = Math.min(cur.length, value.length);
    while (a < max && cur.charCodeAt(a) === value.charCodeAt(a)) a++;
    let ea = cur.length;
    let eb = value.length;
    while (ea > a && eb > a && cur.charCodeAt(ea - 1) === value.charCodeAt(eb - 1)) {
      ea--;
      eb--;
    }
    v.dispatch({
      changes: { from: a, to: ea, insert: value.slice(a, eb) },
      annotations: External.of(true),
      effects: [addFlash.of({ from: a, to: eb }), EditorView.scrollIntoView(a, { y: 'nearest', yMargin: 80 })],
    });
    const t = setTimeout(() => view.current?.dispatch({ effects: clearFlash.of(null) }), 1500);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const v = view.current;
    if (!v || !target) return;
    const len = v.state.doc.length;
    const sel = target.select ? { anchor: Math.min(len, target.select[0]), head: Math.min(len, target.select[1]) } : { anchor: Math.min(len, target.offset) };
    v.dispatch({ selection: sel, effects: [EditorView.scrollIntoView(sel.anchor, { y: 'center' }), addFlash.of({ from: sel.anchor, to: sel.head ?? sel.anchor })] });
    v.focus();
    const t = setTimeout(() => view.current?.dispatch({ effects: clearFlash.of(null) }), 1500);
    return () => clearTimeout(t);
  }, [target]);

  return <div ref={host} className="s-editor" />;
}
