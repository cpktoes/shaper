---
phase: quick-260822-n02
plan: 01
subsystem: ui
status: complete
tags: [summary, fin-viewer, svg, viewbox, layout, clipping]

requires:
  - phase: quick-260822-lg3
    provides: the outlineViewMetrics frame pattern this reuses for the fin viewer's own frame
provides:
  - fin-viewer.tsx VIEW_MIN_Y/VIEW_WIDTH/VIEW_HEIGHT -- a viewBox that actually contains the drawing, replacing the hardcoded "0 0 530 370" that clipped its own content
  - Summary right column sized by need -- Volume Estimate content-height, Fin Placement taking the remainder
affects: [.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md -- the print sheet can now be finished against a Summary that is not clipping]

actuals:
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "The fin viewer's frame constants live next to the drawing constants they derive from (TAIL_Y, SCALE, VIEW_TOP_MARGIN), so the viewBox cannot drift away from what is drawn into it"

key-files:
  modified:
    - components/fins/fin-viewer.tsx
    - components/summary/board-summary.tsx
---

# Summary: Fin placement diagram no longer clipped

The report was "the diagram is getting cut off, and Volume has spare space we could give it". Those
turned out to be two independent problems, and only fixing the second would have scaled a
still-clipped drawing up.

## 1. The drawing overflowed its own viewBox

`fin-viewer.tsx` drew into `viewBox="0 0 530 370"` while its own content started **above y=0**:

- `svgTopY` = `TAIL_Y - (24 - VIEW_TOP_MARGIN) * SCALE` = `320 - 23.4*14` = **-7.6**, and every term
  is a module constant, so this was true for every board ever drawn.
- Measured content bboxes: tail outline path top **-15.7**, centreline **-7.6**, compact heading
  **-25.1**.

That last one means the Summary's `6'0" · 14 3/4" tail` heading was rendered entirely outside the
viewBox — it has never been visible on that screen.

The viewBox now starts at `VIEW_MIN_Y = -36`, named alongside the constants it derives from, with
`VIEW_HEIGHT` computed rather than restated. The aspect wrapper reads the same constants instead of
hardcoding `aspect-[530/370]`, which would have letterboxed against the taller frame.

## 2. The right column split 50/50 regardless of need

Volume Estimate and Fin Placement were both `flex-1 min-h-0`. Volume is four rows of text; the fin
diagram wants everything it can get. Volume is now `flex-none` and Fin Placement keeps the remainder.

## Verification

| | Before | After |
|---|---|---|
| Fin card height (1280x860) | 326px | **522px** |
| Volume card height | 338px (~120px of content) | **142px** |
| Content clipped by the viewBox | 25.1 units off the top | **none, any side** |
| Compact heading visible | no | **yes** |

- Summary: no clipping on any side, whole diagram and all four callouts inside the card.
- Fins screen (same component, non-compact): also no longer clipped — top margin 20.3 units where it
  used to overflow. Its rendered scale is unchanged at 1:1, because that screen is width-limited, so
  the taller viewBox cost it nothing.
- `npm test` 633 pass, `tsc` and `eslint` clean, no console errors on either screen.

## Note

The Fins screen's SVG is letterboxed inside its stretched flex parent — the drawing is centred with
vertical dead space. That predates this change (the old fixed aspect fought the same stretch) and is
cosmetic, so it was left alone rather than folded into a fix for a different report.
