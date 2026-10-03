---
phase: 14-realistic-surfboard-flow
plan: 12
subsystem: geometry
status: complete
tags: [tips, thinning-start, side-profile, before-after, phase-14]
requires:
  - "14-10 thinningStartsOf, BoardOnBlank.tips, BoardOnBlankInput.noseThinningStart / tailThinningStart / tipRule"
  - "14-08 TipView (tip-taper.ts)"
  - "14-05 / 14-10 RULES_BEFORE_CURVES, RULES_LIVE, boardFigures, compareFigures, summarizeMoves, movesReportLines"
provides:
  - "BlankSideView.tips: { nose: TipView; tail: TipView } (= onBlank.tips)"
  - "BoardProfileInput.blank.noseThinningStart? / tailThinningStart? (passed through thinningStartsOf)"
  - "summarizeDesignWith and boardProfileWith pass the board's stored starts through thinningStartsOf"
  - "RULES_BEFORE_TIPS; BoardFigures.reachesStation; BoardMove.startsPastStation / twelveRiseMm; MovesReport.boardsWithStartPastStation / maxTwelveRiseMm; tipsReportLines"
  - "lib/geometry/thinning-start-paths.test.ts (cross-path equality + source-contract list)"
affects:
  - "14-14 (store feeds the starts into BoardProfileInput.blank; reads BlankSideView.tips)"
  - "14-15, 14-16 (sidebar, mark, DATASHEET, order form read BlankSideView.tips)"
  - "14-17 (wires use-blank-list.ts, blank-flag.tsx, check-saved-boards.ts to thinningStartsOf and extends the SITES list; the tips report uses RULES_BEFORE_TIPS + tipsReportLines)"
tech-stack:
  added: []
  patterns:
    - "One helper (thinningStartsOf) spread into every board-input site, guarded by a source-contract list"
    - "Cross-path equality test: the same stored board through boardOnBlank, buildBoardProfile and boardFigures, compared with toBe"
key-files:
  created:
    - lib/geometry/thinning-start-paths.test.ts
  modified:
    - lib/geometry/board-profile.ts
    - lib/geometry/board-profile.test.ts
    - lib/geometry/design.ts
    - lib/geometry/before-after.ts
    - lib/geometry/before-after.test.ts
decisions:
  - "The one board-input helper is thinningStartsOf, exported from lib/geometry/blank-fit.ts (14-10 built it); no second helper was added."
  - "BoardFigures gains reachesStation ({ nose, tail } or null with no blank); the two 12\" thicknesses are the existing thicknessMm.nose12 / tail12, not duplicated."
  - "BoardMove.twelveRiseMm is signed (the larger of the two after-less-before differences); MovesReport.maxTwelveRiseMm starts at 0, so a report where every 12\" thickness fell reads 0."
  - "tipsReportLines prints two lines: 'tips: boards with a thinning start further in than 12\": N of M with a blank' and 'largest rise of a 12\" thickness: <imperial mark>'."
metrics:
  duration: "about 35 min"
  completed: 2026-10-02
  tasks: 3
  files: 6
actuals:
  tokens: 6200
  tasks: 3
  commits: 5
---

# Phase 14 Plan 12: Each tip's thinning start on the one side view, through every path Summary

The one side view of a board in a blank now carries both tips' thinning starts. For each tip it holds where the thinning starts, whether that's Automatic or set by hand, what Automatic would pick, how far the slider reaches, whether the start is further in than 12", and the too-close warning. A start the board stores now reaches every place a board is worked out: its side view, the rack and preset cards' litres, and the before-and-after figures. All of them read the same five thicknesses and five rocker heights. The before-and-after comparison also has a tips step now. It compares what is live after the first go-live (the new curves with the 12" ease) against what goes live with the second (the steady thinning). Nothing on screen changes: no board stores a start yet, so every board is on Automatic.

## Names later plans import (exact)

- **Per-tip view:** `BlankSideView.tips: { nose: TipView; tail: TipView }` in `lib/geometry/board-profile.ts`, set to `onBlank.tips`. Each tip's distance is `fromTip` and its mark's position along the board is `station`. Nothing at the top level is called `start`, because `BlankSideView.start` still means where the blank's tail falls.
- **Board-input helper:** `thinningStartsOf` from `lib/geometry/blank-fit.ts`. Spread it as `...thinningStartsOf(blank)` into a `BoardOnBlankInput` or a `BoardProfileInput.blank`. `BoardProfileInput.blank` gains `noseThinningStart?: Mm` and `tailThinningStart?: Mm`.
- **Tips-step rules and report** (`lib/geometry/before-after.ts`):
  - `RULES_BEFORE_TIPS` = `{ prepare: prepareBlank, handSetCurve: "root", tipRule: "blend" }`
  - `BoardFigures.reachesStation`
  - `BoardMove.startsPastStation`, `BoardMove.twelveRiseMm`
  - `MovesReport.boardsWithStartPastStation`, `MovesReport.maxTwelveRiseMm`
  - `tipsReportLines(report): string[]`
- **Source-contract list** for 14-17 to extend: `SITES` in `lib/geometry/thinning-start-paths.test.ts`, which today holds `./board-profile.ts` and `./design.ts`.

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 (tracer) | A start set by hand reaches the side view, and each tip's view is on it for every screen | `5a20a8f` |
| 2 (tdd) | The same start through every library path, and in the cards' figures | `96675e5` (RED), `66ea10d` (GREEN) |
| 3 (tdd) | The before-and-after learns the tips | `e7fe5b3` (RED), `a1144b3` (GREEN) |

Tracer gate: the run was autonomous (ruling 10). The tracer's verify (`board-profile.test.ts` plus `tsc --noEmit`) passed before the expansion tasks began.

## What the tests prove

- **`each tip's thinning start on the side profile (Phase 14 D-02, D-12, D-24)`** (`board-profile.test.ts`). The board is on Marko 6'0" M-Regular, 2" shorter than the blank.
  - The profile's `tips` equal `boardOnBlank`'s.
  - With no stored start, both tips read Automatic and `reachesStation` follows Automatic's own distance. Both answers occur, using a board slid to the tail of the Arctic Foam 10'9" LB.
  - A tail start stored at 18" reads 18", set by hand, and the nose's view doesn't change.
  - Shortened-board edge: 36" stored on a 60" board reads the range's far end, and the stored value is unchanged (the input is deep-frozen). On a 96" board the same stored value reads 36" again.
  - Mark stations: the tail's `station` equals its `fromTip`, and the nose's `station` equals the length less its `fromTip`. A hand-set start moves only its own tip's mark.
- **`a start set by hand gives the same board through every path (Pitfall 5)`** (`thinning-start-paths.test.ts`). On all four presets, with the tail start at 18" and the nose at 15", the five thicknesses and five rocker heights are identical (`toBe`) through `boardOnBlank`, `buildBoardProfile` and `boardFigures(…, RULES_LIVE, …)`. Against the same board on Automatic, a 12" number moves and the `summarizeDesign` litres move. The source-contract check confirms `board-profile.ts` and `design.ts` both call `thinningStartsOf(`. Before the fix, the RED run failed on the figures path and on `design.ts`, as expected.
- **Tips step** (`before-after.test.ts`):
  - `RULES_BEFORE_TIPS` differs from `RULES_LIVE` only in the tip rule.
  - On the four presets, `stationMoveMm`, `startsPastStation` and `twelveRiseMm` are all exactly 0, and at least one preset's litres move.
  - On the stress-set board on the Arctic Foam 10'9" LB at the tail end with a 2 1/2" centre, `startsPastStation` is at least 1 and `twelveRiseMm` is positive. The blend side reads no start past 12".
  - `tipsReportLines` prints only fixed words, counts and one Imperial length, for both a filled report and an empty one.

## Verification

- `npx vitest run lib/geometry/board-profile.test.ts lib/geometry/thinning-start-paths.test.ts lib/geometry/before-after.test.ts lib/geometry/design.test.ts` passes. `design.test.ts` was not edited.
- Whole unit suite: 103 files, 3,837 passed, 2 skipped. The skips were there before this plan. In the full parallel run, one test in `phase14-curves.test.ts` ("every stress board that fits on today's curves also fits on the new ones") went past Vitest's 5 s default (7.1 s). Re-run alone it passes in 1.35 s at the default timeout, and with `--testTimeout=120000` (ruling 4). That file imports none of this plan's files.
- `npx tsc --noEmit` exits 0 (after `npx next typegen`), and `npm run lint` exits 0.
- Acceptance greps:
  - `tips: onBlank.tips` appears once in `board-profile.ts`.
  - `thinningStartsOf(` appears once in `board-profile.ts` and once in `design.ts`.
  - `export const RULES_BEFORE_TIPS` and `export function tipsReportLines` give a count of 2 in `before-after.ts`.
  - Both describe titles are present.
  - `git diff --name-only 5bab130 HEAD -- components app` is empty.
- `phase11-foil.test.ts` and `design-snapshot.test.ts` are unchanged. No package was added. No environment file or database was touched. No Playwright run, and no baseline moved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking order] The figures' one profile line moved into Task 2's GREEN commit**
- **Found during:** Task 2
- **Issue:** Task 2's cross-path test reads `boardFigures`, and the plan scheduled the change that passes the starts into it for Task 3. Committed in plan order, Task 2's GREEN commit would have failed its own test.
- **Fix:** Task 2's GREEN commit includes the one line in `before-after.ts`'s `boardProfileWith` that spreads `...thinningStartsOf(blank)` (`boardFigures` builds its profile through `boardProfileWith`). Task 3 added everything else in that file. Both files are in `files_modified`.
- **Commit:** `66ea10d`

**2. [Rule 3 - Types] Existing test literals gained the new required fields**
- **Found during:** Task 3
- **Issue:** `BoardFigures`, `BoardMove` and `MovesReport` gained required fields, so the hand-built objects in the existing `compareFigures`, `summarizeMoves` and `movesReportLines` tests no longer type-checked. The empty-report `toEqual` also needed the two new zeros.
- **Fix:** I added the new fields to those literals, filled with constructed inputs. No existing assertion was changed or loosened.
- **Commit:** `e7fe5b3`

Otherwise the plan was carried out as written.

## Known Stubs

None.

## Threat Flags

None. T-14-24 (a site that forgets the starts) is covered by the one helper, the cross-path equality test, and the `SITES` source-contract list, which 14-17 extends.

## Self-Check: PASSED

- FOUND: lib/geometry/thinning-start-paths.test.ts, lib/geometry/board-profile.ts, lib/geometry/design.ts, lib/geometry/before-after.ts
- FOUND commits: 5a20a8f, 96675e5, 66ea10d, e7fe5b3, a1144b3
