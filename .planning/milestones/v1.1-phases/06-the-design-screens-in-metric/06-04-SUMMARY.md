---
phase: 06-the-design-screens-in-metric
plan: 04
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry, svg]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "06-01 — lib/geometry/measure-display.ts (formatMark/formatMarkBare/columnUnitSuffix/stationLabel/measureSlider), metricSliderRange in lib/geometry/units.ts, the design-screen conversion ledger in lib/units-isolation.test.ts"
  - phase: 06-the-design-screens-in-metric
    provides: "06-03 — the rocker screen's shipped pattern for a converted sidebar and a bare-cell table with the unit in its header, reused here for RAILS"
provides:
  - "The RAILS sidebar's per-section thickness sliders, Corner Cut Offset and Bottom Tuck 3 all reading and stepping in whole millimetres on Metric, with the nose/tail thickness sliders naming their station honestly through stationLabel"
  - "The rail data table's cells reading bare whole millimetres with (mm) on every open section's column header — the single formatCell choke point also carries the Summary order form's embedded rail card along"
  - "The rail cross-section plot's grid switching to a 10mm pitch on Metric, with buildRailPlotGrid extracted as a pure, exported, now-tested tick-generation function"
  - "components/rails/rail-section-plot.test.ts — the rail plot's first test in either system"
affects: ["06-05", "06-06", "06-07"]

# Actuals (#2632)
actuals:
  tokens: 8074
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A sidebar's per-slider view is threaded as a system: UnitsSystem prop into a per-section sub-component (RailSectionControls), read once via useUnits() in the parent (RailControls) — the same threading shape rocker-datasheet.tsx used, applied here because RAILS's per-section sub-component is called three times from one parent"
    - "A hand-typed station literal composed piecewise (`Thickness @${system === \"imperial\" ? \"\" : \" \"}${stationLabel(system)}`) so the exact literal substring never appears twice in source, satisfying a plan acceptance grep for the imperial literal without special-casing the grep"
    - "Diagram-layout arithmetic (a plot's grid pitch and tick labels) extracted into a pure function in the same component file, callable from a test without rendering React, by keeping the pixel-projection helpers (px/py) local to the component and having the extracted function work entirely in the pre-projection display domain"
    - "A test that needs to call into a 'use client' component's pure export, when that component also imports useUnits() (which chains into a real Server Action touching the database at module load time), stubs the one offending import (vi.mock('@/app/actions/units', ...)) rather than converting the test to a source-contract string-read — the same problem lib/db/ownership.test.ts solves by not importing at all, solved differently here because the export under test must actually be called"

key-files:
  created:
    - components/rails/rail-section-plot.test.ts
  modified:
    - components/rails/rail-controls.tsx
    - components/rails/rail-data-table.tsx
    - components/rails/rail-section-plot.tsx
    - lib/units-isolation.test.ts

key-decisions:
  - "sectionThicknessLabel's Imperial/Metric station suffix is built as a conditional space plus stationLabel(system), rather than a literal 'Thickness @12\"' string in the Imperial branch, because the plan's own acceptance check (grep -c '@12' outside comments must be 0) would otherwise fail on the literal substring appearing in source even though it renders correctly — composing it avoids the literal ever appearing twice"
  - "The rail plot's one metric tick per axis that carries the mm suffix, and every other bare metric tick, are formatted through measure-display's formatMarkBare rather than a hand-rolled String(v) — a tick's absolute position is a real physical length in the same 'mark' family every rail band mark reads in, so routing it through the display boundary let rail-section-plot.tsx satisfy the units-isolation ledger's 'every converted:true file imports the display boundary' check honestly, not by adding an unused import"
  - "rail-section-plot.test.ts stubs @/app/actions/units with vi.mock before importing the component file, because rail-section-plot.tsx's new useUnits() call chains into a real 'use server' action that touches the database client at module import time (the same hazard lib/db/ownership.test.ts avoids by never importing its subject files) — but this test genuinely needs to call the extracted buildRailPlotGrid function, so a source-contract string-read wasn't an option"
  - "The test fixture is the default (un-domed) centre rail section built through computeRailBands(DEFAULT_RAIL_BAND_SPEC) rather than a golden fixture or hand-written segment coordinates, per the plan's own instruction, keeping every expected tick value traceable to that one section's real geometry"

patterns-established:
  - "Pattern: a diagram's grid/tick generation, when it needs a system branch that is a real algorithm change (not a formatter swap), is extracted into a pure function that returns display-domain positions and labels, leaving all pixel projection in the component"

requirements-completed: [SCRN-01, SCRN-03]

coverage:
  - id: D1
    description: "RAILS sidebar: per-section thickness, Corner Cut Offset and Bottom Tuck 3 sliders read and step in whole millimetres on Metric; nose/tail thickness sliders name their station through stationLabel (30.5 cm, never hand-typed); Imperial byte-identical; rail-band math (roundToSixteenthInch, deckProfileStep) untouched"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts (151 tests, unedited, all pass) and components/design/slider-row.test.ts (allowlist count unchanged at 4)"
        status: pass
      - kind: unit
        ref: "git diff --name-only -- lib/geometry/rail-bands.ts (empty — the model is provably untouched)"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (the sidebar's thickness, Corner Cut and Bottom Tuck 3 rows read whole millimetres and step by one, the nose/tail thickness rows read '@ 30.5 cm', the Deck Profile clamp note still appears at the same threshold, Imperial unchanged) requires a browser per Task 1's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D2
    description: "Rail data table: formatCell routes numeric cells through formatMarkBare (bare whole mm on Metric), each open section's column header gains (mm) via columnUnitSuffix in both the full DATA-page table and the compact Summary order-form variant; null/hard-edge cells unchanged"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (10 tests, rail-data-table.tsx and rail-controls.tsx asserted converted:true, zero banned formatters)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (the DATA page's rail table shows (mm) on each section header with bare cells, an absent value still reads an em dash, a hard edge still reads 'Hard Edge', the Summary order form's rail card follows on Metric as the expected part-converted state, Imperial unchanged) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D3
    description: "Rail cross-section plot: grid pitch switches to 10mm on Metric with one tick per axis reading its value plus ' mm', pixel scale/bounds/segments/dots/legend all unchanged; buildRailPlotGrid extracted as a pure, exported function with its own new test"
    requirement: "SCRN-03"
    verification:
      - kind: unit
        ref: "components/rails/rail-section-plot.test.ts (4 tests: imperial ticks are whole inches one apart with no unit shown; metric ticks are 10mm multiples one step apart inside the same physical bounds; exactly one tick per axis carries the mm suffix and it's the first non-zero tick outward from the origin; bounds computation unchanged)"
        status: pass
      - kind: unit
        ref: "grep -c 'SCALE = 56' components/rails/rail-section-plot.tsx returns 1; lib/units-isolation.test.ts asserts rail-section-plot.tsx converted:true with zero banned formatters"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (the plot's grid squares read ten millimetres on Metric, ticks count 0/10/20 with one 'mm' label, counting squares against the table's marks agrees, Imperial is pixel-for-pixel unchanged) requires a browser per Task 3's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: ~40min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 4: The RAILS Screen in Metric — Sidebar, Data Table and Cross-Section Plot Summary

**The RAILS sidebar's thickness/corner-cut/bottom-tuck sliders, the rail data table's cells and headers, and the cross-section plot's grid all read and take numbers in the shaper's chosen system — with the plot's grid pitch as a genuine 10mm-domain algorithm change and its first test in either system.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3
- **Files modified:** 5 (1 new, 4 modified)

## Accomplishments

- Converted `rail-controls.tsx`: the per-section thickness slider (nose/center/tail), Corner Cut Offset and Bottom Tuck 3 all read and step in whole millimetres on Metric, each with metric bounds derived from the existing inch bounds through `measureSlider` — including Bottom Tuck 3's own dynamic per-section bounds. The nose and tail thickness sliders name their measuring station honestly (`Thickness @ 30.5 cm`) through `stationLabel`, composed so the literal `@12"` substring never appears twice in source (satisfying the plan's own acceptance grep) while staying byte-identical to today's `Thickness @12"` on Imperial. The centre section's "Board Thickness" wording, and the Family/Ratio/Deck Profile percentage controls, are untouched. `roundToSixteenthInch` and `deckProfileStep` — the rail-band math — are provably untouched (`git diff` on `rail-bands.ts` is empty).
- Converted `rail-data-table.tsx`: `formatCell` now takes the system and routes numeric cells through `formatMarkBare` (bare whole millimetres on Metric, unchanged inch fractions on Imperial), and each open section's column header gains ` (mm)` through `columnUnitSuffix` in both the full DATA-page table and the compact variant the Summary order form embeds — so converting this one choke point also carries the Summary's rail card along, the accepted part-converted step toward Phase 7. Null cells still read an em dash and Hard Edge still reads `Hard Edge` in both systems.
- Converted `rail-section-plot.tsx`: extracted the grid-line and tick generation into a new pure, exported `buildRailPlotGrid` function that works entirely in the plot's pre-projection display domain, so the component's own pixel math (`px`/`py`, `SCALE = 56`) is completely unchanged. On Metric the grid now runs a genuine 10mm-pitch algorithm (not a formatter swap) across the exact same physical bounds Imperial uses, converted through `mmToInches`/`inchesToMm` rather than a restated factor; exactly one tick per axis — the first non-zero tick outward from the origin — carries a trailing ` mm`, formatted through `formatMarkBare` so the file honestly satisfies the units-isolation ledger's display-boundary check. Imperial reproduces today's exact whole-inch loop and its `[-40, 40]` sanity ceiling. Wrote `components/rails/rail-section-plot.test.ts` — the plot's first test in either system — built from `computeRailBands(DEFAULT_RAIL_BAND_SPEC)`'s un-domed centre section, pinning both systems' tick values, steps and the metric suffix placement against the same real bounds.

## Task Commits

Each task was committed atomically:

1. **Task 1: The rail sidebar's marks read in millimetres** - `75ed27f` (feat)
2. **Task 2: The rail data table says which unit its columns are in** - `95a4dc1` (feat)
3. **Task 3: A ten-millimetre grid on the cross-section plot, and its first test** - `2d1c4c3` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `components/rails/rail-controls.tsx` - Per-section thickness, Corner Cut Offset and Bottom Tuck 3 sliders converted through `measureSlider`/`formatMark`/`stationLabel`; `system: UnitsSystem` threaded as a prop from `RailControls` (which reads `useUnits()`) into `RailSectionControls`
- `components/rails/rail-data-table.tsx` - `"use client"` added; `formatCell` takes `system` and calls `formatMarkBare`; both header variants append `columnUnitSuffix("mark", system)`
- `components/rails/rail-section-plot.tsx` - New exported `buildRailPlotGrid` (and `RailPlotGrid`/`RailPlotTick` types) extracting the grid/tick generation; `useUnits()` read in `RailSectionPlot`; ticks route through `formatMarkBare` in Metric
- `components/rails/rail-section-plot.test.ts` - New: 4 tests pinning `buildRailPlotGrid`'s Imperial and Metric behaviour against one real rail section's own bounds
- `lib/units-isolation.test.ts` - `rail-controls.tsx`, `rail-data-table.tsx` and `rail-section-plot.tsx` all flipped to `converted: true`

## Decisions Made

- `sectionThicknessLabel`'s Imperial branch composes `Thickness @${system === "imperial" ? "" : " "}${stationLabel(system)}` instead of the literal `'Thickness @12"'` — the plan's own acceptance criterion greps the file (outside comments) for the substring `@12` and expects zero hits, since the model treats any hand-typed occurrence as a duplicate of the honest station conversion elsewhere. A first attempt left the literal inside an explanatory doc comment and `//` line comment, which the acceptance grep's comment-stripping pattern (`grep -v '^\s*\*'`) doesn't catch for `/**` opening lines or `//` lines — reworded both comments to describe the behaviour without repeating the literal substring.
- The rail plot's bare mm tick labels (including the one that gains the ` mm` suffix) are produced by `formatMarkBare(mm(Math.abs(v)), "metric")` rather than a hand-rolled `String(v)`. Two reasons: a tick's absolute position is a genuine physical length in the same "mark" family every rail band mark reads in, and the file needed a real (not decorative) import from `@/lib/geometry/measure-display` for `lib/units-isolation.test.ts`'s "every converted:true entry imports from the display boundary" check to pass honestly once `rail-section-plot.tsx` was flipped to `converted: true` per the plan's own Task 3 action.
- `rail-section-plot.test.ts` stubs `@/app/actions/units` with `vi.mock` before importing the component file. `rail-section-plot.tsx`'s new `useUnits()` import chains into `components/units-provider.tsx` → `app/actions/units.ts` (a real `"use server"` action) → `lib/db/client.ts`, which calls `neon(process.env.DATABASE_URL!)` at module import time — this throws in the test environment. `lib/db/ownership.test.ts` solves the same class of hazard by reading its subject files as text instead of importing them, but this test genuinely needs to call the extracted `buildRailPlotGrid` function, so a source-contract string-read wasn't an option; stubbing the one offending import lets the rest of the module (including the real `computeRailPlotBounds`/`buildRailPlotGrid`) load and run normally.
- The test's fixture is `computeRailBands(DEFAULT_RAIL_BAND_SPEC)`'s centre section (un-domed by default, `deckPercent: 100`) rather than a golden fixture or hand-written segment coordinates, per the plan's own instruction — every expected tick value in the test is derived from that section's real `bounds.minX`/`bounds.maxY` with a provenance comment recovering the same `xAxisMinIn`/`yAxisMaxIn` the production code derives them from, rather than a hand-transcribed number.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, none of the following halted execution — each is a `<human-check>` from this plan's tasks, listed here for the phase verifier to harvest into the end-of-phase UAT batch:

1. **Task 1 (sidebar):** On Metric the RAILS sidebar's thickness, Corner Cut and Bottom Tuck 3 rows read in whole millimetres and move a millimetre at a time, the nose and tail thickness rows name their station in centimetres, and the Deck Profile clamp note appears exactly when it did before. On Imperial the sidebar is unchanged.
2. **Task 2 (data table):** On Metric the DATA page's rail table shows `(mm)` on each section column and bare numbers in every cell, with any absent value still an em dash and any hard edge still reading Hard Edge. On Imperial the table is unchanged. Open the Summary order form on Metric and confirm its rail card follows — that is the expected part-converted state until Phase 7.
3. **Task 3 (cross-section plot):** On Metric the rail cross-section plot's grid squares are ten millimetres, its ticks count 0, 10, 20 and so on, and one tick per axis says mm; counting squares against the table's marks agrees. On Imperial the plot is pixel-for-pixel what it was.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Composed the rail sidebar's station suffix instead of hand-typing the Imperial literal, to satisfy the plan's own acceptance grep**
- **Found during:** Task 1 (verifying the `@12` grep acceptance check)
- **Issue:** An initial implementation kept a literal `'Thickness @12"'` string in the Imperial branch of `sectionThicknessLabel`, plus explanatory prose in a `/**` doc comment and a `//` line comment repeating that literal. The plan's acceptance check (`grep -v '^\s*\*' ... | grep -v '{/\*' ... | grep -c '@12'` must return 0) doesn't strip `/**` opening lines or `//` line comments, so both the code literal and the comments tripped it.
- **Fix:** Composed the Imperial suffix from `stationLabel(system)` with a conditional leading space instead of a literal string, and reworded both comments to describe the behaviour without repeating the `@12` substring.
- **Files modified:** `components/rails/rail-controls.tsx`
- **Verification:** `grep -v '^\s*\*' components/rails/rail-controls.tsx | grep -v '{/\*' | grep -c '@12'` returns 0; `npm test` and `npx tsc --noEmit` both clean.
- **Committed in:** `75ed27f` (Task 1 commit)

**2. [Rule 3 - Blocking] Routed the rail plot's tick labels through formatMarkBare so the units-isolation ledger's display-boundary check passes honestly**
- **Found during:** Task 3 (flipping `rail-section-plot.tsx` to `converted: true` per the plan's own action)
- **Issue:** The plan's Task 3 action instructs flipping `rail-section-plot.tsx` to `converted: true`, but `lib/units-isolation.test.ts`'s "every converted:true entry imports from the display boundary" check mechanically requires an import from `@/lib/geometry/measure-display` — the file's tick labels were hand-rolled `String(v)`/template-literal strings with no such import, so the flip failed the ledger test.
- **Fix:** Routed every bare metric tick label (and the one that gains the ` mm` suffix) through `formatMarkBare`, which is a legitimate use — a tick's absolute position is a genuine physical length in the same "mark" family every rail band mark reads in — rather than adding an unused import purely to satisfy the mechanical check.
- **Files modified:** `components/rails/rail-section-plot.tsx`
- **Verification:** `npm test -- lib/units-isolation.test.ts` (10/10 pass, plot asserted converted); `npm test` and `npx tsc --noEmit` both clean.
- **Committed in:** `2d1c4c3` (Task 3 commit)

**3. [Rule 3 - Blocking] Stubbed the units server action so the plot's pure grid function could be imported and called in a test**
- **Found during:** Task 3 (writing `rail-section-plot.test.ts`)
- **Issue:** Importing `rail-section-plot.tsx` to call the new `buildRailPlotGrid` export transitively pulled in `components/units-provider.tsx` → `app/actions/units.ts` (a `"use server"` Server Action) → `lib/db/client.ts`, whose module-level `neon(process.env.DATABASE_URL!)` call throws immediately in the vitest environment (no `DATABASE_URL` set there).
- **Fix:** Added `vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }))` at the top of the test file, before the component import — the same class of hazard `lib/db/ownership.test.ts` avoids by reading source as text instead of importing, but resolved here by stubbing the one offending dependency since the test genuinely needs to call a real exported function.
- **Files modified:** `components/rails/rail-section-plot.test.ts`
- **Verification:** `npm test -- components/rails/rail-section-plot.test.ts` (4/4 pass); `npm test` full suite clean.
- **Committed in:** `2d1c4c3` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 — blocking issues that prevented completing the task as literally specified)
**Impact on plan:** All three were necessary to satisfy the plan's own acceptance criteria and mechanical ledger checks without changing any rendered string or the plot's actual behaviour. No scope change.

## Issues Encountered

None beyond the three items captured above (all resolved inline).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The whole RAILS screen — sidebar, data table and cross-section plot — is fully converted and held to the units-isolation ledger.
- The rail plot's grid arithmetic is under test for the first time, giving future plots (if any) a pattern to copy for extracting layout math into a testable pure function.
- Plans 05-07 (FINS, VOLUME, and any remaining screen work) can build on the same `measureSlider`/`formatMark`/`formatMarkBare`/`columnUnitSuffix`/`stationLabel` patterns this plan reused without modification.
- No blockers. `npm test` (1978 passed, 2 skipped), `npx tsc --noEmit` (ignoring the known phantom `LayoutProps` worktree noise) and `npm run lint` (0 errors, pre-existing unrelated warnings only) are all clean. `lib/geometry/rail-bands.ts`, `lib/geometry/rail-bands.test.ts` and `lib/geometry/template.test.ts` are confirmed unedited (`git diff --name-only` empty). `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
