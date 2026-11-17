---
created: 2026-11-16
title: Belly bottoms and Symmetrical (50/50) rails in the .brd import
area: export
severity: minor
files:
  - lib/geometry/brd-rails.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/bottom.ts
source: the founder, 2026-11-16, during quick 261116-jqz — "It seems like these belly bottoms should blend into a symetrical rail (i.e. longboard 50/50 style) nicely but I rarely see .brd imported as symentrical rails." Set aside the same day ("don't worry about the rails thing. focus on the belly fix").
resolves_phase:
---

# Belly bottoms and Symmetrical (50/50) rails in the .brd import

## Problem

A log with a belly bottom usually has soft 50/50 rails, and the founder expects such a file to open with RAILS' Symmetrical
switch on. It rarely does. The rail fit (`lib/geometry/brd-rails.ts`) tries Symmetrical on and off and keeps the closer one,
and on a belly bottom the Symmetrical rail loses.

Measured on 92Log.brd (one of the founder's sample files in `~/Downloads` — never committed, copied into the repo or named in a
test) before quick 261116-jqz: with Symmetrical on, the widest miss was about 4.0 mm, against 1.9 mm for the rails the import
picked, and the miss sat on the centre section's underside about 1 1/2" in from the rail.

## Likely cause (unconfirmed)

The belly's lift (`cutFoamOffParts`: it rises toward the rail) and the Symmetrical rail's mirrored tuck may both take foam off
the same spot under the rail, so the bottom near the rail comes out too high and the Symmetrical rail can't match the file.
Check this first by drawing the 92Log centre section with the belly alone, the Symmetrical rail alone, and both.

## What is needed

1. Confirm or rule out the double-counting above, on 92Log and on the app's own longboard boards (export → import round trip).
2. If it is double-counting, settle with the founder how a belly and a Symmetrical rail share the foam under the rail. That
   changes what RAILS draws and the litres for any saved board that has both, so it is his call, not the fit's.
3. Re-measure all twelve sample files through `brdLookFromBytes`, and table which ones open Symmetrical before and after.

Since quick 261116-jqz a belly can carry an Off Stringer panel, and the rails-first try starts at 3 mm (D-08). Re-measure on
that code, not the figures above.
