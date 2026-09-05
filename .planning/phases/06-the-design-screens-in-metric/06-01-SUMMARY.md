---
phase: 06-the-design-screens-in-metric
plan: 01
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry]

# Dependency graph
requires:
  - phase: 05-the-units-chooser
    provides: "useUnits()/UnitsSystem, formatCentimetres/formatWholeMm/roundToWholeMm/parseMetric, the units-isolation.test.ts source-contract idiom"
provides:
  - "lib/geometry/measure-display.ts — the one display boundary every design-screen component reads a measurement through (formatDim/formatMark/formatSignedDim/formatLength/stationLabel/columnUnitSuffix/measureSlider/commitTypedMeasure)"
  - "metricSliderRange in lib/geometry/units.ts — derives a metric slider's mm-domain bounds from its existing inch range"
  - "the design-screen conversion ledger in lib/units-isolation.test.ts (DESIGN_SCREEN_DISPLAY_FILES/BANNED_DISPLAY_FORMATTERS/OUT_OF_SCOPE_UNITS_FILES)"
  - "the Template Builder's Width/Offset/Tail Block/Depth sliders and the Template viewer's callouts reading in the chosen system"
affects: ["06-02", "06-03", "06-04", "06-05", "06-06", "06-07"]

# Actuals (#2632)
actuals:
  tokens: 14795
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "measureSlider(value, rangeIn, stepIn, stepMm, system) — the one call every slider makes for its per-system value/min/max/step and a toMm clamp+snap function"
    - "commitTypedMeasure({ typed, current, family, min, max, system, bare }) — the shared typed-field commit pipeline Plan 02's MeasureField calls into"
    - "formatDim/formatMark (own-unit) vs formatDimBare/formatMarkBare (table-cell, unit in header) — D-09/D-10's two composition modes"
    - "source-contract ledger (lib/units-isolation.test.ts) mechanically fails the suite if a converted display file imports a raw units.ts formatter, or if a new screen .tsx reads lib/geometry/units unlisted"

key-files:
  created:
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/units-isolation.test.ts
    - components/outline/outline-controls.tsx
    - components/outline/outline-viewer.tsx

key-decisions:
  - "metricSliderRange rounds a slider's minimum up and its maximum down onto the metric step grid with a signed 1e-9 nudge (same idiom as formatCentimetres/formatWholeMm), and normalizes a resulting -0 to a plain 0"
  - "outline-controls.tsx's local withEndWidth helper now takes Mm directly instead of inches, so Tail Block's metric drag commits without an inches round-trip"
  - "outline-viewer.tsx's Imperial dual-length-form ('6'2\" (74\")') is composed from formatLength/formatDim (which call formatFeetInches/formatInchesFraction internally) rather than importing those two formatters directly, so the file can be marked converted:true in the ledger with zero banned-formatter imports while staying byte-identical for Imperial"
  - "outline-controls.tsx stays converted:false in the ledger even after 4 of its 5 sliders are converted, because Board Length still calls formatFeetInches directly until Plan 02's MeasureField replaces the feet/inches Selects"
  - "the tracer feedback gate (Task 1) was paused for orchestrator/human sign-off per the interactive-run protocol, then resumed under the project's human_verify_mode: end-of-phase ruling — all three tasks' <human-check> items are deferred to the end-of-phase UAT batch rather than blocking here"

patterns-established:
  - "Pattern: every design-screen slider call site computes value/min/max/step/toMm from measureSlider(...) once per render, reusing the SliderRow it already renders into"
  - "Pattern: a component's imperial branch routes through measure-display.ts's own formatters (not raw units.ts calls) even when byte-identical to the pre-Phase-6 string, so the units-isolation ledger's banned-formatter check has no exception to special-case"

requirements-completed: [SCRN-01, SCRN-03]

coverage:
  - id: D1
    description: "metricSliderRange derives a metric slider's mm bounds from its inch range, rounding inward with a signed nudge so metric ranges always sit inside their imperial range"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/geometry/units.test.ts#metricSliderRange"
        status: pass
    human_judgment: false
  - id: D2
    description: "lib/geometry/measure-display.ts — the pure display boundary (formatDim/formatDimBare/formatMark/formatMarkBare/formatSignedDim/formatLength/stationLabel/columnUnitSuffix/measureSlider/commitTypedMeasure)"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/geometry/measure-display.test.ts (41 tests, all exports covered, UNITS_SYSTEMS invariant included)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Template Builder sidebar: Width, Offset, Tail Block and Depth sliders read and step in the chosen system (Board Length excluded — Plan 02)"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/geometry/measure-display.test.ts#measureSlider, lib/geometry/units.test.ts#metricSliderRange"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (slider reads '51.4 cm', thumb steps in whole mm, ends at 40.7/63.5, Offset shows a leading +/-, Depth reads whole mm, Imperial unchanged) requires a browser per Task 1 and Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D4
    description: "lib/units-isolation.test.ts design-screen ledger (DESIGN_SCREEN_DISPLAY_FILES/BANNED_DISPLAY_FORMATTERS/OUT_OF_SCOPE_UNITS_FILES) mechanically enforces the display boundary across all 20 screen files that import lib/geometry/units"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (10 tests, including the completeness assertion over every .tsx under the five screen folders)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Template viewer: length callout, nose/centre/tail width callouts, widepoint chip, widepoint-offset text and tail block value all read in centimetres in Metric, byte-identical in Imperial"
    requirement: "SCRN-03"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (outline-viewer.tsx asserted converted:true, zero banned formatters)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation of the drawn callouts (length reads a single cm figure, width callouts read cm with '@ 30.5 cm' stations, tail block reads '… cm wide', Imperial unchanged, checked in one dark theme) requires a browser per Task 3's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: 55min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 1: The Template Screen's Shared Metric Plumbing Summary

**New `lib/geometry/measure-display.ts` display boundary + `metricSliderRange` bounds helper, wired through the Template Builder's four measurement sliders and the Template viewer's callouts, plus a mechanical ledger pinning every future screen to the same boundary.**

## Performance

- **Duration:** ~55 min (across a tracer checkpoint pause for orchestrator sign-off)
- **Tasks:** 3
- **Files modified:** 7 (2 new, 5 modified)

## Accomplishments

- Built `lib/geometry/measure-display.ts`, the one place a design number becomes the string a shaper reads or a slider's per-system bounds/step/clamp/snap — `formatDim`, `formatDimBare`, `formatMark`, `formatMarkBare`, `formatSignedDim`, `formatLength`, `stationLabel`, `columnUnitSuffix`, `measureSlider`, `commitTypedMeasure`, each fully unit-tested (41 tests) including a `UNITS_SYSTEMS` invariant test so a dropped branch fails loudly instead of silently falling back to Imperial.
- Added `metricSliderRange` to `lib/geometry/units.ts`: derives a metric slider's millimetre bounds from its existing inch range, rounding the minimum up and the maximum down onto the step grid with the same signed-epsilon nudge `formatCentimetres`/`formatWholeMm` already use, so `25 * 25.4`'s float noise (`634.99999999999996`) still lands the widepoint width's Metric maximum on `635`, not `634`.
- Converted the Template Builder's Width, Offset, Tail Block and Depth sliders: on Metric they now read `Width — 51.4 cm`, `Offset — +5.1 cm` / `-2.5 cm` / `0 cm`, `Tail Block — … cm`, and `Depth — … mm`, each stepping in whole millimetres; Imperial is byte-identical to before a system flip.
- Converted the Template viewer's callouts: the length callout, the nose/centre/tail width readouts (with honest `@ 30.5 cm` station names), the widepoint chip, the widepoint-offset text and the tail block value all read in centimetres on Metric; Imperial (dual `6'2" (74")` length form included) is unchanged.
- Added the design-screen conversion ledger to `lib/units-isolation.test.ts`: `DESIGN_SCREEN_DISPLAY_FILES` (15 files, each with a `converted` flag), `OUT_OF_SCOPE_UNITS_FILES` (5 files that legitimately read `lib/geometry/units` without being a display site), and a completeness assertion that fails the suite if any of the 20 `.tsx` files under the five screen folders that import `lib/geometry/units` today is left off both lists — so a display file added later can never be silently missed.

## Task Commits

Each task was committed atomically:

1. **Task 1: One measurement end to end — the widepoint width, in centimetres** - `d53c8f1` (feat)
2. **Task 2: The rest of the Template Builder's sliders, and the ledger that keeps them honest** - `91c71ca` (feat)
3. **Task 3: The Template viewer's callouts read in centimetres** - `3d3151a` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `lib/geometry/measure-display.ts` - New pure display boundary module: every formatter and slider/typed-field helper a design screen calls
- `lib/geometry/measure-display.test.ts` - 41 tests covering every export plus the UNITS_SYSTEMS invariant
- `lib/geometry/units.ts` - Added `metricSliderRange`, `MetricSliderRange`, `MeasureFamily`
- `lib/geometry/units.test.ts` - 9 new `metricSliderRange` cases, each expectation derived from the named inch constant with a provenance comment, plus the D-06 inside-imperial-range invariant test
- `lib/units-isolation.test.ts` - New "the design screens read every measurement through the display boundary" describe block: the ledger, its four assertions, and `measure-display.ts` added to the existing purity check
- `components/outline/outline-controls.tsx` - Width/Offset/Tail Block/Depth sliders wired through `useUnits()`/`measureSlider`/`formatDim`/`formatSignedDim`/`formatMark`; `withEndWidth` now takes `Mm` directly
- `components/outline/outline-viewer.tsx` - `"use client"` added; length callout, width callouts, widepoint chip, offset text and tail block value all read through `useUnits()`/`formatDim`/`formatLength`/`stationLabel`

## Decisions Made

- `metricSliderRange`'s `-0` edge case (a zero bound after `Math.ceil(-1e-9)`) is normalized to a plain `0` — caught by the `{min: 0, max: 9}`/`{min: 0, max: 0.5}` test cases failing on a `-0`/`+0` `toEqual` mismatch, fixed with a one-line normalize rather than changing the rounding formula.
- `withEndWidth` (a local helper in `outline-controls.tsx`, called from one site) was changed to accept `Mm` directly instead of inches, so Tail Block's metric drag commits its snapped millimetre value with no inches round-trip — a small, contained refactor since it's file-local and only reachable from the one call site this plan already touches.
- `outline-viewer.tsx`'s Imperial dual-length-form (`6'2" (74")`) is now composed from `formatLength(value, "imperial")` + `formatDim(value, "imperial")` rather than importing `formatFeetInches`/`formatInchesFraction` from `units.ts` directly — both still delegate to the exact same underlying calls internally, so the printed string is byte-identical, but the file no longer imports a banned raw formatter and can be marked `converted: true` in the ledger with zero exceptions needed.
- `outline-controls.tsx` stays `converted: false` in the ledger even though Task 2 converted 4 of its 5 measurement sliders — its Board Length control still calls `formatFeetInches` directly and will until Plan 02's `MeasureField` replaces the feet/inches Selects, and the ledger's banned-formatter check is per-file, not per-slider.
- Per the tracer feedback gate, Task 1 was committed and automatically verified, then this execution paused for a `checkpoint:human-verify` since GSD's `workflow.auto_advance`/`_auto_chain_active` were both `false` (interactive-run protocol). The orchestrator's resume message clarified the project's `workflow.human_verify_mode: "end-of-phase"` setting means a `checkpoint:human-verify` never halts mid-plan — its `<human-check>` text is instead harvested into the end-of-phase UAT batch. Execution resumed and completed Tasks 2 and 3 under that ruling; all three tasks' human-check items are listed below for the phase verifier.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, none of the following halted execution — each is a `<human-check>` from this plan's tasks, listed here for the phase verifier to harvest into the end-of-phase UAT batch:

1. **Task 1 (Width slider):** On the Template Builder with Metric chosen, the Width row reads `Width — 51.4 cm` for a 20 1/4 in board, the thumb moves a millimetre at a time, and the ends of its travel are 40.7 and 63.5. Switch to Imperial and the row is exactly as before.
2. **Task 2 (Offset/Tail Block/Depth sliders):** On Metric, the Offset row reads with a leading `+` toward the nose and a leading `-` toward the tail, `0 cm` dead centre; Depth on a swallow or diamond tail reads in whole millimetres; the percent and angle rows are unchanged. On Imperial everything reads as it did.
3. **Task 3 (viewer callouts):** On Metric, the Template viewer's length callout reads a single centimetre figure, the three width callouts read in centimetres with their stations named `@ 30.5 cm`, and the tail block reads `… cm wide`. On Imperial the drawing is unchanged, dual length form included. Check one dark theme as well as Daylight.

## Deviations from Plan

None - plan executed exactly as written, with two file-local implementation choices noted above under Decisions Made (the `withEndWidth` signature change and the `outline-viewer.tsx` Imperial composition routing through `measure-display.ts` instead of raw `units.ts` imports) — both were needed to satisfy the plan's own acceptance criteria (the ledger's banned-formatter check) without changing any printed string, so neither is a scope change.

## Issues Encountered

None beyond the `-0`/`metricSliderRange` normalization above, caught immediately by the test suite and fixed inline (Rule 1 - auto-fixed bug).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared plumbing (`measure-display.ts`, `metricSliderRange`, the conversion ledger) is in place for Plans 02-07 to reuse without re-deriving any of it.
- `components/outline/outline-controls.tsx`'s Board Length control is the one remaining unconverted piece of the TEMPLATE screen — Plan 02 builds the typed `MeasureField` (D-08) that replaces its feet/inches Selects and flips its ledger entry to `converted: true`.
- No blockers. `npm test` (1956 passed, 2 skipped), `npx tsc --noEmit` and `npm run lint` are all clean; `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
