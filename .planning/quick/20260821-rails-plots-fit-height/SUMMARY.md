---
phase: quick-260821-rpf
plan: 01
subsystem: ui
tags: [rails, svg-plots, flexbox, layout]

requires:
  - phase: quick-260818-lm0
    provides: RailSectionPlot's fit="width"/"height" prop and the Rail Viewer plots stack in rail-band-editor.tsx
provides:
  - Rail Viewer plots container no longer scrolls -- overflow-y-auto removed, min-h-0 kept
  - computeRailPlotBounds exported from rail-section-plot.tsx -- shared bounds/dimension math the SVG render itself now calls, so a caller can read a section's natural viewBox height without duplicating layout formulas
  - rail-band-editor.tsx distributes the plot stack's height proportionally across open sections via flex-basis:0 + flex-grow set to each section's natural viewBox height, and passes fit="height" to each RailSectionPlot
affects: [any future rail-band-editor.tsx layout change to the Rail Viewer card, and any future rail-section-plot.tsx change to SCALE/LEFT_PAD/AXIS_LABEL_PAD or the viewBox bounds formula]

actuals:
  tokens: 1500
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Shared bounds computation extracted into its own exported function (computeRailPlotBounds) rather than duplicated at each call site -- the component and the layout-sizing caller both derive width/height/minX/minY/maxY from one formula, so they cannot drift apart"
    - "Proportional flex distribution via flex-basis:0 + flex-grow=naturalValue -- reused here for stacking rail plots by natural SVG height, the same technique that would apply to any other flex stack needing content-proportional (not equal) sizing"

key-files:
  created: []
  modified:
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-band-editor.tsx

key-decisions:
  - "Extracted computeRailPlotBounds() as a small exported helper in rail-section-plot.tsx (returning minX, minY, maxY, width, height) rather than duplicating the width/height formula in rail-band-editor.tsx -- keeps the geometry-free diagram-sizing math in one place, matching the plan's explicit allowance for a small helper export here since this is layout math, not shaping geometry (which must live in lib/)"
  - "RailSectionPlot's own render now calls computeRailPlotBounds internally instead of inlining the same minX/minY/maxY/width/height calculation twice -- removes the duplication risk entirely rather than accepting a small amount of it"
  - "Height distributed via flex-basis:0 + flex-grow=naturalHeight (not flex-grow=1 / equal thirds, and not fixed pixel heights) -- flexbox divides the container in exact proportion to each section's natural plot height, so relative sizing between nose/center/tail is preserved automatically as thicknesses change, with no manual ratio math needed in the component"
  - "Section title stays a flex-none child above a separate flex-1 min-h-0 plot wrapper (not a sibling of the RailSectionPlot itself) -- fit=\"height\"'s height:100% needs a parent with a flexbox-computed height, and nesting the title inside that same flex-grow item would eat into the plot's available height as titles vary"
  - "Summary dashboard's fit=\"height\" call site (components/summary/board-summary.tsx) left completely unmodified -- confirmed unchanged by grep before and after the edit"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "Rail Viewer plots container no longer scrolls: overflow-y-auto removed from the container div, min-h-0 retained so the flex child can still shrink below content height"
    verification:
      - kind: other
        ref: "grep confirms no overflow-y-auto remains in rail-band-editor.tsx's plots container; npm run build succeeds"
        status: pass
    human_judgment: true
    rationale: "Absence of a scrollbar under real content (all three sections open, thicknesses at their maximum bounds: centre 3.5\", nose/tail 2.5\") is a visual/rendered-layout outcome best confirmed by a human or automated browser pass, not inferable from source alone."
  - id: D2
    description: "Height distributed proportionally to each section's natural plot height (not equal thirds) via flex-basis:0 + flex-grow=computeRailPlotBounds(...).height per section, with fit=\"height\" passed to each RailSectionPlot"
    verification:
      - kind: other
        ref: "Source review of components/rails/rail-band-editor.tsx: each section wrapper's style sets flexGrow to the natural height returned by computeRailPlotBounds(bands[key], sharedXAxisMin); npm run build succeeds"
        status: pass
    human_judgment: true
    rationale: "That the taller centre plot visibly stays taller than nose/tail as thicknesses change is a rendered-proportion judgment best confirmed visually in a browser."
  - id: D3
    description: "Collapsing a section removes it from openSections entirely, so the remaining sections' flex-grow values are recomputed against the smaller list and they naturally expand to fill the freed space -- no explicit collapse-handling code needed beyond the existing openSections filter"
    verification:
      - kind: other
        ref: "Source review: openSections.map(...) already excludes collapsed sections before the flex-grow values are computed; no code path treats a collapsed section as still occupying space"
        status: pass
    human_judgment: false
  - id: D4
    description: "Summary dashboard's compact rail plots and existing fit=\"height\" behavior are unchanged -- board-summary.tsx's RailSectionPlot call site and rail-section-plot.tsx's fit=\"height\" SVG style branch are untouched by this task's edits"
    verification:
      - kind: other
        ref: "grep -n 'fit=\"height\"|RailSectionPlot' components/summary/board-summary.tsx before and after the edit shows the call site unchanged; the fit===\"height\" SVG style branch in rail-section-plot.tsx is byte-identical to before"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run test, npm run lint, npm run build all pass; 01-01 layout invariant (body viewport-clamped, sidebar scrolls independently, page never scrolls) is preserved since no ancestor overflow/height classes outside the plots container were touched"
    verification:
      - kind: unit
        ref: "npm run test -- 598 tests pass; npm run lint -- 0 errors (9 pre-existing unrelated warnings); npm run build -- succeeds"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-08-21
status: complete
---

# Quick Task: Rail Plots Scale to Fit Height Instead of Forcing Page Scroll

**Removed the Rail Viewer's overflow-y-auto scroll container and replaced it with a proportional flex-grow stack driven by each section's natural SVG height, reusing the existing fit="height" render mode instead of inventing a new sizing path**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-21
- **Completed:** 2026-08-21
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `components/rails/rail-section-plot.tsx`: extracted `computeRailPlotBounds(output, xAxisMin)` -- a new exported function returning `{ minX, minY, maxY, width, height }` -- from the width/height/bounds math that `RailSectionPlot` was computing inline. `RailSectionPlot` itself now calls this same function rather than duplicating the formula, so the component and any external caller are guaranteed to agree on a section's natural viewBox dimensions.
- `components/rails/rail-band-editor.tsx`: removed `overflow-y-auto` from the Rail Viewer plots container (kept `min-h-0`). Each open section's wrapper now gets `style={{ flexGrow: naturalHeight, flexBasis: 0 }}` where `naturalHeight` comes from `computeRailPlotBounds(bands[key], sharedXAxisMin).height` -- so flexbox divides the container's available height across sections in exact proportion to their natural plot heights, not equal thirds. Each `RailSectionPlot` is now called with `fit="height"` (reusing the existing prop built for the Summary dashboard) instead of the default `fit="width"`.
- Section titles remain `flex-none`; the plot itself sits in a nested `flex-1 min-h-0` wrapper so `fit="height"`'s `height: 100%` has a flexbox-computed height to resolve against.
- Confirmed `components/summary/board-summary.tsx`'s `fit="height"` call site is untouched (grep before/after).

## Task Commits

Single-task quick fix, committed atomically:

1. **Scale rail plots to fit height instead of scrolling** - `fc80f3d` (fix)

## Files Created/Modified
- `components/rails/rail-section-plot.tsx` - New exported `computeRailPlotBounds` helper; `RailSectionPlot` now calls it internally instead of inlining the same bounds math
- `components/rails/rail-band-editor.tsx` - Plots container no longer scrolls; each section wrapper's height is now `flex-grow`-proportional to its natural plot height; each `RailSectionPlot` now renders with `fit="height"`

## Decisions Made
- Extracted a small shared helper (`computeRailPlotBounds`) in `rail-section-plot.tsx` rather than duplicating the width/height formula in the editor -- per the plan's explicit allowance, since this is diagram-layout math (legitimately in `components/rails/`), not shaping geometry (which the project's `lib/`-only rule reserves for `lib/`)
- Proportional distribution via `flex-basis: 0` + `flex-grow: naturalHeight` rather than equal thirds or fixed pixel heights -- lets flexbox handle the ratio math natively and keeps nose/center/tail's relative sizes correct at any thickness combination
- Title kept as a separate `flex-none` sibling above a nested `flex-1 min-h-0` plot wrapper, rather than alongside the plot inside the `flex-grow` item directly -- `fit="height"`'s `height: 100%` needs an ancestor with a flexbox-resolved height, and this nesting isolates that from the title's own height

## Deviations from Plan

None - plan executed exactly as written. The plan explicitly anticipated and pre-authorized the one implementation decision made here (exporting a small helper from `rail-section-plot.tsx`).

## Issues Encountered

The dev server was confirmed listening on port 3000 (orchestrator-managed), but this session did not drive a browser to visually confirm the no-scroll/proportional-sizing outcome under real thickness values -- `npm run test`, `npm run lint`, and `npm run build` all pass, and the flex-grow/fit="height" mechanism was verified by source review against `rail-section-plot.tsx`'s existing (unit-tested-elsewhere) SVG sizing logic. Per this task's own instructions, live browser verification (all three sections open, thicknesses at max: centre 3.5", nose/tail 2.5", checking for no scrollbar and correct relative proportions) is left to the orchestrator's browser pass.

## User Setup Required

None.

## Next Phase Readiness

No blockers. Recommend the orchestrator's browser pass specifically drive the Rails screen to: (1) open all three sections and drag centre thickness to 3.5" and nose/tail to 2.5" -- confirm no scrollbar appears on the Rail Viewer card and no plot is clipped; (2) collapse one section and confirm the remaining plots grow to fill the freed space; (3) spot-check the Summary dashboard's compact rail plots row to confirm it renders exactly as before.

---
*Phase: quick-260821-rpf*
*Completed: 2026-08-21*

## Self-Check: PASSED
