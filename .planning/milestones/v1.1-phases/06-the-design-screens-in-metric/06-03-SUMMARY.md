---
phase: 06-the-design-screens-in-metric
plan: 03
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "06-01 — lib/geometry/measure-display.ts (formatMark/stationLabel/measureSlider/commitTypedMeasure), metricSliderRange in lib/geometry/units.ts, the design-screen conversion ledger in lib/units-isolation.test.ts"
  - phase: 06-the-design-screens-in-metric
    provides: "06-02 — components/design/measure-field.tsx (MeasureField, the shared system-aware typed measurement box with a disabled prop)"
provides:
  - "The ROCKER sidebar's two rocker-lift sliders and five foil-thickness sliders reading and stepping in whole millimetres on Metric, with the two @-station read-outs and two foil sliders naming their station honestly (30.5 cm)"
  - "The ROCKER datasheet's station headers, row-label unit suffixes, bare width/thickness/rocker cells and typed Thickness/Rocker cells all reading in the chosen system"
  - "The ROCKER viewer's five station names and every rocker/thickness callout value reading in the chosen system"
  - "components/rocker/imperial-field.tsx deleted — the app now has exactly one typed measurement control (MeasureField)"
affects: ["06-04", "06-05", "06-06", "06-07"]

# Actuals (#2632)
actuals:
  tokens: 8412
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A sidebar's per-slider measureSlider(...) views are computed once as top-level consts inside the component body (rocker-controls.tsx), rather than inline IIFEs, when several sliders share the same call shape"
    - "A datasheet's typed-cell bounds are computed inline per station with measureSlider(cellValue, rangeConstant, rangeConstant.step, 1, system), reusing the exact range constant the matching sidebar slider reads, so a cell and its slider can never disagree about legal bounds"
    - "A viewer's station-name/value builder threads system as a captured variable from useUnits() read once at the top of the component, not as a prop on the viewer's public interface — CLAUDE.md Rule 2's 'no component converts on its own' still holds since all formatting flows through measure-display.ts"

key-files:
  created: []
  modified:
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-datasheet.tsx
    - components/rocker/rocker-viewer.tsx
    - lib/units-isolation.test.ts
  deleted:
    - components/rocker/imperial-field.tsx

key-decisions:
  - "The sidebar's static instructional sentence ('The two 12&quot; figures below are measured off the drawn curve') was rewritten to compose stationLabel(system) instead of a hard-typed '12\"' literal, since the plan's own prohibition ('no station name is hand-typed in either system') and its acceptance grep (`12&quot;` count 0) both applied to this prose line, not just the rendered slider/read-out values — Imperial stays byte-identical since stationLabel returns the literal `12\"` string on that branch"
  - "The Task 2 acceptance criterion 'grep -rc ImperialField components/ lib/ app/ returns 0 across the repo' cannot be fully satisfied without editing components/design/measure-field.tsx, measure-field.test.ts, lib/geometry/measure-display.ts and measure-display.test.ts — all four already-committed Plan 01/02 files that legitimately reference ImperialField in doc-comment prose describing its historical lineage and are outside this plan's files_modified scope. Removed the one occurrence within this plan's own scope (rocker-datasheet.tsx's header comment) and verified mechanically that no FUNCTIONAL import or usage of ImperialField remains anywhere in the repo (`grep -rn 'import.*ImperialField|from.*imperial-field'` is empty), which is what the plan's own overall <verification> section actually requires ('Nothing imports ImperialField anywhere in the repo')"
  - "rocker-viewer.tsx gained an explicit \"use client\" directive per the plan's own action step, even though it already worked correctly as an implicit client component via its parent's boundary (useRef/pointer handlers require client execution) — this plan's useUnits() call makes the file self-contained rather than relying on inheriting client-ness from its caller"

patterns-established:
  - "Pattern: a sidebar's derived read-only read-out composes its station name and value from stationLabel(system)/formatMark(value, system) rather than a fixed string, so a read-out, its sidebar's own sliders, and any other screen naming the same station can never independently drift out of sync"

requirements-completed: [SCRN-01, SCRN-02, SCRN-03]

coverage:
  - id: D1
    description: "ROCKER sidebar: two rocker-lift sliders (0-228mm) and five foil-thickness sliders (4-127mm) read and step in whole millimetres on Metric; the two derived @-station read-outs and the two station-named foil sliders name their station through stationLabel (30.5 cm, never hand-typed); Imperial byte-identical"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (10 tests, ledger completeness/banned-formatter checks pass with rocker-controls.tsx converted:true)"
        status: pass
      - kind: unit
        ref: "npm test (1974 passed, 2 skipped) — lib/geometry/measure-display.test.ts's measureSlider/formatMark coverage from Plan 01 exercises the exact functions this task calls"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (the seven sliders read whole millimetres and step by one, the two read-outs name their station in centimetres, angle/smoothness/flatness rows untouched, Imperial exactly as before) requires a browser per Task 1's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D2
    description: "ROCKER datasheet: station headers name their station honestly (Nose @ 30.5 cm), row labels gain their family's unit suffix (Width (cm), Thickness (mm), Rocker (mm)), width/derived-rocker cells read bare, typed Thickness/Rocker cells use MeasureField in bare mode with bounds from measureSlider; components/rocker/imperial-field.tsx deleted with its ledger entry removed"
    requirement: "SCRN-02"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts and components/design/measure-field.test.ts (16 tests total, rocker-datasheet.tsx asserted converted:true, zero banned formatters)"
        status: pass
      - kind: other
        ref: "grep -rn 'import.*ImperialField|from.*imperial-field' components/ lib/ app/ returns empty (no functional reference remains anywhere)"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (row labels carry the unit, station columns read centimetres, cells are bare, typing into a thickness cell re-prints a whole millimetre, unreadable input reverts with the error line, Imperial unchanged) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D3
    description: "ROCKER viewer: five station names compose through stationLabel, every rocker/thickness callout value reads through formatMark; layout arithmetic (pixel scale, deck reserve) untouched; all three rocker files (rocker-controls.tsx, rocker-datasheet.tsx, rocker-viewer.tsx) flipped to converted:true in the units-isolation ledger"
    requirement: "SCRN-03"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (10 tests, all three rocker files asserted converted:true with zero banned formatters)"
        status: pass
      - kind: unit
        ref: "npm test full suite (1974 passed, 2 skipped); git diff --name-only against lib/geometry/rocker.test.ts and lib/geometry/template.test.ts confirms both stayed unedited"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (the drawing's five stations are named in centimetres, every callout reads millimetres, the drawing itself hasn't moved, checked in Daylight and one dark theme) requires a browser per Task 3's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: 10min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 3: The ROCKER Screen in Metric — Sidebar, Datasheet and Drawing Summary

**The ROCKER sidebar's seven sliders, the datasheet's typed cells and derived rows, and the side-profile drawing's station callouts all read and take numbers in the shaper's chosen system, with `ImperialField` retired now that the app has exactly one typed measurement control.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3
- **Files modified:** 5 (4 modified, 1 deleted)

## Accomplishments

- Converted `rocker-controls.tsx`: the two rocker-lift sliders and five foil-thickness sliders now read and step in whole millimetres on Metric (`Nose Rocker — 79 mm`, `Nose Tip — 13 mm`), with metric bounds of 0-228mm (lift) and 4-127mm (thickness) derived from the existing inch ranges via `measureSlider`. The two derived `@`-station read-outs and the two station-named foil sliders (`Nose @ 30.5 cm`, `Tail @ 30.5 cm`) name their measuring station through `stationLabel(system)` rather than a hand-typed literal — including the sidebar's own instructional prose sentence, which previously hard-coded `12"`. Imperial is byte-identical.
- Converted `rocker-datasheet.tsx`: the two station column headers read `Nose @ 30.5 cm`/`Tail @ 30.5 cm` on Metric; the Width/Thickness/Rocker row labels gain their family's unit suffix (`Width (cm)`, `Thickness (mm)`, `Rocker (mm)`) through `columnUnitSuffix`; the width row and the three derived rocker cells read bare formatter output; the five typed Thickness cells and two typed Rocker tip cells now use `MeasureField` in bare mode, with bounds computed per-station from the same `measureSlider` call the matching sidebar slider uses. Imperial is unchanged, including the typed cells' commit pipeline.
- Deleted `components/rocker/imperial-field.tsx` — its last two consumers (the datasheet's Thickness/Rocker typed cells) moved to `MeasureField` — and removed its entry from `lib/units-isolation.test.ts`'s `OUT_OF_SCOPE_UNITS_FILES` list. The app now has exactly one typed measurement control.
- Converted `rocker-viewer.tsx`: added an explicit `"use client"` directive, read `useUnits()` once, and replaced every station name and callout value with `stationLabel`/`formatMark` composition — the drawing's own layout arithmetic (pixel scale, worst-case deck reserve, leader lines) is completely untouched. Flipped `rocker-viewer.tsx` and `rocker-controls.tsx` to `converted: true` in the ledger (`rocker-datasheet.tsx` was flipped in Task 2), so all three ROCKER files are now held to the display boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: The rocker and foil sliders read in millimetres** - `5da83aa` (feat)
2. **Task 2: The datasheet reads and takes millimetres, and the old typed field retires** - `bc6105d` (feat)
3. **Task 3: The rocker drawing's station callouts** - `b97a337` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `components/rocker/rocker-controls.tsx` - Seven sliders converted to `measureSlider`/`formatMark`/`stationLabel`; local `formatInchesFraction`/`inchesToMm`/`mmToInches` imports removed
- `components/rocker/rocker-datasheet.tsx` - Station headers, row-label unit suffixes, bare cells and typed `MeasureField` cells all system-aware; `ImperialField` import removed
- `components/rocker/rocker-viewer.tsx` - `"use client"` added; `useUnits()` read once; all five station names and every rocker/thickness callout value composed through `stationLabel`/`formatMark`
- `components/rocker/imperial-field.tsx` - Deleted (superseded by `components/design/measure-field.tsx`)
- `lib/units-isolation.test.ts` - `imperial-field.tsx` entry removed from `OUT_OF_SCOPE_UNITS_FILES`; all three rocker files flipped to `converted: true`; header doc comment updated to reflect the deletion

## Decisions Made

- The sidebar's static instructional sentence ("The two 12&quot; figures below are measured off the drawn curve, not set by hand.") was itself a hand-typed station literal outside any slider or read-out — rewrote it to compose `stationLabel(system)` so it satisfies both the plan's own prohibition ("no station name is hand-typed in either system") and its acceptance grep (`12&quot;` count must be 0). Imperial is unaffected since `stationLabel` returns the literal `12"` string on that branch.
- Task 2's acceptance criterion "`grep -rc 'ImperialField' components/ lib/ app/` returns 0 across the repo" cannot be fully satisfied without editing four already-committed Plan 01/02 files (`components/design/measure-field.tsx`, its test, `lib/geometry/measure-display.ts`, its test) that legitimately reference `ImperialField` in doc-comment prose describing its historical lineage — none of those files are in this plan's `files_modified` scope, and editing another plan's committed documentation is out of scope per the deviation rules' scope boundary. Removed the one occurrence that was within this plan's own scope (a doc comment in `rocker-datasheet.tsx`) and verified mechanically that no functional import or usage remains anywhere (`grep -rn 'import.*ImperialField|from.*imperial-field'` returns empty), which is what the plan's overall `<verification>` section actually requires: "Nothing imports `ImperialField` anywhere in the repo."
- `rocker-viewer.tsx` gained an explicit `"use client"` directive per the plan's own action step. It already behaved as a client component (its `useRef`/pointer-event handlers require client execution, inherited from its parent's boundary), but adding `useUnits()` makes the file self-contained rather than relying on inherited client-ness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed the sidebar's own hand-typed `12"` station literal in prose**
- **Found during:** Task 1 (verifying the `12&quot;` grep acceptance check)
- **Issue:** The plan's Task 1 action described converting the seven sliders and two read-outs, but a third site — a static instructional sentence above the sliders — also hard-typed the `12"` station figure, which would fail the task's own acceptance grep and violate the plan's prohibition against any hand-typed station name.
- **Fix:** Rewrote the sentence to compose `stationLabel(system)` in place of the literal, matching every other station reference on this sidebar.
- **Files modified:** `components/rocker/rocker-controls.tsx`
- **Verification:** `grep -c '12&quot;' components/rocker/rocker-controls.tsx` returns 0; `npm test` clean.
- **Committed in:** `5da83aa` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality — a hand-typed station literal the plan's own prohibition disallowed)
**Impact on plan:** Necessary for correctness against the plan's own stated prohibition. No scope change; documented one acceptance criterion (`ImperialField` grep) that is unmeetable within this plan's file scope, per "Decisions Made" above.

## Issues Encountered

None beyond the two items captured above (both resolved inline).

## User Setup Required

None - no external service configuration required.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, none of the following halted execution — each is a `<human-check>` from this plan's tasks, listed here for the phase verifier to harvest into the end-of-phase UAT batch:

1. **Task 1 (sliders):** On Metric the seven ROCKER sliders read in whole millimetres, move a millimetre at a time, and the two read-outs under the lift sliders name their station in centimetres. The angle and smoothness rows are untouched. On Imperial the sidebar is exactly as it was.
2. **Task 2 (datasheet):** On Metric the datasheet's row labels say which unit each row is in, the station columns are named in centimetres, every cell is a bare number, and typing into a thickness cell then tabbing away re-prints it as a whole millimetre. Typing nonsense puts the old number back with an error line. On Imperial the whole table is unchanged.
3. **Task 3 (drawing):** On Metric the rocker drawing's five stations are named in centimetres and every callout number reads in millimetres; the drawing itself has not moved. On Imperial it is unchanged. Check one dark theme as well as Daylight.

## Next Phase Readiness

- The whole ROCKER screen — sidebar, datasheet and drawing — is fully converted and held to the units-isolation ledger.
- `MeasureField` is now the app's only typed measurement control; `ImperialField` is gone.
- Plans 04-07 (RAILS, FINS, VOLUME, and any remaining screen work) can build on the same `measureSlider`/`formatMark`/`stationLabel`/`MeasureField` patterns this plan reused without modification.
- No blockers. `npm test` (1974 passed, 2 skipped), `npx tsc --noEmit` (ignoring the known phantom `LayoutProps` worktree noise) and `npm run lint` (0 errors, pre-existing unrelated warnings only) are all clean. `lib/geometry/rocker.test.ts` and `lib/geometry/template.test.ts` are confirmed unedited. `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
