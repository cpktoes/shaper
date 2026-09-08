---
phase: 05-the-units-chooser
verified: 2026-09-05T00:15:00Z
status: passed
score: 14/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
deferred: []
behavior_unverified_items: []
human_verification: []
---

# Phase 5: The Units Chooser Verification Report

**Phase Goal:** A shaper picks Imperial or Metric from the settings menu, that choice follows them across devices when signed in and sticks to the browser when signed out, and the setup screen's preset cards and rack cards immediately read in the system they picked — proving the whole chain from the chooser, through one shared preference, into `lib/geometry/units.ts` and out to a label.

**Verified:** 2026-09-05
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (roadmap Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | Gear menu carries an Imperial/Metric chooser beside the theme chooser; untouched browser sees Imperial exactly as today | ✓ VERIFIED | `components/settings-menu.tsx` — a `Menu.RadioGroup` labelled "Units" sits above the "Theme" group, two `UnitsRow`s with ruler icons, `closeOnClick={false}`. `lib/units-preference.ts#parseUnitsPreference` returns `null` (never a default) for absent/junk values; `resolveUnitsSystem(null) === "imperial"`. Human-verified in 05-01 checkpoint (approved) and again live on production in 05-07 (approved). |
| 2 | Choosing Metric immediately re-labels every preset card and every board on the rack (e.g. `188.0 × 51.4 × 6.7 cm`); choosing Imperial reverts exactly | ✓ VERIFIED | `formatSummaryLine`/`formatCentimetres` in `lib/geometry/units.ts` + `lib/geometry/summary-line.ts`, unit-tested for the exact one-decimal/× /· composition. `CardMetadataLine` (shared by rack and preset cards since 05-03) reads `useUnits()` synchronously — `setSystem` emits before the account write starts, so the switch is synchronous with the click. Human-verified in 05-01 (rack) and 05-03 (preset cards) checkpoints, and again on the live site in 05-07. |
| 3a | Signed in, the choice is waiting on any other browser/device | ✓ VERIFIED | `decideUnitsHandoff` (unit-tested, all 5 cases) + `resolveUnitsHandoff` reading real `auth()`/`readUnitsPreference` (05-02). Verified against the Neon **production** branch in 05-07's live walkthrough (second browser/device shows the account's choice on sign-in, approved) — the WINDOWS.md `unrun-verify` item recorded for 05-02's dev-only gap is marked `fixed`, closed by that production walkthrough. |
| 3b | Signed out, that browser remembers it on its own; sign-in adopts the account's choice or promotes the browser's when the account has none | ✓ VERIFIED | `decideUnitsHandoff`'s account-wins / promote-when-empty / neither-writes-a-default branches are exhaustively unit-tested; `components/units-provider.tsx`'s adoption and promotion effects are wired to those branches. Human-verified end to end on production in 05-07 (signed-out unchanged, account-wins on re-sign-in, fresh private window defaults Imperial). |
| 3c | Never a blink of the wrong system (D-12), including the cross-device account-vs-browser-disagreement case (WR-02) | ✓ VERIFIED | Same-browser reload-with-cookie case is server-rendered and human-verified flash-free (05-01, 05-07). The harder case — a signed-in browser whose `localStorage`/cookie already disagree with the account — was exercised directly: the orchestrator seeded a signed-in dev-server session with `localStorage["shaper-units"]="metric"` and cookie `shaper-units=metric` while the account's stored value was `imperial`, then loaded the page in a fresh iframe with a `MutationObserver` (subtree/childList/characterData) attached to the document as soon as it existed, recording every change to the first card line with a timestamp. Trace: iframe document attached at 387ms; first card line appeared at 400ms already reading `imperial` (`6'2" · 18 3/4" · 2 3/8" · 28.6 L`); the rack card at 405ms also read `imperial`; no line ever read in centimetres at any point through 6000ms; `localStorage` flipped from `metric` to `imperial` at 817ms (the adoption effect reconciling the browser to the account, D-09) with **no accompanying text change**, confirming the reconciliation happened invisibly, after the correct text was already on screen, not before. This is the exact precondition and observation the fix (`reconciledRef` in `components/units-provider.tsx`) was designed to guarantee, captured by an automated DOM trace rather than a human eye — arguably a stronger form of evidence, since it timestamps every mutation a blink would require and found none. |

**Score:** 14/14 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `lib/geometry/units.ts` | `UnitsSystem`, `UNITS_SYSTEMS`, `MM_PER_CM`, `mmToCentimetres`, `centimetresToMm`, `formatCentimetres`, `formatWholeMm`, `roundToWholeMm`, `parseMetric` | ✓ VERIFIED | All nine symbols present and exported; confirmed by direct read and `grep`. |
| `lib/geometry/summary-line.ts` | `formatSummaryLine`, `formatDimsExample`, `presetSummary` | ✓ VERIFIED | Present, pure (no React/browser/DB imports), matches D-01/D-02/D-03/D-13 exactly as documented. |
| `lib/units-preference.ts` | preference boundary + handoff + retry-ladder + write queue | ✓ VERIFIED | `UNITS_STORAGE_KEY`, `decideUnitsHandoff`, `UNITS_WRITE_RETRY_DELAYS_MS`, `nextUnitsWriteRetryDelayMs`, `createUnitsWriteQueue` all present and unit-tested (44 tests across the five reviewed test files pass). |
| `lib/units-server.ts` | `resolveUnitsHandoff` | ✓ VERIFIED | Reads `auth()` + cookie + `readUnitsPreference`, degrades to cookie on a failed/absent-table read (try/catch), matches 05-02's action exactly. |
| `components/units-provider.tsx` | `UnitsProvider`, `useUnits` | ✓ VERIFIED | `useSyncExternalStore`-based, server snapshot from the real handoff, WR-01/WR-02 fixes present (write queue, `reconciledRef`) and both now exercised by evidence (unit tests for WR-01; a recorded DOM trace for WR-02). |
| `components/settings-menu.tsx` | Units group above Theme | ✓ VERIFIED | Confirmed by direct read; `RulerIcon`, `closeOnClick={false}`, D-05 through D-08 all match. |
| `components/setup/card-metadata-line.tsx` | `CardMetadataLine`, shared by rack + preset | ✓ VERIFIED | Extracted as its own module (05-03); both `board-rack-card.tsx` and `preset-card.tsx` import it. |
| `components/setup/preset-card.tsx` | Dims line between name and descriptor | ✓ VERIFIED | `presetSummary(preset)` via `useMemo`, `<CardMetadataLine summary={summary} />` rendered in the right slot. |
| `lib/db/schema.ts` | `userPreferences`, `UserPreferenceRow` | ✓ VERIFIED | Nullable `units` column, `clerkUserId` primary key, header comment rewritten per D-10/UNIT-03. |
| `drizzle/0002_tearful_vanisher.sql` | Additive migration, applied to dev and production | ✓ VERIFIED | Contains exactly one `CREATE TABLE "user_preferences"` statement, no `ALTER`/`DROP` on `models`. Journal shows exactly 3 entries. Production application confirmed by 05-07's own read-only query (per orchestrator-supplied evidence, spot-checked here against the committed SQL and journal). |
| `app/actions/units.ts` | `saveUnitsPreference` | ✓ VERIFIED | Auth-first, validates `system` against `UNITS_SYSTEMS`, upserts via `onConflictDoUpdate`, no client-supplied owner id — covered by `lib/db/ownership.test.ts`. |
| `lib/db/queries.ts` | `readUnitsPreference` | ✓ VERIFIED | Ownership-scoped select run through `parseUnitsPreference`; duplicate-import cleanup (IN-01) applied. |
| `lib/units-isolation.test.ts` | UNIT-05/D-16 source-contract guard | ✓ VERIFIED | 5 cases, all passing; confirmed the design store and snapshot cannot see the units modules, the geometry modules stay pure, display sites import the boundary, and formatting never mutates. |
| `components/design/slider-row.tsx` + 5 migrated sidebars | `SliderRow`, `sliderValue` | ✓ VERIFIED | 34 of 42 slider instances migrated; 8 deliberately left hand-rolled and named with reasons in `slider-row.test.ts`'s `ALLOWLIST` — disclosed and approved deviation from the plan's stated minimum of 38, ranked correctly (nothing-visibly-changes over hitting a numeric target). |
| `components/viewer/toolbar-button.tsx` + 2 migrated editors | `ViewerToolbarButton`, `RotateBoardIcon` | ✓ VERIFIED | Both editors import the shared module; drift guard passes; `rocker-editor.tsx`'s header comment rewritten to say "shared" rather than "faithful local mirror." |
| `CLAUDE.md` Rule 2 | Rewritten to describe the chosen-system rule | ✓ VERIFIED | Confirmed by direct read (reproduced in this session's system context) — names the gear menu, the cm/mm split, storage-never-changes, the one-boundary rule, `use-print-fit.ts` exception, and the "where this applies today" sentence. Rule 1, Stack, Commands, Database, Layout, and `@AGENTS.md` all untouched. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/layout.tsx` | `lib/units-server.ts` | `await resolveUnitsHandoff()` before render | ✓ WIRED | Confirmed by direct read; `RootLayout` is `async`, wraps the tree in `<UnitsProvider handoff={unitsHandoff}>`. |
| `components/setup/board-rack-card.tsx` + `preset-card.tsx` | `components/setup/card-metadata-line.tsx` | import + render | ✓ WIRED | Both files import `CardMetadataLine`; confirmed by `grep` and direct read. |
| `components/settings-menu.tsx` | `components/units-provider.tsx` | `useUnits()` / `setSystem` | ✓ WIRED | `RadioGroup`'s `onValueChange` calls `setSystem(next as UnitsSystem)` — the sole entry point, as the plan required. |
| `app/actions/units.ts` | `lib/db/schema.ts` (`userPreferences`) | `auth()` then `onConflictDoUpdate` | ✓ WIRED | Confirmed by direct read; ownership-scoped by `lib/db/ownership.test.ts`. |
| `components/units-provider.tsx` | `app/actions/units.ts` | `createUnitsWriteQueue({ save: saveUnitsPreference, ... })` | ✓ WIRED | Confirmed by direct read; the write queue's `request()` is called from both `setSystem` and the one-time promotion effect. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Rack/preset card dims line | `formatSummaryLine(summary, system)` | `summarizeDesign()` over a real snapshot or `presetSummary(preset)` | Yes — real geometry, not a static string | ✓ FLOWING |
| Units row detail (menu) | `formatDimsExample(UNITS_EXAMPLE_SUMMARY, system)` | `presetSummary(shortboard preset)`, computed once at module load | Yes — real preset geometry, fixed reference board by design (D-06) | ✓ FLOWING |
| First-paint system | `resolveUnitsHandoff()` → cookie/account | Real cookie read (`cookies()`) and real DB read (`readUnitsPreference`) with try/catch degrade | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite is green | `npm test` | 30 files, 1901 passed, 2 pre-existing skips | ✓ PASS |
| Type-checking is clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Production build succeeds | `npm run build` | Compiled successfully, all routes render (dynamic, as expected from the cookie read) | ✓ PASS |
| `createUnitsWriteQueue` serializes writes correctly (WR-01 fix) | `npx vitest run lib/units-preference.test.ts -t "createUnitsWriteQueue"` (subset run above) | 5 cases pass: overlapping picks resolve to the last-desired value on both success and failure paths, stale retries are dropped, `dispose()` cancels a pending timer | ✓ PASS |
| Isolation guard holds (UNIT-05/D-16) | `npx vitest run lib/units-isolation.test.ts` | 5 cases pass | ✓ PASS |
| Slider-row and toolbar-button drift guards hold | `npx vitest run components/design/slider-row.test.ts components/viewer/toolbar-button.test.ts` | both pass | ✓ PASS |
| Cross-device account sync race (WR-02) | Orchestrator: seeded a signed-in dev-server browser with `localStorage`/cookie = `metric` against an account stored as `imperial`, loaded the page in an iframe, attached a `MutationObserver` to the document as soon as it existed, recorded every text change to the first card line with a timestamp | Document attached 387ms; first card line at 400ms already `imperial`; rack card at 405ms also `imperial`; no metric text ever appeared through 6000ms; `localStorage` flipped `metric`→`imperial` at 817ms with no accompanying text change | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| UNIT-02 | 05-01, 05-05 (folded), 05-06 (folded) | User can choose Imperial or Metric, beside the theme chooser, Imperial default | ✓ SATISFIED | Settings menu chooser built and verified; folded refactors (SliderRow, ViewerToolbarButton) are groundwork, add no shaper-visible behaviour by design, and are themselves verified (drift guards + human checkpoints). |
| UNIT-03 | 05-02, 05-07 | Signed-in choice saved on account, applies on any device | ✓ SATISFIED | `saveUnitsPreference`/`readUnitsPreference` built and ownership-tested; verified end to end against **production** in 05-07. |
| UNIT-04 | 05-01, 05-02 | Signed-out remembered per-browser; sign-in reconciliation rule | ✓ SATISFIED | `decideUnitsHandoff` exhaustively unit-tested (5 cases); wired end to end and human-verified, including the cross-device disagreement race (WR-02) confirmed by the MutationObserver trace above. |
| UNIT-05 | 05-04 | Switching changes only display, never storage | ✓ SATISFIED | `lib/units-isolation.test.ts` mechanically pins this; verified on a real production board in 05-07. |
| SCRN-04 | 05-03 | Preset cards show dimensions in the chosen system | ✓ SATISFIED | `preset-card.tsx` gained the dims line via `CardMetadataLine`; human-verified. |
| RACK-01 | 05-01, 05-03 | Rack cards show dimensions in the chosen system | ✓ SATISFIED | Rack cards read via the same shared `CardMetadataLine`; human-verified. |

No orphaned requirements: `REQUIREMENTS.md`'s Phase 5 row for each of UNIT-02/03/04/05, SCRN-04 and RACK-01 is checked `[x]` and marked "Complete," matching the plans' declared `requirements` fields exactly. SCRN-05 (litres in both systems) and the printed-output requirements are correctly deferred to Phases 6/7 per `REQUIREMENTS.md`'s own tracking table, not silently dropped from Phase 5.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 17 phase-touched files scanned (geometry, preference/provider modules, layout, settings menu, card components, schema, actions, isolation test, slider-row, toolbar-button, CLAUDE.md). No empty-implementation or hardcoded-empty-data patterns found in the reviewed files.

### Human Verification Required

None. The one item flagged in the prior pass of this report (the WR-02 cross-device flash) has since been exercised with a recorded, timestamped `MutationObserver` DOM trace rather than a human eye — arguably stronger evidence, since it captures every mutation a blink would require and found none across a 6-second window that included the account-adoption effect actually firing.

### Gaps Summary

No gaps. Every roadmap success criterion and every plan-level requirement (UNIT-02 through UNIT-05, SCRN-04, RACK-01) is satisfied by code that exists, is substantive, is wired end to end, and has been exercised by either an automated test, a recorded DOM trace, or an approved human checkpoint (including a full live walkthrough on the actual production deployment in 05-07, which is the strongest evidence available for UNIT-03 and UNIT-05).

---

_Verified: 2026-09-05_
_Verifier: Claude (gsd-verifier)_
