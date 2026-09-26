// The enumeration space. Every Kiln design is one combination of these axes, so every design
// has a number (No. 1 … No. 487,710,720) and the same number always rebuilds the same site.
import { DENSITIES, FORMS, INTERACTIONS, MOTIONS, SCENES, SHAPES, TEXTURES } from './axes';
import { KINDS } from './kinds';
import { PALETTES } from './palettes';
import { PAIRINGS } from './typefaces';

export const AXES = ['kind', 'form', 'palette', 'mode', 'type', 'shape', 'density', 'texture', 'motion', 'scene', 'interact'] as const;
export type Axis = (typeof AXES)[number];
export type Genome = Record<Axis, number>;
export type Filters = Partial<Record<Axis, number>>;

export const AXIS_SIZE: Record<Axis, number> = {
  kind: KINDS.length,
  form: FORMS.length,
  palette: PALETTES.length,
  mode: 2,
  type: PAIRINGS.length,
  shape: SHAPES.length,
  density: DENSITIES.length,
  texture: TEXTURES.length,
  motion: MOTIONS.length,
  scene: SCENES.length,
  interact: INTERACTIONS.length,
};

export const AXIS_LABEL: Record<Axis, string> = {
  kind: 'Kind',
  form: 'Form',
  palette: 'Glaze',
  mode: 'Light / dark',
  type: 'Type',
  shape: 'Corners',
  density: 'Spacing',
  texture: 'Texture',
  motion: 'Motion',
  scene: '3D scene',
  interact: 'Interaction',
};

export const TOTAL = AXES.reduce((n, a) => n * AXIS_SIZE[a], 1);

/** Mixed-radix: index 0..TOTAL-1  <->  genome. The last axis changes fastest. */
export function genomeAt(index: number): Genome {
  let rest = ((index % TOTAL) + TOTAL) % TOTAL;
  const g = {} as Genome;
  for (let i = AXES.length - 1; i >= 0; i--) {
    const axis = AXES[i];
    g[axis] = rest % AXIS_SIZE[axis];
    rest = Math.floor(rest / AXIS_SIZE[axis]);
  }
  return g;
}

export function indexOf(g: Genome): number {
  let n = 0;
  for (const axis of AXES) n = n * AXIS_SIZE[axis] + g[axis];
  return n;
}

/** Design numbers shown to people are 1-based. */
export const numberOf = (g: Genome) => indexOf(g) + 1;
export const formatNumber = (n: number) => n.toLocaleString('en-US');

// ---------------------------------------------------------------------------------------------
// Browsing order: a keyed bijection (Feistel network + cycle walking) so that neighbours in the
// gallery differ on every axis, yet every design still appears exactly once.

function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function permute(i: number, size: number, seed: number): number {
  if (size <= 1) return 0;
  let bits = Math.max(2, Math.ceil(Math.log2(size)));
  if (bits % 2) bits++;
  const half = bits / 2;
  const mask = (1 << half) - 1;
  let x = i;
  do {
    let l = x >>> half;
    let r = x & mask;
    for (let round = 0; round < 4; round++) {
      const f = mix32(r ^ mix32(seed + round * 0x9e3779b9)) & mask;
      const nl = r;
      r = (l ^ f) & mask;
      l = nl;
    }
    x = ((l << half) | r) >>> 0;
  } while (x >= size);
  return x;
}

/** Size of the space left after fixing some axes. */
export function spaceSize(filters: Filters): number {
  return AXES.reduce((n, a) => n * (filters[a] === undefined ? AXIS_SIZE[a] : 1), 1);
}

/** The i-th design in browsing order within a filtered space. */
export function browse(i: number, filters: Filters, seed: number): Genome {
  const size = spaceSize(filters);
  let rest = permute(i % size, size, seed);
  const g = {} as Genome;
  for (let k = AXES.length - 1; k >= 0; k--) {
    const axis = AXES[k];
    const fixed = filters[axis];
    if (fixed !== undefined) {
      g[axis] = fixed;
      continue;
    }
    g[axis] = rest % AXIS_SIZE[axis];
    rest = Math.floor(rest / AXIS_SIZE[axis]);
  }
  return g;
}

export function randomGenome(rand: () => number = Math.random, base?: Genome, locked: Partial<Record<Axis, boolean>> = {}): Genome {
  const g = {} as Genome;
  for (const axis of AXES) {
    g[axis] = base && locked[axis] ? base[axis] : Math.floor(rand() * AXIS_SIZE[axis]);
  }
  return g;
}

/** Deterministic PRNG for reproducible spins. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
