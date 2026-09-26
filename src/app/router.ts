// Hash routing works everywhere Kiln runs — dev server, static host, or a file:// double-click.
import { useEffect, useState } from 'react';

export type Route =
  | { page: 'wheel' }
  | { page: 'shelf' }
  | { page: 'guide'; lesson?: string }
  | { page: 'design'; number: number }
  | { page: 'studio'; id: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'shelf':
      return { page: 'shelf' };
    case 'guide':
      return { page: 'guide', lesson: parts[1] };
    case 'design': {
      const n = parseInt(parts[1] ?? '', 10);
      return Number.isFinite(n) ? { page: 'design', number: n } : { page: 'wheel' };
    }
    case 'studio':
      return parts[1] ? { page: 'studio', id: parts[1] } : { page: 'shelf' };
    default:
      return { page: 'wheel' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string, replace = false) {
  const hash = `#/${path.replace(/^\/+/, '')}`;
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) dispatchEvent(new HashChangeEvent('hashchange'));
}
