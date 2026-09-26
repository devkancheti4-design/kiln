// Copies the latin subset of every bundled font from node_modules into src/engine/fonts,
// so Kiln and every site it exports work with zero network access.
// Run once after `npm install`: `npm run fonts`. The copied files are committed.
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'src', 'engine', 'fonts');
const nm = path.join(root, 'node_modules');

// id -> [package, normal file, italic file | null, family name]
const FONTS = {
  fraunces: ['@fontsource-variable/fraunces', 'fraunces-latin-wght-normal', 'fraunces-latin-wght-italic', 'Fraunces'],
  inter: ['@fontsource-variable/inter', 'inter-latin-wght-normal', null, 'Inter'],
  'space-grotesk': ['@fontsource-variable/space-grotesk', 'space-grotesk-latin-wght-normal', null, 'Space Grotesk'],
  'instrument-serif': ['@fontsource/instrument-serif', 'instrument-serif-latin-400-normal', 'instrument-serif-latin-400-italic', 'Instrument Serif'],
  'playfair-display': ['@fontsource-variable/playfair-display', 'playfair-display-latin-wght-normal', 'playfair-display-latin-wght-italic', 'Playfair Display'],
  'source-sans-3': ['@fontsource-variable/source-sans-3', 'source-sans-3-latin-wght-normal', null, 'Source Sans 3'],
  'dm-serif-display': ['@fontsource/dm-serif-display', 'dm-serif-display-latin-400-normal', 'dm-serif-display-latin-400-italic', 'DM Serif Display'],
  'dm-sans': ['@fontsource-variable/dm-sans', 'dm-sans-latin-wght-normal', null, 'DM Sans'],
  syne: ['@fontsource-variable/syne', 'syne-latin-wght-normal', null, 'Syne'],
  manrope: ['@fontsource-variable/manrope', 'manrope-latin-wght-normal', null, 'Manrope'],
  unbounded: ['@fontsource-variable/unbounded', 'unbounded-latin-wght-normal', null, 'Unbounded'],
  'bricolage-grotesque': ['@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal', null, 'Bricolage Grotesque'],
  'jetbrains-mono': ['@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal', null, 'JetBrains Mono'],
  outfit: ['@fontsource-variable/outfit', 'outfit-latin-wght-normal', null, 'Outfit'],
  'cormorant-garamond': ['@fontsource-variable/cormorant-garamond', 'cormorant-garamond-latin-wght-normal', 'cormorant-garamond-latin-wght-italic', 'Cormorant Garamond'],
  karla: ['@fontsource-variable/karla', 'karla-latin-wght-normal', null, 'Karla'],
  archivo: ['@fontsource-variable/archivo', 'archivo-latin-standard-normal', null, 'Archivo'],
};

mkdirSync(path.join(out, 'licenses'), { recursive: true });
let total = 0;
const licenses = {};
for (const [id, [pkg, normal, italic, family]] of Object.entries(FONTS)) {
  for (const [file, suffix] of [[normal, ''], [italic, '-italic']]) {
    if (!file) continue;
    const src = path.join(nm, pkg, 'files', `${file}.woff2`);
    const dest = path.join(out, `${id}${suffix}.woff2`);
    copyFileSync(src, dest);
    total += statSync(dest).size;
  }
  const license = readFileSync(path.join(nm, pkg, 'LICENSE'), 'utf8');
  writeFileSync(path.join(out, 'licenses', `${id}.txt`), license);
  licenses[id] = family;
}
console.log(`copied ${Object.keys(FONTS).length} families, ${(total / 1024).toFixed(0)} KB of woff2 into src/engine/fonts`);
