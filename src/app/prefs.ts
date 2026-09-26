// Small per-device conveniences (theme, lesson progress, last filters). Storage can be missing or
// blocked (private windows, file:// quirks), so every access is guarded and has a default.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'kiln:';

export function readPref<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY + name);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref<T>(name: string, value: T) {
  try {
    localStorage.setItem(KEY + name, JSON.stringify(value));
  } catch {
    /* storage unavailable — fine, it is only a convenience */
  }
  dispatchEvent(new CustomEvent('kiln-pref', { detail: name }));
}

export function usePref<T>(name: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readPref(name, fallback));
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent).detail === name) setValue(readPref(name, fallback));
    };
    addEventListener('kiln-pref', on);
    return () => removeEventListener('kiln-pref', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(readPref(name, fallback)) : v;
      writePref(name, next);
      setValue(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name],
  );
  return [value, set];
}
