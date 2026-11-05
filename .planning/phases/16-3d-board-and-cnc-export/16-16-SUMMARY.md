---
phase: 16-3d-board-and-cnc-export
plan: 16
subsystem: geometry (the section rule behind the litres, the 3D board and the CNC files), preset figures, saved-boards report
status: complete
tags: [geometry, volume, wings, tails, rails, 3d, cnc, report, D-05, D-31, D-33, D-34, D-37, D-38, D-39, D-41]
requires:
  - "16-15: RAIL_CHARACTER_FADE, SectionRule, boardSectionsWith, fadingSectionArea, the 74-board pin, the report idiom"
  - "16-05: the CNC writers, boardSlices, boardOutlineLoop, a swallow's two pieces"
  - "16-03: buildBoardSurface, placedHalfSection, surfaceStations, D-31's level variant, the headless picture harness"
provides:
  - "lib/geometry/volume.ts: SurfaceFit (wings, tips, tail, tuck, rail), OLD_SURFACE_FIT, SMOOTH_SURFACE_FADE (the live rule), wingStepHalf, tailRollDrop, tailRollScale, tailRollStations, tailRollFoam; BoardSection.drawn and .rollScale; CrossSectionVolumeInput.wingShareAt; CrossSectionVolumeResult.tailRollMm3"
  - "lib/geometry/wings.ts: wingShareAt, wingShareSpan, WING_SHARE_REACH_IN, wingTakeAt, WING_HAIR_MM; applyWings records the placed wings; OutlineGeometry.wings"
  - "lib/geometry/finished-rail.ts: finishedRailReach, railReach, fittedFinishedRail, openedFinishedRail"
  - "lib/geometry/__fixtures__/phase16-boards.ts: phase16WingBoards (28), phase16SurfaceBoards (102)"
  - "lib/geometry/__fixtures__/phase16-surface-litres-pin.json + scripts/extract-phase16-surface-litres-pin.ts (refuses to re-run) + lib/geometry/phase16-surface-litres-pin.test.ts"
  - "lib/models/surface-report.ts: surfaceLitresMove, surfaceReportLines; scripts/check-saved-boards.ts --surface-report"
affects: [16-13, 16-17]
tech-stack:
  added: []
  patterns:
    - "A rule carries how it fits the board (`fit`); a rule with no fit, and every old rule, runs the old arithmetic operation for operation"
    - "A drawn half that isn't the plain sampled one lives on the section (`BoardSection.drawn`), and the litres count it as the level variant"
    - "A shape too small for the 51 stations to see is counted once, exactly, off the whole board (`tailRollFoam`)"
    - "A third refusing pin generator, committed alone before the rule changed"
key-files:
  created:
    - scripts/extract-phase16-surface-litres-pin.ts
    - lib/geometry/__fixtures__/phase16-surface-litres-pin.json
    - lib/geometry/phase16-surface-litres-pin.test.ts
    - lib/models/surface-report.ts
    - lib/models/surface-report.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-midlength-smooth.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-as-built.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-sharp-tuck.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-wing-share-candidates.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-tail-roll-candidates.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-fades.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-16-lip-candidates.png
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
    - e2e/rails-advanced.spec.ts
    - e2e/three-d-hard-edge.spec.ts
decisions:
  - "D-37, the founder's pick: a wing's two sides share the step 3\" each way, half and half at the wing, and the rail rolls straight up into the deck (amends D-33's ease out to Deck Mark 3)"
  - "D-38, the founder's pick: the tail's rail is carried around its end, a third of the tip's thickness over the last inch, its foam counted exactly (amends D-34 at the tail; the nose stays)"
  - "D-39, the founder's pick: the fades are kept as they are; measured, both rails already move half and half inside a fade"
  - "The founder, 2026-11-05: a sharp tuck opens into a round one; built, and it reaches hard-edged tails, changing 16-15's fade there"
  - "D-41, the founder: \"Lets keep actual dimensions for the board record itself. We ONLY want to round to a 1/16\" when we output/display data\""
  - "The founder: no lip rule and no added corner radius; a square wing's step stays as built"
metrics:
  duration: "two days of rounds, with the founder's looks between"
  completed: 2026-11-05
estimate:
  tokens: 150000
actuals:
  tokens: 45000
  tasks: 2
  commits: 9
---

# Phase 16 Plan 16: The Wing, the Tail, the Tuck and a Smooth Rail Summary

A wing's two sides now share its step over 3" each way, with the rail rolling straight up into the deck. The tail's rail
is carried around its end. A sharp tuck opens into a round one with no small kink. The board is built from its actual
rail thickness, so the Mid-length's rail runs smooth. Every litres figure counts what the 3D board draws.

**The standing rule, in the founder's words (D-41):** "Lets keep actual dimensions for the board record itself. We ONLY
want to round to a 1/16" when we output/display data as that is really the closest a pencil mark is going to get you in
real life. But, the actual board will certainly blend and have values smaller than 1/16""

## What changes for the founder

- **The wing.** "Wings should be steps in the outline." Behind a wing the rail stands a little thicker and ahead of it a
  little thinner, and they meet at the wing with half the step each, easing away over 3" each way. The rail then rolls
  straight up into the deck at its own tight curve, joining it at the larger of Deck Mark 2 and twice the move. This
  replaces the first build's ease out to Deck Mark 3 (D-37, his red line). The roll comes to within about 2 mm of his line
  on the way down. The flat bottom stays flat and the tuck moves with the rail. Both 3D and the CNC outline step exactly
  where TEMPLATE does.
- **A square wing's step stays as built.** The founder ruled there is no lip rule and no added corner radius: "There's
  already a corner radius to turn the sharp wing into a bump (outline shape)". Nothing was built from the lip candidates.
- **The tail.** "The rail at the tail of the board can be carried around the tip." On every tail type the deck rolls
  over into the tail's edge, a third of the tip's thickness over the last inch, along a quarter ellipse. The bottom stays
  exactly on the rocker. The nose stays as built in D-34: it ends on the side profile's own tip with no flip.
- **The tuck.** "Just also make sure that a sharp tuck can blend into a round tuck nicely." A sharp bottom edge fading into
  a round one used to keep a real corner in every slice, its angle shrinking. Now the corner opens into a radius that grows
  along the blend. **This also reaches hard-edged tails, so it changes 16-15's fade wherever one end is sharp and the
  other round.** Two sharp ends stay sharp.
- **The Mid-length's rail.** The waves are gone. The rail's thickness was being rounded to the nearest 1/16" at every
  station along a domed deck, which stepped the rail about 25 times. The 3D board, the CNC files and the litres now use the
  actual thickness. RAILS, the DATA tab and the order form still read to the 1/16", digit for digit.
- **The fades.** Kept as they are (D-39). Measured, both rails already move half and half inside a fade.
- **The litres.** Cards at go-live 2: Shortboard 29.61, Fish 34.65, Mid-length 49.40, Longboard 72.39 (72.35 on the site
  today), Stock 6'0" 30.29. Winged boards and pin or round tails move a little more (tables below). Nothing on screen says
  the litres moved. His Q3 card of 29.62 for the Shortboard is replaced: the tail's roll takes it back to 29.61.
- **For go-live 2.** A read-only report lists every saved board, because the roll reaches them all: what the site reads
  today, what it will read, and this plan's share. The rail-character report still lists only the boards the fade reaches,
  with its reasons; its "after" is the live rule, so it includes this plan's moves too.

## Pictures

- `pictures/16-16-midlength-smooth.png`: the Mid-length, whole board and near the wing, low light and Contour Stripes,
  before and now.
- `pictures/16-16-as-built.png`: the three wings and five tails as built.
- `pictures/16-16-sharp-tuck.png`: the tuck's slices through a sharp-to-round blend, before and now, and the bottom view.
- `pictures/16-16-wing-share-candidates.png`, `16-16-tail-roll-candidates.png`, `16-16-fades.png`,
  `16-16-lip-candidates.png`: the plates he chose from. The lip plate is a record only; nothing came of it.
- `pictures/16-16-wing-before-after.png`, `16-16-wing-slice.png`, `16-16-tips-before-after.png`: the first build, kept as
  the record of what he marked up. The wing and tail in them are superseded.

## The cause of the Mid-length's waves, proved

A step scan along the board at every 1/8": the sharpest bend in each line, in mm, and how many places bend by more than
0.05 mm. The cause was found by turning the rounding off in a scratch copy with nothing else changed, then building that.

| Board | Line | Rounded: sharpest bend | Rounded: bends over 0.05 | Actual: sharpest bend | Actual: bends over 0.05 |
|---|---|---:|---:|---:|---:|
| Mid-length | Deck 1" in | 0.986 | 92 | 0.030 | 0 |
| Mid-length | Deck 2" in | 0.843 | 92 | 0.023 | 0 |
| Mid-length | Deck 3" in | 0.691 | 88 | 0.017 | 0 |
| Mid-length with the rounded wing | Deck 1" in | 0.986 | 97 | 0.533 at 11" | 6 |

- The 0.030 left at 43" is the centre, where Deck Profile's straight blend changes slope. It matches the other presets'
  own figures (Shortboard 0.030, Fish 0.012, Longboard 0.008).
- The 0.533 left on the winged board is the wing's own step at 11", which is meant to be there. Six stations around it are
  the only ones over 0.05.
- Nothing else was found: not the wing's reach, the deck's hand-over, the station spacing or the surface's sampling. With
  the rounding gone the low-light views read smooth.
- The presets with a flat deck are bit-identical either way. The Mid-length is the only domed preset.

**The 1/16" floors (the coordinator's check).** Rail marks are held at 1/16" in `rail-bands.ts`. Only two floors bite along
a board: Bottom Tuck 2 at 1/16", and Bottom Tuck 3 at 1/16" past Bottom Tuck 1. Lifting both in a scratch copy moves 727 of
24,215 rings, at most 0.44 mm (the stock board's tail at 0.38"), and changes no bend the scan can see. They are not a
cause of anything he saw, so they stay, as his own rulings R9, PC4, PC5 and PC26.

**Also still rounded.** The standalone estimator's Cross-Section Thickness rows read `computeRailBands`, so they stay on the
1/16". They are not the board and not the quoted litres when importing the template, and DATA must stay digit for digit.
If D-41 should reach those rows, that is a separate small change. `rail-bands.ts` was not touched by this plan.

## The wing's measures

Reach picked: 3" each way. In mm, against the same board with no wing, at the moment of his pick (the rail rule since
changed only the Mid-length, by a hair at this scale).

| Board | Ledge across the wing at 1" / 2" / 3" in, first build | Now |
|---|---:|---:|
| Shortboard default wing | 0.67 / 0.06 / 0 | 0.12 / 0.09 / 0.03 |
| Mid-length rounded 1/2" | 1.96 / 0.26 / 0 | 0.68 / 0.50 / 0.29 |
| Fish square 3/8" | 1.41 / 0.24 / 0 | 0.08 / 0.06 / 0.03 |

All 28 winged boards: no mesh faults, 3D within ±0.15% of VOLUME's litres, litres against the pin −0.0271 to +0.0069.

## The sharp tuck's measures

The sharpest turn in a slice around the tuck, Shortboard, centre to nose (the round rail's own is about 5°):

| Station through the blend | 10% | 25% | 40% | 50% | 60% | 75% | 92% |
|---|---:|---:|---:|---:|---:|---:|---:|
| As it was | 34° | 29° | 22° | 17° | 12° | 6° | 5° |
| Now | 30° | 16° | 12° | 8° | 6° | 5° | 5° |

The corner did not vanish at one station: it shrank until it was smaller than the round rail's own facets, at about 85%
of the blend. The Fish and the tail fades behaved the same, and a hard edge into a round centre went from 90° to 26° at
its middle; now its middle reads the round rail's own 4°.

## The presets as their cards open them, and the stock 6'0"

| Board | Site today (L) | With 16-15's fade alone (L) | Go-live 2 (L) | This plan's share (L) | Card today | Card at go-live 2 |
|---|---:|---:|---:|---:|---:|---:|
| Shortboard | 29.6099 | 29.6117 | 29.6131 | +0.0013 | 29.61 | 29.61 |
| Fish | 34.6514 | 34.6476 | 34.6490 | +0.0014 | 34.65 | 34.65 |
| Mid-length | 49.3974 | 49.4036 | 49.4039 | +0.0003 | 49.40 | 49.40 |
| Longboard | 72.3514 | 72.3963 | 72.3884 | −0.0080 | 72.35 | 72.39 |
| Stock 6'0" | 30.2886 | 30.2886 | 30.2874 | −0.0012 | 30.29 | 30.29 |

## How far the deck sits off the board with no wing, just behind each wing (mm, today is before this plan)

| Board | Wing | 1" in, before | 1" in, now | 2" in, before | 2" in, now | 3" in, before | 3" in, now | half-width, before | half-width, now |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wing\|shortboard\|one | 1 | 1.05 | 0.56 | 0.63 | 0.34 | 0.22 | 0.12 | 0.16 | 0.09 |
| wing\|shortboard\|two | 1 | 1.05 | 0.56 | 0.63 | 0.34 | 0.22 | 0.12 | 0.16 | 0.09 |
| wing\|shortboard\|two | 2 | 1.58 | 1.22 | 0.77 | 0.59 | 0.17 | 0.12 | 0.37 | 0.27 |
| wing\|shortboard\|deep | 1 | 4.60 | 2.72 | 2.25 | 1.19 | 0.56 | 0.23 | 1.62 | 0.81 |
| wing\|shortboard\|square | 1 | 2.01 | 1.00 | 1.17 | 0.57 | 0.40 | 0.18 | 0.38 | 0.17 |
| wing\|shortboard\|rounded | 1 | 2.58 | 1.49 | 1.44 | 0.79 | 0.45 | 0.23 | 0.56 | 0.29 |
| wing\|shortboard\|infade | 1 | 1.22 | 0.64 | 0.84 | 0.46 | 0.49 | 0.26 | 0.17 | 0.09 |
| wing\|shortboard\|one-soft | 1 | 1.05 | 0.56 | 0.62 | 0.33 | 0.22 | 0.12 | 0.16 | 0.08 |
| wing\|fish\|one | 1 | 1.04 | 0.55 | 0.70 | 0.38 | 0.36 | 0.19 | 0.18 | 0.10 |
| wing\|fish\|two | 1 | 1.04 | 0.55 | 0.70 | 0.38 | 0.36 | 0.19 | 0.18 | 0.10 |
| wing\|fish\|two | 2 | 1.54 | 1.20 | 0.92 | 0.71 | 0.33 | 0.25 | 0.25 | 0.18 |
| wing\|fish\|deep | 1 | 4.64 | 2.76 | 2.86 | 1.61 | 1.20 | 0.62 | 1.47 | 0.78 |
| wing\|fish\|square | 1 | 2.00 | 1.00 | 1.35 | 0.67 | 0.68 | 0.32 | 0.40 | 0.19 |
| wing\|fish\|rounded | 1 | 2.56 | 1.48 | 1.70 | 0.97 | 0.81 | 0.44 | 0.56 | 0.30 |
| wing\|fish\|infade | 1 | 1.24 | 0.67 | 0.84 | 0.46 | 0.60 | 0.33 | 0.24 | 0.13 |
| wing\|fish\|one-soft | 1 | 1.04 | 0.56 | 0.70 | 0.38 | 0.36 | 0.19 | 0.17 | 0.09 |
| wing\|midlength\|one | 1 | 1.15 | 0.62 | 0.81 | 0.45 | 0.46 | 0.25 | 0.37 | 0.21 |
| wing\|midlength\|two | 1 | 1.15 | 0.62 | 0.81 | 0.45 | 0.46 | 0.25 | 0.37 | 0.21 |
| wing\|midlength\|two | 2 | 1.72 | 1.35 | 1.09 | 0.86 | 0.47 | 0.38 | 0.72 | 0.58 |
| wing\|midlength\|deep | 1 | 5.25 | 3.19 | 3.47 | 2.04 | 1.70 | 0.95 | 2.81 | 1.63 |
| wing\|midlength\|square | 1 | 2.23 | 1.12 | 1.58 | 0.80 | 0.89 | 0.45 | 0.81 | 0.41 |
| wing\|midlength\|rounded | 1 | 2.90 | 1.67 | 2.06 | 1.18 | 1.13 | 0.62 | 1.21 | 0.67 |
| wing\|midlength\|infade | 1 | 1.34 | 0.73 | 0.96 | 0.52 | 0.73 | 0.39 | 0.37 | 0.20 |
| wing\|midlength\|one-soft | 1 | 1.15 | 0.62 | 0.81 | 0.45 | 0.45 | 0.26 | 0.37 | 0.21 |
| wing\|longboard\|one | 1 | 0.80 | 0.42 | 0.54 | 0.29 | 0.31 | 0.17 | 0.19 | 0.10 |
| wing\|longboard\|two | 1 | 0.80 | 0.42 | 0.54 | 0.29 | 0.31 | 0.17 | 0.19 | 0.10 |
| wing\|longboard\|two | 2 | 1.18 | 0.91 | 0.75 | 0.57 | 0.31 | 0.24 | 0.30 | 0.23 |
| wing\|longboard\|deep | 1 | 3.54 | 2.11 | 2.32 | 1.34 | 1.09 | 0.59 | 1.46 | 0.80 |
| wing\|longboard\|square | 1 | 1.53 | 0.76 | 1.06 | 0.53 | 0.58 | 0.28 | 0.42 | 0.20 |
| wing\|longboard\|rounded | 1 | 1.95 | 1.13 | 1.35 | 0.78 | 0.71 | 0.39 | 0.59 | 0.33 |
| wing\|longboard\|infade | 1 | 0.96 | 0.53 | 0.65 | 0.35 | 0.49 | 0.26 | 0.22 | 0.11 |
| wing\|longboard\|one-soft | 1 | 0.80 | 0.42 | 0.54 | 0.29 | 0.31 | 0.17 | 0.19 | 0.10 |

## The tips, per board and tip (the nose ends on the side profile; every tail rolls over)

| Board | Tip | Corner today | Now | Deck off the side profile today (mm) | Now (mm) | Bottom off the rocker now (mm) |
|---|---|---:|---:|---:|---:|---:|
| shortboard\|asis\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|asis\|hard | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| shortboard\|asis\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|asis\|soft | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| shortboard\|swallow\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|swallow\|hard | swallow point, right | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|swallow\|hard | swallow point, left | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|swallow\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|swallow\|soft | swallow point, right | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|swallow\|soft | swallow point, left | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|diamond\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|diamond\|hard | tail (diamond) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|diamond\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|diamond\|soft | tail (diamond) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|pin\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|pin\|hard | tail (pin) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|pin\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|pin\|soft | tail (pin) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|round\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|round\|hard | tail (round) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| shortboard\|round\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| shortboard\|round\|soft | tail (round) | 40.7° | 18.73° | 11.91 | 7.94 | 0.0000 |
| fish\|asis\|hard | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|asis\|hard | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|asis\|hard | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|asis\|soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|asis\|soft | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|asis\|soft | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|swallow\|hard | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|swallow\|hard | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|swallow\|hard | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|swallow\|soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|swallow\|soft | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|swallow\|soft | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|diamond\|hard | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|diamond\|hard | tail (diamond) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|diamond\|soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|diamond\|soft | tail (diamond) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|pin\|hard | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|pin\|hard | tail (pin) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|pin\|soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|pin\|soft | tail (pin) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|round\|hard | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|round\|hard | tail (round) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| fish\|round\|soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| fish\|round\|soft | tail (round) | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| midlength\|asis\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|asis\|hard | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|asis\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|asis\|soft | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|swallow\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|swallow\|hard | swallow point, right | 36.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|swallow\|hard | swallow point, left | 36.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|swallow\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|swallow\|soft | swallow point, right | 36.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|swallow\|soft | swallow point, left | 36.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|diamond\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|diamond\|hard | tail (diamond) | 33.3° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|diamond\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|diamond\|soft | tail (diamond) | 33.3° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|pin\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|pin\|hard | tail (pin) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|pin\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|pin\|soft | tail (pin) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|round\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|round\|hard | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| midlength\|round\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| midlength\|round\|soft | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| longboard\|asis\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|asis\|hard | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| longboard\|asis\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|asis\|soft | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| longboard\|swallow\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|swallow\|hard | swallow point, right | 38.1° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|swallow\|hard | swallow point, left | 38.1° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|swallow\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|swallow\|soft | swallow point, right | 36.9° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|swallow\|soft | swallow point, left | 36.9° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|diamond\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|diamond\|hard | tail (diamond) | 38.1° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|diamond\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|diamond\|soft | tail (diamond) | 33.9° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|pin\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|pin\|hard | tail (pin) | 38.1° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|pin\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|pin\|soft | tail (pin) | 25.8° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|round\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|round\|hard | tail (round) | 38.1° | 19.20° | 11.11 | 7.41 | 0.0000 |
| longboard\|round\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| longboard\|round\|soft | tail (round) | 25.8° | 19.20° | 11.11 | 7.41 | 0.0000 |
| aligned\|shortboard\|hard | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| aligned\|shortboard\|hard | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| aligned\|shortboard\|soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| aligned\|shortboard\|soft | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| aligned\|fish\|hard | nose | 33.0° | 0.00° | 8.73 | 0.00 | 0.0000 |
| aligned\|fish\|hard | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| aligned\|fish\|hard | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| aligned\|fish\|soft | nose | 33.0° | 0.00° | 8.73 | 0.00 | 0.0000 |
| aligned\|fish\|soft | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| aligned\|fish\|soft | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| aligned\|midlength\|hard | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| aligned\|midlength\|hard | tail (round) | 35.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| aligned\|midlength\|soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| aligned\|midlength\|soft | tail (round) | 35.0° | 22.10° | 9.53 | 6.35 | 0.0000 |
| aligned\|longboard\|hard | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| aligned\|longboard\|hard | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| aligned\|longboard\|soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| aligned\|longboard\|soft | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| stock\|hard | nose | 20.2° | 0.00° | 6.35 | 0.00 | 0.0000 |
| stock\|hard | tail (squash) | 0.0° | 27.05° | 0.00 | 5.29 | 0.0000 |
| stock\|soft | nose | 20.2° | 0.00° | 6.35 | 0.00 | 0.0000 |
| stock\|soft | tail (squash) | 0.0° | 27.05° | 0.00 | 5.29 | 0.0000 |
| tucked\|shortboard\|tail-sbt | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|tail-sbt | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|shortboard\|tail-single | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|tail-single | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|shortboard\|he-centre-sbt | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|he-centre-sbt | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|shortboard\|nose-sbt | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|nose-sbt | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|shortboard\|nose-single | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|nose-single | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|shortboard\|centre-single-sbt | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| tucked\|shortboard\|centre-single-sbt | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| tucked\|fish\|tail-sbt | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|tail-sbt | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|tail-sbt | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|tail-single | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|tail-single | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|tail-single | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|he-centre-sbt | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|he-centre-sbt | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|he-centre-sbt | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|nose-sbt | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|nose-sbt | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|nose-sbt | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|nose-single | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|nose-single | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|nose-single | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|centre-single-sbt | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| tucked\|fish\|centre-single-sbt | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|fish\|centre-single-sbt | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|tail-sbt | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|tail-sbt | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|tail-single | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|tail-single | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|he-centre-sbt | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|he-centre-sbt | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|nose-sbt | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|nose-sbt | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|nose-single | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|nose-single | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|midlength\|centre-single-sbt | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| tucked\|midlength\|centre-single-sbt | tail (round) | 34.9° | 22.10° | 9.53 | 6.35 | 0.0000 |
| tucked\|longboard\|tail-sbt | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|tail-sbt | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| tucked\|longboard\|tail-single | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|tail-single | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| tucked\|longboard\|he-centre-sbt | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|he-centre-sbt | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| tucked\|longboard\|nose-sbt | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|nose-sbt | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| tucked\|longboard\|nose-single | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|nose-single | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| tucked\|longboard\|centre-single-sbt | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| tucked\|longboard\|centre-single-sbt | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|shortboard\|one | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|one | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|two | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|two | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|deep | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|deep | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|square | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|square | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|rounded | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|rounded | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|infade | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|infade | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|shortboard\|one-soft | nose | 18.5° | 0.00° | 5.56 | 0.00 | 0.0000 |
| wing\|shortboard\|one-soft | tail (squash) | 1.2° | 18.73° | 0.30 | 7.94 | 0.0000 |
| wing\|fish\|one | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|one | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|one | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|two | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|two | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|two | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|deep | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|deep | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|deep | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|square | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|square | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|square | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|rounded | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|rounded | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|rounded | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|infade | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|infade | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|infade | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|one-soft | nose | 32.7° | 0.00° | 8.73 | 0.00 | 0.0000 |
| wing\|fish\|one-soft | swallow point, right | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|fish\|one-soft | swallow point, left | 33.1° | 22.16° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|one | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|one | tail (round) | 34.8° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|two | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|two | tail (round) | 34.7° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|deep | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|deep | tail (round) | 34.5° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|square | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|square | tail (round) | 34.7° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|rounded | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|rounded | tail (round) | 34.7° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|infade | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|infade | tail (round) | 34.8° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|midlength\|one-soft | nose | 28.9° | 0.01° | 7.94 | 0.00 | 0.0000 |
| wing\|midlength\|one-soft | tail (round) | 34.8° | 22.10° | 9.53 | 6.35 | 0.0000 |
| wing\|longboard\|one | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|one | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|two | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|two | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|deep | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|deep | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|square | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|square | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|rounded | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|rounded | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|infade | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|infade | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |
| wing\|longboard\|one-soft | nose | 43.1° | 0.00° | 11.11 | 0.00 | 0.0000 |
| wing\|longboard\|one-soft | tail (squash) | 0.0° | 19.20° | 0.00 | 7.41 | 0.0000 |

Now: nose at most 0.012° off the side profile; tails' largest single panel turn 27.1°, spread round the roll; bottom at most 0.0000 mm off the rocker.

## The 102 boards' litres

| Board | Pinned (L) | Now (L) | Move (L) | 3D vs VOLUME, today | 3D vs VOLUME, now | Mesh faults |
|---|---:|---:|---:|---:|---:|---:|
| shortboard\|asis\|hard | 29.6117 | 29.6131 | +0.0013 | -0.045% | -0.042% | 0 |
| shortboard\|asis\|soft | 29.5730 | 29.5748 | +0.0017 | -0.045% | -0.042% | 0 |
| shortboard\|swallow\|hard | 30.6347 | 30.6381 | +0.0033 | -0.059% | -0.037% | 0 |
| shortboard\|swallow\|soft | 30.5964 | 30.5999 | +0.0036 | -0.059% | -0.036% | 0 |
| shortboard\|diamond\|hard | 30.1805 | 30.1882 | +0.0077 | -0.053% | -0.039% | 0 |
| shortboard\|diamond\|soft | 30.1421 | 30.1503 | +0.0082 | -0.052% | -0.038% | 0 |
| shortboard\|pin\|hard | 28.7716 | 28.7879 | +0.0163 | -0.046% | -0.035% | 0 |
| shortboard\|pin\|soft | 28.7332 | 28.7506 | +0.0174 | -0.046% | -0.035% | 0 |
| shortboard\|round\|hard | 28.7716 | 28.7879 | +0.0163 | -0.046% | -0.035% | 0 |
| shortboard\|round\|soft | 28.7332 | 28.7506 | +0.0174 | -0.046% | -0.035% | 0 |
| fish\|asis\|hard | 34.6476 | 34.6490 | +0.0014 | -0.058% | -0.040% | 0 |
| fish\|asis\|soft | 34.6153 | 34.6166 | +0.0013 | -0.058% | -0.039% | 0 |
| fish\|swallow\|hard | 34.6476 | 34.6490 | +0.0014 | -0.058% | -0.040% | 0 |
| fish\|swallow\|soft | 34.6153 | 34.6166 | +0.0013 | -0.058% | -0.039% | 0 |
| fish\|diamond\|hard | 34.0736 | 34.0768 | +0.0032 | -0.057% | -0.041% | 0 |
| fish\|diamond\|soft | 34.0413 | 34.0445 | +0.0032 | -0.056% | -0.040% | 0 |
| fish\|pin\|hard | 31.8718 | 31.9089 | +0.0371 | -0.034% | -0.025% | 0 |
| fish\|pin\|soft | 31.8394 | 31.8783 | +0.0389 | -0.034% | -0.025% | 0 |
| fish\|round\|hard | 31.8718 | 31.9089 | +0.0371 | -0.034% | -0.025% | 0 |
| fish\|round\|soft | 31.8394 | 31.8783 | +0.0389 | -0.034% | -0.025% | 0 |
| midlength\|asis\|hard | 49.4036 | 49.4039 | +0.0003 | -0.044% | -0.025% | 0 |
| midlength\|asis\|soft | 49.3656 | 49.3654 | −0.0002 | -0.046% | -0.025% | 0 |
| midlength\|swallow\|hard | 51.6620 | 51.6513 | −0.0108 | -0.071% | -0.038% | 0 |
| midlength\|swallow\|soft | 51.6232 | 51.6127 | −0.0105 | -0.070% | -0.038% | 0 |
| midlength\|diamond\|hard | 50.9890 | 50.9899 | +0.0009 | -0.046% | -0.031% | 0 |
| midlength\|diamond\|soft | 50.9506 | 50.9514 | +0.0008 | -0.046% | -0.031% | 0 |
| midlength\|pin\|hard | 49.4036 | 49.4039 | +0.0003 | -0.044% | -0.025% | 0 |
| midlength\|pin\|soft | 49.3656 | 49.3654 | −0.0002 | -0.046% | -0.025% | 0 |
| midlength\|round\|hard | 49.4036 | 49.4039 | +0.0003 | -0.044% | -0.025% | 0 |
| midlength\|round\|soft | 49.3656 | 49.3654 | −0.0002 | -0.046% | -0.025% | 0 |
| longboard\|asis\|hard | 74.5783 | 74.6014 | +0.0230 | -0.052% | -0.046% | 0 |
| longboard\|asis\|soft | 73.6222 | 73.6142 | −0.0080 | -0.057% | -0.051% | 0 |
| longboard\|swallow\|hard | 75.1306 | 75.1608 | +0.0303 | -0.055% | -0.043% | 0 |
| longboard\|swallow\|soft | 74.1782 | 74.1774 | −0.0009 | -0.061% | -0.046% | 0 |
| longboard\|diamond\|hard | 74.2552 | 74.2893 | +0.0341 | -0.054% | -0.045% | 0 |
| longboard\|diamond\|soft | 73.3029 | 73.3097 | +0.0068 | -0.059% | -0.050% | 0 |
| longboard\|pin\|hard | 69.9384 | 70.0299 | +0.0915 | -0.044% | -0.037% | 0 |
| longboard\|pin\|soft | 68.9873 | 69.1217 | +0.1344 | -0.037% | -0.028% | 0 |
| longboard\|round\|hard | 69.9384 | 70.0299 | +0.0915 | -0.044% | -0.037% | 0 |
| longboard\|round\|soft | 68.9873 | 69.1217 | +0.1344 | -0.037% | -0.028% | 0 |
| aligned\|shortboard\|hard | 29.5704 | 29.5720 | +0.0016 | -0.045% | -0.042% | 0 |
| aligned\|shortboard\|soft | 29.5317 | 29.5337 | +0.0020 | -0.045% | -0.042% | 0 |
| aligned\|fish\|hard | 34.6973 | 34.6985 | +0.0013 | -0.058% | -0.040% | 0 |
| aligned\|fish\|soft | 34.6650 | 34.6662 | +0.0012 | -0.058% | -0.039% | 0 |
| aligned\|midlength\|hard | 49.4455 | 49.4462 | +0.0007 | -0.044% | -0.025% | 0 |
| aligned\|midlength\|soft | 49.4160 | 49.4162 | +0.0001 | -0.045% | -0.025% | 0 |
| aligned\|longboard\|hard | 74.6295 | 74.6553 | +0.0257 | -0.052% | -0.046% | 0 |
| aligned\|longboard\|soft | 73.7327 | 73.7247 | −0.0080 | -0.057% | -0.051% | 0 |
| stock\|hard | 30.2886 | 30.2874 | −0.0012 | -0.047% | -0.043% | 0 |
| stock\|soft | 30.2566 | 30.2555 | −0.0011 | -0.046% | -0.042% | 0 |
| tucked\|shortboard\|tail-sbt | 29.5745 | 29.5763 | +0.0018 | -0.044% | -0.041% | 0 |
| tucked\|shortboard\|tail-single | 29.5523 | 29.5541 | +0.0018 | -0.045% | -0.042% | 0 |
| tucked\|shortboard\|he-centre-sbt | 29.6170 | 29.6187 | +0.0017 | -0.044% | -0.041% | 0 |
| tucked\|shortboard\|nose-sbt | 29.6117 | 29.6133 | +0.0016 | -0.045% | -0.041% | 0 |
| tucked\|shortboard\|nose-single | 29.5923 | 29.5938 | +0.0015 | -0.045% | -0.042% | 0 |
| tucked\|shortboard\|centre-single-sbt | 29.5852 | 29.5870 | +0.0018 | -0.045% | -0.042% | 0 |
| tucked\|fish\|tail-sbt | 34.6165 | 34.6179 | +0.0014 | -0.058% | -0.039% | 0 |
| tucked\|fish\|tail-single | 34.5948 | 34.5961 | +0.0013 | -0.058% | -0.039% | 0 |
| tucked\|fish\|he-centre-sbt | 34.6509 | 34.6525 | +0.0016 | -0.058% | -0.039% | 0 |
| tucked\|fish\|nose-sbt | 34.6496 | 34.6511 | +0.0015 | -0.058% | -0.039% | 0 |
| tucked\|fish\|nose-single | 34.6171 | 34.6186 | +0.0015 | -0.059% | -0.040% | 0 |
| tucked\|fish\|centre-single-sbt | 34.6232 | 34.6250 | +0.0018 | -0.058% | -0.039% | 0 |
| tucked\|midlength\|tail-sbt | 49.3673 | 49.3671 | −0.0001 | -0.045% | -0.025% | 0 |
| tucked\|midlength\|tail-single | 49.3429 | 49.3424 | −0.0005 | -0.046% | -0.025% | 0 |
| tucked\|midlength\|he-centre-sbt | 49.4086 | 49.4093 | +0.0008 | -0.044% | -0.024% | 0 |
| tucked\|midlength\|nose-sbt | 49.4050 | 49.4057 | +0.0007 | -0.044% | -0.025% | 0 |
| tucked\|midlength\|nose-single | 49.3626 | 49.3629 | +0.0004 | -0.045% | -0.025% | 0 |
| tucked\|midlength\|centre-single-sbt | 49.3630 | 49.3642 | +0.0012 | -0.044% | -0.025% | 0 |
| tucked\|longboard\|tail-sbt | 73.6454 | 73.6401 | −0.0053 | -0.054% | -0.048% | 0 |
| tucked\|longboard\|tail-single | 73.2431 | 73.2353 | −0.0078 | -0.058% | -0.053% | 0 |
| tucked\|longboard\|he-centre-sbt | 74.7139 | 74.7096 | −0.0043 | -0.043% | -0.038% | 0 |
| tucked\|longboard\|nose-sbt | 73.6373 | 73.6346 | −0.0027 | -0.053% | -0.046% | 0 |
| tucked\|longboard\|nose-single | 73.1575 | 73.1495 | −0.0080 | -0.061% | -0.056% | 0 |
| tucked\|longboard\|centre-single-sbt | 72.6470 | 72.6530 | +0.0059 | -0.050% | -0.044% | 0 |
| wing\|shortboard\|one | 29.5628 | 29.5655 | +0.0027 | -0.026% | -0.032% | 0 |
| wing\|shortboard\|two | 29.5273 | 29.5315 | +0.0043 | -0.010% | -0.021% | 0 |
| wing\|shortboard\|deep | 29.3688 | 29.3722 | +0.0034 | -0.019% | -0.025% | 0 |
| wing\|shortboard\|square | 29.5160 | 29.5193 | +0.0033 | -0.008% | -0.028% | 0 |
| wing\|shortboard\|rounded | 29.4768 | 29.4831 | +0.0063 | 0.007% | -0.007% | 0 |
| wing\|shortboard\|infade | 29.5085 | 29.5069 | −0.0017 | -0.066% | -0.058% | 0 |
| wing\|shortboard\|one-soft | 29.5241 | 29.5274 | +0.0033 | -0.026% | -0.032% | 0 |
| wing\|fish\|one | 34.5980 | 34.5988 | +0.0009 | -0.058% | -0.041% | 0 |
| wing\|fish\|two | 34.5646 | 34.5652 | +0.0006 | -0.058% | -0.041% | 0 |
| wing\|fish\|deep | 34.3792 | 34.3803 | +0.0011 | -0.052% | -0.035% | 0 |
| wing\|fish\|square | 34.5381 | 34.5415 | +0.0034 | -0.032% | -0.024% | 0 |
| wing\|fish\|rounded | 34.5160 | 34.5156 | −0.0004 | -0.069% | -0.047% | 0 |
| wing\|fish\|infade | 34.5130 | 34.5153 | +0.0023 | -0.048% | -0.032% | 0 |
| wing\|fish\|one-soft | 34.5656 | 34.5664 | +0.0008 | -0.058% | -0.041% | 0 |
| wing\|midlength\|one | 49.3527 | 49.3530 | +0.0003 | -0.043% | -0.025% | 0 |
| wing\|midlength\|two | 49.3221 | 49.3215 | −0.0007 | -0.049% | -0.029% | 0 |
| wing\|midlength\|deep | 49.1352 | 49.1362 | +0.0011 | -0.043% | -0.025% | 0 |
| wing\|midlength\|square | 49.3041 | 49.3033 | −0.0008 | -0.058% | -0.028% | 0 |
| wing\|midlength\|rounded | 49.2633 | 49.2652 | +0.0018 | -0.036% | -0.020% | 0 |
| wing\|midlength\|infade | 49.2811 | 49.2778 | −0.0033 | -0.063% | -0.036% | 0 |
| wing\|midlength\|one-soft | 49.3147 | 49.3145 | −0.0003 | -0.044% | -0.025% | 0 |
| wing\|longboard\|one | 73.5577 | 73.5544 | −0.0032 | -0.042% | -0.044% | 0 |
| wing\|longboard\|two | 73.5197 | 73.5169 | −0.0029 | -0.040% | -0.043% | 0 |
| wing\|longboard\|deep | 73.3693 | 73.3422 | −0.0271 | -0.103% | -0.073% | 0 |
| wing\|longboard\|square | 73.4826 | 73.4895 | +0.0069 | -0.012% | -0.031% | 0 |
| wing\|longboard\|rounded | 73.4821 | 73.4699 | −0.0123 | -0.064% | -0.054% | 0 |
| wing\|longboard\|infade | 73.4768 | 73.4720 | −0.0047 | -0.046% | -0.047% | 0 |
| wing\|longboard\|one-soft | 73.5577 | 73.5544 | −0.0032 | -0.042% | -0.044% | 0 |

0 of 102 bit-identical to the pin under the live rule.

## The surface report on the 102 test boards

```
surface report: 102 saved boards; 102 open; 102 whose litres move
tucked|longboard|tail-single: no wings · squash tail — 73.03 → 73.24 L (+0.2041, this plan -0.0078)
longboard|pin|soft: no wings · pin tail — 68.94 → 69.12 L (+0.1823, this plan +0.1344)
longboard|round|soft: no wings · round tail — 68.94 → 69.12 L (+0.1823, this plan +0.1344)
tucked|longboard|centre-single-sbt: no wings · squash tail — 72.80 → 72.65 L (-0.1478, this plan +0.0059)
longboard|pin|hard: no wings · pin tail — 69.90 → 70.03 L (+0.1337, this plan +0.0915)
longboard|round|hard: no wings · round tail — 69.90 → 70.03 L (+0.1337, this plan +0.0915)
longboard|diamond|hard: no wings · diamond tail — 74.22 → 74.29 L (+0.0697, this plan +0.0341)
longboard|asis|hard: no wings · squash tail — 74.54 → 74.60 L (+0.0653, this plan +0.0230)
longboard|swallow|hard: no wings · swallow tail — 75.10 → 75.16 L (+0.0646, this plan +0.0303)
wing|longboard|square: 1 wing · squash tail — 73.43 → 73.49 L (+0.0548, this plan +0.0069)
tucked|longboard|nose-single: no wings · squash tail — 73.10 → 73.15 L (+0.0490, this plan -0.0080)
longboard|diamond|soft: no wings · diamond tail — 73.26 → 73.31 L (+0.0476, this plan +0.0068)
wing|longboard|two: 2 wings · squash tail — 73.47 → 73.52 L (+0.0451, this plan -0.0029)
wing|longboard|one: 1 wing · squash tail — 73.51 → 73.55 L (+0.0447, this plan -0.0032)
wing|longboard|one-soft: 1 wing · squash tail — 73.51 → 73.55 L (+0.0447, this plan -0.0032)
wing|longboard|infade: 1 wing · squash tail — 73.43 → 73.47 L (+0.0432, this plan -0.0047)
longboard|asis|soft: no wings · squash tail — 73.57 → 73.61 L (+0.0399, this plan -0.0080)
longboard|swallow|soft: no wings · swallow tail — 74.14 → 74.18 L (+0.0386, this plan -0.0009)
wing|longboard|rounded: 1 wing · squash tail — 73.43 → 73.47 L (+0.0356, this plan -0.0123)
fish|pin|soft: no wings · pin tail — 31.84 → 31.88 L (+0.0352, this plan +0.0389)
fish|round|soft: no wings · round tail — 31.84 → 31.88 L (+0.0352, this plan +0.0389)
fish|pin|hard: no wings · pin tail — 31.88 → 31.91 L (+0.0334, this plan +0.0371)
fish|round|hard: no wings · round tail — 31.88 → 31.91 L (+0.0334, this plan +0.0371)
aligned|longboard|hard: no wings · squash tail — 74.63 → 74.66 L (+0.0257, this plan +0.0257)
wing|longboard|deep: 1 wing · squash tail — 73.32 → 73.34 L (+0.0208, this plan -0.0271)
shortboard|pin|soft: no wings · pin tail — 28.73 → 28.75 L (+0.0192, this plan +0.0174)
shortboard|round|soft: no wings · round tail — 28.73 → 28.75 L (+0.0192, this plan +0.0174)
shortboard|pin|hard: no wings · pin tail — 28.77 → 28.79 L (+0.0181, this plan +0.0163)
shortboard|round|hard: no wings · round tail — 28.77 → 28.79 L (+0.0181, this plan +0.0163)
tucked|longboard|nose-sbt: no wings · squash tail — 73.62 → 73.63 L (+0.0158, this plan -0.0027)
tucked|longboard|tail-sbt: no wings · squash tail — 73.63 → 73.64 L (+0.0119, this plan -0.0053)
shortboard|diamond|soft: no wings · diamond tail — 30.14 → 30.15 L (+0.0100, this plan +0.0082)
midlength|diamond|hard: no wings · diamond tail — 50.98 → 50.99 L (+0.0099, this plan +0.0009)
shortboard|diamond|hard: no wings · diamond tail — 30.18 → 30.19 L (+0.0096, this plan +0.0077)
midlength|diamond|soft: no wings · diamond tail — 50.94 → 50.95 L (+0.0092, this plan +0.0008)
tucked|longboard|he-centre-sbt: no wings · squash tail — 74.70 → 74.71 L (+0.0085, this plan -0.0043)
wing|shortboard|rounded: 1 wing · squash tail — 29.47 → 29.48 L (+0.0082, this plan +0.0063)
aligned|longboard|soft: no wings · squash tail — 73.73 → 73.72 L (-0.0080, this plan -0.0080)
wing|midlength|rounded: 1 wing · round tail — 49.26 → 49.27 L (+0.0080, this plan +0.0018)
wing|midlength|deep: 1 wing · round tail — 49.13 → 49.14 L (+0.0072, this plan +0.0011)
tucked|midlength|tail-single: no wings · round tail — 49.34 → 49.34 L (+0.0071, this plan -0.0005)
midlength|asis|hard: no wings · round tail — 49.40 → 49.40 L (+0.0065, this plan +0.0003)
midlength|pin|hard: no wings · pin tail — 49.40 → 49.40 L (+0.0065, this plan +0.0003)
midlength|round|hard: no wings · round tail — 49.40 → 49.40 L (+0.0065, this plan +0.0003)
wing|midlength|one: 1 wing · round tail — 49.35 → 49.35 L (+0.0065, this plan +0.0003)
wing|shortboard|two: 2 wings · squash tail — 29.53 → 29.53 L (+0.0061, this plan +0.0043)
wing|midlength|two: 2 wings · round tail — 49.32 → 49.32 L (+0.0055, this plan -0.0007)
wing|midlength|square: 1 wing · round tail — 49.30 → 49.30 L (+0.0054, this plan -0.0008)
wing|shortboard|deep: 1 wing · squash tail — 29.37 → 29.37 L (+0.0053, this plan +0.0034)
tucked|midlength|nose-single: no wings · round tail — 49.36 → 49.36 L (+0.0052, this plan +0.0004)
shortboard|swallow|soft: no wings · swallow tail — 30.59 → 30.60 L (+0.0052, this plan +0.0036)
midlength|asis|soft: no wings · round tail — 49.36 → 49.37 L (+0.0052, this plan -0.0002)
midlength|pin|soft: no wings · pin tail — 49.36 → 49.37 L (+0.0052, this plan -0.0002)
midlength|round|soft: no wings · round tail — 49.36 → 49.37 L (+0.0052, this plan -0.0002)
wing|midlength|one-soft: 1 wing · round tail — 49.31 → 49.31 L (+0.0051, this plan -0.0003)
wing|shortboard|one-soft: 1 wing · squash tail — 29.52 → 29.53 L (+0.0051, this plan +0.0033)
wing|shortboard|square: 1 wing · squash tail — 29.51 → 29.52 L (+0.0051, this plan +0.0033)
shortboard|swallow|hard: no wings · swallow tail — 30.63 → 30.64 L (+0.0050, this plan +0.0033)
tucked|fish|tail-single: no wings · swallow tail — 34.60 → 34.60 L (-0.0048, this plan +0.0013)
wing|shortboard|one: 1 wing · squash tail — 29.56 → 29.57 L (+0.0046, this plan +0.0027)
tucked|midlength|tail-sbt: no wings · round tail — 49.36 → 49.37 L (+0.0045, this plan -0.0001)
tucked|fish|he-centre-sbt: no wings · swallow tail — 34.66 → 34.65 L (-0.0044, this plan +0.0016)
tucked|fish|nose-single: no wings · swallow tail — 34.62 → 34.62 L (-0.0043, this plan +0.0015)
tucked|midlength|centre-single-sbt: no wings · round tail — 49.36 → 49.36 L (+0.0043, this plan +0.0012)
tucked|midlength|nose-sbt: no wings · round tail — 49.40 → 49.41 L (+0.0042, this plan +0.0007)
wing|fish|rounded: 1 wing · swallow tail — 34.52 → 34.52 L (-0.0041, this plan -0.0004)
tucked|midlength|he-centre-sbt: no wings · round tail — 49.41 → 49.41 L (+0.0038, this plan +0.0008)
tucked|fish|centre-single-sbt: no wings · swallow tail — 34.63 → 34.63 L (-0.0037, this plan +0.0018)
shortboard|asis|soft: no wings · squash tail — 29.57 → 29.57 L (+0.0036, this plan +0.0017)
tucked|shortboard|tail-single: no wings · squash tail — 29.55 → 29.55 L (+0.0033, this plan +0.0018)
tucked|fish|nose-sbt: no wings · swallow tail — 34.65 → 34.65 L (-0.0032, this plan +0.0015)
shortboard|asis|hard: no wings · squash tail — 29.61 → 29.61 L (+0.0032, this plan +0.0013)
wing|fish|two: 2 wings · swallow tail — 34.57 → 34.57 L (-0.0031, this plan +0.0006)
tucked|shortboard|tail-sbt: no wings · squash tail — 29.57 → 29.58 L (+0.0030, this plan +0.0018)
wing|fish|one-soft: 1 wing · swallow tail — 34.57 → 34.57 L (-0.0030, this plan +0.0008)
wing|fish|one: 1 wing · swallow tail — 34.60 → 34.60 L (-0.0029, this plan +0.0009)
wing|midlength|infade: 1 wing · round tail — 49.27 → 49.28 L (+0.0028, this plan -0.0033)
tucked|fish|tail-sbt: no wings · swallow tail — 34.62 → 34.62 L (-0.0028, this plan +0.0014)
midlength|swallow|soft: no wings · swallow tail — 51.62 → 51.61 L (-0.0028, this plan -0.0105)
tucked|shortboard|centre-single-sbt: no wings · squash tail — 29.58 → 29.59 L (+0.0027, this plan +0.0018)
wing|fish|deep: 1 wing · swallow tail — 34.38 → 34.38 L (-0.0026, this plan +0.0011)
tucked|shortboard|nose-single: no wings · squash tail — 29.59 → 29.59 L (+0.0025, this plan +0.0015)
fish|asis|soft: no wings · swallow tail — 34.62 → 34.62 L (-0.0024, this plan +0.0013)
fish|swallow|soft: no wings · swallow tail — 34.62 → 34.62 L (-0.0024, this plan +0.0013)
tucked|shortboard|he-centre-sbt: no wings · squash tail — 29.62 → 29.62 L (+0.0024, this plan +0.0017)
fish|asis|hard: no wings · swallow tail — 34.65 → 34.65 L (-0.0024, this plan +0.0014)
fish|swallow|hard: no wings · swallow tail — 34.65 → 34.65 L (-0.0024, this plan +0.0014)
midlength|swallow|hard: no wings · swallow tail — 51.65 → 51.65 L (-0.0023, this plan -0.0108)
aligned|shortboard|soft: no wings · squash tail — 29.53 → 29.53 L (+0.0020, this plan +0.0020)
aligned|shortboard|hard: no wings · squash tail — 29.57 → 29.57 L (+0.0016, this plan +0.0016)
tucked|shortboard|nose-sbt: no wings · squash tail — 29.61 → 29.61 L (+0.0016, this plan +0.0016)
wing|fish|infade: 1 wing · swallow tail — 34.52 → 34.52 L (-0.0014, this plan +0.0023)
aligned|fish|hard: no wings · swallow tail — 34.70 → 34.70 L (+0.0013, this plan +0.0013)
stock|hard: no wings · squash tail — 30.29 → 30.29 L (-0.0012, this plan -0.0012)
aligned|fish|soft: no wings · swallow tail — 34.66 → 34.67 L (+0.0012, this plan +0.0012)
stock|soft: no wings · squash tail — 30.26 → 30.26 L (-0.0011, this plan -0.0011)
fish|diamond|hard: no wings · diamond tail — 34.08 → 34.08 L (-0.0008, this plan +0.0032)
fish|diamond|soft: no wings · diamond tail — 34.05 → 34.04 L (-0.0008, this plan +0.0032)
aligned|midlength|hard: no wings · round tail — 49.45 → 49.45 L (+0.0007, this plan +0.0007)
wing|fish|square: 1 wing · swallow tail — 34.54 → 34.54 L (-0.0004, this plan +0.0034)
wing|shortboard|infade: 1 wing · squash tail — 29.51 → 29.51 L (+0.0002, this plan -0.0017)
aligned|midlength|soft: no wings · round tail — 49.42 → 49.42 L (+0.0001, this plan +0.0001)
largest move: tucked|longboard|tail-single, +0.2041 L
```

The founder's production command (in the script's header, in the form his terminal accepts; never run here):

```
npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --surface-report; rm -f .env.production.pull
```

## Proofs

- **Pins:** the 40, 74 and 102-board JSONs are byte-identical to their commits. `HARD_EDGE_SWITCH`, `HARD_EDGE_FADE` and
  `RAIL_CHARACTER_FADE` reproduce them by name, with the rounded thickness, the square tail and the shifting wing.
- **Bit-identical boards:** none of the 102 under the live rule, because the tail's roll reaches every board. With every new
  rule off but the tips' fit, each board with room for its rail still reads the pin to the last digit; that set is worked out
  in the test from `railReach`, never listed.
- **Smoothness:** a test scans the Mid-length and a domed Shortboard every 1/8": sharpest bend under 0.06 mm under the
  live rule, over 0.4 mm under `RAIL_CHARACTER_FADE`. The threshold comes from the measured 0.034.
- **What a shaper reads:** a test holds `computeRailBands` on the 1/16" grid on domed rails, equal to the named old rule at
  the three rail stations, while the live section reads the actual thickness. `rail-bands.ts` is unchanged by this plan.
- **D-31:** all 74 boards without a wing stay inside (−0.15%, 0] of VOLUME's litres; measured −0.056% to −0.024%. Winged boards
  −0.073% to −0.007%. The band was not loosened.
- **The tail's count:** 8 panels through the ellipse are within 5% of a 2000-station count of a very small figure.
- **Unit suite:** 9206 passed, 2 skipped, 1 load timeout (`rack-stand-in`, which passes alone in 21 s; see Deferred).
- **Mesh:** 0 faults on all 102.
- **Browser specs (port 3216, webpack), on the final code:** three-d on all three projects 97 passed, 41 skipped, 0 failed.
  Desktop baseline 6 passed, VOLUME 30.29 L. Litres-reading and phone specs:
  - `phone-rails`, `volume-fins-panels`, `imported-readout`, `phone-screen-tiles`: 100 passed, 106 skipped, 1 failed under
    load, which passed alone.
  - `rails-advanced`, `undo-redo`, `open-board-reload`, `phone-screens`: 109 passed, 38 skipped.
  - `board-rack`, `board-lock-screens`, `board-length-picker`, `board-name-band`, `phone-chrome`: 129 passed, 187 skipped,
    2 failed. One passed alone. The other is under Deferred Issues: it fails the same way before this plan.
  - `blank-picker`, `step-nav`, `touch-sizing`, `phone-layout`, desktop and android only: 76 passed, 66 skipped, 2 failed, both of
    which passed alone (one needed a longer limit on a cold server).
- **The 3D picture:** re-recorded three times in the plan. First for the nose (11892 pixels, only 10 over 50 of 255, all at
  the nose), then for the tail (8066 pixels, 7 over 50, all at the tail), then for the opening hard edge (120 pixels, none over
  50, along the lower rail in the fade). The rest of the first two is a sub-pixel hairline from the camera framing the
  board by its points. The rail commit moved nothing: the stock board's deck is flat. The other five pictures are
  byte-identical. SHA-256 087b427a → d7842e75.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3] Two browser specs outside the plan's file list were restated.** Three cases in `e2e/rails-advanced.spec.ts`
and `e2e/three-d-hard-edge.spec.ts` asked VOLUME's two decimals to change when Ends At moved to the centre. Since the
tail's roll, that lands on the same 30.29 L as the board opens on. They now read the shorter fade, Ends At at its lowest.
**Commit:** f144c666

**2. [Rule 3] `lib/geometry/tail-cut.test.ts`** reads `RAIL_CHARACTER_FADE` by name in one swallow case: the plain wall
arithmetic holds only where the rail is cut. **Commit:** f106747a

**3. [Rule 1] Test bounds restated from what the boards do.** The "cut rail stands under the deck" check applies to rings at
or under 3/4 of the rail's reach; the side-view deck relation reads 0.01 mm; the tail's deck reads 0.01 mm and its bottom
1e-6 mm; the roll's count is held to a part in twenty.

**4. [Rule 1] The roll's reach in a blend and the outline's tip point.** Inside a blend the roll's reach is Deck Mark 2
carried by the blend's own weight, so it can't jump. At a tip, the outline picks the nearest of the edge's inner vertices,
so it stays strictly between the tip's bottom and deck.

**5. [Rule 2] Small additions the plan didn't list.** `finishedRailReach`, a helper shared by `sampledFinishedRail`,
`boardSectionEnds` reading the live fit, `wingShareSpan`, 24 rings through each wing's shared stretch so its ease is not
straddled, and 14 rings through the tail's roll.

**6. The report's "before" changed.** The plan said `RAIL_CHARACTER_FADE`. So that it stays true of what the founder will see,
"before" is now what the site reads today (`HARD_EDGE_FADE`), with this plan's share shown against
`RAIL_CHARACTER_FADE`. `lib/models/rail-character-report.ts` is untouched.

**7. The plate's Medium tail was built at 0.35 and labelled 1/3.** The rule is a true 1/3, as he picked it.

**8. A wrong line on the lip plate.** It said a corner radius softens the lip. Measured, it lowers the lip not at all; only
the shading softens. Corrected in the hand-back, and moot now he has ruled no lip rule.

**9. Scope grown by the founder's rulings.** The plan as written ended at D-33 and D-34. D-37, D-38, the sharp tuck and D-41
came at his looks, each measured and pictured first. The tuck's rule and the rail's were in no plan.

### Other notes

- Task 2 is `tdd="true"`, but the orchestrator's ruling is one commit per task, so tests and code share commits.
- `lib/geometry/board-surface-render.test.ts` needed no change.

## Deferred Issues

- `lib/models/rack-stand-in.test.ts`'s 1-to-100 sweep now takes about 21 s alone against its 30 s limit, and times out
  under the loaded full suite. The roll adds 9 section builds to every litres figure. Worth raising that one test's limit if it
  fails at the branch gate.

- `e2e/board-lock-screens.spec.ts`, "look-rails", on the iphone project: the Unlock Board button isn't found. It fails the
  same way on the code from before this plan (de1d5e2f, run from a scratch copy on port 3218), so it is not this plan's. It
  needs its own look at the branch gate.

## Known limitations (left alone on purpose)

- The litres' 51 stations do not land on a wing's step; Simpson's rule straddles it as it always has.
- A square step's two rings stand 1e-6" apart, finer than the STL's float32 numbers at some stations (about 30" from the
  tail on one test board): there a strip of 90 triangles collapses to a line. The skin stays closed when welded.
- The standalone estimator's rows stay on the 1/16" (see above).

## Threat Flags

None beyond the plan's register: the report adds no write path and prints ids, wing counts, tail kinds and litres only
(tested with a board named "Chris's Secret Fish").

## Self-Check: PASSED

- Files: the pin, its generator and test, the report and its test, the seven new plates and the archive all exist.
- Commits: 175c3eed (the pin alone), cc85b9c3, f106747a, df99385f, f144c666, 2ca7548e, cfaa8c03.
- No change to STATE.md, ROADMAP.md, lib/export/'s writers, components/, lib/geometry/rail-bands.ts or
  lib/models/rail-character-report.ts; of the six desktop pictures only three-d-desktop changed.

## Founder's look

Presented by the orchestrator at the Wave 11 checkpoint, over four rounds on 2026-11-05. First build: not approved; his red line on the wing slice and D-37, D-38, D-39. From the candidates' plates: "3\" each way", "Medium: 1/3 over 1\"", the fades "Keep them as they are". As built: "the short board and fish wings look good. The mId-lengh is all wavy and I do not like it. THe tails all look great. The sharp tuck looks good. And Wings should not get a corner radius." (D-41), and the rule that a board keeps its actual values and rounds only for display. Final look, with the Mid-length plate: "Approved." The standalone estimator's Cross-Section Thickness rows stay on the 1/16" for now: "File a to-do". Merged into `board-3d` as ee6ada77. The deviations, the two restated browser specs and the iPhone `look-rails` failure, which fails the same way before this plan, were accepted by the orchestrator; that failure gets its own look before go-live 2.
