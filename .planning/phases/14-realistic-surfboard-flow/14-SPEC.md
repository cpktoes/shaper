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

*(Planning notes 2026-10-02, from the planning research; the criteria above are unchanged. Criterion 1: all 162 blanks are tested at the curve level, and the 158 that can be picked are also tested through the app's own blank preparation, since four catalogue blanks cannot be prepared at all (D-27). Criterion 3: the exception is computed from the data as "blanks whose thickest printed station is not the centre", which today yields the twelve boards on the 9'9"B; 291 of the 1,635 boards are longer than the app's 10'0" limit, so the buildable subset is reported beside the full set (D-27); and with Automatic, thin boards in thick blanks stop being refused (D-20). Criterion 5: the Mid-length moves 0.0149", so the 0.015" bound is neither tightened nor hand-rounded, and nothing records a card's litres today, so a generated record is added (D-27). Criterion 6: "the numbers" are the board's five thicknesses, which stay exactly; the small stored tweak under them moves by up to 0.03" (D-25).)*

## Edge Coverage

**Coverage:** 27/27 applicable edges resolved · 0 unresolved

Filled from the planning research of 2026-10-02 (every measured figure names its script in `14-RESEARCH.md`, "How every number here was produced") and the rulings D-20 to D-28. ✅ = an explicit acceptance criterion a test asserts; 🧪 = a backstop the plan holds out as a held-out check.

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| Two or more stations tie for the lowest (6 catalogue blanks) | R1, R2 | ✅ covered | The bottom curve is exactly flat at the lowest value across the tie; a test builds the tie list from the catalogue (not typed) and asserts each blank's lowest sampled point is its lowest printed station |
| The lowest station at an end of the blank | R1, R2 | ✅ covered | No catalogue blank does it; a synthetic test (lowest first, lowest last) asserts exact stations and the low point at that end |
| A thickest or widest printed station that is not the centre (9'9"B, 9'9"A; 16 blanks widest away from the centre) | R3, R5 | ✅ covered | Drawn as printed (D-14): the fall is measured from the thickest (or widest) station; the test's exception list is computed from the data and expects humps only on those blanks |
| A blank missing a cell for one curve, or with fewer than two stations on it | R1 | ✅ covered | The curve uses that attribute's own stations and reads flat with none or one, as today; the four blanks that cannot be picked are tested at the curve level only (D-27) |
| A start set by hand that ends up further in than the board's centre after the board is shortened | R6 | ✅ covered | Pulled into the range (6" to half the length, rounded in to 1/2") on read; nothing is written; lengthening the board brings the stored value back. Test: the profile shows the pulled value and the stored value is unchanged |
| A start exactly at the centre, or under 6" | R6 | ✅ covered | The range's far end is half the length rounded down to the half inch, so the two tips' runs never overlap; under 6" is pulled up to 6". Test |
| A saved board that stores no start | R6, R8 | ✅ covered | Reads Automatic on both tips, and opening writes nothing. Test: the parsed board carries no start and a deep-frozen input is unchanged |
| A stored start that is not a number, or is out of bounds | R6, R8 | ✅ covered | Reads as Automatic and never rejects the board (D-24). Test |
| A saved Phase 11 board | R8 | ✅ covered | Its five thicknesses are unchanged: the existing Phase 11 tests pass unmodified. The stored tweak under them moves by up to 0.03" (D-25) |
| The site rolled back one deployment after a board is saved with a start | R6, R8 | ✅ covered | Today's reader drops an unknown value on the blank and accepts any version, so the board opens on Automatic (measured on the live code). Test, written before the new values exist: the reader drops an unknown value on the blank and accepts a higher version |
| A signed-out or never-saved board | R6 | ✅ covered | It lives in memory only; undo carries the whole blank. Test: going back to Automatic removes the value and leaves no phantom undo step |
| The start and its slider in Metric | R6 | ✅ covered | Centimetres to one decimal (D-22) through `lib/geometry/units.ts`; a start at the 12" station prints the same digits as the station's own label; switching systems rewrites nothing. Tests |
| The Metric slider's ends sit up to 7.6 mm inside the Imperial range (rounded in to 10 mm), and an Automatic start can sit off the 10 mm grid | R6 | 🧪 backstop | Nothing is written and the thumb draws where the value is, as the Placement slider already does; held out as a look at both ends in Metric and a check that the arrow keys work from an off-grid thumb |
| A 12" tweak on top of a start moved in past 12" | R6, R7 | ✅ covered | The tweak stays a nudge at the 12" station on top of the taper, and Automatic ignores it (D-04). Test: with any start, the 12" thickness is the taper's value plus the tweak |
| Tip Style, Deck Skin and tweaks with a moved-in start | R7 | ✅ covered | The thickness is identical under Pin deck and Bottom; only the surface the thinning comes off changes; Automatic's start is unchanged by Tip Style, Deck Skin and the tweaks. Test |
| The hand-set board with no blank | R4 | ✅ covered | Drawn by the square-root rise and fall through its five typed numbers, exact at the stations (acceptance 8); it shows no Thinning Starts rows. Test |
| A start set by hand too close to the tip: a thin spot, a sharp bend, or a cut that thickens toward the tip there | R6 | ✅ covered | Drawn as set and flagged (D-05); the bend line shows from 1/32" per inch (D-21); not a fit failure on its own. Tests on the flag and on the sentence |
| Automatic finds no start that can run down steadily (never on the stress set or on realistic boards) | R6 | ✅ covered | Automatic is 12" and no line shows (D-23); the fit check and the 1/4" floor judge the board. Test on a built-for-the-purpose board |
| A tip that needs more foam than the planer cut leaves | R7 | ✅ covered | As today (Phase 12 D-16): Pin deck lets the tip rocker fall, Bottom raises the deck; no stress board newly pokes out of its blank (acceptance 3). Test |
| A thin board in a thick blank, refused today as "too thick for this center" | R6, R7 | ✅ covered | Fits after the tips step (D-20), with tips flatter than the blank's own rocker; no stress board is newly refused. Tests built on the old refusal use a hand-set start |
| Placement at either end of its slider | R4, R7 | ✅ covered | Automatic is worked out from the blank at that placement, and the blank list judges each placement with its own Automatic starts. Test |
| Automatic's start while a control slides | R6 | ✅ covered | The start never reverses as a control moves one way and moves at most 1/2" per 1/16" of Placement (D-23). Test |
| Test boards longer than the app's own 10'0" limit (291 of 1,635) | R6, R7 | ✅ covered | The stress set stays as defined and the buildable subset is reported beside it; pictures and browser fixtures use a buildable board (D-27) |
| A catalogue correction after today's numbers are pinned | R8 | ✅ covered | The pin carries its blank rows by value (D-26). Test: the frozen rule reproduces the pin exactly |
| The starts line on the printed order form, on both papers and at every phone width | R6 | 🧪 backstop | The screen design measured room for it; the print-fit browser test and a printed page prove it |
| What Automatic costs inside the blank list, on a phone | R6 | 🧪 backstop | Under half a millisecond per slider movement and tens of milliseconds for the whole list in Node; WebKit is unmeasured. A size-guard test in Node, and the feel on a real phone during the rehearsal walk |
| The desktop reference screenshots | R4, R8 | 🧪 backstop | ROCKER and VOLUME of the first board a visitor sees change at the curves step (30.06 to 30.51 L); RAILS, FINS and TEMPLATE must not; none changes at the tips step. The founder's eye on the difference before each go |

## Prohibitions (must-NOT)

**Coverage:** 18/18 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT let the Phase 11 conversion read a live curve or the live tip rule for Phase 11's own number | R8 | resolved | test: the conversion prepares its own blank on the frozen rule (D-25); `phase11-foil.test.ts` and the Phase 11 tests in `design-snapshot.test.ts` pass unmodified |
| MUST NOT move a blank's printed stations, in the data or on any curve | R1, R8 | resolved | test: every printed value reads back exactly; no catalogue or seed file is changed by this phase (diff check) |
| MUST NOT write to a saved board by opening it, and MUST NOT change the database | R8 | resolved | test (deep-frozen input); no diff under `drizzle/` or in `lib/db/schema.ts` |
| MUST NOT store a start on a board that is on Automatic | R6, R8 | resolved | test: Automatic removes the stored value; no code path writes a worked-out start into a board |
| MUST NOT put tips code in the curves go-live, or change the 12" blend there | R9 | resolved | commit order (D-28); a check that the curves commits do not touch the tip rule |
| MUST NOT push, merge to main, deploy or run anything against production without the founder's go, and nothing but rehearsal fixes after the freeze on Wednesday 2026-10-07 evening | R9 | resolved | each push and each production report is a founder checkpoint in the plan |
| MUST NOT change any of a board's five station numbers at the tips step when the start is 12" | R7 | resolved | test (acceptance 4, exact equality) |
| MUST NOT let Automatic read the 12" tweak, the Deck Skin or the Tip Style | R6 | resolved | test |
| MUST NOT inline a formula in a component, convert units outside `lib/geometry/units.ts`, or import React, a browser API or the database into a geometry file | R1 | resolved | lint, the existing import guards, review |
| MUST NOT hand-type an expected number | R2 | resolved | every expected value comes from a generated fixture or is computed in the test from the catalogue |
| MUST NOT add a third curve for the deck | R3 | resolved | test: the deck stays the bottom plus the thickness |
| MUST NOT add a package | R9 | resolved | `package.json` and lockfile diff check |
| MUST NOT leave a scratch script loose under the repo or `.planning/` | R9 | resolved | scratch stays in the scratchpad or in an archive |
| MUST NOT show a notice, a marker or a "what's new" for redrawn boards | R8 | resolved | browser test: no new text on opening a saved board (D-19) |
| MUST NOT let the saved-boards report print a board's contents, its name, a user id or the connection string, or write anything | R9 | resolved | the script's single read and counts-only output (D-18); review and a test of the report's own function |
| MUST NOT let ↺ Reset Fine-Tune clear a Thinning Start, or add a start to Fit & Tip Defaults | R6 | resolved | store test; no account column (D-06) |
| MUST NOT draw a hand-set board with today's curve after the curves step, except through the frozen rule for the reports and the pictures | R4 | resolved | test |
| MUST NOT tighten or hand-round the 0.015" preset bound | R4 | resolved | test: compared against the generated pin with the brief's own bound (D-27) |

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
