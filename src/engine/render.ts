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
  if (m.video) return `<video class="cover" src="${esc(m.video)}" autoplay muted loop playsinline aria-label="${esc(m.alt ?? alt)}"></video>`;
  if (m.image) return `<img src="${esc(m.image)}" alt="${esc(m.alt ?? alt)}" loading="lazy">`;
  return `<div class="art art-${Math.min(12, Math.max(1, m.art))}"></div>`;
}

const safeHref = (h: string) => (/^\s*(javascript|data):/i.test(h) ? '#' : h);

/** Inline text: **bold**, *italic*, `code`, [text](url). */
function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => `<a href="${esc(safeHref(u))}">${t}</a>`);
}

/** The article body: blank lines split blocks; ## headings, - bullets, > quotes, ![alt](src) pictures. */
export function renderProse(body: string, indent = '        '): string {
  const blocks = body.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out: string[] = [];
  for (const b of blocks) {
    const lines = b.split('\n');
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(b);
    if (img) out.push(`${indent}<figure><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy"></figure>`);
    else if (/^###\s/.test(b)) out.push(`${indent}<h4>${inline(b.replace(/^###\s+/, ''))}</h4>`);
    else if (/^##?\s/.test(b)) out.push(`${indent}<h3>${inline(b.replace(/^##?\s+/, ''))}</h3>`);
    else if (lines.every((l) => /^[-*]\s/.test(l))) out.push(`${indent}<ul>`, ...lines.map((l) => `${indent}  <li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`), `${indent}</ul>`);
    else if (lines.every((l) => /^\d+[.)]\s/.test(l))) out.push(`${indent}<ol>`, ...lines.map((l) => `${indent}  <li>${inline(l.replace(/^\d+[.)]\s+/, ''))}</li>`), `${indent}</ol>`);
    else if (lines.every((l) => /^>\s?/.test(l))) out.push(`${indent}<blockquote><p>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</p></blockquote>`);
    else out.push(`${indent}<p>${inline(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}

/** Turns a normal YouTube / Vimeo / Google Maps / Spotify link into something an <iframe> can show. */
export function embedSrc(url: string): string {
  const u = url.trim();
  if (/^(javascript|data|vbscript):/i.test(u)) return '#';
  let m: RegExpExecArray | null;
  if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(u))) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u))) return `https://player.vimeo.com/video/${m[1]}`;
  if ((m = /open\.spotify\.com\/(track|album|playlist|episode|show)\/([\w]+)/.exec(u))) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  if (/google\.[a-z.]+\/maps|maps\.google\./.test(u)) {
    if (/output=embed|\/maps\/embed/.test(u)) return u;
    const q = /[?&]q=([^&]+)/.exec(u)?.[1] ?? /\/place\/([^/]+)/.exec(u)?.[1] ?? /\/search\/([^/]+)/.exec(u)?.[1];
    if (q) return `https://maps.google.com/maps?q=${q}&output=embed`;
  }
  if (/^[^/]+$/.test(u) && !u.includes('.')) return `https://maps.google.com/maps?q=${encodeURIComponent(u)}&output=embed`;
  return safeHref(u);
}

const SECTION_NOTES: Record<Section['type'], string> = {
  stats: 'NUMBERS — big figures with a small label',
  cards: 'CARDS — copy an <article> to add another (an <a class="card"> is a card that links somewhere)',
  prose: 'ARTICLE — plain paragraphs, <h3> headings, lists and pictures',
  form: 'FORM — with no action it opens the visitor’s email app; put a Formspree/Netlify address in action to send for real',
  embed: 'VIDEO / MAP — an <iframe> from another site',
  table: 'TABLE — one <tr> per row',
  logos: 'LOGOS — clients, partners, places you were featured',
  slider: 'SLIDER — swipe or use the arrows; copy a <figure> to add a slide',
  cta: 'CALL TO ACTION — one big ask on a colored band',
  countdown: 'COUNTDOWN — counts down to data-countdown (a date and time)',
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
        `      <div class="grid${s.people ? ' people' : ''}">`,
        ...s.items.flatMap((it) => [
          it.href ? `        <a class="card" href="${esc(safeHref(it.href))}">` : '        <article class="card">',
          s.showMedia ? `          <div class="card-media">${mediaInner(it.media, plain(it.title))}</div>` : '',
          '          <div class="card-body">',
          it.meta ? `            <p class="meta">${esc(it.meta)}</p>` : '',
          `            <h3>${rich(it.title)}</h3>`,
          it.text ? `            <p>${rich(it.text)}</p>` : '',
          it.price ? `            <p class="price">${esc(it.price)}</p>` : '',
          '          </div>',
          it.href ? '        </a>' : '        </article>',
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
    case 'prose':
      body = [...head(s.eyebrow, s.title), '      <article class="prose">', renderProse(s.body), '      </article>'];
      break;
    case 'form': {
      const netlify = s.action.trim().toLowerCase() === 'netlify';
      const action = netlify ? '/' : s.action.trim() || '#';
      const attrs = netlify ? ' data-netlify="true" name="contact"' : s.action.trim() ? '' : ` data-mail="${esc(s.email)}"`;
      const field = (f: string) => {
        if (f === 'message') return `        <label><span>Message</span><textarea name="message" rows="5" required></textarea></label>`;
        const type = f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text';
        const label = f === 'name' ? 'Your name' : f === 'email' ? 'Email' : 'Phone';
        return `        <label><span>${label}</span><input name="${f}" type="${type}"${f === 'name' || f === 'email' ? ' required' : ''}></label>`;
      };
      body = [
        ...head(s.eyebrow, s.title, s.text),
        `      <form class="form" action="${esc(action)}" method="post"${attrs}>`,
        netlify ? '        <input type="hidden" name="form-name" value="contact">' : '',
        ...s.fields.map(field),
        `        <button class="btn big" type="submit">${esc(s.button)}</button>`,
        '      </form>',
      ].filter(Boolean);
      break;
    }
    case 'embed':
      body = [
        ...head(s.eyebrow, s.title),
        '      <figure class="embed">',
        `        <iframe src="${esc(embedSrc(s.url))}" title="${esc(plain(s.title) || 'Embedded content')}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`,
        s.caption ? `        <figcaption>${esc(s.caption)}</figcaption>` : '',
        '      </figure>',
      ].filter(Boolean);
      break;
    case 'table':
      body = [
        ...head(s.eyebrow, s.title, s.intro),
        '      <div class="table-wrap">',
        '      <table>',
        `        <thead><tr>${s.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`,
        '        <tbody>',
        ...s.rows.map((r) => `          <tr>${s.columns.map((_c, i) => (i === 0 ? `<th scope="row">${esc(r[i] ?? '')}</th>` : `<td>${esc(r[i] ?? '')}</td>`)).join('')}</tr>`),
        '        </tbody>',
        '      </table>',
        '      </div>',
      ];
      break;
    case 'logos':
      body = [
        s.eyebrow ? `      <p class="eyebrow">${esc(s.eyebrow)}</p>` : '',
        '      <ul class="logos">',
        ...s.items.map((it) => `        <li>${it.media?.image ? `<img src="${esc(it.media.image)}" alt="${esc(it.media.alt ?? it.name)}" loading="lazy">` : `<span>${esc(it.name)}</span>`}</li>`),
        '      </ul>',
      ].filter(Boolean);
      break;
    case 'slider':
      body = [
        ...head(s.eyebrow, s.title),
        '      <div class="slider">',
        '        <div class="slides">',
        ...s.items.map((it) => `          <figure class="slide">${mediaInner(it.media, it.caption)}<figcaption>${esc(it.caption)}</figcaption></figure>`),
        '        </div>',
        '        <button class="slide-btn prev" type="button" aria-label="Previous">‹</button>',
        '        <button class="slide-btn next" type="button" aria-label="Next">›</button>',
        '      </div>',
      ];
      break;
    case 'cta':
      body = [
        s.eyebrow ? `      <p class="eyebrow">${esc(s.eyebrow)}</p>` : '',
        `      <h2>${rich(s.title)}</h2>`,
        s.text ? `      <p>${rich(s.text)}</p>` : '',
        `      <a class="btn big" href="${esc(safeHref(s.button.href))}">${esc(s.button.label)}</a>`,
      ].filter(Boolean);
      break;
    case 'countdown':
      body = [
        ...head(s.eyebrow, s.title, s.text),
        `      <div class="countdown" data-countdown="${esc(s.date)}">`,
        ...['days', 'hours', 'minutes', 'seconds'].map((u) => `        <div class="count"><strong data-unit="${u}">–</strong><span>${u}</span></div>`),
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

/** Which pages a site has. A single-page site passes nothing and renders exactly as before. */
export interface SiteInfo {
  pages: { slug: string; nav?: string }[]; // pages[0] is the home page ("index")
  current: string;
  /** the home page's menu entries (section id + label), repeated on every inner page */
  homeMenu?: { id: string; nav: string }[];
}

export const HOME = 'index';

export function renderMarkup(c: Content, site?: SiteInfo): string {
  const sections = c.sections.filter((s) => !s.hidden);
  const multi = !!site && site.pages.length > 1;
  const home = !site || site.current === HOME;
  const ids = new Set(sections.map((s) => s.id));
  ids.add('top');
  // On an inner page, "#work" only works if this page has that section; otherwise it lives on the home page.
  const link = (href: string) => (!home && href.startsWith('#') && !ids.has(href.slice(1)) ? `${HOME}.html${href}` : href);
  const nav = [
    ...(home
      ? sections.filter((s) => s.nav).map((s) => `      <a href="#${esc(s.id)}">${esc(s.nav!)}</a>`)
      : (site?.homeMenu ?? []).map((s) => `      <a href="${HOME}.html#${esc(s.id)}">${esc(s.nav)}</a>`)),
    ...(multi
      ? site!.pages
          .filter((p) => p.slug !== HOME && p.nav)
          .map((p) => `      <a href="${esc(p.slug)}.html"${p.slug === site!.current ? ' aria-current="page"' : ''}>${esc(p.nav!)}</a>`)
      : []),
  ];
  const when = (cond: unknown, line: string) => (cond ? line : null);
  const lines: (string | null)[] = [
    '  <a class="skip" href="#main">Skip to content</a>',
    '',
    when(c.banner?.text, '  <!-- BANNER — a one-line announcement. Delete these lines to remove it. -->'),
    when(c.banner?.text, c.banner?.href ? `  <a class="banner" href="${esc(safeHref(link(c.banner.href)))}">${rich(c.banner?.text ?? '')}</a>` : `  <p class="banner">${rich(c.banner?.text ?? '')}</p>`),
    when(c.banner?.text, ''),
    multi ? '  <!-- TOP BAR — your name and menu. Links go to sections (#id) or other pages (name.html). -->' : '  <!-- TOP BAR — your name and menu. Each link jumps to a section id. -->',
    '  <header class="nav">',
    `    <a class="brand" href="${home ? '#top' : `${HOME}.html`}"><span class="mark">${esc(c.mark)}</span> ${esc(c.brand)}</a>`,
    when(nav.length >= 4, '    <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false"><span></span></button>'),
    when(nav.length, '    <nav class="menu">'),
    ...nav,
    when(nav.length, '    </nav>'),
    `    <a class="btn small" href="${esc(link(c.navCta.href))}">${esc(c.navCta.label)}</a>`,
    '  </header>',
    '',
    home ? '  <main id="main">' : `  <main id="main" class="subpage" data-page="${esc(site!.current)}">`,
    '    <!-- HERO — the first thing people see. Change the words between the tags. -->',
    '    <section class="hero" id="top">',
    '      <div class="hero-copy">',
    when(c.eyebrow, `        <p class="eyebrow">${esc(c.eyebrow)}</p>`),
    `        <h1>${rich(c.headline)}</h1>`,
    when(c.lede, `        <p class="lede">${rich(c.lede)}</p>`),
    '        <div class="actions">',
    `          <a class="btn" href="${esc(link(c.primary.href))}">${esc(c.primary.label)}</a>`,
    when(c.secondary, `          <a class="btn ghost" href="${esc(link(c.secondary?.href ?? ''))}">${esc(c.secondary?.label ?? '')}</a>`),
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
    // The tab icon: your logo letters on your accent color (no image file needed).
    const icon = document.querySelector('link[rel="icon"]');
    const mark = document.querySelector('.mark');
    if (icon && mark) {
      const css = getComputedStyle(document.body);
      const letters = mark.textContent.trim().slice(0, 3).replace(/[<>&]/g, '');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="' + css.getPropertyValue('--accent').trim() + '"/><text x="32" y="41" text-anchor="middle" font-family="' + css.fontFamily.replace(/"/g, '') + '" font-weight="700" font-size="' + (letters.length > 2 ? 24 : 30) + '" fill="' + css.getPropertyValue('--bg').trim() + '">' + letters + '</text></svg>';
      icon.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    }
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
      // The menu button on small screens
      document.addEventListener('click', function (e) {
        var btn = e.target instanceof Element ? e.target.closest('.menu-btn') : null;
        if (btn) {
          var nav = btn.closest('.nav');
          var open = nav.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        } else if (e.target instanceof Element && e.target.closest('.menu a')) {
          var openNav = e.target.closest('.nav.is-open');
          if (openNav) { openNav.classList.remove('is-open'); openNav.querySelector('.menu-btn').setAttribute('aria-expanded', 'false'); }
        }
      });
      // Slider arrows
      document.addEventListener('click', function (e) {
        var arrow = e.target instanceof Element ? e.target.closest('.slide-btn') : null;
        if (!arrow) return;
        var slides = arrow.parentElement.querySelector('.slides');
        var step = (slides.querySelector('.slide') || slides).getBoundingClientRect().width + 16;
        slides.scrollBy({ left: arrow.classList.contains('next') ? step : -step, behavior: 'smooth' });
      });
      // Countdowns
      function tickCountdown() {
        document.querySelectorAll('[data-countdown]').forEach(function (el) {
          var left = Math.max(0, new Date(el.getAttribute('data-countdown')).getTime() - Date.now());
          var d = Math.floor(left / 86400000), h = Math.floor(left / 3600000) % 24, m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
          var v = { days: d, hours: h, minutes: m, seconds: s };
          el.querySelectorAll('[data-unit]').forEach(function (n) { n.textContent = isNaN(left) ? '–' : String(v[n.getAttribute('data-unit')]).padStart(2, '0'); });
        });
      }
      tickCountdown();
      setInterval(tickCountdown, 1000);
      // Forms without a server: open the visitor's email app with the message filled in
      document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-mail')) return;
        e.preventDefault();
        var data = new FormData(form), lines = [];
        data.forEach(function (v, k) { lines.push(k + ': ' + v); });
        location.href = 'mailto:' + form.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Message from ' + document.title) + '&body=' + encodeURIComponent(lines.join('\\n'));
      });
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

export function titleFor(c: Content, site?: SiteInfo): string {
  if (site && site.current !== HOME) return `${plain(c.headline)} — ${plain(c.brand)}`;
  return `${plain(c.brand)} — ${plain(c.eyebrow || c.headline)}`;
}

export function renderDocument(g: Genome, c: Content, tokens: Tokens = tokensFor(g), site?: SiteInfo): string {
  const sw = switchesFor(g);
  const faces = facesUsedIn(`${tokens['--font-display']} ${tokens['--font-body']}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titleFor(c, site))}</title>
  <meta name="description" content="${esc(plain(c.lede))}">
  <meta property="og:title" content="${esc(titleFor(c, site))}">
  <meta property="og:description" content="${esc(plain(c.lede))}">
  <meta property="og:type" content="website">
  <meta name="generator" content="Kiln">
  <link rel="icon" href="data:,">  <!-- the motion script draws a tab icon from your logo letters -->

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
${renderMarkup(c, site)}

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
