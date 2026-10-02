---
phase: 14
slug: realistic-surfboard-flow
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-10-02
reviewed_at: 2026-10-02
---

# Phase 14 — UI Design Contract

> The delta on top of Phase 12's approved contract
> (`.planning/milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-UI-SPEC.md`, "the Phase 12
> contract" below), which is itself a delta on Phase 11's. This phase has two steps, and only the
> second one is a screen design:
>
> 1. **The curves step changes no control, no copy and no layout.** Numbers and curves move
>    quietly (listed under "What moves on screen without a new control"), and nothing is said about
>    it (D-19).
> 2. **The tips step adds two Thinning Starts controls** (one for the nose, one for the tail) at
>    the end of THICKNESS, a faint mark on ROCKER's side profile, a THINNING STARTS block on the
>    DATASHEET, a line on the printed order form, a flag line when a start set by hand is too close
>    to its tip, and new wording wherever today's would go stale (§10). It also moves numbers
>    quietly on every board that sits in a blank, before anyone touches the new control (same
>    section).
>
> Everything the founder settled in `14-CONTEXT.md` (D-01 to D-19) and `14-SPEC.md` is taken as
> given. Where CONTEXT left a choice to Claude, this contract makes it and marks it `(Claude's
> discretion — founder may overrule)`. Every claim about existing code was read from the file on
> 2026-10-02 and is cited `path:line`. Every width was measured in the app's own Inter file, in a
> real browser, the same way the Phase 12 contract measured; the method was checked against four of
> that contract's own figures (`Deck Skin — 12 mm` 130.8px, `Nose @ 30.5 cm` 93.7px, `Tip Style`
> 58.3px, `Off the deck — more at the tips` 177.2px) and agreed to the tenth. Product strings use
> the product's American spelling (`Center`, `catalog`); prose here is British. Anything this
> document does not mention is exactly as the Phase 12 contract left it.
>
> **This phase adds no shadcn component, no new app component to share, no icon, no colour token and
> no spacing token.** It adds one optional prop to `SliderRow` and a few local pieces inside
> `rocker-controls.tsx` (§1, §2), all built from classes that already exist.
>
> **A picture of it:** `pictures/thinning-starts-mockup.png` shows §1, §2, §4 and §6 to §8 drawn on
> the real ROCKER screen on 2026-10-02, with example numbers, for the founder to look at. It
> illustrates this contract; where the two differ, the words here are the contract.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **This phase adds no icon.** The Automatic button is plain text. |
| Font | Inter (`--font-display` / `--font-body`, both `var(--font-inter)`) |

**What the tips step builds from, all of it existing:**

- **`SliderRow`** (`components/design/slider-row.tsx:55-97`) for each Thinning Starts slider, with
  **one new optional prop, `hintAction`** (§1): a node drawn at the right end of the hint line,
  where `rightHint` would sit. Every existing row leaves it out and renders byte for byte as it
  does today.
- **`measureSlider`** (`lib/geometry/measure-display.ts:270`) for the slider's per-system range,
  step and snap, reached through one new pure wrapper, `thinningStartSlider` (§3), the way
  `placementSlider` wraps it for Placement (`lib/geometry/blank-reasons.ts:243-262`).
- **The text-link button look** of "↺ Reset Fine-Tune" (`components/rocker/rocker-controls.tsx:419`)
  for Automatic.
- **`.slider-accent`** and **`.focus-ring-accent`** (`app/globals.css:888`, `:940`) as every slider
  and hand-rolled button already uses them.

**Not used, on purpose:** `TwoOptionToggle` (`components/viewer/two-option-toggle.tsx:34-66`) and
`FlagBlock` (`components/rocker/blank-flag.tsx:72-93`). §2 and §4 say why.

---

## Spacing Scale

Declared values for this phase's new surfaces. All are multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | The printed thinning line's `mt-1` above it (the PLANING footnote's own `mt-1`, `components/summary/order-form.tsx:749`). |
| sm | 8px | The hint line's `gap-2` between its state text and the Automatic button; the too-close line's `mt-2` under the hint line. The row's label-to-track `mb-2` is `SliderRow`'s own (`slider-row.tsx:75`). |
| md / lg / xl / 2xl / 3xl | 16 / 24 / 32 / 48 / 64px | Not used by this phase |

**Existing spacing, reused exactly and never "corrected" to the table above:**

- `gap-3.5` (14px) between the THICKNESS rows (`rocker-controls.tsx:336`). The two new rows sit
  `gap-3.5` below Tip Style and below each other: the same rhythm as every row above them.
- `mt-0.5` (2px) above the hint line (`slider-row.tsx:90`).
- The DATASHEET's `py-1.5` rows and `pt-2 pb-1` group labels (`components/rocker/rocker-datasheet.tsx:100,113`).
- `mt-2` above the Tip Style hint (`rocker-controls.tsx:439`), unchanged.

**On a coarse pointer** the Automatic button takes `coarse:min-h-11` (44px), so each Thinning Starts
hint line grows from about 16px to 44px. That is 28px a row, 56px for the pair, and it is the same
price "↺ Reset Fine-Tune" already pays (`rocker-controls.tsx:419`, `coarse:min-h-11`). Phase 13 item 9e
(minimal phone chrome) is about the bands *around* the drawing; a control's touch box is not one of
them, and the controls column scrolls.

---

## Typography

**Declared for this phase's new surfaces: three sizes, two weights (400 regular, 700 bold). Every one
is a role the Phase 12 contract already declares or documents. This phase introduces no new size or
weight.**

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| Control label | 14px (`text-sm`) | 400 | 1.43 (20px) | `Nose Thinning Starts — 12"` and `Tail Thinning Starts — 12"` (through `SliderRow`, `slider-row.tsx:74`); the DATASHEET's new row label and cells (`rocker-datasheet.tsx:84,101`) |
| Meta | 12px (`text-xs`) | 400 | 1.33 (16px) | The hint line's state text, the too-close line, the rewritten THICKNESS intro, the `From the tip taper` hint |
| Text link | 11px (`text-[11px]`) | 700 (`font-bold`) | 1.33, inherited from the hint line it sits on (`text-xs`, `slider-row.tsx:90`): about 15px, centred on that line's 16px by `items-center`. It takes no line-height class of its own. | The Automatic button, in the look of "↺ Reset Fine-Tune" (`rocker-controls.tsx:419`). Phase 12 lists this size and weight as the Tip Style pill's (`two-option-toggle.tsx:56`). It stays 11px so the sidebar keeps one look for its text-link actions. |

**Inherited roles these surfaces sit inside (documented, not declared, unchanged):**

| Role | Size / weight | Source |
|------|---------------|--------|
| Section heading `THICKNESS` | 12px / 800, uppercase, `tracking-architectural` | `rocker-controls.tsx:128` |
| Datasheet group label (the new `THINNING STARTS` takes it) | 10px / 800, uppercase, `tracking-architectural` | `rocker-datasheet.tsx:113` |
| Datasheet station headers | 10px / 800, uppercase | `rocker-datasheet.tsx:202` |
| Printed PLANING footnote and the new thinning line | `order-form-micro`: 12px minimum, 12.8px at the sheet's design width on page 2 | `app/design/summary/order-form.css:216-218`, `:283` |
| The 12" rows' hint pair | 12px / 400 | `slider-row.tsx:90` |

---

## Color

**No new hue and no new token.** Every surface in this phase uses tokens already in
`app/globals.css`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-sidebar` (the controls column) and `--surf-panel` (the viewer and datasheet card) | Every new row sits on one of these |
| Secondary (30%) | `--surf-line-faint` (the DATASHEET's row rules); `--outline-foam-shade` and `--surf-board-fill` (the drawing's washes, unchanged) | Grouping lines and the drawing's filled areas |
| Accent (10%) | `--surf-accent` (fill) and `--surf-accent-ink` (text, ring) | Only the uses listed below |
| Warning (a flag line, not destructive) | `--surf-warning-ink` | See "Where warning goes". **This phase has no destructive action.** |

**Accent reserved for (the Phase 12 list, items 1–6, with the additions marked):**

1. Every slider's range fill and thumb, `.slider-accent`. **This now includes the two Thinning
   Starts sliders.**
2. The picked blank row's 2px bar and check (unchanged).
3. The sidebar and dialog text-link actions. **The Automatic button joins "↺ Reset Fine-Tune"
   here**, as `text-surf-accent-ink`.
4. Focus rings: `.focus-ring-accent`, **now also on the Automatic buttons**.
5. The toolbar's measuring-points toggle when pressed (unchanged).
6. The selected Tip Style pill (unchanged).

**Not accent:**

- **The thinning mark on the drawing.** It is a reference line, not something to grab, and the
  drawing is read-only (`rocker-viewer.tsx:37`). It draws in `--outline-blank-line` (60% of the
  muted ink, `app/globals.css:762`), the colour the blank's silhouette already uses behind the
  board. It is deliberately darker than the leaders' `--outline-station-line` (36%, `:756`) so a
  leader and the mark can be told apart where they meet (§6).
- **The state text under the slider** ("Picked automatically" / "Automatic would be 25 1/2"") is
  `text-surf-ink-muted`, as every hint is.
- **The DATASHEET's new cells** are the muted read-only cell treatment (`rocker-datasheet.tsx:84`).

**Where warning goes, exactly (the Phase 12 rules, plus one):**

- **New: the too-close line** (§4), `text-surf-warning-ink` at the Meta role (12px / 400), directly
  under the Thinning Starts row whose start caused it. It is a sentence of body text in warning ink,
  with no box, no icon and no outline. Only a start set by hand can show it.
- Unchanged: an `OFF BOTTOM` or DATASHEET foam-off value below zero, the fit flag's headline.

**Legibility** (computed 2026-10-02 from the ramp values in `app/globals.css`, in all four themes:
Daylight, Chalk, Slate, Phosphor):

- **Text.** Warning ink on the sidebar is 6.3:1, 6.3:1, 8.6:1 and 16.8:1; muted ink on the sidebar
  is 6.3:1, 6.3:1, 7.7:1 and 6.3:1; accent ink on the sidebar (the live Automatic link) is 6.8:1,
  10.6:1, 5.1:1 and 7.0:1. All clear 4.5:1. `--surf-warning-ink` already carries 12px text on this
  screen (the flag's headline, `blank-flag.tsx:87`).
- **The dimmed Automatic link** (40% opacity, the "↺ Reset Fine-Tune" treatment) is about 1.8:1 to
  2.1:1. That is an inactive control, the same as the existing one, and the hint beside it says the
  state in words.
- **The mark on the drawing** is a new pairing: `--outline-blank-line` has not been drawn over the
  board's own fill before (the board paints over the blank's outline). Over the board fill it is
  2.4:1, 2.4:1, 3.2:1 and 2.7:1, and over the panel 2.6:1, 2.6:1, 3.5:1 and 2.9:1. A leader
  (`--outline-station-line`) is 1.7:1 to 2.0:1 over the panel, so the mark is clearly the darker
  line, and it is still the "faint mark" D-12 asks for. It is a reference line, not a reading: no
  figure depends on it, and the sidebar, the DATASHEET and the drawing's accessible name state
  every distance in words. The planner looks at it once in a screenshot in each theme.

---

## Copywriting Contract

**Formatters, one per quantity (CLAUDE.md Rule 2).**

- **A thinning start** is a distance in from a tip. It reads through **one new pure formatter,
  `formatThinningStart(start, system)`**, which is `formatDim` (`lib/geometry/measure-display.ts:63`):
  Imperial `25 1/2"`, Metric centimetres to one decimal, `64.8 cm`. Its bare twin
  `formatThinningStartBare` is `formatDimBare` (`measure-display.ts:72`), for the DATASHEET and the
  printed pair. They live in `lib/geometry/blank-reasons.ts` beside `formatDeckSkin` and
  `formatPlacement`. **Every place the distance appears reads through them**: the row label, the hint,
  the too-close line, the drawing's accessible name, the DATASHEET and the order form. No component
  formats it.
- **Why centimetres, not whole millimetres** `(Claude's discretion — founder may overrule)`. CONTEXT
  leans to marks (whole mm, like a fin's distance off the tail). Three things on this screen say
  otherwise, and a Metric shaper would see the disagreement at once:
  1. **The 12" station two rows above it.** Its label is `stationLabel(system)`
     (`measure-display.ts:210`), `30.5 cm`, and it appears as `Nose @ 30.5 cm` in the sidebar, the
     readouts, the DATASHEET headers and the drawing. On Automatic, nine tips in ten start exactly
     there. In whole millimetres that is `305 mm` one row below `Nose @ 30.5 cm`: one place, two
     readings.
  2. **Every "where along the board" phrase the reasons already print** goes through `formatDim`:
     `45.7 cm from the nose` (`lib/geometry/blank-reasons.ts:94-95`, with `stationLabel` for the 12"
     case at `:89-90`). The too-close line and the runs-out reason say where the board is thin; they
     must agree with each other.
  3. **The slider and the typing are not the point.** There is no typed field (D-11), so nothing else
     needs the millimetre family's typing rules. A Metric drag still stores a whole millimetre
     (`measureSlider`'s `toMm`, `measure-display.ts:284`), so the label and the store can never
     disagree.
  - **The fin precedent does not apply.** A fin's numbers are tape marks shown in a table of marks.
    Here the distance is a position along the board, named by the same word the station label uses.
  - **A thickness stays a mark.** The too-close line quotes a thickness and a distance in one
    sentence (`14 mm … 30.5 cm`), exactly the mixed reading `3 mm too thin 30.5 cm from the nose`
    already is (`blank-reasons.ts:124`).
- **A thickness** (the thinnest point, the tip setting, the 12" taper value) reads through
  `formatMark` (`measure-display.ts:81`) as every thickness does.
- **A pair on one line** (the printed thinning line) carries its Metric unit once at the end, the
  house rule for running text, as `boardLine` does (`blank-reasons.ts:415-418`): `nose 30.5, tail
  64.8 cm`. A value standing alone (the row label, the hint) carries its own unit.

**The reference boards for the examples** are the two the founder looked at in
`pictures/tip-taper-three-shapes.png`:

- *A tail that humps today*: Arctic 10'9" LB, 2 1/2" center, 5/8" tail tip, start 12". The board
  runs 9/16" at the 12" mark under its 5/8" tip. Automatic starts that tail `25 1/2"` in from the tip
  (the picture's first panel). In Metric: 12" is `30.5 cm`, 25 1/2" is 647.7mm and reads `64.8 cm`,
  9/16" is `14 mm` and 5/8" is `16 mm`.
- *A tail that needs a little more run*: Arctic 9'4" G, start `15 1/2"`, which reads `39.4 cm`.

The planner renders live values; these are illustrative.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **None new.** The phase's new action is a value change (a slider) and the Automatic button. The Phase 12 contract's primary CTA, **Switch to This Blank**, is unchanged. |
| Empty state heading | **None new.** With no blank picked the Thinning Starts rows do not exist (D-09), so there is nothing to be empty. The blank list's headings are unchanged (**No blank is thick enough** / **No blank passes both rules**). |
| Empty state body | Unchanged. See §11 for the no-blank rule. |
| Error state | **None new.** There is no typed field, so there is no "couldn't read" line. A start that cannot be used is pulled inside the slider's reach on read (§3), never refused. The one new "something is off" message is the too-close line (§4), which is a flag and not an error. |
| Destructive confirmation | **None this phase.** A drag is one undo step and Automatic is one undo step (§11). Nothing is deleted. |

### Sidebar: THICKNESS (blank picked)

| Element | Imperial | Metric |
|---------|----------|--------|
| **Intro** (replaces `rocker-controls.tsx:339`) | Deck and bottom follow your blank's; each tip is thinned from its Thinning Starts point, below. Set the tips, and fine-tune the 12" stations if you need to. | …below. Set the tips, and fine-tune the 30.5 cm stations if you need to. |
| Intro, no blank | Hand-set until you pick a blank. (unchanged, `rocker-controls.tsx:340`) | same |
| Tip rows, ↺ Reset Fine-Tune, Fine-tune off, Tip Style and its two hints | **Unchanged, still true** (see §10 for the check on each sentence) | same |
| **Nose row label** | Nose Thinning Starts — 12" | Nose Thinning Starts — 30.5 cm |
| **Tail row label** | Tail Thinning Starts — 25 1/2" | Tail Thinning Starts — 64.8 cm |
| **Hint line, left, on Automatic at the 12" station** | Picked automatically | same |
| **Hint line, left, on Automatic further in than the 12" station** | Automatic: 12" is too short | Automatic: 30.5 cm is too short |
| **Hint line, left, set by hand** | Automatic would be 25 1/2" | Automatic would be 64.8 cm |
| **Hint line, right** | The Automatic button (below) | same |
| **Automatic button**, text | Automatic | same |
| Automatic button, accessible name | Use Automatic for the nose thinning start (and `…the tail thinning start`) | same |
| **12" row hint, left, when that tip's start is further in than the 12" station** | From the tip taper 1 5/16" | From the tip taper 33 mm |
| 12" row hint, left, otherwise | From blank 1 5/16" (unchanged, `rocker-controls.tsx:186`) | From blank 33 mm |
| 12" row hint, right | Tweak +1/16" / No tweak (unchanged, `:187`) | Tweak +2 mm / No tweak |

The row names follow the existing `Nose Tip — …` / `Nose @ 12" — …` pattern (nose first, then tail),
with the control's own name from D-09. The label carries the bare distance; every sentence that
quotes it says "from the tip" (below), and the label stays short enough to hold a Metric value and
still leave the whole 260px row to itself (§12).

**The intro is kept short on purpose** `(Claude's discretion — founder may overrule)`. Measured in
the app's own font at 12px: today's intro is three lines on a phone (328 to 358px) and three
(Imperial) or four (Metric) at the 260px desktop floor. The new one is three lines on a phone and
four at 260px, so the first slider sits where it does today. A longer draft that also explained
Automatic ("…Automatic picks 12" in from the tip, or further in where the board needs more run…")
ran to five lines on a phone and six at 260px, every time, on every board. The explanation goes
instead where it is needed: the hint under the one slider whose Automatic start is not at 12"
(`Automatic: 12" is too short`), which is about one tip in nine (D-03).

### The too-close line (D-05) — under the row that caused it, only for a start set by hand

| Case | Imperial | Metric |
|------|----------|--------|
| **Thin spot** (the planer cut at the start is thinner than the tip setting; the board is thinnest at or just inside the start) | The board is thinnest 12" from the tail tip: 9/16", under the 5/8" set for the tip. Automatic would start the thinning 25 1/2" from the tip and clear that. | The board is thinnest 30.5 cm from the tail tip: 14 mm, under the 16 mm set for the tip. Automatic would start the thinning 64.8 cm from the tip and clear that. |
| **Sharp bend** (thick enough at the start, but running too steeply into it, so there is no thin spot but a visible bend where the taper begins) | The tail thinning starts with a sharp bend, 12" from the tip. Automatic would start it 15 1/2" from the tip and run it down steadily. | The tail thinning starts with a sharp bend, 30.5 cm from the tip. Automatic would start it 39.4 cm from the tip and run it down steadily. |

- Both examples are tails because both reference boards are (above); a nose reads the same with
  `nose` in place of `tail`. `{end}` is `nose` or `tail`, and `{tip}` is that end's own Nose Tip /
  Tail Tip thickness.
- **Neither sentence ends in a full stop that the component adds** and neither comes from a
  component: both are built in `lib/geometry/blank-reasons.ts` by one new pure function (§4).
- **The line is shown only when the printed numbers differ.** If the thinnest thickness and the tip
  setting print the same (`5/8"` and `5/8"`), the board is not visibly thin and nothing shows. That
  is the `formatAmount` "under 1/16"" idea (`blank-reasons.ts:71-75`) applied to a sentence that
  would otherwise contradict itself.

### Where the board runs out under the 1/4" floor — one new clause (§10)

| Element | Imperial | Metric |
|---------|----------|--------|
| New `runsOut` clause, `thinningStart` | Less than 1/4" would be left 18" from the nose — your nose thinning starts too close to the tip | Less than 6 mm would be left 45.7 cm from the nose — your nose thinning starts too close to the tip |
| The four existing clauses | **Unchanged, but each must stay true** (§10) | same |

This clause is **not a new way to fail** (D-05): the 1/4" floor already refuses such a board
today. It only gives that refusal its true reason, where the four existing clauses would blame the
blank or the centre `(Claude's discretion — founder may overrule)`.

### Viewer and DATASHEET

| Element | Copy |
|---------|------|
| Drawing's accessible name, blank picked (replaces `rocker-viewer.tsx:704-706`) | Side profile of the board inside the {vendor} {name} blank, with the foam to come off the deck and the bottom shaded, and a dashed line across the board where each tip's thinning starts: {d} from the nose tip and {d} from the tail tip |
| Drawing's accessible name, no blank | Unchanged (`rocker-viewer.tsx:706`) |
| Mark on the drawing | **No text.** The drawing's name and the sidebar carry the words (§6). |
| DATASHEET group label (new, after FOAM OFF) | **THINNING STARTS** |
| DATASHEET row label | **From tip** (Metric `From tip (cm)`, through `columnUnitSuffix("dim", system)`, `measure-display.ts:233`) |
| DATASHEET cells | Under NOSE TIP and under TAIL TIP only: Imperial `12"` · `25 1/2"`, Metric `30.5` · `64.8`. The other three cells are empty. |
| DATASHEET intro, footnote, catalog notes, headers | Unchanged |

### The printed order form, page 2, PLANING box

| Element | Imperial | Metric |
|---------|----------|--------|
| **Thinning line**, blank picked (new, under the footnote) | Thinning starts from the tip: nose 12", tail 25 1/2". | Thinning starts from the tip: nose 30.5, tail 64.8 cm. |
| Thinning line, no blank | **Not printed.** The footnote stays `Pick a blank on ROCKER for the planing numbers.` (`lib/geometry/planing.ts:48`) | same |
| Table, headers, rows, existing footnote | Unchanged (`planing.ts:111-140`) | same |
| Page 1's Rocker strip | Unchanged. It draws no mark. See §8. | same |

### Why nothing here asks first

- **A Thinning Starts drag and an Automatic tap** are board edits, each one undo step on the app's
  Cmd/Ctrl+Z and the phone's undo bar, like every slider. Neither ever clears the picked blank.
- **↺ Reset Fine-Tune does not touch Thinning Starts.** It clears the two 12" tweaks and nothing
  else (`design-store.tsx:974-983`). Each Thinning Starts row has its own Automatic.

---

## Already done — read this before planning

Confirmed 2026-10-02 by reading the files. Where this corrects CONTEXT.md or the orchestrator's brief,
this section is the one to trust.

- **`TIP_EASE_WINDOW_MM` has a second, protected reader.** CONTEXT's code notes say the tip window is
  read by `boardOnBlank`, `fitAt` and `runsOutCause`. Reading `blank-fit.ts`: `boardOnBlank` reads it
  at `:322` and `runsOutCause` at `:432`; **`fitAt` does not** (`:468-498` only calls
  `runsOutCause`). But **`lib/geometry/phase11-foil.ts` imports it too** (`:26`, used at `:65`, `:110`
  and `:113`), and the brief's constraint 5 says old boards must convert exactly as before. So the
  constant must stay 12" for that file. The new per-tip start is a different quantity and needs its
  own name. This is a planner point, not a screen one, but it decides whether a saved Phase 11 board
  opens with the same numbers.
- **`TwoOptionToggle` is in `components/viewer/two-option-toggle.tsx`**, not in `rocker-controls.tsx`
  (`rocker-controls.tsx:66` imports it), and it already carries `aria-pressed`, `ariaLabel`,
  `focus-ring-accent` and `coarse:min-h-11` (`two-option-toggle.tsx:44-58`). The Phase 12 contract's
  "Already done" bullet saying it has none of these is out of date. Nothing about it changes here.
- **The Deck Skin slider is 0"–1" now**, not Phase 12's 1/16"–1/2" (`board-on-blank.tsx:15-17`, Phase 13
  item 4b). Do not copy that range from the Phase 12 contract. It matters only because this
  contract's slider-range reasoning (§3) is a fresh one.
- **`SliderRow` has no slot for a button.** Its label line is one `div` (`slider-row.tsx:72-79`), its
  hint line takes two strings (`:89-94`), and its `note` is 10px warning ink (`:95`), the size the
  Placement "too short to slide" note uses (`board-on-blank.tsx:136`). Ten pixels is too small for a
  two-clause sentence on a phone, so the too-close line does not use `note` (§4).
- **`FlagBlock` is a fit failure and lives in the BLANK section.** It is `role="status"`, outlined in
  warning ink, headed by `This blank doesn't fit your board`, and rendered from `blank-picker.tsx:328`,
  not from THICKNESS (`blank-flag.tsx:72-93`; `blank-reasons.ts:44`). D-05 says a start set too close
  is not a fit failure, so it must not borrow that block (§4).
- **The clamp-on-read precedent is Placement.** The slider shows the placement "actually used", the one
  the profile pulled inside the range on read, and nothing is written (`board-on-blank.tsx:141-142`;
  `blank-fit.ts:174-178`). The Thinning Starts range follows it exactly (§3).
- **Six places build the board's inputs for the profile, the list and the flag.** Each would silently
  ignore a hand-set start, and then the list's verdicts and the screen would disagree:
  `lib/geometry/board-profile.ts:263-281`, `components/rocker/blank-flag.tsx:162-190`,
  `components/rocker/use-blank-list.ts:107-108,127-171` (`useBoardCut`), `lib/geometry/design.ts:182`
  (the rack cards), `components/design/design-store.tsx:785` and `scripts/check-saved-boards.ts:180,204`.
  The start is a field of the board's blank (`BoardBlank`, `lib/geometry/blank.ts:90-105`) and
  travels through all six, like `deckSkin` and `tipStyle` do.
- **`runsOutCause` goes wrong under the new rule if left alone.** It asks "is this station inside a tip's
  window" with the fixed 12" (`blank-fit.ts:432-436`). With a per-tip start, a runs-out station at
  15" from a tip whose Automatic start is 24" is inside the taper, and with a tip setting under the
  floor it would be called `thinCenter` ("this blank is too thick for a … center"), which is false.
  And a hand-set start that causes the under-1/4" spot with a perfectly good tip setting would be called
  `thinCenter` too. §10 fixes both.
- **The preset litres in CONTEXT and in the research record are two different steps, not a
  disagreement.** The research record's section 6 (29.410 → 29.478, 35.047 → 35.093, 50.277 → 50.286,
  75.300 → 75.309) is the **curves step alone**, with today's tip rule kept. CONTEXT's "what moves"
  line (Shortboard 29.4 → 29.6 L, Fish 35.0 → 35.3, Mid-length 50.3 → 50.4, Longboard unchanged 75.3)
  is **both steps together**: the taper research's own rows put the steady taper on the new curves at
  29.562, 35.313, 50.401 and 75.311 (`2026-10-02-taper-shapes/preset-rows.json` in the phase's
  research archive, the `today` and `parabola` columns). So the four cards move at each go-live. The
  table under "What moves on screen without a new control" gives each step its own figures.
- **Nothing pins a preset card's litres today.** No test types one and no reference screenshot shows
  the setup screen (searched 2026-10-02): the cards work their litres out live
  (`lib/geometry/design.ts:192-205`). SPEC acceptance 5's "recorded litres re-recorded from the app"
  therefore has no existing home; where they are pinned is the planner's.
- **The Automatic scan steps 1/2" from 12"**, which is how the research measured it (`autoStart` in
  `2026-10-02-taper-shapes/shapes.ts`, in the archive) and why every start in the founder's picture
  reads in half inches (`25 1/2`, `15 1/2`, `13 1/2`, `19 1/2`, `41 1/2`, `23 1/2`;
  `pictures/tip-taper-three-shapes.png`). §3 turns that into a guarantee.
- **The desktop baselines are macOS-rendered and local only** (CLAUDE.md). The only snapshot folder is
  `e2e/desktop-baseline.spec.ts-snapshots`, and it holds five pictures: TEMPLATE, ROCKER, RAILS,
  VOLUME and FINS, each of the default board, which has no blank
  (`e2e/desktop-baseline.spec.ts:91-132`).
- **Two e2e assertions pin words this phase changes.** `e2e/rocker-cut.spec.ts:281` asserts the old
  THICKNESS intro verbatim, and `e2e/rocker-blanks.spec.ts:229-236` asserts `From blank ` on the 12"
  row (which stays true whenever that tip's start is 12" or nearer).
- **Phase 12's "nothing at or inside a 12" station moves" no longer holds** for a tip whose start is
  further in than 12" (D-07), and a Tip Style tap now re-derives each tip from its tip to its start,
  not "the last 12"". Stale comments to rewrite with the code: `rocker-controls.tsx:32-35,39-40`;
  `blank-fit.ts:11-17,55,237-241,279-283,417-418`.

---

## What moves on screen without a new control

Both go-lives move numbers a shaper can see, and **nothing is said about either anywhere on screen**
(D-19): no notice, no marker, no "what's new". Saved boards redraw the next time they open; what they
store does not change and nothing is written by opening them. The lists below are here so nobody
mistakes a moved number for a bug. Every figure is the research's own measurement, to be re-measured
by the planner and never typed into the app.

### At the curves step

**No new control, no new copy, no layout change.** The sidebar, the DATASHEET and the drawing are
laid out exactly as the Phase 12 contract leaves them.

- **The four preset cards' litres** (table below): two cards move by 0.1 L. Station numbers move
  within 1/64".
- **The first board a visitor sees**, with no blank: its curves move up to 1/8" between the stations
  (the five numbers themselves are the same, SPEC acceptance 8), and its litres read 30.1 → 30.5 L.
- **A saved board on an Arctic blank**: rocker numbers up to 3/32", litres about +2%.
- **Reference screenshots to re-record** in `e2e/desktop-baseline.spec.ts-snapshots`: **ROCKER** (its
  default board is hand-set, so its curves move) and **VOLUME** (its litres). RAILS, FINS and
  TEMPLATE are expected to stay identical, because the default board's five thicknesses and its
  outline do not move. Any of the three that does move needs the founder's eye on the diff before
  it is re-recorded: TEMPLATE should not move at all (the outline is out of scope).

### At the tips step, before anyone touches Thinning Starts

Every board in a blank opens on Automatic (D-06), and the steady taper replaces today's blend on
all of them at once:

- **Ordinary tips come out a little fuller** in their last 6", by up to 1/8" (D-01), so litres rise
  slightly on every board in a blank. The four preset cards move again (table below).
- **About one tip in nine starts further in than 12"** (358 of 3,270 test tips, D-03). On those the
  12" thickness rises, typically by 1/16" and at most 1/2", and under Pin deck the 12" rocker number
  moves with it (D-07). Their 12" row reads `From the tip taper …` and their Thinning Starts hint
  reads `Automatic: 12" is too short`.
- **Boards that are thinner near a tip than at the tip today stop being so.**
- **A board with no blank does not move at this step**: it has no taper. So the five reference
  screenshots, which are all of the default board, are not re-recorded here.

### The four preset cards, step by step

| Card | Live today | After the curves step | After the tips step |
|------|-----------|-----------------------|---------------------|
| Shortboard | 29.4 L | 29.5 L | 29.6 L |
| Fish | 35.0 L | 35.1 L | 35.3 L |
| Mid-length | 50.3 L | 50.3 L | 50.4 L |
| Longboard | 75.3 L | 75.3 L | 75.3 L |

(Measured 29.410 / 29.478 / 29.562, 35.047 / 35.093 / 35.313, 50.277 / 50.286 / 50.401 and
75.300 / 75.309 / 75.311; see "Already done" for the sources.)

---

## Interaction & Layout Contract

### What triggers what

Nothing new. The three switches are inherited exactly as CLAUDE.md states them: **width** picks the
layout (`max-shell:` below 820px, `shell:` at or above, `app/globals.css:128-138`), **pointer** picks a
control's size (`coarse:`, `:77`), **height** picks whether a short screen scrolls and which top bar
draws (inline `[@media(max-height:500px)]`). Every touch size below is `coarse:`. No new rule reads
width or height and no "phone" variant is invented.

### What draws the eye first

- **Screen focal point, both layouts: the drawing** (unchanged). The board's 2px `--outline-ink`
  profile sits between its two faint foam bands inside the blank's 1px line. The new mark is a faint
  dashed line at 60% muted ink across the board, and nothing on the drawing is louder than it was.
- **THICKNESS section:** unchanged: the four tip and 12" sliders. **The two Thinning Starts rows are
  deliberately quiet end-of-section settings.** They sit last, below Tip Style, the one place a shaper
  who wants them will look. The only accent they add is two slider fills and two small 11px text
  links, and on the common case (Automatic) the link is dimmed.
- **The too-close line is the one thing in THICKNESS that asks for a second look**, and only for a
  board set up that way by hand. Warning ink at 12px, no box and no icon: it is a sentence under the
  row, not an alarm. A board on Automatic never shows it.
- **DATASHEET:** YOUR BOARD stays the focal block. THINNING STARTS reads last, in muted read-only ink.
- **Every icon carries words.** This phase adds no icon and no icon-only control.

### The sidebar, top to bottom (delta on the Phase 12 contract's table)

| # | Blank picked | No blank (fallback) |
|---|--------------|---------------------|
| 0–4 | Unchanged | Unchanged |
| 5 | THICKNESS — **new intro**, Nose Tip, Nose @ 12" (fine-tune), Tail @ 12" (fine-tune), Fine-tune off, Tail Tip, ↺ Reset Fine-Tune, Tip Style, **Nose Thinning Starts, Tail Thinning Starts** | THICKNESS — unchanged (absolute sliders, "Hand-set until you pick a blank.") |

### 1. The Thinning Starts rows: anatomy (D-09, D-10, D-11)

Two rows, nose then tail, each:

```
Nose Thinning Starts — 25 1/2"                         (label line: SliderRow's own)
━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    (the slider, always there)
Picked automatically                          Automatic    (hint line: state left, button right)
The board is thinnest …                                    (the too-close line, only when it applies)
```

- **Built on `SliderRow`**, not hand-rolled, so `slider-row.test.ts`'s allowlist for ROCKER stays at its one
  raw `<Slider>` (`slider-row.test.ts:46-51`) and nothing in that test changes. `rawSliderCount`
  (`:83-86`) counts `<Slider` renders in the file, and these rows add none.
- **One new optional prop on `SliderRow`: `hintAction?: ReactNode`.** It is drawn at the right end of the
  hint line in place of `rightHint`. The hint line renders when any of `leftHint`, `rightHint` or
  `hintAction` is present. When `hintAction` is present the line takes `items-center gap-2` in addition
  to its existing `mt-0.5 flex justify-between text-xs text-surf-ink-muted font-normal`
  (`slider-row.tsx:90`); when it is absent every class is exactly today's. `slider-row.test.ts`'s
  existing assertion that the file exports exactly `SliderRow` and `sliderValue` (`:138-143`) stays
  green, because a prop adds no export.
- **Why a prop and not a hand-rolled row, and why the hint line and not the label line**
  `(Claude's discretion — founder may overrule)`:
  - The label line cannot hold the button at the 260px floor in Metric: `Nose Thinning Starts — 30.5 cm`
    is 214.0px, the button is 55.6px, and a `gap-2` between them is 8px, which totals 277.6px against
    260px (the label would wrap onto two lines on a desktop sidebar). Alone on its line the widest
    label is 219.8px (§12).
  - The Center Thickness row (`rocker-controls.tsx:230`) does carry a control on its label line, but
    its control is a 96px typed field on a label of 108px. It is hand-rolled, and that is what its
    allowlist entry is for. These rows have no such excuse.
  - The hint line already exists, already reads as "the line about this slider", and has room: the
    widest state text plus the button is 240.4px (§12).
- **Label**: `Nose Thinning Starts — {formatThinningStart(start)}` and `Tail Thinning Starts — …`, passed as the
  one string the sibling rows pass (`rocker-controls.tsx:151,181`). The distance in force is always in
  it, whether the start is Automatic's or the shaper's.
- **Hint line, left** (the state, Meta role). Three states, one string each, built by one new pure
  function beside the formatters (`thinningStartHint(view, system)` in `lib/geometry/blank-reasons.ts`),
  so the component picks nothing:
  - Automatic, at the 12" station: `Picked automatically`.
  - Automatic, further in than the 12" station: `Automatic: {stationLabel(system)} is too short`, that
    is `Automatic: 12" is too short` / `Automatic: 30.5 cm is too short`. This is the one place the
    screen says *why* a start is not at 12": the board cannot run down steadily from there (D-03). It
    reads off the same boolean the 12" row's hint uses (`reachesStation`, §4), so the two lines can
    never disagree `(Claude's discretion — founder may overrule)`.
  - Set by hand: `Automatic would be {formatThinningStart(automaticStart)}`. This is the one place a
    shaper sees what pressing the button would do before they press it.
  - It is a plain string through `leftHint`. No end-of-track hints ("Near the tip" / "The center") are
    shown: with the state text on the left there is no room for them at 260px, and every sentence
    that quotes the distance says which way it runs ("from the tip").
- **Hint line, right: the Automatic button** (§2).
- **Where the too-close line goes** is §4: a sibling under the row.
- **The two rows are siblings in THICKNESS's existing `gap-3.5` column**, in the order D-10 gives:
  Tip Style (which surface), Nose Thinning Starts (where the nose starts), Tail Thinning Starts (where
  the tail starts). Every row above keeps its place. There is no sub-heading, because each label already
  carries the control's name, and no divider.
- **Shown only when a blank is picked** (the same `view` test Tip Style uses, `rocker-controls.tsx:427`).

### 2. The Automatic button (D-11)

- **What it is:** a text link in the look of "↺ Reset Fine-Tune":
  `focus-ring-accent shrink-0 cursor-pointer text-left text-[11px] font-bold text-surf-accent-ink
  coarse:flex coarse:min-h-11 coarse:items-center`. That is the string at `rocker-controls.tsx:419`
  with two differences, both because this button sits in a row and that one in a column: it drops
  `self-start` (the hint line centres it, `items-center`), and it adds `shrink-0` so a long hint
  wraps beside the button instead of squeezing it. It is a small local component inside
  `rocker-controls.tsx`, like `FineTuneRow`. Its text is the word **Automatic**, no glyph and no icon.
- **Why this and not the `TwoOptionToggle` pill** `(Claude's discretion — founder may overrule)`: a filled
  accent pill on every board still on Automatic would put two more accent-filled shapes next to Tip
  Style's, and the Phase 12 contract made Tip Style "deliberately quiet, accent fill one small 11px
  pill" (§4). A pill pair is also for choosing between two options; this is a single action. A text
  link is the form the sidebar already uses for a single action ("↺ Reset Fine-Tune").
- **What a tap does:** puts that tip's start back to Automatic. The slider thumb moves to Automatic's
  distance, the label and hint update, the mark on the drawing moves, the too-close line clears. It is
  **one undo step** (§11).
- **When the tip is already on Automatic** the button stays exactly where it is, so nothing shifts: it
  is dimmed and inert, the way "↺ Reset Fine-Tune" is when there is nothing to reset
  (`rocker-controls.tsx:411-424`): `pointer-events-none opacity-40`, `tabIndex={-1}`, `aria-disabled="true"`,
  and its click does nothing. The hint beside it (`Picked automatically`, or `Automatic: 12" is too
  short`) says in words what the dimming means, so the state is never carried by opacity alone.
- **What a screen reader hears:** two buttons with the same visible word need different names. Each has
  `aria-label="Use Automatic for the nose thinning start"` (and `…the tail thinning start`), which
  contains the visible word, and `aria-pressed` set to whether that tip is on Automatic. On Automatic it
  reads as a pressed, dimmed button; set by hand, as an unpressed one that can be pressed. This is the
  `TwoOptionToggle` precedent (`aria-pressed`, tapping the active one does nothing,
  `two-option-toggle.tsx:54`).
- **Touch:** `coarse:min-h-11` makes the tap box 44px tall; it is 55.6px wide. See §12 for how it sits
  against the slider thumb's own 44px ring.

### 3. Range, step, direction, and the clamp on read

- **Range** `(Claude's discretion on the grid; the 6" and the centre are D-02/D-11)`: from **6"** at the
  left end to **half the board's length, rounded inward to the grid**, at the right end. Imperial grid
  step **1/2"**; Metric step **10 mm** (1 cm). Examples: a 6'2" board (74") reads 6" to 37"; a 5'10"
  board (70") 6" to 35"; Metric, 152.4 mm rounds up to **160 mm** (16.0 cm) at the left end
  (`metricSliderRange` rounds each end inward, `lib/geometry/units.ts:180-194`) and 889mm rounds down to
  **880 mm** (88.0 cm) at the right end for the 70" board.
- **Why 1/2" and 10 mm** `(Claude's discretion — founder may overrule)`:
  - It is the grid the founder's own pictures read in (`25 1/2`, `15 1/2`, `41 1/2`).
  - A 1/16" step across 6" to 36" is 480 positions; a thumb cannot land on one and an arrow key would need
    hundreds of presses. At 1/2" it is 60.
  - Ten millimetres is within 0.4" of the Imperial step, so a Metric shaper gets the same feel.
  - A tip's start is not cut to a sixteenth. It is "about here".
- **Direction, both sliders: the left end is the tip and the right end is the centre**, so a bigger
  number is further in from the tip and the thumb moves right as the thinning starts further in
  `(Claude's discretion — founder may overrule)`. This is the founder's own chart (`min="6"`,
  `max="60"`, "12 in from the tip") for both tips. I rejected mirroring the tail's slider to match the
  nose-left drawing, as Placement does (`board-on-blank.tsx:7-12`): Placement is one quantity measured
  from one fixed end, so the drawing decides which way it runs. Here the two sliders are the same
  quantity measured from two different ends, and giving them opposite directions would make "drag right
  = further in" true for one row and false for the other. On a phone the drawing is nose-up and has no
  left or right at all.
- **The slider helper is new and pure:** `thinningStartSlider(tipView, system): MeasureSliderView` in
  `lib/geometry/blank-reasons.ts` beside `placementSlider`. It turns the profile's range into the
  inch-domain range `measureSlider` takes (`measure-display.ts:270`), with step 0.5 and `stepMm` 10, so
  the component never converts. Tested in both systems.
- **What the geometry must guarantee for the UI** (so what the screen prints is always clean):
  1. **Automatic scans on the Imperial half-inch grid measured from the tip**, from 12" outward, in
     both systems. The result is therefore always a whole number of half inches, and the Imperial thumb
     sits exactly on a slider step and the label reads `25 1/2"` with no rounding. It is the grid the
     founder's pictures were drawn on. Any scan the planner prefers must keep this guarantee and
     acceptance criterion 3.
  2. **In Metric the same distance is not on the 10 mm grid** (25 1/2" is 647.7 mm), and that is fine:
     the label is `formatThinningStart`'s one-decimal centimetres of the stored millimetres (`64.8 cm`),
     the thumb is drawn where the value is (`measureSlider` clamps a Metric value to the range and does
     not snap it, `measure-display.ts:280`), and only a *drag* snaps (`toMm`, `:284`). A Metric shaper
     who drags gets whole centimetres, so `30.0 cm` is reachable by hand and `30.5 cm` is reachable by
     Automatic. That is why the button exists.
  3. **It does not flicker.** Between two ticks of any other slider Automatic's distance must not jump
     back and forth; the same board always gives the same distance.
  4. **A "pulled inside the range" rule that agrees with the slider:** the profile's resolved start is
     clamped to the same `{ min, max }` the slider uses (the rounded-inward maximum), not to the true
     half length. Otherwise a start at the true centre would label as `35 1/4"` over a thumb that stops at
     `35"`.
- **When the board is shortened on TEMPLATE so a hand-set start is now past the centre:** it is **pulled to
  the new maximum on read, and nothing is written**, exactly the Placement precedent
  (`board-on-blank.tsx:141-142`: "stored as given, clamped on read"). The label reads the pulled
  value, the thumb sits at the right end, the hint still says `Automatic would be …`, and lengthening the
  board again brings the stored distance back. The slider component never sees the stored number.
- **A start that is not a number** (a corrupt save) reads as Automatic, the way a non-finite placement
  reads as centred (`blank-fit.ts:175`). Nothing is written.

### 4. The too-close line (D-05)

Two things make a hand-set start "too close to the tip", and CONTEXT D-03's test names both
(`P(W) ≥ tip` and `P′(W) ≤ 2·sec`):

1. **Thin spot:** the planer cut at the start is already thinner than the tip setting. The taper cannot
   reach the tip without dipping under it, so the board is thinnest at or just inside the start. This is
   the case D-05's wording ("says where the board is thinnest") describes.
2. **Sharp bend:** the cut is thick enough, but leaves the start too steeply. There is no thin spot, but
   the board bends visibly where the taper begins. D-05's wording does not fit this one, so it has its
   own sentence (Copywriting).

- **Where it renders:** directly under the Thinning Starts row that caused it, as its own element after
  the `SliderRow` and wrapped with it so the two stay one unit: `<p className="mt-2 text-xs
  text-surf-warning-ink">`. Not in `SliderRow`'s `note`: that is 10px, which is too small for a two-clause
  sentence on a phone, and changing it would change Placement's note.
  `(Claude's discretion — founder may overrule)`.
- **Why not `FlagBlock`.** `FlagBlock` says `This blank doesn't fit your board`, is a live `role="status"`
  box in the BLANK section, outlined and iconed, and offers a button (`blank-flag.tsx:72-93`,
  `blank-picker.tsx:328`). D-05 says this is not a fit failure, and it lives in THICKNESS, not in the BLANK
  section: the cause and the fix (Automatic, one line above) belong in one view. So the line has no
  box, no icon, no headline, no `role="status"`, and no button of its own, because the Automatic button
  directly above it is the one way out.
- **No live region.** Announcing a sentence that appears and clears as a finger drags would read out on
  every step. It follows its slider in the page's reading order, and a screen reader meets it right
  after the hint.
- **Layout shift:** the line appears and clears as a drag crosses the threshold, so the rows beneath it move
  down by up to four lines at the 260px floor (three at 328, 343 and 358). The thumb being dragged is
  above the line, so it does not move under the finger. No space is reserved for it: reserving four lines
  on every board for a hand-set edge case would cost far more than it saves.
- **When it shows:** only when the tip's start is set by hand **and** the flag says so. On Automatic it
  never shows, because Automatic is chosen so the board runs down steadily (SPEC acceptance 3). The twelve
  US Blanks 9'9"B boards whose thickest station is not the centre read as the blank's own shape, not a flag
  (D-14).
- **When it clears:** a drag to a start that passes the test, or the Automatic button, or a change that makes it
  pass (a thicker tip setting, a shorter board, a different centre).
- **It does not change fit.** The existing fit check and the 1/4" floor still judge the board exactly as
  they do today (D-05). If the thin spot also drops the board under the 1/4" floor, the BLANK section's
  flag says so in its own words (§10's new clause), and both lines agree.
- **What the side profile must expose per tip** (the shape is this contract's, the names are the
  planner's; the component computes none of it, Rule 1). One value per tip, on the profile's blank view
  (`BlankSideView`, `lib/geometry/board-profile.ts:42-76`, beside `cut` and `derived12`):

  | Field (shape) | What it is | Who reads it |
  |---|---|---|
  | `start: Mm` | the distance in from the tip actually used: Automatic's pick, or the hand-set value pulled inside `range` | the label, the hint, every sentence, the DATASHEET, the order form |
  | `station: Mm` | the same point measured from the board's tail tip (board coordinates) | the drawing's mark (`rocker-viewer.tsx` samples `profile.rockerAt` and `profile.deckAt` there) |
  | `automatic: boolean` | the board stores no hand-set start for this tip | the hint's state text, the button's state |
  | `automaticStart: Mm` | what Automatic would pick for this board right now (equals `start` when `automatic`) | the hint, the flag sentences |
  | `range: { min: Mm; max: Mm }` | the slider's reach: 6" to half the length rounded inward to the 1/2" grid. The one clamp for the read and the slider | `thinningStartSlider` |
  | `reachesStation: boolean` | the start is further in than the 12" station, so that tip's 12" numbers belong to the taper (D-07) | the 12" row's hint (§10) and, on Automatic, the Thinning Starts hint (§1) |
  | `flag: null \| { kind: "thin"; thinnest: Mm; at: Mm } \| { kind: "steep" }` | null on Automatic and when the board is fine. `thinnest` is the lowest thickness before any fine-tune (D-04) in the stretch from the tip to the start, `at` is its distance in from the tip | `thinningStartLine` |

  The sentence is built by one new pure function in `lib/geometry/blank-reasons.ts`,
  `thinningStartLine(end, view, tipSetting, system): string | null`, which returns null when the printed
  numbers do not differ (Copywriting). The component renders what it returns.
- **The "sharp bend" threshold is the planner's** with this constraint: it must not fire for a bend a
  shaper could not see. My default `(Claude's discretion — founder may overrule)`: the taper's slope may
  differ from the planer cut's slope at the start by up to 1/16" of thickness per inch of length before
  the flag shows, in both systems alike. Open item (§Open items).

### 5. Fit and flag interplay, in one place

| Situation | BLANK section's `FlagBlock` | THICKNESS's too-close line |
|---|---|---|
| Any board on Automatic | as today | never |
| Start set by hand, thin spot, board still above the 1/4" floor | none (not a fit failure) | thin-spot sentence |
| Start set by hand, board drops under the 1/4" floor | the existing runs-out reason, with the new clause (§10) | thin-spot sentence |
| Start set by hand, sharp bend only | none | sharp-bend sentence |

### 6. The mark on the side profile (D-12)

- **What it is:** a short dashed line across the board, at the point where each tip's thinning starts, one for
  the nose and one for the tail. Like a section line on a drawing. It carries **no text**.
- **Draws when:** `callouts === "full"` **and** a blank is handed to the viewer (the ROCKER screen with a blank
  picked). It does not depend on the measuring-points toggle and does not appear in the compact
  grammar or with no blank. The order form's rocker strip is passed no blank
  (`order-form.tsx:447-452`) and prints the starts in words instead (§8).
- **Exact look, all from existing tokens and constants:**
  - Stroke `var(--outline-blank-line)` (`app/globals.css:762`).
  - Width **1** user unit and dash **`"4 3"`**, the same as the dashed baseline in the full grammar
    (`rocker-viewer.tsx:738-746`), so "a dashed 1-unit line is a reference line" stays one grammar (the
    header comment says "dashes mean reference lines in this app", `:25-26`).
  - It runs from just below the board's bottom curve to just above its deck curve at that station, each end
    overshooting the board by **6 user units**. Inside the board alone it would be almost nothing on a
    thin tail: a 9/16" tail section at this drawing's scale (820 units over a 6' board, about 11 units to
    the inch) is about 6 units tall, shorter than one dash and one gap. The overshoot is what makes it
    legible on thin sections.
  - The mark is drawn after the board and before the callouts, inside the single rotated `<g>`
    (`rocker-viewer.tsx:732`), so it rotates with the board in both orientations. It has no text, so it
    needs no `Upright`.
- **Why it cannot be confused with, or lost under, a leader:** the Nose @ 12" and Tail @ 12" leaders are solid
  1px lines in `--outline-station-line` that run from each rail to the curve and stop there
  (`rocker-viewer.tsx:259,324`; `RockerViewer` draws a `DimensionTick` at the curve for a derived reading,
  `:325`). On Automatic the start is exactly 12" for about 89% of tips (D-03), so the mark and the two
  leaders sit on one vertical line:
  - the leaders end at the board's curves; the mark is the stretch *across* the board and its 6-unit
    overshoot, so it never hides under a leader;
  - it is dashed and 60% against the leaders' solid 36%, so the stretch across the board reads as a
    different line;
  - and where they meet it reads as one line through the board at the 12" station, which is the truth: the
    thinning starts there. Where the start is anywhere else the mark stands alone with no leader at all.
- **All positions come from the profile.** The component takes `view.tips.nose.station` and `…tail.station`
  (§4's table), samples `profile.rockerAt` and `profile.deckAt` there exactly as the measuring points do
  (`rocker-viewer.tsx:687-690`) and projects with `pxX`/`pxY`. The 6-unit overshoot and the dash are
  **two new named constants in `components/rocker/rocker-view-frame.ts`** beside the existing
  `COMPACT_BASELINE_DASH`, so the component derives no layout number itself (the file's own rule,
  `:16-17`).
- **Accessible name** (Copywriting): the drawing's name gains the sentence naming both distances, through
  `formatThinningStart`, so a screen reader hears what the mark shows.
- **With the measuring points on**, the dots sit on the board's curves at the five stations, including the
  12" ones, and the mark crosses them. Nothing collides: the dots are 3px (`KNOT_DOT_PX`,
  `rocker-viewer.tsx:128`) and the mark is a hairline.
- **No new token.** The one thing I looked for and did not need: a dedicated `--outline-*` colour for the
  mark. `--outline-blank-line` is the existing darker-than-a-leader muted ink.

### 7. The DATASHEET: THINNING STARTS block (D-12)

- **Blank picked: a fourth group and a ninth row.** Today the sheet has three groups under the station
  headers (BLANK — …, YOUR BOARD, FOAM OFF) and eight rows (`rocker-datasheet.tsx:230-274`); the file's
  own header comment says "four blocks, ten rows" (`:16`), which is a miscount to put right when the
  code changes. After FOAM OFF, a new `GroupLabel` (`rocker-datasheet.tsx:111-117`) reads
  **THINNING STARTS**, with one read-only row beneath it:
  - Row label **`From tip`**, in Metric **`From tip (cm)`** through `columnUnitSuffix("dim", system)`, in
    the label treatment `Row` already gives a read-only row (`rocker-datasheet.tsx:100-104`).
  - Cells: the Nose Tip column shows the nose start and the Tail Tip column shows the tail start, through
    `formatThinningStartBare` (`12"` / `25 1/2"` in Imperial, `30.5` / `64.8` in Metric). The three
    middle cells are empty `READ_ONLY_CELL` divs, so the two numbers sit directly beside the tip
    thicknesses they belong to ("beside the tip numbers", D-12).
  - Cell treatment `READ_ONLY_CELL` (`rocker-datasheet.tsx:84`): 14px / 400, `text-surf-ink-muted`.
    Never warning ink: a start is a setting, not a reading that can go wrong.
- **The last row changes.** FOAM OFF's Bottom row is today the table's last row and drops its bottom rule
  with `className=""` (`rocker-datasheet.tsx:272`). It now takes the default `border-b
  border-surf-line-faint`, and the new From tip row takes `className=""` so the table still ends
  without a rule.
- **Measured against the table** (540px minimum, `rocker-datasheet.tsx:225`): the label column is
  `1.1 / 6.1` of the 500px left after five 8px gaps, which is about 90.2px. `From tip (cm)` is 88.3px
  at 14px, so it fits with 1.9px to spare; `From tip` alone is 54.0px. If a renderer wraps it, the row is
  `items-center` and just grows a line, so nothing breaks. `THINNING STARTS` at 10px / 800 with the
  group label's tracking is about 115px and the group label is `w-fit`. On a phone the table keeps its
  sideways scroll, 24px fade and sticky label column (`rocker-datasheet.tsx:224`, `:83`).
- **No blank:** unchanged, three typed rows, no THINNING STARTS block (D-09).

### 8. The printed order form (D-12)

- **Page 2, PLANING box**: one new paragraph under the existing footnote,
  `<p data-planing-thinning className="mt-1 text-surf-ink-muted leading-tight order-form-micro">`, the
  footnote's own classes (`order-form.tsx:749`). Imperial `Thinning starts from the tip: nose 12", tail
  25 1/2".` Metric `Thinning starts from the tip: nose 30.5, tail 64.8 cm.`
- **Why not a row in the table.** The table's columns are Deck and Bottom (`planing.ts:77`), and a
  Nose/Tail pair does not belong under those headers. The footnote is the place `planing.ts` already
  reserves for what "wraps freely and never widens the table" (`planing.ts:93-95`), and the founder asked
  for the starts "with the tips and the planing figures" (D-12).
- **Why PLANING and not page 1's Rocker strip.** The strip prints the tip thicknesses (the "tips") and
  already holds the tallest drawing the box can fit (`order-form.tsx:436-455`); the planing box is about
  what the planer does. A start is a planing instruction. The strip's drawing is compact and is passed no
  blank, so it draws no mark.
- **Words live in `lib/geometry/planing.ts`** (pure, tested): `PlaningTable` gains `thinning: string | null`,
  null with no blank, and `PlaningInput`'s blank gains the two starts. The line is built from
  `formatThinningStartBare` plus the unit once at the end in Metric.
- **Print-fit arithmetic.** The column is 28% of the Shaping Data column, 193.6px on a computer print with a
  165px floor (`order-form.css:185-203`), less the box's `px-1` (8px) = about 185.6px of text width. At the
  sheet's 12.8px micro size the line wraps cleanly onto two lines: `Thinning starts from the tip:` is 167.3px
  and adding ` nose` takes it to 200.3px, so the break falls before `nose`, and the second line is at
  most 151.2px (`nose 152.0, tail 152.0 cm.`). Two lines of `leading-tight` plus `mt-1` is about 36px.
- **There is room, measured.** In the running app on 2026-10-02 (the Summary page on a computer, the
  sheet 880px wide, where the micro type is 15.4px): the PLANING panel is **539px** tall, because its
  row is as tall as the rail table beside it, and its table (84px), its two-line footnote (4 + 38px)
  and its padding (16px) use **142px** of that. (Measured with no blank picked; the blank-picked
  footnote is two lines at that width too.) The new paragraph is two lines in both systems, even at
  the longest values, and adds about 43px with its margin, which takes the panel to about 185px of
  539px. Print is the same layout at the smaller type, so the proportions hold. **The planner still proves it** in
  `summary-planing.spec.ts`'s existing fit case, on both papers and at the phone widths, with the line
  present (the `[data-planing]` panel's `scrollHeight` against its `clientHeight`,
  `summary-planing.spec.ts:292-298`). Do not add a row to the table and do not widen the column.

### 9. Units, in one place (CLAUDE.md Rule 2)

| Quantity | Family | Formatter | Imperial | Metric |
|---|---|---|---|---|
| A thinning start (label, hint, sentences, drawing's name, printed pair, DATASHEET) | dims | `formatThinningStart` / `…Bare` = `formatDim` / `formatDimBare` | `25 1/2"` | `64.8 cm` (bare `64.8`) |
| The 12" station's name | dims | `stationLabel` (unchanged) | `12"` | `30.5 cm` |
| A thickness (the thinnest point, the tip setting, the taper value in the 12" hint) | marks | `formatMark` (unchanged) | `9/16"` | `14 mm` |

Rules this table protects: a start of 12" in Metric reads `30.5 cm` everywhere and never `305 mm`; the
same distance never reads two ways on one screen; a 12" station and a start that is the 12" station print
the same digits (an e2e check, §13). The preference stays display-only (Rule 2): switching systems
changes how the number is shown and typed and rewrites nothing, and switching back reproduces every
value exactly.

### 10. Copy that goes stale or false under the new rule

Each sentence checked 2026-10-02:

| Where | Today | Verdict |
|---|---|---|
| THICKNESS intro (`rocker-controls.tsx:339`) | "…the tips are thinned in the last 12"…" | **False for any tip starting further in. Replaced** by "…each tip is thinned from its Thinning Starts point, below…" (Copywriting), which is true wherever the start is. |
| `TIP_STYLE_HINT.pinDeck` (`:80-81`) | "The deck stays put and the extra comes off the bottom, so the tip rocker grows — or falls, if the tip needs more foam than the cut leaves." | **Unchanged, still true.** The tip rocker still grows or falls; the lift now begins at the start. |
| `TIP_STYLE_HINT.bottom` (`:82`) | "The bottom stays put and the extra comes off the deck, so the rocker stays the blank's own." | **Unchanged, still true.** |
| `FINE_TUNE_SURFACE_HINT` (`:86-89`) | | **Unchanged, still true.** |
| `FineTuneRow`'s `From blank {value}` (`:186`) | | **False when that tip's start is further in than 12"** (D-07): the 12" thickness is then the taper's, not what the planer cut leaves. Reads **`From the tip taper {value}`** in that case; otherwise unchanged. The row takes a boolean from the profile (`reachesStation`, §4), not a comparison of its own. Tested in both systems. |
| `deckSkinHint` (`blank-reasons.ts:183-187`) | "Off the deck — more at the tips" / "Off the deck at every station" | **Unchanged, still true.** |
| `runsOutClause`: `thinCenter`, `fineTune`, `offBlank` (`blank-reasons.ts:110-116`) | | **Unchanged, still true**, once the rules below hold. |
| `runsOutClause`: `tipSetting` (`:117-118`) | "your nose tip is set thinner than that" | **True only if the "inside a tip's taper" test uses that tip's own start** (`blank-fit.ts:432-436` reads the fixed 12" today). With the fixed 12" it would be false (under-floor tip, station past 12", `thinCenter` shown). The test uses the tip's start. |
| **New clause `thinningStart`** | | `your {end} thinning starts too close to the tip`. Shown when the station is inside that tip's taper stretch, the tip setting itself is above the floor, and **the board would have had enough foam there on Automatic**. Order of the first match: `offBlank`, `tipSetting`, `thinningStart`, `fineTune`, `thinCenter`. `RunsOutCause` (`blank.ts:135`) gains the fifth member; `runsOutClause`'s switch is exhaustive, so a missing arm fails to compile. |
| DATASHEET intro (`rocker-datasheet.tsx:216`) | "Your blank's numbers beside your board's, at the board's five stations — take it to the supplier." | **Unchanged, still true.** |
| Phase 12 contract §4/§9 sentences | "nothing at or inside the 12" stations moves"; "Nothing marks the 12" station beyond the existing rails" | **Superseded for this screen** (D-07 and §6). Code comments to rewrite are listed under "Already done". |

### 11. Behaviour around the control

- **Undo.** A drag is one undo step per tip (a coalescing key per tip, `noteEdit("blank:thinningStart:nose")`
  and `…:tail`, the way a slider's drag is one step, `design-store.tsx:919-936`). An Automatic tap is
  one undo step (`noteEdit(null)`, `:941-948`). **Tapping Automatic on a tip that is already on
  Automatic writes nothing and records no empty step**: the mutator compares against the profile's
  resolved `automatic` flag and returns first, the `setTipStyle` precedent (`:942`).
- **Switching blanks keeps a hand-set start** `(Claude's discretion — founder may overrule)`. `pickBlank`
  keeps the fine-tunes and the whole cut on a switch (`design-store.tsx:904-911`), and a start is part of
  that cut: a deliberate choice is not quietly thrown away. The cost is that a start tuned to one blank can
  be too close on the next, and the too-close line and the Automatic button are right there to say so and
  fix it. I rejected "return to Automatic on a switch": it discards a choice the shaper made, with nothing
  on screen to say it happened, and no other setting behaves that way. A first pick starts on Automatic.
- **The blank list's verdicts** are judged with the board's own starts, hand-set or Automatic, so a hand-set
  start that would leave a blank under the floor greys that blank with the new `thinningStart` clause. On
  a board on Automatic every blank is judged with the start Automatic picks for it. The list's cost must
  stay what it is (open item below).
- **Remove This Blank:** the Thinning Starts rows disappear with the blank, and one undo brings back the
  blank, the placement, the fine-tunes, the cut and both starts together (`design-store.tsx:985-1008`).
- **No blank picked:** nothing is shown, **hidden, not disabled** (D-09), and the intro reads "Hand-set until
  you pick a blank." The THICKNESS group is the five plain thickness rows.
- **An older saved board:** a board that stores no start reads Automatic on both tips, the rows show "Picked
  automatically", **nothing is written by opening it** (D-06, SPEC acceptance 7), and no notice is shown
  (D-19). Whether that needs a saved-board version is the planner's, within CONTEXT's constraints.
- **Fit & Tip Defaults and the gear menu are untouched** (D-06): there is no account default for a start in
  this phase, so the dialog, its Restore Defaults and the menu row's detail line do not change.

### 12. Phone and touch

Every new line is sized against the **260px desktop sidebar floor** and the phone controls column widths
**328 / 343 / 358** (360 / 375 / 390-dot phones), measured in the app's own Inter file:

| Line | Longest case | Width | Fits 260? |
|------|--------------|-------|-----------|
| Row label (14px) | Metric `Nose Thinning Starts — 152.0 cm` (a 120" board's hand-set maximum) | 219.8 | yes, 40.2 to spare |
| Row label | Imperial `Nose Thinning Starts — 59 1/2"` | 207.3 | yes |
| Row label | Metric typical `Nose Thinning Starts — 30.5 cm` | 214.0 | yes |
| Hint line, Automatic at 12" | `Picked automatically` 116.7 + 8 + `Automatic` 55.6 | 180.3 | yes |
| Hint line, Automatic further in, Metric | `Automatic: 30.5 cm is too short` 176.8 + 8 + 55.6 | 240.4 | yes, 19.6 to spare (the widest hint) |
| Hint line, Automatic further in, Imperial | `Automatic: 12" is too short` 148.8 + 8 + 55.6 | 212.4 | yes |
| Hint line, by hand, Metric | `Automatic would be 112.5 cm` 164.2 + 8 + 55.6 | 227.8 | yes, 32.2 to spare |
| Hint line, by hand, Imperial | `Automatic would be 25 1/2"` 155.9 + 8 + 55.6 | 219.5 | yes |
| 12" row hint pair, Imperial | `From the tip taper 1 15/16"` 146.5 + `Tweak -1/4"` 68.5 | 215.0 | yes |
| 12" row hint pair, Metric | `From the tip taper 49 mm` 143.6 + `Tweak -6 mm` 77.8 | 221.4 | yes |
| Too-close line | longest case (Metric thin spot) 885.4 at 12px | 3.4 lines at 260; 2.7 at 328 and 343 and 358 | wraps to four lines (260) or three, allowed: running text, nothing truncates |
| Runs-out reason (BLANK section) | 565.1 at 12px | wraps, as every reason does | yes |
| THICKNESS intro | 854.3 (Imperial) / 882.3 (Metric) at 12px | four lines at 260; three at 328, 343 and 358 | yes, running text as today (today: three or four at 260, three on a phone) |
| Printed thinning line | 295.6 at 12.8px on a 185.6px text width | two lines, break before `nose` | yes (§8) |
| DATASHEET `From tip (cm)` | 88.3 in a ~90.2px label column | | yes, 1.9 to spare; wrapping would be harmless |

The row label is on its own line, so the 55.6px button never competes with it (which is why it sits on the hint
line, §1).

Touch sizes, all through the existing `coarse:` idiom:

| Control | Touch size | How |
|---------|------------|-----|
| Thinning Starts thumbs | 44 × 44 | already there (`components/ui/slider.tsx:120`, `coarse:after:-inset-4`) |
| Automatic buttons | 44px tall, 55.6px wide | `coarse:flex coarse:min-h-11 coarse:items-center` (the string at `rocker-controls.tsx:419`) |

- **The Automatic button sits right under the thumb's ring.** At the right end of the track the thumb's 44px
  hit area reaches about 16px into the hint line, where the button's own 44px box begins. A tap in that
  overlap goes to the thumb (the thumb's ring is a positioned pseudo-element and paints above the
  unpositioned button), which is the harmless way round: a stray touch drags, it does not reset. It is a
  position that needs the thumb at the far right, which is a start near the centre. The planner confirms
  in `touch-sizing.spec.ts` that both boxes are at least 44px and that the button's own hit area is not
  wholly covered.
- **Nothing new reads height or invents a "phone" variant.** The phone hint line is 44px high on a coarse
  pointer and 16px on a mouse at any width, because that is the pointer's question and no other.
- **A phone held sideways** uses the desktop shell by width and the same rows; a short screen scrolls the
  controls column as it already does.

### 13. Tests this contract implies (the planner writes them)

- **Unit tests** (`lib/geometry/*.test.ts`, expected values from generated fixtures, never typed):
  - `formatThinningStart` / `…Bare` in both systems: `12"` ↔ `30.5 cm`, `25 1/2"` ↔ `64.8 cm`, a
    whole-millimetre round trip, and that 12" never prints `305 mm`.
  - `thinningStartSlider` in both systems: Imperial 1/2" grid; Metric 160 mm to the rounded-inward maximum
    at step 10; thumb drawn off-grid at Automatic's 647.7mm without being snapped; a `toMm` drag snaps.
  - `thinningStartHint` in both systems: `Picked automatically` at the 12" station, `Automatic: 12" is
    too short` / `Automatic: 30.5 cm is too short` further in, `Automatic would be …` by hand.
  - `thinningStartLine` in both systems: thin-spot, sharp-bend, `null` on Automatic, and `null` when the
    printed thinnest thickness equals the printed tip setting.
  - The new `runsOutClause` arm in both systems, and `runsOutCause`'s new order (§10): a station inside
    Automatic's 24" taper with an under-floor tip reads `tipSetting`; a hand-set 8" start causing the spot
    on a good tip reads `thinningStart`.
  - `planingTable` with a blank (the two printed starts, both systems) and with none (`thinning: null`).
  - The 12" row's `From the tip taper` / `From blank` choice, both systems.
  - `slider-row.test.ts`: still exactly `SliderRow` and `sliderValue`, and the ROCKER allowlist still 1.
  - **Guarantees from §3**: Automatic's distance is always a multiple of 1/2"; the resolved start is always
    inside `range`; the same board gives the same Automatic (no flicker).
- **e2e — ROCKER sidebar (`rocker-blanks.spec.ts` / `rocker-cut.spec.ts`):**
  - A picked blank shows `Nose Thinning Starts` and `Tail Thinning Starts` after Tip Style, in that order; the
    no-blank fallback shows neither.
  - A drag changes the row's label and the drawing's mark position with **zero network requests**, and one
    undo returns it.
  - Automatic restores the Automatic distance, is one undo step, and tapping it again does nothing and adds no
    undo step.
  - On a fixture board where a hand-set 12" start leaves a thin spot (model: the picture's Arctic 10'9" LB
    tail at a 2 1/2" center), the too-close line appears, names the Automatic distance, and clears when
    Automatic is pressed.
  - On Automatic at 12" the label's distance ends with the same text as the `Nose @ …` station name in both
    systems.
  - Switching blanks keeps a hand-set start.
  - The updated intro replaces the old text at `rocker-cut.spec.ts:281`; the `From blank` assertion at
    `rocker-blanks.spec.ts:236` still holds for a 12" start.
- **e2e — drawing:** the mark exists for both tips with a blank in `callouts="full"`, in both orientations,
  and is absent with no blank and in the order form's compact box.
- **e2e — DATASHEET:** `THINNING STARTS` and `From tip` exist, the numbers sit under NOSE TIP and TAIL TIP, none
  with no blank.
- **e2e — order form (`summary-planing.spec.ts`):** `[data-planing-thinning]` shows both starts in both systems,
  is absent with no blank, and the page-2 fit assertions (PLANING panel inside its box, the two header rows
  level, Shaper Use Only clear of the footer) still hold on both papers and at every phone width.
- **e2e — touch (`touch-sizing.spec.ts`):** the two Automatic buttons and thumbs are at least 44px with a blank
  picked.
- **Baselines to re-record** (see "What moves on screen without a new control"): ROCKER and VOLUME, at the
  curves step only. The tips step re-records no screenshot, because all five are of the default board and
  it has no blank. The preset cards' litres move at **both** steps; wherever the planner pins them, they
  are re-recorded from the app at each step.

### Open items for the planner

1. **Cost of Automatic inside the list.** Each blank is judged at many placements, and each placement needs
   Automatic's start for both tips. Phase 12's last list slowdown ran 1.3s in Node and about 40s on WebKit
   per keystroke before it was cut (`blank-fit.ts:631-640`). Automatic must be cheap or cached per blank,
   placement and board, with the "no flicker" guarantee (§3). Not a screen question, but it decides whether
   the Thinning Starts slider feels live.
2. **The sharp-bend threshold** (§4): confirm or replace the 1/16"-per-inch default against the stress set.
3. **Whether a board on Automatic can ever end with a `flag`.** The design says never (SPEC acceptance 3). If
   one does, the line must not show (it cannot say "Automatic would cure it"), and the case needs a name.
4. **The saved-board version** and the 6 construction sites (Already done) are the planner's.
5. **Where the preset cards' litres are pinned** (SPEC acceptance 5). Nothing pins them today (Already
   done), and they move at both steps.
6. **A Metric thumb that is not on the 10 mm grid.** An Automatic start such as 647.7 mm is drawn where
   it is and only a drag snaps (§3). Every Metric slider already works this way for a value set in
   Imperial, but check once that the arrow keys behave from an off-grid thumb.

---

## UI Considerations

**43 considerations across 9 surfaces — 43 resolved, 0 open** (40 answered explicitly by this contract, 3 held out as a visual or print check).

Produced by `gsd-core/bin/lib/ui-consideration-probe.cjs` from the nine surfaces listed for it
(E01–E09), with element kinds authored deliberately rather than inferred from prose (the kinds are
recorded under each heading; `static-content` was added to E01 and `list-collection` to E09 on
re-reading them). These are state-coverage questions for the people who build the screens, so,
following the workflow's `--auto` convention as the Phase 9, 11 and 12 contracts did, the
orchestrator confirmed the kinds and resolved every row itself instead of putting 43 question cards
to the founder. Each row is either **✅ covered** (this contract, or the Phase 12 contract it
extends, answers the question outright — lifted as a truth) or **🧪 backstop** (it needs to be seen:
a screenshot in each theme, a print-fit test, the before-and-after pictures — held out as a visual
check, lifted as `{ statement, verification: backstop }`). **Nothing was dismissed** and nothing is
left ⚠ unresolved; every row is a real answer the founder can revisit and overrule. Empty- and
error-state COPY is not restated here: the rows point at the Copywriting Contract above and at the
Phase 12 contract's E2/E3 and F1–F5 entries.

### E01 — Thinning Starts rows (nose and tail)

_Kinds: form, interactive-control, static-content_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | With no blank picked neither Thinning Starts row is on the page (hidden, not disabled) and THICKNESS shows its five plain thickness rows. With a blank picked both rows always show a distance: a board that stores no start reads Automatic, never an empty or valueless slider. | ✅ covered |
| **Loading / in-flight** | The rows never wait on the network. They render from the store's one side profile with the rest of THICKNESS, and a drag updates the label, the hint and the drawing's mark with zero network requests. The blank catalogue streaming in does not delay them. | ✅ covered |
| **Error / failure** | There is no typed field and nothing is refused. A stored start outside the slider's reach (a shortened board, a hand-edited save) is pulled inside the range on read with nothing written, and a start that is not a number reads as Automatic. | ✅ covered |
| **Partial / incomplete** | Each tip is independent: one can be on Automatic while the other is set by hand, and each row shows its own label, hint and button state. A saved board that stores a start for one tip only reads the other as Automatic. | ✅ covered |
| **Overflow / truncation** | At the 260px sidebar floor the widest label (`Nose Thinning Starts — 152.0 cm`, 219.8px) and the widest hint line (`Automatic: 30.5 cm is too short` plus the button, 240.4px) each fit on one line. A hint that ever runs longer wraps beside the button, which never shrinks. | ✅ covered |
| **Long text** | The label always carries exactly one distance through `formatThinningStart` (an Imperial fraction or one-decimal centimetres), and the hint is one of three fixed strings. Nothing truncates or ellipsises; the longest printable values are the ones sized in §12. | ✅ covered |

### E02 — Automatic button

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | The button has no in-flight state. A tap takes effect at once as a local board edit (one undo step) and makes no network request. | ✅ covered |
| **Error / failure** | The button cannot fail. On a tip already on Automatic it is dimmed and inert (`aria-disabled`, out of the tab order, a click does nothing and records no undo step); otherwise a tap always puts that tip back on Automatic. | ✅ covered |
| **Long text** | The visible text is the one word `Automatic` in both unit systems (55.6px at 11px / 700). Its accessible name is `Use Automatic for the nose thinning start` or `…the tail thinning start`. It never wraps or shrinks. | ✅ covered |

### E03 — Too-close line

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The line is running text that wraps: at most four lines at the 260px floor and three on 328 to 358px phones (the longest sentence is 885.4px at 12px). Nothing clips or truncates. While it shows, the rows beneath it move down; the slider being dragged is above it and does not move. | ✅ covered |
| **Long text** | Both sentences come from one pure function and quote only formatted values (distances through `formatThinningStart`, thicknesses through `formatMark`). The line is absent on Automatic and when the printed thinnest thickness equals the printed tip setting, so it never shows an empty or self-contradicting sentence. | ✅ covered |

### E04 — Thinning mark on the side profile

_Kinds: media_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | No mark is drawn with no blank picked, in the order form's compact drawing, or with the callouts off. In those cases the drawing is exactly as it is today. | ✅ covered |
| **Loading / in-flight** | The marks are drawn from the same side profile as the board, in the same render. There is no placeholder and no late-arriving state, and a Thinning Starts drag moves its mark with zero network requests. | ✅ covered |
| **Error / failure** | A mark's position comes from the profile's resolved start, which is always pulled inside the slider's reach, so a mark can never fall off the board. A start that is not a number reads as Automatic and draws at Automatic's distance. | ✅ covered |
| **Populated / happy path** | With a blank picked, ROCKER's full drawing shows two dashed marks (1 unit, dash `4 3`, `--outline-blank-line`) crossing the board at the nose and tail starts with a 6-unit overshoot each side, in both orientations. Checked by eye in a screenshot in each of the four themes: the mark reads as its own line where it meets a 12" leader, and stays faint. | 🧪 backstop |

### E05 — DATASHEET THINNING STARTS block

_Kinds: list-collection, static-content_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | With no blank picked the DATASHEET shows its three hand-set rows and no THINNING STARTS group. | ✅ covered |
| **Loading / in-flight** | The block renders from the side profile with the rest of the sheet. It has no loading state and does not wait for the blank catalogue. | ✅ covered |
| **Error / failure** | The block has no error state. Its two cells always hold the profile's resolved starts (Automatic's pick, or the hand-set value pulled inside the range), never a dash or a blank, and never warning ink. | ✅ covered |
| **Populated / happy path** | With a blank picked, a THINNING STARTS group label follows FOAM OFF with one read-only `From tip` row (`From tip (cm)` in Metric). Its Nose Tip and Tail Tip cells show the two starts bare through `formatThinningStartBare`, in the muted read-only cell treatment. FOAM OFF's Bottom row regains its bottom rule and the new row ends the table without one. | ✅ covered |
| **Partial / incomplete** | The three middle cells (the two 12" stations and Center) are empty in every state. Only the two tip columns ever carry a value, and the sheet shows the distance whether that tip is on Automatic or set by hand. | ✅ covered |
| **Overflow / truncation** | On a phone the block scrolls sideways with the rest of the 540px table, under the same 24px fade, with its row label sticky. The group label takes its own width, and `From tip (cm)` (88.3px) fits the 90.2px label column. | ✅ covered |
| **Zero / one / many** | The block always has exactly one row and exactly two values, nose and tail. There is no zero, one or many case. | ✅ covered |
| **Long text** | The longest cell values are of the order of `59 1/2"` and `152.0`. They sit right-aligned in a station column like every other cell and never wrap. | ✅ covered |

### E06 — Printed thinning line

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The printed paragraph wraps to two lines under the PLANING footnote, breaking before `nose`, and the PLANING panel still fits its box (its `scrollHeight` is not above its `clientHeight`). Proved in `summary-planing.spec.ts`'s fit case with the line present, on both papers and at the phone sheet widths. | 🧪 backstop |
| **Long text** | With the longest values (`nose 152.0, tail 152.0 cm.`, 151.2px of a 185.6px text width at the 12.8px print size) the paragraph is still two lines. In Metric the unit is printed once, at the end. With no blank picked the paragraph is not printed at all. | ✅ covered |

### E07 — THICKNESS intro and the 12" rows' hint

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The intro is running text that wraps: four lines at the 260px floor and three on 328 to 358px phones, in both systems. The 12" row's hint pair (`From the tip taper …` on the left, `Tweak …` on the right) fits one line at 260px in both systems (221.4px at most). | ✅ covered |
| **Long text** | The 12" row's left hint reads `From the tip taper {value}` only when that tip's start is further in than the 12" station, and `From blank {value}` otherwise. The row takes that from the profile's own flag, never from a comparison of its own, and the value is one thickness through `formatMark`. | ✅ covered |

### E08 — Blank list and flag runs-out reason

_Kinds: list-collection, static-content_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | The list's two empty states (**No blank is thick enough**, **No blank passes both rules**) keep their headings and bodies exactly as the Phase 12 contract left them. A start set by hand never adds a new empty state. | ✅ covered |
| **Loading / in-flight** | The reason line arrives with the list's verdicts as it does today. While the catalogue streams in, the list shows its existing loading line, and the picked blank's flag never waits for the catalogue. | ✅ covered |
| **Error / failure** | With the catalogue unavailable the list shows its existing "didn't load" state unchanged. The picked blank's flag still gives the new reason, because it reads the board's own copy of the blank. | ✅ covered |
| **Populated / happy path** | Where a start set by hand is what leaves less than 1/4" (the tip setting itself is above the floor and the board would have had enough foam there on Automatic), the greyed row and the flag read `Less than 1/4" would be left {where} — your {end} thinning starts too close to the tip`. A tip set under the floor reads the tip-setting reason anywhere inside that tip's own taper, however far in it starts. The other three reasons are unchanged. | ✅ covered |
| **Partial / incomplete** | A board with one tip set by hand and the other on Automatic is judged with exactly those two starts, and the reason names the end that caused the thin spot. | ✅ covered |
| **Overflow / truncation** | The new reason is running text and wraps in a list row and in the flag as every reason does today (565.1px at 12px for the longest sentence). Nothing truncates. | ✅ covered |
| **Zero / one / many** | Any number of rows can carry the new reason. Each row still shows one reason, its worst shortfall, and the list's grouping and order are unchanged. | ✅ covered |
| **Long text** | The new clause adds no value of its own to format: `{where}` is the existing where-phrase (`stationLabel` or `formatDim`) and `{end}` is `nose` or `tail`. | ✅ covered |

### E09 — Redrawn curves and numbers (both steps)

_Kinds: media, static-content, list-collection_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Nothing new can be empty. A shaper with no saved boards sees the rack's existing empty state, and no notice, marker or "what's new" element is added anywhere (D-19). | ✅ covered |
| **Loading / in-flight** | Redrawn boards render through the same paths as today. No migration, spinner or "updating" state is shown when a saved board opens on the new curves. | ✅ covered |
| **Error / failure** | A board saved before either step opens without error, reads Automatic on both tips once the tips step is live, and has nothing written to it by being opened. A Phase 11 saved board converts to exactly the numbers it converts to today. | ✅ covered |
| **Populated / happy path** | What moves at each go-live matches the before-and-after pictures the founder approves for it (D-15). At the curves step the ROCKER and VOLUME reference screenshots are re-recorded and RAILS, FINS and TEMPLATE are unchanged; at the tips step no reference screenshot moves. The four preset cards' litres are re-measured from the app at each step, never typed. | 🧪 backstop |
| **Partial / incomplete** | Between the two go-lives the screen is coherent on its own: no Thinning Starts rows, no mark on the drawing, no THINNING STARTS block, no printed thinning line and no new reason, and the THICKNESS intro still says the tips are thinned in the last 12", which is still true then. Every tips-step wording change ships with the tips step, so if the tips wait until after the showing (D-16) nothing on screen refers to them. | ✅ covered |
| **Overflow / truncation** | No text grows. Card and readout numbers keep their formats and widths (litres to one decimal, marks to 1/16" or a whole millimetre), so no card, grid or table reflows. | ✅ covered |
| **Zero / one / many** | The rack shows zero, one or many saved boards exactly as it does today. Every card redraws from the same side profile, with no marker on any card. | ✅ covered |
| **Long text** | The redraw introduces no new text anywhere: D-19 rules out a notice. | ✅ covered |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (`Slider` and `Button` already installed; the rows use `SliderRow` over `Slider`) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry, so the vetting gate has
nothing to run on and is trivially satisfied.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS, with one recommendation (non-blocking): the button reads the single word `Automatic`. Kept: it is the founder's own word for it (D-11) and its accessible name carries the noun
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS, with one recommendation (non-blocking): the 11px link sits beside 12px hint text. Both are existing roles; the link's line height is now pinned in the Typography table
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-02 (gsd-ui-checker VERIFIED, with two non-blocking recommendations; code citations, widths and contrast checked by the orchestrator; UI Considerations populated by the Step 9.5 probe)
