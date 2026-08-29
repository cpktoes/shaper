/**
 * Monotone cubic Hermite spline sampler — Fritsch-Carlson tangent construction.
 *
 * Shared by `lib/geometry/rocker.ts` and `lib/geometry/foil.ts` (04-01 Task 1/2): both curves are
 * built from a handful of shaper-entered station values, and GEOMETRY-MODULE.md's "no fold-backs"
 * rule (Bezier/spline segments must stay monotonic in x) has to hold for ANY station values a
 * slider or typed field can produce — not just the defaults. Rather than fitting an unconstrained
 * curve (the prototype's own `buildSideProfile` used Catmull-Rom, which CAN fold back — see
 * RESEARCH.md's Anti-Patterns/Pitfall 5) and validating it after the fact with a `validateBoard`
 * module this codebase does not have, this sampler picks a spline family that is monotone BY
 * DEFINITION: a cubic Hermite spline whose tangents are Fritsch-Carlson-clamped so the curve
 * between any two points can never overshoot either endpoint's y value.
 *
 * No React/browser/database import — pure numerical method, unit-tested in isolation
 * (monotone-spline.test.ts), per CLAUDE.md Rule 1.
 */

/** One knot the spline passes through exactly. */
export interface SplinePoint {
  x: number;
  y: number;
}

/**
 * The three-point (weighted harmonic mean) tangent estimate at an interior point, from the two
 * secants flanking it. Zero whenever either secant is flat or the two secants disagree in sign —
 * a flat tangent is the only choice that cannot overshoot in either direction at a local
 * extremum, and the Fritsch-Carlson clamp below still gets the final say regardless of this
 * estimate.
 */
function threePointTangent(
  hBefore: number,
  hAfter: number,
  secantBefore: number,
  secantAfter: number,
): number {
  if (secantBefore === 0 || secantAfter === 0) return 0;
  if (secantBefore > 0 !== secantAfter > 0) return 0;
  const hs = hBefore + hAfter;
  const w1 = (hBefore + hs) / (3 * hs);
  const w2 = (hs + hAfter) / (3 * hs);
  return 1 / (w1 / secantBefore + w2 / secantAfter);
}

/**
 * Fritsch-Carlson tangent at every point: secant slopes between consecutive points, a three-point
 * tangent at each interior point, one-sided tangents at the two ends, then the clamp that zeroes a
 * tangent where its flanking secant is flat and otherwise scales the tangent pair into the circle
 * of radius three around each secant — the step that actually guarantees monotonicity, whatever
 * the initial estimate above produced.
 */
export function monotoneSlopes(points: SplinePoint[]): number[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const secants: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    secants.push(dx !== 0 ? (points[k + 1].y - points[k].y) / dx : 0);
  }

  const tangents: number[] = new Array(n);
  tangents[0] = secants[0];
  tangents[n - 1] = secants[n - 2];
  for (let k = 1; k < n - 1; k++) {
    const hBefore = points[k].x - points[k - 1].x;
    const hAfter = points[k + 1].x - points[k].x;
    tangents[k] = threePointTangent(hBefore, hAfter, secants[k - 1], secants[k]);
  }

  for (let k = 0; k < n - 1; k++) {
    const secant = secants[k];
    if (secant === 0) {
      tangents[k] = 0;
      tangents[k + 1] = 0;
      continue;
    }
    const alpha = tangents[k] / secant;
    const beta = tangents[k + 1] / secant;
    if (alpha < 0) tangents[k] = 0;
    if (beta < 0) tangents[k + 1] = 0;
    const clampedAlpha = tangents[k] / secant;
    const clampedBeta = tangents[k + 1] / secant;
    const magnitude = clampedAlpha * clampedAlpha + clampedBeta * clampedBeta;
    if (magnitude > 9) {
      const tau = 3 / Math.sqrt(magnitude);
      tangents[k] = tau * clampedAlpha * secant;
      tangents[k + 1] = tau * clampedBeta * secant;
    }
  }

  return tangents;
}

/**
 * Evaluates the monotone cubic Hermite spline through `points` at `x`. Clamps `x` outside the
 * first/last point to the end values (matches `sampleOutline`'s own past-the-end fallback), and
 * guards a non-finite `x` by returning the first point's y — the same posture `quantise` in
 * `lib/geometry/outline-drag.ts` takes for a non-finite drag value, rather than propagating a
 * not-a-number through every drawn point and blanking the whole side profile (threat T-04-02).
 */
export function sampleMonotoneSpline(points: SplinePoint[], x: number): number {
  if (points.length === 0) return 0;
  if (!Number.isFinite(x)) return points[0].y;
  if (points.length === 1) return points[0].y;

  const first = points[0];
  const last = points[points.length - 1];
  if (x <= first.x) return first.y;
  if (x >= last.x) return last.y;

  const tangents = monotoneSlopes(points);

  for (let k = 0; k < points.length - 1; k++) {
    const p0 = points[k];
    const p1 = points[k + 1];
    if (x >= p0.x && x <= p1.x) {
      const h = p1.x - p0.x;
      if (h === 0) return p0.y;
      const t = (x - p0.x) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      return h00 * p0.y + h10 * h * tangents[k] + h01 * p1.y + h11 * h * tangents[k + 1];
    }
  }
  return last.y;
}
