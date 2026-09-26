// One of the 12 painted artworks, rendered with the real engine CSS in the piece's colors.
import { useEffect, useRef } from 'react';
import { sharedSheets } from '../engine/thumb';

export function ArtSwatch({ art, tokens, className }: { art: number; tokens: Record<string, string>; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const style = ['--bg', '--ink', '--accent'].map((k) => `${k}:${tokens[k] ?? ''}`).join(';');
  useEffect(() => {
    const el = ref.current!;
    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = sharedSheets();
    root.innerHTML = `<div class="site" style="${style};min-height:0;height:100%;background:none"><div class="art art-${art}" style="min-height:0;height:100%"></div></div>`;
  }, [art, style]);
  return <div ref={ref} className={className} />;
}
