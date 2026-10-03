---
phase: 14-realistic-surfboard-flow
plan: 05
subsystem: geometry (before-and-after comparison), scripts (figures, saved-boards report), models (saved-board reader)
status: complete
tags: [curves-step, D-15, D-18, D-19, D-25, D-26, acceptance-7, R8, R9, rollback-edge]
requires:
  - "14-01: PHASE14_TODAY (the pin) — presets' five-plus-five and litres, handSet"
  - "14-03: prepareBlank (live) and prepareBlankPchip (today's rule) in blank-fit.ts; fitAt"
  - "14-04: DesignRules, summarizeDesignWith(fields, rules); BoardProfileInput.handSetCurve"
provides:
  - "lib/geometry/before-after.ts: RULES_BEFORE_CURVES, RULES_LIVE, BoardFigures, boardProfileWith, boardFigures, BoardMove, compareFigures, MovesReport, summarizeMoves, movesReportLines"
  - "scripts/phase14-before-after.ts --step curves [--samples <dir>]"
  - "scripts/check-saved-boards.ts --curves-report (read-only, counts and maxima only)"
  - "lib/models/saved-board-open.test.ts: acceptance 7 and the rollback edge"
affects: [14-07, 14-10, 14-12, 14-17]
tech-stack:
  added: []
  patterns:
    - "Before and after from one pipeline with only the rules swapped; the scripts only feed boards in and print what comes out"
    - "A report line is a fixed sentence holding counts, one Imperial length and percentages — tested by pattern"
key-files:
  created:
    - lib/geometry/before-after.ts
    - lib/geometry/before-after.test.ts
    - scripts/phase14-before-after.ts
    - lib/models/saved-board-open.test.ts
  modified:
    - scripts/check-saved-boards.ts
decisions:
  - "boardProfileWith(fields, rules) is exported (tested) so the figures script draws its curve samples from exactly the profile boardFigures reads, rather than rebuilding it in the script"
  - "The litres median, largest and over-1% count use the size of the change either way (absolute percent); compareFigures keeps the signed fraction"
  - "Each CSV value is in inches to four decimals; the script prints the largest move as decimal inches and tenths of a millimetre, because a 1/16\" mark rounds small moves to nothing"
metrics:
  duration: "about 15 minutes"
  completed: 2026-10-02
  tasks: 3
  files: 5
actuals:
  tokens: 11400    # chars/4 over the realized diff (45,453 chars)
  tasks: 3
  commits: 3
---

# Phase 14 Plan 05: The founder's before-and-after figures, and a read-only look at the real saved boards. Summary

**There is now one tested way to work out a board under the old curves and under the new ones. It gives the five thicknesses, five rocker numbers, litres and whether the board fits its blank. The old curves, kept by name, reproduce every number pinned from the live site exactly. A script prints the founder's before-and-after for the four presets, the first board a visitor sees and a typical Arctic board. The founder's existing read-only saved-boards check can now report how far real saved boards move, in counts only. Two new tests prove that opening a saved board writes nothing, and that today's site still opens a board saved by the later tips release.**

## What this means for a shaper

- **The presets barely move.** Every one of the four keeps all five thicknesses and its centre rocker. The largest move of any station number is 0.015" (0.4 mm). The litres change by 0.01% to 0.23%. Each still fits its blank.
- **The first board a visitor sees** keeps all ten station numbers exactly. Only the curve between them changes, so its litres go from 30.063 to 30.509 (+1.48%). The card goes from 30.1 L to 30.5 L.
- **The Arctic board moves the most.** It is 2" shorter than an Arctic Foam 9'4" G, with a 2 1/2" centre. Its largest station move is 0.055" (1.4 mm), at the rocker. Its litres go from 46.339 to 47.558 (+2.63%). It does not fit its blank where it sits, both before and after: the verdict doesn't change.
- **Nothing on any screen changed.** No file under `components/` or `app/` was touched, so no notice, marker or "what's new" was added (D-19).

## The figures (`--step curves`, printed output)

```
Phase 14 — today's curves → the new curves (station numbers and litres)

== Shortboard preset — US Blanks 6'3"RP, 0" off centre ==
  board length 74"
  tail tip  thickness 15/16" (24 mm) → 15/16" (24 mm); rocker 1 9/16" (40 mm) → 1 9/16" (40 mm)
  tail 12"  thickness 1 9/16" (39 mm) → 1 9/16" (39 mm); rocker 13/16" (20 mm) → 13/16" (20 mm)
  centre    thickness 2 1/4" (57 mm) → 2 1/4" (57 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 9/16" (40 mm) → 1 9/16" (40 mm); rocker 1 1/4" (31 mm) → 1 1/4" (31 mm)
  nose tip  thickness 7/16" (11 mm) → 7/16" (11 mm); rocker 4 1/4" (107 mm) → 4 1/4" (107 mm)
  largest move of any of the ten station numbers: 0.006" (0.2 mm)
  litres 29.410 → 29.478 (+0.23%)
  card: 6'2" · 18 3/4" · 2 1/4" · 29.4 L → 6'2" · 18 3/4" · 2 1/4" · 29.5 L
  in its blank where it sits: fits → fits

== Fish preset — US Blanks 5'10"RP, 0" off centre ==
  board length 68"
  tail tip  thickness 3/4" (19 mm) → 3/4" (19 mm); rocker 2" (51 mm) → 2" (50 mm)
  tail 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 3/4" (19 mm) → 3/4" (19 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 1 1/8" (29 mm) → 1 1/8" (29 mm)
  nose tip  thickness 11/16" (17 mm) → 11/16" (17 mm); rocker 4 1/4" (108 mm) → 4 1/4" (107 mm)
  largest move of any of the ten station numbers: 0.015" (0.4 mm)
  litres 35.047 → 35.093 (+0.13%)
  card: 5'8" · 20 1/4" · 2 1/2" · 35.0 L → 5'8" · 20 1/4" · 2 1/2" · 35.1 L
  in its blank where it sits: fits → fits

== Mid-length preset — US Blanks 7'4"SP, 0" off centre ==
  board length 86"
  tail tip  thickness 3/4" (19 mm) → 3/4" (19 mm); rocker 2 5/16" (58 mm) → 2 5/16" (58 mm)
  tail 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 1" (25 mm) → 1" (25 mm)
  centre    thickness 2 3/4" (70 mm) → 2 3/4" (70 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 3/4" (45 mm) → 1 3/4" (45 mm); rocker 1 3/8" (34 mm) → 1 3/8" (34 mm)
  nose tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 3 15/16" (99 mm) → 3 7/8" (99 mm)
  largest move of any of the ten station numbers: 0.015" (0.4 mm)
  litres 50.277 → 50.286 (+0.02%)
  card: 7'2" · 21 1/4" · 2 3/4" · 50.3 L → 7'2" · 21 1/4" · 2 3/4" · 50.3 L
  in its blank where it sits: fits → fits

== Longboard preset — US Blanks 9'3"Y, 0" off centre ==
  board length 108"
  tail tip  thickness 7/8" (22 mm) → 7/8" (22 mm); rocker 3 5/16" (85 mm) → 3 3/8" (85 mm)
  tail 12"  thickness 1 15/16" (50 mm) → 1 15/16" (50 mm); rocker 1 11/16" (42 mm) → 1 11/16" (42 mm)
  centre    thickness 3" (76 mm) → 3" (76 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 15/16" (50 mm) → 1 15/16" (50 mm); rocker 2 1/8" (54 mm) → 2 1/8" (54 mm)
  nose tip  thickness 7/8" (22 mm) → 7/8" (22 mm); rocker 4 3/16" (106 mm) → 4 3/16" (106 mm)
  largest move of any of the ten station numbers: 0.009" (0.2 mm)
  litres 75.300 → 75.309 (+0.01%)
  card: 9'0" · 22 1/2" · 3" · 75.3 L → 9'0" · 22 1/2" · 3" · 75.3 L
  in its blank where it sits: fits → fits

== The first board a visitor sees — no blank ==
  board length 72"
  tail tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 2" (51 mm) → 2" (51 mm)
  tail 12"  thickness 1 9/16" (40 mm) → 1 9/16" (40 mm); rocker 3/8" (10 mm) → 3/8" (10 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 5/16" (33 mm) → 1 5/16" (33 mm); rocker 1 1/4" (32 mm) → 1 1/4" (32 mm)
  nose tip  thickness 1/2" (13 mm) → 1/2" (13 mm); rocker 4 1/2" (114 mm) → 4 1/2" (114 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 30.063 → 30.509 (+1.48%)
  card: 6'0" · 19" · 2 1/2" · 30.1 L → 6'0" · 19" · 2 1/2" · 30.5 L

== An Arctic board — 2" shorter than Arctic Foam 9'4" G, 2 1/2" centre, centred ==
  board length 110 1/4"
  tail tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 2 5/16" (59 mm) → 2 5/16" (59 mm)
  tail 12"  thickness 15/16" (24 mm) → 15/16" (24 mm); rocker 1 11/16" (43 mm) → 1 11/16" (42 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 5/16" (33 mm) → 1 5/16" (33 mm); rocker 3 1/8" (79 mm) → 3 1/16" (78 mm)
  nose tip  thickness 1/2" (13 mm) → 1/2" (13 mm); rocker 6 1/8" (156 mm) → 6 1/8" (155 mm)
  largest move of any of the ten station numbers: 0.055" (1.4 mm)
  litres 46.339 → 47.558 (+2.63%)
  card: 9'2 1/4" · 19" · 2 1/2" · 46.3 L → 9'2 1/4" · 19" · 2 1/2" · 47.6 L
  in its blank where it sits: does not fit → does not fit
```

`--samples <dir>` writes six CSVs (`preset-shortboard.csv`, `preset-fish.csv`, `preset-midlength.csv`, `preset-longboard.csv`, `first-board.csv`, `arctic-9-4-g.csv`). Each has a station every 1/2" plus the nose tip, with the rocker, thickness and deck before and after, in inches. They were checked in the session scratchpad only, never inside the repo.

## What was built

1. **`lib/geometry/before-after.ts`** (pure, no React, browser or database import)
   - `RULES_BEFORE_CURVES = { prepare: prepareBlankPchip, handSetCurve: "pchip" }` and `RULES_LIVE = { prepare: prepareBlank, handSetCurve: "root" }`.
   - `boardProfileWith(fields, rules)`: the side profile built exactly as `summarizeDesignWith` builds it.
   - `boardFigures(fields, rules, settings)`:
     - Thicknesses come from `effectiveFoil` and rocker from `stationRocker`.
     - Litres come from `summarizeDesignWith`.
     - The fit verdict comes from `fitAt` at the board's own placement (clamped on read). It is null when there is no blank.
   - `compareFigures`: the largest move of the ten station numbers, the signed litres change, and the verdict (`same` / `nowRefused` / `nowFits` / `noBlank`).
   - `summarizeMoves`: thresholds of 1/16", 1/32" and 1%, with the median found by sorting. An empty list gives zeros.
   - `movesReportLines`: four fixed sentences.
2. **`lib/geometry/before-after.test.ts`** (20 tests)
   - `today's rules, kept by name, reproduce the pin (D-25, D-26)`:
     - each preset's five-plus-five and litres are `toBe` the pin;
     - the first board's litres and five-plus-five are `toBe` the pin.
   - The live rules equal `summarizeDesign`, the live profile and `fitAt` exactly, for the four presets and the default board.
   - `compareFigures` and `summarizeMoves` are checked on built-up inputs, including "exactly on a threshold is not over it", even and odd medians, and an empty list.
   - `movesReportLines` is checked line by line against patterns of its fixed sentences.
3. **`scripts/phase14-before-after.ts`**
   - `--step curves` prints the output above. `--samples <dir>` also writes the CSVs.
   - Any other step, or none, exits 1 with a plain sentence.
4. **`scripts/check-saved-boards.ts --curves-report`**
   - The flag and a dynamic import of `before-after` sit next to the existing ones, after the environment file is loaded.
   - Inside the existing loop, each board that opens and is not a Phase 11 board is compared, inside a `try` that only counts a failure.
   - After the existing lines it prints the report for boards in a blank, the report for hand-set boards, the Phase 11 sentence, and a count of boards it could not compare (only when there are any).
   - The header describes the flag and gives the founder's production command, which is the existing temporary-file recipe with `--curves-report` (plan 14-07).
   - The one `db.select` is unchanged. There is no insert, update or delete, and the exit-code rule is unchanged.
5. **`lib/models/saved-board-open.test.ts`**
   - `opening a saved board writes nothing to it (acceptance 7)` covers three boards: a version-5 Shortboard in its blank, a version-5 hand-set default board, and a version-4 Phase 11 board from the first Phase 11 golden case. Each is deep-frozen. Opening it does not throw and its JSON is unchanged afterwards. For the two version-5 boards, `buildSnapshot(parseSnapshot(x)).design` equals `x.design`.
   - `a board saved after the tips step opens on today's site (the rollback edge, written before the new values exist)` uses the Shortboard board with `noseThinningStart: 645` and `tailThinningStart: "abc"` on its blank, stamped version 6. It opens without throwing, its blank has exactly today's keys, and the whole board equals the same board opened without the extras.

## Verification

- `npx vitest run lib/geometry/before-after.test.ts lib/models/saved-board-open.test.ts lib/models/design-snapshot.test.ts`: all pass (20 + 59).
- `scripts/phase14-before-after.ts --step curves` exits 0 and prints all six boards. Two runs gave byte-identical output (`cmp`). `--step nonsense` exits 1.
- `npx tsc --noEmit` (after `npx next typegen`) and `npm run lint` both exit 0.
- Acceptance greps:
  - `^export` in before-after.ts: 10.
  - `--curves-report` in check-saved-boards.ts: 4.
  - `db.select`: 1.
  - insert, update or delete: 0.
  - The two exact test titles: 1 each.
  - `slopeAt|tipRule|ThinningStart` in any non-test file under lib, components, app or scripts: none.
- `git diff --quiet ed39f4a… HEAD -- drizzle lib/db/schema.ts lib/models/design-snapshot.test.ts components app` exits 0.
- `package.json`, `package-lock.json`, `phase11-foil.test.ts` and `design-snapshot.test.ts` are unchanged from the wave base.
- **Full `npx vitest run`:** 99 files and 3,712 tests. Two runs had 1 and 3 failures. Every failure was a 5-second **timeout** in `blank-fit.test.ts` (two "every seeded blank" tests) or `phase14-curves.test.ts` (the stress-set R5 test), both heavy and both untouched by this plan, while the sibling executor was loading the machine. Both files pass when run alone (78 of 78). This plan changes no code they import.
- The `check-saved-boards.ts` script was **not run** (ruling 3). Its report is proven through the unit tests of the pure functions and `tsc`.
- Tracer gate: Task 1's verify was re-run end to end after its commit and passed. Per ruling 11, there was no human stop.

## Deviations from Plan

### Auto-fixed Issues

None. No file outside `files_modified` was touched.

### Notes

- **[Addition] `boardProfileWith` is exported.** The plan's interface names six exports. A seventh, `boardProfileWith`, lets the figures script draw its CSV curves from exactly the profile `boardFigures` reads, instead of building a second one in the script. It is tested to equal the live profile along the whole board, and today's curve on the pinned hand-set sweep.
- **[Addition] The first board's five-plus-five are also checked against the pin.** The plan asked for the first board's litres only. Its five thicknesses and five rocker numbers are also `toBe` the pin, which is stricter and passes.
- **[Addition] The curves report prints one more line, only when needed.** If any board could not be compared it prints `boards the curves report could not compare: N`. That is a count only, and the line is not printed when N is 0.
- **[TDD note] Task 3's tests pass on today's code by design.** They pin today's reader before the tips step exists, so there is no failing RED commit. They do discriminate: a reader that wrote to the stored board would throw on the frozen copy, and a reader that kept unknown blank keys would fail the key-list and `toEqual` checks.

## Known Stubs

None.

## Threat Flags

None. There is no new surface. T-14-08: report output goes through `movesReportLines` (fixed sentences, tested by pattern) plus a count line, and `describeFailure` is unchanged. T-14-09: there is still one `db.select`, grep-checked, and the script was never run. T-14-10: each comparison is inside a `try` that only counts.

## Self-Check: PASSED

- FOUND: lib/geometry/before-after.ts, lib/geometry/before-after.test.ts, scripts/phase14-before-after.ts, lib/models/saved-board-open.test.ts, scripts/check-saved-boards.ts
- FOUND: b987b03 (Task 1), 1efd79c (Task 2), d7ac010 (Task 3)
