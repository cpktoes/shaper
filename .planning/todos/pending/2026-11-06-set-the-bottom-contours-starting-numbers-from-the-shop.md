---
created: 2026-11-06
title: Set the BOTTOM page's starting numbers for each contour name from the shop
area: bottom
severity: minor
files:
  - .planning/sketches/019-bottom-contours/README.md
  - .planning/sketches/020-bottom-channels/README.md
source: the founder, 2026-11-06, reviewing sketch 019 ("need a reminder to address later")
resolves_phase:
---

# Set the BOTTOM page's starting numbers for each contour name from the shop

## Problem

Every one of the founder's 18 contour names (six each for Nose, Center and Tail — Flat Entry, Rolled Belly Entry,
Teardrop Nose Concave, Blended Nose Concave, Slight Single Concave Entry, Reverse Vee Nose; Flat Center, Deep Single
Concave, Shallow Single Concave, Early Double Concave, Continuous Belly / Rolled Mid, Tri-Plane Hull Center; Flat Exit,
Double Concave Exit, Panel Vee, Spiral Vee, Rolled Vee, Extending Single Concave) opens a cut with starting numbers:
Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth, Smoothness, and for the channels (sketch 020) the
count, width, run and the same marks. Those numbers were taken from forum posts during the 2026-11-06 planning session,
not from the founder's shop, and he said so when asked: *"need a reminder to address later."*

They sit in the `NAMES` table (and `makeChannels`) of the sketches' templates — `sketch-source.tar.gz` under
`.planning/sketches/019-bottom-contours/` and `020-bottom-channels/` — and will move into `lib/geometry/` with the
BOTTOM phase, where they become the numbers a shaper sees the moment a name is picked.

## What is needed

Before the BOTTOM phase ships, walk the 18 names (and the 4 / 6 / 8 channel defaults) with the founder and replace
each starting set with his own: where the cut starts, is deepest and ends on each preset, how far off the rail and off
the stringer, how deep, how smooth. Record each as inches from the tail (or the nose, for the nose section) the way the
`NAMES` table does, so the phase's planner carries them straight into the geometry fixtures.

Also still open from the same review: where the live readouts (foam off, litres now, stringer at the center) should
live — under the drawing as sketched, or in a sidebar card ("TBD").
