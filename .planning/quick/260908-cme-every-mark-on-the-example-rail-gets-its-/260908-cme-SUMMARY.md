---
phase: quick-260908-cme
plan: 01
subsystem: ui
tags: [svg, rail-plot, callouts, teaching-figure, rail-instructions]

requires:
  - phase: quick-260908-b35
    provides: computeRailPlotBounds's opt-in calloutRoom flag and CALLOUT_RIGHT_PAD
  - phase: quick-260908-bk1
    provides: the text-collision de-overlap pass (deOverlapCallouts) replacing anchor-x bucketing
provides:
  - CALLOUT_BOTTOM_PAD, an opt-in bottom-room pad on computeRailPlotBounds mirroring CALLOUT_RIGHT_PAD
  - RailCalloutSide widened to 1 | 0 | -1, with anchorX/anchorY carried alongside x/y on RailCallout
  - A below-axis leader-line render path in RailSectionPlot (side 0)
  - Eleven-mark RAIL_CALLOUT_ANCHORS (was ten), Corner Cut relocated, Bottom Tuck 2 added, Bottom Tuck 1/3 moved below the axis
affects: [rail-instructions, order-form-third-sheet]

actuals:
  tokens: 10772
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A callout's anchor position (anchorX/anchorY, where the mark IS) is now tracked separately from its rendered x/y (where the de-overlapped name ends up), so a leader line can always point back at the mark it names."

key-files:
  created: []
  modified:
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-section-plot.test.ts
    - components/rails/rail-callouts.ts
    - components/rails/rail-callouts.test.ts

key-decisions:
  - "Corner Cut's anchor moved from the prototype's (-cornerCutDeck, railMark1) to its own segment's apex end (0, cornerCutRail), and its side from -1 to 1 — a layout change only; buildSegmentDefsInches still draws the same two endpoints."
  - "Bottom Tuck 2 (RAIL_CALLOUT_TUCK2_LIFT = 6) and the below-axis offset for Bottom Tuck 1/3 (RAIL_CALLOUT_BELOW_AXIS_OFFSET = 28) are new named constants alongside the existing RAIL_CALLOUT_EDGE_LIFT, each doing one job in the anchor's dy."
  - "The axis ceiling in deOverlapCallouts now applies to sides 1 and -1 only; side 0 (below-axis names) is exempt by design, since that ceiling means 'stay clear of the row of axis numbers' and a name living below those numbers has nothing to clear."

patterns-established:
  - "A three-way callout side (1 | 0 | -1) with side 0 meaning 'centred below, leader line up' is the general shape for any future rail-plot label that must read off a point rather than beside it."

requirements-completed: [QT-260908-cme]

coverage:
  - id: D1
    description: "Corner Cut reads in the apex column, stacked between Rail Mk1 and Apex, instead of on one line beside Rail Mk1"
    requirement: "QT-260908-cme"
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(f) after the de-overlap pass, the apex column reads Rail Mk1, then Corner Cut, then Apex, then Tuck 1"
        status: pass
    human_judgment: true
    rationale: "Text placement in an SVG teaching figure is a visual judgment; the plan's own verification section reserves the browser check for the orchestrator after merge."
  - id: D2
    description: "Bottom Tuck 1 and Bottom Tuck 3 read below the bottom axis, centred under their own marks, each with a leader line up"
    requirement: "QT-260908-cme"
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#(h) Bottom Tuck 1 and Bottom Tuck 3 come out of the pass at py(0) + RAIL_CALLOUT_BELOW_AXIS_OFFSET..."
        status: pass
    human_judgment: true
    rationale: "Visual leader-line rendering and axis clearance need a browser look; deferred to the orchestrator per the plan's own verification section."
  - id: D3
    description: "Bottom Tuck 2 is named for the first time, beside its own mid-tuck point, and is absent on a single-tuck/hard-edged rail"
    requirement: "QT-260908-cme"
    verification:
      - kind: unit
        ref: "components/rails/rail-callouts.test.ts#a single-tuck section yields ten callouts and no Bottom Tuck 2..."
        status: pass
    human_judgment: false
  - id: D4
    description: "The plain (no-callout) plot box, railPlotProjection, the VIEWER tab, the order form's first sheet and the View Full Sized dialog are provably unchanged"
    requirement: "QT-260908-cme"
    verification:
      - kind: unit
        ref: "components/rails/rail-section-plot.test.ts#computeRailPlotBounds calloutRoom option (all four cases)"
        status: pass
      - kind: unit
        ref: "npm test — 41 files, 2235 passed, 2 skipped"
        status: pass
    human_judgment: false

duration: 32min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-cme: Every Mark on the Example Rail Gets Its Own Name Summary

**The INSTRUCTIONS tab's teaching figure now names all eleven drawn marks — Corner Cut moved into the apex column under Rail Mk1, Bottom Tuck 1/3 hang below the axis with leader lines, and Bottom Tuck 2 (always drawn, never named) got a name for the first time.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-09-08T09:15:00Z
- **Completed:** 2026-09-08T09:24:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `computeRailPlotBounds`'s `calloutRoom` flag now grows the box's `height` by a new `CALLOUT_BOTTOM_PAD` (34), exactly mirroring how it already grows `width` by `CALLOUT_RIGHT_PAD` — `minX`/`minY`/`maxY` and `railPlotProjection` are provably untouched, so nothing already drawn moved.
- `RailCalloutSide` widened from `1 | -1` to `1 | 0 | -1`, and `RailCallout` gained optional `anchorX`/`anchorY` — the mark's own position, kept separate from `x`/`y` (where the de-overlapped name lands) so a leader line always points at the real mark.
- `RailSectionPlot`'s render draws a side-0 name centred on its own mark with a thin leader line up to it, in place of the 45-degree drafting tick sides 1 and −1 still draw.
- `RAIL_CALLOUT_ANCHORS` grew from ten marks to eleven: Corner Cut moved from beside Rail Mk1 into the apex column (side −1 → 1, anchored at its own segment's apex end instead of `railMark1`'s height); Bottom Tuck 2 was added (side −1, lifted off the point where the two tuck lines cross); Bottom Tuck 1 and Bottom Tuck 3 moved from "lifted above the axis" (side −1) to "centred below the axis" (side 0).
- `deOverlapCallouts`'s axis-ceiling pass now runs for sides 1 and −1 only — side 0 is exempt, since the ceiling means "stay clear of the row of axis numbers" and a name that lives below those numbers by design has nothing to clear.
- A single-tuck or hard-edged rail section simply produces no Bottom Tuck 2 callout (ten instead of eleven); the other ten are unaffected.

## Task Commits

Each task was committed atomically:

1. **Task 1: the plot can print a mark name below the axis, with a leader line up to its mark** - `c029db7` (feat)
2. **Task 2: Corner Cut joins the apex column, Bottom Tuck 2 gets its name, and Bottom Tuck 1 and 3 hang under their own marks** - `2123558` (fix)

Task 1 is a `type="tracer"` task: after committing it, its own `<verify>` was re-run end-to-end (green) before Task 2 began, per the plan's tracer-feedback-gate rule — no checkpoint was raised.

**Plan metadata:** commit pending (this SUMMARY + STATE are committed together per plan output).

## Files Created/Modified

- `components/rails/rail-section-plot.tsx` - Added exported `CALLOUT_BOTTOM_PAD`; `computeRailPlotBounds` grows `height` by it under `calloutRoom`; render block gained a three-way side test (1/0/−1) and a below-axis leader-line path.
- `components/rails/rail-section-plot.test.ts` - Added a plain-`height` pin (sibling of the existing plain-`width` pin) and extended the `calloutRoom` option's cases to cover the new bottom pad and the axis-to-floor growth.
- `components/rails/rail-callouts.ts` - Rewrote the file header (records the port and its four departures); added `RAIL_CALLOUT_TUCK2_LIFT` and `RAIL_CALLOUT_BELOW_AXIS_OFFSET`; rewrote `RAIL_CALLOUT_ANCHORS` to eleven entries; `buildRailCallouts` now emits `anchorX`/`anchorY`, anchors Corner Cut at its own segment's apex end, anchors Bottom Tuck 2 at the `tuck2` segment's own p1, and filters Bottom Tuck 2 out when `hasTuck2` is false; `calloutTextExtent` exported and given a centred (side-0) branch; `deOverlapCallouts`'s ceiling pass now skips side 0.
- `components/rails/rail-callouts.test.ts` - Rewrote every case that described the old ten-mark, two-side layout; added new cases pinning Corner Cut's new anchor, Bottom Tuck 2's presence/absence and position, the below-axis pair's final resting position, the anchor pair surviving the de-overlap pass untouched, and every callout's estimated text box fitting inside the padded bounds.

## Decisions Made

- Corner Cut's anchor moved to its own segment's apex end `(0, cornerCutRail)` rather than staying at `railMark1`'s height — this is a layout change only; `buildSegmentDefsInches` (untouched, `lib/geometry/rail-bands.ts`) still draws the same two endpoints it always has.
- `RAIL_CALLOUT_TUCK2_LIFT` (6) and `RAIL_CALLOUT_BELOW_AXIS_OFFSET` (28) are separate named constants from `RAIL_CALLOUT_EDGE_LIFT` (8), even though all three are "lift a name off a point" — they lift by different amounts for different reasons (clearing two crossing lines vs. clearing the axis-number band) and keeping them distinct keeps each one's comment honest about why its number is what it is.
- The axis ceiling in `deOverlapCallouts` was scoped to sides 1/−1 only rather than trying to give side 0 its own, different ceiling — side-0 names have no ceiling to violate; they're pushed down by design, and the stacking pass alone (Bottom Tuck 1 first, Bottom Tuck 3 one `RAIL_CALLOUT_MIN_GAP` below it) is sufficient.

## Deviations from Plan

None — plan executed exactly as written. One TypeScript nit was caught and fixed inline during Task 2's own verification pass (not a deviation from the plan's design, just a correction to my own draft): `mmToInches(r.cornerCutRail as number)` in the test file broke the branded `Mm` type; changed to `mmToInches(r.cornerCutRail!)` before the task's commit, so it never landed in git history as a broken state.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Human verification deferred

The plan's own `<verification>` section states this explicitly: "The orchestrator measures the result in a browser on localhost after merging" — the browser check (both Flat and Domed states of the INSTRUCTIONS card, plus a print preview of the order form's third sheet) was not run by this executor and is the orchestrator's responsibility per the plan. Specifically deferred:

1. Every callout `<text>` bounding box sits inside the SVG's own viewBox.
2. The right-hand column reads top to bottom Rail Mk1, Corner Cut, Apex, Tuck 1.
3. "Bottom Tuck 1" and "Bottom Tuck 3" are centred under their own marks, below the row of axis numbers, each with a visible leader line up to its mark.
4. "Bottom Tuck 2" reads leftward from its own mid-tuck point, clear of the two tuck lines.
5. The VIEWER tab's three plots are unchanged.
6. A screenshot of each state (Flat, Domed) and a print preview of the order form's third sheet (`rail-instructions-sheet.tsx`, not edited by this task but rendering `ExampleRailFigure`).
7. The plan's own flagged edge case: Bottom Tuck 3's mark sits at x ≈ 421.0 and the "1" x-axis tick label is centred at x ≈ 422.4, so its leader line passes within about 1.4px of that digit. If it reads as striking through the "1" in the browser check, that is a follow-up task (a shortened or offset leader), not a silent expansion of this one.

All pure-function geometry backing these visual claims (anchor positions, side assignments, stacking order, leader-line target coordinates, and the padded-bounds containment check) is pinned by the unit tests listed in `coverage` above.

## Next Phase Readiness

- No blockers. `components/rails/rail-instructions.tsx` and `components/summary/rail-instructions-sheet.tsx` were confirmed unedited and need no change — both already call `buildRailCallouts`/`deOverlapCallouts` correctly for the new below-axis offset and the side-0 ceiling exemption.
- Nothing under `lib/geometry/` was touched; no board number, formula or unit conversion changed.
- `git diff --name-only` against the plan's start point lists exactly the four files in `files_modified` and nothing else; no file was deleted, moved or renamed.

---
*Phase: quick-260908-cme*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: components/rails/rail-callouts.ts
- FOUND: components/rails/rail-callouts.test.ts
- FOUND: components/rails/rail-section-plot.tsx
- FOUND: components/rails/rail-section-plot.test.ts
- FOUND commit: c029db7 (feat(quick-260908-cme): the example rail can name a mark below the axis, with a leader up to it)
- FOUND commit: 2123558 (fix(quick-260908-cme): Corner Cut joins the apex column, Bottom Tuck 2 gets its name, and Bottom Tuck 1 and 3 hang under their own marks)
