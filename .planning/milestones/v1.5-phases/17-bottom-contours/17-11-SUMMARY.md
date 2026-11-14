---
phase: 17-bottom-contours
plan: 11
subsystem: bottom-screen
status: checkpoint
tags: [bottom, guide, cartoons, words, phone]
requires:
  - 17-07 (the drawing maths: `guideCartoon` in `lib/geometry/bottom-draw.ts`)
  - 17-08 (the BOTTOM screen and its tabs)
  - 17-10 (VIEWER and DATA as they stand)
  - 17-GUIDE-WORDS.md (the founder's words for the nineteen cards)
provides:
  - BOTTOM's third tab, GUIDE — nineteen cards, each a cartoon of the open board and three short texts
  - the GUIDE's words as data (`BOTTOM_GUIDE_WORDS`), held to the founder's page by a test
affects:
  - components/bottom (a third tab on the BOTTOM page)
  - e2e/phone-chrome.spec.ts (BOTTOM now has three tabs in the slim phone strip)
tech-stack:
  added: []
  patterns:
    - words generated from the founder's markdown page and pinned to it line for line by a unit test
    - a thin, memoised SVG component that only paints what `lib/geometry/bottom-draw.ts` works out
    - the cartoons of a board are kept for as long as that board is open (one store per board)
key-files:
  created:
    - components/bottom/bottom-guide-words.ts
    - components/bottom/bottom-guide-words.test.ts
    - components/bottom/bottom-cartoon.tsx
    - components/bottom/bottom-guide.tsx
    - e2e/bottom-guide.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-11-guide.png
    - .planning/phases/17-bottom-contours/pictures/17-11-pictures-source.tar.gz
  modified:
    - components/bottom/bottom-editor.tsx
    - components/bottom/bottom-copy.ts
    - e2e/phone-chrome.spec.ts
decisions:
  - "GUIDE is words and pictures only: nothing on a card can be pressed, and nothing on it changes the board."
  - "A cartoon shows a cut at its starting numbers on the open board, so it changes with the board's outline, thickness and fins and never with what is cut on it."
  - "The channels' card carries On this board whenever the board has any channels cut (4, 6 or 8)."
  - "No corrections to the words were received before the build; every card ships as written and the founder may mark any card at the look or the UAT."
  - "A phone held sideways is tested at a real phone's size (844 x 390, and 863 x 360 on Android), never the test tool's swapped box."
metrics:
  duration: about 55 minutes of work on the clock (2026-11-09 20:52 to 21:50 UTC), most of it waiting on browser runs
  completed: 2026-11-09 (Tasks 1 and 2; Task 3 is the founder's look)
actuals:
  tokens: 16600
  tasks: 2
  commits: 3
---

# Phase 17 Plan 11: BOTTOM's GUIDE tab — Summary

BOTTOM now has a third tab, GUIDE: nineteen cards that each name one cut, draw it on the board you have open, say what
it is and what it does in two sentences, and tell you how to shape it.

## What changes for the founder

- **A GUIDE tab after VIEWER and DATA.** Open it and you read: *"What each cut is, what it does, and how it is shaped.
  Every cut is drawn on (your board's name) at its starting numbers — from above with its shade, and across where it is
  deepest, Height ×8 — the way VIEWER draws it."* An unnamed board reads "your board".
- **Nineteen cards in four groups** — Nose (6), Center (6), Tail (6), and Channels (cut last, inside TAIL).
- **Each card:** the cut's name; a cartoon of that one cut alone on your open board, from above with its shade and the
  pencil lines you would rule, then the section across the board where the cut is deepest at Height ×8, sitting on a
  dashed straightedge; two sentences (the first in bold); and a **How to shape** note under a dashed rule.
- **On this board.** The three cuts your board actually has — and the channels' card if any channels are cut — carry
  the tag ON THIS BOARD.
- **The cartoon is your board.** Open the Longboard or the Fish and every cartoon is redrawn on that outline; the
  Fish's swallow tail is in all nineteen.
- **The words are yours.** They are copied line for line from `17-GUIDE-WORDS.md` (57 lines: 19 cards × 3). A test
  fails if a card and that page ever disagree, so a correction has to be made in both and cannot drift.
- **Nothing on a card can be pressed** and nothing on it changes the board. GUIDE never prints.
- **How many across:** three from about 1200 dots of window, two from 956, one below that. On a phone the cards run one
  across and scroll under the pinned tabs.

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | The GUIDE tab: nineteen cards, the cartoons, the words and their tests | `f60fedd3` | `components/bottom/bottom-guide-words.ts`, `bottom-guide-words.test.ts`, `bottom-cartoon.tsx`, `bottom-guide.tsx`, `bottom-editor.tsx`, `bottom-copy.ts`, `e2e/bottom-guide.spec.ts`, `e2e/phone-chrome.spec.ts` |
| 2 | The founder's corrections to the words | none — nothing to change | No corrections received; every card ships as written; the founder may mark any card at the look. No change to `bottom-guide-words.ts` or `17-GUIDE-WORDS.md`, and no empty commit. |
| 3 | The founder's look (checkpoint) | pending | `pictures/17-11-guide.png`, `pictures/17-11-pictures-source.tar.gz`, this summary |

## Verification

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — one warning that was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| `npm test` (whole unit suite, once) | 188 files, 11,381 passed, 2 skipped — exit 0 (442 s) |
| `e2e/bottom-guide.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/bottom-screen.spec.ts` on the computer and both phones, port 3311 | 59 passed, 116 skipped, **2 failed — exit 1** (9.4 min). Both failures were a page taking more than 15 seconds to load while the machine was very busy, on screens this plan does not touch: ROCKER on an upright iPhone and FINS on a tall touch screen, both in `phone-chrome.spec.ts`. Every GUIDE test and every BOTTOM check passed in that run. |
| Those two tests alone, twice each (`--repeat-each=2`, iPhone) | 14 passed, 0 failed — exit 0 (2.0 min). So the two failures were load, not a fault. |
| `e2e/bottom-guide.spec.ts` on the iPhone alone | 2 passed, 7 skipped (the computer's tests) — exit 0 |

The three-spec run was not repeated as a whole after the two tests passed alone; its one recorded exit is 1, for the
reason above.

What the browser tests hold: nineteen cards in the four groups in the page's order; every card's three texts equal to
the founder's page; the ON THIS BOARD tag following the three selects and the channels' count; a cartoon that changes
when the board changes and does not when a slider on the panel moves; nothing on a card that can be pressed or reached
by Tab; no words cut off or outside their card at 1280, 1024 and on both phones upright and sideways; every How to
shape note reachable by scrolling; the page itself never scrolling sideways.

### Measured, for the founder

- **Card width:** 263 dots at a 1280 window (three across), 270 at 1024 (two across), 316 at 1440, 404 at 820, 364 on
  an upright iPhone, 466 on one held sideways. Never under 236.
- **Where the count changes:** three across from a 1200-dot window (two at 1199); two from 956 (one at 955). The plan's
  "three from about 1200" holds as measured.
- **Card height:** 402–473 dots at 1280, 387–477 at 1024. All nineteen at 1280 need about 3,300 dots, so GUIDE is read
  by scrolling inside the folder; the page itself never scrolls.
- **Upright phone (390 × 844):** one card across; the cards scroll in a 500-dot window under the pinned tabs
  (7,785 dots of cards in all); the page stays put.
- **Phone held sideways (844 × 390):** the computer's layout, as CLAUDE.md's Layout section says — the controls beside
  one card across. A card is about 391 dots tall and the folder shows 285, so **no card fits on screen whole there**;
  it is read by scrolling the folder, and every note can be reached. Said plainly so it is no surprise.
- **Working out the cartoons:** nineteen cartoons take 0.14–0.43 s to work out for a board (measured outside the
  browser; the slowest single card 76 ms). They are worked out once per board and kept, so going back to GUIDE, or
  moving a slider beside it, does not work them out again.

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** The plan names a different trailer; the orchestrator's ruling 5 sets
`Co-Authored-By: Claude <noreply@anthropic.com>`, and both commits end with that.

**2. Task 2 made no commit.** Ruling 2: no marked-up words came, so there was nothing to fold in. Recorded above
rather than as an empty commit.

### Small things added or adjusted while building

**3. [Rule 2 — correctness] The cartoons of a board are kept while that board is open.** The plan asks for each cartoon
to be remembered; a plain per-card memory is lost when the tab is closed and reopened, and nineteen cartoons cost up to
0.43 s. One store per board (it is dropped with the board) keeps flipping between tabs instant. File:
`components/bottom/bottom-cartoon.tsx`. Commit `f60fedd3`.

**4. The pencil lines' colour** follows the approved sketch (the template page's pencil line), not the darker ink the
plan's wording could be read as. File: `bottom-cartoon.tsx`.

**5. The intro paragraph is kept to a readable line length** on a wide window rather than running the folder's full
width. File: `bottom-guide.tsx`.

**6. The channels' card is tagged ON THIS BOARD from the channel count** (any of 4, 6 or 8), since channels are not one
of the three selects. File: `bottom-guide.tsx`.

**7. Extra unit tests** beyond the plan's list: that the cartoon and the guide hold no maths of their own, read nothing
about the window or the device, and that a card has no button or press handler. File: `bottom-guide-words.test.ts`.

**8. The sideways-phone test runs at a real phone's size** — 844 × 390 on the iPhone project and 863 × 360 on the
Android one — where the plan says "390 (iphone project)" only. The test tool's own swapped box (664 × 390) is a layout
no real phone shows. File: `e2e/bottom-guide.spec.ts`.

### Raised at the look, then changed on the founder's word

**9. Four How to shape notes say 6"** — Flat Entry, Deep Single Concave, Shallow Single Concave ("every 6"") and
Channels ("each 6" station"). They are the founder's words and the plan says verbatim, so the first build showed a
Metric shaper 6" too, against CLAUDE.md's Rule 2 (Metric means all-metric). It was shown on the picture (panel 4, the
sixth card) and asked as item 5 below.

**10. [The founder, 2026-11-09: "15 cm in Metric"] A Metric shaper now reads 15 cm in those four notes.** An Imperial
shaper reads 6" exactly as before. It is a rule-of-thumb spacing said in prose, not a number off the board, so it is
the round 15 cm (never 15.2 cm) and it is written as copy for each system — nothing is converted, and no inch or
millimetre figure is worked out anywhere outside `lib/geometry/units.ts`. The founder's page keeps its lines in inches
and now records the rule above the cards; the words module carries the two readings (`GUIDE_SPACING`, `guideHow`) and
the GUIDE asks the app which system the shaper picked. Tests hold both ways: each of the four notes reads 6" in
Imperial and 15 cm in Metric, the fifteen other notes read the same in both, no Metric card carries an inch figure,
and a browser test reads the Deep Single Concave card as a Metric shaper. The picture was taken before this change, so
its Metric card (panel 4, sixth) still shows 6"; no new picture was asked for. Files:
`components/bottom/bottom-guide-words.ts`, `bottom-guide-words.test.ts`, `bottom-guide.tsx`,
`e2e/bottom-guide.spec.ts`, `17-GUIDE-WORDS.md`.

## Known Stubs

None. Every card has its cartoon and all three texts; nothing is a placeholder.

## Threat Flags

None new. T-17-10 (the board's name in the intro): the name is a plain text node; no raw HTML is written anywhere under
`components/bottom/`, and a unit test holds that. T-17-11 (nineteen cartoons per redraw): each cartoon is remembered and
the set is kept per board; the grids are 17-07's fixed small ones.

## Founder's look: Approved (2026-11-09)

The founder, on the checkpoint card with the picture: *"Approved — merge it"* Columns: keep three across from 1200 dots and two below. One change at the look: the four notes that say 6" read 15 cm for a Metric shaper (commit 8548a54a). The committed picture predates that change. No word corrections yet; he may mark any card at the UAT. Merged as 82ec6c17.

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-11-guide.png` (5300 × 7099 dots; every panel is the
running page). Its makings are in `pictures/17-11-pictures-source.tar.gz`.

On it: (1) all nineteen cards on the Shortboard at 1280; (2) the window as it opens, 1280 × 800; (3) a 1024 window, two
across; (4) the five vees side by side, and Deep Single Concave as a Metric shaper sees it; (5) four cards with the
Longboard open; (6) four with the Fish; (7) an upright iPhone and one held sideways. The small black "N" in the windows'
corners is the test server's own badge and is not on the live site.

What to look for:

1. Nineteen cards in Nose · Center · Tail · Channels; the cuts on your board tagged `On this board`.
2. Each cartoon is your open board from above with that one cut's shade, and the section where it is deepest at ×8; the
   five vees look like five different things.
3. The words: anything still wrong, too long or not how the shop says it — mark it now or at the UAT (D-18).
4. Three across from about 1200 dots wide and two below that (the contract's reading of "three across on a computer") —
   yes, or three always?
5. (Raised by the build.) Four notes say 6". Leave them for a Metric shaper too, or should Metric read 15 cm?

Also worth a glance: held sideways, a phone shows one card at a time and never a whole one (see Measured).

**His answer on item 4:** not yet given.

Resume: "approved", or say what should change.

## Self-Check: PASSED

- FOUND: `components/bottom/bottom-guide-words.ts`, `bottom-guide-words.test.ts`, `bottom-cartoon.tsx`,
  `bottom-guide.tsx`, `e2e/bottom-guide.spec.ts`
- FOUND: `.planning/phases/17-bottom-contours/pictures/17-11-guide.png`,
  `.planning/phases/17-bottom-contours/pictures/17-11-pictures-source.tar.gz`
- FOUND: commit `f60fedd3`
- No loose script under `.planning/`; `STATE.md` and `ROADMAP.md` untouched.
