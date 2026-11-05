/**
 * The 3D board's fins (Phase 16, D-06, D-21, D-22, D-25, as D-35 and D-36 amend them): each fin stands at its FINS
 * placement and draws a basic, generic fin for its setup.
 *
 * Five shapes, fitted to published fin templates (16-17-RESEARCH.md): a side fin, an upright twin, a cut-away fish
 * keel, a small upright fin and a raked longboard single. Each is three cubic curves — up the leading edge to the
 * highest point, round the tip to the rearmost point, down the trailing edge — and the keel has a fourth, its
 * cut-away. No maker is named and no foil is drawn: a fin is a flat slab with rounded edges.
 *
 * The outline, in the fin's own millimetres: `u` along the root from the leading edge toward the tail, `v` the depth
 * down from the root (drawn here with `v` growing away from the board). A template's control points are fractions:
 * x of the root, y of the depth. Rule A (the founder's "just scale the base", as D-35 and D-36 read it): every
 * control point (x, y) becomes (x·B, y·D), so the whole fin stretches along the board to FINS' own base and its depth
 * stays. A stretch can't make two edges cross, and a fin's area and sweep follow from its figures exactly.
 *
 * Which shape, how deep (the role table, FIN_ROLE_TEMPLATE and FIN_ROLE_DEPTH_IN):
 * - A single is as deep, in inches, as the board is long in feet (D-22), and a 2+1's centre an inch less (D-36). Both
 *   are the raked single, on a base 0.70 of that depth centred in FINS' box: FINS' "base" for them is the 10.5" box the
 *   fin slides in, never the fin.
 * - A thruster's three, a quad's fronts and its centre fin are the side fin, 4.5" deep.
 * - An upright twin and an Upright + Trailer's mains are the twin, 5.0" deep.
 * - A quad's rears are the small upright fin at 0.75 of the fronts' depth (the founder: "Quad rears should be 25%
 *   shorter than the fronts."), and an Upright + Trailer's centre trailer takes the same rule. A 2+1's side bites are
 *   the small fin too, 3.5" deep.
 * - A keel is the cut-away keel, 5.0" deep. FINS' base is its WHOLE footprint along the board, from the leading edge's
 *   root to the heel where the cut-away ends, and both land on FINS' placement dots (the founder: "a 6" base = 6"
 *   base fin, and a 4.5" base = 4.5" base fin."). So the keel touches the board only along the root that footprint
 *   gives, footprint / 1.52, and the heel hangs back over a gap above the bottom, straight over the trailing dot. The
 *   fin's body higher up rakes past that dot, as every fin's tip rakes past its trailing edge.
 *
 * Placement: each fin stands on its FINS line — the trailing edge at (`offTail`, `lateral`), the leading edge toward
 * (`leadingOffTail`, `leadingLateral`), so toe-in is already in it — upright, square to the bottom where it stands
 * (tilted along the board by the rocker's slope at the root's centre), with no cant (FINS has none). The root sits on
 * the bottom; the scene carries the solid a little up into the foam (`FIN_ROOT_SINK`) so no gap shows under the rounded
 * root.
 *
 * Never in the CNC files (D-16): the export reads the bare surface, never these.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or drawing-library import.
 */

import type { Vec3 } from "./board-surface";
import type { FinMark, FinSetup, TwinTemplate } from "./fins";
import { inchesToMm, mm, mmToFeet, type Mm } from "./units";

/**
 * Every job a fin can have on a board. What the shaper sees for each:
 * - `single`: a longboard's one big raked fin in its box.
 * - `twoPlusOneCentre`: the same fin an inch shallower, in a 2+1's box.
 * - `sideBite`: the two small fins beside a 2+1's centre.
 * - `twinUpright`: a performance twin, and an Upright + Trailer's two mains.
 * - `twinKeel`: a fish keel, long and low, its heel cut away.
 * - `trailer`: the small centre fin behind an Upright + Trailer's mains.
 * - `thruster`: a thruster's three, a quad's fronts and a quad's optional centre fin.
 * - `quadRear`: a quad's two small rear fins.
 */
export type FinOutlineRole =
  | "single"
  | "twoPlusOneCentre"
  | "sideBite"
  | "twinUpright"
  | "twinKeel"
  | "trailer"
  | "thruster"
  | "quadRear";

/** The five basic fin shapes. */
export type FinTemplateName = "single" | "twin" | "keel" | "side" | "small";
/** A control point: x as a fraction of the root from its leading end, y as a fraction of the depth off the root. */
export type FinTemplatePoint = readonly [number, number];
export type FinTemplateCubic = readonly [FinTemplatePoint, FinTemplatePoint, FinTemplatePoint, FinTemplatePoint];

/**
 * The five shapes (16-17-RESEARCH.md), to two decimals and never re-fitted. Each runs leading edge, tip, trailing edge,
 * every cubic starting where the last ended: level at the highest point, upright at the rearmost one.
 */
export const FIN_TEMPLATES: Record<FinTemplateName, readonly FinTemplateCubic[]> = {
  /** §1: a standard side fin, raked back to a rounded tip, its trailing edge dropping almost straight down. */
  side: [
    [[0, 0], [0.07, 0.19], [0.61, 1], [1.21, 1]],
    [[1.21, 1], [1.31, 1], [1.48, 0.93], [1.48, 0.88]],
    [[1.48, 0.88], [1.48, 0.73], [0.89, 0.7], [1, 0]],
  ],
  /** §2: an upright twin, a little fuller at the leading root than the side fin. */
  twin: [
    [[0, 0], [0.13, 0.28], [0.62, 1], [1.2, 1]],
    [[1.2, 1], [1.32, 1], [1.45, 0.94], [1.45, 0.86]],
    [[1.45, 0.86], [1.45, 0.71], [0.86, 0.66], [1, 0]],
  ],
  /** §3: a box keel. Its trailing edge stops at the heel, 0.20 of the depth off the root's line, and the fourth cubic
   * cuts forward from there to the root's end. */
  keel: [
    [[0, 0], [0.24, 0.27], [0.98, 1], [1.62, 1]],
    [[1.62, 1], [1.7, 1], [1.86, 0.97], [1.86, 0.89]],
    [[1.86, 0.89], [1.86, 0.69], [1.52, 0.54], [1.52, 0.2]],
    [[1.52, 0.2], [1.52, 0], [1.4, 0.1], [1, 0]],
  ],
  /** §6: a small upright fin: a quad's rears, a 2+1's side bites and the trailer. */
  small: [
    [[0, 0], [0.16, 0.31], [0.62, 1], [1.11, 1]],
    [[1.11, 1], [1.33, 1], [1.41, 0.87], [1.41, 0.82]],
    [[1.41, 0.82], [1.41, 0.7], [0.92, 0.58], [1, 0]],
  ],
  /** §5: the classic raked longboard single, long and narrow at the tip. */
  single: [
    [[0, 0], [0.16, 0.18], [0.71, 1], [1.4, 1]],
    [[1.4, 1], [1.48, 1], [1.59, 0.99], [1.59, 0.94]],
    [[1.59, 0.94], [1.59, 0.86], [0.7, 0.7], [1, 0]],
  ],
};

/** Which shape each role draws (16-17-RESEARCH.md §9, D-36). */
export const FIN_ROLE_TEMPLATE: Record<FinOutlineRole, FinTemplateName> = {
  single: "single",
  twoPlusOneCentre: "single",
  sideBite: "small",
  twinUpright: "twin",
  twinKeel: "keel",
  trailer: "small",
  thruster: "side",
  quadRear: "small",
};

/** The roles with a depth of their own, in inches (D-25; the side bites from 16-17-RESEARCH.md §6, D-36). */
export const FIN_ROLE_DEPTH_IN = { twinUpright: 5, twinKeel: 5, thruster: 4.5, sideBite: 3.5 } as const;

/** A quad's rears, and a trailer, against the same board's fronts (the founder, D-35: "25% shorter"). */
export const FIN_QUAD_REAR_OF_FRONT = 0.75;

/** A single's base against its depth, and a 2+1 centre's (D-25). */
export const FIN_SINGLE_BASE_OF_DEPTH = 0.7;

/** How much shallower a 2+1's centre is than a single on the same board, in inches (D-36). */
export const FIN_TWO_PLUS_ONE_SHORTER_IN = 1;

/** A fin's thickness at the root, in inches (D-25): 3/8" for a single and a 2+1's centre, 1/4" for the rest. */
export const FIN_THICKNESS_IN = { side: 0.25, single: 0.375 } as const;

/** A single fin's depth: the board's length in feet, read as inches (D-22) — a 9'0" board draws a 9" fin. */
export function singleFinDepth(length: Mm): Mm {
  return inchesToMm(mmToFeet(length));
}

/** How many points each cubic is sampled at. Fixed, so the work is bounded (T-16-22). */
export const FIN_CUBIC_SAMPLES = 24;

/** How far the scene carries a fin's solid up into the foam, so no gap shows under its rounded root (D-25). */
export const FIN_ROOT_SINK: Mm = mm(1);

/** A point of a fin's outline, in the fin's own millimetres (see the header). */
export interface FinOutlinePoint {
  u: number;
  v: number;
}

/** One fin's outline: from (0, 0) up the leading edge, round the tip and down to the root's end, (B, 0). */
export interface FinOutline {
  /** The outline, leading edge first; the root, (B, 0) back to (0, 0), closes it. */
  points: FinOutlinePoint[];
  /** The index of the highest point, where the leading edge ends. */
  tipFrom: number;
  /** The root: the run along the board the outline closes on. */
  base: Mm;
  /** The fin's footprint along the board: the root, or on a keel the root and the heel behind it (FINS' base). */
  footprint: Mm;
  depth: Mm;
  /** How far the highest point sits behind the root's end. */
  tipBehind: Mm;
  thickness: Mm;
  template: FinTemplateName;
}

/** The role's depth for a board of `length`. */
export function finRoleDepth(role: FinOutlineRole, length: Mm): Mm {
  switch (role) {
    case "single":
      return singleFinDepth(length);
    case "twoPlusOneCentre":
      return inchesToMm(mmToFeet(length) - FIN_TWO_PLUS_ONE_SHORTER_IN);
    case "quadRear":
    case "trailer":
      return mm(FIN_QUAD_REAR_OF_FRONT * finRoleDepth("thruster", length));
    default:
      return inchesToMm(FIN_ROLE_DEPTH_IN[role]);
  }
}

/**
 * How many roots a fin's footprint on the board runs to: 1 for every shape but the keel, whose footprint ends at its
 * heel, where the cut-away begins (D-36). Never the outline's greatest u: the keel's body runs on past the heel high up.
 */
export function finTemplateFootprint(name: FinTemplateName): number {
  const cutAway = FIN_TEMPLATES[name][3];
  return cutAway ? cutAway[0][0] : 1;
}

/** One cubic at parameter `t`, its controls stretched to the fin (Rule A). */
function cubicAt(c: FinTemplateCubic, t: number, base: number, depth: number): FinOutlinePoint {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const d = 3 * s * t * t;
  const e = t * t * t;
  return {
    u: (a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0]) * base,
    v: (a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]) * depth,
  };
}

/**
 * One fin's outline for `role` on a root of `base` and a depth of `depth`, by Rule A (see the header): the role's
 * shape, every control point stretched to the root and the depth.
 */
export function finOutline(role: FinOutlineRole, base: Mm, depth: Mm): FinOutline {
  const template = FIN_ROLE_TEMPLATE[role];
  const cubics = FIN_TEMPLATES[template];
  const points: FinOutlinePoint[] = [];
  cubics.forEach((cubic, c) => {
    for (let i = c === 0 ? 0 : 1; i < FIN_CUBIC_SAMPLES; i++) {
      points.push(cubicAt(cubic, i / (FIN_CUBIC_SAMPLES - 1), base, depth));
    }
  });
  // Exact ends: the root's front at the origin, its end on the root's line.
  points[0] = { u: 0, v: 0 };
  points[points.length - 1] = { u: base, v: 0 };
  const highest = cubics[0][3][0];
  const thick = role === "single" || role === "twoPlusOneCentre" ? FIN_THICKNESS_IN.single : FIN_THICKNESS_IN.side;
  return {
    points,
    tipFrom: FIN_CUBIC_SAMPLES - 1,
    base,
    footprint: mm(finTemplateFootprint(template) * base),
    depth,
    tipBehind: mm((highest - 1) * base),
    thickness: inchesToMm(thick),
    template,
  };
}

/**
 * Which job a FINS mark does, for the board's fin setup (D-35, D-36): see `FinOutlineRole`. A twin's centre mark is the
 * Upright + Trailer's trailer; a quad's centre fin is a side fin like its fronts.
 */
export function finOutlineRole(setup: FinSetup, twinTemplate: TwinTemplate, mark: FinMark): FinOutlineRole {
  switch (setup) {
    case "single":
      return "single";
    case "2plus1":
      return mark.role === "center" ? "twoPlusOneCentre" : "sideBite";
    case "twin":
      if (mark.role === "center") return "trailer";
      return twinTemplate === "keel" ? "twinKeel" : "twinUpright";
    case "quad":
      return mark.role === "rear" ? "quadRear" : "thruster";
    case "thruster":
      return "thruster";
  }
}

/** One fin as the 3D board draws it. Points are in the board surface's axes (x along from the tail, y across, z up). */
export interface PlacedFin {
  role: FinOutlineRole;
  outline: FinOutline;
  /**
   * The root's front, on the fin's FINS line, at the height of the bottom at the root's centre. On every fin but a
   * single, a 2+1's centre and a keel it is FINS' leading dot; a keel's is its footprint's front, on that dot.
   */
  leading: Vec3;
  /**
   * The root's end, at the same height: FINS' trailing dot, but for a keel, whose root stops short of the dot and whose
   * HEEL lands on it, 1.52 roots from `leading` along this line.
   */
  trailing: Vec3;
  /** The bottom's height at the root's centre station: where the root sits. */
  rootZ: Mm;
  /** The rocker's slope at the root's centre, as an angle: the fin is tilted by it so it stands square to the bottom. */
  tiltRad: number;
  thickness: Mm;
}

const finite = (...values: number[]) => values.every((v) => Number.isFinite(v));

/**
 * Every fin of the board's FINS placement, stood on the board: each on its FINS line (toe included), its root on the
 * bottom at its centre station, tilted by the rocker's slope there so it stands square to the bottom. A fin whose
 * figures are not usable numbers (a non-finite or non-positive base or depth, a position that is not a number) is left
 * out (T-16-22); the board still draws.
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
    let base: number = mark.baseLength;
    let leadingAt = { x: mark.leadingOffTail as number, y: mark.leadingLateral as number };
    let trailingAt = { x: mark.offTail as number, y: mark.lateral as number };
    if (role === "single" || role === "twoPlusOneCentre") {
      // FINS' base for these is the box; the fin is 0.70 of its depth long, centred in the box, on the stringer.
      base = FIN_SINGLE_BASE_OF_DEPTH * depth;
      const trailing = mark.offTail + (mark.baseLength - base) / 2;
      trailingAt = { x: trailing, y: mark.lateral };
      leadingAt = { x: trailing + base, y: mark.lateral };
    } else if (role === "twinKeel") {
      // FINS' base is the keel's whole footprint, centred on the line between FINS' two dots like every base; the root
      // is its front part, so the heel behind the root lands on the trailing dot (D-36).
      const footprint: number = mark.baseLength;
      base = footprint / finTemplateFootprint("keel");
      const run = Math.hypot(trailingAt.x - leadingAt.x, trailingAt.y - leadingAt.y);
      const along = { x: (trailingAt.x - leadingAt.x) / run, y: (trailingAt.y - leadingAt.y) / run };
      const middle = { x: (leadingAt.x + trailingAt.x) / 2, y: (leadingAt.y + trailingAt.y) / 2 };
      leadingAt = { x: middle.x - (along.x * footprint) / 2, y: middle.y - (along.y * footprint) / 2 };
      trailingAt = { x: leadingAt.x + along.x * base, y: leadingAt.y + along.y * base };
    }
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
