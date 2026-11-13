---
phase: quick-261112-ogx
plan: 01
subsystem: bottom-viewer
tags: [bottom, side-view, viewer, board-file-preview, e2e]
requires: [quick-261112-lmr (lib/geometry/side-profile.ts), sketch 023]
provides: [BOTTOM's SIDE VIEW under the cross-section, bottomViewerSplit, shared side words / rail line / key]
affects: [components/bottom/*, components/3d/brd-preview-dialog.tsx, lib/export/brd-preview.ts]
key-files:
  created:
    - lib/geometry/bottom-side-view.ts
    - lib/geometry/bottom-side-view.test.ts
    - components/bottom/bottom-side-view.tsx
    - components/bottom/viewer-split.ts
    - components/bottom/side-profile-key.tsx
    - components/bottom/station-press.ts
    - e2e/bottom-side-view.spec.ts
  modified:
    - components/bottom/bottom-editor.tsx
    - components/bottom/bottom-top-view.tsx
    - components/bottom/bottom-section.tsx
    - components/bottom/bottom-copy.ts
    - components/3d/brd-preview-dialog.tsx
    - components/3d/three-d-copy.ts
    - lib/export/brd-preview.ts
    - lib/geometry/bottom-draw.ts
    - CLAUDE.md
decisions:
  - "Side view opens at x1, caption SIDE VIEW · TRUE HEIGHT (the preview's own words)"
  - "Short-screen floor 470 dots for the three drawings"
  - "Preview opens its side view at x1"
status: complete
metrics:
  tasks: 3
  commits: 3
actuals:
  tokens: 120000
  tasks: 3
  commits: 3
---

# Phase quick-261112-ogx Plan 01: BOTTOM draws the side profile under the cross-section Summary

BOTTOM's VIEWER now draws three drawings top to bottom — the board from below, the cross-section, and a SIDE VIEW (deck, bottom at the stringer, dashed bottom at the rail where it parts) opening at true height, on the board from below's own length scale so the section's station line runs straight through all three; the Board file preview's side view opens at x1 too and shares its words, rail line and key.

## Commits (code only; docs are the orchestrator's)

- `acc836ed` Task 1 (tracer): pure split and side frame with tests, the side view drawn in VIEWER at x1, station line, desktop spec.
- `73298c70` Task 2: tap and drag, wide point and fins, key and facts, shared words/rail line/key with the preview, preview opens at x1.
- `e556e48b` Task 3: phone and touch specs, short-screen floor, CLAUDE.md clause.

## Measured split (dots, the three drawing boxes)

| Window | x1: board from below / cross-section / side view | x4: board from below / cross-section / side view |
|---|---|---|
| 1280 x 800 desktop | 224 / 179 / 61 | 184 / 148 / 132 |
| 390 x 844 iPhone (whole screen) | 163 / 132 / 46 | 140 / 113 / 88 |
| 412 x 839 Pixel 7 (its own profile window) | 162 / 130 / 46 | 139 / 112 / 87 |
| 390 x 664 (Playwright's iPhone 14 window, Safari's bar taken) | 105 / 85 / 32 | 97 / 80 / 45 |

On the 390 x 844 iPhone the controls beneath the pinned drawing keep 238 dots, from y 606 (sketch 023 measured 239); the card is still pinned at 66% of the screen. Beside the three boxes the card holds the three captions' rows, the key row (16), the facts row (16) and Section at (20).

Short-screen floor: the wrapper's minimum on a short screen went from 360 (two drawings) to 470. Sideways iPhone (844 x 390 and 844 x 340) and Pixel 7 (863 x 393 and 863 x 360), at x1: board from below 153, cross-section 123, side view 44. (460 left the board from below at 148, under the 150 the sideways spec holds it to; 480 left 158 / 127 / 45.)

## Choices the plan left open

1. At x1 the side caption reads `SIDE VIEW · TRUE HEIGHT` (the preview's own caption; one formatter, `sectionHeightLabel`, for both).
2. The split is one pure function (`bottomViewerSplit`) from the measured room: the side view takes what its drawing needs (at most 40% of the three boxes' height, fitted beyond that with the factor drawn in the caption); the board from below and the cross-section share the rest 1.25 : 1, the board from below never taller than its board needs at full width.
3. The rail line is drawn only where it parts from the stringer's (0.05 mm, sketch 023's rule); the key's one-or-two decision is the preview's 0.25 mm rule; the preview keeps drawing its rail line whole.
4. The side view's Height buttons are spoken `Side view height ×N`; the preview's buttons take those names too.
5. The grab dot stays on the board from below only; the side view has the dash-dot line and an invisible 44-dot grab zone.
6. Section at stays the last row, under all three.
7. No BOTTOM desktop baseline picture exists in `e2e/desktop-baseline.spec.ts-snapshots`; none was added. The baseline run passes with every picture unchanged, nothing re-recorded.

## Deviations from Plan

**1. [Rule 3 - Blocking] `bottom-side-view.tsx` is not in the lock inventory's file list.** The inventory test requires every listed file to hold a button/slider tag; the side view has none of its own (its buttons are the shared HeightPicker in `bottom-section.tsx`). Instead the BOTTOM view-controls case now reads the side view's press box and proves `onPointerDown` + `data-lock-exempt`, that it holds no interactive tag, and that it uses `HeightPicker which="side"`. The case's regex for the phone row's click handler became `onLive(section)` (the row moved into `ViewerDrawings`). Commit 73298c70.

**2. [Rule 3 - Blocking] `lib/units-isolation.test.ts`:** the list of hand-rounded drawing facts allows the side view's `data-height` and `data-bottom-side-cut-at` (four lines now, three patterns). Commit 73298c70.

**3. [Rule 1 - Bug in tests the drawing moved] `e2e/bottom-viewer.spec.ts`:** the Height walk (x8 at 1/4", fitted at 1/2") needed a section box taller than 179, so its window is 1280 x 900 (box 804 x 234, the old note's own figure). The phone tap/drag helper now takes a share of the drawn board, not of the svg box, because a short 664-dot iPhone window draws the board narrower than its box and a tap past the tip clamped to it. 

**4. Structure:** the three drawings, phone row and Section at moved into a `ViewerDrawings` component in `bottom-editor.tsx` so the measuring hook mounts and unmounts with the VIEWER tab (the editor itself renders on every tab).

No sideProfileLines cost problem: it is memoised per bottom and was not deferred (not measured above 8 ms on a Longboard; the wide-box Playwright runs show no drag lag) — noted, not timed with a profiler.

## Verification (every run, PW_PORT=3117)

- Vitest (touched files alone): bottom-side-view, bottom-draw, side-profile, bottom-copy, brd-preview, board-lock-scope, units-isolation: all pass. `npx next typegen` + `npx tsc --noEmit` clean; eslint clean on touched files.
- Browser, desktop / iphone / android: `bottom-side-view` 8+2 skipped / 10 / 10 pass; `bottom-viewer` 15 / 1 / 1; `bottom-screen` desktop 2 pass (phones skipped); `bottom-panel` 14 / 5 / 5; `bottom-guide` 8 / 2 / 2; `bottom-metric` 1 / skipped / 1; `bottom-saving` 4 / 4 / 4; `bottom-wings` 3 / 2 / 2; `phone-bottom` all 6 pass on iphone and android (desktop skips); `three-d-export` 12 / 11 / 11 (phone-profile cases skipped on desktop); `touch-sizing -g BOTTOM` iphone and android pass (desktop skips); `board-lock-screens -g bottom` 2 / 1 / 1; `desktop-baseline` 6 pass, no picture changed. No load flakes seen; the side-view spec's `afterEach` fails on any page error naming ResizeObserver and none occurred.
- The .brd writer was not touched; the existing byte-for-byte tests in `three-d-export` (cases 1, 4, 7) pass.

## Pictures (each looked at)

In `pictures/`: bottom-desktop-deep-single, bottom-desktop-deep-single-slate, bottom-desktop-rolled-vee, bottom-desktop-flat, bottom-desktop-x4, bottom-desktop-metric, bottom-phone-upright (390 x 844), bottom-phone-sideways (scrolled to the side view) and bottom-phone-sideways-top, preview-x1, plus two 3x zooms of the side view (daylight and slate) and `shoot-source.tar.gz`. Seen: three drawings in order, the station line straight through the board from below, the section and the side view; the dashed rail line legible against the ink edge in light and dark; key and facts whole; the side caption and its four buttons on one row on the phone; the ruler's `7 3/8"` and gauges whole in the 1280 x 800 section; Metric reads `5.5 cm at the stringer · 5.7 cm side profile max`.

## Known observation (pre-existing, not fixed)

On a phone held sideways (picture bottom-phone-sideways) the cross-section's box is 123 dots and the ruler's value (`7 3/8"`) under the straightedge is cut at the box's lower edge. The box was shorter still before the side view existed (about 100 dots at the old 360 floor), so this is not new; raising the floor to clear it would add scroll. Flagged for the founder's look.

## Known Stubs

None.

## Self-Check: PASSED

Files exist (bottom-side-view.ts/.test.ts, bottom-side-view.tsx, viewer-split.ts, side-profile-key.tsx, station-press.ts, bottom-side-view.spec.ts, nine required pictures); commits acc836ed, 73298c70, e556e48b exist on close-bottom-17.
