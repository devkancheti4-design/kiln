// The Shelf: every piece you have thrown, saved on this device.
import { useEffect, useState } from 'react';
import { deletePiece, listPieces, type Piece, savePiece } from '../app/db';
import { newId, randomNumber } from '../app/pieces';
import { go } from '../app/router';
import { buildSingleFile, buildStandaloneZip, download, slugify } from '../engine/exporter';
import { formatNumber } from '../engine/genome';
import { identify } from '../engine/patch';
import { Modal, toast } from '../ui/controls';
import { IconCopy, IconDownload, IconFire, IconTrash, IconVase, IconWheel } from '../ui/icons';
import { Thumb } from '../ui/Thumb';
import { numberOf } from '../engine/genome';

function ago(t: number): string {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function Shelf() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [confirm, setConfirm] = useState<Piece | null>(null);

  useEffect(() => {
    const load = () => listPieces().then(setPieces);
    load();
    addEventListener('kiln-shelf', load);
    return () => removeEventListener('kiln-shelf', load);
  }, []);

  if (!pieces)
    return (
      <div className="k-loading">
        <span className="k-loading-wheel" />
      </div>
    );

  return (
    <main className="k-page">
      <header className="sh-head">
        <div>
          <p className="k-eyebrow">Your shelf</p>
          <h1 className="k-h2">{pieces.length ? `${pieces.length} piece${pieces.length > 1 ? 's' : ''}, all yours` : 'Nothing fired yet'}</h1>
          <p className="k-lede">Everything here lives on this device. No account, no cloud — just your work.</p>
        </div>
        <button type="button" className="k-btn k-btn-primary" onClick={() => go(`design/${randomNumber()}`)}>
          <IconWheel size={16} /> Throw a new one
        </button>
      </header>

      {pieces.length === 0 ? (
        <div className="k-empty sh-empty">
          <div className="sh-empty-art" aria-hidden="true">
            <IconVase size={56} strokeWidth={1.2} />
          </div>
          <h2>Your shelf is waiting.</h2>
          <p>Spin the wheel, change anything, and your piece lands here automatically.</p>
          <div className="k-hero-actions">
            <button type="button" className="k-btn k-btn-primary k-btn-lg" onClick={() => go(`design/${randomNumber()}`)}>
              <IconWheel /> Spin the wheel
            </button>
            <a className="k-btn k-btn-lg" href="#/">
              Browse designs
            </a>
          </div>
        </div>
      ) : (
        <div className="k-grid sh-grid">
          {pieces.map((p) => {
            const g = identify(p.source, p.content);
            return (
              <article key={p.id} className="sh-card" data-peek>
                <a href={`#/studio/${p.id}`} className="sh-thumb-link" aria-label={`Open ${p.title}`}>
                  <Thumb source={p.source} assets={p.assets} className="k-card-thumb" />
                </a>
                <div className="sh-meta">
                  <div className="sh-title">
                    <a href={`#/studio/${p.id}`}>{p.title || 'Untitled'}</a>
                    <span>
                      {g ? `No. ${formatNumber(numberOf(g))}` : '✦ Original'}{p.pages?.length ? ` · ${p.pages.length + 1} pages` : ''} · {ago(p.updated)}
                    </span>
                  </div>
                  <div className="sh-actions">
                    {p.fired && (
                      <span className="k-badge" data-tip={`Fired ${new Date(p.fired.at).toLocaleDateString()}`}>
                        <IconFire size={12} /> {p.fired.serial}
                      </span>
                    )}
                    <button
                      type="button"
                      className="k-icon-btn"
                      data-tip="Download as one file"
                      aria-label="Download"
                      onClick={async () =>
                        p.pages?.length
                          ? download(`${slugify(p.title)}-pages.zip`, await buildStandaloneZip(p.title, [{ slug: 'index', source: p.source, content: p.content }, ...p.pages.map((x) => ({ slug: x.slug, source: x.source, content: x.content }))], p.assets), 'application/zip')
                          : download(`${slugify(p.title)}.html`, await buildSingleFile(p.source, p.assets), 'text/html')
                      }
                    >
                      <IconDownload size={17} />
                    </button>
                    <button
                      type="button"
                      className="k-icon-btn"
                      data-tip="Duplicate"
                      aria-label="Duplicate"
                      onClick={async () => {
                        const now = Date.now();
                        await savePiece({ ...structuredClone(p), id: newId(), title: `${p.title} copy`, created: now, updated: now, fired: null });
                        toast('Duplicated.');
                      }}
                    >
                      <IconCopy size={17} />
                    </button>
                    <button type="button" className="k-icon-btn" data-tip="Delete" aria-label="Delete" onClick={() => setConfirm(p)}>
                      <IconTrash size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete piece">
        <h2>Delete “{confirm?.title}”?</h2>
        <p>This removes it from this device for good. Download it first if you want to keep a copy.</p>
        <div className="s-modal-actions">
          <button type="button" className="k-btn" onClick={() => setConfirm(null)}>
            Keep it
          </button>
          <button
            type="button"
            className="k-btn k-btn-danger"
            onClick={async () => {
              if (confirm) await deletePiece(confirm.id);
              setConfirm(null);
              toast('Deleted.');
            }}
          >
            <IconTrash size={16} /> Delete
          </button>
        </div>
      </Modal>
    </main>
  );
}
