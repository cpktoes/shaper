---
id: 260823-tw9
slug: no-scrolling-order-form-windows
description: No scrolling panels on the order form; shrink the data table to fit
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - c84496e fix(summary): no order form panel scrolls, and the quad fin table no longer vanishes
---

# Quick Task 260823-tw9 — the sheet is paper, so nothing scrolls

`RAIL BANDS` was **62px over at print width** (461 client / 523 content) and 56px over on screen. It
was the only scrolling container on either sheet, and it now fits — as does everything else, in every
fin configuration.

## Why every previous audit missed it

My clipping checks looked for content exceeding a box with `overflow: hidden` or `clip`. This
container was `overflow-y-auto`: it **scrolled** rather than clipped, so it never appeared. Every
"zero clipping" result across the last several tasks was true and still missed this.

The audit now checks `auto`/`scroll` containers too, and the panels themselves moved to
`overflow-hidden` — so a future regression surfaces as clipping, which the audit catches, instead of
being silently absorbed by a scrollbar.

## Making it fit

- **Row type down**, `2cqw` → `1.75cqw` (14.7px → 12.8px at print), clear of the 9pt/12px floor.
- **Row line-height tightened** to `leading-tight` on both tables. The rows inherited a 1.5 body
  line-height, which across nineteen rows was most of the overflow on its own. Line-height is not
  font size, so it costs nothing against the floor.

Rail bands is at its **maximum row count already** — 15 is the ceiling the merged table can reach
(7 rail + 5 deck + 3 bottom, domed and no hard edge) and that is what the current board shows. So its
31.5px of headroom is measured against the worst case, not a lucky one.

## The bigger thing this turned up

Testing the worst-case fin setup rather than assuming it — quad with a centre fin, three sections —
found a defect far worse than a scrollbar:

**The 5th/Center Fin's numbers were invisible.** The section list used CSS `columns: 2`, chosen
because it adapts to a section count that varies from one to three. It does adapt — but in a
fixed-height box it adapts *sideways*: the third section spilled into a third column **697px off the
edge of the sheet**, where `overflow: hidden` erased it. A shaper ordering a quad would have got a
form with no centre fin placement on it at all.

Two attempts to fix it, and the first was not enough:

1. A `grid-cols-2` wrapped the third section onto a second row — no horizontal loss, but it then
   clipped **156px vertically**, because the panel has no room for two rows.
2. Making the **column count follow the section count** (capped at three) puts every section in one
   row, so the panel's height is set by the tallest section rather than by stacked rows. Three
   columns across 688px still keeps each label beside its own number, which was the point of columns
   in the first place.

## Verification

Both fin configurations driven through the real UI and measured, not reasoned about:

| | rail headroom | fin headroom | fin cols | scrolls | clips |
|---|---|---|---|---|---|
| Thruster (2 sections) | 31.5px | 90px | 2 | 0 | 0 |
| **Quad + centre (3 sections)** | 31.5px | **15.2px** | 3 | **0** | **0** |

- Zero scrolling and zero clipping on **both screen and print**, in both setups.
- Both sheets zoom 1, zero overflow, still two pages. Smallest print type still exactly 12px.
- An intermediate state fitted with **−0.8px** headroom — a knife-edge that a different printer's
  rounding could clip — so the fin rows were tightened too, taking it to 15.2px.
- `npx tsc --noEmit` clean; `npx eslint` clean (one pre-existing unused-var warning in
  `outline.test.ts`); `npx vitest run` 638 passed / 7 files.

## Note

Two rounds of measurement were wasted on stale HMR: the DOM still carried the old `[columns:2]` class
while I measured the "fixed" layout. Reading the element's own `className` before trusting a
measurement is the cheap check, and it is what caught it both times.
