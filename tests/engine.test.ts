import { describe, expect, it } from 'vitest';
import { accentText, contrast, mixOklab, onAccent } from '../src/engine/color';
import { AXES, AXIS_SIZE, TOTAL, browse, genomeAt, indexOf, permute, spaceSize } from '../src/engine/genome';
import { KINDS } from '../src/engine/kinds';
import { PALETTES } from '../src/engine/palettes';
import {
  applyContent,
  applyGenome,
  getMarkup,
  getSwitch,
  getToken,
  identify,
  readTokens,
  setSwitch,
  setToken,
  syncFonts,
} from '../src/engine/patch';
import { renderDocument, renderMarkup } from '../src/engine/render';

describe('enumeration', () => {
  it('has more than ten thousand designs', () => {
    expect(TOTAL).toBe(AXES.reduce((n, a) => n * AXIS_SIZE[a], 1));
    expect(TOTAL).toBeGreaterThan(10_000);
    expect(TOTAL).toBe(487_710_720);
  });

  it('index <-> genome is a bijection', () => {
    for (const i of [0, 1, 2, 999, 123_456, TOTAL - 1]) expect(indexOf(genomeAt(i))).toBe(i);
  });

  it('browse order visits every design exactly once', () => {
    for (const size of [1, 2, 3, 7, 48, 97, 1000]) {
      const seen = new Set<number>();
      for (let i = 0; i < size; i++) seen.add(permute(i, size, 42));
      expect(seen.size).toBe(size);
      expect(Math.max(...seen)).toBe(size - 1);
    }
  });

  it('filters fix axes', () => {
    const filters = { kind: 3, mode: 1 };
    expect(spaceSize(filters)).toBe(TOTAL / (AXIS_SIZE.kind * AXIS_SIZE.mode));
    for (let i = 0; i < 50; i++) {
      const g = browse(i, filters, 7);
      expect(g.kind).toBe(3);
      expect(g.mode).toBe(1);
    }
  });
});

describe('palettes', () => {
  for (const p of PALETTES) {
    for (const [mode, sw] of [['light', p.light], ['dark', p.dark]] as const) {
      it(`${p.name} ${mode} is readable`, () => {
        expect(contrast(sw.ink, sw.bg)).toBeGreaterThanOrEqual(10);
        // muted text (engine mixes 68% ink into bg)
        expect(contrast(mixOklab(sw.ink, sw.bg, 0.68), sw.bg)).toBeGreaterThanOrEqual(4.5);
        // accent used as text (eyebrows, emphasis)
        expect(contrast(accentText(sw.accent, sw.ink), sw.bg)).toBeGreaterThanOrEqual(4.5);
        // button label on the accent
        expect(contrast(onAccent(sw.accent), sw.accent)).toBeGreaterThanOrEqual(4.5);
        // the accent button stands out from the page
        expect(contrast(sw.accent, sw.bg)).toBeGreaterThanOrEqual(1.9);
      });
    }
  }
});

describe('source patches', () => {
  const g = genomeAt(4_812_038);
  const content = structuredClone(KINDS[g.kind].content);
  const src = renderDocument(g, content);

  it('a rendered design identifies as itself', () => {
    expect(identify(src, content)).toEqual(g);
  });

  it('finds the real <body> even though comments and CSS mention it', () => {
    for (const n of [0, 329_208_973, 487_710_719, 12_345_678]) {
      const gg = genomeAt(n);
      const cc = structuredClone(KINDS[gg.kind].content);
      const doc = renderDocument(gg, cc);
      expect(getSwitch(doc, 'form')).not.toBeNull();
      expect(identify(doc, cc)).toEqual(gg);
    }
  });

  it('every kind renders and identifies', () => {
    KINDS.forEach((k, kind) => {
      const gg = { ...genomeAt(kind * 1000 + 17), kind };
      const doc = renderDocument(gg, k.content);
      expect(identify(doc, k.content)).toEqual(gg);
      expect(doc).toContain(`<body class="site"`);
    });
  });

  it('reads and writes tokens in place', () => {
    const out = setToken(src, '--radius', '999px');
    expect(getToken(out, '--radius')).toBe('999px');
    expect(identify(out, content)).not.toBeNull(); // pill is a catalog shape
    const odd = setToken(src, '--radius', '13px');
    expect(identify(odd, content)).toBeNull(); // an original
    // comment column stays aligned
    const line = odd.split('\n').find((l) => l.includes('--radius:'))!;
    const before = src.split('\n').find((l) => l.includes('--radius:'))!;
    expect(line.indexOf('/*')).toBe(before.indexOf('/*'));
  });

  it('adds a missing token', () => {
    const out = setToken(src, '--made-up', '4');
    expect(getToken(out, '--made-up')).toBe('4');
    expect(readTokens(out)['--bg']).toBe(readTokens(src)['--bg']);
  });

  it('switches live on <body>', () => {
    const out = setSwitch(src, 'form', 'poster');
    expect(getSwitch(out, 'form')).toBe('poster');
    expect(getMarkup(out)).toBe(getMarkup(src));
  });

  it('applies a genome without touching the words', () => {
    const custom = applyContent(src, { ...content, brand: 'Mira Das' });
    const other = genomeAt(99);
    const out = applyGenome(custom, other, ['form', 'palette', 'mode', 'type', 'shape', 'density', 'texture', 'motion', 'scene', 'interact']);
    expect(out).toContain('Mira Das');
    expect(identify(out, content)).toEqual({ ...other, kind: g.kind });
  });

  it('keeps the fonts block in sync', () => {
    const out = syncFonts(setToken(src, '--font-display', '"Unbounded", system-ui, sans-serif'));
    expect(out).toContain('fonts/unbounded.woff2');
  });

  it('markup region round-trips', () => {
    expect(getMarkup(src)).toBe(renderMarkup(content));
  });
});

import { agentsGuide, joinSite, splitSite } from '../src/engine/split';
import { syncFonts as sync2 } from '../src/engine/patch';

describe('split project for editors and agents', () => {
  it('round-trips through split files', () => {
    for (const n of [7, 329_208_973, 400_000_000]) {
      const g = genomeAt(n);
      const c = structuredClone(KINDS[g.kind].content);
      const src = sync2(renderDocument(g, c));
      const files = splitSite(src, c);
      expect(Object.keys(files)).toEqual(expect.arrayContaining(['index.html', 'css/tokens.css', 'css/engine.css', 'js/scene.js', 'AGENTS.md']));
      expect(files['index.html'].length).toBeLessThan(src.length / 3);
      const back = joinSite(files);
      expect(identify(back, c)).toEqual(g);
      expect(getMarkup(back)).toBe(getMarkup(src));
      expect(readTokens(back)).toEqual(readTokens(src));
      expect(joinSite(splitSite(back, c))).toBe(back);
    }
  });

  it('writes a short map for AI agents', () => {
    const g = genomeAt(99);
    const c = KINDS[g.kind].content;
    const md = agentsGuide(renderDocument(g, c), c);
    expect(md).toContain('css/tokens.css');
    expect(md).toContain('data-form=');
    expect(md.length).toBeLessThan(6000);
  });
});

import { pageStarter, rerenderPages, siteInfo, syncPages, uniqueSlug, type PageDoc } from '../src/engine/pages';
import { getSwitch as gsw, setToken as stok, setSwitch as ssw } from '../src/engine/patch';
import { HOME } from '../src/engine/render';
import { joinProject, splitProject } from '../src/engine/split';

describe('multi-page sites', () => {
  const g = genomeAt(329_208_973);
  const c = structuredClone(KINDS[g.kind].content);
  const homeSrc = renderDocument(g, c);
  const pages0: PageDoc[] = [{ slug: HOME, nav: '', source: homeSrc, content: c }];
  const about = pageStarter('about', c, 'About');
  const pages = rerenderPages([...pages0, { slug: 'about', nav: 'About', source: homeSrc, content: about }], () => false);

  it('a single page renders exactly as before', () => {
    expect(renderMarkup(c, siteInfo(pages0, HOME))).toBe(renderMarkup(c));
  });

  it('the menu links pages together and inner pages point home', () => {
    const home = pages[0].source;
    const inner = pages[1].source;
    expect(home).toContain('<a href="about.html">About</a>');
    expect(inner).toContain('<a href="about.html" aria-current="page">About</a>');
    expect(inner).toContain('<a href="index.html#shop">Shop</a>'); // the home page's menu, repeated
    expect(inner).toContain('class="brand" href="index.html"');
    expect(inner).toContain('<main id="main" class="subpage" data-page="about">');
    expect(inner).toContain('href="index.html#shop"'); // the shared top-bar button points home
    expect(identify(home, c)).toEqual(g); // the home page is still a catalog design
  });

  it('design changes on one page reach every page', () => {
    const changed = pages.map((p) => (p.slug === 'about' ? { ...p, source: ssw(stok(p.source, '--accent', '#123456'), 'form', 'poster') } : p));
    const synced = syncPages(changed, 'about');
    expect(getToken(synced[0].source, '--accent')).toBe('#123456');
    expect(gsw(synced[0].source, 'form')).toBe('poster');
    expect(getMarkup(synced[0].source)).toBe(getMarkup(pages[0].source)); // words untouched
  });

  it('round-trips through a split project', () => {
    const files = splitProject(pages.map((p) => ({ slug: p.slug, source: p.source, content: p.content })));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['index.html', 'about.html', 'css/tokens.css', 'AGENTS.md']));
    expect(files['AGENTS.md']).toContain('about.html');
    const back = joinProject(files);
    expect(back.map((p) => p.slug)).toEqual(['index', 'about']);
    expect(back[0].source).toBe(pages[0].source);
    expect(back[1].source).toBe(pages[1].source);
  });

  it('makes unique file names', () => {
    expect(uniqueSlug('About', ['index'])).toBe('about');
    expect(uniqueSlug('About', ['index', 'about'])).toBe('about-2');
    expect(uniqueSlug('Index', ['index'])).toBe('home');
  });
});

import { embedSrc, renderProse } from '../src/engine/render';

describe('building blocks', () => {
  it('turns normal links into embeddable ones', () => {
    expect(embedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedSrc('https://youtu.be/dQw4w9WgXcQ?t=4')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedSrc('https://vimeo.com/123456')).toBe('https://player.vimeo.com/video/123456');
    expect(embedSrc('https://open.spotify.com/album/abc123')).toBe('https://open.spotify.com/embed/album/abc123');
    expect(embedSrc('https://www.google.com/maps/place/Auroville/@12,79,15z')).toBe('https://maps.google.com/maps?q=Auroville&output=embed');
    expect(embedSrc('Banjara Hills Hyderabad')).toContain('output=embed');
    expect(embedSrc('javascript:alert(1)')).toBe('#');
  });

  it('renders article text safely', () => {
    const html = renderProse('Hello **world** & <b>x</b>\n\n## Heading\n\n- one\n- two\n\n> said\n\n![A cat](images/cat.jpg)\n\n[site](https://a.b) [bad](javascript:x)', '');
    expect(html).toContain('<p>Hello <strong>world</strong> &amp; &lt;b&gt;x&lt;/b&gt;</p>');
    expect(html).toContain('<h3>Heading</h3>');
    expect(html).toContain('<ul>\n  <li>one</li>\n  <li>two</li>\n</ul>');
    expect(html).toContain('<blockquote><p>said</p></blockquote>');
    expect(html).toContain('<figure><img src="images/cat.jpg" alt="A cat" loading="lazy"></figure>');
    expect(html).toContain('<a href="https://a.b">site</a>');
    expect(html).toContain('<a href="#">bad</a>');
  });

  it('renders every new section type and multi-page pieces stay consistent', () => {
    const g = genomeAt(1234);
    const c = structuredClone(KINDS[g.kind].content);
    c.banner = { text: 'Open *now*', href: '#contact' };
    c.sections.unshift(
      { id: 'story', type: 'prose', eyebrow: 'Story', title: 'Read', body: 'Para one.\n\nPara two.' },
      { id: 'write', type: 'form', eyebrow: 'Write', title: 'Say hi', text: '', fields: ['name', 'email', 'message'], button: 'Send', action: '', email: 'a@b.c' },
      { id: 'film', type: 'embed', eyebrow: '', title: 'Film', url: 'https://youtu.be/abc12345', caption: 'cap' },
      { id: 'specs', type: 'table', eyebrow: '', title: 'Specs', columns: ['A', 'B'], rows: [['1', '2']] },
      { id: 'press', type: 'logos', eyebrow: 'Seen in', items: [{ name: 'Vogue' }] },
      { id: 'slides', type: 'slider', eyebrow: '', title: 'Slides', items: [{ caption: 'x', media: { art: 1 } }] },
      { id: 'go', type: 'cta', eyebrow: '', title: 'Go', text: '', button: { label: 'Now', href: '#top' } },
      { id: 'when', type: 'countdown', eyebrow: '', title: 'Soon', date: '2030-01-01T10:00', text: '' },
    );
    c.sections[8] = { ...(c.sections[8] as Extract<typeof c.sections[number], { type: 'cards' }>) };
    const doc = renderDocument(g, c);
    for (const needle of ['class="banner"', 'class="prose"', '<form class="form"', 'data-mail="a@b.c"', 'youtube-nocookie.com/embed/abc12345', '<table>', 'class="logos"', 'class="slides"', 'class="cta"', 'data-countdown="2030-01-01T10:00"', 'class="menu-btn"', 'og:title']) {
      expect(doc).toContain(needle);
    }
    expect(getMarkup(doc)).toBe(renderMarkup(c));
    expect(identify(doc, c)).toEqual(g);
  });
});
