---
phase: quick-260908-cme
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-section-plot.tsx
  - components/rails/rail-section-plot.test.ts
  - components/rails/rail-callouts.ts
  - components/rails/rail-callouts.test.ts
autonomous: true
requirements: [QT-260908-cme]

estimate:
  tokens: 50000
  raw_tokens: 50000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "Every mark on the example rail has its name at its own spot. Eleven marks, eleven names — one more than today, because Bottom Tuck 2 has always had a point and a line of its own on the drawing and has never had a name."
    - "\"Corner Cut\" reads in the column of names down the right-hand side of the drawing, stacked under \"Rail Mk1\" and above \"Apex\", in the same top-to-bottom order the marks themselves sit in on the rail. It no longer sits on the same line as Rail Mk1 on the other side of the apex, where the two names read as one run of text."
    - "\"Bottom Tuck 1\" and \"Bottom Tuck 3\" sit below the bottom axis, each centred under its own mark, with a thin line running up from the name to the mark it belongs to. Neither name reads beside a mark that isn't its own, which is what \"Bottom Tuck 1 is not at its location\" was describing."
    - "\"Bottom Tuck 2\" is named beside its own point, part way up the tuck, just clear of the two tuck lines that meet there."
    - "The two names below the axis clear the row of numbers along the bottom, and the drawing's box grows downward to hold them, so neither name is cut off by the edge of the picture."
    - "A rail with no second tuck line — a single-tuck rail, or a hard-edged one — has no Bottom Tuck 2 point to name, so that name simply isn't drawn on it and the other ten still are."
    - "No board number changes anywhere in the app. No geometry, no formula, no unit conversion and nothing under lib/geometry/ is touched — this is where names are printed on a teaching drawing, nothing else."
    - "The names are still names only. No number, no unit and no measurement is added to the drawing; the DATA tab stays where a shaper reads the actual measurements."
    - "The three plots on the VIEWER tab, the three on the order form's first sheet and the one in the View Full Sized dialog are pixel-for-pixel what they are today. None of them draws mark names, so none of them ever asks for the extra room."
  artifacts:
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-section-plot.test.ts
    - components/rails/rail-callouts.ts
    - components/rails/rail-callouts.test.ts
  key_links:
    - "`CALLOUT_BOTTOM_PAD` is added to `computeRailPlotBounds`'s returned `height` ONLY, never to `minX`/`minY`/`maxY` — exactly as `CALLOUT_RIGHT_PAD` is added to `width` only (quick task 260908-b35). That is what keeps `railPlotProjection`'s `px`/`py` identical: the room grows the box downward, past the axis, so not one anchor, grid line, tick or segment endpoint moves. Fold it into `minY` instead and every drawn coordinate shifts and the View Full Sized dialog prints at the wrong scale."
    - "`railPlotProjection` must keep calling `computeRailPlotBounds(output, xAxisMin)` with no options object. It reads only `minX` and `maxY`, which neither pad touches."
    - "A below-axis label's position (`x`/`y`) and its mark's position (`anchorX`/`anchorY`) are two different things and both must survive to the render, or the leader line has nothing to point at. `deOverlapCallouts` moves `y` and never `anchorX`/`anchorY`; `buildRailCallouts` sets `anchorX`/`anchorY` to the projected mark point before any `dy` is applied."
    - "The below-axis offset (28) is expressed as a POSITIVE `dy` on the anchor, reusing the same `dy` mechanism the edge lift already uses, so `buildRailCallouts`'s single `py(pos.y) + (anchor.dy ?? 0)` line covers all three cases and nothing special-cases side 0 in the builder. Its value must stay greater than the plot's own `AXIS_LABEL_PAD` (20, module-private in rail-section-plot.tsx) or the name lands back in the row of axis numbers, which is the fault 260908-b35 fixed."
    - "The axis ceiling in `deOverlapCallouts` means \"stay clear of the row of numbers under the plot\". It therefore applies to the sides ABOVE the axis only. Apply it to side 0 as well and the two below-axis names are yanked straight back above the axis, undoing this whole task."
    - "Corner Cut's anchor moving from the prototype's own (−cornerCutDeck, railMark1) to its segment's own apex end (0, cornerCutRail) is a LAYOUT change, not a geometry one. `buildSegmentDefsInches` in lib/geometry/rail-bands.ts still draws the cornerCut segment from exactly the same two endpoints it always has. Only where the word \"Corner Cut\" is printed changes."
    - "Bottom Tuck 2's point is `(-r.bottomTuck2, r.railTuck1 / 2)` — the `tuck2` segment's own p1 in `buildSegmentDefsInches`. Read the anchor from that same expression rather than inventing a second way to locate the point, or the name and the line it labels can drift apart."
    - "`hasTuck2` (`!r.hardEdge && !r.singleTuck`) is already the test `buildRailCallouts` uses to pick Bottom Tuck 3's colour. The same test now also decides whether Bottom Tuck 2 is emitted at all, so the count is eleven for a normal rail and ten for a single-tuck or hard-edged one. Any assertion that pins a fixed count must say which rail it is talking about."
    - "`components/rails/rail-instructions.tsx` is NOT edited. Its call — `deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE)` — is already correct for below-axis names, because the offset lives on the anchors and the ceiling now skips side 0. If this task finds itself needing to change that call, something above has been built wrong."
    - "`components/summary/rail-instructions-sheet.tsx` renders `ExampleRailFigure` for the order form's printed third sheet. It is not edited and inherits both changes; the printed sheet's appearance genuinely changes, so it is looked at in a print preview before this is called done."
---

<objective>
Give every mark on the example rail its own name at its own spot, and put three names that are
currently in the wrong place where they belong: "Corner Cut" joins the column of names down the
right-hand side of the drawing under "Rail Mk1"; "Bottom Tuck 1" and "Bottom Tuck 3" move below the
bottom axis, each centred under its own mark with a thin leader line up to it; and "Bottom Tuck 2",
which has never had a name at all, gets one beside its own point part way up the tuck.

Purpose: the shaper looked at the INSTRUCTIONS tab's "Understanding Rail Markings" figure — the one
drawing whose entire job is to teach what each rail mark is called — and reported three faults in
plain words: "Corner cut is too close to Rail Mk1", "Bottom tuck 1 is not at its location", and
"bottom tuck 2 is missing". All three are true, and two of them are inherited from the prototype's
own name list rather than introduced by the port: the prototype anchored "Corner Cut" three and a
half pixels to the left of the apex at exactly Rail Mk1's height, so the two names printed on one
line either side of the apex, and its list of names never included Bottom Tuck 2 even though the
point and its own coloured tuck line have always been drawn. The third fault is a side effect of
the last two tasks: "Bottom Tuck 1" was lifted and stacked to keep it clear of the axis numbers, and
it now reads right beside the unnamed Bottom Tuck 2 point.

Output: two changes across two source files and their two test files, one commit each. No new
component, no new dependency, no change to any number the app calculates or displays, no file
deleted, and nothing under lib/geometry/ touched.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/STATE.md

@components/rails/rail-callouts.ts
@components/rails/rail-callouts.test.ts
@components/rails/rail-section-plot.tsx
@components/rails/rail-section-plot.test.ts
@components/rails/rail-instructions.tsx
@.planning/quick/260908-bk1-example-rail-mark-names-stack-only-when-/260908-bk1-SUMMARY.md
@.planning/quick/260908-b35-rail-example-callouts-never-crop-or-sit-/260908-b35-SUMMARY.md
</context>

<measured_geometry>
The example rail (Flat state, the prototype's fixed inputs from `ExampleRailFigure`) measured by the
orchestrator in the plot's own pixel space, before any callout room is added: viewBox width 486.8,
apex line at x = 478.4, bottom axis at y = 218.4, deck line at y = 22.4.

| mark | inches | pixel position | note |
|---|---|---|---|
| Rail Mk1 | (0, 1.775) | (478.4, 119.0) | on the apex |
| Corner Cut, apex end | (0, 1.713) | (478.4, 122.5) | 3.5 px under Rail Mk1; deck end is (474.9, 116.6) |
| Apex Center | (0, 1.4) | (478.4, 140.0) | on the apex |
| Tuck 1 | (0, 1.025) | (478.4, 161.0) | on the apex |
| Bottom Tuck 1 | (−0.513, 0) | (449.7, 218.4) | on the axis |
| Bottom Tuck 2 | (−0.256, 0.513) | (464.1, 189.7) | midpoint of the Tuck 1 line, NOT on the axis |
| Bottom Tuck 3 | (−1.025, 0) | (421.0, 218.4) | on the axis |

These are reference values for reasoning, not values to hardcode. Every assertion in the tests
below derives its expected number from the geometry and the projection at run time, exactly as the
existing cases in both test files already do.

Two consequences worth carrying into the work:

1. The right-hand column, after stacking at `RAIL_CALLOUT_MIN_GAP` (17), reads Domed Taper 22.4,
   then Rail Mk1 119.0 → Corner Cut 136 → Apex 153 → Tuck 1 170. The input order of
   `RAIL_CALLOUT_ANCHORS` breaks the Rail Mk1 / Corner Cut tie (they start 3.5 px apart), so Corner
   Cut must sit AFTER Rail Mk1 in that array. Tuck 1 at 170 is still well clear of the ceiling
   (218.4 − 10 = 208.4), so nothing is pulled up.
2. Bottom Tuck 2's label, lifted 6 px to y ≈ 183.7 and reading leftward, spans roughly x 373–460 —
   clear of the Tuck 1 and Tuck 2 lines, which sit at y ≈ 198–208 across x 440–460. Nothing on side
   −1 competes with it low enough to push it: Deck 3 and Deck 1 sit at y ≈ 14.4 and Deck 2 no lower
   than the Rail Band 1 line, so even a competing extent only ever demands y ≥ 31.4, well above
   183.7. It should come out of the de-overlap pass exactly where the builder put it.
</measured_geometry>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: the plot can print a mark name below the axis, with a leader line up to its mark</name>
  <files>components/rails/rail-section-plot.tsx, components/rails/rail-section-plot.test.ts, components/rails/rail-callouts.ts</files>
  <read_first>
    components/rails/rail-section-plot.tsx in full — `CALLOUT_RIGHT_PAD` and its comment,
    `LEFT_PAD` (22), `AXIS_LABEL_PAD` (20), `computeRailPlotBounds`, `railPlotProjection`, the
    x-tick label placement (`ly: py(0) + 16`), and the `callouts?.map` render block at the end with
    its function-local `CALLOUT_TEXT_GAP`.
    components/rails/rail-section-plot.test.ts — the whole `computeRailPlotBounds calloutRoom
    option` describe block, whose four cases this task edits and extends.
    components/rails/rail-callouts.ts lines 60–71 only — the `RailCalloutSide` type and the
    `RailCallout` interface.
    components/viewer/callout-primitives.tsx around line 252 — `DimensionTick`, so the leader line
    is a sibling of it in style (a plain `<line>` in the callout's own colour) rather than a new
    primitive.
  </read_first>
  <behavior>
    - `computeRailPlotBounds(output, xAxisMin)` with no third argument, and with `{ calloutRoom:
      false }`, return the identical box they return today. Both are already asserted; both must
      still pass untouched.
    - `computeRailPlotBounds(output, xAxisMin, { calloutRoom: true })` returns `width` = the plain
      width + `CALLOUT_RIGHT_PAD` AND `height` = the plain height + `CALLOUT_BOTTOM_PAD`, with
      `minX`, `minY` and `maxY` byte-identical to the plain box.
    - The plain box's `height` is still exactly `(maxY - minY) * SCALE + 20` — the frozen chrome
      value the VIEWER stack and the View Full Sized dialog depend on. (New assertion; the sibling
      case that pins the plain `width` to `... + 22` is the model to copy, comment and all.)
    - `railPlotProjection` is unmoved: `py(0)` is still `maxY * SCALE`. Additionally, the distance
      from the axis to the bottom of the box — `bounds.height - py(0)` — grows by exactly
      `CALLOUT_BOTTOM_PAD` when the room is asked for. That is the contract a below-axis label
      depends on, so assert it directly rather than leaving it implied.
  </behavior>
  <action>
    Three edits, all additive, none changing what is drawn today (nothing produces a below-axis
    callout until Task 2).

    (1) components/rails/rail-callouts.ts — TYPE ONLY, no logic. Widen `RailCalloutSide` from
    `1 | -1` to `1 | 0 | -1` and document the three values on the type: `1` reads rightward from its
    own point (the apex column), `-1` reads leftward back toward the plot's left margin, and `0`
    reads centred BELOW the x-axis with a thin leader line running up to the mark it names. Add two
    optional fields to `RailCallout`: `anchorX?: number` and `anchorY?: number`, documented as the
    mark's own projected position — where the mark actually is, as opposed to `x`/`y`, which is
    where its NAME ends up after the de-overlap pass has moved it. They are optional because
    `deOverlapCallouts` accepts any `RailCallout[]`, including the synthetic ones the test file
    builds by hand; `buildRailCallouts` will always set both (Task 2). Make no other change to this
    file in this task — no anchor carries side 0 yet and nothing populates the anchor fields yet, so
    every existing test in rail-callouts.test.ts must stay green with no edit at all.

    (2) components/rails/rail-section-plot.tsx — room, then rendering.

    Add an exported `CALLOUT_BOTTOM_PAD = 34`, sited immediately after `CALLOUT_RIGHT_PAD` and
    written in the same voice as its neighbour: room reserved BELOW the x-axis tick-label band for
    the mark names that read below the axis (Bottom Tuck 1 and Bottom Tuck 3), so they sit inside
    the box instead of being clipped by the SVG's own overflow. Record the arithmetic, because it is
    the whole justification for the number: two label rows one `RAIL_CALLOUT_MIN_GAP` (17) apart,
    beneath the existing `AXIS_LABEL_PAD` (20) band of axis numbers — a first row centred at
    `py(0) + 28` and a second at `py(0) + 45`. The plain box already extends `0.15 * SCALE + 20` ≈
    28.4 units past the axis, so 34 more puts the box floor at about `py(0) + 62`, leaving the lower
    of the two rows about 11 units of clearance below its own text. Export it, unlike `LEFT_PAD` and
    `AXIS_LABEL_PAD`, for the same stated reason `CALLOUT_RIGHT_PAD` is exported: so a test can
    assert the exact difference asking for the room makes instead of restating 34 in a second place.

    In `computeRailPlotBounds`, add `CALLOUT_BOTTOM_PAD` to `height` under the same
    `options?.calloutRoom` flag that already adds `CALLOUT_RIGHT_PAD` to `width`. Update that
    function's doc comment, which currently promises the flag adds "`CALLOUT_RIGHT_PAD` to the
    returned `width` only": it now grows the box in both directions, and the load-bearing half of
    the promise — that `minX`, `minY` and `maxY` never move, so not one drawn coordinate shifts and
    `railPlotProjection` is untouched — is unchanged and must be restated plainly.

    In the `callouts?.map` render block, replace the two-way side test with a three-way placement.
    Introduce a local `isBelow` for `c.side === 0`. Text anchor becomes `middle` when below,
    otherwise `start` for a positive side and `end` for a negative one — note that the existing
    `c.side >= 0` test must become `c.side > 0`, which is identical behaviour for sides 1 and −1 and
    only stops side 0 falling into the rightward branch. Text x becomes `c.x` itself when below
    (centred on its own mark), otherwise today's `c.x ± CALLOUT_TEXT_GAP`. Font, fill, weight,
    family, letter-spacing, text-shadow and `dominantBaseline="middle"` are unchanged for all three.

    A below-axis callout draws NO `DimensionTick` — a 45-degree slash sitting in the middle of the
    word would be noise where the label is already centred on its mark's own x. In its place draw a
    thin vertical leader: a plain `<line>` from `(c.anchorX ?? c.x, (c.anchorY ?? c.y) +
    CALLOUT_LEADER_START_GAP)` down to `(c.x, c.y - CALLOUT_LEADER_END_GAP)`, stroked in the
    callout's own `c.color` at `strokeWidth={1}` with `vectorEffect="non-scaling-stroke"` (matching
    every other hairline in this file). Add `CALLOUT_LEADER_START_GAP = 2` and
    `CALLOUT_LEADER_END_GAP = 7` as function-local constants beside the existing `CALLOUT_TEXT_GAP`,
    with a one-line comment each: the start gap clears the mark's own coloured dot, and the end gap
    clears the cap height of a name whose `y` is its vertical middle. The `?? c.x` / `?? c.y`
    fallbacks are what let this commit compile and pass on its own, before Task 2 starts populating
    the anchor fields; leave a short comment saying so and naming Task 2's builder as the source.
    Sides 1 and −1 keep drawing the `DimensionTick` exactly as today.

    Update the comment above the render block, which currently explains only the two sides, to
    describe all three.

    (3) components/rails/rail-section-plot.test.ts — import `CALLOUT_BOTTOM_PAD`. Rewrite the case
    named "asking for callout room adds exactly CALLOUT_RIGHT_PAD to width and changes nothing else"
    to cover both pads: rename it to say it adds the right pad to width and the bottom pad to
    height, and assert `padded.width` ≈ `plain.width + CALLOUT_RIGHT_PAD`, `padded.height` ≈
    `plain.height + CALLOUT_BOTTOM_PAD`, and `minX`/`minY`/`maxY` strictly equal to the plain box's.
    Leave the "identical box with no third argument and with calloutRoom explicitly false" case
    exactly as it is. Add a new case pinning the plain `height` to `(maxY - minY) * SCALE + 20`,
    written as a sibling of the existing plain-`width` case and carrying the same warning in its
    comment — a change here means the VIEWER stack and the printed full-sized rail both moved.
    Extend the "railPlotProjection is unmoved by the option" case with the axis-to-floor assertion
    from `<behavior>`: `padded.height - py(0)` exceeds `plain.height - py(0)` by exactly
    `CALLOUT_BOTTOM_PAD`, which is the room the below-axis names will live in.

    Expect one small, deliberate, temporary visual change at the end of this commit: the
    INSTRUCTIONS card's example rail now reserves 34 units of empty room below its axis with nothing
    drawn in it yet, so inside its fixed-height card the drawing renders very slightly smaller.
    Task 2 fills that room. Do not "fix" it here.
  </action>
  <verify>
    <automated>npx vitest run components/rails components/summary components/viewer && npx tsc --noEmit 2>&1 | grep -v "LayoutProps" | grep -c "error TS" ; grep -c "CALLOUT_BOTTOM_PAD" components/rails/rail-section-plot.tsx</automated>
  </verify>
  <done>
    `components/rails`, `components/summary` and `components/viewer` suites all green, with
    rail-callouts.test.ts unedited and still passing. `computeRailPlotBounds` grows `height` by
    `CALLOUT_BOTTOM_PAD` only when `calloutRoom` is asked for, and `minX`/`minY`/`maxY` and
    `railPlotProjection` are provably unchanged. `RailCalloutSide` admits 0 and `RailCallout` carries
    optional `anchorX`/`anchorY`. The render block places a side-0 label centred at its own x with a
    leader line and no tick, and places sides 1 and −1 exactly as before. `npx tsc --noEmit` reports
    no errors other than the known phantom `LayoutProps` ones. `components/rails/rail-instructions.tsx`
    and everything under `lib/geometry/` are untouched.
  </done>
  <reversibility rating="reversible">One additive constant, one optional render branch and two optional type fields; reverting is deleting them.</reversibility>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Corner Cut joins the apex column, Bottom Tuck 2 gets its name, and Bottom Tuck 1 and 3 hang under their own marks</name>
  <files>components/rails/rail-callouts.ts, components/rails/rail-callouts.test.ts</files>
  <read_first>
    components/rails/rail-callouts.ts in full, including the file-header comment block, which this
    task rewrites.
    components/rails/rail-callouts.test.ts in full — every case in it is either edited or reasoned
    about below.
    lib/geometry/rail-bands.ts lines 355–382 (`buildSegmentDefsInches`: the `cornerCut` segment's
    own p1 `[0, r.cornerCutRail]`, and the `tuck2` segment's own p1 `[-r.bottomTuck2, r.railTuck1 /
    2]` inside the `else` branch that runs when the rail is neither hard-edged nor single-tucked) —
    READ ONLY, never modified.
    lib/geometry/rail-bands.ts lines 91–114 (`RailSectionResult`) — note `cornerCutRail` is
    `Mm | null`, null exactly when `removeCornerCut` is set, the same shape `cornerCutDeck` already
    has and is already guarded for in this file.
    components/rails/rail-instructions.tsx lines 88–96 — the only caller of
    `buildRailCallouts`/`deOverlapCallouts`, to confirm at the end of the task that its call needs no
    change.
  </read_first>
  <behavior>
    - `RAIL_CALLOUT_ANCHORS` names eleven marks in this exact order, with these sides: Apex (1),
      Domed Taper (1), Rail Mk1 (1), Corner Cut (1), Deck 3 (−1), Deck 2 (−1), Deck 1 (−1), Tuck 1
      (1), Bottom Tuck 1 (0), Bottom Tuck 2 (−1), Bottom Tuck 3 (0).
    - `dy` is carried on exactly five anchors: Deck 3 and Deck 1 at `-RAIL_CALLOUT_EDGE_LIFT`,
      Bottom Tuck 2 at `-RAIL_CALLOUT_TUCK2_LIFT`, and Bottom Tuck 1 and Bottom Tuck 3 at
      `+RAIL_CALLOUT_BELOW_AXIS_OFFSET`. The other six carry none.
    - On the real example rail (Flat and Domed alike, built through `railPlotProjection` as the
      existing cases do), `buildRailCallouts` returns eleven callouts and Corner Cut's raw position
      is `(px(0), py(mmToInches(r.cornerCutRail)))` — its own segment's apex end, not the deck end
      and not Rail Mk1's height.
    - On a single-tuck section (the same example inputs with `singleTuck: true`),
      `buildRailCallouts` returns ten callouts and none of them is named Bottom Tuck 2.
    - Every callout carries `anchorX` = `px` of its mark's own x and `anchorY` = `py` of its mark's
      own y, with no `dy` folded in, and `deOverlapCallouts` never changes either.
    - After `deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, py(0) - RAIL_CALLOUT_AXIS_CLEARANCE)` on
      the real example rail: the four apex-column names read top to bottom in the order Rail Mk1,
      Corner Cut, Apex, Tuck 1, with every adjacent gap at least `RAIL_CALLOUT_MIN_GAP`; Bottom Tuck
      2 sits at exactly `anchorY - RAIL_CALLOUT_TUCK2_LIFT`, unmoved by the pass; Bottom Tuck 1 sits
      at `py(0) + RAIL_CALLOUT_BELOW_AXIS_OFFSET` and Bottom Tuck 3 one `RAIL_CALLOUT_MIN_GAP`
      below it, each still at its own mark's x.
    - No callout on side 1 or side −1 sits lower than `py(0) - RAIL_CALLOUT_AXIS_CLEARANCE`; both
      side-0 callouts sit BELOW `py(0)`, which is the point of them.
    - Every callout's estimated text box lies inside the box `computeRailPlotBounds` returns with
      `{ calloutRoom: true }` — horizontally via the same `calloutTextExtent` the layout pass itself
      uses, vertically within half a `RAIL_CALLOUT_MIN_GAP` of the box's floor.
  </behavior>
  <action>
    Two files. Take the source file first, then bring the test file to the new truth in the same
    commit — several existing cases assert the OLD truth deliberately and must be rewritten, never
    weakened or deleted.

    (1) components/rails/rail-callouts.ts.

    Rewrite the file-header comment. It currently says ten anchors ported character-for-character
    from the prototype, and singles out Corner Cut's `railMark1` y as "the prototype's design, not a
    bug to correct". That is no longer what this file does, and leaving the comment would make it a
    lie. The header must now record the port and its four deliberate departures, each with its
    reason: (a) the text-collision de-overlap rule that replaced the prototype's anchor-x bucketing
    — keep the existing paragraph verbatim, it is still true and still the thing not to "restore
    parity" with; (b) Corner Cut's anchor moved from the prototype's `(-cornerCutDeck, railMark1)`
    to its own segment's apex end `(0, cornerCutRail)`, and its side from −1 to 1, because at the
    prototype's anchor the words "Corner Cut" and "Rail Mk1" printed on one line about 20 px apart
    either side of the apex and read as one run of text — the shaper's own report, quick task
    260908-cme. Say plainly that the corner cut's apex end is 3.5 px below Rail Mk1 on the real
    example rail, so it genuinely IS an apex-column mark and its name belongs in that column,
    stacked under Rail Mk1 in the marks' own top-to-bottom order; and say that this is a layout
    change only, with `buildSegmentDefsInches` still drawing the segment between exactly the same
    two endpoints. (c) Bottom Tuck 2 is a name the prototype's list never had, although the point
    and its own coloured `tuck2` line have always been drawn — added here so no drawn mark on the
    teaching figure is left unnamed. (d) Bottom Tuck 1 and Bottom Tuck 3 are marks ON the bottom
    axis, so their names now hang below it, centred under their own mark with a leader up, rather
    than being lifted above it where they land beside marks that are not theirs.

    Add two exported constants beside the existing ones, each with the same kind of comment its
    neighbours carry. `RAIL_CALLOUT_TUCK2_LIFT = 6`: how far Bottom Tuck 2's name is lifted off its
    own point, because that point is where the Rail Tuck 1 and Rail Tuck 2 lines meet — a name
    centred on it would print across both. `RAIL_CALLOUT_BELOW_AXIS_OFFSET = 28`: how far below the
    bottom axis the first row of below-axis names sits, named as the plot's own module-private
    `AXIS_LABEL_PAD` (20 — the band the row of axis numbers occupies) plus 8 of clearance, so a name
    below the axis clears those numbers rather than landing among them, which is the fault quick
    task 260908-b35 fixed. State that it is a POSITIVE `dy` — the plot's y grows downward — unlike
    `RAIL_CALLOUT_EDGE_LIFT`, which is applied negated.

    Rewrite `RAIL_CALLOUT_ANCHORS` to the eleven entries and sides listed in `<behavior>`, in that
    order. Corner Cut must come immediately after Rail Mk1: the two anchors start 3.5 px apart and
    the de-overlap pass's stable sort falls back to input order, so this array position is what
    fixes Corner Cut under Rail Mk1 rather than over it. Update the array's doc comment: it is no
    longer "the ten marks' fixed identity ... the prototype's own `raw` array order", and `dy` now
    has three jobs, not one — a negative lift off a drawn line (Deck 3, Deck 1), a negative lift off
    the two tuck lines that cross at a point (Bottom Tuck 2), and a positive push below the axis for
    the two side-0 names.

    In `buildRailCallouts`: add `cornerCut: { x: 0, y: mmToInches(r.cornerCutRail ?? r.railMark1) }`
    to `positionsIn` — the `?? r.railMark1` guard covers the `removeCornerCut` case where
    `cornerCutRail` is null and no cornerCut segment is drawn at all, and reproduces exactly where
    the name sits today in that degenerate case; comment it as such rather than leaving a bare `??`.
    Add `bottomTuck2: { x: -mmToInches(r.bottomTuck2), y: mmToInches(r.railTuck1) / 2 }`, with a
    comment naming it as the `tuck2` segment's own p1 in `buildSegmentDefsInches`. Leave
    `bottomTuck1` and `bottomTuck3` at `y: 0` — their move below the axis is the anchor's positive
    `dy`, not a different position, so the single `py(pos.y) + (anchor.dy ?? 0)` line already in the
    map covers it and nothing special-cases side 0 in the builder. Add
    `bottomTuck2: RAIL_SEGMENT_COLORS.tuck2` to the `colors` map. Emit Bottom Tuck 2 only when
    `hasTuck2` — filter the anchors on it, so a single-tuck or hard-edged section simply does not
    produce that callout and the function returns ten instead of eleven; the existing `hasTuck2`
    comment already explains the condition, extend it to cover this second use. Have the map set
    `anchorX: px(pos.x)` and `anchorY: py(pos.y)` alongside `x` and `y`, and note in the comment that
    the anchor pair is the mark's own position with no `dy` in it, so the leader line Task 1's render
    draws points at the mark rather than at wherever the name ended up. Update the function's doc
    comment: eleven marks, ten on a rail with no second tuck line; and the existing note that the
    `dy` lift lands before the de-overlap pass now also covers the below-axis push.

    Export `calloutTextExtent` (it is currently module-private) so a test can check a label's real
    estimated box against the plot's real bounds using the same estimate the layout pass uses,
    rather than a second copy that can drift. Add a side-0 branch to it: a centred extent, half the
    estimated width either side of `c.x`, with no `RAIL_CALLOUT_TEXT_GAP` — a centred label has no
    gap because it has no anchor to stand off from. Change the existing `c.side >= 0` test to
    `c.side > 0` so side 0 does not fall into the rightward branch; behaviour for sides 1 and −1 is
    identical. Update the function's doc comment to describe all three.

    In `deOverlapCallouts`, extend the side loop to `[1, -1, 0]` and guard the ceiling pass so it
    runs for sides 1 and −1 only. The stacking pass needs no change at all: side-0 labels compete
    with each other and with nobody else (`calloutsCompete` already returns false across sides), so
    Bottom Tuck 1 — first in input order at the same y as Bottom Tuck 3 — takes the first row and
    Bottom Tuck 3 is pushed one `minGap` below it into the second. Update the function's doc comment
    to say why side 0 is exempt from the ceiling: that ceiling means "stay clear of the row of
    numbers under the plot", and a name that lives below those numbers by design has nothing to
    clear.

    (2) components/rails/rail-callouts.test.ts. Import the two new constants and
    `calloutTextExtent`; import `CALLOUT_BOTTOM_PAD` from `./rail-section-plot`. Add a small helper
    beside `buildExampleOutput` that builds the same example section with `singleTuck: true`, or
    give `buildExampleOutput` an options argument — whichever keeps the existing call sites
    unchanged.

    Rewrite these existing cases to the new truth, updating each one's NAME and its comment so
    neither still describes the old layout: "names ten anchors in the prototype's own order" →
    eleven names in the new order; "carries the negated edge lift on exactly Deck 3, Deck 1, Bottom
    Tuck 1 and Bottom Tuck 3" → the five-anchor, three-flavour `dy` table from `<behavior>`;
    "returns exactly ten entries, in the prototype's own order" → eleven, new order; "carries side 1
    on Apex, Domed Taper, Rail Mk1 and Tuck 1, and side -1 on the other six" → the full eleven-way
    side map; "also builds a consistent ten entries for the Domed state" → eleven; "lifts Deck 3 and
    Deck 1 one lift above the section's own thickness, and Bottom Tuck 1/3 one lift above zero" →
    Deck 3 and Deck 1 unchanged, Bottom Tuck 1 and 3 now at `0 + RAIL_CALLOUT_BELOW_AXIS_OFFSET`
    under the identity projection, Bottom Tuck 2 at `railTuck1/2 - RAIL_CALLOUT_TUCK2_LIFT`; "leaves
    the four unmoved marks exactly on their own geometry with no lift applied" → Corner Cut's
    expected y becomes `mmToInches(r.cornerCutRail)`, not `mmToInches(r.railMark1)`, and its comment
    must say why that changed; "the real example rail: no callout ends up below the axis ceiling"
    and case "(d) the real example rail, Flat and Domed" → both currently assert the ceiling over
    EVERY callout, which is now wrong for the two below-axis names; narrow each to the callouts on
    sides 1 and −1 and add the matching positive assertion that the side-0 ones sit below `py(0)`;
    the length assertion inside the first of those two goes from ten to eleven. Case "(e) the apex
    column still stacks" now has five side-1 callouts, not four.

    Add these new cases:
    (i) Corner Cut's raw anchor on the real example rail is `(px(0), py(mmToInches(r.cornerCutRail)))`
    — pinning that its name is anchored on the apex at its own segment's apex end.
    (ii) After the de-overlap pass on the real example rail, the four apex-column names read Rail
    Mk1, then Corner Cut, then Apex, then Tuck 1 in ascending y, with each adjacent gap at least
    `RAIL_CALLOUT_MIN_GAP`. Assert the ORDER by name, not just the gaps — the order is the fault the
    shaper reported.
    (iii) Bottom Tuck 2 is present on the example rail with `anchorX` = `px(-mmToInches(r.bottomTuck2))`,
    `anchorY` = `py(mmToInches(r.railTuck1) / 2)`, and `y` = `anchorY - RAIL_CALLOUT_TUCK2_LIFT`
    both before and after the de-overlap pass — it is not moved by anything.
    (iv) Bottom Tuck 1 and Bottom Tuck 3 come out of the de-overlap pass at
    `py(0) + RAIL_CALLOUT_BELOW_AXIS_OFFSET` and one `RAIL_CALLOUT_MIN_GAP` below that respectively,
    each with `x` still equal to its own `anchorX` — a below-axis name never moves sideways off its
    mark.
    (v) Every callout on the example rail carries an `anchorX`/`anchorY` pair, and the de-overlap
    pass returns them untouched (compare the raw and de-overlapped arrays pairwise).
    (vi) A single-tuck section yields ten callouts and no name equal to "Bottom Tuck 2", while a
    normal section yields eleven and does contain it.
    (vii) Every callout's estimated text box lies inside the padded bounds: run `calloutTextExtent`
    over each de-overlapped callout and assert both ends fall within `[0, paddedBounds.width]`, and
    assert `c.y + RAIL_CALLOUT_MIN_GAP / 2` is at most `paddedBounds.height` (half a row gap as a
    conservative stand-in for a line's half-height, rather than inventing a new constant). Build the
    padded bounds with `computeRailPlotBounds(output, output.bounds.xAxisMin, { calloutRoom: true })`
    so the assertion reads against the real box, `CALLOUT_BOTTOM_PAD` and all.

    Finally, open `components/rails/rail-instructions.tsx` and confirm its
    `deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE)`
    call still needs no change. It should not — the below-axis offset lives on the anchors and the
    ceiling now skips side 0. Do not edit that file. If it turns out to need editing, stop and say
    so rather than changing it, because that would mean the offset landed in the wrong place.
  </action>
  <verify>
    <automated>npx vitest run components/rails components/summary components/viewer lib/units-isolation.test.ts && npx tsc --noEmit 2>&1 | grep -v "LayoutProps" | grep -c "error TS" ; git diff --name-only | sort</automated>
  </verify>
  <done>
    `RAIL_CALLOUT_ANCHORS` holds eleven entries in the new order and sides; `buildRailCallouts`
    returns eleven for the example rail and ten for a single-tuck section, with Corner Cut anchored
    at its own segment's apex end and Bottom Tuck 2 at the `tuck2` segment's own p1; every callout
    carries `anchorX`/`anchorY` and the de-overlap pass leaves them alone; the apex column stacks
    Rail Mk1, Corner Cut, Apex, Tuck 1; Bottom Tuck 1 and Bottom Tuck 3 sit below `py(0)` at the
    first and second rows, each at its own mark's x; the ceiling applies to sides 1 and −1 only.
    All four suites green. `git diff --name-only` lists exactly the four files in `files_modified`
    and nothing else; nothing deleted; nothing under `lib/geometry/`, `components/template/`,
    `components/summary/` or `components/viewer/` changed. `npx tsc --noEmit` reports no errors
    other than the known phantom `LayoutProps` ones. Every rewritten test case's name and comments
    describe the new layout, not the old.
  </done>
  <reversibility rating="reversible">Anchor table and layout constants in one file; reverting restores the previous name placement with no data or geometry consequence.</reversibility>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper's browser → INSTRUCTIONS tab | No input crosses here. The example rail is a fixed teaching illustration built from literal inputs (D-20); it never reads the design store, the database or any user text. |
| shared plot component → four render surfaces | `RailSectionPlot` is drawn by the VIEWER tab, the INSTRUCTIONS tab, the order form's first sheet and the View Full Sized dialog. A change to its box reaches all four without a second review. |
| screen component → printed sheets | `ExampleRailFigure` is composed into the order form's printed third sheet, so a screen fix reaches paper unedited. |
| layout module → geometry module | `rail-callouts.ts` reads `RailSectionResult` fields to place names. It must only ever read them. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-cme-01 | Tampering | `computeRailPlotBounds` → `view-full-sized-dialog.tsx` | high | mitigate | The full-sized dialog divides the returned width by `SCALE` to print the rail at its TRUE physical size, and scales width and height together. An unconditionally taller box would print a rail a shaper cuts foam to at the wrong scale. Mitigated by keeping the bottom room behind the same opt-in `calloutRoom` flag the right pad already uses, by that dialog never passing callouts, and by Task 1's tests asserting the plain box is byte-identical and the padded box differs by exactly the two pads and nothing else. |
| T-cme-02 | Tampering | `computeRailPlotBounds` → `rail-band-editor.tsx` VIEWER stack | medium | mitigate | The VIEWER tab derives one shared viewBox width and a SUMMED height from this same function for its three stacked plots — a height change is more dangerous there than the width change of 260908-b35 was, because heights are added together. Same opt-in mitigation, plus the rails and viewer suites in both tasks' gates and a VIEWER-tab look in the browser check. |
| T-cme-03 | Tampering | Corner Cut anchor vs `lib/geometry/rail-bands.ts` | medium | mitigate | Moving Corner Cut's name to `(0, cornerCutRail)` reads a geometry field the callout module did not read before, and could invite "tidying" the segment definition to match. Mitigated by `lib/geometry/` being explicitly out of scope in both tasks, by the rewritten file header recording that this is a layout change only, and by the final gate asserting `git diff --name-only` lists exactly the four in-scope files. |
| T-cme-04 | Tampering | `cornerCutRail` null case | medium | mitigate | `cornerCutRail` is `Mm \| null`, null exactly when `removeCornerCut` is set. Reading it unguarded would place the name at `py(NaN)` and silently drop the label out of the drawing on a corner-cut-removed rail. Mitigated by the explicit `?? r.railMark1` guard, which reproduces today's position for that case, and by the comment stating why. |
| T-cme-05 | Tampering | `hasTuck2` gating of Bottom Tuck 2 | medium | mitigate | A rail with no `tuck2` segment has no such point; naming it anyway would print a name pointing at nothing. Mitigated by reusing the existing `hasTuck2` test as the emission condition and by an explicit single-tuck test case asserting ten callouts and no Bottom Tuck 2. |
| T-cme-06 | Information disclosure | callout content | low | accept | The callouts carry names only, never numeric values (D-19). This task adds one name and moves three; it adds no value, unit or measurement to any of them. |
| T-cme-07 | Tampering | display boundary (`lib/geometry/units.ts`) | low | mitigate | New pixel constants near units-sensitive files could invite an inlined conversion. Mitigated by `lib/units-isolation.test.ts` running in Task 2's gate; every new constant here (34, 28, 6, 2, 7) is a viewBox distance on a drawing, not a board dimension, and carries no conversion factor. |
| T-cme-08 | Tampering | `ExampleRailFigure` as a print surface | medium | mitigate | Both changes reach the order form's printed third sheet with no edit to `rail-instructions-sheet.tsx`. Mitigated by leaving that file untouched so its source-contract test still binds, running the summary suite in both tasks' gates, and requiring a print preview of the third sheet before this is called done. |
| T-cme-09 | Denial of service | plot rendering | low | accept | One extra side in the de-overlap loop and one extra `<line>` per below-axis label, over eleven callouts, once per memoised render. |
| T-cme-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed by this task and none is needed — both changes are constants, arithmetic and SVG elements in existing files. |
</threat_model>

<verification>
- `npx vitest run components/rails components/summary components/viewer lib/units-isolation.test.ts`
  green after each task. Baseline for `components/rails` on clean `main` at planning time:
  **4 test files, 46 tests passed**. This task adds cases and rewrites several, so the count must
  rise and the file count must stay at 4 — record both.
- `npm test` fully green at the end. Baseline measured on clean `main` at planning time:
  **41 test files, 2226 passed, 2 skipped (2228)**. The file count must stay at 41; record the new
  passed count and how many cases were added versus rewritten.
- `npx tsc --noEmit` clean apart from the known phantom `LayoutProps` errors, which are not this
  task's and are expected in a worktree.
- `npm run lint` clean.
- `npm run build` is NOT run from a worktree — Turbopack cannot resolve `next` there.
- `git status` shows exactly the four files in `files_modified` changed, and nothing deleted.
  `components/rails/rail-instructions.tsx` in particular must be unchanged.
- The orchestrator measures the result in a browser on localhost after merging, on the INSTRUCTIONS
  card in both the Flat and the Domed state:
  1. every callout `<text>` bounding box sits inside the SVG's own viewBox;
  2. the right-hand column reads top to bottom Rail Mk1, Corner Cut, Apex, Tuck 1;
  3. "Bottom Tuck 1" and "Bottom Tuck 3" are centred under their own marks, below the row of axis
     numbers, each with a visible leader line up to its mark;
  4. "Bottom Tuck 2" reads leftward from its own mid-tuck point, clear of the two tuck lines;
  5. the VIEWER tab's three plots are unchanged;
  then a screenshot of each state and a print preview of the order form's third sheet.
- One thing to look at specifically in that browser check, flagged at planning time and deliberately
  NOT designed around: Bottom Tuck 3's mark sits at x ≈ 421.0 and the "1" x-axis tick label is
  centred at x ≈ 422.4, so its leader line passes within about 1.4 px of that digit and callouts are
  drawn after the ticks. If it reads as striking through the "1", that is a follow-up task (a
  shortened or offset leader), not a silent expansion of this one.
</verification>

<success_criteria>
- Eleven names on a normal example rail, ten on a single-tuck or hard-edged one, each at its own
  mark.
- "Corner Cut" reads in the apex column between "Rail Mk1" and "Apex", at least
  `RAIL_CALLOUT_MIN_GAP` from each.
- "Bottom Tuck 1" and "Bottom Tuck 3" read below the bottom axis, centred under their own marks,
  clear of the row of axis numbers, each joined to its mark by a leader line, and inside the box.
- "Bottom Tuck 2" reads beside its own mid-tuck point.
- The plain (no-callout) plot box, `railPlotProjection`, the VIEWER tab, the order form's first
  sheet and the View Full Sized dialog are all provably unchanged.
- No number the app calculates or displays changes; nothing under `lib/geometry/` is touched.
- Two commits, one per task, with plain-English subjects a shaper can read, for example:
  `feat(quick-260908-cme): the example rail can name a mark below the axis, with a leader up to it`
  and
  `fix(quick-260908-cme): Corner Cut joins the apex column, Bottom Tuck 2 gets its name, and Bottom Tuck 1 and 3 hang under their own marks`
</success_criteria>

<output>
Create `.planning/quick/260908-cme-every-mark-on-the-example-rail-gets-its-/260908-cme-SUMMARY.md` when done.
</output>
