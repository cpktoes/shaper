---
phase: quick-260909-ktq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/viewer/drag-selection.ts
  - components/viewer/drag-selection.test.ts
  - components/outline/outline-viewer.tsx
  - components/rocker/rocker-viewer.tsx
  - components/viewer/drag-pick-wiring.test.ts
  - e2e/touch-drag.spec.ts
autonomous: true
requirements: [QT-260909-ktq, PHON-04, PHON-05, TEST-01]

estimate:
  tokens: 133000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a phone, tapping one of the little control points on the board picks it — it lights up with a ring around it and stays lit after your finger comes off. Tapping a different point moves the pick to that one."
    - "Once a point is picked, you can put your thumb down ANYWHERE on the drawing — the empty white space beside the board, the bottom corner, the far edge — and slide it, and the picked point follows your thumb by exactly the same distance you moved it. Your thumb and the little number card are then out at the edge of the screen, and the curve you are shaping is in plain sight the whole time."
    - "Dragging a point directly, the way it works today, still works exactly the same: put your thumb straight on a point and it starts shaping from the first pixel, with no delay and no threshold. When you lift, that point is left picked, so you can carry straight on refining it from the edge of the screen."
    - "A quick tap on empty space — down and up without sliding — lets the picked point go, and the ring disappears. If nothing is picked, a touch on empty space still does nothing at all, exactly as today."
    - "The little card that reads back the numbers while you shape (Width, Offset, Nose Angle and so on) now sits above your THUMB rather than above the point. That is the whole point of the change: the thumb is out at the edge, so the card is out at the edge with it, and neither one is sitting on top of the board any more."
    - "Both drawings behave the same way: the five points on the TEMPLATE outline and the four curve handles on the ROCKER."
    - "Nothing whatsoever changes on a computer driven by a mouse. A mouse still grabs a point directly and drags it, there is no picking, no ring, no number card, and no point can be moved from across the drawing. This is proved by the desktop mouse-drag tests and by the five desktop baseline screenshots matching, unchanged and never regenerated."
    - "No board number changes anywhere. Every value a drag produces still comes out of the same calculators in lib/geometry/, still snaps to the same slider steps and still stops at the same limits — this task changes only WHERE your thumb has to be, never what the maths does with it."
  artifacts:
    - components/viewer/drag-selection.ts
    - components/viewer/drag-selection.test.ts
    - components/outline/outline-viewer.tsx
    - components/rocker/rocker-viewer.tsx
    - components/viewer/drag-pick-wiring.test.ts
    - e2e/touch-drag.spec.ts
  key_links:
    - "The remote drag is a DELTA, never an absolute position. `solveOutlineDrag(geometry, target, dragged)` and `solveSideProfileDrag(...)` both take THE DRAGGED BOARD POINT — so a remote drag must hand them `pointStart + (fingerNow - fingerStart)`, where `pointStart` is where the picked point was at touch-down and `fingerStart` is where the finger landed. Hand them the finger's own board point instead and the point teleports across the drawing on touch-down. That is the single most likely way to get this wrong, and Task 1's browser test is built to catch exactly it."
    - "`pointStart` and `fingerStart` are captured ONCE, at touch-down, and every move re-adds the FULL travel to them. Accumulating move-to-move deltas instead would drift, because `solveOutlineDrag` quantises its answer to the slider's own step (`OUTLINE_DRAG_LIMITS`, 0.25in / 1deg) — the point never lands exactly where it was asked to, and re-reading it each move would compound that rounding all the way across the gesture."
    - "1:1 in screen pixels comes free: both finger positions go through the SAME `toBoardPoint` at the SAME render scale, so a delta in board millimetres IS the pixel delta divided by the scale. No gain factor, no separate pixel path. It also stays correct in horizontal/rotated orientation, because `toBoardPoint` reads its matrix off the rotated content group (`contentRef`), not the SVG root — both endpoints of the delta go through the identical transform."
    - "MEASURED at plan time (`npx vitest run components/viewer/drag-spacing.test.ts --reporter=verbose`): the TEMPLATE outline renders at 0.2334 px/mm on a 390x844 iPhone 14 at the 66dvh pinned ceiling — about 5.9 screen px per board inch on the tightest 60x25in board, and about 8 px/in on the DEFAULT 72x19in board (its frame is taller, so it fits at a larger scale). One 0.25in Offset step is therefore about 2 screen px. This is the number that sizes the browser test's tolerance: a 40px thumb travel is roughly 5in of Offset, from a default start of -0.5in against a +/-12in clamp, so it cannot saturate, and a tolerance of +/-15px is over seven slider steps of slack while still failing a 0.5x gain (which would be 20px out) or a teleport (which would be hundreds)."
    - "`components/viewer/drag-pick-wiring.test.ts` asserts each viewer's source contains EXACTLY ONE `onPointerDown` (`source.match(/onPointerDown/g)?.length).toBe(1)`) and NO `onMouseDown|onTouchStart|onMouseMove|onTouchMove`. The new behaviour must therefore extend the ONE delegated `handlePointerDown` already on each root `<svg>`, never add a second press handler anywhere. `drag-readout-chip.test.ts` separately requires the identifier `touchDragTarget` to appear more than three times in each viewer — keep that state's name."
    - "The five desktop baseline screenshots (`e2e/desktop-baseline.spec.ts-snapshots/`) are macOS-rendered and are NEVER regenerated by this task. They stay green by construction: the selection ring is drawn only when `selectedTarget` is non-null, and `selectedTarget` is only ever set from inside a `pointerType === 'touch'` branch, so a mouse can never produce one pixel of it."
    - "The viewer toolbar buttons (Export Template, Construction Lines) are HTML `<button>` elements OUTSIDE the `<svg>` — `components/outline/outline-editor.tsx` renders `<ViewerToolbar>` as a sibling of the viewer, not a child of the drawing. A remote-drag press on the SVG therefore cannot swallow a toolbar tap, and pointer capture is only ever taken after a press that actually landed on the SVG. The browser test still keeps its empty-canvas probe out of the panel's top strip, where that row sits."
    - "`e2e/touch-drag.spec.ts` runs on the `android` project only — Playwright's WebKit exposes no native touch dispatch, so the `iphone` project skips, and the file's own `beforeEach` already enforces that. Every touch in it goes through a CDP `Input.dispatchTouchEvent` session, which is trusted native input; a synthetic `dispatchEvent('pointerdown')` would not exercise `setPointerCapture` or `touch-action: none` at all."
    - "Green baseline on clean `main` at plan time: `npx vitest run` = 49 test files, 2340 passed, 2 skipped (2342). `npx tsc --noEmit` = clean, exit 0. This task adds exactly one unit test file (`components/viewer/drag-selection.test.ts`), so the file count goes 49 -> 50 and no existing test's expectations change."
---

<objective>
On a phone, let a shaper TAP a control point to pick it, then move that point by sliding a thumb
anywhere on the drawing — including right out at the edge of the screen, well away from the curve.

Purpose: the founder, shaping on his phone, wrote it plainly: "Can we make the control points
selectable with a tap, then we can touch anywhere on the screen to move the point around? Right
now, the dim box and thumb covers the outline and it would be nicer to be able to drag around the
edges of the screen." He is describing a real problem with today's drag. To move a point you must
keep your thumb ON it, and Phase 9's readout card sits just above that same thumb — so the one
place you cannot see while you shape is the exact place you are shaping. A shaper adjusting a nose
curve is watching a shape, not a dot, and right now his own hand is parked on it.

This overturns one sentence of Phase 9's D-17 on purpose. D-17 recorded that the readout "is a
label, not the deferred magnifier or drag-with-offset aid". Drag-with-offset is precisely what the
founder has now asked for, so it stops being deferred. Everything else about D-17 survives: same
words, same numbers, same formatting through `measure-display.ts`, still touch-only, still gone the
instant the finger lifts, still sitting clear of the finger. It just follows the finger out to the
edge instead of staying over the board.

Output: one small pure module both drawings share (`components/viewer/drag-selection.ts` — the
tap-versus-drag threshold, the pick state machine, and the delta helper), the outline and rocker
viewers wired to it, unit tests for the module, source-contract additions to the existing wiring
test, and real (CDP) touch tests in the browser suite that tap a point, then drag it from the far
edge of the panel and prove it followed the thumb one-for-one. Three commits. Nothing under
`lib/geometry/` is touched, nothing under `components/ui/` is touched, no editor control changes,
and on a mouse-driven desktop not one rendered pixel is different.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/STATE.md

@components/outline/outline-viewer.tsx
@components/rocker/rocker-viewer.tsx
@lib/geometry/outline-drag.ts
@lib/geometry/rocker-drag.ts
@components/viewer/drag-pick-wiring.test.ts
@components/viewer/drag-readout-chip.test.ts
@e2e/touch-drag.spec.ts
@e2e/desktop-regression.spec.ts
</context>

<decisions>
These are the orchestrator's defaults, recorded so the founder can redirect any of them at review.
Every task below cites the ones it implements.

- **D-01: Everything here is touch-only, keyed on `pointerType === "touch"`.** A mouse or a pen
  keeps today's behaviour exactly: press a point, drag it, release. No picking, no ring, no number
  card, no moving a point from across the drawing (PHON-05). The gate is the same one the readout
  card already uses, so there is one rule, not two.
- **D-02: A tap on a point picks it, and a direct drag picks it too.** A touch that lands within
  the finger-sized hit radius of a point picks that point immediately, on touch-down — so the ring
  appears under the thumb as confirmation. If the finger then slides, the point shapes from the
  first pixel exactly as it does today (Phase 9's D-16, no movement threshold, unchanged). If the
  finger lifts without sliding, it was a tap. Either way the point is left picked, so a shaper can
  drag it directly once and then refine it from the edge without re-picking.
- **D-03: With a point picked, a touch anywhere on the drawing moves it by the finger's travel,
  1:1.** Record where the point is and where the finger landed at touch-down; on every move hand
  `pointStart + (fingerNow - fingerStart)` to the existing solver. A thumb travelling 40 screen px
  moves the point 40 screen px. Limits, snapping and the "only the fields this target owns" rule
  are untouched, because the solver is unchanged. A finer-than-1:1 gain is a possible follow-up,
  not this task.
- **D-04: A touch-down that lands within reach of a point always picks that point, even mid-pick.**
  Today's nearest-point rule (D-15) still decides; the newly touched point becomes the pick and the
  gesture is a direct drag on it. Only a touch-down that reaches NO point becomes a remote drag.
- **D-05: A tap on empty canvas lets the pick go.** Down and up on empty canvas with less than the
  threshold of travel clears the pick. With nothing picked, a touch on empty canvas does nothing at
  all, exactly as today. A cancelled gesture (`pointercancel`) never changes the pick.
- **D-06: The number card follows the FINGER, not the point.** Today it is anchored above the
  point; from now on it is anchored above the finger's live position, in both direct and remote
  drags. During a direct drag that is where it already effectively sits, so nothing looks different;
  during a remote drag it goes out to the edge with the thumb, which is the founder's actual
  request. Same card, same code, same clamp against the drawing's own edge — one anchor changes.
- **D-07: A picked point wears an accent halo ring, drawn from the palette the drag targets already
  use.** One extra concentric circle at `DRAG_SELECTED_HALO_PX = 11` (the drag target's own outer
  disc is 7), `fill="none"`, stroked in `var(--color-surf-accent-ink)` at the existing
  `DRAG_TARGET_RING_PX` width. No new colour token, no new component. It is drawn only when a point
  is picked, which can only happen on touch, which is why a desktop screenshot cannot change.
- **D-08: The shared, pure parts live in ONE module — `components/viewer/drag-selection.ts` — not
  in `lib/geometry/`.** This is interaction state (what a tap means, what a lift means), not board
  maths: it decides nothing about the shape of a board and reads no board spec, so putting it under
  `lib/geometry/` would blur the one boundary CLAUDE.md's Rule 1 exists to keep sharp. It sits
  beside the two viewers' other shared source-contract tests in `components/viewer/`, and it gets
  the same unit-test treatment a geometry module would.
- **D-09: The tap-versus-drag threshold is a named constant, `TAP_MAX_TRAVEL_PX = 8`, and it only
  decides what a LIFT means.** No gesture is ever delayed by it — a direct drag still shapes from
  pixel one (D-02), and a remote drag still moves the point from pixel one. The threshold is read
  once, on lift, to answer a single question: was that a tap on empty canvas (let the pick go) or a
  small drag from the edge (keep it)? A remote nudge under 8px does move the point and then clears
  the pick, which is harmless in practice — 8px is about four slider steps at phone scale, usually
  rounding to no change at all.
</decisions>

<measured_baseline>
Measured by the planner on clean `main` at planning time. Facts to work from, not values to
hardcode into product code.

**Green baseline.** `npx vitest run` — **49 test files, 2340 passed, 2 skipped (2342)**.
`npx tsc --noEmit` — clean, exit 0. This task adds exactly one unit test file, so the file count
goes 49 -> 50; no existing test's expectations change.

**Render scale.** From `drag-spacing.test.ts`'s own logging at plan time:

| Drawing | Device | Render scale | Closest pair of drag points |
|---|---|---|---|
| outline | iPhone SE 375x667 | 0.2241 px/mm | 58.7px |
| outline | iPhone 14 390x844 | 0.2334 px/mm | 61.2px |
| rocker | iPhone SE 375x667 | 0.2188 px/mm | 40.2px |
| rocker | iPhone 14 390x844 | 0.2769 px/mm | 50.8px |

Those are the tightest realistic board (60x25in). The DEFAULT board is 72x19in
(`DEFAULT_BOARD_SPEC`, `lib/geometry/board.ts:115`) — taller frame, so it fits at a larger scale,
about **8 screen px per board inch** on a Pixel 7. One 0.25in `widePointOffset` step is therefore
about **2 screen px**, and the default offset is **-0.5in** against a **+/-12in** clamp
(`OUTLINE_DRAG_LIMITS.widePointOffsetIn`). A 40px thumb travel is about 5in of Offset in either
direction and cannot saturate the clamp. That is what sizes Task 1's browser tolerance.

**The two existing browser cases that must stay green** (`e2e/touch-drag.spec.ts`):
1. a real touch drag on the widepoint moves Offset, shows the readout mid-drag, leaves no text
   selection;
2. nearest-point-wins — a touch nearer one point moves that point's own field, not its neighbour's.
Both start their touch ON a drag point, so both are direct drags and both are unaffected by D-03.
Under D-02 each now also leaves its point picked when the finger lifts; neither test asserts
anything about that, so neither needs editing.

**The source-contract gates already standing over these two files** — read them before editing
either viewer, because two of them constrain the shape of the fix:

| Gate | File | What it pins |
|---|---|---|
| exactly one press handler | drag-pick-wiring.test.ts | `source.match(/onPointerDown/g)?.length` is 1 per viewer |
| no per-pointer-type handlers | drag-pick-wiring.test.ts | no `onMouseDown`/`onTouchStart`/`onMouseMove`/`onTouchMove` |
| the card is really read | drag-readout-chip.test.ts | the identifier `touchDragTarget` appears more than 3 times per viewer |
| no bare conversion factor | drag-readout-chip.test.ts | `25.4` never appears in either viewer outside comments |

**Where the pieces are today.**

| What | outline-viewer.tsx | rocker-viewer.tsx |
|---|---|---|
| live-drag ref | `draggingRef` ~line 295 | ~line 482 |
| touch-card state | `touchDragTarget` ~line 300 | ~line 487 |
| screen -> board | `toBoardPoint` ~line 412 | ~line 790 |
| move handler | `handleDragMove` ~line 424 | ~line 800 |
| the one press handler | `handlePointerDown` ~line 442 | ~line 819 |
| lift/cancel handler | `handleDragEnd` ~line 455 | ~line 832 |
| hit radius in mm | ~line 603 | ~line 698 |
| card box + anchor | ~line 620-658 | ~line 727-762 |
| drag-target visuals | ~line 785-800 | ~line 1067-1080 |
| hit circles (`data-drag-target`) | ~line 810-820 | ~line 1087-1097 |
| board -> px projectors | `pxX` / `lenToY` ~line 306 | the viewer's own `pxX`/`pxY` |
| board -> viewBox | `toViewBoxPoint` | `toViewBoxPoint` ~line 875 |

The two files are structurally near-identical here; the same edit lands twice, with the rocker's
second axis being `height` where the outline's is `halfWidth`.
</measured_baseline>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tap a point on the TEMPLATE, then shape it with a thumb at the edge of the screen</name>
  <files>components/viewer/drag-selection.ts, components/viewer/drag-selection.test.ts, components/outline/outline-viewer.tsx, e2e/touch-drag.spec.ts</files>
  <read_first>
Read `components/outline/outline-viewer.tsx` once, in full, before writing anything — the drag
wiring, the card box and the drag-target visuals are three separate regions of one file and this
task edits all three. Read `lib/geometry/outline-drag.ts`'s `solveOutlineDrag` signature and the
doc comment above `nearestOutlineDragTarget`. Read the two existing cases in
`e2e/touch-drag.spec.ts` for the CDP touch idiom. Implements D-01, D-02, D-03, D-04, D-05, D-06,
D-07, D-08, D-09.
  </read_first>
  <behavior>
Unit tests for `components/viewer/drag-selection.ts`, written first, in
`components/viewer/drag-selection.test.ts`:

- `TAP_MAX_TRAVEL_PX` is exported and is 8.
- `remoteDragPoint({x:100,y:50}, {x:300,y:400}, {x:340,y:380})` returns `{x:140, y:30}` — the point
  moved by the finger's travel, not to the finger.
- `remoteDragPoint` with `fingerNow` equal to `fingerStart` returns `pointStart` unchanged.
- `remoteDragPoint` is pure: called twice with the same three inputs it returns equal values, and
  it mutates none of its arguments.
- `nextSelection({selected:null, mode:"idle"}, {type:"touchDown", hit:"widepoint"})` is
  `{selected:"widepoint", mode:"direct"}` — a touch on a point picks it immediately (D-02).
- `nextSelection({selected:"widepoint", mode:"idle"}, {type:"touchDown", hit:"noseHandle"})` is
  `{selected:"noseHandle", mode:"direct"}` — a nearer point wins the pick (D-04).
- `nextSelection({selected:"widepoint", mode:"idle"}, {type:"touchDown", hit:null})` is
  `{selected:"widepoint", mode:"remote"}` — empty canvas with a pick starts a remote drag (D-03).
- `nextSelection({selected:null, mode:"idle"}, {type:"touchDown", hit:null})` is
  `{selected:null, mode:"idle"}` — empty canvas with no pick does nothing (D-05).
- `nextSelection({selected:"widepoint", mode:"direct"}, {type:"touchUp", travelPx:0})` is
  `{selected:"widepoint", mode:"idle"}` — a tap on a point leaves it picked.
- `nextSelection({selected:"widepoint", mode:"direct"}, {type:"touchUp", travelPx:120})` is
  `{selected:"widepoint", mode:"idle"}` — a direct drag leaves it picked too.
- `nextSelection({selected:"widepoint", mode:"remote"}, {type:"touchUp", travelPx:0})` is
  `{selected:null, mode:"idle"}` — a tap on empty canvas lets the pick go (D-05).
- `nextSelection({selected:"widepoint", mode:"remote"}, {type:"touchUp", travelPx:TAP_MAX_TRAVEL_PX})`
  is `{selected:null, mode:"idle"}` — the threshold is inclusive: at exactly 8px it is still a tap.
- `nextSelection({selected:"widepoint", mode:"remote"}, {type:"touchUp", travelPx:TAP_MAX_TRAVEL_PX + 1})`
  is `{selected:"widepoint", mode:"idle"}` — one pixel past the threshold it is a drag and the pick
  survives.
- `nextSelection({selected:"widepoint", mode:"remote"}, {type:"cancel"})` is
  `{selected:"widepoint", mode:"idle"}` — a cancelled gesture never changes the pick (D-05).
- `nextSelection` returns a NEW object and never mutates the state passed in.
- The state machine is generic over the target name: the same calls type-check and behave
  identically with `SideProfileDragTarget`-shaped strings (`"noseTipHandle"` etc.), proving Task 3
  can reuse it without a second copy.
  </behavior>
  <action>
**Step 1 — the shared module (RED first).** Write `components/viewer/drag-selection.test.ts`
against the behaviours above and watch it fail, then write
`components/viewer/drag-selection.ts` to make it pass.

The module is pure: no React, no DOM, no imports from `lib/geometry/` and none from either viewer.
Its doc comment explains, in a shaper's terms, what it decides — a tap picks a point, a slide moves
it, a tap on empty space lets it go — and states why it is here rather than under `lib/geometry/`
per D-08. Export exactly four things:

- `TAP_MAX_TRAVEL_PX`, the constant of D-09, with a comment giving the measured reason for 8: about
  four `widePointOffset` slider steps at phone render scale, so a gesture under it is below the
  resolution a shaper could have meant.
- `DragPointXY`, a readonly `{ x: number; y: number }` pair in board millimetres, documented as the
  drawing's two axes — `x` is along the board (station) in both viewers, `y` is out from the
  centreline for the outline and up off the baseline for the rocker. Deliberately axis-neutral so
  one helper serves both drawings without either viewer's branded `Mm` types leaking in here.
- `remoteDragPoint(pointStart, fingerStart, fingerNow)`, returning
  `{ x: pointStart.x + (fingerNow.x - fingerStart.x), y: pointStart.y + (fingerNow.y - fingerStart.y) }`.
  Its comment carries the load-bearing warning: the caller must pass the point's position captured
  at touch-down, never its live position, because the solver quantises and re-reading the live
  point each move would compound that rounding across the gesture.
- `nextSelection<T extends string>(state, event)`, plus the `DragSelection<T>` and
  `DragSelectionEvent<T>` types, implementing exactly the transitions in `<behavior>`. Mode is
  `"idle" | "direct" | "remote"`. Keep it total — every combination returns a state, and a
  `touchUp` arriving in `"idle"` leaves the pick alone.

Commit this step on its own if the RED/GREEN split is clean; otherwise fold it into the task's
single commit.

**Step 2 — wire the outline viewer.** Extend the ONE existing `handlePointerDown` on the root
`<svg>`; do not add a second press handler anywhere (the wiring gate counts them).

State and refs:
- Keep `touchDragTarget` exactly as it is, name included — it still means "which point a live TOUCH
  gesture is moving", it still drives the number card, and it is still cleared on lift.
- Add `selectedTarget` / `setSelectedTarget` state, `OutlineDragTarget | null`, the picked point.
  This drives the halo ring and the `data-selected` hook, and it survives a lift.
- Add `touchFingerBoard` state, an `OutlineDragPoint | null` holding the finger's live board
  position — the number card's new anchor (D-06). Set on touch-down and every touch move, cleared
  on lift and cancel.
- Widen `draggingRef` from a bare target to the live gesture record: the target, whether the
  gesture is remote, the point's board position at touch-down, the finger's board position at
  touch-down, the finger's client x/y at touch-down, and the running maximum travel in CSS px.

`handlePointerDown`, after the existing `toBoardPoint` and `nearestOutlineDragTarget` calls:
- For any pointer that is not a touch, keep today's path byte-for-byte — no hit, return; hit,
  `preventDefault`, set the gesture record with remote false, take pointer capture. A mouse must
  never reach `nextSelection`, never set `selectedTarget` and never set `touchFingerBoard`. State
  this in the comment, citing PHON-05.
- For a touch, ask `nextSelection` with `{ selected: selectedTarget, mode: "idle" }` and
  `{ type: "touchDown", hit }`. If the answer's mode is `"idle"`, return without capturing — empty
  canvas with nothing picked still does nothing. Otherwise `preventDefault`, take pointer capture,
  set `selectedTarget` and `touchDragTarget` to the answer's selection, set `touchFingerBoard` to
  the touch's board point, and build the gesture record. For a remote gesture the record's
  `pointStart` is the picked target's own entry in `dragPointsAt` (the same array the pick was made
  against, so there is one source of truth for where the points are).

`handleDragMove`:
- Bail as today when there is no live gesture.
- Update the gesture's running travel to the larger of itself and the distance from the touch-down
  client x/y to this event's client x/y. Client coordinates are already CSS px, so no scale
  conversion is involved.
- For a remote gesture, build the dragged point through `remoteDragPoint` — mapping
  `{station, halfWidth}` into `{x, y}` and back with `mm()` — and pass that to `solveOutlineDrag`.
  For a direct gesture pass the finger's board point exactly as today.
- On a touch, also set `touchFingerBoard` to the finger's board point so the card follows it.

`handleDragEnd`: split lift from cancel. On lift, if the gesture was a touch, run `nextSelection`
with the gesture's mode and its running travel and store the resulting selection. On cancel, run
the `"cancel"` event so the pick is left alone. Both clear the gesture ref, clear `touchDragTarget`
and `touchFingerBoard`, and release pointer capture exactly as today. Wire the two to
`onPointerUp` and `onPointerCancel` separately; do not merge them.

**Step 3 — the card follows the finger (D-06).** In the card's box computation, replace the
`dragTargets.find(...)` anchor lookup with the finger's own position, projected through the
viewer's existing `pxX` / `lenToY` and then `toViewBoxPoint` — the identical path the point's
anchor took, so the clearance, the gap above the finger and the clamp against the drawing's edge
all keep working untouched. Guard on `touchDragTarget && touchFingerBoard`. Rewrite the comment
above it: it currently says the card sits above the point, and that stops being true.

**Step 4 — the halo ring (D-07).** Add `DRAG_SELECTED_HALO_PX = 11` beside
`DRAG_TARGET_OUTER_PX`. In the drag-target visual group, when a target is the picked one, draw one
extra concentric circle at that radius, `fill="none"`,
`stroke="var(--color-surf-accent-ink)"`, `strokeWidth={DRAG_TARGET_RING_PX * handleUnit}`, inside
the existing `pointerEvents="none"` group. Add `data-selected={isSelected ? "true" : undefined}` to
that target's transparent hit circle — `undefined` so React omits the attribute entirely when the
point is not picked, which keeps the phone specs that count `[data-drag-target]` elements exact.
Do not add or remove any element from either mapped list; the hit circles stay one per target.

**Step 5 — the browser proof.** Add one case to `e2e/touch-drag.spec.ts`, inside the existing
android-only describe:

`"a tap picks the widepoint, then a thumb at the edge of the panel moves it one-for-one"`.

- Go to `/design/outline`, open the "Fine adjust" disclosure first (the existing cases' order), read
  the Offset label's text.
- Tap the widepoint: CDP `touchStart` then `touchEnd` at the same coordinates, on the centre of
  `[data-drag-target="widepoint"]`. Assert the handle now carries `data-selected="true"` and that
  the Offset label still reads exactly what it read before — a tap picks, it does not shape.
- Find empty canvas. Take the bounding box of the SVG that owns the drag targets
  (`svg:has([data-drag-target])`) and the centres of all five `[data-drag-target]` handles. Build a
  handful of candidate probes inset 14px from the box's left, right and bottom edges — at 50%, 85%
  and 96% of the box height, never in its top 20%, where the toolbar row sits — and choose the one
  whose distance to the NEAREST handle centre is largest. Assert that distance is greater than 60px
  and record it in the test's own comment as the reason the probe is genuinely "nowhere near the
  point". Derive it all at run time; hardcode no coordinate.
- Remote-drag from there: `touchStart` at the probe, then `touchMove` in four 10px steps to
  `probeY - 40` (a 40px travel toward the nose, sized in the measured baseline above so the +/-12in
  Offset clamp cannot saturate), asserting mid-gesture that the card's own combined
  `/^Offset — /` text run is visible — with the finger still 60px+ from every handle.
- Before the `touchEnd`, read the widepoint handle's bounding box again. Assert it moved in the
  SAME direction as the thumb (its centre y decreased) and that
  `Math.abs(deltaPointY - deltaFingerY) <= 15` — one-for-one within about seven slider steps. Note
  in the comment what each wrong implementation would score: a half-speed gain misses by 20px, and
  passing the finger's absolute board point to the solver instead of the delta teleports the point
  hundreds of pixels.
- `touchEnd`, then assert the card is gone and `data-selected` is still `"true"` — the pick
  survives a remote drag (D-05).
  </action>
  <verify>
    <automated>npx vitest run components/viewer/drag-selection.test.ts components/viewer/drag-pick-wiring.test.ts components/viewer/drag-readout-chip.test.ts</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>PW_PORT=3123 npx playwright test --project=android e2e/touch-drag.spec.ts</automated>
    <automated>PW_PORT=3123 npx playwright test --project=desktop e2e/desktop-regression.spec.ts</automated>
  </verify>
  <done>
`npx vitest run` is 50 files green (49 before, plus `drag-selection.test.ts`) with no existing
expectation changed. On the android project, all three cases in `e2e/touch-drag.spec.ts` pass: the
two that were there before, plus the new one that taps the widepoint, drags it from the panel edge
and proves it followed the thumb within 15px of one-for-one. The desktop mouse-drag regression is
green. `npx tsc --noEmit` is clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Prove the rest of the picking rules on a real phone, and pin the wiring in source</name>
  <files>e2e/touch-drag.spec.ts, components/viewer/drag-pick-wiring.test.ts</files>
  <read_first>
Read the whole of `e2e/touch-drag.spec.ts` as Task 1 left it, and
`components/viewer/drag-pick-wiring.test.ts` in full — the new assertions join the existing
per-viewer describes rather than starting a third one. Implements D-02, D-04, D-05, D-08.
  </read_first>
  <action>
**The remaining browser cases.** Add to the android-only describe in `e2e/touch-drag.spec.ts`,
reusing Task 1's empty-canvas probe helper (lift it to a module-level function in that file if it
is still inline — one probe finder, used by every case that needs one):

- `"a tap on empty canvas lets the picked point go"`: tap the widepoint, assert
  `data-selected="true"`; tap the probe (touchStart + touchEnd, same coordinates, zero travel);
  assert the widepoint no longer carries `data-selected`, and that Offset is unchanged from before
  the whole sequence — letting a point go shapes nothing.
- `"a direct drag leaves its point picked, so the next move can come from the edge"`: drag the
  widepoint directly, thumb on the point, as the first existing case does; on lift assert
  `data-selected="true"`; then remote-drag from the probe and assert Offset changes again. This is
  the founder's actual working rhythm — one direct drag to get close, then refinement from the edge
  — and it is the case that would break if the pick were only ever set by a zero-travel tap.
- `"a touch on empty canvas with nothing picked still does nothing"`: reload the page so nothing is
  picked, then touchStart at the probe, four touchMoves of 40px, touchEnd. Assert every one of the
  five drag targets' bounding boxes is unmoved and that no `/^Offset — /` card ever appeared.
  This is the guard on today's behaviour surviving (D-05) — the case that would fail if the remote
  drag grabbed the nearest point instead of requiring a pick.

Keep every case's assertions on Playwright's retrying matchers (`toHaveAttribute`, `toHaveText`,
`not.toHaveText`), never a bare `.textContent()` compare, so they settle after React's post-touch
re-render rather than racing it — the reason the existing cases already do this is written in their
own comment.

**The source contract.** Add to each of the two existing per-viewer describes in
`components/viewer/drag-pick-wiring.test.ts` — the outline describe now, and Task 3 will find the
rocker's already written and failing, which is the right order. Every assertion is a positive
match on an identifier, so no comment anywhere can accidentally satisfy or break one:

- the viewer imports from `@/components/viewer/drag-selection` — one shared module, not a
  hand-mirrored copy in each file (D-08);
- the viewer calls `nextSelection` at least twice (a press decides, a lift decides);
- the viewer calls `remoteDragPoint` exactly once — one place computes the moved point, so a
  second, divergent copy cannot appear;
- the viewer passes `travelPx`, i.e. it measures the gesture's travel and hands it to the module
  rather than comparing against its own threshold;
- the viewer renders `data-selected`, the picked-point hook the browser tests locate;
- and the file still has exactly one `onPointerDown` and none of the four banned per-pointer-type
  handlers — the two assertions that are already there, left exactly as they are.

Write the describe-level comment for the new block in the same voice as the file's existing one:
what a shaper gets from the property, then why it is asserted on source text rather than by
rendering (the suite's `node` environment, and the viewers' import chain reaching the database
client through the design store).
  </action>
  <verify>
    <automated>npx vitest run components/viewer</automated>
    <automated>PW_PORT=3123 npx playwright test --project=android e2e/touch-drag.spec.ts</automated>
  </verify>
  <done>
Six cases in `e2e/touch-drag.spec.ts` pass on the android project — the two originals and four new
ones covering tap-picks, tap-clears, pick-survives-a-direct-drag, and nothing-picked-does-nothing.
`components/viewer/drag-pick-wiring.test.ts` asserts the outline viewer's use of the shared module
and passes; its rocker describe carries the same assertions and is expected to fail until Task 3.
  </done>
</task>

<task type="auto">
  <name>Task 3: The ROCKER's four curve handles get the same thumb, and the desktop is proved untouched</name>
  <files>components/rocker/rocker-viewer.tsx, e2e/touch-drag.spec.ts</files>
  <read_first>
Read `components/rocker/rocker-viewer.tsx` once, in full, and `components/outline/outline-viewer.tsx`
as Tasks 1-2 left it — this task lands the same edit a second time, and the two files' drag
regions should read as siblings when it is done. Read `solveSideProfileDrag`'s signature in
`lib/geometry/rocker-drag.ts`. Implements D-01 through D-09 for the rocker.
  </read_first>
  <precondition>`node_modules/` is installed in this worktree (`npm install --no-audit --no-fund` once) and the Chromium and WebKit browsers are already present from the repo-level `npx playwright install chromium webkit` — this task runs the full browser suite and must never install browsers itself.</precondition>
  <action>
**Wire the rocker viewer**, mirroring Task 1's outline edit step for step: the gesture record on
`draggingRef`, `selectedTarget`, `touchFingerBoard`, the touch branch in the ONE existing
`handlePointerDown`, the travel measurement and `remoteDragPoint` in `handleDragMove`, the split
lift/cancel handlers, the card anchored on the finger through the viewer's own `pxX`/`pxY` and
`toViewBoxPoint`, `DRAG_SELECTED_HALO_PX` and the halo ring, and `data-selected` on the hit circle.

Two things differ and only two: the drag point's second axis is `height`, not `halfWidth`, so the
`DragPointXY` mapping reads `{ x: station, y: height }`; and the targets are the four
`SideProfileDragTarget` handles. `nextSelection` is generic over the target name (Task 1 proved
exactly this in its unit tests), so it is imported and called, never re-implemented. `remoteDragPoint`
is imported, never re-implemented. If any part of the outline's version turned out to need a helper
that would have to be copied here, hoist it into `components/viewer/drag-selection.ts` instead and
extend that module's unit tests — a second copy in a second viewer is what this task exists to
avoid.

Keep the rocker's own `touchDragTarget` name and its gates: exactly one `onPointerDown`, no
per-pointer-type handlers, `touchDragTarget` still appearing more than three times, no `25.4`.

**One rocker browser case.** Add to `e2e/touch-drag.spec.ts` a second describe,
android-only by the same `beforeEach` skip, for `/design/rocker`:
`"a tap picks the nose tip handle, then a thumb at the edge of the panel moves it"`. Reuse the
probe helper. Tap `[data-drag-target="noseTipHandle"]`, assert `data-selected="true"` and that the
Nose Angle label is unchanged; then remote-drag 40px from the probe and assert Nose Angle changed
and the handle moved in the thumb's direction. The rocker's own drag targets sit closer together
than the outline's (40.2px on the tightest board at iPhone SE scale, per the measured baseline), so
assert the probe clears the nearest handle by more than 60px exactly as the outline case does —
if a rocker panel cannot produce a 60px-clear probe on a Pixel 7, lower that one threshold to 45px
in the rocker case only, and say in the comment which measured number justified it. Do not weaken
the outline case.

**Prove the desktop is untouched.** Run the full browser suite. The five baseline screenshots must
match as they stand; `--update-snapshots` is not used, at any point, for any reason. If a baseline
fails, that is a real regression in this task's work — a mouse reached a touch-only branch — and it
is fixed in the code, never absorbed into a new screenshot.

Finish by running the whole unit suite, the type check and the linter, and confirm the test-file
count is 50 with 2340+ passing and no previously-passing test now failing.
  </action>
  <verify>
    <automated>npx vitest run</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run lint</automated>
    <automated>PW_PORT=3123 npx playwright test</automated>
    <human-check>On a real phone at the deployed preview: on TEMPLATE, tap the widepoint — it should light up with a ring. Then put a thumb down in the empty space at the bottom-right of the drawing and slide it up and down: the widepoint should follow your thumb up and down the board, the little Offset card should ride along beside your thumb at the edge, and the outline should be in plain sight the whole time. Tap the empty space once and the ring should go out. Repeat on ROCKER with the nose tip handle. Then check on a computer with a mouse that TEMPLATE and ROCKER drag exactly as they always have, with no ring and no card.</human-check>
  </verify>
  <done>
Both drawings behave identically under a thumb. `npx vitest run` is 50 files green,
`npx tsc --noEmit` is clean, `npm run lint` is clean, and `PW_PORT=3123 npx playwright test` passes
every project — including the five desktop baseline screenshots, matched against the committed
images with no regeneration, and the desktop mouse-drag regression on both TEMPLATE and ROCKER.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| finger → viewer state | Untrusted pointer coordinates enter the SVG and are converted to board millimetres. This is the only boundary this task moves anything across. |
| viewer → design store | A solved spec patch is written to the shared board state, which the autosave path may later persist. Unchanged by this task: the same solver, the same patch shape. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ktq-01 | Tampering | `remoteDragPoint` → `solveOutlineDrag` / `solveSideProfileDrag` | low | mitigate | A remote drag reaches the solvers through the identical call the direct drag already uses, so every value still snaps to its slider step and clamps to `OUTLINE_DRAG_LIMITS` / the rocker's own ranges. No new path can write an out-of-range spec field. Pinned by the existing round-trip solver tests, which this task does not touch. |
| T-ktq-02 | Denial of Service | touch move handler | low | accept | Each touch move sets two pieces of React state and runs one O(5) solve — the same per-move cost the drag already had, plus one anchor projection. A rapid touch stream cannot do more work per frame than the browser delivers events. |
| T-ktq-03 | Information Disclosure | the readout card | low | accept | The card's words come from the same `measure-display.ts` boundary the sidebar sliders use and show only the shaper's own board numbers, now positioned beside the finger. No new data reaches the screen. |
| T-ktq-SC | Tampering | npm/pip/cargo installs | n/a | n/a | This task installs no package. `npm install --no-audit --no-fund` restores the committed lockfile in a fresh worktree and adds nothing; no legitimacy gate applies. |
</threat_model>

<execution_constraints>
- Work in a **git worktree**, not the main checkout.
- `npm install --no-audit --no-fund` once, before any Playwright run.
- **`PW_PORT=3123` on every Playwright invocation.** Port 3000 is the founder's own dev server and
  3100 belongs to the suite's default; never take either.
- Browsers are already installed. **Never run `npx playwright install`.**
- **Never run `--update-snapshots`.** The five desktop baselines are macOS-rendered, local, and
  authoritative as committed.
- `npx tsc --noEmit` for the type check — if route types are missing in a fresh worktree, run
  `npx next typegen` once first. `npx vitest run`, never bare `vitest`. `npm run lint`.
- `npm run build` runs on `main` after the merge, by the orchestrator — not in the worktree
  (Turbopack will not resolve `next` from one).
- **Do not edit `lib/geometry/*`.** No geometry changes are needed: both solvers already take the
  dragged board point, which is exactly what the delta produces. If a genuinely geometric helper
  turns out to be needed, CLAUDE.md Rule 1 applies in full — pure, under `lib/geometry/`, unit
  tested against a regenerated fixture, never a hand-transcribed number.
- Do not edit `components/ui/*`, either editor's control panels, or any e2e spec other than
  `e2e/touch-drag.spec.ts`.
- If a dev server is needed for a measurement, `curl` port 3100 first and reuse it; otherwise start
  one on a port at or above 3130 and stop it when done. Never touch `.next/dev/lock`.
- Every commit subject is plain English about what the thumb does on the screen, not about which
  component re-renders. Suggested subjects:
  1. `feat(quick): pick a control point with a tap, then shape it with a thumb at the edge of the screen`
  2. `test(quick): prove tapping picks and lets go, and that the edge drag needs a pick first`
  3. `feat(quick): the rocker's curve handles take the same thumb, and the desktop is proved unchanged`
</execution_constraints>

<verification>
- `npx vitest run` — 50 test files, 2340+ passing, 2 skipped; the file count rose by exactly one
  (`components/viewer/drag-selection.test.ts`) and no previously-passing test changed expectation.
- `npx tsc --noEmit` — clean, exit 0.
- `npm run lint` — clean.
- `PW_PORT=3123 npx playwright test` — every project green. The android project runs seven touch
  cases (two pre-existing, four new outline, one new rocker); the iphone project skips them as it
  always has; the desktop project passes both mouse-drag regressions and all five baseline
  screenshots against the committed images.
- Grep proof that the mouse path is untouched: in each viewer, `selectedTarget` is only ever
  assigned inside the touch branch of `handlePointerDown` and the touch branch of the lift handler.
</verification>

<success_criteria>
- A shaper on a phone can tap a control point, see it light up, and then move it with a thumb
  anywhere on the drawing — including out at the panel's edge, with the curve and the readout both
  in plain sight.
- Both drawings behave the same way, through one shared module, with no second copy of the rule.
- Today's direct thumb drag is unchanged and still starts shaping from the first pixel.
- A mouse-driven desktop is unchanged, proved by regressions and unregenerated baselines.
- No board number, formula or stored value is different in any way.
</success_criteria>

<output>
Create `.planning/quick/260909-ktq-on-a-phone-a-control-point-is-selected-w/260909-ktq-SUMMARY.md` when done.
</output>
