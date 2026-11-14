---
phase: 14-realistic-surfboard-flow
plan: 03
subsystem: geometry
status: complete
tags: [blank-fit, curves, square-root-rule, phase11-carry, stress-set]
requires:
  - 14-01 (the pin: phase14-today.ts, phase14-stress-set.ts)
  - 14-02 (root-curve.ts: prepareRootCurve, RootKind, CurveRule)
provides:
  - prepareBlank on the square-root rule (the live rule for every screen, the list, the flag, the cards, the saved-boards check)
  - prepareBlankPchip (today's rule, callable by name only)
  - phase11TwelveInch self-pinned to today's rule
  - phase14-curves.test.ts (acceptance 1 and 2 through the app; no stress board newly refused)
affects:
  - every screen that shows a blank (ROCKER, the blank list's verdicts, the flag, rack and preset cards)
  - 14-05 / 14-06 (litres and desktop baselines move at this go-live, as planned)
tech-stack:
  added: []
  patterns:
    - one internal prepareBlankWith(record, rule) behind two one-argument exports, so `.map(prepareBlank)` can never pass an index as a rule
    - old maths that carries an old save prepares its own frozen input instead of trusting the caller's
key-files:
  created:
    - lib/geometry/phase14-curves.test.ts
  modified:
    - lib/geometry/blank-fit.ts
    - lib/geometry/phase11-foil.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/phase14-today.test.ts
decisions:
  - "Today's rule is a separately named function (prepareBlankPchip), never a second argument on prepareBlank (D-25, Pitfall 4)"
  - "phase11TwelveInch re-prepares the blank from prepared.record on today's rule, so the live rule can never move a Phase 11 board's number (D-25)"
  - "The freed stress-board count is reported through a vitest annotation, never asserted as a typed number"
metrics:
  duration: ~25 min
  completed: 2026-10-02
  tasks: 2
  files: 5
actuals:
  tokens: 35900
  tasks: 2
  commits: 3
---

# Phase 14 Plan 03: Every Blank on the New Curves Summary

Every blank in the app now has its bottom, thickness and width drawn between its printed stations by the
square-root rule. Today's curve survives only under its own name, and a board saved under Phase 11 still
converts on today's curve, so its five thicknesses come back exactly as before.

## What changed for a shaper

- **Every screen draws a blank on the new curves.** ROCKER, the blank list's verdicts, the "doesn't fit"
  flag, the rack and preset cards and the saved-boards check all prepare a blank through one function,
  `prepareBlank`. That function now draws the bottom rising from its lowest printed station and the
  thickness and width falling from their highest, using the square-root rule from plan 14-02. Every
  printed catalogue number is still read exactly.
- **Today's curve is still available by name.** `prepareBlankPchip` draws a blank exactly as the live site
  does today. It is used for the Phase 11 conversion, the pinned numbers' own test, the saved-boards reports
  and the before-and-after pictures, and it is removed after the showing.
- **Phase 11 boards keep their numbers.** The maths that carries a Phase 11 save across now prepares its own
  blank on today's curve (`prepareBlankPchip(prepared.record)`). That means editing the live curve can never
  move a Phase 11 board's five thicknesses. `phase11-foil.test.ts` and `design-snapshot.test.ts` pass with no
  edit (`git diff --quiet` against the wave base exits 0).
- **The 12" tip blend is untouched.** Every changed line in `blank-fit.ts` sits above
  `export interface BoardOnBlankInput`, so `boardOnBlank`, `runsOutCause`, the blend and the fine-tune hump
  are byte-identical. No tips code was added (D-28).

## The numbers this go-live produces

- **Acceptance 1 holds through the app.** On all 158 pickable seed blanks (out of 162 in the catalogue), every
  printed station of the bottom, thickness and width reads its catalogue value exactly (`toBe`). At 200
  samples per interval, no curve leaves the two stations either side.
- **Acceptance 2 holds.** On every pickable blank the bottom is levelled on exactly the lowest printed rocker,
  and the levelled bottom reads exactly 0 at its low point.
- **R5: no stress board is newly refused.** Of the **1,635** stress boards (`buildStressSet`, judged with
  `fitAt` at each case's placement on the default fit settings), **1,414** fit on today's curves. Every one
  of those also fits on the new curves.
- **4 boards are freed.** These were refused on today's curves and fit on the new ones. On today's curves
  all 4 had been refused for **width** (worst shortfall kind `wide`):
  - Arctic Foam 5'8" SB, 2 1/4" centre, at the tail, centre and nose placements
  - Arctic Foam 6'1" SBP, 2 1/4" centre, at the nose placement

  The test computes these figures and prints them as a vitest annotation. It never asserts them as a typed
  number.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Every blank drawn by the new curves; today's rule by name; Phase 11 self-pin | de575a2 | blank-fit.ts, phase11-foil.ts, phase14-today.test.ts |
| 2 (tdd) | Quiet tests repointed at the live curves; acceptance 1, 2 and "no board newly refused" proven through the app | b2329b3 | blank-fit.test.ts, phase14-curves.test.ts |

**Tracer gate:** after the Task 1 commit, its verify was re-run end to end (4 files, 104 tests passed) before
Task 2 began.

## Test titles (as planned)

- `blank-fit.test.ts`: `the blank's curves never overshoot between two stations on any seeded blank` (was
  "pchip never overshoots…"). It is now built from `prepareBlank(record)` for pickable blanks, plus
  `prepareRootCurve` for the 4 that can't be picked.
- `blank-fit.test.ts`: `levelling the blank's bottom puts its minimum at exactly 0`. Part 1 now reads
  `prepareBlank(record).rocker` for pickable blanks and `levelCurve(prepareRootCurve(knots, "rise"), 0, length)`
  for the rest. Parts 2 and 3 already used `prepareBlank` and are unchanged.
- `blank-fit.test.ts` rocker-golden half of `the board's bottom sits exactly the centre gap above…`: this half
  now prepares its blank with `prepareBlankPchip`, because the golden is Phase 11's PCHIP rocker. A comment
  says so.
- `phase14-today.test.ts` describe: `today's numbers, reproduced by today's rule kept by name (D-25, D-26)`.
  Every blank in it, including the blanks for the stress-slice rebuild, is now prepared with `prepareBlankPchip`.
- `phase14-curves.test.ts` describes: `the curves step through the app's own blank preparation (acceptance 1
  and 2, D-13, D-27)` and `no stress board flips from fitting to refused at the curves step (R5)`.

## Verification

- `npx vitest run lib/geometry/phase14-curves.test.ts lib/geometry/blank-fit.test.ts lib/geometry/phase11-foil.test.ts lib/models/design-snapshot.test.ts lib/geometry/phase14-today.test.ts lib/blanks/preset-blanks.test.ts`
  passed: 6 files, 182 tests. This includes the four Phase 11 named tests, the Phase 12 named tests (a)–(e),
  the runs-out-cause block and both 250 ms timing guards, all unedited.
- The full unit suite (`npx vitest run`) passed: 97 files, 3,678 tests, 2 skipped (both skips were already
  there).
- `npx next typegen` then `npx tsc --noEmit` exited 0. `npm run lint` exited 0.
- `git diff --quiet <base> -- db lib/blanks package.json package-lock.json lib/geometry/phase11-foil.test.ts lib/models/design-snapshot.test.ts lib/geometry/root-curve.ts`
  exited 0.
- A grep of `blank-fit.ts` and `phase11-foil.ts` for the tips step's names found none.
- **Mutation check:** I removed the root curve's exact-station read in `root-curve.ts` and acceptance 1 went
  red. The file was then restored with `git checkout -- lib/geometry/root-curve.ts`, and it is unchanged in
  both commits.
- No Playwright and no browser preview were run, as the plan directs. The ROCKER and VOLUME desktop baselines
  will be re-recorded by plan 14-06.

## TDD Gate Compliance

Task 2 is marked `tdd="true"`, but the behaviour it tests was built in Task 1, the tracer task. So this plan
has no separate RED commit that failed first: Task 2's tests passed the first time they ran. The mutation
check above stands in for the RED step. It shows the new acceptance test fails when the property it guards
is broken. The Task 2 commit is `test(14-03)`, and the code it tests is in Task 1's `feat(14-03)` commit.

## Deviations from Plan

- **Import tidy in `blank-fit.test.ts` (Rule 3, blocking lint).** After the repoint, nothing in that file
  calls `preparePchip`, so the import changed to `type PreparedPchip`, and `prepareRootCurve` and
  `type RootKind` were added. No test outside the three named places was changed.

Otherwise the plan was executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: lib/geometry/phase14-curves.test.ts
- FOUND: de575a2 (Task 1), b2329b3 (Task 2)
