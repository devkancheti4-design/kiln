// Multi-page sites. A site is a list of pages; the first is always the home page ("index").
// Every page is a complete, self-contained HTML file — you can double-click any of them — and
// they all share one design: Kiln mirrors the tokens, engine, switches and scripts between them.
import type { Content, Section } from './content';
import { applyContent, syncShared } from './patch';
import { HOME, type SiteInfo } from './render';
import { slugify } from './exporter';

export interface PageDoc {
  slug: string; // file name without .html; "index" is the home page
  nav: string; // menu label; blank = not in the menu
  source: string;
  content: Content;
}

export const siteInfo = (pages: PageDoc[], current: string): SiteInfo => ({
  pages: pages.map((p) => ({ slug: p.slug, nav: p.nav || undefined })),
  current,
  homeMenu: pages[0].content.sections.filter((s) => !s.hidden && s.nav).map((s) => ({ id: s.id, nav: s.nav! })),
});

/** The words that are the same on every page: the name, the logo, the top-bar button, the footer. */
export const SITE_FIELDS = ['brand', 'mark', 'navCta', 'socials', 'footer'] as const;

export function sameSiteFields(a: Content, b: Content): boolean {
  return SITE_FIELDS.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

export function copySiteFields(from: Content, to: Content): Content {
  const out = { ...to };
  for (const k of SITE_FIELDS) (out as Record<string, unknown>)[k] = structuredClone(from[k]);
  return out;
}

/** Re-renders every page whose markup is untouched, so shared words and the menu stay in step. */
export function rerenderPages(pages: PageDoc[], isLocked: (p: PageDoc) => boolean): PageDoc[] {
  return pages.map((p) => {
    if (isLocked(p)) return p;
    const src = applyContent(p.source, p.content, siteInfo(pages, p.slug));
    return src === p.source ? p : { ...p, source: src };
  });
}

/** Copies the shared design from one page into all the others. */
export function syncPages(pages: PageDoc[], fromSlug: string): PageDoc[] {
  const from = pages.find((p) => p.slug === fromSlug);
  if (!from) return pages;
  return pages.map((p) => {
    if (p.slug === fromSlug) return p;
    const src = syncShared(from.source, p.source);
    return src === p.source ? p : { ...p, source: src };
  });
}

export function uniqueSlug(title: string, taken: string[]): string {
  let base = slugify(title) || 'page';
  if (base === HOME) base = 'home';
  let slug = base;
  let n = 2;
  while (taken.includes(slug)) slug = `${base}-${n++}`;
  return slug;
}

// ------------------------------------------------------------------ starters for new pages

export type PageKind = 'about' | 'services' | 'gallery' | 'contact' | 'faq' | 'blank';

export const PAGE_KINDS: { id: PageKind; name: string; note: string }[] = [
  { id: 'about', name: 'About', note: 'A story, a few points and a quote' },
  { id: 'services', name: 'Services / Menu', note: 'Cards with prices' },
  { id: 'gallery', name: 'Gallery', note: 'A wall of pictures' },
  { id: 'faq', name: 'Questions', note: 'Answers that open when clicked' },
  { id: 'contact', name: 'Contact', note: 'How to reach you' },
  { id: 'blank', name: 'Blank', note: 'Just a title — add your own sections' },
];

const m = (art: number) => ({ art });

export function pageStarter(kind: PageKind, base: Content, title: string): Content {
  const name = base.brand;
  const t = title.trim() || PAGE_KINDS.find((k) => k.id === kind)!.name;
  const sections: Record<PageKind, Section[]> = {
    about: [
      { id: 'story', type: 'about', eyebrow: 'Our story', title: 'How it *started*', text: `${name} began with one idea and a lot of patience. Write your own story here — where you started, what you care about, and where you are going.`, points: ['What we believe', 'What we are good at', 'Who we work with', 'Why it matters'], media: m(8) },
      { id: 'milestones', type: 'list', eyebrow: 'Milestones', title: 'Along the *way*', items: [{ meta: '2020', title: 'The beginning', text: 'A small start, a big plan.', aside: 'Year one' }, { meta: '2023', title: 'Growing up', text: 'New people, new places.', aside: 'Year four' }, { meta: '2026', title: 'Today', text: 'Still learning every day.', aside: 'Now' }] },
      { id: 'kind-words', type: 'quote', text: 'Something kind somebody said about you belongs here.', name: 'A happy customer', role: 'Who they are' },
    ],
    services: [
      { id: 'services', type: 'cards', eyebrow: 'What we offer', title: 'Our *services*', intro: 'Pick what you need. Not sure? Just ask.', showMedia: false, items: [{ title: 'The essential', text: 'Everything you need to get going.', price: '₹999', media: m(1) }, { title: 'The full works', text: 'Our most popular choice.', price: '₹2,499', media: m(2) }, { title: 'Something custom', text: 'Tell us what you have in mind.', price: 'Ask us', media: m(3) }] },
      { id: 'faq', type: 'faq', eyebrow: 'Questions', title: 'Good to *know*', items: [{ q: 'How long does it take?', a: 'Usually a week or two, depending on the work.' }, { q: 'Can I change my mind?', a: 'Of course. Just tell us before we start.' }] },
    ],
    gallery: [{ id: 'gallery', type: 'gallery', eyebrow: 'Gallery', title: 'A few *favourites*', items: [1, 5, 7, 11, 2, 9].map((a, i) => ({ caption: `Picture ${i + 1}`, media: m(a) })) }],
    faq: [{ id: 'faq', type: 'faq', eyebrow: 'Questions', title: 'Asked *often*', items: [{ q: 'A question people ask?', a: 'A short, friendly answer.' }, { q: 'Another one?', a: 'Another answer.' }, { q: 'And one more?', a: 'You get the idea — copy a <details> block to add more.' }] }],
    contact: [{ id: 'contact', type: 'contact', eyebrow: 'Contact', title: 'Say *hello*', text: 'Email is quickest. We reply within a day.', email: base.sections.find((s): s is Extract<Section, { type: 'contact' }> => s.type === 'contact')?.email ?? 'you@example.com', cta: 'Email us' }],
    blank: [],
  };
  const heads: Record<PageKind, { eyebrow: string; headline: string; lede: string; art: number }> = {
    about: { eyebrow: name, headline: `About *${name}*`, lede: 'A few honest lines about who you are and what you do.', art: 8 },
    services: { eyebrow: name, headline: 'What we *do*', lede: 'Clear options, clear prices, no surprises.', art: 6 },
    gallery: { eyebrow: name, headline: 'In *pictures*', lede: 'Click any picture to see it larger.', art: 7 },
    faq: { eyebrow: name, headline: 'Questions, *answered*', lede: 'If yours is not here, just ask.', art: 12 },
    contact: { eyebrow: name, headline: 'Get in *touch*', lede: 'We would love to hear from you.', art: 2 },
    blank: { eyebrow: name, headline: `*${t}*`, lede: 'Write something here.', art: 4 },
  };
  const h = heads[kind];
  return {
    ...copySiteFields(base, base),
    kind: base.kind,
    eyebrow: h.eyebrow,
    headline: h.headline,
    lede: h.lede,
    primary: { label: 'Back to home', href: `${HOME}.html` },
    secondary: null,
    heroMedia: m(h.art),
    sections: sections[kind],
  };
}
