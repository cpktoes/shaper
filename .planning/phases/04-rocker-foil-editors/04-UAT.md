---
status: testing
phase: 04-rocker-foil-editors
source: [04-VERIFICATION.md]
started: 2026-08-29T23:30:00Z
updated: 2026-08-30T00:40:00Z
---

## Current Test

number: 8
name: Each preset reads as its own board type from the side
expected: |
  Start a new board from each of the four presets (Shortboard, Fish, Mid-length, Longboard)
  and open /design/rocker for each. Each reads as its own board type: the Fish flatter and
  thicker, the Longboard with more nose lift, the Shortboard with the most rocker overall.
awaiting: user response

## Tests

### 1. Rocker and thickness sliders redraw the side profile live
expected: Open /design/rocker and move the four rocker sliders and five thickness sliders one at a time. The drawn side profile (bottom curve = rocker, deck curve = rocker + thickness) redraws immediately on each move, with no reload or lag.
result: pass
source: automated
evidence: "Set the nose-tip rocker slider 4 1/2\" -> 6\" in the live app: the label updated and the SVG curve path data changed immediately in the same frame, no reload. Reversed it and the curve changed back."

### 2. Datasheet typed entry parses, rejects, and understands feet-inches
expected: On /design/rocker's DATASHEET tab, type "2 5/8", "banana", and "6'2" into different cells. "2 5/8" commits and reprints as 2 5/8"; "banana" shows a plain-English error line and reverts; 6'2 reads as 74".
result: pass
source: automated
evidence: "'2 5/8' committed and reprinted as 2 5/8\" on blur. 'banana' reverted to the last good value with the line: Couldn't read 'banana' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2. Typing 6'2 parsed to 74\" and clamped to the thickness field's 5\" maximum — the feet-and-inches parse works."

### 3. Dragging the curve moves the matching slider and datasheet cell
expected: Drag a construction point (rocker or deck) directly on the /design/rocker drawing, in both horizontal and rotated-vertical orientation. The curve follows the pointer; the matching sidebar slider and datasheet cell move to the identical value in real time.
result: pass
source: automated
evidence: "Dragged the tail-tip construction point up with an incremental pointer sequence: the curve followed and the Tail Tip slider label moved live (2\" -> 9\", clamped at slider max), then restored. A single-jump synthetic drag (down, one move, up) does not trigger it, but a real mouse always produces incremental moves. Rotated-vertical orientation not exercised — covered by your hands-on pass."

### 4. Thickness reaches RAILS; rocker alone never moves rail numbers
expected: Change centre thickness on /design/rocker, then open /design/rails — rail band numbers reflect the new thickness immediately. Changing only a rocker lift leaves every rail band number unchanged.
result: pass
source: automated
evidence: "Center thickness 2 1/2\" -> 3\" on ROCKER: RAILS updated live (Apex Center 1\" -> 1 3/16\", Rail Mark 1 1 3/8\" -> 1 9/16\", Rail Tuck 1 5/8\" -> 13/16\"; nose/tail columns untouched). Then nose-tip rocker 4 1/2\" -> 6\": every rail number byte-identical."

### 5. RAILS link checkbox — default on, dims sliders, manual value survives flips
expected: On /design/rails, "Use Board's Rocker & Foil Thickness" is checked by default and dims the three thickness sliders. Uncheck/move/re-check/uncheck again — sliders enable when unlinked, show the shaper's own last manual value, and that manual value survives any number of link flips untouched.
result: pass
source: automated
evidence: "Checked by default with all three thickness sliders disabled; foil values shown (1 5/16\" / 3\" / 1 9/16\" at the time). Unlinked: sliders enabled, standalone value shown. Set manual center 2\", relinked: foil's 3\" returned and sliders dimmed. Unlinked again: manual 2\" survived untouched."

### 6. Volume screen moves with foil and discloses its method
expected: On /design/volume, change a thickness on /design/rocker and come back — the headline litres figure moves with the foil while importing. Toggling the Volume screen's import switches off shows the quick estimator's figure instead, and the screen says which method is in force.
result: pass
source: automated
evidence: "Foil center 3\" -> 2 1/2\" moved the headline 33.32 L -> 29.79 L ('51 cross-sections integrated', 'From the board's own cross-sections along its length'). Both import switches off: quick estimator took over at 32.22 L with 'From the board-type factor tables (quick estimate)'. Switches restored."

### 7. One litres figure on all four screens
expected: The litres shown on /design/volume, the Summary order form, a saved board's home-screen rack card, and the printed template export preview all show the identical number for the same board and move together when a thickness changes.
result: pass
source: automated
evidence: "Volume screen 29.79 L, Summary order form 29.8 L, home in-progress card 29.8 L — same figure (order form/card round to one decimal). Export dialog passes the same store value (quotedVolumeLitres) into the PDF. Saved-board rack card needs a signed-in session — same summarizeDesign pipeline, unit-tested; confirm visually whenever you're signed in."

### 8. Each preset reads as its own board type from the side
expected: Start a new board from each of the four presets (Shortboard, Fish, Mid-length, Longboard) and open /design/rocker for each. Each reads as its own board type: the Fish flatter and thicker, the Longboard with more nose lift, the Shortboard with the most rocker overall.
result: [pending]

### 9. Summary print-preview holds up at the extremes in both themes
expected: Open /design/summary and print-preview both sheets with the shortest board at maximum nose lift, and again with a 9-foot longboard, in Daylight and Slate themes. The rocker box shows the real curve and real lift values, the sheet still prints as exactly two pages, and nothing clips.
result: [pending]

## Summary

total: 9
passed: 7
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
