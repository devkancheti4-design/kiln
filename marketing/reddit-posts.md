# Reddit drafts for Kiln (review before posting)

Rules of thumb:
- Post to **one or two subreddits a day**, not all at once. Cross-posting the same text everywhere gets flagged as spam.
- Read each subreddit's rules on the day you post, since self-promotion rules change.
- Reply to every comment in the first hour. That matters more than the title.
- A **20–40 second screen recording** (spin the wheel → carve a name → drag a number in the code → a 3D vase turns) beats any screenshot.
- Most of these subreddits expect a **link people can try**. Kiln is only on this laptop right now, so host `dist/` first (Netlify Drop, GitHub Pages or Cloudflare Pages) or attach the video and offer `Kiln.html` in the comments.

---

## 1. r/webdev: Showoff Saturday only (today, Saturday 26 Sep, qualifies)

**Title:** [Showoff Saturday] I built an offline website maker where one HTML file becomes 487 million different sites

**Body:**
Kiln is a free website maker that runs entirely offline, with no AI, no account and no server.

The idea: every site is the *same* semantic HTML. Twelve CSS custom properties (colors, fonts, radius, spacing…) plus five `data-*` words on `<body>` (layout, texture, motion, 3D scene, cursor effect) decide what it looks like. Multiply the options and you get 487,710,720 real, working designs, each with a number that always rebuilds the same site.

What you can do:
- Spin a "potter's wheel" to throw random designs, and lock the parts you like
- Carve in your own words and photos
- Edit the actual code: drag numbers to scrub them, click color swatches, point at anything on the page to jump to its line
- 25 short W3Schools-style lessons with challenges that check themselves
- Hero scenes in plain WebGL (raymarched shapes, no three.js) where the light follows your cursor
- Export as a single HTML file, a site folder, or a project split for VS Code with an AGENTS.md map

Everything is plain HTML/CSS/JS with no build step, so the output is yours.

Would love feedback on the CSS architecture. All 10 layouts use identical markup, CSS Zen Garden style.

[link / video]

---

## 2. r/SideProject

**Title:** I made a free offline website maker: 487M ready sites, and it teaches you the code as you change it

**Body:**
I wanted a site builder that doesn't lock you in and doesn't need the internet.

Kiln has a catalog of every combination of a few hand-made pieces (10 layouts × 24 color glazes × 12 font pairs × 7 3D scenes…) = 487,710,720 websites. Pick one, put your name in, change anything, and download plain HTML you own.

Every slider shows the exact line of code it edits, so you learn by watching. There's also a daily drop: 12 new designs every day, the same for everyone in the world, so you can compare what you made with friends.

Tech: React + CodeMirror for the app. The generated sites are dependency-free HTML/CSS with a tiny WebGL renderer. The whole app is one 2.2 MB HTML file you can double-click offline.

Feedback welcome, especially on what would make you actually use it.

[link / video]

---

## 3. r/web_design

**Title:** One HTML file, 10 completely different layouts: only CSS changes (live demo inside)

**Body:**
I've been building a website maker around the CSS Zen Garden idea: the markup never changes. Layout is one attribute (`data-form="bento"`, `"editorial"`, `"poster"`, `"brutalist"`…). Color is three custom properties, and the engine mixes surfaces, lines and readable button text with `color-mix()` and relative `oklch()`.

All 48 color moods are contrast-tested (text ≥ 10:1, muted text and accent text ≥ 4.5:1).

Curious what designers think of the layouts. Which ones feel generic?

[link / video]

---

## 4. r/css

**Title:** Automatic black/white button text from any accent color with relative oklch(), and other tricks from a 10-layout CSS engine

**Body:**
`--on-accent: oklch(from var(--accent) clamp(0, (0.6 - l) * 1000, 1) 0 0);`

That one line picks black or white text for any accent. It's part of an engine where 12 tokens and one `data-form` attribute restyle identical markup into 10 layouts: container queries throughout, `color-mix()` surfaces, `:has()` for bento tiles, CSS-only painted art (12 gradient "illustrations" that recolor with the palette).

Happy to share the full stylesheet. It's readable on purpose, since the app teaches it.

[link]

---

## 5. r/vibecoding

**Title:** Tip: give your AI agent a one-page map instead of your whole codebase. My site exports cut agent context about 6×

**Body:**
My website maker (Kiln, offline, no AI inside) exports sites as a small project: `index.html` (9 KB), `css/tokens.css` (1 KB), a big `css/engine.css`, and an `AGENTS.md` that says "colors are in tokens.css, layout is one word on `<body>`, don't read engine.css unless you're adding a layout."

In Antigravity/Cursor, the agent reads about 14 KB instead of 79 KB for most edits, so it's faster and cheaper. It also links a folder two-way: edit in your IDE, and the Kiln preview updates live.

[link]

---

## 6. r/webgl / r/GraphicsProgramming

**Title:** Six raymarched hero scenes in a single small fragment shader, shipped inside every exported website

**Body:**
Blob metaballs, a glazed vase turning on a potter's wheel, a gyroscope, orbiting moons, a twisting crystal and a wave grid. Each is an SDF in one WebGL1 fragment shader, lit with the site's own three brand colors (read live from CSS custom properties), with the key light following the cursor. It adapts resolution to frame time and pauses offscreen. Gallery thumbnails are rendered as stills from one shared context.

[link / video]

---

## 7. r/developersIndia (check their showcase rules and day first)

**Title:** Made a free website maker that works fully offline: 487M ready sites, and it teaches HTML/CSS as you edit

(Adapt the r/SideProject body. Mention it works without internet, which helps in low-connectivity areas and for students.)

---

## Not recommended

- r/InternetIsBeautiful: only once it's hosted, and they dislike self-promotion from new accounts.
- r/learnprogramming: no self-promotion.
- r/opensource: only if you publish the code with a license.
