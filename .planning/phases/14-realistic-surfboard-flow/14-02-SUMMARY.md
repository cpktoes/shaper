---
phase: 14-realistic-surfboard-flow
plan: 02
subsystem: geometry (blank curves)
status: complete
tags: [root-curve, D-13, D-14, acceptance-1, acceptance-2, acceptance-8, rule-1]
requires:
  - "14-01: PHASE14_TODAY.hiddenStations (lib/geometry/__fixtures__/phase14-today.ts)"
provides:
  - "lib/geometry/root-curve.ts — prepareRootCurve(points, kind), RootKind = \"rise\" | \"fall\", CurveRule = \"root\" | \"pchip\""
  - "lib/geometry/root-curve.test.ts — the four named describes (acceptance 1, 2 and 8 at the curve level; the hidden-station score)"
affects: [14-03, 14-04, 14-08]
tech-stack:
  added: []
  patterns:
    - "A curve rule built on preparePchip: validate through preparePchip, run it through transformed knots, snap to the printed value at a station"
    - "Off-by-a-mutation proof: each new guard was shown to go red when the rule it guards is broken, then restored"
key-files:
  created:
    - lib/geometry/root-curve.ts
    - lib/geometry/root-curve.test.ts
  modified: []
decisions:
  - "For one point or none, prepareRootCurve returns preparePchip's own curve unchanged, so the edge behaviour is identical by construction rather than by copy."
  - "Added a test the plan did not list: the bottom curves through its low point like a bowl (twice the distance lifts between 2 and 8 times as much; about 4 in practice). Without it, the rule's 'negative root before the lowest station' could be deleted and every listed test still passed (checked by mutation)."
  - "The off-centre lists count a blank only when it prints a C value that is below its greatest value; the four blanks with no centre thickness are left out of that list (they are still covered by every other test)."
metrics:
  duration: "about 10 minutes"
  completed: 2026-10-02
  tasks: 2
  files: 2
actuals:
  tokens: 5300   # chars/4 over the two new files (21,140 characters)
  tasks: 2
  commits: 3
---

# Phase 14 Plan 02: The square-root curve, proved on every blank. Summary

**A new rule for drawing a blank's bottom, thickness and width now exists as one small, pure module. It reads every printed station on all 162 catalogue blanks to the last digit, never strays outside the two stations either side, keeps each blank's lowest point exactly where the catalogue prints it, and on US Blanks' extra printed stations it lands closer to the real foam than today's curve for all three curves. Nothing on screen uses it yet.**

## What this means for a shaper

Nothing changes on screen in this step. This is the new curve, built and checked on its own before the app switches over to it in the next wave. The checks are the promises the founder was given: the numbers a vendor prints are the numbers the app shows, the curve never bulges or dips between two stations, the rocker's low point stays where the blank has it, a blank printed thickest toward the nose is drawn thickest there, and the first board a visitor sees keeps its exact five rocker numbers and five thicknesses.

## What was built

1. **`lib/geometry/root-curve.ts`** (imports only `./pchip`):
   - `prepareRootCurve(points, kind)`. For `"rise"` (a bottom), it takes the square root of each station's lift above the lowest station, with the roots before the first lowest station taken negative. It runs today's pchip through those roots and squares the result back. `"fall"` (thickness, width) does the same below the thickest (widest) station.
   - At exactly a station's position it returns the printed value itself (Pitfall 3). Past either end it reads that end's value. A nonsense position reads the first station's value. One point reads that point everywhere and no points reads 0, because it hands back `preparePchip`'s own curve in those cases. Bad knots throw `preparePchip`'s own error, because it validates through `preparePchip`.
   - `slopes[k]` holds the curve's own slope at each station (`±2·g·g′`). Nothing outside the tests reads it yet.
   - It also exports the types `RootKind` and `CurveRule` for plans 14-03 and 14-04.
2. **`lib/geometry/root-curve.test.ts`**: 16 tests under the plan's four describe titles.

## Figures for the founder (scratch run, not committed)

Hidden-station score: the curves are redrawn from five kept stations, `kept` and today's readings come from the pin, and the root readings are computed live.

| Curve | Distinct curves / hidden stations | Today's mean miss (worst) | Square-root mean miss (worst) | Square root closer on |
|-------|-----------------------------------|---------------------------|-------------------------------|-----------------------|
| bottom | 68 / 536 | 0.112" (0.645") | 0.035" (0.237") | 67 of 68 |
| thickness | 90 / 712 | 0.076" (0.428") | 0.050" (0.286") | 81 of 90 |
| width | 69 / 546 | 0.530" (5.282") | 0.290" (3.829") | 69 of 69 |

These match the research record's Q6 figures. Width uses the pin's 69 / 546 merge, which is the todo's own figure.

Data-computed lists (seed catalogue, 162 blanks):
- **Ties for the lowest rocker station:** 6 blanks (US Blanks 8'9"Y, 8'9"YX, 8'8" EPS, 8'8"X EPS, 9'6" EPS, 10'4"A SUP EPS). The bottom reads exactly the lowest value all the way between the tied stations.
- **Thickest printed thickness not at C:** 2 blanks (US Blanks 9'9"A, 9'9"B).
- **Widest printed width not at C:** 16 blanks (15 US Blanks plus Marko Foam 9'1" Machine All).

## Verification

- `npx vitest run lib/geometry/root-curve.test.ts`: 16 passed.
- `npx tsc --noEmit` exits 0 (after `npx next typegen`). `npm run lint` exits 0.
- `grep -c "export function prepareRootCurve\|export type RootKind\|export type CurveRule" lib/geometry/root-curve.ts` prints 3. `slopeAt`, `tipRule` and `ThinningStart` appear 0 times in both files. The module's only import is `./pchip`.
- The four describe titles each appear exactly once, and `PHASE14_TODAY` is used.
- `git diff --name-only 8a8b339 HEAD -- lib components app scripts e2e db` lists only `lib/geometry/root-curve.ts` and `lib/geometry/root-curve.test.ts`. `git diff --stat 8a8b339 HEAD -- db lib/blanks lib/geometry/pchip.ts lib/geometry/blank-fit.ts lib/geometry/board-profile.ts package.json package-lock.json` is empty.
- Mutation checks were run in the working tree and never committed. Each file was restored, and `git status` was clean before each commit.
  - With the station snap removed, "every printed station … reads back exactly" fails.
  - With the negative roots removed, the new low-point shape test fails.
- Tracer gate: Task 1's verify was re-run after its commit (as part of every later run) and passed. Per orchestrator ruling 10, there was no human stop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing guard] A test that pins the sign rule**
- **Found during:** Task 2, by mutation.
- **Issue:** If `prepareRootCurve` dropped the "negative root before the lowest station" rule (D-13), all 15 planned tests still passed. That variant still reads every station exactly and still stays inside its neighbours, but it sits flat on the low point instead of curving through it.
- **Fix:** Added one test to the acceptance-2 describe. On both sides of every catalogue blank with a single lowest station inside it, stepping twice as far from the low point lifts the bottom between 2 and 8 times as much (a smooth bowl lifts about 4 times; the flat variant about 16 times). It is red under the mutation and green on the rule as written. The only literals are the 1 mm step and the 2 and 8 bounds.
- **Files modified:** lib/geometry/root-curve.test.ts
- **Commit:** 60f79a6

**2. [TDD note] Task 2's tests were written after the rule existed.** Task 1 (the tracer) built the module, so Task 2's tests were characterisation tests and passed on the first run. There is no separate RED commit. The mutation checks above stand in for the RED step: they show the tests can fail.

No other file was touched. `package.json` and `package-lock.json` are unchanged. The only scratch file was `scratchpad/exec14/root-figures.mts`, outside the repo.

## Known Stubs

None.

## Threat Flags

None. T-14-03 is mitigated as planned: knots are validated by `preparePchip` itself and fail with its error, empty and one-point curves read 0 or flat, and a non-finite position reads the first station. All of this is covered by tests.

## Self-Check: PASSED

- FOUND: lib/geometry/root-curve.ts
- FOUND: lib/geometry/root-curve.test.ts
- FOUND: 66450bf (Task 1)
- FOUND: 60f79a6 (Task 2)
