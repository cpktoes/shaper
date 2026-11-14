---
phase: 15-the-board-rack
plan: 01
subsystem: geometry
status: complete
tags: [board-rack, turn-maths, rack-art, wr-05]
requires: []
provides:
  - lib/geometry/rack-art.ts (RACK_ART_STEPS, RACK_OUTLINE_SWITCH_RAD, RackStation, RackBoardArt, RackPoint, buildRackBoardArt, turnedBoardPoints, turnedBoardPath, stringerPoints, stringerPath, halfExtent, drawnSpan, spineAnchorX)
  - lib/geometry/design.ts (LIVE_DESIGN_RULES, designSideProfile)
  - lib/geometry/screen-tiles.ts (silhouette, sidePoints now exported)
  - lib/models/rack-models.ts (RackBoardFigures, rackBoardFigures, RackModelsResult, rackModelsAndDrops)
affects: [15-02, 15-05, 15-06, 15-08, 15-12]
tech-stack:
  added: []
  patterns:
    - "One shared side-profile recipe (designSideProfile) for the card litres and the rack picture"
    - "Server-side drop of a row whose rack art can't be worked out, by the same function the browser uses"
key-files:
  created:
    - lib/geometry/rack-art.ts
    - lib/geometry/rack-art.test.ts
  modified:
    - lib/geometry/design.ts
    - lib/geometry/screen-tiles.ts
    - lib/models/rack-models.ts
    - lib/models/rack-models.test.ts
decisions:
  - "The turned outline writes x as `0 - w`, so the swallow notch's closing point is exactly x = 0, never a negative zero"
  - "The just-below-the-switch test uses the full derived two-sided bound (-h(1 - sin) to a*cos), because a tail with width but little thickness makes the one-sided bound in the plan false"
metrics:
  duration: "about 10 minutes"
  completed: 2026-10-06
actuals:
  tokens: 8900
  tasks: 2
  commits: 4
---

# Phase 15 Plan 01: The Turn Maths Summary

Each board on the rack now has a worked-out turn, built from its own rocker, deck and outline at 65 stations: exactly its side profile standing at rest, exactly its TEMPLATE outline (swallow notch included) when turned, with the stringer sliding from the rail edge to the centre and its words kept clear of it. A saved board whose picture can't be worked out is dropped on the server and named by id.

## What was built

- **`lib/geometry/rack-art.ts`** (new, pure): `buildRackBoardArt` samples the board's own `rockerAt` / `deckAt` and `sampleOutline` at 65 stations and throws, naming the value, on the first non-finite one. `turnedBoardPoints` projects each cross-section as an ellipse at angle theta (the sketch's formula). From `RACK_OUTLINE_SWITCH_RAD` (1.562 rad) up it returns the TEMPLATE `silhouette` mapped to x = -w. Also `stringerPoints`, the two SVG path helpers through `polylinePath`, `halfExtent`, `drawnSpan` and `spineAnchorX`.
- **`lib/geometry/design.ts`**: added `LIVE_DESIGN_RULES` and `designSideProfile(fields, rules)`. The second is the exact `buildBoardProfile` block `summarizeDesignWith` used, moved out unchanged. `summarizeDesignWith` now calls it and `summarizeDesign` passes `LIVE_DESIGN_RULES`. `design.test.ts`, `phase14-curves.test.ts` and `before-after.test.ts` pass with no edits.
- **`lib/geometry/screen-tiles.ts`**: `silhouette` and `sidePoints` are now exported. Their bodies are unchanged.
- **`lib/models/rack-models.ts`**: `rackBoardFigures(fields)` works out the card numbers and the rack art together. `rackModelsAndDrops(rows, log, options)` drops any row that fails to parse, or whose figures or art throw. It logs `Shaper: dropped unparsable saved board {id}` and returns `{ models, dropped }`. `rackModelsFromRows` keeps its signature and returns `.models`.

## Tests

- `rack-art.test.ts` covers the four presets plus a hand-set Shortboard (`blank: null`), all built through `presetDesignFields`, `buildOutline` and `designSideProfile`. It checks:
  - At rest: the side profile, station by station.
  - At 90 degrees and at the switch angle: the silhouette, deep-equal.
  - The fish's notch: the last point is at `centreCloseStation`, x = 0.
  - Just below the switch: the derived bound.
  - The stringer at rest, turned, and between the two edges at every whole degree.
  - `halfExtent` and `drawnSpan`.
  - The paths.
  - "Words never cross their board": every degree from 0 to 90, at the hover scale (12px) and the swipe scale (11px).
  - The throw on a NaN profile.
  - `designSideProfile` matching the design store's recipe.
- `rack-models.test.ts` covers:
  - `rackBoardFigures` for the presets and a hand-set board.
  - The throw on the crafted 500 mm board.
  - `rackModelsAndDrops` dropping the crafted board and a `{ nope: true }` row in input order, with two log calls.
  - `rackModelsFromRows` equalling its `.models`.
  - Every earlier test, which passes unedited.
- Full unit suite: 106 files, 4024 passed, 2 skipped. `npx tsc --noEmit` and `npm run lint` exit 0.

## Deviations from Plan

**1. [Rule 1 - Bug] Negative zero at the swallow's closing point**
- **Found during:** Task 1 (GREEN)
- **Issue:** Mapping the silhouette with `x: -w` turns the notch's closing point `w = 0` into `-0`, so the "last point is x = 0" check failed under deep equality.
- **Fix:** Both the code and the test's expected mapping use `0 - w`. The value is still -w, and a zero now reads as plain 0.
- **Files modified:** lib/geometry/rack-art.ts, lib/geometry/rack-art.test.ts
- **Commit:** a3391a5

**2. [Rule 1 - Bug] The just-below-the-switch bound, made two-sided**
- **Found during:** Task 1 (writing the test)
- **Issue:** The plan's bound, |projected half - half| <= (deck - rocker) / 2 * cos(theta), only bounds how far the section can grow wider. Where a station's thickness is near zero but its width is not, the section is h * sin(theta), slightly narrower than h. That breaks the one-sided bound.
- **Fix:** The test asserts the bound derived from ext = sqrt(a^2 cos^2 + h^2 sin^2): the narrowing is at most h(1 - sin(theta)), and the widening is at most a * cos(theta).
- **Files modified:** lib/geometry/rack-art.test.ts
- **Commit:** 35afba8 / a3391a5

## TDD Gate Compliance

- Task 1: RED `35afba8` (test), then GREEN `a3391a5` (feat).
- Task 2: RED `7baa549` (test), then GREEN `438e40b` (feat).
- No refactor commits were needed. The tracer gate was met: Task 1's verify was re-run end to end and passed (245 tests) before Task 2 started.

## Known Stubs

None.

## Threat Flags

None. The trust boundary (a stored snapshot reaching the art builder) is the one the plan lists. T-15-01 is mitigated: `buildRackBoardArt` throws on the first non-finite value, and `rackModelsAndDrops` drops that row inside its `try`, logging only the id. T-15-02 is accepted as planned: the log line is unchanged.

## Self-Check: PASSED

- FOUND: lib/geometry/rack-art.ts, lib/geometry/rack-art.test.ts, lib/models/rack-models.ts, lib/models/rack-models.test.ts
- FOUND commits: 35afba8, a3391a5, 7baa549, 438e40b
