---
created: 2026-08-27T16:51:33.002Z
title: Template screen: construction-lines toggle button + sidebar-minimize wide view
area: ui
severity: minor
files:
  - components/outline/outline-editor.tsx:125
  - components/outline/outline-controls.tsx:417
  - components/outline/outline-viewer.tsx
---

## Problem

Requested by Chris on 2026-08-27, to be picked up **after Phase 2 (Accounts & Saved
Designs) ships** — explicitly not part of that phase.

On the Template screen (the Outline design screen — the prototype's "TEMPLATE" page),
construction lines can only be toggled via the "View Construction Lines" checkbox buried
in the sidebar controls (outline-controls.tsx:417, `showConstruction` /
`onToggleConstruction`). And the sidebar (the `<aside>` in outline-editor.tsx:125,
`max-w-[400px] basis-[340px]`) permanently takes horizontal space, so the board drawing
never gets the full window width.

Two additions wanted:

1. **A button to toggle construction lines** — on the template page itself (near the
   viewer), not just the sidebar checkbox.
2. **A "wide view" button that hides/minimizes the sidebar and automatically turns
   construction lines ON** — giving the widest possible screen and therefore the biggest
   board display. There must be an affordance to bring the sidebar back.

## Solution

TBD. Likely: viewer-toolbar buttons on the outline screen; a collapsed-sidebar state in
the outline editor layout (collapse the `<aside>`, let the viewer flex to full width);
the wide-view button sets `showConstruction = true` when it collapses the sidebar.
Follow the existing surf-* token styling and the one-menu/one-button visual language.

## Completed

Closed by Phase 3 plan `03-05` (2026-08-28). Both buttons landed exactly as sketched here: a
construction-lines toggle sharing the sidebar checkbox's own state (no drift possible between
them), and a wide-view button that hides the sidebar, turns construction lines on while it's
hidden, and puts everything back the way it was when you turn it off again. Approved live in the
browser across all four themes.
