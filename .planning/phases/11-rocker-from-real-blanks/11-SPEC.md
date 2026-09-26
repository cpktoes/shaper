# Phase 11: Rocker from Real Blanks — Specification

**Created:** 2026-09-25
**Ambiguity score:** 0.10 (gate: ≤ 0.20) — derived from the founder's written brief of 2026-09-25 plus the four-area discussion recorded in `11-CONTEXT.md`; no separate Socratic interview was run
**Requirements:** 16 locked
**Source:** the founder's brief, carried here as close to verbatim as the template allows. Where the discussion sharpened a number or a rule, the requirement says so and points at the CONTEXT decision (D-nn).

## Goal

The ROCKER screen stops setting rocker by hand: the shaper picks a real blank (US Blanks, Arctic Foam or Marko Foam), slides the board along it, and the board's rocker, thickness and foil come from where the board sits on that blank — with the fit checked at every point, the four rocker numbers and the foam to remove shown live, and every blank that won't fit shown with why.

## Background

Today the ROCKER screen (`components/rocker/*`, `app/design/rocker/page.tsx`) draws a hand-set rocker. `RockerSpec` (`lib/geometry/rocker.ts`) is a three-knot, two-Bezier curve with eight shape controls — quick task 260829-rda replaced Phase 4's five typed stations with it because sparse hand-typed stations kinked at the 12 in marks. `FoilSpec` (`lib/geometry/foil.ts`) is five typed thickness stations sampled through `lib/geometry/monotone-spline.ts`, a Fritsch–Carlson monotone spline whose interior tangent weights are the mirror of SciPy/MATLAB `pchip`'s. `foil.center` is already the board's one stored centre thickness; RAILS and VOLUME read it through their link toggles. Nothing in the app knows a real blank exists: no blank table, no seed, no fit check. The three vendor catalogue tables are committed as-is under `db/seed/blanks/` (1,285 + 173 + 212 rows; 101 + 33 + 28 blanks; commit 7b2a499). Saved boards are versioned snapshots (`lib/models/design-snapshot.ts`, version 3, with tolerate-and-migrate machinery); shaper settings live on the account with a per-browser fallback (`user_preferences` — the Imperial/Metric pattern).

## Requirements

1. **Target centre thickness first**: The page opens on a target centre thickness control; length and width carry in from TEMPLATE. Thickness is stored once, in the board record, never as page state.
   - Current: `foil.center` is the stored centre; the ROCKER sidebar's five thickness sliders write the five foil stations directly.
   - Target: the first control on the page writes the board's single stored centre thickness (the existing `foil.center` slot, D-12); no second copy anywhere.
   - Acceptance: changing it on ROCKER changes the linked RAILS and VOLUME centre; reload and reopen reproduce it; the board record holds exactly one centre-thickness field.

2. **Blank list, filtered by two floors**: Only blanks at least X longer than the board and at least X thicker at centre appear. Both X values are default settings, not hard-coded numbers.
   - Current: no blank list.
   - Target: a list of blanks meeting `blank length ≥ board length + minExtraLength` and `blank centre thickness ≥ target centre + minExtraCentreThickness`; defaults **2 in** and **3/8 in** (founder, discussion D-04), read from the shaper's settings (D-09).
   - Acceptance: unit test on the filter over the seeded data — a 5'10" × 2 1/2" board lists Marko 6'0" M-Regular (72.04 in long, 2.92 in at centre) and not Arctic 5'8" SB (69.31 in); changing either setting changes the list with no code change.

3. **Placement slider**: Where the board's centre sits relative to the blank's centre, from 0 out to ((blank length − board length) / 2 − 1/2 in) as a buffer.
   - Current: none.
   - Target: a slider over that range in both directions with 0 centred (D-08) — the board's centre offset from the blank's centre, positive toward the nose.
   - Acceptance: range test — a 70 in board on a 72.04 in blank slides ±0.52 in; at 0 the two centres coincide; the readouts change on every move.

4. **Live readouts**: Rocker at nose tip, nose 12 in, tail 12 in and tail tip, plus foam removed at each station (blank thickness minus board thickness).
   - Current: the sidebar shows the hand curve's tip lifts and its derived 12 in figures; no foam figure.
   - Target: the four rocker numbers and the foam to remove at the five stations (the four plus centre), updated on every slider move.
   - Acceptance: a board exactly as long as Marko 6'0" M-Regular at placement 0 reads nose 4.12, nose 12 in 1.32, tail 12 in 0.56, tail 1.74 (catalogue values, inches); foam removed at centre equals blank centre minus target centre.

5. **Tip thicknesses are settings; the 12 in stations are derived but fine-tunable**: Nose and tail tip thickness are user settings; nose 12 in and tail 12 in are calculated from the tips and the centre; the shaper can still fine-tune foil thickness.
   - Current: all five foil stations typed by hand.
   - Target: tips default from the shaper's settings (D-09) and are stored on the board; nose 12 in and tail 12 in read off the derived foil (R13, D-10); a fine-tune is a signed offset that survives blank, centre and placement changes and clears on Reset (D-11).
   - Acceptance: with no fine-tune the 12 in values equal the derived curve's; a +1/16 in tweak persists across a placement change and clears on Reset; the fit check (R12) sees the tweaked number.

6. **Re-check on thickness change**: If thickness changes after a blank is picked, the fit is re-checked. The blank is never silently cleared; it is flagged and the nearest blank that fits is offered.
   - Current: n/a.
   - Target: the picked blank stays picked with a visible flag and reason; the offer is the fitting blank of any vendor whose length is closest to the current one (D-08).
   - Acceptance: test — pick a blank, raise the centre until the blank fails the 3/8 in floor: the selection is unchanged, a flag with the reason shows, and the offered blank is the closest-length fitting blank.

7. **Data: the three CSVs, loaded as-is**: `db/seed/blanks/us_blanks_stations.csv`, `db/seed/blanks/arctic_foam_stations.csv`, `db/seed/blanks/marko_foam_stations.csv`. Long format, one row per blank per station. Columns: vendor, blank_name, station, station_in_from_tail, rocker_in, thickness_in, width_in, length_in, deck_length_in, volume_l, catalog_slug, pdf_page, flag. Inches throughout, volume in litres. The data is already cleaned; it is loaded as-is.
   - Current: the files are committed and unread.
   - Target: a seed loader reads all three into the blank tables, converting inches and litres at the units boundary only (`lib/geometry/units.ts`).
   - Acceptance: after seeding, 101 US Blanks, 33 Arctic Foam and 28 Marko Foam blanks exist; every stored station value converts back to the CSV's figure exactly.

8. **Schema**: Each blank is stored as vendor, name, length, optional volume, optional deck length, and a list of stations (distance from tail, rocker, thickness, width, flag). No per-station columns — vendors measure at different stations (US Blanks 9–15 per blank, Arctic 5, Marko 5–10). Raw station data stays untouched; interpolation is a layer on top, so the method can change later without re-seeding.
   - Current: no blank tables.
   - Target: a migration adding the blank storage described, keyed by vendor + name; `catalog_slug` and `pdf_page` kept as provenance.
   - Acceptance: the schema has no station-numbered columns; a 5-station and a 15-station blank round-trip unchanged; no interpolated value is ever written to the database.

9. **Loader rules**: An empty cell means no measurement there — skipped, never stored as 0. Rocker, thickness and width may each have a different set of stations on the same blank (e.g. Arctic's width-only station 3 in from the nose), so each is interpolated over its own stations. `volume_l` and `deck_length_in` are optional (Marko has neither). The flag text is kept in the database. The Marko MK-SUP-STD blanks with no usable thickness stay in the database but out of the picker, since the fit check cannot run on them. The seed is safe to re-run: existing blanks update by vendor + blank name rather than duplicating.
   - Current: n/a.
   - Target: as stated. The SUP exclusion is a rule — "no usable thickness data" — not a list of names: the 10'0" MK-SUP-STD carries one doubtful thickness cell (N12 = 3.6, flagged) and must still be excluded.
   - Acceptance: tests — Arctic 7'8" E's `N3` row stores width only; Marko 9'0", 10'0", 11'0" and 12'0" MK-SUP-STD are stored and absent from the picker; running the seed twice leaves the row counts unchanged; every non-empty flag survives verbatim.

10. **Interpolation**: Rocker and thickness are interpolated with PCHIP, not a plain cubic spline — nose rocker jumps hard near the tip, and a cubic overshoots and invents a hump that isn't in the foam; Arctic's five stations make the gaps long, so this matters even more there. Width is PCHIP too — a rounded nose has width 0 at the tip by design. Deck height = bottom rocker + thickness at each point, derived, never interpolated separately, or it drifts out of agreement.
    - Current: a Fritsch–Carlson monotone spline with mirrored tangent weights, used for the foil only; the rocker is a Bezier.
    - Target: textbook pchip (D-13) is the app's one monotone sampler, used for blank rocker, thickness and width and for the board's deck curve.
    - Acceptance: a test proves no overshoot between any two consecutive stations on every seeded blank; deck(x) − rocker(x) equals thickness(x) at every sampled point; interior tangents match pchip's weighted-harmonic formula on a hand-worked case.

11. **Leveling**: Rocker is measured as if the blank sits on a flat table. One leveling function subtracts the minimum of the interpolated curve (not the lowest station value) so the low point reads zero. It runs on import — vendor datums vary (some centres read 0.02 or 0.21) — and again after cropping the blank to the board.
    - Current: none.
    - Target: one exported function used in both places.
    - Acceptance: the levelled curve's minimum is exactly 0; Marko Wakesurf Regular (centre 0.02) and 10'2" M (centre 0.21) level to 0; a board cropped off-centre re-levels to its own low point.

12. **Fit check**: The board's bottom plus its thickness must stay inside the blank's envelope at every point, not just at centre. Discussion (D-05): the board must also be at least 1 in narrower than the blank at every station where it has width — 1/2 in of waste a side — and that margin is a third default setting.
    - Current: none.
    - Target: a pure fit function returning pass/fail with the failing station and shortfall; the list judges each blank at its best placement (D-07).
    - Acceptance: a board thicker than the blank near the nose is rejected even when the centre fits; a board too wide at one station is rejected with that station named; the reason string names station and amount.

13. **Foil**: Scale the blank's thickness profile proportionally down to the board's centre thickness, with a minimum at the tips. Never subtract a constant — it drives the nose and tail negative.
    - Current: five typed stations.
    - Target: board thickness(x) = blank thickness(x) × (target centre ÷ blank centre), never below the tip setting at the ends (D-10). *(Planning note 2026-09-26: D-17 — the tips equal the setting through an ease-in from each 12 in station, the never-below guard stays; D-18 — "blank centre" in the ratio is the blank's thickness under the board's centre, so the centre equals the target at every placement.)*
    - Acceptance: no negative thickness anywhere for any seeded blank at any placement; thickness at centre equals the target; the tips are never below the setting.

14. **Performance — client-side**: All slider math runs client-side. Curves are fitted once when a blank is picked, then sampled on each slider move. No server round trip.
    - Current: n/a.
    - Target: fitting and sampling are pure functions in `lib/geometry/`; the picked blank's stations are already on the client because they travel with the board (D-01).
    - Acceptance: a browser test counts zero network requests during a run of slider moves; the per-move path samples a prepared fit rather than refitting raw stations.

15. **Display**: Readouts snap to the nearest 1/16 in (shapers read 2 3/8 in, not 2.374) — whole mm in Metric, per CLAUDE.md Rule 2. Decimals stay in the math. If a curve looks faceted, sample it more densely for drawing; never change the interpolation. The site's aesthetic is maintained.
    - Current: `formatMark` already renders 1/16 in and whole mm.
    - Target: every new number passes through `lib/geometry/measure-display.ts`; stored values keep full precision; drawing density is a drawing parameter only.
    - Acceptance: a value of 2.374 in displays as 2 3/8 in and is stored as 60.2996 mm; the units-isolation ledger passes for every new file; the desktop baseline screenshots for the other screens are unchanged. *(Planning note 2026-09-26: one measured exception — the VOLUME baseline prints litres to two decimals and pchip moves the default board 29.79 → 29.94 L (D-13, "litres move by a hair"), so it is re-recorded once by script beside the ROCKER baseline; TEMPLATE, RAILS and FINS stay unchanged.)*

16. **Tests before UI**: (a) a board exactly as long as the blank at placement 0 reproduces the catalogue rocker at the tips and 12 in stations — Marko 6'0" M-Regular: nose 4.12, nose 12 in 1.32, tail 12 in 0.56, tail 1.74; (b) PCHIP never overshoots between two stations on any seeded blank; (c) leveling puts the curve's minimum at exactly 0; (d) the fit check rejects a board thicker than the blank near the nose even when the centre fits.
    - Current: none exist.
    - Target: all four live in `lib/geometry/*.test.ts` and are committed before any UI plan runs.
    - Acceptance: the four tests exist by name and pass; the git history shows them landing before the ROCKER screen changes.

## Boundaries

**In scope:**
- The blank tables, migration and re-runnable seed for the three CSVs
- Pure geometry under `lib/geometry/`: the pchip sampler, leveling, cropping the blank to the board at a placement, the fit check (thickness envelope + width margin), the scaled foil, the list filter and the nearest-fit rule — all unit-tested
- The ROCKER screen rebuilt in the brief's order: centre thickness → blank list → placement slider → live readouts → tip and foil fine-tune; the drawing showing the board inside the blank with the foam shaded; the DATASHEET showing the blank's numbers beside the board's
- The hand-drawn fallback for a board with no blank: five typed stations on pchip (D-14)
- Shaper defaults on the account (gear menu, browser fallback): nose and tail tip thickness, the two fit floors, the width margin
- The saved-board format carrying the chosen blank's stations, placement and thickness choices (snapshot version 4, with migration of older saves)
- Presets naming a blank + placement (provisional picks, to be captured by the founder)

**Out of scope:**
- Tilting the board within the blank — the brief excludes it
- Tooltips, including the pointer-coordinates todo — the brief excludes them
- Other pages — TEMPLATE, RAILS, FINS, VOLUME, SUMMARY and the setup screen are not redesigned; they keep reading rocker, foil and thickness through the links they already have. Naming the blank on the Summary order form is a deferred idea
- Billing
- Managing or editing blank data inside the app, or vendors beyond the three tables — the catalogue is seed data

## Constraints

- Geometry math lives in `lib/geometry/`, pure and unit-tested; no formula inlined in a component (CLAUDE.md Rule 1)
- Every conversion goes through `lib/geometry/units.ts`; storage stays metric (`Mm` / `Litres`); display follows the shaper's Imperial/Metric choice (Rule 2)
- Two production migrations (blank tables; preference columns): push the code first, let Vercel deploy, then `npm run db:migrate:prod` — never migrate ahead of the code *(Amended 2026-09-26 after code review CR-01, founder's decision: both migrations are ADDITIVE, and Drizzle names every column on insert, so they run BEFORE the deploy; CLAUDE.md's Database section now states the expand-first rule.)*
- Expected test numbers come from the catalogue data (the CSVs) or from fixtures regenerated by script — never hand-transcribed
- Existing tests, the desktop baseline screenshots and the phone suites stay green; where pchip moves a foil-derived number by a hair (volume), fixtures are regenerated, not edited
- No new runtime dependency without discussion (CSV parsing is small enough to hand-roll)
- Work happens on the `rocker-blanks` branch; nothing lands on `main` without the founder's approval of the plan

## Acceptance Criteria

- [ ] I can pick a blank from a list that hides blanks failing the 2 in / 3/8 in floors and greys the rest with a reason
- [ ] I can slide the board along the blank, both ways from centre, within the buffered range
- [ ] The four rocker numbers change live on every slider move, with no network request
- [ ] Foam removed shows at the five stations
- [ ] I can see which blanks don't fit and why (station and amount), width included
- [ ] The foil matches my centre thickness and my tip settings, and the 12 in stations can be fine-tuned
- [ ] Changing the centre thickness after picking a blank flags the blank and offers the closest-length fitting alternative; it never clears the pick
- [ ] The four named geometry tests pass and landed before the UI
- [ ] Every stored station value equals the CSV; the seed re-runs without duplicates; the SUPs are stored but not pickable
- [ ] Older saved boards reopen (hand-drawn rockers migrate to five stations); presets open sitting in a blank
- [ ] Every new number reads correctly in Imperial and Metric

## Edge Coverage

**Coverage:** 6/8 applicable edges resolved · 2 unresolved

No automated edge probe was run — this spec was derived from a written brief. The rows below are the edges the discussion and the data profile surfaced; ⚠ rows are the planner's to resolve as stated assumptions.

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| empty data | R9 | ✅ covered | empty cell skipped, never 0 — Arctic `N3` test |
| partial data | R9 | ✅ covered | SUP exclusion by rule, including the 10'0" with one doubtful cell |
| datum drift | R11 | ✅ covered | Marko 0.02 / 0.21 level to 0 |
| rounded nose, width 0 at the tip | R10, R12 | ⚠ UNRESOLVED | the width rule near the tips where the blank's width → 0: evaluate only where the board has width; planner to measure against the seeded data before fixing the sampling step |
| literal rocker 0 flagged "not printed" (US Blanks T48/N48, 11 rows) | R7 | ✅ covered | loaded as-is per the brief; flag text preserved |
| no fitting blank at all | R6 | ⚠ UNRESOLVED | what the offer shows when nothing fits — planner's assumption: the flag with no offer, and the list's greyed reasons |
| board longer than every blank | R2 | 🧪 backstop | empty list with a plain-English note |
| old snapshots (v1–v3) | Boundaries | ✅ covered | migration test per version |

## Prohibitions (must-NOT)

**Coverage:** 8/8 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT store 0 for an empty cell | R9 | resolved | test |
| MUST NOT silently clear the picked blank | R6 | resolved | test |
| MUST NOT subtract a constant to derive the foil | R13 | resolved | test (no negative tips) |
| MUST NOT change the interpolation to cure a faceted drawing | R15 | resolved | judgment (code review) |
| MUST NOT write interpolated values to the database | R8 | resolved | judgment (schema review) |
| MUST NOT touch tilting, tooltips, other pages or billing | Boundaries | resolved | judgment |
| MUST NOT hand-transcribe an expected number | R16 | resolved | judgment (repo rule) |
| MUST NOT migrate production ahead of the deployed code | Constraints | resolved | judgment (CLAUDE.md) |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.95  | 0.75 | ✓      | the brief states now vs. should, and DONE WHEN |
| Boundary Clarity   | 0.90  | 0.70 | ✓      | explicit out-of-scope list; the other-pages rule sharpened above |
| Constraint Clarity | 0.85  | 0.65 | ✓      | client-side, PCHIP, leveling and storage rules all stated |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | four named tests + DONE WHEN; two edges left to the planner |
| **Ambiguity**      | 0.10  | ≤0.20| ✓      |                                    |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| 0 | Founder's brief | What the page does now vs. should; data, schema, loader, math, performance, display, tests, scope | The 16 requirements above |
| 1 | Discussion — storage | What a saved board remembers; the no-blank state; presets | D-01–D-03 (CONTEXT.md) |
| 2 | Discussion — fit rule | The two X values, width, hidden vs. greyed, nearest, slider direction, verdict timing | D-04–D-08 |
| 3 | Discussion — thickness | Where settings live, foil derivation, fine-tune semantics | D-09–D-12 |
| 4 | Discussion — curve math | pchip parity, the fallback's shape, the drawing, the datasheet | D-13–D-16 |

---

*Phase: 11-rocker-from-real-blanks*
*Spec created: 2026-09-25*
*Next step: /gsd-plan-phase 11 — the brief's four tests first, then the data, then the screen*
