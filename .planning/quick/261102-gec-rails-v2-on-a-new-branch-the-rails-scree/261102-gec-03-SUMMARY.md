---
phase: quick-261102-gec
plan: 03
subsystem: volume
status: complete
tags: [volume, finished-rail, litres, rails-v2]
requires: ["261102-gec-01", "261102-gec-02"]
provides:
  - "lib/geometry/finished-rail.ts: railBlendArea (one rail's foam the blends take off, exact) and sectionFinishedRail (the finished rail of a bare section result, at its own plot edge)"
  - "lib/geometry/volume.ts: computeCrossSectionVolume counts the finished rail at all 51 stations (stationBlendAreas alongside stationAreas); VolumeRailValues gains noseBlendArea / centerBlendArea / tailBlendArea"
  - "lib/geometry/design.ts: deriveRailValues fills the three blend areas, so VOLUME's working rows read the same finished rail"
affects: [preset cards, Board Rack, VOLUME, top bar litres, Summary, printed order form, VOLUME desktop reference picture]
tech-stack:
  added: []
  patterns: ["exact area of a blended corner by Archimedes' third, proven by Green's theorem and resampling convergence"]
key-files:
  created: []
  modified:
    - lib/geometry/finished-rail.ts
    - lib/geometry/finished-rail.test.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - components/volume/volume-calculation-card.tsx
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "D-V1 (the founder): volume counts the finished rail; PV1-PV7 applied as planned"
metrics:
  completed: 2026-11-02
actuals:
  tokens: 10400    # chars/4 over the realized code + spec diff (41,414 chars; pictures and the archive left out)
  tasks: 3
  commits: 4
duration: about 1 h
---

# Quick 261102-gec Plan 03: volume counts the finished rail — Summary

**Every litres figure in the app now counts the finished rail, which is the cut rail blended halfway into
each band (the curve RAILS draws), instead of the raw band cuts. The figure is worked out exactly. Every
board loses a little foam, 0.2 to 0.8 litres on the presets.**

## For the founder, in plain words

**What the litres count now.** Until now, volume added up each cross-section as if the rail were still the
flat band cuts, with sharp corners between them. You chose "Switch to the finished curve", so volume now adds
up the rail you are left with once those corners are blended away: each corner rolled halfway into the bands
either side of it. That is the same curve RAILS draws in heavy ink over the bands. RAILS itself is unchanged.
It still draws the cut bands, because those are the cuts you make, with the finished rail over them.

**Why every board lost a little.** Blending takes foam off every corner, so every board comes out slightly
smaller. On a board it is about what your sanding block takes off rolling the bands: about 0.2 litres on a
shortboard and 0.8 on a longboard. A board with no blend anywhere would not change.

**Where you will see it.** Everywhere a board's litres show, and they all move together: the preset cards on
the home page, the Board Rack, VOLUME's Estimated Volume, the litres in the top bar, the Summary, and the
printed order form. VOLUME's working rows move with them. Those are the Tail, Center and Nose Cross-Section
Thickness rows and the Length-Weighted thickness, so no screen shows a figure on the old basis. VOLUME's small
method line now reads "From the board's own finished cross-sections along its length."

**Exact, not estimated.** Each blended corner is a parabola, and the foam a parabola takes off a sharp corner
is exactly one third of the triangle it cuts across that corner. That is a property of the curve, known since
Archimedes. So the app takes that third off each corner instead of tracing the curve point by point. The tests
check it two ways on every rail case in the rails-v2 reference (1,453 of them, each also with a hard edge and
with Single Tuck):
- it matches the curve's own area to within a millionth of a square millimetre;
- tracing the curve in ever-finer steps homes in on the same figure.

**Hard edge and Single Tuck.** A hard-edge tail keeps its bottom corner sharp. That corner is the foam's wall
and nothing is blended there, so it takes nothing off. Single Tuck's one tuck blends like any other band.

### The litres, three ways

| Board | Before rails-v2 (main) | Cut rail on the v2 rules (plan 01) | Finished rail (this plan) | Card |
|-------|------------------------|------------------------------------|---------------------------|------|
| Shortboard | 29.562 | 30.085 | 29.879 | 29.6 → 30.1 → 29.9 |
| Fish | 35.313 | 35.318 | 35.089 | 35.3 → 35.3 → 35.1 |
| Mid-length | 50.401 | 50.057 | 49.765 | 50.4 → 50.1 → 49.8 |
| Longboard | 73.945 | 73.957 | 73.179 | 73.9 → 74.0 → 73.2 |
| The first board a visitor sees | 30.509 | 30.732 | 30.522 | 30.5 → 30.7 → 30.5 |
| An Arctic board (Arctic Foam 9'4" G, 2" shorter) | 47.443 | 47.757 | 47.417 | 47.4 → 47.8 → 47.4 |

Why each column moved:
- **Main to plan 01:** the rails' cut shape moved to your Chris Rails v2 sheets. The apex, deck marks and tucks
  follow the board's own thickness and there is no Corner Cut, so some boards gained a little and some lost a
  little.
- **Plan 01 to this plan:** the blends come off, so every board loses a little. Longer boards lose the most,
  because there is more rail to blend.

All figures come from the app's own volume code (`scripts/phase14-before-after.ts --step curves`). The
before-plan-03 column was printed from the unchanged tree before any code moved. The preset-figures record
(the Longboard on its recorded 9'3"Y) moved 30.085 → 29.879, 35.318 → 35.089, 50.057 → 49.765 and
75.259 → 74.456, regenerated by its script.

### VOLUME's working rows that moved (inches, four places, cut → finished)

| Board | Row | Cut | Finished | On screen |
|-------|-----|-----|----------|-----------|
| First board | Tail | 1.4786 | 1.4707 | 1 1/2" (unchanged) |
| First board | Center | 2.2911 | 2.2725 | **2 5/16" → 2 1/4"** |
| First board | Nose | 1.2315 | 1.2250 | 1 1/4" (unchanged) |
| First board | Length-Weighted | 1.5246 | 1.5148 | 1 1/2" (unchanged) |
| Shortboard | Center | 2.0681 | 2.0526 | 2 1/16" (unchanged) |
| Mid-length | Center | 2.4802 | 2.4657 | **2 1/2" → 2 7/16"** |
| Mid-length | Length-Weighted | 1.7895 | 1.7794 | **1 13/16" → 1 3/4"** |
| Longboard | Length-Weighted | 1.9093 | 1.8892 | **1 15/16" → 1 7/8"** |

Every row is a little lower. Only the bold ones cross a sixteenth. Each row is lower than the cut rail's by
exactly that section's blend area divided by its half width, and a test checks this on every preset.

## Pictures (`pictures/`)

| Before | After | What to look at |
|--------|-------|-----------------|
| `p3-before-volume-desktop.png` | `p3-after-volume-desktop.png` | The first board on VOLUME, 1280 x 800: 30.73 → 30.52 L, Center 2 5/16" → 2 1/4", the method line now says "finished". Tail, Nose and Length-Weighted are unchanged. |
| `p3-before-volume-shortboard-desktop.png` | `p3-after-volume-shortboard-desktop.png` | The Shortboard on VOLUME: 30.09 → 29.88 L. Its rows still round to the same sixteenths. |
| `p3-before-presets-desktop.png` | `p3-after-presets-desktop.png` | The four preset cards: 30.1 / 35.3 / 50.1 / 74.0 L → 29.9 / 35.1 / 49.8 / 73.2 L |
| `p3-before-volume-iphone.png` | `p3-after-volume-iphone.png` | iPhone 14, the first board on VOLUME (whole page): the same changes as the computer |

The shooting script is in `pictures/shoot-source-03.tar.gz` (no loose `.ts` left in `pictures/`).

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | 8ea8224f | docs(quick-261102-gec): before pictures — VOLUME and the preset cards counting the cut rail |
| 2 | 97d47a57 | VOLUME: every board's litres now count the finished rail — the cut rail blended halfway into each band — on every screen and the printed order form |
| 3 | dd664aa5 | VOLUME: after pictures — the litres and the centre thickness on the finished rail |
| 4 | (this) | docs(quick-261102-gec): plan 03 summary |

## Gates

- **Unit suite:** 156 files, **5,903 passed, 2 skipped** (pre-existing), 0 failed. New tests:
  - `finished-rail.test.ts`, 4:
    - Green's theorem on 1,453 golden cases × 3 variants;
    - convergence;
    - the hard edge's sharp corner;
    - same curve as RAILS draws.
  - `volume.test.ts`: the centre-station test rewritten, plus 2 new:
    - every station of the first board;
    - every station of a one-section board against its own cut closing polygon.
  - `design.test.ts`, 2 × 4 presets: the blend areas carried, and the rows lower by exactly area ÷ half width.
- **`npx next typegen` + `npx tsc --noEmit`:** clean. **`npm run lint`:** clean.
- **The four litres-reading browser specs** (`phone-screen-tiles`, `volume-fins-panels`, `imported-readout`,
  `board-rack`; desktop, iPhone, Android, port 3174): **90 passed, 129 skipped, 0 failed** (7.5 min). Nothing
  needed a re-run.
- **`desktop-baseline.spec.ts`:** first run 4 passed, 10 skipped, 1 failed. Only VOLUME failed (596 pixels). Its
  diff showed exactly three changes: the Center row, the Estimated Volume and the method line. VOLUME was
  re-recorded alone (SHA-256 8069a93a → 2e4e1421), and a log entry was added above fast task 185's. The re-run
  gave **5 passed, 10 skipped, 0 failed**. TEMPLATE, ROCKER, RAILS and FINS passed unchanged.
- **Database:** `git diff --name-only cb0e37fc -- lib/db drizzle` is empty. No board's saved shape changes.
- `lib/geometry/rail-bands.ts` and every `components/rails/` file are unchanged. `rail-bands.ts` still imports
  nothing from `finished-rail.ts` (V8).

## The planner's choices, as applied

- **PV1 (exact):** each blend's area is `railBlendArea`: the sum over the `quad` steps of a third of triangle
  (start, control, end). A station's area is the cut closing polygon less twice that.
- **PV2 (one basis):** `computeCrossSectionVolume` (the quoted litres) and `deriveRailValues` (VOLUME's rows) both
  call `railBlendArea(sectionFinishedRail(...))`.
- **PV3:** `buildRailProfile` survives only as the cut base. The prototype estimator's golden tests leave the
  blend areas out, which reads as 0, and they pass unchanged.
- **PV4:** `sectionFinishedRail` uses `railPlotBounds(result).xAxisMin`. A test proves its steps equal
  `finishedRail(output, output.bounds.xAxisMin)` on every golden case and variant.
- **PV5:**
  - `VolumeRailValues` gains the three optional blend areas, and absent reads 0.
  - `CrossSectionVolumeResult` gains `stationBlendAreas` (both rails).
  - `deriveRailValues` always fills the three areas, and a test checks it.
- **PV6:** there is no special case. The hard edge's corner is a straight step (tested: no blend has it as its
  control), and Single Tuck is covered in every exactness test.
- **PV7:** the method line reads "From the board's own finished cross-sections along its length."

## The planner's measured facts, confirmed

- **V1:** confirmed. Cut minus the thirds equals Green's theorem within 1e-6 mm² on every case. Sampling
  converges at least tenfold from 64 to 256 pieces wherever the error is above rounding level.
- **V2:** confirmed to the last printed digit for all six boards (before: the unchanged tree; after: the
  branch).
- **V3:** confirmed except for the datasheet figures (deviation 1 below). Only VOLUME's reference picture moved,
  in exactly the three places named.
- **V4:** covered by the hard-edge and Single Tuck variants in the exactness test.
- **V5:** not re-measured separately. The same-curve test proves the left edge is RAILS' own.
- **V6:** confirmed (the table above).
- **V7:** measured 1.33 ms per board, warm (`summarizeDesign` over the four presets), while the browser suite
  was loading the machine. The plan's figure was 1.15 ms.
- **V8:** confirmed. `finished-rail.ts` now imports `buildRailSegments` and `railPlotBounds` at run time, and
  there is no cycle.

## Deviations from Plan

**1. [Plan figure did not reproduce] The datasheet test's figures.** V3 said the Arctic Foam 7'3" SBF
datasheet check would move from 77.587 L (+0.54%) to 76.758 L (−0.53%). Run on this branch, the test's own
Family 1 board reads **77.98 L (+1.05%) on the cut rail**. That matches the figure already in the test's
comment from plan 01. On the finished rail it reads **77.23 L (+0.07%)**: the fullest centre section is
51,714.2 → 51,149.1 mm², and Family 1 is still the fullest. The comment was refreshed with these measured
figures. The 10% bar stands, and the check now sits closer to the stated 77.17 L than before.

**2. [Test design] The "every station" check.** The plan asked that every station's cut area be checked
against the cut closing polygon on the first board a visitor sees. Re-deriving each in-between station's
blended rail inside a test would have copied the volume code into the test. Instead:
- on the first board, the centre station is checked exactly against `computeRailBands(DEFAULT_RAIL_BAND_SPEC).center`
  (to 1e-9 relative), and every station's blend is checked to be at least 0 and below its cut area;
- a second board with one rail section all along (scale 1, one thickness) is checked at all 51 stations
  against its own cut closing polygon and its own blend area.

Together these cover what the plan asked without a second copy of the formula.

No files outside `files_modified` were touched.

## Open questions for the founder

None. The volume question (R5) was answered ("Switch to the finished curve"), and that answer is this plan.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register:
- T-gec-10: the exactness and convergence tests, plus "finished never above cut".
- T-gec-11: one helper in both paths, and a test ties the rows to the same blend areas.
- T-gec-12: 1.33 ms per board.

## Self-Check: PASSED

- Present: `lib/geometry/finished-rail.ts` (`export function railBlendArea`, `export function sectionFinishedRail`),
  the eight `pictures/p3-*.png`, `pictures/shoot-source-03.tar.gz`. No loose `.ts` in `pictures/`.
- Commits on the branch: 8ea8224f, 97d47a57, dd664aa5.
