# Phase 7: Metric on Paper - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Everything a shaper puts on paper reads in the system they chose in Phase 5 — the Summary order
form, the Overview Sheet, the Full Sized Template and the Paper Saver (PRNT-01, PRNT-02, PRNT-03,
PRNT-04) — while a 1:1 template still measures dead true against a ruler.

Concretely this phase delivers:

1. **The Summary order form in the chosen system.** Its front-sheet dimension strip, its dims
   line, its rail-band thickness figure and its page-2 fin placement panel compose their own
   imperial strings today and switch here. The drawings and the compact rail table already follow
   the chooser — Phase 6 converted the components they reuse.
2. **The Overview Sheet PDF in the chosen system** — the spec block, the length callout, the
   station labels, the widepoint offset and the template area line.
3. **The Full Sized Template and Paper Saver in the chosen system** — mark labels, the Paper
   Saver's registration lines, the name/dims block, and the how-to box.
4. **A scale-check square captioned in millimetres in Metric**, with the square itself unchanged
   (D-01) — so a metric ruler alone confirms a 1:1 print.
5. **Nothing on paper moved.** No printed geometry changes in either system: the curve, every
   working mark, the page tiling, the alignment box and the scale square are identical, and the
   frozen characterisation pins in `lib/geometry/template.test.ts` stay green without gaining a
   metric branch.

**Out of scope here:** any new control or capability. The export dialog gains no units switch
(D-12) and no new saved preference (D-11); a shaper who wants the other system flips the chooser,
prints, and flips back. Nothing about how a design is stored changes — the preference stays
display-only (UNIT-05, Phase 5 D-16).

**Codebase reality check (2026-09-06):** Phase 6 shipped `lib/geometry/measure-display.ts` — the
one display boundary every design-screen file now formats through (`formatDim`, `formatDimBare`,
`formatMark`, `formatMarkBare`, `formatSignedDim`, `formatLength`, `formatArea`,
`formatCubicVolume`, `stationLabel`, `columnUnitSuffix`) — and closed the conversion ledger in
`lib/units-isolation.test.ts` on all fifteen design-screen display files. The four print surfaces
are what is left. Three of them are plain jsPDF builders taking an options object
(`buildTemplatePdf`, `buildStripPdf`, `buildOverviewPdf`), called from
`components/template/export-preview-dialog.tsx`, which is a client component and can read
`useUnits()`. The fourth, `components/summary/order-form.tsx`, is already a `"use client"`
component and can read the hook directly. `lib/geometry/fins.ts` already tags every fin summary
row with `family: MeasureFamily` (all `mark`), so the order form's fin panel has its unit family
worked out for it. One genuine surprise: `lib/geometry/template.ts` — a pure geometry file whose
output is pinned by frozen fixtures — composes printed label text itself
(`stripRegistrationLabel`, `MARK_LABELS`, `markPlacements`' `label`), importing
`formatInchesFraction` directly.

</domain>

<decisions>
## Implementation Decisions

### The scale-check square (PRNT-04 — the roadmap's one open question, now closed)
- **D-01:** **The square stays exactly 2in in both systems; only its caption changes.** It is
  drawn from `inchesToMm(2)` today in both `build-template-pdf.ts` and `build-strip-pdf.ts` and
  keeps that size in Metric. A 50 mm square would have been a rounder number against a metric
  ruler, but the square's own size feeds where it lands on page 1 (its usual outboard corner, or
  stacked inside the outline on the wide boards where the curve reaches that corner) and how much
  room the how-to box gets beneath it — so a metric square would move printed furniture and would
  force a metric branch into the frozen pins. Keeping it at 2in makes success criterion 5 true by
  construction rather than by proof: **no printed geometry changes anywhere in this phase.**
- **D-02:** **In Metric the caption and the matching how-to line read `50.8 mm`** — the one place
  in the app a millimetre value carries a decimal, because this is a calibration reference rather
  than a shaping mark and it has to agree with what is actually drawn. Caption:
  `50.8 mm x 50.8 mm — measure before taping`; how-to line 2:
  `Measure the 50.8 mm square. It should be exactly 50.8 mm.` The number is derived from the same
  `SCALE_SQUARE_MM` constant the square is drawn from, through a formatter that keeps a tenth —
  never a hand-typed `50.8` and never `formatWholeMm`, which would round it to a `51 mm` that
  disagrees with the square by 0.2 mm. Imperial keeps today's strings exactly.

### What the printed labels say
- **D-03:** **The Paper Saver's registration lines read whole millimetres on both sides** —
  `914 mm from tail — rail 273 mm` where Imperial reads `36" from tail — rail 10 3/4"`. This is
  the same call the shaper made at Phase 6 UAT for fin placement (gaps G-06-12 / G-06-15): a
  shaper reading two numbers on one line wants one unit, not a decimal point to shift in their
  head. Unlike a board width, neither of these numbers appears on any screen, so there is nothing
  to match. — **Reversibility:** costly — the station and the half-width are the Paper Saver's
  only measurements, and their family decides both formatter calls and every metric expectation
  in `build-strip-pdf.test.ts`.
- **D-04:** **The Full Sized Template's mark labels follow Phase 6's table unchanged.** The mark
  name takes the station label (`Nose 30.5 cm` in Metric, from Phase 6 D-03 — the stations
  themselves never move), and the figure beside it is the board's full width there, which is a dim
  and so reads in centimetres: `Nose 30.5 cm — 40.0 cm`, `Centre — 51.4 cm`, `Tail Block —
  15.2 cm`. Nothing new is being decided here; it is written down so the planner does not re-open
  it.
- **D-05:** **The board never moves; text lands where it fits.** In both systems the outline curve,
  every working mark, the page tiling, the alignment box, the registration lines and the scale
  square are identical — that is what the frozen pins prove and what a ruler on the bench checks.
  A *label* is free to sit at a different offset, or break onto two lines, when the metric string
  is a different width from the inch string it replaces; nothing a shaper cuts to depends on where
  the words sit. This is the working definition of success criterion 5 for the planner and the
  verifier: "nothing on paper moved" means the geometry, not the text placement.
- **D-06:** **The template name block's seven-value dims row carries `cm` once, at the end of its
  centimetre values.** `Length 188.0 · Nose 40.0 · Widepoint 51.4 · Offset +2.5 · Tail 36.8 ·
  Thickness 6.7 cm · Volume 34.0 L` — the unit sits on the last centimetre value, with Volume's
  own `L` following it. This is one line of running text wrapped inside a fixed-width box, so a
  unit per value would be seven repetitions and could push the block a line taller.

### The order form on paper
- **D-07:** **Each of the seven dimension cells carries its own unit** — `188.0 cm`, `40.0 cm`,
  `51.4 cm`, `+2.5 cm`, `36.8 cm`, `6.7 cm`, `34.0 L`. This is deliberately the opposite of D-06
  on what is nearly the same list of numbers, and the rule underneath reconciles them: **a unit is
  carried once per line of running text, and a value standing alone in its own box carries its
  own.** The dims row is a wrapped sentence; these are seven separate bordered cells that a reader
  takes one at a time. (Phase 5 D-03 and Phase 6 D-09 are both satisfied by that rule.)
- **D-08:** **Every fin placement value on page 2 carries its own `mm`** — `Off Tail 286 mm`,
  `Off Rail 32 mm`, `Toe 3 mm`, `Full Spread 421 mm`. Every row in `FinSummaryRow` already carries
  `family: "mark"` from Phase 6, so the whole panel is one family; the shaper still wanted the unit
  on each number rather than hoisted into a heading, on the page whose entire job is numbers to cut
  foam to. Metric marks are narrower than the inch fractions they replace, so the width is there.
- **D-09:** **The order form's layout is identical in both systems; a value that overflows shrinks
  rather than clips.** No panel changes shape, gains a heading, or moves between systems. Where a
  metric string does not fit its cell, that value's type steps down until it does. Labels keep
  truncating exactly as they do today. **No measurement ever ends in an ellipsis** on a sheet a
  shaper cuts foam to. Note this is a tighter guarantee than D-05 gives the template, and
  deliberately so: the order form is a designed sheet of fixed panels, the template is a working
  drawing where labels sit beside marks.
- **D-10:** **The Metric print audit is part of finishing this phase, not a follow-up.** Phase 6's
  UAT deferred it here by name: with Metric chosen, open the browser's print preview of
  `/design/summary` and re-run the order form's usual overflow check on every compact panel, on
  **both sheets** and **both paper sizes** (Letter and A4), then again on Imperial to confirm it is
  unchanged. The compact rail table's section headers carry a unit suffix now and those panels clip
  by design, so this is where that gets proven rather than assumed.

### What a shaper picks before printing
- **D-11:** **Paper size stays uncoupled from the units choice.** The export dialog opens on Letter
  in both systems, exactly as today. The paper in the tray is not the same question as the units on
  the tape — plenty of metric shapers print on Letter — and a shaper looks at that button anyway
  before printing something that has to come out at 1:1. No new default, no new saved preference.
- **D-12:** **No per-export units override.** Everything printed follows the gear-menu chooser,
  which is what PRNT-01 to PRNT-04 say. A shaper who needs an inch template for someone else flips
  the chooser, prints, and flips back: the preference is display-only, so that costs nothing and
  reproduces every value exactly (UNIT-05).

### Claude's Discretion
- **The Overview Sheet's spec block.** Its lines follow Phase 6's table with no new decisions
  needed — length as a dim (`188.0 cm`, and the `6'0" - 72"` dual form has no metric counterpart,
  so Metric prints the single figure per Phase 6's outline-callout discretion note), widepoint
  width and tail block as dims in cm, swallow/diamond depth as marks in whole mm, angles and
  percentages unchanged, station labels via `stationLabel`. The **area line** is the one open
  detail: `Template Area: 1234.5 sq in (8.57 sq ft)` becomes cm² through
  `measure-display.ts`'s `formatArea` (Phase 6 D-04's rule), and the second parenthetical is
  dropped in Metric — square feet has no metric equivalent worth printing on this sheet, and the
  volume card set the precedent of one area figure per system.
- **A precision trap in the Overview Sheet worth naming.** `overviewStationLines` decides whether
  to merge WIDEPOINT and CENTER onto one dashed line from the **printed** magnitude of the
  widepoint offset (`formatInchesFraction(...) === '0"'`), deliberately rather than from a raw-float
  epsilon. Metric prints to 0.1 cm (1 mm) where Imperial prints to 1/16in (~1.6 mm), so the merge
  threshold genuinely differs by system — an offset around 1 mm merges on an Imperial sheet and
  not on a Metric one. Keep the existing intent (decide from what is actually printed, in the
  active system) rather than pinning the threshold to one system, and pin both branches with a
  test. This is the Overview Sheet only; it is not 1:1 and no measurement moves, only how many
  dashed lines are drawn.
- **Where printed text is composed.** `lib/geometry/template.ts` composes label text today
  (`stripRegistrationLabel`, `MARK_LABELS`, the `label` on `markPlacements` /
  `stripMarkSegments`) while importing `formatInchesFraction` — a pure geometry file doing display
  work, pinned by frozen fixtures. The planner chooses between threading `UnitsSystem` into those
  functions and moving text composition out to the three PDF builders (which would leave the
  frozen pins pinning geometry, which is what they are for). Either way CLAUDE.md Rule 2 holds:
  every conversion goes through `lib/geometry/units.ts` / `measure-display.ts`, and no builder
  restates a factor. `components/summary/use-print-fit.ts` keeps its own 25.4 — it scales paper
  sizes, not board dimensions.
- **How the system reaches each surface.** `order-form.tsx` is already a client component and can
  read `useUnits()` directly; `export-preview-dialog.tsx` is too and can pass a `system` field into
  the three `Build*PdfOptions` objects. Field name, whether it is required or defaulted, and how
  the existing PDF tests parameterise over both systems are the planner's call.
- **Extending the ledger.** `lib/units-isolation.test.ts`'s conversion ledger closed on the
  design-screen files in Phase 6, with a comment explicitly naming the order form as Phase 7's
  work. Grow it to cover the four print surfaces in the same idiom (a `converted` flag per file,
  a completeness assertion, banned-formatter checks) rather than starting a second mechanism, and
  update that comment with the change rather than leaving it describing the old boundary.
- **The mechanism behind D-09's shrink-to-fit**, number styling, and all plain-English copy
  (the caption wording, the how-to line, any heading text) — including whether the how-to box's
  first line about turning off "Fit to page" needs a word changed. Imperial copy is untouched.
- **Playwright** stays uninstalled unless phase acceptance genuinely needs an end-to-end run (the
  Phase 3/5/6 stance). Formatting, label composition and the PDF builders' text output are all
  unit-testable; the print audit (D-10) is a human check in the browser's print preview.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 7 goal, its five success criteria, and the phase notes naming the
  three jsPDF builders plus the order form, and the rule that a units change is a change to what
  the labels *say* ("if the frozen template pins go red, the change went further than it should
  have")
- `.planning/REQUIREMENTS.md` — PRNT-01, PRNT-02, PRNT-03, PRNT-04 and the v1.1 out-of-scope table
  (no mixed systems, no per-board units, litres only)
- `.planning/PROJECT.md` — the v1.1 milestone section and its key decisions
- `CLAUDE.md` — Rule 1 (geometry pure and tested; never hand-transcribe an expected number),
  Rule 2 (dims in cm to one decimal, marks in whole mm, every conversion through `units.ts`, the
  preference display-only, and the named exception for `components/summary/use-print-fit.ts`), and
  "explain every change in plain English"

### The chain this phase plugs into
- `.planning/phases/06-the-design-screens-in-metric/06-CONTEXT.md` — D-01's full cm/mm
  classification table **including the 2026-09-05 UAT amendment** that moved every fin placement
  number to whole millimetres, D-03 (stations stay at 12in, labelled `@ 30.5 cm`), D-04 (area in
  cm², cubic in cm³), D-09 (a standalone value carries its own unit), D-10 (tables carry it in the
  header)
- `.planning/phases/06-the-design-screens-in-metric/06-VERIFICATION.md` and
  `.planning/phases/06-the-design-screens-in-metric/06-UAT.md` — what shipped, and the deferred
  order-form overflow item this phase picks up as D-10
- `.planning/phases/05-the-units-chooser/05-CONTEXT.md` — D-01 (cm to one decimal), D-03 (a dims
  line carries its unit once at the end; Imperial byte-identical), D-16 (the preference lives
  outside design state)
- `.planning/phases/05-the-units-chooser/05-UI-SPEC.md` — the copywriting contract for metric
  strings

### The display boundary and its guards
- `lib/geometry/measure-display.ts` — the boundary every print surface formats through:
  `formatDim` / `formatDimBare`, `formatMark` / `formatMarkBare`, `formatSignedDim`,
  `formatLength`, `formatArea`, `formatCubicVolume`, `stationLabel`, `columnUnitSuffix`
- `lib/geometry/measure-display.test.ts` — the suite new print-side formatting sits beside
- `lib/geometry/units.ts` + `lib/geometry/units.test.ts` — `inchesToMm` (which `SCALE_SQUARE_MM`
  is derived from), the imperial formatters the print surfaces call today, and where D-02's
  tenth-of-a-millimetre caption formatting belongs
- `lib/units-isolation.test.ts` — the UNIT-05 guard and the conversion ledger; its Phase 6 closing
  comment names the order form as this phase's work. Extend it, do not duplicate it
- `components/units-provider.tsx` — `useUnits()`, mounted once at the root (pinned by
  `units-isolation.test.ts`, which also pins that `app/design/summary/page.tsx` declares no
  provider of its own and that `order-form.tsx` is a client component)

### The four print surfaces
- `components/summary/order-form.tsx` — the two-sheet order form: the `DimensionCell` strip (D-07,
  note its value span uses `truncate`), the dims line at the head of the shape body, the rail-band
  thickness figure, and the page-2 fin placement panel (D-08, a fixed-height `overflow: hidden`
  box that has silently eaten a quad's third section before). Already reads Metric wherever it
  reuses `OutlineViewer`, `RockerViewer` compact callouts, `RailSectionPlot` and `RailDataTable`
  compact
- `components/summary/order-form-primitives.tsx` and `components/summary/use-print-fit.ts` — the
  sheet primitives and the print-fit hook (its own 25.4 is a sanctioned exception: it scales paper,
  not board dimensions)
- `app/design/summary/order-form.css` — the `cqw` type scale D-09's shrink-to-fit works within
- `components/template/build-template-pdf.ts` + `build-template-pdf.test.ts` — the Full Sized
  Template: `SCALE_SQUARE_MM`, `drawScaleSquare`'s caption (D-01/D-02), `templateHowToLines`
  (D-02), `templateMarkDimensionText` / `templateMarkLabelText` (D-04),
  `templateNameBlockDimsText` / `nameBlockContent` (D-06), and the furniture-rect helpers that
  depend on the scale square's footprint
- `components/template/build-strip-pdf.ts` + `build-strip-pdf.test.ts` — the Paper Saver:
  `SCALE_SQUARE_CAPTION_TEXT` (D-02), `drawLabelRows` (D-03), the name block
- `components/template/build-overview-pdf.ts` + `build-overview-pdf.test.ts` — the Overview Sheet:
  `overviewSpecLines`, `overviewLengthLabelText`, `overviewWpOffsetLabelText`,
  `overviewStationLines` (the merge-precision trap named under Claude's Discretion)
- `components/template/export-preview-dialog.tsx` — where all three builders are called and where
  `useUnits()` would be read; also the Letter/A4 buttons D-11 leaves alone

### The geometry behind the printed labels
- `lib/geometry/template.ts` — page tiling, `MARK_LABELS`, `markPlacements`,
  `stripRegistrationLabel`, `stripLabelRows`, `stripMarkSegments`, `scaleSquarePlacement`,
  `howToBoxPlacement`. A pure file that currently composes display text and imports
  `formatInchesFraction`
- `lib/geometry/template.test.ts` — **the frozen characterisation pins** (three `describe` blocks
  marked "frozen, never edit"). Success criterion 5 is that these stay green; D-01 is what makes
  that achievable without a metric branch
- `lib/geometry/fins.ts` — `FinSummaryRow.family`, `FinSummaryGroup.fullSpreadFamily`,
  `FinSummarySection`: the fin panel's unit families are already worked out at the point the
  numbers are computed (D-08)
- `lib/geometry/outline.ts` — `MEASURE_STATION_MM` (the 12in station behind every `@ 30.5 cm`
  label) and `OutlineGeometry`
- `lib/geometry/overview-layout.ts` — the Overview Sheet's own layout maths

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/measure-display.ts` — the whole display boundary Phase 6 built and proved across
  fifteen files. Every printed measurement in this phase formats through it; nothing new needs
  inventing except D-02's tenth-of-a-millimetre caption case.
- `useUnits()` — both surfaces that need the system are already client components
  (`order-form.tsx`, `export-preview-dialog.tsx`), so the hook reaches them without a new provider.
- `FinSummaryRow.family` / `fullSpreadFamily` in `lib/geometry/fins.ts` — the fin panel's
  classification is already carried on the data, so the order form reads it rather than deciding
  it (this is exactly what the field's own doc comment was written for).
- The converted components the order form already reuses — `OutlineViewer`, `RockerViewer`
  compact, `RailSectionPlot`, `RailDataTable` compact — mean roughly half the sheet already
  follows the chooser.
- `lib/units-isolation.test.ts`'s ledger — a working mechanism for pinning "every file in this set
  formats through the boundary", ready to be pointed at the print surfaces.
- The three PDF builders already export their text-composing functions (`templateHowToLines`,
  `templateMarkLabelText`, `templateNameBlockDimsText`, `overviewSpecLines`,
  `overviewLengthLabelText`, `overviewWpOffsetLabelText`) precisely so text can be tested without
  rendering a page — the natural place to parameterise over `UnitsSystem`.

### Established Patterns
- Metric internally (branded `Mm`); conversion only in `lib/geometry/units.ts` /
  `measure-display.ts`; no component or builder restates 25.4 or 10 (CLAUDE.md Rule 2), with
  `use-print-fit.ts` the one documented exception.
- Imperial byte-identical: only the metric branch of any string is new, verified by the existing
  golden, formatter and PDF text tests.
- Source-contract tests (`units-isolation.test.ts`, `theme.test.ts`, `slider-row.test.ts`) are the
  house idiom for pinning behaviour that lives outside pure functions.
- Characterisation pins are frozen and never edited — a red pin means the change went further than
  intended, which is exactly the signal success criterion 5 relies on.
- The founder reviews in the browser between tasks; human-verify checkpoints belong at surface
  boundaries (order form, then each PDF).

### Integration Points
- `export-preview-dialog.tsx` → a `system` field on `BuildTemplatePdfOptions`,
  `BuildStripPdfOptions` and `BuildOverviewPdfOptions`; the Letter/A4 buttons stay as they are
  (D-11).
- `order-form.tsx` → `useUnits()` at the component, values through `measure-display.ts`; the fin
  panel reads each row's own `family`.
- `lib/geometry/template.ts` → the decision point for whether printed text stays in the geometry
  file or moves out to the builders (Claude's Discretion).
- `lib/units-isolation.test.ts` → the ledger grows to the four print surfaces and its closing
  comment is rewritten.
- Nothing touches `lib/geometry/template.ts`'s tiling maths, `scaleSquarePlacement`,
  `MEASURE_STATION_MM`, or any golden fixture — D-01 is what keeps that true.

</code_context>

<specifics>
## Specific Ideas

- The phase's shape in one sentence: **the labels change, the drawing does not.** D-01 is what
  buys that — keeping the scale square at 2in means no printed geometry moves in either system,
  and the frozen pins never need a metric branch to stay honest.
- `50.8 mm` is the app's one millimetre value with a decimal, on purpose. It is not a shaping
  mark; it is the square whose whole job is to prove the printer did not lie, so it has to agree
  with what is drawn rather than with the whole-millimetre house rule.
- Two choices on nearly the same list of numbers went opposite ways on purpose, and the rule
  underneath is worth quoting: **a unit is carried once per line of running text, and a value
  standing alone in its own box carries its own.** The template's wrapped dims row takes `cm` once
  (D-06); the order form's seven bordered cells each take their own (D-07).
- The metric strip line reads `914 mm from tail — rail 273 mm` for the same reason the fin numbers
  moved to millimetres at Phase 6 UAT: a shaper working off a metric tape should never shift a
  decimal point between two numbers on one line.
- "Nothing moved" was given two different strengths deliberately. On the template, the board is
  frozen and text may land where it fits (D-05). On the order form, the layout itself is frozen
  and a value shrinks rather than clips (D-09) — because one is a working drawing and the other is
  a designed sheet.

</specifics>

<deferred>
## Deferred Ideas

- **A per-export units override in the export dialog.** Would let a metric shaper hand an inch
  template to someone who reads inches without touching the chooser. It is a new control and a
  second place units get decided, so it belongs in its own phase with its own requirement. Today's
  answer is that flipping the chooser costs nothing and reproduces every value exactly (D-12).
- **Remember the last paper size a shaper used.** Solves the real annoyance of re-picking Letter or
  A4 on every export, but it is a new saved preference of its own and unrelated to units. Its own
  phase (D-11).
- **`sq ft` on the Overview Sheet.** Imperial keeps its `(8.57 sq ft)` parenthetical; Metric drops
  it rather than inventing a square-metre equivalent. If a metric second area figure is ever
  wanted, it is a copy decision, not a units one.

### Reviewed Todos (not folded)
The pending-todo scan matched eight items on keywords alone; all eight were reviewed and rejected
in Phase 6 for the same reasons, and nothing changed for this phase. None is a printed output.

- **Copy-spec-to-clipboard across the design screens**
  (`.planning/todos/pending/2026-08-21-copy-spec-to-clipboard.md`) — a new capability. When it
  lands, its copied text must read in the chosen system; that is its own phase's problem.
- **Rails: port the INSTRUCTIONS page** (`2026-08-21-rails-instructions-page.md`) — a port with its
  own callouts; keyword match only.
- **Rails viewer: View Full Sized modal and plan view** (`2026-08-21-rails-viewer-extras.md`) —
  matched on "full sized"; it is an on-screen modal, not a printed output.
- **Finished-board photo uploads with ratings**
  (`2026-08-19-add-finished-board-photo-uploads-with-ratings.md`) — unrelated capability.
- **Mobile/phone-width layout polish** (`2026-08-19-mobile-phone-width-layout-polish.md`) —
  unrelated.
- **Fins imported tail uses the generic polynomial curve**
  (`2026-08-21-fins-imported-template-width-branch.md`) — curve behaviour, not units.
- **Extend presets to rail bands and fin setups** (`2026-08-21-presets-for-rails-and-fins.md`) —
  its own capability.
- **Bottom contours** (`2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`)
  — new capability needing its own requirement and roadmap slot.

</deferred>

---

*Phase: 7-Metric on Paper*
*Context gathered: 2026-09-06*
