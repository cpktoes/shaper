---
created: 2026-09-15T03:18:08.497Z
title: Show live coordinates under the pointer on the Template and Rocker curves
area: ui
severity: minor
files:
  - components/outline/outline-viewer.tsx
  - components/rocker/rocker-viewer.tsx
  - lib/geometry/outline.ts:155
  - lib/geometry/rocker.ts:204
---

## Problem

Captured 2026-09-14 from the founder's own request: "mouse pointer over the template and rocker
outlines should provide live coordinates so users can check dims at any point along the curve."

Today the Template and Rocker drawings label only their fixed stations — the tips, the 12"
stations, the widepoint and the centre — so a shaper who wants the width 20" up from the tail, or
the rocker 30" up, has to read it off a printed template or estimate between labels. The curve is
the product; every point on it should be readable on screen.

## Solution

TBD — hints:

- TEMPLATE (`components/outline/outline-viewer.tsx`): as the pointer moves over the drawing, show a
  readout of the station (distance up from the tail) and the width at that station.
  `sampleOutline` (`lib/geometry/outline.ts:155`) already returns the half-width at any station,
  so this is a viewer readout, not new geometry. A dot snapped onto the curve at the pointer's
  station, or a thin crosshair, makes it obvious which point is being read.
- ROCKER (`components/rocker/rocker-viewer.tsx`): the same for station and lift via `sampleRocker`
  (`lib/geometry/rocker.ts:204`); the Rocker & Foil screen could read thickness at the same
  station too (`sampleFoil` in `lib/geometry/foil.ts`).
- Format every number through `lib/geometry/units.ts` so the readout follows the shaper's
  Imperial/Metric choice: station and width are dims (fractions / one-decimal cm), lift is a mark
  (fractions / whole mm).
- Hover is a mouse or trackpad thing (the `fine` pointer). A finger has no hover, and the drag
  handles already live on these curves, so on touch this is either a tap-to-read readout or left
  alone — decide that with the founder rather than guessing.
- Keep the math in `lib/geometry/`; nothing about the stored design changes.
