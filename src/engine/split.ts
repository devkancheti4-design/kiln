// One file for beginners, many files for pros and AI agents.
// splitSite() turns the single-file source into a tidy project (small index.html, css/, js/,
// AGENTS.md) so an editor — or an agent in Antigravity/Cursor — reads only what it needs.
// joinSite() turns it back, so a linked folder can be edited anywhere and previewed in Kiln.
import { FORMS, INTERACTIONS, MOTIONS, SCENES, TEXTURES } from './axes';
import type { Content } from './content';
import { getSwitch, readTokens, styleRange, syncFonts } from './patch';
import { TOKEN_DOCS } from './render';
import { FACES } from './typefaces';

const STYLES = [
  { id: 'tokens', path: 'css/tokens.css', note: '1 · TOKENS — change these values to transform the whole site' },
  { id: 'fonts', path: 'css/fonts.css', note: '2 · FONTS — shipped with the site, so it works offline' },
  { id: 'engine', path: 'css/engine.css', note: '3 · ENGINE — the CSS that reads your tokens' },
];
const SCRIPTS = [
  { id: 'motion', path: 'js/motion.js' },
  { id: 'interact', path: 'js/interact.js' },
  { id: 'scene', path: 'js/scene.js' },
];

function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return `${lines.map((l) => l.slice(cut)).join('\n')}\n`;
}

function indent(text: string, n: number): string {
  const pad = ' '.repeat(n);
  return text
    .replace(/\s+$/, '')
    .split('\n')
    .map((l) => (l.trim() ? pad + l : ''))
    .join('\n');
}

function scriptRange(src: string, id: string) {
  const open = new RegExp(`<script\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i').exec(src);
  if (!open) return null;
  const from = open.index + open[0].length;
  const to = src.indexOf('</script>', from);
  return to < 0 ? null : { start: open.index, from, to, end: to + '</script>'.length };
}

export function splitSite(source: string, content: Content | null): Record<string, string> {
  let html = syncFonts(source);
  const files: Record<string, string> = {};
  for (const s of STYLES) {
    const r = styleRange(html, s.id);
    if (!r) continue;
    const open = html.lastIndexOf('<style', r.from);
    const end = r.to + '</style>'.length;
    files[s.path] = `/* ${s.note} */\n${dedent(html.slice(r.from, r.to))}`;
    const link = `<link rel="stylesheet" href="${s.path}" id="${s.id}">`;
    html = html.slice(0, open) + link + html.slice(end);
  }
  for (const s of SCRIPTS) {
    const r = scriptRange(html, s.id);
    if (!r) continue;
    files[s.path] = dedent(html.slice(r.from, r.to));
    html = `${html.slice(0, r.start)}<script src="${s.path}" id="${s.id}"></script>${html.slice(r.end)}`;
  }
  files['css/fonts.css'] = (files['css/fonts.css'] ?? '').replace(/url\("fonts\//g, 'url("../fonts/');
  files['index.html'] = html;
  files['AGENTS.md'] = agentsGuide(source, content);
  return files;
}

export function joinSite(files: Record<string, string>): string {
  let html = files['index.html'] ?? '';
  for (const s of STYLES) {
    const re = new RegExp(`<link\\b[^>]*href=["']${s.path}["'][^>]*>`, 'i');
    const m = re.exec(html);
    if (!m) continue;
    let css = (files[s.path] ?? '').replace(new RegExp(`^/\\* ${s.note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\*/\\n`), '');
    if (s.id === 'fonts') css = css.replace(/url\("\.\.\/fonts\//g, 'url("fonts/');
    html = `${html.slice(0, m.index)}<style id="${s.id}">\n${s.id === 'engine' ? css.trimEnd() : indent(css, 4)}\n  </style>${html.slice(m.index + m[0].length)}`;
  }
  for (const s of SCRIPTS) {
    const re = new RegExp(`<script\\b[^>]*src=["']${s.path}["'][^>]*>\\s*</script>`, 'i');
    const m = re.exec(html);
    if (!m) continue;
    html = `${html.slice(0, m.index)}<script id="${s.id}">\n${indent(files[s.path] ?? '', 4)}\n  </script>${html.slice(m.index + m[0].length)}`;
  }
  return html;
}

/** A short map of the project for AI coding agents (and busy humans). Reading this instead of the
 * whole engine keeps agent context — and token bills — small. */
export function agentsGuide(source: string, content: Content | null): string {
  const t = readTokens(source);
  const sw = (n: 'form' | 'texture' | 'motion' | 'scene' | 'interact') => getSwitch(source, n) ?? 'none';
  const sections = content?.sections.filter((s) => !s.hidden).map((s) => `- \`#${s.id}\` — ${s.type}${s.nav ? ` (menu: ${s.nav})` : ''}`) ?? [];
  return `# AGENTS.md — how this site is built

A static website made with Kiln. **No build step, no frameworks, no network**: open \`index.html\`
in a browser. Keep it that way — never add CDNs, npm packages or remote fonts/images.

## Read this first (it is enough for most changes)

| To change… | Edit | Notes |
| --- | --- | --- |
| Colors, fonts, corners, spacing, width | \`css/tokens.css\` | 12 lines. The whole design reads these. |
| Layout, texture, motion, 3D, cursor | the \`data-*\` words on \`<body>\` in \`index.html\` | One word each — values below. |
| Words, links, pictures, sections | \`index.html\` (between \`<main>\` and \`</main>\`) | Plain semantic HTML with comments. |
| A brand-new layout or effect | \`css/engine.css\` | Large. Only read the part you need (search for the selector). |

Do **not** read \`css/engine.css\`, \`css/fonts.css\` or \`js/scene.js\` unless the task is about them.

## Tokens (css/tokens.css)

${TOKEN_DOCS.map((d) => `- \`${d.name}: ${t[d.name] ?? '…'}\` — ${d.hint}`).join('\n')}

Colors are hex. \`--on-accent\` (button text) is computed automatically. Fonts available offline
(already in \`fonts/\`): ${FACES.map((f) => `"${f.family}"`).join(', ')}. After changing a
\`--font-*\` token, add a matching \`@font-face\` to \`css/fonts.css\` (copy an existing one).

## Switches on <body>

- \`data-form="${sw('form')}"\` → ${FORMS.map((f) => f.id).join(' | ')}
- \`data-texture="${sw('texture')}"\` → ${TEXTURES.map((f) => f.id).join(' | ')}
- \`data-motion="${sw('motion')}"\` → ${MOTIONS.map((f) => f.id).join(' | ')}
- \`data-scene="${sw('scene')}"\` → ${SCENES.map((f) => f.id).join(' | ')} (WebGL, js/scene.js)
- \`data-interact="${sw('interact')}"\` → ${INTERACTIONS.map((f) => f.id).join(' | ')} (js/interact.js)

## Page building blocks (index.html)

Sections in this site:
${sections.join('\n') || '- (see index.html)'}

Patterns — copy one and edit it:
- Card: \`<article class="card">\` with \`.card-media\` (picture) and \`.card-body\` (\`p.meta\`, \`h3\`, \`p\`, optional \`p.price\`)
- Row: \`<li class="row">\` with \`.row-meta\`, a \`<div>\` holding \`h3\` + \`p\`, and \`.row-aside\`
- Question: \`<details><summary>Question</summary><p>Answer</p></details>\` inside \`.qa\`
- Picture: \`<div class="art art-1">\` … \`art-12\` (painted in the site colors) or \`<img src="images/name.jpg" alt="…">\`
- Button: \`<a class="btn">\`, outline \`btn ghost\`, sizes \`btn small\` / \`btn big\`
- Highlighted word in a heading: \`<em>word</em>\`
- Menu links point at section ids: \`<a href="#work">\` → \`<section id="work">\`

Put new pictures in \`images/\`. Keep text in plain HTML; keep \`class\` names from this list so the
engine styles them.
`;
}
