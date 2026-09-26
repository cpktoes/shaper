---
created: 2026-09-26T20:26:43Z
title: Foil the way a shaper cuts it — deck skin, parallel bottom, pin-deck tip thinning
area: rocker
severity: major
files: [lib/geometry/foil.ts, lib/geometry/blank-fit.ts, lib/geometry/board-profile.ts, lib/geometry/rocker.ts, lib/geometry/volume.ts, lib/models/design-snapshot.ts, components/rocker/rocker-controls.tsx, components/rocker/rocker-datasheet.tsx, components/rocker/board-on-blank.tsx, components/fit-defaults-dialog.tsx, lib/fit-defaults-preference.ts]
---

## Problem

Captured 2026-09-26, right after the Phase 11 UAT passed. The founder, in his own words:

> In a real shaping, the user would likely take a constant thickness off the deck. We should add this
> dimension which then drops the deck curve that distance below the blanks deck (same value at all
> stations) so that the boards deck curve parallels the blanks deck. Center thickness, then produces a
> X" thick board which floats above the bottom (this tells the user how much foam to remove off the
> bottom to get to thickness (essentially how many planer passes)). The boards bottom curve should
> parallel the blanks bottom rocker, and 12" stations presented. The user then inputs a nose tip and
> tail tip thickness with a pin deck or bottom selection - when pin deck is chosen (default) additional
> thickness is removed from the bottom of the board (increasing the rocker), and when bottom is chosen
> thickness is removed from the deck. In both cases, The overall new bottom curve should be calculated
> using the 12" station values from BEFORE the tips were thinned (i.e. tip thinning only affects foil
> in the last 12"). However fine tune adjusters should allow the user to adjust the 12" station value
> slightly.

Why it matters: Phase 11 (R13, D-17, D-18) derives the foil by scaling the blank's thickness profile
proportionally down to the centre thickness and easing into the tip settings. That gives a foil that
fits inside the foam, but it is not how the foam actually comes off. A shaper skins the deck by a
roughly constant amount, planes the bottom down to thickness, and only then thins the tips. Modelling
it that way makes the DATASHEET's numbers the numbers a shaper actually works to, including how much
foam comes off the bottom.

## Solution

Not a quick task: this changes the foil calculator that shapers cut to, so it wants a discuss-phase
(or a new phase) with the tests-before-UI discipline Phase 11 used. How the idea reads as rules a
planner can start from — every one is the founder's to confirm:

1. **Deck skin** — a new dimension (a setting with a per-board value, like the tip thicknesses):
   board deck = blank deck − skin, the same skin at every station, so the deck parallels the blank's.
2. **Centre thickness sets the bottom** — board bottom at the centre = board deck at the centre −
   centre thickness. The gap between that and the blank's bottom at the centre is the foam to come off
   the bottom, shown as a depth and as planer passes.
3. **Parallel bottom** — board bottom = blank bottom + that same gap at every station, so the four
   rocker numbers are the blank's own at that placement, and each 12" station's thickness falls out as
   blank thickness − skin − gap. Those are shown, and the fine-tune adjusters still nudge them slightly
   (R5 stays).
4. **Tip thinning last, and only inside the last 12" at each end** — with *Pin deck* (default) the deck
   stays and the bottom rises toward the tip target, so the tip rocker grows; with *Bottom* the bottom
   stays and the deck drops toward it. The bottom curve through the 12" stations is fixed BEFORE
   thinning; thinning only reshapes the curve between a 12" station and its tip.
5. **Fit check (R12) becomes simpler** — the board sits inside the foam wherever skin ≥ 0 and gap ≥ 0
   and the centre still fits; blanks that fail still list with a plain reason.

Open questions for the discussion:

- The default skin, and its unit family (a mark: 1/16" steps, whole mm in Metric).
- The planer-pass figure: how deep one pass is taken to be, and whether that is a setting.
- The shape of the thinning between a 12" station and its tip (a straight taper, or the D-17 ease).
- VOLUME reads the foil, so litres move with the skin and the gap — confirm that is wanted.
- Whether D-18 (blank thickness ratio under the board's centre) keeps any role, since thickness is no
  longer a proportional scale of the blank's.
- Boards saved under the Phase 11 model: snapshot version 4 already carries the blank, placement,
  tips and fine-tunes; skin and the pin choice would be new fields, with defaults that either reproduce
  today's numbers as closely as possible or make a clear one-time change — decide which.
- Presets: their provisional blanks and quoted litres would move again.
