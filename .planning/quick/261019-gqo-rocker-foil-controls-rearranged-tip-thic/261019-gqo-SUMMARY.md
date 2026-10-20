---
phase: quick-261019-gqo
plan: all (01, 02, 03)
subsystem: rocker-sidebar, rocker-planing-tab, order-form
tags: [rocker, foil, planing, planer-passes, order-form, advanced-fold, e2e]
requires: []
provides:
  - the rearranged ROCKER & FOIL sidebar (plan 01), wholePasses / formatWholePasses in lib/geometry/measure-display.ts
  - the PLANING tab and planingStations (plan 02)
  - the printed order form counting passes the ROCKER way, hasFineTune, and FoilSection owning the Advanced fold (plan 03)
affects: []
key-files:
  created:
    - e2e/helpers/rocker-sidebar.ts
    - components/rocker/rocker-planing.tsx
    - e2e/rocker-planing.spec.ts
    - lib/geometry/blank.test.ts
  modified:
    - lib/geometry/measure-display.ts
    - lib/geometry/planing.ts
    - lib/geometry/blank.ts
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - components/viewer/tabbed-panel.tsx
    - app/design/summary/order-form.css
    - CLAUDE.md
decisions:
  - "Full passes means whole passes plus what is left, counted from the printed numbers (D-04), used by ROCKER's sidebar line, the PLANING tab and now the printed order form (D-12)"
  - "The Advanced fold opens by itself when the board carries a Nose or Tail @ 12 inch tweak, decided once as FOIL appears; after that only the shaper's tap moves it (D-13, P-21)"
  - "The order form kept its one-line Passes cells: the widest figures still fit at every print width, so the plan's fallback (break before the +) was not needed"
status: complete
actuals:
  tokens: 50000
  tasks: 9
  commits: 10
---

# Quick task 261019-gqo: ROCKER's foil controls rearranged, the PLANING tab, and the order form that matches — Summary

The ROCKER sidebar was rearranged into the founder's order, ROCKER gained a PLANING tab, and the printed order form now counts planer passes the same way ROCKER does; FOIL's Advanced fold opens by itself when the board carries a 12 inch tweak.

Per-plan write-ups: [plan 01](./261019-gqo-01-SUMMARY.md), [plan 02](./261019-gqo-02-SUMMARY.md). This file covers all three plans.

## What the shaper sees

**The ROCKER & FOIL sidebar is in a new order.** Inputs now holds all three thicknesses you set yourself (Center Thickness, Nose Tip, Tail Tip), with or without a blank. Blank holds everything about the board in its blank: pick the blank, slide the board along it with Placement, and set how much skin comes off the deck with Deck Skin. Right under Deck Skin one line says how many full planer passes come off at the center, for example "Full passes at the center: Deck 1 · Bottom 1 + 1/16"" (one full pass off the deck, and one full pass off the bottom with 1/16" left for a last, lighter pass), counted at the Planer Max Depth you set in App Default Settings. Foil starts with Pin tip to: Deck / Bottom (what used to be Tip Style), then where each tip's thinning starts, then a closed Advanced fold holding Fine tune from, the two 12" tweaks and Reset Fine-Tune.

**ROCKER has a new PLANING tab** between VIEWER and DATASHEET. It lists the board's five stations, nose to tail, with the rocker, the foam that comes off the deck, the foam that comes off the bottom, and under each foam figure the full planer passes plus what is left (`3 + 1/16"` is three full passes and 1/16" more; Metric `3 + 2 mm`). A figure in the warning colour with a minus sign means the board would poke out of the blank there. With no blank picked the tab just asks you to pick one. Every sidebar control still works while PLANING is open, so you can slide Placement or change Deck Skin and watch the numbers move. On a screen narrower than 820 dots (an upright phone, a narrow browser window) the tabs read VIEWER · TOP · PLANING · DATA so all four fit beside the board's name; a computer and a phone held sideways keep the full words.

**The printed order form matches.** Page 2's PLANING table now counts passes the way ROCKER does. The Longboard's bottom reads `1 + 1/16"` (Metric `1 + 2 mm`) where it used to say `2`, and its deck still reads `1`. Everything still fits the sheet on paper from a computer and at every phone print width from 560 to 900 dots, in both systems: no rail marking wraps, no cell is cut off, no box overflows.

**The Advanced fold opens by itself when a tweak is set.** Open a board that carries a Nose @ 12" or Tail @ 12" tweak (from the rack, from a preset, coming back to ROCKER from another screen, or bringing a removed blank back with Undo) and Foil's Advanced fold is already open with the tweak in view, so a tweak is never hidden. A board with no tweak shows the fold closed. After the board arrives only your own tap opens or closes it: setting a tweak, pressing Reset Fine-Tune, switching tabs, switching blanks, and closing and reopening Foil never move it.

## The three founder decisions (2026-10-19)

- **Q1, the order form: "MATCH IT."** Built in plan 03, Task 1 (D-12). The printed Passes row is now `formatWholePasses(wholePasses(...))`, the same helper and the same wording as ROCKER.
- **Q2, the fold: "OPEN WHEN A TWEAK IS SET."** Built in plan 03, Task 2 (D-13). `hasFineTune(blank)` is the one test for "this board carries a tweak"; Reset Fine-Tune's live state and the fold's opening state both read it.
- **Q3, the Foil intro wording:** no answer reached this plan, so plan 01's wording stands.

## Plan 03 commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | 30a96280 | feat(quick-261019-gqo): the printed order form counts planer passes the new way — whole passes plus what is left |
| 2 | ef8e208e | feat(quick-261019-gqo): ROCKER's Foil Advanced fold opens by itself when the board carries a 12" tweak |
| 3 | (this file) | docs(quick-261019-gqo): summary |

Plan 01 commits: ebf2da72, a4480691, 37213b64. Plan 02 commits: 6544b875, 14b22713, df3a61bd (both listed in their own summaries).

### Plan 03, Task 1: the path taken

The first path worked; the fallback (break the Passes cell before the `+`) was **not needed**. `lib/geometry/planing.ts`'s Passes row is on plan 01's helper, one-line cells unchanged (P-19). The widest-numbers test (desktop project, both systems) passed at the computer's print and at 560, 618, 680, 733, 760, 800, 812 and 900 dots. Report lines (PLANING column width; rail rows all on one line, spread 0.00 at every width):

| Width | Imperial | Metric |
| ----- | -------- | ------ |
| computer print | 201.1 px (was 193.6) | 205.4 px |
| 560 dots | 145.0 px | 145.0 px |
| 618 dots | 161.3 px, rail content 344.5 vs box 344.8 | 161.3 px, same |
| 680 dots | 178.6 px | 178.6 px |
| 733 dots | 193.5 px | 194.2 px |
| 900 dots | 240.2 px | 240.2 px |

The widest figures any board can carry: Imperial Passes `0 + 3/16"` (deck), `20 + 3/16"` (bottom); Metric `10 + 1 mm` (deck), `44 + 2 mm` (bottom); Foam Off `13/16"` / `-4 13/16"` and `20 mm` / `-144 mm` — exactly M2's. The CSS comment on `.order-form-planing-col` carries these widths (a comment change only; the rule is unchanged).

### Plan 03, Task 2: the saved-board proof

Quick 261019-ep5 (`lib/models/open-board.ts`) is **not on this branch's base**, so I took the plan's fallback, as the orchestrator ruled. The closed case is proved from the practice rack: a board opened from `/test-rack` with its caption's Open This Board, taken to ROCKER, shows the fold closed (`rocker-panel.spec.ts`, desktop). **The reload proof (a stored board with a Nose @ 12" tweak of +1/16" opening on `/design/rocker` with the fold open, and the same board with no tweak opening closed) waits for ep5**; the comment above that test in `e2e/rocker-panel.spec.ts` says so. No reload-persistence code was written here. The fold's rule needs nothing from ep5: a reload starts from the stock board (no blank), and FOIL is born, and reads the tweak, only once the kept board is brought back (M4/P-21).

What the browser proves in this plan: arriving from another screen with a tweak (all three phone and computer projects), the fold closed after Reset Fine-Tune and a round trip, the shaper's tap ruling after arrival (desktop), and Remove This Blank then one Undo opening the fold by itself (`rocker-blanks.spec.ts`, all projects).

## Every spec changed in plan 03

Unit: `lib/geometry/planing.test.ts` (Metric 10 mm at 3 mm Bottom `4` to `3 + 1 mm`; Metric 25 mm deck at 2 mm `13` to `12 + 1 mm`; the M-Regular wired test through `formatWholePasses(wholePasses(...))`; a new Longboard case pinned in both systems; `planerPasses` import dropped), `lib/geometry/blank.test.ts` (new: `hasFineTune` none, nose only, tail only, both, negative).

Browser: `e2e/summary-planing.spec.ts` (imports; the cross-check test through the new helper and retitled; the widest-numbers guard `16` / `12 + 1 mm`, plus a guard that the bottom list holds a figure with a `+`; the new Longboard test in both systems, which waits for React to own the preset button), `e2e/rocker-panel.spec.ts` (the closed-on-arrival comment now says why; a new describe with three tests), `e2e/rocker-blanks.spec.ts` (Remove-and-undo sees `Fine tune from` with no tap).

Source: `lib/geometry/planing.ts` (Passes row on the new helper, header and decisions list updated), `lib/geometry/blank.ts` (`hasFineTune`), `components/rocker/rocker-controls.tsx` (`FoilSection` owns the fold with `useState(() => hasFineTune(blank))`; `noTweak` rewritten onto `hasFineTune`; `advanced` leaves `RockerControlsSectionKey`), `components/rocker/rocker-editor.tsx` (`advanced` leaves `sectionOpen`), `app/design/summary/order-form.css` (comment only). `components/summary/order-form.tsx` did not change.

## Deviations from Plan (plan 03)

**1. [Rule 1 - Bug, caught before commit] The first FoilSection had a heading that did nothing.** My scripted move of the FOIL block rewrote the heading's tap as `() => onToggleFoil` (never called). I read the new component, found it, and fixed it to `onToggle={onToggleFoil}` before any run that exercised it (the desktop test that taps Foil's heading ran after the fix). Commit ef8e208e carries the fixed version.

**2. [Rule 3 - Blocking, cold server] The new Longboard test needed a React-ownership wait.** The first Longboard click on a freshly started dev server was lost for the whole 60 seconds. The test now waits for the preset button to be React's before clicking (the same wait `board-lock-screens.spec.ts` uses for Open This Board). 30a96280.

No other deviations. All of M1 to M5 held; no figure differed from the plan's measured facts.

## Gates, with honest counts (this worktree, port 3173, `IS_WEBPACK_TEST=1`)

- `npx vitest run lib/geometry/planing.test.ts lib/geometry/measure-display.test.ts`: 112 passed. RED seen first for the planing tests (4 failed before the change).
- `npx vitest run lib/geometry/blank.test.ts components lib/geometry/planing.test.ts`: 49 files, 1238 passed, 2 skipped.
- `npx vitest run` (full): 154 files; 2 files failed with five 5-second timeouts under load (`blank-fit.test.ts` x3 and `round-tip.test.ts` x2, code this plan did not touch); the two files re-run alone: 115 of 115 passed. Otherwise 5948 passed, 2 skipped.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Task 1, `summary-planing` on all three projects, first run: 21 passed, 12 skipped, 3 failed (two iPhone "with a blank picked" cases at the 30-second limit while walking to Summary on a cold server, and the new Longboard test on desktop in Imperial on its first click); re-run: the two iPhone cases passed; the Longboard test then passed alone in both systems, before and after the React-ownership wait. The whole file on the desktop project afterwards: 12 passed (the widest-numbers test in both systems and the Letter/A4 print test among them).
- Task 2, `rocker-panel`, `rocker-blanks`, `rocker-cut`, `rocker-live-controls`, `rocker-planing`, all three projects: 127 passed, 43 skipped, 1 failed. The failure was the iPhone "switching to another blank keeps the board's Deck Skin" case (the Pick a Blank popup would not close). It is a cold-server flake: on the same code the case, and its Thinning Starts twin, failed twice in a row at the start of fresh server runs, then passed 3 of 3 and 3 of 3 on a warm server; with this plan's two source files swapped back to the base version it passed, and swapped forward again it passes. The three new `rocker-panel` tests passed on the projects they run on (arriving with a tweak: iPhone, Android, desktop; the other two: desktop).
- Task 3 gate, `summary-planing`, `summary-print-size`, `summary-preview`, `summary-rail-key`, `summary-rail-instructions-fit`, `summary-print-touch-box`, `summary-blank`, `touch-sizing`, `board-lock-screens`, `desktop-baseline`, all three projects: 249 listed, 150 passed, 93 skipped, 6 failed. The two `summary-planing` failures (desktop: the paper test and the widest-numbers test) were cut off by the dev server dropping connections (`net::ERR_ABORTED`, `Failed to fetch`, "page closed" in the same stretch); the file re-run on the desktop project: 12 of 12 passed. The four `board-lock-screens` failures (two iPhone, two desktop) all stop at opening a board from the practice rack, before ROCKER or the order form; the full file re-run: 36 passed, 18 skipped, 3 iPhone failures at the same rack step; the iPhone `look-*` cases re-run with the time limit raised to 120 s: 4 of 6 passed and the 2 that failed were the first test on the fresh server and the last; `look-summary` alone, twice, with 120 s: 2 of 2 passed. This is the same class of cold-server iPhone failure plans 01 and 02 recorded for this spec. No desktop baseline changed: `desktop-baseline` had no failures in the gate run.
- **Not run, by the orchestrator's ruling:** the whole Playwright suite (no full-suite exit line from me; the orchestrator's run on main is the one), and anything under `e2e/prod/`, which needs a production build and cannot run in a worktree (nothing under `e2e/prod/` was edited in this plan). `npm run build` was not run (worktree); type-check only.

## Known Stubs

None.

## Threat Flags

None. A display and wording change on already-computed numbers, plus a view-only fold; no new endpoint, storage key, request or account field (T-gqo-14 accepted as planned). T-gqo-10: one helper shared with ROCKER, the Longboard's printed cells pinned in both systems, the cross-check compares the sheet with ROCKER's own printed numbers. T-gqo-11: the widest-numbers sweep at the computer's print and eight phone print widths, no type made smaller. T-gqo-12: the fold opens for a board carrying a tweak, proved by the new describe. T-gqo-13: the Advanced heading keeps `data-lock-exempt`; `board-lock-scope.test.ts` passes in the full unit run.

## Left for the orchestrator

- Run `npm run build` and `npm run test:e2e:prod` on main after the merge (`e2e/prod/phone-controls-clear-undo.spec.ts` was retitled in plan 01).
- Run the full Playwright suite on main for the real exit line.
- When quick 261019-ep5 lands, add the reload proof for the saved board with a tweak (the comment above the practice-rack test in `e2e/rocker-panel.spec.ts` names it).
- The iPhone cold-server flakes (`board-lock-screens`, the `rocker-cut` blank switch) pass warm; they are worth a glance if they recur on main.
- A human look after the merge: the printed order form's Passes row on paper, and the Advanced fold on a board with a tweak.
- `node_modules` in this worktree is a symlink to the main checkout's; it is removed before return.

## Self-Check: PASSED

- FOUND: lib/geometry/blank.test.ts, lib/geometry/planing.ts (Passes row), components/rocker/rocker-controls.tsx (`function FoilSection`), e2e/rocker-panel.spec.ts (new describe), this file.
- FOUND commits on this branch: 30a96280, ef8e208e (plan 03); ebf2da72, a4480691, 37213b64 (plan 01); 6544b875, 14b22713, df3a61bd (plan 02).
- `actuals.tokens` is an approximation: chars/4 over plan 03's realised diff (about 50,600 characters, roughly 12,700 tokens) plus plans 01 and 02's recorded figures (21,000 and 13,300) and this summary, about 50,000 in all; commits counts all three plans' task commits plus this one.
