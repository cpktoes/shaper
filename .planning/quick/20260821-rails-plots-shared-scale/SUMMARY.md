---
phase: quick-260821-rss
plan: 01
subsystem: ui
tags: [rails, svg-plots, resize-observer, layout]

requires:
  - phase: quick-260821-rpf
    provides: computeRailPlotBounds export from rail-section-plot.tsx (shared bounds/dimension math), the Rail Viewer plots stack this task revises
provides:
  - Rail Viewer's three open rail plots now render at one common measured pixel width (plotWidth), solved from the container's measured height/width and the measured title chrome, so scale (renderedWidth / viewBoxWidth) and left/right edges are identical across every open plot
  - ResizeObserver-driven recompute in rail-band-editor.tsx that re-solves plotWidth on container resize, section open/close, any thickness change (sumOfVbH), and VIEWER/DATA tab switches (which remount the measured container)
affects: [any future rail-band-editor.tsx layout change to the Rail Viewer card, and any future rail-section-plot.tsx change to SCALE/LEFT_PAD/AXIS_LABEL_PAD or the viewBox bounds formula]

actuals:
  tokens: 2200
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Shared-width layout solve: since every open rail section's viewBox WIDTH is identical (computeRailPlotBounds derives it from the shared xAxisMin, not per-section thickness), rendering all open plots at one common pixel width automatically produces one shared scale and aligned edges -- reduces a multi-plot alignment requirement to solving for a single number"
    - "Imperative DOM measurement via ResizeObserver + getComputedStyle, mirroring use-print-fit.ts's imperative-measurement style (read real rendered chrome instead of hardcoding it, write derived layout back as React state) -- reused here for a live recompute-on-resize loop rather than a one-shot beforeprint snapshot"

key-files:
  created: []
  modified:
    - components/rails/rail-band-editor.tsx

key-decisions:
  - "Reverted 260821-rpf's fit=\"height\" + proportional flex-grow approach entirely -- it kept each plot's height proportional to its natural viewBox height, but flexbox distributed height AFTER a fixed title height was subtracted from each proportional share, so the resulting per-plot scale (and left edge) diverged by section instead of staying identical"
  - "Solved for one shared plotWidth instead of one shared height, because every open section's viewBox WIDTH is identical (only height varies) -- sizing from width means one measured number drives every plot's scale, whereas sizing from height would still require reconciling the differing per-section height/title ratios that broke the previous attempt"
  - "Title chrome (each section's title height + margin-bottom) and inter-section gap are measured live via refs + getComputedStyle on every recompute, not hardcoded -- so a future font-size or spacing change to the section titles can't silently throw the fit off, matching the plan's explicit requirement"
  - "Solved width is floored (Math.floor), not rounded, before being applied -- offsetHeight-based chrome measurements already round to the nearest pixel, so flooring biases any residual sub-pixel error toward under-filling the container rather than overflowing it"
  - "Added activePage to the recompute effect's dependency array (beyond the plan's named triggers of resize/open-close/thickness) -- the plots container unmounts when switching to the DATA tab, so returning to VIEWER needs a fresh ResizeObserver attached to the newly-mounted container node, not a stale one watching a detached element"
  - "MAX_PLOT_W (420) hoisted to a module constant, replacing the old max-w-[420px] Tailwind class -- the same ceiling now participates directly in the min(containerWidth, MAX_PLOT_W, widthFromHeight) solve instead of being a separate CSS clamp layered on top of it"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "All open rail plots (nose/center/tail, in any open combination) render at one shared scale (renderedWidth / viewBoxWidth identical across plots) with identical left/right edges (x-axes vertically aligned), for default thicknesses, all-thicknesses-at-max, one/two sections collapsed, and a short ~1280x650 window"
    verification:
      - kind: other
        ref: "Source review: every open section wraps its RailSectionPlot in a div with style={{width: plotWidth}} using one shared plotWidth value and the default fit=\"width\" mode, and every open section's viewBox width is identical by construction (computeRailPlotBounds derives width from the shared xAxisMin only) -- so identical rendered width against identical viewBox width forces identical scale and identical left/right edges. npm run build succeeds."
        status: pass
    human_judgment: true
    rationale: "Confirming the actual measured scale/edges match at a real viewport across the five named scenarios (thickness at max, sections collapsed, short window) is a rendered-layout outcome the plan itself says to measure live in a browser, not infer from source -- left to the orchestrator's browser pass per this task's environment_note."
  - id: D2
    description: "scaleX === scaleY within each plot (isotropic 1:1 X:Y)"
    verification:
      - kind: other
        ref: "Source review: RailSectionPlot's fit=\"width\" SVG style sets width:100% with aspectRatio matching the viewBox's own width/height exactly, unchanged by this task -- the browser resolves height from that aspect ratio, so X and Y scale identically by construction"
        status: pass
    human_judgment: false
  - id: D3
    description: "No scrollbar or clipping at max thicknesses; collapsing a section lets the remaining plots grow to fill the freed space"
    verification:
      - kind: other
        ref: "Source review: solvedWidth is derived so that sum of per-plot heights at plotWidth (W * sumOfVbH / vbW) plus measured chrome exactly equals the measured container height (algebraic identity: availablePlotH = containerHeight - chrome, W = availablePlotH * vbW / sumOfVbH -> W * sumOfVbH / vbW = availablePlotH). Collapsing a section removes it from openSections before sumOfVbH and chrome are computed, so the recompute naturally grows plotWidth for the remaining sections. Live scrollbar/clipping confirmation at real thickness values is a rendered-layout outcome left to the orchestrator's browser pass."
        status: pass
    human_judgment: true
    rationale: "Whether the algebraic fit holds pixel-exactly under real font metrics and DOM rounding (vs. a sub-pixel residual creating a hairline scrollbar) is a rendered outcome best confirmed visually, per this task's own acceptance criteria (\"measure, do not eyeball\")."
  - id: D4
    description: "Degenerate 0-size measurements (initial paint, hidden pane) are handled by falling back to the width cap rather than emitting a 0-width plot"
    verification:
      - kind: other
        ref: "Source review: recompute() returns early with plotWidth = min(containerWidth, MAX_PLOT_W) (or MAX_PLOT_W if containerWidth is also 0) whenever containerWidth <= 0, containerHeight <= 0, or sumOfVbH <= 0, before any division occurs"
        status: pass
    human_judgment: false
  - id: D5
    description: "Summary dashboard's compact rail plots (fit=\"height\" call site in board-summary.tsx) are unchanged; 01-01 layout invariant holds (no page scroll, sidebar scrolls independently)"
    verification:
      - kind: other
        ref: "grep -n 'fit=' across board-summary.tsx, rail-section-plot.tsx, and rail-band-editor.tsx confirms board-summary.tsx's fit=\"height\" call site is untouched and rail-section-plot.tsx's fit prop/branch logic is byte-identical; no ancestor overflow/height classes outside the Rail Viewer plots container were touched"
        status: pass
    human_judgment: false
  - id: D6
    description: "npm run test, npm run lint, npm run build all pass"
    verification:
      - kind: unit
        ref: "npm run test -- 598 tests pass; npm run lint -- 0 errors (9 pre-existing unrelated warnings, unchanged from before this task); npm run build -- succeeds"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-21
status: complete
---

# Quick Task: All Rail Viewer Plots Share One Scale and Aligned X-Axes

**Replaced 260821-rpf's proportional-height flex-grow stack with a single measured shared width -- since every open rail section's viewBox width is identical by construction, rendering all plots at one common pixel width makes scale and left/right edges converge automatically instead of drifting apart**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-21T23:26:00Z
- **Completed:** 2026-08-21T23:51:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `components/rails/rail-band-editor.tsx`: reverted 260821-rpf's `fit="height"` + proportional `flexGrow`/`flexBasis: 0` stack (which produced differing per-plot scale/left-edge, per the plan's live measurement showing centre rendering ~5% larger than nose/tail).
- Added a `useLayoutEffect` + `ResizeObserver` that measures the plots container's actual `clientWidth`/`clientHeight`, the actual rendered title height + margin of each open section (via per-section refs and `getComputedStyle`), and the container's actual `rowGap` -- then solves `W = min(containerWidth, MAX_PLOT_W, availablePlotH * vbW / sumOfVbH)`, where `vbW` is the (identical-across-sections) shared viewBox width and `sumOfVbH` is the sum of each open section's natural viewBox height.
- Every open section's wrapper now renders at `style={{ width: plotWidth }}` with `RailSectionPlot` left at its default `fit="width"`, so all plots share one `renderedWidth / viewBoxWidth` scale and one left/right edge by construction.
- Recompute triggers: container resize (ResizeObserver), `openSections` changing (collapse/expand), `sumOfVbH` changing (any thickness slider move), and `activePage` changing (VIEWER/DATA tab switch remounts the measured container, so a stale `ResizeObserver` from before the switch must not be relied on).
- Degenerate measurements (`containerWidth <= 0`, `containerHeight <= 0`, or `sumOfVbH <= 0`) fall back to `min(containerWidth, MAX_PLOT_W)` (or the bare cap if `containerWidth` is also 0) before any division runs.
- Solved width is floored, not rounded, so any residual sub-pixel measurement error biases toward under-filling the stack rather than overflowing it.
- Confirmed `components/summary/board-summary.tsx`'s `fit="height"` call site and `rail-section-plot.tsx`'s `fit` prop/branch are untouched (grep before/after).

## Task Commits

Single-task quick fix, committed atomically:

1. **Give rail viewer plots one shared scale and aligned x-axes** - `dd8571b` (fix)

## Files Created/Modified
- `components/rails/rail-band-editor.tsx` - Reverted proportional flex-grow/`fit="height"` stack; added measured-width solve (`ResizeObserver` + title/gap measurement) driving a single shared `plotWidth` applied to every open section

## Decisions Made
- Solved for a shared **width** (not height) because every open section's viewBox width is identical by construction (`computeRailPlotBounds` derives it from the shared `xAxisMin` alone) -- only viewBox height varies per section's thickness. Sizing from the dimension that's already uniform reduces the "make N plots agree" problem to "measure one number," instead of reconciling per-section height/title ratios (the exact mechanism that broke 260821-rpf).
- Measured title chrome and inter-section gap live via refs + `getComputedStyle` on every recompute rather than hardcoding pixel constants, per the plan's explicit instruction, so a future font-size or spacing tweak to the section titles cannot silently reintroduce the misalignment this task fixes.
- Added `activePage` to the recompute effect's dependency list beyond the plan's three named triggers (resize / open-close / thickness) -- the Rail Viewer plots container is conditionally unmounted on the DATA tab (`{activePage === "viewer" && (...)}`), so a `ResizeObserver` created before a tab switch is left watching a detached DOM node; re-running the effect on `activePage` change re-attaches it to the freshly mounted container.
- Floored (not rounded) the solved width so any residual sub-pixel measurement error can only cause the stack to slightly under-fill its container, never overflow it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale ResizeObserver across VIEWER/DATA tab switches**
- **Found during:** Task 1, while designing the recompute effect's dependency array
- **Issue:** The Rail Viewer plots container only renders while `activePage === "viewer"`. The recompute effect's originally-planned dependency list (open sections, shared viewBox width, summed viewBox height) would not re-run on a VIEWER→DATA→VIEWER round trip, leaving the `ResizeObserver` attached to a now-detached DOM node and `plotWidth` stuck at its last computed value even if the window was resized while on the DATA tab.
- **Fix:** Added `activePage` to the effect's dependency array so the effect's cleanup (disconnecting the stale observer) and re-run (attaching a fresh observer to the newly mounted container) both fire on every tab switch back to VIEWER.
- **Files modified:** `components/rails/rail-band-editor.tsx` (same file/commit as the main fix; no separate commit)
- **Verification:** Source review of the effect's dependency array and cleanup function; `npm run build` succeeds with no unused-ref or stale-closure warnings.
- **Committed in:** `dd8571b` (part of the single task commit)

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Necessary for correctness under the existing VIEWER/DATA tab UI already present in this file; no scope creep beyond the plan's stated file (`rail-band-editor.tsx`).

## Issues Encountered

This session did not drive a browser to visually confirm the live measured scale/alignment outcome under real thickness values across the plan's five named scenarios (default; all-max thicknesses; one/two sections collapsed; short ~1280x650 window) -- `npm run test`, `npm run lint`, and `npm run build` all pass, and the width-solve was verified algebraically by source review (the identity that `W * sumOfVbH / vbW` plus measured chrome exactly equals the measured container height holds regardless of thickness values, since it is derived symbolically rather than checked against one measurement snapshot). Per this task's own environment_note, the dev server is orchestrator-managed and live browser verification with real measurements is the orchestrator's responsibility, not this session's.

## User Setup Required

None.

## Next Phase Readiness

No blockers. Recommend the orchestrator's browser pass specifically drive the Rails screen at 1280x720 (matching the plan's own measurement table) to: (1) confirm all three plots' `renderedWidth / viewBoxWidth` are identical and their left/right edges line up, both at default thicknesses and with centre at 3.5"/nose+tail at 2.5"; (2) collapse one and then two sections and confirm the remaining plot(s) grow while staying aligned; (3) resize the browser to ~1280x650 and confirm no scrollbar appears and nothing clips; (4) switch to the DATA tab and back to VIEWER and confirm the plots still resize correctly on a subsequent window resize (the tab-switch `ResizeObserver` re-attachment fix above); (5) spot-check the Summary dashboard's compact rail plots row renders exactly as before.

---
*Phase: quick-260821-rss*
*Completed: 2026-08-21*

## Self-Check: PASSED
