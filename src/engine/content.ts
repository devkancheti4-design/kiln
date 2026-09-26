// The words and pictures of a site, kept apart from its design so the same content
// can be thrown on any form, in any glaze. Carve (the personalise panel) edits this.

export interface Link {
  label: string;
  href: string;
}

/** A picture slot: generated art (1..12, recolors with the palette) unless an image is set. */
export interface Media {
  art: number;
  image?: string; // asset path inside the site, e.g. "images/hero.jpg"
  alt?: string;
}

export interface CardItem {
  title: string;
  text: string;
  meta?: string;
  price?: string;
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
export type CardsSection = SectionBase & { type: 'cards'; eyebrow: string; title: string; intro?: string; showMedia: boolean; items: CardItem[] };
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

export type Section = StatsSection | CardsSection | AboutSection | ListSection | QuoteSection | GallerySection | FaqSection | ContactSection;
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
}

export const SECTION_LABELS: Record<SectionType, string> = {
  stats: 'Numbers',
  cards: 'Cards',
  about: 'About',
  list: 'List',
  quote: 'Quote',
  gallery: 'Gallery',
  faq: 'Questions',
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
