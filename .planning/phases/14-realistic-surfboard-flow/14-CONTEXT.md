# Phase 14: Realistic Surfboard Flow - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The curves a shaper cuts foam to are redrawn so they flow the way a real surfboard does, in two steps that ship separately before the Oct 10 showing:

- **The curves step.** A blank's bottom, thickness and width are drawn between their printed stations by the square-root rule, and a hand-set board's five rocker numbers and five thicknesses are drawn by the same rule. No new control and nothing new stored.
- **The tips step.** Each tip's thickness runs down steadily from a start point to the tip setting. The start is automatic and can be set by hand, one per tip, with a new control on ROCKER and a new stored value on the board's blank.

Everything those numbers feed follows: ROCKER's drawing, readouts and DATASHEET, the fit verdicts, VOLUME's litres, RAILS' linked thickness, the order form and printed sheets, and the four presets' recorded figures.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked** (the founder locked the brief on 2026-10-02, first question of the discussion). See `14-SPEC.md` for the full requirements, boundaries, constraints and acceptance criteria.

Downstream agents MUST read `14-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** how a blank's bottom, thickness and width are drawn between their printed stations; how a hand-set board's rocker and thickness are drawn; the tip rule (where the thinning starts, its shape, the new control and the stored field for it); everything those numbers feed: ROCKER's drawing, readouts and DATASHEET, the fit verdicts and their reasons, VOLUME's litres, RAILS' linked thickness, the order form and the printed sheets, the four presets' recorded figures.

**Out of scope (from SPEC.md):** the outline curve on TEMPLATE; rail-band and fin-placement maths; a shaper's own Custom Blank (todo 2026-09-28, after Oct 10); bottom contours; the blank catalogue's remaining corrections (the founder's own list); a ghost on ROCKER; catalogue links; anything in Phase 13's own list.

</spec_lock>

<decisions>
## Implementation Decisions

### The tips (the founder's five open questions)

- **D-01:** **The taper is the steady taper** — the level planer cut exactly as it is inside the start point, and from the start to the tip one parabola that leaves the planer cut along the planer cut's own slope and lands on the tip setting. The research's formula (source todo, section 7): `T(d) = tip + (2·sec − m)·d + ((m − sec)/W)·d²`, with `sec = (P(W) − tip)/W`, `m = min(P′(W), 2·sec)` and never below 0, `d` the distance in from the tip, `W` the start, `P` the planer cut. It replaces Phase 12 D-05's S-shaped ease. The founder picked it from `pictures/tip-taper-three-shapes.png` over "Soft start" (a cubic that also matches the planer cut's bend at the start) and "Today's S-shape" from an automatic start. Measured on the 1,635-board stress set with Automatic starts: no board thinner anywhere than its tip setting, no hump except the twelve on the US Blanks 9'9"B (D-14), 89% of tips still starting at 12". Accepted consequence: ordinary tips come out fuller in their last 6" than today, by up to 1/8" (Shortboard preset nose 6" in: 1" today, 1 1/8" with the taper).
- **D-02:** **Each tip has its own start** — nose and tail each read Automatic or a distance set by hand, from 6" to the board's centre. On 249 of the 1,635 stress boards the two tips want different starts.
- **D-03:** **Automatic means 12" unless the board cannot run down steadily from there, then the first point further in that can** — the founder's answer of 2026-10-02, with the research's test for "can": the planer cut at the start is at least the tip setting and its slope there is no more than twice the average slope to the tip (`P(W) ≥ tip` and `P′(W) ≤ 2·sec`). Automatic never starts nearer the tip than 12". Measured: 2,912 of 3,270 tips stay at 12", 218 land at 12–18", 97 at 18–24", 43 at 24–36", none needs the centre; the furthest is 32 1/2".
- **D-04:** **The 12" fine-tune stays a nudge** — unchanged from Phase 11 D-11 and Phase 12 D-13/D-20: a signed tweak added on top of whatever the board reads at 12", taper included. Automatic takes no account of the tweak. A tweak can still put a dip or a bump at 12", as it can today; that stays the shaper's call. Rejected: redrawing the taper through the tweaked 12" thickness; switching the fine-tune off when the start is further in than 12".
- **D-05:** **A start set by hand that is too close to the tip is honoured and flagged** — the board is drawn exactly as set, thin spot or kink included, and a line on ROCKER says where the board is thinnest and that Automatic would cure it. The slider's range never shrinks to stop it. This is not a new fit failure on its own: the existing fit check and the 1/4" floor still judge the board as they do today (the spirit of Phase 12 D-16: the setting is honoured and the consequences are shown).
- **D-06:** **No account default for the start in this phase** — every new board and every preset starts on Automatic, and a saved board that stores no start reads as Automatic. Fit & Tip Defaults is untouched, so the phase needs no database change.
- **D-07:** **Where a start moves in past 12", that tip's 12" numbers belong to the taper** — the 12" thickness is no longer what the planer cut leaves (it rises on 358 of 3,270 stress tips, typically 1/16", at most 1/2"), and under Pin deck the 12" rocker number moves with it. The rocker numbers stay the board's own and the DATASHEET keeps the blank's beside them (Phase 12 D-06). Phase 12's "nothing at or inside a 12" station moves" no longer holds for those tips, by the founder's words of 2026-10-02: "we may have to adjust my earlier recommendation that the tip thinning is from the 12" mark only."
- **D-08:** **The tape-measure check comes after go-live, not before** — the curves ship on the catalogue evidence (67 of 68 distinct US Blanks rockers closer, Marko's own blanks agree, Arctic's printed litres agree). The founder measures a real Arctic blank's bottom every 6" when one is in the bay, on the one-page sheet `arctic-blank-tape-check-sheet.pdf`, and the result is checked against the new curve and recorded as a follow-up. It does not gate either push.

### The start control on ROCKER

- **D-09:** **The control is called Thinning Starts** — one for the nose and one for the tail, shown only when a blank is picked (the same rule as Tip Style). The name is the one in the plan the founder approved on 2026-10-02.
- **D-10:** **Both controls sit at the end of THICKNESS with Tip Style** — the three things that say how the tips are thinned sit together (which surface, where the nose starts, where the tail starts), and every row above keeps its place.
- **D-11:** **Each is a slider with an Automatic button** — the founder chose this over the recommended Automatic / Set pair. As in the chart they used on 2026-10-02: the slider runs from 6" to the board's centre and is always there; on Automatic it shows the distance Automatic picked; dragging it sets the start by hand; the Automatic button puts it back.
- **D-12:** **Each tip's start is shown in three more places** — a faint mark on ROCKER's side profile where the thinning starts, a line on the DATASHEET beside the tip numbers, and on the printed order form with the tips and the planing figures.

### The curves

- **D-13:** **Today's curve (PCHIP) runs inside the square-root rule, everywhere** — for a blank's bottom (the rise), its thickness and width (the fall), and a hand-set board's five rocker numbers and five thicknesses. The founder picked it from `pictures/curve-inside-the-rule.png` over Steffen's curve and a Hyman-filtered cubic. All three score the same against hidden stations (0.035–0.036" average miss); PCHIP is the one already proven in the app, and the square root is what removes the sharp look (the change of bend at an Arctic station falls from 24-to-1 to about 1.5-to-1). No new curve family is written in this phase.
- **D-14:** **The US Blanks 9'9"B is drawn as printed** — its thickest printed station is not its centre, so twelve stress boards on it read about 1/16" thicker there than at their centre. That is the blank's own shape and is accepted. The blank is added to the founder's blank corrections list to check against its catalogue page.

### Shipping

- **D-15:** **One plan approval, two go-lives** — both steps are planned in one pass and the founder approves once before any code is written. The curves go live first, as soon as they are proven (target Saturday Oct 3); the tips follow on their own go. Each push happens only after the founder has seen before-and-after pictures and said go.
- **D-16:** **The tips can take Tuesday** — the founder chose this over the recommended "curves alone". If the tips are not proven by Monday evening Oct 5 they get Tuesday Oct 6; the freeze stays Wednesday evening Oct 7. If they are still not proven by Tuesday evening, the showing runs on the new curves with today's 12" blend and the tips wait until after the 10th (Claude's reading of the answer, stated to the founder). This replaces the Monday cut line in the brief's requirement 9.
- **D-17:** **One rehearsal walk, after the last change** — Phase 13's real-device walk happens on the site exactly as the shapers will see it: Tuesday Oct 6 if the tips are live by Monday evening, Wednesday morning Oct 7 if they take Tuesday.
- **D-18:** **A read-only report on the real saved boards before each push** — the founder runs one command in their own terminal, as with earlier production steps. It only reads. For every saved board on the live site it reports how far the station numbers and litres move and whether any fit verdict changes, and it is read back to the founder with the before-and-after pictures.

### What shapers will notice

- **D-19:** **Nothing is said on screen** — saved boards redraw quietly, as the founder chose on 2026-10-02. No notice, no marker, no "what's new".

### Claude's Discretion

- How Automatic finds its start (a scan, a solve, the step size), provided acceptance criterion 3 holds and the result does not flicker as a slider moves.
- How the per-tip start is stored on the board's blank, and whether the saved-board version moves from 5, provided: a board with no stored start reads as Automatic; nothing is written to a board by opening it; and a board saved after the tips step still opens if the site is rolled back one deployment.
- The wording of the too-close line (D-05), the look of the mark on the drawing, the DATASHEET line and where the start sits on the order form (D-12), and the new wording of THICKNESS's opening line, which today says the tips are thinned "in the last 12"". All of these go to the screen design step.
- Whether the start reads in centimetres or whole millimetres in Metric. It is a distance along the board, like a fin's distance off the tail, so marks (whole millimetres) is the likely answer under CLAUDE.md Rule 2; the screen design step settles it.
- The set of before-and-after pictures for each go (D-15), and the form of the saved-boards report (D-18). `scripts/check-saved-boards.ts` is the precedent.
- How the golden of today's numbers is generated and which commit it pins, provided it is the code live on the site before the curves step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The brief and the research
- `.planning/phases/14-realistic-surfboard-flow/14-SPEC.md` — Locked requirements. MUST read before planning. Requirement 9's cut line is replaced by D-16.
- `.planning/todos/completed/2026-09-28-give-the-foil-and-rocker-curves-a-realistic-surfboard-flow.md` — The phase's research record: the founder's words verbatim, the measured findings (sections 1–8), the two-step plan and the four answers. Section 1 defines the square-root rise and fall; section 7 defines the steady taper and the automatic start.
- `.planning/phases/14-realistic-surfboard-flow/pictures/tip-taper-three-shapes.png` — What the founder picked the taper from (D-01).
- `.planning/phases/14-realistic-surfboard-flow/pictures/curve-inside-the-rule.png` — What the founder picked the inner curve from (D-13).
- `.planning/phases/14-realistic-surfboard-flow/14-research-scratch.tar.gz` — The scratch scripts behind every measurement, as an archive. `2026-10-02-taper-shapes/shapes.ts` holds the taper shapes and the automatic start as measured; `2026-10-02-curve-research/board/lib.ts` holds the square-root rule as measured (`prepareRoot`). Not app code; rebuild from it, do not import it.

### Earlier decisions this phase changes or relies on
- `.planning/milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-CONTEXT.md` — D-04 (Tip Style), D-05 (the S-shaped ease this phase replaces), D-06 (the rocker numbers are the board's own), D-13 and D-20 (the 12" fine-tune), D-16 (a tip is always as thick as its setting), D-17 (presets keep their own cut).
- `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-CONTEXT.md` — D-01 (the blank is copied into the board), D-11 (the fine-tune is a stored signed offset), D-13 (PCHIP as the app's one monotone sampler), D-14 (the hand-set board is five typed stations).
- `CLAUDE.md` — Rule 1 (geometry in `lib/geometry/`, pure and tested, fixtures generated), Rule 2 (metric in the data, units through `lib/geometry/units.ts`), and the Database section's order of migration and deploy.

### The showing
- `.planning/phases/13-ready-for-the-shapers/13-SPEC.md` — Phase 13's list and Progress Log; item 13 is the rehearsal walk and the freeze that D-16 and D-17 schedule around.
- `.planning/phases/13-ready-for-the-shapers/13-UAT.md` — The founder's walk sheet.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/pchip.ts` (`preparePchip`, `pchipMinimum`): the curve that runs inside the square-root rule (D-13). The levelling rule reads its exact minimum between knots, so the new bottom curve needs its own exact low point (the brief's constraint 4).
- `lib/geometry/blank-fit.ts`: `prepareBlank` fits a blank's three curves in one place; `boardOnBlank` holds the whole tip rule in a few lines (the unthinned thickness, one signed thinning per tip, a weight over `TIP_EASE_WINDOW_MM`); `fitAt` and `runsOutCause` read the tip window by that same constant.
- `lib/geometry/board-profile.ts` (`buildBoardProfile`, `buildFallbackProfile`): the one side profile every screen reads; the hand-set board is drawn here.
- `lib/geometry/phase11-foil.ts`: Phase 11's carry-over maths. It must keep today's PCHIP (the brief's constraint 5).
- `scripts/extract-phase11-foil-golden.ts` and `lib/geometry/__fixtures__/phase11-foil-golden*.json`: how Phase 12 pinned the previous release's numbers before changing the rules.
- `scripts/check-saved-boards.ts`: a read-only check over saved boards, the precedent for D-18.
- `components/design/slider-row.tsx` with `measureSlider`, and `TwoOptionToggle` in `components/rocker/rocker-controls.tsx`: the slider and the quiet two-way control the THICKNESS group already uses.

### Established Patterns
- A board carries its blank and its cut by value (`BoardBlank` in `lib/geometry/blank.ts`): placement, the two fine-tunes, Deck Skin, Tip Style, fine-tune surface. The per-tip start joins these.
- Saved boards are versioned snapshots (`lib/models/design-snapshot.ts`, version 5) that are converted on read and never rewritten by opening.
- Every design change goes through the store's mutators, which record one undo step per control movement (`components/design/design-store.tsx`).
- Tip Style and the fine-tune rows appear only with a blank picked; with no blank the THICKNESS group shows five plain thickness rows.
- The four presets' figures are recorded in tests and regenerated, never typed (`lib/geometry/presets.test.ts`, `scripts/generate-preset-blanks.ts`).

### Integration Points
- ROCKER: `components/rocker/rocker-controls.tsx` (THICKNESS group, where D-10 puts the controls), `rocker-viewer.tsx` (the side profile, D-12's mark), `rocker-datasheet.tsx` (D-12's line), `board-on-blank.tsx` and `blank-flag.tsx` (the flag lines, where D-05's line belongs).
- The printed order form: `components/summary/order-form.tsx` (its ROCKER strip and PLANING table, D-12).
- VOLUME, RAILS and the preset and rack cards read the same side profile, so they follow without their own changes; their recorded figures and reference screenshots will move.

</code_context>

<specifics>
## Specific Ideas

- The founder decides from pictures. Both pictures in `pictures/` were drawn with the app's own board maths and are what the decisions rest on; each go-live gets its own before-and-after set (D-15).
- The Thinning Starts control should feel like the chart the founder used on 2026-10-02: a slider with the distance beside it and an Automatic button (D-11).
- What moves, as told to the founder: the four preset cards (Shortboard 29.4 → 29.6 L, Fish 35.0 → 35.3, Mid-length 50.3 → 50.4, Longboard unchanged at 75.3, station numbers within 1/64"); the first board a visitor sees, with no blank (curves up to 1/8" between stations, 30.1 → 30.5 L); a saved board on an Arctic blank (rocker numbers up to 3/32", litres about +2%); no stress board flips from fitting to not fitting.
- Shapes that were measured and set aside, so nobody re-tries them blind: a power ramp (never needs a longer run, but draws a dead-flat slab with a sharp bend on tails that need foam added back); thinning taken off the blank's own curve by a square law (3 thin-spot boards, 16 humps; not the same curve as the parabola, 0.64" apart at worst); the same by a cube law (16 thin-spot boards).

</specifics>

<deferred>
## Deferred Ideas

- **A Thinning Starts default in Fit & Tip Defaults** — after the Oct 10 showing (D-06). It needs new account columns and a production migration.
- **Steffen's curve inside the rule** — a touch smoother at the stations with the same accuracy (D-13). Worth revisiting only if a shaper remarks on the bend at a station.
- **The tape-measure result** — when the founder has measured a real Arctic blank (D-08), check it against the curve and record it; a real Marko blank would be a second check.

### Reviewed Todos (not folded)

The todo matcher flagged every pending todo that shares a word with the phase. None is folded, by the locked brief:

- **Custom rocker on a blank, saved as the shaper's own Custom Blank** — its own work, after Oct 10.
- **Fix the blank catalogue dims the founder knows are wrong** — the founder's own list; the 9'9"B and the odd cells from the research's section 8 were added to it.
- **Show live coordinates under the pointer on the Template and Rocker curves**, **Open the blank's own catalog page from the app**, **Hold the ghost still until the control is released**, **Build in bottom contours**, **finished-board photo uploads**, **Brand the order form** — unrelated to how the curves are drawn.

</deferred>

---

*Phase: 14-Realistic Surfboard Flow*
*Context gathered: 2026-10-02*
