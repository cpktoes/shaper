---
sketch: 001
name: viewer-callout-system
question: "What grammar should dimension callouts use on the board viewers?"
winner: "D"
tags: [viewer, callouts, svg, drafting, fins, outline]
---

# Sketch 001: Viewer Callout System

## Design Question

What grammar should dimension callouts use on the board viewers, so they read as a professional
technical drawing rather than scattered labels?

## How to View

```
open .planning/sketches/001-viewer-callout-system/index.html
```

## Variants

- **A: Current** — today's fins viewer, reproduced faithfully. Free-floating labels, five
  leader-line variants, two near-identical blues.
- **B: Dimension lines** — drafting convention. Light extension lines, ticked dimension lines,
  value in a break in the line. One ink for all dimensions.
- **C: Gutter** — values in fixed left/right columns as chips, short leaders to each anchor.
  Overlap becomes structurally impossible.
- **D: Hybrid ★** — B's drafting grammar with C's alignment discipline. Every dimension line snaps
  to one of a small fixed set of rails.

## What to Look For

Compare where the values sit relative to the geometry, and whether the offsets look chosen or
accidental. In A, six labels sit at six unrelated offsets. In D, every dimension line is on a rail
and the shortest dimension sits nearest the part.

## Why D Won

The rail system is the part that lasts. B fixes today's drawing but its offsets are picked per
drawing, so the next label can still invent a new one. C can never collide but pulls the numbers
away from what they measure. D keeps each number on its own measurement axis while making arbitrary
offsets structurally impossible.

## Measured Defects This Replaces

Taken from the live fins viewer at 1280×720, not estimated:

| Defect | Evidence |
|---|---|
| Five leader-line style variants | Three dash patterns (`6 4`, `2 2`, solid) at identical colour and weight |
| Two near-identical blues | Labels `#3A5F9E`, lines `#4472C4` |
| Token bypassed | `#4472C4` hardcoded although `--outline-station-line` already holds that exact value |
| No label backgrounds | Every label `background-color: rgba(0,0,0,0)`, so digits collide with lines |
| Placement by arithmetic | Per-label pixel offsets; the `(tier-1)*20` stacking formula previously mis-centred single-fin callouts by a full 20px |

## Implementation Notes

- Affected: `components/fins/fin-viewer.tsx`, `components/outline/outline-viewer.tsx`, and their
  consumers `fin-placement-editor.tsx`, `outline-editor.tsx`, `board-summary.tsx`, `preset-card.tsx`.
- Labels are currently absolutely-positioned HTML `<div>`s over the SVG, not SVG `<text>`. That is
  why placement is hand-computed. Moving to SVG text with `text-anchor` would let the drawing do the
  alignment work — worth deciding during implementation.
- The rail offsets must be enforced in code (labels assigned to a rail), not left to per-label
  positioning, or the system will drift straight back to today's scatter.
