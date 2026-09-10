---
phase: quick-260910-kz2
plan: 01
subsystem: ui
tags: [react, tailwind, playwright, vitest, print, rail-bands]

requires:
  - phase: quick-260910-jfp
    provides: RailPlanSideFigure's printed line key (showLineKey), RAIL_REFERENCE_LEGEND
provides:
  - "RailPlanSideFigure fit='height' mode: the plan/side figure can now size from a box's HEIGHT (deriving width) instead of only ever sizing from a fixed width"
  - "FIGURE_MAX_CARD_HEIGHT_PX exported from rail-plan-side-figure.tsx (the pixel cap has one home)"
  - "RailInstructionsSheet divides its own height between the example rail and the plan/side figure via min(FIGURE_MAX_CARD_HEIGHT_PX px, 85%), instead of handing the figure an unshrinkable floor"
affects: [phase-08-rails-screen-finished]

actuals:
  tokens: 10032
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "fit=\"width\" | \"height\" prop on a diagram component, mirroring rail-section-plot.tsx's own fit prop — one vocabulary for one idea across two rail-band diagrams"
    - "min(pixel-cap px, percentage%) inline style for a height budget shared between two flex siblings, with a dedicated wrapper column so the percentage resolves against the right container"

key-files:
  created:
    - e2e/summary-rail-instructions-fit.spec.ts
  modified:
    - components/rails/rail-plan-side-figure.tsx
    - components/summary/rail-instructions-sheet.tsx
    - components/rails/rail-plan-side-figure.test.ts
    - components/summary/rail-instructions-sheet.test.ts

key-decisions:
  - "FIGURE_MAX_BODY_SHARE_PERCENT = 85, chosen because the cap first has any effect at ~536 dots of page area — 24 dots clear of 560, the narrowest page either protected print sweep measures"
  - "The two drawings' height budget is a dedicated wrapper column (heading stays flex-none, drawings share a separate flex-1/min-h-0 column) — a percentage height resolves against its flex CONTAINER, so without this wrapper 85% would mean 85% of the whole sheet body including the heading"
  - "max-width: 100% left in the height-driven drawing box as an inert guard (measured at plan time to never bind on any real page) rather than removed, matching the plan's own 'considered and rejected' analysis"

requirements-completed: []  # Task 3 (browser verification) is outstanding — see status below.

coverage:
  - id: D1
    description: "RailPlanSideFigure supports fit=\"height\": drawing height leads, width is derived from the aspect ratio, guarded by an inert max-width; fit defaults to \"width\" so the RAILS tab is unchanged"
    requirement: "PRNT-05"
    verification:
      - kind: unit
        ref: "components/rails/rail-plan-side-figure.test.ts#RailPlanSideFigure's height-driven fit (quick 260910-kz2)"
        status: pass
      - kind: e2e
        ref: "e2e/summary-rail-instructions-fit.spec.ts"
        status: unknown
    human_judgment: true
    rationale: "The source-contract tests prove the code is structured correctly, but only a real browser proves the example rail drawing actually has a real size at every narrow width and that nothing moves at the widths that already print today — that is Task 3, not yet run."
  - id: D2
    description: "RailInstructionsSheet divides its height between the example rail and the plan/side figure via a dedicated wrapper column and min(502px, 85%), instead of the figure holding an unshrinkable 502px floor that pushed the example rail to zero"
    requirement: "PRNT-05"
    verification:
      - kind: unit
        ref: "components/summary/rail-instructions-sheet.test.ts#RailInstructionsSheet's height division between its two drawings (quick 260910-kz2)"
        status: pass
      - kind: e2e
        ref: "e2e/summary-rail-instructions-fit.spec.ts"
        status: unknown
    human_judgment: true
    rationale: "Same as D1 — the browser proof (narrow sweep, control sweep, desktop invariance, protected-gate green) is Task 3, run by the orchestrator on the main checkout, not yet executed."

duration: unknown
completed: 2026-09-10
status: incomplete
---

# Quick Task 260910-kz2: Stop the Rail Instructions Sheet Clipping Its Example Rail — Summary

**The printed Rail Band Instructions page's example rail drawing now shrinks together with the reference figure above it instead of being thrown away entirely on a small page — Tasks 1 and 2 done, Task 3 (the browser proof) is the orchestrator's, on the main checkout.**

## Status: INCOMPLETE — Task 3 outstanding

This worktree executor completed Task 1 (RED tests) and Task 2 (the fix) only, per this quick
task's own explicit instruction: **Task 3 is a `checkpoint:human-verify` addressed to the
orchestrator on the main checkout** — a worktree cannot run Playwright at all (`npm run dev` fails
here with Turbopack's "Could not find the Next.js package", the same failure `npm run build`
gives). No browser reading was taken, measured, or written down by this executor. The file
`260910-kz2-BROWSER-READING.md` named in the plan's `must_haves.artifacts` does **not** exist yet
and must not be fabricated — it holds numbers the orchestrator measures, never ones derived here.

`STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were **not** updated by this executor (per this run's
own constraints) — that is the orchestrator's job once Task 3's readings are in hand.

## What the orchestrator must run next (Task 3)

On the main checkout, with the dev server already running on port 3005 left alone (do not start a
second one, do not touch `.next/dev/lock`):

```bash
PW_PORT=3108 npx playwright test e2e/summary-rail-instructions-fit.spec.ts
```
Expect: the narrow-sweep test reports zero clipping and a real example-rail SVG (≥15 dots each
dimension) plus a real figure drawing width (≥100 dots) at every one of 268/300/330/360/390/420/
450/480/531 dots on both `iphone` and `android`; the control-sweep test reports the figure card at
501.98px and the drawing at 373.84px (±0.5px) at 560/618/733/900 on both phone projects; the
desktop test reports the sheet at 733.44 x 990.55 and the card at 501.98 (±0.5px) at 900/1280/1600
viewport widths, unmoved. **Read the console output, not just the pass/fail** — every width is
logged (`[260910-kz2]   width=... clipped=[...] card=... drawing=... exampleRailSvg=... key=...`).

```bash
PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts
```
Expect: all green, unedited. Confirm by `git diff --name-only` (or `git status`) that none of the
three files shows as modified, and that `e2e/summary-print-size.spec.ts` still declares
733.44 x 990.55.

```bash
npm run test:e2e
```
Expect: the whole suite green, both phones and desktop.

```bash
npm run build
```
Expect: clean (must be run from the main checkout — Turbopack cannot resolve `next` from a
worktree).

Then, by eye: render the third sheet to PDF at a narrow page area and at 618 dots; confirm the
example rail drawing is present and the right shape in both, the plan/side figure is smaller-but-
not-squashed on the narrow render, and the key still sits in the blank column beside the drawing on
the wide one.

**Record every number** (not a pass mark) in
`.planning/quick/260910-kz2-stop-the-rail-instructions-sheet-clippin/260910-kz2-BROWSER-READING.md`,
following `260910-jfp-BROWSER-READING.md`'s own shape: the commands run, the measured tables, the
verdict, and anything carried forward.

## Performance

- **Duration:** unknown (mid-plan handoff — Task 3 outstanding)
- **Tasks:** 2 of 3 completed
- **Files modified:** 5 (2 source, 2 test, 1 new e2e spec)

## Accomplishments

- `RailPlanSideFigure` gained an opt-in `fit="width" | "height"` prop (default `"width"`, today's
  exact behaviour) mirroring `rail-section-plot.tsx`'s own `fit` prop — in `"height"` mode the card
  fills its box as a column, the row becomes the flexible child, and the drawing takes its height
  from the row with its width derived from the aspect ratio it already declares.
- Two new exported constants — `FIGURE_MAX_CARD_HEIGHT_PX` (composed from the prototype's own
  rendered height plus the card's own padding-and-border chrome) — give the printed sheet one home
  for the pixel cap it needs, instead of a second copy that could drift.
- `RailInstructionsSheet` now wraps its two drawings (the example rail and the plan/side figure) in
  their own flex column below a now-fixed heading, and caps the figure's box at
  `min(FIGURE_MAX_CARD_HEIGHT_PX px, 85%)` while asking for `fit="height"` — so above ~536 dots of
  page area nothing moves from today, and below it the two drawings shrink together instead of the
  example rail alone being squeezed to zero.
- Ten new source-contract vitest cases (RED in Task 1, GREEN after Task 2) pin every structural
  claim above against the real, comment-stripped source — no DOM, no React render, matching the
  repo's own established idiom.
- A new `e2e/summary-rail-instructions-fit.spec.ts` — written, not run — sweeps the narrow page
  areas, a control sweep at the widths that already ship, and a desktop-invariance check, logging
  every measured number rather than just a pass mark.

## Task Commits

1. **Task 1: prove the sheet clips today — the failing tests, written before the fix** -
   `19201c6` (test)
2. **Task 2: the two drawings share the page instead of one of them vanishing** - `1a8705c` (fix)

**Task 3 (checkpoint:human-verify, orchestrator, main checkout): not started.**

## Files Created/Modified

- `components/rails/rail-plan-side-figure.tsx` - added `fit` prop, `FIGURE_CARD_CHROME_PX`,
  exported `FIGURE_MAX_CARD_HEIGHT_PX`; height-driven mode for the card/row/drawing
- `components/summary/rail-instructions-sheet.tsx` - fixed-height heading, new drawings wrapper
  column, `FIGURE_MAX_BODY_SHARE_PERCENT`, figure box capped with `min()`, `fit="height"` passed
- `components/rails/rail-plan-side-figure.test.ts` - 5 new source-contract cases for the `fit` prop
  and its two new constants
- `components/summary/rail-instructions-sheet.test.ts` - 6 new source-contract cases (5 new + 1
  extending the existing RAILS-tab describe block) for the sheet's height division
- `e2e/summary-rail-instructions-fit.spec.ts` - new, written but not run; narrow sweep, control
  sweep, desktop-invariance test

## Decisions Made

- `FIGURE_MAX_BODY_SHARE_PERCENT` is 85, matching the plan's own measured reasoning: the cap first
  binds at ~536 dots, 24 dots clear of the 560-dot floor both protected print sweeps measure.
- Kept the inert `max-width: 100%` guard on the height-driven drawing box exactly as the plan's own
  "considered and rejected" section specifies — it never binds on any real page (the height runs
  out long before the width would), but it stays as a defensive backstop.
- Did not touch `app/design/summary/order-form.css`, `components/summary/use-print-fit.ts`,
  `components/rails/rail-instructions.tsx`, `components/rails/rail-section-plot.tsx`, or any of the
  three protected e2e specs — confirmed via `git diff` after Task 2.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2. Task 3 was never attempted, per this
quick task's own explicit routing to the orchestrator on the main checkout (not a deviation; the
plan itself designed Task 3 this way).

## Issues Encountered

`npx tsc --noEmit` reports two pre-existing errors unrelated to this change —
`app/design/layout.tsx(30,45)` and `app/layout.tsx(75,56)`, both `Cannot find name 'LayoutProps'`.
Confirmed as a worktree-only artifact: this worktree has no `.next/types` (no dev server has run
here to generate Next.js's route-typed `LayoutProps` global), while the same `tsc --noEmit` run on
the main checkout — which does have a running dev server — is completely clean, with neither file
touched by this task. Not fixed, not in scope: it is a missing generated-types directory, not a
code defect, and both files are untouched by this diff (`git diff --name-only` confirms).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Tasks 1 and 2 are committed on this worktree's branch (`worktree-agent-a173a8062750b85f2`), two
commits ahead of `595e26d` (the plan commit): `19201c6` (RED tests) and `1a8705c` (the fix). The
orchestrator needs to:

1. Run Task 3 on the main checkout (commands above) and write
   `260910-kz2-BROWSER-READING.md` with the actual measured numbers.
2. If the readings confirm the plan's own measured facts (no clipping 268-531, control sweep
   unchanged at 560-900, desktop untouched, all three protected gates still green and unedited),
   mark the quick task complete: update `STATE.md`'s Quick Tasks Completed table and Current
   Position, run `requirements mark-complete QT-260910-kz2 PRNT-05`, and make the final metadata
   commit (this SUMMARY.md, STATE.md, ROADMAP.md if touched).
3. If the readings show a real deviation from the plan's stated tolerances, stop and report rather
   than adjusting a test or re-baselining a protected gate (orchestrator ruling #3).

---
*Quick task: 260910-kz2*
*Tasks 1-2 completed: 2026-09-10*
*Task 3: pending (orchestrator, main checkout)*
