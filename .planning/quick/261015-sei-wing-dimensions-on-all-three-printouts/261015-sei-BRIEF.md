# 261015-sei — wing dimensions on all three printouts (brief for the planner)

The founder, 2026-10-15, after printing a winged swallow board: "I also want to add the wing dimensions
on all 3 export template options." The three are the export dialog's Overview Sheet, Full Sized
Template and Paper Saver (`components/template/export-preview-dialog.tsx`, `artifact` =
`"overview"` | template | `"strip"`). The other half of the same report — the Paper Saver drew a swallow
tail as a straight line — was fixed as fast task 159 (a4b5266): the strip now draws
`computeTailClosure` / `tailClosureSegments` like the Full Sized Template.

## The founder's rulings (asked and answered 2026-10-15 — locked)

1. **Which numbers:** "Same as WINGS card." Each wing prints exactly what its card on the WINGS close-up
   reads (`components/outline/wing-close-up.tsx` ~lines 365-395):
   - name `WING n`, or `WING n · FIN` when the wing is locked (`wingLockEdge(w, i, edges) !== null`);
   - head `${formatMark(w.depth, system)} @ ${formatDim(w.station, system)}` — depth @ distance from the tail;
   - `RUN` `formatMark(w.run, system)`;
   - `RADIUS` `formatMark(effectiveWingRadius(w), system)` — the radius actually drawn, never the asked one;
   - `OFFSET` `formatSignedMark(w.finOffset, system)` — ONLY when locked.
   The wings are `placedWings(outline.wings ?? [], geometry)` — the ones the board draws (clamped,
   ordered), never the raw saved list.
   NOTE the units: on the card a wing's POSITION is a DIM (`formatDim`, cm to one decimal in Metric)
   and depth/run/radius/offset are MARKS (whole mm). Match the card. (The task description's
   "positions are marks" line was the orchestrator's slip — the card, and so the ruling, wins.)
2. **Where, on the Full Sized Template and the Paper Saver:** "Name box + mark line."
   - The wing numbers go in the board's name box, under the existing dims row.
   - PLUS a dashed line across the board at each wing's position (its `station`, the outer corner where
     the step leaves the curve), stringer to curve, labelled like the Nose 12" / Wide point marks —
     e.g. `Wing 1 — 20 1/2" from tail` — so the shaper can mark it on the foam. Station-mark grammar
     (dashed `MARK_STATION_DASH_PATTERN`, `MARK_TICK_LINE_WEIGHT_MM`).
3. **Overview Sheet:** wing lines in the spec list (`overviewSpecLines` in
   `components/template/build-overview-pdf.ts`), right after Swallow Depth / Diamond Depth, before
   Tail Angle.
4. **A board with no wings prints exactly as today** — every frozen digest/fingerprint in
   `lib/geometry/template.test.ts`, `components/template/build-template-pdf.test.ts`,
   `build-strip-pdf.test.ts` and `build-overview-pdf.test.ts` must stay green UNEDITED. Presets have no
   wings, so those pins are the proof.

## What is true today (checked by the orchestrator — confirm, don't re-explore)

- `components/template/export-preview-dialog.tsx` builds ONE `dims` object (seven values) for both the
  template and the strip, and calls `downloadOverviewPdf({ geometry, outline, paper, boardName, system })`,
  `downloadStripPdf({ layout, marks: computeTemplateMarks(outlineGeometry), geometry, paper, boardName, dims, system })`
  and `downloadTemplatePdf({ ...same })`. `outline` comes from the design store and carries `wings`;
  `outlineGeometry` is already the winged geometry (the printed curve already shows the steps — quick
  261014-wii). The store also exposes `wingFinEdges` (`components/design/design-store.tsx` ~line 975),
  which `wingLockEdge` needs to tell a locked wing; `NO_FIN_EDGES` exists in `lib/geometry/wings.ts`.
- Name box: `templateNameBlockDimsText(dims, system)` + `nameBlockContent(doc, dims, system)` in
  `build-template-pdf.ts` — SHARED by the Paper Saver (`build-strip-pdf.ts` imports them). The box
  height comes from `nameBlockContent`, and both builders' furniture placement/collision code
  (`templatePageZeroFurnitureRects`, `nameBlockPlacement`, `stripFurniture`, `stripFurnitureRects`)
  reads that height — so wing lines added THROUGH `nameBlockContent` keep the furniture maths honest.
  Metric dims row carries `cm` once at the end (CLAUDE.md Rule 2, "a unit is carried once per line of
  running text"); a wing line mixes cm (position) and mm (depth/run/radius), so each of its values
  keeps its own unit.
- Marks: `TemplateMarks` / `computeTemplateMarks` / `markLabels` / `markPlacements` /
  `markLineSegments` (tiled) and `stripMarkSegments` / `stripLabelRows` (strip) in
  `lib/geometry/template.ts`. The frozen digests iterate `Object.keys(marks)` — an optional key that is
  ABSENT on a board without wings leaves them byte-identical, but decide deliberately (a separate
  wing-mark path is also fine). Strip mark labels read `${name} — ${formatDim(width)}`; the wing's label
  reads its distance from the tail instead (`Wing 1 — 20 1/2" from tail`, Metric `Wing 1 — 52.1 cm
  from tail`). The strip de-collides label rows per page (`stripLabelRows`); the tiled template has its
  own label placement and furniture avoidance — a wing mark near the tail must not land its label on
  the Tail 12" label or a registration label.
- Overview: `overviewSpecLines(outline, geometry, system)` returns the spec column's lines; the column
  has a fixed height on the page — measure that two wings (and a locked one's offset) still fit on
  Letter and A4 before choosing one line or two per wing.
- Rule 1: positions, segments and label rows belong in `lib/geometry/` (pure, tested); the jsPDF
  builders only draw what they're handed. Every number through `lib/geometry/measure-display.ts` /
  `units.ts`, never a hand-rolled 25.4.

## Working notes for this repo

- No dev server is needed: this is jsPDF + pure geometry. Probe with `npx vitest` and `npx tsx` scripts
  in the scratchpad (a `.ts` file placed in the repo root resolves the `@/` alias — delete it after).
  Do NOT start `next dev` in the main checkout (one per checkout; the founder's may be running).
- A picture of a page: build the PDF with `npx tsx`, then render a page with the macOS PDFKit Swift
  snippet (`page.thumbnail(of:for:)` → PNG). The founder looks at pictures of the three printouts for a
  winged board before anything is pushed.
- Test board: the Fish preset (swallow) with two wings — wing 1 locked to the front fins, wing 2 by
  hand — in both Imperial and Metric, Letter and A4; and a no-wing preset proving nothing moved.
