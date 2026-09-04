---
phase: 03-volume-templates-verified-math
verified: 2026-08-29T05:33:22Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 3: Volume, Templates & Verified Math Verification Report

**Phase Goal:** The core geometry math is proven correct by automated tests, board volume updates
live as the design changes, and users can print a full-size template to cut foam from —
completing the "the math is right" milestone.
**Verified:** 2026-08-29
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Board volume (litres) recalculates live as the user adjusts the outline | ✓ VERIFIED | `components/design/design-store.tsx` lines 330-394: a single `useMemo` chain `outlineGeometry → templateValues/railValues → effectiveVolume → volumeResult`, so any edit to `state.outline` recomputes `volumeResult` synchronously, no reload. Browser-verified per phase SUMMARY: widening widepoint 19"→22" moved the Volume screen's figure 25.78 L → 30.00 L via client-side navigation only. `lib/geometry/design.test.ts` also carries a pure-function live-recompute invariant test asserting a wider widepoint yields a strictly larger `volumeLitres`. |
| 2 | Volume screen discloses which method (drawn geometry vs. area-factor estimate) produced the litres figure | ✓ VERIFIED | `components/volume/volume-calculation-card.tsx` lines 64-65: `areaRowLabel`/`areaSqInDisplay` branch on `result.importingTemplate` to show "Template Area"/"(imported)" vs. "Board Area (estimated)". Directly unit-tested in `lib/geometry/design.test.ts` (`computeVolume` method-disclosure block, 03-02-SUMMARY D4). Browser-verified: "Import Template Area" disclosure visible on the card. |
| 3 | Core geometry calculations (outline, rail band, volume) in `lib/` are covered by Vitest unit tests that pass in CI, validating RAIL-01 and VOL-01 against known-good values | ✓ VERIFIED | `lib/geometry/outline.test.ts`, `rail-bands.test.ts`, `volume.test.ts`, `design.test.ts` all exist and run against golden fixtures in `lib/geometry/__fixtures__/*.json` (extracted from the prototype's own functions). `npm test` run directly: **991/991 passing**, 19 test files. `.github/workflows/ci.yml` runs `npm test` unconditionally (no `continue-on-error`, no filter) on every push/PR. GitHub run `33236030953` on the phase's own pushed head (`e7fb025`) confirmed **conclusion success, 50s** via `gh run view`. Rocker geometry does not exist in `lib/` yet (ROCK-01 is Phase 4, confirmed via `REQUIREMENTS.md` and `ROADMAP.md`); its absence from this coverage is an explicit, planner-flagged deferral to Phase 4 ("Rocker & Foil Editors"), not a gap in this phase — see Deferred Items below. |
| 4 | CI runs credential-free (no real DB/Clerk secret) and fails the check on a red suite | ✓ VERIFIED | `.github/workflows/ci.yml` job-level `env:` block carries three format-valid placeholder values with an inline comment explicitly warning against treating them as real credentials or replacing them with repo secrets. `grep -c 'secrets\.'` → 0. No `neon.tech`/`clerk.accounts.dev`/live-key strings present. `npm test`/`npm run lint`/`npm run build` all run unconditionally in sequence — a failure at any step fails the job. |
| 5 | User can export a full-size (1:1 scale) printable template of the outline, tiled across standard pages for taping together | ✓ VERIFIED | `lib/geometry/template.ts` (677 lines) — pure tile-layout math (`computeTemplateLayout`, `markPlacements`, `templatePageBoxes`, `markLineSegments`, `computeTailClosure`), no jsPDF/React import. `components/template/build-template-pdf.ts` (762 lines) — the sole jsPDF-importing renderer, builds true 1:1 mm-unit PDFs. `lib/geometry/template.test.ts`/`build-template-pdf.test.ts` cover coverage/overlap/multi-column/mark/tail-closure invariants for every board preset at both paper sizes. Physically ruler-verified at exactly 2 inches (03-01 checkpoint) and print-approved through four fix rounds plus the Overview Sheet (03-03/03-04 SUMMARY). Wired from both the Template screen toolbar (`outline-editor.tsx`) and the Summary screen (`order-form.tsx`) via the shared `ExportPreviewDialog`. |
| 6 | The 12in measuring station is defined exactly once and reused, never re-derived | ✓ VERIFIED | `lib/geometry/outline.ts:35` — `export const MEASURE_STATION_MM = inchesToMm(12)`. `lib/geometry/template.ts` imports and reuses it (`computeTemplateMarks`). `grep -rn 'inchesToMm(12)' lib/` finds only the one definition (plus a test fixture literal), confirming no duplicate derivation. |
| 7 | Every dimension printed on the template goes through `lib/geometry/units.ts`, never a raw 25.4 conversion | ✓ VERIFIED | `grep -c '25\.4'` on `template.ts` and `build-template-pdf.ts` → 0 for both. Both files import `formatFeetInches`/`formatInchesFraction` from `@/lib/geometry/units`. |
| 8 | The whole suite/build stays green and typechecked after all this phase's work | ✓ VERIFIED | On the current checkout: `npm test` → 991/991 passing; `npx tsc --noEmit` → exit 0 (no errors, including no LayoutProps phantom noted as worktree-only in the SUMMARYs — clean on the main checkout); `npm run lint` → 0 errors (9 pre-existing unrelated warnings, unchanged by this phase). |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | "Core geometry calculations (outline, **rocker**, rail band, volume)" — rocker specifically has no `lib/geometry/` module or test coverage yet | Phase 4 | `ROADMAP.md` Phase 4: "Rocker & Foil Editors — Interactive rocker and foil editors complete the design surface, feeding rail band and volume live." `REQUIREMENTS.md`: `ROCK-01` mapped to Phase 4, status Pending. `03-02-PLAN.md`'s own `flagged_assumptions` explicitly names "rocker and foil contributions to volume (they do not exist until Phase 4 ... per the recorded deviation in `lib/geometry/volume.ts`)" as a deliberately-excluded edge. This is planner-acknowledged, not a silently missed requirement. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/geometry/template.ts` | Pure tile-layout/mark math | ✓ VERIFIED | 677 lines, no jsPDF/React import, exports `computeTemplateLayout`, `computeTemplateMarks`, `markPlacements`, `templatePageBoxes`, `markLineSegments`, `computeTailClosure`, `nameBlockPlacement`, etc. |
| `lib/geometry/template.test.ts` | Coverage/overlap/multi-column invariants | ✓ VERIFIED | Runs and passes (227 tests across the 3 template/build-pdf/design test files run in isolation). |
| `components/template/build-template-pdf.ts` | Sole jsPDF-importing renderer | ✓ VERIFIED | 762 lines; `grep -rln 'from "jspdf"'` across `components/ lib/ app/` returns only this file, `build-overview-pdf.ts`, and its own test — matches the "one module per drawing surface" pattern. |
| `components/template/build-template-pdf.test.ts` | PDF bytes smoke test | ✓ VERIFIED | Present, passing. |
| `.github/workflows/ci.yml` | CI running test/lint/build credential-free | ✓ VERIFIED | 27 lines; `actions/setup-node@v4`, `npm ci`, `npm test`, `npm run lint`, `npm run build`; confirmed green on GitHub (run 33236030953). |
| `lib/geometry/design.test.ts` | Direct tests for the 3 derive functions + live-recompute + disclosure | ✓ VERIFIED | 150 lines; `deriveTemplateValues`, `deriveRailValues`, `deriveEffectiveVolume` directly imported and asserted; live-recompute invariant and `computeVolume` disclosure assertions present. |
| `components/template/export-preview-dialog.tsx` | Preview-first export dialog, both screens | ✓ VERIFIED | Wired from `outline-editor.tsx` and `order-form.tsx`; artifact picker (Overview Sheet / Full Template) added post-checkpoint, both routed through `downloadOverviewPdf`/`downloadTemplatePdf`. |
| `components/template/build-overview-pdf.ts` + `lib/geometry/overview-layout.ts` | One-page Overview Sheet artifact | ✓ VERIFIED | Both exist, exported functions match SUMMARY claims, imported by the dialog. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `components/outline/outline-editor.tsx` | `components/template/export-preview-dialog.tsx` | `<ExportPreviewDialog trigger={...}>` | ✓ WIRED | Confirmed at line 151 and import at line 8. |
| `components/summary/order-form.tsx` | `components/template/export-preview-dialog.tsx` | `<ExportPreviewDialog trigger={...}>` | ✓ WIRED | Confirmed at line 675 and import at line 50, inside the existing `data-print-hide` action row. |
| `components/template/export-preview-dialog.tsx` | `lib/geometry/template.ts` / `components/template/build-template-pdf.ts` / `build-overview-pdf.ts` | `computeTemplateLayout`, `downloadTemplatePdf`, `downloadOverviewPdf` | ✓ WIRED | All three imported and called on Download. |
| `lib/geometry/template.ts` | `lib/geometry/outline.ts` | `MEASURE_STATION_MM` import | ✓ WIRED | Single definition, imported not re-derived. |
| `components/design/design-store.tsx` | `components/volume/volume-calculation-card.tsx` | `volumeResult` context value → `result` prop | ✓ WIRED | `templateAvailable`/`importingTemplate` flow through to the disclosure label. |
| `.github/workflows/ci.yml` | `package.json` | `npm test` / `npm run lint` / `npm run build` | ✓ WIRED | All three scripts run in sequence; confirmed green on a real GitHub Actions run. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full geometry suite passes | `npm test` | 991/991 passed, 19 files | ✓ PASS |
| Template/design test files pass in isolation | `npx vitest run lib/geometry/template.test.ts components/template/build-template-pdf.test.ts lib/geometry/design.test.ts` | 227/227 passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint clean | `npm run lint` | 0 errors, 9 pre-existing unrelated warnings | ✓ PASS |
| CI green on GitHub | `gh run view 33236030953` | conclusion `success`, 50s, on head `e7fb025` (main) | ✓ PASS |
| No stray jsPDF imports | `grep -rln 'from "jspdf"' components/ lib/ app/` | `build-overview-pdf.ts`, `build-template-pdf.ts`, `build-template-pdf.test.ts` only | ✓ PASS |
| No raw 25.4 conversions in template modules | `grep -c '25\.4' lib/geometry/template.ts components/template/build-template-pdf.ts` | 0, 0 | ✓ PASS |
| Single MEASURE_STATION_MM definition | `grep -rn 'inchesToMm(12)' lib/` | 1 real definition (`outline.ts:35`) + 1 test-fixture literal | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VOL-01 | 03-02, 03-07 | App calculates board volume (litres) live from the shaped geometry | ✓ SATISFIED | design-store useMemo chain, design.test.ts direct + live-recompute + disclosure tests, browser-verified live update. REQUIREMENTS.md already marks this `[x]` Complete. |
| TMPL-01 | 03-01, 03-03, 03-04, 03-05, 03-06, 03-07 | Full-size (1:1) printable template, tiled, taped together | ✓ SATISFIED | template.ts/build-template-pdf.ts + 4 rounds of print-verified fixes, ruler-verified 2in square, dialog wired from two screens. **REQUIREMENTS.md still shows this unchecked (`[ ]`) and its traceability table still says "Pending"** — a stale-documentation discrepancy, not a functional gap (see note below). |

**Note on REQUIREMENTS.md staleness:** `03-07-SUMMARY.md` explicitly records `requirements-completed: [VOL-01, TMPL-01]`, and the codebase evidence above independently confirms TMPL-01 is fully implemented and human-approved. `.planning/REQUIREMENTS.md` was updated for VOL-01 (at 03-02) but was never updated to check off TMPL-01 or change its traceability row from "Pending" to "Complete" — the file has had no commit touching it since 03-02. This is a documentation-tracking gap in the planning artifacts, not a code or product gap; it does not affect the phase's functional goal and is not a BLOCKER, but should be corrected (flip the `TMPL-01` checkbox and traceability row) so the requirements doc doesn't contradict the phase's own completed SUMMARYs.

### Anti-Patterns Found

None. Scanned all files modified across all 7 plans of this phase (`lib/geometry/template.ts`, `components/template/build-template-pdf.ts`, `components/template/export-preview-dialog.tsx`, `components/template/build-overview-pdf.ts`, `lib/geometry/overview-layout.ts`, `lib/geometry/design.test.ts`, `.github/workflows/ci.yml`, `components/outline/outline-editor.tsx`, `components/summary/order-form.tsx`, `app/design/summary/order-form.css`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and placeholder-copy phrases — zero matches.

### Human Verification Required

None outstanding. All behavior-dependent truths in this phase (live volume recompute across screens, print-scale accuracy, printed template legibility/completeness across four fix rounds, toolbar buttons across four themes, order-form print legibility) were already exercised and approved by the shaper during phase execution, per the checkpoint records in 03-01, 03-04, 03-05, 03-06 and 03-07's SUMMARY.md files, plus the CI-green confirmation and live-volume walkthrough the phase-close plan (03-07) ran and recorded. No new unresolved behavior-dependent truth was found during this verification pass.

### Gaps Summary

No functional gaps found. One documentation-tracking item is noted above (REQUIREMENTS.md's TMPL-01 checkbox/status not flipped to Complete) — recommended as a quick follow-up edit, not a blocker to proceeding to Phase 4.

---

_Verified: 2026-08-29T05:33:22Z_
_Verifier: Claude (gsd-verifier)_
