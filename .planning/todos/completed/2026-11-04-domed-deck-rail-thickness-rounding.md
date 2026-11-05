---
created: 2026-11-04
title: On a domed deck the rail's thickness rounds to the nearest 1/16" along the board, which the 3D board shows as small steps
area: lib/geometry (rail bands / finished rail)
severity: low
files:
  - lib/geometry/rail-bands.ts
  - lib/geometry/finished-rail.ts
  - lib/geometry/volume.ts
found_by: the 16-15 planner's probes, 2026-11-04 (Phase 16, D-32)
---

## Problem

With a domed deck, the rail section's thickness is rounded to the nearest 1/16" at each station before the finished
rail is built. Along the board that rounding changes in 1/16" steps, so the 3D board's rail (and the litres' sections)
step by about 0.86–1.02 mm at roughly 25 places on the Mid-length preset. The rule is older than Phase 16 — it is how
the DATA tab's station figures read — and 16-15's fade removes every OTHER step between the tail, centre and nose,
which makes this one visible.

## Suggested fix

Keep the 1/16" rounding for what is printed and read (the DATA tab, the order form) but build the finished rail and the
litres from the unrounded thickness, so the surface is smooth; prove by the 3D-vs-VOLUME relation test and a step
scan along the rail (largest second difference), and by the DATA tab's figures staying as they are. Its own quick task,
after Phase 16; the founder's ruling 2026-11-04: "Yes, file a to-do."
