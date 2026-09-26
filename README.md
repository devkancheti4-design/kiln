# Kiln — throw a website

**An offline, infinite website maker.** Kiln's catalog holds **487,710,720 real websites**:
every combination of a few hand-made pieces. Pick one, carve your name into it, learn to change
its code with a W3Schools-style guide, then fire it: download plain files you own.

No AI, no account, no server, no internet. Everything runs on your device.

**Try it:** https://kiln-website-maker.vercel.app. The **Offline app** button there downloads
`Kiln.html`, the whole app in one file that works without internet.

```
12 kinds × 10 forms × 24 glazes × 2 moods × 12 type pairs × 4 corners × 3 spacings
   × 7 textures × 3 motions × 7 3D scenes × 4 cursor styles = 487,710,720 designs
```

## Run it

```bash
npm install
npm run dev          # http://localhost:5281
```

**Fully offline, one file:** `npm run offline` builds `dist-single/Kiln.html` (about 2.3 MB, every
font inside). Double-click it or copy it to a USB stick. It needs no network at all.

`npm run build` makes both the offline file and a normal static folder in `dist/` for any web host.
`npm test` runs the engine tests (enumeration, contrast of all 48 color moods, code patching,
split/join round-trips).

## The loop, like a potter's wheel

| Step | What you do | What it changes in the code |
| --- | --- | --- |
| **Wheel** | Browse the catalog, filter it, or open today's **Kiln Daily** (12 new designs every day, the same for everyone) | — |
| **Shape** | Spin the wheel (flick, drag or press Space), lock what you love, pick a form, 3D scene, cursor effect, corners, spacing | the switches on `<body>` and the shape tokens |
| **Glaze** | 24 glazes × light/dark, a hue ring, your own three colors with contrast scores, 12 type pairs, textures | the color and type tokens |
| **Carve** | Your name, words, buttons, photos, sections (cards, lists, gallery, FAQ, contact) | the page markup |
| **Code** | The real file: drag numbers to scrub them, click swatches, tips for whatever the cursor is on, inspect mode (point at the page to jump to its code) | anything |
| **Fire** | Download one file, a website folder, or a project split for code editors and AI agents | — |

Every control shows the exact line of code it edits and can jump there. Designs that match the
catalog show their number. Anything changed beyond it becomes **✦ Original, one of one**, with a
maker's mark (hallmark) that changes whenever the code does.

## Your editor, your choice

Kiln's own editor is the easiest way to change a site live, but nothing is locked in.

- **Open in your editor** (Studio → *Open in…*) links a real folder on your computer. Kiln writes
  the site there and syncs both ways: save in **VS Code, Antigravity, Cursor or Windsurf** and the
  Kiln preview updates; change something in Kiln and the files update. Drop pictures into
  `images/` and they show up. Folder linking uses the File System Access API (Chrome, Edge, Arc,
  Brave). Other browsers can download the project and import changed files back.
- **Vibe-coding:** every project includes `AGENTS.md`, a one-page map of the site. An AI agent
  reads the map and a 1 KB `css/tokens.css` instead of the whole 50 KB engine, so changes cost far
  fewer tokens.

## What a Kiln site looks like inside

```
index.html
  1 · TOKENS     12 values (--bg, --ink, --accent, fonts, --scale, --radius, --space, --width)
  2 · FONTS      bundled @font-face rules (kept in sync automatically)
  3 · ENGINE     the CSS: 10 layout forms, 7 textures, 12 CSS-painted artworks, motion, cursor effects
  <body class="site" data-form data-texture data-motion data-scene data-interact>
  the page       plain semantic HTML with comments
  4 · MOTION     sections arrive as you scroll
  5 · INTERACTION tilt / spotlight / magnetic, plus a gallery lightbox
  6 · SCENE      real-time 3D in plain WebGL (raymarched shapes, light follows the cursor)
```

The same HTML becomes every layout. Only CSS changes, as in the CSS Zen Garden.

## Code map

```
src/engine/     the generator (no React): genome & enumeration, palettes, typefaces, kinds (content),
                site.css (the engine), render, patch (source is the single source of truth),
                scene (WebGL), preview, thumb, split (projects + AGENTS.md), exporter, zip
src/studio/     Studio, panels (Shape, Glaze, Carve, Code), CodeMirror editor, Preview, Fire, Open in…
src/pages/      Wheel (catalog + Kiln Daily), Shelf, Guide
src/guide/      lessons (with self-checking challenges) and the reference behind the code tips
src/app/        routing, IndexedDB shelf, prefs, folder sync, image import
```

Fonts are open-licensed (SIL OFL). Each export includes the license files for the fonts it uses.
