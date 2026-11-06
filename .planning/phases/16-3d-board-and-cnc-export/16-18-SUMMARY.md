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
  - "lib/geometry/shaping-bay.ts: BAY, BAY_PAINT, BAY_TREATMENTS, RackAngles, RackSeat, Viewer, BayLens, REST_VIEWER, WALK_VIEWS, AT_REST, BOTTOM_UP, END_VIEW_FILL, SIGHT_LIMIT_DEG, SIGHT_STEP_DEG; rackTurn, rackAngles, shownAngles, totalRoll, isBottomUp, clampLift, anglesBetween, rackSeat, overPad, boardPlace, freePlace, floorPatch, raiseArmMm, raiseOfLift, liftOfRaise, raiseSlider, standAt, viewerLook, wallReach, aimAt, viewerPlace, bayLens, clampViewer, walkDrag, walkKey, walkBetween, walkGlideAt, railSightDeg, fillCrop, firstViewOutline, stripEnds"
  - "lib/geometry/view-3d.ts: viewerAxes, ViewerAxes; ROOM_CAMERA gains azimuthDeg; cameraAxes, dragTurn and keyTurn take the viewer's axes. frameAtOne, Frame, FRAME_FILL, VIEW_TURNS, quatFromBasis go"
  - "components/3d/three-d-rack-controls.tsx: ThreeDOnTheRacks, ThreeDSightAlong, ThreeDModeSwitch, makeRackStore"
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
  - "A sill sits under each strip, deeper than the shelf above it. In his photo the long bright band is a surface catching the light, not the tube, and a strip truly under a shelf is hidden from a standing eye. This keeps the strip under the shelf and the bright band he liked"
  - "Nose and Tail stand the eye 10 degrees above the board, not at dead rail height: from dead level the outline closes up to a line and there is no curve to follow"
  - "Sight Along swings the eye round the board by a small angle. It reaches each rail's own line at 5.5 to 7.1 degrees on every preset and the 120 inch board, inside its limit of 15"
  - "The viewer stands as near as 2100 mm, not 2450: the board reads larger and both strips still read"
  - "A slider, drag, arrow key or the two-way switch finishes a move under way at once; before this it could strand the viewer halfway"
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

The 3D screen is now a drawn shaping bay: deep blue walls, a dusty floor and a long strip under the shelf down each side wall. The board lies on two racks. You stand directly behind the tail, and you can flip it, raise either end, rotate it on its side, swing it, walk around it, sight down a rail, or turn the room off and spin it freely.

## What changes for the founder

- **You open standing directly behind the tail,** looking toward the nose, deck up, a little above the board. Reset View brings you back here.
- **The strips hang under the shelves.** Below each one is a sill that catches the light, which gives the long bright band from your photo. The wall above the shelf stays dim and the wall below the sill stays dark.
- **Shadows read grey and bright light reads white.** The walls stay blue and the foam doesn't take the blue.
- **The board rests on two racks,** which stand wherever the board is. No fin touches a rack in any setup on any preset.
- **ON THE RACKS,** first in the panel, holds Flip the Board and four sliders. Every control works on a locked board and saves nothing.
- **VIEW** holds a two-way switch, the five buttons, Reset View and the new Sight Along slider.
- **A fifth corner icon is the Room switch.**
- **Nothing here changes the board.** The litres don't move and the CNC zip stays byte for byte the same, flipped, raised, walked round or with the room off.

## The controls as built

| Control | What it does |
|---|---|
| **Deck** | Board deck up on the racks, every slider at rest, Swing and Sight Along included. In Walk Around, you also go straight overhead. |
| **Bottom** | The same, bottom up. |
| **Nose** | You stand at the nose, facing the tail, and the zoom goes to about 60% of the window. The board and racks don't move. |
| **Tail** | You stand at the tail, facing the nose, the same way. |
| **Side** | You stand at the rail, facing across, at 1x. If the board is swung, Nose, Tail and Side go to where its ends and rail are now. |
| **Reset View** | The board and you back at the first view, at 1x. The Turn or Walk choice stays as it was. |
| **Flip the Board** | Half a turn on the racks. Every reading stays what it was, and a screen reader hears "Bottom up." or "Deck up." |
| **Raise the Nose / Raise the Tail** | How high that end stands off its rack, in your chosen units, with the other end pivoting on its rack. Moving one brings the other back to rest. It stops at 60 degrees. |
| **Rotate on Side** | The board about its nose-to-tail line, a full turn either way on every device. The low rail stays on the pads. |
| **Swing** | Slider only: the board and racks turn together. No button ever swings them. Deck, Bottom and Reset View bring it back. |
| **Sight Along** | Shifts your eye up to 15 degrees either way, in steps of 1/4 degree. Only the eye moves. |
| **Turn the Board / Walk Around** | Decides what a drag does. Pressing it moves nothing, and the sliders and buttons work in both. Walk Around stays in the room and above the floor. |
| **Room** | Off, the bay and racks go, the canvas clears to the theme's plain ground, the board reads the same and doesn't move, and a drag spins it freely with no limit. Walk Around dims. On, it settles back on its racks with a glide. |

## Questions for the founder at the look

1. **Sight Along's name.** It stands for now. **"Look Down the Rail"** is the proposal: those are your own words, and the pictures show that is exactly what it does. It changes in one file.
2. **Nose and Tail's zoom.** `END_VIEW_FILL` is 0.6 in one place, if your eye wants more or less.
3. **Swing.** Shown as you asked, in case Side and Sight Along make it unnecessary.
4. **The sill.** It's an addition you didn't ask for by name (see Deviations). Does it read as your photo?
5. **Deck and Bottom put Sight Along back to rest too,** reading "every slider" literally. Say if you would rather keep your sight line when you flip.
6. **The pressed switch pill is accent-filled,** like every two-way pill in the app, so Export is no longer the only accent-filled thing on the panel. It's a look worth a glance.

## Pictures

All in `.planning/phases/16-3d-board-and-cnc-export/pictures/`, the scripts in `16-18-pictures-source.tar.gz`.

- `16-18-bay-beside-photo.png`: your photo beside the Shortboard, then the Fish and Longboard on a computer, and all three on an iPhone.
- `16-18-on-the-racks.png`: flipped, each end raised, rotated 45 degrees each way, swung, on a computer and an iPhone, Shortboard and Longboard.
- `16-18-two-ways.png`: the same drag each way, the five buttons each way, Sight Along down each rail of a Shortboard and a Longboard, and a Longboard at Side.
- `16-18-looks-and-themes.png`: Contour Stripes, Wire View, the room off, and the four themes both ways.
- `16-18-panel.png`: the page on a computer, an iPhone at each section and a sideways phone.

## Against his photo

Treatment A, the Shortboard at the first view on a computer. Averaged patches, the same way as the planner's table. The foam departs from the photo on purpose (D-44). The plan's old limits of 12 levels for the deck and rail no longer apply, as your words overrule them.

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

Proven by test over the raise in 10-degree steps and every roll in 15-degree steps, on every vertex of the full surface: nothing lies more than 2 mm inside a pad, and the foam stays at least 40 mm off the floor, a rule only the 120" board reaches. No fin point lies inside a pad at rest, rolled 45 degrees each way or swung 45, 90 or 135 degrees, across all 32 fin cases. The tightest is the Fish's 2+1, 19.5 mm clear.

## Where the viewer stands

Stand-off in mm, then the lens in degrees (62 unless it had to widen).

| Board | Computer 804×615 | Tall window 482×700 | Pixel 7 | iPhone 14 | 320 | Sideways | Rail's own line, Sight Along |
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

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | No errors; one existing warning in `lib/db/import-designs-action.test.ts`, not from this plan |
| `npm test` | Exit 0: 9416 passed, 2 skipped, 180 files |
| Desktop baseline, desktop project | Exit 0: 6 passed. Only `three-d-desktop` re-recorded, 34d8a19c to 8418d4d6, after a diff put every changed pixel in the panel and the canvas |
| Plan's browser gate, three projects | **Exit 1 as one run:** 212 passed, 9 failed, 100 skipped, 29.7 minutes |
| The 9 failures, re-run alone | 8 pass; x-3d on the iPhone stays intermittent |

The nine failures, one by one:

- **Export case 1, all three projects:** a real failure of a stale rule, fixed in the spec, then 3 of 3 passed. See deviation 7.
- **`board-lock-screens` look-rocker, look-rails and x-rails on the iPhone, s-fins on the computer:** passed alone, the flaky cases ruling 12 names.
- **`viewer-toolbar` ROCKER on Android:** passed alone. Not a 3D case.
- **x-3d on the iPhone:** see Known Issues.

The gate was not re-run whole after the Export spec fix. That fix changed a test's selector and no app code. The 100 skips are `test.skip` conditions that scope a case to a project.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The racks moved from 22% to 18% of the length**
- **Found during:** Task 1, by the fin test
- **Issue:** at 22% a 2+1's side fins reached a pad: 1.2 mm in on the Shortboard, 23 mm in on the Fish. The truth "no fin touches a rack" and the figure could not both hold.
- **Fix:** `BAY.rackShare` 0.18. Racks stand closer together, so the Raise heights are a little lower than 22% would give.
- **Files:** `lib/geometry/shaping-bay.ts`. **Commit:** 27f8092c

**2. [Rule 1 - Bug] A quick second Flip left the reading wrong**
- **Found during:** Task 2, by the locked-board case
- **Issue:** a second press during the first's turn started from halfway, and Rotate on Side then read 175 degrees.
- **Fix:** a second Flip carries on from where the first lands. **Commit:** 2f385e92

**3. [Rule 1 - Bug] A slider moved during a view stranded the viewer halfway**
- **Found during:** Task 2b, by reading the pictures
- **Issue:** the slider stopped the move where it was, leaving you part-way across the room.
- **Fix:** `finishMotion`: a slider, a drag, an arrow key or the switch lands the move first. Case 8b guards it, and it was proven to fail with the fix removed. **Commit:** ecfe3243

**4. [Rule 1 - Bug] The bright sill could fill the bottom of the picture**
- **Found during:** Task 2b, in the same picture
- **Issue:** an eye standing near a side wall a little above the sill looks along its top.
- **Fix:** shelves and sills aren't drawn within 900 mm of the eye, and have no underside, so a viewer at the rail sees past them. **Commit:** ecfe3243

**5. [Rule 1 - Bug] A board tip sat under the zoom row at Nose on phones**
- **Found during:** Task 2b, by case 10 (39 to 75 dots)
- **Fix:** Nose and Tail seat the board 7% of the window low. The 60% fill stands. **Commit:** ecfe3243

### Design changes, for his eye

**6. The room and the views differ from the plan's figures**
- **The sill** (`sillTopMm`, `sillDepthMm`) is new, and the shelf is 200 mm deep rather than 300, so the strip sits just behind its front edge. In his photo the bright band is a lit surface, and with the strip truly under a shelf a standing eye sees little of the tube.
- **`nearestMm`** is 2100 rather than 2450, and `BAY_TREATMENTS.A` is strip 40, fill 0.8, wall base 0.85, floor base 0.74, measured with the strip in its new place.
- **Nose and Tail** stand 10 degrees above the board rather than at rail height, as the pictures showed the outline closing to a line from dead level. Side stays at rail height.
- **The wall's light is painted, not traced:** the slot between shelf and sill is worked out by height alone, and the same goes for the dark under the sill. The board takes the strip's light with no shelf in the way, so a raised nose stays lit above the shelf line.

### Other changes to record

**7. The Export test's "one accent-filled button" rule is narrower.** The pressed switch pill wears the accent, and `components/viewer/` is off limits, so the test now counts accent-filled actions, leaving out anything with `aria-pressed`. This changes a test to fit the design, so it's flagged for his eye above.

**8. `window.__shaper3dBareRoom` is read in the screen, not the scene.** It sets the same state the Room switch sets, so the specs and the switch can't disagree, which is what the plan asked for. A production build never reads it.

**9. `VIEW_TURNS`, `viewTurns` and `quatFromBasis` are gone,** as the buttons no longer turn the board to a view. The relation tests for TEMPLATE's outline and ROCKER's side view moved onto the viewer's own axes and still prove the same thing.

**10. `components/viewer/toolbar-button.test.ts` changed by one number,** four corner buttons to five. It sits outside `files_modified`, but the plan's Room step asks for the restatement.

**11. The commits don't divide the code task by task.** The founder's controls changed the shape of everything at once, so the first commit carries most of the app code for all three tasks, and the later ones carry their proofs and fixes. The plan's one-commit-per-task count stands, and the subjects describe what each commit proves. A reviewer looking for the code by task should read 27f8092c first.

**12. The run was interrupted once by an API connection error.** The first whole gate run was stopped by hand at test 135 of 318, as the load average had reached 260 to 390 and its results could not be trusted. Nothing was reset or lost.

## Known Issues

- **x-3d is intermittent on the iPhone project, and it's not closed.** It failed 2 of 16 in one captured batch and 1 of 6 in another, plus once in the gate. Both failures in the captured batch, and the one in the gate, hang at `e2e/board-lock-screens.spec.ts:86` in `openFromRack`: Open This Board is pressed on the home page's Board Rack and the page never reaches TEMPLATE. That's before the 3D screen is opened, and no rack file changed in this plan. The batch of 6 was not captured; its timing fits the same hang. All 14 runs in the captured batch that reached the 3D screen passed. I did not add a retry, because a tap on Open that does nothing could be a real iPhone bug and a retry would hide it. **The look-rails, look-rocker and x-rails failures on the iPhone fail on the same rack path and may share this cause; I did not confirm that.**
- **A long vertical drag in the suite's iPhone browser moved the board only 5 degrees.** I did not find out why. The suite's iPhone project uses a mouse rather than a real finger, and I worked round it by proving the limit there with arrow keys. Cases 12 and 14 skip the iPhone for the same reason, and real drags are proven on Android and the computer. **This should be walked on a real iPhone at the go-live (16-13).**

## Known limitations

- **Shading, not cast shadows,** as ruled. The floor's dark patch under the board is painted.
- **A long board runs off the window at Side.** You stop at the wall, so a Longboard overflows a computer's window a little and an iPhone's by more. Zoom can't go below 1x, and because your ruling makes Side move the viewer in both modes, there's no longer a Side that shows it whole. This is worth his attention.
- **With the room off, Side still stops where the wall would be,** though no wall shows, so the board doesn't jump when the room is switched.
- **A blank's ghost can pass through a rack's pad:** it is see-through and stands wider than the board.
- **The 3D tile in the ☰ menu no longer matches the first view.** It stays as it was.
- **A drag can swing a Rotate on Side or Swing thumb from one end to the other** as it crosses 180 degrees. The board doesn't jump.
- **Toggling the Room during a move** stops that move where it is rather than finishing it. The room coming back on works out which face is up afresh.
- **Frame costs are from a 2019 laptop chip,** not a phone.

## Threat Flags

No new surface beyond the plan's register: no network, no storage, no schema change. The two development hooks read behind `process.env.NODE_ENV === "production"`. T-16-44, T-16-45 and T-16-47 are mitigated as planned.

## Known Stubs

None.

## Self-Check: PASSED

Checked against the working tree and `git log`: all created files exist, commits 27f8092c, 2f385e92 and ecfe3243 exist, one snapshot changed, and no forbidden file changed.

## Founder's look

Pending — presented by the orchestrator at the Wave 13 checkpoint.
