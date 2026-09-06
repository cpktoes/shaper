---
phase: 06-the-design-screens-in-metric
plan: 09
subsystem: ui
tags: [tailwind, react, measure-field, uat-gap-closure]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "MeasureField, the shared typed measurement box built in plan 06-02 and reused by the ROCKER datasheet in plan 06-03"
provides:
  - "MeasureField's standalone (non-bare) render mode uses a 96px box (w-24 min-w-24 max-w-24) instead of the retired ImperialField's 64px box, so a Metric Board Length value never clips"
  - "MeasureField's bare (in-table) render mode is unchanged, byte-identical, so the ROCKER datasheet's layout does not move"
  - "06-UI-SPEC.md's metric-typed-field overflow row and standalone render-mode bullet now cite measured pixel widths instead of a character count"
affects: [uat, design-screens]

actuals:
  tokens: 2413
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["Render-mode-conditional class strings written as two complete literal strings (not an interpolated width fragment) so Tailwind's source scanner generates every class"]

key-files:
  created: []
  modified:
    - components/design/measure-field.tsx
    - components/design/measure-field.test.ts
    - .planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md

key-decisions:
  - "Kept the fix scoped to MeasureField's own className logic — no call site (outline-controls.tsx, volume-controls.tsx, fin-controls.tsx, rocker-datasheet.tsx) needed a change, since `bare` already correctly distinguishes the two render modes at every site."
  - "Wrote both class strings out in full as separate literals rather than interpolating a width fragment into a shared string, per the plan's instruction, so Tailwind's source scanner sees every class it must generate."

patterns-established:
  - "When a shared component needs a mode-dependent style, write the two complete class strings out in full rather than composing a shared base with an interpolated piece — Tailwind's static analysis only sees literal strings."

requirements-completed: [SCRN-01, SCRN-02]

coverage:
  - id: D1
    description: "The standalone Board Length box (Template Builder, Volume screen, Fins screen) widens to 96px on Metric so the whole typed value is visible at every length in range"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "components/design/measure-field.test.ts#renders exactly one Input and at most one error div, with a box width that follows the render mode"
        status: pass
    human_judgment: true
    rationale: "Whether text visually fits inside a rendered box is a rendering fact vitest's node environment cannot observe (no DOM/browser). The debug session measured this in a real Chrome/Inter render before the fix; a human re-run of UAT test 4 against the shipped code is the final visual proof, per this project's end-of-phase UAT policy."
  - id: D2
    description: "The ROCKER datasheet's ten typed cells keep their existing 64px box, byte-identical, so the table's layout and imperial cells do not move"
    requirement: "SCRN-02"
    verification:
      - kind: unit
        ref: "components/design/measure-field.test.ts#renders exactly one Input and at most one error div, with a box width that follows the render mode"
        status: pass
      - kind: other
        ref: "grep -c 'h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink' components/design/measure-field.tsx — returns 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "06-UI-SPEC.md records the measured pixel widths behind the fix instead of the character-count reasoning that caused gap G-06-4"
    requirement: "SCRN-01"
    verification:
      - kind: other
        ref: "grep -c 'w-24 min-w-24 max-w-24' .planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md — returns 2; grep -c 'G-06-4' — returns 2"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-06
status: complete
---

# Phase 6 Plan 09: The typed board length box shows its whole value Summary

**Widened the shared MeasureField's standalone box from 64px to 96px (w-24) on Metric so `188.0 cm`–`365.8 cm` no longer clip, while the ROCKER datasheet's bare in-table cells stay byte-identical at 64px.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-06T00:40:00Z
- **Completed:** 2026-09-06T00:52:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `MeasureField`'s standalone render mode (the three Board Length sites: Template Builder/outline, Volume screen, Fins screen) now renders a 96px box (`w-24 min-w-24 max-w-24`), giving 82px of text room against the longest Metric length string (`365.8 cm`, ≈63px) — closing UAT gap G-06-4
- `MeasureField`'s bare render mode (the ROCKER datasheet's ten typed Thickness/Rocker cells) is completely unchanged, byte-identical to the classes it had before this plan, so the datasheet's `min-w-[540px]` floor and every imperial fraction cell render exactly as they did
- No call site touched: `outline-controls.tsx`, `volume-controls.tsx`, `fin-controls.tsx` and `rocker-datasheet.tsx` are all unedited — the fix lives entirely inside `MeasureField`'s own choice of `className`, keyed off the `bare` prop that already distinguished the two render modes
- The class comment above the `<Input>` now states the measured pixel facts (63px longest string vs. 50px content room in a 64px box) instead of the character-count comparison that originally caused the gap, and names the debug session as its source
- `06-UI-SPEC.md`'s `metric-typed-field · overflow` row and the standalone render-mode bullet now record the same measured widths and cite `G-06-4`, so a future reader has a number instead of a character count to reason from

## Task Commits

1. **Task 1: The box's width follows its render mode** - `e76c237` (fix)
2. **Task 2: The record states the width that was measured** - `e2c5999` (docs)

_Note: this plan's Task 1 carries `tdd="true"` in its frontmatter, but its own `<action>` specifies a direct edit-then-verify flow (no `<behavior>`/`<implementation>` split calling for a separate RED commit) — the class-string test and the component edit were verified together in one commit, matching the plan's acceptance criteria exactly._

## Files Created/Modified
- `components/design/measure-field.tsx` - Chose the `<Input>`'s `className` from the existing `bare` prop instead of hard-coding one string; wrote the bare and standalone class strings out in full as separate literals; replaced the character-count comment with the measured-pixel rationale
- `components/design/measure-field.test.ts` - Retitled the class-string test and asserted both the bare (`w-16`) and standalone (`w-24`) class strings are present, each with a comment naming which render mode it belongs to
- `.planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md` - Rewrote the `metric-typed-field · overflow` row and the standalone render-mode bullet under "The metric typed field (D-08, D-12)" to state measured pixel widths and cite G-06-4 and the debug session; the bare bullet was left as-is since it already only claimed unchanged `w-16` classes

## Decisions Made
- No call site needed editing — `bare` was already correctly threaded from every consumer, so widening the box only required changing which class string `MeasureField` itself picks.
- Kept both class strings as complete literals per the plan's instruction, rather than interpolating a width fragment into one shared string, so Tailwind's source scanner reliably generates both `w-16`/`min-w-16`/`max-w-16` and `w-24`/`min-w-24`/`max-w-24`.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria (grep checks, `npx vitest run components/design/measure-field.test.ts`, `npm test`, `npx tsc --noEmit`) all passed without needing any auto-fix.

## Issues Encountered

`npx tsc --noEmit` reports two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` and `app/layout.tsx`. These are environmental (a known phantom error in this worktree, per this plan's orchestrator rulings) and unrelated to any file this plan touched — left as-is, out of scope.

## Human verification deferred to end-of-phase UAT

Per this project's `workflow.human_verify_mode: "end-of-phase"` setting, Task 1's `<human-check>` was not run interactively during execution:

> On Metric, open the Template Builder, the Volume screen and the Fins screen: the box above each Board Length slider shows its whole value with nothing cut off. Drag each slider to both ends and confirm the longest value still fits (365.8 cm on the Fins screen). Type 188 and press Enter — the thumb moves and the row re-labels as before; type `5 1/2` and the last good number comes back with its error line, which now lines up with the box. On the ROCKER datasheet every typed cell is the same size it was, in both systems, and the table has not shifted. On Imperial the three Board Length rows still show their two dropdowns, unchanged.

Task 2's `<human-check>` (reading the rewritten spec rows) is likewise deferred:

> Read the overflow row and the standalone bullet in 06-UI-SPEC.md: both describe the box the app now renders, in measured pixels, and a reader can tell why the in-table cell is a different width from the standalone box.

The shaper re-runs UAT test 4 against the wording above to close gap G-06-4.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`MeasureField` now carries the corrected, measured contract for both its render modes, and the UI-SPEC no longer repeats the character-count reasoning that produced gap G-06-4. Once the shaper re-runs UAT test 4 and confirms the box, gap G-06-4 can be marked closed. No blockers for merging this plan's changes.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-06*
