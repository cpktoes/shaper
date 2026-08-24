---
id: 260823-mt5
slug: shaper-use-only-to-page-two
description: Move the Shaper Use Only box to page 2
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 4e05c0f feat(summary): move the shaper-use box to page 2
---

# Quick Task 260823-mt5 — Shaper Use Only moves to page 2

`SHAPER USE ONLY` — board name, blank & rocker, board #, price — now sits at the foot of page 2,
under the fin placement table, full width (688 x 94 at print size).

At the **foot** rather than the top on purpose: the tables above are what a shaper reads *while*
working the blank, and this is what gets filled in before and after. It also puts page 2's leftover
white space to use — the space that appeared once both tables went full width.

## The knock-on, and what it bought

Page 1's header was 17% of the sheet, sized to carry the logo block, four rider fields *and* this box.
Without it the band would have sat a third empty — the rider fields needed only 63px of 195px.

- Band **17% → 12%**, handing 5% of the sheet to the drawings row.
- Rider fields go `justify-between` instead of stacking at the top, so the spare height goes into the
  gaps between ruled lines. They get written on by hand, and an order form would rather spend height
  there than leave it blank at the bottom of the box.

**Measured A/B, toggling only the header percentage:**

| | 17% | 12% |
|---|---|---|
| Header band | 195px | **137px** |
| Rocker | 134px | 143px |
| Drawn board | 239 x 557 | **258 x 601** |

So the boards came out about 8% larger in each dimension.

## A measurement trap worth recording

My first read of this said the drawings had got *smaller* (264x557 → 216x501), which contradicted the
reasoning — the header gives height to the drawings row, so they should grow. The numbers were
artefacts: the probe mutated `aspect-ratio` and dispatched `beforeprint` before measuring, so it
caught the sheet mid-transition with a print width and a screen height. Two such probes are not
comparable to each other at all.

The fix was to stop measuring incidentally and measure deliberately: hold everything constant, vary
only the one property under test via an injected stylesheet, wait two animation frames, and read the
*drawn* board — deriving it from the viewBox and the `meet` fit rather than trusting the box, since a
letterboxed drawing is smaller than the element containing it. That is the table above, and it agrees
with the reasoning.

Second time this session a probe run against a settling layout produced a confident wrong answer.
Worth a standing habit: a measurement that contradicts a mechanism should be re-taken before it is
believed.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Print: both sheets zero overflow at the printable page box, both at zoom 1, zero clipped
  elements.** Still two pages.
- **AA re-run** (layout moved, so the audit was repeated rather than assumed): zero failures, minimum
  ratio 4.83:1, smallest printed text 7.9px.
- Browser: page 1 header tighter with the rider rules spread and the boards visibly larger; page 2
  carries the box at its foot above the page mark.

## Note

Board Name is the one live input in that box, so naming a board now happens on page 2 rather than in
page 1's header. That follows from the move as asked; if it turns out to be the wrong place to type,
the field could be mirrored into page 2's identification header, which already prints the name.
