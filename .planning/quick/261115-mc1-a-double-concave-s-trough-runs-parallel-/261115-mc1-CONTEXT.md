---
quick_id: 261115-mc1
date: 2026-11-15
source: the founder, 2026-11-15 (/gsd-quick), and his three answers to the orchestrator's questions the same turn
---

# A double concave's trough: Parallel, Centered or By hand — decisions (locked)

## The founder's request, in his words

"For spiral-vee and double concaves, I think we need an option to make the trough parallel to the stringer (as I believe
it works today), and centered between the stringer and rail marks (which centers the deepest cut giving it a slight angle
where the center is further from the stringer further forward, and closer to the stringer toward the tail, especially for
very narrow tails). In fact, we may actually want manual controls also for how far off the stringer the start and end of
the concaves are from the stringer specifically so the user can put the tail trough where they see fit."

## How it works today (read from the code before asking)

`lib/geometry/bottom.ts` `doubleMarks(cut, C)`: a double's trough sits at `troughAt` off the stringer at every station,
clamped to at least the flat (Off Stringer) + 1/4" and at most 85% of the cut's half-width `C` at that station
(`DOUBLE_TROUGH_GAP`, `DOUBLE_TROUGH_SHARE`). So it is parallel to the stringer, pulled in only where the cut runs out of
room near a narrow tail. The three doubles are Early Double Concave (Center), Double Concave Exit and Spiral Vee (Tail).

## Decisions

- **D-01 — Three ways to run the trough, for every double (the Spiral Vee included):** Parallel, Centered, By hand.
- **D-02 — Parallel is today's rule, unchanged:** Trough At off the stringer at every station, the same clamps.
- **D-03 — Centered: halfway between the flat and the rail mark at each station** (the founder's pick of two): the
  midpoint of the flat's edge (Off Stringer, as `doubleMarks` already clamps it) and the cut's edge `C` (the Off Rail
  line). It follows the outline in toward a narrow tail. The same clamps apply after.
- **D-04 — By hand: a straight line from Start to End** (the founder's pick of two): the shaper sets the trough's
  distance off the stringer at the cut's Start and at its End (two sliders, "Trough at Start" and "Trough at End",
  1/2"–8" like Trough At, 1/16" steps, 1 mm in Metric), and the trough runs straight between them along the board, like a
  batten laid from one mark to the other. Ahead of Start and behind End it holds the nearer end's value. The same clamps
  apply after.
- **D-05 — Default is Parallel** (the founder's pick): a newly picked double opens Parallel; every saved board, preset,
  GUIDE card and recorded litre stays exactly as it is. Switching to By hand starts both ends at the current Trough At,
  so nothing jumps.
- **D-06 — Storage is additive and forgiving:** the rule and the two By-hand distances are optional on a stored cut;
  absent reads as Parallel with both ends at Trough At. The saved-board schema (`lib/models/design-snapshot.ts`) must
  carry the new fields (zod strips unknown keys, so leaving them out would silently drop a shaper's choice on save), each
  forgiving on its own so a bad value never costs a board its cut. No database migration: a design is stored whole.
- **D-07 — Every reader of the trough follows the rule:** the foam taken off (so litres, the 3D board and the .brd
  export follow), BOTTOM's drawing (the trough pencil line), DATA's layout-marks table (the trough column per station),
  the floor check, and the printed BOTTOM CONTOURS sheet's sentence (it names the rule and, By hand, both distances).
- **D-08 — Opening a .brd** keeps fitting a double as Parallel, as today.

## Out of scope

The GUIDE's words and cartoons (they draw each cut at its starting numbers, which stay Parallel); the channels.
