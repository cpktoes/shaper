/**
 * Board-design types.
 *
 * Pure TypeScript, no UI/browser/database imports. Everything here is
 * metric (`Mm`/`Degrees` branded types) — inches only ever appear at the
 * units boundary (lib/geometry/units.ts) when converting a control value
 * in or a label out.
 */

import { type Degrees, type Mm, degrees, inchesToMm } from "./units";

/** Generic 2D point in millimetres. */
export interface Point2D {
  x: Mm;
  y: Mm;
}

/** A single cubic Bezier segment, derived from the outline parameters — never stored directly. */
export interface BezierSegment {
  p0: Point2D;
  c0: Point2D;
  c1: Point2D;
  p1: Point2D;
}

/**
 * A single sampled point along the outline curve.
 *
 * Axis convention for the outline: `station` is measured from the tail tip
 * toward the nose; `halfWidth` is measured out from the stringer (centre
 * line). Named fields — rather than a generic Point2D — so the axis roles
 * can never be confused when reading sampled output.
 */
export interface OutlinePoint {
  station: Mm;
  halfWidth: Mm;
}

/**
 * Tail shape as a discriminated union — each variant carries exactly its
 * own measurements. `roundedPin` is listed in the approved design
 * (.planning/design/GEOMETRY-MODULE.md) but the prototype does not
 * implement it, so it is deliberately absent here until there is a real
 * shaping rule for it.
 */
export type TailShape =
  | { kind: "pin" }
  | { kind: "round" }
  | { kind: "squash"; endWidth: Mm }
  | { kind: "diamond"; endWidth: Mm; depth: Mm }
  | { kind: "swallow"; endWidth: Mm; crotchDepth: Mm };

/** Parametric controls for the outline curve — the single place all outline UI controls write to. */
export interface OutlineSpec {
  /** Overall board length. */
  length: Mm;
  /** Widepoint width, FULL width (not half). */
  widePointWidth: Mm;
  /** Widepoint offset from the board's centre, positive toward the nose. */
  widePointOffset: Mm;
  /** Rail Length / widepoint vector strength, 0-100. */
  railLength: number;
  /** Nose angle in degrees, 35-90. */
  noseAngle: Degrees;
  /** Nose fullness, 0-100. */
  noseFullness: number;
  /** Tail angle in degrees, 30-90. */
  tailAngle: Degrees;
  /** Tail fullness, 0-100. */
  tailFullness: number;
  tail: TailShape;
}

/**
 * The single board-design object. Rocker, foil, rails and fins become
 * sibling keys in later phases, so screens added later extend this object
 * rather than reshaping it.
 */
export interface BoardSpec {
  outline: OutlineSpec;
}

export const DEFAULT_BOARD_SPEC: BoardSpec = {
  outline: {
    length: inchesToMm(72),
    widePointWidth: inchesToMm(19),
    widePointOffset: inchesToMm(-0.5),
    railLength: 50,
    noseAngle: degrees(55),
    noseFullness: 25,
    tailAngle: degrees(60),
    tailFullness: 50.5,
    tail: { kind: "squash", endWidth: inchesToMm(4) },
  },
};

/** A preset applied when a tail-shape button is clicked — overwrites shape, angle and fullness at once. */
export interface TailPreset {
  tail: TailShape;
  tailAngle: Degrees;
  tailFullness: number;
}

/**
 * One entry per tail kind, ported from the prototype's tail-shape button
 * presets (reference/project/Template.dc.html lines 809-819). The UI reads
 * these when a tail button is clicked.
 */
export const TAIL_PRESETS: Record<TailShape["kind"], TailPreset> = {
  pin: {
    tail: { kind: "pin" },
    tailAngle: degrees(65),
    tailFullness: 50,
  },
  round: {
    tail: { kind: "round" },
    tailAngle: degrees(90),
    tailFullness: 90,
  },
  diamond: {
    tail: { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) },
    tailAngle: degrees(30),
    tailFullness: 30,
  },
  squash: {
    tail: { kind: "squash", endWidth: inchesToMm(5) },
    tailAngle: degrees(45),
    tailFullness: 50,
  },
  swallow: {
    tail: {
      kind: "swallow",
      endWidth: inchesToMm(8),
      crotchDepth: inchesToMm(3),
    },
    tailAngle: degrees(30),
    tailFullness: 0,
  },
};
