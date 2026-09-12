---
phase: 09-the-design-screens-on-a-phone
plan: 06
subsystem: geometry
tags: [outline-drag, rocker-drag, hit-testing, vitest, touch]

# Dependency graph
requires: []
provides:
  - "nearestOutlineDragTarget(points, touch, hitRadiusMm) — pure nearest-point pick over the outline's five drag targets"
  - "nearestSideProfileDragTarget(points, touch, hitRadiusMm) — the same pick over the rocker's four curve handles"
  - "OUTLINE_DRAG_HIT_PX (15) / OUTLINE_DRAG_HIT_COARSE_PX (22) exported constants"
  - "SIDE_PROFILE_DRAG_HIT_PX (15) / SIDE_PROFILE_DRAG_HIT_COARSE_PX (18) exported constants"
  - "components/viewer/drag-spacing.test.ts — the committed station-spacing measurement, re-derived on every npm test run"
affects: [09-07]

# Actuals (#2632)
actuals:
  tokens: 9194
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Delegated nearest-point pick: one O(n) scan over 4-5 points, squared-distance comparison, strictly-less-than tie-break so enumeration order decides ties deterministically."
    - "Committed measurement test: a phone-spacing calculation lives as a test (components/viewer/drag-spacing.test.ts) that recomputes on every run and fails if geometry or a frame constant drifts, instead of a one-off script whose numbers go stale."
    - "Source-scraping a module-private constant (outline-viewer.tsx's VIEW_W/VIEW_H/PAD_Y) via readFileSync + regex, mirroring toolbar-button.test.ts's idiom, so a test can use a real value it cannot safely import (the .tsx file's own import chain pulls in the DB client)."

key-files:
  created:
    - components/viewer/drag-spacing.test.ts
  modified:
    - lib/geometry/outline-drag.ts
    - lib/geometry/outline-drag.test.ts
    - lib/geometry/rocker-drag.ts
    - lib/geometry/rocker-drag.test.ts

key-decisions:
  - "The rocker's coarse hit radius shrinks to the UI-SPEC's 18px floor, not the 22px target: at TEMPLATE/ROCKER's shared 66dvh pinned ceiling, the rocker's closest handle pair (noseFlatHandle/noseTipHandle) lands only ~40.2px apart on a 375x667 iPhone SE — short of 22px's 44px requirement — while the outline's closest pair clears 22px comfortably on both measured phones (~58.7px and ~61.2px)."
  - "The phone pinned-area box height is 66% of the raw device viewport height (not the device height minus the top bar and tab bar): dvh is relative to the full viewport, and at both measured device sizes 66% of the raw height sits inside what those bars leave, so the raw percentage is what actually renders. Cross-checked against the UI-SPEC's own illustrative 45dvh/181px-wide rocker figure, which this same rule reproduces to within about a pixel."
  - "The pinned box width is device width minus a 16px shell p-2 inset (8px each side), per this plan's own instruction; this only binds for the outline on the iPhone 14 (the rocker is height-bound on both devices, matching D-18's own finding)."

requirements-completed: [PHON-04]

coverage:
  - id: D1
    description: "Two hit radii (desktop 15px unchanged, phone coarse radius) locked from a real, committed measurement of on-screen drag-point spacing at the tightest realistic outline board and the default rocker board, on two real phone sizes."
    requirement: "PHON-04"
    verification:
      - kind: unit
        ref: "components/viewer/drag-spacing.test.ts — all 9 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "nearestOutlineDragTarget: pure, tested nearest-point pick over the outline's five drag targets, with tie-break, no-hit, empty-list, zero-radius, desktop-invariant, and purity coverage."
    requirement: "PHON-04"
    verification:
      - kind: unit
        ref: "lib/geometry/outline-drag.test.ts — describe(\"nearestOutlineDragTarget\") (8 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "nearestSideProfileDragTarget: the same pick over the rocker's four curve handles, mirroring the outline's function and test coverage exactly."
    requirement: "PHON-04"
    verification:
      - kind: unit
        ref: "lib/geometry/rocker-drag.test.ts — describe(\"nearestSideProfileDragTarget\") (8 tests)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-09-08
status: complete
---

# Phase 9 Plan 06: Phone Drag Hit-Zone Radii and Nearest-Point Pick Summary

**Measured (not assumed) hit-zone radii for the outline and rocker drag points on a phone, plus the pure nearest-point-wins pick (D-15) that decides which point a finger has grabbed when those enlarged zones overlap.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-08T23:37:00-07:00
- **Completed:** 2026-09-08T23:44:56-07:00
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- **Measured, not guessed, the phone hit-zone radii.** `components/viewer/drag-spacing.test.ts` computes the real on-screen distance between neighbouring drag points — the outline's five points at the tightest realistic board (60in length, 25in widepoint), the rocker's four curve handles at the default board, nose-up — on a 375x667 iPhone SE and a 390x844 iPhone 14, at TEMPLATE/ROCKER's shared 66dvh pinned ceiling. The measurement is a committed test, not a throwaway script: it re-runs on every `npm test` and fails if the geometry, either viewer's frame constants, or the locked radii below ever drift into overlap.
- **Locked two different coarse radii, because the two viewers genuinely differ.** `OUTLINE_DRAG_HIT_COARSE_PX = 22` (the outline holds the UI-SPEC's full 22px target on both phones — closest pair ~58.7px on SE, ~61.2px on the 14, both well clear of the 44px minimum). `SIDE_PROFILE_DRAG_HIT_COARSE_PX = 18` (the rocker's closest handle pair is only ~40.2px apart on the SE — short of 22px's 44px floor — so it shrinks to the UI-SPEC's own 18px floor, which clears with roughly 4px of margin on both measured phones). Desktop's existing 15px radius is unchanged and re-exported as `OUTLINE_DRAG_HIT_PX`/`SIDE_PROFILE_DRAG_HIT_PX`.
- **Built the nearest-point pick (D-15) for both viewers.** `nearestOutlineDragTarget` and `nearestSideProfileDragTarget` are pure functions beside their respective solvers in `lib/geometry/`: one scan over the drag points, closest centre within the hit radius wins, ties resolved by each function's own enumeration order (the outline's widepoint, and the rocker's tailTipHandle, win any tie they're in). Both take millimetre inputs only — the caller converts a screen-pixel radius to millimetres at the current render scale before calling — so one function correctly serves both the desktop's small circles and the phone's larger ones.
- **Proved the desktop invariant (PHON-05) at both viewers**, and in the standalone spacing test: at the existing 15px radius, converted to millimetres at a native (no-phone-shrink) desktop scale, the pick returns exactly the point under the cursor for every drag target on the default board and (for the outline) the tightest realistic board too — nearest-wins reduces to today's exact behaviour at desktop scale, by construction.

## Task Commits

Each task followed RED → GREEN (TDD, per the plan's `tdd="true"` frontmatter and this wave's orchestrator ruling):

1. **Task 1: Measure phone drag-point spacing, lock the two radii**
   - `cbb2550` — test(09-06): add failing station-spacing measurement for phone drag radii (RED)
   - `cb33a27` — feat(09-06): lock the outline and rocker phone drag hit radii from measurement (GREEN)
2. **Task 2: The outline's nearest-point pick**
   - `429dd39` — test(09-06): add failing tests for the outline's nearest-point pick (RED)
   - `a06c3b9` — feat(09-06): add the outline's nearest-point drag pick (GREEN)
3. **Task 3: The rocker's nearest-point pick**
   - `7916ce9` — test(09-06): add failing tests for the rocker's nearest-point pick (RED)
   - `01f4ea8` — feat(09-06): add the rocker's nearest-point drag pick (GREEN)

_TDD gate compliance: every `test(...)` commit above was verified to fail for the expected reason (an undefined export, not an accidental pass) before its matching `feat(...)` commit was made — see "Measured Numbers" below for the RED-phase console output that proves the numbers, not just the pass/fail count._

## Files Created/Modified

- `components/viewer/drag-spacing.test.ts` — new. The committed phone station-spacing measurement for both viewers, on both device sizes, plus a desktop no-overlap check and a range check on both locked constants.
- `lib/geometry/outline-drag.ts` — added `nearestOutlineDragTarget`, `OUTLINE_DRAG_HIT_PX`, `OUTLINE_DRAG_HIT_COARSE_PX`. No existing export (`outlineDragPoints`, `solveOutlineDrag`, `OUTLINE_DRAG_LIMITS`) edited.
- `lib/geometry/outline-drag.test.ts` — added `describe("nearestOutlineDragTarget")` (8 tests: exact-centre x5 folded into one test, overlap, tie, no-hit, empty, zero-radius, desktop invariant, purity).
- `lib/geometry/rocker-drag.ts` — added `nearestSideProfileDragTarget`, `SIDE_PROFILE_DRAG_HIT_PX`, `SIDE_PROFILE_DRAG_HIT_COARSE_PX`. No existing export (`sideProfileDragPoints`, `solveSideProfileDrag`) edited.
- `lib/geometry/rocker-drag.test.ts` — added `describe("nearestSideProfileDragTarget")`, mirroring the outline's own test structure.

No viewer, no `rocker-view-frame.ts`, no `package.json` — untouched, verified by `git diff --name-only` against the wave's base commit listing only this plan's five `files_modified`.

## Measured Numbers (by name, per the plan's `<output>` requirement)

**Frames (at the render scales the real viewers use):**
- Outline, tightest board (60in length, 25in widepoint): frame 601.3 x 638.0 SVG user units, scale 9.5333 user units/inch.
- Rocker, default board (72in), nose-up (`orientation: "vertical"`), `fitToBoard: true`, `stationRails: "full"`: frame 548.4 x 902.0 user units, scale 11.3889 user units/inch, `maxDeckIn` 14in (`ROCKER_LIFT_RANGE_IN.max` 9 + `FOIL_THICKNESS_RANGE_IN.max` 5).

**Pinned boxes** (66% of raw device height; device width less the shell's 16px `p-2` inset — see "Decisions" for why raw-height, not chrome-subtracted):
- iPhone SE (375x667): box 359.0 x 440.2px.
- iPhone 14 (390x844): box 374.0 x 557.0px.

**Render scale and minimum pairwise on-screen distance, per viewer per device:**

| Viewer | Device | Fit | Render scale | Closest pair | Distance |
|---|---|---|---|---|---|
| Outline | iPhone SE | height-bound, 0.5970 | 0.2241 px/mm | tailHandle / tailRailHandle | 262.0mm = **58.7px** |
| Outline | iPhone 14 | width-bound, 0.6220 | 0.2334 px/mm | tailHandle / tailRailHandle | 262.0mm = **61.2px** |
| Rocker | iPhone SE | height-bound, 0.4880 | 0.2188 px/mm | noseFlatHandle / noseTipHandle | 183.6mm = **40.2px** |
| Rocker | iPhone 14 | height-bound, 0.6176 | 0.2769 px/mm | noseFlatHandle / noseTipHandle | 183.6mm = **50.8px** |

**Maximum non-overlapping radius each closest pair supports:** outline ≈29.3px (SE) / ≈30.6px (14); rocker ≈20.1px (SE) / ≈25.4px (14). The rocker's own binding case (SE) sits below 22 but above the 18 floor, which is why `SIDE_PROFILE_DRAG_HIT_COARSE_PX` locks to 18 rather than 22.

**The two locked radii:**
- `OUTLINE_DRAG_HIT_PX = 15` (unchanged), `OUTLINE_DRAG_HIT_COARSE_PX = 22` (full target, both devices clear it).
- `SIDE_PROFILE_DRAG_HIT_PX = 15` (unchanged), `SIDE_PROFILE_DRAG_HIT_COARSE_PX = 18` (shrunk to the UI-SPEC's floor; both devices clear it with margin — 4.2px on the binding SE case).

## Decisions Made

- **Pinned-box height rule: raw 66% of device height, not (device height − top bar − tab bar) × 66%.** UI-SPEC's own "up to 66dvh" language is a CSS `dvh` value, which is relative to the full viewport regardless of what else occupies the layout — and at both measured device sizes (667px and 844px tall), 66% of the raw height (440.2px, 557.0px) sits comfortably inside the space the compact top bar and bottom tab bar leave behind (roughly 112-146px combined at UI-SPEC's own stated heights), so the raw-percentage figure is what actually renders rather than being clipped. Cross-checked against a second, independent data point: applying this same rule at the UI-SPEC's own illustrative *45dvh* figure (`0.45 × 667 = 300.15px` on the SE) reproduces a ~182.5px-wide rocker drawing against this file's frame maths — matching the UI-SPEC's own quoted "~181px wide on a 375px iPhone SE" to within about a pixel, strong independent confirmation the rule is right.
- **Rocker's coarse radius goes to the 18px floor, not a closer-to-22 value like 20 or 21.** The plan's own text sanctions the floor for exactly this situation ("down to a floor of 18px... before leaning further on nearest-point-wins than radius alone should"). Given the pinned-box height derivation above required deriving a number not otherwise pinned to a single source-of-truth constant in the codebase (unlike, say, `BOARD_LENGTH_RANGE_IN`), the floor — with a comfortable ~4px margin on the binding SE case rather than a razor-thin one (a value like 20 would clear by well under half a pixel) — was the more honest, defensible choice than shaving the radius down to the bare minimum the measurement technically supports.
- **The tie-break test for both pick functions uses hand-built, round-number synthetic points rather than an interpolated real-geometry midpoint.** The first implementation attempt (interpolating the true midpoint between two real drag points) failed intermittently: `Math.hypot`/squared-distance arithmetic on irrational real-board coordinates is not perfectly symmetric under IEEE754 rounding, so an "exact" midpoint can differ from its two neighbours' distances by a few ULPs — testing rounding noise, not the tie rule. Round integer coordinates (station 0/100, half-width/height 0) make the tie IEEE754-exact and the test deterministic. Documented inline in both test files so a future editor does not "fix" it back to a real-geometry midpoint.
- **`sideProfileDragPoints`' tie-break order was read from the function's own construction (`targets` array), not assumed from `SideProfileDragTarget`'s type-union declaration order**, per the plan's own explicit caution — they happen to coincide (`tailTipHandle, tailFlatHandle, noseFlatHandle, noseTipHandle`), but the doc comment on `nearestSideProfileDragTarget` says so explicitly rather than leaving it implicit.

## Deviations from Plan

None — the plan's tasks, `<action>` shapes, and acceptance criteria were followed as written. The only unplanned decision was the tie-break test fixture fix described above, which is a test-construction correction (Rule 1: the original assertion was based on a false premise about floating-point equality, not a bug in the production code) rather than a scope change — the production `nearestOutlineDragTarget`/`nearestSideProfileDragTarget` implementations were correct on the first pass; only the *test's own fixture* needed the round-number rewrite.

## Human Verification Deferred to End-of-Phase UAT

Per this wave's orchestrator ruling (`workflow.human_verify_mode` is end-of-phase and this plan runs in an isolated worktree with `AUTO_CFG`-equivalent autonomous behaviour), nothing in this plan required a checkpoint — every task was `type="auto" tdd="true"` with fully automated `<verify>` commands, and the plan's own `<verification>` block explicitly states no manual desktop regression pass is needed here because nothing is wired into a viewer yet. For a human reviewer at end-of-phase UAT, the item worth a second look is the **pinned-box height derivation** documented above (raw 66% of device height): it is a reasoned, cross-checked measurement rather than a value read off an existing single-source-of-truth constant, and it is what the 09-07 wiring plan's own hit-circle radii will inherit.

## Next Phase Readiness

- `nearestOutlineDragTarget`/`nearestSideProfileDragTarget` and all four hit-radius constants are ready for 09-07 to import and wire into `outline-viewer.tsx`/`rocker-viewer.tsx` — replacing each viewer's private `DRAG_HIT_PX` with an import of `OUTLINE_DRAG_HIT_PX`/`SIDE_PROFILE_DRAG_HIT_PX`, and moving per-circle `onPointerDown` handlers to one delegated pick per RESEARCH.md's Pitfall 2.
- No blockers. The committed `drag-spacing.test.ts` will catch any future geometry or frame-constant drift that would push either radius out of the safe band before 09-07 (or any later plan) builds on top of it.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 7 commits (`cbb2550`, `cb33a27`, `429dd39`, `a06c3b9`, `7916ce9`, `01f4ea8`, plus this SUMMARY's own commit) verified present in `git log`. All 6 touched/created files (`components/viewer/drag-spacing.test.ts`, `lib/geometry/outline-drag.ts`, `lib/geometry/outline-drag.test.ts`, `lib/geometry/rocker-drag.ts`, `lib/geometry/rocker-drag.test.ts`, this SUMMARY) verified present on disk.
