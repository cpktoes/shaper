---
phase: 14-realistic-surfboard-flow
plan: 11
subsystem: geometry-words + shared slider row
status: complete
tags: [thinning-starts, copy, units, slider-row, R6]
requires:
  - 14-08 (lib/geometry/tip-taper.ts: TipView, TipEnd, TipFlag, thinningStartRange, THINNING_START_MIN_MM)
provides:
  - formatThinningStart, formatThinningStartBare, thinningStartSlider, thinningStartHint
  - thinningStartLine, fineTuneSourceHint, thinningStartRowLabel, automaticButtonLabel
  - thinningMarksSentence, thicknessIntroWithBlank
  - SliderRowProps.hintAction
  - CLAUDE.md Rule 2 names the Thinning Start as a centimetre (dims) reading
affects:
  - 14-14 (the THICKNESS rows), 14-15 (viewer + DATASHEET), 14-16 (order form) import these names
tech-stack:
  added: []
  patterns:
    - word functions take the per-tip view's SHAPE (Pick<TipView, ...>) so they test without the profile
    - a server render (react-dom/server) in a node-environment test proves a row's markup unchanged
key-files:
  created: []
  modified:
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/design/slider-row.tsx
    - components/design/slider-row.test.ts
    - CLAUDE.md
decisions:
  - "A Thinning Start reads through formatDim/formatDimBare (cm to one decimal in Metric), so a 12-inch start prints the 12-inch station's own label (D-22)"
  - "SliderRow treats a null hintAction as absent (const hasAction), so a caller passing null keeps today's hint line exactly"
metrics:
  duration: ~12 min
  completed: 2026-10-03
  tasks: 3
  files: 5
actuals:
  tokens: 7300
  tasks: 3
  commits: 5
---

# Phase 14 Plan 11: The Thinning Starts words, slider and button slot Summary

Every word and number the coming Thinning Starts rows show is now written once, in
`lib/geometry/blank-reasons.ts`, and tested in Imperial and Metric. That covers the row label with its
distance, the three hint states, the two too-close sentences, the 12" row's "From the tip taper", the
drawing's description of the two dashed marks and THICKNESS's new opening line. The slider's range is
there too: half an inch or one centimetre a step, tip on the left and centre on the right. The app's
shared slider row gains one optional slot for the Automatic button, and every existing row looks
exactly as it did. CLAUDE.md's unit rule now says a start reads in centimetres in Metric.

## What a shaper will see (once 14-14 wires the rows)

- A start reads like the 12" station beside it: `12"` / `30.5 cm`, `25 1/2"` / `64.8 cm`, and never `305 mm`.
- The line under the slider says one of three things. `Picked automatically` means Automatic at 12".
  `Automatic: 12" is too short` (in Metric, `Automatic: 30.5 cm is too short`) means Automatic had to
  start further in. `Automatic would be 25 1/2"` shows on a start set by hand.
- A start set by hand too near the tip gets one of two sentences. Either it says where the board is
  thinnest and under what tip setting, or it says where the sharp bend is. Both say where Automatic
  would start instead. There is no sentence on Automatic, on a tip that runs down fine, or when the
  thinnest point prints the same as the tip setting.

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 | A start's distance, its hint and its slider, both systems (tracer) | 565e929 |
| 2 | The too-close sentences, the 12" row's source, the labels, the new THICKNESS line (TDD) | afff0df (RED), db0e32f (GREEN) |
| 3 | `SliderRow`'s `hintAction`, and CLAUDE.md Rule 2 names the start (TDD) | 1f58a2f (RED), 4757a56 (GREEN) |

Tracer gate: Task 1's verify (`vitest blank-reasons` + `tsc --noEmit`) was run again after its commit
and passed. Following the orchestrator's ruling 10, it did not stop for a human check.

## Exported names (later plans import these exactly)

From `lib/geometry/blank-reasons.ts`:
- `formatThinningStart(start: Mm, system: UnitsSystem): string`
- `formatThinningStartBare(start: Mm, system: UnitsSystem): string`
- `thinningStartSlider(view: Pick<TipView, "fromTip" | "range">, system: UnitsSystem): MeasureSliderView`
- `thinningStartHint(view: Pick<TipView, "automatic" | "reachesStation" | "automaticStart">, system: UnitsSystem): string`
- `thinningStartLine(end: TipEnd, view: Pick<TipView, "fromTip" | "automaticStart" | "flag">, tipSetting: Mm, system: UnitsSystem): string | null`
- `fineTuneSourceHint(reachesStation: boolean, derived: Mm, system: UnitsSystem): string`
- `thinningStartRowLabel(end: TipEnd, view: Pick<TipView, "fromTip">, system: UnitsSystem): string`
- `automaticButtonLabel(end: TipEnd): string`
- `thinningMarksSentence(noseFromTip: Mm, tailFromTip: Mm, system: UnitsSystem): string`
- `thicknessIntroWithBlank(system: UnitsSystem): string`

From `components/design/slider-row.tsx`: `SliderRowProps.hintAction?: ReactNode` (a prop, not an export,
so the file still exports exactly `SliderRow` and `sliderValue`).

Describes: `Thinning Starts — the distance, the hint and the slider (D-11, D-22)`; `Thinning Starts — the
sentences (D-05, D-07, D-21)`; `SliderRow's hintAction slot (14-UI-SPEC §1)`.

## Verification

- `npx vitest run lib/geometry/blank-reasons.test.ts components/design/slider-row.test.ts`: 144 + 11 pass.
- Full unit suite: 101 files, 3810 passed, 2 skipped (both skips were already there).
- `npx tsc --noEmit` (after `npx next typegen`) exits 0. `npm run lint` exits 0.
- Acceptance greps: the 4 Task 1 exports count 4. `The board is thinnest`, `starts with a sharp bend` and
  the intro phrase each count 1. `hintAction` appears in `slider-row.tsx` 5 times. `Thinning Start`
  appears in `CLAUDE.md` once. `25.4` and `/ 10` appear 0 times in this plan's diff of
  `blank-reasons.ts` and `slider-row.tsx`.
- The slider-row exports test and the ROCKER allowlist (one raw `<Slider>`) pass unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test precision on the Imperial slider ends**
- **Found during:** Task 1.
- **Issue:** `mmToInches(inchesToMm(6))` comes back as `5.999…`. An exact comparison against it failed,
  even though the slider's end really sits on 6 exactly, because the grid rounding snaps it there.
- **Fix:** the computed comparison uses `toBeCloseTo`. The exact `6` / `30` checks stay. This shows the
  half-inch grid rounding works.
- **Commit:** 565e929

**2. [Rule 2 - Correctness] A null `hintAction` counts as absent**
- **Found during:** Task 3.
- **Issue:** the plan's `hintAction ?? <span>{rightHint}</span>` treats `null` as absent, but a plain
  "is present" class test would still add `items-center gap-2` for a caller that passes `null`, which
  changes that row's look.
- **Fix:** `const hasAction = hintAction !== undefined && hintAction !== null;` decides the class. A test
  proves a `null` action renders today's line, right-hand hint and all.
- **Commit:** 4757a56

**3. Copy kept out of doc comments so the acceptance greps stay at 1**
- The `thinningStartLine` doc comment first quoted both sentences word for word, which made each
  acceptance grep count 2. It now describes the sentences and points at the UI-SPEC table and the
  tests, which pin the exact wording.

Beyond the plan's source-contract assertions, Task 3 also server-renders `SliderRow`. The render
proves, from the markup a browser gets, that a row without the slot draws today's hint line byte for
byte. No new package was added: `react-dom/server` is already used this way in
`lib/error-pages/wiring.test.ts`.

Edge held out as planned (backstop, plan 14-18 rehearsal walk): in Metric the slider's ends sit up to
7.6 mm inside the Imperial range, and an Automatic start can sit off the 10 mm grid. Still to check:
how both ends look in Metric, and that the arrow keys work when the thumb starts off the grid.

## Known Stubs

None. Nothing calls these functions yet. The rows that will call them come in 14-14, 14-15 and 14-16
by design.

## Threat Flags

None. These are pure word functions, plus one additive prop on a component.

## Self-Check: PASSED

- FOUND: lib/geometry/blank-reasons.ts, lib/geometry/blank-reasons.test.ts, components/design/slider-row.tsx,
  components/design/slider-row.test.ts, CLAUDE.md
- FOUND commits: 565e929, afff0df, db0e32f, 1f58a2f, 4757a56
