---
phase: quick-260821-prf
plan: 01
subsystem: ui
tags: [react-context, design-store, presets, tailwind]

requires:
  - phase: quick-260818-kvp
    provides: components/outline/outline-editor.tsx (Copy preset values affordance pattern), lib/geometry/units.ts
  - phase: quick-260818-lm0
    provides: lib/geometry/rail-bands.ts (RailBandSpec, DEFAULT_RAIL_BAND_SPEC)
  - phase: quick-260818-mr2
    provides: lib/geometry/fins.ts (FinPlacementSpec, DEFAULT_FIN_PLACEMENT_SPEC)
  - phase: quick-260818-nyw
    provides: components/design/design-store.tsx (shared DesignProvider)
provides:
  - applyPreset resets the full board (outline, rails, fins, volume, finsImportTemplate, boardName) rather than only outline
  - boardStarted: true set by every design-mutating store action (rails, fins, volume, name, import toggles), not just outline edits
  - BoardPreset carries rails/fins seeded from DEFAULT_RAIL_BAND_SPEC/DEFAULT_FIN_PLACEMENT_SPEC for all four presets
  - Dev-only "Copy preset values" capture affordance on the Rails and Fins screens, mirroring the outline screen's
affects: [Phase 2 saved-design serialization will read the same DesignState shape this task corrected]

actuals:
  tokens: 6200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Preset capture affordance pattern (dev-only Button, buildPresetSource(), navigator.clipboard) now replicated per-screen (outline/rails/fins) rather than shared, each emitting its own BoardPreset field block in pasteable presets.ts source"
    - "Capture affordances always serialize the raw stored spec (design-store's own field), never a derived/effective value, so outline-import overrides never leak into captured preset data"

key-files:
  created: []
  modified:
    - components/design/design-store.tsx
    - lib/geometry/presets.ts
    - lib/geometry/presets.test.ts
    - components/rails/rail-band-editor.tsx
    - components/fins/fin-placement-editor.tsx

key-decisions:
  - "applyPreset rebuilds state as { ...DEFAULT_DESIGN_STATE, outline, rails, fins, boardStarted: true } rather than patching individual fields, so any future DesignState field added later resets safely by default instead of silently carrying over"
  - "Volume-import toggle actions (toggleImportTemplateDimensions, toggleImportRailThickness) also set boardStarted: true even though the plan's WR-02 list didn't name them explicitly -- they mutate volume exactly like updateVolume does, and leaving them out would reopen the same bug class WR-02 fixed for a different pair of actions (Rule 2 - missing critical functionality, applied for consistency)"
  - "Fin capture affordance reads the raw fins field (not effectiveFins) so a preset captured while finsImportTemplate is on doesn't accidentally bake in the outline's overridden boardLength/tailWidth12/tailShape"
  - "All four presets seed rails/fins from the plain DEFAULT_RAIL_BAND_SPEC/DEFAULT_FIN_PLACEMENT_SPEC constants, per user decision (2026-08-21) -- no per-board-type values invented; real tuning happens via the new capture affordances in a follow-up session"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "applyPreset produces a genuinely fresh board: volume, finsImportTemplate, and boardName reset to defaults; outline (and now rails/fins) come from the preset; boardStarted stays true"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit -p . (clean) plus npm run test (591 tests pass) confirming DesignState/BoardPreset shapes stay consistent"
        status: pass
    human_judgment: true
    rationale: "No unit test exists (or is required by CLAUDE.md's lib/-only test constraint) for components/design/design-store.tsx, a React context/UI-state module rather than geometry math. Correctness was verified by code review of the setState logic and confirmed by type-check/build passing; the plan's own manual verification step (discard-and-start-new with edited rails/fins/volume/name) needs a human click-through in the browser to confirm the observable behavior end-to-end."
  - id: D2
    description: "Every design-mutating store action (updateRailSection, toggleTailHardEdge, updateFins, updateVolume, setFinsImportTemplate, setBoardName, plus the two volume-import toggles) sets boardStarted: true"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit -p . (clean)"
        status: pass
    human_judgment: true
    rationale: "Same as D1 -- this is store-level state logic with no dedicated test file per project convention (geometry-only test mandate). Verified by code inspection of every setState call site in design-store.tsx; the plan's manual verification step (edit only a rail control, confirm the replace-board confirm dialog fires) needs a human click-through."
  - id: D3
    description: "BoardPreset carries rails: RailBandSpec and fins: FinPlacementSpec, seeded from DEFAULT_RAIL_BAND_SPEC/DEFAULT_FIN_PLACEMENT_SPEC for all four presets; presets.ts header records the seeded-but-untuned D-03 status; presets.test.ts extended"
    verification:
      - kind: unit
        ref: "lib/geometry/presets.test.ts -- \"$id: carries a complete, structurally valid rails spec\" and \"$id: carries a complete, structurally valid fins spec\" (8 new assertions across 4 presets), part of the 591-test npm run test pass"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dev-only 'Copy preset values' capture affordances added to rail-band-editor.tsx and fin-placement-editor.tsx, matching the outline screen's behavior/styling, absent from production build"
    verification:
      - kind: other
        ref: "curl http://localhost:3000/design/rails and /design/fins -- 'Copy preset values' text present in dev-mode HTML"
        status: pass
      - kind: other
        ref: "npm run build; grep -rl 'Copy preset values' .next/server .next/static -- no matches (production build clean)"
        status: pass
    human_judgment: true
    rationale: "Legibility/hover-state 'feel' of the dark-sidebar button styling on the Rails and Fins screens is a visual judgment call, same as quick task 260821-dmg's own D1. No headless browser/screenshot tool was available in this execution environment; verified instead by curl (button renders) and a post-build grep (absent from production)."

duration: 12min
completed: 2026-08-21
status: complete
---

# Quick Task: Extend Presets to Rail Bands and Fin Setups Summary

**BoardPreset now carries a complete rails+fins spec (seeded from the existing defaults), applyPreset resets the whole board instead of only the outline, every design-mutating store action tracks boardStarted, and Rails/Fins screens gained their own dev-only preset-capture affordance for the shaper's follow-up tuning session**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-21T17:23:00Z
- **Completed:** 2026-08-21T17:31:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Fixed WR-01: `applyPreset` in `components/design/design-store.tsx` now rebuilds state from `DEFAULT_DESIGN_STATE` plus the preset's `outline`/`rails`/`fins`, so "Discard & Start New" produces a genuinely fresh board -- `volume`, `finsImportTemplate`, and `boardName` no longer carry over from the discarded board
- Fixed WR-02: `updateRailSection`, `toggleTailHardEdge`, `updateFins`, `updateVolume`, `setFinsImportTemplate`, `setBoardName`, and (for consistency) the two volume-import toggle actions all now set `boardStarted: true`, so editing only rails/fins/volume correctly counts as "board in progress" for the replace-board confirm dialog
- Extended `BoardPreset` (`lib/geometry/presets.ts`) with `rails: RailBandSpec` and `fins: FinPlacementSpec`; all four presets seed from `DEFAULT_RAIL_BAND_SPEC`/`DEFAULT_FIN_PLACEMENT_SPEC` verbatim, with the file header's D-03 tuning-status note updated to record rails/fins as seeded-but-untuned pending a shaper capture session
- Extended `lib/geometry/presets.test.ts` with structural-validity coverage for the new `rails`/`fins` fields on every preset (8 new assertions)
- Added a dev-only "Copy preset values" button to `components/rails/rail-band-editor.tsx` and `components/fins/fin-placement-editor.tsx`, each serializing its live spec (fins uses the raw `fins` field, not `effectiveFins`) into pasteable `presets.ts` source via `inchesToMm()`, styled identically to the corrected outline button (quick task 260821-dmg) and confirmed absent from a production build

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix WR-01 and WR-02 in the design store** - `dd3cfe3` (fix)
2. **Task 2: Extend BoardPreset to carry rails and fins** - `0922065` (feat)
3. **Task 3: Add dev-only capture affordances to the Rails and Fins screens** - `329872f` (feat)

## Files Created/Modified
- `components/design/design-store.tsx` - `applyPreset` rebuilds from `DEFAULT_DESIGN_STATE` + preset fields; every mutating action (including the volume-import toggles) sets `boardStarted: true`; doc comments updated
- `lib/geometry/presets.ts` - `BoardPreset` interface gains `rails`/`fins`; all four presets seed from the existing defaults; header comment records D-03 seeded-but-untuned status
- `lib/geometry/presets.test.ts` - New structural-validity tests for `rails`/`fins` on every preset
- `components/rails/rail-band-editor.tsx` - Dev-only "Copy preset values" button + `buildPresetSource`/`buildSectionSource` helpers
- `components/fins/fin-placement-editor.tsx` - Dev-only "Copy preset values" button + `buildPresetSource`/`buildAdvancedSource` helpers, reading the raw `fins` field

## Decisions Made
- `applyPreset` spreads `DEFAULT_DESIGN_STATE` as its base rather than patching individual fields, so any future `DesignState` field added later resets safely by default
- Volume-import toggle actions also set `boardStarted: true` for consistency with WR-02's intent, even though not explicitly named in the plan's fix list (Rule 2 -- missing critical functionality, applied to avoid reopening the same bug class for a different pair of actions)
- Fin capture affordance serializes the raw `fins` field, not `effectiveFins`, so a captured preset never bakes in the outline's overridden `boardLength`/`tailWidth12`/`tailShape`
- All four presets seed `rails`/`fins` from the plain default constants per the user's 2026-08-21 decision -- no per-board-type values invented; real tuning happens through the new capture affordances in a follow-up session

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Volume-import toggle actions also set boardStarted: true**
- **Found during:** Task 1
- **Issue:** `toggleImportTemplateDimensions` and `toggleImportRailThickness` mutate `state.volume` directly (not through `updateVolume`) and weren't in the plan's explicit WR-02 fix list, but they exhibit the exact same bug: a user toggling only a volume-import option wouldn't be tracked as having a board in progress
- **Fix:** Added `boardStarted: true` to all branches of both toggle functions
- **Files modified:** components/design/design-store.tsx
- **Verification:** `npx tsc --noEmit -p .` clean; code inspection of every branch
- **Committed in:** dd3cfe3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Closes a gap the plan's own bug description would otherwise have left open for two sibling actions. No scope creep -- same file, same fix pattern.

## Issues Encountered

No headless browser/screenshot tool was available in this execution environment to visually confirm the two new capture buttons' contrast/hover state, or to click through the plan's manual verification steps (Discard & Start New with edited rails/fins/volume/name; editing only a rail control then checking the replace-board confirm dialog). Verified instead via `curl` against the running dev server (button renders in dev mode) and a post-`npm run build` grep of `.next/server`/`.next/static` (confirmed absent from production). The store-logic changes were verified by full-repo type-check (`npx tsc --noEmit -p .`, clean) and code inspection of every `setState` call site. Flagged as `human_judgment: true` in the coverage block above for a human to do the manual click-through pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Presets are structurally complete (outline + rails + fins) and the board-replacement bugs are fixed. Recommend the user does a quick browser pass on: (1) Discard & Start New after editing rails/fins/volume/name, confirming a genuinely fresh board; (2) editing only a rail control then returning to `/`, confirming the Continue Current Board card and replace-confirm dialog fire; (3) visual legibility of the new Copy preset values buttons on the Rails and Fins screens (dev mode). The next real step is a shaper tuning session using the new capture affordances to replace the seeded-but-untuned rails/fins values in `lib/geometry/presets.ts` with real per-board-type numbers, mirroring how `midlength`/`longboard` outlines were already tuned.

---
*Phase: quick-260821-prf*
*Completed: 2026-08-21*
