---
phase: 17
slug: bottom-contours
status: approved
reviewed_at: 2026-11-08
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-11-08
---

# Phase 17 — UI Design Contract

> The visual and interaction contract for **BOTTOM**, the eighth design screen, between ROCKER and RAILS, and for the
> small changes it makes to the nav, the ☰ tiles, Back/Next, FINS' tail drawing, the order form and the Overview Sheet.
> The page itself is **decided**: sketch 021 (`.planning/sketches/021-bottom-guide/`, its `template.html` inside
> `sketch-source.tar.gz`) is the page as it will be built, approved over five rounds. This contract translates it into
> the app's tokens, components, sizes, words and states; it redesigns nothing. It takes as given:
>
> 1. **`17-CONTEXT.md`** (D-01 to D-28) and **`17-SPEC.md`** (R1–R15, locked). Where CONTEXT leaves a choice to Claude,
>    this contract makes it and marks it `(Claude's discretion — founder may overrule)`.
> 2. **The sketch findings** (`.claude/skills/sketch-findings-shaper/`): the drawing grammar, the phone's tiles and
>    Back + Next, the wing's footprint.
> 3. **`16-UI-SPEC.md`**, the approved contract before this one. Its structure is followed; what it settled about the
>    nav, the tiles and Back/Next is referred to (§10–§11 and §15 there), and only the delta is written here.
>
> `sketch line N` means line N of `template.html` inside `021-bottom-guide/sketch-source.tar.gz`. Every claim about code was read from the file on 2026-11-08 (branch `claude/beautiful-fermi-ad3fb7` at `abde3ecb`) and
> is cited `path:line`. Widths were measured in the app's own Inter and its own built stylesheet in headless Chromium
> (a scratch page, nothing served, nothing started); contrast was computed from the ramps in `app/globals.css`.
> Product strings use the product's spelling (Center, 1/16"); prose here is British.
>
> **Plain English, for the founder:** the page you approved in sketch 021, built into the app. A new BOTTOM button sits
> between ROCKER and RAILS. The side panel is RAILS' dress: the board's size, then NOSE, CENTER and TAIL, each with a Cut
> picker and its sliders, the channels inside TAIL. The drawing is the bottom from above (the shade with a line every
> 1/16") over a cross-section you slide along the board. DATA is the two tables; GUIDE is the nineteen cards. Four things
> differ from the sketch, each measured: the top row's links sit closer below 1024 dots so eight fit; GUIDE shows three
> cards across from about 1200 dots wide and two below that; a phone held sideways scrolls the drawing instead of
> squeezing it; and the order form gets a BOTTOM CONTOURS page of its own — your ruling of 2026-11-08, *"a more substantial
> way of portraying how to shape contours … for now a new page would be acceptable"* — because the PLANING box ran out of room.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` (the shadcn gate is answered by the file; nothing asked, nothing run) |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **No new icon.** Back/Next keep `ArrowLeftIcon` / `ArrowRightIcon` (`components/design/step-nav.tsx:28`); the Select keeps its `ChevronDownIcon` (`components/ui/select.tsx:52`). BOTTOM has no corner toolbar (§3). |
| Font | Inter (`--font-display` / `--font-body`); tracking `--tracking-architectural` 0.15em |

**What the screen builds from, all of it existing:**

- **`DesignScreenShell`** (`components/design/design-screen-shell.tsx`), unchanged: controls aside (`basis-[340px] max-w-[400px]`,
  `:93-97`, the scroller `p-10 max-shell:p-4` at `:153-154`), drawing column `p-3` (`:201-203`), `phonePinned="66dvh"` (`:33`, `:58-62`, `:72`).
- **`TabbedPanel`** (`components/viewer/tabbed-panel.tsx:58`) with three tabs VIEWER · DATA · GUIDE, `compactOnPhone`
  (`:127`), `growOnShortScreen` (`:108`) and `BoardNameTab` as `trailing` (`:142`) — the props ROCKER passes
  (`components/rocker/rocker-editor.tsx:316-318`).
- **RAILS' sidebar dress** (`components/rails/rail-controls.tsx`): the panel title block (`:578-583`), `RULED_HEADING`
  (`:99-100`), the section column `flex flex-col gap-3.5` (`:514-517`), the tick-box label row (`:595`), the upright-phone
  rule that shows only the picked section's controls (`:551`).
- **`ImportedReadoutCard`** (`components/design/imported-readout-card.tsx:59`) built by a new builder beside
  `rockerImportedReadout` in `lib/geometry/imported-readout.ts:80`.
- **`SliderRow`** (`components/design/slider-row.tsx:21-98`) with `sliderLabel` / `sliderValueText`, every range from
  `measureSlider` (`lib/geometry/measure-display.ts:321`); the right-hand fill from `.slider-fill-end` (`app/globals.css:1078-1084`),
  ROCKER's Tail Thinning Starts pattern (`components/rocker/rocker-controls.tsx:397-414`).
- **`Select`** (`components/ui/select.tsx:4`) with the sidebar trigger classes FINS and VOLUME use
  (`components/fins/fin-controls.tsx:326`).
- **The upright phone's NOSE · CENTER · TAIL row**, RAILS' inline markup (`components/rails/rail-band-editor.tsx:511-538`).
- **The DATA table dress** of `components/rails/rail-data-table.tsx:106-150` (the sideways scroller, its 24-dot fade) and the
  sticky label cell of `components/rocker/rocker-datasheet.tsx:94-95`.
- **Pinned drawing type** the rail plot's way: a target screen size divided by the SVG's own fit
  (`useSvgFitScale`, `components/viewer/callout-primitives.tsx:153`; `components/rails/rail-section-plot.tsx:689`).
- **`useSvgClientSize`** (`components/viewer/callout-primitives.tsx:195`) for the one size question the section asks
  of its own box (§3.4).
- **`computeFinPlacement`** (`lib/geometry/fins.ts:1579`) and the FINS tile's fin lines (`lib/geometry/screen-tiles.ts:190`).

**Not used, on purpose:** a zoom row or any corner toolbar on BOTTOM (the sketch has none, and the top view's drag
belongs to the cutting line, not to a pan); CSS 3D or scroll-driven animation (older Safari); `--start-position` /
`--position` CSS variables (none exist; the fill swap is a class); RAILS' INSTRUCTIONS approach of `phonePinned="none"`
(`components/rails/rail-band-editor.tsx:288`), which scrolls the whole page — GUIDE must not (D-17).

---

## Spacing Scale

Declared values for this phase's new surfaces. All multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | `HOW TO SHAPE` label → its note (`mb-1`); each printed bottom line → the next (`mt-1`); the Height buttons' gap (`gap-1`); the `Section at` row's top padding on a phone (`max-shell:pt-1`) |
| sm | 8px | GUIDE card's inner gap (name → cartoon → text → rule, `gap-2`); the GUIDE grid's gap both ways (`gap-2`); Run ↔ Longest (`gap-2`); the dashed rule → `HOW TO SHAPE` (`pt-2`); the channels' rule above it (`mt-2`); the `Section at` word → its slider and the row's top padding (`gap-2 pt-2`); a Height button's side padding (`px-2`); a GUIDE card's padding on a phone (`p-2`, under both phone rules) |
| sm+ | 12px | A GUIDE card's padding on a computer (`p-3`); the channels' dashed rule → the `CHANNELS` heading (`pt-3`); DATA's last table → its notes (`mt-3`) — 12 is a step this project already uses everywhere (the folder card's `p-3`, `components/viewer/tabbed-panel.tsx:249`), recorded as an approved project step at the checker's flag |
| md | 16px | DATA: the first line → the first table's heading, and table → table (`mt-4`); GUIDE: the intro → the first group heading and group → group (`mt-4`) |
| lg / xl / 2xl / 3xl | 24 / 32 / 48 / 64px | Not used by this phase |

**Inherited, reused exactly, never "corrected" to the table:**

- `gap-5` (20px) between the panel's blocks (`components/rails/rail-controls.tsx:578`); `gap-3.5` (14px) between a section's
  rows (`:516`), which is the sketch's own `.group { gap: 14px }`.
- The ruled heading's `mt-1.5 pb-2` (`components/rails/rail-controls.tsx:99-100`); a slider label's `mb-2` and hint `mt-0.5`
  (`components/design/slider-row.tsx:141-145`, `:163-166`); the warning line's `mt-2` (`components/rocker/rocker-controls.tsx:416`).
- The readout card's paddings (`components/design/imported-readout-card.tsx:93`), the aside's `p-10` / `max-shell:p-4`
  (`components/design/design-screen-shell.tsx:153-154`), the drawing column's `p-3` and 2-dot phone rims (`:201-203`).
- The tab strip's 22-dot phone height, its 9-dot clearance and the folder's 2-dot rim (`components/viewer/tabbed-panel.tsx:159`,
  `:218`, `:250-252`, `:302`); the NOSE · CENTER · TAIL row's `pt-[11px]` and `gap-1.5` (`components/rails/rail-band-editor.tsx:512`).
- The DATA scroller's `min-w-[504px] pr-[24px]` and 24-dot fade (`components/rails/rail-data-table.tsx:121-122`); its header
  `mb-3 pb-2` and row `py-1.5` (`:123`, `:138`).
- The ☰ sheet's `gap-2` between tiles (`components/design/screen-tiles.tsx:263`).

**Exceptions (measured, not tokens):**

- The desktop nav cluster's gap becomes **6 dots below 1024** (`gap-1.5`), 12 to 1279, 20 from 1280 (§10). 6 is the only
  value that fits eight links at 820; it is a measured exception, not a spacing token.
- The phone's pinned card is **`calc(66dvh − 40px)`** tall (§6): 31 dots of rims and strip (16-UI-SPEC §2) plus the 9-dot
  clearance a tappable strip carries.
- On a short screen the two drawings keep a **360-dot floor** (§6).
- The section's own drawing room (20 dots of air a side, 44 / 92 dots under the straightedge) is drawing geometry in
  screen pixels, not layout spacing (§3.3).

**Touch.** Every control takes the app's pointer rule: `SliderRow`'s 44-dot thumb ring, the tick-box rows' `coarse:min-h-11`,
the tabs' 44-dot touch box (`components/viewer/tabbed-panel.tsx:198`). Two need it added, §1 and §3.5: the **Select
triggers** (the shared trigger is 32 tall with no coarse rule, `components/ui/select.tsx:44`) and the **Height** buttons.

---

## Typography

**Declared for this phase's new surfaces: four sizes, two weights.**

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| GUIDE card name | 14px (`text-sm`) | 600 | 1.25 (`leading-tight`) | `Teardrop Nose Concave` etc., `text-surf-ink` |
| GUIDE card text | 13px (`text-[13px]`) | 400; the first sentence 600 | 1.45 (`leading-[1.45]`) | The two sentences: what it is (600, ink) then what it does (400, muted), one paragraph |
| Meta | 12px (`text-xs`) | 400 | 1.5 (`leading-normal`) | The GUIDE intro, every `How to shape` note, DATA's first line and notes, the WINGS note, the flat note, the floor warning (warning ink) |
| Drawing value | 11px, pinned on screen | 600, `tabular-nums` | — (SVG) | Every figure drawn on the top view and the section: `36"`, `3/16" at the stringer`, `3/8" rail lift`, the ruler's values |

**Inherited roles this screen uses (documented, not declared, unchanged):**

| Role | Size / weight | Source |
|------|---------------|--------|
| Panel title `BOTTOM CONTOURS` | 18px / 800, uppercase, tracked, `leading-tight` | `components/rails/rail-controls.tsx:580` |
| Panel subtitle | 14px / 400, muted, `mt-0.5` | `components/rails/rail-controls.tsx:581` |
| Ruled heading `INPUTS`, `WINGS`, `NOSE`, `CENTER`, `TAIL` | 12px / 800, uppercase, tracked | `components/rails/rail-controls.tsx:99-100` |
| The cut's name echoed on a heading | 12px / 400, muted, `normal-case tracking-normal` | the View label's own case reset, `components/rails/rail-controls.tsx:530-534` |
| `CHANNELS` sub-heading inside TAIL | 10px / 800, uppercase, tracked, muted | RAILS' ADVANCED fold heading size, `components/rails/rail-controls.tsx:117` |
| Slider label line, tick-box label, Select label | 14px / 400, muted | `components/design/slider-row.tsx:141-145`; `components/rails/rail-controls.tsx:595`; `components/fins/fin-controls.tsx:427` |
| Hint line under a slider | 12px / 400, muted | `components/design/slider-row.tsx:163-166` |
| Select value and options | 14px / 400 | `components/ui/select.tsx:44`, `:120` |
| Readout caption, figures, names, foot | 10/800 accent-ink · 18/600 · 10/700 muted · 12/400 muted | `components/design/imported-readout-card.tsx:96-114` |
| Tabs `VIEWER` `DATA` `GUIDE`, phone `NOSE` `CENTER` `TAIL` | 12px / 700, uppercase, tracked | `components/viewer/tabbed-panel.tsx:153`; `components/rails/rail-band-editor.tsx:529` |
| Drawing names (`WIDE POINT`, `START`, `HEIGHT ×4`, `PLANED BOTTOM`, `OFF THE STRINGER`, the captions `BOTTOM VIEW` / `SECTION`) | 10px / 700, uppercase, 0.12em, muted | ROCKER's station names, `STATION_NAME_SIZE = 10` (`components/rocker/rocker-view-frame.ts:298`), drawn 700 (`components/rocker/rocker-viewer.tsx:277`) |
| `ON THIS BOARD`, `HOW TO SHAPE` | 10px / 800, uppercase, tracked, accent-ink | the readout caption, `components/design/imported-readout-card.tsx:96-97` |
| DATA group heading, GUIDE group heading | 10px / 800, uppercase, tracked, ink | `components/rails/rail-data-table.tsx:134` |
| DATA column header | 10px / 800, uppercase, tracked, ink; the unit in a `normal-case tracking-normal font-medium` span | `components/rocker/rocker-datasheet.tsx:248` |
| DATA cells | 14px / 400, `tabular-nums` | `components/rocker/rocker-datasheet.tsx:95` |
| Height buttons `×1` … `×8` | 10px / 700 | the Fin Setup labels' size, `components/fins/fin-controls.tsx:446` |
| Nav link `BOTTOM`; tile name / line | 12/700 tracked; 11/800 tracked / 11/400 muted | `components/site-nav.tsx:104`; `components/design/screen-tiles.tsx:292-293` |
| Back/Next words | 14px / 500 | `components/ui/button.tsx:7` |

**Why 10/11 in the drawings, not the sketch's 9/11-500:** 9px is under the app's smallest drawn size, and the app already
draws station names at 10 and pinned figures at 11 (`CALLOUT_PX.name`, `components/viewer/callout-primitives.tsx:71`).
`(Claude's discretion — founder may overrule)`. **Both are pinned in screen pixels** (size ÷ the SVG's fit, the rail
plot's `CALLOUT_PX.name / shownFit`, `components/rails/rail-section-plot.tsx:689`), which is exactly the sketch's own
`px = 1000 / width` unit: a phone and a computer draw the same 1-dot lines and the same 10/11-dot words.

**Units are never upper-cased.** The sketch's CSS capitalised `cm` inside its captions (`SECTION · 146.1 CM FROM THE TAIL`,
`WIDE POINT · 146.1 CM`, `pictures/phone-longboard-metric.png`). Every formatted value in a drawn caption or label sits in
its own `normal-case tracking-normal` span (`<tspan>` in SVG) — the sketch already did this for the lower rail's values
(sketch line 687) — so Metric reads `SECTION · 146.1 cm FROM THE TAIL`. Imperial looks the same either way.

**Measured widths (Inter, the app's built CSS, 2026-11-08):** nav link `BOTTOM` 63.7 dots (12/700 tracked); tile name
`BOTTOM` 58.8 (11/800 tracked; `TEMPLATE` stays the widest at 72.8); title `BOTTOM CONTOURS` 227.9 at 18/800 (fits the
260-dot panel); ruled headings `CHANNELS` 82.0, `CENTER` 59.6 at 12/800; tabs `VIEWER` 58.0, `DATA` 39.2, `GUIDE` 46.1;
cut names at 14/400: `Continuous Belly / Rolled Mid` 193.6 (the widest), `Slight Single Concave Entry` 182.9;
`Natural outline, before the wing` 207.9; Run options `Parallel` 48.3, `With the rail` 78.9, `Toe-in · 3.2°` 81.8,
`Toe-in (no toe)` 98.2; Longest `Inner pair` 62.9, `Outer pair` 66.0, `All the same` 81.0; drawing values at 11/600
`3/16" at the stringer` 109.2, `5/16" in the channel` 109.2, `2 1/16" stringer left` 106.1; drawing names at 10/700
`Off the stringer` 113.9, `Planed bottom` 102.6.

---

## Color

**No new hue, no new colour-contract token.** Four **drawing tokens** are added beside the callout tokens in the `:root`
drawing block (`app/globals.css:934-942`), each assigned once off a contract token so it follows every theme, as
`--outline-ghost` does (`app/globals.css:932`):

| New drawing token | Value | Meaning |
|-------------------|-------|---------|
| `--outline-bottom-shade` | `var(--surf-ink-muted)` | The foam-off wash's colour; its strength is opacity, stepped per 1/32" of depth (below) |
| `--outline-pencil-line` | `color-mix(in srgb, var(--surf-ink-muted) 78%, transparent)` | The lines a shaper would rule: a concave's edge, a double's flat, a tri-plane's panel, every channel wall (the sketch's `--pencil`, sketch line 21) |
| `--outline-cut-dash` | `9 3 2 3` | The section's cutting line, the drawing convention's dash-dot (sketch line 570) |
| `--outline-trough-dash` | `1 3` | A double's trough line and the live cut's Deepest station line (sketch line 569) |

Everything else the drawings use already exists: the contour lines are `--outline-station-line` (36% muted,
`app/globals.css:905`), the straightedge takes `--outline-station-dash` (`5 4`, `:940`) in `--outline-ink`, the stringer
`--outline-stringer-dash` (`:937`), the wide point `--outline-widepoint-line` with `--outline-widepoint-dash`
(`:938-939`), the ghost rail `--outline-ghost` (55%, `:932` — the sketch drew 60%; the token wins), the board
`--outline-board-fill` / `--outline-ink` (`:901`, `:919`).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-sidebar` (the panel) and `--surf-canvas` (the drawing column) | #ffffff / #ffffff / #12141a / #050805 and #dfdcd3 / #dfdcd3 / #1a1d25 / #142414 |
| Secondary (30%) | `--surf-tab-active` / `--surf-panel` (the folder and cards), `--outline-board-fill` (the board), `--surf-ink-muted` (shade, lines, hints, DATA cells), `--surf-line` / `--surf-line-faint` (rules, card edges) | Everything that is not the accent |
| Accent (10%) | `--surf-accent` fill / `--surf-accent-ink` | Only the list below |
| Warning (informational) | `--surf-warning-ink` | The floor sentence under a Depth slider and DATA's floor cells and note (§7). **This phase has no destructive action.** |

**Accent reserved for** (and nothing else on BOTTOM):

1. **The section's grab dot** on the top view — `--surf-accent` fill with a 1-dot `--outline-ink` ring (the slider thumb's
   own pairing, `app/globals.css:1066-1069`).
2. **Slider fills and thumbs** (`.slider-accent`, `app/globals.css:1055-1066`; `.slider-fill-end`, `:1078-1084`), the
   Section at slider included.
3. **Next → Rails** (Step nav's fill, `components/design/step-nav.tsx:62-65`), the only filled button on the screen.
4. **Focus rings** (`.focus-ring-accent`, the Select's `ring-ring` = `--surf-accent-ink`, `app/globals.css` `--ring`).
5. **The nav link's underline and the BOTTOM tile's tick and ring** when on BOTTOM (`components/site-nav.tsx:106`,
   `components/design/screen-tiles.tsx:284-286`), existing rules.
6. **Accent-ink, as words and marks:** the readout caption, the `ON THIS BOARD` and `HOW TO SHAPE` tags, and the **fins**
   on the top view, drawn in FINS' own fin colour (`components/fins/fin-viewer.tsx:694`).

**The drawings' colours, exactly** (hex only for the contrast check):

| Part | Token | Treatment |
|------|-------|-----------|
| Board | `--outline-board-fill`, edge `--outline-ink` 1.1 | Top view and section |
| Shade | `--outline-bottom-shade`, `fill-opacity` 0.04 per 1/32" level, levels stacked (the sketch's own bands, sketch line 605-620) | Clipped to the board; **0.05** per level in a GUIDE cartoon (sketch line 920) |
| Contour line, every 1/16" | `--outline-station-line`, 1 | Over the shade |
| Pencil lines | `--outline-pencil-line`, 1; **the live cut's in `--outline-ink` at 1.1** (sketch line 644) | Edge, flat, panel, walls |
| Trough line, live Deepest line | `--outline-station-line`, 1, `--outline-trough-dash` | |
| Stringer, front fins' station, wide point | `--outline-station-line` stringer dash · station dash · `--outline-widepoint-line` `2 3` | As every plan view |
| Fins | `--color-surf-accent-ink`, 2.5, round caps, solid | §3.2 |
| Cutting line | `--outline-ink`, 1.1, `--outline-cut-dash` | |
| Grab dot | `--surf-accent`, ring `--outline-ink` 1, r = 7 | |
| Straightedge | `--outline-ink`, 1, `--outline-station-dash` | The planed bottom |
| Dimension lines, ticks, ruler | `--outline-dim-ink` (`app/globals.css:941`), 1 | Gauge readings |
| Extension lines | `--outline-station-line`, 1 | |
| Break line | `--outline-ink` 1 over a 7-dot `--surf-panel` underlay (sketch line 734) | |
| Ghost rail | `--outline-ghost`, 1 | Only with its box ticked |
| Drawing names / values | `--outline-callout-label` (`app/globals.css:942`) / `--outline-ink`; the lower rail's values muted | |

**Legibility** (computed 2026-11-08 from the ramps, `app/globals.css:256-392`; Daylight / Chalk / Slate / Phosphor):

| Pairing | Ratio | Bar |
|---------|-------|-----|
| Shade against the bare board fill, per 1/16" of depth: 1/16" · 1/8" · 3/16" · 1/4" · 5/16" · 3/8" · 7/16" · 1/2" (opacity 7.8 · 15.1 · 21.7 · 27.9 · 33.5 · 38.7 · 43.5 · 48.0%) | Daylight 1.11 · 1.22 · 1.34 · 1.46 · 1.59 · 1.72 · 1.86 · 2.00 / Chalk 1.10 … 1.97 / Slate 1.15 · 1.32 · 1.51 · 1.71 · 1.92 · 2.13 · 2.35 · 2.56 / Phosphor 1.11 … 2.20 | a tone, not a mark — see below |
| Contour line on the bare fill / on the 1/2" shade | 1.65 / 1.38 · 1.63 / 1.37 · 2.02 / 1.43 · 1.78 / 1.38 | faint by rule (004) |
| Pencil line on the fill / on the 1/2" shade | 3.41 / 2.11 · 3.31 / 2.06 · 4.45 / 2.07 · 3.65 / 1.96 | 3 graphic ✓ on the fill |
| Ink (cutting line, live pencil, dimensions, values) on the fill / on the 1/2" shade | 12.30 / 6.16 · 11.76 / 5.98 · 13.81 / 5.39 · 7.84 / 3.57 | 4.5 text ✓ (3 ✓ Phosphor at 1/2") |
| Fins (accent-ink) on the fill | 5.76 · 8.60 · 4.25 · 5.65 | 3 graphic ✓ |
| Grab dot against the panel / its ink ring | 2.01 / 14.46 · 3.58 / 14.46 · 2.16 / 16.71 · 6.32 / 9.71 | the ring carries it ✓ (the slider thumb's rule) |
| Ghost rail on the fill | 2.25 · 2.20 · 2.94 · 2.49 | a reference line, faint by intent (as TEMPLATE's ghost) |
| Muted words on the panel / on the fill | 6.28 / 5.35 · 6.28 / 5.11 · 7.69 / 6.36 · 6.32 / 5.11 | 4.5 ✓ |
| Warning ink on the sidebar | 6.31 · 6.31 · 8.63 · 16.75 | 4.5 ✓ |
| A GUIDE cartoon's 1/4" shade (5% × 8) on the fill | 1.59 · 1.58 · 1.92 · 1.71 | a tone |

- **The shade is a tone that shows the shape; the numbers are elsewhere.** No band is meant to clear 3:1 against its
  neighbour: the 1/16" lines over it give the steps, the section gives the gauge reading at any station, DATA gives every
  depth every 6". Nothing a shaper cuts to is carried by the shade alone. The deepest band (1/2") reaches 2.0–2.6:1 against
  the bare fill in every theme, so a deep cut always reads at a glance.
- **Sketch 004's rule bends on this page alone** (D-12): the shade is the only wash ever drawn inside an outline.
- **`--surf-line` and `--surf-line-faint` are the same colour in Daylight, Chalk and Phosphor** (`app/globals.css:267-268`,
  `:311-312`, `:380-381`), so a GUIDE card's "on" edge (`--surf-line`) differs from an "off" edge (`--surf-line-faint`) in
  Slate only. The `ON THIS BOARD` tag is what carries it; the edge is a bonus.

---

## Copywriting Contract

**Numbers (CLAUDE.md Rule 2, D-25).** Every number on BOTTOM is a **mark** (whole millimetres in Metric, 1/16" in Imperial)
or a **dim** (centimetres to one decimal; a station reads the digits of `stationLabel`), never both for one quantity. §11
is the full table with each formatter.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **None as a button.** The screen's one action is choosing a cut: the `Cut` picker. The filled button is Step nav's **`Rails →`**. |
| Empty state heading | **None.** Every board opens with all three sections flat (D-04); "flat" is a cut, so there is never an empty page. |
| Empty state body | Each flat section reads **`Nothing is cut in this section.`**; a flat tail with channels **`Nothing is cut in this section but the channels.`** (sketch line 1050). |
| Error state | **`This cut meets the 1/4" floor 3" from the nose: the stringer is left at 1/4" there, shallower than the depth set. Lower the Depth, or move the cut away from the tip.`** (§7; Metric `6 mm`, `7.6 cm`). |
| Destructive confirmation | **None.** Picking another name replaces that section's numbers with the new name's starting numbers in one undoable step (Undo/Redo, `lib/design-history.ts:89`); `None` channels hides the channel settings and keeps them. Nothing asks "are you sure". |

### Where the screen is named (D-01; the delta to 16-UI-SPEC § "Where the screen is named")

| Place | Copy |
|-------|------|
| Nav link (`NAV_LINKS`) | `BOTTOM`, href `/design/bottom`, third, between `ROCKER` and `RAILS` |
| Phone tile name / line | `BOTTOM` / `All flat` · `1 cut` · `{n} cuts`, then ` · {k} channels` when channels are cut (`2 cuts · 6 channels`; channels alone `6 channels`) `(Claude's discretion — founder may overrule)` |
| Tile accessible name | `BOTTOM — 2 cuts · 6 channels` (the `{label} — {line}` rule, `components/design/screen-tiles.tsx:270-273`) |
| Page `<title>` | `Bottom Contours — Shaper Assistant` (the panel title, as RAILS' page names itself after its panel, `app/design/rails/page.tsx:6`) |
| Page description | `Map, measure and cut a surfboard's bottom contours, with calculated depths and layout marks.` `(Claude's discretion — founder may overrule)` |
| Back on BOTTOM | `← Rocker`, accessible name `Previous screen: Rocker` |
| Next on BOTTOM | `Rails →`, accessible name `Next screen: Rails` |
| Next on ROCKER (changed) | `Bottom →`, accessible name `Next screen: Bottom` (`screenWord("BOTTOM")` is `Bottom`, `lib/screen-steps.ts:40-44`; no code change) |
| Back on RAILS (changed) | `← Bottom` |

### The side panel, top to bottom (every string from `template.html`, the product)

| Element | Copy | Notes |
|---------|------|-------|
| Panel title | `Bottom Contours` (drawn `BOTTOM CONTOURS`) | the sketch's title (sketch line 277) `(Claude's discretion — founder may overrule)` |
| Subtitle | `Map, measure and cut the bottom` | sketch line 278 |
| Ruled heading | `Inputs` | |
| Readout caption | `From TEMPLATE & ROCKER` | the sketch's words (sketch line 835); the app's VOLUME card says `From TEMPLATE and ROCKER & FOIL` (`lib/geometry/imported-readout.ts:73`) — the sketch is kept `(Claude's discretion — founder may overrule)` |
| Readout figures | `Length` `6'2"` · `Width` `18 3/4"` · `Thickness` `2 1/4"` (Metric `188.0 cm` · `47.6 cm` · `5.7 cm`) | The board's headline dims, read exactly as VOLUME's imported card reads them (CLAUDE.md Rule 2; D-25 as sharpened 2026-11-08); DATA's `planed` and `stringer finishes` figures are marks, §11 |
| Readout foot | `Thickness is the planed number. The contour comes out of it.` | the card's foot line (`components/design/imported-readout-card.tsx:114`) |
| Tick box | `Show the finished rail from RAILS` | off (D-13); view-only |
| Ruled heading (winged board only) | `Wings`, echo `1/4" wing at 11 1/2"`; two wings `wings at 11 1/2" and 7 1/2"` | the echo's two-wing form `(Claude's discretion — founder may overrule)` |
| Select label | `Measure Off Rail from` | |
| Options | `Narrowest outline` · `Natural outline, before the wing` | opens on Narrowest (D-19) |
| Note under it, Narrowest | `The real rail behind the wing, and that narrower line carried forward past it — so no cut ever crosses the rail.` | sketch line 411 |
| Note under it, Natural | `The curve you drew before the wing. Behind the wing it sits outside the real rail, so a cut can run out through the step.` | sketch line 412 |
| Ruled headings | `Nose` · `Center` · `Tail`, each echoing its cut's name at the right (`Deep Single Concave`) | as RAILS echoes nothing today; the echo is the sketch's |
| Select label | `Cut` | options below |
| Nose options | `Flat Entry` · `Rolled Belly Entry` · `Teardrop Nose Concave` · `Blended Nose Concave` · `Slight Single Concave Entry` · `Reverse Vee Nose` | D-04 order |
| Center options | `Flat Center` · `Deep Single Concave` · `Shallow Single Concave` · `Early Double Concave` · `Continuous Belly / Rolled Mid` · `Tri-Plane Hull Center` | |
| Tail options | `Flat Exit` · `Double Concave Exit` · `Panel Vee` · `Spiral Vee` · `Rolled Vee` · `Extending Single Concave` | |
| Flat note | `Nothing is cut in this section.` / TAIL with channels `Nothing is cut in this section but the channels.` | |
| Tick box (every Nose single concave) | `Closes to a point toward the center` | shown on the three nose singles, ticked by the Teardrop's starting numbers only (sketch lines 371 and 1052) |

**Slider rows** (`label — value` on the label line, `SliderRow`'s own pattern; hints under the track):

| Row | Label line | Left hint · right hint | Shown for |
|-----|-----------|------------------------|-----------|
| Off Rail | `Off Rail — 2"` | `At the rail` · `6"` (the slider's own max) | single, double (incl. Spiral Vee) |
| Off Stringer | `Off Stringer — 1"` | `At the stringer` · `9"` | double; Tri-Plane Hull Center; channels |
| Trough At | `Trough At — 4" from the stringer` | none | double |
| Start | `Start — 58" from the tail` (Nose: `from the nose`) | `Nose` · `Tail` | every cut but a flat |
| Deepest At | `Deepest At — 23 7/16" from the tail` | `Nose` · `Tail` | |
| End | `End — 4" from the tail` | `Nose` · `Tail` | |
| Depth | `Depth — 1/4"` | `Nothing cut` · `1/2"` (Metric `12 mm`, §11) | |
| Vee Lift | `Vee Lift — 3/16"` | none | Spiral Vee |
| Smoothness | `Smoothness — 50%` | `Straight to the edge` · `Rounded out` | |

Order inside a card (D-04, sketch line 978-989): Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth,
Vee Lift, Smoothness, then the tick box. A vee or belly's Depth is its lift at the rail; its label still reads `Depth`.

### The channels block, inside TAIL (D-10, D-11)

| Element | Copy |
|---------|------|
| Sub-heading | `Channels` (drawn `CHANNELS`), echo `None` or `6, cut after the Flat Exit` (sketch line 1053) |
| Select label / options | `Channels` / `None` · `4 channels` · `6 channels` · `8 channels` |
| Select label / options | `Run` / `Parallel` · `With the rail` · `Toe-in · 3.2°` (the front fins' toe, one decimal) — on a single fin `Toe-in (no toe)` |
| Select label / options | `Longest` / `Inner pair` · `Outer pair` · `All the same` |
| Channel Width | `Channel Width — 1 3/4" · ramp 10° · last wall 1 9/16" off the rail`; squeezed `Channel Width — 2 1/2" (2 3/16" to fit) · ramp 7° · last wall 1/2" off the rail` (sketch line 1005-1006); no hints |
| Off Stringer | `Off Stringer — 0"` · hints `At the stringer` · `9"` |
| Start | `Start — 22 7/8" from the tail · the outer pair` (no suffix for All the same) |
| Stagger (hidden for All the same) | `Stagger — 2" per channel · the inner pair starts 18 7/8" from the tail` (names the shortest pair) · hints `All start together` · `8"` |
| Deepest At, End, Depth | as the section rows |
| Smoothness | `Smoothness — 0% · a straight ramp`; at 100 `Smoothness — 100% · scooped` · hints `Straight ramp into the wall` · `Scooped` |

Order (sketch line 980): Channels, then Run and Longest on one row, then Channel Width, Off Stringer, Start, Stagger,
Deepest At, End, Depth, Smoothness. The squeezed label stays muted: it is information, the RAILS rule that "trimmed to
fit" "never takes the warning colour" (`components/rails/rail-controls.tsx:223`).

### On the drawings

| Where | Copy |
|-------|------|
| Top view caption (computer) | `BOTTOM VIEW` left; right `Nose left · 6'2"`, on a winged board `Nose left · 5'8" · wing 1/4" at 11 1/2"` |
| Upper rail names | `WIDE POINT · 36"` and `FRONT FINS · 10 7/8"` (a single fin: `FIN · 14"`) |
| Lower rail, the live cut (from its nearest tip) | `START 58"` · `DEEPEST 23 7/16"` · `END 4"` (the value muted, unshouted) |
| Section caption | `SECTION · 36" FROM THE TAIL · 18 3/4" WIDE` (the width part on a computer only); right `Height` (computer only) and `×1` `×2` `×4` `×8` |
| In the section, top-left | `HEIGHT ×4`; `TRUE HEIGHT` at ×1 shown; `HEIGHT ×2.3` when the cut had to be fitted (sketch line 753) |
| Under the straightedge's left end (box ≥ 625 dots) | `PLANED BOTTOM` |
| Gauge readings | `3/16" at the stringer` · `3/8" rail lift` · `2 1/16" stringer left` · `5/16" in the channel` · `1/8" in the trough`; in a box under 625 dots the rail lift and stringer left read the value alone (`3/8"`) |
| The ruler (box ≥ 548 dots, D-30) | values bare (`1 3/4"` · `3 1/2"`; Metric `44` · `89`); from a 625-dot box the caption `OFF THE STRINGER` (Metric `OFF THE STRINGER · mm`) joins |
| Under the drawings | `Section at` |

A gauge label draws only when it reads at least 1/16" (1 mm); `0"` is never drawn (D-13).

### DATA (D-15, D-16)

| Element | Copy |
|---------|------|
| First line | `Foam off 0.72 L · 28.89 L now, 29.61 L before contours · the stringer finishes 2 1/16" at the center, planed 2 1/4" · contours only take foam away.` Metric `… finishes 53 mm at the center, planed 57 mm · …` (sketch line 808) |
| Group heading | `Depths under a straightedge` |
| Columns | `From the tail` · `Width` · `Deepest cut` · `Rail lift` · `Stringer left`; Metric appends ` (cm)` · ` (cm)` · ` (mm)` · ` (mm)` · ` (mm)` (`columnUnitSuffix`, `lib/geometry/measure-display.ts:284`) |
| Row labels | `Tail`, `6"`, `12"` … then `Nose tip`; Metric `Tail`, `15.2`, `30.5` … `Nose tip` |
| An empty cell | `—` |
| Group heading | `Layout marks · off the stringer`; Metric `Layout marks · off the stringer (mm)` |
| Columns | `Nose edge` · `Center flat` · `Center trough` · `Center edge` · `Tail flat` … then `Flat edge`, `Wall 1` … `Wall 4` (sketch line 534-551) |
| Notes | `Deepest cut is the largest gap under a straightedge laid rail to rail at that station. Rail lift is that gap at the rail. Stringer left is the planed thickness less the cut at the stringer.` · with marks: `Layout marks are measured out from the stringer at each station, the way a concave's edge or a channel's walls are ruled onto the blank. The channels abut: the stringer is the first peak, each channel's floor deepens out to its wall, and the top of that wall is the next channel's peak; a wall is ruled only from where its own channel starts — the outer pair first, each channel out from it 2" shorter.` · `Wide point 36" and front fins 10 7/8" from the tail are the two rows in full ink.` (sketch line 829-831) |
| Floor note (only when it applies) | `The cut meets the 1/4" floor at 0" and 6" from the tail: the stringer is left at 1/4" there.` (warning ink) |

The Metric layout-marks heading takes the app's ` (mm)` form, not the sketch's ` · mm`, so it matches every other Metric
header. **The first line always adds up as printed:** `Foam off` is the printed `before` less the printed `now`, and
`now` is VOLUME's own figure (`quotedVolumeLitres.toFixed(2)`, `components/volume/volume-calculation-card.tsx:137`) —
one quantity, one format.

### GUIDE (D-17, D-18)

| Element | Copy |
|---------|------|
| Intro | `What each cut is, what it does, and how it is shaped. Every cut is drawn on your {board name} at its starting numbers — from above with its shade, and across where it is deepest, Height ×8 — the way VIEWER draws it.` (sketch line 956); `{board name}` is the tab band's name; a board never named reads `your board` (never `your Untitled`) `(Claude's discretion — founder may overrule)` |
| Group headings | `Nose` · `Center` · `Tail` · `Channels · cut last, inside TAIL` |
| Card | its name; the tag `On this board` when that cut is on the board (channels: when any are cut); the two sentences; a dashed rule; `How to shape` and the note |
| The 57 lines | **verbatim from `17-GUIDE-WORDS.md`** (the plans build with the drafts; the founder's corrections arrive as one task, D-18) |

### Warnings and edge copy (D-09, D-10)

| When | Copy |
|------|------|
| A section's cut meets the floor | `This cut meets the 1/4" floor {at} from the {nose|tail}: the stringer is left at 1/4" there, shallower than the depth set. Lower the Depth, or move the cut away from the tip.` Metric `This cut meets the 6 mm floor 7.6 cm from the nose: the stringer is left at 6 mm there, shallower than the depth set. Lower the Depth, or move the cut away from the tip.` |
| The channels meet the floor | `The channels meet the 1/4" floor {at} from the tail: the stringer is left at 1/4" there, shallower than the depth set. Lower the Depth, or move the cut away from the tip.` |
| A squeezed set | the Width label's `(2 3/16" to fit)` (above); muted |
| A single fin's toe | the option reads `Toe-in (no toe)`; picked, the walls run as Parallel |
| A wingless board | no WINGS heading, select or note at all |

`{at}` is the station nearest that cut's own tip where the floor holds, through the station formatter (§11). The sentence
is the Phase 14 too-close line's voice and place (`lib/geometry/blank-reasons.ts:405-428`,
`components/rocker/rocker-controls.tsx:416`) `(Claude's discretion on the words — founder may overrule)`.

### Screen readers (not drawn)

| Element | Copy |
|---------|------|
| Section sliders' names | `{Nose|Center|Tail} {control}` in the product's case: `Center Off Rail`, `Center Deepest At`, `Tail Depth`, `Nose Smoothness` — the sketch's own `aria-label` (sketch line 1024) |
| Channel sliders' names | `Channel Width`, `Channels Off Stringer`, `Channels Start`, `Channels Stagger`, `Channels Deepest At`, `Channels End`, `Channels Depth`, `Channels Smoothness` |
| Every slider's spoken value | the label's own value words: `23 7/16" from the tail`, `1/4"`, `50%`, `2" per channel` |
| Selects' names | `Nose Cut`, `Center Cut`, `Tail Cut`, `Channels`, `Channel Run`, `Longest Channels`, `Measure Off Rail from` |
| Tick boxes | their visible words |
| Height group / buttons | group `Height`; buttons `Height ×1` … `Height ×8`, `aria-pressed` |
| Section at | slider name `Section at`, value `36" from the tail` |
| Top view | `role="img"`, `The bottom of {board name} from below, with the contours shaded` (the sketch's `aria-label`, sketch line 304, named) |
| Section | `role="img"`, `Cross-section 36" from the tail, 18 3/4" wide` |
| GUIDE cartoons | `aria-hidden` (the card's words say it) |

`(Claude's discretion — founder may overrule)` for every name above; CONTEXT gives them to Claude.

### Paper (D-26, D-29) — the order form's BOTTOM CONTOURS page and the Overview Sheet

One pure function words the bottom for both (§15). **A board with every section flat and no channels prints nothing new
on either sheet** — so no preset's sheets move. The order form's page (D-29, §8) carries the drawing, a section per cut,
DATA's two tables and the *How to shape* notes; the one-line-per-cut wording below is the Overview Sheet's, and the page's
section heads read the same cut names. Imperial / Metric, in this order: Nose, Center, Tail, Channels; a flat
section is left out.

| Cut | Line (Imperial) | Metric |
|-----|-----------------|--------|
| Single concave | `Center: Deep Single Concave 1/4", 58" to 4" from the tail, deepest 23 7/16"; 2" off the rail.` | `Center: Deep Single Concave 6 mm, 147.3 to 10.2 cm from the tail, deepest 59.5 cm; 51 mm off the rail.` |
| Teardrop | `Nose: Teardrop Nose Concave 1/4", 3" to 38" from the nose, deepest 20"; 2 1/4" off the rail, closes to a point.` | `… 7.6 to 96.5 cm from the nose, deepest 50.8 cm; 57 mm off the rail, closes to a point.` |
| Double | `Center: Early Double Concave 1/8", 36" to 12 7/8" from the tail, deepest 16 7/8"; 2" off the rail, flat 1" and trough 4" off the stringer.` | marks in mm, stations in cm |
| Spiral Vee | `Tail: Spiral Vee 1/8" with 3/16" vee lift, 22 7/8" to 0" from the tail, deepest 10 7/8"; 1" off the rail, flat 3/4" and trough 3" off the stringer.` | |
| Vee or belly | `Tail: Panel Vee 3/16" rail lift, 24 11/16" to 0" from the tail, deepest 10 7/8".` | |
| Tri-Plane | `Center: Tri-Plane Hull Center 1/8" rail lift, 60" to 10 7/8" from the tail, deepest 37"; panel 5 3/8" off the stringer.` | |
| Channels | `Channels: 6 at 1 3/4", 5/16" deep, 22 7/8" to 0" from the tail, deepest 10 7/8"; Parallel, outer pair longest, 2" stagger.` (All the same: `…; Parallel, all the same length.`; squeezed: the fitted width) | `Channels: 6 at 44 mm, 8 mm deep, 58.1 to 0.0 cm from the tail, …; Parallel, outer pair longest, 5.1 cm stagger.` |
| Natural wing rule picked | one more line: `Off Rail measured from the natural outline, before the wing.` | same |

A range pair carries its unit once (`58.1 to 0.0 cm`), the Phase 14 printed-pair rule
(`.planning/phases/14-realistic-surfboard-flow/14-UI-SPEC.md:791`); every other figure carries its own, because one line
mixes marks and dims. Words for the founder's pen at plan approval `(Claude's discretion — founder may overrule)`.

---

## Already done — read this before planning

Confirmed 2026-11-08 by reading the files and measuring. Where this corrects the brief, CONTEXT or the sketch, this
section is the one to trust.

- **Eight links overflow the desktop row at 820 by 63 dots** with today's `gap-3 lg:gap-4 xl:gap-5`
  (`components/site-nav.tsx:96`), by 39 at 844 and 20 at 863, and wrap `Sign in` at 1024. The fix is §10's gaps.
- **Eight tiles sideways are 95.5 dots wide at 844 and 97.9 at 863** (seven were 110.3 / 113.0). The spec floor of 104
  (`e2e/phone-screen-tiles.spec.ts:190`) becomes **92**. A real iPhone held sideways, with its ~47-dot insets, gives
  86.8; `TEMPLATE` (72.8 + 4 + 4 + 2 border) still fits inside it. Upright the grid stays four across, now
  **four over four** (`expectFourOverThree`, `e2e/phone-screen-tiles.spec.ts:78-84`, is renamed and rewritten).
- **The shared Select trigger is 32 tall with no touch rule** (`components/ui/select.tsx:44`, `data-[size=default]:h-8`).
  BOTTOM's seven Selects (WINGS, the three Cut pickers, Channels, Run, Longest) add **`coarse:data-[size=default]:h-11`** — a bare `coarse:h-11` loses to the trigger's own
  attribute-qualified `h-8`.
- **Metric Depth stops at 12 mm, not the sketch's 13.** `measureSlider` rounds a metric range inward (`lib/geometry/units.ts:192-206`)
  and 1/2" is 12.7 mm, so the slider's max is 12 and its right hint must read `12 mm` (the sketch printed `13 mm` under a
  12 mm slider). Every right-hand hint prints the slider's own max, never a separately formatted bound.
- **No drawing in the app has a break line, a cutting line or a height multiplier.** All three are new marks, defined in
  §3 from the sketch.
- **The app's dimension end mark is a 45° tick** (`DimensionTick`, `components/viewer/callout-primitives.tsx:365`); the
  sketch drew flat bars. The gauge dimensions use `DimensionLine` (`:398`) and its tick, so every viewer measures the same
  way `(Claude's discretion — founder may overrule)`.
- **Fins are lines in the app, not boxes:** FINS draws each fin as its base from trailing to leading edge
  (`components/fins/fin-viewer.tsx:687-704`); CONTEXT's "fin boxes" are drawn that way here (§3.2).
- **No drawing's drag point takes the keyboard today** (TEMPLATE's points are pointer handlers on the SVG,
  `components/outline/outline-viewer.tsx:1102`); their sliders are the keyboard path. BOTTOM does the same: the
  `Section at` slider is the cutting line's keyboard path.
- **RAILS pins its phone drawing at 50dvh** (`components/rails/rail-band-editor.tsx:288`), ROCKER and TEMPLATE at 66dvh
  (`components/rocker/rocker-editor.tsx:466`, `components/outline/outline-editor.tsx:431`). BOTTOM pins 66dvh: the sketch's
  66%, and two drawings to hold.
- **The ruler draws from a 548-dot section box (a 1024 window), values only; its caption and the gauges' words from 625**
  (D-30 — the founder's ruling of 2026-11-08 over this contract's first draft, which drew nothing under 625, the sketch's
  `px < 1.6`). The box is the window less 476 dots once the panel reaches its 400 cap (from about 940 wide), so **a 1024
  window (box 548) draws the ruler bare and terse gauges**; from about **1102** wide the caption and the words join; an iPad
  held sideways (1180, box 704) draws everything; below 548 (a window under about 1024, every phone) there is no ruler.
- **GUIDE's three-across needs about 1200 dots of window** (§5); at 1024 two cards fit, at 820 one.
- **The order form's PLANING box cannot hold the worst bottom.** Its free room is about 294 dots in print (14-UI-SPEC §8:
  539 tall, ~185 used, at 15.4 vs 12.8 type); the worst three cuts and channels need 336 (Imperial) to 384 (Metric) at the
  12.8-dot micro size in its 185.6-dot column. This draft first proposed a page-2 box; the founder ruled for *"a more
  substantial way of portraying how to shape contours"* — hence §8's page of its own (D-29).
- **`Toe-in (no toe)` (98.2) does not fit a Run trigger at the narrowest panel**: the row's two columns are 126 dots at an
  820 window (260 inner, `gap-2`), 84 of text after the trigger's 42 of padding, border and chevron. It truncates with `…`
  from 820 to about 880 wide, on a single-fin board with Toe-in picked; the popup lists it whole (its `min-w-36`,
  `components/ui/select.tsx:86`). Every other option fits at every width (`All the same` 81.0).
- **The channels heading's echo truncates at the narrowest panels**: `CHANNELS` + `6, cut after the Extending Single Concave`
  needs 317 dots; it cuts with `…` below a 320-dot panel, as the sketch's own CSS did (sketch line 75).
- **Litres:** the first line's `now` must be VOLUME's `quotedVolumeLitres` (the estimate the tiles and cards quote), so the
  two screens can never disagree.
- **`screenWord("BOTTOM")` is already `Bottom`** (`lib/screen-steps.ts:40-44`): no code change for the words.
- **False positives in the "seven" sweep:** none found beyond the list in §16; re-sweep for `7` and `seven` at plan time.

---

## Interaction & Layout Contract

### What triggers what

Three switches, each answering its own question, **never conflated** (CLAUDE.md Layout). BOTTOM gives none a new job.

| Switch | Question | This screen |
|--------|----------|-------------|
| **Width** (`max-shell:` below 820, `shell:` at 820 and over) | Which layout | Stacked (drawing pinned over one section's controls, the NOSE · CENTER · TAIL row) or the shell (panel beside the drawing, all three cards); the nav gaps; four-across or eight-across tiles |
| **Pointer** (`coarse:`) | How big a control draws | 44-dot Select triggers, Height buttons, tick rows, tabs, thumbs |
| **Height** (inline `[@media(max-height:500px)]`) | Short-screen rules | The compact top bar (inherited); the two drawings' 360-dot floor and the drawing column's scroll (`growOnShortScreen`) |

Two size questions are asked of a drawing's **own box**, never of the device: whether the section draws its ruler and
gauge words (box ≥ 625 dots, `useSvgClientSize`), and how many GUIDE columns fit (a CSS grid track). Both follow the
precedent of the readout card, which "reads nothing about the device … only whether its own figures fit"
(`components/design/imported-readout-card.tsx:36-39`).

### What draws the eye first

1. **The bottom from above** — the board with the live cut's shade darkening toward its deepest, the one wash on any
   drawing in the app. On a flat board, the board and its cutting line.
2. **The section under it** — the slab at ×4 with its gauge readings, the cut shaped against the dashed straightedge.
3. **The grab dot** under the board, the only accent mark on the drawing.
4. **The panel's Cut pickers**, three bordered boxes down the left.
5. Quietest: the contour lines, the reference ticks, the hints.

In DATA the eye lands on the two full-ink rows (wide point, front fins); in a GUIDE card on the cartoon, then the name.

### 1. The side panel (question B)

```
BOTTOM CONTOURS                                   ← 18/800 title
Map, measure and cut the bottom                   ← 14/400 muted

INPUTS ──────────────────────────────────────     ← RULED_HEADING
┌ FROM TEMPLATE & ROCKER ───────────────────┐     ← ImportedReadoutCard, three figures
│ 6'2"      18 3/4"     2 1/4"              │
│ LENGTH    WIDTH       THICKNESS           │
│ Thickness is the planed number. The       │     ← foot
│ contour comes out of it.                  │
└───────────────────────────────────────────┘
[ ] Show the finished rail from RAILS              ← tick row, view-only

WINGS ─────────────────── 1/4" wing at 11 1/2"     ← winged board only
Measure Off Rail from
[ Narrowest outline                       ⌄ ]
The real rail behind the wing, and that …         ← 12/400 muted

NOSE ────────────────────────────── Flat Entry     ← heading + echo
Cut
[ Flat Entry                              ⌄ ]
Nothing is cut in this section.

CENTER ─────────────────── Deep Single Concave
Cut
[ Deep Single Concave                     ⌄ ]
Off Rail — 2"                                      ← SliderRow
━━━━━━●───────────────────
At the rail                             6"
Start — 58" from the tail
───────●━━━━━━━━━━━━━━━━━━                         ← fill from the dot to the tail
Nose                                  Tail
 … Deepest At, End, Depth, Smoothness

TAIL ──────────────────────────────── Flat Exit
Cut  [ Flat Exit ⌄ ]
Nothing is cut in this section.
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄       ← dashed rule
CHANNELS ──────────────────────────────── None     ← 10/800 sub-heading
Channels  [ None ⌄ ]

[ ← Rocker ] [██████ Rails → ██████]               ← StepNav
© … Terms · Privacy
```

- **The column** is `flex flex-col gap-5` (`components/rails/rail-controls.tsx:578`); each section is RAILS' group,
  `flex flex-col gap-3.5` (`:516`), its heading `RULED_HEADING` (`:99-100`) holding the name and, at the right, the cut's
  name in `text-xs font-normal normal-case tracking-normal text-surf-ink-muted truncate min-w-0` (the sketch's
  `.cutname`, sketch line 75). No View box and no ADVANCED fold: BOTTOM's sections are always open on a computer.
- **INPUTS**: `RULED_HEADING` `Inputs`, then the card `mt-2` (as RAILS', `:605-613`), built by a new
  `bottomImportedReadout(length, width, thickness, system)` in `lib/geometry/imported-readout.ts` — Length through
  `formatLength`, Width through `formatDim`, Thickness through `formatMark` (§11), `foot` the sentence above. The card is
  information: never greyed on a locked board.
- **The finished-rail tick row** is the RAILS label row exactly (`components/rails/rail-controls.tsx:595`), `pt-2` under the
  card, with `data-lock-exempt` on the `Checkbox`. Off when the page opens; not saved with the board.
- **WINGS** (a board with at least one placed wing, `placedWings`, `lib/geometry/wings.ts:527`): `RULED_HEADING` with the
  echo; a Select labelled `Measure Off Rail from`; the note, 12/400 muted. One setting for the whole bottom, saved with it.
  `disabled={locked}`.
- **A section card**: `Cut` label (`mb-1.5 text-sm text-surf-ink-muted`, FINS' label, `components/fins/fin-controls.tsx:427`),
  the Select full width, then the rows in the order above. Picking a name sets that section to the name's **starting
  numbers** on this board (D-08's table), makes it the **live cut**, and moves the section to its Deepest
  (sketch line 1120-1121). Picking `Flat …` leaves one line, the flat note.
- **The Selects**: `Select` with `items`, the trigger `w-full border-outline-sidebar-input-border bg-outline-sidebar-input-bg
  text-outline-sidebar-text coarse:data-[size=default]:h-11` (the sidebar classes, `components/fins/fin-controls.tsx:326`,
  plus the touch height), `aria-label` from § Screen readers, `disabled={locked}`.
- **Station sliders** (Start, Deepest At, End): the track is **distance from the nose** — nose at the left, tail at the
  right, like the drawing (D-07) — in 1/2" steps (Metric 10 mm steps, whole centimetres; a drag stored as whole
  millimetres), the Thinning Starts slider's grid (`lib/geometry/blank-reasons.ts:310-322`). A Nose cut's track fills from
  the nose to the dot; a Center or Tail cut's (and the channels') takes `className="slider-fill-end"` and fills from the dot
  to the tail (`components/rocker/rocker-controls.tsx:403`; no mirroring, because the track already runs nose to tail).
  The label reads the distance from the **nearest tip** (D-07). Hints `Nose` · `Tail`.
- **Start ≥ Deepest ≥ End is kept by the slider being dragged winning**: dragging Start toward the tail pushes Deepest and
  End ahead of it; dragging End toward the nose pushes Deepest and Start; dragging Deepest pushes whichever it meets — the
  sketch's `normalize` (sketch line 1013-1016). Nothing stops a thumb. The pushed values change in the same undo step
  (one `noteEdit` key per drag, `components/design/design-store.tsx:746-755`).
- **A double's flat and trough stay in order** the sketch's way: Off Stringer at most half the cut's width, Trough At at
  least 1/4" outside the flat and inside 85% of the cut (sketch lines 472 and 1017), applied by the geometry, never by
  stopping a thumb.
- **Mark sliders** (Off Rail 0–6", Off Stringer 0–9", Trough At 1/2–8", Depth 0–1/2", Vee Lift 0–1/2", Channel Width
  1/2–4"): 1/16" steps, Metric 1 mm, through `measureSlider(value, range, 1/16, 1, system)`. **Stagger** (a dim): 0–8",
  1/2" steps, Metric 10 mm. **Smoothness**: 0–100 in steps of 5, `%`.
- **The live cut** is the last section (or the channels) the shaper touched — a press anywhere in its card, or its tab on
  the phone row (sketch lines 1132-1133 and 1109). It owns the lower rail's marks and the ruler (§3). The page opens
  with CENTER live.
- **Panel widths** this is checked at: 260 (820 window), 272 (sideways iPhone), 320 (1280 and over), and 328 / 343 / 358 /
  380 upright. Every cut name, option and heading fits at 260 except the two truncations in § Already done.

### 2. The channels block (question C)

- Under the TAIL card's last row: a **dashed rule** `mt-2 border-t border-dashed border-surf-line-faint pt-3` (the
  sketch's `.subhead`, sketch line 76), then the `CHANNELS` sub-heading (10/800 muted caps, echo 12/400 at the right,
  truncating), then a `flex flex-col gap-3.5` group.
- **Channels**: the count Select. Picking 4, 6 or 8 brings that count's starting width (2 1/2" · 1 3/4" · 1 1/4") **unless
  the width has been set by hand** — a width still equal to one of the three starting widths follows the count
  (sketch line 1124). Going from None to a count opens the set on D-11's numbers, makes the channels live and moves
  the section to their Deepest. `None` hides everything below and keeps the settings for the next count.
- **Run and Longest share one row**: `grid grid-cols-2 gap-2`, each a label over its Select. Measured: 126-dot columns at
  the 260 panel, 156 at 320, 175 upright at 390.
- **Stagger** hides for `All the same` (hidden, not dimmed).
- **On a phone** the TAIL panel is simply taller: the controls column under the pinned drawing already scrolls in its own
  box (`components/design/design-screen-shell.tsx:153-154`, `max-shell:overflow-y-auto` at `:96-97`), as RAILS' does under its
  plot. Nothing else is needed.

### 3. The VIEWER card (question D)

One card holds, top to bottom: the **top view** (`flex-[1.25]`), the **section** (`flex-1`) with its caption row, and the
**`Section at` row** (sketch line 299-311). Both SVGs take their box's own shape (a viewBox 1000 wide and as tall as
the box is, sketch line 558-563) so the board is as large as the box allows; the drawings are SVG `<path>`/`<text>`,
never HTML laid over them.

**3.1 Captions.** A caption row above each drawing: `flex items-center justify-between gap-2`, the name 10/700 caps muted,
the right side's words 12/400 muted (`normal-case`). On an upright phone the top view's caption row is hidden, the section's
`· 18 3/4" WIDE` and the `Height` word are hidden (sketch line 216-218) — under `max-shell:hidden`, width alone.

**3.2 The top view** (D-12), nose left like ROCKER (`components/rocker/rocker-top-view.tsx:260`):

- The board: `--outline-board-fill`, edge `--outline-ink` 1.1; the stringer's `16 4 4 4`; the wide point's station `2 3`
  in the widepoint line; the front fins' station `5 4`.
- **The shade**: for every column of the board (120 along it, 64 across each half — the sketch's sampling,
  sketch line 597), a band of `--outline-bottom-shade` at `fill-opacity` 0.04 for each 1/32" of foam off, stacked, so a
  1/4" depth is eight bands deep; clipped to the board's outline.
- **A contour line at every 1/16"** over the shade, `--outline-station-line` 1.
- **The pencil lines**, each from its own cut's Start to End: a single's edge (Off Rail), a double's flat (Off Stringer)
  and edge, its trough in `--outline-trough-dash`, a tri-plane's panel line, every channel wall (from its own channel's
  start, so a staggered set steps). The live cut's in ink at 1.1; the others `--outline-pencil-line` 1.
- **The fins**, at their FINS placement: each mark's base from `(offTail, lateral)` to `(leadingOffTail, leadingLateral)`
  (`lib/geometry/fins.ts:177-188`), both sides, in `--color-surf-accent-ink` at 2.5 with round caps, **solid, no end dots,
  no dimensions** — FINS' own fin grammar less what only FINS measures (its dashes say where a fin is measured from,
  `components/fins/fin-viewer.tsx:697-703`) `(Claude's discretion — founder may overrule)`.
- **The upper rail** (6 dots above the board's top edge): `WIDE POINT · 36"` and `FRONT FINS · 10 7/8"`, each with a tick
  from the board's edge up to the rail; when the two names would touch, they anchor apart (the wide point's to the left of
  its tick, the fins' to the right) and the rightmost never passes the box (sketch line 660-672).
- **The lower rail** (6 dots under the board's bottom edge), the live cut only, nothing on a flat or None: `START` ·
  `DEEPEST` · `END` with the value muted, each ticked from the board's edge; a dotted `--outline-trough-dash` line across
  the board at Deepest. Two labels that would touch re-anchor away from each other; a third that still touches is not
  drawn (its tick is) (sketch line 680-687).
- **The cutting line**: `--outline-ink` 1.1 in `--outline-cut-dash`, from 8 dots above the board to the lower rail; the
  **grab dot** (r 7) 30 dots under the lower rail; a **44-dot-wide** invisible grab zone over the line and dot. **Press,
  drag or tap anywhere on the top view** and the section follows the pointer along the board (sketch line 1136-1144);
  the SVG is `touch-none select-none`; the grab zone's cursor `ew-resize`, the rest default. The station is continuous; the
  caption prints it to 1/16".
- **Room**: 30 dots above the board for the upper rail and 46 below for the lower rail and the dot (sketch line 583).
- **What it opens on**: the section at the **wide point** (sketch line 437).

**3.3 The section** (D-13), at the station on the cutting line:

- **One scale for every station**, set so the **wide point's** section spans the box less **20 dots of air a side**
  (95%); height exaggerated by the Height pick. If the exaggeration would push the cut out of the box, the height is fitted
  and the label reads the factor actually drawn (`HEIGHT ×2.3`) (sketch line 716-719).
- The planed slab with square rails, its bottom the cut, filled `--outline-board-fill`, edged `--outline-ink` 1.1. A
  swallow's two points draw as two pieces with no stringer line between them (sketch line 730).
- **The break line** when the slab would not fit: a zig-zag (±3 dots, 28 steps) across the top, ink 1 over a 7-dot panel
  underlay, overhanging each rail by 8 dots (sketch line 732-735).
- **The straightedge**: the planed bottom, ink 1 in `5 4`, overhanging each rail by up to 30 dots (less when the box ends).
  `PLANED BOTTOM` under its left end in a box ≥ 625 dots.
- **The stringer** as a faint centreline `16 4 4 4` through the slab.
- **Gauge dimensions** (`DimensionLine` with its ticks, `components/viewer/callout-primitives.tsx:398`): the gap at the
  stringer, value below; the rail lift at each rail with extension lines — **beside** the rail (value right of the right
  one) when there are 110 dots of room past it (60 in a box under 625), else the two lines just outside the rails and one
  value **under the straightedge at the right rail**, end-anchored; a double's trough or a channel's floor on its own line
  (a second line under the stringer's when both draw); **stringer left** on the right, between the slab's top and the
  gauge's foot, only when the slab is whole and there are 70+ dots past the rail (sketch line 762-780). A label draws
  only at ≥ 1/16" (1 mm).
- **The ruler** (box ≥ 548 dots and the live cut has marks — D-30; its caption only from 625): 40 dots under the straightedge, an ink line from the stringer to
  the farthest mark, a 10-dot origin tick, an 8-dot tick and its bare value (11/600) at every mark, values alternating two
  rows when they would touch; `OFF THE STRINGER` left of the origin from a 625-dot box, no caption between 548 and 625
  (sketch line 782-791). With the ruler the slab's
  foot sits **92 dots** above the box's bottom (or 42% of the box), without it **44** (or 26%)
  (sketch line 715). A wall appears on the ruler only from its own channel's start.
- **The ghost rail** (box ticked): RAILS' finished rail sitting on what the contour left, `--outline-ghost` 1, clipped to
  the slab (sketch line 737-745).

**3.4 How the drawings scale.** Every stroke, dash, tick and word is written in **screen pixels** through the SVG's own fit
— the sketch's `px = 1000 / width` (sketch line 555-563), the app's `useSvgFitScale` (`components/viewer/callout-primitives.tsx:153`)
— so lines are 1 dot and words 10/11 dots on any box. The two size questions (ruler and gauge words at ≥ 625; the
beside-the-rail room) read the section's own box (`useSvgClientSize`, `:195`).

**3.5 The Height control** (new; no existing control has this shape): `role="group"` `aria-label="Height"`, the word
`Height` (12/400 muted, computer only) then four buttons `×1` `×2` `×4` `×8`, each `rounded border px-2 text-[10px]
font-bold tracking-[0.05em]` in a `flex gap-1` row; pressed `border-surf-line text-surf-ink`, not pressed `border-transparent
text-surf-ink-muted`; `aria-pressed`; `focus-ring-accent`; on a coarse pointer each takes the zoom row's invisible touch box
(`COARSE_TOUCH_BOX`, `components/viewer/zoom-viewport.tsx:533-534`) — 44 tall, the four buttons sharing the row's width.
**×4 when the page opens**; kept while on the page, not saved (D-13). View-only: `data-lock-exempt`.

**3.6 `Section at`**: a row `flex items-center gap-2 pt-2 max-shell:pt-1` under the section — the word `Section at` (12/400 muted,
`whitespace-nowrap`) and the app's `Slider` with `slider-accent`, `flex-1`, the track **distance from the nose** (nose
left), 1/2" steps (Metric 10 mm), filled from the nose to the dot, `thumbAriaLabel="Section at"`, value text `36" from the
tail`, `data-lock-exempt`. Moving it moves the cutting line; dragging the line moves it.

### 4. DATA (question E)

- `compactOnPhone="text"` (its own 8-dot reading margin on a phone, `components/viewer/tabbed-panel.tsx:297`); the inner
  card scrolls (`overflow-y-auto`), the page never does.
- **The first line**, 12/400 muted, `max-w-prose`, then `mt-4` the group heading `Depths under a straightedge`
  (10/800 ink caps), then the table.
- **The tables are real `<table>`s** (`<th scope="col">` headers, `<th scope="row">` station cells) in RAILS' dress: the
  sideways scroller with its 24-dot fade (`components/rails/rail-data-table.tsx:121-122`), header row `border-b-2
  border-surf-line-faint pb-2`, rows `border-b border-surf-line-faint py-1.5 text-sm tabular-nums`, the station cell
  sticky and painted (`sticky left-0 z-10 bg-surf-panel`, `components/rocker/rocker-datasheet.tsx:94`), cells right-aligned
  `whitespace-nowrap`. **Cells muted, the station cell ink; the two reference rows — the 6" rows within 3" of the wide
  point and of the front fins — all ink** (sketch line 814). Minimum widths: depths table 504 (as RAILS'); layout-marks
  table 96 + 72 per column, plus the 24 of fade room. `(Claude's discretion on `<table>` — founder may overrule)`
- **Rows**: `Tail` (0), then every 6" from the tail (Metric: the honest centimetre conversion of each 6", `15.2`,
  `30.5` …), then `Nose tip` (sketch line 811-815). A cell with nothing reads `—`; the nose tip's width `—`.
- **Layout marks** table only when any cut has a mark (sketch line 822-828), its columns in shop order: each section's
  edge / flat / trough, then the channels' `Flat edge` (Off Stringer > 0) and `Wall 1` … A wall's cell is `—` ahead of its
  own channel's start.
- **Notes** `mt-3`, 12/400 muted, `max-w-prose`, the sketch's three paragraphs; the floor note in warning ink when it
  applies (§7).

### 5. GUIDE (question F)

- `compactOnPhone="text"`; the inner card scrolls (`overflow-y-auto`) — inside the folder on a computer, inside the pinned
  card on a phone; the page never scrolls as a whole (D-17).
- The intro, 12/400 muted `leading-normal`; then four groups, each `mt-4`: an `<h3>` group heading (10/800 ink caps) and a
  **`<ul role="list">`** of cards (`role` kept because Safari drops list semantics from a `list-none` list).
- **Columns**: `grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(max(236px,calc((100%-16px)/3)),1fr))]` — never more
  than three, never narrower than the sketch's 236 (sketch line 158). Measured on the folder's inner width (the window
  less the panel, the column's 24, the folder's 26 and the card's 26): **three across from about 1200 dots** (cards 263 at
  1280, 316 at 1440), **two from about 956** (270 at 1024), **one below** (404 at 820; 364 on an upright iPhone 14). The
  sketch's "three across on a computer" holds from 1200 up; below it a three-column card would be 177 dots at 1024, its
  longest note over 280 dots tall `(Claude's discretion — founder may overrule)`.
- **A card** (`<li>`): `flex min-w-0 flex-col gap-2 rounded-lg border p-3 max-shell:p-2 [@media(max-height:500px)]:p-2`,
  `border-surf-line` when on this board, else `border-surf-line-faint`; not a button, no hover, default cursor.
  - **Name row**: `flex items-baseline justify-between gap-2` — the name 14/600 ink, the tag `On this board` (10/800
    accent-ink caps, `flex-none`) when the cut is on the board.
  - **The cartoon**: an SVG `viewBox="0 0 300 154"`, `w-full h-auto`, `aria-hidden`, every path and line
    `vector-effect: non-scaling-stroke` at 1 dot (sketch lines 163-164 and 896-952): the open board from above (76 tall)
    with that one cut's shade (5% per 1/32") and its pencil lines, the trough line dashed `1 3`, the stringer `12 3 3 3`,
    the cutting line `7 2.5 1.5 2.5` in ink where it is deepest (kept 3" inside either tip; a flat at the wide point); 6
    below, the section there (72 tall) at **Height ×8** over a dashed `4 3` straightedge, with the break line when needed.
    The board is the one the shaper has open; the cut is that name **at its starting numbers**, alone. Switching boards
    redraws every card. The channels card draws six channels.
  - **Text**: one `<p>` 13/400 muted `leading-[1.45]` — the first sentence in a `font-semibold text-surf-ink` span, then
    the second.
  - **How to shape**: a `<p>` `border-t border-dashed border-surf-line-faint pt-2`, 12/400 muted — the label `How to
    shape` on its own line (10/800 accent-ink caps, `block mb-1`), then the note.
- What draws the eye first in a card: the cartoon's shade; then the name.

### 6. Layout under the three switches (question G)

| Screen | Layout | The drawing |
|--------|--------|-------------|
| **1280 × 800**, mouse | Shell; panel 400 (inner 320) | Section box 804 wide: ruler, gauge words, three GUIDE cards |
| **1024 × 768** | Shell; panel 400 | Box 548: the ruler bare (D-30), terse gauges, two GUIDE cards |
| **820 × 800** | Shell; panel 340 (inner 260) | Box 404: no ruler, one GUIDE card |
| **iPad 1180 × 820**, finger | Shell, 44-dot controls | Box 704: ruler and words, two GUIDE cards (inner 704) |
| **iPhone 14 upright, 390 × 664** | Stacked; pinned 66dvh = 438 | Card 398 (66dvh − 40); NOSE · CENTER · TAIL row 33; drawings ≈ 330 shared 1.05 : 1; one section's controls beneath, 178 visible |
| **iPhone held sideways, 844 × 390** (Safari ≈ 340) | Shell by width, compact bar by height; panel 352 | The drawings keep a 360-dot floor; the drawing column scrolls |

- **Computer and sideways phone** (`shell:`): all three section cards in the panel; the drawing column holds the
  TabbedPanel. VIEWER's card: `compactOnPhone="drawing"`; DATA and GUIDE `"text"` — the frame never moves between tabs
  (`components/viewer/tabbed-panel.tsx:110-127`).
- **Upright phone** (`max-shell:`): `phonePinned="66dvh"`. The TabbedPanel's inner card takes
  **`max-shell:h-[calc(66dvh-40px)] max-shell:flex-none`** on every tab, so VIEWER, DATA and GUIDE fill the same pinned
  height and the column comes out at exactly 66dvh: 4 of column rims, 9 of strip clearance, 22 of tab less its 1-dot
  overlap, 6 of folder border and rim (`components/viewer/tabbed-panel.tsx:159`, `:218`, `:250-252`). A browser test
  measures the column at no more than 66dvh and the card at no less than 66dvh − 41, so a change to any rim fails loudly.
  VIEWER's card carries, first, RAILS' **NOSE · CENTER · TAIL** row copied verbatim (`components/rails/rail-band-editor.tsx:511-538`,
  `pt-[11px]`, the 44-dot touch box), then the two drawings and `Section at`. The switch picks the section whose controls
  show beneath (RAILS' `contents shell:hidden` / `max-shell:hidden` rule, `components/rails/rail-controls.tsx:551`, `:516`)
  and makes it live; the WINGS row, INPUTS and the finished-rail tick show above whichever section is picked. The page opens
  on CENTER.
- **Short screen** (`[@media(max-height:500px)]`): BOTTOM passes **`growOnShortScreen`** (as RAILS does,
  `components/rails/rail-band-editor.tsx:350`) and VIEWER's two-drawing box takes **`[@media(max-height:500px)]:min-h-[360px]`**,
  so on a phone held sideways the drawings keep a usable size and the drawing column scrolls on its own
  (`components/design/design-screen-shell.tsx:201-203`), as RAILS' plots do. Measured: at 844 × 340 the column leaves about
  218 dots for both drawings without the floor — a 97-dot section `(Claude's discretion — founder may overrule)`. DATA and
  GUIDE grow with their content there, so the column is their one scroller too; the page never scrolls.
- **What is not drawn below a box of 625 dots**: `PLANED BOTTOM`, the ruler's caption, and the words `rail lift` / `stringer
  left`; **below 548 dots** the ruler itself (D-30).
  This is the section's own width; DATA's layout-marks table is the phone's and the paper's version (D-14).

### 7. Warnings and edge states (question H)

- **The floor (D-09).** The maths never leaves the stringer under the app's 1/4" floor (`FOIL_THICKNESS_RANGE_IN.min`,
  `lib/geometry/foil.ts:50-55`). The slider shows the depth as set; under the Depth row of every cut (or the channels)
  that meets the floor, one sentence (§ Copywriting) in `<p className="mt-2 text-xs text-surf-warning-ink">` — ROCKER's
  too-close line exactly (`components/rocker/rocker-controls.tsx:416`). In DATA, each `Stringer left` cell at the floor
  reads in warning ink (the DATASHEET's own treatment, `components/rocker/rocker-datasheet.tsx:199`) and the floor note
  names the stations, so colour is never the only signal.
- **Squeezed channels**: the Width label's words; muted.
- **A single fin**: `Toe-in (no toe)`; the walls then run Parallel; no other words.
- **A wingless board**: no WINGS row.
- **A locked board** (`useControlsLocked`, `components/design/use-controls-locked.ts:14`): every `SliderRow` greys and disables
  itself (`components/design/slider-row.tsx:122-127`); the Selects, the Teardrop tick box and the WINGS Select take
  `disabled={locked}` and the dimmed look (`opacity-40`, `components/rails/rail-controls.tsx:594`); the readout card stays
  full strength. **Live on a locked board** (`data-lock-exempt`): the tabs, the NOSE · CENTER · TAIL row, the finished-rail
  tick, Height, `Section at`, the cutting line's drag — a locked board is for looking at
  (`components/design/board-lock-scope.tsx:24-26`). `board-lock-scope.test.ts`'s inventory must find every control.
- **Signed out**: exactly as signed in; sign-in is never a gate (C4).

### 8. The other screens (question I)

- **FINS' tail drawing** (D-23): between the board's fill and the reference lines
  (`components/fins/fin-viewer.tsx:663-685`), the bottom's shade and 1/16" lines and every pencil line that reaches the
  drawn tail (the tail cut, the channels, a center cut running past) — the same function in FINS' own units
  (`SCALE = 14`, `:43`), `--outline-pencil-line` throughout (nothing is live there), strokes `× zoomUnit` like FINS' own
  lines. Read-only: no cutting line, no labels, no new control. The fins draw on top, unchanged. A flat board draws exactly
  as today, so FINS' reference picture does not move.
- **The 3D screen** (D-21): the board's bottom carries the cut; no new control, word or note.
- **VOLUME** (D-20): the litres read the foam left; no new words; a preset's litres never move (the presets stay flat).
- **RAILS** (D-22): no control or word changes. Whether its imported readout card's three thicknesses
  (`lib/geometry/imported-readout.ts:99-111`, captioned `From ROCKER & FOIL`) read the lifted rail is D-22's research
  (open item 3).
- **The order form** (D-29, the founder 2026-11-08: *"a more substantial way of portraying how to shape contours … for now
  a new page would be acceptable and I'll likely reorganize the sheet later"*): a **third page, `BOTTOM CONTOURS`**, after
  page 2, **printed only when the bottom has a cut** — a flat board's two pages are byte-identical to today's. In the order
  form's own dress (`FormBox`, `components/summary/order-form.tsx:724-728`; the print block of `app/design/summary/order-form.css:501`,
  both papers), top to bottom: **(1)** the bottom from above, nose left, full width — the shade and 1/16" lines, every
  pencil line, the wide point and the front fins ticked above, each cut's Start · Deepest · End ticked below — drawn by the
  screen's own pure functions (§15) in `--outline-pencil-line` and the print inks the Full Sized Template uses (hollow board,
  `app/globals.css:1010`); **(2)** one section per cut on the board at its deepest station — Nose, Center, Tail, Channels, up
  to four, two across — at Height ×4 labelled, with its gauge readings; **(3)** DATA's two tables (the depths every 6" and
  the layout marks) in the order form's table dress (`data-planing-table`'s classes, `:730-800`); **(4)** a *How to shape*
  note per cut on the board, verbatim from `17-GUIDE-WORDS.md`, in the PLANING footnote's micro type (`:793`). The page's
  caption reads `Bottom Contours`; each part's head reads the cut's name (`Center: Deep Single Concave`). **The planner
  proves the fit** on both papers in the order form's existing fit cases (`summary-planing.spec.ts`'s `scrollHeight`
  against `clientHeight`) and the phone sheets; if the page cannot take all four parts, the two tables go to a fourth page
  — never dropped. Folding the page back into a double-sided sheet is the founder's later reorganisation, outside this
  phase. This contract's first draft proposed a page-2 box with one line per cut, measured at 134 dots worst case; the
  founder overruled it. `(The page's dress — Claude's discretion — founder may overrule at plan approval)`
- **The Overview Sheet** (`components/template/build-overview-pdf.ts:126`): after `Template Area` (`:164`), a head line
  `Bottom:` then each line above indented by `WING_ROW_INDENT` (`:62`) with its `{Section}: ` kept; wrapped by the existing
  `wrapTextToWidth`. A flat board adds no lines, so its list is byte-for-byte today's (the wings' D4 rule, `:124`).
- **The Full Sized Template and the Paper Saver**: nothing.

### 9. Nav, tiles and Back/Next (question A — the delta to 16-UI-SPEC §10)

- **`NAV_LINKS`** gains `{ href: "/design/bottom", label: "BOTTOM" }` third, after ROCKER (`components/site-nav.tsx:31-39`);
  `app/design/bottom/page.tsx` is the eighth route. Every comment that says "seven" says "eight"
  (`components/site-nav.tsx:26`, `components/design/phone-menu.tsx:98`, `lib/screen-steps.ts:2`).
- **The desktop row**: the cluster's gap becomes **`gap-1.5 lg:gap-3 xl:gap-5`** (`components/site-nav.tsx:96`), §10.
- **The ☰ sheet**: `grid grid-cols-4 gap-2 shell:grid-cols-7` becomes **`grid grid-cols-4 gap-2 shell:grid-cols-8`**
  (`components/design/screen-tiles.tsx:263`): TEMPLATE ROCKER BOTTOM RAILS / VOLUME FINS SUMMARY 3D upright, one row of
  eight at the shell width.
- **The BOTTOM tile's picture** `(Claude's discretion — founder may overrule)`: TEMPLATE's board lying nose-left
  (`outlineTileArt(geometry, "lying")`, `lib/geometry/screen-tiles.ts:102`) with **this board's own** bottom on it — the
  shade bands (the same function, coarse: 40 × 12) in `--outline-bottom-shade` and its pencil lines in
  `--outline-pencil-line` at 1 — and the **cutting line at the wide point** in `--outline-ink` 1, dash `4 2 1.5 2`, every
  stroke `vectorEffect="non-scaling-stroke"`, fill `--outline-board-fill`, edge `--outline-ink` 1.4, in the 46-dot box
  (`components/design/screen-tiles.tsx:74`). A flat board's tile is the board and its cutting line — which is what tells it
  from TEMPLATE's — never a made-up cut (the tiles' rule: "never a made-up number", `.claude/skills/sketch-findings-shaper/references/phone-chrome.md`).
  One pure `bottomTileArt(geometry, bottom)` beside the others; `ScreenTileKind` gains `"bottom"`
  (`lib/geometry/screen-tiles.ts:255`); `TILE_KIND` gains `"/design/bottom": "bottom"` — typed on the screen list, so the
  build fails until it does (`components/design/screen-tiles.tsx:64-72`); `screenTileLines` gains `bottom` (`:260`).
- **Back/Next**: no code beyond `NAV_LINKS`; `StepNav` reads the order (`components/design/step-nav.tsx:35-36`).
- **The desktop reference pictures**: every whole-window picture moves **in the nav row only** — at 1280 the gap stays 20,
  so the five links right of ROCKER shift 83.7 dots left (63.7 + 20). Re-record from the main checkout after a pixel diff
  shows nothing below the row moved, under `e2e/desktop-baseline.spec.ts:120-124`'s rule; no BOTTOM picture is required
  (it is the planner's call whether to add one).

### 10. The desktop row's arithmetic

Measured with the app's built stylesheet, signed out (`Save` and `Sign in`), eight links (`BOTTOM` 63.7 dots):

| Width | Today's gaps (12 / 16 / 20) | This contract's gaps (6 / 12 / 20) |
|-------|-----------------------------|------------------------------------|
| 820 | **overflows by 63**; logo at its 100.2 floor | fits; logo 109.1; `Sign in` two lines (as today) |
| 844 / 863 | **overflows by 39 / 20** | fits; logo 133.1 / 152.1; `Sign in` two lines (as today) |
| 900 | fits, `Sign in` two lines | fits, `Sign in` two lines (today with seven: one line) |
| 910–1023 | fits from 1000 | fits, `Sign in` one line, row 81 |
| 1024 | **`Sign in` wraps, row 89** | fits, logo full size 175.4, row 81 |
| 1100–1279 | fits | fits, row 81 |
| 1280 / 1440 | fits (gap 20) | unchanged |

The one cost: `Sign in` wraps from 820 to 909 instead of 820 to 899. 8 below 1024 was tried and overflows by 15 at 820;
10 by 39. Signed in, the avatar is narrower than `Sign in`, so signed out is the tight case. `e2e/site-nav-width.spec.ts`
(820 / 844 / 863 with its 24-dot headroom check, `:116`, and the 1024–1280 describe) is re-run; its header comment
(`:16-18`) is updated.

### 11. Units (question J; Rule 2, D-25)

| Number | Family | Imperial | Metric | Through |
|--------|--------|----------|--------|---------|
| Length (readout) | dim (length) | `6'2"` | `188.0 cm` | `formatLength` (`lib/geometry/measure-display.ts:210`) |
| Width (readout), a section's width, DATA's Width | dim | `18 3/4"` | `47.6 cm` / bare `47.6` | `formatDim` / `formatDimBare` (`:63`, `:72`) |
| Thickness (readout) | dim | `2 1/4"` | `5.7 cm` | `formatDim` (`:63`), as VOLUME's card reads the centre thickness (`lib/geometry/imported-readout.ts:149`) |
| `planed`, `stringer finishes` (DATA's first line), Stringer left | mark | `2 1/4"` | `57 mm` / bare `57` | `formatMark` / `formatMarkBare` (`:81`, `:86`) — a datasheet's station thicknesses, as the foil's five stations read |
| Depth, Vee Lift, Off Rail, Off Stringer, Trough At, Channel Width, the last wall off the rail, every gauge reading, Deepest cut, Rail lift, every layout mark, a wing's depth | mark | `3/16"` | `5 mm` | `formatMark` / `formatMarkBare` |
| Start, Deepest At, End (from the nearest tip), Stagger, the stations on the rails and in captions, `Section at`, a wing's station | dim | `23 7/16"` | `59.5 cm` | one named `formatBottomStation` → `formatDim`, beside `formatThinningStart` (`lib/geometry/blank-reasons.ts:285`); a 12" station prints `stationLabel`'s digits (`30.5 cm`), never `305 mm` |
| DATA's station rows | dim | `6"` `12"` | `15.2` `30.5` | `formatDimBare`, the honest conversion of every 6" |
| Litres | litres | `28.89 L` | same | `toFixed(2)` as VOLUME (`components/volume/volume-calculation-card.tsx:137`) |
| Smoothness | percent | `50%` | same | none |
| Toe-in angle | degrees | `3.2°` | same | `toFixed(1)` |
| Height factor | ratio | `×4` | same | none |

Every slider through `measureSlider` (`lib/geometry/measure-display.ts:321`): marks in 1/16" (1 mm), stations and Stagger in
1/2" (10 mm); every typed or dragged value stored as metric `Mm` in the board, nothing converted in a component. **Why the readout's Thickness is a dim and DATA's `planed` is a mark:** CLAUDE.md Rule 2 — a board's headline thickness
is a dim (`5.7 cm`), as VOLUME's card reads it (`lib/geometry/imported-readout.ts:149`), and a datasheet's station
thicknesses are marks (`57`), as the foil's five stations are; the same number reads two ways on purpose, each correct for
what it shows (D-25 as sharpened 2026-11-08 by the orchestrator; this contract's first draft read the card's Thickness as a
mark and was corrected before the checker).

### 12. Accessibility (question K)

- **Every control has a name** (§ Copywriting, Screen readers); every slider speaks its value the way its label prints it
  (`sliderLabel` / `sliderValueText`, `components/design/slider-row.tsx:79-85`).
- **The drawings are pictures with names** (`role="img"`); everything they show is also a word somewhere: the cut and its
  numbers in the panel, the depths in DATA, the station in `Section at`'s value.
- **The cutting line** is pointer-only; its keyboard and screen-reader path is the `Section at` slider (arrow keys a 1/2"
  station, Page Up/Down Base UI's large step), exactly as TEMPLATE's drag points leave the keyboard to their sliders.
- **Tabs**: the TabbedPanel's own `tablist` / `tab` / `aria-selected` (`components/viewer/tabbed-panel.tsx:176-181`); the
  phone's NOSE · CENTER · TAIL row RAILS' `role="tablist"` (`components/rails/rail-band-editor.tsx:512`).
- **GUIDE**: an `<h3>` per group and a `<ul role="list">` of cards; each card's name is its `<h4>`; cartoons hidden.
- **DATA**: real tables with header cells (§4).
- **Focus order**: on a computer the panel first (the shell's DOM order): the finished-rail tick, WINGS, each section's
  Cut and its rows and tick box, the channels' Selects and rows, Back, Next; then the tab strip, Height, `Section at`. On a
  phone the drawing draws first but the order is the same.
- **Touch**: 44 on a coarse pointer for every control (§ Spacing). **Reduced motion**: nothing on BOTTOM animates.

### 13. Themes and print (question L)

- **Four themes** through the tokens alone (§ Color); computed above; a picture of the Shortboard with a deep single and six
  channels in each theme is part of the plan's look (the sketch's `desktop-chalk/slate/phosphor.png` are the reference).
- **BOTTOM is not printable**: the TabbedPanel wrapper carries `print:hidden`, as the 3D canvas does
  (`components/3d/three-d-screen.tsx:1269`); Back/Next already print-hide (`components/design/step-nav.tsx:42`). A shaper's
  paper is the order form and the Overview Sheet (§8).

### 14. States (question M)

| State | What the shaper sees |
|-------|----------------------|
| **Every section flat** (every board's opening) | NOSE, CENTER, TAIL each `Nothing is cut in this section.`; channels `None`; the top view the bare board, its stringer, wide point, front fins and fins, the cutting line at the wide point; the section a plain slab on the straightedge, no gauges; DATA's first line `Foam off 0.00 L · 29.61 L now, 29.61 L before contours · …`, the depths table all `—` but Width and Stringer left, no layout-marks table; GUIDE tags the three flats |
| **A cut picked** | That section's rows on its starting numbers; the section jumps to its Deepest; shade, lines, lower-rail marks; the gauges; DATA's rows and its marks columns; the GUIDE tag moves |
| **Channels picked** | The channel rows; walls on the top view stepping by Stagger; the sawtooth in the section; `in the channel`; walls on the ruler (computer) and `Wall 1…` columns in DATA |
| **A winged board** | The WINGS row with Narrowest; the caption's wing note; flipping to Natural moves edges and walls behind the wing |
| **Metric** | Marks in whole mm, dims in cm to one decimal, the ruler `· mm`, DATA's ` (cm)` / ` (mm)` headers, Depth to 12 mm |
| **A locked board** | Cut pickers, sliders and tick boxes greyed and still; tabs, Height, Section at, the drag and the finished-rail tick live |
| **Signed out** | Exactly as signed in |
| **The saved board reopening** | Every cut, number, channel setting and the wing rule exact; Height ×4, the finished rail off, CENTER live, the section at the wide point |
| **A board from before this phase** | Opens flat; nothing rewritten on open (D-24) |
| **The floor warning** | The sentence under Depth in warning ink; DATA's floor cells and note |
| **A squeezed set** | `Channel Width — 2 1/2" (2 3/16" to fit) · …`; walls at the fitted width |
| **A single fin** | `FIN · 14"` on the upper rail; `Toe-in (no toe)` in Run |
| **The phone stack, NOSE / CENTER / TAIL** | The row switches which section's controls show and which cut is live; the drawing stays where it is |
| **The section slider at a tip** | At the nose tip the slab has no width: the straightedge alone and `· 0" WIDE`; at the tail a squash's block or a swallow's two points |
| **Box 548–625 dots** | The ruler bare (no caption), no `PLANED BOTTOM`, the rail lift and stringer left as values alone (D-30) |
| **Box under 548 dots** | No ruler; the gauge values alone |
| **Short screen** | The drawings at their 360 floor; the drawing column scrolls |
| **Theme changed while open** | Recoloured at once (tokens), nothing re-laid out |
| **A long board name** | The tab band truncates it; GUIDE's intro names it in full |

### 15. The pure functions this contract implies (Rule 1; the planner writes the tests)

All in `lib/geometry/` (new `bottom.ts` and companions), no React, every expected value from the app's own functions or
script-made fixtures — the sketch's figures (0.54 L for the test single on the Shortboard, +0.26 L for six channels) as
relations, never typed (CLAUDE.md Rule 1).

| Function | Inputs → output |
|----------|-----------------|
| `foamOff(bottom, board, station, fromStringer)` | The one number (D-05): the sum of the cuts in shop order, never below 0, never leaving the stringer under 1/4" → `Mm` |
| `cutFoamOff(cut, board, station, fromStringer)` | One cut's own foam (a check probes this, not the total — the sketch's lesson) → `Mm` |
| `offRailReference(board, rule)` | The Narrowest or Natural line a cut's Off Rail is measured from (D-19), reading `curveHalfWidthAt` / `wingFootprint` / `placedWings` (`lib/geometry/wings.ts:379`, `:410`, `:527`) → half-width at a station |
| `startingCut(section, name, board)` | D-08's starting numbers for a name on this board (fins read from `computeFinPlacement`) → a cut |
| `keepStationsInOrder(cut, changed)` | The dragged slider wins; the others pushed (§1) → a cut |
| `channelLayout(channels, board, station)` | Each channel's `[in, out]`, its start, the fit (width as cut, last wall off the rail, squeezed) and the run's walls → layout |
| `bottomShadeBands(bottom, board, grid)` | Per column, the bands per 1/32" level → rectangles in board millimetres |
| `bottomContourLines(bottom, board, grid)` | The line at every 1/16" → polylines |
| `bottomPencilLines(bottom, board)` | Edges, flats, troughs, panels, walls, each with its kind, cut and span → polylines |
| `bottomSection(bottom, board, station, height, box)` | The slab piece(s), the straightedge, the break flag, the factor drawn → geometry |
| `sectionGauges(bottom, board, station, box)` | Which gauge lines draw, where, their values, beside-or-under, words-or-not → placements |
| `bottomDataRows(bottom, board)` / `bottomLayoutMarks(bottom, board)` | DATA's rows every 6" and its mark columns → numbers in `Mm`, wording in the component through §11's formatters |
| `bottomLitres(...)` | Now, before, and the printed difference (§ DATA) |
| `bottomFloorFlags(bottom, board)` | Which cuts meet the floor and where → stations |
| `guideCartoon(section, name, board)` | One cut alone at its starting numbers on this board: the top view and the ×8 section where it is deepest |
| `bottomPrintLines(bottom, board, system)` | §Copywriting's paper lines |
| `bottomTileArt(geometry, bottom)` and `screenTileLines`'s `bottom` | §9's tile |
| `formatBottomStation`, the station slider | §11 |

### 16. Specs that count seven (integration notes for the planner)

| Spec | What it pins | Change |
|------|--------------|--------|
| `e2e/helpers/screens.ts:14-22` | `SCREENS`, seven by hand | Add BOTTOM third; `expectSevenTilesInMenu` (`:74`) becomes eight |
| `e2e/phone-screen-tiles.spec.ts` | `toHaveLength(7)` four over three (`:78-84`), `toHaveCount(7)` (`:105`), the picture counts (`:114-121`), the sideways floor 104 (`:190`), `:424` | Eight; four over four; a BOTTOM picture count (≥ 1 path); floor 92 |
| `e2e/phone-sideways-top-bar.spec.ts` | Walks and counts seven (`:131`, `:159-165`) | Eight |
| `e2e/phone-layout.spec.ts:94`, `:133`; `e2e/app-settings.spec.ts:56`; `e2e/touch-sizing.spec.ts:199` | Seven tiles | Eight |
| `e2e/step-nav.spec.ts:14-22` | Local list with `word` | Add `{ "/design/bottom", "BOTTOM", "Bottom" }` third |
| `e2e/phone-trip.spec.ts` | Walks all seven (`:49`, `:65`) | Walk eight |
| `e2e/phone-chrome.spec.ts:1174-1180` | The five drawing screens' tabs | Add BOTTOM with `VIEWER` `DATA` `GUIDE` |
| `e2e/site-footer.spec.ts:44-50` | `DESIGN_SCREENS` | Add `/design/bottom` |
| `e2e/board-lock-screens.spec.ts:578` | The walk of screens greyed in turn | Add BOTTOM: pickers and sliders greyed, the view controls live |
| `e2e/site-nav-width.spec.ts` | The row at 820–870 and 1024–1280 | Re-run with §10's gaps |
| `e2e/desktop-baseline.spec.ts` | Five pictures | Re-record, nav row only (§9) |
| `lib/screen-steps.test.ts:7-15`, `:70-78` | A local seven | Eight, `Bottom` third |
| `components/design/board-lock-scope.test.ts` | The control inventory | Finds every new control tied to the lock or marked view-only |

Words that say "seven" and become "eight": `components/site-nav.tsx:26`, `components/design/phone-menu.tsx:98`,
`lib/screen-steps.ts:2`, `components/design/screen-tiles.tsx` header, CLAUDE.md's Layout section ("seven screen tiles",
"one row of seven", the design-screens list), and `.claude/skills/sketch-findings-shaper/references/phone-chrome.md`
(decisions 1–3) and its `SKILL.md` index row.

---

## Where this contract reads CONTEXT one way of two

None of these changes a locked decision; each is a reading the founder can reverse.

| Decision | Reading here | The other reading |
|----------|--------------|-------------------|
| D-17 "three cards across on a computer" | Three from about 1200 dots wide; two from 956; one below (measured) | Three always: 177-dot cards at 1024, 129 at 820 |
| D-12 "fin boxes drawn at their FINS placement" | FINS' own fin lines, solid, no dots or dims | A drawn box per fin (no such drawing exists in the app) |
| D-25 "the thicknesses are MARKS" | A dim on the readout card (CLAUDE.md's "headline thickness", as VOLUME's card) and marks in DATA — D-25 was sharpened 2026-11-08 to say exactly this | A mark on the readout card too (one page, one reading) — rejected: Rule 2 is app-wide, and a shaper quotes a board's thickness as a dim |
| D-26 / D-29 "the order form …" | A third page, BOTTOM CONTOURS, only when the bottom has a cut — the founder's ruling D-29 (2026-11-08) over this draft's page-2 box | A page-2 box or a paragraph inside PLANING — both set aside by him as not substantial enough |
| D-27 "the sideways phone and the short-screen rules as every other screen" | RAILS' short-screen rule: the drawing column scrolls, a 360-dot floor | Fill the column exactly, as 3D does (a 97-dot section at 844 × 340) |
| D-04 / R4 "Closes to a point … (Teardrop)" | Shown on all three nose singles, as the sketch does; ticked by the Teardrop's numbers | Shown on the Teardrop only |

---

## Ruled by the founder at this contract (2026-11-08)

Four of the discretion calls above went to the founder as one card. His answers, recorded as D-29 to D-32 in `17-CONTEXT.md`
and applied here: the fins on the top view are FINS' own base lines (D-31, §3.2); the order form gets a BOTTOM CONTOURS page
of its own for now (D-29, §8); the *Closes to a point* tick box shows on all three nose singles (D-32, §1); the ruler draws
from a 1024-dot window with values only, its caption and the gauge words from 625 dots (D-30, §3.3). The checker's three
recommendations were taken: the floor sentence now says what to do, the 12-dot step is recorded as the project's, and the
13-dot card text stays (the checker's advice to collapse it was weighed against the card's measured line count and kept).

---

## Open items for the planner

None blocks the plan.

1. **The BOTTOM CONTOURS page's fit** on both papers and the phone sheets: the sections two across, the tables full width; if
   the page cannot take all four parts, the two tables go to a fourth page (§8), never dropped.
2. **The short-screen floor** (360) on a real iPhone and Pixel held sideways — the founder's look decides.
3. **RAILS' readout card under D-22**: if its three thicknesses come to read the lifted rail, its caption
   `From ROCKER & FOIL` should be checked with the founder.
4. **Drawing performance**: the shade is 120 × 64 samples per redraw on every slider tick; memoise per board and bottom, and
   check a mid-range Android at 60 frames while dragging.
5. **The GUIDE's words**: build with `17-GUIDE-WORDS.md` verbatim; fold the founder's marked-up copy in as one task (D-18).
6. **CLAUDE.md and the skill** say seven screens; both become eight with the code (§16).

---

## UI Considerations

> Populated by the ui-phase UI-consideration probe (Step 9.5) and lifted by plan-phase's
> `## UI Considerations` lift rule via the identical rule as SPEC `## Edge Coverage`. Shape-rooted UI *state*
> coverage (empty / loading / error / populated / partial / overflow / zero-one-many / long-text).
> Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
> state coverage and REFERENCES those rows rather than restating the copy (de-dup).

**95 state considerations across 21 surfaces — 88 resolved explicitly, 7 resolved by backstop, 0 dismissed, 0 unresolved** (probe run 2026-11-08).

Method: the orchestrator authored each surface's kinds from the contract's own prose (the `--auto` convention — the
founder was not asked to classify surfaces), ran `ui-consideration-probe.cjs` for the categories each kind raises, and
resolved every one against the sections above: **✅ covered** cites the contract's own words (verification: explicit);
**🧪 backstop** names the visual or browser check that proves the state (verification: backstop). No row was dismissed.
The founder may revisit any row at plan approval.

### E01 — The desktop nav row's BOTTOM link

_Kinds: nav_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Overflow / truncation | Measured: eight links fit from 820 to 1440 with the cluster's gap at 6 / 12 / 20 (§10); `Sign in` wraps to two lines from 820 to 909, as today. | ✅ covered |
| Long text | `BOTTOM` is 63.7 dots at 12/700 tracked (§ Typography); labels are fixed words, never user text. | ✅ covered |

### E02 — The phone sheet's eight tiles and the BOTTOM tile

_Kinds: nav, media_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat board's tile is the board lying nose-left with its cutting line at the wide point and the line `All flat` — never a made-up cut (§9). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | The tile draws this board's own shade bands (40 × 12) and pencil lines; its line reads `{n} cuts · {k} channels` (§ Copywriting). | ✅ covered |
| Overflow / truncation | A browser spec measures the eight sideways tiles on the Pixel 7 and iPhone 14 profiles against the 92-dot floor, and four over four upright (§16's phone-screen-tiles.spec.ts changes). | 🧪 backstop |
| Long text | The tile line is `line-clamp-2` at 11px (`screen-tiles.tsx:293`); its longest form `2 cuts · 8 channels` is one line. | ✅ covered |

### E03 — Back and Next on ROCKER, BOTTOM and RAILS

_Kinds: nav_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Overflow / truncation | Back `flex-[0.8]`, Next `flex-1` as every screen (`step-nav.tsx:46-68`); `← Rocker` / `Rails →` are shorter than today's `← Rocker` / `Rails →` pair on ROCKER/VOLUME. | ✅ covered |
| Long text | Fixed words from `screenWord` (`Bottom`, `Rails`, `Rocker`); never user text. | ✅ covered |

### E04 — The panel title, subtitle and INPUTS readout card

_Kinds: static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Overflow / truncation | `BOTTOM CONTOURS` is 227.9 dots at 18/800 inside the 260-dot panel; the readout card's three figures fit as VOLUME's do (§ Typography). | ✅ covered |
| Long text | The readout's figures are formatted dims (`6'2"`, `18 3/4"`, `2 1/4"` / `188.0 cm`, `47.6 cm`, `5.7 cm`); the foot line is two short sentences that wrap inside the card. | ✅ covered |

### E05 — The Show the finished rail from RAILS tick box

_Kinds: form, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | Off when the page opens (D-13); unticked draws no ghost — the section is the slab on its straightedge. | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Partial / incomplete | A single boolean; RAILS' finished rail always exists for a board (`sampledFinishedRail`), so the ghost can always draw when ticked. | ✅ covered |
| Long text | The label `Show the finished rail from RAILS` is fixed; the tick-box row wraps like RAILS' own tick rows (`rail-controls.tsx:595`). | ✅ covered |

### E06 — The WINGS row

_Kinds: form, interactive-control, static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A wingless board shows no WINGS heading, Select or note at all (§7). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Partial / incomplete | The Select always holds one of two values, Narrowest to start (D-19); a board from before this phase reads Narrowest. | ✅ covered |
| Overflow / truncation | `Natural outline, before the wing` is 207.9 dots at 14/400 inside the Select's 260-dot trigger (§ Typography); the echo's two-wing form is measured in § Copywriting. | ✅ covered |
| Long text | The note under the Select is one fixed sentence at 12px wrapping to two or three lines (§1). | ✅ covered |

### E07 — The NOSE, CENTER and TAIL cards

_Kinds: form, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | Every board opens with all three sections flat; a flat section reads `Nothing is cut in this section.` (§ Copywriting, D-04). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Partial / incomplete | Picking a name fills every row from its starting numbers at once (D-08); a cut always has a complete set, and rows a cut does not use are not shown (§1's per-cut row table). | ✅ covered |
| Long text | `Continuous Belly / Rolled Mid` is 193.6 dots at 14/400 — the widest name — and fits the Select trigger; a heading's echo truncates with an ellipsis as `CHANNELS`' echo does (§ Already done). | ✅ covered |

### E08 — The Closes to a point tick box

_Kinds: form, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | Unticked on the Blended and Slight singles; ticked only by the Teardrop's starting numbers (D-06, R4). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Partial / incomplete | A single boolean on a nose single concave; absent on every other cut. | ✅ covered |
| Long text | The label `Closes to a point toward the center` is fixed and wraps like RAILS' tick rows. | ✅ covered |

### E09 — The floor warning

_Kinds: static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Overflow / truncation | One sentence at 12px in warning ink under the Depth row (`mt-2 text-xs text-surf-warning-ink`, ROCKER's too-close line), wrapping inside the panel (§7). | ✅ covered |
| Long text | The sentence's variable parts are a formatted station and the floor (`1/4"` / `6 mm`); its longest Metric form is three lines at 260 dots (§ Copywriting). | ✅ covered |

### E10 — The CHANNELS block inside TAIL

_Kinds: form, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | `None` to start (D-10): the count Select alone shows; the channel rows are hidden and their last values kept (§ Copywriting's destructive row). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Partial / incomplete | Picking a count brings that count's starting width unless the shaper has set one (D-10); a squeezed set says `(2 3/16" to fit)` on the Width label; Stagger hides for All the same. | ✅ covered |
| Long text | A browser spec reads the Width label and the Run Select at 820 and 1280 and proves the read-out wraps to a second line and Toe-in (no toe) truncates with an ellipsis, never overflows its row. | 🧪 backstop |

### E11 — The VIEWER · DATA · GUIDE tab strip and board name

_Kinds: nav_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Overflow / truncation | `VIEWER` 58.0 + `DATA` 39.2 + `GUIDE` 46.1 dots plus paddings fit one line beside the board name on a 375-dot phone, as ROCKER's four tabs do (§ Typography, 16-UI-SPEC §2). | ✅ covered |
| Long text | The board's name is the `BoardNameTab` trailing the strip, which truncates long names with an ellipsis as on every screen (§14). | ✅ covered |

### E12 — The phone's NOSE · CENTER · TAIL row

_Kinds: nav, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Overflow / truncation | Three fixed tabs `NOSE` `CENTER` `TAIL` in RAILS' inline row (`rail-band-editor.tsx:511-538`), one line on every phone the suite runs. | ✅ covered |
| Long text | Fixed words; never user text. | ✅ covered |

### E13 — The top view

_Kinds: media, interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat board draws the bare board with its stringer, wide point, front fins and fins and the cutting line — no shade, no lines, no lower-rail marks (§14). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | The planner measures the Longboard with three cuts and eight channels: SVG node count and bytes, and a drag at 60 frames on a mid-range Android (Open item 4) — proved at execution, not asserted here. | 🧪 backstop |
| Long text | Drawn names are fixed (`WIDE POINT`, `FRONT FINS`, `START`…) with formatted values; labels step aside from each other on their rail as the sketch's do (§3.1). | ✅ covered |

### E14 — The cross-section

_Kinds: media_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat station draws the slab on its straightedge with no gauge lines; `0"` is never drawn (D-13); at the nose tip the straightedge alone and `· 0" WIDE` (§14). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | One scale for every station, the wide point's section at 95% of the box, the rail-lift value under the straightedge when there is no room beside the rail, the stringer-left dimension only when there is room (D-13, §3.3). | ✅ covered |

### E15 — The Height control

_Kinds: interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Long text | Four fixed buttons `×1` `×2` `×4` `×8` at 10/700 with `aria-pressed`; `HEIGHT ×2.3` is drawn when the cut had to be fitted (§ Copywriting). | ✅ covered |

### E16 — The Section at slider

_Kinds: interactive-control_

| State | How it resolves | |
|-------|-----------------|--|
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Long text | `Section at` and its spoken value `36" from the tail` are formatted through `formatBottomStation` (§11). | ✅ covered |

### E17 — DATA

_Kinds: list-collection, static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat board's DATA: the first line reads `Foam off 0.00 L · 29.61 L now, 29.61 L before contours …`, the depths table shows `—` in every cut column, and no layout-marks table is drawn (§14). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | Every 6" from the tail plus Tail and Nose tip rows; the wide point's and front fins' rows in full ink; the layout-marks table with one column per mark (§4). | ✅ covered |
| Partial / incomplete | A station a cut does not reach shows `—` in that column; the stringer-left cell at the floor reads in warning ink with the floor note under the table (§7). | ✅ covered |
| Overflow / truncation | A browser spec scrolls the layout-marks table sideways with eight channels (Wall 1 … Wall 4) on the 390-dot phone and proves the fade and the first column stay readable. | 🧪 backstop |
| Zero / one / many | Zero cuts: one table, no marks table; one cut: its columns alone; many: the sections' edges, flats and troughs then `Wall 1` … `Wall 4` (§ Copywriting's DATA columns). | ✅ covered |
| Long text | Cells are formatted numbers (`tabular-nums`); the notes are fixed sentences at 12px wrapping under the tables. | ✅ covered |

### E18 — GUIDE

_Kinds: list-collection, media, static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | GUIDE never empties: nineteen cards always draw, on every board, each at its starting numbers; the `On this board` tag marks the three flats on a flat board (§5). | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | Nineteen cards in four groups, three across from about 1200 dots, two from 956, one below; each cartoon drawn by the viewer's own code at ×8 (§5). | ✅ covered |
| Partial / incomplete | Every card always has its name, cartoon, two sentences and note from 17-GUIDE-WORDS.md; a board with no name reads `your board` in the intro (§ Copywriting). | ✅ covered |
| Overflow / truncation | GUIDE scrolls inside the folder on a computer and inside the pinned card on a phone; the page never scrolls as a whole (D-17, §5). | ✅ covered |
| Zero / one / many | Always nineteen; the count never changes. | ✅ covered |
| Long text | A browser spec reads every card's height at 1280, 1024 and 390 and proves no text clips and every card's note is fully visible inside the scrolling folder. | 🧪 backstop |

### E19 — FINS' tail drawing with the contour

_Kinds: media_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat board's FINS drawing is byte-identical to today's — no shade, no lines (§8), so FINS' reference picture does not move. | ✅ covered |
| Loading / in-flight | Nothing loads: the page is drawn from the board already in the store, synchronously; there is no in-flight state (as every design screen — 16-UI-SPEC §9). | ✅ covered |
| Error / failure | No network or submit path, so no failure state; the maths is pure and total (foam off is clamped ≥ 0 and never under the 1/4" floor, §7), so nothing can throw on a valid board. | ✅ covered |
| Populated / happy path | The tail cut's and channels' shade, 1/16" lines and pencil lines drawn between the board's fill and the reference lines (`fin-viewer.tsx:663-685`), strokes × zoomUnit, fins on top (§8). | ✅ covered |

### E20 — The order form's BOTTOM CONTOURS page

_Kinds: static-content, media_

| State | How it resolves | |
|-------|-----------------|--|
| Empty / no data | A flat board prints no BOTTOM CONTOURS page at all: its two order-form pages are byte-identical to today's (§8, D-29). | ✅ covered |
| Loading / in-flight | Printed from the board in the store at print time; nothing loads (the order form's own rule). | ✅ covered |
| Error / failure | No failure path: the page is pure drawing and tables from a complete board; a part that cannot fit moves to a fourth page, never fails (§8). | ✅ covered |
| Populated / happy path | The four parts in order — the bottom from above, one section per cut (up to four, two across), DATA's two tables, the How to shape notes — in the order form's dress (§8). | ✅ covered |
| Overflow / truncation | The order form's existing fit cases (summary-planing.spec.ts's scrollHeight against clientHeight) run with the worst bottom on both papers and the phone sheets; if the page cannot take all four parts the tables move to a fourth page (§8). | 🧪 backstop |
| Long text | The How to shape notes print in the PLANING footnote's micro type and wrap inside the page's width; each part's head is a fixed cut name (§8). | ✅ covered |

### E21 — The Overview Sheet's bottom lines

_Kinds: static-content_

| State | How it resolves | |
|-------|-----------------|--|
| Overflow / truncation | A PDF read-back (pypdf, as Phase 7's print checks) proves the Overview Sheet's bottom lines land after Template Area and the page count is unchanged for a flat board. | 🧪 backstop |
| Long text | The same one-sentence-per-cut lines, wrapped by the PDF builder's own routine (§8). | ✅ covered |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (`Select`, `Slider`, `Checkbox`, `Button` already installed and used) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry and no new package (C5), so the vetting
gate has nothing to run on.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-08 (checker 6 of 6; the UI-consideration probe run and written back the same day)
