---
created: 2026-08-23
title: Horizontal board view (nose left) as an option on the Template screen
area: ui
severity: minor
files:
  - components/outline/outline-editor.tsx
  - components/outline/outline-viewer.tsx
  - components/outline/outline-controls.tsx
  - components/viewer/callout-primitives.tsx
source: design exploration with the user 2026-08-23; working mockup on branch design/horizontal-template-view
resolves_phase:
---

# Horizontal board view (nose left) as an option on the Template screen

**Post-MVP.** Not a replacement for the current vertical layout — an alternative view the
shaper can switch to. The user's assessment: "I'm liking the horizontal board view as an
option that can be added to the app later. Layout will still need some work."

## What it is

The Template screen with the board turned on its side, nose to the left, and the plot given
the full window width instead of sitting beside a sidebar:

- Board Length card upper left, page title centred above the board, Settings card upper right
- Nose / Widepoint / Tail controls in three columns **under** the board, replacing the sidebar
- Plot is full-bleed — it breaks out of the page container and runs to within 24px of each
  window edge

The motivation is board size. A 6'0" x 19" board is a 3.8:1 shape, so a horizontal frame
suits it far better than a vertical one; in the mockup at 1440x900 the drawn board reaches
**1379 x 364 px** against roughly 955 x 252 for the first (page-width) attempt.

## What the mockup already settled

Working mockup lives on branch `design/horizontal-template-view`, at
`.planning/sketches/005-horizontal-board-view/index.html`. It runs the real `lib/geometry`
engine inline, so the curve, the drag solver and every readout are the app's own.

1. **The callout grammar rotates cleanly.** Sketches 001-004 hold. Outputs (Nose @ 12",
   Centre, Tail @ 12") read *up* to one shared rail above the board; input chips sit on a
   rail below it, directly above the sliders that set them.
2. **Length becomes a nose chip**, leadered to the tip, mirroring Tail Block at the tail —
   not a dimension line under the board (tried, rejected: it cost a whole gutter row).
3. **Widepoint and WP Offset stack vertically**, the same pairing the vertical layout uses in
   its left gutter.
4. **Dragging reads better horizontally.** `solveOutlineDrag`'s widepoint and rail handles
   only accept motion *along* the board (`lib/geometry/outline-drag.ts`, the `widepoint` and
   rail-handle cases). Horizontally that is left/right, which is the direction the Offset
   slider's own "Tail <-> Nose" hints already point; vertically it was an up/down drag
   driving a left/right slider.

## What still needs work

- **Vertical budget.** At 1440x900 the page scrolls ~78px — the Tail Angle / Fullness row
  sits just under the fold. The arithmetic: a 6'0" x 19" board at 1392px wide is 367px tall,
  and 367 + 140 of callout gutters + nav + title band + three control panels does not fit in
  900px. Above ~1000px of viewport height it fits with no scroll. The lever is the controls
  block — dropping the left/right hints under each slider buys back roughly 50px.
- **Sizing rule is a heuristic.** The mockup gives the stage the height that lets the board
  fill the width, yielding to the window only below a floor of 56% of viewport height. That
  floor is tuned by eye, not derived.
- **Narrow windows.** Below ~900px the three control columns stack and the layout's whole
  argument disappears; the mockup holds a 680px minimum drawing width and scrolls sideways.
- **How the shaper switches views**, and whether the choice persists with the saved model.
- **Print path.** The Summary sheet and the full-size template export both render
  `OutlineViewer`; a horizontal orientation must stay opt-in for the screen only, or be
  thought through for paper separately.

## Implementation note

`outlineViewMetrics` / `OutlineViewer` currently hard-code the station axis to y and the
half-width axis to x (`lenToY`, `pxX`). A horizontal mode means parameterising that mapping
rather than forking the component — every consumer (Summary cards, preset thumbnails, fin
viewer) shares those helpers, and the mockup's own rewrite showed the change is confined to
the mapping functions plus the gutter constants in `callout-primitives.tsx`.
