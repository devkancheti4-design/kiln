// Lightweight thumbnails: the real engine CSS inside a shadow root, shared by every card, so the
// gallery can show thousands of live designs without an iframe each.
import type { Assets } from './exporter';
import type { Genome } from './genome';
import { KINDS } from './kinds';
import { engineCss, markupRange } from './patch';
import { bodyAttrs, resolveAssets } from './preview';
import { ENGINE_CSS, renderMarkup, switchesFor, tokensFor } from './render';
import { styleRange } from './patch';
import { sceneSnapshot } from './scene';

export const FRAME_WIDTH = 1280;

const FRAME_CSS = `
:host { display: block; position: relative; overflow: hidden; }
.frame { position: absolute; inset: 0 auto auto 0; width: ${FRAME_WIDTH}px; container-type: inline-size; transform-origin: 0 0; transform: scale(var(--s, 0.25)); pointer-events: none; }
.frame > .site { min-height: 0; transition: translate var(--peek-time, 0s) cubic-bezier(.45,.05,.35,1); }
script { display: none; }
`;

let engineSheet: CSSStyleSheet | null = null;
let frameSheet: CSSStyleSheet | null = null;

export function sharedSheets(): CSSStyleSheet[] {
  if (!engineSheet) {
    engineSheet = new CSSStyleSheet();
    engineSheet.replaceSync(ENGINE_CSS);
    frameSheet = new CSSStyleSheet();
    frameSheet.replaceSync(FRAME_CSS);
  }
  return [engineSheet, frameSheet!];
}

const markupCache = new Map<number, string>();
function kindMarkup(kind: number): string {
  let m = markupCache.get(kind);
  if (!m) {
    m = renderMarkup(KINDS[kind].content).replace(/<!--[\s\S]*?-->/g, '');
    markupCache.set(kind, m);
  }
  return m;
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function thumbHtmlForGenome(g: Genome): string {
  const t = tokensFor(g);
  const style = Object.entries(t)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  const sw = switchesFor(g);
  return `<div class="frame"><div class="site" data-form="${sw.form}" data-texture="${sw.texture}" data-motion="${sw.motion}" data-scene="${sw.scene}" data-interact="${sw.interact}" style="${escAttr(style)}">${kindMarkup(g.kind)}</div></div>`;
}

/**
 * Thumbnail for any source (hand-edited pieces on the shelf). Their own tokens and engine CSS are
 * used, with :root mapped onto the shadow host.
 */
export function thumbForSource(src: string, assets: Assets): { html: string; css: string } {
  const tokensRange = styleRange(src, 'tokens');
  const tokens = tokensRange ? src.slice(tokensRange.from, tokensRange.to).replace(/:root\b/g, ':host') : '';
  const engine = engineCss(src) ?? '';
  const r = markupRange(src);
  const markup = r ? resolveAssets(src.slice(r.from, r.to), assets).replace(/<script[\s\S]*?<\/script>/gi, '') : '';
  const attrs = bodyAttrs(src);
  const attrText = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escAttr(v)}"`)
    .join(' ');
  return { html: `<div class="frame"><div ${attrText}>${markup}</div></div>`, css: `${tokens}\n${engine}` };
}

export function frameSheetOnly(): CSSStyleSheet {
  sharedSheets();
  return frameSheet!;
}

// ------------------------------------------------------------------ 3D snapshots


const queue: (() => void)[] = [];
let pumping = false;
function pump() {
  const job = queue.shift();
  if (!job) {
    pumping = false;
    return;
  }
  job();
  requestAnimationFrame(pump);
}

/** Paints a still frame of the design's 3D scene into its hero picture (one per frame, queued). */
export function paintScene(root: ShadowRoot, displayScale: number, isAlive: () => boolean) {
  const site = root.querySelector<HTMLElement>('.site');
  const media = root.querySelector<HTMLElement>('.hero-media');
  const scene = site?.getAttribute('data-scene');
  if (!site || !media || !scene || scene === 'none') return;
  queue.push(() => {
    if (!isAlive() || !media.isConnected) return;
    const cs = getComputedStyle(site);
    const colors = { bg: cs.getPropertyValue('--bg').trim(), ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim() };
    const k = Math.min(640 / Math.max(1, media.offsetWidth), displayScale * Math.min(2, devicePixelRatio || 1));
    const url = sceneSnapshot(scene, colors, media.offsetWidth * k, media.offsetHeight * k);
    if (!url) return;
    media.querySelector('.scene')?.remove();
    const img = document.createElement('img');
    img.className = 'scene';
    img.alt = '';
    img.src = url;
    media.append(img);
  });
  if (!pumping) {
    pumping = true;
    requestAnimationFrame(pump);
  }
}
