---
phase: 260829-snm
plan: 01
subsystem: ui
tags: [svg, rocker, drag-and-drop, geometry]

requires:
  - phase: 260829-rda
    provides: buildRocker's three-knot, two-Bezier rocker construction with exported knots/handles
provides:
  - Construction-line overlay on the ROCKER screen's side-profile drawing (four lines, five plain dots), mirroring the TEMPLATE screen's grammar
  - Rocker drag solve reduced to the two rocker-line tips only
affects: [rocker, foil]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Construction overlay coordinates read straight from buildRocker's own knots/handles — no formula duplicated in the component (Rule 1)"

key-files:
  created: []
  modified:
    - lib/geometry/rocker-drag.ts
    - lib/geometry/rocker-drag.test.ts
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-editor.tsx

key-decisions:
  - "SideProfileDragTarget collapsed from a two-variant discriminated union to a plain two-member string union, once the deck variant went away — a one-live-member union is dead weight"
  - "solveSideProfileDrag now returns a bare Partial<RockerSpec> instead of a { rocker?, foil? } wrapper, so rocker-editor.tsx can pass updateRocker straight through as onDrag with no splitter function"

patterns-established: []

requirements-completed: [QUICK-260829-snm]

coverage:
  - id: D1
    description: "Rocker-line drag solve reduced to the two tips (noseTip/tailTip); deck/foil solve path fully removed"
    requirement: "QUICK-260829-snm"
    verification:
      - kind: unit
        ref: "lib/geometry/rocker-drag.test.ts (9 tests, all rewritten test-first)"
        status: pass
      - kind: unit
        ref: "lib/geometry/rocker.test.ts (unaffected, still green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rocker viewer draws four construction lines + five plain dots (buildRocker's own knots/handles), keeps only the two tip drag targets, drops all five deck grab points, in both orientations"
    requirement: "QUICK-260829-snm"
    verification: []
    human_judgment: true
    rationale: "Visual/interactive correctness (line placement, dot styling, drag feel, both orientations) requires eyes on the running app; npm run dev fails inside this git worktree (Turbopack symlink limitation), so the browser pass is deferred to the orchestrator's post-merge review per the plan's own human-check note."

duration: 22min
completed: 2026-08-29
status: complete
---

# Quick Task 260829-snm: Rocker construction lines, deck points removed — Summary

**The ROCKER screen now shows the same "steering lines" skeleton the TEMPLATE screen already shows, and the five clutter points that used to sit on the deck (thickness) curve are gone.**

## What changed, in plain English

Turn on "Show construction lines" on the ROCKER screen and you'll now see, on the bottom
curve, four thin accent-coloured lines with small dots — one line running out of the tail
tip, one out of the nose tip, and two more running out of the centre point, one toward each
end. These are the same "steering handles" the TEMPLATE screen has always drawn for the
board's outline — they show you what's pulling the curve into its shape as you adjust Nose
Angle, Nose Smoothness, Nose Flatness (and the tail equivalents), without you having to
guess. The dots at the end of each line, and the one on the centre point, are just markers —
you can't grab them, they're there to show you the shape.

The only two things on the whole drawing you *can* still grab and drag are the nose tip and
the tail tip. Dragging either still sets that tip's rocker number, same as before, snapped to
the nearest sixteenth of an inch the way the slider is.

The five little grab points that used to sit on the deck (thickness) curve above the rocker
line are gone. Thickness is still fully adjustable — just from the five Thickness sliders in
the sidebar, which already did that job. Removing the deck points was purely about
uncluttering the drawing; nothing about how thickness works has changed.

Turn "Show construction lines" back off and the drawing looks exactly like it always has:
board shape, baseline, station ticks, and the numbers below.

## Performance

- **Duration:** 22 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `lib/geometry/rocker-drag.ts` reduced from a nine-target, two-curve drag solver to a
  two-target (`noseTip`/`tailTip`) solver — the deck/foil solve path, its target type variant,
  and its wrapper limits table are all gone.
- `lib/geometry/rocker-drag.test.ts` rewritten test-first (RED confirmed against the old
  implementation before GREEN) for the reduced signatures — 9 tests, all passing.
- `components/rocker/rocker-viewer.tsx` gained the construction-line overlay: four lines and
  five plain marker dots built directly from `buildRocker`'s own `knots`/`handles`, drawn in
  the same order (lines, dots, targets, hit circles) the TEMPLATE viewer already established,
  inside the one rotated content group so both orientations work for free.
- `components/rocker/rocker-editor.tsx`'s `handleViewerDrag` splitter function deleted — with
  only one mutator left to hand a drag patch to, `onDrag={updateRocker}` wires straight through.

## Task Commits

Both tasks were committed atomically:

1. **Task 1: Reduce the side-profile drag solve to the two rocker tips** - `e868d72` (feat, TDD: RED before GREEN)
2. **Task 2: Draw the construction overlay on the rocker curve and drop the deck grab points** - `c76d8e2` (feat)

**Plan metadata:** *(to be added by the orchestrator's final commit)*

## Files Created/Modified

- `lib/geometry/rocker-drag.ts` - Drag solve trimmed to the two rocker tips; deck/foil path removed entirely
- `lib/geometry/rocker-drag.test.ts` - Rewritten test-first for the two-tip signatures
- `components/rocker/rocker-viewer.tsx` - Construction-line overlay (four lines, five dots) added; deck drag targets removed; `onDrag` prop simplified to `Partial<RockerSpec>`
- `components/rocker/rocker-editor.tsx` - `handleViewerDrag` splitter deleted; `onDrag={updateRocker}` wired directly

## Decisions Made

- `SideProfileDragTarget` collapsed to a plain `"noseTip" | "tailTip"` string union (mirroring
  `outline-drag.ts`'s `OutlineDragTarget`), since the discriminated-union wrapper existed only
  to distinguish a rocker target from a deck target — with the deck variant gone, the
  discriminant could never be false.
- `solveSideProfileDrag` now returns a bare `Partial<RockerSpec>` instead of a
  `{ rocker?, foil? }` wrapper, letting `rocker-editor.tsx` pass `updateRocker` straight
  through as `onDrag` with no splitter function needed.
- The module's own `ROCKER_LIFT_RANGE_IN` re-export (`SIDE_PROFILE_DRAG_LIMITS`) was retired —
  the range is now imported from `rocker.ts` directly at the single call site, per the
  project's one-definition-per-formula rule.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` and `<behavior>`
specs; no Rule 1-4 auto-fixes were needed.

## Issues Encountered

None. `node_modules` was symlinked from the main checkout at the start of the session (per
the standard worktree setup note) since it doesn't exist in a fresh worktree.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test` - full suite green: 1174 tests across 23 files, including the reduced
  `rocker-drag.test.ts` (9 tests) and the unaffected `rocker.test.ts`/`foil.test.ts`/
  `volume.test.ts`.
- `npm run lint` - clean; the 9 warnings reported are all pre-existing, in files this plan
  never touched (`outline.test.ts`, four `scripts/extract-prototype-*-golden.mjs` files).
- `npx tsc --noEmit` - clean apart from the two expected pre-existing `LayoutProps` phantom
  errors (`app/layout.tsx`, `app/design/layout.tsx`) caused by `next-env.d.ts` being
  gitignored and absent from a fresh worktree, per the environment notes.
- `npm run build`/`npm run dev` intentionally NOT run — both fail inside a git worktree
  (Turbopack symlink limitation); the orchestrator builds after merge.

## Known Stubs

None.

## Human Verification Pending (post-merge)

Task 2's `<human-check>` browser pass could not be run by this executor (`npm run dev` fails
in a worktree). Recorded here for the shaper's own one-change-then-review cadence, to be done
after merge:

1. Open `/design/rocker` and press the construction-lines button in the viewer toolbar.
2. Four accent lines appear on the bottom curve — one out of each tip, two out of the centre —
   each ending in a small dot, with a dot on the centre point too.
3. Only the nose tip and the tail tip carry a round grab target. Nothing is drawn on the deck
   curve above, and nothing up there responds to a drag.
4. Move Nose Angle, Nose Smoothness and Nose Flatness in turn: the lines swing and stretch with
   the curve and stay attached to it.
5. Drag each tip: the curve follows, the tip's slider follows, and the number lands on a
   sixteenth.
6. Move each of the five Thickness sliders: the deck curve still moves.
7. Press the rotate button and repeat steps 2, 3 and 5 with the board nose-up.
8. Turn construction lines back off: the drawing is exactly as it was before.

## Next Phase Readiness

Ready to merge. No blockers or concerns — the geometry layer already carried everything this
plan needed (`buildRocker`'s `knots`/`handles` from 260829-rda), so this was purely a drawing
and drag-solve simplification with no new maths.

---
*Phase: 260829-snm*
*Completed: 2026-08-29*
