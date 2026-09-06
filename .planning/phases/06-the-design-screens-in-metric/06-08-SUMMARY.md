---
phase: 06-the-design-screens-in-metric
plan: 08
subsystem: ui
tags: [units, fins, metric, formatting, vitest]

requires:
  - phase: 06-the-design-screens-in-metric
    provides: "measure-display.ts's formatDim/formatMark/formatMarkBare/columnUnitSuffix (Plan 01), and Plan 05/06's fin DATA-tab/sidebar/drawing/toe-aim conversion this plan reclassifies"
provides:
  - "Every fin PLACEMENT number (off-tail/Forward-Aft position, off-rail, toe-in, base length, toe-aim aim-distance cells) reads in whole millimetres on Metric"
  - "Board-size numbers on the Fins screen (board length, tail width, toe-aim column headings/row label) still read in centimetres"
  - "The superseding rule recorded in 06-CONTEXT.md D-01's amendment, 06-UI-SPEC.md's FINS notes and Fixed Strings, and CLAUDE.md Rule 2's Marks list"
affects: [phase-07-printable-templates, any-future-fins-screen-work]

actuals:
  tokens: 7873
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Reclassifying a measurement's unit family is a tag/formatter-call flip only — no arithmetic, slider bound, or fixture ever moves"

key-files:
  created: []
  modified:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - components/fins/fin-controls.tsx
    - components/fins/fin-viewer.tsx
    - components/fins/toe-aim-table-modal.tsx
    - CLAUDE.md
    - .planning/phases/06-the-design-screens-in-metric/06-CONTEXT.md
    - .planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md

key-decisions:
  - "Superseded D-01 for fin placement numbers only: every distance up from the tail, off-rail figure, toe-in, base length and toe-aim aim distance is now the 'mark' family (whole mm); board length and tail width stay 'dim' (cm)"
  - "The toe-aim tables split into two formatters: a cm formatter for the tail-width COLUMNS and board-length row label (board dims), and formatMarkBare for the front/rear aim-distance CELLS (marks) — the heading's unit marker flips with the cells it labels"

patterns-established:
  - "A DATA-tab row's family tag is the single source of truth carried through the Mm-boundary map; re-tagging at the construction site flips every downstream consumer without touching fin-data-panel.tsx"

requirements-completed: [SCRN-01, SCRN-03]

coverage:
  - id: D1
    description: "Fins DATA tab: every Off-Tail row (thruster, quad mckeeSB, quad basicOffRail) is tagged 'mark' alongside Off-Rail, Toe-In and Fin Base/Box Length"
    requirement: SCRN-01
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#FinSummaryRow.family and FinSummaryGroup.fullSpreadFamily"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fins sidebar's Forward/Aft position labels and the quad Rear Off-Tail Position display read in whole millimetres through formatMark; Tail Width label stays formatDim"
    requirement: SCRN-01
    verification:
      - kind: unit
        ref: "grep acceptance: only 1 formatDim( call remains in fin-controls.tsx (Tail Width)"
        status: pass
    human_judgment: true
    rationale: "Visual placement of the four labels and the override box in the running sidebar needs eyes-on confirmation; deferred to end-of-phase UAT test 14 per orchestrator ruling."
  - id: D3
    description: "Fin drawing's off-tail callout reads through formatMark alongside the toe-in/off-rail callouts; compact heading and legend unchanged"
    requirement: SCRN-03
    verification:
      - kind: unit
        ref: "grep acceptance: only 1 formatDim( call remains in fin-viewer.tsx (compact heading)"
        status: pass
    human_judgment: true
    rationale: "Drawing layout/no-movement confirmation is inherently visual; deferred to end-of-phase UAT test 15 per orchestrator ruling."
  - id: D4
    description: "Toe-aim tables' front/rear aim-distance cells read in whole millimetres under '(mm)' headings; tail-width columns, row label and modal title stay in centimetres"
    requirement: SCRN-01
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#toeAimTableFor is system-aware (D-01, D-10)"
        status: pass
    human_judgment: true
    rationale: "Confirming the highlighted column and heading wording in the live modal is visual UAT; deferred to end-of-phase UAT test 12 per orchestrator ruling."
  - id: D5
    description: "Imperial output byte-identical everywhere: formatMark and formatDim print the same string on the imperial branch"
    requirement: SCRN-01
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#re-tagging an off-tail row from dim to mark cannot move its Imperial string"
        status: pass
    human_judgment: false
  - id: D6
    description: "Planning record (06-CONTEXT.md D-01 amendment, 06-UI-SPEC.md FINS notes/Fixed Strings, CLAUDE.md Rule 2) states the superseding rule the code now follows"
    verification:
      - kind: other
        ref: "grep acceptance criteria in 06-08-PLAN.md Task 3 (all passed — see below)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-05
status: complete
---

# Phase 06 Plan 08: Fin Placement Numbers Read in Millimetres Summary

**Every fin PLACEMENT number on Metric (off-tail, off-rail, toe-in, base length, toe-aim aim distances) now reads in whole millimetres through `formatMark`/`formatMarkBare`, while board length and tail width stay in centimetres — closing UAT gaps G-06-12 and G-06-15.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-05T17:33:00-07:00 (approx.)
- **Completed:** 2026-09-05T17:45:21-07:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Re-tagged the three `Off-Tail` rows in `lib/geometry/fins.ts` from the `dim` (cm) family to `mark` (mm), joining Off-Rail, Toe-In and Fin Base/Box Length — every DATA-tab row now reads in one unit
- Flipped the four resolved off-tail labels in `fin-controls.tsx` and the drawing's off-tail callout in `fin-viewer.tsx` from `formatDim` to `formatMark`, leaving the Tail Width label and the compact heading on `formatDim`
- Split `toeAimTableFor`'s single value formatter into a cm formatter for the tail-width columns/row label and a `formatMarkBare` formatter for the front/rear aim-distance cells, and flipped the modal's heading marker to `(mm)` through `columnUnitSuffix("mark", …)`
- Added a test proving `formatMark` and `formatDim` produce an identical Imperial string, so the whole flip is provably incapable of moving an Imperial number
- Recorded the superseding decision in `06-CONTEXT.md`'s D-01 amendment, `06-UI-SPEC.md`'s Fixed Strings/Component Notes, and `CLAUDE.md` Rule 2's Marks sentence

## Task Commits

Each task was committed atomically:

1. **Task 1: Every fin placement number reads in whole millimetres** - `907bd5d` (fix)
2. **Task 2: The toe-aim tables' aim distances read in whole millimetres** - `909f72c` (fix)
3. **Task 3: The record says a fin placement number is a mark** - `1b52aa3` (docs)

_No TDD RED/GREEN split was applicable — each task edits the source and its test expectations together, verified by the same automated run before commit._

## Files Created/Modified
- `lib/geometry/fins.ts` - Three Off-Tail rows re-tagged `mark`; `toeAimTableFor` splits into a cm columns/row-label formatter and a `formatMarkBare` cell formatter; doc comments updated to cite the 2026-09-05 amendment
- `lib/geometry/fins.test.ts` - Family describe block retitled and re-pinned to `mark` for every DATA row; toe-aim metric test's front/rear expectations derive through `formatMarkBare`; new imperial-equality test added
- `components/fins/fin-controls.tsx` - Four placement labels (centre/forward/quad-rear/rear Forward-Aft position, quad Rear Off-Tail display) switched to `formatMark`; Tail Width label untouched
- `components/fins/fin-viewer.tsx` - `offTailDisplay` switched to `formatMark`; compact heading and legend untouched
- `components/fins/toe-aim-table-modal.tsx` - `unitMarker`'s metric branch now calls `columnUnitSuffix("mark", system)`
- `CLAUDE.md` - Rule 2's Marks sentence extended to name fin placement numbers
- `.planning/phases/06-the-design-screens-in-metric/06-CONTEXT.md` - D-01's table reclassified and an amendment paragraph added; the Specific Ideas example updated to `286 mm`
- `.planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md` - Fixed Strings, overflow example, unit-headed-tables populated row and two FINS Component Notes bullets updated

## Decisions Made
- Superseded D-01's cm classification for fin placement numbers only (off-tail/position, off-rail, toe-in, base length, toe-aim aim distances) — every one of these now reads in whole millimetres on Metric so a shaper never shifts a decimal point between two numbers in the same group. Board length and tail width remain centimetres because those are how a shaper quotes a board's size.
- The toe-aim tables' CELLS (aim distances) and their COLUMN headings/row label now belong to different families even though they sit in the same table — the cells are marks a shaper measures off the stringer, the columns/row label are board dims (tail width, board length).

## Deviations from Plan

None - plan executed exactly as written. Every acceptance-criteria grep and automated verify command in the plan's three tasks passed on the first attempt.

## Issues Encountered
None.

## Human Verification Deferred to End-of-Phase UAT

Per the orchestrator's ruling (`workflow.human_verify_mode: "end-of-phase"`), the `<human-check>` verification in each task was not run interactively during this execution. The shaper re-runs UAT tests 12, 14 and 15 against the amended wording:

- **Task 1 `<human-check>`:** On Metric, confirm the Fins DATA tab's off-tail/toe-in/off-rail rows all read in whole millimetres in the same group, the summary line still reads board length/tail width in centimetres, every Forward/Aft position slider label and the quad Rear Off-Tail Position display read in whole millimetres with the override box matching, and the drawing's off-tail/toe/off-rail callouts all read in millimetres with nothing moved. Confirm Imperial is unchanged. Check one dark theme as well as Daylight.
- **Task 2 `<human-check>`:** On Metric, open the McKee toe-aim tables: both section headings say `(mm)`, every aim-distance cell is a whole millimetre, the tail-width column headings/board-length row label/title stay in centimetres, and the highlighted column matches Imperial. Confirm Imperial is unchanged.
- **Task 3 `<human-check>`:** Read D-01's table and amendment note in `06-CONTEXT.md`, and CLAUDE.md Rule 2, to confirm a contributor could pick the right formatter for a fin placement number from the written record alone.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Fin placement numbers on the Fins screen are fully consistent with the whole-millimetre marks rule across the DATA tab, sidebar, drawing and toe-aim tables. No arithmetic, slider bound, stored value, or golden fixture changed — `lib/geometry/template.test.ts` and the golden-parity blocks in `lib/geometry/fins.test.ts` remain untouched and green. `lib/units-isolation.test.ts`'s conversion ledger needed no changes since `formatDim`/`formatMark` were already both allowed boundary formatters.

This plan closes UAT gaps G-06-12 and G-06-15. The shaper's end-of-phase UAT re-run of tests 12, 14 and 15 is the remaining verification step before the phase can be considered fully closed.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
