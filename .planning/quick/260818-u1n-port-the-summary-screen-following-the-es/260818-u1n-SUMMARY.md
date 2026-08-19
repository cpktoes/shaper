---
phase: quick-260818-u1n
plan: 01
subsystem: ui
tags: [nextjs, tailwind, react-context, css-clamp, print-css, svg]

requires:
  - phase: quick-260818-nyw
    provides: shared design-store (outline/rails/fins/volume state, effectiveFins, finTailOutline, volumeResult)
provides:
  - "/design/summary route: a six-card dashboard showing the whole board design at once"
  - "Additive compact prop on OutlineViewer, RailDataTable, RailSectionPlot, VolumeCalculationCard, FinViewer"
  - "boardName field in the shared design store"
  - "Route-scoped browser print path (landscape, one page, print-only name block)"
affects: [phase-2-named-model-saving, phase-3-templates-tmpl-01]

actuals:
  tokens: 10440
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Compact-prop embedding: every existing view component gains an additive `compact?: boolean` (default false) so a dashboard card can host it without a second implementation"
    - "CSS clamp() as a measured-value substitute: `clamp(base*0.85, base/12 vw, base*1.6)` reproduces a JS ResizeObserver-driven scale with a single declaration"
    - "Imperative beforeprint/afterprint DOM handlers (no React state) for anything that must be true at the browser's print-snapshot instant"

key-files:
  created:
    - app/design/summary/page.tsx
    - app/design/summary/summary.css
    - components/summary/board-summary.tsx
    - components/summary/use-print-fit.ts
  modified:
    - components/outline/outline-viewer.tsx
    - components/rails/rail-data-table.tsx
    - components/rails/rail-section-plot.tsx
    - components/volume/volume-calculation-card.tsx
    - components/fins/fin-viewer.tsx
    - components/design/design-store.tsx
    - components/site-nav.tsx

key-decisions:
  - "No height-measuring JavaScript: the grid takes its height from app/design/layout.tsx's flex column (min-h-0 flex-1) instead of the prototype's ResizeObserver + 150ms poll, because our layout already passes flex height through to every screen"
  - "Type scale expressed as CSS clamp() per font size instead of the prototype's measured compactFontScale — clamp(base*0.85, base/12 vw, base*1.6) is the identical curve with no measurement"
  - "One cropped shared rail-plot x-axis (-6.5in, the widest of the prototype's three per-section crops) instead of three separate per-section crops, so the three plots stay on one comparable axis"
  - "Print-fit hook (useSummaryPrintFit) works imperatively on the DOM node inside beforeprint/afterprint and sets no React state, because the browser snapshots the page as soon as beforeprint returns and a scheduled setState is not guaranteed to have committed by then"
  - "Print Summary is a one-page spec sheet, not Phase 3's TMPL-01 full-size 1:1 tiled template — different artifact, different scaling rule, not built here"

requirements-completed: [VIZ-01, UNIT-01]

coverage:
  - id: D1
    description: "/design/summary renders all six panels (Template, Rail Data, Rail Plots, Volume Estimate, Fin Placement, Board Name) live from the shared design store"
    requirement: "VIZ-01"
    verification:
      - kind: unit
        ref: "npx vitest run (562 tests, unchanged) — no summary-specific test added; this is layout, not geometry"
        status: pass
      - kind: other
        ref: "npm run build — /design/summary appears in the static route list; npx tsc --noEmit clean"
        status: pass
    human_judgment: true
    rationale: "Visual layout (grid columns/rows, card contents, stacking below 900px, print output) requires a human to view the running app; automated checks (tsc/build/vitest/curl HTML grep) confirm wiring and cross-screen number parity but not visual correctness"
  - id: D2
    description: "Compact props on OutlineViewer/RailDataTable/RailSectionPlot/VolumeCalculationCard/FinViewer are additive and default off — the outline/rails/volume/fins screens are visually unchanged"
    verification:
      - kind: unit
        ref: "npx vitest run — full pre-existing suite green"
        status: pass
      - kind: other
        ref: "npm run golden — regenerates all four fixture files with no diff, proof no lib/geometry input changed"
        status: pass
    human_judgment: true
    rationale: "Visual non-regression of the four existing screens needs a human eyeball pass; tests/build only prove the code compiles and geometry didn't change"
  - id: D3
    description: "boardName lives in the shared store and survives navigation between design screens; Print Summary produces one landscape page with nav/textarea hidden and the name shown large and centred"
    requirement: "UNIT-01"
    verification:
      - kind: other
        ref: "curl-based HTML checks: data-print-hide present on nav + interactive card, data-print-only present on the twin, placeholder=\"Board Name\" present"
        status: pass
    human_judgment: true
    rationale: "Browser print-preview output and cross-navigation persistence require interactive verification not available in this session"

duration: 12min
completed: 2026-08-18
status: complete
---

# Quick Task 260818-u1n: Port the Summary Screen Summary

**Six-card `/design/summary` dashboard assembling the four existing screens' live view components under additive `compact` props, plus a browser-print path that lands the whole board on one landscape sheet.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-18T21:48:13-07:00 (plan commit)
- **Completed:** 2026-08-18T21:59:43-07:00
- **Tasks:** 3
- **Files modified:** 11 (4 created, 7 modified)

## Accomplishments
- `/design/summary` route: a responsive six-card dashboard (three-column 85fr/15fr grid at 900px+, single stacked scrolling column below it in the prototype's own order) reading every value from `useDesign()`
- Every panel is the *existing* view component under an additive `compact` prop — `OutlineViewer`, `RailDataTable`, `RailSectionPlot` (`fit="height"`), `VolumeCalculationCard`, `FinViewer` — no view implemented twice
- `boardName`/`setBoardName` added to the shared design store; survives navigation between design screens, in-memory only like every other value
- `useSummaryPrintFit` hook: imperative `beforeprint`/`afterprint` DOM handlers apply a clamped landscape print-fit `zoom` scale so the sheet lands on one page
- Route-scoped `summary.css` print stylesheet: `data-print-hide` (nav, board-name textarea), `data-print-only` (centred name twin), `data-print-unfold` (rail data table prints in full)
- SUMMARY added as the fifth and last nav entry on every design screen

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end /design/summary — the dashboard grid with the Template panel live** - `d9cda7f` (feat, tracer)
2. **Task 2: Fill the four remaining data panels from the existing views** - `f70c694` (feat)
3. **Task 3: Board name in the store, and the one-page landscape print** - `124f1fc` (feat)

_This plan carried no `checkpoint:*` tasks and ran fully autonomously; the tracer's own `<verify>` (tsc/build/vitest plus an HTML-grep check of the rendered route) passed before Task 2 began._

## Files Created/Modified
- `app/design/summary/page.tsx` - route entry, imports `./summary.css`, renders `<BoardSummary />`
- `app/design/summary/summary.css` - route-scoped `--summary-font-*` clamp scale + `@media print` rules + `@page { size: landscape }`
- `components/summary/board-summary.tsx` - the six-card grid, `SummaryCard` helper, shared cropped rail-plot x-axis derivation, Board Name panel + print-only twin
- `components/summary/use-print-fit.ts` - `useSummaryPrintFit()`: imperative print-fit scaling, no React state
- `components/outline/outline-viewer.tsx` - additive `compact` prop (three callout font sizes only)
- `components/rails/rail-data-table.tsx` - additive `compact` prop (no card chrome, no footnote, no min-width floor, `data-print-unfold`)
- `components/rails/rail-section-plot.tsx` - additive `fit="width" | "height"` prop
- `components/volume/volume-calculation-card.tsx` - additive `compact` prop (strict-subset row set)
- `components/fins/fin-viewer.tsx` - additive `compact` + `boardLength` props (no legend, no "Tail @ 12"" pair, compact length heading)
- `components/design/design-store.tsx` - `boardName: string` + `setBoardName`
- `components/site-nav.tsx` - SUMMARY nav entry, `data-print-hide` on `<nav>`

## Decisions Made
- **No height-measuring JavaScript.** `Summary.dc.html` runs a `ResizeObserver` + 150ms poll because it was embedded in an unknown shell; `app/design/layout.tsx` already passes flex height through to every screen, so the grid takes its height from `min-h-0 flex-1` with no observers. Same result, less code.
- **Type scale in CSS, not JS.** The prototype computes `fontScale = clamp(0.85, (rootAvailW/3)/400, 1.6)` from a measured width. Expressed per font size as `clamp(base*0.85, base/12 vw, base*1.6)`, it's the identical curve in one CSS declaration — worked example: the 10px compact callout becomes `clamp(8.5px, 0.8333vw, 16px)`, exactly 10px at a 1200px window.
- **One cropped shared plot axis instead of three per-section crops.** The prototype crops each compact rail plot's x-axis separately (-5/-6.5/-5in). This port shares one x-axis across the three plots (matching the rails screen's own VIEWER page) and crops it at -6.5in, the widest of the three — nose and tail show a touch more empty inboard space than the prototype, but all three stay on one comparable axis.
- **Print-fit hook works imperatively on the DOM, not through React state.** The browser snapshots the page as soon as `beforeprint` returns; a `setState` scheduled inside that handler is asynchronous and not guaranteed to commit before the snapshot, so the measured scale could miss the printed page. `useSummaryPrintFit` sets `data-printing`/`style.zoom` directly on the ref'd node instead.
- **Print Summary is a spec sheet, not TMPL-01.** The one-page landscape print here is explicitly not Phase 3's full-size 1:1 tiled outline template — different artifact, different scaling rule (`Math.min(1, 1030/w, 750/h)` fit-to-page vs. real-world 1:1 tiling). Nothing here should be mistaken for partial TMPL-01 work.

## Deviations from Plan

None — plan executed exactly as written. `SummaryCard`'s `variant: "padded" | "flush"` prop is a literal-typed implementation of the plan's own "padded vs. flush" padding distinction (Rail Data/Volume/Board Name vs. Template/Fins/Plots); this is an implementation detail of the helper the plan asked for, not a deviation from any documented behavior.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs

None. Every panel renders live data from the shared design store through the existing, already-shipped view components; no card holds a hardcoded empty value or placeholder text.

## Next Phase Readiness
- All four preceding screens (outline, rails, volume, fins) confirmed unchanged by cross-screen number checks (litres figure, tail-width-at-12" value, board-thickness value all match between `/design/summary` and their own screens) and the full pre-existing Vitest suite staying green.
- `npm run golden` regenerated all four fixture files with no diff — no `lib/geometry` input changed by this task.
- Human verification still outstanding for the visual/print-specific claims in the plan's `<verify>` blocks (grid layout at various widths, the 900px stacking breakpoint, the browser print-preview output, and cross-navigation persistence of the board name) — no browser-automation tool was available in this execution session; verification here relied on `tsc`/`build`/`vitest`/`lint`/`golden` plus `curl`-based HTML structure and cross-screen number checks against the dev server. The dev server is left running on port 3000 for the shaper's review.
- No blockers for Phase 2 (named-model saving) or Phase 3 (TMPL-01 tiled templates); `boardName`'s in-memory-only storage is the natural first field Phase 2's persistence layer will pick up.

## Self-Check: PASSED

All 4 created files verified present on disk; all 3 task commits (`d9cda7f`, `f70c694`, `124f1fc`) verified present in `git log`.

---
*Phase: quick-260818-u1n*
*Completed: 2026-08-18*
