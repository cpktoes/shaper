---
phase: 18-a-guide-on-every-page
plan: 08
subsystem: guide
status: complete
tags: [guide, cross-page, fixtures, playwright, rule-2, timing]
requires:
  - "18-01..18-07: the five page builders, their words modules, the Metric sayings, the e2e helpers"
provides:
  - "components/guide/guide-words.ts — GUIDE_WORDS (84 cards), GUIDE_GROUPS, GUIDE_PAGE_WORDS, guidePageWords"
  - "lib/geometry/__fixtures__/guide-fixture-boards.ts — guideFixtureBoards(system): twelve boards, each page's input"
  - "lib/geometry/guide-pages.test.ts — the cross-page rules on every fixture board, both systems"
  - "e2e/guide.spec.ts — all five GUIDEs together on a computer and both phones"
affects: [18-09, 18-10]
tech-stack:
  added: []
  patterns:
    - "one fixture board set, each page's input made by that page's own fixture helper (memo calls in the store's order)"
    - "a browser overlap sweep reading every svg text's box against its window's frame rect, each card scrolled into view first"
key-files:
  created:
    - components/guide/guide-words.ts
    - components/guide/guide-words.test.ts
    - lib/geometry/__fixtures__/guide-fixture-boards.ts
    - lib/geometry/guide-pages.test.ts
    - e2e/guide.spec.ts
  modified:
    - lib/geometry/guide-rocker.ts
    - lib/geometry/__fixtures__/guide-volume-input.ts
    - lib/geometry/__fixtures__/guide-rails-input.ts
    - e2e/phone-chrome.spec.ts
    - e2e/guide-rails.spec.ts
    - components/guide/guide-copy.ts
    - components/guide/guide-card.tsx
    - components/guide/words/volume.test.ts
    - components/guide/words/metric-sayings.test.ts
decisions:
  - "Lazy drawing (D-28) NOT built, although every median passes 150 ms: on this dev-mode measurement the GUIDE with no drawings painted at all still takes 194-326 ms on four pages, so draw-when-near cannot reach the line, and it would break or quietly weaken drawing checks in five page specs. Flagged for the orchestrator / founder."
  - "The 'inside the viewBox' rule is read as what the painter shows: a window's paths and lines are clipped to its frame (a detail is the board drawn closer, so its outline runs past the frame unseen); every label, dimension, dot, frame and strip prim must be inside the drawing"
  - "ROCKER's Placement windows move out to show the blank's own end when a board is well short of its blank"
metrics:
  duration: "about 1 h 50 min"
  completed: 2026-11-10
  tasks: 3
  commits: 3
  files: 14
actuals:
  tokens: 26000
  tasks: 3
  commits: 3
---

# Phase 18 Plan 08: All five GUIDEs proven together — Summary

All 84 GUIDE cards are now checked against the same rules on twelve kinds of board in both systems, and all five GUIDEs
are checked together in the browser on a computer and both phones. One drawing defect was found and fixed (ROCKER's
Placement card on a board well short of its blank). The timed run says the GUIDE's first paint is well over 150 ms
under a four-times-slowed processor on the dev server, and that drawing the cards lazily would not fix it: that
decision is left open for the orchestrator.

## The fixture boards and what each proved

`guideFixtureBoards(system)`: each board is its fields with one field replaced from a preset, each page's input then
made by that page's own fixture helper.

| Board | Why it is there |
|---|---|
| Shortboard, Fish, Midlength, Longboard (as their cards open them) | the four presets; the Fish is the swallow-tailed preset |
| Shortboard on a diamond, pin, round and swallow tail (`TAIL_PRESETS`) | every tail shape; Depth on a tail without one; Tail Block on pin/round |
| Shortboard ordering a custom rocker (the Customize Rocker card's own push, `+1/2"N18"`) | a blank with a maker's change: the rocker code is the one Metric exemption |
| Longboard a centimetre under `MIN_MCKEE_LONGBOARD_QUAD_LENGTH`, as a McKee Longboard quad | McKee Longboard's `Needs 8'0"` fallback on the board's own setup — and the Placement defect below (about 8" of blank past each tip) |
| Shortboard with the two wings "+ Add a wing" adds (`nextWing` twice, per system) | the winged board; + Add a wing with no room for another |
| The unsaved stock board (the store's defaults, no blank) | a hand-set board: ROCKER's blank cards with nothing to push |

On every board, both systems, all five pages (`lib/geometry/guide-pages.test.ts`, 43 tests): the card ids are the
words page's, in order (22 / 14 / 17 / 8 / 23 on every board); no build throws; a deep-frozen input builds and is left
exactly as it was; two builds are equal and `memoGuide` hands back the very same cards; a card says `dashed` exactly
when it draws a push, and none / drawn as draw none (D-26); every number is finite and what the painter shows lies
inside the 300-wide drawing; no label meets another or a window's name, or leaves its window, at fits 0.7, 0.79 and
1.26; every push changes only its own control's declared fields; and in Metric no name, tag, caption or drawing label
carries an inch figure (`guideImperialFigures`) apart from the blank's own name and the rocker codes.

`components/guide/guide-words.test.ts` (9 tests): `GUIDE_WORDS` is 84 cards, the five pages in the app's order, equal
card for card to the words page, groups never interleaved, ids unique, every is/does/how non-empty, fourteen Model info
notes all on FINS; Imperial lines are the page's exactly; no Metric line of the 84 cards, no Metric intro (the blank's
name aside) and no group heading carries an inch figure.

## Builder defects the sweep found

**1. ROCKER, Placement, on a board well short of its blank** (the Longboard cut under 8'0" in its own 9'4"B blank).
About 7 15/16" of foam runs past each tip, but a Placement window shows only 5 1/2" past its tip. The spare-foam
dimension ran off the window (and off the drawing: x = -13.1 and 313.1) and its figure sat over the window's name.
**Fix** (`lib/geometry/guide-rocker.ts`): each Placement window now moves out just far enough for the blank's own end,
and an inch of foam beyond it, to be inside. Every preset draws exactly as before (only boards with more spare than
the window shows move). ROCKER's own 19 tests stay green. Commit ff24bdb6.

No other defect: no dashed card with nothing dashed, no overlap, no stray push field, no Metric inch figure.

## The Metric wiring (ruling 7)

Every page applies its Metric sayings. No GUIDE shows an inch or foot figure to a Metric shaper anywhere: names, tags,
captions, drawing labels, intros, group headings and all four sentence kinds (unit test over the 84 cards and five
intros; browser test over every page's whole GUIDE, both as seen and part by part). 18-06's FINS intro and Model-info
phrases and 18-07's two card names carrying 12" are all clean now (the builders give the names through `model.name`,
and 18-07's sayings cover the prose). **No wiring fix was needed and no new saying was written.**
`e2e/guide-rails.spec.ts`' "until plan 18-07 lands" exception is removed: its Metric check now covers the whole GUIDE.

The "MODEL INFO" wording in `guide-copy.ts` (two doc comments), `guide-card.tsx` (one doc comment),
`words/volume.test.ts` (a test title and a comment) and `words/metric-sayings.test.ts` (one comment) now says the
Model info notes live on FINS' GUIDE cards. Comments and a title only.

## Browser results (webpack dev server on 3118, `IS_WEBPACK_TEST=1 PW_PORT=3118`)

| Run | EXIT | Result |
|---|---|---|
| `guide.spec.ts` + the five page GUIDE specs, all three projects | 0 | **51 passed, 63 skipped** by project (6.4 min) |
| `phone-chrome.spec.ts`, all three projects | 0 | **44 passed, 88 skipped** |
| `board-name-band.spec.ts`, all three projects | 0 | **17 passed, 16 skipped** |

That is the plan's whole Task 2 verify command, in three groups. `e2e/guide.spec.ts` alone: desktop 6 passed, iphone and
android 3 each.

**What `e2e/guide.spec.ts` proves.** Computer: every strip ends in GUIDE and FINS has no MODEL INFO; each page's groups
and cards in `GUIDE_WORDS` order, a drawing, sentences and How to shape on every card, fourteen Model info notes on
FINS; 3 / 2 / 1 across at 1280 / 1024 / 820, no card under 236 or wider than its list, no text clipped, nothing scrolling
sideways; the desktop shell at 820 and the stacked layout at 819; no drawing label overlapping another or leaving its
window on any card at 1024; nothing pressable, and clicking a page's first card changes no sidebar value; one Width
key press changes Width's tag and its dashed push; opening the Fish redraws Squash's and Swallow's tags as the builder
says; Metric clean everywhere. Phones, VOLUME first: one across, `scrollHeight === innerHeight`, pinned column at most
66dvh + 1, card at least 66dvh − 41, no sideways scroll, the overlap sweep at 390; held sideways the desktop shell on
every page.

**The strips (edge #1, D-21), measured.** Room after the last tab, Android and iPhone identical:

| Page | 360 | 375 | 390 | 412 | 430 | 820 (computer) |
|---|---|---|---|---|---|---|
| VOLUME | 192.7 | 207.7 | 222.7 | 244.7 | 262.7 | 252.7 |
| TEMPLATE | 98.7 | 113.7 | 128.7 | 150.7 | 168.7 | 138.7 |
| ROCKER (VIEWER · TOP · PLANING · DATA · GUIDE) | 1.8 | 16.8 | 31.8 | 53.8 | 71.8 | **27.6** |
| RAILS | 9.6 | 24.6 | 39.6 | 61.6 | 79.6 | 29.6 |
| FINS | 146.7 | 161.7 | 176.7 | 198.7 | 216.7 | 186.7 |

The name is drawn exactly where the room is 50 or more (boxes 47.8 to 71.5) and nowhere else; every tab word is whole on
one line on one top; nothing scrolls sideways. These equal 18-04's and 18-05's figures. **For the founder's look:**
ROCKER, like RAILS, drops the board's name in an 820-dot computer window (27.6 dots of room).

**phone-chrome.spec.ts.** `ALL_FIVE_SCREENS` now lists GUIDE last on all five pages (TEMPLATE `VIEWER, ADD WINGS, GUIDE`;
ROCKER `VIEWER, DATASHEET, GUIDE`, since every size it is used at is the desktop shell, where ROCKER keeps its full
words; RAILS `VIEWER, DATA, INSTRUCTIONS, GUIDE`). Every TEMPLATE, ROCKER and RAILS phone row (upright and sideways, on
each phone) now also checks GUIDE's 44-dot touch box. No row turned red, so none needed restating. No band height,
gutter or touch-box minimum changed: the diff only adds lines.

## The timed run (D-28)

Click on GUIDE to the first animation frame after the last card is in the page. Chromium, CPU throttled 4× over CDP,
five cold runs per page (a fresh load each run, so the cards are worked out from scratch), on the webpack **dev** server
(React's development build), machine load about 10.

| Page | 1280 × 800 median (runs) | 390 × 844 median (runs) |
|---|---|---|
| VOLUME | **374.5** (465.9, 281.7, 414.7, 374.5, 364.3) | **416.2** (433.4, 337.3, 398.1, 416.2, 671.8) |
| TEMPLATE | **655.5** (606.4, 655.5, 660.5, 654.6, 851.6) | **825.0** (775.1, 741.7, 825.0, 960.3, 906.7) |
| ROCKER | **561.0** (624.4, 236.0, 792.1, 552.0, 561.0) | **718.7** (937.6, 1009.4, 680.3, 625.4, 718.7) |
| RAILS | **382.3** (374.0, 862.2, 787.2, 382.3, 358.0) | **475.1** (1074.7, 428.5, 475.1, 465.8, 644.2) |
| FINS | **999.2** (1097.3, 958.1, 999.2, 1063.8, 728.0) | **1109.0** (1343.0, 1283.8, 1109.0, 979.2, 1002.9) |

All ten medians pass 150 ms. Before building anything I timed the same run with **no drawing painted on any card** (a
temporary local edit, reverted, never committed): medians 94.1 / 288.2 / 325.7 / 276.6 / 194.1 at 1280 and 106.2 / 304.1 /
283.8 / 259.8 / 221.5 at 390 (VOLUME / TEMPLATE / ROCKER / RAILS / FINS). So painting the drawings is about half to two
thirds of the time, but working out the cards and laying out the words alone already pass 150 ms on four pages.

**Decision: lazy drawing not built.** A draw-when-near wrapper round `<GuideCartoon>` could at best bring the pages
toward that no-drawing floor, still over the line. It would also leave the far cards' drawings empty until scrolled to,
which breaks or quietly weakens drawing checks in five page specs (TEMPLATE's Depth note and push, ROCKER's Nose Rocker
push, FINS' stringer check, the RAILS and TEMPLATE Metric label checks), against the plan's "no spec change beyond
`e2e/guide.spec.ts`". `guide-card.tsx` and `guide-cartoon.tsx` are unchanged by Task 3 (their only change in this plan
is ruling 7's comment, in Task 1). The dev build is much slower than what shapers get, so **the right next measurement is
the same run on a production build** (`npm run test:e2e:prod`-style, which this plan was not allowed to run). If that
also passes 150 ms, the cost to attack is the builders' and the words' layout, not the SVG alone. This is for the
orchestrator and the founder.

## Deviations from Plan

**1. [Rule 1 - Bug] ROCKER's Placement windows on a board short of its blank** — see *Builder defects*. Commit ff24bdb6.

**2. The "inside the viewBox" rule reads what the painter shows.** TEMPLATE's detail windows draw the board closer, so
the outline's path runs past the window's frame and is clipped there (Nose Angle on the Shortboard reached x = 495.5).
The cross-page test holds every strip prim, every window's frame and every label, dimension, dot and rect inside the
drawing, and every path and line finite; a window's paths and lines are held to the clip the painter applies. The four
other pages' own tests still hold their paths inside the viewBox.

**3. VOLUME's pushes are the quick estimate's.** A VOLUME variant is the board's settings read as the quick calculator
reads them (both imports off) with one slider moved, exactly as `guide-volume.test.ts` reads it; the cross-page "changes
only its own field" check compares against that.

**4. FINS' setup and model cards are "drawn as", not pushes.** The "own fields only" check covers FINS' four Advanced
push cards (`FINS_GUIDE_PUSH_FIELDS`); the setup cards draw the board with a setup picked, by design.

**5. Two fixture helpers widened, not duplicated.** `guide-volume-input.ts` gains `volumeGuideInputFromFields` (its
`guideVolumeInput` now calls it, unchanged in result), and `railsGuideInputFromFields` takes a board with no blank (the
stock board). Neither file was in the plan's list.

**6. Lazy drawing not built although the timing passed 150 ms** — see *The timed run*. An open decision, not a silent one.

**7. TDD order.** Task 1 is `tdd="true"`; the aggregate module and its test went in one commit with the cross-page test
(the module only lays existing words side by side, so the test could not fail first). The cross-page test did fail
first (five failures), which found the Placement defect and three over-strict readings of the test itself (deviations
2, 3 and the freeze check comparing functions by identity, now compared by content).

**8. Overlap at 390 on both phones.** The upright layout checks run at each phone's own size (390 × 844, 412 × 915); the
drawing-label sweep then resizes to 390 × 844 on both, as the plan asks.

## Words the app's maths disagrees with

None found by this plan. The figures 18-01 and 18-05 flagged (VOLUME's "about three litres", RAILS' Ends At 30 1/2" versus
30 5/16") stand as they recorded them.

## For the orchestrator, 18-09 (the pictures) and the founder's look

- The lazy-drawing decision above needs an owner; a production-build timing is the missing fact.
- ROCKER and RAILS both drop the board's name at an 820-dot window (27.6 and 29.6 dots of room).
- `e2e/guide.spec.ts` takes about 3.5 min on the three projects against a warm webpack server; its tests carry 600-900 s
  limits because each walks all five pages.
- `e2e/desktop-baseline.spec.ts` was not run: nothing this plan changed is in any picture (the Placement fix touches only
  boards well short of their blank, never a preset).

## Unit, type and lint checks

- `npx vitest run` (whole suite): **198 files, 9909 passed, 2 skipped, EXIT 0.**
- `npx vitest run components/guide lib/geometry/guide- lib/units-isolation.test.ts`: 19 files, 264 passed.
- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, the 1 warning already there (`lib/db/import-designs-action.test.ts`
  `_calls`).

## Task Commits

1. **Task 1: all 84 cards checked together on every kind of board** — `ff24bdb6` (test; carries the ROCKER fix and the
   ruling-7 wording)
2. **Task 2: all five GUIDEs checked together in the browser** — `a0162dbc` (test)
3. **Task 3: the timed run** — no code change; recorded here

## Known Stubs

None.

## Threat Flags

None. T-18-02: bounded fixed counts and memo identity proven on every fixture board; first paint measured (above).
T-18-03: the deep-freeze test proves no builder writes its input; the browser click test proves no card changes a sidebar
value.

## Self-Check: PASSED

- FOUND: components/guide/guide-words.ts, components/guide/guide-words.test.ts,
  lib/geometry/__fixtures__/guide-fixture-boards.ts, lib/geometry/guide-pages.test.ts, e2e/guide.spec.ts
- FOUND commits: ff24bdb6, a0162dbc
