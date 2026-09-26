# Phase 12: Foil the Way a Shaper Cuts It — Specification

**Created:** 2026-09-26
**Ambiguity score:** 0.10 (gate: ≤ 0.20) — the requirements below are the founder's brief of 2026-09-26 as close to verbatim as the template allows; the seven points in the Ambiguity Report were settled the same day in the four-area discussion recorded in `12-CONTEXT.md` (D-01–D-12), and each requirement below points at the decision that sharpened it
**Requirements:** 6 locked from the brief, plus 5 carried constraints
**Source:** the founder's message of 2026-09-26, captured verbatim in `.planning/todos/pending/2026-09-26-foil-the-way-a-shaper-cuts-it-deck-skin-parallel-bottom-pin-deck-tips.md` and folded into this phase

## Goal

The board's foil is derived the way a shaper actually takes foam off a blank — a constant skin off the deck, the bottom planed down to centre thickness, the tips thinned last — so that every number on the ROCKER screen and its DATASHEET is a number a shaper works to with a planer: how much comes off the deck, how much comes off the bottom (and roughly how many passes), what each 12" station ends up, and what the tips do to the rocker.

## Background

Phase 11 (v1.3, shipped 2026-09-26) reads the board's rocker off a real blank at a placement and derives the foil by scaling the blank's thickness profile proportionally down to the target centre thickness, easing into the tip settings (D-10, D-17, D-18 in the archived `11-CONTEXT.md`). That foil fits inside the foam, but it is not how the foam comes off: a shaper skins the deck by a roughly constant amount, planes the bottom to thickness, and only then thins the tips. This phase replaces the proportional model with that sequence. The blank catalogue, the fit check's machinery, the placement slider, the tip settings, the 12" fine-tunes and the drawing all exist and stay; what changes is how deck, bottom and thickness are derived from the blank, what the DATASHEET reads, and how older boards carry across.

## Requirements

The founder's words are quoted; the sentence after each quote is the requirement as this phase reads it.

1. **Deck skin, constant along the board.** *"In a real shaping, the user would likely take a constant thickness off the deck. We should add this dimension which then drops the deck curve that distance below the blanks deck (same value at all stations) so that the boards deck curve parallels the blanks deck."* — A new dimension, the deck skin, is taken off the blank's deck by the same amount at every station; the board's deck curve is the blank's deck curve lowered by the skin, so the two are parallel. *Sharpened by D-01/D-02: a Fit & Tip Default with a per-board value, 1/8" by default.*

2. **Centre thickness sets the bottom; the gap is foam off the bottom, read as planer passes.** *"Center thickness, then produces a X" thick board which floats above the bottom (this tells the user how much foam to remove off the bottom to get to thickness (essentially how many planer passes))."* — With the deck set, the centre thickness places the board's bottom under it at the centre; the gap between that bottom and the blank's bottom is the foam to remove off the bottom, shown to the shaper as a depth and as planer passes. *Sharpened by D-03: passes count against the Planer Max Depth setting (default 1/8" a pass), rounded up.*

3. **The board's bottom parallels the blank's bottom rocker; the 12" stations are presented.** *"The boards bottom curve should parallel the blanks bottom rocker, and 12" stations presented."* — The board's bottom curve is the blank's bottom rocker raised by that same gap at every station, so the four rocker numbers are the blank's own at that placement, and each 12" station's thickness follows and is shown.

4. **Tip thicknesses, with a pin-deck or bottom choice.** *"The user then inputs a nose tip and tail tip thickness with a pin deck or bottom selection - when pin deck is chosen (default) additional thickness is removed from the bottom of the board (increasing the rocker), and when bottom is chosen thickness is removed from the deck."* — The shaper's nose tip and tail tip thicknesses are reached by removing extra foam at the tips, with a choice per board: pin deck (default) keeps the deck and lifts the bottom toward the tip target, so the tip rocker grows; bottom keeps the bottom and drops the deck toward it. *Sharpened by D-04/D-05/D-06: an account default plus a per-board setting on ROCKER; the thinning eases in with no kink at the 12" station; the four rocker numbers are the board's own with the blank's beside them.*

5. **The bottom curve through the 12" stations is fixed before tip thinning; thinning touches only the last 12".** *"In both cases, The overall new bottom curve should be calculated using the 12" station values from BEFORE the tips were thinned (i.e. tip thinning only affects foil in the last 12")."* — Whatever the pin choice, the bottom curve is computed from the 12" station values as they stand before thinning; thinning reshapes the curve only between each 12" station and its tip.

6. **Fine-tune adjusters on the 12" stations.** *"However fine tune adjusters should allow the user to adjust the 12" station value slightly."* — The existing fine-tune adjusters still nudge the nose 12" and tail 12" station values slightly, on top of the derived numbers. *Sharpened by D-07: on a board saved under Phase 11 the two fine-tunes also absorb the residual so its five station numbers do not move.*

Carried constraints (from CLAUDE.md and Phase 11, not re-decided here):

7. **Geometry first, pure and tested.** Every formula lives in `lib/geometry/`, has unit tests with expected values from fixtures or the catalogue CSVs read through the tested reader, and the named geometry tests land before any screen changes (as Phase 11's R16).
8. **Units through `lib/geometry/units.ts` / `measure-display.ts`.** Skin, gap and passes read as marks (1/16" in Imperial, whole mm in Metric); litres the same in both.
9. **Every saved board still opens.** Boards saved under Phase 11's model (snapshot version 4) and earlier reopen without error and without silent change to what they show; how their numbers carry across is a decision of this phase.
10. **PCHIP stays the app's one curve sampler** (D-13); the interpolation is not changed to prettify a drawing (the drawn-curve smoothness is a separate todo).
11. **No new dependency, no package.json change** (D-20); nothing lands on `main` until the founder approves the plan.

## Boundaries

**In:** the derivation of deck, bottom, thickness and tips from the blank on the ROCKER screen; the readouts and DATASHEET numbers that follow (foam off the deck, foam off the bottom and planer passes, station thicknesses, the four rocker numbers); the pin-deck / bottom choice; where the deck skin's value lives and its default; the fit check's meaning under the new model; how version-4 boards, presets and litres carry across.

**Out:** manufacturer tick-boxes for the blank list (todo 2026-09-26); a smoother-looking drawn curve without changing the numbers (todo 2026-09-26); bottom contours (todo 2026-08-23); anything on screens other than ROCKER beyond what already reads the foil (RAILS, VOLUME, SUMMARY read the result, they are not redesigned); CNC output.

## Constraints

- The blank catalogue, its seed, the fit-check sampling, the placement slider and the drawing's board-in-blank rendering are Phase 11 deliverables and are reused, not rebuilt.
- Display rules of CLAUDE.md Rule 2 apply to every new number.
- Layout rules of CLAUDE.md (width picks the layout, pointer picks sizing, height picks scrolling) apply to any new control.

## Acceptance Criteria

- At every station the board's deck sits exactly the skin below the blank's deck.
- With a centre thickness set, the board's bottom at the centre sits centre-thickness below the deck, and the foam off the bottom reads as that gap, in a depth and in planer passes.
- At every station the board's bottom sits exactly that gap above the blank's bottom, so the blank's rocker numbers and the board's agree away from the tips, and each 12" station's thickness reads blank thickness − skin − gap (before fine-tunes).
- Nose tip and tail tip read the shaper's settings; with pin deck the deck is unchanged in the last 12" and the tip rocker rises; with bottom the bottom is unchanged and the deck drops.
- Changing the pin choice or a tip thickness leaves every number at and inside the 12" stations unchanged.
- A fine-tune moves its 12" station by the typed amount and nothing else.
- Every board saved before this phase opens, and what it shows is explained by a decision in `12-CONTEXT.md`.
- Named geometry tests for each of the above are green before the first screen change.

## Edge Coverage

To be filled from the discussion and research: a skin or gap that goes negative (the board does not fit), a blank thinner than centre thickness + skin at the centre, tip thinning larger than the station thickness allows, a board placed so a 12" station falls off the blank, presets whose provisional blank no longer fits under the new model.

## Prohibitions (must-NOT)

- MUST NOT derive the foil by proportional scaling once this phase lands (that is the model being replaced) — unless the discussion decides to keep it as a fallback, in which case the decision says where.
- MUST NOT let tip thinning change any number at or inside the 12" stations (R5).
- MUST NOT change the interpolation to cure a drawing (D-13, R10 of Phase 11).
- MUST NOT rewrite a saved board silently.
- MUST NOT hand-transcribe an expected number into a test.

## Ambiguity Report

All seven points were settled in the discussion of 2026-09-26 (`12-CONTEXT.md`):

1. Deck skin's home and default → **D-01, D-02**: a Fit & Tip Default with a per-board value; 1/8".
2. Planer pass depth and where foam-off-bottom shows → **D-03** (Planer Max Depth, default 1/8" a pass, passes rounded up); placement of the figure is Claude's discretion.
3. Thinning shape and the tip rocker readouts → **D-05, D-06**: eased with no kink at the 12" station; the board's own rocker with the blank's beside it.
4. What "fits" means and the centre floor → **D-09, D-10**: skin and gap never negative, width margin unchanged; the centre floor is target + skin + one Planer Max Depth, and the Extra Center Thickness setting retires.
5. How version-4 boards open → **D-07**: the five station numbers are kept exactly; the fine-tunes absorb the residual.
6. Litres and the presets → **D-08**: litres follow the new foil everywhere; the presets re-pick.
7. D-18's role → Claude's discretion: expected to retire by construction, confirmed by the planner.

Also decided: list order unchanged (**D-11**); the hand-set fallback unchanged (**D-12**).

## Interview Log

- 2026-09-26 — the founder's brief, in his words, captured as a todo right after the v1.3 UAT; folded into this phase the same day.
- 2026-09-26 — `/gsd-discuss-phase 12`: the brief locked as this spec; four areas discussed (deck skin & planer passes; tip thinning & the pin choice; older boards, presets & litres; fit check & the blank list); two free-text answers reshaped the model — the pin choice became an account default plus a per-board setting, and the centre floor became one deck pass plus one bottom pass with Planer Max Depth replacing Extra Center Thickness.
