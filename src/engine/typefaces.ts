// Every font here ships inside Kiln (see scripts/fonts.mjs), so sites look the same offline.
// A "pairing" is a heading voice + a reading voice.

export interface Face {
  id: string;
  family: string;
  fallback: string;
  italic: boolean;
  weights: [number, number];
  kind: 'serif' | 'sans' | 'mono';
}

export const FACES: Face[] = [
  { id: 'fraunces', family: 'Fraunces', fallback: 'Georgia, serif', italic: true, weights: [100, 900], kind: 'serif' },
  { id: 'inter', family: 'Inter', fallback: 'system-ui, sans-serif', italic: false, weights: [100, 900], kind: 'sans' },
  { id: 'space-grotesk', family: 'Space Grotesk', fallback: 'system-ui, sans-serif', italic: false, weights: [300, 700], kind: 'sans' },
  { id: 'instrument-serif', family: 'Instrument Serif', fallback: 'Georgia, serif', italic: true, weights: [400, 400], kind: 'serif' },
  { id: 'playfair-display', family: 'Playfair Display', fallback: 'Georgia, serif', italic: true, weights: [400, 900], kind: 'serif' },
  { id: 'source-sans-3', family: 'Source Sans 3', fallback: 'system-ui, sans-serif', italic: false, weights: [200, 900], kind: 'sans' },
  { id: 'dm-serif-display', family: 'DM Serif Display', fallback: 'Georgia, serif', italic: true, weights: [400, 400], kind: 'serif' },
  { id: 'dm-sans', family: 'DM Sans', fallback: 'system-ui, sans-serif', italic: false, weights: [100, 1000], kind: 'sans' },
  { id: 'syne', family: 'Syne', fallback: 'system-ui, sans-serif', italic: false, weights: [400, 800], kind: 'sans' },
  { id: 'manrope', family: 'Manrope', fallback: 'system-ui, sans-serif', italic: false, weights: [200, 800], kind: 'sans' },
  { id: 'unbounded', family: 'Unbounded', fallback: 'system-ui, sans-serif', italic: false, weights: [200, 900], kind: 'sans' },
  { id: 'bricolage-grotesque', family: 'Bricolage Grotesque', fallback: 'system-ui, sans-serif', italic: false, weights: [200, 800], kind: 'sans' },
  { id: 'jetbrains-mono', family: 'JetBrains Mono', fallback: 'ui-monospace, monospace', italic: false, weights: [100, 800], kind: 'mono' },
  { id: 'outfit', family: 'Outfit', fallback: 'system-ui, sans-serif', italic: false, weights: [100, 900], kind: 'sans' },
  { id: 'cormorant-garamond', family: 'Cormorant Garamond', fallback: 'Georgia, serif', italic: true, weights: [300, 700], kind: 'serif' },
  { id: 'karla', family: 'Karla', fallback: 'system-ui, sans-serif', italic: false, weights: [200, 800], kind: 'sans' },
  { id: 'archivo', family: 'Archivo', fallback: 'system-ui, sans-serif', italic: false, weights: [100, 900], kind: 'sans' },
];

export const faceById = (id: string) => FACES.find((f) => f.id === id)!;

export function stackOf(id: string): string {
  const f = faceById(id);
  return `"${f.family}", ${f.fallback}`;
}

export interface Pairing {
  id: string;
  name: string;
  display: string;
  body: string;
  weight: number;
  tracking: string;
  note: string;
}

export const PAIRINGS: Pairing[] = [
  { id: 'clay', name: 'Clay', display: 'fraunces', body: 'inter', weight: 560, tracking: '-0.02em', note: 'warm, soft serif' },
  { id: 'studio', name: 'Studio', display: 'space-grotesk', body: 'inter', weight: 600, tracking: '-0.035em', note: 'crisp and technical' },
  { id: 'gallery', name: 'Gallery', display: 'instrument-serif', body: 'inter', weight: 400, tracking: '-0.01em', note: 'quiet and elegant' },
  { id: 'classic', name: 'Classic', display: 'playfair-display', body: 'source-sans-3', weight: 600, tracking: '-0.015em', note: 'timeless contrast' },
  { id: 'magazine', name: 'Magazine', display: 'dm-serif-display', body: 'dm-sans', weight: 400, tracking: '-0.01em', note: 'editorial headlines' },
  { id: 'avant', name: 'Avant', display: 'syne', body: 'manrope', weight: 700, tracking: '-0.02em', note: 'artsy and wide' },
  { id: 'loud', name: 'Loud', display: 'unbounded', body: 'manrope', weight: 600, tracking: '-0.03em', note: 'round and bold' },
  { id: 'quirk', name: 'Quirk', display: 'bricolage-grotesque', body: 'bricolage-grotesque', weight: 700, tracking: '-0.03em', note: 'friendly character' },
  { id: 'terminal', name: 'Terminal', display: 'jetbrains-mono', body: 'jetbrains-mono', weight: 700, tracking: '-0.04em', note: 'code everywhere' },
  { id: 'friendly', name: 'Friendly', display: 'outfit', body: 'outfit', weight: 600, tracking: '-0.02em', note: 'geometric and clean' },
  { id: 'luxe', name: 'Luxe', display: 'cormorant-garamond', body: 'karla', weight: 500, tracking: '-0.01em', note: 'fashion-house serif' },
  { id: 'poster', name: 'Poster', display: 'archivo', body: 'archivo', weight: 800, tracking: '-0.035em', note: 'heavy and direct' },
];

/** Which bundled faces does a piece of CSS mention by family name? */
export function facesUsedIn(css: string): Face[] {
  return FACES.filter((f) => css.includes(`"${f.family}"`) || css.includes(`'${f.family}'`));
}
