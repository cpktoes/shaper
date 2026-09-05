# Phase 6: The Design Screens in Metric - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Every measurement a shaper reads or types on the five design screens — outline (TEMPLATE),
ROCKER, RAILS, FINS and VOLUME — follows the system they chose in Phase 5: cm for length and
widths, whole millimetres for the small stuff, litres for volume either way (SCRN-01, SCRN-02,
SCRN-03, SCRN-05). Sliders, typed fields, viewer callouts, read-outs, data tables and the volume
card all switch; degrees, percentages and litres never change; Imperial stays byte-identical to
today until a shaper touches the chooser.

Concretely this phase delivers:

1. **Every slider** on the five sidebars reading and stepping in the chosen system — metric
   sliders land on whole millimetres (1 cm steps for length), with metric ends sitting just
   inside today's inch ends on that grid.
2. **Typed entry in Metric** wherever a field is typed today (the ROCKER datasheet cells) plus one
   new typed cm field that replaces the feet/inches Selects on the three Board Length controls,
   all through the Phase 5 metric parser and the existing focus/blur/Enter/revert contract.
3. **Viewer callouts, read-outs and tables** — outline widths, rocker heights and thicknesses,
   rail band marks, fin placement numbers, the rail cross-section grid, the volume card — in the
   chosen system, with a fixed rule for where the unit is written.
4. **A complete cm/mm classification** of every number on the five screens (D-01 below), which
   extends Phase 5 D-02 to the numbers it did not name.
5. **Nothing moves.** The units preference stays outside design state; a flip re-labels rendered
   text and never snaps, clamps or rewrites a stored millimetre (UNIT-05, Phase 5 D-16).

**Out of scope here:** everything that comes out of a printer — the Summary order form, the
Overview Sheet, the Full Sized Template and the Paper Saver (Phase 7) — and any new capability.
Some components are shared with the Summary screen (`RailDataTable` compact, `VolumeCalculationCard`
compact, `OutlineViewer`); when they become system-aware the Summary will start reading metric in
those spots. That is an accepted step toward Phase 7, not a defect, exactly as Phase 5's
metric-cards-inch-screens ship state was.

**Codebase reality check (2026-09-05):** Phase 5 shipped the whole chain this phase plugs into.
`components/units-provider.tsx` exposes `useUnits()` → `{ system, setSystem }`, server-rendered
from the cookie/account so there is never a blink. `lib/geometry/units.ts` holds the metric side:
`formatCentimetres` (one decimal, bare), `formatWholeMm` (bare), `roundToWholeMm`, `parseMetric`
(bare number = the field's unit, `cm`/`mm` suffix overrides, fractions and comma decimals rejected),
`mmToCentimetres` / `centimetresToMm`, `MM_PER_CM`, plus `UnitsSystem` / `UNITS_SYSTEMS`. Every
design-screen site still calls the imperial formatters directly and every slider bound is an
inch-domain constant (`BOARD_LENGTH_RANGE_IN`, `WIDEPOINT_WIDTH_RANGE_IN`, `ROCKER_LIFT_RANGE_IN`,
`FOIL_THICKNESS_RANGE_IN`, and the `*_BOUNDS` objects declared inside `fin-controls.tsx`,
`volume-controls.tsx` and `rail-controls.tsx`). The shared `SliderRow`
(`components/design/slider-row.tsx`, Phase 5 05-05) keeps each slider's inch/mm conversion visible
at its call site precisely so the units hook plugs in there. The three Board Length controls
(outline, fins, volume) are hand-rolled — a feet Select + inches Select over a 1"-step slider —
and are named in `slider-row.test.ts`'s allowlist. `ImperialField` (`components/rocker/imperial-field.tsx`)
is the one typed control, used for the ROCKER datasheet's typed cells. The stations everything is
measured at are pinned at 12 in by `MEASURE_STATION_MM` (`lib/geometry/outline.ts`) and every
golden fixture. Litres already read the same everywhere (`toFixed(1)` on cards, `toFixed(2)` on
the volume card) and are unchanged by this phase.

</domain>

<decisions>
## Implementation Decisions

### Which family every number belongs to (extends Phase 5 D-02)
- **D-01:** **Along the board in cm, small stuff in mm.** Positions along the board's length and
  widths read in cm to one decimal (the dims family); small cross-board and up-and-down numbers
  read in whole mm (the marks family). Phase 5 D-02's named members stand; this is the full table
  the planner and executor work from:

  | Reads **cm** (one decimal, `formatCentimetres`) | Reads **whole mm** (`formatWholeMm`) |
  |---|---|
  | Board length (all three sidebars, outline callout, fins summary line) | Rail band marks — every `RailDataTable` value, apex, tucks, deck marks, Bottom Tuck 3, Corner Cut Offset |
  | Widepoint width; nose / centre / tail widths at the stations; the VOLUME screen's Board Width | Tapered rail thickness (the Deck Profile label) and the RAILS per-section thickness sliders (they are the foil's station thicknesses) |
  | Tail block width | Rocker heights — Nose/Tail Rocker sliders, the two `@ 12"` read-outs, datasheet rocker column, viewer rocker callouts |
  | Widepoint offset, signed (`+5.1 cm`, `−2.5 cm`, `0 cm`) | Foil thicknesses — the five ROCKER sliders, datasheet thickness column, viewer thickness callouts |
  | Fin positions off the tail (front, rear, centre; the Forward/Aft position sliders; quad rear off-tail); fins tail width `@ 30.5 cm` | Toe-in; Off-Rail |
  | Toe-aim distances (the toe-aim table) | Fin base length (D-02) |
  | The VOLUME screen's Board Length / Board Width / Center Thickness sliders — the three headline dims, so centre thickness reads `6.7 cm` here | Swallow / diamond tail Depth and crotch depth |
  | The station labels themselves (D-03) | The volume card's tail / centre / nose cross-section thicknesses and the weighted thickness (foil-derived marks: `67 mm` on the same screen whose slider reads `6.7 cm`) |

  Unchanged in both systems: degrees (nose/tail angle, rocker angles, cant), percentages (fullness,
  rail length, deck profile, smoothness, flatness, board type), litres, and every label that is a
  name rather than a measurement. — **Reversibility:** costly — the cm/mm split is baked into which
  formatter each of the ~300 sites calls, and Phase 7 prints the same numbers.
- **D-02:** **Fin base length reads whole mm** (`114 mm`), the way FCS and Futures quote it, so a
  shaper can match a real fin straight off the packet. The Override number box steps 1 mm.
- **D-03:** **Stations stay at exactly 12 inches; their labels read the honest conversion,
  `@ 30.5 cm`.** `MEASURE_STATION_MM` and every golden fixture pin the stations; moving them would
  change rail band, rocker and volume numbers and is its own phase (see Deferred Ideas). The label
  is formatted from the station constant through `formatCentimetres`, never hand-typed. Applies to
  every `12"` in the UI: the ROCKER `Nose @ 12"` / `Tail @ 12"` sliders, read-outs, datasheet
  station names and viewer station names; FINS `Tail Width @ 12"` and the fin data panel's
  `tail @12"`; RAILS `Thickness @12"`. Imperial keeps `12"` exactly as today.
- **D-04:** **The volume card mirrors its imperial lines one for one.** The area line reads in
  cm² (`Board Area (estimated) — 7964 cm²`, `Template Area — 7964 cm² (imported)`) and the
  supporting line under the litres reads in cm³ (`(34020 cm³)`) where Imperial shows `(cu in)`.
  The litres figure itself is untouched and identical on every screen (SCRN-05). Both conversions
  land in `lib/geometry/units.ts` beside `squareMmToSquareInches` — never a `/ 100` in a component.

### Sliders in Metric
- **D-05:** **Steps: 1 cm for length, 1 mm for everything else.** The Board Length slider steps by
  a whole centimetre the way it steps by a whole inch today; every width, position and mark slider
  steps by 1 mm — widepoint width and offset, tail block, tail depth, rocker lifts, foil
  thicknesses, rails thickness, Corner Cut, Bottom Tuck 3, fin positions, toe-in, off-rail, the
  quad rear off-tail override, and the fin base length box. A metric drag stores a whole-millimetre
  value (`roundToWholeMm`), so the stored number and its label always agree. Percent and degree
  sliders keep their steps.
- **D-06:** **Metric ends sit just inside today's ends, on the metric grid.** Each slider's metric
  bounds are its inch bounds rounded inward onto the slider's step (minimum rounded up, maximum
  rounded down): Board Length 153–304 cm (from 60–120 in; FINS 122–365 cm from 48–144 in),
  widepoint width 40.7–63.5 cm (16–25 in), rocker lift 0–228 mm (0–9 in), foil thickness 4–127 mm
  (1/8–5 in), toe-in 0–12 mm (0–1/2 in), off-rail 26–50 mm (1–2 in), fin base 64–190 mm
  (2 1/2–7 1/2 in), and so on for every inch-bounded slider. Every stop is a round number, and
  nothing set in Metric can ever sit outside Imperial's range, so no later imperial drag or typed
  clamp can move a board a metric shaper set. The bounds are computed from the existing inch
  constants by one tested helper in `lib/geometry/units.ts` — never hand-typed per slider — and a
  unit test pins that every metric range lies within its imperial range.
- **D-07:** **Nothing snaps on a flip.** A value set in one system may sit between the other
  system's stops; the slider shows it where it is, the label rounds the way the formatters already
  do (nearest 1/16" or nearest 0.1 cm / 1 mm), and the first drag in the new system lands it on that
  system's grid. Because metric ranges lie inside imperial ones (D-06), no clamp ever fires on a
  flip. This is UNIT-05 restated for sliders: the board is exactly where the shaper left it.
- **D-08:** **One typed cm field replaces the feet/inches Selects on Board Length.** On the outline,
  fins and volume sidebars a Metric shaper sees a typed field above a 1 cm slider where an Imperial
  shaper sees the two Selects; typing `188` or `188.5` lands exactly (`1880 mm` also works, D-04's
  suffix rule), snapped to whole mm and clamped to D-06's bounds, with the same focus → raw string,
  blur/Enter → parse, revert-on-unreadable contract `ImperialField` has today. The Imperial control
  is untouched. The `slider-row.test.ts` allowlist that names the three hand-rolled length controls
  is updated with the change, not worked around.

### Unit marks on callouts, labels and tables
- **D-09:** **Every standalone metric value carries its own unit**, composed by the caller from
  the bare formatter output with a normal space: `Width — 51.4 cm`, `67 mm` in a callout break,
  `+5.1 cm` on the Offset slider, `188.0 cm · 51.4 cm tail @ 30.5 cm` on the fins summary line,
  `67 mm` on the volume card's cross-section rows. cm and mm share a screen, so a per-value unit is
  the only way a number is never misread — the inch mark already does this on every imperial
  value. Imperial strings are untouched.
- **D-10:** **Tables carry the unit in the column header and keep their cells bare.** The rail
  data table gets `(mm)` on its headers, the ROCKER datasheet reads `Width (cm)` / `Thickness (mm)`
  / `Rocker (mm)`, the fin data panel and the toe-aim table put `(cm)` where today's heading
  literally says `(in)`. Cells read `67`, `51.4`. Imperial tables stay exactly as today (cells keep
  their inch marks, headings unchanged).
- **D-11:** **The rail cross-section plot draws a 10 mm grid with ticks labelled in mm** (`0, 10,
  20…`) so the grid matches the mm marks read off the legend and callouts, with `mm` written once
  per axis. Imperial keeps its whole-inch grid.
- **D-12:** **A typed field shows the unit the way the values around it do.** Inside a table whose
  header carries the unit (the datasheet cells) the box reads bare — `67`; standing alone (the
  Board Length field, D-08) the box reads `188.0 cm`, the metric counterpart of the inch mark
  inside today's box. `parseMetric` accepts either form, so the text a shaper sees always
  re-parses; while focused the raw string is seeded from exactly what was shown, as today.

### Claude's Discretion
- **Typed entry details** (area not selected for discussion; sensible defaults). Metric fields read
  metric only, exactly per Phase 5 D-04: a bare number is the field's own unit, a `cm`/`mm` suffix
  overrides, fractions, feet marks and comma decimals return null and the field reverts. Error copy
  follows the imperial line's shape — e.g. *Couldn't read 'x' as millimetres — try a whole number
  like 67, or centimetres like 6.7 cm* — exact wording via the UI-SPEC's copywriting contract.
  Typed values snap to whole mm (the counterpart of `roundToSixteenthInch`) and clamp to D-06's
  metric bounds. Whether `ImperialField` gains a metric sibling or becomes one system-aware
  `MeasureField` is the planner's call; either way no conversion lives in the component.
- **How the system reaches each site** — `useUnits()` in the leaf (the `CardMetadataLine` pattern)
  or `system` threaded as a prop into the viewer/table components — planner's call, subject to
  CLAUDE.md Rule 2: no component converts on its own, and `SliderRow` keeps its conversion at the
  call site. A system-aware formatting layer (e.g. `formatDim(value, system)` /
  `formatMark(value, system)` beside `formatSummaryLine`) is welcome as long as it is pure and
  tested in `lib/geometry/`, and the planner should consider a source-contract test in the
  `lib/units-isolation.test.ts` idiom that fails if a design-screen component calls an imperial
  formatter without going through that layer.
- **The metric bounds helper** — its name and shape (e.g. `metricSliderRange(rangeIn, stepMm)`),
  where each screen keeps its metric range objects, and whether the inch `*_BOUNDS` objects
  declared inside `fin-controls.tsx` / `volume-controls.tsx` / `rail-controls.tsx` move to
  `lib/geometry/` first. The inch constants stay the single source; metric ranges are derived.
- **Model-side snaps stay put.** `roundToSixteenthInch` inside `computeRailBands` (the tapered rail
  thickness) and `deckProfileStep` are math pinned by golden fixtures and do not change per system;
  the metric label simply rounds through `formatWholeMm`. Same for the fins toe/placement models.
- **Imperial after a metric drag** — the imperial label rounds to the nearest 1/16" as the
  formatters already do; no golden changes.
- **The fins Base Length Override box** — `type="number"` in mm, step 1, bounds from D-06.
- **Outline length callout** — Imperial shows `6'2" (74")`; Metric shows `188.0 cm` alone (there
  is no metric equivalent of the feet-and-inches vs total-inches duality). Signed offsets follow
  `formatSignedInchesFraction`'s sign rule (`+`, `−`, unsigned zero).
- **Number styling of the area/volume lines** (decimals, no thousands separators, matching today's
  `toFixed` style), placement of `(mm)` on the rail data table (per section column or the group
  heading), and the exact spot the axis `mm` sits on the rail plot.
- **Rollout order and review cadence** — the founder works one screen at a time with a browser
  review between: prefer one plan per screen (outline, rocker, rails, fins, volume) after a first
  plan that lands the shared pieces (the formatting layer, the metric bounds helper, the typed
  field, the `SliderRow` wiring), with the existing human-verify checkpoints per screen. Deploying
  per wave or at the end of the phase is the planner's call; the ship state after any wave is
  allowed to be part-converted, as Phase 5's was.
- **Playwright** stays uninstalled unless phase acceptance genuinely needs an end-to-end run (the
  Phase 3/5 stance); formatting, parsing, bounds and isolation are all unit-testable.
- **All plain-English copy** and the typography of unit suffixes (same weight and colour as the
  number they follow — the UI-SPEC decides).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 6 goal, its five success criteria and phase notes ("no component
  gets its own conversion"; the metric parser is the counterpart of `imperial-field.tsx`, not a
  second code path inside components)
- `.planning/REQUIREMENTS.md` — SCRN-01, SCRN-02, SCRN-03, SCRN-05 and the v1.1 out-of-scope table
  (no mixed systems, no per-board units, litres only)
- `.planning/PROJECT.md` — the v1.1 milestone section and its three key decisions
- `CLAUDE.md` — Rule 1 (geometry pure and tested; never hand-transcribe an expected number),
  Rule 2 as rewritten in Phase 5 (dims in cm to one decimal, marks in whole mm, every conversion
  through `units.ts`, the preference is display-only), and "explain every change in plain English"

### Phase 5 — the chain this phase plugs into
- `.planning/phases/05-the-units-chooser/05-CONTEXT.md` — D-01 (cm to one decimal), D-02 (dims
  vs marks), D-03 (unit once at the end of a dims line; Imperial byte-identical), D-04 (the metric
  parser contract), D-12 (never a blink), D-16 (preference outside design state)
- `.planning/phases/05-the-units-chooser/05-UI-SPEC.md` — the copywriting contract and the
  composition rule for metric strings this phase extends
- `.planning/phases/05-the-units-chooser/05-VERIFICATION.md` — what actually shipped and how it
  was proven, including the flash-free DOM trace
- `lib/geometry/units.ts` — the boundary: `UnitsSystem`, `UNITS_SYSTEMS`, `MM_PER_CM`,
  `mmToCentimetres`, `centimetresToMm`, `formatCentimetres`, `formatWholeMm`, `roundToWholeMm`,
  `parseMetric`, beside the imperial functions; every new conversion (cm², cm³, the metric bounds
  helper) lands here
- `lib/geometry/units.test.ts` — the suite the new tests sit beside
- `lib/geometry/summary-line.ts` — the one composition pattern already in production (bare
  formatter output, unit added by the caller, two branches on `UnitsSystem`)
- `components/units-provider.tsx` — `useUnits()`; `lib/units-preference.ts` and
  `lib/units-server.ts` — how the preference is stored and resolved (do not touch)
- `lib/units-isolation.test.ts` — the UNIT-05 guard (design store and snapshot cannot see the
  preference; the boundary stays pure); extend it rather than duplicate it
- `components/setup/card-metadata-line.tsx` — the shipped example of a leaf reading `useUnits()`

### The shared controls every screen uses
- `components/design/slider-row.tsx` + `slider-row.test.ts` — `SliderRow`, `sliderValue`, and the
  allowlist naming the three hand-rolled Board Length controls (updated by D-08, not bypassed)
- `components/rocker/imperial-field.tsx` — the typed-entry contract (focus → raw string, blur/Enter
  → parse, clamp, snap, reformat, revert on failure; error line wording) that D-08/D-12 mirror
- `components/viewer/callout-primitives.tsx` — `CalloutChipFrame`, `DimensionTick`, `CALLOUT_PX`;
  the drafting grammar callout values are drawn with
- `.planning/sketches/MANIFEST.md` — the locked callout decisions: values sit in a break in the
  dimension line as SVG `<text>`, nothing inside the outline, outputs on the right rail. (The
  sketches are unpackaged — no findings skill — so cite the manifest directly.)

### Display sites this phase converts (by screen)
- Outline / TEMPLATE: `components/outline/outline-controls.tsx` (Board Length control with the
  feet/inches Selects, Width, Offset, Tail Block, Depth), `components/outline/outline-viewer.tsx`
  (length callout, nose/centre/tail width callouts, widepoint chip, tail block value)
- ROCKER: `components/rocker/rocker-controls.tsx` (two lift sliders, five foil sliders, the two
  `@ 12"` read-outs), `components/rocker/rocker-datasheet.tsx` (typed cells, width row, derived
  cells, station names), `components/rocker/rocker-viewer.tsx` (station callouts and names)
- RAILS: `components/rails/rail-controls.tsx` (per-section thickness, Deck Profile tapered
  thickness label, Corner Cut, Bottom Tuck 3), `components/rails/rail-data-table.tsx`,
  `components/rails/rail-section-plot.tsx` (grid and ticks)
- FINS: `components/fins/fin-controls.tsx` (Board Length control, Tail Width `@ 12"`, three Base
  Length fields with the Override number box, position / toe / off-rail / off-tail sliders),
  `components/fins/fin-viewer.tsx` (toe, lateral and off-tail callouts, summary line, base-length
  legend), `components/fins/fin-data-panel.tsx`, `components/fins/toe-aim-table-modal.tsx`
  (headings literally say `(in)` today)
- VOLUME: `components/volume/volume-controls.tsx` (Board Length control, Board Width, Center
  Thickness), `components/volume/volume-calculation-card.tsx` (area line, cubic line,
  cross-section rows, weighted thickness, dims rows), `components/volume/volume-estimator.tsx`
  (passes the formatted dims labels down)
- Not display sites — leave in inches: the dev-only "copy preset values" builders in
  `outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx`,
  which serialise `inchesToMm(...)` source text for `presets.ts`

### The constants and math the sites read
- `lib/geometry/board.ts` — `BOARD_LENGTH_RANGE_IN`, `WIDEPOINT_WIDTH_RANGE_IN`
- `lib/geometry/rocker.ts` — `ROCKER_LIFT_RANGE_IN`, `noseLiftAt12in` / `tailLiftAt12in`;
  `lib/geometry/outline.ts` — `MEASURE_STATION_MM` (the 12 in station, D-03)
- `lib/geometry/foil.ts` — `FOIL_THICKNESS_RANGE_IN`
- `lib/geometry/rail-bands.ts` — `roundToSixteenthInch` on the model (unchanged),
  `MIN_BOTTOM_TUCK_SEPARATION_IN`, the data-table row model
- `lib/geometry/fins.ts` — `FinMark`, `toeAimTableFor`, the placement result the FINS sites read
- `lib/geometry/volume.ts` — `result.area` (mm²) and `volumeCubicInches` behind the volume card
- `lib/geometry/template.test.ts` — the frozen print pins; they must stay green (nothing this
  phase does touches geometry, and this is the proof)

### Prior phase decisions that bind this one
- `.planning/milestones/v1.0-phases/04-rocker-foil-editors/04-CONTEXT.md` — D-05..D-07 (the
  five-station blank-datasheet language; typed entry exists so a shaper can copy numbers off a
  blank sheet; the datasheet view), D-09 (thickness is one value shared by ROCKER and RAILS)
- `.planning/milestones/v1.0-phases/03-volume-templates-verified-math/03-CONTEXT.md` — the volume
  card's method disclosure and the "one litres figure quoted everywhere" rule (Phase 4 D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useUnits()` (`components/units-provider.tsx`) — the one hook every site reads the system through;
  server-rendered, flash-free, already proven on the setup screen.
- `lib/geometry/units.ts` — `formatCentimetres` / `formatWholeMm` (bare numbers by design, D-01/
  D-03 of Phase 5, so D-09/D-10/D-12 decide where the unit goes), `roundToWholeMm` (the metric
  slider/typed snap), `parseMetric` (D-04 contract), `mmToCentimetres` / `centimetresToMm`.
- `lib/geometry/summary-line.ts` — the two-branch composition pattern (`if (system === "metric")`),
  pure and tested, to copy for every per-value string.
- `SliderRow` (`components/design/slider-row.tsx`) — `value`/`min`/`max`/`step` in the display
  domain, conversion in `onValueChange` at the call site: the exact seam where `system` chooses
  between the inch and metric range, step and formatter.
- `ImperialField` — the whole typed-entry contract, ready to be made system-aware or paired with a
  metric sibling; `Input` from `components/ui/input.tsx` underneath.
- `CalloutChipFrame` / `DimensionTick` — callout values are plain strings handed to these, so a
  metric string drops in where the imperial one is.
- `squareMmToSquareInches` — the model for the cm² / cm³ conversions D-04 adds beside it.

### Established Patterns
- Metric internally (branded `Mm`), conversion only in `units.ts`; the 25.4 and 10 rules live in one
  file, no component restates a factor (CLAUDE.md Rule 2).
- Every exported geometry function is unit-tested; metric expected values come from known
  conversions with provenance comments (the sanctioned exception Phase 4 D-14 and Phase 5 used —
  there is no prototype ancestor for metric).
- Source-contract tests (`units-isolation.test.ts`, `slider-row.test.ts`, `theme.test.ts`) are the
  house idiom for pinning behaviour that lives outside pure functions.
- Imperial byte-identical: the imperial branch of every string is today's string, verified by the
  existing golden and formatter tests; only the metric branch is new.
- The founder reviews in the browser one screen at a time between tasks; human-verify checkpoints
  belong at screen boundaries.

### Integration Points
- The five sidebars: each `SliderRow` call site and the three hand-rolled Board Length controls
  (D-05, D-06, D-08).
- The ROCKER datasheet's typed cells and derived cells; station names in `rocker-datasheet.tsx`,
  `rocker-viewer.tsx`, `rocker-controls.tsx`, `fin-controls.tsx`, `fin-data-panel.tsx`,
  `rail-controls.tsx` (D-03).
- Viewer callouts in `outline-viewer.tsx`, `rocker-viewer.tsx`, `fin-viewer.tsx` (D-09); tables in
  `rail-data-table.tsx`, `rocker-datasheet.tsx`, `fin-data-panel.tsx`, `toe-aim-table-modal.tsx`
  (D-10); the rail plot grid in `rail-section-plot.tsx` (D-11); the volume card (D-04).
- `lib/geometry/units.ts` gains the cm² / cm³ conversions and the metric bounds helper; the inch
  range constants stay where they are and remain the single source.
- Shared-with-Summary components (`RailDataTable` compact, `VolumeCalculationCard` compact,
  `OutlineViewer`) carry the chosen system into the Summary screen wherever they are reused — an
  accepted partial step toward Phase 7.

</code_context>

<specifics>
## Specific Ideas

- The whole discussion read like a metric shaping sheet: a fin `28.6 cm` off the tail with `3 mm`
  of toe-in and a `114 mm` base, widepoint `+5.1 cm`, stations at `30.5 cm`, a `188.0 cm` board on
  a slider running `153–304 cm` in 1 cm steps. Those are the shapes every metric string takes.
- Two picks went against the recommendation, on purpose: the volume card keeps a cm³ line under
  the litres so the card mirrors its imperial lines one for one (D-04), and the rail plot's grid is
  10 mm labelled in mm so the grid matches the mm marks a shaper reads off the plot (D-11).
- "Just inside today's ends" (D-06) was chosen for one reason: nothing a metric shaper sets can
  ever be clamped by an imperial nudge, so the board never moves on a flip (D-07, UNIT-05).
- Honesty over tidiness on the stations (D-03): `30.5 cm` is where the mark really is; `30 cm`
  would read 5 mm off.

</specifics>

<deferred>
## Deferred Ideas

- **30 cm stations for Metric.** A metric blank sheet quotes nose/tail readings at 30 cm; moving the
  app's stations there would change rail band, rocker and volume numbers per system, breaking the
  display-only rule and every golden fixture. If it is ever wanted, it is its own phase with its
  own requirement and fixture regeneration.
- **Cross-system typed entry.** Blank datasheets are printed in inches, so a Metric shaper copying
  one might want to type `1 1/4` into an mm field and have it converted. Phase 5 D-04 deliberately
  rejects fractions in the metric parser (guessing produces a number a shaper might cut to); a
  field-level "unmistakably imperial (`'`, `"`, `/`) → `parseImperial`" route is possible later
  without touching `parseMetric`. Not in this phase.

### Reviewed Todos (not folded)
- **Copy-spec-to-clipboard across the design screens** (`2026-08-21-copy-spec-to-clipboard.md`)
  — new capability; when it lands its copied text must read in the chosen system.
- **Rails: port the INSTRUCTIONS page** (`2026-08-21-rails-instructions-page.md`) — a port with its
  own callouts; keyword match only.
- **Rails viewer: View Full Sized modal and plan view** (`2026-08-21-rails-viewer-extras.md`) —
  keyword match only.
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

*Phase: 6-The Design Screens in Metric*
*Context gathered: 2026-09-05*
