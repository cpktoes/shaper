---
phase: 08-the-rails-screen-finished
plan: 04
subsystem: rails-screen
tags: [rails, view-full-sized, print, actual-size, units, dialog]

requires:
  - phase: 08-01
    provides: "The rails screen's TabbedPanel/ViewerToolbarButton wiring and RailSectionPlot's callout plumbing this plan builds beside, unmodified."
  - phase: 08-03
    provides: "Confirms the INSTRUCTIONS tab's own content model (nothing this plan reuses directly, but the same RailSectionPlot instance both plans render through)."
provides:
  - "components/rails/view-full-sized-dialog.tsx — ViewFullSizedDialog, opened from one VIEWER toolbar button, drawing any of Nose/Center/Tail at true physical size"
  - "A 2-inch/50.8mm check bar and a no-calibration caveat, captioned through formatCalibrationMark"
  - "A working Print path: the same true-size rail and check bar reach paper under app/design/rails/actual-size.css's @media print rules"
  - "components/rails/rail-section-plot.tsx now exports its own px-per-inch drawing scale (SCALE) for a caller that needs to convert its viewBox back to real inches"
affects: [08-05-third-print-sheet, 08-06-production-migration]

actuals:
  tokens: 6462
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A dialog-local measured px-per-inch probe, replicated (not imported) from the summary screen's own print-fit technique, for an on-screen true-size drawing"
    - "A printed element's true size is expressed twice: measured CSS pixels for on-screen display, and a CSS custom property holding the plain inch number for print, read back through calc(var(--x) * 1in) — sidesteps any on-screen DPI/zoom ambiguity for the printed page, which has none"
    - "A component's own internal drawing-scale constant (SCALE, px per inch) exported once a second consumer needs to convert its viewBox back to physical units, rather than a second caller-side guess at the same number"

key-files:
  created:
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts
    - app/design/rails/actual-size.css
  modified:
    - components/rails/rail-band-editor.tsx
    - components/rails/rail-section-plot.tsx
    - app/design/rails/page.tsx
    - lib/units-isolation.test.ts

key-decisions:
  - "Exported rail-section-plot.tsx's private SCALE constant (56 px per inch) rather than deriving the dialog's true-size math only from computeRailPlotBounds's already-in-inches minX/minY/maxY fields. Those fields exclude the plot's own axis-label chrome (LEFT_PAD/AXIS_LABEL_PAD), so sizing the dialog's box to them alone and letting the SVG's fit=\"width\" scale the WHOLE viewBox (chrome included) into that box would draw the rail 15-20% smaller than true size for a typical nose section -- a correctness failure for the one promise RAIL-04 exists to make. Exporting SCALE (an additive, behavior-preserving change to an existing file outside the plan's own file list) is Rule 2: the missing piece needed to actually be true size, not merely close."
  - "components/rails/rail-band-editor.tsx's own root div is marked data-print-hide (also outside the plan's stated file list for Task 3, added as Rule 2) because Base UI's Dialog portals its popup and backdrop outside RailBandEditor's own DOM subtree -- without hiding the rest of the rails screen explicitly, printing from the dialog would print the sidebar and toolbar alongside it, breaking D-15's \"only the dialog's own content reaches paper\" promise."
  - "The true-size plot box and check bar carry their physical size twice: an inline CSS pixel width/height (measured px-per-inch times the drawing's real inches) for on-screen display, and a --vfs-w-in/--vfs-h-in custom property holding the plain inch number, read back by app/design/rails/actual-size.css's @media print rule as calc(var(--vfs-w-in) * 1in). A printed page has no screen-DPI or browser-zoom ambiguity the way an on-screen probe does, so print reads the real inch number directly through a CSS absolute unit rather than re-using (or re-measuring) the on-screen pixel value, which could disagree with paper if the browser was zoomed when the dialog was opened."
  - "components/rails/view-full-sized-dialog.tsx is named in BOTH lib/units-isolation.test.ts ledgers: DESIGN_SCREEN_DISPLAY_FILES (added in Task 1, required by that task's own verify command since the file lives under components/rails/ and already imported lib/geometry/units) and PRINT_SURFACE_DISPLAY_FILES (added in Task 3, per RESEARCH.md Pitfall 2, so the print-specific checks -- no conversion factor of its own, no litres figure branched on the units system -- also run over it). Both are genuinely true of this one file."

requirements-completed: [RAIL-04, RAIL-06]

duration: ~55min
completed: 2026-09-08
status: complete
---

# Phase 08 Plan 04: View Full Sized — the Rail at Actual Size Summary

A single "View Full Sized" button on the rails VIEWER toolbar opens a dialog holding any of the
Nose, Center or Tail rail cross-sections drawn at true, physical size, with a 2-inch check bar next
to a one-line caveat (no calibration step), and a Print button that puts the same rail and check
bar on paper.

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 4

## Accomplishments
- A shaper can click **View Full Sized** on the rails VIEWER toolbar and see any of the three
  rails — Nose, Center, Tail — drawn at true, physical size, flipping between them with tabs
  inside the dialog without closing it. The dialog always offers all three tabs even when a
  section is collapsed in the sidebar, and opens on the first section that is open (Nose if none
  are).
- The drawing is rendered through the exact same `RailSectionPlot` the VIEWER tab already uses —
  same grid, axis ticks, coloured bands, dots and shared legend — sized in explicit CSS pixels
  computed from a locally measured px-per-inch probe and the plot's own real-inch bounds, never a
  percentage viewBox fit and never a multiply by the browser's device pixel ratio.
- A one-line caveat ("This assumes a standard screen at 100% zoom — check it against the bar
  below.") sits beside a 2-inch check bar, drawn from the same measurement the Full Sized
  Template's own scale-check square uses and captioned by the same `formatCalibrationMark`
  formatter — never a hand-typed caption, in either system. There is no calibration step anywhere.
- Pressing Print puts the same true-size rail and check bar on paper, with a note to turn "Fit to
  page" off in the browser's print dialog. Only the dialog's own content reaches paper — the
  rails screen's sidebar and toolbar, and the dialog's own title, tab strip and footer, are all
  hidden from print.

## Task Commits

Each task was committed atomically:

1. **Task 1: One toolbar button opens the rail at actual size** - `3734127` (feat)
2. **Task 2: The caveat and the check bar that answers it** - `5d115a8` (test)
3. **Task 3: Put the actual-size rail on paper** - `fa54025` (feat)

_Note on the TDD sequence: see "TDD Gate Compliance" below — Task 2's implementation content
landed in Task 1's commit, so its own test commit did not observe a genuine RED phase against this
codebase's history._

## Files Created/Modified
- `components/rails/view-full-sized-dialog.tsx` - `ViewFullSizedDialog`: the dialog itself, its
  Nose/Center/Tail tabs, the true-size plot box, the check bar, the caveat, and the Print
  footer
- `components/rails/view-full-sized-dialog.test.ts` - 7 source-contract assertions pinning the
  formatter-derived caption, the absence of a local conversion factor / device-pixel-ratio read,
  the exact caveat and print-note copy, and the absence of any calibration-flow wording
- `components/rails/rail-section-plot.tsx` - exports its own `SCALE` (px-per-inch drawing
  constant); no behavior change for any existing caller
- `components/rails/rail-band-editor.tsx` - wires the `ViewerToolbarButton` + `ViewFullSizedDialog`
  into the VIEWER tab; marks its own root `data-print-hide`
- `app/design/rails/actual-size.css` - new route-scoped `@media print` stylesheet
- `app/design/rails/page.tsx` - imports the new stylesheet
- `lib/units-isolation.test.ts` - lists the new file in both the design-screen and print-surface
  ledgers

## Decisions Made
See `key-decisions` in the frontmatter above for the full reasoning on: exporting `SCALE` rather
than approximating true size from already-in-inches bounds alone; marking `RailBandEditor`'s own
root `data-print-hide`; the on-screen-pixel-vs-print-CSS-inch split for true-size sizing; and why
the new file sits in both `units-isolation.test.ts` ledgers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - missing critical functionality] Exported `SCALE` from `rail-section-plot.tsx`**
- **Found during:** Task 1, while deriving the true-size box's width/height
- **Issue:** `computeRailPlotBounds`'s exposed `minX`/`minY`/`maxY` fields are already real inches,
  but its `width`/`height` fields mix those inches with the plot's own private `SCALE`/`LEFT_PAD`/
  `AXIS_LABEL_PAD` constants. Sizing the dialog's box from `minX`/`maxY` alone (excluding the axis-
  label chrome) and letting the SVG's `fit="width"` scale the WHOLE viewBox (chrome included) into
  that box would draw the rail's actual segments meaningfully smaller than true size — roughly
  15-20% for a typical nose section, verified by hand against the numbers.
- **Fix:** Exported the existing private `SCALE` constant (56 px/inch) — a one-line, additive
  change with no effect on any other caller — so the dialog can convert the plot's own viewBox
  width/height back to true inches directly (`bounds.width / SCALE`), scaling content and chrome
  together at the same true-scale factor.
- **Files modified:** `components/rails/rail-section-plot.tsx`
- **Commit:** `3734127` (Task 1)

**2. [Rule 2 - missing critical functionality] Marked `RailBandEditor`'s own root `data-print-hide`**
- **Found during:** Task 3, while designing the print path
- **Issue:** Base UI's `Dialog` portals its popup and backdrop outside `RailBandEditor`'s own DOM
  subtree (typically to the end of `<body>`). Without explicitly hiding the rest of the rails
  screen, printing from the dialog would also print the sidebar, the tab strip and the toolbar
  behind it — breaking D-15's explicit promise that only the dialog's own content reaches paper.
- **Fix:** Added `data-print-hide` to `RailBandEditor`'s outer root `<div>`, the same idiom the
  order form already uses; the dialog's own content is unaffected since it is never a descendant
  of that attribute.
- **Files modified:** `components/rails/rail-band-editor.tsx`
- **Commit:** `fa54025` (Task 3)

**3. [Rule 3 - blocking] Added the new file to `DESIGN_SCREEN_DISPLAY_FILES` during Task 1**
- **Found during:** Task 1, running its own `<verify>` command (`... && npx vitest run
  components/rails/rail-section-plot.test.ts lib/units-isolation.test.ts`)
- **Issue:** `view-full-sized-dialog.tsx` lives under `components/rails/`, one of
  `findScreenTsxFiles()`'s walked folders, and already imported `lib/geometry/units` in its Task 1
  baseline — `lib/units-isolation.test.ts`'s own completeness check failed because the file was
  named in neither ledger yet. Task 1's action text didn't mention this ledger edit (Task 3's does,
  for the separate print-surface ledger), but Task 1's own verify command required it.
- **Fix:** Added `{ file: "components/rails/view-full-sized-dialog.tsx", converted: true }` to
  `DESIGN_SCREEN_DISPLAY_FILES` in Task 1's commit; Task 3 later added the same file to
  `PRINT_SURFACE_DISPLAY_FILES` and `findPrintSurfaceFiles()`'s return list per its own action text.
- **Files modified:** `lib/units-isolation.test.ts`
- **Commit:** `3734127` (Task 1)

---

**Total deviations:** 3 auto-fixed (2 missing-critical, 1 blocking)
**Impact on plan:** All three are corrections needed for the plan's own stated promises (true
size, print-only-the-dialog, and the plan's own verify command) or fill in a ledger requirement the
plan's Task 3 action text already implied for the print-surface half. No scope creep.

## TDD Gate Compliance

Task 2 is marked `tdd="true"`. The git log shows a `test(08-04)` commit (`5d115a8`) followed later
by a `feat(08-04)` commit (`fa54025`), which satisfies the gate-sequence check mechanically — but
the RED phase this sequence is meant to prove was not genuine against this codebase's own history:
Task 1's commit (`3734127`) already included the caveat text, the check bar and the
`formatCalibrationMark` call, because the true-size sizing work in that task shared the same
measured-px-per-inch machinery the check bar needed, and splitting them cleanly across two commits
would have meant temporarily regressing already-correct code purely for process ceremony.

`view-full-sized-dialog.test.ts` was written against the already-complete implementation and all 7
assertions passed immediately. Per the fail-fast rule, this was investigated rather than accepted
at face value: two representative assertions (the caveat-sentence check and the no-calibration-
wording check) were individually confirmed to fail against a deliberately-broken copy of the source
— the caveat text and the "check it against the bar below" phrase were each temporarily mutated,
the corresponding test was re-run and observed to fail, and the file was restored — before trusting
the suite as a real regression guard rather than a vacuous one. The test commit's own diff is
test-file-only (no source changes), consistent with a GREEN-already-landed rather than a
regression-covering commit.

## Human Verification Deferred to End-of-Phase UAT

Per `workflow.human_verify_mode: end-of-phase` and the orchestrator's ruling, every `<human-check>`
below was not performed by this executor and is carried forward for the phase's UAT pass:

- **Task 1:** On `/design/rails` VIEWER, click View Full Sized, hold a ruler to the screen against
  a known rail dimension, and confirm it measures true.
- **Task 1:** Collapse the Nose section in the sidebar, open the dialog, and confirm all three tabs
  are still offered and it opened on the first section that is open.
- **Task 1:** Open the dialog on a narrow window so the drawing exceeds the dialog, and confirm the
  drawing scrolls rather than shrinking.
- **Task 2:** Hold a ruler against the check bar on screen in Imperial and confirm it measures
  true; switch to Metric and confirm the caption changes to the millimetre value while the bar
  itself does not move.
- **Task 3:** Open the dialog, press Print, turn "Fit to page" off in the browser's print dialog,
  print to paper, and measure the check bar and one known rail mark with a ruler — both must be
  true.
- **Task 3:** Do the same in Metric and confirm the check bar's caption reads the millimetre value
  and the rail still measures true.
- **Task 3:** Confirm nothing else from the rails screen — sidebar, tab strip, toolbar, buttons —
  reaches the printed page.
- **Plan-level backstop (RAIL-04's edge-coverage probe):** the plan's own `must_haves.truths` marks
  this as an explicit planner assumption rather than a numeric edge case — RAIL-04's only real
  boundary is the physical accuracy of a screen the app cannot measure, which the check bar answers
  as a passive, ruler-verified check rather than a code path. No automated test exists for this;
  it is the same ruler checks listed above.

## Issues Encountered
None beyond the three auto-fixed deviations documented above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `ViewFullSizedDialog` and the `SCALE` export are available for any future caller that needs a
  true-size rail drawing.
- `app/design/rails/actual-size.css` establishes the pattern for a route-scoped `@media print`
  stylesheet outside `components/summary`, should a future plan need one elsewhere.
- No blockers for 08-05 (the third print sheet) or 08-06 (the production migration).

## Self-Check: PASSED

- FOUND: components/rails/view-full-sized-dialog.tsx
- FOUND: components/rails/view-full-sized-dialog.test.ts
- FOUND: app/design/rails/actual-size.css
- FOUND: commit 3734127
- FOUND: commit 5d115a8
- FOUND: commit fa54025

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-08*
