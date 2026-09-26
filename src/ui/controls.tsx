import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconChevronDown, IconX } from './icons';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  label,
}: {
  value: T | null;
  options: { value: T; label: ReactNode; tip?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div className={cx('k-seg', size === 'sm' && 'k-seg-sm')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx('k-seg-item', value === o.value && 'is-on')}
          onClick={() => onChange(o.value)}
          data-tip={o.tip}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  format,
  hint,
  marks,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  format?: (v: number) => string;
  hint?: ReactNode;
  marks?: [string, string];
}) {
  const id = useId();
  const pct = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100;
  return (
    <div className="k-slider">
      <div className="k-slider-top">
        <label htmlFor={id}>{label}</label>
        <output>{format ? format(value) : value}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      {marks && (
        <div className="k-slider-marks">
          <span>{marks[0]}</span>
          <span>{marks[1]}</span>
        </div>
      )}
      {hint && <p className="k-hint">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  hint,
  type = 'text',
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  type?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="k-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="k-hint">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="k-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="k-toggle-track" aria-hidden="true">
        <span className="k-toggle-thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function Section({ title, icon, children, aside, id }: { title: string; icon?: ReactNode; children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <section className="k-sec" id={id}>
      <header className="k-sec-head">
        {icon}
        <h3>{title}</h3>
        {aside && <div className="k-sec-aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ select menu

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  placeholder = 'Any',
}: {
  value: T | null;
  options: { value: T; label: string; swatch?: ReactNode }[];
  onChange: (v: T | null) => void;
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const r = btn.current!.getBoundingClientRect();
    setPos({ left: Math.min(r.left, innerWidth - 260), top: r.bottom + 6 });
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      setOpen(false);
    };
    addEventListener('keydown', close);
    addEventListener('resize', close);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" className={cx('k-select', value !== null && 'is-set')} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="k-select-label">{label}</span>
        <span className="k-select-value">
          {current?.swatch}
          {current ? current.label : placeholder}
        </span>
        <IconChevronDown size={14} />
      </button>
      {open &&
        createPortal(
          <div className="k-menu-scrim" onPointerDown={() => setOpen(false)}>
            <div className="k-menu" role="listbox" style={{ left: pos.left, top: pos.top }} onPointerDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={cx('k-menu-item', value === null && 'is-on')}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span>{placeholder}</span>
                {value === null && <IconCheck size={14} />}
              </button>
              <div className="k-menu-sep" />
              {options.map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={cx('k-menu-item', o.value === value && 'is-on')}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.swatch}
                  <span>{o.label}</span>
                  {o.value === value && <IconCheck size={14} />}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ------------------------------------------------------------------ modal

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="k-modal-scrim" onPointerDown={onClose}>
      <div className={cx('k-modal', wide && 'k-modal-wide')} role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="k-icon-btn k-modal-close" onClick={onClose} aria-label="Close">
          <IconX />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------ toasts

type Toast = { id: number; text: ReactNode; tone?: 'ok' | 'warn' };
let toastId = 0;
const listeners = new Set<(t: Toast[]) => void>();
let toasts: Toast[] = [];

export function toast(text: ReactNode, tone: Toast['tone'] = 'ok') {
  const t = { id: ++toastId, text, tone };
  toasts = [...toasts, t].slice(-3);
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(toasts));
  }, 2800);
}

export function Toasts() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return (
    <div className="k-toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('k-toast', t.tone === 'warn' && 'is-warn')}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
