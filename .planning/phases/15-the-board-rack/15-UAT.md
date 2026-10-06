---
status: complete
phase: 15-the-board-rack
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md, 15-05-SUMMARY.md, 15-06-SUMMARY.md, 15-07-SUMMARY.md, 15-08-SUMMARY.md, 15-09-SUMMARY.md, 15-10-SUMMARY.md, 15-11-SUMMARY.md, 15-12-SUMMARY.md, 15-13-SUMMARY.md]
started: 2026-10-06T16:20:00Z
updated: 2026-10-06T16:50:00Z
---

# Phase 15 — The Board Rack — human verification

The six checks `15-VERIFICATION.md` left for a person (no test signs in or touches the live database; speech
and other operating systems' browsers can't be driven by Playwright). All six are made **signed in on the live
site, www.shaperassistant.com, with the founder's own saved boards**, as part of the rehearsal walk
(`13-UAT.md`, 18 steps + "Phase 15's looks") before the Wednesday 2026-10-07 evening freeze. Everything else in the
phase is verified by the gate on the shipped code (vitest 4,375; the full browser suite 829 / 0; the production
checks 18) and by the live check recorded in `15-13-SUMMARY.md`.

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 6
name: all six answered by the founder on the live site, 2026-10-06 (signed in, their own boards, Chrome on a Mac, an iPhone)
awaiting: nothing — the walk is done

## Tests

### 1. Your own boards on the rack — a move kept after a reload and on a second device
expected: Signed in on the live site, your saved boards stand on the rack in the stored order; move one, reload — the move is kept; open the home page on a second device — the same order shows (R8).
result: pass

### 2. Move a board, Open This Board, then Back
expected: Coming back by the browser's Back button (or swiping back on a phone), the rack shows the moved order, not the old one (the CR-01 fix on real saved boards).
result: pass

### 3. Duplicate a board straight after moving a board
expected: The copy stands right beside its original, and the move you just made is still there (D-02, D-16, WR-01).
result: pass

### 4. Delete the board that is turned
expected: After the delete, the turn and the keyboard focus pass to the next board (or the previous one if the deleted board was last) (WR-02).
result: pass

### 5. VoiceOver on an iPhone: swipe through the rack
expected: Each board reads its full name, its card line and "board N of M" (UI-SPEC open item 4; the walk's look C).
result: pass

### 6. Alt + left arrow on a focused board in real Chrome and Firefox on Windows or Linux
expected: The board moves one place and the browser does NOT go Back (UI-SPEC open item 3, T-15-32; the walk's look D — only Playwright's Chromium on macOS has proven it, where Alt + ← is not the Back shortcut).
result: pass
reported: "6 doesn't work" — then, on Tabbing to the board first: "ah, used tab, now it works." (Chrome on a Mac, Option + → on the focused board)
notes: |
  The founder's first try pointed at a board with the mouse, which turns it but gives it no keyboard focus, so the
  keys found nothing to move — a friendliness gap, not a fault: the design (UI-SPEC §11) moves the FOCUSED board.
  The founder chose to leave it for after the showing; filed as a todo (make Option/Alt + arrow move the turned board
  under the mouse too). The orchestrator also proved the path on the practice rack in Chromium and WebKit: Tab
  reaches the rack, Alt/Option + → moves the focused board one place and keeps the focus, a pointed-at board stays.
  The Windows/Linux part (Alt + ← must not go Back): no such machine to hand — blocked_by: physical-device; both racks
  call preventDefault on Alt + ←/→, the instruction that stops that browser shortcut.

## Summary

total: 6
passed: 6
issues: 0
follow-ups: 1 (Option/Alt + arrow on a pointed-at board — a todo for after the showing, the founder's choice)
