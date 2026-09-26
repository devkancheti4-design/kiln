// Carve: the words and pictures. Edits here rewrite the page markup in the code, so you can
// watch plain HTML appear as you type (switch to Code to see it).
import { useState } from 'react';
import { pickFile, readImage } from '../app/images';
import { type CardItem, type CardsSection, type Content, type FormField, initialsOf, type Media, type Section, SECTION_LABELS, type SectionType } from '../engine/content';
import { slugify } from '../engine/exporter';
import { KINDS, kindIndex } from '../engine/kinds';
import { readTokens } from '../engine/patch';
import { ArtSwatch } from '../ui/ArtSwatch';
import { cx, Field, Modal, Select, Toggle, toast } from '../ui/controls';
import { IconChevronDown, IconChevronUp, IconEye, IconEyeOff, IconImage, IconPlus, IconTrash, IconX } from '../ui/icons';
import { PAGE_KINDS, type PageKind } from '../engine/pages';
import { HOME } from '../engine/render';
import { PanelSection } from './bits';
import { useStudio } from './state';

export function CarvePanel() {
  const { doc, page, current, setCurrent, locked, setContent, rebuildPage, addPage, removePage, movePage, renamePage } = useStudio();
  const c = page.content;
  const pageLinks = { pages: doc.pages.map((p) => ({ slug: p.slug, nav: p.nav })), current, home: doc.pages[0].content.sections };
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [kindAsk, setKindAsk] = useState<number | null>(null);
  const [keepName, setKeepName] = useState(true);

  const set = (fn: (c: Content) => Content, group = 'carve') => setContent(fn, group);

  const pagesPanel = (
    <PanelSection
      title="Pages"
      aside={
        <Select<PageKind>
          label="+"
          placeholder="Add a page"
          value={null}
          onChange={(k) => {
            if (!k) return;
            const slug = addPage(k, PAGE_KINDS.find((x) => x.id === k)!.name.split(' /')[0]);
            setCurrent(slug);
            toast('Page added — it shares the design; carve its own words here.');
          }}
          options={PAGE_KINDS.map((k) => ({ value: k.id, label: `${k.name} — ${k.note}` }))}
        />
      }
    >
      <div className="s-pages">
        {doc.pages.map((p, i) => (
          <div key={p.slug} className={cx('s-pageitem', p.slug === current && 'is-on')}>
            <button type="button" className="s-pageitem-open" onClick={() => setCurrent(p.slug)} aria-current={p.slug === current}>
              <span className="s-pageitem-file k-mono">{p.slug}.html</span>
              <span className="s-pageitem-nav">{p.slug === HOME ? 'Home' : p.nav || 'not in the menu'}</span>
            </button>
            {p.slug !== HOME && (
              <div className="s-secitem-tools">
                <button type="button" className="k-icon-btn" onClick={() => movePage(p.slug, -1)} disabled={i <= 1} aria-label="Move up" data-tip="Earlier in the menu">
                  <IconChevronUp size={16} />
                </button>
                <button type="button" className="k-icon-btn" onClick={() => movePage(p.slug, 1)} disabled={i === doc.pages.length - 1} aria-label="Move down" data-tip="Later in the menu">
                  <IconChevronDown size={16} />
                </button>
                <button
                  type="button"
                  className="k-icon-btn"
                  onClick={() => {
                    removePage(p.slug);
                    if (current === p.slug) setCurrent(HOME);
                  }}
                  aria-label="Delete page"
                  data-tip="Delete (undo with ⌘Z)"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {current !== HOME && (
        <div className="s-row2">
          <Field label="Menu label (blank = not in menu)" value={page.nav} onChange={(v) => renamePage(current, { nav: v })} />
          <Field label="File name" value={current} onChange={(v) => renamePage(current, { slug: v })} hint={<>Saved as <code>{current}.html</code></>} />
        </div>
      )}
      <p className="k-hint">
        {doc.pages.length > 1
          ? 'Every page shares the design. Links in the menu go to sections on the home page and to other pages.'
          : 'One page is often enough. Add pages for a menu, a gallery, a longer story or a contact page.'}
      </p>
    </PanelSection>
  );

  if (locked)
    return (
      <div className="s-locked">
        {pagesPanel}
        <h3>You are editing {current === HOME ? 'the page' : `${current}.html`} by hand</h3>
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
      {pagesPanel}
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
          <LinkField value={c.primary.href} sections={c.sections} site={pageLinks} onChange={(v) => set((x) => ({ ...x, primary: { ...x.primary, href: v } }))} />
        </div>
        {c.secondary ? (
          <div className="s-row2">
            <Field label="Second button" value={c.secondary.label} onChange={(v) => set((x) => ({ ...x, secondary: { ...x.secondary!, label: v } }))} />
            <LinkField value={c.secondary.href} sections={c.sections} site={pageLinks} onChange={(v) => set((x) => ({ ...x, secondary: { ...x.secondary!, href: v } }))} />
          </div>
        ) : null}
        <Toggle checked={!!c.secondary} onChange={(on) => set((x) => ({ ...x, secondary: on ? { label: 'Learn more', href: `#${x.sections[0]?.id ?? 'top'}` } : null }))} label="Second button" />
        <div className="s-row2">
          <Field label="Top bar button" value={c.navCta.label} onChange={(v) => set((x) => ({ ...x, navCta: { ...x.navCta, label: v } }))} />
          <LinkField value={c.navCta.href} sections={c.sections} site={pageLinks} onChange={(v) => set((x) => ({ ...x, navCta: { ...x.navCta, href: v } }))} />
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

      <PanelSection title="Banner">
        <Toggle checked={!!c.banner} onChange={(on) => set((x) => ({ ...x, banner: on ? { text: 'Something new — *read more*', href: '' } : null }))} label="A one-line strip above the top bar" />
        {c.banner && (
          <div className="s-row2">
            <Field label="Text" value={c.banner.text} onChange={(v) => set((x) => ({ ...x, banner: { ...x.banner!, text: v } }))} />
            <Field label="Link (optional)" value={c.banner.href ?? ''} onChange={(v) => set((x) => ({ ...x, banner: { ...x.banner!, href: v || undefined } }))} />
          </div>
        )}
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

/** Optional link for a card: nothing, a page, a section or a web address. */
function CardLink({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const { doc, current } = useStudio();
  const page = doc.pages.find((p) => p.slug === current)!;
  const site = { pages: doc.pages.map((p) => ({ slug: p.slug, nav: p.nav })), current, home: doc.pages[0].content.sections };
  if (value === undefined)
    return (
      <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => onChange(doc.pages.length > 1 ? `${doc.pages[1].slug}.html` : '#top')}>
        <IconPlus size={14} /> Make this card a link
      </button>
    );
  return (
    <div className="s-row-x s-row2">
      <LinkField value={value} sections={page.content.sections} site={site} onChange={onChange} />
      <span />
      <button type="button" className="k-icon-btn" aria-label="Remove link" onClick={() => onChange(undefined)}>
        <IconX size={16} />
      </button>
    </div>
  );
}

interface SiteLinks {
  pages: { slug: string; nav: string }[];
  current: string;
  home: Section[];
}

function LinkField({ value, sections, site, onChange }: { value: string; sections: Section[]; site?: SiteLinks; onChange: (v: string) => void }) {
  const here = site?.current ?? HOME;
  const options: { value: string; label: string }[] = [
    { value: '#top', label: 'Top of this page' },
    ...sections.filter((s) => !s.hidden).map((s) => ({ value: `#${s.id}`, label: `${s.nav || SECTION_LABELS[s.type]} section` })),
  ];
  if (site && site.pages.length > 1) {
    if (here !== HOME) options.push(...site.home.filter((s) => !s.hidden && s.nav).map((s) => ({ value: `${HOME}.html#${s.id}`, label: `Home → ${s.nav}` })));
    options.push(...site.pages.filter((p) => p.slug !== here).map((p) => ({ value: `${p.slug}.html`, label: `${p.slug === HOME ? 'Home' : p.nav || p.slug} page` })));
  }
  const known = options.some((o) => o.value === value);
  return (
    <label className="k-field">
      <span className="s-fake-label">Goes to</span>
      <select className="k-input" value={known ? value : '__custom'} onChange={(e) => onChange(e.target.value === '__custom' ? 'https://' : e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__custom">A web address…</option>
      </select>
      {!known && <input className="k-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" />}
    </label>
  );
}

// ------------------------------------------------------------------ pictures

function MediaPicker({ media, name, onChange, compact, logo }: { media: Media; name: string; onChange: (m: Media) => void; compact?: boolean; logo?: boolean }) {
  const { doc, page, setAssets } = useStudio();
  const tokens = readTokens(page.source);
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
      onChange({ art: media.art, image: path, alt: media.alt ?? file.name.replace(/\.[^.]+$/, '') });
      toast('Picture added — it lives inside your piece, on this device.');
    } catch (e) {
      toast(String((e as Error).message ?? e), 'warn');
    }
  };
  const uploadVideo = async () => {
    const file = await pickFile('video/mp4,video/webm');
    if (!file) return;
    if (file.size > 25_000_000) return toast('Keep videos under 25 MB — trim it or lower the quality first.', 'warn');
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    const ext = file.name.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4';
    let path = `images/${slugify(name)}.${ext}`;
    let n = 2;
    while (doc.assets[path] && doc.assets[path] !== dataUrl) path = `images/${slugify(name)}-${n++}.${ext}`;
    setAssets((a) => ({ ...a, [path]: dataUrl }));
    onChange({ art: media.art, video: path, alt: media.alt ?? file.name.replace(/\.[^.]+$/, '') });
    toast('Video added — it plays muted, on a loop.');
  };

  return (
    <div className={cx('s-media', compact && 's-media-compact')}>
      <div className="s-media-now">
        {media.video && doc.assets[media.video] ? (
          <video src={doc.assets[media.video]} muted autoPlay loop playsInline />
        ) : media.image && doc.assets[media.image] ? (
          <img src={doc.assets[media.image]} alt="" />
        ) : logo ? (
          <span className="s-media-art s-media-none">Aa</span>
        ) : (
          <ArtSwatch art={media.art} tokens={tokens} className="s-media-art" />
        )}
        <div className="s-media-actions">
          <button type="button" className="k-btn k-btn-sm" onClick={upload}>
            <IconImage size={14} /> {media.image ? 'Replace' : logo ? 'Use a logo image' : 'Use my photo'}
          </button>
          {!logo && !media.video && (
            <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={uploadVideo}>
              Use a video
            </button>
          )}
          {media.image || media.video ? (
            <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => onChange({ art: media.art })}>
              {logo ? 'Text only' : 'Back to art'}
            </button>
          ) : (
            !logo && (
              <button type="button" className="k-btn k-btn-sm k-btn-ghost" onClick={() => setOpen((o) => !o)}>
                {open ? 'Hide art' : 'Pick art'}
              </button>
            )
          )}
        </div>
      </div>
      {(media.image || media.video) && <Field label="Describe it (for screen readers)" value={media.alt ?? ''} onChange={(v) => onChange({ ...media, alt: v })} />}
      {!media.image && !media.video && !logo && open && (
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
  prose: () => ({ type: 'prose', nav: 'Story', eyebrow: 'Story', title: 'A longer *read*', body: 'Write paragraphs here. Leave a blank line between them.\n\n## A heading\n\nUse **bold**, *italic* and [links](https://example.com).\n\n- A list\n- of things\n\n> A quote someone said.' }),
  form: () => ({ type: 'form', nav: 'Write to us', eyebrow: 'Get in touch', title: 'Send a *message*', text: 'We reply within a day.', fields: ['name', 'email', 'message'], button: 'Send', action: '', email: 'you@example.com' }),
  embed: () => ({ type: 'embed', nav: 'Watch', eyebrow: 'Watch', title: 'A short *film*', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: '' }),
  table: () => ({ type: 'table', nav: 'Details', eyebrow: 'Details', title: 'At a *glance*', columns: ['Item', 'Detail', 'Price'], rows: [['Small', 'For one', '₹99'], ['Medium', 'For two', '₹149'], ['Large', 'For the table', '₹249']] }),
  logos: () => ({ type: 'logos', eyebrow: 'Seen in', items: [{ name: 'The Times' }, { name: 'Vogue' }, { name: 'Design Weekly' }, { name: 'Local Radio' }] }),
  slider: () => ({ type: 'slider', nav: 'Slides', eyebrow: 'Slides', title: 'Swipe *through*', items: [3, 8, 11, 5].map((a, n) => ({ caption: `Slide ${n + 1}`, media: { art: a } })) }),
  cta: () => ({ type: 'cta', eyebrow: 'Ready?', title: 'Let us *begin*.', text: 'One line that makes the ask.', button: { label: 'Get started', href: '#contact' } }),
  countdown: () => ({ type: 'countdown', nav: 'Countdown', eyebrow: 'Save the date', title: 'The big *day*', date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16), text: 'It is nearly here.' }),
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
          <div className="s-checks">
            <Toggle checked={s.showMedia} onChange={(v) => up<CardsSection>({ showMedia: v })} label="Pictures on cards" />
            <Toggle checked={!!s.people} onChange={(v) => up<CardsSection>({ people: v || undefined })} label="People (round photos)" />
          </div>
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
                <CardLink value={it.href} onChange={(v) => set({ ...it, href: v })} />
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
    case 'prose':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field
            label="Text"
            value={s.body}
            multiline
            rows={12}
            onChange={(v) => up({ body: v })}
            hint={<>Blank line = new paragraph. <code>## Heading</code>, <code>- bullet</code>, <code>&gt; quote</code>, <code>**bold**</code>, <code>[link](https://…)</code>, <code>![alt](images/photo.jpg)</code>.</>}
          />
        </>
      );
    case 'form':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Text" value={s.text} onChange={(v) => up({ text: v })} />
          <div className="s-checks">
            {(['name', 'email', 'phone', 'message'] as FormField[]).map((f) => (
              <Toggle key={f} checked={s.fields.includes(f)} onChange={(on) => up({ fields: on ? [...s.fields, f].sort((a, b) => ['name', 'email', 'phone', 'message'].indexOf(a) - ['name', 'email', 'phone', 'message'].indexOf(b)) : s.fields.filter((x) => x !== f) })} label={f} />
            ))}
          </div>
          <div className="s-row2">
            <Field label="Button" value={s.button} onChange={(v) => up({ button: v })} />
            <Field label="Your email (for the no-server option)" type="email" value={s.email} onChange={(v) => up({ email: v })} />
          </div>
          <Field
            label="Where messages go"
            value={s.action}
            placeholder="blank = visitor’s email app"
            onChange={(v) => up({ action: v })}
            hint={
              <>
                Blank: opens the visitor’s email app with the message filled in (no server needed). Type <code>netlify</code> if you host on Netlify. Or paste a form address from Formspree, Basin or
                Getform to collect messages in an inbox.
              </>
            }
          />
        </>
      );
    case 'embed':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Link" value={s.url} onChange={(v) => up({ url: v })} hint="Paste a YouTube, Vimeo, Spotify or Google Maps link — or a place name for a map." />
          <Field label="Caption" value={s.caption} onChange={(v) => up({ caption: v })} />
        </>
      );
    case 'table':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Columns (comma-separated)" value={s.columns.join(', ')} onChange={(v) => up({ columns: v.split(',').map((x) => x.trim()) })} />
          <Field
            label="Rows (one per line, cells separated by |)"
            value={s.rows.map((r) => r.join(' | ')).join('\n')}
            multiline
            rows={6}
            onChange={(v) => up({ rows: v.split('\n').filter((l) => l.trim()).map((l) => l.split('|').map((x) => x.trim())) })}
          />
        </>
      );
    case 'logos':
      return (
        <>
          <Field label="Small label" value={s.eyebrow} onChange={(v) => up({ eyebrow: v })} />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={(): { name: string; media?: Media } => ({ name: 'New name' })}
            render={(it, set, i) => (
              <>
                <Field label="Name" value={it.name} onChange={(v) => set({ ...it, name: v })} />
                <MediaPicker compact media={it.media ?? { art: 1 }} name={`${s.id}-${i + 1}`} onChange={(m) => set({ ...it, media: m.image ? m : undefined })} logo />
              </>
            )}
          />
        </>
      );
    case 'slider':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <ItemList
            items={s.items}
            onChange={(items) => up({ items })}
            make={() => ({ caption: 'New slide', media: { art: 1 + Math.floor(Math.random() * 12) } })}
            render={(it, set, i) => (
              <>
                <Field label="Caption" value={it.caption} onChange={(v) => set({ ...it, caption: v })} />
                <MediaPicker compact media={it.media} name={`${s.id}-${i + 1}`} onChange={(m) => set({ ...it, media: m })} />
              </>
            )}
          />
        </>
      );
    case 'cta':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Text" value={s.text} onChange={(v) => up({ text: v })} />
          <div className="s-row2">
            <Field label="Button" value={s.button.label} onChange={(v) => up({ button: { ...s.button, label: v } })} />
            <LinkField value={s.button.href} sections={[]} onChange={(v) => up({ button: { ...s.button, href: v } })} />
          </div>
        </>
      );
    case 'countdown':
      return (
        <>
          <HeadFields s={s} onChange={up} />
          <Field label="Date and time" type="datetime-local" value={s.date} onChange={(v) => up({ date: v })} />
          <Field label="Text" value={s.text} onChange={(v) => up({ text: v })} />
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
