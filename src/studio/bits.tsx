import type { ReactNode } from 'react';
import { getSwitch, getToken, type SwitchName, switchValueRange, tokenValueRange } from '../engine/patch';
import { IconCode } from '../ui/icons';
import { useStudio } from './state';

/** The exact line of code a control edits, with a jump into the editor. */
export function CodeHint({ token, sw }: { token?: string; sw?: SwitchName }) {
  const { doc, goToCode } = useStudio();
  const src = doc.source;
  const range = token ? tokenValueRange(src, token) : sw ? switchValueRange(src, sw) : null;
  const value = token ? getToken(src, token) : sw ? getSwitch(src, sw) : null;
  const text = token ? (
    <>
      <span className="t-prop">{token}</span>: <span className="t-val">{value ?? '—'}</span>;
    </>
  ) : (
    <>
      <span className="t-attr">data-{sw}</span>=<span className="t-str">"{value ?? 'none'}"</span>
    </>
  );
  return (
    <button type="button" className="s-codehint" onClick={() => range && goToCode(range.from, [range.from, range.to])} data-tip="Show me this line in the code" disabled={!range}>
      <code>{text}</code>
      <IconCode size={14} />
    </button>
  );
}

export function PanelSection({ title, children, hint, aside }: { title: string; children: ReactNode; hint?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="s-sec">
      <header className="s-sec-head">
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
      {hint}
    </section>
  );
}

export const parseNum = (v: string | null, fallback: number) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : fallback;
};
