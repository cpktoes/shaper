---
created: 2026-10-18T00:00:00.000Z
title: Clear the TEMPLATE toolbar off the readings on a sideways phone
area: ui
severity: minor
files:
  - components/outline/outline-editor.tsx (the VIEWER toolbar)
  - components/outline/wings-panel.tsx (the WINGS toolbar, whole-board view)
  - components/viewer/toolbar-button.tsx
---

## Problem

Found while planning quick 261018-e6w (drag points and fin placement as toolbar buttons). On a phone held
sideways the TEMPLATE toolbar sits over the top row of readings on the drawing:

- **Pixel 7 sideways (863 × 360):** with the new fin button, the Tail @ 12" reading (`14 3/4"`) and its label
  end up entirely under the fin and Wide View buttons.
- **iPhone sideways (844 × 390):** the top 8 px of that reading are covered.
- **Before 261018-e6w:** Wide View already covered the right ~21–24 px of the same reading.
- The WINGS tab's whole-board view has the same overlap.

The founder, 2026-10-18: build the buttons now and sort the sideways layout out on its own ("Note it for later").

## Solution

TBD — options the 261018-e6w planner measured:

- Stack the toolbar down the right edge on a short screen: does not work — with the ghost button showing it
  lands on the TAIL BLOCK card.
- Start the drawing below the toolbar on a short screen (height alone, the inline `max-height:500px` rule):
  works, but the board draws about 13% smaller there.
- Move the readings' top row clear of the toolbar's corner instead (a drafting-grammar change — see
  `Skill("sketch-findings-shaper")`).

A review picture of the Pixel sideways case is in `.planning/quick/261018-e6w-…/pictures/` once that task runs.
