---
phase: 18-a-guide-on-every-page
plan: 07
subsystem: guide
status: complete
tags: [guide, metric, words-page, rule-2, r11]
requires: [18-01, 18-02]
provides:
  - "18-GUIDE-WORDS.md — `## Metric sayings`, 48 pairs over the five pages"
  - "components/guide/words/metric-sayings.ts — GUIDE_METRIC_SAYINGS (all five pages), GUIDE_IMPERIAL_FIGURE, GUIDE_METRIC_EXEMPT, guideImperialFigures"
  - "components/guide/words/metric-sayings.test.ts — pairs equal the page, app numbers equal the formatters, no inch in any Metric line"
affects: [18-03, 18-04, 18-05, 18-06, 18-08]
tech-stack:
  added: []
  patterns:
    - "a Metric saying that quotes a number of the app is held to that number's constant and Metric formatter in a table naming both"
    - "an unexported component slider limit is read from the component's own source by the test, so a changed limit fails it"
    - "a fin model's range is read off the MODEL INFO note fins.ts itself writes (computeFinPlacement(...).notes)"
key-files:
  created:
    - components/guide/words/metric-sayings.test.ts
  modified:
    - .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md
    - components/guide/words/metric-sayings.ts
decisions:
  - "The no-inch rule also catches the bare 12-inch station said as `the tail 12` / `the nose 12` (ROCKER's Nose @ 12\" card), and leaves RAILS' mark names (`Deck Mark 1 in from the rail`) alone — both found on the page, neither named in the plan"
  - "The FINS intro's `the last 24\"` reads `the last 60 cm`, the GUIDE's own Metric tail window (guideFrame), not a conversion"
  - "The wing run's two inches reads `51 mm`, the run slider's own Metric end hint (formatMark of WING_RUN_RANGE_IN.max)"
  - "The custom rocker's 18 inches in reads `45.7 cm in`: where a bend starts is a dim (CLAUDE.md Rule 2), while the maker's order code N18 stays in inches"
  - "A saying's field type gains `intro`, so the FINS intro pair is stored like the page lists it"
metrics:
  duration: "about 45 min"
  completed: 2026-11-09
  tasks: 2
  commits: 3
  files: 3
actuals:
  tokens: 9200
  tasks: 2
  commits: 3
---

# Phase 18 Plan 07: The Metric sayings for all five GUIDE pages — Summary

A shaper who picked Metric now reads no inch or foot in any GUIDE card's words, on any page. The founder's words
page has a new **Metric sayings** section listing, card by card, each phrase that carries an inch or a foot and
the phrase a Metric shaper reads in its place. The code holds the same pairs, and a test keeps the two identical
and proves every Metric line on all 84 cards and the five intros comes out clean. The words an Imperial shaper
reads are unchanged.

## What was built

- **The words page** (`18-GUIDE-WORDS.md`): `## Metric sayings` between `## FINS` and the pushes, with a short note
  (first drafts for the founder's pen; the two kinds) and `### TEMPLATE` … `### FINS` lists. Nothing above the
  section changed.
- **The code** (`components/guide/words/metric-sayings.ts`): `GUIDE_METRIC_SAYINGS` for all five pages, in the
  page's order; `GUIDE_IMPERIAL_FIGURE`, the one no-inch rule; `GUIDE_METRIC_EXEMPT` (`blank name`, `rocker order
  code`); and `guideImperialFigures(text, exempt)`, which returns every inch figure in a line once this board's
  blank name and rocker order code are taken out (for 18-08's tag and caption sweep).
- **The test** (`metric-sayings.test.ts`, 18 tests): module pairs equal page pairs one for one; each Imperial phrase
  appears exactly once in its line and the pairs of a line never overlap; a Metric line never grows by more than a
  short figure (E7 long-text); the no-inch rule matches and leaves alone the cases listed in the plan and more; all
  84 cards and five intros read clean in Metric through the app's own `guideLines` / `guideIntro`; an Imperial line
  is untouched; a card with no figure has no entry; and a table names, for every number of the app, its constant
  and formatter and checks the Metric phrase is exactly what they give.

## Sayings by page (48)

| Page | Count | App numbers | Rules of thumb |
|------|------:|------------:|---------------:|
| TEMPLATE | 4 | 2 | 2 |
| ROCKER | 19 | 14 | 5 |
| RAILS | 3 | 3 | 0 |
| VOLUME | 3 | 1 | 2 |
| FINS | 19 | 19 | 0 |

**App numbers and the constants they come from:**
- The 12" station, `30.5 cm` (`MEASURE_STATION_MM` through `stationLabel`): TEMPLATE Board Length; ROCKER Nose and
  Tail Rocker, both Thinning Starts (the automatic start is the station), Nose @ 12" · Tail @ 12" (four), Fine tune
  from (two); RAILS Import Rocker & Foil Values (two), Board Thickness; VOLUME Length-Weighted Effective Thickness;
  FINS Import Designed Board.
- The wing run's two inches, `51 mm` (`WING_RUN_RANGE_IN.max`, `formatMark`, the slider's own end hint).
- The bend 18 inches in, `45.7 cm in` (`GUIDE_PUSH_TABLE` bendFrom, `formatDim`).
- The fine-tune's quarter inch, `6 mm` (`FINE_TUNE_RANGE_IN` in `rocker-controls.tsx`, `measureSlider`'s Metric top).
- The Aft/Forward inch and a half, `38 mm` (`POS_BOUNDS` in `fin-controls.tsx`, `measureSlider`'s Metric top).
- FINS intro's last 24", `60 cm` (`guideFrame("metric").finsTailWindow`).
- The nearest 1/16", `the nearest millimetre` (`finRoundingGrain`).
- Single fin `114 mm to 152 mm`, Modern twin `178 mm to 203 mm`, Keel `152 mm to 165 mm`, 2+1 side bites `381 mm to
  419 mm` (each read off its own MODEL INFO note from `computeFinPlacement`), Upright+Trailer mains `~254 mm` and
  trailer `102 mm` (its placed marks), the 5 1/2" base threshold `140 mm` (`TWIN_FORWARD_BASE_IN.upright`), the Basic
  toe `6 mm` (its placed front toe), Basic - Off-Rail's quarter inch `6 mm` / `+6 mm` (rear off-tail less half the
  front's), the 9' anchor `274.3 cm` and the McKee Longboard's 8'0" `243.8 cm`
  (`MIN_MCKEE_LONGBOARD_QUAD_LENGTH`, `formatLength`).

**Rules of thumb (round figures):** the last foot → `the last 30 cm` (Nose Angle, Tail Angle); every few inches →
`every 10 cm or so`; by an eighth → `by 3 mm`; to the inch → `to the millimetre`; within a foot of the nose →
`within 30 cm of the nose`; a couple of feet → `a good 60 cm`; VOLUME's two (an inch of length; half a centimetre is
about three litres — already worked out from `computeVolume` in `guide-copy.test.ts`).

**VOLUME's three pairs are carried exactly as 18-01 put them in code.** None corrected.

## For the founder's pen — the sayings most worth a look

1. **`a good 60 cm`** for *feathered out over a couple of feet* (ROCKER, Nose @ 12" · Tail @ 12"): the loosest one.
2. **`the tail 30.5 cm` / `the nose 30.5 cm`** for *the tail 12* / *the nose 12* (same card): shaper's shorthand
   said with the station's own label; "the tail 30.5 cm station" read better but made the line too long.
3. **`45.7 cm in`** for *18 inches in* (Customize Rocker): exact, because the bend's start is a dim, while the
   caption beside it keeps the maker's `N18`.
4. **`51 mm`** for *two inches* (Vertical run): what the slider's end hint reads (see the concern below).
5. **`the last 30 cm`** for *the last foot* (Nose Angle, Tail Angle) and **`within 30 cm of the nose`** (Nose
   Thinning Starts), where the station itself would be 30.5 cm.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's no-inch rule would have flagged RAILS' mark names**
- **Found during:** Task 2
- **Issue:** "digits followed by `in` as a word" matches *Pencil Deck Mark 1 in from the rail*, *Deck Mark 3 in*,
  *Bottom Tuck 1 in* — the `in` is a preposition after a mark's name, not an inch.
- **Fix:** `GUIDE_IMPERIAL_FIGURE` skips a number right after `Mark ` or `Tuck `; the test holds both lines clean.
- **Files modified:** components/guide/words/metric-sayings.ts · **Commit:** 12d2adf0

**2. [Rule 2 - Missing] The bare 12" station without an inch mark**
- **Found during:** Task 1
- **Issue:** ROCKER's Nose @ 12" · Tail @ 12" says *the tail 12* and *the nose 12* — inches, but no mark, so the
  plan's rule would have let them through to a Metric shaper.
- **Fix:** two sayings for them, and the rule also finds `nose 12` / `tail 12`.
- **Commit:** 7f2af99f, 12d2adf0

**3. [Rule 1] Two sayings shortened to keep the line's length (E7)**
- The first draft `the tail 30.5 cm station` / `the nose 30.5 cm station` grew that line by 26 characters; now
  `the tail 30.5 cm` / `the nose 30.5 cm` on the words page and in the code (the change rides in 12d2adf0).

**4. The length-class test is one-sided in tolerance.** A Metric line may grow by at most twelve characters (or a
tenth of a long line) and shrink by at most twenty: *an inch and a half* → *38 mm* shortens Aft/Forward's line by
13, and a shorter line can only fit more easily.

**5. Unexported limits read from source.** `FINE_TUNE_RANGE_IN` (rocker-controls.tsx) and `POS_BOUNDS`
(fin-controls.tsx) are not exported; the test reads them from the files' own text, rather than this plan editing
two component files a page plan works beside.

**TDD gate:** the plan's Task 2 is `tdd="true"`; the orchestrator asked for one commit per task, so RED and GREEN
share commit 12d2adf0. RED was run: against the base module the new test failed 8 of 18; removing one pair (Blank's
`by an eighth`) from the finished module failed 4. Both reverted.

## Shared files touched

- `components/guide/words/metric-sayings.ts` (this plan's own file this wave): the `field` type gains `| "intro"`
  (one existing line changed), the TEMPLATE, ROCKER and RAILS entries go before `// VOLUME` and FINS after it,
  VOLUME's lines untouched; three exports added at the end. `guide-copy.ts` needs no change: `guideLines` only reads
  is/does/info/how, `guideIntro` ignores the field.
- No other shared file touched.

## Figures in the words the app's maths disagrees with

None. Every Imperial figure a saying replaces matches its constant (the test checks each: 4.5–6", 7–8", 6–6.5",
15–16.5", the 9' anchor, 10" and 4" trailer, 1/4" Basic toe, Off-Rail's +1/4", 8'0", 5 1/2", the 2" run, ±1/4", ±1 1/2",
the 18" bend).

## Open concerns (for 18-04, 18-05, 18-06, 18-08)

- **Wing run, Metric:** the slider's end hint reads `51 mm` (formatMark of 2"), but `metricSliderRange` rounds the
  slider's own top inward to **50 mm**. The saying follows the hint; the app's two figures differ by a millimetre.
  Not this plan's to change.
- **Two card names carry 12"**: `Nose @ 12" · Tail @ 12"` (ROCKER) and `Board Thickness · Thickness @12"` (RAILS).
  Names are outside this plan; the page builders (18-04, 18-05) should give them Metric names through `model.name`
  as the app's own labels read, and 18-08's sweep should cover names.
- **Tags and captions with inches** (e.g. Fine tune from's `dashed · -1/4" at the tail 12"`) are the page plans';
  `guideImperialFigures(text, [blankName, rockerNote])` is ready for 18-08's sweep.
- **The ROCKER intro on the words page names the blank** (`US Blanks 6'3"RP`); the module's intro uses `{blank}`,
  and the test replaces the Blank card's tag before checking.

## Known Stubs

None.
