---
phase: 04-rocker-foil-editors
plan: 05
subsystem: ui
tags: [react, typescript, geometry, presets, svg, print]

# Dependency graph
requires:
  - phase: 04-rocker-foil-editors (04-02)
    provides: the ROCKER screen's sidebar/footer layout and RockerViewer's drag/orientation machinery
  - phase: 04-rocker-foil-editors (04-04)
    provides: RockerSpec/FoilSpec finalized shape and the summary rocker-box reservation
provides:
  - All four BOARD_PRESETS carry their own rocker and foil (D-12)
  - applyPreset wires a preset's rocker/foil onto the board (previously silently dropped)
  - Development-only "Copy preset values" affordance on the ROCKER screen
  - RockerViewer compact mode (hideCallouts): curve only, absolutely positioned svg, no output rail/drag targets
  - Summary order form's rocker box draws the real curve and real nose/tail lift values
affects: [summary, rocker, presets]

# Actuals (#2632)
actuals:
  tokens: 6800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Preset capture affordance mirrored per-screen (outline, rocker) rather than shared, keeping each screen's toolbar self-contained"
    - "Compact viewer mode (hideCallouts) reuses a component's own fixed-frame sizing so a print-sheet box never takes its height from the drawing"

key-files:
  created: []
  modified:
    - lib/geometry/presets.ts
    - lib/geometry/presets.test.ts
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-viewer.tsx
    - components/summary/order-form.tsx
    - components/design/design-store.tsx

key-decisions:
  - "applyPreset (components/design/design-store.tsx) did not read preset.rocker/preset.foil despite the plan's read_first assuming it already did — fixed as a Rule 2 deviation, since without it the new preset rocker/foil values would sit unused"
  - "Order form's two flanking rocker-box columns print the tip lifts (noseTip/tailTip) via formatInchesFraction, not all four rocker stations — matches the must-have's 'exactly two lift values' and the paper muse's original two-value ticks"
  - "No 'Nose'/'Tail' text label added back next to the printed lift values — RockerViewer's nose-left default orientation and column position already say which is which, and the must-have caps the box at curve + two values"
  - "RockerViewer's <svg> made absolutely positioned unconditionally (not just under hideCallouts), matching outline-viewer.tsx's own always-absolute svg — the ROCKER screen's own relative-sized parent already supported it, so this is a no-op there and a requirement for the compact order-form box"

requirements-completed: [ROCK-01, FOIL-01]

coverage:
  - id: D1
    description: "All four board presets carry their own rocker and foil values, pinned by invariant tests (bounds, nose > tail, centre-thickest taper, preset differentiation)"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "lib/geometry/presets.test.ts — BOARD_PRESETS suite (56 tests, all passing)"
        status: pass
    human_judgment: true
    rationale: "The plan's own <human-check> asks a human to open each preset in /design/rocker and confirm it reads as its own board type from the side (Fish flat/thick, Longboard nose-lifted, Shortboard most rockered) — a visual judgment automated bounds tests cannot make."
  - id: D2
    description: "Development-only 'Copy preset values' capture affordance on the ROCKER screen, gated out of production"
    verification:
      - kind: unit
        ref: "grep: components/rocker/rocker-editor.tsx contains process.env.NODE_ENV === \"development\" and buildRockerPresetSource"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Summary order form's rocker box draws the board's real curve and real nose/tail lift values, replacing the HIGH/MEDIUM/LOW placeholder"
    requirement: "FOIL-01"
    verification:
      - kind: unit
        ref: "grep: no High.*Medium.*Low in components/summary/order-form.tsx; RockerViewer and formatInchesFraction both present"
        status: pass
    human_judgment: true
    rationale: "The plan's <human-check> requires opening /design/summary, print-previewing both sheets at board-length/rocker-lift extremes, and checking all four themes — a print-layout and visual-fidelity judgment no unit test covers."

duration: ~35min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 5: Rocker/foil presets and the Summary's real rocker curve Summary

**Every board preset now carries its own side profile (rocker + foil), and the Summary order form's rocker box draws the board's real curve and lift values instead of placeholder HIGH/MEDIUM/LOW ticks.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-29T23:06:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All four `BOARD_PRESETS` (Shortboard, Fish, Mid-length, Longboard) gained their own `rocker`/`foil` values, drafted to carry each board type's recognised side-profile character and pinned by nine new invariant test cases
- Fixed a wiring gap in `applyPreset` so a preset's rocker/foil actually reach the board when a shaper starts a new design (without this, the new preset values would have been dead data)
- Added the development-only "Copy preset values" capture loop to the ROCKER screen, mirroring the Template screen's affordance, so the founder can tune rocker/foil live and paste the result back
- Gave `RockerViewer` a compact mode (`hideCallouts`): curve only, no output rail, no station lines, no drag targets, absolutely positioned so it never inflates its container's height
- Replaced the Summary order form's placeholder rocker box (fixed dashed curve + HIGH/MEDIUM/LOW ticks) with the board's real curve and its real nose/tail tip lift values

## Task Commits

Each task was committed atomically:

1. **Task 1: Every board type gets its own side profile** - `786e38b` (feat)
2. **Task 2: The Summary's rocker box gets the real curve** - `e6fe4f0` (feat)

**Plan metadata:** commit pending (docs: complete plan)

## Files Created/Modified
- `lib/geometry/presets.ts` - `BoardPreset` gains `rocker`/`foil`; four drafted value sets, one per board type
- `lib/geometry/presets.test.ts` - nine new invariant cases covering bounds, nose>tail, centre-thickest taper, cross-preset differentiation, and no fold-back/negative thickness
- `components/rocker/rocker-editor.tsx` - development-only capture affordance (`buildRockerPresetSource`, `handleCopyPreset`, sidebar footer button)
- `components/rocker/rocker-viewer.tsx` - `<svg>` unconditionally absolutely positioned (matches `outline-viewer.tsx`'s own rule)
- `components/summary/order-form.tsx` - `RockerViewer` compact mode replaces the placeholder curve; `RockerLiftTick` replaces `RockerTicks`
- `components/design/design-store.tsx` - `applyPreset` now copies `preset.rocker`/`preset.foil` onto the board (deviation, see below)

## Decisions Made
- Order form's two flanking columns print the tip lifts (`noseTip`/`tailTip`) through `formatInchesFraction`, not all four rocker stations — matches the plan's must-have of "exactly two lift values" and mirrors the paper muse's original two-sided tick layout
- No "Nose"/"Tail" text label re-added beside the printed values — `RockerViewer`'s nose-left default orientation plus the column's position already say which side is which, and the must-have caps the box's text at the drawn curve plus its two lift values
- `RockerViewer`'s `<svg>` made absolutely positioned unconditionally (not just under `hideCallouts`) to match `outline-viewer.tsx`'s always-absolute pattern; the ROCKER screen's existing `relative`-sized parent already supports this without any visible change there

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] `applyPreset` never read `preset.rocker`/`preset.foil`**
- **Found during:** Task 1 (extending `BoardPreset` with rocker/foil)
- **Issue:** The plan's `<read_first>` for Task 1 states `applyPreset` (`components/design/design-store.tsx`) "already reads `preset.rocker` and `preset.foil`" — but the actual code only ever set `outline`, `rails`, and `fins` from a preset, leaving `rocker`/`foil` at `DEFAULT_DESIGN_STATE`'s values regardless of which preset was chosen. Left unfixed, adding rocker/foil to `BoardPreset` would have been dead data: every board would still start with the same generic side profile no matter which preset the shaper picked, directly contradicting the plan's first must-have truth ("Starting a board from any of the four presets gives it a side profile with that board type's own character").
- **Fix:** Added `rocker: preset.rocker, foil: preset.foil` to the object `applyPreset` builds, alongside the existing `outline`/`rails`/`fins` fields.
- **Files modified:** `components/design/design-store.tsx`
- **Verification:** `npm test` (1135 tests) and `npm run lint` both green; the preset-differentiation invariant tests in `lib/geometry/presets.test.ts` confirm the four presets' rocker/foil objects are distinct, and this fix is what makes that distinctness actually reach the board.
- **Committed in:** `786e38b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical functionality)
**Impact on plan:** Essential — without this fix, Task 1's entire deliverable (differentiated per-board-type side profiles) would have been unreachable from the UI despite passing its own unit tests. No scope creep: the fix is a three-line addition to an object literal already being built by the touched function.

## Issues Encountered
- The plan's Task 1 `<behavior>` spec asked for a "fold-back" check on `sampleRocker`/`sampleFoil` output, described as monotone. The rocker line is by construction a V-shape (D-05: it dips to zero lift at the board's centre station, rising to both tips), not a monotone curve across the whole board, so a literal "non-decreasing across all samples" test would have failed by design rather than by bug. Wrote the check instead as: every sample stays finite, every foil thickness stays strictly positive, and every rocker sample stays within a small tolerance of the drafted envelope (0 to max(noseTip, tailTip)) — the actual "no fold-back or negative thickness" property the behavior spec was after, expressed correctly for a V-shaped curve.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four board presets are structurally complete (outline + rocker + foil + rails + fins) and load correctly through `applyPreset`
- The Summary order form's rocker box is wired to live design state; no further plan in this phase touches it
- Two `<human-check>` items from the plan's own `<verify>` blocks remain for a human to confirm visually (not auto-approvable): (1) each of the four presets reads as its own board type from the side in `/design/rocker`; (2) the order form prints correctly (two pages, nothing clipped) at board-length/rocker-lift extremes, across all four themes and a dark-theme print preview. Both are pure visual/print-fidelity judgments outside what unit tests can cover.
- The founder's own review-and-tune pass on the newly drafted rocker/foil values (via the new capture button) is expected as a follow-up, mirroring how the outline presets were tuned in Phase 1 (D-03/D-12) — the header comment in `lib/geometry/presets.ts` documents this status explicitly.

## Self-Check: PASSED

- FOUND: `.planning/phases/04-rocker-foil-editors/04-05-SUMMARY.md`
- FOUND: commit `786e38b` (Task 1)
- FOUND: commit `e6fe4f0` (Task 2)
- FOUND: commit `567efcf` (SUMMARY.md)

---
*Phase: 04-rocker-foil-editors*
*Completed: 2026-08-29*
