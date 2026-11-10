---
phase: 17-bottom-contours
fixed_at: 2026-11-10T22:52:50Z
review_path: .planning/phases/17-bottom-contours/17-REVIEW.md
iteration: 3
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-11-10T20:16:17Z (CR-01, WR-03) and 2026-11-10T21:13:21Z (WR-02, after the founder's ruling); 2026-11-10T22:52:50Z (D-44, the founder's ruling at his look — a change he asked for, not a review finding)
**Source review:** .planning/phases/17-bottom-contours/17-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 3 (CR-01, WR-03, WR-02) — all three are fixes to the board's maths or its drawing, so all are marked for a human look
- Skipped: 1 (WR-01) — waits for the founder's ruling; no code was changed for it
- Out of scope, untouched: IN-01, IN-02, IN-03

The orchestrator ruled which findings to fix before the first run: CR-01 and WR-03 fixed, WR-01 and WR-02 left for the
founder, the three Info findings not touched. The founder then ruled on WR-02 (2026-11-10, D-43 in 17-CONTEXT.md) and
the same fixer was resumed for it — the second iteration.

A third iteration followed the founder's look at the real page the same day. He asked for an Angle on the two angled
channel runs and for With-the-rail channels to fan subtly (D-44 in 17-CONTEXT.md). That is a change he asked for, not
a review finding, so it is recorded in its own section below and the counts above are unchanged: four findings in
scope, three fixed, WR-01 still waiting for his word.

## Fixed Issues

### CR-01: Channels "With the rail" plus Off Stringer give a not-a-number at a narrow tail — wrong litres, a collapsed 3D tail and wrong CNC files

**Status:** fixed: requires human verification (a fix to the board's maths — the tests prove it, a shaper's eye should confirm it)
**Files modified:** `lib/geometry/bottom.ts`, `lib/geometry/volume.ts`
**Tests added in:** `lib/geometry/bottom.test.ts`, `lib/geometry/volume.test.ts`, `components/bottom/bottom-copy.test.ts`
**Commit:** a7cb13b1

**What was wrong, in the shaper's terms.** With channels laid With the rail and Off Stringer set above nothing, the
last inch or so of a narrow tail is narrower than the flat the shaper asked to keep beside the stringer. There is
no room for a channel there, but the maths still laid one of no width, and its depth came out as "not a number".
That one bad figure was read as "the foam ends here", so the tail's sections were cut short: the litres dropped by
up to about three times what the channels really take off, and the 3D board and the CNC files pinched at the tail.

**Applied fix — the review's three parts, exactly:**

1. A channel is kept at a station only where it has real width there — more than half a millimetre, measured from
   the stringer side of the board. Where there is no room, no channel is laid (`channelEdges`).
2. A channel of no width takes nothing off (`channelFoamOff`).
3. The section builder itself now treats a cut that is not a real number as "nothing taken off here", and never as
   "the foam ends here" (`bottomedHalfSection` in `lib/geometry/volume.ts`). This is the safety net: no future bad
   figure can pinch a board again.

**How With-the-rail channels narrow is unchanged** wherever they still have real width — a test rules them at every
1/8" from the tail to their Start and holds the walls to the same rule as before, and that test passes on the old
code and the new alike. Only a channel of no width is dropped.

**The litres, before and after** (how much the channels take off the board):

| Board, channels, Off Stringer 1/2" | Before | Now | Same board at Off Stringer 0 |
|---|---|---|---|
| Midlength, 6 at 1" | 0.4224 L | 0.1446 L | — |
| Shortboard, 8 at 3/4" | 0.2900 L | 0.1140 L | 0.1136 L |
| Shortboard, 6 at 1" | 0.3210 L | 0.1461 L | 0.1458 L |
| Longboard, 4 at 3/4" | 0.1114 L | 0.0719 L | — |

No board with Off Stringer at nothing changed its litres.

**The orchestrator's question — can the "last wall … off the rail" read-out go below nothing? Yes, it could.**
Nothing holds the Off Stringer slider (0 to 9") against the board's width, so on a narrow tail the worked-out
distance from the last wall to the rail went negative: on the Shortboard with 4 channels from Off Stringer 7", and
on the Midlength as far as about 1 3/4" below nothing at 9". The Channel Width line could then have read
`last wall -1 3/4" off the rail`. The read-out is now held at nothing in the maths (`channelReadout`), with a test
across the whole slider on all five boards and 4, 6 and 8 channels, and a second test on the words themselves in
both Imperial and Metric. No wording was changed. The printed Bottom Contours sheet never prints this figure.

**Tests added (8):**

- `lib/geometry/bottom.test.ts` — a new group, "CR-01: With-the-rail channels and an Off Stringer, where the tail
  is narrower than the flat and the last wall's keep", five tests: no channel of no width, and nothing ruled where
  there is no room; ruled exactly as before where a channel has real width; the foam taken off is always a real
  number, never below nothing and never more than the Depth; the sections end their foam only where the same board
  at Off Stringer 0 ends it, and the litres taken off agree within 0.03 L; the read-out never reads below nothing.
- `lib/geometry/volume.test.ts` — "a cut that is not a number takes nothing off and never ends the foam".
- `components/bottom/bottom-copy.test.ts` — "Channel Width never reads a distance below nothing, anywhere on Off
  Stringer's slider", once for Imperial and once for Metric.

Every expected value is a relation worked from the app's own functions (Rule 1) — no number was typed by hand.
Run against the code as it stood before the fix, five of the six `lib/` tests fail (the sixth, "ruled exactly as
before", passes on both, which is its point).

**Worth a human look:**

- The review said the Longboard and the Fish did not show the fault. Both did. The Longboard's litres were wrong
  too (the table's last row). The Fish produced the bad figure with 4 channels, though its litres did not move.
- Under With the rail a channel half a millimetre wide or less is now dropped rather than drawn as a sliver. That
  can also happen at Off Stringer 0, right at the tail's tip. It makes no measurable difference to the litres.

### WR-03: The section drawings never get the litres' knife edge — the screen and the printed sheet draw foam the litres and the 3D board do not have

**Status:** fixed: requires human verification (a fix to what is drawn — the tests prove the rule, the look is the founder's)
**Files modified:** `lib/geometry/bottom-draw.ts`, `components/design/design-store.tsx`, `components/bottom/bottom-section.tsx`, `components/summary/bottom-contours-sheet.tsx`
**Tests added in:** `lib/geometry/bottom-draw.test.ts`, `components/design/design-store.test.ts`
**Commit:** 1582dd7a

**What was wrong, in the shaper's terms.** Where a deep vee or deep channels cut right through the rail near a
tip, the litres, the 3D board and the CNC files end the foam at that knife edge (D-40). The section drawing worked
the edge out by its own rougher estimate, so on those few stations it drew foam further out than the board has —
up to about 9 mm (3/8") on a Shortboard with six channels 1/2" deep.

**Applied fix.**

- A small pure helper, `builtSectionAt(input, station)` in `lib/geometry/bottom-draw.ts`, builds the litres' own
  section at the one station a drawing shows, from the very input the litres are counted from. On a bottom that
  cuts nothing it builds nothing at all.
- The design store hands that out as `bottomSectionAt(station)`, so neither drawing builds a section of its own —
  the same rule the store already follows for the litres (the checker's W1). No formula sits in a component.
- Both drawings pass it on as the drawing's `seam`: the section on the BOTTOM screen
  (`components/bottom/bottom-section.tsx`) and each section on the printed Bottom Contours sheet
  (`SectionFigure` in `components/summary/bottom-contours-sheet.tsx`).
- On the screen it is remembered between redraws like the editor's other drawing work, and is rebuilt only when
  the board or the station changes. One section costs a quarter of a millisecond or so to build, so it does not
  need to be put off behind the drag.

**What changes for the shaper, and what does not.**

- Changes: only at stations where the foam really is cut through. With a Rolled Vee lifted 1/2" or six channels
  1/2" deep that is between 2 and 13 of a board's drawn stations, all near a tip. The rail-lift reading on the
  section follows the rail as drawn, so it moves with the rail on those same stations.
- Does not change: a flat bottom, and every stock starting bottom everywhere except the last few inches of a tip
  (the tail's last inch for Panel, Spiral and Rolled Vee and for 4 channels, its last 3" for 8 channels on the
  Midlength; the nose's last 4" for a Rolled Belly Entry). That is 14 of the 6,120 station-and-bottom pairs checked.
  Those draw exactly as before, point for point. **No printed section of a stock starting bottom changes** — the
  sheet prints each cut at its deepest station, and none of those has a knife edge.

**Tests added (8):**

- `lib/geometry/bottom-draw.test.ts` — a new group, "WR-03: a drawn section ends its foam where the litres end
  it", seven tests:
  - the helper's section is the litres' own: at each of the litres' stations it equals the one in their list, and
    at any other station the one the litres' builder makes there;
  - a flat bottom builds no section, and its drawing is the one it has always been;
  - one test per stock board (Shortboard, Fish, Midlength, Longboard): on every stock starting bottom — each named
    cut alone, the opening set, and 4, 6 and 8 channels — at every inch from tail to nose and at every station the
    sheet prints, the drawing with the litres' section is the same as the drawing without, point for point and
    reading for reading, wherever that section has no knife edge; and no printed station has one;
  - where the litres end the foam (Shortboard and Midlength with six channels 1/2" deep, Shortboard with a Rolled
    Vee lifted 1/2", Fish with a Panel Vee 1/2" deep) the drawing ends it at the same place, and at least one
    station on each board used to be drawn further out.
- `components/design/design-store.test.ts` — "a drawn section's knife edge comes from the litres' own input, on
  the screen and on the printed sheet": the store's reader builds from the litres' input alone, both drawings hand
  it to the drawing, and neither builds a section itself. The old code fails this test.

**No existing test or fixture changed value.** No test pinned the old drawing for a knife-edged case, so none had
to be updated, and no golden fixture moved.

### WR-02: "With the rail" squeezed every channel to nothing at the pod — now the set narrows to an inch, runs straight, and the outer channels run out through the rail

*The shape of these walls was changed again the same day by the founder's ruling D-44 — straight lines that fan, at an
Angle the shaper can set. The inch they never narrow under and the rule that they never meet at a point both stand.
See "The founder's ruling at his look" below.*

**Status:** fixed: requires human verification (a change to how the board is cut, on the founder's ruling — the tests prove the rule, the look and the two numbers in it are his)
**Files modified:** `lib/geometry/bottom.ts`
**Tests changed and added in:** `lib/geometry/bottom.test.ts`
**Commit:** f4e156d0

**The ruling (the founder, 2026-11-10, D-43).** *"the channels with the rail shoud never bunch at the tip. the early
wording was correct. They either are straight, or splay in (toe in with the fins) or out (following the rail line)
but never meet at a single point."*

**What was wrong, in the shaper's terms.** With the rail shared the room inside the rail equally among the channels at
every station. On a tail that narrows to a couple of inches that left six channels about 1/8" wide each at the tail —
every wall bunched against the stringer, and every channel shallowed away together.

**Applied fix.** One small function, `channelRailWidth`, and one changed line in `channelEdges`: a With-the-rail
channel follows the rail while that leaves it 1/2" more than an inch; it is never narrower than an inch (or than the
set's own Width, when that is under an inch); the change is eased over 1/2" of width so no wall kinks. From there the
walls run straight to the tail and the outer channels run out through the rail. Parallel and Toe-in were not touched
and their numbers are identical before and after.

**Each channel's width, Shortboard, six channels, before and after:**

| Station (from the tail) | Before | Now |
|---|---|---|
| 11" (deepest) | 1.750" | 1.750" |
| 8" | 1.484" | 1.484" |
| 6" | 1.268" | 1.295" |
| 4" | 1.009" | 1.129" |
| 2" | 0.676" | 1.015" |
| the tail | 0.128" | 1.000" |

At the Shortboard's tail the walls now stand at 1", 2" and 3" against a rail 2" out: the inner channel is whole, the
second ends on the tail's corner, the third has run out through the rail. The Midlength's six are an inch wide from
the tail to 2". The Fish's tail is wide enough that its last wall is still inside the rail (1.052" → 1.152").

**The foam the channels take off, With the rail, before and after (starting Widths):**

| Board | 4 channels | 6 channels | 8 channels |
|---|---|---|---|
| Shortboard | 0.333 → 0.348 L | 0.332 → 0.365 L | 0.282 → 0.351 L |
| Midlength | 0.325 → 0.350 L | 0.324 → 0.370 L | 0.274 → 0.360 L |
| Fish | unchanged | 0.2849 → 0.2858 L | 0.252 → 0.265 L |
| Longboard | unchanged | 0.2512 → 0.2517 L | 0.225 → 0.234 L |

A set an inch wide or under laid With the rail is now the Parallel set from the deepest station back, and takes
nearly twice the foam it did (Midlength, 6 at 1": 0.144 → 0.266 L; Shortboard, 8 at 3/4": 0.114 → 0.198 L). Those
are the CR-01 table's boards: its "Now" column is superseded by these figures.

**Two things With the rail can now reach that it never could** — both follow from a channel running out through a
thin tail rail, both already existed for Parallel, and both are WR-01's subject:

- The thin-rail note: the Shortboard's tail with 4, 6 or 8 channels (and 1 1/2" up with 8), the Midlength's 1 3/4"
  station with 6 or 8 (and 3 1/2" with 8). Parallel flags more stations on both boards. Fish and Longboard: none.
- The foam's knife edge (D-40) at starting Widths: the Shortboard's tail with 4, 6 or 8 channels (the foam ends about
  1/32" inside the rail) and the Midlength's 1 3/4" station with 6 or 8 (the rail falls in the deep side of the third
  channel, whose 1/4" cut is more than the rail has there).

**The sketch's golden figures were not edited.** Parallel and Toe-in are still held to them exactly. The 18
With-the-rail cases are held as a relation — the sketch's width put through `channelRailWidth` — with a count kept
of the stations where the rule returns the sketch's own width and of those where it holds the channel open, so every
case is proved to have both kinds.

**Tests (1124 → 1133 in `lib/geometry/bottom.test.ts`):** a new group of eight on `channelRailWidth` itself (never
under an inch or the set's Width; the sketch's width above the ease; smooth across it; never wider than Parallel);
the With-the-rail spec test rewritten for the Shortboard, Midlength and Fish with 4, 6 and 8 channels at every 1/8";
the CR-01 tests rewritten to the new truth; and "a set an inch wide or under laid With the rail is the Parallel set,
wall for wall". The 3D board and the CNC files were probed on 22 With-the-rail sets: every surface closed, no bad
figure in any DXF, XYZ or STL.

**Nothing else needed changing.** The top view and DATA already clip a wall to inside the rail; the 3D board, the CNC
files, the printed sheet and the controls only read the walls they are given; no word on the GUIDE or the controls
describes how the set narrows.

**Worth a human look:** the look of the tail on the real page (pictures sent to the founder 2026-11-10); whether an
inch is the right narrowest channel and 1/2" the right ease; and WR-01, which this makes more visible.

## The founder's ruling at his look — D-44 (not a review finding)

### D-44: Channels laid With the rail or Toe-in get an Angle slider, and With-the-rail walls are now straight lines that fan

**Asked for by:** the founder, at his look at the real page, 2026-11-10 — *"Along the rail is subtle, like the middle board
in this image."* and *"The toe in and splayed out (along rail) needs an angle adjustment. Set default by the rail and
the fins toe in, but overiderable."* Recorded as D-44 in `17-CONTEXT.md`, with every number that is ours for him to
change marked there.
**Status:** built: requires human verification — it changes the board's maths and adds a control, and only the founder's
look at the real page can say it reads right. No picture of the page was taken by this run.
**Commit:** 2f942bd4
**Files modified:** `lib/geometry/bottom.ts`, `lib/geometry/bottom.test.ts`, `lib/geometry/bottom-print.ts`,
`lib/geometry/bottom-print.test.ts`, `lib/models/design-snapshot.ts`, `lib/models/design-snapshot.test.ts`,
`components/bottom/bottom-controls.tsx`, `components/bottom/bottom-copy.ts`, `components/bottom/bottom-copy.test.ts`,
`components/design/design-store.tsx`, `components/design/design-store.test.ts`, `lib/units-isolation.test.ts`,
`e2e/bottom-panel.spec.ts`

**What a shaper sees:**

- Pick Run: With the rail or Toe-in and an **Angle** row appears directly under Run and Longest — a slider from 0° to
  15° in half degrees. Until it is moved it rests on the run's own angle and says so: `9.1° · the rail's own` or
  `3.2° · the fins' toe-in` (fins with no toe-in: `0.0° · these fins have no toe-in`). Moved, it reads
  `7.5° · set by hand · the rail's own is 9.1°`, and a small **Reset** puts the run's own angle back. Parallel has no
  Angle row.
- One slow drag is one Undo step, Reset is one Undo step, and picking a different Run starts from that run's own angle.
- The Run menu's three options are plain names now — Parallel, With the rail, Toe-in — because the angle has its own row.
- The Overview Sheet's channels line prints the angle in use for both angled runs: `With the rail · 9.1°`,
  `Toe-in · 3.2°`. Degrees read the same in Imperial and Metric.

**What changes on the board:**

- **With the rail:** every wall is a straight line and the set fans gently. The wall beside the stringer stays where it
  is, the last wall is laid at the Angle through its place at Deepest At, and the walls between share the turn evenly —
  so the channels are all one width at any station, wider toward the nose and narrower toward the tail. They still
  never narrow under an inch and never meet at a point (D-43), and the outer ones still run out through the rail. At 0°
  the set is a Parallel set exactly.
- **The rail's own angle** is the straight line of the rail from the channels' Deepest At to their Start.
- **Toe-in** keeps its shape and is turned at the Angle in use — the fins' own toe-in until one is set by hand.
- **Parallel** is untouched, and so is Toe-in on its own angle: both still match the sketch's figures number for number.

**The starting numbers, measured through the app's own maths** (six channels, each board's starting numbers, With the
rail on the rail's own angle; widths are one channel's, in inches):

| Board | The rail's own | Start | Width at Start | Width at the front fins (Deepest At) | Width at the tail |
|---|---|---|---|---|---|
| Shortboard | 9.1° (9.0678) | 23" | 2.388 | 1.750 | 1.221 |
| Fish | 9.5° (9.5430) | 19.5" | 2.422 | 1.750 | 1.344 |
| Mid-length | 10.4° (10.3528) | 24" | 2.481 | 1.750 | 1.135 |
| Longboard | 11.2° (11.2371) | 17.5" | 2.545 | 1.750 | 1.392 |

The rail's own angle is the same with four, six or eight channels. Four channels run 3.458 / 2.500 / 1.622 on the
Shortboard, 3.509 / 2.500 / 1.870 on the Fish, 3.596 / 2.500 / 1.409 on the Mid-length and 3.692 / 2.500 / 1.954 on the
Longboard; eight run 1.729 / 1.250 / 1.004, 1.754 / 1.250 / 1.034, 1.798 / 1.250 / 1.000 and 1.846 / 1.250 / 1.051 —
eight start so close to an inch that behind Deepest At they are held by the inch rule rather than by the fan. On the
Shortboard and the Mid-length the last wall runs out through the rail before the tail; on the Fish and the Longboard it
stays inside it. Toe-in's own angle is the front fins' toe-in: 3.2° on the Shortboard and the Mid-length, 2.0° on the
Fish, 0.0° on the Longboard's single fin.

What six channels take from the litres (the flat board less the cut one):

| Board | Parallel | With the rail, its own | With the rail, 15° | Toe-in, its own | Toe-in, 15° |
|---|---|---|---|---|---|
| Shortboard (29.61 L flat) | 0.384 | 0.381 | 0.376 | 0.365 | 0.297 |
| Fish (34.65 L) | 0.304 | 0.295 | 0.289 | 0.304 | 0.285 |
| Mid-length (49.40 L) | 0.391 | 0.386 | 0.379 | 0.376 | 0.308 |
| Longboard (73.61 L) | 0.251 | 0.258 | 0.254 | 0.251 | 0.222 |

**Saved boards:** the angle is one new number saved with the channels, or none — meaning the run's own. A board saved
before today has no such number and opens exactly as it was saved, on the run's own angle, keeping every other
channel number. A stored angle that is not a number, or is outside 0°–15°, reads as none and takes nothing else with
it. A board with nothing cut still saves no bottom. No database change.

**Decided here rather than in the brief — each is ours for the founder to change** (the same list is in D-44):

- D-43's inch and its half-inch easing are kept, so a set that reaches an inch stops fanning there and its walls bend
  slightly at that point; ahead of Deepest At every wall is exactly straight.
- A stored angle outside 0°–15° reads as none in a saved board, rather than being pulled to the nearest end; the maths
  itself still holds any angle it is handed inside 0°–15°.
- The slider's end hints read `0.0°` and `15.0°`; Reset is drawn only when an angle has been set by hand, in the
  far-end hint's place; its spoken name is "Reset Channel Angle" and the slider's is "Channel Angle".
- On fins with no toe-in the printed line reads `Toe-in · 0.0°`, and an angle set by hand reads
  `5.0° · set by hand · these fins have no toe-in`.
- Changing the number of channels keeps an angle set by hand; only changing the Run puts it back to the run's own.
- The run's own angle is rarely a round half degree, so the first press of the slider lands on the nearest half degree.

**Every place that reads a channel's run — checked.** The walls are laid in one place only, `channelEdges` in
`lib/geometry/bottom.ts`. Everything else reads through the shared functions and needed no change of its own: in
`lib/geometry/` — `bottom.ts` (the marks, the foam off, the drawn walls, the layout, the readout, the litres' sampler),
`bottom-draw.ts`, `bottom-print.ts`, `bottom-tile-art.ts` (count and depth only), `design.ts` (hands the front fins'
toe-in to the bottom) and `volume.ts` (the litres, the 3D board and the CNC files all come from the one sampler); in
`lib/models/` — `design-snapshot.ts`; in `components/bottom/` — `bottom-controls.tsx`, `bottom-copy.ts`,
`bottom-data.tsx`, `bottom-editor.tsx`, `bottom-guide.tsx`, `bottom-cartoon.tsx`, `bottom-section.tsx`,
`bottom-top-view.tsx`, `section-station.ts`; `components/design/design-store.tsx` and `screen-tiles.tsx`;
`components/summary/bottom-contours-sheet.tsx`, `bottom-sheet-fit.ts` and `order-form.tsx`;
`components/template/build-overview-pdf.ts` and `export-preview-dialog.tsx`. (`components/fins/fin-viewer.tsx` reads
the fins' toe-in only. The other files with a "run" in them — the wing files — mean a wing's Run, not a channel's.)

**GUIDE:** no sentence is made untrue, and none was reworded. The Channels card's How to shape note — "Rule every wall
off the stringer at each 6" station from DATA's marks and join the marks with a straightedge. … keep every wall
straight along the board." (`components/bottom/bottom-guide-words.ts`, `17-GUIDE-WORDS.md`) — is truer now than
before, since With-the-rail walls are straight lines. The one caveat, already there under D-43: where a set has
narrowed to an inch behind Deepest At, a wall bends slightly at that point.

**Tests:** With the rail's tests are rewritten from the rule itself — straight walls, the even fan, 0° is a Parallel set,
never under an inch, nothing not-a-number, at 0°, the run's own and 15° on five boards with 4, 6 and 8 channels on and
off the stringer; the litres, the 3D board and the CNC sections at 15° on the four stock boards. The sketch's golden
file (`lib/geometry/__fixtures__/bottom-golden.json`) is **not edited**: its With-the-rail walls are no longer compared
(a comment names D-44), and its Parallel and Toe-in cases still are. New tests cover the Angle row's words, the printed
line, saved boards with and without the number, and the store's Run change and Reset. The six test files this change touches run alone, with the test runner's ordinary five-second allowance: 6 files, 1,483 tests, all passed.

**Not done:**

- The browser test added for the Angle row (`e2e/bottom-panel.spec.ts`) **has not been run** — no browser test can run
  in this checkout. Neither have the two browser tests changed for the Run menu's plain names.
- `17-UI-SPEC.md` still shows the Run menu's old option words (`Toe-in · 3.2°`, `Toe-in (no toe)`). It was not in this
  change's list of records to edit; D-44 says it is superseded.

## Skipped Issues

### WR-01: A channel cut deeper than the foam ends the whole board at that channel's wall

**File:** `lib/geometry/bottom.ts:766-771` with `lib/geometry/volume.ts:1094-1117`
**Reason:** skipped: awaiting the founder's ruling. No code was changed. This is the same deliberate rule as D-40's
knife edge — where a cut reaches the deck the foam ends — applied to a channel, and the screen already warns the
shaper when a channel goes deeper than the foam. Whether a channel should be held to a floor instead is the
founder's to rule. Since WR-02's fix a With-the-rail set reaches it at starting numbers on the Shortboard's tail and
the Midlength's 1 3/4" station (above), as a Parallel set already did.
**Original issue:** A concave is held to the 1/4" stringer floor, but a channel's depth is added with no limit.
Where a channel is deeper than the foam above it, the section ends at that channel's wall, and everything outboard
of it — the rest of the bottom and the rail — leaves the litres, the 3D board and the STL.

## Out of scope (not touched)

- **IN-01** — one bad sample blanks the whole top view (`lib/geometry/bottom-draw.ts:161`, `:229`).
- **IN-02** — the channels' floor warning speaks only of the rail (`components/bottom/bottom-copy.ts:263-272`).
- **IN-03** — a comment on "rail lift" that is narrower than the rule (`lib/geometry/design.ts:313-316`).

## Verification

**Where it ran:** in the branch's own checkout,
`/Users/kontoes/Code/shaper/.claude/worktrees/beautiful-fermi-ad3fb7`, on `claude/beautiful-fermi-ad3fb7` — the
same tree the two commits sit in. No separate isolated worktree, temporary branch or recovery marker was made for
this run (the orchestrator directed the work to this checkout), so these numbers can be reproduced from this tree
as it stands. The founder's own checkout was not touched. Nothing was pushed.

Each check was run on its own, after the second commit (1582dd7a), and again after the third (f4e156d0 — the second table):

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | 0 errors, 1 warning — the known one at `lib/db/import-designs-action.test.ts:42`; no new warning |
| `npx vitest run --testTimeout=120000` (the whole suite) | 209 files passed of 209; 12,074 tests passed, 2 skipped, 0 failed; exit 0; 708 s |

| After f4e156d0 | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | 0 errors, the same 1 known warning |
| `npx vitest run --testTimeout=120000` (the whole suite) | 209 files passed of 209; 12,083 tests passed, 2 skipped, 0 failed; exit 0 |

| After 2f942bd4 (D-44) | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | 0 errors, the same 1 known warning |
| `npx vitest run --testTimeout=120000` (the whole suite) | 209 files passed of 209; 12,115 tests passed, 2 skipped, 0 failed; exit 0; 521 s |

Three earlier whole-suite runs for D-44 are recorded plainly. The first had one real failure (a test that counts the
numbers BOTTOM's screen rounds by hand — the fins' toe-in is now rounded in the one shared place, so the count fell
from three to two; the test was brought up to date) and three failures in files this change does not touch — two
time-outs and one speed check (`lib/models/rack-stand-in.test.ts`, `lib/geometry/shaping-bay.test.ts`,
`lib/geometry/blank-fit.test.ts`) — caused by other heavy commands running beside the suite; all three passed in
every later run. The second, with nothing beside it, had one failure: this change's
own new sweep ran past its two minutes under the suite's load. That sweep, and one more of this change's that took
7 s alone, now gather what is wrong and hold it up once a layout instead of asking the test runner about half a
million readings one by one (25 s and 7 s alone before, 2 s and 1 s after; a deliberately wrong reading was fed to a
throwaway copy of each to prove it still fails). The third passed — 209 files, 12,115 tests passed, 2 skipped, exit
0 — before the second of those two sweeps was lightened. The run in the table is the fourth, on the files exactly as
committed, with nothing else running.

The two skipped tests are the long-standing sample-PDF writers that only run when asked to write a file
(`components/template/build-strip-pdf.test.ts`, `components/template/build-template-pdf.test.ts`). No sweep timed
out.

Per fix, before each commit: the changed lines were re-read, the changed files type-checked and linted, and the
test files around the change run (CR-01: 4 files, 1,786 tests; WR-03: 18 files, 650 tests — all passed).

**Not run, by the run's rules:** the browser tests (Playwright), a production build and a dev server.

## Browser tests believed affected

They could not be run here, so every `e2e/bottom-*.spec.ts`, `e2e/phone-bottom.spec.ts` and
`e2e/summary-*.spec.ts` that touches the section drawing or the printed sheet was read instead.

**None is believed to fail.** The ones that come closest, and why each should still pass:

- `e2e/bottom-metric.spec.ts` — the only browser test that works out the section drawing itself (without the
  litres' section) and holds the page's readings to it. It looks at the Shortboard with a Deep Single Concave, a
  Spiral Vee and six channels, at the channels' deepest station (11" from the tail). Checked by hand with the app's
  own maths: that station has no knife edge, the rail is drawn at the same place with and without the litres'
  section, and the readings are identical. It would only disagree if its board were changed to one cut through at
  the station it looks at.
- `e2e/bottom-panel.spec.ts` — collects the section's drawn paths for the five vees and asks only that the five
  differ from one another; reads the Channel Width line at each count's starting width (still a real distance off
  the rail, so unchanged); never picks With the rail together with an Off Stringer.
- `e2e/bottom-viewer.spec.ts`, `e2e/bottom-screen.spec.ts`, `e2e/bottom-saving.spec.ts`, `e2e/bottom-wings.spec.ts`,
  `e2e/phone-bottom.spec.ts` — read the section's name, height, size and place on the screen, and litres read off
  the page itself; none reads the rail's end.
- `e2e/summary-bottom-page.spec.ts` — counts the printed sections and checks they are shown; its boards are stock
  starting bottoms, whose printed sections do not change.
- `e2e/desktop-baseline.spec.ts` — has no BOTTOM picture among its six baselines, so no baseline needs re-making.

No browser test sets channels With the rail and then moves Off Stringer, so none exercises CR-01's case.

**After WR-02's fix:** the only browser test that names With the rail is `e2e/bottom-panel.spec.ts` (it lists the
Run's three options and reads nothing a narrowing set changes), and no baseline holds a BOTTOM picture, so none is
believed to fail. The orchestrator built the branch for production with stand-in settings and photographed the
Shortboard and the Mid-length with six channels in all three runs on the real page; the full browser suite runs at
the go-live gate.

**After D-44:** `e2e/bottom-panel.spec.ts` is the only browser test that names a channel run. Its Run-menu test now
expects the three plain names and reads Toe-in's Angle row; its narrow-window test picks With the rail and no longer
expects the name to be cut short at 820 dots (the old, longer option words were what was cut); and one new desktop
test walks the Angle row — the rail's own to start, the slider, Reset, Undo, a Run change, and no row for Parallel.
**None of the three has been run.** Every other browser test leaves channels on Parallel, which has no Angle row and
whose numbers have not moved, and no baseline holds a BOTTOM picture.

---

_Fixed: 2026-11-10T20:16:17Z (iteration 1), 2026-11-10T21:13:21Z (iteration 2), 2026-11-10T22:52:50Z (iteration 3 — D-44)_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
