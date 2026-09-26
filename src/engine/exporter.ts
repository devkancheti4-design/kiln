// "Firing" a piece: turn its source into files people can keep, open offline and publish anywhere.
import { fontBytes, fontLicense, fontUrl } from './fonts';
import type { Content } from './content';
import { styleRange, syncFonts } from './patch';
import { splitSite } from './split';
import { fontFaceRule, fontFilesFor } from './render';
import { facesUsedIn } from './typefaces';
import { zip } from './zip';

export type Assets = Record<string, string>; // "images/hero.jpg" -> data: URL

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, meta = '', body = ''] = /^data:([^,]*),(.*)$/s.exec(dataUrl) ?? [];
  if (meta.endsWith(';base64')) {
    const bin = atob(body);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** Asset paths the source actually refers to. */
export function usedAssets(src: string, assets: Assets): string[] {
  return Object.keys(assets).filter((path) => src.includes(path));
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48) || 'my-site'
  );
}

const README = (title: string) => `${title}
${'='.repeat(title.length)}

This folder is a complete website. It works offline — no internet needed.

  index.html   the page (open it in any browser)
  fonts/       the fonts it uses, with their open licenses
  images/      your pictures (if you added any)

Put it online for free
----------------------
Any static host works. Three easy ones:

  1. Netlify Drop     — drag this whole folder onto app.netlify.com/drop
  2. GitHub Pages     — push the folder to a repository, then Settings → Pages
  3. Cloudflare Pages — create a project and upload the folder

Change it later
---------------
Open index.html in any text editor. The first block (TOKENS) changes the
whole design; the words live between the tags further down.

Made with Kiln.
`;

export async function buildZip(title: string, source: string, assets: Assets): Promise<Uint8Array> {
  const html = syncFonts(source);
  const faces = facesUsedIn(html);
  const entries: { path: string; data: Uint8Array | string }[] = [{ path: 'index.html', data: html }];
  for (const f of fontFilesFor(faces)) entries.push({ path: f.path, data: await fontBytes(f.file) });
  for (const face of faces) entries.push({ path: `fonts/LICENSE-${face.id}.txt`, data: fontLicense(face.id) });
  for (const path of usedAssets(html, assets)) entries.push({ path, data: dataUrlToBytes(assets[path]) });
  entries.push({ path: 'README.txt', data: README(title) });
  return zip(entries);
}

/** A tidy project for code editors and AI agents: index.html, css/, js/, AGENTS.md, fonts/, images/. */
export async function buildProjectZip(title: string, source: string, assets: Assets, content: Content | null): Promise<Uint8Array> {
  const html = syncFonts(source);
  const files = splitSite(html, content);
  const faces = facesUsedIn(html);
  const entries: { path: string; data: Uint8Array | string }[] = Object.entries(files).map(([path, data]) => ({ path, data }));
  for (const f of fontFilesFor(faces)) entries.push({ path: f.path, data: await fontBytes(f.file) });
  for (const face of faces) entries.push({ path: `fonts/LICENSE-${face.id}.txt`, data: fontLicense(face.id) });
  for (const path of usedAssets(html, assets)) entries.push({ path, data: dataUrlToBytes(assets[path]) });
  entries.push({ path: 'README.txt', data: README(title).replace('  index.html   the page (open it in any browser)', '  index.html   the page (open it in any browser)\n  css/ js/     styles and scripts, one job per file\n  AGENTS.md    a short map for AI coding agents') });
  return zip(entries);
}

/** One self-contained HTML file: fonts and images inlined as data: URLs. */
export async function buildSingleFile(source: string, assets: Assets): Promise<string> {
  let html = syncFonts(source);
  const faces = facesUsedIn(html);
  const r = styleRange(html, 'fonts');
  if (r) {
    const rules: string[] = ['    /* Fonts are embedded right here, so this single file works anywhere. */'];
    for (const f of fontFilesFor(faces)) {
      const url = fontUrl(f.file);
      const data = url.startsWith('data:') ? url : `data:font/woff2;base64,${bytesToBase64(await fontBytes(f.file))}`;
      rules.push(`    ${fontFaceRule(f, data)}`);
    }
    html = `${html.slice(0, r.from)}\n${rules.join('\n')}\n  ${html.slice(r.to)}`;
  }
  for (const path of usedAssets(html, assets)) html = html.split(path).join(assets[path]);
  return html;
}

export function download(filename: string, data: Uint8Array | string, type: string) {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
