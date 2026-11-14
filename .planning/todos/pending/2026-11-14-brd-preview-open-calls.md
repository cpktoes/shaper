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
