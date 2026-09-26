// Color math used by the engine and the app. Everything is plain sRGB hex in and out;
// OKLab/OKLCH are used where perception matters (mixing, hue rotation, lightness).

export type RGB = [number, number, number]; // 0..1
export type OKLCH = [number, number, number]; // L 0..1, C 0..~0.4, H degrees

export function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, 1..21 */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function rgbToOklab([r, g, b]: RGB): RGB {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function hexToOklch(hex: string): OKLCH {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function inGamut([r, g, b]: RGB): boolean {
  const e = 0.0005;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}

/** OKLCH -> hex, reducing chroma until the color fits in sRGB. */
export function oklchToHex([L, C, H]: OKLCH): string {
  const rad = (H * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 40; i++) {
    const rgb = oklabToRgb([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (inGamut(rgb)) return rgbToHex(rgb);
    c *= 0.94;
  }
  return rgbToHex(oklabToRgb([L, 0, 0]));
}

export function hueOf(hex: string): number {
  return hexToOklch(hex)[2];
}

/** Rotate a color's hue to an absolute angle, keeping its lightness and chroma. */
export function withHue(hex: string, hue: number): string {
  const [L, C] = hexToOklch(hex);
  return oklchToHex([L, C, ((hue % 360) + 360) % 360]);
}

/** Same math as CSS `color-mix(in oklab, a p%, b)`. */
export function mixOklab(a: string, b: string, p: number): string {
  const A = rgbToOklab(hexToRgb(a));
  const B = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb([A[0] * p + B[0] * (1 - p), A[1] * p + B[1] * (1 - p), A[2] * p + B[2] * (1 - p)]));
}

/** Text color the engine puts on accent buttons (mirrors the --on-accent rule in site.css). */
export function onAccent(accent: string): string {
  return hexToOklch(accent)[0] < 0.6 ? '#ffffff' : '#000000';
}

/** Accent as the engine uses it for text (mirrors --accent-text: 66% accent). */
export function accentText(accent: string, ink: string): string {
  return mixOklab(accent, ink, 0.66);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}
