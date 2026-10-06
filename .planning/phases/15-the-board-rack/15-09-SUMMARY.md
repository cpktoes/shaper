---
phase: 15-the-board-rack
plan: 09
subsystem: home page, Board Rack (phone and iPad)
tags: [board-rack, hold-to-move, touch, rack-order, status-pill, live-region]
status: complete
requires:
  - 15-02 (HOLD_MS, swipePressOutcome, swellScale, edgeScrollStep, tween, CARRY_LIFT, DROP_MARK_WIDTH, swipeSlotAt)
  - 15-03 (createRackOrderSaver, moveInOrder, rackIndexToSavedIndex, savedIdsInOrder, RACK_COPY, holdToMoveEnabled, PHONE_MOVE_VIA_MENU)
  - 15-04 (saveRackOrder)
  - 15-07 (SwipeRack, data-rack-slot, swipeSlotFor)
  - 15-08 (the stored order reaching the page as rackOrder)
provides:
  - useRackOrder (components/setup/use-rack-order.ts): the order shown at once and saved in the background
  - useRackStatus / RackStatus (components/setup/rack-status.tsx): the status pill and the rack's one live region
  - BoardRack.handleMove(key, toRackIndex) -> "moved" | "same" | "refused"
  - SwipeRack props onMove, holdEnabled, onCarry; RackCaption prop carrying
  - DOM hooks data-carrying, data-drop-mark, data-rack-status, data-rack-carrying
affects:
  - 15-10 (the founder's iPad and Android try-out, which decides D-11)
  - 15-11 (the computer's moves reuse useRackOrder, useRackStatus, RackStatus and handleMove)
tech-stack:
  added: []
  patterns:
    - per-frame carry state in refs; one non-passive touchmove listener registered at mount
    - the track glides to a dropped board's place in the frame loop, never through native smooth scroll
    - local order kept against the server order it was made from (adjusted while rendering)
key-files:
  created:
    - components/setup/use-rack-order.ts
    - components/setup/rack-status.tsx
  modified:
    - components/setup/swipe-rack.tsx
    - components/setup/board-rack.tsx
    - components/setup/rack-caption.tsx
    - e2e/board-rack-phone.spec.ts
decisions:
  - "After a drop the rack glides itself to the dropped board's slot (200 ms, instant with reduced motion) instead of a native smooth scroll, which Chromium skipped at the end of a touch"
  - "When the pill's usual place would cover a caption control (an iPhone page), it stands in the empty band between the rack's floor and the caption instead"
  - "The unsaved board never swells under a hold; it never lifts, so it shows no sign of lifting"
  - "The tap that ends a hold, a carry, or the unsaved board's refusal never opens or centres a board"
metrics:
  duration: ~60 min
  completed: 2026-10-06
  tasks: 3
  files: 6
actuals:
  tokens: 19900
  tasks: 3
  commits: 4
---

# Phase 15 Plan 09: Hold a board, slide it and let go on a phone or iPad

On a phone or iPad, a shaper can now hold a board until it lifts, slide it along the rack and let go. The rack shows the new order straight away and saves it to their account in the background. A small pill at the bottom says "Moved {name}. The rack keeps your order." A quick swipe still only scrolls the rack. Carrying a board near the screen's edge scrolls the rack along with it. The unsaved board can't be moved, and nothing can go in front of it.

## What changed, for a shaper

- **Hold, slide, let go.** Hold a board still. After a moment it swells a little, then lifts 12 dots and its edge turns accent blue. From then on it follows your finger exactly. Every other board turns side-on and slides aside to open a gap, and a short blue mark under the floor shows where the board will land. Let go and it drops there, the rack glides so the board is in the middle, and it turns to show its outline.
- **A quick swipe is still a swipe.** If your finger moves more than 8 dots before the hold completes, the rack just scrolls and nothing lifts.
- **The edge scrolls.** Carry a board within 46 dots of the left or right edge and the rack scrolls with you. The nearer the edge, the faster it goes, so a board can cross a 30-board rack in one carry.
- **What you're carrying.** While a board is carried, the caption under the rack reads "Moving {name}. Let go where you want it." The caption comes back when you let go.
- **It saves, and says so.** The new order shows straight away and is saved to your account in the background. Several moves in a row are saved once. The first move fixes the order from then on. If the save fails, the board goes back to where it was and the pill says "Couldn't save the new order — try again."
- **The unsaved board stays first.** Holding it never lifts it, and the pill says "The unsaved board stays first until it's saved". A board carried to its left lands right behind it, and the drop mark shows that place.
- **Safe to let go of.** If the phone takes the touch away (a call, a system gesture), the board goes back where it was and nothing is said. Lifting your finger after a hold never opens a board.
- **Rename, Duplicate and Delete.** A move still waiting to be saved goes out first. Screen readers hear "Duplicated {name}. The copy stands next to it.", "Deleted {name}." and a failed duplicate. After a delete, the next board turns and takes the focus.
- **D-11's switch.** With `PHONE_MOVE_VIA_MENU` set to true, none of this runs: no hold, no swell, and the hint reads `tap ⋯ to move`. I checked this by flipping the switch locally, running the move cases and then putting it back. The switch was not committed changed.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Hold, slide and let go, end to end; the order shows at once, saves and says so | 18ee7cd | use-rack-order.ts, rack-status.tsx, board-rack.tsx, swipe-rack.tsx, board-rack-phone.spec.ts |
| 2 | The swell, edge scrolling, the carrying line, flush before actions, spoken messages | 92e2232 | swipe-rack.tsx, rack-caption.tsx, board-rack.tsx, board-rack-phone.spec.ts |
| 3 | Real-touch proofs (swipe, unsaved board, edge, cancel, switch on, live region) and the pill kept off Open This Board | ac9308a | board-rack-phone.spec.ts, rack-status.tsx, board-rack.tsx |

## Implementation notes

- **`useRackOrder(serverOrder, onSaveFailed)`** keeps `{ basis, ids }`, where `basis` is the JSON of the server order the local order was made against. A different server order replaces the local one during render. The saver (`createRackOrderSaver`, saving through `saveRackOrder`) is created in an effect keyed on `basis`. That effect's cleanup flushes and then disposes it, so StrictMode's second mount gets a fresh saver. `pagehide` also flushes. A failure restores `revertTo` (or the automatic order) and calls `onSaveFailed`.
- **`useRackStatus()` / `RackStatus`.** The status region is one element with `role="status"`, `aria-live="polite"` and `aria-atomic="true"`. It is always in the DOM, empty when idle, and never focusable.
  - Visible messages draw as the pill. The fades (120 ms in, 4 s hold, 200 ms out) use the Web Animations API and are skipped under reduced motion.
  - Spoken-only messages stay in the region but are clipped out of sight (`sr-only`), never `visibility: hidden`.
  - Each message is a new keyed text node, so the same words twice are spoken twice.
  - Beyond the planned shape, the hook also exposes `fading` and `serial`, and `RackStatus` takes optional `fading`, `serial` and `avoid` props. 15-11 can ignore all of them.
- **Hold and slide in `swipe-rack.tsx`.** All per-frame state is in refs: `press`, `carry`, `landing`, `viewKeys`, `base` (slides), `glide`, `snapOff` and `suppressClickUntil`. Nothing per-frame is React state.
  - **Following the finger.** A board's `pointerdown` starts the press. Pointer events on the window track it. Each frame runs `swipePressOutcome(elapsed, moved, holdEnabled)`.
  - **Placement.** The carried board's place is its resting slot plus how far the finger has moved along the track (`swipeSlotAt`). It is clamped behind the unsaved board. The room a turned board had opened closes over 200 ms as the others close.
  - **Slots.** Every placement uses the measured slot (`data-rack-slot`, which is 42 on the android profile), never the bare constant.
  - **Page scrolling.** There is one non-passive `touchmove` listener (registered at mount, cancelling only while carrying), plus `touchcancel`, `contextmenu` and window `pointerup`/`pointercancel`/`blur` listeners. Every exit ends the carry and turns snap back on (T-15-28).
- **`BoardRack.handleMove`** refuses the unsaved board with `unsavedStaysFirst`. Otherwise it runs `moveInOrder(savedIdsInOrder(…), key, rackIndexToSavedIndex(…))`: "same" when nothing changed, else it commits, announces `moved(name)` and returns "moved". `holdEnabled={holdToMoveEnabled(kind)}` is the only place the D-11 switch is read.

## Verification

- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean, no warnings.
- `npx vitest run lib/models components/setup lib/geometry`: 2905 passed. The rack-room no-crossing checks are unchanged and green.
- `IS_WEBPACK_TEST=1 PW_PORT=3125 npx playwright test e2e/board-rack-phone.spec.ts e2e/phone-home.spec.ts e2e/old-safari-buttons.spec.ts e2e/board-rack.spec.ts`: **97 passed, 86 skipped, 0 failed** on desktop, iphone and android (4.8 min).
  - **Phone spec on android:** every hold-and-slide case passed (13–17 and 20). Case 18 was skipped while the switch is off.
  - **Switch on:** with `PHONE_MOVE_VIA_MENU = true` locally, case 18 passed and 13–17 and 20 were skipped.
- Acceptance greps:
  - outside comments, `passive: false`: 1, and `addEventListener("touchmove"`: 1
  - `role="status"`: 1, and `aria-live="polite"`: 1
  - `saveRackOrder`: 3, and `createRackOrderSaver`: 3
  - `holdToMoveEnabled(` outside comments: 1
  - `swellScale(`: 1, and `edgeScrollStep(`: 1
  - carrying prefix/suffix: 2
  - `flush()`: 3
  - deleted/duplicated: 2
  - `PHONE_MOVE_VIA_MENU` in the spec: 8
- **E09 on an iPhone-sized page (390 x 664, case 20):**
  - Open This Board's tap box runs from 598.6 to 642.6.
  - The pill's usual place, 24 above the bottom, would run from 615.2 to 640.0. That sits right on Open This Board.
  - So the pill stands in the empty band under the rack's floor instead, from 469.4 to 494.2. That leaves 3.6 dots below the floor line and 3.6 dots above the caption's first line, and no caption control is covered.
  - The cause is the known open item: the phone caption is taller than UI-SPEC's 118-dot block. If the founder trims the caption in 15-10, the pill goes back to its usual place on its own, because it only moves when it would cover a control.
- **Real devices:** plan 15-10 (the founder's iPad 9th gen and an Android phone). Chromium's touch path is proven here: the lift does not start a page scroll, and a system cancel returns the board. Older Safari on the iPad is still unproven (RESEARCH Pitfall 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The track's smooth scroll after a drop was dropped by the browser**
- **Found during:** Task 2, once edge scrolling was in.
- **Issue:** `scrollTo({ behavior: "smooth" })` called from the touch's `pointerup` often never ran in Chromium. The 120 ms settle then fired at the old place and turned the wrong board.
- **Fix:** The frame loop now glides `scrollLeft` to the exact slot over `SETTLE_MS` (instantly with reduced motion), then settles and turns scroll snap back on. This does not depend on how a browser handles smooth scroll at the end of a touch, which matters on older Safari too.
- **Files modified:** components/setup/swipe-rack.tsx
- **Commit:** 92e2232

**2. [Rule 2 - Missing critical] The finger lifting after a hold must not count as a tap**
- **Found during:** Task 1
- **Issue:** A hold that dropped in place, or a hold on the unsaved board, could end in a `click` that opened or centred a board.
- **Fix:** That end-of-hold tap is swallowed until the finger lifts, plus 500 ms. The next `pointerdown` clears the block. Case 15 checks that holding the unsaved board opens nothing.
- **Commit:** 18ee7cd

**3. [Orchestrator ruling - E09] The pill is kept off Open This Board on an iPhone**
- **Found during:** Task 3 (case 20)
- **Fix:** `RackStatus` takes an `avoid` callback. `board-rack.tsx` passes the caption controls' boxes and the band between the swipe floor and the caption. The pill moves only when its usual place would cover a control, and never on the computer's rack, which has no scroller.
- **Files modified:** components/setup/rack-status.tsx, components/setup/board-rack.tsx
- **Commit:** ac9308a

**4. [Rule 1 - Test] Case 13 starts with the third board in the middle**
- **Issue:** On the android profile the slot is 42. From the opening position, moving the third board three slots right took the finger into the 46-dot edge zone, so the rack scrolled and the board landed further along.
- **Fix:** Case 13 taps the third board to the middle first, then holds it and slides it three places.
- **Commit:** 92e2232 (the spec change rode with Task 2, because Task 2's verify command needs it green)

### Other notes

- **Case numbers.** The plan's cases 12–18 are numbered 13–19 here, because 12 and 12a already exist (the no-word-crossing checks). Case 20 is the extra E09 measurement.
- **Commit types.** Task 3's commit is typed `test`, but it also carries the pill-placement code from deviation 3.
- **The unsaved board does not swell during a hold** (a choice the plan left open). It never lifts, so it never looks as though it will.
- **Drawing order.** A carried board is not moved to the top of the drawing order. Doing that would mean reordering nodes React owns. It passes over a neighbour only for the 110 ms it takes the gap to open. A visual backstop for 15-10.

## Known Stubs

None.

## Threat Flags

None. The only network path is `saveRackOrder` (15-04), which filters ids to the caller's own boards (T-15-26). T-15-28 is mitigated: every carry exit turns snap back on and stops the touch cancelling.

## Self-Check: PASSED

- FOUND: components/setup/use-rack-order.ts, components/setup/rack-status.tsx, components/setup/swipe-rack.tsx, components/setup/board-rack.tsx, components/setup/rack-caption.tsx, e2e/board-rack-phone.spec.ts
- FOUND commits: 18ee7cd, 92e2232, ac9308a
