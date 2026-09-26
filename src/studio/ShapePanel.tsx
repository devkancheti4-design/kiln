import { useMemo } from 'react';
import { usePref } from '../app/prefs';
import { DENSITIES, FORMS, INTERACTIONS, MOTIONS, SCENES, SHAPES } from '../engine/axes';
import { type Axis, AXIS_LABEL, randomGenome } from '../engine/genome';
import { applyGenome, readAxes, readTokens, setSwitch, setToken } from '../engine/patch';
import { sceneSnapshot } from '../engine/scene';
import { FormSketch } from '../pages/Wheel';
import { cx, Segmented, Slider } from '../ui/controls';
import { IconLock, IconUnlock } from '../ui/icons';
import { CodeHint, PanelSection, parseNum } from './bits';
import { SpinWheel } from './SpinWheel';
import { useStudio } from './state';

const SPIN_AXES: Axis[] = ['form', 'palette', 'mode', 'type', 'shape', 'density', 'texture', 'motion', 'scene', 'interact'];

export function ShapePanel() {
  const { page, patch, seal } = useStudio();
  const src = page.source;
  const axes = readAxes(src, page.content);
  const t = readTokens(src);
  const [locks, setLocks] = usePref<Partial<Record<Axis, boolean>>>('locks', {});

  const spin = () => {
    const free = SPIN_AXES.filter((a) => !locks[a]);
    if (!free.length) return;
    patch((s) => applyGenome(s, randomGenome(), free), 'spin');
  };

  const radius = parseNum(t['--radius'] ?? null, 16);
  const pill = radius >= 999;
  const space = parseNum(t['--space'] ?? null, 1);
  const scale = parseNum(t['--scale'] ?? null, 1.28);
  const width = parseNum(t['--width'] ?? null, 1180);

  const colors = { bg: t['--bg'] ?? '#ffffff', ink: t['--ink'] ?? '#111111', accent: t['--accent'] ?? '#e2703a' };
  const shots = useMemo(
    () => SCENES.map((s) => (s.id === 'none' ? null : sceneSnapshot(s.id, colors, 216, 150))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.bg, colors.ink, colors.accent],
  );

  return (
    <>
      <PanelSection title="Spin the wheel">
        <div className="s-spin">
          <SpinWheel onTick={spin} onSettle={seal} />
          <div className="s-spin-side">
            <p className="k-hint">Flick the wheel or press Space. Lock what you love — the wheel only changes what is unlocked. Your words never change.</p>
            <div className="s-locks">
              {SPIN_AXES.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={cx('s-lock', locks[a] && 'is-locked')}
                  onClick={() => setLocks((l) => ({ ...l, [a]: !l[a] }))}
                  aria-pressed={!!locks[a]}
                >
                  {locks[a] ? <IconLock size={13} /> : <IconUnlock size={13} />}
                  {AXIS_LABEL[a]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Form" hint={<CodeHint sw="form" />}>
        <div className="s-forms">
          {FORMS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className={cx('s-tile', axes.form === i && 'is-on')}
              onClick={() => patch((s) => applyGenome(s, { ...randomGenome(), form: i }, ['form']))}
              data-tip={f.note}
            >
              <FormSketch form={i} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="3D scene" hint={<CodeHint sw="scene" />}>
        <div className="s-scenes">
          {SCENES.map((sc, i) => (
            <button
              key={sc.id}
              type="button"
              className={cx('s-tile s-scene-tile', axes.scene === i && 'is-on')}
              onClick={() => patch((s) => setSwitch(s, 'scene', sc.id))}
              data-tip={sc.note}
            >
              {shots[i] ? <img src={shots[i]!} alt="" /> : <span className="s-scene-flat" style={{ background: colors.bg, color: colors.accent }}>◐</span>}
              <span>{sc.name}</span>
            </button>
          ))}
        </div>
        <p className="k-hint">Real-time WebGL, shipped inside your site. The light follows the visitor’s cursor.</p>
      </PanelSection>

      <PanelSection title="Cursor" hint={<CodeHint sw="interact" />}>
        <Segmented
          value={axes.interact}
          onChange={(v) => patch((s) => setSwitch(s, 'interact', INTERACTIONS[v].id))}
          options={INTERACTIONS.map((x, i) => ({ value: i, label: x.name, tip: x.note }))}
          label="Cursor"
        />
      </PanelSection>

      <PanelSection title="Corners" hint={<CodeHint token="--radius" />}>
        <Segmented
          value={axes.shape}
          onChange={(v) => patch((s) => setToken(s, '--radius', SHAPES[v].radius))}
          options={SHAPES.map((x, i) => ({ value: i, label: x.name }))}
          label="Corners"
        />
        <Slider
          label="Radius"
          min={0}
          max={44}
          step={1}
          value={pill ? 44 : radius}
          format={(v) => (v >= 44 ? 'pill' : `${v}px`)}
          onChange={(v) => patch((s) => setToken(s, '--radius', v >= 44 ? '999px' : `${v}px`), 'radius')}
          onCommit={seal}
        />
      </PanelSection>

      <PanelSection title="Spacing" hint={<CodeHint token="--space" />}>
        <Segmented
          value={axes.density}
          onChange={(v) => patch((s) => setToken(s, '--space', DENSITIES[v].space))}
          options={DENSITIES.map((x, i) => ({ value: i, label: x.name }))}
          label="Spacing"
        />
        <Slider label="Breathing room" min={0.6} max={1.7} step={0.05} value={space} format={(v) => v.toFixed(2)} onChange={(v) => patch((s) => setToken(s, '--space', String(+v.toFixed(2))), 'space')} onCommit={seal} marks={['compact', 'airy']} />
      </PanelSection>

      <PanelSection title="Headings" hint={<CodeHint token="--scale" />}>
        <Slider label="Scale" min={1.1} max={1.7} step={0.01} value={scale} format={(v) => v.toFixed(2)} onChange={(v) => patch((s) => setToken(s, '--scale', String(+v.toFixed(2))), 'scale')} onCommit={seal} marks={['calm', 'loud']} />
      </PanelSection>

      <PanelSection title="Page width" hint={<CodeHint token="--width" />}>
        <Slider label="Widest" min={640} max={1680} step={10} value={width} format={(v) => `${v}px`} onChange={(v) => patch((s) => setToken(s, '--width', `${v}px`), 'width')} onCommit={seal} marks={['narrow', 'wide']} />
      </PanelSection>

      <PanelSection title="Motion" hint={<CodeHint sw="motion" />}>
        <Segmented value={axes.motion} onChange={(v) => patch((s) => setSwitch(s, 'motion', MOTIONS[v].id))} options={MOTIONS.map((x, i) => ({ value: i, label: x.name }))} label="Motion" />
        <p className="k-hint">Scroll the preview to see sections arrive.</p>
      </PanelSection>
    </>
  );
}
