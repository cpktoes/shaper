# Phase 11: Rocker from Real Blanks - Research

**Researched:** 2026-09-25
**Domain:** Pure-TypeScript curve geometry (textbook pchip, levelling, cropping, fit checks), Drizzle/Neon schema and seeding, versioned snapshot migration, a third account preference, and a rebuilt Next.js 16 client screen fed by a streamed Server Component prop
**Confidence:** HIGH for the maths, the data and the code map (all measured or read this session); MEDIUM for two interpretation calls flagged in Open Questions (tip rule, centre ratio)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### What a saved board remembers
- **D-01:** **The blank is copied into the board.** A saved board carries the chosen blank's identity (vendor, name, catalogue slug and page) **and its station rows exactly as picked**, plus the placement (a signed `Mm`, positive toward the nose), the target centre thickness (which stays the existing `foil.center`), its own nose and tail tip thicknesses, and the two 12 in fine-tune offsets. Everything the app shows re-derives from that copy: the Summary's rocker box, the rack, reopening and autosave never read the blank table, and a later catalogue correction can never silently move a saved board. — **Reversibility:** costly — this becomes the shape of snapshot version 4 in every saved row; changing it later means another version bump with its own migration story.
- **D-02:** **No blank means the hand-drawn fallback**, not a forced pick and not a blank screen. A brand-new board and a board saved before this phase open on the fallback rocker (now five typed stations on pchip, D-14); picking a blank replaces it. A board saved before this phase reopens looking as it was saved — the migration seeds its five stations by sampling the saved Bezier at those stations (D-14), so nothing needs ceremony (Phase 4's D-15 still holds).
- **D-03:** **Each preset names a blank + placement.** The four presets' captured rocker blocks retire in favour of a blank pick; the plan seeds a *provisional* pick for each (the nearest fitting blank by the D-08 rule against that preset's own dims and thickness) and marks them provisional in `presets.ts`, and the dev-only "Copy preset values" affordance learns to print the blank line, so the founder can replace all four through the same capture loop the outlines and rockers went through. A preset's foil becomes derived (D-10) from its centre and tips, so the typed `nose12`/`tail12` values go too.

#### The fit rule & the blank list
- **D-04:** **Two floors hide a blank from the list:** blank length ≥ board length + **2 in**, and blank centre thickness ≥ target centre + **3/8 in**. Both are shaper settings with those defaults (D-09), never literals in the filter.
- **D-05:** **Width is a hard fit check with a 1 in margin:** at every station where the board has width, the board must be at least 1 in narrower than the blank — 1/2 in of waste a side, in the founder's words: *"the board's width must be 1" narrower than the blank width at each station, allowing 1/2" of waste material on each side at minimum."* The margin is a third setting (default 1 in). The blank's width is the pchip-interpolated width at the board's station mapped through the placement; the board's width is its own drawn outline (`sampleOutline`). Rounded-nose blanks carry width 0 at the very tip by design, so the rule is evaluated only where the board itself has width — the last inch is the delicate regime and the planner measures it against the seeded data before fixing a sampling step.
- **D-06:** **Floor failures are hidden; envelope failures are shown greyed with the reason.** A blank too short or too thin at centre never appears. A blank that passes both floors but fails the thickness envelope or the width margin somewhere along its length stays listed, greyed, with the failing station and by how much (e.g. *1/8" too thin 12" from the nose*, *1/2" too wide at the widepoint*).
- **D-07:** **A blank's verdict is judged at its best placement.** A blank counts as fitting if any slider position within the D-08 range fits; picking it lands the slider at that position (the fitting placement closest to centre); a failing blank's reason is reported at the placement where its worst shortfall is smallest — its "nearly fits" reading. List verdicts recompute only when the board's dims, centre thickness, tips, fine-tunes or settings change — never on a slider move (SPEC R14).
- **D-08:** **The slider runs both ways from centre**, 0 = the board's centre on the blank's centre, each end at ((blank length − board length) / 2 − 1/2 in), positive toward the nose. **"Nearest blank that fits" = any vendor, the fitting blank whose length is closest to the current blank's** (tie-break: less excess foam at centre — Claude's discretion). When the picked blank stops fitting it stays picked and flagged with the reason; the offer sits beside the flag; nothing is cleared without the shaper's own action.

#### Thickness settings & the foil
- **D-09:** **The defaults live on the account, in the gear menu,** following the Imperial/Metric and print-instructions pattern exactly: nose tip thickness, tail tip thickness, minimum extra length (2 in), minimum extra centre thickness (3/8 in) and width margin (1 in) — saved on `user_preferences`, remembered by the browser when signed out, resolved on the server so the first paint is right. A new board starts from them; the board stores its own tips (and its centre), so one board can be tuned without moving the defaults, and a saved board never depends on a live setting. Unset means "not chosen" (nullable columns), as the existing preferences do. — **Reversibility:** costly — a production migration on `user_preferences` (push the code, deploy, then migrate) and a provider/handoff pair on every route.
- **D-10:** **The foil is the blank's own foil scaled to the board's centre:** board thickness(x) = blank thickness(x) × (target centre ÷ blank centre), floored at the tip setting toward each end so the tips never fall below it and the curve stays continuous. Never a subtracted constant. The board keeps the blank's foil character; the fit check runs on the final foil, so a tip setting thicker than the blank's tip shows up as a fit failure at that tip rather than a clipped curve.
- **D-11:** **The 12 in thicknesses are read off that scaled foil and a fine-tune is a signed offset**, stored per station on the board, re-applied after every change of blank, centre or placement, cleared by a Reset. The fit check and every readout see the final (derived + offset) number.
- **D-12:** **Centre thickness is stored once** — `foil.center` remains the board's single stored centre; the ROCKER screen's first control writes it; RAILS and VOLUME keep reading it through their existing links. No page-local copy, no second field.

#### Curve math & the drawing
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

### Deferred Ideas (OUT OF SCOPE)
- **Name the blank on the Summary order form** (vendor, blank, placement) — other pages are out of scope for this phase; a one-line addition later
- **Tilting the board within the blank** — excluded by the brief
- **"Blank data updated" notice** for a saved board carrying an older copy of a blank (D-01 freezes the copy on purpose); a future phase could offer to refresh
- **Managing blank data in the app / more vendors** — the catalogue is seed data this phase
- **Live pointer coordinates on the rocker curve** — the tooltips the brief excludes (existing todo, below)
- **The Android walk** — still open from v1.2 (D-12 there); the new picker's phone layout should be walked on both phones when a future milestone touches the phone

#### Reviewed Todos (not folded)
- **Show live coordinates under the pointer on the Template and Rocker curves** (`.planning/todos/pending/2026-09-14-live-pointer-coordinates-on-the-template-and-rocker-curves.md`, score 0.9) — this is the tooltips the brief rules out; stays in the backlog
- **Add finished-board photo uploads with ratings** (`.planning/todos/pending/2026-08-19-add-finished-board-photo-uploads-with-ratings.md`, 0.4) — keyword match only
- **Mobile/phone-width layout polish** (`.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`, 0.2) — keyword match only
</user_constraints>

<phase_requirements>
## Phase Requirements

This project has no REQUIREMENTS.md; the locked SPEC's R-numbers are the requirement ids.

| ID | Description (11-SPEC.md) | Research Support |
|----|--------------------------|------------------|
| R1 | Target centre thickness first; stored once in `foil.center` | §Architecture Pattern 5 (store derivation), Pitfall 10; the Center Thickness row needs a `slider-row.test.ts` allowlist entry |
| R2 | Blank list filtered by two setting-driven floors | §Pattern 3 (`listBlanks`), measured list sizes; floors compared in mm with an epsilon (Pitfall 6) |
| R3 | Placement slider ±((Lb − L)/2 − 1/2 in), 0 centred | §Pattern 3 mapping `u(s) = Lb/2 + p + s − L/2`; clamp-on-read when the board length changes (Pitfall 8) |
| R4 | Live readouts: four rocker numbers + foam off at five stations | §Pattern 3 `boardProfileAt`; test (a) reproduces Marko 6'0" to 1e-15 in |
| R5 | Tips are settings, 12 in derived + signed fine-tune offset | §Pattern 4 (tip ease + offset hump); **Open Question 1** (the literal floor never binds on the data) |
| R6 | Re-check on thickness change; flag, never clear; offer nearest | §Pattern 3 `nearestFit`; property-style test (Pitfall 12) |
| R7 | Three CSVs loaded as-is, units converted once | §The Data (CRLF, quoting, 1,636 values that do not bit-round-trip ×25.4÷25.4 — Pitfall 2) |
| R8 | Schema: vendor, name, length, optional volume/deck length, station list; no per-station columns | §Pattern 1 (jsonb `stations`, `uniqueIndex(vendor, name)`) |
| R9 | Loader rules: empty ≠ 0, per-attribute stations, optional fields, flags verbatim, SUP exclusion by rule, idempotent seed | §The Data; pickable rule measured (158 pickable, exactly the four SUPs excluded) |
| R10 | pchip for rocker, thickness, width; deck = rocker + thickness | §Pattern 2; parity verified against SciPy 1.13.1 to ≤ 2.7e-15; 0 overshoots in 888,137 samples over every seeded blank |
| R11 | One levelling function, curve minimum (not lowest station) | §Pattern 3 `curveMinimum` — exact, because pchip is monotone on every interval (verified against dense sampling to 1.4e-15 mm) |
| R12 | Fit check: thickness envelope + 1 in width margin where the board has width | §Pattern 3 `judgeBlank`; station-step sensitivity measured (no verdict flips 1/4 in vs 1/64 in) |
| R13 | Foil = blank foil scaled to centre, tip minimum, never a subtracted constant | §Pattern 4; **Open Questions 1–2** |
| R14 | All slider maths client-side, prepared fit, zero network on slider moves | §Pattern 2 `preparePchip` (today's sampler refits tangents on every call — `monotone-spline.ts:113`); verdict budget 1–7 ms; e2e network counter must run signed out (Pitfall 9) |
| R15 | Readouts snap to 1/16 in / whole mm; ledger passes; other baselines unchanged | `formatSignedMark` is the one missing formatter; **VOLUME baseline must move** (Pitfall 1) |
| R16 | Four named tests (a)–(d) land before any UI plan | §Validation Architecture names them; Wave 1 plan structure |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rule 1:** every formula lives in `lib/geometry/`, pure (no React, browser API or database imports), and every exported function gets unit tests. Never inline a formula in a component. Expected values come from fixtures generated by script (or, this phase, from the CSVs themselves) — never hand-transcribed.
- **Rule 2:** storage is metric (`Mm` / `Degrees` / `Litres` brands); every design-value conversion goes through `lib/geometry/units.ts`; display follows the shaper's Imperial/Metric choice. Rocker heights, thicknesses, foam off and every fine-tune are **marks** (1/16 in ↔ whole mm); a blank's length is a **length** (`formatLength`); distances along the board in a reason are **dims**. Don't reach for 25.4 anywhere else.
- **Database:** `.env.local` points at the development branch; production migrates only **after** the code is pushed and deployed (`npm run db:migrate:prod`). Two production migrations this phase (blank table; preference columns) plus a production seed, in that order.
- **Layout switches:** width → layout (`max-shell:`/`shell:` at 820px), pointer → control size (`coarse:`), height → short-screen scroll (inline `[@media(max-height:500px)]`). Never conflated; nothing new here reads height.
- **Commands:** `npm test` (vitest, all geometry suites green), `npm run build` from the main checkout only (Turbopack won't resolve `next` in a worktree), `npm run test:e2e` (own dev server on port 3100, `PW_PORT` overrides), `npm run golden`, `npm run db:generate` / `db:migrate` / `db:migrate:prod`.
- **Plain English** for shapers in UI copy, commit messages and summaries.
- **AGENTS.md:** this Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing Next code. (Read this session: `01-app/01-getting-started/06-fetching-data.md` for the streamed-promise pattern below.)
- **`.claude/CLAUDE.md`:** stack is prescribed (Next.js + TS + Tailwind v4 + shadcn; Neon + Drizzle; Clerk; Vercel; Vitest + Playwright) — no substitution without discussion; start every change through a GSD command.

## Summary

The maths is small and fully verifiable. Textbook pchip differs from today's `monotone-spline.ts` in three places: the interior weights are swapped (`monotone-spline.ts:39-42` weights δ_before by (2h_before + h_after)/3h; pchip weights it by (h_before + 2h_after)/3h), the ends use pchip's three-point rule instead of the bare secant, and the Fritsch–Carlson circle clamp (`:72-91`) must be **removed**, not just made redundant — pchip's tangents sit in the 0 ≤ α, β ≤ 3 box, which is monotone, but the circle clamp would still rescale pairs like α = β = 2.5 and break parity. A scratch implementation of D-13's rules matched SciPy 1.13.1's `PchipInterpolator` to within 2.7e-15 on six cases (including the end clamp to 3δ₀, flat secants and the two-point case). Swapping the sampler alone moved the default board from 29.79 L to 29.94 L. Across the 17 geometry test files, 1,643 tests passed; the 5 failures were only because the scratch copy lives outside the repo, so tests that read other repo files by path could not find them. No fixture needs regenerating. But the VOLUME desktop baseline *will* move, because it prints the litres figure to two decimals.

The data is clean and matches CONTEXT's profile. It adds a few facts CONTEXT did not have. All three CSVs use CRLF line endings. 119 flags contain commas and 54 contain quotes (some curly). Three Marko blanks have no width at C, and two lack rocker and thickness at T24. And 1,636 of the 9,571 numeric cells do not come back bit-for-bit through `inchesToMm` → `mmToInches`, so R7's "converts back exactly" has to be tested at the CSV's own precision, not with `===`. The mechanical pickable rule is: thickness present at C and at both end stations. It excludes exactly the four MK-SUP-STD blanks (9'0"–12'0") and leaves 158 pickable. Across the 158, pchip showed zero overshoot. The exact-minimum levelling rule worked to 1e-15. Test (a) (Marko 6'0" M-Regular at full length, placement 0) reproduced 1.74 / 0.56 / 1.32 / 4.12 exactly. Judging a whole list at each blank's best placement costs 1–7 ms per pass with a coarse-to-fine search, so no worker is needed.

Two findings need the founder before the geometry plan locks:

1. **The tip setting has no effect if D-10 is read literally ("floored").** Scaled blank tips never fall below the default 5/16 in / 1/4 in on any seeded blank at any typical centre: the smallest is 0.435 in and the median 1.113 in. So the board's tip would read about an inch while the Nose Tip card says 5/16 in. That breaks the DONE WHEN ("a foil that matches my … tip thicknesses") and the UI-SPEC's tip cards.
2. **Which centre thickness sets the scale?** R13's acceptance ("thickness at centre equals the target") only holds at every placement if the scale ratio divides by the blank's thickness *under the board's centre*, not by the blank's C-station value.

The research recommends a reading for each (Pattern 4) and flags both.

Plumbing findings the planner must act on:

- The ownership test forbids an unscoped `db.select` in `lib/db/queries.ts`, so the public blank read must live in its own file.
- Playwright runs against a fake `DATABASE_URL`, so e2e needs a seed-CSV source for the blank list or every ROCKER spec sees the "catalog didn't load" state.
- Presets must embed their blank's station rows (via a generated module), because `applyPreset` runs on `/`, which never loads blanks.
- Five e2e specs and one component test touch the retiring Bezier controls. The UI-SPEC listed only two of them.

**Primary recommendation:** land `lib/geometry/pchip.ts` (prepared, SciPy-parity tangents), the blank catalogue reader, and `lib/geometry/blank-fit.ts` with the four named tests first. Then the data layer, then snapshot v4 and one store-level `BoardSideProfile` that every consumer reads, then settings, then the screen. Resolve the tip-rule reading with the founder at plan approval.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSV parsing, row → blank mapping, pickable rule | Pure lib (`lib/blanks/`) | CLI seed script (`scripts/`) | Tested in vitest; the script is a thin runner |
| Blank storage, unique vendor+name, idempotent upsert | Database (Neon, Drizzle) | — | R8: raw rows only, interpolation is a layer on top |
| Reading pickable blanks for the list | Frontend server (RSC in `app/design/rocker/page.tsx`) | Database | One read per visit, streamed as a promise; never a client fetch |
| pchip, levelling, crop/placement, scaled foil, fit, verdicts, nearest, reasons | Pure lib (`lib/geometry/`) | — | Rule 1; R14 client-side, runs in the browser |
| Effective board profile (rocker, thickness, five-station foil) | Client store (`design-store.tsx` memo) calling pure lib | — | One derivation that RAILS/VOLUME/SUMMARY/rack all read |
| Saved-board blank copy, migration v1–v3 → v4 | Model boundary (`lib/models/design-snapshot.ts`) | API (Server Action re-parses) | D-01; `saveModel` already re-parses through `parseSnapshot` (`app/design/actions.ts:47`) |
| Fit & tip defaults | Account (DB `user_preferences`) + browser (cookie/localStorage) | Frontend server (handoff in root layout) | D-09, the units pattern's third instance |
| Drawing the board inside the blank | Browser (SVG in `rocker-viewer.tsx`) | Pure frame maths (`rocker-view-frame.ts`) | Frame arithmetic stays out of the component (Rule 1) |

## Standard Stack

### Core (all already installed — no new runtime dependency)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.1 | Route, Server Component streaming of the blank list | Prescribed stack [VERIFIED: package.json] |
| react | 19.2.8 | `use(promise)` + `Suspense` for the list region | React 19 streaming [CITED: node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md] |
| drizzle-orm | 0.45.2 | `blanks` table, `jsonb().$type<>()`, `uniqueIndex`, `doublePrecision`, `onConflictDoUpdate` | Prescribed [VERIFIED: node_modules/drizzle-orm/package.json; `pg-core/columns/double-precision.d.ts`, `pg-core/indexes.d.ts:78`] |
| drizzle-kit | 0.31.10 | `db:generate` / `db:migrate` / `db:migrate:prod` | Existing scripts [VERIFIED: package.json] |
| @neondatabase/serverless | 1.1.0 | HTTP driver | Existing client (`lib/db/client.ts`); **no interactive transactions** (`neon-http/session.js:151-152` throws) — one multi-row upsert statement is atomic on its own |
| zod | 4.4.3 | Snapshot v4 schema, settings allow-list | Rejects `Infinity`/`NaN` in `z.number()` by default; `z.array().max()` enforced [VERIFIED: ran `safeParse` this session] |
| vitest | 4.1.11 | Every new pure module | `lib/**/*.test.ts`, node env [VERIFIED: vitest.config.ts] |
| @playwright/test | 1.63.0 | Placement touch drag, zero-network assertion, baselines | Chromium + WebKit installed [VERIFIED: `npx playwright --version`, `~/Library/Caches/ms-playwright`] |

### Supporting (dev tool — decide explicitly)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| tsx | 4.23.12 (already in `package-lock.json` as a transitive dev dep of drizzle-kit and vite) | Run `scripts/seed-blanks.ts`, which imports the TS reader and `lib/db/*` (extensionless imports that Node 24's native type-stripping cannot resolve) | Declare it in `devDependencies` pinned to `4.23.12`, or call `npx tsx` and accept relying on a transitive dep. See the audit below |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled RFC-4180 reader | `csv-parse` / `papaparse` | SPEC forbids a new runtime dependency; the files are 1,670 rows with doubled-quote escapes and CRLF — about 30 lines of tested code |
| jsonb `stations` column | normalised `blank_stations` table | jsonb keeps the D-01 copy a straight object copy and makes per-station columns impossible; a stations table buys nothing (no station-level queries exist) |
| Web Worker for verdicts | plain `useMemo` + `useDeferredValue` | Measured 1–7 ms per full pass; a worker adds a bundle and a message protocol for no gain |
| `use cache` for the blank read | per-request read | `cacheComponents` is not enabled (`next.config.ts`); ~160 rows over Neon HTTP is cheap; turning on Cache Components is out of scope |

**Installation:** none for runtime. If the planner declares tsx: `npm install --save-dev --save-exact tsx@4.23.12` (the lockfile already resolves it, so nothing new is downloaded).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| tsx | npm | the 4.23.12 build dates to 2026-08-10; latest 4.23.15 was published 2026-09-20 | ~82.9M/wk | github.com/privatenumber/tsx | [SUS] ("too-new" — flags the 5-day-old latest, not the pinned 4.23.12) | Flagged. Only if declared: pin exactly `4.23.12` (already in `package-lock.json` with integrity hash); the planner adds a `checkpoint:human-verify` before touching `package.json`. `postinstall`: none |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** tsx — a dev tool that is already installed transitively; the flag is the registry's "too-new" rule reacting to the newest release. No runtime package is proposed.

## The Data (read this session with a scratch RFC-4180 parser)

**Files:** `db/seed/blanks/us_blanks_stations.csv` (1,286 lines), `arctic_foam_stations.csv` (174), `marko_foam_stations.csv` (213). All three are **CRLF**, UTF-8, no BOM, no embedded newlines in quoted fields (row count = lines − 1 in each). [VERIFIED: `file`, `od -c`, `grep -c $'\r'`]

**Header, verbatim (all three):** `vendor,blank_name,station,station_in_from_tail,rocker_in,thickness_in,width_in,length_in,deck_length_in,volume_l,catalog_slug,pdf_page,flag` [VERIFIED: `db/seed/blanks/*.csv:1`]

**Quoting, verbatim examples:**
- `Arctic Foam,"5'8"" SB",T0,0,1.875,1.125,7.5,69.312,,36.37,58SB,1,` [VERIFIED: `arctic_foam_stations.csv:2`]
- `US Blanks,"5'0""W",T0,0,1.0,1.752,17.0,60.252,60.0,47.0,wake-surf/5-0-W,1,"wake-surf rocker as drawn (catalog also lists a natural rocker of 2 7/16""N 1""T)"` [VERIFIED: `us_blanks_stations.csv:2`]
- `Marko Foam,"10'0"" MK-SUP-STD",N12,109.0,2.65,3.6,27.2,121.0,,,sup,46,"thickness: prints ""3.6"", other labels on this page are missing digits so this may be truncated"` [VERIFIED: `marko_foam_stations.csv:194`]

**Counts and shapes** [VERIFIED: scratch profile run]:
- 1,670 rows; 162 blanks: US Blanks 101, Arctic Foam 33, Marko Foam 28. Stations per blank 5–15 (US 9/11/13/15; Arctic 5 or 6; Marko 5–10). Labels: `C N0 N12 N18 N24 N3 N36 N48 N6 T0 T12 T18 T24 T36 T48 T6`.
- No out-of-order stations, no duplicate labels within a blank, `length_in` constant per blank, first station at 0 and last station at `length_in` for every blank, C at `length_in / 2` within 0.01 in.
- Empty cells: flag 1,450; volume_l 484; deck_length_in 385; thickness_in 47; rocker_in 14; width_in 3.
- **New facts beyond CONTEXT:** Marko Wakesurf Regular, 5'3" Foil and 9'6" MK have **no width at C**. Wakesurf Regular and 5'3" Foil have no rocker or thickness at T24. The 9'0" MK-SUP-STD has three empty rocker cells. The eight Arctic `N3` rows are width-only. The four US Blanks EPS T48/N48 rows have empty thickness **and** a literal rocker `0`.
- Datum ≠ 0 (lowest rocker value): exactly Marko Wakesurf Regular 0.02, 5'3" Foil 0.02, 10'2" M 0.21, 10'2" M Thick 0.21.
- 11 off-centre literal rocker 0s, all flagged "not printed in catalog" (US Blanks 8'9"Y, 8'9"YX, 8'8" EPS, 8'8"X EPS, 9'6" EPS at T48/N48, plus 10'4"A SUP EPS N48).
- 42 width-0 cells, all at `N0` (rounded noses).
- 220 flagged rows; 119 flags contain a comma, 54 contain a quote; the longest flag is 262 characters; some use curly quotes (`”`). Longest name 16 characters, slug 28, vendor 11. Numbers have at most 4 decimals.
- Length range 60.252–151.5 in; centre thickness 2.437–5.5 in; US Blanks `length_in − deck_length_in` from −0.252 to 1.5 in; 22 US Blanks and all 28 Marko blanks have no volume.

**Pickable rule (recommended, mechanical):** a blank is pickable iff it has a thickness value at the station labelled `C` **and** at its first and last stations (plus at least two width and two rocker values, which every blank has). The ratio needs a centre, and the scaled foil must span the whole blank without extrapolating. Result: 158 pickable; excluded are exactly the Marko 9'0", 10'0" (one doubtful N12 cell), 11'0" and 12'0" MK-SUP-STD. The 8'0" MK-SUP-STD stays pickable. [VERIFIED: probe] Compute it at read time with a tested pure function — no schema column to keep in sync.

**Round-trip trap:** `(v * 25.4) / 25.4 !== v` for 1,636 of 9,571 numeric cells (e.g. `12 → 11.999999999999998`, `2.626 → 2.6259999999999994`). R7's "converts back to the CSV's figure exactly" must compare at the CSV's own precision: `Number(mmToInches(stored).toFixed(4)) === Number(csvText)` (max 4 decimals), or `toBeCloseTo(v, 9)`. Never `toBe` on the raw conversion. The R15 example is safe: `2.374 * 25.4` prints `60.2996` and converts back to `2.374`. [VERIFIED: probe]

**Payload:** all 162 blanks as JSON with mm doubles is 246 KB raw, 26 KB gzip, 21 KB brotli; one 15-station blank is about 2.2 KB (the D-01 copy per saved board). [VERIFIED: probe]

## Architecture Patterns

### System Architecture Diagram

```
 db/seed/blanks/*.csv ──► lib/blanks/csv.ts (RFC-4180) ──► lib/blanks/catalog.ts (rows → BlankRecord, inches→mm via units.ts)
                                   │                                   │
                                   │ (tsx) scripts/seed-blanks.ts ─────┴──► Neon `blanks` (jsonb stations, unique vendor+name)
                                   │                                                   │
                                   └── scripts/generate-preset-blanks.ts ──► lib/blanks/preset-blanks.generated.json (the 4 preset picks)
                                                                                       │
 Request /design/rocker ──► page.tsx (RSC) ── loadPickableBlanks() [not awaited] ──────┤ (DB normally; seed CSVs when
                              │                    │ promise                           │  SHAPER_BLANKS_SOURCE=seed-csv, e2e only)
                              ▼                    ▼
                         <RockerEditor blanks={promise}>  ── Suspense("Loading blanks…") ── BlankList use(promise)
                              │                                                            │
   useDesign(): state.foil (centre, tips, fallback 12"), state.rocker (5 stations), state.blank (copy+placement+offsets) | null
                              │
                              ▼
         prepareBlank(copy) [memo on copy identity] ──► PreparedBlank (pchip per attribute, levelled)
                              │
    ┌─────────────────────────┼──────────────────────────────────────────┐
    ▼                         ▼                                          ▼
 boardProfileAt(prepared,  judgeList(prepared[], board, settings)   picked-blank flag
 placement, board)          [memo: dims, centre, tips, offsets,      (one placement, every move)
 [every slider move]         settings — never placement]
    │                         │                                          │
    ▼                         ▼                                          ▼
 BoardSideProfile ──► effectiveFoil (5 values) ──► deriveEffectiveRails ──► RAILS
       │          └─► thicknessAt(s) ──► computeCrossSectionVolume ──► VOLUME / rack / Summary litres
       └─► rockerAt(s), stations ──► RockerViewer (editor + order-form compact box)
 No blank: BoardSideProfile from 5-station pchip rocker + 5-station pchip foil (same type, same consumers)
```

### Recommended Project Structure
```
lib/
├── blanks/
│   ├── csv.ts                      # RFC-4180 reader (CRLF, doubled quotes, commas in quotes); strict numeric parse
│   ├── catalog.ts                  # CSV rows → BlankRecord (mm/litres via units.ts), isPickable, groupByBlank
│   ├── preset-blanks.generated.json# the 4 preset blanks' raw rows, written by script, never by hand
│   └── *.test.ts
├── geometry/
│   ├── pchip.ts                    # replaces monotone-spline.ts: pchipSlopes, preparePchip, samplePchip
│   ├── blank.ts                    # types: BlankStation, BlankCopy, BoardBlank (no maths)
│   ├── blank-fit.ts                # prepareBlank, curveMinimum/level, blankStationOf, boardProfileAt,
│   │                               # scaledFoil, fitAt, judgeBlank, listBlanks, nearestFit, placementRange
│   ├── blank-reasons.ts            # reason vocabulary → string (both systems)
│   ├── board-profile.ts            # BoardSideProfile for fallback AND blank; effectiveFoil; deck = rocker + thickness
│   ├── rocker.ts                   # FiveStationRocker (fallback) + legacy Bezier kept ONLY for v3 migration
│   └── measure-display.ts          # + formatSignedMark
├── db/
│   ├── schema.ts                   # + blanks table; + 5 nullable user_preferences columns
│   ├── blanks.ts                   # loadPickableBlanks() — public, unscoped, read-only (NOT in queries.ts)
│   └── queries.ts                  # + readFitDefaultsPreference(clerkId)
├── fit-defaults-preference.ts      # parse/allow-list/cookie/handoff (per-field decidePreferenceHandoff)
└── fit-defaults-server.ts          # resolveFitDefaultsHandoff()
app/actions/fit-defaults.ts         # saveFitDefaults — auth first, validated, upsert
components/fit-defaults-provider.tsx, components/fit-defaults-dialog.tsx
scripts/seed-blanks.ts, scripts/generate-preset-blanks.ts
drizzle/0004_*.sql (blanks), drizzle/0005_*.sql (preference columns)
```

### Pattern 1: Blank storage and idempotent seed
**What:** one row per blank, raw stations in `jsonb`, unique `(vendor, name)`.
```typescript
// lib/db/schema.ts — sketch; column helpers verified in node_modules/drizzle-orm 0.45.2
export const blanks = pgTable("blanks", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendor: text("vendor").notNull(),
  name: text("name").notNull(),
  lengthMm: doublePrecision("length_mm").notNull(),
  deckLengthMm: doublePrecision("deck_length_mm"),      // US Blanks only
  volumeLitres: doublePrecision("volume_litres"),        // optional
  catalogSlug: text("catalog_slug").notNull(),
  pdfPage: integer("pdf_page").notNull(),
  stations: jsonb("stations").$type<BlankStation[]>().notNull(), // raw, per-station nullable attributes
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("blanks_vendor_name_idx").on(t.vendor, t.name)]);

// scripts/seed-blanks.ts — one atomic statement (neon-http has no interactive transactions)
await db.insert(blanks).values(records).onConflictDoUpdate({
  target: [blanks.vendor, blanks.name],
  set: { lengthMm: sql.raw(`excluded.${blanks.lengthMm.name}`), /* …every column… */ updatedAt: new Date() },
});
```
- `BlankStation` = `{ label: string; fromTailMm: Mm; rockerMm: Mm | null; thicknessMm: Mm | null; widthMm: Mm | null; flag: string | null }` — `null` for an empty cell, **never 0** (R9).
- The seed must load its env file **before** importing `lib/db/client.ts` (the client reads `process.env.DATABASE_URL` at import, `lib/db/client.ts:12`). Mirror `drizzle.config.ts`: `SEED_ENV_FILE ?? ".env.local"`, delete the two URL vars, `process.loadEnvFile`, then `await import(...)`. Add `db:seed:blanks:prod`, mirroring `db:migrate:prod` (pull the production env to a temp file and delete it on exit with a `trap`).
- Seeding on an empty table then re-running leaves 162 rows (a unit test covers the mapping; a DB check covers idempotency — see Validation).

### Pattern 2: pchip as the one sampler, prepared once
**What:** D-13's tangent rules, verified against SciPy; tangents computed once per curve.
```typescript
// lib/geometry/pchip.ts — D-13 verbatim; parity-verified against SciPy 1.13.1 this session
export function pchipSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  if (n === 0) return [];
  if (n === 1) return [0];
  const h: number[] = [], d: number[] = [];
  for (let k = 0; k < n - 1; k++) { h.push(xs[k + 1] - xs[k]); d.push((ys[k + 1] - ys[k]) / h[k]); }
  if (n === 2) return [d[0], d[0]];                       // two points: linear
  const m = new Array<number>(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    const a = d[k - 1], b = d[k];
    if (a === 0 || b === 0 || (a > 0) !== (b > 0)) continue; // 0
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / a + w2 / b);
  }
  const edge = (h0: number, h1: number, m0: number, m1: number) => {
    let e = ((2 * h0 + h1) * m0 - h0 * m1) / (h0 + h1);
    if (Math.sign(e) !== Math.sign(m0)) e = 0;
    else if (Math.sign(m0) !== Math.sign(m1) && Math.abs(e) > Math.abs(3 * m0)) e = 3 * m0;
    return e;
  };
  m[0] = edge(h[0], h[1], d[0], d[1]);
  m[n - 1] = edge(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  return m;
}
// preparePchip(points) → { xs, ys, m, sample(x) } — binary-search the interval, cubic Hermite,
// clamp past the ends to the end value, non-finite x → first y (today's posture, monotone-spline.ts:103-111).
```
- **Retire** the Fritsch–Carlson circle clamp: keeping it rescales valid pchip tangent pairs (e.g. α = β = 2.5, α² + β² = 12.5 > 9) and breaks parity.
- **Why a `prepare` step:** today `sampleMonotoneSpline` calls `monotoneSlopes` on **every** sample (`monotone-spline.ts:113`), so the viewer's 60 samples and Simpson's 51 stations refit 111 times per render. R14's "samples a prepared fit" needs the split.
- **Rename** `monotone-spline.ts` to `pchip.ts` (two importers today: `lib/geometry/foil.ts:21`, `lib/geometry/volume.test.ts:22`), header rewritten to say pchip and why. Keeping the old file with a new body is equally valid; one name only.
- Deck height is **derived** (`deckAt = rockerAt + thicknessAt`), never a third spline (R10).

### Pattern 3: blank geometry (`lib/geometry/blank-fit.ts`)
**Mapping (D-08):** board station `s` (0 = board tail tip) sits at blank station `u(s) = Lb/2 + p + s − L/2`, with `p` positive toward the nose. At `L = Lb, p = 0` this is `u = s` exactly, which is why test (a) is exact.

**Levelling (R11), exact:** pchip is monotone on every interval (interior tangents lie in the Fritsch–Carlson box; the end rule keeps |d₀| ≤ 3|δ₀|), so the minimum over any `[a, b]` is `min(f(a), f(b), every knot value strictly inside (a, b))`. No dense search is needed. It matched a 20,000-sample dense minimum to 1.4e-15 mm on every seeded blank. `level(curve, a, b)` subtracts that value, so the minimum is **exactly** 0 (y − y). Run it once on the whole blank (import) and again on `[u(0), u(L)]` (crop).

**Board profile at a placement:**
- `rocker(s) = blankRocker(u(s)) − curveMinimum(blankRocker, u(0), u(L))`
- `thickness(s)` = Pattern 4
- `foamOff(station) = blankThickness(u(station)) − thickness(station)` (bottoms coincide by construction)

**Fit check (R12, D-05):**
- `worst = max over sampled s of { thickness(s) − blankThickness(u(s)) ; where boardWidth(s) > 0: boardWidth(s) + margin − blankWidth(u(s)) }`
- Fits iff `worst ≤ ε`. Report the station, the kind (thin/wide) and the amount.
- Sample the stations every 1/4 in, plus the five board stations, plus the widepoint.

**Judging a blank (D-07):**
- Search placements coarse (1/4 in) outward from 0, alternating ± sides.
- At the first coarse fit, refine back toward centre in 1/16 in steps. That gives the fitting placement closest to centre.
- If nothing fits, keep the placement with the smallest `worst` (refine it at 1/16 in), and that is the "nearly fits" reading.
- Precompute the board's width samples once per pass. Width does not depend on placement or centre.

**Measured on this machine (Node 24, all 158 prepared blanks, default settings)** [VERIFIED: probe]:

| Board | Listed | Fit | Greyed | Pass time |
|-------|--------|-----|--------|-----------|
| default 72" × 19" @ 2 1/2" | 136 | 135 | 1 | 1–6 ms |
| shortboard 74" @ 2 1/4" | 136 | 136 | 0 | 1–3 ms |
| fish 68" @ 2 1/2" | 142 | 134 | 8 | 2–7 ms |
| midlength 86" @ 2 3/4" | 85 | 77 | 8 | 2–5 ms |
| longboard 108" @ 3" | 44 | 32 | 12 | 2–5 ms |
| 60" @ 2" (largest list) | 157 | 155 | 2 | 1–2 ms |

- A brute-force 1/16 in scan of the whole range at 1/4 in stations took about 350 ms. Don't do that.
- Verdicts were identical with 1 in, 1/4 in and 1/16 in station steps for the default board.
- In the last 3 in of the nose, verdicts did not flip between 1/4 in and 1/64 in steps for any preset or the default board at centre and at both range ends. Rounded-nose blanks behave, because the board's own width goes to 0 continuously at its tip: 1.07 / 0.59 / 0.17 / 0.04 in at 1/2, 1/4, 1/16 and 1/64 in from the default board's nose.
- Width causes every failure measured with default tips: fish nose/body, longboard nose-12 and body, and the squash tail's 4 in end on narrow-tailed blanks.

**List and nearest:**
- `listBlanks` applies the floors from settings (hide), then the verdicts (FITS / WON'T FIT groups, each by length and then name).
- `nearestFit(currentLength, verdicts)` picks the fitting blank with the minimum `|Lb − current|`, tie-broken on `centreT − target` ascending, never the picked blank itself. It returns `null` when nothing fits (F5).

**Provisional preset picks (D-03), computed with each preset's own dims, centre and tips and default fit settings** [VERIFIED: probe]:

| Preset | Pick | Blank length / centre | Placement |
|--------|------|------------------------|-----------|
| shortboard (74", 2 1/4") | Marko Foam 6'4" TP | 76.000 / 2.980 | 0 |
| fish (68", 2 1/2") | Arctic Foam 5'10" MF | 70.875 / 2.938 | 0 |
| midlength (86", 2 3/4") | Marko Foam 7'5" Machine All | 89.000 / 3.510 | 0 |
| longboard (108", 3") | US Blanks 9'3"Y | 111.000 / 3.500 | 0 |

The tie on length (6'4" TP vs 6'4" TP Thick) is broken by less excess centre foam. The planner should regenerate these with the final functions, not copy this table.

### Pattern 4: the scaled foil, the tip rule and the fine-tune
- **Ratio:** `r(p) = foil.center / blankThickness(u(L/2))`, the blank's thickness *under the board's centre*. This makes R13's "thickness at centre equals the target" true at every placement. Dividing by the blank's own C value (placement-independent) is equally literal, but it breaks that acceptance off-centre. **Open Question 2.**
- **Tip rule, recommended reading ("ease into the tip setting"):**
  - `t(s) = r·Tb(u(s)) + (tipSetting_end − r·Tb(u(end)))·w(s)`, then `max(t(s), tipSetting_end)` as the "never below" guard.
  - `w` is a smoothstep that is 1 at that end's tip and 0 at the 12 in station.
  - Tips equal the settings exactly, the 12 in stations stay the blank-scaled values (R5 "derived"), the curve is continuous and smooth, and nothing is subtracted as a constant.
  - This matches CONTEXT's discretion wording ("how the scaled curve eases *into* the tip setting").
- **The literal reading ("floored") has no effect on the data:** `max(r·Tb, tipSetting)` binds on **0 of 499** blank/centre pairs; the smallest scaled tip is 0.435 in and the median 1.113 in. The board's tip would read about an inch against a 5/16 in Nose Tip card. **Open Question 1.** Either reading gives the same verdicts on the seeded data with default settings. Thickness failures only arise when a tip setting exceeds the blank's own thickness there, from a positive fine-tune, or when `r > 1`.
- **Fine-tune (D-11):** add an offset curve that is 0 at the tip, `offset` at the 12 in station and 0 at the centre on each half (a three-knot pchip hump). The tips and centre stay exact, and the 12 in readout equals derived + offset.
- **Effective foil** for RAILS: `{ noseTip, nose12, center, tail12, tailTip }` read off the final curve at the five stations. `deriveEffectiveRails` (`lib/geometry/design.ts:91-103`) is unchanged.

### Pattern 5: one side profile in the store, read by every consumer
```typescript
// lib/geometry/board-profile.ts
export interface BoardSideProfile {
  length: Mm;
  rockerAt: (s: Mm) => Mm;       // levelled
  thicknessAt: (s: Mm) => Mm;    // final foil (blank-scaled + tips + offsets, or the 5-station fallback)
  effectiveFoil: FoilSpec;       // the five stations read off thicknessAt — what RAILS reads
  stationRocker: Record<FoilStationKey, Mm>;
}
```
- **Store (`design-store.tsx`):**
  - `const prepared = useMemo(() => state.blank ? prepareBlank(state.blank.copy) : null, [state.blank?.copy])`
  - `const profile = useMemo(() => buildBoardProfile(...), [prepared, placement, offsets, foil, rocker, outline.length])`
  - `effectiveRails` switches from `state.foil` to `profile.effectiveFoil` (`design-store.tsx:575-577`).
  - `crossSectionVolume` gets `thicknessAt: profile.thicknessAt` (`:648-656`).
- **`lib/geometry/volume.ts`:** `CrossSectionVolumeInput` gains an optional `thicknessAt` that defaults to `sampleFoil`. The anchors still come from `foilStationPoints` (positions depend on length only, `volume.ts:530`), so the estimator path and its goldens are untouched.
- **`lib/geometry/design.ts`:** `DesignSummaryFields` (`:106-112`) gains `rocker` and `blank`, and `summarizeDesign` builds the same profile. Callers to update:
  - `components/setup/board-rack-card.tsx:93-95`, which destructures an explicit field list.
  - `components/setup/board-rack-card.tsx:125`, which passes the whole snapshot.
  - `lib/geometry/summary-line.ts:75-83` (`presetSummary`).
- **`RockerViewer`** takes the profile, plus an optional blank silhouette, instead of `rocker`/`foil` (`rocker-viewer.tsx:160-161`). The one call-site edit outside ROCKER is `components/summary/order-form.tsx:417`, which is a prop change, not a redesign.

### Pattern 6: snapshot version 4 (`lib/models/design-snapshot.ts`)
- `DESIGN_SNAPSHOT_VERSION = 3` (`design-snapshot.ts:53`) → 4.
- Parsing is **shape-based**, not version-based: `parseSnapshot` never reads `parsed.version` (`:241-267`). Keep that.
- **New `rocker` (fallback):** the five-station shape. Store `noseTip`, `nose12`, `tail12` and `tailTip`, with centre 0 implied. This is **exactly** the legacy v2 shape (`legacyRockerSpecSchema`, `:79-84`: `noseTip: z.number(), nose12: z.number(), tail12: z.number(), tailTip: z.number()`), so v2 "maps straight" with no transformation.
- **Union:** `z.union([fiveStationRockerSchema, bezierV3RockerSchema])`. The v3 shape (`:88-97`, eight fields `noseLift … tailFlatness`) shares no field names with it, so the union stays unambiguous.
- **v3 → v4:** `sampleRocker(buildRocker(v3, outline.length), station)` at `rockerStationPositions(outline.length)`. `buildRocker` must **survive as migration-only code**: `rocker-drag.ts` retires, the Bezier builder does not.
- **v1 (no rocker key):** sample `DEFAULT_ROCKER_SPEC` (the Bezier) at the board's own length. That is what v3 showed for such a board, so it "reopens looking as it was saved".
- **New default fallback rocker** for `DEFAULT_DESIGN_STATE`: the Phase-4 figures the Bezier defaults were solved to match — nose tip 4 1/2", nose 12" 1 1/4", tail 12" 3/8", tail tip 2" (`lib/geometry/rocker.ts:132-136` comment). Author them through `inchesToMm`.
- **New top-level `blank`:** `null | { copy: { vendor, name, catalogSlug, pdfPage, lengthMm, volumeLitres|null, deckLengthMm|null, stations: BlankStation[] }, placement: Mm, nose12Offset: Mm, tail12Offset: Mm }`.
  - Absent means null (the `.partial()` tolerance at `:177-190`).
  - Validate with bounds: `stations.max(32)` (data max 15); strings `max(120)` for names, `max(400)` for flags (data max 262); finite numbers (zod 4 default); `|placement| ≤ 4000 mm`; `|offset| ≤ 50 mm`.
- `foil` keeps its five fields. `center` and the tips are always live; `nose12`/`tail12` are the fallback's hand values and are ignored while a blank is picked. "Remove This Blank" writes the sampled current values into them (UI-SPEC §7).
- **Tests:** one round trip per version (v1, v2, v3, v4 with and without a blank); the v3 → v4 five values equal `sampleRocker` at the five stations; malformed present values still throw; an oversized `stations` array is rejected.

### Pattern 7: the third account preference (D-09)
- **Copy the units files one for one:**
  - `lib/units-preference.ts`: storage key, cookie name and max-age, allow-list parse, cookie string, cookie reader, handoff, write queue re-export.
  - `lib/units-server.ts`: `auth()` + cookie + try/catch account read.
  - `app/actions/units.ts`: `"use server"`, `await auth()` first, silent on signed-out, validate, upsert on `clerkUserId`.
  - `components/units-provider.tsx`: `useSyncExternalStore`, `reconciledRef`, write queue, adoption and promotion effects.
  - The root-layout handoff (`app/layout.tsx:76-77`).
- **Value shape:** five independent nullable `Mm`s. Apply the generic `decidePreferenceHandoff` (`lib/preference-handoff.ts`) **per field**, so a tip chosen on one device and a margin chosen on another both survive. The write queue's `T` is the whole five-field object.
- **Columns:** `extra_length_mm`, `extra_center_thickness_mm`, `width_margin_mm`, `nose_tip_thickness_mm`, `tail_tip_thickness_mm`, all `doublePrecision`, nullable, no default (the `userPreferences` pattern at `lib/db/schema.ts:41-47`: `units: text("units")`, `printRailInstructions: boolean("print_rail_instructions")`).
- **Read with a column projection only** (as `readUnitsPreference` does, `lib/db/queries.ts`). A `select()` of all columns would break the units read between deploy and migration.
- **Root layout:** today it awaits two handoffs serially (`app/layout.tsx:76-77`). A third serial `auth()` + read adds latency to every route, so wrap them in `Promise.all`.
- **Provider placement:** mount `FitDefaultsProvider` **above** `DesignProvider`, so a brand-new board's tips come from it (the `useState` initialiser reads the server-resolved value, which is hydration-safe). The dialog renders once, inside the provider (UI-SPEC §12).
- **Guards:** `lib/db/ownership.test.ts` enumerates action files explicitly (`UNITS_ACTIONS_PATH`, `PRINT_INSTRUCTIONS_ACTIONS_PATH`), so `app/actions/fit-defaults.ts` must be **added** to all four of its lists plus its own "exports exactly" test.

### Pattern 8: streaming the list (Next 16 + React 19)
```tsx
// app/design/rocker/page.tsx (Server Component) — pattern from node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md
export default function RockerEditorPage() {
  const blanks = loadPickableBlanks(); // NOT awaited; resolves to { status: "ok", blanks } | { status: "unavailable" }
  return <RockerEditor blanks={blanks} />;
}
// in the client sidebar, around the list region only:
<Suspense fallback={<p>Loading blanks…</p>}><BlankList blanks={blanksPromise} /></Suspense>
// BlankList: const result = use(blanksPromise)
```
- The loader **never rejects**. It catches and returns `{ status: "unavailable" }` (E4), so no error boundary is needed. It also returns `unavailable` when the table has **zero** rows, the window between the production migrate and the production seed. Without that, E1 "No blank is long enough" would show falsely.
- The blank read lives in `lib/db/blanks.ts`, **not** `lib/db/queries.ts`. The ownership test requires every `db.select` in `queries.ts` to constrain `eq(<table>.clerkUserId, …)` (`lib/db/ownership.test.ts`, "every Drizzle statement touching an owned table…"), and blanks are public. Add an ownership assertion that `lib/db/blanks.ts` performs no insert/update/delete and that `blanks` has no owner column.

### Anti-Patterns to Avoid
- **Re-splining five sampled stations of a blank curve** for drawing or volume. It is not the blank curve between stations. Sample `profile.thicknessAt` densely.
- **Refitting tangents per sample** (today's `sampleMonotoneSpline`). Prepare once per blank copy, then sample.
- **Keeping the Fritsch–Carlson circle clamp "for safety".** It changes valid pchip tangents.
- **Levelling on the lowest station value.** Use the exact interval minimum; after cropping, the minimum is often at a crop end, not a knot.
- **Storing interpolated values** (in `blanks` or in a preset module). Only raw rows.
- **Putting the unscoped blank read in `lib/db/queries.ts`.** The ownership test fails.
- **A `select()` of all columns on `user_preferences`.** It breaks the units read between deploy and migration.
- **Hand-typing preset blank rows or expected catalogue numbers.** Generate them from the CSV via the tested reader; tests read the CSVs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Account + browser preference sync | a new sync scheme | `lib/preference-handoff.ts` (`decidePreferenceHandoff`, `createPreferenceWriteQueue`) | Five edge cases and the out-of-order write race are already solved and tested |
| Mark/length/dim formatting, typed parsing, slider bounds | ad-hoc `toFixed`, `/25.4` | `formatMark`, `formatLength`, `formatDim`, `measureSlider`, `typedFieldBounds`, `commitTypedMeasure` (`measure-display.ts`) | The units ledger bans the raw formatters in screen files |
| Signed mark | inline `+`/`-` | new `formatSignedMark` mirroring `formatSignedDim` (`measure-display.ts:98-111`), metric via `formatWholeMm`, sign from what was printed | The one formatter the UI-SPEC needs that is missing |
| Snapshot tolerance | version switches | the existing `.partial()` + shape-union + migrate pattern | Proven across v1–v3 |
| Upsert | select-then-insert | `onConflictDoUpdate({ target: [vendor, name] })` | Atomic, idempotent |
| Streaming data to a client island | client `fetch` / SWR | promise prop + `use()` + `Suspense` | Zero client network; framework-documented |

**Key insight:** every hard part of this phase already exists in the codebase as a pattern (preferences, snapshot migration, formatting, source-contract tests). The genuinely new code is about 600 lines of pure geometry and a CSV reader, and all of it is verifiable against the CSVs.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Production `models.snapshot` rows at versions 1–3 (rocker in the Bezier or legacy shape) | **Code only** — migrate on read in `parseSnapshot`; no data migration. A board is rewritten as v4 only when it is next saved |
| Stored data | New `blanks` table (empty until seeded) on **both** Neon branches | Migrate, then seed, on development; push → deploy → `db:migrate:prod` → `db:seed:blanks:prod` on production |
| Live service config | Vercel env: no new variable needed in production. Neon: two branches, both need the two migrations and the seed | Manual, in order (CLAUDE.md Database) |
| OS-registered state | None — verified: no cron, launchd or pm2 is involved in this app | None |
| Secrets/env vars | New optional `SHAPER_BLANKS_SOURCE=seed-csv`, set **only** in `playwright.config.ts` `webServer.env`; `SEED_ENV_FILE` (optional, mirrors `MIGRATE_ENV_FILE`) | Code edit; never set in Vercel |
| Browser state | New cookie + localStorage key for fit defaults; existing `shaper-units` keys untouched | Code only |
| Build artifacts | `e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png` and **`volume-desktop-desktop-darwin.png`** | Re-record both deliberately, from the main checkout, after inspecting the diffs |

## Common Pitfalls

### Pitfall 1: the VOLUME desktop baseline moves (conflicts with UI-SPEC "the other four must not move")
**What goes wrong:** the pchip swap alone moves the default board's cross-section volume from **29.7930 L to 29.9402 L** [VERIFIED: probe]. The VOLUME screen prints `quotedVolumeLitres.toFixed(2)` (`components/volume/volume-calculation-card.tsx:136,181`), so the baseline image differs.
**How to avoid:** plan the VOLUME re-record as an intended consequence of D-13 (which already says "litres move by a hair"). Inspect the diff: only the two litres figures should change. TEMPLATE, RAILS and FINS must stay pixel-identical. RAILS reads the three station values, which are unchanged for the default fallback board.
**Warning signs:** any pixel outside the litres text moving on VOLUME, or any change on RAILS, FINS or TEMPLATE.

### Pitfall 2: exact round-trip of CSV values
**What goes wrong:** `toBe(csvValue)` on `mmToInches(inchesToMm(v))` fails for 1,636 cells.
**How to avoid:** compare at the CSV's own precision (`toFixed(4)`) or `toBeCloseTo(v, 9)`.

### Pitfall 3: e2e has no database
**What goes wrong:** `playwright.config.ts` sets `DATABASE_URL: "postgresql://user:pass@localhost:5432/shaper"` (a deliberate non-secret). Every ROCKER spec would see "The blank catalog didn't load", and the ROCKER baseline would record an error state (or a loading one, depending on timing).
**How to avoid:** `loadPickableBlanks()` reads the committed CSVs through the same reader and mapping when `SHAPER_BLANKS_SOURCE === "seed-csv"`, set only in the Playwright web-server env. Specs wait for `getByRole("list", { name: "Blanks" })` before screenshots. `test:e2e:prod` uses `.env.local` (the dev DB) and so covers the real path once dev is seeded.

### Pitfall 4: presets need their blank rows on the client
**What goes wrong:** `applyPreset` runs on `/` (`components/setup/setup-screen.tsx:73,101`), which never loads blanks. A preset that names only vendor + name cannot build its board (D-01: the board carries the copy).
**How to avoid:** `scripts/generate-preset-blanks.ts` writes `lib/blanks/preset-blanks.generated.json` (raw rows for the four picked blanks) through the tested reader. A vitest asserts that each preset's named blank exists in it and equals the CSV rows (drift guard). The dev "Copy preset values" line prints `blank: { vendor, name, placement: inchesToMm(…) }`; after the founder changes a pick, re-run the generator. Do not put it under `__fixtures__/`, which is test-only by convention (`pinned-preset-outlines.ts` header).

### Pitfall 5: tests and e2e specs that touch the retiring Bezier (more than the UI-SPEC lists)
- `components/viewer/drag-spacing.test.ts:35-36,96`: its rocker half imports `buildRocker` and `sideProfileDragPoints` from `rocker-drag`. Retire that half and keep the outline half.
- `e2e/desktop-regression.spec.ts:69-93`: "ROCKER: dragging the nose tip handle with the mouse changes Nose Angle". Rewrite it for a mouse drag of the placement slider.
- `e2e/phone-layout.spec.ts:437-520`: rocker tests read `/^Nose Angle — /` and "Show construction lines".
- `e2e/phone-screens.spec.ts:66-100`: asserts "the construction overlay … is on by default on a touch device" (`[data-drag-target]` visible). It becomes "measuring points off on every pointer".
- `e2e/viewer-toolbar.spec.ts:120-133`: `toMatch(/construction lines$/)`. The label becomes "Show/Hide measuring points".
- `e2e/touch-drag.spec.ts:570+`: rocker handle drags. Rewrite them for the placement thumb.
- `e2e/touch-sizing.spec.ts:75`: add `/design/rocker` to the loop.
- `lib/geometry/rocker-drag.ts` + `.test.ts`: retire.
- `lib/geometry/rocker.test.ts`: keep only what guards the migration-only Bezier.
- `lib/geometry/presets.test.ts:219-296`: Bezier 12 in figures and foil ordering. Re-express them through the board profile.
- `lib/geometry/preset-source.test.ts:101-208`: rocker block round trip. Replace it with the blank line.
- `lib/models/design-snapshot.test.ts:77` ("DESIGN_SNAPSHOT_VERSION is 3") and the v3 rocker tests.
- `components/design/slider-row.test.ts`: reads a fixed path, `components/rocker/rocker-controls.tsx`. That file must keep existing and importing `slider-row`, and the hand-rolled Center Thickness row needs an allowlist entry (UI-SPEC "Already done").

### Pitfall 6: floating-point floors
**What goes wrong:** `Lb ≥ L + 2 in` compared in mm can flip on 1e-13 noise when a user types an exact boundary.
**How to avoid:** compare with `≥ bound − 1e-6` mm and test the boundary explicitly.

### Pitfall 7: forgetting the new field in the store's hand-written lists
**What goes wrong:** `historySnapshot` (`design-store.tsx:341-365`), `designSnapshotFields` (`:724-750`), `applyPreset` (`:448-466`) and `applyModel` (`:471-490`) each list fields by hand. Leave `blank` out of any of them and undo, autosave or reopen silently drops the placement.
**How to avoid:** add `state.blank` everywhere, and test undo of a placement move plus a round trip through `designSnapshotFields`.

### Pitfall 8: the board length changes after a pick
**What goes wrong:** the stored placement can exceed the new slider range. If `L > Lb − 1 in`, `u(s)` runs past the blank's ends, where pchip clamps to the end value, so the drawing and the fit would lie.
**How to avoid:** clamp the placement on read (never write back silently). Treat samples outside `[0, Lb]` as thickness and width 0 so the fit fails with the "too short" reason (F3).

### Pitfall 9: "zero network requests" and autosave
**What goes wrong:** a signed-in board with a `modelId` autosaves 1,200 ms after the last edit (`lib/models/autosave.ts:61`). R14's counter would see the save.
**How to avoid:** run the e2e signed out (the suite's default). Attach `page.on("request")` after the page settles and count only during the drag.

### Pitfall 10: centre thickness must stay one field
**What goes wrong:** a page-local copy of centre thickness appears in the new sidebar (R1/D-12).
**How to avoid:** the Center Thickness row writes `updateFoil({ center })`, and RAILS and VOLUME already read it through `deriveEffectiveRails` and `effectiveVolume`. Add a snapshot-shape test proving the record holds exactly one centre field.

### Pitfall 11: the units-isolation ledger
**What goes wrong:** new files break the units-isolation ledger.
**How to avoid:**
- Every new `components/rocker/*.tsx` that imports `lib/geometry/units` must be named in `DESIGN_SCREEN_DISPLAY_FILES` (`lib/units-isolation.test.ts:327-346`), import `measure-display`, and use none of the banned formatters (`formatInchesFraction`, `formatFeetInches`, `formatSignedInchesFraction`, `formatCentimetres`, `formatWholeMm`).
- The defaults dialog lives outside the walked folders. Name it in the ledger explicitly so it is still checked.
- `design-store.tsx` must not import the units provider, preference or `useUnits`.

### Pitfall 12: hand-typed expected numbers
**What goes wrong:** tests assert literal blank names or catalogue numbers typed by hand.
**How to avoid:** assert properties instead. For nearest-fit: the offer fits, differs from the picked blank, and no fitting blank is closer in length. Test (a) reads the Marko rows from the CSV through the reader.

## Code Examples

### Hand-worked pchip tangents to pin (exact; verified against SciPy 1.13.1)
```typescript
// 4 points — x=[0,12,36,60], y=[0,1.25,4,9] (monotone-spline.test.ts's own INCREASING set)
// secants δ=[5/48, 11/96, 5/24]; h=[12,24,24]
// d0 = ((2·12+24)(5/48) − 12(11/96)) / 36 = 29/288   = 0.100694444444444
// d1 = 108 / (60/(5/48) + 48/(11/96))          = 33/304   = 0.108552631578947
// d2 = 144 / (72/(11/96) + 72/(5/24))           = 55/372   = 0.147849462365591
// d3 = ((48+24)(5/24) − 24(11/96)) / 48          = 49/192   = 0.255208333333333
// today's Fritsch–Carlson gives [0.1041667, 0.1097074, 0.1478495, 0.2083333] — d2 agrees only because h1 = h2

// 5 points — x=[0,12,36,60,72], y=[2,0.375,0,1.25,4.5] (a hand fallback rocker in inches)
// d = [−101/576, −117/3808, 0, 65/688, 11/32]
//   = [−0.175347222222222, −0.0307247899159664, 0, 0.0944767441860465, 0.34375]
// today's gives [−0.1354167, −0.0257482, 0, 0.08125, 0.2708333]

// end clamp: x=[0,3,4], y=[0,3,0] → [3, 0, −4]   (raw d0 = 4 > 3·δ0 with δ0, δ1 opposite → 3)
// mirrored:  x=[0,1,4], y=[0,3,0] → [4, 0, −3]
// flat secant: x=[0,10,20,30], y=[1,2,2,5] → [0.15, 0, 0, 0.45]
// two points: x=[0,20], y=[1,3] → [0.1, 0.1]
```

### Test (a), sketch
```typescript
// expected values come from the CSV, never typed: read Marko rows via lib/blanks, pick "6'0\" M-Regular"
const blank = catalogFromCsv().find(b => b.vendor === "Marko Foam" && b.name === `6'0" M-Regular`)!;
const prepared = prepareBlank(blank);
const profile = boardProfileAt(prepared, { length: blank.lengthMm, placement: mm(0), /* centre, tips, offsets */ });
for (const [key, label] of [["tailTip","T0"],["tail12","T12"],["nose12","N12"],["noseTip","N0"]] as const) {
  expect(mmToInches(profile.stationRocker[key])).toBeCloseTo(csvRocker(blank, label), 9); // 1.74 / 0.56 / 1.32 / 4.12
}
```
Measured: 1.74, 0.5599999999999997, 1.3200000000000012, 4.12. [VERIFIED: probe]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fritsch–Carlson with mirrored weights + circle clamp (`monotone-spline.ts`) | Textbook pchip (SciPy/MATLAB), no clamp | This phase (D-13) | Foil and litres move by a hair (default board +0.15 L); VOLUME baseline re-recorded |
| Three-knot Bezier rocker (260829-rda) | Blank-derived rocker; five typed pchip stations as the fallback | This phase (D-14) | Bezier kept for v3 migration only |
| `sampleMonotoneSpline` refits per sample | `preparePchip` once, `sample` many | This phase (R14) | Lets the verdict pass and slider moves hit their budgets |

**Deprecated/outdated:** `lib/geometry/rocker-drag.ts`; the Angle/Smoothness/Flatness controls; the construction overlay's drag targets and the touch-only drag chip (UI-SPEC "Already done").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The tip rule "eases into" the tip setting (tips equal the setting), rather than the literal "floor" that never binds on the data | Pattern 4 | The foil's tips read about an inch instead of the setting; UI-SPEC's tip cards disagree with the drawn board |
| A2 | The scale ratio divides by the blank's thickness under the board's centre, not by the blank's C-station value | Pattern 4 | R13's "centre equals target" fails off-centre, or the list's centre floor and the ratio use different centres |
| A3 | The ease window runs from the tip to the 12 in station (so the 12 in stays purely blank-scaled) | Pattern 4 | The 12 in readouts shift with the tip setting |
| A4 | The pickable rule is thickness at C and at both end stations | The Data | A future vendor's partial rows could be picked or hidden unexpectedly (today it excludes exactly the four SUPs) |
| A5 | The v1 no-rocker migration samples the default Bezier at the board's own length | Pattern 6 | A v1 board's reopened rocker differs from what v3 displayed |
| A6 | e2e reads blanks from the seed CSVs via a test-only env switch | Pitfall 3 | Without it the ROCKER e2e suite cannot exercise the list |
| A7 | Fit-defaults handoff is decided per field | Pattern 7 | Mixed-device choices could overwrite one another |
| A8 | Declaring `tsx@4.23.12` as a devDependency is acceptable (not "runtime") | Standard Stack | If the founder reads "no new dependency" strictly, the seed runs via `npx tsx` on a transitive install |

## Open Questions (RESOLVED — all five closed by the `### Rulings` block below, 2026-09-26)

1. **Tip rule: floor or ease-in? (blocks the geometry plan's foil tests)**
   - What we know: D-10 says "floored at the tip setting", while the discretion note says "eases into the tip setting". With default settings the floor binds on 0 of 499 blank/centre pairs (smallest scaled tip 0.435 in, median 1.113 in). R5 and the DONE WHEN want "a foil that matches my … tip thicknesses", and UI-SPEC §9 draws Nose Tip and Tail Tip as set cards.
   - What's unclear: whether the founder wants the board's tips to *equal* the setting or only never fall below it.
   - Recommendation: implement the ease-in (A1/A3) behind one pure function, and put the one-paragraph evidence in the plan's approval checkpoint so the founder chooses before code.
2. **Which "blank centre" sets the scale ratio?**
   - What we know: only the "thickness under the board's centre" reading satisfies R13's acceptance at every placement. The list's centre floor (R2) uses the blank's C value, and should keep doing so.
   - Recommendation: ratio uses the thickness under the board's centre (A2); state it in the plan.
3. **Should an untouched default board follow a tip-default change?**
   - What we know: "a new board starts from them".
   - Recommendation: read the settings at the store's initial state only; `boardStarted: false` boards could optionally follow. That is the founder's call and low stakes.
4. **Declaring tsx.** Choose between `devDependencies` pinned at 4.23.12 and `npx tsx`. Either works today.
5. **SPEC edge "no fitting blank at all"** is resolved by UI-SPEC F5 (flag, no offer, Change Fit Rules). No research gap remains.

### Rulings (2026-09-26 — the founder answered 1–4 during `/gsd-plan-phase 11`; recorded as CONTEXT D-17–D-20)

1. **Ease-in (A1/A3) — D-17.** The tips equal the setting; the ease runs from each 12 in station to its tip; the never-below guard stays; the fit check runs on the result. Plan the foil tests to that rule.
2. **Ratio under the board's centre (A2) — D-18.** The list's centre floor keeps the blank's own C value.
3. **An untouched new board follows the live tip defaults until first edited — D-19.** Once a tip is touched, a blank picked, or the board saved/edited, it keeps its own tips.
4. **`npx tsx`, nothing declared — D-20.** No package.json change; no human-verify checkpoint is needed for a dependency edit because there is none.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | 24.19.0 | — |
| npm | scripts | ✓ | 11.17.0 | — |
| tsx | seed and preset-blank generator scripts | ✓ (transitive) | 4.23.12 | declare it pinned, or `npx tsx` |
| Playwright + Chromium/WebKit | e2e | ✓ | 1.63.0 (chromium-1243, webkit-2359) | — |
| Python 3 + SciPy | optional parity fixture | Python 3.9.6 ✓, **SciPy ✗** on the machine | — | Hand-worked cases above are sufficient; an optional fixture script would need `pip install scipy` in a venv (this research used a throwaway one) |
| Neon development branch | migrate + seed dev | assumed ✓ via `.env.local` (not inspected — reading it is blocked by permissions) | — | — |
| Production DB access | `db:migrate:prod`, `db:seed:blanks:prod` | via `vercel env pull` | — | Hand to the user if the sandbox blocks (memory: permission walls) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** SciPy (optional; hand-worked parity cases replace it).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (node env) + Playwright 1.63.0 |
| Config file | `vitest.config.ts` (includes `lib/**/*.test.ts`, `components/**/*.test.ts`), `playwright.config.ts` (port 3100, `PW_PORT` override; `IS_WEBPACK_TEST=1` when run inside a worktree) |
| Quick run command | `npx vitest run lib/geometry/pchip.test.ts lib/geometry/blank-fit.test.ts lib/blanks` |
| Full suite command | `npm test && npm run lint && npm run test:e2e` |

### The four named tests (R16), exact titles, all in `lib/geometry/blank-fit.test.ts`, committed before any UI plan
- (a) `"reproduces the catalogue rocker at the tips and 12\" stations for a board exactly as long as Marko 6'0\" M-Regular at placement 0"`
- (b) `"pchip never overshoots between two stations on any seeded blank"` (rocker, thickness and width over their own stations; measured 0 of 888,137)
- (c) `"levelling puts the curve's minimum at exactly 0"` (whole blank, the four datum blanks, and an off-centre crop)
- (d) `"the fit check rejects a board thicker than the blank near the nose even when the centre fits"` (e.g. Marko 6'0" M-Regular with a nose tip setting above its nose thickness)

### Phase Requirements → Test Map
| Req | Behavior | Type | Automated Command | File Exists? |
|-----|----------|------|-------------------|-------------|
| R1 | Center Thickness writes `foil.center` only; RAILS/VOLUME follow; one field in the record | unit + e2e | `npx vitest run lib/models/design-snapshot.test.ts lib/geometry/board-profile.test.ts`; e2e: change centre on ROCKER, read RAILS centre | ❌ Wave 0 |
| R2 | Floors from settings; 5'10" × 2 1/2" lists M-Regular, not Arctic 5'8" SB; settings change the list | unit | `npx vitest run lib/geometry/blank-fit.test.ts -t "floors"` | ❌ |
| R3 | 70" board on the 72.04" blank → ±0.52"; drag-left raises the nose-positive value | unit + e2e | `-t "placement range"`; `touch-drag.spec.ts` placement thumb | ❌ |
| R4 | Readouts at 5 stations; foam at centre = blank C − target | unit (a) + e2e | `-t "reproduces the catalogue rocker"`; e2e label changes on drag | ❌ |
| R5 | 12" = derived with no tweak; +1/16" survives a placement change, clears on Reset, fit sees it | unit + store e2e | `npx vitest run lib/geometry/board-profile.test.ts -t "fine-tune"` | ❌ |
| R6 | Raise centre past the floor: pick unchanged, flag + reason, offer = closest-length fitter | unit (property) + e2e | `-t "nearest fit"`; `e2e/rocker-blanks.spec.ts` | ❌ |
| R7 | 101/33/28 blanks; values round-trip at CSV precision | unit | `npx vitest run lib/blanks/catalog.test.ts` | ❌ |
| R7/R9 | Seed twice → counts unchanged | manual/DB check (dev branch) | `npm run db:seed:blanks` twice + read-only count query | manual |
| R8 | 5- and 15-station blanks round-trip; no station-numbered columns | unit + schema review | `lib/blanks/catalog.test.ts`; a source test on `schema.ts` (no `/t\d+|n\d+/` column names) | ❌ |
| R9 | Arctic 7'8" E `N3` width-only; 4 SUPs stored, not pickable; flags verbatim; empty ≠ 0 | unit | `npx vitest run lib/blanks/csv.test.ts lib/blanks/catalog.test.ts` | ❌ |
| R10 | Parity cases; no overshoot (b); deck − rocker = thickness | unit | `npx vitest run lib/geometry/pchip.test.ts` | ❌ (extends `monotone-spline.test.ts`) |
| R11 | (c) + Wakesurf/10'2" M level to 0 + off-centre crop re-levels | unit | `-t "levelling"` | ❌ |
| R12 | (d) + width failure names its station; reason string names station + amount | unit | `-t "fit check"`; `npx vitest run lib/geometry/blank-reasons.test.ts` | ❌ |
| R13 | No negative thickness for any seeded blank at any placement; centre = target; tips ≥ setting | unit (sweep) | `-t "scaled foil"` | ❌ |
| R14 | Zero requests during a slider drag; prepared fit not refitted (mutate raw stations after prepare → same output) | e2e + unit | `npx playwright test e2e/rocker-blanks.spec.ts --project=android`; `-t "prepared"` | ❌ |
| R15 | 2.374" → `2 3/8"`, stored 60.2996; `formatSignedMark` both systems; ledger; baselines | unit + e2e | `npx vitest run lib/geometry/measure-display.test.ts lib/units-isolation.test.ts`; `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | partial |
| R16 | (a)–(d) exist by name and precede UI commits | source + git | `grep -n "reproduces the catalogue rocker\|never overshoots\|minimum at exactly 0\|thicker than the blank near the nose" lib/geometry/*.test.ts`; `git log --reverse` | ❌ |
| D-14 | v1/v2/v3 migrate to 5 stations; v3 values = Bezier samples | unit | `npx vitest run lib/models/design-snapshot.test.ts` | extend |
| D-09 | handoff per field; action validates + auth first; ownership lists include the new action | unit | `npx vitest run lib/fit-defaults-preference.test.ts lib/db/ownership.test.ts` | ❌ / extend |

### Sampling Rate
- **Per task commit:** the quick command plus the touched file's own suite.
- **Per wave merge:** `npm test && npm run lint`, then `npm run test:e2e` on main after every wave (the phase-9 rule).
- **Phase gate:** full suite green; the ROCKER and VOLUME baselines re-recorded once, deliberately, with diffs inspected; `npm run build` from the main checkout.

### Wave 0 Gaps
- [ ] `lib/geometry/pchip.test.ts` — parity cases, prepared API, no-overshoot tests carried over
- [ ] `lib/blanks/csv.test.ts`, `lib/blanks/catalog.test.ts` — reader and mapping over the real CSVs
- [ ] `lib/geometry/blank-fit.test.ts` — the four named tests plus floors/placement/nearest/foil
- [ ] `lib/geometry/blank-reasons.test.ts`; `formatSignedMark` in `measure-display.test.ts`
- [ ] `lib/geometry/board-profile.test.ts`
- [ ] `lib/fit-defaults-preference.test.ts`
- [ ] `e2e/rocker-blanks.spec.ts` — pick → slide → readouts → flag/offer → zero network
- [ ] `playwright.config.ts` `SHAPER_BLANKS_SOURCE=seed-csv`

### Human-verified (not automatable)
- The founder's tip-rule and ratio choices (Open Questions 1–2) at plan approval.
- The drawing's look: blank line, foam shade, board inside, in all four themes.
- Picking the four real presets through the capture loop (D-03 provisional picks).
- Production order: push → Vercel deploy green → `db:migrate:prod` (both migrations) → `db:seed:blanks:prod` → read-only verification of the table count (162) and the journal length.
- A real-phone walk of the picker and the placement thumb (emulator evidence is not phone evidence, per project memory).

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (Clerk, unchanged) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `await auth()` before any DB call in `app/actions/fit-defaults.ts`; no caller-supplied owner parameter; blanks read public and read-only; `lib/db/ownership.test.ts` extended |
| V5 Input Validation | yes | zod v4 snapshot v4 with bounds (stations ≤ 32, strings capped, finite numbers, placement/offset ranges); allow-list parse of the five settings (finite, within the UI-SPEC bounds) on cookie, localStorage and action input; strict CSV numeric parse that fails the seed loudly |
| V6 Cryptography | no | — |
| V14 Configuration | yes | `SHAPER_BLANKS_SOURCE` only in the Playwright env; production seed only via the pulled env file, deleted on exit |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized or malformed blank copy posted in a save (storage abuse, render DoS) | Tampering / DoS | `saveModel` already re-parses (`app/design/actions.ts:47`); v4 schema bounds reject it |
| Injected markup in catalogue flags or names | Tampering | React text rendering only; never `dangerouslySetInnerHTML` for catalogue text |
| Writing another shaper's defaults | Elevation | Identity from `auth()` only; upsert scoped to `clerkUserId` |
| Junk cookie/localStorage values | Tampering | Allow-list parser returns null (renders defaults) |
| SQL injection via the seed | Tampering | Drizzle parameterised insert; `sql.raw` only for the `excluded.<column>` identifier taken from schema column names, never from data |

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `lib/geometry/{monotone-spline,foil,rocker,design,volume,presets,preset-source,measure-display,units,outline,board}.ts`, `lib/models/design-snapshot.ts` (+ test), `components/design/design-store.tsx`, `lib/db/{schema,queries,client,ownership.test}.ts`, `lib/auth/open-access.test.ts`, `lib/{units-preference,units-server,preference-handoff}.ts`, `components/units-provider.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/design/{layout,rocker/page}.tsx`, `lib/units-isolation.test.ts`, `components/design/slider-row.test.ts`, `components/viewer/drag-spacing.test.ts`, `playwright.config.ts`, `drizzle.config.ts`, `drizzle/0000–0003`, `package.json`, `.github/workflows/ci.yml`, the relevant e2e specs, the three CSVs.
- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`: streaming a promise to a Client Component with `use()`.
- `node_modules/drizzle-orm` 0.45.2 type declarations: `doublePrecision`, `uniqueIndex`, `$type`, `neon-http` batch vs transaction.
- SciPy `scipy/interpolate/_cubic.py` (`PchipInterpolator._find_derivatives`, `_edge_case`), **plus a local run of SciPy 1.13.1** reproducing every tangent to within 2.7e-15.
- Scratch probes (`scratchpad/p11/*`): CSV profile, round-trip, pchip parity, overshoot sweep, exact-min check, test (a), tip reach, verdict budget, nose-zone sensitivity, preset picks, payload size, the volume delta, and all 17 geometry suites run against a pchip-patched copy (1,643 pass; 5 failed only on scratch-copy file paths).

### Secondary (MEDIUM confidence)
- Drizzle upsert guide (orm.drizzle.team/docs/guides/upsert): composite `target` and the `excluded` reference.

### Tertiary (LOW confidence)
- None relied on.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything is already installed and was verified; one dev-tool choice is flagged.
- Architecture: HIGH — mapped to real file and line anchors; guard tests read.
- Maths: HIGH — parity against SciPy, sweeps over the full seeded data.
- Pitfalls: HIGH — each one measured or read in code.
- Tip rule and ratio: MEDIUM — interpretation calls, flagged for the founder.

**Research date:** 2026-09-25
**Valid until:** 2026-10-25 (stable: data committed, stack pinned)
