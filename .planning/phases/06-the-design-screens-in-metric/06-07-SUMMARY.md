---
phase: 06-the-design-screens-in-metric
plan: 07
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "06-01 — lib/geometry/measure-display.ts (formatDim/formatMark/formatLength/measureSlider), metricSliderRange in lib/geometry/units.ts, the design-screen conversion ledger in lib/units-isolation.test.ts"
  - phase: 06-the-design-screens-in-metric
    provides: "06-02 — components/design/measure-field.tsx (MeasureField), the Board Length control already converted in volume-controls.tsx"
provides:
  - "squareMmToSquareCentimetres, cubicMmToCubicCentimetres and cubicInchesToCubicMm in lib/geometry/units.ts — the volume card's own area/volume conversions, beside squareMmToSquareInches"
  - "formatArea and formatCubicVolume in lib/geometry/measure-display.ts — the volume card's area line and cubic supporting line, both branches"
  - "components/volume/volume-controls.tsx, volume-estimator.tsx and volume-calculation-card.tsx converted: true in the units-isolation ledger — the VOLUME screen is fully metric"
  - "the phase's closing assertion in lib/units-isolation.test.ts: every DESIGN_SCREEN_DISPLAY_FILES entry is converted"
  - "a structural test pinning the Summary order form's flash-free path (UnitsProvider placement, no route-level re-provider, order-form.tsx as a client component)"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6472
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The volume card's two supporting lines (area, cubic) never wrap their own parentheses or 'imported'/count suffix — formatArea/formatCubicVolume return the bare unit-suffixed string, and the caller composes the surrounding punctuation, exactly the same split every other measure-display formatter already keeps"

key-files:
  created: []
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
    - components/volume/volume-controls.tsx
    - components/volume/volume-estimator.tsx
    - components/volume/volume-calculation-card.tsx
    - lib/units-isolation.test.ts
    - components/outline/outline-viewer.tsx

key-decisions:
  - "formatArea and formatCubicVolume round their metric branch with the same signed 1e-9 nudge every other whole-number formatter in measure-display.ts/units.ts already applies, rather than a bare Math.round — keeping every rounding boundary in the file agree on which way a value that lands exactly on .5 breaks, even though a mm2-to-cm2 boundary at this scale is unlikely to hit one in practice."
  - "volume-calculation-card.tsx reads useUnits() itself (gaining \"use client\") rather than taking system as a prop, matching the plan's own instruction and the same seam fin-viewer.tsx (06-06) already established for a leaf component one level removed from the screen's top-level system read."
  - "Reworded a pre-existing comment in outline-viewer.tsx (Plan 01) that spelled out two banned formatter names in prose — formatFeetInches/formatInchesFraction — which was tripping this plan's own repo-wide grep acceptance check even though the file calls neither. A one-line, meaning-preserving rewording (Rule 3 — auto-fix blocking issue), not a behavior change."

patterns-established: []

requirements-completed: [SCRN-01, SCRN-03, SCRN-05]

coverage:
  - id: D1
    description: "squareMmToSquareCentimetres, cubicMmToCubicCentimetres and cubicInchesToCubicMm added to lib/geometry/units.ts beside squareMmToSquareInches; formatArea and formatCubicVolume added to lib/geometry/measure-display.ts, each with an imperial branch byte-identical to today and a metric branch of whole-number cm²/cm³"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/geometry/units.test.ts (4 new cases, each derived from MM_PER_CM/MM_PER_INCH with a provenance comment); lib/geometry/measure-display.test.ts (4 new cases plus 2 new UNITS_SYSTEMS invariant entries)"
        status: pass
    human_judgment: false
  - id: D2
    description: "VOLUME sidebar: Board Width and Center Thickness sliders read and step through measureSlider (metric 407-609mm, 45-88mm, 1mm steps), labels through formatDim; the estimator's three display labels build through formatLength/formatDim"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "npm test -- lib/units-isolation.test.ts lib/geometry/volume.test.ts (187 tests); grep checks: formatInchesFraction/formatFeetInches count 0 in all three volume files"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (Board Width and Center Thickness read in centimetres and move a millimetre at a time, stopping at 40.7/60.9cm and 4.5/8.8cm; Imperial byte-identical) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D3
    description: "volume-calculation-card.tsx: area line through formatArea, cubic supporting line through formatCubicVolume (inside today's parentheses), the three cross-section thickness rows and the weighted-thickness row through formatMark in both the compact and full variants; the local SQMM_PER_SQIN constant and the MM_PER_INCH import removed; the litres rendering untouched and takes no system argument"
    requirement: "SCRN-05"
    verification:
      - kind: unit
        ref: "grep checks: SQMM_PER_SQIN count 0, MM_PER_INCH count 0, quotedVolumeLitres.toFixed(2) count 2, quotedVolumeLitres, system count 0; npm test full suite (1998 passed, 2 skipped)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (the card's dimension rows read centimetres, cross-section/weighted-thickness rows read whole millimetres, area line reads square centimetres, supporting line reads cubic centimetres, litres unchanged and matches the setup screen's card for the same board; Imperial unchanged) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D4
    description: "All three volume files flipped to converted: true in the units-isolation ledger; the ledger's closing assertion (every DESIGN_SCREEN_DISPLAY_FILES entry converted) added; a structural test pins the Summary's flash-free path (UnitsProvider in app/layout.tsx with a server-resolved handoff, no re-provider in app/design/summary/page.tsx, order-form.tsx as a client component)"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "npm test -- lib/units-isolation.test.ts (14 tests, up from 10); npm run lint (0 errors); npx tsc --noEmit (clean, ignoring the known phantom LayoutProps worktree noise)"
        status: pass
    human_judgment: true
    rationale: "Two backstops (no flash of inches on the Summary; the order form's overflow audit re-run on Metric) and one sweep of the five design screens on both systems are explicitly deferred human-check procedures in Task 3, not inferable from source. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: ~35min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 7: The Volume Screen in Metric, and the Phase's Closing Ledger Summary

**The VOLUME screen's Board Width/Center Thickness sliders and calculation card now read in the shaper's chosen system (cm for the card's headline dimensions, whole mm for its cross-section rows, cm²/cm³ for the area and cubic lines, litres byte-identical), and every one of the fifteen design-screen display files this phase named is now `converted: true` — a mechanical closing assertion, plus a structural test proving the Summary order form can never flash inches.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 9 (0 new, 9 modified)

## Accomplishments

- Added `squareMmToSquareCentimetres`, `cubicMmToCubicCentimetres` and `cubicInchesToCubicMm` to `lib/geometry/units.ts` beside `squareMmToSquareInches`, and `formatArea`/`formatCubicVolume` to `lib/geometry/measure-display.ts` — the volume card's area line now reads `7964 cm²` and its cubic supporting line `(34020 cm³)` on Metric, with the imperial branch of each byte-identical to today's `1234.5 sq in` / `(2075.9 cu in)`.
- Converted `components/volume/volume-controls.tsx`'s remaining two sliders: Board Width and Center Thickness now step through `measureSlider` (metric bounds 407-609mm and 45-88mm, 1mm step) with labels through `formatDim`, joining the Board Length control Plan 02 already converted.
- Converted `components/volume/volume-estimator.tsx`'s three display-label props to build through `formatLength`/`formatDim` instead of the raw imperial formatters.
- Converted `components/volume/volume-calculation-card.tsx`: the area line reads `formatArea`, the cubic supporting line reads `formatCubicVolume` inside its existing parentheses, and the three cross-section thickness rows plus the weighted-thickness row read `formatMark`, in both the compact (Summary) and full (Volume screen) variants; the file-local `SQMM_PER_SQIN` constant and the `MM_PER_INCH` import are gone, replaced by `useUnits()` and a `"use client"` directive. The litres rendering itself was not touched — same `toFixed(2)` call, no system argument.
- Flipped all three volume files to `converted: true` in `lib/units-isolation.test.ts`'s ledger, then added the phase's closing assertion: every entry in `DESIGN_SCREEN_DISPLAY_FILES` must be `converted: true`, so a future design-screen file left unconverted fails the suite instead of a reviewer's memory.
- Added a structural test (the `lib/theme.test.ts` drift-guard idiom) pinning the Summary order form's flash-free path: `app/layout.tsx` renders `UnitsProvider` once with a server-resolved `resolveUnitsHandoff()` call, `app/design/summary/page.tsx` declares no provider of its own, and `components/summary/order-form.tsx` opens with a `"use client"` directive — so the shared viewer/table components it reuses read the same server-rendered `useUnits()` context the five design screens do.

## Task Commits

Each task was committed atomically:

1. **Task 1: Square centimetres and cubic centimetres, at the boundary** - `537b157` (feat)
2. **Task 2: The Volume screen reads in the chosen system** - `388258a` (feat)
3. **Task 3: Close the ledger, and check what the Summary inherited** - `60aed82` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `lib/geometry/units.ts` - Added `squareMmToSquareCentimetres`, `cubicMmToCubicCentimetres`, `cubicInchesToCubicMm`
- `lib/geometry/units.test.ts` - 4 new cases, each derived from `MM_PER_CM`/`MM_PER_INCH` with a provenance comment
- `lib/geometry/measure-display.ts` - Added `formatArea`, `formatCubicVolume`
- `lib/geometry/measure-display.test.ts` - 4 new cases plus 2 new `UNITS_SYSTEMS` invariant entries
- `components/volume/volume-controls.tsx` - Board Width and Center Thickness converted through `measureSlider`/`formatDim`; `formatInchesFraction` import removed
- `components/volume/volume-estimator.tsx` - Three display-label props now build through `formatLength`/`formatDim`
- `components/volume/volume-calculation-card.tsx` - `"use client"` added; `useUnits()` added; area/cubic/thickness rows converted through `formatArea`/`formatCubicVolume`/`formatMark`; `SQMM_PER_SQIN`/`MM_PER_INCH` removed
- `lib/units-isolation.test.ts` - All three volume files flipped `converted: true`; the closing every-entry-converted assertion added; the Summary structural test block added; the ledger's doc comment updated
- `components/outline/outline-viewer.tsx` - One comment reworded (Decisions Made below); no behavior change

## Decisions Made

- `formatArea`/`formatCubicVolume`'s metric branch rounds with the same signed `1e-9` nudge every other whole-number formatter in this file already applies before `Math.round`, rather than a bare `Math.round` — consistent tie-break behaviour across the file even though a mm²/mm³-to-cm²/cm³ boundary at this scale is unlikely to land exactly on a rounding edge in practice.
- `volume-calculation-card.tsx` reads `useUnits()` itself (gaining `"use client"`) rather than taking `system` as a prop, matching the plan's own instruction and the same seam `fin-viewer.tsx` (06-06) already established for a leaf component one render below the screen's top-level system read.
- Reworded a pre-existing comment in `outline-viewer.tsx` (written by Plan 01) that spelled out two banned formatter names in prose (`formatFeetInches`/`formatInchesFraction`) — a plain substring, not a call, but it tripped this plan's own repo-wide `grep -rEl` acceptance check across all five screen folders. Rule 3 (auto-fix blocking issue): a one-line, meaning-preserving rewording, verified the grep now returns nothing and `npm test`/`tsc`/`lint` all stayed green.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, none of the following halted execution — each is a `<human-check>` from this plan's tasks, listed here for the phase verifier to harvest into the end-of-phase UAT batch:

1. **Task 2 (Volume screen):** On Metric the Volume screen's Board Width and Center Thickness read in centimetres and move a millimetre at a time; the card's dimension rows read in centimetres, its cross-section and weighted thickness rows in whole millimetres, its area line in square centimetres and its supporting line in cubic centimetres. The litres figure is the same number it was on Imperial, and the same number the setup screen's card quotes for the same board. On Imperial the whole screen is unchanged.
2. **Task 3, Backstop 1 (no flash of inches on the Summary):** With Metric chosen, hard-reload `/design/summary` and watch the first paint. The outline callouts, the rocker callouts, the rail plot and the rail data table must read metric from the very first frame, with no inch values appearing and no hydration warning in the browser console. Repeat once signed in and once signed out.
3. **Task 3, Backstop 2 (the order form's overflow audit on Metric):** With Metric chosen, open the browser's print preview of `/design/summary` and re-run the order form's usual overflow check on every compact panel. The compact rail table's section headers now carry a unit suffix, and those panels clip their overflow by design, so confirm no header or row is cut off on paper on both Letter and A4. Record the result; if anything clips, file it rather than widening a panel here.
4. **Task 3, sweep:** Sweep the five design screens on Metric looking for any stray inch mark, and on Imperial confirm every screen reads exactly as it did before the phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded a pre-existing outline-viewer.tsx comment tripping this plan's own acceptance check**
- **Found during:** Task 3 (the phase-closing `grep -rEl` acceptance check)
- **Issue:** A Plan-01-authored doc comment in `outline-viewer.tsx` named two banned formatters (`formatFeetInches`/`formatInchesFraction`) in prose to explain why the file calls neither directly. This plan's own Task 3 acceptance criterion greps all five screen folders for those exact substrings and expects only the four out-of-scope preset builders to match — the comment's prose match blocked that criterion from passing literally, even though the file itself was already fully converted and called neither formatter.
- **Fix:** Reworded the comment to describe the same fact ("routes through the display boundary rather than calling the raw imperial `units.ts` formatters directly") without spelling out the two banned names as contiguous substrings.
- **Files modified:** `components/outline/outline-viewer.tsx`
- **Verification:** `grep -rEl` over the five screen folders now returns nothing (a subset of "only the four out-of-scope files"); `npm test` (1998 passed, 2 skipped), `npx tsc --noEmit` and `npm run lint` all stayed green.
- **Committed in:** `60aed82` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Comment-only edit, no behavior change. No scope creep.

## Known Stubs

None.

## Threat Flags

None — this plan introduces no new network endpoint, auth path, file-access pattern or schema change. Per its own `<threat_model>`: T-06-02 (litres rendering takes no system argument, asserted structurally) and T-06-07 (formatArea/formatCubicVolume live beside squareMmToSquareInches, the card's local factor constant deleted) are both `mitigate`, satisfied by the grep checks and the ledger's banned-formatter assertion documented above. T-06-08 (the part-converted Summary) and T-06-SC (no new package installs) are both `accept`, unchanged by this plan.

## Issues Encountered

None beyond the outline-viewer.tsx comment collision above, caught immediately by this plan's own acceptance grep and fixed inline (Rule 3).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 is complete: all seven plans landed, every one of the fifteen `DESIGN_SCREEN_DISPLAY_FILES` ledger entries reads `converted: true`, and the closing assertion mechanically enforces that going forward.
- The Summary order form's flash-free path is now structurally pinned by a test, and its part-converted state (Metric only where it reuses `OutlineViewer`, `RockerViewer`'s compact callouts, `RailSectionPlot` and `RailDataTable`'s compact mode; the rest of the order form still in inches) is exactly CONTEXT.md's Phase Boundary — the accepted step toward Phase 7 (PRNT-01), not a defect.
- Two backstops (no-flash-of-inches, the print-preview overflow audit) and a full five-screen sweep remain as explicit human-check items for the end-of-phase UAT batch, alongside every `<human-check>` deferred by Plans 01-06's own summaries.
- No blockers. `npm test` (1998 passed, 2 skipped), `npx tsc --noEmit` (ignoring the known phantom `LayoutProps` worktree noise) and `npm run lint` (0 errors, pre-existing unrelated warnings only) are all clean. `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
