---
phase: 16-3d-board-and-cnc-export
reviewed: 2026-11-06T00:00:00Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - app/design/3d/page.tsx
  - app/globals.css
  - app/not-found.tsx
  - components/3d/board-scene.ts
  - components/3d/export-cnc.ts
  - components/3d/three-d-controls.tsx
  - components/3d/three-d-copy.ts
  - components/3d/three-d-rack-controls.tsx
  - components/3d/three-d-screen.tsx
  - components/3d/three-d-show-buttons.tsx
  - components/design/board-lock-scope.tsx
  - components/design/phone-menu.tsx
  - components/design/phone-top-bar.tsx
  - components/design/screen-tiles.tsx
  - components/design/slider-row.tsx
  - components/design/step-nav.tsx
  - components/fins/fin-controls.tsx
  - components/rails/rail-controls.tsx
  - components/setup/board-rack.tsx
  - components/site-nav.tsx
  - components/viewer/crop-zoom.ts
  - components/viewer/toolbar-button.tsx
  - components/viewer/zoom-viewport.tsx
  - lib/export/cnc-files.ts
  - lib/export/dxf.ts
  - lib/export/stl.ts
  - lib/export/xyz.ts
  - lib/export/zip.ts
  - lib/geometry/blank-ghost.ts
  - lib/geometry/board-surface.ts
  - lib/geometry/design.ts
  - lib/geometry/fin-outline.ts
  - lib/geometry/finished-rail.ts
  - lib/geometry/fins.ts
  - lib/geometry/outline.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/screen-tiles.ts
  - lib/geometry/shaping-bay.ts
  - lib/geometry/three-d-tile-art.ts
  - lib/geometry/units.ts
  - lib/geometry/view-3d.ts
  - lib/geometry/volume.ts
  - lib/geometry/wings.ts
  - lib/models/board-file.ts
  - lib/models/rail-character-report.ts
  - lib/models/surface-report.ts
  - lib/screen-steps.ts
  - scripts/check-saved-boards.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-11-06
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

I reviewed the 3D screen, the CNC export, the litres changes behind them and the reports the founder runs before
go-live 2, reading each file and its diff against `origin/main`.

**No wrong number reaches the foam or the files. There are no Critical findings.** That is measured, not assumed. I ran
the app's own functions from throwaway scripts, outside the repo:

- **600 random boards** (the 102 test boards re-cut with 49 tails, lengths from 60" to 120", widths from 15" to 26"):
  every one was closed and consistently wound, with no zero-area triangle, and the zip built every time. The worst gap
  between the mesh and VOLUME's litres was 0.13%, inside the 0.15% rule.
- **1,020 boards ring by ring** (the 102 boards with ten tails, swallows among them): no half-section crosses itself,
  the lowest point is z = 0, x runs from 0 to the board's length, and no ring's stringer sits more than 0.005 mm off
  the side profile clear of the tips. A second pass of 37,202 rings, with the tails accounted for, found every ring's width within
  1e-13 mm of the outline.
- **STL and text files:** six boards sampled, square wing steps included, had no degenerate triangle in the STL, even
  after its coarser number format, and no repeated point in any slice after rounding to three decimals.
- **500 crafted board files:** extreme values in random fields, through the file reader, the surface builder, the
  export and the wire view. Nothing hung (slowest 0.56 s). The worst outcome was the screen's own "can't be drawn"
  message.

What else is sound:

- **D-41, built from actual values.** `fit.rail: "exact"` is what the live rule reads. The only 1/16" rounding left in
  the section path belongs to the old rules kept for the pins.
- **Rule 2.** There is no stray 25.4 anywhere in the phase's new code. Fin depths go through `inchesToMm` and
  `mmToFeet`, and the slider figures through `measureSlider`.
- **The files.** D-26's forms are correct: STL header, triangle count and winding; DXF flags; zip records and CRC.
- **File names.** No entry name can climb out of its folder (`boardFileStem`).
- **The bare board.** `cncFiles` reads the surface and the name only, so the Fins, Blank and stripe switches can never
  reach the files (D-16).
- **Saved data.** No stored board changes, no database change, and twin defaults move only on a shaper's press.
- **WebGL lifecycle.** Every geometry and material is disposed, listeners are removed, a lost context comes back with
  the board and view kept, and StrictMode's double mount is safe.
- **The lock.** The 3D panel's rail sliders grey on a locked board; the view-only controls do not. The lock's guard is
  the design store.

The real bugs are on the screen and all small, and all come from one gap. `stopMotion` throws a running move away
without finishing it, so a quick second press can leave the board part-way (WR-01, WR-02). The other two findings are a
narrow race on the rack's lock (WR-03) and a go-live report whose figure mixes two plans (WR-04).

## Warnings

### WR-01: A quick second press leaves the board part-way through the first move

**File:** `components/3d/three-d-screen.tsx:873`, `:943-945`, `:938`, `:928`; also `:701`, `:714`, `:1042`
**Issue:** `moveTo` calls `stopMotion()`, which cancels the running move and throws its landing away. The comment at
`:400` says the opposite should happen: "a slider, a drag or a key finishes it at once rather than stranding it
halfway". Worse, `onView` reads where the board is before `moveTo` runs, so the new move starts from the half-finished
turn. `flippedRef` and `headingRef` are only written when a move lands, so they stay stale too.

Failure scenarios on Turn the Board, inside the 400 ms a move takes:

- **Bottom, then Nose.** Nose keeps `rackAngles(turnRef.current)`, whose roll is mid-flight. The board ends up
  nose-toward-you, rolled part-way over, resting on its rail. Bottom's `flipped` never lands, so Rotate on Side reads from
  the wrong face.
- **Nose, then Deck.** `headingRef` is still 0, so Deck swings the board back and the Nose press is lost.
- **On a touch screen, or with a right-drag slide.** A second finger (`:701`) or the slide (`:714`) strands the move at
  the same point, and the scene's crop stays at an in-between value that `cropRef` doesn't know about. Turning the Room
  off or on (`:1042`) strands a running move the same way, though with the Room back on the settle sets the board down.

**Fix:** Land before starting anything new. Press handlers should read the landed state.
```ts
const onView = (name: ViewName) => {
  finishMotion(); // first, so rackAngles, flippedRef and headingRef are the landed ones
  ...
};
const onReset = (instant = false) => {
  finishMotion();
  ...
};
```
Use `finishMotion()` in place of `stopMotion()` at `:701`, `:714`, `:873` and `:1042`.

### WR-02: Pressing anything while the board settles back on the racks leaves it hovering

**File:** `components/3d/three-d-screen.tsx:1056-1064`
**Issue:** Turning the Room back on glides the board onto its racks, with `scene.setFree(1 - k)` easing from 1 to 0 over
400 ms. This glide never sets `landingRef`, so `finishMotion()` and `stopMotion()` from a key, a drag, a slider or a
view button just cancel the animation frame. `freeShare` then stays at whatever it had reached, say 0.4. No later
control sets it back: `setPlane`, `applyTurn` and Reset View never call `setFree`.

Failure scenario: press Room, then within 400 ms press an arrow key or drag. From then on every lie of the board is
blended 40% toward the free position. Flat at rest it looks right, because the two places nearly agree. Roll it or
raise an end and it sinks into the pads or floats off them, until the Room is switched again or the screen is reopened.
The turn is also left mid-slerp, off its racks.

**Fix:** Give the glide a landing, as `moveTo` has.
```ts
const land = () => { landingRef.current = null; scene.setFree(0); applyTurn(to); };
landingRef.current = land;
const tick = () => {
  const t = (performance.now() - began) / VIEW_TURN_MS;
  if (t >= 1) { motionRef.current = 0; land(); return; }
  const k = easeOut(t);
  scene.setFree(1 - k);
  applyTurn(slerpShortest(from, to, k), false);
  motionRef.current = requestAnimationFrame(tick);
};
```

### WR-03: Open This Board during a lock change that then fails leaves the open board disagreeing with the server

**File:** `components/setup/board-rack.tsx:272`, `:288`, `:293`, `:299-301`
**Issue:** `chosenLocks` makes Open This Board read the lock the shaper just chose, before the server has answered. If
the server then refuses, line 288 forgets the choice, but the board has already opened with it. Line 293 can't help: it
runs only on success, and `modelId` there is the value from when the press was made, so it isn't this board.

Failure scenario, narrow but real: a shaper unlocks a board on a bad connection and presses Open This Board straight
away, and the unlock fails. The board opens with every control live while the server still holds it locked. The failure
message is drawn on a rack that has gone, the server refuses every autosave, and the edits are not stored.

**Fix:** On failure, put the open board back. Read the open id through a ref so a board opened in that moment counts:
```ts
const openId = useRef(modelId);
useEffect(() => { openId.current = modelId; }, [modelId]);
...
} catch {
  chosenLocks.current.delete(model);
  if (model.id === openId.current) setOpenBoardLocked(!next);
  ...
}
```
Use the same ref at line 293, so a lock that succeeds on a board opened meanwhile reaches the editor too.

### WR-04: The rail-character report's move is not the D-32 move, and its "these boards don't move" is no longer true

**File:** `lib/models/rail-character-report.ts:43`, `:51-59`; `lib/models/surface-report.ts:8-9`
**Issue:** `railCharacterLitresMove` compares go-live 1's rule against `summarizeDesign`, the live rule, which is now
`SMOOTH_SURFACE_FADE`. So its "after" also holds the wings, the tips, the tail's roll, the sharp tuck and the exact
rail thickness of plan 16-16. The file still says this is the D-32 check, and that every board it leaves out "reads the
same under both rules". That no longer holds, because the tail's roll moves every board. `surface-report.ts:9` also
promises that the share it doesn't give to its own plan is "the whole rail's fade, which `--rail-character-report`
lists".

Measured on the test boards:

| Board | Report's move | D-32 alone | Later plans |
| --- | --- | --- | --- |
| Shortboard, tail Sharp Bottom Tuck | +0.0030 L | +0.0012 L | +0.0018 L |
| Shortboard, nose Sharp Bottom Tuck | +0.0016 L | 0.0000 L | +0.0016 L |
| Longboard, nose Single Tuck | +0.0490 L | +0.0570 L | −0.0080 L |

Plan 16-13's go-live reads this report back to the founder as how far D-32 moved each board. The before and after
figures are true, but the sentence that explains them isn't.

**Fix:** Measure the plan the report is named for, as `surface-report.ts` already does with its `faded`:
```ts
after: summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres,
```
Or, if he should see the whole move, change the report's words and those at `surface-report.ts:9` to say so.

## Info

### IN-01: A zero-thick tip reaches the "can't be drawn" message by accident

**File:** `lib/geometry/board-surface.ts:730`, `lib/geometry/volume.ts:909-911`
**Issue:** Two unguarded edge cases. With `foil.noseTip` at 0, the nose ring welds to one point, `inside` is empty and
`reduce` with no starting value throws a TypeError. In `tailRollScale`, a station with thickness 0 gives 0/0, so
`keep` is NaN. No slider can reach this, because the foil has a floor, but a crafted file can. The screen catches both
and shows its quiet message, so nothing breaks.
**Fix:** Give `reduce` a starting vertex, `edge[0]`, and return 1 from `tailRollScale` when `thickness <= 0`.

### IN-02: A crafted file's absurd figures pass the builder

**File:** `lib/geometry/board-surface.ts:260-278`
**Issue:** `buildBoardSurface` refuses non-finite values and bad lengths but nothing else. A tail width under a
millionth of a millimetre gives a non-manifold mesh; a crotch longer than the board does too. A `noseTip` of 1e12 mm
exports a file with coordinates that size. Nothing crashes or hangs, and only the person who opened such a file is
affected.
**Fix:** Optional: refuse a surface whose coordinates stand outside the board's plausible box, and take a sub-micron
tail width as no width.

### IN-03: The outline file jumps 10 mm straight up at each swallow point

**File:** `lib/geometry/board-surface.ts:719-748`
**Issue:** At each swallow point the outline loop goes from the rail's mid-height vertex (`onEdge`) to the notch's deck
corner (`pieces[n].first`). These stand at the same x and y, so the 3D polyline has a vertical step, 10.16 mm on the
Fish. The top view is exact. Only a program that doesn't flatten the outline first would see it, and D-34's note says
the outline shouldn't climb the edge.
**Fix:** Start and end the notch run at the rail's own tip vertex, or take the wall's vertex at that height.

### IN-04: Wire View after a lost context draws at the lit picture's density

**File:** `components/3d/board-scene.ts:974-981`, `:1047`
**Issue:** `setWire` skips `setPixelRatio` while the context is lost, and `onRestored` never applies it. On a 3× phone
the wire's lines are then 1.5 real pixels wide until the next Wire press, against the founder's "very small stroke".
**Fix:** Call `renderer.setPixelRatio(drawingDensity(wire))` in `onRestored`, before `build()`.

### IN-05: Fin-placement arithmetic lives in the scene, outside Rule 1's reach

**File:** `components/3d/board-scene.ts:474-512`, `:366-398`
**Issue:** `finSolid` works out where a fin stands and how it tilts, and `ribbon` works out the stringer's offset. Both
are in the one file that imports `three`, so neither can be unit-tested. I traced `finSolid` by hand and it is correct.
**Fix:** Move the plain-number parts (the fin's origin and its three axes) into `fin-outline.ts`, and let the scene only
hand them to three.

### IN-06: Dead code and a stale comment

**File:** `lib/geometry/shaping-bay.ts:695`, `lib/geometry/view-3d.ts:157`, `:163`,
`components/3d/three-d-copy.ts:15`, `:68`, `scripts/check-saved-boards.ts:202`
**Issue:** `railSightDeg`, `quatConjugate` and `VIEW_NAMES` are read by no app code. `tileLine` is unused and repeats
the string in `screen-tiles.ts`, and `exportWorking` is unused. The script's comment says "both reports" of three.
**Fix:** Delete them, or have `screenTileLines` read `tileLine`, and fix the comment.

---

_Reviewed: 2026-11-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
