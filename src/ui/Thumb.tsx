// A live, scaled-down render of a design. Rendered only while near the viewport so the
// gallery can scroll through thousands of designs smoothly.
import { useEffect, useRef } from 'react';
import type { Assets } from '../engine/exporter';
import type { Genome } from '../engine/genome';
import { FRAME_WIDTH, frameSheetOnly, paintScene, sharedSheets, thumbForSource, thumbHtmlForGenome } from '../engine/thumb';
import { cx } from './controls';

type Entry = { show: () => void; hide: () => void };
const entries = new WeakMap<Element, Entry>();
let io: IntersectionObserver | null = null;
function observer() {
  if (!io) {
    io = new IntersectionObserver(
      (list) => {
        for (const e of list) {
          const entry = entries.get(e.target);
          if (!entry) continue;
          if (e.isIntersecting) entry.show();
          else entry.hide();
        }
      },
      { rootMargin: '900px 0px' },
    );
  }
  return io;
}

export function Thumb({
  genome,
  source,
  assets,
  className,
  peek = true,
  lazy = true,
}: {
  genome?: Genome;
  source?: string;
  assets?: Assets;
  className?: string;
  peek?: boolean;
  lazy?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const key = genome ? JSON.stringify(genome) : source ?? '';

  useEffect(() => {
    const el = host.current!;
    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    let shown = false;
    let ro: ResizeObserver | null = null;

    const fit = () => {
      const frame = root.querySelector<HTMLElement>('.frame');
      if (frame) frame.style.setProperty('--s', String(el.clientWidth / FRAME_WIDTH));
    };

    const show = () => {
      if (shown) return;
      shown = true;
      if (genome) {
        root.adoptedStyleSheets = sharedSheets();
        root.innerHTML = thumbHtmlForGenome(genome);
      } else if (source) {
        const { html, css } = thumbForSource(source, assets ?? {});
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        root.adoptedStyleSheets = [sheet, frameSheetOnly()];
        root.innerHTML = html;
      }
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(el);
      el.classList.add('is-ready');
      paintScene(root, el.clientWidth / FRAME_WIDTH, () => shown);
    };
    const hide = () => {
      if (!shown) return;
      shown = false;
      ro?.disconnect();
      root.innerHTML = '';
      el.classList.remove('is-ready');
    };

    if (lazy) {
      entries.set(el, { show, hide });
      observer().observe(el);
    } else show();

    return () => {
      if (lazy) {
        observer().unobserve(el);
        entries.delete(el);
      }
      ro?.disconnect();
      shown = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lazy]);

  // Hover to "peek": the page scrolls slowly inside its frame.
  useEffect(() => {
    if (!peek) return;
    const el = host.current!;
    const card = el.closest('[data-peek]') ?? el;
    const enter = () => {
      const site = el.shadowRoot?.querySelector<HTMLElement>('.site');
      if (!site) return;
      const s = el.clientWidth / FRAME_WIDTH;
      const travel = Math.max(0, site.offsetHeight - el.clientHeight / s);
      site.style.setProperty('--peek-time', `${Math.min(9, 1.2 + travel / 900)}s`);
      site.style.translate = `0 ${-travel}px`;
    };
    const leave = () => {
      const site = el.shadowRoot?.querySelector<HTMLElement>('.site');
      if (!site) return;
      site.style.setProperty('--peek-time', '0.7s');
      site.style.translate = '0 0';
    };
    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
    return () => {
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
    };
  }, [peek, key]);

  return <div ref={host} className={cx('k-thumb', className)} />;
}
