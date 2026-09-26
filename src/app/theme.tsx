import { IconMoon, IconSun } from '../ui/icons';
import { readPref, usePref } from './prefs';

export type Theme = 'system' | 'light' | 'dark';

export function resolvedTheme(t: Theme): 'light' | 'dark' {
  if (t !== 'system') return t;
  try {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(t: Theme = readPref<Theme>('theme', 'system')) {
  const r = resolvedTheme(t);
  document.documentElement.dataset.theme = r;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'light' ? '#f3eee7' : '#13100e');
}

try {
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme());
} catch {
  /* old browsers */
}

export function ThemeToggle() {
  const [theme, setTheme] = usePref<Theme>('theme', 'system');
  const now = resolvedTheme(theme);
  return (
    <button
      type="button"
      className="k-icon-btn"
      aria-label={now === 'dark' ? 'Switch to light' : 'Switch to dark'}
      data-tip={now === 'dark' ? 'Light studio' : 'Dark studio'}
      onClick={() => {
        const next = now === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
      }}
    >
      {now === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
