---
status: testing
phase: 04-rocker-foil-editors
source: [04-VERIFICATION.md]
started: 2026-08-29T23:30:00Z
updated: 2026-08-29T23:30:00Z
---

## Current Test

number: 1
name: Rocker and thickness sliders redraw the side profile live
expected: |
  Open /design/rocker and move the four rocker sliders and five thickness sliders one at a
  time. The drawn side profile (bottom curve = rocker, deck curve = rocker + thickness)
  redraws immediately on each move, with no reload or lag.
awaiting: user response

## Tests

### 1. Rocker and thickness sliders redraw the side profile live
expected: Open /design/rocker and move the four rocker sliders and five thickness sliders one at a time. The drawn side profile (bottom curve = rocker, deck curve = rocker + thickness) redraws immediately on each move, with no reload or lag.
result: [pending]

### 2. Datasheet typed entry parses, rejects, and understands feet-inches
expected: On /design/rocker's DATASHEET tab, type "2 5/8", "banana", and "6'2" into different cells. "2 5/8" commits and reprints as 2 5/8"; "banana" shows a plain-English error line and reverts; 6'2 reads as 74".
result: [pending]

### 3. Dragging the curve moves the matching slider and datasheet cell
expected: Drag a construction point (rocker or deck) directly on the /design/rocker drawing, in both horizontal and rotated-vertical orientation. The curve follows the pointer; the matching sidebar slider and datasheet cell move to the identical value in real time.
result: [pending]

### 4. Thickness reaches RAILS; rocker alone never moves rail numbers
expected: Change centre thickness on /design/rocker, then open /design/rails — rail band numbers reflect the new thickness immediately. Changing only a rocker lift leaves every rail band number unchanged.
result: [pending]

### 5. RAILS link checkbox — default on, dims sliders, manual value survives flips
expected: On /design/rails, "Use Board's Rocker & Foil Thickness" is checked by default and dims the three thickness sliders. Uncheck/move/re-check/uncheck again — sliders enable when unlinked, show the shaper's own last manual value, and that manual value survives any number of link flips untouched.
result: [pending]

### 6. Volume screen moves with foil and discloses its method
expected: On /design/volume, change a thickness on /design/rocker and come back — the headline litres figure moves with the foil while importing. Toggling the Volume screen's import switches off shows the quick estimator's figure instead, and the screen says which method is in force.
result: [pending]

### 7. One litres figure on all four screens
expected: The litres shown on /design/volume, the Summary order form, a saved board's home-screen rack card, and the printed template export preview all show the identical number for the same board and move together when a thickness changes.
result: [pending]

### 8. Each preset reads as its own board type from the side
expected: Start a new board from each of the four presets (Shortboard, Fish, Mid-length, Longboard) and open /design/rocker for each. Each reads as its own board type: the Fish flatter and thicker, the Longboard with more nose lift, the Shortboard with the most rocker overall.
result: [pending]

### 9. Summary print-preview holds up at the extremes in both themes
expected: Open /design/summary and print-preview both sheets with the shortest board at maximum nose lift, and again with a 9-foot longboard, in Daylight and Slate themes. The rocker box shows the real curve and real lift values, the sheet still prints as exactly two pages, and nothing clips.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
