---
phase: 11-rocker-from-real-blanks
plan: 01
subsystem: geometry
status: complete
tags: [pchip, blanks, catalogue, rocker, foil, fit-check, R16]
requires: []
provides:
  - "lib/geometry/pchip.ts — SplinePoint, pchipSlopes, PreparedPchip, preparePchip, samplePchip, pchipMinimum"
  - "lib/blanks/csv.ts — parseCsv"
  - "lib/blanks/catalog.ts — BLANK_CSV_COLUMNS, rowsToBlankRecords, isPickable"
  - "lib/blanks/seed-files.ts — SEED_CSV_FILES, SEED_CSV_DIR, readSeedCatalog(dir?)"
  - "lib/geometry/blank.ts — BlankStation, BlankRecord, BoardBlank, FitSettings, BlankShortfall, FitResult"
  - "lib/geometry/blank-fit.ts — LevelledCurve, levelCurve, PreparedBlank, prepareBlank, blankStationOf, placementRange, clampPlacement, BoardOnBlankInput, BoardOnBlank, boardOnBlank, fitAt, BLANK_PLACEMENT_BUFFER_MM, FIT_SAMPLE_STEP_MM, TIP_EASE_WINDOW_MM, FIT_EPSILON_MM"
affects: [11-03, 11-04, 11-05, 11-07, 11-10]
tech-stack:
  added: []
  patterns:
    - "prepare-once / sample-many curves (preparePchip, prepareBlank, boardOnBlank)"
    - "catalogue expectations read from the CSV text in the test, never typed"
key-files:
  created:
    - lib/geometry/pchip.ts
    - lib/geometry/pchip.test.ts
    - lib/blanks/csv.ts
    - lib/blanks/csv.test.ts
    - lib/blanks/catalog.ts
    - lib/blanks/catalog.test.ts
    - lib/blanks/seed-files.ts
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
  modified: []
decisions:
  - "PreparedBlank lives in blank-fit.ts, not blank.ts: it holds PreparedPchip/LevelledCurve, and blank.ts may import only ./units"
  - "preparePchip also throws on x values that do not run strictly left to right (a zero-width interval would divide by zero into a not-a-number)"
  - "prepareBlank throws for a blank with no C-station thickness (not pickable) rather than returning a null centre"
  - "The D-17 ease is computed as scaled − scaledAtTip·w + tip·w so each tip equals its setting to the last bit"
  - "blankStationOf is written s + (Lb − L)/2 + p so a board exactly as long as its blank at placement 0 maps with no rounding"
  - "The crop re-level calls the same levelCurve on the raw rocker over [u(0), u(L)]; cropMinimum reports that low point as a height above the blank's own low point"
metrics:
  duration: "about 1 hour"
  completed: 2026-09-26
actuals:
  tokens: 19100
  tasks: 3
  commits: 4
---

# Phase 11 Plan 01: Blank maths — catalogue reader, pchip, levelling, scaled foil and fit check — Summary

The app can now read the three vendor foam-blank catalogues (162 blanks) straight from the committed CSVs, draw each blank's rocker, thickness and width with the same no-overshoot curve SciPy and MATLAB use (pchip), level the rocker so its low point reads zero, lay a board of any length on the blank at any placement, scale the blank's own foil down to the board's centre, ease each end into the shaper's tip setting, and say whether the board fits in the foam, and where and by how much it doesn't. All four of the brief's named tests pass. Nothing on screen has changed yet.

## What a shaper gains (plain English)

- **Real blanks, read exactly as printed.** Every one of the 1,670 catalogue rows loads with its numbers intact. An unprinted value stays empty and is never treated as zero. Every transcriber's note is kept word for word. Four stand-up paddleboard blanks (the Marko 9'0", 10'0", 11'0" and 12'0" MK-SUP-STD) are held back from picking because their catalogue pages are missing thicknesses. A rule decides that, not a list of names, and the 8'0" stays pickable.
- **Curves that never invent foam.** No blank's rocker, thickness or width curve bulges past the two catalogue stations either side of it. The curve matches SciPy's pchip to 12 decimal places on six worked cases.
- **The reference board comes back exactly.** A board exactly as long as the Marko 6'0" M-Regular, centred on it, reads the catalogue's own rocker: nose 4.12, nose 12" 1.32, tail 12" 0.56, tail 1.74. Those numbers are read from the CSV, never typed in.
- **Foil from the blank.** The board's centre equals the target wherever it sits on the blank. Both tips equal their settings exactly. The 12" stations are the blank's own foil scaled down. A 12" fine-tune adds exactly its amount there and nothing anywhere else.
- **Fit check at every quarter inch.** A board too thick for the foam near the nose is turned away even when its centre fits. So is a board that isn't at least the width margin (default 1") narrower than the blank, wherever the board has width.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 (tracer) | CSV reader, catalogue mapping, seed-file loader, pchip, blank types, levelling, and a first `boardOnBlank`. Test (a) passes. | `04b3b08` |
| 2 | pchip parity with SciPy plus the carried-over no-overshoot tests, the CSV and catalogue tests, and tests (b) and (c) | `b822400` |
| 3 (TDD) RED | Failing tests for the placement range, scaled foil, tips, fine-tune, R13 sweep, width rule and test (d) | `8d36388` |
| 3 (TDD) GREEN | `placementRange`, `clampPlacement`, full `boardOnBlank` (ratio, ease, guard, hump) and `fitAt` | `7092e09` |

No REFACTOR commit was needed.

## Verification

- `npx vitest run`: 67 files, 2,591 passed, 2 skipped (the skips were already there). The new suites are pchip 24 tests, csv 10, catalog 16 and blank-fit 24.
- The four R16 titles are all present: the grep count is 4, and all four pass.
- `npx tsc --noEmit`: exit 0. The worktree first needed `npx next typegen` to generate Next's route types (`LayoutProps`) in the git-ignored `.next/`. None of the plan's files were involved.
- `npm run lint`: 0 errors. The 12 warnings are the same unused `eslint-disable` warnings in `scripts/` and elsewhere that were there before this plan. This plan's files lint clean.
- `grep -c 25.4` prints 0 in `catalog.ts`, `csv.ts`, `blank-fit.ts` and `pchip.ts`. Every inch-to-mm conversion goes through `units.ts`.
- `git diff --name-only d2befe5 HEAD` lists exactly the ten `files_modified` paths.
- The R13 sweep covered about 6,000 boards: 158 blanks, centres from 1 3/4" to each blank's centre less 3/8", two board lengths, and three placements each. It found nothing below zero, every centre on target, and both tips never below their settings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] `preparePchip` rejects knots that don't run strictly left to right**
- **Found during:** Task 1
- **Issue:** The plan only asked for non-finite knots to be rejected. Two knots at the same position make a zero-width interval, and the secant becomes a not-a-number that would reach a drawing or a fit verdict (threat T-11-02).
- **Fix:** Throw a plain `Error` naming the index. This is tested.
- **Commit:** `04b3b08`

**2. [Rule 3 - Blocking] `PreparedBlank` is declared in `blank-fit.ts`, not `blank.ts`**
- **Found during:** Task 1
- **Issue:** The artifact list puts `PreparedBlank` in `blank.ts`, but the `<interfaces>` contract (which later plans import from) puts it in `blank-fit.ts`. It holds `PreparedPchip` and `LevelledCurve`, and `blank.ts` may import nothing beyond `./units`.
- **Fix:** Declared it in `blank-fit.ts`, matching the `<interfaces>` block. Later plans import it from there.

**3. [Rule 2 - Correctness] `prepareBlank` throws for a blank with no centre thickness**
- **Found during:** Task 1
- **Issue:** `centerThicknessMm` is typed `Mm`, but a non-pickable blank may have none.
- **Fix:** Throw a named error instead of returning null or 0. Tests (b) and (c) sweep all 162 blanks through `preparePchip` and `levelCurve` directly, so the four non-pickable blanks are still covered.

**4. [Rule 1 - Test strength] Test (c)'s crop case also uses the shortest board the app allows**
- **Found during:** Task 2
- **Issue:** A probe showed that a board 6" shorter than its blank, at its most nose-ward placement, never moves the low point on any seeded blank (0 of 158). That case alone proves nothing about re-levelling.
- **Fix:** Kept the plan's 6" case. Added the app's shortest board (60", from `BOARD_LENGTH_RANGE_IN.min`) at both ends of its range, which does re-level on 53 blank/placement pairs. The test now asserts that at least one crop really re-levels. The sweep includes both board ends and every blank station under the board, because the crop's low point can only sit at one of those.

**5. [Rule 1 - Test runtime] Checks inside the dense sweeps are gathered and asserted once**
- **Found during:** Task 2
- **Issue:** Calling `expect` on each of about 700,000 samples timed out at 5 s.
- **Fix:** Collect the minimum or the list of problems, then assert once. Nothing got weaker: an empty problem list is still required.

## Known Stubs

None.

## Human verification deferred to end-of-phase UAT

None for this plan. It changes no screen, and the tracer's check is fully automated (test (a)).

## Threat Flags

None. No new network endpoint, auth path or schema change. `seed-files.ts` reads three fixed repo files from disk (Node only), as the plan intends.

## TDD Gate Compliance

Task 3's RED commit (`8d36388`, `test(...)`) comes before its GREEN commit (`7092e09`, `feat(...)`). RED failed for the right reason: `placementRange is not a function`.

## Self-Check: PASSED

- All ten files exist in the worktree.
- Commits `04b3b08`, `b822400`, `8d36388` and `7092e09` are all present in `git log`.
