/**
 * Rocker curve geometry — the board's bottom curve, seen from the side.
 *
 * Built as a mirror of `lib/geometry/outline.ts`'s own construction: three knots (tail tip,
 * centre, nose tip) joined by two cubic Bezier segments, where the two ends carry an ANGLE and a
 * fullness-style control and the centre carries a rail-length-style control per side — exactly
 * `buildOutline`'s tail-pod / widepoint / nose-tip shape, with lift standing where half-width
 * stands. `outline.ts`'s own `railMult`, `HANDLE_CAP`, `OVERSHOOT` and `MEASURE_STATION_MM` are
 * imported rather than restated (CLAUDE.md Rule 1: one definition per formula).
 *
 * AXIS. This module keeps the codebase's existing station axis — station 0 is the tail tip,
 * station = length is the nose tip — the same axis `foil.ts`, `rocker-drag.ts`,
 * `rocker-viewer.tsx` and `order-form.tsx` already read. A shaper who thinks of the axis running
 * nose-to-tail (`x = 0` at the nose) is describing the SAME curve read from the opposite end — a
 * Bezier curve is identical under a left-right flip — so `x_shaper = length - station` and no
 * consumer needed to change direction for this plan (04-quick-260829-rda's own
 * `planner_assumptions`).
 *
 * Deviation from the prior implementation, numbered per this codebase's convention (see
 * `lib/geometry/volume.ts`'s header for the same pattern):
 *
 * 1. STATION MODEL. The prior version of this file (CONTEXT.md D-05, superseded by this quick
 *    task) forced the curve through five fixed points — nose tip, nose 12", centre, tail 12",
 *    tail tip — with all four non-centre lifts typed or dragged in by hand. Because the nose tip
 *    and the nose 12" station sit only 12" apart while the 12" station and the centre sit two feet
 *    or more apart, that construction left the tip almost dead straight and then had to turn hard
 *    at the 12" mark — the abrupt, kinked line a shaper reported seeing. This file replaces that
 *    five-station model with the three-knot, two-Bezier construction above: the curve is never
 *    forced through the 12" stations, so there is no mid-span point to kink around, and the two
 *    12" figures become DERIVED read-outs (`noseLiftAt12in`/`tailLiftAt12in`), measured off the
 *    drawn curve rather than numbers that bend the curve to reach them.
 * 2. SMOOTHNESS IS INVERTED FROM THE LITERAL `(smoothness / 100) * max` FORMULA. Each tip's own
 *    handle (`rockerTipHandleMaxLength`) is capped so its control point can never carry the curve
 *    below zero lift. A straight `(smoothness / 100) * max` mapping — matching `noseFullness` /
 *    `tailFullness`'s own formula in `outline.ts` — produces the OPPOSITE of the control's
 *    intended behaviour here: outline's nose/tail knot sits at the curve's MINIMUM (half-width
 *    zero), so a longer handle there pulls the near-tip control point UP, away from zero,
 *    retaining width longer. This module's tip knots sit at the curve's MAXIMUM (the lift peak),
 *    so a longer handle pulls the near-tip control point DOWN, away from the peak — producing a
 *    curve that stays low for longer and then kicks up sharply only in the final stretch (a MORE
 *    abrupt entry at higher "smoothness", and a flatter, more gradual entry at lower
 *    "smoothness" — backwards from the control's name and from the required behaviour that
 *    raising smoothness never lowers the derived 12" figure). Using `((100 - smoothness) / 100) *
 *    max` instead produces the correct, verified-monotone direction: a SHORT handle at high
 *    smoothness keeps the near-tip control point close to the peak, so the curve holds its height
 *    for longer before easing toward the centre (a smooth, gradual entry); a LONG handle at low
 *    smoothness pulls the control point far from the peak, concentrating the rise into a sharp,
 *    late kick right at the tip.
 */

import type { BezierSegment, Point2D } from "./board";
import { HANDLE_CAP, MEASURE_STATION_MM, OVERSHOOT, railMult } from "./outline";
import { type Degrees, type Mm, degrees, inchesToMm, mm } from "./units";

export type RockerStationKey = "tailTip" | "tail12" | "center" | "nose12" | "noseTip";

interface Direction2D {
  x: number;
  y: number;
}

/** Guard against dividing by a direction component that is (numerically) zero — same posture as
 * `outline.ts`'s own local `EPSILON`. */
const EPSILON = 1e-6;
const SAMPLES_PER_SEGMENT = 80;

/** One of the rocker curve's three knots — tail tip, centre, or nose tip — with the tangent
 * direction the curve carries through it. Mirrors `outline.ts`'s `OutlineKnot`. */
export interface RockerKnot {
  point: Point2D;
  tangent: Direction2D;
}

/** One of the curve's four construction handles, used by the viewer's construction-line overlay.
 * Mirrors `outline.ts`'s `OutlineHandle`. */
export interface RockerHandle {
  from: Point2D;
  to: Point2D;
}

/** One sampled point along the rocker line. */
export interface RockerPoint {
  station: Mm;
  lift: Mm;
}

/**
 * Parametric controls for the rocker line — the single place the ROCKER screen's rocker sliders
 * and typed fields write to. Eight fields: the two tip lifts a shaper quotes directly, an angle
 * and a smoothness at each tip, and a flatness at the centre for each side. The centre's own lift
 * is not stored because it is always zero by definition — the curve's flat reference.
 */
export interface RockerSpec {
  /** The nose tip's own lift — the number a shaper quotes for "nose rocker". */
  noseLift: Mm;
  /** The tail tip's own lift — the number a shaper quotes for "tail rocker". */
  tailLift: Mm;
  /** How steeply the curve leaves the nose tip, measured from the flat. */
  noseAngle: Degrees;
  /** How steeply the curve leaves the tail tip, measured from the flat. */
  tailAngle: Degrees;
  /** 0-100. How far the nose tip's own curvature is held before easing toward the centre — a
   * smooth, gradual entry at a high value; a sharp, late kick right at the tip at a low value. */
  noseSmoothness: number;
  /** 0-100. The tail tip's own equivalent of `noseSmoothness`. */
  tailSmoothness: number;
  /** 0-100. How far the flat runs out of the centre toward the nose before the curve starts to
   * lift. */
  noseFlatness: number;
  /** 0-100. How far the flat runs out of the centre toward the tail before the curve starts to
   * lift. */
  tailFlatness: number;
}

/** Inch-domain bounds every rocker slider, drag solve and typed field shares. One definition,
 * imported everywhere, never restated. Now bounds the two tip lifts only. */
export const ROCKER_LIFT_RANGE_IN = { min: 0, max: 9, step: 0.0625 } as const;
/** Inch-domain bounds for the nose/tail angle sliders. */
export const ROCKER_ANGLE_RANGE_DEG = { min: 0, max: 60, step: 1 } as const;
/** 0-100 bounds for the nose/tail smoothness sliders. */
export const ROCKER_SMOOTHNESS_RANGE = { min: 0, max: 100, step: 0.5 } as const;
/** 0-100 bounds for the nose/tail flatness sliders. */
export const ROCKER_FLATNESS_RANGE = { min: 0, max: 100, step: 0.5 } as const;

/**
 * Starting values for a new board's rocker line, authored through `inchesToMm()`/`degrees()`.
 *
 * `noseLift` (4 1/2") and `tailLift` (2") are today's own values, which came from the prototype's
 * own side-profile numbers (`reference/project/Rails.dc.html` ~line 784) — left unchanged by this
 * quick task.
 *
 * The six shape controls below were chosen so the DERIVED 12" figures on the default 72" board
 * land within 1/4" of today's stored figures (nose 1 1/4", tail 3/8") — verified against the
 * actual curve, not hand-guessed: `noseAngle: 29°, noseSmoothness: 70, noseFlatness: 96` derives
 * a nose-12in of ~1.2503"; `tailAngle: 31°, tailSmoothness: 21, tailFlatness: 64` derives a
 * tail-12in of ~0.3751" — both within a hundredth of an inch of today's numbers.
 */
export const DEFAULT_ROCKER_SPEC: RockerSpec = {
  noseLift: inchesToMm(4.5),
  tailLift: inchesToMm(2),
  noseAngle: degrees(29),
  tailAngle: degrees(31),
  noseSmoothness: 70,
  tailSmoothness: 21,
  noseFlatness: 96,
  tailFlatness: 64,
};

/**
 * Hard geometric cap on a tip's own handle: it must never carry its control point below zero
 * lift. Mirrors `outline.ts`'s `noseHandleMaxLength`/`tailHandleMaxLength` — same `dirY`-based
 * signature, same `EPSILON` guard against a near-flat tangent, same `HANDLE_CAP`/`OVERSHOOT`
 * posture. Exported so the drag solver and the tests can reach the same cap.
 */
export function rockerTipHandleMaxLength(dirY: number, chord: number, tipLift: number): number {
  if (Math.abs(dirY) <= EPSILON) return HANDLE_CAP * chord;
  return Math.min(HANDLE_CAP * chord, (OVERSHOOT * tipLift) / Math.abs(dirY));
}

export interface RockerGeometry {
  length: Mm;
  /** Tail tip, centre, nose tip — the three knots the rocker curve is built from. */
  knots: [RockerKnot, RockerKnot, RockerKnot];
  /** The four construction handles, used by the viewer's construction-line overlay. */
  handles: RockerHandle[];
  /** The two derived Bezier segments — derived from the parameters, never stored. */
  segments: BezierSegment[];
  /** Sampled points along the rocker line, ordered by station ascending. */
  points: RockerPoint[];
  /** The rocker measured 12" in from the tail, read off the drawn curve. */
  tailLiftAt12in: Mm;
  /** The rocker measured 12" in from the nose, read off the drawn curve. */
  noseLiftAt12in: Mm;
}

function interpolateLift(points: RockerPoint[], station: number): number {
  if (points.length === 0) return 0;
  // Past either end, clamp to that end's own lift — unlike `outline.ts`'s `interpolateHalfWidth`
  // (which only ever samples inside [0, length] and so only needs a past-the-end fallback), a
  // rocker station can legitimately be probed below the tail tip or above the nose tip (a drag, or
  // a test sweep), so both directions are handled explicitly here.
  if (station <= points[0].station) return points[0].lift;
  if (station >= points[points.length - 1].station) return points[points.length - 1].lift;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const s0 = p0.station;
    const s1 = p1.station;
    if (station >= s0 && station <= s1) {
      const l0 = p0.lift;
      const l1 = p1.lift;
      const t = s1 > s0 ? (station - s0) / (s1 - s0) : 0;
      return l0 + (l1 - l0) * t;
    }
  }
  return points[points.length - 1].lift;
}

/**
 * Samples the rocker line's lift at an arbitrary station, linearly interpolating between the two
 * bracketing sampled points. When the station is past either end, returns that end's own lift —
 * matches `sampleOutline`'s own past-the-end fallback, rather than throwing.
 */
export function sampleRocker(geometry: RockerGeometry, station: Mm): Mm {
  return mm(interpolateLift(geometry.points, station));
}

export function buildRocker(spec: RockerSpec, length: Mm): RockerGeometry {
  const tailRad = (spec.tailAngle * Math.PI) / 180;
  const noseRad = (spec.noseAngle * Math.PI) / 180;

  // Each tip's angle becomes a tangent DIRECTION, not a slope, for the same reason
  // `buildOutline` gives at its own `tailRad`/`noseRad`: a parametric handle can point exactly
  // along the flat without an infinite-slope problem. The signs are the mirror of outline's own
  // dir0/dir4: outline's ends are the curve's MINIMUM (tail pod / nose point), so its curve rises
  // AWAY from the tail and falls INTO the nose; this curve's ends are the MAXIMUM (the lift
  // peaks), so it falls AWAY from the tail tip and rises INTO the nose tip as station increases.
  const dir0: Direction2D = { x: Math.cos(tailRad), y: -Math.sin(tailRad) };
  const dir4: Direction2D = { x: Math.cos(noseRad), y: Math.sin(noseRad) };
  // The centre's tangent is purely along the station axis — the same choice `buildOutline` makes
  // at the widepoint, and the reason the curve reads flat and kink-free through the middle.
  const dir2: Direction2D = { x: 1, y: 0 };

  const P0 = { x: 0, y: spec.tailLift };
  const P2 = { x: length / 2, y: 0 };
  const P4 = { x: length, y: spec.noseLift };

  const knotPoints = [P0, P2, P4];
  const knotDirs = [dir0, dir2, dir4];

  const chord = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);
  const chords = [chord(P0, P2), chord(P2, P4)];

  // Each tip's own handle length: a smooth, gradual entry at high smoothness (a short handle
  // that keeps the curve close to the peak), a sharp late kick at low smoothness (a long handle,
  // capped so it can never carry the curve below zero) — see deviation 2 above for why the
  // fraction is inverted from outline's own `(fullness / 100)` formula.
  const tailTipMax = rockerTipHandleMaxLength(dir0.y, chords[0], spec.tailLift);
  const outLen0 = ((100 - spec.tailSmoothness) / 100) * tailTipMax;
  const noseTipMax = rockerTipHandleMaxLength(dir4.y, chords[1], spec.noseLift);
  const inLen1 = ((100 - spec.noseSmoothness) / 100) * noseTipMax;

  // The centre's two handle lengths scale against that side's true max (HANDLE_CAP*chord), the
  // same Rail Length / Vector Strength formula `buildOutline` uses at the widepoint. Because the
  // centre's tangent has no lift component (dir2.y = 0), a longer handle can never carry the
  // curve below zero or above a tip — no cap needed on this side, the same argument `buildOutline`
  // records for the widepoint.
  const inLen0 = railMult(spec.tailFlatness) * HANDLE_CAP * chords[0];
  const outLen1 = railMult(spec.noseFlatness) * HANDLE_CAP * chords[1];

  const outLen = [outLen0, outLen1];
  const inLen = [inLen0, inLen1];

  const controls: { c1: Point2D; c2: Point2D }[] = [];
  for (let i = 0; i < 2; i++) {
    const A = knotPoints[i];
    const Ad = knotDirs[i];
    const B = knotPoints[i + 1];
    const Bd = knotDirs[i + 1];
    controls.push({
      c1: { x: mm(A.x + outLen[i] * Ad.x), y: mm(A.y + outLen[i] * Ad.y) },
      c2: { x: mm(B.x - inLen[i] * Bd.x), y: mm(B.y - inLen[i] * Bd.y) },
    });
  }

  const bez = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };

  const rawPoints: { station: number; lift: number }[] = [];
  for (let seg = 0; seg < 2; seg++) {
    const A = knotPoints[seg];
    const B = knotPoints[seg + 1];
    const c = controls[seg];
    const start = seg === 0 ? 0 : 1;
    for (let i = start; i <= SAMPLES_PER_SEGMENT; i++) {
      const t = i / SAMPLES_PER_SEGMENT;
      const station = bez(A.x, c.c1.x, c.c2.x, B.x, t);
      const lift = bez(A.y, c.c1.y, c.c2.y, B.y, t);
      // Lift is never negative, whatever the handle lengths/angles produce.
      rawPoints.push({ station, lift: Math.max(0, lift) });
    }
  }
  rawPoints.sort((a, b) => a.station - b.station);

  const points: RockerPoint[] = rawPoints.map((p) => ({
    station: mm(p.station),
    lift: mm(p.lift),
  }));

  const tailLiftAt12in = mm(interpolateLift(points, Math.min(MEASURE_STATION_MM, length)));
  const noseLiftAt12in = mm(interpolateLift(points, Math.max(0, length - MEASURE_STATION_MM)));

  const knots = knotPoints.map((p, i) => ({
    point: { x: mm(p.x), y: mm(p.y) },
    tangent: knotDirs[i],
  })) as [RockerKnot, RockerKnot, RockerKnot];

  const handles: RockerHandle[] = [];
  for (let i = 0; i < 2; i++) {
    handles.push({
      from: { x: mm(knotPoints[i].x), y: mm(knotPoints[i].y) },
      to: controls[i].c1,
    });
    handles.push({
      from: { x: mm(knotPoints[i + 1].x), y: mm(knotPoints[i + 1].y) },
      to: controls[i].c2,
    });
  }

  const segments: BezierSegment[] = [0, 1].map((i) => ({
    p0: { x: mm(knotPoints[i].x), y: mm(knotPoints[i].y) },
    c0: controls[i].c1,
    c1: controls[i].c2,
    p1: { x: mm(knotPoints[i + 1].x), y: mm(knotPoints[i + 1].y) },
  }));

  return {
    length: mm(length),
    knots,
    handles,
    segments,
    points,
    tailLiftAt12in,
    noseLiftAt12in,
  };
}

/**
 * The five rocker stations in ascending station order, for a board of the given length. No
 * longer needs a spec: since the two 12" lifts are derived rather than stored, this is purely a
 * function of length. Replaces the prior `rockerStationPoints(spec, length)`, which also deletes
 * `foil.ts`'s dummy all-zero-spec call into it.
 */
export function rockerStationPositions(length: Mm): { key: RockerStationKey; station: Mm }[] {
  return [
    { key: "tailTip", station: mm(0) },
    { key: "tail12", station: MEASURE_STATION_MM },
    { key: "center", station: mm(length / 2) },
    { key: "nose12", station: mm(length - MEASURE_STATION_MM) },
    { key: "noseTip", station: length },
  ];
}

/**
 * Migrates a saved design's legacy four-lift rocker object (`noseTip`/`nose12`/`tail12`/
 * `tailTip`) into the current eight-field `RockerSpec`. The tip lifts carry over exactly — a
 * shaper's saved nose-tip and tail-tip rocker never change. The two 12" numbers are dropped
 * because they are no longer stored: they are measured off the curve now, which is the entire
 * point of this migration. The six shape controls come from `DEFAULT_ROCKER_SPEC`, since a legacy
 * snapshot never recorded any curve shape beyond the four lift points.
 */
export function migrateLegacyRocker(legacy: {
  noseTip: number;
  nose12: number;
  tail12: number;
  tailTip: number;
}): RockerSpec {
  return {
    noseLift: mm(legacy.noseTip),
    tailLift: mm(legacy.tailTip),
    noseAngle: DEFAULT_ROCKER_SPEC.noseAngle,
    tailAngle: DEFAULT_ROCKER_SPEC.tailAngle,
    noseSmoothness: DEFAULT_ROCKER_SPEC.noseSmoothness,
    tailSmoothness: DEFAULT_ROCKER_SPEC.tailSmoothness,
    noseFlatness: DEFAULT_ROCKER_SPEC.noseFlatness,
    tailFlatness: DEFAULT_ROCKER_SPEC.tailFlatness,
  };
}
