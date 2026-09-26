// Carve: the words and pictures. Edits here rewrite the page markup in the code, so you can
// watch plain HTML appear as you type (switch to Code to see it).
import { useState } from 'react';
import { pickFile, readImage } from '../app/images';
import { type CardItem, type CardsSection, type Content, initialsOf, type Media, type Section, SECTION_LABELS, type SectionType } from '../engine/content';
import { slugify } from '../engine/exporter';
import { KINDS, kindIndex } from '../engine/kinds';
import { readTokens } from '../engine/patch';
import { ArtSwatch } from '../ui/ArtSwatch';
import { cx, Field, Modal, Select, Toggle, toast } from '../ui/controls';
import { IconChevronDown, IconChevronUp, IconEye, IconEyeOff, IconImage, IconPlus, IconTrash, IconX } from '../ui/icons';
import { PanelSection } from './bits';
import { useStudio } from './state';

export function CarvePanel() {
  const { doc, locked, setContent, rebuildPage } = useStudio();
  const c = doc.content;
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [kindAsk, setKindAsk] = useState<number | null>(null);
  const [keepName, setKeepName] = useState(true);

  const set = (fn: (c: Content) => Content, group = 'carve') => setContent(fn, group);

  if (locked)
    return (
      <div className="s-locked">
        <h3>You are editing the page by hand</h3>
        <p>
          The page markup in the code no longer matches these fields, so Carve is paused to protect your hand-written HTML. Keep going in <strong>Code</strong> — or
          rebuild the page from Carve (your hand edits to the page part are replaced; tokens and engine stay).
        </p>
        <button type="button" className="k-btn" onClick={() => setConfirmRebuild(true)}>
          Rebuild page from Carve
        </button>
        <Modal open={confirmRebuild} onClose={() => setConfirmRebuild(false)} title="Rebuild the page">
          <h2>Rebuild the page?</h2>
          <p>Your hand edits between &lt;body&gt; and the motion script will be replaced with the words from Carve. You can undo this.</p>
          <div className="s-modal-actions">
            <button type="button" className="k-btn" onClick={() => setConfirmRebuild(false)}>
              Keep my edits
            </button>
            <button
              type="button"
              className="k-btn k-btn-primary"
              onClick={() => {
                rebuildPage();
                setConfirmRebuild(false);
                toast('Page rebuilt from Carve. ⌘Z brings your edits back.');
              }}
            >
              Rebuild
            </button>
          </div>
        </Modal>
      </div>
    );

  return (
    <>
      <PanelSection title="Start from">
        <Select
          label="Kind"
          placeholder={KINDS[kindIndex(c.kind)].name}
          value={kindIndex(c.kind)}
          onChange={(v) => v !== null && v !== kindIndex(c.kind) && setKindAsk(v)}
          options={KINDS.map((k, i) => ({ value: i, label: `${k.emoji}  ${k.name}` }))}
        />
        <p className="k-hint">Swap in a different kind of site — portfolio, restaurant, wedding… The design stays.</p>
        <Modal open={kindAsk !== null} onClose={() => setKindAsk(null)} title="Change kind">
          <h2>Start from {kindAsk !== null ? KINDS[kindAsk].name : ''}?</h2>
          <p>This replaces your words and sections with the {kindAsk !== null ? KINDS[kindAsk].name.toLowerCase() : ''} starter. You can undo it.</p>
          <Toggle checked={keepName} onChange={setKeepName} label="Keep my name" />
          <div className="s-modal-actions">
            <button type="button" className="k-btn" onClick={() => setKindAsk(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="k-btn k-btn-primary"
              onClick={() => {
                const next = structuredClone(KINDS[kindAsk!].content);
                if (keepName) {
                  next.brand = c.brand;
                  next.mark = c.mark;
                  next.footer = next.footer.replace(KINDS[kindAsk!].content.brand, c.brand);
                }
                set(() => next, 'kind');
                setKindAsk(null);
              }}
            >
              Start from it
            </button>
          </div>
        </Modal>
      </PanelSection>

      <PanelSection title="Your name">
        <Field
          label="Name or brand"
          value={c.brand}
          onChange={(v) =>
            set((x) => ({
              ...x,
              brand: v,
              // logo letters follow the name until someone types their own
              mark: x.mark === initialsOf(x.brand) || x.mark === KINDS[kindIndex(x.kind)].content.mark ? initialsOf(v) : x.mark,
              footer: x.footer.includes(x.brand) && x.brand ? x.footer.replace(x.brand, v) : x.footer,
            }))
          }
        />
        <div className="s-row2">
          <Field label="Logo letters" value={c.mark} onChange={(v) => set((x) => ({ ...x, mark: v.slice(0, 4) }))} />
          <Field label="Small line above" value={c.eyebrow} onChange={(v) => set((x) => ({ ...x, eyebrow: v }))} />
        </div>
        <Field label="Big headline" value={c.headline} multiline rows={2} onChange={(v) => set((x) => ({ ...x, headline: v }))} hint={<>Wrap a word in *stars* to highlight it — it becomes <code>&lt;em&gt;</code> in the code.</>} />
        <Field label="Intro" value={c.lede} multiline onChange={(v) => set((x) => ({ ...x, lede: v }))} />
      </PanelSection>

      <PanelSection title="Buttons">
        <div className="s-row2">
          <Field label="Main button" value={c.primary.label} onChange={(v) => set((x) => ({ ...x, primary: { ...x.primary, label: v } }))} />
          <LinkField value={c.primary.href} sections={c.sections} onChange={(v) => set((x) => ({ ...x, primary: { ...x.primary, href: v } }))} />
        </div>
        {c.secondary ? (
          <div className="s-row2">
            <Field label="Second button" value={c.secondary.label} onChange={(v) => set((x) => ({ ...x, secondary: { ...x.secondary!, label: v } }))} />
            <LinkField value={c.secondary.href} sections={c.sections} onChange={(v) => set((x) => ({ ...x, secondary: { ...x.secondary!, href: v } }))} />
          </div>
        ) : null}
        <Toggle checked={!!c.secondary} onChange={(on) => set((x) => ({ ...x, secondary: on ? { label: 'Learn more', href: `#${x.sections[0]?.id ?? 'top'}` } : null }))} label="Second button" />
        <div className="s-row2">
          <Field label="Top bar button" value={c.navCta.label} onChange={(v) => set((x) => ({ ...x, navCta: { ...x.navCta, label: v } }))} />
          <LinkField value={c.navCta.href} sections={c.sections} onChange={(v) => set((x) => ({ ...x, navCta: { ...x.navCta, href: v } }))} />
        </div>
      </PanelSection>

      <PanelSection title="Hero picture">
        <MediaPicker media={c.heroMedia} name="hero" onChange={(m) => set((x) => ({ ...x, heroMedia: m }))} />
        <p className="k-hint">A 3D scene (Shape → 3D scene) draws over this picture when one is on.</p>
      </PanelSection>

      <PanelSection title="Sections" aside={<AddSection onAdd={(s) => set((x) => ({ ...x, sections: insertBeforeContact(x.sections, s) }), 'add')} existing={c.sections} />}>
        <div className="s-sections">
          {c.sections.map((s, i) => (
            <SectionItem
              key={s.id}
              section={s}
              first={i === 0}
              last={i === c.sections.length - 1}
              onChange={(ns, g) => set((x) => ({ ...x, sections: x.sections.map((y) => (y.id === s.id ? ns : y)) }), g ?? `sec-${s.id}`)}
              onMove={(d) =>
                set((x) => {
                  const arr = [...x.sections];
                  const j = i + d;
                  [arr[i], arr[j]] = [arr[j], arr[i]];
                  return { ...x, sections: arr };
                }, 'move')
              }
              onRemove={() => set((x) => ({ ...x, sections: x.sections.filter((y) => y.id !== s.id) }), 'remove')}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Footer">
        <Field label="Footer line" value={c.footer} onChange={(v) => set((x) => ({ ...x, footer: v }))} />
        <div className="s-list">
          {c.socials.map((l, i) => (
            <div key={i} className="s-row2 s-row-x">
              <Field label="Link" value={l.label} onChange={(v) => set((x) => ({ ...x, socials: x.socials.map((y, j) => (j === i ? { ...y, label: v } : y)) }))} />
              <Field label="Address" value={l.href} onChange={(v) => set((x) => ({ ...x, socials: x.socials.map((y, j) => (j === i ? { ...y, href: v } : y)) }))} />
              <button type="button" className="k-icon-btn" aria-label="Remove link" onClick={() => set((x) => ({ ...x, socials: x.socials.filter((_, j) => j !== i) }))}>
                <IconX size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="k-btn k-btn-sm" onClick={() => set((x) => ({ ...x, socials: [...x.socials, { label: 'Instagram', href: 'https://www.instagram.com/' }] }))}>
            <IconPlus size={14} /> Add a link
          </button>
        </div>
      </PanelSection>
    </>
  );
}

function insertBeforeContact(list: Section[], s: Section): Section[] {
  const i = list.findIndex((x) => x.type === 'contact');
  if (i < 0) return [...list, s];
  return [...list.slice(0, i), s, ...list.slice(i)];
}

function LinkField({ value, sections, onChange }: { value: string; sections: Section[]; onChange: (v: string) => void }) {
  const anchors = [{ id: 'top', nav: 'Top' }, ...sections.filter((s) => !s.hidden).map((s) => ({ id: s.id, nav: s.nav || SECTION_LABELS[s.type] }))];
  const isAnchor = anchors.some((a) => `#${a.id}` === value);
  return (
    <label className="k-field">
      <span className="s-fake-label">Goes to</span>
      <select className="k-input" value={isAnchor ? value : '__custom'} onChange={(e) => onChange(e.target.value === '__custom' ? 'https://' : e.target.value)}>
        {anchors.map((a) => (
          <option key={a.id} value={`#${a.id}`}>
            {a.nav} section
          </option>
        ))}
        <option value="__custom">A web address…</option>
      </select>
      {!isAnchor && <input className="k-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" />}
    </label>
  );
}

// ------------------------------------------------------------------ pictures

function MediaPicker({ media, name, onChange, compact }: { media: Media; name: string; onChange: (m: Media) => void; compact?: boolean }) {
  const { doc, setAssets } = useStudio();
  const tokens = readTokens(doc.source);
  const [open, setOpen] = useState(!compact);

  const upload = async () => {
    const file = await pickFile();
    if (!file) return;
    try {
      const { dataUrl, ext } = await readImage(file);
      let path = `images/${slugify(name)}.${ext}`;
      let n = 2;
      while (doc.assets[path] && doc.assets[path] !== dataUrl) path = `images/${slugify(name)}-${n++}.${ext}`;
      setAssets((a) => ({ ...a, [path]: dataUrl }));
      onChange({ ...media, image: path, alt: media.alt ?? file.name.replace(/\.[^.]+$/, '') });
      toast('Picture added — it lives inside your piece, on this device.');
    } catch (e) {
      toast(String((e as Error).message ?? e), 'warn');
    }
  };

  return (
    <div className={cx('s-media', compact && 's-media-compact')}>
      <div className="s-media-now">
        {media.image && doc.assets[media.image] ? (
          <img src={doc.assets[media.image]} alt="" />
        ) : (
          <ArtSwatch art={media.art} tokens={tokens} className="s-media-art" />
        )}
        <div className="s-media-actions">
          <button type="button" className="k-btn k-btn-sm" onClick={upload}>
            <IconImage size={14} /> {media.image ? 'Replace photo' : 'Use my photo'}
          </button>
          {media.image ? (
            <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => onChange({ art: media.art })}>
              Back to art
            </button>
          ) : (
            <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide art' : 'Pick art'}
            </button>
          )}
        </div>
      </div>
      {media.image && <Field label="Describe the photo (for screen readers)" value={media.alt ?? ''} onChange={(v) => onChange({ ...media, alt: v })} />}
      {!media.image && open && (
        <div className="s-arts">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((a) => (
            <button key={a} type="button" className={cx('s-art-btn', media.art === a && 'is-on')} onClick={() => onChange({ ...media, art: a })} aria-label={`Art ${a}`}>
              <ArtSwatch art={a} tokens={tokens} className="s-art-sw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ sections

const NEW_SECTION: Record<SectionType, () => Omit<Section, 'id'>> = {
  stats: () => ({ type: 'stats', items: [{ value: '10+', label: 'years' }, { value: '120', label: 'happy people' }, { value: '4.9★', label: 'rating' }] }),
  cards: () => ({ type: 'cards', nav: 'Work', eyebrow: 'Work', title: 'Things I *made*', intro: '', showMedia: true, items: [1, 2, 3].map((n) => ({ title: `Project ${n}`, text: 'A sentence about it.', meta: '2026', media: { art: n * 3 } })) }),
  about: () => ({ type: 'about', nav: 'About', eyebrow: 'About', title: 'A little about *me*', text: 'Write a few honest lines here.', points: ['One thing', 'Another thing'], media: { art: 8 } }),
  list: () => ({ type: 'list', nav: 'List', eyebrow: 'Timeline', title: 'What *happened*', items: [{ meta: '2026', title: 'Something new', text: 'A line about it.', aside: 'Here' }] }),
  quote: () => ({ type: 'quote', text: 'Something kind somebody said.', name: 'A Friend', role: 'Who they are' }),
  gallery: () => ({ type: 'gallery', nav: 'Gallery', eyebrow: 'Gallery', title: 'Pictures', items: [2, 5, 7, 11].map((a, n) => ({ caption: `Picture ${n + 1}`, media: { art: a } })) }),
  faq: () => ({ type: 'faq', nav: 'FAQ', eyebrow: 'Questions', title: 'Asked *often*', items: [{ q: 'A question people ask?', a: 'A short, friendly answer.' }] }),
  contact: () => ({ type: 'contact', nav: 'Contact', eyebrow: 'Contact', title: 'Say *hello*', text: 'I reply within a day.', email: 'you@example.com', cta: 'Email me' }),
};

function AddSection({ onAdd, existing }: { onAdd: (s: Section) => void; existing: Section[] }) {
  return (
    <Select<SectionType>
      label="+"
      placeholder="Add"
      value={null}
      onChange={(t) => {
        if (!t) return;
        const base = t === 'cards' ? 'work' : t;
        let id = base;
        let n = 2;
        while (existing.some((s) => s.id === id)) id = `${base}-${n++}`;
        onAdd({ ...NEW_SECTION[t](), id } as Section);
      }}
      options={(Object.keys(SECTION_LABELS) as SectionType[]).map((t) => ({ value: t, label: SECTION_LABELS[t] }))}
    />
  );
}

function SectionItem({
  section: s,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  section: Section;
  first: boolean;
  last: boolean;
  onChange: (s: Section, group?: string) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const title = 'title' in s ? s.title.replace(/\*/g, '') : s.type === 'quote' ? s.name : SECTION_LABELS[s.type];
  return (
    <div className={cx('s-secitem', open && 'is-open', s.hidden && 'is-hidden')}>
      <div className="s-secitem-head">
        <button type="button" className="s-secitem-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="s-secitem-type">{SECTION_LABELS[s.type]}</span>
          <span className="s-secitem-name">{title}</span>
        </button>
        <div className="s-secitem-tools">
          <button type="button" className="k-icon-btn" onClick={() => onMove(-1)} disabled={first} aria-label="Move up" data-tip="Move up">
            <IconChevronUp size={16} />
          </button>
          <button type="button" className="k-icon-btn" onClick={() => onMove(1)} disabled={last} aria-label="Move down" data-tip="Move down">
            <IconChevronDown size={16} />
          </button>
          <button type="button" className="k-icon-btn" onClick={() => onChange({ ...s, hidden: !s.hidden } as Section, 'hide')} aria-label={s.hidden ? 'Show' : 'Hide'} data-tip={s.hidden ? 'Show section' : 'Hide section'}>
            {s.hidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
          <button type="button" className="k-icon-btn" onClick={onRemove} aria-label="Delete section" data-tip="Delete (undo with ⌘Z)">
            <IconTrash size={16} />
          </button>
        </div>
      </div>
      {open && (
        <div className="s-secitem-body">
          <SectionEditor s={s} onChange={onChange} />
          {s.type !== 'stats' && s.type !== 'quote' && (
            <div className="s-row2">
              <Field label="Menu label (blank = not in menu)" value={s.nav ?? ''} onChange={(v) => onChange({ ...s, nav: v || undefined } as Section)} />
              <Field label="Section id (for links)" value={s.id} onChange={(v) => onChange({ ...s, id: slugify(v) || s.id } as Section)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionEditor({ s, onChange }: { s: Section; onChange: (s: Section, group?: string) => void }) {
  const up = <T extends Section>(patch: Partial<T>) => onChange({ ...s, ...patch } as Section);
  switch (s.type) {
    case 'stats':
      return (
        <ItemList
          items={s.items}
          onChange={(items) => up({ items })}
          make={() => ({ value: '1', label: 'new number' })}
          render={(it, set) => (
            <div className="s-row2">
              <Field label="Number" value={it.value} onChange={(v) => set({ ...it, value: v })} />
              <Field label="Label" value={it.label} onChange={(v) => set({ ...it, label: v })} />
            </div>
          )}
        />
      );
    case 'cards':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Toggle checked={s.showMedia} onChange={(v) => up<CardsSection>({ showMedia: v })} label="Pictures on cards" />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={(): CardItem => ({ title: 'New card', text: 'A sentence about it.', media: { art: 1 + Math.floor(Math.random() * 12) } })}
            render={(it, set, i) => (
              <>
                <Field label="Title" value={it.title} onChange={(v) => set({ ...it, title: v })} />
                <Field label="Text" value={it.text} multiline rows={2} onChange={(v) => set({ ...it, text: v })} />
                <div className="s-row2">
                  <Field label="Small label" value={it.meta ?? ''} onChange={(v) => set({ ...it, meta: v || undefined })} />
                  <Field label="Price" value={it.price ?? ''} onChange={(v) => set({ ...it, price: v || undefined })} />
                </div>
                {s.showMedia && <MediaPicker compact media={it.media} name={`${s.id}-${i + 1}`} onChange={(m) => set({ ...it, media: m })} />}
              </>
            )}
          />
        </>
      );
    case 'about':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Text" value={s.text} multiline rows={4} onChange={(v) => up({ text: v })} />
          <Field label="Points (one per line)" value={s.points.join('\n')} multiline rows={4} onChange={(v) => up({ points: v.split('\n').filter((x) => x.trim()) })} />
          <MediaPicker media={s.media} name={`${s.id}`} onChange={(m) => up({ media: m })} compact />
        </>
      );
    case 'list':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={() => ({ meta: 'When', title: 'What', text: '', aside: '' })}
            render={(it, set) => (
              <>
                <div className="s-row2">
                  <Field label="Left" value={it.meta} onChange={(v) => set({ ...it, meta: v })} />
                  <Field label="Right" value={it.aside ?? ''} onChange={(v) => set({ ...it, aside: v })} />
                </div>
                <Field label="Title" value={it.title} onChange={(v) => set({ ...it, title: v })} />
                <Field label="Text" value={it.text ?? ''} onChange={(v) => set({ ...it, text: v })} />
              </>
            )}
          />
        </>
      );
    case 'quote':
      return (
        <>
          <Field label="Quote" value={s.text} multiline rows={3} onChange={(v) => up({ text: v })} />
          <div className="s-row2">
            <Field label="Who said it" value={s.name} onChange={(v) => up({ name: v })} />
            <Field label="Who they are" value={s.role} onChange={(v) => up({ role: v })} />
          </div>
        </>
      );
    case 'gallery':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={() => ({ caption: 'New picture', media: { art: 1 + Math.floor(Math.random() * 12) } })}
            render={(it, set, i) => (
              <>
                <Field label="Caption" value={it.caption} onChange={(v) => set({ ...it, caption: v })} />
                <MediaPicker compact media={it.media} name={`${s.id}-${i + 1}`} onChange={(m) => set({ ...it, media: m })} />
              </>
            )}
          />
        </>
      );
    case 'faq':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={() => ({ q: 'A new question?', a: 'The answer.' })}
            render={(it, set) => (
              <>
                <Field label="Question" value={it.q} onChange={(v) => set({ ...it, q: v })} />
                <Field label="Answer" value={it.a} multiline rows={2} onChange={(v) => set({ ...it, a: v })} />
              </>
            )}
          />
        </>
      );
    case 'contact':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Text" value={s.text} multiline rows={2} onChange={(v) => up({ text: v })} />
          <div className="s-row2">
            <Field label="Email" type="email" value={s.email} onChange={(v) => up({ email: v })} />
            <Field label="Button" value={s.cta} onChange={(v) => up({ cta: v })} />
          </div>
          <div className="s-row2">
            <Field label="Phone" value={s.phone ?? ''} onChange={(v) => up({ phone: v || undefined })} />
            <Field label="Address" value={s.address ?? ''} onChange={(v) => up({ address: v || undefined })} />
          </div>
        </>
      );
  }
}

function HeadFields({ s, onChange }: { s: { eyebrow: string; title: string; intro?: string; type: string }; onChange: (p: never) => void }) {
  const up = onChange as unknown as (p: Record<string, string>) => void;
  return (
    <>
      <div className="s-row2">
        <Field label="Small label" value={s.eyebrow} onChange={(v) => up({ eyebrow: v })} />
        <Field label="Title" value={s.title} onChange={(v) => up({ title: v })} />
      </div>
      {'intro' in s && s.type !== 'about' && <Field label="Intro" value={s.intro ?? ''} onChange={(v) => up({ intro: v })} />}
    </>
  );
}

function ItemList<T>({ items, onChange, make, render }: { items: T[]; onChange: (items: T[]) => void; make: () => T; render: (it: T, set: (v: T) => void, i: number) => React.ReactNode }) {
  return (
    <div className="s-items">
      {items.map((it, i) => (
        <div key={i} className="s-item">
          <div className="s-item-head">
            <span>#{i + 1}</span>
            <div>
              <button type="button" className="k-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => onChange(swap(items, i, i - 1))}>
                <IconChevronUp size={14} />
              </button>
              <button type="button" className="k-icon-btn" aria-label="Move down" disabled={i === items.length - 1} onClick={() => onChange(swap(items, i, i + 1))}>
                <IconChevronDown size={14} />
              </button>
              <button type="button" className="k-icon-btn" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <IconTrash size={14} />
              </button>
            </div>
          </div>
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
        </div>
      ))}
      <button type="button" className="k-btn k-btn-sm" onClick={() => onChange([...items, make()])}>
        <IconPlus size={14} /> Add
      </button>
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const out = [...arr];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}
