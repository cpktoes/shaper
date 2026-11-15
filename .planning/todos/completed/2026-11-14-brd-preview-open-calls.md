---
created: 2026-11-14
title: The board-file preview — the founder's open calls
area: ui
severity: minor
files:
  - lib/export/brd-fit-preview.ts
  - components/setup/brd-fit-dialog.tsx
  - lib/geometry/brd-fins.ts
  - lib/geometry/brd-rails.ts
source: quick tasks 261113-kvo and 261113-qyz, put to the founder 2026-11-13, not answered
resolves_phase:
---

# The board-file preview — the founder's open calls

## Problem

Four things were put to the founder and left as built:

- A file with side fins and a centre fin opens as whichever of Thruster, 2+1 or Upright + Trailer lands closest; on his twin's
  board a test file with a centre fin added opens as Upright + Trailer. He may want AkuShaper's TRI always to open as a Thruster.
- The how-close figures round to the nearest sixteenth, so a 2.07 mm gap reads "within 1/16"" though it is a hair over.
  Rounding up would be more honest.
- The RAILS block draws the rails at true height, so they are small and the two lines hide each other where they agree. A Height
  picker like BOTTOM's would help.
- Tail Rail Blends From and Ends At are not fitted from a file; they open where a new board puts them.

Also not done: opening a `.brd` on the live site itself (the feature was proved against a production build on this machine).

## What is needed

His word on each, then a small task for whichever he wants. The live-site check is his to try with one of his own files.

## Ruled (2026-11-14)

The founder picked all four: a TRI always opens as a Thruster; the how-close figures round up; a Height picker (×1/×2/×4/×8) on the preview's RAILS block; Tail Rail Blends From and Ends At fitted from the file. One quick task, or one per item. The live-site check of a .brd stays his to try.

## Done (2026-11-14, quick 261114-vyl)

All four built, each its own commit on the worktree's branch, with unit tests on the pure code and the board-file browser
spec extended for the two that change the screen:

- `6792693c` — a TRI always opens as a Thruster (`lib/geometry/brd-fins.ts`).
- `6f8b06a9` — every how-close figure rounds up (`formatInchesFractionUp` / `formatWholeMmUp` in `units.ts`,
  `formatGapMark` in `measure-display.ts`); the printed overview reads the same sheet.
- `33dccef8` — the RAILS block's Height picker (×1 ×2 ×4 ×8, opening at true height), on the screen and the printed page.
- `786f321a` — Tail Rail Blends From and Ends At fitted from the file's sections between the tail and the centre
  (`fitBrdTailBlend` in `brd-rails.ts`), a Tail Rail blend row, the note and the controls line; the opened board carries them.

The live-site check of a `.brd` stays the founder's to try.
