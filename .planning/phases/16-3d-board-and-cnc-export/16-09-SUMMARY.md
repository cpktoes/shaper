---
phase: 16-3d-board-and-cnc-export
plan: 09
subsystem: 3D screen (zoom, slide, Wide view)
status: complete
tags: [3d, zoom, slide, pinch, wide-view, keyboard, touch, D-04, D-10, D-13, D-28]
requires:
  - "16-06: mountBoardScene / BoardSceneHandle, frameAtOne, THREE_D_COPY.oneXSpoken, the hidden live region"
  - "16-07: the turn in a ref, one requestAnimationFrame per change, the views and Reset View, the canvas's keys"
  - "zoom-math.ts (quick 261007-fnz): snapZoom, stepZoom, formatZoomLevel, wheelStep, normaliseWheelDelta, PINCH_WHEEL_RATE, DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX"
provides:
  - "components/viewer/crop-zoom.ts: CropView, AT_ONE_CROP, CropRect, isAtOneCrop, cropLimit, cropRect, cropZoomAt, cropStep, cropSlide, cropPinch"
  - "components/viewer/zoom-viewport.tsx: ViewerZoomRow({ zoom, maxZoom, onStep, onReset, placement, atOne? }) — the zoom row's markup, shared by every 2D viewer and the 3D canvas"
  - "BoardSceneHandle.setCrop(rect | null) — camera.setViewOffset / clearViewOffset, one frame"
  - "DOM hook: data-crop on the canvas host (the level, then the slide's two fractions to 1e-4)"
  - "Wide view on the 3D screen (wideView → DesignScreenShell and TabbedPanel bare)"
affects: [16-10, 16-11, 16-12, 16-15]
tech-stack:
  added: []
  patterns:
    - "Zoom and slide are a crop of the fixed camera's picture (setViewOffset); the camera and the lights never move, so shading is identical zoomed and at 1x"
    - "The crop lives in a ref and goes straight to the scene; React state holds only what the zoom row shows (the level, and whether there is anything to undo)"
    - "The crop is kept as fractions of the picture, so a resize (Wide view, a phone turned) keeps the zoom and the slide while the scene re-works 1x for the new canvas"
    - "A presentational zoom row (ViewerZoomRow) shared by a viewBox zoom and a camera crop, with identical DOM"
key-files:
  created:
    - components/viewer/crop-zoom.ts
    - components/viewer/crop-zoom.test.ts
    - e2e/three-d-zoom.spec.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-09-zoom-slide.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-09-pictures-source.tar.gz
  modified:
    - components/viewer/zoom-viewport.tsx
    - components/3d/three-d-screen.tsx
    - components/3d/board-scene.ts
decisions:
  - "The slide's hold: up to 2x the board's centre stays in the window; from 2x the window stays inside the 1x picture (the 2D viewers' own rule), so the tips can be zoomed into — see Deviation 1"
  - "A view button, Reset View and Home also put the zoom and slide back to 1x, at once (they 're-frame at 1x', §3)"
  - "Back to 1x counts a slide at 1x as something to undo: the button stays live and, on a phone, the row shows (ViewerZoomRow's optional atOne)"
  - "Back to 1x speaks 'Back to 1x.' only when there was something to undo, so a double-tap that also fires a double-click is heard once"
  - "A second finger landing stops the one-finger turn where it is, with no glide; after a pinch the finger left down does not turn until a new touch starts"
  - "A trackpad pinch (ctrl + wheel, Safari's gesture events) snaps to the half steps like the 2D viewers' does"
metrics:
  duration: "about 50 minutes"
  completed: 2026-11-04
estimate:
  tokens: 100000
actuals:
  tokens: 16700
  tasks: 2
  commits: 3
---

# Phase 16 Plan 09: Zoom and slide on the 3D board, and Wide view Summary

The 3D board now zooms and slides with every input a shaper would expect: the zoom row the other drawings have, the
wheel, a trackpad pinch, two fingers, a right-drag or Shift-drag, a double-click or double-tap back to 1x, and the
keys. Wide view widens the window. The camera and the shaping room's lights never move: zooming shows a closer crop
of the very picture the camera takes, so the foam is lit exactly the same zoomed in as at 1x.

## What changes for the founder

- **The zoom row every drawing has**, in the drawing's top-right corner: zoom out, the level (1x to 10x in half
  steps), zoom in and Back to 1x. It has the same buttons, words and place as on TEMPLATE, ROCKER, RAILS and FINS.
  At 1x, zoom out and Back to 1x are dimmed.
- **The wheel or a trackpad scroll** zooms one half step per notch toward the pointer, so the foam under the pointer
  stays under it. The page and the panel never scroll from the drawing.
- **A trackpad pinch** zooms toward the pinch, in Chrome (which reports it as a scroll with Ctrl) and in Safari (which
  has its own pinch events). The Safari half could not be tried by machine; please try it on your Mac.
- **Slide the board** with a right-drag, a middle-drag, or Shift with a left-drag (for a one-button trackpad). It
  follows the pointer exactly, at any zoom including 1x, and the cursor shows a move arrow while you slide.
  - Up to 2x, the board's centre can't leave the window, so you can push it aside but never lose it.
  - From 2x on, the window stays over the whole board, as on the other drawings, so you can zoom right into the nose
    or the tail (see Deviation 1).
- **Two fingers** pinch to zoom about their midpoint, and moving both together slides. A twist does nothing. One
  finger still turns the board, as before.
- **A double-click (or a double-tap on a phone or iPad)** goes back to 1x. The zoom and the slide are undone and the
  turn is kept. The right-click menu is kept off the drawing only, since right-drag slides.
- **The keys**, once the drawing is clicked:
  - `+` or `=` zooms in a step and `−` zooms out a step.
  - Shift with an arrow slides the board a twentieth of the window.
  - `0` goes back to 1x.
  - The arrow keys and Home still turn the board and reset the view, as before. Ctrl and Cmd key combinations are
    left to the browser, and Tab still moves on.
- **A screen reader** hears "Back to 1x." after the button, a double-click or the 0 key, when there was something to
  undo. Zooming and sliding by hand are not announced.
- **Wide view**: one button in the corner toolbar, exactly TEMPLATE's (title "Wide view"). It hides the sidebar and
  the board re-frames for the wider window at the same zoom. It shows on a computer and on a phone held sideways,
  never on an upright phone (there is no sidebar to hide there). There is no Rotate button on 3D (D-04).
- **A view button or Reset View** turns the board and also comes back to 1x, centred, as "re-frames at 1x" says.
- **On a phone** the zoom row only appears once you have zoomed in (or slid), and then only as the level and Back to
  1x, the same rule as every other drawing on a phone. An upright phone at 1x has nothing over the board.
- **Resizing the window or turning the phone** keeps the turn, the zoom level and the slide. 1x is re-worked for the
  new window.
- **While a canvas message shows** (no 3D in this browser, a board that can't be drawn, the code didn't load), there
  is no zoom row. Wide view stays, since it still widens the window.

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-09-zoom-slide.png` shows the Fish in Daylight:
- the screen at 1x on a 1280 × 800 computer;
- Wide view at 2x;
- the Bottom view at 1x, then 4x on the swallow tail (six wheel notches, then a right-drag to bring it to the middle);
- the board slid aside at 1x;
- an iPhone 14 at 1x (nothing over the board) and after a two-finger pinch to 3x (only the level and Back to 1x).

The scripts are in `pictures/16-09-pictures-source.tar.gz` (pictures.config.ts, shots.spec.ts, compose.js).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | The zoom row on the 3D board, zooming by cropping the fixed camera's picture | 020957e6 | components/viewer/crop-zoom.ts (+test), components/viewer/zoom-viewport.tsx, components/3d/board-scene.ts, components/3d/three-d-screen.tsx, e2e/three-d-zoom.spec.ts |
| 2 | Slide, pinch, double-click to 1x, the keys, Wide view, the touch and size rules; the pictures | 9a576aa3 | components/viewer/crop-zoom.ts (+test), components/3d/three-d-screen.tsx, e2e/three-d-zoom.spec.ts, pictures/16-09-zoom-slide.png, pictures/16-09-pictures-source.tar.gz |
| 3 | The founder zooms and slides the board (checkpoint) | (this SUMMARY's commit) | this SUMMARY |

**Tracer gate:** after Task 1, `e2e/three-d-zoom.spec.ts` case 1 passed on desktop, and so did `e2e/viewer-zoom.spec.ts`
and `e2e/desktop-baseline.spec.ts` (33 passed, 9 skipped by design), before any Task 2 work. As in 16-06 and 16-07, the
interactive tracer checkpoint is folded into the orchestrator's single checkpoint at Task 3.

## Verification

- **`npx vitest run components/viewer`: 180 passed** (11 files), including `crop-zoom.test.ts`'s 24:
  - the crop rect at 1x and at zoom z;
  - the same relative crop on a resized window;
  - the point under the pointer held to 1e-9 (from 1x and from a zoomed, slid view);
  - snapping inside 1x–10x and a smaller maximum;
  - the hold up to 2x (centre on the window's edge) and from 2x (window inside the picture);
  - the tail still under the pointer at 4x;
  - the limit meeting itself at 2x;
  - one step in from 1x is 1.5x and one step out at 1x stays put, slide kept;
  - a slide that follows the pointer exactly at 1x, 2.5x and 6x, with no dead zone on the way back;
  - the pinch: point held, spread doubling, moving together slides, worked from the start, a sub-dot start ignored;
  - every non-finite or unmeasured input returning the view unchanged (T-16-20).
- **`npm test`**: every assertion passes. Each full run had one or two heavy files time out under the shared machine's
  load (`lib/models/rack-stand-in.test.ts`, `lib/geometry/finished-rail.test.ts`). Run alone with
  `--testTimeout=120000`, both pass (58/58).
- **`npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors.** The one warning, in
  `lib/db/import-designs-action.test.ts`, was there before.
- **`e2e/three-d-zoom.spec.ts`, all three projects, on port 3209: 9 passed** (each case runs on the project it names):
  1. Desktop:
     - the row reads 1x with Back to 1x and Zoom out dimmed;
     - Zoom in gives 1.5x, the picture changes, and `data-room` is the same;
     - a wheel notch over plain foam near the nose end gives 2x, with the same foam colour under the pointer;
     - Back to 1x gives 1x, the picture is as it was, and "Back to 1x." is spoken.
  2. Desktop slide:
     - a right-drag of (100, 40) moves the board's box by (100, 40) ± 2, with the cursor `move` while sliding;
     - Shift + drag does the same;
     - the turn and the room are unchanged;
     - a 3000-dot right-drag stops at cx = −0.5 with half the board still in view.
  3. Desktop: turned, zoomed to 2x and slid, a double-click gives exactly 1x with the turn kept, the board's box where
     it was at 1x for that turn, and "Back to 1x." spoken.
  4. Desktop keys:
     - Shift + → slides a twentieth of the canvas ± 2, and Shift + ↓ slides down;
     - `+`, `−` and `=` zoom;
     - `0` gives exactly 1x and speaks;
     - the page never scrolls, focus stays, and Tab leaves.
  5. Android (trusted CDP touches):
     - at 1x there is no row;
     - a pinch spreading 100 → 250 dots gives 2.5x with the turn unchanged, and only the level and Back to 1x draw;
     - both fingers moving slide the board at 2.5x;
     - a double-tap gives 1x and the row goes again;
     - neither the page nor the panel scrolled.
  6. iPhone: at 1x the row is in the page but hidden; no Wide view and no visible toolbar button.
  7. Desktop Wide view:
     - at 2x it hides the sidebar, the canvas grows more than 200 dots, and the zoom and turn are kept;
     - "Show the sidebar" is pressed and brings the sidebar back;
     - at 820 × 800 Wide view shows and the row sits under the icon row; at 800 wide Wide view is gone and the row takes
       the corner, still 2x.
  8. No-WebGL stub: the message, no zoom row, Wide view visible.
  9. Desktop:
     - six wheel notches at plain foam near the middle give 4x with `data-room` unchanged and the same foam's 5 × 5 mean
       colour within 6 of 1x's;
     - a 40-dot right-drag moves that foam 40 dots, still the same colour;
     - this is the "same pixel's colour at 1x and 4x" proof the orchestrator asked for.
- **Task 2's verify list**: `three-d-zoom`, `three-d-view`, `three-d-screen`, `three-d-hard-edge`, `viewer-zoom` and
  `viewer-toolbar`, all three projects on port 3209: **111 passed, 114 skipped by design, 0 failed** (before the
  Deviation 1 fix). After the fix, `three-d-zoom` re-ran on all three projects (9 passed) and `keyboard-focus`,
  `desktop-baseline` and `three-d-view` re-ran on desktop (17 passed).
- **The 2D viewers are untouched**: `viewer-zoom.spec.ts` passed on all three projects, and the desktop baseline
  passed on desktop with no picture moved. `ViewerZoomControl` renders `ViewerZoomRow` with the same elements,
  classes, words and order; its `atOne` defaults to `zoom <= 1`, exactly the old rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The slide's hold as written made the nose and the tail unreachable above 2x**
- **Found during:** Task 2's pictures (the plan's own "4x on the tail from below").
- **Issue:** the plan held the crop so the picture's centre, where the board's centre sits at 1x, stays inside the
  crop (`|cx| ≤ 1/(2z)`). At 4x the window is a quarter of the picture wide and must contain its centre, so it can
  never reach past 75% of the way across: the tail at about 93% could not be shown at 4x, nor anything at the tips
  past 2x. The plan's own picture was impossible, and a shaper couldn't zoom into the tail or the swallow.
- **Fix:** the hold is `cropLimit(z) = max(1/(2z), 1/2 − 1/(2z))`:
  - Up to 2x it is the plan's rule: the board's centre stays in the window, and a slide at 1x is allowed (UI-SPEC §5).
  - From 2x on it is the 2D viewers' rule: the window stays inside the 1x picture, which is framed on the board, so
    the board is never lost.
  - The two meet at exactly 2x (0.25), so the limit never jumps. Tested.
- **For the orchestrator / founder:** above 2x the board's centre can now leave the window while you look at a tip.
  That is what "zoom into the tail" needs. Going back to the literal rule is one line (`cropLimit`).
- **Files modified:** components/viewer/crop-zoom.ts, components/viewer/crop-zoom.test.ts
- **Commit:** 9a576aa3

**2. [Rule 2 - Correctness] Back to 1x counts a slide at 1x as something to undo**
- **Issue:** the 2D row dims Back to 1x, and hides the whole row on a touch screen, whenever the level is 1x. On 3D a
  board can be slid at 1x, which would leave a slid board with a dead Back to 1x button.
- **Fix:** `ViewerZoomRow` takes an optional `atOne`, defaulting to `zoom <= 1` (every 2D viewer passes nothing, so
  their DOM is identical). The 3D screen passes "at 1x and not slid". Zoom out is still dimmed at 1x either way.
- **Files modified:** components/viewer/zoom-viewport.tsx, components/3d/three-d-screen.tsx
- **Commit:** 020957e6

**3. [Interpretation] A view button, Reset View and Home also undo the zoom and the slide**
- §5's table says a view "turns the board to that view and re-frames at 1x". The crop goes back to 1x at once when
  the turn starts; the turn itself still eases over 0.4 s. Without this, picking Deck at 4x would turn the board
  inside a 4x crop of a picture framed for a different view.
- **Files modified:** components/3d/three-d-screen.tsx
- **Commit:** 9a576aa3

### Other notes

1. **No new words.** `THREE_D_COPY.oneXSpoken` ("Back to 1x.") already existed (16-06), and the canvas's description
   already lists the slide, pinch and keys. The toolbar's words are the inherited literals, as TEMPLATE's are.
2. **`cropZoomAt`, `cropStep` and `cropPinch` take an optional `maxZoom`** (default 10), and **`isAtOneCrop` and
   `cropLimit` are extra exports**. These extend the plan's signatures; nothing is removed.
3. **TDD.** `cropPinch`'s tests went red first ("cropPinch is not a function", 6 failures), then green. The red step
   was not its own commit, since the orchestrator rules one commit per task.
4. **Safari's trackpad pinch (research assumption A5) is not proven by machine.** Playwright's WebKit has no gesture
   events. The handler mirrors the 2D viewers' and is ignored while a finger is down (an iPhone's own pinch goes
   through the pointer events). Founder's check 2 covers it.
5. **The iPhone picture's pinch was fired inside the page** as synthetic touch pointers, as 16-07's flick was. The
   harness has no real fingers on WebKit; the Android spec proves the real pinch.
6. **The spec's board-box helper skips the canvas's four rounded corners.** There the page behind shows through, and
   it would otherwise read as "board".
7. **The deck under lighting B is close to the ground colour.** The spec's plain-foam finder therefore uses the same
   12-level threshold as its board box, not a stricter one.

## TDD Gate Compliance

`cropPinch`: RED observed (6 failing tests), then GREEN. There is no separate `test(...)` commit (ruling 6: one commit
per task); both are in 9a576aa3.

## Known Stubs

None. The panel's SHOW (16-11) and EXPORT (16-12) sections are later plans, as planned.

## Threat Flags

None beyond the plan's threat model:
- **T-16-20:** zoom snapped into [1, 10]; every non-finite or unmeasured input returns the view unchanged (tested);
  the slide is held by `cropLimit`, so the board is never lost.
- **T-16-21:** `preventDefault` on the wheel, Safari's gesture events and touch moves only over the canvas, which
  carries `touch-action: none`. The panel scrolls normally (case 5 checks neither the page nor the panel moved). Keys
  are taken only while the canvas itself has focus, and never with Ctrl, Alt or Cmd.

## Self-Check: PASSED

- FOUND: components/viewer/crop-zoom.ts, components/viewer/crop-zoom.test.ts, e2e/three-d-zoom.spec.ts,
  pictures/16-09-zoom-slide.png, pictures/16-09-pictures-source.tar.gz, and every modified file listed.
- FOUND commits: 020957e6, 9a576aa3.
- Acceptance greps:
  - `export function ViewerZoomRow`: 1.
  - `<ViewerZoomRow`: in zoom-viewport.tsx and three-d-screen.tsx.
  - `setViewOffset` in board-scene.ts: present.
  - `Hide the sidebar for a wider view` in three-d-screen.tsx: 1.
  - `Rotate the board`: 0.
  - `contextmenu`: 1.
  - `passive: false`: 1.
- No scratch script under the repo or `.planning`; the picture scripts are only in the archive.
- Not touched: STATE.md, ROADMAP.md, any desktop picture.

## Founder's look

Pending — presented by the orchestrator at the Wave 6 checkpoint.
