/**
 * Outline geometry engine.
 *
 * Ported statement-for-statement from the prototype's `buildGeometry`
 * (reference/project/Template.dc.html lines 505-623), with these
 * deliberate changes and no others:
 *
 * 1. AXIS SWAP — the prototype stores points as [y, x] where y is the
 *    station and x is the half-width. This port uses named fields:
 *    prototype `y` -> `station`, prototype `x` -> `halfWidth`. Direction
 *    vectors are swapped to match (see dir0/dir4/dir2 below).
 * 2. METRIC CONSTANTS — the four constants that carry a unit (the 16" end
 *    margin, the 5" diamond depth cap, the 2" tail-block margin, the 12"
 *    measuring stations) are converted through inchesToMm. Everything else
 *    is dimensionless and ports unchanged.
 * 3. DEAD CODE — the prototype's unused `HANDLE_FRAC = 0.33` is not ported.
 * 4. TAIL RULES are driven by the TailShape union instead of a string plus
 *    loose fields.
 */

import type {
  BezierSegment,
  OutlinePoint,
  OutlineSpec,
  Point2D,
} from "./board";
import { type Mm, inchesToMm, mm } from "./units";

const MARGIN_MM = inchesToMm(16);
const DIAMOND_DEPTH_CAP_MM = inchesToMm(5);
const DIAMOND_BLOCK_MARGIN_MM = inchesToMm(2);
/** The shaper's standard 12" measuring station, from either end. The one definition of this
 * physical quantity in the codebase — `lib/geometry/template.ts` imports it rather than
 * re-deriving its own `inchesToMm(12)`, so the two never drift apart (CLAUDE.md Rule 1). */
export const MEASURE_STATION_MM = inchesToMm(12);

/** Handle length cap as a fraction of the chord between adjacent knots. */
export const HANDLE_CAP = 0.48;
/** Overshoot factor used when capping a handle so it doesn't carry its control point past the widepoint. */
export const OVERSHOOT = 0.92;
const SAMPLES_PER_SEGMENT = 80;
/** Guard against dividing by a direction component that is (numerically) zero. */
const EPSILON = 1e-6;

interface Direction2D {
  x: number;
  y: number;
}

/**
 * Widepoint Vector Strength (0-100) as a multiplier against a side's max handle length.
 *
 * Exported with its inverse because `lib/geometry/outline-drag.ts` has to run this backwards: a
 * dragged handle arrives as a length and must become the percentage the slider shows. Keeping both
 * directions next to each other is what stops them drifting apart.
 */
export const railMult = (pct: number) => 0.8 + (pct / 100) * 0.8;
export const railPctFromMult = (multiplier: number) => ((multiplier - 0.8) / 0.8) * 100;

/**
 * Hard geometric cap on the tail-pod handle: it must never carry its control point past the
 * widepoint's own half-width. Depends on the tail angle through `dirY`, so a drag that changes the
 * angle must recompute this at the NEW angle before deriving a fullness from a length.
 */
export function tailHandleMaxLength(
  dirY: number,
  chord: number,
  halfWidePointWidth: number,
  tailPodHalfWidth: number,
): number {
  if (Math.abs(dirY) <= EPSILON) return HANDLE_CAP * chord;
  return Math.min(HANDLE_CAP * chord, (OVERSHOOT * (halfWidePointWidth - tailPodHalfWidth)) / dirY);
}

/** The same cap for the nose-tip handle, whose knot sits at half-width zero. */
export function noseHandleMaxLength(
  dirY: number,
  chord: number,
  halfWidePointWidth: number,
): number {
  if (Math.abs(dirY) <= EPSILON) return HANDLE_CAP * chord;
  return Math.min(HANDLE_CAP * chord, (OVERSHOOT * halfWidePointWidth) / Math.abs(dirY));
}

export interface OutlineKnot {
  point: Point2D;
  tangent: Direction2D;
}

export interface OutlineHandle {
  from: Point2D;
  to: Point2D;
}

export interface OutlineGeometry {
  length: Mm;
  halfWidePointWidth: Mm;
  halfTailBlockWidth: Mm;
  /** True for pin and round tails, whose tail block is forced to zero width. */
  tailBlockPinned: boolean;
  widePointStation: Mm;
  tailPodStation: Mm;
  centreCloseStation: Mm;
  effectiveDiamondDepth: Mm;
  /** Tail pod, widepoint, nose tip — the three knots the outline curve is built from. */
  knots: [OutlineKnot, OutlineKnot, OutlineKnot];
  /** The four construction handles, each a from/to pair, used by the viewer's construction-line overlay. */
  handles: OutlineHandle[];
  /** The two derived Bezier segments — derived from the parameters, never stored. */
  segments: BezierSegment[];
  /** 161 sampled points along the right half of the outline, ordered by station ascending. */
  points: OutlinePoint[];
  /** Full outline area (both rail sides) in square millimetres. */
  area: number;
  /**
   * Full (not half) width measured 12" in from the tail. 12" from each end
   * is the shaper's standard measuring station, which is why an imperial
   * number survives in this metric type's name.
   */
  tailWidthAt12in: Mm;
  /** Full (not half) width measured 12" in from the nose. */
  noseWidthAt12in: Mm;
}

function interpolateHalfWidth(points: OutlinePoint[], station: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const y0 = p0.station;
    const y1 = p1.station;
    if (station >= y0 && station <= y1) {
      const x0 = p0.halfWidth;
      const x1 = p1.halfWidth;
      const t = y1 > y0 ? (station - y0) / (y1 - y0) : 0;
      return x0 + (x1 - x0) * t;
    }
  }
  return points[points.length - 1].halfWidth;
}

/**
 * Samples the half-width at a given station by linearly interpolating
 * between the two bracketing sampled points. When the station is past the
 * end, returns the last point's half-width (matches the prototype's
 * `xAtY` fallback exactly, rather than throwing).
 */
export function sampleOutline(geometry: OutlineGeometry, station: Mm): Mm {
  return mm(interpolateHalfWidth(geometry.points, station));
}

export function buildOutline(spec: OutlineSpec): OutlineGeometry {
  const length = spec.length;
  const halfWidePointWidth = spec.widePointWidth / 2;

  const tail = spec.tail;
  const tailBlockPinned = tail.kind === "pin" || tail.kind === "round";

  let halfTailBlockWidth = 0;
  let tailPodStation = 0;
  let centreCloseStation = 0;
  let effectiveDiamondDepth = 0;

  switch (tail.kind) {
    case "pin":
    case "round":
      halfTailBlockWidth = 0;
      break;
    case "squash":
      halfTailBlockWidth = tail.endWidth / 2;
      break;
    case "diamond":
      halfTailBlockWidth = tail.endWidth / 2;
      effectiveDiamondDepth = Math.max(
        0,
        Math.min(tail.depth, DIAMOND_DEPTH_CAP_MM, tail.endWidth - DIAMOND_BLOCK_MARGIN_MM),
      );
      tailPodStation = effectiveDiamondDepth;
      break;
    case "swallow":
      halfTailBlockWidth = tail.endWidth / 2;
      centreCloseStation = tail.crotchDepth;
      break;
  }

  const widePointStation = Math.max(
    MARGIN_MM,
    Math.min(length - MARGIN_MM, length / 2 + spec.widePointOffset),
  );

  // Tail/nose ends use the ANGLE directly as a tangent DIRECTION (not a dX/dY slope) — a parametric
  // Bezier handle can point exactly horizontal (angle=90) without the infinite-slope problem a
  // halfWidth-as-function-of-station spline would hit.
  const tailRad = (spec.tailAngle * Math.PI) / 180;
  const noseRad = (spec.noseAngle * Math.PI) / 180;
  const dir0: Direction2D = { x: Math.cos(tailRad), y: Math.sin(tailRad) };
  const dir4: Direction2D = { x: Math.cos(noseRad), y: -Math.sin(noseRad) };
  const dir2: Direction2D = { x: 1, y: 0 };

  const P0 = { x: tailPodStation, y: Math.max(0, halfTailBlockWidth) };
  const P2 = { x: widePointStation, y: halfWidePointWidth };
  const P4 = { x: length, y: 0 };

  const knotPoints = [P0, P2, P4];
  const knotDirs = [dir0, dir2, dir4];

  const chord = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);
  const chords = [chord(P0, P2), chord(P2, P4)];

  // Widepoint Vector Strength scales each of the widepoint's own handles against that side's true max
  // (HANDLE_CAP*chord). Its tangent is purely along the station axis (dir2.y=0), so a longer handle
  // never carries the half-width past halfWidePointWidth — no overshoot cap needed, on either side.
  //
  // The two sides are independent: inLen0 is the handle pointing back toward the tail
  // (controls[0].c2 = P2 - inLen0*dir2), outLen1 the one pointing toward the nose
  // (controls[1].c1 = P2 + outLen1*dir2). The prototype drove both from a single Widepoint Vector
  // slider; equal values here reproduce it exactly.
  const inLen0 = railMult(spec.tailRailLength) * HANDLE_CAP * chords[0];
  const outLen1 = railMult(spec.noseRailLength) * HANDLE_CAP * chords[1];

  const outLen0Max = tailHandleMaxLength(dir0.y, chords[0], halfWidePointWidth, P0.y);
  const outLen0 = (spec.tailFullness / 100) * outLen0Max;

  const inLen1Max = noseHandleMaxLength(dir4.y, chords[1], halfWidePointWidth);
  const inLen1 = (spec.noseFullness / 100) * inLen1Max;

  const outLen = [outLen0, outLen1];
  const inLen = [inLen0, inLen1];

  const controls: { c1: { x: number; y: number }; c2: { x: number; y: number } }[] = [];
  for (let i = 0; i < 2; i++) {
    const A = knotPoints[i];
    const Ad = knotDirs[i];
    const B = knotPoints[i + 1];
    const Bd = knotDirs[i + 1];
    controls.push({
      c1: { x: A.x + outLen[i] * Ad.x, y: A.y + outLen[i] * Ad.y },
      c2: { x: B.x - inLen[i] * Bd.x, y: B.y - inLen[i] * Bd.y },
    });
  }

  const bez = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };

  const rawPoints: { station: number; halfWidth: number }[] = [];
  for (let seg = 0; seg < 2; seg++) {
    const A = knotPoints[seg];
    const B = knotPoints[seg + 1];
    const c = controls[seg];
    const start = seg === 0 ? 0 : 1;
    for (let i = start; i <= SAMPLES_PER_SEGMENT; i++) {
      const t = i / SAMPLES_PER_SEGMENT;
      const station = bez(A.x, c.c1.x, c.c2.x, B.x, t);
      const halfWidth = bez(A.y, c.c1.y, c.c2.y, B.y, t);
      // Absolute bound: no sampled point may exceed the widepoint's half-width, whatever the handle
      // lengths/angles produce — the widepoint is the true maximum, by definition.
      rawPoints.push({ station, halfWidth: Math.max(0, Math.min(halfWidth, halfWidePointWidth)) });
    }
  }
  rawPoints.sort((a, b) => a.station - b.station);

  const points: OutlinePoint[] = rawPoints.map((p) => ({
    station: mm(p.station),
    halfWidth: mm(p.halfWidth),
  }));

  const tailWidthAt12in = mm(2 * interpolateHalfWidth(points, Math.min(MEASURE_STATION_MM, length)));
  const noseWidthAt12in = mm(2 * interpolateHalfWidth(points, Math.max(0, length - MEASURE_STATION_MM)));

  let area = 0;
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p0 = rawPoints[i];
    const p1 = rawPoints[i + 1];
    area += ((p0.halfWidth + p1.halfWidth) / 2) * (p1.station - p0.station);
  }
  area *= 2;

  const knots = knotPoints.map((p, i) => ({
    point: { x: mm(p.x), y: mm(p.y) },
    tangent: knotDirs[i],
  })) as [OutlineKnot, OutlineKnot, OutlineKnot];

  const handles: OutlineHandle[] = [];
  for (let i = 0; i < 2; i++) {
    handles.push({
      from: { x: mm(knotPoints[i].x), y: mm(knotPoints[i].y) },
      to: { x: mm(controls[i].c1.x), y: mm(controls[i].c1.y) },
    });
    handles.push({
      from: { x: mm(knotPoints[i + 1].x), y: mm(knotPoints[i + 1].y) },
      to: { x: mm(controls[i].c2.x), y: mm(controls[i].c2.y) },
    });
  }

  const segments: BezierSegment[] = [0, 1].map((i) => ({
    p0: { x: mm(knotPoints[i].x), y: mm(knotPoints[i].y) },
    c0: { x: mm(controls[i].c1.x), y: mm(controls[i].c1.y) },
    c1: { x: mm(controls[i].c2.x), y: mm(controls[i].c2.y) },
    p1: { x: mm(knotPoints[i + 1].x), y: mm(knotPoints[i + 1].y) },
  }));

  return {
    length: mm(length),
    halfWidePointWidth: mm(halfWidePointWidth),
    halfTailBlockWidth: mm(halfTailBlockWidth),
    tailBlockPinned,
    widePointStation: mm(widePointStation),
    tailPodStation: mm(tailPodStation),
    centreCloseStation: mm(centreCloseStation),
    effectiveDiamondDepth: mm(effectiveDiamondDepth),
    knots,
    handles,
    segments,
    points,
    area,
    tailWidthAt12in,
    noseWidthAt12in,
  };
}
