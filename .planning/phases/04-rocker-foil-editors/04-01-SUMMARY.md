---
phase: 04-rocker-foil-editors
plan: 01
subsystem: geometry, ui
tags: [monotone-spline, fritsch-carlson, rocker, foil, zod, design-store, svg-viewer]

requires:
  - phase: 01-foundation
    provides: outline geometry (sampleOutline, MEASURE_STATION_MM), design-store patterns, TabbedPanel, callout tokens
  - phase: 02-accounts-saved-designs
    provides: design-snapshot.ts's versioned envelope and .partial()-backfill mechanism
  - phase: 03-volume-templates-verified-math
    provides: DEFAULT_RAIL_BAND_SPEC/DEFAULT_VOLUME_SPEC thicknesses the foil defaults match
provides:
  - Fritsch-Carlson monotone cubic Hermite spline sampler (lib/geometry/monotone-spline.ts)
  - Five-station RockerSpec/FoilSpec geometry modules with samplers
  - BoardSpec.rocker/foil, DesignState.rocker/foil, updateRocker/updateFoil mutators
  - /design/rocker route with a working side-profile viewer and two live sliders
  - DESIGN_SNAPSHOT_VERSION 2 — rocker/foil round-trip through save/reopen with default backfill
affects: [04-02-plan, 04-03-plan, 04-04-plan, 04-05-plan, rails-thickness-link, volume-simpson-integration]

actuals:
  tokens: 15300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Monotone-by-construction spline (Fritsch-Carlson) instead of an after-the-fact validateBoard check"
    - "Five-station blank-datasheet spec (RockerSpec/FoilSpec) mirroring rail-bands.ts's Spec/DEFAULT_*/compute triad"
    - "Fixed-frame SVG viewer sized from BOARD_LENGTH_RANGE_IN and the geometry module's own range constants"

key-files:
  created:
    - lib/geometry/monotone-spline.ts
    - lib/geometry/monotone-spline.test.ts
    - lib/geometry/rocker.ts
    - lib/geometry/rocker.test.ts
    - lib/geometry/foil.ts
    - lib/geometry/foil.test.ts
    - app/design/rocker/page.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-viewer.tsx
  modified:
    - lib/geometry/board.ts
    - components/design/design-store.tsx
    - components/site-nav.tsx
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts

key-decisions:
  - "RockerSpec/FoilSpec store only their four/five station values, nothing derived — sampleRocker/sampleFoil rebuild the spline fresh every call, mirroring buildOutline"
  - "applyPreset/applyModel's preset.rocker/preset.foil wiring deferred: BoardPreset has no rocker/foil field until 04-05 tunes the presets, so a new/preset board's rocker/foil comes from the DEFAULT_DESIGN_STATE spread instead; applyModel's snapshot.rocker/snapshot.foil restoration landed in Task 3 once DesignSnapshotFields actually carries those fields"
  - "Deck-over-bottom board silhouette drawn as one closed SVG path (bottom curve + vertical tip edges + reversed deck curve), not two separate strokes, so the board reads as a single solid shape"

requirements-completed: [ROCK-01, FOIL-01]

coverage:
  - id: D1
    description: "ROCKER tab exists between TEMPLATE and RAILS, routes to a working screen"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "grep-verified NAV_LINKS order and /design/rocker route existence"
        status: pass
    human_judgment: true
    rationale: "Nav ordering and route wiring were grep-verified; actual click-through and live redraw in a browser were not run in this worktree session (no dev server) and should be confirmed with a UAT pass"
  - id: D2
    description: "Side profile draws the board from the side: bottom curve is the rocker, deck curve is rocker + thickness, closed as one shape"
    requirement: "ROCK-01"
    verification:
      - kind: unit
        ref: "lib/geometry/rocker.test.ts, lib/geometry/foil.test.ts, lib/geometry/monotone-spline.test.ts"
        status: pass
    human_judgment: true
    rationale: "Sampler correctness is unit-tested; the visual result (SVG layout, label legibility, theme contrast) was not verified in a browser this session"
  - id: D3
    description: "Nose-tip rocker and centre-thickness sliders redraw the board live"
    requirement: "ROCK-01, FOIL-01"
    verification: []
    human_judgment: true
    rationale: "No dev server was run in this worktree session; live-redraw behavior needs a browser UAT pass"
  - id: D4
    description: "sampleRocker/sampleFoil hit station values exactly and never produce a folded curve"
    requirement: "ROCK-01, FOIL-01"
    verification:
      - kind: unit
        ref: "lib/geometry/rocker.test.ts (sampleRocker, rockerStationPoints), lib/geometry/foil.test.ts (sampleFoil, foilStationPoints), lib/geometry/monotone-spline.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Rocker and foil round-trip through save/reopen; a pre-phase board backfills defaults cleanly"
    requirement: "ROCK-01, FOIL-01"
    verification:
      - kind: unit
        ref: "lib/models/design-snapshot.test.ts (round trip, missing-rocker, missing-foil, version-1-shaped snapshot, malformed-rocker-throws cases)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 1: ROCKER Tab Tracer Summary

**Fritsch-Carlson monotone spline powering a new five-station RockerSpec/FoilSpec, wired end-to-end into a live `/design/rocker` screen and the versioned save envelope**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 14 (9 created, 5 modified)

## Accomplishments

- Built `lib/geometry/monotone-spline.ts`: a hand-written Fritsch-Carlson monotone cubic Hermite
  sampler, satisfying GEOMETRY-MODULE.md's no-fold-back rule by construction rather than by a
  `validateBoard` check this codebase doesn't have.
- Built `lib/geometry/rocker.ts` and `lib/geometry/foil.ts`: the five-station blank-datasheet
  model (CONTEXT.md D-05) — four rocker lift values, five foil thickness values — each with a
  `DEFAULT_*` spec, a station-points function and a sampler, mirroring `rail-bands.ts`'s house
  style. The foil defaults provably agree with `DEFAULT_RAIL_BAND_SPEC`'s and
  `DEFAULT_VOLUME_SPEC`'s existing thicknesses.
- Wired `rocker`/`foil` into `BoardSpec`, the design store (`updateRocker`/`updateFoil`, no
  synchronization effect) and the top nav — a new ROCKER tab lands between TEMPLATE and RAILS.
- Built `/design/rocker`: a sidebar with a nose-tip rocker slider and a centre-thickness slider,
  and a side-profile SVG viewer that draws the whole board as one closed shape (bottom curve from
  the rocker, deck curve from rocker + foil), nose on the left, against the flat surface the
  rocker is measured from.
- Bumped `DESIGN_SNAPSHOT_VERSION` to 2: `rockerSpecSchema`/`foilSpecSchema` join the existing
  tolerate-missing-fields backfill machinery, so rocker and foil round-trip through save/reopen
  and a board saved before this phase reopens with sensible defaults and no error.

## Task Commits

1. **Task 1: The ROCKER tab draws the board's rocker line, live from a slider** - `b8c2fef` (feat)
2. **Task 2: The deck curve — thickness stacked on the rocker line** - `cca47b2` (feat)
3. **Task 3: Rocker and foil survive a save and reopen** - `3a7e02c` (feat)

_This plan's tasks were `tracer`/`auto` type, not `tdd="true"` — each task's own `<verify>` (unit
tests plus lint) ran and passed before its commit; there is no separate RED/GREEN/REFACTOR gate
sequence to report._

## Files Created/Modified

- `lib/geometry/monotone-spline.ts` - Fritsch-Carlson monotone cubic Hermite sampler, shared by rocker and foil
- `lib/geometry/monotone-spline.test.ts` - exactness, no-overshoot, flat-pair and non-finite-guard cases
- `lib/geometry/rocker.ts` - RockerSpec, DEFAULT_ROCKER_SPEC, ROCKER_LIFT_RANGE_IN, rockerStationPoints, sampleRocker
- `lib/geometry/rocker.test.ts` - exact-at-station, no-fold-back (default/extreme/all-zero) and station-order cases
- `lib/geometry/foil.ts` - FoilSpec, DEFAULT_FOIL_SPEC, FOIL_THICKNESS_RANGE_IN, foilStationPoints, sampleFoil
- `lib/geometry/foil.test.ts` - exact-at-station, rail/volume-default-agreement, non-negative-bounded and tip>0 cases
- `lib/geometry/board.ts` - BoardSpec gains `rocker`/`foil`; DEFAULT_BOARD_SPEC seeds both
- `components/design/design-store.tsx` - DesignState/DesignContextValue gain rocker/foil, updateRocker/updateFoil, designSnapshotFields and applyModel carry both
- `components/site-nav.tsx` - NAV_LINKS gains the ROCKER entry between TEMPLATE and RAILS
- `app/design/rocker/page.tsx` - the `/design/rocker` route
- `components/rocker/rocker-editor.tsx` - sidebar shell: title, nose-tip rocker slider, centre-thickness slider
- `components/rocker/rocker-viewer.tsx` - the closed-shape side-profile SVG, fixed-frame, output-rail labels
- `lib/models/design-snapshot.ts` - DESIGN_SNAPSHOT_VERSION 2, rockerSpecSchema/foilSpecSchema, parseSnapshot backfill
- `lib/models/design-snapshot.test.ts` - version-2, round-trip, missing-rocker, missing-foil, version-1-shaped-snapshot and malformed-value cases

## Decisions Made

- **Deferred `preset.rocker`/`preset.foil` wiring.** Task 1's plan text asked for `rocker:
  preset.rocker` in `applyPreset` and `rocker: snapshot.rocker` in `applyModel`, but neither
  `BoardPreset` (presets.ts, tuned in a later plan per D-12/RESEARCH.md) nor `DesignSnapshotFields`
  (added in Task 3) carried those fields yet at that point in the plan. Wiring them immediately
  would have been a compile error. `applyPreset` still produces a fully-seeded board because it
  spreads `DEFAULT_DESIGN_STATE` first (which now includes `DEFAULT_BOARD_SPEC.rocker`/`.foil`) —
  a preset-applied board gets the shared defaults until 04-05 tunes each preset's own values.
  `applyModel`'s `snapshot.rocker`/`snapshot.foil` restoration was added in Task 3, once
  `DesignSnapshotFields` actually had those fields to read — this is what makes D-15's "reopens
  with its own curves" behavior real rather than a silent fallback to defaults on every reopen.
- **Board silhouette as one closed SVG path.** Rather than two separate stroked curves, the
  viewer builds one path (bottom curve tail→nose, a vertical edge at the nose tip, the deck curve
  reversed nose→tail, implicit closing edge at the tail tip) so the fill reads as a single solid
  board, matching `outline-viewer.tsx`'s own closed-path convention.
- **Output rail shows both rocker and thickness values per station**, prefixed `R`/`T`, rather
  than only the five thickness values Task 2's acceptance criteria named — keeping Task 1's four
  rocker labels alongside them (mirroring D-07's "full datasheet view" intent) rather than
  dropping them when foil labels were added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deferred preset/snapshot field references that didn't exist yet at each task boundary**
- **Found during:** Task 1 (writing `applyPreset`/`applyModel`)
- **Issue:** The plan's Task 1 action text asked for `rocker: preset.rocker` and `rocker:
  snapshot.rocker`, but `BoardPreset` and `DesignSnapshotFields` didn't carry those fields at that
  point in execution (presets.ts is out of this plan's scope entirely; `DesignSnapshotFields`
  gains `rocker`/`foil` in Task 3). Adding those lines as written would have broken the build.
- **Fix:** Left `applyPreset` unchanged for rocker/foil (both fall through to the
  `DEFAULT_DESIGN_STATE` spread already in place) and added `rocker`/`foil` to `applyModel` in
  Task 3, once `DesignSnapshotFields` actually had the fields to read.
- **Files modified:** `components/design/design-store.tsx`
- **Verification:** Full test suite green after each task; no compile-order issue introduced.
- **Committed in:** `b8c2fef` (Task 1), `3a7e02c` (Task 3)

**2. [Rule 1 - Bug] Removed a literal `dangerouslySetInnerHTML` mention from a doc comment**
- **Found during:** Task 1, self-check against acceptance criteria
- **Issue:** The viewer's own header comment said "never `dangerouslySetInnerHTML`" — a doc
  reference, not real usage, but the acceptance criterion's grep (`grep -c
  dangerouslySetInnerHTML ... `) would have counted it and failed the check.
- **Fix:** Reworded the comment to describe the same constraint without the literal string.
- **Files modified:** `components/rocker/rocker-viewer.tsx`
- **Committed in:** `b8c2fef`

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking compile order, 1 Rule 1 - bug in a
grep-checked doc comment).
**Impact on plan:** Both were necessary to keep each task's own build/verify step green;
no scope creep. The rocker/foil preset-tuning work itself is still fully owed to 04-05, unchanged.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required. No Drizzle migration: the `snapshot` column
is `jsonb` holding the whole versioned envelope, so the version bump is entirely inside
`design-snapshot.ts`'s Zod boundary.

## Verification Notes

- `npm test` (whole suite): 1021 passed, including the 3 new geometry suites and the extended
  snapshot suite.
- `npm run lint`: 0 errors (9 pre-existing warnings, unrelated to this plan's files).
- `npm run build` was **not** run in this worktree per this project's own environment notes
  (Turbopack cannot resolve `next` outside the main checkout) — the orchestrator runs build in
  the main checkout after merge.
- Browser verification (visiting `/design/rocker`, moving both sliders, confirming the live
  redraw) was **not** performed in this session — no dev server was started. Flagged as
  `human_judgment: true` in the `coverage` block above for a UAT pass.

## Known Stubs

None. The DATASHEET tab, typed imperial entry, construction-line drag, the rails thickness link,
preset tuning and the Simpson volume integration are explicitly out of this plan's scope per
`04-01-PLAN.md`'s objective (this is the phase's tracer, widened by 04-02 through 04-05) — not
stubs left behind inside this plan's own deliverables.

## Next Phase Readiness

`lib/geometry/rocker.ts`, `lib/geometry/foil.ts` and `lib/geometry/monotone-spline.ts` are ready
for 04-02 (rocker-drag.ts's inverse-solve) and 04-04 (the Simpson volume integration) to build on.
The five-station model, the `RockerStationKey`/`FoilStationKey` unions and `rockerStationPoints`
are the one definition of where the stations sit, as designed. No blockers for the next plan in
this phase.

---
*Phase: 04-rocker-foil-editors*
*Completed: 2026-08-29*
