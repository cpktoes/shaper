# Phase 8: The Rails Screen, Finished - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The rails screen gets the third tab the prototype always had, and the order form learns to
print it. Concretely, a shaper can:

- open **INSTRUCTIONS** beside VIEWER and DATA and read a live example rail cross-section with
  every mark named beside it, flipping the example between **Flat** (3 1/2") and **Domed** (3")
  and watching it reshape (RAIL-02, RAIL-03);
- beneath it, see the **"Turning Marks Into Rail Bands"** figure — a plan and side view of an
  example board showing where the nose, centre and tail sections and their deck-mark, rail-mark
  and tuck lines sit, with nine legend tick-boxes that show or hide each family of line
  (RAIL-05);
- open **"View Full Sized"** from the VIEWER tab and hold a ruler or a piece of foam against a
  rail cross-section drawn at 1:1, with a 2-inch check bar, a one-line caveat about a standard
  screen at 100% zoom, no calibration step, and a Print button that puts the same 1:1 rail on
  paper through the browser (RAIL-04);
- tick **"Include Rail Band Instructions in Print"** — on the rails screen, mirrored beside
  Print Order Form — and have a fixed reference sheet appear as page 3 of the order form, in the
  chosen system; unticked, every printed output is exactly what it was before this milestone
  (PRNT-05, PRNT-06);
- read every new number in the shaper's chosen system under the v1.1 rules: whole millimetres
  for marks in Metric, inches and fractions in Imperial (RAIL-06).

**Not in this phase:** any new geometry (the prototype's `halveDeckMark1` flag is dead code and
is not ported; the plan/side figure is the prototype's fixed example board, not the shaper's
own outline); any change to the three jsPDF outputs under `components/template/`; the phone
layout of any of this (Phase 9 and Phase 10); a calibration flow for the 1:1 view.

</domain>

<decisions>
## Implementation Decisions

### The plan & side reference view (RAIL-05)
- **D-01:** **The figure is the prototype's example board, ported faithfully.** The PNG plan
  outline (`reference/project/assets/rail-bands-plan-bg.png`, moved to `public/`), the
  hand-traced deck-mark, rail-mark and tuck paths (`planRefPaths()` and `sideRefPaths()`,
  `reference/project/Rails.dc.html` lines 671–675, in board-inch viewBox coordinates), the
  `@12"` / `@Center` / `@12"` station labels, the narrow side strip and the "Taper Tuck to a
  Sharp Edge" note. It is a teaching illustration of a generic board, not a drawing of the
  shaper's board, and it needs no geometry. The prototype's `buildBoardOutlinePlot` /
  `buildOffsetOutline` (lines 812–895) compute live inset curves but are **never rendered** —
  do not port them; a live version is a deferred idea below. — **Reversibility:** reversible —
  a live view later would be a new component beside this one, not a rewrite.
- **D-02:** **It lives on the INSTRUCTIONS tab**, beneath the example rail, exactly as the
  prototype lays it out: "Understanding Rail Markings" (example rail + Flat/Domed) on top,
  "Turning Marks Into Rail Bands" (the three-step text, the legend, the figure) below, then the
  italic closing note. One reference page on screen; the same page is what the print sheet
  reproduces (D-08).
- **D-03:** **All nine legend items start ticked** (the prototype's default): Deck Marks 1, Deck
  Band 1, Deck Marks 3, Deck Band 2, Deck Mark 3 Center (full board), Rail Marks 1, Rail Band 1,
  Rail Tucks 1, Tuck blend to hard tail. Legend state is screen-only UI state, like which
  sections are open — it is never saved with a board and never affects the printed sheet (D-08).
- **D-04:** **The instructional copy is kept as written**, with only the units rule applied. The
  three numbered steps and the italic closing note carry over verbatim in Imperial. In Metric the
  two literal figures follow Phase 6's table: "16-22" from the tail" is a position along the
  board (a dim) and reads in centimetres (`41–56 cm`, formatted through the display boundary,
  never hand-typed); the `@12"` station labels read `@ 30.5 cm` via `stationLabel` (Phase 6
  D-03). The side strip's "16-22" off Tail" note follows the same rule.

### The print toggle and its sheet (PRNT-05, PRNT-06)
- **D-05:** **The box starts unticked.** A shaper who never touches it prints exactly the
  two-page, double-sided form they print today — the same "untouched means unchanged" promise
  v1.1 made for units, and precisely what PRNT-06 proves. The prototype's ticked default was
  considered and set aside for that reason.
- **D-06:** **The setting is a shaper preference, like units — it does not live on the board.**
  Ticking it never marks a board dirty, never triggers an autosave, and never enters the design
  snapshot (`lib/models/design-snapshot.ts` is untouched; `DESIGN_SNAPSHOT_VERSION` does not
  change). This mirrors Phase 5 D-16 for units: a saved board reopened after ticking and
  unticking holds exactly the bytes it was saved with. The shaper chose this over storing it on
  the board (the `finSystem` precedent) because it describes how *they* print, not what the board
  is. — **Reversibility:** costly — moving it onto the board later means dropping a production
  column and bumping the snapshot version; moving the other way would have been a version bump
  alone.
- **D-07:** **Full parity with the units machinery.** A nullable column on the existing
  `user_preferences` row (`lib/db/schema.ts`, keyed by `clerk_user_id`), read at render time the
  way `units` is; mirrored in the browser as localStorage plus a cookie so the summary screen
  paints the right page count from its first frame (no blink, Phase 5 D-12); and Phase 5's
  handoff rules verbatim (D-09 to D-11): the account value wins on sign-in and the browser adopts
  it, signing out changes nothing, only an explicit tick is ever stored, and absence means
  unticked — a default is never written. The existing pieces to extend rather than duplicate:
  `components/units-provider.tsx`, `lib/units-preference.ts`, `lib/units-server.ts`,
  `app/actions/units.ts`, `lib/db/queries.ts`. The CLAUDE.md database rule is absolute: push the
  code, let Vercel deploy, only then `npm run db:migrate:prod`. — **Reversibility:** one-way — it
  adds a production column; undoing it needs a second migration.
- **D-08:** **The printed sheet is a fixed reference sheet.** It always shows the **Flat** example
  rail and **every** legend line drawn, whatever the tab's Flat/Domed switch and tick-boxes are
  set to on screen. Two prints of the same board are the same sheet, and the on-screen switch
  and legend stay learning tools rather than print settings. The prototype's
  print-what-you-see behaviour (lines 1546–1580, which printed the current example and only the
  ticked lines) is deliberately not reproduced.
- **D-09:** **The sheet is its own third page, at the back:** order form, shaper's reference,
  then "Rail Band Instructions" as page 3 of 3. Page 2's frozen panels are untouched (Phase 7
  D-09 — the order form's layout never changes and a value shrinks rather than clips). When the
  box is ticked the page marks read "of 3"; unticked they read "of 2" and the output is
  byte-identical. The sheet appears **on screen** in the summary's stack of sheets the moment the
  box is ticked — the order form is measured on screen and printed as measured
  (`components/summary/use-print-fit.ts` walks every `data-order-form-sheet`), so a sheet that
  prints must be a sheet that shows. Do not copy the prototype's `zoom:0.74` constant; the sheet
  is fitted the way the other two are.
- **D-10:** **One preference, two places.** The box sits in the rails sidebar beneath the section
  controls (PRNT-05), and an identical tick-box sits beside the summary screen's Print Order Form
  button, where the third sheet appears as soon as it is ticked. Both read and write the same
  preference; both carry the prototype's label, "Include Rail Band Instructions in Print".
- **D-11:** **PRNT-06's proof is split by pipeline.** The three jsPDF outputs (Overview Sheet,
  Full Sized Template, Paper Saver) are unchanged by construction — `components/template/*` is
  not touched — and are re-proven the way Phase 7 proved them: rebuild every Imperial and Metric
  PDF from the pre-phase commit and diff (07-VERIFICATION.md line 188: 68 pages byte-identical).
  The order form is a browser-printed page, which Phase 7 proved by the units ledger plus a human
  print-preview audit (07-04, Phase 7 D-10), not a PDF diff; the researcher should look for a
  reproducible print-to-PDF diff of `/design/summary` with the box unticked and fall back to the
  Phase 7 D-10 audit if none is practical. Either way the toggle-off order form must be shown
  unchanged in both systems, on both paper sizes.

### View Full Sized (RAIL-04)
- **D-12:** **One toolbar button, section switch inside.** A single "View Full Sized" button in
  the VIEWER tab's toolbar (`components/viewer/toolbar-button.tsx`'s `ViewerToolbarButton`, the
  idiom the other screens' rotate button uses) opens a dialog (`components/ui/dialog.tsx`) with
  Nose / Center / Tail tabs inside, so the shaper flips between rails without closing. The
  prototype's per-plot "View Full Sized: Nose Rail" buttons are not reproduced: one control keeps
  the canvas clean and gives Phase 9 one target to size for a thumb.
- **D-13:** **The 1:1 drawing is the VIEWER plot at true scale**: grid, axis ticks, coloured bands
  and dots exactly as `RailSectionPlot` draws them, with the shared legend beneath — the
  prototype's actual-size output (`plotSvgHtml`, lines 896–930), uncropped. Metric keeps its
  10 mm grid (Phase 6 D-11). Size comes from CSS absolute units (`in`/`mm`) computed through
  `lib/geometry/units.ts`; never multiply by `devicePixelRatio`, never inline 25.4 or 96 in a
  component (`use-print-fit.ts` keeps its own copy on purpose — that convention stays).
- **D-14:** **A 2-inch check bar sits beside the caveat.** It is drawn from the same constant as
  the Full Sized Template's scale-check square and captioned the same way — `2 in` in Imperial,
  `50.8 mm` in Metric, the app's one millimetre value that carries a decimal (Phase 7 D-01/D-02;
  `formatCalibrationMark` in `lib/geometry/measure-display.ts`). It is a passive check, not a
  calibration step: if the bar measures true, the rail does too. There is still no calibration
  flow (Out of Scope in REQUIREMENTS.md).
- **D-15:** **The Print button stays**, and the 1:1 rail reaches paper as a **browser print of the
  dialog's own content** under `@media print` rules, the way the order form prints: the rail in
  CSS inches, the check bar beside it so the paper can be checked too, and a note to turn "Fit to
  page" off. This stays inside the milestone's settled print scope (live React under
  `@media print`); the frozen jsPDF builders are untouched. Ruler-true on paper is proven the
  way Phases 3 and 7 proved it — print, measure the bar and a known mark. This is a new print
  output, so it joins the units-isolation ledger as a converted surface in both systems.
  — **Reversibility:** reversible — removing the button removes the path.
- **D-16:** **The caveat is one plain line** in the sense RAIL-04 gives it — the view assumes a
  standard screen at 100% zoom — with no instruction to calibrate. Exact wording is Claude's
  discretion; the prototype's two sentences (line 489) are the reference, minus the "adjust your
  browser zoom until it does" imperative, which the check bar now answers by itself.

### The example rail and its callouts (RAIL-02, RAIL-03, RAIL-06)
- **D-17:** **Mark names are SVG text via the app's callout primitives.** Labels render as SVG
  `<text>` sized through `components/viewer/callout-primitives.tsx` so they scale with the
  drawing (sketch decision 8, `.planning/sketches/MANIFEST.md`), coloured with
  `RAIL_SEGMENT_COLORS` from `components/rails/rail-section-plot.tsx` so the names match the
  VIEWER legend. The prototype's anchor points (lines 1093–1103: Apex, Domed Taper, Rail Mk1,
  Corner Cut, Deck 3, Deck 2, Deck 1, Tuck 1, Bottom Tuck 1, Bottom Tuck 3, each with a side) and
  its cluster-and-push de-overlap pass (lines 1104–1125) carry over as diagram layout math under
  `components/` — not `lib/geometry/`, which is reserved for shaping geometry. The prototype's
  own 1:1 export already baked these labels as SVG text (line 921), so nothing is lost. The
  floating HTML spans with white halos are not reproduced.
- **D-18:** **Flat / Domed is the app's segmented two-option toggle**, in the card header where
  the prototype's pill buttons sat — the accent-filled, hairline-stroked treatment the fins
  screen's setup toggles already carry. If no shared two-option component exists yet, extract one
  rather than add a third styling; the UI-SPEC settles its exact form.
- **D-19:** **Callouts carry names only** — `Deck 1`, `Rail Mk1`, `Bottom Tuck 3` — never a value.
  The figure explains what each mark *is*; the DATA tab carries the numbers. The tab's only
  figures are then the plot's grid ticks (Phase 6 D-11: 10 mm grid labelled in mm, `mm` once per
  axis, whole-inch grid in Imperial) and any stated example thickness, which is a mark
  (`3 1/2"` / `89 mm`, through `formatMark`).
- **D-20:** **The example rail's inputs are the prototype's, pinned by a golden-fixture entry.**
  The prototype computes it as `computeSection({ thickness: domed ? 3 : 3.5, ratioTopPct: 60,
  family: 3, domed, domedBandBase: 6, scale: 1 })` and plots it with `boardThickness: 3.5,
  railThicknessVal: 3` (lines 1355–1362). The new fixture entry is produced by
  `scripts/extract-prototype-rails-golden.mjs` executing the prototype's own `computeSection` for
  both the Flat and Domed cases, and `lib/geometry/rail-bands.test.ts` pins `computeRailSection`
  against it. `lib/geometry/rail-bands.ts` is not modified and gains no `halveDeckMark1`
  parameter — the flag is inert in the reference (call site line 1359; absent from the parameter
  list on line 704). Never hand-type these numbers.

### Claude's Discretion
- **Copy:** the caveat line (D-16); the third sheet's heading and page-mark title; what the
  summary's "Two portrait pages — print double-sided" note says when there are three pages; the
  1:1 dialog's title; the "Fit to page" note on the 1:1 print.
- **Dialog details:** which rail the 1:1 dialog opens on (the first open section is the obvious
  default); whether `TabbedPanel` is reused inside the dialog or the dialog gets its own switch;
  scroll behaviour when a rail is wider than the viewport.
- **Sidebar placement:** the tick-box sits beneath the section controls in the rails sidebar as a
  `Checkbox` row like the foil-link toggle; exact position and wording of any helper line are the
  UI-SPEC's.
- **Provider shape:** whether `units-provider.tsx` generalises into a preferences provider carrying
  both values or gains a sibling; naming of the column, storage key and cookie; whether the
  server action file grows or a new one appears beside it. Phase 5's rules (D-09 to D-12) hold
  whichever shape is chosen.
- **The figure's fit:** the prototype scaled its 499×630 layout by a hard-coded `0.7492`; port it
  as a box that fits its container, not the constant. How the light PNG reads on the dark themes
  (a light card, as the print pages already force light, is acceptable).
- **Fixture shape:** the name and shape of the new golden entry (the existing entries are
  `{ state, sections }` scenarios; the example rail is a single section result in two states).
- **Ledger:** how the new surfaces join `lib/units-isolation.test.ts` — the INSTRUCTIONS
  components under `components/rails/` join the design-screen list; the 1:1 print and the third
  sheet are print surfaces, and the ledger's print-surface walk covers only `components/summary`
  and `components/template` today, so the planner decides whether to widen the walk or place the
  files where it already looks.
- **Playwright** stays uninstalled this phase (Phase 9 installs it); the 1:1 view and the printed
  sheet are human checks with a ruler and a print preview, stated explicitly in each plan's
  verification.
- **Look and feel** of the INSTRUCTIONS tab, the dialog and the sheet belong to the UI-SPEC
  (`/gsd-ui-phase 8` — the roadmap marks this phase UI hint: yes).

### Folded Todos
- **Rails: port the INSTRUCTIONS page (third tab)**
  (`.planning/todos/pending/2026-08-21-rails-instructions-page.md`, `resolves_phase: 8`) — the
  deliberate deferral from quick task 260818-lm0 that this phase closes. Its notes hold: the page
  is a live example rail, not static artwork; the PNG is in the repo and moves to `public/`; its
  `halveDeckMark1` warning is answered (dead code, D-20).
- **Rails viewer: View Full Sized modal and board-outline plan view**
  (`.planning/todos/pending/2026-08-21-rails-viewer-extras.md`, `resolves_phase: 8`) — both
  items land here: the 1:1 view as D-12 to D-16, the plan view as D-01 to D-03. Its note that
  the shared store removed the plan view's old blocker is true but moot — the shaper chose the
  prototype's example board, so the figure does not read the outline at all.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements and research
- `.planning/ROADMAP.md` — Phase 8 goal, success criteria and the "Settled findings that
  constrain this phase" block (no new geometry, the fixture rule, the order-form-not-jsPDF rule,
  the PNG move, sequencing before Phase 9's shell extraction).
- `.planning/REQUIREMENTS.md` — RAIL-02 to RAIL-06, PRNT-05, PRNT-06; the Future Requirements
  and Out of Scope lists (no calibration, no `halveDeckMark1` variant, no gesture library).
- `.planning/research/SUMMARY.md` — the v1.2 research: stack (CSS absolute units for 1:1, no
  new runtime dependency), the architecture's named components, pitfalls 9–14 for this phase.
- `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` — detail behind the
  summary; where either still treats `halveDeckMark1` as a real variant, the summary and this
  file take precedence.

### The prototype (source of truth for the port)
- `reference/project/Rails.dc.html` — lines 358–478 the INSTRUCTIONS tab markup; 479–493 the
  actual-size modal and its caveat; 671–675 the static plan/side path data; 704 `computeSection`'s
  parameter list; 812–895 the unrendered `buildBoardOutlinePlot` (do not port); 896–930
  `plotSvgHtml` (the 1:1 SVG in CSS inches); 1085–1146 callout anchors and the de-overlap pass;
  1281–1300 the legend definition and colours; 1355–1362 the example rail's inputs; 1546–1580
  the prototype's printed instructions block (content reference only — D-08 changes its
  behaviour).
- `reference/project/assets/rail-bands-plan-bg.png` — the plan-view background, to move to
  `public/`.

### Prior decisions this phase inherits
- `CLAUDE.md` — Rule 1 (geometry pure and tested, fixtures never hand-typed), Rule 2 (dims in cm,
  marks in whole mm, `50.8 mm` the one decimal, a unit once per line of running text), the
  database rule (push, deploy, then migrate production).
- `.planning/milestones/v1.1-phases/07-metric-on-paper/07-CONTEXT.md` — D-01/D-02 (the 2 in
  square and its `50.8 mm` caption, the model for D-14), D-05 and D-09 (what "nothing moved"
  means on the template versus the order form), D-10 (the print audit), D-11/D-12 (paper size
  and units stay uncoupled; no per-export override).
- `.planning/milestones/v1.1-phases/07-metric-on-paper/07-VERIFICATION.md` — line 188: the
  rebuild-and-diff proof (68 pages byte-identical) that D-11 repeats for the jsPDF outputs.
- `.planning/milestones/v1.1-phases/07-metric-on-paper/07-04-SUMMARY.md` — how the order form's
  Imperial output was proven unchanged (ledger plus human print-preview audit).
- `.planning/milestones/v1.1-phases/06-the-design-screens-in-metric/06-CONTEXT.md` — D-01 (the
  cm/mm table), D-03 (stations stay at 12 in, labels read `@ 30.5 cm`), D-09/D-10 (units on
  standalone values and in table headers), D-11 (the rail plot's 10 mm grid).
- `.planning/milestones/v1.1-phases/05-the-units-chooser/05-CONTEXT.md` — D-09 to D-12 (the
  preference handoff rules D-07 reuses verbatim), D-16 (the preference lives outside the board).
- `.planning/sketches/MANIFEST.md` — the callout grammar and decision 8 (labels are SVG text).

### Folded todos
- `.planning/todos/pending/2026-08-21-rails-instructions-page.md`
- `.planning/todos/pending/2026-08-21-rails-viewer-extras.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/rails/rail-section-plot.tsx` — `RailSectionPlot` (with `fit: "width" | "height"`),
  `buildRailLegend`, `computeRailPlotBounds`, `buildRailPlotGrid` (Phase 6's 10 mm grid), and
  `RAIL_SEGMENT_COLORS`. Its header comment says callouts "belong to the out-of-scope
  Instructions page" — that comment is now wrong and should be updated with the change. The
  example rail, the 1:1 drawing and the printed sheet all render through this component (an
  optional callouts prop, or a sibling that composes it), never a second plot.
- `lib/geometry/rail-bands.ts` — `computeRailSection`, `buildRailProfile`, `buildRailSegments`,
  `railPlotBounds`, `computeRailBands`. Untouched by this phase; the example rail is one more
  call with the prototype's inputs (D-20).
- `components/viewer/callout-primitives.tsx` — `CALLOUT_PX`, `useSvgFitScale`,
  `pinnedCalloutSizes`, `DimensionLine`, `CalloutChip`: the label sizing and drafting grammar for
  D-17.
- `components/viewer/toolbar-button.tsx` (`ViewerToolbarButton`, slots 0–3) and
  `components/viewer/tabbed-panel.tsx` (`TabbedPanel`, `PanelTab`) — the third tab and the
  dialog's entry button.
- `components/ui/dialog.tsx`, `components/ui/checkbox.tsx` — the 1:1 dialog and both tick-boxes.
- `components/summary/use-print-fit.ts` — `measurePxPerInch` (a live 1in probe) and the
  per-sheet print fit; it keeps its own 25.4 by convention. `components/summary/order-form.tsx`'s
  `Sheet`, `PageMark`, `FormBox`, `RailLabel` primitives build the third sheet.
- `lib/geometry/measure-display.ts` — `formatMark`, `formatMarkBare`, `formatDim`, `stationLabel`,
  `formatCalibrationMark`, `columnUnitSuffix`: every number on the new surfaces goes through here.
- The units preference stack — `lib/db/schema.ts` (`userPreferences`, nullable `units`),
  `lib/db/queries.ts` (`readUnitsPreference`), `app/actions/units.ts`, `lib/units-preference.ts`
  (+ test), `lib/units-server.ts`, `components/units-provider.tsx` (`useSyncExternalStore`,
  cookie + localStorage mirror, the handoff logic) — the template for D-07.
- `scripts/extract-prototype-rails-golden.mjs` and
  `lib/geometry/__fixtures__/prototype-rails-golden.json` (eleven `{ state, sections }` scenario
  entries) — the fixture pipeline D-20 extends.

### Established Patterns
- Board state lives in `components/design/design-store.tsx` and its snapshot; shaper preferences
  live in a provider outside it (units). UI-only state (open sections, active tab, legend ticks)
  is local component state. D-06/D-07 follow this split exactly.
- Two print pipelines: the order form is live React under `@media print` (fitted per sheet by
  `use-print-fit.ts`, styled by `app/design/summary/order-form.css`, forced light by the
  `@media print` block in `app/globals.css`); the templates are jsPDF builders under
  `components/template/` pinned by frozen fixtures. This phase touches only the first.
- `lib/units-isolation.test.ts` mechanically pins every design-screen and print-surface file as
  converted and bans raw imperial formatters in them; new files join the ledger, they do not
  work around it.
- Golden fixtures are generated by executing the prototype's own functions; expected numbers are
  never typed by hand (CLAUDE.md Rule 1).
- Every screen reads the system through `useUnits()` and formats through the display boundary;
  no component converts on its own (CLAUDE.md Rule 2).

### Integration Points
- `components/rails/rail-band-editor.tsx` — `type RailPage = "viewer" | "data"` and the
  `TabbedPanel` tabs list gain `"instructions"`; the VIEWER toolbar gains the 1:1 button; the
  plot-width solver's `activePage` dependency already handles tab switches. This file is edited
  here and again by Phase 9's shell extraction — land this phase first (roadmap).
- `components/rails/rail-controls.tsx` — the sidebar tick-box beneath the section controls.
- `components/summary/order-form.tsx` — the third `Sheet` after page 2, the `PageMark` "of N"
  text, and the mirror tick-box beside Print Order Form (`data-print-hide` row).
- `app/design/summary/order-form.css` — any per-sheet rules the third sheet needs (the reference
  sheet's own variant is the precedent).
- `public/` — the PNG's new home.
- `lib/db/schema.ts` + a new `drizzle/` migration — the preference column (D-07), applied to
  production only after the code deploys.
- `scripts/extract-prototype-rails-golden.mjs`, `lib/geometry/rail-bands.test.ts`,
  `lib/geometry/__fixtures__/prototype-rails-golden.json` — the example rail's fixture (D-20).
- `lib/units-isolation.test.ts` — new design-screen and print-surface entries.

</code_context>

<specifics>
## Specific Ideas

- "Untouched means unchanged" carried straight over from v1.1 to the print box: a shaper who
  never ticks it prints what they print today, so the box starts unticked (D-05).
- The toggle is about how a shaper prints, not what a board is — that is why it sits with units
  rather than with `finSystem`, even though the board-side path was cheaper (D-06).
- "Two prints of the same board are the same sheet" — the printed instructions never depend on
  where the Flat/Domed switch or the legend happened to be left (D-08).
- The 2-inch bar is the same object as the template's scale square, captioned the same way; it
  is a check you can make, not a step you must take (D-14).
- The prototype's own 1:1 export already drew its labels as SVG text, so D-17 is not a departure
  from the reference so much as picking the half of it that matches the app's sketches.
- The prototype's unrendered offset-curve builder and its inert `halveDeckMark1` flag are the
  same lesson twice: port what the reference *drew*, not what its code could have drawn.

</specifics>

<deferred>
## Deferred Ideas

- **A live plan/side view of the shaper's own board** with deck-mark and rail-mark curves inset
  from the real outline — the prototype's unrendered `buildBoardOutlinePlot` /
  `buildOffsetOutline` is the starting point. New offset-curve geometry under Rule 1 (a module
  in `lib/geometry/`, tests, fixtures), so its own phase with its own requirement. Considered
  and set aside for this phase in favour of the prototype's example board (D-01).
- Already on the roadmap's future list, restated so nobody re-derives them here: extending the
  plan/side figure to the fins and foil screens; a calibrated (credit-card) actual-size view;
  printing from a phone; pinch-zoom on the viewers.

### Reviewed Todos (not folded)
- **Copy-spec-to-clipboard across the design screens**
  (`.planning/todos/pending/2026-08-21-copy-spec-to-clipboard.md`) — a new capability across four
  screens; same verdict as Phases 5–7. When it lands, the rails copy text must read in the chosen
  system.
- **Mobile/phone-width layout polish** (`2026-08-19-mobile-phone-width-layout-polish.md`) —
  Phase 9's job by the roadmap.
- **Finished-board photo uploads with ratings**
  (`2026-08-19-add-finished-board-photo-uploads-with-ratings.md`) — unrelated capability.
- **Fins imported tail uses the generic polynomial curve**
  (`2026-08-21-fins-imported-template-width-branch.md`) — fins curve behaviour, unrelated.
- **Extend presets to rail bands and fin setups** (`2026-08-21-presets-for-rails-and-fins.md`) —
  its own capability.
- **Bottom contours** (`2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`)
  — new capability needing its own requirement and roadmap slot.
- **Brand the order form for paid shapers** (`2026-09-06-brand-the-order-form-for-paid-shapers.md`)
  — the first paid-tier candidate; waits on real shapers using the free version.

</deferred>

---

*Phase: 08-the-rails-screen-finished*
*Context gathered: 2026-09-07*
