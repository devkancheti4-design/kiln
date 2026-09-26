// Where the bundled font files live at runtime. In `npm run dev` these are local URLs; in the
// single-file build they are inlined data: URLs — either way nothing touches the network.
import { FACES } from './typefaces';
import { fontFaceRule, fontFilesFor } from './render';

const URLS = import.meta.glob('./fonts/*.woff2', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const LICENSES = import.meta.glob('./fonts/licenses/*.txt', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

export function fontUrl(file: string): string {
  const url = URLS[`./fonts/${file}`];
  if (!url) throw new Error(`Font not bundled: ${file}`);
  return url;
}

export function fontLicense(faceId: string): string {
  return LICENSES[`./fonts/licenses/${faceId}.txt`] ?? '';
}

/** @font-face rules for every bundled face, pointing at runtime URLs (used by the app and previews). */
export const ALL_FONT_FACES_CSS = fontFilesFor(FACES)
  .map((f) => fontFaceRule(f, fontUrl(f.file)))
  .join('\n');

export async function fontBytes(file: string): Promise<Uint8Array> {
  const res = await fetch(fontUrl(file));
  return new Uint8Array(await res.arrayBuffer());
}
