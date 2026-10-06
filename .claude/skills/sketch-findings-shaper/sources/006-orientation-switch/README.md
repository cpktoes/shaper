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

**The icon never changes.** It shows both orientations at once, so it reads as "rotate" in
either state — no flip, no rotation, one glyph. Only the `aria-label` swaps, so the button still
announces where it is going ("Rotate the board to horizontal").

### Drawing the icon

Modelled on the phone "rotate screen" glyph that shows **both states side by side** — an upright
device, the same device on its side, and a single arrow from one to the other. With a real
planshape in place of the rounded rectangle: **sharp nose, belly, narrower rounded tail**.

One path, drawn twice through `<use>`, at the **same scale** in both copies — it is one board
being turned, not two boards of different sizes. Because the shared scale is 0.62, the
`stroke-width` is set to 2.42 so the drawn weight lands at 1.5.

Three rounds, each driven by looking at the thing at production size rather than at 200px:

- **A tilted board with two arcs** (the first reference). At 19px the board and the arcs
  crossed and the glyph turned to mush; shrinking the board fixed the collision but left the
  arrows reading as two detached ticks.
- **Two boards, mismatched sizes.** Clearer, but the smaller laid-down board read as a
  different, fatter object rather than the same board turned.
- **Landed:** two copies at one scale, side by side with a real gap between them, and a single
  arrow tucked into the upper left pointing down at the laid-down board. The gap is what keeps
  it readable small — the two shapes never touch.

A symmetric pointed ellipse was tried for the board and read as a leaf. The asymmetry —
pointed nose, rounder tail — is what makes it a surfboard at a glance.

## Known caveat

**Below about 16px the glyph gets tight.** Three elements — board outline, two arcs, two
arrowheads — is a lot for that size. It is legible at the 19px the sketch uses, but if this
gets built, consider a 20–22px icon in a slightly larger button. The proof sheet at the bottom
of the sketch renders the icon at 30/24/20/19/16/14px so this is judged by looking rather than
by guessing.

## Settled scope

Decided by the founder while reviewing this sketch:

- **Vertical is the default view.** Nothing changes about how the app opens.
- **It does not persist across sessions.** Orientation is view state, not a preference — no
  `localStorage` key, no pre-hydration read, no settings-menu entry. A reload comes back
  vertical. This is deliberately *less* machinery than the theme preference, not an oversight.
- **Template viewer only.** Rails, Fins and Summary do not get the button, even though they
  render board drawings too.
- **The icon does not change with state.** One glyph, both states.

That scope keeps the change genuinely small: a view-state boolean in the Template screen, a
button in the viewer header, and the metrics mapping below.

## Still to think through

**Print.** The Summary sheet and the full-size template export both render `OutlineViewer`.
Since rotation is Template-screen view state that never persists, this should fall out
naturally — but it is worth confirming that neither print path can observe the rotated state.

## Implementation note (unchanged from 005, still the crux)

`outlineViewMetrics` / `OutlineViewer` hard-code the station axis to y and the half-width axis
to x (`lenToY`, `pxX`). A horizontal mode means **parameterising that mapping**, not forking the
component — every consumer (Summary cards, preset thumbnails, fin viewer) shares those helpers.

This sketch's own rotation is deliberately the cheap version of that: one path, drawn into either
a `150 × 400` or a `400 × 150` viewBox, with `translate(0,150) rotate(-90)` when horizontal —
rotation maps (x,y) → (y,−x), so the translate brings it back into frame with the nose at the
left. The real component needs the same idea applied to the metrics, so callouts rotate too.
