---
sketch: 006
name: orientation-switch
question: "How does the shaper turn the board horizontal, without moving anything else?"
winner: "Rotate in place, from a button in the viewer's upper-right corner"
tags: [viewer, layout, icon, interaction, post-mvp]
---

# Sketch 006: Rotate the Board in Place

Follows sketch 005, and **narrows it deliberately**.

005 asked what the whole Template screen looks like rebuilt around a horizontal board —
controls moved under the drawing, plot run full-bleed to the window edges. This sketch asks a
much smaller question, which is the one the founder actually wants answered:

> "Don't change the layout, only rotate the board horizontally in the same viewer window.
> We're not trying to rearrange the entire page, just rotate the board in the viewer window."

So: same nav, same sidebar, same viewer panel, same everything. Only the board turns.

## How to View

```
open .planning/sketches/006-orientation-switch/index.html
```

The rotate button is live — click it and the board turns inside the frame it already occupies.
The readout under the app reports the board's drawn size, measured from the DOM after each
render rather than asserted, so the numbers are observed.

## The finding that makes this work

The app's viewer panel is **already landscape**. Measured on the running app at 1440 × 900, the
framed viewer is **990 × 737** — an aspect of 1.34:1 — and the vertical board inside it is drawn
**168 × 637**. It fills the height completely and uses **17% of the width**.

That wasted width is the whole opportunity. Turning the board costs no layout change at all,
because the room is already there:

| | Board drawn | Length on screen |
|---|---|---|
| Vertical (today) | 168 × 637 | 637 px |
| **Rotated in place** | ~964 × 254 | **~964 px (+51%)** |
| 005's full rearrangement | 1379 × 364 | 1379 px (+116%) |

In the sketch's own frame the measured gain is **+58%** (296 → 467 px).

So rotating in place captures roughly **half of 005's total gain for none of its cost** — no
moved controls, no full-bleed breakout, no new vertical budget problem, no separate print path
to think through. 005's remaining advantage is real but it is bought with a page rebuild.

## The control

A single button in the viewer panel's upper-right corner, in the header row beside the panel
title. Two reasons it goes there rather than in the sidebar or the settings menu:

1. It is **local to the thing it changes** — the board is right below it.
2. The viewer header already exists and already holds panel-level chrome, so this adds a
   button, not a new region.

**The icon turns with the view.** In vertical state it shows an upright board; in horizontal
state the board inside the icon is rotated. The button therefore always depicts the current
orientation, and its `aria-label` names the destination ("Rotate the board to horizontal").

### Drawing the icon

Modelled on the familiar phone-rotate glyph — a tilted device with two arcs sweeping around it
— with a real planshape in place of the rounded rectangle: **sharp nose, belly, narrower rounded
tail**. A symmetric pointed ellipse was tried first and read as a leaf, not a board.

Both arcs and both arrowheads are **one shape plus its 180° rotation about the centre**, so they
cannot drift out of symmetry at any size.

Two rounds of tuning, both driven by looking at it at production size rather than at 200px:

- **First attempt:** full-length board, long 55° arcs. At 19px the board and the arcs crossed
  and the whole glyph turned to mush.
- **Over-correction:** board scaled to 0.74 and arcs cut to 28°. Clear, but the arrows read as
  two detached ticks rather than a rotation.
- **Landed:** board at 0.74 (keeping the clearance), arcs back out to ~46°. The sweep reads,
  and the two shapes never cross.

## Known caveat

**Below about 16px the glyph gets tight.** Three elements — board outline, two arcs, two
arrowheads — is a lot for that size. It is legible at the 19px the sketch uses, but if this
gets built, consider a 20–22px icon in a slightly larger button. The proof sheet at the bottom
of the sketch renders the icon at 30/24/20/19/16/14px so this is judged by looking rather than
by guessing.

## What this does not answer

- **Whether the choice persists.** The sketch treats orientation as view state that resets. If
  it should stick, `lib/theme.ts` is the precedent to copy — a `shaper-view` key beside
  `shaper-theme`, plus a pre-hydration read so the first paint does not flip.
- **Whether the other screens get the same button.** Rails, Fins and Summary all render board
  drawings too.
- **Print.** The Summary sheet and the full-size template export both render `OutlineViewer`;
  a screen-only rotation must stay screen-only, or be thought through separately for paper.

## Implementation note (unchanged from 005, still the crux)

`outlineViewMetrics` / `OutlineViewer` hard-code the station axis to y and the half-width axis
to x (`lenToY`, `pxX`). A horizontal mode means **parameterising that mapping**, not forking the
component — every consumer (Summary cards, preset thumbnails, fin viewer) shares those helpers.

This sketch's own rotation is deliberately the cheap version of that: one path, drawn into either
a `150 × 400` or a `400 × 150` viewBox, with `translate(0,150) rotate(-90)` when horizontal —
rotation maps (x,y) → (y,−x), so the translate brings it back into frame with the nose at the
left. The real component needs the same idea applied to the metrics, so callouts rotate too.
