---
status: diagnosed
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

## Founder Rulings

- 2026-11-10: both gaps are fixed as Phase 17 fix plans; the phase stays open until they are done, live and re-checked by him.
- 2026-11-10: VOLUME's words — the suggested sentence, as written.
- 2026-11-11: 17-17 (VOLUME's words) approved at his look.
- 2026-11-11: 17-18 (RAILS draws channel walls straight up) approved at his look. Two answers: RAILS shows the channels on a board with no vee or belly too ("Show channels too"); BOTTOM's DATA Rail lift counts the vee or belly only, matching RAILS ("Match RAILS"). Both become a further Phase 17 fix plan after 17-20.
- 2026-11-11: 17-20 (the litres, 3D board and export files cut channels straight up into the finished rail) approved at his look, with the litres table: Hard Edge tails unchanged, soft Shortboard/Mid +0.002 L, Longboard rolled rail up to +0.06 L.
- 2026-11-11: 17-21 (RAILS shows flat-tail channels; DATA Rail lift counts the vee or belly only) approved at his look. Three more answers: BOTTOM's section gauge rail lift matches DATA ("Match DATA"); DATA's note becomes "Rail lift is the vee's or belly's lift at the rail; a channel is cut after the rail is shaped and never counts." ("Use the sentence"); RAILS draws a tail concave under the channels ("Draw the concave" — supersedes D-41 for that case; band marks may move up to about 3/16"). Planned as a further fix plan.
- 2026-11-11: on 17-22's plan, two more answers: RAILS draws a concave on every section, channels or not ("Always draw it" — widens his 17-21 answer and retires D-41's "a concave changes nothing on RAILS" entirely); the 9'+ Longboard's printed tables sheet must keep all three notes with the longer DATA sentence ("Make it fit").

## Gaps

- gap_id: G-17-5
  truth: "On VOLUME the shaper can tell what the litres take into account, the finished rail shape and the bottom contours included"
  status: failed
  reason: "User reported: The volume input should say that it takes into account the finished rail shape and bottom contours"
  severity: minor
  test: 5
  root_cause: "Words only, the maths is right. VOLUME's litres already count the finished rail (both rails' blends taken off each of the 51 sections) and every bottom contour (each section raised by BOTTOM's foam off, channel walls included) — checked on all four presets. The page never says so: the INPUTS card reads 'FROM TEMPLATE AND ROCKER & FOIL' with the foot 'Rail shapes from RAILS', never naming BOTTOM or 'finished'. Also: the ESTIMATE tab's rows above the litres (template area, three thicknesses) come from the older quick estimate and do not move with a cut; and its 'checkable against a published blank's own stated volume' no longer holds on a board with a concave."
  artifacts:
    - path: "lib/geometry/imported-readout.ts"
      issue: "INPUTS card caption (line 75) and foot 'Rail shapes from RAILS' (lines 159-168) leave out BOTTOM and the finished rail — the main fix site"
    - path: "components/volume/volume-calculation-card.tsx"
      issue: "ESTIMATE tab lines 87 and 191: says 'finished cross-sections' but never the bottom; the blank-catalogue comparison is off for a cut board"
    - path: "components/guide/words/volume.ts"
      issue: "Import Designed Board card (28-32, from 18-GUIDE-WORDS.md:329-332) and Estimated Volume how-line (59) name TEMPLATE, ROCKER and RAILS but not BOTTOM"
    - path: "lib/geometry/imported-readout.test.ts, e2e/volume-fins-panels.spec.ts, e2e/imported-readout.spec.ts"
      issue: "pin the old foot; the e2e specs find the card by its caption"
  missing:
    - "INPUTS card foot reads 'Counts the finished rail shape from RAILS and the bottom contours from BOTTOM.' (the founder chose the suggested sentence, 2026-11-10)"
    - "GUIDE's Import Designed Board card names BOTTOM: 'Finish TEMPLATE, ROCKER, BOTTOM and RAILS first' (with the suggested sentence, 2026-11-10)"
    - "GUIDE words brought in line on the founder's words page first, then the code, in one change"
    - "Pinning tests updated in the same change; look at the wrap in an 820-dot window"
  debug_session: .planning/debug/volume-litres-say-what-they-include.md

- gap_id: G-17-6
  truth: "Channels keep their own shape all the way to the rail: the finished rail never rounds them off"
  status: failed
  reason: "User reported: pass, but the finished rail messes with channel shape. We need to make sure that the channels are kept, the finished rail shoudl not round them."
  severity: major
  test: 6
  picture: pictures/17-UAT-channels-cut-by-the-finished-rail.webp  # the founder's screenshot, RAILS tail section of Dex's 5'8" Twin Mod Fish
  root_cause: "Two separate faults. (1) RAILS, the place in his screenshot — drawing only: RAILS reads the bottom every 1/8\" and lays the Finished Rail's bottom as 24 straight pieces (~1/4\" each); no point lands on a channel wall, so the thick line cuts a slanted chord across every wall (up to ~90% of a wall missed) and the thin line's walls are 1/8\"-wide slopes. Does not touch the litres. Shows only where a vee or belly lifts the rail (no lift = no bottom drawn on RAILS). (2) The solid board (3D, CNC files, litres, BOTTOM's finished-rail ghost): wall corners are built only on the flat of the bottom; a wall under the rail's curved tuck is pushed out and loses its face, and the channel depth goes through the vee's lift-the-rail rule so its floor rides up the rail curve. Seen on soft tails where the outer channel runs out through the rail, and on the Longboard's rolled rail for 2 of 3 walls a side. Litres effect small: about +0.002-0.003 L Shortboard/Mid, 0 on Hard Edge tails, about +0.063 L Longboard with 6 channels."
  artifacts:
    - path: "lib/geometry/rail-bottom.ts"
      issue: "RAIL_BOTTOM_STEP 1/8\" (:27), RAIL_BOTTOM_LINE_PIECES 24 (:34); railSectionBottom/railBottomFall straight between readings (:41-71); finishedRailOnBottom (:107-125) chords the walls, comment at :104-105 assumes the map is near-straight"
    - path: "components/rails/rail-section-plot.tsx"
      issue: "band segments straight between moved ends (:617-637); finished rail on the bottom (:645-653)"
    - path: "lib/geometry/volume.ts"
      issue: "f*(1-h/a) lift applied to channels too (:1076-1083); wall pushed out to the bottom edge (:1188); a wall gets a face only if w < yEdge (:1206); channel-board seam (:1329-1343)"
    - path: "lib/geometry/design.ts"
      issue: "railBandsOnTheBottom liftIn reads the full foam off, channels included (:357-376, :368); bottomRailLift counts channel foam in the rail lift (:316-318)"
  missing:
    - "Channels treated as D-05 says — the last cut, after the rail is shaped; D-41's contour-before-rail-shaping kept for vees and bellies only"
    - "RAILS: lay the finished rail on the vee/belly as now, then cut the channels into both lines at each wall's own position (top and bottom point, as 3D's bottomWallsAt does), sampling any curve that crosses a channel finely"
    - "3D section: split the foam off — vees/bellies/concaves keep the lift rule; channels cut straight up into the finished rail (underside = the higher of rail and channel floor), wall faces wherever a wall stands, under the rail's curve too"
    - "Rail lift for RAILS' banded thickness counts the vee or belly alone, never a channel"
    - "Tests: a vertical wall on RAILS' thin and thick lines; a wall under a soft rail and under the Longboard's rolled rail"
  debug_session: .planning/debug/finished-rail-rounds-channels.md
