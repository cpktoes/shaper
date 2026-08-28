---
phase: 03-volume-templates-verified-math
plan: 05
subsystem: ui
tags: [outline-editor, toolbar, lucide-react, tailwind, view-state]

requires:
  - phase: 03-volume-templates-verified-math
    provides: "components/outline/outline-editor.tsx's rotate (right-0) and Export Template (right-10) toolbar buttons from plan 03-04, whose box treatment this plan matches exactly"
provides:
  - "components/outline/outline-editor.tsx: a construction-lines toolbar button (right-20, RulerIcon) that toggles the existing showConstruction state, in agreement by construction with the sidebar checkbox in outline-controls.tsx"
  - "components/outline/outline-editor.tsx: a wide-view toolbar button (right-30, PanelLeftClose/OpenIcon) that hides the aside sidebar, turns construction lines on entering, and restores the prior construction-lines value on leaving — neither persisted nor on the design store"
affects: [03-07]

actuals:
  tokens: 2104
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A fourth local view-state pair (wideView + preWideViewConstruction) alongside showConstruction/orientation, all resolved inside click handlers rather than a useEffect, per the codebase's existing rule against setting state during render (plan 02-05's bug)"

key-files:
  created: []
  modified:
    - components/outline/outline-editor.tsx

key-decisions:
  - "Construction-lines button reuses the existing showConstruction state verbatim — no second piece of state was introduced, so the toolbar button and the sidebar checkbox in outline-controls.tsx stay in agreement by construction, not by synchronisation. outline-controls.tsx was left untouched, as the plan required."
  - "The accent fill + on-accent foreground token are applied in the same className expression (aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent) so the icon never sits on the accent fill without its paired foreground — the exact bug this codebase has been bitten by three times per the in-code warning above the rotate button."
  - "Wide view's construction-lines memory (preWideViewConstruction) is plain useState, set in the same click handler that flips wideView — never a useEffect — matching the plan's explicit instruction and the codebase's lint rule against setting state during render."
  - "The aside is hidden entirely (conditional render), not resized or collapsed — its internal scrolling-controls region and flex-none dev preset footer are untouched, per the plan's warning that a quick task already had to fix that footer once."

requirements-completed: []

coverage:
  - id: D1
    description: "A construction-lines toggle button sits in the Template screen's viewer toolbar at right-20, matching the rotate/Export Template button box exactly, toggling the same showConstruction state the sidebar checkbox uses, taking the accent fill with an on-accent icon when ON"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exit 0, only pre-existing worktree-only LayoutProps errors), npm run lint (0 errors), npm test (832/832 pass)"
        status: pass
      - kind: other
        ref: "grep verification of RulerIcon, aria-pressed, right-20, single showConstruction useState call, accent fill + on-accent token in one className expression, and git diff --name-only components/outline/ limited to outline-editor.tsx — all per the plan's acceptance_criteria"
        status: pass
    human_judgment: false
  - id: D2
    description: "A wide-view toolbar button at right-30 hides the sidebar so the board drawing gets the full window, turns construction lines on when entering and restores the prior value when leaving, is not persisted or on the design store, and is handled in click handlers rather than an effect"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exit 0), npm run lint (0 errors), npm test (832/832 pass)"
        status: pass
      - kind: other
        ref: "grep verification of PanelLeftCloseIcon/PanelLeftOpenIcon, right-30, zero useEffect occurrences, conditional aside render, and empty git diff --name-only components/design/ — all per the plan's acceptance_criteria"
        status: pass
    human_judgment: false
  - id: D3
    description: "Walking the four toolbar buttons (rotate, Export Template, construction lines, wide view) end to end in a real browser across all four themes: even spacing, the construction-lines button and sidebar checkbox agreeing in both directions, wide view collapsing the sidebar and turning construction lines on, wide view restoring the sidebar and the prior construction-lines setting, a reload returning to the default (sidebar showing, construction lines off), and legible icons on the accent fill in Daylight, Chalk, Slate and Phosphor"
    verification: []
    human_judgment: true
    rationale: "Requires a running dev server and a real browser — visual spacing/legibility, the two-way agreement between the toolbar button and the sidebar checkbox, and four-theme readability are not assertable from a unit test. The dev server cannot run inside this Turbopack-limited worktree, so this checkpoint is deferred to the orchestrator to verify against a running instance after merge, per this plan's Task 3 (gate: blocking)."
duration: ~15min
completed: 2026-08-28
status: halted
---

# Phase 3 Plan 5: Template Screen Toolbar — Construction Lines & Wide View Summary

**Two new toolbar buttons on the Template screen (`components/outline/outline-editor.tsx`): a construction-lines toggle sharing the sidebar checkbox's existing state, and a wide-view button that hides the sidebar and remembers/restores the construction-lines setting around it — both automated tasks complete and verified; the human-verify browser checkpoint (Task 3) is pending.**

## Performance

- **Duration:** ~15 min (Tasks 1–2; Task 3 checkpoint pending)
- **Completed:** 2026-08-28
- **Tasks:** 2 of 3 (Task 3 is a blocking human-verify checkpoint, not yet run)
- **Files modified:** 1

## Accomplishments

- Added a `RulerIcon` construction-lines button at `right-20` in the viewer toolbar, toggling the same `showConstruction` state `OutlineControls`' sidebar checkbox already reads and writes — no new state, no synchronisation code, agreement by construction.
- Gave that button the ON-state treatment the UI spec reserves for it alone: `aria-pressed:bg-surf-accent aria-pressed:border-surf-accent aria-pressed:text-surf-on-accent`, all in one className expression, so the icon never lands on the accent fill without its paired foreground token.
- Added a `PanelLeftClose`/`PanelLeftOpen` wide-view button at `right-30`. One button is both the way in and the way out; it lives inside the viewer panel, which stays on screen in both states.
- Added local `wideView` and `preWideViewConstruction` state. Entering wide view hides the `aside` (conditional render, its internal structure untouched), records the current `showConstruction` value, and forces it on. Leaving restores the recorded value. Both happen inside the button's `onClick`, not a `useEffect` — this codebase's lint rule rejects setting state during render, and doing so caused a real bug in plan 02-05.
- Neither new state field touches `components/design/design-store.tsx` — both are view preferences, deliberately not persisted, matching the file's own header comment that a reload always comes back to the default.

## Task Commits

Each task was committed atomically:

1. **Task 1: A construction-lines button on the drawing screen** - `f6be807` (feat)
2. **Task 2: Wide view — hide the sidebar, give the board the window** - `12fc288` (feat)
3. **Task 3: Exercise the four toolbar buttons in all four themes** - `checkpoint:human-verify`, gate `blocking` — **pending**, see below.

## Files Created/Modified

- `components/outline/outline-editor.tsx` - construction-lines toolbar button (`RulerIcon`, `right-20`) and wide-view toolbar button (`PanelLeftCloseIcon`/`PanelLeftOpenIcon`, `right-30`), plus the `wideView`/`preWideViewConstruction` local state and the conditional `aside` render

## Decisions Made

- Construction-lines button reuses `showConstruction` verbatim; `outline-controls.tsx` was left untouched as the plan required, so the toolbar button and sidebar checkbox can never drift apart.
- Accent fill and on-accent foreground token are set in the same className expression, guarding against the accent-without-its-paired-foreground bug this codebase has hit three times before (see the in-code warning above the rotate button).
- Wide-view's construction-lines memory is plain `useState`, updated only inside the click handler — no `useEffect` was introduced anywhere in this file.
- The `aside` is hidden entirely via conditional render rather than resized, keeping its scrolling-controls region and dev-only preset footer exactly as plan 02's fix left them.

## Deviations from Plan

None — both automated tasks executed exactly as written.

## Issues Encountered

None. `npx tsc --noEmit` reports only the two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` / `app/layout.tsx` (the known worktree-only phantom errors, unrelated to this plan's changes, also seen and documented in the 03-04 summary) — no other type errors. `npm run lint` is clean (0 errors, the same 9 pre-existing warnings in unrelated files). `npm test` is green at 832/832.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Tasks 1 and 2 are complete and committed.** Task 3 is a blocking human-verify checkpoint that walks all four toolbar buttons across all four themes in a running browser — this worktree cannot run `npm run dev` (Turbopack cannot resolve `next` outside the main checkout), so per this plan's checkpoint note the automated work stops here and the checkpoint is deferred to the orchestrator against a running instance after merge, the same pattern plan 03-04's Task 3 followed.

**Blocked by:** Task 3's checkpoint (gate: `blocking`) — needs a human to walk the eight verification steps in `03-05-PLAN.md` against a live dev server, across Daylight, Chalk, Slate and Phosphor themes.

## Self-Check: PASSED

- FOUND: components/outline/outline-editor.tsx (modified)
- FOUND commit: f6be807
- FOUND commit: 12fc288

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
