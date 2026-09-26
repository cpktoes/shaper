# Phase 11: Rocker from Real Blanks - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning
**Branch:** `rocker-blanks` — nothing lands on `main` without the founder's approval of the plan, and no code is written before that approval

<domain>
## Phase Boundary

The ROCKER screen stops being a hand-drawn curve. A shaper sets a target centre thickness, picks a real blank that fits — US Blanks, Arctic Foam or Marko Foam, 162 blanks seeded from the three catalogue tables under `db/seed/blanks/` — slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam: the four rocker numbers and the foam to come off shown live, every blank that won't fit shown with why, and a foil that matches the shaper's centre and tip thicknesses. The blank's own station rows travel with the saved board. Tilting the board within the blank, tooltips, other pages and billing stay out.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**16 requirements are locked.** See `11-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `11-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- The blank tables, migration and re-runnable seed for the three CSVs
- Pure geometry under `lib/geometry/`: the pchip sampler, leveling, cropping the blank to the board at a placement, the fit check (thickness envelope + width margin), the scaled foil, the list filter and the nearest-fit rule — all unit-tested
- The ROCKER screen rebuilt in the brief's order: centre thickness → blank list → placement slider → live readouts → tip and foil fine-tune; the drawing showing the board inside the blank with the foam shaded; the DATASHEET showing the blank's numbers beside the board's
- The hand-drawn fallback for a board with no blank: five typed stations on pchip
- Shaper defaults on the account (gear menu, browser fallback): nose and tail tip thickness, the two fit floors, the width margin
- The saved-board format carrying the chosen blank's stations, placement and thickness choices (snapshot version 4, with migration of older saves)
- Presets naming a blank + placement (provisional picks, to be captured by the founder)

**Out of scope (from SPEC.md):**
- Tilting the board within the blank
- Tooltips, including the pointer-coordinates todo
- Other pages — TEMPLATE, RAILS, FINS, VOLUME, SUMMARY and the setup screen keep reading rocker, foil and thickness through the links they already have; naming the blank on the order form is a deferred idea
- Billing
- Managing or editing blank data inside the app, or vendors beyond the three tables

</spec_lock>

<decisions>
## Implementation Decisions

### What a saved board remembers
- **D-01:** **The blank is copied into the board.** A saved board carries the chosen blank's identity (vendor, name, catalogue slug and page) **and its station rows exactly as picked**, plus the placement (a signed `Mm`, positive toward the nose), the target centre thickness (which stays the existing `foil.center`), its own nose and tail tip thicknesses, and the two 12 in fine-tune offsets. Everything the app shows re-derives from that copy: the Summary's rocker box, the rack, reopening and autosave never read the blank table, and a later catalogue correction can never silently move a saved board. — **Reversibility:** costly — this becomes the shape of snapshot version 4 in every saved row; changing it later means another version bump with its own migration story.
- **D-02:** **No blank means the hand-drawn fallback**, not a forced pick and not a blank screen. A brand-new board and a board saved before this phase open on the fallback rocker (now five typed stations on pchip, D-14); picking a blank replaces it. A board saved before this phase reopens looking as it was saved — the migration seeds its five stations by sampling the saved Bezier at those stations (D-14), so nothing needs ceremony (Phase 4's D-15 still holds).
- **D-03:** **Each preset names a blank + placement.** The four presets' captured rocker blocks retire in favour of a blank pick; the plan seeds a *provisional* pick for each (the nearest fitting blank by the D-08 rule against that preset's own dims and thickness) and marks them provisional in `presets.ts`, and the dev-only "Copy preset values" affordance learns to print the blank line, so the founder can replace all four through the same capture loop the outlines and rockers went through. A preset's foil becomes derived (D-10) from its centre and tips, so the typed `nose12`/`tail12` values go too.

### The fit rule & the blank list
- **D-04:** **Two floors hide a blank from the list:** blank length ≥ board length + **2 in**, and blank centre thickness ≥ target centre + **3/8 in**. Both are shaper settings with those defaults (D-09), never literals in the filter.
- **D-05:** **Width is a hard fit check with a 1 in margin:** at every station where the board has width, the board must be at least 1 in narrower than the blank — 1/2 in of waste a side, in the founder's words: *"the board's width must be 1" narrower than the blank width at each station, allowing 1/2" of waste material on each side at minimum."* The margin is a third setting (default 1 in). The blank's width is the pchip-interpolated width at the board's station mapped through the placement; the board's width is its own drawn outline (`sampleOutline`). Rounded-nose blanks carry width 0 at the very tip by design, so the rule is evaluated only where the board itself has width — the last inch is the delicate regime and the planner measures it against the seeded data before fixing a sampling step.
- **D-06:** **Floor failures are hidden; envelope failures are shown greyed with the reason.** A blank too short or too thin at centre never appears. A blank that passes both floors but fails the thickness envelope or the width margin somewhere along its length stays listed, greyed, with the failing station and by how much (e.g. *1/8" too thin 12" from the nose*, *1/2" too wide at the widepoint*).
- **D-07:** **A blank's verdict is judged at its best placement.** A blank counts as fitting if any slider position within the D-08 range fits; picking it lands the slider at that position (the fitting placement closest to centre); a failing blank's reason is reported at the placement where its worst shortfall is smallest — its "nearly fits" reading. List verdicts recompute only when the board's dims, centre thickness, tips, fine-tunes or settings change — never on a slider move (SPEC R14).
- **D-08:** **The slider runs both ways from centre**, 0 = the board's centre on the blank's centre, each end at ((blank length − board length) / 2 − 1/2 in), positive toward the nose. **"Nearest blank that fits" = any vendor, the fitting blank whose length is closest to the current blank's** (tie-break: less excess foam at centre — Claude's discretion). When the picked blank stops fitting it stays picked and flagged with the reason; the offer sits beside the flag; nothing is cleared without the shaper's own action.

### Thickness settings & the foil
- **D-09:** **The defaults live on the account, in the gear menu,** following the Imperial/Metric and print-instructions pattern exactly: nose tip thickness, tail tip thickness, minimum extra length (2 in), minimum extra centre thickness (3/8 in) and width margin (1 in) — saved on `user_preferences`, remembered by the browser when signed out, resolved on the server so the first paint is right. A new board starts from them; the board stores its own tips (and its centre), so one board can be tuned without moving the defaults, and a saved board never depends on a live setting. Unset means "not chosen" (nullable columns), as the existing preferences do. — **Reversibility:** costly — a production migration on `user_preferences` (push the code, deploy, then migrate) and a provider/handoff pair on every route.
- **D-10:** **The foil is the blank's own foil scaled to the board's centre:** board thickness(x) = blank thickness(x) × (target centre ÷ blank centre), floored at the tip setting toward each end so the tips never fall below it and the curve stays continuous. Never a subtracted constant. The board keeps the blank's foil character; the fit check runs on the final foil, so a tip setting thicker than the blank's tip shows up as a fit failure at that tip rather than a clipped curve.
- **D-11:** **The 12 in thicknesses are read off that scaled foil and a fine-tune is a signed offset**, stored per station on the board, re-applied after every change of blank, centre or placement, cleared by a Reset. The fit check and every readout see the final (derived + offset) number.
- **D-12:** **Centre thickness is stored once** — `foil.center` remains the board's single stored centre; the ROCKER screen's first control writes it; RAILS and VOLUME keep reading it through their existing links. No page-local copy, no second field.

### Curve math & the drawing
- **D-13:** **Textbook pchip becomes the app's one monotone sampler,** used for blank rocker, thickness and width, for the board's deck curve, and for the fallback rocker — and the existing foil moves onto it, so a hand-drawn deck and a blank deck are the same math. The founder wants digit-parity with SciPy/MATLAB `pchip`, so the rules are written down here rather than left to memory: interior tangent d_k = 0 when the flanking secants δ_{k−1}, δ_k differ in sign or either is zero; otherwise, with h_{k−1} = x_k − x_{k−1} and h_k = x_{k+1} − x_k, w1 = 2h_k + h_{k−1}, w2 = h_k + 2h_{k−1}, d_k = (w1 + w2) / (w1/δ_{k−1} + w2/δ_k). End tangents use pchip's three-point rule — d_0 = ((2h_0 + h_1)δ_0 − h_0 δ_1) / (h_0 + h_1), set to 0 if its sign differs from δ_0's, and clamped to 3δ_0 when δ_0 and δ_1 differ in sign and it exceeds that; mirrored at the far end; two points interpolate linearly. Evaluation is the cubic Hermite already in `monotone-spline.ts`. These tangents are monotone by construction, so the Fritsch–Carlson circle clamp is no longer needed in the code path; the existing no-overshoot tests stay and gain a hand-worked tangent case. Existing boards' drawn foil and litres move by a hair; every affected fixture is regenerated by its script, never edited. — **Reversibility:** costly — every foil-derived number in the app (volume, the drawn deck, the order form's rocker box) moves with the sampler.
- **D-14:** **The hand-drawn fallback is five typed stations on pchip** — nose tip, nose 12 in, centre (0 by leveling), tail 12 in, tail tip — the founder's explicit choice, made knowing that Phase 4's five-station spline kinked at the 12 in marks on sparse hand stations and that quick task 260829-rda replaced it with the three-knot Bezier for that reason. The founder accepts that risk for a fallback path. The Angle/Smoothness/Flatness controls and the two tip drag handles retire; the DATASHEET's rocker row becomes typed at all four non-centre stations again (Phase 4 D-06/D-07). Recorded here so nobody "fixes" the fallback back to the Bezier without asking. Snapshot migration: version 3's Bezier is sampled at the five stations; version 2's four-lift shape maps straight onto them. — **Reversibility:** costly — a second shape change of the stored rocker in the save format.
- **D-15:** **The drawing shows the board inside the blank with the foam shaded** — the blank's side silhouette (bottom rocker and deck) drawn faint, the board's own profile inside it at the current placement, and the foam to come off shaded between them, using tokens the palette already has (no new hue — `app/globals.css`'s palette contract). Readouts stay on the callout rails in the sketch-manifest grammar. Side view only: width failures are read in the list and the datasheet, not drawn.
- **D-16:** **The DATASHEET tab stays and gains the blank's numbers:** at each of the five stations, the blank's rocker, thickness and width, the board's rocker, thickness and width, and the foam removed — the sheet a shaper takes to the supplier. In the fallback (no blank) it is the typed-entry surface for the five stations.

### Claude's Discretion
- **Storage shape of a blank:** the brief's "a list of stations" is satisfied by a `jsonb` station array on the blank row or by a normalised stations table; lean `jsonb` (it keeps the D-01 copy trivial and forbids per-station columns by construction) — record the choice. `vendor + name` unique; `catalog_slug`/`pdf_page` kept as provenance; flag text verbatim.
- **Seed script:** home (`scripts/` beside the golden extractors, or `lib/db/seed/`), npm script name (`db:seed:blanks`), idempotent upsert on vendor + name, and a hand-rolled RFC-4180 reader (blank names like `5'8"" SB` and flags with commas are quoted) rather than a new dependency. Unit-test the reader and the row → blank mapping in `lib/`.
- **SUP exclusion rule:** define "no usable thickness data" mechanically (no thickness at centre, or fewer than the stations a fit needs) so the 10'0" MK-SUP-STD's single doubtful cell still excludes it; store an `pickable`-style derived flag or compute it at read time — either, but tested.
- **How the blank table reaches the client:** the ROCKER route is already dynamic; a Server Component prop carrying the pickable blanks with their stations (tens of KB) once per visit is the obvious shape. The picked blank's stations come from the board itself (D-01), so every other screen needs nothing.
- **Deriving the effective foil for existing consumers:** RAILS reads three station values, VOLUME integrates the sampled deck, the order form draws it. Build the board's thickness curve once in the store (blank-scaled curve when a blank is picked, five-station pchip in the fallback) and hand consumers a sampler or a derived five-station `FoilSpec` from it — one place, so RAILS/VOLUME/SUMMARY code doesn't change. Note that a five-point re-spline of the blank curve is *not* the blank curve between stations: drawing and integration must sample the dense blank-derived curve.
- **Best-placement search and verdict budget (D-07):** step, memoisation, and whether verdicts run in a worker — recompute on inputs other than the slider only.
- **The tip floor blend (D-10):** how the scaled curve eases into the tip setting near the ends while staying continuous and monotone; the fit check runs on the result.
- **Pinning pchip parity (D-13):** hand-worked tangent values for a 4- and 5-point case; if SciPy is available on the founder's machine, an optional generated fixture. Whether `monotone-spline.ts` is renamed or corrected in place — one sampler, one name, header comment rewritten to say pchip and why.
- **Which existing tests and fixtures move:** volume goldens and the blank-datasheet validation stay within tolerance and are regenerated by script if not; `rocker-drag.ts` and its tests retire with the Bezier; the phone e2e specs that drag rocker handles are rewritten for the new controls (the placement slider gets a touch test) — rewritten, never deleted and forgotten.
- **List presentation:** vendor grouping, length ordering, a search box, the greyed-row treatment and the reason wording; phone layout of the picker inside the shared `DesignScreenShell` (the list lives in the scrolling controls column). `/gsd-ui-phase 11` is available for the visual contract.
- **Metric rendering:** every new figure through `lib/geometry/measure-display.ts` — rocker heights, thicknesses and foam removed are marks (1/16 in ↔ whole mm); the blank's length is a dim (cm to one decimal).
- **Undo/redo:** the placement slider records history the way the existing sliders do (per snapshot identity); coalescing is the existing pattern's concern.
- **Data notes to honour, not fix:** the 11 US Blanks rows with a literal rocker 0 at T48/N48 flagged "not printed in catalog" load as-is (the brief says load as-is; a literal 0 is a value, an empty cell is not); US Blanks' `deck_length_in` is stored optional and unused by the fit; `length_in` is the blank length everywhere.
- **All plain-English copy** for flags, reasons, the offer and the settings rows.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements
- `.planning/phases/11-rocker-from-real-blanks/11-SPEC.md` — Locked requirements — MUST read before planning. The founder's brief as 16 falsifiable requirements, boundaries, constraints, the four named tests and the DONE WHEN criteria

### The data
- `db/seed/blanks/us_blanks_stations.csv` — 1,285 rows, 101 blanks, 9–15 stations each; the only vendor with `deck_length_in`; 22 EPS blanks lack `volume_l`; 4 empty thickness cells (8'8" EPS / 8'8"X EPS at T48/N48)
- `db/seed/blanks/arctic_foam_stations.csv` — 173 rows, 33 blanks, 5 stations plus a width-only `N3` on 8 blanks; no deck length; cm-vs-inch provenance flags
- `db/seed/blanks/marko_foam_stations.csv` — 212 rows, 28 blanks, 5–10 stations; no volume, no deck length; the four MK-SUP-STD blanks 9'0"–12'0" with illegible thickness; datums of 0.02 (Wakesurf Regular, 5'3" Foil) and 0.21 (10'2" M, 10'2" M Thick)

### Prior decisions this phase stands on
- `.planning/milestones/v1.0-phases/04-rocker-foil-editors/04-CONTEXT.md` — D-05 (datasheet-station language), D-06/D-07 (typed entry, the datasheet view), D-09/D-10/D-11 (one shared thickness, the RAILS override, rocker alone never moves rail numbers), D-15 (older boards reopen without ceremony); the "blank picker / blank-recommendation tool" deferral this phase delivers
- `.planning/quick/260829-rda-fix-bottom-rocker-curve-template-style-g/260829-rda-SUMMARY.md` — why the five-station rocker became a Bezier (the 12 in kink); D-14 knowingly reverses it for the fallback
- `.planning/design/GEOMETRY-MODULE.md` — the founder-approved geometry design: rocker convention (bottom-up on a flat surface), no fold-backs rule, the Simpson cross-section volume
- `.planning/sketches/MANIFEST.md` — the drafting callout grammar every viewer follows (rails, chips vs dimension lines, nothing decorative inside the silhouette)

### House rules
- `CLAUDE.md` — Rule 1 (geometry pure and tested under `lib/geometry/`, goldens by script), Rule 2 (units through `lib/geometry/units.ts`; dims vs marks), the Database section (push, deploy, then migrate production), the three layout/pointer/height switches
- `.claude/CLAUDE.md` — project constraints and the GSD workflow rule

### Code this phase changes or extends
- `lib/geometry/monotone-spline.ts` + `.test.ts` — the sampler that becomes pchip (D-13); its tests are the no-overshoot suite to extend
- `lib/geometry/rocker.ts`, `lib/geometry/rocker-drag.ts` (+ tests) — the Bezier `RockerSpec` and tip drags that retire for the five-station fallback (D-14)
- `lib/geometry/foil.ts` — `FoilSpec`, `FOIL_THICKNESS_RANGE_IN`, `sampleFoil` — the consumers of the derived foil (D-10/D-11/D-12)
- `lib/geometry/board.ts` — `BoardSpec`, `BOARD_LENGTH_RANGE_IN`, `OutlineSpec` (length/width carried in from TEMPLATE)
- `lib/geometry/outline.ts` — `sampleOutline`, `MEASURE_STATION_MM` (the 12 in station) for the width check (D-05)
- `lib/geometry/units.ts`, `lib/geometry/measure-display.ts` — the one conversion boundary and the dims/marks formatters (SPEC R15)
- `lib/geometry/presets.ts`, `lib/geometry/preset-source.ts`, `lib/geometry/__fixtures__/pinned-preset-outlines.ts` — presets gain a blank line (D-03); the capture printer; the pinned outlines the template suites use instead of live presets
- `lib/geometry/volume.ts` + `__fixtures__/blank-datasheet-golden.json` — the Simpson integration over the sampled deck and its published-blank validation (fixtures move by script if pchip nudges them)
- `lib/models/design-snapshot.ts` + `.test.ts` — `DESIGN_SNAPSHOT_VERSION` 3 → 4, the tolerate-and-migrate pattern (D-01, D-14)
- `components/design/design-store.tsx` — `DesignState`, `deriveEffectiveRails`, the volume derivations, `applyPreset` (rebuilds from `DEFAULT_DESIGN_STATE` so new fields reset safely)
- `components/rocker/rocker-editor.tsx`, `rocker-controls.tsx`, `rocker-datasheet.tsx`, `rocker-viewer.tsx`, `rocker-view-frame.ts` — the screen being rebuilt; D-18 of Phase 9 (nose-up on a phone, 66dvh ceiling) still applies
- `components/summary/order-form.tsx` — the ROCKER box reads the built geometry; it must keep drawing without the blank table (D-01)
- `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/ownership.test.ts`, `drizzle/` (0000–0003) — the tables and migration conventions; the ownership test's "no caller-supplied owner" rule
- `components/units-provider.tsx`, `app/actions/units.ts`, `lib/units-preference.ts`, `lib/units-server.ts`, `components/print-instructions-provider.tsx` (and its action/preference/server files) — the account-setting pattern D-09 copies
- `components/design/slider-row.tsx`, `components/design/measure-field.tsx`, `components/viewer/tabbed-panel.tsx`, `components/viewer/callout-primitives.tsx`, `components/design/design-screen-shell.tsx` — the shared controls, the two-tab panel, the callout grammar and the phone/desktop shell
- `e2e/phone-*.spec.ts`, `e2e/desktop-baseline.spec.ts` — the phone drag tests to rewrite and the desktop baselines that must not move for other screens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/monotone-spline.ts` — a tested cubic-Hermite evaluator with past-the-end clamping and a non-finite guard; the tangent rule changes to pchip's, the evaluator stays
- `lib/geometry/measure-display.ts` (`formatMark`, `formatDim`, `measureSlider`, `commitTypedMeasure`, `typedFieldBounds`) — the 1/16 in ↔ whole-mm snap the brief asks for already exists; every new number goes through it
- `components/design/measure-field.tsx`, `components/design/slider-row.tsx` — typed measurement entry and the house slider row (the datasheet's typed stations, the centre-thickness and placement sliders)
- `components/viewer/tabbed-panel.tsx`, `components/viewer/toolbar-button.tsx`, `components/viewer/callout-primitives.tsx` — VIEWER/DATASHEET tabs, the rotate/wide-view toolbar, the callout rails and chips the drawing keeps
- `lib/models/design-snapshot.ts` — the versioned envelope and the `z.union` + migrate pattern from version 3 (`migrateLegacyRocker`) to copy for version 4
- The account-setting pattern (`units-provider.tsx` + `app/actions/units.ts` + `lib/units-preference.ts` + `lib/units-server.ts`, mirrored by the print-instructions files) — D-09 is a third instance of it
- `lib/geometry/preset-source.ts` — the exact-sixteenth capture printer the preset blank line joins
- `lib/db/ownership.test.ts` and `lib/auth/open-access.test.ts` — the mechanical guards new server code must keep satisfying
- `scripts/extract-prototype-*-golden.mjs` — the "goldens by script, never by hand" precedent the seed and any regenerated fixture follow

### Established Patterns
- Geometry pure under `lib/geometry/` with a test per export; formulas never inlined in components (Rule 1) — the fit check, leveling, cropping, scaled foil and pchip all land there first (SPEC R16: tests before UI)
- Metric storage with branded `Mm`/`Litres`; inches and cm only at the units boundary — the CSVs' inches convert once, in the loader
- Import-or-manual links (fins ← template, rails ← foil, volume ← template/rails) — the blank pick and the fallback are the same idea on the rocker screen
- Snapshot versions tolerate and migrate rather than reject — D-01/D-14 are version 4
- Two Neon branches; push, deploy, then migrate production — two migrations this phase
- The three screen switches (width → layout, pointer → control size, height → scroll) are never conflated — the picker's phone layout rides the shell, nothing new
- Desktop baseline screenshots prove other screens didn't move; a phone requirement gets real-device evidence, not emulator evidence

### Integration Points
- `app/design/rocker/page.tsx` — becomes the (already dynamic) route that loads the pickable blanks for the picker
- `components/design/design-store.tsx` — `DesignState` gains the blank copy, placement, tips and offsets; the effective foil/rocker curves are derived here once for every consumer
- `lib/db/schema.ts` + a new migration — the blank tables; `user_preferences` + a second migration — the five settings
- `components/site-nav.tsx` / the gear menu — five new settings rows beside Imperial/Metric and the print option
- `lib/geometry/presets.ts` — a blank line per preset (provisional) and the capture affordance in `rocker-editor.tsx`
- `components/summary/order-form.tsx` — unchanged code path, new curve underneath (D-01 keeps it self-contained)
- `.github/workflows/` — the new geometry suites join CI as the existing ones do

</code_context>

<specifics>
## Specific Ideas

- The founder's brief (2026-09-25) is the spec; its exact numbers are in `11-SPEC.md`. Two additions from the discussion in the founder's own words: *"lets make sure we use the new recommended PCHIP spline for hand-drawn and blank rocker/deck curves"* (D-13/D-14) and *"the boards width must be 1" narrower than the blank width at each station, allowing 1/2" of waste material on each side at minimum"* (D-05).
- DONE WHEN, verbatim: *"I can pick a blank, slide the board along it, watch the four rocker numbers change live, see which blanks don't fit and why, and get a foil that matches my center and tip thicknesses."*
- The Marko 6'0" M-Regular is the reference case: stations at 0, 12, 24, 36.02, 48.04, 60.04 and 72.04 in with rocker 1.74 / 0.56 / 0.07 / 0 / 0.24 / 1.32 / 4.12 — the 12 in marks are knots, so the brief's first test is exact by construction.
- Data facts the planner should not re-derive: 162 blanks (101/33/28); station labels T0…T48, C, N48…N0 plus Arctic's `N3`; no duplicate station keys and no out-of-order stations anywhere; every blank has a rocker value at both tips; the only blanks whose lowest station rocker isn't 0 are the four Marko datums above; 42 rounded-nose blanks carry width 0 at N0 by design; `length_in` is constant within every blank; US Blanks `length_in − deck_length_in` ranges −0.25 to 1.5 in.
- The four blanks with no usable thickness are Marko 9'0", 10'0", 11'0" and 12'0" MK-SUP-STD ("thickness illegible in catalog"); the 8'0" MK-SUP-STD is complete and pickable.
- Same trust ethos as every phase: every rocker number is checkable with a straightedge on a flat floor, and now against the vendor's own catalogue page (`catalog_slug`, `pdf_page` travel with the blank).

</specifics>

<deferred>
## Deferred Ideas

- **Name the blank on the Summary order form** (vendor, blank, placement) — other pages are out of scope for this phase; a one-line addition later
- **Tilting the board within the blank** — excluded by the brief
- **"Blank data updated" notice** for a saved board carrying an older copy of a blank (D-01 freezes the copy on purpose); a future phase could offer to refresh
- **Managing blank data in the app / more vendors** — the catalogue is seed data this phase
- **Live pointer coordinates on the rocker curve** — the tooltips the brief excludes (existing todo, below)
- **The Android walk** — still open from v1.2 (D-12 there); the new picker's phone layout should be walked on both phones when a future milestone touches the phone

### Reviewed Todos (not folded)
- **Show live coordinates under the pointer on the Template and Rocker curves** (`.planning/todos/pending/2026-09-14-live-pointer-coordinates-on-the-template-and-rocker-curves.md`, score 0.9) — this is the tooltips the brief rules out; stays in the backlog
- **Add finished-board photo uploads with ratings** (`.planning/todos/pending/2026-08-19-add-finished-board-photo-uploads-with-ratings.md`, 0.4) — keyword match only
- **Mobile/phone-width layout polish** (`.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`, 0.2) — keyword match only

</deferred>

---

*Phase: 11-rocker-from-real-blanks*
*Context gathered: 2026-09-25*
