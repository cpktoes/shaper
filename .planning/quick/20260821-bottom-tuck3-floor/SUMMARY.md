---
phase: quick-260821-bt3
plan: 01
subsystem: geometry
tags: [rail-bands, vitest, sliders, geometry-guard]

requires:
  - phase: quick-260818-lm0
    provides: lib/geometry/rail-bands.ts (computeSectionInches, RailSectionResult), components/rails/rail-controls.tsx, golden fixture harness in lib/geometry/rail-bands.test.ts
provides:
  - computeSectionInches floors a user-supplied bottomTuck3Override at bottomTuck1, so it can never invert the bottom marks (derived, non-override branches and the hardEdge=0 branch are untouched)
  - Bottom Tuck 3 slider in rail-controls.tsx uses per-section dynamic min/max (bottomTuck1 floor, max(1.5", current value)) instead of the static TUCK_BOUNDS, so a symmetrical section's true derived value (e.g. 4") is representable and draggable rather than pinned at a meaningless max
  - Test coverage: floored-below cases (symmetrical and non-symmetrical), pass-through-above-floor cases, hardEdge-still-zero-with-override, and a structural golden-wide invariant (bottomTuck3 >= bottomTuck1, or exactly 0 under hardEdge) across every fixture
affects: [any future rail-bands.ts change touching computeSectionInches's bottom-tuck branch, and any future rail-controls.tsx change touching Bottom Tuck 3 or its slider bounds]

actuals:
  tokens: 1700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Guard-vs-workbook-formula comments: GSD-added correctness guards inside a faithful-port file are marked inline as distinct from the transcribed spreadsheet-cell comments (C23/C24/C25), so future readers can tell which lines came from the source workbook and which are added safety"
    - "Per-section dynamic slider bounds (min/max computed from the section's own derived output) rather than a shared module-level constant, when a control's legal range depends on other live state (symmetrical, family, scale, thickness)"

key-files:
  created: []
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - components/rails/rail-controls.tsx

key-decisions:
  - "Floor applied only in the override branch of computeSectionInches's bottomTuck3 expression, never to the derived (non-override) branches -- those already satisfy bottomTuck3 > bottomTuck1 by construction (2x for non-symmetrical, +1.5*scale for symmetrical), so flooring them would be a no-op at best and fixture-breaking at worst"
  - "hardEdge is checked first and short-circuits to exactly 0 regardless of any override present -- hard edge means no tuck, so it is never floored"
  - "Enforced in the geometry layer (rail-bands.ts), not only the UI slider bounds -- a UI-only guard would leave a stale override (set before Sym was toggled on) permanently shadowing the symmetrical derivation, which was the core of the reported bug"
  - "Bottom Tuck 3 slider's max uses Math.max(TUCK_BOUNDS.max, bottomTuck3In) rather than a new hardcoded ceiling, so the static 1.5\" behavior is preserved for non-symmetrical sections and only extends upward when the derived/override value actually exceeds it"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "computeSectionInches floors a bottomTuck3Override at bottomTuck1 for both symmetrical and non-symmetrical sections, passes through overrides above the floor unchanged, and still yields exactly 0 under hardEdge even with an override present"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts#Bottom Tuck 3 override floor -- 5 new tests (floors symmetrical, floors non-symmetrical, passes through symmetrical above floor, passes through non-symmetrical above floor, hardEdge still 0 with override)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Structural invariant across every existing golden fixture: bottomTuck3 >= bottomTuck1 for every section, or exactly 0 when hardEdge, catching future regressions"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts#Bottom Tuck 3 override floor -- \"holds bottomTuck3 >= bottomTuck1 ... for every section across every golden fixture\""
        status: pass
    human_judgment: false
  - id: D3
    description: "All 145 tests pass with golden rail fixtures byte-identical (no fixture drift) -- confirms the floor is a pure guard on user-reachable invalid states and does not alter any legitimate derived output"
    verification:
      - kind: unit
        ref: "npm run test -- 597 tests pass repo-wide, including the unchanged golden parity suite in lib/geometry/rail-bands.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Bottom Tuck 3 slider in rail-controls.tsx uses dynamic min=bottomTuck1, max=max(1.5, current value), same bounds fed into the clampFinite onValueChange call; Corner Cut Offset and TUCK_BOUNDS itself untouched"
    verification:
      - kind: other
        ref: "npx tsc --noEmit -p . (clean) and npx eslint components/rails/rail-controls.tsx (0 problems) confirm the wiring compiles and lints; npm run build succeeds"
        status: pass
    human_judgment: true
    rationale: "The slider's visual/interactive behavior (thumb no longer pinned at a meaningless max, range genuinely spans ~2.5\"-4\" once Sym is checked on a section) is a UI feel/legibility judgment call best confirmed by a human dragging the control in the browser, matching the precedent set by quick task 260821-dmg's own slider-bounds coverage entries. No dev server was reachable in this execution environment (port 3000 was not listening despite the orchestrator note) to capture a live screenshot."

duration: 18min
completed: 2026-08-21
status: complete
---

# Quick Task: Stop Bottom Tuck 3 Inverting the Rail Geometry Summary

**Floored the Bottom Tuck 3 override at Bottom Tuck 1 in `computeSectionInches` (geometry layer, not just UI) and replaced the slider's static 0-1.5" bounds with per-section dynamic min/max so a symmetrical section's true 4" derived value is representable and draggable instead of pinned and silently invertible**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-21T14:50:00Z
- **Completed:** 2026-08-21T15:08:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `lib/geometry/rail-bands.ts`: `computeSectionInches`'s bottomTuck3 expression now floors a user-supplied `bottomTuck3OverrideIn` at `bottomTuck1` via `Math.max`, applied only to the override branch -- the `hardEdge` branch still yields exactly `0`, and the derived (no-override) branches for both symmetrical and non-symmetrical modes pass through byte-identical, since they already satisfy `bottomTuck3 > bottomTuck1` by construction. A GSD-added-guard comment distinguishes the new line from the surrounding C23/C24/C25 workbook transcription comments.
- `components/rails/rail-controls.tsx`: the Bottom Tuck 3 `Slider` and its `clampFinite` call in `onValueChange` now use a per-section `bottomTuck3Bounds` object (`min: mmToInches(output.result.bottomTuck1)`, `max: Math.max(TUCK_BOUNDS.max, bottomTuck3In)`, `step: TUCK_BOUNDS.step`) instead of the static `TUCK_BOUNDS`. In symmetrical mode the range now spans roughly 2.5"-4", so the thumb sits at its true position instead of pinning at a max that misrepresented the actual value. Corner Cut Offset and `TUCK_BOUNDS` itself are untouched.
- `lib/geometry/rail-bands.test.ts`: added a `describe("Bottom Tuck 3 override floor")` block with 6 new tests covering: symmetrical override below the floor (reproducing the exact reported repro: Sym on, slider touched to 1.5" below the true 2.5" Bottom Tuck 1), non-symmetrical override below the floor, overrides above the floor passing through unchanged in both modes, `hardEdge` still yielding exactly `0` with an override present in both modes, and a golden-wide structural invariant asserting `bottomTuck3 >= bottomTuck1` (or exactly `0` under `hardEdge`) across every existing fixture case.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce the floor in the geometry** - `2aa34ef` (fix)
2. **Task 2: Dynamic slider bounds in the UI** - `fcfc275` (fix)
3. **Task 3: Tests** - `8fff110` (test)

## Files Created/Modified
- `lib/geometry/rail-bands.ts` - `computeSectionInches`'s `bottomTuck3` override branch now floors at `bottomTuck1` via `Math.max`, with a GSD-added-guard comment distinguishing it from the ported C23/C24/C25 workbook comments
- `lib/geometry/rail-bands.test.ts` - New `describe("Bottom Tuck 3 override floor")` block: 6 tests (symmetrical/non-symmetrical floor, symmetrical/non-symmetrical pass-through, hardEdge-still-zero, golden-wide invariant)
- `components/rails/rail-controls.tsx` - Bottom Tuck 3 slider and its `clampFinite` call now use a per-section `bottomTuck3Bounds` (dynamic min/max) instead of the static `TUCK_BOUNDS`

## Decisions Made
- Floor applied only to the override branch, never the derived branches -- the pre-verified safety facts in the source todo confirm both derived relationships (`2x` non-symmetrical, `+1.5*scale` symmetrical) already hold, so flooring them would risk fixture drift for zero benefit
- `hardEdge` short-circuits before the floor logic is reached at all, preserving the exact-`0` contract unconditionally
- Enforced in `rail-bands.ts` (geometry), not only in `rail-controls.tsx` (UI) -- the todo's own reasoning is explicit that a UI-only guard leaves a stale override permanently shadowing the symmetrical derivation, which was the actual unrecoverable part of the bug
- Slider max uses `Math.max(TUCK_BOUNDS.max, bottomTuck3In)` rather than a new hardcoded ceiling, preserving the existing 1.5" behavior for sections where it's already sufficient and only extending upward when needed

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their described scope; no architectural changes, no additional bugs surfaced, no scope creep.

## Issues Encountered

No dev server was reachable on port 3000 in this execution environment (the environment note claimed one was orchestrator-managed, but `lsof -i :3000` showed nothing listening), so the slider's live drag behavior could not be curled or screenshotted. Correctness was instead verified through `npm run test` (597 tests pass, golden fixtures byte-identical), `npm run lint` (0 errors, pre-existing unrelated warnings only), `npx tsc --noEmit -p .` (clean), and `npm run build` (succeeds). The visual/interactive slider behavior is flagged as `human_judgment: true` in the coverage block (D4) for a follow-up browser pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The Bottom Tuck 3 bug (both the pinned-thumb misrepresentation and the permanent-shadow inversion) is fixed at the geometry layer and covered by unit tests. Recommend a quick browser pass on the Center Rail: check Sym, open Advanced, confirm the Bottom Tuck 3 slider now shows a ~2.5"-4" range with the thumb at 4" (not pinned at a stale 1.5"), and confirm dragging it can no longer produce a value below Bottom Tuck 1. No blockers for Phase 2 work.

---
*Phase: quick-260821-bt3*
*Completed: 2026-08-21*

## Self-Check: PASSED
