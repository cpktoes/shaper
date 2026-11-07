---
sketch: 019
name: bottom-contours
question: "What does a BOTTOM page look like — two linked views of the contours plus a DATA table, the three sections' cuts in the sidebar, live litres — and how should depth read on the top view: a faint shade, contour lines, or both?"
winner: C
tags: [bottom, contours, viewer, cross-section, sidebar, data, litres, phone, units, themes]
---

# Sketch 019: Bottom contours

## Decision (the founder, 2026-11-06)
**C — shade with lines**, with the contour lines at every 1/16" of depth rather than 1/8" (*"shades and lines are the way
to go, but lets make the contour lines at 1/16""*). Start and End stay taped from the nearest tip (*"yes"*). The height
multiples stay as options (*"a nice option"*). Where the readouts live is still open (*"TBD"*). The starting numbers behind
each name need his correction later — recorded as a todo, `2026-11-06-set-the-bottom-contours-starting-numbers-from-the-shop.md`.
His next asks (*"let's keep planning this for the best visualization and user experience ... as real as possible and be
simple to follow dims for shaping it"*): a stringer clearance for the doubles, and 4, 6 or 8 channels after all — both
in sketch 020, with the question of what Off Rail measures from on a winged board.

## Design Question
The founder (2026-11-06, planning while go-live 2 of the 3D board ran): a page of its own, BOTTOM, between ROCKER and
RAILS — his shop order, after the outline is cut and the blank planed to near finished thickness, before rail banding.
Two views, *"looking down on the template to mark out the shapes and locations, and a cross section view that moves up
and down the board, showing the blend and depth"*, with his controls (Location, Off rail, Length, Depth, Smoothness), and
the panel *"very similar to RAILS"*: Nose, Center and Tail, each with its own contour type and its own controls. He liked
the rough chat widget *"so long as its aesthetic fits in with the other aspects of the app"*.

The rulings this sketch builds on (the planning memory, 2026-11-06): the app's thickness is the PLANED number and the
contour comes out of it; depth runs to 1/2" in 1/16" steps; no printed contours or card gauge; presets stay Flat;
Channels and Bonzer left out. His 20 names are 18 once those two go — six per section — and they are five cuts:
Flat, Belly, Vee (Panel, Rolled, Reverse Vee Nose, Tri-Plane), Single concave (Slight Entry, Blended Nose, Teardrop,
Shallow, Deep, Extending) and Double concave (Early, Exit, Spiral Vee). Cuts stack in shaping order and only ever take
foam away, so Single to Double is two cuts with the stringer left as the ridge, and Spiral Vee is a double cut into a vee.

The one visual question the sketch puts as variants: how depth reads on the top view. Sketch 004 ruled "nothing inside
the outline but faint lines", and the 2026-08-23 todo said shading would have to be argued against that rule.

## How to View
open .planning/sketches/019-bottom-contours/index.html

The bar switches the variant, the board (all four presets on their real outlines, thickness and fin placement, read
from the app's own maths), the four themes, Imperial / Metric and Auto / Phone frame. Below 820 dots wide — or in the
frame — the page is the phone stack: the drawing pinned above, the NOSE · CENTER · TAIL switch, one section's controls
beneath. ↺ puts every section back to its starting numbers.

## Variants
- **A: Shade** — depth as a faint wash inside the outline, darker where the cut is deeper, in the muted ink at 4% per
  1/32"; each concave's edge as a pencil line, a double's trough as a dotted line, a tri-plane's flat strip as two lines.
- **B: Contour lines** — no wash: a faint line at every 1/16" of depth, like a topographic map, honouring 004 literally.
- **C: Shade with lines** — A's wash with a line at every 1/8" over it: the shade shows the shape, the lines give the number.

Everything else is the same in all three:
- **The top view**, nose left like ROCKER: the board fill and ink edge, the stringer's `16 4 4 4`, the wide point's `2 3`
  in the widepoint colour and the front fins' `5 4`, both ticked and named on one rail above the board. Under it, on
  one rail, the live section's layout marks — Start · Deepest · End — ticked and taped (from the nose for the Nose
  section, from the tail for Center and Tail). The section's cutting line is the drawing convention's dash-dot with a
  grab dot in the accent under the board: drag it, or tap the board, and the section follows.
- **The cross-section** at that station: the planed slab with the square rails BOTTOM finds (no bands yet), the planed
  bottom as a dashed straightedge rail to rail, the cut above it, and the finished rail from RAILS as a ghost line sitting
  on what the contour left (a tick box turns it off). Height ×1 / ×2 / ×4 / ×8, labelled on the drawing; when the slab
  would not fit it is broken with a break line, the drawing convention again. Dimension lines where a shaper would put
  a gauge: the gap under the straightedge at the stringer, the lift at each rail, a double's trough on its own line,
  and the stringer left when the whole slab is drawn.
- **DATA**: every 6" from the tail (the honest centimetre conversion in Metric) — width, deepest cut, rail lift, stringer
  left — the wide point's and front fins' rows in full ink.
- **The sidebar**: RAILS' dress — INPUTS with sketch 017's readout card (Length, Width, Thickness, "Thickness is the
  planed number"), then NOSE, CENTER and TAIL, each a Cut picker of its six names and, by the cut: Off Rail, Trough At
  (doubles), Flat Strip (Tri-Plane), Start, Deepest At, End, Depth (0 to 1/2" in 1/16", whole millimetres in Metric),
  Vee Lift (Spiral Vee), Smoothness, and on a nose single "Closes to a point toward the center" (Teardrop). Every
  station slider runs nose (left) to tail (right) like the drawing, the Center and Tail ones filled from the dot to the
  tail as ROCKER's Tail Thinning Starts is.
- **Live readouts** under the drawing in 017's figure style: foam off, the litres now, and what the stringer finishes
  at the center — "Planed 2 1/4" at the center · 29.61 L before contours · contours only take foam away".
- **Rule 2**: Depth, Off Rail, Trough At, Flat Strip, the lifts and thicknesses are marks (whole mm); Start, End,
  Deepest At, the stations and widths are dims (cm to one decimal); litres the same in both systems.

## What to Look For
- Does the shade (A) read as a drawing, or does it break 004's rule? Do the lines (B) read without a key? Is C too much?
- The two views together on a phone: is the pinned area the right share, and is the section's ×4 the right default?
- The section's labelling: the straightedge, the break line, the ghost rail, the gauge-style dimensions.
- The sidebar's control set per cut, the names in the picker, and the starting numbers (forum-derived, not yours).
- Whether Start / End should be taped from the nearest tip (as drawn) or always from the tail.

## Checked
Headless Chromium at 1280 × 800 and 390 × 844 (iPhone 14, touch): no errors on any variant, theme, units or board; the
drag and a tap both move the section; Metric labels read in cm and mm; DATA draws its rows; the phone frame on a
computer gives the same stack. The planning memory's test single (3/16" deep, 2" off the rail, 16" off the nose to
6" off the tail) takes 0.54 L off the Shortboard in the sketch's own integration (the memory's rough figure: 0.55).

## Source
`sketch-source.tar.gz` holds `board-data.ts` (reads the presets through `phase16Boards`, `designCrossSectionInput`,
`designSideProfile`, `deriveEffectiveRails`, `buildOutline` and `computeFinPlacement` — never a hand-typed board
figure), its `boards.json`, the page template, `build.py` and the Playwright checks.
