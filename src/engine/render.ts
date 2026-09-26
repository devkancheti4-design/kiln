// Turns a design (genome) + words (content) into one complete, readable HTML file.
// The file has four parts people learn in the guide: tokens, fonts, engine, page (+ switches on <body>).
import { DEFAULT_WIDTH, DENSITIES, FORMS, INTERACTIONS, MOTIONS, SCENES, SHAPES, TEXTURES } from './axes';
import type { Content, Media, Section } from './content';
import type { Genome } from './genome';
import { KINDS } from './kinds';
import { swatchOf } from './palettes';
import { SCENE_JS } from './scene';
import ENGINE_CSS from './site.css?raw';
import { FACES, type Face, PAIRINGS, facesUsedIn, stackOf } from './typefaces';

export { ENGINE_CSS };

// ------------------------------------------------------------------ tokens

export type Tokens = Record<string, string>;

export interface TokenDoc {
  name: string;
  group?: string;
  hint: string;
}

export const TOKEN_DOCS: TokenDoc[] = [
  { name: 'color-scheme', hint: 'light or dark — scrollbars and inputs follow it' },
  { name: '--bg', group: 'COLOR — three colors paint the whole site', hint: 'page background' },
  { name: '--ink', hint: 'text' },
  { name: '--accent', hint: 'buttons, links, highlights' },
  { name: '--font-display', group: 'TYPE', hint: 'headings' },
  { name: '--font-body', hint: 'reading text' },
  { name: '--display-weight', hint: '300 thin … 900 heavy' },
  { name: '--tracking', hint: 'space between heading letters' },
  { name: '--scale', hint: 'heading size: 1.15 calm … 1.6 loud' },
  { name: '--radius', group: 'SHAPE', hint: 'corners: 0px sharp … 999px pill' },
  { name: '--space', hint: 'breathing room: 0.8 compact … 1.4 airy' },
  { name: '--width', hint: 'the widest the page gets' },
];

export function tokensFor(g: Genome): Tokens {
  const sw = swatchOf(g.palette, g.mode);
  const pair = PAIRINGS[g.type];
  return {
    'color-scheme': g.mode === 1 ? 'dark' : 'light',
    '--bg': sw.bg,
    '--ink': sw.ink,
    '--accent': sw.accent,
    '--font-display': stackOf(pair.display),
    '--font-body': stackOf(pair.body),
    '--display-weight': String(pair.weight),
    '--tracking': pair.tracking,
    '--scale': String(FORMS[g.form].scale),
    '--radius': SHAPES[g.shape].radius,
    '--space': DENSITIES[g.density].space,
    '--width': DEFAULT_WIDTH,
  };
}

export function switchesFor(g: Genome) {
  return {
    form: FORMS[g.form].id,
    texture: TEXTURES[g.texture].id,
    motion: MOTIONS[g.motion].id,
    scene: SCENES[g.scene].id,
    interact: INTERACTIONS[g.interact].id,
  };
}

const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s + ' '.repeat(n - s.length));

export function renderTokensCss(t: Tokens): string {
  const lines = ['    :root {'];
  for (const doc of TOKEN_DOCS) {
    if (t[doc.name] === undefined) continue;
    if (doc.group) lines.push('', `      /* ${doc.group} */`);
    lines.push(`      ${pad(`${doc.name}: ${t[doc.name]};`, 46)}/* ${doc.hint} */`);
  }
  lines.push('    }');
  return lines.join('\n');
}

// ------------------------------------------------------------------ fonts

export interface FontFile {
  path: string; // "fonts/fraunces.woff2"
  file: string; // "fraunces.woff2"
  face: Face;
  italic: boolean;
}

export function fontFilesFor(faces: Face[]): FontFile[] {
  const out: FontFile[] = [];
  for (const face of faces) {
    out.push({ path: `fonts/${face.id}.woff2`, file: `${face.id}.woff2`, face, italic: false });
    if (face.italic) out.push({ path: `fonts/${face.id}-italic.woff2`, file: `${face.id}-italic.woff2`, face, italic: true });
  }
  return out;
}

export function fontFaceRule(f: FontFile, url = f.path): string {
  const [lo, hi] = f.face.weights;
  const weight = lo === hi ? `${lo}` : `${lo} ${hi}`;
  const style = f.italic ? ' font-style: italic;' : '';
  return `@font-face { font-family: "${f.face.family}"; src: url("${url}") format("woff2"); font-weight: ${weight};${style} font-display: swap; }`;
}

export function renderFontsCss(faces: Face[]): string {
  const rules = fontFilesFor(faces).map((f) => `    ${fontFaceRule(f)}`);
  return ['    /* Kiln keeps this block in sync with the fonts your tokens use. Files live in fonts/ */', ...rules].join('\n');
}

export const ALL_FACES = FACES;

// ------------------------------------------------------------------ markup

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Escapes text and turns *word* into <em>word</em> (the accent-colored italic). */
export function rich(s: string): string {
  return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

const plain = (s: string) => s.replace(/\*/g, '');

function mediaInner(m: Media, alt: string): string {
  if (m.image) return `<img src="${esc(m.image)}" alt="${esc(m.alt ?? alt)}" loading="lazy">`;
  return `<div class="art art-${Math.min(12, Math.max(1, m.art))}"></div>`;
}

const SECTION_NOTES: Record<Section['type'], string> = {
  stats: 'NUMBERS — big figures with a small label',
  cards: 'CARDS — copy an <article> to add another',
  about: 'ABOUT — a picture and a few words',
  list: 'LIST — one <li class="row"> per line',
  quote: 'QUOTE — kind words from someone',
  gallery: 'GALLERY — copy a <figure> to add a picture (click one to enlarge)',
  faq: 'QUESTIONS — each <details> opens when clicked, no script needed',
  contact: 'CONTACT — how people reach you',
};

function renderSection(s: Section): string {
  const note = `    <!-- ${SECTION_NOTES[s.type]} -->`;
  const open = `    <section class="${s.type}" id="${esc(s.id)}">`;
  const close = '    </section>';
  const head = (eyebrow: string, title: string, intro?: string) =>
    [
      '      <header class="section-head">',
      eyebrow ? `        <p class="eyebrow">${esc(eyebrow)}</p>` : '',
      `        <h2>${rich(title)}</h2>`,
      intro ? `        <p class="intro">${rich(intro)}</p>` : '',
      '      </header>',
    ].filter(Boolean);

  let body: string[] = [];
  switch (s.type) {
    case 'stats':
      body = s.items.map((it) => `      <div class="stat"><strong>${esc(it.value)}</strong><span>${esc(it.label)}</span></div>`);
      break;
    case 'cards':
      body = [
        ...head(s.eyebrow, s.title, s.intro),
        '      <div class="grid">',
        ...s.items.flatMap((it) => [
          '        <article class="card">',
          s.showMedia ? `          <div class="card-media">${mediaInner(it.media, plain(it.title))}</div>` : '',
          '          <div class="card-body">',
          it.meta ? `            <p class="meta">${esc(it.meta)}</p>` : '',
          `            <h3>${rich(it.title)}</h3>`,
          it.text ? `            <p>${rich(it.text)}</p>` : '',
          it.price ? `            <p class="price">${esc(it.price)}</p>` : '',
          '          </div>',
          '        </article>',
        ]).filter(Boolean),
        '      </div>',
      ];
      break;
    case 'about':
      body = [
        `      <figure class="about-media">${mediaInner(s.media, plain(s.title))}</figure>`,
        '      <div class="about-copy">',
        s.eyebrow ? `        <p class="eyebrow">${esc(s.eyebrow)}</p>` : '',
        `        <h2>${rich(s.title)}</h2>`,
        `        <p>${rich(s.text)}</p>`,
        s.points.length ? '        <ul class="points">' : '',
        ...s.points.map((p) => `          <li>${rich(p)}</li>`),
        s.points.length ? '        </ul>' : '',
        '      </div>',
      ].filter(Boolean);
      break;
    case 'list':
      body = [
        ...head(s.eyebrow, s.title, s.intro),
        '      <ol class="rows">',
        ...s.items.flatMap((it) => [
          '        <li class="row">',
          `          <span class="row-meta">${esc(it.meta)}</span>`,
          `          <div><h3>${rich(it.title)}</h3>${it.text ? `<p>${rich(it.text)}</p>` : ''}</div>`,
          `          <span class="row-aside">${esc(it.aside ?? '')}</span>`,
          '        </li>',
        ]),
        '      </ol>',
      ];
      break;
    case 'quote':
      body = [
        '      <blockquote>',
        `        <p>${rich(s.text)}</p>`,
        `        <footer><strong>${esc(s.name)}</strong>${s.role ? ` · ${esc(s.role)}` : ''}</footer>`,
        '      </blockquote>',
      ];
      break;
    case 'gallery':
      body = [
        ...head(s.eyebrow, s.title),
        '      <div class="shots">',
        ...s.items.map((it) => `        <figure class="shot">${mediaInner(it.media, it.caption)}<figcaption>${esc(it.caption)}</figcaption></figure>`),
        '      </div>',
      ];
      break;
    case 'faq':
      body = [
        ...head(s.eyebrow, s.title),
        '      <div class="qa">',
        ...s.items.map((it) => `        <details><summary>${esc(it.q)}</summary><p>${rich(it.a)}</p></details>`),
        '      </div>',
      ];
      break;
    case 'contact': {
      const details = [
        `        <li><span>Email</span>${esc(s.email)}</li>`,
        s.phone ? `        <li><span>Phone</span>${esc(s.phone)}</li>` : '',
        s.address ? `        <li><span>Address</span>${esc(s.address)}</li>` : '',
      ].filter(Boolean);
      body = [
        s.eyebrow ? `      <p class="eyebrow">${esc(s.eyebrow)}</p>` : '',
        `      <h2>${rich(s.title)}</h2>`,
        s.text ? `      <p>${rich(s.text)}</p>` : '',
        `      <a class="btn big" href="mailto:${esc(s.email)}">${esc(s.cta)}</a>`,
        '      <ul class="details">',
        ...details,
        '      </ul>',
      ].filter(Boolean);
      break;
    }
  }
  return [note, open, ...body, close].join('\n');
}

export function renderMarkup(c: Content): string {
  const sections = c.sections.filter((s) => !s.hidden);
  const nav = sections.filter((s) => s.nav).map((s) => `      <a href="#${esc(s.id)}">${esc(s.nav!)}</a>`);
  const when = (cond: unknown, line: string) => (cond ? line : null);
  const lines: (string | null)[] = [
    '  <a class="skip" href="#main">Skip to content</a>',
    '',
    '  <!-- TOP BAR — your name and menu. Each link jumps to a section id. -->',
    '  <header class="nav">',
    `    <a class="brand" href="#top"><span class="mark">${esc(c.mark)}</span> ${esc(c.brand)}</a>`,
    when(nav.length, '    <nav class="menu">'),
    ...nav,
    when(nav.length, '    </nav>'),
    `    <a class="btn small" href="${esc(c.navCta.href)}">${esc(c.navCta.label)}</a>`,
    '  </header>',
    '',
    '  <main id="main">',
    '    <!-- HERO — the first thing people see. Change the words between the tags. -->',
    '    <section class="hero" id="top">',
    '      <div class="hero-copy">',
    when(c.eyebrow, `        <p class="eyebrow">${esc(c.eyebrow)}</p>`),
    `        <h1>${rich(c.headline)}</h1>`,
    when(c.lede, `        <p class="lede">${rich(c.lede)}</p>`),
    '        <div class="actions">',
    `          <a class="btn" href="${esc(c.primary.href)}">${esc(c.primary.label)}</a>`,
    when(c.secondary, `          <a class="btn ghost" href="${esc(c.secondary?.href ?? '')}">${esc(c.secondary?.label ?? '')}</a>`),
    '        </div>',
    '      </div>',
    `      <figure class="hero-media">${mediaInner(c.heroMedia, c.brand)}</figure>`,
    '    </section>',
    ...sections.flatMap((s) => ['', renderSection(s)]),
    '  </main>',
    '',
    '  <footer class="footer">',
    `    <p>${esc(c.footer)}</p>`,
    when(c.socials.length, '    <nav class="socials">'),
    ...c.socials.map((l) => `      <a href="${esc(l.href)}">${esc(l.label)}</a>`),
    when(c.socials.length, '    </nav>'),
    '  </footer>',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

// ------------------------------------------------------------------ document

export const MOTION_JS = `    // Adds .is-in to each section as it scrolls into view; body[data-motion] picks the style.
    document.body.classList.add('js');
    const sections = document.querySelectorAll('main > section');
    sections.forEach((section) =>
      section.querySelectorAll('.card, .stat, .row, .shot').forEach((el, i) => el.style.setProperty('--i', i % 8))
    );
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          reveal.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    sections.forEach((section) => reveal.observe(section));`;

export const INTERACT_JS = `    // How the page answers the cursor; body[data-interact] picks the style:
    //   none · tilt · spotlight · magnetic
    // Gallery pictures open larger when clicked, whatever the style.
    (function () {
      var fine = matchMedia('(hover: hover)').matches;
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var body = document.body;
      var TILT = '.card, .hero-media, .about-media, .stat, .shot > :first-child';
      var LIGHT = '.card, .stat, .row, .hero-copy, .quote blockquote, .about-copy';
      var tilted = null;
      addEventListener('pointermove', function (e) {
        if (!fine || reduce) return;
        var mode = body.getAttribute('data-interact') || 'none';
        var target = e.target instanceof Element ? e.target : null;
        if (mode === 'spotlight') {
          body.style.setProperty('--px', e.pageX + 'px');
          body.style.setProperty('--py', e.pageY + 'px');
          var panel = target && target.closest(LIGHT);
          if (panel) {
            var b = panel.getBoundingClientRect();
            panel.style.setProperty('--mx', e.clientX - b.left + 'px');
            panel.style.setProperty('--my', e.clientY - b.top + 'px');
          }
        }
        var el = mode === 'tilt' && target ? target.closest(TILT) : null;
        if (el !== tilted && tilted) { tilted.style.removeProperty('--rx'); tilted.style.removeProperty('--ry'); }
        tilted = el;
        if (el) {
          var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg');
          el.style.setProperty('--ry', ((x - 0.5) * 11).toFixed(2) + 'deg');
          el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
          el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        }
        if (mode === 'magnetic') {
          document.querySelectorAll('.btn').forEach(function (btn) {
            var r = btn.getBoundingClientRect();
            var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
            var pull = Math.max(0, 1 - Math.hypot(dx, dy) / 130);
            btn.style.setProperty('--tx', (dx * 0.32 * pull).toFixed(1) + 'px');
            btn.style.setProperty('--ty', (dy * 0.32 * pull).toFixed(1) + 'px');
          });
        }
      }, { passive: true });
      document.addEventListener('click', function (e) {
        var shot = e.target instanceof Element ? e.target.closest('.shot') : null;
        if (!shot || typeof HTMLDialogElement === 'undefined') return;
        var box = document.createElement('dialog');
        box.className = 'lightbox';
        box.innerHTML = shot.innerHTML;
        box.addEventListener('click', function () { box.close(); });
        box.addEventListener('close', function () { box.remove(); });
        body.appendChild(box);
        box.showModal();
      });
    })();`;

export const SWITCHES_NOTE = `<!-- =================================================================
     SWITCHES — change one word on <body> to rearrange the whole page
       data-form      ${FORMS.map((f) => f.id).join(' · ')}
       data-texture   ${TEXTURES.map((t) => t.id).join(' · ')}
       data-motion    ${MOTIONS.map((m) => m.id).join(' · ')}
       data-scene     ${SCENES.map((m) => m.id).join(' · ')}
       data-interact  ${INTERACTIONS.map((m) => m.id).join(' · ')}
     ================================================================= -->`;

export function titleFor(c: Content): string {
  return `${plain(c.brand)} — ${plain(c.eyebrow || c.headline)}`;
}

export function renderDocument(g: Genome, c: Content, tokens: Tokens = tokensFor(g)): string {
  const sw = switchesFor(g);
  const faces = facesUsedIn(`${tokens['--font-display']} ${tokens['--font-body']}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titleFor(c))}</title>
  <meta name="description" content="${esc(plain(c.lede))}">
  <meta name="generator" content="Kiln">

  <!-- =================================================================
       1 · TOKENS — change these values to transform the whole site
       ================================================================= -->
  <style id="tokens">
${renderTokensCss(tokens)}
  </style>

  <!-- 2 · FONTS — shipped with the site, so it works offline -->
  <style id="fonts">
${renderFontsCss(faces)}
  </style>

  <!-- 3 · ENGINE — the CSS that reads your tokens. Read it, change anything. -->
  <style id="engine">
${ENGINE_CSS.trim()}
  </style>
</head>

${SWITCHES_NOTE}
<body class="site" data-form="${sw.form}" data-texture="${sw.texture}" data-motion="${sw.motion}" data-scene="${sw.scene}" data-interact="${sw.interact}">
${renderMarkup(c)}

  <!-- 4 · MOTION — fades sections in as you scroll (see data-motion) -->
  <script id="motion">
${MOTION_JS}
  </script>

  <!-- 5 · INTERACTION — tilt, spotlight or magnetic (see data-interact) -->
  <script id="interact">
${INTERACT_JS}
  </script>

  <!-- 6 · SCENE — a real-time 3D object for the hero (see data-scene) -->
  <script id="scene">
${SCENE_JS}
  </script>
</body>
</html>
`;
}

export function kindContent(kind: number): Content {
  return structuredClone(KINDS[kind].content);
}
