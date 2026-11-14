---
phase: 14-realistic-surfboard-flow
fixed_at: 2026-10-02T23:10:00Z
review_path: .planning/phases/14-realistic-surfboard-flow/14-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 14: Code Review Fix Report

**Fixed at:** 2026-10-02T23:10:00Z
**Source review:** .planning/phases/14-realistic-surfboard-flow/14-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (WR-01, WR-02 part 1, IN-01, IN-02, IN-03, IN-04, IN-05, IN-07). The orchestrator gave an exact design for each.
- Fixed: 8, one commit each, on `surfboard-flow` in the main checkout (no worktree).
- Skipped: 0.
- Out of scope by instruction, and not touched: WR-02 part 2 (whether a board with a reverse-rocker tail should fit at all is the founder's call), IN-06 and IN-08.

**Where verification ran:** the main checkout at `/Users/kontoes/Code/shaper`, after the last commit (`fe02ad0`):
- `npx vitest run`: 103 files, 3882 passed, 2 skipped, 0 failed. No timeouts, so no file needed a re-run.
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- `PW_PORT=3152 npx playwright test e2e/rocker-cut.spec.ts e2e/rocker-blanks.spec.ts e2e/touch-sizing.spec.ts e2e/desktop-baseline.spec.ts`, all three projects: 137 passed, 34 skipped (the specs' own per-project skips), 0 failed, in 4.2 minutes. No snapshot was updated.

These files are byte-identical to `db0692c`: `lib/geometry/phase11-foil.test.ts`, `lib/models/design-snapshot.test.ts`, `scripts/extract-phase14-today-golden.ts`, every fixture under `lib/geometry/__fixtures__/`, `package.json`, `package-lock.json`, and every `.planning` file except this log.

## Fixed Issues

### WR-01: The two Thinning Starts sliders have no accessible name

**Files modified:** `components/ui/slider.tsx`, `components/design/slider-row.tsx`, `components/design/slider-row.test.ts`, `components/rocker/rocker-controls.tsx`, `lib/geometry/blank-reasons.ts`, `lib/geometry/blank-reasons.test.ts`, `e2e/rocker-cut.spec.ts`
**Commit:** `ea28e7e`

**Applied fix:**
- **The hand-off.** In the installed Base UI (1.7.0), `SliderThumbProps` takes `aria-label` and `aria-valuetext` and forwards both to the thumb's hidden range input. That input is the element with the slider role (`node_modules/@base-ui/react/slider/thumb/SliderThumb.d.ts` and `SliderThumb.js`). The app's `Slider` wrapper sends its own props to the root, not the thumb, so I gave it two thumb-only props, `thumbAriaLabel` and `thumbAriaValueText`, which pass straight through to `SliderPrimitive.Thumb`.
- **`SliderRow`.** It gained the two optional props named in the design, `sliderLabel?: string` and `sliderValueText?: string`, and hands them on to the wrapper.
- **The two rows.** In `rocker-controls.tsx`, the Thinning Starts rows pass `sliderLabel={thinningStartSliderLabel(end)}` and `sliderValueText={formatThinningStart(tip.fromTip, system)}`. The new `thinningStartSliderLabel(end)` in `blank-reasons.ts` returns `Nose Thinning Starts` / `Tail Thinning Starts`. It sits there because the row's own comment says all of its copy comes through `blank-reasons.ts`, and `thinningStartRowLabel` now builds its label from it.
- **No other slider is named.**

**Verified:**
- I rendered six representative rows to HTML before the change and again after it, including a row with a `null` action. The output was byte-identical (`cmp`), with or without the new props absent.
- The existing server-render pin in `slider-row.test.ts` passes unedited.
- New unit cases cover four things: both props land on the range input and only there; each prop works on its own; a row without them carries neither attribute; and passing them as `undefined` renders the same as leaving them out. `blank-reasons.test.ts` covers the new label helper.
- New browser test in `rocker-cut.spec.ts` (Metric), on iPhone, Android and desktop. For each tip, `getByRole("slider", { name: "<Tip> Thinning Starts", exact: true })` finds exactly one element, inside that tip's own row. On Automatic and again after one drag, its `aria-valuetext` equals the distance after ` — ` in the row's label.

### WR-02 (part 1 only): Remove This Blank must leave a board whose drawing agrees with its numbers

**Files modified:** `lib/geometry/board-profile.ts`, `lib/geometry/board-profile.test.ts`
**Commit:** `40cb76e`

**Applied fix:**
- **The clamp.** `handSetFromProfile` still rebases each lift on the centre. It then pulls the lift into `ROCKER_LIFT_RANGE_IN`, with both ends converted through `inchesToMm` from `units.ts`. A negative lift becomes the range's minimum, 0. For symmetry the maximum (9") is applied too; no realistic board comes near it.
- **The doc comment.** It now says why, in one sentence: the hand-set rocker fixes the centre at 0 and cannot keep a tip below it. The lead line also notes the one case where a station number now moves.
- **Not changed:** `boardOnBlank`, the fit check and Automatic.

**Verified:**
- **Probe first.** A scratch probe reproduced the review exactly. Default 6'0" outline, Arctic Foam 7'9" SBF, 1 1/4" centre, judged placement 0. The seeded lifts were tail tip −0.2117" and tail @ 12" −0.1679". The old seed drew the centre at +0.2117" while the readouts said 0.
- **The new describe block** in `board-profile.test.ts` builds that board from the catalogue. The blank comes from `readSeedCatalog`. The placement comes from `judgeBlank` under the default fit rules. Default tips, Pin deck, Automatic. Three tests:
  - The block first asserts that the tail-tip station rocker sits below the centre (the anti-vacuous guard).
  - Every seeded lift is inside the range, and the tail tip is exactly the minimum.
  - The hand-set profile built from the seed reads exactly those five numbers (`toBe`), both from `stationRocker` and from `rockerAt` at the five stations.
- **Fails on the old code.** With `board-profile.ts` stashed, two of the three new tests fail.
- **Nothing else moved.** The existing "Remove This Blank keeps the five stations exactly" cases all still pass, so no preset or default board was affected.

### IN-01: The saved-boards reports print their maxima too coarsely

**Files modified:** `lib/geometry/before-after.ts`, `lib/geometry/before-after.test.ts`
**Commit:** `122fc2c`

**Applied fix:**
- A private `reportInches(mm)` prints `` `${mmToInches(mm(x)).toFixed(3)}"` ``. `movesReportLines` uses it for the largest station move and `tipsReportLines` for the largest 12" rise.
- The "more than 1/16" / more than 1/32"" counts are unchanged. The now-unused `formatMark` import is gone from the module.

**Verified:**
- The test patterns now expect `\d+\.\d{3}"`.
- The "carries the report's own numbers" tests compose the expected text from the same `mmToInches(...).toFixed(3)` conversion, never a typed number.
- A new case uses a 0.015" move. Its line contains the decimal value and does not contain `formatMark`'s `0"`; a probe confirmed `formatMark` prints `0"` for that size. The two counts still read 0.

### IN-02: Prove that ↺ Reset Fine-Tune leaves a start alone, in the browser

**Files modified:** `e2e/rocker-cut.spec.ts`
**Commit:** `7407f0d`

**Applied fix:** a new test:
1. Pick the first fitting blank.
2. Set the tail's Thinning Start by hand (one step right) and record its label.
3. Confirm ↺ Reset Fine-Tune is inert (`aria-disabled="true"`), then nudge Nose @ 12" one step down. Down keeps the board in its blank, as the existing tweak test explains. The button becomes live.
4. Press it.
5. Assert that the tweak reads `No tweak` again, the `Tail Thinning Starts — …` label is unchanged, and the tail's Automatic button is still `aria-pressed="false"`, not `aria-disabled`, and enabled.

**Verified:**
- Passes on iPhone, Android and desktop.
- **Mutation check:** I temporarily made `resetFineTune` drop `tailThinningStart`, and the test failed on the label assertion. The store change was reverted with `git checkout` and never committed.

### IN-03: Two assertions that pass whatever they name

**Files modified:** `lib/geometry/tip-taper.test.ts`, `e2e/rocker-blanks.spec.ts`
**Commit:** `9637c52`

**Applied fix:**
- **The arity test.** The test whose only assertion was `expect(automaticStart.length).toBe(3)` is removed. A one-line comment points at the real proof, `tip-flow.test.ts`'s stress-set comparison.
- **The two DATASHEET tests,** Imperial and Metric. Each first presses End on the tail's Thinning Starts slider. That sets the start by hand at the far end and makes the two starts differ, which the test asserts. Then each test checks three things:
  - The drawing's accessible name gives each tip its own sidebar distance. It is retried with `toPass`, so a render lag cannot flake it.
  - The From tip row reads as before.
  - Read against the sheet's own header row, the cell in the NOSE TIP column is the nose distance and the cell in the TAIL TIP column is the tail distance. The column indexes come from the header; in Metric the ` cm` is dropped for the bare cells.
- Local helpers (`startLabel`, `distanceOf`, `tipColumns`, `tailStartToFarEnd`) were added to this spec, following the repo's per-spec helper pattern.

**Verified:**
- Both tests pass on all three projects.
- **Mutation check:** I temporarily swapped the nose and tail cells in `rocker-datasheet.tsx`, and both tests failed. Reverted with `git checkout`, never committed.
- `tip-taper.test.ts` passes.

### IN-04: Two preset sites bypass the shared helper

**Files modified:** `scripts/extract-phase14-preset-figures.ts`, `lib/geometry/phase14-preset-figures.test.ts`, `lib/geometry/thinning-start-paths.test.ts`
**Commit:** `93745ea`

**Applied fix:**
- Both preset sites now spread `...thinningStartsOf(fields.blank)` into the board's blank input. The generator's header notes it.
- `SITES` in `thinning-start-paths.test.ts` now also lists `./before-after.ts` and `../../scripts/extract-phase14-preset-figures.ts`.
- `scripts/extract-phase14-today-golden.ts` and its fixture are not touched.

**Verified:**
- I re-ran the generator for both steps as its header documents:
  - `--step curves` changed only the `provenance` and `step` lines. Every figure was identical, which is expected now that the live code is the tips release.
  - `--step tips` then restored the file, and `git diff --exit-code lib/geometry/__fixtures__/phase14-preset-figures.json` was clean.
- The two edited test files pass.

### IN-05: Three stale comments and one dead branch

**Files modified:** `lib/geometry/blank-fit.ts`, `components/rocker/rocker-datasheet.tsx`, `lib/geometry/tip-taper.ts`, `lib/geometry/tip-taper.test.ts`
**Commit:** `646f88c`

**Applied fix:**
- **`blank-fit.ts`.** The comment now says that off the foam only the slope reads 0, and that the planer cut reads `0 − drop`, a negative thickness.
- **The DATASHEET header.** It now names its four labelled blocks (BLANK, YOUR BOARD, FOAM OFF, THINNING STARTS) and their nine rows (3 + 3 + 2 + 1) under the station header. The run-on "…; and FOAM OFF … ; and THINNING STARTS" list is fixed. See the deviation below.
- **`pullThinningStart`.** It now returns the range's minimum for every non-finite value: `NaN`, `Infinity` and `-Infinity` alike, via `!Number.isFinite`. Its doc comment says so, and notes that `tipView` already treats such a value as Automatic.

**Verified:**
- A new `tip-taper.test.ts` case covers all three non-finite values. It fails with `tip-taper.ts` stashed, since `Infinity` used to read the maximum.
- `tip-taper`, `blank-fit` and `tip-flow` pass.

### IN-07: A falsy `hintAction`

**Files modified:** `components/design/slider-row.tsx`, `components/design/slider-row.test.ts`
**Commit:** `fe02ad0`

**Applied fix:** `const hasAction = hintAction !== undefined && hintAction !== null && hintAction !== false;`, and the right end of the hint line is now `hasAction ? hintAction : <span>{rightHint}</span>`. The prop's doc comment lists `false` as "no action".

**Verified:**
- **A new rendered case:** a row with `hintAction: false` gets today's hint-line classes and its right hint, and renders exactly like a row with no action. With no hints at all, it draws no hint line.
- **Fails on the old code.** With `slider-row.tsx` stashed, the new case and the two updated pins fail.
- **Every other row unchanged.** The six-row HTML baseline from WR-01 is still byte-identical after this change.
- **The two updated pins:** see the deviation below.

## Deviation to review

1. **IN-05, the DATASHEET header's count was already right as a count.** Counted from the JSX, there are four labelled groups and nine data rows (3 + 3 + 2 + 1), which is what "four blocks, nine rows" said. The stale part was the wording around it: an unexplained count and a doubled "and" that read as if THINNING STARTS had been bolted on. I did not change the numbers to something wrong. I made the comment say exactly what it counts: the four blocks by name, the nine rows and the 3 + 3 + 2 + 1 split, all under the station header.
2. **IN-07 edits two existing source-text pins in `slider-row.test.ts`.** The design said to add the `false` case to `slider-row.test.ts`. Two existing assertions in the "hintAction slot" block were regexes matching the old source text word for word: `hintAction !== null;` and `hintAction ?? <span>{rightHint}</span>`. They cannot pass against the fix, so they now match the new wording. They pin the same intent. The server-render pin that WR-01 was told to keep unedited (`renders a row without hintAction exactly as before`) is untouched, and it still passes after every commit.
3. **WR-01 adds a helper.** `thinningStartSliderLabel(end)` is new in `lib/geometry/blank-reasons.ts`, and `thinningStartRowLabel` now builds its label from it. The design gave only the names. I used a helper because the component's own contract is that all of its copy comes through `blank-reasons.ts`. The browser test types the two names literally, so it pins the product names independently of the helper.
4. **WR-02 also caps at the top of the range.** The design asked for a pull into `ROCKER_LIFT_RANGE_IN`. That has two ends, so lifts above 9" are capped too. No board in the catalogue or the presets comes near 9", and every existing Remove This Blank case is unchanged.
5. **The comment beside `removeBlank` in `components/design/design-store.tsx`** still says "the five station numbers do not move when the blank goes". That is now true except for a tip below the centre. I left it, because the store was outside this pass's file list and its handler source is pinned by `design-store.test.ts`. A one-line comment follow-up there would make it exact.

---

_Fixed: 2026-10-02T23:10:00Z_
_Fixer: Claude Opus 5.5 (gsd-code-fixer)_
_Iteration: 1_

## Orchestrator ruling (2026-10-02)

Re-run by the orchestrator on the main checkout after the last fix commit (`fe02ad0`): `npm run build` passes, `npx vitest run` 103 files / 3,882 passed / 2 skipped, `npx tsc --noEmit` and `npm run lint` clean; the Phase 11 guard tests, the pin's generator and fixtures, the desktop baselines, `package.json`, the lockfile, `drizzle/` and `lib/db/schema.ts` are byte-identical to the review's base. The full browser suite runs after this log is committed.

- **Deviations 1 to 4 are accepted.** The DATASHEET header count was already right (1); two source-text assertions follow the new wording with the same intent (2); `thinningStartSliderLabel` keeps the row's wording in `blank-reasons.ts` beside the rest (3); the seeded lifts are held to the hand-set slider's own range at both ends (4).
- **Deviation 5** (the store's comment above Remove This Blank) is corrected by the orchestrator in its own one-line commit.
- **WR-02 part 2 is the founder's decision** and goes to the go-live 2 checkpoint with a picture: a very thin board (a 1 to 1 1/4" centre) on a thick blank now fits (D-20) and, under Pin deck, its tail can sit below its own centre. Realistic centres are not affected (at 1 1/2" the dip is 0.038", at 2" there is none).
- **WR-01's wider gap** (no slider in the app has a spoken name; this pass names only the two new ones) is recorded as a pending todo for after the showing.
- **IN-06** (the one real-board litres check now sits 3.30% off the maker's figure, from 2.17%, inside its 10% tolerance) is shown to the founder beside the hand-set board's litres. **IN-08**: the rollback target after go-live 2 is the go-live 1 deployment (merge `b3c2d9a`, whose second parent is the commit 14-05's rollback test ran and passed on), so the reader that would open a later board is exactly the one that test proved.
