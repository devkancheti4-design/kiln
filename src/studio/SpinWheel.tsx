// The potter's wheel. Flick it, drag it, or press Space: every notch that passes the pointer
// throws a new design. It slows with friction like a real wheel and settles on one.
import { useEffect, useRef } from 'react';

const DETENT = 26; // degrees per design
const FRICTION = 0.972;

export function SpinWheel({ onTick, onSettle, label = 'Spin' }: { onTick: () => void; onSettle: () => void; label?: string }) {
  const g = useRef<SVGGElement>(null);
  const hub = useRef<HTMLButtonElement>(null);
  const s = useRef({ angle: 0, vel: 0, raf: 0, drag: false, last: 0, lastT: 0, notch: 0, spinning: false, lastTick: 0 });
  const cb = useRef({ onTick, onSettle });
  cb.current = { onTick, onSettle };

  const paint = () => {
    if (g.current) g.current.style.transform = `rotate(${s.current.angle}deg)`;
  };

  const step = (t: number) => {
    const st = s.current;
    if (!st.drag) {
      st.angle += st.vel;
      st.vel *= FRICTION;
    }
    paint();
    const notch = Math.floor(st.angle / DETENT);
    if (notch !== st.notch) {
      st.notch = notch;
      if (t - st.lastTick > 55) {
        st.lastTick = t;
        cb.current.onTick();
        hub.current?.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 120 });
      }
    }
    if (st.drag || Math.abs(st.vel) > 0.08) st.raf = requestAnimationFrame(step);
    else {
      st.spinning = false;
      st.vel = 0;
      cb.current.onSettle();
    }
  };

  const kick = (v = 16 + Math.random() * 14) => {
    const st = s.current;
    st.vel += v;
    if (!st.spinning) {
      st.spinning = true;
      cancelAnimationFrame(st.raf);
      st.raf = requestAnimationFrame(step);
    }
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el?.closest?.('input, textarea, button, select, [contenteditable="true"], .cm-editor')) return;
      e.preventDefault();
      kick();
    };
    addEventListener('keydown', on);
    const st = s.current;
    return () => {
      removeEventListener('keydown', on);
      cancelAnimationFrame(st.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const angleAt = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const ticks = Array.from({ length: 48 }, (_, i) => i);

  return (
    <div
      className="s-wheel"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.s-wheel-hub')) return;
        const st = s.current;
        st.drag = true;
        st.last = angleAt(e);
        st.lastT = performance.now();
        st.vel = 0;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        if (!st.spinning) {
          st.spinning = true;
          st.raf = requestAnimationFrame(step);
        }
      }}
      onPointerMove={(e) => {
        const st = s.current;
        if (!st.drag) return;
        const a = angleAt(e);
        let d = a - st.last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        const now = performance.now();
        const dt = Math.max(1, now - st.lastT);
        st.angle += d;
        st.vel = (d / dt) * 16;
        st.last = a;
        st.lastT = now;
      }}
      onPointerUp={() => {
        s.current.drag = false;
      }}
      onPointerCancel={() => {
        s.current.drag = false;
      }}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="clay" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="var(--k-clay-2)" />
            <stop offset="70%" stopColor="var(--k-clay)" />
            <stop offset="100%" stopColor="#8a3a18" />
          </radialGradient>
          <radialGradient id="plate" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--k-raised)" />
            <stop offset="100%" stopColor="var(--k-bg-2)" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="97" fill="url(#plate)" stroke="var(--k-line-2)" />
        <g ref={g} className="s-wheel-rot" style={{ transformOrigin: '100px 100px' }}>
          {ticks.map((i) => (
            <line
              key={i}
              x1="100"
              y1={i % 4 === 0 ? 7 : 10}
              x2="100"
              y2="18"
              stroke={i % 4 === 0 ? 'var(--k-text-2)' : 'var(--k-line-2)'}
              strokeWidth={i % 4 === 0 ? 2 : 1.4}
              strokeLinecap="round"
              transform={`rotate(${i * 7.5} 100 100)`}
            />
          ))}
          <circle cx="100" cy="100" r="74" fill="none" stroke="var(--k-line)" strokeWidth="1" />
          <circle cx="100" cy="100" r="62" fill="url(#clay)" />
          <path d="M100 58 C 126 58, 142 78, 142 100 C 142 126, 120 138, 100 138 C 80 138, 70 124, 70 108 C 70 92, 84 86, 96 88 C 108 90, 112 100, 106 108" fill="none" stroke="rgba(255,240,228,0.35)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="100" cy="46" r="3" fill="var(--k-text)" />
        </g>
        <polygon points="92,0 108,0 100,12" fill="var(--k-text)" />
      </svg>
      <button ref={hub} type="button" className="s-wheel-hub" onClick={() => kick()} aria-label="Spin the wheel for a new design">
        <span>{label}</span>
        <kbd>Space</kbd>
      </button>
    </div>
  );
}
