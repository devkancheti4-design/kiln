// The Shelf: every piece lives in IndexedDB on this device. Nothing is ever uploaded.
import type { Content } from '../engine/content';
import type { Assets } from '../engine/exporter';

export interface Piece {
  id: string;
  title: string;
  created: number;
  updated: number;
  source: string;
  content: Content;
  markupLocked: boolean;
  assets: Assets;
  origin: number; // the design number it was thrown from
  fired: { at: number; serial: string } | null;
}

const DB = 'kiln';
const STORE = 'pieces';
export const FOLDERS = 'folders'; // linked folders (FileSystemDirectoryHandle) by piece id
let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<string, Piece>(); // fallback when IndexedDB is unavailable

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB, 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(FOLDERS)) db.createObjectStore(FOLDERS);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>, store = STORE): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function notify() {
  dispatchEvent(new CustomEvent('kiln-shelf'));
}

export async function listPieces(): Promise<Piece[]> {
  try {
    const all = await tx<Piece[]>('readonly', (s) => s.getAll() as IDBRequest<Piece[]>);
    return all.sort((a, b) => b.updated - a.updated);
  } catch {
    return [...memory.values()].sort((a, b) => b.updated - a.updated);
  }
}

export async function getPiece(id: string): Promise<Piece | null> {
  try {
    return ((await tx('readonly', (s) => s.get(id))) as Piece | undefined) ?? null;
  } catch {
    return memory.get(id) ?? null;
  }
}

export async function savePiece(p: Piece): Promise<void> {
  memory.set(p.id, p);
  try {
    await tx('readwrite', (s) => s.put(p));
  } catch {
    /* kept in memory for this session */
  }
  notify();
}

export async function deletePiece(id: string): Promise<void> {
  memory.delete(id);
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    /* ignore */
  }
  notify();
}

// ------------------------------------------------------------------ linked folders

export async function getFolder(id: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    return ((await tx('readonly', (s) => s.get(id), FOLDERS)) as FileSystemDirectoryHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function setFolder(id: string, handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    await tx<unknown>('readwrite', (s) => (handle ? s.put(handle, id) : s.delete(id)) as IDBRequest<unknown>, FOLDERS);
  } catch {
    /* ignore */
  }
}
