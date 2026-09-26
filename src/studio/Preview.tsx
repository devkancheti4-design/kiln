// The live preview: the real file in a frame, updated in place (styles, switches, markup) when
// possible, and double-buffered when it has to reload — so it never flickers or loses scroll.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Assets } from '../engine/exporter';
import { markupRange } from '../engine/patch';
import { annotatedMarkup, planUpdate, previewDocument } from '../engine/preview';
import { cx, toast } from '../ui/controls';

export type Device = 'desktop' | 'tablet' | 'phone';

const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 834, phone: 390 };

export interface PickInfo {
  offset: number; // absolute offset in source
  label: string;
  classes: string[];
  tag: string;
}

interface Kiln {
  inspect?: boolean;
  onPick?: (p: { offset: number; label: string; classes: string[]; tag: string }) => void;
  onLink?: (href: string) => void;
  setInspect: (on: boolean) => void;
  highlight: (offset: number | null) => void;
  setStyle: (id: string, css: string) => void;
  setBodyAttrs: (attrs: Record<string, string>) => void;
  swapMarkup: (html: string) => void;
  revealAll: () => void;
}

export function Preview({
  source,
  assets,
  device,
  inspect,
  highlight,
  onPick,
}: {
  source: string;
  assets: Assets;
  device: Device;
  inspect: boolean;
  highlight: number | null; // absolute offset of a tag to outline, or null
  onPick: (p: PickInfo) => void;
}) {
  const frames = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)];
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const shown = useRef<string | null>(null); // source currently shown in the front frame
  const loading = useRef<{ frame: number; source: string } | null>(null);
  const pending = useRef<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 700 });
  const latest = useRef({ source, assets, inspect, highlight, onPick });
  latest.current = { source, assets, inspect, highlight, onPick };

  const kiln = (i = frontRef.current): Kiln | null => {
    const w = frames[i].current?.contentWindow as (Window & { __kiln?: Kiln }) | null;
    return w?.__kiln ?? null;
  };

  const wire = (k: Kiln) => {
    k.onPick = (p) => {
      const r = markupRange(latest.current.source);
      latest.current.onPick({ ...p, offset: (r?.from ?? 0) + p.offset });
    };
    k.onLink = (href) => toast(<>Links to other pages open in your downloaded site — <code className="k-code-inline">{href.slice(0, 40)}</code></>);
    k.setInspect(latest.current.inspect);
    applyHighlight(k);
  };

  const applyHighlight = (k: Kiln) => {
    const h = latest.current.highlight;
    if (h === null) return k.highlight(null);
    const r = markupRange(latest.current.source);
    k.highlight(r ? h - r.from : null);
  };

  const load = (src: string) => {
    const back = shown.current === null ? frontRef.current : 1 - frontRef.current;
    const iframe = frames[back].current;
    if (!iframe) return;
    loading.current = { frame: back, source: src };
    const prevScroll = shown.current === null ? 0 : (frames[frontRef.current].current?.contentWindow?.scrollY ?? 0);
    const first = shown.current === null;
    iframe.onload = () => {
      if (loading.current?.frame !== back || loading.current.source !== src) return;
      loading.current = null;
      const k = kiln(back);
      if (k) {
        wire(k);
        if (!first) k.revealAll();
      }
      iframe.contentWindow?.scrollTo(0, prevScroll);
      shown.current = src;
      frontRef.current = back;
      setFront(back);
      if (pending.current !== null && pending.current !== src) {
        const next = pending.current;
        pending.current = null;
        sync(next);
      }
    };
    iframe.srcdoc = previewDocument(src, latest.current.assets);
  };

  const sync = (src: string) => {
    if (loading.current) {
      pending.current = src;
      return;
    }
    const prev = shown.current;
    if (prev === null) return load(src);
    const plan = planUpdate(prev, src);
    if (plan.kind === 'none') return;
    const k = kiln();
    if (plan.kind === 'reload' || !k) return load(src);
    if (plan.tokens !== undefined) k.setStyle('tokens', plan.tokens);
    if (plan.engine !== undefined) k.setStyle('engine', plan.engine);
    if (plan.attrs) k.setBodyAttrs(plan.attrs);
    if (plan.markup) {
      // markup may reference pictures; resolve them for the frame
      let html = annotatedMarkup(src);
      for (const [path, url] of Object.entries(latest.current.assets)) if (html.includes(path)) html = html.split(path).join(url);
      k.swapMarkup(html);
      applyHighlight(k);
    }
    shown.current = src;
  };

  useEffect(() => {
    sync(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // New pictures need a reload (their data URLs are resolved into the document).
  const assetKeys = Object.keys(assets).join('|');
  useEffect(() => {
    if (shown.current !== null) load(latest.current.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKeys]);

  useEffect(() => {
    kiln()?.setInspect(inspect);
  }, [inspect]);

  useEffect(() => {
    const k = kiln();
    if (k) applyHighlight(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  useLayoutEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fit the device into the stage. On a real phone, "phone" simply fills the screen.
  const native = device === 'phone' && box.w < 480;
  const pad = device === 'desktop' || native ? 0 : 28;
  const availW = Math.max(200, box.w - pad * 2);
  const availH = Math.max(200, box.h - pad * 2);
  let width = DEVICE_WIDTH[device];
  if (device === 'desktop' && availW >= width) width = availW;
  let scale = Math.min(1, availW / width);
  let height = device === 'desktop' ? availH / scale : device === 'phone' ? 844 : 1112;
  if (native) {
    width = availW;
    height = availH;
    scale = 1;
  } else if (device !== 'desktop') {
    scale = Math.min(scale, availH / height);
    if (scale * height < availH && device === 'tablet') height = availH / scale;
  }

  return (
    <div ref={wrap} className={cx('s-preview', native ? 'is-desktop' : `is-${device}`, inspect && 'is-inspecting')}>
      <div
        className="s-device"
        style={{ width: width * scale, height: height * scale }}
      >
        <div className="s-device-inner" style={{ width, height, transform: `scale(${scale})` }}>
          {frames.map((ref, i) => (
            <iframe
              key={i}
              ref={ref}
              title={i === front ? 'Live preview of your site' : 'Preview buffer'}
              className={cx('s-frame', i === front && 'is-front')}
              aria-hidden={i !== front}
              tabIndex={i === front ? 0 : -1}
            />
          ))}
        </div>
      </div>
      {scale < 0.999 && device === 'desktop' && <span className="s-scale-note">{Math.round(scale * 100)}% of 1280px</span>}
    </div>
  );
}
