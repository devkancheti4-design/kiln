import { useRef } from 'react';
import { TEXTURES } from '../engine/axes';
import { contrast, hexToOklch, isHex, oklchToHex, onAccent, withHue } from '../engine/color';
import { applyGenome, readAxes, readTokens, setSwitch, setToken, setTokens, syncFonts } from '../engine/patch';
import { PALETTES } from '../engine/palettes';
import { FACES, faceById, PAIRINGS, stackOf } from '../engine/typefaces';
import { cx, Segmented, Slider } from '../ui/controls';
import { CodeHint, PanelSection, parseNum } from './bits';
import { useStudio } from './state';

export function GlazePanel() {
  const { page, patch, seal } = useStudio();
  const src = page.source;
  const axes = readAxes(src, page.content);
  const t = readTokens(src);
  const mode = t['color-scheme'] === 'dark' ? 1 : 0;
  const bg = t['--bg'] ?? '#ffffff';
  const ink = t['--ink'] ?? '#111111';
  const accent = t['--accent'] ?? '#e2703a';

  const applyPalette = (p: number, m: number) =>
    patch((s) => applyGenome(s, { kind: 0, form: 0, palette: p, mode: m, type: 0, shape: 0, density: 0, texture: 0, motion: 0, scene: 0, interact: 0 }, ['palette', 'mode']));

  return (
    <>
      <PanelSection
        title="Glazes"
        aside={
          <Segmented
            size="sm"
            value={mode}
            onChange={(m) => applyPalette(axes.palette ?? 0, m)}
            options={[
              { value: 0, label: 'Light' },
              { value: 1, label: 'Dark' },
            ]}
            label="Light or dark"
          />
        }
      >
        <div className="s-glazes">
          {PALETTES.map((p, i) => {
            const sw = mode ? p.dark : p.light;
            return (
              <button key={p.id} type="button" className={cx('s-glaze', axes.palette === i && 'is-on')} onClick={() => applyPalette(i, mode)} data-tip={p.name} aria-label={p.name}>
                <span className="s-glaze-pot" style={{ background: sw.bg }}>
                  <i style={{ background: sw.accent }} />
                  <b style={{ background: sw.ink }} />
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Accent hue" hint={<CodeHint token="--accent" />}>
        <HueRing color={accent} onChange={(hex) => patch((s) => setToken(s, '--accent', hex), 'hue')} onCommit={seal} />
      </PanelSection>

      <PanelSection title="Your three colors">
        <div className="s-colors">
          <ColorRow label="Page" token="--bg" value={bg} onChange={(v, g) => patch((s) => setToken(s, '--bg', v), g)} />
          <ColorRow label="Text" token="--ink" value={ink} onChange={(v, g) => patch((s) => setToken(s, '--ink', v), g)} />
          <ColorRow label="Accent" token="--accent" value={accent} onChange={(v, g) => patch((s) => setToken(s, '--accent', v), g)} />
        </div>
        <Contrast bg={bg} ink={ink} accent={accent} />
        <button
          type="button"
          className="k-btn k-btn-sm"
          onClick={() => patch((s) => setTokens(s, { '--bg': ink, '--ink': bg, 'color-scheme': mode ? 'light' : 'dark' }))}
        >
          Swap page and text
        </button>
      </PanelSection>

      <PanelSection title="Type" hint={<CodeHint token="--font-display" />}>
        <div className="s-types">
          {PAIRINGS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={cx('s-type', axes.type === i && 'is-on')}
              onClick={() => patch((s) => applyGenome(s, { kind: 0, form: 0, palette: 0, mode: 0, type: i, shape: 0, density: 0, texture: 0, motion: 0, scene: 0, interact: 0 }, ['type']))}
            >
              <span className="s-type-aa" style={{ fontFamily: stackOf(p.display), fontWeight: p.weight, letterSpacing: p.tracking }}>
                Aa
              </span>
              <span className="s-type-name">{p.name}</span>
              <span className="s-type-fonts">
                {faceById(p.display).family}
                {p.body !== p.display ? ` + ${faceById(p.body).family}` : ''}
              </span>
            </button>
          ))}
        </div>
        <FontPicker label="Headings" token="--font-display" current={t['--font-display'] ?? ''} />
        <FontPicker label="Reading text" token="--font-body" current={t['--font-body'] ?? ''} />
        <Slider
          label="Heading weight"
          min={200}
          max={900}
          step={10}
          value={parseNum(t['--display-weight'] ?? null, 600)}
          onChange={(v) => patch((s) => setToken(s, '--display-weight', String(v)), 'weight')}
          onCommit={seal}
          marks={['thin', 'heavy']}
        />
        <Slider
          label="Letter spacing"
          min={-0.08}
          max={0.06}
          step={0.005}
          value={parseNum(t['--tracking'] ?? null, -0.02)}
          format={(v) => `${v.toFixed(3)}em`}
          onChange={(v) => patch((s) => setToken(s, '--tracking', `${+v.toFixed(3)}em`), 'tracking')}
          onCommit={seal}
          marks={['tight', 'loose']}
        />
      </PanelSection>

      <PanelSection title="Texture" hint={<CodeHint sw="texture" />}>
        <div className="s-textures">
          {TEXTURES.map((x, i) => (
            <button key={x.id} type="button" className={cx('s-tile s-tex-tile', axes.texture === i && 'is-on')} onClick={() => patch((s) => setSwitch(s, 'texture', x.id))}>
              <span className="s-tex" data-t={x.id} style={{ '--tbg': bg, '--tink': ink, '--tacc': accent } as React.CSSProperties} />
              <span>{x.name}</span>
            </button>
          ))}
        </div>
      </PanelSection>
    </>
  );
}

function FontPicker({ label, token, current }: { label: string; token: string; current: string }) {
  const { patch } = useStudio();
  const active = FACES.find((f) => current.includes(`"${f.family}"`));
  return (
    <label className="s-fontpick">
      <span>{label}</span>
      <select
        value={active?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          if (id) patch((s) => syncFonts(setToken(s, token, stackOf(id))));
        }}
      >
        {!active && <option value="">Custom</option>}
        {FACES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.family}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorRow({ label, token, value, onChange }: { label: string; token: string; value: string; onChange: (v: string, group?: string) => void }) {
  const hex = isHex(value) ? value : '#000000';
  return (
    <div className="s-color">
      <label className="s-color-swatch" style={{ background: value }}>
        <input type="color" value={hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex} onChange={(e) => onChange(e.target.value, `color${token}`)} aria-label={`${label} color`} />
      </label>
      <div className="s-color-text">
        <span>{label}</span>
        <code>{token}</code>
      </div>
      <input
        className="k-input s-color-hex k-mono"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.trim(), `hex${token}`)}
        aria-label={`${label} hex`}
      />
    </div>
  );
}

function Contrast({ bg, ink, accent }: { bg: string; ink: string; accent: string }) {
  if (![bg, ink, accent].every(isHex)) return null;
  const text = contrast(ink, bg);
  const button = contrast(onAccent(accent), accent);
  const grade = (r: number) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Large only' : 'Hard to read');
  return (
    <div className="s-contrast">
      <div className={cx('s-contrast-item', text < 4.5 && 'is-bad')}>
        <strong>{text.toFixed(1)}:1</strong>
        <span>text on page · {grade(text)}</span>
      </div>
      <div className={cx('s-contrast-item', button < 4.5 && 'is-bad')}>
        <strong>{button.toFixed(1)}:1</strong>
        <span>button label · {grade(button)}</span>
      </div>
    </div>
  );
}

/** Drag around the ring to turn the accent's hue; lightness and strength stay the same. */
function HueRing({ color, onChange, onCommit }: { color: string; onChange: (hex: string) => void; onCommit: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ok = isHex(color);
  const [L, C, H] = ok ? hexToOklch(color) : [0.62, 0.15, 30];
  const stops = Array.from({ length: 13 }, (_, i) => oklchToHex([L, Math.max(C, 0.06), i * 30])).join(', ');
  const setFrom = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    onChange(withHue(ok ? color : '#e2703a', (a + 360) % 360));
  };
  return (
    <div className="s-huering-wrap">
      <div
        ref={ref}
        className="s-huering"
        style={{ background: `conic-gradient(${stops})` }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFrom(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) setFrom(e);
        }}
        onPointerUp={onCommit}
        role="slider"
        aria-label="Accent hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(H)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(withHue(color, H + 5));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(withHue(color, H - 5));
        }}
      >
        <span className="s-huering-knob" style={{ transform: `rotate(${H}deg) translateY(-54px)`, background: color }} />
        <span className="s-huering-core" style={{ background: color }}>
          <b>{Math.round(H)}°</b>
        </span>
      </div>
      <p className="k-hint">
        Turn the ring to change only the hue. Lightness stays put, so buttons stay readable — this is <code>oklch</code> color at work.
      </p>
    </div>
  );
}
