---
phase: 260829-rda
plan: 01
subsystem: geometry, rocker-screen
tags: [rocker, geometry, bezier, curve, design-store]
status: complete
dependency-graph:
  requires: []
  provides: [rocker-three-knot-curve, rocker-legacy-migration]
  affects: [foil-station-positions, presets, design-snapshot, rocker-screen-ui, order-form]
tech-stack:
  added: []
  patterns:
    - "Rocker curve built as three knots (tail tip, centre, nose tip) joined by two cubic Bezier segments, mirroring lib/geometry/outline.ts's own tail-pod/widepoint/nose-tip construction"
    - "Bidirectional numeric solve (bisection) used offline to tune preset/default shape controls against a target derived measurement, rather than hand-guessing values"
key-files:
  created: []
  modified:
    - lib/geometry/rocker.ts
    - lib/geometry/rocker.test.ts
    - lib/geometry/foil.ts
    - lib/geometry/board.ts
    - lib/geometry/rocker-drag.ts
    - lib/geometry/rocker-drag.test.ts
    - lib/geometry/presets.ts
    - lib/geometry/presets.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-datasheet.tsx
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-editor.tsx
    - components/summary/order-form.tsx
decisions:
  - "Inverted the plan's literal `(smoothness / 100) * max` handle-length formula to `((100 - smoothness) / 100) * max` — the rocker's tip is the curve's highest point (not its lowest, as in outline.ts's nose/tail), so the literal formula made higher smoothness produce a sharper, later kick instead of a smoother, more gradual one. Caught by the RED-phase tests before it ever reached a slider."
  - "Kept the codebase's existing station axis (tail=0, nose=length) rather than flipping to a nose-origin axis, per the plan's own planner_assumptions — a Bezier curve is identical under a left-right flip, so no consumer needed to change."
metrics:
  duration: "~2.5h"
  completed: "2026-08-29"
actuals:
  tokens: 148000
  tasks: 3
  commits: 3
---

# Quick Task 260829-rda: Fix the bottom rocker curve to draw like the template's own curve — Summary

Rebuilt the rocker line (the board's bottom curve, seen from the side) on the same three-point,
two-curve construction the board's outline already uses, so it draws as one smooth curve from tip
to tip instead of the old abrupt, kinked line — and made the two 12" rocker figures measurements
read off that curve instead of numbers a shaper had to type in.

## What changed, in plain terms

The old rocker line was drawn by forcing it through five fixed points, including two "12 inches in
from each tip" marks. Because those marks sat close to the tips and far from the middle, the curve
had almost no choice but to run nearly straight for the first foot, then bend hard right at the
mark — the kink a shaper reported seeing.

The new curve is built the same way the board's outline (the shape seen from above) already is:
three points — nose tip, centre, tail tip — joined by two smooth curves that meet perfectly flat in
the middle. Each tip now gets its own **Angle** (how steeply the curve leaves that tip) and
**Smoothness** (how gradual or sharp the rise into that tip is), and the centre gets a **Flatness**
for each side (how far the flat spot runs out from the middle before the curve starts to lift). The
two 12" figures are no longer typed in — they're measured straight off the drawn curve, on the
sidebar, the datasheet and the drawing itself, and all three always agree.

A board saved before this change still opens with its nose-tip and tail-tip rocker exactly as
saved; its 12" figures now come from the new curve instead. All four starting presets (Shortboard,
Fish, Mid-length, Longboard) keep their own tip lift exactly as before, and their new shape controls
were solved — not guessed — so their 12" figures still land within a hundredth of an inch of what
they measured before.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's literal smoothness-to-handle-length formula produced the opposite
of its own required behaviour**
- **Found during:** Task 1, while writing the RED-phase test that raising `noseSmoothness` should
  never lower the derived `noseLiftAt12in`.
- **Issue:** The plan's `<action>` text specifies each tip's handle length as
  `(smoothness / 100) * max`, copying `outline.ts`'s own fullness formula verbatim. In
  `outline.ts`, the nose/tail knot sits at the curve's MINIMUM (zero half-width), so a longer
  handle there pulls the near-tip control point UP, away from zero — "more fullness" genuinely
  retains more width near the tip. This rocker curve's tip knots sit at the curve's MAXIMUM (the
  lift peak, not zero), so the same formula pulls the near-tip control point DOWN, away from the
  peak — producing a curve that stays low for longer and then kicks up sharply only in the final
  stretch. That is backwards: it made "more smoothness" produce a MORE abrupt entry, not a
  smoother one, directly violating the plan's own required test invariant
  (`raising noseSmoothness never lowers noseLiftAt12in`).
- **Fix:** Inverted the fraction to `((100 - smoothness) / 100) * max`. Verified numerically (a
  standalone script mirroring the exact formula) across the whole control range, all three board
  lengths in `BOARD_LENGTH_RANGE_IN`, and several extreme combinations, that this produces the
  correct monotone direction for both nose and tail while still passing every no-fold-back and
  never-negative check the plan's `<behavior>` section requires.
- **Files modified:** `lib/geometry/rocker.ts` (deviation numbered and explained in the module's
  own header, alongside the STATION MODEL deviation).
- **Commit:** 94f471c

**2. [Rule 1 - Bug] Past-the-tail-tip station sampling returned the wrong end's lift**
- **Found during:** Task 1, running the RED-phase test suite — `sampleRocker` past station 0
  (before the tail tip) returned the NOSE tip's lift instead of the tail tip's.
- **Issue:** The private `interpolateLift` helper (mirroring `outline.ts`'s own
  `interpolateHalfWidth`) only had a fallback for "past the last point," inherited unchanged from
  `outline.ts`. Outline never needs the "before the first point" case (its station domain never
  goes negative in practice), but the plan's own `<behavior>` section explicitly requires the
  rocker sampler to clamp past EITHER end.
- **Fix:** Added an explicit early return for `station <= points[0].station`, alongside the
  existing past-the-end return, rather than relying on the loop's implicit fallthrough.
- **Files modified:** `lib/geometry/rocker.ts`.
- **Commit:** 94f471c

None of the deviations above required rebuilding presets or the saved-design migration — they were
caught and fixed inside `rocker.ts` itself, before the wider consumers ever saw the new API.

## Tuning notes (recorded here, not guessed)

`DEFAULT_ROCKER_SPEC`'s six new shape controls and each of the four presets' were solved with a
small offline bisection script (not committed, run in the scratchpad) against each board's own
prior stored 12" figures, then verified in the real `lib/geometry/rocker.ts` test suite. Every
preset's derived 12" figure lands within 0.005" of its old stored value — see each preset's own
comment in `lib/geometry/presets.ts` for the exact figures.

## Verification

- `npm test` — 1184 tests pass across all 23 suites, including the rewritten rocker suite (67
  tests), the rocker-drag suite, the presets suite and the legacy-snapshot migration tests.
- `npm run lint` — clean (0 errors; 9 pre-existing warnings in unrelated files, untouched by this
  task).
- `npx tsc --noEmit` — clean except two pre-existing `LayoutProps` phantom errors
  (`app/layout.tsx`, `app/design/layout.tsx`) caused by `next-env.d.ts` being gitignored and
  absent from a fresh worktree — matches the plan's own documented worktree caveat.
- **Human check (Task 3's `<human-check>` step) — NOT performed by this executor.** Both
  `npm run dev` and `npm run build` fail inside this worktree with a Turbopack error
  (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`) — the same
  documented worktree limitation the plan's own verification section calls out for `build`, which
  turns out to also block `dev` here. The visual checks in Task 3 (the curve reading as one smooth
  line, the sliders behaving as labelled, the derived 12" figures agreeing across all three
  surfaces, dragging the tips and deck points, applying each preset, and reopening a
  pre-change board) still need a human pass in a real browser after this branch is merged —
  matching the shaper's own established review cadence (one change per quick task, browser
  review between).

## Self-Check: PASSED

Files verified present:
- FOUND: lib/geometry/rocker.ts
- FOUND: lib/geometry/rocker.test.ts
- FOUND: lib/geometry/foil.ts
- FOUND: lib/geometry/board.ts
- FOUND: lib/geometry/rocker-drag.ts
- FOUND: lib/geometry/rocker-drag.test.ts
- FOUND: lib/geometry/presets.ts
- FOUND: lib/geometry/presets.test.ts
- FOUND: lib/models/design-snapshot.ts
- FOUND: lib/models/design-snapshot.test.ts
- FOUND: components/rocker/rocker-controls.tsx
- FOUND: components/rocker/rocker-datasheet.tsx
- FOUND: components/rocker/rocker-viewer.tsx
- FOUND: components/rocker/rocker-editor.tsx
- FOUND: components/summary/order-form.tsx

Commits verified present in `git log --oneline`:
- FOUND: 94f471c (Task 1)
- FOUND: ccf9de3 (Task 2)
- FOUND: 5436694 (Task 3)
