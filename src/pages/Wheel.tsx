// The Wheel: the whole catalog, browsable. Every card is a real, live website.
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePref } from '../app/prefs';
import { clampNumber, randomNumber } from '../app/pieces';
import { go } from '../app/router';
import { DENSITIES, FORMS, INTERACTIONS, SCENES, SHAPES, TEXTURES } from '../engine/axes';
import { type Axis, type Filters, type Genome, TOTAL, browse, formatNumber, genomeAt, numberOf, spaceSize } from '../engine/genome';
import { KINDS } from '../engine/kinds';
import { PALETTES, swatchOf } from '../engine/palettes';
import { tokensFor } from '../engine/render';
import { PAIRINGS, faceById } from '../engine/typefaces';
import { Select, cx } from '../ui/controls';
import { IconArrowRight, IconCopy, IconDownload, IconFire, IconGuide, IconSearch, IconShuffle, IconWheel } from '../ui/icons';
import { toast } from '../ui/controls';
import { Thumb } from '../ui/Thumb';

const PAGE = 36;
/** Clay & Co. · Split · Terracotta · a vase turning on the wheel — the showcase opens here. */
const PRESET_START = 329_208_973;

export function Wheel() {
  const [filters, setFilters] = usePref<Filters>('filters', {});
  const [seed, setSeed] = usePref<number>('seed', 20260926);
  const [count, setCount] = useState(PAGE);
  const size = spaceSize(filters);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(PAGE), [filters, seed]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setCount((c) => Math.min(size, c + PAGE));
    }, { rootMargin: '1400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [size]);

  const designs = useMemo(() => {
    const out: Genome[] = [];
    for (let i = 0; i < Math.min(count, size); i++) out.push(browse(i, filters, seed));
    return out;
  }, [count, size, filters, seed]);

  const setAxis = (axis: Axis, v: number | null) =>
    setFilters((f) => {
      const next = { ...f };
      if (v === null) delete next[axis];
      else next[axis] = v;
      return next;
    });

  const active = Object.keys(filters).length;

  return (
    <main className="k-page k-wheel">
      <Hero />
      <DailyDrop />

      <div className="k-filterbar" id="browse">
        <div className="k-filters">
          <Select label="Kind" value={filters.kind ?? null} onChange={(v) => setAxis('kind', v)} options={KINDS.map((k, i) => ({ value: i, label: k.name }))} />
          <Select
            label="Form"
            value={filters.form ?? null}
            onChange={(v) => setAxis('form', v)}
            options={FORMS.map((f, i) => ({ value: i, label: f.name, swatch: <FormSketch form={i} small /> }))}
          />
          <Select
            label="Glaze"
            value={filters.palette ?? null}
            onChange={(v) => setAxis('palette', v)}
            options={PALETTES.map((p, i) => ({ value: i, label: p.name, swatch: <Dots palette={i} mode={filters.mode ?? 0} /> }))}
          />
          <Select label="Mood" value={filters.mode ?? null} onChange={(v) => setAxis('mode', v)} options={[{ value: 0, label: 'Light' }, { value: 1, label: 'Dark' }]} />
          <Select
            label="Type"
            value={filters.type ?? null}
            onChange={(v) => setAxis('type', v)}
            options={PAIRINGS.map((p, i) => ({ value: i, label: `${p.name} · ${faceById(p.display).family}` }))}
          />
          <Select label="Texture" value={filters.texture ?? null} onChange={(v) => setAxis('texture', v)} options={TEXTURES.map((t, i) => ({ value: i, label: t.name }))} />
          <Select label="3D" value={filters.scene ?? null} onChange={(v) => setAxis('scene', v)} options={SCENES.map((t, i) => ({ value: i, label: `${t.name} — ${t.note}` }))} />
          <Select label="Cursor" value={filters.interact ?? null} onChange={(v) => setAxis('interact', v)} options={INTERACTIONS.map((t, i) => ({ value: i, label: `${t.name} — ${t.note}` }))} />
          {active > 0 && (
            <button type="button" className="k-btn k-btn-ghost k-btn-sm" onClick={() => setFilters({})}>
              Clear
            </button>
          )}
        </div>
        <div className="k-filter-right">
          <span className="k-count k-num">
            <strong>{formatNumber(size)}</strong> {size === 1 ? 'design' : 'designs'}
          </span>
          <button type="button" className="k-icon-btn" data-tip="Shuffle the order" onClick={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}>
            <IconShuffle />
          </button>
          <JumpTo />
        </div>
      </div>

      <div className="k-grid">
        {designs.map((g) => (
          <DesignCard key={numberOf(g)} genome={g} />
        ))}
      </div>
      {count < size && <div ref={sentinel} className="k-sentinel" />}
      {count >= size && (
        <p className="k-end">
          That is every design with these filters — {formatNumber(size)} of them. <button type="button" className="k-link" onClick={() => setFilters({})}>Clear filters</button>
        </p>
      )}
    </main>
  );
}

// ------------------------------------------------------------------ hero

const MORPH_AXES: Axis[] = ['scene', 'form', 'palette', 'type', 'scene', 'form', 'shape', 'texture', 'mode', 'form', 'scene', 'density', 'palette'];

function describeChange(axis: Axis, a: Genome, b: Genome): { minus: string; plus: string; where: string } {
  const ta = tokensFor(a);
  const tb = tokensFor(b);
  switch (axis) {
    case 'form':
      return { where: '<body>', minus: `data-form="${FORMS[a.form].id}"`, plus: `data-form="${FORMS[b.form].id}"` };
    case 'texture':
      return { where: '<body>', minus: `data-texture="${TEXTURES[a.texture].id}"`, plus: `data-texture="${TEXTURES[b.texture].id}"` };
    case 'palette':
      return { where: 'tokens', minus: `--accent: ${ta['--accent']};`, plus: `--accent: ${tb['--accent']};` };
    case 'mode':
      return { where: 'tokens', minus: `--bg: ${ta['--bg']};`, plus: `--bg: ${tb['--bg']};` };
    case 'type':
      return { where: 'tokens', minus: `--font-display: "${faceById(PAIRINGS[a.type].display).family}";`, plus: `--font-display: "${faceById(PAIRINGS[b.type].display).family}";` };
    case 'shape':
      return { where: 'tokens', minus: `--radius: ${SHAPES[a.shape].radius};`, plus: `--radius: ${SHAPES[b.shape].radius};` };
    case 'density':
      return { where: 'tokens', minus: `--space: ${DENSITIES[a.density].space};`, plus: `--space: ${DENSITIES[b.density].space};` };
    case 'scene':
      return { where: '<body>', minus: `data-scene="${SCENES[a.scene].id}"`, plus: `data-scene="${SCENES[b.scene].id}"` };
    default:
      return { where: '', minus: '', plus: '' };
  }
}

function Hero() {
  const start = useMemo(() => genomeAt(PRESET_START), []);
  const [layers, setLayers] = useState<[Genome, Genome]>([start, start]);
  const [front, setFront] = useState(0);
  const [change, setChange] = useState<{ minus: string; plus: string; where: string } | null>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const counter = useCountUp(TOTAL);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      const axis = MORPH_AXES[step % MORPH_AXES.length];
      const cur = layers[front];
      const size = { form: FORMS.length, palette: PALETTES.length, type: PAIRINGS.length, shape: SHAPES.length, texture: TEXTURES.length, mode: 2, density: DENSITIES.length, scene: SCENES.length } as Record<Axis, number>;
      let v = cur[axis];
      while (v === cur[axis]) v = Math.floor(Math.random() * size[axis]);
      const next = { ...cur, [axis]: v };
      const back = 1 - front;
      setLayers((l) => {
        const copy: [Genome, Genome] = [...l] as [Genome, Genome];
        copy[back] = next;
        return copy;
      });
      setChange(describeChange(axis, cur, next));
      setTimeout(() => setFront(back), 60);
      setStep((s) => s + 1);
    }, step === 0 ? 1400 : 2600);
    return () => clearTimeout(t);
  }, [step, paused, layers, front]);

  return (
    <section className="k-hero">
      <div className="k-hero-copy">
        <p className="k-eyebrow">Offline · Free · No AI · No account</p>
        <h1 className="k-h1">
          <span className="k-num">{counter}</span> websites.
          <br />
          Pick one. <em>Make it yours.</em>
        </h1>
        <p className="k-lede">
          Every site here already exists — real HTML you own. Spin the wheel, carve your name in, and learn to change the code with a guide that shows you how
          one line transforms everything.
        </p>
        <div className="k-hero-actions">
          <button type="button" className="k-btn k-btn-primary k-btn-lg" onClick={() => go(`design/${randomNumber()}`)}>
            <IconWheel />
            Spin the wheel
          </button>
          <a className="k-btn k-btn-lg" href="#/guide">
            <IconGuide />
            How the code works
          </a>
          {import.meta.env.MODE === 'production' && (
            <a className="k-btn k-btn-lg k-btn-ghost" href="./Kiln.html" download="Kiln.html" data-tip="One 2 MB file — double-click it, works without internet">
              <IconDownload />
              Offline app
            </a>
          )}
        </div>
        <ol className="k-steps">
          <li><strong>Shape</strong> pick a form</li>
          <li><strong>Glaze</strong> paint it</li>
          <li><strong>Carve</strong> your name</li>
          <li><strong>Code</strong> change anything</li>
          <li><strong>Fire</strong> download it</li>
        </ol>
      </div>

      <div className="k-morph" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="k-morph-window">
          <div className="k-morph-chrome">
            <i />
            <i />
            <i />
            <span>index.html</span>
          </div>
          <div className="k-morph-stage">
            {layers.map((g, i) => (
              <button
                type="button"
                key={i}
                className={cx('k-morph-layer', i === front && 'is-front')}
                onClick={() => go(`design/${numberOf(layers[front])}`)}
                aria-label="Open this design in the studio"
              >
                <Thumb genome={g} lazy={false} peek={false} />
              </button>
            ))}
          </div>
        </div>
        <div className="k-diff" key={step} aria-live="polite">
          <div className="k-diff-head">
            <span>{change ? 'One line changed' : 'Watch the code'}</span>
            <span className="k-diff-where">{change?.where ?? 'index.html'}</span>
          </div>
          {change ? (
            <>
              <code className="k-diff-minus">- {change.minus}</code>
              <code className="k-diff-plus">+ {change.plus}</code>
            </>
          ) : (
            <>
              <code className="k-diff-plus">&lt;body data-form="{FORMS[start.form].id}" data-scene="{SCENES[start.scene].id}"&gt;</code>
              <code className="k-diff-note">Every few seconds one line of this file changes…</code>
            </>
          )}
        </div>
        <p className="k-morph-caption">
          Same words. Same file. <strong>{paused ? 'Click to open this one.' : 'A different website.'}</strong>
        </p>
      </div>
    </section>
  );
}

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / 1600));
      const e = 1 - (1 - p) ** 4;
      setN(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return formatNumber(n);
}

// ------------------------------------------------------------------ cards

function DesignCard({ genome }: { genome: Genome }) {
  const n = numberOf(genome);
  const sw = swatchOf(genome.palette, genome.mode);
  return (
    <a className="k-card" href={`#/design/${n}`} data-peek>
      <Thumb genome={genome} className="k-card-thumb" />
      <div className="k-card-meta">
        <span className="k-card-no k-num">No. {formatNumber(n)}</span>
        <span className="k-card-tags">
          {KINDS[genome.kind].name} · {FORMS[genome.form].name}
        </span>
        <span className="k-dots" aria-hidden="true">
          <i style={{ background: sw.bg }} />
          <i style={{ background: sw.accent }} />
          <i style={{ background: sw.ink }} />
        </span>
      </div>
      <span className="k-card-open">
        Open <IconArrowRight size={14} />
      </span>
    </a>
  );
}

export function Dots({ palette, mode }: { palette: number; mode: number }) {
  const sw = swatchOf(palette, mode);
  return (
    <span className="k-dots" aria-hidden="true">
      <i style={{ background: sw.bg }} />
      <i style={{ background: sw.accent }} />
      <i style={{ background: sw.ink }} />
    </span>
  );
}

export function FormSketch({ form, small }: { form: number; small?: boolean }) {
  const tone = ['var(--k-line-2)', 'var(--k-text-2)', 'var(--k-clay)'];
  return (
    <svg className={cx('k-sketch', small && 'k-sketch-sm')} viewBox="0 0 64 44" aria-hidden="true">
      <rect x="0.5" y="0.5" width="63" height="43" rx="5" fill="none" stroke="var(--k-line-2)" />
      {FORMS[form].sketch.map(([x, y, w, h, t], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={1.5} fill={tone[t]} />
      ))}
    </svg>
  );
}

function JumpTo() {
  const [value, setValue] = useState('');
  return (
    <form
      className="k-jump"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseInt(value.replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n)) go(`design/${clampNumber(n)}`);
      }}
    >
      <IconSearch size={15} />
      <input className="k-num" inputMode="numeric" placeholder="Go to No." value={value} onChange={(e) => setValue(e.target.value)} aria-label="Go to design number" />
    </form>
  );
}

// ------------------------------------------------------------------ daily drop

const DAILY_SEED = 0x6b696c6e; // "kiln" — the same drop for everyone, everywhere
const DAILY_COUNT = 12;
const EPOCH = Date.UTC(2026, 0, 1);

/** Days since 1 Jan 2026 in the visitor's own calendar. */
export function dayNumber(d = new Date()): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86_400_000);
}

export function dailyDesigns(day: number): Genome[] {
  return Array.from({ length: DAILY_COUNT }, (_, i) => browse(day * DAILY_COUNT + i, {}, DAILY_SEED));
}

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const left = Math.max(0, next.getTime() - now.getTime());
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return { day: dayNumber(now), text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` };
}

function shareText(n: number, day: number): string {
  const link = /^https?:/.test(location.protocol) ? ` ${location.origin}${location.pathname}#/design/${n}` : '';
  return `Kiln Daily #${day + 1} — I picked No. ${formatNumber(n)} 🏺${link}`;
}

function DailyDrop() {
  const { day, text } = useCountdown();
  const designs = useMemo(() => dailyDesigns(day), [day]);
  const [streak, setStreak] = usePref<{ last: number; count: number }>('streak', { last: -1, count: 0 });

  useEffect(() => {
    if (streak.last === day) return;
    setStreak({ last: day, count: streak.last === day - 1 ? streak.count + 1 : 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <section className="dd" aria-labelledby="dd-title">
      <header className="dd-head">
        <div>
          <p className="k-eyebrow">
            <IconFire size={13} /> Kiln Daily #{day + 1} · {date}
          </p>
          <h2 id="dd-title" className="k-h2">
            Today’s firing: {DAILY_COUNT} fresh sites
          </h2>
          <p className="dd-sub">The same {DAILY_COUNT} for everyone in the world today — pick one, make it yours, compare with friends. New batch in <span className="k-num dd-clock">{text}</span>.</p>
        </div>
        <div className="dd-streak" data-tip="Days in a row you opened the kiln">
          <strong className="k-num">{Math.max(1, streak.count)}</strong>
          <span>day streak</span>
        </div>
      </header>
      <div className="dd-row">
        {designs.map((g, i) => {
          const n = numberOf(g);
          return (
            <div key={n} className="dd-card" data-peek>
              <a href={`#/design/${n}`} className="dd-link">
                <span className="dd-rank">{String(i + 1).padStart(2, '0')}</span>
                <Thumb genome={g} className="k-card-thumb" />
              </a>
              <div className="k-card-meta">
                <span className="k-card-no k-num">No. {formatNumber(n)}</span>
                <span className="k-card-tags">
                  {KINDS[g.kind].name} · {FORMS[g.form].name}
                  {g.scene ? ` · 3D ${SCENES[g.scene].name}` : ''}
                </span>
                <button
                  type="button"
                  className="k-icon-btn dd-share"
                  aria-label="Copy a share message"
                  data-tip="Copy share text"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareText(n, day)).then(
                      () => toast('Copied — paste it anywhere.'),
                      () => toast(shareText(n, day)),
                    );
                  }}
                >
                  <IconCopy size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
