/**
 * The 3D board's fins (Phase 16, D-06, D-21, D-25): simple, generic fins standing at their FINS placement.
 *
 * Generic by the founder's rule: ONE plain outline per role, parametrised by its base alone. The base is FINS'
 * own base length for that fin and it is the only thing that changes with FINS' value — a shorter base moves the
 * leading edge and nothing else, so a smaller fin is a shorter base, never a shrunk fin (D-21). The depth, how far
 * the tip sits behind the trailing edge, the tip's rounding and the thickness are the role's own figures (D-25),
 * every one an inch figure converted once through `units.ts`. No fin here copies or claims any maker's template or
 * foil. The proportions are 16-RESEARCH.md §M's.
 *
 * The outline, in the fin's own millimetres: `u` along the base from the leading edge toward the tail, `v` the
 * depth down from the base (drawn here with `v` growing away from the board).
 * - The base runs (0, 0) → (B, 0).
 * - The leading edge is a convex cubic from (0, 0) to the tip.
 * - The trailing edge is a gently concave cubic from the tip corner T = (B + R, D) down to (B, 0), with controls
 *   (B + 0.8R, 0.6D) and (B + 0.05D, 0.25D): it meets the base near 85°.
 * - The tip is rounded by a circular arc of the role's radius r, tangent to the trailing edge and to the line of
 *   the fin's depth, v = D, so the rounded tip reaches exactly the role's depth. The leading cubic,
 *   (0, 0) → that arc's top, with controls (0.05(B + R), 0.40D) and (0.55(B + R), D), arrives level with it.
 * Everything from the arc's top on (the tip and the trailing edge) is worked out relative to the trailing edge,
 * u − B, from the role's figures alone, which is what makes "only the base changes" exact.
 *
 * Placement: each fin stands on its FINS line — the trailing edge at (`offTail`, `lateral`), the leading edge
 * toward (`leadingOffTail`, `leadingLateral`), so toe-in is already in it — upright, square to the bottom where it
 * stands (tilted along the board by the rocker's slope at the fin's centre), with no cant (FINS has none). The
 * base sits on the bottom; the scene carries the solid a little up into the foam (`FIN_ROOT_SINK`) so no gap
 * shows under the rounded root.
 *
 * Never in the CNC files (D-16): the export reads the bare surface, never these.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or drawing-library import.
 */

import type { Vec3 } from "./board-surface";
import type { FinMark, FinSetup, TwinTemplate } from "./fins";
import { inchesToMm, mm, type Mm } from "./units";

/** The fin outlines there are: one per role. */
export type FinOutlineRole = "thruster";

/** A role's figures, in inches (converted through `inchesToMm` where they are used). */
export interface FinRoleShape {
  /** Base to tip, square to the bottom. */
  depthIn: number;
  /** How far the tip corner sits behind the trailing edge. */
  tipBehindIn: number;
  /** The tip's rounding. */
  tipRadiusIn: number;
  /** The fin's thickness at the root. */
  thicknessIn: number;
}

/**
 * Each role's figures (D-25): a thruster's three fins alike, 4.5" deep, the tip 0.75" behind the trailing edge,
 * a 0.35" tip, 1/4" thick.
 */
export const FIN_ROLE_SHAPES: Record<FinOutlineRole, FinRoleShape> = {
  thruster: { depthIn: 4.5, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 },
};

/** How many points each cubic edge is sampled at, and the rounded tip. Fixed, so the work is bounded (T-16-22). */
export const FIN_CUBIC_SAMPLES = 24;
export const FIN_TIP_ARC_SAMPLES = 8;
/** The finer sampling the tip's rounding is solved on. */
const SOLVE_SAMPLES = 400;

/** How far the scene carries a fin's solid up into the foam, so no gap shows under its rounded root (D-25). */
export const FIN_ROOT_SINK: Mm = mm(1);

/** A point of a fin's outline, in the fin's own millimetres (see the header). */
export interface FinOutlinePoint {
  u: number;
  v: number;
}

/** One fin's outline: from (0, 0) up the leading edge, round the tip and down the trailing edge to (B, 0). */
export interface FinOutline {
  /** The outline, leading edge first; the base, (B, 0) back to (0, 0), closes it. */
  points: FinOutlinePoint[];
  /** The index where the tip's rounding starts: every point from here on is the tip and the trailing edge. */
  tipFrom: number;
  base: Mm;
  depth: Mm;
  /** How far the tip corner sits behind the trailing edge. */
  tipBehind: Mm;
  tipRadius: Mm;
  thickness: Mm;
}

/** The role's depth for a board of `length` (every role but the single has its own fixed depth). */
export function finRoleDepth(role: FinOutlineRole, length: Mm): Mm {
  void length;
  return inchesToMm(FIN_ROLE_SHAPES[role].depthIn);
}

function finRoleFigures(role: FinOutlineRole, depth: Mm): { tipBehind: Mm; tipRadius: Mm; thickness: Mm } {
  const shape = FIN_ROLE_SHAPES[role];
  void depth;
  return {
    tipBehind: inchesToMm(shape.tipBehindIn),
    tipRadius: inchesToMm(shape.tipRadiusIn),
    thickness: inchesToMm(shape.thicknessIn),
  };
}

type Cubic = readonly [FinOutlinePoint, FinOutlinePoint, FinOutlinePoint, FinOutlinePoint];

function cubicAt(c: Cubic, t: number): FinOutlinePoint {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const d = 3 * s * t * t;
  const e = t * t * t;
  return { u: a * c[0].u + b * c[1].u + d * c[2].u + e * c[3].u, v: a * c[0].v + b * c[1].v + d * c[2].v + e * c[3].v };
}

/**
 * The tip's rounding and the trailing edge, relative to the trailing edge (u − B), from the role's figures alone:
 * the trailing cubic, and the circle of radius `r` tangent to the line v = D and to that cubic.
 */
function tipAndTrailing(depth: number, tipBehind: number, r: number) {
  const D = depth;
  const R = tipBehind;
  const trailing: Cubic = [
    { u: R, v: D },
    { u: 0.8 * R, v: 0.6 * D },
    { u: 0.05 * D, v: 0.25 * D },
    { u: 0, v: 0 },
  ];
  const fine = Array.from({ length: SOLVE_SAMPLES + 1 }, (_, i) => cubicAt(trailing, i / SOLVE_SAMPLES));
  /** The trailing cubic's nearest parameter to `p` and how near it is. */
  const nearest = (p: FinOutlinePoint) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < fine.length; i++) {
      const d = Math.hypot(fine[i].u - p.u, fine[i].v - p.v);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    // A golden-section search between the neighbouring samples.
    let lo = Math.max(0, best - 1) / SOLVE_SAMPLES;
    let hi = Math.min(SOLVE_SAMPLES, best + 1) / SOLVE_SAMPLES;
    const dist = (t: number) => {
      const q = cubicAt(trailing, t);
      return Math.hypot(q.u - p.u, q.v - p.v);
    };
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 60; k++) {
      const a = hi - g * (hi - lo);
      const b = lo + g * (hi - lo);
      if (dist(a) < dist(b)) hi = b;
      else lo = a;
    }
    const t = (lo + hi) / 2;
    return { t, distance: dist(t) };
  };
  // The circle's centre sits r below the depth line; slide it forward until it is r from the trailing edge.
  let lo = R - 8 * r;
  let hi = R;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (nearest({ u: mid, v: D - r }).distance > r) lo = mid;
    else hi = mid;
  }
  const centre = { u: (lo + hi) / 2, v: D - r };
  const touch = nearest(centre);
  const touchPoint = cubicAt(trailing, touch.t);
  const endAngle = Math.atan2(touchPoint.v - centre.v, touchPoint.u - centre.u);
  // The arc, from its top (a quarter turn) back to where it meets the trailing edge, without its two ends.
  const arc: FinOutlinePoint[] = [];
  for (let i = 1; i <= FIN_TIP_ARC_SAMPLES; i++) {
    const a = Math.PI / 2 + ((endAngle - Math.PI / 2) * i) / (FIN_TIP_ARC_SAMPLES + 1);
    arc.push({ u: centre.u + r * Math.cos(a), v: centre.v + r * Math.sin(a) });
  }
  const down: FinOutlinePoint[] = [];
  for (let i = 0; i < FIN_CUBIC_SAMPLES; i++) {
    down.push(cubicAt(trailing, touch.t + ((1 - touch.t) * i) / (FIN_CUBIC_SAMPLES - 1)));
  }
  return { top: { u: centre.u, v: D }, arc, down };
}

/**
 * One fin's outline for `role` on a base of `base` and a depth of `depth` (see the header). Changing the base moves
 * only the leading edge: relative to the trailing edge, the tip, the trailing edge and the depth are the same for
 * any base.
 */
export function finOutline(role: FinOutlineRole, base: Mm, depth: Mm): FinOutline {
  const { tipBehind, tipRadius, thickness } = finRoleFigures(role, depth);
  const B = base;
  const D = depth;
  const R = tipBehind;
  const tip = tipAndTrailing(D, R, tipRadius);
  const top = { u: B + tip.top.u, v: D };
  const leading: Cubic = [{ u: 0, v: 0 }, { u: 0.05 * (B + R), v: 0.4 * D }, { u: 0.55 * (B + R), v: D }, top];
  const points: FinOutlinePoint[] = [];
  for (let i = 0; i < FIN_CUBIC_SAMPLES; i++) points.push(cubicAt(leading, i / (FIN_CUBIC_SAMPLES - 1)));
  // Exact ends: the base's front at the origin, the arc's top on the depth line.
  points[0] = { u: 0, v: 0 };
  points[FIN_CUBIC_SAMPLES - 1] = top;
  const tipFrom = FIN_CUBIC_SAMPLES - 1;
  for (const p of tip.arc) points.push({ u: B + p.u, v: p.v });
  for (const p of tip.down) points.push({ u: B + p.u, v: p.v });
  points[points.length - 1] = { u: B, v: 0 };
  return { points, tipFrom, base: mm(B), depth: mm(D), tipBehind, tipRadius, thickness };
}

/** Which outline a FINS mark takes, for the board's fin setup. */
export function finOutlineRole(setup: FinSetup, twinTemplate: TwinTemplate, mark: FinMark): FinOutlineRole {
  void setup;
  void twinTemplate;
  void mark;
  return "thruster";
}

/** One fin as the 3D board draws it. Points are in the board surface's axes (x along from the tail, y across, z up). */
export interface PlacedFin {
  role: FinOutlineRole;
  outline: FinOutline;
  /** The base's front, on the fin's FINS line, at the height of the bottom at the fin's centre. */
  leading: Vec3;
  /** The base's back (the trailing edge's mark), at the same height. */
  trailing: Vec3;
  /** The bottom's height at the fin's centre station: where the base sits. */
  rootZ: Mm;
  /** The rocker's slope at the fin's centre, as an angle: the fin is tilted by it so it stands square to the bottom. */
  tiltRad: number;
  thickness: Mm;
}

const finite = (...values: number[]) => values.every((v) => Number.isFinite(v));

/**
 * Every fin of the board's FINS placement, stood on the board: each on its FINS line (toe included), its base on
 * the bottom at its centre station, tilted by the rocker's slope there so it stands square to the bottom. A fin
 * whose figures are not usable numbers (a non-finite or non-positive base or depth, a position that is not a
 * number) is left out (T-16-22); the board still draws.
 */
export function placedFins(
  marks: readonly FinMark[],
  setup: FinSetup,
  twinTemplate: TwinTemplate,
  length: Mm,
  rockerAt: (station: Mm) => Mm,
): PlacedFin[] {
  const fins: PlacedFin[] = [];
  for (const mark of marks) {
    const role = finOutlineRole(setup, twinTemplate, mark);
    const depth = finRoleDepth(role, length);
    const base = mark.baseLength;
    const leadingAt = { x: mark.leadingOffTail as number, y: mark.leadingLateral as number };
    const trailingAt = { x: mark.offTail as number, y: mark.lateral as number };
    if (!finite(base, depth, leadingAt.x, leadingAt.y, trailingAt.x, trailingAt.y) || !(base > 0) || !(depth > 0)) {
      continue;
    }
    const centre = (leadingAt.x + trailingAt.x) / 2;
    const rootZ = rockerAt(mm(centre));
    const slope = (rockerAt(mm(centre + 1)) - rockerAt(mm(centre - 1))) / 2;
    if (!finite(rootZ, slope)) continue;
    const outline = finOutline(role, mm(base), depth);
    fins.push({
      role,
      outline,
      leading: [leadingAt.x, leadingAt.y, rootZ],
      trailing: [trailingAt.x, trailingAt.y, rootZ],
      rootZ,
      tiltRad: Math.atan(slope),
      thickness: outline.thickness,
    });
  }
  return fins;
}
