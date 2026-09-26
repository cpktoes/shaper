---
phase: 11-rocker-from-real-blanks
plan: 03
subsystem: geometry
status: complete
tags: [blanks, fit-check, blank-list, nearest-fit, copy, units, R2, R6, R12, R15]
requires:
  - "11-01: prepareBlank, PreparedBlank, boardOnBlank, fitAt, placementRange, clampPlacement, isPickable, readSeedCatalog"
  - "11-02: DEFAULT_FIT_DEFAULTS, toFitSettings (tests); measure-display formatters"
provides:
  - "lib/geometry/blank-fit.ts — BoardFitContext, BlankVerdict, BlankListResult, FLOOR_EPSILON_MM, floorCheck, judgeBlank, listBlanks, catalogueExtremes, nearestFit, nearestFittingPlacement"
  - "lib/geometry/blank-reasons.ts — REASON_SNAP_MM, FLAG_HEADLINES, NOTHING_FITS_SENTENCE, formatShortfall, formatPlacement, placementSlider, floorShortfallMessage, emptyListMessage, listIntro, blankRowMeta, offerLine"
affects: [11-04, 11-07, 11-08, 11-10]
tech-stack:
  added: []
  patterns:
    - "Verdicts take no placement argument, so a slider move cannot recompute the list (R14)"
    - "Search on a fixed 1/16\" grid anchored at centre; every try is fitAt on boardOnBlank of the prepared blank"
    - "Copy composed in one pure module from the display boundary, tested in both systems"
key-files:
  created:
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
  modified:
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
decisions:
  - "A verdict's placement is clamped into the slider's range exactly as boardOnBlank reads it, so the outermost 1/16\" step never sits a float's width past the range end"
  - "The coarse search also tries the outermost 1/16\" placement on each side when the range does not end on a quarter inch, and the refine checks BOTH sides inside the last coarse ring, so the result is the fitting placement closest to centre on the 1/16\" grid within that ring"
  - "emptyReason reports length first when both floors fail on their own (the first obstacle), then thickness, then both"
  - "nearestFittingPlacement searches every multiple of 1/16\" in the range, nearest first, nose first on a tie — a superset of the placements judgeBlank tries, so a blank judged to fit always has somewhere to move to"
  - "nearestFit also skips any verdict that does not fit, and breaks a length tie by less spare centre foam with a 1e-6 mm tolerance"
  - "floorShortfallMessage uses the same 'under 1/16\"' / 'under 1 mm' rule as a reason line when the shortfall prints as zero"
  - "placementSlider feeds measureSlider the negated placement and negates only toMm back; a drag to the middle stores a plain zero, never -0"
metrics:
  duration: "about 15 minutes"
  completed: 2026-09-26
  tasks: 3
  files: 4
actuals:
  tokens: 16600
  tasks: 3
  commits: 6
---

# Phase 11 Plan 03: Judging the blank catalogue, the offer, the rescue and every sentence around them — Summary

For any board, the app can now go through all three foam-blank catalogues and sort every blank into "fits this board" and "won't fit this board". A blank that's too short, or too thin at the center, is hidden by the shaper's two settings. A blank that fits somewhere along its length says where the slider should land. A blank that doesn't fit says why in a shaper's words: `1/8" too thin 12" from the nose` (Metric: `3 mm too thin 30.5 cm from the nose`). When a picked blank stops fitting, the app can name the closest blank from any vendor that does fit, or slide the board to the nearest spot on the same blank where it fits. Nothing on screen has changed yet. These are the tested pieces the blank list and the flag will be built from.

## What a shaper gains (plain English)

- **Only real candidates are listed.** A blank must be at least Extra Length longer than the board (default 2") and at least Extra Center Thickness thicker at its center (default 3/8"). Both amounts come from the shaper's settings, never from a number built into the filter. A board typed to exactly a blank's length less 2" still lists that blank. A millimetre longer hides it.
- **Each blank is judged at its best spot.** A blank "fits" if the board fits anywhere the slider can reach. Picking it lands the slider at the fitting spot closest to center. A blank that fits nowhere is read where it comes closest, and its one reason line names that place and by how much.
- **The numbers match the research.** Default 72" board at 2 1/2": 135 fit and 1 greyed. Fish: 134 and 8. Midlength: 77 and 8. Longboard: 32 and 12. That's the same split 11-RESEARCH.md measured. The whole catalogue is judged in about 15–60 ms here (the budget is 250 ms), and never when the slider moves.
- **The offer is fair and vendor-blind.** It's the fitting blank whose length is closest to the picked one. On a tie, the one with less spare foam at the center wins. It's never the picked blank itself, and there's no offer when nothing fits.
- **Every sentence reads right in both systems.** That covers reasons, placement (`1/2" toward nose`, `13 mm toward nose`, `centered`), the floor sentences (`It's 1 1/2" too short — you've asked for at least 2" of spare length.`), the three empty-list messages, the list intro, a row's meta line (`Marko Foam · 6'1/16" · 2 15/16" center` / `Marko Foam · 183.0 cm · 74 mm center`) and the offer line.

## Tasks and commits

| Task | What | Commits |
|------|------|---------|
| 1 (tracer, TDD) | Floors, best-placement search, the list's two groups, empty-list classifier, catalogue extremes | `53dcce4` (RED), `b5884d7` (GREEN) |
| 2 (TDD) | `nearestFit` (the offer) and `nearestFittingPlacement` (Move to Where It Fits) | `f6ace33` (RED), `8252e1b` (GREEN) |
| 3 (TDD) | `lib/geometry/blank-reasons.ts`: every sentence, in Imperial and Metric | `c38f4d7` (RED), `772b860` (GREEN) |

## Verification

- `npx vitest run lib/geometry/blank-fit.test.ts`: 46 passed. That's 24 from 11-01 plus 15 in "judging the catalogue" and 7 in "the offer and the rescue". The slowest test takes 0.98 s.
- `npx vitest run lib/geometry/blank-reasons.test.ts`: 42 passed.
- Whole suite `npx vitest run`: 69 files, 2,690 passed, 2 skipped (both skips were already there).
- `npx tsc --noEmit`: exit 0. The fresh worktree first needed `npx next typegen`, per the orchestrator's ruling.
- `npm run lint`: 0 errors. The 12 warnings are the same unused `eslint-disable` warnings that were there before this plan. `npx eslint` on this plan's four files is clean.
- `grep -cE "inchesToMm\(2\)|inchesToMm\(0\.375\)" lib/geometry/blank-fit.ts` prints 0, so the floors come from settings.
- `grep -cE "formatInchesFraction|formatWholeMm|formatCentimetres|formatFeetInches|25\.4" lib/geometry/blank-reasons.ts` prints 0, so the module only touches the display boundary.
- All twelve required strings are present in `blank-reasons.ts`.
- `git diff --stat 234a66e HEAD` lists exactly the four `files_modified` paths. The only line removed from `blank-fit.ts` is its import line, which was widened. Every 11-01 export is unchanged.
- No expected catalogue number is typed. Lengths and centres come from the records, and properties are asserted over sweeps. The literal copy strings are the UI-SPEC's own examples, which were checked against the formatters. Every other expectation is composed from `formatMark` / `formatDim` / `formatLength` / `stationLabel`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A verdict's placement could sit a float's width past the slider's end**
- **Found during:** Task 1 (GREEN run)
- **Issue:** The outermost 1/16" step (for example 9/16") could come out 4e-14 mm past `placementRange().max`. `boardOnBlank` clamps on read, but the stored verdict placement didn't match the placement that was actually checked.
- **Fix:** Every placement the search tries is clamped through `clampPlacement` first, so the verdict records exactly what was checked.
- **Commit:** `b5884d7`

**2. [Rule 1 - Test] The "both floors" empty-list case needs a two-blank catalogue**
- **Found during:** Task 1
- **Issue:** On the seeded catalogues, for the default board, no pair of floor settings lists nothing while each floor alone still passes something. The longest blank is also among the thickest.
- **Fix:** The test finds a real pair of blanks in the catalogue where the longer one is the thinner. It judges just those two, with floors set so only one passes each. This is still read from the data, not constructed.
- **Commit:** `b5884d7`

**3. [Rule 2 - Correctness] The search covers the range ends and both sides of the last coarse ring**
- **Found during:** Task 1
- **Issue:** Stepping only in quarter inches would miss a blank that fits only in the last fraction of an inch of its slider range. Refining only back along the side that first fit could miss a closer fitting spot on the other side.
- **Fix:** The coarse pass also tries the outermost 1/16" placement on each side. The refine then checks every 1/16" placement inside the last coarse ring on both sides, nearest first. A test checks that no 1/16" placement closer to center fits, for every fitting blank across the default board, a 70" board and all four presets.
- **Commit:** `b5884d7`

### Choices the plan left open (recorded as decisions above)

- `emptyReason` reports `length` when both floors fail on their own.
- `floorShortfallMessage` says "under 1/16"" rather than "0"".
- `nearestFit` ignores a non-fitting verdict even if one is handed in.
- `nearestFittingPlacement` searches multiples of 1/16" from center. This is a superset of the placements `judgeBlank` tries.

## Human verification deferred to end-of-phase UAT

Task 1 is a tracer, but `workflow.human_verify_mode` is `end-of-phase`, so it didn't stop. Its automated verify passed end to end. There's nothing to see on screen yet. These checks belong to end-of-phase UAT once later plans build the screens:

- The blank list shows FITS THIS BOARD and WON'T FIT THIS BOARD, shortest first, with a reason line under each greyed row (in both systems).
- E1 ("No blank is long enough") is a backstop. It can't be reached with the shipped bounds, because a 120" board plus at most 12" is still shorter than the longest blank. It's covered by a unit test of the copy and held out as a visual check.

## Known Stubs

None. Nothing calls the new functions yet, by design: later plans in this phase wire them into the screen. That's planned sequencing, not a stub.

## Threat Flags

None. There are no new endpoints or storage. The search loops are bounded by the placement range at fixed 1/4" and 1/16" steps (T-11-07). The budget test fails if judging the catalogue ever takes more than 250 ms. Catalogue names pass through as plain data (T-11-08).

## TDD Gate Compliance

Each task has a `test(...)` RED commit followed by a `feat(...)` GREEN commit. Each RED failed for the right reason: `catalogueExtremes`, `nearestFit` and `nearestFittingPlacement` weren't functions, and `blank-reasons.ts` didn't exist. No refactor commits were needed.
