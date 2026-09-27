---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 07
subsystem: blank fit check, reason lines, ROCKER flag
status: complete
tags: [fit-check, planer-max-depth, one-pass-at-placement, foil-runs-out, reason-line, D-15, D-18]
requires:
  - "12-01: bottomOffAt / thicknessAt on BoardOnBlank, the two-surface thin rule, DEFAULT_BLANK_CUT"
  - "12-03: FitSettings = { extraLength, planerMaxDepth, widthMargin }, useBoardCut(), the printed-centre floor"
provides:
  - "fitAt(onBlank, halfWidthAt, widePointStation, rules: Pick<FitSettings, 'widthMargin' | 'planerMaxDepth'>)"
  - "D-15: a thin shortfall at L/2 of planerMaxDepth - bottomOffAt(L/2), wherever the board sits"
  - "MIN_FOIL_THICKNESS_MM (= inchesToMm(1/8)), exported from lib/geometry/blank-fit.ts"
  - "BlankShortfall.kind: 'thin' | 'wide' | 'runsOut'"
  - "formatShortfall(shortfall, board: { length, widePointStation, centerThickness }, system) with the runs-out sentence"
  - "useBlankList().board carries centerThickness"
affects:
  - "12-05 (lib/blanks/preset-blanks.test.ts: one line changed here, see Deviations)"
  - "12-06 (scripts/check-saved-boards.ts: judgeBlank / listBlanks / nearestFittingPlacement keep their signatures; a direct fitAt call must pass the settings object)"
  - "12-09 (every literal written here already states its cut)"
tech-stack:
  added: []
  patterns:
    - "A per-placement rule is one more `consider(...)` in fitAt, so the list, the rescue and the flag all pick it up through the one function"
key-files:
  created: []
  modified:
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/rocker/use-blank-list.ts
    - components/rocker/blank-flag.tsx
    - lib/blanks/preset-blanks.test.ts
key-decisions:
  - "The D-18 runs-out amount is checked at every fit sample (every 1/4\" tip to tip, the five stations and the widepoint), tip windows included; a 1/64\" grid finds nothing the 1/4\" samples miss over 12-01's 1,635-board population"
  - "The \"from 2\\\" up\" property is asserted as \"no listed blank FAILS for running out\": a fitting verdict's `worst` is its tightest spare, and that can be the thinnest spot (Midlength on Arctic Foam 7'9\" SBF at 2\", 0.100\" to spare)"
metrics:
  duration: "about 20 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 8
actuals:
  tokens: 7200
  tasks: 2
  commits: 3
---

# Phase 12 Plan 07: One pass under the center where the board sits, and the foil that runs out, Summary

The fit check now holds one planer pass under the board's center wherever the board sits on its
blank. It also refuses a board that would be under 1/8" thick anywhere, and says the blank is too
thick for that center instead of calling it too thin.

## What a shaper sees

- **Slide a board toward a thinner end of its blank.** If less than one Planer Max Depth would come
  off the bottom at its center, the flag reads **"Doesn't fit at this placement"** with
  **"{amount} too thin at the center."** This is Phase 11's F2 wording, and no new sentence was
  added. **Move to Where It Fits** slides the board back to the nearest spot where a full pass
  survives. The list still hides a blank by its printed center (12-03). This is the same rule,
  checked where the board actually sits.
- **Type a very thin center into a thick blank.** A board that would be less than 1/8" (3 mm)
  thick somewhere no longer counts as fitting. Its line reads **"Less than 1/8" would be left
  {where} — this blank is too thick for a {center} center"** (Metric: "Less than 3 mm …").
  - The list row shows the line bare. The flag adds a full stop.
  - {where} uses the same place names as every other reason line: at the tail tip, 12" from the
    nose, at the center, and so on.
- **Ordinary boards are unaffected.** At centers of 2" and above, no listed blank is ruled out for
  running out, for the default board or any of the four presets. A tip set to exactly 1/8" (the
  tip sliders' lowest setting) still fits.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | One planer pass under the center where the board sits (tracer) | `018972c` | blank-fit.ts, blank-fit.test.ts, blank-flag.tsx, preset-blanks.test.ts (one line) |
| 2 | RED: a board under 1/8" anywhere must not fit, and its sentence | `7258626` | blank-fit.test.ts, blank-reasons.test.ts |
| 2 | GREEN: the runs-out check, its kind and its sentence | `830c0bf` | blank.ts, blank-fit.ts, blank-fit.test.ts, blank-reasons.ts, use-blank-list.ts, blank-flag.tsx |

TDD gate: `test(12-07)` (`7258626`) comes before `feat(12-07)` (`830c0bf`). RED failed 8 tests as
expected: six reason-line cases and two fit cases. The sweep "no listed blank is ruled out for
running out" passed during RED only because the check did not exist yet. No refactor commit.

## The founder's question: 12-01's 528 thin tip windows under D-18

12-01 found that in 528 of 1,635 boards, the parallel cut leaves less foam than the tip setting
somewhere inside a tip window. Those boards were every pickable blank, 2" shorter than the blank,
at 2 1/4"–3" centers, default tips, slid to either end and centered.

I rebuilt exactly that population in a scratch probe and got 1,635 boards and 528 thin-window
cases again. Then I asked D-18's question of each case: does the board go under 1/8" anywhere?
The population has no outline, so width is not judged.

| Center | Thin-window cases | D-18 now rejects | Still count as fitting |
|--------|-------------------|------------------|------------------------|
| 2 1/4" | 258 | 6 | 252 |
| 2 1/2" | 138 | 0 | 138 |
| 2 3/4" | 85 | 0 | 85 |
| 3" | 47 | 0 | 47 |
| **All** | **528** | **6** | **522** |

- **The 6 D-18 rejects**, all at a 2 1/4" center:
  - US Blanks 9'3"A slid toward the nose: 2.24 mm left.
  - US Blanks 9'3"AX slid toward the nose: 2.13 mm left. This is 12-01's "worst, 5.8 mm under a
    5/16" nose tip" case.
  - US Blanks 10'0"T slid toward the nose: 2.39 mm left.
  - Arctic Foam 10'6" G at all three placements: 1.45 mm left slid toward the tail, 2.07 mm
    centered, 2.69 mm slid toward the nose.
- **The 522 that still fit** are thinner than their 5/16" or 1/4" tip setting somewhere inside the
  window, but never under 1/8". The thinnest is **3.30 mm (0.130")**, on US Blanks 9'3"AX centered
  at a 2 1/4" center.
- **Not caught by D-18: Arctic Foam 9'9" G**, which 12-01 also named. It stays above 1/8".
- **None of the 528 fails for any other reason** under the fit rules without width.
- **The fit check's sampling misses nothing here.** Its 1/4" steps and a 1/64" grid found the same
  thinnest point in every case.
- Per the ruling, I did not change the rule to chase these numbers. **For the founder's walk-through:**
  is "under 1/8" anywhere" the right floor, when 522 boards can still dip below the tip setting a
  few inches in from a tip?

## Verification

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run` (whole suite): 74 files, 2,933 passed, 2 skipped (both skips were already
  there).
- `npx vitest run lib/geometry/blank-fit.test.ts lib/geometry/blank-reasons.test.ts lib/blanks`: 5 files,
  192 passed. That includes `lib/blanks/preset-blanks.test.ts`: every preset's blank still fits
  its own board under the two new checks, so the four picks are unchanged.
- The speed guard, "judges the whole catalogue for the default board in under 250 ms", still
  passes (T-12-20).
- `npm run lint`: 0 errors, and the same 11 old warnings, all in `scripts/extract-prototype-*.mjs`.
- `IS_WEBPACK_TEST=1 PW_PORT=3157 npx playwright test e2e/rocker-blanks.spec.ts`: **30 passed** on
  desktop, Android and iPhone, first run. There were no timeouts, so no re-run was needed.
- Acceptance greps:
  - `fitAt`'s signature ends `rules: Pick<FitSettings, "widthMargin" | "planerMaxDepth">`.
  - `rules.planerMaxDepth` appears twice in blank-fit.ts, and `MIN_FOIL_THICKNESS_MM` is exported.
  - blank.ts contains `"runsOut"`.
  - blank-reasons.ts imports `MIN_FOIL_THICKNESS_MM` and contains `this blank is too thick for a`.
  - blank-flag.tsx calls `fitAt(…, { widthMargin, planerMaxDepth })`.
- Units and numbers:
  - No `25.4` or `/ 10` was added anywhere.
  - Both numbers in the new sentence go through `formatMark`, and the 1/8" is authored once, via
    `inchesToMm`.
  - Every expected value in the new tests is either computed from the functions under test and
    `readSeedCatalog()`, or composed from `formatMark` / `stationLabel` / `formatDim`. None of the
    UI contract's example numbers is copied in.
- Signatures: `judgeBlank`, `listBlanks` and `nearestFittingPlacement` are unchanged. None of the
  cut fields changed, and `cutOf` is unchanged. Every board literal written here spreads
  `DEFAULT_BLANK_CUT`, either through `defaultBoard` / `fitContext` or directly.
- No package.json, lockfile, STATE.md, ROADMAP.md or e2e spec was changed.

## Deviations from Plan

**1. [Test-only compile fix, named] One line in `lib/blanks/preset-blanks.test.ts`**
- **Found during:** Task 1.
- **Issue:** the preset test calls `fitAt` directly with `SETTINGS.widthMargin`. Once `fitAt` takes
  a `rules` object, that line no longer compiles. The file belongs to 12-05 in this wave.
- **Fix:** line 81 changed from `SETTINGS.widthMargin,` to `SETTINGS,`. `SETTINGS` holds the full
  default settings, so the test now also checks D-15 and D-18, and it still passes for all four
  presets. 12-05's own edits to this file are at :97–120, so the two changes should merge cleanly.
- **Commit:** `018972c`.

**2. [Rule 1 - Bug in a plan claim] The "from 2" up" property restated so it is true**
- **Found during:** Task 2 (GREEN).
- **Issue:** the plan says that from 2" to 3", no listed verdict's `worst.kind` is `runsOut`. As
  worded, that is false. A FITTING verdict's `worst` is its tightest spare, and the thinnest spot
  on the board can be that tightest spare. The one case is the Midlength at a 2" center on Arctic
  Foam 7'9" SBF. It fits, and its thinnest spot has 0.100" to spare over 1/8".
- **Probe of the rest:** at 2" and above, no board fails for running out anywhere. Runs-out
  failures appear only below 2":
  - At 1 3/4": 1 case (the Midlength on 7'9" SBF).
  - At 1 1/2": 2 cases.
  - At 1" and 1 1/4": more.
  This refines the research's "1 1/2" or less": the Midlength also gets there at 1 3/4".
- **Fix:** the test asserts what was intended: no listed verdict FAILS with `runsOut`. Wherever
  `runsOut` is a fitting verdict's tightest place, its amount must be ≤ `FIT_EPSILON_MM`.
  The geometry is unchanged.
- **Commit:** `830c0bf`.

**3. [Test-only hardening] A time limit for 12-01's whole-catalogue sweep**
- **Found during:** Task 2 (full-suite run).
- **Issue:** "on realistic boards on every blank the list puts under FITS …" normally takes about
  3 s. It went past vitest's default 5 s limit when the whole suite ran next to three sibling
  executors (load average 60–99).
- **Fix:** the test now has its own 30 s limit, with a comment pointing to the real speed guard
  (the 250 ms test). My new catalogue sweep has its own limit too (120 s).
- **Commit:** `830c0bf`.

No other file outside the seven was touched.

## Human check (recorded, not stopped for; end-of-phase mode)

- **One pass at the placement (D-15):**
  - Pick a blank for the default board.
  - Slide the placement toward the thinner end until the flag reads "Doesn't fit at this
    placement … too thin at the center."
  - Tap Move to Where It Fits. The board should move back to a spot where the FOAM OFF Bottom
    readout shows at least one pass.
- **Runs out (D-18):**
  - Set the center to 1" and search for "7'9" SBF".
  - The greyed row should read "Less than 1/8" would be left … — this blank is too thick for a 1"
    center."
  - Switch to Metric. It should read "Less than 3 mm … too thick for a 25 mm center."

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-12-20 is mitigated: each fit check adds two constant-time
comparisons per sampled station, and the 250 ms whole-catalogue test still passes.

## Self-Check: PASSED

- All eight modified files exist on this branch. `git diff --name-only 5f9c072..HEAD` lists the
  seven plan files plus `lib/blanks/preset-blanks.test.ts` (Deviation 1).
- Commits `018972c`, `7258626` and `830c0bf` are on this branch, each ending with the
  `Co-Authored-By: Claude Fable 5.1` trailer.
- The D-18 count above comes from a scratch probe run against this branch's code. It was not
  committed: the orchestrator said scratch output doesn't belong in the repo.
