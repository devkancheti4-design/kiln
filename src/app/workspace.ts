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
import { joinSite, splitSite } from '../engine/split';
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

  index.html       the page (words, sections, pictures) + the design switches on <body>
  css/tokens.css   12 values that restyle everything
  css/engine.css   the layouts, textures and art (big — you rarely need it)
  js/              motion, cursor effects, 3D scene
  images/          your pictures
  AGENTS.md        a short map for AI coding agents (Antigravity, Cursor…)

Save a file and the Kiln studio updates live. Change things in Kiln and they
are written back here.
`;

const TEXT_FILES = ['index.html', 'css/tokens.css', 'css/fonts.css', 'css/engine.css', 'js/motion.js', 'js/interact.js', 'js/scene.js'];

/** Ask for a parent folder and create "<slug>/" inside it. */
export async function linkNewFolder(pieceId: string, title: string, source: string, assets: Assets, content: Content | null): Promise<FileSystemDirectoryHandle | null> {
  const pick = (window as unknown as { showDirectoryPicker: (o: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  let parent: FileSystemDirectoryHandle;
  try {
    parent = await pick({ id: 'kiln-sites', mode: 'readwrite', startIn: 'documents' });
  } catch {
    return null; // cancelled
  }
  const dir = await parent.getDirectoryHandle(slugify(title), { create: true });
  await writeSite(dir, source, assets, content, true);
  await setFolder(pieceId, dir);
  return dir;
}

/** Writes the split project; returns the joined source it represents (for change detection). */
export async function writeSite(dir: FileSystemDirectoryHandle, source: string, assets: Assets, content: Content | null, full = false): Promise<string> {
  const html = syncFonts(source);
  const files = splitSite(html, content);
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
  return joinSite(files);
}

async function fileHandle(dir: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split('/');
  let d = dir;
  for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part);
  return d.getFileHandle(parts[parts.length - 1]);
}

/** Reads the project back; returns a stamp of modification times and the joined source. */
async function readSite(dir: FileSystemDirectoryHandle): Promise<{ stamp: string; files: Record<string, string> | null }> {
  const mods: string[] = [];
  const handles: [string, File][] = [];
  for (const path of TEXT_FILES) {
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
  source: string,
  assets: Assets,
  content: Content | null,
  onExternalSource: (src: string) => void,
  onExternalAssets: (a: Assets) => void,
) {
  const [handle, setHandle] = useState<DirHandle | null>(null);
  const [state, setState] = useState<FolderState>('none');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const written = useRef<string | null>(null); // joined source last known to be in the folder
  const stamp = useRef('');
  const busy = useRef(false);
  const latest = useRef({ source, assets, content, onExternalSource, onExternalAssets });
  latest.current = { source, assets, content, onExternalSource, onExternalAssets };

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
      const d = (await linkNewFolder(pieceId, title, latest.current.source, latest.current.assets, latest.current.content)) as DirHandle | null;
      if (!d) return false;
      written.current = joinSite(splitSite(syncFonts(latest.current.source), latest.current.content));
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
  useEffect(() => {
    if (!enabled || state !== 'linked' || !handle) return;
    const joined = joinSite(splitSite(syncFonts(source), latest.current.content));
    if (joined === written.current) return;
    const t = setTimeout(async () => {
      busy.current = true;
      try {
        written.current = await writeSite(handle, latest.current.source, latest.current.assets, latest.current.content);
        stamp.current = (await readSite(handle)).stamp;
        setLastSync(Date.now());
      } catch {
        setState('error');
      } finally {
        busy.current = false;
      }
    }, 500);
    return () => clearTimeout(t);
  }, [enabled, state, handle, source, assets]);

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
          const joined = joinSite(now.files);
          if (written.current === null) written.current = joined;
          else if (joined !== written.current) {
            written.current = joined;
            latest.current.onExternalSource(joined);
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
