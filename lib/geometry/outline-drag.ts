/**
 * Inverse of the outline geometry: turns a dragged construction point back into the spec fields
 * that would produce it.
 *
 * `buildOutline` runs one way only — spec in, knots and handles out. Direct manipulation needs the
 * other direction, and it lives here rather than in the viewer because the outline math is the
 * product (AGENTS/CLAUDE constraint: geometry math is pure, under `lib/`, and unit-tested in
 * isolation from any component).
 *
 * Two rules hold every solve together:
 *
 * 1. **One definition per formula.** The caps and the rail multiplier are imported from
 *    `outline.ts`, never restated here. A drag that clamped differently from the forward pass would
 *    let the drawing and the sliders disagree, which is the exact failure this feature exists to
 *    prevent.
 * 2. **Every result is slider-representable.** Each field snaps to its slider's step and clamps to
 *    its bounds, so a drag can never reach a value the sidebar cannot show or the user cannot then
 *    adjust by hand.
 */

import type { OutlineSpec } from "./board";
import {
  HANDLE_CAP,
  type OutlineGeometry,
  noseHandleMaxLength,
  railPctFromMult,
  tailHandleMaxLength,
} from "./outline";
import { type Mm, degrees, inchesToMm, mm, mmToInches } from "./units";

/**
 * The five grabbable points: the widepoint knot, which slides along the board, and the four handle
 * ends, each anchored to a knot.
 */
export type OutlineDragTarget =
  | "widepoint"
  | "tailRailHandle"
  | "noseRailHandle"
  | "tailHandle"
  | "noseHandle";

/** A point on the outline in board coordinates — the same axes `OutlineGeometry` uses. */
export interface OutlineDragPoint {
  station: Mm;
  /** Distance from the centreline. Always positive: which rail it was dragged on is a view concern. */
  halfWidth: Mm;
}

export interface OutlineDragPointAt {
  target: OutlineDragTarget;
  point: OutlineDragPoint;
  /** The knot this handle pivots around, so a viewer can draw the line without re-deriving it. */
  anchor: OutlineDragPoint;
}

/**
 * Slider bounds and steps, mirrored from `components/outline/outline-controls.tsx`.
 *
 * Inch-denominated entries are in INCHES (converted at the edge of each solve) because that is the
 * unit the sliders are calibrated in — snapping in millimetres would land between eighths and show
 * a value the slider could not reproduce.
 */
const LIMITS = {
  widePointOffsetIn: { min: -12, max: 12, step: 0.25 },
  railLength: { min: 0, max: 100, step: 0.25 },
  fullness: { min: 0, max: 100, step: 0.25 },
  tailAngle: { min: 30, max: 90, step: 1 },
  noseAngle: { min: 35, max: 90, step: 1 },
} as const;

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
  // Re-round to kill the float dust that 0.125/0.25 steps accumulate (e.g. 18.750000000000004).
  return Math.round(clamped / limit.step) * limit.step;
}

const RAD_TO_DEG = 180 / Math.PI;
/** Below this a drag vector has no usable direction, so the angle it implies is meaningless. */
const MIN_DRAG_LENGTH_MM = 1e-6;

function chordLength(a: OutlineDragPoint, b: OutlineDragPoint): number {
  return Math.hypot(b.station - a.station, b.halfWidth - a.halfWidth);
}

function point(station: number, halfWidth: number): OutlineDragPoint {
  return { station: mm(station), halfWidth: mm(halfWidth) };
}

/**
 * Where the grabbable points currently are, in board coordinates.
 *
 * Handle order matches `buildOutline`: [0] tail pod, [1] widepoint→tail, [2] widepoint→nose,
 * [3] nose tip.
 */
export function outlineDragPoints(geometry: OutlineGeometry): OutlineDragPointAt[] {
  const [tailPod, widepoint, noseTip] = geometry.knots;
  const at = (index: number) => {
    const h = geometry.handles[index];
    return {
      point: point(h.to.x, h.to.y),
      anchor: point(h.from.x, h.from.y),
    };
  };
  const widepointPoint = point(widepoint.point.x, widepoint.point.y);

  return [
    { target: "widepoint", point: widepointPoint, anchor: widepointPoint },
    { target: "tailHandle", ...at(0), anchor: point(tailPod.point.x, tailPod.point.y) },
    { target: "tailRailHandle", ...at(1), anchor: widepointPoint },
    { target: "noseRailHandle", ...at(2), anchor: widepointPoint },
    { target: "noseHandle", ...at(3), anchor: point(noseTip.point.x, noseTip.point.y) },
  ];
}

/**
 * Solve a dragged position back to the spec fields that produce it.
 *
 * Returns only the fields this target owns, so the caller can merge it straight into the spec.
 * `geometry` must be the live geometry for the spec being edited — the solve reads the current knot
 * positions and chord lengths out of it, and takes nothing from the spec itself.
 */
export function solveOutlineDrag(
  geometry: OutlineGeometry,
  target: OutlineDragTarget,
  dragged: OutlineDragPoint,
): Partial<OutlineSpec> {
  const [tailPod, widepoint, noseTip] = geometry.knots;
  const halfWidePointWidth = geometry.halfWidePointWidth;
  // Chords are measured against the CURRENT knots. A handle drag never moves a knot, so they hold
  // for the whole gesture.
  const tailChord = chordLength(
    point(tailPod.point.x, tailPod.point.y),
    point(widepoint.point.x, widepoint.point.y),
  );
  const noseChord = chordLength(
    point(widepoint.point.x, widepoint.point.y),
    point(noseTip.point.x, noseTip.point.y),
  );

  switch (target) {
    case "widepoint": {
      // Station only — the knot slides along the board, it does not widen it. Widepoint width stays
      // a slider-only input by design: it is a headline number a shaper types or dials to a spec
      // ("a 19in board"), not something to eyeball by dragging, and the drawn rail already reads its
      // value off the Width chip. So the cross-board component of the drag is discarded, exactly as
      // it is for the rail handles.
      //
      // The clamp to the 16in end margins already lives in buildOutline; here the offset only has to
      // land on its slider.
      const offsetIn = quantise(
        mmToInches(mm(dragged.station - geometry.length / 2)),
        LIMITS.widePointOffsetIn,
      );
      return { widePointOffset: inchesToMm(offsetIn) };
    }

    case "tailRailHandle":
    case "noseRailHandle": {
      // The widepoint's tangent is (1,0) by construction — it is what makes the widepoint the true
      // maximum half-width — so these handles have no cross-board freedom. Only the station
      // component of the drag carries information; the half-width component is discarded, not
      // approximated.
      const isTail = target === "tailRailHandle";
      const along = isTail
        ? widepoint.point.x - dragged.station
        : dragged.station - widepoint.point.x;
      const chord = isTail ? tailChord : noseChord;
      const maxLength = HANDLE_CAP * chord;
      const pct = quantise(
        maxLength > 0 ? railPctFromMult(along / maxLength) : LIMITS.railLength.min,
        LIMITS.railLength,
      );
      return isTail ? { tailRailLength: pct } : { noseRailLength: pct };
    }

    case "tailHandle": {
      // Free 2-DOF: the direction sets the tail angle, the length sets fullness. dir0 is
      // (cos a, sin a), so the vector from the knot reads the angle off directly.
      const vx = dragged.station - tailPod.point.x;
      const vy = dragged.halfWidth - tailPod.point.y;
      const length = Math.hypot(vx, vy);
      if (length < MIN_DRAG_LENGTH_MM) return { tailFullness: LIMITS.fullness.min };

      const angle = quantise(Math.atan2(vy, vx) * RAD_TO_DEG, LIMITS.tailAngle);
      // The cap depends on the angle this same drag is changing, so it must be evaluated at the
      // NEW angle — using the old one would mis-scale fullness for the whole gesture.
      const dirY = Math.sin(angle / RAD_TO_DEG);
      const maxLength = tailHandleMaxLength(dirY, tailChord, halfWidePointWidth, tailPod.point.y);
      const fullness = quantise(
        maxLength > 0 ? (length / maxLength) * 100 : LIMITS.fullness.min,
        LIMITS.fullness,
      );
      return { tailAngle: degrees(angle), tailFullness: fullness };
    }

    case "noseHandle": {
      // The nose handle runs BACK from the tip: to = P4 - inLen1*dir4, with dir4 = (cos a, -sin a).
      // So the drag vector is -inLen1*dir4, and the angle comes off its negated station component.
      const vx = dragged.station - noseTip.point.x;
      const vy = dragged.halfWidth - noseTip.point.y;
      const length = Math.hypot(vx, vy);
      if (length < MIN_DRAG_LENGTH_MM) return { noseFullness: LIMITS.fullness.min };

      const angle = quantise(Math.atan2(vy, -vx) * RAD_TO_DEG, LIMITS.noseAngle);
      const dirY = -Math.sin(angle / RAD_TO_DEG);
      const maxLength = noseHandleMaxLength(dirY, noseChord, halfWidePointWidth);
      const fullness = quantise(
        maxLength > 0 ? (length / maxLength) * 100 : LIMITS.fullness.min,
        LIMITS.fullness,
      );
      return { noseAngle: degrees(angle), noseFullness: fullness };
    }
  }
}

/** Exported for tests and for any UI that wants to show a field's legal range. */
export const OUTLINE_DRAG_LIMITS = LIMITS;
