// The words and pictures of a site, kept apart from its design so the same content
// can be thrown on any form, in any glaze. Carve (the personalise panel) edits this.

export interface Link {
  label: string;
  href: string;
}

/** A picture slot: generated art (1..12, recolors with the palette) unless an image or video is set. */
export interface Media {
  art: number;
  image?: string; // asset path inside the site, e.g. "images/hero.jpg"
  video?: string; // asset path, e.g. "images/loop.mp4" — plays muted, on a loop
  alt?: string;
}

export interface CardItem {
  title: string;
  text: string;
  meta?: string;
  price?: string;
  href?: string; // the whole card becomes a link (to a page, a section or a web address)
  media: Media;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface RowItem {
  meta: string;
  title: string;
  text?: string;
  aside?: string;
}

export interface Shot {
  caption: string;
  media: Media;
}

interface SectionBase {
  id: string;
  nav?: string;
  hidden?: boolean;
}

export type StatsSection = SectionBase & { type: 'stats'; items: StatItem[] };
export type CardsSection = SectionBase & { type: 'cards'; eyebrow: string; title: string; intro?: string; showMedia: boolean; people?: boolean; items: CardItem[] };
export type AboutSection = SectionBase & { type: 'about'; eyebrow: string; title: string; text: string; points: string[]; media: Media };
export type ListSection = SectionBase & { type: 'list'; eyebrow: string; title: string; intro?: string; items: RowItem[] };
export type QuoteSection = SectionBase & { type: 'quote'; text: string; name: string; role: string };
export type GallerySection = SectionBase & { type: 'gallery'; eyebrow: string; title: string; items: Shot[] };
export type ContactSection = SectionBase & {
  type: 'contact';
  eyebrow: string;
  title: string;
  text: string;
  email: string;
  phone?: string;
  address?: string;
  cta: string;
};

export type FaqSection = SectionBase & { type: 'faq'; eyebrow: string; title: string; items: { q: string; a: string }[] };
/** A long read: paragraphs, ## headings, - bullets, > quotes, ![pictures](images/x.jpg) */
export type ProseSection = SectionBase & { type: 'prose'; eyebrow: string; title: string; body: string };
export type FormField = 'name' | 'email' | 'phone' | 'message';
/** A form. Without an endpoint it opens the visitor's email app; with one (Formspree, Netlify…) it sends for real. */
export type FormSection = SectionBase & { type: 'form'; eyebrow: string; title: string; text: string; fields: FormField[]; button: string; action: string; email: string };
export type EmbedSection = SectionBase & { type: 'embed'; eyebrow: string; title: string; url: string; caption: string };
export type TableSection = SectionBase & { type: 'table'; eyebrow: string; title: string; intro?: string; columns: string[]; rows: string[][] };
export type LogosSection = SectionBase & { type: 'logos'; eyebrow: string; items: { name: string; media?: Media }[] };
export type SliderSection = SectionBase & { type: 'slider'; eyebrow: string; title: string; items: Shot[] };
export type CtaSection = SectionBase & { type: 'cta'; eyebrow: string; title: string; text: string; button: Link };
export type CountdownSection = SectionBase & { type: 'countdown'; eyebrow: string; title: string; date: string; text: string };

export type Section =
  | StatsSection
  | CardsSection
  | AboutSection
  | ListSection
  | QuoteSection
  | GallerySection
  | FaqSection
  | ProseSection
  | FormSection
  | EmbedSection
  | TableSection
  | LogosSection
  | SliderSection
  | CtaSection
  | CountdownSection
  | ContactSection;
export type SectionType = Section['type'];

export interface Content {
  kind: string;
  brand: string;
  mark: string;
  eyebrow: string;
  headline: string;
  lede: string;
  primary: Link;
  secondary: Link | null;
  navCta: Link;
  heroMedia: Media;
  sections: Section[];
  socials: Link[];
  footer: string;
  /** a thin strip above the top bar: "Open Sundays from May", "New album out now" */
  banner?: { text: string; href?: string } | null;
}

export const SECTION_LABELS: Record<SectionType, string> = {
  stats: 'Numbers',
  cards: 'Cards',
  about: 'About',
  list: 'List',
  quote: 'Quote',
  gallery: 'Gallery',
  faq: 'Questions',
  prose: 'Article',
  form: 'Form',
  embed: 'Video / map',
  table: 'Table',
  logos: 'Logos',
  slider: 'Slider',
  cta: 'Call to action',
  countdown: 'Countdown',
  contact: 'Contact',
};

export function initialsOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}&\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'K';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const amp = words.indexOf('&');
  if (amp > 0 && amp < words.length - 1) return `${words[0][0]}&${words[amp + 1][0]}`.toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function cloneContent(c: Content): Content {
  return structuredClone(c);
}
