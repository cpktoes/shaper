---
phase: 08-the-rails-screen-finished
fixed_at: 2026-09-08T01:10:45Z
review_path: .planning/phases/08-the-rails-screen-finished/08-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-09-08T01:10:45Z
**Source review:** .planning/phases/08-the-rails-screen-finished/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning, `fix_scope: critical_warning`): 2
- Fixed: 2
- Skipped: 0
- Excluded from scope: 1 (IN-01, an Info-tier finding — `fix_scope: critical_warning` does not
  include Info findings, and the orchestrator explicitly named it pre-existing and out of this
  phase's scope; documented below for completeness, not counted against `findings_in_scope`)

## Fixed Issues

### WR-01: Printing the Rails screen without opening "View Full Sized" produces a blank page

**Files modified:** `app/design/rails/actual-size.css`, `components/rails/view-full-sized-dialog.test.ts`
**Commit:** `88adf18`
**Applied fix:** Scoped every rule in `actual-size.css`'s `@media print` block to only apply while
the "View Full Sized" dialog's popup is actually present in the DOM, using CSS `:has()` against
the dialog root's own `data-view-full-sized-dialog` attribute (the popup is portalled to the end of
`<body>`, so `body:has([data-view-full-sized-dialog])` is true exactly while the dialog is open):
- `html, body { ... }` became `html:has([data-view-full-sized-dialog]), body:has([data-view-full-sized-dialog]) { ... }`.
- `[data-print-hide] { display: none !important; }` became `body:has([data-view-full-sized-dialog]) [data-print-hide] { ... }`.
- `[data-slot="dialog-overlay"] { display: none !important; }` became `body:has([data-view-full-sized-dialog]) [data-slot="dialog-overlay"] { ... }`.
- The rules that already start with `[data-view-full-sized-dialog]` or `[data-actual-size-box]`
  were left unchanged — they already only match while the dialog exists.

Updated the file's header comment to explain, in plain English, that with the dialog closed this
stylesheet is a no-op — a direct print of the rails screen (browser Cmd/Ctrl+P, the OS print menu,
any path that skips the dialog's own Print button) prints the screen exactly as it did before this
phase — and that with the dialog open, any print path prints only the actual-size rail. No runtime
`data-printing` attribute or JS change was introduced; the CSS guard alone is the fix, per the
orchestrator's design.

Added a source-contract test to `components/rails/view-full-sized-dialog.test.ts` ("hides the rails
screen from print only while the dialog is open (WR-01)") that reads `actual-size.css` and asserts
(a) the file contains the guarded `body:has([data-view-full-sized-dialog]) [data-print-hide]`
selector, and (b) every line in the file mentioning `[data-print-hide]` also carries the
`:has([data-view-full-sized-dialog])` guard — so no future edit can silently unscope the rule.

### WR-02: Duplicated example-rail thickness literal risks a silent caption/drawing mismatch

**Files modified:** `components/rails/rail-instructions.tsx`, `components/summary/rail-instructions-sheet.tsx`, `components/summary/rail-instructions-sheet.test.ts`
**Commit:** `a34b026`
**Applied fix:** Exported the existing pure function `exampleRailThickness(domed: boolean): Mm`
from `components/rails/rail-instructions.tsx` (added `export`; body unchanged). In
`components/summary/rail-instructions-sheet.tsx`, deleted the local
`EXAMPLE_RAIL_FLAT_THICKNESS_IN` constant and its "duplicated here deliberately" comment, imported
`exampleRailThickness` alongside `ExampleRailFigure` from `@/components/rails/rail-instructions`,
and changed the caption to `formatMark(exampleRailThickness(false), system)`. Dropped the now-unused
`inchesToMm` import (confirmed no other use in the file). Replaced the deleted comment with one
sentence noting the caption and the drawing now read the same value and so cannot drift apart
(D-08: always the Flat rail).

Widened the existing test "imports only ExampleRailFigure from rail-instructions..." in
`rail-instructions-sheet.test.ts` to expect the sorted import list
`["ExampleRailFigure", "exampleRailThickness"]` and renamed it to describe both names. Added a new
assertion that the sheet's source contains `exampleRailThickness(false)` and no longer contains a
`3.5` literal.

## Excluded from Scope

### IN-01: `rail-band-editor.tsx`'s dev-only preset export logs to the console unconditionally when clicked

**File:** `components/rails/rail-band-editor.tsx:100`
**Reason:** Excluded by `fix_scope: critical_warning` (this is an Info-tier finding, not a Critical
or Warning finding) and explicitly named by the orchestrator as pre-existing and out of this
phase's scope. No edit attempted; not counted against `findings_in_scope`.
**Original issue:** `handleCopyPreset` calls `console.log(text)` when the dev-only "Copy preset
values" button is clicked. The button is gated behind `process.env.NODE_ENV === "development"`, so
this never executes in a production build's reachable UI. The reviewer noted it only as a
completeness observation ("No action required; noted for completeness only") — not a defect
introduced by this phase.

## Verification

Both fixes were made and verified in the main checkout at `/Users/kontoes/Code/shaper` (no
worktree was used, per this task's explicit instruction) — the numbers below are reproducible
directly from this tree.

- `npx vitest run components/rails components/summary lib/units-isolation.test.ts` — 7 test files,
  73 tests, all passed.
- `npm test` (full suite) — 41 test files, 2208 tests passed, 2 skipped (pre-existing skips,
  unrelated to these fixes), 0 failed.
- `npm run build` — Next.js 16.3.1 (Turbopack) production build: compiled successfully, TypeScript
  check finished with no errors, static pages generated 10/10, exited 0.

---

_Fixed: 2026-09-08T01:10:45Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
