// Code: the real file, with a W3Schools-style tip for whatever the cursor is on.
import { useMemo, useState } from 'react';
import { bodyTagRange, markupRange, styleRange } from '../engine/patch';
import { ELEMENT_REF, REGION_REF, type Ref, SWITCH_REF, TOKEN_REF } from '../guide/reference';
import { cx } from '../ui/controls';
import { IconGuide, IconInfo } from '../ui/icons';
import { CodeEditor, type EditorTarget } from './CodeEditor';
import { OpenInButton } from './OpenIn';
import type { PickInfo } from './Preview';
import { useStudio } from './state';

interface Ctx {
  ref: Ref;
  kind: 'token' | 'switch' | 'element' | 'region';
  tagOffset: number | null;
}

function scriptStart(src: string, id: string): number {
  const m = new RegExp(`<script\\b[^>]*id=["']${id}["']`, 'i').exec(src);
  return m ? m.index : -1;
}

function contextAt(src: string, pos: number): Ctx | null {
  const tokens = styleRange(src, 'tokens');
  if (tokens && pos >= tokens.from && pos <= tokens.to) {
    const lineStart = src.lastIndexOf('\n', pos - 1) + 1;
    const lineEnd = src.indexOf('\n', pos);
    const line = src.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
    const m = /(--[\w-]+|color-scheme)\s*:/.exec(line);
    if (m && TOKEN_REF[m[1]]) return { ref: TOKEN_REF[m[1]], kind: 'token', tagOffset: null };
    return { ref: REGION_REF.tokens, kind: 'region', tagOffset: null };
  }
  const fonts = styleRange(src, 'fonts');
  if (fonts && pos >= fonts.from && pos <= fonts.to) return { ref: REGION_REF.fonts, kind: 'region', tagOffset: null };
  const engine = styleRange(src, 'engine');
  if (engine && pos >= engine.from && pos <= engine.to) return { ref: REGION_REF.engine, kind: 'region', tagOffset: null };
  const body = bodyTagRange(src);
  if (body && pos >= body.from && pos <= body.to) {
    const before = src.slice(body.from, pos);
    const m = /data-(form|texture|motion|scene|interact)\s*=\s*["']?[\w-]*$/.exec(before) ?? /data-(form|texture|motion|scene|interact)[^]*$/.exec(before);
    const all = [...before.matchAll(/data-(form|texture|motion|scene|interact)/g)];
    const key = m?.[1] ?? all[all.length - 1]?.[1];
    return { ref: key ? SWITCH_REF[key] : REGION_REF.switches, kind: key ? 'switch' : 'region', tagOffset: null };
  }
  for (const id of ['scene', 'interact', 'motion']) {
    const s = scriptStart(src, id);
    if (s >= 0 && pos >= s && pos <= src.indexOf('</script>', s)) return { ref: REGION_REF[id], kind: 'region', tagOffset: null };
  }
  const mk = markupRange(src);
  if (mk && pos >= mk.from && pos <= mk.to) {
    // nearest start tag at or before the cursor that has a class we can explain
    let i = pos;
    for (let guard = 0; guard < 40 && i > mk.from; guard++) {
      const lt = src.lastIndexOf('<', i);
      if (lt < mk.from) break;
      if (/[a-zA-Z]/.test(src[lt + 1] ?? '')) {
        const end = src.indexOf('>', lt);
        const tag = src.slice(lt, end + 1);
        const cls = /class="([^"]*)"/.exec(tag)?.[1].split(/\s+/) ?? [];
        const name = /^<([a-zA-Z][\w-]*)/.exec(tag)![1].toLowerCase();
        const key = [...cls].reverse().find((c) => ELEMENT_REF[c]) ?? (name === 'details' || name === 'summary' ? 'qa' : undefined);
        if (key) return { ref: ELEMENT_REF[key], kind: 'element', tagOffset: lt };
      }
      i = lt - 1;
    }
  }
  return null;
}

export function CodePanel({ target, pick, onCursorTag }: { target: EditorTarget | null; pick: PickInfo | null; onCursorTag: (offset: number | null) => void }) {
  const { doc, page, current, setCurrent, setSource, seal, locked, undo, redo } = useStudio();
  const src = page.source;
  const [cursor, setCursor] = useState(0);
  const ctx = useMemo(() => contextAt(src, cursor), [src, cursor]);
  const [jump, setJump] = useState<EditorTarget | null>(null);
  const effectiveTarget = jump && (!target || jump.nonce > target.nonce) ? jump : target;

  const outline = useMemo(() => {
    const items: { label: string; at: number }[] = [];
    const add = (label: string, at: number | undefined | null) => at != null && at >= 0 && items.push({ label, at });
    add('Tokens', styleRange(src, 'tokens')?.from);
    add('Fonts', styleRange(src, 'fonts')?.from);
    add('Engine', styleRange(src, 'engine')?.from);
    add('Switches', bodyTagRange(src)?.from);
    add('Page', markupRange(src)?.from);
    add('Motion', scriptStart(src, 'motion'));
    add('Cursor', scriptStart(src, 'interact'));
    add('3D', scriptStart(src, 'scene'));
    return items;
  }, [src]);

  const edited = locked;

  return (
    <div className="s-code">
      <div className="s-code-top">
        <div className="s-code-file">
          <span className="s-code-dot" />
          {doc.pages.length > 1 ? (
            <select className="s-code-pages" value={current} onChange={(e) => setCurrent(e.target.value)} aria-label="Page file">
              {doc.pages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.slug}.html
                </option>
              ))}
            </select>
          ) : (
            'index.html'
          )}
          <span className="s-code-size">{(new Blob([src]).size / 1024).toFixed(1)} KB</span>
          {edited && <span className="k-badge k-badge-muted">hand-edited</span>}
        </div>
        <OpenInButton />
      </div>
      <nav className="s-outline" aria-label="Jump to">
        {outline.map((o) => (
          <button key={o.label} type="button" onClick={() => setJump({ offset: o.at, nonce: performance.now() })}>
            {o.label}
          </button>
        ))}
      </nav>
      <div className={cx('s-tip', ctx && `is-${ctx.kind}`)}>
        {pick && ctx?.kind === 'element' && <span className="s-tip-pick">You picked {pick.label}</span>}
        {ctx ? (
          <>
            <div className="s-tip-title">
              <IconInfo size={15} />
              <code>{ctx.ref.title}</code>
            </div>
            <p>{ctx.ref.body}</p>
            {ctx.ref.try && (
              <p className="s-tip-try">
                <strong>Try:</strong> {ctx.ref.try}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="s-tip-title">
              <IconGuide size={15} />
              <span>Click anywhere in the code for a tip about it</span>
            </div>
            <p>
              Drag any number to scrub it. Click a color square to pick a color. ⌘F finds, ⌘Z undoes. Or press the inspect button and point at the page.
              {doc.pages.length > 1 && ' Tokens, engine, switches and scripts are shared — change them on any page and every page follows.'}
            </p>
          </>
        )}
      </div>
      <CodeEditor
        value={src}
        onChange={(v, group) => setSource(v, group)}
        onUndo={undo}
        onRedo={redo}
        onSeal={seal}
        target={effectiveTarget}
        onCursor={(p) => {
          setCursor(p);
          const c = contextAt(src, p);
          onCursorTag(c?.tagOffset ?? null);
        }}
      />
    </div>
  );
}
