---
sketch: 003
name: stringer-and-station-lines
question: "Should the stringer be drawn differently from station lines?"
winner: "B"
tags: [viewer, reference-lines, drafting, consistency]
---

# Sketch 003: Stringer and Station Lines

## Design Question

Should the board's centre axis read differently from a 12" station mark, and what treatment should
be shared across every page that draws a plan-view board?

## How to View

```
open .planning/sketches/003-stringer-and-station-lines/index.html
```

## Variants

- **A: Identical** — one dash, one weight, one token for every reference line. Today's outline page.
- **B: Distinct centreline ★** — stringer takes the long-short-short drafting centreline pattern
  (`16 4 4 4`); station lines keep one uniform short dash (`5 4`).

## What to Look For

Whether the stringer reads as the axis the board is built around, or as just another reference line.

## Why B Won

Long-short-short is the standard drafting centreline pattern, so it is already familiar from real
templates. More importantly it reduces the fins viewer from **three dash patterns that carried no
meaning** to **two that do**: axis, or station.

## The Rule

| Line | Dash | Weight | Colour |
|---|---|---|---|
| Stringer / centreline | `16 4 4 4` | 1 | `--outline-station-line` |
| Station line (derived) | `5 4` | 1 | `--outline-station-line` |
| Widepoint station (input) | `2 3` | 1 | `--outline-widepoint-line` (45% of the widepoint knot colour) |
| Extension line (callouts) | solid | 1 | faint |
| Dimension line (callouts) | solid | 1.1 | ink |

Applies identically on Template, Fins, Summary and preset cards. Preset card thumbnails suppress
reference lines entirely via the existing `hideCallouts` gate — that behaviour is unchanged.

## Implementation Note

`--outline-station-line` already exists in `app/globals.css` and holds `#4472c4`. The fins viewer
hardcodes that same hex instead of using the token, and its labels use a third value `#3A5F9E`
that is not a token at all. Both should resolve to tokens. Two new tokens are needed for the dash
patterns so the two treatments cannot drift apart per page.
