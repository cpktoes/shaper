---
phase: quick-261019-gqo
plan: 02
subsystem: rocker-planing-tab
tags: [rocker, planing, tabs, phone, e2e]
requires: ["261019-gqo-01"]
provides:
  - planingStations (pure rows for the PLANING tab) in lib/geometry/planing.ts
  - components/rocker/rocker-planing.tsx (the PLANING tab)
  - PanelTab.shortLabel (a shorter tab word below the 820-dot width line)
  - e2e/rocker-planing.spec.ts
affects:
  - plan 03 (the order form's PLANING table; the combined summary)
key-files:
  created:
    - components/rocker/rocker-planing.tsx
    - e2e/rocker-planing.spec.ts
  modified:
    - lib/geometry/planing.ts
    - lib/geometry/planing.test.ts
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-live-controls.ts
    - components/rocker/rocker-live-controls.test.ts
    - components/viewer/tabbed-panel.tsx
    - components/viewer/tabbed-panel.test.ts
    - lib/units-isolation.test.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - CLAUDE.md
decisions:
  - "The station numbers that left the sidebar in plan 01 are back as a PLANING tab, with OFF DECK added and whole-plus-remainder planer passes under each foam figure (D-07, D-04)"
  - "Tab order VIEWER, PLANING, DATASHEET on a computer; VIEWER, TOP VIEW, PLANING, DATASHEET on a small screen (D-08)"
  - "Below the 820-dot width line the tabs read VIEWER · TOP · PLANING · DATA; each tab keeps its full name for screen readers and tests (D-11, P-17)"
  - "Every sidebar control is live on PLANING (D-09)"
status: complete
actuals:
  tokens: 13300
  tasks: 3
  commits: 3
---

# Phase quick-261019-gqo Plan 02: The PLANING tab — Summary

ROCKER has a new PLANING tab between VIEWER and DATASHEET that lists the board's five stations with rocker, foam off the deck and foam off the bottom, and the full planer passes under each foam figure; on a phone the tabs read VIEWER · TOP · PLANING · DATA so all four and the board's name fit.

## What the shaper sees

A new **PLANING** tab sits between VIEWER and DATASHEET. It lists your board's five stations from nose to tail, and for each one the board's **rocker**, the foam that comes **off the deck** and the foam that comes **off the bottom**. Under each foam figure is how many full passes of your planer that is, plus anything left for one last, lighter pass: `3 + 1/16"` is three full passes and 1/16" more (Metric `3 + 2 mm`). A note under the table says which Planer Max Depth the passes are counted at ("At 1/8" a pass — your Planer Max Depth.") and what the part after the + means. A figure in the warning colour, with its minus sign, means the board would poke out of the blank there, and one extra line says so; a figure that only prints as zero reads a plain zero. With no blank picked the tab just asks you to pick one first and shows no table.

On PLANING every control in the sidebar still works, so you can slide the board along its blank or change the Deck Skin and watch the numbers move.

On a computer the tabs read VIEWER · PLANING · DATASHEET. On a screen narrower than 820 dots (an upright phone, or a narrow browser window) there are four tabs, VIEWER · TOP · PLANING · DATA: the two short words are the founder's answer (D-11) to a measured problem — four full tabs are wider than a 360-dot phone's whole tab band and would crowd out the board's name. A phone held sideways, and a computer, keep the full words (TOP VIEW, DATASHEET). Screen readers and every browser test still hear and find the full names.

The Longboard preset reads, nose to tail (Imperial), ROCKER `4 5/8"` · `2 1/4"` · `0"` · `1 15/16"` · `3 5/8"`; OFF DECK `1/8"` (1 pass) at every station; OFF BOTTOM `7/16"` (3 + 1/16") · `3/16"` (1 + 1/16") · `3/16"` (1 + 1/16") · `3/16"` (1 + 1/16") · `9/16"` (4 + 1/16"); Metric has the same shape (`117 mm` ... `14 mm`, `At 3 mm a pass`).

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | 6544b875 | feat(quick-261019-gqo): ROCKER gains a PLANING tab — rocker, foam off the deck and bottom, and the planer passes at every station |
| 2 | 14b22713 | feat(quick-261019-gqo): on a phone ROCKER's tabs read VIEWER · TOP · PLANING · DATA so all four and the board's name fit |
| 3 | df3a61bd | docs(quick-261019-gqo): CLAUDE.md notes that the 820-dot width line also shortens ROCKER's TOP VIEW and DATASHEET tab words on a phone |

The tracer (Task 1) was verified end to end (unit tests, then the desktop browser specs) before Task 2 was started; in this run the human check was left to the founder's own look after the merge, as ruled.

## What changed, file by file

- `lib/geometry/planing.ts` / `planing.test.ts`: `planingStations(profile, planerMaxDepth, system)` builds the five rows (names, rocker, the two foam figures with a below-zero flag, the two passes figures) from the profile through the existing formatters and plan 01's `formatWholePasses(wholePasses(...))`; null with no blank. Tests: both systems on a real catalogue blank (every expected string computed with the app's own helpers), a hand-built input with -1/16" (Metric -2 mm, flagged, 0 passes) and a -0.2 mm figure (prints an unsigned zero, not flagged), and the no-blank null. Seen failing first (5 red), then green (22 of 22).
- `components/rocker/rocker-planing.tsx` (new): the tab, in the DATASHEET's frame, a four-column grid with two lines per station. No arithmetic and no conversion in the file.
- `components/rocker/rocker-editor.tsx`: PLANING in both tab lists, its content branch, and the DATASHEET's phone reading margin.
- `components/rocker/rocker-live-controls.ts` / test: `"planing"` joins the tab type; every control live, pinned key by key.
- `components/viewer/tabbed-panel.tsx` / test: `PanelTab.shortLabel`. A tab with one holds the full word (hidden below 820 dots) and the short word (shown only there), and carries `aria-label` of the full name; a tab without one renders exactly today's markup (the three captured shapes still match byte for byte).
- `lib/units-isolation.test.ts`: `rocker-planing.tsx` added to the display ledger, converted.
- `e2e/rocker-planing.spec.ts` (new), `e2e/desktop-baseline.spec.ts` (log entry), ROCKER's baseline picture, `CLAUDE.md` (one sentence in the Layout section's width paragraph).

## Deviations from Plan

**1. [Rule 1 - small layout fix] Row rules run unbroken**
- **Found during:** Task 2, looking at a real 360-wide picture of the tab.
- **Issue:** with a 8-dot gap between grid columns, the faint rule between stations broke into four short pieces; the DATASHEET's rules are continuous.
- **Fix:** the gap became 8 dots of left padding on the three figure columns (same total width, so the plan's width arithmetic M4 is unchanged); the rules now run edge to edge.
- **Commit:** 14b22713

**2. [Rule 3 - blocking] The Longboard helper waits longer**
- **Found during:** Task 1/2 runs. The specs that start the Longboard from the setup screen failed twice on a freshly rebuilt dev server (the first click compiles the outline screen, which can take more than the helper's 20 seconds); each passed alone. The helper's wait is now 60 seconds.
- **Commit:** 14b22713

No other deviations. The plan's figures M1 to M6 held: M1 (both systems), M2 (the two Deck Skin presses) and M3's tab-band fit were pinned in the browser; M4 (no sideways scroll) was measured on a 360-wide picture in both systems; M5 and M6 held (the ledger test and every spec that finds a tab by name pass unchanged). One detail the plan did not state: in Metric at 360 wide the two 12" station names wrap onto two lines, as M4 predicted.

## Gates, with honest counts

- `npx vitest run lib/geometry/planing.test.ts components lib/units-isolation.test.ts`: 49 files, 1262 passed, 2 skipped.
- `npx vitest run` (full, three runs on a loaded machine): 153 files. Each run failed only in `lib/geometry/blank-fit.test.ts` (3, then 5, then 1 five-second timeouts in code this plan did not touch); that file alone: 86 of 86 passed. Otherwise about 5946 passed, 2 skipped.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Playwright (own port 3172, `IS_WEBPACK_TEST=1`), judged failure by failure:
  - Task 1 (desktop): `rocker-planing`, `desktop-baseline`, `rocker-live-controls`, `board-name-band`: 15 passed, 6 skipped after the lone cold-server Longboard-click failure was re-run alone (passed); `desktop-baseline` first showed the ROCKER diff only (421 pixels, the extra tab), the other four unchanged, then ROCKER re-recorded.
  - Task 2 (all three projects): `board-name-band`, `phone-chrome`, `phone-screens`, `rocker-planing`: 80 passed, 130 skipped, 0 failed (before the row-rule padding tweak); `rocker-planing` re-run in full after the tweak: 8 passed, 15 skipped, 1 failed (the cold-server Longboard click again), which passed alone (23.6 s).
  - Task 3 gate (all three projects): `rocker-planing`, `rocker-top-view`, `rocker-live-controls`, `board-lock-screens`, `desktop-baseline`: 74 passed, 81 skipped, 1 failed — `board-lock-screens` iPhone "x-rails" (RAILS' View Full Sized), a 30-second test limit exceeded while walking to RAILS on a cold, loaded webpack dev server; it fails the same way alone at 30 s and passes at 58 s with `--timeout=120000`. It never touches ROCKER or the tab strip. Not caused by this plan.
- **The full Playwright suite was NOT run** (the orchestrator's ruling: only the named specs plus the new one); the orchestrator's own run on main is the full-suite exit line. Specs under `e2e/prod/` cannot run in a worktree and were not run; none was edited.

## Baseline pictures

Only ROCKER's desktop picture was re-recorded: SHA-256 (first 8 characters), old to new: `c32b9086` to `849ae17b`. The only difference is the extra PLANING word in the tab strip. TEMPLATE, RAILS, VOLUME and FINS passed unchanged. Log entry added at the top of `e2e/desktop-baseline.spec.ts`.

## Known Stubs

None.

## Threat Flags

None. A display change only; no new endpoint, storage key, request or account field (T-gqo-09). T-gqo-05 and T-gqo-06: every figure comes through the tested formatters and the Longboard's table is pinned cell by cell in both systems, and the below-zero and prints-as-zero rule is unit-tested. T-gqo-07: `board-name-band`, `phone-chrome`, `phone-screens` and the new phone describes show every tab inside the window with no sideways scroll. T-gqo-08: `liveControls("planing")` is pinned key by key and `aside [inert]` counts 0 on PLANING in the browser.

## Notes for the orchestrator

- `node_modules` in this worktree is a symlink to the main checkout's; it is removed before return.
- The one phone-width behaviour worth a human glance after the merge: the tab words TOP and DATA on a real upright phone, and the Metric station names wrapping at 360 wide.

## Self-Check: PASSED

- FOUND: components/rocker/rocker-planing.tsx, e2e/rocker-planing.spec.ts, lib/geometry/planing.ts (planingStations), the re-recorded baseline PNG
- FOUND commits on this branch: 6544b875, 14b22713, df3a61bd
- `actuals.tokens` is chars/4 over the realised diff (about 53,000 characters excluding the picture), approximate.
