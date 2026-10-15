---
phase: quick-261014-wii
plan: 02
subsystem: ui
tags: [geometry, outline, wings, fins, template, drag, phone, metric, playwright]

requires:
  - phase: quick-261014-wii plan 01
    provides: the wing maths (wings.ts), the fin lock (wing-lock.ts), the WINGS tab, close-up, sidebar, Show fins and dial-in pop-up
provides:
  - "lib/geometry/outline-drag.ts: wingDragPoints, solveWingDrag, nearestWingDragTarget, WING_GRAB_DROP_PX — the wing grab points' solve beside the outline's own five"
  - "the WINGS close-up's grab points, its window held still from press to lift, and its compact frame (CLOSE_UP_COMPACT, useCompactFrame)"
  - "lib/geometry/wings-readers.test.ts: the proof that every printout, the Board Rack, the tiles and the litres follow a winged board"
  - "e2e/wings.spec.ts: grab points, the held window, phones upright and sideways, a thumb drag, 1024 x 768, Metric, FINS"
affects: [TEMPLATE, FINS, printed templates, Overview Sheet, Board Rack, screen tiles, VOLUME]

actuals:
  tokens: 47000    # chars/4 over plan 02's hand-written diff (about 1,284 added lines, 188,000 characters incl. this summary)
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A drag target type of its own (WingDragTarget) beside the VIEWER's exhaustive five-target union, hooked as data-wing-grab"
    - "A view window frozen in component state from pointer-down to pointer-up, so a drag never re-frames under the pointer"
    - "A drawing choosing its own compact frame from the FULL frame's fit (fixed per window), never from width or pointer"

key-files:
  created:
    - lib/geometry/wings-readers.test.ts
    - .planning/quick/261014-wii-wings-on-the-template-page-up-to-two-win/261014-wii-SUMMARY.md
  modified:
    - lib/geometry/outline-drag.ts
    - lib/geometry/outline-drag.test.ts
    - components/outline/wing-close-up.tsx
    - components/outline/wing-view-layout.ts
    - components/outline/wing-view-layout.test.ts
    - components/outline/wings-panel.tsx
    - components/outline/wing-controls.tsx
    - components/outline/outline-viewer.tsx
    - components/outline/outline-controls.tsx
    - e2e/wings.spec.ts
    - e2e/board-lock-screens.spec.ts

key-decisions:
  - "The inner grab point measures depth from the rail the board would have at the inner corner WITHOUT this wing (other wings kept), not the sketch's bare curve at the wing's station — so a press alone never jumps the depth"
  - "The compact frame keeps the full frame's 240 right rail and takes a 24 bottom pad (plan: 190 and 16) — measured on the phones"
  - "The founder's four rulings after plan 01's look match what was built and nothing changed: position = the apex where the step leaves the curve; the pop-up every time a board goes from no wings to one; the radius slider stops at the largest round that fits; back from FINS lands on VIEWER"

patterns-established:
  - "useCompactFrame: a pure 'does the full frame fit above the pinned floor' test, decided from the full frame's width so it can never loop"

requirements-completed: [QT-261014-wii]

coverage:
  - id: D5
    description: "Two grab points per wing with Show construction; outer slides the wing (or sets the fin offset when locked), inner sets depth and run; 1/16 inch or 1 mm grid inside each range; the window holds still while held"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/outline-drag.test.ts#wing grab points — two per wing, beside the outline's own five"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts (desktop: grab points, held window, inner point)"
        status: pass
    human_judgment: true
    rationale: "How the drag feels under a real mouse and thumb is the founder's call at the look"
  - id: D3
    description: "The close-up compact and whole on both phones upright and sideways and at 1024 x 768; the wing controls in the stacked controls"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "components/outline/wing-view-layout.test.ts#the compact frame"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts (phones upright, Pixel 7 and iPhone sideways, desktop 1024 x 768)"
        status: pass
    human_judgment: true
    rationale: "The compact close-up's look on a real phone is the founder's call"
  - id: D9
    description: "Metric: the position and widths in centimetres, depth in whole millimetres, a drag lands on a whole millimetre"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/outline-drag.test.ts#in Metric ..."
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: in Metric ..."
        status: pass
    human_judgment: false
  - id: D1
    description: "Every reader follows the winged outline; no wings, no change"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/wings-readers.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: FINS draws the tail with the wing's step in it"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-10-15
status: complete
---

# Quick 261014-wii: Wings on the TEMPLATE page Summary

**A shaper can now add up to two wings to a board from a WINGS tab on TEMPLATE, set them with sliders or by
grabbing them on a close-up of the tail, and every printout, the fins, the Board Rack and the litres follow the
winged board.** This summary covers both plans. Plan 01's own record is `261014-wii-01-SUMMARY.md`.

## What a shaper can now do

- **Add a wing.** Open TEMPLATE's ADD WINGS tab and tap "+ Add a wing".
  - The first wing locks to the front fin's trailing edge. On a single-fin board it sits at 11".
  - It is 3/8" deep, with a 1/4" run and sharp corners.
  - A second wing sits 4 1/2" further up, with its corners rounded as far as they fit.
- **See it.**
  - The board's outline steps in behind each wing. The step fades to nothing by the tail, so the tail block keeps
    its width.
  - The WINGS tab shows the last 26" of the tail close up, with each wing's depth, run, and the widths ahead of
    and behind it. Once a wing passes 24", the window grows to hold it.
  - The VIEWER names each wing with a WING chip in its left margin.
- **Dial it in against the fins.** The first wing switches Show fins on and asks the shaper to check the fins on
  FINS. The fins measure in from the real rail beside them, so a wing moves its fins by the step.
- **Set it by hand or by grabbing it (new in plan 02).** With View Construction Lines on (on by default on a touch
  screen), each wing shows two grab points:
  - The outer one slides the wing along the rail. On a locked wing it sets the offset from the fin instead.
  - The inner one, just below the step, pulls the depth in or out and the run along the stringer.
  - Every number lands on 1/16" (a whole millimetre in Metric) and the sidebar follows.
  - The close-up never jumps while you hold a point. It grows to hold the wing only when you let go.
- **On a phone (new in plan 02).** The close-up draws a compact version of itself, whole, above the wing controls
  when upright, and beside them when sideways. A thumb pulls a grab point without scrolling the page. A narrow
  computer window (1024 × 768) gets the same compact drawing.
- **In Metric (new in plan 02).**
  - The position reads in centimetres, and the depth, run, radius and offset in whole millimetres: the chip reads
    `10 mm @ 27.9 cm`.
  - The widths read 36.2 cm ahead of the step, 34.0 cm behind it, and 37.4 cm at 12".
- **Everything follows (proven in plan 02).** The full-size template's Tail @ 12" mark, the Overview Sheet, the
  Board Rack's turn, the screen tiles, the litres and FINS' tail drawing all draw the winged board. A board
  without wings is unchanged everywhere.
- **Saving.** Wings save with the board. Older boards open unchanged. A damaged wing list opens as no wings.

## The founder's rulings after looking at plan 01 (2026-10-15)

The founder ruled on all four of plan 01's open questions. Each ruling matches what plan 01 built, so nothing
changed:

1. **Position.** A wing's position marks the wing's apex: the outer rail break point, where the step leaves the
   curve.
2. **Pop-up.** The dial-in pop-up opens every time a board goes from no wings to one.
3. **Radius slider.** The corner-radius slider stops at the largest round that fits the step.
4. **Returning from FINS** lands on the VIEWER tab.

## The numbers

- **The step's maths** matches the founder's sketch 013 at all 8,090 recorded points. The worst difference is
  2.73e-12 mm, against a tolerance of 1e-9 mm (plan 01, F13).
- **The fin lock** settles in one pass everywhere except a narrow tail (a 12" width of 12.5" or less). There it
  takes at most two passes, capped at three (F19). Examples:
  - Default board: a wing ahead of the fin moves it −8.916 mm; one at the trailing edge, +0.010 mm.
  - Narrow tail, trailing + 1": settles at 12.7520" in 2 passes.
  - Quad McKee SB: one pass. The 12" width goes 14.7199 → 14.1288" and the half-spread 3.1441 → 2.9230".
- **The grab points' solve** is 15 new unit tests. The outline's own 47 drag tests pass unedited.
- **The readers' proof** is 15 unit tests over the 30" stinger (1/2" deep, 3/4" run, 1" radius):
  - the template mark and the Overview Sheet's line read the winged 12" width;
  - the rack's half-width behind the stinger is the winged outline's;
  - the tiles carry every step station;
  - the litres drop.

  With an empty wing list, every reader gives exactly the plain board's value.

## Measured facts F27–F30 (plan 02)

| Fact | Result |
|---|---|
| F27 | **Corrected.** The boxes and the full frame (882 wide, widest half-width 9.201") hold. Which box goes compact holds: the four phone boxes and 1024 × 768 compact, 1280 × 800 full. **The compact frame is 871 wide, not 826**, because its right rail stays 240 (see Deviations 2). The compact fits and px per inch: iPhone upright 0.436 / 9.73; Pixel upright 0.462 / 10.30; iPhone sideways 0.473 / 10.54; Pixel sideways 0.424 / 9.46; 1024 × 768 0.629 / 14.04. The chip is 157.6 units wide with its left edge at 8.4 on every compact box (the floor is pinned). At 1280 × 800: 0.912, 19.21 px/in, chip 114.1 wide, left edge 85.9. On the iPhone the close-up draws about 1.9× the VIEWER's 5.08 px/in (plan: about 2×). |
| F28 | **Confirmed.** The default board, one wing locked at 10.9768", full frame, 21.077 units per inch, cx 427.9, fit 0.912. The outer point is at (578.2, 372.6). The depth line is at y 395.9. The inner point (569.1, 402.0) hangs 22 / 0.912 = 24.1 units below the inner corner (377.9). |
| F29 | **Confirmed for the outer point and the run, improved for the depth** (Deviations 1). The sketch measured depth from the bare curve at the wing's own station. That makes a press without a move jump the depth by the other wing's take, or by the curve's narrowing over a long run. |
| F30 | **Confirmed, with one limit.** The CDP touch helper is Chromium-only, so the thumb drag runs on the android project. On the iPhone (WebKit) project the phone checks are layout only, like `e2e/slider-touch.spec.ts`. Metric is switched through App Default Settings with `e2e/helpers/settings.ts`. |

## Plan 01's choices, restated for the orchestrator

- **P3 (no snap on a locked station).** A locked wing sits exactly at the fin edge plus its offset, unsnapped. The
  offset itself moves in 1/16" and a drag sets only the offset, so P3 holds through plan 02. Keep it?
- **P7 (the baseline moved to plan 01).** Plan 01 re-recorded the TEMPLATE desktop baseline. Plan 02 changes
  nothing on the default TEMPLATE screen. All five desktop baselines must pass unchanged (P15), and none was
  re-recorded.

## Still open for the founder

- **Two wings close together** (sketch 015's question). Nothing stops wing 2 being dragged onto or behind wing 1.
  The two steps simply add up. Is that right, or should wing 2 stay a set distance ahead of wing 1?
- **The close-up's scale.** It is about 2.5× the VIEWER at 1280 × 800 (19.2 px/in), against the sketch's "about
  three times". On a phone it is about 1.9×.
- **How the grab points feel** under a real mouse and a real thumb (Human verification below).

## Task commits (plan 02)

1. `55c1f41`: The phone check that walks all six screens of a locked board gets three times as long on a freshly
   started test server. This fixes a pre-existing test timeout (Deviations 3).
2. `621f03f` (Task 1, tracer): Grab a wing on the WINGS close-up and pull it along the rail or in and out, and the
   view holds still while you hold it.
3. `0af8ca0` (Task 2): The WINGS close-up fits a phone upright and sideways and a narrow computer window, a thumb
   can pull a wing, and every number reads in Metric.
4. `9a63cd6` (Task 3): Every printout, the Board Rack, the screen tiles and the litres follow a winged board, and
   a board without wings is unchanged.
5. This summary.

Plan 01's commits were `5e46425`, `10279df`, `288facc`, `c03d66f` and `f15b161`, merged as `bd59843`.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 - Bug] The inner grab point's depth is measured from the rail without this wing**
- **Found during:** Task 1, while writing `solveWingDrag` against F29.
- **Issue:** The sketch's formula is depth = (the bare curve at the wing's station) − (the pointer's half-width).
  - With two wings it ignores the other wing's take. Pressing wing 1's inner point without moving would jump its
    depth by wing 2's faded take at that spot (about 3/16" on the default pair).
  - With a long run it also adds the curve's narrowing between the station and the inner corner.
- **Fix:** Depth = (the half-width the board would have at the inner corner without this wing, every other wing
  kept, via `wingedHalfWidthAt`) − (the pointer's half-width). A press alone now gives the wing back unchanged
  (unit-tested). Moving the point 1/8" in deepens the wing by exactly 1/8".
- **Files:** `lib/geometry/outline-drag.ts`. **Commit:** `621f03f`.

**2. [Rule 1 - Bug] Two compact-frame numbers moved after the phone run**
- **Found during:** Task 2. The plan says a clipped label is "fixed in the layout constants".
- **Issue:** With the plan's compact numbers, three read-outs ran outside the drawing:
  - **Right edge (railRight 190).** The letter-spaced read-outs "AHEAD OF WING 1" and "BEHIND WING 1" ran past
    it. By 17.0 / 7.6 px on the iPhone upright, 18.8 / 8.9 px on the Pixel upright, and 25.3 / 11.8 px at
    1024 × 768. That is about 39 drawing units at the pinned floor.
  - **Bottom edge (padBottom 16).** The "TAIL BLOCK" read-out's name line ran 2.2 dots below the drawing on both
    phones held sideways.
- **Fix:** `CLOSE_UP_COMPACT.railRight` 240 (the full frame's own) and `padBottom` 24. Every chip and read-out now
  lies inside the drawing on all four phone sizes and at 1024 × 768. The spec now lists every overflow before
  failing, so one run names them all.
- **Files:** `components/outline/wing-view-layout.ts`. **Commit:** `0af8ca0`.

**3. [Rule 3 - Blocking] Pre-existing cold-server timeout in `e2e/board-lock-screens.spec.ts` p-screens (iPhone)**
- **Issue:** The test walks six screens. On a freshly started dev server it took 29.8 s against the 30 s limit.
  The orchestrator proved the same failure on `c496047`, the commit before plan 01. It is not a wings fault.
- **Fix:** `test.slow()` on that test, as the same file's s-fins test already has.
- **Commit:** `55c1f41`.

**4. [Rule 3 - Blocking] One file outside `files_modified`: `components/outline/outline-controls.tsx`**
- **Issue:** P16 calls for the shared `TemplateSettings`' optional `constructionNote`, but that prop did not exist.
- **Fix:** Added it (an optional string after "View Construction Lines"). Only `WingControls` passes it, so the
  Template Builder is unchanged.
- **Commit:** `621f03f`.

### Other notes

- **The coarse hit radius** (the finger's 22 dots) was planned for Task 2 and landed there. The `touch-none`
  svg landed in Task 2 too.
- **The iPhone gets no thumb drag check.** CDP touch is Chromium-only (F30). Its two layout checks, upright and
  sideways, run on WebKit.
- **"Got it" closes the pop-up with a real click (orchestrator's check).**
  - `addFirstWing` and `addFirstWingOnPhone` click "Got it" and assert the dialog gone, on all three projects.
  - A new desktop test proves "Open FINS" lands on /design/fins and that coming back lands on the VIEWER tab with
    the wing still there.
  - Nothing in `wing-dial-in-dialog.tsx` needed fixing. A scripted click in the orchestrator's pane is not a real
    pointer click; Playwright's is.

## TDD Gate Compliance

- **Task 1.** The 15 wing-drag tests were written first and failed (RED: 15 failed, 47 passed). They passed once
  `solveWingDrag` existed. The plan asks for one commit per task, so there are no separate `test(...)` commits.
- **Task 2.** The compact-frame tests were written with `useCompactFrame` and passed on the first run.
- **Task 3.** The readers' proof passed on its first run, as expected: plan 01 already routed every reader through
  `buildOutline`. These tests pin that behaviour down, so there was no RED step to show.

## Gates

All gates ran inside the worktree, in order:
- **`npx vitest run`:** 139 files, 4,864 passed, 2 skipped.
- **`npx next typegen && npx tsc --noEmit`:** clean.
- **`npm run lint`:** clean.
- **The whole browser suite** (`PW_PORT=3172 IS_WEBPACK_TEST=1 npx playwright test`, all three projects, a
  freshly started webpack dev server): **1,085 passed, 781 skipped, 0 failed, EXIT 0**, in 1.1 hours.
  - That includes `e2e/board-lock-screens.spec.ts` whole, with p-screens passing on the iPhone.
  - It includes `e2e/wings.spec.ts`: 17 tests across the three projects.
  - The five desktop baselines (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) all passed unchanged. None was re-recorded
    (P15), and no snapshot file is modified.
- **Frozen fixtures.** The prototype golden, the template digests, every fin golden and the wings golden pass
  unedited. `PINNED_PRESET_OUTLINES` is untouched.

## Human verification deferred

There is no human-verify checkpoint (`workflow.human_verify_mode` is end-of-phase). For the founder's look on the
dev server:
- On a computer, open TEMPLATE, add two wings and switch View Construction Lines on.
  - Pull each grab point and check it feels right.
  - Drag a wing past 24": the close-up holds still until you let go, then grows.
- On a phone, upright and sideways: the compact close-up's look against sketch 014's pictures, and a thumb on a
  grab point.
- At 1024 × 768: the compact close-up.
- In Metric: the chip, the read-outs and the sliders.
- Plan 01's own items still stand: the close-up against `wings-tab-daylight.png` and `b-stinger-*.png`, the VIEWER
  chips against `viewer-tab-daylight.png`, and the pop-up's wording against `first-wing-popup-daylight.png`.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.
- T-wii-06: every drag output is snapped and clamped, non-finite input falls back to the minimum, and the radius
  is re-clamped (unit-tested).
- T-wii-07: the held window is proven by the spec reading `data-window-hi-in` mid-drag.
- T-wii-08: a locked board passes no `onWingsChange`, so there are no grab areas and no handlers.

## Self-Check: PASSED

- The created and modified files are present: `lib/geometry/wings-readers.test.ts`, `lib/geometry/outline-drag.ts`,
  `components/outline/wing-close-up.tsx`, `components/outline/wing-view-layout.ts` and `e2e/wings.spec.ts`.
- Plan 02's commits `55c1f41`, `621f03f`, `0af8ca0` and `9a63cd6` are on this worktree's branch. Plan 01's are in
  its history below `bd59843`.
