// The Guide — W3Schools spirit: read a little, change one line, see it happen, tick it off.
import { cssLanguage } from '@codemirror/lang-css';
import { htmlLanguage } from '@codemirror/lang-html';
import { classHighlighter, highlightCode } from '@lezer/highlight';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { savePiece } from '../app/db';
import { usePref } from '../app/prefs';
import { newId } from '../app/pieces';
import { go } from '../app/router';
import { formatNumber, genomeAt } from '../engine/genome';
import { KINDS } from '../engine/kinds';
import { CHAPTERS, DEMO_NUMBER, demoSource, designsUnlocked, LESSONS } from '../guide/lessons';
import { cx, toast } from '../ui/controls';
import { IconArrowRight, IconBack, IconCheck, IconRefresh, IconSparkle } from '../ui/icons';
import { CodeEditor } from '../studio/CodeEditor';
import { Preview } from '../studio/Preview';

export function Guide({ lesson }: { lesson?: string }) {
  const [done, setDone] = usePref<string[]>('guide-done', []);
  const idx = Math.max(0, LESSONS.findIndex((l) => l.id === lesson));
  const current = LESSONS[idx];
  const unlocked = designsUnlocked(done);

  useEffect(() => {
    document.querySelector('.g-main')?.scrollTo({ top: 0 });
    scrollTo({ top: 0 });
  }, [idx]);

  const markDone = (id: string) => {
    if (done.includes(id)) return;
    setDone([...done, id]);
  };

  return (
    <div className="g-guide">
      <aside className="g-side">
        <div className="g-meter">
          <span className="k-eyebrow">Designs you can make by hand</span>
          <strong className="k-num">{unlocked.infinite ? '∞' : formatNumber(unlocked.value)}</strong>
          <span className="g-meter-sub">
            {done.length} of {LESSONS.length} lessons · each one multiplies this
          </span>
          <div className="g-meter-bar">
            <i style={{ width: `${(done.length / LESSONS.length) * 100}%` }} />
          </div>
        </div>
        <nav className="g-toc" aria-label="Lessons">
          {CHAPTERS.map((ch) => (
            <div key={ch} className="g-chapter">
              <h4>{ch}</h4>
              {LESSONS.filter((l) => l.chapter === ch).map((l) => (
                <a key={l.id} href={`#/guide/${l.id}`} className={cx('g-toc-item', l.id === current.id && 'is-on', done.includes(l.id) && 'is-done')}>
                  <span className="g-check">{done.includes(l.id) ? <IconCheck size={12} /> : null}</span>
                  {l.title}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="g-main">
        <LessonView key={current.id} index={idx} onDone={() => markDone(current.id)} done={done.includes(current.id)} />
      </main>
    </div>
  );
}

function LessonView({ index, onDone, done }: { index: number; onDone: () => void; done: boolean }) {
  const l = LESSONS[index];
  const demo = useMemo(() => demoSource(), []);
  const initial = useMemo(() => (l.region ? (l.starter ?? l.region.get(demo)) : ''), [l, demo]);
  const [code, setCode] = useState(initial);
  const [showHint, setShowHint] = useState(false);
  const source = useMemo(() => (l.region ? l.region.set(demo, code) : demo), [l, demo, code]);
  const passed = !!l.challenge && l.challenge.check(source);
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];

  useEffect(() => {
    if (passed && !done) {
      onDone();
      toast(
        <>
          <IconSparkle size={14} /> Nice — {l.unlocks ? (l.unlocks.factor === 'infinite' ? 'now you can make anything.' : `×${l.unlocks.factor} ${l.unlocks.label} unlocked.`) : 'lesson done.'}
        </>,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  // Lessons without a try-it are done once read.
  useEffect(() => {
    if (!l.challenge && !done) {
      const t = setTimeout(onDone, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.id]);

  const keep = async () => {
    const g = genomeAt(DEMO_NUMBER - 1);
    const id = newId();
    const now = Date.now();
    const content = structuredClone(KINDS[g.kind].content);
    await savePiece({ id, title: `${content.brand} (from the guide)`, created: now, updated: now, source, content, markupLocked: false, assets: {}, origin: DEMO_NUMBER, fired: null });
    go(`studio/${id}`);
  };

  return (
    <article className="g-lesson">
      <p className="k-eyebrow">
        {l.chapter} · {index + 1} of {LESSONS.length}
      </p>
      <h1 className="g-title">{l.title}</h1>
      <div className="g-body">
        {l.body.map((p, i) => (
          <p key={i}>{inline(p)}</p>
        ))}
      </div>

      {l.example && (
        <figure className="g-example">
          <figcaption>Example</figcaption>
          <pre>
            <code>{highlight(l.example.code, 'html')}</code>
          </pre>
          <p>{l.example.note}</p>
        </figure>
      )}

      {l.region && (
        <section className="g-try">
          <header className="g-try-head">
            <h2>Try it yourself</h2>
            <span className="g-try-label k-mono">{l.region.label}</span>
            <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => setCode(initial)}>
              <IconRefresh size={14} /> Reset
            </button>
          </header>
          <div className="g-try-grid">
            <div className="g-try-code">
              <CodeEditor value={code} onChange={(v) => setCode(v)} onUndo={() => {}} onRedo={() => {}} onSeal={() => {}} foldEngine={false} ownHistory minimal />
            </div>
            <div className="g-try-preview">
              <Preview source={source} assets={{}} device="desktop" inspect={false} highlight={null} onPick={() => {}} />
            </div>
          </div>
        </section>
      )}

      {l.challenge && (
        <section className={cx('g-challenge', passed && 'is-passed')}>
          <div className="g-challenge-icon">{passed ? <IconCheck size={18} /> : '?'}</div>
          <div className="g-challenge-text">
            <span className="k-eyebrow">{passed ? 'Done' : 'Your turn'}</span>
            <p>{l.challenge.task}</p>
            {!passed && (
              <button type="button" className="k-link" onClick={() => setShowHint((h) => !h)}>
                {showHint ? 'Hide the hint' : 'Show me a hint'}
              </button>
            )}
            {showHint && !passed && <p className="g-hint">{inline(`\`${l.challenge.hint}\``)}</p>}
          </div>
          {passed && (
            <button type="button" className="k-btn k-btn-sm" onClick={keep}>
              Keep this site
            </button>
          )}
        </section>
      )}

      <nav className="g-nav">
        {prev ? (
          <a className="k-btn" href={`#/guide/${prev.id}`}>
            <IconBack size={16} /> {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="k-btn k-btn-primary" href={`#/guide/${next.id}`}>
            {next.title} <IconArrowRight size={16} />
          </a>
        ) : (
          <a className="k-btn k-btn-primary" href="#/">
            Throw your own site <IconArrowRight size={16} />
          </a>
        )}
      </nav>
    </article>
  );
}

/** `code`, **bold** */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<code key={k++} className="k-code-inline">{m[1]}</code>);
    else out.push(<strong key={k++}>{m[2]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function highlight(code: string, lang: 'html' | 'css'): ReactNode[] {
  const parser = lang === 'css' ? cssLanguage.parser : htmlLanguage.parser;
  const out: ReactNode[] = [];
  let k = 0;
  highlightCode(
    code,
    parser.parse(code),
    classHighlighter,
    (text, classes) => out.push(classes ? <span key={k++} className={classes}>{text}</span> : text),
    () => out.push('\n'),
  );
  return out;
}
