# Phase 14: Realistic Surfboard Flow — Specification

**Created:** 2026-10-02
**Ambiguity score:** 0.04 (gate: ≤ 0.20) — the requirements below are the founder's own words of 2026-09-28, 2026-10-01 and 2026-10-02 and their four answers of 2026-10-02; the founder locked this brief on 2026-10-02 and the nine open points in the Ambiguity Report were settled the same day as D-01 to D-19 in `14-CONTEXT.md`
**Requirements:** 9 locked from the founder's words and answers, plus 8 carried constraints
**Source:** `.planning/todos/completed/2026-09-28-give-the-foil-and-rocker-curves-a-realistic-surfboard-flow.md` — the founder's messages verbatim, the measured research of 2026-10-02 (sections 1–8) and the four answers. That file is the phase's research record: every figure quoted here comes from it.

## Goal

Every curve a shaper cuts foam to flows the way a real surfboard does. A blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely, a hand-set board is drawn by the same rule, and a board's thickness runs down steadily into each tip, never thinner on the way than the tip itself. Built and live before the founder shows the app to a room of shapers on Saturday 2026-10-10.

## Background

Since Phase 11 (v1.3) a board's rocker and foil are read off a real blank, and every blank curve is drawn through its printed stations with PCHIP, a curve chosen because it never overshoots at the nose. Since Phase 12 (v1.4) the board is cut from the blank the way a planer works, and each tip is eased into its tip setting over the last 12" with an S-shaped blend.

Two things are wrong with that today, both measured:

- **Between stations the curves do not sit where real foam sits.** Cut a 15-station US Blanks rocker down to the five stations an Arctic blank prints and redraw it: today's curve misses the hidden stations by 0.112" on average (0.645" at worst), riding about 3/16" high between the nose 12" mark and the centre. Thickness reads thin between stations and width reads about 1/2" narrow, which wrongly refuses boards that would fit.
- **Some boards come out thinner a few inches from a tip than at the tip itself.** When the level planer cut leaves less foam at the tip than the tip setting asks for, the 12" blend has nowhere to go but down and back up. 82 of 1,635 test boards have such a thin spot.

The research found one rule that fixes the first (a square root, then the curve the app already uses) and a second that fixes the other (a steady taper from a start point that moves in when it has to). Nothing is built yet.

## Requirements

The founder's words are quoted; the sentence after each quote is the requirement as this phase reads it.

1. **Curves that never hump and always flow.** *"I think the bigger issue is to improve the spline curve rules/type so that the curve never humps and always has a realistic surfboard flow."* — The rules that draw the curves change, not just how they look on screen. A board's thickness never rises toward a tip, and its bottom never leaves the range of the stations either side of it.

2. **The curve is chosen by measurement, with US Blanks as the muse.** *"consider different spline options to get smoother curves"*, and *"does it make sense to look at the blank database and use US Blanks as a muse (because they provide the most data points their curves are smoothest ...) for the type of curve that should be created"* — The blank's bottom is drawn with the rule that won that test, the **square-root rise**: the square root of each station's lift above the lowest station, today's PCHIP through those, squared back. Average miss 0.035" against today's 0.112"; closer on 67 of 68 distinct rockers.

3. **A plan for the blank's deck.** *"We should also finalize a plan for the blanks deck."* — The blank's thickness is drawn with the mirror rule, the **square-root fall**, measured down from the thickest station (average miss 0.050" against 0.076"). The deck is not a third curve: it stays the bottom plus the thickness.

4. **The board follows the best curves; a hand-set board uses the same five-point model.** *"How do the new curves impact the board itslef? The idea is that we're trying to help guide a shaper to a nice foil and so I'd like the board deck and bottom to also follow the best splines. It seems logical that the board bottom will follow the same 5 point root-squares model"* — Two parts:
   - A board in a blank keeps following its blank: its bottom is the blank's bottom and its foil is the blank's foil cut level, both now drawn by the new rules. It is not redrawn from its own five stations when the blank prints more.
   - A hand-set board (no blank) draws its five rocker numbers with the square-root rise and its five thicknesses with the square-root fall.

5. **The blank's width joins.** The founder's answer 4, *"Both"* (the blank's width and the hand-set board join the curves step) — The blank's width is drawn with the square-root fall. Today's width reads about 1/2" narrow between stations; 27 of 192 near-limit test boards are refused today only because of that. *Sharpened by D-13: today's curve (PCHIP) runs inside the square-root rule for the bottom, the thickness, the width and the hand-set board alike.*

6. **Where the tip thinning starts is automatic, and the shaper can set it.** *"we may have to adjust my earlier recommendation that the tip thinning is from the 12" mark only. May be better to let the user have a control for that actually that ranges 6" to board center."* and answer 2, *"Automatic, and the shaper can override it"* — The start is 12" from the tip unless the board there is too thin to run down to its tip steadily; then it is as far in as it needs to be. A control from 6" to the board's centre sets it by hand. *Sharpened by D-02, D-03, D-05, D-06 and D-09 to D-12: one start per tip; Automatic never nearer than 12"; a start set too close is drawn as set and flagged; no account default in this phase; the control is called Thinning Starts, a slider with an Automatic button at the end of THICKNESS, and the start is also shown on the drawing, the DATASHEET and the printed order form.*

7. **A steady taper into each tip.** From the problem as captured on 2026-09-28 (*"a hump, not a taper"*) and the plan the founder approved — The S-shaped blend is replaced by a taper that runs the thickness down steadily from the start to the tip setting. It comes off whichever surface the Tip Style names, as today. Its final shape is picked by the founder from side-by-side pictures. *Sharpened by D-01, D-04 and D-07: the steady taper (one parabola from the start to the tip); the 12" fine-tune stays a nudge on top; where a start moves in past 12", that tip's 12" numbers belong to the taper.*

8. **Saved boards redraw.** Answer 3, *"Redraw with the new curves"* — A saved board is drawn with the new curves the next time it is opened. Nothing is rewritten in the database and no marker is put on saved boards. A blank's printed stations never move.

9. **Before the showing, both steps.** *"I think i want to tackle this very soon, before the 10th."* and answer 1, *"Curves and tips, both now."* — The curves step (requirements 2–5) and the tips step (6–7) are both built before the freeze on Wednesday 2026-10-07 evening. Working schedule: curves built and live Saturday Oct 3; tips Sunday–Monday Oct 4–5; the founder's rehearsal walk Tuesday Oct 6. Cut line: if the tips step is not verified by Monday evening, it waits until after the 10th. *Replaced by D-15 to D-18: two go-lives on one plan approval; the tips can take Tuesday Oct 6, and only if they are still not proven by Tuesday evening does the showing run on the curves alone; one rehearsal walk after the last change; a read-only report on the real saved boards before each push.*

## Boundaries

**In:** how a blank's bottom, thickness and width are drawn between their printed stations; how a hand-set board's rocker and thickness are drawn; the tip rule (where the thinning starts, its shape, the new control and the stored field for it); everything those numbers feed: ROCKER's drawing, readouts and DATASHEET, the fit verdicts and their reasons, VOLUME's litres, RAILS' linked thickness, the order form and the printed sheets, the four presets' recorded figures.

**Out:** the outline curve on TEMPLATE; rail-band and fin-placement maths; a shaper's own Custom Blank (todo 2026-09-28, after Oct 10); bottom contours; the blank catalogue's remaining corrections (the founder's own list; the cells in the research's section 8 belong there); a ghost on ROCKER; catalogue links; anything in Phase 13's own list.

## Constraints

1. **Rule 1.** Every formula lives in `lib/geometry/`, pure and unit-tested, with expected values from generated fixtures, never hand-typed.
2. **Today's numbers are pinned first.** A golden of today's curves and board numbers is generated from the live release before any rule changes, the way Phase 12 pinned v1.3. The new rules are then written as named geometry tests before any screen moves.
3. **No overshoot, above all at the nose kick.** That was Phase 11's reason for PCHIP (R10/R15, D-13). The new curves are exact at every printed station and never outside the two neighbouring stations.
4. **The levelling rule stays exact.** A blank's low point is still its lowest station (Phase 11 R11).
5. **Old boards convert exactly as before.** `lib/geometry/phase11-foil.ts` keeps today's PCHIP.
6. **Metric in the data, the shaper's units on screen** (CLAUDE.md Rule 2). The new control reads and types through `lib/geometry/units.ts`.
7. **The database rule.** Anything added to the database is added to production before the code that uses it ships.
8. **Nothing is pushed or deployed without the founder's go**, and nothing lands after the freeze except rehearsal fixes.

## Acceptance Criteria

1. On all 162 catalogue blanks, the new bottom, thickness and width curves read the printed value exactly at every printed station and never leave the range of the two stations either side.
2. Each blank's lowest point on the new bottom curve is its lowest printed station.
3. On the stress set (every pickable blank, a board 2" shorter, centres 2 1/4" to 3", slid to either end and centred, default tips: 1,635 boards), with every start on Automatic: no board is thinner anywhere than its own tip setting; no board gets thicker toward a tip, except the twelve on the US Blanks 9'9"B whose thickest printed station is not its centre; no board newly pokes out of its blank; none is under the 1/4" floor.
4. With a start at 12", a board's five station numbers are the same as before the tips step.
5. The four presets: every station number within 0.015" of today's after the curves step; each card's recorded litres re-recorded from the app, not typed.
6. A Phase 11 saved board converts to exactly the numbers it converts to today.
7. A saved board opens with what it stores unchanged, and nothing is written to it by being opened.
8. A hand-set board with today's default numbers draws through the same five rocker numbers and five thicknesses, to the last bit.
9. The founder has picked the taper's final shape from side-by-side pictures and walked the result on real devices before the freeze.

## Ambiguity Report

All nine points were settled in the phase's discussion on 2026-10-02 (`14-CONTEXT.md`). The first five are the tip questions the founder left open that morning.

| # | Open point | Where it stands |
|---|---|---|
| 1 | One start point for both tips, or one each | **Settled, D-02:** one each. Automatic already works per tip: 249 of the 1,635 test boards want different starts at nose and tail. |
| 2 | Whether Fit & Tip Defaults carries a start | **Settled, D-06:** not in this phase; every new board starts on Automatic. Deferred to after the showing. |
| 3 | What the 12" fine-tune means when the start is not at 12" | **Settled, D-04 and D-07:** it stays a nudge on top of whatever the board reads at 12", taper included. |
| 4 | The final shape of the taper | **Settled, D-01:** the steady taper, picked from `pictures/tip-taper-three-shapes.png`. |
| 5 | The tape-measure check on a real Arctic blank | **Settled, D-08:** after go-live, on the sheet `arctic-blank-tape-check-sheet.pdf`; it gates neither push. |
| 6 | Which curve runs inside the square-root step | **Settled, D-13:** PCHIP, picked from `pictures/curve-inside-the-rule.png`. |
| 7 | What the start control is called, where it sits, and what it shows on Automatic | **Settled, D-09 to D-12.** Wording and spacing go to the screen design step. |
| 8 | The twelve boards on the US Blanks 9'9"B | **Settled, D-14:** the blank's own shape, drawn as printed; the blank is on the founder's corrections list to check. |
| 9 | What happens at the cut line | **Settled, D-16:** the tips can take Tuesday; curves alone only if they are still not proven by Tuesday evening. |

## Interview Log

The founder's messages of 2026-09-28, 2026-10-01 and 2026-10-02, the research they asked for and the four answers they gave by question card on 2026-10-02 are recorded verbatim in the source todo. The discussion that settles the Ambiguity Report is recorded in `14-DISCUSSION-LOG.md`.
