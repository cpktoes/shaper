---
phase: quick-261112-lmr
plan: 01
subsystem: 3d-export-preview
tags: [brd, preview, side-profile, bottom, geometry]
requires: [quick-261112-dbi]
provides:
  - lib/geometry/side-profile.ts (sideProfileAt, sideProfileStations, sideProfileLines, SIDE_PROFILE_STEP)
  - Board file preview side view with a rail line, key, Height x1 x2 x4 x8 and two-thickness facts line
affects: [BOTTOM page side profile (next, sketched first)]
key-files:
  created:
    - lib/geometry/side-profile.ts
    - lib/geometry/side-profile.test.ts
  modified:
    - lib/export/brd-preview.ts
    - lib/export/brd-preview.test.ts
    - components/3d/export-cnc.ts
    - components/3d/three-d-screen.tsx
    - components/3d/brd-preview-dialog.tsx
    - components/3d/three-d-copy.ts
    - components/bottom/bottom-section.tsx
    - e2e/three-d-export.spec.ts
    - CLAUDE.md
decisions:
  - Rail line dashed in full muted ink, 1.5 wide (not the GUIDE's 75% push tint, which was too pale against the ink edge)
  - Rail key entry says the line is worked out from the board, not read from the file (orchestrator ruling); the dialog's line under the title is unchanged
  - previewFromFile ("Drawn from the file itself ...") left as it was
metrics:
  tasks: 3
  commits: 3
completed: 2026-11-12
status: complete
actuals:
  tokens: 120000
  tasks: 3
  commits: 3
---

# Phase quick-261112-lmr Plan 01: The side profile at the stringer and at the rail Summary

The Board file preview's side view now draws two bottom lines, the file's own along the stringer and a dashed one at the rail before the rails are shaped, with BOTTOM's own Height x1 x2 x4 x8 buttons (opening at x4), a small key, and a facts line that quotes both thicknesses.

## What a shaper sees

- On a Deep Single Shortboard the dashed rail line sits under the ink stringer line through the concave; on a Rolled Vee it sits over it at the tail; on a flat board and on the Fish only one line is drawn and the key says "at the stringer and at the rail — the same line on this bottom".
- The caption reads `SIDE VIEW · HEIGHT x4` and the Height buttons stand beside it; pressing one stretches the side view's height only. The top and side views keep one length scale, so each slice's line in the top view stays above its line in the side view.
- Measured thicknesses: Deep Single 6'2" Shortboard 2 1/8" at the stringer and 2 1/4" side profile max; Rolled Vee 6'2" 2 1/4" and 2 1/4"; flat Shortboard 2 1/4" and 2 1/4"; flat 5'8" Fish 2 1/2" and 2 1/2". The rail line parts from the stringer by up to 6.35 mm.
- The file's bytes are unchanged: `brdFileWithPreview` still hands back brdFile's own array, and the byte-for-byte tests and browser cases 4 and 7 are green.

## Words for the founder's pen (`components/3d/three-d-copy.ts`)

- `previewFacts`: `22 slices · none more than 4" apart · 6'2" × 18 3/4" · 2 1/8" at the stringer · 2 1/4" side profile max` (Metric: `188.0 × 47.6 cm`, then each thickness with its own cm)
- `previewSideViewAt`: `SIDE VIEW · HEIGHT x4` / `SIDE VIEW · TRUE HEIGHT`
- `previewKeyStringer`: `at the stringer`
- `previewKeyRail`: `at the rail, before the rails are shaped (from your bottom, not in the file)`
- `previewKeyOneLine`: `at the stringer and at the rail — the same line on this bottom`
- `previewSideName` (spoken): "The board file from the side, with its N slices, the bottom at the stringer and at the rail, height x4"

## Choices to note

- `previewFromFile` ("Drawn from the file itself — these are the slices AkuShaper and Shape3D will read.") was left as it was although the rail line and the maximum are worked out from the board; the key's rail entry carries the honesty instead.
- The shared maths takes (resolved bottom, BottomBoard, planed profile's rocker and thickness) in bottom.ts's order, so the BOTTOM page can call `sideProfileLines` with `useDesign()`'s values unchanged. It is pure and tested (flat, Deep Single, Rolled Vee, channels change neither line, DATA's own stringer-left and rail-lift agree exactly, finite on swallow, diamond and Fish).
- The preview's rail line is computed from the channel-less bottom the file was written from (`brdFileBottom`), moved onto the file's own stringer bottom.

## Deviations from Plan

**1. [Rule 3] E2E facts-line updates moved into Task 2's commit.** Changing `brdPreviewWords`/`previewFacts` broke type-checking of cases 1, 10 and 9 in the browser spec, so those updates (and `sideProfileMaxOf`, key/facts checks in case 11) were committed with Task 2 rather than Task 3, to keep tsc clean at every commit. Case 12 and the full three-project runs are Task 3.

**2. [Rule 1/visual] Rail line restyled after looking at the pictures.** The plan's GUIDE push-line token (75% muted tint, 1.2 wide) was too pale to tell from the ink edge when the lines lie a few dots apart. It is now the full muted ink at 1.5 wide with the same 3 2 dash, in the drawing and in the key (`RAIL_LINE` in the dialog). Committed with Task 3.

## Verification

- Vitest (touched files only): side-profile.test.ts, brd-preview.test.ts, board-lock-scope.test.ts all pass (177 tests).
- `npx next typegen` + `npx tsc --noEmit` clean; eslint clean on all touched files.
- `e2e/three-d-export.spec.ts` with PW_PORT=3117: desktop 12 passed / 3 skipped, iphone 11 passed / 4 skipped, android 11 passed / 4 skipped (cases 11 and 12 on all three).
- `e2e/desktop-baseline.spec.ts -g 3D`: passed unchanged (the 3D page's desktop baseline picture with the dialog closed did not change; nothing re-recorded).
- `e2e/board-lock-screens.spec.ts -g 3d`: passed.
- Pictures (all looked at): the two lines clearly told apart on the Deep Single in light and Slate, Rolled Vee line above the stringer at the tail, Fish with one line and the one-line key, x4 pressed, key and facts legible, Cancel and Save in view. Upright iPhone fits whole in one screen (so the `-side` picture matches it); sideways iPhone 844 x 390 shows the side view scrolled into view with key, facts, Cancel and Save.

## Known Stubs

None.

## Threat Flags

None. Nothing leaves the browser; no new request, storage or dependency.

## Self-Check: PASSED

- lib/geometry/side-profile.ts, side-profile.test.ts: FOUND
- Commits dd9cc4e0, 3d71424a, 325ba77a: FOUND on close-bottom-17
- Pictures: 8 PNGs and shoot-source.tar.gz in pictures/: FOUND
