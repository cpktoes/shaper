---
created: 2026-08-22
title: Drag construction lines to shape the outline curve
area: ui
severity: minor
priority: high
files:
  - components/outline/outline-viewer.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-editor.tsx
  - lib/geometry/outline.ts
  - lib/geometry/board.ts
source: user request 2026-08-22; flagged high priority — take this first
completed: 2026-08-22
resolved_by: part 2 (fore/aft split) in quick task 260822-wcs; part 1 (draggable control points) in 260822-lg3
resolves_phase:
---

# Drag construction lines to shape the outline curve

**Priority: do this one first.** Severity is only `minor` because the sliders work today — but the
user wants it at the front of the queue.

Two changes that belong together: make the construction overlay draggable, and split the one
symmetric Widepoint slider into independent forward/aft controls.

**Part 2 is done** — quick task `260822-wcs` (2026-08-22) split `railLength` into
`tailRailLength` and `noseRailLength`. The spec can now represent an asymmetric widepoint, so the
drag work in part 1 has somewhere to write to. Part 1 is the remaining work; part 2 is kept below
as the record of what the drag has to target.

## 1. Drag the construction lines instead of using the sliders

When "View Construction Lines" is on, the knots and handles should be grabbable: pull a handle or a
knot and the outline curve follows. The sliders stay — they update live as you drag, so the numbers
and the drawing never disagree.

Today the overlay is read-only. `showConstruction` is local view state in
`outline-editor.tsx:60`, and `outline-viewer.tsx:140-169` renders `geometry.knots` and
`geometry.handles` as plain SVG dots and lines with no pointer handlers.

**The real work is inverting the geometry.** `lib/geometry/outline.ts` runs one way only: spec →
handle endpoints. `railLength` becomes `widepointMult` (line 175), which times `HANDLE_CAP * chord`
becomes `inLen0`/`outLen1`, which becomes the control points the overlay draws. A drag arrives as a
control-point position and has to solve *back* to spec values — invert the multiplier, respect the
`HANDLE_CAP` / `OVERSHOOT` caps and the per-end `outLen0Max` / `inLen1Max` clamps, then write the
result through `onChange`.

Do it that way and the live slider update is free: the sliders render from the same `OutlineSpec`,
so a drag that writes the spec moves them with no extra wiring. Do NOT let the viewer hold its own
drag state that the spec learns about on pointer-up — that is the version where the two disagree
mid-drag.

Per-element mapping to solve back to:

| Drag target | Writes |
|---|---|
| Widepoint knot, along the board | `widePointOffset` |
| Widepoint handle, tail side (`inLen0`) | `tailRailLength` |
| Widepoint handle, nose side (`outLen1`) | `noseRailLength` |
| Tail-pod handle | `tailFullness` (and `tailAngle` if the angle is draggable too) |
| Nose-tip handle | `noseFullness` (and `noseAngle`) |

Notes:
- **No drag precedent exists in this codebase yet.** Nothing in `components/` does pointer-drag —
  this is the first. Whatever pattern lands here sets it for the rocker and foil editors in Phase 4,
  so it is worth building as something reusable rather than one-off.
- Both sides are mirrored: `outline-viewer.tsx` pushes every dot/line twice, `for (const side of
  [1, -1])`. Dragging either mirror must produce the same spec change.
- The overlay is drawn in SVG px via `pxX`/`lenToY`. Dragging needs the inverse of those, and the
  outline viewBox is no longer square to the board — `-50 -16 410 638` with the callouts on.
- Steps are quarter/eighth-inch on the sliders. A drag should snap to the same grid, or the numbers
  will land on values the sliders cannot represent.

## 2. Split the Widepoint controls fore/aft — DONE (260822-wcs)

`railLength` ("Rail Length", `outline-controls.tsx:269-279`) is one 0-100 value that scales **both**
widepoint handles at once — `widepointMult` multiplies `inLen0` (tail side) and `outLen1` (nose
side) identically (`outline.ts:172-177`). A shaper who wants a long drawn-out nose rail and a
tighter tail rail cannot ask for it.

Split it into two spec fields, one per side. There is clean precedent: `tailFullness` and
`noseFullness` already control the two *outer* handles independently — this makes the widepoint's
own pair behave the same way.

UI: two sliders, or one dual-thumb slider anchored at the widepoint (the user's "split the slider
into two parts"). The dual-thumb version reads truer to the geometry — one control, one thumb per
rail — and it is what the drag interaction manipulates anyway.

**Migration:** resolved by doing it before Phase 2. `railLength` was a persisted `OutlineSpec`
field, but nothing had been stored yet (the design store is in-memory only), so no saved design ever
carried the old field. The four presets in `lib/geometry/presets.ts` were rewritten to carry both
fields at their old value, so every preset draws exactly the board it drew before.

## Why the split came first

Once you can drag the fore and aft widepoint handles to different lengths, a single symmetric
`railLength` slider **cannot represent what the drawing shows** — it would have to snap both sides
together on every drag. That is why the split was done first, ahead of the drag work, rather than
alongside it.

## Verify

- Drag each construction element; the matching slider tracks it live, in both directions.
- The geometry caps still hold under drag: no control point past the widepoint half-width, and the
  sampled outline never exceeds it (`outline.ts:223-225`).
- Golden tests in `lib/geometry/` still pass — the inversion must not perturb the forward path.
- Fore and aft rail lengths set to visibly different values produce an asymmetric outline (already
  true as of 260822-wcs — the drag must not regress it).

## Shipped scope note

Widepoint **width** was deliberately left out of the drag (user decision, 2026-08-22): it is a
headline number a shaper dials to a spec, not something to eyeball, so it stays slider-only. The
widepoint knot drags along the board only.

## Note on the sliders

They are **Base UI** (`@base-ui/react/slider`), not Radix. `SliderPrimitive.Thumb` renders a plain
div wrapping a hidden `input[type=range]`; the input holds the focus, role and value and the thumb
div holds none of them. Anything driving a slider programmatically — including whatever keeps the
sliders in sync during a drag — has to go through that inner input.
