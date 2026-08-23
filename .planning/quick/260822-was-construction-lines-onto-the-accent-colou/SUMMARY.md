---
gsd_summary_version: 1.0
quick_id: 260822-was
slug: construction-lines-onto-the-accent-colou
date: 2026-08-22
status: complete
commits:
  - 2b39ef6 feat(design): accent construction lines and round drag targets
---

# Summary — Accent construction lines + round drag targets

## What shipped

**Construction lines** now carry the accent (`--outline-construction` repointed from
the teal `#4d8a86`). The overlay is interactive scaffolding whose lines lead to the drag
handles, so it belongs with everything else interactive.

**Control points** are three-part targets: board-fill disc, accent ring, orange core.

**Applied to exactly the five draggable points.** The overlay drew seven identical `r=4`
dots, but only the widepoint knot and the four handle ends move — the tail pod and nose
tip are fixed anchors. Those two stay plain dots, so a round target now always means
"grab this" and a plain dot never does. Before, the affordance was indistinguishable
from decoration, which is the actual reason the control points did not read as draggable.

**Sizing counter-scales** like the callout text (260822-vbo). A grab handle is a UI
affordance, not geometry, and a hit target whose physical size changes with the window is
a usability problem rather than a cosmetic one. Declared in CSS px, divided by the live
fit: measured 14px visual and 30px hit area, constant across viewports.

The visuals carry `pointer-events: none` with the transparent hit circles on top, so a
pointerdown can never land on decoration instead of the grab area.

## Palette note

Orange is the warning colour from 260822-vo2 and this uses it as an interaction hot spot.
Different register — a 5px core inside a target on a drawing will not be mistaken for a
warning message under a slider — but it does widen orange's meaning from "warning" to
"attention". Founder's explicit call; recorded so the drift is deliberate rather than
accidental.

## What the drag verification did and did not establish

Dragging could not be driven through the automation harness — neither a synthetic
`PointerEvent` sequence nor the harness's own click-drag moved the widepoint, most likely
because `setPointerCapture` and `getScreenCTM` do not cooperate with injected events.

Rather than guess, the same test was run against HEAD with these edits stashed: **identical
result**. That establishes this change did not regress dragging, which was the risk worth
ruling out (the new visuals sit over the hit circles).

It does **not** establish that dragging works end-to-end — that remains unverified by
automation here and wants a human check with a real mouse.

## Verification

Five targets render, two fixed knots stay plain, construction lines are accent blue,
sizes hold across viewports. Lint clean, 633 tests pass, production build compiles.
