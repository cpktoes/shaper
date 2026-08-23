---
id: 260823-ggs
slug: move-the-rail-band-and-fin-placement-dat
description: Move the rail band and fin placement data to a second page of the order form
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 67330b3 feat(summary): split the order form into a form page and a shaper reference page
---

# Quick Task 260823-ggs — the order form becomes two pages

`/design/summary` is now two portrait pages, printed front and back.

**Page 1 — the order form.** Header, dimensions row, rocker placeholder, `COLOR DESIGN & LOGOS`,
rail section plots, glassing.

**Page 2 — the shaper's reference.** Identification strip, then `RAIL BANDS` marking data and
`FIN PLACEMENT` numbers, side by side, each with a half-page.

## What the front gained

The body row's full width came free, and it went to the muse's own use for that space: its board
outlines live inside a big panel captioned `COLOR DESIGN AND LOGOS`, blank around the drawings so a
customer can sketch artwork on it. The `OUTLINE` panel took that name and that job — the two
drawings are held to the middle 46% of the panel so the blank paper falls either side of them rather
than in one useless margin, and each drawing is now about 40% larger than it was.

The rail *section plots* stayed on the front. They are drawings, not text, and the point of the
change was graphical space. Their captions now cross-reference the other page (`marking data
overleaf` / `plots overleaf`) so neither half strands the other.

## What page 2 had to be given beyond a bigger box

**A type scale of its own** — this is the part that would have quietly defeated the whole change.
The sizes are `cqw` units against the container, and the container is the same width whichever page
a table sits on, so moving the tables to a roomier box left them at exactly the same tiny size, now
surrounded by white space. The reference sheet restates the scale at about 1.55x: table rows go from
9px to 14px, headings from 8px to 12.4px.

Both the `--order-form-*` and the `--summary-font-*` groups had to be restated, not just the first.
A custom property whose value contains `var()` is substituted where it is **declared**, not where it
is used — so the `--summary-font-*` aliases resolved against the root's values and inherit down
already-resolved. Redeclaring only `--order-form-*` would have left every embedded view — which is
the entire rail data table — at the front page's size. Verified after the fact: the rail table's rows
compute to 13.96px on page 2 and the front page's captions are still 8px.

**An identification strip.** A back page comes off the printer loose and gets carried to the blank on
its own, so it carries the board name and the four numbers that identify a board. Both pages also
carry a `Page n of 2` marker.

## Two print bugs found and fixed while wiring this up

1. **`width: 100% !important; height: 100% !important` on the sheet.** Correct when the hook sized
   the *root* and one sheet filled it. With the hook now sizing each *sheet*, those percentages
   resolve against the root — which is no longer a page and has no height — so `height: 100%` would
   have resolved to auto and thrown the page-box sizing away. `!important` also beats the hook's
   inline style, so this was not a near miss. The rule is now just `aspect-ratio: auto`.
2. **Sheets sized to exactly the page height.** One sub-pixel rounding error from "does not fit",
   and with `break-inside: avoid` on them the browser answers that by pushing a whole sheet to the
   next page — two pages becoming four, half blank. Each sheet is now shaved by `FIT_SAFETY`
   (0.995), well under a printed millimetre.

## Other changes

- `useOrderFormPrintFit` sizes and measures **each sheet independently**. Page 2 overflowing is no
  reason to shrink page 1's drawings, which is what a single shared scale would have done.
- `break-after: page` on each sheet, `auto` on `:last-child` — a trailing break on the final sheet is
  what produces a blank third page.
- The screen gap between sheets is zeroed in print, or it would push page 2 into a third page.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean. `npx vitest run` — 638 passed / 7 files.
- Screen: two sheets, 880x1160 each, zero overflow, no console errors.
- Print, per sheet: both pinned to 733.4 x 990.6px inside the 733.4 x 995.5px page box, both zero
  overflow, both at zoom 1, and both `data-print-unfold` containers fit without scrolling. Page 2 is
  the root's `:last-child`, so exactly one break falls between the pair. **Two pages, no blank
  third.**

## Worth a look

Page 2 still has roughly a third of its height empty below the tables. That is honest — a reference
sheet with air beats a cramped one, and it leaves room to pencil notes — but if the rail section
plots would rather sit beside their own marking data than stay on the drawings page, that space
would take them comfortably.
