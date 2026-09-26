import { Suspense, lazy, useEffect } from 'react';
import { Toasts } from '../ui/controls';
import { IconGuide, IconShelf, IconVase, IconWheel } from '../ui/icons';
import { Shelf } from '../pages/Shelf';
import { Wheel } from '../pages/Wheel';
import { randomNumber } from './pieces';
import { type Route, go, useRoute } from './router';
import { ThemeToggle } from './theme';

const Studio = lazy(() => import('../studio/Studio').then((m) => ({ default: m.Studio })));
const Guide = lazy(() => import('../pages/Guide').then((m) => ({ default: m.Guide })));

export function App() {
  const route = useRoute();

  useEffect(() => {
    const titles: Record<Route['page'], string> = {
      wheel: 'Kiln — throw a website',
      shelf: 'Your shelf — Kiln',
      guide: 'The guide — Kiln',
      design: 'Studio — Kiln',
      studio: 'Studio — Kiln',
    };
    document.title = titles[route.page];
    if (route.page !== 'guide') scrollTo({ top: 0 });
  }, [route.page]);

  if (route.page === 'design' || route.page === 'studio') {
    return (
      <Suspense fallback={<Loading />}>
        <Studio key={route.page === 'studio' ? route.id : `n${route.number}`} route={route} />
        <Toasts />
      </Suspense>
    );
  }

  return (
    <>
      <AppBar route={route} />
      <Suspense fallback={<Loading />}>
        {route.page === 'wheel' && <Wheel />}
        {route.page === 'shelf' && <Shelf />}
        {route.page === 'guide' && <Guide lesson={route.lesson} />}
      </Suspense>
      <Toasts />
    </>
  );
}

export function Logo() {
  return (
    <a className="k-logo" href="#/" aria-label="Kiln home">
      <span className="k-logo-mark">
        <IconVase size={18} strokeWidth={2} />
      </span>
      Kiln
    </a>
  );
}

function AppBar({ route }: { route: Route }) {
  return (
    <header className="k-bar">
      <Logo />
      <nav className="k-nav" aria-label="Main">
        <a href="#/" className={route.page === 'wheel' ? 'is-on' : ''}>
          <IconWheel size={16} />
          <span>Wheel</span>
        </a>
        <a href="#/shelf" className={route.page === 'shelf' ? 'is-on' : ''}>
          <IconShelf size={16} />
          <span>Shelf</span>
        </a>
        <a href="#/guide" className={route.page === 'guide' ? 'is-on' : ''}>
          <IconGuide size={16} />
          <span>Guide</span>
        </a>
      </nav>
      <div className="k-bar-right">
        <span className="k-badge k-badge-glaze k-hide-sm" data-tip="Everything runs on this device. No account, no internet.">
          ● Offline
        </span>
        <ThemeToggle />
        <button type="button" className="k-btn k-btn-primary" onClick={() => go(`design/${randomNumber()}`)}>
          <IconWheel size={16} />
          <span className="k-spin-label">Spin</span>
        </button>
      </div>
    </header>
  );
}

function Loading() {
  return (
    <div className="k-loading" aria-label="Loading">
      <span className="k-loading-wheel" />
    </div>
  );
}
