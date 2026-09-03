---
phase: quick-260903-fqv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/template.ts
  - lib/geometry/template.test.ts
  - components/template/build-template-pdf.ts
  - components/template/build-template-pdf.test.ts
autonomous: true
requirements: [QT-260903-fqv]

estimate:
  tokens: 72000
  raw_tokens: 72000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On page 1 of the Full Sized Template, the how-to instruction box no longer has the rail curve running through it. On a wide-nosed board the box moves inside the outline, sitting directly under the board name + dimensions block with 4mm of clear paper between them, 4mm off the stringer, and at least 4mm of daylight between its outboard edge and the curve."
    - "On a board whose nose is narrow enough that the curve genuinely clears the box's curve-side edge by 4mm over the box's whole height, the box stays exactly where it is today — beside and below the 2in scale square, in the alignment box's top-outward corner. The founder's D-10 placement is kept wherever the board's own shape allows it. Shortboard and midlength print the same as they do now."
    - "It is ONE clearance rule, the existing NAME_BOX_CLEARANCE_MM (4mm), used the same way for the outboard curve check and for the interior containment. No second magic number, and the constant is not renamed."
    - "The decision of WHERE the box goes is pure geometry: a new exported, unit-tested function in lib/geometry/template.ts. The drawing module converts that answer into page millimetres and does no placement arithmetic of its own."
    - "The instruction text, the name + dims block, the 2in scale square and the Paper Saver strip are all untouched. Page 0 still draws exactly three named pieces of furniture, none of them overlapping, all of them inside the page's alignment box."
    - "The how-to box's drawn rectangle and the rectangle the tests check are still the same single computation — nothing can drift between what is printed and what is asserted. The name block's content and placement are computed once per render path and shared with the how-to box, never computed twice."
    - "The two frozen characterisation pins in lib/geometry/template.test.ts (the eight-function cj5 pin and the seven-function 18d pin), the strip pin and the scale-square literal pin all stay green WITHOUT any of their text being edited, because this task adds a function rather than changing one. A red pin means the task broke something and the cause gets fixed — never the digest."
    - "Every expected value in the new tests is derived — from sampleOutline, from the layout's own numbers, or from arithmetic over named constants — never a millimetre figure read back out of what the new code printed (CLAUDE.md Rule 1). Which presets go interior is derived in the test from the geometry, not hard-coded."
  artifacts:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts
  key_links:
    - "The outboard check needs the MAXIMUM outline half-width over the box's station span (the curve's widest point anywhere in the box's height), not the minimum. The module's existing minHalfWidthOverStationSpan takes 5 samples across the span — far too coarse for a 46mm-tall box's maximum, which could hide the curve's widest point between two samples. The new function samples at 1mm and must fold in both endpoints explicitly, because a floating-point `station += 1` loop can stop just short of the top."
    - "The interior box's containment check and the test that verifies it must sample at the same fineness. If the function checks a coarse minimum and the test asserts a 1mm minimum, they can disagree on a board with a non-monotonic taper and the suite will flap."
    - "drawHowToBox and templatePageZeroFurnitureRects must keep sharing one rect computation, and both now need the name block's placement — so the name block's content and placement have to be computed once and handed to both, not recomputed inside each."
  key_facts_verified_at_planning_time:
    - "The how-to box is 70mm wide and 46mm tall for every preset at both paper sizes (8 wrapped lines x 5mm + 2 x 3mm padding — every preset tiles two columns and so gets the fourth 'left to right' instruction)."
    - "Today's outboard box: curve-side (left) edge at half-width 113.2 (Letter) / 107.3 (A4), station span 58.8..104.8 measured from the nose tip. Curve-side clearance today, by preset (Letter / A4): shortboard +48.0/+42.1, fish -4.1/-10.0, midlength +15.6/+9.7, longboard -43.7/-49.6, widest shortboard +28.4/+22.5, widest longboard -61.6/-67.5, noseFullness-100 longboard -55.1/-61.0. Expected outcome to check the derived test against: shortboard, midlength and the widest shortboard stay outboard; fish, longboard, the widest longboard and the noseFullness-100 longboard go interior."
    - "The interior slot fits in every one of those cases with room to spare: minimum curve half-width over the box's span is at least 95mm against a required 78mm (4 + 70 + 4), and the box's bottom sits at least 29mm above page 0's search floor."
    - "templateHowToWrappedLines and nameBlockContent each set their own font family and size before measuring, so hoisting the name-block computation earlier in buildTemplatePdf cannot change how the how-to text wraps."
    - "No station mark lands on page 0 for any preset: the nose-12in mark sits 304.8mm from the tip, and page 0 reaches only 246.7mm (Letter) / 264.3mm (A4) from the tip. The interior box has no marks to collide with."
    - "The existing 'page-0 furniture never overlaps' tests call buildOptions(paper), which is ALWAYS the shortboard's geometry with only boardName swapped — so they never exercise a longboard's page 0. New coverage must use buildOptionsFor(preset, paper) to get real per-preset geometry."
---

<objective>
Stop the rail curve from running through the how-to instruction box on page 1 of the Full Sized
Template.

Page 1 is the nose page. Its instruction box is currently pinned to the top-right corner under the
2in scale square with no knowledge of where the board's own outline is. On a narrow-nosed board
that corner is blank paper and the box reads perfectly. On a wide-nosed board it is not: the
founder saw the longboard's page 1 with the rail curve crossing the instructions corner to corner,
and the measurements confirm it — on the longboard the curve is 44 to 50mm *inside* the box, and
the fish intrudes as well.

There is no outboard position on that page that can hold the box on a wide nose. The blank paper
outside the curve on the nose page is a wedge that only narrows as you go toward the tail, so a
narrower or taller box makes it worse, and swapping the box above the square just reaches the
square instead. So: keep the box where it is whenever the board's shape allows, and move it inside
the outline — directly under the board name + dimensions block — when it doesn't.

Purpose: those instructions are the one thing on the template that stops a shaper cutting foam to
a print that came out at the wrong scale. Instructions with a heavy black curve drawn through them
are instructions that don't get read, and worse, the shaper cuts along that curve and takes the
instructions off with the offcut.

Output: one new pure placement function in `lib/geometry/template.ts`, its call site in the PDF
builder, and derived tests on both sides — with the existing frozen pins proving nothing else in
the tile-grid math moved.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md

@.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-CONTEXT.md
@.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-probe-measurements.txt

@lib/geometry/template.ts
@lib/geometry/template.test.ts
@components/template/build-template-pdf.ts
@components/template/build-template-pdf.test.ts
</context>

<environment>
You run in a git worktree forked from main's HEAD.

- Do NOT run `npm run build` — Turbopack cannot resolve `next` from a worktree. The orchestrator
  runs the build from the main checkout after merge.
- A bare `tsc --noEmit` reports two phantom `LayoutProps` errors in `app/layout.tsx` and
  `app/design/layout.tsx`. Both are known and environmental. Ignore them; do not "fix" them.
- Run `npm test` and `npm run lint`.
- vitest does not type-check. Route every design value through `mm()` and the branded types even
  in tests, or the post-merge build will catch what the suite didn't.
- Do NOT render or eyeball any PDF. Producing the sample PDFs is your job (Task 3); looking at them
  is the orchestrator's. Report the paths, don't judge the pictures.
- Write the SUMMARY to the ABSOLUTE main-checkout path
  `/Users/kontoes/Code/shaper/.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-SUMMARY.md`
  (not a worktree-relative path), and do not commit it.
</environment>

<design_decision>
These are locked by the orchestrator's CONTEXT.md. Implement them; do not re-litigate them.

1. **Hybrid placement.** Outboard (today's position, beside/below the scale square) is the default
   and is kept whenever the outline curve clears the box's curve-side edge by at least
   `NAME_BOX_CLEARANCE_MM` over the box's WHOLE station span. Otherwise the box goes interior:
   top edge 4mm below the name block's bottom, left edge 4mm off the stringer, same width, same
   height.

2. **One constant.** `NAME_BOX_CLEARANCE_MM` (4mm) is the clearance for both the outboard curve
   check and the interior containment. Do not introduce a second clearance number and do not
   rename the constant — it is read across files and by frozen tests. Broadening its doc comment to
   say the 4mm daylight rule now governs page-0 furniture generally is fine and wanted.

3. **The decision is geometry, the conversion is drawing** (CLAUDE.md Rule 1). The new function
   lives in `lib/geometry/template.ts`, is pure and exported, and answers in the board's own
   station/half-width frame. The builder converts through the existing `stationToY` /
   `halfWidthToX`, exactly as `drawNameBlock` already does.

4. **Additive only in `lib/geometry/template.ts`.** `nameBlockPlacement`, `templatePageBoxes`,
   `computeTemplateLayout`, `minHalfWidthOverStationSpan`, `NAME_BLOCK_SEARCH_STEP_MM`,
   `NAME_BLOCK_HEIGHT_SAMPLES` and every strip function keep their current behaviour byte-for-byte.
   That is why the two frozen characterisation pins in `lib/geometry/template.test.ts` stay green
   WITHOUT being edited. **There is no authorised digest recapture in this task.** If a pin goes
   red, this task broke something: find the cause and fix the cause.

5. **Nothing else moves.** The instruction text is unchanged ("Measure the square above" stays true
   in both placements — the square still starts higher on the page). The name block does not move.
   The scale square does not move. The Paper Saver strip is not touched.

Rejected and closed: always-interior (needlessly changes the two presets that print fine today);
narrowing or reflowing the box (dead — a deeper box meets a wider curve); moving the box to another
page (no reliable blank paper); moving the scale square (locked decision D-07).
</design_decision>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add the pure how-to-box placement decision to lib/geometry/template.ts</name>
  <files>lib/geometry/template.ts, lib/geometry/template.test.ts</files>
  <read_first>
    `lib/geometry/template.ts` lines 560-700 — `templatePageBoxes`, the private
    `NAME_BLOCK_SEARCH_STEP_MM` / `NAME_BLOCK_HEIGHT_SAMPLES` / `minHalfWidthOverStationSpan`
    helpers, and `nameBlockPlacement`. The new function mirrors `nameBlockPlacement`'s shape:
    same page-0 search floor and ceiling, same 1mm downward scan, same documented last-resort
    fallback. Read it so the new code reads as its sibling, not as a stranger.
  </read_first>
  <behavior>
    New exported `howToBoxPlacement(layout, geometry, candidate, boxWidthMm, boxHeightMm,
    nameBlockPlacement, nameBlockHeightMm, clearanceMm = NAME_BOX_CLEARANCE_MM)` returning
    `{ pageIndex, topStation, halfWidthStart, position: "outboard" | "interior" }`, where
    `candidate` is the caller's outboard proposal `{ topStation, halfWidthStart }` in the board's
    own frame (`topStation` = the box's nose-most edge; `halfWidthStart` = its curve-side left
    edge, measured out from the stringer).

    - Outboard is preferred: if the MAXIMUM outline half-width anywhere across
      `[candidate.topStation - boxHeightMm, candidate.topStation]` is at least `clearanceMm` less
      than `candidate.halfWidthStart`, return the candidate unchanged with `position: "outboard"`.
    - Otherwise interior: `halfWidthStart = clearanceMm`, and `topStation` starts at
      `nameBlockPlacement.topStation - nameBlockHeightMm - clearanceMm` (the name block's bottom
      edge, minus the 4mm gap). Accept it when the MINIMUM outline half-width across the box's
      whole station span is at least `clearanceMm + boxWidthMm + clearanceMm` AND the box's bottom
      is at or above page 0's search floor. Otherwise scan downward toward the tail in 1mm steps
      until one candidate satisfies both, exactly as `nameBlockPlacement` scans.
    - Last resort, when no interior band works at all (a pathological board): the same style of
      documented fallback `nameBlockPlacement` uses — the deepest band whose bottom sits at the
      search floor, clamped so the box's top never rises back above the interior ceiling (the
      name block's bottom minus the gap) or page 0's own printable range. Say in the comment that
      this branch does not prove containment, only that the box stays on the sheet and below the
      name block.
    - Page 0's search floor and ceiling are derived the same way `nameBlockPlacement` derives
      them: floor = `page.stationRange[0] + (layout.rows > 1 ? layout.overlap : 0)`, ceiling =
      `min(page.stationRange[1], geometry.length)`.

    Tests (append BELOW everything already in `lib/geometry/template.test.ts` — do not insert
    above the frozen pins), for every preset x paper:
    - Test 1: whichever `position` comes back, it agrees with the geometry. Compute the outboard
      candidate's own curve-side clearance in the test by sampling the outline at 1mm across the
      candidate's span with `sampleOutline`, and expect `position` to be `"outboard"` exactly when
      that clearance is at least `NAME_BOX_CLEARANCE_MM`. Derive the outcome; never hard-code
      which preset goes where.
    - Test 2: when outboard, the returned placement equals the candidate field-for-field.
    - Test 3: when interior, `halfWidthStart` is `NAME_BOX_CLEARANCE_MM`; the minimum half-width
      over the box's span (sampled at 1mm, endpoints folded in) is at least
      `NAME_BOX_CLEARANCE_MM + boxWidth + NAME_BOX_CLEARANCE_MM`; the box's bottom is at or above
      the search floor derived in the test from the layout; and the top is at or below the name
      block's bottom minus `NAME_BOX_CLEARANCE_MM`, with equality whenever the first candidate was
      accepted.
    - Test 4: the pathological path. Construct a board (or hand in an oversized box height) where
      no interior band can hold the box, and assert the fallback keeps the box on page 0 and below
      the name block rather than throwing or returning a top above the ceiling — the same shape as
      the existing WR-01/WR-03 clamp test for `nameBlockPlacement`.
    - Include the wide variants alongside `BOARD_PRESETS`: a shortboard at
      `WIDEPOINT_WIDTH_RANGE_IN.max`, a longboard at `WIDEPOINT_WIDTH_RANGE_IN.max`, and a
      longboard at `noseFullness: 100`. Build them the way the existing tests build wide variants
      (spread the preset's `outline` and override the one field).

    The box size the geometry tests hand in is a test input, not an expected value, so it may be a
    plain number — but derive the candidate itself from the layout (`templatePageBoxes(layout)[0]`)
    rather than typing a half-width, and never write down a millimetre figure that the new code
    produced.
  </behavior>
  <action>
    Add to `lib/geometry/template.ts`, additive only, beneath `nameBlockPlacement` so the two
    placement functions read together:

    1. A private fine-sampling helper alongside the existing `minHalfWidthOverStationSpan` — do
       NOT modify or repurpose that one, and do not touch `NAME_BLOCK_SEARCH_STEP_MM` or
       `NAME_BLOCK_HEIGHT_SAMPLES`. The new helper walks a station span at a named 1mm step and
       returns both the minimum and the maximum half-width over it, folding in both endpoints
       explicitly so a floating-point accumulation cannot skip the top of the span. Name the step
       constant; do not inline a bare 1. Its doc comment must explain why the existing five-sample
       helper is not reused: five samples across a 46mm box is roughly 9mm apart, and a maximum
       found on a 9mm grid can miss the curve's actual widest point between two samples — for a
       minimum that is merely optimistic, for a maximum it is wrong in the unsafe direction.

    2. An exported `HowToBoxPlacement` interface and the exported `howToBoxPlacement` function per
       the behavior above. Document, in plain English a shaper could follow, why the outboard
       position is preferred (it is the founder's chosen spot, D-10, and it costs the board no
       drawing area) and why the interior fallback exists (on a wide nose there is simply no
       outboard position on the nose page that a 70mm box fits into, because the blank wedge
       outside the curve only narrows toward the tail).

    3. Broaden `NAME_BOX_CLEARANCE_MM`'s own doc comment so it no longer reads as a name-block-only
       rule: the same 4mm of daylight now governs page-0 furniture generally — between a box and
       the stringer, and between a box and the rail curve — and it now has a third call site.
       Do not rename the constant and do not change its value.

    Then write the tests described in `<behavior>`. Append the new `describe` at the END of
    `lib/geometry/template.test.ts`; the only edit permitted above the frozen pins is adding
    `howToBoxPlacement` (and its type) to the existing import list at the top of the file.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/template.test.ts</automated>
  </verify>
  <done>
    `howToBoxPlacement` is exported, pure and covered for every preset at both paper sizes plus the
    three wide variants and the pathological case, with every expectation derived. Both frozen
    characterisation pins and the strip pin pass, with their text unedited.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire the placement into the PDF builder, sharing one name block and one rect</name>
  <files>components/template/build-template-pdf.ts, components/template/build-template-pdf.test.ts</files>
  <read_first>
    `components/template/build-template-pdf.ts` — `stationToY` / `halfWidthToX` (lines 150-165),
    `pageBoxRect` / `scaleSquareRect` (lines 240-268), `howToBoxRect` / `drawHowToBox` (lines
    469-510), `nameBlockContent` / `drawNameBlock` (lines 568-628), `buildTemplatePdf` (633-665)
    and `templatePageZeroFurnitureRects` (682-708). You need all of these; read each range once.
  </read_first>
  <behavior>
    - Today's outboard rect is `x = pageBoxRect.x + pageBoxRect.width - HOWTO_BOX_WIDTH_MM`,
      `y = pageBoxRect.y + SCALE_SQUARE_MM + HOWTO_BOX_TOP_GAP_MM`. In the board's own frame that
      is `halfWidthStart = box.halfWidthRange[1] - HOWTO_BOX_WIDTH_MM` and
      `topStation = box.stationRange[1] - SCALE_SQUARE_MM - HOWTO_BOX_TOP_GAP_MM`. That pair is the
      outboard candidate handed to `howToBoxPlacement`; converting it back through `stationToY` /
      `halfWidthToX` reproduces today's x and y (the two expressions are the same affine map with
      the terms regrouped, so they agree to floating-point noise, far below the 2 decimal places
      jsPDF writes coordinates at).
    - A test asserts that round trip directly: for a preset whose placement comes back `outboard`,
      the how-to rect from `templatePageZeroFurnitureRects` matches the historical formula
      recomputed in the test from `templatePageZeroBoxRect`, within a stated tolerance. That is the
      proof shortboard and midlength still print where they printed.
    - Per preset x paper (plus the three wide variants), the how-to box either clears the curve by
      at least `NAME_BOX_CLEARANCE_MM` on its curve-side edge, or sits inside the outline with at
      least `NAME_BOX_CLEARANCE_MM` on both sides — with the branch DERIVED in the test from the
      candidate's own clearance, not hard-coded per preset.
    - A new test that the interior box never overlaps the name block and keeps exactly
      `NAME_BOX_CLEARANCE_MM` between the name block's bottom edge and the how-to box's top edge
      whenever the first interior candidate was accepted (at least that much when the scan had to
      step down).
    - The existing pairwise no-overlap and inside-the-alignment-box tests keep passing, and the
      pinned "exactly the three named furniture pieces" test is unchanged.
  </behavior>
  <action>
    In `components/template/build-template-pdf.ts`:

    1. Add one internal helper that resolves page 0's name block once — it calls `nameBlockContent`
       and then `nameBlockPlacement` with `NAME_BOX_WIDTH_MM`, that computed height and
       `NAME_BOX_CLEARANCE_MM`, and returns both the content and the placement. Every path that
       needs the name block calls this helper exactly once and passes the result down. Its doc
       comment must say why: the how-to box now stacks under the name block, so a second,
       independently computed name placement could put the drawn box and the tested box in
       different places.

    2. Rework `howToBoxRect` to take the geometry and that resolved name block, compute the
       outboard candidate in the board's frame as described in `<behavior>`, call
       `howToBoxPlacement` from `lib/geometry/template`, and convert the answer back with
       `stationToY` / `halfWidthToX`. It performs no placement arithmetic beyond that conversion.
       Return the chosen `position` alongside the rect so tests and comments can name the branch.

    3. `drawHowToBox` takes the geometry and the resolved name block and keeps calling that one
       `howToBoxRect`. `templatePageZeroFurnitureRects` calls the same `howToBoxRect` with the same
       resolved name block it already uses for the name-block rect, so exactly one placement
       computation backs both the drawing and the tests.

    4. `buildTemplatePdf` resolves the name block once, before the page loop, and hands it to both
       `drawHowToBox` and `drawNameBlock`. Hoisting it is safe: `templateHowToWrappedLines` and
       `nameBlockContent` each set their own font family and size before measuring, so neither
       depends on the other's leftover font state — say so in a short comment so nobody later
       "fixes" the order back.

    5. Export a thin `templateHowToBoxPlacement(options)` that returns the placement, box width,
       box height and wrapped lines in the board's own station/half-width frame, backed by the same
       single computation, following the file's existing "exported for testability" pattern
       (`templatePageZeroBoxRect`, `markLabelRect`). Tests use it to assert against the curve
       without re-deriving the millimetre conversion.

    6. Update the doc comments on `HOWTO_BOX_WIDTH_MM`, `howToBoxRect` and `drawHowToBox` so none
       of them still describes the box as unconditionally beside the scale square. Explain the two
       placements and when each applies, in the plain terms a shaper would use.

    In `components/template/build-template-pdf.test.ts`, add the tests in `<behavior>` beside the
    existing name-block containment and furniture tests. Use `buildOptionsFor(preset, paper)` for
    real per-preset geometry — the existing overlap tests use `buildOptions(paper)`, which is always
    the shortboard's geometry with only the board name swapped, so they would never see a
    longboard's page 0. Build the three wide variants the way the existing wide-board tests do.
    Every expected value comes from `sampleOutline`, the layout, or arithmetic over the named
    constants.
  </action>
  <verify>
    <automated>npx vitest run components/template/build-template-pdf.test.ts lib/geometry/template.test.ts</automated>
  </verify>
  <done>
    The how-to box's placement is decided once in the geometry module and drawn from one shared
    rect. Outboard presets reproduce today's rect within tolerance; interior presets sit under the
    name block with 4mm all round. The three-furniture-pieces pin, the no-overlap tests and the
    alignment-box containment tests all pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Prove nothing else moved, produce the sample PDFs, and write the SUMMARY</name>
  <files>.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-SUMMARY.md</files>
  <action>
    1. Run the full suite and the linter from the worktree: `npm test` and `npm run lint`. Capture
       the pass/skip counts. Take a baseline count before your first edit if you have not already,
       so the SUMMARY can state before and after. Nothing that passed before may fail.

    2. Prove the frozen pins were not edited, rather than asserting it. Two checks, both of which
       must come back empty:

       - Every pinned digest string is byte-identical to HEAD's:
         `diff <(git show HEAD:lib/geometry/template.test.ts | grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"') <(grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"' lib/geometry/template.test.ts)`
       - Every frozen block's body is byte-identical to HEAD's:
         `diff <(git show HEAD:lib/geometry/template.test.ts | sed -n '/frozen, never edit/,/^});/p') <(sed -n '/frozen, never edit/,/^});/p' lib/geometry/template.test.ts)`

       Then read `git diff HEAD -- lib/geometry/template.test.ts` and confirm by eye that no added
       or removed line falls inside either frozen describe. Record the commands and their empty
       output in the SUMMARY. If a pin is red, stop: the task broke something in the tile-grid
       math. Fix the cause. Under no circumstances recapture a digest in this task.

    3. Produce the sample PDFs for the orchestrator's post-merge visual check, using the suite's
       existing opt-in writer. For each of the four presets at Letter, and for the longboard at A4:
       `TEMPLATE_PDF_OUT=<path> TEMPLATE_PDF_PRESET=<preset> TEMPLATE_PDF_PAPER=<paper> npx vitest run components/template/build-template-pdf.test.ts -t "writes a sample tiled template PDF"`.
       Write them to a scratch directory outside the repo and list the absolute paths in the
       SUMMARY. Do not open, render, split or eyeball them — reviewing the pictures is the
       orchestrator's job.

    4. Write the SUMMARY to the absolute main-checkout path in `<environment>`, and do not commit
       it. It must record, in plain English a shaper could follow:

       - Which presets ended up outboard and which ended up interior, at each paper size, and the
         curve-side clearance number that decided each one.
       - For each interior case: where the box landed (station from the nose tip and half-width),
         its clearance to the curve, and its gap above page 0's floor.
       - The proof that shortboard and midlength print exactly as before.
       - The two empty diffs from step 2 and the full-suite pass/skip counts before and after.
       - The absolute paths of the sample PDFs.
       - One observation for the founder to judge on the render: on the longboard the interior
         box's top edge sits about 6mm nearer the nose than the scale square's caption, though the
         square itself still begins higher on the page — so "Measure the square above" still reads
         correctly, but the two pieces are closer to level than on the other boards.
       - **The out-of-scope finding, for the founder, with the numbers, explicitly NOT fixed by
         this task:** the 2in scale square itself is also reached by the curve on extreme boards —
         the widest longboard by -5.8mm (Letter) / -11.7mm (A4), and a longboard at 100% nose
         fullness by -1.8mm / -7.7mm — and on the plain longboard preset it is only 2.5mm clear at
         A4 (8.4mm at Letter). The square's corner placement is a locked decision (D-07), so it was
         left exactly where it is. Flagging it, not fixing it.
  </action>
  <verify>
    <automated>npm test && npm run lint</automated>
  </verify>
  <done>
    Full suite green, linter clean, both frozen-pin diffs empty, five sample PDFs written to an
    absolute scratch path, and the SUMMARY written to the main-checkout path (uncommitted) carrying
    the per-preset outcomes and the scale-square finding.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper's board dimensions → generated PDF | Board name is user-supplied text, already clamped and truncated by `templateNameBlockText`; this task does not touch that path. |
| test process → local filesystem | The opt-in `TEMPLATE_PDF_OUT` writer writes bytes to a path taken from an environment variable. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-fqv-01 | Tampering | `lib/geometry/template.test.ts` frozen characterisation pins | medium | mitigate | A pin edited to make it pass would hide a real tile-grid regression. Mitigated by this task being additive in the geometry module (no hashed function changes, so no digest may move) and by Task 3's two byte-identity diffs, both of which must be empty. No recapture is authorised in this task. |
| T-fqv-02 | Tampering | drawn how-to rect vs. tested how-to rect | medium | mitigate | If the drawing path and the test path each computed the placement, the printed box and the asserted box could drift apart silently. Mitigated by one shared `howToBoxRect` fed by one resolved name block, per Task 2 steps 1-3 and 5. |
| T-fqv-03 | Tampering | `TEMPLATE_PDF_OUT` sample writer | low | accept | `skipIf`-gated off unless the operator sets the variable, writes to that operator's own local path, never runs in CI. No privilege boundary crossed. |
| T-fqv-04 | Information disclosure | generated template PDFs | low | accept | They contain only the preset boards' own dimensions, written to a local scratch directory. Unchanged by this task. |
| T-fqv-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed by this task. If `pypdf` or any other tool is missing for a later step, report it rather than installing it under a plan that never audited it. |
</threat_model>

<verification>
- `npm test` fully green from the worktree; the pass count may rise with the new assertions, but
  nothing that passed before may fail.
- `npx vitest run lib/geometry/template.test.ts` green with the eight-function cj5 pin, the
  seven-function 18d pin, the strip pin and the 2in scale-square literal pin all passing on
  UNEDITED text.
- Both byte-identity diffs in Task 3 step 2 return empty output.
- `npm run lint` clean.
- `npm run build` is NOT run here (worktree); the two phantom `LayoutProps` tsc errors are known
  and not this task's.
- The curve-side clearance is asserted directly against `sampleOutline` in both suites, not merely
  implied by containment.
- Which presets go interior is derived in the tests from the geometry. Check the derived result
  against the planning facts: shortboard, midlength and the widest shortboard outboard; fish,
  longboard, the widest longboard and the noseFullness-100 longboard interior. A mismatch means
  something is wrong — investigate before shipping, and do not "fix" it by hard-coding.
- The five sample PDFs exist at the absolute paths recorded in the SUMMARY. The executor does not
  render or judge them.
</verification>

<success_criteria>
- On page 1 of the Full Sized Template, no preset at either paper size has the rail curve inside
  the how-to box. Every box has at least 4mm of clear paper between itself and the curve.
- Shortboard and midlength print where they print today, proven by a test that recomputes the
  historical rect and matches it.
- Fish and longboard read their instructions inside the outline, 4mm under the board name +
  dimensions block, 4mm off the stringer.
- One constant, one rule, three call sites — `NAME_BOX_CLEARANCE_MM`, unrenamed.
- The placement decision is pure, exported and unit-tested in `lib/geometry/template.ts`; the
  builder only converts it into millimetres.
- The drawn box and the tested box are the same single computation, and so is the name block that
  the interior box stacks under.
- Both frozen pins are green with their text provably unedited, and no digest was recaptured.
- The scale-square finding is recorded for the founder, with numbers, and not acted on.
</success_criteria>

<output>
Create `/Users/kontoes/Code/shaper/.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-SUMMARY.md` when done — absolute path, in the main checkout, uncommitted.
</output>
