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

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
