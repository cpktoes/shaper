---
phase: quick-260908-bk1
plan: 01
subsystem: ui
tags: [rails, callouts, layout, svg, vitest, tdd]

requires:
  - phase: quick-260908-b35
    provides: "the example rail's mark names no longer crop off the plot edge via the earlier fixed edge-lift/ceiling pass"
provides:
  - "deOverlapCallouts rewritten to compete labels on estimated drawn-text overlap, not anchor-x proximity"
  - "axis ceiling pass that lifts only the specific competing pair that overflowed it, never a whole side"
affects: [rail-instructions, rail-section-plot, example-rail-figure]

actuals:
  tokens: 3868
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Estimated text-extent collision (name.length * per-character px estimate) used in place of anchor-position clustering for label de-overlap"

key-files:
  created: []
  modified:
    - components/rails/rail-callouts.ts
    - components/rails/rail-callouts.test.ts

key-decisions:
  - "No pre-existing deOverlapCallouts test fixture needed rewriting -- the shared callout() helper's default single-character name (\"N\") at x:0/x:5 produces text extents that genuinely overlap under the new rule, so all eight original cases pass unedited against the new text-collision logic"
  - "Ceiling pass processes each side's labels bottom-up in the same ascending-y chain order the stacking pass built, clamping only the label that hit maxY and pulling up only the immediate competing predecessor in that chain -- never a whole side -- which is what keeps a non-competing label like Deck 3 from moving when Bottom Tuck 1/Bottom Tuck 3 overflow the axis rule"

patterns-established:
  - "Layout de-overlap math in components/rails/rail-callouts.ts estimates drawn SVG text width from name.length * a calibrated per-character constant (RAIL_CALLOUT_CHAR_PX), rather than measuring the DOM -- calibrated once against the pinned callout font and documented as conservative (over-wide) at larger render scales"

requirements-completed: [QT-260908-bk1]

coverage:
  - id: D1
    description: "Two same-side mark names whose text cannot touch (Deck 3 at x:250, Deck 1 at x:334 -- 84px apart, inside the old 95px bucket) are never moved because of each other"
    requirement: QT-260908-bk1
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(a) far-apart short names are both left alone"
        status: pass
    human_judgment: false
  - id: D2
    description: "Two same-side mark names whose text really would overlap (Bottom Tuck 3 / Bottom Tuck 1 at the same anchors, long names) still stack at least RAIL_CALLOUT_MIN_GAP apart"
    requirement: QT-260908-bk1
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(b) the same two anchors with long names ARE stacked"
        status: pass
    human_judgment: false
  - id: D3
    description: "The axis ceiling lifts only the competing pair that overflowed it, leaving an unrelated name at its own exact height"
    requirement: QT-260908-bk1
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(c) the ceiling moves only the competing pair"
        status: pass
    human_judgment: false
  - id: D4
    description: "On the real example rail (Flat and Domed), every callout stays inside the plot and Deck 3/Deck 1 are unshifted by the de-overlap pass -- the regression this task fixes"
    requirement: QT-260908-bk1
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(d) the real example rail, Flat and Domed"
        status: pass
    human_judgment: false
  - id: D5
    description: "The four apex-column names (Apex, Domed Taper, Rail Mk1, Tuck 1), all anchored at the same x, still stack clear of each other"
    requirement: QT-260908-bk1
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(e) the apex column still stacks"
        status: pass
    human_judgment: false
  - id: D6
    description: "\"Deck 3\" reads fully inside the drawing on the rails screen's INSTRUCTIONS tab in both the Flat and Domed states, with no name clipped or shifted, and the two overlapping bottom-edge names still read as a clearly separated stack -- a live-browser visual check"
    verification: []
    human_judgment: true
    rationale: "This worktree has no live app to screenshot; the pure-function checks above prove the geometry is correct, but confirming the drawn SVG text actually renders inside the viewBox on the real page requires the orchestrator's browser check after merge"

duration: 8min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-bk1: Mark Names Stack Only When They Would Actually Overlap Summary

**`deOverlapCallouts` now decides whether two mark names should stack by estimating whether their drawn text would really touch, not by how close their little coloured dots sit on the ruler -- so "Deck 3" stops getting shoved off the top of the example rail drawing.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-08T15:24:06Z
- **Completed:** 2026-09-08T15:32:04Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced the ported prototype's anchor-x "bucket" clustering (chain any two dots within 95px into one group) with a text-collision rule: two same-side mark names only compete for vertical space when their *estimated printed word widths* would actually overlap.
- The bottom-axis ceiling rule now lifts only the specific pair of names that overflowed it -- never every name stacked on that side -- so a name with nothing wrong with it (like "Deck 3") never gets dragged along for someone else's overflow.
- Five new test cases pin this behavior: two far-apart short names left alone, two long names that really do collide still stacking, the ceiling moving only the guilty pair, the real example rail (both Flat and Domed) keeping "Deck 3"/"Deck 1" exactly where their own geometry puts them, and the four names that share one column (Apex, Domed Taper, Rail Mk1, Tuck 1) still spacing out correctly.
- Removed the now-unused `RAIL_CALLOUT_BUCKET_PX` constant and rewrote both the file's top comment and `deOverlapCallouts`'s own comment to say plainly that this is a deliberate departure from the prototype's code -- the prototype's own comment already stated the correct intent, its code just never implemented it.

## Task Commits

Each task was committed atomically (TDD: test first, then implementation):

1. **Task 1 (RED):** add failing tests for text-collision mark-name stacking - `e667f2f` (test)
2. **Task 1 (GREEN):** rewrite `deOverlapCallouts` on estimated text-extent collision - `48b54f8` (fix)

**Plan metadata:** committed separately by the planner at `3e972c9`.

## Files Created/Modified

- `components/rails/rail-callouts.ts` - `deOverlapCallouts` rewritten on text-extent collision instead of anchor-x bucketing; two new exported constants (`RAIL_CALLOUT_CHAR_PX`, `RAIL_CALLOUT_TEXT_GAP`); `RAIL_CALLOUT_BUCKET_PX` removed; top-of-file and function doc comments rewritten to record the deliberate departure from the prototype
- `components/rails/rail-callouts.test.ts` - five new cases added to the existing `deOverlapCallouts` describe block; all eight pre-existing cases untouched and still passing

## `npm test` totals

Against the 260908-b35 baseline (41 files, 2219 passed, 2 skipped, 2221 total):

- **New totals: 41 files, 2224 passed, 2 skipped, 2226 total** -- file count unchanged (41, as required), 5 new passing cases, 0 new failures, 0 new skips.

## Pre-existing fixture rewrites

None. All eight pre-existing `deOverlapCallouts` cases use the shared `callout()` helper's default name `"N"` (a single character) at `x: 0` and `x: 5` on side `-1`. Worked out by hand before writing the new logic (as the plan required): with `RAIL_CALLOUT_CHAR_PX = 6.7` and `RAIL_CALLOUT_TEXT_GAP = 4`, those two single-character labels' estimated extents are `[-10.7, -4]` and `[-5.7, 1]`, which genuinely overlap -- so every pre-existing case that expected the two to stack still gets a stack under the new rule, and every case that expected them to stay put (because they were already far enough apart in y, or on opposite sides) is unaffected by the extent calculation at all. No fixture needed a name change.

## The two new constants

- **`RAIL_CALLOUT_CHAR_PX = 6.7`** -- estimated viewBox width of one character at the pinned 11px bold callout face. Calibrated from the measured fact in the plan: "Domed Taper" is 11 characters and measured 83 viewBox px at render scale 0.893 (about 74 px at scale 1), giving roughly 6.7 viewBox px per character. Because the callout font is pinned in *screen* px (`components/viewer/callout-primitives.tsx`'s `pinnedCalloutSizes`), a label's viewBox width shrinks as the plot renders larger -- so this scale-1 calibration is conservative (over-wide, never under-wide) at bigger renders, such as the order form's third sheet at roughly scale 2.3.
- **`RAIL_CALLOUT_TEXT_GAP = 4`** -- the gap between an anchor and the start of its drawn text, mirroring the function-local `CALLOUT_TEXT_GAP` inside `RailSectionPlot`'s own render (`components/rails/rail-section-plot.tsx`, confirmed still `4` by direct read), which is not exported. Documented in both places that the two values must stay equal or the estimated extents stop matching the drawn text.

## `RAIL_CALLOUT_BUCKET_PX` removal

Removed. A repo-wide grep (`grep -rn "RAIL_CALLOUT_BUCKET_PX" --include="*.ts" --include="*.tsx" .`) before the edit found exactly its own declaration and its one use inside the old `deOverlapCallouts` body -- no other file, no test, referenced it. After the edit, `grep -c` against non-comment lines of `rail-callouts.ts` confirms zero remaining occurrences in executable code.

## Decisions Made

- No pre-existing test fixture required rewriting (see above) -- both algorithms treat the default `"N"`-named fixtures identically, since their estimated text extents genuinely overlap.
- The ceiling pass walks each side's labels bottom-up in the same ascending-y chain order the stacking pass established, and only pulls up the immediate competing predecessor in that chain when the gap is too tight -- not every label that competes with the clamped one, and never a symmetric two-way check -- because a symmetric check was found (by hand-tracing the three-name ceiling test case) to bounce a pair back and forth indefinitely instead of converging.

## Deviations from Plan

None - plan executed exactly as written. Both commits landed as specified (RED then GREEN), the exported signature `deOverlapCallouts(callouts, minGap, maxY?)` is unchanged, `RAIL_CALLOUT_MIN_GAP`, `RAIL_CALLOUT_AXIS_CLEARANCE`, `RAIL_CALLOUT_EDGE_LIFT`, `RAIL_CALLOUT_ANCHORS` and `buildRailCallouts` are untouched, and `components/rails/rail-instructions.tsx` was not edited.

## TDD Gate Compliance

Both gates present in git log: `test(quick-260908-bk1): add failing tests for text-collision mark-name stacking` (`e667f2f`, RED) followed by `fix(quick-260908-bk1): mark names on the example rail stack only when they would actually overlap...` (`48b54f8`, GREEN). No REFACTOR commit was needed -- the implementation and its comments were written correctly on the first pass and required no follow-up cleanup.

RED confirmation: before the implementation change, running the new suite showed 2 of the 5 new cases failing against the old anchor-x bucket rule -- case (a) (`expected 117 to be 100`) and case (d) (`expected 9.4 to be close to 28.4`, i.e. Deck 3 shifted by 19 viewBox px under the old rule). The other three new cases ((b), (c), (e)) happened to already pass under the old algorithm by coincidence -- their fixtures only ever involve two- or four-item clusters where "shift the whole cluster" and "shift only the competing pair" produce numerically identical results. Cases (a) and (d) are the two that actually exercise the bug this task fixes (a name with no real text collision, and the real six-name column overflowing the axis rule), and both failed as expected before the fix.

## Issues Encountered

None.

## Human verification deferred

The following browser checks named in the plan's `<verification>` section are for the orchestrator to perform after merge (this worktree has no live app):

- On the rails screen's INSTRUCTIONS tab, in both the Flat and the Domed state, every mark name's text box lies inside the SVG viewBox on all four sides.
- No name sits below `py(0) - 10` (the row of axis numbers stays a row of numbers).
- "Deck 3" and "Deck 1" both read just above the top deck line, at their own lifted height, neither clipped nor shifted.
- "Bottom Tuck 3" and "Bottom Tuck 1" still read as a clearly separated stacked pair above the axis.
- Screenshot both states as the evidence.

## Next Phase Readiness

- Phase 08's example-rail mark-name overlap bug is now fixed at the geometry-math level, with unit coverage proving the fix; only the live-render visual confirmation (listed above) remains for the orchestrator.
- No blockers for continuing Phase 08 verification or later work on the rails screen.

---
*Quick task: 260908-bk1*
*Completed: 2026-09-08*
