---
phase: quick-261113-hyy
plan: 01
subsystem: board-file-preview
tags: [brd, wings, flyer, outline-fit, print-overview, open-as-board]
requires:
  - quick-261113-d9b (closest-fit preview)
  - quick-261113-et0 (tables, Print Overview, Open as a Board)
  - quick-261113-gwr (bottom contours)
provides:
  - "A .brd's wings (flyers) found from its outline: where off the tail, how deep, how long a run"
  - "A closest fit that is our curve PLUS our own wing(s), fitted around the file's wing instead of through it"
  - "One line per wing on the preview and the printed overview: the file's wing beside ours"
  - "Open as a Board opens with the wing on the WINGS tab"
affects:
  - the rails task (the not-read line is now only about rails)
key-files:
  created:
    - lib/geometry/brd-wings.ts
    - lib/geometry/brd-wings.test.ts
    - lib/geometry/__snapshots__/brd-fit.test.ts.snap
  modified:
    - lib/geometry/brd-fit.ts
    - lib/geometry/brd-fit.test.ts
    - lib/models/brd-board.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - components/setup/brd-fit-dialog.tsx
    - components/template/build-brd-overview-pdf.ts
    - components/template/build-brd-overview-pdf.test.ts
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "The planner's measured method ported exactly; parity with the plan's figures proved on the Fryer and on the app's own winged boards"
  - "The wingless path is byte-for-byte today's, pinned by a snapshot recorded on the untouched code"
  - "Every wing opens sharp, no fin lock, with its fitted values kept as found (not rounded to the sliders' steps)"
status: complete
actuals:
  tokens: 120000
  tasks: 3
  commits: 4
---

# Quick 261113-hyy: a .brd's wings are found and fitted; the outline is fitted around the wing, not through it

Open the Fryer's .brd and the dashed line now steps in where the file's flyer does, on both rails. The preview says the file's
wing and ours side by side, the outline's widest gap is about half of what it was, the printed overview says the same, and Open
as a Board lands on a board whose WINGS tab already holds the wing. Every file without a wing (the Egg, the 6'2, the Scoop and
the app's own wingless boards) fits and opens exactly as it did.

Four commits on `close-bottom-17`: `0adc584d` (finding and fitting, maths and tests only), `76efd3fb` (the words on screen and
paper), `20d290e8` (browser tests, pictures and the Fryer's printed overview), `02641513` (a speed-up beyond the plan, see
Deviations). Nothing pushed, no database change, no build run, and the dev server on 3117 was left alone (the browser tests and
the picture script reused it; no other `next dev` or `next build` was started).

## The Fryer, through the shipped code

Read by a scratch script (outside the repo) from `~/Downloads/Fryer-5'7-Squash-Flyer-Twin.brd`; every figure is the plan's:

| | Off the tail | Deep | Run along the stringer | Corners |
|---|---|---|---|---|
| The file's wing, as measured | 7.410" (7 7/16") | 0.252" (1/4") | 0.379" (3/8") | (the file's own; dip under a straightedge 4.77 mm) |
| Our wing, as fitted | 7.379" (7 3/8") | 0.239" (1/4") | 0.389" (3/8") | sharp, no fin lock |

| Outline | Before | After |
|---|---|---|
| Widest gap | 2.75 mm at 7.031" from the tail, where the file is narrower | 1.29 mm at 0.591" (9/16") from the tail, where the file is wider (the squash end's rounded corner against our square one) |
| Typical gap | 0.79 mm | 0.41 mm |
| Tail block | 2.80" | 2.06" |
| Tail 12" width | 14 7/16" (file 14 3/8") | 14.447" (file 14.399") |

## The wingless files, unchanged

The four AkuShaper files' complete fit (outline controls, rocker, foil and closeness, every digit) was dumped from the untouched code
before any change and compared with the new code's: the Egg, the 6'2 and the Scoop find no wing and come out **identical to the
last digit**. Their figures, for the record: Egg outline gap 1.02 mm at 81.64" typical 0.32 (round tail, no flat end); 6'2 2.12 mm
at 1.08" typical 0.80 (squash block 1.95"); Scoop 1.54 mm at 109.44" typical 0.26 (squash block 6.56"). Beyond the four files, a
snapshot test written and recorded BEFORE the change pins twelve wingless boards of the app's own writer (the nine round-trip
boards, a fish swallow, a shortboard diamond, and one hand-made outline with a smooth 1/8" hip): outline controls, rocker, foil
and closeness. It passes untouched and was never re-recorded. A wingless fit has no `wings` key at all and `fileWings` is empty.

## How a wing is told from a smooth outline (and the margin)

A wingless tail half only ever turns one way: lay a straightedge across any stretch and the rail stands on or above it. A wing
makes a dip. The rule: lay the tightest straightedges over the tail half (the upper hull); a wing is a dip at least **1/32"** deep
under one whose step (deepest point to where the rail rejoins the straightedge) is no longer than **3"**. Measured margin:

- No dip at all in the Egg, the 6'2, the Scoop. The 20 hard-edge wingless exports of the app's own boards: none found (a test).
  The planner measured all 40: largest dip 0.03 mm, the writer's wobble beside a rounded wing 0.15 mm. Smooth hand-made hips,
  1/32" to 1/4" over 2" to 8": none found (a test). That is 25 times under the 1/32" line (0.79 mm).
- Wings: the Fryer's flyer dips 4.77 mm; the app's own exported wings 2.79 mm (a 3/16" wing 2 rounded as far as it fits) up to 23.9 mm
  (1" deep): at least 3.5 times over it. A square 1/16" step is found (a test).
- Honest limit: a 1/16"-deep wing with a 1" to 2" run bends the rail by less than 1/32" and reads as part of the curve; the outline's
  gap then shows it, at most about 1/16".

## Round trips (the test with a known answer)

The app's own exports of winged boards, written with the app's `.brd` writer, read back and fitted. Station / depth / run in
inches. Run from the shipped code; every row is the plan's table to the last printed digit.

| Board | True wing(s) | Found in the file | Fitted | Outline gap |
|---|---|---|---|---|
| shortboard one | 11 / 0.187 / 0.25 | 11.000 / 0.191 / 0.250 | 11.003 / 0.191 / 0.254 | 0.13 mm |
| shortboard deep | 11 / 1 / 1 | 11.000 / 1.017 / 1.000 | 11.006 / 1.000 / 1.006 | 0.13 mm |
| shortboard square | 11 / 0.375 / 0 | 11.000 / 0.375 / 0 | 11.000 / 0.380 / 0 | 0.13 mm |
| shortboard rounded (R 1/4") | 11 / 0.5 / 0.5 | 11.066 / 0.490 / 0.631 | 10.998 / 0.503 / 0.512 | 0.47 mm |
| shortboard infade | 22 / 0.187 / 0.25 | 22.000 / 0.189 / 0.250 | 22.006 / 0.189 / 0.252 | 0.16 mm |
| fish rounded | 11 / 0.5 / 0.5 | 11.104 / 0.496 / 0.707 | 11.016 / 0.501 / 0.531 | 0.49 mm |
| midlength square | 11 / 0.375 / 0 | 11.000 / 0.375 / 0 | 11.000 / 0.375 / 0 | 0.19 mm |
| longboard deep | 11 / 1 / 1 | 11.000 / 1.011 / 1.000 | 11.001 / 1.000 / 1.000 | 2.30 mm (its nose; 2.3 mm wingless too) |
| shortboard two, wing 2 rounded 1/4" | 11/0.187/0.25 + 8/0.187/0.5 | 11.000/0.191/0.250 + 8.030/0.197/0.561 | 11.006/0.182/0.258 + 8.004/0.197/0.510 | 0.18 mm |
| shortboard two as the app adds it (wing 2 rounded 1 7/16") | same | 11.000/0.191/0.250 + 8.175/0.198/0.850 | 10.997/0.188/0.248 + 8.148/0.193/0.801 | 0.17 mm |

Every single wing comes back within a quarter of a slider step on position and depth and half a step on run; the unit tests hold
every wing to two slider steps, radius 0, lock null, inside the sliders' ranges and the order rule (`clampWingStations` returns
the same list), the tail kind the same board's wingless fit makes, the winged outline under 1 mm of the file (the longboard under
3 mm) and the curve alone within 1 mm of the board's own outside each true wing's stretch (longboard 3 mm). The app's own default
"+ Add wing 2" (rounded as far as it fits) is held to its outline and to wing 1 only: a sharp wing matches that long S with a longer
run (0.80" for 0.5"), a limit recorded in the test.

## What was built, by task

**Task 1 (`0adc584d`)** `lib/geometry/brd-wings.ts` (`findBrdWings`, the two constants, the `BrdFileWing` type; pure, no import of
brd-fit) and the winged branch of `fitOutline` in `brd-fit.ts` (`fitTailAroundWings`: the file with our wing taken back out is fitted
by today's two tail families, the wing is seeded and polished with the curve held, then the curve is refitted to what the wing
leaves behind, three rounds, best kept). The wingless tail code did not move: `tailFamily` gained an optional target that defaults to
today's, nothing reordered, and the snapshot proves it. `BrdFit.fileWings` is new. Tests: the snapshot (written first), 11 finder
tests, the round trips, ranges, speed, and `brdBoardFields` of a winged fit keeps the wing exactly through `readBoardEntry`
(no change to `brd-board.ts` was needed).

**Task 2 (`76efd3fb`)** `BRD_FIT_COPY.wingLine`, `BrdFitSheet.wings`, `wingLines` in `brd-fit-preview.ts`; the dialog and the PDF
builder print the lines right after the HOW CLOSE sentences (before the tips note). The imperial words, built from the app's functions:
*Wing 1 — the file: 1/4" deep over a 3/8" run along the stringer, 7 7/16" off the tail. Ours: 1/4" deep over a 3/8" run, 7 3/8" off the
tail, sharp corners.* Metric: *Wing 1 — the file: 6 mm deep over a 10 mm run along the stringer, 18.8 cm off the tail. Ours: 6 mm deep
over a 10 mm run, 18.7 cm off the tail, sharp corners.* A run that formats as nothing reads "in a square step". The not-read line is
now "Rails and bottom contours aren't read from the file. Add these by hand once the board is open." (or just "Rails aren't read…"
once the bottom is). Nothing is said about fins. The words are first drafts for the founder's look, all in `BRD_FIT_COPY`.

**Task 3 (`20d290e8`)** Browser tests b18–b21 in `e2e/brd-fit-preview.spec.ts` (numbering continues after b17 as asked, in place
of the plan's w1–w4): b18 on desktop and both phones (one `[data-brd-fit-wing]` line equal to the sheet's, by shape on the iPhone;
sits between the outline's HOW CLOSE line and the tips note; no "wing" in the not-read line; on a phone the line stays inside the
screen), b19 Metric, b20 Open as a Board then the WINGS tab (the kept board holds the wing sharp and unlocked, nothing saved, the
tab reads "WINGS · 1" and `Position from tail — <formatDim>`), b21 a wingless file shows no wing line.

## Tests and checks

- Unit: `lib/geometry` as a whole (86 files, 9465 tests, green, run before the later test additions), then the touched suites again
  at the end: brd-wings, brd-fit, brd-board, brd-bottom, brd-fit-preview, build-brd-overview-pdf, `lib/export` (9 files, 511 tests),
  `lib/units-isolation`; all green. `npx tsc --noEmit` clean; `npm run lint` clean apart from the one old
  `import-designs-action.test.ts` warning. The unit suite as a whole was not run (asked not to).
- Browser (`PW_PORT=3117`): `e2e/brd-fit-preview.spec.ts` **39 passed, 24 skipped, 0 failed** (the skips are the tests that say one
  computer is enough), including b18–b21 on their projects; `e2e/board-file.spec.ts` 21 passed and **only f1 failed** (all three
  projects, the known last digit, not ours). After the speed-up commit the desktop project of the spec was run again: 21 passed.
- Overview PDFs of all five real files (the four AkuShaper files plus the Scoop in Metric) and the Fryer in Metric: all build,
  none refused, all **two pages** 595.28 x 792 as gwr left them, BOTTOM on page 2 in each; the Fryer's two wing lines are on page 1
  (read back with pypdf: "Wing 1" on page 1 only, in Imperial and Metric). The wingless overviews have no wing line.

## Timings

**Node, `brdFitLook` (the whole look, both fits and the bottom), this Mac at a load average of 8-11, cold / warm:** Egg 234 / 120-150 ms;
6'2 255 / 265-275; **Fryer 241 / 215-230** (gwr measured 218-228 for it without a wing); Scoop 310 / 295-300. **`fitBoardToBrd` alone**
(what a wing costs): Fryer 32 ms before, **about 70 ms now**; Egg, 6'2 and Scoop 40-47 ms, unchanged (the finder costs about 0.1 ms).
The app's own boards: one wing about 100 ms, two wings about 190 ms, and two wings with wing 2 rounded 1/4" **440-530 ms warm** (cold
740) — the one slow case, because its refits run to their iteration limit; still under a second on a loaded machine and inside the
test's 1.5 s cap. **Browser** (the dev server on 3117, an unminified development build, the machine at a load average of about 8-11): the
Fryer's dialog with everything on it showed 0.75-1.4 s after the file was chosen (the wingless files 0.74-1.06 s, as in gwr).

## Deviations from Plan

**1. [Rule 1 - speed, beyond the plan] The refit for a concave's lift no longer searches the outline twice** (commit `02641513`).
`brdFitLook` fits a file twice when a fitted concave lifts the stringer (the Fryer, the 6'2 and the Scoop all have one), and the
second fit repeated the outline search, which the lift never touches. With a wing that doubled the costliest part (a two-wing board
with a concave would have cost about 0.9 s). `fitBoardToBrd(lines, lift, sameOutlineAs)` now takes the first fit's outline; a test holds
the result equal, to the last digit, to searching again, for a wingless and a two-wing board. The Fryer's look went 275 -> 215-230 ms.
The wingless snapshot and the four files' figures are unaffected.

**2. [Plan numbering] The new browser tests are b18-b21**, continuing the spec's numbering as the task message asked, instead of the
plan's w1-w4.

**3. [Rule 2 - wording] The two not-read strings were reworded** to "Rails and bottom contours aren't read from the file…" / "Rails
aren't read from the file…" so they read cleanly without "wings or flyers"; the old test expecting the previous words was updated.

**4. [Test shape]** The base-curve comparison in the round-trip tests is the nearest distance between the two lines outside each
true wing's stretch (`polylineGap`), not the difference in half-width at a station: at a steep nose the vertical difference reads
6 mm for the longboard where the true distance is 2.66 mm, the figure the plan quotes. The fish board's tail is a swallow in the app, so
"the same kind of tail" is checked against the same board's wingless fit (a squash), not against the swallow.

**5. [Own call, as the plan allows] Two extra winged looks (one wing, two wings) were added to the overview PDF suite's `LOOKS`**
so every existing page, blank and cell test also runs on a winged board.

No other deviations: the corner radius is not fitted, fitted values are kept as found, wing 1 is the nose-most, and the WINGS tab's
own "+ Add a wing" default is untouched.

## What gwr's bottom fit needed

Nothing. `fitBottomToBrd`/`brdFittedBottomBoard` (`lib/geometry/brd-bottom.ts`) already draw the board from `fit.outline` (the same
`OutlineSpec` the board opens with, winged or not), and `brdFitLook` fits the outline first (the first `fitBoardToBrd`) before the
bottom is fitted on it. The Fryer's bottom figures are the same as in gwr (centre 3/16" Deep Single, tail 1/8" Double Concave Exit,
nose 1/16" Blended; "within 1/16"") with the winged outline underneath.

## What I saw in the pictures (all in this task's `pictures/`, all looked at)

- `wing-desktop-squash-flyer.png` / `-metric.png`: the dashed outline steps in at the flyer on both rails and the squash end; HOW CLOSE
  reads "Outline: within 1/16", typically less than 1/16" — the widest gap 9/16" from the tail, where the file is wider than our fit" and
  the Wing 1 line right under the Bottom line; Metric reads 6 mm / 10 mm / 18.8 cm and 18.7 cm.
- `wing-desktop-squash-flyer-tail.png` (4x, the last 30% of the top view): the file's solid line and our dashed one lie on top of each other
  through the flyer's step; the squash end's rounded corners against ours is the only visible difference.
- `wing-phone-squash-flyer.png` and `-lines.png` (iPhone 14): the wing line wraps over three lines and stays inside the screen (it wraps
  inside the mixed number "7 / 7/16"" at the space; the same happens to other long lines).
- `wing-tab-squash-flyer.png`: the opened Fryer's TEMPLATE WINGS tab: "WINGS · 1", Position from tail 7 3/8", Depth 1/4", Vertical run
  3/8", Corner radius 0", Lock to front fin unticked, and the close-up shows the base curve ghosted under the winged outline.
- `nowing-desktop-{egg,round-tail,noserider}.png`: no wing line, the not-read line about rails, everything else as in gwr.
- `overview-squash-flyer.pdf`, `-page1.png`, `-page2.png`: two pages; the Wing 1 line sits on page 1 under HOW CLOSE; the two views are
  about 12% smaller than in gwr's overview of the same file (two more lines on the page) and nothing is clipped; page 2 is the BOTTOM block.

## Limits

- The corner radius is not fitted: every wing opens sharp. On a file whose wing is rounded, the fitted wing's run comes back a little
  long and its position a little forward (0.80" for a 0.5" run on the app's own default wing 2).
- A 1/16"-deep wing with a 1-2" run is not told from the curve (the outline's gap shows it instead).
- The squash end's rounded corners against our square ones are the largest remaining outline gap on the Fryer (1.29 mm), the same limit a
  wingless squash fit has.
- A file with a wing and with a rounded or a very long step beyond 3" is not a wing to the finder.
- The slowest case measured is two wings with wing 2 rounded 1/4" (about 0.45-0.5 s of fitting on a loaded Mac, before the bottom).
- The real print window and the founder's own phone are his look.

## Known Stubs

None.

## Threat Flags

None new. The finder and the winged fit run a fixed number of searches (three rounds, at most two wings), so a hostile outline costs what
the Fryer does (T-hyy-01); every wing goes through the sliders' ranges and the order rule and the board reader (T-hyy-02, tested to read
back deep-equal); the AkuShaper files were read only by scratch scripts outside the repo, and the committed pictures and PDF hold numbers
and words only (scanned for `(cp [`, `p35 :` and `(p36`; none found) (T-hyy-03).

## Self-Check: PASSED

Files found: `lib/geometry/brd-wings.ts`, `lib/geometry/brd-wings.test.ts`, `lib/geometry/__snapshots__/brd-fit.test.ts.snap`, the
pictures folder. Commits found: `0adc584d`, `76efd3fb`, `20d290e8`, `02641513`. The plan, the brief and this summary are not committed
(the orchestrator commits the docs).
