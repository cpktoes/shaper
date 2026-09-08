---
phase: 07-metric-on-paper
plan: 03
subsystem: printing
tags: [jspdf, units, typescript, pdf-export]

# Dependency graph
requires:
  - phase: 07-metric-on-paper
    provides: "07-01 — the required system: UnitsSystem field on BuildOverviewPdfOptions, reached by useUnits() in export-preview-dialog.tsx, plus lib/geometry/measure-display.ts's display boundary (formatDim, formatMark, formatSignedDim, formatArea, formatLength, stationLabel) this plan formats every line through"
provides:
  - "The Overview Sheet's spec block, length callout, widepoint offset label, station width figures and dashed station names all reading in the shaper's chosen units system"
  - "overviewStationWidthText(halfWidth, system) — a new exported text-composing function for the drawing loop's own station-width figure, extracted for testability the same way scaleSquareCaptionText was in Plan 01"
  - "The precision-trap resolution: overviewStationLines decides the WIDEPOINT/CENTER merge from the printed magnitude in the active system, not a threshold pinned to one system"
affects: []

# Actuals (#2632)
actuals:
  tokens: 9280
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Required, undefaulted system: UnitsSystem parameter added to every text-composing export in a print-surface builder file, mirroring 07-01's own established idiom for build-template-pdf.ts"
    - "A merge/branch decision (WIDEPOINT/CENTER) made from the printed string equality against the active system's own zero form (\"0\\\"\" imperial, \"0.0 cm\" metric), rather than a raw-float epsilon or a threshold hardcoded to one system"
    - "A drawing-loop-only value (the station width figure, previously composed inline in a doc.text call with no return value) extracted into a small named exported function purely for testability — extending 07-01's scaleSquareCaptionText precedent"

key-files:
  created: []
  modified:
    - components/template/build-overview-pdf.ts
    - components/template/build-overview-pdf.test.ts

key-decisions:
  - "The spec block's own Length line uses formatLength, not formatDim, even though the plan's action text grouped Length with the other dims-family formatDim calls. formatDim's Imperial branch is formatInchesFraction (a bare inch fraction), but the spec block's Length line has always printed formatFeetInches (\"6'2\\\"\"), and the plan's own prohibition and must-have truth both require Imperial to stay byte-identical. formatLength's Imperial branch is formatFeetInches verbatim and its Metric branch is the same formatCentimetres + \" cm\" composition formatDim uses, so it is the function that actually satisfies both the plan's own worked Metric example (\"188.0 cm\") and its Imperial byte-identity requirement."
  - "overviewStationWidthText(halfWidth, system) was extracted as a new exported function, not named in the plan's own artifacts list, because the station width figure printed beside each dashed line is composed inline inside a doc.text() call in the drawing loop with no return value to assert against — the same problem 07-01 solved for the scale-square caption by extracting scaleSquareCaptionText. This is additive only; the loop's own math and coordinates are untouched."
  - "The offset that proves the widepoint merge threshold genuinely differs by system is derived programmatically inside the test (scanning candidate millimetre offsets for one where formatDim reads Imperial's zero form but not Metric's), rather than hand-picked, per CLAUDE.md Rule 1 and the plan's own instruction not to hand-pick a millimetre figure."

requirements-completed: [PRNT-02]

coverage:
  - id: D1
    description: "A Metric shaper's Overview Sheet spec block reads every board size in centimetres to one decimal (Length, Nose/Widepoint Width, Tail Block, WP Offset) and every small depth in whole millimetres (Swallow/Diamond Depth), with one square-centimetre area figure and no sq-ft parenthetical"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "components/template/build-overview-pdf.test.ts#overviewSpecLines — Metric size/depth/area cases, plus the Imperial byte-identity case across every board preset"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two twelve-inch station lines are named by where they actually are (NOSE @ 30.5 cm / TAIL @ 30.5 cm on Metric) without the stations themselves moving, and the length callout above the drawn outline prints a single centimetre figure on Metric with no invented dual form"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "components/template/build-overview-pdf.test.ts#overviewStationLines (Metric station-name cases, identical-station-value-across-systems case) and #overviewLengthLabelText (Metric single-figure case, Imperial byte-identity case)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The WIDEPOINT/CENTER dashed-line merge is decided from the printed magnitude of the offset in the active system, so an offset around a millimetre can legitimately merge on an Imperial sheet and not on a Metric one — both branches pinned in both systems, plus the boundary case itself"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "components/template/build-overview-pdf.test.ts#overviewStationLines — merged/unmerged cases in each system, and the offset derived from each system's own printed zero form that merges on Imperial and splits on Metric"
        status: pass
    human_judgment: false
  - id: D4
    description: "With Imperial chosen, every line, label and figure on the Overview Sheet is byte-identical to what it printed before this phase"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "components/template/build-overview-pdf.test.ts — explicit byte-identity assertions across overviewSpecLines, overviewLengthLabelText, overviewWpOffsetLabelText, overviewStationLines and overviewStationWidthText"
        status: pass
    human_judgment: false
  - id: D5
    description: "The drawn board, its stringer and every dashed station line sit at identical page coordinates in both systems — only the labels and figures beside them changed"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "components/template/build-overview-pdf.test.ts#overviewStationLines — 'every returned line's station value is identical for imperial and metric' across every board preset; buildOverviewPdf's own drawing-loop math and coordinate helpers (stationToY, halfWidthToX, drawClosedOutline) were not touched by this plan"
        status: pass
    human_judgment: true
    rationale: "Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase — confirming the drawn page itself is visually unchanged (curve, stringer, dashed lines at the same pixel/mm positions) needs a human looking at a rendered PDF page, not just the coordinate values a unit test can assert."

duration: ~12min
completed: 2026-09-06
status: complete
---

# Phase 7 Plan 03: The Overview Sheet in Metric Summary

**The Overview Sheet's spec block, length callout, widepoint offset label, station widths and dashed station names all read in the shaper's chosen units system — Metric prints sizes in centimetres, small depths in whole millimetres, one square-centimetre area figure, and a widepoint merge decision that honestly differs by system's own print precision — while Imperial stays byte-for-byte what it always printed.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- **The spec block reads in the chosen system.** `overviewSpecLines(outline, geometry, system)` routes every line through `lib/geometry/measure-display.ts` by what the number *is*: Length through `formatLength` (`188.0 cm` metric, `6'2"` imperial unchanged), Nose/Widepoint Width and Tail Block through `formatDim`, WP Offset through `formatSignedDim`, Swallow/Diamond Depth through `formatMark` (whole millimetres), and the two `@12"` station names inside the Nose/Tail Width labels through `stationLabel`. The area line reads one square-centimetre figure on Metric with the `sq ft` parenthetical dropped entirely, and kept exactly as it prints today on Imperial.
- **The drawing's own text reads in the chosen system.** `overviewLengthLabelText` drops Imperial's `6'0" - 72"` dual form for Metric's single `formatDim` figure (there is no metric counterpart to feet-and-inches). `overviewWpOffsetLabelText` decides its direction word from the printed magnitude in the active system — `0"` on Imperial, `0.0 cm` on Metric — so an offset too small to show a direction prints unsigned rather than a nonsensical "0 forward". A new `overviewStationWidthText(halfWidth, system)` wraps `formatDim` for the drawing loop's own station-width figure, so a Metric sheet reads centimetres beside every dashed line rather than millimetres.
- **The dashed station names and the precision trap.** `overviewStationLines(geometry, system)` names the two twelve-inch stations `NOSE @ 30.5 cm` / `TAIL @ 30.5 cm` on Metric via `stationLabel`, with the stations themselves never moving. The WIDEPOINT/CENTER merge decision — whether to draw one dashed line or two — now compares the printed magnitude against the *active* system's own zero form rather than a threshold pinned to one system. Because Metric prints to a millimetre (a 0.5mm zero range) and Imperial prints to a sixteenth of an inch (a ~0.79mm zero range), an offset of roughly a millimetre genuinely merges on an Imperial sheet and stays split on a Metric one — that boundary case is pinned by its own test, derived programmatically from the two systems' own formatters rather than hand-picked.
- **Imperial is provably unchanged.** Every converted function carries an explicit byte-identity test against every board preset; none of `buildOverviewPdf`'s own drawing math, coordinate helpers, or the frozen characterisation pins in `lib/geometry/template.test.ts` were touched.

## Task Commits

Each task is `tdd="true"` and followed RED → GREEN:

1. **Task 1: The Overview Sheet's spec block in the chosen system**
   - `d85245f` (test) — RED: failing tests for `overviewSpecLines`'s Metric/Imperial cases
   - `2f0a7ab` (feat) — GREEN: implement the `system` parameter and route every line through `measure-display.ts`
2. **Task 2: The length callout, the offset label and the station width figures on the drawing**
   - `c446c62` (test) — RED: failing tests for `overviewLengthLabelText`, `overviewWpOffsetLabelText`, and the new `overviewStationWidthText`
   - `e79b3e7` (feat) — GREEN: implement all three
3. **Task 3: The dashed station names, and the widepoint merge at each system's own precision**
   - `c370140` (test) — RED: failing tests for `overviewStationLines`'s Metric station names, identical-station-values guarantee, and the merge-threshold boundary case
   - `63934ae` (feat) — GREEN: implement the `system` parameter and the active-system merge decision

**Plan metadata:** committed alongside this SUMMARY (worktree mode — STATE.md/ROADMAP.md excluded, owned by the orchestrator after the wave completes).

## Files Created/Modified

- `components/template/build-overview-pdf.ts` — `overviewSpecLines`, `overviewLengthLabelText`, `overviewWpOffsetLabelText` and `overviewStationLines` each gain a required `system: UnitsSystem` parameter; new exported `overviewStationWidthText(halfWidth, system)`; `buildOverviewPdf` threads `options.system` into all five call sites
- `components/template/build-overview-pdf.test.ts` — every existing call site updated with an explicit `system` argument; new Metric cases and explicit Imperial byte-identity cases added for every converted function; `buildOptions` test helper gained an optional `system` parameter (default `"imperial"`)

## Decisions Made

- **`formatLength`, not `formatDim`, for the spec block's Length line.** See `key-decisions` above — this reconciles the plan's own worked Metric example (`188.0 cm`) with its Imperial byte-identity requirement, since `formatDim`'s Imperial branch (`formatInchesFraction`) would have changed the Length line's Imperial output from `6'2"` to a bare inch fraction.
- **`overviewStationWidthText` extracted for testability**, extending the exact precedent Plan 01 set with `scaleSquareCaptionText` for the same reason: a value composed inline inside a `doc.text()` call has no return value a unit test can assert against.
- **The merge-threshold boundary offset is derived programmatically inside the test**, scanning candidate offsets for the first one where Imperial's `formatDim` reads its own zero form (`0"`) but Metric's does not (`"0.0 cm"` vs. something else) — never a hand-picked millimetre figure, per CLAUDE.md Rule 1 and the plan's own explicit instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Extracted `overviewStationWidthText` for testability**
- **Found during:** Task 2
- **Issue:** The plan's acceptance criteria require a test asserting the station-width figure beside each dashed line reads in centimetres on Metric and carries no millimetre unit, but the value was composed inline inside a `doc.text()` call in the drawing loop with no return value to assert against — the same gap Plan 01 hit with the scale-square caption.
- **Fix:** Extracted the composition into a new exported `overviewStationWidthText(halfWidth: number, system: UnitsSystem): string`, called by the drawing loop. Additive only — no existing behavior changed, and it follows this file's own established "export text-composing functions for testability" idiom (`overviewSpecLines`, `overviewLengthLabelText`).
- **Files modified:** `components/template/build-overview-pdf.ts`
- **Verification:** `overviewStationWidthText("metric")` and `overviewStationWidthText("imperial")` are asserted directly in `build-overview-pdf.test.ts`, including an explicit byte-identity check against `formatInchesFraction` for Imperial.
- **Committed in:** `e79b3e7` (Task 2 GREEN commit)

**2. [Rule 1 - Bug, caught before it landed] Used `formatLength` instead of `formatDim` for the spec block's Length line**
- **Found during:** Task 1, while writing the RED test
- **Issue:** The plan's action text groups Length with the other dims-family values under "use `formatDim`", but the spec block's Length line has always printed `formatFeetInches` (`6'2"`), not `formatInchesFraction`. Following the plan's literal wording would have broken the plan's own Imperial byte-identity requirement.
- **Fix:** Used `formatLength` (Imperial branch: `formatFeetInches`, unchanged; Metric branch: the same `formatCentimetres` + `cm` composition `formatDim` uses) — satisfying both the plan's own worked Metric example and its Imperial byte-identity truth.
- **Files modified:** `components/template/build-overview-pdf.ts`, `components/template/build-overview-pdf.test.ts`
- **Verification:** The byte-identity test asserts `lines[0]` equals `Length: ${formatLength(preset.outline.length, "imperial")}` and still contains a `'` (the feet mark), across every board preset.
- **Committed in:** `2f0a7ab` (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical functionality/testability, 1 bug caught pre-implementation)
**Impact on plan:** Both are small, in-scope corrections needed to satisfy the plan's own acceptance criteria and must-have truths. No scope creep — no file outside the plan's `files_modified` list was touched.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase`, no mid-plan `checkpoint:human-verify` was raised. The following is deferred to the phase's end-of-phase UAT pass:

- **Visual check of an exported Metric Overview Sheet PDF.** Confirm on an actual rendered page that the spec block (`Length: 188.0 cm`, depths in whole mm, one area figure in cm²), the length callout above the drawing, the dashed station names (`NOSE @ 30.5 cm` / `TAIL @ 30.5 cm`), and the widepoint offset label all read correctly, do not overlap or clip, and that the drawn board (curve, stringer, dashed lines) sits at the same page position as the Imperial export.
- **Visual check that the Imperial Overview Sheet is unchanged.** A shaper who has never touched the units chooser should see the exact same page they saw before this phase.
- **The widepoint-merge boundary case in practice.** Confirm that a board whose widepoint offset happens to fall in the narrow window where Imperial merges the WIDEPOINT/CENTER line and Metric keeps them separate reads sensibly on both printed sheets, not just in the unit test.

## Issues Encountered

None beyond the two auto-fixes documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The Overview Sheet is now fully converted (spec block, length callout, offset label, station widths, station names) — all four print surfaces named in the phase's scope (Full Sized Template, Paper Saver, Overview Sheet, order form) now have their own plan either landed or in flight.
- `overviewStationWidthText` is a new, small exported surface available for reuse if a future plan needs the same station-width figure elsewhere.
- `lib/units-isolation.test.ts`'s conversion ledger has not yet been extended to `build-overview-pdf.ts` — this plan did not touch that file, per its own `files_modified` scope; that is explicitly Plan 05's work (per 07-01's own summary and this phase's CONTEXT.md).
- No blockers. The frozen characterisation pins in `lib/geometry/template.test.ts` remain untouched and green on their original digests.

## Self-Check: PASSED

All files referenced in this summary exist on disk (`components/template/build-overview-pdf.ts`,
`components/template/build-overview-pdf.test.ts`, this SUMMARY.md), and all six commit hashes
(`d85245f`, `2f0a7ab`, `c446c62`, `e79b3e7`, `c370140`, `63934ae`) are present in `git log`.

---
*Phase: 07-metric-on-paper*
*Completed: 2026-09-06*
