---
phase: 17-bottom-contours
plan: 04
subsystem: geometry + store (bottom contours: RAILS works from what the bottom leaves; one bottom in the design store)
status: checkpoint
tags: [bottom, rails, store, 3d, rack, D-04, D-05, D-20, D-21, D-22, D-35, D-40, D-41]
requires:
  - "17-02: bottom.ts (foamOff, resolveBottom, bottomHasCut, BottomBoard), designBottomBoard"
  - "17-03: designCrossSectionInput(…, bottom?), the seam in boardSectionsWith, DesignSummaryFields.bottom/fins/finsImportTemplate"
provides:
  - "design.ts: railAnchorStations, bottomRailLift, railsOnTheBottom, railBandsOnTheBottom"
  - "rail-bottom.ts: railSectionBottom, railBottomFall, railPointOnBottom, railBottomLine, railBottomLowest, finishedRailOnBottom"
  - "rail-bands.ts: RailSectionOutput.bottom?, RailSectionBottom"
  - "imported-readout.ts: railsImportedReadout(…, liftPresent)"
  - "design-store.tsx: state.bottom, bottomBoard, resolvedBottom, bottomSections, railsOnBottom, railBandsOnBottom, quotedVolumeLitresBeforeBottom"
affects: [17-05, 17-08, 17-09, 17-10, 17-12]
tech-stack:
  added: []
  patterns:
    - "A RAILS-only step after deriveEffectiveRails: same object back when no rail is lifted, so a flat board's RAILS is the very objects it always was"
    - "The rail drawn in its own frame, every point moved onto the planed bottom by one map (fall at its x, all of it on the bottom, none on the deck)"
    - "One crossSectionInput memo feeds the litres and bottomSections, so no component builds sections of its own"
key-files:
  created:
    - lib/geometry/rail-bottom.ts
    - lib/geometry/rail-bottom.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-04-rails-on-the-bottom.png
    - .planning/phases/17-bottom-contours/pictures/17-04-pictures-source.tar.gz
  modified:
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - lib/geometry/imported-readout.ts
    - lib/geometry/imported-readout.test.ts
    - lib/geometry/rail-bands.ts
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/3d/three-d-screen.tsx
    - components/rails/rail-band-editor.tsx
    - components/rails/rail-controls.tsx
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-section-plot.test.ts
    - components/design/screen-tiles.tsx
    - components/summary/order-form.tsx
    - lib/models/rack-models.ts
    - lib/models/rack-models.test.ts
decisions:
  - "D-41 drawn in RAILS' own frame: the rail keeps its place (bottom at its edge = 0, deck at the thinned thickness); the planed bottom falls away inboard toward the stringer at the cut's angle; the bands' bottom ends sit on it through one map (fall × (1 − y/T))"
  - "Only a section whose rail the bottom lifts carries a bottom; a concave (lift 0 at the rail) changes nothing on RAILS, even where it hollows the bottom inboard inside the plot"
  - "The order form's Rail Band Reference prints the same lifted bands and the same drawn bottom as RAILS (one plot component); its headline thickness keeps the planed figure"
  - "RAILS' sliders keep reading and writing the shaper's own effectiveRails; only the readout card, plots, DATA, the Deck Profile and nudge labels read the lifted bands"
  - "A lift deeper than the rail can stand is held at the 1/4\" floor in RAILS' figures (the band maths cannot band a rail of no thickness); BOTTOM flags such a rail (17-09)"
  - "Readout caption `From ROCKER, FOIL & BOTTOM` only when a lift is present (planner's reading of D-35, for the founder)"
metrics:
  duration: "about 38 minutes (00:28 to 01:07 UTC), about 17 of them the full unit suite (5.6 min) and the desktop and phone browser specs (6.2 min and 2.6 min)"
  completed: 2026-11-08
actuals:
  tokens: 12900
  tasks: 2
  commits: 5
---

# Phase 17 Plan 04: RAILS works from what the bottom leaves; one bottom in the design store — Summary

RAILS now bands the thinner rail a vee or a belly leaves, and draws that rail standing on the planed bottom at the cut's
own angle (your D-41). The design keeps one bottom of its own, beside the rails and fins, and VOLUME's litres, the 3D
board, Export 3D Files, RAILS, the RAILS menu tile, the order form's Rail Band Reference and the rack cards all read it.
Every board still opens flat, so nothing anyone can see today has moved.

## What changes for the founder

Nothing on screen yet: there is no way to pick a cut until the BOTTOM page arrives (17-08). Underneath:

- **RAILS bands the rail that is left.** At each of RAILS' three stations (tail 12", centre, nose 12") the thickness
  RAILS works from is the planed thickness less the bottom's lift at the rail. On the Fish with a Panel Vee, the tail
  rail is lifted 0.150", so RAILS bands a 1 11/16" rail instead of 1 7/8". The nose and centre sit off the vee and do
  not move.
- **RAILS draws the bottom under the rail at the vee's angle (D-41).** The rail stays where RAILS has always drawn it.
  Inboard of it, the planed bottom falls away toward the stringer, and the bottom marks (the tucks) sit on that
  bottom, never above it. The finished rail follows it too. A concave leaves the rail alone, so it changes nothing on
  RAILS.
- **The readout card says where the numbers came from.** While a lift is there, RAILS' Inputs card reads
  `From ROCKER, FOIL & BOTTOM`. Otherwise it reads `From ROCKER & FOIL`, as today.
- **The headline thickness never moves.** The rack card's thickness, the order form's Thickness box and VOLUME's
  working rows keep the planed figure. On the Fish it is 2 1/2" flat and 2 1/2" with the vee.
- **The paper matches the screen.** The order form's Rail Band Reference (its three plots and its table) prints the
  same thinner rail and the same angled bottom as RAILS. The Rail Band Instructions page draws a fixed example rail,
  not this board, so it does not change.
- **One litres everywhere.** A rack card now carries the board's own fins into its litres, so a saved board's bottom
  (17-12) will be counted exactly as VOLUME counts it.

## The figures (the app's own, from `measure-lifts.ts` and the picture script; none typed in a test)

| Board, cut (starting numbers) | Station | Planed | Rail lift | RAILS bands |
|---|---|---|---|---|
| Fish, Panel Vee | tail 12" | 1 7/8" | 0.150" | 1 11/16" |
| Fish, Panel Vee | centre, nose 12" | 2 1/2", 1 7/8" | 0 | unchanged |
| Longboard, Continuous Belly / Rolled Mid | centre | 3" | 0.371" | 2 5/8" |
| Longboard, Continuous Belly / Rolled Mid | tail 12", nose 12" | 1 15/16" | 0.014", 0.008" | 1 15/16" |
| Longboard, Rolled Vee | tail 12" | 1 15/16" | 0.223" | 1 3/4" |
| Mid-length, Rolled Vee | tail 12" | 1 7/8" | 0.250" | 1 5/8" |
| Shortboard, Deep Single Concave | all three | — | 0 | unchanged (same object) |

**D-35's comparison: RAILS' rail against the 3D board's rail.** This is the widest gap between RAILS' rail on the
lifted bottom and the 3D board's own rail at the same station:

| Case | Gap with the cut | Gap at the same station with a flat bottom |
|---|---|---|
| Fish, Panel Vee, tail 12" | 1.4 mm | 2.4 mm |
| Longboard belly, centre | 2.9 mm (0.12") | 2.2 mm |
| Longboard belly, tail 12" | 1.5 mm | 1.4 mm |
| Longboard Rolled Vee, tail 12" | 1.7 mm | 1.4 mm |

**[Measured, not bent] The plan's "up to an inch" no longer holds.** The research measured the Longboard's two rails
15.5 mm and 24.5 mm apart. That was before D-40 changed how the 3D board lifts the rail (by `f · (1 − h/a)`). Now the
two lie within 2.9 mm of each other on every case drawn, and a flat bottom alone already leaves up to 2.4 mm between
them. That 2.4 mm is the 3D board's own sampling and its tip blend at the station. The widest place is the deck
shoulder at the Longboard's centre, where RAILS' thinner rail rounds a little higher. The code is the plan's
(D-35: planed less lift). The question to you is reworded below.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests: RAILS bands the lifted rail, never the headline thickness | fe689f00 | design.test.ts, imported-readout.test.ts |
| 1 (GREEN) | RAILS' three anchors read the planed thickness less the rail lift, in a RAILS-only step | 18d78894 | design.ts, imported-readout.ts |
| 2 | One bottom in the store, read by VOLUME, the 3D board and its files, RAILS and the rack cards | 2a2ab136 | design-store.tsx (+test), three-d-screen.tsx, rail-band-editor.tsx, rail-controls.tsx, screen-tiles.tsx, order-form.tsx, rack-models.ts (+test) |
| D-41 | RAILS draws the rail standing on the bottom the cut leaves | f64fc678 | rail-bottom.ts (+test), design.ts, rail-bands.ts, design-store.tsx, rail-section-plot.tsx (+test) |
| 3 | The founder's look | checkpoint (this summary and the picture committed together) | pictures/17-04-rails-on-the-bottom.png, pictures/17-04-pictures-source.tar.gz |

## Readers: what reads the lifted rail, and what keeps the planed one

- **Lifted (`railBandsOnBottom` / `railsOnBottom`):**
  - RAILS: its three VIEWER plots, the phone's single plot, DATA, View Full Sized, the readout card, and the Deck
    Profile and nudge labels (`RailControls`' `bands`).
  - The RAILS ☰ tile (`screen-tiles.tsx`).
  - The order form's Rail Band Reference: its plots and its data table.
- **Planed (unchanged):**
  - RAILS' thickness sliders, which still read and write the shaper's own `effectiveRails`.
  - `summarizeDesign`'s centre thickness, which is the rack card.
  - The order form's Thickness box (`railBands.center.boardThickness`).
  - VOLUME's estimator rows (`railValues` from `railBands`).
  - The litres and the 3D board, which read `effectiveRails` and take the lift through their own sections.
  - `three-d-controls.tsx`'s hard-edge window, which is not a thickness.
- **Bottomed input (`{ bottom, board: bottomBoard }`):**
  - The store's `crossSectionInput`, which feeds `crossSectionVolume` and `bottomSections`.
  - The 3D screen's one surface build, which also feeds Export 3D Files.

## Verification

- `npx tsc --noEmit` exits 0. `npm run lint` shows 0 errors and one warning, the unrelated
  `lib/db/import-designs-action.test.ts` one that 17-03 also saw.
- Full unit suite: 184 files, 10,735 passed, 2 skipped, exit 0 (5.6 min).
- Browser, desktop (`PW_PORT=3304 IS_WEBPACK_TEST=1`): `desktop-baseline`, `template-rails-panels`,
  `volume-fins-panels`, `three-d-screen`, `three-d-export`, `summary-planing`, `summary-rail-instructions-fit` and
  `imported-readout`. 62 passed, 8 skipped, exit 0 (6.2 min).
- `phone-rails` on iPhone and Android: 33 passed, 17 skipped, exit 0 (2.6 min).
- `git status --porcelain e2e` is empty: no reference picture moved.
- **Flat boards drawn character for character:** a scratch test drew every rail plot of the 102 test boards (nose,
  centre and tail; Imperial and Metric; Finished Rail on and off; Ghost Bands on) with the new plot and with the plot
  as it was before this plan. All 612 drawings were identical (`zz-svg-identity.test.ts` in the tarball).
- Same-object proofs: with no bottom, all 102 boards' `railsOnTheBottom` returns `effectiveRails` itself, and
  `railBandsOnTheBottom` returns the bands themselves.
- Relation tests: a Panel Vee lowers each anchor by exactly `foamOff(anchor, railAt(anchor))`; a Deep Single Concave
  returns the same object; on a vee board `summarizeDesign(...).centerThickness` and `deriveRailValues` of the shared
  rails are unchanged.
- `deriveEffectiveRails` is not edited (the diff check prints 0). `lib/db/schema.ts`, `drizzle/` and `package.json` are
  untouched. `three-source.test.ts` passes.
- Cost: `bottomSections` adds one more pass of the sections per board change, measured at 2.9 to 6.4 ms in Node on a
  loaded machine, about what the litres themselves take.

## Deviations from Plan

1. **[Orchestrator ruling 2, D-41] The angled bottom on RAILS' plots** was added beyond the plan's tasks, as its own
   commit (f64fc678). It needed files outside `files_modified`:
   - new: `lib/geometry/rail-bottom.ts` and its test;
   - changed: `lib/geometry/rail-bands.ts` (an optional `bottom` on `RailSectionOutput`), `rail-section-plot.tsx` and
     its test.

   A plot whose rail is lifted gets a box that reaches as far down as the bottom falls, and its axis numbers sit just
   under the lowest point. Without a bottom, the box and the numbers are exactly as before.
2. **[Rule 3] `components/rails/rail-controls.tsx`** gained two optional props, `importedSpec` and `importedFromBottom`.
   The readout card lives there, and its sliders must keep reading the shaper's own thicknesses: passing the lifted
   rails as `spec` would have written the lift back into a hand-set thickness on the next slider move.
3. **[Rule 3] `components/design/design-store.test.ts`**: the source rule for the litres' input now checks the new
   `crossSectionInput` memo, which carries `{ bottom: state.bottom, board: bottomBoard }`, and checks that
   `bottomSections` builds from the same input. The old regex required exactly four arguments.
4. **The 102 boards** are `phase16SurfaceBoards()`, the pin's set. `phase16Boards()` holds 40.
5. **A lift deeper than the rail can stand** is held at RAILS' 1/4" floor (`BOTTOM_FLOOR`), not below it, because the
   band maths cannot band a rail of no thickness. No preset reaches it at its starting numbers.
6. **The order form's plots** print the angled bottom as well, because they are the same plot component. This follows
   the plan's "the paper matches the screen" (item 4), and a flat board's sheet is unchanged.
7. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`: the model that did the work,
   and the session's attribution rule, as waves 1 to 3 recorded. The orchestrator asked for another model's name; I
   did not write a co-author line for a model that did not do the work.
8. **The plan's D-35 figure (up to an inch on the Longboard) is out of date:** see the comparison above. Raised for
   the founder, with the maths left as the plan has it.

## Known Stubs

None. `bottom` is `DEFAULT_BOTTOM` on every board by design until 17-08 (the BOTTOM page) and 17-12 (saving). Neither
`bottom` in `historySnapshot` / `designSnapshotFields` nor any store action is added here, as the plan says.

## Threat Flags

None. There is no new endpoint, input, file path or schema. The bottom reaches every reader from one store memo.

## Founder's look: Approved (2026-11-08)

The founder, on the checkpoint card with the picture: *"Approved — merge it."* He kept the readout caption as built: *"From ROCKER, FOIL & BOTTOM"* only when a lift is present, *"From ROCKER & FOIL"* otherwise (D-35 and D-41 as drawn; the order form's Rail Band Reference prints the same thinned rail). Merged as 82368774.

Picture: `.planning/phases/17-bottom-contours/pictures/17-04-rails-on-the-bottom.png` (sources in
`17-04-pictures-source.tar.gz`). Awaiting "approved", or changes.

1. **The Fish's Panel Vee (section 1):** RAILS' three plots flat and with the vee, side by side. The tail plot's bottom
   now falls away toward the stringer under the rail, and the tail rail is 1 11/16" instead of 1 7/8". The nose and
   centre are unchanged. Beside them, the tail rail is drawn over the 3D board's rail: 1.4 mm apart at most.
2. **The Longboard's Continuous Belly / Rolled Mid (section 2):** the centre rail is lifted 0.371", so RAILS bands
   2 5/8" instead of 3", and the bottom falls about 0.35" across the plot. Against the 3D board's rail, the widest gap
   is 2.9 mm (0.12"), at the deck shoulder. That is not the inch the research measured: D-40 brought the two
   together. Is RAILS' reading (the planed thickness less the lift, D-35) the one you want?
3. **The readout card** says `From ROCKER, FOIL & BOTTOM` only when a lift is there. Yes or no to the wording?
4. **The paper:** the order form's Rail Band Reference prints the same thinner rail and angled bottom as RAILS. Yes or
   no?
5. **A flat board is unchanged (section 3):** all 612 test drawings were checked against the old code, and no
   reference picture moved.

## Self-Check: PASSED

All created files exist. Commits fe689f00, 18d78894, 2a2ab136 and f64fc678 are on the branch. Both pictures are in
`pictures/`.
