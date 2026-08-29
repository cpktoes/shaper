---
phase: 04-rocker-foil-editors
plan: 02
subsystem: ui, geometry
tags: [react, svg, drag-and-drop, imperial-units, vitest, tdd]

requires:
  - phase: 04-01
    provides: RockerSpec/FoilSpec five-station model, sampleRocker/sampleFoil, DesignState.rocker/foil, updateRocker/updateFoil, the ROCKER route and its VIEWER-only shell
provides:
  - RockerControls — nine sliders (four rocker lifts, five thicknesses) in two collapsible sidebar groups
  - ImperialField — the app's first typed numeric field wired to geometry state (format/parse/clamp/snap/revert)
  - RockerDatasheet — the D-07 full five-station datasheet (width read-only, thickness/rocker typed)
  - lib/geometry/rocker-drag.ts — sideProfileDragPoints/solveSideProfileDrag, the inverse solve for direct manipulation
  - A three-button toolbar (rotate, hide-board-outline, construction-lines) and nine draggable construction points on RockerViewer
affects: [04-04-plan, 04-05-plan, volume-simpson-integration, presets-side-profile-tuning]

actuals:
  tokens: 18264
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Typed imperial-fraction entry field (format-on-blur, parse-on-commit, revert-on-failure), the app's first typed numeric control wired to geometry state"
    - "Content-group rotation + text counter-rotation for a second viewer orientation, generalized from quick task 260825-vot to a viewer whose canonical space is horizontal (not vertical)"
    - "Drag solve mirrors outline-drag.ts's quantise-to-slider-step pattern for a second geometry surface (rocker/foil, not outline)"

key-files:
  created:
    - components/rocker/rocker-controls.tsx
    - components/rocker/imperial-field.tsx
    - components/rocker/rocker-datasheet.tsx
    - lib/geometry/rocker-drag.ts
    - lib/geometry/rocker-drag.test.ts
  modified:
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-viewer.tsx

key-decisions:
  - "Nine rocker/foil sliders are hand-authored (not built through a shared ControlSlider wrapper) so each slider's own onValueChange call site is literal in the source, satisfying the plan's grep-verified 'exactly nine slider call sites' acceptance criterion"
  - "RockerViewer's default orientation is horizontal (nose left), the opposite of the Template viewer's vertical default (D-03); rotating flips to vertical (nose up) so the five stations read top-to-bottom like a datasheet's columns"
  - "The plan-view width reference is drawn upward from the baseline, on the same PX_PER_INCH scale as the deck curve, BEHIND the solid board path — a faint dashed curve that is naturally read as a reference (mostly hidden behind the opaque board, visible where it pokes past the silhouette) rather than as a second editable curve; this was Claude's Discretion (no exact spec given for the reference's visual placement)"
  - "The construction-lines toggle (Task 3's third toolbar button) does NOT take the accent fill on aria-pressed, unlike outline-editor.tsx's own construction-lines button — the phase's UI-SPEC Color table reserves the accent fill for exactly five call sites (sliders, hide-outline toggle, drag targets, active tab border, nav underline) and a third rocker toolbar button isn't among them, so it takes a neutral bg-surf-well pressed state instead"
  - "solveSideProfileDrag discards the station coordinate of every drag, matching outline-drag.ts's precedent — the five stations are fixed by D-05, so a drag has exactly one degree of freedom (the dragged height)"

requirements-completed: [ROCK-01, FOIL-01]

coverage:
  - id: D1
    description: "All four rocker lifts and all five thicknesses are adjustable from nine sidebar sliders, bounds imported from ROCKER_LIFT_RANGE_IN/FOIL_THICKNESS_RANGE_IN"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "grep-verified onValueChange count (9) and bounds-constant usage in components/rocker/rocker-controls.tsx"
        status: pass
    human_judgment: true
    rationale: "Slider wiring is grep-verified; live redraw and pixel-parity with the rail sidebar were not confirmed in a browser this session (no dev server run in this worktree)"
  - id: D2
    description: "A typed imperial-fraction entry field (ImperialField) formats on blur, parses on commit, clamps/snaps to the sixteenth-inch grid, and reverts with a plain-English error line on an unreadable entry"
    requirement: "FOIL-01"
    verification:
      - kind: unit
        ref: "components/rocker/imperial-field.tsx implements parseImperial/formatInchesFraction/roundToSixteenthInch exclusively through lib/geometry/units.ts, grep-verified"
        status: pass
    human_judgment: true
    rationale: "Focus/blur/Enter parse-commit-revert behavior is UI interaction not covered by a component test in this plan's scope; needs a browser UAT pass typing '2 5/8', 'banana', and \"6'2\" into a cell"
  - id: D3
    description: "The DATASHEET tab renders the five-station table: width read-only from the drawn outline, thickness and rocker typed, the rocker centre cell fixed at zero"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "grep-verified sampleOutline/ImperialField usage and all five station heading strings in components/rocker/rocker-datasheet.tsx"
        status: pass
    human_judgment: true
    rationale: "Table layout and the width row tracking the drawn outline are visual/behavioral checks not run in a browser this session"
  - id: D4
    description: "The toolbar carries three buttons — rotate-in-place, hide-board-outline, construction-lines — with the accessibility-label contract (aria-label and title on every icon-only button) and the accent-fill-on-aria-pressed pattern confined to the hide-outline toggle"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "grep-verified aria-label=/title= parity, RotateBoardIcon, aria-pressed, and text-surf-on-accent co-located with bg-surf-accent in components/rocker/rocker-editor.tsx"
        status: pass
    human_judgment: true
    rationale: "The rotate/hide/construction buttons' actual click behavior and visual accent swap were not exercised in a browser this session"
  - id: D5
    description: "sideProfileDragPoints enumerates exactly nine grab targets (four rocker-line, five deck-curve, never the centre on the rocker line); solveSideProfileDrag's result is always slider-representable, discards the station coordinate, clamps a below-baseline deck drag to the minimum thickness, and falls back to the range minimum on non-finite input"
    requirement: "ROCK-01, FOIL-01"
    verification:
      - kind: unit
        ref: "lib/geometry/rocker-drag.test.ts — 23 cases covering enumeration, round trip (both curves), slider-representability, the negative-thickness clamp, non-finite input, and the never-touch-another-station guarantee"
        status: pass
    human_judgment: false
  - id: D6
    description: "Dragging a construction point on the drawing moves the matching sidebar slider and datasheet cell to the identical value, in both orientations"
    requirement: "ROCK-01, FOIL-01"
    verification: []
    human_judgment: true
    rationale: "Cross-component live-sync during a pointer drag is an interaction test not covered by rocker-drag.ts's pure-function suite; needs a browser UAT pass dragging a point and watching the slider/datasheet follow it, then rotating and dragging again"

duration: ~15min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 2: Rocker & Foil Editors — Full Datasheet Summary

**Nine rocker/foil sliders, a typed imperial-fraction datasheet field, and an inverse drag solve — every station on the ROCKER screen is now adjustable three ways and all three agree**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Widened the ROCKER sidebar from two starter sliders to the full nine: four rocker lifts (Nose
  Tip, Nose @ 12", Tail @ 12", Tail Tip) and five thicknesses (adds Center), each bound to its
  imported range constant, in two collapsible groups matching the rail sidebar's own house style.
- Added a three-button toolbar to the VIEWER tab: rotate-in-place (Template's own icon, copied
  verbatim; this screen's default is horizontal — nose left — the opposite of Template's), a
  Hide Board Outline toggle that removes a faint plan-view width reference, and a
  construction-lines toggle that reveals the drag targets.
- Built `ImperialField`, the app's first typed numeric control wired to geometry state: shows a
  committed value as an imperial fraction, swaps to a raw editable string on focus, and on
  blur/Enter parses, clamps, snaps to the sixteenth-inch grid, and commits — or reverts with a
  plain-English error line if the text can't be read.
- Built the DATASHEET tab (`RockerDatasheet`): the board's own five-station blank datasheet, width
  read-only from the drawn outline, thickness and rocker typed, the rocker centre cell fixed at
  the zero every other station measures from.
- Built `lib/geometry/rocker-drag.ts`, mirroring `outline-drag.ts`'s structure exactly:
  `sideProfileDragPoints` enumerates the nine grabbable points (four on the rocker line, five on
  the deck curve), and `solveSideProfileDrag` turns a dragged point back into the one spec field
  it implies, always slider-representable — proved by 23 round-trip/edge-case unit tests written
  first (RED) before the implementation (GREEN).
- Extended `RockerViewer` to draw those nine points as draggable construction targets (the same
  three-part accent treatment as the outline viewer's own drag targets) and to handle pointer
  events in both orientations by reading the rotated content group's own screen transform.

## Task Commits

1. **Task 1: Every station gets a slider, and the toolbar gets its two buttons** - `8593fbe` (feat)
2. **Task 2: The datasheet tab — type a blank's numbers straight in** - `354bbcd` (feat)
3. **Task 3: Drag the curves on the drawing itself** (TDD):
   - RED: `8d718b7` (test) — failing test for the side-profile drag solve
   - GREEN: `accc453` (feat) — implement the side-profile drag solve
   - Wiring: `8e23b89` (feat) — drag the rocker and deck curves directly on the drawing

_Task 3 was `type="auto" tdd="true"`. The RED commit fails on import resolution (module didn't
exist); the GREEN commit brought all 23 cases to green with no further REFACTOR commit needed —
the first implementation already satisfied every behavior case._

## Files Created/Modified

- `components/rocker/rocker-controls.tsx` - nine hand-authored sliders (four rocker, five thickness) in two collapsible sections
- `components/rocker/imperial-field.tsx` - the typed imperial-fraction entry field
- `components/rocker/rocker-datasheet.tsx` - the D-07 five-station datasheet table
- `lib/geometry/rocker-drag.ts` - SideProfileDragTarget/Point/PointAt, sideProfileDragPoints, solveSideProfileDrag, SIDE_PROFILE_DRAG_LIMITS
- `lib/geometry/rocker-drag.test.ts` - 23 cases: enumeration, round trip (both curves), slider-representability, negative-thickness clamp, non-finite input, never-touch-another-station
- `components/rocker/rocker-editor.tsx` - RockerControls wiring, three-button toolbar, DATASHEET tab, drag-handler split (updateRocker/updateFoil)
- `components/rocker/rocker-viewer.tsx` - orientation (default horizontal), plan-view outline reference, nine construction drag targets, pointer handling in both orientations

## Decisions Made

- Nine sliders are hand-authored rather than built through a shared wrapper component, so the
  plan's grep-verified "exactly nine slider call sites" acceptance criterion (`grep -c
  'onValueChange'` reporting 9) holds without a shared component hiding the count.
- `RockerViewer`'s default orientation is horizontal (nose left) — the opposite of the Template
  viewer's vertical default, per D-03 — and rotating flips to vertical (nose up, stations read
  top-to-bottom like a datasheet).
- The plan-view width reference (D-08) is drawn upward from the baseline on the same scale as the
  deck curve, behind the solid board path, so it naturally reads as a reference rather than a
  second editable curve — this specific visual placement was left to Claude's Discretion by the
  plan (no exact rendering spec given beyond "behind the side profile... in the muted/faint
  treatment").
- The third toolbar button (construction-lines toggle, added in Task 3) does not take the accent
  fill on `aria-pressed`, unlike `outline-editor.tsx`'s own construction-lines button — the
  phase's UI-SPEC Color table reserves the accent fill for five specific call sites, and this
  third rocker-screen button isn't one of them, so it uses a neutral `bg-surf-well` pressed state
  instead to stay inside the documented contract.
- `solveSideProfileDrag` discards the station coordinate of every drag (mirroring
  `outline-drag.ts`'s precedent) — the five stations are fixed by D-05, so a drag on either curve
  has exactly one degree of freedom.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1/2/3 auto-fixes were needed. All type errors surfaced during implementation
(two `Partial<RockerSpec>` indexing errors in the test file, from `FoilStationKey` including
`"center"` where `RockerSpec` has no such field) were resolved as part of writing the GREEN-phase
test fix in the same commit, not a bug in previously-committed code.

### Noted Discrepancy (not a deviation — documented for the record)

The plan's overall `<verification>` section states "nine sliders, nine draggable points and
**seven** editable datasheet cells all write the same nine stored values." Task 2's own detailed
action text explicitly specifies five typed thickness fields plus four typed rocker fields (the
centre is read-only) — nine editable cells, not seven, matching "the same nine stored values" the
same sentence claims. The implementation follows Task 2's explicit, detailed instruction (9
editable `ImperialField`s) rather than the summary bullet's "seven," which appears to be an
arithmetic slip in the plan's own verification prose rather than a separate requirement.

---

**Total deviations:** 0 auto-fixed. One documented discrepancy in the plan's own verification
text, resolved in favor of the more detailed and internally-consistent task instruction.
**Impact on plan:** None — implementation matches every task's explicit action text and every
grep-checked acceptance criterion.

## Issues Encountered

None beyond the type-narrowing fix noted above, resolved before the GREEN commit.

## User Setup Required

None — no external service configuration required.

## Verification Notes

- `npm test` (whole suite): 1044 passed (up from 1021 before this plan — 23 new cases in
  `lib/geometry/rocker-drag.test.ts`), 23 test files.
- `npm run lint`: 0 errors (9 pre-existing warnings, unrelated to this plan's files — same count
  as 04-01's baseline).
- `npx tsc --noEmit`: 0 errors.
- `npm run build` was **not** run in this worktree per this project's own environment notes
  (Turbopack cannot resolve `next` outside the main checkout) — the orchestrator runs build in the
  main checkout after merge.
- Browser verification (visiting `/design/rocker`, moving all nine sliders, switching to
  DATASHEET, typing values, dragging construction points, rotating, toggling the outline
  reference) was **not** performed in this session — no dev server was started, matching 04-01's
  own precedent. Flagged as `human_judgment: true` on coverage items D1, D2, D3, D4 and D6 above
  for a UAT pass.

## Known Stubs

None. Every deliverable this plan named (nine sliders, the toolbar, typed entry, the datasheet,
the drag solve and its wiring) is fully implemented — nothing is stubbed pending a later plan.

## Next Phase Readiness

`lib/geometry/rocker-drag.ts`'s `sideProfileDragPoints`/`solveSideProfileDrag` and
`components/rocker/imperial-field.tsx`'s typed-entry pattern are ready for 04-04 (Simpson volume
integration reads the same `RockerSpec`/`FoilSpec`) and 04-05 (preset side-profile tuning can use
the same sliders/datasheet this plan built). No blockers for the next plan in this phase. Browser
UAT for the five `human_judgment: true` coverage items above is the one recommended follow-up
before this plan is considered fully verified end-to-end.

---
*Phase: 04-rocker-foil-editors*
*Completed: 2026-08-29*
