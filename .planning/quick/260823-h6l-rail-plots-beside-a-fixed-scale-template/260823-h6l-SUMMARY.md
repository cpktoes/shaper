---
id: 260823-h6l
slug: rail-plots-beside-a-fixed-scale-template
description: Rail plots beside a fixed-scale template window on the order form
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - c1c8359 feat(summary): rail plots beside a fixed-frame template window
---

# Quick Task 260823-h6l — rail plots left, fixed template window right

Page 1's body is now one row: the three rail section plots stacked down a left column at a third of
the width, and the template window beside them at two thirds. The template window's frame is fixed —
sized once from the board ranges, not around whichever board is loaded.

## Decision (from the user — locked)

**Fixed window, per-board scale.** The frame stops changing shape with the board, so the sheet's
layout never shifts; each board still fits the window's height, so every board prints as large as the
window allows. A narrower or shorter board leaves more blank paper inside the frame — which on this
panel is exactly where the colour design gets drawn.

The alternative — one scale across all boards, so a 6'0" reads visibly shorter than a 9'6" — was
declined: honest relative sizing was not worth printing the common shortboard at 60% of today's size.

## How the frame is sized

From the ranges the outline editor already enforces: length 60–120", widepoint width 16–25". Those
were magic numbers inside `outline-controls.tsx`'s sliders; they now live in `lib/geometry/board.ts`
as `BOARD_LENGTH_RANGE_IN` and `WIDEPOINT_WIDTH_RANGE_IN`, and the sliders read them from there.

**The extreme is the shortest-and-widest board, not the widest.** Per-board scale fits the board to
the view's height, so the scale is *highest* for the shortest board — a 5'0" x 25" therefore renders
wider than a 10'0" x 25". Sizing the frame from the maximum length instead would have produced a
frame that the shortest wide board overflows.

## What changed

- **`RAIL SECTIONS`** moved from a full-width strip under the drawings to a left column at ~1/3. Its
  three plots are stacked rather than side by side — each is now a third of the sheet wide instead of
  a ninth — and each carries its own caption, since they are no longer read left-to-right.
- **`COLOR DESIGN & LOGOS`** takes the remaining ~2/3, its two drawings filling the panel. The old
  centred `w-[46%]` column is gone: the fixed frame now supplies the breathing room that column was
  faking.
- **`cropToBoard` became `fixedFrame`** on `OutlineViewer`. That prop was added on this branch and
  has a single consumer, so it was evolved rather than joined by a sixth display gate. The per-board
  scale logic is untouched; only the viewBox width changed, from "this board's width" to "the widest
  any board can render".
- Retired the `order-form-band-plots` height, which no longer described anything.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **The frame is fixed, measured on two boards.** Both the default 6'0" x 19" and the extreme
  5'0" x 25" render the byte-identical viewBox `36.83 0 266.33 620`, which also matches the constant
  derived by hand. Nothing in the sheet's layout shifted between them.
- **The frame is sized right, not merely large enough.** On the 5'0" x 25" board the outline spans
  50.8 → 289.2 inside the frame's 36.83 → 303.16 — clearance of exactly **14.0 units either side**,
  precisely `CROP_PAD_X`. No overflow and no waste. The 6'0" x 19" board occupies 57% of the same
  frame, its blank remainder being the colour-design space.
- Both boards fill the frame's usable height (bbox height 572 = `VIEW_H - 2 * PAD_Y`).
- **Print, with the extreme board loaded** (worst case for the layout): both sheets pinned to
  733.4 x 990.6px inside the 733.4 x 995.5px page box, both zero overflow, both at zoom 1, both
  `data-print-unfold` containers fitting. Still two pages.
- Console clean on a fresh load. (Transient `ReferenceError`s and a 500 appeared in the buffer during
  editing — the HMR windows between adding each usage and its import — and are gone after reload; a
  server-rendered load would have failed outright otherwise.)

## Note on driving the app during verification

The design store is in-memory and resets on reload, so checking a non-default board required setting
the sliders and then reaching the summary by **client-side** navigation. A URL navigation resets the
board, and `form_input` on a range input does not fire React's handler — the value has to go through
the native setter with `input`/`change` dispatched after it.
