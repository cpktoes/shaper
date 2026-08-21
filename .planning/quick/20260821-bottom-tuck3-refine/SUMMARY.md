---
phase: quick-260821-bt3b
plan: 01
subsystem: geometry
tags: [rail-bands, vitest, sliders, geometry-guard]

requires:
  - phase: quick-260821-bt3
    provides: computeSectionInches's bottomTuck3 override floor at bottomTuck1, per-section dynamic slider bounds in rail-controls.tsx, golden-wide invariant coverage in rail-bands.test.ts
provides:
  - MIN_BOTTOM_TUCK_SEPARATION_IN exported constant (1/16in), documented as a GSD product decision distinct from the ported workbook formulas, replacing the inclusive Math.max(override, bottomTuck1) floor with a strict Math.max(override, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN)
  - bottomTuck3Derived field threaded through RailSectionResultInches/RailSectionResult/resultToInches/computeRailSection -- the value bottomTuck3 would take with no override, including the hardEdge rule
  - Bottom Tuck 3 slider in rail-controls.tsx now sources both bounds from lib/ output (bottomTuck1 + the imported constant for min, the derived value for max) instead of the post-override effective value, so the range can never collapse around a stale override
  - Test coverage: updated floor tests asserting the new strictly-greater clamp value, tightened golden-wide invariant (bottomTuck3 > bottomTuck1, strict), and new bottomTuck3Derived coverage in both modes and under hardEdge
affects: [any future rail-bands.ts change touching computeSectionInches's bottom-tuck branch, and any future rail-controls.tsx change touching Bottom Tuck 3 or its slider bounds]

actuals:
  tokens: 2200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Named product-decision constants over epsilons: MIN_BOTTOM_TUCK_SEPARATION_IN is exported from the geometry module and imported by the UI rather than duplicated as a raw 1/16 literal, so the display/slider granularity and the correctness floor can never drift apart"
    - "Un-overridden derived value exposed as its own result field (bottomTuck3Derived) rather than recomputed in the component, keeping symmetrical/hardEdge branching logic entirely in lib/ per this project's geometry-in-lib constraint"

key-files:
  created: []
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - components/rails/rail-controls.tsx

key-decisions:
  - "Floor changed from inclusive (Math.max(override, bottomTuck1)) to strict (Math.max(override, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN)) using a named exported constant rather than a floating-point epsilon -- the minimum meaningful gap is a product decision tied to the app's 1/16\" fractional-inch granularity, and an arbitrary epsilon would be unexplainable to a future reader"
  - "bottomTuck3Derived computed and exposed from computeSectionInches/computeRailSection (geometry layer) rather than as `symmetrical ? deckMark3 : railTuck1` inline in rail-controls.tsx -- this project requires geometry math to live in lib/, and duplicating the hardEdge/symmetrical branch in the component would risk drift from the canonical bottomTuck3 branch"
  - "Slider min imports MIN_BOTTOM_TUCK_SEPARATION_IN directly rather than hardcoding 1/16 in the component, so the UI's reachable range and the geometry-layer floor share one source of truth"
  - "Derived branches (non-override bottomTuck3, and bottomTuck3Derived itself) remain unfloored -- they already satisfy bottomTuck3 > bottomTuck1 by construction (2x non-symmetrical, +1.5*scale symmetrical), so the floor only ever binds on user overrides, matching the prior task's established pattern"
  - "bottomTuck3Derived NOT added to the test file's NUMERIC_RESULT_FIELDS allowlist, per the plan's explicit instruction -- golden fixtures have no expectation for it and adding it would risk unrelated fixture-authoring drift"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "computeSectionInches floors a user-supplied bottomTuck3Override at bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN (strictly greater, not merely non-inverting), for both symmetrical and non-symmetrical sections; passes overrides above the floor through unchanged; hardEdge still yields exactly 0 regardless of any override"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts#Bottom Tuck 3 override floor -- floors a symmetrical override..., floors a non-symmetrical override..., passes a symmetrical/non-symmetrical override above the floor through unchanged, still yields exactly 0 for hardEdge..."
        status: pass
    human_judgment: false
  - id: D2
    description: "Golden-wide invariant tightened to strictly greater (bottomTuck3 > bottomTuck1, or exactly 0 under hardEdge) across every section of every one of the 11 golden fixtures, with no fixture drift"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts#Bottom Tuck 3 override floor -- \"holds bottomTuck3 > bottomTuck1 strictly (or exactly 0 under hardEdge) for every section across every golden fixture\""
        status: pass
    human_judgment: false
  - id: D3
    description: "bottomTuck3Derived exposed as a new result field equal to the un-overridden bottomTuck3 value (including the hardEdge rule), unaffected by whether an override is present, in both symmetrical and non-symmetrical modes"
    verification:
      - kind: unit
        ref: "lib/geometry/rail-bands.test.ts#Bottom Tuck 3 override floor -- \"bottomTuck3Derived equals the un-overridden value in both modes...\" and \"still yields exactly 0 for hardEdge even with an override present, including bottomTuck3Derived\""
        status: pass
    human_judgment: false
  - id: D4
    description: "Bottom Tuck 3 slider in rail-controls.tsx uses min = bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN (imported constant, not hardcoded) and max = Math.max(TUCK_BOUNDS.max, bottomTuck3DerivedIn); the same bounds feed the clampFinite onValueChange call; Corner Cut Offset and TUCK_BOUNDS itself untouched"
    verification:
      - kind: other
        ref: "npx tsc --noEmit -p . (clean), npm run lint (0 errors, pre-existing unrelated warnings only), npm run build (succeeds)"
        status: pass
    human_judgment: true
    rationale: "The slider's live drag behavior (range genuinely spanning ~2.5625\"-4\" in symmetrical mode, thumb reachable at both ends, no visual pinning) is a UI feel/legibility judgment call best confirmed by a human dragging the control in the browser. The dev server responded 200 on /design/rails during this execution, confirming the page renders, but interactive slider-drag verification is left to a browser pass, matching the precedent set by the immediately preceding quick task's own D4."
  - id: D5
    description: "All 598 repo-wide tests pass (146 in rail-bands.test.ts), npm run lint reports 0 errors, npm run build succeeds -- golden rail fixtures remain byte-identical (no fixture drift from the stricter floor)"
    verification:
      - kind: unit
        ref: "npm run test -- 598 tests pass repo-wide; npm run lint -- 0 errors; npm run build -- succeeds"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-21
status: complete
---

# Quick Task: Strict Bottom Tuck Separation, and Let the Slider Climb Back to the Derived Value

**Tightened the Bottom Tuck 3 override floor from inclusive to strict via a named exported `MIN_BOTTOM_TUCK_SEPARATION_IN` constant, and exposed a new `bottomTuck3Derived` geometry field so the slider's max always reaches the un-overridden natural value instead of collapsing around a stale override**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-21T22:05:00Z
- **Completed:** 2026-08-21T22:25:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `lib/geometry/rail-bands.ts`: exported `MIN_BOTTOM_TUCK_SEPARATION_IN = 1/16` with a comment explicitly marking it a GSD product decision (not a source-workbook formula), visually distinct from the surrounding `C##:` transcription comments. The override floor changed from `Math.max(override, bottomTuck1)` (inclusive, could land exactly on Bottom Tuck 1 producing a zero-length segment) to `Math.max(override, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN)` (strictly greater).
- `lib/geometry/rail-bands.ts`: added a new `bottomTuck3Derived` field to both the inches-level and Mm-branded result types -- the value `bottomTuck3` would take with no override, including the `hardEdge ? 0` rule -- threaded through `computeSectionInches`, `resultToInches`, and `computeRailSection` exactly like the existing `bottomTuck3` field.
- `components/rails/rail-controls.tsx`: the Bottom Tuck 3 slider's `min`/`max`/`clampFinite` bounds now derive entirely from lib/ output: `min = bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN` (importing the constant rather than hardcoding `1/16`), `max = Math.max(TUCK_BOUNDS.max, bottomTuck3DerivedIn)` (the un-overridden derived value, not the post-override effective value). In symmetrical mode the range now spans roughly 2.5625"-4", so a stale override can no longer collapse the range and the natural 4" is always reachable.
- `lib/geometry/rail-bands.test.ts`: updated the two floor tests to assert the new strictly-greater clamp value, tightened the golden-wide invariant from `>=` to strict `>`, and added new coverage for `bottomTuck3Derived` in both symmetrical/non-symmetrical modes (unaffected by override presence) and under `hardEdge` (yields exactly `0`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Strict Bottom Tuck separation via MIN_BOTTOM_TUCK_SEPARATION_IN** - `d4d9432` (fix)
2. **Task 2: Expose bottomTuck3Derived; wire slider bounds from lib/ output** - `ad80c9e` (feat)
3. **Task 3: Update floor tests, tighten invariant, cover bottomTuck3Derived** - `e717db5` (test)

## Files Created/Modified
- `lib/geometry/rail-bands.ts` - New exported `MIN_BOTTOM_TUCK_SEPARATION_IN` constant; override floor is now strictly greater than Bottom Tuck 1; new `bottomTuck3Derived` result field threaded through the inches core and the Mm boundary
- `lib/geometry/rail-bands.test.ts` - Floor tests updated to the new strict clamp value; golden-wide invariant tightened to strict `>`; new `bottomTuck3Derived` coverage (both modes, hardEdge)
- `components/rails/rail-controls.tsx` - Bottom Tuck 3 slider `min`/`max`/clamp now source from `bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN` and `bottomTuck3Derived` instead of the post-override effective value and a hardcoded literal

## Decisions Made
- Named exported constant (`MIN_BOTTOM_TUCK_SEPARATION_IN`) chosen over a floating-point epsilon -- the minimum meaningful gap is a product decision tied to the app's 1/16" fractional-inch granularity, not a floating-point artifact, and needs to be explainable and shared between the geometry layer and the UI
- `bottomTuck3Derived` computed in `computeSectionInches` (geometry layer), not `symmetrical ? deckMark3 : railTuck1` inline in the component -- this project requires geometry math to live in `lib/`, and inlining it in the component would risk drifting from the canonical `bottomTuck3` derivation
- Derived (non-override) branches remain unfloored -- they already satisfy `bottomTuck3 > bottomTuck1` by construction, so flooring them would be a no-op at best
- `bottomTuck3Derived` deliberately NOT added to `NUMERIC_RESULT_FIELDS` in the test file's golden-parity allowlist, per the plan's explicit instruction -- golden fixtures carry no expectation for it

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their described scope; no architectural changes, no additional bugs surfaced, no scope creep.

**Note on commit granularity:** the plan's Tasks 1 and 2 both touch `lib/geometry/rail-bands.ts` in adjacent code (the floor expression and the new derived field sit a few lines apart). To keep each task's commit atomic and reviewable per the plan's own task boundaries, the geometry-layer edits were made and staged in two passes rather than one combined edit, so `d4d9432` contains only the strict-floor change and `ad80c9e` contains only the `bottomTuck3Derived` addition and its UI wiring. This is a mechanical sequencing choice, not a scope change.

## Issues Encountered

None. The dev server (orchestrator-managed on port 3000) was reachable this session -- confirmed `GET /design/rails` returns 200 with the expected page title. Full interactive slider-drag verification (dragging Bottom Tuck 3 in symmetrical mode to confirm the ~2.5625"-4" range and that the thumb is never pinned or invertible) is left to a human browser pass, consistent with the same judgment call made in the immediately preceding quick task (260821-bt3).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The Bottom Tuck 3 override floor is now strict (never coincident with Bottom Tuck 1) and the slider can always climb back to its natural derived value regardless of a stale override, closing both residual issues raised after browser verification of quick task 260821-bt3. Recommend a quick browser pass on the Center Rail: check Sym, open Advanced, drag Bottom Tuck 3 to its minimum (should sit just above 2.5" -- 2 9/16") and to its maximum (should reach a full 4", not pin below it). No blockers for Phase 2 work.

---
*Phase: quick-260821-bt3b*
*Completed: 2026-08-21*

## Self-Check: PASSED
