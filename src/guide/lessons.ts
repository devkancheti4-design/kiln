// The Guide: short lessons in the W3Schools spirit — read a little, change one line, see it.
// Every lesson edits a real Kiln site, and every challenge checks itself.
import { FORMS, INTERACTIONS, SCENES, TEXTURES } from '../engine/axes';
import { contrast, isHex, luminance } from '../engine/color';
import { AXIS_SIZE, genomeAt, TOTAL } from '../engine/genome';
import { KINDS } from '../engine/kinds';
import { bodyTagRange, getSwitch, markupRange, readTokens, styleRange } from '../engine/patch';
import { renderDocument } from '../engine/render';
import { FACES } from '../engine/typefaces';

export const DEMO_NUMBER = 329_208_974; // Clay & Co. · Split · a vase on the wheel

export function demoSource(): string {
  const g = genomeAt(DEMO_NUMBER - 1);
  return renderDocument(g, structuredClone(KINDS[g.kind].content));
}

// ------------------------------------------------------------------ regions a lesson can edit

export interface Region {
  get: (src: string) => string;
  set: (src: string, code: string) => string;
  label: string;
}

const tokensRegion: Region = {
  label: 'css — tokens',
  get: (src) => {
    const r = styleRange(src, 'tokens');
    return r ? src.slice(r.from, r.to).replace(/^\n|\s+$/g, '').replace(/^ {4}/gm, '') : '';
  },
  set: (src, code) => {
    const r = styleRange(src, 'tokens');
    if (!r) return src;
    const css = code.replace(/\s+$/, '').replace(/^(?=.)/gm, '    ');
    return `${src.slice(0, r.from)}\n${css}\n  ${src.slice(r.to)}`;
  },
};

const bodyRegion: Region = {
  label: 'html — the <body> tag',
  get: (src) => {
    const r = bodyTagRange(src);
    return r ? src.slice(r.from, r.to).replace(/" /g, '"\n      ') : '';
  },
  set: (src, code) => {
    const r = bodyTagRange(src);
    if (!r) return src;
    const tag = code.replace(/\s*\n\s*/g, ' ').trim();
    if (!/^<body\b[^>]*>$/i.test(tag)) return src;
    return src.slice(0, r.from) + tag + src.slice(r.to);
  },
};

function sectionRegion(cls: string, label: string): Region {
  const find = (src: string) => {
    const m = markupRange(src);
    if (!m) return null;
    const re = new RegExp(`<section class="${cls}"[^>]*>`);
    const hit = re.exec(src.slice(m.from, m.to));
    if (!hit) return null;
    const from = m.from + hit.index;
    const close = src.indexOf('</section>', from);
    return close < 0 ? null : { from, to: close + '</section>'.length };
  };
  return {
    label,
    get: (src) => {
      const r = find(src);
      return r ? src.slice(r.from, r.to).replace(/^ {4}/gm, '') : '';
    },
    set: (src, code) => {
      const r = find(src);
      if (!r) return src;
      return src.slice(0, r.from) + code.replace(/\s+$/, '').replace(/\n(?=.)/g, '\n    ') + src.slice(r.to);
    },
  };
}

const navRegion: Region = {
  label: 'html — the top bar',
  get: (src) => {
    const m = /<header class="nav">[\s\S]*?<\/header>/.exec(src);
    return m ? m[0].replace(/^ {2}/gm, '') : '';
  },
  set: (src, code) => {
    const m = /<header class="nav">[\s\S]*?<\/header>/.exec(src);
    return m ? src.slice(0, m.index) + code.replace(/\s+$/, '').replace(/\n(?=.)/g, '\n  ') + src.slice(m.index + m[0].length) : src;
  },
};

const extraCss: Region = {
  label: 'css — your own rules',
  get: (src) => {
    const r = styleRange(src, 'mine');
    return r ? src.slice(r.from, r.to).trim() : '';
  },
  set: (src, code) => {
    const r = styleRange(src, 'mine');
    if (r) return `${src.slice(0, r.from)}\n${code}\n  ${src.slice(r.to)}`;
    return src.replace(/<\/head>/i, `  <style id="mine">\n${code}\n  </style>\n</head>`);
  },
};

// ------------------------------------------------------------------ checks

const doc = (src: string) => new DOMParser().parseFromString(src, 'text/html');
const tok = (src: string, k: string) => readTokens(src)[k] ?? '';
const num = (v: string) => parseFloat(v);

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  /** paragraphs; `code`, **bold** and [[token]] are rendered */
  body: string[];
  example?: { code: string; note: string };
  region?: Region;
  /** starting code for the try-it editor (defaults to the region of the demo site) */
  starter?: string;
  challenge?: { task: string; check: (src: string) => boolean; hint: string; answer?: string };
  unlocks?: { label: string; factor: number | 'infinite' };
}

const DEFAULT_H1 = 'Everyday pottery, <em>made</em> by hand.';

export const LESSONS: Lesson[] = [
  // ---------------------------------------------------------------- start
  {
    id: 'anatomy',
    chapter: 'Start here',
    title: 'One file, millions of websites',
    body: [
      'Every Kiln site is **one ordinary HTML file**. Open it in any browser — no internet, no build step, no account.',
      'The file has four parts, always in the same order:',
      '**1 · Tokens** — twelve values like `--accent` and `--radius`. The whole design reads them.',
      '**2 · Fonts** and **3 · Engine** — the CSS that turns tokens into a website. You rarely need to touch it.',
      '**Switches** — five words on `<body>`, like `data-form="split"`. One word rearranges the whole page.',
      '**The page** — your words in plain HTML, with comments telling you what each part is.',
      'Change a token or a switch and you are looking at a different website. That is how one file becomes millions.',
    ],
    example: {
      code: `<style id="tokens">
  :root {
    --accent: #b94f2b;   /* one color… */
    --radius: 16px;      /* one number… */
  }
</style>

<body class="site" data-form="split">   <!-- one word… -->`,
      note: '…and the whole site follows.',
    },
  },
  {
    id: 'math',
    chapter: 'Start here',
    title: 'Why there are so many',
    body: [
      'Kiln’s catalog is every combination of a few hand-made pieces. Multiply them and the number explodes:',
      `${AXIS_SIZE.kind} kinds × ${AXIS_SIZE.form} forms × ${AXIS_SIZE.palette} glazes × 2 moods × ${AXIS_SIZE.type} type pairs × ${AXIS_SIZE.shape} corners × ${AXIS_SIZE.density} spacings × ${AXIS_SIZE.texture} textures × ${AXIS_SIZE.motion} motions × ${AXIS_SIZE.scene} 3D scenes × ${AXIS_SIZE.interact} cursor styles = **${TOTAL.toLocaleString('en-US')}** websites.`,
      'Every one has a number, and the same number always rebuilds the same site — so there is nothing to download and nothing to lose.',
      'Each lesson here teaches one of those pieces. By the end you can make any of them by hand — and then go past the catalog to sites nobody else has.',
    ],
  },

  // ---------------------------------------------------------------- tokens
  {
    id: 'colors',
    chapter: 'Tokens',
    title: 'Three colors paint everything',
    body: [
      '`--bg` is the page, `--ink` is the text and `--accent` is for buttons and highlights. Surfaces, lines and soft tints are **mixed from these three** by the engine.',
      'Keep `--ink` far from `--bg` so words are easy to read. If you make the page dark, set `color-scheme: dark` too, so scrollbars match.',
    ],
    region: tokensRegion,
    challenge: {
      task: 'Make it a dark site: a dark --bg with light --ink (and color-scheme: dark).',
      check: (s) => {
        const bg = tok(s, '--bg');
        const ink = tok(s, '--ink');
        return isHex(bg) && isHex(ink) && luminance(bg) < 0.08 && contrast(bg, ink) >= 7 && tok(s, 'color-scheme') === 'dark';
      },
      hint: 'Try --bg: #15110f; and --ink: #f2e9e1; — then change light to dark on the color-scheme line.',
    },
    unlocks: { label: 'glazes', factor: 48 },
  },
  {
    id: 'accent',
    chapter: 'Tokens',
    title: 'The accent color',
    body: [
      'One hex color changes every button, link, logo mark and *highlighted* word. Button text flips between black and white automatically so it stays readable.',
      'Hex colors are `#` plus three pairs: red, green, blue. `#2f7a55` is a leafy green; `#2851a3` is a deep blue.',
    ],
    region: tokensRegion,
    challenge: {
      task: 'Change --accent to any color you like.',
      check: (s) => isHex(tok(s, '--accent')) && tok(s, '--accent').toLowerCase() !== '#b94f2b',
      hint: 'Replace #b94f2b with #2851a3.',
    },
  },
  {
    id: 'fonts',
    chapter: 'Tokens',
    title: 'Fonts',
    body: [
      '`--font-display` is for headings, `--font-body` for reading. The first name in quotes is the font; the rest are backups.',
      `These ${FACES.length} fonts ship inside Kiln and work offline: ${FACES.map((f) => `\`${f.family}\``).join(', ')}.`,
    ],
    region: tokensRegion,
    challenge: {
      task: 'Use "Unbounded" for the headings.',
      check: (s) => /^\s*["']Unbounded["']/.test(tok(s, '--font-display')),
      hint: 'Change "Fraunces" to "Unbounded" on the --font-display line.',
    },
    unlocks: { label: 'type pairs', factor: 12 },
  },
  {
    id: 'weight',
    chapter: 'Tokens',
    title: 'Weight and letter spacing',
    body: [
      '`--display-weight` goes from 200 (hairline) to 900 (heavy). `--tracking` is the space between heading letters in `em` — a share of the font size. Big headings usually look better a little tight, like `-0.03em`.',
      'Tip: in the studio’s code you can **drag a number** left or right instead of typing.',
    ],
    region: tokensRegion,
    challenge: {
      task: 'Make headings heavy: --display-weight of 800 or more.',
      check: (s) => num(tok(s, '--display-weight')) >= 800,
      hint: 'Change 560 to 800.',
    },
  },
  {
    id: 'scale',
    chapter: 'Tokens',
    title: 'How loud are the headings?',
    body: ['Each heading size is `--scale` times the one below it. `1.15` whispers, `1.3` speaks, `1.6` shouts.'],
    region: tokensRegion,
    challenge: { task: 'Make the headings shout: --scale of 1.5 or more.', check: (s) => num(tok(s, '--scale')) >= 1.5, hint: 'Change 1.3 to 1.55.' },
  },
  {
    id: 'radius',
    chapter: 'Tokens',
    title: 'Corners',
    body: [
      'One number rounds every button, card and picture. `0px` is crisp and architectural, `16px` is friendly, `999px` turns buttons into pills (cards stop at 28px so they stay card-shaped).',
    ],
    region: tokensRegion,
    challenge: { task: 'Make every corner perfectly sharp.', check: (s) => num(tok(s, '--radius')) === 0, hint: 'Set --radius: 0px;' },
    unlocks: { label: 'corner styles', factor: 4 },
  },
  {
    id: 'space',
    chapter: 'Tokens',
    title: 'Breathing room',
    body: ['`--space` multiplies every gap and every section’s padding. `0.8` is compact, `1.3` airy. Luxury brands love lots of air.'],
    region: tokensRegion,
    challenge: { task: 'Make it airy: --space of 1.4 or more.', check: (s) => num(tok(s, '--space')) >= 1.4, hint: 'Change 1 to 1.4.' },
    unlocks: { label: 'spacings', factor: 3 },
  },
  {
    id: 'width',
    chapter: 'Tokens',
    title: 'Page width',
    body: ['`--width` is the widest your content can get on big screens. Narrow pages feel like a letter; wide ones like a magazine spread.'],
    region: tokensRegion,
    challenge: { task: 'Make the page narrow: 900px or less.', check: (s) => num(tok(s, '--width')) <= 900 && num(tok(s, '--width')) > 0, hint: 'Set --width: 860px;' },
  },

  // ---------------------------------------------------------------- switches
  {
    id: 'form',
    chapter: 'Switches',
    title: 'Change one word, change the layout',
    body: [
      `\`data-form\` picks the layout. The words in the page never move in the code — only the CSS changes how they are arranged. Try: ${FORMS.map((f) => `\`${f.id}\``).join(', ')}.`,
      'This idea — same HTML, different CSS — is how the famous CSS Zen Garden worked.',
    ],
    region: bodyRegion,
    challenge: { task: 'Switch the layout to bento.', check: (s) => getSwitch(s, 'form') === 'bento', hint: 'Change data-form="split" to data-form="bento".' },
    unlocks: { label: 'layouts', factor: 10 },
  },
  {
    id: 'texture',
    chapter: 'Switches',
    title: 'Textures',
    body: [`\`data-texture\` draws a pattern behind everything, in your own colors: ${TEXTURES.map((t) => `\`${t.id}\``).join(', ')}.`],
    region: bodyRegion,
    challenge: { task: 'Put the page on grid paper.', check: (s) => getSwitch(s, 'texture') === 'grid', hint: 'data-texture="grid"' },
    unlocks: { label: 'textures', factor: 7 },
  },
  {
    id: 'motion',
    chapter: 'Switches',
    title: 'Motion',
    body: ['`data-motion` decides how sections arrive as you scroll: `still`, `gentle` or `lively` (cards stagger in and the hero art drifts). Scroll the preview to see it.'],
    region: bodyRegion,
    challenge: { task: 'Make it lively.', check: (s) => getSwitch(s, 'motion') === 'lively', hint: 'data-motion="lively"' },
    unlocks: { label: 'motions', factor: 3 },
  },
  {
    id: 'scene',
    chapter: 'Switches',
    title: 'A 3D hero',
    body: [
      `\`data-scene\` puts a real-time 3D object in the hero picture, drawn with WebGL — no libraries, no internet: ${SCENES.map((s) => `\`${s.id}\``).join(', ')}.`,
      'It uses your three colors, and the light follows the visitor’s cursor. Move your mouse over the preview.',
    ],
    region: bodyRegion,
    challenge: { task: 'Show the glossy blob.', check: (s) => getSwitch(s, 'scene') === 'blob', hint: 'data-scene="blob"' },
    unlocks: { label: '3D scenes', factor: 7 },
  },
  {
    id: 'interact',
    chapter: 'Switches',
    title: 'Cursor effects',
    body: [`\`data-interact\` makes the page answer the cursor: ${INTERACTIONS.map((s) => `\`${s.id}\``).join(', ')}. Hover over the cards in the preview after you change it.`],
    region: bodyRegion,
    challenge: { task: 'This site tilts. Give it a spotlight that follows the cursor instead.', check: (s) => getSwitch(s, 'interact') === 'spotlight', hint: 'data-interact="spotlight"' },
    unlocks: { label: 'cursor styles', factor: 4 },
  },

  // ---------------------------------------------------------------- html
  {
    id: 'words',
    chapter: 'The page (HTML)',
    title: 'Your words',
    body: [
      'Text lives **between tags**: `<h1>` is the big headline, `<p>` is a paragraph. Change the words, keep the tags.',
      'Wrap a word in `<em>` and it becomes italic in your accent color.',
    ],
    region: sectionRegion('hero', 'html — the hero'),
    challenge: {
      task: 'Write your own headline, with one highlighted word.',
      check: (s) => {
        const h1 = doc(s).querySelector('.hero h1');
        return !!h1 && h1.innerHTML.trim() !== DEFAULT_H1 && !!h1.querySelector('em');
      },
      hint: 'For example: <h1>Hi, I am <em>Devi</em>.</h1>',
    },
    unlocks: { label: 'kinds of site', factor: 12 },
  },
  {
    id: 'buttons',
    chapter: 'The page (HTML)',
    title: 'Buttons are links',
    body: [
      'Any `<a>` with `class="btn"` becomes a button. Add `ghost` for an outline, `small` or `big` for size. `href="#shop"` jumps to the section with `id="shop"`.',
    ],
    region: sectionRegion('hero', 'html — the hero'),
    challenge: {
      task: 'Add a third button to the hero.',
      check: (s) => doc(s).querySelectorAll('.hero .actions a.btn').length >= 3,
      hint: 'Copy a line like <a class="btn ghost" href="#studio">Visit the studio</a> and change its words.',
    },
  },
  {
    id: 'pictures',
    chapter: 'The page (HTML)',
    title: 'Pictures',
    body: [
      'Picture frames hold painted art — `<div class="art art-10"></div>`, numbers 1 to 12, drawn only with CSS in your colors — or your own photo: `<img src="images/me.jpg" alt="Me">`.',
      'In the studio, **Carve → Use my photo** adds the file for you. In a code editor, put the photo in `images/` and write the `<img>` line.',
    ],
    region: sectionRegion('hero', 'html — the hero'),
    challenge: {
      task: 'Swap the hero art for art-5 (and turn the 3D off on <body> if you want to see it).',
      check: (s) => !!doc(s).querySelector('.hero-media .art-5'),
      hint: 'Change art-10 to art-5.',
    },
  },
  {
    id: 'cards',
    chapter: 'The page (HTML)',
    title: 'Cards',
    body: [
      'A card is an `<article class="card">` with a picture (`.card-media`) and words (`.card-body`). **To add a card, copy a whole `<article>…</article>` block** and change the words.',
      'Add `<p class="price">₹499</p>` inside `.card-body` and a price appears beside the title.',
    ],
    region: sectionRegion('cards', 'html — the cards'),
    challenge: { task: 'Add a fifth card.', check: (s) => doc(s).querySelectorAll('.cards .card').length >= 5, hint: 'Copy from <article class="card"> down to </article>, paste it before </div>.' },
  },
  {
    id: 'faq',
    chapter: 'The page (HTML)',
    title: 'Questions that open',
    body: [
      '`<details>` and `<summary>` are built into every browser: click the summary and the answer opens. **No JavaScript needed.** Add `open` — `<details open>` — to start it opened.',
    ],
    region: sectionRegion('faq', 'html — the questions'),
    challenge: {
      task: 'Add a fifth question.',
      check: (s) => doc(s).querySelectorAll('.faq details').length >= 5,
      hint: '<details><summary>Do you gift wrap?</summary><p>Yes, for free.</p></details>',
    },
  },
  {
    id: 'menu',
    chapter: 'The page (HTML)',
    title: 'The menu',
    body: ['Each menu link points at a section id: `<a href="#care">` jumps to `<section id="care">`. Add, remove or reorder the lines to change the menu.'],
    region: navRegion,
    challenge: {
      task: 'Add a “Home” link that jumps back to the top.',
      check: (s) => !!doc(s).querySelector('.menu a[href="#top"]'),
      hint: 'Inside <nav class="menu">, add <a href="#top">Home</a> — the hero has id="top".',
    },
  },

  // ---------------------------------------------------------------- css
  {
    id: 'rules',
    chapter: 'Your own CSS',
    title: 'Write a rule',
    body: [
      'A CSS rule is a selector and some declarations: `.btn { text-transform: uppercase; }` makes every button uppercase.',
      'Your rules go in their own `<style id="mine">` block after the engine, so they win. Use tokens inside them: `var(--accent)`.',
    ],
    region: extraCss,
    starter: `/* your rules */
.btn {
  letter-spacing: 0.02em;
}`,
    challenge: {
      task: 'Make every button uppercase.',
      check: (s) => /\.btn[^{]*\{[^}]*text-transform\s*:\s*uppercase/.test(s),
      hint: 'Add  text-transform: uppercase;  inside the .btn rule.',
    },
    unlocks: { label: 'anything you can write', factor: 'infinite' },
  },
  {
    id: 'own-form',
    chapter: 'Your own CSS',
    title: 'Invent a layout',
    body: [
      'Forms are just CSS aimed at a `data-form` word. Invent your own word, then style it: `[data-form="mine"] .hero { … }`.',
      'Then set `data-form="mine"` on `<body>` (in the studio’s code). The starter below already does both halves of the hero for you — make it yours.',
    ],
    region: extraCss,
    starter: `[data-form="split"] .hero {
  grid-template-columns: 1fr 1fr;
  text-align: right;
}
[data-form="split"] .hero-copy {
  justify-items: end;
  order: 1;
}`,
    challenge: {
      task: 'Move the words to the right of the picture.',
      check: (s) => /\.hero-copy[^{]*\{[^}]*order\s*:\s*2/.test(s),
      hint: 'Change order: 1 to order: 2 — the words then come after the picture.',
    },
  },

  // ---------------------------------------------------------------- beyond
  {
    id: 'editors',
    chapter: 'Beyond Kiln',
    title: 'VS Code, Antigravity, Cursor',
    body: [
      'Kiln’s editor is the easiest place to see changes live, but the code is yours. In the studio, **Open in your editor** links a real folder that stays in sync both ways — save in VS Code and Kiln updates; change in Kiln and the files update.',
      'The folder is split into small files — `index.html`, `css/tokens.css`, `css/engine.css`, `js/` — plus `AGENTS.md`, a one-page map for AI coding agents. Agents in Antigravity or Cursor read the map instead of the whole engine, so changes cost far fewer tokens.',
    ],
  },
  {
    id: 'publish',
    chapter: 'Beyond Kiln',
    title: 'Put it online',
    body: [
      'Press **Fire** in the studio and download your site. Every option is plain files — no server, no subscription.',
      '**Netlify Drop:** drag the unzipped folder onto app.netlify.com/drop. **GitHub Pages:** upload the files to a repository, then Settings → Pages. **Cloudflare Pages:** upload the folder.',
      'Or just send the single-file version to a friend. It opens anywhere.',
    ],
  },
];

export const CHAPTERS = [...new Set(LESSONS.map((l) => l.chapter))];

export function designsUnlocked(done: string[]): { value: number; infinite: boolean } {
  let value = 1;
  let infinite = false;
  for (const l of LESSONS) {
    if (!done.includes(l.id) || !l.unlocks) continue;
    if (l.unlocks.factor === 'infinite') infinite = true;
    else value *= l.unlocks.factor;
  }
  return { value, infinite };
}
