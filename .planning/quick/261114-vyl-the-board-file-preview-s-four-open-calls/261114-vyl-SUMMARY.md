---
quick_id: 261114-vyl
title: The board-file preview's four open calls
date: 2026-11-14
status: complete
commits: [6792693c, 6f8b06a9, 33dccef8, 786f321a, 56ebfe70]
---

# The board-file preview's four open calls — summary

## What changed, in plain words

Four things the founder ruled on 2026-11-14 for the preview that opens when a `.brd` board file is picked:

1. **A TRI is a Thruster** (`6792693c`). A file with a side pair and a centre fin — what AkuShaper calls TRI — always opens as a
   Thruster now, never as a 2+1 or an Upright + Trailer, however close one of those would have landed. Where a Thruster's own
   sliders stop short of a mark the preview says which control and by how much, as it already did for a twin.
2. **How-close figures round up** (`6f8b06a9`). A 2.07 mm miss used to read "within 1/16"" because the mark rounded to the
   nearest sixteenth. Every how-close figure — the outline, rocker and thickness lines, the bottom's, the rails' and each rail
   cell's, the fins' and how far a fin control fell short — now reads the next sixteenth up (the next whole millimetre in
   Metric); only nothing at all off still reads "less than 1/16"". The printed overview reads the same sheet, so it shows the
   same figure.
3. **A Height picker on the RAILS block** (`33dccef8`). The three rail cross-sections get BOTTOM's ×1 ×2 ×4 ×8 buttons,
   opening at true height exactly as they always drew; a taller pick stretches the rails up on the same scale across (held to
   a drawing as tall as it is wide), the caption says what was drawn, and the printed overview draws the pick in hand. The
   BOTTOM block's sections and the side view keep their own picks.
4. **Tail Rail Blends From and Ends At are fitted** (`786f321a`). When the fitted tail rail differs in character from the
   centre's, the two sliders are searched on their own 1/2" grids so our sections between the tail 12" and the centre land
   closest on the file's, with the rail fit's own move-gain and prune rules. The RAILS table gets a Tail Rail blend row, the
   Rails controls line carries the two, and a note says how close over how many sections — or why the two were left where a
   new board puts them (the tail's rail is the centre's; too few sections between). The opened board carries them to RAILS.

## How

- `lib/geometry/brd-fins.ts`: the three-fin candidates are the four Thruster front models.
- `lib/geometry/units.ts` `formatInchesFractionUp` / `formatWholeMmUp`; `measure-display.ts` `formatGapMark`, the one the
  preview's gaps read through (settings and sizes keep `formatMark` / `formatMarkOrLess`).
- `lib/export/brd-fit-preview.ts` `brdRailFrames(rows, look, height)` with `heightAsked` / `heightDrawn`; the dialog and
  `build-brd-overview-pdf.ts` caption the drawings from the frames.
- `lib/geometry/brd-rails.ts` `fitBrdTailBlend`, `brdRailsSpec(settings, foil, blend)`, `BrdRailsFit.blend`; `brdFitLook` fits
  the blend after the rails in both orders.

## Proof

- `npm test` green: 233 files, 13,784 tests (a first run of the whole suite had two failures that a second whole run did not
  reproduce — load flakes under the 11-minute run, neither in a file this task touched). New: the TRI rule and the round trip allowing only a reported shortfall; the two round-up
  formatters' boundaries and a sweep; `brdRailFrames` at ×1, ×4 and a capped pick; the blend round trips (a Hard Edge tail
  written 18"–28" comes back within 1/2" of each, 14"–20" too; default-written files come back on the defaults; same-rail and
  too-few-sections leave the two alone; the opened board reads them back).
- `e2e/brd-fit-preview.spec.ts`, the whole file on the computer, the iPhone and the Pixel: 60 passed, 47 skipped (the
  device-specific ones), 10 failed under the 13.5-minute load; rerun alone, nine passed and b28 on the iPhone still timed out
  waiting the default five seconds for the rounded wing's preview — the heaviest look, now with the blend search in it — so
  it waits the 60 s b22 gives (a test-only change, commit 56ebfe70), after which b28 and b31 passed on both
  phones. Every test touched here (b23, b24, b34a, b38) passed on every device the first time.
- Pictures in `pictures/`: the RAILS block at true height and at the ×4 pick (held to ×3.3 on this board) on a computer, the
  ×4 pick on an iPhone, and the Tail Rail blend row of a file written to blend 18"–28" (read back 17 1/2"–28 1/2").

## Limits

- The blend is read from the file's few sections between the tail and the centre (4" apart on the app's own files), so a pair
  whose smoothstep those sections cannot tell apart from another's lands on the one that moves fewer sliders; a Blends From
  written 20" with Ends At at the centre came back 23". The bottom's reading widths are still read with a new board's blend.
- A rail fit that aligns the tail to the centre leaves nothing to blend, and the note says so.
