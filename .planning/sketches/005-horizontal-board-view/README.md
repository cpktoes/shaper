---
sketch: 005
name: horizontal-board-view
question: "What does the Template screen look like with the board horizontal, nose left?"
winner: "C"
tags: [viewer, layout, callouts, svg, post-mvp]
---

# Sketch 005: Horizontal Board View

> **Status, 2026-08-25.** Two things changed since this was drawn.
>
> 1. **Refreshed onto the current palette.** It was written against the literal token names
>    (`surf-base`, `surf-black`, `surf-accent-blue`) that commit `35f4c57` retired, so it had
>    been rendering a palette the app no longer has. It now carries all four themes at their
>    current values, obeys the fill/`on-` pairing rule, and drops the rose widepoint knot. A
>    theme switcher was added to the masthead — sketch chrome, not part of the design.
> 2. **Its layout premise is superseded by [sketch 006](../006-orientation-switch/).** The
>    founder's direction is to rotate the board *inside the existing viewer panel* and leave
>    the page alone. 006 measures that at **+51%** board length for no layout change, against
>    this sketch's +116% for a full page rebuild. Read 005 for the callout-rotation findings,
>    which still hold; do not read it as the plan.

Post-MVP exploration, not scheduled work. Backlog entry lives on `main` at
`.planning/todos/pending/2026-08-23-horizontal-board-view-option.md`.

The user's brief, in two passes:

1. "What would this webapp look like if the template page had the board horizontal with the
   nose to the left. Board length controls in the upper left, nose, width, tail under the
   board, and settings in the top right, with the page title centered above the board."
2. "The main reason for this is to make the board as large as possible. The plot needs to be
   the full window width. Stack WP and OFFSET cards vertically. Put the length card attached
   to the nose (like tailblock) rather than under the board."

## How to View

```
open .planning/sketches/005-horizontal-board-view/index.html
```

Unlike sketches 001-004, this one is **live**, not a static drawing. `lib/geometry`
(`units`, `board`, `outline`, `outline-drag`) is transpiled to JS and inlined into the page,
so the sliders, the tail-shape buttons and the drag handles all run the app's real engine.
The curve on screen is the curve the app would draw. Tick **View Construction Lines** to grab
a control point.

Regenerate the inlined engine with:

```
npx tsc lib/geometry/units.ts lib/geometry/board.ts lib/geometry/outline.ts lib/geometry/outline-drag.ts --target es2022 --module es2022 --moduleResolution bundler --outDir <tmp> --skipLibCheck
```

then concatenate the four outputs, strip the `import` statements and the `export` keywords,
and paste the result above the `Mockup wiring` banner in `index.html`.

## Variants

- **A: Page-width plot** — the drawing sits inside the page container, length drawn as a
  dimension line under the board, WP Offset beside the Widepoint chip.
- **B: Page-width, height-fit** — same, with the stage taking only the leftover screen height.
- **C: Full-bleed, nose-anchored length ★** — plot spans the window, length becomes a chip
  leadered to the nose tip, Widepoint and WP Offset stacked.

## Why C Won

The brief was board size, and A and B both failed it for the same reason: the board was
**height-bound**, so widening the frame bought nothing. At 1440x900:

| Variant | Drawn board | Width used |
|---|---|---|
| A | 955 x 252 | 69% |
| B | 1175 x 310 | 84% |
| C | **1379 x 364** | **99%** |

Getting to C took three changes beyond going full-bleed, because width alone was never the
binding constraint:

1. **Callout gutters cut from 176px to 140px** — tighter output rail, 32px chips, and the
   length dimension line replaced by a chip.
2. **NOSE / TAIL cues moved above the tips** instead of outside them, handing 108px of
   horizontal padding back to the board.
3. **The sizing rule inverted** — the stage now takes the height that lets the board fill the
   width, and yields to the window only below a floor of 56% of viewport height. Previously it
   took the leftover height and letterboxed whatever that produced.

## What This Locks In (if it is ever built)

1. **Sketches 001-004 survive rotation.** Outputs read to one shared rail *above* the board,
   inputs to a rail *below* it. The rule that a label joins a rail or defines one is
   orientation-independent, which is the main thing this sketch was testing.
2. **Inputs sit next to their controls.** Rotating puts the input chip rail directly above the
   Nose / Widepoint / Tail sliders. In the vertical layout the chips are on the opposite side
   of the screen from the sidebar that sets them.
3. **Length is a nose chip, not a dimension line.** A nose-to-tail dimension line reads well —
   it is how a real template is drawn — but it costs a whole gutter row, and the row is worth
   more as board height. Leadering LENGTH to the tip mirrors TAIL BLOCK at the other end.
4. **WP Offset stacks under Widepoint**, as in the vertical gutter. Side-by-side works at wide
   viewports but collides with the Tail Block chip as the window narrows.
5. **Dragging matches the sliders.** `solveOutlineDrag` accepts only along-board motion for the
   widepoint and both rail handles. Horizontally that is left/right — the same axis as the
   Offset slider's "Tail <-> Nose" hints.

## Known Gaps

- **~78px of scroll at 1440x900.** A 6'0" x 19" board at 1392px wide is 367px tall; 367 + 140
  of gutters + nav + title band + three control panels exceeds 900px. Fits cleanly above
  ~1000px of viewport height. Biggest available saving is the per-slider hint row (~50px).
- **The 56% floor is eyeballed**, not derived from anything.
- **Below ~900px** the control columns stack and the layout's argument disappears; the drawing
  holds a 680px floor and scrolls sideways rather than shrinking to illegibility.
- **View switching and the print path are unexplored** — Summary cards and the full-size
  template export share `OutlineViewer`, so a horizontal mode has to be opt-in for the screen.

## Two Bugs This Sketch Caught

Both would have shipped into a real implementation:

1. **Chip leader lines stole pointer events from the drag handles.** The leaders are drawn
   after the hit circles in DOM order, so they sat on top; a `pointerdown` aimed at the
   widepoint handle hit the leader instead. Fix: collect hit targets and append them last,
   after every decorative element.
2. **Callouts and handles scaled with the drawing.** The live app pins them to CSS pixels via
   `pinnedCalloutSizes` / `useSvgFitScale`; the first mockup did not, and a 15px grab target
   rendered at 8px. Fix here is simpler than the app's: set the viewBox to the stage's own
   pixel size so one user unit is one CSS pixel, and no counter-scaling is needed at all.
   Worth considering for the app.
