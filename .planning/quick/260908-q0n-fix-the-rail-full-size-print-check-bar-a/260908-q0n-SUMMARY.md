---
phase: quick-260908-q0n
plan: 01
subsystem: ui
tags: [svg, print-css, react, view-full-sized-dialog]

requires: []
provides:
  - The View Full Sized dialog's 2-inch check bar prints as visible ink with nothing ticked in the shaper's print dialog
  - The printed sheet names which rail it is (Nose/Center/Tail Rail — Actual Size)
affects: [rails-screen-print, phase-08-follow-ups]

actuals:
  tokens: 2361
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A scale-critical printed element draws its ink as an SVG <rect fill> instead of a CSS background colour, since background colours are dropped from printed pages by default in Chrome/Safari unless the shaper explicitly enables 'Background graphics' — foreground SVG paint always prints."
    - "An svg with no viewBox and percentage-sized children (width=100% height=100%) lets a print stylesheet swap the svg's own CSS box (screen px -> true inch) with the drawn shape following automatically, with no second scale factor to keep in step."

key-files:
  created: []
  modified:
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts

key-decisions:
  - "Check bar rebuilt as <svg><rect fill=\"currentColor\"/></svg> rather than a div with a background-colour class — foreground SVG paint prints unconditionally, unlike a CSS background colour"
  - "No viewBox on the check-bar svg, so its printed 2-inch width still comes from CHECK_BAR_MM via the existing actual-size.css width rule with no new scale factor introduced"
  - "useMeasuredPxPerInch's ref callback widened from (node: HTMLElement | null) to (node: Element | null) to accept the svg ref — the probe logic itself is unchanged"
  - "Only the DialogHeader's data-print-hide attribute was removed; the DialogFooter (print note + Print button) keeps its own data-print-hide unchanged, and the close-button/tab-strip CSS selectors in actual-size.css are untouched"

patterns-established:
  - "Print-critical measurement marks (a ruler-checkable scale reference) are drawn as SVG rect fill, never a CSS background colour, anywhere print output must survive a shaper's default (backgrounds-off) print dialog."

requirements-completed: [QT-260908-q0n]

coverage:
  - id: D1
    description: "The 2-inch check bar draws as visible ink on the printed page, with nothing ticked in the print dialog."
    requirement: "QT-260908-q0n"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#draws the check bar as an svg rect with foreground fill ink, not a painted background"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#derives the check bar's printed width from CHECK_BAR_MM with no viewBox to insert a scale factor"
        status: pass
    human_judgment: true
    rationale: "Only a real printed PDF (headless Chrome, printBackground:false) proves the bar actually renders visible ink at exactly 144pt/2in on paper — the unit tests pin the source structure but cannot measure a rendered page. Deferred to the orchestrator's print measurement per this task's ruling."
  - id: D2
    description: "The printed sheet names which rail it is (Nose/Center/Tail Rail — Actual Size)."
    requirement: "QT-260908-q0n"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#prints the rail's name — the DialogHeader carrying the title is not print-hidden"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#composes the printed title from SECTION_TITLE[activeSection], appearing exactly once in the source"
        status: pass
    human_judgment: true
    rationale: "Only a real printed PDF proves the title text actually reaches the page and reads correctly beside the drawing — deferred to the orchestrator's print measurement."
  - id: D3
    description: "Nothing else changes: footer/close-button/tab-strip stay off the printed page, the rail cross-section still prints at true size, screen appearance is unchanged, and printing the rails screen with the dialog closed (WR-01) is unaffected."
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#still hides the footer's print note and Print button from paper"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#hides the rails screen from print only while the dialog is open (WR-01)"
        status: pass
    human_judgment: true
    rationale: "The orchestrator's print measurement visually confirms the printed page composition end-to-end (landscape, true rail scale, no chrome) and screen appearance is unchanged at 100% zoom, per this task's deferred human-check list."

duration: 5min
completed: 2026-09-08
status: complete
---

# Phase quick-260908-q0n: Fix the Rail Full-Size Print Check Bar Summary

**The View Full Sized dialog's 2-inch check bar is now drawn as SVG paint (fill, not a CSS background colour) so it prints unconditionally, and the printed sheet now carries the rail's name (Nose/Center/Tail Rail — Actual Size) since its heading is no longer hidden from print.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-09T01:55:00Z (approx)
- **Completed:** 2026-09-09T01:59:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- The check bar's ink is now SVG foreground paint (`<rect fill="currentColor">`), which prints unconditionally in Chrome/Safari regardless of the "Background graphics" / "Print backgrounds" toggle — fixing the shaper's 2026-09-08 report that the bar's caption printed but the bar itself did not.
- The printed bar's width still derives from `CHECK_BAR_MM` through the unchanged `actual-size.css` width rule, with no `viewBox` on the svg — so no new scale factor was introduced and the bar still measures exactly two inches.
- The printed page now carries the rail's name across the top (`Nose/Center/Tail Rail — Actual Size`), because the `DialogHeader` wrapping the title no longer carries `data-print-hide` — fixing the shaper's report that three printed rails were indistinguishable.
- The `DialogFooter` (print note + Print button), the default close button, and the Nose/Center/Tail tab strip all remain hidden from print, unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: the 2-inch check bar draws on paper, with nothing ticked in the print dialog** - `10486ba` (fix)
2. **Task 2: the printed sheet says which rail it is** - `3d1467e` (fix)

**Plan metadata:** not committed in this worktree — the orchestrator handles the docs commit after merge.

_Note: this plan's `<done>` pinned one exact commit subject per task; both tasks' RED (failing test) and GREEN (implementation) work landed together in that single pinned commit per task, per the orchestrator's explicit subject rulings._

## Files Created/Modified
- `components/rails/view-full-sized-dialog.tsx` - Check bar rebuilt as `<svg><rect fill="currentColor"/></svg>` instead of a background-coloured div; `useMeasuredPxPerInch`'s ref callback widened to accept an svg ref; `DialogHeader`'s `data-print-hide` removed so the rail's name reaches the printed page.
- `components/rails/view-full-sized-dialog.test.ts` - New source-contract tests pinning the svg+fill structure (no background-colour class, no viewBox, width still derived from `CHECK_BAR_MM`/`mmToInches`), the header no longer being print-hidden, the footer remaining print-hidden, and the title text appearing exactly once in the source.

## Decisions Made
- Check bar rebuilt as an `<svg><rect fill="currentColor"/></svg>` rather than adding `print-color-adjust: exact` to keep the background-colour approach (the route `app/design/summary/order-form.css` uses for page shading) — a ruler-measured scale reference must not depend on a browser/print-pipeline property that may be ignored.
- `rx="3" ry="3"` used (a fixed pixel radius) rather than a percentage radius on the rect, since a percentage radius resolves against the rect's width (2 inches printed) and would bow the bar into a lens shape instead of keeping rounded 3px ends.
- Only the `DialogHeader`'s `data-print-hide` attribute was removed — the `DialogFooter`'s own `data-print-hide`, and the two CSS selectors hiding the close button and tab strip in `actual-size.css`, were left untouched, keeping the four print-hide mechanisms independent as documented in the plan.

## Deviations from Plan

None — plan executed exactly as written. `app/design/rails/actual-size.css` was read only, never edited, confirmed by `git diff --name-only` listing exactly the two files named in `files_modified`.

## Human verification deferred to the orchestrator's print measurement

Per this task's orchestrator ruling, the following checks from the plan's `<verification>` section were NOT run in this worktree (no dev server, no `npm run build`, no headless print) and are the orchestrator's job after merge:

1. Print the dialog to PDF with headless Chrome over CDP with `printBackground: false` (the setting a real shaper has — not `true`, which is what hid this bug through Phase 8).
2. Confirm a filled rectangle 144 pt wide (2 in) is present in the PDF and measures exactly 144 pt.
3. Confirm the text `Rail — Actual Size` appears in the PDF, prefixed by the section printed from.
4. Confirm the page is still landscape, the rail cross-section still measures true against a known mark, and no close button/tab strip/print note/Print button appears.
5. Open the dialog on screen at 100% zoom and confirm the bar, caption, title, tabs and footer look exactly as before — then repeat with the dialog closed and confirm printing the rails screen directly is unchanged (WR-01).

## Issues Encountered
None. All automated gates (vitest, lint, tsc) passed on the first implementation attempt for both tasks.

**Test counts:**
- `npx vitest run components/rails` — baseline 4 files / 72 tests → now **4 files / 74 tests** after Task 1, **4 files / 77 tests** after Task 2.
- `npm test` — baseline 42 files / 2255 passed / 2 skipped → now **42 files / 2260 passed / 2 skipped**.
- `npm run lint` — clean (0 errors) both tasks; pre-existing unrelated warnings in other files untouched.
- `npx tsc --noEmit` — 0 errors (excluding the known phantom `LayoutProps` worktree artifact) both tasks.
- `git diff --name-only` after Task 2 — exactly `components/rails/view-full-sized-dialog.test.ts` and `components/rails/view-full-sized-dialog.tsx`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both fixes are committed and ready for the orchestrator's real-PDF print measurement after merge.
- No blockers. The check bar's printed width still derives from `CHECK_BAR_MM` with no new number introduced anywhere, and nothing under `lib/geometry/` was touched.

---
*Phase: quick-260908-q0n*
*Completed: 2026-09-08*

## Orchestrator print measurement (after merge, 2026-09-08)

Headless Chrome (`Page.printToPDF`, `preferCSSPageSize: true`) against the dev server on main, dialog open on the Nose rail, measured with pypdf by walking the content stream with a CTM stack:

| | before (`40a78c1`) | after (`d0874c7`) |
|---|---|---|
| check bar path, `printBackground: false` | 144.0 × 4.5 pt at x 606, filled **white** `[1, 1, 1]` — invisible on paper | 144.0 × 4.5 pt at x 606, filled **ink** `[0.122, 0.165, 0.231]` |
| check bar path, `printBackground: true` | 144.0 × 4.5 pt, filled ink (why Phase 8's probe missed it) | same as backgrounds off |
| "Rail — Actual Size" in the page text | absent | "Nose Rail — Actual Size" is the first text on the page (12 pt) |
| page | 1 page, 792 × 612 pt landscape | 1 page, 792 × 612 pt landscape |
| rail box (8.69 in) | 625.5 × 159.75 pt | 625.5 × 159.75 pt, 24 pt lower for the title line |
| on screen (headless, 1440 px) | `div` 192 × 6 px, background ink | `svg` 192 × 6 px, `text-surf-ink`, transparent background |

Both faults the shaper reported are closed on paper with nothing ticked in the print dialog. Scratch artefacts: `vfs-print.mjs`, `vfs-ops.py`, `before/`, `after/` in the session scratchpad (not in the repo).
