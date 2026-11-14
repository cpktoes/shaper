---
phase: 15-the-board-rack
plan: 11
subsystem: home page, Board Rack (computer, and the keyboard on both racks)
tags: [board-rack, drag-to-move, keyboard, menu, accessibility, rack-order]
status: complete
requires:
  - 15-02 (hoverPressOutcome, hoverSlotAt, hoverSlotPosition, CARRY_LIFT, DROP_MARK_WIDTH, SLOT_SLIDE_MS, DROP_MS, LIFT_MS, SETTLE_MS, tween)
  - 15-03 (moveOneStep, savedIdsInOrder, IN_PROGRESS_KEY, movesOffered, RACK_COPY)
  - 15-06 (HoverRack, and the orchestrator's room rule from 158da4f / b17862b / af2e349)
  - 15-09 (useRackOrder, useRackStatus / RackStatus, BoardRack.handleMove, SwipeRack's carry)
provides:
  - HoverRack props onMove and onMoveOneStep; press-and-drag with pointer capture; the keyboard map; the rack's group and hidden instructions
  - SwipeRack prop onMoveOneStep (Alt + arrow on a touch screen with a keyboard)
  - RackCardMenu props moves (RackCardMoves) and onOpenChange; Move left / Move right above a Menu.Separator
  - RackCaption props moves and onMenuOpenChange, gated by movesOffered
  - BoardRack.handleMoveOneStep and the menuOpen freeze
affects:
  - 15-10 (the founder's device check — D-11's switch now also decides the swipe rack's ⋯ Move rows)
  - 15-12 (docs and source-isolation tests read these files)
tech-stack:
  added: []
  patterns:
    - each board drawn standing on a floor at 0 and placed by its group's transform, so it can slide or be carried into another row without redrawing
    - the carried board, its gap and the drop mark worked out per frame in refs, the one React state change being at the lift and at the drop
    - focus put back on a moved board by key after the reorder (a moved button can lose the focus)
key-files:
  created: []
  modified:
    - components/setup/hover-rack.tsx
    - components/setup/board-rack.tsx
    - components/setup/rack-card-menu.tsx
    - components/setup/rack-caption.tsx
    - components/setup/swipe-rack.tsx
    - e2e/board-rack.spec.ts
    - e2e/board-rack-phone.spec.ts
decisions:
  - "A board moving to a new place slides along its row in 110 ms, but changes row at once, rather than flying diagonally across the rack"
  - "While a ⋯ menu or a dialog is open the rack ignores the pointer and the keys; the boards are not given the `inert` attribute, because a delete hands the focus to the next board while its dialog is still closing, and Base UI's menu and dialogs already shut out the rest of the page"
  - "The keyboard map is handled once, on the rack's group, so it is one listener for every board"
metrics:
  duration: ~75 min
  completed: 2026-10-06
  tasks: 3
  files: 7
actuals:
  tokens: 14900
  tasks: 3
  commits: 3
---

# Phase 15 Plan 11: Move boards on a computer, and walk the rack by keyboard

On a computer a shaper can now press a board and drag it to a new place on the rack, into another row too. The other boards slide over to make room and a short blue mark under the floor shows where it will land. The turned board's ⋯ menu has Move left and Move right, and Alt with an arrow key does the same from the keyboard. The whole rack can be walked and opened without a mouse, and a screen reader hears every move. The unsaved board always stays first. On phones and iPads the ⋯ menu stays Rename, Duplicate and Delete unless the founder turns on the D-11 switch.

## What changed, for a shaper

- **Drag a board.** Press a board and move the mouse a little (more than 6 dots). It lifts, turns side-on and its edge goes blue. Every other board turns side-on and slides over to open a gap. A short blue mark under the floor shows the gap, and the caption under the rack clears while you carry. Let go and the board drops into the gap, turns to show its outline, and the caption comes back under it. The pill says "Moved {name}. The rack keeps your order." and the new order is saved in the background.
- **Into another row.** With a big quiver in several rows, carry a board down or up and it lands in that row.
- **A click is still a click.** A press that hardly moves opens the board, as before.
- **Changed your mind.** Escape, or the computer taking the mouse away (switching windows), puts the board back where it was and nothing is said. Dropping it where it started does nothing.
- **The ⋯ menu.** On a computer it now reads Move left, Move right, a thin line, then Rename, Duplicate and Delete as before. A move that can't happen is greyed out but stays in its place. That means Move left on the first board (or the first saved board behind the unsaved one), and Move right on the last. The board stays turned after a move and the menu closes.
- **The keyboard.** Tab reaches the rack once, on the turned board. The left and right arrows go to the next board and turn it at once, carrying on from the end of one row to the start of the next. Up and down go to the nearest board in the row above or below. Home and End go to the ends, and Enter opens the board. Alt with an arrow moves the focused board one place, and the focus stays on it. A browser's own Alt + left (Back, on Windows) is stopped, so the page never leaves.
- **What a screen reader hears.** The rack is a group called "Boards in your rack", with the instructions read out. Every move is spoken: "Moved…", "… is already first.", "… is already last." and "The unsaved board stays first until it's saved".
- **The unsaved board.** It can't be dragged, moved from a menu or moved with Alt + arrow, and the pill says why. A board dragged to its left lands right behind it.
- **While a ⋯ menu is open** the rack holds still. Moving the mouse over other boards turns nothing.
- **Phones and iPads.** The ⋯ menu is unchanged (Rename, Duplicate, Delete) while D-11's switch is off. With the switch on it gains Move left and Move right. An iPad with a keyboard can use Alt + arrow on the focused board, which also stays in the middle.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Drag a board along the rack with the mouse, end to end | d95b86b | hover-rack.tsx, board-rack.tsx, board-rack.spec.ts |
| 2 | Move one place from ⋯ or Alt + arrow; walk the whole rack by keyboard | 0ad81dc | rack-card-menu.tsx, rack-caption.tsx, hover-rack.tsx, swipe-rack.tsx, board-rack.tsx |
| 3 | Prove every computer move, the keyboard map and the phone menu's rows | 80285a4 | board-rack.spec.ts, board-rack-phone.spec.ts |

The tracer gate ran as an autonomous check (no human-verify stops in this wave). The tracer's own `<verify>` passed end to end before any expansion task started: all 14 desktop cases, the earlier case 12 included.

## Implementation notes

- **One move path.** A drag calls `onMove(key, toRackIndex)`, which is 15-09's `handleMove` (`moveInOrder` and `rackIndexToSavedIndex`). ⋯ and Alt + arrow call `handleMoveOneStep(key, direction)`, which uses `moveOneStep(savedIdsInOrder(rackEntries), ...)`. Both commit through `useRackOrder` and speak through `useRackStatus`, so there is one ordering rule and one saver.
- **The carry, frame by frame.** `Press` holds the press until `hoverPressOutcome` says `drag`. `Carry` holds the pointer's grab offset from the board's slot and its row's floor, so the board follows the pointer exactly in both directions. The room the board had opened closes over 200 ms, as on the phone. The landing place is `hoverSlotAt` over the whole rack, at the board's centre and the pointer's height. It is clamped to the rack's ends and never placed in front of the unsaved board. The order is redrawn around it (`viewKeys`), and each board's place slides over `SLOT_SLIDE_MS`. A dropped board descends from where it was drawn to its slot over `DROP_MS`. The carried board is left out of the room-making, so its place is the one-slot gap and the room rule from the orchestrator's fix is otherwise unchanged. The drop mark sits at that gap, 7 dots under the target row's floor.
- **Clicks after a drag** are swallowed for 500 ms, as on the phone. A drag that ends where it started, a cancel, or the unsaved board's refusal never opens a board.
- **Rows.** Each board's path and words are now drawn on a floor at 0, and the group's `transform` puts the board on its row. The button's `top` is written by the frame loop too. That is what lets a board slide between places and be carried into another row without redrawing its outline.
- **Focus after a keyboard move.** React moves the button in the page when the order changes, and a moved button can lose the focus. Both racks keep the moved board's key and put the focus back on it after the redraw.
- **The ⋯ menu's open state** comes from Base UI's `onOpenChange` through `RackCaption.onMenuOpenChange` and is held in `BoardRack.menuOpen`. That flag freezes the rack the same way the dialogs do.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The test helper for resting on a board waited for the wrong signal**
- **Found during:** Task 3 (case m14 failed three times out of three)
- **Issue:** A cursor exactly on a slot's centre turns that board all the way to 90 degrees while it is still moving, before the rack has rested on it. The helper read "turned" as "rested" and pressed too early. The rack was therefore still turned to board 1, and Escape correctly put board 1 back as the turned board.
- **Fix:** The helper (`restOnPlace`) now waits for the caption to move under the board, which only happens once the rack has rested. No assertion was weakened.
- **Files modified:** e2e/board-rack.spec.ts
- **Commit:** 80285a4

**2. [Rule 1 - Bug] A row check read a board mid-landing**
- **Found during:** Task 3 (case m15)
- **Issue:** The check that a board carried into row 2 stands level with that row was read during the 120 ms descent (2 dots high).
- **Fix:** The check waits for the landing (`expect.poll`).
- **Files modified:** e2e/board-rack.spec.ts
- **Commit:** 80285a4

### Other deviations

- **Case numbers.** The plan's desktop cases 12-22 would have collided with the existing case 12 ("no word ever crosses a board"), which this plan had to keep green. They are numbered `m12`-`m22` instead, with the same meaning as in the plan. There is one extra case, `m18a`, for ↑ / ↓ and for crossing a row end with the arrows on a two-row rack. The phone cases are `19p`, `20p` and `21p`, as the plan named them.
- **"Inert" while a menu or dialog is open** is behaviour, not the HTML attribute: the rack's pointer and key handlers do nothing while `frozen` is set. The attribute was left off because a delete hands the focus to the next board while its dialog is still closing, and the focus can't land on an inert button. Base UI's modal menu and dialogs already shut out the rest of the page for a screen reader.
- **A plain-clock helper.** The React lint rule refuses `performance.now()` written inside the component. The pointer handlers read it through a small module function, `nowMs()`, which is the same clock the frame loop uses.

## Verification

- `npx next typegen && npx tsc --noEmit`, `npm run lint`: clean.
- `npx vitest run components/setup lib/models`: 12 files, 232 tests passed.
- `IS_WEBPACK_TEST=1 PW_PORT=3127 npx playwright test e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts e2e/phone-home.spec.ts e2e/old-safari-buttons.spec.ts e2e/keyboard-focus.spec.ts` on all three projects: 113 passed, 120 skipped by project or by switch, and 1 failed (m15's mid-landing read, fixed above). After the fix, `e2e/board-rack.spec.ts --project=desktop`: 25 passed, including case 12 (no word crosses a board), m12-m22 and m18a.
- Skipped for their stated reason: `20p` (D-11's switch is off). It was not run with the switch on, because `components/setup/rack-config.ts` is outside this plan's files.
- Acceptance greps: `setPointerCapture` 2, `hoverPressOutcome(` 1, `data-drop-mark` 1, `RACK_COPY.hoverInstructions` 1, `preventDefault` 3 (hover-rack.tsx); `Menu.Separator` 1 and `RACK_COPY.moveLeft|moveRight` 2 (rack-card-menu.tsx); `movesOffered(` 1 (rack-caption.tsx); `moveOneStep(` 1 (board-rack.tsx); `Alt+ArrowRight` 2 and `reducedMotion` 2 (board-rack.spec.ts).

## Threat register follow-through

- **T-15-31 (a forged order):** unchanged. Every move goes through 15-04's `saveRackOrder`, which filters to the caller's own boards.
- **T-15-32 (Alt + ← going Back mid-move):** `preventDefault()` runs on Alt + ← / Alt + → whenever a board button on either rack has the focus. Proven only in Playwright's Chromium on macOS, where m18 finishes on the practice rack's address. UI-SPEC open item 3's real Chrome and Firefox check on Windows or Linux is still owed. It needs a person at those machines and is left for the founder's device pass.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: components/setup/hover-rack.tsx, components/setup/board-rack.tsx, components/setup/rack-card-menu.tsx, components/setup/rack-caption.tsx, components/setup/swipe-rack.tsx, e2e/board-rack.spec.ts, e2e/board-rack-phone.spec.ts
- FOUND: d95b86b, 0ad81dc, 80285a4
