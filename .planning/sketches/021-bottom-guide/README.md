---
sketch: 021
name: bottom-guide
question: "With the founder's rulings of 2026-11-07 built in — channels inside TAIL (B), none to start, Parallel, the wing rule a selector — how does a third GUIDE tab teach what each of the 18 cuts and the channels is and does, a cartoon and a sentence or two each, so the five vees read apart?"
winner: null
builds_on: 020
tags: [bottom, guide, contours, channels, wings, cartoons, tabs, sidebar, phone, units, themes]
---

# Sketch 021: The BOTTOM page's GUIDE tab, with the rulings built in

## Design Question
The founder's rulings on sketch 020 (2026-11-07): *"Stagger looks good now. B: Inside Tail, Channel Default = none. Wings
rule should have a selector, narrowest outline by default. Run default is parallel to stringer."* And one more ask the same
breath: *"We also need a third tab that is informational and teaches the user VERY briefly (like 1-2 sentences) and with a
cartoon, what each contour type does, is, and looks like. With so many Vee options, I think we need a clear idea how they
differ."*

So this sketch is 020 with the rulings in and the variants gone, plus the tab:

- **B** — the channels live inside the TAIL card under the tail's own cut, "cut after the Flat Exit"; the phone's switch is
  NOSE · CENTER · TAIL again. A flat tail with channels says *"Nothing is cut in this section but the channels."*
- **None to start** — every board opens with no channels (the Shortboard keeps its deep single, the Fish its panel vee, the
  winged Fish its extending single). Picking 4, 6 or 8 gives that count's starting width (2 1/2" · 1 3/4" · 1 1/4") unless the
  shaper has already set a width of their own.
- **Parallel to the stringer** is the run a set opens with; the Run menu reads *Parallel · With the rail · Toe-in · 3.2°*,
  short enough to read whole beside Longest.
- **The wing rule is a selector** — a WINGS row above the three sections, shown only on a board with a wing (*1/4" wing at
  11 1/2"*): *Measure Off Rail from* — **Narrowest outline** (opening) or *Natural outline, before the wing* — with one line
  under it saying what each means. The sketch bar's switch is gone.
- **GUIDE**, the third tab after VIEWER and DATA: nineteen cards — the six nose cuts, six center, six tail, and the channels —
  each with its name, a cartoon, and two sentences: what it is and looks like (in ink), then what it does (muted). The cartoon
  is the board the shaper has open, drawn by the VIEWER's own code: from above with that one cut's shade and the pencil lines
  a shaper would rule, the dash-dot cutting line where the section is taken, and the section across it at its deepest point,
  Height ×8, with the planed bottom as a dashed straightedge. So the five vees draw five different sections — the Panel Vee's
  two straight planes meeting at a corner, the Rolled Vee's rounded ones with no corner, the Tri-Plane's flat panel between
  its planes, the Reverse Vee at the nose, the Spiral Vee's two troughs inside lifted rails — and the three single concaves
  under the nose differ in where their shade closes. The cuts on the board now are tagged *On this board*; switch boards and
  every cartoon redraws on the new outline. The sentences are first drafts for the founder's pen.

## How to View
open .planning/sketches/021-bottom-guide/index.html

The bar switches the board (the four presets and the winged Fish), the four themes, Imperial / Metric and Auto / Phone
frame. ↺ puts everything back to its starting numbers. On a computer GUIDE shows three cards across and scrolls inside the
folder; on a phone one card across, scrolling inside the pinned drawing area, the page itself never scrolling.

## Variants
None — the rulings are built in. The open questions are below.

## What to Look For
- The GUIDE's sentences: right, wrong, or too long. The founder asked for *"VERY briefly (like 1-2 sentences)"*; every
  card carries two.
- Whether the cartoon says enough — the top view and the section at ×8 — or whether the vees want a third drawing (three
  stacked sections, say, to show a spiral vee twisting along the tail).
- Whether a card should be tappable to put that cut on the board (not built; the tab is informational, as asked).
- The WINGS row's wording and place — above the sections, one setting for the whole bottom.
- Still open from 019 and 020: the ruler under the section (computer only, the live cut's marks only), the readouts' home,
  the starting numbers (the todo), and whether a staggered set's deepest station or ends should stagger too.

## Checked
Headless Chromium at 1280 × 800 and 390 × 844 (iPhone 14, touch): no errors on any theme, units or board. The bar has no
variant or wing-rule buttons; the tabs are VIEWER · DATA · GUIDE; three cards with the channels block inside TAIL; every
board opens with no channels; 4 / 8 / 6 give 2 1/2" / 1 1/4" / 1 3/4" wide, Parallel, the inner pair longest with the Stagger
slider there (and gone for All the same); Parallel rules the first wall straight at 1 3/4" six inches ahead of and four
behind the deepest station; every channel check of 020 still passes (the sawtooth, the length order, the clamp, the fit,
toe-in, the litres, a double's flat at the stringer); the winged Fish shows the WINGS row with the selector on Narrowest and
nothing on a wingless board, Natural takes and changes its note, and the two rules still differ at the wing's step; GUIDE
has nineteen cards, every one with a cartoon, sixteen with a shade (every cut but the three flats), the five vees' sections
all different, the Shortboard's three cuts tagged and the Fish's three when the board changes, three across on a computer
and one on a phone, scrolling inside the folder; Metric still reads in cm and mm with DATA's two tables; the phone's switch
has three buttons and the tab strip stays on one line.

## Source
`sketch-source.tar.gz` holds `board-data.ts` (unchanged from 020), its `boards.json`, the page template, `build.py`, the
edit script that made this template from 020's, and the Playwright checks that also take the pictures.
