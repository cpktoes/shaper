---
phase: quick-261116-tqs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-bottom.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - lib/models/design-snapshot.test.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bands.test.ts
  - lib/geometry/rail-dome-reach.test.ts
  - lib/geometry/design.ts
  - lib/geometry/brd-rails.ts
  - lib/geometry/brd-rails.test.ts
  - components/design/design-store.tsx
  - components/rails/rail-band-editor.tsx
  - components/rails/rail-controls.tsx
  - e2e/rails-advanced.spec.ts
  - lib/geometry/units.ts
  - lib/geometry/units.test.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/measure-display.test.ts
  - lib/geometry/bottom.ts
  - lib/geometry/bottom-print.ts
  - lib/geometry/bottom-print.test.ts
  - components/bottom/bottom-controls.tsx
  - components/bottom/bottom-copy.ts
  - components/bottom/bottom-copy.test.ts
  - lib/geometry/bottom-depth-display.test.ts
  - e2e/bottom-depth-fine.spec.ts
  - e2e/bottom-metric.spec.ts
  - CLAUDE.md
autonomous: true
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11]

estimate:
  tokens: 260000
  raw_tokens: 260000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. One new polish in the bottom fit plus its wiring after the order choice,
  # one widened engine window and a per-section reach through the store to RAILS' slider and the rails fit, one depth
  # formatter and slider step through five readers, three new test files, one new browser spec, a handful of re-pointed
  # expectations, and the twelve-file measurement through the real import.

must_haves:
  truths:
    - "Opening a .brd ends with a polish of the chosen bottom at any value (D-01, D-11): each fitted cut's Start, Deepest At, End, Depth and across marks move by any amount that brings the fit's own score closer, with no 0.1 mm bar; the cut names, the rails-first/bottom-first order and every naming rule are decided exactly as today, on the grid answer, before the polish runs"
    - "Through the real import (brdLookFromBytes) the twelve sample files' bottom widest miss falls as measured in READ THIS FIRST §1 (for example the Fryer 1.04 to 0.49 mm, the Round Tail 0.95 to 0.55, 92Log 2.14 to 1.58), and each file opens no more than about 3 s slower than today (D-07, D-08)"
    - "A polished board keeps its polished numbers through a save, a board file and a reload, and BOTTOM, DATA and the printed sheets show them rounded to their own steps; no database change (D-02)"
    - "Depth stays inside 0 to 1/2\" and every other control inside its own range (D-03); the across steps stay 1/16\" (1 mm) and the along steps 1/2\" (10 mm) (D-10)"
    - "On RAILS each section's Domed Deck Band slider reaches in to 1\" from the stringer at that section, or less where today's +2\" already passes that line; its low end and its rule against Deck Mark 3 are unchanged; a saved nudge within +-2\" draws, prints and weighs exactly as today (D-04, D-05)"
    - "The rails fit searches the wider dome, so the 6'10 Egg's rails come in at about 1.67 mm instead of 2.07 (D-06)"
    - "Every BOTTOM depth (a cut's, the channels') steps and reads in 1/64\" as a reduced fraction, 0.1 mm in Metric, on the slider, its readout, DATA, the printed BOTTOM CONTOURS tables and sentences and the .brd fit preview; a depth on a 1/16\" step reads exactly as today in Imperial; CLAUDE.md Rule 2 records the exception (D-09)"
  artifacts:
    - path: lib/geometry/brd-bottom.ts
      provides: "polishBrdBottom(bottom, sections, board0): the chosen bottom polished at any value on the fit's own score, names held; the scorer's `polish`"
    - path: lib/export/brd-fit-preview.ts
      provides: "brdFitLook polishes the winning order's bottom once, refits the stringer for its lift as bottomOn does, then re-polishes and re-measures the rails on that board"
    - path: lib/geometry/rail-bands.ts
      provides: "RAIL_DOME_STRINGER_ROOM_IN, RAIL_DOME_NUDGE_MAX_IN (the engine's wider dome window), domedDeckBandNudgeTop(halfWidth, boardThickness)"
    - path: lib/geometry/design.ts
      provides: "railDomeNudgeTops(geometry, anchors, rails): each RAILS section's dome slider top"
    - path: lib/geometry/units.ts
      provides: "1/64\" fractions and the 0.1 mm forms for a bottom depth"
    - path: lib/geometry/measure-display.ts
      provides: "formatBottomDepth / formatBottomDepthBare (the OrLess rule kept); measureSlider steps under 1 mm in Metric"
    - path: lib/geometry/rail-dome-reach.test.ts
      provides: "the dome's reach, the saved-board proof, and every reader following a wider dome"
    - path: lib/geometry/bottom-depth-display.test.ts
      provides: "every BOTTOM depth reader at 1/64\" and 0.1 mm, and off-step polished values read through every reader"
    - path: e2e/bottom-depth-fine.spec.ts
      provides: "the Depth slider steps 1/64\" (0.1 mm in Metric) on a computer and a phone, and a reload keeps an off-step value"
  key_links:
    - from: lib/export/brd-fit-preview.ts brdFitLook (after the order is settled)
      to: lib/geometry/brd-bottom.ts polishBrdBottom
      via: "the winning step's bottom and its read sections (which carry the windows used); board0 is brdFittedBottomBoard(first, fins), the board the grid fit was made on"
    - from: components/design/design-store.tsx
      to: components/rails/rail-controls.tsx nudgeRow("domedDeckBand")
      via: "railDomeNudgeTop, worked out by railDomeNudgeTops from the outline, the rail anchors and the rails RAILS shows; passed through rail-band-editor.tsx"
    - from: lib/geometry/rail-bands.ts computeSectionInches
      to: "RAILS, the finished rail, the litres, the 3D board, the .brd export, the printed rail-band sheet"
      via: "the one nudge clamp every reader already goes through; only its dome top widens, so no reader changes"
    - from: components/bottom/bottom-controls.tsx MarkRow (field depth)
      to: lib/geometry/measure-display.ts formatBottomDepth + measureSlider
      via: "BOTTOM_DEPTH_STEP_IN (1/64\") and 0.1 mm; the cut's and the channels' Depth rows both"
---

<objective>
Three changes the founder asked for on 2026-11-16, each measured on his twelve sample files before it was planned:

1. **The bottom fit lands anywhere** (D-01, D-11). Opening a `.brd` keeps today's whole search and choice, then finishes with a
   polish that moves the chosen cuts' sliders to whatever values fit closest, between steps on any axis, and stores them
   (D-02). Names, the rails-first/bottom-first order and every naming rule are settled first, on today's grid answer.
2. **RAILS' Domed Deck Band reaches in to 1" from the stringer** (D-04), every reader follows (D-05), and the rails fit
   searches the wider dome (D-06).
3. **BOTTOM's depths step and read in 1/64"** (0.1 mm in Metric) everywhere a bottom depth is shown (D-09), across and along
   steps unchanged (D-10).

Purpose: the founder's words: "With all the customized controls, can we tighten up the fit? ... worst miss by less than 0.5mm
(certainly less than 1mm) every time", "I'm more worried about the bottom figures than rocker", "1/64" (or .1mm) for depth".

Output: the polish and its wiring; the wider dome through the engine, the store, RAILS' slider and the rails fit; the depth
formatter and step through every bottom depth reader; three unit files, one browser spec, the twelve-file table in the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md
@.planning/quick/261116-tqs-tighten-the-brd-import-s-bottom-fit-and-/261116-tqs-CONTEXT.md
@lib/geometry/brd-bottom.ts
@lib/export/brd-fit-preview.ts
@lib/geometry/rail-bands.ts

## READ THIS FIRST: what the planner measured (2026-11-16, a scratch copy of the source, the repo untouched)

The prototype is `/private/tmp/claude-501/-Users-kontoes-Code-shaper/002e2a58-3c43-4c8e-bbb5-e9c435113dd2/scratchpad/tqs/proto/`
(a copy of `lib/`, `components/`, `app/`, `blanks/`, `db/` on main bbd4cea5), every change behind an environment switch
(`TQS_POLISH=1 TQS_P2=1 TQS_DOUBLE_OS=1` the polish as planned, `TQS_RAILPOLISH=1` the rails re-polish after it, `TQS_DOME=1`
the wider dome). Read its `lib/geometry/brd-bottom.ts` (`polish2` inside `brdBottomScorer`, `polishBrdBottom` at the end),
`lib/export/brd-fit-preview.ts` (`polishedStep`, the `brdFitLook` wrapper), `lib/geometry/rail-bands.ts`
(`RAIL_DOME_NUDGE_MAX_IN`, `domedDeckBandNudgeMaxIn`) and `lib/geometry/brd-rails.ts` (`advancedMoves`) as the measured
shape, then write it properly: no environment reads, no module-level variables, named constants with their measured reasons.
The measuring script is `.../scratchpad/tqs/measure.mts` (run through `.../scratchpad/tqs/run.sh ROOT OUTFILE`): for each of the
twelve files in `~/Downloads` (the list is `.../scratchpad/jqz/files.txt`) it runs `brdLookFromBytes` and prints the bottom's
cuts, the bottom's and the rails' widest/typical miss, the domes and the seconds. The founder's files stay in `~/Downloads`
and are only read from there (D-07).

### 1. The twelve files, today (main bbd4cea5) and with all three changes (widest / typical miss, mm)

| File | Bottom today | Bottom planned | Rails today | Rails planned | Polish cost |
|---|---|---|---|---|---|
| 92Log | 2.14 / 0.71 | 1.58 / 0.44 | 2.32 / 0.62 | 1.65 / 0.44 | 0.3 s |
| Scoop-Noserider | 1.92 / 0.52 | 1.18 / 0.36 | 3.22 / 0.89 | 3.16 / 0.79 | 0.7 s |
| quadtesting | 6.46 / 0.84 | 6.43 / 0.82 | 55.49 / 2.07 | 55.49 / 2.08 | 0.1 s |
| SAtri | 0.66 / 0.04 | 0.40 / 0.06 | 2.52 / 0.32 | 2.52 / 0.32 | 0.3 s |
| SAtwin | 1.63 / 0.22 | 1.61 / 0.12 | 2.52 / 0.40 | 2.52 / 0.37 | 0.3 s |
| mid | 0.85 / 0.09 | 0.56 / 0.09 | 1.76 / 0.41 | 1.76 / 0.42 | 0.4 s |
| testLB | 2.39 / 0.34 | 2.08 / 0.26 | 5.00 / 0.85 | 5.01 / 0.80 | 0.2 s |
| JFS_BigTwin | 0.70 / 0.36 | 0.70 / 0.32 | 1.52 / 0.49 | 1.52 / 0.46 | 0.05 s |
| 6'10 Widepoint Fwd Egg | 0.84 / 0.27 | 0.77 / 0.21 | 2.07 / 0.70 | 1.67 / 0.47 | 0.05 s |
| 6'2 Round Tail Double Concave | 0.95 / 0.27 | 0.55 / 0.17 | 2.11 / 0.48 | 2.08 / 0.44 | 1.5 s |
| 6'4 Double Wing Groveler | 0.83 / 0.14 | 0.54 / 0.12 | 1.25 / 0.47 | 1.20 / 0.43 | 0.1 s |
| Fryer 5'7 Squash Flyer Twin | 1.04 / 0.31 | 0.49 / 0.21 | 1.14 / 0.37 | 0.93 / 0.29 | 1.2 s |

"Polish cost" is the measured time of the whole added step per file (bottom polish, stringer refit, rails re-polish and
re-measure), taken while the machine was loaded; the slowest is 1.5 s, inside D-08's 3 s. No file's cut names or order changed.
Every file's bottom and rails are as close as today or closer, except three hundredths-of-a-millimetre wobbles in a rails figure
(testLB 5.00 to 5.01 widest, mid 0.41 to 0.42 typical, quadtesting 2.07 to 2.08 typical), each with the other figure better.

### 2. Why the polish is shaped this way (each choice measured)

- **Where it runs: once, after the order is settled.** Polishing inside `fitBottomToBrd` (so in every one of the up to three
  bottom fits a file gets) changed which order wins on testLB: bottom-first then won with a Rolled Vee 1/2" tail the founder's
  longboard does not have, and its bottom went 2.39 to 3.65 mm. Polishing only the winning order's bottom keeps every name and
  order exactly as today (D-01) and costs one polish per file.
- **The stringer refit.** A polished concave lifts the stringer by a slightly different amount, so the polished bottom goes
  through the same lift check and `fitBoardToBrd(lines, lift, first)` refit `bottomOn` does today; the board that opens stays on
  the file's stringer.
- **The rails after it.** Re-measured on the polished board without a refit, the Fryer's rails got worse (1.14 to 1.31 mm);
  with `fitBrdRails(railLines, board, winner.settings)` (the existing `from` descent, Family and boxes held) they come in as the
  table shows. The tail blend is kept as fitted.
- **The search.** A plain coordinate descent at halving steps gained much less (the Fryer 0.72, the Round Tail 0.86, 92Log
  2.11, Scoop 1.92 widest) because the score is a largest-gap score that needs several sliders to move together. The research's
  minimiser (coordinate steps with repeats, then the neighbouring pairs moved together, halving the steps until each is a
  thousandth of its first, then two Nelder-Mead restarts) on the fit's own fast scorer gives the table above. First steps: 1"
  for a station, 1/32" for a depth, 1/4" for an across mark.
- **What it moves** (D-01: Start, Deepest At, End, Depth, across marks). Per cut that is not flat: Start, Deepest At and End as
  stations from the tail (stored through `storeCutStation`, each held to the board, then `keepStationsInOrder(key, spec,
  "deepest", board, "narrowest")`, which also keeps a double's marks in order); Depth held between 1/16" (the shallowest depth the
  grid chose among, so a polished cut never shrinks into one the name choice never weighed) and 1/2" (D-03); the across marks
  inside `BOTTOM_MARK_RANGES_IN`: a single's Off Rail; a belly's and the Tri-Plane's Off Stringer; a double's (the Spiral Vee is
  one) Trough At, Off Rail **and Off Stringer**. Today's refine moves no double's Off Stringer; freeing it in the polish took the
  Round Tail from 0.74 to 0.55 mm and the Fryer from 0.68 to 0.49 (their Double Concave Exits), and D-01 names Off Stringer first
  among the across marks. Smoothness, Vee Lift, Closes to a point and By hand's two trough ends stay as they are.
- **The score.** The fit's own (largest + mean gap over the read sections AND the blends between them). The research's heavier
  run scored the file's own sections only and reached 0.35 to 0.49 mm on the Round Tail, Groveler, Fryer and mid; that freedom
  fades cuts in and out between an AkuShaper file's few sections, which the blends exist to stop (quick 261113-gwr), so the
  polish keeps them. On the fit's own score that run reached 0.53 to 0.54 on those files: the plan's figures are within a few
  hundredths of it.
- **What stays out of reach** (model, not search; the research's reading): SAtwin (a double inside the vee tail), testLB (belly
  across), quadtesting (a 29 mm vee, Depth stops at 1/2", and a malformed file), the Egg and JFS (wobble in the file's flat
  sections), 92Log and Scoop (a soft belly the cuts cannot draw). The founder's "under 0.5 mm" is met on the Fryer and SAtri,
  is within a tenth on the Round Tail, Groveler and mid, and under 1 mm on seven of the twelve.

### 3. The dome (D-04, D-05, D-06): how the reach is expressed

- **The engine.** `computeSectionInches` clamps every nudge to `RAIL_NUDGE_LIMIT_IN` (±2" for the dome). The dome's top widens to
  `RAIL_DOME_NUDGE_MAX_IN` = `WIDE_BOARD_WIDEPOINT_MAX_IN / 2 − RAIL_DOME_STRINGER_ROOM_IN` = 14.5" (the widest board the app
  makes, less 1"), its low end stays −2". That one clamp is what RAILS, the finished rail, the litres, the 3D board, the `.brd`
  export and the printed rail-band sheet all go through (D-05), so no reader changes, and every saved nudge within ±2" means
  exactly what it meant (the engine window only widens). Measured: the whole unit suite (238 files) with only this on fails
  exactly one test of its own, `rail-bands.test.ts` "a nudge of 5" as its window's end" (Task 2 re-points it); its other 26
  red lines in the scratch copy fail identically with the switch off (tests that read `scripts/`, `reference/`, `public/` and
  the words pages the copy left out), so every golden, litres pin, GUIDE test and saved-board test holds.
- **The reach (the slider's and the fit's top).** `domedDeckBandNudgeTop(halfWidth, boardThickness)` = the nudge that puts the
  dome 1" from the stringer: half-width − 1" − 2.4 × thickness, in inches, floored onto the 1/16" grid counted from −2", never
  below −2" + 1/16", never above 14.5". The half-width is `foamHalfWidth(geometry, station)` at each RAILS anchor
  (`railAnchorStations`: the tail 12", the centre, the nose 12"); the thickness is the section's `boardThickness` as RAILS shows
  it (the store's `railsOnBottom`), so the slider's top lands the readout's dome exactly at 1" from the stringer (floored to the
  step). The rails fit uses the same function at its board's anchors with `board.foil` thickness (never beyond the opened
  board's slider: a vee's or belly's lift only thins RAILS' thickness and so raises its top).
- **What it measured.** On the app's own boards the top is above 2" at every centre, and below it on the Shortboard's nose
  (1.48", so the slider stops at +1 7/16") and on every pin tail (Shortboard 1.70", Fish 1.07", Longboard 0.44"): D-04's "the
  slider's reach is whichever is shorter there". The rails fit with the wider dome alone (today's bottom under it): the Egg
  2.07 to 1.67 mm (its centre dome +3", nose +4"), Scoop 3.22 to 2.93 (centre +2"; 3.16 with the polished bottom under it, §1),
  JFS typical 0.49 to 0.46; every other file as today; no file slower.
- **A saved dome past the new line.** A board opened from the Fryer or Round Tail file today carries a nose dome nudge (+2",
  +1") above the new top there (1.83", 1.80"). It keeps drawing, weighing and printing exactly as saved (D-04's "every board
  saved today reads and draws exactly as it does now"); its slider thumb sits at the right end and the label reads the true
  mark and nudge; the first drag lands inside the new reach. The engine never forces the 1" line on a stored value, because
  doing it at every station along the board would change the litres of every board near its tips (D-05).
- **RAILS' GUIDE stays as it is.** `guide-rails.ts`'s `nudgePush` keeps reading `RAIL_NUDGE_LIMIT_IN` (±2"), so its Domed Deck
  Band card draws exactly as today (CONTEXT: GUIDE cartoons are out of scope). On the Shortboard's nose that card's +2" push
  now passes the slider's own top; recorded as a question for the founder, no GUIDE code changes.

### 4. The depth display (D-09)

The bottom depth readers today: `MarkRow` in `components/bottom/bottom-controls.tsx` (field `depth`, used by every cut's Depth row
and by the channels' Depth row; readout `formatMarkOrLess`, step `BOTTOM_MARK_STEP_IN`), `bottomDepthCell` in
`components/bottom/bottom-copy.ts` (DATA's depths table and the printed sheet's, `components/summary/bottom-contours-sheet.tsx`
reads it), `cutLine` and the channels' line in `lib/geometry/bottom-print.ts` (`formatMarkOrLess`), and the bottom words in
`lib/export/brd-fit-preview.ts` (`cutName`-style line ~1007 and the reads line ~1046, `formatMark`). Not bottom depths, left
alone: an outline's swallow/diamond/wing depth (`bottom-copy.ts` `wingWords`, `guide-outline.ts`, `imported-readout.ts`), the
planer depth, the fins' depth, the rail lift. `formatInchesFraction` already reduces fractions and takes a denominator
(8 | 16 | 32): adding 64 gives `3/64"`, `1/8"`. `formatTenthMm` exists. `measureSlider`'s Metric `toMm` rounds to a whole
millimetre, so a 0.1 mm step needs it to round to the step's own grid when the step is under 1 mm (no slider today steps under
1 mm, so nothing else moves). The fit's own depth grid stays 1/16": `DEPTH_STEPS` and `DEPTH_STEP_MM` in `brd-bottom.ts` read
`BOTTOM_MARK_STEP_IN`, so the seed and refine choose names exactly as today; the polish then lands anywhere.

## House rules for the executor

- Never `cd` into a subfolder or worktree; use absolute paths and `git -C`. In a fresh worktree run `npx next typegen` before
  `tsc`. Browser runs use `PW_PORT=3143`. Commit messages in plain English for shapers (what changes on the board or the
  screen), sent with `git commit -F -`, ending with the Co-Authored-By line. Do not push. Leave the SUMMARY uncommitted for the
  orchestrator.
- Rule 1: every formula in `lib/geometry/`; the polish, the reach and the depth rounding work nothing out in a component.
  Rule 2: every figure through `units.ts` / `measure-display.ts`; no new 25.4 or 10.
- Tests type no expected figure. Expected values come from the app's own functions (`formatBottomDepth`, `formatMark`,
  `computeRailSectionOutput`, `domedDeckBandNudgeTop`, `fitBottomToBrd`, `measureBrdBottom`); inch inputs like `inchesToMm(3)`
  are fine. The founder's files are never copied, committed or named in a test (D-07).
- Record BASE first (`git -C <checkout> rev-parse HEAD`) on the SUMMARY's first lines. At the end,
  `git diff -U0 $BASE -- '*.test.ts' '*.spec.ts' ':!lib/geometry/rail-bands.test.ts' ':!e2e/rails-advanced.spec.ts' ':!lib/export/brd-fit-preview.test.ts' ':!components/bottom/bottom-copy.test.ts' ':!lib/geometry/bottom-print.test.ts' ':!e2e/bottom-metric.spec.ts' | grep -E '^-[^-]'`
  prints nothing. In those six files, quote every removed line in the SUMMARY with its reason; any other removed test line is a
  stop-and-ask. `git diff --quiet $BASE -- lib/geometry/__fixtures__ e2e/*-snapshots` succeeds. A changed vitest snapshot
  (`__snapshots__`) is allowed only where a Metric bottom depth now reads to 0.1 mm, each one quoted.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Opening a .brd ends with a polish at any value: the chosen bottom's sliders land where they fit closest, end to end through the real import</name>
  <files>lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, lib/models/design-snapshot.test.ts</files>
  <behavior>
    - polishBrdBottom on the app's own boards' exact sections (the test file's own `sectionsOf` and builder) for a Deep Single Concave, a Double Concave Exit, a Panel Vee, a Continuous Belly with a panel and a Teardrop: the cut names are unchanged, the fit's own score (`brdBottomScorer(...).valueOfSpecs`) is never higher than the grid answer's, and measureBrdBottom's largest is never larger (D-01)
    - A synthetic bottom written with off-grid numbers (e.g. a Deep Single Concave with Start inchesToMm(37.3), Deepest At inchesToMm(21.7), Depth inchesToMm(0.11), Off Rail inchesToMm(1.37)) read back from exact sections: the grid answer misses by some largest > 0; the polished answer's largest is strictly smaller (D-11)
    - Every polished value lies inside its control's own range: each station in [0, length], Depth in [1/16", 1/2"], each across mark inside BOTTOM_MARK_RANGES_IN; Start ≥ Deepest At ≥ End as stations from the tail; a flat section is returned untouched; Smoothness, Vee Lift and Closes to a point are the grid answer's (D-03)
    - A double's Off Stringer moves in the polish (a Double Concave Exit written at Off Stringer inchesToMm(0.25) on the Shortboard comes back closer to 0.25" than the grid's start value), and the refine's own mark lists are unchanged (D-01)
    - brdFitLook on an app-written file (brd-fit-preview.test.ts's `withFins` builder): the bottom's three names, the rails' order and every rail setting's Family and boxes equal those of the same look worked out with the polish skipped (export the grid look as `brdFitLookGrid` for this test only if no cleaner seam exists; name it in the SUMMARY), and the bottom's closeness is no larger (D-01, D-08)
    - A polished bottom survives the board reader (appended describe in design-snapshot.test.ts): off-step stations, depth and marks parse back key for key through the same path the belly-panel block uses (D-02)
  </behavior>
  <action>
Record BASE (house rules) and start the SUMMARY with it.

RED: append the new describes to `lib/geometry/brd-bottom.test.ts`, `lib/export/brd-fit-preview.test.ts` and
`lib/models/design-snapshot.test.ts` (append only) for the behaviour above, and watch them fail.

GREEN, `lib/geometry/brd-bottom.ts` (Rule 1, per D-01 and D-11):
- Inside `brdBottomScorer`, add `polish(specs)` and return it beside `refine` and `valueOfSpecs`. It is the prototype's `polish2`
  written properly (READ THIS FIRST §2): the field list (per cut that is not flat: Start, Deepest At, End as stations from the
  tail; Depth; the across marks: a single's Off Rail, a belly's and the Tri-Plane's Off Stringer, a double's Trough At, Off Rail
  and Off Stringer); a value vector in inches; `build(x)` storing each through `storeCutStation` or as the field, held to its
  range (stations to [0, length], Depth to [BOTTOM_MARK_STEP_IN, BOTTOM_DEPTH_RANGE_IN.max], marks to BOTTOM_MARK_RANGES_IN),
  then `keepStationsInOrder(key, spec, "deepest", board, "narrowest")`; scored by the scorer's own `value` with one trial buffer
  per section (all three cuts can change in one trial) and `prepare` reusing a cut's base while its marks are unchanged; the
  minimiser as measured: repeated coordinate steps, then neighbouring pairs, steps halved until each is under
  `BRD_BOTTOM_POLISH_STOP` (1/1000) of its first, then `BRD_BOTTOM_POLISH_RESTARTS` (2) Nelder-Mead restarts; any trial closer by
  more than NOISE is kept (no `BRD_BOTTOM_MOVE_GAIN_MM` bar, D-11).
- Export the first steps as named constants with their measured reason in the doc: `BRD_BOTTOM_POLISH_STATION_IN = 1`,
  `BRD_BOTTOM_POLISH_DEPTH_IN = 1 / 32`, `BRD_BOTTOM_POLISH_MARK_IN = 1 / 4`, and the two above.
- Export `polishBrdBottom(bottom, sections, board0): BoardBottom`: the scorer over `brdBottomBlends(sections)` on
  `rememberBoard(board0)`, polishing the three cuts and returning the bottom with them replaced (channels, wings untouched).
- Header doc: a step 6, "Polishes the chosen bottom" in a shaper's words, citing the founder's ruling ("let the fit land
  anywhere", D-11), what moves and what does not, why it runs once after the order is settled, and the §1 figures for four files.
  Step 4's "on BOTTOM's own slider steps" stays true of the grid search and says the polish then leaves them.

GREEN, `lib/export/brd-fit-preview.ts`:
- Factor the tail of `bottomOn` (the lift probe, the refit and the measure) into one helper both paths use, so a polished bottom
  is lifted and measured exactly as the grid one is.
- `brdFitLook` settles the look exactly as today (bottom-first, the narrowed re-read, the rails, the tail blend, the rails-first
  try and its choice); then, from the winning step only: the polished bottom (`polishBrdBottom(step.bottom.bottom,
  step.bottom.sections, brdFittedBottomBoard(first, fins))`), the helper, `fitBrdRails(railLines, onBoard(polished),
  winner.rails.settings)`, and `measureBrdRails` with the winner's own order, read, narrowed and blend. A look with no rails
  takes only the polished bottom. Update its doc (one paragraph: the polish runs last, and why).

One existing test is measured to break, and is re-pointed, never weakened: `brd-fit-preview.test.ts` "the rails are measured on
the same board: with the fins in place the finished rail at the tail is the one the bottom's cut shapes there" probes the
stations 1" to 12" for the two boards' bottoms parting; the polished Panel Vee's End moves past that span on the twin file, so
the bottoms part further up. Widen the probe to every inch from the tail to the tail cut's resolved Start on the twin's board
(read through `resolveCut`), keep the assertion, and quote the removed line.

Measure through the real import before committing: copy the prototype's `measure.mts` and `run.sh` idea into your own
scratchpad if needed, run the twelve files one after another from the main checkout as cwd with the worktree's tsconfig, and
compare with READ THIS FIRST §1's "Bottom planned" column (expect the same within a few hundredths; explain any difference).
Run the rails-first files (testLB) and confirm the order and names did not change.

GREEN gates; commit, e.g. "Opening a .brd now finishes by moving the bottom's sliders to wherever they fit closest, between
steps, so the bottom comes in closer to the file".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/brd-bottom.test.ts lib/export/brd-fit-preview.test.ts lib/export/brd-look.test.ts lib/models/brd-board.test.ts lib/models/design-snapshot.test.ts lib/geometry/brd-rails.test.ts lib/geometry/brd-fit.test.ts --maxWorkers=6 && npx tsc --noEmit</automated>
  </verify>
  <done>The polish exists, runs once after the order is settled, keeps every name and order, and the twelve files' bottom figures match §1's planned column; the round-trip suites pass; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: RAILS' Domed Deck Band reaches to 1" from the stringer, every reader follows, and the rails fit searches it</name>
  <files>lib/geometry/rail-bands.ts, lib/geometry/rail-bands.test.ts, lib/geometry/rail-dome-reach.test.ts, lib/geometry/design.ts, lib/geometry/brd-rails.ts, lib/geometry/brd-rails.test.ts, components/design/design-store.tsx, components/rails/rail-band-editor.tsx, components/rails/rail-controls.tsx, e2e/rails-advanced.spec.ts</files>
  <behavior>
    - domedDeckBandNudgeTop(halfWidth, boardThickness) puts the dome (2.4 x thickness + the top) at most 1" from the stringer and within one 1/16" step of it, on the 1/16" grid counted from -2"; on the Shortboard preset (phase16 `shortboard|asis|hard`) the nose's top is under 2" and the centre's over 2", each pin tail's under 2" (D-04)
    - railDomeNudgeTops(geometry, anchors, rails) reads foamHalfWidth at each of railAnchorStations' three stations and each section's boardThickness (D-04)
    - computeRailSectionOutput with a dome nudge anywhere in [-2", +2"] gives exactly the result the formula gave before (dome = max(2.4T + n, Deck Mark 3 + 1/16")); a nudge of +3" now gives 2.4T + 3"; a stored +20" is held at RAIL_DOME_NUDGE_MAX_IN; the Deck Mark 3 rule still wins at -2" (D-04)
    - Every reader follows a +3" centre dome on the Shortboard: the litres (summarizeDesign), the 3D board's section ring at the centre (boardSections), the finished rail and the .brd export text all differ from the +2" board's; with every nudge within +-2" every golden and litres pin is unchanged (D-05)
    - The rails fit never sets a dome nudge above domedDeckBandNudgeTop at that anchor on the app's own boards' round trips, and every existing brd-rails round trip passes unchanged (D-06)
    - Browser (rails-advanced.spec.ts, re-pointed): on the Shortboard the centre's dome slider max is the app's own top (over 2") and End lands the label's nudge there; the nose's max is under 2" (D-04)
  </behavior>
  <action>
RED: create `lib/geometry/rail-dome-reach.test.ts` for the behaviour above, building boards the way `bottom-belly-panel.test.ts`
does (`phase16Boards()`, `buildOutline`, `designSideProfile(fields, LIVE_DESIGN_RULES)`, `railAnchorStations`). Re-point the one
existing case that breaks, `rail-bands.test.ts` "a nudge of 5" as its window's end": for every nudge but the dome it stays; for
the dome, 5" now draws as 5" (inside the window) and 20" draws as `RAIL_DOME_NUDGE_MAX_IN` (READ THIS FIRST §3). Run, watch fail.

GREEN (per D-04, D-05, D-06):
- `lib/geometry/rail-bands.ts`: export `RAIL_DOME_STRINGER_ROOM_IN = 1` (the founder's "1" from the stringer") and
  `RAIL_DOME_NUDGE_MAX_IN` worked out from `WIDE_BOARD_WIDEPOINT_MAX_IN` (import from `./board-size`), doc'd as the engine's top.
  In `computeSectionInches` the dome nudge is clamped to [-RAIL_NUDGE_LIMIT_IN.domedDeckBand, RAIL_DOME_NUDGE_MAX_IN]; every other
  nudge exactly as now. `RAIL_NUDGE_LIMIT_IN.domedDeckBand` stays 2 and its doc says it is now the low end and the GUIDE's push
  window. Export `domedDeckBandNudgeTop(halfWidth: Mm, boardThickness: Mm): number` (inches, §3's rule) beside them. Update the
  header's HELD INPUTS bullet and the C15 comment (the ±2" became −2" to 1" from the stringer, D-04).
- `lib/geometry/design.ts`: `railDomeNudgeTops(geometry, anchors, rails): Record<RailSectionKey, number>`.
- `components/design/design-store.tsx`: a `railDomeNudgeTop` memo from `outlineGeometry`, `railAnchors` and `railsOnBottom`,
  added to the context type (with a doc line) and value. `components/rails/rail-band-editor.tsx` passes it to `RailControls`;
  `rail-controls.tsx` threads it to `RailSectionControls` and `nudgeRow` uses `{ min: -2, max: top }` for the dome only (the
  others unchanged). The thumb's value is held into the window (a saved dome above the top shows its thumb at the right end,
  the label still reading the true mark and nudge, §3); update the nudgeRow doc's "±2" for the Domed Deck Band".
- `lib/geometry/brd-rails.ts` `advancedMoves`: the dome's candidates run from -2" to `domedDeckBandNudgeTop(board.input.halfWidthAt(board.anchors[key]), board.foil[FOIL_KEY[key]])`,
  tried at 1, 2, 4, 8, 16, 32 and 64 sixteenths (the prototype's set); every other nudge as now. Update the header's "the dome
  to its limit" finding with the Egg's measured 2.07 to 1.67 mm.
- `e2e/rails-advanced.spec.ts`: re-point the dome window test (its `max` of 2 and its End to `+2"`): the centre's max now equals
  the app's own top for the preset that test opens (computed in the spec from the app's functions, or read as "over 2" and End
  lands the label on the slider's max"), the nose's max is under 2", and the Home/Deck Mark 3 half stays as it is.

Do not edit `lib/geometry/guide-rails.ts` (READ THIS FIRST §3, out of scope); if a GUIDE test fails, stop and report it.

GREEN gates, including `git diff --quiet $BASE -- lib/geometry/__fixtures__`. Re-run the twelve files and confirm the rails
column of §1. Commit, e.g. "RAILS' Domed Deck Band can now run the dome in to 1 inch from the stringer, and opening a .brd
searches that far".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/rail-dome-reach.test.ts lib/geometry/rail-bands.test.ts lib/geometry/brd-rails.test.ts lib/geometry/finished-rail.test.ts lib/geometry/guide-rails.test.ts lib/geometry/volume.test.ts lib/models/design-snapshot.test.ts lib/models/saved-board-open.test.ts --maxWorkers=6 && npx tsc --noEmit && PW_PORT=3143 npx playwright test e2e/rails-advanced.spec.ts --project=desktop --project=android</automated>
  </verify>
  <done>The dome slider reaches 1" from the stringer at each section (shorter where today's already passed it), saved boards and every golden are unchanged, every reader follows a wider dome, the rails fit searches it (the Egg 1.67 mm), the RAILS browser spec passes; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: BOTTOM's depths step and read in 1/64" (0.1 mm in Metric) everywhere a bottom depth is shown; the twelve files measured; the gates</name>
  <files>lib/geometry/units.ts, lib/geometry/units.test.ts, lib/geometry/measure-display.ts, lib/geometry/measure-display.test.ts, lib/geometry/bottom.ts, lib/geometry/bottom-print.ts, lib/geometry/bottom-print.test.ts, lib/export/brd-fit-preview.ts, components/bottom/bottom-controls.tsx, components/bottom/bottom-copy.ts, components/bottom/bottom-copy.test.ts, lib/geometry/bottom-depth-display.test.ts, e2e/bottom-depth-fine.spec.ts, e2e/bottom-metric.spec.ts, CLAUDE.md</files>
  <behavior>
    - formatInchesFraction(value, 64) reduces: inchesToMm(3/64) reads 3/64", inchesToMm(8/64) reads 1/8", inchesToMm(1 + 2/64) reads 1 1/32"; formatBottomDepth reads every 1/16" step exactly as formatMarkOrLess does in Imperial; a depth above nothing that rounds to 0 reads `<1/64"` (Imperial) and `<0.1 mm` (Metric); Metric reads to 0.1 mm (inchesToMm(1/8) reads 3.2 mm) (D-09)
    - measureSlider with a 0.1 mm Metric step: toMm lands on the 0.1 mm grid; every existing slider (steps of 1 mm or more) is unchanged (D-09, D-10)
    - The Depth row (a cut's and the channels') steps 1/64" (0.1 mm in Metric) and its readout is formatBottomDepth; the across rows step 1/16" (1 mm) and the station rows 1/2" (10 mm) as today (D-09, D-10)
    - Every bottom depth reader at an off-step depth (inchesToMm(0.11) and a polished bottom from Task 1's synthetic case): bottomDepthCell, bottomPrintLines' cut and channel sentences, the .brd fit sheet's bottom words read formatBottomDepth(Bare); a station, an across mark and DATA's layout marks at off-step values read exactly what the same reader gives the value rounded to its own step (D-02)
    - Browser (new spec, desktop and android): on BOTTOM pick a Deep Single Concave on the Shortboard; ArrowRight on its Depth moves it 1/64" (label from formatBottomDepth); in Metric it moves 0.1 mm; after a reload the off-1/16" depth reads the same (D-02, D-09)
  </behavior>
  <action>
RED: `lib/geometry/bottom-depth-display.test.ts` and the units/measure-display cases for the behaviour above; the new browser spec
`e2e/bottom-depth-fine.spec.ts` (copy `dismissStrips`, `openBottom` and the retried pick from `e2e/bottom-belly-panel.spec.ts`;
no `forgetOpenBoardOnEveryLoad`, it reloads on purpose; desktop and android, skip iphone; the Metric half sets the units the way
`e2e/bottom-metric.spec.ts` does). Watch them fail.

GREEN (per D-09, D-10, Rule 2):
- `lib/geometry/units.ts`: `formatInchesFraction`'s denominator type gains 64 (the rounding and reduction already serve it);
  add the 1/64" OrLess form and the 0.1 mm OrLess form (`<1/64"`, `<0.1`), and a tenth-of-a-millimetre snap beside
  `roundToWholeMm`, each doc'd with D-09.
- `lib/geometry/measure-display.ts`: `formatBottomDepth(value, system)` and `formatBottomDepthBare(value, system)` (the OrLess rule
  kept: "say <1/64 if it's not actually 0"); `measureSlider`'s Metric `toMm` snaps to the step's grid when `stepMm < 1`.
- `lib/geometry/bottom.ts`: `BOTTOM_DEPTH_STEP_IN = 1 / 64` and `BOTTOM_DEPTH_STEP_MM = 0.1` beside `BOTTOM_MARK_STEP_IN`, the
  block's doc updated (Depth 1/64" / 0.1 mm since D-09; the marks 1/16" / 1 mm; the stations 1/2" / 10 mm, D-10).
- `components/bottom/bottom-controls.tsx` `MarkRow`: field `depth` uses the depth step pair and `formatBottomDepth` (the cut's
  and the channels' Depth rows both); Vee Lift and every across row unchanged.
- `components/bottom/bottom-copy.ts` `bottomDepthCell`: `formatBottomDepthBare` (DATA and the printed sheet).
  `lib/geometry/bottom-print.ts`: the cut's and the channels' depth through `formatBottomDepth`; its header doc's sentence on
  depths. `lib/export/brd-fit-preview.ts`: the two bottom-depth words (§4). Before calling it done, grep
  `components/bottom`, `components/summary`, `lib/geometry/bottom*.ts` and `lib/export/brd-fit-preview.ts` for any other reader
  of a cut's or the channels' depth and list each in the SUMMARY (switched, or why not).
- `lib/geometry/brd-bottom.ts` is not changed by this task: its `DEPTH_STEPS` and `DEPTH_STEP_MM` keep reading
  `BOTTOM_MARK_STEP_IN`; add one comment line there saying the fit's grid stays 1/16" while the slider steps 1/64" (D-09), so
  the names are chosen as today.
- Re-point the expectations that pinned the old depth formatter: `components/bottom/bottom-copy.test.ts`'s `bottomDepthCell`
  cases, `lib/geometry/bottom-print.test.ts`'s depth figures, and `e2e/bottom-metric.spec.ts`'s Metric depth readouts (1/8" now
  reads 3.2 mm), each to `formatBottomDepth(Bare)`; every Imperial figure on a 1/16" step stays as it was.
- `CLAUDE.md` Rule 2: one sentence after the 50.8 mm bullet's paragraph: a BOTTOM depth (a cut's, the channels') reads to the
  nearest 1/64" as a reduced fraction and to 0.1 mm in Metric (the founder, 2026-11-16, quick 261116-tqs, D-09), the one mark
  family finer than the house rule, while BOTTOM's across marks stay 1/16" / 1 mm and its stations 1/2" / 10 mm.

The gates, each read to its exit line:
- `npx vitest run --maxWorkers=6` (the whole unit suite: every golden, litres pin, GUIDE test, .brd suite; brd-fit's
  "finishes the Longboard well inside a second" must still pass), `npx tsc --noEmit`, `npm run lint`.
- `PW_PORT=3143 npx playwright test e2e/bottom-depth-fine.spec.ts e2e/bottom-*.spec.ts e2e/phone-bottom.spec.ts e2e/summary-bottom-page.spec.ts e2e/rails-advanced.spec.ts e2e/rails-*.spec.ts --project=desktop --project=android`,
  then `PW_PORT=3143 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` (a changed baseline is a finding, never a
  re-record), then `npm run test:e2e:prod`.
- The house rules' two `git diff` gates against BASE.

Then measure D-07 through the real import, the twelve files one after another, today's main and the finished worktree back to
back on a quiet machine (the planner's figures were taken under load), with the seconds. Commit, e.g. "BOTTOM's depths now step
and read in 64ths of an inch, tenths of a millimetre in Metric".

SUMMARY in plain English for the founder: what the polish does to an opened board (names as today, sliders between steps,
shown rounded); the twelve-file table, bottom and rails, before and after, with seconds; why it stops where it does on each file
(§2's last bullet); the dome: the slider's new reach on the stock boards, the Egg's rails, the saved-dome note and the GUIDE
question (§3); the depth display with an Imperial and a Metric example; every re-pointed test line with its reason. The on-step
comparison is not needed (D-11).
  </action>
  <verify>
    <automated>npx vitest run --maxWorkers=6 && npx tsc --noEmit && npm run lint && PW_PORT=3143 npx playwright test e2e/bottom-depth-fine.spec.ts e2e/bottom-metric.spec.ts e2e/rails-advanced.spec.ts --project=desktop --project=android && git diff --quiet "$(head -20 .planning/quick/261116-tqs-tighten-the-brd-import-s-bottom-fit-and-/261116-tqs-SUMMARY.md | grep -oE '[0-9a-f]{40}' | head -1)" -- lib/geometry/__fixtures__ e2e/*-snapshots</automated>
    <human-check>The founder opens the Fryer and the Round Tail on the live site after the push: the bottom block's widest miss reads about half a millimetre; BOTTOM shows the depths in 64ths; on the Egg, RAILS' centre Domed Deck Band reads a nudge of about +3", past the old +2" end.</human-check>
  </verify>
  <done>Depths step and read 1/64" / 0.1 mm everywhere a bottom depth shows, across and along steps unchanged, CLAUDE.md records it; the whole unit suite, tsc, lint, the BOTTOM and RAILS browser specs, the desktop baselines and e2e:prod pass; no fixture or baseline changed; the twelve-file table with seconds is in the SUMMARY; one commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| a `.brd` file → `polishBrdBottom` | any file's sections drive the polish's search |
| stored board → `computeSectionInches` | a saved board, a board file or the kept open board can carry any dome nudge |
| stored board → BOTTOM's readers | a polished or hand-edited board can carry any off-step depth, station or mark |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-tqs-01 | Denial of service | the polish on a hostile file | medium | mitigate | Bounded: a fixed number of rounds, steps halved to a thousandth then stop, two Nelder-Mead restarts of at most 400 x n trials each, n at most 21 fields; measured 0.05 to 1.5 s on the twelve files; it runs in the existing background worker (`brd-look.worker.ts`), so the page stays live |
| T-tqs-02 | Tampering | dome nudge in a stored board | low | mitigate | The engine clamps it to [-2", RAIL_DOME_NUDGE_MAX_IN]; a dome past the section's half-width is a case the litres and 3D sections already handle near the tips today; Task 2 tests a +20" nudge |
| T-tqs-03 | Tampering | off-step values in a stored board | low | accept | The snapshot schema already bounds each cut field; the polish only stores values inside each control's own range; readers round for display (D-02) |
| T-tqs-04 | Repudiation | goldens, litres pins, baselines | medium | mitigate | No fixture or baseline re-recorded (`git diff --quiet` gate); removed test lines allowed only in six named files, each quoted with its reason |
</threat_model>

<verification>
- `npx vitest run --maxWorkers=6` green; `npx tsc --noEmit` and `npm run lint` clean.
- The new browser spec and the BOTTOM and RAILS specs green on desktop and android; `desktop-baseline.spec.ts` and `test:e2e:prod` green.
- The house rules' two `git diff` gates against BASE hold.
- The SUMMARY's twelve-file table matches READ THIS FIRST §1 within a few hundredths, with names and orders unchanged.
</verification>

<success_criteria>
- Opening the Fryer reads its bottom about 0.49 mm off at the widest (1.04 today), the Round Tail about 0.55 (0.95), with every cut name as today.
- On the Shortboard, RAILS' centre Domed Deck Band slider runs past +2" to 1" from the stringer; its nose slider stops at +1 7/16".
- BOTTOM's Depth slider steps 1/64" and DATA reads `7/64"`-style figures; Metric reads `3.2 mm`.
- No saved board, golden or litres figure changes.
</success_criteria>

<output>
Create `.planning/quick/261116-tqs-tighten-the-brd-import-s-bottom-fit-and-/261116-tqs-SUMMARY.md` when done (do not commit it).
</output>
