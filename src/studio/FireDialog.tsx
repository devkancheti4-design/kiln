// Fire: bake the piece into files you own. A short kiln animation, a maker's mark, and three ways
// to take it home — one file, a website folder, or a project for code editors and AI agents.
import { useEffect, useState } from 'react';
import { hallmark } from '../app/pieces';
import { buildProjectZip, buildSingleFile, buildZip, download, slugify } from '../engine/exporter';
import { formatNumber } from '../engine/genome';
import { cx, Modal, toast } from '../ui/controls';
import { IconCheck, IconCopy, IconDownload, IconFire } from '../ui/icons';
import { useStudio } from './state';

export function FireDialog({
  open,
  onClose,
  title,
  origin,
  onFired,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  origin: number;
  onFired: (f: { at: number; serial: string }) => void;
}) {
  const { doc, number } = useStudio();
  const [phase, setPhase] = useState<'firing' | 'done'>('firing');
  const [busy, setBusy] = useState<string | null>(null);
  const serial = hallmark(doc.source);
  const slug = slugify(title);

  useEffect(() => {
    if (!open) return;
    setPhase('firing');
    const t = setTimeout(() => setPhase('done'), 1500);
    return () => clearTimeout(t);
  }, [open]);

  const stamp = () => onFired({ at: Date.now(), serial });

  const run = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
      stamp();
    } catch (e) {
      toast(`Could not build the file: ${(e as Error).message}`, 'warn');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Fire" wide>
      <div className={cx('f-kiln', phase === 'done' && 'is-done')}>
        <div className="f-oven" aria-hidden="true">
          <div className="f-glow" />
          <div className="f-flames">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="f-pot" />
        </div>
        <div className="f-copy">
          <p className="k-eyebrow">{phase === 'done' ? 'Fired' : 'Firing…'}</p>
          <h2>{phase === 'done' ? `${title} is ready.` : 'Into the kiln it goes.'}</h2>
          <div className="f-mark">
            <span>KILN</span>
            <strong>{serial}</strong>
            <span>{number ? `No. ${formatNumber(number)}` : `Original · from No. ${formatNumber(origin)}`}</span>
            <span>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <p className="k-hint">Your maker’s mark — it changes whenever the code changes, so no two pieces share one.</p>
        </div>
      </div>

      <div className="f-options">
        <button
          type="button"
          className="f-option"
          disabled={!!busy}
          onClick={() =>
            run('single', async () => {
              const html = await buildSingleFile(doc.source, doc.assets);
              download(`${slug}.html`, html, 'text/html');
            })
          }
        >
          <span className="f-option-ico">
            <IconDownload />
          </span>
          <strong>One file</strong>
          <span>A single .html with fonts and pictures inside. Email it, double-click it, host it anywhere.</span>
          <em>{busy === 'single' ? 'Building…' : 'Easiest'}</em>
        </button>
        <button
          type="button"
          className="f-option"
          disabled={!!busy}
          onClick={() =>
            run('zip', async () => {
              const data = await buildZip(title, doc.source, doc.assets);
              download(`${slug}-site.zip`, data, 'application/zip');
            })
          }
        >
          <span className="f-option-ico">
            <IconFire />
          </span>
          <strong>Website folder</strong>
          <span>index.html + fonts/ + images/ — how real sites are published. Drag it onto any static host.</span>
          <em>{busy === 'zip' ? 'Building…' : '.zip'}</em>
        </button>
        <button
          type="button"
          className="f-option"
          disabled={!!busy}
          onClick={() =>
            run('project', async () => {
              const data = await buildProjectZip(title, doc.source, doc.assets, doc.content);
              download(`${slug}-project.zip`, data, 'application/zip');
            })
          }
        >
          <span className="f-option-ico">{'</>'}</span>
          <strong>Project for code editors</strong>
          <span>Split into css/ and js/ with an AGENTS.md map — ideal for VS Code, Antigravity or Cursor.</span>
          <em>{busy === 'project' ? 'Building…' : 'Pros & vibe-coders'}</em>
        </button>
      </div>

      <div className="f-foot">
        <button
          type="button"
          className="k-btn k-btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(doc.source).then(
              () => toast('Code copied.'),
              () => toast('Copying is blocked here — use a download instead.', 'warn'),
            );
          }}
        >
          <IconCopy size={14} /> Copy the code
        </button>
        <details className="f-online">
          <summary>Put it online for free</summary>
          <ol>
            <li>
              <strong>Netlify Drop</strong> — unzip the website folder and drag it onto app.netlify.com/drop.
            </li>
            <li>
              <strong>GitHub Pages</strong> — create a repository, upload the files, then Settings → Pages → Deploy from branch.
            </li>
            <li>
              <strong>Cloudflare Pages</strong> — Workers & Pages → Create → Upload assets.
            </li>
          </ol>
          <p className="k-hint">
            <IconCheck size={13} /> Every option is plain HTML, CSS and a little JavaScript — no build step, no server, no subscription.
          </p>
        </details>
      </div>
    </Modal>
  );
}
