// Freedom to work anywhere: a piece can be linked to a real folder on this computer.
// Kiln writes the site there (index.html, fonts, images) and watches it — edit in VS Code,
// Antigravity or Cursor, drop pictures into images/, and the Kiln preview follows along.
// Uses the File System Access API (Chrome, Edge, Arc, Brave). Other browsers get zip + import.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Assets } from '../engine/exporter';
import { fontFilesFor } from '../engine/render';
import { fontBytes, fontLicense } from '../engine/fonts';
import { syncFonts } from '../engine/patch';
import { facesUsedIn } from '../engine/typefaces';
import { dataUrlToBytes, slugify } from '../engine/exporter';
import type { Content } from '../engine/content';
import { joinProject, splitProject } from '../engine/split';
import { getFolder, setFolder } from './db';

type Perm = 'granted' | 'denied' | 'prompt';
interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<Perm>;
  requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<Perm>;
  values?: () => AsyncIterable<FileSystemHandle>;
}

export const canLinkFolders = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const EDITORS = [
  { id: 'vscode', name: 'VS Code', scheme: 'vscode' },
  { id: 'antigravity', name: 'Antigravity', scheme: 'antigravity' },
  { id: 'cursor', name: 'Cursor', scheme: 'cursor' },
  { id: 'windsurf', name: 'Windsurf', scheme: 'windsurf' },
] as const;

export function editorUrl(scheme: string, folderPath: string): string {
  const p = folderPath.trim().replace(/\/+$/, '');
  return `${scheme}://file${p.startsWith('/') ? '' : '/'}${encodeURI(p)}`;
}

async function writeFile(dir: FileSystemDirectoryHandle, path: string, data: string | Uint8Array) {
  const parts = path.split('/');
  let d = dir;
  for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
  const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
  const w = await fh.createWritable();
  await w.write(data as FileSystemWriteChunkType);
  await w.close();
}

async function exists(dir: FileSystemDirectoryHandle, path: string): Promise<boolean> {
  try {
    const parts = path.split('/');
    let d = dir;
    for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part);
    await d.getFileHandle(parts[parts.length - 1]);
    return true;
  } catch {
    return false;
  }
}

const README = `This folder is linked to Kiln — edit it anywhere.

  index.html       the home page (words, sections, pictures) + the design switches on <body>
  about.html …     any other pages — add a new one by creating name.html here
  css/tokens.css   12 values that restyle everything
  css/engine.css   the layouts, textures and art (big — you rarely need it)
  js/              motion, cursor effects, 3D scene
  images/          your pictures
  AGENTS.md        a short map for AI coding agents (Antigravity, Cursor…)

Save a file and the Kiln studio updates live. Change things in Kiln and they
are written back here.
`;

const SHARED_FILES = ['css/tokens.css', 'css/fonts.css', 'css/engine.css', 'js/motion.js', 'js/interact.js', 'js/scene.js'];

export interface SyncPage {
  slug: string;
  source: string;
  content: Content | null;
}

/** What the folder should contain for these pages, as one comparable string. */
const projectOf = (pages: SyncPage[]) => splitProject(pages.map((p) => ({ ...p, source: syncFonts(p.source) })));
const keyOf = (pages: { slug: string; source: string }[]) => pages.map((p) => `${p.slug}\n${p.source}`).join('\n\n');

/** Ask for a parent folder and create "<slug>/" inside it. */
export async function linkNewFolder(pieceId: string, title: string, pages: SyncPage[], assets: Assets): Promise<FileSystemDirectoryHandle | null> {
  const pick = (window as unknown as { showDirectoryPicker: (o: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  let parent: FileSystemDirectoryHandle;
  try {
    parent = await pick({ id: 'kiln-sites', mode: 'readwrite', startIn: 'documents' });
  } catch {
    return null; // cancelled
  }
  const dir = await parent.getDirectoryHandle(slugify(title), { create: true });
  await writeSite(dir, pages, assets, true);
  await setFolder(pieceId, dir);
  return dir;
}

/** Writes the split project; returns the key of the pages it represents (for change detection). */
export async function writeSite(dir: FileSystemDirectoryHandle, pages: SyncPage[], assets: Assets, full = false): Promise<string> {
  const files = projectOf(pages);
  const html = pages.map((p) => syncFonts(p.source)).join('\n');
  for (const [path, text] of Object.entries(files)) {
    if (!full && path === 'AGENTS.md' && (await exists(dir, path))) continue; // people may edit it
    if (!full && path !== 'AGENTS.md') {
      try {
        const cur = await (await fileHandle(dir, path)).getFile();
        if ((await cur.text()) === text) continue;
      } catch {
        /* new file */
      }
    }
    await writeFile(dir, path, text);
  }
  for (const f of fontFilesFor(facesUsedIn(html))) {
    if (full || !(await exists(dir, f.path))) {
      await writeFile(dir, f.path, await fontBytes(f.file));
      await writeFile(dir, `fonts/LICENSE-${f.face.id}.txt`, fontLicense(f.face.id));
    }
  }
  for (const [path, url] of Object.entries(assets)) {
    if (html.includes(path) && (full || !(await exists(dir, path)))) await writeFile(dir, path, dataUrlToBytes(url));
  }
  if (full) await writeFile(dir, 'README.txt', README);
  return keyOf(joinProject(files));
}

async function fileHandle(dir: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split('/');
  let d = dir;
  for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part);
  return d.getFileHandle(parts[parts.length - 1]);
}

/** Reads the project back (every *.html plus the shared css/js); returns a modification stamp and the files. */
async function readSite(dir: FileSystemDirectoryHandle): Promise<{ stamp: string; files: Record<string, string> | null }> {
  const mods: string[] = [];
  const handles: [string, File][] = [];
  const htmls: string[] = [];
  try {
    const d = dir as DirHandle;
    if (d.values) for await (const h of d.values()) if (h.kind === 'file' && /^[^/]+\.html$/.test(h.name)) htmls.push(h.name);
  } catch {
    /* unreadable folder */
  }
  for (const path of [...htmls.sort(), ...SHARED_FILES]) {
    try {
      const f = await (await fileHandle(dir, path)).getFile();
      mods.push(`${path}:${f.lastModified}:${f.size}`);
      handles.push([path, f]);
    } catch {
      mods.push(`${path}:-`);
    }
  }
  return {
    stamp: mods.join('|'),
    files: handles.length ? Object.fromEntries(await Promise.all(handles.map(async ([p, f]) => [p, await f.text()] as const))) : null,
  };
}

async function readImagesFolder(dir: DirHandle, known: Assets): Promise<Assets> {
  const found: Assets = {};
  let images: DirHandle;
  try {
    images = (await dir.getDirectoryHandle('images')) as DirHandle;
  } catch {
    return found;
  }
  if (!images.values) return found;
  for await (const h of images.values()) {
    if (h.kind !== 'file' || !/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(h.name)) continue;
    const path = `images/${h.name}`;
    if (known[path]) continue;
    const file = await (h as FileSystemFileHandle).getFile();
    if (file.size > 12_000_000) continue;
    found[path] = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(file);
    });
  }
  return found;
}

export type FolderState = 'none' | 'linked' | 'needs-permission' | 'error';

/** Two-way sync between the studio and a linked folder. */
export function useFolderSync(
  pieceId: string,
  enabled: boolean,
  pages: SyncPage[],
  assets: Assets,
  onExternalPages: (pages: { slug: string; source: string }[]) => void,
  onExternalAssets: (a: Assets) => void,
) {
  const [handle, setHandle] = useState<DirHandle | null>(null);
  const [state, setState] = useState<FolderState>('none');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const written = useRef<string | null>(null); // key of the pages last known to be in the folder
  const stamp = useRef('');
  const busy = useRef(false);
  const latest = useRef({ pages, assets, onExternalPages, onExternalAssets });
  latest.current = { pages, assets, onExternalPages, onExternalAssets };

  useEffect(() => {
    if (!canLinkFolders) return;
    let alive = true;
    getFolder(pieceId).then(async (h) => {
      if (!alive || !h) return;
      const d = h as DirHandle;
      const perm = (await d.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
      setHandle(d);
      setState(perm === 'granted' ? 'linked' : 'needs-permission');
    });
    return () => {
      alive = false;
    };
  }, [pieceId]);

  const reconnect = useCallback(async () => {
    if (!handle) return;
    const perm = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted';
    setState(perm === 'granted' ? 'linked' : 'needs-permission');
  }, [handle]);

  const link = useCallback(
    async (title: string) => {
      const d = (await linkNewFolder(pieceId, title, latest.current.pages, latest.current.assets)) as DirHandle | null;
      if (!d) return false;
      written.current = keyOf(joinProject(projectOf(latest.current.pages)));
      stamp.current = (await readSite(d)).stamp;
      setHandle(d);
      setState('linked');
      setLastSync(Date.now());
      return true;
    },
    [pieceId],
  );

  const unlink = useCallback(async () => {
    await setFolder(pieceId, null);
    setHandle(null);
    setState('none');
  }, [pieceId]);

  // studio -> folder
  const pagesKey = keyOf(pages);
  useEffect(() => {
    if (!enabled || state !== 'linked' || !handle) return;
    const key = keyOf(joinProject(projectOf(latest.current.pages)));
    if (key === written.current) return;
    const t = setTimeout(async () => {
      busy.current = true;
      try {
        written.current = await writeSite(handle, latest.current.pages, latest.current.assets);
        stamp.current = (await readSite(handle)).stamp;
        setLastSync(Date.now());
      } catch {
        setState('error');
      } finally {
        busy.current = false;
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, state, handle, pagesKey, assets]);

  // folder -> studio
  useEffect(() => {
    if (!enabled || state !== 'linked' || !handle) return;
    let alive = true;
    const poll = async () => {
      if (busy.current) return;
      try {
        const now = await readSite(handle);
        if (now.stamp !== stamp.current && now.files) {
          stamp.current = now.stamp;
          const joined = joinProject(now.files);
          const key = keyOf(joined);
          if (written.current === null) written.current = key;
          else if (key !== written.current) {
            written.current = key;
            latest.current.onExternalPages(joined);
            setLastSync(Date.now());
          }
        }
        const fresh = await readImagesFolder(handle, latest.current.assets);
        if (Object.keys(fresh).length) latest.current.onExternalAssets(fresh);
      } catch {
        if (alive) setState('error');
      }
    };
    const id = setInterval(poll, 900);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled, state, handle]);

  return { state, folderName: handle?.name ?? null, lastSync, link, unlink, reconnect };
}
