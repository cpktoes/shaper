---
phase: 06-the-design-screens-in-metric
plan: 06
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "06-01 — lib/geometry/measure-display.ts (formatDim/formatMark/formatSignedDim/formatLength/stationLabel/measureSlider), metricSliderRange in lib/geometry/units.ts, the design-screen conversion ledger in lib/units-isolation.test.ts"
  - phase: 06-the-design-screens-in-metric
    provides: "06-02 — components/design/measure-field.tsx (MeasureField), the Board Length control already converted in fin-controls.tsx"
  - phase: 06-the-design-screens-in-metric
    provides: "06-05 — FinSummaryRow.family/FinSummaryGroup.fullSpreadFamily tagging in lib/geometry/fins.ts, the Fins DATA tab and toe-aim modal already converted"
provides:
  - "components/fins/fin-controls.tsx converted: true in the units-isolation ledger — the whole FINS sidebar (tail width, fin base length, position/toe/off-rail/off-tail sliders) reads in the shaper's chosen system"
  - "components/fins/fin-viewer.tsx converted: true in the units-isolation ledger — the fin drawing's callouts, summary heading and base-length legend read in the shaper's chosen system"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6186
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BaseLengthField (file-local, fin-controls.tsx) takes a stored Mm value, a system and the min/max/step/toMm from one measureSlider call made by the caller — the same 'never convert inside the shared control' seam every other typed/slider control in this phase uses"
    - "A local diagram helper (dimsForMark in fin-viewer.tsx) takes system as a plain parameter rather than reading useUnits() itself, since it lives outside the component; the component reads the hook once and threads it down, matching the plan's own instruction"

key-files:
  created: []
  modified:
    - components/fins/fin-controls.tsx
    - components/fins/fin-viewer.tsx
    - lib/units-isolation.test.ts

key-decisions:
  - "BaseLengthField's number-box display value is computed inline (`system === \"metric\" ? value : mmToInches(value)`) rather than through a new measure-display export, because Mm IS the metric domain number for this field (no conversion needed) and mmToInches is already the sanctioned units.ts boundary call for the imperial branch — matching how measureSlider's own imperial branch works internally."
  - "The quad rear off-tail heading's quarter-inch term is computed once per render (`quarterInchRuleText = formatMark(inchesToMm(0.25), system)`) and reused in both the static heading and the auto-suffix, so the fixed rule and the live suffix can never drift apart from a single source."
  - "fin-viewer.tsx's dimsForMark (a file-local, non-component helper) gained a trailing `system: UnitsSystem` parameter rather than reading useUnits() itself, since it is called from inside a useMemo, not a component body — the component's own useUnits() call is threaded down as a plain argument, per the plan's explicit instruction."

patterns-established: []

requirements-completed: [SCRN-01, SCRN-02, SCRN-03]

coverage:
  - id: D1
    description: "BaseLengthField (all three sites: center/forward/rear Fin Base Length) takes a stored Mm value, system and measureSlider-derived min/max/step/toMm; blurred display reads formatMark(value, system) + conditional ' standard' suffix; number box steps 1mm/64-190 in Metric, 1/8in/2.5-7.5 in Imperial; Tail Width @ 12\" label/slider read through stationLabel/formatDim/measureSlider"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "npm test -- components/design/slider-row.test.ts (FINS raw-slider count still 2, exactly the allowlisted Board Length + Tail Width hand-rolled sliders)"
        status: pass
      - kind: unit
        ref: "grep checks: 'valueIn' count 0 outside comments, 'opacity: importTemplate ? 0.45 : 1' count 3 (the three shared dimming wrappers untouched)"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (Metric: Tail Width names its station in centimetres and reads its width in centimetres; each Fin Base Length reads '114 mm standard'; Override takes whole millimetres stepping one at a time, refusing below 64 or above 190; Import Template Values dims both rows unchanged; Imperial byte-identical) requires a browser per Task 1's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D2
    description: "Every remaining FINS slider (three Forward/Aft position rows, two Toe-in rows, the Off-Rail row, the quad rear off-tail override) converts through one measureSlider call each, labels formatted by family (formatDim for distances off the tail, formatMark for toe-in/off-rail); the quad rear heading's fixed quarter-inch term reads through the display boundary in both systems; formatInchesFraction import removed"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "npm test -- lib/geometry/fins.test.ts (157 tests, unedited, still green — the placement math is untouched)"
        status: pass
      - kind: unit
        ref: "grep checks: 'formatInchesFraction' count 0, 'measureSlider(' count 12 (>= 9 required), no literal '1/4\"' outside comments"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (Metric: every slider reads in its right family — positions and off-tail in centimetres, toe-in and off-rail in whole millimetres — with no inch mark anywhere including the quad rear heading; Imperial unchanged) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D3
    description: "fin-viewer.tsx's toe-in/off-rail callouts read formatMark, off-tail callouts read formatDim, the summary heading composes formatLength/formatDim, and the base-length legend reads formatMark; components/fins/fin-controls.tsx and components/fins/fin-viewer.tsx both flipped to converted:true in the units-isolation ledger"
    requirement: "SCRN-03"
    verification:
      - kind: unit
        ref: "npm test -- lib/units-isolation.test.ts (10 tests: both fin files asserted converted:true, zero banned formatters, every screen .tsx importing lib/geometry/units named in one of the two ledger lists)"
        status: pass
      - kind: unit
        ref: "grep checks: fin-viewer.tsx contains useUnits/formatMark/formatDim/formatLength (8 hits); formatInchesFraction/formatFeetInches count 0"
        status: pass
      - kind: unit
        ref: "npm test full suite (1987 passed, 2 skipped); npx tsc --noEmit and npm run lint both clean"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (Metric: the fin drawing's toe and off-rail callouts read in millimetres and off-tail callouts in centimetres, each with its own unit; the summary line and base-length legend follow; nothing has moved on the drawing; Imperial unchanged; checked in one dark theme as well as Daylight) requires a browser per Task 3's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: ~20min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 6: The Fins Sidebar and Drawing in Metric Summary

**The FINS screen's sidebar (fin base length in whole millimetres, tail width and every position/toe/off-rail/off-tail slider through `measureSlider`) and its dimensioned drawing (toe, off-rail, off-tail callouts, summary heading, base-length legend) now read in the shaper's chosen system — completing the FINS screen and flipping both files to `converted: true`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 3 (0 new, 3 modified)

## Accomplishments

- Converted `BaseLengthField` (the file-local component behind all three Fin Base Length rows) from an inch-domain `valueIn`/`onChangeIn` contract to a stored `Mm` value, a `system` and `min`/`max`/`step`/`toMm` derived from one `measureSlider` call per call site — Metric now reads `114 mm standard` and its Override box steps a whole millimetre at a time from 64 to 190; Imperial is byte-identical.
- Converted the hand-rolled Tail Width `@ 12"` block: the label now composes `stationLabel(system)` and `formatDim(spec.tailWidth12, system)` (`Tail Width @ 30.5 cm — 36.8 cm` on Metric), and its raw `Slider` runs through `measureSlider` against the same inline 10–18in range, giving 254–457mm on Metric.
- Converted every remaining measurement control on the sidebar: the three Forward/Aft position sliders (their own signed-offset domain converts through `measureSlider` against `POS_BOUNDS`, while their labels print the *resolved* distance off the tail through `formatDim` — a deliberately different value from what the track holds), the two Toe-in sliders and the Off-Rail slider (`formatMark`, `TOE_BOUNDS`/`OFF_RAIL_BOUNDS`), and the quad rear off-tail override (`formatDim`, `OFF_TAIL_OVERRIDE_BOUNDS`). The quad rear heading's fixed quarter-inch term and its auto suffix now both read through `formatMark(inchesToMm(0.25), system)` instead of a hand-typed `1/4"`, so Metric reads a rounded `6 mm` there while the field below still shows the actual computed value. Removed the now-unused `formatInchesFraction` import.
- Converted `fin-viewer.tsx`'s dimensioned drawing: `dimsForMark` (a file-local, non-component helper) gained a `system` parameter and now composes `formatMark` for toe-in and the lateral value (off-rail distance or half spread) and `formatDim` for the off-tail value; the compact summary heading composes `formatLength`/`formatDim`; the base-length legend reads `formatMark`. Nothing about the drawing's geometry, dash tokens, reference lines or callout placement changed.
- Flipped `components/fins/fin-controls.tsx` and `components/fins/fin-viewer.tsx` to `converted: true` in `lib/units-isolation.test.ts`'s ledger — the whole FINS screen (sidebar, DATA tab, toe-aim tables, drawing) now reads through the display boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tail width and fin base length in the shaper's units** - `bed2508` (feat)
2. **Task 2: The position, toe, off-rail and off-tail controls** - `b7bfcae` (feat)
3. **Task 3: The fin drawing's callouts, summary line and legend** - `0431563` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `components/fins/fin-controls.tsx` - `BaseLengthField` converted to a stored-`Mm`/`system` contract; Tail Width and every position/toe/off-rail/off-tail control converted through `measureSlider`; `formatInchesFraction` import removed
- `components/fins/fin-viewer.tsx` - `useUnits()` added; `dimsForMark` gained a `system` parameter; toe/lateral/off-tail callouts, the compact summary heading and the base-length legend converted to `formatMark`/`formatDim`/`formatLength`
- `lib/units-isolation.test.ts` - `components/fins/fin-controls.tsx` and `components/fins/fin-viewer.tsx` flipped to `converted: true`

## Decisions Made

- `BaseLengthField`'s number-box display value is computed inline (`system === "metric" ? value : mmToInches(value)`) rather than adding a new `measure-display.ts` export — the stored `Mm` value already *is* the metric-domain display number for this field (no conversion needed), and `mmToInches` is the sanctioned `units.ts` boundary call for the imperial branch, matching exactly what `measureSlider`'s own imperial branch does internally for every other slider.
- The quad rear off-tail heading's quarter-inch term is computed once per render (`quarterInchRuleText = formatMark(inchesToMm(0.25), system)`) and reused in both the static heading text and the live auto-suffix, so the fixed rule and the suffix can never read two different millimetre roundings of the same quarter inch.
- `fin-viewer.tsx`'s `dimsForMark` — a file-local helper called from inside a `useMemo`, not a component — gained a trailing `system: UnitsSystem` parameter rather than calling `useUnits()` itself; the component reads the hook once and threads `system` down as a plain argument, exactly as the plan's `<action>` specified.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, none of the following halted execution — each is a `<human-check>` from this plan's tasks, listed here for the phase verifier to harvest into the end-of-phase UAT batch:

1. **Task 1 (Tail Width and Fin Base Length):** On Metric, the Tail Width row names its station in centimetres and reads its width in centimetres, and each Fin Base Length reads `114 mm standard`; pressing Override gives a box that takes whole millimetres, stepping one at a time, refusing anything below 64 or above 190. Ticking "Import Template Values" dims both rows exactly as before. On Imperial the sidebar is unchanged.
2. **Task 2 (position/toe/off-rail/off-tail controls):** On Metric, every Fins slider reads in its right family — positions and off-tail in centimetres, toe-in and off-rail in whole millimetres — with no inch mark left anywhere on the sidebar, the quad rear heading included. On Imperial the whole sidebar is unchanged.
3. **Task 3 (fin drawing callouts, summary line, legend):** On Metric, the fin drawing's toe and off-rail callouts read in millimetres and its off-tail callouts in centimetres, each with its own unit; the summary line and the base-length legend follow. Nothing has moved on the drawing. On Imperial it is unchanged. Check one dark theme as well as Daylight.

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria (grep checks, targeted test files, full suite, `tsc`, `lint`) passed on the first implementation with no auto-fixes needed.

## Known Stubs

None.

## Threat Flags

None — this plan introduces no new network endpoint, auth path, file-access pattern or schema change; it only changes how existing `FinPlacementSpec`/`FinAdvancedSpec` values already in the design store are displayed and typed, per the plan's own `<threat_model>` (T-06-01, T-06-06, T-06-02, all `mitigate`, satisfied by the `measureSlider`/family-classification pattern documented above).

## Issues Encountered

None. `npm test` (1987 passed, 2 skipped), `npx tsc --noEmit` (ignoring the known phantom `LayoutProps` worktree noise) and `npm run lint` (0 errors, pre-existing unrelated warnings only) were all clean at every task boundary. `lib/geometry/fins.test.ts`'s pre-existing golden-parity suite is confirmed unedited and green — the fin placement math is untouched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The FINS screen is now fully converted: sidebar (this plan), DATA tab and toe-aim tables (06-05), drawing (this plan).
- `lib/units-isolation.test.ts`'s ledger now has `components/fins/fin-controls.tsx` and `components/fins/fin-viewer.tsx` at `converted: true`, alongside the two files 06-05 already flipped — every FINS display site is accounted for.
- Remaining unconverted ledger entries after this plan: `components/volume/volume-controls.tsx`, `components/volume/volume-calculation-card.tsx`, `components/volume/volume-estimator.tsx` — the VOLUME screen, presumably a later plan (06-07) per the phase's rollout order.
- No blockers. `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

## Self-Check: PASSED

- `components/fins/fin-controls.tsx` - FOUND
- `components/fins/fin-viewer.tsx` - FOUND
- `lib/units-isolation.test.ts` - FOUND
- `bed2508` (Task 1 commit) - FOUND
- `b7bfcae` (Task 2 commit) - FOUND
- `0431563` (Task 3 commit) - FOUND

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
