# Board Orientation (Template viewer)

## Design Decisions

**Rotate the board in place** (006), and change nothing else on the page. The founder: "Don't change the
layout, only rotate the board horizontally in the same viewer window."

- The viewer panel is already landscape (measured 990 × 737 at 1440 × 900, with the upright board using 17%
  of its width). Turning the board in place gives about **+51% board length** for no layout change; the
  whole-page rebuild (005) gave +116% but cost a page rebuild.
- **One button in the viewer panel's upper-right corner**, in the header row beside the panel title: local
  to the thing it changes.
- **The icon never changes**: one glyph showing both states (the same board upright and on its side, at one
  scale, with a real gap and one arrow). Only the `aria-label` swaps ("Rotate the board to horizontal"). The
  board has a pointed nose and rounder tail; a symmetric pointed ellipse read as a leaf.
- **Vertical is the default and the state is not kept**: no `localStorage`, no setting, and a reload comes
  back upright. **Template viewer only.**
- On touch devices the Rotate button doesn't draw at all (CLAUDE.md: the `coarse` pointer variant), since
  turning the device already turns the board.

## CSS / Implementation Patterns

- Rotation parameterises the viewer's metrics (`outlineViewMetrics`: `lenToY`, `pxX`) rather than forking the
  component, so callouts rotate with the board, and every consumer (Summary cards, thumbnails, fins) keeps
  sharing the helpers.
- The sketch's cheap version was one path drawn into a `150 × 400` or `400 × 150` viewBox with
  `translate(0,150) rotate(-90)` when horizontal (rotation maps (x, y) to (y, −x), and the translate brings
  the nose into frame at the left).
- The icon: one `<path>` drawn twice through `<use>` at a shared scale of 0.62, with `stroke-width` 2.42 so it
  lands at 1.5. It's legible at 19px and tight below 16px, so prefer a 20–22px glyph.

## What to Avoid

- Rebuilding the page around a horizontal board (005: controls under the drawing, full-bleed plot).
  Superseded by rotating in place.
- An icon that flips or changes with state, two boards at mismatched sizes, or a tilted board with arcs
  (mush at 19px).
- Persisting orientation as a preference.

## Origin
Synthesized from sketches: 006 (2026-08-25); 005 excluded (superseded by 006)
Source files available in: sources/006-orientation-switch/
