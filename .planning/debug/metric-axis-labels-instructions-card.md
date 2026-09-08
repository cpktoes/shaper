---
status: diagnosed
trigger: "Phase 8 UAT gap G-08-9 (test 9) — Metric axis numbers on the INSTRUCTIONS example rail"
created: 2026-09-08T21:02:28Z
updated: 2026-09-08T21:02:28Z
goal: find_root_cause_only
---

# Metric: the example rail's axis numbers collide and clip on the INSTRUCTIONS card

## Symptoms
- With Metric chosen, on /design/rails > INSTRUCTIONS (Flat and Domed): the bottom-axis numbers 210 … 20, "10 mm", 0 run into one another; the left-axis numbers 90 … 20 and "10 mm" are cut at the plot's left edge (80 reads as 30, "10 mm" as "m"). Imperial is clean. Screenshot: card1-flat-metric-light.png.

## Evidence
- DOM measurement (headless Chrome, 1440x900): 14 pairs of adjacent x-axis labels overlap; 9 y-axis labels lie outside the svg's box. Same in Flat and Domed, light and dark.
- The card's plot renders at fit scale 0.785 (457.6px wide for a 582.8-unit viewBox = 486.8 + 96 callout pad). components/rails/rail-section-plot.tsx: `SCALE = 56`, `LEFT_PAD = 22`, `AXIS_LABEL_PAD = 20`; Metric iterates ticks on a 10 mm pitch (22 labels across 8.7 in of axis); the axis font is pinned to a screen size (`pinnedCalloutSizes`), so at 0.785 each 14px label is ~18 viewBox units tall and a three-digit label ~28 units wide — wider than the 10 mm pitch (22 units) and wider than the 22-unit left pad. The svg clips at its box (default overflow), so the two-digit y labels lose their first digit.
- The VIEWER plots (fit scale 1.2) lose only the left edge of "10 mm"; the printed third sheet (fit scale ~1.8) is clean — the fault is specific to the small render, not to the Metric tick maths.

## Root cause
The plot's tick density and left padding were sized for Imperial single digits at the VIEWER's render size; the INSTRUCTIONS card draws the same plot in a 350px-tall card where Metric's 10 mm labels no longer fit the pitch or the pad.

## Files involved
- components/rails/rail-section-plot.tsx — Metric tick pitch and LEFT_PAD
- components/rails/rail-instructions.tsx — the small-render caller (fit="height" in a 350px card)

## Suggested fix direction
Thin Metric x-axis labels when the available pixels per tick fall below a label's width (e.g. label every 20 or 50 mm, keep the grid), and give y-axis labels room in Metric (wider LEFT_PAD or svg overflow visible) — while keeping the VIEWER and the printed sheets pixel-identical in Imperial (existing bounds tests pin those).
