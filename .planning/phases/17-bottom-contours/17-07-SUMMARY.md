---
phase: 17-bottom-contours
plan: 07
subsystem: geometry (bottom contours: the drawings, pure — top view, section, gauges, ruler, ghost, GUIDE cartoons, tile)
status: checkpoint
tags: [bottom, drawings, shade, contour-lines, pencil-lines, fins, section, gauges, ruler, ghost, guide, tile, D-07, D-12, D-13, D-14, D-17, D-25, D-30, D-31, D-40]
requires:
  - "17-02..17-06: bottom.ts (foamOff, cutHalfWidth, doubleMarks, channelMarks, channelFoamOff, bottomLayoutMarks, deepestCutAt, startingCut, startingChannels, resolveBottom)"
  - "17-03/17-06: volume.ts BoardSection (drawn, railEdgeAt), boardSections"
  - "fins.ts FinMark; screen-tiles.ts outlineTileArt / silhouette; measure-display.ts formatDim / formatMark / formatMarkBare / measureSlider"
provides:
  - "bottom-draw.ts: bottomShadeBands, shadePathData, bottomContourLines, polylinesPathData, bottomPencilLines, bottomFinLines, topViewFrame / topViewX / topViewY / topViewMap, stationAtPointer, sectionOpeningStation, topViewMarks, placeRailLabels"
  - "bottom-draw.ts: bottomSection, sectionHeightLabel, sectionGauges, gaugeReads, sectionRuler, ghostRail, ghostRailPath, cutAlone, guideCartoon"
  - "bottom-draw.ts types: PencilKind, PencilLine, ShadeLevel, ContourLevel, FinLine, TopViewFrame, TopViewMarks, SectionDrawing, Gauge, SectionRuler, GuideCartoon, GuideCartoonKey"
  - "bottom-tile-art.ts: bottomTileArt, bottomTileLine"
  - "blank-reasons.ts: formatBottomStation, bottomStationSlider"
affects: [17-08, 17-09, 17-10, 17-11, 17-12]
tech-stack:
  added: []
  patterns:
    - "A drawing's geometry comes back in board millimetres (shade, lines, fins) or in the sketch's 1000-wide drawing units with px = 1000 / box width (top view frame, section) — the component only maps and paints"
    - "One SVG path per shade level: a level's rectangles never overlap, so they join into one path"
key-files:
  created:
    - lib/geometry/bottom-draw.ts
    - lib/geometry/bottom-draw.test.ts
    - lib/geometry/bottom-tile-art.ts
    - lib/geometry/bottom-tile-art.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-07-the-drawings.png
    - .planning/phases/17-bottom-contours/pictures/17-07-pictures-source.tar.gz
  modified:
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
decisions:
  - "The shade draws a level when the depth is within a thousandth of an inch of it (BOTTOM_SHADE_REACH): the grid's columns stand between stations, so a 1/4\" cut read on the grid was a hair shy and shaded seven levels deep, not eight (measured shortfall at most 0.0011 mm on the starting singles, vees and bellies of the four presets)"
  - "A gauge draws only when its value would not print as 0 (formatMark), so the rule is exactly 'never 0\"' in either system: at 1/32\" Imperial, at half a millimetre Metric"
  - "The top view lets the box's height bind: a short box shrinks the board so it never spills into the two rails (the sketch's max(1, …) meant the height never bound)"
  - "D-40 in the section: the slab ends at the nearer of the seam's knife edge (BoardSection.railEdgeAt, when the caller passes the station's section) and the slab's own (where the cut reaches the planed thickness) — the thinned rail, never a lip"
  - "The GUIDE cartoon is the cut alone on an otherwise flat board (cutAlone) read through foamOff, so the cartoon, the VIEWER and the litres share one number"
metrics:
  duration: "about 40 minutes (22:05 to 22:45 local), of which about 12 were two full unit-suite runs"
  completed: 2026-11-08
actuals:
  tokens: 26000
  tasks: 2
  commits: 4
---

# Phase 17 Plan 07: The drawings of the bottom, as pure geometry — Summary

Every drawing the BOTTOM page will show is now worked out in one place and tested. That covers:

- the bottom seen from above;
- the cross-section a gauge would read, with its ruler and the ghost of the finished rail;
- the GUIDE's cartoons;
- the small picture on the ☰ menu's BOTTOM tile.

Each one is read from the same foam-off number the litres, the 3D board and DATA use, so no drawing can disagree with
them. Nothing on any screen changes yet. The page that paints these drawings comes in 17-08.

## What changes for the founder

- **From above (D-12).**
  - The shade darkens one step every 1/32" of depth, and a faint line is drawn at every 1/16".
  - The pencil lines are the ones you would rule on the blank:
    - a single's edge;
    - a double's flat, its trough (dotted) and its edge;
    - a Tri-Plane's panel line;
    - every channel wall, each starting at its own channel's start, so a staggered set steps.
  - The cut you are working on draws its pencil lines in ink; every other cut draws them in pencil.
  - **The fins are FINS' own base lines (D-31):** solid, in the fin colour, with no dots or dimensions.
  - **Above the board:** `WIDE POINT · 36"` and `FRONT FINS · 11"`. A single fin reads `FIN · 5 1/2"`.
  - **Below the board:** the live cut's `START`, `DEEPEST` and `END`, each measured from that cut's nearest tip.
  - Two labels that would touch are pushed apart. A third that still touches is left out, but its tick stays.
- **The section (D-13).**
  - Every station is drawn at one scale. At the wide point the board fills the box less 20 dots of air a side. That
    is 95.02% of the box on all four presets.
  - The Height pick sets how much the height is exaggerated. If a deep cut would leave the box, it is fitted, and the
    label says the factor actually drawn. The Longboard's belly at ×8 reads `HEIGHT ×7.0`.
  - **The gauge readings sit where you would hold a gauge:**
    - the gap at the stringer;
    - the lift at each rail. The value sits beside the rail where there is room; at the wide point, where there is
      none, it sits under the straightedge;
    - a double's trough or a channel's floor, on its own line;
    - the stringer left.
  - A reading that would print as `0"` is never drawn.
  - The words (`rail lift`, `at the stringer`, `PLANED BOTTOM`) appear only in a box 625 dots wide or more.
- **The ruler (D-14, D-30).** It shows the live cut's layout marks off the stringer. The values are DATA's own, so a
  channel wall appears only from its own channel's start.
  - From a 548-dot box (a 1024 window) the ruler draws with values only.
  - From a 625-dot box the caption `OFF THE STRINGER` is added.
  - Below 548 dots there is no ruler.
- **D-40.** Where a vee or a belly lifts the rail all the way to the deck, the section's foam ends at that knife edge.
  The rail is drawn thinned, never with a lip.
- **The ghost.** The finished rail from RAILS is drawn from the very ring the litres count and the 3D board draws, so
  it can never disagree with them.
- **GUIDE (D-17).** Each card's cartoon shows that one cut alone, on the board you have open, at its starting numbers:
  - from above, with its shade, its pencil lines and the cutting line;
  - across, where the cut is deepest (kept 3" inside either tip; a flat is cut at the wide point), at Height ×8.

  The channels' card shows six channels, and the five vees give five different sections.
- **The ☰ tile (UI-SPEC §9).**
  - The picture is TEMPLATE's board lying down, with this board's own shade and pencil lines and the cutting line at
    the wide point. A flat board shows the board and its cutting line, never a made-up cut.
  - The tile's line reads `All flat`, `1 cut`, `2 cuts · 6 channels`, or `8 channels` when there are channels alone.
- **Stations (D-25).** A station on BOTTOM reads exactly as a Thinning Start does: `23 7/16"`, or `59.5 cm` in Metric.
  A 12" station reads `30.5 cm`, never `305 mm`.
- **The `Section at` slider.** It runs from the nose on the left to the tail on the right, in 1/2" steps (10 mm in
  Metric).

## The figures (each computed by the app; none typed in a test)

- **Shade size (T-17-11).** The page draws one shade path per level. Rectangles per board, at the sketch's openings
  and with eight channels added:

  | Board | Openings: levels | Openings: rectangles | + 8 channels: levels | + 8 channels: rectangles | Tile rectangles |
  |---|---|---|---|---|---|
  | Shortboard | 8 | 622 | 11 | 2,212 | 208–598 |
  | Fish | 6 | 298 | 15 | 1,722 | 100–404 |
  | Mid-length | 8 | 784 | 17 | 2,188 | 258–566 |
  | Longboard | 12 | 1,770 | 17 | 2,564 | 588–758 |

  The worst board needs 17 shade paths, well under the 48 allowed. These rectangle counts match the research's own
  measurement (Longboard + 8 channels: 2,536).
- **Shade timing.** The shade and the lines together take 45–85 ms per board on this machine. 17-08 should work them
  out once per bottom, not on every drag of the cutting line (the shade does not depend on the station).
- **The grid's shortfall.** On a single, vee or belly whose deepest point is one station, the shade's grid reads the
  depth up to 0.0011 mm shy (the Shortboard's Deep Single: 6.3492 mm against 6.35). A thousandth of an inch
  (0.0254 mm) closes it. A double's trough and the Spiral Vee's fall between two samples across and read up to
  0.24 mm shy (the Fish's Spiral Vee); the reach leaves that alone, and it is under 1/100".

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The bottom from above: shade, lines, pencil lines, fins, the rails of marks, the tile, the station formatter | 8e7f100b | bottom-draw.ts/.test, bottom-tile-art.ts/.test, blank-reasons.ts/.test |
| 2 | The section, its gauges, the ruler, the ghost, the GUIDE cartoon | 9af4e895 | bottom-draw.ts/.test |
| — | The shade reach's note corrected to the measured figures (comment only) | 2e32687e | bottom-draw.ts |
| 3 | The founder's look | checkpoint (this summary and the pictures) | pictures/17-07-the-drawings.png, pictures/17-07-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exits 0. `npm run lint` shows 0 errors, plus the same unrelated `import-designs-action.test.ts`
  warning.
- **Full unit suite, both runs passed:**
  - after Task 1: 186 files, 11,277 passed, 2 skipped, exit 0;
  - after Task 2: 186 files, 11,322 passed, 2 skipped, exit 0.
- `bottom-draw.test.ts` has 79 tests, `bottom-tile-art.test.ts` 9, and the new station tests in
  `blank-reasons.test.ts` 4. `bottom-source.test.ts` still passes.
- `npx vitest run lib/geometry/bottom-draw.test.ts -t section` exits 0.
- **Prohibitions:**
  - `grep -cE "window\.|document\.|innerWidth|matchMedia"` prints 0 for both new files.
  - Neither file contains `25.4`.
  - No file under `components/`, `app/`, `lib/db/` or `drizzle/` changed.

## Deviations from Plan

1. **Signatures widened.** Each function needs facts the plan's short signature left out:
   - `topViewMarks(board, resolved, live, placement, system)`: the live cut's stations come from `resolved`, and the
     word `FRONT FINS` or `FIN` comes from the fins.
   - `bottomSection(resolved, board, station, height, box, { live, seam })`: the ruler's presence sets the slab's
     foot, and the station's built section gives the D-40 knife edge.
   - `sectionGauges(drawing, resolved, board, system)` and
     `sectionRuler(drawing, resolved, board, live, system, measure)` read the section's own layout.
   - `guideCartoon({ section, name } | { section: "channels" }, board, geometry, rule?)` needs the outline to draw
     the board's edge.
   - `bottomTileArt(geometry, resolved, board)`, as the plan's must-have reads.
2. **Helpers added**, each pure and tested through its callers:
   - `topViewFrame`, `topViewX`, `topViewY`, `topViewMap`, `sectionOpeningStation`, `polylinesPathData`;
   - `sectionHeightLabel`, `gaugeReads`, `ghostRailPath`, `cutAlone`;
   - `BOTTOM_SHADE_REACH`, and the named sizes `SECTION_RULER_MIN_BOX` (548), `SECTION_WORDS_MIN_BOX` (625),
     `GAUGE_BESIDE_ROOM` (110 / 60) and `GAUGE_STRINGER_LEFT_ROOM` (70).
3. **[Measured, not bent] "The deepest shade level is 8" holds only with the 1/1000" reach.** Without it the grid
   misses the deepest station by a hair. This is a display rule only, and it is recorded above.
4. **[Measured] "At Height ×8 the Longboard's belly is fitted" depends on the box's height.** It holds in the sketch's
   own section box at 1280 × 800 (804 × 165 dots), where it draws `HEIGHT ×7.0`. In a box 200 dots tall the belly fits
   at ×8. The test pins the 165-dot box. The assumed box width at a 1280 window, 804 dots, is D-30's 548 at 1024 plus
   the 256 extra dots of window.
5. **[Measured] D-40 on the presets' openings.** No opening lifts a rail to the deck, so no section has a knife edge
   (`railEdgeAt`); 17-05's rail flags are the "thinner than 1/4"" kind. The D-40 drawing is tested on the Fish's Panel
   Vee taken to 1/2", which reaches the deck in six tail sections. The seam's knife edge there is only 0.008" inside
   the outline, so the slab looks like a square rail, and the ghost shows the thinned rail. A second test takes a lift
   deeper than the slab and checks that the slab ends exactly where the cut reaches its top.
6. **The section's square-rail slab stays square (D-13, "no bands yet").** Where the finished rail is thin, that shows
   in the ghost. The `thinAt` flag is left for the component to word, as orchestrator ruling 3 says.
7. **The top view's frame lets height bind** (decision above). The sketch's frame never let it bind.
8. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as this session's attribution
   rule gives it and as waves 1 to 6 recorded. Orchestrator ruling 5 named a different model, which did not do this
   work.
9. **TDD in one commit per task (ruling 5).** The tests were written with the code, before each task's commit. Each
   task's tests failed first where expected: the shade's deepest level and the contour bracket in Task 1, and the ×8
   fit and the knife edge in Task 2. Those failures led to deviations 3 to 5.

## Known Stubs

None. Every function is used by its tests and the picture; 17-08 paints them.

## Threat Flags

None. There is no new endpoint, input, file path or schema. T-17-11 is mitigated and tested (one path per level, ≤ 48
on the worst board; measured 17). T-17-01 is mitigated: every expectation is the app's own function.

## Founder's look: Pending

Picture: `.planning/phases/17-bottom-contours/pictures/17-07-the-drawings.png` (sources in
`17-07-pictures-source.tar.gz`). Every drawing in it is painted straight from the new functions, with no React, beside
sketch 021's own pictures of the same board.

1. **From above (section 1, beside the sketch's `desktop-tail-channels.png`).**
   - The shade darkens toward each cut's deepest, with a line at every 1/16".
   - The pencil lines sit where you would rule them.
   - The fins are FINS' own base lines (new since the sketch, D-31).

   The front fins read 11" where the sketch read 10 7/8". The app's presets open with FINS' Import Template ticked,
   which puts the thruster's front pair at 11".
2. **The section (sections 2 and 3).**
   - One scale at every station, with the wide point near the full width.
   - The gauge readings sit where a gauge would sit, and nothing is labelled `0"`.
   - The ×8 fit reads `HEIGHT ×6.1` on the Shortboard's channels.
3. **The ruler (section 2).** It draws with values only in the 1024 window's box, adds `OFF THE STRINGER` from about
   1100 dots (the 1280 box here), and is gone at 820 (D-30).
4. **The cartoons (section 4, beside the sketch's `desktop-guide.png`) and the tile (section 5).** They read as this
   board: the Flat, Rolled Belly and Teardrop cards match the sketch's, plus the Panel Vee, the Spiral Vee, six
   channels and the Longboard's Teardrop.

## Self-Check: PASSED

All six code files, both pictures and this summary exist. Commits 8e7f100b, 9af4e895 and 2e32687e are on the branch.
