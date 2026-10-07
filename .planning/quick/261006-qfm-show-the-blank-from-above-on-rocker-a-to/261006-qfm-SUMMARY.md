---
phase: quick-261006-qfm
plan: 01
subsystem: rocker
status: complete
tags: [rocker, blank, top-view, viewer, phone, svg]
requires: [phase-11 (blanks), phase-14 (curves and tips), quick-260909-hd9 (toolbar row)]
provides:
  - "the picked blank seen from above, with the board's TEMPLATE outline on it, its stringer, centre mark and two 12-inch marks"
  - "a mini display over the VIEWER panel's top-left corner on a computer, with a fourth toolbar button to hide and show it"
  - "a third TOP VIEW tab on an upright phone, a phone held sideways, or any narrow or short window"
affects: [components/rocker/rocker-editor.tsx, components/rocker/rocker-view-frame.ts, components/design/use-viewer-media.ts, e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png]
actuals:
  tokens: 17500
  tasks: 3
  commits: 5
tech-stack:
  added: []
  patterns:
    - "screen-pinned line weights and dashes (pixel constant × handleUnit) for a drawing shown far below one pixel per unit, with a unit test tying the dash numbers to the CSS tokens"
    - "a derived active tab (requested tab if it exists in the current list, else VIEWER) instead of an effect, for a tab that only exists on some screens"
key-files:
  created:
    - lib/geometry/blank-top-view.ts
    - lib/geometry/blank-top-view.test.ts
    - components/rocker/rocker-top-view.tsx
    - e2e/rocker-top-view.spec.ts
  modified:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-editor.tsx
    - components/viewer/toolbar-button.tsx
    - components/viewer/toolbar-button.test.ts
    - components/design/use-viewer-media.ts
    - lib/units-isolation.test.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
key-decisions:
  - "The mini display's box shipped in the planned form (D-18 primary): the size class on the plate, the aspect ratio on a relative box inside it; the fallback was not needed in Chromium or WebKit"
  - "The board's line in the top view is 1.5 screen pixels (D-17), offered to the founder to overrule from the pictures"
  - "The two media hooks are called on separate lines, never short-circuited, because the rules-of-hooks lint rejects `a() || b()`"
requirements-completed: [QT-261006-qfm]
metrics:
  duration: ~47 min
  completed: 2026-10-06
---

# Quick 261006-qfm: Show the blank from above on ROCKER — Summary

**ROCKER now shows the picked blank from above, with its stringer, centre mark and 12-inch marks and the board's own outline sitting on it where the Placement slider puts it: a small drawing in the VIEWER panel's top-left corner on a computer (with a button to hide it), its own TOP VIEW tab on a phone.**

## What a shaper now sees

- **On a computer** (the desktop layout, taller than 500 dots): a small drawing on its own plate in the top-left corner of the ROCKER viewer, clear of the toolbar. With a blank picked, it shows the blank in the foam shade with a thin edge, the board's TEMPLATE outline on it (the same shape the phone's TEMPLATE tile and the Board Rack draw, so a swallow shows its notch and a diamond its point), the blank's stringer as a dash-dot line tip to tip, a centre mark, and the two 12-inch marks measured in from each blank tip. There is no text and no figure on it. Moving the Placement slider moves the board in the side view and in this drawing together; the blank stays still. Rotate stands it up in the free column beside the standing side view. With the measuring points on, plain dots mark every width the catalogue prints, both sides of the blank. With no blank picked it is the board's outline alone.
- **A fourth toolbar button** at the left end of the row hides and shows it. It starts on ("Hide the blank from above"), and reads "Show the blank from above" once hidden. It is not there on a phone or on a short screen.
- **On an upright phone, a phone held sideways, or any narrow or short window**: VIEWER is the side view alone, and a third tab, TOP VIEW, shows the same drawing filling the panel, standing up on an upright phone and lying flat on a sideways one. If the window is widened while TOP VIEW is open, the screen lands back on VIEWER with the corner drawing showing.
- **Unchanged:** the side view itself (same size, place, spoken name and frame), the Summary order form, every print, and every saved board.

## Commits

| Hash | Subject |
|------|---------|
| 2d5ffcd | Tests: the blank seen from above, and its own small drawing frame (fail until the next commit) |
| d5830d1 | Work out the blank and the board as seen from above, ready to draw small |
| 24c47f3 | ROCKER shows the blank from above: a small drawing in the corner on a computer, its own tab on a phone |
| e78f8b7 | Browser proof that ROCKER shows the blank from above, in the corner on a computer and as a TOP VIEW tab on a phone; the ROCKER reference picture re-recorded |
| (final) | docs(quick-261006-qfm): summary and pictures — the blank from above on ROCKER |

## RED evidence (Task 1, commit 2d5ffcd)

`npx vitest run lib/geometry/blank-top-view.test.ts components/rocker/rocker-view-frame.test.ts` before the implementation: 2 files failed, 7 tests failed, 80 passed (every existing frame test passed untouched).

```
FAIL  lib/geometry/blank-top-view.test.ts
Error: Cannot find module './blank-top-view' imported from lib/geometry/blank-top-view.test.ts
FAIL  rockerTopViewLayout — the top view's own frame (quick 261006-qfm) > fits the whole drawn span into the drawing area, ...  TypeError: rockerTopViewLayout is not a function
FAIL  ... > holds the drawn extent's four corners inside the frame, both orientations  TypeError: rockerTopViewLayout is not a function
FAIL  ... > measures 836.00 × 232.39 for a 72-inch board 19 inches wide, and the same turned nose-up  TypeError: rockerTopViewLayout is not a function
FAIL  ... > leaves exactly TOP_VIEW_EDGE_PAD round the drawn extent on every side  TypeError: rockerTopViewLayout is not a function
FAIL  ... > turns a corrupt length, overhang or half-width into a finite frame, ...  TypeError: rockerTopViewLayout is not a function
FAIL  the top view's screen-pinned line weights and dashes (D-17) > draws the stringer and station dashes with the same numbers as the two CSS tokens  TypeError: Cannot read properties of undefined (reading 'join')
FAIL  ... > pins every line weight and dot to a finite, positive number of screen pixels  AssertionError: expected false to be true
```

GREEN (commit d5830d1): the same command, 2 files, 116 tests passed.

## Test results

| Command | Result |
|---------|--------|
| `npx vitest run` (after each task, final run) | 125 files, 4483 passed, 2 skipped, 0 failed. (The very first full run after Task 1 showed one failure that did not repeat on an immediate re-run, under a cold, loaded machine; every later run was clean.) |
| `npx tsc --noEmit` | clean (after `npx next typegen` once, for the worktree's route types) |
| `npm run lint` | clean |
| `PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts --project=desktop` (Task 2 smoke) | 19 passed |
| `... npx playwright test e2e/rocker-top-view.spec.ts` | 14 passed (desktop 9, iphone 3, android 2), 25 skipped by design (each describe runs on its own project) |
| `... e2e/desktop-baseline.spec.ts --project=desktop -g "ROCKER"` before re-recording | failed as expected: 2032 pixels differ |
| `... e2e/desktop-baseline.spec.ts --project=desktop` after re-recording | 5 passed |
| `... e2e/viewer-toolbar.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/phone-screens.spec.ts e2e/new-board.spec.ts` | 82 passed (iphone 25, android 28, desktop 29), 32 skipped, 0 failed |
| `... e2e/phone-chrome.spec.ts e2e/phone-layout.spec.ts e2e/touch-drag.spec.ts e2e/phone-sideways-top-bar.spec.ts` | 98 passed (iphone 33, android 41, desktop 24), 160 skipped, 0 failed |
| `... e2e/rocker-cut.spec.ts e2e/touch-sizing.spec.ts e2e/old-safari-buttons.spec.ts e2e/blank-makers.spec.ts e2e/step-nav.spec.ts e2e/undo-redo.spec.ts e2e/summary-blank.spec.ts e2e/summary-planing.spec.ts` | 202 passed (iphone 70, android 70, desktop 62), 50 skipped, 0 failed |
| `... e2e/phone-rails.spec.ts -g "ROCKER DATASHEET"` | 4 passed (iphone 2, android 2), 2 skipped |
| Out-of-scope paths since the plan commit (`app`, `components/summary`, `components/outline`, `components/ui`, `lib/blanks`, `db`, `CLAUDE.md`, the other four desktop pictures) | none touched |

## The ROCKER reference picture, re-recorded on purpose (D-07)

The diff image, inspected before re-recording, showed exactly two changed areas (2032 pixels): the new fourth button at the left end of the toolbar (drawn in its "on" colour), and the corner drawing's plate and the default board's outline. The side view, its station cards, the sidebar and the top bar did not move. Rendered by the webpack dev server on port 3143 in this worktree.

SHA-256 prefixes, before → after:

| Picture | Before | After |
|---------|--------|-------|
| outline-desktop | ef4fa37e…c0 | ef4fa37e…c0 (unchanged) |
| rocker-desktop | 5c8698df…0d | 175341c0…3e (re-recorded) |
| rails-desktop | 6c2c6b2b…73 | 6c2c6b2b…73 (unchanged) |
| volume-desktop | 4c0d673a…d9 | 4c0d673a…d9 (unchanged) |
| fins-desktop | a925ba15…62 | a925ba15…62 (unchanged) |

## Existing assertions that changed

- `e2e/viewer-toolbar.spec.ts`, the ROCKER desktop row: `expectedCount` 3 → 4, the plan's named exception. The new button is DOM-last, so it sits 120 px in on the same 40 px step.
- `components/viewer/toolbar-button.test.ts`: ROCKER's count of toolbar buttons in its source, 3 → 4. This is the same kind of assertion (it counts ROCKER's toolbar buttons) but the plan did not name it; see Deviations.

## The mini display's box (D-18)

**The planned form shipped.** The plate carries the size (`w-[36%] max-w-[360px]` nose-left, `h-[45%] max-h-[450px]` nose-up), and a `relative` box inside it carries the frame's own aspect ratio. Chromium (desktop, nose-up after Rotate) and WebKit (iPhone project at 820 × 1180, an upright iPad-sized touch screen) both passed the collapse checks (width at least 30, height at least 100) and the size limits. The fallback was not needed.

## The board line, for the founder to judge (D-17)

The board's outline in the top view is drawn at **1.5 screen pixels**: heavier than the blank's hairline (1 pixel), lighter than a full-size drawing's ink. The marks and the stringer are 1 pixel, with the app's own stringer and station dashes read in screen pixels. The founder can overrule the 1.5 from the pictures; it is one constant, `TOP_VIEW_BOARD_LINE_PX` in `components/rocker/rocker-view-frame.ts`.

## Pictures (in `pictures/`)

- `rocker-desktop-blank.png`: a computer, nose left, the first fitting blank (US Blanks 6'2"A) picked, the corner drawing showing the blank, board, stringer and three marks.
- `rocker-desktop-nose-up.png`: the same after Rotate; the corner drawing stands up in the free column left of the standing side view.
- `rocker-desktop-hidden.png`: after "Hide the blank from above"; the corner is empty and the button is no longer filled.
- `rocker-iphone-top-view.png`: an upright iPhone, the TOP VIEW tab, the board standing in the blank.
- `rocker-iphone-sideways-top-view.png`: an iPhone held sideways (844 × 390), the TOP VIEW tab, the board lying flat in the blank.

The "Copy preset values" button and the round "N" badge (which reads "Compiling…" or "Rendering…" in two of the desktop pictures) are development-only and never appear on the live site.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] The new drawing file had to be added to the units ledger**
- **Found during:** Task 2 (full unit run)
- **Issue:** `lib/units-isolation.test.ts` fails for any screen file that reads the units module without being named in one of its two lists. `rocker-top-view.tsx` converts millimetres to inches for drawing.
- **Fix:** added it to `DESIGN_SCREEN_DISPLAY_FILES` as `converted: true`. This is stricter, not looser: the file now also has to import the display boundary (it does, for the 12-inch / 30.5 cm wording in its spoken name) and must never call a banned formatter.
- **Files modified:** lib/units-isolation.test.ts. **Commit:** 24c47f3

**2. [Rule 3 - Blocking] A second ROCKER toolbar count the plan did not name**
- **Found during:** Task 2 (full unit run)
- **Issue:** `components/viewer/toolbar-button.test.ts` counts the toolbar buttons in ROCKER's source and expected 3.
- **Fix:** 3 → 4, with a comment naming quick 261006-qfm. It is the same kind of count the plan allows changing (ROCKER's toolbar buttons), in a unit test rather than the browser test.
- **Files modified:** components/viewer/toolbar-button.test.ts. **Commit:** 24c47f3

**3. [Rule 1 - Lint] The two media hooks are called on separate lines**
- **Found during:** Task 2 (lint)
- **Issue:** `useBelowShellWidth() || useShortScreen()` is a conditional hook call (react-hooks/rules-of-hooks).
- **Fix:** both are called unconditionally into constants, then combined. Same behaviour.
- **Commit:** 24c47f3

**4. [Rule 1 - Test] "Visible" for the stringer and the three marks**
- **Found during:** Task 3 (first run of the new spec)
- **Issue:** Playwright reports a perfectly horizontal or vertical `<line>` as hidden, because its bounding box has zero height or width. The stringer and the marks are exactly such lines, so `toBeVisible()` failed on them even though they were drawn.
- **Fix:** the new spec checks those lines with a small helper: exactly one present, not hidden by any parent (a bounding box exists), and at least one dot long on screen. The blank and the board still use `toBeVisible()`. This was in the new spec only; no existing assertion changed.
- **Commit:** e78f8b7

**5. [Scratch only] The pictures script**
- The pictures config used `__dirname` instead of `import.meta.url` (Playwright loads it as CommonJS), and the sideways-iPhone picture test needed a longer timeout on its first, cold run (it took 8 seconds on the re-run). Scratch folder only; deleted afterwards.

None of these changed anything a shaper sees beyond what the plan describes.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, network call, saved field or file access: the toggle and the tab are screen state only, and the blank's vendor and name reach the drawing only as a plain spoken-name attribute (T-qfm-01). The plate passes every pointer through (`pointer-events-none`, T-qfm-03), and the mouse drag across the drawing in `desktop-regression.spec.ts` still passes.

## Follow-ups for the orchestrator

- Run the full browser suite on `main` after the merge.
- Re-check `rocker-desktop.png` under Turbopack from the main checkout. If it disagrees, re-record ROCKER once there, as the earlier entries in `e2e/desktop-baseline.spec.ts` allow.
- The founder looks at the five pictures before anything is pushed, including the 1.5-pixel board line.
- Consider one CLAUDE.md note. The Layout section's short-screen list, and `use-viewer-media.ts`'s doctrine, now have a fifth thing that height decides (with width): ROCKER's top view moves from a corner drawing into its own TOP VIEW tab. It reads the same two lines the CSS rules draw and decides which tabs exist, never the layout.
- Resolved: the planner's earlier caveat ("swallow tails draw square") no longer applies. The board's outline is TEMPLATE's own silhouette, so a swallow shows its notch and a diamond its point. The unit tests prove this for a swallow.

## Self-Check: PASSED

- FOUND: lib/geometry/blank-top-view.ts, lib/geometry/blank-top-view.test.ts, components/rocker/rocker-top-view.tsx, e2e/rocker-top-view.spec.ts, all five pictures
- FOUND commits: 2d5ffcd, d5830d1, 24c47f3, e78f8b7
