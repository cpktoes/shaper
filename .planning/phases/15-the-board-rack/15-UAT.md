---
status: testing
phase: 15-the-board-rack
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md, 15-05-SUMMARY.md, 15-06-SUMMARY.md, 15-07-SUMMARY.md, 15-08-SUMMARY.md, 15-09-SUMMARY.md, 15-10-SUMMARY.md, 15-11-SUMMARY.md, 15-12-SUMMARY.md, 15-13-SUMMARY.md]
started: 2026-10-06T16:20:00Z
updated: 2026-10-06T16:20:00Z
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

number: 1
name: Your own boards on the rack — a move kept after a reload and on a second device
expected: |
  Signed in, your saved boards stand on the rack in the stored order (newest first until you move one). Move a
  board, reload: the move is kept. Open the home page on a second device: the same order (R8).
awaiting: user response

## Tests

### 1. Your own boards on the rack — a move kept after a reload and on a second device
expected: Signed in on the live site, your saved boards stand on the rack in the stored order; move one, reload — the move is kept; open the home page on a second device — the same order shows (R8).
result: [pending]

### 2. Move a board, Open This Board, then Back
expected: Coming back by the browser's Back button (or swiping back on a phone), the rack shows the moved order, not the old one (the CR-01 fix on real saved boards).
result: [pending]

### 3. Duplicate a board straight after moving a board
expected: The copy stands right beside its original, and the move you just made is still there (D-02, D-16, WR-01).
result: [pending]

### 4. Delete the board that is turned
expected: After the delete, the turn and the keyboard focus pass to the next board (or the previous one if the deleted board was last) (WR-02).
result: [pending]

### 5. VoiceOver on an iPhone: swipe through the rack
expected: Each board reads its full name, its card line and "board N of M" (UI-SPEC open item 4; the walk's look C).
result: [pending]

### 6. Alt + left arrow on a focused board in real Chrome and Firefox on Windows or Linux
expected: The board moves one place and the browser does NOT go Back (UI-SPEC open item 3, T-15-32; the walk's look D — only Playwright's Chromium on macOS has proven it, where Alt + ← is not the Back shortcut).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
