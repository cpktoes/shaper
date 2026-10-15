/*
 * REFERENCE COPY — never edited.
 *
 * This is the curve code behind sketches 013 and 014 (.planning/sketches/013-wings-on-the-outline/
 * and 014-wings-tab/), copied byte for byte from the quick task's archive
 * (.planning/quick/261014-wii-wings-on-the-template-page-up-to-two-win/261014-wii-sketch-source.tar.gz,
 * 261014-wii-sketch-curves.js) on 2026-10-14, below this comment. It is the source of truth for wings
 * (quick 261014-wii, CLAUDE.md Rule 1: the expected numbers come from the founder's chosen sketch's
 * own code, never a transcription).
 *
 * `wingedHalfWidth(…, "a", …)` and `wingedPoints` are the founder's construction — "construction
 * wise, we definitely want to go A" — and the corner radius is the founder's later rule: "more of a
 * radius rounder on the wing's outer and inner points rather than also adjusting along the stringer
 * appearance". Its own copy of today's outline curve was checked against the app's 161 points.
 *
 * It works in INCHES and HALF-widths: stations are inches from the tail, and each sample is
 * [station, halfWidth].
 *
 * It is run only by scripts/extract-wings-golden.ts, which writes
 * lib/geometry/__fixtures__/wings-golden.json. The app never imports it.
 *
 * Do not edit anything below this comment. The golden is only as good as this copy is faithful, and
 * the copy is only faithful while the body is the archive's curves.js unchanged.
 */
/* curves.js — sketch 013. The app's outline curve (lib/geometry/outline.ts `buildOutline`), ported to inches
   line for line, plus the three wing constructions this sketch compares. Throwaway sketch code: the app's
   TypeScript stays the one truth, and check013.mjs proves this port reproduces its 161 points. */

const MARGIN = 16, DIAMOND_DEPTH_CAP = 5, DIAMOND_BLOCK_MARGIN = 2, MEASURE_STATION = 12;
const HANDLE_CAP = 0.48, OVERSHOOT = 0.92, SAMPLES_PER_SEGMENT = 80, EPSILON = 1e-6;
const railMult = (pct) => 0.8 + (pct / 100) * 0.8;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function tailHandleMaxLength(dirY, chord, cw, bw) {
  if (Math.abs(dirY) <= EPSILON) return HANDLE_CAP * chord;
  return Math.min(HANDLE_CAP * chord, (OVERSHOOT * (cw - bw)) / dirY);
}
function noseHandleMaxLength(dirY, chord, cw) {
  if (Math.abs(dirY) <= EPSILON) return HANDLE_CAP * chord;
  return Math.min(HANDLE_CAP * chord, (OVERSHOOT * cw) / Math.abs(dirY));
}
function bez1(p0, p1, p2, p3, t) { const mt = 1 - t; return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3; }

function interpolateHalfWidth(points, station) {
  for (let i = 0; i < points.length - 1; i++) {
    const [y0, x0] = points[i], [y1, x1] = points[i + 1];
    if (station >= y0 && station <= y1) { const t = y1 > y0 ? (station - y0) / (y1 - y0) : 0; return x0 + (x1 - x0) * t; }
  }
  return points[points.length - 1][1];
}

/* spec: { length, widePointWidth, widePointOffset, tailRailLength, noseRailLength, noseAngle, noseFullness,
   tailAngle, tailFullness, tail: { kind, endWidth?, depth?, crotchDepth? } } — inches and degrees. */
function buildOutline(spec) {
  const length = spec.length, cw = spec.widePointWidth / 2, tail = spec.tail;
  const tailBlockPinned = tail.kind === "pin" || tail.kind === "round";
  let bw = 0, tailPodStation = 0, centreCloseStation = 0, effectiveDiamondDepth = 0;
  switch (tail.kind) {
    case "pin": case "round": bw = 0; break;
    case "squash": bw = tail.endWidth / 2; break;
    case "diamond": bw = tail.endWidth / 2; effectiveDiamondDepth = Math.max(0, Math.min(tail.depth, DIAMOND_DEPTH_CAP, tail.endWidth - DIAMOND_BLOCK_MARGIN)); tailPodStation = effectiveDiamondDepth; break;
    case "swallow": bw = tail.endWidth / 2; centreCloseStation = tail.crotchDepth; break;
  }
  const widePointStation = Math.max(MARGIN, Math.min(length - MARGIN, length / 2 + spec.widePointOffset));
  const tailRad = (spec.tailAngle * Math.PI) / 180, noseRad = (spec.noseAngle * Math.PI) / 180;
  const dir0 = { x: Math.cos(tailRad), y: Math.sin(tailRad) }, dir4 = { x: Math.cos(noseRad), y: -Math.sin(noseRad) }, dir2 = { x: 1, y: 0 };
  const P0 = { x: tailPodStation, y: Math.max(0, bw) }, P2 = { x: widePointStation, y: cw }, P4 = { x: length, y: 0 };
  const knotPoints = [P0, P2, P4], knotDirs = [dir0, dir2, dir4];
  const chord = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const chords = [chord(P0, P2), chord(P2, P4)];
  const inLen0 = railMult(spec.tailRailLength) * HANDLE_CAP * chords[0];
  const outLen1 = railMult(spec.noseRailLength) * HANDLE_CAP * chords[1];
  const outLen0 = (spec.tailFullness / 100) * tailHandleMaxLength(dir0.y, chords[0], cw, P0.y);
  const inLen1 = (spec.noseFullness / 100) * noseHandleMaxLength(dir4.y, chords[1], cw);
  const outLen = [outLen0, outLen1], inLen = [inLen0, inLen1];
  const controls = [];
  for (let i = 0; i < 2; i++) {
    const A = knotPoints[i], Ad = knotDirs[i], B = knotPoints[i + 1], Bd = knotDirs[i + 1];
    controls.push({ c1: { x: A.x + outLen[i] * Ad.x, y: A.y + outLen[i] * Ad.y }, c2: { x: B.x - inLen[i] * Bd.x, y: B.y - inLen[i] * Bd.y } });
  }
  const raw = [];
  for (let seg = 0; seg < 2; seg++) {
    const A = knotPoints[seg], B = knotPoints[seg + 1], c = controls[seg], start = seg === 0 ? 0 : 1;
    for (let i = start; i <= SAMPLES_PER_SEGMENT; i++) {
      const t = i / SAMPLES_PER_SEGMENT;
      raw.push([bez1(A.x, c.c1.x, c.c2.x, B.x, t), Math.max(0, Math.min(bez1(A.y, c.c1.y, c.c2.y, B.y, t), cw))]);
    }
  }
  raw.sort((a, b) => a[0] - b[0]);
  const points = raw;
  const tailWidthAt12 = 2 * interpolateHalfWidth(points, Math.min(MEASURE_STATION, length));
  const noseWidthAt12 = 2 * interpolateHalfWidth(points, Math.max(0, length - MEASURE_STATION));
  let area = 0;
  for (let i = 0; i < raw.length - 1; i++) area += ((raw[i][1] + raw[i + 1][1]) / 2) * (raw[i + 1][0] - raw[i][0]);
  area *= 2;
  const segments = [0, 1].map((i) => ({ p0: knotPoints[i], c0: controls[i].c1, c1: controls[i].c2, p1: knotPoints[i + 1] }));
  return { spec, length, cw, bw, tailBlockPinned, widePointStation, tailPodStation, centreCloseStation, effectiveDiamondDepth, knots: knotPoints, dirs: knotDirs, controls, segments, points, tailWidthAt12, noseWidthAt12, area };
}

/* The exact curve (not the 161-point polyline) at a station, by solving the Bezier for its station. */
function exactHalfWidthAt(g, s) {
  if (s <= g.tailPodStation) return g.bw;
  if (s >= g.length) return 0;
  const seg = s <= g.widePointStation ? g.segments[0] : g.segments[1];
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (bez1(seg.p0.x, seg.c0.x, seg.c1.x, seg.p1.x, mid) < s) lo = mid; else hi = mid; }
  const t = (lo + hi) / 2;
  return clamp(bez1(seg.p0.y, seg.c0.y, seg.c1.y, seg.p1.y, t), 0, g.cw);
}
/* The exact curve's slope dy/ds at a station (for the key's angle readouts). */
function exactSlopeAt(g, s, h = 1e-3) { return (exactHalfWidthAt(g, s + h) - exactHalfWidthAt(g, s - h)) / (2 * h); }

/* ---- wings ----
   A wing: { on, station, depth, run, smoothing }. `station` is the wing's OUTER corner — where the step leaves the
   curve you drew; `run` is how far along the stringer the step travels to its INNER corner (0 = a square step);
   `depth` is how far in. `smoothing` is a CORNER RADIUS (the founder, 2026-10-14: "more of a radius rounder on the
   wing's outer and inner points rather than also adjusting along the stringer appearance"): both corners are rounded
   with that radius, capped at the largest radius whose two rounds still fit on the step, so the run alone decides how
   long the step is along the board. The step is worked out in inches along the board (x) and in toward the stringer
   (y), as if the curve were locally straight, then applied as a share of the depth at each station. */
function stepLeg(w) { return Math.hypot(w.run, w.depth); }
function turnAngle(w) { return Math.atan2(w.depth, Math.max(w.run, 0)); }
/* The largest corner radius whose two rounds fit on this step. A square 3/8" step takes 3/16"; a 1" run takes about 3". */
function maxRadius(w) { const tanHalf = Math.tan(turnAngle(w) / 2); return tanHalf > 1e-9 ? (stepLeg(w) / 2) / tanHalf : 0; }
function effectiveRadius(w) { return Math.max(0, Math.min(w.smoothing || 0, maxRadius(w))); }
/* The step as a polyline in (station, inward offset) inches, from where it leaves the curve to where it rejoins. */
function wingShape(w) {
  const S = w.station, r = w.run, d = w.depth, R = effectiveRadius(w), L = stepLeg(w);
  const u = L > 0 ? { x: -r / L, y: d / L } : { x: 0, y: 1 };
  const t = R * Math.tan(turnAngle(w) / 2);
  const c1 = { x: S, y: 0 }, c2 = { x: S - r, y: d };
  if (t <= 1e-9) return { points: [c1, c2], t: 0, R: 0 };
  const A1 = { x: S + t, y: 0 }, B1 = { x: c1.x + t * u.x, y: c1.y + t * u.y };
  const B2 = { x: c2.x - t * u.x, y: c2.y - t * u.y }, A2 = { x: S - r - t, y: d };
  const C1 = { x: S + t, y: R }, C2 = { x: S - r - t, y: d - R };
  const arc = (C, from, to) => {
    let a0 = Math.atan2(from.y - C.y, from.x - C.x), a1 = Math.atan2(to.y - C.y, to.x - C.x), da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const n = Math.max(6, Math.ceil(Math.abs(da) / (Math.PI / 36))), out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (da * i) / n; out.push({ x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) }); }
    return out;
  };
  return { points: [...arc(C1, A1, B1), ...arc(C2, B2, A2)], t, R };
}
function wingFootprint(w) { const sh = wingShape(w); return { hi: sh.points[0].x, lo: sh.points[sh.points.length - 1].x, inner: sh.points[sh.points.length - 1].x, t: sh.t, R: sh.R, shape: sh }; }
/* Share of the depth taken at station s: 0 ahead of the step, 1 behind it, following the rounded step through it. */
function stepProfile(w, s) {
  const sh = wingShape(w), pts = sh.points, d = w.depth;
  if (s >= pts[0].x) return 0;
  if (s <= pts[pts.length - 1].x) return 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (s <= a.x && s >= b.x) { const f = a.x - b.x > 1e-12 ? (a.x - s) / (a.x - b.x) : 1; return clamp((a.y + (b.y - a.y) * f) / d, 0, 1); }
  }
  return 1;
}

/* Half-width at station s with the wings applied, under one of the three constructions:
   "a" — the tail is re-drawn to the block you set: each wing's depth fades to nothing at the tail pod.
   "b" — the tail is moved in: each wing's depth is carried all the way to the tail (the block narrows).
   "c" — a flyer: the tail is as drawn; the outline AHEAD of the wing is widened by the depth, fading out by the widepoint. */
function wingedHalfWidth(g, wings, variant, s) {
  const base = exactHalfWidthAt(g, s);
  if (s <= g.tailPodStation) {
    if (variant !== "b") return base;
    let hw = base; for (const w of wings) if (w.on) hw -= w.depth; return clamp(hw, 0, g.cw);
  }
  let hw = base;
  for (const w of wings) {
    if (!w.on) continue;
    const p = stepProfile(w, s), inner = wingFootprint(w).inner;
    if (variant === "a") {
      const fade = inner > g.tailPodStation ? clamp((s - g.tailPodStation) / (inner - g.tailPodStation), 0, 1) : 0;
      hw -= w.depth * p * fade;
    } else if (variant === "b") {
      hw -= w.depth * p;
    } else {
      const fadeWp = w.station < g.widePointStation ? clamp((g.widePointStation - s) / (g.widePointStation - w.station), 0, 1) : 0;
      hw += w.depth * (1 - p) * fadeWp;
    }
  }
  return clamp(hw, 0, g.cw);
}

/* A dense list of [station, halfWidth] for drawing: the app's own 161 stations, every 1/20" through the tail
   and every wing's own corners (twice, a hair apart, so a square step draws vertical). */
function wingedPoints(g, wings, variant, tailZoomTo = 30) {
  const st = new Set(g.points.map((p) => p[0]));
  for (let s = 0; s <= Math.min(tailZoomTo, g.length); s += 0.05) st.add(Number(s.toFixed(4)));
  for (const w of wings) if (w.on) {
    const f = wingFootprint(w);
    for (const p of f.shape.points) { st.add(p.x); st.add(p.x - 1e-6); st.add(p.x + 1e-6); }
    for (let x = f.lo; x <= f.hi; x += 0.02) st.add(Number(x.toFixed(5)));
  }
  st.add(g.tailPodStation); st.add(g.widePointStation); st.add(g.length);
  const stations = [...st].filter((s) => s >= 0 && s <= g.length).sort((a, b) => a - b);
  return stations.map((s) => [s, wingedHalfWidth(g, wings, variant, s)]);
}

function areaOf(points) { let a = 0; for (let i = 0; i < points.length - 1; i++) a += ((points[i][1] + points[i + 1][1]) / 2) * (points[i + 1][0] - points[i][0]); return 2 * a; }

/* Readouts for the captions and the zoom's dimension lines. */
function wingReadouts(g, wings, variant) {
  return wings.map((w) => {
    if (!w.on) return null;
    const f = wingFootprint(w);
    return {
      station: w.station, inner: f.inner, depth: w.depth,
      widthAhead: 2 * wingedHalfWidth(g, wings, variant, f.hi + 1e-6),
      widthBehind: 2 * wingedHalfWidth(g, wings, variant, f.inner - 1e-6),
      baseAhead: 2 * exactHalfWidthAt(g, f.hi), baseBehind: 2 * exactHalfWidthAt(g, f.inner),
    };
  });
}

if (typeof module !== "undefined") module.exports = { buildOutline, exactHalfWidthAt, exactSlopeAt, stepProfile, wingFootprint, wingShape, maxRadius, effectiveRadius, wingedHalfWidth, wingedPoints, areaOf, wingReadouts, interpolateHalfWidth, clamp };
