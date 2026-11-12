---
created: 2026-11-11
title: RAILS' thin bottom line should meet the tuck band on a rolled rail with channels
area: ui
severity: minor
files:
  - components/rails/rail-section-plot.tsx
  - lib/geometry/rail-bottom.ts
  - components/summary/order-form.tsx
source: Phase 17 fix-wave code review (17-FIXWAVE-REVIEW.md, WR-01), 2026-11-11
resolves_phase:
---

# RAILS' thin bottom line should meet the tuck band on a rolled rail with channels

## Problem

On the Longboard's rolled (soft) rail with channels, RAILS' thin bottom line carries the channels only out to the last
bottom mark and ends at the channel's floor there. The tuck band starts lower, from the bottom without the channel, so
the two lines do not meet: a gap of about 0.05" to 0.115" on the stock Longboard's tail section (0.18" with channels at
1/2"). The wall that stands under the tuck is drawn on the Finished Rail line only. The printed order form's Rail Band
Reference never draws the Finished Rail, so on paper the break is always there. The Shortboard, Fish, Mid-length and
every Hard Edge tail show none. No number is wrong; it is how the drawing reads.

The founder, 2026-11-11, on the three review findings: "Close 17, log as follow-ups".

## What is needed

A look question for the founder first: carry the thin line on under the tuck, or close it with a straight drop at the
last mark. Then the drawing change, with a before-and-after picture on the Longboard (screen and printed Rail Band
Reference) and a geometry test that the thin line and the tuck band share an end point.
