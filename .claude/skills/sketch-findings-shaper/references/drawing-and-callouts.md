# Drawing & Callouts (the board viewers)

## Design Decisions

The viewers read as **technical drawings a shaper already knows how to read**, like a real shaping
template, not as app UI with numbers floating on it. Restraint is the whole point: one ink for dimensions,
one dash for stations, one dash for the stringer, and no colour doing decorative work.

1. **Callout grammar: drafting dimension lines, each snapped to a fixed rail** (001 D). Light extension
   lines, ticked dimension lines, the value in a break in the line. The shortest dimension sits nearest the
   part, and a short span puts its value outside the ticks. A new label must join a rail or define one,
   never land wherever it fits. Arbitrary placement is the enemy, since every measured defect in the old
   fins viewer came from per-label pixel arithmetic.
2. **Inputs and outputs are told apart by system** (002 C), not by colour or punctuation. Computed values
   get dimension lines; what the shaper typed gets name + value chips in a gutter (`TAIL BLOCK / 4" wide`).
   Rule per page: the viewer shows computed placement, and inputs appear as chips only where the dimensions
   are the subject of the screen. So Template shows both, and Fins shows outputs only (its inputs are in
   the sidebar).
3. **Reference lines** (003 B, 004): the stringer and the mid-length centreline use the drafting
   centreline `16 4 4 4`, station lines `5 4`, the widepoint station `2 3` in the widepoint colour (45%),
   all faint, and identical on every page that draws a plan-view board.
4. **Nothing inside the outline but faint lines** (004 A). No text crosses the silhouette. Derived widths
   read out to **one aligned right rail**, and input chips sit in the left gutter with horizontal leaders.
   Length is an input chip at the top of the left gutter.
5. **The widepoint is an input even at centre.** On a board where centre and widepoint sit 0.36" apart and
   read the same number, **colour** separates the widepoint station from the centreline, because a dash
   difference alone isn't legible 4px apart.
6. **Labels are SVG `<text>`** with `text-anchor`, never absolutely positioned HTML over the drawing.

| Line | Dash | Weight | Colour |
|---|---|---|---|
| Stringer / centreline | `16 4 4 4` | 1 | `--outline-station-line` |
| Station line (derived) | `5 4` | 1 | `--outline-station-line` |
| Widepoint station (input) | `2 3` | 1 | `--outline-widepoint-line` |
| Extension line | solid | 1 | faint |
| Dimension line | solid | 1.1 | ink |

Preset and rack card thumbnails suppress reference lines entirely (`hideCallouts`, `showConstruction={false}`).

## CSS Patterns

```css
/* reference lines are SVG strokes, never borders; one token per role */
.stringer { stroke: var(--outline-station-line); stroke-dasharray: 16 4 4 4; stroke-width: 1; }
.station  { stroke: var(--outline-station-line); stroke-dasharray: 5 4;      stroke-width: 1; }
.widepoint{ stroke: var(--outline-widepoint-line); stroke-dasharray: 2 3;   stroke-width: 1; }
```

## HTML Structures

```html
<svg viewBox="0 0 340 620"><!-- board fill + ink outline; reference lines; then -->
  <g class="output-rail"><text x="282" text-anchor="start">19"</text><!-- one x for every output --></g>
  <g class="input-chips"><!-- chips right-aligned to x = 58, horizontal leaders to the part --></g>
</svg>
```

Layout constants from 004 (revision 2): chip width 96, chip right edge x = 58, board x 94.5 to 245.5, and
output values from x = 282 in a 340-wide frame.

## What to Avoid

- Free-floating labels at per-label offsets (001 A's measured defects: five leader styles, two near-identical
  blues, hardcoded hex instead of tokens, labels with no background colliding with lines).
- Gutter-only chips for computed values (001 C): they can't collide, but they pull numbers away from what
  they measure.
- Parenthesised reference dimensions (002 B) as the input signal: a bracket is a convention a shaper has to
  be taught.
- Hugging the outline (004 B): each value starts at a different x as the outline curves, and reads as
  carelessness.

## Origin
Synthesized from sketches: 001, 002, 003, 004 (2026-08-22)
Source files available in: sources/001-viewer-callout-system/ … sources/004-clean-interior-svg/ (they link
the stale `themes/default.css`; the live palette is `app/globals.css`)
