---
phase: 16-3d-board-and-cnc-export
plan: 16
subsystem: geometry (the section rule behind the litres, the 3D board and the CNC files), preset figures, saved-boards report
status: complete
tags: [geometry, volume, wings, 3d, cnc, report, D-05, D-09, D-17, D-18, D-19, D-31, D-32, D-33, D-34]
requires:
  - "16-15: RAIL_CHARACTER_FADE, SectionRule, boardSectionsWith, fadingSectionArea, the 74-board pin, the report idiom"
  - "16-05: the CNC writers, boardSlices, boardOutlineLoop, a swallow's two pieces"
  - "16-03: buildBoardSurface, placedHalfSection, surfaceStations, D-31's level variant, the headless picture harness"
provides:
  - "lib/geometry/volume.ts: SurfaceFit, OLD_SURFACE_FIT, SMOOTH_SURFACE_FADE (the live rule), wingStepHalf; BoardSection.drawn; CrossSectionVolumeInput.wingTakeAt; RailCharacterRule.fit"
  - "lib/geometry/wings.ts: wingTakeAt, WING_HAIR_MM; applyWings records the placed wings; OutlineGeometry.wings"
  - "lib/geometry/finished-rail.ts: finishedRailReach, railReach, fittedFinishedRail"
  - "lib/geometry/__fixtures__/phase16-boards.ts: phase16WingBoards (28), phase16SurfaceBoards (102)"
  - "lib/geometry/__fixtures__/phase16-surface-litres-pin.json + scripts/extract-phase16-surface-litres-pin.ts (refuses to re-run) + lib/geometry/phase16-surface-litres-pin.test.ts"
  - "lib/models/surface-report.ts: surfaceLitresMove, surfaceReportLines; scripts/check-saved-boards.ts --surface-report"
affects: [16-13, 16-17]
tech-stack:
  added: []
  patterns:
    - "A rule carries how it fits the outline (`fit`); a rule with no fit, and every old rule, runs the old arithmetic operation for operation"
    - "A drawn half that isn't the plain sampled one lives on the section (`BoardSection.drawn`), and the litres count it as the level variant: the exact area plus the drawn ring's area less the old ring's"
    - "A third refusing pin generator, committed alone before the rule changed"
key-files:
  created:
    - scripts/extract-phase16-surface-litres-pin.ts
    - lib/geometry/__fixtures__/phase16-surface-litres-pin.json
    - lib/geometry/phase16-surface-litres-pin.test.ts
    - lib/models/surface-report.ts
    - lib/models/surface-report.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-wing-before-after.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-wing-slice.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-tips-before-after.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-pictures-source.tar.gz
  modified:
    - lib/geometry/__fixtures__/phase16-boards.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - lib/geometry/outline.ts
    - lib/geometry/wings.ts
    - lib/geometry/wings.test.ts
    - lib/geometry/design.ts
    - lib/geometry/finished-rail.ts
    - lib/geometry/finished-rail.test.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - lib/geometry/phase16-live-litres-pin.test.ts
    - lib/geometry/tail-cut.test.ts
    - lib/export/cnc-files.test.ts
    - scripts/check-saved-boards.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png
decisions:
  - "Q1, the founder 2026-11-04, \"Yes\": only the rail's own bands step in behind a wing, easing to nothing at Deck Mark 3 (never in under twice the take); the deck inside is exactly the board without its wing"
  - "Q2, \"Yes\": the flat bottom carries straight through, the tuck steps in with the rail; a Symmetrical rail's tuck line does not move"
  - "Q3, \"Yes\": VOLUME counts the foam the fixed tips add; the Shortboard's card reads 29.62, the Fish, Mid-length and Longboard cards as they did"
  - "The plan as a whole: \"Approved\""
  - "Inside a blend the ease's reach is Deck Mark 3 carried by the blend's own weight, so it cannot jump where the tail's rail takes over"
metrics:
  duration: "about 55 minutes"
  completed: 2026-11-04
estimate:
  tokens: 150000
actuals:
  tokens: 32000
  tasks: 2
  commits: 3
---

# Phase 16 Plan 16: The Deck Stays Smooth Across a Wing, and No Flip at the Tips Summary

A wing is now a step in the outline only: behind it the rail and its bands step in, easing to nothing at Deck Mark 3,
so the deck inside Deck Mark 3 and the flat bottom are exactly the board without the wing, and the 3D board and the CNC
outline step where TEMPLATE does. Every tip ends on the side profile's own tip with no flip (18°–43° at noses, up to 41°
at tail tips before; at most 0.02° now), and VOLUME counts the foam that adds.

## What changes for the founder

- **The wing.** Your words: "Wings should be steps in the outline. The Deck should remain smooth across the wings
  location." Before, the whole rail moved in behind a wing, so the deck dropped: about a millimetre an inch in from the
  rail behind the default 3/16" wing, up to 5 mm behind a 1" wing, and still visible three inches in. Now the deck from
  the stringer out to Deck Mark 3 is the board without the wing, nothing moves from three inches in, and only the rail's
  own bands step in. The rail keeps its shape and stands exactly on TEMPLATE's outline.
- **What you will still see.** The rail's bands do have to get from the wing's step to the deck, so between the rail and
  Deck Mark 3 (about 2 1/2" to 3 1/2" in) there is a fading step. That is ruling Q1 as you made it: an inch in from the rail
  it stands 0.6–2.7 mm off the wing-less deck, against 0.8–5.3 mm before.
- **The bottom.** The flat runs straight through. The tuck steps in with the rail; on the Longboard's Symmetrical rail the
  tuck line doesn't move at all, and on a hard edge the edge is the rail itself, on the stepped outline.
- **The outline on the 3D board and in the CNC file.** It used to cut a half-inch chamfer across the step, up to 9.5 mm
  off TEMPLATE on a 3/8" square step. Now it steps where TEMPLATE does, within 0.1 mm, a square step as two points a hair
  apart. Same number of slices, and no CNC writer changed.
- **The tips.** Your words: "Let's not do that little flip." Each tip used to dive into a point halfway up it. From the
  side a tip is now the side profile's own tip, one straight edge from the bottom to the deck at the outline's point, so it
  looks squared off from the side by the tip's own thickness; from above it is still the outline's point. Near a tip, a rail
  wider than its room is drawn into that room instead of cut off, so the stringer follows your rocker and deck right in.
- **The litres (Q3).** The Shortboard's card reads **29.62 L instead of 29.61**. The Fish, Mid-length and Longboard
  cards read as they did. A winged board rises about +0.01 L (default wing) to +0.07 L (1" wing on the Longboard). A board
  re-cut with a pin or round tail rises up to +0.14 L. A board with no wing and room for its rail right to each tip reads
  to the last digit what it read. Nothing on screen says the litres moved.
- **For go-live 2.** A read-only report lists every saved board whose litres move (below). The rail-character report's
  "after" column is the live rule, so from now on it includes this plan's moves as well as 16-15's.

## Pictures

- `pictures/16-16-wing-before-after.png`: three boards, each Deck with Contour Stripes, Deck in a low light, Bottom,
  then Side and the outline from above.
- `pictures/16-16-wing-slice.png`: the CNC slice behind a wing, before, after and the wing-less board, to scale.
- `pictures/16-16-tips-before-after.png`: six tips from the side and three-quarters, before and after.

All three were looked at. The faint bands across the Mid-length's domed deck appear before and after: they are the 1/16"
rounding of the rail thickness, 16-15's filed to-do, and its picture's caption says so.

## How far it moved, in one place

| What | Today | After |
|---|---:|---:|
| The flip at a nose | 18.5°–43.1° | at most 0.016° |
| The flip at a pin, round, diamond tail end or swallow point | up to 40.7° | at most 0.003° |
| Furthest off the side profile over the last 2" | 11.91 mm | 0.0016 mm |
| 3D vs VOLUME, boards without a wing | −0.071% to −0.034% | −0.056% to −0.025% |
| 3D vs VOLUME, winged boards | −0.103% to +0.007% | −0.085% to 0.000% |
| Winged boards' litres against the pin | | +0.0098 to +0.0675 L |
| Boards without a wing against the pin | | ±0 to +0.1351 L |

## The presets as their cards open them, and the stock 6'0"

| Board | Before (L) | After (L) | Move (L) | Card before | Card after |
|---|---:|---:|---:|---:|---:|
| Shortboard | 29.6117 | 29.6177 | +0.0060 | 29.61 | 29.62 |
| Fish | 34.6476 | 34.6497 | +0.0021 | 34.65 | 34.65 |
| Mid-length | 49.4036 | 49.4036 | +0.0000 | 49.40 | 49.40 |
| Longboard | 72.3963 | 72.3963 | ±0.0000 | 72.40 | 72.40 |
| Stock 6'0" | 30.2886 | 30.2906 | +0.0019 | 30.29 | 30.29 |

## The ledge, per winged board and wing (mm off the board without the wing, just behind the wing)

| Board | Wing | 1" in, today | 1" in, after | 2" in, today | 2" in, after | 3" in, today | 3" in, after | half-width, today | half-width, after |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wing\|shortboard\|one | 1 | 1.05 | 0.67 | 0.63 | 0.06 | 0.22 | 0.00 | 0.16 | 0.00 |
| wing\|shortboard\|two | 1 | 1.05 | 0.67 | 0.63 | 0.06 | 0.22 | 0.00 | 0.16 | 0.00 |
| wing\|shortboard\|two | 2 | 1.58 | 0.80 | 0.77 | 0.00 | 0.17 | 0.00 | 0.37 | 0.00 |
| wing\|shortboard\|deep | 1 | 4.60 | 1.02 | 2.25 | 0.00 | 0.56 | 0.00 | 1.62 | 0.00 |
| wing\|shortboard\|square | 1 | 2.01 | 1.18 | 1.17 | 0.05 | 0.40 | 0.00 | 0.38 | 0.00 |
| wing\|shortboard\|rounded | 1 | 2.58 | 1.37 | 1.44 | 0.01 | 0.45 | 0.00 | 0.56 | 0.00 |
| wing\|shortboard\|infade | 1 | 1.22 | 0.95 | 0.84 | 0.28 | 0.49 | 0.01 | 0.17 | 0.00 |
| wing\|shortboard\|one-soft | 1 | 1.05 | 0.67 | 0.62 | 0.05 | 0.22 | 0.00 | 0.16 | 0.00 |
| wing\|fish\|one | 1 | 1.04 | 0.77 | 0.70 | 0.17 | 0.36 | 0.00 | 0.18 | 0.00 |
| wing\|fish\|two | 1 | 1.04 | 0.77 | 0.70 | 0.17 | 0.36 | 0.00 | 0.18 | 0.00 |
| wing\|fish\|two | 2 | 1.54 | 0.95 | 0.92 | 0.05 | 0.33 | 0.00 | 0.25 | 0.00 |
| wing\|fish\|deep | 1 | 4.64 | 2.31 | 2.86 | 0.01 | 1.20 | 0.00 | 1.47 | 0.00 |
| wing\|fish\|square | 1 | 2.00 | 1.41 | 1.35 | 0.24 | 0.68 | 0.00 | 0.40 | 0.00 |
| wing\|fish\|rounded | 1 | 2.56 | 1.72 | 1.70 | 0.20 | 0.81 | 0.00 | 0.56 | 0.00 |
| wing\|fish\|infade | 1 | 1.24 | 1.03 | 0.84 | 0.41 | 0.60 | 0.08 | 0.24 | 0.00 |
| wing\|fish\|one-soft | 1 | 1.04 | 0.76 | 0.70 | 0.17 | 0.36 | 0.00 | 0.17 | 0.00 |
| wing\|midlength\|one | 1 | 1.15 | 0.85 | 0.81 | 0.20 | 0.46 | 0.00 | 0.37 | 0.00 |
| wing\|midlength\|two | 1 | 1.15 | 0.85 | 0.81 | 0.20 | 0.46 | 0.00 | 0.37 | 0.00 |
| wing\|midlength\|two | 2 | 1.72 | 1.07 | 1.09 | 0.07 | 0.47 | 0.00 | 0.72 | 0.00 |
| wing\|midlength\|deep | 1 | 5.25 | 2.70 | 3.47 | 0.02 | 1.70 | 0.00 | 2.81 | 0.00 |
| wing\|midlength\|square | 1 | 2.23 | 1.59 | 1.58 | 0.30 | 0.89 | 0.00 | 0.81 | 0.00 |
| wing\|midlength\|rounded | 1 | 2.90 | 1.96 | 2.06 | 0.26 | 1.13 | 0.00 | 1.21 | 0.00 |
| wing\|midlength\|infade | 1 | 1.34 | 1.12 | 0.96 | 0.46 | 0.73 | 0.09 | 0.37 | 0.00 |
| wing\|midlength\|one-soft | 1 | 1.15 | 0.85 | 0.81 | 0.20 | 0.45 | 0.00 | 0.37 | 0.00 |
| wing\|longboard\|one | 1 | 0.80 | 0.61 | 0.54 | 0.16 | 0.31 | 0.00 | 0.19 | 0.00 |
| wing\|longboard\|two | 1 | 0.80 | 0.61 | 0.54 | 0.16 | 0.31 | 0.00 | 0.19 | 0.00 |
| wing\|longboard\|two | 2 | 1.18 | 0.78 | 0.75 | 0.09 | 0.31 | 0.00 | 0.30 | 0.00 |
| wing\|longboard\|deep | 1 | 3.54 | 2.03 | 2.32 | 0.05 | 1.09 | 0.00 | 1.46 | 0.00 |
| wing\|longboard\|square | 1 | 1.53 | 1.13 | 1.06 | 0.26 | 0.58 | 0.00 | 0.42 | 0.00 |
| wing\|longboard\|rounded | 1 | 1.95 | 1.39 | 1.35 | 0.23 | 0.71 | 0.00 | 0.59 | 0.00 |
| wing\|longboard\|infade | 1 | 0.96 | 0.82 | 0.65 | 0.34 | 0.49 | 0.08 | 0.22 | 0.00 |
| wing\|longboard\|one-soft | 1 | 0.80 | 0.61 | 0.54 | 0.16 | 0.31 | 0.00 | 0.19 | 0.00 |

## The flip, per board and tip (largest angle off the side profile over the last 2", and furthest off it)

| Board | Tip | Flip today | Flip after | Off today (mm) | Off after (mm) |
|---|---|---:|---:|---:|---:|
| shortboard\|asis\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|asis\|hard | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| shortboard\|asis\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|asis\|soft | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| shortboard\|swallow\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|swallow\|hard | swallow point, right | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|swallow\|hard | swallow point, left | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|swallow\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|swallow\|soft | swallow point, right | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|swallow\|soft | swallow point, left | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|diamond\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|diamond\|hard | tail (diamond) | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|diamond\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|diamond\|soft | tail (diamond) | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|pin\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|pin\|hard | tail (pin) | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|pin\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|pin\|soft | tail (pin) | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|round\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|round\|hard | tail (round) | 40.7° | 0.000° | 11.91 | 0.0000 |
| shortboard\|round\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| shortboard\|round\|soft | tail (round) | 40.7° | 0.000° | 11.91 | 0.0000 |
| fish\|asis\|hard | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|asis\|hard | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|asis\|hard | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|asis\|soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|asis\|soft | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|asis\|soft | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|swallow\|hard | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|swallow\|hard | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|swallow\|hard | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|swallow\|soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|swallow\|soft | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|swallow\|soft | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|diamond\|hard | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|diamond\|hard | tail (diamond) | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|diamond\|soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|diamond\|soft | tail (diamond) | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|pin\|hard | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|pin\|hard | tail (pin) | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|pin\|soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|pin\|soft | tail (pin) | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|round\|hard | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|round\|hard | tail (round) | 33.1° | 0.000° | 9.53 | 0.0000 |
| fish\|round\|soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| fish\|round\|soft | tail (round) | 33.1° | 0.000° | 9.53 | 0.0000 |
| midlength\|asis\|hard | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|asis\|hard | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| midlength\|asis\|soft | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|asis\|soft | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| midlength\|swallow\|hard | nose | 28.9° | 0.015° | 7.94 | 0.0016 |
| midlength\|swallow\|hard | swallow point, right | 36.0° | 0.000° | 9.53 | 0.0000 |
| midlength\|swallow\|hard | swallow point, left | 36.0° | 0.000° | 9.53 | 0.0000 |
| midlength\|swallow\|soft | nose | 28.9° | 0.015° | 7.94 | 0.0016 |
| midlength\|swallow\|soft | swallow point, right | 36.0° | 0.000° | 9.53 | 0.0000 |
| midlength\|swallow\|soft | swallow point, left | 36.0° | 0.000° | 9.53 | 0.0000 |
| midlength\|diamond\|hard | nose | 28.9° | 0.015° | 7.94 | 0.0016 |
| midlength\|diamond\|hard | tail (diamond) | 33.3° | 0.000° | 9.53 | 0.0000 |
| midlength\|diamond\|soft | nose | 28.9° | 0.015° | 7.94 | 0.0016 |
| midlength\|diamond\|soft | tail (diamond) | 33.3° | 0.000° | 9.53 | 0.0000 |
| midlength\|pin\|hard | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|pin\|hard | tail (pin) | 34.9° | 0.000° | 9.53 | 0.0000 |
| midlength\|pin\|soft | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|pin\|soft | tail (pin) | 34.9° | 0.000° | 9.53 | 0.0000 |
| midlength\|round\|hard | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|round\|hard | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| midlength\|round\|soft | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| midlength\|round\|soft | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| longboard\|asis\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|asis\|hard | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| longboard\|asis\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|asis\|soft | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| longboard\|swallow\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|swallow\|hard | swallow point, right | 38.1° | 0.003° | 11.11 | 0.0002 |
| longboard\|swallow\|hard | swallow point, left | 38.1° | 0.003° | 11.11 | 0.0002 |
| longboard\|swallow\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|swallow\|soft | swallow point, right | 36.9° | 0.003° | 11.11 | 0.0002 |
| longboard\|swallow\|soft | swallow point, left | 36.9° | 0.003° | 11.11 | 0.0002 |
| longboard\|diamond\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|diamond\|hard | tail (diamond) | 38.1° | 0.001° | 11.11 | 0.0003 |
| longboard\|diamond\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|diamond\|soft | tail (diamond) | 33.9° | 0.001° | 11.11 | 0.0003 |
| longboard\|pin\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|pin\|hard | tail (pin) | 38.1° | 0.000° | 11.11 | 0.0000 |
| longboard\|pin\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|pin\|soft | tail (pin) | 25.8° | 0.000° | 11.11 | 0.0000 |
| longboard\|round\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|round\|hard | tail (round) | 38.1° | 0.000° | 11.11 | 0.0000 |
| longboard\|round\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| longboard\|round\|soft | tail (round) | 25.8° | 0.000° | 11.11 | 0.0000 |
| aligned\|shortboard\|hard | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| aligned\|shortboard\|hard | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| aligned\|shortboard\|soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| aligned\|shortboard\|soft | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| aligned\|fish\|hard | nose | 33.0° | 0.001° | 8.73 | 0.0003 |
| aligned\|fish\|hard | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| aligned\|fish\|hard | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| aligned\|fish\|soft | nose | 33.0° | 0.001° | 8.73 | 0.0003 |
| aligned\|fish\|soft | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| aligned\|fish\|soft | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| aligned\|midlength\|hard | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| aligned\|midlength\|hard | tail (round) | 35.0° | 0.000° | 9.53 | 0.0000 |
| aligned\|midlength\|soft | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| aligned\|midlength\|soft | tail (round) | 35.0° | 0.000° | 9.53 | 0.0000 |
| aligned\|longboard\|hard | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| aligned\|longboard\|hard | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| aligned\|longboard\|soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| aligned\|longboard\|soft | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| stock\|hard | nose | 20.2° | 0.000° | 6.35 | 0.0000 |
| stock\|hard | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| stock\|soft | nose | 20.2° | 0.000° | 6.35 | 0.0000 |
| stock\|soft | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|shortboard\|tail-sbt | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|tail-sbt | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|shortboard\|tail-single | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|tail-single | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|shortboard\|he-centre-sbt | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|he-centre-sbt | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|shortboard\|nose-sbt | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|nose-sbt | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|shortboard\|nose-single | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|nose-single | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|shortboard\|centre-single-sbt | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| tucked\|shortboard\|centre-single-sbt | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| tucked\|fish\|tail-sbt | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|tail-sbt | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|tail-sbt | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|tail-single | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|tail-single | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|tail-single | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|he-centre-sbt | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|he-centre-sbt | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|he-centre-sbt | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|nose-sbt | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|nose-sbt | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|nose-sbt | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|nose-single | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|nose-single | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|nose-single | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|centre-single-sbt | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| tucked\|fish\|centre-single-sbt | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|fish\|centre-single-sbt | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|tail-sbt | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|tail-sbt | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|tail-single | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|tail-single | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|he-centre-sbt | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|he-centre-sbt | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|nose-sbt | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|nose-sbt | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|nose-single | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|nose-single | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|midlength\|centre-single-sbt | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| tucked\|midlength\|centre-single-sbt | tail (round) | 34.9° | 0.000° | 9.53 | 0.0000 |
| tucked\|longboard\|tail-sbt | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|tail-sbt | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|longboard\|tail-single | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|tail-single | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|longboard\|he-centre-sbt | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|he-centre-sbt | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|longboard\|nose-sbt | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|nose-sbt | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|longboard\|nose-single | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|nose-single | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| tucked\|longboard\|centre-single-sbt | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| tucked\|longboard\|centre-single-sbt | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|shortboard\|one | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|one | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|two | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|two | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|deep | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|deep | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|square | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|square | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|rounded | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|rounded | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|infade | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|infade | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|shortboard\|one-soft | nose | 18.5° | 0.000° | 5.56 | 0.0000 |
| wing\|shortboard\|one-soft | tail (squash) | 1.2° | 0.001° | 0.30 | 0.0003 |
| wing\|fish\|one | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|one | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|one | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|two | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|two | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|two | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|deep | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|deep | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|deep | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|square | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|square | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|square | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|rounded | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|rounded | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|rounded | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|infade | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|infade | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|infade | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|one-soft | nose | 32.7° | 0.001° | 8.73 | 0.0003 |
| wing\|fish\|one-soft | swallow point, right | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|fish\|one-soft | swallow point, left | 33.1° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|one | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|one | tail (round) | 34.8° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|two | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|two | tail (round) | 34.7° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|deep | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|deep | tail (round) | 34.5° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|square | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|square | tail (round) | 34.7° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|rounded | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|rounded | tail (round) | 34.7° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|infade | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|infade | tail (round) | 34.8° | 0.000° | 9.53 | 0.0000 |
| wing\|midlength\|one-soft | nose | 28.9° | 0.016° | 7.94 | 0.0016 |
| wing\|midlength\|one-soft | tail (round) | 34.8° | 0.000° | 9.53 | 0.0000 |
| wing\|longboard\|one | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|one | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|two | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|two | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|deep | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|deep | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|square | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|square | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|rounded | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|rounded | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|infade | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|infade | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |
| wing\|longboard\|one-soft | nose | 43.1° | 0.001° | 11.11 | 0.0002 |
| wing\|longboard\|one-soft | tail (squash) | 0.0° | 0.000° | 0.00 | 0.0000 |

Worst after: 0.016°, 0.0016 mm.

## The 102 boards' litres

| Board | Pinned (L) | Now (L) | Move (L) | 3D vs VOLUME, today | 3D vs VOLUME, now | Mesh faults |
|---|---:|---:|---:|---:|---:|---:|
| shortboard\|asis\|hard | 29.6117 | 29.6177 | +0.0060 | -0.045% | -0.043% | 0 |
| shortboard\|asis\|soft | 29.5730 | 29.5791 | +0.0061 | -0.045% | -0.043% | 0 |
| shortboard\|swallow\|hard | 30.6347 | 30.6394 | +0.0047 | -0.059% | -0.037% | 0 |
| shortboard\|swallow\|soft | 30.5964 | 30.6010 | +0.0047 | -0.059% | -0.036% | 0 |
| shortboard\|diamond\|hard | 30.1805 | 30.1890 | +0.0086 | -0.053% | -0.038% | 0 |
| shortboard\|diamond\|soft | 30.1421 | 30.1509 | +0.0088 | -0.052% | -0.038% | 0 |
| shortboard\|pin\|hard | 28.7716 | 28.7886 | +0.0170 | -0.046% | -0.035% | 0 |
| shortboard\|pin\|soft | 28.7332 | 28.7511 | +0.0179 | -0.046% | -0.035% | 0 |
| shortboard\|round\|hard | 28.7716 | 28.7886 | +0.0170 | -0.046% | -0.035% | 0 |
| shortboard\|round\|soft | 28.7332 | 28.7511 | +0.0179 | -0.046% | -0.035% | 0 |
| fish\|asis\|hard | 34.6476 | 34.6497 | +0.0021 | -0.058% | -0.039% | 0 |
| fish\|asis\|soft | 34.6153 | 34.6174 | +0.0021 | -0.058% | -0.039% | 0 |
| fish\|swallow\|hard | 34.6476 | 34.6497 | +0.0021 | -0.058% | -0.039% | 0 |
| fish\|swallow\|soft | 34.6153 | 34.6174 | +0.0021 | -0.058% | -0.039% | 0 |
| fish\|diamond\|hard | 34.0736 | 34.0773 | +0.0037 | -0.057% | -0.040% | 0 |
| fish\|diamond\|soft | 34.0413 | 34.0450 | +0.0038 | -0.056% | -0.040% | 0 |
| fish\|pin\|hard | 31.8718 | 31.9091 | +0.0373 | -0.034% | -0.025% | 0 |
| fish\|pin\|soft | 31.8394 | 31.8786 | +0.0391 | -0.034% | -0.025% | 0 |
| fish\|round\|hard | 31.8718 | 31.9091 | +0.0373 | -0.034% | -0.025% | 0 |
| fish\|round\|soft | 31.8394 | 31.8786 | +0.0391 | -0.034% | -0.025% | 0 |
| midlength\|asis\|hard | 49.4036 | 49.4036 | +0.0000 | -0.044% | -0.027% | 0 |
| midlength\|asis\|soft | 49.3656 | 49.3656 | +0.0000 | -0.046% | -0.029% | 0 |
| midlength\|swallow\|hard | 51.6620 | 51.6620 | ±0.0000 | -0.071% | -0.056% | 0 |
| midlength\|swallow\|soft | 51.6232 | 51.6232 | ±0.0000 | -0.070% | -0.055% | 0 |
| midlength\|diamond\|hard | 50.9890 | 50.9911 | +0.0021 | -0.046% | -0.033% | 0 |
| midlength\|diamond\|soft | 50.9506 | 50.9528 | +0.0021 | -0.046% | -0.033% | 0 |
| midlength\|pin\|hard | 49.4036 | 49.4036 | +0.0000 | -0.044% | -0.027% | 0 |
| midlength\|pin\|soft | 49.3656 | 49.3656 | +0.0000 | -0.046% | -0.029% | 0 |
| midlength\|round\|hard | 49.4036 | 49.4036 | +0.0000 | -0.044% | -0.027% | 0 |
| midlength\|round\|soft | 49.3656 | 49.3656 | +0.0000 | -0.046% | -0.029% | 0 |
| longboard\|asis\|hard | 74.5783 | 74.5783 | ±0.0000 | -0.052% | -0.046% | 0 |
| longboard\|asis\|soft | 73.6222 | 73.6222 | ±0.0000 | -0.057% | -0.051% | 0 |
| longboard\|swallow\|hard | 75.1306 | 75.1306 | ±0.0000 | -0.055% | -0.043% | 0 |
| longboard\|swallow\|soft | 74.1782 | 74.1782 | ±0.0000 | -0.061% | -0.047% | 0 |
| longboard\|diamond\|hard | 74.2552 | 74.2585 | +0.0033 | -0.054% | -0.045% | 0 |
| longboard\|diamond\|soft | 73.3029 | 73.3104 | +0.0075 | -0.059% | -0.050% | 0 |
| longboard\|pin\|hard | 69.9384 | 69.9985 | +0.0602 | -0.044% | -0.037% | 0 |
| longboard\|pin\|soft | 68.9873 | 69.1224 | +0.1351 | -0.037% | -0.029% | 0 |
| longboard\|round\|hard | 69.9384 | 69.9985 | +0.0602 | -0.044% | -0.037% | 0 |
| longboard\|round\|soft | 68.9873 | 69.1224 | +0.1351 | -0.037% | -0.029% | 0 |
| aligned\|shortboard\|hard | 29.5704 | 29.5766 | +0.0063 | -0.045% | -0.043% | 0 |
| aligned\|shortboard\|soft | 29.5317 | 29.5380 | +0.0064 | -0.045% | -0.043% | 0 |
| aligned\|fish\|hard | 34.6973 | 34.6992 | +0.0019 | -0.058% | -0.039% | 0 |
| aligned\|fish\|soft | 34.6650 | 34.6669 | +0.0019 | -0.058% | -0.039% | 0 |
| aligned\|midlength\|hard | 49.4455 | 49.4455 | +0.0000 | -0.044% | -0.027% | 0 |
| aligned\|midlength\|soft | 49.4160 | 49.4161 | +0.0000 | -0.045% | -0.028% | 0 |
| aligned\|longboard\|hard | 74.6295 | 74.6295 | ±0.0000 | -0.052% | -0.046% | 0 |
| aligned\|longboard\|soft | 73.7327 | 73.7327 | ±0.0000 | -0.057% | -0.051% | 0 |
| stock\|hard | 30.2886 | 30.2906 | +0.0019 | -0.047% | -0.044% | 0 |
| stock\|soft | 30.2566 | 30.2586 | +0.0019 | -0.046% | -0.044% | 0 |
| tucked\|shortboard\|tail-sbt | 29.5745 | 29.5805 | +0.0061 | -0.044% | -0.042% | 0 |
| tucked\|shortboard\|tail-single | 29.5523 | 29.5584 | +0.0061 | -0.045% | -0.043% | 0 |
| tucked\|shortboard\|he-centre-sbt | 29.6170 | 29.6230 | +0.0060 | -0.044% | -0.042% | 0 |
| tucked\|shortboard\|nose-sbt | 29.6117 | 29.6177 | +0.0060 | -0.045% | -0.043% | 0 |
| tucked\|shortboard\|nose-single | 29.5923 | 29.5984 | +0.0062 | -0.045% | -0.043% | 0 |
| tucked\|shortboard\|centre-single-sbt | 29.5852 | 29.5912 | +0.0060 | -0.045% | -0.043% | 0 |
| tucked\|fish\|tail-sbt | 34.6165 | 34.6186 | +0.0021 | -0.058% | -0.039% | 0 |
| tucked\|fish\|tail-single | 34.5948 | 34.5969 | +0.0021 | -0.058% | -0.039% | 0 |
| tucked\|fish\|he-centre-sbt | 34.6509 | 34.6530 | +0.0021 | -0.058% | -0.039% | 0 |
| tucked\|fish\|nose-sbt | 34.6496 | 34.6516 | +0.0021 | -0.058% | -0.039% | 0 |
| tucked\|fish\|nose-single | 34.6171 | 34.6192 | +0.0021 | -0.059% | -0.040% | 0 |
| tucked\|fish\|centre-single-sbt | 34.6232 | 34.6253 | +0.0021 | -0.058% | -0.039% | 0 |
| tucked\|midlength\|tail-sbt | 49.3673 | 49.3673 | +0.0000 | -0.045% | -0.028% | 0 |
| tucked\|midlength\|tail-single | 49.3429 | 49.3429 | +0.0000 | -0.046% | -0.029% | 0 |
| tucked\|midlength\|he-centre-sbt | 49.4086 | 49.4086 | +0.0000 | -0.044% | -0.027% | 0 |
| tucked\|midlength\|nose-sbt | 49.4050 | 49.4050 | +0.0000 | -0.044% | -0.027% | 0 |
| tucked\|midlength\|nose-single | 49.3626 | 49.3626 | +0.0000 | -0.045% | -0.027% | 0 |
| tucked\|midlength\|centre-single-sbt | 49.3630 | 49.3631 | +0.0000 | -0.044% | -0.027% | 0 |
| tucked\|longboard\|tail-sbt | 73.6454 | 73.6454 | ±0.0000 | -0.054% | -0.048% | 0 |
| tucked\|longboard\|tail-single | 73.2431 | 73.2431 | ±0.0000 | -0.058% | -0.053% | 0 |
| tucked\|longboard\|he-centre-sbt | 74.7139 | 74.7139 | ±0.0000 | -0.043% | -0.038% | 0 |
| tucked\|longboard\|nose-sbt | 73.6373 | 73.6373 | ±0.0000 | -0.053% | -0.046% | 0 |
| tucked\|longboard\|nose-single | 73.1575 | 73.1575 | ±0.0000 | -0.061% | -0.056% | 0 |
| tucked\|longboard\|centre-single-sbt | 72.6470 | 72.6470 | ±0.0000 | -0.050% | -0.044% | 0 |
| wing\|shortboard\|one | 29.5628 | 29.5772 | +0.0144 | -0.026% | -0.031% | 0 |
| wing\|shortboard\|two | 29.5273 | 29.5478 | +0.0206 | -0.010% | -0.017% | 0 |
| wing\|shortboard\|deep | 29.3688 | 29.4167 | +0.0479 | -0.019% | -0.022% | 0 |
| wing\|shortboard\|square | 29.5160 | 29.5385 | +0.0225 | -0.008% | -0.025% | 0 |
| wing\|shortboard\|rounded | 29.4768 | 29.5060 | +0.0293 | 0.007% | 0.000% | 0 |
| wing\|shortboard\|infade | 29.5085 | 29.5323 | +0.0238 | -0.066% | -0.065% | 0 |
| wing\|shortboard\|one-soft | 29.5241 | 29.5388 | +0.0147 | -0.026% | -0.030% | 0 |
| wing\|fish\|one | 34.5980 | 34.6078 | +0.0098 | -0.058% | -0.042% | 0 |
| wing\|fish\|two | 34.5646 | 34.5796 | +0.0150 | -0.058% | -0.042% | 0 |
| wing\|fish\|deep | 34.3792 | 34.4231 | +0.0439 | -0.052% | -0.035% | 0 |
| wing\|fish\|square | 34.5381 | 34.5573 | +0.0191 | -0.032% | -0.020% | 0 |
| wing\|fish\|rounded | 34.5160 | 34.5386 | +0.0226 | -0.069% | -0.049% | 0 |
| wing\|fish\|infade | 34.5130 | 34.5360 | +0.0230 | -0.048% | -0.031% | 0 |
| wing\|fish\|one-soft | 34.5656 | 34.5755 | +0.0099 | -0.058% | -0.041% | 0 |
| wing\|midlength\|one | 49.3527 | 49.3629 | +0.0102 | -0.043% | -0.027% | 0 |
| wing\|midlength\|two | 49.3221 | 49.3384 | +0.0163 | -0.049% | -0.033% | 0 |
| wing\|midlength\|deep | 49.1352 | 49.1889 | +0.0537 | -0.043% | -0.029% | 0 |
| wing\|midlength\|square | 49.3041 | 49.3240 | +0.0199 | -0.058% | -0.033% | 0 |
| wing\|midlength\|rounded | 49.2633 | 49.2914 | +0.0281 | -0.036% | -0.022% | 0 |
| wing\|midlength\|infade | 49.2811 | 49.3057 | +0.0245 | -0.063% | -0.043% | 0 |
| wing\|midlength\|one-soft | 49.3147 | 49.3250 | +0.0103 | -0.044% | -0.028% | 0 |
| wing\|longboard\|one | 73.5577 | 73.5749 | +0.0172 | -0.042% | -0.041% | 0 |
| wing\|longboard\|two | 73.5197 | 73.5471 | +0.0274 | -0.040% | -0.039% | 0 |
| wing\|longboard\|deep | 73.3693 | 73.4368 | +0.0675 | -0.103% | -0.085% | 0 |
| wing\|longboard\|square | 73.4826 | 73.5199 | +0.0373 | -0.012% | -0.021% | 0 |
| wing\|longboard\|rounded | 73.4821 | 73.5195 | +0.0374 | -0.064% | -0.057% | 0 |
| wing\|longboard\|infade | 73.4768 | 73.5155 | +0.0388 | -0.046% | -0.045% | 0 |
| wing\|longboard\|one-soft | 73.5577 | 73.5749 | +0.0172 | -0.042% | -0.041% | 0 |

14 of 102 bit-identical.

## The surface report on the 102 test boards

```
surface report: 102 saved boards; 102 open; 88 whose litres move
longboard|pin|soft: no wings · pin tail — 68.99 → 69.12 L (+0.1351)
longboard|round|soft: no wings · round tail — 68.99 → 69.12 L (+0.1351)
wing|longboard|deep: 1 wing · squash tail — 73.37 → 73.44 L (+0.0675)
longboard|pin|hard: no wings · pin tail — 69.94 → 70.00 L (+0.0602)
longboard|round|hard: no wings · round tail — 69.94 → 70.00 L (+0.0602)
wing|midlength|deep: 1 wing · round tail — 49.14 → 49.19 L (+0.0537)
wing|shortboard|deep: 1 wing · squash tail — 29.37 → 29.42 L (+0.0479)
wing|fish|deep: 1 wing · swallow tail — 34.38 → 34.42 L (+0.0439)
fish|pin|soft: no wings · pin tail — 31.84 → 31.88 L (+0.0391)
fish|round|soft: no wings · round tail — 31.84 → 31.88 L (+0.0391)
wing|longboard|infade: 1 wing · squash tail — 73.48 → 73.52 L (+0.0388)
wing|longboard|rounded: 1 wing · squash tail — 73.48 → 73.52 L (+0.0374)
fish|pin|hard: no wings · pin tail — 31.87 → 31.91 L (+0.0373)
fish|round|hard: no wings · round tail — 31.87 → 31.91 L (+0.0373)
wing|longboard|square: 1 wing · squash tail — 73.48 → 73.52 L (+0.0373)
wing|shortboard|rounded: 1 wing · squash tail — 29.48 → 29.51 L (+0.0293)
wing|midlength|rounded: 1 wing · round tail — 49.26 → 49.29 L (+0.0281)
wing|longboard|two: 2 wings · squash tail — 73.52 → 73.55 L (+0.0274)
wing|midlength|infade: 1 wing · round tail — 49.28 → 49.31 L (+0.0245)
wing|shortboard|infade: 1 wing · squash tail — 29.51 → 29.53 L (+0.0238)
wing|fish|infade: 1 wing · swallow tail — 34.51 → 34.54 L (+0.0230)
wing|fish|rounded: 1 wing · swallow tail — 34.52 → 34.54 L (+0.0226)
wing|shortboard|square: 1 wing · squash tail — 29.52 → 29.54 L (+0.0225)
wing|shortboard|two: 2 wings · squash tail — 29.53 → 29.55 L (+0.0206)
wing|midlength|square: 1 wing · round tail — 49.30 → 49.32 L (+0.0199)
wing|fish|square: 1 wing · swallow tail — 34.54 → 34.56 L (+0.0191)
shortboard|pin|soft: no wings · pin tail — 28.73 → 28.75 L (+0.0179)
shortboard|round|soft: no wings · round tail — 28.73 → 28.75 L (+0.0179)
wing|longboard|one: 1 wing · squash tail — 73.56 → 73.57 L (+0.0172)
wing|longboard|one-soft: 1 wing · squash tail — 73.56 → 73.57 L (+0.0172)
shortboard|pin|hard: no wings · pin tail — 28.77 → 28.79 L (+0.0170)
shortboard|round|hard: no wings · round tail — 28.77 → 28.79 L (+0.0170)
wing|midlength|two: 2 wings · round tail — 49.32 → 49.34 L (+0.0163)
wing|fish|two: 2 wings · swallow tail — 34.56 → 34.58 L (+0.0150)
wing|shortboard|one-soft: 1 wing · squash tail — 29.52 → 29.54 L (+0.0147)
wing|shortboard|one: 1 wing · squash tail — 29.56 → 29.58 L (+0.0144)
wing|midlength|one-soft: 1 wing · round tail — 49.31 → 49.33 L (+0.0103)
wing|midlength|one: 1 wing · round tail — 49.35 → 49.36 L (+0.0102)
wing|fish|one-soft: 1 wing · swallow tail — 34.57 → 34.58 L (+0.0099)
wing|fish|one: 1 wing · swallow tail — 34.60 → 34.61 L (+0.0098)
shortboard|diamond|soft: no wings · diamond tail — 30.14 → 30.15 L (+0.0088)
shortboard|diamond|hard: no wings · diamond tail — 30.18 → 30.19 L (+0.0086)
longboard|diamond|soft: no wings · diamond tail — 73.30 → 73.31 L (+0.0075)
aligned|shortboard|soft: no wings · squash tail — 29.53 → 29.54 L (+0.0064)
aligned|shortboard|hard: no wings · squash tail — 29.57 → 29.58 L (+0.0063)
tucked|shortboard|nose-single: no wings · squash tail — 29.59 → 29.60 L (+0.0062)
tucked|shortboard|tail-single: no wings · squash tail — 29.55 → 29.56 L (+0.0061)
shortboard|asis|soft: no wings · squash tail — 29.57 → 29.58 L (+0.0061)
tucked|shortboard|tail-sbt: no wings · squash tail — 29.57 → 29.58 L (+0.0061)
shortboard|asis|hard: no wings · squash tail — 29.61 → 29.62 L (+0.0060)
tucked|shortboard|he-centre-sbt: no wings · squash tail — 29.62 → 29.62 L (+0.0060)
tucked|shortboard|centre-single-sbt: no wings · squash tail — 29.59 → 29.59 L (+0.0060)
tucked|shortboard|nose-sbt: no wings · squash tail — 29.61 → 29.62 L (+0.0060)
shortboard|swallow|hard: no wings · swallow tail — 30.63 → 30.64 L (+0.0047)
shortboard|swallow|soft: no wings · swallow tail — 30.60 → 30.60 L (+0.0047)
fish|diamond|soft: no wings · diamond tail — 34.04 → 34.05 L (+0.0038)
fish|diamond|hard: no wings · diamond tail — 34.07 → 34.08 L (+0.0037)
longboard|diamond|hard: no wings · diamond tail — 74.26 → 74.26 L (+0.0033)
midlength|diamond|soft: no wings · diamond tail — 50.95 → 50.95 L (+0.0021)
tucked|fish|nose-single: no wings · swallow tail — 34.62 → 34.62 L (+0.0021)
midlength|diamond|hard: no wings · diamond tail — 50.99 → 50.99 L (+0.0021)
fish|asis|soft: no wings · swallow tail — 34.62 → 34.62 L (+0.0021)
fish|swallow|soft: no wings · swallow tail — 34.62 → 34.62 L (+0.0021)
tucked|fish|tail-sbt: no wings · swallow tail — 34.62 → 34.62 L (+0.0021)
tucked|fish|tail-single: no wings · swallow tail — 34.59 → 34.60 L (+0.0021)
tucked|fish|centre-single-sbt: no wings · swallow tail — 34.62 → 34.63 L (+0.0021)
fish|asis|hard: no wings · swallow tail — 34.65 → 34.65 L (+0.0021)
fish|swallow|hard: no wings · swallow tail — 34.65 → 34.65 L (+0.0021)
tucked|fish|he-centre-sbt: no wings · swallow tail — 34.65 → 34.65 L (+0.0021)
tucked|fish|nose-sbt: no wings · swallow tail — 34.65 → 34.65 L (+0.0021)
stock|hard: no wings · squash tail — 30.29 → 30.29 L (+0.0019)
stock|soft: no wings · squash tail — 30.26 → 30.26 L (+0.0019)
aligned|fish|hard: no wings · swallow tail — 34.70 → 34.70 L (+0.0019)
aligned|fish|soft: no wings · swallow tail — 34.66 → 34.67 L (+0.0019)
tucked|midlength|tail-single: no wings · round tail — 49.34 → 49.34 L (+0.0000)
midlength|asis|soft: no wings · round tail — 49.37 → 49.37 L (+0.0000)
midlength|pin|soft: no wings · pin tail — 49.37 → 49.37 L (+0.0000)
midlength|round|soft: no wings · round tail — 49.37 → 49.37 L (+0.0000)
tucked|midlength|tail-sbt: no wings · round tail — 49.37 → 49.37 L (+0.0000)
tucked|midlength|he-centre-sbt: no wings · round tail — 49.41 → 49.41 L (+0.0000)
midlength|asis|hard: no wings · round tail — 49.40 → 49.40 L (+0.0000)
midlength|pin|hard: no wings · pin tail — 49.40 → 49.40 L (+0.0000)
midlength|round|hard: no wings · round tail — 49.40 → 49.40 L (+0.0000)
tucked|midlength|centre-single-sbt: no wings · round tail — 49.36 → 49.36 L (+0.0000)
tucked|midlength|nose-sbt: no wings · round tail — 49.40 → 49.41 L (+0.0000)
tucked|midlength|nose-single: no wings · round tail — 49.36 → 49.36 L (+0.0000)
aligned|midlength|soft: no wings · round tail — 49.42 → 49.42 L (+0.0000)
aligned|midlength|hard: no wings · round tail — 49.45 → 49.45 L (+0.0000)
largest move: longboard|pin|soft, +0.1351 L
```

The founder's production command (in the script's header, in the form his terminal accepts; never run here):

```
npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --surface-report; rm -f .env.production.pull
```

## Proofs

- **Pins:** the 40-board pin (`HARD_EDGE_SWITCH`), the 74-board pin (`HARD_EDGE_FADE`, its live case now
  `RAIL_CHARACTER_FADE` by name) and the new 102-board pin (`RAIL_CHARACTER_FADE`) all reproduce bit for bit. Under the live
  rule 14 of the 102 are bit-identical: exactly the boards with no wing and no narrow litres station, worked out in the test
  from `railReach`. The generator now refuses to run (exit 1). The pin's commit, 175c3eed, does not touch `volume.ts`.
- **D-33:** all 28 winged boards, stations every 2 mm from each wing to the tail: deck within 0.01 mm of the wing-less
  board out to Deck Mark 3 and the old rule more than 0.1 mm off it; outermost point on the stepped outline within 1e-9 mm;
  rail within 0.75 mm (2.5 mm on a 1" wing) of its shape; no fold; bottom at 0 out to Deck Mark 3; the tuck behaviours;
  stations the wing doesn't reach unchanged (`Object.is`). All 28 watertight, within ±0.15% of VOLUME's litres, outline
  within 0.1 mm of TEMPLATE around each wing.
- **D-34:** all 102 boards, every tip: deck and bottom on the side profile within 0.01 mm and turning with it within 0.1°;
  no-width tips one edge with no cap; a tail end with width keeps its cap; watertight; slice count equal to the litres
  stations with foam; the outline's tip between the tip's bottom and deck; stringer lines run up and down the edge.
- **Preset figures:** `phase14-preset-figures.json` regenerated; only three `litres` lines changed (Shortboard
  29.6117 → 29.6177, Fish 34.6476 → 34.6497, Mid-length 49.40355 → 49.40358).
- **Unit suite:** `npm test` 8904 passed, 2 skipped, 1 load timeout (`rack-stand-in`'s 1-to-100 sweep, 34 of 34 pass alone
  in 17 s, as the orchestrator's ruling 12 expected). `npx tsc --noEmit` clean; `npm run lint` clean bar the one pre-existing
  warning in `lib/db/import-designs-action.test.ts`.
- **Browser specs (port 3216, webpack):** `three-d` 97 passed, 41 skipped by design, on all three projects;
  `desktop-baseline` 6 passed on desktop; VOLUME still 30.29 L.
- **Nothing stored:** no change to `drizzle/`, `lib/db/schema.ts`, `lib/models/design-snapshot.ts`, `components/`, `app/`,
  the writers under `lib/export/`, `lib/models/rail-character-report.ts`, or the 40- and 74-board pin JSONs and generators.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in the plan's formula] The ease's reach inside a blend**
- **Found during:** Task 1
- **Issue:** the plan passed `result.deckMark3`, which inside a blend is the base rail's. Where the tail's rail takes over
  at Blends From, the ease's reach would have jumped from the centre's Deck Mark 3 to the tail's, leaving a small new step
  in the rail on a wing inside the fade.
- **Fix:** inside a blend the reach is the two rails' Deck Mark 3 carried by the blend's own weight. Deck tests read the
  larger of the two.
- **Files:** lib/geometry/volume.ts, lib/geometry/volume.test.ts · **Commit:** cc85b9c3

**2. [Rule 3 - Blocking] `lib/geometry/tail-cut.test.ts`, outside `files_modified`**
- **Issue:** its swallow case says the notch removes exactly its wall's foam. A narrow station now also counts its fitted
  ring (Q3), so the plain wall arithmetic no longer holds under the live rule.
- **Fix:** that one case reads `RAIL_CHARACTER_FADE` by name, with a comment. No expected figure changed.
- **Commit:** f106747a

**3. [Rule 1] Three of the plan's test bounds restated from what the boards do**
- The "proven to see what it fixes" check (a cut rail stands 0.1 mm under the deck) is asked of rings at or under 3/4 of the
  rail's reach, not every narrow ring: a ring a hair under the reach stands only a hair under the deck.
- The side-view relation "the deck is `deckAt` at every ring" reads 0.01 mm, not 1e-6 mm: a station with barely room for its
  rail is cut between two of the finished curve's samples, 0.0008 mm off on the Longboard's pin.
- The Longboard's tuck reads as much as 0.01 mm the other way (outline points sampled at different stations), so its
  bound is `> −0.05 mm`, the plan's own 0.05 mm, not `≥ 0`.

**4. [Rule 1] The outline's tip point**
- "Nearest in height to the neighbouring ring" alone picked the bottom vertex on a steep nose (the next ring's widest point
  sits below the tip's bottom), which broke the plan's own "strictly between". It now picks the nearest of the edge's
  inner vertices.

**5. [Rule 2] Two small additions the plan didn't list**
- `finishedRailReach(rail, boardThickness)` is exported beside `railReach`, so a litres station doesn't build its finished
  rail twice. `sampledFinishedRail`'s split and resample moved to a private helper both functions share; its output is
  proven unchanged by all three pins.
- `boardSectionEnds` now reads the live rule's fit (it says it gives the live rule's ends).

**6. The 3D reference picture did not fail, and the diff is not only the tips — for the orchestrator's eye**
- `three-d-desktop` passed unchanged under the config's `maxDiffPixels: 100`, so old and new were compared by hand at
  tolerance 0: 11892 pixels differ, only 10 of them by more than 50 of 255, all ten at the nose tip. The rest is a sub-pixel
  hairline along the rails and the stringer: the taller tip grows the board's height, the camera frames the board by its
  points, and the whole board sits a fraction of a pixel differently. Ruling 4 allows the re-record "after a diff proves
  nothing changed but the board's two tips"; strictly this diff shows the tips plus that framing, which follows from them.
  It is re-recorded, as the plan's output asks and as the 2026-11-02 block's tolerance-0 precedent did, with this written in
  its RE-RECORDED block. If you would rather keep the old file, it passes too: restore it and drop the block.

**7. Pictures** use 16-03's headless harness with the app's own Contour Stripes shader (copied into the scratch page), so the
close-ups sit at exact cameras. An extra low-light row was added to the wing picture, because that is the view his own
picture was. Nothing else was added.

### Other notes

- Task 2 is `tdd="true"`, but the orchestrator's ruling is one commit per task, so its tests and code share one commit (no
  separate RED commit).
- `board-surface-render.test.ts` needed no change.

## Known limitations (left alone on purpose)

- The litres' 51 stations do not land on a wing's step; Simpson's rule straddles it as it always has (inside the band
  above).
- The domed deck's 1/16" rounding of the rail-side thickness (16-15's filed to-do) is untouched.
- A square step's two rings stand 1e-6" apart, finer than the STL's float32 numbers at some stations (about 30" from the
  tail on one test board): there a strip of 90 triangles collapses to a line. The skin stays closed when welded (checked at
  11", 21", 22", 26", 30" and 34"), and the outline and slice files read doubles, so nothing is lost.

## Threat Flags

None beyond the plan's register: the report adds no write path and prints ids, wing counts, tail kinds and litres only
(tested with a board named "Chris's Secret Fish").

## Self-Check: PASSED

- Files: the pin, its generator and test, the report and its test, the three pictures and the archive all exist.
- Commits: 175c3eed (the pin alone), cc85b9c3, f106747a.
- No change to STATE.md, ROADMAP.md, lib/export/'s writers or components/; of the six desktop pictures only three-d-desktop
  changed.

## Founder's look

Pending — presented by the orchestrator at the Wave 11 checkpoint.
