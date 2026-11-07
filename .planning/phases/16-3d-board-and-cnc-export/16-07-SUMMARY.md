---
phase: 16-3d-board-and-cnc-export
plan: 07
subsystem: 3D screen (turning, views, keys, the panel's VIEW and HARD EDGE sections)
status: complete
tags: [3d, turning, views, keyboard, accessibility, reduced-motion, D-04, D-10, D-13, D-17, D-30]
requires:
  - "16-06: mountBoardScene / BoardSceneHandle.setTurn, view-3d's quaternions and frameAtOne, THREE_D_COPY, ThreeDControls' children slot"
  - "16-02: hardEdgeBlendsFrom / hardEdgeEndsAt, hardEdgeBlendsFromSlider / hardEdgeEndsAtSlider, formatHardEdgeBlendsFrom / formatHardEdgeEndsAt, the store's setTailHardEdgeBlendsFrom / setTailHardEdgeEndsAt"
provides:
  - "view-3d: cameraAxes, quatConjugate, quatFromBasis, ViewName, VIEW_NAMES, VIEW_TURNS, VIEW_TURN_MS, GLIDE_MS, KEY_TURN_DEG, GLIDE_MAX_SPEED, dragTurn, keyTurn, slerpShortest, turnAngle, glideAt"
  - "frameAtOne solves end-on views for certain (bisection fallback)"
  - "BoardSceneHandle.setTurn(turn, frame?), frame(), roomReport(); RoomReport"
  - "ThreeDControls props onView, onReset, drawingUnavailable; ThreeDHardEdge; ThreeDSectionHeading"
  - "THREE_D_COPY: hardEdgeHeading, hardEdgeBlendsFrom, hardEdgeEndsAt, hardEdgeBlendsFromSlider, hardEdgeEndsAtSlider, hardEdgeFromTheTail, hardEdgeOffHint"
  - "DOM hooks: data-turn, data-room (on the canvas host), data-three-d-spoken (the live region), data-three-d-hard-edge (on | off)"
affects: [16-09, 16-10, 16-11, 16-12, 16-14, 16-15]
tech-stack:
  added: []
  patterns:
    - "The turn lives in a ref and goes straight to the scene; no per-frame value in React state (the rack's Pattern 7)"
    - "Every turn is a room-frame quaternion premultiplied onto the board's; nothing reads or writes the camera or a light"
    - "A view is a target turn reached by slerpShortest with the rack's easeOut, its 1x frame interpolated alongside"
    - "A control that changes the board on the 3D panel reads the lock (SliderRow); a control that only changes the view is data-lock-exempt"
key-files:
  created:
    - e2e/three-d-view.spec.ts
    - e2e/three-d-hard-edge.spec.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-07-views.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-07-pictures-source.tar.gz
  modified:
    - lib/geometry/view-3d.ts
    - lib/geometry/view-3d.test.ts
    - components/3d/board-scene.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - components/design/board-lock-scope.test.ts
decisions:
  - "A drag turns the board about ONE axis, square to the drag (up·dx + right·dy), by π·length/shorter side, so dragging straight back undoes it exactly"
  - "The glide's speed falls as (1 − t/600 ms)², so it totals a third of the release speed times 600 ms; the release speed is read over the drag's last 80 ms and capped at 0.01 rad/ms"
  - "Home and the arrow keys move at once (no tween), as the contract's 'key presses move at once' says; the view buttons and Reset View tween 400 ms with the rack's easeOut"
  - "The Hard Edge rows on 3D are tied to the board lock like RAILS' rows (they change the board); only VIEW is lock-exempt — see Deviations 2"
  - "frameAtOne falls back to bisection on the distance when its quick rounds don't settle (end-on views)"
metrics:
  duration: "about 95 minutes"
  completed: 2026-11-04
estimate:
  tokens: 105000
actuals:
  tokens: 18200
  tasks: 2
  commits: 5
---

# Phase 16 Plan 07: Turning the 3D board, the five views and Reset View, the keys, and the hard edge on the 3D panel Summary

The 3D board now turns any way you like under the shaping room's fixed lights. You can drag it with a mouse or a
finger and it glides to a stop when you let go. Or press one of five preset views or Reset View, or use the arrow
keys and Home. The 3D panel also has your two Hard Edge sliders (D-30), sharing one value with RAILS.

## What changes for the founder

- **Drag to turn.** Drag on the drawing with the mouse or one finger and the board turns like a ball under your hand:
  - A sideways drag swings the nose toward or away from you.
  - An up-and-down drag rolls it toward or away from you.
  - Dragging the length of the drawing's shorter side turns it half way round.
- **The light stays put.** The camera and the four lights never move, only the board does. So as it turns, the light
  rakes across the deck and rails, the way it does when you turn a blank under the bay's tubes.
- **It glides, and never turns by itself.** Let go of a moving drag and the board keeps turning, slowing to a stop
  over about 0.6 s. A new press, a view button or Reset View stops it at once. If your device is set to reduce
  motion, it stops dead the moment you let go, and the views jump straight there.
- **Five views and Reset View**, in a VIEW section on the panel: Deck, Bottom and Side on one row, Nose and Tail on
  the next, Reset View on its own. Each one turns the board the short way round in 0.4 s and fits it back to 1x,
  centred.
  - **Deck** is exactly TEMPLATE's outline lying nose-left.
  - **Side** is exactly ROCKER's side view, nose left, deck up.
  - **Bottom** is turned over along its length, nose left.
  - **Nose** and **Tail** look straight down the board's length, deck up.
  - **Reset View** goes back to the view the screen opens with.

  Tests prove the Deck and Side views against TEMPLATE's and ROCKER's own drawings, point by point.
- **The keyboard.** Click or Tab onto the drawing:
  - The arrow keys turn the board 15° at a time.
  - Home goes back to the first view.
  - The page never scrolls from those keys, and Tab moves on to the next control.
- **A screen reader** hears "Deck view." (and so on) after a view button, and "Back to the first view." after Reset
  View or Home. The drawing is described by its instructions. Turning by hand isn't announced.
- **The cursor** shows an open hand over the drawing and a closed one while you turn (with a mouse). A finger on the
  drawing never scrolls the page.
- **Your Hard Edge sliders on the 3D panel (D-30).** A HARD EDGE section sits between the title and VIEW. It holds
  RAILS' own two tail rows, `Hard Edge Blends From — 18"` and `Hard Edge Ends At — 29 1/2"` (the Fish's default end;
  30" on a 6'0"), in the same words, steps and ranges.
  - **One value, not two kept in step.** Move Ends At on 3D and RAILS' row reads the new distance, VOLUME's litres
    move and the 3D board redraws. Move it on RAILS and the 3D row follows.
  - **While the tail's Hard Edge is off**, the two rows stay in place, dimmed and out of reach, under one line:
    *Tick Hard Edge on RAILS' tail to set where it blends.*
  - **On a locked board** the two rows grey out, as RAILS' do, because they change the board. The view buttons only
    change what you see, so they stay live.
  - **Coming next (D-32, plan 16-15).** What fades between those two distances will grow to the tail's whole rail
    character, and the rows may be renamed then. This plan builds D-30 as it stands.
- **Nothing is remembered between visits** (D-17). The board always opens in the first view.
- **One fix you'd have seen:** the first Tail view filled the drawing with foam, because the fitting rule put the
  Fish's wide swallow tail almost on top of the camera. The fit is now solved for certain on every view (Deviation 1).

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-07-views.png` shows the Fish in Daylight at 1280 × 800:
- the first view and the five views, each picked with its button;
- one turned by hand;
- the panel with Hard Edge on, and with it off (dimmed).

The scripts are in `pictures/16-07-pictures-source.tar.gz` (pictures.config.ts, shots.spec.ts, compose.js).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Drag to turn under fixed lights; glide, none under reduced motion, no auto-turn | 1a8f920a | lib/geometry/view-3d.ts (+test), components/3d/board-scene.ts, components/3d/three-d-screen.tsx, e2e/three-d-view.spec.ts |
| 2 | Five views and Reset View, arrow keys and Home, the spoken view, the lock inventory | 33c774e9 | components/3d/three-d-controls.tsx, components/3d/three-d-screen.tsx, components/design/board-lock-scope.test.ts, lib/geometry/view-3d.test.ts, e2e/three-d-view.spec.ts |
| D-30 (ruling 6) | The 3D panel's Hard Edge rows, sharing RAILS' values | c8823f05 | components/3d/three-d-controls.tsx, three-d-copy.ts, three-d-screen.tsx, e2e/three-d-hard-edge.spec.ts |
| fix | The Tail view stands the board back far enough | 55738d7c | lib/geometry/view-3d.ts (+test), e2e/three-d-view.spec.ts |
| 3 | The founder turns the board (checkpoint) | (this SUMMARY's commit, with the pictures) | pictures/16-07-views.png, pictures/16-07-pictures-source.tar.gz, this SUMMARY |

**Tracer gate:** after Task 1, `e2e/three-d-view.spec.ts` cases 1–4 and `e2e/three-d-screen.spec.ts` passed on all
three projects (36 passed, 9 skipped by design), before any Task 2 work. As in 16-06, the interactive tracer
checkpoint is folded into the orchestrator's single checkpoint at Task 3.

## Verification

- **`npx vitest run lib/geometry/view-3d.test.ts`: 42 passed.**
  - The drag: half a turn about the picture's up axis for a sideways drag the length of the shorter side; a quarter
    turn about its right axis for half that downwards; dragging back undoes it to 1e-12; no drag is no turn; it
    answers a turn only.
  - The glide: none at 0, growing and slowing, done by GLIDE_MS about the drag's own axis, total = speed × 600 / 3,
    capped.
  - The five views' faces, nose and deck directions.
  - **Deck = TEMPLATE lying nose-left, exactly up to a shift.** Checked two ways: `silhouette()` points, and every
    vertex of `boardOutlineLoop`, to 1e-9 mm.
  - **Side = ROCKER's `rockerAt` / `deckAt` between the 12" stations**, to 1e-6 mm.
  - Both run on the Shortboard, Fish, Mid-length, Longboard and a swallow Fish.
  - slerpShortest never takes the long way (b or −b).
  - keyTurn is 15° about the right axis each way, and four presses make 60°.
  - **frameAtOne fits all six views at two window shapes, every point in front of the camera.** This was red before
    the fix and is green after.
- **`components/design/board-lock-scope.test.ts`: 22 passed.** `components/3d/three-d-controls.tsx` joins the
  inventory.
- **`npm test`: every assertion passes.** Each full run had one to ten heavy files time out under the shared
  machine's load: `rack-stand-in`, `blank-fit`, `round-tip`, `blank-card-art`, `rack-art`, `volume`,
  `finished-rail`. Run alone with `--testTimeout=120000`, all of them pass (876/876 and 173/173).
- **`npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors.** The one warning, in
  `lib/db/import-designs-action.test.ts`, was there before.
- **Browser specs**, `PW_PORT=3207 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-view.spec.ts
  e2e/three-d-screen.spec.ts e2e/three-d-hard-edge.spec.ts e2e/keyboard-focus.spec.ts`: all three projects green.
  - Last full run: 57 passed, 17 skipped by design, and the iPhone's case 5, which failed then.
  - After the case-5 timing fix below, case 5 passes on all three (3/3).
  - `e2e/three-d-view.spec.ts` cases:
    1. A real drag (the mouse on the computer and the iPhone, a trusted CDP finger on the Android) changes
       `data-turn`, leaves `data-room` (the camera's and lights' positions read back from the scene) identical,
       changes more than 1% of the canvas's pixels, and never scrolls the page.
    2. Reduced motion: no change after the release, read at once, at 100 ms and at 800 ms.
    3. The glide keeps changing the turn for at least 100 ms after the release, then rests.
    4. An idle page draws no frames over 2 s.
    5. Each view button reaches `VIEW_TURNS[name]` (to 1e-3, either sign), a second press changes nothing, and the
       live region reads the view's line.
    6. Reset View → the identity and `Back to the first view.`
    7. Keyboard (computer): four → and one ↓ turn the board without scrolling; Home resets; Tab leaves; the canvas
       is described by the instruction text.
    8. No `aria-pressed`; a group named Views of six; at an 820-wide window `Bottom` and `Reset View` are one line
       with no overflow.
    9. No-WebGL stub: all six buttons are disabled.
    10. A locked board: all six are enabled, and Side turns it.
  - `e2e/three-d-hard-edge.spec.ts` (computer + Android):
    1. Ends At moved on 3D → RAILS reads it and VOLUME's litres move; moved on RAILS → the 3D row follows.
    2. Hard Edge off → the group is `off`, the reason shows at full strength, and the rows are `inert` and
       `opacity-40` with both sliders unfocusable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The Tail view filled the drawing with foam**
- **Found during:** the Task 3 pictures.
- **Issue:** `frameAtOne` (16-06) refines the distance by scaling it by half/fill. That assumes the picture shrinks
  as one over the distance. End on, the board's near end sits close to the camera and grows much faster, so the
  rounds oscillated or clamped at the board's own reach. The Fish's swallow tail then nearly touched the camera
  (half-extent 2.37 instead of 0.85).
- **Fix:** when the quick rounds don't settle, the distance is solved by bisection. The bracket runs from the board's
  reach, where the near end would touch the camera, to a distance where it already fits. Views that converged before
  are unchanged (the quick rounds still return first). A new unit test fits every preset view on two boards at two
  window shapes; it was red before the fix, green after.
- **Files modified:** lib/geometry/view-3d.ts, lib/geometry/view-3d.test.ts
- **Commit:** 55738d7c

**2. [Rule 2 - Correctness; differs from ruling 6's wording] The 3D Hard Edge rows are tied to the board lock, not
`data-lock-exempt`**
- **The ruling** said every control on the 3D panel should be `data-lock-exempt`, "the lock never greys the 3D panel
  — UI-SPEC §9".
- **Why this differs:** §9's reason is that every control there only changes the view. The two Hard Edge rows change
  the board itself, and the design store refuses every change on a locked board. Marked exempt, they would look live
  and silently not move, which is exactly what the lock's visible half exists to prevent (`board-lock-scope.tsx`).
  RAILS' identical rows grey on a locked board.
- **What I did:** they use `SliderRow`, which reads the lock itself, so a locked board greys them exactly as it greys
  RAILS'. The six view buttons are `data-lock-exempt` and stay live (case 10).
- **For the orchestrator:** one line to reverse if the founder wants them exempt, but they would then do nothing on a
  locked board.
- **Files:** components/3d/three-d-controls.tsx
- **Commit:** c8823f05

**3. [Rule 3 - Blocking, test-only] The glide is proven with an in-page flick, not a driven mouse**
- **Found during:** Task 1.
- **Issue:** the suite's browsers draw without a graphics card. Each frame takes a few hundred milliseconds, and a
  driven mouse's moves arrive 250–450 ms apart. That is slower than the glide's 80 ms speed window, so no driven drag
  ever let go "while moving".
- **Fix:** cases 2 and 3 fire one quick flick's pointer events from inside the page, then watch `data-turn` with a
  MutationObserver. Case 1 still proves the same handlers with a real mouse and a real (CDP) finger. The screen's
  `setPointerCapture` is wrapped in a try/catch so a pointer the browser doesn't count as active can't throw.
- **Files:** e2e/three-d-view.spec.ts, components/3d/three-d-screen.tsx
- **Commit:** 1a8f920a

### Other notes

1. **The views' maths landed with Task 1.** `VIEW_TURNS`, `keyTurn` and `slerpShortest` were written in the same
   edit as the drag maths and committed in Task 1. Their tests came with Task 2, so Task 2's RED step was not a
   separate failing commit. The frameAtOne fix did go red, then green.
2. **`data-room` is rewritten after every frame** from the camera's and lights' own positions, not only at mount. That
   way the spec's before/after comparison reads the room as it stands after the turn.
3. **The live region speaks a repeat.** Each announcement is a fresh node (keyed by a count), so pressing Deck twice is
   heard twice.
4. **Pressing a view while loading.** A view picked while the drawing is still loading sets the turn and is framed at
   1x when the board appears. A drag made while loading is applied as it stands.
5. **No dragging while a canvas message shows.** The view buttons are `disabled` then (§8), and the arrow keys do
   nothing.
6. **The Hard Edge spec skips the iPhone.** Ruling 6 asked for a computer and one phone; the Android stands in for the
   phones.
7. **Board ids in the specs.** The locked-board seed (`three-d-locked-board` / `three-d-test-account`) follows
   rails-advanced's pattern.

## Known Stubs

None. The panel's SHOW (16-11) and EXPORT (16-12) sections and the zoom and slide (16-09) are later plans, as planned.

## Threat Flags

None beyond the plan's threat model:
- **T-16-16:** one frame per change; the glide ends by GLIDE_MS, its speed is capped, every product is renormalised,
  and an idle page draws nothing (case 4).
- **T-16-17:** only the arrows and Home are taken, only while the canvas itself has focus, with no modifier; Tab
  always leaves (case 7).

## Self-Check: PASSED

- FOUND: e2e/three-d-view.spec.ts, e2e/three-d-hard-edge.spec.ts, pictures/16-07-views.png,
  pictures/16-07-pictures-source.tar.gz, and every modified file listed.
- FOUND commits: 1a8f920a, 33c774e9, c8823f05, 55738d7c.
- No scratch script under the repo or `.planning`; the picture scripts are only in the archive.
- Not touched: STATE.md, ROADMAP.md, the nav, the tiles, lib/screen-steps.ts, e2e/helpers/screens.ts, any desktop
  picture.

## Founder's look

Presented by the orchestrator at the Wave 4 checkpoint, 2026-11-04, with the views picture. The founder: "Approved."
Merged into `board-3d` as 6451fbdf. The orchestrator's rulings: the Hard Edge sliders grey on a locked board as RAILS'
rows do (the executor's reading over ruling 6's wording — sliders change the board, the view buttons do not); the Tail
view fix and the glide's in-page test are accepted.
