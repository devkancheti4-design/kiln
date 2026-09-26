// "Open in…": freedom to leave the Kiln editor. Link a real folder that stays in sync both ways,
// open it in VS Code / Antigravity / Cursor / Windsurf, or download the project and import it back.
import { createContext, type ReactNode, useContext, useState } from 'react';
import { usePref } from '../app/prefs';
import { canLinkFolders, EDITORS, type FolderState, useFolderSync } from '../app/workspace';
import { buildProjectZip, download, slugify } from '../engine/exporter';
import { joinProject, splitProject } from '../engine/split';
import { cx, Modal, toast } from '../ui/controls';
import { IconCheck, IconCode, IconDownload, IconLayers, IconRefresh, IconShelf } from '../ui/icons';
import { useStudio } from './state';

interface FolderApi {
  state: FolderState;
  folderName: string | null;
  lastSync: number | null;
  link: () => Promise<void>;
  unlink: () => Promise<void>;
  reconnect: () => Promise<void>;
  open: () => void;
  pieceId: string;
  title: string;
}

const FolderContext = createContext<FolderApi | null>(null);

export function FolderProvider({ pieceId, title, ensureSaved, children }: { pieceId: string; title: string; ensureSaved: () => Promise<void>; children: ReactNode }) {
  const { doc, setSources, setAssets } = useStudio();
  const [dialog, setDialog] = useState(false);
  const sync = useFolderSync(
    pieceId,
    true,
    doc.pages.map((p) => ({ slug: p.slug, source: p.source, content: p.content })),
    doc.assets,
    (pages) => {
      setSources(pages, 'external');
      toast('Updated from your editor ✓');
    },
    (fresh) => {
      setAssets((a) => ({ ...a, ...fresh }));
      toast(`${Object.keys(fresh).length} picture${Object.keys(fresh).length > 1 ? 's' : ''} found in images/ — use them with <img src="images/…">`);
    },
  );
  const api: FolderApi = {
    ...sync,
    link: async () => {
      await ensureSaved();
      const ok = await sync.link(title);
      if (ok) toast('Folder linked — edits in either place now show up in both.');
    },
    unlink: sync.unlink,
    reconnect: sync.reconnect,
    open: () => setDialog(true),
    pieceId,
    title,
  };
  return (
    <FolderContext.Provider value={api}>
      {children}
      <OpenInDialog open={dialog} onClose={() => setDialog(false)} />
    </FolderContext.Provider>
  );
}

export function useFolder() {
  return useContext(FolderContext);
}

export function OpenInButton({ compact }: { compact?: boolean }) {
  const f = useFolder();
  if (!f) return null;
  return (
    <button type="button" className={cx('k-btn k-btn-sm', f.state === 'linked' && 's-linked')} onClick={f.open} data-tip="Edit in VS Code, Antigravity, Cursor… — your choice">
      {f.state === 'linked' ? <span className="s-live-dot" /> : <IconLayers size={14} />}
      {compact ? 'Open in…' : f.state === 'linked' ? `Synced · ${f.folderName}` : 'Open in your editor'}
    </button>
  );
}

function OpenInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useFolder()!;
  const { doc, setSources } = useStudio();
  const [path, setPath] = usePref<string>(`folder-path:${f.pieceId}`, '');
  const [pathDraft, setPathDraft] = useState(path);

  const importFiles = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.html,.css,.js';
    input.onchange = async () => {
      const files: Record<string, string> = {};
      for (const file of Array.from(input.files ?? [])) {
        const name = file.name;
        const key = name.endsWith('.html') ? name : name.endsWith('.css') ? `css/${name}` : name.endsWith('.js') ? `js/${name}` : name;
        files[key] = await file.text();
      }
      if (!Object.keys(files).some((k) => k.endsWith('.html'))) return toast('Pick your index.html (and any other html/css/js files you changed).', 'warn');
      // files not picked come from the current piece, so a lone index.html still works
      const base = splitProject(doc.pages.map((p) => ({ slug: p.slug, source: p.source, content: p.content })));
      setSources(joinProject({ ...base, ...files }), 'import');
      toast('Imported — the studio now shows your edited files.');
    };
    input.click();
  };

  return (
    <Modal open={open} onClose={onClose} title="Open in your editor" wide>
      <h2>Edit it your way</h2>
      <p>Kiln’s own editor is the quickest way to change your site live. But it is your code — use any editor you like. Nothing is locked in.</p>

      <div className="s-open-grid">
        <section className="s-open-card">
          <header>
            <span className="s-open-ico">
              <IconCode />
            </span>
            <div>
              <h3>1 · Link a folder</h3>
              <p>Kiln writes your site into a real folder and keeps it in sync both ways.</p>
            </div>
          </header>
          {!canLinkFolders ? (
            <p className="k-hint">This browser cannot link folders (Chrome, Edge, Arc and Brave can). Use the download and import below instead.</p>
          ) : f.state === 'linked' ? (
            <div className="s-open-status">
              <span className="s-live-dot" /> Linked to <strong>{f.folderName}/</strong>
              {f.lastSync && <span className="k-hint"> · synced {new Date(f.lastSync).toLocaleTimeString()}</span>}
              <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={f.unlink}>
                Unlink
              </button>
            </div>
          ) : f.state === 'needs-permission' || f.state === 'error' ? (
            <button type="button" className="k-btn k-btn-primary" onClick={f.reconnect}>
              <IconRefresh size={16} /> Reconnect {f.folderName ?? 'folder'}
            </button>
          ) : (
            <button type="button" className="k-btn k-btn-primary" onClick={f.link}>
              <IconShelf size={16} /> Choose where to put it…
            </button>
          )}
          <p className="k-hint">
            We create <code>{slugify(f.title)}/</code> inside the folder you pick, split into small files: <code>index.html</code>, <code>css/tokens.css</code>, <code>css/engine.css</code>, <code>js/</code>,{' '}
            <code>images/</code> and <code>AGENTS.md</code>. Drop pictures into <code>images/</code> and they appear here.
          </p>
        </section>

        <section className="s-open-card">
          <header>
            <span className="s-open-ico">
              <IconLayers />
            </span>
            <div>
              <h3>2 · Open it in…</h3>
              <p>Paste the folder’s path once, then open it with one click.</p>
            </div>
          </header>
          <div className="s-open-path">
            <input
              className="k-input k-mono"
              value={pathDraft}
              placeholder={`/Users/you/Documents/${slugify(f.title)}`}
              onChange={(e) => setPathDraft(e.target.value)}
              onBlur={() => setPath(pathDraft.trim())}
              spellCheck={false}
            />
          </div>
          <p className="k-hint">
            In Finder: select the folder and press <kbd className="k-kbd">⌥⌘C</kbd> to copy its path.
          </p>
          <div className="s-open-editors">
            {EDITORS.map((e) => (
              <a
                key={e.id}
                className={cx('k-btn', !pathDraft.trim() && 'is-disabled')}
                href={pathDraft.trim() ? `${e.scheme}://file${pathDraft.trim().startsWith('/') ? '' : '/'}${encodeURI(pathDraft.trim().replace(/\/+$/, ''))}` : undefined}
                onClick={() => setPath(pathDraft.trim())}
              >
                {e.name}
              </a>
            ))}
          </div>
        </section>

        <section className="s-open-card s-open-wide">
          <header>
            <span className="s-open-ico">✦</span>
            <div>
              <h3>Vibe-coding? Hand it to your AI editor.</h3>
              <p>
                Every folder includes <code>AGENTS.md</code> — a one-page map of the site. Agents in Antigravity, Cursor or Windsurf read that instead of the whole engine, so changes cost far
                fewer tokens.
              </p>
            </div>
          </header>
          <div className="s-open-prompt">
            <code>Read AGENTS.md first. Then: make the accent a deep green, switch data-form to "editorial", and add a card for my new project.</code>
            <button
              type="button"
              className="k-btn k-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText('Read AGENTS.md first. Then: ');
                toast('Copied a starter prompt.');
              }}
            >
              Copy
            </button>
          </div>
        </section>

        <section className="s-open-card s-open-wide">
          <header>
            <span className="s-open-ico">
              <IconDownload />
            </span>
            <div>
              <h3>Any browser: download and bring back</h3>
              <p>Download the project, edit it anywhere, then import your changed files to see them here.</p>
            </div>
          </header>
          <div className="s-open-editors">
            <button
              type="button"
              className="k-btn"
              onClick={async () => {
                const data = await buildProjectZip(f.title, doc.pages.map((p) => ({ slug: p.slug, source: p.source, content: p.content })), doc.assets);
                download(`${slugify(f.title)}.zip`, data, 'application/zip');
              }}
            >
              <IconDownload size={16} /> Download project (.zip)
            </button>
            <button type="button" className="k-btn" onClick={importFiles}>
              <IconCheck size={16} /> Import changed files
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
