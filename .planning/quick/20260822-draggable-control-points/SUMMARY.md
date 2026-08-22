---
phase: quick-260822-lg3
plan: 01
subsystem: geometry, ui
status: complete
tags: [outline, direct-manipulation, drag, inverse-geometry, svg, pointer-events]

requires:
  - phase: quick-260822-wcs
    provides: tailRailLength/noseRailLength, without which a dragged widepoint handle would have had no field of its own to write to
provides:
  - lib/geometry/outline-drag.ts -- the inverse of buildOutline; outlineDragPoints() reports where the five control points are, solveOutlineDrag() turns a dragged position back into spec fields
  - Exported HANDLE_CAP, OVERSHOOT, railMult, railPctFromMult, tailHandleMaxLength, noseHandleMaxLength from lib/geometry/outline.ts -- one definition each, shared by the forward pass and the inverse
  - OutlineViewer onOutlineDrag prop -- opt-in direct manipulation; absent means no hit targets and no handlers
  - Construction overlay drawn on the input (left) side only
affects: [any future rocker/foil editor wanting direct manipulation -- this is the first pointer-drag interaction in the codebase and sets the pattern]

actuals:
  tasks: 5
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Inverse geometry lives in lib/ next to its forward pass, never in the component (project constraint). The viewer converts screen->board coordinates and nothing else."
    - "Drag writes the spec on every pointermove and the redraw returns through props -- the viewer holds no copy of the geometry, which is what keeps the sliders in step with the drawing mid-drag"
    - "Solve results snap to the owning slider's step and clamp to its bounds, so a drag can never produce a value the sidebar cannot display"
    - "draggingRef as a ref, not state -- written on pointerdown, read on pointermove; re-rendering for it would be a wasted pass"

key-files:
  created:
    - lib/geometry/outline-drag.ts
    - lib/geometry/outline-drag.test.ts
  modified:
    - lib/geometry/outline.ts
    - components/outline/outline-viewer.tsx
    - components/outline/outline-editor.tsx
---

# Summary: Draggable outline control points

Finishes the todo. With "View Construction Lines" on, the five control points are grabbable and
dragging one reshapes the board while its sliders track the gesture.

## What changed

**The inverse.** `lib/geometry/outline-drag.ts` runs `buildOutline` backwards. Five targets: the
widepoint knot (1 DOF -> offset), the two widepoint rail handles (1 DOF each -> tail/nose rail
length), and the two end handles (2 DOF each -> angle from the drag direction, fullness from its
length). The caps and the rail multiplier are imported from `outline.ts`, which now exports them, so
the forward pass and the inverse cannot drift apart.

**The overlay.** Construction lines and dots now draw on the left rail only — the input side, where
the chips already are. Both other consumers pass `showConstruction={false}`, so only the editor sees
any change.

**The interaction.** `OutlineViewer` gained an optional `onOutlineDrag`. When present it renders
transparent grab circles over the control points and runs pointer capture; when absent (Summary,
preset cards) nothing is rendered and no handlers are attached.

## Two things the geometry made non-obvious

**The rail handles are axis-locked, and that is not a shortcut.** The widepoint's tangent is `(1,0)`
by construction — it is what makes the widepoint the true maximum half-width. Those two handles have
no cross-board freedom to give, so the solve discards the cross-board component of the drag outright
rather than approximating it. Verified in the browser: dragging the nose rail handle diagonally moved
it only along the station axis, x unchanged.

**The end-handle caps depend on the angle the same drag is changing.** `tailHandleMaxLength` is a
function of `dir0.y`. Deriving fullness from a length using the OLD angle's cap would mis-scale the
whole gesture, so the solve recomputes the cap at the new angle before dividing.

## Verification

- `npm test` — 632 pass. 32 new drag tests; the outline goldens are unchanged, so exporting the caps
  and multiplier changed no behaviour.
- The load-bearing test is the round trip: for five different specs and every target, take where the
  control point IS, feed it straight back to the solve, and get the spec's own values back. Forward
  and inverse agreeing is the whole correctness claim.
- In the browser, all four control types driven with real pointer events:
  - widepoint knot dragged diagonally to client (388,410): y followed to 409 (the 1px is the 0.25"
    offset snap), x held at 435, Width still 19" — the cross-board component discarded
  - nose rail handle dragged diagonally to (386,286): y followed to 286, x held at 429 (axis lock),
    Nose Rail 50% -> 94%, every other slider untouched
  - tail handle dragged: Tail Angle 60° -> 49°, Tail Fullness 50.5% -> 100%, stopping short of the
    cursor because fullness hit its cap — correct, not a miss
- Summary screen renders zero hit targets and a clean console.

## Note on a console error seen mid-work

`CONSTRUCTION_SIDE is not defined` appeared in the console during development. It came from an
intermediate HMR compile between the two edits that added the usage and the declaration. It does not
reproduce on a fresh tab, and `tsc --noEmit` is clean.

## Amendment: widepoint width is not draggable (user decision, same day)

The widepoint knot first solved for both width and offset. The user asked for offset only, leaving
width to its slider.

The reasoning is sound and worth keeping: widepoint width is a headline number a shaper states or
dials to a spec ("a 19in board"), not something to eyeball. So the knot now slides along the board
and nothing else — the cross-board component of the drag is discarded exactly as it is for the rail
handles, and `widePointWidth` is never returned from a solve.

`LIMITS.widePointWidthIn` went with it rather than being left as dead configuration. The tests moved
with the behaviour: the round trip now asserts offset only, and a new case drags the knot 4in off
the rail and proves the redrawn board is exactly as wide as it was.

Three of the five control points are now station-axis-locked (widepoint knot, both rail handles) and
two are free (the end handles).

## What is left of the original todo

Nothing in its scope. Two things it deliberately did not ask for and this did not add: the nose-tip
and tail-pod KNOTS are not draggable (length and tail-block width still come from their own
controls), and there is no undo beyond moving a slider back.
