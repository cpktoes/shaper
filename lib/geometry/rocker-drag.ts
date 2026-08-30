/**
 * Inverse of the rocker geometry: turns a dragged control point back into the spec field(s) it
 * implies. Mirrors `lib/geometry/outline-drag.ts` file-for-file — see that file's own header for
 * the full argument; the same two rules hold this solve together:
 *
 * 1. **One definition per formula.** Every bound and every forward formula is imported from
 *    `rocker.ts` (`rockerTipHandleMaxLength`, the three shape ranges) or `outline.ts`
 *    (`HANDLE_CAP`, `railPctFromMult`), never restated here. A drag that clamped or scaled
 *    differently from `buildRocker`'s own forward pass would let the drawing and the sidebar
 *    disagree, which is the exact failure this module exists to prevent.
 * 2. **Every result is slider-representable.** Each field snaps to its own slider's step and
 *    clamps to its own bounds, so a drag can never reach a value the sidebar cannot show or the
 *    shaper cannot then adjust by hand.
 *
 * Four grabbable control points, not two tip heights (quick task 260829-t47, on top of
 * 260829-snm's own move from seven points to two): the curve's four Bezier handle termini —
 * `geometry.handles[0..3]`, in the order `buildRocker` builds them — are now what a shaper grabs
 * on the drawing, exactly the way the TEMPLATE screen's own control points work. The two tip
 * handles (index 0 and 3) have free direction-and-length, setting that tip's angle and smoothness
 * together; the two centre handles (index 1 and 2) are constrained to the flat centre's own
 * station-only tangent, setting that side's flatness alone. A tip's own rocker (its LIFT) is no
 * longer draggable at all: it is a headline number a shaper quotes and types ("a 4 1/2 inch
 * nose"), not a shape control, so it stays editable only from its own slider and its typed
 * DATASHEET cell — dragging the tip itself does nothing.
 */

import { type Mm, degrees, mm } from "./units";
import { HANDLE_CAP, railPctFromMult } from "./outline";
import {
  type RockerGeometry,
  type RockerSpec,
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_SMOOTHNESS_RANGE,
  rockerTipHandleMaxLength,
} from "./rocker";

/** The rocker curve's four grabbable control points — the Bezier handle termini, in
 * `buildRocker`'s own handle order. The three knots (both tips and the centre) are fixed: a
 * tip's own lift is set from its slider and its typed datasheet cell, and the centre is the
 * curve's zero by definition. */
export type SideProfileDragTarget = "tailTipHandle" | "tailFlatHandle" | "noseFlatHandle" | "noseTipHandle";

/** A point on the side profile, in board coordinates — station along the length, height measured
 * up from the flat surface the board sits on (the approved rocker convention). */
export interface SideProfileDragPoint {
  station: Mm;
  height: Mm;
}

export interface SideProfileDragPointAt {
  target: SideProfileDragTarget;
  point: SideProfileDragPoint;
  /** The knot this handle pivots around, so a viewer can draw the steering line without
   * re-deriving it. */
  anchor: SideProfileDragPoint;
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

const RAD_TO_DEG = 180 / Math.PI;
/** Below this a drag vector has no usable direction, so the angle it implies is meaningless. */
const MIN_DRAG_LENGTH_MM = 1e-6;

function point(station: number, height: number): SideProfileDragPoint {
  return { station: mm(station), height: mm(height) };
}

/**
 * Where the four grabbable control points currently are, in board coordinates — read straight off
 * `geometry.handles` in its own array order (`buildRocker`'s own construction order: tail tip's
 * handle, centre-toward-tail, centre-toward-nose, nose tip's handle). Never re-derived from the
 * spec, so the grab targets always sit exactly where the construction-line overlay draws its
 * lines to.
 */
export function sideProfileDragPoints(geometry: RockerGeometry): SideProfileDragPointAt[] {
  const targets: SideProfileDragTarget[] = ["tailTipHandle", "tailFlatHandle", "noseFlatHandle", "noseTipHandle"];
  return geometry.handles.map((h, i) => ({
    target: targets[i],
    point: point(h.to.x, h.to.y),
    anchor: point(h.from.x, h.from.y),
  }));
}

/**
 * Solve a dragged control-point position back to the spec field(s) it implies.
 *
 * `geometry` must be the live geometry for the spec being edited — the solve reads the current
 * knot positions and chord lengths out of it, and takes nothing from the spec itself. Returns
 * only the fields the target owns, so the caller can merge it straight into the spec.
 */
export function solveSideProfileDrag(
  geometry: RockerGeometry,
  target: SideProfileDragTarget,
  dragged: SideProfileDragPoint,
): Partial<RockerSpec> {
  const [tailKnot, centreKnot, noseKnot] = geometry.knots;
  const P0 = tailKnot.point;
  const P2 = centreKnot.point;
  const P4 = noseKnot.point;
  // Chords are measured against the CURRENT knots. A handle drag never moves a knot, so they hold
  // for the whole gesture.
  const chord0 = Math.hypot(P2.x - P0.x, P2.y - P0.y);
  const chord1 = Math.hypot(P4.x - P2.x, P4.y - P2.y);

  switch (target) {
    case "tailTipHandle": {
      // Free two degrees of freedom. dir0 = (cos a, -sin a), so the vector from the tip reads the
      // angle off directly, negated on the height axis.
      const vx = dragged.station - P0.x;
      const vy = dragged.height - P0.y;
      const length = Math.hypot(vx, vy);
      if (length < MIN_DRAG_LENGTH_MM) return { tailSmoothness: ROCKER_SMOOTHNESS_RANGE.max };

      const angle = quantise(Math.atan2(-vy, vx) * RAD_TO_DEG, ROCKER_ANGLE_RANGE_DEG);
      // The cap depends on the angle this same drag is changing, so it must be evaluated at the
      // NEW angle — using the old one would mis-scale smoothness for the whole gesture.
      const dirY = -Math.sin(angle / RAD_TO_DEG);
      const maxLength = rockerTipHandleMaxLength(dirY, chord0, P0.y);
      const smoothness = quantise(
        maxLength > 0 ? 100 - (length / maxLength) * 100 : ROCKER_SMOOTHNESS_RANGE.max,
        ROCKER_SMOOTHNESS_RANGE,
      );
      return { tailAngle: degrees(angle), tailSmoothness: smoothness };
    }

    case "noseTipHandle": {
      // The nose handle runs BACK from the tip: to = P4 - inLen1*dir4, with dir4 = (cos a, sin a).
      // So the drag vector is -inLen1*dir4, and the angle comes off its negated components.
      const vx = dragged.station - P4.x;
      const vy = dragged.height - P4.y;
      const length = Math.hypot(vx, vy);
      if (length < MIN_DRAG_LENGTH_MM) return { noseSmoothness: ROCKER_SMOOTHNESS_RANGE.max };

      const angle = quantise(Math.atan2(-vy, -vx) * RAD_TO_DEG, ROCKER_ANGLE_RANGE_DEG);
      const dirY = Math.sin(angle / RAD_TO_DEG);
      const maxLength = rockerTipHandleMaxLength(dirY, chord1, P4.y);
      const smoothness = quantise(
        maxLength > 0 ? 100 - (length / maxLength) * 100 : ROCKER_SMOOTHNESS_RANGE.max,
        ROCKER_SMOOTHNESS_RANGE,
      );
      return { noseAngle: degrees(angle), noseSmoothness: smoothness };
    }

    case "tailFlatHandle": {
      // The centre's tangent toward the tail is (-1, 0) by construction, so this handle has no
      // cross-axis freedom. Only the station component of the drag carries information; the
      // height component is discarded, not approximated.
      const along = P2.x - dragged.station;
      const maxLength = HANDLE_CAP * chord0;
      const pct = quantise(
        maxLength > 0 ? railPctFromMult(along / maxLength) : ROCKER_FLATNESS_RANGE.min,
        ROCKER_FLATNESS_RANGE,
      );
      return { tailFlatness: pct };
    }

    case "noseFlatHandle": {
      const along = dragged.station - P2.x;
      const maxLength = HANDLE_CAP * chord1;
      const pct = quantise(
        maxLength > 0 ? railPctFromMult(along / maxLength) : ROCKER_FLATNESS_RANGE.min,
        ROCKER_FLATNESS_RANGE,
      );
      return { noseFlatness: pct };
    }
  }
}
