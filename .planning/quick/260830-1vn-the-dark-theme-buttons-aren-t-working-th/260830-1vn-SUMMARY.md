---
phase: quick-260830-1vn
plan: 01
subsystem: ui
tags: [tailwind, contrast, design-tokens, viewer-toolbar]

requires:
  - phase: quick-260830-1g3
    provides: accent-fill hover/pressed treatment on the seven Template/Rocker toolbar buttons
provides:
  - Toolbar buttons keep their neutral border in every state; only the fill and icon colour change
affects: [04-rocker-foil-editors, viewer-toolbar-extraction-todo]

actuals:
  tokens: 3200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A control's edge and its fill are different jobs: the edge (`border-surf-line`) proves the 3:1 boundary contract in every theme, the fill announces state — never swap a fill token onto a stroke"

key-files:
  created: []
  modified:
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-editor.tsx
    - .planning/phases/04-rocker-foil-editors/04-PATTERNS.md
    - .planning/todos/pending/2026-08-30-extract-shared-viewer-toolbar-button.md

key-decisions:
  - "Pure subtraction: delete only the eleven border-swap Tailwind tokens (7 hover, 4 pressed), leave the accent fill and on-accent icon colour completely untouched"
  - "Deliberately did NOT brighten the dark-theme fill in this task — that question is deferred to the founder at the Task 3 checkpoint, with the follow-up (a new --surf-control-fill token, byte-identical in light themes) already scoped but not started"

patterns-established:
  - "Border tokens never carry state - `border-surf-line` stays constant across rest/hover/pressed; only bg-*/text-* pairs (with their on-accent partner) change to signal state"

requirements-completed: [QT-260830-1vn]

coverage:
  - id: D1
    description: "Seven toolbar buttons (4 on Template, 3 on Rocker) no longer swap border-surf-line for border-surf-accent on hover or while pressed"
    requirement: QT-260830-1vn
    verification:
      - kind: unit
        ref: "grep gate: className border-surf-accent count == 2 (both out-of-scope dev buttons)"
        status: pass
      - kind: unit
        ref: "grep gate: className border border-surf-line bg-surf-ground count == 7"
        status: pass
    human_judgment: false
  - id: D2
    description: "Accent fill and paired on-accent icon colour survive untouched on hover and while pressed"
    requirement: QT-260830-1vn
    verification:
      - kind: unit
        ref: "grep gate: hover:bg-surf-accent hover:text-surf-on-accent count == 9"
        status: pass
      - kind: unit
        ref: "grep gate: aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent count == 4"
        status: pass
    human_judgment: false
  - id: D3
    description: "Neutral border clears the 3:1 control-boundary target in all four themes; accent fill/icon pairing still clears 4.5:1"
    requirement: QT-260830-1vn
    verification:
      - kind: other
        ref: "hand-computed WCAG relative-luminance ratios from app/globals.css ramps (see Contrast Measurements below)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Stale prose corrected: 04-PATTERNS.md paragraph, outline-editor.tsx Rotate comment, rocker-editor.tsx Construction Lines comment"
    requirement: QT-260830-1vn
    verification:
      - kind: unit
        ref: "grep gate: 'accent border' phrase in 04-PATTERNS.md count == 0"
        status: pass
      - kind: unit
        ref: "grep gate: 260830-1vn citation present in both 04-PATTERNS.md and outline-editor.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "Founder's in-browser confirmation across a light and dark theme, and an answer on whether the dark fill needs a brightness boost"
    verification: []
    human_judgment: true
    rationale: "Requires a human to visually compare an ON button against its OFF neighbours in the actual browser across four themes, and to make a subjective call on whether the dark fill reads clearly enough — not something a grep gate or unit test can determine. Deferred as Task 3, a blocking human-verify checkpoint this executor cannot perform."

duration: 25min
completed: 2026-08-30
status: complete
---

# Phase quick-260830-1vn: Restore the toolbar buttons' neutral outline Summary

**Removed eleven Tailwind classes that swapped the seven Template/Rocker toolbar buttons' neutral grey border for an accent-coloured one on hover/pressed — a fill token had been put on a stroke, dropping the ON-state edge below the repo's own 3:1 control-boundary bar in three of four themes, worst in the dark ones.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-30T08:35:18Z
- **Tasks:** 2 of 3 (Task 3 is a blocking human-verify checkpoint, deferred — see below)
- **Files modified:** 4 (2 components, 1 tracked pattern doc, 1 pending todo)

## Accomplishments
- Deleted `hover:border-surf-accent` from all seven toolbar buttons (Export Template, Rotate on both screens, Construction Lines on both screens, Wide view on both screens) and `aria-pressed:border-surf-accent` from the four toggle buttons (Construction Lines + Wide view, both screens) — eleven tokens total, exactly as scoped.
- Left the accent fill (`hover:bg-surf-accent hover:text-surf-on-accent`, `aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent`) completely untouched — the thing this task was protecting, not changing.
- Hand-computed all twelve WCAG contrast ratios (border-vs-ground, accent-fill-vs-ground, icon-on-fill) across all four themes from the live ramp values in `app/globals.css`, confirming every number in the plan's decision table.
- Corrected the three stale prose locations that described the removed border-swap rule, so the next person editing this toolbar (or reading the pattern map) doesn't reintroduce the bug.
- Logged the second same-day hand-edit of this duplicated class string on the existing "extract a shared toolbar button" todo, as evidence (not a decision to extract now — the trigger is still a third screen).

## Task Commits

Each task was committed atomically:

1. **Task 1: Stop the buttons dropping their outline when they switch on** - `0d5ae43` (fix)
2. **Task 2: Measure it, then correct every note that still describes the old rule** - `8932e92` (docs)

**Task 3 (checkpoint:human-verify, gate="blocking"):** NOT executed. This executor cannot perform in-browser visual verification. Deferred to the founder — see "Deferred: Task 3" below.

_Note: the plan's `files_modified` also lists the pending todo file
(`.planning/todos/pending/2026-08-30-extract-shared-viewer-toolbar-button.md`), which I edited
(appended one evidence paragraph) but did NOT commit — per this run's constraints, docs/todo
artifacts are left for the orchestrator to copy out and commit._

## Files Created/Modified
- `components/outline/outline-editor.tsx` - Removed 5 border-swap tokens (1 hover-only on Export Template, 1 hover-only on Rotate, 1 hover+1 pressed on Construction Lines, 1 hover+1 pressed on Wide view — 7 tokens across 4 buttons); added a passage to the Rotate button's comment explaining the border now holds in every state and citing the measured ratios
- `components/rocker/rocker-editor.tsx` - Removed 4 border-swap tokens (1 hover-only on Rotate, 1 hover+1 pressed on Construction Lines, 1 hover+1 pressed on Wide view — 4 tokens across 3 buttons); added one sentence to the Construction Lines comment pointing at outline-editor.tsx's fuller explanation
- `.planning/phases/04-rocker-foil-editors/04-PATTERNS.md` - Replaced the paragraph that named an accent-coloured border as part of the shared toolbar-button default, with the plan's verbatim replacement text explaining the border never changes and citing the measured ratios
- `.planning/todos/pending/2026-08-30-extract-shared-viewer-toolbar-button.md` (not committed by this executor) - Appended a dated evidence line noting this class string was hand-edited in all seven places for the second time in one day

## Contrast Measurements

Computed with a throwaway WCAG relative-luminance script (scratchpad only, not committed),
reading `--ramp-<theme>-ground`, `-line`, `-accent`, `-on-accent` directly out of `app/globals.css`:

| theme | (1) border vs ground | (2) accent fill vs ground | (3) on-accent icon vs fill |
|---|---|---|---|
| daylight | **4.13** | 2.01 | **7.21** |
| chalk | **4.13** | 3.58 | **5.40** |
| slate | **3.70** | 2.16 | **7.73** |
| phosphor | **3.80** | 6.32 | **6.32** |

All twelve figures agree exactly with the plan's expected table — no mismatch to report.
Every value in column (1) clears the 3:1 control-boundary bar; every value in column (3) clears
4.5:1. Column (2) is recorded for completeness (how far the ON fill itself lifts off the page)
but carries no pass/fail bar in this task — it is the open question left for the founder at
Task 3.

## Grep Gate Results (Task 1, `className=`-scoped)

| Gate | Expected | Actual |
|---|---|---|
| `border-surf-accent` anywhere | 2 (both out-of-scope dev-only sidebar buttons) | **2** |
| `border border-surf-line bg-surf-ground` (neutral edge) | 7 | **7** |
| `hover:bg-surf-accent hover:text-surf-on-accent` | 9 (7 toolbar + 2 dev-only) | **9** |
| `aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent` | 4 | **4** |

Confirmed the two `border-surf-accent` survivors are `outline-editor.tsx:311` and
`rocker-editor.tsx:209` — the dev-only "Copy preset values" sidebar buttons, explicitly out of
scope per the plan.

## Grep Gate Results (Task 2, discriminating gates)

| Gate | Expected | Actual |
|---|---|---|
| `accent border` phrase in 04-PATTERNS.md | 0 | **0** |
| `260830-1vn` citation in 04-PATTERNS.md and outline-editor.tsx | ≥1 each | **1 each** |
| Measurement script left in repo (`git status --porcelain \| grep contrast\|\.mjs$`) | 0 | **0** |
| `npm run lint` | clean | **0 errors, 9 warnings (pre-existing, none in touched files)** |

`npm test` reran clean at 1255/1255 passing after both tasks.

## Decisions Made
- Pure subtraction only — no new token, no change to `app/globals.css`, no reformatting of the class strings beyond the eleven deletions.
- Did not brighten the dark-theme accent fill. That's explicitly deferred to the founder's answer at the Task 3 checkpoint; the follow-up token (`--surf-control-fill`, byte-identical in the two light themes) is scoped in the plan's decision section but intentionally not started here.

## Deviations from Plan

None - plan executed exactly as written for Tasks 1 and 2. All twelve contrast figures matched the plan's expected table with no discrepancy requiring a stop-and-report.

## Issues Encountered

None during implementation. One environment note: this executor's Bash tool occasionally
resolved `cd /Users/kontoes/Code/shaper && ...` against the main checkout rather than staying in
this worktree, producing misleading grep/lint output on the first pass (e.g. an inflated lint
error count from an untouched reference file, and false-zero counts for the prose gates). All
verify-gate commands were re-run using the worktree's own working directory (no `cd`) and the
figures recorded above are from those confirmed-correct runs.

## Deferred: Task 3 (blocking human-verify checkpoint)

**Not executed — requires a human in a browser.** This executor implemented Tasks 1 and 2 only.
Task 3 asks the founder to:

1. Open `http://localhost:3000/design/outline` and `http://localhost:3000/design/rocker`, and
   check Slate (dark) and Daylight (light) at minimum, Phosphor ideally.
2. Confirm an ON toggle (Construction Lines, Wide view) keeps the identical thin grey outline as
   its OFF neighbours in every theme — never softer.
3. Confirm nothing else moved: hover fill, persistent toggle fill, focus ring, and button
   position are all unchanged.
4. **Answer the open question:** with the outline restored, does the switched-ON button read
   clearly enough on the dark themes, or does the accent fill itself still look too dim? If it
   needs to be brighter, the scoped follow-up (a new `--surf-control-fill` token, byte-identical
   in the light themes) is ready to start as its own quick task.

The dev server must run from the main checkout, not this worktree (Turbopack can't resolve `next`
from a worktree per this repo's own CLAUDE.md).

## Next Phase Readiness
- Tasks 1-2 are complete and committed; the fix is live in this worktree pending merge.
- Task 3's founder sign-off (and the dark-fill brightness answer) is the only remaining item —
  once answered, either close this quick task as-is or spin the `--surf-control-fill` follow-up.

## Self-Check: PASSED

All claimed files exist on disk and both task commit hashes (`0d5ae43`, `8932e92`) are present
in git history. No missing items.

---
*Phase: quick-260830-1vn*
*Completed: 2026-08-30*
