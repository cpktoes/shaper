---
phase: 14-realistic-surfboard-flow
plan: 01
subsystem: geometry (blank curves, presets, hand-set board, fit check)
status: complete
tags: [pin, golden-fixture, stress-set, D-26, D-27, rule-1]
requires: []
provides:
  - "scripts/extract-phase14-today-golden.ts — the pin's generator, guarded to commit ed39f4a, --out flag"
  - "lib/geometry/__fixtures__/phase14-today-golden.json — today's numbers, generated"
  - "lib/geometry/__fixtures__/phase14-today.ts — PHASE14_TODAY, pinnedCatalogue(), pinnedBlank(vendor, name)"
  - "lib/geometry/__fixtures__/phase14-stress-set.ts — buildStressSet(records, prepare), StressCase, STRESS_FIT_SETTINGS"
  - "lib/geometry/phase14-today.test.ts and phase14-today-handset.test.ts — the pin test, both halves"
affects: [14-02, 14-03, 14-04, 14-05, 14-06, 14-07]
tech-stack:
  added: []
  patterns:
    - "Byte-guarded generator against a recorded commit (git ls-tree + git show + Buffer.equals), as Phase 12 did for v1.3"
    - "Blank rows pinned by value inside the fixture, fresh copies handed out per call"
    - "JSON written with plain-value objects compacted onto one line (deterministic, full precision)"
key-files:
  created:
    - scripts/extract-phase14-today-golden.ts
    - lib/geometry/__fixtures__/phase14-today-golden.json
    - lib/geometry/__fixtures__/phase14-today.ts
    - lib/geometry/__fixtures__/phase14-stress-set.ts
    - lib/geometry/phase14-today.test.ts
    - lib/geometry/phase14-today-handset.test.ts
  modified: []
decisions:
  - "The fixture is 1,243 KB, not under the plan's 450 KB. The must-have truths (every blank by value, every interval's midpoint, the full stress slice and hidden-station data) cannot fit in 450 KB in any JSON form (fully compact they are about 1,030 KB). The truths won over the size estimate; the generator's ceiling is 1.5 MB as a guard against accidental growth."
  - "Small plain-value objects (a curve point, a station row, five station numbers, a shortfall) are written on one line. Without that the file was 1,935 KB. Same numbers, same precision, still deterministic."
  - "The hidden-station merge treats two curves as the same only when both station positions and values match. That gives 68 / 90 / 69 distinct curves for bottom / thickness / width. Bottom and thickness match the research exactly. Width gives 69 curves / 546 hidden stations, which is the todo's own figure; the research had 68 / 540."
metrics:
  duration: "about 35 minutes"
  completed: 2026-10-02
  tasks: 2
  files: 6
actuals:
  tokens: 327500   # chars/4 over all six files; 318,000 of it is the generated fixture, about 9,300 the hand-written code and tests
  tasks: 2
  commits: 3
---

# Phase 14 Plan 01: Today's numbers pinned before the curves change. Summary

**Today's maths, run on the code the live site serves (commit `ed39f4a`), has written down every blank's bottom, thickness and width curve, the four presets, the first board a visitor sees, 346 of the 1,635 test boards and the hidden-station data. The blanks it used are copied into the same file, and two tests prove today's code reproduces every number exactly.**

## What this means for a shaper

Nothing on screen changes. This is the "before" picture. Later in Phase 14 the curves through a blank's printed stations get redrawn. When that happens, the before-and-after pictures, the saved-boards report and the "a preset card may move by at most 0.015" at a station" check all need numbers that can be trusted, and this record supplies them. The blanks are stored inside the record, so a later correction to a vendor's catalogue can't quietly change a "before" number.

## What was built

1. **The stress set helper** (`lib/geometry/__fixtures__/phase14-stress-set.ts`) builds the test boards exactly as the research defined them. Every pickable blank gets a board 2" shorter, at centres of 2 1/4", 2 1/2", 2 3/4" and 3". Each board has the default tips, cut and outline, is kept only if it passes the list's two floors, and is placed at the tail end, centre and nose end of the slider. Result: **1,635 boards**, the research's own count. **291** of them are longer than the app's 10'0" limit, also the research's count; each board carries a `buildable` flag.
2. **The generator** (`scripts/extract-phase14-today-golden.ts`) runs today's maths and writes the record. Before it computes anything, it checks all 45 non-test files that commit `ed39f4a` holds under `lib/geometry/`, `lib/blanks/`, `db/seed/blanks/` and `lib/fit-defaults-preference.ts` byte for byte. If any file differs, it refuses to run. A second run writes identical bytes.
3. **The record** (`phase14-today-golden.json`) is described section by section below.
4. **The accessor** (`phase14-today.ts`) provides `PHASE14_TODAY` (typed), `pinnedCatalogue()` and `pinnedBlank(vendor, name)`. Each call returns fresh, checked `BlankRecord`s built from the pinned rows.
5. **The two tests.**
   - `phase14-today.test.ts` reproduces every curve point, every preset's five thicknesses and five rocker numbers plus its 1/2" sweep, and every pinned stress board's numbers, verdict and worst shortfall. All checks are exact (`toBe` / `toEqual`). It also includes the two Task 2 tests.
   - `phase14-today-handset.test.ts` does the same for the default hand-set board and its 1" sweep.
   - Neither file asserts litres: plan 14-05 owns that.

### The first board a visitor sees

It is built as `DEFAULT_BOARD_SPEC.outline`, `DEFAULT_FOIL_SPEC`, `DEFAULT_FALLBACK_ROCKER`, `DEFAULT_RAIL_BAND_SPEC`, `DEFAULT_VOLUME_SPEC`, `railsImportFoilThickness: true`, `blank: null`. That matches `components/design/design-store.tsx`'s `DEFAULT_DESIGN_STATE`, which uses `DEFAULT_BOARD_SPEC.rocker` (= `DEFAULT_FALLBACK_ROCKER`) and `DEFAULT_BOARD_SPEC.foil` (= `DEFAULT_FOIL_SPEC`). It is also what `lib/geometry/summary-line.test.ts`'s source contract on `DEFAULT_DESIGN_STATE` guards: `railsImportFoilThickness: true` and `volume: DEFAULT_VOLUME_SPEC`.

## The record's contents (from the generator's printout)

| Section | Count |
|---------|-------|
| File size | **1,243.2 KB** (1,273,026 bytes) |
| `blanks` | 162 blanks by value (158 pickable) |
| `curves` | 158 blanks × bottom, thickness, width (each at its own printed stations and every interval's midpoint) |
| `presets` | 4 (sweep points: shortboard 149, fish 137, midlength 173, longboard 217) |
| `handSet` | 1 board, 73 sweep points |
| `stress` | **346 kept of 1,635**: 327 for "every 5th" plus 19 on blanks whose thickest printed thickness is not at C. **57 of the 346 are not buildable** (291 of the whole set). 295 of the 346 fit today. |
| `hiddenStations` | bottom **68 curves / 536 hidden stations**, thickness **90 / 712**, width **69 / 546** |

## The guard's refusal (Task 2)

One blank line was appended to `lib/geometry/pchip.ts` and the generator was run. It exited 1 with:

> lib/geometry/pchip.ts is not the live site's code (commit ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220), so this script would not be recording today's numbers. The fixture can only be regenerated against commit ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220: run `git worktree add <dir> ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220`, copy this script into <dir>/scripts/ and lib/geometry/__fixtures__/phase14-stress-set.ts and phase14-today.ts into <dir>/lib/geometry/__fixtures__/, and run it there with `--out <this repo's fixture path>`.

The file was then restored with `git checkout -- lib/geometry/pchip.ts`. It is byte-identical to `ed39f4a` and was never committed in the changed state.

## Verification

- The generator exits 0, and after a second run `git diff --exit-code` on the fixture is clean. Both runs gave the same sha `c5d1f47…`.
- `npx vitest run lib/geometry/phase14-today.test.ts lib/geometry/phase14-today-handset.test.ts`: 2 files, 7 tests, all passed.
- A mutation check moved one hand-set sweep thickness by 1e-12 mm. The hand-set test failed on it (`Object.is` equality), and the fixture was then restored to its generated bytes.
- The node key check passes: all eight keys are present and there are 4 presets.
- The commit sha appears 3 times in the generator, and the script contains `git`, `ls-tree` and `show`.
- `git diff --name-only ed39f4a… HEAD -- lib components app db e2e` lists only this plan's five new files under `lib/`. The sixth file is under `scripts/`, which that command does not cover.
- `git diff --quiet ed39f4a… HEAD -- lib/geometry/pchip.ts lib/geometry/blank-fit.ts lib/geometry/board-profile.ts package.json package-lock.json` exits 0.
- `npx tsc --noEmit` exits 0, run after `npx next typegen`. `npm run lint` exits 0.
- `slopeAt`, `tipRule` and `ThinningStart` appear nowhere in this plan's files.
- Tracer gate: the tracer task's verify was re-run end to end after its commit and passed. Per orchestrator ruling 10, no human stop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The fixture's 450 KB ceiling cannot hold the content the truths require**
- **Found during:** Task 1
- **Issue:** The plan's must-have truths require every blank by value, every interval's midpoint, the stress slice and the hidden-station data. Written with `JSON.stringify(value, null, 2)` that comes to 1,935 KB; fully compact it is about 1,030 KB. The plan's fallback (drop every other midpoint for blanks with more than nine stations) would only remove part of the 438 KB curves section. It would also break truth (1)'s "midpoint of every interval". By section: blanks 272 KB, curves 438, stress 210, hiddenStations 260, presets 57, handSet 6.
- **Fix:** All the content stays. The generator writes small plain-value objects on one line with its own deterministic formatter (`formatJson`), which brings the file to 1,243 KB at full precision. The size ceiling in the generator is 1.5 MB, documented as a guard against accidental growth, and it prints a per-section breakdown if it is ever exceeded. No midpoints were dropped, so the provenance carries no "every other interval" note. Type-checking and the tests handle the file without trouble: tsc about 13 s for the whole repo, and the two test files import and run in about 1.4 s.
- **Files modified:** scripts/extract-phase14-today-golden.ts
- **Commit:** d8f207c

**2. [Plan wording] The guard covers every non-test file the commit holds under the four paths (45 files), as the plan's action specifies.** PATTERNS.md's shorter list of six files is a subset of these. Not a change in behaviour, just recorded for the reader.

No existing file was changed. `package.json` and `package-lock.json` are unchanged. No scratch file was left in the repo; the only scratch file was a fixture backup under the session scratchpad.

## Known Stubs

None.

## Threat Flags

None. The generator reads git and the committed CSVs only. There is no network, no database and no environment file.

## Self-Check: PASSED

- FOUND: scripts/extract-phase14-today-golden.ts
- FOUND: lib/geometry/__fixtures__/phase14-today-golden.json
- FOUND: lib/geometry/__fixtures__/phase14-today.ts
- FOUND: lib/geometry/__fixtures__/phase14-stress-set.ts
- FOUND: lib/geometry/phase14-today.test.ts
- FOUND: lib/geometry/phase14-today-handset.test.ts
- FOUND: d8f207c (Task 1)
- FOUND: fbfa752 (Task 2)
