// After `vite build --mode single`: name the file people double-click.
import { renameSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const from = path.join(root, 'dist-single', 'index.html');
const to = path.join(root, 'dist-single', 'Kiln.html');
if (existsSync(from)) {
  renameSync(from, to);
  console.log(`offline app ready: dist-single/Kiln.html (${(statSync(to).size / 1024 / 1024).toFixed(1)} MB) — double-click it, no internet needed`);
}
