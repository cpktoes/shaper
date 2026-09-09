---
phase: quick-260909-ktq
plan: 01
subsystem: ui
tags: [touch, drag, svg, playwright, outline-viewer, rocker-viewer]

requires:
  - phase: 09 (the-design-screens-on-a-phone)
    provides: the coarse-pointer/touch drag wiring, the drag readout chip (D-17), the measured
      phone hit radii (OUTLINE_DRAG_HIT_COARSE_PX / SIDE_PROFILE_DRAG_HIT_COARSE_PX) this task
      extends
provides:
  - "components/viewer/drag-selection.ts — the shared tap-vs-drag threshold, pick state machine,
    and one-for-one delta helper both viewers now share"
  - "tap-to-pick + drag-from-anywhere-on-the-drawing on the TEMPLATE outline and ROCKER curve
    handles, touch-only, with the drag readout card anchored on the finger instead of the point"
affects: [phone-drag-ux, touch-drag-tests]

actuals:
  tokens: 17960
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Shared interaction state machines (picking, tap-vs-drag) live in components/viewer/, not
      lib/geometry/ — they decide nothing about board shape, so CLAUDE.md's Rule 1 boundary
      doesn't apply to them, but they still get full unit-test coverage"
    - "A gesture's pointStart/fingerStart are captured once at touch-down and never re-read live,
      so a remote drag's delta never compounds a solver's own quantisation rounding"

key-files:
  created:
    - components/viewer/drag-selection.ts
    - components/viewer/drag-selection.test.ts
  modified:
    - components/outline/outline-viewer.tsx
    - components/rocker/rocker-viewer.tsx
    - components/viewer/drag-pick-wiring.test.ts
    - e2e/touch-drag.spec.ts

key-decisions:
  - "D-01: everything here is touch-only, keyed on pointerType === 'touch' — a mouse or pen keeps today's direct-drag-only behaviour exactly"
  - "D-02: a tap on a point picks it, and a direct drag picks it too — the pick always survives a lift"
  - "D-03: with a point picked, a touch anywhere on the drawing moves it by the finger's own travel, 1:1"
  - "D-04: a touch-down that lands within reach of a point always picks that point, even mid-pick"
  - "D-05: a tap on empty canvas lets the pick go; with nothing picked, empty canvas does nothing"
  - "D-06: the number card follows the FINGER, not the point, in both direct and remote drags"
  - "D-07: a picked point wears an accent halo ring (DRAG_SELECTED_HALO_PX = 11)"
  - "D-08: the shared pick/drag logic lives in components/viewer/drag-selection.ts, not lib/geometry/, since it decides nothing about board shape"
  - "D-09: the tap-vs-drag threshold (TAP_MAX_TRAVEL_PX = 8) only decides what a LIFT means — no gesture is ever delayed by it"

patterns-established:
  - "One shared, axis-neutral drag-selection module serves both viewers' own station/halfWidth and
    station/height coordinate systems without either leaking its branded types into the module"

requirements-completed: [QT-260909-ktq, PHON-04, PHON-05, TEST-01]

coverage:
  - id: D1
    description: "A shaper on a phone can tap a control point to pick it (halo ring lights up and
      survives the lift), then move it with a thumb from anywhere on the drawing, including the
      panel's edge, on both the TEMPLATE outline and the ROCKER curve handles"
    requirement: "QT-260909-ktq"
    verification:
      - kind: unit
        ref: "components/viewer/drag-selection.test.ts — full pick/drag state machine, 16 tests"
        status: pass
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 'a tap picks the widepoint, then a thumb at the edge of the panel moves it one-for-one' (android/CDP)"
        status: pass
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 'a tap picks the nose tip handle, then a thumb at the edge of the panel moves it' (android/CDP)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A tap on empty canvas lets a picked point go; a direct drag still leaves the
      point picked for the next remote move; a touch on empty canvas with nothing picked still
      does nothing at all (D-05)"
    requirement: "PHON-04"
    verification:
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 'a tap on empty canvas lets the picked point go'"
        status: pass
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 'a direct drag leaves its point picked, so the next move can come from the edge'"
        status: pass
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 'a touch on empty canvas with nothing picked still does nothing'"
        status: pass
    human_judgment: false
  - id: D3
    description: "A mouse-driven desktop is completely unchanged: no picking, no ring, no card,
      and no remote drag reaches the solver — proved by the mouse-drag regression and the five
      unregenerated desktop baseline screenshots"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/desktop-regression.spec.ts — both mouse-drag cases (TEMPLATE Offset, ROCKER Nose Angle)"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts — all 5 screenshots, unregenerated"
        status: pass
    human_judgment: false
  - id: D4
    description: "On a real phone, the tap-and-drag-from-the-edge gesture feels right: the halo
      lights up, the card rides the thumb, the outline stays visible the whole time"
    verification: []
    human_judgment: true
    rationale: "Feel of a touch gesture (does the card sit comfortably at the edge, does the
      1:1 follow feel natural to a shaper's own thumb) is not something a CDP-dispatched touch
      event in headless Chrome can judge — Task 3's own <human-check> asked for this on a real
      device. Per this run's orchestrator ruling, human_verify_mode is end-of-phase, so this is
      deferred rather than blocking; see 'Human verification deferred' below."

duration: 50min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-ktq: Tap-to-pick, then shape from anywhere on the drawing — Summary

**New shared `components/viewer/drag-selection.ts` state machine lets a shaper tap a control point
on TEMPLATE or ROCKER to pick it, then shape it with a thumb anywhere on the drawing — including
the panel's far edge — while the number card rides along beside the thumb instead of covering the
board; the mouse-driven desktop is untouched.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)
- **Commits:** 3

## What changed, in plain English

Until now, moving a control point on the Template outline or the Rocker curve meant keeping your
thumb right on top of it — and Phase 9's little number card sits just above that same thumb, so
the one place you couldn't see while shaping was the exact spot you were shaping. The founder
asked for exactly this fix on his own phone: tap a point to pick it, then be able to drag from
anywhere on the screen, even down in an empty corner, so your thumb (and the card) get out of the
way of the curve.

That's what this does, on both drawings:

- **Tap a point** (one of the five control points on TEMPLATE, or one of the four curve handles on
  ROCKER) and it lights up with a ring around it. The ring stays on when you lift your finger.
- **With a point picked, put your thumb down anywhere else on the drawing and slide it.** The
  picked point follows your thumb by exactly the same distance you moved it — a 40px slide moves
  the point 40px, from wherever your thumb happens to be.
- **A direct drag — thumb right on the point — still works exactly as it always has**, with no
  delay, and it leaves the point picked afterward so you can carry on refining it from the edge.
- **Tap empty space and the picked point lets go**, the ring disappears. Tap empty space with
  nothing picked, and — same as always — nothing happens at all.
- **The number card now rides beside your thumb**, not the point, so it goes wherever your thumb
  goes, keeping the board's curve in full view the whole time you're shaping it.
- **A mouse on a computer sees none of this.** No ring, no card, no picking, no drag-from-a-
  distance — dragging a point still means clicking and holding it directly, exactly as before.

## Task Commits

1. **Task 1: Tap a point on the TEMPLATE, then shape it with a thumb at the edge of the screen** —
   `0ef449f` (feat)
2. **Task 2: Prove the rest of the picking rules on a real phone, and pin the wiring in source** —
   `91f0458` (test)
3. **Task 3: The ROCKER's four curve handles get the same thumb, and the desktop is proved
   untouched** — `8918547` (feat)

**Plan metadata:** `54b5e44` (docs: plan tap-to-pick and thumb-at-the-edge shaping on a phone,
pre-existing commit this worktree started from)

_Note: Task 1 is a `tracer` with `tdd="true"` — the RED (failing test) and GREEN
(`drag-selection.ts` implementation) steps were folded into one commit per the plan's own
instruction ("commit this step on its own if the RED/GREEN split is clean; otherwise fold it into
the task's single commit"), since both were written and verified in the same pass._

## Files Created/Modified

- `components/viewer/drag-selection.ts` — new shared module: `TAP_MAX_TRAVEL_PX`, `DragPointXY`,
  `remoteDragPoint`, `nextSelection` (the pick state machine)
- `components/viewer/drag-selection.test.ts` — 16 unit tests covering every transition
- `components/outline/outline-viewer.tsx` — wired the outline's five control points to the shared
  module: pick state, remote-drag gesture record, halo ring, `data-selected`, finger-anchored card
- `components/rocker/rocker-viewer.tsx` — the same wiring, mirrored for the rocker's four curve
  handles (station/height axes instead of station/halfWidth)
- `components/viewer/drag-pick-wiring.test.ts` — new source-contract block per viewer, pinning the
  shared module's use in place (imports it, calls `nextSelection`/`remoteDragPoint`, renders
  `data-selected`, still exactly one `onPointerDown`)
- `e2e/touch-drag.spec.ts` — a shared `findEmptyCanvasProbe` helper, plus 5 new CDP touch cases
  (4 on the outline, 1 on the rocker) proving the whole feature end-to-end in a real browser

## Decisions Made

| ID | Decision |
|----|----------|
| D-01 | Everything here is touch-only, keyed on `pointerType === "touch"` — a mouse/pen is untouched |
| D-02 | A tap on a point picks it, and a direct drag picks it too; the pick survives a lift |
| D-03 | With a point picked, a touch anywhere on the drawing moves it by the finger's travel, 1:1 |
| D-04 | A touch-down within reach of a point always picks that point, even mid-pick |
| D-05 | A tap on empty canvas lets the pick go; empty canvas with nothing picked does nothing |
| D-06 | The number card follows the FINGER, not the point, in both direct and remote drags |
| D-07 | A picked point wears an accent halo ring (`DRAG_SELECTED_HALO_PX = 11`) |
| D-08 | The shared pick/drag logic lives in `components/viewer/drag-selection.ts`, not `lib/geometry/` |
| D-09 | The tap-vs-drag threshold (`TAP_MAX_TRAVEL_PX = 8`) only decides what a LIFT means |

These are the orchestrator's recorded defaults from planning — flag any of them at review if they
don't match what you had in mind, and the next quick task can adjust.

## Deviations from Plan

None — plan executed exactly as written. All nine decisions (D-01 through D-09) were implemented
as specified, and every task's `<verify>`/`<done>` criteria passed on the first run with no
auto-fixes needed.

## Known Stubs

None.

## Human Verification Deferred

Task 3 carried one `<human-check>` item that a CDP-dispatched touch event in headless Chrome
cannot judge — this run's orchestrator ruling said not to stop for it and to record it here
instead (`workflow.human_verify_mode` is end-of-phase):

> On a real phone at the deployed preview: on TEMPLATE, tap the widepoint — it should light up
> with a ring. Then put a thumb down in the empty space at the bottom-right of the drawing and
> slide it up and down: the widepoint should follow your thumb up and down the board, the little
> Offset card should ride along beside your thumb at the edge, and the outline should be in plain
> sight the whole time. Tap the empty space once and the ring should go out. Repeat on ROCKER with
> the nose tip handle. Then check on a computer with a mouse that TEMPLATE and ROCKER drag exactly
> as they always have, with no ring and no card.

Everything this check asks for is already proven mechanically (unit tests for the pick logic, real
CDP-driven touch drags in the browser suite, the desktop mouse-drag regression, and all five
unregenerated desktop baseline screenshots) — this item is only the founder's own thumb confirming
it feels right on a real device.

## Issues Encountered

None. Every `<verify>` step in every task passed on the first attempt: the 60px empty-canvas probe
threshold held on both the outline (five points, wider spacing) and the rocker (four handles,
tighter spacing per the measured baseline) without needing the plan's own fallback of lowering the
rocker's threshold to 45px.

## Verification Summary

- `npx vitest run` — 50 test files, 2370 passed, 2 skipped (was 49 files / 2340 passed before this
  task; +1 file, +30 tests, no existing test's expectation changed)
- `npx tsc --noEmit` — clean, exit 0
- `npm run lint` — clean (12 pre-existing warnings, all in files this task never touched)
- `PW_PORT=3123 npx playwright test` — full suite green: 159 passed, 147 skipped (cross-project
  skips, e.g. iphone touch specs, desktop-only phone-layout specs), 0 failed
- `PW_PORT=3123 npx playwright test --project=android e2e/touch-drag.spec.ts` — all 7 cases pass
  (2 pre-existing + 5 new)
- `PW_PORT=3123 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts
  e2e/desktop-regression.spec.ts` — all 7 pass, all five baseline screenshots matched unregenerated

## Next Phase Readiness

No blockers. This closes out the founder's own reported friction point from Phase 9 UAT
(drag-with-offset). Ready to fold back into Phase 9's ongoing worktree/main line per the orchestrator's
merge process.

---
*Quick task: 260909-ktq*
*Completed: 2026-09-09*

## Self-Check: PASSED

All files created/modified confirmed present on disk; all three task commit hashes
(`0ef449f`, `91f0458`, `8918547`) confirmed present in `git log`.
