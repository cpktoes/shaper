---
phase: 07-metric-on-paper
plan: 04
subsystem: printing
tags: [units, typescript, print, react, css]

# Dependency graph
requires:
  - phase: 07-metric-on-paper
    provides: "07-01's lib/geometry/measure-display.ts display boundary (formatDim, formatDimBare, formatLength, formatSignedDim, formatMark), reused rather than duplicated"
provides:
  - "components/summary/order-form.tsx's seven dimension cells, page-2 identification strip, rail-band thickness figure and fin placement panel all reading through the chosen units system"
  - "components/summary/dimension-fit.ts — a pure, tested step-down rule replacing CSS truncation on the order form's dimension cells, so an overrunning value shrinks instead of losing a digit to an ellipsis"
  - "lib/units-isolation.test.ts's PRINT_SURFACE_DISPLAY_FILES ledger, naming all four remaining print surfaces (order-form.tsx converted; the three PDF builders and lib/geometry/template.ts pending Plan 05)"
affects: [07-05-the-conversion-ledger-closes-on-print]

# Actuals (#2632)
actuals:
  tokens: 7706
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A pure character-length-based step-down table (DIMENSION_FIT_STEPS) replacing CSS text-overflow truncation, derived from the app's own board-dimension ranges run through the display boundary's own formatters rather than hand-typed worst cases"
    - "A row-level family field (lib/geometry/fins.ts's MeasureFamily) dispatched through at the display boundary rather than assumed by the component, so a future reclassification of a measurement's unit family follows automatically"

key-files:
  created:
    - components/summary/dimension-fit.ts
    - components/summary/dimension-fit.test.ts
  modified:
    - components/summary/order-form.tsx
    - app/design/summary/order-form.css
    - lib/units-isolation.test.ts

key-decisions:
  - "The order form's identification-strip length figure is composed from formatDimBare/formatLength only (never formatFeetInches directly) so this file's own source never contains a banned-formatter name — required because the PRINT_SURFACE_DISPLAY_FILES ledger's banned-formatter check runs file-wide, not scoped to the lines a given task narrates."
  - "Task 1's commit converts the fin placement panel's two calls from formatInchesFraction to an unconditional formatMark (byte-identical output, since every row is currently the mark family) rather than leaving them untouched — the ledger entry Task 1 adds marks the whole file converted, and a converted file cannot contain a banned formatter anywhere in it. Task 2 then upgrades those same call sites to dispatch on each row's own family field, which is its own genuinely new behavior (safety against a future reclassification, not present behavior change)."
  - "dimensionValueFitClass's three character-length thresholds (8 / 10 / Infinity) were derived by sampling every value in the app's own board-length, widepoint-width, offset and thickness ranges through the real formatters (see dimension-fit.test.ts's own derivation functions) rather than estimated — the true worst case across all seven cells and both systems is the Length cell in Imperial at 11 characters."
  - "Volume's cell and the identification strip's litres figure remain wired with no system argument anywhere near them, per D-07/D-06 and the existing litres guard in lib/units-isolation.test.ts, which stayed untouched and green throughout."

requirements-completed: []
# PRNT-01 is this plan's frontmatter requirement, but is NOT closed by this plan alone: 07-05 is
# named as the plan that closes the conversion ledger across all four remaining print surfaces
# (the three PDF builders and lib/geometry/template.ts). Marking PRNT-01 complete here would be
# premature; 07-05 is the correct place to flip it once every print surface reads the chosen system.

coverage:
  - id: D1
    description: "The order form's seven dimension cells (Length, Nose, Widepoint, Offset, Tail, Thickness, Volume) each read through the display boundary in the chosen system, each carrying its own unit, with Volume unconverted"
    requirement: "PRNT-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts's PRINT_SURFACE_DISPLAY_FILES converted-entry import/banned-formatter assertions; the pre-existing litres guard describe block, unedited and still green"
        status: pass
    human_judgment: true
    rationale: "Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase — the printed page's actual layout (does the metric string fit where the imperial one did, does the print preview clip anything) needs a human looking at the rendered/printed sheet, not just the composed strings."
  - id: D2
    description: "The page-2 identification strip carries its unit once at the end of the centimetre values on Metric, and is byte-identical to before this phase on Imperial"
    requirement: "PRNT-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts's banned-formatter assertion over order-form.tsx (no formatFeetInches/formatInchesFraction/formatSignedInchesFraction/formatCentimetres/formatWholeMm anywhere in the file's stripped source)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every fin placement number on page 2 carries its own mm on Metric, dispatched through each row's own family field rather than assumed by the component"
    requirement: "PRNT-01"
    verification:
      - kind: unit
        ref: "components/summary/order-form.tsx's formatFinValue dispatch on row.family/grp.fullSpreadFamily; npm test (2046 passed) confirms no regression in lib/geometry/fins.test.ts's own family tagging"
        status: pass
    human_judgment: false
  - id: D4
    description: "No measurement on either order-form sheet is ever truncated or ellipsised — a value that overruns its cell steps its own type size down instead, floored at the sheet's 12px print-legibility minimum"
    requirement: "PRNT-01"
    verification:
      - kind: unit
        ref: "components/summary/dimension-fit.test.ts — 11 cases covering every real string the app's own board-dimension ranges can produce in both systems, the exact-fit-limit edge case, the 12px floor invariant, and a dedicated regression case at the longest board and the widest board"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Metric print audit (both sheets, both paper sizes, both systems) is carried out, closing the item Phase 6 deferred here by name"
    requirement: "PRNT-01"
    verification: []
    human_judgment: true
    rationale: "Genuinely needs a human looking at the browser's print preview — no test in this suite can render the order form (vitest runs in a DOM-less node environment) or drive an actual print dialog. Recorded verbatim below under Human verification deferred to end-of-phase UAT."

duration: ~40min
completed: 2026-09-06
status: complete
---

# Phase 7 Plan 04: The Order Form In The Chosen System Summary

**The Summary order form's seven dimension cells, identification strip, rail-band thickness figure and fin placement panel now read in the shaper's chosen system, with a pure step-down rule replacing CSS truncation so no printed number can ever end in an ellipsis.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3
- **Files modified:** 5 (order-form.tsx, order-form.css, units-isolation.test.ts modified; dimension-fit.ts, dimension-fit.test.ts created)

## Accomplishments

- A Metric shaper's order form front sheet now reads `188.0 cm`, `40.0 cm`, `51.4 cm`, `+2.5 cm`, `36.8 cm`, `6.7 cm` and `34.0 L` across its seven dimension cells, all routed through `lib/geometry/measure-display.ts`'s `formatLength`/`formatDim`/`formatSignedDim` behind a single `useUnits()` read — matching the exact pattern Phase 6's `VolumeCalculationCard` established.
- The page-2 identification strip carries its unit once, at the end, on Metric (`188.0 · 51.4 · 6.7 cm · 34.0 L`), composed from a small local helper that calls only boundary formatters — so this file's own source never names `formatFeetInches` directly, which matters mechanically (see Deviations).
- The fin placement panel's Off Tail / Off Rail / Toe-In / Fin Base Length / Full Spread numbers now dispatch through each row's own `family` field (`lib/geometry/fins.ts`) rather than a single hardcoded formatter — on Metric this reads `Off Tail 286 mm`, `Off Rail 32 mm`, `Toe-In 3 mm`, exactly as D-08 specifies, and stays safe against a future reclassification (the same class of change UAT gaps G-06-12/G-06-15 already made once).
- `components/summary/dimension-fit.ts` replaces the dimension cell's CSS-truncation with a pure, three-step type-size rule (`DIMENSION_FIT_STEPS`, `dimensionValueFitClass`) — a value that would overrun its cell steps down instead of losing a digit, floored at the sheet's 12px print-legibility minimum. The thresholds (8 / 10 / Infinity characters) were derived by sampling the app's own board-length, widepoint-width, offset and thickness ranges through the real formatters, not estimated.
- `lib/units-isolation.test.ts` gained a `PRINT_SURFACE_DISPLAY_FILES` ledger naming all four remaining print surfaces — `order-form.tsx` now `converted: true`, the three jsPDF builders and `lib/geometry/template.ts` still `false`, pending Plan 05 — reusing the existing import/banned-formatter assertions rather than duplicating the mechanism.
- `components/summary/use-print-fit.ts` is untouched (`git diff --stat` reports no change) — CLAUDE.md's one named exception, since it scales paper sizes rather than board dimensions.

## Task Commits

Each task was committed atomically; Task 2 (`tdd="true"`) followed RED → GREEN:

1. **Task 1: The seven dimension cells and the identification strip in the chosen system** — `c69b59e` (feat)
2. **Task 2: Fin placement numbers in millimetres, and a value that shrinks rather than clips**
   - `8195f92` (test) — RED: failing coverage against a `dimension-fit.ts` that did not yet exist
   - `5f3dc58` (feat) — GREEN: `dimension-fit.ts`, the CSS step-down classes, `DimensionCell`'s fit-class, the fin panel's family dispatch
3. **Task 3: The Metric print audit Phase 6 deferred into this phase** — `ee04f0f` (test)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — STATE.md/ROADMAP.md excluded, owned by the orchestrator after the wave completes).

## Files Created/Modified

- `components/summary/dimension-fit.ts` — `DIMENSION_FIT_STEPS` (the three-step table with per-step `minPx`) and `dimensionValueFitClass(value: string): string`, the pure step-down rule
- `components/summary/dimension-fit.test.ts` — 11 cases: base/step-1/step-2 selection, the 12px floor invariant, the exact-fit-limit edge case, purity (no units-system dependence), every real string the app's own ranges can produce in both systems, and a dedicated regression at the longest board and the widest board
- `components/summary/order-form.tsx` — `useUnits()` read once; `thicknessDisplay`, the seven `DimensionCell` values, and the identification strip all route through `measure-display.ts`; `DimensionCell`'s value span drops `truncate` for `dimensionValueFitClass`; the fin panel dispatches through a new `formatFinValue(value, family, system)` helper; a new `identificationLengthText` helper composes the strip's length figure from `formatDimBare`/`formatLength` only
- `app/design/summary/order-form.css` — `--order-form-dim-step-1`/`--order-form-dim-step-2` custom properties and their matching classes, both derived from `--order-form-dim` and floored at 12px
- `lib/units-isolation.test.ts` — new `PRINT_SURFACE_DISPLAY_FILES` ledger; the two converted-entry assertions (display-boundary import, banned-formatter) extended to cover it alongside `DESIGN_SCREEN_DISPLAY_FILES`; the closing comment above the design-screen describe block rewritten to describe the new boundary

## Decisions Made

- **Task 1's commit had to convert the fin panel's `formatInchesFraction` calls to `formatMark`, even though the plan's own action text assigns "the fin placement panel" to Task 2.** The `PRINT_SURFACE_DISPLAY_FILES` ledger entry Task 1 adds marks the *whole file* `converted: true`, and the banned-formatter assertion greps the *entire* stripped source — not just the lines a given task's action text narrates. Verified empirically: running `lib/units-isolation.test.ts` with the fin panel still calling `formatInchesFraction` fails the banned-formatter assertion the moment the ledger entry is added. Since `formatMark`'s imperial branch is exactly `formatInchesFraction(value, 16)` (its default denominator), this is a byte-identical, zero-behavior-change fix — Task 2 then upgrades the same call sites to dispatch on each row's own `family` field, which is the genuinely new content that task describes.
- **The identification strip's length figure never names `formatFeetInches` directly.** The plan's own text says "add a small local helper... that picks between `formatDimBare` and `formatLength`" — reading that literally (rather than reaching for `formatFeetInches` directly, which was my first draft) keeps this file's source free of every banned-formatter name, satisfying the same ledger mechanism. `formatLength`'s own imperial branch already *is* `formatFeetInches`, so the printed string is unchanged.
- **`dimensionValueFitClass`'s thresholds are derived, not estimated.** `dimension-fit.test.ts` samples every sixteenth of an inch across `BOARD_LENGTH_RANGE_IN`, `WIDEPOINT_WIDTH_RANGE_IN`, the outline editor's own ±12in offset range and the rail thickness sliders' own bounds, through the real `formatLength`/`formatDim`/`formatSignedDim` calls, and the Nose/Tail cells are additionally run through the real `buildOutline()` across a length×width grid — never a hand-typed worst-case string, per CLAUDE.md Rule 1 and this plan's `<test_runner_constraint>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fin panel formatter conversion moved from Task 2 into Task 1's commit**
- **Found during:** Task 1
- **Issue:** Task 1's own `<verify>` (`npx vitest run lib/units-isolation.test.ts`) fails once the `PRINT_SURFACE_DISPLAY_FILES` ledger entry marks `order-form.tsx` `converted: true`, because the file-wide banned-formatter assertion still finds `formatInchesFraction` in the (at-that-point-untouched) fin placement panel — a section Task 2's action text, not Task 1's, describes converting.
- **Fix:** Task 1's commit changes the fin panel's two `formatInchesFraction(value, 16)` calls to unconditional `formatMark(value, system)` calls (byte-identical output on Imperial, since `formatMark`'s imperial branch defaults to the same denominator). Task 2 then upgrades these same call sites to dispatch on each row's own `family` field, which remains that task's own new, distinguishable content.
- **Files modified:** `components/summary/order-form.tsx`
- **Verification:** `npx vitest run lib/units-isolation.test.ts` (empirically confirmed failing before the fix, passing after) — see Decisions Made above for the reproduction.
- **Committed in:** `c69b59e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking — a mechanical ledger requirement that cut across the plan's own task boundary)
**Impact on plan:** Zero behavior change on Imperial (verified by the identical `formatInchesFraction`/`formatMark` output at denominator 16); no file outside the plan's `files_modified` list was touched; both tasks' own acceptance criteria are still individually satisfiable and were both verified green.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase`, this plan raised no mid-plan `checkpoint:human-verify`. The following `<human-check>` is deferred to the phase's end-of-phase UAT pass, recorded verbatim from Task 3's plan text:

> 1. Choose Metric from the gear menu in the top bar.
> 2. Open `/design/summary` and open the browser's print preview.
> 3. On **Letter**, check **both sheets** for any clipped or cut-off header, row or number. Look
>    particularly at the compact rail table's section headers, which now carry a unit suffix, and
>    at the fin placement panel, whose fixed-height box has silently eaten a quad's third section
>    before.
> 4. Repeat the whole check on **A4**.
> 5. Switch to Imperial and repeat both paper sizes, confirming both sheets are unchanged from
>    what they looked like before this phase.
> Expected: no clipped header, row or number on either sheet, at either paper size, in either
> system; and Imperial identical to before. If anything clips, record it as a gap — do not widen
> a panel to make it fit.

**Result:** Not yet run — deferred to end-of-phase UAT per the orchestrator's standing ruling for this phase. `dimension-fit.test.ts`'s own regression case (the longest board and the widest board, both systems) is the automatable half of this audit and is green; the browser/print-preview half above still needs eyes on the rendered page.

## Issues Encountered

None beyond the one auto-fix documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `PRINT_SURFACE_DISPLAY_FILES` is in place with `order-form.tsx` converted; Plan 05 flips the three PDF builders and `lib/geometry/template.ts` and adds the ledger's closing completeness assertion, mirroring how `DESIGN_SCREEN_DISPLAY_FILES` closed in Phase 6.
- `components/summary/dimension-fit.ts` is a small, self-contained, reusable pattern (a pure character-length step-down table) — nothing about it is order-form-specific beyond the CSS class names, if a future print surface needs the same guarantee.
- No blockers. The end-of-phase UAT pass should run this plan's own `<human-check>` (above) alongside whatever Plan 05 and its siblings (07-02, 07-03) leave outstanding, since all are deferred to the same end-of-phase gate.

---
*Phase: 07-metric-on-paper*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (`components/summary/dimension-fit.ts`,
`components/summary/dimension-fit.test.ts`, `components/summary/order-form.tsx`,
`app/design/summary/order-form.css`, `lib/units-isolation.test.ts`, this SUMMARY.md) and all five
commit hashes (`c69b59e`, `8195f92`, `5f3dc58`, `ee04f0f`, `891a1d4`) confirmed present in `git log`.
