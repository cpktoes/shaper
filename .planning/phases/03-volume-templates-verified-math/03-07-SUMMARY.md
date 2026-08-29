---
phase: 03-volume-templates-verified-math
plan: 07
subsystem: process
tags: [ci, github-actions, acceptance-walkthrough, todo-archive]

requires:
  - phase: 03-volume-templates-verified-math
    provides: ".github/workflows/ci.yml (plan 02), Volume live-recalculation (plan 03), toolbar + construction-lines/wide-view (plan 05), Summary print refit (plan 06)"
provides:
  - A green GitHub Actions run proving the geometry suites, lint and build pass on GitHub, not just locally
  - Three closed-out todos archived to .planning/todos/completed/ with closing notes
  - The phase's human-approved acceptance walkthrough covering live volume, the CI gate and a printed, ruler-checked template
affects: []

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase-close plan: prove CI on GitHub with a real run URL rather than a local pass, then walk the finished feature end to end as the target user would before marking a phase done"

key-files:
  created: []
  modified:
    - .planning/todos/pending/2026-08-27-template-construction-toggle-and-wide-view.md (moved to completed/)
    - .planning/todos/pending/2026-08-22-summary-print-after-callout-system.md (moved to completed/)
    - .planning/todos/pending/2026-08-23-horizontal-board-view-option.md (moved to completed/)

key-decisions:
  - "Pushed the working branch (not main) to trigger CI, per the plan's own threat mitigation (T-03-22) — this repo deploys production from every push to main, so proving the gate on a branch keeps mid-phase state off the live site while still producing a real GitHub Actions run"
  - "The horizontal-board-view todo was archived as done-but-stale rather than deferred again: the rotate-in-place button it asked for already ships on the Template/outline screens, confirmed present in outline-editor.tsx/outline-viewer.tsx before the move"

requirements-completed: [VOL-01, TMPL-01]

coverage:
  - id: D1
    description: "CI workflow runs on GitHub against this phase's own pushed commits and concludes success, proving the geometry suites, lint and build all pass outside the local machine"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "gh run 33236030953"
        status: pass
    human_judgment: false
  - id: D2
    description: "Board volume (litres) recalculates live on the Volume screen when the outline is edited on the Template screen, with no reload, and the card discloses which method produced the number"
    requirement: VOL-01
    verification:
      - kind: manual
        ref: "03-07-PLAN.md Task 2, VOL-01 walkthrough steps 1-4"
        status: pass
    human_judgment: true
    rationale: "Live client-side recalculation across screens and the presence of a method-disclosure label can only be judged by watching the running app, not by a unit assertion. Orchestrator drove the browser: widening the widepoint 19in to 22in on the Template screen moved the Volume screen's figure from 25.78 L to 30.00 L via client-side navigation with no reload; the 'Import Template Area' / Template Area disclosure was visible on the card. Shaper approved."
  - id: D3
    description: "A shaper can export, print at true 1:1 scale, and tape together a complete full-size template from a saved board, with the correct marks, name/dims block and how-to guidance"
    requirement: TMPL-01
    verification:
      - kind: manual
        ref: "03-07-PLAN.md Task 2, TMPL-01 walkthrough steps 7-12; 03-01-PLAN.md Task 2 (ruler check)"
        status: pass
    human_judgment: true
    rationale: "Print fidelity, physical taping continuity and true-size accuracy can only be confirmed by printing and measuring, not by an automated test. The 2in scale square was ruler-verified at 100% print in plan 03-01's checkpoint. The full template then went through four post-checkpoint fix rounds today (how-to wrapping, station dims, name+full-dims block on page 1, alignment-box tiling replacing match marks with a dashed stringer edge, station lines terminating at the curve, furniture inside the box, swallow/diamond true tail closure, centre/widepoint label collision handling) before the shaper approved the final round-4 print, including the Overview Sheet export added and approved the same day. Both export entry points (Template screen and Summary screen), the Overview Sheet/Full Template picker dialog, Letter/A4 switching, toolbar buttons, wide view, and the order-form print preview were all verified in-browser and/or approved. Long-name truncation and the 'Untitled Board' fallback are covered by unit tests (991/991 passing) rather than re-walked by hand, since those are deterministic string-formatting behaviors."

duration: ~15min
completed: 2026-08-28
status: complete
---

# Phase 03 Plan 07: Phase Close — CI Proof, Todo Archive, Acceptance Walkthrough Summary

**Pushed the phase's 70 commits and watched CI go green on GitHub (run 33236030953, 54s), archived the three todos this phase resolved into `.planning/todos/completed/`, and walked the finished phase end to end with the shaper — live volume, the CI gate, and a printed, ruler-and-tape-verified full-size template — all approved.**

## Performance

- **Duration:** ~15 min (across two sessions, separated by the blocking checkpoint)
- **Completed:** 2026-08-28
- **Tasks:** 2 of 2
- **Files modified:** 3 (todo files, moved)

## Accomplishments

- Pushed this phase's working branch to `origin` (not `main`), triggering the CI workflow plan 02 wrote. `gh run watch` followed the run to completion: **conclusion `success`, run `33236030953`, wall-clock 54s** — the geometry suites, lint, and build all pass on GitHub, not just on this machine.
- Archived all three todos this phase closed, via `git mv` so history follows the file:
  - `2026-08-27-template-construction-toggle-and-wide-view.md` — closed by plan 03-05 (toolbar construction-lines toggle and wide view)
  - `2026-08-22-summary-print-after-callout-system.md` — closed by plan 03-06 (Summary print-sheet refit)
  - `2026-08-23-horizontal-board-view-option.md` — confirmed stale (the rotate-in-place button it asked for already ships in `outline-editor.tsx`/`outline-viewer.tsx`), archived as done rather than deferred again
- Ran the full phase acceptance walkthrough (Task 2, `checkpoint:human-verify`, `gate="blocking"`) with the shaper, covering all three of the phase's success criteria as lived facts rather than intentions:
  - **VOL-01 (live volume):** orchestrator drove the running dev server — widening the widepoint on the Template screen moved the Volume screen's litres figure (25.78 L → 30.00 L) via client-side navigation with no reload; the method-disclosure label ("Import Template Area") was visible on the card.
  - **CI gate:** the green run above, on the pushed head commit, reviewed via the GitHub Actions tab.
  - **TMPL-01 (the template):** the 2in scale-check square was ruler-verified at 100% print back in plan 03-01's own checkpoint; the full multi-page template was then print-reviewed through four post-checkpoint fix rounds today (how-to text wrapping, station dimensions, the name+full-dims block on page 1, alignment-box tiling replacing match marks with a dashed stringer edge, station lines terminating cleanly at the curve, furniture kept inside the printable box, swallow/diamond true tail closure, and centre/widepoint label collision handling) before the shaper approved the final round-4 print. The newly-added Overview Sheet export was print-reviewed and approved the same way. Both export entry points (Template screen, Summary screen), the Overview Sheet/Full Template picker dialog, Letter/A4 switching, the toolbar buttons, wide view, and the order-form print preview were all verified in-browser or approved. Long-name truncation and the "Untitled Board" fallback are covered by the unit suite (991/991 passing) rather than re-walked by hand.

## Task Commits

Each task was committed atomically:

1. **Task 1: Watch CI go green on GitHub, and archive the todos this phase closed** — `161a950` (docs)
2. **Task 2: Phase acceptance walkthrough** — `checkpoint:human-verify`, no code commit (verification-only task); resolved and recorded in this SUMMARY plus the phase-close commit that follows it.

## Files Created/Modified

- `.planning/todos/pending/2026-08-27-template-construction-toggle-and-wide-view.md` → `.planning/todos/completed/2026-08-27-template-construction-toggle-and-wide-view.md` (git mv, closing note added)
- `.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md` → `.planning/todos/completed/2026-08-22-summary-print-after-callout-system.md` (git mv, closing note added)
- `.planning/todos/pending/2026-08-23-horizontal-board-view-option.md` → `.planning/todos/completed/2026-08-23-horizontal-board-view-option.md` (git mv, closing note added)

## Decisions Made

- Pushed the working branch, not `main`, to prove CI without touching production — matches the plan's own threat mitigation (T-03-22): this repo deploys production from every push to `main`, so branch-only pushing keeps mid-phase state off the live site while still exercising the any-branch CI trigger.
- Archived the horizontal-board-view todo as done-but-stale rather than deferring it again, after confirming the rotate-in-place button it requested already ships on the outline/Template screens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Documented, non-blocking] Pending todo count is 10, not 9**

- **Found during:** Task 1 acceptance-criteria check
- **Issue:** The plan's acceptance criteria expect `ls .planning/todos/pending/ | wc -l` to output 9 after archiving the three closed todos (12 originally minus 3). It actually outputs 10.
- **Cause:** A new todo, `2026-08-28-blending-curves-paper-saving-template-option.md`, was captured today (2026-08-28) — after the plan was written but before this phase closed. It is unrelated phase-3 backlog, not one of the three items this plan was scoped to resolve.
- **Resolution:** No fix applied — this is expected drift in a backlog file that accumulates entries independently of any single phase's plan. The three named todos are correctly archived; the count mismatch is fully explained by one new, legitimate addition rather than a missed archive or an accidental duplicate.
- **Files affected:** None (informational only)
- **Commit:** N/A (no code change)

## Issues Encountered

None blocking. The CI run succeeded on the first push (no Node-version or placeholder-credential failures materialized — Assumption A3 and RESEARCH.md pitfalls 2/3 did not reproduce on GitHub).

## Next Phase Readiness

**Plan is complete. Phase 03 is complete.** All three of the phase's success criteria are now established as facts: the board's volume recalculates live in the browser with its method disclosed, the geometry suites pass in a real GitHub Actions run (not just locally), and a shaper has printed, cut, taped and ruler-measured a true-size template through multiple rounds of refinement to a fully approved final state. The three todos this phase existed to close are archived. No further work is scoped under this plan.

## Self-Check: PASSED

- FOUND commit: 161a950
- FOUND: .planning/todos/completed/2026-08-27-template-construction-toggle-and-wide-view.md
- FOUND: .planning/todos/completed/2026-08-22-summary-print-after-callout-system.md
- FOUND: .planning/todos/completed/2026-08-23-horizontal-board-view-option.md
- CONFIRMED: .planning/todos/pending/ contains 10 items (9 untouched backlog + 1 new item captured 2026-08-28, none of which are the three archived todos)

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
