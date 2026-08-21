---
quick_id: 260821-rss
slug: rails-plots-shared-scale
date: 2026-08-21
status: planned
source: user report 2026-08-21 (follow-up to 260821-rpf)
files_modified:
  - components/rails/rail-band-editor.tsx
---

# Quick Task: All three rail plots must share one scale and aligned x-axes

**User requirement:** "All 3 plots should share the same scaling. If increasing the thickness of one
causes a scenario where scaling needs to occur, it should occur equally to all three plots so that
they maintain a vertically aligned x-axis and 1:1 scaling of X:Y as well as X:X and Y:Y between
plots."

## Why the previous fix (260821-rpf) does not satisfy this

Measured live at 1280x720, all thicknesses at maximum:

| Plot | viewBox | rendered | scale | left edge |
|---|---|---|---|---|
| Nose | 486.8 x 190.8 | 300 x 118 | 0.6171 | 690 |
| Centre | 486.8 x 246.8 | 317 x 161 | 0.6504 | 682 |
| Tail | 486.8 x 190.8 | 300 x 118 | 0.6171 | 690 |

The centre plot renders ~5% larger than nose/tail and its left edge is 8px further out, so the
x-axes do not line up. Within a plot `scaleX == scaleY` already (aspect ratio is preserved), so the
1:1 X:Y requirement is met; the failure is X:X and Y:Y **between** plots.

Cause: 260821-rpf gave each wrapper a flex share proportional to its natural plot height, but each
wrapper also contains a fixed-height title. Subtracting a constant from each proportional share
leaves plot heights that are no longer proportional, so the scales diverge.

## Key structural fact that makes this easy

In `computeRailPlotBounds` (`rail-section-plot.tsx:69-78`):

```
width = (0.15 - minX) * SCALE + LEFT_PAD     // minX derives from xAxisMin only
height = (maxY - minY) * SCALE + AXIS_LABEL_PAD  // per-section
```

`xAxisMin` is the SHARED `sharedXAxisMin` passed to all three sections, so **every section's viewBox
width is identical**; only heights differ. Confirmed live: 486.8 for all three.

Therefore rendering all three at the same **rendered width W** automatically yields:

- one shared scale, `W / viewBoxWidth`, identical for every plot (X:X and Y:Y consistent)
- identical left and right edges, so the x-axes are vertically aligned
- per-plot height `W * vbH / vbW`, i.e. still proportional to natural height and still isotropic

So the whole requirement reduces to choosing one common width.

## Fix

In `components/rails/rail-band-editor.tsx`, size the plot stack from a single measured width.

1. Measure the plots container with a `ResizeObserver` (height `H` and width `Cw`). There is
   existing precedent for a measure-and-fit hook in this codebase — `useSummaryPrintFit` — follow
   its shape rather than inventing a new pattern.
2. Compute the chrome consumed by the stack: each section's title height plus the inter-section
   gaps. Measure it rather than hardcoding, so a font or spacing change cannot silently break the fit.
3. Solve for the common width:

   ```
   availablePlotH = H - chrome
   W = min(Cw, MAX_PLOT_W /* the existing 420px cap */, availablePlotH * vbW / sumOfVbH)
   ```

   where `sumOfVbH` sums `computeRailPlotBounds(...).height` over the OPEN sections only, and `vbW`
   is the shared viewBox width.
4. Apply `width: W` to each section wrapper and let each `RailSectionPlot` render with the default
   `fit="width"` inside it. Revert the `fit="height"` + proportional `flexGrow` approach from
   260821-rpf — it is superseded by this.
5. Recompute whenever the container resizes, a section opens/closes, or any thickness changes
   (i.e. when `sumOfVbH` changes).

Guard against degenerate values: if `H` or `Cw` is 0 (initial paint, hidden pane), fall back to the
width cap rather than emitting a 0-width plot.

## Acceptance — measure, do not eyeball

For each of: default thicknesses; all thicknesses at max (centre 3.5", nose/tail 2.5"); one section
collapsed; two sections collapsed; and a short window (~1280x650):

- `scaleX` and `scaleY` are **identical across all open plots**, to within floating-point rounding
- `scaleX === scaleY` within each plot (isotropic, 1:1 X:Y)
- all open plots have **identical left and right edges** (x-axes vertically aligned)
- no scrollbar anywhere in the viewer, nothing clipped, page does not scroll
- collapsing a section lets the remaining plots grow

Compute scale as `renderedWidth / viewBoxWidth` and compare across plots — that is the assertion
that actually encodes the user's requirement.

## Verification

- `npm run test`, `npm run lint`, `npm run build` pass
- The Summary dashboard's compact rail plots (`fit="height"` call site in
  `components/summary/board-summary.tsx`) must be unchanged
- The 01-01 layout invariant holds: body viewport-clamped, sidebar scrolls independently, page never
  scrolls
- Dev server is orchestrator-managed on port 3000 — do NOT start another
