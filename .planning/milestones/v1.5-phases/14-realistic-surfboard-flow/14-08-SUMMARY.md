---
phase: 14-realistic-surfboard-flow
plan: 08
subsystem: geometry
status: complete
tags: [tips, taper, automatic, pchip, slope, phase-14]
requires:
  - "14-02 root-curve.ts (prepareRootCurve, RootKind)"
  - "14-07 go-live 1 shipped (curves live; tips code may now land)"
provides:
  - "PreparedPchip.slopeAt (on preparePchip and prepareRootCurve)"
  - "lib/geometry/tip-taper.ts: THINNING_START_STEP_MM, THINNING_START_MIN_MM, SHARP_BEND_SLOPE, STEADY_EPSILON_MM, TipEnd, TipFlag, PlanerCut, TipView, thinningStartRange, pullThinningStart, canRunDownSteadily, automaticStart, steadyTaper, tipFlag, tipView"
affects:
  - "14-10 boardOnBlank (will read tipView per tip)"
  - "14-11, 14-12, 14-14, 14-15, 14-16 (import the names above)"
tech-stack:
  added: []
  patterns:
    - "A planer cut seen from one tip is a pair of closures { at(d), slopeAt(d) }, d in mm in from that tip"
    - "Automatic is a first hit on the half-inch grid from the 12\" station, falling back to 12\" with found: false"
key-files:
  created:
    - lib/geometry/tip-taper.ts
    - lib/geometry/tip-taper.test.ts
  modified:
    - lib/geometry/pchip.ts
    - lib/geometry/pchip.test.ts
    - lib/geometry/root-curve.ts
    - lib/geometry/root-curve.test.ts
decisions:
  - "pullThinningStart reads a NaN as the range's minimum rather than passing NaN on (tipView treats one as Automatic before it gets there; the plan left this case open)"
  - "tipFlag's thin-spot search covers the 1/8\" grid from the tip and the start itself when the start is off that grid (a Metric hand-set start), so 'up to and including W' always holds"
metrics:
  duration: "14 min"
  completed: 2026-10-03
  tasks: 3
  files: 6
actuals:
  tokens: 10800
  tasks: 3
  commits: 4
---

# Phase 14 Plan 08: The tips' maths (where thinning starts, and the steady taper) Summary

Each tip now has the maths for its own thinning start: 12" when the board can run down steadily from there, otherwise the first half inch further in that can. From that start a single smooth curve leaves the planer cut along the cut's own slope and lands exactly on the tip setting. A start set by hand that sits too close to the tip is drawn exactly as set and flagged, either with where the board is thinnest or as a sharp bend. All of it lives in one small module, `lib/geometry/tip-taper.ts`, and is proven on its own. The blank's curves also now report their own slope, which the taper starts from. Nothing on screen changes yet; plan 14-10 is the first to use it.

## What was built

- **The curves' slope (D-28).** `PreparedPchip` gains `slopeAt(x)`, the exact slope of the curve at any point. At a printed station it equals that station's own slope, past either end of the blank it is 0, and it is also 0 for a curve with fewer than two points or a position that is not a number. The square-root curve reports its slope too (`±2·g·g′`). Both were checked against the curve's own rise over a 1e-3 mm step at 50 points per interval on every rocker, thickness and width curve of every blank in the catalogue, and agree to within 1e-6.
- **The steady taper (D-01).** `steadyTaper(cut, tip, W)` returns the planer cut unchanged from the start inward. Between the start and the tip it is the founder's parabola, `T(d) = tip + (2·sec − m)·d + ((m − sec)/W)·d²`. `T(0)` is exactly the tip setting, `T(W)` equals the planer cut to within 1e-9 mm, and the taper leaves the cut along slope `m`.
- **Automatic (D-03, D-23).** `canRunDownSteadily` is D-03's two conditions plus `P′(W) ≥ 0` (the cut must not be getting thicker toward the tip), each with 1e-6 mm of slack. `automaticStart(cut, tip, length)` tries the 12" station first and returns `MEASURE_STATION_MM` itself when that works. Otherwise it tries 12 1/2", 13", … up to the end of the range and takes the first that works. If none does, it returns `{ start: 12", found: false }` and nothing is said. It takes only three inputs, so the fine-tune, the Deck Skin and the Tip Style cannot reach it (D-04).
- **The range (D-02, D-11).** `thinningStartRange` runs from 6" to half the length rounded inward to the half inch. `pullThinningStart` pulls a stored start into that range when it is read and never rewrites what it was given.
- **The flag (D-05, D-21).** `tipFlag` returns `thin` (with `thinnest` and `at` from a 1/8" grid) when the planer cut at the start is thinner than the tip setting. Otherwise it returns `steep` when the change of slope at the start is over 1/32" per inch; a cut getting thicker toward the tip counts. When both apply, the thin spot wins.
- **One tip at a time.** `tipView({ cut, tip, length, stored, end })` returns that tip's `fromTip`, `station`, `automatic`, `automaticStart`, `automaticFound`, `range`, `reachesStation` and `flag`, plus its taper. The flag is always null on Automatic, and also null for a hand-set start on a tip where Automatic found no steady start.

## Automatic's starts measured on the stress set

Measured with this module on the 1,635-board stress set (`buildStressSet(readSeedCatalog(), prepareBlank)`), both tips of every board. The script was a scratch file outside the repo.

| Set | Tips | At 12" | 12–18" | 18–24" | 24–36" | Over 36" | Furthest | No steady start | Boards whose two tips differ |
|---|---|---|---|---|---|---|---|---|---|
| All 1,635 boards | 3,270 | **2,912** | **218** | **97** | **43** | 0 | **32 1/2"** | 0 | **249** |
| 1,344 buildable boards | 2,688 | 2,509 | 116 | 55 | 8 | 0 | 30" | 0 | 135 |

These are identical to CONTEXT's 2,912 / 218 / 97 / 43 / 32 1/2" and 249, and to the research's buildable figures (2,509 / 116 / 55 / 8 / 30"). The tracer board, 10'0" on the Arctic Foam 10'9" LB slid to the tail with a 2 1/2" centre and a 5/8" tail, starts its tail at **26"**, which matches D-27.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 (tracer) | The steady taper and Automatic, end to end on one planer cut read off a real blank | `2cb4d19` |
| 2 | The slope of both curves, proven against finite differences on every blank | `d490b0f` |
| 3 | Every rule of the taper, Automatic, the range and the flag as named tests | `9b0c340` |

Tracer gate: this run was autonomous (ruling 11). The tracer's verify (`vitest` on the three suites plus `tsc --noEmit`) passed end to end before the expansion tasks began.

## Verification

- `npx vitest run lib/geometry/tip-taper.test.ts lib/geometry/pchip.test.ts lib/geometry/root-curve.test.ts`: 70 passed.
- Full unit suite `npx vitest run`: 101 files, 3,749 passed, 2 skipped. The skips existed before this plan and are not in its files.
- `npx tsc --noEmit` exits 0 and `npm run lint` exits 0.
- Acceptance greps: `slopeAt(x: number): number` appears exactly once in pchip.ts. `slopeAt` appears 5 times in root-curve.ts. tip-taper.ts has 15 `^export` lines and imports only `./outline` and `./units`. All six describe titles are present exactly once.
- Mutation check: removing the "not getting thicker toward the tip" condition from `canRunDownSteadily` makes 3 tests fail. It was reverted, and the file matches the commit.
- `lib/geometry/phase11-foil.test.ts` and `lib/models/design-snapshot.test.ts` were not touched. No package was added and no environment file or database was read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The every-blank slope sweeps timed out at 5 s**
- **Found during:** Task 2
- **Issue:** One `expect` per sample point (about 100,000 per sweep) went over Vitest's 5-second limit.
- **Fix:** Each curve now records its worst disagreement and where it happened, then asserts that once against the same 1e-6 tolerance. The `!(miss <= worst)` form makes a not-a-number fail too. The check, tolerance and step are unchanged. Each sweep now runs in about 150 ms.
- **Files modified:** lib/geometry/pchip.test.ts, lib/geometry/root-curve.test.ts
- **Commit:** `d490b0f`

**2. [Rule 3 - Acceptance grep] The inner `slopeAt` lets its return type be inferred**
- **Found during:** Task 1
- **Issue:** The plan's grep expects `slopeAt(x: number): number` exactly once in pchip.ts. The interface member and an annotated inner function made two.
- **Fix:** The inner function is written `function slopeAt(x: number) {`. Its type still comes from `PreparedPchip`.
- **Commit:** `2cb4d19`

Two small gaps in the plan were filled and are recorded under `decisions` above: what `pullThinningStart` does with a NaN, and including the start itself in the thin-spot search when it is off the 1/8" grid. Everything else was carried out exactly as written.

## TDD Gate Compliance

Tasks 2 and 3 are `tdd="true"`, but the plan puts the implementation in the tracer (Task 1), which comes before them. So there is no failing `test(...)` commit ahead of a `feat(...)` commit. The git order is `feat` (2cb4d19), then `test` (d490b0f), then `test` (9b0c340). A mutation check stood in for a RED run: one condition of the steady test was removed, three tests failed, and the change was reverted.

## Known Stubs

None.

## Threat Flags

None. T-14-16 (Automatic's scan) is bounded by the range: at most about 96 half-inch steps on a 120" board, and no loop depends on a stored value. T-14-17 (a huge, negative or not-a-number start) is handled: a non-finite value reads as Automatic, and any finite value is pulled into the range when read.

## Self-Check: PASSED

- FOUND: lib/geometry/tip-taper.ts, lib/geometry/tip-taper.test.ts, lib/geometry/pchip.ts, lib/geometry/root-curve.ts
- FOUND commits: 2cb4d19, d490b0f, 9b0c340
