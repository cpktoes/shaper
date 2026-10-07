/*
 * REFERENCE COPY — never edited.
 *
 * This is the curve code behind sketch 012's page (.planning/sketches/012-blank-round-nose/), copied
 * byte for byte from that sketch's own archive (sketch-source.tar.gz, curves.js) on 2026-10-07, below
 * this comment. It is the source of truth for the round nose (quick 261007-c3h, Rule 1: the
 * expected numbers come from the prototype's own code, never a transcription).
 *
 * `variantC` and `parabolaCoefficients` are the founder's pick: "C looks great and seems like the
 * simplest update too." Its own copy of today's pchip and square-root fall was checked against the
 * app's own samples by the archive's check012.mjs.
 *
 * It works in INCHES and HALF-widths: x is inches from the blank's tail tip, and each sample is
 * [x, halfWidth].
 *
 * It is run only by scripts/extract-round-nose-golden.ts, which writes
 * lib/geometry/__fixtures__/round-nose-golden.json. The app never imports it.
 *
 * Do not edit anything below this comment. The golden is only as good as this copy is faithful, and
 * the copy is only faithful while the body is the archive's curves.js unchanged.
 */
/* Sketch 012 — the width curves, in inches. `today` is a line-for-line port of the app's
   lib/geometry/pchip.ts + root-curve.ts ("fall"), checked against the app's own samples by check012.mjs. */
function pchipSlopes(xs, ys) {
  const n = xs.length;
  if (n === 0) return [];
  if (n === 1) return [0];
  const h = [], delta = [];
  for (let k = 0; k < n - 1; k++) { h.push(xs[k + 1] - xs[k]); delta.push((ys[k + 1] - ys[k]) / h[k]); }
  if (n === 2) return [delta[0], delta[0]];
  const slopes = new Array(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    const before = delta[k - 1], after = delta[k];
    if (before === 0 || after === 0 || (before > 0) !== (after > 0)) continue;
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    slopes[k] = (w1 + w2) / (w1 / before + w2 / after);
  }
  const endSlope = (h0, h1, d0, d1) => {
    const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(slope) !== Math.sign(d0)) return 0;
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(slope) > Math.abs(3 * d0)) return 3 * d0;
    return slope;
  };
  slopes[0] = endSlope(h[0], h[1], delta[0], delta[1]);
  slopes[n - 1] = endSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  return slopes;
}
function preparePchip(points) {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const slopes = pchipSlopes(xs, ys), n = xs.length;
  const segmentOf = (x) => { let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; } return lo; };
  const sample = (x) => {
    if (n === 0) return 0;
    if (!Number.isFinite(x)) return ys[0];
    if (n === 1 || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    const lo = segmentOf(x), width = xs[lo + 1] - xs[lo], t = (x - xs[lo]) / width, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * width * slopes[lo] + (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * width * slopes[lo + 1];
  };
  const slopeAt = (x) => {
    if (n < 2 || !Number.isFinite(x) || x < xs[0] || x > xs[n - 1]) return 0;
    if (x === xs[n - 1]) return slopes[n - 1];
    const lo = segmentOf(x), width = xs[lo + 1] - xs[lo], t = (x - xs[lo]) / width, t2 = t * t;
    return ((6 * t2 - 6 * t) / width) * ys[lo] + (3 * t2 - 4 * t + 1) * slopes[lo] + ((-6 * t2 + 6 * t) / width) * ys[lo + 1] + (3 * t2 - 2 * t) * slopes[lo + 1];
  };
  return { xs, ys, slopes, sample, slopeAt };
}
/* The app's square-root "fall": high − g², g the pchip through ±√(high − yᵢ), negative before the widest station. */
function prepareRootFall(points) {
  const printed = preparePchip(points);
  const { xs, ys } = printed, n = xs.length;
  if (n < 2) return printed;
  const anchor = Math.max(...ys), first = ys.indexOf(anchor);
  const g = preparePchip(xs.map((x, i) => ({ x, y: (i < first ? -1 : 1) * Math.sqrt(Math.abs(ys[i] - anchor)) })));
  const sample = (x) => {
    if (!Number.isFinite(x) || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    if (xs[lo] === x) return ys[lo];
    const r = g.sample(x); return anchor - r * r;
  };
  const slopeAt = (x) => (!Number.isFinite(x) || x < xs[0] || x > xs[n - 1]) ? 0 : -2 * g.sample(x) * g.slopeAt(x);
  const slopes = g.ys.map((root, k) => -2 * root * g.slopes[k]);
  return { xs, ys, slopes, sample, slopeAt };
}

/* ---- The three ways to reach a nose printed 0 wide. Each returns half-width samples [x, hw] in
   the blank's own inches (x from the tail tip), tail to nose, dense enough to draw. ---- */
function printedWidths(record) { return record.stations.filter((s) => s.widthIn !== null).map((s) => ({ x: s.fromTailIn, y: s.widthIn })); }
function noseSegment(record) {
  const pts = printedWidths(record);
  const tip = pts[pts.length - 1], last = pts[pts.length - 2];
  return { tip, last, zeroNose: tip.y === 0 && last.y > 0, D: tip.x - last.x };
}
function sampleXs(record, step) {
  const L = record.lengthIn, xs = [];
  for (let x = 0; x < L; x += step) xs.push(x);
  xs.push(L);
  for (const p of printedWidths(record)) xs.push(p.x);
  xs.sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-9);
}
/* A — today: the square-root fall through every printed width, straight to the 0 tip. */
function todayCurve(record) { return prepareRootFall(printedWidths(record)); }
function variantA(record, step = 0.25) { const c = todayCurve(record); return sampleXs(record, step).map((x) => [x, c.sample(x) / 2]); }

/* B — the founder's control point: today's curve up to the last printed station, then one cubic
   Bezier to the tip whose first handle lies along today's own slope and whose tip handle points
   straight across the stringer (perpendicular). Handles are `k` × the chord between the two points. */
function variantB(record, k = 1 / 3, step = 0.25, kTip = k) {
  const c = todayCurve(record), seg = noseSegment(record);
  if (!seg.zeroNose) return variantA(record, step);
  const x0 = seg.last.x, y0 = seg.last.y / 2, m = c.slopeAt(x0) / 2;  // dhw/dx at the station (negative toward the nose)
  const x3 = seg.tip.x, y3 = 0;
  const chord = Math.hypot(x3 - x0, y3 - y0);
  const dir = Math.hypot(1, m);
  const p1 = [x0 + (k * chord) / dir, y0 + (k * chord * m) / dir];
  const p2 = [x3, y3 + kTip * chord];
  const out = sampleXs(record, step).filter((x) => x <= x0 + 1e-9).map((x) => [x, c.sample(x) / 2]);
  const N = 48;
  for (let i = 1; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * y3;
    out.push([x, Math.max(0, y)]);
  }
  return out;
}
function variantBHandles(record, k = 1 / 3, kTip = k) {
  const c = todayCurve(record), seg = noseSegment(record);
  const x0 = seg.last.x, y0 = seg.last.y / 2, m = c.slopeAt(x0) / 2, x3 = seg.tip.x;
  const chord = Math.hypot(x3 - x0, y0), dir = Math.hypot(1, m);
  return { p0: [x0, y0], p1: [x0 + (k * chord) / dir, y0 + (k * chord * m) / dir], p2: [x3, kTip * chord], p3: [x3, 0], chord, m };
}

/* C — a parabola from the tip: inside the last printed station the half-width is a·√d + b·d, d the
   distance in from the tip — the shape every round nose has at its very tip (its tangent is across
   the stringer) — with a and b chosen so it meets the station at the printed width AND at today's
   own slope there. Nothing to tune; the printed numbers decide it. Falls back to today's curve when
   the data is more pointed than a straight line to the tip (a ≤ 0). */
function parabolaCoefficients(record) {
  const c = todayCurve(record), seg = noseSegment(record);
  if (!seg.zeroNose) return null;
  const D = seg.D, hw = seg.last.y / 2, mk = -c.slopeAt(seg.last.x) / 2;  // dhw/dd, positive
  const a = (2 * (hw - D * mk)) / Math.sqrt(D), b = 2 * mk - hw / D;
  return { D, hw, mk, a, b, tipRadius: (a * a) / 2, pointed: a <= 0 };
}
function variantC(record, step = 0.25) {
  const c = todayCurve(record), seg = noseSegment(record), co = parabolaCoefficients(record);
  if (!co || co.pointed) return variantA(record, step);
  const x0 = seg.last.x, x3 = seg.tip.x;
  const out = sampleXs(record, step).filter((x) => x <= x0 + 1e-9).map((x) => [x, c.sample(x) / 2]);
  const N = 48;
  for (let i = 1; i <= N; i++) {
    // Even steps in √d, so the samples crowd toward the tip where the curve turns fastest.
    const u = (1 - i / N) * Math.sqrt(co.D), d = u * u;
    out.push([x3 - d, Math.max(0, co.a * u + co.b * d)]);
  }
  return out;
}
if (typeof module !== "undefined") module.exports = { pchipSlopes, preparePchip, prepareRootFall, todayCurve, variantA, variantB, variantBHandles, variantC, parabolaCoefficients, noseSegment, printedWidths };
