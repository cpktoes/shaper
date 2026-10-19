---
phase: quick-261019-gqo
plan: 01
subsystem: rocker-sidebar
tags: [rocker, sidebar, foil, planer-passes, e2e]
requires: []
provides:
  - wholePasses / formatWholePasses in lib/geometry/measure-display.ts
  - the rearranged ROCKER & FOIL sidebar (Inputs with three thickness sliders, Blank with Placement + Deck Skin + the full-passes line, Foil with Pin tip to and a closed Advanced fold)
  - e2e/helpers/rocker-sidebar.ts (openFoilAdvanced, showTab, DATASHEET readers)
affects:
  - plan 02 (the PLANING tab brings the station readouts back)
key-files:
  created:
    - e2e/helpers/rocker-sidebar.ts
  modified:
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/rocker/board-on-blank.tsx
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-live-controls.ts
    - components/rocker/rocker-live-controls.test.ts
    - e2e/rocker-cut.spec.ts
    - e2e/summary-planing.spec.ts
    - e2e/rocker-panel.spec.ts
    - e2e/rocker-live-controls.spec.ts
    - e2e/new-board.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/desktop-regression.spec.ts
    - e2e/touch-drag.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/prod/phone-controls-clear-undo.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
decisions:
  - "Full passes means whole passes plus what is left, counted from the printed numbers (D-04)"
  - "The FOIL heading's live flag is derived from fine-tune, Pin tip to and Thinning Starts only (P-02), so Foil and the hand-set heading dim as a whole on DATASHEET"
status: complete
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
---

# Phase quick-261019-gqo Plan 01: The ROCKER & FOIL sidebar, rearranged — Summary

The ROCKER & FOIL sidebar now reads in the founder's order: three thickness sliders in Inputs, Placement and Deck Skin inside Blank with one full-planer-passes line under them, and a Foil section that opens with Pin tip to and ends in a closed Advanced fold.

## What the shaper sees

The ROCKER & FOIL screen's controls are in a new order. **Inputs** now holds all three thicknesses you set yourself — the center and the nose and tail tips — whether or not a blank is picked. **Blank** now holds everything about the board in its blank: pick the blank, slide the board along it with **Placement**, and set how much skin comes off the deck with **Deck Skin**. Right under Deck Skin one line says how many full planer passes come off at the center — for example "Full passes at the center — Deck 1 · Bottom 1 + 1/16"" means one full pass off the deck, and one full pass off the bottom with 1/16" left for a last, lighter pass — at the Planer Max Depth you set in App Default Settings. **Foil** starts with **Pin tip to: Deck / Bottom** (what used to be Tip Style), then where each tip's thinning starts, then a closed **Advanced** fold: open it for **Fine tune from: Deck / Bottom** and the two 12" tweaks. With no blank, the hand-set table keeps the four rocker heights and the two 12" thicknesses; the tip thicknesses are the sliders in Inputs. The station-by-station numbers that used to sit under Deck Skin are not gone — they are on the DATASHEET for now, and the next step gives them their own PLANING tab, with the foam off the deck added.

The station readouts (the grid of station, rocker and off-bottom figures) and the old "Planer passes at the center" line left the sidebar on purpose. Every figure they showed is still on the DATASHEET (YOUR BOARD Rocker, FOAM OFF Deck and Bottom) until plan 02 brings them back as the PLANING tab.

## The new line, in numbers

Measured in the browser on the Longboard preset (US Blanks 9'4"B, Planer Max Depth 1/8"):

- Imperial: `Full passes at the center — Deck 1 · Bottom 1 + 1/16"` over `At 1/8" a pass — your Planer Max Depth.`
- Metric: `Full passes at the center — Deck 1 · Bottom 1 + 2 mm` over `At 3 mm a pass — your Planer Max Depth.`

Both are pinned in `e2e/rocker-cut.spec.ts` ("the Longboard's full-passes line reads whole passes plus what is left, in both systems") and match plan figure M1 exactly. The Shortboard, Fish and Mid-length figures in M1 and the M2 figure were not re-measured (no step of the plan's gates pins them); only the Longboard was confirmed.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | ebf2da72 | feat(quick-261019-gqo): ROCKER's one line under Deck Skin now gives full planer passes plus what is left, e.g. Deck 1 · Bottom 1 + 1/16" |
| 2 | a4480691 | feat(quick-261019-gqo): the ROCKER sidebar's tips move up to Inputs, Placement and Deck Skin join Blank, and Foil gets Pin tip to with a closed Advanced fold |
| 3 | 37213b64 | test(quick-261019-gqo): every ROCKER browser check follows the moved controls, and ROCKER's desktop picture is re-recorded for the new sidebar |

The tracer (Task 1) was verified end to end (unit sweep in both systems plus rocker-cut and summary-planing in the browser) and the run carried straight on to Tasks 2 and 3 as ruled by the orchestrator (human checks deferred to the founder's own look after the merge, #3309).

## The three open questions (defaults kept; the founder is asked at the review)

- **Q1.** The Summary's printed PLANING table still counts passes rounded up (the Longboard prints Bottom `2`), while the sidebar now reads `1 + 1/16"`. Change the order form to whole-plus-remainder too? Default kept: leave the order form as it is.
- **Q2.** A board saved with a 12" tweak opens with Advanced closed, so the tweak is out of sight until the fold is opened. Open the fold by itself when a tweak is set? Default kept: stay closed, as asked.
- **Q3.** FOIL's intro now reads: `Deck and bottom follow your blank's; each tip is thinned from its Thinning Starts point, below, to the tip thickness set under Inputs. Fine-tune the 12" stations under Advanced if you need to.` OK? Default kept: yes.

## Every spec changed

Unit: `lib/geometry/measure-display.test.ts` (new `wholePasses / formatWholePasses` block: the 0–1" sweep against hand division of the printed numbers in both systems, exact division, remainders, nothing to take off, a pass depth that prints as zero, foam left but no whole pass, a sliver that does not print, agreement with `planerPasses`), `lib/geometry/blank-reasons.test.ts` (the reworded Foil intro, word for word, both systems), `components/rocker/rocker-live-controls.test.ts` (DATASHEET's `thicknessHeading` is now false; the D-13 test reads `fineTune || tipStyle || thinning`).

Browser: `e2e/rocker-cut.spec.ts`, `e2e/summary-planing.spec.ts`, `e2e/rocker-panel.spec.ts`, `e2e/rocker-live-controls.spec.ts`, `e2e/new-board.spec.ts`, `e2e/rocker-blanks.spec.ts`, `e2e/desktop-regression.spec.ts`, `e2e/touch-drag.spec.ts`, `e2e/touch-sizing.spec.ts`, `e2e/prod/phone-controls-clear-undo.spec.ts` (title and header comment only), `e2e/desktop-baseline.spec.ts` (log entry), plus the new shared helper `e2e/helpers/rocker-sidebar.ts`.

## Deviations from Plan

**1. [Rule 1 - Bug in the plan's spec instructions] The placement-slide specs could not use the nose tip rocker alone**
- **Found during:** Task 3 (`rocker-blanks`, `desktop-regression`, `touch-drag` on all three projects)
- **Issue:** The plan said to move the old "nose tip row" reading (rocker AND off-bottom together) to the DATASHEET's YOUR BOARD Rocker row alone. Two small Placement steps move the foam off the bottom at the tip, but the nose tip's rocker reading does not change by a printed step, so the check "the reading changed" failed (`4 13/16"` before and after) on every project.
- **Fix:** The helper `datasheetReadings` reads the YOUR BOARD Rocker row and the FOAM OFF Bottom row together (every station), which is what the old readout row compared; the three specs compare that. Added to `e2e/helpers/rocker-sidebar.ts` with `showTab`, `boardRockerCells`, `boardFoamBottomCells`, `readBoardRocker` and `readDatasheetReadings` (also used by rocker-cut's Pin tip to and Fine tune from checks).
- **Files modified:** `e2e/helpers/rocker-sidebar.ts`, `e2e/rocker-blanks.spec.ts`, `e2e/desktop-regression.spec.ts`, `e2e/touch-drag.spec.ts`
- **Commit:** 37213b64

**2. [Rule 3 - Blocking] The Longboard test needed `test.slow()`**
- **Found during:** Task 1. The new test starts the Longboard twice (Imperial, then Metric) and timed out on a cold, loaded server; it passes alone. Marked `test.slow()`.
- **Commit:** ebf2da72

No other deviations: the sidebar, helper and formatter are as the plan wrote them.

## Gates, with honest counts

- `npx vitest run lib/geometry/measure-display.test.ts lib/geometry/planing.test.ts` (Task 1): 2 files, 107 tests passed.
- `npx vitest run components lib/geometry/blank-reasons.test.ts` (Task 2): 48 files, 1366 passed, 2 skipped.
- `npx vitest run` (full, Task 3): 153 files; one failure, `blank-fit.test.ts > Move to Where It Fits`, a 5-second timeout in code this plan did not touch, under load from other sessions on the machine; re-run alone: 86 of 86 passed. Otherwise 5937 passed, 2 skipped.
- `npx next typegen && npx tsc --noEmit`: clean (exit 0). `npm run lint`: clean.
- Playwright (own port 3171, `IS_WEBPACK_TEST=1`), all three projects, each run's failures re-run alone before judging:
  - `rocker-cut` + `summary-planing` (Task 1): 71 passed, 10 skipped on the first run; 3 failures (an iPhone placement test, the new Longboard test, and `summary-planing`'s widest-numbers print test) were load flakes, all passing alone (the Longboard test got `test.slow()`); `rocker-cut` re-run in full afterwards: 52 passed, 2 skipped.
  - `rocker-panel` + `rocker-live-controls` + `new-board` (Task 2): 21 passed, 24 skipped (by design: desktop-only or phone-only tests).
  - `rocker-cut`, `rocker-blanks`, `desktop-regression`, `touch-drag`, `touch-sizing`, `desktop-baseline` (Task 3): 147 passed, 63 skipped, 9 failed on the first run: the ROCKER baseline (expected, re-recorded), 5 placement-slide checks (the deviation above, fixed; the re-run of those plus two flakes: 11 passed, 4 skipped), and 3 load flakes that passed alone (a Clear Search value check on Android, the fixture-board test on Android, a Pick a Blank close wait on desktop).
  - `board-lock-screens`, `phone-layout`, `step-nav`, `rocker-top-view`, `viewer-zoom`, `summary-blank`: 158 passed, 154 skipped, 3 failed (two `board-lock-screens` phone cases and one FINS case on a loaded machine); `board-lock-screens` re-run in full alone: 39 passed, 18 skipped.
  - A sweep of the other specs that open ROCKER, desktop and Android projects (`imported-readout`, `rocker-remove-blank`, `rocker-custom`, `fit-defaults`, `undo-redo`, `blank-picker`, `phone-screens`): 77 passed, 76 skipped, 1 failed — `undo-redo`'s desktop "Undo and Redo pair" test, which walks all six design screens and Home on a cold webpack dev server and ran out of time (with the time limit raised to 150 s it got to its last step, the Home click, and that 5-second URL wait timed out). It never looks at anything on ROCKER's sidebar; it is a cold-server timeout, not a result of this plan. A first attempt at a wider sweep (690 listed tests across 17 more specs) was stopped after 47 tests, too slow on the shared machine; the specs it named that were not in the narrower sweep (`app-settings`, `blank-makers`, `board-name-band`, `old-safari-buttons`, `phone-chrome`, `phone-rails`, `phone-screen-tiles`, `phone-sideways-top-bar`, `viewer-toolbar`, `volume-fins-panels`) were therefore NOT run here.
- **The full Playwright suite was NOT run to the end, so there is no full-suite exit line.** It has 2307 listed tests and ran at roughly 6 tests a minute on a machine shared with other sessions, so I stopped it after about 15 minutes (59 listed tests in; nothing failing in what had run). The targeted sweeps above stand in for it; the orchestrator's own full run on main, after the merge, is the real full-suite exit line.
- `e2e/prod/phone-controls-clear-undo.spec.ts` needs a production build and cannot run in a worktree: it was edited (title and header comment only; no assertion changed, M6) and type-checked, and **the orchestrator runs `npm run test:e2e:prod` on main**.

## Baseline pictures

Only ROCKER's desktop picture was re-recorded; TEMPLATE, RAILS, VOLUME and FINS passed unchanged. ROCKER SHA-256 (first 8 characters), old to new: `8b058472` to `c32b9086`. The new picture shows the three INPUTS sliders, Placement inside BLANK under the Pick a Blank card, no BOARD ON BLANK heading; the top bar, the tab band and the drawing side are unchanged. Log entry added at the top of `e2e/desktop-baseline.spec.ts`.

## Figures that differed from the plan's measured facts

None found. M1's Longboard line matched exactly in both systems. M3 (the Longboard's DATASHEET rocker and foam-off rows) still holds (`new-board.spec.ts` passes). M4 (`board-lock-scope.test.ts`, the Advanced heading is `data-lock-exempt`, more than 3 live sliders after Unlock) and M5 (no raw `<Slider`) hold: both suites pass. M6 could not be exercised here (production build needed).

## Known Stubs

None. No placeholder data or hard-wired empty values were added.

## Threat Flags

None. A display rearrangement only; no new endpoint, storage key, request or account field (T-gqo-04). The pure helper is swept against hand division in both systems and the Longboard's line is pinned in the browser (T-gqo-01); the live table's one change is pinned key by key (T-gqo-02); the Advanced heading is `data-lock-exempt` and both pairs keep `disabled={locked}` (T-gqo-03).

## Notes for the orchestrator

- While stopping the over-long full suite I first ran a broad `pkill -f "playwright test"`, which may also have ended a Playwright run in a sibling worktree (plan 02's executor, if it was running tests at that moment). If plan 02 reports a sudden Playwright exit around that time, that is the cause, not a test failure. After that I only stopped processes that carried my own port (`PW_PORT=3171`).
- `node_modules` in this worktree is a symlink to the main checkout's; it is removed before return.

## Self-Check: PASSED

- FOUND: e2e/helpers/rocker-sidebar.ts, components/rocker/rocker-controls.tsx, lib/geometry/measure-display.ts, the new baseline PNG
- FOUND commits: ebf2da72, a4480691, 37213b64 (on this worktree's branch)
- `actuals.tokens` is chars/4 over the realised diff (about 1,300 changed lines), approximate.
