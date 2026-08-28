---
status: testing
phase: 02-accounts-saved-designs
source: [02-VERIFICATION.md]
started: 2026-08-28T02:10:00Z
updated: 2026-08-28T02:10:00Z
---

## Current Test

number: 1
name: An edit made during an in-flight save is never silently lost
expected: |
  Open a saved board, make an edit, and — before the nav settles to "Saved" — make a second
  edit while the first save is still in flight. The nav must not settle to "Saved" until the
  second edit is also written, and reloading must show the second edit's value.
awaiting: user response

## Tests

### 1. An edit made during an in-flight save is never silently lost
expected: Open a saved board, make an edit, and — before the nav settles to "Saved" — make a second edit while the first save is still in flight. The nav must not settle to "Saved" until the second edit is written too; after a reload the board holds the second edit's value. (CR-01 fix)
result: [pending]

### 2. Renaming the open board survives the next autosave
expected: Open a board, go to the home screen, rename that same board from its rack menu, reopen it, nudge a slider, wait for autosave. The rack must still show the new name afterwards — not the pre-rename name. (CR-02 fix)
result: [pending]

### 3. Failed autosaves back off instead of hammering
expected: With saves failing (e.g. network offline), the retry cadence visibly grows — roughly 1.2s, then longer and longer up to ~30s — instead of firing at a constant 1.2s forever. Going back online recovers to "Saved". (WR-02 fix)
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
