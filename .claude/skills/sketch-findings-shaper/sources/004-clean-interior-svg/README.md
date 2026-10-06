---
sketch: 004
name: clean-interior-svg
question: "Where do values go once nothing may sit inside the outline?"
winner: "A"
tags: [viewer, callouts, svg, information-design, refinement]
---

# Sketch 004: Clean Interior, SVG Text

Refinement of sketches 001-003 after review. Four new constraints from the shaper:

1. Nothing but **faint lines** inside the outline, and **no text in there at all**.
2. **Stringer and centreline are both static** and can share one treatment.
3. **Widepoint is an input** even when it sits at centre; **centre width is a derived output**
   like the nose and tail stations.
4. **Every input is a chip**, including length; **tail block must say what it measures**.
5. **All input leaders horizontal** — no angled leaders.
6. **Board centred between the two callout columns**, with the inputs given real breathing room.

Plus a technique decision: labels are **SVG `<text>`**, not absolutely-positioned HTML.

## How to View

```
open .planning/sketches/004-clean-interior-svg/index.html
```

## Variants

- **A: Aligned rail ★** — every derived width reads out to one shared right-hand rail.
- **B: Hug the edge** — each value sits just outside the outline at its own station.

## Why A Won

B puts each value closest to what it measures, but because the outline curves, the three values
start at three different x positions (230, 257, 240). The ragged edge reads as carelessness, and it
shifts as the board's shape changes. A's single rail holds still whatever the outline does.

## The Coincidence Case This Solves

On the current board, measured from the running editor:

| | Value |
|---|---|
| px per inch | 7.914 |
| True centre | y = 311.10 |
| Widepoint station | y = 313.97 |
| Separation | 2.87 px = **0.36 in** |
| Both widths | **~19 in** |

Centre and widepoint are a third of an inch apart and read the *same number*. Two full-width lines
there would collide and two identical labels would be indistinguishable. So:

- **Centre** — static centreline (shared with the stringer) plus a value on the output rail.
- **Widepoint** — a station line in the widepoint colour on its own dotted dash, plus rail dots and
  a chip.

  *Revised 2026-08-22.* This originally specified dots only, with no line across the board. In the
  built screen that read as an absence rather than a station, so the widepoint now gets a line too.
  What keeps it apart from the centreline it can sit 4px from is **colour, not dash** — at that
  separation a dash difference alone is not legible.

Same number, visibly different kinds of thing. This is the case that justifies the whole
input/output split.

## Rules This Locks

| Element | Treatment |
|---|---|
| Stringer | Static — `16 4 4 4`, faint |
| Centreline (mid-length) | Static — `16 4 4 4`, faint — matches the stringer |
| Nose / tail 12" stations | Derived — `5 4`, faint |
| Widepoint | Input — station line in `2 3` at 45% widepoint colour, plus rail dots |
| Interior text | **None** |
| Outputs | Right rail, aligned, with station name beneath |
| Inputs | Left gutter chips, each naming its own value |
| Length | Input chip, top of the left gutter, horizontal leader to the nose |

Chips are name + value pairs (`TAIL BLOCK / 4" wide`), so no chip depends on the reader inferring
what it measures — that fixes the bare `4"` specifically and every future chip generally.

## Implementation Notes

- **SVG text, not HTML overlays.** This supersedes the open question in sketches 001/002. Using
  `text-anchor` lets the drawing do its own alignment instead of per-label pixel arithmetic — which
  is the root cause of every defect catalogued in 001.
- Verified in-browser: zero `<text>` nodes intersect the board's bounding box, zero absolutely
  positioned HTML overlays.
- The output rail x is a single constant. Adding a station means adding a row, never choosing a new
  offset.

## Layout Constants (revision 2)

Set numerically so the board sits centred between the two callout columns:

| | Value |
|---|---|
| Chip width | 96 |
| Chip right edge | x = 58 |
| Board | x = 94.5 -> 245.5 |
| Output value left edge | x = 282 |
| **Left gap** (chips -> board) | **36.5** |
| **Right gap** (board -> outputs) | **36.5** |

Every input leader is horizontal, verified in-browser (zero leaders with `y1 != y2`). WP offset
carries no leader at all — it modifies the widepoint and is grouped directly beneath it, which
avoids inventing a target for a value that has no single point on the board.
