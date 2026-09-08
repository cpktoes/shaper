---
phase: quick-260908-adg
plan: 01
subsystem: rails-instructions-tab
tags: [rails, instructions-tab, layout, css]
status: complete
dependency-graph:
  requires: []
  provides:
    - "INSTRUCTIONS tab card 1 draws its example rail at a real size"
    - "INSTRUCTIONS tab card 2's plan/side figure is capped at the prototype's own rendered size"
  affects:
    - components/summary/rail-instructions-sheet.tsx (inherits both size changes on the printed third sheet, unedited)
tech-stack:
  added: []
  patterns:
    - "Fixed pixel height (h-[350px] flex-none) for a card inside an overflowing scroll column, ported directly from the prototype's own literal CSS rather than invented as a proportional share"
    - "A derived maxWidth cap on an existing @container aspect-ratio box, computed from existing layout constants rather than hand-typed, so a responsive box gets a ceiling without breaking its container-query-driven font sizing"
key-files:
  created: []
  modified:
    - components/rails/rail-instructions.tsx
    - components/rails/rail-plan-side-figure.tsx
decisions:
  - "Card 1's height is fixed at 350px (the prototype's own Rails.dc.html value), not made proportionally larger, because a percentage/flex-1 height has nothing definite to resolve against in a column that is already overflowing"
  - "The plan/side figure's cap is expressed as a height (472px, the prototype's own rendered height) with the width derived from it through FIGURE_CONTENT_WIDTH and FIGURE_HEIGHT, never typed by hand"
  - "The cap lives on the inner @container aspect-ratio box, not the outer light card, so the label font's clamp(9px, 3.2cqw, 20px) keeps reading against the capped box and lands on the prototype's own label size with no font value touched"
metrics:
  duration: "~25 min"
  completed: 2026-09-08
actuals:
  tokens: 1631
  tasks: 2
  commits: 2
---

# Phase quick-260908-adg Plan 01: Size the rails INSTRUCTIONS tab's two figures like the prototype Summary

Gave the INSTRUCTIONS tab's "Understanding Rail Markings" card the prototype's own fixed 350px
height (so its example rail has a box to draw into instead of collapsing to 0x0), and capped the
"Turning Marks Into Rail Bands" plan/side figure at the prototype's own rendered size (472px tall,
about 374px wide) so the whole example board is visible at once instead of only its nose.

## What Changed

### Task 1 — `components/rails/rail-instructions.tsx`

Card 1's className changed from:
```
flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-surf-line-faint p-5
```
to:
```
flex h-[350px] flex-none flex-col gap-3 rounded-lg border border-surf-line-faint p-5
```

Everything else in the card is untouched — the inner figure box still reads
`flex min-h-0 flex-1 items-center justify-center`, and `ExampleRailFigure` still renders through
`RailSectionPlot` with `fit="height"`. Those two are what turn the fixed card's leftover space
under the heading into the plot's real height. `flex-none` matters as much as the fixed height —
without it, a plain flex item still has `flex-shrink: 1` and the card would compress back down
inside the overflowing scroll column.

Added a short comment above the card explaining why the height is fixed (ported from
`Rails.dc.html` line 359, because a proportional height has nothing definite to resolve against
in an already-overflowing column), and amended the file's header comment to name card 1's fixed
height explicitly rather than leaving a reader to wonder why only one of the three cards is sized.

### Task 2 — `components/rails/rail-plan-side-figure.tsx`

Added two new constants directly after `FIGURE_CONTENT_WIDTH`:

```
FIGURE_MAX_RENDERED_HEIGHT = 472        // the prototype's own rendered height: 630 * 0.7492
FIGURE_MAX_RENDERED_WIDTH  = (FIGURE_MAX_RENDERED_HEIGHT * FIGURE_CONTENT_WIDTH) / FIGURE_HEIGHT
                            = 373.85...px  // computed, never hand-typed
```

Applied `FIGURE_MAX_RENDERED_WIDTH` as `maxWidth` in the inline style of the existing
`@container relative mx-auto w-full` div, alongside the `aspectRatio` it already carries. The
outer light card keeps `mx-auto w-full` and stays full width; only the inner aspect-ratio box gets
the ceiling, so the plan PNG, both SVG overlays, the station labels and the taper note all continue
to shrink together below the cap, and `mx-auto` centres the capped box exactly as the prototype
centred its own frame.

No font size was touched. `LABEL_FONT_SIZE` (`clamp(9px, 3.2cqw, 20px)`) reads against the same
`@container` box, so at the capped 373.85px width it now computes to 11.96px — the prototype's own
16px label at its own 0.7492 rendering (16 × 0.7492 = 11.99px). A comment records this next to the
constant.

Rewrote the header comment's sentence describing the fit rule: it now says the figure fits its
container's width up to the prototype's own rendered size, and states the shaper's reason (the
whole example board has to be visible, not just its nose) rather than only naming the mechanism.

No CSS `scale()` transform was added anywhere in the file (verified by grep over non-comment
lines) — the cap is a `maxWidth`, not a re-introduction of the prototype's hard-coded `0.7492`
transform.

## `components/summary/rail-instructions-sheet.tsx` — confirmed untouched

Grep and `git diff` confirm this file was not opened for edit. It directly imports and renders
`RailPlanSideFigure` for the order form's third printed sheet, so Task 2's size change reaches the
printed page automatically with no edit to the sheet itself. Its own test,
`rail-instructions-sheet.test.ts`, is a source-contract test over that file's own text and passed
unchanged — no test file was edited by this plan.

**Printed appearance change (plain English):** the order form's third sheet will now show the
plan/side figure at its natural, capped size — about 374px wide, centred in its box — rather than
stretched to fill the full width of the printed sheet. This is a real visual change to the printed
page and is called out here per the plan's design decision; it has not yet been looked at in a
print preview (see Human Verification Deferred below).

## Test Counts

Baseline on clean `main` at planning time: **41 test files, 2208 passed, 2 skipped (2210)**.

After both tasks, full `npm test`: **41 test files, 2208 passed, 2 skipped (2210)** — identical,
as required since no test was added or edited.

Per-task gate (`npx vitest run components/rails components/summary components/viewer
lib/units-isolation.test.ts`) was green after Task 1 (9 files, 82 tests passed) and the narrower
gate (`components/rails components/summary lib/units-isolation.test.ts`) was green after Task 2
(7 files, 73 tests passed).

`npx tsc --noEmit`: clean apart from the two known phantom `LayoutProps` errors in
`app/design/layout.tsx` and `app/layout.tsx`, expected in a worktree per the orchestrator's ruling.

`npm run lint`: one pre-existing error in `components/rails/view-full-sized-dialog.tsx` (a
`react-hooks/set-state-in-effect` violation), out of scope — that file was not touched by either
task and the issue is unrelated to this plan's changes. No new lint errors were introduced by
either changed file.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` and `<done>`
specifications: the card 1 className is byte-for-byte the specified string, the two new constants
are named and derived exactly as specified, and the header/inline comments cover the reasoning the
plan asked for.

## Human Verification Deferred

Both `<human-check>` items from the plan require a running browser and were not performed by the
executor (per the orchestrator's ruling, this quick task's human checks are recorded here rather
than returned as a checkpoint; the orchestrator measures the result in a browser on localhost after
merging):

1. **Task 1 human-check:** "On the rails screen's INSTRUCTIONS tab, the first card stands about
   350px tall and the example rail is drawn inside it, at a readable size with its mark names
   beside it — in both the Flat and the Domed state of the toggle." — Not yet visually verified.
   The CSS change is mechanically confirmed (`h-[350px] flex-none` in place, inner figure box and
   `fit="height"` untouched, all relevant vitest suites green), but the actual rendered pixel size
   and label legibility should be looked at in a browser.

2. **Task 2 human-check:** "On the INSTRUCTIONS tab, the whole example board in 'Turning Marks
   Into Rail Bands' is visible at once without scrolling the figure — it sits centred in its light
   card, no taller than 472px, with the station labels and the taper note readable. Narrowing the
   browser makes it shrink, not overflow. On the Summary screen's print preview with the rail
   instructions sheet turned on, the third sheet shows both figures at that same size and nothing
   runs off the page." — Not yet visually verified, including the print preview of the third sheet
   called for explicitly in the plan's design decision. The `maxWidth` derivation and absence of
   any `scale()` transform are mechanically confirmed.

## Self-Check: PASSED

- FOUND: components/rails/rail-instructions.tsx (modified, exists)
- FOUND: components/rails/rail-plan-side-figure.tsx (modified, exists)
- FOUND: commit 51f6ce8 (Task 1)
- FOUND: commit 5538dde (Task 2)
- Confirmed via `git diff 8b3a3a1..HEAD --stat`: exactly these two files changed, nothing deleted.
