---
phase: 03-volume-templates-verified-math
plan: 01
subsystem: templates
tags: [jspdf, pdf-export, geometry, print]

requires:
  - phase: 01-foundation
    provides: lib/geometry/outline.ts (OutlineGeometry, buildOutline) and lib/geometry/units.ts (formatFeetInches, formatInchesFraction)
provides:
  - Pure tile-layout math for a two-dimensional, multi-page printable board template (lib/geometry/template.ts)
  - The one jsPDF-importing module that draws a real, 1:1-scale, multi-page PDF (components/template/build-template-pdf.ts)
  - An Export Template button on the outline editor's viewer toolbar
affects: [03-02, 03-03, 03-04, template-preview-dialog]

actuals:
  tokens: 11000
  tasks: 1
  commits: 1

tech-stack:
  added: [jspdf@^4.2.1]
  patterns:
    - "Half-outline printable template: two-dimensional tile grid (rows = station bands nose-to-tail, columns = half-width bands stringer-outward), fixed-size sliding windows stepped by (usable page dimension - overlap) so every consecutive pair overlaps by exactly TEMPLATE_OVERLAP_MM"
    - "The one module per drawing surface that imports the drawing library (jsPDF) — everything else computes plain data"

key-files:
  created:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts
  modified:
    - lib/geometry/outline.ts
    - vitest.config.ts
    - components/outline/outline-editor.tsx
    - package.json

key-decisions:
  - "computeTemplateLayout builds fixed-size sliding windows (constant step = usable - overlap) rather than clamping the last row/column to the board's own edge — this keeps the exact-overlap invariant trivially true for every consecutive pair, at the cost of a little blank paper past the board's own tail/outward edge on the last page in each direction"
  - "Board name + dims block is drawn on the page satisfying (col === 0 AND centre station within stationRange) — restricting to column 0 guarantees stringer-side interior room on every preset board without measuring the curve's actual half-width at that station"
  - "Scale-check square label kept as plain 'x' (not the UI-SPEC's '×') to match this plan's own PLAN.md action text and Task 2 checkpoint wording verbatim, so the human verifier's checklist matches the printed page exactly"

requirements-completed: []

coverage:
  - id: D1
    description: "Template layout math (computeTemplateLayout, computeTemplateMarks) covers every sampled outline point, overlaps consecutive tiles by exactly TEMPLATE_OVERLAP_MM, and tiles multi-column at the 25in maximum widepoint width, for both Letter and A4"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildTemplatePdf produces a real PDF whose page count matches the layout and whose output begins with the PDF magic bytes"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pressing Export Template on /design/outline downloads a real multi-page PDF at true 1:1 physical size — confirmed with a ruler against the nose page's 2in scale-check square"
    requirement: TMPL-01
    verification:
      - kind: manual
        ref: "03-01-PLAN.md Task 2"
        status: pass
    human_judgment: true
    rationale: "True 1:1 physical print scale can only be confirmed by printing the PDF at 100% and measuring the printed 2in square with a physical ruler — no automated test can verify a printer's or PDF viewer's real-world output scale. User printed page 1 at 100% scale and measured the scale-check square with a physical ruler: it read exactly 2 inches on both sides. Approved."

duration: ~50min
completed: 2026-08-28
status: complete
---

# Phase 03 Plan 01: 1:1 Printable Template Export (Tracer) Summary

**Export Template button on the outline editor downloads a real multi-page, true-1:1-scale PDF of the board's half-outline via a new pure tile-layout module (`lib/geometry/template.ts`) and the codebase's one jsPDF-importing renderer (`components/template/build-template-pdf.ts`); the physical ruler check confirmed the printed scale-check square measures exactly 2 inches on both sides.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-08-28
- **Tasks:** 2 of 2
- **Files modified:** 9

## Accomplishments

- New `lib/geometry/template.ts`: pure, two-dimensional tile-layout math (`computeTemplateLayout`, `computeTemplateMarks`) that tiles the half-outline rectangle (station 0..length by half-width 0..halfWidePointWidth) into a row-major, nose-to-tail page grid for both Letter and A4, with exact `TEMPLATE_OVERLAP_MM` overlap between every consecutive pair and multi-column tiling proven at the 25in maximum widepoint width.
- New `components/template/build-template-pdf.ts`: the one module in the codebase that imports jsPDF. Draws the outline curve (0.5mm), the dashed stringer edge (0.35mm, half/spin-template spine per D-05), the nose page's 2in×2in scale-check square (D-07), a page label on every page, and a board-name/dims block (D-08) on the page containing the board's centre station — dims formatted only through `formatFeetInches`/`formatInchesFraction`.
- `lib/geometry/outline.ts`'s `MEASURE_STATION_MM` exported (was private) so the 12" measuring station has exactly one definition in the codebase; `template.ts` imports it rather than re-deriving `inchesToMm(12)`.
- `vitest.config.ts` widened to also collect `components/**/*.test.ts` — before this change `build-template-pdf.test.ts` would have silently collected zero tests.
- Export Template button (download icon, `right-10`, beside the existing rotate button at `right-0`) added to the outline editor's viewer toolbar, wired to `downloadTemplatePdf` with the live `outlineGeometry`, `boardName`, `templateValues`, and `railValues`.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "export a 1:1 template PDF" — one path only** - `799c572` (feat)
2. **Task 2: Measure the printed scale square with a ruler** - `checkpoint:human-verify`, no code commit (verification-only task); resolved and recorded in `docs(03-01): complete plan after ruler-verified 1:1 checkpoint`

Task 2 outcome: the user ran `npm run dev`, opened `/design/outline`, pressed Export Template, printed page 1 at 100% scale with "Fit to page" off, and measured the printed 2"×2" scale-check square with a physical ruler — it read exactly 2 inches on both sides. The remaining pages showed a continuous outline curve nose to tail, the dashed stringer line, per-page labels, and the board name/dims block sitting in the board's interior. Approved.

## Files Created/Modified

- `lib/geometry/template.ts` - `PaperSize`, `PAPER_MM`, `TEMPLATE_MARGIN_MM`, `TEMPLATE_OVERLAP_MM`, `TemplatePage`, `TemplateLayout`, `TemplateMarks`, `computeTemplateLayout`, `computeTemplateMarks`
- `lib/geometry/template.test.ts` - Coverage/overlap/page-count/label invariants for both paper sizes, plus the max-widepoint multi-column case
- `components/template/build-template-pdf.ts` - `buildTemplatePdf`, `templateFileName`, `downloadTemplatePdf`
- `components/template/build-template-pdf.test.ts` - Page-count and PDF-magic-bytes smoke test
- `lib/geometry/outline.ts` - `MEASURE_STATION_MM` now exported
- `vitest.config.ts` - `include` widened to `components/**/*.test.ts`
- `components/outline/outline-editor.tsx` - Export Template button + `handleExportTemplate`
- `package.json` / `package-lock.json` - `jspdf@^4.2.1` added

## Decisions Made

- Fixed-size sliding windows (constant step) for tile geometry, rather than clamping the last row/column to the board's exact edge — keeps the overlap invariant exact for every consecutive pair at the cost of some blank paper past the board's own edge on the final page in each direction.
- Name/dims block anchored to column 0 of the page containing the board's centre station, giving guaranteed stringer-side interior room without needing to sample the curve's actual half-width at that station.
- Scale-square label kept as literal `2" x 2" — measure before taping` (plain "x"), matching this plan's own PLAN.md action text and Task 2's checkpoint instructions verbatim, even though 03-UI-SPEC.md's Copywriting Contract uses "×" — the plan text I am executing is the operative instruction, and matching it exactly keeps the printed page consistent with what the human verifier is told to look for.

## Deviations from Plan

None - Task 1 executed exactly as written, including the D-05/D-07/D-08 print-artifact details from 03-UI-SPEC.md.

## Issues Encountered

None for Task 1. `npx tsc --noEmit` reports two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` and `app/layout.tsx` — these are the known worktree-only phantom errors documented in this agent's environment constraints (Next.js's generated route types aren't visible from a worktree checkout), not caused by this plan's changes; confirmed by filtering them out and finding zero other type errors.

## Next Phase Readiness

**Plan is complete.** Both tasks are done: Task 1's automated work is committed and green, and Task 2's physical ruler check is approved — the printed scale-check square measured exactly 2 inches on both sides, confirming the PDF's 1:1 physical scale is honest.

**What's ready:** All of Task 1's automated work is committed (782/782 vitest tests pass at the time of Task 1's commit, `npx tsc --noEmit` clean apart from the pre-existing worktree artifact noted above, `npm run lint` reports 0 errors). The Export Template button is live on `/design/outline` and produces a real downloadable PDF verified at true 1:1 scale. Later plans in Phase 03 (the preview dialog, working match marks, the name-block truncation refinement) can build on this layout/renderer pair with confidence that the 1:1 scale claim is real.

## Self-Check: PASSED

- FOUND: lib/geometry/template.ts
- FOUND: lib/geometry/template.test.ts
- FOUND: components/template/build-template-pdf.ts
- FOUND: components/template/build-template-pdf.test.ts
- FOUND commit: 799c572

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
