---
quick_id: 261114-vwy
title: Hold the ghost still until the control is released — one hold is one Undo step
date: 2026-11-14
source: to-do 2026-10-02-hold-the-ghost-still-until-the-control-is-released.md (the founder, 2026-10-02); his ruling of 2026-11-14 — "Yes, one hold is one Undo step", built as the to-do's option (a) with the ghost pinned to the grab shape while held
planned_by: the orchestrator inline (no planner or executor spawned)
---

# Hold the ghost still until the control is released

## Goal

From the moment a shaper presses a slider's dot or grabs a point on the TEMPLATE drawing until they let go, two things
hold. The faint ghost of the board stays exactly the shape the board had at the grab — however slowly they move, however
long they pause, and even while the live line passes back through it. And the whole hold, press to release, is ONE Undo
step: one Cmd+Z (or one tap of the phone's Undo) puts the board back where it was before the hold, not one notch back.
A hold that comes back to its starting value leaves no step at all. Typed boxes, arrow-key nudges and picks are
unchanged (today's rule: each its own edit, rapid nudges within half a second still fold).

The rule reaches every screen with a slider or a drag — TEMPLATE, ROCKER, BOTTOM, RAILS, VOLUME and FINS — because every
slider in the app is one component (`components/ui/slider.tsx`) and the only drags that write the board are TEMPLATE's
five points and the WINGS close-up's grab points. (BOTTOM's cutting-line drag only moves what is seen, never the board;
ROCKER has nothing to drag since Phase 14's D-14.) Nothing about the maths or the saved board changes.

## Why the ghost moved before (measured 2026-10-02, in the to-do)

The history folds movements into one step only while each change lands within 500 ms of the last. A slow drag, or a
pause while holding, started a new step, and the ghost (the shape one step ago) jumped forward. And the ghost rule skips
any past shape equal to the live one, so passing back through the start made the ghost vanish for an instant.

## Tasks

1. **The history learns about holds** (`lib/design-history.ts`, pure, provable with controlled timestamps).
   `DesignHistory` carries a `hold` (`null`, or the `past` and `future` as they stood when the hold began). `beginHold`
   opens one (and forgets `lastKey`, so the hold's first change never folds onto an earlier edit); while a hold is open
   `recordEdit` pushes the first change's `before` and folds every later change into it with no clock at all; `endHold`
   closes it — and when the board came back to exactly where the hold began, puts `past` and `future` back as they were,
   so nothing is recorded and Redo is still there. Undo and Redo close a hold. `holdHasRecorded` says whether the open
   hold has pushed its step yet. Nothing here knows what a board is.
2. **The ghost is pinned while held** (`lib/outline-ghost.ts`): `pickOutlineGhost` takes a third argument; pinned, it
   returns the most recent step's outline whether or not it equals the live one. The store passes
   `holdHasRecorded(history)`.
3. **Every control reports its hold** through one small context (`components/design/edit-hold.tsx`, no-op outside the
   design store, the pattern of `use-controls-locked.ts`): the shared `Slider` begins a hold on pointer-down on its
   control and ends it on Base UI's `onValueCommitted`; TEMPLATE's `handlePointerDown`/`finishGesture` and the wing
   close-up's `handlePointerDown`/`handlePointerEnd`/pinch-start do the same. The store adds a window-level backstop —
   `pointerup`, `pointercancel` and `blur` all end a hold — so a press that never moves the value (Base UI commits
   nothing for it), a cancelled touch, a lost window or leaving the page mid-drag can never leave a ghost stuck.
4. **Proof.** Unit: one hold of many changes 600 ms apart is one step, Redo restores it, a hold ending on its start
   records nothing and keeps Redo, the ghost stays the grab shape while the live shape passes back through it, a nudge
   after a release never folds onto the hold. Browser (`e2e/hold-ghost.spec.ts`): on a computer a slow widepoint drag
   with a pause over half a second keeps the ghost's path equal to the pre-drag path at every sample and one Cmd+Z
   returns the board; a slow slider drag on TEMPLATE and on ROCKER is one Undo step; on the Android profile a real
   touch drag with a pause does the same with the phone's Undo button. `npm test`, `tsc`, lint, and the touched
   specs (`outline-ghost`, `undo-redo`) green.

## Known edge, accepted

A release is processed by the browser as its own event after the last movement. In React the last movement's change
normally commits before the release is handled, so `endHold`'s "did the board come back to where it started?" compares
the right shape. If a release ever lands before that commit, the only consequence is a hold that ended on its start
value keeping an empty step (one Undo that changes nothing), never a split step or a moving ghost — the released hold
keeps its key for the 500 ms window so a straggling change still folds in.
