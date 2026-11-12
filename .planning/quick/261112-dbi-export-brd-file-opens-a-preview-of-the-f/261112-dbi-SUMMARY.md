---
phase: quick-261112-dbi
plan: 01
subsystem: 3d-export
tags: [brd, export, preview, dialog, 3d]
requires: [261112-c2d]
provides:
  - "Export .brd File opens a Board file preview drawn from the file's own bytes; Save .brd File inside it downloads them"
affects: [components/3d, lib/export, e2e]
key-files:
  created:
    - lib/export/brd-preview.ts
    - lib/export/brd-preview.test.ts
    - components/3d/brd-preview-dialog.tsx
  modified:
    - components/3d/export-cnc.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - components/design/board-lock-scope.test.ts
    - e2e/three-d-export.spec.ts
    - e2e/board-lock-screens.spec.ts
    - CLAUDE.md
decisions:
  - "P-1..P-10 of the plan, with the two layout tunings under Deviations"
status: complete
metrics:
  completed: 2026-11-12
actuals:
  tokens: 19300
  tasks: 3
  commits: 3
---

# Quick 261112-dbi: Export .brd File opens a preview of the file before it is saved

**Pressing Export .brd File on the 3D page now opens a "Board file preview" that draws the board from above with a line across it at every slice, the picked slice large, and the board from the side, all read back from the file's own bytes. Nothing is downloaded until Save .brd File is pressed inside it.**

## What a shaper now sees

Export .brd File makes the file exactly as before, then reads it back (unlock, then read) and draws what it finds, never the board on screen, so the picture cannot disagree with the file. The dialog says so in one line: "Drawn from the file itself — these are the slices AkuShaper and Shape3D will read."

Stacked, top to bottom:
- **TOP VIEW**: the outline mirrored about a faint stringer, nose at the left, a thin line across at every slice as wide as the outline there.
- **SLICE**: the picked slice's whole cross-section (mirrored, with the points the file carries as small dots), under a caption with the two arrow buttons and `Slice 11 of 22 · 36" from the tail` (in centimetres in Metric).
- **SIDE VIEW**: bottom and deck along the stringer, an upright line at every slice, at true height.

Pick a slice by tapping or clicking either view (it takes the nearest line), by the two arrow buttons, or by the left and right arrow keys. It opens on the slice nearest the wide point. Under the drawings: `22 slices · none more than 4" apart · 6'2" × 18 3/4" × 2 1/8"` read from the file, then the swallow and channels notes when they apply. Cancel (left) and Save .brd File (right, accent) are pinned at the bottom. Save downloads the very bytes the preview was drawn from, inside the tap; Cancel, Escape and a click outside close it and save nothing. The file's bytes are unchanged (a test compares them with what the writer makes).

Test boards' slice counts: flat Shortboard 20, Fish 19, Deep Single Shortboard (channels left out, as the page writes it) 22. Every slice line's width matches the outline there within 0.5 mm, and every upright line matches the slice's own thickness within 0.5 mm; the Deep Single's middle slice dips more than 1 mm below the stringer, the flat one does not.

## The five pictures (`pictures/`)

All looked at one by one; nothing clipped, no slice line outside the outline, the selected slice marked in both views and drawn in SLICE, both buttons in view.
- `preview-desktop-light-deep-single.png`: computer, Daylight, Shortboard with a Deep Single and 4 channels, opened on slice 11 of 22; the concave shows in SLICE as a shallow bottom dip at the stringer; the channels note shows.
- `preview-desktop-dark-deep-single.png`: the same in Slate; lines, dots and board edge read clearly.
- `preview-desktop-fish.png`: the Fish, 19 slices, the swallow note showing, square tail drawn as the file writes it.
- `preview-phone-upright.png`: iPhone 14 upright; the three drawings stacked, finger-sized arrow buttons, Cancel and Save pinned.
- `preview-phone-sideways.png`: the 844 × 390 iPhone; the drawings scroll in the middle while the header and both buttons stay put; `preview-phone-sideways-scrolled.png` shows the lower half (SLICE, SIDE VIEW, facts, note) after scrolling. `shoot-source.tar.gz` is the picture script.

## Choices for the founder's pen (P-1 to P-10)

P-1 nose at the left like BOTTOM and ROCKER; slices numbered from the tail; ‹ and the left key move toward the nose. P-2 no stretch: the side view is true height at the top view's scale, so each slice line sits exactly above its twin; the SLICE is true height too at one scale for every slice. P-3 slice lines in the station dash, the selected one in BOTTOM's cutting-line dash. P-4 the SLICE shows the file's own knots as small dots, unnamed. P-5 "slices" are the fitted cross-sections (the done line's count); the gap counts the tip-closing ends too. P-6 opens near the widest knot. P-7 a tap anywhere on a view picks the nearest slice. P-8 Cancel left, Save right, no ✕. P-9 shared dialog size classes, column centred. P-10 a failure making the file shows the page's failed line with no dialog; a failure at Save closes the dialog and shows it.

The words are mine, for the founder's pen: `previewSliceLine`, `previewFacts`, `previewTowardNose` ("Slice toward the nose"), `previewTowardTail`, and the three drawings' spoken names, in `components/3d/three-d-copy.ts`.

## Deviations from Plan

**1. [Rule 1 - Bug] Dialog scrolled itself on open.** Focus started on the first button in the scrolling body, which scrolled the drawings out from under the header on a short screen. Focus now starts on Cancel in the pinned footer. Commit 59aaf292.

**2. [Layout tuning] Column width.** The plan's 1000-dot column left the notes below the fold at 1280 × 800; the column is 760 dots on a computer and 560 on a short screen (so a sideways phone's top view is not the whole screen). Commit 59aaf292.

**3. [Rule 3 - test] The development server's round Next.js badge covered a phone's Cancel.** The export spec hides it in its own browser (a deployed site has none); the dialog's zoom-in animation is waited out before measuring box sizes. Commit 1bba2329.

**4. TDD order.** Task 1's tests were written together with the module rather than shown failing first; the tests did exercise the finished module (60 cases) and would fail on a wrong read.

## Verification

- `npx vitest run lib/export/brd-preview.test.ts components/design/board-lock-scope.test.ts`: 91 passed.
- `npx next typegen`, `npx tsc --noEmit`, `npx eslint` on touched folders: clean.
- `e2e/three-d-export.spec.ts` on desktop (10 passed, 3 phone cases skipped), iphone (9 passed) and android (9 passed), the rest skipped by design.
- `e2e/board-lock-screens.spec.ts -g 3d` and `e2e/desktop-baseline.spec.ts -g 3D` on desktop: both pass. **The 3D desktop baseline held unchanged; nothing was re-recorded.**
- No dev server was left running on 3117; the whole Vitest suite and `npm run build` were not run, as instructed.

## Known Stubs

None.

## Self-Check: PASSED

Files exist (`lib/export/brd-preview.ts`, `.test.ts`, `components/3d/brd-preview-dialog.tsx`, five pictures); commits e7fc9fca, 59aaf292, 1bba2329 exist on close-bottom-17.
