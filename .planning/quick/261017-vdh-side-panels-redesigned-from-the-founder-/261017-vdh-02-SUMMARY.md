---
phase: quick-261017-vdh
plan: 02
subsystem: rocker
tags: [rocker, side-panel, inputs, rocker-and-foil, foil, slider-row, playwright]
requires: []
provides:
  - "ROCKER side panel: Inputs section, Rocker & Foil table (no blank), Foil (blank)"
affects: [rocker]
key-files:
  created:
    - e2e/rocker-panel.spec.ts
  modified:
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-live-controls.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - e2e/rocker-live-controls.spec.ts
    - e2e/new-board.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
decisions:
  - "INPUTS' heading and TEMPLATE line are plain text and never dim; only the Center Thickness row is wrapped in Live."
  - "Section keys are blank | boardOnBlank | rockerAndFoil | foil, all open on arrival."
  - "The Rocker & Foil heading is live while live.rocker || live.thicknessHeading, worked out at the call site, so the pure live table keeps its ten keys and its test passes unchanged."
status: complete
completed: 2026-10-18
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase quick-261017-vdh Plan 02: ROCKER side panel Summary

ROCKER's side panel now opens with an Inputs section (the TEMPLATE size and Center Thickness), and with no blank picked the old Rocker and Thickness lists are one compact Rocker & Foil table of eight boxed sliders; with a blank picked, Thickness is simply called Foil.

## What a shaper sees

- **Inputs** (new, always open, no arrow) sits under the title and subtitle. It holds the line `TEMPLATE details are imported: 6'0" × 19"` (Metric: `… 182.9 × 48.3 cm`), moved up from under the subtitle, and the Center Thickness box and slider, moved out of their own section. The separate CENTER THICKNESS heading is gone.
- **No blank picked:** one collapsible **Rocker & Foil** section. Intro `Hand-set until you pick a blank.`, then a small table with a ROCKER column and a THICKNESS column; a NOSE group (Tip, then @ 12") and a TAIL group (@ 12", then Tip), nose to tail along the board. Each cell is a bordered value box over its own slider. They are the same eight numbers, set through the same eight setters as before. Metric reads `@ 30.5 cm` and whole millimetres. Every slider has its own screen-reader name (`Nose tip rocker`, `Nose 12" thickness`, ... or `Nose 30.5 cm rocker` in Metric).
- **Blank picked:** the Thickness section is renamed **Foil**; its intro and rows are unchanged and in the same order. The table is not on the page, because the rocker comes from the blank.
- The tab rule is unchanged: on DATASHEET only Center Thickness and the two Tip thickness values are live (the table's two Tip thickness cells with no blank, Foil's Nose Tip and Tail Tip with one); on TOP VIEW only the blank picker and Placement. Nothing moves when the tab changes.

## Commits

- `53cfa9dd` feat: ROCKER opens with an Inputs section (the TEMPLATE size and Center Thickness)
- `075d69d4` feat: ROCKER's hand-set rocker and thickness in one Rocker & Foil table (and Thickness becomes Foil)
- `bd224f49` test: browser checks for the Inputs section and the table; ROCKER desktop picture re-recorded

## Test results (in this worktree)

- `npx vitest run`: 5731 passed, 2 skipped, 1 timed out under machine load (`blank-fit.test.ts`, "Move to Where It Fits"); re-run alone it passes, 86 of 86. The load average was 50 to 260 from sibling worktrees.
- `npx tsc --noEmit`: clean. `npm run lint`: clean.
- Playwright (PW_PORT=3162, desktop + iphone + android):
  - New `rocker-panel.spec.ts`: 4 tests, all pass (desktop: Inputs, table names, boxes and order, Imperial and Metric, Foil; phone: eight thumbs reachable and no sideways scroll).
  - `rocker-live-controls.spec.ts` (updated), `new-board.spec.ts` (updated), `rocker-blanks`, `rocker-cut`, `rocker-top-view`, `blank-makers`, `app-settings`, `phone-screens`: 182 passed, 64 skipped, 9 failed in the first run under extreme load (timeouts, a dev-server hot-update request mid-drag); all 9 re-run alone: 18 passed, 3 skipped.
  - `touch-sizing`, `board-lock-screens`, `phone-chrome` with `-g rocker|ROCKER`: 23 passed, 28 skipped, 3 failed on the first run (the lock never arrived under load); `board-lock-screens` ROCKER re-run alone: 6 passed.
  - `desktop-baseline` ROCKER: re-recorded, then green.
- `phone-layout.spec.ts` was not run, as the plan says: plan 01 owns its ROCKER half and it passes only once both plans merge. The intro line and the table share one wrapper, with the nose tip rocker the first slider in it, as plan 01's rewrite expects.

## Picture

`e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png`: compared old, new and diff first; the only difference is the side panel (Inputs on top with the Center Thickness box, then Blank, Board on Blank, Rocker & Foil). The drawing is identical. The baseline spec's header log was not edited.

## Deviations from Plan

None to the design. Environment notes:

1. [Rule 3 - Blocking] The APFS clone of `node_modules` carried a `node_modules/node_modules` symlink pointing at the main checkout's `node_modules`, which made Vitest load two copies of React. I unlinked that one symlink in this worktree's own copy (not the target) and the Base UI tests ran normally. No repo file changed.
2. Task 1 mapped the old sections to the new keys (`rockerAndFoil`, `foil`) so the file compiled between commits, as the plan allowed.

## Known Stubs

None.

## Threat Flags

None. A rearranged sidebar only. T-vdh-03 (locked board) is covered by `SliderRow`, which reads the lock itself, `board-lock-scope.test.ts` and the `board-lock-screens` ROCKER tests. T-vdh-04 (DATASHEET / TOP VIEW) is covered by each cell's own `Live` wrapper, proved in `rocker-live-controls.spec.ts`.

## Self-Check: PASSED

- Files: `components/rocker/rocker-controls.tsx`, `e2e/rocker-panel.spec.ts` and the re-recorded PNG exist.
- Commits `53cfa9dd`, `075d69d4` and `bd224f49` exist on this branch.
