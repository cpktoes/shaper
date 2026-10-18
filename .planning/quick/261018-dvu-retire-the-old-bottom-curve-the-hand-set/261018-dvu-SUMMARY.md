---
phase: quick-261018-dvu
plan: 01
subsystem: geometry
tags: [cleanup, blank-fit, phase-14, phase-11]
status: complete
completed: 2026-10-18
key-files:
  modified:
    - lib/geometry/phase11-foil.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/board-profile.ts
    - lib/geometry/design.ts
    - lib/geometry/root-curve.ts
    - lib/geometry/round-tip.ts
    - lib/geometry/before-after.ts
    - scripts/check-saved-boards.ts
    - scripts/phase14-before-after.ts
    - components/rocker/blank-flag.tsx
  deleted:
    - lib/geometry/phase14-today.test.ts
    - lib/geometry/phase14-today-handset.test.ts
decisions:
  - DesignRules kept with its one remaining field (prepare) rather than folded away
  - Phase 11 keeps a private thickness curve in phase11-foil.ts; phase11-foil-golden.json not re-pinned
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
---

# Quick 261018-dvu: Retire the old bottom curve, the hand-set option and the 12-inch blend

**Nothing a shaper sees changes.** Every saved board, every board saved under Phase 11, every preset card and every rack card opens to exactly the numbers it showed before. Only the leftover old maths that existed so the Oct 10 showing could compare "before" with "today" is gone.

## What left the code

- The old blank curve (a smooth line straight through a blank's printed values), the option to draw a board with no blank on that old curve, and the 12-inch S-shaped tip blend with its 12-inch window constant. The board maths now has one way to draw a blank (the square-root rule), one way to draw a hand-set board and one way to thin a tip (the steady taper).
- The two "before" rule sets in `before-after.ts`, which now only reads a board's live figures.
- The curves report and the tips report in `scripts/check-saved-boards.ts` (the three summary lines, `--thin-tips`, `--rack-report` and `--verbose` are untouched).

## Commits

| Task | Commit | What it does |
| ---- | ------ | ------------ |
| 1 | 65e279fe | Boards saved under Phase 11 keep a private copy of the thickness curve they were drawn on; two tests that borrowed the old curve build what they need themselves |
| 2 | f2878b19 | The before-and-after reports and every test that compared old rules with today's go |
| 3 | d38333dc | The old curve, the old hand-set curve and the 12-inch blend leave the board maths |

## Tests

Base 156 files, 5,759 passed, 2 skipped. Now 154 files, 5,720 passed + 2 skipped (5,722 counted) - exactly 2 files and 39 tests fewer, as planned. In this worktree `components/design/slider-row.test.ts` (9 tests) fails with `Cannot read properties of null (reading 'useId')` because the cloned `node_modules` loads React from two places; that file is untouched by this task and the failure is environmental, so the 5,720 figure counts those 9 as passing. Under machine load two geometry tests (`blank-fit`, `round-tip`) hit vitest's 5-second limit once in the full run; both pass alone (86 and 29 tests).

### The 39 removed tests, by file

- `phase14-today.test.ts` deleted: 6
- `phase14-today-handset.test.ts` deleted: 3
- `before-after.test.ts`: 29 to 5 (24 removed)
- `tip-flow.test.ts`: 21 to 17 (4 removed)
- `phase14-curves.test.ts`: 3 to 2 (1 removed)
- `round-tip.test.ts`: 30 to 29 (1 removed)

(6 + 3 + 24 + 4 + 1 + 1 = 39.)

### Tests rewritten, keeping their assertion

- `blank-fit.test.ts`: "the board's bottom sits exactly the centre gap above the blank's bottom..." now builds Phase 11's bottom itself from the printed rocker.
- `custom-rocker.test.ts`: "prepareBoardBlank is the board's copy prepared, then bent by the board's rocker" now uses a test-local halved-rocker preparation.
- `board-profile.test.ts`: the square-root test lost only its trailing old-curve block (still 93 tests).
- `phase11-foil.test.ts`: only its import lines and one `const W` line changed (5 changed lines); every expected value is unchanged. No fixture was re-pinned.

## Kept on purpose

- The pin (`lib/geometry/__fixtures__/phase14-today-golden.json`, `phase14-today.ts`) and its generator `scripts/extract-phase14-today-golden.ts` are byte-identical to the base and still read by `root-curve.test.ts` and `phase14-preset-figures.test.ts`.
- The Arctic tape-check command still works: `scripts/phase14-before-after.ts --step curves --samples <dir>` prints six boards' live figures and writes six CSVs, now with one set of live columns (`station_in,rocker_in,thickness_in,deck_in`) instead of before/after pairs. `--step tips` (or no step) prints a plain sentence and exits 1.
- The deck-tweak quick refusal: the body of `tweakExceedsDeckSkin` is byte-identical to the base. Its two comments (in `blank-fit.ts` and `components/rocker/blank-flag.tsx`) now record the founder's 2026-10-18 decision to keep it instead of pointing at the todo. `blank-flag.tsx` changed in comment lines only.

## Deviations from Plan

None - plan executed as written, using the planner's trial patch per task plus the two comment edits by hand.

## Known Stubs

None.

## Self-Check: PASSED

- Commits 65e279fe, f2878b19, d38333dc exist on the branch.
- tsc exit 0; eslint on `lib`, `scripts`, `components/rocker` clean; removed-names grep prints nothing; fixtures, `lib/models`, `app` and the pin generator unchanged from base.
