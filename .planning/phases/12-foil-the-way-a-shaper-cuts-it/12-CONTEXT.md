# Phase 12: Foil the Way a Shaper Cuts It - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The ROCKER screen derives a board's deck, bottom, thickness and tips from its blank the way a planer takes foam off — a constant deck skin, the bottom planed down to centre thickness, the tips thinned last inside the last 12" — and every number the shaper reads (foam off the deck, foam off the bottom as a depth and as planer passes, each station's thickness, the four rocker numbers) follows from that. The blank catalogue, placement slider, fit-check sampling, drawing and DATASHEET from Phase 11 are reused; the proportional-scaling foil (Phase 11 D-10/D-17/D-18) is replaced. Boards saved under Phase 11 keep their five station numbers.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**6 requirements are locked from the founder's brief, plus 5 carried constraints.** See `12-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `12-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** the derivation of deck, bottom, thickness and tips from the blank on the ROCKER screen; the readouts and DATASHEET numbers that follow (foam off the deck, foam off the bottom and planer passes, station thicknesses, the four rocker numbers); the pin-deck / bottom choice; where the deck skin's value lives and its default; the fit check's meaning under the new model; how version-4 boards, presets and litres carry across.
**Out of scope (from SPEC.md):** manufacturer tick-boxes for the blank list (todo 2026-09-26); a smoother-looking drawn curve without changing the numbers (todo 2026-09-26); bottom contours (todo 2026-08-23); anything on screens other than ROCKER beyond what already reads the foil (RAILS, VOLUME, SUMMARY read the result, they are not redesigned); CNC output.

</spec_lock>

<decisions>
## Implementation Decisions

### Deck skin & planer passes
- **D-01:** **The deck skin is a Fit & Tip Default with a per-board value** — an account default in the gear menu's Fit & Tip Defaults, a per-board value on ROCKER, and a new board follows the live default until first edited or saved (Phase 11's D-09 and D-19 pattern, reused as is). — **Reversibility:** one-way — the account default is a new nullable `user_preferences` column and the per-board value a new saved-board field; undoing either needs a production migration and a snapshot version.
- **D-02:** **The default deck skin is 1/8"** (about one planer pass), stored in millimetres like every other mark and shown through `measure-display.ts` (1/16" steps in Imperial, whole mm in Metric).
- **D-03:** **Planer passes are counted against a "Planer Max Depth" setting, default 1/8" per pass,** living in Fit & Tip Defaults beside the skin. The foam off the bottom is shown as a depth and as passes (depth ÷ Planer Max Depth, rounded up to whole passes). This setting REPLACES Extra Center Thickness (see D-10). — **Reversibility:** one-way — same column reasoning as D-01; the retiring Extra Center Thickness column is removed only after the deploy, per CLAUDE.md's expand/contract order.

### Tip thinning & the pin choice
- **D-04:** **The pin choice (Pin deck / Bottom) is both an account default and a per-board setting.** Fit & Tip Defaults holds the shaper's default (Pin deck out of the box); the ROCKER page carries the board's own setting; a new board starts from the account default and keeps its own once edited or saved (the D-19 rule). The founder first said "account only, no ROCKER toggle", then reversed it when asked whether a saved board should remember the choice it was cut with: *"Great catch, this is reason to include a rocker page setting for it. Settings changes the users default."* — **Reversibility:** costly — the per-board setting is a saved-board field carried by the version-5 snapshot; removing it later means another snapshot version.
- **D-05:** **The thinning between a 12" station and its tip is eased — flat at the 12" station, arriving at the tip target — so the curve has no kink at the station.** Under Pin deck the ease lifts the bottom (tip rocker grows); under Bottom it lowers the deck. Phase 11's tip ease (`TIP_EASE_WINDOW_MM` in `lib/geometry/blank-fit.ts`, D-17) is the kind of ease meant; the exact function is the planner's, with the no-kink property tested.
- **D-06:** **The four rocker numbers are the board's own** — nose tip and tail tip include the lift under Pin deck — **and the DATASHEET keeps the blank's own rocker in its column beside them**, so the difference is visible.

### Older boards, presets & litres
- **D-07:** **A board saved under Phase 11's model keeps its five station numbers exactly.** Opening it applies the default skin and the centre gap, and the two 12" fine-tunes absorb whatever residual remains, so nose tip, nose 12", centre, tail 12" and tail tip read what was saved; only the curve between stations follows the new model. Saved boards move to snapshot version 5 (skin, pin choice) with the same tolerate-and-migrate reading as versions 1–4. — **Reversibility:** costly — a snapshot version and a migration rule that later versions must keep honouring.
- **D-08:** **The four presets re-pick their provisional blanks by the same rule under the new foil, and litres follow the new foil everywhere** (VOLUME, the preset and rack cards, the summary), so the one litres figure stays one figure. Preset litres will move again; the picks stay marked provisional for the founder.

### Fit check & the blank list
- **D-09:** **A blank fits when the skin comes off everywhere, the board's bottom never drops below the blank's bottom at any sampled station (including the thinned tips), Phase 11's 1" width margin holds (D-05 of Phase 11), and the centre floor of D-10 is met.** A zero bottom gap away from the centre still counts; the centre is governed by D-10.
- **D-10:** **The centre floor is target centre thickness + skin + one Planer Max Depth** — one deck pass (the skin) and at least one bottom pass must come off, in the founder's words *"one on deck and one on bottom as a minimum"*. At the defaults this is exactly target + 2 passes; with a deeper skin a bottom pass still survives. **The Extra Center Thickness setting retires; Planer Max Depth takes its place in Fit & Tip Defaults.** The Extra Length floor (Phase 11 D-04) is unchanged.
- **D-11:** **The list's order is unchanged from Phase 11**; the new numbers appear on the rows but do not reorder them.
- **D-12:** **The hand-set fallback (no blank) is unchanged**: five typed stations and four rocker sliders as Phase 11 left them; skin, gap, passes and the pin choice do not apply without a blank.

### Claude's Discretion
- Where the foam-off-bottom figure sits on the sidebar (a centre figure reading depth and passes) and how the DATASHEET's Foam Off row splits into deck and bottom per station — the UI design pass decides the placement and copy; the numbers are fixed by D-03.
- The wording of the greyed-row reasons under the new floor ("not enough foam for the deck skin and a bottom pass" or similar) — through `lib/geometry/blank-reasons.ts` as in Phase 11.
- Whether Phase 11's D-18 (the blank's thickness ratio under the board's centre) keeps any role: by construction thickness is now blank − skin − gap, so the ratio is expected to retire; the planner confirms and removes it with its tests.
- The exact ease function for D-05 (a smoothstep over the 12" window, or Phase 11's ease reused), chosen by measuring against the seeded blanks with the no-kink property tested.
- How the retiring Extra Center Thickness column leaves: stop reading it in this phase's code, remove the column only after the deploy (CLAUDE.md expand/contract); the account read must tolerate its absence either way.

### Folded Todos
- **Foil the way a shaper cuts it — deck skin, parallel bottom, pin-deck tip thinning** (`.planning/todos/completed/2026-09-26-foil-the-way-a-shaper-cuts-it-deck-skin-parallel-bottom-pin-deck-tips.md`): the founder's verbatim brief that became this phase; its five rules are the spec's requirements and its open questions were this discussion's agenda (all settled above).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### This phase's requirements and brief
- `.planning/phases/12-foil-the-way-a-shaper-cuts-it/12-SPEC.md` — Locked requirements — MUST read before planning; the founder's six sentences, carried constraints, boundaries, acceptance criteria, and the Ambiguity Report now pointing at the decisions above
- `.planning/todos/completed/2026-09-26-foil-the-way-a-shaper-cuts-it-deck-skin-parallel-bottom-pin-deck-tips.md` — the brief verbatim, with the orchestrator's first reading and open questions

### Phase 11, the model being replaced and the machinery being reused
- `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-CONTEXT.md` — D-01–D-20: the blank copied into the board (D-01), fallback (D-02, D-14), presets (D-03), the two floors (D-04), width margin (D-05), flags and offers (D-06, D-07), slider range (D-08), account defaults (D-09, D-19), the proportional foil (D-10, D-17, D-18 — superseded here), fine-tunes (D-11), one stored centre (D-12), pchip (D-13), the drawing (D-15), the DATASHEET (D-16), tooling (D-20)
- `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-SPEC.md` — R1–R16 stay in force where not superseded (R13 Foil is superseded by this phase; R10, R11, R12, R14, R15, R16 apply unchanged)
- `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-UI-SPEC.md` — the ROCKER sidebar order, copy conventions and the 71 UI-state rows the new controls must fit into
- `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-REVIEW.md` — CR-01 (Drizzle names every column on insert) and the fixes that shaped the current code

### Project rules
- `CLAUDE.md` — Rule 1 (geometry pure and tested, fixtures never hand-typed), Rule 2 (units through `lib/geometry/units.ts` and `measure-display.ts`), the Database section (additive migrations reach production BEFORE the deploy; removals wait for it), the three layout switches

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/blank-fit.ts`: `prepareBlank`, `levelCurve`, `blankStationOf`, `placementRange`, `clampPlacement`, `boardOnBlank` (the board sitting on the blank at a placement, sampled every 1/4"), `TIP_EASE_WINDOW_MM` and the ease at line ~243 — the new derivation replaces the scaling inside `boardOnBlank`'s thickness step and keeps the rest.
- `lib/geometry/board-profile.ts`: `buildBlankProfile`, `buildFallbackProfile`, `handSetFromProfile` (the five-station hand-set copy used when a blank is removed, and the natural tool for D-07's "keep the five numbers" migration).
- `lib/geometry/foil.ts` / `rocker.ts` / `volume.ts`: `FoilSpec` (five stations), `FiveStationRocker`, `computeVolume` reading the foil — litres follow automatically once the foil is derived the new way (D-08).
- `lib/geometry/blank-reasons.ts`: `floorShortfallMessage`, `emptyListMessage`, `listIntro`, `blankRowMeta`, `formatShortfall` — the reason wording for the new floor lives here.
- `lib/fit-defaults-preference.ts`: `FIT_DEFAULTS_KEYS`, `FIT_DEFAULTS_RANGE_IN`, `parseFitDefaultValue`, `parseFitDefaultsPreference` — the allow-listed settings pattern the deck skin, Planer Max Depth and pin default extend; `app/actions/fit-defaults.ts` `saveFitDefaultsPreference(patch)` writes only the fields given.
- `components/fit-defaults-dialog.tsx`, `components/fit-defaults-provider.tsx` (`useFitDefaults`, cookie + account handoff) — where the two new numbers and the pin default appear.
- `components/rocker/rocker-controls.tsx` (sidebar), `rocker-datasheet.tsx` (the Foam Off row at line ~244), `board-on-blank.tsx` (the shaded foam), `use-blank-list.ts` (verdicts memoised off the placement), `blank-picker.tsx`, `blank-flag.tsx`.
- `lib/models/design-snapshot.ts`: version 4 with `boardBlankSchema` (copy, placement, tips, fine-tunes) and the tolerate-and-migrate reader; version 5 adds skin and pin choice (D-04, D-07).
- `scripts/generate-preset-blanks.ts` + `lib/blanks/preset-blanks.generated.json` + `preset-blanks.test.ts` (drift test): the presets' re-pick (D-08) runs through the same generator and test.

### Established Patterns
- Geometry first: pure functions in `lib/geometry/` with named tests before any component; expected values from fixtures or the seeded CSVs through the tested reader.
- One curve sampler: pchip (D-13) for every curve; the drawn curve is sampled from it, never a different interpolation.
- Settings handoff: account column + cookie fallback + "untouched board follows the live default until first edited" (D-19); saves are patch-shaped and re-validated server-side.
- Expand-first migrations: the two new preference columns (skin, Planer Max Depth) and the pin default go to production before the deploy; the Extra Center Thickness column is removed only after the deploy, if at all.
- Units: every design value converts through `units.ts`; marks read 1/16" / whole mm; a value alone in a box carries its own unit.

### Integration Points
- ROCKER sidebar (`rocker-controls.tsx`): the per-board skin value and the per-board pin setting join the centre-thickness, tips and fine-tune controls in the 11-UI-SPEC order; the foam-off-bottom centre figure (depth + passes) reads near the placement readouts.
- Fit & Tip Defaults dialog: Deck Skin and Planer Max Depth replace Extra Center Thickness; Pin default added.
- DATASHEET: Foam Off splits into deck and bottom per station; the blank's own rocker stays beside the board's (D-06).
- `lib/db/schema.ts` + a new drizzle migration for the preference columns (additive), applied to development in the plan, to production before the merge.
- VOLUME, preset cards, rack cards and the summary read the derived foil unchanged in shape (`FoilSpec`), so they follow without edits beyond re-captured expectations.

</code_context>

<specifics>
## Specific Ideas

- The founder's framing throughout: *the numbers on the sheet are the numbers a shaper works to with a planer* — foam off the deck, foam off the bottom in passes, and what the tips do to the rocker.
- "Planer Max Depth" is the founder's name for the pass setting and reads as the machine's own setting.
- "Those who want it will find it" — the pin choice is a shaper's habit, not something to push at everyone; it lives in settings as a default and on the board for the ones who care.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Smoother-looking drawn rocker curve without changing the PCHIP numbers** (`.planning/todos/pending/2026-09-26-smoother-drawn-rocker-curve-without-changing-the-numbers.md`) — related but separate: it changes only how the curve is drawn; kept out so this phase stays about the numbers.
- **Blank manufacturer tick-boxes in settings** (`.planning/todos/pending/2026-09-26-blank-manufacturer-tick-boxes-in-settings.md`) — a list filter; its own quick task.
- **Live pointer coordinates on the Template and Rocker curves** (`.planning/todos/pending/2026-09-14-live-pointer-coordinates-on-the-template-and-rocker-curves.md`) — a viewer readout; matched on keywords only.

No new ideas came up outside the phase scope — the discussion stayed within it.

</deferred>

---

*Phase: 12-foil-the-way-a-shaper-cuts-it*
*Context gathered: 2026-09-26*
