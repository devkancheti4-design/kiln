// The small, hand-made pieces that multiply into every Kiln site.
// Forms, textures and motion are one word each on <body>; shapes and density are token values.

export interface Form {
  id: string;
  name: string;
  note: string;
  scale: number; // default heading scale for this form
  /** tiny schematic for pickers: rects as [x, y, w, h, tone] in a 64×44 box; tone 0 line, 1 ink, 2 accent */
  sketch: [number, number, number, number, number][];
}

export const FORMS: Form[] = [
  { id: 'classic', name: 'Classic', note: 'Centered hero, tidy grid', scale: 1.28, sketch: [[4, 4, 56, 3, 0], [16, 11, 32, 5, 1], [22, 18, 20, 2, 0], [26, 22, 12, 3, 2], [8, 28, 48, 12, 0]] },
  { id: 'split', name: 'Split', note: 'Words left, picture right', scale: 1.3, sketch: [[4, 4, 56, 3, 0], [4, 12, 26, 5, 1], [4, 19, 20, 2, 0], [4, 24, 12, 3, 2], [34, 11, 26, 29, 0]] },
  { id: 'editorial', name: 'Editorial', note: 'Magazine rules and columns', scale: 1.34, sketch: [[20, 3, 24, 4, 1], [4, 9, 56, 1, 1], [4, 13, 44, 7, 1], [34, 22, 26, 2, 0], [4, 27, 56, 13, 0]] },
  { id: 'bento', name: 'Bento', note: 'Everything in tiles', scale: 1.26, sketch: [[4, 4, 36, 20, 0], [42, 4, 18, 20, 2], [4, 26, 18, 14, 0], [24, 26, 36, 14, 0]] },
  { id: 'sidebar', name: 'Sidebar', note: 'Menu on the left', scale: 1.25, sketch: [[4, 4, 14, 36, 0], [22, 6, 30, 5, 1], [22, 14, 22, 2, 0], [22, 20, 38, 20, 0]] },
  { id: 'poster', name: 'Poster', note: 'Huge type, bold blocks', scale: 1.5, sketch: [[4, 4, 56, 12, 1], [4, 18, 40, 8, 1], [4, 30, 56, 10, 2]] },
  { id: 'minimal', name: 'Minimal', note: 'Just words, lots of air', scale: 1.2, sketch: [[14, 6, 8, 8, 2], [14, 17, 30, 3, 1], [14, 23, 36, 2, 0], [14, 28, 36, 2, 0], [14, 33, 24, 2, 0]] },
  { id: 'showcase', name: 'Showcase', note: 'Full-bleed picture first', scale: 1.32, sketch: [[0, 0, 64, 30, 2], [6, 18, 26, 9, 1], [4, 33, 27, 8, 0], [33, 33, 27, 8, 0]] },
  { id: 'brutalist', name: 'Brutalist', note: 'Thick lines, hard shadows', scale: 1.3, sketch: [[2, 2, 60, 6, 2], [4, 12, 38, 6, 1], [4, 24, 26, 16, 0], [34, 24, 26, 16, 0]] },
  { id: 'floating', name: 'Floating', note: 'Soft cards that hover', scale: 1.28, sketch: [[20, 3, 24, 4, 0], [14, 11, 36, 5, 1], [24, 18, 16, 3, 2], [6, 26, 52, 15, 0]] },
];

export interface Texture {
  id: string;
  name: string;
}

export const TEXTURES: Texture[] = [
  { id: 'none', name: 'Plain' },
  { id: 'grain', name: 'Grain' },
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'lines', name: 'Lines' },
  { id: 'waves', name: 'Waves' },
  { id: 'glow', name: 'Glow' },
];

export const MOTIONS = [
  { id: 'still', name: 'Still' },
  { id: 'gentle', name: 'Gentle' },
  { id: 'lively', name: 'Lively' },
];

export const SHAPES = [
  { id: 'sharp', name: 'Sharp', radius: '0px' },
  { id: 'soft', name: 'Soft', radius: '6px' },
  { id: 'round', name: 'Round', radius: '16px' },
  { id: 'pill', name: 'Pill', radius: '999px' },
];

export const DENSITIES = [
  { id: 'compact', name: 'Compact', space: '0.8' },
  { id: 'comfortable', name: 'Comfortable', space: '1' },
  { id: 'airy', name: 'Airy', space: '1.3' },
];

export const DEFAULT_WIDTH = '1180px';

/** 3D hero scenes (plain WebGL, see scene.ts). */
export const SCENES = [
  { id: 'none', name: 'Flat', note: 'Painted art, no 3D' },
  { id: 'blob', name: 'Blob', note: 'Glossy clay that melts and merges' },
  { id: 'vase', name: 'Vase', note: 'A glazed pot turning on the wheel' },
  { id: 'rings', name: 'Rings', note: 'A slow gyroscope' },
  { id: 'orbs', name: 'Orbs', note: 'Little moons in orbit' },
  { id: 'crystal', name: 'Crystal', note: 'A twisting gem' },
  { id: 'waves', name: 'Waves', note: 'A rolling grid landscape' },
];

/** How the page answers the cursor. */
export const INTERACTIONS = [
  { id: 'none', name: 'Calm', note: 'Nothing moves under the cursor' },
  { id: 'tilt', name: 'Tilt', note: 'Cards lean toward the cursor with a shine' },
  { id: 'spotlight', name: 'Spotlight', note: 'A soft light follows the cursor' },
  { id: 'magnetic', name: 'Magnetic', note: 'Buttons pull toward the cursor' },
];
