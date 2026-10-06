---
created: 2026-10-06T16:55:00Z
title: Option/Alt + arrow should also move the turned board under the mouse
area: home page — the Board Rack (hover rack)
severity: minor
files: [components/setup/hover-rack.tsx, components/setup/board-rack.tsx, e2e/board-rack.spec.ts, .planning/phases/15-the-board-rack/15-UI-SPEC.md]
---

## Problem

Found by the founder on the live site during Phase 15's rehearsal walk (2026-10-06, UAT check 6). On the
computer's Board Rack, Option/Alt + ← / → moves the board that has the **keyboard focus** (reached with Tab) —
the keyboard-user path UI-SPEC §11 designed. A sighted mouse user who reads "Alt with an arrow key moves it"
points at a board (which turns it) and presses the keys, and nothing happens, because a pointed-at board has no
focus and the rack's key handler (on the rack's group) never receives the keystroke. The founder's words: "6
doesn't work" → "ah, used tab, now it works."

Not a fault — mouse users have the drag and ⋯ → Move left / Move right — but a friendliness gap. The founder
chose to leave it for after the Oct 10 showing (Wed 2026-10-07 evening freeze).

## Suggested fix

While the pointer is over the rack's drawing (the hover rack only; a phone has no modifier keys), listen for
Alt + ← / → on `window` and, when no board button inside the rack has the focus, move the **turned** board
(the one resting under the cursor — `turnedKey`) one place through the same `handleMoveOneStep` path, with the
same `preventDefault`, the same pill and the same save. Then give that board the focus so the next arrow press
walks from it. Keep the focused-board behaviour exactly as it is. Add a desktop e2e case: point at board 4, press
Alt + →, board 4 is at place 5 and the pill says "Moved …"; and the existing m-cases must stay green. Update
UI-SPEC §11's keyboard table with the one new row.
