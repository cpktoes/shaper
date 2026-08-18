---
phase: quick-260818-lm0
plan: 01
subsystem: geometry-and-rail-band-calculator
tags: [geometry, units, rail-bands, svg, next-app-router, tailwind-v4, navigation]
status: complete
dependency-graph:
  requires:
    - phase: quick-260818-kvp
      provides: lib/geometry/units.ts (Mm brand, inch<->mm boundary, formatInchesFraction), outline-* palette tokens, the app/design/* editor screen shape (sidebar + main column) reused verbatim
  provides:
    - lib/geometry/rail-bands.ts (RailBandSpec, computeRailBands, buildRailProfile, buildRailSegments, railPlotBounds, buildRailDataGroups, mergeRailDataTable)
    - /design/rails screen (rail band calculator: sidebar controls + VIEWER/DATA tabs)
    - app/design/layout.tsx + components/site-nav.tsx (TEMPLATE / RAILS top nav shared by both design screens)
  affects:
    - app/design/outline/page.tsx (now wrapped by the shared design layout/nav, unchanged itself)
    - lib/geometry/units.ts (formatInchesFraction rounding tie-break fix; new roundToSixteenthInch export)
tech-stack:
  added: []
  patterns:
    - "Private inch-domain core / public Mm-only boundary split for a geometry module where nearly every constant carries a unit (vs. outline.ts's four unit-carrying constants) — every exported function independently converts Mm in, Mm out"
    - "Second extract-and-execute golden fixture (scripts/extract-prototype-rails-golden.mjs), proving the pattern from quick-260818-kvp generalizes to a second, more heavily unit-laden prototype module"
    - "Uniform-scale multi-plot rendering: one shared x-axis minimum computed from all open sections' own bounds, passed to every plot alongside one shared parent render width"
key-files:
  created:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/__fixtures__/prototype-rails-golden.json
    - scripts/extract-prototype-rails-golden.mjs
    - app/design/rails/page.tsx
    - app/design/layout.tsx
    - components/site-nav.tsx
    - components/rails/rail-band-editor.tsx
    - components/rails/rail-controls.tsx
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-data-table.tsx
  modified:
    - lib/geometry/units.ts (added roundToSixteenthInch; fixed formatInchesFraction's exact-tie rounding)
    - package.json (added golden:rails script; golden now chains both extractors)
decisions:
  - "formatInchesFraction nudges its rounding step by 1e-9 before Math.round — an exact N.5-sixteenth value round-tripped once through Mm can land a few floating-point ULPs on the wrong side of the tie, which the golden tests caught at 2 of ~500 formatted-value assertions"
  - "computeRailSection's input omits the prototype's unused `domed` destructured field (computeSection never reads it — domedDeckBand is always domedBandBase regardless) rather than carrying dead state through the public API"
  - "Shared-x-axis-min plot scaling recomputes railPlotBounds for every open section rather than porting buildPlot's `if (own > shared) recompute` micro-optimization — mathematically Math.min(own, shared) always equals shared once shared is the true minimum, so the branch was a no-op simplification, not a behavior change"
metrics:
  duration: ~45min
  completed: 2026-08-18
actuals:
  tokens: 71268
  tasks: 3
  commits: 3
---

# Quick Task 260818-lm0: Rebuild Rail Band Calculator Screen (Live) Summary

Ported the Claude Design prototype's Rail Band Calculator into a pure-TypeScript, metric, golden-tested `lib/geometry/rail-bands.ts` module and rebuilt it as `/design/rails` (dark sidebar + VIEWER/DATA tabs, three uniformly-scaled cross-section plots, merged data table), then added a shared TEMPLATE / RAILS top nav across both design screens — golden-tested to reproduce the prototype's own `computeSection`/`buildProfilePoints`/`buildSegmentDefs`/`cardFromResult` output to within 1e-9 inch across 11 fixture states x 3 sections.

## What Was Built

**Task 1 — Rail-band math + golden fixtures** (`lib/geometry/rail-bands.ts`, `scripts/extract-prototype-rails-golden.mjs`, `lib/geometry/units.ts`): `scripts/extract-prototype-rails-golden.mjs` brace-matches 13 method bodies (`round16`, `toFrac`, `disp`, `familyLabel`, the four band-formula helpers, `computeSection`, `buildProfilePoints`, `buildSegmentDefs`, `cardFromResult`, `syncSnapshot`) straight out of `reference/project/Rails.dc.html`, wires them onto one host object via `new Function`, and executes them across 11 named fixture states x 3 sections to produce `lib/geometry/__fixtures__/prototype-rails-golden.json`. `lib/geometry/rail-bands.ts` ports the math statement-for-statement, keeping a private inch-domain core (`computeSectionInches`, `buildProfilePointsInches`, `buildSegmentDefsInches`, `buildRailDataGroupsInches`) with the exported functions converting Mm in and Mm out at the boundary — the public surface never leaks an unconverted inch value. `roundToSixteenthInch` was added to `units.ts` as the `round16` port. 174 new Vitest cases (golden parity across `computeSection` result fields, `buildProfilePoints`/`buildSegmentDefs` point-for-point, `cardFromResult` groups formatted through `formatInchesFraction` label-for-label and value-for-value, plus plain unit tests for `roundToSixteenthInch`, `railFamilyLabel`, and `mergeRailDataTable`'s canonical row order).

**Task 2 — `/design/rails` screen** (`components/rails/*`, `app/design/rails/page.tsx`): `RailBandEditor` owns a single `RailBandSpec` in state (plus UI-only open/advanced-open/active-page state that never touches the design), derives `computeRailBands` via `useMemo`, and renders `RailControls` (three collapsible Nose/Center/Tail sections — thickness, inverted Deck Profile slider with the prototype's own reachable-endpoints step formula, Family, Ratio + Sym, tail Hard Edge, and an Advanced disclosure for Corner Cut Offset/Remove and Bottom Tuck 3/Use Single Tuck with a Reset button) alongside VIEWER (`RailSectionPlot`, ported pixel math with a segment-key colour map, sharing one x-axis minimum and one render width across all open plots, plus one shared legend) and DATA (`RailDataTable`, rendering `mergeRailDataTable`'s merged three-column output with the prototype's italic footnote).

**Task 3 — TEMPLATE / RAILS top nav** (`app/design/layout.tsx`, `components/site-nav.tsx`): A nested layout wraps both `/design/outline` and `/design/rails` with a client `SiteNav` that highlights the active screen via `usePathname`, inside a `flex min-h-0 flex-1 flex-col` column that passes the root layout's full-height flex chain through to each editor without collapsing it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `formatInchesFraction`'s rounding step mis-handled an exact tie after the Mm round-trip**
- **Found during:** Task 1 (golden data-groups test)
- **Issue:** A value like `0.09375in` (exactly `1.5/16`) round-tripped through `inchesToMm`/`mmToInches` can land at `0.09374999999999999` — a few floating-point ULPs below the tie — flipping `Math.round`'s tie-break from `1/8"` to `1/16"` and failing 2 of the golden formatted-string assertions (`domedAll` nose Rail Tuck 1, `overrides` center Corner Cut Deck).
- **Fix:** Added a `1e-9` sign-aware nudge before `Math.round(inches * denominator)` in `formatInchesFraction`, consistent with the function's existing `+ 1e-9` epsilon already used for its whole-number carry check.
- **Files modified:** `lib/geometry/units.ts`
- **Verification:** All 265 tests pass, including the previously-failing 2 assertions and all pre-existing outline/units tests (no regression at the function's other 20+ existing test cases).
- **Committed in:** `049aaa7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for the golden test's own string-parity assertion to pass; no scope creep — the fix is scoped entirely to the pre-existing formatter's rounding boundary.

## Verification

- `npm run golden`: regenerates both `lib/geometry/__fixtures__/prototype-outline-golden.json` and `lib/geometry/__fixtures__/prototype-rails-golden.json` from their respective prototype HTML files with **zero diff** against the committed fixtures.
- `npm test`: 265/265 passing (91 pre-existing outline/units cases + 174 new rail-band cases).
- `npm run build`: compiles with zero TypeScript errors, produces static routes for `/`, `/_not-found`, `/design/outline`, and `/design/rails`.
- `npm run lint`: clean (0 errors; 3 pre-existing warnings unrelated to this task — one in `outline.test.ts`, and matching `no-new-func` disable-directive warnings in both golden-extraction scripts, following the established convention from `scripts/extract-prototype-golden.mjs`).
- Runtime smoke check against the already-running dev server: `curl` against `/design/outline` and `/design/rails` both return 200; `/design/rails`'s HTML contains "Rail Band Calculator", "Nose"/"Center"/"Tail", "Deck Profile", "Family", "Ratio", "Hard Edge", "VIEWER", "DATA"; both pages' HTML contain "SHAPER", "TEMPLATE", and "RAILS" (confirming the shared nav renders and cross-links on both screens).
- Interactive browser click-through (dragging sliders, toggling Hard Edge/Remove/Use Single Tuck, switching VIEWER/DATA tabs, clicking between TEMPLATE and RAILS) was **not** performed in this run — no browser automation tool was available in this execution context. The math and formatted-output correctness this interaction would exercise is covered by the golden parity tests instead (every field, point, segment, and formatted table cell `computeRailBands` can produce is asserted against the prototype's own executed output across 11 fixture states).

## Known Stubs

None. Every sidebar control reads from and writes to the single `RailBandSpec` state object; the VIEWER, DATA, and nav all render from `computeRailBands`'s live output. `buildRailProfile` is implemented and golden-tested per the plan's scope note, even though nothing on this screen renders it yet (pinned for Volume to consume later).

## Threat Flags

None beyond what the plan's threat model already covers (T-lm0-01 dev-only golden extractor over a committed reference file, T-lm0-02 bounded slider ranges with fixed-step arithmetic, T-lm0-03 no network/auth/persistence surface, T-lm0-SC no new npm packages were added).

## Self-Check: PASSED

Verified below.
