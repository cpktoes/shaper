# 16-16 — Brief for the planner: the deck stays smooth across a wing (D-33)

Written by the orchestrator on 2026-11-04 at the founder's finding on the 3D board. Plan 16-16 runs in its own wave
AFTER 16-15 (both change the shared section maths) and before go-live 2 (16-13).

## The founder's words and picture

"When a board has a wing, it's doing this funky thing where there's a step in the deck. Wings should be steps in the
outline. The Deck should remain smooth across the wings location." — `pictures/founder-wing-deck-step.png` (the 3D
board in Slate, a winged board seen from above the deck: a ledge across the deck at each wing).

## Locked facts (verified in the session)

- F1. Wings (quick 261014-wii) live on the outline: `buildOutline` draws the curve, then `applyWings` (`lib/geometry/wings.ts`)
  takes each wing's step out of the points, the area and the 12" widths. `sampleOutline(geometry, station)` returns
  the stepped half-width; `buildCurveOutline` is the curve without wings.
- F2. The 3D surface and the litres read one section function: `boardSectionsWith` in `lib/geometry/volume.ts` builds
  each station's finished rail (`computeRailSection` → `sectionFinishedRail` / `sampledFinishedRail`, D-31's
  `blendFinishedRails` inside the fade) in the rail's own frame and `placedHalfSection(section, outer, inner)` in
  `lib/geometry/board-surface.ts` places it at the station's half-width (`outer`); a swallow's notch uses `inner`.
- F3. So at a wing the whole rail profile — apex, deck marks, the domed deck band, the tucks — shifts inward by the
  wing's step with the half-width, and the deck's height at a given distance from the stringer jumps: the ledge.
  The bottom's tuck line steps the same way (physically right for the rail; wrong for the deck).
- F4. 16-15 (D-32) is making every discrete rail difference fade along the board and adds a 74-board pin of the live
  litres; its executor owns `volume.ts`, `finished-rail.ts`, `board-surface.ts` in wave 10. 16-16 forks after it.
- F5. The CNC files (16-05) and the 3D screen read the surface; the litres (VOLUME) read the sections' areas. A change
  here moves the litres of winged boards only.

## What the plan must settle (measure first, in a scratch copy)

1. The ledge today: on the four presets with a wing added (the TEMPLATE page's wings, one and two wings, the plan's
   own test set) measure the deck's height along the board at fixed distances from the stringer (the stringer, 1/4,
   1/2 and 3/4 of the half-width) through each wing's station: the largest jump in mm (the picture shows several mm).
2. The rule and its candidates: (a) place the rail profile's DECK side from the wing-less curve's half-width
   (`buildCurveOutline`) so the dome is continuous, and clip the section at the stepped outline where the rail is;
   (b) build the section on the wider pre-wing half-width and cut it at the narrower outline; (c) blend the deck
   over a short zone each side of the wing. Measure each: deck continuity (largest jump), the rail apex and tuck
   still at the stepped outline, the litres' move, the 3D-vs-VOLUME gap (D-31's band), mesh faults, the CNC files'
   slices at the wing stations (two widths at one station — how the DXF/XYZ writers carry a wing today).
3. The litres: which boards move and by how much; a pre-change pin of today's live litres for the winged test set,
   bit-identical where no wing exists (every preset as its card opens has no wing → every preset figure unchanged).
4. The bottom: does the founder's rule apply to the bottom too (the tuck line and the bottom contour continuous along
   the board, only the rail stepping)? Propose yes (a wing is a plan-view cut) and ask at the look.
5. Pictures for the founder's look: the 3D deck view and bottom view through a wing before/after (the ledge gone),
   the Side view, the outline from above (the step still there), the CNC slice picture at a wing station.

## Shape

Three tasks like the siblings (tracer with the pin; the rule with tests on the winged set; the founder's blocking
look with pictures), `autonomous: false`, wave = 16-15's + 1, `depends_on: ["16-15", "16-05"]`, PW_PORT=3216, no
database change, the executor_environment in the siblings' style. 16-13 (go-live 2) moves one wave later and
depends on 16-16; its live check should open a winged board's 3D deck view if a practice board carries a wing.

## Added 2026-11-04 (D-34): no little flip at the tips

The founder, from the 3D board: "the very tip of the nose and the tail (both tips on the swallow) have an unnecessary
little flip/angle. Let's not do that little flip." Same plan, same surface code. Settle by measurement: the slope of
the surface's deck line and bottom line over the last 2" into each tip (nose; a squash/pin/round tail's end; a
swallow's two points) against the side profile's (`designSideProfile` / `rockerAt`, `deckAt`) own slope there — the
flip is the angle between them, today in degrees per board; the likely cause is the tip cap (a no-foam station as one
point half the thickness up, `placedHalfSection` in board-surface.ts) and the last real ring's finished rail squeezed
into a tiny width; the fix makes the surface close into the tip along the side profile's deck and bottom curves (the
cap on those curves, the last rings' deck/bottom following them), with the outline's tip as the plan-view point.
Pictures: each tip close up from the side and from three-quarters, before/after, on the Fish (swallow), Shortboard
(squash), a pin and a round tail. The CNC slices at the tips follow.
