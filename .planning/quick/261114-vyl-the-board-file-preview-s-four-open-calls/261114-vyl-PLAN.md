---
quick_id: 261114-vyl
title: The board-file preview's four open calls
date: 2026-11-14
source: to-do 2026-11-14-brd-preview-open-calls.md — four questions put to the founder 2026-11-13 (quick tasks 261113-kvo and 261113-qyz), all four ruled 2026-11-14
planned_by: the orchestrator inline (no planner or executor spawned)
---

# The board-file preview's four open calls

## Goal

The founder picked all four of the calls left open when a `.brd` first opened a preview. Each is its own commit with its
own unit tests on the pure code, and the browser specs for the board-file preview grow to prove the two that change the
screen.

1. **A TRI is a Thruster.** AkuShaper's fin setup is derived from the numbers: a side pair and a centre fin is TRI. Today
   that file opens as whichever of a Thruster, a 2+1 or an Upright + Trailer lands closest, which on his own twin with a
   centre fin added was an Upright + Trailer. Now it always opens as a Thruster — the fit tries the four Thruster front
   models and nothing else — in the fit and so in the FINS settings the opened board gets.
2. **How-close figures round up.** A 2.07 mm gap read "within 1/16"" because the mark rounded to the nearest sixteenth.
   Every how-close figure (the outline, rocker and thickness lines, the bottom's, the rails' and each rail cell's, the
   fins' and how far a fin control fell short) now rounds UP to the next sixteenth (whole millimetre in Metric), so a
   shaper is never told a fit is exact when it is not; nothing at all off still reads "less than 1/16"". The rounding
   lives in `lib/geometry/units.ts` (`formatInchesFractionUp`, `formatWholeMmUp`) and `measure-display.ts`
   (`formatGapMark`), and the printed overview reads the same sheet, so it shows the same figure.
3. **A Height picker on the RAILS block.** The three rail cross-sections drew at true height only, small, the two lines
   hiding each other where they agree. The block gets BOTTOM's own Height buttons (×1 ×2 ×4 ×8), opening at true height,
   stretching the rails up the way BOTTOM's side view stretches; the caption says which, and the printed overview draws
   the pick in hand.
4. **Tail Rail Blends From and Ends At are fitted.** They opened where a new board puts them (12" and the centre). Now,
   when the fitted tail rail differs in character from the centre's, the two are searched on their own sliders' 1/2"
   grids so our sections between the tail 12" and the centre land closest on the file's, with the same move-gain and
   prune rules as every other rail control; the RAILS table gets a Tail Rail row and its note says how close, over how
   many sections, or why the two were left alone.

## Tasks

1. `lib/geometry/brd-fins.ts`: the candidates for a side pair with a centre fin are the four Thruster front models. Tests
   in `brd-fins.test.ts`; `e2e/brd-fit-preview.spec.ts` b34a opens as a Thruster.
2. `lib/geometry/units.ts` + `measure-display.ts`: the round-up formatters, with tests; `lib/export/brd-fit-preview.ts`
   formats every how-close figure through them; the preview tests follow.
3. `lib/export/brd-fit-preview.ts`: `brdRailFrames` takes a Height; `components/setup/brd-fit-dialog.tsx` holds the pick
   and shows the buttons; `build-brd-overview-pdf.ts` takes it; b23 proves the buttons on a computer and both phones.
4. `lib/geometry/brd-rails.ts`: `fitBrdTailBlend` and `brdRailsSpec` carrying the blend; `brdFitLook` fits it after the
   rails in both orders; the sheet's Tail Rail row, note and controls line; b23/b24 prove the row and the opened board.
5. Records: SUMMARY.md, the to-do to completed, a STATE.md row.
