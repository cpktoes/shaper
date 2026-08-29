---
phase: 04-rocker-foil-editors
plan: 04
subsystem: geometry
tags: [simpson-integration, volume, cross-section, rail-bands, foil, monotone-spline, litres]

requires:
  - phase: 04-rocker-foil-editors
    provides: "Plan 04-01's foil.ts (sampleFoil, foilStationPoints, DEFAULT_FOIL_SPEC) and monotone-spline.ts"
  - phase: 04-rocker-foil-editors
    provides: "Plan 04-03's design.ts DesignSummaryFields.foil/railsImportFoilThickness and deriveEffectiveRails, and design-store.tsx's effectiveRails memo"
provides:
  - "computeCrossSectionVolume and simpsonIntegrate in lib/geometry/volume.ts — real Simpson-integrated litres from the board's own drawn cross-sections"
  - "deriveQuotedVolumeLitres in lib/geometry/design.ts — the one rule deciding which of the two litres figures the app quotes"
  - "design-store.tsx's crossSectionVolume and quotedVolumeLitres, read by every volume-quoting screen"
affects: [volume-screen, summary-order-form, board-rack-cards, template-export]

actuals:
  tokens: 13714
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Simpson's composite one-third rule as a named, unit-asserted panel count (SIMPSON_PANEL_COUNT) rather than an inlined round number"
    - "Continuous rail-band fields (deckPercent, ratioTopPercent, scale, domedBandBase) linearly interpolated between the three rail-band anchor stations per integration station; discrete fields (family, symmetrical, corner-cut/tuck overrides) taken wholesale from the nearest anchor"
    - "A half-width SAMPLER function (not a concrete outline type) as computeCrossSectionVolume's input, so a monotone-spline-built blank datasheet can validate the same code path a real outline uses"

key-files:
  created:
    - lib/geometry/__fixtures__/blank-datasheet-golden.json
  modified:
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - components/design/design-store.tsx
    - components/volume/volume-calculation-card.tsx
    - components/volume/volume-controls.tsx
    - components/volume/volume-estimator.tsx
    - components/summary/order-form.tsx
    - components/template/export-preview-dialog.tsx

key-decisions:
  - "Cross-sections re-run the real rail-band formula (computeRailSection + buildRailProfile) at every one of the 51 stations, blending the three known sections' continuous fields and taking discrete fields from the nearest anchor, rather than substituting a named boxy/medium/tapered profile"
  - "The fullest rail treatment for blank-datasheet validation is Family 1 (deckPercent 100, corner cut kept, single tuck) — swept programmatically in the test itself against the blank's own centre station, not hand-picked"
  - "deriveQuotedVolumeLitres takes the estimator VolumeResult and the CrossSectionVolumeResult plus an importingTemplate flag, rather than reading VolumeResult.importingTemplate internally, keeping the decision an explicit, testable pure function"

patterns-established:
  - "Litre-constant separation: the estimator's own truncated constant and the exact cubicMmToLitres never appear in the same function body — enforced by a grep gate in the plan's acceptance criteria"

requirements-completed: [FOIL-01]

coverage:
  - id: D1
    description: "computeCrossSectionVolume integrates real per-station cross-sections (foil thickness x drawn outline width x rail-band shape) with Simpson's rule and the exact litre conversion"
    requirement: FOIL-01
    verification:
      - kind: unit
        ref: "lib/geometry/volume.test.ts#computeCrossSectionVolume"
        status: pass
      - kind: unit
        ref: "lib/geometry/volume.test.ts#simpsonIntegrate"
        status: pass
    human_judgment: false
  - id: D2
    description: "The accurate method is validated against a published blank's stated volume within a justified tolerance"
    requirement: FOIL-01
    verification:
      - kind: unit
        ref: "lib/geometry/volume.test.ts#blank-datasheet validation (D-14)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every screen that quotes volume (Volume screen, Summary order form, rack cards, printed template) reads the same deriveQuotedVolumeLitres figure, and the quick estimator survives as the Volume screen's standalone mode"
    verification:
      - kind: unit
        ref: "lib/geometry/design.test.ts#summarizeDesign volume disclosure (D-13)"
        status: pass
      - kind: other
        ref: "grep -rn 'volumeResult\\.volumeLitres' components/summary/ components/setup/ components/template/ (empty)"
        status: pass
    human_judgment: true
    rationale: "Live cross-screen agreement (Volume screen, Summary, rack card, template export all showing the identical, moving-together number) is a visual/interactive claim that needs a human to open the running app and compare screens side by side — the plan's own <human-check> steps for this task were not exercised in this headless worktree session."

duration: 16min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 4: Cross-Section Volume Summary

**Real Simpson-integrated cross-section litres from a board's own foil, outline and rail bands, checked against a published blank datasheet within 1.01%, now the one figure every screen in the app quotes.**

## Performance

- **Duration:** ~16 min
- **Tasks:** 3
- **Files modified:** 10 (9 planned + 1 deviation)

## Accomplishments

- `computeCrossSectionVolume` (`lib/geometry/volume.ts`) integrates 51 real cross-sections along a board's length — each one built from the actual foil thickness, the drawn outline's width, and the real rail-band formula (blended between the three anchor sections rather than a canned profile) — with Simpson's rule and the exact `cubicMmToLitres` conversion. Validated against a hand-entered Arctic Foam 7'3" SBF blank datasheet (77.17 L stated) at 77.95 L, a 1.01% deviation, well inside the justified 10% tolerance.
- `deriveQuotedVolumeLitres` (`lib/geometry/design.ts`) is the one rule deciding which of the two litres figures the app shows: the accurate cross-section figure while a board is importing its drawn template dimensions, the quick estimator's figure while the Volume screen is standing in as a standalone estimator. `summarizeDesign` now runs this same rule internally.
- Every remaining volume consumer — the Volume screen's calculation card, the Summary order form (two sites), the home-screen rack cards, and the printed template export — now reads the identical `quotedVolumeLitres` figure. A shaper can no longer see two different litres for the same board on two different screens.
- The Volume screen's calculation card names which method produced the number in plain English, and shows the count of cross-sections integrated when the accurate path is active. The two import toggles' labels now read as the method switch they are.
- The existing quick estimator (`computeVolume`, `CUBIC_INCHES_PER_LITRE`, every private inch-domain helper) is untouched — its own golden tests still pass unmodified, and it survives as the Volume screen's standalone mode exactly as CONTEXT.md D-13 specifies.

## Task Commits

Each task was committed atomically:

1. **Task 1: Cross-section volume, checked against a published blank** — `ec0d980` (feat)
2. **Task 2: The accurate number becomes the board's volume on the Volume screen** — `28ab41c` (feat)
3. **Task 3: One figure everywhere the app quotes volume** — `faf1201` (feat)

_No TDD RED/GREEN split — tests and implementation were written together per task, matching this plan's `tdd="true"` behavior-block style (tests plus implementation in one commit per task, as the plan's own task structure specifies)._

## Files Created/Modified

- `lib/geometry/volume.ts` — adds `SIMPSON_PANEL_COUNT`, `simpsonIntegrate`, `CrossSectionVolumeInput/Result`, `computeCrossSectionVolume`; rewrites the header's deviations 2 and 3 from open IOUs to resolved records
- `lib/geometry/volume.test.ts` — new suites for `SIMPSON_PANEL_COUNT`, `simpsonIntegrate`, `computeCrossSectionVolume`, and the blank-datasheet validation
- `lib/geometry/__fixtures__/blank-datasheet-golden.json` — the Arctic Foam 7'3" SBF blank's five stations, hand-entered with provenance (the one sanctioned exception to "goldens come from the prototype")
- `lib/geometry/design.ts` — adds `deriveQuotedVolumeLitres`; `summarizeDesign` now composes it into the pipeline
- `lib/geometry/design.test.ts` — new suites for `deriveQuotedVolumeLitres` and `summarizeDesign`'s volume disclosure, plus the foil-vs-rocker structural proof
- `components/design/design-store.tsx` — adds `crossSectionVolume` and `quotedVolumeLitres` memos, exposed on `DesignContextValue`
- `components/volume/volume-calculation-card.tsx` — headline reads `quotedVolumeLitres`; new method-disclosure line and cross-section station count
- `components/volume/volume-controls.tsx` — the two import-toggle labels reworded as the method switch
- `components/volume/volume-estimator.tsx` — passes the card's two new required props (deviation, see below)
- `components/summary/order-form.tsx` — both litres display sites read `quotedVolumeLitres`
- `components/template/export-preview-dialog.tsx` — the printed template's dimensions bag reads `quotedVolumeLitres`

## Decisions Made

- The per-station rail-band blend (continuous fields interpolated between the three anchors, discrete fields taken from the nearest anchor) is recorded in `computeCrossSectionVolume`'s own doc comment, per the plan's requirement to record this discretionary choice and its reasoning.
- The blank-datasheet validation's "fullest rail treatment" family (Family 1) was determined by an in-test sweep across all five families at the blank's own centre station, then hard-coded into the test's descriptive comment with the measured numbers (53104.7 mm2 centre area, 77.95 L, 1.01% deviation) after running the suite — not guessed or hand-picked in advance.
- `deriveQuotedVolumeLitres` takes `importingTemplate` as an explicit third parameter (matching the plan's declared signature) rather than reading it off the `VolumeResult` argument internally, keeping the decision function a small, directly testable pure rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `components/volume/volume-estimator.tsx`, not in the plan's declared file list**
- **Found during:** Task 2
- **Issue:** `VolumeCalculationCard` gained two new required props (`quotedVolumeLitres`, `crossSectionStationCount`). Its one call site, `volume-estimator.tsx`, would fail to type-check without passing them.
- **Fix:** Updated the call site to read `quotedVolumeLitres` from `useDesign()` and pass `SIMPSON_PANEL_COUNT + 1` as the station count.
- **Files modified:** `components/volume/volume-estimator.tsx`
- **Verification:** `npx tsc --noEmit` clean (excluding the known worktree-only phantom `LayoutProps` warning), `npm test` and `npm run lint` both green.
- **Committed in:** `28ab41c` (Task 2 commit)

**2. [Rule 1 - Bug, self-caught] Header comment initially violated its own acceptance-criteria grep**
- **Found during:** Task 1, before committing
- **Issue:** The rewritten header comment mentioned `CUBIC_INCHES_PER_LITRE` by name twice in prose, which would have made `grep -n 'CUBIC_INCHES_PER_LITRE' lib/geometry/volume.ts` report four matches instead of the required two (declaration + single use) — failing the plan's own acceptance criterion before it was ever committed.
- **Fix:** Reworded the prose to describe the estimator's own litre constant without repeating the literal identifier.
- **Files modified:** `lib/geometry/volume.ts`
- **Verification:** `grep -n 'CUBIC_INCHES_PER_LITRE' lib/geometry/volume.ts` now reports exactly the declaration and its single use.
- **Committed in:** `ec0d980` (Task 1 commit — fixed before the commit was made, not a follow-up)

---

**Total deviations:** 2 (1 blocking file addition, 1 self-caught pre-commit fix)
**Impact on plan:** Both were necessary for correctness/type-safety; neither expanded scope beyond what Task 2's prop widening already required.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `lib/geometry/volume.ts`'s deviations 2 and 3 (open since Phase 3) are now resolved and recorded as such in the file header.
- The Volume screen, Summary order form, rack cards and printed template all read one litres rule (`deriveQuotedVolumeLitres`); a shaper can no longer see two different figures for the same board.
- **Pending manual verification:** this plan's `<human-check>` steps (open `/design/volume`, change a ROCKER thickness, confirm the litres moves together across the Volume screen, Summary, rack card and template export; toggle the import switches off/on and confirm the method-disclosure line changes) were not exercised in this headless worktree session — no dev server was launched, per this repo's worktree environment constraints (Turbopack cannot resolve `next` outside the main checkout). Recommend a manual pass in the main checkout before considering this plan's UX fully verified.
- Wave 3 (`04-04`) is the last plan in phase 04's dependency chain per the plan's own frontmatter (`depends_on: ["04-01", "04-03"]`); no other in-phase plan is blocked on this one specifically, but it closes out the phase's volume-accuracy success criterion.

## Self-Check: PASSED

All 11 files created/modified by this plan (10 planned + 1 deviation) confirmed present on disk. All 3 task commit hashes (`ec0d980`, `28ab41c`, `faf1201`) confirmed present in `git log --oneline --all`.

---
*Phase: 04-rocker-foil-editors*
*Completed: 2026-08-29*
