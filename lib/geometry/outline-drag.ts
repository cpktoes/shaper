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
import {
  type Mm,
  type UnitsSystem,
  degrees,
  inchesToMm,
  metricSliderRange,
  mm,
  mmToInches,
  roundToSixteenthInch,
  roundToWholeMm,
} from "./units";
import {
  WING_DEPTH_RANGE_IN,
  WING_FIN_OFFSET_RANGE_IN,
  WING_RUN_RANGE_IN,
  WING_STEP_MM,
  wingFootprint,
  wingPositionRangeIn,
  wingRadiusTop,
  wingReadouts,
  wingedHalfWidthAt,
  type FrontFinEdges,
  type Wing,
} from "./wings";

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
      if (geometry.tailAnglePinned) {
        // A diamond tail's angle is pinned — its slider is greyed out — so the drag has one degree
        // of freedom left, not two: how far the handle sits along the FIXED direction sets
        // fullness, and any sideways travel of the finger or mouse is ignored rather than turned
        // into an angle the shaper cannot otherwise set. The same cap as below, evaluated at the
        // pinned angle. Returns fullness only, so a pinned angle is never written back.
        const pinnedRad = geometry.tailAngle / RAD_TO_DEG;
        const along = Math.max(0, vx * Math.cos(pinnedRad) + vy * Math.sin(pinnedRad));
        if (along < MIN_DRAG_LENGTH_MM) return { tailFullness: LIMITS.fullness.min };
        const pinnedMax = tailHandleMaxLength(
          Math.sin(pinnedRad),
          tailChord,
          halfWidePointWidth,
          tailPod.point.y,
        );
        return {
          tailFullness: quantise(
            pinnedMax > 0 ? (along / pinnedMax) * 100 : LIMITS.fullness.min,
            LIMITS.fullness,
          ),
        };
      }
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

/**
 * Which of the five drag points a finger (or a mouse) has grabbed, when hit zones are big enough
 * to overlap (D-15) — one pass over `points`, closest centre within `hitRadiusMm` wins, or `null`
 * if nothing is in reach.
 *
 * **Units.** Both `touch` and `hitRadiusMm` are in board millimetres, the same axes
 * `OutlineDragPoint` uses. The caller converts the screen-pixel hit radius to millimetres at the
 * current render scale before calling; this function never sees a pixel and never sees the screen.
 * That is what lets one function serve the desktop's `OUTLINE_DRAG_HIT_PX` circles and the phone's
 * larger `OUTLINE_DRAG_HIT_COARSE_PX` ones without knowing which is which — the caller supplies
 * whichever radius (already converted) applies to the current pointer.
 *
 * **Ties.** The comparison is strictly-less-than on the running best squared distance, so a later
 * point can never displace an equidistant earlier one: `outlineDragPoints`' own enumeration order
 * — widepoint, tailHandle, tailRailHandle, noseRailHandle, noseHandle — is the tie-break, and the
 * widepoint wins any tie it is in. The result is a pure function of `(points, touch, hitRadiusMm)`:
 * the same three inputs return the same target on every call, independent of paint order, DOM
 * order or call history.
 */
export function nearestOutlineDragTarget(
  points: OutlineDragPointAt[],
  touch: OutlineDragPoint,
  hitRadiusMm: Mm,
): OutlineDragTarget | null {
  let best: OutlineDragTarget | null = null;
  let bestDistSq = Infinity;
  const radiusSq = hitRadiusMm * hitRadiusMm;
  for (const p of points) {
    const dx = p.point.station - touch.station;
    const dy = p.point.halfWidth - touch.halfWidth;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radiusSq && distSq < bestDistSq) {
      best = p.target;
      bestDistSq = distSq;
    }
  }
  return best;
}

/**
 * Desktop's own drag hit-zone radius, in CSS px — the historic `DRAG_HIT_PX` value
 * `outline-viewer.tsx` has always used for its mouse circles, unchanged. Lives here (not only in
 * the viewer) so 09-07 can replace the viewer's own private constant with an import of this one;
 * until then this is the canonical value, and the two must stay equal.
 */
export const OUTLINE_DRAG_HIT_PX = 15;

/**
 * The phone (coarse-pointer) drag hit-zone radius, in CSS px — measured, not assumed
 * (`components/viewer/drag-spacing.test.ts`, D-15/PHON-04). At the tightest realistic board (60in
 * length, 25in widepoint — `BOARD_LENGTH_RANGE_IN`/`WIDEPOINT_WIDTH_RANGE_IN` in `board.ts`), the
 * closest pair of the five drag points (`tailHandle`/`tailRailHandle`) still lands comfortably more
 * than twice this radius apart on screen at TEMPLATE's 66dvh pinned ceiling on both a 375x667
 * iPhone SE (~58.7px) and a 390x844 iPhone 14 (~61.2px), so the UI-SPEC's own 22px target needs no
 * shrinking for the outline.
 */
export const OUTLINE_DRAG_HIT_COARSE_PX = 22;

// ---------------------------------------------------------------------------------------------
// Wing grab points (quick 261014-wii, 2026-10-15, D2, D5, P11, P12).
//
// The WINGS close-up draws two grab points per wing (sketch 014's variant C): the OUTER one at the
// step's outer corner slides the wing along the curve the shaper drew — or, while the wing is
// locked to the front fin, sets its offset from the fin edge — and the INNER one, hung a few screen
// dots below the inner corner on the depth dimension's own line so a sharp wing's two points never
// sit on top of each other, sets the depth (in and out) and the run (along the stringer).
//
// They get their own target type rather than joining `OutlineDragTarget`: that five-target union
// is switched exhaustively in `outline-viewer.tsx`, and the phone specs count the VIEWER's
// `[data-drag-target]` points, so a wing point in that union would change both. Wing points are
// `{ wing, point }` and hooked as `data-wing-grab` instead; the VIEWER's five are untouched.
//
// The same two rules as the outline's own solve hold here: every formula is imported from
// `wings.ts`, never restated, and every result lands on the sidebar slider's own grid inside its
// range — 1/16" in Imperial, a whole millimetre in Metric (P12) — so a drag never writes a number
// the sidebar cannot show.
// ---------------------------------------------------------------------------------------------

/** Which of a wing's two grab points: the outer corner, or the point hung below the inner corner. */
export type WingDragPoint = "outer" | "inner";

/** A wing grab point — the wing's index in the outline's `wings` list, and which of its points. */
export interface WingDragTarget {
  wing: number;
  point: WingDragPoint;
}

export interface WingDragPointAt {
  target: WingDragTarget;
  point: OutlineDragPoint;
}

/**
 * How far below the inner corner the inner grab point hangs, in screen pixels (D5, the sketch's
 * `HANDLE_DROP`). The caller converts it to millimetres at the live scale, exactly as it converts
 * the hit radius, so the gap reads the same on every screen.
 */
export const WING_GRAB_DROP_PX = 22;

/**
 * Snap a wing number onto its slider's grid and keep it inside the slider's range (P12): 1/16" and
 * the inch range in Imperial (`roundToSixteenthInch`); a whole millimetre and the inch range
 * rounded inward in Metric (`roundToWholeMm`, `metricSliderRange` — what `measureSlider` gives the
 * slider). Non-finite input falls back to the minimum, as `quantise` does above.
 */
function snapWing(value: number, rangeIn: { min: number; max: number }, system: UnitsSystem): Mm {
  if (system === "metric") {
    const range = metricSliderRange(rangeIn, WING_STEP_MM);
    if (!Number.isFinite(value)) return mm(range.min);
    return mm(Math.min(range.max, Math.max(range.min, roundToWholeMm(mm(value)))));
  }
  const lo = inchesToMm(rangeIn.min);
  const hi = inchesToMm(rangeIn.max);
  if (!Number.isFinite(value)) return lo;
  return mm(Math.min(hi, Math.max(lo, roundToSixteenthInch(mm(value)))));
}

/**
 * Where each wing's two grab points are, in board coordinates, wing by wing (outer then inner).
 * The outer point is at the wing's station on the rail just nose-ward of the step; the inner one is
 * `dropMm` tail-ward of the inner corner's station (station − run), on the rail just tail-ward of
 * the step — the widths `wingReadouts` reads either side of it.
 */
export function wingDragPoints(geometry: OutlineGeometry, wings: readonly Wing[], dropMm: Mm): WingDragPointAt[] {
  const readouts = wingReadouts(geometry, wings);
  return wings.flatMap((w, i) => [
    { target: { wing: i, point: "outer" as const }, point: point(w.station, readouts[i].widthAhead / 2) },
    {
      target: { wing: i, point: "inner" as const },
      point: point(w.station - w.run - dropMm, readouts[i].widthBehind / 2),
    },
  ]);
}

/**
 * A dragged grab point solved back to the wing's numbers (D5; the sketch's own drag, F29). Returns
 * the whole new wings list with only the dragged wing changed — the others are the same objects.
 *
 * - **Outer, placed by hand:** the station is the pointer's, snapped, between 2" and the centre.
 * - **Outer, locked** (`lock` set and the fin setup has a front fin): the offset is the pointer's
 *   distance from the fin edge, snapped, within ±3"; the station is left to the store's resolution
 *   (`resolveWingStations`, P2).
 * - **Inner:** the run is how far the pointer (lifted back by the drop) sits tail-ward of the
 *   station; the depth is how far it sits in from the rail the board would have at the inner corner
 *   WITHOUT this wing — every other wing's take kept. (The sketch measured from the bare curve at
 *   the wing's own station, which made a press without a move jump the depth by the other wing's
 *   take, or by the curve's narrowing over a long run; measured here, a press alone changes
 *   nothing.) The corner radius is pulled in to what fits the new step (`wingRadiusTop`, P8).
 */
export function solveWingDrag(
  geometry: OutlineGeometry,
  wings: readonly Wing[],
  target: WingDragTarget,
  dragged: OutlineDragPoint,
  dropMm: Mm,
  edges: FrontFinEdges | null,
  system: UnitsSystem,
): Wing[] {
  const w = wings[target.wing];
  if (!w) return [...wings];
  let next: Wing;
  if (target.point === "outer") {
    if (w.lock !== null && edges !== null) {
      const edge = w.lock === "front-leading" ? edges.leading : edges.trailing;
      next = { ...w, finOffset: snapWing(dragged.station - edge, WING_FIN_OFFSET_RANGE_IN, system) };
    } else {
      next = { ...w, station: snapWing(dragged.station, wingPositionRangeIn(geometry.length), system) };
    }
  } else {
    const others = wings.filter((_, i) => i !== target.wing);
    const rail = wingedHalfWidthAt(geometry, others, wingFootprint(w).inner);
    const depth = snapWing(rail - dragged.halfWidth, WING_DEPTH_RANGE_IN, system);
    const run = snapWing(w.station - (dragged.station + dropMm), WING_RUN_RANGE_IN, system);
    next = { ...w, depth, run, radius: mm(Math.min(w.radius, wingRadiusTop({ depth, run }, system))) };
  }
  return wings.map((x, i) => (i === target.wing ? next : x));
}

/**
 * Which wing grab point a press has caught: the closest within `hitRadiusMm`, or `null`. Board
 * millimetres in, as `nearestOutlineDragTarget`, and the same tie rule — strictly-less-than, so the
 * earlier entry in `wingDragPoints`' order wins a tie.
 */
export function nearestWingDragTarget(
  points: readonly WingDragPointAt[],
  touch: OutlineDragPoint,
  hitRadiusMm: Mm,
): WingDragTarget | null {
  let best: WingDragTarget | null = null;
  let bestDistSq = Infinity;
  const radiusSq = hitRadiusMm * hitRadiusMm;
  for (const p of points) {
    const dx = p.point.station - touch.station;
    const dy = p.point.halfWidth - touch.halfWidth;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radiusSq && distSq < bestDistSq) {
      best = p.target;
      bestDistSq = distSq;
    }
  }
  return best;
}
