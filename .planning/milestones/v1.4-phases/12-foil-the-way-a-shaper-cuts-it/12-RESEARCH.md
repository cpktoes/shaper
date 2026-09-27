# Phase 12: Foil the Way a Shaper Cuts It - Research

**Researched:** 2026-09-26
**Domain:** pure shaping geometry in `lib/geometry/` (the derivation of deck, bottom, thickness and tips off a real blank), snapshot migration (version 4 → 5), one account preference extended (Fit & Tip Defaults), an additive Drizzle migration, and the ROCKER screen's readouts
**Confidence:** HIGH for the derivation, the measurements and the code map (every number below was computed this session with the repository's own functions over the seeded catalogue); MEDIUM for the recommendations in Open Questions (they need the founder)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Deck skin & planer passes
- **D-01:** **The deck skin is a Fit & Tip Default with a per-board value** — an account default in the gear menu's Fit & Tip Defaults, a per-board value on ROCKER, and a new board follows the live default until first edited or saved (Phase 11's D-09 and D-19 pattern, reused as is). — **Reversibility:** one-way — the account default is a new nullable `user_preferences` column and the per-board value a new saved-board field; undoing either needs a production migration and a snapshot version.
- **D-02:** **The default deck skin is 1/8"** (about one planer pass), stored in millimetres like every other mark and shown through `measure-display.ts` (1/16" steps in Imperial, whole mm in Metric).
- **D-03:** **Planer passes are counted against a "Planer Max Depth" setting, default 1/8" per pass,** living in Fit & Tip Defaults beside the skin. The foam off the bottom is shown as a depth and as passes (depth ÷ Planer Max Depth, rounded up to whole passes). This setting REPLACES Extra Center Thickness (see D-10). — **Reversibility:** one-way — same column reasoning as D-01; the retiring Extra Center Thickness column is removed only after the deploy, per CLAUDE.md's expand/contract order.

#### Tip thinning & the pin choice
- **D-04:** **The pin choice (Pin deck / Bottom) is both an account default and a per-board setting.** Fit & Tip Defaults holds the shaper's default (Pin deck out of the box); the ROCKER page carries the board's own setting; a new board starts from the account default and keeps its own once edited or saved (the D-19 rule). The founder first said "account only, no ROCKER toggle", then reversed it when asked whether a saved board should remember the choice it was cut with: *"Great catch, this is reason to include a rocker page setting for it. Settings changes the users default."* — **Reversibility:** costly — the per-board setting is a saved-board field carried by the version-5 snapshot; removing it later means another snapshot version.
- **D-05:** **The thinning between a 12" station and its tip is eased — flat at the 12" station, arriving at the tip target — so the curve has no kink at the station.** Under Pin deck the ease lifts the bottom (tip rocker grows); under Bottom it lowers the deck. Phase 11's tip ease (`TIP_EASE_WINDOW_MM` in `lib/geometry/blank-fit.ts`, D-17) is the kind of ease meant; the exact function is the planner's, with the no-kink property tested.
- **D-06:** **The four rocker numbers are the board's own** — nose tip and tail tip include the lift under Pin deck — **and the DATASHEET keeps the blank's own rocker in its column beside them**, so the difference is visible.

#### Older boards, presets & litres
- **D-07:** **A board saved under Phase 11's model keeps its five station numbers exactly.** Opening it applies the default skin and the centre gap, and the two 12" fine-tunes absorb whatever residual remains, so nose tip, nose 12", centre, tail 12" and tail tip read what was saved; only the curve between stations follows the new model. Saved boards move to snapshot version 5 (skin, pin choice) with the same tolerate-and-migrate reading as versions 1–4. — **Reversibility:** costly — a snapshot version and a migration rule that later versions must keep honouring.
- **D-08:** **The four presets re-pick their provisional blanks by the same rule under the new foil, and litres follow the new foil everywhere** (VOLUME, the preset and rack cards, the summary), so the one litres figure stays one figure. Preset litres will move again; the picks stay marked provisional for the founder.

#### Fit check & the blank list
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

### Deferred Ideas (OUT OF SCOPE)

#### Reviewed Todos (not folded)
- **Smoother-looking drawn rocker curve without changing the PCHIP numbers** (`.planning/todos/pending/2026-09-26-smoother-drawn-rocker-curve-without-changing-the-numbers.md`) — related but separate: it changes only how the curve is drawn; kept out so this phase stays about the numbers.
- **Blank manufacturer tick-boxes in settings** (`.planning/todos/pending/2026-09-26-blank-manufacturer-tick-boxes-in-settings.md`) — a list filter; its own quick task.
- **Live pointer coordinates on the Template and Rocker curves** (`.planning/todos/pending/2026-09-14-live-pointer-coordinates-on-the-template-and-rocker-curves.md`) — a viewer readout; matched on keywords only.

No new ideas came up outside the phase scope — the discussion stayed within it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (12-SPEC.md) | Research Support |
|----|-------------|------------------|
| R1 | Deck skin, constant along the board; the board's deck is the blank's deck lowered by the skin | §Derivation (deck = blank deck − skin, exact to 4e-14 mm); Pattern 1; settings keys (§Settings); named test (a) |
| R2 | Centre thickness sets the bottom; the gap is foam off the bottom, read as a depth and as planer passes | `centerGap = blank thickness under the board's centre − skin − target`; `planerPasses`/`formatPasses` (§Passes, measured cases in both systems) |
| R3 | The board's bottom parallels the blank's bottom rocker; the four rocker numbers are the blank's own; 12" thickness falls out | Levelling proof: the un-thinned board rocker equals Phase 11's rocker to 2.8e-14 mm on 2,886 cases; thickness(12") = blank − skin − gap to 4.3e-14 mm |
| R4 | Tip thicknesses with a Pin deck / Bottom choice | §Ease: one signed thinning amount, applied to the bottom (Pin deck) or the deck (Bottom); negative thinning measured (Pitfall 3) |
| R5 | The bottom through the 12" stations is fixed before thinning; thinning touches only the last 12" | Level on the un-thinned bottom (crop low point never inside a tip window: 0 of 2,886); smoothstep weight is exactly 0 at and inside the station |
| R6 | Fine-tunes still nudge the 12" stations | Recommend the fine-tune on the DECK (Open Question 1): on the bottom it dips the rocker below zero near the centre in 3,256 of 3,256 migrated cases |
| R7 | Geometry first, pure and tested, named tests before any screen | §Validation Architecture: six named tests + the Phase 11 golden fixture, committed before the first component edit |
| R8 | Units through `units.ts` / `measure-display.ts` | Skin, gap, passes read as marks; `planerPasses` counts on the printed grid; UI-SPEC's Metric reference case corrected (7 mm, not 8 mm) |
| R9 | Every saved board still opens, no silent change | Development DB: 7 boards (6 v1, 1 v4 with a blank); D-07 residuals measured; migration trigger by field shape, not envelope version (Pitfall 5) |
| R10 | PCHIP stays the one sampler | No interpolation change; the ease is a weight on a difference, not a new curve |
| R11 | No new dependency, no package.json change | Nothing to install; every tool used is already in `node_modules` (tsx 4.23.12, vitest 4.1.11, Playwright 1.63.0, drizzle-kit 0.31.10) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rule 1:** every formula in `lib/geometry/`, no React/browser/database import there, every exported function unit-tested, expected values from fixtures generated by executing the source of truth — never hand-typed. (This phase's source of truth for the old numbers is Phase 11's own `boardOnBlank`, tag `v1.3`.)
- **Rule 2:** Imperial/Metric is display-only; storage is metric (`Mm`); every design-value conversion goes through `lib/geometry/units.ts` / `measure-display.ts`; marks read 1/16" or whole mm; a value alone in its box carries its unit, running text carries it once.
- **Database:** additive changes (new nullable columns) run `npm run db:migrate:prod` BEFORE the code ships; removals wait until after Vercel has deployed. Drizzle names every column on insert (Phase 11 CR-01 — re-verified this session in `node_modules/drizzle-orm/pg-core/dialect.js:365-392`: an absent value becomes `sql\`default\`` for every column in the table).
- **Layout switches:** width picks layout (`max-shell`/`shell` at 820), pointer picks size (`coarse:`), height picks scrolling (inline `[@media(max-height:500px)]`); never conflated.
- **Commands:** `npm test`, `npm run lint`, `npm run build` (from the main checkout — Turbopack won't resolve `next` in a worktree), `npm run test:e2e` (own server on 3100), `npm run test:e2e:phone`, `npm run test:e2e:prod`.
- **AGENTS.md:** Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code (this phase touches no routing or server-component API beyond the existing Server Action and layout read).
- **Audience:** shapers, not developers — every commit message and summary explains what changes on the board or the screen.
- **.claude/CLAUDE.md:** GSD workflow; tech stack prescribed, not substituted.

## Summary

The new foil is simpler than the one it replaces, and it can be written in Phase 11's own coordinates with almost no new machinery. Everything is measured from the board's tail tip, `u(s)` places a board station on the blank, and the crop re-level (`levelCurve` over the stretch under the board) already gives the blank's bottom under the board with its low point at zero. With **gap = blank thickness under the board's centre − skin − target**, the board's un-thinned thickness is `blankT(s) − skin − gap = blankT(s) − (blankT(centre) − target)` — the skin cancels out of the thickness entirely. That has three useful consequences, all measured: (1) the board's rocker, levelled on the un-thinned bottom, is the Phase 11 rocker exactly (max difference 2.8e-14 mm over 2,886 blank × centre × placement cases), so R3's "the four rocker numbers are the blank's own" is free; (2) litres depend on neither the skin nor the Tip Style, only on the thickness, so preset and rack cards never read an account setting; (3) the four presets keep their exact provisional blanks under Pin deck, so `preset-blanks.generated.json` does not change.

The tip thinning reuses Phase 11's `smoothstep` over `TIP_EASE_WINDOW_MM` unchanged, applied to a single signed amount (the un-thinned tip thickness minus the tip setting) and routed to the bottom (Pin deck) or the deck (Bottom). The weight's derivative is zero at the 12" station, so there is no kink; numerically the slope jump at the station is ≤ 2.9e-6, the same noise the blank's own pchip curve shows at the same step. Two findings change what the founder should expect: in 9–31% of combinations (depending on the sweep) the tip setting is *thicker* than the parallel foil, so under Pin deck the tip rocker **falls** rather than grows (the Shortboard preset's tail tip rocker goes from 2 3/8" to 2 1/16"), and under Bottom the deck would have to rise above the blank's deck — which is why the Shortboard's blank no longer fits under Bottom.

D-07 is the hard part. The residual a v4 board's fine-tunes must absorb is `(1 − target/Tc) × (Tc − T12)` — median 0.16–0.21", p95 0.37–0.60", max 1.07" (27 mm, inside the ±50 mm snapshot bound, but 21–39% beyond the slider's ±1/4"). The single v4 board with a blank in the development database needs +1/8" at both 12" stations. More important: with the default 1/8" skin, a positive residual on the deck pushes the deck above the blank's deck, so **65% of migrated boards would open flagged "doesn't fit"** (including the one dev board). Raising that board's skin just enough to clear the blank's deck, and opening it in Bottom style (which is how Phase 11 actually cut every board — bottom on the blank's bottom, all foam off the deck), reproduces all ten numbers (five thicknesses, five rockers) exactly and keeps 100% of the sweep fitting. That amends D-07's "applies the default skin" and the UI contract's "Tip Style at the account default", so it is Open Question 2.

**Primary recommendation:** Build it as one derivation inside `boardOnBlank` (skin, gap, signed thinning on the Tip Style's surface, fine-tune on the deck, level on the un-thinned bottom), keep Phase 11's proportional formula alive only as a migration function pinned by a golden fixture generated from tag `v1.3` in Wave 0, detect version-4 blanks by their missing `tipStyle`, and ask the founder Open Questions 1–2 before the plan is locked.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deck/bottom/thickness/tip derivation, fit check, floors, passes count | Pure geometry (`lib/geometry/`, runs in browser and server) | — | Rule 1; the same code feeds the store, the rack card (server) and tests |
| v4 → v5 carry-over (D-07) | Models boundary (`lib/models/design-snapshot.ts`, server + client) | Geometry (the residual function) | The snapshot parser is the one place saved data is read; it may call geometry but holds no formula |
| Per-board skin and Tip Style | Browser store (`design-store.tsx`, on `BoardBlank`) | Snapshot (persisted) | Board state; undo/autosave already carry `blank` |
| Account defaults (skin, Planer Max Depth, Tip Style) | API/Backend (Server Action + `user_preferences`) | Browser (cookie + localStorage) | The existing D-09 pattern: cookie for first paint, account wins per field when signed in |
| Blank list judging | Browser (`use-blank-list.ts`, memoised) | — | Phase 11 R14: no network on a drag |
| Readouts, DATASHEET, drawing | Browser components | — | Read the side profile only |
| Column add / retire | Database (Neon, Drizzle migration) | — | Expand-first; drop only after deploy |

## Standard Stack

Nothing new. Every tool is already installed and pinned [VERIFIED: `node_modules/*/package.json` read this session].

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript geometry in `lib/geometry/` | — | the derivation | Rule 1 |
| zod | 4.4.3 | snapshot v5 schema, bounds | already the snapshot boundary |
| drizzle-orm / drizzle-kit | 0.45.2 / 0.31.10 | three nullable columns, migration 0006 | already the ORM |
| vitest | 4.1.11 | unit tests (node env, `lib/**/*.test.ts`, `components/**/*.test.ts`) | project standard |
| @playwright/test | 1.63.0 (chromium-1243, webkit-2359 installed) | e2e | project standard |
| tsx | 4.23.12 (in node_modules, run with `npx --no-install tsx`) | Wave 0 golden script | Phase 11 precedent (D-20) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Phase 11's `smoothstep` (C1) | smootherstep `6t⁵−15t⁴+10t³` (C2) | C2 also removes the curvature jump at 12", but changes the drawn tips and every tip-window number; C1 already satisfies D-05's "no kink" (first derivative continuous). Keep smoothstep. |
| A new `user_fit_defaults` table (CR-01's other fix) | three columns on `user_preferences` | The project already chose "additive columns migrate production first" (CLAUDE.md, amended 2026-09-26); a new table would be a second pattern. |

**Installation:** none.

## Package Legitimacy Audit

No package is installed, upgraded or removed by this phase (R11 / D-20). **Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.

## How every number in this report was produced

All scripts live in the session scratchpad `/private/tmp/claude-501/-Users-kontoes-Code-shaper/0c4d8911-d078-4e92-9fbc-b9daa79b2260/scratchpad/` with absolute imports of the repository's own modules, run from the repo root with `npx --no-install tsx --tsconfig ./tsconfig.json <script>`. The catalogue is always `readSeedCatalog()` → `isPickable` → `prepareBlank` (158 pickable of 162). "Old" numbers are the unchanged Phase 11 functions (`boardOnBlank`, `listBlanks`, `fitAt`, `presetSummary`); the code under `lib/`, `components/`, `app/`, `scripts/`, `drizzle/` and `e2e/` is byte-identical to tag `v1.3` (`git diff --stat v1.3 HEAD` over those paths is empty). "New" numbers come from `foil12.ts`, a scratch model of the recommended derivation (Pattern 1 below), and `judge12.ts`, a copy of `judgeWith`'s coarse-then-fine placement search using the new fit.

| Script | What it measures |
|--------|------------------|
| `probe1.ts` | Identities, kink, levelling, old guard, tip-lift distribution — 158 blanks × centres 2 1/4"–3" (1/8" steps, only where the new floor passes) × placements {min, 0, max}, board length = blank − 2", default tips (5/16" / 1/4"): 2,886 cases |
| `probe2.ts` | Floor and fit counts, old vs new, for the default board and the four presets × 7 centres |
| `probe3.ts` | Thin/negative foil pathologies over every new-model fitting verdict (3,446) |
| `probe4.ts`, `probe15.ts` | Preset re-pick under Pin deck and Bottom; litres; station numbers |
| `probe5db.ts`, `probe11db.ts` | READ-ONLY selects on the development branch (`.env.local` loaded with `process.loadEnvFile`, never printed) |
| `probe6.ts`, `probe7.ts`, `probe8.ts`, `probe10.ts` | D-07 residuals and the four carry-over options |
| `probe9.ts` | The default board's first six list rows, old vs new |
| `probe12.ts` | `planerPasses` cases in both systems |
| `probe13.ts`, `probe16.ts` | Very thin centres; centre gap vs one pass at off-centre placements |
| `probe14.ts` | Judging time |

Baseline unit suite this session: `npx vitest run` → 73 files, 2,865 passed, 2 skipped, 9.63 s.

## Architecture Patterns

### System Architecture Diagram

```
 gear menu dialog ──► FitDefaultsProvider (cookie + account, per-field handoff)
      │                  │ extraLength · planerMaxDepth · widthMargin · deckSkin · noseTip · tailTip · tipStyle
      │                  ▼
 ROCKER sidebar ──► design-store ── state.blank {copy, placement, fine-tunes, deckSkin, tipStyle}
 (Deck Skin slider,     │   (first pick bakes the live deckSkin + tipStyle; switching blanks keeps them)
  Tip Style pills)      ▼
                 prepareBlank(copy)  ──►  boardOnBlank(prepared, board, placement)
                                             │ 1 crop re-level of the blank's bottom under the board (R11)
                                             │ 2 gap = blankT(centre) − skin − target
                                             │ 3 un-thinned thickness = blankT(s) − skin − gap
                                             │ 4 signed thinning T·smoothstep in each last 12"
                                             │      Pin deck → bottom rises   Bottom → deck drops
                                             │ 5 fine-tune hump on the DECK (Open Question 1)
                                             │ 6 rocker = bottom levelled on the UN-thinned bottom
                                             ▼
                               buildBlankProfile → BoardSideProfile
                                ├─ rockerAt / thicknessAt / deckAt (= rocker + thickness, R10)
                                ├─ blank view: bottomAt (= crop − gap), deckAt, foamOffDeck, foamOffBottom, centerGap
                                ▼
       readouts · passes line · DATASHEET · drawing · RAILS (effectiveFoil) · VOLUME/rack/summary (thicknessAt)

 blank list: use-blank-list ─► listBlanks(prepared[], ctx{board incl. skin + tipStyle}, {extraLength, planerMaxDepth, widthMargin})
                                ├─ floor: length ≥ L + Extra Length;  printed C ≥ target + skin + Planer Max Depth
                                └─ judge: fitAt at placements (deckOff ≥ 0, bottomOff ≥ 0, width margin)

 saved row / rack ─► parseSnapshot ─► blank without tipStyle? ─► carryPhase11Blank(...) (geometry) ─► v5 fields
```

### Recommended Project Structure (files touched)

```
lib/geometry/
├── blank.ts            # TipStyle type; BoardBlank gains deckSkin + tipStyle; FitSettings: extraCenterThickness → planerMaxDepth
├── blank-fit.ts        # boardOnBlank derivation replaced; fitAt reads deck/bottom foam; floorCheck uses skin + pass; ratio retires
├── board-profile.ts    # BlankSideView: bottomAt = crop − gap; foamOff → foamOffDeck + foamOffBottom; centerGap; deckSkin
├── phase11-foil.ts     # NEW: Phase 11's proportional 12" thickness kept ONLY for D-07 (like bezierToFiveStations)
├── blank-reasons.ts    # listIntro / floorShortfallMessage / emptyListMessage quote skin + one pass
├── measure-display.ts  # planerPasses, formatPasses
└── __fixtures__/phase11-foil-golden.json   # NEW, generated in Wave 0 from tag v1.3
lib/models/design-snapshot.ts               # version 5; blank.deckSkin + blank.tipStyle; carry-over on read
lib/fit-defaults-preference.ts, lib/db/schema.ts, lib/db/queries.ts, drizzle/0006_*.sql
lib/blanks/preset-blanks.ts                 # presetFitContext/presetBlank carry skin + tip style
scripts/extract-phase11-foil-golden.ts      # NEW (Wave 0), run once against v1.3 code
components/…                                # store, rocker sidebar/readouts/datasheet/flag/list hook, dialog, toggle
```

### Pattern 1: the derivation, in `boardOnBlank`'s own terms (Question 1)

What exists today [VERIFIED: `lib/geometry/blank-fit.ts:239-266`, read this session]:

```ts
  const underCentre = blankThicknessAt(L / 2);
  const ratio = underCentre > 0 ? board.centerThickness / underCentre : 0;
  const scaledTail = ratio * blankThicknessAt(0);
  const scaledNose = ratio * blankThicknessAt(L);
  const W = TIP_EASE_WINDOW_MM;
```
…and `rockerAt: (s) => crop.sample(u(s))` (`:286`), `thicknessAt: (s) => guard(s, derivedThicknessAt(s) + offsetAt(s))` (`:291`).

Replace the thickness block (everything from `underCentre` to the end of `derivedThicknessAt`, and the `guard`) with the following; keep `u`, `onFoam`, `crop`, `blankThicknessAt`, `blankWidthAt`, the two fine-tune humps and `offsetAt` exactly as they are. `TIP_EASE_WINDOW_MM` and `smoothstep` survive unchanged. Values used below, quoted [VERIFIED: `lib/geometry/blank-fit.ts:36-37`, `:190-194`]:

```ts
export const TIP_EASE_WINDOW_MM = MEASURE_STATION_MM;
function smoothstep(w: number): number {
  const t = Math.min(1, Math.max(0, w));
  return t * t * (3 - 2 * t);
}
```

The recommended body (a sketch — the names are proposals; `deckSkin` and `tipStyle` are new `BoardOnBlankInput` fields):

```ts
  const blankBottomAt = (s: number) => crop.sample(u(s));          // levelled blank bottom under the board
  const underCentre = blankThicknessAt(L / 2);
  const centerGap = underCentre - board.deckSkin - board.centerThickness;   // D-03: foam off the bottom at the centre
  const drop = underCentre - board.centerThickness;                // skin + gap — the skin cancels out of thickness
  const unthinned = (s: number) => blankThicknessAt(s) - drop;     // = blankT − skin − gap (R3)
  const tailUn = unthinned(0), noseUn = unthinned(L);
  /** Signed tip thinning (D-05): 0 at and inside the 12" stations, (unthinned − setting) at the tip. */
  const thinAt = (s: number) => {
    let t = 0;
    if (s < W) t += (tailUn - board.tailTip) * smoothstep(1 - s / W);
    if (s > L - W) t += (noseUn - board.noseTip) * smoothstep(1 - (L - s) / W);
    return t;
  };
  // Written as unthinned − un_tip·w + setting·w (Phase 11's cancellation), so a tip reads its setting to the last bit.
  const derivedThicknessAt = (s: number) => unthinned(s) - thinAt(s);
  const thicknessAt = (s: number) => derivedThicknessAt(s) + offsetAt(s);      // fine-tune on the deck
  // Rocker levelled on the UN-thinned bottom (R5): the gap cancels, so away from the tips it is Phase 11's rocker.
  const rockerAt = (s: number) => blankBottomAt(s) + (board.tipStyle === "pinDeck" ? thinAt(s) : 0);
  const deckOffAt = (s: number) => board.deckSkin + (board.tipStyle === "bottom" ? thinAt(s) : 0) - offsetAt(s);
  const bottomOffAt = (s: number) => centerGap + (board.tipStyle === "pinDeck" ? thinAt(s) : 0);
```

Why this is right, each measured on 2,886 cases (`probe1.ts`):
- **Deck parallel (R1):** board deck = blank deck − skin exactly, wherever there is no fine-tune and (under Bottom) outside the tip windows — by construction `deckOffAt = deckSkin`.
- **Bottom parallel, rocker the blank's own (R3):** the un-thinned bottom is the blank's bottom + gap, a constant shift, so levelled it IS `crop.sample(u(s))` — Phase 11's `rockerAt`. Under Bottom the whole rocker matches Phase 11 to **2.8e-14 mm**. Under Pin deck only the last 12" at each end differ (the lift). The crop's low point never falls inside a tip window (**0 of 2,886**), so levelling on the un-thinned bottom and levelling the final bottom agree; levelling on the un-thinned bottom makes R5 hold by construction rather than by luck.
- **Thickness at the 12" stations (R3):** `thickness(12") − (blankT − skin − gap)` ≤ **4.3e-14 mm**.
- **Readouts under Pin deck (D-06):** the ROCKER column's two tip rows = blank rocker + lift; the 12" and centre rows unchanged. The OFF BOTTOM column = `bottomOffAt` (gap everywhere, gap + lift at the tips). Under Bottom the rocker column is the blank's own and the DATASHEET Deck row carries the tip thinning.

What survives, changes and retires:

| Item | Fate |
|------|------|
| `prepareBlank`, `levelCurve`, `blankStationOf`, `placementRange`, `clampPlacement`, `FIT_SAMPLE_STEP_MM`, `FIT_EPSILON_MM`, `BLANK_PLACEMENT_BUFFER_MM`, `TIP_EASE_WINDOW_MM`, `smoothstep`, the fine-tune humps, `judgeBlank`/`judgeWith` search, `nearestFit`, `nearestFittingPlacement`, `catalogueExtremes`, `listBlanks` structure | survive unchanged |
| `BoardOnBlankInput` | gains `deckSkin: Mm`, `tipStyle: TipStyle` |
| `BoardOnBlank` | `ratio` retires; gains `centerGap`, `blankBottomAt`, `deckOffAt`, `bottomOffAt`; `derivedThicknessAt` keeps its name and meaning ("before fine-tune") |
| the tip-window never-below `guard` | **retires** — it adjusts thickness without saying which surface. Measured: it would bind in 36 of 2,886 cases by at most 0.138 mm, below one printed step in either system |
| `fitAt` | thin amount becomes `max(−deckOffAt, −bottomOffAt)` (kind stays `"thin"`); takes `planerMaxDepth` too if Open Question 4 is answered yes |
| `floorCheck` | `centerShort = target + deckSkin + planerMaxDepth − printed C` |
| `BlankSideView.bottomAt` | `crop.sample(u(s)) − centerGap` (the blank now sits BELOW the board by the gap; `rocker-view-frame.ts` already reserves room when `lowestBottomIn < 0`, `:104-116`, `:579-631`) |
| `BlankSideView.foamOff` | splits into `foamOffDeck` and `foamOffBottom` (Records by station) plus `centerGap` |
| tests pinned to the ratio / scaled foil / guard | rewritten (Validation Architecture) |

### Pattern 2: the ease and its no-kink proof (Question 2)

Reuse Phase 11's `smoothstep` over `TIP_EASE_WINDOW_MM` (12"), applied to the signed amount `T = unthinned(tip) − tipSetting`. With `S(t) = 3t² − 2t³`, `S′(t) = 6t − 6t²`, so `S′(0) = 0`: at the 12" station the thinning's slope is `T · S′(0) · (−1/W) = 0`, the same as its slope just inside (zero). The thickness's slope therefore equals the un-thinned curve's slope from both sides, and the un-thinned curve is pchip (C1). `S′(1) = 0` too, so the thinning also arrives flat at the tip. Curvature does jump by `6T/W²` at the station (C1, not C2), which D-05 does not ask for.

Measured (`probe1.ts`, one-sided differences with h = 1e-3 mm at both 12" stations): largest slope jump **2.5e-6** in thickness, **2.1e-6** in the Pin deck bottom, **2.9e-6** in the Bottom-style deck — and **2.6e-6** in the blank's own pchip thickness curve at the same points, which has no kink by construction. The jumps are finite-difference noise.

Pin deck applies the same `thinAt(s)` to the bottom (rocker rises by it), Bottom to the deck (deck drops by it). The thickness is identical either way, so Tip Style never moves the litres.

### Pattern 3: fine-tunes on the deck (R6 — Open Question 1)

Keep Phase 11's pchip hump (0 at the tip, the offset at the 12" station, 0 at the centre) and add it to the **deck**. Measured on the 3,256 Phase-11-fitting boards migrated with their residual (`probe7.ts`): putting the same hump on the bottom lowers the bottom between the 12" station and the centre, and the rocker then dips **below zero near the centre in 3,256 of 3,256** cases (worst −0.653"), which would force a re-level that moves every station. On the deck, the rocker never moves and "a fine-tune moves its 12" station by the typed amount and nothing else" holds literally. The price: a positive tweak larger than the skin lifts the deck above the blank's deck, which the fit check correctly reports as "too thin" there.

### Pattern 4: the centre floor and the catalogue (Question 3)

Floor constants today [VERIFIED: `lib/geometry/blank.ts:67-74`]: `extraLength`, `extraCenterThickness`, `widthMargin`; defaults [VERIFIED: `lib/fit-defaults-preference.ts:56-62`] `extraLength: inchesToMm(2)`, `extraCenterThickness: inchesToMm(0.375)`, `widthMargin: inchesToMm(1)`. Old floor: printed C ≥ target + 3/8". New (D-10, defaults): printed C ≥ target + 1/8" + 1/8" = target + 1/4".

Blanks passing the floor (length and centre) → fitting (placement search) → greyed, old vs new, Pin deck, default skin (`probe2.ts`):

| Board | 2 1/4" | 2 1/2" | 2 3/4" | 3" |
|-------|--------|--------|--------|----|
| Default 6'0" | floor 141→143, fits 140→142 | 136→141, 135→140 | 117→127, 116→126 | 81→103, 81→103 |
| Shortboard 6'2" | 136→137, 136→137 | 131→136, 131→136 | 114→124, 114→124 | 81→103, 81→103 |
| Fish 5'8" | 150→153, 136→136 (greyed 14→17) | 142→150, 134→136 (8→14) | 119→130, 116→125 | 81→104, 81→103 |
| Midlength 7'2" | 88→88, 78→78 | 88→88, 78→78 | 85→88, 77→78 | 68→80, 62→73 |
| Longboard 9'0" | 46→46, 34→34 | 46→46, 34→34 | 46→46, 34→34 | 44→45, 32→33 |

(The 2 3/8", 2 5/8" and 2 7/8" columns are in `probe2.ts`'s output and follow the same pattern.) The list only grows; greyed rows are width failures as before.

**Preset re-pick (D-08), `probe4.ts`:** by the same rule (closest length among fits, ties to less spare centre foam) with the default skin and **Pin deck**, all four picks are unchanged — Marko Foam 6'4" TP, Arctic Foam 5'10" MF, Marko Foam 7'5" Machine All, US Blanks 9'3"Y, each at placement 0 [VERIFIED: current picks, `lib/blanks/preset-blanks.generated.json:3-27`]. So the generated JSON regenerates byte-identical. Under **Bottom**, the Shortboard's blank fails at its tail tip by 3/16" (the deck would have to rise above the blank's deck, `probe15.ts`) and the rule would pick US Blanks 6'3"EA instead — see Open Question 3.

Litres each preset card would show (`presetSummary` today vs the same pipeline on the new thickness, `probe4.ts`):

| Preset (centre, nose/tail tip) | Today | New | Station thickness today → new (tail tip · 12" · centre · 12" · nose tip) | Rocker today → new under Pin deck |
|------|------|-----|------|------|
| Shortboard (2 1/4", 7/16" / 15/16") | 30.90 L | 30.18 L | 15/16 · 1 3/4 · 2 1/4 · 1 7/8 · 7/16 → 15/16 · 1 9/16 · 2 1/4 · 1 3/4 · 7/16 | 2 3/8 · 7/8 · 0 · 1 3/8 · 5 → 2 1/16 · 7/8 · 0 · 1 3/8 · 5 1/8 |
| Fish (2 1/2", 11/16" / 3/4") | 35.93 L | 35.37 L | 3/4 · 2 1/16 · 2 1/2 · 1 15/16 · 11/16 → 3/4 · 2 · 2 1/2 · 1 13/16 · 11/16 | 1 7/8 · 13/16 · 0 · 15/16 · 3 → 2 5/16 · 13/16 · 0 · 15/16 · 3 5/16 |
| Midlength (2 3/4", 5/8" / 3/4") | 52.76 L | 51.45 L | 3/4 · 2 1/8 · 2 3/4 · 2 1/8 · 5/8 → 3/4 · 1 15/16 · 2 3/4 · 1 15/16 · 5/8 | 2 5/8 · 1 3/16 · 0 · 1 1/2 · 4 1/4 → 2 7/8 · 1 3/16 · 0 · 1 1/2 · 4 3/4 |
| Longboard (3", 7/8" / 7/8") | 76.87 L | 75.30 L | 7/8 · 2 1/8 · 3 · 2 1/8 · 7/8 → 7/8 · 1 15/16 · 3 · 1 15/16 · 7/8 | 3 1/16 · 1 11/16 · 0 · 2 1/8 · 4 → 3 5/16 · 1 11/16 · 0 · 2 1/8 · 4 3/16 |

Preset values quoted [VERIFIED: `lib/geometry/presets.ts:175-177` `noseTip: inchesToMm(0.4375)`, `center: inchesToMm(2.25)`, `tailTip: inchesToMm(0.9375)`; `:274-276` `0.6875`, `2.5`, `0.75`; `:372-374` `0.625`, `2.75`, `0.75`; `:469-471` `0.875`, `3`, `0.875`]. The Shortboard's tail tip rocker FALLS under Pin deck (Pitfall 3). Centre gaps at the preset picks: 5/8", 5/16", 5/8", 3/8".

### Pattern 5: snapshot version 5 and the carry-over (Questions 4 and 5)

Today [VERIFIED: `lib/models/design-snapshot.ts:80`, `:159-161`, `:175-180`]:
```ts
export const DESIGN_SNAPSHOT_VERSION = 4;
const BLANK_PLACEMENT_MAX_MM = 4000;
const BLANK_OFFSET_MAX_MM = 50;
export const boardBlankSchema = z.object({
  copy: blankRecordSchema,
  placement: z.number().min(-BLANK_PLACEMENT_MAX_MM).max(BLANK_PLACEMENT_MAX_MM),
  nose12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
  tail12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
});
```

Version 5 (recommended):
- `DESIGN_SNAPSHOT_VERSION = 5`; the skin and Tip Style live on the **blank** (`BoardBlank.deckSkin: Mm`, `BoardBlank.tipStyle: TipStyle`), not top-level — they mean nothing without a blank (D-12), "Remove This Blank" takes them away and one undo brings them back with the blank (UI contract §11), and `historySnapshot`/`designSnapshotFields`/`applyModel` already carry `blank` whole (no new hand-written list entry — Phase 11 Pitfall 7).
- zod: `deckSkin: z.number().min(0).max(BLANK_OFFSET_MAX_MM).optional()`, `tipStyle: z.enum(["pinDeck", "bottom"]).optional()`; `.refine` both-present-or-both-absent (one without the other is a malformed present value → reject, the rule-4 posture). The 50 mm cap covers the largest carried-over skin measured (1.753" = 44.5 mm under Open Question 2's option).
- **Trigger the carry-over by shape, not by the envelope number:** a blank with no `tipStyle` is a Phase 11 blank. `app/design/actions.ts:47` re-parses every save as `parseSnapshot(buildSnapshot(snapshot))`, which stamps the CURRENT version — a tab opened before the deploy that autosaves a v4-shaped blank would otherwise be stored as v5 with no carry-over, silently moving its 12" numbers (Pitfall 5).
- The residual is geometry: `lib/geometry/phase11-foil.ts` exports the Phase 11 12" thickness and a `carryPhase11Blank(prepared, board, placement, savedOffsets, defaults)` returning `{ deckSkin, tipStyle, nose12Offset, tail12Offset }`; `parseSnapshot` calls it (it already calls `bezierToFiveStations` the same way). Closed form of Phase 11's final 12" thickness, read off the code [VERIFIED: `blank-fit.ts:246-251` guard at `s <= W` / `s >= L - W`; ease only for `s < W` / `s > L - W`]: `phase11_12 = max(ratio · blankT(12") + savedOffset, tipSetting)`, `ratio = target ÷ blankT(centre)`. New offset = `phase11_12 − newDerived12`. Clamp to ±`BLANK_OFFSET_MAX_MM` so the result re-parses (Pitfall 6).
- Tests: every version 1–4 fixture still opens; every version-4 fixture with a blank reopens with its five station thicknesses equal to the golden (and all five rockers too if Open Question 2 is answered as recommended); the carried-over v5 fields re-parse through the v5 schema; a v5 round trip is deep-equal. The existing test "version 4 with a real catalogue blank round-trips deep-equal" (`design-snapshot.test.ts:264`) becomes "reopens with its Phase 11 numbers".

**D-07 residual, measured (Question 4):**
- **Development database** (read-only select of `models.snapshot`, `probe5db.ts`): **7 saved boards — 6 at version 1, 1 at version 4 with a blank**: US Blanks 6'8"RP, 78" board, 2 1/2" centre, tips 5/16" / 1/4", placement 7.94 mm, no saved tweak. Residual **+2.947 mm (1/8") at tail 12", +3.346 mm (1/8") at nose 12"** — inside ±1/4". Production was not read (not reachable, and out of bounds for research); v1.3 shipped today, so any production v4-with-blank board is at most a day old.
- **Sweep** (`probe6.ts`): default board + four presets × 7 centres × every Phase-11-fitting blank × {listed placement, range min, range max}, kept where Phase 11 said it fits: **7,913 cases; |residual| median 0.211", p95 0.603", max 1.068" (27.1 mm, Longboard 2 1/4" on US Blanks 10'0"T); 3,125 (39%) beyond ±1/4"; 0 beyond ±50 mm.** Restricted to the list's first six rows at their listed placement (what a shaper most likely picked): 210 cases, median 0.159", p95 0.368", max 0.813", **45 (21%) beyond ±1/4"**.
- The closed form explains the size: residual = (1 − target/Tc)(Tc − T12). Blanks much thicker than the target carry big residuals; nothing in Phase 11 capped the spare foam.

**The carry-over options** (3,256 cases = every Phase-11-fitting blank at its listed placement; the dev board separately; `probe8.ts`, `probe10.ts`). Five-thickness error ≤ 5.7e-14 mm in every option.

| Option | Skin | Tip Style | Rocker vs Phase 11 | Still fits (sweep) | Dev board fits |
|--------|------|-----------|--------------------|--------------------|----------------|
| A-pin (D-07 literally, account default Pin deck) | 1/8" | Pin deck | tips move, up to 2.60" | 1,126 (35%) | no |
| A-bot | 1/8" | Bottom | exact (5.6e-16") | 1,124 (35%) | no |
| B-bot | max(1/8", both residuals) | Bottom | exact | 3,095 (95%) | yes |
| **B′-bot (recommended)** | 1/8" + the smallest raise that keeps the deck at or under the blank's deck everywhere | Bottom | **exact** | **3,256 (100%)**, all pass the new floor | yes |

B′ raises the skin on 2,130 of 3,256 (65%); skin median 0.158", p95 0.416", max 1.753"; 91 (2.8%) above the Deck Skin slider's 1/2" (UI contract §10's out-of-range rule then applies to the skin row too). Why Bottom: Phase 11 kept the board's bottom ON the blank's bottom and took every bit of thinning off the deck, which is Bottom style. Why a raised skin: under the new model the bottom is planed by the gap, so a Phase 11 12" station thicker than the new derivation can only be kept by leaving that much more on the deck.

**Fine-tune range (the UI contract's open item):** keep `FINE_TUNE_RANGE_IN` at ±1/4" [VERIFIED: `components/rocker/rocker-controls.tsx:62` `const FINE_TUNE_RANGE_IN = { min: -0.25, max: 0.25 } as const;`] — R6 says "slightly", and a wider slider coarsens every normal tweak. The ±50 mm snapshot bound holds every measured residual (max 27.1 mm), so no schema widening. Out-of-range carried tweaks use UI contract §10 (label and hint read the true value, thumb pinned, a drag replaces it, undo restores).

### Pattern 6: settings (Question 6)

Today [VERIFIED: `lib/fit-defaults-preference.ts:29-34`]: `FitDefaultsKey = "extraLength" | "extraCenterThickness" | "widthMargin" | "noseTipThickness" | "tailTipThickness"`, all `Mm | null`; columns [VERIFIED: `:170-176`] `extraLengthMm`, `extraCenterThicknessMm`, `widthMarginMm`, `noseTipThicknessMm`, `tailTipThicknessMm`; table [VERIFIED: `lib/db/schema.ts:76-87`] columns `extra_length_mm`, `extra_center_thickness_mm`, `width_margin_mm`, `nose_tip_thickness_mm`, `tail_tip_thickness_mm` (all `doublePrecision`, nullable).

Recommended shape:
```ts
export type FitDefaultsMmKey = "extraLength" | "planerMaxDepth" | "widthMargin" | "deckSkin" | "noseTipThickness" | "tailTipThickness";
export type FitDefaultsKey = FitDefaultsMmKey | "tipStyle";
export type FitDefaultsPreference = Record<FitDefaultsMmKey, Mm | null> & { tipStyle: TipStyle | null };
// FIT_DEFAULTS_KEYS in the dialog's order: extraLength, planerMaxDepth, widthMargin, deckSkin, noseTipThickness, tailTipThickness, tipStyle
// DEFAULT_FIT_DEFAULTS adds planerMaxDepth: inchesToMm(0.125), deckSkin: inchesToMm(0.125), tipStyle: "pinDeck"
// FIT_DEFAULTS_RANGE_IN (Record<FitDefaultsMmKey, …>) adds planerMaxDepth {min: 0.0625, max: 0.25, step: 0.0625}, deckSkin {min: 0.0625, max: 0.5, step: 0.0625}
// FIT_DEFAULTS_COLUMNS adds planerMaxDepth: "planerMaxDepthMm", deckSkin: "deckSkinMm", tipStyle: "tipStyle"
```
(Ranges are the UI contract §1/§6; Metric rounds inward to 2–12 mm and 2–6 mm through `metricSliderRange`.) `parseFitDefaultValue` stays the millimetre allow-list; add `parseTipStyleValue(v): TipStyle | null` (exactly `"pinDeck"` or `"bottom"`, anything else null); `parseFitDefaultsPreference`, `parseFitDefaultsPatch`, `mergeFitDefaultsPatch`, `fitDefaultsUpdateSet`, `fitDefaultsInsertColumns`, `resolveFitDefaults` and `decideFitDefaultsHandoff` loop over the seven keys and dispatch the parse by key. `decidePreferenceHandoff<T>` is already generic. `toFitSettings` returns `{ extraLength, planerMaxDepth, widthMargin }`. Put `TipStyle` in `lib/geometry/blank.ts` (types only) so this module still does not import blank-fit code.

Cookie and account handoff: an old cookie holding `extraCenterThickness` simply stops being read (the parse ignores unknown keys, `:112-122`); a patch naming it is rejected whole (`:139-157`), which only a pre-deploy tab could send.

Drizzle: add `planerMaxDepthMm: doublePrecision("planer_max_depth_mm")`, `deckSkinMm: doublePrecision("deck_skin_mm")`, `tipStyle: text("tip_style")`, nullable, no default. `npm run db:generate` writes `drizzle/0006_*.sql` with three `ALTER TABLE "user_preferences" ADD COLUMN …` lines (the 0005 shape). Apply to development during the work; **`npm run db:migrate:prod` before the merge/deploy** (CLAUDE.md, CR-01). `readFitDefaultsPreference` selects the new three and stops selecting `extraCenterThicknessMm`.

`extra_center_thickness_mm`: **keep the column declared in `schema.ts` this phase, unread and unwritten.** Removing it needs a DROP migration that must run only after the deploy, but `db:migrate:prod` applies every pending migration, so a DROP generated in this phase would run in the same pre-deploy command as the additions — while the deployed Phase 11 code still names that column on every insert (CR-01), breaking every preference save until the deploy lands. Remove it later in its own quick task: drop it from `schema.ts`, push, let Vercel deploy, then generate and run the DROP. (Development: 1 preference row, `extra_center_thickness_mm` set on 0 — `probe11db.ts`.)

### Pattern 7: fit check and reasons (Question 7)

Where the floor lives today: `FitSettings` [`blank.ts:67-74`], `floorCheck` [`blank-fit.ts:399-410`, quoted: `const centerShort = centerThickness + settings.extraCenterThickness - prepared.centerThicknessMm;`], `use-blank-list.ts:110-114` (`const { extraLength, extraCenterThickness, widthMargin } = settings;`), `blank-flag.tsx:133`, `:151-156`, `:176-184` (F4 passes `extraCenterThickness` to `floorShortfallMessage`), `:199`, and `blank-reasons.ts:152-163`, `:169-204`, `:207-216`.

Smallest change: `FitSettings` swaps `extraCenterThickness` for `planerMaxDepth`; `BoardOnBlankInput` (and so `BoardFitContext.board`) carries `deckSkin` and `tipStyle`; `floorCheck` reads `ctx.board.deckSkin + settings.planerMaxDepth`; the list hook feeds `deckSkin`/`tipStyle` from the board's blank, or the live account defaults when there is no blank (UI contract §11), and adds both to the `ctx` memo's dependencies. Extra Length floor and the width margin are untouched. `blank-reasons.ts`: `listIntro(settings, deckSkin, system)`, `floorShortfallMessage("center", shortBy, { deckSkin, planerMaxDepth }, system)`, `emptyListMessage(kind, { …, settings: { extraLength, planerMaxDepth }, deckSkin }, system)` produce the UI contract's copy. `formatShortfall`'s grammar is unchanged; "too thin" now covers a deck above the blank's deck as well as a bottom below the blank's bottom. Judging time: 33 ms for the whole catalogue on the default board vs 19 ms today (`probe14.ts`), inside the existing 250 ms test.

### Pattern 8: passes (Question 8)

```ts
/** Whole grid steps a value prints as — 1/16" or 1 mm — with the formatters' signed 1e-9 nudge. */
function printedSteps(value: Mm, system: UnitsSystem): number {
  const x = system === "metric" ? value : mmToInches(value) * 16;
  return Math.round(x + (x < 0 ? -1e-9 : 1e-9));
}
export function planerPasses(depth: Mm, passDepth: Mm, system: UnitsSystem): number {
  const d = printedSteps(depth, system), p = printedSteps(passDepth, system);
  return d <= 0 || p <= 0 ? 0 : Math.ceil(d / p - 1e-9);
}
export function formatPasses(n: number): string { return n === 1 ? "1 pass" : `${n} passes`; }
```
(Consistent with `formatInchesFraction`'s 1/16 rounding and `formatWholeMm`'s `Math.round(value + nudge)`, `lib/geometry/units.ts:99-103`, `:269-296`.) Measured cases at a 1/8" pass (`probe12.ts`) — the test inputs are built with `inchesToMm`, the expected counts are what the printed values divide to:

| Depth | Imperial | Metric |
|-------|----------|--------|
| Marko 6'0" M-Regular at 2 1/2" (0.2950" = 7.493 mm) | 5/16" ÷ 1/8" → 3 passes | 7 mm ÷ 3 mm → 3 passes |
| 1/8" | 1 pass | 3 ÷ 3 → 1 pass |
| 1/4" | 2 passes | 6 ÷ 3 → 2 passes |
| **3/8"** | **3 passes** | **10 ÷ 3 → 4 passes** (differs by one) |
| **1/2"** | **4 passes** | **13 ÷ 3 → 5 passes** (differs by one) |
| 3/16" | 2 passes | 5 ÷ 3 → 2 passes |
| 0.02" | prints 0" → 0 passes | prints 1 mm → 1 pass |
| 0, −1/16" | 0 passes | 0 passes |

**Correction to the UI contract's reference case:** its Metric line says "74.2 − 3.2 − 63.5 = 7.5 mm, which prints `8 mm`". The real gap is 7.493 mm and prints **`7 mm`** (still 3 passes). Rounding the intermediates caused it; tests must compute, never copy the contract's example.

### Pattern 9: litres, presets and baselines (Question 9)

- `computeVolume` is not what follows the foil; the quoted litres for a designed board is `computeCrossSectionVolume` fed `profile.thicknessAt` and `profile.effectiveFoil` (`lib/geometry/design.ts:163-199`), and the estimator's centre thickness comes from `effectiveRails` (`deriveEffectiveRails` reads `effectiveFoil`). Both read the side profile, so VOLUME, rack cards, preset cards and the summary follow the new foil with no edit.
- No unit test pins a litres number (only finite/positive and cross-consistency, `lib/geometry/design.test.ts:52-61`, `:321-344`).
- `preset-blanks.generated.json`: regenerates byte-identical (same picks, placement 0). `preset-blanks.test.ts:97-110` ("the fit context is the preset's own board") must add `deckSkin` and `tipStyle` to its expected object.
- Desktop baselines: the ROCKER shot is the default board with no blank [VERIFIED: `components/design/design-store.tsx:186` `blank: null`; `e2e/desktop-baseline.spec.ts:72-89`]. Its first six list rows are unchanged (`probe9.ts`: US Blanks 6'2"A, 6'2"AX, Arctic Foam 6'2" MF, 6'4" SBM, Marko Foam 6'4" TP, 6'4" TP Thick, before and after). The "Show all {n} blanks" count moves 136 → 141 but sits below the viewport of the current image (read this session). So only the intro wording (and its extra wrapped lines, which push the list down) moves: re-record ROCKER once. TEMPLATE, RAILS, VOLUME, FINS must stay identical (the default board's foil is hand-set).

### Anti-Patterns to Avoid
- **Re-levelling on the thinned bottom:** it lets a Tip Style tap move the zero, and so the 12" numbers (R5).
- **Fine-tunes on the bottom:** a belly between 12" and the centre; the rocker dips below zero in every migrated case.
- **A guard that clamps thickness without naming a surface:** breaks deck/bottom bookkeeping (the retired never-below guard).
- **Keeping `ratio` "just in case":** it survives only inside `phase11-foil.ts`, called only by the carry-over.
- **Deciding v4 by `version < 5`:** see Pitfall 5.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| The old numbers for D-07 tests | typed expectations | a golden generated by running tag `v1.3`'s `boardOnBlank` | Rule 1; the formula is gone from HEAD after this phase |
| Levelling | a sampled minimum | `levelCurve` / the crop's exact minimum (the un-thinned bottom's minimum is exactly the gap above it) | exact, no sampling error |
| Ease | a new curve | `smoothstep` weight on the signed difference | C1 at the station by construction, already tested |
| Printed-grid rounding | a new rounding rule | the formatters' 1e-9 nudge (`units.ts`) | the count must agree with what the screen prints |
| Settings parse | ad hoc `typeof` checks in components | `lib/fit-defaults-preference.ts` allow-list | untrusted cookie/account/action input |
| Placement search | a new search | `judgeWith` unchanged | measured correct in Phase 11 (D-07) |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `models.snapshot`: development has 7 rows (6 v1, 1 v4 with a blank — `probe5db.ts`); production unknown (v1.3 shipped 2026-09-26, so v4 blank boards are at most a day old) | **Code only** — carry over on read in `parseSnapshot`; a row is rewritten as v5 only on its next save, rename or duplicate (`app/design/actions.ts:47,106,139`) with the same numbers |
| Stored data | `user_preferences.extra_center_thickness_mm` (development: 0 of 1 rows set) | None — stop reading; column kept |
| Live service config | Neon development and production need migration 0006 (three nullable columns) | Development during the work; production BEFORE the deploy |
| OS-registered state | None — verified: no cron, launchd or pm2 in this app (Phase 11 inventory, unchanged) | None |
| Secrets/env vars | None new | None |
| Browser state | Cookie + localStorage `shaper-fit-defaults` JSON may hold `extraCenterThickness` | None — the allow-list ignores unknown keys |
| Build artifacts | `e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png` | Re-record once from the main checkout after inspecting the diff; `preset-blanks.generated.json` must NOT change |

## Common Pitfalls

### Pitfall 1: the drawing's comment and name go stale
`board-profile.ts:51-53` says the blank's bottom "IS the board's bottom"; `rocker-viewer.tsx:26-27` and the accessible name at `:703` say the same. After this phase the blank sits the gap below. Update all three (the UI contract lists two).

### Pitfall 2: the Phase 11 thickness tests encode the replaced model
`blank-fit.test.ts:308-407` (scale ratio, 12" purely blank-scaled, never below a tip, R13 sweep) and `board-profile.test.ts:142-176` (foam off = blank − board; `bottomAt` = board rocker; deck = bottom + thickness) are rewritten, not deleted: each becomes its Phase 12 analogue. The four Phase 11 named tests (`:82-234`) survive — test (d) needs its Pin deck/Bottom reading checked (a nose tip setting above the blank's nose now fails as "bottom below the blank's bottom" under Pin deck).

### Pitfall 3: negative tip thinning — the tip rocker can FALL under Pin deck
When the tip setting is thicker than the parallel foil there, the "thinning" is negative. Measured: 888 of 2,886 (`probe1.ts`, boards 2" shorter than their blank) and 319 of 3,446 list verdicts (`probe3.ts`). Lift distribution at default tips: min −1.588", median 0.325", p95 0.961", max 2.428". Under Pin deck the bottom returns toward the blank's bottom (Shortboard tail tip rocker 2 3/8" → 2 1/16"); under Bottom the deck rises and fails the fit once the amount exceeds the skin (the Shortboard's blank, by 3/16"). The tip still reads its setting in both. Warn in copy only if the founder wants it (Open Question 6).

### Pitfall 4: very thin centres make the foil run out
Thickness = blank − (blank centre − target), so a thin target in a thick blank can go to zero between stations while skin and gap stay positive (D-09 alone says it fits). Measured (`probe13.ts`, default board + presets, all fitting blanks): centre 1": 43 of 527 fits reach ≤ 0 somewhere; 1 1/2": 4; 2" and above: 0. Over realistic contexts the thinnest 12" station is 0.516" (Midlength 2 1/4" on Arctic Foam 7'9" SBF), never below 1/8". Open Question 5.

### Pitfall 5: stale clients and the version number
`saveModel` wraps whatever fields arrive in the current version (`app/design/actions.ts:47`). Detect a Phase 11 blank by its missing `tipStyle`, not by `version < 5`. Rolling back to Phase 11 code after this deploy is not safe: it would read v5 blanks as v4 (zod strips unknown keys), and a re-save would drop `tipStyle`, so the next carry-over would add the residual a second time.

### Pitfall 6: a carried-over value must re-parse
The carry-over's output goes back through the v5 schema on the next save. Clamp offsets to ±50 mm and the skin to its bound, and test that every carried fixture re-parses. (Measured max offset 27.1 mm, max B′ skin 44.5 mm; an absurd board — a 1" centre in a 5 1/2" blank — could exceed 50 mm.)

### Pitfall 7: floating-point exactness in D-07
`newDerived + (old − newDerived)` is not bit-exact. Compare with `toBeCloseTo(…, 9)` in mm and assert the PRINTED values are equal in both systems. Measured error ≤ 5.7e-14 mm.

### Pitfall 8: the list memo forgets the skin
`use-blank-list.ts`'s `ctx` memo lists `foil.center`, tips and offsets (`:94-108`); add `deckSkin` and `tipStyle`, and the settings memo (`:110-115`) swaps `extraCenterThickness` for `planerMaxDepth` — or a Deck Skin drag leaves stale verdicts. Keep placement out of both (R14).

### Pitfall 9: e2e readout assertions
`rocker-blanks.spec.ts:172-186` and `touch-drag.spec.ts:781-806` assert the Nose Tip readout row TEXT changes when the board slides. The row now reads rocker + OFF BOTTOM; both still change with placement, but re-run these on both phone projects. `/^Foam Off/` in `rocker-blanks.spec.ts:251` and `phone-rails.spec.ts:647` moves to the `FOAM OFF` group label.

### Pitfall 10: the migrated board's placement and the centre floor
The list floor reads the blank's printed C; the centre gap at the board's actual placement can be smaller. Measured (`probe16.ts`): 1 of 1,953 verdicts lands under one pass at its listed placement; at the slider's ends 178 of 3,906 are under one pass and 34 negative (the fit check already catches negative). Open Question 4.

### Pitfall 11: the dialog copy counts
The UI contract says Restore Defaults resets "all seven settings (the five numbers plus the new Tip Style default)". There are six numbers plus Tip Style.

## Code Examples

### The carry-over (Pattern 5), sketched
```ts
// lib/geometry/phase11-foil.ts — kept ONLY to carry version-4 boards across (D-07).
export function phase11TwelveInch(prepared: PreparedBlank, b: Phase11Board, placement: Mm, at: "tail12" | "nose12"): Mm {
  // Phase 11: ratio = target ÷ blank thickness under the board's centre (D-18); at the 12" station the ease
  // weight is 0 and the never-below guard applies (s <= W / s >= L - W).
  const on = legacyAxes(prepared, b.length, placement);            // u(s), onFoam, blankThicknessAt — same as today
  const under = on.blankThicknessAt(b.length / 2);
  const ratio = under > 0 ? b.centerThickness / under : 0;
  const s = at === "tail12" ? TIP_EASE_WINDOW_MM : b.length - TIP_EASE_WINDOW_MM;
  const offset = at === "tail12" ? b.tail12Offset : b.nose12Offset;
  const tip = at === "tail12" ? b.tailTip : b.noseTip;
  return mm(Math.max(ratio * on.blankThicknessAt(s) + offset, tip));
}
```
Its test pins it to `__fixtures__/phase11-foil-golden.json`, generated in Wave 0 by `scripts/extract-phase11-foil-golden.ts` running tag `v1.3`'s `boardOnBlank` (unchanged at HEAD today) over the four presets, the dev-shaped fixture (US Blanks 6'8"RP, 78", 2 1/2", placement 7.94 mm) and ~40 sweep cases including off-centre placements, saved tweaks and a centre thin enough to trip the guard. Recipe once `blank-fit.ts` has changed: `git worktree add ../shaper-v13 v1.3` and run the script there.

### The named tests' shape (R7)
```ts
it("the board's deck sits exactly the deck skin below the blank's deck at every station, on every seeded blank", () => {
  // Pin deck, no fine-tune: deckOffAt(s) === deckSkin for s in a 1/4" sweep incl. both tips; toBeCloseTo(…, 9)
});
it("the board's bottom sits exactly the centre gap above the blank's bottom at every station, so the rocker is the blank's own", () => {
  // Bottom style: bottomOffAt(s) === centerGap; rockerAt(s) equals Phase 11's rocker (the golden) at the five stations
});
it("each 12\" station's thickness is the blank's thickness there less the skin and the gap", () => {});
it("changing Tip Style or a tip thickness moves no number at or inside the 12\" stations", () => {
  // thickness, rocker, deckOff, bottomOff identical for s in [W, L-W] across {pinDeck, bottom} × two tip settings
});
it("the tip thinning joins each 12\" station with no kink", () => {
  // |slope(W+h) − slope(W−h)| ≤ the same measure on the blank's own thickness curve + 1e-5, every seeded blank
});
it("every version-4 board with a blank reopens with its five station numbers exactly as Phase 11 showed them", () => {
  // lib/models/design-snapshot.test.ts, against phase11-foil-golden.json; also re-parses through v5
});
```

## State of the Art

| Old Approach (Phase 11) | Current Approach (Phase 12) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| thickness = blankT × target ÷ blankT(centre) (D-10/D-18) | thickness = blankT − (blankT(centre) − target) | this phase | 12" stations thinner (residual median 0.16–0.21"); litres down 0.6–1.6 L on the presets |
| all foam off the deck, bottom on the blank's bottom | skin off the deck, gap off the bottom, thinning on the Tip Style's surface | this phase | new readouts: OFF BOTTOM, passes, DATASHEET Deck/Bottom |
| never-below guard in the tip windows | retired | this phase | ≤ 0.138 mm in 1.2% of cases |
| floor: printed C ≥ target + Extra Center Thickness (3/8") | printed C ≥ target + skin + Planer Max Depth (1/4" at defaults) | this phase | lists grow (e.g. default board at 3": 81 → 103) |

**Deprecated/outdated:** `BoardOnBlank.ratio`; `FitSettings.extraCenterThickness`; the Extra Center Thickness dialog row; `BlankSideView.foamOff`.

## Edge Coverage (for 12-SPEC.md's empty table)

| Edge | What happens (measured where marked) | Test |
|------|--------------------------------------|------|
| Skin goes negative somewhere (a positive tweak > skin; Bottom style with negative thinning) | deck above the blank's deck → "too thin {where}" | unit |
| Gap goes negative (blank under the board's centre thinner than target + skin) | bottom below the blank everywhere → fails; at slider ends 34 of 3,906 (`probe16.ts`) | unit |
| Blank thinner than centre + skin + one pass at its printed C | hidden by the floor; F4 if already picked | unit + e2e |
| Tip thinning larger than the station thickness allows | tip still equals its setting; inside the window the eased curve may sit ≤ 0.138 mm under the setting (guard retired) | unit |
| Tip setting thicker than the parallel foil (negative thinning) | Pin deck: tip rocker falls; Bottom: deck rises, fails beyond the skin (Shortboard by 3/16") | unit |
| A 12" station falls off the blank | blank thickness reads 0 off the foam (Phase 11 Pitfall 8, kept) → fails | unit (existing) |
| Presets whose provisional blank no longer fits | none under Pin deck; Shortboard under Bottom | `preset-blanks.test.ts` |
| Derived foil runs out at very thin centres | ≤ 0 somewhere for 43 of 527 fits at 1", 4 at 1 1/2", 0 at 2"+ | unit (Open Question 5) |
| Carried-over tweak beyond ±1/4" | 21–39% of the sweep; UI contract §10 display rule | unit + e2e |
| Carried-over value beyond the schema bound | clamp (not reached in the sweep) | unit |
| Stale pre-deploy tab saves a v4-shaped blank | carried over on the server by shape | unit |

## Prohibitions (for 12-SPEC.md)

- MUST NOT level the rocker on the thinned bottom.
- MUST NOT apply fine-tunes to the bottom (Open Question 1 may overrule).
- MUST NOT decide a version-4 blank by the envelope's version number alone.
- MUST NOT generate or run a DROP of `extra_center_thickness_mm` in the same `db:migrate:prod` as migration 0006.
- MUST NOT keep the proportional formula anywhere but the D-07 carry-over.
- MUST NOT copy the UI contract's illustrative numbers into a test (its Metric reference case is wrong).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Production holds few or no v4 boards with a blank (v1.3 shipped the same day) | Runtime State Inventory | Low — the carry-over is by shape and covers any count; a read-only production count before the deploy removes the doubt |
| A2 | A shaper most likely picked from the list's first six rows (used for the "top six" residual statistics) | Pattern 5 | Low — the whole-sweep statistics are reported beside them |
| A3 | The founder reads "the four rocker numbers are the blank's own" (R3) as more important than keeping the deck exactly skin-parallel at a tweaked 12" station | Open Question 1 | Medium — flips the fine-tune surface |

## Open Questions (RESOLVED)

1. **Which surface does a 12" fine-tune move?**
   - What we know: on the bottom, the rocker dips below zero near the centre in 3,256 of 3,256 carried-over boards (worst −0.653"), so every rocker number would shift on re-levelling; on the deck the rocker never moves and a tweak larger than the skin is honestly flagged.
   - What's unclear: whether the founder wants a Pin deck board's tweaks to come off the bottom "like the tips".
   - **Recommendation: the deck, whatever the Tip Style.** Write it back as a D-13.

2. **How exactly does a version-4 board carry across (D-07)?**
   - What we know: with the default skin, 65% of carried-over boards (including the only dev board) open flagged "doesn't fit", because the deck at 12" would sit above the blank's deck; under Pin deck their tip rocker also moves by up to 2.60".
   - **Recommendation: option B′ — open it in Bottom style (how Phase 11 cut it), with the skin at the default or raised just enough that the deck never rises above the blank's deck, and the fine-tunes absorbing the residual.** All ten numbers (five thicknesses, five rockers) stay exactly as saved, and 3,256 of 3,256 sweep boards and the dev board still fit. This amends D-07 ("applies the default skin") and the UI contract §10 ("Tip Style at the account default"); record it as a D-14. If the founder prefers D-07 literally, use A-pin and accept the flags.

3. **What skin and Tip Style does a preset open with?**
   - What we know: the picks were made at 1/8" and Pin deck; under Bottom the Shortboard's blank fails by 3/16" at its tail tip.
   - **Recommendation: the preset's own — 1/8" and Pin deck — not the account default**, the way a preset keeps its own tips (Phase 11 D-19). Otherwise a Bottom-default shaper's new Shortboard opens flagged.

4. **Is D-10's "one pass off the bottom at the centre" checked at the board's actual placement, or only against the blank's printed centre?**
   - What we know: only against the printed C, 1 in 1,953 listed placements and 178 in 3,906 slider-end placements have less than one pass at the board's centre.
   - **Recommendation: check it at the placement too** (one comparison at the centre in `fitAt`; the flag reads "{amount} too thin at the center" as F2, "Doesn't fit at this placement"), so "one on deck and one on bottom" holds wherever the board sits. Keep the list's hide/show floor on the printed C (D-18's precedent).

5. **What if the derived foil runs out (very thin centres)?**
   - What we know: 0 cases at centres of 2" and above; 4 of 527 at 1 1/2"; 43 of 527 at 1".
   - **Recommendation: count "the board under 1/8" thick anywhere" as not fitting**, with its own reason line (the blank is too thick for this centre, not too thin), so a nonsense board never reads as a fit. Low priority: no surfboard setting reaches it.

6. **Should the screen say when Pin deck lowers a tip's rocker?**
   - What we know: this happens whenever the tip setting is thicker than the parallel foil (the Shortboard preset's tail).
   - **Recommendation: no new copy.** The ROCKER column and the DATASHEET's blank-rocker column beside it (D-06) already show it. The Tip Style hint "so the tip rocker grows" is true in the usual case. The founder may want the hint softened.

7. **When does `extra_center_thickness_mm` leave?**
   - **Recommendation: keep it declared and unused in this phase; remove it in a follow-up quick task after this phase deploys** (drop it from `schema.ts`, push, deploy, then generate and run the DROP). It cannot ride in this phase's migration run (Pattern 6).

8. **The fine-tune slider range (the UI contract's open item).**
   - **Recommendation: keep ±1/4".** Out-of-range carried tweaks use UI contract §10's display rule; the ±50 mm schema bound already covers every measured residual.

### Rulings (2026-09-26, written back as 12-CONTEXT.md D-13–D-20)

1. Fine-tune surface → **D-13**: the shaper chooses, per board, Deck (default) or Bottom, independent of Tip Style — the founder overruled "deck always".
2. Carry-over → **D-14**: D-07 literally (default skin, account Tip Style, tweaks absorb the residual); flags accepted — "phase 11 was only open for a short moment". Option A-pin, not B′.
3. Presets → **D-17**: their own 1/8" and Pin deck (recommendation adopted).
4. One pass at the placement → **D-15**: yes, in the fit check too (recommendation adopted).
5. Foil runs out → **D-18**: under 1/8" anywhere is not a fit (adopted).
6. Falling tip rocker → **D-16**: a tip is always made as thick as set; no new copy beyond the softened hint (adopted).
7. `extra_center_thickness_mm` → **D-19**: stays this phase, dropped by a follow-up after the deploy (adopted).
8. Slider range → **D-20**: ±1/4" kept (adopted).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | 24.19.0 | — |
| tsx (via `npx --no-install`) | Wave 0 golden script, generator | ✓ | 4.23.12 | — |
| Playwright + chromium/webkit | e2e | ✓ | 1.63.0; chromium-1243, webkit-2359 | — |
| Neon development branch (`.env.local`) | migration 0006 on dev, read-only checks | ✓ (read-only select succeeded) | — | — |
| Neon production | `db:migrate:prod` before the deploy | not probed (out of bounds for research) | — | founder runs it |
| git tag `v1.3` | Phase 11 golden source | ✓ | — | HEAD before the first `blank-fit.ts` edit |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (node env) + Playwright 1.63.0 |
| Config file | `vitest.config.ts` (`lib/**/*.test.ts`, `components/**/*.test.ts`), `playwright.config.ts` (port 3100, `PW_PORT` override) |
| Quick run command | `npx vitest run lib/geometry/blank-fit.test.ts lib/geometry/board-profile.test.ts lib/geometry/measure-display.test.ts lib/models/design-snapshot.test.ts lib/fit-defaults-preference.test.ts lib/blanks` |
| Full suite command | `npm test && npm run lint && npm run test:e2e` |
| Baseline | 73 files, 2,865 passed, 2 skipped, 9.63 s (this session) |

### The named tests (R7), in this order, before any component edit
0. **Wave 0 first commit:** `scripts/extract-phase11-foil-golden.ts` + `lib/geometry/__fixtures__/phase11-foil-golden.json`, generated from the unchanged `boardOnBlank` (tag `v1.3`), and the `phase11-foil.ts` test that pins the legacy function to it.
1. (a) deck = blank deck − skin at every station (`blank-fit.test.ts`).
2. (b) bottom = blank bottom + gap at every station; rocker = the golden Phase 11 rocker at the five stations (Bottom style).
3. (c) thickness(12") = blank − skin − gap (before fine-tunes).
4. (d) Tip Style and tip thickness move nothing at or inside the 12" stations.
5. (e) no kink at the 12" stations, every seeded blank.
6. (f) every v4 fixture with a blank reopens with its five station numbers (and five rockers, if Open Question 2 = B′) exactly — `design-snapshot.test.ts`.
Order check at verification (Phase 11 R16's method): `grep -n` for the six titles, and `git log --reverse --format=%h -- lib/geometry/blank-fit.test.ts components/rocker` shows the tests' commit first.

### Phase Requirements → Test Map
| Req | Behavior | Type | Automated Command | File Exists? |
|-----|----------|------|-------------------|-------------|
| R1 | deck parallel by the skin; skin default 1/8"; per-board value kept across a blank switch | unit + store | `npx vitest run lib/geometry/blank-fit.test.ts -t "deck skin"` | extend |
| R2 | centre gap; passes in both systems incl. the differ-by-one cases | unit | `npx vitest run lib/geometry/measure-display.test.ts -t "planerPasses"` | extend |
| R2 | Deck Skin drag changes the Center OFF BOTTOM cell and the passes, zero requests | e2e | `npx playwright test e2e/rocker-blanks.spec.ts --project=android` | extend |
| R3 | bottom parallel, rocker the blank's own, 12" thickness identity | unit | `-t "bottom sits exactly"`, `-t "less the skin and the gap"` | ❌ new |
| R4 | Pin deck lifts the bottom, Bottom drops the deck; tips equal settings; negative thinning | unit | `-t "Tip Style"` | ❌ new |
| R4 | Tip Style tap changes a tip rocker readout, leaves both 12" readouts | e2e | `rocker-blanks.spec.ts` | extend |
| R5 | nothing at/inside 12" moves; no kink | unit | `-t "moves no number"`, `-t "no kink"` | ❌ new |
| R6 | fine-tune moves its station by the typed amount and nothing else (deck side) | unit | `npx vitest run lib/geometry/board-profile.test.ts -t "fine-tune"` | rewrite |
| R7 | named tests precede UI commits | source + git | grep + `git log --reverse` | — |
| R8 | new sentences in both systems; ledger | unit | `npx vitest run lib/geometry/blank-reasons.test.ts lib/units-isolation.test.ts` | extend |
| R9 | v1–v4 open; v4 carry-over vs golden; v5 round trip; shape-triggered carry-over; bounds | unit | `npx vitest run lib/models/design-snapshot.test.ts lib/models/rack-models.test.ts` | extend |
| R10 | pchip untouched | unit (existing) | `npx vitest run lib/geometry/pchip.test.ts` | ✅ |
| R11 | no package.json change | git | `git diff main -- package.json package-lock.json` empty | — |
| D-01/D-03/D-04 | seven-key allow-list, handoff per field, insert/update column sets, tip style parse | unit | `npx vitest run lib/fit-defaults-preference.test.ts lib/db/ownership.test.ts` | extend |
| D-03/D-10 | dialog rows, Restore Defaults, retired row absent | e2e | `npx playwright test e2e/fit-defaults.spec.ts` | extend |
| D-08 | picks unchanged, generated JSON byte-identical, fit context carries skin/tip style | unit | `npx vitest run lib/blanks/preset-blanks.test.ts` | extend |
| D-09/D-10 | floor = target + skin + pass; fit reads deck and bottom foam | unit | `-t "floorCheck"`, `-t "fit check"` | rewrite |
| UI | toggle `aria-pressed`, `focus-ring-accent`, `coarse:min-h-11` | source | `npx vitest run components/viewer/two-option-toggle.test.ts` | extend |
| UI | Tip Style pills 44px on touch | e2e | `npx playwright test e2e/touch-sizing.spec.ts` | extend (`:79` loop has `/design/rocker`) |

### What stays byte-identical
`preset-blanks.generated.json`; the TEMPLATE, RAILS, VOLUME and FINS desktop baselines; `lib/geometry/pchip.ts`; the hand-set fallback profile and its tests (`board-profile.test.ts:63-106`); every non-blank rack card's litres.

### Sampling Rate
- **Per task commit:** the quick command plus the touched file's own suite.
- **Per wave merge:** `npm test && npm run lint`, then `npm run test:e2e` on main after every wave.
- **Phase gate:** full suite green; the ROCKER baseline re-recorded once, diff inspected (intro wording only); `npm run build` from the main checkout; `npm run db:migrate:prod` run before the merge.

### Wave 0 Gaps
- [ ] `scripts/extract-phase11-foil-golden.ts` + `lib/geometry/__fixtures__/phase11-foil-golden.json` (before any `blank-fit.ts` edit)
- [ ] `lib/geometry/phase11-foil.test.ts`
- [ ] the six named tests (above)
- [ ] `planerPasses`/`formatPasses` cases in `measure-display.test.ts`

### Human-verified (not automatable)
- The founder's answers to Open Questions 1–4 at plan approval.
- The drawing's two bands and the eased tips in all four themes.
- Production order: `npm run db:migrate:prod` (migration 0006) before the merge, then deploy; a read-only production count of v4 boards with a blank if wanted (A1).
- A real-phone walk of the Deck Skin slider and Tip Style pills.

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (Clerk, unchanged) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `saveFitDefaultsPreference` keeps `await auth()` first and takes no owner id (`lib/db/ownership.test.ts`) |
| V5 Input Validation | yes | allow-list for the two new millimetre keys (finite, in range) and the enum (`"pinDeck" \| "bottom"` only) on cookie, localStorage, account and action input; zod v5 bounds for `deckSkin` / `tipStyle`, both-or-neither |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Crafted `tipStyle` string in a cookie or a save | Tampering | enum allow-list returns null; zod `z.enum` rejects |
| Oversized skin or offset in a saved board | Tampering / DoS | zod bounds; the carry-over clamps its own output |
| A patch writing an unknown column | Tampering | `parseFitDefaultsPatch` rejects unknown keys whole |
| Writing another shaper's defaults | Elevation | identity from `auth()` only; upsert on `clerkUserId` |

## Sources

### Primary (HIGH confidence) — repository files read this session
- `lib/geometry/blank-fit.ts` (whole file), `board-profile.ts`, `blank.ts`, `foil.ts`, `blank-reasons.ts`, `measure-display.ts:60-200`, `units.ts:90-140,260-345`, `design.ts:1-199`, `presets.ts` (grep of foil and blank lines), `rocker.ts:348-356`, `outline.ts:35`
- `lib/fit-defaults-preference.ts`, `lib/fit-defaults-server.ts`, `app/actions/fit-defaults.ts`, `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/client.ts`, `drizzle/0005_fit_defaults.sql`, `drizzle/meta/_journal.json`, `drizzle.config.ts`
- `lib/models/design-snapshot.ts`, `design-snapshot.test.ts:1-141` and its test list, `rack-models.ts`, `app/design/actions.ts` (function list, `:47`)
- `components/design/design-store.tsx` (default state, D-19 tips, presets, `applyModel`, side profile), `components/rocker/use-blank-list.ts`, `blank-flag.tsx`, `board-on-blank.tsx:50-141`, `rocker-datasheet.tsx:225-262`, `rocker-viewer.tsx:495-530`, `rocker-view-frame.ts` (grep), `blank-picker.tsx` (grep), `rocker-controls.tsx:62`, `components/viewer/two-option-toggle.tsx` + test
- `lib/blanks/preset-blanks.ts`, `preset-blanks.generated.json:1-60`, `seed-files.ts`, `catalog.ts` bounds, `scripts/generate-preset-blanks.ts`, `scripts/seed-blanks.ts:1-80`
- `e2e/desktop-baseline.spec.ts`, the ROCKER baseline PNG, `e2e/rocker-blanks.spec.ts:150-310`, `e2e/desktop-regression.spec.ts:115-170`, `e2e/touch-drag.spec.ts:770-810`, `e2e/fit-defaults.spec.ts:1-80`, `e2e/touch-sizing.spec.ts` (grep)
- `node_modules/drizzle-orm/pg-core/dialect.js:365-392` (insert names every column)
- `.planning/phases/12-*/12-CONTEXT.md`, `12-SPEC.md`, `12-UI-SPEC.md`; `.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-CONTEXT.md`, `11-RESEARCH.md`, `11-REVIEW.md` (CR-01); `.planning/ROADMAP.md`; `CLAUDE.md`, `AGENTS.md`, `.claude/CLAUDE.md`
- Development database, read-only: `models.snapshot` (7 rows), `user_preferences` (1 row)

### Secondary / Tertiary
- None. No web source was needed: every question was about this repository's code and data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new; versions read from `node_modules`.
- Architecture: HIGH for the derivation (identities measured to 1e-13 mm); MEDIUM for the fine-tune surface and the D-07 option until the founder answers.
- Pitfalls: HIGH — each is a measured count or a line in the code.

**Research date:** 2026-09-26
**Valid until:** until the catalogue CSVs, `blank-fit.ts` or the snapshot format change (stable otherwise).
