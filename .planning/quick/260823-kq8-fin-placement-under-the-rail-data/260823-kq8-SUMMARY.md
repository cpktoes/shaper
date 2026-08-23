---
id: 260823-kq8
slug: fin-placement-under-the-rail-data
description: Stack fin placement under the rail data on page 2
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - c88bbba feat(summary): stack fin placement under the rail data on page 2
---

# Quick Task 260823-kq8 — fin placement under the rail data

Page 2's two tables are stacked now instead of side by side. Both `FormBox`es sit in a flex column
inside the existing row, so the `SHAPING DATA` spine label still runs down the whole page beside
them.

| Panel | Before | After |
|---|---|---|
| Rail Bands | 461 x 1088 | **688 x 562** (full width) |
| Fin Placement | 369 x 1088 | **688 x 352** (full width) |

The reading order this produces also matches the order a blank gets worked: bands marked first, fins
set last.

## One thing the move broke, and the fix

Going full width stretched every row of the fin table — label at the far left, measurement at the far
right, most of a page apart. That is the shape that makes a reader's eye slip a line, and a shaper
reading the wrong fin number off this sheet drills the wrong hole. It was a genuine legibility
regression, not a cosmetic one, so it needed fixing rather than noting.

The fin sections now run in **columns** within their panel, keeping each label within reading distance
of its own number. `columns` rather than a fixed grid because the section count is not fixed: a single
fin produces one section, a thruster two, a quad with its centre fin three. `break-inside: avoid`
keeps a section whole rather than splitting its rows across the fold.

The rail table needed none of this — its three section columns already occupy the middle of the row,
so its labels and values were never far apart.

**The panel's footnote moved outside the columned container.** Flowed as one more column item it
landed under whichever section happened to end last, reading as a footnote to that section; it
qualifies every number in the panel, so it spans beneath them all.

Rail Bands went from `flex-[1.15]` to `flex-[1.6]`, since the columned fin panel needs about half the
height it did stacked straight down.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Print: both sheets zero overflow at the printable page box, both at zoom 1, zero clipped
  elements.** Still two pages.
- Browser: page 2 renders with `CENTER FIN` and `FRONT FINS` side by side, rows tight, footnote
  spanning beneath.

## Note

Both panels leave white space at the foot of the page. That is inherent now — at full width neither
table needs the height page 2 has to give — and it reads as a reference sheet with margin, which is
the better end of the trade against the cramped type that put these tables on their own page in the
first place.
