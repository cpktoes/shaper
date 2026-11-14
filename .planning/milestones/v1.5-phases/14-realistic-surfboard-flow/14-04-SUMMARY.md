---
phase: 14-realistic-surfboard-flow
plan: 04
subsystem: geometry (hand-set board, foil, design figures)
status: complete
tags: [curves-step, hand-set, square-root-rule, D-13, D-25, R3, R4, acceptance-8]
requires:
  - "14-01: PHASE14_TODAY (the pin) — handSet five-plus-five, 1\" sweep and litres"
  - "14-02: prepareRootCurve(points, kind), CurveRule (lib/geometry/root-curve.ts)"
provides:
  - "BoardProfileInput.handSetCurve?: CurveRule — absent is the live square-root rule; \"pchip\" is today's curve by name (D-25)"
  - "internal fallbackProfileWith(rocker, foil, length, curve) in board-profile.ts"
  - "sampleFoil on the square-root fall (same curve the hand-set profile draws)"
  - "export interface DesignRules { prepare; handSetCurve } and export function summarizeDesignWith(fields, rules) in design.ts"
  - "summarizeDesign(fields) defined as summarizeDesignWith(fields, { prepare: prepareBlank, handSetCurve: \"root\" })"
affects: [14-05, 14-06, 14-10, 14-12]
tech-stack:
  added: []
  patterns:
    - "One pipeline, rules passed in: the everyday function is the rules-taking function on the live rules, proved toEqual"
    - "Old curve kept callable only by name, for reports and pictures"
key-files:
  created: []
  modified:
    - lib/geometry/board-profile.ts
    - lib/geometry/foil.ts
    - lib/geometry/design.ts
    - lib/geometry/board-profile.test.ts
    - lib/geometry/rocker.test.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.test.ts
    - lib/geometry/phase14-today-handset.test.ts
decisions:
  - "The sampleFoil switch went into Task 1's commit, not Task 2's: the hand-set side view and sampleFoil are tested to agree bit for bit (board-profile.test and volume.test), so moving one without the other would have left the suite red between commits."
metrics:
  duration: "about 25 minutes"
  completed: 2026-10-02
  tasks: 3
  files: 8
actuals:
  tokens: 7400    # chars/4 over the realized diff (29,589 chars)
  tasks: 3
  commits: 3
---

# Phase 14 Plan 04: The first board a visitor sees moves onto the new curves. Summary

**A board with no blank now draws its rocker with the square-root rise and its foil with the square-root fall, the same rule a blank's curves use. It still passes through exactly the five rocker numbers and five thicknesses the shaper typed, to the last bit. The old curve is kept by name so the reports and pictures can still show the "before", and there is now one named way to work out any board's figures under either set of curves.**

## What this means for a shaper

- **The first board a visitor sees** (6'0", no blank) keeps its five rocker numbers and five thicknesses exactly. The curve between them changes: by at most about 0.145" in rocker and 0.092" in thickness on this run. Its litres on VOLUME go from **30.06 L to 30.51 L** (measured in a scratch run, not asserted).
- **Any board without a blank** follows the same rule. RAILS doesn't move, because it reads only the five thicknesses, and those are unchanged.
- **The deck is still rocker plus thickness.** No third curve is drawn for it.
- **What the browser tests will show:** after this wave merges, the ROCKER and VOLUME desktop screenshots of the default board are the only expected browser failures, until plan 14-06 re-records them. RAILS, FINS and TEMPLATE should not move. This plan ran no Playwright.

## What was built

1. **`board-profile.ts`**
   - `buildFallbackProfile` keeps its three-argument signature and now draws with the square-root rule.
   - A private `fallbackProfileWith(…, curve)` holds the body and picks the rule.
   - `BoardProfileInput.handSetCurve?: CurveRule` lets the reports and pictures ask for `"pchip"` by name. It is ignored when a blank is picked.
   - The header, `buildFallbackProfile` and `handSetFromProfile` comments now describe the square-root rule.
2. **`foil.ts`.** `sampleFoil` now uses `prepareRootCurve(points, "fall")`, which is what VOLUME integrates when it isn't given a thickness curve. It is the same curve the hand-set side view draws, so the two still agree bit for bit. `preparePchip` is no longer imported there. A third header note records the change.
3. **`design.ts`**
   - New: `DesignRules { prepare, handSetCurve }` and `summarizeDesignWith(fields, rules)`.
   - `summarizeDesign(fields)` keeps its one-argument signature and is now `summarizeDesignWith(fields, { prepare: prepareBlank, handSetCurve: "root" })`.
   - None of the tips step's names appear in code or comments.
4. **Tests**
   - **The acceptance-8 test** (`board-profile.test.ts`):
     - The five rocker numbers and five thicknesses read back `toBe` the typed values.
     - `effectiveFoil` and `stationRocker` are exact.
     - The lowest rocker over a 1/8" sweep plus the five stations is exactly 0.
     - The deck equals rocker + thickness exactly on a 1" sweep.
   - **Another new test** proves the default board is the square-root rise and fall between stations, and that it differs from the pchip curve.
   - **The foil test**, `draws the foil through the five stored thicknesses with the square-root fall (Phase 14 D-13)`, is retargeted.
   - **`volume.test.ts`**
     - `sampleFoil is the square-root fall through the five foil stations, everywhere along the board (Phase 14 D-13)` is retargeted.
     - New: `sampleFoil` reads exactly what the hand-set side view draws, on a 1/8" sweep and at the five stations.
     - The Arctic Foam 7'3" SBF note now quotes this run's figure: **79.72 L against the stated 77.17 L, 3.30%**, still inside the unchanged 10% bar. The stale 78.85 L is gone.
   - **`rocker.test.ts`.** The two hand-set rocker tests now build the curve with the square-root rise. Both still check the same things: exact at the stations, never negative, and a minimum of exactly 0 across the whole lift grid.
   - **`phase14-today-handset.test.ts`**
     - Passes `handSetCurve: "pchip"` and still reproduces the pinned five-plus-five and 1" sweep with `toBe`. Its describe is retitled to "reproduced by today's curve kept by name (D-25, D-26)".
     - New: `summarizeDesignWith(default board, { prepareBlank, "pchip" })` gives exactly the pinned litres (`toBe`).
     - New: on `"root"` the litres differ from the pin.
   - **`design.test.ts`.** New test: `summarizeDesign is summarizeDesignWith on the live rules, for the presets and the first board a visitor sees`, `toEqual`, over the four presets and the default board.

## Verification

- `npx vitest run lib/geometry/board-profile.test.ts lib/geometry/foil.test.ts lib/geometry/volume.test.ts lib/geometry/rocker.test.ts lib/geometry/design.test.ts lib/geometry/phase14-today-handset.test.ts`: all pass.
- Full `npx vitest run`: 96 files, 3,681 passed, 2 skipped, 0 failed.
- `npx tsc --noEmit` (after `npx next typegen`) and `npm run lint` both exit 0.
- Every acceptance grep prints the expected count: `handSetCurve?: CurveRule` 1, the `buildFallbackProfile` signature line 1, the acceptance-8 title 1, `prepareRootCurve` in foil.ts 2, `preparePchip` in foil.ts 0, the volume title 1, `78.85` 0, `summarizeDesignWith|DesignRules` 2, the `summarizeDesign` signature line 1, the identity title 1.
- These files are byte-identical to the wave base `5da7bb0`: `lib/geometry/blank-fit.ts`, `package.json`, `package-lock.json`, `lib/geometry/phase11-foil.test.ts`, `lib/models/design-snapshot.test.ts` and `lib/geometry/foil.test.ts`.
- `design.test.ts`'s `a snapshot without rocker or blank … is summarised exactly as before` passes and was not edited. The only edit to that file is the new identity test and its imports.
- `slopeAt`, `tipRule` and `ThinningStart` appear in none of this plan's files.
- `handSetCurve: "pchip"` appears only in test files outside `board-profile.ts`.
- Tracer gate: Task 1's verify was re-run end to end after its commit and passed. Per orchestrator ruling 11, there was no human stop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The `sampleFoil` switch and its `volume.test.ts` retarget moved from Task 2's commit into Task 1's**
- **Found during:** Task 1
- **Issue:** `board-profile.test.ts` (`reads exactly what sampleFoil reads, on a 1in sweep`) and `volume.test.ts` (`with no thicknessAt, integrates exactly what sampleFoil and the hand-set side profile draw`) both require the hand-set profile and `sampleFoil` to agree bit for bit. If only the profile switched, Task 1's own verify would fail. If `foil.ts` switched without retargeting `volume.test.ts`'s pchip test, the suite would be red between commits.
- **Fix:** Task 1's commit carries the one-line `sampleFoil` switch in `foil.ts` and the retargeted `sampleFoil is the square-root fall…` test. Task 2's commit carries the rest of its scope: the rocker tests, the Arctic note, and the new `sampleFoil` = hand-set side view test. All of these files are inside the plan's `files_modified`, and the suite was green at every commit.
- **Commit:** b6e66f0

**2. [TDD note] No RED step for Task 2's and Task 3's behaviour tests**
- Task 2's tests could not fail first: the implementation they check had already landed in Task 1, for the reason above, and the rocker tests check properties that hold for both curves.
- For Task 3, `design.ts` was written before its tests, in the same commit.
- The new tests do discriminate. The `"pchip"` litres test hits the pin exactly and the `"root"` one differs from it, so dropping `handSetCurve` from the pipeline would fail one of them. The retargeted volume test failed on 575 sweep points while `sampleFoil` was still pchip.

No file outside `files_modified` was touched. No package was added. Scratch scripts (`arctic.mts`, `litres.mts`) live only under the session scratchpad.

## Known Stubs

None.

## Threat Flags

None. No new surface: pure geometry, with no network, database or environment file. T-14-06 (bad knots) is still covered because `prepareRootCurve` checks knots with `preparePchip`. T-14-07 (a second pipeline) is closed by the `toEqual` identity test.

## Self-Check: PASSED

- FOUND: lib/geometry/board-profile.ts, lib/geometry/foil.ts, lib/geometry/design.ts and the five test files
- FOUND: b6e66f0 (Task 1), 6a831b5 (Task 2), 997640a (Task 3)
