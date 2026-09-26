import { KINDS } from '../engine/kinds';
import { formatNumber, genomeAt, TOTAL } from '../engine/genome';
import { renderDocument } from '../engine/render';
import type { Piece } from './db';

export function newId(): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return (Date.now().toString(36) + rand[0].toString(36) + rand[1].toString(36)).slice(0, 16);
}

export function clampNumber(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(TOTAL, Math.max(1, Math.round(n)));
}

/** A fresh, unsaved piece thrown from design No. n. */
export function pieceFromNumber(n: number): Piece {
  const number = clampNumber(n);
  const g = genomeAt(number - 1);
  const content = structuredClone(KINDS[g.kind].content);
  const now = Date.now();
  return {
    id: newId(),
    title: content.brand,
    created: now,
    updated: now,
    source: renderDocument(g, content),
    content,
    markupLocked: false,
    assets: {},
    origin: number,
    fired: null,
  };
}

/** A short maker's mark for a fired piece, derived from its exact code. */
export function hallmark(source: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < source.length; i++) {
    const c = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  const s = ((h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)).toUpperCase().padEnd(10, '0');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export const randomNumber = () => 1 + Math.floor(Math.random() * TOTAL);

export const niceNumber = (n: number) => `No. ${formatNumber(n)}`;
