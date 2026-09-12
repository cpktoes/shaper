---
phase: 08-the-rails-screen-finished
plan: 03
subsystem: rails-screen
tags: [rails, instructions-tab, plan-side-figure, svg, units, ported-artwork]

requires:
  - phase: 08-01
    provides: "The INSTRUCTIONS tab shell, ExampleRailFigure, TwoOptionToggle and the RailInstructions component this plan extends with cards 2 and 3."
  - phase: 08-02
    provides: "The print-instructions preference stack (not directly consumed here, but confirms the INSTRUCTIONS tab's own content is what the third print sheet, 08-05, will reuse)."
provides:
  - "components/rails/rail-reference-paths.ts — the prototype's plan/side path data, viewBoxes and colour/width/dash maps, ported byte-for-byte and pinned by a parity test"
  - "components/rails/rail-plan-side-figure.tsx — RailPlanSideFigure, RAIL_REFERENCE_LEGEND, ALL_RAIL_REFERENCE_GROUPS, formatTaperTuckRange"
  - "public/rail-bands-plan-bg.png — a byte-identical copy of the reference plan-view artwork"
  - "The INSTRUCTIONS tab's remaining two cards: the three-step copy + nine-item legend + figure, and the closing note"
affects: [08-05-third-print-sheet]

actuals:
  tokens: 7900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A single ported data module (rail-reference-paths.ts) holds only literal prototype data — no React, no lib/geometry import — pinned against reference/project/Rails.dc.html by a source-contract test in the same idiom as lib/theme.test.ts and lib/units-isolation.test.ts"
    - "A figure box scales as one unit to its container width via a CSS aspect-ratio wrapper plus percentage-based column widths, rather than porting the prototype's own hard-coded 0.7492 transform constant"
    - "Font sizing inside a figure that must shrink/grow with its own container (not the viewport) uses the app's existing @container + cqw idiom (already established in components/summary/order-form.tsx), not a fixed px value"
    - "A dim-family range shared across two call sites (a figure's own caption and a screen's prose) is composed once, in the figure's own module, and exported for the second call site to reuse rather than re-deriving the same two formatDim calls"

key-files:
  created:
    - components/rails/rail-reference-paths.ts
    - components/rails/rail-reference-paths.test.ts
    - components/rails/rail-plan-side-figure.tsx
    - public/rail-bands-plan-bg.png
  modified:
    - lib/units-isolation.test.ts
    - components/rails/rail-instructions.tsx

key-decisions:
  - "The note column's layout width is honestly widened rather than reproducing the prototype's own overflow trick: the prototype gives its 'Taper Tuck to a Sharp Edge' text column only an 8px flex-basis and lets the 144px-wide text box overflow into the outer box's unused right margin (justify-content: center over-provisions 499px of width for 357px of packed columns). That has no responsive equivalent once the box scales to an arbitrary container width, so this port gives the note column its own real share of the layout (150px) instead — the column widths still sum back to the prototype's own 499px total, keeping the same overall proportions without depending on an overflow that would clip the moment the figure scales down."
  - "Text inside the figure scales with the figure's own measured width via CSS container queries (@container + cqw), matching the codebase's own precedent in order-form.tsx, rather than a fixed pixel size or a devicePixelRatio-based JS measurement — no ResizeObserver or JS scaling code was needed."
  - "formatTaperTuckRange (the '16-22\"' / '40.6-55.9 cm' tail-distance range) lives in rail-plan-side-figure.tsx, exported for rail-instructions.tsx's Step 3 copy to reuse verbatim, rather than composing the same two formatDim calls twice in two files."
tags-note: "n/a"

metrics:
  duration: ~20min
  completed: 2026-09-08
status: complete
---

# Phase 08 Plan 03: The Plan/Side Reference Figure and Its Copy Summary

Ports the prototype's "Turning Marks Into Rail Bands" figure — the plan-view artwork, hand-traced
deck-mark/rail-mark/tuck overlays, side strip, station labels and taper note — plus its three-step
instructional copy, nine-item legend and closing note, completing the INSTRUCTIONS tab's three-card
page (RAIL-05).

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 2

## Accomplishments
- `rail-reference-paths.ts` carries the prototype's own `planRefPaths()`/`sideRefPaths()` arrays,
  viewBoxes and colour/width/dash maps character-for-character, pinned against
  `reference/project/Rails.dc.html`'s own source by a 7-assertion parity test — including a
  byte-identical check of `public/rail-bands-plan-bg.png` against the reference archive copy,
  which stays untouched.
- `RailPlanSideFigure` draws the four-column plan/side layout (plan artwork + overlay, station
  label strip, side-view overlay, taper note) as one box that scales to its container's width,
  filtering both ported path arrays by a `visibleGroups` set; the side view's own board outline
  (`black`) is never gated, matching the prototype's own hardcoded-`true` show map.
- The INSTRUCTIONS tab now reads as the prototype's own three peer cards: the live example rail
  (08-01), the three-step copy + nine-item legend + this figure, and the italic closing note —
  all nine legend boxes start ticked, and the ticked set is local `useState` that never touches
  the design store.
- Both of D-04's literal figures — the three station labels and the tail-distance range — read
  through the display boundary: Imperial reproduces the prototype's own `16-22"` and `12"`
  verbatim (confirmed by a throwaway probe assertion during implementation), Metric shows
  `40.6-55.9 cm` and `30.5 cm`, unit carried once at the end of each range.

## Task Commits

Each task was committed atomically:

1. **Task 1: Move the artwork and the traced line data across, unchanged** - `f1981fb` (feat)
2. **Task 2: Draw the plan and side reference figure** - `5b4a394` (feat)
3. **Task 3: The instructional copy, the legend and the closing note** - `48f4809` (feat)

## Files Created/Modified
- `components/rails/rail-reference-paths.ts` - `PLAN_REF_PATHS`, `SIDE_REF_PATHS`,
  `PLAN_REF_VIEWBOX`, `SIDE_REF_VIEWBOX`, `REF_GROUP_COLORS`, `REF_GROUP_WIDTHS`,
  `REF_GROUP_DEFAULT_WIDTH`, `REF_DASH_PX`, `GATEABLE_RAIL_REFERENCE_GROUPS`, `RailReferenceGroup`
  — pure ported data, no React, no `lib/geometry/` import
- `components/rails/rail-reference-paths.test.ts` - extracts the prototype's own
  `planRefPaths()`/`sideRefPaths()` arrays, viewBoxes and colour maps from
  `reference/project/Rails.dc.html` by balanced-bracket parsing + `new Function()` evaluation (the
  same idiom `scripts/extract-prototype-rails-golden.mjs` already uses) and asserts deep equality
  against the ported constants; also proves the PNG copy is byte-identical and the gateable-group
  count is exactly nine
- `public/rail-bands-plan-bg.png` - byte-identical copy of `reference/project/assets/rail-bands-plan-bg.png`
  (`cmp` exits 0; reference copy untouched)
- `components/rails/rail-plan-side-figure.tsx` - `RailPlanSideFigure` (the figure box),
  `RAIL_REFERENCE_LEGEND` (the nine legend entries in the prototype's own order),
  `ALL_RAIL_REFERENCE_GROUPS` (every gateable group, for a future all-lines caller),
  `formatTaperTuckRange` (the shared tail-distance range composition)
- `lib/units-isolation.test.ts` - adds `{ file: "components/rails/rail-plan-side-figure.tsx", converted: true }` to `DESIGN_SCREEN_DISPLAY_FILES`
- `components/rails/rail-instructions.tsx` - adds card 2 (toggle instruction, three numbered
  steps, nine-item legend wired to local `visibleGroups` state, `RailPlanSideFigure`) and card 3
  (the closing note)

## Decisions Made
- The note column's layout width is honestly widened (150px of the figure's own 499px total)
  rather than reproducing the prototype's overflow-into-margin trick, which has no responsive
  equivalent once the whole figure scales to an arbitrary container width — see key-decisions
  above for the full reasoning.
- Text inside the figure scales via the app's own existing `@container` + `cqw` pattern
  (`order-form.tsx`'s precedent), not a fixed pixel size or JS-measured scaling.
- `formatTaperTuckRange` is exported from the figure's own module so Step 3's prose composes the
  identical range rather than a second, potentially-drifting pair of `formatDim` calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking] A code comment's literal identifier tripped the plan's own "tab uses its own ticked set" acceptance check**
- **Found during:** Task 3, running the acceptance-criteria greps
- **Issue:** `grep -c 'ALL_RAIL_REFERENCE_GROUPS' components/rails/rail-instructions.tsx` is required to return 0 (the plan's own acceptance criterion, proving the tab never borrows the "every group" constant meant for the future print sheet) — a code comment explaining *why* the tab does not use that constant named it literally, tripping the same grep it was explaining.
- **Fix:** Reworded the comment to describe the constant in prose ("RailPlanSideFigure's own 'every gateable group' constant") instead of naming the identifier.
- **Files modified:** `components/rails/rail-instructions.tsx`
- **Commit:** `48f4809` (folded into the Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Comment-only fix; no behavioral change. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Human Verification Deferred to End-of-Phase UAT

Per `workflow.human_verify_mode: end-of-phase` and the orchestrator's ruling, every `<human-check>`
and backstop item below was not performed by this executor and is carried forward for the phase's
UAT pass:

- **Task 2:** Side-by-side against the prototype's own "Turning Marks Into Rail Bands" figure at
  the same zoom: confirm every line lands on the same feature of the board outline, the three
  station labels sit at the same heights, and the side strip and taper note match.
- **Task 2:** Switch to Metric and confirm the station labels read in centimetres and the taper
  note's range reads in centimetres with the unit carried once.
- **Task 2:** View the figure in each theme, including a dark one, and confirm the card stays
  legible and light.
- **Task 3:** Open INSTRUCTIONS and confirm the page reads top to bottom as three cards: the
  example rail, then the steps + legend + figure, then the italic note — matching the prototype's
  own order.
- **Task 3:** Untick all nine boxes and confirm the marking lines disappear while the board
  outline, side strip and station labels stay; tick a mixed subset and confirm exactly those
  families draw.
- **Task 3:** Read the three steps and the closing note in Imperial against the prototype's own
  text, word for word.
- **Task 3:** At the narrowest desktop card width, confirm every legend label wraps beside its dot
  rather than truncating, and the copy wraps without clipping in both systems.
- **Plan-level backstop:** View the tab in Imperial and Metric and confirm the three steps and the
  closing note wrap without truncation and the Metric figures read in centimetres.
- **Plan-level backstop:** At the narrowest desktop card width every legend label wraps onto a
  second line beside its dot rather than truncating, matching the VIEWER legend's own wrapping
  behaviour.

## Next Phase Readiness
- `RailPlanSideFigure` and `ALL_RAIL_REFERENCE_GROUPS` are ready for 08-05's third print sheet to
  render the fixed, all-lines reference figure (D-08) without borrowing this tab's own ticked
  state.
- `formatTaperTuckRange` is available for any future caller that needs the same tail-distance
  range without re-deriving it.
- No blockers.

## Self-Check: PASSED

- FOUND: components/rails/rail-reference-paths.ts
- FOUND: components/rails/rail-reference-paths.test.ts
- FOUND: components/rails/rail-plan-side-figure.tsx
- FOUND: public/rail-bands-plan-bg.png
- FOUND: commit f1981fb
- FOUND: commit 5b4a394
- FOUND: commit 48f4809

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-08*
