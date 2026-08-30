/**
 * Inverse of the rocker geometry: turns a dragged side-profile point back into the spec field it
 * implies. Mirrors `lib/geometry/outline-drag.ts` file-for-file — see that file's own header for
 * the full argument; the same two rules hold this solve together:
 *
 * 1. **One definition per formula.** The bound is imported from `rocker.ts`
 *    (`ROCKER_LIFT_RANGE_IN`), never restated here. A drag that clamped differently from the
 *    slider would let the drawing and the sidebar disagree, which is the exact failure this
 *    module exists to prevent.
 * 2. **Every result is slider-representable.** The solved lift snaps to the slider's step and
 *    clamps to its bounds, so a drag can never reach a value the sidebar cannot show or the
 *    shaper cannot then adjust by hand.
 *
 * Two grabbable points, not seven (quick task 260829-snm, on top of 260829-rda's own move from
 * nine to seven): the five deck (thickness) points have come off the drawing entirely — Thickness
 * is now set only through the sidebar's five sliders — leaving the rocker line's own two tips as
 * the side profile's only drag targets. A tip's dragged HEIGHT *is* the lift at that tip; the
 * station coordinate of the drag is discarded, because a tip's station is fixed by the board's
 * own ends, not read off the pointer.
 */

import { type RockerGeometry, type RockerSpec, ROCKER_LIFT_RANGE_IN } from "./rocker";
import { type Mm, inchesToMm, mmToInches } from "./units";

/** The rocker line's own two grab targets — the centre is the fixed zero and never reachable. */
export type SideProfileDragTarget = "noseTip" | "tailTip";

/** A point on the side profile, in board coordinates — station along the length, height measured
 * up from the flat surface the board sits on (the approved rocker convention). */
export interface SideProfileDragPoint {
  station: Mm;
  height: Mm;
}

export interface SideProfileDragPointAt {
  target: SideProfileDragTarget;
  point: SideProfileDragPoint;
}

interface Limit {
  min: number;
  max: number;
  step: number;
}

/** Snap to the slider's step, then clamp to its bounds. Non-finite input falls back to the minimum. */
function quantise(value: number, limit: Limit): number {
  if (!Number.isFinite(value)) return limit.min;
  const snapped = Math.round(value / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));
  // Re-round to kill the float dust that a 0.0625 step accumulates.
  return Math.round(clamped / limit.step) * limit.step;
}

/**
 * Where the two grabbable points currently are, in board coordinates — read straight off the
 * geometry's own tip knots (`knots[0]` the tail tip, `knots[2]` the nose tip), never re-derived,
 * so the drag targets always sit on the exact points the construction-line overlay draws its
 * lines to.
 */
export function sideProfileDragPoints(geometry: RockerGeometry): SideProfileDragPointAt[] {
  const [tailKnot, , noseKnot] = geometry.knots;
  return [
    { target: "tailTip", point: { station: tailKnot.point.x, height: tailKnot.point.y } },
    { target: "noseTip", point: { station: noseKnot.point.x, height: noseKnot.point.y } },
  ];
}

/**
 * Solve a dragged tip position back to the spec field it implies.
 *
 * Returns the bare partial spec — one key, `noseLift` for the nose tip or `tailLift` for the tail
 * tip — so the caller can hand it straight to `updateRocker`.
 */
export function solveSideProfileDrag(
  target: SideProfileDragTarget,
  dragged: SideProfileDragPoint,
): Partial<RockerSpec> {
  const liftIn = quantise(mmToInches(dragged.height), ROCKER_LIFT_RANGE_IN);
  const field: keyof RockerSpec = target === "noseTip" ? "noseLift" : "tailLift";
  return { [field]: inchesToMm(liftIn) } as Partial<RockerSpec>;
}
