---
phase: 01-foundation-port-deploy-the-design-tool
verified: 2026-08-21T16:16:58Z
status: human_needed
score: 5/5 roadmap truths verified (code+test evidence); 3 items routed to human verification
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Switch fin configuration between single, thruster, quad, and twin/2+1 on /design/fins against the live production URL (https://shaper-coral.vercel.app/design/fins) and confirm the calculated fin placement (position, angle, toe) and overlay redraw correctly for each."
    expected: "Each configuration shows a plausible, correctly overlaid fin placement with numbers that change sensibly between configs; no stale marks from a previous config remain."
    why_human: "This is the exact walkthrough step the phase's own SUMMARY (01-04-SUMMARY.md, coverage item D6 / Known Gaps) explicitly flags as not re-confirmed step-by-step against production in this session, though computeFinPlacement is golden-fixture-tested against extracted prototype values at the code level."
  - test: "Adjust rail-band controls (family, ratio, deck profile, corner cut, single tuck) on /design/rails for nose/center/tail sections against the live production URL and confirm the rail-band numbers and cross-section plot recalculate live and look correct."
    expected: "Each section's calculated dimensions (thickness/apex/tuck marks) update immediately and match what a shaper would expect for the adjustment made."
    why_human: "Same Known Gap as above — rail band recalculation across stations was not walked step-by-step against production this session, though computeRailBands is golden-fixture-tested against extracted prototype values at the code level."
  - test: "Visually check unit display (inches for dimensions, litres for volume) on each of the five design screens (/design/outline, /design/rails, /design/volume, /design/fins, /design/summary) individually against production."
    expected: "No raw millimetre value ever appears under an inch label anywhere on any of the five screens."
    why_human: "The phase's own SUMMARY narrowed Task 2 Part B's acceptance walkthrough to 'numbers all look good' generally; a deliberate per-screen unit check across all five screens individually was not performed. Code-level grep confirms `formatInchesFraction`/`mmToInches`/`cubicMmToLitres` are the only conversion points used by UI components (see Key Link Verification), which is strong but not a substitute for a visual per-screen check."
  - test: "Confirm preset card descriptors never wrap to a second line or truncate at the preset grid's minimum supported card width."
    expected: "Descriptor text stays on one line at all supported widths."
    why_human: "01-02-PLAN.md declares this a `verification: backstop` truth (no automated check specified) and no explicit confirmation of it was found in any SUMMARY or checkpoint record. Low priority; likely already covered informally by the accepted mobile-layout deferral, but not explicitly confirmed."
---

# Phase 1: Foundation — Port & Deploy the Design Tool Verification Report

**Phase Goal:** The ported prototype runs as a real Next.js/TypeScript/Tailwind v4/shadcn app, live
on Vercel, letting a user set dimensions, shape an outline, and see rail-band and fin-placement
numbers calculated from real formulas — with that math implemented as pure TypeScript functions
under `lib/`, per the project's geometry constraint.

**Verified:** 2026-08-21T16:16:58Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can enter overall board dimensions (length, width, thickness) in inches and start a new design | ✓ VERIFIED | `components/outline/outline-controls.tsx` has Board Length (feet/inches split slider, `formatFeetInches`) and Widepoint Width (inches) sliders; `components/rails/rail-controls.tsx:189` has a per-section "Board Thickness" slider in inches (`formatInchesFraction`). Entry point is a preset (`BOARD_PRESETS`, 4 entries) via `applyPreset`, then adjustable via these sliders. `lib/geometry/presets.test.ts` (21 tests) confirms every preset value is bounds-correct and round-trips `inchesToMm`/`mmToInches`. |
| 2 | User can shape an outline curve constrained to those dimensions and view it rendered in a 2D view | ✓ VERIFIED | `lib/geometry/outline.ts`'s `buildOutline()` derives geometry from `length`/`widePointWidth` etc.; `components/outline/outline-viewer.tsx:224-230` renders an SVG `<path>` from `geometry.points`. `lib/geometry/outline.test.ts` passes. Live production `/design/outline` returns HTTP 200. |
| 3 | User can select a fin configuration (single, thruster, quad, twin/2+1) and view the calculated fin placement (position, angle, toe) overlaid on the outline | ✓ VERIFIED (code+test) | `lib/geometry/fins.ts`'s `FIN_SETUPS`/`FinSetup` covers all 4 named configs plus `2plus1`; `components/fins/fin-controls.tsx` renders a selector switching `spec.finSetup` and conditionally rendering per-config controls (thruster/quad/twin blocks at lines 401/419/452). `computeFinPlacement()` is called from `design-store.tsx:201` and rendered via `FinViewer` (`components/fins/fin-viewer.tsx`), which draws position/angle/toe callouts over the tail outline. `lib/geometry/fins.test.ts` includes golden-fixture parity tests (`prototype-fins-golden.json`) matching the original prototype's computed values field-for-field. Not re-walked live across all 4 configs against production this session — see Human Verification. |
| 4 | User can view calculated rail band dimensions (thickness/apex/tuck) at stations along the board, derived from the outline | ✓ VERIFIED (code+test) | `lib/geometry/rail-bands.ts`'s `computeRailBands()` computes nose/center/tail sections (thickness, apex, tuck marks) from `RailBandSpec`; called from `design-store.tsx:157`, consumed by `components/rails/rail-band-editor.tsx` (`railBands: bands`) which renders `RailDataTable`/`RailSectionPlot`. `lib/geometry/rail-bands.test.ts` includes golden-fixture parity tests (`prototype-rails-golden.json`) matching the extracted prototype spreadsheet formulas. Not re-walked live across all three stations against production this session — see Human Verification. |
| 5 | The app is live at a public Vercel URL, ported from `reference/`, with all measurements displayed in inches and litres | ✓ VERIFIED | `curl` against `https://shaper-coral.vercel.app` confirms HTTP 200 for `/`, `/design/outline`, `/design/rails`, `/design/volume`, `/design/fins`, `/design/summary`. `README.md` records the URL (per 01-03-SUMMARY.md). `git ls-files \| grep -iE '\.env'` empty; no secrets committed. `lib/geometry/units.ts` (`formatInchesFraction`, `formatFeetInches`, `cubicMmToLitres`) is the sole conversion boundary; grep across reviewed components found no inline unit-conversion math outside `lib/geometry/` (also independently confirmed in `01-REVIEW.md`). |

**Score:** 5/5 roadmap truths verified — 2 of the 5 (fin placement, rail bands) rest on strong code+test evidence (golden-fixture parity against the extracted prototype) rather than a fresh, deliberate production walkthrough; that walkthrough is explicitly incomplete per the phase's own SUMMARY and is routed to human verification below rather than silently counted as fully proven.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| SETUP-01 | 01-01, 01-02, 01-03, 01-04 | Start a new design by entering overall dimensions | ✓ SATISFIED | Presets + outline/rail sliders (see Truth 1) |
| OUTL-01 | 01-01, 01-04 | Shape an outline curve constrained to length/width | ✓ SATISFIED | `buildOutline()` + `OutlineViewer` (see Truth 2) |
| RAIL-01 | 01-04 | Calculate rail band dimensions at stations, derived from outline | ✓ SATISFIED (code+test); needs human walkthrough | `computeRailBands()` golden-fixture-tested (see Truth 4) |
| FIN-01 | 01-04 | Select a fin configuration | ✓ SATISFIED | `FIN_SETUPS` selector in `fin-controls.tsx` |
| FIN-02 | 01-04 | Calculate fin placement per configuration | ✓ SATISFIED (code+test); needs human walkthrough | `computeFinPlacement()` golden-fixture-tested (see Truth 3) |
| FIN-03 | 01-04 | View calculated fin placement overlaid on outline | ✓ SATISFIED | `FinViewer` draws marks/callouts over the tail outline; production curl confirms fin-mark SVG circles present on `/design/fins` (6) and `/design/summary` (12), correctly suppressed only on `/design/outline` (0) per 01-04's `hideFinMarks` |
| VIZ-01 | 01-02, 01-03, 01-04 | 2D visualization of outline/rocker/rail/fin as shaped | ✓ SATISFIED | `OutlineViewer`, `RailSectionPlot`, `FinViewer` all render SVG from live computed geometry (rocker/foil are out of scope for Phase 1 per ROADMAP Phase 4) |
| UNIT-01 | 01-01, 01-02, 01-03, 01-04 | UI displays inches/litres regardless of internal metric storage | ✓ SATISFIED (code-level); needs human per-screen check | `lib/geometry/units.ts` is the sole conversion boundary (see Truth 5) |

No orphaned requirements — all 8 phase requirement IDs (SETUP-01, OUTL-01, RAIL-01, FIN-01, FIN-02, FIN-03, VIZ-01, UNIT-01) declared across the 4 plans' frontmatter match REQUIREMENTS.md's Phase 1 mapping exactly.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `applyPreset` (design-store.tsx) | `outlineGeometry` / `OutlineViewer` | `buildOutline(state.outline)` useMemo | ✓ WIRED | `design-store.tsx:156` |
| `state.rails` | `RailBandEditor` | `computeRailBands(state.rails)` useMemo | ✓ WIRED | `design-store.tsx:157` |
| `effectiveFins` | `FinPlacementEditor` / `FinViewer` | `computeFinPlacement(effectiveFins)` useMemo | ✓ WIRED | `design-store.tsx:201` |
| `preset.outline` | preset card thumbnail | `buildOutline(preset.outline)` | ✓ WIRED | `components/setup/preset-card.tsx:27` — same function used for both thumbnail and applied board, per 01-02's prohibition |
| `app/layout.tsx` | `/` and `/design/*` | single `DesignProvider` instance | ✓ WIRED | Confirmed one provider promoted to root layout per 01-01-SUMMARY.md and file structure (`app/layout.tsx` vs `app/design/layout.tsx`) |

### Anti-Patterns / Known Issues Found (not phase-goal blockers)

| File | Issue | Severity | Impact on Phase 1 goal |
|---|---|---|---|
| `components/design/design-store.tsx:134-135` | `applyPreset` only overwrites `outline`; rail/fin/volume/board-name from a previous board silently survive a "Discard & Start New" replace, contradicting the confirm dialog's own copy (WR-01, `01-REVIEW.md`) | Warning | Does not invalidate any Phase 1 must-have truth (no truth claims cross-preset data reset); real bug worth a follow-up fix, does not block the roadmap success criteria for a single design session |
| `components/design/design-store.tsx:137-150` | `hasBoardInProgress` only reflects outline edits, not rail/fin/volume edits (WR-02, `01-REVIEW.md`) | Warning | Same as above — root cause shared with WR-01, no Phase 1 truth depends on this |
| `components/outline/outline-editor.tsx:63-72` | Dev-only "Copy preset values" reports clipboard success before the async write resolves (IN-01) | Info | Dev-only tool, confirmed excluded from production build and its source maps |
| `components/outline/outline-editor.tsx:65` | Unconditional `console.log` in dev-only capture handler (IN-02) | Info | Dev-only, no production impact |
| `components/setup/continue-board-card.tsx:19-20` | Renders `boardName` untrimmed despite trimming for the emptiness check (IN-03) | Info | Cosmetic edge case |
| `README.md:1-37` | Still create-next-app boilerplate above the Deployment section (IN-04) | Info | Documentation polish, not a functional gap |

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` debt markers found in any file modified by this phase.

### Deferred Items (explicit prior user decisions — not new gaps)

| Item | Status | Reference |
|---|---|---|
| Mobile/phone-width layout polish (aside+main two-column overlap below ~640px) | Deferred by explicit user decision at the 01-01 checkpoint | `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md` |
| Shortboard and Fish preset curves | Kept at Claude-drafted values by the shaper's own live-editor review and explicit approval ("shortboard and fish both look good") — a decision, not an incomplete task | 01-04-SUMMARY.md, D3 |

Note: the SHAPER wordmark/nav-tab-wrap backstop truth at 375px (01-01's must_haves) is *not* deferred — the same todo file records the user's exact confirmation that the top nav "degrades acceptably... no wrapping/clipping" at 375px. Only the two-column body layout below it is deferred.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full local test suite passes | `npx vitest run` | 583/583 tests pass across 6 files, including golden-fixture parity suites for outline, rail-bands, fins, and volume | ✓ PASS |
| Production routes serve 200 | `curl -o /dev/null -w '%{http_code}'` for `/`, `/design/outline`, `/design/rails`, `/design/volume`, `/design/fins`, `/design/summary` | All 200 | ✓ PASS |
| Preset roster renders on production `/` | `curl https://shaper-coral.vercel.app/` grep for preset names | Shortboard, Fish, Mid-length, Longboard, 4x "Start Shaping" all present | ✓ PASS |
| Fin-mark suppression is screen-specific in production | `curl` SVG fin-mark circle pattern count per screen | `/design/outline`=0, `/design/fins`=6, `/design/summary`=12 (matches 01-04-SUMMARY.md's own claimed counts, independently re-run) | ✓ PASS |
| No committed secrets | `git ls-files \| grep -iE '\.env'` | Empty | ✓ PASS |

### Human Verification Required

See YAML frontmatter `human_verification` — 4 items, all inherited from the phase's own explicitly
documented Known Gap (01-04-SUMMARY.md: Task 2 Part B was narrowed by user/coordinator instruction to
the numbers-and-units dimension only) plus one unconfirmed `backstop`-tier truth from 01-02.

### Gaps Summary

No must-have truth FAILED and no artifact is missing, stub, or unwired. The phase's calculators
(rail band, fin placement) are the strongest-evidenced part of the codebase — both are ported
statement-for-statement from the prototype and pinned against golden fixtures extracted from that
same prototype's known-good output, which is meaningfully stronger evidence than a single manual
click-through would be. However, the phase's own SUMMARY is explicit that the live, deliberate,
step-by-step walkthrough of fin-configuration switching, rail-band recalculation, and per-screen
units display was not completed against production this session ("narrowed... not re-confirmed
step-by-step"). Per this verifier's brief, that self-flagged gap is honored rather than silently
smoothed over: this report routes those three items to human verification instead of counting them
as fully proven, alongside one minor unconfirmed backstop truth about preset-descriptor text wrap.
Two real (but non-blocking) state-management bugs (WR-01, WR-02) from `01-REVIEW.md` are carried
forward here as known issues for a future fix — they do not invalidate any Phase 1 must-have truth.

---

*Verified: 2026-08-21T16:16:58Z*
*Verifier: Claude (gsd-verifier)*
