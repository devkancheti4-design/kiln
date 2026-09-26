import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme } from './app/theme';
import { ALL_FONT_FACES_CSS } from './engine/fonts';
import './styles/app.css';
import './styles/pages.css';
import './styles/studio.css';

// Every bundled font is available to the app and to live thumbnails (shadow roots use document fonts).
const fonts = document.createElement('style');
fonts.id = 'kiln-fonts';
fonts.textContent = ALL_FONT_FACES_CSS;
document.head.append(fonts);

applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
