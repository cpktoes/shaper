---
phase: 07-metric-on-paper
plan: 01
subsystem: printing
tags: [jspdf, units, typescript, pdf-export]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "lib/geometry/measure-display.ts — the display boundary (formatDim, formatDimBare, formatSignedDim, formatMark, stationLabel) every print surface in this plan formats through"
provides:
  - "A required `system: UnitsSystem` field on all three PDF builder options interfaces (BuildTemplatePdfOptions, BuildStripPdfOptions, BuildOverviewPdfOptions), reached by useUnits() in export-preview-dialog.tsx"
  - "lib/geometry/template.ts's markLabels(system) function, replacing the frozen-pin-adjacent MARK_LABELS constant, with a defaulted system parameter threaded through markPlacements/markLineSegments/stripMarkSegments/stripLabelRows so the three frozen characterisation pins stay green unedited"
  - "The Full Sized Template's station marks, scale-check caption and how-to box line 2 printing in the chosen system end to end"
  - "lib/geometry/units.ts's formatTenthMm and lib/geometry/measure-display.ts's formatCalibrationMark — the one millimetre value in the app that carries a decimal, for the scale-check square's calibration figure"
  - "The Full Sized Template's (and, as a side effect, the Paper Saver's) name/dims block reading in the chosen system per D-06"
affects: [07-02-the-paper-saver-in-metric, 07-03-the-overview-sheet-in-metric, 07-05-the-conversion-ledger-closes-on-print]

# Actuals (#2632)
actuals:
  tokens: 17120
  tasks: 3
  commits: 9

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defaulted system: UnitsSystem = \"imperial\" trailing parameter on frozen-pinned pure geometry functions, so existing zero-argument call sites (including characterisation pins) stay byte-identical while new callers opt into a system"
    - "Required, undefaulted system: UnitsSystem field on PDF builder options interfaces — a caller that omits it fails to compile, the same discipline the codebase already uses for other required builder fields"
    - "Text-composing functions exported from drawing modules purely for testability (scaleSquareCaptionText joins templateMarkLabelText, templateNameBlockDimsText, overviewSpecLines as members of this idiom)"

key-files:
  created: []
  modified:
    - lib/geometry/units.ts
    - lib/geometry/measure-display.ts
    - lib/geometry/template.ts
    - components/template/build-template-pdf.ts
    - components/template/build-strip-pdf.ts
    - components/template/build-overview-pdf.ts
    - components/template/export-preview-dialog.tsx

key-decisions:
  - "markLabels(system) replaces the MARK_LABELS constant rather than moving label composition out of lib/geometry/template.ts, because the frozen characterisation pins hash label strings and a defaulted system parameter is the only path that keeps every existing pin call site byte-identical (per the plan's discretion_decisions)."
  - "The Metric name-block dims row's Offset value reuses formatSignedDim for its sign, then strips the trailing ' cm' Metric appends, rather than adding a new formatSignedDimBare export — Length similarly takes formatDimBare on Metric (the same bare centimetre figure formatLength's metric branch would produce) but keeps formatFeetInches on Imperial to stay byte-identical to what the row printed before this phase."
  - "The scale-check square's caption text was extracted into a new exported scaleSquareCaptionText(system) function (not named in the plan's artifacts list) so the Metric/Imperial caption strings are testable without reading the rendered PDF page — mirroring the existing templateMarkLabelText/overviewSpecLines exported-for-testability idiom already used throughout this file."

requirements-completed: []
# PRNT-03 and PRNT-04 are listed on this plan's frontmatter but are NOT closed by it alone — both
# requirements also appear on 07-02-PLAN.md and 07-05-PLAN.md's own requirements fields. This plan
# closes the Full Sized Template's own marks/labels/scale-caption/name-block; the Paper Saver's own
# registration lines and mark segments (D-03) and the Overview Sheet (PRNT-01/02) are explicitly
# Plan 02/03's work, called out by name in this plan's own task text ("Plan 02 flips those call
# sites", "Plan 03 is its consumer"). Marking these requirement IDs complete now would be premature
# and inaccurate; the plan that closes the ledger (07-05) is the correct place to flip them.

coverage:
  - id: D1
    description: "The gear-menu units chooser reaches all three PDF builders (Full Sized Template, Paper Saver, Overview Sheet) through a required system field on their options interfaces"
    requirement: "PRNT-03"
    verification:
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts, components/template/build-strip-pdf.test.ts, components/template/build-overview-pdf.test.ts — every BuildXPdfOptions construction now carries a required system field, tsc --noEmit confirms a caller omitting it fails to compile"
        status: pass
    human_judgment: false
  - id: D2
    description: "A shaper on Metric exporting a Full Sized Template reads station marks in centimetres (Nose 30.5 cm — 40.0 cm), a calibration square captioned 50.8 mm, a how-to box naming the same figure, and a name block carrying its unit once"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#markLabels / markPlacements read the chosen units system (07-01 D-04); components/template/build-template-pdf.test.ts#templateMarkLabelText / templateMarkDimensionText, #scaleSquareCaptionText, #templateHowToLines, #templateNameBlockDimsText / nameBlockContent"
        status: pass
    human_judgment: true
    rationale: "Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase — the printed page's visual layout (does the metric string actually fit where the imperial one did, does the caption read cleanly on paper) needs a human looking at an exported PDF, not just the composed strings."
  - id: D3
    description: "A shaper on Imperial exporting the same template gets a byte-identical page to the one they got before this phase"
    requirement: "PRNT-03"
    verification:
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts — explicit byte-identity assertions on templateHowToLines(layout, \"imperial\"), scaleSquareCaptionText(\"imperial\"), and templateNameBlockDimsText(dims, \"imperial\"); lib/geometry/template.test.ts's three frozen characterisation-pin describe blocks, unedited, still pass on their original digests"
        status: pass
    human_judgment: false
  - id: D4
    description: "The drawn board — curve, marks, tiling, alignment box, calibration square — is identical in both systems; only the words beside them change"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts's three frozen characterisation-pin describe blocks (all three call the geometry functions with no fourth argument and hash the exact same digest as before this plan); grep -c 'inchesToMm(2)' components/template/build-template-pdf.ts returns 1"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-06
status: complete
---

# Phase 7 Plan 01: The Units Channel Reaches the Printer Summary

**Threaded the shaper's chosen units system into all three PDF builders and made the Full Sized Template's station marks, calibration square and name block read in it — while the drawn board itself provably did not move, proven by the frozen characterisation pins staying green on their original digests.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 7 (plus 2 test-only fixture files touched incidentally: build-strip-pdf.test.ts, build-overview-pdf.test.ts)

## Accomplishments

- A shaper's Metric/Imperial choice now reaches the printer through exactly one path: `useUnits()` in `export-preview-dialog.tsx` → a required `system` field on each `Build*PdfOptions` → the builder's text-composing functions — proved end to end on a single thin slice (Task 1's tracer) before anything else expanded from it.
- The Full Sized Template's station marks read `Nose 30.5 cm — 40.0 cm` on Metric and exactly what they printed before this phase on Imperial, via `lib/geometry/template.ts`'s new `markLabels(system)` function replacing the old `MARK_LABELS` constant.
- Added the app's one millimetre value with a decimal — `formatTenthMm` (`lib/geometry/units.ts`) and its display-boundary wrapper `formatCalibrationMark` (`lib/geometry/measure-display.ts`) — so the scale-check square's caption (`50.8 mm x 50.8 mm — measure before taping`) and the how-to box's matching line agree exactly with what the square itself is drawn from.
- The template's name/dims block carries its unit once, per D-06's worked example: `Length 188.0 · Nose 40.0 · Widepoint 51.4 · Offset +2.5 · Tail 36.8 · Thickness 6.7 cm · Volume 34.0 L`. The Paper Saver's own name block starts reading in the chosen system as a side effect, since the two sheets share this one helper.
- All three frozen characterisation pins in `lib/geometry/template.test.ts` are unedited and pass on their original digests — proof that nothing a shaper cuts to (the outline curve, every working mark, page tiling, the alignment box, the scale square) moved in either system.

## Task Commits

Each task was committed atomically; Tasks 2 and 3 are `tdd="true"` and followed RED → GREEN:

1. **Task 1: The chosen system reaches a printed station mark — one path, end to end** — `23fa930` (feat)
2. **Task 2: The scale-check square captioned in millimetres**
   - `cf43333` (test) — RED: failing test for `formatTenthMm`
   - `a25b1e2` (feat) — GREEN: implement `formatTenthMm`
   - `68bfda6` (test) — RED: failing test for `formatCalibrationMark`
   - `2d6cefc` (feat) — GREEN: implement `formatCalibrationMark`
   - `bde0f0f` (test) — RED: failing test for `scaleSquareCaptionText` and the how-to box's Metric line 2
   - `a456f85` (feat) — GREEN: implement `scaleSquareCaptionText`, thread `system` through the how-to box
3. **Task 3: The template's name and dimensions block in the chosen system**
   - `617e1fd` (test) — RED: failing test for the Metric name block dims row
   - `4fa265c` (feat) — GREEN: implement the Metric name block dims row (D-06)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — STATE.md/ROADMAP.md excluded, owned by the orchestrator after the wave completes).

## Files Created/Modified

- `lib/geometry/units.ts` — adds `formatTenthMm(value: Mm): string`, the bare tenth-of-a-millimetre formatter the calibration figure is built from
- `lib/geometry/measure-display.ts` — adds `formatCalibrationMark(value: Mm, system: UnitsSystem): string`, the display-boundary wrapper (`50.8 mm` metric / `2"` imperial)
- `lib/geometry/template.ts` — `MARK_LABELS` constant replaced by `markLabels(system)`; `markPlacements`, `markLineSegments`, `stripMarkSegments`, `stripLabelRows` gain a defaulted `system: UnitsSystem = "imperial"` trailing parameter
- `components/template/build-template-pdf.ts` — `BuildTemplatePdfOptions` gains a required `system` field; `templateMarkDimensionText`, `templateMarkLabelText`, `templateHowToLines`, `templateHowToWrappedLines`, `templateNameBlockDimsText`, `nameBlockContent` gain a required `system` parameter; new exported `scaleSquareCaptionText(system)`
- `components/template/build-strip-pdf.ts` — `BuildStripPdfOptions` gains a required `system` field; `drawNameBlock`/`computeStripFurniture` thread it to the shared `nameBlockContent` helper (its own `stripMarkSegments`/`stripLabelRows` call sites stay on the imperial default — Plan 02's work)
- `components/template/build-overview-pdf.ts` — `BuildOverviewPdfOptions` gains a required `system` field, unread by `buildOverviewPdf` itself (Plan 03's work)
- `components/template/export-preview-dialog.tsx` — reads `useUnits()` and passes `system` into all three download calls; Letter/A4 buttons and paper-size state left completely untouched (D-11/D-12)
- `lib/geometry/template.test.ts`, `components/template/build-template-pdf.test.ts`, `components/template/build-strip-pdf.test.ts`, `components/template/build-overview-pdf.test.ts` — test-only updates: existing options constructions gained an explicit `system` field, existing text-composing-function calls gained an explicit `"imperial"` argument, and new Metric/Imperial-byte-identity cases were added per task

## Decisions Made

- **`markLabels(system)` replaces `MARK_LABELS`, not a move of text composition out of the geometry file.** The plan's own `<discretion_decisions>` settled this: moving composition to the PDF builders would change the shape of the objects the frozen pins hash (dropping the `label` key), forcing a digest regeneration — the one thing this phase must never do. A defaulted `system: UnitsSystem = "imperial"` parameter keeps every zero-argument call site, including the pins' own, byte-identical by construction.
- **The Metric name-block row's Offset and Length values reuse existing signed/dim formatters rather than inventing new bare variants.** `formatSignedDim(offset, "metric")` already appends ` cm`; stripping that suffix locally (rather than adding a `formatSignedDimBare` export) keeps the new surface area small — one string operation at one call site — while still routing every conversion through `lib/geometry/units.ts`/`measure-display.ts` per CLAUDE.md Rule 2. Length's Imperial branch stays `formatFeetInches` (not `formatDimBare`'s inches-fraction form) specifically to preserve byte-identity with what the row printed before this phase.
- **`scaleSquareCaptionText(system)` was added as a new exported function**, not explicitly named in the plan's `<artifacts_this_phase_produces>` list, because the acceptance criteria required a case asserting the exact Metric and Imperial caption strings, and the caption was previously composed inline inside the unexported `drawScaleSquare` with no way to test it without reading rendered PDF bytes. This mirrors the codebase's own established "export text-composing functions for testability" idiom (`templateMarkLabelText`, `overviewSpecLines`) rather than introducing a new testing mechanism.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Extracted `scaleSquareCaptionText` for testability**
- **Found during:** Task 2
- **Issue:** The plan's acceptance criteria require asserting the exact Metric (`50.8 mm x 50.8 mm — measure before taping`) and Imperial caption strings, but the caption was composed inline inside `drawScaleSquare`, an unexported jsPDF-drawing function with no return value to assert against.
- **Fix:** Extracted the caption composition into a new exported `scaleSquareCaptionText(system: UnitsSystem): string`, called by `drawScaleSquare`. This is additive only — no existing behavior changed, and it follows the file's own established pattern.
- **Files modified:** `components/template/build-template-pdf.ts`
- **Verification:** `scaleSquareCaptionText("metric")` and `scaleSquareCaptionText("imperial")` are asserted directly in `build-template-pdf.test.ts`.
- **Committed in:** `a456f85` (Task 2 GREEN commit)

**2. [Rule 1 - Bug] Removed now-unused imperial-formatter imports from `build-template-pdf.ts`**
- **Found during:** Task 3
- **Issue:** After Task 3 converted `templateNameBlockDimsText` to route every value through `lib/geometry/measure-display.ts`, `formatInchesFraction` and `formatSignedInchesFraction` were no longer called anywhere in the file (only referenced in comments), which `npm run lint`/`tsc` would eventually flag as dead imports.
- **Fix:** Removed the two unused named imports from the `@/lib/geometry/units` import statement; `formatFeetInches` stays (still used for Length's Imperial branch).
- **Files modified:** `components/template/build-template-pdf.ts`
- **Verification:** `npx tsc --noEmit` and `npm run lint` both exit clean.
- **Committed in:** `4fa265c` (Task 3 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical functionality/testability, 1 bug/dead-code cleanup)
**Impact on plan:** Both are small, additive, in-scope changes needed to satisfy the plan's own acceptance criteria and keep the build clean. No scope creep — no file outside the plan's `files_modified` list was touched.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase` and this plan's `type="tracer"` Task 1, no mid-plan `checkpoint:human-verify` was raised. The following is deferred to the phase's end-of-phase UAT pass:

- **Visual check of an exported Metric Full Sized Template PDF.** Confirm on an actual rendered page that the station marks (`Nose 30.5 cm — 40.0 cm`), the scale-check caption (`50.8 mm x 50.8 mm — measure before taping`), the how-to box's second line, and the name/dims block all read correctly, do not overlap or clip, and that the drawn board (curve, ticks, alignment box, scale square) is pixel-identical to the Imperial export apart from the label text.
- **Visual check that the Imperial export is unchanged.** A shaper who has never touched the units chooser should see the exact same page they saw before this phase — worth a side-by-side glance at an exported PDF, not just the byte-identity assertions in the test suite.

## Issues Encountered

None beyond the two auto-fixes documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The units channel is wired end to end into all three PDF builders; Plan 02 (the Paper Saver in Metric) can now flip `build-strip-pdf.ts`'s own `stripMarkSegments`/`stripLabelRows` call sites off their imperial default and convert its independent scale-square caption, and Plan 03 (the Overview Sheet in Metric) can start reading `options.system` in `buildOverviewPdf`, both without touching the options interfaces again.
- `lib/geometry/template.ts`'s `markLabels`, `formatTenthMm` and `formatCalibrationMark` are available for reuse by later plans; no new formatter needs inventing for the remaining print surfaces.
- The three frozen characterisation pins remain the working proof mechanism for "nothing on paper moved" — any future plan touching `lib/geometry/template.ts` should run `npx vitest run lib/geometry/template.test.ts` and treat a changed digest as a hard stop, never a re-capture.
- No blockers. `lib/units-isolation.test.ts`'s conversion ledger has not yet been extended to the four print surfaces (Plan 05's named task) — this plan did not touch that file, per its own `files_modified` scope.

---
*Phase: 07-metric-on-paper*
*Completed: 2026-09-06*
