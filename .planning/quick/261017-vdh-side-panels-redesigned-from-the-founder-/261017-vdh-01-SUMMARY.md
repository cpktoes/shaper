---
phase: quick-261017-vdh
plan: 01
subsystem: ui
tags: [template, rails, side-panel, copy, view-full-sized, playwright]
requires: []
provides:
  - "TEMPLATE wording: Show Drag Points, Show fin placement, shorter subtitle, Show/Hide drag points button"
  - "RAILS Inputs section with one import box and a single imported-thickness line (railsImportedLine)"
  - "RAILS View tick box on each rail in place of the open/close arrow, with the upright-phone rule"
  - "View Full Sized popup hides nothing in the iPhone Home-Screen app; softened Home-Screen note"
  - "board-lock-screens.spec.ts ready for plan 03's hidden FINS/VOLUME sliders"
affects: [quick-261017-vdh plans 02 and 03, board-lock-screens.spec.ts, phone-layout.spec.ts]
actuals:
  tokens: 25000
  tasks: 3
  commits: 4
key-files:
  created:
    - lib/geometry/rails-imported-line.ts
    - lib/geometry/rails-imported-line.test.ts
    - e2e/template-rails-panels.spec.ts
  modified:
    - components/outline/outline-controls.tsx
    - components/outline/wing-controls.tsx
    - components/outline/outline-editor.tsx
    - components/outline/wings-panel.tsx
    - lib/link-preview/preview-image.ts
    - components/rails/rail-controls.tsx
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts
    - components/rails/view-full-sized-dialog.css.test.ts
    - e2e/phone-rails.spec.ts
    - e2e/board-lock-screens.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/phone-layout.spec.ts
    - e2e/wings.spec.ts
    - e2e/outline-ghost.spec.ts
    - e2e/viewer-zoom.spec.ts
    - e2e/desktop-regression.spec.ts
    - e2e/undo-redo.spec.ts
    - e2e/prod/slider-dots.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
key-decisions:
  - "On an upright phone the NOSE/CENTER/TAIL switch keeps choosing the rail: the picked rail shows no View box and always shows its controls (drawn in a wrapper that is display:contents under 820 dots and display:none at or above it when its View box is unticked)."
  - "The RAILS line builder lives in its own file beside boardLine rather than inside blank-reasons.ts, so the three parallel plans never edit one file."
  - "View Full Sized footer: Fit-to-page note and Home-Screen note share one column, then the Print button, so on a phone the softened note is the last line."
requirements-completed: [QT-261017-vdh]
duration: about 2h of wall time, mostly waiting on a machine shared with two other executors
completed: 2026-10-18
status: complete
---

# Phase quick-261017-vdh Plan 01: TEMPLATE wording, RAILS inputs and View boxes, Home-Screen popup Summary

**TEMPLATE reads Show Drag Points / Show fin placement, RAILS gets an Inputs section whose one tick box imports ROCKER's thicknesses (and hides the three thickness sliders) plus a View tick box on each rail, and the View Full Sized popup no longer hides Print in the iPhone Home-Screen app.**

## What changes on screen

**TEMPLATE (and the WINGS tab).**
- The subtitle reads "Design and print full sized templates".
- Settings now reads "Show Drag Points" (on the WINGS sidebar it carries the note "(the wing's too)") and "Show fin placement" (the "marks only, no dims" note is gone).
- The button over the drawing says "Show drag points" / "Hide drag points", on both the VIEWER and WINGS tabs.
- The browser-preview picture's list of buttons to hide (`PREVIEW_CAPTURE.buttons`) was renamed with the label, because a test requires the two to match word for word.

**RAILS.**
- Subtitle: "Design and shape consistent rails".
- A new INPUTS section at the top holds one tick box, "Import Rocker & Foil Values" (ticked by default; the same saved state as the old box). While ticked, one line reads, for the default board, `Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center · 1 9/16" tail @ 12"` (Metric: `33 mm nose @ 30.5 cm · 64 mm center · 40 mm tail @ 30.5 cm`), and the three thickness sliders are gone, not greyed. Untick it and the line goes and each rail's own thickness slider returns (a plain flip: nothing is copied). The two old help sentences are removed.
- Each rail heading (NOSE RAIL / CENTER RAIL / TAIL RAIL) has a "View" tick box at the right end of its ruled line in place of the arrow. It is the same open/closed state as before: unticked hides that rail's controls, its drawing and its column in the DATA table. Each rail's ADVANCED fold keeps its arrow.
- On an upright phone (under 820 dots wide) the NOSE/CENTER/TAIL switch still chooses the rail: the rail in view shows no View box and always shows its controls, even if it was unticked elsewhere; on DATA all three show their View boxes.

**View Full Sized on an iPhone Home-Screen app.** Nothing is hidden any more: the Print button, the "turn off Fit to page" note and the whole phone line ("Shown smaller than actual size — tap Print for the full-sized rail.") all show. Under them the note now reads "Printing may not be available from the Home-Screen app — open this page in Safari to print the full-sized rail." Nothing changes on a computer.

## Commits

| Task | Commit | What |
| --- | --- | --- |
| 1 | `0463d925` | TEMPLATE wording, preview-image constant, seven specs renamed, new `template-rails-panels.spec.ts` (TEMPLATE part), `phone-layout.spec.ts` ROCKER half made independent of the section's heading |
| 2 | `6fb12872` | `railsImportedLine` + tests, `rail-controls.tsx`, RAILS part of the new spec, `phone-rails`, `rocker-blanks`, `board-lock-screens`, `prod/slider-dots` updated |
| 3 | `a8fc7b76` | `view-full-sized-dialog.tsx` and its two unit-test files |
| 3 | `3a972dca` | Re-recorded TEMPLATE and RAILS desktop pictures |

`board-lock-screens.spec.ts`'s plan-03 readiness changes (task 3 item 5) and `phone-rails.spec.ts`'s Home-Screen sentence/header changes were made in the same working session as task 2 and so landed in task 2's commit rather than task 3's.

## Verification

- `npx vitest run`: 153 files, 5737 passed, 2 skipped. `npx tsc --noEmit`: clean. `npm run lint`: clean.
- New pure builder `railsImportedLine`: 4 tests (Imperial, Metric, built from `formatMark`/`stationLabel`, nose-center-tail order).
- Browser (PW_PORT=3161, IS_WEBPACK_TEST=1), final run of `phone-rails`, `board-lock-screens`, `viewer-zoom`, `outline-ghost`, `template-rails-panels` on desktop, iphone and android: 150 passed, 162 skipped (project-gated), 0 failed. Earlier task-level runs: `wings`, `phone-layout`, `desktop-regression`, `undo-redo`, `rocker-blanks` all green (see flakes below).
- `e2e/desktop-baseline.spec.ts` (desktop): 10 of 10 over `--repeat-each=2`; only the outline and rails pictures were re-recorded, after viewing old, new and diff (outline: subtitle only; rails: subtitle, Inputs, View boxes, missing thickness sliders, drawings identical).
- `e2e/prod/slider-dots.spec.ts` (3 dots per rail group now) is type-checked and linted only; it needs a production build, which the orchestrator runs on main.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missed spec: `phone-rails.spec.ts` sideways "Tail section closed" test**
- **Found during:** Task 2 browser run.
- **Issue:** the test closed the Tail section by clicking `aside button` with text "tail", which no longer exists once the arrow became a View box. The plan listed `phone-rails.spec.ts` but not this call site.
- **Fix:** it now clicks the `View Tail Rail` checkbox.
- **Files modified:** `e2e/phone-rails.spec.ts`. **Commit:** `6fb12872`.

**2. [Rule 3 - Blocking] Environment: a stray `node_modules/node_modules` symlink**
- **Found during:** Task 2 unit run (9 `slider-row.test.ts` failures, "Cannot read properties of null (reading 'useId')").
- **Issue:** the cloned `node_modules` carried the main checkout's own `node_modules/node_modules` symlink (absolute, pointing into the main checkout), so Base UI resolved a second copy of React.
- **Fix:** unlinked the symlink in this worktree's own copy (no tracked file touched). Worth knowing for the sibling worktrees if they see the same failure.

### Plan-text adjustments (no behaviour change)
- The RED step of task 2's TDD was not run as a separate failing commit: the pure builder and its tests were written together and went green at once.
- `AdvancedHeading` replaced the old `SectionHeading` in `rail-controls.tsx` (only the Advanced fold uses an arrow now), instead of keeping an unused `small` switch.

## Flakes seen (all passed when re-run alone; the machine was shared with two other executors)
- First `wings`/`undo-redo` pass: 5 failures (preset open and a cold `page.goto`), all green on a re-run, `undo-redo:251` with `--timeout=120000`.
- `board-lock-screens` s-template/s-rails (desktop), p-screens and look-rocker (iphone), x-rails (android): "Unlock Board" never arrived within the spec's own 12-20 s on a cold, loaded server; all green re-run alone.
- **`desktop-baseline` RAILS and TEMPLATE pictures are timing-sensitive.** The spec takes its picture as soon as the first `svg` shows. On a slow cold start that is the server-rendered page before hydration, so RAILS shows its three plots unfitted (huge Nose and Center plots) and TEMPLATE's label boxes are 4 dots narrower. `--update-snapshots=all` recorded those early states twice. The committed pictures are the settled ones: RAILS recorded with `--repeat-each=3` (warm), TEMPLATE copied from the final stable `actual` of a compare run whose diff against the old picture was 366 pixels (the subtitle only). If main shows a RAILS baseline failure with an unfitted plot, re-run it; it is this race, not the change. A one-line wait for `[data-rail-plot-fit="measured"]` in the baseline spec would remove it (not made here: the spec is outside this plan's files).

## Notes for the orchestrator and plans 02/03
- `phone-layout.spec.ts`'s ROCKER half now finds the hand-set section through its intro line (`Hand-set until you pick a blank`, first match, its parent's first slider thumb). Plan 02 must keep that intro and its grid in one wrapper with the nose tip rocker first.
- `rocker-blanks.spec.ts` now asserts the hand-set intro text is absent with a blank picked (holds before and after plan 02).
- `board-lock-screens.spec.ts` is written to hold before and after plan 03: `expectGreyedScreen(page, scope, { mayHaveNoSliders })`, s-volume passes it, s-fins and look-fins open Advanced before the first look, look-volume waits for a tick box.
- The imported line wraps in the 340-dot sidebar mid-figure (`… nose @ 12" · 2` / `1/2" center …`) because the strings are exact; a non-breaking space inside each figure would fix it but changes the exact strings the brief gives. Cosmetic, left as drawn.

## Known Stubs

None.

## Threat Flags

None. Display-only; the View box is `data-lock-exempt`, the import box stays `disabled={locked}` (enforced by `board-lock-scope.test.ts`, green).

## Self-Check: PASSED

- Files: `lib/geometry/rails-imported-line.ts`, `lib/geometry/rails-imported-line.test.ts`, `e2e/template-rails-panels.spec.ts` exist.
- Commits `0463d925`, `6fb12872`, `a8fc7b76`, `3a972dca` are on this worktree's branch.
