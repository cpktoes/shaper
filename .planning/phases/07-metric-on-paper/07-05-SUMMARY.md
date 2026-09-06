---
phase: 07-metric-on-paper
plan: 05
subsystem: printing
tags: [testing, source-contract, units, typescript, pdf-export, documentation]

# Dependency graph
requires:
  - phase: 07-metric-on-paper
    provides: "07-01 through 07-04 — the units channel threaded into all three PDF builders and lib/geometry/template.ts, the order form's own conversion, and PRINT_SURFACE_DISPLAY_FILES seeded (order-form.tsx converted, the other four pending)"
provides:
  - "lib/units-isolation.test.ts's PRINT_SURFACE_DISPLAY_FILES ledger fully closed (all five entries converted:true) with its own completeness walk over components/summary/, components/template/ and lib/geometry/template.ts, an out-of-scope list naming use-print-fit.ts by name, and its own closing assertion mirroring the design-screen one"
  - "A durable source-contract describe block proving no production call site relies on lib/geometry/template.ts's imperial default: every builder call names system explicitly, export-preview-dialog.tsx reads useUnits() exactly once and hands system into every download call, no print surface restates a 25.4/2.54 conversion factor, and no print surface composes a litres figure on a line that also names the system or a display formatter"
  - "Two small production fixes discovered while honestly flipping the ledger: build-template-pdf.ts's name block and build-overview-pdf.ts's length callout now call formatLength/formatDim with an explicit \"imperial\" argument instead of formatFeetInches/formatInchesFraction directly"
  - "CLAUDE.md Rule 2's 'Where this applies today' paragraph rewritten to describe the boundary as it actually is after this phase, plus the two printed-page specifics (the scale-check square's one decimal millimetre value, and the dims-row-vs-bordered-cell unit rule)"
affects: []

# Actuals (#2632)
actuals:
  tokens: 7600
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A paren-balancing extractFirstCall(source, fnName) helper for multi-line call-site source-contract assertions, replacing a [\\s\\S]*?\\); regex that silently matched past a broken call into the NEXT call's own closing brace when the target call's own brace wasn't immediately followed by );"
    - "Print-surface ledger lists and their folder-walker/import-detection helpers hoisted to module scope (rather than nested inside a single describe callback) so two independent describe blocks can share one definition instead of duplicating it"
    - "importsUnitsModule/importsDisplayBoundary helpers that accept both the @/lib/... alias (every component) and a bare relative ./units / ./measure-display specifier (lib/geometry/template.ts, which lives inside lib/geometry/ itself)"

key-files:
  created: []
  modified:
    - lib/units-isolation.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-overview-pdf.ts
    - CLAUDE.md

key-decisions:
  - "Two of the four PRINT_SURFACE_DISPLAY_FILES entries were not honestly convertible as Plans 01/03 left them. build-template-pdf.ts's templateNameBlockDimsText and build-overview-pdf.ts's overviewLengthLabelText each called formatFeetInches/formatInchesFraction directly on their Imperial branch, because neither formatDim nor formatLength alone reproduces the exact string needed (a bare feet-inches figure with no unit repeated, and the '6\\'0\" - 72\"' dual form). Rather than mark the entries converted:true while the banned-formatter check would (correctly) fail, both call sites were changed to call formatLength/formatDim with an explicit \"imperial\" argument — the same trick order-form.tsx's own identification strip and outline-viewer.tsx's own length callout already use — which reproduces the identical byte (formatLength's imperial branch IS formatFeetInches) while keeping the file's own source free of a banned formatter name."
  - "PRINT_SURFACE_DISPLAY_FILES, PRINT_SURFACE_OUT_OF_SCOPE_FILES, the folder walker and the two import-detection helpers were moved from inside the 'design screens' describe block to module scope, because Task 2's new 'no production call site is silently imperial by omission' describe block needed the same file list and helpers and a second, duplicate list would be exactly the kind of drift this ledger exists to prevent."
  - "components/summary/use-print-fit.ts is named in a new PRINT_SURFACE_OUT_OF_SCOPE_FILES list even though it doesn't import lib/geometry/units at all (it carries its own MM_PER_INCH constant) and so the completeness walk would never have flagged it on its own — named anyway per the plan's own explicit instruction, so a human reading the ledger sees CLAUDE.md's one sanctioned exception spelled out rather than having to already know about it."
  - "The litres guard's needle is 'Litres', not 'volumeLitres': order-form.tsx and export-preview-dialog.tsx carry this value as quotedVolumeLitres (capital V mid-name), so a lowercase-v needle would have silently skipped every line in those two files and the guard would only ever have exercised build-template-pdf.ts's own dims.volumeLitres."

requirements-completed: [PRNT-01, PRNT-02, PRNT-03, PRNT-04]

coverage:
  - id: D1
    description: "Every entry in the print-surface conversion ledger (order-form.tsx, the three jsPDF builders, lib/geometry/template.ts) is converted:true, backed by a completeness walk over components/summary/, components/template/ and lib/geometry/template.ts that fails the suite the moment a new print-surface file reads lib/geometry/units without being named in either list"
    requirement: "PRNT-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts — 'every print surface is converted — the phase's closing assertion', 'every print-surface file that imports lib/geometry/units is named in one of the two lists', 'every converted:true entry imports from the display boundary', 'every converted:true entry's stripped source contains none of the banned formatters'"
        status: pass
    human_judgment: false
  - id: D2
    description: "No production call site into a label-composing function in lib/geometry/template.ts relies on its imperial default — every call in the three PDF builders names system explicitly, demonstrated by breaking one call site and observing the named-file failure"
    requirement: "PRNT-03"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts#'every builder call into a defaulted label-composing function names a system argument on the same line' — demonstrated failing (markPlacements call site with system removed) and restored before commit"
        status: pass
    human_judgment: false
  - id: D3
    description: "export-preview-dialog.tsx reads useUnits() exactly once and hands system into all three download calls — the one entry point the chosen system reaches the print path through"
    requirement: "PRNT-03"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts#'export-preview-dialog.tsx reads useUnits() exactly once and hands system into every download call' — demonstrated failing (downloadOverviewPdf's system field removed) and restored before commit"
        status: pass
    human_judgment: false
  - id: D4
    description: "No print surface restates a raw 25.4/2.54 conversion factor (use-print-fit.ts excluded by name with its reason recorded), and no print surface composes a litres figure on a line that also names the units system or a display formatter"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts#'no print surface names a conversion factor of its own' and #'no print surface composes a litres figure on a line that also names the units system or a display formatter' — both demonstrated failing and restored before commit"
        status: pass
    human_judgment: false
  - id: D5
    description: "All three frozen characterisation pins in lib/geometry/template.test.ts remain green on their original digest values at the end of the phase — nothing on paper moved"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "npx vitest run lib/geometry/template.test.ts — all three frozen describe blocks pass unedited on their original digests, run after every task including the two production fixes to build-template-pdf.ts/build-overview-pdf.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "CLAUDE.md's Rule 2 describes the units boundary as it actually is after this phase — the setup screen, the five design screens and all four print surfaces follow the chosen system — while keeping the use-print-fit.ts exception and every other section of the file untouched"
    requirement: "PRNT-02"
    verification:
      - kind: unit
        ref: "git diff --stat CLAUDE.md confines to Rule 2's 'Where this applies today' paragraph plus the two added specifics; grep confirms no lingering 'still read in inches' claim and the use-print-fit.ts sentence unchanged"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-06
status: complete
---

# Phase 7 Plan 05: The Conversion Ledger Closes On Print Summary

**Closed `lib/units-isolation.test.ts`'s print-surface conversion ledger across all four print surfaces, added a durable source-contract proof that no builder call site is silently imperial by omission, fixed two production call sites that were composing an Imperial string outside the display boundary, and rewrote CLAUDE.md's units rule to tell the truth about what now follows the chooser.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4 (`lib/units-isolation.test.ts`, `components/template/build-template-pdf.ts`, `components/template/build-overview-pdf.ts`, `CLAUDE.md`)

## Accomplishments

- **The print-surface ledger is closed.** All five entries in `PRINT_SURFACE_DISPLAY_FILES` (`order-form.tsx`, the three jsPDF builders, `lib/geometry/template.ts`) now read `converted: true`, backed by a new print-surface completeness walk (the sibling of the existing design-screen one) over `components/summary/`, `components/template/` and `lib/geometry/template.ts`, and a new `PRINT_SURFACE_OUT_OF_SCOPE_FILES` list naming `use-print-fit.ts` by name with its reason recorded. The phase's own closing assertion — mirroring the design-screen one — fails the suite the moment a print-surface entry stops being converted; demonstrated by flipping one entry back to `false`, watching the suite fail, and restoring it.
- **Two entries were not honestly convertible as written**, and marking them `converted: true` without fixing them would have been exactly the false assurance the plan's own threat model warns against (T-07-13). `build-template-pdf.ts`'s name block and `build-overview-pdf.ts`'s length callout each called `formatFeetInches`/`formatInchesFraction` directly on their Imperial branch — there is no bare `formatDim`/`formatLength` form that reproduces those exact strings. Both now call `formatLength`/`formatDim` with an explicit `"imperial"` argument instead (the same trick `order-form.tsx`'s identification strip and `outline-viewer.tsx`'s length callout already use), which reproduces the identical printed byte while keeping the file's own source free of a banned formatter name. Verified by running the full suite (including the three frozen characterisation pins) after each fix.
- **A new durable proof that no builder call site is silently imperial by omission (T-07-06).** Every call in the three PDF builders into `lib/geometry/template.ts`'s five defaulted label-composing functions (`markPlacements`, `markLineSegments`, `stripRegistrationLines`, `stripMarkSegments`, `stripLabelRows`) now has a source-contract assertion that it names `system` explicitly rather than relying on the imperial default the frozen pins need. `export-preview-dialog.tsx` is proven to read `useUnits()` exactly once and hand `system` into all three download calls — the one entry point the chosen system reaches the print path through. A "no restated factor" assertion and a litres-stays-litres guard (mirroring the existing Volume-card litres guard's per-line idiom) close out the promise this phase actually made.
- **CLAUDE.md now tells the truth.** Rule 2's "Where this applies today" paragraph no longer claims the five design screens and anything from a printer still read in inches — it names the setup screen, the five design screens, and all four print surfaces as following the chosen system, and records the two printed-page specifics a future reader would otherwise have to rediscover (the scale-check square's one decimal-millimetre value, and why the template's dims row carries its unit once while the order form's cells each carry their own). The `use-print-fit.ts` exception sentence and every other section of the file are untouched.
- All three frozen characterisation pins in `lib/geometry/template.test.ts` are unedited and green on their original digests throughout — proof that nothing a shaper cuts to moved while this plan closed the ledger.

## Task Commits

Each task was committed atomically; Task 2 (`tdd="true"`) is committed as a single `test` commit since the underlying behavior it proves (every call site already naming `system`) was already correct from Plans 01/02 — its own work was writing and demonstrating the durable assertion, not implementing new behavior:

1. **Task 1: Close the conversion ledger over all four print surfaces** — `bb51aec` (test)
2. **Task 2: Prove no print surface is silently imperial by omission** — `01084e8` (test)
3. **Task 3: Tell the truth in CLAUDE.md about what now follows the chooser** — `088b55b` (docs)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — STATE.md/ROADMAP.md excluded, owned by the orchestrator after the wave completes).

## Files Created/Modified

- `lib/units-isolation.test.ts` — `PRINT_SURFACE_DISPLAY_FILES` flipped to all-`converted: true`; new `PRINT_SURFACE_OUT_OF_SCOPE_FILES` naming `use-print-fit.ts`; `PRINT_SURFACE_FOLDERS`/`findPrintSurfaceFiles`/`importsUnitsModule`/`importsDisplayBoundary` hoisted to module scope; a new print-surface completeness-walk test and closing assertion; a new `describe("no production call site is silently imperial by omission (T-07-06)", ...)` block with four assertions and its own `extractFirstCall` paren-balancing helper; the module-level doc comment above the design-screen describe block rewritten to describe the now-closed boundary
- `components/template/build-template-pdf.ts` — `templateNameBlockDimsText`'s Imperial Length branch now calls `formatLength(dims.length, system)` instead of `formatFeetInches(dims.length)` directly; the now-unused `formatFeetInches` import removed from `@/lib/geometry/units`, `formatLength` added from `@/lib/geometry/measure-display`
- `components/template/build-overview-pdf.ts` — `overviewLengthLabelText`'s Imperial branch now calls `` `${formatLength(length, "imperial")} - ${formatDim(length, "imperial")}` `` instead of `formatFeetInches`/`formatInchesFraction` directly; both now-unused imports removed from `@/lib/geometry/units`
- `CLAUDE.md` — Rule 2's "Where this applies today" paragraph rewritten; two printed-page specifics added beside it; no other section touched

## Decisions Made

- **The two production fixes were made as part of Task 1, not deferred or worked around.** The plan's own threat model (T-07-13) treats a ledger entry marked converted for a file that isn't actually converted as worse than leaving it red. Since Task 1's own `<files>` scope names only `lib/units-isolation.test.ts`, this is a Rule 3 (blocking) deviation — see below — but the fix itself is exactly what the plan's own action text requires: "only after confirming from each plan's summary that its file genuinely no longer composes a measurement outside the display boundary."
- **`PRINT_SURFACE_DISPLAY_FILES` and its siblings were hoisted to module scope.** Task 2 needed the same file list and helpers Task 1 introduced; declaring a second copy inside a second `describe` callback would have been exactly the kind of duplicate-mechanism drift CONTEXT.md's own "grow it, don't start a second one" instruction warns against.
- **The entry-point assertion uses a paren-balancing `extractFirstCall` helper, not a regex.** The first attempt (`` `${fn}\([\s\S]*?\}\);` ``) silently passed when a broken call's own closing brace wasn't immediately followed by `);` — it kept matching forward past the broken call into the *next* download call's own `system` field, reporting success for the wrong call. Caught by actually breaking the call site and observing the test still pass (a red flag the plan's own "demonstrate failing" acceptance criterion is designed to catch), then rewritten to balance parens from the call's own opening `(` to its own matching closing `)`.
- **The litres guard's needle is `"Litres"`, not `"volumeLitres"`.** `order-form.tsx` and `export-preview-dialog.tsx` carry this value as `quotedVolumeLitres` — a lowercase-`v` needle would have silently skipped every line in those two files, so the guard would have only ever exercised `build-template-pdf.ts`'s own `dims.volumeLitres` line (confirmed by running it: `checked` came back `3`, not the `>=4` the test itself requires).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed two production call sites that made honest ledger conversion impossible**
- **Found during:** Task 1
- **Issue:** Task 1's own acceptance criteria require every `PRINT_SURFACE_DISPLAY_FILES` entry to pass the banned-formatter assertion once flipped to `converted: true`. Running the suite with `build-template-pdf.ts` and `build-overview-pdf.ts` flipped (before any production fix) failed exactly one assertion: both files' stripped source still named `formatFeetInches`/`formatInchesFraction` directly — Plan 01's `templateNameBlockDimsText` and Plan 03's `overviewLengthLabelText` had each kept a direct call for an Imperial-only string with no bare display-boundary counterpart.
- **Fix:** Both call sites now call `formatLength`/`formatDim` with an explicit `"imperial"` argument instead of the raw formatter — byte-identical output (`formatLength`'s imperial branch IS `formatFeetInches`; `formatDim`'s IS `formatInchesFraction`), verified by the existing byte-identity tests in `build-template-pdf.test.ts`/`build-overview-pdf.test.ts` and the three frozen characterisation pins.
- **Files modified:** `components/template/build-template-pdf.ts`, `components/template/build-overview-pdf.ts`
- **Verification:** `npx vitest run lib/units-isolation.test.ts components/template/build-template-pdf.test.ts components/template/build-overview-pdf.test.ts lib/geometry/template.test.ts` — all green; `npx tsc --noEmit` clean; `npm test` (2132 passed, 2 skipped) green.
- **Committed in:** `bb51aec` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking — a mechanical ledger requirement that required a small production fix outside the task's own declared file scope, exactly the class of deviation Plans 02 and 04 each hit once before)
**Impact on plan:** Zero behavior change on Imperial (verified by existing byte-identity tests and the frozen pins); no file outside the plan's overall `files_modified` intent (the print surfaces themselves) was touched.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase`, this plan raised no mid-plan `checkpoint:human-verify`. This plan is test-and-documentation-only and adds no new printed surface behavior of its own, so it defers to the same end-of-phase UAT items Plans 01-04 already recorded (visual checks of exported Metric/Imperial PDFs across all four print surfaces, and the Metric print audit) — no new `<human-check>` items originate here.

## Issues Encountered

None beyond the one auto-fix documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The phase's ROADMAP success criterion 5 ("nothing on paper moved") is proven: all three frozen characterisation pins in `lib/geometry/template.test.ts` are green on their original digests at the end of this plan, having been re-run after every task including both production fixes.
- `lib/units-isolation.test.ts`'s conversion ledger is fully closed across both the fifteen design-screen files (Phase 6) and the five print-surface files (this phase) — a new display site anywhere in either set, or a new measurement added to an existing one, now starts life `converted: false` and fails the suite until it is honestly converted.
- CLAUDE.md's Rule 2 is now an accurate description of the shipped boundary; a future agent or shaper reading it will not be told the design screens or printed output still read in inches.
- No blockers. This is the last plan named in `07-CONTEXT.md`'s Phase Boundary — Phase 7's own end-of-phase UAT pass is what remains, covering the deferred `<human-check>` items Plans 01-04 each recorded.

---
*Phase: 07-metric-on-paper*
*Completed: 2026-09-06*
