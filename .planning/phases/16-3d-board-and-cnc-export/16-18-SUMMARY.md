---
phase: 16-3d-board-and-cnc-export
plan: 18
subsystem: 3D screen, the shaping bay, its light, racks, controls and viewer
status: complete
tags: [geometry, 3d, three, lighting, viewer, controls, D-10, D-12, D-13, D-17, D-42, D-43, D-44]
requires:
  - "16-17: the corner row, ThreeDShowButtons, setWire, three-d-desktop's last recording"
  - "16-16: the surface as merged"
  - "16-12: EXPORT, three-d-export case 4"
  - "16-11: the loading picture, setStripes, the ghost"
  - "16-09: crop zoom and slide"
  - "16-07: the turn as one quaternion, the glide, the keys"
provides:
  - "lib/geometry/shaping-bay.ts: BAY, BAY_PAINT, BAY_TREATMENTS, RackAngles, RackSeat, Viewer, BayLens, REST_VIEWER, WALK_VIEWS, AT_REST, BOTTOM_UP, SIGHT_LIMIT_DEG, SIGHT_STEP_DEG; rackTurn, rackAngles, rackNudge, rackDrag, rackKey, settleOnRacks, headingOf, lookOfSwing, isRaised, shownAngles, totalRoll, isBottomUp, clampLift, anglesBetween, rackSeat, overPad, boardPlace, freePlace, floorPatch, raiseArmMm, raiseOfLift, liftOfRaise, raiseSlider, standAt, viewerLook, wallReach, aimAt, viewerPlace, bayLens, clampViewer, walkDrag, walkKey, walkBetween, walkGlideAt, railSightDeg, firstViewOutline, stripEnds"
  - "lib/geometry/view-3d.ts: viewerAxes, ViewerAxes; ROOM_CAMERA gains azimuthDeg; cameraAxes, dragTurn and keyTurn take the viewer's axes. frameAtOne, Frame, FRAME_FILL, VIEW_TURNS, quatFromBasis go"
  - "components/3d/three-d-rack-controls.tsx: ThreeDOnTheRacks, ThreeDModeSwitch, makeRackStore"
  - "lib/geometry/board-surface.ts: SurfaceRing.wingTake, which places nothing and only the wire view reads"
  - "components/3d/three-d-controls.tsx: ThreeDRailBlend"
  - "components/3d/board-scene.ts: setViewer, setRoom, setFree, applyBayLight, buildBay; setTurn takes the turn alone; frame() goes; RoomReport.lights is the strips' four ends; host data-place, data-racks"
  - "components/design/slider-row.tsx: lockExempt"
affects: [16-13]
tech-stack:
  added: []
  patterns:
    - "A closed-form line light written into the standard material with onBeforeCompile, shared by every lit thing in the room"
    - "A room painted by its own small shader, so big flat walls cost almost nothing"
    - "One quaternion as the truth, with three exact inverse angles read and written through it"
    - "A small external store, so a drag re-renders only the panel's sliders"
    - "A move holds where it is going, so a control can finish it rather than strand it"
key-files:
  created:
    - lib/geometry/shaping-bay.ts
    - lib/geometry/shaping-bay.test.ts
    - components/3d/three-d-rack-controls.tsx
    - e2e/three-d-bay.spec.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-bay-beside-photo.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-on-the-racks.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-two-ways.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-looks-and-themes.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-panel.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-wire-at-a-wing.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-18-pictures-source.tar.gz
  modified:
    - lib/geometry/view-3d.ts
    - lib/geometry/view-3d.test.ts
    - lib/geometry/three-d-tile-art.ts
    - lib/geometry/three-d-tile-art.test.ts
    - components/3d/board-scene.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - components/3d/three-d-show-buttons.tsx
    - components/design/slider-row.tsx
    - components/design/board-lock-scope.test.ts
    - components/viewer/toolbar-button.test.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - e2e/three-d-hard-edge.spec.ts
    - e2e/three-d-view.spec.ts
    - e2e/three-d-screen.spec.ts
    - e2e/three-d-show.spec.ts
    - e2e/three-d-zoom.spec.ts
    - e2e/three-d-wire.spec.ts
    - e2e/three-d-export.spec.ts
    - e2e/board-lock-screens.spec.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png
key-decisions:
  - "The racks stand 18% of the board's length from its middle, not the plan's 22%: at 22% a 2+1's side fins reached a pad on the Shortboard and went 23 mm into one on the Fish. The founder's 'no fin touches a rack' outranks the figure"
  - "Each strip has one long shelf on top of it and nothing below. A sill was tried and removed at his word; a standing eye sees the strip under the shelf's edge, its light running down the wall"
  - "Nose and Tail stand the eye 10 degrees above the board, not at dead rail height: from dead level the outline closes up to a line and there is no curve to follow"
  - "Look Down the Rail swings the eye round the board by a small angle. It reaches each rail's own line at 5.5 to 7.1 degrees on every preset and the 120 inch board, inside its limit of 15"
  - "The viewer stands as near as 2100 mm, not 2450: the board reads larger and both strips still read"
  - "A slider, drag, arrow key or the two-way switch finishes a move under way at once; before this it could strand the viewer halfway"
  - "Swing the slider is gone and the racks never move, by any control. The board keeps a heading, 0 or 180 plus a few degrees for Look Down the Rail, so Nose can turn it end for end on racks that stay put"
  - "A sideways drag on Turn the Board turns the board in the plane of the picture: Rotate on Side from either end, end over end from the rail. A vertical drag is unchanged"
  - "Turned off the room's line, a raised board tips over the pad's corner, not its square edge, or a corner digs in by up to 17.6 mm"
  - "The wire view's long lines hold their share of the outline without its wings, carried on each ring as wingTake. Positions, triangles and the CNC files are unchanged, and a wingless board's lines are bit for bit what they were"
duration: about 3 hours 30 minutes of work, in a run interrupted once by an API connection error
completed: 2026-11-05
metrics:
  tasks: 3 of 4 (the fourth is the founder's look)
estimate:
  tokens: 200000
actuals:
  tokens: 41600
  tasks: 3
  commits: 4
---

# Phase 16 Plan 18: The shaping bay Summary

The 3D screen is now a drawn shaping bay: deep blue walls, a dusty floor and a long strip under the shelf down each side wall. The board lies on two racks that never move. Turn the Board keeps the one view and moves only the board; Walk Around moves you inside the room. You can raise either end, rotate it on its side, look down a rail, or turn the room off and spin it freely, and the wire view's long lines now run straight past a wing.

## What changes for the founder

- **You open standing directly behind the tail,** looking toward the nose, deck up, a little above the board. Reset View brings you back here.
- **Each strip has one long shelf on top of it, and nothing below.** You see the strip under the shelf's edge, and its light runs down the wall. The wall above the shelf stays dim.
- **Shadows read grey and bright light reads white.** The walls stay blue and the foam doesn't take the blue.
- **The board rests on two racks, and they never move,** by any control, drag or button. No fin touches a rack in any setup on any preset.
- **The panel reads, on every device:** VIEW (the switch, Deck, Bottom, Side, Nose, Tail, Reset View), the four sliders, Rail Blend Controls folded, then Export.
- **A fifth corner icon is the Room switch.**
- **The wire view's long lines run straight past a wing,** so they show contours, not the wing's cut.
- **Nothing here changes the board.** The litres don't move and the CNC zip stays byte for byte the same, whichever way the board is turned, walked round or with the room off.

## The two modes

| Control | Turn the Board: one view, only the board moves | Walk Around: you move inside the room |
|---|---|---|
| **Deck** | Deck up on the racks, every slider at rest. Keeps whichever end you turned toward you. | Deck up, and you stand directly above the board, nose toward the back wall, tail toward where the first view stands. |
| **Bottom** | Bottom up on the racks, every slider at rest. | The same, bottom up. |
| **Side** | Dimmed, with its reason in the tooltip: "Side works in Walk Around." | You stand at the rail, with a strip on the wall behind the board. |
| **Nose** | The board turns end for end on the racks, so the nose is nearer you. No zoom. | You stand at the nose, facing the tail. No zoom. |
| **Tail** | The board turns back, tail nearer you: the first view. | You stand at the tail, facing the nose. |
| **Reset View** | The board and you back at the first view, at 1x. | The same; the mode stays. |
| **A drag** | Moves the board only. See below. | Walks you round, inside the room and above the floor. |
| **Look Down the Rail** | Turns the board up to 25° either way on the racks. | Moves your eye up to 25° either way. |

| Slider or switch | What it does |
|---|---|
| **Raise the Nose / Raise the Tail** | How high that end stands off its rack, in your chosen units, with the other end pivoting on its rack. Moving one brings the other back to rest. It stops at 60°, and works with the board either way round. |
| **Rotate on Side** | The board about its nose-to-tail line, a full turn either way on every device. The low rail stays on the pads. |
| **Turn the Board / Walk Around** | Going back to Turn the Board brings you home to the one view. Going to Walk Around starts from where you stand, and straightens a board turned for Look Down the Rail. |
| **Rail Blend Controls** | Folded when the screen opens, with the Tail Rail rows inside. Open only while the screen is; nothing is saved. |
| **Room** | Off, the bay and racks go, the canvas clears to the theme's plain ground, the board reads the same and doesn't move, and a drag spins it freely with no limit. Walk Around and Side dim. On, it settles back on its racks with a glide, straight down the room, whichever end is nearer. |

### What a sideways drag does

Before, a sideways drag from behind the tail was almost all swing. With the racks fixed that couldn't stay, so on the racks a sideways drag now turns the board in the plane of the picture, as a hand on the deck pushing it over:

- **Sideways:** Rotate on Side at a drag's full rate, toward your hand. A quarter of the canvas's shorter side is 45°. With the board end for end the hand gets the same answer.
- **Up and down:** raises the far end, as he saw it.
- **On Walk Around** a drag walks you, so the one view is the only place a shaper meets this rule.
- **The arrow keys and the glide after a flick** follow the same rule. With the Room off, a drag is the free spin it was, in every direction.

## The wire view at a wing

"Is the wire mesh supposed to bend like that at the wings? I'd like to use this to identify contours and this kind of messes with the visual."

- **The cause:** a long line held one share of the half-width at every ring, so where a wing cut the outline in, every line jumped sideways, even beside the stringer. The foam has no such jump. The worst was 3.9 mm on lines well away from the rail.
- **The fix, his pick:** each long line holds its share of the outline without the wing, so it runs straight across the wing's station and still fans into the tips. Each surface ring now carries how much the wing took there.
- **At the rail:** an outer line that would stand past the cut-in rail stops at the rail, on the surface, never in the air of the step.
- **Real contours still read:** beside a deep wing the outermost line bends with the foam's shared blend by more than 0.5 mm, and the centre line by less than 0.05 mm.
- **Proven:** on all 28 winged boards, a line within 70% of the half-width stands within 0.05 mm of its share of the wing-free outline, from 2" off each tip. With the fix switched off that test fails on all 28. On all 74 wingless boards the output matches, bit for bit, a SHA-256 taken before the change (`4e6b2907b4606d20604bb92d`). The surface pins pass, so positions and triangles did not move, and `lib/export/` is untouched.

## The founder's rulings

1. **The name:** "Look Down the Rail". Done, everywhere it is spoken, shown or tested. The code's internal `sightDeg` keeps its short name; nobody reads it.
2. **Swing:** "Remove it." The slider and its copy are gone, and the racks never move.
3. **Side on a Longboard:** "Leave it." No change.
4. **His notes after driving it,** which override anything earlier: one shelf per strip; VIEW first; the two modes as tabled above; no Flip the Board; no auto zoom; the sliders next; Rail Blend Controls folded; then Export.
5. **The wire view:** the lines ignore the wing.
6. **Look Down the Rail:** "look down rail should go to 25deg". Done, in both modes, up from 15°.

Standing as they were: Deck and Bottom reset Look Down the Rail with every other slider, and the switch's filled pill stays.

## Where this reads differently from his words

- **Look Down the Rail on Turn the Board turns the board.** He asked for no different angles round the room, so it can't move you. This is the orchestrator's reading, not his words, and it gives the same line of sight down the rail.
- **The sliders have no heading of their own.** He listed them after VIEW without naming a section, so they sit straight under Reset View, and ON THE RACKS is gone.
- **Deck and Bottom on Turn the Board keep the end you turned toward you.** Reset View goes home. He didn't say which.
- **Going back to Turn the Board brings you home to the one view,** a glide, where the switch used to move nothing. "Just the one view" needs it.
- **With the Room off, Side dims as it does on Turn the Board,** and Walk Around is dimmed too, so Side's reason points at a mode you must turn the room on to reach.
- **With the board end for end, Rotate on Side's "left" and "right" are still read from the tail,** so a slider moved right tips the deck to your left. The drag follows your hand either way.
- **Dimming Side rather than hiding it:** dimming reads better, because the row keeps its shape and the tooltip says why. A phone has no hover, so there the dimming is all that shows, and a press tells a screen reader the reason.

## Pictures

All in `.planning/phases/16-3d-board-and-cnc-export/pictures/`, the scripts in `16-18-pictures-source.tar.gz`.

- `16-18-bay-beside-photo.png`: what a standing eye sees of the strip under its one shelf, beside your photo, on a computer and an iPhone.
- `16-18-on-the-racks.png`: Bottom, each end raised, rotated 45° each way, Nose end for end, on a computer and an iPhone, Shortboard and Longboard.
- `16-18-two-ways.png`: the same drag each way, the buttons each way, Look Down the Rail in each mode, and a Longboard at Side.
- `16-18-looks-and-themes.png`: Contour Stripes, Wire View, the room off, and the four themes both ways.
- `16-18-panel.png`: the panel in his order, on a computer, an iPhone and a sideways phone, with Rail Blend Controls open and folded, and Look Down the Rail at its full 25°.
- `16-18-wire-at-a-wing.png`: Wire View on a Shortboard from behind the tail, before and after, a default wing and a square one.

## Against his photo

Treatment A, the Shortboard at the first view on a computer, sampled from the final picture. The foam departs from the photo on purpose (D-44). The wall patch is the end wall's, clear of the strip's glow.

| Where | Photo | Built | |
|---|---|---|---|
| Deck beside the stringer | #6d89b7 | #a6a7a9 | Neutral grey, as ruled |
| Rail | #d7d7e6 | #f0f0f1 to #f2f2f3 | Near pure white, as ruled |
| Wall | #092f67 | #002b63 | Within 12 levels |
| Floor | #5d5f71 | #595a69 | Within 12 levels |

## Clearances

Real surfaces, racks at 18%, pad tops at 740 mm. Heights are in mm off the floor, shown as lowest foam / highest foam. "Off the rack" is the raised end's height at that angle.

| Board | Racks apart | Centre at home | Nose 30° | Nose 45° | Nose 60° | Off the rack at 30 / 45 / 60° | Rolled 45° / 90°: rise | Flipped: centre moves |
|---|---|---|---|---|---|---|---|---|
| Shortboard | 677 | 796 | 492 / 1499 | 369 / 1754 | 272 / 1939 | 14.1" / 20.0" / 24.4" | 139 / 175 | -53 |
| Fish | 622 | 799 | 524 / 1452 | 411 / 1684 | 319 / 1852 | 13.0" / 18.4" / 22.6" | 152 / 192 | -53 |
| Mid-length | 786 | 794 | 458 / 1599 | 313 / 1898 | 197 / 2117 | 16.3" / 23.0" / 28.2" | 162 / 211 | -39 |
| Longboard | 988 | 797 | 389 / 1798 | 203 / 2173 | 53 / 2451 | 20.2" / 28.6" / 35.0" | 161 / 224 | -41 |
| 120" (the app's longest) | 1097 | 797 | 306 / 1873 | 106 / 2296 | 40 / 2704 | 22.4" / 31.7" / 38.8" | 161 / 224 | -41 |

| Board | Tail 30° | Tail 45° | Tail 60° |
|---|---|---|---|
| Shortboard | 552 / 1447 | 422 / 1710 | 311 / 1908 |
| Fish | 575 / 1400 | 453 / 1641 | 350 / 1822 |
| Mid-length | 496 / 1563 | 348 / 1867 | 223 / 2095 |
| Longboard | 411 / 1775 | 225 / 2154 | 74 / 2437 |
| 120" | 333 / 1845 | 128 / 2273 | 40 / 2672 |

Proven by test over the raise in 10-degree steps and every roll in 15-degree steps, on every vertex of the full surface: nothing lies more than 2 mm inside a pad, and the foam stays at least 40 mm off the floor, a rule only the 120" board reaches. No fin point lies inside a pad at rest, rolled 45° each way, end for end or turned the full 25° either way, across all 32 fin cases. These tables are the board straight, and they did not move when the limit went to 25°; a board turned for Look Down the Rail and raised stands a little higher.

### At the full Look Down the Rail, ±25°

Measured on the real surface with every vertex, at both headings (±25° and 180° ±25°), raised up to 60° either way in 15° steps and rolled all the way round in 30° steps, with the rack posts counted as well as the pads. A negative figure is clear air. The 120" board takes the Longboard's fin setups on its own length and rocker.

| Board | Deepest foam into a rack | Lowest foam off the floor | Nearest any fin comes to a rack | Eye off the nearest wall | Lowest eye height |
|---|---|---|---|---|---|
| Shortboard | clear by 0.6 mm | 307 mm | 29 mm clear | 1132 mm | 1235 mm |
| Fish | clear by 0.2 mm | 349 mm | 10 mm clear | 1132 mm | 1238 mm |
| Mid-length | **0.6 mm in** | 229 mm | 94 mm clear | 1019 mm | 1291 mm |
| Longboard | clear by 0.02 mm | 71 mm | 175 mm clear | 565 mm | 1419 mm |
| 120" | clear by 0.02 mm | 40 mm | 238 mm clear | 369 mm | 1470 mm |

All inside the 2 mm rule, the 40 mm floor rule and the 200 mm wall rule. The eye figures are Walk Around from both ends, on all six windows. The fins are read down their centre plane, so take half a fin's thickness off the tightest, the Fish's 2+1. The sweep's own steps are 15° and 30°, so a pose between them isn't measured here.

## Where the viewer stands

Stand-off in mm, then the lens in degrees (62 unless it had to widen).

| Board | Computer 804×615 | Tall window 482×700 | Pixel 7 | iPhone 14 | 320 | Sideways | Rail's own line, Look Down the Rail |
|---|---|---|---|---|---|---|---|
| Shortboard | 2100 | 2100 | 2100 | 2100 | 2100 | 2100 | 6.6° |
| Fish | 2100 | 2100 | 2100 | 2100 | 2100 | 2100 | 7.1° |
| Mid-length | 2373 | 2373 | 2373 | 2373 | 2373 | 2373 | 6.6° |
| Longboard | 2971 | 2971 | 2971 | 2971 | 2971 | 2971 | 5.6° |
| 120" | 3193 at 64.2° | 3193 at 64.2° | 3193 at 64.2° | 3193 at 64.2° | 3193 at 64.2° | 3193 at 64.2° | 5.5° |

## What each frame costs

Median ms to draw a frame and wait for its pixels, measured with a temporary hook that was removed before the commit. The Mac's chip is an Intel Iris Plus 655 from a 2019 laptop, so these are not phone figures. The two software rows only say how long the suite takes.

| Device, canvas | Shortboard | Longboard |
|---|---|---|
| iphone project (WebKit, on the chip), 380×407 | 12.0 | 8.0 |
| Chrome on the chip, computer, 804×615 | 6.4 | 9.5 |
| Chrome on the chip, Pixel-sized, 402×523 | 6.0 | 9.3 |
| desktop project (software), 804×615 | 75.6 | 80.0 |
| android project (software), 402×523 | 116.7 | 114.9 |

All the on-chip figures sit inside one 60 Hz frame (16.7 ms). They were taken before the last small change, which only skips the bench close to the eye. No package was added, so `RectAreaLight`'s 100 KB stays out of the 3D chunk.

## How it was proven

After the 25° change (the last commit), on its own list:

| Check | Result |
|---|---|
| `npx tsc --noEmit`, `npm run lint` | Exit 0; the one existing warning |
| `lib/geometry/shaping-bay.test.ts` | Exit 0: 146 passed |
| `e2e/three-d-bay.spec.ts`, 3 projects | Exit 0: 58 passed, 8 skipped |
| Desktop baseline | Exit 0: 6 passed, nothing re-recorded: the slider rests at its middle either way |

The other specs and the whole unit suite were not re-run for this change. The figures below are from the commit before it.

Before the 25° change, after his notes and the wire view:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0; one existing warning in `lib/db/import-designs-action.test.ts`, not from this plan |
| Unit suite, 30 s limit per test | Exit 0: 9518 passed, 2 skipped, 180 files |
| `npm test` as it stands, 5 s limit | **Exit 1 on both quiet runs:** 1 or 2 timeouts, a different file each time (`blank-fit`, `finished-rail`, neither changed here), each passing alone. The machine's load was 33 to 49, the busiest process another session's browser |
| `three-d-bay`, `-screen`, `-view`, `-show`, `-zoom`, `-wire`, `-export`, `-hard-edge`, `viewer-toolbar`, 3 projects, one run | **Exit 1:** 188 passed, 1 failed, 78 skipped, 27.9 minutes |
| That one failure, bay case 4 on the iPhone | Timed out waiting for the first frame, before any check ran. Alone: 3 of 3 passed |
| Desktop baseline | 6 passed on 3 runs in a row. One earlier run failed RAILS by 20011 pixels; nothing here touches RAILS, it passed in the runs either side, and it was not re-recorded. That failure's files were lost to the next run, so its cause is unknown |
| `three-d-desktop` | Re-recorded, 1a37927b to c70f39e1, on a proven diff: every changed pixel in the panel or the room's walls, shelves and floor, none above y 214. The other five are untouched |
| x-3d, 2 runs on each of 3 projects | Exit 1: 5 passed, 1 failed on the iPhone at the rack, before the 3D screen (Known Issues) |

The 78 skips are `test.skip` conditions that scope a case to a project.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The racks moved from 22% to 18% of the length**
- **Found during:** Task 1, by the fin test
- **Issue:** at 22% a 2+1's side fins reached a pad: 1.2 mm in on the Shortboard, 23 mm in on the Fish. The truth "no fin touches a rack" and the figure could not both hold.
- **Fix:** `BAY.rackShare` 0.18. Racks stand closer together, so the Raise heights are a little lower than 22% would give.
- **Files:** `lib/geometry/shaping-bay.ts`. **Commit:** 27f8092c

**2. [Rule 1 - Bug] A quick second Flip left the reading wrong**
- **Found during:** Task 2, by the locked-board case. Flip the Board has since gone at his word, and the fix with it. **Commit:** 2f385e92

**3. [Rule 1 - Bug] A slider moved during a view stranded the viewer halfway**
- **Found during:** Task 2b, by reading the pictures
- **Issue:** the slider stopped the move where it was, leaving you part-way across the room.
- **Fix:** `finishMotion`: a slider, a drag, an arrow key or the switch lands the move first. Case 8b guards it, and it was proven to fail with the fix removed. **Commit:** ecfe3243

**4. [Rule 1 - Bug] The bright sill could fill the bottom of the picture**
- **Found during:** Task 2b, in the same picture
- **Issue:** an eye standing near a side wall a little above the sill looks along its top.
- **Fix:** a shelf isn't drawn within 900 mm of the eye, so a viewer at the rail sees past it. The sill has since gone; the rule stays for the shelf. **Commit:** ecfe3243

**5. [Rule 1 - Bug] A board tip sat under the zoom row at Nose on phones**
- **Found during:** Task 2b, by case 10. The auto zoom that caused it has since gone at his word, and the fix with it. **Commit:** ecfe3243

### Design changes, for his eye

**6. The room and the views differ from the plan's figures**
- **The sill** was added here and removed at his word. The shelf stays 200 mm deep rather than the plan's 300, so a standing eye sees the strip just behind its front edge; at 300 the shelf hides it.
- **`nearestMm`** is 2100 rather than 2450, and `BAY_TREATMENTS.A` is strip 40, fill 0.8, wall base 0.85, floor base 0.74. `stripFaceMm` is 50 rather than 40, so the strip reads under the shelf.
- **Nose and Tail** stand 10 degrees above the board rather than at rail height, as the pictures showed the outline closing to a line from dead level. Side stays at rail height.
- **The wall's light is painted, not traced:** the cut-off at the shelf is worked out by height alone. The board takes the strip's light with no shelf in the way, so a raised nose stays lit above the shelf line.

### Other changes to record

**7. The Export test's "one accent-filled button" rule is narrower.** The pressed switch pill wears the accent, and `components/viewer/` is off limits, so the test now counts accent-filled actions, leaving out anything with `aria-pressed`. His ruling keeps the pill.

**8. `window.__shaper3dBareRoom` is read in the screen, not the scene.** It sets the same state the Room switch sets, so the specs and the switch can't disagree, which is what the plan asked for. A production build never reads it.

**9. `VIEW_TURNS`, `viewTurns`, `quatFromBasis`, and later `END_VIEW_FILL` and `fillCrop`, are gone,** as nothing reads them. The relation tests for TEMPLATE's outline and ROCKER's side view moved onto the viewer's own axes and still prove the same thing.

**10. `components/viewer/toolbar-button.test.ts` changed by one number,** four corner buttons to five. It sits outside `files_modified`, but the plan's Room step asks for the restatement.

**11. The commits don't divide the code task by task.** The founder's controls changed the shape of everything at once, so the first commit carries most of the app code for all three tasks, and the later ones carry their proofs and fixes. The plan's one-commit-per-task count stands, and the subjects describe what each commit proves. A reviewer looking for the code by task should read 27f8092c first.

**12. `clampLift` is no longer on the hand paths.** The plan's acceptance line counts three `clampLift(` calls in the screen. With Swing gone, a drag, its glide and the keys go through `rackNudge`, which holds the lift at its limit itself, and `clampLift` now serves `settleOnRacks`. The rule the line stood for holds, tested over 2000 seeded drags.

**13. [Rule 1 - Bug] A turned, raised board dug a pad's corner into the foam.** With the racks fixed, a board turned for Look Down the Rail and raised near 60° tipped over a corner of the pad, not its edge: up to 17.6 mm in. Found by the new sweep. The tip point now moves out by the pad's half-span times the sine of the turn, zero with the board straight, so Tail and Nose are unchanged.

**14. [Rule 1 - Bug] A raised end read `0"` on a board that wasn't raised.** A speck of lift left by reading a turn back counted as a raise. Seen in the panel picture, not by a test. `isRaised` now holds a 0.01° line, with a unit and a browser case.

**15. `lib/geometry/board-surface.ts` changed,** which the plan's prohibition named. The orchestrator directed it for the wire view, on the condition that positions, triangles and the CNC files do not change; the surface pins prove they didn't. `e2e/three-d-hard-edge.spec.ts` changed too, to open the fold. Neither is in `files_modified`.

**16. [Rule 1 - Bug] At ±25° a board nearly bottom up sat in a pad.** The range change itself was clean on the tests' grid, but a finer measured sweep found 4.6 mm on the 120" board and 4.5 mm on the Longboard at roll 150°, which the grid stepped over. The resting height was worked out as if the board stood square to the pads. It now reads the pad's real footprint under the turned board, and never less than the square answer, so a straight board's figures are unchanged. The test grid now rolls every 30°, and with the fix out it fails.

**17. The run was interrupted once by an API connection error.** The first whole gate run was stopped by hand at test 135 of 318, as the load average had reached 260 to 390 and its results could not be trusted. Nothing was reset or lost.

## Known Issues

- **x-3d is intermittent on the iPhone project, and it's not closed.** It failed 2 of 16 in one captured batch, 1 of 6 in another, 1 of 3 on a warm server after the rulings, 1 of 2 at the last run, plus once in the gate. Both failures in the captured batch, and the one in the gate, hang at `e2e/board-lock-screens.spec.ts:86` in `openFromRack`: Open This Board is pressed on the home page's Board Rack and the page never reaches TEMPLATE. That's before the 3D screen is opened, and no rack file changed in this plan. The last failure stopped one step later, at line 109, waiting for the Unlock button after the rack. The batch of 6 was not captured; its timing fits the same hang. A debugger is looking at the iPhone rack tap separately. All 14 runs in the captured batch that reached the 3D screen passed. I did not add a retry, because a tap on Open that does nothing could be a real iPhone bug and a retry would hide it. **The look-rails, look-rocker and x-rails failures on the iPhone fail on the same rack path and may share this cause; I did not confirm that.**
- **A long vertical drag in the suite's iPhone browser moved the board only 5 degrees.** I did not find out why. The suite's iPhone project uses a mouse rather than a real finger, and I worked round it by proving the limit there with arrow keys. Cases 12 and 14 skip the iPhone for the same reason, and real drags are proven on Android and the computer. **This should be walked on a real iPhone at the go-live (16-13).**

## Known limitations

- **Shading, not cast shadows,** as ruled. The floor's dark patch under the board is painted.
- **A long board runs off the window at Side.** You stop at the wall, so a Longboard overflows a computer's window a little and an iPhone's by more. Shown to him; his ruling: "Leave it."
- **With the room off, Side still stops where the wall would be,** though no wall shows, so the board doesn't jump when the room is switched.
- **A blank's ghost can pass through a rack's pad:** it is see-through and stands wider than the board.
- **The 3D tile in the ☰ menu no longer matches the first view.** It stays as it was.
- **A drag can send the Rotate on Side thumb from one end to the other** as it crosses 180 degrees. The board doesn't jump.
- **Toggling the Room during a move** stops that move where it is rather than finishing it. The room coming back on works out which face and end are up afresh.
- **A rail-side drag on the racks** exists in the maths for a viewer at the rail, but nothing reaches it on the racks now: a viewer at the rail is on Walk Around, where a drag walks.
- **Frame costs are from a 2019 laptop chip,** not a phone.

## Threat Flags

No new surface beyond the plan's register: no network, no storage, no schema change. The two development hooks read behind `process.env.NODE_ENV === "production"`. T-16-44, T-16-45 and T-16-47 are mitigated as planned.

## Known Stubs

None.

## Self-Check: PASSED

Checked against the working tree and `git log`: all created files exist, commits 27f8092c, 2f385e92 and ecfe3243 exist, one snapshot changed, and no forbidden file changed.

## Founder's look

Pending — presented by the orchestrator at the Wave 13 checkpoint.
