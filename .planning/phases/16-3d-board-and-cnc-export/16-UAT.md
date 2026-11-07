---
status: complete
phase: 16-3d-board-and-cnc-export
source: [16-VERIFICATION.md]
started: 2026-11-06T23:40:00Z
updated: 2026-11-07T07:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. R8 - open the exported zip's files in Shape3D (Scan import: the .dxf as a Board with the board unit set to mm, then one slice file as a Slice, the outline file as an Outline, the .stl as a scan)
expected: Shape3D accepts each file, with the tail at x = 0, the deck up and the length in millimetres, and fits its own curves to it
result: skipped
reason: The founder shipped without it, "shape3d I'll have to come back to" (2026-11-06). The Export button says the export is experimental and Shape3D may or may not import the files yet. The file layout is now live unverified.

### 2. Mac Safari trackpad pinch on the live 3D screen
expected: A two-finger pinch zooms toward the pinch point, and the page itself never zooms
result: pass

### 3. One of the founder's own saved boards on the live 3D screen, signed in
expected: The board draws as a closed solid, and the litres on the board's own screens match the new figure in the 16-13 surface report
result: pass

### 4. The room as shipped on a real iPhone and iPad
expected: The theme room, the Room icon's three steps and the room filling the viewer all work by hand
result: pass

## Summary

total: 4
passed: 3
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

No gaps. Test 1 is open by the founder's decision and tracked in a todo. Tests 2 and 3 passed by his hand, the founder, 2026-11-06: "only the shape3D is still open.  the other 2 passed."
