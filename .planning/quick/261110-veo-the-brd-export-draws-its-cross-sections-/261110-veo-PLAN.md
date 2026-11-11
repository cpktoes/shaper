---
phase: quick-261110-veo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/bezier-fit.ts
  - lib/geometry/bezier-fit.test.ts
  - lib/geometry/board-surface.ts
  - lib/export/brd.ts
  - lib/export/brd.test.ts
  - components/3d/three-d-copy.ts
  - components/3d/three-d-controls.tsx
  - components/3d/three-d-screen.tsx
  - components/3d/export-cnc.ts
  - e2e/three-d-export.spec.ts
autonomous: true
requirements: [QT-261110-veo]
estimate:
  # One executor, in this worktree, three tasks. Task 1 (a least-squares handle fitter, one surface reader, the new
  # section writer with its station rule, spread rule and board-wide added knots, and the rewritten brd tests) is most
  # of it; Task 2 is one reader and the outline swap with its tests; Task 3 is one line of words, two props, one call
  # and a browser spec, plus the three sample files. Calibration: factor 1, 0 samples.
  tokens: 125000
  raw_tokens: 125000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "Every cross-section in a .brd file has the same number of knots as every other section of that board (the two one-knot sections closing the tips aside), and knot i is the same place on every section: knot 1 the bottom at the stringer, then any channel walls' feet and tops in a fixed order, then the bottom edge (the tuck), the rail's widest point, the deck shoulder, and last the deck at the stringer (brief decision 1)."
    - "On the Deep Single + 4 channels Shortboard each channel wall keeps the same two knot numbers on every section. Where the wall stands, both knots sit exactly on the wall (same distance across as the wall in the drawn board) and both are corners; where it doesn't stand yet, both are smooth knots lying on the bottom, at least 0.5 mm apart. No two neighbouring knots of any section ever sit on one point (the founder's note of 2026-11-10: the zigzags come where sharp knots don't line up section to section)."
    - "The flat Shortboard (the founder's known-good file: 'The flat one looks good') stays at least as smooth as now: five knots a section, at most one corner a section and only ever at the bottom edge, every smooth knot's two handles in one straight line through it, and each knot's share of the width and of the thickness moving by no more than a fifth from one section to the next."
    - "A file carries about a dozen sections at chosen stations (1\" in from each tip, 12\" from each tip, the wide point, each bottom cut's start, deepest and end, the channels' start, deepest and end, and no two neighbours more than 8\" apart), plus a one-knot section at the tail and at the nose. Every section sits within 1 mm of the drawn board at its own station on the three sample boards (brief decision 2)."
    - "A swallow tail is written as a wide square tail at the width of its points: the outline runs (0, 0) to (0, half the points' width) as a corner and then up the rail, its x never going backwards; no section is written inside the notch; the rocker and deck run back to x = 0 at the points' bottom and deck. A diamond tail's outline is unchanged and never turns back either (brief decision 3)."
    - "On the 3D page, a board with a swallow tail shows one more line under the export button, 'A swallow tail is written as a square tail at its points — cut the swallow by hand.'; any other board does not (brief decision 4)."
    - "The outline, rocker and deck keep their existing fit within 0.5 mm, and the outline's x never decreases on any preset, a swallow or a diamond (brief decision 5). The file still reads back the board's length, width, thickness and section count, and the same board still gives the same bytes."
  artifacts:
    - path: "lib/geometry/bezier-fit.ts"
      provides: "fitBezierSpan — the two handles of one cubic between two fixed knots with fixed directions, least squares"
      contains: "export function fitBezierSpan"
    - path: "lib/geometry/board-surface.ts"
      provides: "BoardSurface.channelWallRows; boardSectionHalves (every full ring's half, slot for slot, with the wall, bottom-edge and widest slots); boardRailHalfOutline (the right rail, tail to nose)"
      contains: "export function boardSectionHalves"
    - path: "lib/export/brd.ts"
      provides: "brdBottomStations, brdTailWrittenSquare, brdCurves with fixed knots at chosen stations, brdText, brdFile (bottomStations option)"
      contains: "export function brdBottomStations"
    - path: "components/3d/three-d-copy.ts"
      provides: "exportSwallowNote"
      contains: "exportSwallowNote"
  key_links:
    - from: "lib/export/brd.ts brdCurves"
      to: "lib/geometry/board-surface.ts boardSectionHalves"
      via: "every section is a ring of the drawn mesh, slot for slot, so knot i is read from the same slot on every section"
      pattern: "boardSectionHalves\\("
    - from: "lib/export/brd.ts brdCurves"
      to: "lib/geometry/bezier-fit.ts fitBezierSpan"
      via: "only the handles are fitted; the knots are the board's own places"
      pattern: "fitBezierSpan\\("
    - from: "components/3d/three-d-screen.tsx onExport"
      to: "components/3d/export-cnc.ts exportBrd"
      via: "the bottom's stations (brdBottomStations of the store's resolvedBottom) handed to the writer inside the tap"
      pattern: "brdBottomStations\\("
---

<objective>
Make the `.brd` file's cross-sections the way AkuShaper writes its own, so Shape3D's and AkuShaper's 3D views draw a
smooth board instead of zigzags, and write a swallow as a square tail so a Fish opens in 3D (the founder's findings,
2026-11-10, in BRIEF.md; its six decisions are locked).

The founder added one fact after the brief (2026-11-10): **"The flat one looks good."** — our 261110-tvk
`3-Shortboard-Flat.brd` (about 50 sections, 5–14 knots each, one corner at most) draws cleanly in Shape3D's 3D view. So
mismatched knot counts alone do not tear a smooth bottom; the zigzags on the Deep Single + 4 channels board come where
the sharp knots (channel walls, up to 5 a section) and the concave's shape don't line up knot for knot between
neighbouring sections. The brief's decisions stand, and this plan's tests and sample files must prove (F-1) the channel
walls keep the same knot numbers from section to section, and (F-2) the flat Shortboard comes out at least as smooth as
now — it is the known-good reference.

Purpose: a shaper who opens our file in either program sees the board we drew, in 3D, with a smooth bottom.
Output: the new section writer and the square-swallow outline in `lib/export/brd.ts` (with one fitter function and two
surface readers under `lib/geometry/`), one line on the 3D page, and three v2 sample files for the founder.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261110-veo-the-brd-export-draws-its-cross-sections-/BRIEF.md
@.planning/quick/261110-tvk-export-3d-files-downloads-one-akushaper-/261110-tvk-SUMMARY.md
@CLAUDE.md
@lib/export/brd.ts
@lib/export/brd.test.ts
@lib/geometry/bezier-fit.ts
@lib/geometry/board-surface.ts

Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`). Never `cd`
anywhere; use absolute paths and `git -C`. No push, no merge. Scratch scripts go in
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/` and import the
library by absolute path (see `veo-measure.ts` there, the planner's measuring script — read it, it is a working sketch of
the section fit below). The founder's four unscrambled AkuShaper files in `.../scratchpad/brd/out/*.brd.txt` are other
shapers' boards: read only, never copied into the repo or a fixture.

## Facts measured at plan time (`veo-measure.ts`, fixed slots + least-squares handles, every full ring 1" from the tips)

The surface already lays every ring of a board out slot for slot (`SURFACE_POINTS`: deck run 48, rail run 32, bottom run
24, or 32 on a board with channels; the bottom edge always on ring row 78; channel walls on the same rows on every ring,
`channelWallRows` inside `buildBoardSurface`). Read bottom-first (the ring's `right` reversed), with n points:
slot 0 = bottom at the stringer, slot n-1-78 = the bottom edge, slot n-48 = the rail's widest point, slot n-1-36 = the
deck shoulder, slot n-1 = deck at the stringer; a wall's foot is n-1-(row+1) and its top n-1-row.

| Board | Knots | Worst section miss | Notes |
| --- | --- | --- | --- |
| Shortboard, flat | 5 | 0.761 mm | at most 1 corner a section (the tail's hard edge) |
| Fish | 5 | 0.816 mm | |
| Shortboard, Deep Single + 4 channels | 9 (5 + 2 walls x 2) | 0.912 mm | wall rows 99 and 89 |
| Panel Vee / Rolled Vee / Belly / Tri-Plane, 8 channels, Deep Single + 6 channels (Shortboard, Fish) | 5–13 | 0.54–0.83 mm | |
| Longboard (flat, soft, vees, belly, channels) | 5 | 1.27–1.61 mm | the rail span; one added mid-rail knot brings it to 0.79 |
| Early Double, Double Concave Exit, Spiral Vee | 5 | 3.2–3.8 mm | the bottom span; two added bottom knots bring it to 0.70–0.87 |

- Deck shoulder slot tried at 24 / 32 / 36 / 40 / 43 of the deck run: 36 is the best on all three sample boards.
- Forward of the channels a wall has no step, so its foot and top are one welded point (two knots on one point), and on
  the narrow nose the walls are pushed out onto the bottom edge (four knots on the bottom edge's point). Both must be
  spread apart (Task 1, spread rule).
- Stations 12" apart left a straight blend of two neighbours 3.7 mm off the flat Shortboard at 18" (the tail's hard edge
  fading out); 8" apart gave 0.93 mm, with 12 sections on the 6'2" Shortboard and the Fish. Hence the 8" rule below.
- Between neighbouring sections the five anchor knots' share of the width moves at most 0.07 and of the thickness at
  most 0.13 (8" spacing). Wall knots move up to 0.39 in share of the width, rightly: a wall stands a fixed distance from
  the stringer while the board narrows.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Every section carries the same knots in the same places, at a dozen chosen stations (brief decisions 1, 2; founder facts F-1, F-2)</name>
  <files>lib/geometry/bezier-fit.ts, lib/geometry/bezier-fit.test.ts, lib/geometry/board-surface.ts, lib/export/brd.ts, lib/export/brd.test.ts</files>
  <behavior>
    - fitBezierSpan on a quarter circle of radius 100 with its exact end directions sits within 0.1 of the circle both ways (bezierDeviation); on a straight run it sits within 1e-9 with both handles on the line; with only its two end points it puts each handle a third of the chord along its given direction; with a zero chord both handles are the point; non-finite input throws; same input, same output.
    - boardSectionHalves on the three test boards: one half per ring that is one piece with width, tail to nose; every half has the ring's own point count; points[0] is the bottom at the stringer and the last point the deck at the stringer (distance across 0); points[bottomEdge] is the ring's bottom-edge vertex; points[widest] reaches the half's furthest distance across; `walls` is empty on the flat Shortboard and the Fish and has two entries on the Deep Single + 4 channels board, innermost first, foot before top; on that board some half has a wall standing (foot and top at the same distance across, different heights) and some half has it welded (foot and top the same point).
    - brdCurves on all three boards: every section has exactly `sectionKnotRoles.length` knots; knot 1 is at distance across 0 on the bottom and the last at distance across 0 on the deck; sectionKnotRoles reads bottomStringer, then (Deep Single board only) wallFoot, wallTop, wallFoot, wallTop, then bottomEdge, widest, shoulder, deckStringer — the flat Shortboard and the Fish have exactly five; every section sits within BRD_SECTION_TARGET_MM (1 mm) of its own points (bezierDeviation); no two neighbouring knots of any section are closer than 1e-6 mm.
    - Stations: strictly between 0 and the length, rising; one within 1" of 1" from each tip (for the Fish, the first section stands at the crotch's ring, never inside the notch), one at 12" from each tip, one at the wide point's ring; no two neighbours more than 8.5" apart; with the Deep Single board's bottomStations, every bottom station between the two 1" sections has a section within 1" of it.
    - F-1, the Deep Single + 4 channels board: for each wall, its foot and top knot numbers are the same on every section; on every section whose half has that wall standing at least BRD_KNOT_GAP_MM tall, both knots are corners and their distance across equals the half's wall slot's within 1e-6 mm, their height difference the wall's; on every other section both knots are smooth, lie on the section's points within 1e-6 mm, and are at least BRD_KNOT_GAP_MM apart from each other and from their neighbours; no section has a corner at any knot other than the wall knots and the bottom edge.
    - F-2, the flat Shortboard: five knots a section; corners only ever at the bottom edge, never more than one a section; every knot marked smooth has its incoming and outgoing handles in one straight line through its point (cross product within 1e-6 of the handle lengths' product); for each knot, its distance across divided by the section's widest and its height divided by the section's deck height change by at most 0.2 between neighbouring sections (the same bound also holds for the anchor knots of the Fish and the Deep Single board).
    - The file: the first and last sections are the one-knot all-zero section at 0.0 and at the length, on every board (square tail too); the sections between are curves.sections in order, each with the same knot count; sectionCount is curves.sections.length; a section's first knot's incoming handle mirrors its outgoing one across the stringer and the last knot's outgoing mirrors its incoming (as now); the same board gives the same bytes twice.
  </behavior>
  <action>
**Fitter (lib/geometry/bezier-fit.ts).** Add and export fitBezierSpan(points, outgoing, incoming) returning the pair
{ after, before }: the outgoing handle of the span's first knot and the incoming handle of its last. `points` runs from
the first knot's point to the last knot's point inclusive; `outgoing` is the unit direction the curve leaves the first
knot, `incoming` the unit direction it arrives at the last (both in the direction of travel). It is Schneider's least
squares on the two handle lengths with the directions held: chord-length parameters, solve the 2 by 2 normal equations
for the lengths, then eight rounds of Newton re-parameterisation, keeping the round with the smallest bezierDeviation; a
length that comes out not positive, or not finite, or a singular system, falls back to a third of the chord for both;
fewer than three points gives a third of the chord along each direction; a zero chord gives both handles at the point.
Throws on a non-finite coordinate, like fitBezierKnots. fitBezierKnots stays as it is (the outline, rocker and deck keep
it, brief decision 5). Pure, no units. Tests per the behaviour above in bezier-fit.test.ts, synthetic curves only.

**Surface (lib/geometry/board-surface.ts).** Additive only; nothing the 3D screen or the CNC files read changes. (a) Add
`channelWallRows: number[]` to BoardSurface and return it from buildBoardSurface: the local channelWallRows rows (each
wall's top row in the ring; its foot is the next row), innermost wall first, empty on a board without channels. (b) Add
and export boardSectionHalves(surface) returning { halves, walls, bottomEdge, widest }: `halves` is one entry
{ station, points } per ring that is one piece with width (outside a swallow's notch, never a tip's edge), tail to nose,
its `points` the ring's `right` slots reversed — bottom at the stringer first, deck at the stringer last — with EVERY
slot kept (a slot the surface welded repeats its neighbour's point), so slot k is the same place on every half; `walls`
is each channel wall's { foot, top } slot in that order (foot = n-1-(row+1), top = n-1-row), innermost first;
`bottomEdge` (n-1-78, from the file's own BOTTOM_EDGE) and `widest` (n-SURFACE_POINTS.deck) are slot numbers. Remove
boardHalfSlices (brd.ts was its only caller) and its test. Do NOT touch lib/geometry/bottom.ts or volume.ts (another
session is changing how channels keep their walls) — read the surface as it is.

**Writer (lib/export/brd.ts).** Replace the section part of brdCurves; the outline, rocker and deck stay as they are in
this task (Task 2 changes the outline). New exported constants, each with a one-line reason: BRD_SECTION_TARGET_MM = 1,
BRD_KNOT_GAP_MM = 0.5, BRD_SHOULDER_SLOT = 36 (measured best of 24/32/36/40/43), BRD_TIP_SECTION_IN = 1,
BRD_SECTION_SPACING_IN = 8, BRD_ADDED_KNOTS_MAX = 4. Every inch figure goes through inchesToMm from units.ts.

brdCurves gains a second argument `options` with `bottomStations?: readonly Mm[]` (default none). Add and export
brdBottomStations(resolved: ResolvedBottom) from lib/geometry/bottom's types: the start, deepest and end of each of the
nose, center and tail cuts whose kind is not flat and whose depth is above 0, and the channels' start, deepest and end
when their count and depth are above 0; sorted, repeats dropped. brdText(surface, options) and brdFile(surface, name,
options) pass it through.

Stations (brief decision 2). From boardSectionHalves' halves: the first group is the half nearest 1" from the tail, 12"
from the tail, the half that reaches furthest across (the wide point), 12" from the nose, 1" from the nose — each the
nearest eligible half, so on a swallow the 1" station lands on the crotch's ring, the first full one; repeats dropped.
Then each bottom station strictly between the tips adds its nearest half unless a kept section is within 1" of it. Then
every gap between neighbours wider than 8" gets ceil(gap / 8") - 1 stations evenly spaced in it, each its nearest half
not already kept. Sorted tail to nose.

Knots (brief decision 1). The board's slot list, bottom-first: 0 (role bottomStringer), each wall's foot then top
(wallFoot, wallTop) innermost first, bottomEdge, widest, n-1-BRD_SHOULDER_SLOT (shoulder), n-1 (deckStringer). Export
the roles as BrdCurves.sectionKnotRoles (one per knot number, the same for every section; a type BrdKnotRole that also
has "added"). For each chosen half, the section is its points as (distance across, height above points[0]) in mm, with
an arc position for every slot (a welded slot adds no length). A wall "stands" on a section when its top is at least
BRD_KNOT_GAP_MM from its foot. Fixed knots: the five anchors and both knots of a standing wall, each at its slot's point.
Movable knots: both knots of a wall that doesn't stand, and any added knot: each starts at its slot's arc position, then
within the stretch between the fixed knots either side of it the movable ones are spread so neighbouring knots are at
least BRD_KNOT_GAP_MM apart along the section (a pass outward from the inner fixed knot, then a pass inward from the
outer one; if the stretch is too short for them all, evenly through it), and each point is read on the section at its
arc position. Directions: bottomStringer level, travelling outward (+x); deckStringer level, travelling back to the
stringer (-x); widest vertical (travelling up) when its point is the half's furthest across, else as below; a standing
wall's two knots are corners, the face between them straight (handles a third of the way along it) and their other
sides read from the section; every other knot reads the nearest section points at least BRD_KNOT_GAP_MM away on each
side, is a corner when those two chords turn more than 30 degrees (each side then takes its own chord), and otherwise
both sides take the chord between those two points. `smooth` is false exactly at corners (so standing walls false,
non-standing walls true). Each span between neighbouring knots is fitted with fitBezierSpan on the section's points
between them (the two knot points at the ends, duplicates dropped). This is the method `veo-measure.ts` sketches.

Added knots (board-wide, so the count and places stay the same on every section). After fitting every chosen section,
while some section misses its points by more than BRD_SECTION_TARGET_MM and fewer than BRD_ADDED_KNOTS_MAX have been
added: take the worst span (by bezierDeviation of that span's points against its two knots) over all sections whose two
knots' slots are at least 2 apart, add the slot halfway between them (rounded down) to the board's slot list as an
"added" knot, and refit every section. This is what puts one mid-rail knot on a Longboard and two bottom knots on a
double concave (measured, see context); the three sample boards need none.

BrdSection becomes { station, points, knots } (points = the section with consecutive repeats dropped, what
bezierDeviation is measured against); the inNotch field and the notch branch of sectionKnots go. brdText writes the
one-knot all-zero section at 0.0 and at the length on every board (as AkuShaper's own Scoop does at its square tail),
replacing 261110-tvk's squared-tail exception; real sections are never at either tip now. Update the header comment of
brd.ts to say how sections are written now (chosen stations, the same knots in the same places, only the handles fitted).

**Tests (lib/export/brd.test.ts).** Rewrite per the behaviour block, on the existing three CASES. cutSurface also returns
the resolved bottom so the Deep Single tests pass brdBottomStations(resolved). Replace the boardHalfSlices reader test
with the boardSectionHalves one; keep the boardStringerLines, boardFileHalfOutline (Task 2 replaces it), formatBrdNumber
and readBrdText tests; replace "a section at every litres station" with the tip-section and same-knot-count checks;
"fits every curve" keeps 0.5 mm and fewer than 40 knots for the outline, rocker and deck and checks sections against
BRD_SECTION_TARGET_MM; sectionCount equals curves.sections.length; replace the cut board's sharp-knot test with the F-1
wall test, and the Fish's notch-section test with "every Fish section starts and ends on the stringer, the first at the
crotch" (its outline part stays until Task 2). Add the F-2 flat Shortboard test. Build surfaces at module scope as now;
anything that builds another surface does it inside its own `it`, and every test stays well under 5 s.

Commit (plain English, for a shaper, ending with the Co-Authored-By line): "The .brd file's cross-sections now carry the
same knots in the same places on every section, at a dozen chosen stations".
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 && npx vitest run lib/geometry/bezier-fit.test.ts lib/export/brd.test.ts lib/export/cnc-files.test.ts lib/export/formats.test.ts</automated>
  </verify>
  <done>The four files pass (cnc-files and formats prove nothing the CNC writers read changed); a scratch run of brdCurves on the three boards prints sections, knots per section and worst section miss, all within 1 mm (expected about 12 sections; 5, 5 and 9 knots); committed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: A swallow is written as a wide square tail at its points (brief decisions 3, 5)</name>
  <files>lib/geometry/board-surface.ts, lib/export/brd.ts, lib/export/brd.test.ts</files>
  <behavior>
    - boardRailHalfOutline on the three boards: one point per ring, tail to nose, the ring's widest vertex on the right rail; x never decreases; the last at the length; its widest as wide as boardFileOutlineLoop's; on the Fish its first point is at x = 0, half the swallow points' width across.
    - brdCurves(fish).outline: the first knot is (0, 0), the second (0, half the points' width) and a corner, every knot after has x at or above the one before, and the curve sampled 64 times a span never steps back in x by more than 1e-6 mm; within 0.5 mm of its points; the widest knot still the board's wide point.
    - For each preset as it opens and re-cut with the fixture's swallow and diamond tails (12 boards, `phase16Boards()` labels `${id}|asis|hard`, `|swallow|hard`, `|diamond|hard`): the written outline's sampled x never decreases, and its first knot is (0, 0); the diamond's outline equals what boardRailHalfOutline already gives (its outline never turned back).
    - On the Fish, the bottom and deck curves reach x = 0, and their heights there are the swallow point's bottom and deck (ring 0's points); no written section stands inside the notch (every section's station is at or past the crotch's).
    - brdTailWrittenSquare is true for the Fish and the swallow re-cuts, false for the flat Shortboard, the Deep Single board and the diamonds.
  </behavior>
  <action>
**Surface (lib/geometry/board-surface.ts).** Add and export boardRailHalfOutline(surface): the right rail of
outlineRails, tail to nose, as mesh points — on a swallow it starts at the swallow's point (x = 0) and never visits the
notch. Remove boardFileHalfOutline (brd.ts was its only caller; boardFileOutlineLoop and boardOutlineLoop stay exactly
as they are — the CNC files and the wire view read them).

**Writer (lib/export/brd.ts).** brdCurves' outline reads boardRailHalfOutline instead, with the existing (0, 0) prepended
when the first point stands off the stringer — on a swallow that makes the square tail at the points' width, and the
existing fitter already keeps (0, half-width) a corner as it does for the flat Shortboard's square tail (brief decision
3). Keep the widest knot level and the fit within 0.5 mm. The rocker and deck stay on boardStringerLines, which inside a
notch reads the notch wall's inner edge and so already carries both lines back to x = 0 at the points' bottom and deck
— the board written as if the notch were not cut; no section is written inside the notch (Task 1's stations). Add and
export brdTailWrittenSquare(surface): true when the surface has a swallow's notch (a ring of two pieces) — the tail the
file writes square. Update brd.ts's header comment: a swallow is written as a square tail at its points, to be cut by
hand.

**Tests (lib/export/brd.test.ts).** Replace the boardFileHalfOutline test with the boardRailHalfOutline one and the
Fish's crotch-outline checks with the square-tail ones, per the behaviour block. The twelve-board outline test builds
each surface inside its own `it` (describe.each over the labels).

Commit: "A swallow tail is now written into the .brd file as a square tail at its points, so a Fish opens in 3D".
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 && npx vitest run lib/export/brd.test.ts lib/export/cnc-files.test.ts</automated>
  </verify>
  <done>Both files pass; the Fish's outline starts (0, 0) to (0, half the points' width) and never turns back; committed.</done>
</task>

<task type="auto">
  <name>Task 3: The 3D page hands the bottom's stations to the file and says when a swallow is written square; the v2 sample files (brief decisions 2, 4, 6)</name>
  <files>components/3d/three-d-copy.ts, components/3d/three-d-controls.tsx, components/3d/three-d-screen.tsx, components/3d/export-cnc.ts, e2e/three-d-export.spec.ts</files>
  <action>
**Words (three-d-copy.ts).** After exportNote add exportSwallowNote: "A swallow tail is written as a square tail at its
points — cut the swallow by hand." with a comment citing quick 261110-veo, brief decision 4 (the em dash as written).

**Page.** export-cnc.ts: exportBrd(surface, boardName, bottomStations) passes { bottomStations } to brdFile; update its
comment. three-d-screen.tsx: take resolvedBottom from useDesign (it is in the store's value) and call exportBrd with
brdBottomStations(resolvedBottom) inside the same tap (nothing awaited); pass exportSwallowNote =
built.ok and brdTailWrittenSquare(built.surface) to ThreeDControls. three-d-controls.tsx: ThreeDControls takes
exportSwallowNote: boolean and hands it to ExportSection, which, when true, renders one more line directly under the
exportNote line with the same classes and `data-three-d-export-swallow`, before the status line. Nothing else on the
panel moves; a board without a swallow renders exactly what it renders now (the desktop baseline picture's board is not
a swallow).

**Browser spec (e2e/three-d-export.spec.ts).** Case 1 (the Fish): the swallow line is visible inside
[data-three-d-export], verbatim from THREE_D_COPY; every section the file holds with more than one knot has the same knot
count. Case 5 (the board a new shaper starts on): the swallow line has count 0. Words from THREE_D_COPY only.

**Sample files (brief decision 6, not committed).** A scratch script in the scratchpad (`veo-samples.ts`, absolute
imports, `npx tsx`) builds the three boards exactly as brd.test.ts does (the Fish, the Shortboard with a Deep Single
Concave and 4 channels via startingCut / startingChannels, the flat Shortboard), calls brdFile with
brdBottomStations(resolveBottom(...)) for the cut board, and writes `1-Fish.brd`,
`2-Shortboard-Deep-Single-4-Channels.brd` and `3-Shortboard-Flat.brd` to
`/Users/kontoes/Downloads/brd-tests/from-shaper-assistant/v2/` (create the folder; if the sandbox refuses the write,
write them to the scratchpad and say so for the orchestrator to copy). It prints one line per file: sections, knots per
section, the wall knot numbers (cut board), corners per section at most, worst section miss at its own station, and, as
information only, the worst halfway miss of a straight blend of two neighbouring sections scaled to the half-width and
deck height there (the planner's `blend` branch of veo-measure.ts does this). Put the table in the SUMMARY with the
plan-time numbers beside it, plus the section count on the four presets.

Commit: "The 3D page now says when a swallow tail is written square, and the .brd's sections stand where the bottom
changes".
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 && npx next typegen && npx tsc --noEmit && npm run lint && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop</automated>
  </verify>
  <done>typegen, tsc and lint clean; the 3D export browser spec passes on desktop; the three v2 files exist and the table is printed and in the SUMMARY; committed (AGENTS.md left out unless `next dev` rewrote it, in which case say so).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board on screen to downloaded file | the file is written from the very surface drawn; no new input crosses |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-veo-01 | Tampering | lib/export/brd.ts brdCurves | low | mitigate | every number is a finite surface value (formatBrdNumber still throws on NaN/infinity); tests read every written number back finite |
| T-veo-02 | Information disclosure | brdFile name | low | accept | unchanged: the board's name reaches only the file name via boardFileStem |
| T-veo-03 | Denial of service | the tap-time fit | low | mitigate | about a dozen sections and at most four added knots, fewer sections than 261110-tvk's fifty |
</threat_model>

<verification>
- `npx vitest run lib/geometry/bezier-fit.test.ts lib/export/brd.test.ts lib/export/brd-scramble.test.ts lib/export/cnc-files.test.ts lib/export/formats.test.ts` (never the whole suite).
- `npx next typegen && npx tsc --noEmit`, `npm run lint`.
- `PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop`, and `PW_PORT=3117 npx playwright test e2e/board-lock-screens.spec.ts -g "x-3d" --project=desktop` (it downloads the file on a locked board).
- The three v2 files in `~/Downloads/brd-tests/from-shaper-assistant/v2/` and the printed table.
</verification>

<success_criteria>
- Every section of every written file has the same knot count and the same knot order; the walls keep their knot numbers (F-1); the flat Shortboard keeps five smooth-handled knots with at most one corner (F-2).
- Every section within 1 mm of the drawn board at its own station on the three sample boards; outline, rocker and deck within 0.5 mm; outline x never decreasing on every preset, a swallow and a diamond.
- The Fish's file has a square tail at its points' width; the 3D page says so on a swallow board only.
- Three v2 sample files written, with their table in the SUMMARY.
</success_criteria>

<output>
Create `.planning/quick/261110-veo-the-brd-export-draws-its-cross-sections-/261110-veo-SUMMARY.md` when done, in plain
English for a shaper: what the founder should open first (the Deep Single + 4 channels file in Shape3D's 3D view, then
the Fish in AkuShaper's 3D), the sample table, and every place the result differs from the brief.
</output>
