---
phase: 18
reviewed: 18-REVIEW.md
date: 2026-11-10
fixed: 6
left_for_the_founder: 2
follow_ups: 5
---

# Phase 18 — what was done about the code review

The review found nothing critical or high. Two medium, six low, five notes. Fixed by hand on `page-guides`, each
with a test where a test can hold it.

## Fixed

| Finding | What a shaper would have seen | The fix | Held by |
|---------|-------------------------------|---------|---------|
| MD-01 | On a board 5'0" to 5'11" long, RAILS' *Tail Rail Blends From · Ends At* card on a narrow phone lost the first digit of the Ends At figure (`9 1/2"` for `29 1/2"`) | The figure is held inside the tail's window at the narrowest card's text size (`guide-rails.ts`, `blendsFigure`). A sweep of 7,320 short boards went from 277 clipped to none | `guide-rails.test.ts`, "a short board" |
| LW-02 | A board named with `$&` or `$$` in it had its name mangled in the GUIDE's intro line; a board named `{blank}` was swapped for the blank's name | Both names go in in one pass, exactly as typed (`guide-copy.ts`, `guideIntro`) | `guide-copy.test.ts` |
| LW-03 | On a board of 100 litres and over, VOLUME's *Board Type* card ran its seven litres figures into each other | A step's figure drops its decimal once it would be five characters; the picked type keeps its decimal (`guide-volume.ts`) | `guide-volume.test.ts`, "a very big board" |
| IN-02 | Nothing: a card filed under a group its page does not have would have been dropped without a word | `guideView` now refuses it outright (`guide-view.ts`) | the existing words-page tests |
| LW-01 | Nothing: a comment claimed more than the cache does | The comment says what is true: the cache saves an Imperial/Metric switch while GUIDE is open (`guide-memo.ts`) | — |
| IN-05 | Nothing: a stale comment | Names VOLUME's GUIDE as the caller (`design-screen-shell.tsx`) | — |

None of these changes how a preset board's card draws, so the phase's pictures stand.

## Left for the founder's word

- **MD-02 — the Customize Rocker card shows the maker's inch order code in Metric** (`+1/2"N18"`). The design contract
  says so on purpose, as the BLANK button and the DATASHEET do, but CLAUDE.md Rule 2's list of where that code shows
  does not name the GUIDE. Either the list gains the GUIDE, or the card prints the bend as a millimetre mark.
- **LW-05 — a card's caption line is not read to a screen reader.** The design contract hides the whole figure
  (drawing and caption); the card's name, tag and words are read. His call whether the caption should be read too.

## Follow-ups, not this phase

- LW-04 — a push is not held inside its slider's range on every card (VOLUME, ROCKER, RAILS, FINS), so a board already
  at a slider's end can be drawn a little past it.
- LW-06 — TEMPLATE's GUIDE copies three slider limits as numbers instead of reading the sidebar's own.
- IN-01 — a few copy constants nothing reads. IN-03 — the words-page reader takes the first match. IN-04 — one
  0.66 where the shared 0.7 is meant.
