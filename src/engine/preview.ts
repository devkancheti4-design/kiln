// Builds the live-preview version of a piece and plans the cheapest way to update it.
// The preview is the real file plus three preview-only touches: every bundled font is available,
// image paths point at the stored pictures, and each tag remembers where it lives in the code
// (data-kl="offset") so pointing at something on the page can jump to its line.
import type { Assets } from './exporter';
import { ALL_FONT_FACES_CSS } from './fonts';
import { bodyTagRange, markupRange, styleRange } from './patch';

export function resolveAssets(html: string, assets: Assets): string {
  let out = html;
  for (const [path, url] of Object.entries(assets)) if (out.includes(path)) out = out.split(path).join(url);
  return out;
}

/**
 * Adds data-kl="<offset>" to every start tag between from..to (skipping comments). Offsets are
 * relative to `from` (the start of the page markup), so token edits above the markup never
 * invalidate them.
 */
export function annotate(src: string, from: number, to: number): string {
  const re = /<([a-zA-Z][\w-]*)((?:\s[^<>]*?)?)(\/?)>/g;
  re.lastIndex = from;
  let out = '';
  let last = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) && m.index < to) {
    const commentOpen = src.lastIndexOf('<!--', m.index);
    if (commentOpen >= from) {
      const commentClose = src.indexOf('-->', commentOpen);
      if (commentClose < 0 || commentClose > m.index) {
        re.lastIndex = commentClose < 0 ? to : commentClose + 3;
        continue;
      }
    }
    const end = m.index + m[0].length - 1 - m[3].length;
    out += src.slice(last, end) + ` data-kl="${m.index - from}"`;
    last = end;
  }
  return out + src.slice(last, to);
}

export function annotatedMarkup(src: string): string {
  const r = markupRange(src);
  return r ? annotate(src, r.from, r.to) : '';
}

export function bodyAttrs(src: string): Record<string, string> {
  const r = bodyTagRange(src);
  const out: Record<string, string> = {};
  if (!r) return out;
  const tag = src.slice(r.from, r.to);
  const re = /([\w-:]+)\s*=\s*"([^"]*)"|([\w-:]+)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) out[m[1] ?? m[3]] = m[2] ?? m[4];
  return out;
}

export function previewDocument(src: string, assets: Assets): string {
  const r = markupRange(src);
  let html = r ? src.slice(0, r.from) + annotate(src, r.from, r.to) + src.slice(r.to) : src;
  const fonts = styleRange(html, 'fonts');
  if (fonts) html = `${html.slice(0, fonts.from)}\n${ALL_FONT_FACES_CSS}\n${html.slice(fonts.to)}`;
  else html = html.replace(/<\/head>/i, `<style id="kiln-fonts">${ALL_FONT_FACES_CSS}</style></head>`);
  html = resolveAssets(html, assets);
  const script = `<script data-kiln-ui>${INSTRUMENT}</script>`;
  const close = html.lastIndexOf('</body>');
  return close < 0 ? html + script : html.slice(0, close) + script + html.slice(close);
}

// ------------------------------------------------------------------ morph planning

export interface Parts {
  tokens: string | null;
  engine: string | null;
  bodyAttrs: Record<string, string>;
  markup: string;
  skeleton: string;
}

export function partsOf(src: string): Parts {
  const cut: { from: number; to: number; tag: string }[] = [];
  const t = styleRange(src, 'tokens');
  const e = styleRange(src, 'engine');
  const f = styleRange(src, 'fonts');
  const b = bodyTagRange(src);
  const m = markupRange(src);
  if (t) cut.push({ ...t, tag: 'T' });
  if (e) cut.push({ ...e, tag: 'E' });
  if (f) cut.push({ ...f, tag: 'F' });
  if (b) cut.push({ ...b, tag: 'B' });
  if (m) cut.push({ ...m, tag: 'M' });
  const title = /<title>[\s\S]*?<\/title>/i.exec(src);
  if (title) cut.push({ from: title.index, to: title.index + title[0].length, tag: 'TI' });
  const desc = /<meta\s+name=["']description["'][^>]*>/i.exec(src);
  if (desc) cut.push({ from: desc.index, to: desc.index + desc[0].length, tag: 'D' });
  cut.sort((a, z) => a.from - z.from);
  let skeleton = '';
  let pos = 0;
  for (const c of cut) {
    if (c.from < pos) continue; // overlapping (should not happen); keep it simple
    skeleton += src.slice(pos, c.from) + `\u0000${c.tag}\u0000`;
    pos = c.to;
  }
  skeleton += src.slice(pos);
  return {
    tokens: t ? src.slice(t.from, t.to) : null,
    engine: e ? src.slice(e.from, e.to) : null,
    bodyAttrs: bodyAttrs(src),
    markup: m ? src.slice(m.from, m.to) : '',
    skeleton,
  };
}

export type Plan =
  | { kind: 'none' }
  | { kind: 'reload' }
  | { kind: 'patch'; tokens?: string; engine?: string; attrs?: Record<string, string>; markup?: boolean; title?: string };

export function planUpdate(prev: string, next: string): Plan {
  if (prev === next) return { kind: 'none' };
  const a = partsOf(prev);
  const b = partsOf(next);
  if (a.skeleton !== b.skeleton || (a.tokens === null) !== (b.tokens === null) || (a.engine === null) !== (b.engine === null)) {
    return { kind: 'reload' };
  }
  const plan: Plan = { kind: 'patch' };
  if (a.tokens !== b.tokens && b.tokens !== null) plan.tokens = b.tokens;
  if (a.engine !== b.engine && b.engine !== null) plan.engine = b.engine;
  if (JSON.stringify(a.bodyAttrs) !== JSON.stringify(b.bodyAttrs)) plan.attrs = b.bodyAttrs;
  if (a.markup !== b.markup) plan.markup = true;
  const ta = /<title>([\s\S]*?)<\/title>/i.exec(prev)?.[1];
  const tb = /<title>([\s\S]*?)<\/title>/i.exec(next)?.[1];
  if (ta !== tb && tb !== undefined) plan.title = tb;
  return plan;
}

// ------------------------------------------------------------------ in-frame helper

/** Runs inside the preview frame. The studio talks to it through window.__kiln (same origin). */
const INSTRUMENT = `(() => {
  const K = (window.__kiln = window.__kiln || {});
  let box = null, label = null, current = null, pinned = null;
  const ui = (css) => { const el = document.createElement('div'); el.setAttribute('data-kiln-ui', ''); el.style.cssText = css; document.documentElement.append(el); return el; };
  const ensure = () => {
    if (box) return;
    box = ui('position:absolute;pointer-events:none;z-index:2147483646;border:1.5px solid #e2703a;background:rgba(226,112,58,.10);border-radius:4px;display:none;transition:top .08s,left .08s,width .08s,height .08s');
    label = ui('position:absolute;pointer-events:none;z-index:2147483647;font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:5px 7px;border-radius:6px;background:#1b1715;color:#f6ede4;display:none;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.28)');
  };
  const find = (el) => { while (el && el.nodeType === 1 && !el.hasAttribute('data-kl')) el = el.parentElement; return el && el.nodeType === 1 ? el : null; };
  const describe = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => c !== 'is-in' && c !== 'js').slice(0, 2).map((c) => '.' + c).join('');
  const draw = (el) => {
    ensure();
    if (!el) { box.style.display = label.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    const x = r.left + scrollX, y = r.top + scrollY;
    Object.assign(box.style, { display: 'block', left: x + 'px', top: y + 'px', width: r.width + 'px', height: r.height + 'px' });
    label.textContent = describe(el);
    Object.assign(label.style, { display: 'block', left: Math.max(4, x) + 'px', top: Math.max(4, y - 24) + 'px' });
  };
  document.addEventListener('mousemove', (e) => {
    if (!K.inspect) return;
    const el = find(e.target);
    if (el !== current) { current = el; draw(el); }
  }, true);
  document.addEventListener('mouseleave', () => { if (K.inspect) { current = null; draw(pinned); } });
  addEventListener('scroll', () => { if (K.inspect || pinned) draw(current || pinned); }, { passive: true });
  addEventListener('resize', () => { if (K.inspect || pinned) draw(current || pinned); });
  document.addEventListener('click', (e) => {
    if (K.inspect) {
      e.preventDefault(); e.stopPropagation();
      const el = find(e.target);
      if (el && K.onPick) K.onPick({ offset: +el.getAttribute('data-kl'), label: describe(el), classes: [...el.classList], tag: el.tagName.toLowerCase() });
      return;
    }
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) {
      const t = href.length > 1 ? document.getElementById(href.slice(1)) : null;
      (t || document.body).scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (K.onLink) K.onLink(href);
  }, true);
  K.setInspect = (on) => {
    K.inspect = !!on;
    document.documentElement.style.cursor = on ? 'crosshair' : '';
    if (!on) { current = null; draw(pinned); }
  };
  K.highlight = (offset) => {
    pinned = offset == null ? null : document.querySelector('[data-kl="' + offset + '"]');
    draw(pinned);
  };
  K.setStyle = (id, css) => { const s = document.getElementById(id); if (s) s.textContent = css; if (current || pinned) draw(current || pinned); };
  K.setBodyAttrs = (attrs) => {
    const b = document.body;
    for (const { name } of [...b.attributes]) if (!(name in attrs)) b.removeAttribute(name);
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    if (!b.classList.contains('js')) b.classList.add('js');
  };
  K.swapMarkup = (html) => {
    const b = document.body;
    const firstScript = [...b.children].find((c) => c.tagName === 'SCRIPT');
    for (const c of [...b.childNodes]) if (!(c.nodeType === 1 && c.tagName === 'SCRIPT')) c.remove();
    const t = document.createElement('template');
    t.innerHTML = html;
    b.insertBefore(t.content, firstScript || null);
    document.querySelectorAll('main > section').forEach((s) => { s.classList.add('is-in'); s.querySelectorAll('.card, .stat, .row, .shot').forEach((el, i) => el.style.setProperty('--i', i % 8)); });
    if (pinned) { const off = pinned.getAttribute('data-kl'); pinned = null; K.highlight(off); }
  };
  K.revealAll = () => document.querySelectorAll('main > section').forEach((s) => s.classList.add('is-in'));
  K.setTitle = (html) => { const t = document.createElement('textarea'); t.innerHTML = html; document.title = t.value; };
  K.scrollTo = (hash) => {
    const t = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (t && hash !== '#top') t.scrollIntoView({ block: 'start' });
    else scrollTo(0, 0);
  };
  // Studio shortcuts keep working while the preview has focus.
  addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    const ev = new KeyboardEvent('keydown', { key: e.key, code: e.code, metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, repeat: e.repeat, bubbles: true, cancelable: true });
    try { if (!parent.dispatchEvent(ev)) e.preventDefault(); } catch (err) {}
  });
  if (K.onReady) K.onReady();
})();`;
