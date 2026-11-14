---
phase: quick-261113-m5w
plan: 01
subsystem: board-file-preview
tags: [brd, wings, corner-radius, outline-fit, open-as-board]
requires:
  - quick-261113-hyy (wings found and fitted)
provides:
  - "A wing read from a .brd opens with the corner radius the file clearly has, and its position and run come back closer to the truth"
  - "The Wing line on the preview and the printed overview says the corners on both sides, and never breaks inside a figure on a phone"
affects:
  - the rails task (261113-kvo): it builds in the same neighbours (brd-fit-preview.ts, the dialog, the overview PDF); b22-b27 were left free for it
key-files:
  created: []
  modified:
    - lib/geometry/brd-wings.ts
    - lib/geometry/brd-wings.test.ts
    - lib/geometry/brd-fit.ts
    - lib/geometry/brd-fit.test.ts
    - lib/geometry/__snapshots__/brd-fit.test.ts.snap
    - lib/models/brd-board.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - components/setup/brd-fit-dialog.tsx
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "The planner's measured method (rule D, footprint search, refit after rounding) ported exactly; parity with the scratch proved on 108 cases written and 108 drawn exactly, all byte-identical"
  - "A fitted radius is kept as found (round only for display), never more than fits; no fin lock; outlineForFins untouched"
status: complete
actuals:
  tokens: 17900
  tasks: 3
  commits: 3
---

# Quick 261113-m5w: a wing read from a .brd gets its corner radius from the file too

Open a board file whose wing has clearly rounded corners and our wing now opens rounded: the dashed line follows the rounded
step, its position and run sit where they belong instead of long and forward, the Wing line says the radius on both sides, and
Open as a Board lands on a WINGS tab whose Corner radius slider already holds it. Every other wing opens exactly as before. The
Fryer's flyer is sharp (the file draws both its corners as corners), so it opens byte for byte as it did, and its line now says
"sharp corners" on both sides. On a phone the Wing line no longer splits a measurement such as 7 7/16" across two lines.

Three commits on `close-bottom-17`: `01afb8aa` (reading the corners, maths and tests only), `bc1e53b4` (the words), `fd3174d4`
(browser tests and pictures). Nothing pushed, no database change, no build run, and the dev server on 3117 was left alone (the
browser tests and the picture script reused it). The PLAN, BRIEF and this SUMMARY are not committed (the orchestrator does that).

## What was built

**Task 1, `01afb8aa`.**
- `lib/geometry/brd-wings.ts` gains `wingCornerInset`, `wingFromFootprint`, the `BrdWingCorner` type and the four constants
  (`BRD_WING_CORNER_WINDOW_MM` 1.5", `BRD_WING_CORNER_PAD_MM` 1/4", `BRD_WING_ROUND_INSET_MIN_MM` 1.1, `BRD_WING_ROUND_BETTER_MIN_MM`
  0.1), each with its measured reason, and a header paragraph that says the footprint, the inset, the rule, the margins and why a
  gentle step's radius cannot be read.
- `lib/geometry/brd-fit.ts` gains `windowGap`, `measureWingCorners` (per file wing: a sharp search, then three rounded searches from
  starting shares 0.15, 0.5 and 0.9, on the file's stretch 1 1/2" either side, drawn by the app's own outline) and the refit
  step inside `fitTailAroundWings`, which now returns `{ spec, corners }`. `BrdFit.fileWingCorners` is new (same order and length as
  `fileWings`, `[]` for a file with no wing) and the `sameOutlineAs` reuse path carries it over. The wingless branch of
  `fitOutline` is byte for byte today's. The two stale doc comments (the file header's "no wings", `fitTailAroundWings`'s "radius
  not fitted") were rewritten.
- Pinned BEFORE any change: ten sharp-winged boards (shortboard one, deep, square, infade, rounded, fish rounded, midlength
  square, longboard deep, shortboard two, and two with wing 2 at 1/4") recorded in the snapshot beside the twelve wingless ones.
  The snapshot diff is pure additions (613 lines, no change to any existing entry); it passes untouched and was never re-recorded.
- Tests: 30 in `brd-wings.test.ts` (inset checked against the step's own `tangent` and `radius` from `wingStepShape` within 1e-9;
  `wingFromFootprint` round-trips each rounded step and its sharp twin within 1e-6; range and square-step behaviour), and in
  `brd-fit.test.ts`: every pinned label reads sharp with an inset under 1.1 mm; nine rounded round trips through the app's writer
  (1"x1" at its top on all four presets, square 3/8" at 1/8" and at its top on shortboard and midlength, the steep 3/4"x1/4" at
  1/4"); four exact outlines; the 1/2"x1/2" step rounded 1/4" opening sharp on an exact outline (inset 0.51); two clearly rounded
  wings on the fish; wingless `fileWingCorners` equal to `[]`. `brd-board.test.ts`: a rounded wing deep-equals through
  `readBoardEntry`, and `outlineForFins` reads it sharp. No change to `brd-board.ts` was needed.

**Task 2, `bc1e53b4`.** `BRD_FIT_COPY` gains `wingSharpCorners`, `wingFileRounded`, `wingOursRounded`; `wingLine` ends each side with
that side's corners; `BrdWingWords.corners`; `wingLines` pairs `fileWings[k]`, `fileWingCorners[k]` and `outline.wings[k]` by
index. The dialog wraps each wing line in `keepFiguresTogether`; the sheet's strings and the printed overview keep plain spaces.
The overview's builder was not touched (the new words flow into it from the one builder).

**Task 3, `fd3174d4`.** `e2e/brd-fit-preview.spec.ts`: b18's iPhone regex now reads the corners (`\s` beside figures), and b28-b31
are new (b22-b27 left free for the rails task). Pictures and the Fryer's printed overview in `pictures/`.

## Parity with the planner's measurements

Written and read back through the app's `.brd` writer, all 108 cases (the 80 round trips and 28 validation shapes), the shipped
code against the scratch `fitx.ts` with the final settings (`CORNER_RULE=D CORNER_INSET=1.1 CORNER_NE=0.1 CORNER_REFIT=1
CORNER_WIN=1.5 CORNER_PAD=0.25 CORNER_SEEDS=0.15,0.5,0.9 CORNER_SCORE=lt`): every outline, every drawn line and every closeness
figure byte-identical. The same on exact outlines (`EXACT=1`): 108 of 108 identical. With the scratch's switch off (hyy's fit as
it shipped), **67 of the 80 writer round trips are byte-identical to hyy's and 13 come back rounded**; with the validation shapes
9 of 28 are identical and the rest rounded. Nothing changed without rounding. The 13 rounded rows are the plan's table to the last
digit:

| Board, wing (true) | Today (sharp) | Now | Widest gap |
|---|---|---|---|
| shortboard 1"x1" R1 11/16 | 11.317 / 0.998 / 1.655 | **11.039 / 1.000 / 1.110 / R1.675** | 1.13 to 0.29 mm |
| shortboard square R1/8 | 11.054 / 0.380 / 0.108 | 11.001 / 0.380 / 0.000 / R0.131 | 0.52 to 0.26 |
| shortboard square R3/16 | 11.102 / 0.380 / 0.204 | 11.022 / 0.378 / 0.042 / R0.191 | 0.51 to 0.23 |
| fish 1"x1" R1 11/16 | 11.290 / 1.000 / 1.615 | 11.044 / 1.000 / 1.112 / R1.582 | 1.04 to 0.49 (its swallow written square) |
| fish 1/2"x1/2" R13/16 | 11.137 / 0.493 / 0.774 | 11.013 / 0.496 / 0.530 / R0.793 | 0.53 to 0.49 |
| fish square R1/8, R3/16 | 11.053 / 11.110 | 11.000 / 11.008 (radius 0.131 / 0.198) | 0.52 / 0.57 to 0.49 |
| midlength 1"x1", square R1/8, R3/16 | 11.252 / 11.055 / 11.108 | 11.019 / 11.001 / 11.033 | 0.95 / 0.50 / 0.50 to 0.47 / 0.30 / 0.19 |
| longboard 1"x1", square R1/8, R3/16 | 11.293 / 11.055 / 11.099 | 11.034 / 11.001 / 11.006 | 2.30 (its nose) either way |

(Station / depth / run / radius in inches, from the writer.) The app's own rounded deep wing opens at about 11 1/16" / 1" / 1 1/8" /
1 11/16" radius, against today's 11 5/16" / 1" / 1 5/8" sharp, as the plan said it would. Every rounded wing is closer than today:
station within 0.044" (today 0.32"), run within 0.133" (today 0.66"), radius within 0.157". On exact outlines the 1/2"x1/2" step
rounded as far as it fits (shortboard 11.004 / 0.494 / 0.514 / R0.781, gap 0.49 to 0.10), the 1"x1" (11.013 / 0.979 / 1.046 /
R1.615, 1.05 to 0.30), the square R1/8 (0.46 to 0.05) and the steep step rounded 1/4" (10.999 / 0.744 / 0.251 / R0.240) all come back
rounded.

## The Fryer

Read from `~/Downloads` by scratch scripts outside the repo, through the shipped code, against a dump of the untouched code taken
before any change:
- The Egg, the 6'2 and the Scoop: identical to the last digit, `fileWingCorners` `[]`.
- The Fryer: its outline, drawn line and closeness identical to the untouched code. Its flyer's corners are corner knots in the
  file (the outline turns 17.3 and 34.9 degrees at single points and the neighbours 1.3 degrees or less). The corner pass says
  best rounded wing radius 0.016" (0.39 mm), **inset 0.016 mm, improvement 0.0002 mm: it reads sharp**. Ours stays 7.379" / 0.239" /
  0.389" sharp, no lock. Widest gap 1.29 mm at 0.591" (9/16") from the tail, typical 0.41 mm (the squash end's rounded corner
  against our square one), before and after. The line says "sharp corners" on both sides (picture and printed overview checked).

## The rule and its margins

A corner reads as rounded when the best rounded wing (curve held) has its corner at least **1.1 mm inside the sharp corner**
(`wingCornerInset`, R times (sec(turn/2) less 1)) and fits the step at least **0.1 mm closer** than the best sharp wing, read
over the step and a quarter inch either side. Margins as the planner measured them and the shipped code reproduces:
- Sharp corners (writer): inset 0.00-0.43 mm, so 0.67 mm (2.6 times) under the line; the Fryer 0.02 mm; exact outlines at most
  0.07 mm. Their improvement at most 0.03 mm.
- Rounded but too slight to tell (writer): 0.29-1.05 mm, 0.05 mm under at the closest (a 1/2" step rounded 1/4"). Exact outlines
  at most 0.70 mm.
- Clearly rounded: writer 1.35-3.46 mm; exact 1.16-3.08 mm, 0.06 mm over at the closest (a 1/4" square step rounded 1/8" on the
  fish). Improvement 0.12 mm and up.
The band between 1.05 and 1.16 mm is the honest limit of a half-millimetre drawing; a corner in it may come back either way
between boards, but it is a rounded corner either way. A sharp corner never reaches it.

## The refit, and why

A rounded wing reaches full depth further back than the sharp wing did (9.29" against 9.66" on the deep wing), and its fade to the
tail moves the outline behind it by up to 0.75 mm. So when any wing is rounded, the curve is refitted to what the rounded wings
leave (round step 3's own refit), and the tail keeps whichever of three answers scores lowest by the fit's own largest-plus-
typical gap: today's sharp one, the rounded wings on the same curve, or the rounded wings on the refitted curve. Holding the curve
alone made the two-wing shortboard worse (1.07 to 1.31 mm). The refit lowered the score in every rounded case and never fell back to
today's.

## Timings

`fitBoardToBrd`, Node, warm median of 5 after 2 warm-ups, this Mac, load average 14-18 (heavily loaded, so the plan's load-4 figures
are the better reference; these are the plan's to within noise):

| Board | Before | Now |
|---|---|---|
| Fryer | 71 ms | 152 ms |
| Egg, 6'2, Scoop | 43, 45, 39 ms | 43, 45, 38 ms |
| shortboard, one sharp wing | 95 ms | 170 ms |
| shortboard, 1"x1" rounded | 144 ms | 269 ms |
| shortboard, square rounded | 95 ms | 244 ms |
| two wings, wing 2 at 1/4" (hyy's slow case) | 170 ms | 339 ms |
| two wings as the app adds them | 183 ms | 436 ms |

The corner pass runs four bounded searches per wing and at most one curve refit, so a wing costs about 80-250 ms more and a
wingless file nothing. A first run at load 7-20 read the slow cases at 361 and 433 ms. Browser: the previews opened and the
specs ran without time-outs on the unminified dev server.

## Deviations from the plan

1. **[Own call, test shape] No new timing assertion.** A first draft asserted the rounded fit under 1500 ms; run beside the
   whole of `lib/geometry` at a load average near 30 it read 2.5 s and failed (the existing two-wing assertion has the same
   exposure and was left as it was). The plan only asks to log the rounded time beside the two-wing one, so the existing speed
   test now logs both and the new assertion was removed. The geometry suites then passed.
2. **[Test helper]** `expectWingsHoldable(fit, roundedAllowed = false)` gained a flag so the same checks cover rounded wings (radius
   at least 0 and never more than fits). The old calls are unchanged.
3. **[Extra pictures]** Beyond the plan's list: `wing-desktop-rounded-deep-tail.png`, and a `-lines` close-up of the Wing line on
   the phone for both boards.
4. **[Branch guard]** The commit protocol's per-agent branch allow-list would refuse `close-bottom-17`; the task message names it
   as the branch to work on directly, and it is not a protected branch, so commits went on it as instructed.
5. **[Plan numbering]** New browser tests are b28-b31 as asked.

## Tests and checks

- `npx tsc --noEmit` clean, `npm run lint` clean apart from the one old `import-designs-action.test.ts` warning, before each commit.
- Unit: `lib/geometry` as a whole (86 files): 9525 passed, 1 failed, and the one failure was the timing assertion from deviation 1,
  since removed. Touched suites after the last change: `lib/geometry/brd-fit.test.ts`, `brd-wings.test.ts`,
  `lib/models/brd-board.test.ts` (212 tests), and `lib/export`, `components/template/build-brd-overview-pdf.test.ts`,
  `lib/geometry/keep-figures-together.test.ts` (10 files, 522 tests), all green. The whole unit suite was not run (asked not to).
- Browser (`PW_PORT=3117`): `e2e/brd-fit-preview.spec.ts` and `e2e/board-file.spec.ts` together: 67 passed, 29 skipped (the tests that say
  one computer is enough), 3 failed, all three being the known `board-file.spec.ts` f1 on each project (a last digit in
  `widthMm`, fails on untouched code, not ours). b18 and b28-b31 pass on their projects; b19-b21 and every older test still pass.

## Pictures (all looked at, all in `pictures/`)

- `wing-desktop-squash-flyer.png`: Wing 1 reads 1/4" deep over a 3/8" run along the stringer, 7 7/16" off the tail, sharp corners; ours 1/4",
  3/8", 7 3/8", sharp corners. HOW CLOSE: outline within 1/16", widest gap 9/16" from the tail.
- `wing-desktop-squash-flyer-tail.png`: file and dashed fit lie on top of each other through the flyer's step; the squash end's
  rounded corners against ours is the only visible difference.
- `wing-tab-squash-flyer.png`: WINGS · 1, Position 7 3/8", Depth 1/4", Vertical run 3/8", Corner radius 0", exactly as before.
- `wing-phone-squash-flyer.png`, `-lines.png`: the line wraps over three lines and "7 7/16"" stays whole.
- `wing-desktop-rounded-deep.png` and `-tail.png`: the dashed line follows the rounded step; the line reads 1" deep over a 1 1/8" run,
  11 1/16" off the tail, corners rounded about 1 11/16"; ours the same figures and 1 11/16" corner radius.
- `wing-phone-rounded-deep.png`, `-lines.png`: every figure unbroken on an upright iPhone 14.
- `wing-tab-rounded-deep.png`: WINGS · 1, Position 11 1/16", Depth 1", Run 1 1/8", Corner radius 1 11/16", "Round · 1 15/16" fits".
- `overview-squash-flyer.pdf` and `-page1.png`: two pages; "Wing 1" and "sharp corners" on page 1 (read back with pypdf).

## Limits

- A corner whose rounding sits less than about 1.1 mm inside the sharp corner opens sharp. On a gentle step that is nearly every
  radius; the app's own "+ Add wing 2" (3/16" over 1/2", rounded 1 7/16") sits about 0.4 mm in through the writer (0.6 mm exactly),
  so it still opens sharp with its run long (0.80" for 0.5"), now with the reason measured. The two-wing shortboard with wing 2 as
  the app adds it is unchanged.
- Our writer's half-millimetre drawing blurs moderate radii (1/4" on a 1/2" step reads 0.92-1.05 mm; exactly 0.48-0.51).
- Two clearly rounded wings close together (the shortboard and the midlength, 4" apart): only one of the two reads rounded, the gap
  moves 1.07 to 0.99 mm and 0.95 to 0.97 mm; the rounded wing there (the shortboard's wing 1: 11.116" / 1" / 1.312" / R1.286 against a truth of 11 / 1 / 1 / R1.688) is closer than the sharp one (11.280" / 1.594") but not as close as a single wing. On the fish and the longboard both read rounded.
- The app's wing model has one radius for both corners.
- The file's run for a rounded step, as the finder measures it, counts the rounds (2.04" for the deep wing), so a rounded wing's line uses the measured rounded wing's figures: on such a line the file's figures and ours are the same numbers.
- If the refit ever scored worse than the sharp answer the wing would open sharp while the file's side still reads "corners rounded"; it never happened in the 108 cases.
- The real print window and the founder's own phone are his look.

## Calls for the founder (from the plan's "Changes to the brief")

1. A rounded wing's file side uses the measured rounded wing's figures, so both sides read the same numbers. Keep both sides, or shorten such a line to one "the file and ours" clause?
2. Two corner states on each side, not three: a file corner too slight to tell reads "sharp corners", like a truly sharp one. A third wording ("too slight to tell from sharp") is left for him.
3. The curve is refitted after a rounding and kept only if the whole tail fits no worse (not in the brief; the measurement needs it).
4. The radius is kept as found, never more than fits, not clamped to the slider's floored top (which depends on the chosen system): a fitted 0.198" on a 3/16" square step shows the slider at its top and the label reading 0.198".
5. Figures stay together only in the dialog, through the house `keepFiguresTogether`; the sheet's words and the printed overview keep plain spaces (so the printed line can still break at "off the / tail").
6. The 1.1 mm line means most rounded corners on gentle steps still open sharp, the app's own default wing 2 included: the honest limit of a half-millimetre drawing, and his to accept.

## Known Stubs

None.

## Threat Flags

None new. T-m5w-01: a fixed budget whatever the file holds (at most 2 wings, four searches each and one curve refit, each capped at
the same iteration limit); a two-wing board with wing 2 as the app adds it measured 0.44 s warm. T-m5w-02: every candidate passes
`clampWingStations`, depth and run are held inside their slider ranges and the radius is a share of `maxWingRadius`; `brdBoardFields`
still reads the board back through `readBoardEntry` (tested). T-m5w-03: the AkuShaper files were read only by scratch scripts
outside the repo; the pictures and the PDF hold numbers and words only (scanned for `(cp [`, `p35 :` and `(p36`; none found).

## Self-Check: PASSED

Commits found: `01afb8aa`, `bc1e53b4`, `fd3174d4`. Files found: `lib/geometry/brd-wings.ts`, `lib/geometry/brd-fit.ts`,
`lib/export/brd-fit-preview.ts`, `e2e/brd-fit-preview.spec.ts` and the 12 files in `pictures/`.
