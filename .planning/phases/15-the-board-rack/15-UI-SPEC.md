---
phase: 15
slug: the-board-rack
status: approved
reviewed_at: 2026-10-05
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-10-05
---

# Phase 15 — UI Design Contract

> The visual and interaction contract for the Board Rack on `/`. It is a delta on the app as it is today and
> it takes three things as given, never re-asked:
>
> 1. **`15-SPEC.md`** (R1–R10, locked) and **`15-CONTEXT.md`** (D-01 to D-15, locked).
> 2. **The sketch findings** (`.claude/skills/sketch-findings-shaper/`, sketches 009, 010 and 011, all picked by
>    the founder on 2026-10-05): the drawing look, the turn, one scale on one floor line, the cursor-follow
>    rack, the swipe rack, hold-and-drag, the unsaved board staying first.
> 3. **The app's own tokens** in `app/globals.css`, in all four themes (Daylight, Chalk, Slate, Phosphor).
>
> What the sketches and the decisions did **not** fix is settled here, in plain numbers, and marked
> `(Claude's discretion — founder may overrule)` where it is a real choice. The sketch figures are start
> points the decisions already allow to be tuned on real devices; where this contract moves one by a few dots
> it says so in "Where this contract moves a sketch figure" and why. Every claim about existing code was
> read from the file on 2026-10-05. Contrast was computed from the ramp values the same day (§ Color).
> Product strings use the product's American spelling; prose here is British.
>
> **This phase adds no shadcn component, no icon, no colour token and no new package.** It adds one small
> local piece with no precedent in the app, a **status pill** (§ Copywriting, §10), built from tokens that exist.
> Everything else is the rack itself, drawn as SVG from the board's own numbers, plus extra rows in the
> existing ⋯ menu.
>
> **Plain English, for the founder:** at rest every board stands on its tail on one shared floor, side-on,
> its name and numbers running up beside it. Point at one (mouse) or swipe past the middle (finger) and it
> turns to show its outline, with its name, Open and ⋯ under it. Drag it (mouse) or hold it until it lifts
> (finger) to put it somewhere else. The unsaved board always stands first.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **No new icon.** The ⋯ trigger keeps today's `MoreVerticalIcon` (`rack-card-menu.tsx:50`). |
| Font | Inter (`--font-display` / `--font-body`). SVG text inherits it through `var(--font-sans)`, the way the callouts do (`globals.css:524-531`). |

**What the rack builds from, all of it existing:**

- **`RackCardMenu`** (`components/setup/rack-card-menu.tsx`), the Base UI `Menu` with today's shell, rows and
  `coarse:min-h-11`. It gains **two optional rows** at the top, Move left and Move right (§5); its existing rows keep
  today's words exactly (`Rename`, `Duplicate`, `Delete`). The saved-board-only trigger label `Board actions for {name}` is unchanged.
- **`RenameDialog`, `DeleteConfirmDialog`, `ReplaceBoardDialog`** exactly as they are (§13).
- **`CardMetadataLine`'s typography** (12px, 600, muted) and the card-text styles in `board-rack-card.tsx:126-166`
  for the caption (§4).
- **`lib/geometry/screen-tiles.ts`'s way of turning a side profile and an outline into label-free paths**
  (`rockerTileArt`, `outlineTileArt`) as the closest pattern for the rack's art, per CONTEXT.
- **`.focus-ring-accent`** (`globals.css:956-964`) for every focus ring on the rack.
- **`--surf-on-ink`** (`globals.css:643`, the ground colour) for the text on the status pill.

**Not used, on purpose:** `CardThumbnail` and `OutlineViewer` (the rack draws its own paths; the preset cards
keep both), a drag-and-drop library (no new package), CSS 3D, scroll-driven animation (older Safari), and any
shop-rack look (rejected in sketch 010).

---

## Spacing Scale

Declared values for this phase's surfaces. All are multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | Caption line gaps (name → card line → last touched); the status pill's inner vertical padding |
| sm | 8px | Gap between a board's name and its numbers in the vertical words; gap above Open This Board; the caption's top padding on a phone; hint-to-heading gap when the row wraps |
| md | 16px | Heading → rack gap on a phone (today's `max-shell:mt-4`); the status pill's side padding; the side gutters on a phone |
| lg | 24px | Heading → first row's tallest board on a computer (today's `mt-6`); the **drop-mark strip** under every floor line; a phone's top padding |
| xl | 32px | Rack → Shape a New Board on a phone (today's `max-shell:mb-8`) |
| 2xl | 48px | Slot width on the hover rack; rack → Shape a New Board on a computer (today's `mb-12`) |
| 3xl | 64px | A computer's top padding (today's `pt-16`) |

**Rack geometry, not spacing** (declared so the planner has the numbers; most are multiples of 4; the rest (the 40 slot, the 14/26 words column, the 118 caption block, the 220–420 clamp, the 25 pill, the 12 lift) are measured or sketch figures, not grid values, and each is a start
point the CONTEXT discretion note lets be tuned on a real device):

| Figure | Hover rack | Swipe rack |
|--------|-----------|------------|
| Slot (one board's width at rest) | **48** | **40** |
| Label gutter at the left of the floor (height-line labels) | **28** | 28, drawn over the scroller, not scrolled |
| Words column inside a slot / side-view room beside it | 16 / 32 | 14 / 26 |
| Tallest board's drawn height, `R` | **380** for one row, **288** for two or more | **leftover of the first screen, clamped 220 to 420** (§3) |
| Caption width | **272**, centred under the turned board, clamped inside the rack | the screen's width less 32 (padding 16 each side) |
| Caption band under each floor line | **116** = 24 drop-mark strip + 92 caption | caption block **118** (its CTA is 44 tall) under a 24 strip |
| Lift of a carried board | 12 | 12 |

**Interaction thresholds** (distances and times, not spacing; the sketch values, kept): drag starts after
**6** dots of mouse movement; a hold is **420 ms**, swelling from **120 ms**, and **8** dots of movement
before it completes make it a swipe; the carried board scrolls the rack within **46** dots of the screen's
edge; the nearest board finishes turning after **180 ms** of rest.

**Exceptions**

- **The swipe rack's 40-dot slot is below the app's 44-dot touch box.** The slot is a *board*, not a control.
  A finger moves the rack by swiping anywhere on it, and the board in the middle (the one that opens) is far
  wider than 40 once turned. The slot clears WCAG 2.5.8 (24 dots) and it is the width sketches 009 and 011
  were tried at on the founder's own phone. `e2e/phone-chrome.spec.ts`'s 44-dot touch-box check is for
  controls and must not be extended to rack slots. Every real control on the rack (⋯, Open This Board) takes
  `coarse:min-h-11` / `coarse:size-11`.
- **Heading → rack on a computer is 24 with a 12-dot lift inside it.** The rack's SVG draws with
  `overflow: visible` there, so the lift never clips. On a phone the scroller cannot (a scroller clips the
  other axis), so its top 16 is inside the scroller, not margin.

---

## Typography

**Four sizes and two weights (600 semibold, 400 regular) for the surfaces this phase draws. Every one is a
role the app already has; no size or weight is new.**

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| Name | 20px | 600 | 1.2 | The caption's board name (today's `board-rack-card.tsx:129`); truncates on one line |
| Small text | 12px | 600 or 400 | 1.4 | Caption card line (600, muted), last touched (400, muted), Open This Board (600, accent-ink, uppercase, `tracking-architectural`), the unsaved tag (inherited, below), the count + hint (600, muted), the vertical words on a computer (name 600 ink, numbers 400 muted), the carrying line, the status pill (600), menu rows (`text-sm`, 14, inherited from `rack-card-menu.tsx:23`) |
| Phone words | 11px | 600 / 400 | n/a (SVG text) | The vertical words on the swipe rack only (name 600 ink, numbers 400 muted) |
| Scale label | 10px | 600 | n/a (SVG text) | The height-line labels (`4′`, `5′`; Metric `150`, `200`), muted. The same size and weight as the DATASHEET's 10px labels and the sketch's labels |

**Inherited, documented and unchanged:**

| Role | Size / weight | Source |
|------|---------------|--------|
| Section heading `BOARD RACK` | 20px (16 below the 820 layout switch) / 700, uppercase, `tracking-architectural`, `leading-[1.2]`, `font-display`, `text-surf-ink` | today's classes at `board-rack.tsx:95`, kept verbatim; only the words change |
| The unsaved tag `IN PROGRESS — NOT SAVED` | 12px / 700, uppercase, `tracking-architectural`, muted | `board-rack-card.tsx:126` |
| `SHAPE A NEW BOARD` | 30px (20 on a phone) / 800 | `setup-screen.tsx:138`, untouched |

**Vertical words, exactly.** One `<text>` per board, rotated −90° so it reads **tail to nose (bottom to
top)**, beginning on the floor just left of the board: the **name** (600, `--surf-ink`), an **8-dot** gap
(`dx=8`), then the **card line** from `formatSummaryLine` (400, `--surf-ink-muted`). Never an HTML element
over the drawing (SVG text only, drawing-and-callouts rule 6). **Fit rule** (Rule 1 applies to the decision,
the measuring is the browser's): the words may run as long as `R − 8`. If a line is longer, shrink the size
in 0.5 steps down to a floor of **10px**; if it is still longer, cut the **name** with a trailing `…` and keep
the numbers whole. Never cut inside a character: count and cut by grapheme (`Intl.Segmenter`, or
`Array.from` as a fallback), the same reason today's names truncate in CSS and never by `slice`.
**A halo** (`paint-order: stroke; stroke: var(--surf-ground); stroke-width: 3px; stroke-linejoin: round`) sits
behind every word so a dashed height line never cuts through a letter. Supported on SVG text in every Safari
this app targets `(Claude's discretion — founder may overrule)`.

---

## Color

**No new hue and no new token.** The rack sits directly on `--surf-ground` (the page), the same ground the
preset cards sit on. There is no card frame, no `--surf-canvas` well and no `--surf-tab-active` window
around it: the drawing is the object (sketch 010 A).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-ground` | The page and the rack's whole field |
| Secondary (30%) | `--surf-board-fill` (a board's wash), `--surf-line-faint` (height lines), `--surf-line` (floor line), `--surf-ink-muted` (the numbers, hint, card line, labels) | Everything the rack draws that is not the accent |
| Accent (10%) | `--surf-accent-ink` | Only the uses listed below |
| Warning (informational, not destructive) | `--surf-warning-ink` | The duplicate error line and the Delete menu row, both as today. **Never the unsaved board** (SPEC prohibition) |

**Accent reserved for** (and nothing else on the rack):

1. **A carried board's edge** (1.8 stroke) and **the drop mark** under the gap (3 stroke, 28 wide), both
   `--surf-accent-ink`.
2. **Open This Board / Continue This Board**, the same text colour as today (`board-rack-card.tsx:133,164`).
3. **Focus rings**: `.focus-ring-accent` on every board's button and on the caption's controls.
4. **The ⋯ trigger's hover border and focus ring** (today's `hover:border-surf-accent-ink`,
   `focus-visible:ring-surf-accent-ink`), unchanged.

**Not accent:** the turned board (it is board fill + ink edge, like every board), the stringer, the height
lines, the status pill, the hint, the unsaved tag. A turned board is told apart by **shape**, not colour.

**Drawing colours, exactly** (all tokens; the hex values are only here so the contrast can be checked):

| Part | Token | Weight / dash |
|------|-------|---------------|
| Board fill | `--surf-board-fill` | solid |
| Board edge | `--surf-ink` | 1.1, drawn on the outline, no vector-effect scaling |
| Stringer | `--outline-station-line` | 1, dash `16 4 4 4` (`--outline-stringer-dash`), opacity = `sin(turn)` so it fades in as the board turns |
| Height lines | `--surf-line-faint` | 1, dash `5 4`, one every foot from 4′ (Metric: every 50 cm from 150 cm), as far as the tallest board or the 7′ reference |
| Floor line | `--surf-line` | 1, solid, the full width of the rack's row |
| Labels | `--surf-ink-muted` | 10px / 600, halo in `--surf-ground` |
| Carried board edge, drop mark | `--surf-accent-ink` | 1.8 / 3 |

The stringer takes `--outline-station-line` (36% muted ink), the token every other board drawing uses for its
stringer: the sketches' MANIFEST decision 4 makes reference lines identical on every page, and the sketches only
drew it in `--surf-line` because their palette had no outline tokens (orchestrator ruling, 2026-10-05). Like the
viewers' stringer it is a deliberately faint reference line, not a line a shaper must read against a 3:1 bar.

**Legibility** (computed 2026-10-05 from the ramps in `app/globals.css`; Daylight / Chalk / Slate / Phosphor):

| Pairing | Ratio | Bar |
|---------|-------|-----|
| Muted ink on ground (the vertical numbers at 11 and 12px, the card line, the hint, labels) | 6.28 / 6.28 / 7.69 / 6.32 | 4.5 text ✓ |
| Ink on ground (the vertical names, the caption name) | 14.46 / 14.46 / 16.71 / 9.71 | 4.5 ✓ |
| Accent ink on ground (Open This Board, 12px) | 6.77 / 10.57 / 5.14 / 7.00 | 4.5 ✓ |
| Warning ink on ground (duplicate error, 12px) | 6.31 / 6.31 / 8.63 / 16.75 | 4.5 ✓ |
| Status pill text (`--surf-ground` on an `--surf-ink` fill) | 14.46 / 14.46 / 16.71 / 9.71 | 4.5 ✓ |
| Board edge (ink) on the board fill | 12.30 / 11.76 / 13.81 / 7.84 | 3 graphic ✓ |
| Floor line on ground | 4.13 / 4.13 / 3.70 / 3.80 | 3 graphic ✓ |
| Stringer (`--outline-station-line`, decorative like the viewers') over the board fill | 3.51 / 3.36 / 3.06 / 3.07 | 3 graphic ✓ |
| Carried edge (accent ink) over the board fill / over ground | 5.76 / 8.60 / 4.25 / 5.65 · 6.77 / 10.57 / 5.14 / 7.00 | 3 graphic ✓ |
| Height lines on ground | 4.13 / 4.13 / **1.56** / 3.80 | decorative, see below |
| Board fill against ground | 1.17 / 1.23 / 1.21 / 1.24 | not relied on, see below |

- **Slate's height lines are 1.56:1 on purpose.** They are the faintest thing on the page (`--surf-line-faint`
  in Slate is `#333842`), exactly as faint as the dashed lines in sketch 010's Slate pictures, which the
  founder approved. Nothing depends on them: each board's own numbers carry its length, and the labels
  (7.69:1) carry the scale. In Daylight, Chalk and Phosphor `--surf-line-faint` equals `--surf-line`, so the
  dash is what tells the height lines from the floor.
- **The board fill is only ever 1.17 to 1.24 against the ground**, in every theme. The **ink edge** is what
  draws a board (12.3 to 7.8:1), the way it does on every thumbnail today.
- **A carried board is never told apart by colour alone.** In Daylight accent ink (`#48605c`) is close to ink
  (`#1f2a3b`), and in Phosphor both are greens. The lift (12 dots up), the heavier edge (1.8 against 1.1),
  and the swell on a phone say it too, and the drop mark is a shape.
- **Muted words cross dashed lines.** The ground-coloured halo (§ Typography) keeps every letter at its
  ratio above regardless of what is behind it.

---

## Copywriting Contract

**Formatters (CLAUDE.md Rule 2).** Every number on the rack reads through the app's own functions and the
shaper's system, never a component's arithmetic:

- **The card line** (vertical words, caption) is `formatSummaryLine(summary, system)` (`lib/geometry/summary-line.ts`),
  already what `CardMetadataLine` prints. Imperial `6'0" · 18 1/2" · 2 3/16" · 27.6 L`; Metric centimetres
  and litres.
- **The height lines and their labels** come from **one new pure function** in `lib/geometry/` (e.g.
  `rackHeightLines(system, tallestMm)`), converting through `units.ts`: Imperial every 304.8 mm from 4′ with
  the label `4′`, `5′`, `6′`… (the prime, U+2032); Metric every 500 mm from 1500 with the **bare number of
  centimetres**, `150`, `200`, `250`… (these are board lengths, the centimetre family, and the board's own
  numbers beside them carry `cm`, so a unit is not repeated on every line of a scale)
  `(Claude's discretion — founder may overrule)`. No component writes 12, 25.4 or 10.
- **Last touched** is today's `formatLastTouched` (`en-US`, `Oct 4, 2026`), unchanged.
- **Count** is plain: `{n} board` or `{n} boards`.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **Open This Board** on a saved board's caption; **Continue This Board** on the unsaved board's. Both as today, drawn in uppercase by CSS. |
| Empty state heading | **None.** With no boards (and nothing in progress) the whole rack section, heading included, does not exist, as today (SPEC Edge Coverage; `board-rack.tsx:50`). The preset screen is the empty state. |
| Empty state body | None. "Shape a New Board" is already the next step, directly where the rack would have been. |
| Error state | **`Couldn't save the new order — try again.`** (new, §5) when saving a move fails: the rack puts the board back where it was and says this in the status pill. The existing `Couldn't duplicate — try again.` stays (§13). Rename and Delete errors stay in their dialogs. |
| Destructive confirmation | **Delete** → today's dialog, unchanged: title `Delete "{name}"?`, body `This can't be undone.`, actions `Cancel` and `Delete Board`. Nothing else on the rack is destructive; a move is reversible and says so (the board is simply moved again). |

### The section heading and its line

| Element | Hover rack (mouse) | Swipe rack (finger) |
|---------|-------------------|---------------------|
| Heading | **Board Rack** (shown `BOARD RACK`) | same |
| Count + hint, one muted line to the right of the heading, always shown (D-08) | `15 boards · point to turn, drag to move` | `15 boards · hold to move` |
| With one board | `1 board · point to turn, drag to move` | `1 board · hold to move` |
| Swipe rack with D-11 switched on | n/a | `15 boards · tap ⋯ to move` |

The separator is a middle dot with a space either side (U+00B7). The line is 12px / 600 / muted, baseline
aligned with the heading, on the right (`justify-between`, `items-baseline`, `flex-wrap gap-x-4`) so a very
narrow screen wraps it under the heading instead of squeezing the heading. With one board, or only the unsaved
board, the hint still shows (D-08 says always, D-09 says the same rack at any count); the line is a hint about
the rack, not a promise about the next click.

### A board's words

| Element | Copy |
|---------|------|
| Vertical words (saved) | `{name}` + 8-dot gap + `{card line}` |
| Vertical words (unsaved) | `{name}` + gap + `{card line}`. The tag is **not** in the vertical words; it is in the caption. A blank name reads `Untitled Board`, as today (`board-rack-card.tsx:121`). |
| Height-line labels | Imperial `4′ 5′ 6′ …`; Metric `150 200 250 …` |

### The caption (under the turned board)

| Element | Saved board | Unsaved board |
|---------|-------------|---------------|
| Tag | none | `In progress — not saved` (uppercase by CSS) |
| Name | `{name}` | `{name}` |
| Card line | `{card line}` | `{card line}` |
| Date | `Last touched {Oct 4, 2026}` | none |
| CTA | `Open This Board` | `Continue This Board` |
| ⋯ trigger | accessible name `Board actions for {name}` (unchanged) | **none**, as today (`board-rack-card.tsx:124-136`) |
| Duplicate error | `Couldn't duplicate — try again.` (warning ink, under the CTA) | n/a |

### The ⋯ menu (`RackCardMenu`)

| Row | Hover rack | Swipe rack | Swipe rack, D-11 on |
|-----|-----------|------------|---------------------|
| `Move left` | yes | no (D-12) | yes |
| `Move right` | yes | no (D-12) | yes |
| *(a 1px `--surf-line-faint` divider, 4 above and below)* | yes | none | yes |
| `Rename` | yes | yes | yes |
| `Duplicate` | yes | yes | yes |
| `Delete` | yes, in warning ink as today | same | same |

`Move left` is **dimmed and inert** (Base UI `disabled`) on the first saved board when an unsaved board
stands before it, and on the first board when there is no unsaved board; `Move right` the same on the last
board. A disabled row keeps its place so the menu never reshuffles. Today's rows keep their exact words
(`Rename`, `Duplicate`, `Delete`, no ellipsis) — the brief keeps them "as today" (orchestrator ruling,
2026-10-05). Row text stays sentence case (`text-sm`).

### Words that appear while something happens (the status pill and the carrying line)

| When | Words | Where |
|------|-------|-------|
| After a move, by any means | `Moved {name}. The rack keeps your order.` | Status pill |
| Trying to lift the unsaved board (drag, hold, Alt + arrow), or Alt + Left on the first saved board while an unsaved board stands first | `The unsaved board stays first until it's saved` (no final stop, as the sketches have it) | Status pill |
| Alt + arrow at an end of the rack | `{name} is already first.` / `{name} is already last.` | Status pill |
| A move could not be saved | `Couldn't save the new order — try again.` | Status pill; the board returns to its place |
| While a finger is carrying a board | `Moving {name}. Let go where you want it.` — `{name}` in 600 ink, the rest 400 muted, 12px | **Replaces the caption block** under the swipe rack for as long as the board is carried |
| Duplicate worked | `Duplicated {name}. The copy stands next to it.` | Screen readers only (§10); no pill |
| Delete worked | `Deleted {name}.` | Screen readers only |
| Duplicate failed | `Couldn't duplicate — try again.` | Under the caption's CTA (§13) **and** screen readers |

### Screen readers (not drawn)

| Element | Copy |
|---------|------|
| Rack group name | `Boards in your rack` |
| Hover rack instructions (hidden text, the group's description) | `Use the left and right arrow keys to look along the rack, Enter to open the board, and Alt with an arrow key to move it one place.` |
| Swipe rack instructions | `Swipe, or use the left and right arrow keys, to look along the rack. Press Enter to open the board.` |
| One board's button | `{name}, {card line}, board {i} of {n}` |
| The unsaved board's button | `{name}, in progress and not saved, {card line}, board 1 of {n}` |
| The caption's group | `{name} actions` |

### Dialogs (unchanged, listed so nothing is rewritten)

`Rename board` (title) · `Board name` (label) · `Save` · `Board needs a name.` · `Couldn't save — check your
connection and try again.` · `Delete "{name}"?` · `This can't be undone.` · `Cancel` · `Delete Board` ·
`Couldn't delete — try again.` · the replace-board confirm (`replace-board-dialog.tsx`) for opening a board
while another is in progress. None of these changes.

---

## Already done — read this before planning

Confirmed 2026-10-05 by reading the files. Where this corrects the brief or CONTEXT, this section is the one
to trust.

- **There is no toast component in the app.** `components/`, `app/` and `lib/` hold none (the only hits for
  "toast" are unrelated preference files). The two persistent live regions that exist are the Save button's
  `aria-live="polite"` text (`save-button.tsx:113-152`) and the blank flag's `role="status"`
  (`blank-flag.tsx:93`). The status pill is a **new local component** (§10), not a shadcn one.
- **Today's menu rows read `Rename`, `Duplicate`, `Delete`** with no ellipsis (`rack-card-menu.tsx:56-66`),
  and they keep those exact words; only the two Move rows are new.
- **The card has `gap-2` (8) between every line** (`board-rack-card.tsx:79`). The caption deliberately
  tightens that to 4 between name, card line and last touched, 8 above the CTA. That tighter stack is what
  measures to about 90 on a computer and 118 on a phone with its 44-dot CTA, the "~118" the sketches measured.
- **The `coarse` variant reads the *primary* pointer** (`@media (pointer: coarse)`, `globals.css:82`). A touch
  laptop reports a mouse or trackpad as primary, so it gets the hover rack and D-05's first-tap-turns. An
  iPad reports coarse at any width, so it gets the swipe rack (D-04), and an iPad with a trackpad attached
  still does. That is accepted, not a bug.
- **`.focus-ring-accent` already exists** and already carries the forced-colours-safe `outline: 2px solid
  transparent` trick (`globals.css:956-964`). The rack uses it as is; no new focus style.
- **`--surf-on-ink` is `--surf-ground`** (`globals.css:643`), so the status pill's fill and text are two
  existing tokens.
- **The setup scroller is `min-h-0 flex-1 overflow-y-auto bg-surf-ground`** (`setup-screen.tsx:118`); the rack
  sits inside `max-w-5xl px-8 pt-16 pb-16`, and `max-shell:px-4 max-shell:pt-6 max-shell:pb-8` below 820. The
  rack's reserved box and swipe height are measured against that, not against the window.
- **The "unsaved" entry exists only while `hasBoardInProgress && modelId === null`** (`setup-screen.tsx:60`),
  and **D-07's "the board you're working on"** is that entry, or the saved board whose id is `modelId`.
- **`handleSelectModel` already has three branches** (the open board just continues; no board in progress
  applies and goes; otherwise the replace-board confirm, `setup-screen.tsx:81-97`). The rack calls it
  unchanged from a board, from Open This Board and from a second finger tap.
- **WR-05 lives in two places**: `rackModelsFromRows` on the server and `summarizeForCard`'s try/catch on the
  client (`board-rack-card.tsx:90-97`). The rack's art builder is a third place a board can fail (its
  profile or outline); it follows the same rule, below.
- **The rack's `mb-12 max-shell:mb-8` and heading classes are the contract**, kept; the grid under it is
  replaced.

---

## Interaction & Layout Contract

### What triggers what

Three switches, each answering its own question, **never conflated** (CLAUDE.md Layout). This phase gives one
of them a new job, as D-04 decided, and needs **one sentence added to CLAUDE.md's Layout section** (the
planner's):

| Switch | Question | This phase |
|--------|----------|-----------|
| **Width** (`max-shell:` below 820, `shell:` at 820 and over) | Which page layout | Padding, heading size, gaps, and how many boards fit a row on the hover rack. Never which rack. |
| **Pointer** (`coarse`, i.e. `(pointer: coarse)`) | How big a control draws — **and now which rack: a mouse hovers, a finger swipes** | Picks **hover rack** or **swipe rack**, in CSS for the reserved box and the hint, and in one `matchMedia` hook for the rack itself. Control sizes (44-dot CTA, ⋯) are as before. |
| **Height** (inline `[@media(max-height:500px)]`) | Whether a short screen scrolls and which top bar draws | D-06: on a short screen the swipe rack takes the screen and Shape a New Board is a scroll below; the page's own gutters tighten with the same values the phone chrome uses. |

No "phone" variant is invented. An iPad held either way is the swipe rack at the desktop shell's padding. A
phone held sideways is the swipe rack at the desktop shell's width with the short-screen rules.

### What draws the eye first

- **Focal point, both racks: the turned board and its caption.** Everything else stands edge-on and thin, so
  the one wide, filled outline is what the eye lands on, and the caption's accent-ink `OPEN THIS BOARD` is the
  only accent-coloured text in view.
- **Second: the tallest board.** The rack's skyline is the comparison (rockers and lengths on one floor).
- **Quietest: the height lines and labels** (faint dashes, 10px muted).
- **Every icon carries words.** The only icon is ⋯, and it keeps its `Board actions for {name}` name.

### 1. What the rack is made of (both racks)

- **One SVG draws the rack** (the hover rack: one SVG for every row; the swipe rack: one SVG inside the
  scroller), with `overflow: visible` on the hover rack. Each board is a group moved by a transform; the
  board's own paths are drawn at x = 0 in the board's own millimetres scaled by one number.
  **Not CSS 3D and not scroll-driven animation** (SPEC constraint 6).
- **Next to the SVG, one real `<button>` per board** covers that board's current drawn box (full row height
  × the board's current width), transparent, carrying the board's accessible name, the click-to-open, and the
  roving focus (§11). The SVG itself is `aria-hidden`. Buttons do not rely on default alignment (the base
  layer already neutralises older Safari's `align-items`, `globals.css:811`).
- **One scale for the whole rack:** `scale = R / max(tallest board's length, 7′0″ = 2133.6 mm)`, shared by
  every row, so a lone 5′2″ board still stands at 62/84 of the rack's height (the reference keeps a small
  quiver from being drawn huge). Worked on the 15-board sketch quiver (tallest 9′4″ = 112″): `380/112` = 3.39
  dots per inch (one row), `288/112` = 2.57 (two or more rows), 3.19 on a 390 × 664 phone, 1.96 at the
  220-dot floor.
- **At rest** a board is its side profile: rocker up to deck, deck facing right, so the tips curl right
  (`BoardSideProfile`, `rockerAt` and `deckAt`). Sampled at 64 stations, as the sketches did.
- **A board's own numbers only.** Each saved board draws from its own snapshot (its own copy of its blank,
  never the catalogue), live, never a cached picture (SPEC constraint 3).
- **Z-order, back to front:** height lines → floor line → boards (fill, edge, stringer) → vertical words (with
  halo) → the overlay (the carried board, the drop mark) → the labels (on the swipe rack, a fixed layer above
  the scrolling boards, so a board passing the left edge slides *under* its label and never through it).
- **Rack opens around a turning board.** A board's drawn x = its slot's x (eased 110 ms when the order
  changes) plus the room the rack makes around turning boards, applied straight from the turn so it never lags
  the pointer or thumb. A turning board's centre stays on its slot's centre, and its neighbours slide aside
  symmetrically by half the extra width each. The room is a pure function (§14). A carried board is left out
  of it.

### 2. The turn

- **Angle follows distance.** `θ = 90° × clamp(1 − d / D, 0, 1)`, with `d` the distance from the cursor (or
  the middle of the scroller) to the board's slot centre and `D` one slot (48 or 40). Linear, so two boards
  with the cursor exactly between them are both half-turned (45°), as the sketch says. It follows the pointer
  with **no lag**: set from the position on each frame, not tweened.
- **Rest.** On the hover rack, **180 ms after the pointer last moved** (still over the drawing), the nearest
  board glides to 90° and every other board to 0°. On the swipe rack the same happens when the scroller stops
  and snaps (scroll events debounced 120 ms; `scrollend` is not available on older Safari, so a timer).
- **0° is exactly the side profile, 90° exactly the TEMPLATE outline** (a swallow's notch included). The
  maths is `references/board-rack.md`'s, ported to `lib/geometry/` (§14). At θ ≥ ~89.5° the exact outline
  silhouette replaces the projected one.
- **Words fade out as a board turns**: opacity `cos θ` (1 at rest, 0 when fully turned), because the caption
  carries them. The stringer does the opposite, `sin θ`.
- **Hover rack: turning follows the pointer only while it is over the drawing**, from a row's top to its floor
  line. Under the floor line (the strip, the caption, the ⋯ and its menu, a dialog) the rack **freezes exactly
  as it is**, so a shaper can move down to the caption without the neighbours turning on the way, and the last
  board touched **stays turned**. Moving into another row's drawing hands the turning to that row, and the
  previous row's turned board closes (the caption stays where it was until the new board rests, then moves).
- **Swipe rack: the board nearest the middle is the one that is turned**, and the caption is always under it.
  A tap on a board at the side scrolls it to the middle (the browser's smooth scroll; reduced motion, instant).
  A tap on the middle board opens it.

### 3. Layout contract by screen (question A)

Content widths below are the container's inner width (the page's `max-w-5xl` is 1024 including its padding;
`px-8` leaves **960** at 1088 and over, and `max-shell:px-4` takes 32 off the window). **Hover rack rows:**
`perRow` is as many 48-dot slots as fit beside the gutter (28) and the room one fully turned board needs
(`outW − 48`, where `outW` is the widest board's outline at that scale, about 78 at the one-row scale and 59 at
the two-row scale for a 23-inch board); `rows = ceil(n / widest-row)` and **the rows are balanced**
(`perRow = ceil(n / rows)`, so 30 boards make 15 + 15, never 19 + 11). One row if it fits at the 380 scale,
else the 288 scale. A row block is **24 top room + R + 116 band**, so one row is 520 tall and two rows are
848. The caption shows only under the turned board's row, but **every row reserves its band**, so moving the
cursor between rows never moves the page.

| Screen | Layout / rack | Container | Rack |
|--------|---------------|-----------|------|
| **1440 × 900**, mouse | Desktop shell, hover rack | 960 inner, centred | 15 boards: **1 row**, R 380, 3.39 dots/in. 30: **2 rows of 15**, R 288. Page: 81 bar + 64 + 24 heading + 520 + 48 + 36 = 773, so Shape a New Board's heading is fully on screen. |
| **1280 × 800** | same | 960 | Same rows. 773 of 800: the heading just fits. |
| **1024 × 768** | same | 960 | Same rows. The heading peeks in at the bottom; not required to fit. |
| **820** (the layout switch, mouse) | Desktop shell (`shell:` owns 820), hover rack | 756 | One row holds 14 at R 380 (`(756−28−30)/48`), so **15 boards are 2 rows (8 + 7)**, R 288. 30 boards are 3 rows of 10. |
| **~600 wide, mouse** (narrow window) | Phone-width layout (compact bar, 16px sides, 16-dot heading), **still the hover rack** (D-04) | 568 | One row holds 10 at R 380, 11 per row at R 288. 15 boards: 2 rows (8 + 7). 30: 3 rows of 10. |
| **iPhone 14, 390 × 664** | Phone layout, **swipe rack** | scroller 390 (bleeds the 16px gutters) | R = 100dvh − 306 = **≈357**. Shape a New Board is fully on the first screen. |
| **Small Android, 360 × 640** | same | 360 | R ≈ 334. Fits the first screen. On a browser whose toolbar leaves 560, R ≈ 254. |
| **Pixel 7, 412 × 839** | same | 412 | R reaches the **420 cap**; the extra height is simply empty room, never a bigger scale. |
| **Phone held sideways, ~844 × 340 page** (D-06) | Desktop shell by width, compact top bar and tightened gutters by height (§ below), **swipe rack** | scroller 844 | R = **220** (the floor). The caption and Shape a New Board are a scroll below (§ below). |
| **iPad, 820 to 1180 wide**, upright or sideways | Desktop shell, **swipe rack** (D-04) | 756 to 1024 (+ the 32px side padding, bleeding to the container's edge) | R = 100dvh − 419, capped at 420: 1180 × 820 gives ≈ 401, 820 × 1180 gives 420. |

**The swipe rack's height formula, one named property, the rule `--setup-card-thumb-max-h` already follows
(10-REVIEW-2 WR2-02: one place decides it).** In `app/globals.css`, beside the setup properties:

| Where | `R` |
|-------|-----|
| Under the 820 switch (phone upright, narrow touch window) | `clamp(220px, 100dvh − 306px, 420px)` where 306 = 48 bar + 24 top pad + 20 heading + 16 gap + 24 drop-mark strip + 118 caption + 32 gap + 24 "Shape a New Board" |
| At 820 and over (iPad) | `clamp(220px, 100dvh − 419px, 420px)` where 419 = 81 bar + 64 + 24 + 24 + 24 strip + 118 caption + 48 + 36 |
| **Short screen** (`max-height: 500px`), any width | `clamp(220px, 100dvh − 128px, 280px)` where 128 = 48 compact bar + 8 top pad + 20 heading + 8 gap + 44 peek of the caption |

The two figures `220` and `420` and the six sums are named properties, not literals in a component, so
nothing quietly disagrees. `e2e/phone-home.spec.ts`'s standing guard pattern (it measures the real gap and
fails if the constant drifts) is the model: a rack guard measures the real stack and fails if 306 or 419 is
wrong. **The 357 on an iPhone 14 is the sketch's measured figure; the sum gives 358, and the planner's guard
asserts Shape a New Board's whole heading is above the fold, not a pixel count.** On any phone whose page is
shorter than 306 + 220 = 526 tall the floor wins and the heading falls just below the fold; that is accepted.

**Short screen (D-06).** `px-4 pt-2 pb-8` (the values the phone chrome already uses; the short-screen rule
uses them at any width, as in CLAUDE.md "never a third switch"); heading gap 8; the page scrolls; the first
screen is heading + rack (220) with the top of the caption peeking, and the middle board is tappable to open,
so nothing needs the caption to open a board. The 220 floor reuses the precedent of `--setup-card-thumb-min-h`
(a board a shaper can still read) `(Claude's discretion — founder may overrule)`. At 220 a long line of words
reaches the 10px floor and then cuts the **name**; that is the visual check in the States table.

**Reserved box before the rack mounts (first paint).** The server cannot know the pointer or the width, and
the rack measures its own width. So the section renders **the heading, the count, and an empty box of the
right height for each pointer, chosen in CSS by `coarse:`** (`h-[520px] coarse:h-(--rack-swipe-h)`), then the
rack draws in it on mount. The hint's two phrasings are both in the markup, shown by `coarse:hidden` /
`hidden coarse:inline`, so even the words are right on first paint. On a phone Shape a New Board therefore
never jumps; on a computer with more than one row the box grows once after mount, which is below the fold and
acceptable. No spinner (the Suspense fallback already shows presets alone, as today).

### 4. The caption

- **Hover rack:** 272 wide, left-aligned text, **centred under the turned board** and clamped inside the rack's
  left and right ends (the sketch's Daylight picture shows it flush left under a first board). Sits in the
  band under the turned board's row, **16 below the floor line** (the drop-mark strip is the top 24 of the
  band). On rest it **glides to the new board's x in 160 ms** and the words swap at once; during a sweep it
  stays under the last turned board until the new one rests (no flicker). The ⋯ trigger is on the name row's
  right end, 28 square. Stack: name (20 / 600 / ink, `truncate`), card line (12 / 600 / muted), last touched
  (12 / 400 / muted), `OPEN THIS BOARD` (12 / 600 / `tracking-architectural` / accent ink), gaps 4, 4, 8.
- **Swipe rack:** the **full width** under the floor, 16 padding each side, 8 on top, 118 tall. The ⋯ trigger is
  44 square at the right of the name row; the name truncates before it with 8 of air. `OPEN THIS BOARD` is a
  44-tall tap box. The same four lines, same styles. While a board is carried the whole block is replaced by
  the carrying line (§ Copywriting) and returns on the drop.
- **The unsaved board's caption:** the tag on top (12 / 700 / muted / uppercase), then name, card line, then
  `CONTINUE THIS BOARD`; no date, no ⋯.
- **Open This Board is a real button**, a sibling of the board buttons, not nested in anything (no
  interactive-in-interactive). Opening goes through `handleSelectModel` (or `goToEditor` for the unsaved
  board), exactly as today.
- **A caption always names a board.** There is always one turned board when the rack has any board (§7), so
  the caption never shows empty.

### 5. Moving boards

**What every way of moving shares.** The new order shows at once (optimistic), then saves in the background.
A burst of moves saves once. A failed save puts the board back, slides it home and says `Couldn't save the new
order — try again.` A successful move says `Moved {name}. The rack keeps your order.` The first move fixes the
order (D-03). The unsaved board has no stored place, stands first, and nothing can go before it (D-09, SPEC R9).

| Way | Who | What happens |
|-----|-----|--------------|
| **Press and drag** | Mouse or pen, hover rack | Press on a board and move **more than 6 dots**: it **lifts 12 dots, edge-on (side profile, whatever it was), edge `--surf-accent-ink` at 1.8**, and follows the pointer exactly (`setPointerCapture`; cursor `grabbing`). **Every board closes** to its side profile and the rack stands at slot spacing, so gaps are predictable. The others **slide 110 ms** to open a one-slot gap; **an accent drop mark** (3 stroke, 28 wide) sits **just under the floor, centred on the gap**. Release drops the board into the gap: it descends 12 in 120 ms, its edge returns to ink, and it **turns** like any resting board with its caption under it. A click without a drag (under 6 dots) opens. The row the board drops into is the one whose drawing or band the pointer is nearest, so it can be carried into another row; outside the rack it clamps to the nearest place. **Escape** cancels, back to where it was, with no pill. **Pointer cancel** (leaves the window, the system takes it) cancels the same way. Dropping where it started does nothing and says nothing. |
| **Keyboard** | Any keyboard, either rack | Focus a board (arrows). **Alt + ← / Alt + →** moves it one place. Focus stays on that board's button after it moves, and the pill says `Moved {name}…`. The key's default is cancelled so a browser's Alt + ← (Back, on Windows and Linux) never fires. Not advertised on the swipe rack, works for an iPad with a keyboard `(Claude's discretion — founder may overrule)`. |
| **⋯ → Move left / Move right** | Hover rack only (D-12) | The same one-place move, from the caption's menu of the turned board. The board stays turned and the menu closes. |
| **Hold, then slide** (011 A) | Finger, swipe rack | See below. |

**Hold and slide, the swipe rack (011 A).**

1. Finger down on a board. A **420 ms** timer starts. The finger moving more than **8 dots** before it ends
   means swipe: the timer is dropped and the scroller moves as normal.
2. From **120 ms** the board **swells** (scale 1 to 1.06 about its foot, eased across the remaining 300 ms).
   Nothing else changes, so it reads as "something is about to happen".
3. At **420 ms** it **lifts 12 dots and its edge turns accent ink at 1.8**; page scrolling for that touch
   stops from that moment on (touch-move is cancelled), and the scroller's scroll-snap is switched off so the
   edge scrolling is not fought. The caption block becomes the carrying line.
4. The board follows the finger's x exactly. The others slide 110 ms to open a gap; the drop mark draws under
   the gap. Within **46 dots** of the screen's left or right edge the scroller **scrolls with the carried
   board**, ramping from zero at the edge of the zone to about 12 dots a frame at the screen's edge, so one
   carry can cross a 30-board rack.
5. Finger up drops it. Snap is restored, **the dropped board comes to the middle and turns**, the caption
   returns, and the pill says `Moved {name}. The rack keeps your order.` A hold that never moved is a drop in
   place: no pill. A system touch cancel returns it to where it was.
6. The rack switches off the long-press menu, text selection and the callout (`-webkit-touch-callout: none`,
   `user-select: none`). `touch-action: pan-x pan-y` on the scroller; the carried board takes over only after
   the lift.

**The unsaved board** (D-09 and sketches 010 and 011): it is never lifted. Trying to drag it (6 dots), hold it
(420 ms), or Alt + arrow it **does not move it** and shows `The unsaved board stays first until it's saved`.
A board dropped, or carried, to the left of it **lands at the first place behind it**, and the drop mark draws
there; nothing is said, because the mark already shows where it lands. Its ⋯ does not exist.

**Touch on the hover rack (D-05).** A finger is for **turn and open only** there: first tap on a board turns
it and shows its caption (the board nearest the tap), a **second tap on the turned board**, or Open This
Board, opens it; a tap on another board turns that one instead. `touch-action: pan-y` on the rack, so a finger
starting on it still scrolls the page, and a touch **never drags a board**; a touch-laptop shaper moves boards
with ⋯ → Move left / Move right or the keyboard. A mouse click opens straight away.

### 6. The hover rack's pointer rules, in one place

- Turning follows the pointer only over the drawing (§2). It follows **horizontal distance within the row the
  pointer is in**; a pointer between two rows' drawings is nearest the row whose floor is above it.
- A mouse click opens the board under the pointer (the board whose drawn box holds the pointer x; between
  two, the nearer centre).
- While a ⋯ menu or a dialog is open the rack is frozen and inert (the menu's portal and the dialogs are
  outside the SVG).
- Hovering gives `cursor: pointer` on boards (they open on a click) and `grabbing` while carrying. It does not
  show a grab cursor at rest; the hint line says "drag to move".

### 7. First look, and the board you're working on (D-07)

- **On arrival** the turned board is **the board open in the editor** (`modelId`'s board, or the unsaved
  board when `modelId` is null and a board is in progress); with nothing open, **the first board** in the
  rack. If `modelId` names a board that is not in the rack (deleted, or dropped by WR-05), the first board.
- **It arrives already turned**: θ = 90° with no animation, no sweep-in, and its caption under it. On the
  **swipe rack** the scroller is positioned so that board is in the middle **before it first paints** (an
  instant `scrollTo`, never a smooth scroll the shaper sees), and the rest are at their resting angles.
- **That board also carries `aria-current="true"`** on its button, so a screen reader hears which board is
  the one open.
- **After that the pointer owns it.** Nothing moves it back.

### 8. D-11, the prepared fallback

One constant (e.g. `PHONE_MOVE_VIA_MENU`) and nothing else switches it, so it is a small switch, not a
rebuild. **On:** hold-and-slide is disabled (the 420 ms timer never starts and the board never swells); the
swipe rack's ⋯ gains `Move left` and `Move right` above a divider, as the hover rack's has (§ Copywriting);
the swipe hint reads `{n} boards · tap ⋯ to move`; everything else, including tap-to-centre and the turn, is
unchanged. **Off** (the default): D-12's menu (Rename, Duplicate, Delete).

### 9. States (question B)

| State | What the shaper sees | Rule |
|-------|----------------------|------|
| **No boards, or signed out, or the list failed to load, or the query is slow** | Nothing: no heading, no rack, no hint. Presets only, where the rack was. | `board-rack.tsx:50`; the Suspense fallback is `SetupScreen models={[]}` (`app/page.tsx`); no spinner |
| **One saved board** | One slot, turned, caption under it. Heading `1 board · …`. Both Move rows are dimmed (it is first and last). | D-09: the same rack at any count |
| **Unsaved board only** | One slot, turned, unsaved caption (tag, name, card line, Continue This Board), no ⋯. Hint still shows. | D-08, D-09 |
| **2 boards** | Two slots, one turned. Move left/right enabled toward the other. | |
| **15 boards** | Hover: 1 row at 1280 and 1440, 2 rows (8 + 7) at 820 and below. Swipe: one track, about 5 boards visible at the start and 9 across mid-rack on an iPhone 14. | §3 |
| **30 boards, 100 boards** | Hover: balanced rows (15 + 15 at 960; 10 × 3 at 756 and 568), each reserving its band. Swipe: one longer track, the same height. | §3 |
| **A long name** | Words shrink to 10px, then the name is cut with `…` and the numbers stay whole; the caption name truncates on one line; the accessible name is the full name. | § Typography |
| **Metric** | Card line in centimetres and litres; height lines every 50 cm from 150, bare numbers. Nothing else differs. | Rule 2 |
| **Light themes** (Daylight, Chalk) | Ink edge on a pale wash on white; Daylight's floor reads khaki, Chalk's too (shared `--surf-line`); the stringer is the viewers' faint line. | § Color |
| **Dark themes** (Slate, Phosphor) | Ink edge on a dark wash; Slate's height lines nearly vanish (1.56:1, by design); in Phosphor every ink is a green, so the carried board's lift and weight carry it. | § Color |
| **Resting** | One board turned (θ 90°), the rest side-on (θ 0°), words at full strength, the caption under the turned one. | |
| **Mid-sweep** (hover) | Boards near the pointer part-turned by distance; the rack open around them; the caption stays under the last turned board; no fade. | §2 |
| **Mid-swipe** (swipe) | Every board turning as it nears the middle, following the thumb; the caption stays under the board that was in the middle, then moves when the rack settles. | §2 |
| **Dragging / held** | Lifted 12, edge accent ink 1.8, edge-on; all others closed; hover rack's caption band is **empty**; swipe rack shows the carrying line. | §5 |
| **Drop gap** | One slot wide at the landing place; the accent drop mark under the floor, centred on it; never at the unsaved board's place. | §5 |
| **After the drop** | The board descends 12, turns, caption under it; the pill says `Moved …`. | §5 |
| **⋯ menu open** | Rack frozen and inert; menu as today with the Move rows on the hover rack. | §6 |
| **Rename dialog** | Today's dialog. On save the vertical words, the caption and the screen-reader name re-fit to the new name at once (the words re-run their fit). | §13 |
| **Duplicate…** | No dialog. A copy appears right after its original (D-02); the original stays turned; the new board does not take the turn. `Duplicated {name}. The copy stands next to it.` is spoken. | D-02 |
| **Duplicate error** | `Couldn't duplicate — try again.` in warning ink under that board's `OPEN THIS BOARD`, whenever that board is the turned one, until it is tried again or the page reloads. Choosing Duplicate again is the retry. | §13 |
| **Delete dialog** | Today's dialog. After a delete the board leaves; if it was the turned one the turned board becomes the next in order (the previous if it was last), and focus lands on that board's button. `Deleted {name}.` is spoken. | §13 |
| **A save failed** | The board slides back; `Couldn't save the new order — try again.` | §5 |
| **Keyboard focus** | `.focus-ring-accent` (a 3-dot accent-ink ring) on the focused board's whole button (a tall, thin box the board's width), turning it. | §11 |
| **Reduced motion** | Only two angles ever draw: 0° and 90°. The board nearest a *resting* pointer or middle turns; sweeping and swiping change nothing until they rest. Slots jump, the carried board follows exactly, drops land without descent, no swell, the caption moves without a glide, smooth scroll is instant. | §12 |
| **D-05, a finger on the hover rack** | First tap turns that board and shows its caption; second tap on it, or Open This Board, opens. A touch never drags. | §5 |
| **D-07, arriving** | The editor's board, already turned, centred on the swipe rack; else the first board. | §7 |
| **D-11 on** | No hold, no swell; ⋯ gains Move left / Move right; hint `tap ⋯ to move`. | §8 |
| **A board that can't be worked out** | Not drawn, not counted, not a gap. Logged with `console.error`, the wording of `board-rack-card.tsx:94`. Three places can drop it (server, card summary, the rack's art builder). | WR-05 |
| **Stored order names a board that is gone / misses a board** | The gone id is skipped; a board missing from the list stands first, right behind the unsaved board (D-01, D-03). | D-03 |
| **The window is resized or the pointer type changes** | Rows re-balance; the turned board stays turned; the rack swaps between hover and swipe without losing which board is turned. | §1 |
| **Another device moved the order** | Shown on the next load, not live. The last write wins, never a corrupt list. | CONTEXT discretion |
| **Forced colours** | The focus ring uses `.focus-ring-accent`'s transparent outline; edges and lines take the system's text colour. A visual check, not a rule. | `globals.css:956` |

### 10. The status pill (the one new surface)

- **What:** a small rounded pill, `--surf-ink` fill, `--surf-on-ink` text, 12px / 600, `px-4 py-1` (16 across,
  4 down, so about 25 tall), `max-w-[calc(100vw-32px)]`, wraps to two lines at most; no icon, no close
  button, never takes focus.
- **Where:** fixed to the viewport's bottom centre, 24 above the bottom edge (plus
  `env(safe-area-inset-bottom)` on a phone), above the page. A phone's pill can overlap Shape a New Board's
  heading for a moment; that is what the sketch shows (011's dropped-board picture).
- **How long:** appears in 120 ms (fade), holds **4 s**, fades out in 200 ms. A new message replaces the old
  one and restarts the 4 s. Reduced motion: no fade, appear and vanish.
- **It is itself the live region**: one `role="status"` element (`aria-live="polite"`, `aria-atomic`),
  **always in the DOM**, empty and `visibility: hidden` when idle, so a screen reader hears each change. It is
  also where the screen-reader-only messages (`Duplicated…`, `Deleted…`) are spoken, with the visible pill
  suppressed for those.
- **One local component, `RackStatus`**, owned by `board-rack.tsx`; nothing shared and no package. Same
  `aria-live="polite"` convention as `save-button.tsx`.

### 11. Accessibility contract (question C)

**Structure.** The section is `<section aria-labelledby=…>` with the heading's id. The rack is
`role="group"` named `Boards in your rack`, described by the hidden instructions (§ Copywriting). Each board is
a real `<button type="button">` with the accessible name in § Copywriting (`{name}, {card line}, board {i} of
{n}`). The caption is a `role="group"` named `{name} actions`, after the rack in the page order, containing
`Open This Board` and the ⋯ trigger (already named `Board actions for {name}`). The SVG and every label in it
are `aria-hidden="true"` and `focusable="false"` (older Safari).

**Keyboard map.**

| Key | Does |
|-----|------|
| **Tab** | Into the rack (one stop: the turned board's button, or the board last focused), then on to the caption's controls, then Shape a New Board. **Roving tabindex**: one board has `tabindex=0`, the rest `-1`. |
| **← / →** | Previous / next board in the rack's order (across row ends on the hover rack: the end of one row continues at the start of the next). Focus moves **and that board turns** at once (a 200 ms glide, no 180 ms wait), the caption follows. On the swipe rack the scroller also moves it to the middle. |
| **Home / End** | First / last board. |
| **↑ / ↓** | On the hover rack with more than one row: the board nearest in the row above / below. Otherwise nothing. |
| **Enter or Space** | Opens the focused board (the same `handleSelectModel`, including the replace-board check). |
| **Alt + ← / Alt + →** | Moves the focused board one place (§5). Cancelled default. Works on both racks; advertised on the hover rack. |
| **Escape** | During a pointer drag, cancels it. Closes a menu or dialog as today. |
| **Menu keys** | As today (Base UI's Menu): Enter or Space opens ⋯, arrows walk the rows, Escape closes. |

**Focus.** `.focus-ring-accent` on every board's button and on the caption's controls. The ring sits on the
whole board button, a full-height box one board wide (or, on the turned board, its outline's width). After a
keyboard move focus stays on that board's button (matched by id across the re-render). After a delete, focus
goes to the new turned board's button. After Rename, Delete, or the replace-board confirm closes, Base UI
returns focus to the trigger; a deleted board's trigger is gone, so the rule above applies.

**Announcements.** The status region (§10) carries `Moved…`, `…is already first/last`, `The unsaved board
stays first…`, `Couldn't save the new order…`, `Duplicated…`, `Deleted…` and `Couldn't duplicate…`. The turn
itself is not announced (the board button's name already says everything the turn shows).

**Touch screen readers (D-12, accepted by the founder).** On a phone or iPad a VoiceOver or TalkBack user can
reach every board (focus scrolls it to the middle and turns it), open it, and use Rename, Duplicate and
Delete. They **cannot move a board** (no Move rows on the swipe rack). An iPad with a keyboard can, with Alt +
arrow. D-11 gives the menu rows back for everyone if it is switched on.

**Contrast** is in § Color: every text pairing clears 4.5:1 in all four themes (the smallest is accent ink on
Slate at 5.14, and muted ink on Daylight at 6.28 for the 11px words); every drawn line the shaper needs clears
3:1; the one deliberate exception, Slate's height lines, is decorative and listed there.

**Targets.** Real controls are 44 on a coarse pointer (§ Spacing). The swipe rack's 40-dot board slots are the
documented exception.

**Reading the numbers.** Quote marks in `6'0"` are read by some screen readers as "inches" and by some as
"quote". The card line is the app's own text, kept as is so the rack and the card never disagree; this is a
backstop to hear once in VoiceOver, not a rule.

### 12. Motion contract (question E)

| What | Duration | Easing | Notes |
|------|----------|--------|-------|
| Turn following the pointer or thumb | none, direct | n/a | θ from the position each frame; never tweened, so it never lags |
| Settle (a board finishes turning, others close) | **200 ms** | ease-out, `cubic-bezier(0.22, 0.8, 0.3, 1)` | after 180 ms of rest (hover) or a 120 ms scroll stop (swipe); immediate on a keyboard focus move |
| Slots after the order changes | **110 ms** | ease | the sketch figure |
| Caption glide to the new board (hover) | **160 ms** | ease-out | the words swap at once |
| Hold swell (swipe) | from 120 ms to 420 ms | ease-in-out | scale 1 to 1.06 about the foot |
| Lift (carry begins) | **100 ms** | ease-out | 12 dots up, edge to accent ink |
| Drop | **120 ms** | ease-out | 12 dots down, edge back to ink, then a settle |
| Tap to the middle (swipe) | the browser's own smooth scroll | native | instant under reduced motion |
| Status pill | in 120 ms, out 200 ms | linear | |
| Auto-scroll while carrying | 0 at the zone's inner edge to about 12 dots a frame at the screen's edge | linear ramp | |

**Reduced motion** (`prefers-reduced-motion: reduce`): **a board is either its side profile or its outline,
never between.** The turned board is the one nearest a pointer or middle that has *rested*; sweeping or
swiping does not turn boards in passing. Settle, slots, caption glide, swell, lift and drop are instant. A
carried board still follows the finger or pointer exactly (that is direct manipulation, not an animation), and
the drop mark still draws. The pill appears and vanishes. This is SPEC constraint 8.

### 13. What stays exactly as it is (question F)

- **The dialogs and their lifted state.** `board-rack.tsx` keeps one `RenameDialog`, one `DeleteConfirmDialog`
  and the `renamingModel` / `deletingModel` / `duplicateErrors` state. `handleRenameConfirm` keeps syncing the
  design store's `boardName` when the renamed board is the one open; `handleDeleteConfirm` keeps clearing
  `modelId` when the deleted board is the open one (`board-rack.tsx:61-77`). The rack must not skip either.
- **The duplicate error is per board and sits under the caption's CTA**, in warning ink, outside the board
  button (today's `board-rack-card.tsx:176-180` reasoning: a click there must never open the board). It shows
  while that board is the turned one.
- **WR-05.** A board whose side profile or outline cannot be built is dropped (not drawn, not counted), the
  rack's art builder wrapped as `summarizeForCard` is, and logged the same way.
- **Opening a board** is `handleSelectModel` unchanged: the open board just continues; nothing in progress
  applies and goes; otherwise the replace-board confirm. The unsaved board's click is `goToEditor`.
- **Today's truncation and naming**: CSS truncation for the caption name, `Untitled Board` for a blank name,
  `formatLastTouched`, `useUnits()` for the system, boards drawn from their own snapshot, the unsaved entry
  only while `hasBoardInProgress && modelId === null`.
- **The Suspense fallback** (presets alone, no spinner) and **signed-out behaviour** (no rack).
- **The preset grid, `SHAPE A NEW BOARD`, `card-thumbnail.tsx` and `OutlineViewer`** are untouched.
- **The wording of the ⋯ trigger's accessible name** and the menu's shell, row height and `coarse:min-h-11`.

Specs that walk the home page and will need updating (from CONTEXT): `e2e/phone-home.spec.ts`,
`e2e/phone-setup-landscape.spec.ts`, `e2e/phone-trip.spec.ts`, `e2e/error-pages.spec.ts`, and the local desktop
baselines under `e2e/*-snapshots/` that show the home page.

### 14. The pure functions this contract implies (Rule 1; the planner writes the tests)

Each lives in `lib/geometry/` (or `lib/models/` for order), with no React, browser or database import, and
expected values from the app's own functions or generated fixtures, never typed in.

| Function | Decides |
|----------|---------|
| Projected silhouette at an angle | The path of a board at θ, 0° exactly the side profile and 90° exactly the TEMPLATE outline (a swallow's notch) |
| Stringer at an angle | Where the stringer line sits and its `sin θ` opacity |
| Half-extent at an angle | A board's drawn half-width, for the words' placement and the room |
| Rack room | How far each neighbour slides for the boards turned at the given angles |
| Rack scale | `R / max(tallest, 7′0″)` |
| Rack rows | `rows`, balanced `perRow`, and which scale (380 or 288) for `n`, width and widest outline |
| Height lines | Positions and labels in either system |
| Turn angles | θ per board from a pointer or middle position |
| Drop index | The landing place from a pointer position, clamped behind the unsaved board |
| Stored-order operations | Apply a stored order to a list; first move; insert new at the front (D-01); insert a duplicate after its original (D-02); skip a gone id; place a missing id first |

Text measuring (fitting the vertical words) is the browser's; the *rule* it applies (shrink in 0.5 steps to
10, then cut the name) is a pure function of the measured widths.

---

## Where this contract moves a sketch figure

All of them are start points CONTEXT already lets be tuned. Each moves by a few dots, to land on the 4-dot
grid or to match what the app's own text really measures.

| Figure | Sketch | This contract | Why |
|--------|--------|---------------|-----|
| Label gutter | 26 | **28** | A multiple of 4, and it holds a three-digit Metric label (`150`) at 10px with 8 to spare |
| Two-row rack height | 290 | **288** | A multiple of 4 (2.57 dots per inch against 2.59) |
| Caption width | 270 | **272** | A multiple of 4 |
| Caption band | 96 | **116** | The app's caption stack (name 24, three 12px lines, gaps 4 / 4 / 8) is 90, plus the 24 drop-mark strip. 96 only held the text above the strip |
| Gap in the words | 7 | **8** | On the scale |
| Numbers' weight | 500 | **400** | Keeps two weights (600 and 400); at 11 and 12px the difference is not visible |
| Stringer colour | `--surf-line` | `--outline-station-line` | Matches every other board drawing (MANIFEST decision 4); orchestrator ruling |
| Heading → rack on a phone | 16 | 16 (**kept**), but it is the scroller's own top padding | So the lift is never clipped |

---

## Open items for the planner

None blocks the plan. Each is a place this contract made a call, or needs a check the code can answer.

1. **A duplicate under the still-automatic order (D-02 against D-03).** Before the first move the rack is
   "unsaved first, then most recently touched", and a fresh duplicate is the most recently touched, so it
   would sort first, not "right after its original". Recommend treating **the first Duplicate as the moment
   the order is fixed** (it is a placing by the shaper, like a move): the copy is inserted after its original
   in the then-current automatic order and that order is stored. **Resolved by the founder, 2026-10-05:**
   "Next to its original" — the copy lands right after its original and duplicating fixes the order from
   then on, as a move does (CONTEXT D-16).
2. **The pointer hook and first paint.** The reserved box and the hint are CSS (`coarse:`), the rack mounts
   after hydration from a `matchMedia('(pointer: coarse)')` hook with a server snapshot of "hover". Check
   there is no visible swap on a real iPhone (the box height is right from the first paint, so none is
   expected).
3. **`Alt + ←` on Windows and Linux Chrome is Back.** `keydown` with `preventDefault` is expected to stop
   it while a board has focus; prove it once in a real Chrome and Firefox, not only Playwright.
4. **Screen-reader name from the card line.** Hear the quote marks once in VoiceOver. Leave as is if
   tolerable; a spoken variant is a later pass.
5. **One-board and unsaved-only hint.** D-08 and D-09 keep `point to turn, drag to move` even when nothing
   can be dragged. Accepted as the decisions read; revisit only if the founder objects at the rehearsal.
6. **The stringer's token.** *Resolved 2026-10-05:* `--outline-station-line`, as on every viewer (MANIFEST
   decision 4).
7. **Metric labels are bare numbers.** `150`, `200`… with `cm` carried by every board's own numbers. If it
   reads oddly beside `4′` in a screenshot, the top label alone can carry ` cm`.
8. **Words at the 220 floor** (a sideways phone). A 20-character name plus its numbers is about 260 at 11px,
   so the name is cut. Look once at a real sideways iPhone and Pixel before the founder's walk.
9. **The Move rows' `disabled` rows in a Base UI Menu** keep their place and are skipped by arrow keys; check
   that on the installed Base UI version.
10. **CLAUDE.md** needs the one sentence about the pointer's new job (D-04), written with the code.

---

## UI Considerations

**42 considerations across 11 surfaces — 42 resolved, 0 open** (39 answered explicitly by this contract, 3 held out as a real-device check).

Produced by `gsd-core/bin/lib/ui-consideration-probe.cjs` from the eleven surfaces below (E01–E11), with element kinds
authored deliberately rather than inferred from prose (recorded under each heading). These are state-coverage questions for
the people who build the rack, so, following the workflow's `--auto` convention as the Phase 9, 11, 12 and 14 contracts did,
the orchestrator confirmed the kinds and resolved every row itself instead of putting 42 question cards to the founder. Each
row is either **✅ covered** (this contract answers it outright — lifted as a truth) or **🧪 backstop** (it has to be seen on a
real device — lifted as `{ statement, verification: backstop }`). **Nothing was dismissed** and nothing is left ⚠ unresolved;
every row is a real answer the founder can revisit and overrule. Empty- and error-state COPY is not restated here: the rows
point at the Copywriting Contract and §5, §9 and §10.

### E01 — Section heading line

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The count and hint sit on one muted 12px line to the right of the heading (`flex-wrap gap-x-4`, baseline aligned); on a very narrow screen the line wraps under the heading rather than squeezing it. Nothing is clipped. | ✅ covered |
| **Long text** | The line is fixed text plus a number: `{n} boards · point to turn, drag to move`, `· hold to move`, or `· tap ⋯ to move` (D-11). One board reads `1 board · …`. The longest is the hover hint, which wraps under the heading below about 420 dots. | ✅ covered |

### E02 — Hover rack

_Kinds: list-collection, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | No boards, signed out, a failed or slow list: no heading, no rack, no hint; the presets stand where the rack was (today's `board-rack.tsx:50` rule and the Suspense fallback). There is no empty-rack design. | ✅ covered |
| **Loading / in-flight** | The server renders the heading, the count and a reserved box of the right height per pointer (E11); the rack draws into it on mount from data already on the page. No spinner and no network wait after first paint; turning is pure drawing (no requests). | ✅ covered |
| **Error / failure** | A board whose numbers or art can't be worked out is dropped (not drawn, not counted, no gap) and logged, at any of three points (server, card summary, art builder) — WR-05. A failed order save slides the board back and says `Couldn't save the new order — try again.` | ✅ covered |
| **Populated** | Boards stand at one scale on one floor line in balanced rows (one row of 15 at 1280–1440; 8+7 at 820 and below; 15+15 at 960 for 30); the cursor turns boards as it passes and the rack opens around the turning board; one board is always turned with its caption under it (§2, §3, §4). | ✅ covered |
| **Partial / incomplete** | Only the unsaved board: one slot, turned, the unsaved caption (tag, name, card line, Continue This Board, no ⋯), hint still shown. A stored order missing a board puts it first behind the unsaved board; an id with no board is skipped (D-01, D-03). | ✅ covered |
| **Overflow / truncation** | Never scrolls sideways: a row holds as many boards as fit beside the reserve for the widest turned outline, and further boards wrap into balanced rows, each with its caption band. Rows re-balance on resize; the turned board stays turned. | ✅ covered |
| **Zero / one / many** | 0: no rack (E02 empty). 1: one slot turned, both Move rows dimmed. 2: one turned, Move enabled toward the other. 15 / 30 / 100: balanced rows at one shared scale (290→288 two-row height) — the same rack at any count (D-09). | ✅ covered |
| **Long text** | Names and numbers are E04's fit rule (shrink to 10px, then cut the name only, by grapheme); the caption name truncates on one line; screen readers get the full name. | ✅ covered |

### E03 — Swipe rack

_Kinds: list-collection, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | As E02 empty: no rack at all with no boards; presets only. | ✅ covered |
| **Loading / in-flight** | As E02 loading, plus on arrival the scroller is placed with an instant `scrollTo` so the board being worked on is in the middle before first paint (D-07); never a visible smooth scroll. | ✅ covered |
| **Error / failure** | As E02 error (WR-05 drops, the failed-save message). A system touch cancel during a carry returns the board to where it was. | ✅ covered |
| **Populated** | One edge-to-edge track snapping a board to the middle; every board turns as it passes the middle following the thumb; it settles with one board turned and its caption under it; Shape a New Board stays on the first screen of an iPhone 14 page (R ≈ 357, `clamp(220, 100dvh − 306, 420)`). | ✅ covered |
| **Partial / incomplete** | As E02 partial: the unsaved board alone sits in the middle, turned, with its unsaved caption; the hint still shows. | ✅ covered |
| **Overflow / truncation** | The track scrolls sideways inside its own scroller (it bleeds past the 16px gutters on purpose); the page itself never scrolls sideways. A phone held sideways gives the rack the short screen (`clamp(220, 100dvh − 128, 280)`), Shape a New Board a scroll below (D-06). | ✅ covered |
| **Zero / one / many** | 0: no rack. 1: one board centred and turned. Many: one longer track at the same height; about 5 boards show at the start and 9 across mid-rack on an iPhone 14; 30 or 100 boards only lengthen the swipe. | ✅ covered |
| **Long text** | As E02 long-text, at 11px with the same 10px floor and grapheme-safe cut. | ✅ covered |

### E04 — A board's vertical words

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The words may run as long as the rack height minus 8; longer lines shrink in 0.5 steps to 10px, then the name is cut with `…` and the numbers stay whole. A ground-coloured halo keeps dashed height lines from cutting letters. | ✅ covered |
| **Long text** | Long names (20+ characters) at the sideways-phone floor (R 220) are cut; check on a real sideways phone that the cut name still reads, and in VoiceOver that the full name is announced. | 🧪 backstop |

### E05 — The caption under the turned board

_Kinds: static-content, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | The caption never waits: it shows the turned board's own data already on the page; it glides to a newly turned board in 160 ms (hover) and swaps words at once, staying under the last turned board during a sweep (no flicker). | ✅ covered |
| **Error / failure** | The duplicate error `Couldn't duplicate — try again.` shows in warning ink under that board's Open This Board while it is the turned board, until retried or reloaded (today's behaviour, moved into the caption). | ✅ covered |
| **Overflow / truncation** | Hover caption is 272 wide, centred under the turned board and clamped inside the rack's ends; swipe caption is full width, 118 tall. The name truncates on one line before the ⋯ trigger with 8 of air. | ✅ covered |
| **Long text** | Name truncates (CSS, never a code slice); card line and date are fixed-format and fit 272; the CTA is a fixed string. Screen readers get the full name. | ✅ covered |

### E06 — The board actions menu

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | Menu actions start at once: Move is optimistic (the board moves, the save runs behind); Rename and Delete open today's dialogs; Duplicate inserts the copy right after its original when the action returns (D-02, D-16). | ✅ covered |
| **Error / failure** | Move left is dimmed and inert on the first saved board (or the first board), Move right on the last; a disabled row keeps its place. A failed move save slides the board back with the failed-save message; a failed duplicate shows the duplicate error. | ✅ covered |
| **Long text** | Rows are fixed words: Move left, Move right (hover rack only, D-12), a divider, Rename, Duplicate, Delete (today's exact words). The trigger's accessible name `Board actions for {name}` carries the full name. | ✅ covered |

### E07 — Moving a board on a computer

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | The new order shows at once and saves in the background; a burst of moves saves once (actions run one at a time, in order). | ✅ covered |
| **Error / failure** | A failed save slides the board back and says `Couldn't save the new order — try again.` Escape or a pointer cancel puts a carried board back with no message; dropping where it started does nothing. The unsaved board can't be lifted and says `The unsaved board stays first until it's saved`. | ✅ covered |
| **Long text** | Messages are fixed strings with the board's name: `Moved {name}. The rack keeps your order.`; the pill wraps to two lines at most within the viewport less 32. | ✅ covered |

### E08 — Moving a board on a touch screen

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | Hold 420 ms (swell from 120 ms), then lift; the order shows at once on the drop and saves in the background, as E07. | ✅ covered |
| **Error / failure** | Hold-and-drag must be proven on the founder's iPad (Safari before 18.4) and an Android phone: the lift must not start a page scroll, and a system cancel must return the board. If it is not reliable by Wednesday, D-11's switch turns on (⋯ → Move left / Move right on touch). | 🧪 backstop |
| **Long text** | While a board is carried the swipe caption is replaced by the carrying line `Moving {name}. Let go where you want it.`, which returns to the caption on the drop. | ✅ covered |

### E09 — The status pill and live region

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The pill is fixed bottom-centre 24 above the edge (plus the safe-area inset) and may briefly overlap Shape a New Board's heading on a phone, as sketch 011 showed; check it reads on an iPhone and does not cover the swipe caption's Open This Board. | 🧪 backstop |
| **Long text** | Messages are short fixed strings with one board name; the pill is `max-w-[calc(100vw-32px)]` and wraps to two lines at most; it never takes focus and is the one `role=status` live region (always in the DOM). | ✅ covered |

### E10 — Rename and Delete dialogs, duplicate error

_Kinds: form_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Rename keeps today's dialog and validation (an empty name is refused as today); nothing about the dialogs changes. | ✅ covered |
| **Loading / in-flight** | Today's dialogs keep their pending states; after a rename the vertical words, caption and accessible name re-fit at once. | ✅ covered |
| **Error / failure** | Today's dialog error handling is unchanged; the duplicate error is E05's caption line. | ✅ covered |
| **Partial / incomplete** | After a delete the board leaves; if it was turned, the next board in order (the previous if it was last) turns and takes focus; `Deleted {name}.` is spoken (not shown). | ✅ covered |
| **Long text** | Today's dialogs show the board's name as they do now (`Delete "{name}"?`); unchanged. | ✅ covered |

### E11 — The reserved first-paint box

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The box is exactly the rack's first-paint height per pointer, set in CSS (`h-[520px] coarse:h-(--rack-swipe-h)`), so a phone never jumps; on a computer with more than one row it grows once after mount, below the fold. | ✅ covered |
| **Long text** | The box holds no text; the heading and both hint phrasings are in the markup, shown by `coarse:hidden` / `hidden coarse:inline`, so even the words are right on first paint. | ✅ covered |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (`Dialog`, `AlertDialog`, `Button`, `Input` already installed and used by the existing dialogs; the ⋯ menu is Base UI's `Menu` already used by `rack-card-menu.tsx`) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry, so the vetting gate has
nothing to run on and is trivially satisfied.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS (FLAG: today's dialog buttons `Cancel` / `Save` stay generic, out of scope)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (FLAG: 10/11/12px sit close; 11px kept for the phone words the founder tried on a phone)
- [x] Dimension 5 Spacing: PASS (FLAG fixed: the rack-geometry note no longer claims every figure is on the 4 grid)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-05 (gsd-ui-checker: 3 PASS, 3 non-blocking FLAGs; orchestrator rulings on menu wording and the stringer token; the founder's D-16 on duplicates; the UI-consideration probe 42/42 resolved)
