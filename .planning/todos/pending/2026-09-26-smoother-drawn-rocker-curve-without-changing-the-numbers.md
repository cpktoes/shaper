---
created: 2026-09-26T20:17:23Z
title: Smoother-looking drawn rocker curve without changing the PCHIP numbers
area: rocker
severity: minor
files: [components/rocker/rocker-viewer.tsx, components/rocker/rocker-view-frame.ts, lib/geometry/pchip.ts, lib/geometry/board-profile.ts]
---

## Problem

Captured during Phase 11 UAT (2026-09-26, test 7). The founder, in his own words: "I actually like the
smoothness of the spline from the original. The PCHIP curves can look a little sharp."

Phase 11 moved the rocker and foil curves to PCHIP on purpose (R10, D-13): nose rocker jumps hard near
the tip and a plain cubic spline overshoots there, which would print rocker numbers a shaper cannot
trust. R15 forbids changing that interpolation to cure a faceted drawing. The founder's remark is about
how the DRAWN curve looks between stations, not about the numbers — and those two can be separated.

## Solution

Investigate before choosing; the numbers stay PCHIP in every case and a test must prove every printed
figure and every fit verdict is unchanged.

1. First find out what "sharp" is: if the drawn path is a polyline sampled too coarsely between
   stations, denser sampling of the same PCHIP curve for the SVG path alone removes the facets and
   changes nothing else.
2. If the sharpness is PCHIP's own kink in curvature at a station (it is only once-differentiable),
   evaluate a smoother shape-preserving scheme for the drawn path only — one constrained to pass
   through the PCHIP values at the stations and never overshoot between them.
3. Put the options side by side as screenshots for the founder to pick from (the way the RAILS plot
   fit was settled, 260914-v2v), then ship the pick as one quick task.
