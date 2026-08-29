---
phase: 04-rocker-foil-editors
plan: 03
subsystem: geometry
tags: [rail-bands, foil, design-store, zod, react-context]

requires:
  - phase: 04-rocker-foil-editors (plan 01)
    provides: FoilSpec, DEFAULT_FOIL_SPEC, the five-station foil model, and the DESIGN_SNAPSHOT_VERSION 2 rocker/foil backfill path
provides:
  - deriveEffectiveRails (lib/geometry/design.ts) — the pure link from the foil's three shared stations onto the three rail sections
  - railsImportFoilThickness threaded through the design store, the save snapshot, and summarizeDesign
  - The RAILS screen's link checkbox and disabled-while-linked treatment on the three thickness sliders
affects: [05-summary-order-form, any-future-phase-touching-rail-bands-or-foil]

actuals:
  tokens: 8600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Derived-value link (never a sync effect): deriveEffectiveRails mirrors deriveEffectiveVolume's shape exactly — return the input unchanged unless an import flag says otherwise, computed fresh in a useMemo, never written back into stored state."

key-files:
  created: []
  modified:
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - components/design/design-store.tsx
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - components/setup/board-rack-card.tsx

key-decisions:
  - "railsImportFoilThickness defaults to true everywhere (new board, snapshot backfill, version-1 reopen) — a board designed in the app is the common case, and a board saved before this phase reopens linked, reading its own backfilled foil (D-15) instead of a stale rails thickness."
  - "Unlinking never copies or clears rails.*.boardThickness — the RAILS sliders write there only while unlinked, so a shaper's hand-typed thickness survives any number of link flips untouched. No confirmation dialog needed because nothing is ever discarded either way (CONTEXT.md's Destructive-confirmation row)."
  - "The dev-only 'Copy preset values' capture on RAILS reads the raw stored rails, never the foil-derived effectiveRails, so a captured preset always records what was actually authored on that section."

patterns-established:
  - "Pattern: a screen-level import/link toggle checkbox above a control group, checked by default, dimming (opacity-40) the now-non-authoritative sliders while showing the derived value in their label — established by Volume's import toggles, now reused verbatim by RAILS. Any future screen wanting the same 'derive from an earlier step vs. type your own' idiom should copy this shape rather than inventing a new one."

requirements-completed: [ROCK-01, FOIL-01]

coverage:
  - id: D1
    description: "deriveEffectiveRails maps foil.nose12/center/tail12 onto the three rail sections' boardThickness, takes no rocker argument, and leaves every non-thickness field and the input object itself untouched"
    requirement: "FOIL-01"
    verification:
      - kind: unit
        ref: "lib/geometry/design.test.ts#deriveEffectiveRails"
        status: pass
    human_judgment: false
  - id: D2
    description: "railsImportFoilThickness rides the save snapshot: round-trips in both states, and a missing key (a pre-phase board) backfills to true"
    requirement: "FOIL-01"
    verification:
      - kind: unit
        ref: "lib/models/design-snapshot.test.ts#design-snapshot"
        status: pass
    human_judgment: false
  - id: D3
    description: "The RAILS screen's link checkbox (checked by default) dims the three thickness sliders while linked and shows the foil-derived value; unchecking re-enables them and preserves the shaper's own last manual value across any number of flips"
    requirement: "FOIL-01"
    verification: []
    human_judgment: true
    rationale: "Visual dimming, disabled-slider styling, and the round-trip preservation of a hand-typed value across toggle flips need a human looking at the actual RAILS screen in Daylight and Slate themes, per the plan's own human-check verify step — not something a unit test can see."

duration: 20min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 3: One Thickness, Not Two Summary

**`deriveEffectiveRails` makes the foil's nose/center/tail thickness the single source of truth the RAILS screen's band calculator reads, with a default-on link toggle that still lets RAILS work standalone.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-29T22:21:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- `deriveEffectiveRails` (lib/geometry/design.ts) is the one place thickness flows from the foil into the rail bands: with the link on, `foil.nose12`/`center`/`tail12` replace the three sections' `boardThickness`; the two tip stations never reach it, and the function takes no rocker argument at all, so a rocker lift structurally cannot move a rail band number.
- `railsImportFoilThickness` is threaded end to end: `DesignState` → the save snapshot (`design-snapshot.ts`, backfilling `true` for any board saved before this phase) → `summarizeDesign` (so a rack card's numbers always match what the RAILS screen shows).
- The RAILS sidebar gained the link checkbox — "Use Board's Rocker & Foil Thickness," checked by default, matching the Volume screen's import-toggle idiom byte for byte — with the three thickness sliders dimming and showing the foil-derived value while linked.

## Task Commits

Each task was committed atomically:

1. **Task 1: The link — the foil's thickness drives the rail bands** - `fda4346` (feat)
2. **Task 2: The override — RAILS still works as a standalone calculator** - `7e7ecd6` (feat)

_Worktree mode: no separate plan-metadata commit — STATE.md/ROADMAP.md are updated centrally by the orchestrator after merge._

## Files Created/Modified
- `lib/geometry/design.ts` - Adds `deriveEffectiveRails`; extends `summarizeDesign` to run it before `computeRailBands`
- `lib/geometry/design.test.ts` - New `deriveEffectiveRails` suite (station mapping, tip exclusion, no-mutation, rocker-independence) plus updated `summarizeDesign` call sites
- `components/design/design-store.tsx` - `railsImportFoilThickness` state/toggle, `effectiveRails` memo, `railBands` now computed from `effectiveRails`
- `lib/models/design-snapshot.ts` - `railsImportFoilThickness: z.boolean()` in the top-level `.partial()` schema, backfilled `?? true` in `parseSnapshot`
- `lib/models/design-snapshot.test.ts` - Round-trip and missing-key backfill cases for the new field
- `components/rails/rail-controls.tsx` - The link checkbox, its plain-English state line, and the `disabled` gate on the three thickness sliders
- `components/rails/rail-band-editor.tsx` - Threads `effectiveRails`/`railsImportFoilThickness`/`toggleRailsImportFoilThickness`; preset capture reads the raw stored `rails`, not the derived value
- `components/setup/board-rack-card.tsx` - Passes `foil`/`railsImportFoilThickness` through to the extended `summarizeDesign` (Rule 3 fix, see below)

## Decisions Made
- `railsImportFoilThickness` defaults to `true` everywhere a default is needed (new board, snapshot backfill, version-1 reopen) — a board designed in the app is the common case, and D-15 means older boards should just show the better, linked number.
- Toggling the link never copies into or out of `rails.*.boardThickness` — only the RAILS sliders themselves write there (via `updateRailSection`), so a hand-typed value survives any number of flips. No confirmation dialog on the toggle, matching the UI-SPEC's Destructive-confirmation row: nothing is ever discarded.
- The dev-only "Copy preset values" affordance on RAILS captures the raw stored `rails`, not `effectiveRails`, so a captured preset never accidentally records a foil-borrowed number as if it were authored on that section.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `board-rack-card.tsx`'s `summarizeDesign` call site**
- **Found during:** Task 1 (extending `DesignSummaryFields`)
- **Issue:** `DesignSummaryFields` gained two new required fields (`foil`, `railsImportFoilThickness`). `components/setup/board-rack-card.tsx`'s in-progress-card branch called `summarizeDesign({ outline, rails, volume })` with the old three-field shape — a type error / broken rack-card summary for the in-progress card once the signature changed.
- **Fix:** Destructured `foil` and `railsImportFoilThickness` from `useDesign()` alongside the existing fields and passed them through to `summarizeDesign`.
- **Files modified:** `components/setup/board-rack-card.tsx`
- **Verification:** `npm test` (1049 passed); grep-verified the new destructure and call site.
- **Committed in:** `fda4346` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep `summarizeDesign`'s signature change from silently breaking the setup screen's in-progress rack card. No scope creep — this file was always going to need the new fields once `DesignSummaryFields` changed shape.

## Issues Encountered
- The doc comment I first wrote for `deriveEffectiveRails` used `foil.noseTip`/`foil.tailTip` (explaining what does NOT appear in the mapping), which collided with the plan's own acceptance-criteria grep (`design.ts` must contain neither substring anywhere). Reworded to "the two tip stations" — same meaning, satisfies the literal grep.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Thickness is now single-sourced from the foil through to the rail bands, with the standalone override intact — nothing else in the phase depends on this plan finishing first except the Summary order form's reserved rocker box (plan 04-05), which reads the same `foil`/`rails` fields already threaded through the store.
- **Pending human verification** (not run in this worktree): open `/design/rails`, confirm the link checkbox is checked by default and dims the three sliders showing the foil's values, uncheck/move/re-check/uncheck again to confirm the manual value round-trips untouched, in both Daylight and Slate themes. `npm run build` was also not run in-worktree per this repo's environment notes (Turbopack can't resolve `next` outside the main checkout) — the orchestrator runs it after merge.

---
*Phase: 04-rocker-foil-editors*
*Completed: 2026-08-29*
