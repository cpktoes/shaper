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

## Founder's look

Pending — presented by the orchestrator at the Wave 2 checkpoint.
