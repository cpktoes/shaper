---
status: complete
phase: 17-bottom-contours
source: [17-VERIFICATION.md]
started: 2026-11-11T05:29:57Z
updated: 2026-11-11T05:50:18Z
---

## Current Test

[testing complete]

## Tests

All on the live site, https://www.shaperassistant.com.

### 1. The bottom seen from above
expected: Pick a cut in NOSE, CENTER and TAIL. A faint shade, darker where deeper, with a fine line at every 1/16" of depth and the pencil lines you'd rule. The dash-dot cutting line has a dot you can drag, and tapping the board moves the section.
result: pass

### 2. The cross-section and its gauge numbers
expected: Slide the section along the board. The slab, the dashed straightedge, the cut above it, and numbers at the stringer, each rail, a double's trough and a channel's floor. No label reads 0". Height x1/x2/x4/x8 changes the stretch and says which one is on.
result: pass

### 3. Channels
expected: Try 4, 6 and 8; Parallel, With the rail and Toe-in; Longest and Stagger; the Angle slider. One sawtooth out from the stringer, walls fanning gently on With the rail and never meeting at a point. The last wall's distance off the rail is read out, and a set that is too wide is squeezed and says so.
result: pass

### 4. The GUIDE tab on two boards (e.g. Shortboard and Fish)
expected: Nineteen cards, each a cartoon on the open board, two sentences and a dashed-rule How to shape note. Cuts on your board are tagged "On this board", and switching boards redraws the cartoons. The words are first drafts for your pen.
result: pass

### 5. Litres with and without a cut
expected: On VOLUME, a Deep Single Concave drops the litres by exactly DATA's first-line Foam off. An all-flat board shows exactly its old litres.
result: issue
reported: "The volume input should say that it takes into account the finished rail shape and bottom contours"
severity: minor
note: a wording request on the VOLUME page; the litres arithmetic itself was not reported wrong

### 6. RAILS on a Rolled Vee or Continuous Belly
expected: Rail thickness reads less than the planed figure by the rail lift (the Longboard's belly by up to about 24 mm).
result: issue
reported: "pass, but the finished rail messes with channel shape. We need to make sure that the channels are kept, the finished rail shoudl not round them."
severity: major
note: the rail-thickness-less-the-lift reading passed; the issue is the finished rail rounding the channels

### 7. FINS with a tail cut
expected: Press the contour icon: the contour shows under the fins. Move the fins: a tail cut's Deepest At and the channels' Start and Deepest At move with them.
result: pass

### 8. 3D and the CNC files on a board with a cut and channels
expected: The underside shows the contour with real vertical channel walls. The STL loads in the CNC program as one closed solid (Shape3D's own Phase 16 test is separate).
result: skipped
reason: "no, we're working on swapping this export to a .brd file" — the CNC export is being replaced by a .brd file (quick 261110-tvk, in a parallel session); the 3D view's underside was not looked at in this walk-through

### 9. Printing
expected: A cut board's Summary order form prints a third BOTTOM CONTOURS page and the Overview Sheet one line per cut. A flat board prints exactly its two pages; the full-size template and Paper Saver show no contour. The iPhone print too.
result: pass

### 10. A real phone, upright then sideways
expected: Upright: the drawing stays pinned, the NOSE/CENTER/TAIL switch and controls scroll beneath, controls finger-sized, the page never scrolls as a whole. Sideways: the thin bar and the desktop layout with controls beside the board.
result: pass

### 11. Imperial and Metric
expected: On BOTTOM and DATA, Metric marks read in whole millimetres and dims in centimetres to one decimal; litres read the same.
result: pass

## Summary

total: 11
passed: 8
issues: 2
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-17-5
  truth: "On VOLUME the shaper can tell what the litres take into account, the finished rail shape and the bottom contours included"
  status: failed
  reason: "User reported: The volume input should say that it takes into account the finished rail shape and bottom contours"
  severity: minor
  test: 5
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis

- gap_id: G-17-6
  truth: "Channels keep their own shape all the way to the rail: the finished rail never rounds them off"
  status: failed
  reason: "User reported: pass, but the finished rail messes with channel shape. We need to make sure that the channels are kept, the finished rail shoudl not round them."
  severity: major
  test: 6
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
