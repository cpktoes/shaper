---
quick_id: 261114-ko2
title: BOTTOM's GUIDE adopts the shared GUIDE card
date: 2026-11-14
status: complete
commits: [adaf21bc]
---

# BOTTOM's GUIDE adopts the shared GUIDE card — summary

## What changed, in plain words

BOTTOM's GUIDE tab looks and reads exactly as it did, but it is now drawn by the same GUIDE every other page uses. Before
this, BOTTOM (built first, in Phase 17) carried its own copy of the card; TEMPLATE, ROCKER, RAILS, VOLUME and FINS (Phase
18) shared one. Two copies of one card drift apart over time; now there is one. What is BOTTOM's own stays its own: the
founder's words for the nineteen cuts, the cartoon of each cut drawn alone on the open board, and the `On this board` tag
that follows the board's bottom.

Two things a shaper might notice, both gains from the shared tab: a screen reader now names the folder `Guide to Bottom`
(as it names `Guide to Volume`), and the GUIDE is left off a printed page, as every other GUIDE is.

## How

- The shared card can take a drawing handed to it ready-made (`art`), and a card's worked-out figure may be absent; the
  shared tab takes `renderArt(card)` and the page's own marker on the scroller (`data-bottom-guide`), and its `page` now
  includes BOTTOM for the region's spoken name.
- `bottom-guide.tsx` builds the four groups from `BOTTOM_GUIDE_WORDS` — id and name the cut's own name, the tag `On this
  board` or none, no caption, the How to shape note in the shaper's system through `guideHow` — and each card's
  `BottomCartoon` in the same memo, keyed on the board, its bottom and the system, so a memoised card redraws only when
  the board does. Its private card is gone.

## Proof

- Unit: the guide and bottom test files (141 tests), `tsc`, lint — clean.
- Browser: see the figures below (the seven GUIDE specs and the two BOTTOM specs that look at the GUIDE, on a computer and
  both phones, on the webpack test server).
- Looked at on the suite's server in the Browser pane, a computer and a phone (`pictures/`).

## Browser run

The nine specs (the seven GUIDE specs, `phone-bottom`, `bottom-metric`) were started on all three devices — 165 tests on
the webpack test server's one worker — and stopped at the founder's word ("close the dev server, keep going") after 50 had
passed with none failing. Passed before the stop: every `bottom-guide.spec.ts` test on the computer (8), the iPhone (2)
and the Android (2); `bottom-metric`'s GUIDE test on the Android and the computer; `phone-bottom` on both phones (12);
and every other page's phone GUIDE tests on both phones (`guide`, `guide-fins`, `guide-rails`, `guide-rocker`,
`guide-template`, `guide-volume`: 26). Not reached: the other pages' computer GUIDE tests and the rest of `bottom-metric`
on the computer. The shared tab and card changed only by optional props, and the unit tests, `tsc` and lint cover them;
the computer runs of those specs are owed at the next push gate.

## Left as it was

Nothing. The to-do of 2026-11-09 is closed by this task.
