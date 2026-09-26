// The W3Schools-style reference: what each token, switch and element does, and one thing to try.
// Used by the Code panel tip bar, the inspector and the Guide.
import { FORMS, INTERACTIONS, MOTIONS, SCENES, TEXTURES } from '../engine/axes';
import { FACES } from '../engine/typefaces';

export interface Ref {
  title: string;
  body: string;
  try?: string;
}

export const TOKEN_REF: Record<string, Ref> = {
  'color-scheme': { title: 'color-scheme', body: 'Tells the browser whether your page is light or dark, so scrollbars and form fields match.', try: 'Set it to dark when your --bg is a dark color.' },
  '--bg': { title: '--bg · page color', body: 'The background of the whole page. Surfaces, lines and soft tints are mixed from it automatically.', try: 'Try #101014 with a light --ink for a dark site.' },
  '--ink': { title: '--ink · text color', body: 'The color of your words. Keep it far from --bg so it reads well — the Glaze panel shows the contrast score.', try: 'Try a very dark blue like #10213b instead of black.' },
  '--accent': { title: '--accent · highlight color', body: 'Buttons, links, the logo mark and *highlighted* words. Button text turns black or white automatically to stay readable.', try: 'Drag the swatch, or type a new hex like #2f7a55.' },
  '--font-display': { title: '--font-display · heading font', body: `Any of the ${FACES.length} fonts shipped with Kiln works offline: ${FACES.map((f) => f.family).join(', ')}.`, try: 'Replace the first name with "Unbounded".' },
  '--font-body': { title: '--font-body · reading font', body: 'The font for paragraphs, buttons and menus. Calm, readable fonts work best here.', try: 'Try "DM Sans" or "Karla".' },
  '--display-weight': { title: '--display-weight · heading boldness', body: 'From 200 (hairline) to 900 (heavy). Fonts with a single weight fake bolder weights.', try: 'Drag the number up to 800.' },
  '--tracking': { title: '--tracking · letter spacing', body: 'Space between heading letters, in em (a share of the font size). Big headings usually look best a little tight.', try: 'Try -0.05em, then 0.05em.' },
  '--scale': { title: '--scale · heading size ratio', body: 'Each heading level is this many times bigger than the last. 1.15 feels calm; 1.6 feels loud.', try: 'Drag it to 1.55 and watch the hero grow.' },
  '--radius': { title: '--radius · corners', body: 'One number rounds every button, card and picture. 0px is sharp; 999px makes buttons pills (cards stop at 28px).', try: 'Try 0px, then 999px.' },
  '--space': { title: '--space · breathing room', body: 'Multiplies every gap and section padding. 0.8 is compact, 1.3 is airy.', try: 'Drag it to 1.5.' },
  '--width': { title: '--width · page width', body: 'The widest your content gets on big screens. Narrow pages feel like letters; wide ones feel like magazines.', try: 'Try 860px.' },
};

export const SWITCH_REF: Record<string, Ref & { values: string[] }> = {
  form: { title: 'data-form · the layout', body: 'One word on <body> rearranges the whole page with the CSS in section 3.8. Your words never move in the code.', values: FORMS.map((f) => f.id), try: 'Change it to "poster" or "bento".' },
  texture: { title: 'data-texture · the background texture', body: 'A pattern behind everything, drawn in your own colors.', values: TEXTURES.map((t) => t.id), try: 'Try "grid" or "waves".' },
  motion: { title: 'data-motion · how sections arrive', body: 'Sections fade up as you scroll (script 4). "lively" also staggers cards and lets the hero art drift.', values: MOTIONS.map((m) => m.id), try: 'Set "lively" and scroll the preview.' },
  scene: { title: 'data-scene · a 3D object in the hero', body: 'Script 6 draws a real-time 3D object with WebGL into the hero picture, in your colors. The light follows the cursor.', values: SCENES.map((m) => m.id), try: 'Try "vase" — it spins on a potter’s wheel.' },
  interact: { title: 'data-interact · cursor effects', body: 'Script 5 makes the page answer the cursor: cards tilt, a spotlight follows, or buttons pull like magnets.', values: INTERACTIONS.map((m) => m.id), try: 'Try "tilt" and hover over a card.' },
};

export const ELEMENT_REF: Record<string, Ref> = {
  nav: { title: '<header class="nav"> · top bar', body: 'Your name on the left, the menu, and one button. It sticks to the top as you scroll (except in some forms).', try: 'Change the words inside the <a class="brand">.' },
  brand: { title: '<a class="brand"> · your name', body: 'The name in the top bar. The <span class="mark"> inside is the little logo badge.', try: 'Put your own name here.' },
  mark: { title: '<span class="mark"> · logo letters', body: 'A badge in your accent color. Keep it to 1–3 letters.', try: 'Try your initials.' },
  menu: { title: '<nav class="menu"> · the menu', body: 'Each link jumps to a section by its id: href="#work" goes to <section id="work">.', try: 'Copy one <a> line and point it at another section id.' },
  btn: { title: '<a class="btn"> · a button', body: 'Any link with class "btn" becomes a button. Add "ghost" for an outline, "small" or "big" for size.', try: 'Change class="btn" to class="btn ghost".' },
  ghost: { title: 'class="btn ghost"', body: 'An outline button — quieter than the main one.', try: 'Remove "ghost" to make it solid.' },
  hero: { title: '<section class="hero"> · the first screen', body: 'The headline, intro, buttons and picture. The form decides how they are arranged.', try: 'Change the words in the <h1>.' },
  'hero-copy': { title: '<div class="hero-copy">', body: 'Groups the words of the hero so forms can place them as one block.', try: 'Reorder the <p> and <h1> lines inside it.' },
  eyebrow: { title: '<p class="eyebrow"> · small label', body: 'A short line in capitals above a title. It uses your accent color.', try: 'Write where you are based.' },
  lede: { title: '<p class="lede"> · intro', body: 'One or two sentences under the headline, a little larger than normal text.', try: 'Say what you do in one sentence.' },
  actions: { title: '<div class="actions"> · button row', body: 'Holds the hero buttons side by side.', try: 'Copy a button line to add a third.' },
  'hero-media': { title: '<figure class="hero-media"> · hero picture', body: 'Holds painted art (<div class="art art-8">) or your photo (<img src="images/…">). A 3D scene draws over it when data-scene is on.', try: 'Change art-8 to art-2.' },
  art: { title: '<div class="art art-N"> · painted art', body: 'Twelve artworks painted only with CSS gradients in your colors: art-1 to art-12.', try: 'Change the number from 1 to 12.' },
  stats: { title: '<section class="stats"> · numbers', body: 'Big figures with small labels, in a row that wraps on phones.', try: 'Copy a <div class="stat"> line to add a number.' },
  stat: { title: '<div class="stat">', body: '<strong> holds the number, <span> the label.', try: 'Change 8+ to 10+.' },
  cards: { title: '<section class="cards"> · cards', body: 'A heading and a grid of <article class="card">. Cards without a picture become neat panels (menus, services).', try: 'Copy a whole <article> … </article> to add a card.' },
  grid: { title: '<div class="grid"> · the card grid', body: 'Arranges cards in columns that fit the screen. Forms change the columns (bento makes tiles, poster makes a list).', try: 'Switch data-form to "bento".' },
  card: { title: '<article class="card"> · one card', body: 'A picture (.card-media) and words (.card-body). Add <p class="price"> for a price on the right.', try: 'Add <p class="price">₹499</p> after the text.' },
  'card-media': { title: '<div class="card-media"> · card picture', body: 'Holds art or an <img>. Delete this whole line for a text-only card.', try: 'Change the art number.' },
  'card-body': { title: '<div class="card-body"> · card words', body: 'Small label (.meta), title (<h3>), text and optional price.', try: 'Edit the <h3>.' },
  meta: { title: '<p class="meta"> · small label', body: 'A year, a category or reading time, in small capitals.', try: 'Write "2026 · Personal".' },
  price: { title: '<p class="price"> · price', body: 'Sits beside the title in your accent color.', try: 'Change the amount.' },
  about: { title: '<section class="about"> · about', body: 'A picture beside a heading, some text and a list of points.', try: 'Add another <li> to the points.' },
  'about-media': { title: '<figure class="about-media">', body: 'The about picture — art or your photo.', try: 'Swap in <img src="images/me.jpg" alt="Me">.' },
  points: { title: '<ul class="points"> · bullet points', body: 'Each <li> gets a dot in your accent color.', try: 'Copy an <li>.' },
  list: { title: '<section class="list"> · rows', body: 'Timelines, prices, opening hours: each <li class="row"> has a left label, a title and a right note.', try: 'Copy a whole <li class="row"> block.' },
  rows: { title: '<ol class="rows">', body: 'The list itself. Rows get lines between them.', try: 'Move a row up or down.' },
  row: { title: '<li class="row"> · one row', body: 'Left: .row-meta · middle: <h3> and text · right: .row-aside.', try: 'Change the right-hand note.' },
  'row-meta': { title: '<span class="row-meta">', body: 'The left column — dates, days, numbers.', try: 'Write a date.' },
  'row-aside': { title: '<span class="row-aside">', body: 'The right column in your accent color — prices or places.', try: 'Write a price.' },
  quote: { title: '<section class="quote"> · a quote', body: 'Big words someone said about you. The curly quote marks are added by CSS.', try: 'Write a real quote from a friend or client.' },
  gallery: { title: '<section class="gallery"> · pictures', body: 'A masonry wall of pictures. Click one in your site to open it larger.', try: 'Copy a <figure class="shot"> line.' },
  shots: { title: '<div class="shots">', body: 'CSS columns stack the pictures like bricks.', try: 'Change art numbers for variety.' },
  shot: { title: '<figure class="shot">', body: 'One picture with a <figcaption> under it.', try: 'Edit the caption.' },
  faq: { title: '<section class="faq"> · questions', body: 'Each <details> opens when clicked — the browser does it, no script needed.', try: 'Copy a <details> line and write a new question.' },
  qa: { title: '<div class="qa">', body: 'The list of questions.', try: 'Add <details open> to open one by default.' },
  contact: { title: '<section class="contact"> · contact', body: 'A big title, a line of text, an email button and your details.', try: 'Change the email in href="mailto:…".' },
  details: { title: '<ul class="details">', body: 'Small labelled lines: email, phone, address.', try: 'Add <li><span>Hours</span>9 – 5</li>.' },
  footer: { title: '<footer class="footer">', body: 'The last line of the page and links to your profiles.', try: 'Add a link to your Instagram.' },
  socials: { title: '<nav class="socials">', body: 'Links to your profiles elsewhere.', try: 'Copy an <a> line.' },
  'section-head': { title: '<header class="section-head">', body: 'A section’s small label, title and intro. Editorial forms number them automatically.', try: 'Edit the <h2>.' },
  intro: { title: '<p class="intro">', body: 'A sentence under a section title.', try: 'Write one sentence.' },
  site: { title: '<body class="site">', body: 'The whole page. Its data- attributes are the switches.', try: 'Change data-form.' },
};

export const REGION_REF: Record<string, Ref> = {
  tokens: { title: '1 · Tokens', body: 'Twelve values that the whole design reads. Change one and everything that uses it changes — this is how one file becomes millions of sites.', try: 'Drag a number, or click a color swatch.' },
  fonts: { title: '2 · Fonts', body: 'Kiln keeps this block in sync with your --font tokens and ships the font files with your site, so it works offline.', try: 'Change a --font token instead of editing here.' },
  engine: { title: '3 · Engine', body: 'The CSS that turns tokens into a website: layout forms, textures, art, motion. It is folded — click the arrow in the margin to open it.', try: 'Search it for [data-form="poster"] to see how a layout works.' },
  switches: { title: 'Switches', body: 'Five words on <body> — form, texture, motion, scene and interact — each rearrange or animate the whole page.', try: 'Change data-form to another word from the list above it.' },
  motion: { title: '4 · Motion script', body: 'A dozen lines of JavaScript that add class="is-in" to sections as they scroll into view.', try: 'Change -8% to -30% so sections arrive later.' },
  interact: { title: '5 · Interaction script', body: 'Tracks the cursor to tilt cards, move a spotlight or pull buttons. Also opens gallery pictures larger.', try: 'Change 9 to 20 in the tilt math for a stronger lean.' },
  scene: { title: '6 · Scene script', body: 'A tiny WebGL renderer: one fragment shader raymarches a 3D shape made from distance functions and lights it with your colors.', try: 'Find T * 0.9 in the vase and make the wheel spin faster.' },
};
