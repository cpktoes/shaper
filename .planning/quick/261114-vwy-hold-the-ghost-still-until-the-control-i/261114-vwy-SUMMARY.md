---
quick_id: 261114-vwy
title: Hold the ghost still until the control is released — one hold is one Undo step
date: 2026-11-14
status: complete
commits: [76f45327]
---

# Hold the ghost still until the control is released — summary

## What changed, in plain words

Press a slider's dot, or grab one of the points on the TEMPLATE drawing, and from that moment until you let go the
faint ghost of the board stays exactly the shape the board had when you grabbed it. Move as slowly as you like, pause
as long as you like, drag back through where you started — the ghost does not move. And the whole hold is one Undo
step: one Cmd+Z, or one tap of the phone's Undo, puts the board back where it was before you pressed, not one notch
back. A hold that comes back to where it started leaves nothing to undo, and whatever Redo was waiting is still there.
Typed boxes, arrow-key nudges and picks are as they were. The founder's ruling of 2026-11-14 on the to-do of 2026-10-02.

Before, the history treated a pause longer than half a second as the end of one edit and the start of another, so a
slow drag split into a step per notch and the ghost trailed one notch behind the live line; and the ghost skipped any
old shape equal to the live one, so dragging back through the start made it vanish for an instant.

## How

- The history (`lib/design-history.ts`) knows when a control is held: `beginHold` opens a hold, every change inside it
  folds into one step with no clock, `endHold` closes it — and when the board came back to exactly where the hold began,
  puts both stacks back untouched. Undo and Redo close a hold.
- The ghost rule (`lib/outline-ghost.ts`) takes a pin: while a held control has moved the board, the ghost is the shape
  at the press, whether or not the live shape equals it.
- One small context (`components/design/edit-hold.tsx`, a no-op outside the store) carries the two calls. The shared
  slider begins a hold on pointer-down on its control and ends it on Base UI's commit on release; TEMPLATE's five drag
  points and the WINGS close-up's grab points begin and end theirs in their own press and lift handlers. The store backs
  every hold with the window's `pointerup`, `pointercancel` and `blur`, so a press that never moved the value (Base UI
  commits nothing for it), a cancelled touch, a lost window or a screen left mid-drag can never leave a ghost stuck.
- Every design screen with a slider is covered through that one slider; the only drags that write the board are
  TEMPLATE's (BOTTOM's cutting line only moves what is seen; ROCKER has nothing to drag).

## Proof

- Unit, with controlled timestamps: a hold of five changes 600 ms apart is one step and Undo returns to the grab; Redo
  restores it; a hold ending on its start records nothing and keeps Redo; a press that never moves closes cleanly; a
  nudge just before a press never folds in; a straggling change after the release does; the ghost is the grab shape at
  every sample while the live shape walks away and back through it.
- `e2e/hold-ghost.spec.ts`: on a computer a slow widepoint drag with three long pauses, back through its start, keeps the
  ghost's path equal to the pre-drag path at every sample and one Cmd+Z returns the board; a slow slider drag on
  TEMPLATE and on ROCKER is one Undo step; a press on a dot that never moves leaves nothing to undo. On Android a real
  touch drag with a pause holds the ghost and one tap of the phone's Undo takes the whole drag back.
- `npm test` 13,770 passed (eight stopwatch and timeout failures under the concurrent browser run, in files this task
  never touched, all pass alone); `tsc` and lint clean; `outline-ghost.spec.ts` and `undo-redo.spec.ts` green on all
  three devices (two iPhone page-load flakes passed alone).

## Limits

A release is its own browser event after the last movement. React normally commits the last movement before the
release is handled; if a release ever lands first, a hold that came back to its start could keep one empty step (an
Undo that changes nothing), never a split step or a moving ghost — the released hold keeps its key for the half-second
window so a straggling change still folds in. A keyboard nudge within half a second of a release folds into the hold's
step, exactly as two quick nudges fold today.
