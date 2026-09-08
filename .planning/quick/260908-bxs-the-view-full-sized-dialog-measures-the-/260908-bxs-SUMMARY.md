---
phase: quick-260908-bxs
plan: 01
subsystem: ui
tags: [react, hooks, eslint, rails, view-full-sized-dialog]

requires:
  - phase: 08-04
    provides: "The View Full Sized dialog's live one-inch probe (D-13) and its check-bar/plot boxes"
provides:
  - "The dialog's px-per-inch reading now comes from a stable mount-time ref callback instead of an effect that set state synchronously"
  - "Two source-contract tests pinning the setter to useCallback and confirming the live probe survives"
affects: [rails, view-full-sized-dialog]

actuals:
  tokens: 1420
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Measure-on-mount via a stable (empty-deps) useCallback ref callback, in place of an effect that calls setState — avoids react-hooks/set-state-in-effect without changing when the measurement actually happens"

key-files:
  created: []
  modified:
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts

key-decisions:
  - "The ref callback is attached to the check-bar box (data-actual-size-box=\"check-bar\"), not to DialogContent itself — Base UI's Dialog.Popup type omits `ref` from its public props, so DialogContent could not take it without editing components/ui/dialog.tsx, which was out of scope. The check-bar box is inside DialogContent (so it mounts only while the dialog is open), is rendered unconditionally rather than behind a tab, and is itself one of the two elements the measurement sizes."
  - "The callback must come from useCallback with an empty dependency array, not an inline arrow. React re-attaches a ref callback whenever its identity changes; an inline arrow is a new identity on every render, which would have appended, measured, and removed the probe element continuously while the dialog sat open, rather than once per open."

requirements-completed: [QT-260908-bxs]

coverage:
  - id: D1
    description: "Opening View Full Sized still draws the rail at true physical size, and the check bar is still exactly two inches, with the px-per-inch reading now taken from a mount-time ref callback instead of an effect"
    requirement: "QT-260908-bxs"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#sets its measured px-per-inch from a ref callback, never from an effect"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#measures the screen with a live one-inch probe (D-13)"
        status: pass
      - kind: other
        ref: "npx eslint components/rails/view-full-sized-dialog.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "In a real browser, the true-size drawing and the two-inch check bar still measure correctly against a ruler, and flipping Nose/Center/Tail never re-measures"
    verification: []
    human_judgment: true
    rationale: "Requires visually/physically verifying on-screen pixel sizes against a ruler and confirming no probe element lingers in the DOM — automated source-contract tests cannot observe rendered pixel geometry or DOM mutation timing in a live browser."

duration: 12min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-bxs: View Full Sized Dialog's Inch Probe Fix Summary

**Moved the View Full Sized dialog's screen-inch measurement off a React effect and onto a stable ref callback that fires the moment the check-bar box appears — same numbers, same drawing, one fewer lint error.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-08T08:43:00Z
- **Completed:** 2026-09-08T08:55:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- The `react-hooks/set-state-in-effect` lint error at `view-full-sized-dialog.tsx:71` is gone — fixed at the source, not silenced with a disable comment.
- The dialog reads the screen's real pixels-per-inch the same way it always did (a hidden one-inch probe element, read and removed), just triggered differently: instead of an effect noticing the dialog opened and then setting state, a ref callback fires the instant the check-bar box itself appears on screen.
- Two new tests lock this in: one confirms the measurement is set from inside `useCallback`, never from an effect; the other confirms the live one-inch probe technique itself hasn't been swapped for a guessed constant.

## In plain English

Every time a shaper opens "View Full Sized" on the rails screen, the app needs to know how many pixels equal one real inch on their actual monitor — no two screens agree on this, and it's the only way the rail can be drawn at true physical size. The app was getting that number in a slightly indirect way: React noticed the dialog had opened, and *then*, in a follow-up step, went and took the measurement. That two-step approach is exactly the pattern React's own linter warns about, because it can cause an extra, unnecessary re-render.

This fix takes the same measurement in one step instead of two: the moment the little "check bar" element inside the dialog actually shows up on the page, the measurement happens right then. Nothing a shaper sees or does is different — same drawing, same check bar, same printing — the fix is purely about *how* the app notices it's time to measure, not *what* it measures or *when* in wall-clock terms it happens (still exactly once per dialog open).

## Task Commits

Each task was committed atomically:

1. **Task 1: Measure the screen's inch when the dialog's content appears, not from inside an effect** - `8ce93cc` (fix, TDD: RED tests written and confirmed failing before the source change, then GREEN in the same commit per this plan's explicit "one commit" success criterion)

## Files Created/Modified

- `components/rails/view-full-sized-dialog.tsx` - `useMeasuredPxPerInch` rewritten to take no arguments and return `[pxPerInch, measureRef]`; the effect hook is gone, replaced by a `useCallback`-wrapped ref callback with an empty dependency array and a block body (`if (node) { setPxPerInch(measurePxPerInch()); }`); the React import drops `useEffect` for `useCallback`; the check-bar box (`data-actual-size-box="check-bar"`) now carries `ref={measureRef}`; the hook's doc comment rewritten to state the real reason (freshness on reopen, not "avoid reading a closed/display:none element")
- `components/rails/view-full-sized-dialog.test.ts` - Two new source-contract cases added after the existing 8 (all unedited): one asserts the nearest hook enclosing the `setPxPerInch(measurePxPerInch())` call is `useCallback(` and that the file no longer names `useEffect(`; the other asserts the live one-inch probe (`width:1in`, `document.createElement(`) still exists

## Decisions Made

- **Ref target: the check-bar box, not `DialogContent`.** Base UI's `Dialog.Popup` (which `DialogContent` wraps) has `ref` omitted from its public prop type, so attaching the measurement ref directly to `DialogContent` would have required editing `components/ui/dialog.tsx` — explicitly out of scope (`files_modified` names only the two files touched). The check-bar box was the next-best target: it lives inside `DialogContent` (so Base UI mounts/unmounts it exactly with the dialog), it's rendered unconditionally rather than behind a tab (so a Nose/Center/Tail switch re-renders it in place rather than remounting it), and it's one of the two elements the measurement actually sizes.
- **The ref callback must be stable.** `useCallback` with an empty dependency array is load-bearing, not a style choice: React detaches and re-attaches a *changed* ref callback on every render, so an inline arrow function would have measured, appended, and removed the probe element on every single render while the dialog sat open — not the intended "once per open."
- **Block body, not the concise form.** `if (node) { setPxPerInch(...); }` rather than `node && setPxPerInch(...)` — React 19 treats any non-undefined value returned from a ref callback as a cleanup function, so the concise form (which returns the boolean result of `setPxPerInch`, i.e. `undefined`, but only by accident of `setPxPerInch` returning nothing) was avoided per the plan's explicit instruction, using an unambiguous block body instead.

## Verification Results

- `npx eslint components/rails/view-full-sized-dialog.tsx` — **before:** 1 error (`71:5 react-hooks/set-state-in-effect`), 0 warnings. **after:** 0 problems.
- `npm run lint` (whole project) — **0 errors, 10 warnings**, all pre-existing and out of scope (1 `no-img-element` in `rail-plan-side-figure.tsx`, 1 unused-var in `lib/geometry/outline.test.ts`, 8 "Unused eslint-disable directive" across the `scripts/extract-prototype-*-golden.mjs` files). None of these files were touched by this task.
- `npx vitest run components/rails` — 4 test files, **46 passed** (up from the pre-change 44; the 2 new cases account for the difference), 0 failed.
- `npm test` (full suite) — **before (baseline, clean main):** 41 files, 2224 passed, 2 skipped. **after:** 41 files (unchanged), **2226 passed** (+2, matching the 2 new cases added), 2 skipped (unchanged).
- `npx tsc --noEmit` — clean apart from the two known phantom `LayoutProps` errors in `app/design/layout.tsx` and `app/layout.tsx`, expected in a worktree and unrelated to this change.
- `npm run build` — not run, per this task's ruling (Turbopack cannot resolve `next` from a worktree).
- `git status` after the commit — clean; exactly the two files named in `files_modified` were changed, nothing added or deleted, no accidental deletions confirmed via `git diff --diff-filter=D`.

**Confirmed untouched:** `measurePxPerInch()` and its non-positive-reading fallback to 96 (lines 56–63, byte-identical); both `--vfs-w-in` / `--vfs-h-in` custom properties on the check-bar and plot boxes; `components/ui/dialog.tsx`; `app/design/rails/actual-size.css`. This matters for printing specifically: the print path (`actual-size.css`'s `@media print` rule) reads those two custom properties, which are still populated from real inch values (`checkBarWidthIn`, `plotWidthIn`, `plotHeightIn`) exactly as before — it never depended on, and still does not depend on, the measured pixel value. Printing is unaffected by this change.

## Deviations from Plan

None — plan executed exactly as written. The task's TDD instruction was followed with a single adjustment reconciled from the plan's own two statements: the generic TDD workflow calls for separate RED/GREEN commits, but this plan's `success_criteria` and `<output>` explicitly required "Two files changed, one commit." The RED tests were written and run to confirmed failure (Test A failing exactly as the plan predicted: `useEffect(` where `useCallback(` was expected; Test B passing immediately as the pre-existing-behavior regression guard) before any source change, and both the test and source changes then landed together in the single commit the plan's success criteria named.

## Human verification deferred

The plan's `<human-check>` item is deferred to the orchestrator, per this task's Rule 5:

> The orchestrator opens the rails screen after merge, clicks View Full Sized, and checks that the check bar still measures two inches against a ruler and that the plot box's on-screen pixel width equals its inch value times 96 on a standard screen at 100% zoom — then flips Nose/Center/Tail and confirms the sizes hold, and that no probe element is left behind in `document.body`.

## Issues Encountered

None. The `git commit` heredoc initially failed on the apostrophe in "shaper's" inside a single-quoted here-doc body passed through `cat <<'EOF'` — worked around by writing the commit message to a scratch file first and committing with `git commit -F`.

## Next Phase Readiness

This was a standalone lint/refactor fix with no dependency on or blocking of other in-flight work. Phase 08 remains at "all six plans complete, verifying" per STATE.md; this quick task did not touch STATE.md, ROADMAP.md, or REQUIREMENTS.md per this task's explicit rulings.

---
*Phase: quick-260908-bxs*
*Completed: 2026-09-08*
