---
created: 2026-11-05
title: The standalone volume estimator's Cross-Section Thickness rows still read the 1/16"-rounded rail thickness
area: lib/geometry (rail bands / volume estimator)
severity: low
files:
  - lib/geometry/rail-bands.ts
  - lib/geometry/volume.ts
found_by: the 16-16 executor, 2026-11-05 (Phase 16, D-41)
---

## Problem

The founder's rule (D-41): "We ONLY want to round to a 1/16" when we output/display data." The board, the litres and the
CNC files now read the actual thickness, but the standalone estimator's Cross-Section Thickness rows still read
`computeRailBands`, so they are built on the rounded figure. They are neither the board nor the litres quoted when a
template is imported.

## Suggested fix

Feed those rows from the actual thickness and round only where they are displayed. The founder, 2026-11-05: "File a to-do."
