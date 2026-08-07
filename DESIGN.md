---
name: mMori
description: A fitness log that measures everything against the weeks of a life.
colors:
  sky-deep: "#0f0c29"
  sky-mid: "#302b63"
  sky-far: "#24243e"
  neon-pink: "#ff0077"
  neon-pink-strong: "#e6006f"
  neon-magenta: "#ff08f8"
  neon-blue: "#08f"
  violet: "#590fb7"
  violet-hover: "#7a00cc"
  signal-sand: "#ffcc00"
  panel: "#333333"
  panel-strong: "#222222"
  panel-muted: "#555555"
  surface-raised: "#1e1e2e"
  ink-on-sky: "#ffffff"
  ink-muted: "#aaaaaa"
  ground: "#121212"
  accent-light: "#c2005c"
  panel-light: "#f2f2f7"
  ink-light: "#1b1b2f"
  ground-light: "#ffffff"
typography:
  display:
    fontFamily: "'Roboto Mono', ui-monospace, monospace"
    fontSize: "48px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "'Roboto Mono', ui-monospace, monospace"
    fontSize: "2em"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "2px"
  title:
    fontFamily: "'Roboto Mono', ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "'Roboto Mono', ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Roboto Mono', ui-monospace, monospace"
    fontSize: "1em"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "24px"
  sp-6: "32px"
  sp-7: "48px"
  sp-8: "64px"
components:
  button-primary:
    backgroundColor: "linear-gradient(to right, {colors.neon-pink} 0%, {colors.violet} 100%)"
    textColor: "{colors.ink-on-sky}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "linear-gradient(to right, {colors.neon-pink} 0%, {colors.violet-hover} 100%)"
  button-primary-active:
    backgroundColor: "linear-gradient(to right, {colors.neon-pink} 0%, {colors.violet} 100%)"
  button-disabled:
    backgroundColor: "{colors.panel-muted}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-on-sky}"
    rounded: "{rounded.lg}"
    padding: "20px"
  sky-surface:
    backgroundColor: "linear-gradient(to bottom, {colors.sky-deep}, {colors.sky-mid}, {colors.sky-far})"
    textColor: "{colors.ink-on-sky}"
    rounded: "{rounded.lg}"
    padding: "20px"
  value-readout:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.neon-pink}"
    rounded: "{rounded.sm}"
    padding: "5px"
    size: "2em"
  input-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-on-sky}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px"
  theme-toggle:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.ink-on-sky}"
    rounded: "{rounded.full}"
    height: "50px"
    width: "50px"
---

# Design System: mMori

## 1. Overview

**Creative North Star: "The Observation Deck"**

You come here to look at something larger than yourself. The system is built around a single
act: standing at a window at night and seeing the whole shape of a life at once. Everything
above the glass is sky, deep indigo shading to violet, lit by a neon horizon line. Everything
below it is instrumentation, plain panels holding plain numbers, arranged so they never
compete with the view.

The two registers are strictly separated and that separation is the entire system. **The sky
is reserved for the life figure and nothing else** — the header, the dashboard's life panel
with its grid, and the onboarding preview that shows the number being assembled. It does not
invert when the theme changes. Counting the surfaces is the wrong test; asking whether the
surface is about the shape of a life is the right one. Panels, forms, catalogues, and inputs are the deck: matte,
functional, unglamorous, deliberately dull so that looking up still means something. A design
that glows everywhere has nothing left to emphasise.

Density is generous rather than tight. Every major container is 80% of the viewport capped at
1400px, centred, with 20px of air between blocks, which gives the app a consistent unhurried
column down the middle of the screen. Nothing is packed. The system explicitly rejects the
rounded-blue-card language of corporate fitness apps, the elevation-and-grey of a default
Material dashboard, and the black-and-grey severity of a death clock.

**Architecture:** the token layer follows **Material 3's structure** — reference tonal
palettes, semantic surface / on-surface roles, state-layer opacities, a 4px spacing scale,
shape and motion tokens — with none of Material's *values*. Every ramp is generated in OKLCH
from this app's own seed (`#ff0077`), tones mapped as `L = (tone + 16) / 116`. The system is
systematic without looking like a stock Material app, which remains an anti-reference. There
is no Angular Material dependency; adopting the library would cost back the ~355 kB its
removal saved.

**Key Characteristics:**
- Night sky on two surfaces only; matte panels everywhere else
- One typeface, monospaced, at every size
- Neon glow reserved for the two sky surfaces; never decoration
- Flat fills, never gradients, on controls
- Structural shadows that separate surfaces without floating them
- A single centred column: 80% width, 1400px maximum
- Spacing from a 4px scale; no ad-hoc values

## 2. Colors

A deep-space palette: indigo through violet for the sky, hot neon pink for anything that
matters, and flat greys for everything doing actual work.

### Primary
- **Neon Pink** (`#ff0077`): The value colour. Weeks left, current weight, BMI, training
  count, every heading that names a number, and the lived dots on the life chart. This is the
  colour of *data that means something*, and it appears nowhere else. Its light-theme
  counterpart is a deeper rose (`#c2005c`) chosen to survive on pale panels.
- **Neon Pink Strong** (`#e6006f`): The pressed and hovered state of the pink; never a
  resting colour.

### Secondary
- **Horizon Blue** (`#08f`): The neon line. A 5px bottom border under the header and a 2px
  frame around the life chart. It draws the horizon and does nothing else.
- **Deck Violet** (`#590fb7`): The far end of every button gradient, and the shadow side of
  the sky. Hovering drives it brighter (`#7a00cc`).

### Tertiary
- **Magenta Flare** (`#ff08f8`): Reserved exclusively for the header's text glow, the
  brightest thing in the app. Using it anywhere else flattens the hierarchy the whole system
  depends on.
- **Signal Sand** (`#ffcc00`): The loading spinner only. A warm interruption in a cold
  palette, which is what makes waiting legible.

### Neutral
- **Sky Deep / Mid / Far** (`#0f0c29` → `#302b63` → `#24243e`): The three-stop vertical
  gradient that *is* the night sky. Top to bottom, always in that order.
- **Panel** (`#333333`): The default matte surface for cards, headings, and list items.
- **Panel Strong** (`#222222`): Sits behind numeric readouts to lift them off the panel.
- **Panel Muted** (`#555555`): Disabled controls and inert surfaces.
- **Surface Raised** (`#1e1e2e`): Input interiors; slightly violet so fields read as part of
  the sky family rather than as holes.
- **Ink on Sky** (`#ffffff`) and **Ink Muted** (`#aaaaaa`): Text on any dark surface.
- **Ground** (`#121212`): The page behind everything.

### Named Rules

**The Sky Stays Dark Rule.** Every sky surface keeps the night-sky gradient in *both*
themes. The light theme lightens the panels, cards, inputs, and menus
around them and leaves the sky alone. The glow only reads against a dark backdrop; inverting
these two surfaces cascades contrast failures through every glow effect in the app.

**The Glow Means Meaning Rule.** Neon glow (`text-shadow`) marks a value, never a container
and never a label. If a glowing element is not a number the user came to read, remove the
glow. Decorative glow is the fastest way to turn this system into the doom-clock aesthetic it
exists to avoid.

**The One Voice Rule.** Neon Pink covers no more than 10% of any screen. Its rarity is what
makes a number feel like it matters.

## 3. Typography

**Display Font:** Roboto Mono (with `ui-monospace`, `monospace`)
**Body Font:** Roboto Mono (with `ui-monospace`, `monospace`)
**Label/Mono Font:** the same

**Character:** One monospaced family at every size, from the 48px header down to form labels.
Monospace is not a stylistic flourish here; it is the correct voice for an app that is almost
entirely numbers, and it makes columns of figures line up without any table machinery. Weight
and size carry the entire hierarchy, which is why the scale steps are wide.

### Hierarchy
- **Display** (500, 48px, 1.1): The app name in the header. Appears exactly once per page.
- **Headline** (500, 2em / 32px, 1.2, `letter-spacing: 2px`): The life-chart title. The
  letter-spacing is the one deliberately retro gesture in the type system, and it is confined
  to this single element.
- **Title** (400, 24px, 1.3): The tagline beneath the app name, and section headings.
- **Body** (400, 16px, 1.5): All prose, buttons, inputs, and list items. Cap running text at
  65–75ch; almost nothing in this app is long enough to reach it.
- **Label** (700, 1em, 1.4): Form labels. Weight, not size or colour, is what separates a
  label from its field.

### Named Rules

**The One Typeface Rule.** Roboto Mono, everywhere, no exceptions. Every stylesheet in the
project already specifies it. Adding a second family to "warm things up" breaks the
instrument-panel consistency that makes the numbers readable.

**The Load What You Specify Rule.** A font declared in CSS and absent from `index.html` is not
a design choice, it is a silent fallback to whatever the operating system supplies, and the
app will look different on every machine. Roboto Mono must be loaded. Fonts that no
stylesheet references must be removed from `index.html`.

## 4. Elevation

Two distinct vocabularies with two distinct jobs, and they are never mixed. **Shadow is
structural**: it separates a surface from the one behind it and says nothing about
importance. **Glow is semantic**: it marks a value the user came to read. A panel gets a
shadow because it is a panel; a number glows because it is a number. An element carrying both
a heavy shadow and a glow is over-specified and one of the two is wrong.

Shadows are tight and dark rather than large and soft. Nothing floats; surfaces sit just
above the ground.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 2px 4px rgba(0,0,0,0.3)`): Panels, headings, list items, value
  readouts. The default for anything sitting on the page.
- **Raised** (`box-shadow: 0 4px 8px rgba(0,0,0,0.3)`): Buttons and the navigation bar,
  anything the user can act on.
- **Container** (`box-shadow: 0 4px 10px rgba(0,0,0,0.3)`): The header. At `0.7` opacity, the
  life chart, which sits deepest because it is the thing being looked at.
- **Lifted** (`box-shadow: 0 6px 12px rgba(0,0,0,0.5)`): Hover only.
- **Pressed** (`box-shadow: 0 2px 4px rgba(0,0,0,0.5)`): Paired with a 2px downward
  translation on `:active`.

### Glow Vocabulary
- **Value glow** (`text-shadow: 0 0 5px var(--glow)`): Numbers and the headings that name
  them.
- **Accent glow** (`text-shadow: 0 0 10px var(--accent), 0 0 20px var(--accent)`): The life
  chart title and card headings.
- **Header glow** (`text-shadow: 0 0 5px #ff08f8, 0 0 15px #ff08f8`): The app name only, and
  the only place Magenta Flare appears.

### Named Rules

**The Two Vocabularies Rule.** Shadow separates; glow signifies. If you are reaching for a
shadow to make something feel important, you want a glow. If you are reaching for a glow to
lift a surface off the background, you want a shadow.

## 5. Components

Controls read as tactile retro hardware: gradient faces, hard 4px corners, and real physical
feedback. They are the one place the arcade heritage is allowed to show through in an
otherwise plain deck, because a control that responds to being pressed is genuinely easier to
use, not just nostalgic.

### Buttons
Emphasis comes from M3's variant ladder, not from decoration. **Gradients are prohibited on
controls** — a pink-to-violet ramp on every button was the single strongest dated signal the
app carried.

- **Filled (high emphasis, at most one per screen):** Solid `--md-primary`, label in
  `--md-on-primary`, fully rounded (`999px`), `12px 24px` padding. The label has to be
  near-black on the dark theme: white on the raw seed measures only 3.81:1, black 5.52:1.
- **Tonal (the default for ordinary form and nav actions):** `--md-primary-container` fill
  with `--md-on-primary-container`. This is what the legacy `--button-gradient` token now
  resolves to; the same fill paired with near-white measures 8.71:1 against 2.94:1 for a
  full-strength primary fill.
- **Hover / Focus:** Container steps one tone; focus adds a 2px `--md-secondary` ring at
  2px offset. Hover and focus share a treatment so keyboard users see what mouse users see.
- **Active:** `translateY(1px)`.
- **Disabled:** `--md-surface-container-highest` fill, `--md-outline` label,
  `cursor: not-allowed`.
- **Transitions:** `--motion-short` (150ms) on `--ease-standard`.

### Stat tiles
One tile per number, not a heading box stacked on a value box. `--md-surface-container`
fill, `12px` radius, `--md-elev-1`, `16px` padding, label in `--type-label` /
`--md-on-surface-variant` above a `1.75rem` value in `--md-on-surface` with
`font-variant-numeric: tabular-nums`. The grid is
`repeat(auto-fit, minmax(180px, 1fr))` so it reflows without breakpoints.

**Values are plain ink, not accent.** Six pink numbers spent the entire One Voice budget on
the stat grid. The accent is reserved for weeks-left on the sky surface.

### Cards / Containers
- **Corner Style:** 10px for full-width containers (header, nav, chart, list items), 4px for
  headings and readouts nested inside them.
- **Background:** Panel (`#333`) for content, the sky gradient for the two signature
  surfaces.
- **Shadow Strategy:** `Resting` for panels, `Container` for the header and chart. See
  Elevation.
- **Border:** None, except the two sky surfaces: a 5px Horizon Blue bottom border on the
  header, a 2px Horizon Blue frame on the chart.
- **Internal Padding:** 20px for containers, 10px for nested headings.

### Inputs / Fields
- **Style:** Surface Raised interior (`#1e1e2e`), 1px `#444` border, 4px radius, 10px padding,
  16px Roboto Mono. Forms use a two-column grid (`1fr 2fr`, labels then fields) with a 10px
  gap.
- **Focus:** Currently inherits the browser default. Focus should adopt the Horizon Blue line
  as a visible ring; it is the system's existing "this is the edge" colour.
- **Disabled:** Panel Muted fill, no border change.

### Navigation
- **Style:** A horizontal bar in a 10px-radius container carrying the theme's menu gradient,
  `Raised` shadow, same 80% / 1400px column as everything else.
- **Items at rest:** Panel ink at `opacity: 0.78`, 15px, no background, no gradient, no glow.
  Navigation is not a row of primary actions; only one item is ever the answer to "where am
  I", and the rest should not compete with it.
- **Hover / Focus:** Opacity to 1 with a neutral `rgba(127,127,127,0.14)` wash, and the
  underline scales to 60%, previewing the same mark the current page carries. Focus adds the
  Horizon Blue ring.
- **Current page:** Accent ink, bold, and a solid 2px underline. Three redundant signals, so
  the state never rests on colour alone. The bold is load-bearing: the accent measures
  4.31:1 on the dark gradient, which clears the 3:1 bar for bold text but not 4.5:1 at
  regular weight.
- **Sign-out:** Terminal, not a destination. It sits outside the link rhythm behind a 1px
  divider at `opacity: 0.7`, smaller than the links, and carries no underline vocabulary.
- **Mobile:** Below 768px the links become a 2×2 grid and sign-out drops to a full-width row.
  No hamburger: hiding four short labels behind an extra tap costs more than the vertical
  space it saves.

**The Accent Marks Position Rule.** In navigation, the accent means *you are here* and
nothing else. Applying it to every item spends the One Voice budget on decoration and leaves
nothing to say which page is open.

### The Life Grid (signature)
The single most important surface in the app, and **the first thing on the dashboard**. It
used to sit behind a click on a heading, which made the memento mori a feature of a fitness
log rather than the frame around one. A dot per week of an expected life, 52 columns wide,
laid out on the night sky.

It appears twice, same component and same data, differing only in the space it is given:
inline at `heightFraction: 0.36` beside the figures it explains, and full size at `0.8` in
the dialog. Inline it takes the `.bare` variant — the panel already supplies the sky, so its
own gradient and Horizon Blue frame would be sky on sky inside a blue box. The dialog keeps
the frame.

**Weeks left is the anchor**: the largest figure on the page, `clamp(2.5rem, 6vw, 4rem)`, in
Magenta Flare with a glow. Weeks lived sits beside it at the same size family but plain. The
contrast between the two is the entire point, and giving both the accent would flatten it.

- **Lived weeks:** filled Neon Pink at 0.8 opacity, 1.5px Neon Pink stroke.
- **Remaining weeks:** filled whitesmoke at 0.8 opacity, same stroke.
- **Hover:** the dot goes white at full opacity.
- **Responsive:** dot radius drops from 5px to 2px below 920px so 52 columns always fit. The
  column count never changes, because a year must always read as one row.

Nothing else on the page may use a dot grid, and nothing else may sit on the sky gradient.

## 6. Do's and Don'ts

### Do:
- **Do** keep the night sky on the header and life chart in both themes, and lighten only the
  panels around them.
- **Do** reserve Neon Pink (`#ff0077`) for values, and keep it under 10% of any screen.
- **Do** use `Roboto Mono` at every size, and make sure `index.html` actually loads it.
- **Do** separate surfaces with shadow and mark values with glow, never the reverse.
- **Do** give every button a `translateY(2px)` press with the `Pressed` shadow. The physical
  response is the component character.
- **Do** hold every top-level container to `width: 80%; max-width: 1400px; margin: 0 auto`.
- **Do** pair `:hover` and `:focus` in one rule so keyboard and mouse get the same feedback.
- **Do** give the 0.3s transitions and the chart animation a `prefers-reduced-motion` path.

### Don't:
- **Don't** build a **generic Material dashboard**: no elevation cards floating on grey, no
  `#1976d2` blue primary, no icon-heading-text card grids. Material was removed from this
  project deliberately; do not let its conventions return by habit.
- **Don't** drift toward **corporate fitness SaaS**: no rounded blue cards, no badge grids, no
  chirpy encouragement, no progress rings.
- **Don't** produce **doom-scroll morbidity**: the life grid is a fact, not a threat. No
  countdown timers, no red, no skulls, no black-and-grey severity.
- **Don't** add **gamified retention**: no streaks, no confetti, no achievement badges, no
  re-engagement nudges. An app about finite time must not manufacture urgency about itself.
- **Don't** put a gradient on a control. Fills are flat; emphasis comes from the variant
  ladder (filled → tonal → outlined → text).
- **Don't** apply glow anywhere but the two sky surfaces. `--glow` resolves to `transparent`
  on purpose: it was being spent on headings, labels and buttons alike, which is what made
  it read as texture rather than meaning.
- **Don't** invent a spacing value. Use `--sp-1` … `--sp-8`; the old ad-hoc 5/10/15/20 mix
  is what made density read as unconsidered.
- **Don't** add Angular Material. The M3 *architecture* is adopted here; the library is not,
  and pulling it in costs back the ~355 kB its removal saved and returns the exact look
  PRODUCT.md names as an anti-reference.
- **Don't** use Magenta Flare (`#ff08f8`) anywhere but the header text glow.
- **Don't** set a label's colour to a panel *background* token. `.input-block label` currently
  resolves to `#333` on the dark ground, which is very close to invisible. Labels take
  `--panel-text` or `--text-primary`.
- **Don't** introduce a second typeface, and don't leave font links in `index.html` that no
  stylesheet references.
- **Don't** put anything other than the life grid on the sky gradient.
- **Don't** use `border-left` or `border-right` greater than 1px as a coloured accent stripe.
  The only thick borders in this system are the header's bottom line and the chart's frame,
  both Horizon Blue, both structural.

**Audit test:** if you can screenshot a screen and not immediately tell which element is the
number the user came for, the glow is being spent on the wrong things.
