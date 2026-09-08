---
phase: 08-the-rails-screen-finished
reviewed: 2026-09-08T08:06:13Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - app/actions/print-instructions.ts
  - app/design/rails/actual-size.css
  - app/design/rails/page.tsx
  - app/design/summary/order-form.css
  - app/layout.tsx
  - components/print-instructions-provider.tsx
  - components/rails/rail-band-editor.tsx
  - components/rails/rail-callouts.test.ts
  - components/rails/rail-callouts.ts
  - components/rails/rail-controls.tsx
  - components/rails/rail-instructions.tsx
  - components/rails/rail-plan-side-figure.tsx
  - components/rails/rail-reference-paths.test.ts
  - components/rails/rail-reference-paths.ts
  - components/rails/rail-section-plot.tsx
  - components/rails/view-full-sized-dialog.test.ts
  - components/rails/view-full-sized-dialog.tsx
  - components/summary/order-form.tsx
  - components/summary/rail-instructions-sheet.test.ts
  - components/summary/rail-instructions-sheet.tsx
  - components/viewer/two-option-toggle.test.ts
  - components/viewer/two-option-toggle.tsx
  - drizzle/0003_early_pete_wisdom.sql
  - drizzle/meta/_journal.json
  - lib/db/ownership.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/geometry/rail-bands.test.ts
  - lib/preference-handoff.test.ts
  - lib/preference-handoff.ts
  - lib/print-instructions-preference.test.ts
  - lib/print-instructions-preference.ts
  - lib/print-instructions-server.ts
  - lib/units-isolation.test.ts
  - lib/units-preference.ts
  - scripts/extract-prototype-rails-golden.mjs
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-09-08T08:06:13Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

Reviewed the rails screen's finishing work: the INSTRUCTIONS tab and example rail (08-01), the
generic preference-handoff extraction and the print-instructions account preference (08-02), the
plan/side reference figure (08-03), the "View Full Sized" dialog (08-04), and the order form's
third print sheet plus the sidebar/summary mirror checkbox (08-05).

This is careful, well-tested work. Specific things I checked and found sound:

- `lib/preference-handoff.ts`'s generic handoff and write-queue rules are a faithful, behavior-
  preserving generalization of `lib/units-preference.ts`'s original `decideUnitsHandoff` /
  `createUnitsWriteQueue` — I diffed the pre-refactor `lib/units-preference.ts` against the new
  delegating version line-by-line and the five-branch handoff logic and the write-queue's success/
  failure/retry state machine are identical, just parameterized over `T` (with a `hasDesired` flag
  correctly substituting for the old `desired !== null` sentinel, which matters for a boolean `T`
  where `false` is a legitimate value).
- `components/print-instructions-provider.tsx` mirrors `components/units-provider.tsx` exactly,
  including the two fixes an earlier review caught on the units side (WR-01's serialized
  last-pick-wins write queue, WR-02's `reconciledRef` flash guard) and correctly uses `??` rather
  than `||` so a legitimate stored `false` is never overwritten by the fallback.
- `app/actions/print-instructions.ts` and the DB schema/migration/ownership tests match
  `app/actions/units.ts`'s pattern one-for-one: `auth()` before any DB call, no client-suppliable
  owner parameter, a nullable column with no default, runtime `typeof` validation of the
  wire-supplied value.
- No stray `25.4`/`10` conversion factors were introduced outside `lib/geometry/units.ts` in any
  of the changed files (verified by grep across the full file list).
- `components/template/*` and `lib/geometry/rail-bands.ts` are untouched by this phase, as required.
- The order form's page-1/page-2 body content is byte-for-byte unchanged when the print preference
  is unticked (confirmed by diffing the introducing commits) — only the page marks' `of N`, the
  footer note, and the new mirror checkbox changed, and the third sheet is additive and
  conditionally rendered.
- `useOrderFormPrintFit`'s sheet-fitting logic walks `[data-order-form-sheet]` generically via
  `querySelectorAll`, so it required no changes to correctly size a third sheet.
- All 254 relevant tests pass and `tsc --noEmit` reports no errors.

Two real defects worth fixing, and one maintainability note, below.

## Warnings

### WR-01: Printing the Rails screen without opening "View Full Sized" produces a blank page

**File:** `app/design/rails/actual-size.css:28-30` (the `[data-print-hide]` rule), combined with
`components/rails/rail-band-editor.tsx:208` (`data-print-hide` on the screen's root) and
`components/rails/view-full-sized-dialog.tsx` (the dialog's content only exists in the DOM while
`open` is `true`).

**Issue:** Before this phase, `/design/rails` had no print-specific CSS at all. This phase adds
`actual-size.css`, imported unconditionally by `app/design/rails/page.tsx`, whose `@media print`
block applies `[data-print-hide] { display: none !important; }` to the entire rails-screen root
(sidebar, tab strip, VIEWER/DATA/INSTRUCTIONS content) — unconditionally, not gated on whether the
"View Full Sized" dialog is actually open. The dialog is the *only* surviving print content, but
Base UI's `Dialog` does not render its popup into the DOM at all while `open` is `false`.

The result: a shaper who is on the Rails screen and prints directly — browser Cmd/Ctrl+P, the OS
print menu, or any other path that doesn't go through the dialog's own "Print" button — gets a
completely blank sheet of paper, silently, with no error and no on-page explanation. The
documented, tested path (open the dialog, click its own Print button) works correctly; this is a
gap in the untested, but entirely reachable, direct-print path.

**Fix:** Either gate the `[data-print-hide]` hiding on a runtime "the dialog is actually printing"
signal (the same `data-printing` attribute pattern `useOrderFormPrintFit` already uses for the
Summary screen), so a direct print falls back to printing the visible screen rather than nothing,
or — if a blank fallback is judged acceptable — add a print-only message explaining that the
shaper should use "View Full Sized" to print a rail, so the printed output is never silently empty:

```css
/* Fallback: only hide the editor chrome when the dialog is actually the thing being printed. */
[data-view-full-sized-dialog][data-printing] ~ [data-print-hide],
```
(or equivalent JS: set a `data-printing` attribute on the dialog root inside its own `onClick`
handler right before `window.print()`, and scope the `[data-print-hide]` rule to only apply while
that attribute is present.)

### WR-02: Duplicated example-rail thickness literal risks a silent caption/drawing mismatch

**File:** `components/summary/rail-instructions-sheet.tsx:32` (`EXAMPLE_RAIL_FLAT_THICKNESS_IN = 3.5`)
vs. `components/rails/rail-instructions.tsx:41` (`EXAMPLE_RAIL_BOARD_THICKNESS_IN = 3.5`)

**Issue:** The order form's third sheet states its own example-rail thickness caption
(`formatMark(inchesToMm(EXAMPLE_RAIL_FLAT_THICKNESS_IN), system)`) from a locally duplicated
literal, documented as deliberate ("this component's own contract ... is that it never reaches
back into rail-instructions.tsx for anything beyond ExampleRailFigure itself"). But the actual
rail *drawing* beneath that caption is produced by `<ExampleRailFigure domed={false} />`, which
internally computes its geometry from `rail-instructions.tsx`'s own
`EXAMPLE_RAIL_BOARD_THICKNESS_IN` via `exampleRailThickness(false)`. Nothing pins these two
literals to the same value — no test in `rail-instructions-sheet.test.ts` or elsewhere asserts
they agree. If a future change to the prototype-matched example rail's thickness in
`rail-instructions.tsx` is made without updating the sheet's own copy (a very plausible miss, since
they live in different files with no shared constant or cross-reference test), the printed third
sheet would silently caption the drawing with the wrong number — exactly the kind of drift this
phase's other duplicated constants (thankfully) guard against with parity tests.

**Fix:** Either import `exampleRailThickness` from `rail-instructions.tsx` and call
`exampleRailThickness(false)` (a pure function, not "the tab's own toggle or legend state" that the
component's contract disclaims reaching into) instead of duplicating the literal, or add a
source-contract test asserting the two literals are numerically equal, the same way
`components/viewer/two-option-toggle.test.ts` pins byte-identical class strings across two files.

## Info

### IN-01: `rail-band-editor.tsx`'s dev-only preset export logs to the console unconditionally when clicked

**File:** `components/rails/rail-band-editor.tsx:100`

**Issue:** `handleCopyPreset` calls `console.log(text)` whenever the "Copy preset values" button is
clicked. The button itself is gated behind `process.env.NODE_ENV === "development"`, so this never
executes in a production build's reachable UI, and it follows the same pattern already established
elsewhere in the codebase (e.g. `outline-editor.tsx`) — not a defect introduced by this phase, but
worth noting since a bundler that fails to fully dead-code-eliminate the gated branch (e.g. a
future refactor that hoists `handleCopyPreset` out of the conditional) would resurface it.

**Fix:** No action required; noted for completeness only.

---

_Reviewed: 2026-09-08T08:06:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
