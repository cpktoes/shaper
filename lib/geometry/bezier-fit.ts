/**
 * Smooth cubic Bézier knots through a run of points (quick 261110-tvk, brief decision 2). AkuShaper and Shape3D
 * hold every curve of a board as Bézier knots, each with the knot's own point and two handles (the one coming in
 * from the curve's start, the one going out toward its end), so a board's outline, rocker, deck and cross-sections
 * are fitted here from points read off the surface the 3D screen draws.
 *
 * The fit keeps real corners sharp (a channel wall, a swallow's notch, a square tail's corner, a hard edge): a point
 * where the line turns more than `cornerDeg` between its two chords is a knot of its own with a different handle on
 * each side. It keeps any index the caller names (`keep`), and any index it asks to be level (`level`: a horizontal
 * handle, the way the wide point of an outline and the stringer ends of a cross-section are written). Then it adds
 * knots, always at the source point that sits furthest from the curve, until no span strays from the points by more
 * than `tolerance` — in either direction, points to curve and curve to points. Accuracy wins over the knot count.
 *
 * Pure geometry: numbers in, numbers out, no units (the caller's millimetres stay millimetres).
 */

export type P2 = readonly [number, number];

/** One knot: the point, the handle coming in from the curve's start, the handle going out, and whether it is smooth. */
export interface BezierKnot {
  point: P2;
  before: P2;
  after: P2;
  smooth: boolean;
}

export interface BezierFitOptions {
  /** The furthest the fitted curve may stray from the points, either way (same units as the points). */
  tolerance: number;
  /** Indices (into the points given) that must be knots. */
  keep?: readonly number[];
  /** Indices that must be knots with a horizontal handle. */
  level?: readonly number[];
  /** A turn of more than this many degrees between the two chords at a point makes it a sharp knot. Default 30. */
  cornerDeg?: number;
}

/** How many pieces each span is cut into when the curve is measured against the points. */
const SAMPLES_PER_SPAN = 64;
const SAME_POINT = 1e-6;

const sub = (a: P2, b: P2): [number, number] => [a[0] - b[0], a[1] - b[1]];
const length = (v: readonly [number, number]) => Math.hypot(v[0], v[1]);

/** A cubic's point at t between knot `a` (its outgoing handle) and knot `b` (its incoming handle). */
export function bezierPoint(a: BezierKnot, b: BezierKnot, t: number): P2 {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return [
    w0 * a.point[0] + w1 * a.after[0] + w2 * b.before[0] + w3 * b.point[0],
    w0 * a.point[1] + w1 * a.after[1] + w2 * b.before[1] + w3 * b.point[1],
  ];
}

/** The distance from `p` to the segment a-b. */
function distanceToSegment(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const squared = dx * dx + dy * dy;
  let t = squared > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** The nearest distance from `p` to a polyline's segments `from`..`to` (indices of its points) and which segment it was. */
function distanceToPolyline(p: P2, line: readonly P2[], from = 0, to = line.length - 1): { distance: number; segment: number } {
  let best = Infinity;
  let segment = from;
  for (let j = from; j < to; j++) {
    const d = distanceToSegment(p, line[j], line[j + 1]);
    if (d < best) {
      best = d;
      segment = j;
    }
  }
  if (to <= from) best = Math.hypot(p[0] - line[from][0], p[1] - line[from][1]);
  return { distance: best, segment };
}

/** One span of the fitted curve as a polyline of SAMPLES_PER_SPAN + 1 points. */
function sampleSpan(a: BezierKnot, b: BezierKnot): P2[] {
  return Array.from({ length: SAMPLES_PER_SPAN + 1 }, (_, i) => bezierPoint(a, b, i / SAMPLES_PER_SPAN));
}

/**
 * How far the fitted knots stray from the points: the larger of the two one-way distances — every point to the
 * fitted curve, and the curve (sampled 64 times a span) to the points' own polyline.
 */
export function bezierDeviation(points: readonly P2[], knots: readonly BezierKnot[]): number {
  const curve: P2[] = [];
  for (let i = 0; i + 1 < knots.length; i++) curve.push(...sampleSpan(knots[i], knots[i + 1]).slice(i === 0 ? 0 : 1));
  if (knots.length === 1) curve.push(knots[0].point);
  let worst = 0;
  for (const p of points) worst = Math.max(worst, distanceToPolyline(p, curve).distance);
  for (const c of curve) worst = Math.max(worst, distanceToPolyline(c, points).distance);
  return worst;
}

/** The unit direction of the curve through 2 or 3 consecutive points, at the one numbered `at` (chord-length spacing). */
function directionAt(points: readonly P2[], first: number, count: 2 | 3, at: number): [number, number] {
  const idx = Array.from({ length: count }, (_, k) => first + k);
  const s = [0];
  for (let k = 1; k < count; k++) s.push(s[k - 1] + length(sub(points[idx[k]], points[idx[k - 1]])));
  const x = s[at];
  let dx = 0;
  let dy = 0;
  for (let j = 0; j < count; j++) {
    // The slope of Lagrange basis j at x.
    let slope = 0;
    for (let m = 0; m < count; m++) {
      if (m === j) continue;
      let term = 1 / (s[j] - s[m]);
      for (let q = 0; q < count; q++) if (q !== j && q !== m) term *= (x - s[q]) / (s[j] - s[q]);
      slope += term;
    }
    dx += slope * points[idx[j]][0];
    dy += slope * points[idx[j]][1];
  }
  const size = Math.hypot(dx, dy);
  if (!(size > 0) || !Number.isFinite(size)) {
    // Degenerate (a doubled-back run): fall back on the chord from the first to the last of the points.
    const chord = sub(points[idx[count - 1]], points[idx[0]]);
    const chordSize = length(chord) || 1;
    return [chord[0] / chordSize, chord[1] / chordSize];
  }
  return [dx / size, dy / size];
}

interface KnotSpec {
  index: number; // into the cleaned points
  corner: boolean;
  level: boolean;
  /** The span from this knot to the next is drawn straight (no point to split at, yet off by more than the tolerance). */
  straightAfter: boolean;
}

/**
 * Smooth cubic Bézier knots through `points`, within `options.tolerance` of them. The first knot is the first point
 * exactly and the last the last point, with no handle on the open side. Throws on a non-finite coordinate.
 */
export function fitBezierKnots(points: readonly P2[], options: BezierFitOptions): BezierKnot[] {
  const { tolerance, cornerDeg = 30 } = options;
  for (const p of points) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new Error("A curve point is not a finite number.");
  }

  // Drop a point on top of the one before it; named indices move to the copy that is kept.
  const pts: P2[] = [];
  const moved: number[] = [];
  points.forEach((p, i) => {
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) <= SAME_POINT) moved[i] = pts.length - 1;
    else {
      moved[i] = pts.length;
      pts.push(p);
    }
  });
  const n = pts.length;
  if (n === 0) return [];
  const remap = (list: readonly number[] | undefined) => (list ?? []).map((i) => moved[i]).filter((i) => i !== undefined);
  const keepSet = new Set(remap(options.keep));
  const levelSet = new Set(remap(options.level));

  if (n === 1) return [{ point: pts[0], before: pts[0], after: pts[0], smooth: true }];

  // Corners: a turn of more than cornerDeg between the incoming and the outgoing chord.
  const isCorner = new Array<boolean>(n).fill(false);
  for (let i = 1; i < n - 1; i++) {
    const a = sub(pts[i], pts[i - 1]);
    const b = sub(pts[i + 1], pts[i]);
    const turn = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) * (180 / Math.PI);
    isCorner[i] = turn > cornerDeg;
  }
  const runStart = (i: number) => {
    let k = i - 1;
    while (k > 0 && !isCorner[k]) k--;
    return Math.max(k, 0);
  };
  const runEnd = (i: number) => {
    let k = i + 1;
    while (k < n - 1 && !isCorner[k]) k++;
    return Math.min(k, n - 1);
  };

  const specs: KnotSpec[] = [];
  for (let i = 0; i < n; i++) {
    const level = levelSet.has(i);
    if (i === 0 || i === n - 1 || isCorner[i] || keepSet.has(i) || level) {
      specs.push({ index: i, corner: isCorner[i] && !level, level, straightAfter: false });
    }
  }

  /** The unit tangent at a knot on one side of it (`side` -1 incoming, +1 outgoing), along the way the curve travels. */
  const tangent = (spec: KnotSpec, side: -1 | 1): [number, number] => {
    const i = spec.index;
    if (spec.level) {
      const from = pts[Math.max(i - 1, 0)];
      const to = pts[Math.min(i + 1, n - 1)];
      const dx = to[0] - from[0];
      return [dx < 0 ? -1 : 1, 0];
    }
    if (i === 0) return directionAt(pts, 0, runEnd(0) >= 2 ? 3 : 2, 0);
    if (i === n - 1) {
      const start = runStart(i);
      return i - start >= 2 ? directionAt(pts, i - 2, 3, 2) : directionAt(pts, i - 1, 2, 1);
    }
    if (!spec.corner) return directionAt(pts, i - 1, 3, 1);
    if (side === 1) return runEnd(i) - i >= 2 ? directionAt(pts, i, 3, 0) : directionAt(pts, i, 2, 0);
    return i - runStart(i) >= 2 ? directionAt(pts, i - 2, 3, 2) : directionAt(pts, i - 1, 2, 1);
  };

  /** The knot at position `pos` of `specs`, handles a third of the chord to each neighbouring knot. */
  const knotAt = (pos: number): BezierKnot => {
    const spec = specs[pos];
    const point = pts[spec.index];
    let before: P2 = point;
    let after: P2 = point;
    if (pos > 0) {
      const previous = specs[pos - 1];
      const chord = sub(point, pts[previous.index]);
      const third = length(chord) / 3;
      const t = previous.straightAfter ? ([chord[0] / (3 * third), chord[1] / (3 * third)] as [number, number]) : tangent(spec, -1);
      before = previous.straightAfter && third === 0 ? point : [point[0] - t[0] * third, point[1] - t[1] * third];
    }
    if (pos < specs.length - 1) {
      const chord = sub(pts[specs[pos + 1].index], point);
      const third = length(chord) / 3;
      const t = spec.straightAfter ? ([chord[0] / (3 * third), chord[1] / (3 * third)] as [number, number]) : tangent(spec, 1);
      after = spec.straightAfter && third === 0 ? point : [point[0] + t[0] * third, point[1] + t[1] * third];
    }
    const flat = spec.straightAfter || (pos > 0 && specs[pos - 1].straightAfter);
    return { point, before, after, smooth: !spec.corner && !flat };
  };

  /** How far the span after position `pos` strays, and the source point to split at (-1 when there is none to split at). */
  const measure = (pos: number): { error: number; split: number } => {
    const a = specs[pos].index;
    const b = specs[pos + 1].index;
    const curve = sampleSpan(knotAt(pos), knotAt(pos + 1));
    let forward = 0;
    let forwardAt = -1;
    for (let k = a + 1; k < b; k++) {
      const d = distanceToPolyline(pts[k], curve).distance;
      if (d > forward) {
        forward = d;
        forwardAt = k;
      }
    }
    let reverse = 0;
    let reverseAt = -1;
    for (let q = 1; q < curve.length - 1; q++) {
      const { distance, segment } = distanceToPolyline(curve[q], pts, a, b);
      if (distance > reverse) {
        reverse = distance;
        // The source point of that segment nearer the curve sample, kept strictly inside the span.
        const nearer =
          Math.hypot(curve[q][0] - pts[segment][0], curve[q][1] - pts[segment][1]) <=
          Math.hypot(curve[q][0] - pts[segment + 1][0], curve[q][1] - pts[segment + 1][1])
            ? segment
            : segment + 1;
        reverseAt = Math.min(Math.max(nearer, a + 1), b - 1);
      }
    }
    const error = Math.max(forward, reverse);
    const split = b - a < 2 ? -1 : forward >= reverse ? forwardAt : reverseAt;
    return { error, split };
  };

  // Split the worst span at its worst source point until every span is inside the tolerance.
  let spans = Array.from({ length: specs.length - 1 }, (_, pos) => measure(pos));
  for (;;) {
    let worst = -1;
    for (let pos = 0; pos < spans.length; pos++) {
      if (spans[pos].error > tolerance && (worst < 0 || spans[pos].error > spans[worst].error)) worst = pos;
    }
    if (worst < 0) break;
    const { split } = spans[worst];
    if (split < 0 || split <= specs[worst].index || split >= specs[worst + 1].index) {
      // Nothing between its two knots to add: draw the span as a straight line, which is as close as two points can be.
      specs[worst].straightAfter = true;
      spans = spans.map((span, pos) => (pos >= worst - 1 && pos <= worst + 1 ? measure(pos) : span));
      if (spans[worst].error > tolerance) spans[worst] = { error: 0, split: -1 };
      continue;
    }
    specs.splice(worst + 1, 0, { index: split, corner: false, level: false, straightAfter: false });
    const fresh = [worst - 1, worst, worst + 1, worst + 2].filter((pos) => pos >= 0 && pos < specs.length - 1);
    const next = spans.slice();
    next.splice(worst + 1, 0, { error: 0, split: -1 });
    for (const pos of fresh) next[pos] = measure(pos);
    spans = next;
  }

  return specs.map((_, pos) => knotAt(pos));
}
