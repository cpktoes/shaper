---
phase: 03-volume-templates-verified-math
plan: 04
subsystem: templates
tags: [dialog, base-ui, shadcn, pdf-export, ui]

requires:
  - phase: 03-volume-templates-verified-math
    provides: "lib/geometry/template.ts (computeTemplateLayout, computeTemplateMarks, PaperSize) and components/template/build-template-pdf.ts (downloadTemplatePdf) from plan 03-01"
provides:
  - "components/template/export-preview-dialog.tsx: a shared, preview-first export dialog (paper picker, tile-grid diagram, page-count copy, download/error states) taking a trigger element so any screen can supply its own entry button"
  - "Both the Template screen toolbar and the Summary screen action row now open the same dialog instead of downloading a PDF directly on click"
affects: [03-05, 03-06, 03-07]

actuals:
  tokens: 4100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Dialog composed entirely from existing shadcn/Base UI primitives (Dialog/DialogTrigger/DialogContent/DialogFooter), driven by a `trigger` prop the caller supplies as a full React element — Base UI's DialogTrigger `render` prop auto-manages aria-expanded/aria-haspopup on that element, so the caller's own `aria-expanded:...` Tailwind classes can style the open state with no state threaded back out of the dialog"
    - "A ref-guarded generating flag (state for the UI, a ref for synchronous double-click protection) plus a deferred setTimeout(0) so a disabled-button re-render actually paints before a possibly-non-trivial synchronous jsPDF build runs"

key-files:
  created:
    - components/template/export-preview-dialog.tsx
  modified:
    - components/outline/outline-editor.tsx
    - components/summary/order-form.tsx

key-decisions:
  - "Paper-size picker's selected state uses the outline Button variant's aria-pressed:bg-muted/aria-pressed:text-foreground treatment, not an accent fill — the UI spec reserves accent strictly for the Download PDF button and the tile diagram's nose-page badge, and the picker is a third surface, not one of those two"
  - "Tile diagram cell size is derived (not fixed): computeDiagramSizing solves for the largest cell width that keeps the full rows x columns grid, at the selected paper's own portrait aspect ratio, inside a fixed 260x280px budget — this is what keeps a 25in-widepoint board's multi-column grid inside the dialog rather than pushing it wider (Task 3's held-out visual check)"
  - "Error copy rendered as a JS string expression ({\"Couldn't build the PDF — try again.\"}) rather than JSX text with an &apos; entity — matches the codebase's existing apostrophe-in-string convention (rename-dialog.tsx, delete-confirm-dialog.tsx) and keeps the literal copy grep-able in the source file"
  - "ExportPreviewDialog reads useDesign() itself rather than taking design props — both screens already share the same live store, so no prop threading was needed to wire the Summary screen's second entry point"

requirements-completed: [TMPL-01]

coverage:
  - id: D1
    description: "ExportPreviewDialog composes a preview-first flow: title, description, Letter/A4 picker (Letter default), tile-grid diagram sized to the board's own proportions, page-count copy (singular/plural), Download PDF and Cancel — no PDF bytes are built until Download is pressed"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exit 0), npm run lint (0 errors), npm test (806/806 pass)"
        status: pass
      - kind: other
        ref: "grep verification of every fixed copy string, computeTemplateLayout/downloadTemplatePdf/useState presence, absence of design-store mutators, zero components/ui/ diff, zero hex-color literals — all per the plan's acceptance_criteria"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both the Template screen toolbar (outline-editor.tsx) and the Summary screen action row (order-form.tsx) open the same ExportPreviewDialog under the same 'Export Template' label; the Summary entry point stays inside the existing data-print-hide wrapper so it never appears on the printed sheet"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exit 0), npm run lint (0 errors), npm test (806/806 pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Walking the export dialog from both screens end to end, including the 25in-widepoint held-out visual check (Task 3 checkpoint) — dialog opens with the right copy/default, paper switch changes the diagram and page count, Download produces a file, the wide-board tile grid stays inside the dialog without crowding, the Summary button is absent from print preview, and the dialog reads correctly in all four themes"
    verification:
      - kind: manual
        ref: "Browser walk-through against the live dev server on main after merge: dialog opens from the Template screen toolbar with the exact title/description copy; Letter selected by default (aria-pressed confirmed) with '16 pages — tape nose to tail.' at 6'0\"x19\"; switching to A4 updates the count to 14 and redraws the tile diagram (2x8 to 2x7); Download PDF executes and closes the dialog with zero console errors; the 25in widepoint board's tile diagram renders comfortably inside the dialog (two columns, not overflowing or squashed); the Summary screen's Export Template button sits beside Print Order Form inside the existing data-print-hide row, opens the identical dialog, and `[data-print-hide] { display: none !important }` was confirmed in the print stylesheet; theme readability approved by the user."
        status: pass
    human_judgment: true
    rationale: "Required a running dev server and a real browser (visual crowding/legibility of the tile diagram at the 25in-widepoint extreme, print-preview absence, four-theme readability) — none of this is assertable from a unit test. The dev server could not run inside the original worktree (Turbopack worktree limitation), so this checkpoint was verified by the orchestrator against main after merge and approved by the user."
duration: ~30min
completed: 2026-08-28
status: complete
---

# Phase 3 Plan 04: Export Preview Dialog (Preview-First Template Export) Summary

**A shared `ExportPreviewDialog` — Letter/A4 picker, tile-grid diagram sized to the board's own proportions, singular/plural page-count copy, Download PDF / Cancel — now sits behind the Template screen's toolbar button and a matching new Summary screen button, replacing the direct-download click from plan 03-01 with a genuine preview-before-build flow.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-28
- **Tasks:** 3 of 3 (Task 3's checkpoint verified and approved after merge to main)
- **Files modified:** 3

## Accomplishments

- New `components/template/export-preview-dialog.tsx`: exports `ExportPreviewDialog`, a client component built entirely from existing `Dialog`/`Button` shadcn primitives, taking a `trigger` React element so either screen can supply its own entry button while sharing one implementation. Local `useState` only (paper pick, generating, error) — no new design-store field.
- Tile-grid preview recomputed via `computeTemplateLayout` in a `useMemo` on every paper-size change (pure, synchronous, no loading state needed); the nose page (index 0) carries the one accent-filled badge, matching the UI spec's accent reservation.
- `computeDiagramSizing` derives the diagram's cell size from the actual `rows`/`columns`/paper aspect ratio, solving for the largest cell that fits a fixed pixel budget — this is what should keep a 25in-widepoint board's multi-column grid from overflowing the dialog (Task 3's held-out visual check, not yet human-verified).
- `Download PDF` only calls `downloadTemplatePdf` when pressed — no PDF bytes exist before that — swaps its own label to "Preparing PDF…" and disables itself while building (a ref-based guard stops a rapid double-press from starting a second generation even before React's disabled-state re-render commits), and shows "Couldn't build the PDF — try again." inline on failure, mirroring `DeleteConfirmDialog`'s existing failure-copy pattern.
- `outline-editor.tsx`'s Export Template toolbar button now opens the dialog instead of downloading directly; the old `handleExportTemplate`/`downloadTemplatePdf`/`computeTemplateLayout`/`computeTemplateMarks` wiring is gone from that file. `DialogTrigger` auto-manages `aria-expanded`/`aria-haspopup` on the button, so the "dialog is open" background is a plain `aria-expanded:...` Tailwind class, never the accent fill.
- `order-form.tsx` gains a second "Export Template" entry point inside the existing `data-print-hide` action row, beside `Print Order Form`, using the neutral `outline` Button variant (never the accent-filled treatment `Print Order Form` carries).

## Task Commits

Each task was committed atomically:

1. **Task 1: The export preview dialog** - `f479abf` (feat)
2. **Task 2: Both entry points — Template screen and Summary screen** - `482be4a` (feat)
3. **Task 3: Walk the export dialog from both screens, including a 25-inch board** - `checkpoint:human-verify`, gate `blocking` — **approved** after the browser walk-through against main post-merge, see below.

## Files Created/Modified

- `components/template/export-preview-dialog.tsx` - `ExportPreviewDialog`, `computeDiagramSizing` (new file)
- `components/outline/outline-editor.tsx` - Export Template button now opens `ExportPreviewDialog`; direct-download wiring removed
- `components/summary/order-form.tsx` - second `Export Template` entry point added inside the existing `data-print-hide` action row

## Decisions Made

- Paper-size picker's selected state uses `aria-pressed:bg-muted aria-pressed:text-foreground` on the `outline` Button variant, not an accent fill — accent is reserved strictly for Download PDF and the nose-page badge per the UI spec.
- Tile diagram sizing is fully derived (`computeDiagramSizing`), not a fixed cell size, specifically to hold the 25in-widepoint multi-column case inside the dialog.
- Error copy is a JS string expression rather than JSX text with an `&apos;` entity, matching `rename-dialog.tsx`/`delete-confirm-dialog.tsx`'s existing convention and keeping the plan's exact copy grep-able in the source.
- `ExportPreviewDialog` reads `useDesign()` itself; no props were threaded from either screen beyond the `trigger` element.

## Deviations from Plan

None — both automated tasks executed exactly as written. Task 3 (the checkpoint) is not a deviation; it is a designed stop this executor cannot resolve on its own.

## Issues Encountered

None. `npx tsc --noEmit` reports only the two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` / `app/layout.tsx` (the known worktree-only phantom errors, unrelated to this plan's changes) — filtered out and confirmed zero other type errors. `npm run lint` and `npm test` (806/806) are clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**All three tasks are complete.** Tasks 1 and 2 were committed by the original executor; Task 3's checkpoint was verified by the orchestrator against the live dev server on main after the worktree merged, walking through both entry points, the Letter/A4 switch, a real PDF download, the 25in-widepoint held-out visual check (tile diagram stayed inside the dialog, two columns, no overflow), the print-preview absence check on the Summary screen, and theme readability — all approved by the user. This plan is complete and unblocks 03-05, 03-06 and 03-07, which depend on `ExportPreviewDialog`.

**Blocked by:** Nothing. Task 3's checkpoint (gate: `blocking`) is resolved.

## Self-Check: PASSED

- FOUND: components/template/export-preview-dialog.tsx
- FOUND: components/outline/outline-editor.tsx (modified)
- FOUND: components/summary/order-form.tsx (modified)
- FOUND commit: f479abf
- FOUND commit: 482be4a

## Post-checkpoint additions

**User-requested extension, after this plan's own checkpoint was approved:** restructure the
export dialog into an artifact picker, and add a second printable artifact — a one-page
"Overview Sheet" ("Surfboard Template Specs") — alongside the existing full tiled template.

**What changed:**

- **`ExportPreviewDialog` now opens on two selectable cards** — "Overview Sheet" (every input
  value and the outline, one page) and "Full Template" (the original true-size tiled template,
  unchanged) — modeled on the user's own iShaper reference screenshot. Full Template stays the
  default selection, so the dialog's pre-existing paper-picker/tile-diagram/page-count/download
  flow regresses for nobody who doesn't touch the new picker. Card selection uses the same accent
  border+ring treatment `preset-card.tsx`/`board-rack-card.tsx` already use for hover/focus,
  driven by `aria-pressed` like the existing Letter/A4 buttons — the Download PDF button keeps the
  dialog's one accent-*filled* action regardless of which artifact is selected, per the UI spec's
  accent reservation. Picking Overview Sheet swaps the tile diagram for a one-line description
  ("1 page — all the numbers needed to recreate this board.") and routes Download through the new
  builder instead.
- **New `components/template/build-overview-pdf.ts`**: builds the Overview Sheet — a single
  portrait jsPDF page titled "Surfboard Template Specs", with every input parameter (length, nose
  angle/fullness, calculated nose width @12", widepoint width, WP offset, both rail-length values,
  tail shape/block/depth, tail angle/fullness, calculated tail width @12", template area in sq in
  and sq ft) in a monospace spec list down the left, board name printed above when set, and the
  full outline scaled to fit the page on the right — dashed stringer centerline, three labeled
  dashed reference stations (nose @12", widepoint/center merged into one station and label, tail
  @12") with a dimension value to the left of each line and a small-caps name to the right, and
  the board's length label above the outline. Ported from the prototype's own "Print Specs" popup
  (`reference/project/Template.dc.html`'s `onPrintSpecs`/`specLines`, lines 751-765 and 868-936),
  not invented — every spec line traces to a specific line in that prototype block. Two divergences
  from the prototype, both because this app's design model differs from the prototype's: (1) the
  prototype has one `Rail Length` control; this app split it into independent `tailRailLength` /
  `noseRailLength` sliders, so the sheet prints both rather than guessing which one the prototype's
  single control corresponded to; (2) `Diamond Depth` prints `geometry.effectiveDiamondDepth` (the
  depth after the 5in cap the outline engine enforces), matching the prototype's own
  `g.diamondDepthEff`, not the raw input.
- **New `lib/geometry/overview-layout.ts`** (`computeOverviewOutlineScale`): a pure helper —
  the largest uniform scale (page mm per board mm) that fits the full outline, both rails and full
  length, inside a given box without distortion — kept in `lib/geometry/` rather than inline in the
  drawing module, mirroring how `template.ts`'s own tile-layout math is kept separate from and
  testable independent of `build-template-pdf.ts`'s jsPDF calls (CLAUDE.md Rule 1).
- **`lib/geometry/units.ts`** gained `squareMmToSquareInches` — the one other place besides
  `mmToInches` that turns `MM_PER_INCH` into a real device number, so the Overview Sheet's
  "Template Area" can never drift from the same `area` field `outline.ts` already computes
  (CLAUDE.md Rule 2: never reach for 25.4 anywhere else).

**Files created:**

- `components/template/build-overview-pdf.ts` — `buildOverviewPdf`, `downloadOverviewPdf`,
  `overviewFileName`, `overviewSpecLines`, `overviewLengthLabelText`, `overviewStationLines`
- `components/template/build-overview-pdf.test.ts`
- `lib/geometry/overview-layout.ts` — `computeOverviewOutlineScale`
- `lib/geometry/overview-layout.test.ts`

**Files modified:**

- `components/template/export-preview-dialog.tsx` — artifact-picker restructure
- `lib/geometry/units.ts` — `squareMmToSquareInches`
- `lib/geometry/units.test.ts` — its tests

**Files explicitly NOT modified (per scope):** `components/template/build-template-pdf.ts` and
`lib/geometry/template.ts` — read for patterns and imported from (`wrapTextToWidth`, `PAPER_MM`,
`TEMPLATE_MARGIN_MM`), never edited.

**Verification:** `npm test` — 924/924 passing (up from 806, +118 new tests across the two new
test files and the `units.test.ts` addition). `npm run lint` — 0 errors (9 pre-existing warnings
in unrelated files, unchanged). `npx tsc --noEmit` — 0 errors beyond the same two pre-existing
worktree-only `Cannot find name 'LayoutProps'` phantom errors already documented above. Manually
built the Overview PDF for all four board presets plus both scale-bound extremes (shortest
length + widest widepoint, and longest length + narrowest widepoint) at both paper sizes — all
produced valid one-page PDF bytes with no overflow in the spec column at the actual courier 9pt
column width.

**Not yet human-verified:** the Overview Sheet's own visual layout (station-line label placement,
outline legibility at its scaled-down size, dialog card appearance across the four themes) — this
plan's original Task 3 checkpoint covered the Full Template path only; a fresh visual check of the
new artifact picker and the Overview Sheet's printed page is still outstanding, same as this plan's
own Task 3 pattern (dev server unavailable inside this worktree; Turbopack worktree limitation).

**Task commits:**

1. `228dc8f` (feat) — pure geometry helpers: `squareMmToSquareInches`, `computeOverviewOutlineScale`
2. `d3bf6e3` (feat) — the Overview Sheet PDF builder (`build-overview-pdf.ts`)
3. `73a89f9` (feat) — the dialog's artifact-picker restructure

## Self-Check (post-checkpoint additions): PASSED

- FOUND: components/template/build-overview-pdf.ts
- FOUND: components/template/build-overview-pdf.test.ts
- FOUND: lib/geometry/overview-layout.ts
- FOUND: lib/geometry/overview-layout.test.ts
- FOUND: components/template/export-preview-dialog.tsx (modified)
- FOUND commit: 228dc8f
- FOUND commit: d3bf6e3
- FOUND commit: 73a89f9

## Post-checkpoint fixes, round 2

The user printed the new Overview Sheet artifact and reported two defects, in their own words:
"The center, widepoint, and offset all should be explicitly labeled. Also, the board can be larger
on the page." Both were fixed and committed as one atomic `fix(03-04): ...` commit.

**1. CENTER, WIDEPOINT and the offset between them were not explicitly labeled.** The sheet
previously merged the widepoint and the board's own centre station into a single
"WIDEPOINT/CENTER" line always, regardless of whether they actually coincided — so a board with any
real widepoint offset (every preset except "fish") never showed where centre was, what the
widepoint's own distance from it was, or that the two were different stations at all.
`overviewStationLines` (`components/template/build-overview-pdf.ts`) now draws CENTER (the board's
own half-length station) and WIDEPOINT as two distinct dashed lines, each with its own small-caps
label and printed dimension, when the widepoint's own computed offset from centre is non-zero — plus
an explicit `WP OFFSET — 1/2" back` (or `forward`) label, wording matched to the on-screen outline
viewer's own `wpOffsetText` convention, stacked beneath the widepoint's own name. The offset used
for both the split-vs-merge decision and the printed text is computed from the two drawn stations
themselves (`geometry.widePointStation - geometry.length / 2`), not the raw `widePointOffset`
input, so the label can never disagree with where the two lines are actually drawn even when the
input gets clamped near a board's own length/margin extremes. When the offset is (near) zero, the
two stations still coincide onto one `WIDEPOINT / CENTER` line, unchanged from before, rather than
overprinting two labels on top of each other.

**2. The drawn outline was tiny — as little as a ~41mm-wide box regardless of paper size.** The
spec column was reserving 85mm plus 24/36mm of label margin either side of the drawing, which for
every real board (whose half-width budget is what usually decides the scale) left the outline
scaled down far more than the page's own generous height budget would have allowed. A new pure
function, `computeOverviewDrawingBox` (`lib/geometry/overview-layout.ts`, alongside
`computeOverviewOutlineScale`), derives the outline's own available width/height from the page
size, margins, spec-column width/gap and label reserves — kept pure and tested in `lib/geometry/`
rather than inline in the drawing module (CLAUDE.md Rule 1). The spec column was narrowed from
85mm to 60mm (the 11-line spec list never needed 85mm at 9pt courier — `wrapTextToWidth` still
wraps anything that doesn't fit, so narrowing it never clips a line) and the label reserves
tightened from 24/36mm to 16/40mm (the right reserve widened slightly to keep room for the new,
longer WP OFFSET secondary label). Together these let most boards' scale become height-bound —
using the full page height minus margins, per the user's own instruction — rather than
width-starved by an oversized spec column.
Commit: `515fa35`.

**Verification:** `npm test` (965/965, up from 924/924 baseline), `npx tsc --noEmit` (0 errors
beyond the pre-existing, worktree-only `LayoutProps` phantom errors documented above), and
`npm run lint` (0 errors, the same 9 pre-existing unrelated warnings) all pass. New/updated test
coverage: an `overviewStationLines` describe block covering the split-vs-merged cases (a
non-zero-offset preset produces four lines with the WIDEPOINT line alone carrying a
`secondaryLabel`; the zero-offset "fish" preset merges back into one `WIDEPOINT / CENTER` line;
every `BOARD_PRESETS` entry is checked for exactly one of the two shapes, never both), an
`overviewWpOffsetLabelText` describe block asserting the exact `back`/`forward` wording, and a
`computeOverviewDrawingBox` describe block in `lib/geometry/overview-layout.test.ts` (correct
width/height subtraction, never negative when reserves exceed the page, and — across every board
preset — the reclaimed box scales the outline strictly larger than the previous, cramped layout's
own box computed the same way).

## Self-Check (round 2): PASSED

- FOUND: components/template/build-overview-pdf.ts (overviewWpOffsetLabelText, secondaryLabel)
- FOUND: lib/geometry/overview-layout.ts (computeOverviewDrawingBox)
- FOUND commit: 515fa35

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
