---
phase: 16-3d-board-and-cnc-export
plan: 03
subsystem: geometry (3D surface)
status: complete
tags: [3d, surface, mesh, swallow, hard-edge, normals, D-05, D-07, D-09, D-20, D-24, D-26, D-27]
requires:
  - "16-01: boardSections / BoardSection (result, hardResult, hardWeight), designCrossSectionInput, phase16Boards"
provides:
  - "buildBoardSurface, surfaceStations, enclosedVolumeMm3, meshCheck — the closed surface from the litres' own sections"
  - "boardSlices, boardOutlineLoop, boardProfileLines — the CNC files' curves, read off the mesh's own vertices"
  - "renderMesh (bottom edge sharp by marking), stringerLines — what the 3D screen draws"
  - "Vec3, BoardSurfaceInput, SurfaceRing, BoardSurface, SURFACE_POINTS, SURFACE_STATION_STEP_IN"
  - "Additive: BoardSurface.faceKinds + SURFACE_FACE, placedHalfSection, pieceVertices, extremeVertex"
affects: [16-05, 16-06, 16-07, 16-10]
tech-stack:
  added: []
  patterns:
    - "The surface ARRANGES sections it is given (boardSections) — no section maths; a source-grep test enforces it"
    - "Each ring's vertices are contiguous and in loop order, so a slice is a range of the mesh (identity, not tolerance)"
    - "Sharp edges by topology: the bottom-edge row is marked by the surface and split for the screen with a sharpness weight"
key-files:
  created:
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - lib/geometry/board-surface-render.ts
    - lib/geometry/board-surface-render.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-03-surface-fish-shortboard.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-03-pictures-source.tar.gz
  modified: []
decisions:
  - "D-31 (level variant): inside the hard edge's fade the litres count the ring the 3D board draws, corrected by the end rings' own polygon shortfalls blended by the weight (fadingSectionArea) — one blend (blendFinishedRails) read by both"
  - "Stations: the litres' own, both 12-inch stations, the centre, the tail cut and the fade's end, filled in by splitting the board evenly so no gap exceeds 1/2 inch (ceil(length / 1/2\")) — never a sliver panel at the nose"
  - "BoardSurface carries faceKinds (one SURFACE_FACE per triangle) so the screen knows rail, bottom, wall and cap faces apart without guessing"
  - "The outline loop closes a swallow's tail along the notch's inner edges to the crotch (TEMPLATE's silhouette), not straight across the open notch"
  - "On a swallow the stringer's deck line starts at the crotch's bottom and runs up the crotch's face; on a square or squash tail it runs up the tail end"
metrics:
  duration: "about 35 minutes"
  completed: 2026-11-04
estimate:
  tokens: 110000
actuals:
  tokens: 16700
  tasks: 2
  commits: 3
---

# Phase 16 Plan 03: The 3D board's surface — Summary

The 3D board now exists as tested maths: VOLUME's own cross-sections, placed on the outline and the rocker at
every half inch and at every station the litres are worked out at, joined into one closed skin. All 40 test
boards come out watertight and hold 0.03%–0.08% less foam than VOLUME counts, never more. The swallow is two
pieces with square walls, the hard edge fades without a step, and the sharp bottom edge stays sharp on screen.

## What changes for the founder

- **Nothing on any screen changes yet.** This plan is the shape the 3D screen (16-06) and the CNC files (16-05)
  will both read. Nobody can see it in the app until those land.
- **The 3D board is VOLUME's board, not a look-alike.** The app doesn't work out any cross-section of its own
  for 3D. It takes the very sections the litres add up (the finished rail, the tail's hard edge fading from 12"
  to 18", a swallow's notch, a diamond's V) and joins them into a solid. So the 3D board and the litres beside
  it can't disagree about the shape.
- **Its volume is a hair under VOLUME's, never over.** Between stations the skin is made of flat triangles,
  which sit just inside the true curve. Across all 40 test boards the gap runs from −0.030% to −0.083%. On the
  Fish that's 34.61 L against VOLUME's 34.64 L. The limit we set was 0.15%.
- **The swallow is two pieces.** From the notch out to each rail, each tail point is solid foam with a square,
  upright inner wall, and the two walls meet along one edge at the crotch. There's never a V sloping out from
  the stringer. I checked it from below and from straight behind (the last picture).
- **The hard edge fades, with no step.** It's full to the 12" mark and eases into the tucked rail by 18". The
  screen will draw the bottom edge as sharp as the rail says: fully sharp on a hard edge or a Sharp Bottom Tuck,
  blending out through the fade. It never guesses from angles, because no angle can tell a Sharp Bottom Tuck
  from an ordinary tight rail.
- **The CNC files' curves are points of the drawn board.** The slices (one per litres station, about 50 per
  board, two loops inside a swallow's notch), the outline and the side profile are read straight off the
  skin's own corner points. A file can never describe a different board from the one on screen.
- **A broken board is refused by name.** A missing or impossible number, or a length outside 60"–120", gets a
  message naming what's wrong instead of a half-built shape.
- **One small finding (please glance at it).** On a longboard re-cut with a pin or round tail (a test board,
  not a preset), the foam at the 12" mark is narrower than the rail section RAILS draws there. So the 3D deck
  at the stringer sits **0.035 mm (about 1/700")** under ROCKER's deck at 12", and the difference is gone by
  17½". The research expected this only inside 12" of a tip. It's far too small to see, and the litres are
  unaffected (that board's gap is −0.061%). No preset shows it.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | One board as a closed surface from the litres' own sections, its volume agreeing with VOLUME | 0ce3b310 | board-surface.ts, board-surface.test.ts |
| 2 | Every tail and tip, the fade, the refusals, the 40-board relation, the file curves, the sharp rows | 78a6c73f | board-surface.ts (+test), board-surface-render.ts (+test) |
| 3 | The founder sees the real surface under the mock-up's lights | 26f29b02 (pictures) — checkpoint | pictures/16-03-surface-fish-shortboard.png, 16-03-pictures-source.tar.gz |

Tracer gate: after Task 1 the Shortboard (as opened, Hard Edge on) was closed (0/0/0/0), its volume ratio inside
(0.9985, 1], its rings at every litres station, and its lowest/highest points at the rocker/deck between the 12"
stations. The full suite was green, then the plan moved on to Task 2.

## Verification

- `npx vitest run lib/geometry/board-surface.test.ts lib/geometry/board-surface-render.test.ts`: 179 passed
  (167 + 12). The cases cover the 40-board watertight-and-gap relation (40), the notch test (10 swallows: every
  `swallow` board plus `fish|asis`), the diamond V (8), the tips and caps (40), the slices, outline and profile
  (40), the fade blend (3 boards, every fading ring), the refusals, the stations, the source-grep prohibitions,
  and the render normals and stringer.
- `npm test`: 165 files, 7046 passed, 2 skipped. Three heavy sweeps timed out under the shared machine's load
  (`rack-stand-in`, `blank-fit`, `round-tip`); run alone, all 149 of their tests pass. No assertion failed.
- `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors (the one warning in `lib/db/import-designs-action.test.ts`
  was there before this plan).
- `git diff --stat 5b07f43e HEAD -- components app e2e lib/models scripts` is empty. Only the plan's six files
  were touched (plus this SUMMARY).

## The gap table (all 40 boards)

Mesh = `enclosedVolumeMm3(buildBoardSurface(input))/1e6`, VOLUME = `computeCrossSectionVolume(input).volumeLitres`,
the same input object. Build ms = median of five `buildBoardSurface` runs in Node after a warm-up, on a machine
shared with a sibling executor and the founder's review server (so treat the times as upper bounds). Mesh faults =
open + non-manifold + mis-wound edges + zero-area triangles. Scratch script `gap-table.ts`, archived in
`pictures/16-03-pictures-source.tar.gz`.

| Board | Mesh (L) | VOLUME (L) | Gap | Vertices | Triangles | Build ms | renderMesh ms | Mesh faults |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| shortboard · asis · hard | 29.5763 | 29.5903 | -0.047% | 39594 | 79184 | 169 | 98 | 0 |
| shortboard · asis · soft | 29.5582 | 29.5712 | -0.044% | 39594 | 79184 | 136 | 187 | 0 |
| shortboard · swallow · hard | 30.5944 | 30.6135 | -0.063% | 39457 | 78910 | 129 | 106 | 0 |
| shortboard · swallow · soft | 30.5766 | 30.5947 | -0.059% | 39457 | 78910 | 102 | 99 | 0 |
| shortboard · diamond · hard | 30.1425 | 30.1590 | -0.055% | 38988 | 77972 | 98 | 92 | 0 |
| shortboard · diamond · soft | 30.1247 | 30.1402 | -0.051% | 38988 | 77972 | 116 | 38 | 0 |
| shortboard · pin · hard | 28.7361 | 28.7501 | -0.049% | 39392 | 78780 | 95 | 44 | 0 |
| shortboard · pin · soft | 28.7183 | 28.7313 | -0.045% | 39392 | 78780 | 112 | 41 | 0 |
| shortboard · round · hard | 28.7361 | 28.7501 | -0.049% | 39392 | 78780 | 105 | 95 | 0 |
| shortboard · round · soft | 28.7183 | 28.7313 | -0.045% | 39392 | 78780 | 119 | 31 | 0 |
| fish · asis · hard | 34.6118 | 34.6351 | -0.067% | 37033 | 74062 | 98 | 51 | 0 |
| fish · asis · soft | 34.5970 | 34.6190 | -0.064% | 37033 | 74062 | 90 | 39 | 0 |
| fish · swallow · hard | 34.6118 | 34.6351 | -0.067% | 37033 | 74062 | 91 | 83 | 0 |
| fish · swallow · soft | 34.5970 | 34.6190 | -0.064% | 37033 | 74062 | 103 | 49 | 0 |
| fish · diamond · hard | 34.0386 | 34.0614 | -0.067% | 36564 | 73124 | 93 | 47 | 0 |
| fish · diamond · soft | 34.0239 | 34.0453 | -0.063% | 36564 | 73124 | 99 | 58 | 0 |
| fish · pin · hard | 31.8452 | 31.8592 | -0.044% | 36968 | 73932 | 86 | 23 | 0 |
| fish · pin · soft | 31.8304 | 31.8432 | -0.040% | 36968 | 73932 | 102 | 44 | 0 |
| fish · round · hard | 31.8452 | 31.8592 | -0.044% | 36968 | 73932 | 89 | 67 | 0 |
| fish · round · soft | 31.8304 | 31.8432 | -0.040% | 36968 | 73932 | 129 | 67 | 0 |
| midlength · asis · hard | 49.3520 | 49.3773 | -0.051% | 45250 | 90496 | 146 | 197 | 0 |
| midlength · asis · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 166 | 50 | 0 |
| midlength · swallow · hard | 51.5953 | 51.6329 | -0.073% | 45517 | 91030 | 124 | 87 | 0 |
| midlength · swallow · soft | 51.5793 | 51.6155 | -0.070% | 45315 | 90626 | 139 | 54 | 0 |
| midlength · diamond · hard | 50.9355 | 50.9595 | -0.047% | 45452 | 90900 | 132 | 31 | 0 |
| midlength · diamond · soft | 50.9195 | 50.9423 | -0.045% | 45250 | 90496 | 125 | 54 | 0 |
| midlength · pin · hard | 49.3520 | 49.3773 | -0.051% | 45250 | 90496 | 143 | 39 | 0 |
| midlength · pin · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 142 | 136 | 0 |
| midlength · round · hard | 49.3520 | 49.3773 | -0.051% | 45250 | 90496 | 141 | 65 | 0 |
| midlength · round · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 144 | 58 | 0 |
| longboard · asis · hard | 73.9104 | 73.9612 | -0.069% | 53330 | 106656 | 178 | 129 | 0 |
| longboard · asis · soft | 73.5369 | 73.5743 | -0.051% | 53330 | 106656 | 162 | 40 | 0 |
| longboard · swallow · hard | 74.4602 | 74.5224 | -0.083% | 53395 | 106786 | 181 | 57 | 0 |
| longboard · swallow · soft | 74.0895 | 74.1387 | -0.066% | 53303 | 106602 | 177 | 140 | 0 |
| longboard · diamond · hard | 73.5861 | 73.6462 | -0.082% | 51916 | 103828 | 191 | 145 | 0 |
| longboard · diamond · soft | 73.2160 | 73.2621 | -0.063% | 51778 | 103552 | 159 | 81 | 0 |
| longboard · pin · hard | 69.2785 | 69.3211 | -0.061% | 53128 | 106252 | 176 | 106 | 0 |
| longboard · pin · soft | 68.9185 | 68.9394 | -0.030% | 52024 | 104044 | 134 | 47 | 0 |
| longboard · round · hard | 69.2785 | 69.3211 | -0.061% | 53128 | 106252 | 171 | 124 | 0 |
| longboard · round · soft | 68.9185 | 68.9394 | -0.030% | 52024 | 104044 | 171 | 102 | 0 |

Headline: the worst gap is −0.083% (longboard · swallow · hard), the closest −0.030%. All 40 are inside
(−0.15%, 0], and none has a mesh fault. The counts run higher than the research's estimate (36.6k–53.4k vertices and
73k–107k triangles, against 28k–45k and 55k–87k). That's because this surface takes every litres station on top of
a full 1/2" grid, where the research spaced 12.7 mm and added the litres stations to it. 107k triangles is
comfortable for WebGL. Build times are 86–191 ms under load (research: 73–115 ms on a quiet machine).

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-03-surface-fish-shortboard.png` shows the Fish (swallow,
Hard Edge on) and the Shortboard (squash, Hard Edge on) as their cards open them (`presetDesignFields`). Each is
shot from the deck straight down, the deck three-quarter, the bottom straight up, the side, the tail from below,
and the tail end close from below. The Fish's tail end also gets one shot from straight behind. There's a one-line
caption per picture. The page is the mock-up's own (`build-mock.js`), with its lights, foam colour and framing,
but its loft is swapped for `renderMesh(buildBoardSurface(...))` and `stringerLines`. There are no fins (16-06
adds them). It's drawn front faces only, so a wrongly wound face would show as a hole, and none does. three.js came
from the research sandbox's local copy, served to headless Chromium by Playwright's request interception, so no
server and no port. Sources: `pictures/16-03-pictures-source.tar.gz`.

## Deviations from Plan

1. **[Rule 1 - Honest finding, test adjusted] The deck at the stringer sits under ROCKER's deck at 12" on a
   pin/round longboard.** The plan's truth says that between the two 12" stations the mesh's highest point
   equals `deckAt`. That holds wherever the section's flat deck reaches the stringer uncut, which covers every
   preset and every other test board. On `longboard|pin` and `longboard|round` (hard and soft) the foam at 12"
   has a half-width of 131.8 mm, while the rail section RAILS draws there begins its deck 170 mm in. The surface
   cuts it at the stringer as planned, never squeezing it, and that leaves the deck 0.0346 mm low at 12",
   shrinking to 0.0001 mm by 17.5" (measured, `probe-deck.ts`). The test now asserts exact equality where the
   section is uncut (more than 50 rings per board) and "never above `deckAt`, never below `rockerAt`" everywhere.
   The lowest point equals `rockerAt` on every ring between the 12" stations, with no exception. The Shortboard
   tracer test keeps the exact equality. Files: board-surface.test.ts. Commit 78a6c73f.
2. **[Rule 2 - Needed for sharp edges] `BoardSurface.faceKinds` and `SURFACE_FACE` added** (one per triangle:
   upper, bottom, right wall, left wall, tail cap, nose cap). Without them `renderMesh` couldn't tell a rail face
   from a bottom face at the bottom edge, or a wall from the deck at a notch corner, without guessing from angles,
   which research Pattern 4 forbids. The change is additive; the plan's fields are unchanged.
3. **[Rule 2 - Additive helpers] `placedHalfSection`, `pieceVertices` and `extremeVertex` exported.** The fade test
   uses the first to check each fading ring point for point against its tucked and hard-edged halves.
   `board-surface-render.ts` uses the other two so it reads the rings exactly as the readers do.
4. **Stations split the board evenly** (`ceil(length / ½")` panels, spacing at most ½") rather than a grid that
   starts at 0 and leaves an odd last panel. This avoids sliver triangles at the nose. Exact litres stations
   always win a tie closer than 1e-6 mm.
5. **The outline loop includes a swallow's notch.** After the left rail the loop follows the left piece's wall
   corner to the crotch, then back along the right piece's, so the closed outline is TEMPLATE's silhouette rather
   than a line straight across the open notch. Every point is still a mesh vertex.
6. **SurfaceRing ranges.** `bottomEdge` offsets are measured from `pieces[0].first` and hold one entry when both
   sides weld to one point. At the crotch, the face's shared wall points sit right after the ring's loop, outside
   its `pieces` (they aren't on the slice). `stringerLines` reads them from there.
7. **The plan's interactive tracer checkpoint was not taken.** The orchestrator's rulings set one checkpoint, at
   Task 3. The tracer's verify passed end to end before expansion, as the autonomous gate requires.

## Known Stubs

None. Nothing in these files is a placeholder. The surface carries no fins and no blank on purpose (D-16; 16-06
draws the fins on screen).

## Threat surface

T-16-06 is mitigated as planned. The length is refused outside 60"–120" and when it isn't a number. At every
station the width, thickness and rocker, and every placed point, are checked to be finite before anything is
assembled, and the error names the value and the station. Point counts are fixed, so memory is bounded by length
(at most about 53k vertices on the 40 boards). T-16-07: slices, outline and profile are read off the mesh's own
vertices (identity tests on all 40 boards). No new network, auth or storage surface.

## Self-Check: PASSED

- FOUND: lib/geometry/board-surface.ts, lib/geometry/board-surface.test.ts, lib/geometry/board-surface-render.ts,
  lib/geometry/board-surface-render.test.ts, pictures/16-03-surface-fish-shortboard.png,
  pictures/16-03-pictures-source.tar.gz
- FOUND commits: 0ce3b310 (Task 1), 78a6c73f (Task 2), 26f29b02 (pictures)
- No scratch script under the repo or `.planning` (only the archive).

## D-30 follow-up (2026-11-04)

At the Wave 2 look the founder gave the hard edge's fade a start setting as well as an end (D-30, carried out by
16-02 and merged here from `board-3d`, d7baafee). The fade now blends from "Hard Edge Blends From" (12"–30", 18"
by default) to "Hard Edge Ends At" (L/6 + 18", which is 30" on a 6'0" and 36" on a 9'0"). The surface's sections
already followed it through `boardSections`. Two changes were left for this plan:

- **The two one-argument calls** now pass the board's length: `hardEdgeEndsAt(rails, length)` in
  `surfaceStations` and in its test.
- **A ring where the blend begins.** The start used to be the 12" station, which always had a ring. Now that it's
  a setting, `surfaceStations` also places a ring at `hardEdgeBlendsFrom(rails, length)`. The stations are
  otherwise unchanged (evenly spaced, at most ½").
- **New tests.** A Fish set to blend from 20½" and end at 33" gets a ring exactly at both. It is fully hard at the
  start, gone at the end, and closed and under VOLUME between them. And on all 40 boards, at the new defaults, each
  ring is its `boardSections` section: the same station, the same width, the same hard weight.
- **Counts.** The two test files pass 220 (208 + 12). `npm test`: 166 files, 7112 passed, 2 skipped. Three sweeps
  (rack-stand-in, blank-fit, finished-rail) timed out under load; run alone, all 144 of their tests pass.
  `tsc` is clean, and `lint` shows 0 errors.

**The gap at the new defaults** (the same `gap-table.ts`, every board 0 mesh faults): the closest is −0.030% and the
worst is **−0.146%** (longboard · swallow · hard). All 40 are still inside (−0.15%, 0], but only just. The tracer
boards are fine: Shortboard 29.5968 L against VOLUME's 29.6128 L (−0.054%), Fish 34.6293 L against 34.6547 L
(−0.073%). The soft boards don't move. Every hard-edged longboard roughly doubled, from about −0.06% to −0.13% to
−0.146%.

**The finding this raised: under the old rule a long fade on a longboard broke the 0.15% line.** Within a fade
the litres blended the two sections' AREAS, while the 3D board blends their POINTS, which holds a little less foam;
on a longboard, with its long default fade, that put the board up to about 0.3% under VOLUME on a fade set to the
centre. The founder chose one rule (D-31, below).

## D-31 (level variant) — inside the fade the litres count the foam the 3D board draws (2026-11-04)

**In one sentence for the founder:** inside the hard edge's fade the litres now count the foam the 3D board draws,
corrected by the same hair the drawn board loses to its straight segments everywhere else — so VOLUME, the 3D board
and the STL describe one board, and the longboards no longer stand out.

How it's built (one blend, read by both):
- `lib/geometry/finished-rail.ts` now owns the 3D board's sampling and the fade's blend: `sampledFinishedRail`
  (the finished rail at the section's half-width, carried flat or cut at the stringer, 48 / 32 / 24 points —
  `SECTION_POINTS`, moved here unchanged from `board-surface.ts`), `blendFinishedRails` (the point-for-point blend
  by the hard weight) and `sampledSectionArea` (the foam a sampled half and its mirror enclose).
- `boardSectionsWith` (`volume.ts`), at a fading station: `blended` is that ring (replacing `hardResult`, which no
  reader needs any more), and `area` is `fadingSectionArea` — the two end sections' exact areas blended by the weight,
  plus how far the drawn ring's area stands from the two end rings' areas blended alike. That is the coordinator's
  `ring + (1−w)·(exact_tucked − ring_tucked) + w·(exact_hard − ring_hard)`, written so the correction is exactly 0
  at w = 0 and w = 1: the fade is level with the stations either side by construction, and every station at weight
  0 or 1 is unchanged operation for operation (the 40-board pin under `HARD_EDGE_SWITCH` passes untouched).
  `blendArea` keeps `area + blendArea` equal to the station's cut area: the two cuts blended by the weight, less
  `area` (the cut has no drawn ring of its own).
- `board-surface.ts` no longer samples or blends: it reads `BoardSection.blended` inside the fade and
  `sampledFinishedRail` elsewhere, moved out onto a swallow's notch wall where there is one. Nothing is blended in
  two places.

Tests: `volume.test.ts` — the continuity at both ends of the fade at 1e-4 mm steps (unchanged, still under 1e-6
relative); the midway station is the level-variant area to 1e-9 and its ring is `blendFinishedRails` of the two end
rings; the correction vanishes exactly (`toBe`) at w = 0 and w = 1; and on every hard-edged board of the forty, every
fading station is the level-variant area to 1e-9 relative. `board-surface.test.ts` — on every hard-edged board,
every fading station's `area` equals the polygon area of the ring the mesh actually draws there, plus the end rings'
blended shortfalls, to 1e-9 relative; the drawn ring IS `BoardSection.blended`; and the 0.15% rule now also runs on
every hard-edged board at both long fades (40 more cases).

**The gap, measured** (scratch `gap-table.ts` and `probe-long-fade.ts`, archived):
- At the defaults, all 40 boards: worst -0.070% (midlength|swallow|hard); closest -0.030%. Every board 0 mesh faults.
- At both long fades, every hard-edged board: from -0.035% (closest) to -0.070% (worst). The longboards
  sit inside the shortboards', fishes' and mid-lengths' own band; a long fade no longer changes the gap.

| Hard-edged board | At the defaults | Blends from 12", ends at the centre | Blends from 30", ends at the centre |
|---|---:|---:|---:|
| shortboard · asis · hard | -0.044% | -0.044% | -0.044% |
| shortboard · swallow · hard | -0.059% | -0.059% | -0.060% |
| shortboard · diamond · hard | -0.052% | -0.052% | -0.052% |
| shortboard · pin · hard | -0.045% | -0.045% | -0.045% |
| shortboard · round · hard | -0.045% | -0.045% | -0.045% |
| fish · asis · hard | -0.064% | -0.064% | -0.064% |
| fish · swallow · hard | -0.064% | -0.064% | -0.064% |
| fish · diamond · hard | -0.063% | -0.063% | -0.064% |
| fish · pin · hard | -0.040% | -0.040% | -0.040% |
| fish · round · hard | -0.040% | -0.040% | -0.040% |
| midlength · asis · hard | -0.048% | -0.048% | -0.047% |
| midlength · swallow · hard | -0.070% | -0.070% | -0.070% |
| midlength · diamond · hard | -0.045% | -0.045% | -0.045% |
| midlength · pin · hard | -0.048% | -0.048% | -0.047% |
| midlength · round · hard | -0.048% | -0.048% | -0.047% |
| longboard · asis · hard | -0.047% | -0.046% | -0.043% |
| longboard · swallow · hard | -0.060% | -0.056% | -0.053% |
| longboard · diamond · hard | -0.057% | -0.054% | -0.050% |
| longboard · pin · hard | -0.038% | -0.038% | -0.035% |
| longboard · round · hard | -0.038% | -0.038% | -0.035% |

The 40 boards at the defaults under D-31:

| Board | Mesh (L) | VOLUME (L) | Gap | Vertices | Triangles | Build ms | renderMesh ms | Mesh faults |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| shortboard · asis · hard | 29.5968 | 29.6099 | -0.044% | 39594 | 79184 | 52 | 31 | 0 |
| shortboard · asis · soft | 29.5582 | 29.5712 | -0.044% | 39594 | 79184 | 42 | 51 | 0 |
| shortboard · swallow · hard | 30.6149 | 30.6331 | -0.059% | 39457 | 78910 | 47 | 56 | 0 |
| shortboard · swallow · soft | 30.5766 | 30.5947 | -0.059% | 39457 | 78910 | 58 | 66 | 0 |
| shortboard · diamond · hard | 30.1630 | 30.1786 | -0.052% | 38988 | 77972 | 49 | 66 | 0 |
| shortboard · diamond · soft | 30.1247 | 30.1402 | -0.051% | 38988 | 77972 | 41 | 23 | 0 |
| shortboard · pin · hard | 28.7567 | 28.7697 | -0.045% | 39392 | 78780 | 108 | 34 | 0 |
| shortboard · pin · soft | 28.7183 | 28.7313 | -0.045% | 39392 | 78780 | 56 | 25 | 0 |
| shortboard · round · hard | 28.7567 | 28.7697 | -0.045% | 39392 | 78780 | 42 | 23 | 0 |
| shortboard · round · soft | 28.7183 | 28.7313 | -0.045% | 39392 | 78780 | 45 | 35 | 0 |
| fish · asis · hard | 34.6293 | 34.6514 | -0.064% | 37033 | 74062 | 56 | 17 | 0 |
| fish · asis · soft | 34.5970 | 34.6190 | -0.064% | 37033 | 74062 | 38 | 17 | 0 |
| fish · swallow · hard | 34.6293 | 34.6514 | -0.064% | 37033 | 74062 | 44 | 39 | 0 |
| fish · swallow · soft | 34.5970 | 34.6190 | -0.064% | 37033 | 74062 | 45 | 18 | 0 |
| fish · diamond · hard | 34.0560 | 34.0776 | -0.063% | 36564 | 73124 | 45 | 16 | 0 |
| fish · diamond · soft | 34.0239 | 34.0453 | -0.063% | 36564 | 73124 | 48 | 22 | 0 |
| fish · pin · hard | 31.8627 | 31.8755 | -0.040% | 36968 | 73932 | 40 | 17 | 0 |
| fish · pin · soft | 31.8304 | 31.8432 | -0.040% | 36968 | 73932 | 38 | 21 | 0 |
| fish · round · hard | 31.8627 | 31.8755 | -0.040% | 36968 | 73932 | 42 | 22 | 0 |
| fish · round · soft | 31.8304 | 31.8432 | -0.040% | 36968 | 73932 | 39 | 17 | 0 |
| midlength · asis · hard | 49.3738 | 49.3974 | -0.048% | 45452 | 90900 | 52 | 26 | 0 |
| midlength · asis · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 43 | 19 | 0 |
| midlength · swallow · hard | 51.6172 | 51.6536 | -0.070% | 45719 | 91434 | 56 | 22 | 0 |
| midlength · swallow · soft | 51.5793 | 51.6155 | -0.070% | 45315 | 90626 | 43 | 24 | 0 |
| midlength · diamond · hard | 50.9573 | 50.9800 | -0.045% | 45654 | 91304 | 45 | 20 | 0 |
| midlength · diamond · soft | 50.9195 | 50.9423 | -0.045% | 45250 | 90496 | 42 | 25 | 0 |
| midlength · pin · hard | 49.3738 | 49.3974 | -0.048% | 45452 | 90900 | 47 | 26 | 0 |
| midlength · pin · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 42 | 19 | 0 |
| midlength · round · hard | 49.3738 | 49.3974 | -0.048% | 45452 | 90900 | 44 | 21 | 0 |
| midlength · round · soft | 49.3359 | 49.3602 | -0.049% | 45048 | 90092 | 41 | 24 | 0 |
| longboard · asis · hard | 74.5014 | 74.5361 | -0.047% | 53330 | 106656 | 54 | 29 | 0 |
| longboard · asis · soft | 73.5369 | 73.5743 | -0.051% | 53330 | 106656 | 48 | 22 | 0 |
| longboard · swallow · hard | 75.0511 | 75.0962 | -0.060% | 53395 | 106786 | 53 | 27 | 0 |
| longboard · swallow · soft | 74.0895 | 74.1387 | -0.066% | 53303 | 106602 | 52 | 29 | 0 |
| longboard · diamond · hard | 74.1771 | 74.2196 | -0.057% | 51916 | 103828 | 51 | 25 | 0 |
| longboard · diamond · soft | 73.2160 | 73.2621 | -0.063% | 51778 | 103552 | 51 | 21 | 0 |
| longboard · pin · hard | 69.8695 | 69.8961 | -0.038% | 53128 | 106252 | 59 | 28 | 0 |
| longboard · pin · soft | 68.9185 | 68.9394 | -0.030% | 52024 | 104044 | 45 | 22 | 0 |
| longboard · round · hard | 69.8695 | 69.8961 | -0.038% | 53128 | 106252 | 48 | 22 | 0 |
| longboard · round · soft | 68.9185 | 68.9394 | -0.030% | 52024 | 104044 | 50 | 100 | 0 |

The preset cards (as they open, two decimals): Shortboard 29.61 L, Fish 34.65 L, Mid-length 49.40 L — the same as
after D-30; the Longboard 72.35 L and the stock 6'0" board 30.29 L, unmoved. `phase14-preset-figures.json` changed
in exactly its three hard-edged litres lines (29.61284 → 29.60987, 34.65472 → 34.65137, 49.40129 → 49.39740). The
desktop baseline (webpack, port 3203) passed all five screens unchanged, so VOLUME was **not** re-recorded.

## Founder's look

Accepted as drawn at the Wave 2 look, 2026-11-04; the fade's design change (D-30) reached the surface through boardSections, and on the long-fade finding the founder chose one rule — the litres count exactly the foam the 3D board draws (D-31).
