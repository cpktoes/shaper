---
phase: 11-rocker-from-real-blanks
plan: 04
subsystem: geometry
status: complete
tags: [rocker, foil, pchip, side-profile, volume, blanks, R4, R5, R10, R13, R14]
requires:
  - "11-01: lib/geometry/pchip.ts (preparePchip, samplePchip, pchipMinimum, SplinePoint)"
  - "11-01: lib/geometry/blank-fit.ts (PreparedBlank, prepareBlank, levelCurve, boardOnBlank, BoardOnBlank, BoardOnBlankInput, placementRange)"
  - "11-01: lib/blanks/seed-files.ts (readSeedCatalog, tests only)"
provides:
  - "lib/geometry/rocker.ts: FiveStationRocker, DEFAULT_FALLBACK_ROCKER, fallbackRockerPoints, bezierToFiveStations (the Bezier stays as migration-only code)"
  - "lib/geometry/board-profile.ts: BoardSideProfile, BlankSideView, BoardProfileInput, buildFallbackProfile, buildBlankProfile, buildBoardProfile"
  - "lib/geometry/foil.ts: sampleFoil on pchip"
  - "lib/geometry/volume.ts: CrossSectionVolumeInput.thicknessAt (optional, defaults to sampleFoil)"
affects: [11-07, 11-09, 11-10, 11-12]
tech-stack:
  added: []
  patterns:
    - "one side profile (Pattern 5): prepared once, sampled by every consumer; deck = rocker + thickness"
    - "optional dense thickness curve on the volume input, so a blank-derived foil is never re-splined"
key-files:
  created:
    - lib/geometry/board-profile.ts
    - lib/geometry/board-profile.test.ts
  modified:
    - lib/geometry/rocker.ts
    - lib/geometry/rocker.test.ts
    - lib/geometry/foil.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
decisions:
  - "BlankSideView.bottomAt reads the board's own crop-levelled rocker curve (onBlank.rockerAt). That is the same curve as blankRockerAt − cropMinimum, but it matches the board's bottom to the last bit, not just to float rounding, so the drawn board and blank bottoms can never show a hairline gap"
  - "With a blank, stationRocker and effectiveFoil are read off the profile's own curves at the five stations. The centre rocker is whatever the crop's levelling gives there, which is not forced to 0"
  - "The fallback profile prepares its foil pchip once. sampleFoil still fits per call, and a test proves the two read the same number at every station"
  - "No new export was added to foil.ts (foil.test.ts is outside this plan's files). The five-point pchip is built from foilStationPoints in both places, and a test proves they agree bit for bit"
metrics:
  duration: "about 35 minutes"
  completed: 2026-09-26
actuals:
  tokens: 11200
  tasks: 3
  commits: 5
---

# Phase 11 Plan 04: Hand-set fallback rocker, one side profile, and the foil on pchip Summary

Every board now has one description of its side, whether it sits in a real blank or is still hand-set. That description gives its rocker, thickness and deck at any point, the five station numbers RAILS reads, and, in a blank, the blank's own outline, the foam to come off at each station and the blank's own numbers for the DATASHEET. A board with no blank carries a five-number rocker. The hand-set foil now uses the same no-overshoot curve as the blanks. Nothing on screen has changed yet; plans 11-07, 11-09 and 11-10 connect this to the screens.

## What a shaper gains (plain English)

- **A rocker you type as five numbers.** A board with no blank has four rocker numbers you set: nose tip, nose 12", tail 12" and tail tip. The centre is always zero. The curve runs through all five on the same no-overshoot curve the real blanks use. It never dips below zero, and its lowest point is exactly zero. A new board starts at the familiar 4 1/2", 1 1/4", 3/8" and 2".
- **Older boards reopen as they looked.** A board saved on the old three-point curve can be read back as those four numbers, taken straight off the old curve. The tips come back exactly, and each 12" number is the one the old curve showed. This was tested on the default board and all four presets.
- **One side view for every screen.** The drawing, the datasheet, RAILS, the litres and the Summary will all read the same numbers. The deck is always the rocker plus the thickness, never a third curve that could drift from them.
- **In a blank:** the board's centre is on target and both tips equal their settings. The foam to come off is given at every station. A 12" fine-tune reads as the blank-derived number plus the tweak, and it stays applied when you slide the board along the blank. The blank's outline sits where it really is relative to the board, with its bottom exactly on the board's bottom.
- **Litres follow the drawn foil.** The volume now adds up the thickness curve that is actually drawn. For a board in a blank, the foil between stations is the blank's own shape, not a guess from five points.

## Litres before and after (computed with `summarizeDesign`, not typed)

The only change is the curve between the five foil stations. Every station reads the same as before. In every case below, the cross-section figure and the quoted figure were identical.

| Board | Before (Fritsch–Carlson) | After (pchip) | Change |
|-------|--------------------------|---------------|--------|
| Default board | 29.7930 L | 29.9402 L | +0.1472 L |
| Shortboard | 28.4576 L | 28.5561 L | +0.0985 L |
| Fish | 33.8474 L | 33.9810 L | +0.1336 L |
| Mid-length | 48.3359 L | 48.6316 L | +0.2957 L |
| Longboard | 70.9769 L | 71.4750 L | +0.4981 L |

The default board's move matches the research figure of 29.79 to 29.94 L. Once this merges, the VOLUME desktop screenshot (`volume-desktop.png`) will differ as expected. Plan 11-12 re-records it. It was not touched here.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 (tracer) RED | Failing tests for the five-station fallback and the Bezier-to-five-stations migration | `f573327` |
| 1 (tracer) GREEN | `FiveStationRocker`, `DEFAULT_FALLBACK_ROCKER`, `fallbackRockerPoints`, `bezierToFiveStations`, and header deviation 3 (the Bezier is now migration-only) | `a6b821b` |
| 2 RED | Failing tests for the side profile | `8c2864b` |
| 2 GREEN | `lib/geometry/board-profile.ts` | `65925cd` |
| 3 | `sampleFoil` on pchip, optional `thicknessAt` on the volume input, the datasheet test's half-width on pchip, and the new tests | `c940312` |

## Verification

- `npx vitest run`: 69 files, 2,659 passed, 2 skipped (the skips were already there). Suite changes: rocker went from 52 to 60 tests, board-profile is new with 22, and volume went from 177 to 180. `foil.test.ts` passed unchanged.
- `npx tsc --noEmit`: exit 0, after one `npx next typegen` in the fresh worktree.
- `npm run lint`: 0 errors. There are 12 warnings, all of them unused `eslint-disable` directives that were already there. This plan's files lint clean.
- `grep -c monotone-spline lib/geometry/foil.ts lib/geometry/volume.test.ts` gives 0 and 0.
- `grep -cE "from ['\"]react['\"]|window\.|@/lib/db" lib/geometry/board-profile.ts` gives 0.
- `git status --porcelain lib/geometry/__fixtures__` is empty. No fixture needed regenerating, and every golden-backed assertion stayed inside its tolerance.
- `git diff --name-only 234a66e HEAD` lists exactly the seven `files_modified` paths. `monotone-spline.ts` and `rocker-drag.ts` are untouched and were not deleted.
- The tracer gate re-ran Task 1's verify (rocker tests + tsc) green before Task 2 began.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] The blank's bottom is the board's own rocker curve, so the two match exactly**
- **Found during:** Task 2
- **Issue:** The plan's formula `blankRockerAt(s) − cropMinimum` is the same quantity as the board's rocker. It is computed as `(a − m) − (c − m)` rather than `a − c`, though, so it can differ by float rounding. The plan's behaviour asks for the two bottoms to be equal.
- **Fix:** `bottomAt(s)` reads `onBlank.rockerAt(s)`, which is the crop-levelled blank rocker and is defined along the whole blank. Tests check that it equals the board's rocker bit for bit along the board, and equals the plan's formula to within 1e-9 mm over the whole blank.
- **Commit:** `65925cd`

**2. [Rule 3 - Ordering] The fallback's "thickness equals `sampleFoil`" check lands in Task 3's commit**
- **Found during:** Task 2
- **Issue:** `sampleFoil` only moves onto pchip in Task 3. In Task 2 it still used the old sampler, so that assertion could not pass yet.
- **Fix:** Task 2 asserts the fallback's thickness against pchip through `foilStationPoints` directly. Task 3 adds the exact `sampleFoil` equality check (`toBe` on a 1" sweep) to `board-profile.test.ts` once it can pass.
- **Commit:** `65925cd`, `c940312`

**3. [Rule 3 - Scope] The "`sampleFoil` is pchip everywhere" test lives in `volume.test.ts`**
- **Found during:** Task 3
- **Issue:** `foil.test.ts` is not among this plan's files.
- **Fix:** Put it in the new `"thicknessAt — one thickness curve for every board"` describe block, next to the volume-equality tests it supports. The existing `foil.test.ts` assertions (exact at every station, never below zero, no overshoot) pass unchanged.

**4. [Rule 1 - Accuracy] The blank-datasheet validation comment was re-measured**
- **Found during:** Task 3
- **Issue:** The comment quoted 77.95 L and 1.01%, measured with the old sampler.
- **Fix:** Re-measured with a scratch probe (since deleted) running the test's own inputs. Family 1 is still the fullest, with a centre section of 53104.7 mm². The volume is now 78.85 L, 2.17% off the stated 77.17 L and still well inside the 10% bar. The comment was updated and records the old figure. The assertion and its tolerance are unchanged.
- **Commit:** `c940312`

## Known Stubs

None.

## Human verification deferred to end-of-phase UAT

None for this plan. It changes no screen, and the tracer's check is fully automated. The expected VOLUME screenshot difference is handled in plan 11-12.

## Threat Flags

None. There is no new network endpoint, auth path, file access or schema change. T-11-09 is covered: every curve goes through `preparePchip`, which rejects a knot that isn't a finite number, and placement is clamped on read. T-11-10 is covered: the fixtures folder is unchanged.

## TDD Gate Compliance

- Task 1: RED `f573327` (`test(...)`) came before GREEN `a6b821b` (`feat(...)`). RED failed for the right reason: the new exports were missing, with 8 of 60 tests failing.
- Task 2: RED `8c2864b` came before GREEN `65925cd`. RED failed because `./board-profile` did not exist yet.
- Task 3: the tests and the change went in one `feat(...)` commit, `c940312`, with no separate RED commit. Most of Task 3's behaviour is equality with the new sampler, so it can only pass once the switch is made. The existing `foil.test.ts` and `volume.test.ts` assertions acted as the regression gate.

## Self-Check: PASSED

- All seven files exist in the worktree.
- Commits `f573327`, `a6b821b`, `8c2864b`, `65925cd` and `c940312` are all present in `git log`.
