/**
 * Textbook pchip — the piecewise cubic Hermite interpolating polynomial, exactly as SciPy's
 * `PchipInterpolator` and MATLAB's `pchip` compute it (Phase 11 D-13).
 *
 * Every curve the app fits through a handful of measured stations — a foam blank's rocker,
 * thickness and width, the board's deck — goes through this one sampler. It is chosen because it
 * is monotone between knots by construction: an ordinary cubic spline overshoots at a sharp nose
 * kick and invents a hump (or a dip) between two catalogue stations that the foam does not have,
 * while pchip's curve between any two stations always stays between those two stations' values.
 *
 * The tangent rules are written down in D-13 so the numbers match SciPy digit for digit:
 * - interior: the weighted harmonic mean of the two flanking secants, with
 *   w1 = 2h_k + h_{k−1} and w2 = h_k + 2h_{k−1}; zero when either secant is flat or the two
 *   disagree in sign;
 * - ends: the three-point rule ((2h0 + h1)δ0 − h0δ1) / (h0 + h1), reset to 0 if its sign differs
 *   from δ0's, and clamped to 3δ0 when δ0 and δ1 differ in sign and it is larger than that;
 *   mirrored at the far end;
 * - two points: a straight line.
 *
 * The Fritsch–Carlson "circle of radius three" clamp that `monotone-spline.ts` applies is
 * deliberately ABSENT. These tangents already sit inside the monotone region (every interior
 * tangent is at most three times either flanking secant, and the end rule is clamped to 3δ0), so
 * the circle clamp is not needed for monotonicity — and it would rescale perfectly valid pchip
 * tangent pairs (e.g. α = β = 2.5, where α² + β² = 12.5 > 9) and break parity with SciPy.
 *
 * Fitting and sampling are split: `preparePchip` computes the tangents once, and the returned
 * `sample` only evaluates (R14 — a drag samples a prepared fit, it never refits).
 *
 * No React/browser/database import — a pure numerical method, unit-tested in isolation
 * (pchip.test.ts), per CLAUDE.md Rule 1.
 */

/** One knot the curve passes through exactly. */
export interface SplinePoint {
  x: number;
  y: number;
}

/**
 * pchip's tangent (first derivative) at every knot, per D-13. `xs` must be strictly increasing;
 * `preparePchip` checks that before calling this. One knot → `[0]`; two knots → both tangents
 * equal the secant (a straight line).
 */
export function pchipSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const h: number[] = [];
  const delta: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    h.push(xs[k + 1] - xs[k]);
    delta.push((ys[k + 1] - ys[k]) / h[k]);
  }
  if (n === 2) return [delta[0], delta[0]];

  const slopes = new Array<number>(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    const before = delta[k - 1];
    const after = delta[k];
    if (before === 0 || after === 0 || before > 0 !== after > 0) continue;
    const w1 = 2 * h[k] + h[k - 1];
    const w2 = h[k] + 2 * h[k - 1];
    slopes[k] = (w1 + w2) / (w1 / before + w2 / after);
  }

  slopes[0] = endSlope(h[0], h[1], delta[0], delta[1]);
  slopes[n - 1] = endSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  return slopes;
}

/**
 * pchip's three-point end tangent. `h0`/`d0` are the end interval's width and secant, `h1`/`d1`
 * the next interval in. Reset to 0 when it points the opposite way from the end secant; clamped
 * to 3·d0 when the two secants disagree in sign and it would otherwise overshoot.
 */
function endSlope(h0: number, h1: number, d0: number, d1: number): number {
  const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(slope) !== Math.sign(d0)) return 0;
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(slope) > Math.abs(3 * d0)) return 3 * d0;
  return slope;
}

/** A pchip curve fitted once: its knots, its tangents, and a sampler that only evaluates. */
export interface PreparedPchip {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly slopes: readonly number[];
  sample(x: number): number;
  /**
   * The curve's slope at `x` — the analytic derivative of the Hermite segment containing `x`
   * (`d00 = (6t² − 6t)/h`, `d10 = 3t² − 4t + 1`, `d01 = (−6t² + 6t)/h`, `d11 = 3t² − 2t`), so
   * at a knot it is that knot's own slope. 0 past either end, where `sample` holds flat; 0 on a
   * curve of fewer than two knots; 0 for a non-finite x. Arrived with the tips step of Phase 14
   * (D-28): the steady taper leaves the planer cut along this slope.
   */
  slopeAt(x: number): number;
}

/**
 * Fits pchip through `points` once. The knot arrays are copied, so changing the caller's points
 * afterwards changes nothing this curve returns (R14).
 *
 * Throws a plain `Error` naming the offending index if any x or y is not a finite number, or if
 * the x values are not strictly increasing — a bad knot must fail loudly here rather than turn
 * into a not-a-number that blanks a drawing or a fit verdict downstream (threat T-11-02).
 *
 * `sample(x)`: exact at every knot; clamps past either end to that end's y (the same posture as
 * `sampleOutline`'s past-the-end fallback); a non-finite x returns the first knot's y rather than
 * propagating a not-a-number; an empty curve samples as 0.
 *
 * `slopeAt(x)`: the slope of that same curve, sharing the sampler's search for the segment (see
 * `PreparedPchip.slopeAt`).
 */
export function preparePchip(points: readonly SplinePoint[]): PreparedPchip {
  const xs: number[] = [];
  const ys: number[] = [];
  points.forEach((point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`pchip knot ${index} is not a finite number (x=${point.x}, y=${point.y})`);
    }
    if (index > 0 && !(point.x > xs[index - 1])) {
      throw new Error(
        `pchip knot ${index} (x=${point.x}) does not lie after knot ${index - 1} (x=${xs[index - 1]})`,
      );
    }
    xs.push(point.x);
    ys.push(point.y);
  });
  const slopes = pchipSlopes(xs, ys);
  const n = xs.length;

  /** The segment containing x: k with xs[k] <= x < xs[k + 1] (x strictly inside the knots). */
  function segmentOf(x: number): number {
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function sample(x: number): number {
    if (n === 0) return 0;
    if (!Number.isFinite(x)) return ys[0];
    if (n === 1 || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

    const lo = segmentOf(x);
    const width = xs[lo + 1] - xs[lo];
    const t = (x - xs[lo]) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * ys[lo] + h10 * width * slopes[lo] + h01 * ys[lo + 1] + h11 * width * slopes[lo + 1];
  }

  function slopeAt(x: number) {
    if (n < 2 || !Number.isFinite(x)) return 0;
    if (x < xs[0] || x > xs[n - 1]) return 0;
    if (x === xs[n - 1]) return slopes[n - 1];

    const lo = segmentOf(x);
    const width = xs[lo + 1] - xs[lo];
    const t = (x - xs[lo]) / width;
    const t2 = t * t;
    const d00 = (6 * t2 - 6 * t) / width;
    const d10 = 3 * t2 - 4 * t + 1;
    const d01 = (-6 * t2 + 6 * t) / width;
    const d11 = 3 * t2 - 2 * t;
    return d00 * ys[lo] + d10 * slopes[lo] + d01 * ys[lo + 1] + d11 * slopes[lo + 1];
  }

  return { xs, ys, slopes, sample, slopeAt };
}

/** One-shot convenience: fit `points` and sample at `x`. Prefer `preparePchip` for many samples. */
export function samplePchip(points: readonly SplinePoint[], x: number): number {
  return preparePchip(points).sample(x);
}

/**
 * The exact minimum of a prepared pchip curve over `[from, to]` (either order). Because pchip is
 * monotone on every interval between two knots, the lowest point over any stretch is one of its
 * two ends or a knot strictly inside it — so this is exact, with no dense search.
 */
export function pchipMinimum(curve: PreparedPchip, from: number, to: number): number {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  let minimum = Math.min(curve.sample(lo), curve.sample(hi));
  for (let k = 0; k < curve.xs.length; k++) {
    const x = curve.xs[k];
    if (x > lo && x < hi && curve.ys[k] < minimum) minimum = curve.ys[k];
  }
  return minimum;
}
