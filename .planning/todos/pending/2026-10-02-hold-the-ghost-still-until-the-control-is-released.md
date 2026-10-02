---
created: 2026-10-02T17:47:16.159Z
title: Hold the ghost still until the control is released
area: ui
severity: minor
files:
  - lib/design-history.ts:40
  - lib/design-history.ts:89
  - components/design/design-store.tsx:569
  - components/design/design-store.tsx:752
  - lib/outline-ghost.ts:76
  - components/outline/outline-viewer.tsx:554
  - components/outline/outline-viewer.tsx:608
  - components/design/slider-row.tsx:86
  - components/ui/slider.tsx:81
  - components/outline/outline-controls.tsx:188
  - e2e/outline-ghost.spec.ts:513
  - lib/outline-ghost.test.ts
---

## Problem

Captured from the founder on 2026-10-02, in their words: "todays ghost lines are too volatile. I want them to
stick until the control is releases whether thats a slider or the dragable points. But the ghost should not
move until the user releases; until then the user should be able to freely move with the previous shape still
showing what was. It appears that today the ghost updates too rapidly."

**The rule the founder is asking for.** From the moment a shaper grabs a control on TEMPLATE (a slider's dot,
or one of the draggable points on the drawing) until they let go, the ghost stays exactly where it was: the
shape the board had when they grabbed it. They can move back and forth, pause and compare for as long as they
like. The ghost moves on only after the release.

**What happens today, and why.** The ghost shipped as Phase 13 item 9b (quick 260930-lia, live since
2026-09-30) as "the shape one edit ago", read from the session's undo history. Two things make it move while
the control is still held. Both were measured on 2026-10-02 by running the app's own rules (`recordEdit` and
`pickOutlineGhost`) on a simulated held drag with controlled timestamps:

1. **A half-second timer decides where one edit ends, not the release.** The history folds movements into one
   edit only while each change lands within 500 ms of the one before (`COALESCE_WINDOW_MS`,
   `lib/design-history.ts:40`). The timer runs between changes of the VALUE, not movements of the hand: the
   recording effect skips a move that leaves the numbers as they were (`design-store.tsx:569`), and both the
   sliders and the draggable points snap to steps. So a slow, careful drag, or any pause over half a second
   while still holding, starts a new "edit", and the ghost jumps forward to wherever the board was at the pause.

   | One held drag, starting at 60 | Ghost shows | Undo steps |
   |---|---|---|
   | Fast: a change every 16 ms, 61 to 65 | 60 the whole way | 1 |
   | Slow: a change every 600 ms, 61 to 65 | 60, 61, 62, 63, 64 (one notch behind the live line) | 5 |
   | Drag to 63, hold still for 2 s, drag on to 65 | 60, then jumps to 63 | 2 |

2. **The ghost skips any past shape that equals the live one.** `pickOutlineGhost` (`lib/outline-ghost.ts:76`)
   walks back to the first history entry that DIFFERS from what is on screen. Passing back through the starting
   value while still holding (easy on a stepped slider) makes the starting shape equal the live one, so for that
   instant the ghost vanishes, or flips to an older shape from an earlier edit, and comes back on the next step.
   Measured: 60, 61, 62, 61, **60** (no ghost; or the older 58 when an earlier 58-to-60 edit is in the history),
   59 (ghost 60 again).

A side effect of cause 1 that the founder did not raise: Undo splits the same way. A slow drag takes several
Undo presses to take back (5 in the table), not one.

**Severity and timing (founder, 2026-10-02):** minor. The ghost still draws and no board number is wrong; it
moves before the shaper lets go. No date was set when it was recorded. The freeze for the Oct 10 showing is
Wednesday 2026-10-07.

## Solution

Rough shape, to be settled with the founder when it is planned:

- **Make press-to-release the edit.** The app has to know when a control is held:
  - **Draggable points.** `handlePointerDown` and `handleDragEnd` in `components/outline/outline-viewer.tsx`
    (lines 554 and 608) already mark where a drag starts and ends, for a mouse, a thumb on the point, and the
    phone's pick-then-drag-from-elsewhere gesture. `handleDragEnd` also runs on a cancelled touch.
  - **Sliders.** The slider library (Base UI) reports the release through `onValueCommitted`
    (`node_modules/@base-ui/react/slider/root/SliderRoot.d.ts:173`; it says whether it was a drag, a press on
    the bar or the keyboard). Nothing in the app listens for it today: `components/design/slider-row.tsx:86`
    and `components/ui/slider.tsx` pass only `onValueChange`, and `components/outline/outline-controls.tsx:188`
    uses the bare slider for Board Length. Decide at plan time whether the start needs its own pointer-down
    signal or "the first change since the last release" is enough.
- **While held, the ghost is pinned to the shape at the grab, full stop**, even when the live shape passes back
  through it. The two lines then sit on top of each other, which is the honest picture: nothing has changed.
  After the release the existing rule carries on.
- **Two ways to build it:**
  - (a) Teach the history about holds: a "control is held" flag (or a key per hold) so `recordEdit` folds
    everything between press and release into one step, however long it takes. This fixes the ghost and makes
    one drag one Undo step. It stays pure and provable with controlled timestamps, the way
    `lib/design-history.ts` is tested today.
  - (b) Leave the history alone and freeze only the ghost: remember the outline at the grab and draw that until
    release. On its own this is not enough. At the release the existing rule takes over and the ghost jumps to
    the last pause, not to the shape before the edit. So (a) is the likely fix, with the pin on top of it for
    cause 2.
- **Decisions for the founder:**
  - Should Undo follow the same rule, one press-to-release being one Undo step? Recommended yes: it is the same
    idea of "one edit". The history is shared by every screen, so this reaches the ROCKER, RAILS, FINS and
    VOLUME sliders and ROCKER's draggable points too, and each of those controls has to report its release.
  - After the release, the ghost keeps showing the shape from before that edit until the next control is
    grabbed. That is today's behaviour and the reading of "still showing what was" used here. Confirm.
  - Controls with no hold: arrow-key nudges on a slider, the typed measurement boxes, the feet and inches
    pickers for Board Length, and the tail-shape picks. Proposed: unchanged, each is its own edit.
  - Whether ROCKER gets a ghost at all is still open from item 9b ("ROCKER can follow after"). Not part of
    this todo.
- **Never a stuck ghost.** A hold must always end: a cancelled touch, a pointer lost when the window loses
  focus, and leaving TEMPLATE mid-drag all have to count as a release.
- **Proof.**
  - Unit tests for the rule with controlled timestamps: a held gesture with gaps over 500 ms is one step, and
    the ghost equals the grab shape at every sample, including when the live shape returns to it.
  - Browser tests on the three device profiles: a slow mouse drag with a pause over 500 ms mid-hold keeps
    `[data-outline-ghost]`'s path equal to the pre-drag path until the mouse comes up; the same for a slider
    dragged slowly, and for a touch drag on the two phones.
  - `e2e/outline-ghost.spec.ts` test (f) (line 513) separates two keyboard nudges with a 700 ms wait so each
    records as its own step. Re-read it against whatever rule is chosen for the keyboard.
  - The desktop reference screenshots should hold: a freshly opened board has no ghost.
- **Re-measuring.** The table above came from a scratch `npx tsx` script of about 25 lines that imports
  `recordEdit` and `pickOutlineGhost` and feeds them a stand-in snapshot (`{ outline: { noseAngle } }`) with
  chosen timestamps. Re-create it at plan time and use it for the before-and-after numbers.
