/**
 * The square-root curve — how Phase 14 draws a curve through a blank's printed stations (D-13).
 *
 * Why it exists: a real blank's bottom climbs away from its low point roughly with the SQUARE of
 * the distance from it, so the square root of each station's lift above the lowest station is very
 * nearly a straight line along the blank — and a nearly straight line is something five stations
 * pin down well. Today's pchip drawn straight through the raw lifts cannot know that, and on US
 * Blanks' own catalogue (which prints extra stations to check against) it sits measurably further
 * from the real foam (the research record, 14-RESEARCH.md Q6). So this rule takes the square root,
 * runs today's pchip through those roots, and squares the result back. No new curve family is
 * written: the curve inside is `preparePchip`, the same tested sampler, unchanged.
 *
 * Two kinds:
 * - `"rise"` — a blank's bottom (and a hand-set rocker): `low + g(x)²`, with `g` the pchip through
 *   `±√(yᵢ − low)`. Stations before the FIRST lowest station take the negative root, so `g` runs
 *   steadily through 0 at the low point instead of bouncing off it.
 * - `"fall"` — thickness and width: `high − g(x)²`, with `g` through `±√(high − yᵢ)`, negative
 *   before the FIRST thickest (widest) station. That station need not be the centre: a blank
 *   printed thickest toward the nose is drawn thickest there, as printed (D-14).
 *
 * Exact at every printed station (Pitfall 3): a square root then a square misses a printed value by
 * up to about 1e-13 mm on more than a quarter of the catalogue's stations, so `sample` returns the
 * printed value itself whenever it is asked for exactly a station's position. Anything that checks
 * "the curve reads the catalogue's number" can then use exact equality.
 *
 * Never strays between stations: `g` is pchip, so it stays between its two neighbouring knots, and
 * both neighbours of any interval share a sign (or one of them is the anchor's 0) — so `g²` grows
 * and shrinks with `|g|`, and the curve stays between the two printed values either side. For the
 * same reason a `"rise"` never reads below its lowest station and a `"fall"` never above its
 * highest.
 *
 * Its slope (`slopeAt`) arrived with the tips step (Phase 14 D-28), the one thing the steady taper
 * needs from the curves: `f′ = 2·g·g′` for a rise and `−2·g·g′` for a fall, with `g′` the Hermite
 * derivative of `g` — so the curve is smooth through every station, its slope included.
 *
 * Knots are checked exactly as `preparePchip` checks them, with the same plain error: a bad
 * catalogue cell fails loudly here rather than turning into a not-a-number downstream (T-14-03).
 *
 * No React/browser/database import — pure geometry, tested in root-curve.test.ts (CLAUDE.md
 * Rule 1).
 */
import { preparePchip, type PreparedPchip, type SplinePoint } from "./pchip";

/** Which way a curve runs from its anchor station: up from the lowest, or down from the highest. */
export type RootKind = "rise" | "fall";

/**
 * Which rule draws a curve between printed stations: `"root"`, the square-root rule in this file
 * (the live rule from Phase 14 on), or `"pchip"`, today's pchip straight through the printed values,
 * kept callable by name so the boards recorded before Phase 14 can still be redrawn as they were
 * (D-25).
 */
export type CurveRule = "root" | "pchip";

/**
 * Fits the square-root curve through `points` once (see the file header). The knot arrays are
 * copied, so changing the caller's points afterwards changes nothing this curve returns.
 *
 * Throws exactly what `preparePchip` throws for a non-finite or out-of-order knot. With no points
 * the curve reads 0 everywhere, and with one point it reads that point's value everywhere — both
 * exactly as `preparePchip` does.
 *
 * `sample(x)`: the printed value at every station; past either end, that end's value; a non-finite
 * x reads the first station's value rather than a not-a-number.
 *
 * `slopes[k]` is the curve's own slope at each station: `±2·g(xₖ)·g′(xₖ)`.
 *
 * `slopeAt(x)`: the curve's slope, `±2·g(x)·g′(x)`, inside the stations; 0 past either end (where
 * `sample` holds flat) and for a non-finite x.
 */
export function prepareRootCurve(points: readonly SplinePoint[], kind: RootKind): PreparedPchip {
  // Validates the knots with pchip's own rule and messages, and keeps its copies of them.
  const printed = preparePchip(points);
  const { xs, ys } = printed;
  const n = xs.length;
  if (n < 2) return printed;

  const anchor = kind === "rise" ? Math.min(...ys) : Math.max(...ys);
  const first = ys.indexOf(anchor);
  const g = preparePchip(
    xs.map((x, i) => ({ x, y: (i < first ? -1 : 1) * Math.sqrt(Math.abs(ys[i] - anchor)) })),
  );
  const sign = kind === "rise" ? 1 : -1;

  function sample(x: number): number {
    if (!Number.isFinite(x) || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

    // Binary search for k with xs[k] <= x < xs[k + 1]; a printed station reads its printed value.
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    if (xs[lo] === x) return ys[lo];

    const r = g.sample(x);
    return anchor + sign * r * r;
  }

  function slopeAt(x: number): number {
    if (!Number.isFinite(x) || x < xs[0] || x > xs[n - 1]) return 0;
    return 2 * sign * g.sample(x) * g.slopeAt(x);
  }

  const slopes = g.ys.map((root, k) => 2 * sign * root * g.slopes[k]);

  return { xs, ys, slopes, sample, slopeAt };
}
