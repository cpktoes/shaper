---
quick_id: 260822-lg3
slug: draggable-control-points
date: 2026-08-22
status: planned
source: .planning/todos/pending/2026-08-22-drag-construction-lines-to-shape-the-outline-curve.md part 1; user decision 2026-08-22 to draw construction lines on the input side only
files_modified:
  - lib/geometry/outline.ts
  - lib/geometry/outline-drag.ts
  - lib/geometry/outline-drag.test.ts
  - components/outline/outline-viewer.tsx
  - components/outline/outline-editor.tsx
---

# Quick Task: Draggable outline control points

Finishes the todo. Part 2 (the fore/aft split) shipped as `260822-wcs`; this is part 1.

With "View Construction Lines" on, the knots and handle ends become grabbable. Dragging one writes
the outline spec, so the sliders move with the drag and the numbers never disagree with the drawing.

## Decision: the input side only

The construction overlay currently mirrors onto both rails. It will now draw on the **left** side
only — the input side, where the chips already live (outputs read out to the right rail). The board
is symmetric, so the right-hand copy showed nothing the left one did not, and two sets of grabbable
dots on a symmetric shape is two places to grab for one effect.

Left is `side = -1`: `pxX(halfWidthIn) = centerlineX + halfWidthIn * scale`, so negative half-widths
draw left. Only the editor is affected — `preset-card.tsx` and `board-summary.tsx` both pass
`showConstruction={false}`.

## Task 1 — Shared forward/inverse geometry helpers

`lib/geometry/outline.ts`. The inverse needs the same caps the forward pass uses, and duplicating
them would let the two drift. Export the small pure pieces and have `buildOutline` call them, so each
formula has exactly one definition:

- `railMult(pct)` — already extracted in `260822-wcs`; export it, plus `railPctFromMult(m)` as its
  inverse
- `tailHandleMaxLength({ dirY, chord, halfWidePointWidth, tailPodHalfWidth })` — the `outLen0Max`
  formula
- `noseHandleMaxLength({ dirY, chord, halfWidePointWidth })` — the `inLen1Max` formula
- `HANDLE_CAP` and `OVERSHOOT`

No behaviour change: `buildOutline` must produce byte-identical geometry, which the existing goldens
already assert.

## Task 2 — `lib/geometry/outline-drag.ts` (the whole solve, pure)

Per the project constraint, none of this math goes in a component. New pure module:

```ts
export type OutlineDragTarget =
  | "widepoint"          // knot P2 — 2 DOF
  | "tailRailHandle"     // handles[1], widepoint -> tail
  | "noseRailHandle"     // handles[2], widepoint -> nose
  | "tailHandle"         // handles[0], tail pod
  | "noseHandle";        // handles[3], nose tip

export interface OutlineDragPoint { station: Mm; halfWidth: Mm }

/** Where the grabbable points are, in board coordinates. */
export function outlineDragPoints(geometry: OutlineGeometry):
  { target: OutlineDragTarget; point: OutlineDragPoint }[];

/** Solve a dragged position back to the spec fields that produce it. */
export function solveOutlineDrag(
  spec: OutlineSpec, geometry: OutlineGeometry,
  target: OutlineDragTarget, point: OutlineDragPoint,
): Partial<OutlineSpec>;
```

Per-target solve, `v = point - anchor`:

| Target | Anchor | Solve |
|---|---|---|
| `widepoint` | — | `widePointWidth = 2*halfWidth` (16-25"), `widePointOffset = station - length/2` (±12") |
| `tailRailHandle` | P2 | station axis only: `len = P2.x - point.station` → `railPctFromMult(len / (HANDLE_CAP*chord0))` → `tailRailLength` |
| `noseRailHandle` | P2 | `len = point.station - P2.x` → `noseRailLength` |
| `tailHandle` | P0 | `tailAngle = atan2(v.halfWidth, v.station)` (30-90°); `tailFullness = 100*\|v\|/tailHandleMaxLength(at the new angle)` |
| `noseHandle` | P4 | `dir4 = -v/\|v\|` so `noseAngle = atan2(v.halfWidth, -v.station)` (35-90°); `noseFullness = 100*\|v\|/noseHandleMaxLength(at the new angle)` |

The two rail handles take **only** the station component. That is not a simplification — the
widepoint's tangent is `dir2 = (1,0)` by construction (it is what makes the widepoint the true
maximum half-width), so those handles have no cross-board freedom to give.

The angle-driven maxes must be recomputed at the **new** angle, not the old one: `tailHandleMaxLength`
depends on `dir0.y`, which the same drag is changing.

Every result snaps to its slider's step (0.125" width, 0.25" offset, 0.25% rail/fullness, 1° angles)
and clamps to that slider's bounds, so a drag can never produce a value the slider cannot show.

### Tests

- **Round trip, the load-bearing one:** for each target, take the point `outlineDragPoints` reports
  for a spec, feed it straight back to `solveOutlineDrag`, and get the spec's own values back. This
  is what proves forward and inverse agree.
- Dragging a target changes only its own fields.
- Out-of-range drags clamp to slider bounds instead of producing unrenderable specs.
- Rail handles ignore the cross-board component (same answer whatever `halfWidth` is passed).
- Snapping: an off-grid drag lands on a slider step.

## Task 3 — Viewer: one side, and pointer handling

`components/outline/outline-viewer.tsx`.

- Build the construction dots/lines for `side = -1` only (drop the `for (const side of [1,-1])`).
- New optional prop `onOutlineDrag?: (patch: Partial<OutlineSpec>) => void`. Absent (summary,
  preset cards) means today's behaviour exactly: no handlers, no hit targets.
- Drag targets render as the existing dots with an invisible larger hit circle (`r≈10`,
  `fill="transparent"`, `cursor-grab`) so they are catchable without making the drawing heavier.
- `pointerdown` → `setPointerCapture`, record the target; `pointermove` → convert client point to
  SVG user units via `svgRef.current.getScreenCTM().inverse()`, invert `pxX`/`lenToY` to board
  coordinates, call `solveOutlineDrag`, hand the patch to `onOutlineDrag`; `pointerup`/`pointercancel`
  → release.
- The viewer holds **no** copy of the geometry. Every move writes the spec and the redraw comes back
  through props — that is what keeps the sliders in step with the drawing mid-drag.
- `touch-action: none` on the hit targets so a touch drag does not scroll the page instead.

## Task 4 — Wire it up

`components/outline/outline-editor.tsx`: pass `onOutlineDrag={updateOutline}`. It already takes a
`Partial<OutlineSpec>`, which is the patch shape, so no adapter.

## Verify

- `npm test` — outline goldens unchanged (Task 1 refactor is behaviour-neutral), new drag tests pass.
- `tsc --noEmit` and `eslint` clean.
- In the browser: construction lines on the left only; drag each of the five targets and watch the
  matching slider track it live; confirm the summary screen and preset thumbnails are unchanged.
