# 16-15 — Brief for the planner: the whole rail character fades (D-32)

Written by the orchestrator on 2026-11-04 at the founder's ruling during go-live 1 of Phase 16. Plan 16-15 is planned
after go-live 1 ships and runs in the wave after 16-14, shipping with go-live 2 (16-13) and its own saved-boards report.

## The founder's words

- "we should also treat 'sharp bottom tuck' like a hard edge at the tail station. The same blend from and to applies,
  but now to the sharp edge rather than the hard 90deg edge. Also, if the center and/or nose have a sharp bottom tuck,
  the blend still applies, but maintains the sharper edge rather than a smooth round edge."
- Card answers: what fades = "The tail's whole rail character"; the nose = "Fade the nose the same way"; when = "After
  go-live 1, as a new plan".

## Locked facts (verified in the session)

- F1. Today only the tail's hard edge fades (D-20/D-27/D-30/D-31): `HARD_EDGE_FADE.weight` is 0 unless `rails.tailHardEdge`;
  every other discrete rail field (`singleTuck`, `sharpBottomTuck`, `domed`) switches at the nearest-anchor midpoint
  (`nearestAnchorSection` in `lib/geometry/volume.ts`) — a step the 3D board shows.
- F2. Inside the fade the litres count the drawn ring's area with the end sections' polygon shortfalls blended out
  (D-31 level variant, `fadingSectionArea` in volume.ts; the one blend `blendFinishedRails` in `finished-rail.ts`,
  read by `boardSections` and `board-surface.ts`).
- F3. The tail's two settings: `tailHardEdgeBlendsFrom` (12"–30", default 18") and `tailHardEdgeEndsAt` (≥ start + 2",
  ≤ the centre; default L/6 + 18 from the tail, rounded to 1/2") on `RailBandSpec`; readers
  `hardEdgeBlendsFrom(rails, length)` / `hardEdgeEndsAt(rails, length)`; RAILS rows `Hard Edge Blends From` /
  `Hard Edge Ends At` on the tail's Advanced menu, shown only while Hard Edge is on (16-02); the 3D panel gets the
  same two sliders in 16-07.
- F4. RAILS hides the tail's own tucks while Hard Edge is on (D-27); with Hard Edge off the tail's tuck boxes show.
- F5. The 40-board pin (`phase16-litres-pin.test.ts`) pins today's litres under `HARD_EDGE_SWITCH`; it must stay
  bit-identical (the old rule is callable by name only).

## What the plan must settle (the planner proposes, the founder rules at the look)

1. The tail's zone governs the tail's WHOLE discrete character: at a station behind Blends From the section is the
   tail's rail as set (hard edge, sharp tuck, single tuck); beyond Ends At it is the centre's as set; between, the
   point blend of the two (D-31). The continuous fields keep today's blend (orchestrator reading — flag it).
2. The two tail rows show whenever the tail's rail differs from the centre's in a discrete box (or always — propose),
   renamed if "Hard Edge …" no longer fits (e.g. "Tail Rail Blends From / Ends At" — propose; Title Case).
3. The nose: its own two rows on the nose's Advanced menu, measured from the nose tip, mirrored ranges and defaults
   (12"–30", default 18"; end ≥ start + 2", ≤ the centre, default L/6 + 18) — stored as two more optional fields
   (version stays 5, no database change); the nose has no hard edge.
4. The litres move once more on boards whose tail or nose tucks differ from the centre's; preset figures regenerated;
   the VOLUME picture re-recorded on a proven diff; the saved-boards report prints the nose's settings too.
5. The 3D panel's sliders (16-07) follow: four rows, or the tail pair plus the nose pair.

## Pictures for the founder's look

RAILS' tail and nose Advanced menus with the rows; the 3D board's bottom view on a sharp-tucked tail before/after
(no step); the 40-board table (today vs the new rule).
