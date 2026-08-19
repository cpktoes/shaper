---
created: 2026-08-19T21:48:58.000Z
title: Mobile/phone-width layout polish for the design screens
area: general
severity: minor
files:
  - components/outline/outline-editor.tsx
  - components/rails/rail-band-editor.tsx
  - components/fins/fin-placement-editor.tsx
  - components/volume/volume-estimator.tsx
  - components/site-nav.tsx
---

## Problem

Surfaced during the 01-01 tracer's Task 3 checkpoint (2026-08-19), narrow-width check.
User's exact report at ~375px viewport width: "yes it reduces to the width of the single
nav menu then stops. The cards start to overlap the sidebar, but I think we can tackle a
phone sized window at a later phase."

So: the top nav itself degrades acceptably (shrinks to the nav's own minimum width and
stops there, no wrapping/clipping of the SHAPER wordmark or tabs). But the aside+main
two-column design-screen layout (outline/rails/fins/volume, fixed via 01-01's `flex-nowrap`
+ `h-full` columns) does not have a responsive breakpoint for phone-width viewports — the
sidebar and viewer column overlap instead of stacking or scrolling independently at very
narrow widths.

Explicitly deferred by the user — not a Phase 1 blocker. Phase 1's target usage is desktop/
laptop shaping sessions; phone-width support is a later-phase polish pass.

## Solution

TBD. Likely a responsive breakpoint (e.g. `min-[640px]:flex-nowrap` reverting to a stacked
`flex-col` below that) on the shared aside+main shell across the four design screens, plus
re-verifying the SHAPER wordmark/nav tab row at true phone widths (320-375px) still holds.
Revisit when planning mobile/responsive support explicitly.
