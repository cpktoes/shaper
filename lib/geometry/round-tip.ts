/**
 * The round nose — how a blank's width is drawn inside the last printed station before a tip the
 * catalogue prints 0 wide (quick 261007-c3h, from sketch 012, the founder's pick of 2026-10-07).
 *
 * The founder's words, choosing variant C from three: "C looks great and seems like the simplest
 * update too."
 *
 * The problem it answers. A catalogue that prints a blank's nose 0 wide is saying "the foam comes
 * to its end here", not "the foam ends in a point". Real foam has a rounded nose; a blank's own
 * outline curve (the square-root fall, `root-curve.ts`) runs from the last printed width straight
 * down to 0 at the tip, and on the Mid-length's 7'4"SP and the Longboard's 9'4"B that drew a point,
 * with the rail running along the blank's edge instead of leaving it, and it understated the foam
 * inside the last printed station, so the fit check refused boards that would have fitted.
 *
 * The rule. Inside the last printed station before such a tip the blank's FULL width becomes a
 * parabola from the tip:
 *
 *     W(d) = A·√d + B·d        d = the distance in from the tip
 *
 * A parabola lying on its side is exactly what a round tip looks like: at d = 0 it is vertical, so
 * the outline leaves the tip straight across the stringer. Two numbers shape it, and both come from
 * the printed widths alone, so nothing is set and nothing is stored. With D the distance from the
 * last printed station to the tip, W_k the width printed at that station and M_k today's slope
 * there, taken toward the tip and positive when the width falls toward the tip:
 *
 *     A = 2·(W_k − D·M_k) / √D        B = 2·M_k − W_k / D
 *
 * Those two make the parabola meet the station at EXACTLY the printed width (A·√D + B·D = W_k) and
 * at EXACTLY today's slope (A / (2√D) + B = M_k), so the join has no kink. The formula is the same
 * in inches or millimetres: A·√d and B·d both scale with the unit, so it never needs a conversion.
 *
 * Everything else is today's curve. From that station back to the far tip `sample` hands the
 * question to the curve it wraps, so those widths are bit-identical to before, and every printed
 * station reads its printed number exactly (the station itself and the tip itself are never
 * computed here either).
 *
 * The guard (D2). A tip rounds only when it prints exactly 0, the station before it prints more
 * than 0, A > 0 (a parabola that is MORE pointed than a straight line to the tip would take foam
 * away, which the founder did not choose) and M_k ≥ 0. That last test is not a new rule. On a
 * square-root fall curve the width at the station before a 0-wide tip is always falling toward the
 * tip or flat, never rising, because: the root g of the drop from the widest width is largest in
 * size at a 0-wide tip (the tip is as far below the widest width as any station can be), and pchip
 * is shape-preserving, so its slope at the station before the tip never points away from the tip.
 * At a nose g ≥ 0 and g′ ≥ 0 there, so the width's slope −2·g·g′ is ≤ 0, falling toward the tip;
 * at a tail g ≤ 0 and g′ ≥ 0, so the slope −2·g·g′ is ≥ 0, again falling toward the tip. The check
 * only keeps the wrapper honest for any curve it is handed: with M_k < 0 the parabola would rise
 * above W_k before falling.
 *
 * Both tips (D4). A 0-wide tail with a wider station before it rounds the same way. No catalogue
 * blank prints one, so the tail is proven on a mirrored record in round-tip.test.ts.
 *
 * The slope at the rounded tip itself reads ±Infinity — −Infinity at a nose, +Infinity at a tail
 * (D5) — because the parabola there is truly vertical. Nothing in the app reads a width slope today
 * (the width curve is read only through `sample`), and an infinity cannot be mistaken for a real
 * number by any code that reads it later, where a made-up finite figure could be. `sample` never
 * returns an infinity. Inside a rounded segment `slopeAt` is the parabola's own derivative with
 * respect to x, signed for the curve's direction; past either end it is 0, as it always was.
 *
 * Width only (D3). `prepareBlankWith` wraps the blank's WIDTH curve under the live "root" rule and
 * nothing else: not its thickness, not its rocker, not a hand-set board's foil (which also uses
 * the "fall" rule, `fallbackProfileWith`), and not `prepareRootCurve` itself, which stays exactly
 * as Phase 14 shipped it. The "pchip" rule, kept by name for old boards, is untouched.
 *
 * No React/browser/database import — pure geometry, tested in round-tip.test.ts (CLAUDE.md Rule 1).
 */
import type { PreparedPchip } from "./pchip";

/** One rounded tip: where it is, which way "in from the tip" runs, and the parabola's numbers. */
interface RoundedTip {
  /** The tip's own position along the blank. */
  readonly tipX: number;
  /** The last printed station before it (its position). */
  readonly stationX: number;
  /** Index of the tip in the curve's knots. */
  readonly tipIndex: number;
  /** +1 for a tail (the blank runs on from the tip toward larger x), −1 for a nose. */
  readonly direction: 1 | -1;
  readonly a: number;
  readonly b: number;
}

/**
 * Works out whether the tip at `tipIndex` (the first or last knot) rounds, and if so with what
 * numbers. `null` means the curve is left as it is (D2).
 */
function roundOf(curve: PreparedPchip, tipIndex: number, stationIndex: number): RoundedTip | null {
  const { xs, ys } = curve;
  const tipX = xs[tipIndex];
  const stationX = xs[stationIndex];
  const width = ys[stationIndex];
  if (ys[tipIndex] !== 0 || !(width > 0)) return null;
  const direction: 1 | -1 = tipIndex === 0 ? 1 : -1;
  const reach = Math.abs(stationX - tipX);
  // M: today's slope at the station, toward the tip, positive when the width falls toward the tip.
  const slopeIn = direction * curve.slopeAt(stationX);
  if (!(reach > 0) || !Number.isFinite(slopeIn) || slopeIn < 0) return null;
  const a = (2 * (width - reach * slopeIn)) / Math.sqrt(reach);
  const b = 2 * slopeIn - width / reach;
  if (!(a > 0) || !Number.isFinite(b)) return null;
  return { tipX, stationX, tipIndex, direction, a, b };
}

/** True when x lies strictly between a rounded tip and its last printed station. */
function insideSegment(tip: RoundedTip, x: number): boolean {
  const lo = Math.min(tip.tipX, tip.stationX);
  const hi = Math.max(tip.tipX, tip.stationX);
  return Number.isFinite(x) && x > lo && x < hi;
}

/**
 * Wraps a prepared WIDTH curve so a tip printed 0 wide is the round parabola from the tip inside
 * its last printed segment (see the file header), and so everything else is the curve it was
 * handed. Returns the same curve object when no tip rounds. Otherwise returns a new curve with the
 * same `xs` and `ys` arrays and its own copy of `slopes` (the wrapped curve's is never changed).
 */
export function roundZeroTips(curve: PreparedPchip): PreparedPchip {
  const n = curve.xs.length;
  if (n < 2) return curve;

  const tail = roundOf(curve, 0, 1);
  const nose = roundOf(curve, n - 1, n - 2);
  if (!tail && !nose) return curve;

  const tips = [tail, nose].filter((tip): tip is RoundedTip => tip !== null);

  function sample(x: number): number {
    for (const tip of tips) {
      if (insideSegment(tip, x)) {
        const d = Math.abs(x - tip.tipX);
        return tip.a * Math.sqrt(d) + tip.b * d;
      }
    }
    return curve.sample(x);
  }

  function slopeAt(x: number): number {
    for (const tip of tips) {
      if (x === tip.tipX) return tip.direction * Infinity;
      if (insideSegment(tip, x)) {
        const d = Math.abs(x - tip.tipX);
        return tip.direction * (tip.a / (2 * Math.sqrt(d)) + tip.b);
      }
    }
    return curve.slopeAt(x);
  }

  const slopes = Array.from(curve.slopes);
  for (const tip of tips) slopes[tip.tipIndex] = tip.direction * Infinity;

  return { xs: curve.xs, ys: curve.ys, slopes, sample, slopeAt };
}
