---
sketch: 014
name: wings-tab
question: "On a WINGS tab of the TEMPLATE page, how does the tail close-up scale once a wing slides past 24\" toward the board's centre?"
winner: "B"
tags: [template, wings, tabs, controls, sidebar, phone, interaction, stinger]
---

# Sketch 014: The WINGS tab

## Design Question
The founder, on seeing sketch 013 (2026-10-14): *"maybe we need an 'add wings' tab on the template page, which provides
this zoomed in section of the tail. Then go back to viewer for the full board. That simplifies the controls too, since
the add wings tab would only have the wing controls and the regular viewer doesn't need them at all."*

And on this sketch's first round: *"26" tail view is great, but the wing position from tail should actually slide up to
the center of the board (for stingers). In which case, we'll need a way to scale the board when the position is more
than 24" from the tail. Maybe >24" we jump to full board view. Do not show board length or other template controls on
the wing tab."*

Then, on this round's build: *"A, sidebar swaps. Also, maybe the smoothing should just be more of a radius rounder on
the wing's outer and inner points rather than also adjusting along the stringer appearance."* And on its pictures:
*"Match sidebar aesthetic to the normal sidebar. Position starts at 2". Increase run along the stringer to 2".
Everything in 1/16" steps (or 1mm). Grab/drag default tied to viewer on/off setting. Let's go with B, window grows
with wing placement."*

So the page is today's TEMPLATE screen with one tab added beside VIEWER — **ADD WINGS** until the board has one, then
**WINGS · 1** or **· 2** — showing the last 26" of the tail at three times the VIEWER's scale with the fins where the
FINS page puts them. While it is open the sidebar holds only the wing controls (round one's A, confirmed: "A, sidebar
swaps"; the in-tab column B is gone, and no board length or other template control appears). Position now runs from
6" to the board's centre. **Smoothing is a corner radius**: it rounds the wing's outer and inner corners, up to the
largest radius whose two rounds still fit on the step — a square 3/8" step rounds up to 3/16", a 1" run allows nearly
3". (Corrected 2026-10-15: the run is not the whole length of the step. The rounds reach a tangent length
`t = R·tan(θ/2)` beyond each end of the run, so a rounded step starts `t` nose-ward of the wing's position and settles
`t` past its inner corner. The fins ignore that rounding — they read the step sharp.) The question left is **how the close-up
scales once a wing passes 24"**, and, as a toggle, whether the wing is grabbed on the drawing (round one's C).

## How to View
open .planning/sketches/014-wings-tab/index.html

Computer (1280 × 800) or phone (390 × 844) via the ⚙ tools, Slate or Daylight. The board is one of the app's own, its
outline built by the app's curve and its fins placed with Import Template ticked. Click the tabs; add a wing from the
tab or the sidebar (the first one switches Show fins on and opens the popup); remove both to see the empty tab; slide a
wing's Position past 24" and watch the view. The sketch bar switches the board, the grab points, and whether a position
marks where the step starts or its middle. Sketch 013's construction is fixed at A, the founder's pick.

## Variants
- **A: Past 24" the tab jumps to the whole board** — the founder's suggestion. The 26" tail view until a wing's position
  passes 24"; then the tab shows the whole board at the VIEWER's scale with the wing's dimensions on it.
- **B: The window grows with the wing ★ (the founder's pick)** — the tail view stretches to hold the wing with 3" of
  room above it, so the drawing shrinks a little with every inch the wing moves up, and the tail and fins never leave
  the picture.
- **C: The window follows the wing** — a 26" window slides up the board with the wing, keeping the close-up's scale; the
  tail and the fins leave the picture once the wing is more than 20" up.

**Grab points** come and go with the Show construction setting — the toolbar's target button or the Settings tick,
shared with the VIEWER, whose own drag points follow the same switch: two per wing, drawn like the app's own drag targets. The outer one slides
the wing along your curve (or sets the offset from the fin when locked); the inner one, hanging just below the inner
corner on the depth dimension's own line, sets the depth (in and out) and the run (along). The corner radius stays a
slider, its top the most that fits the step.

## What to Look For
- Slide a wing to 30" in each variant. A jump (A) is simple and keeps the fins in view, but the wing's dimensions fall
  to the VIEWER's scale; growing (B) is gradual, but a 36" stinger halves the close-up; following (C) keeps the scale
  and loses the tail and the fins. Which reads best for a stinger?
- With two wings — 11" locked to the fin and a stinger at 30" — does the view serve both, or should it follow the wing
  being edited?
- The corner radius: with Run at 0 it tops out at half the depth, since a square step can only round so far; at a 1"
  run it reaches nearly 3". Is a radius the right feel, and should its top be the step's own limit, as here, or a
  fixed 3"?
- The grab points on and off: is the ring-and-dot right, given the VIEWER's own drag points look the same?
- The tab's name: ADD WINGS until there is one, then WINGS · 1. Or always WINGS?
- The empty tab: a card in the drawing offering the first wing, and the same button in the sidebar. Both, or one?
- Should the popup open once per board, or every time a wing is added? Should "Open FINS" really leave the page?

## Tested
In headless Chromium at 1360 px, Slate and Daylight: every variant with a stinger at 30", the VIEWER tab, the empty tab,
the popup and the phone size render with no console errors; the Position slider's maximum is 36" on the 72" default
board (its centre); at 24" the close-up is the 26" window and at 24 1/8" variant A shows the whole board (8.2 px per
inch, the VIEWER's scale); adding the first wing relabels the tab, switches Show fins on and opens the popup; a real
mouse drag of a stinger's outer grab point 1" up moves it 30" → 31"; the corner-radius slider's top reads 3/8" for a
3/8"-deep step with a 1/4" run and 2 15/16" once the run is 1"; Position runs 2" to 36" and Run 0 to 2" in 1/16" steps;
with Show construction off the drawing holds no grab point, and the toolbar's construction button brings both back. The rounded step is checked in `check014.mjs`: each
corner's points lie on a circle of the radius asked, the share of depth runs steadily from 0 to 1 through the step,
and with no rounding the step is exactly the straight line from corner to corner.

**A lesson from the drag check:** with C's window following the wing, the first drag carried a 30" wing to 34 1/2" from
a 1" pull, because the window moved under the pointer with every step and the wing chased it. The window now holds
still while a grab point is held. Whichever variant is built, the view must not re-frame during a drag.

## If it gets built
- The tab is the existing `TabbedPanel` with a second entry, as RAILS and ROCKER already do; the close-up is the
  outline viewer at a tail window rather than a new drawing. On a phone it is today's stacked layout with the drawing's
  and the controls' contents swapped — width still picks the layout, pointer the sizing, height the short-screen rules.
- The sidebar's content swaps by tab; the wing state lives in the design store beside the outline, so the VIEWER, the
  prints, FINS and the rack all read it.
- The grab points extend `lib/geometry/outline-drag.ts`'s inverse with two more targets, and the window is frozen for the
  length of a drag.

## Outcome (2026-10-14)
**Winner: B, the window grows with the wing** — the founder: "Let's go with B, window grows with wing placement." The
same reply settled the rest of the tab: the WINGS sidebar wears the Template builder's own dress (title, ruled section
headings, "Label — value" slider rows with their end words, the same buttons), Position runs from **2"** to the
board's centre, Run along the stringer reaches **2"**, every wing number moves in **1/16" steps (1 mm in Metric)**, and
the grab points follow the viewer's **Show construction** setting rather than a switch of their own. Earlier in the
day: the sidebar swaps to the wing controls on the tab ("A, sidebar swaps"), smoothing is a corner radius, and the tail
behind a wing is re-drawn to the block the shaper set (sketch 013 A).

## Pictures
`pictures/`: `wings-tab-daylight.png` and `-slate` (a sharp wing at 11", locked to the fin, in the dressed sidebar),
`a-stinger-`, `b-stinger-`, `c-stinger-daylight.png` and `-slate` (that wing plus a stinger at 30", 1/2" deep, 3/4" run,
corners rounded as far as they go), `b-stinger-construction-on-daylight.png` (the grab points, with Show construction
on), `viewer-tab-daylight.png`, `empty-tab-daylight.png`, `first-wing-popup-daylight.png`, `b-stinger-phone-daylight.png`.

## Source
`sketch-source.tar.gz`: the page template, the curve code (sketch 013's port of the app's curve, with the wing's step
rebuilt as a rounded corner), the board data, the shape check, the build step and the picture script (which also
performs the slider, jump and drag checks).
