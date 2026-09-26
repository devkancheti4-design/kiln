// 24 glazes × light/dark = 48 color moods. Every site is painted from just three colors:
// --bg (page), --ink (text) and --accent (buttons, links, highlights). The engine mixes the rest.
// tests/palettes.test.ts checks every pair for readable contrast.

export interface Swatch {
  bg: string;
  ink: string;
  accent: string;
}

export interface Palette {
  id: string;
  name: string;
  light: Swatch;
  dark: Swatch;
}

export const PALETTES: Palette[] = [
  { id: 'terracotta', name: 'Terracotta', light: { bg: '#f5efe6', ink: '#2a211b', accent: '#b94f2b' }, dark: { bg: '#1c1512', ink: '#f1e6da', accent: '#e57a50' } },
  { id: 'porcelain', name: 'Porcelain', light: { bg: '#f4f6f9', ink: '#15213b', accent: '#2851a3' }, dark: { bg: '#0e1526', ink: '#e6ecf5', accent: '#7aa2f7' } },
  { id: 'celadon', name: 'Celadon', light: { bg: '#eef3ec', ink: '#1b2a21', accent: '#2f7a55' }, dark: { bg: '#101a14', ink: '#e1ece4', accent: '#7cc49a' } },
  { id: 'ink-seal', name: 'Ink & Seal', light: { bg: '#fbfaf7', ink: '#121212', accent: '#d42e1b' }, dark: { bg: '#0f0f0f', ink: '#f2f1ee', accent: '#ff5a3c' } },
  { id: 'saffron', name: 'Saffron', light: { bg: '#fff7e8', ink: '#2b1d0e', accent: '#e08e0b' }, dark: { bg: '#1a130a', ink: '#f7ead6', accent: '#f5a524' } },
  { id: 'indigo', name: 'Indigo Night', light: { bg: '#f3f2fb', ink: '#1b1640', accent: '#5b4cf0' }, dark: { bg: '#0e0b22', ink: '#ebe8ff', accent: '#8f82ff' } },
  { id: 'matcha', name: 'Matcha', light: { bg: '#f2f4e8', ink: '#222914', accent: '#5f7f1f' }, dark: { bg: '#12160b', ink: '#eef2dd', accent: '#a8c95b' } },
  { id: 'rose', name: 'Rose Quartz', light: { bg: '#fbf1f1', ink: '#3a1f24', accent: '#c93f62' }, dark: { bg: '#1e1114', ink: '#f8e6e9', accent: '#f07f98' } },
  { id: 'slate-lime', name: 'Slate & Lime', light: { bg: '#f3f5f7', ink: '#0f172a', accent: '#4d7c0f' }, dark: { bg: '#0b1120', ink: '#e2e8f0', accent: '#a3e635' } },
  { id: 'ocean', name: 'Ocean', light: { bg: '#eef6f8', ink: '#0b2b36', accent: '#0e7490' }, dark: { bg: '#06161c', ink: '#dff3f7', accent: '#22d3ee' } },
  { id: 'plum', name: 'Plum', light: { bg: '#f7f1f7', ink: '#2d1530', accent: '#8e3b95' }, dark: { bg: '#170b19', ink: '#f3e6f4', accent: '#d58ae0' } },
  { id: 'sand-olive', name: 'Sand & Olive', light: { bg: '#f4efe3', ink: '#2c2a1e', accent: '#6b6b1f' }, dark: { bg: '#18170f', ink: '#efeadb', accent: '#c7c46a' } },
  { id: 'coral', name: 'Charcoal & Coral', light: { bg: '#f7f5f3', ink: '#222222', accent: '#f0553a' }, dark: { bg: '#141414', ink: '#efefef', accent: '#ff7a5c' } },
  { id: 'mono', name: 'Monochrome', light: { bg: '#ffffff', ink: '#0a0a0a', accent: '#0a0a0a' }, dark: { bg: '#0a0a0a', ink: '#f5f5f5', accent: '#f5f5f5' } },
  { id: 'forest', name: 'Forest', light: { bg: '#eff3ed', ink: '#13221a', accent: '#1f6f43' }, dark: { bg: '#0c1510', ink: '#dfeae2', accent: '#4fbf7f' } },
  { id: 'sunset', name: 'Sunset', light: { bg: '#fff3ea', ink: '#2a1410', accent: '#e8521f' }, dark: { bg: '#1b0f0b', ink: '#fbe7dc', accent: '#ff8a4c' } },
  { id: 'lavender', name: 'Lavender', light: { bg: '#f6f4ff', ink: '#221b3a', accent: '#7250f5' }, dark: { bg: '#120f20', ink: '#ece8ff', accent: '#a996ff' } },
  { id: 'mustard', name: 'Mustard & Navy', light: { bg: '#fbf6e6', ink: '#14213d', accent: '#c28600' }, dark: { bg: '#0d1528', ink: '#f4efe0', accent: '#f2c230' } },
  { id: 'blossom', name: 'Cherry Blossom', light: { bg: '#fff5f7', ink: '#3b1422', accent: '#db2f63' }, dark: { bg: '#1d0b12', ink: '#ffe6ee', accent: '#ff7aa2' } },
  { id: 'teal-cream', name: 'Teal & Cream', light: { bg: '#f8f3e9', ink: '#10302f', accent: '#0f766e' }, dark: { bg: '#0a1a19', ink: '#f1ebdf', accent: '#3fc1b3' } },
  { id: 'gold', name: 'Midnight Gold', light: { bg: '#f7f4ec', ink: '#1b1a17', accent: '#a8770a' }, dark: { bg: '#0c0c10', ink: '#efe9dc', accent: '#d9b44a' } },
  { id: 'denim', name: 'Denim', light: { bg: '#eef2f7', ink: '#1c283a', accent: '#3a6ea8' }, dark: { bg: '#0d1522', ink: '#e2e9f3', accent: '#7fb0ea' } },
  { id: 'mint', name: 'Mint', light: { bg: '#effaf5', ink: '#0f2b21', accent: '#0e9f6e' }, dark: { bg: '#07160f', ink: '#dcf5ea', accent: '#34d399' } },
  { id: 'brick', name: 'Brick & Stone', light: { bg: '#f2f0ed', ink: '#262322', accent: '#b23a2b' }, dark: { bg: '#161413', ink: '#ece8e4', accent: '#e8674f' } },
];

export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

export function swatchOf(palette: number, mode: number): Swatch {
  const p = PALETTES[palette];
  return mode === 1 ? p.dark : p.light;
}
