---
sketch: 020
name: bottom-channels
question: "With depth settled as a shade and 1/16\" contour lines, where do 4, 6 or 8 channels live in the BOTTOM sidebar — their own card after TAIL, inside the TAIL card, or as a seventh tail cut — and what does Off Rail measure from on a winged board?"
winner: null
builds_on: 019
tags: [bottom, channels, contours, cross-section, layout-marks, wings, sidebar, data, phone, units, themes]
---

# Sketch 020: Bottom channels and layout marks

## Design Question
The founder's rulings on sketch 019 (2026-11-06): **C**, the shade with the lines — *"but lets make the contour lines at
1/16""* — Start and End from the nearest tip, the height multiples kept, the readouts' home still open, the starting
numbers to be set from the shop later (a todo). Then his next asks, the same evening: *"Let's keep planning this for the
best visualization and user experience. I'd like to make it as real as possible and be simple to follow dims for shaping
it. In addition to the trough position and off rail for double concave, I think we also need a stringer clearance
measurement (distance off stringer). I think we can actually add in 4, 6, or 8 channels since you did such a nice job
with this."* And: *"How do we deal with wings? I feel like maybe the right way is to either 1) use the natural outline
(wingless) or, 2) only use the outline from the narrower/narrowest section."*

So three things are built once, in 019's dress, and one is put as variants:

- **Off Stringer** on every double concave — the flat left at the stringer, its own pencil line on the top view, its own
  mark on the ruler and in DATA; the Tri-Plane's flat panel reads as Off Stringer too (half the old Flat Strip), so the
  across marks are one family: Off Rail, Off Stringer, Trough At.
- **Channels** — one more cut, last in shop order, into whatever the three sections leave (a vee, a single, a double):
  4, 6 or 8 (two, three or four a side); Channel Width (one number at every station), Off Stringer (0 by default: the
  stringer is the first peak), Start, Deepest At, End, Depth. **The shape is the founder's** (his two pictures and his
  words, 2026-11-06: *"a channel is actually more like a quick V that goes into a vertical wall, but it can be at
  various angles ... the stringer is also a peak of a V and each channel's peak is the new start of the next V"*): one
  sawtooth out from the stringer — the stringer a peak, each channel's floor deepening outward to a vertical wall at
  the rail side, the top of that wall the next channel's peak, no flat ridge between. So the channels abut, the walls
  are ruled at Width, 2 × Width, 3 × Width out from the stringer (Wall 1, Wall 2, Wall 3 on the ruler and in DATA), and
  what the last wall leaves to the rail is read out, not set (the Width label: *1 3/4" · ramp 8° · last wall 1 9/16"
  off the rail*; a set that would not fit inside the rail is squeezed and says so). The ramp's angle follows from Depth
  and Width; Smoothness runs it from a straight ramp (0) to a scooped one (100); the wall is always at the rail side
  (the founder, 2026-11-07: *"I don't think the wall control is necessary"*). The channels need not all be the same
  length (his ask the same day: *"Channels may need a control for the outer or inner channels are longer"*):
  **Longest** says which pair runs furthest forward — the inner pair (opening), the outer pair, or all the same — and
  **Stagger** (2" opening, in half inches) is how much shorter each channel out from it starts. Start is the longest
  pair's and says so; the Stagger label reads where the shortest pair starts; a wall is ruled and cut only from where its
  own channel starts, so the fronts step across the top view and the walls appear one by one on the ruler as the section
  moves aft; every channel is deepest at the same station and they end together, and a stagger too long stops an inch
  ahead of the deepest station so the shortest channel keeps a lead-in. Three **runs**, after his table of the classic setups: **With the rail** (Rusty's semi-parallel:
  the set keeps its last wall the same distance off the rail, so the channels narrow toward the tail together),
  **Parallel to the stringer** (Merrick's, laid out at the deepest station and ruled straight; the outer ones run out
  through the rail where the outline narrows) and **Toe-in** (Biolos's splayed channels, angled like the front fins —
  the toe-in angle read from FINS, 3.2° on the Shortboard, 2° on the Fish: inward toward the nose, splayed out toward
  the tail, where they run out through the rail; a single-fin Longboard has no toe, and the choice says so). A channel
  narrower than an inch shallows out, as a concave does.
- **Dims for shaping** — the section carries a ruler laid from the stringer under the straightedge with a tick and its
  distance at every layout mark of the live cut (a single's edge; a double's flat, trough and edge; every channel wall),
  on a computer; a phone keeps the depths alone. DATA gets a second table, *Layout marks · off the stringer*, every 6"
  from the tail, one column per mark — so the sheet alone lays the bottom out, station by station, the way channel
  walls are ruled onto a blank.
- **The wing question, as a bar switch** on a fifth board, *Fish, winged* — the Fish with a 1/4" wing with a 1" run, 4"
  ahead of its fins, read from the app's own wing maths (`buildOutline` with `wings`, `curveHalfWidthAt`,
  `wingFootprint`). *Narrowest outline*: Off Rail is measured from the narrowest outline carried forward through the
  wing — the real rail behind the wing's inner corner, and ahead of it the curve less the wing's full depth, so the
  reference never steps and a cut never crosses the rail. *Natural outline*: measured from the curve the shaper drew
  before the wing, which sits outside the real rail everywhere behind the wing (by the wing's take, fading to the tail
  pod), so a concave or the outer channel runs out through the wing's step — the picture shows exactly that.

## How to View
open .planning/sketches/020-bottom-channels/index.html

The bar switches the variant, the board (the four presets and the winged Fish, on their real outlines, thickness and
fin placement), the Off Rail rule, the four themes, Imperial / Metric and Auto / Phone frame. ↺ puts everything back to
its starting numbers. The Shortboard opens with a deep single and six channels, the Fish with a panel vee and four, the
winged Fish with an extending single concave and four (so the wing rule has a concave's edge to move); the Mid-length
and Longboard with none.

## Variants
- **A: Own card** — CHANNELS is a fourth card after TAIL (None / 4 / 6 / 8, the run and the length order, then the sliders), and the phone's
  switch gets a fourth button: NOSE · CENTER · TAIL · CHANNELS.
- **B: Inside Tail** — the channels sit inside the TAIL card under the tail's own cut, the same stacking with one card
  fewer; the tail card grows, and on a phone the TAIL panel scrolls.
- **C: A tail cut** — "Channels" is a seventh name in the Tail picker, chosen *instead of* a vee or a concave: the
  simplest panel, and the honest cost is that channels cannot be cut into a vee or a double (the Fish loses its panel
  vee the moment it takes channels). The Shortboard and both Fish open on it in C.

Everything else is 019's C with the lines at 1/16": the top view nose left with the wide point and front fins ticked
above and the live cut's Start · Deepest · End taped below; the dash-dot cutting line with its grab dot; the section with
the planed bottom as a dashed straightedge, Height ×1 / ×2 / ×4 / ×8, the break line, the finished rail from RAILS as a
ghost, and the gauge-style depths (at the stringer, in the trough or in the channel, the rail lift, the stringer left);
the readouts under the drawing; Rule 2 throughout (the across marks and depths are marks in whole millimetres, the
stations dims in centimetres).

## What to Look For
- Where the channels should live (A, B or C) — and whether cutting channels into a vee or double matters enough to rule
  C out.
- The Off Rail rule on the winged Fish: flip *Narrowest* / *Natural* with the section just ahead of the wing (about 12"
  from the tail) and watch the outer channel wall and the shade at the wing's step.
- The channel's shape in the section: the sawtooth at ×4 — the stringer peak, each floor deepening out to its wall at
  the rail side, the next channel starting at the wall's top — and whether Smoothness should scoop the ramp or do
  something else. The ramp angle and the last wall's distance off the rail on the Width label.
- The three runs on the Fish and the Shortboard: *With the rail*, *Parallel to the stringer*, *Toe-in* at the fins'
  angle, and the run-out through the rail where the gaps have closed or the splay reaches it.
- The length order: *Longest* — Inner pair, Outer pair, All the same — and the Stagger. The stepped fronts on the top
  view, and the walls that come onto the ruler one at a time as the section moves aft. Should the deepest station or
  the ends stagger too, or only the starts?
- The ruler under the section: enough to lay the cut out from, or too much on one drawing? And the layout-marks table in
  DATA — the first columns are the sections' edges, then every channel wall.
- The starting numbers for the channels (1/4" deep, 2 1/2" / 1 3/4" / 1 1/4" wide for 4 / 6 / 8, from the stringer,
  from 10" ahead of the fins to the tail, deepest at the fins, the inner pair longest with a 2" stagger) are a first
  guess like the rest.

## Checked
Headless Chromium at 1280 × 800 and 390 × 844 (iPhone 14, touch): no errors on any variant, theme, units or board. Six
channels on the Shortboard take 0.26 L more than the same cuts without them; the three channels a side abut from the
stringer at 1 3/4" each with the last wall 1 9/16" off the rail; a channel takes its full depth a hair inside its wall,
nothing at its peak, and nothing again just past the wall (the next channel's peak); with the inner pair longest the
Shortboard's three channels start 20 7/8", 18 7/8" and 16 7/8" from the tail, an inch behind the longest start only Wall 1
is ruled and only the inner channel takes foam, with the outer pair longest only Wall 3, with all the same all three, and
a stagger too long stops an inch ahead of the deepest station; the Wall control is gone, the Longest choice and the
Stagger slider are there, and the slider hides for All the same; toe-in moves the first wall from 1 3/4" at the fins to about 1 7/16" six inches ahead and 2" four
inches behind; a double's Off Stringer flat takes nothing
at the stringer or half an inch out and the full cut at its trough; on the winged Fish the two rules differ by the wing's
depth ahead of it, and the narrowest rule measures off the real rail behind the inner corner; the test single of the
planning memory still takes 0.54 L; the ruler draws on a computer and not on a phone; DATA has both tables with the
channel wall columns; the phone's four-button switch sits on one line and the CHANNELS button shows the channel
controls; the page never scrolls as a whole on a phone.

## Source
`sketch-source.tar.gz` holds `board-data.ts` (reads the presets and builds the winged Fish through `phase16Boards`,
`buildOutline` with `wings`, `curveHalfWidthAt`, `wingFootprint`, `placedWings`, `designSideProfile`,
`deriveEffectiveRails`, `designCrossSectionInput`, `boardSections`, `sampledFinishedRail` and `computeFinPlacement` —
never a hand-typed board figure), its `boards.json`, the page template, `build.py`, the Playwright checks and the two picture scripts.
