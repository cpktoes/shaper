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
  /** Tail-side Rail Length / widepoint vector strength, 0-100. Scales the widepoint's tail-facing handle. */
  tailRailLength: number;
  /** Nose-side Rail Length / widepoint vector strength, 0-100. Scales the widepoint's nose-facing handle. */
  noseRailLength: number;
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
 * The range of boards this app will draw, in inches — 5'0" to 10'0" long, 16" to 25" at the
 * widepoint.
 *
 * These are the bounds the outline editor's sliders have always clamped to; they live here now
 * because they stopped being a UI detail the moment something other than a slider needed to know
 * them. The order form's template window is sized from them (see `outline-viewer.tsx`'s
 * `fixedFrame`), so that one window holds any board the editor can produce rather than resizing
 * itself around whichever board happens to be loaded.
 *
 * Inches rather than `Mm`, deliberately: every consumer is a slider bound or a drawing scale, both
 * of which work in the inch domain, and a `Mm` constant would only be converted back at each use.
 */
export const BOARD_LENGTH_RANGE_IN = { min: 60, max: 120 } as const;
export const WIDEPOINT_WIDTH_RANGE_IN = { min: 16, max: 25 } as const;

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
    tailRailLength: 50,
    noseRailLength: 50,
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
