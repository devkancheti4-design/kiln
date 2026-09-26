// A piece's HTML source is its single source of truth. The studio panels never keep a hidden
// copy of the design — they read values out of the code and write changes back into it,
// exactly where a person would type them. That keeps "what you see" and "the file you get" equal.
import { DEFAULT_WIDTH, DENSITIES, FORMS, INTERACTIONS, MOTIONS, SCENES, SHAPES, TEXTURES } from './axes';
import type { Content } from './content';
import { AXES, type Axis, type Genome } from './genome';
import { kindIndex } from './kinds';
import { PALETTES } from './palettes';
import { ENGINE_CSS, esc, renderFontsCss, renderMarkup, renderTokensCss, type SiteInfo, switchesFor, titleFor, tokensFor, type Tokens } from './render';
import { FACES, PAIRINGS, facesUsedIn, stackOf } from './typefaces';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ------------------------------------------------------------------ regions

export interface Range {
  from: number;
  to: number;
}

/** Inner text range of <style id="…">…</style>. */
export function styleRange(src: string, id: string): Range | null {
  const open = new RegExp(`<style\\b[^>]*\\bid=["']${escapeRe(id)}["'][^>]*>`, 'i').exec(src);
  if (!open) return null;
  const from = open.index + open[0].length;
  const to = src.indexOf('</style>', from);
  return to < 0 ? null : { from, to };
}

/** True when position i sits inside an HTML comment. */
export function inComment(src: string, i: number): boolean {
  const open = src.lastIndexOf('<!--', i);
  if (open < 0) return false;
  const close = src.indexOf('-->', open + 4);
  return close < 0 || close + 3 > i;
}

export function bodyTagRange(src: string): Range | null {
  // The real <body> comes after </head>; the word "<body>" also appears in comments and CSS.
  const headEnd = src.search(/<\/head\s*>/i);
  const re = /<body\b[^>]*>/gi;
  re.lastIndex = Math.max(0, headEnd);
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!inComment(src, m.index)) return { from: m.index, to: m.index + m[0].length };
  }
  return null;
}

/** The page markup: everything between <body …> and the motion script (or </body>). */
export function markupRange(src: string): Range | null {
  const body = bodyTagRange(src);
  if (!body) return null;
  let to = src.indexOf('<!-- 4 · MOTION', body.to);
  if (to < 0) to = src.search(/<script\b[^>]*id=["']motion["']/i);
  if (to < 0 || to < body.to) to = src.lastIndexOf('</body>');
  if (to < 0) return null;
  let from = body.to;
  if (src[from] === '\n') from++;
  while (to > from && /\s/.test(src[to - 1])) to--;
  return { from, to };
}

// ------------------------------------------------------------------ tokens

function rootBlock(src: string): { range: Range; css: string } | null {
  const r = styleRange(src, 'tokens');
  if (!r) return null;
  return { range: r, css: src.slice(r.from, r.to) };
}

function declRe(name: string) {
  return new RegExp(`(^|[\\s;{])(${escapeRe(name)})(\\s*:\\s*)([^;}]*?)(\\s*;)`, 'm');
}

export function getToken(src: string, name: string): string | null {
  const block = rootBlock(src);
  if (!block) return null;
  const m = declRe(name).exec(block.css);
  return m ? m[4].trim() : null;
}

export function readTokens(src: string): Tokens {
  const block = rootBlock(src);
  const out: Tokens = {};
  if (!block) return out;
  const re = /(--[\w-]+|color-scheme)\s*:\s*([^;}]*?)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block.css))) out[m[1]] = m[2].trim();
  return out;
}

export function setToken(src: string, name: string, value: string): string {
  const block = rootBlock(src);
  if (!block) {
    // No tokens block at all (someone deleted it): add a fresh one to <head>.
    const head = src.search(/<\/head>/i);
    const css = `  <style id="tokens">\n    :root {\n      ${name}: ${value};\n    }\n  </style>\n`;
    return head < 0 ? css + src : src.slice(0, head) + css + src.slice(head);
  }
  const re = declRe(name);
  const m = re.exec(block.css);
  let css: string;
  if (m) {
    const start = m.index + m[1].length + m[2].length + m[3].length;
    const oldLen = m[4].length;
    // keep the hint comments lined up when the value changes length
    let after = block.css.slice(start + oldLen);
    const commentPad = /^(\s*;)( +)(\/\*)/.exec(after);
    if (commentPad) {
      const diff = value.length - oldLen;
      const spaces = Math.max(1, commentPad[2].length - diff);
      after = commentPad[1] + ' '.repeat(spaces) + after.slice(commentPad[1].length + commentPad[2].length);
    }
    css = block.css.slice(0, start) + value + after;
  } else {
    const close = block.css.lastIndexOf('}');
    const insert = `  ${name}: ${value};\n    `;
    css = close < 0 ? `${block.css}\n      ${name}: ${value};` : block.css.slice(0, close).replace(/\s*$/, '\n    ') + insert + block.css.slice(close);
  }
  return src.slice(0, block.range.from) + css + src.slice(block.range.to);
}

export function setTokens(src: string, tokens: Tokens): string {
  let out = src;
  for (const [k, v] of Object.entries(tokens)) out = setToken(out, k, v);
  return out;
}

// ------------------------------------------------------------------ switches

export type SwitchName = 'form' | 'texture' | 'motion' | 'scene' | 'interact';

export function getSwitch(src: string, name: SwitchName): string | null {
  const r = bodyTagRange(src);
  if (!r) return null;
  const m = new RegExp(`\\sdata-${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(src.slice(r.from, r.to));
  return m ? m[1] : null;
}

export function setSwitch(src: string, name: SwitchName, value: string): string {
  const r = bodyTagRange(src);
  if (!r) return src;
  let tag = src.slice(r.from, r.to);
  const re = new RegExp(`(\\sdata-${name}\\s*=\\s*["'])([^"']*)(["'])`, 'i');
  if (re.test(tag)) tag = tag.replace(re, `$1${value}$3`);
  else tag = tag.replace(/\s*>$/, ` data-${name}="${value}">`);
  return src.slice(0, r.from) + tag + src.slice(r.to);
}

// ------------------------------------------------------------------ fonts, title, markup

/** Rewrites the fonts block so it declares exactly the bundled fonts the rest of the file uses. */
export function syncFonts(src: string): string {
  const r = styleRange(src, 'fonts');
  if (!r) return src;
  const rest = src.slice(0, r.from) + src.slice(r.to);
  const faces = facesUsedIn(rest);
  const css = `\n${renderFontsCss(faces)}\n  `;
  return src.slice(0, r.from) + css + src.slice(r.to);
}

export function setTitle(src: string, title: string): string {
  return src
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["'])/i, `$1${esc(title)}$2`);
}

export function setDescription(src: string, text: string): string {
  return src
    .replace(/(<meta\s+name=["']description["']\s+content=["'])[^"']*(["'])/i, `$1${esc(text)}$2`)
    .replace(/(<meta\s+property=["']og:description["']\s+content=["'])[^"']*(["'])/i, `$1${esc(text)}$2`);
}

export function getMarkup(src: string): string {
  const r = markupRange(src);
  return r ? src.slice(r.from, r.to) : '';
}

export function setMarkup(src: string, markup: string): string {
  const r = markupRange(src);
  if (!r) return src;
  return src.slice(0, r.from) + markup + src.slice(r.to);
}

/** Re-carves the page from content: markup, <title> and description. */
export function applyContent(src: string, c: Content, site?: SiteInfo): string {
  let out = setMarkup(src, renderMarkup(c, site));
  out = setTitle(out, titleFor(c, site));
  out = setDescription(out, c.lede.replace(/\*/g, ''));
  return out;
}

// ------------------------------------------------------------------ shared parts (multi-page sites)

/** Outer range of <style id="…">…</style> or <script id="…">…</script>. */
export function elementRange(src: string, tag: 'style' | 'script', id: string): Range | null {
  const open = new RegExp(`<${tag}\\b[^>]*\\bid=["']${escapeRe(id)}["'][^>]*>`, 'i').exec(src);
  if (!open) return null;
  const close = src.indexOf(`</${tag}>`, open.index + open[0].length);
  return close < 0 ? null : { from: open.index, to: close + `</${tag}>`.length };
}

const SHARED_STYLES = ['tokens', 'fonts', 'engine', 'mine'];
const SHARED_SCRIPTS = ['motion', 'interact', 'scene'];

/**
 * Every page of a site shares one design. This copies the shared parts — the token, font, engine
 * (and any "mine") styles, the switches on <body>, and the three scripts — from one page into
 * another, leaving that page's own title, description and markup alone.
 */
export function syncShared(from: string, to: string): string {
  let out = to;
  for (const id of SHARED_STYLES) {
    const a = elementRange(from, 'style', id);
    const b = elementRange(out, 'style', id);
    if (a && b) out = out.slice(0, b.from) + from.slice(a.from, a.to) + out.slice(b.to);
    else if (a && !b) {
      const head = out.search(/<\/head>/i);
      if (head >= 0) out = `${out.slice(0, head)}  ${from.slice(a.from, a.to)}\n${out.slice(head)}`;
    } else if (!a && b) {
      const lineStart = out.lastIndexOf('\n', b.from) + 1;
      const lineEnd = out.indexOf('\n', b.to);
      out = out.slice(0, lineStart) + out.slice(lineEnd < 0 ? b.to : lineEnd + 1);
    }
  }
  for (const id of SHARED_SCRIPTS) {
    const a = elementRange(from, 'script', id);
    const b = elementRange(out, 'script', id);
    if (a && b) out = out.slice(0, b.from) + from.slice(a.from, a.to) + out.slice(b.to);
  }
  const ba = bodyTagRange(from);
  const bb = bodyTagRange(out);
  if (ba && bb) out = out.slice(0, bb.from) + from.slice(ba.from, ba.to) + out.slice(bb.to);
  return out;
}

export function engineCss(src: string): string | null {
  const r = styleRange(src, 'engine');
  return r ? src.slice(r.from, r.to) : null;
}

// ------------------------------------------------------------------ genome <-> source

/** Applies some (or all) axes of a design to existing source, keeping everything else. */
export function applyGenome(src: string, g: Genome, axes: readonly Axis[] = AXES): string {
  const t = tokensFor(g);
  const sw = switchesFor(g);
  const want = new Set(axes);
  let out = src;
  if (want.has('form')) {
    out = setSwitch(out, 'form', sw.form);
    out = setToken(out, '--scale', t['--scale']);
  }
  if (want.has('texture')) out = setSwitch(out, 'texture', sw.texture);
  if (want.has('motion')) out = setSwitch(out, 'motion', sw.motion);
  if (want.has('scene')) out = setSwitch(out, 'scene', sw.scene);
  if (want.has('interact')) out = setSwitch(out, 'interact', sw.interact);
  if (want.has('palette') || want.has('mode')) {
    out = setTokens(out, { 'color-scheme': t['color-scheme'], '--bg': t['--bg'], '--ink': t['--ink'], '--accent': t['--accent'] });
  }
  if (want.has('type')) {
    out = setTokens(out, {
      '--font-display': t['--font-display'],
      '--font-body': t['--font-body'],
      '--display-weight': t['--display-weight'],
      '--tracking': t['--tracking'],
    });
    out = syncFonts(out);
  }
  if (want.has('shape')) out = setToken(out, '--radius', t['--radius']);
  if (want.has('density')) out = setToken(out, '--space', t['--space']);
  return out;
}

const same = (a: string | null | undefined, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();
const sameNum = (a: string | null | undefined, b: string) => a != null && parseFloat(a) === parseFloat(b) && a.replace(/[\d.\-\s]/g, '') === b.replace(/[\d.\-\s]/g, '');

/** Best guess of each axis from the source; null for axes that match nothing in the catalog. */
export function readAxes(src: string, content: Content | null): Record<Axis, number | null> {
  const t = readTokens(src);
  const form = FORMS.findIndex((f) => f.id === getSwitch(src, 'form'));
  const texture = TEXTURES.findIndex((x) => x.id === getSwitch(src, 'texture'));
  const motion = MOTIONS.findIndex((x) => x.id === getSwitch(src, 'motion'));
  const scene = SCENES.findIndex((x) => x.id === (getSwitch(src, 'scene') ?? 'none'));
  const interact = INTERACTIONS.findIndex((x) => x.id === (getSwitch(src, 'interact') ?? 'none'));
  let palette = -1;
  let mode = -1;
  PALETTES.forEach((p, pi) =>
    [p.light, p.dark].forEach((sw, mi) => {
      if (same(t['--bg'], sw.bg) && same(t['--ink'], sw.ink) && same(t['--accent'], sw.accent)) {
        palette = pi;
        mode = mi;
      }
    }),
  );
  const type = PAIRINGS.findIndex(
    (p) =>
      same(t['--font-display'], stackOf(p.display)) &&
      same(t['--font-body'], stackOf(p.body)) &&
      sameNum(t['--display-weight'], String(p.weight)) &&
      sameNum(t['--tracking'], p.tracking),
  );
  const shape = SHAPES.findIndex((s) => sameNum(t['--radius'], s.radius));
  const density = DENSITIES.findIndex((d) => sameNum(t['--space'], d.space));
  const n = (i: number) => (i < 0 ? null : i);
  return {
    kind: content ? kindIndex(content.kind) : null,
    form: n(form),
    palette: n(palette),
    mode: n(mode),
    type: n(type),
    shape: n(shape),
    density: n(density),
    texture: n(texture),
    motion: n(motion),
    scene: n(scene),
    interact: n(interact),
  };
}

/**
 * If the source is exactly a catalog design (any words), return its genome; otherwise null,
 * which the app shows as "Original — one of one".
 */
export function identify(src: string, content: Content | null): Genome | null {
  const axes = readAxes(src, content);
  if (AXES.some((a) => axes[a] === null)) return null;
  const g = axes as Genome;
  const t = readTokens(src);
  if (!sameNum(t['--scale'], String(FORMS[g.form].scale))) return null;
  if (!sameNum(t['--width'], DEFAULT_WIDTH)) return null;
  if (!same(t['color-scheme'], g.mode === 1 ? 'dark' : 'light')) return null;
  const engine = engineCss(src);
  if (engine === null || engine.trim() !== ENGINE_CSS.trim()) return null;
  return g;
}

export { renderTokensCss, FACES };

// ------------------------------------------------------------------ where things live (for "show me in the code")

/** Range of a token's value inside the source, e.g. the "16px" of "--radius: 16px;". */
export function tokenValueRange(src: string, name: string): Range | null {
  const block = rootBlock(src);
  if (!block) return null;
  const m = declRe(name).exec(block.css);
  if (!m) return null;
  const from = block.range.from + m.index + m[1].length + m[2].length + m[3].length;
  return { from, to: from + m[4].length };
}

/** Range of a switch's value on <body>, e.g. the "split" of data-form="split". */
export function switchValueRange(src: string, name: SwitchName): Range | null {
  const r = bodyTagRange(src);
  if (!r) return null;
  const m = new RegExp(`(\\sdata-${name}\\s*=\\s*["'])([^"']*)`, 'i').exec(src.slice(r.from, r.to));
  if (!m) return null;
  const from = r.from + m.index + m[1].length;
  return { from, to: from + m[2].length };
}
