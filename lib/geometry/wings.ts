/**
 * Wings — a step in the outline near the fins (quick 261014-wii, 2026-10-14).
 *
 * A wing is a step applied AFTER today's outline curve (sketch 013, construction A; the founder,
 * 2026-10-14: "construction wise, we definitely want to go A"). The two-span Bézier in
 * `outline.ts` is untouched: ahead of the wing nearest the nose the outline is exactly the curve
 * the shaper drew; behind each wing its depth is taken out and fades linearly to nothing at the
 * tail pod, so the tail block keeps the number on its chip; two wings add up like a staircase.
 * A board with no wings never reaches this file (D1).
 *
 * The step, as maths (`.claude/skills/sketch-findings-shaper/references/wings.md`):
 * - Corners: outer `(S, 0)`, inner `(S − run, depth)`, along the board and inward.
 * - Turning angle `θ = atan2(depth, run)`; tangent length `t = R·tan(θ/2)`; the two rounds fit
 *   while `2t ≤ √(run² + depth²)`, so `R_max = (√(run² + depth²) / 2) / tan(θ/2)` and
 *   `R = min(asked, R_max)` — the founder's corner radius ("more of a radius rounder on the
 *   wing's outer and inner points").
 * - The step is a polyline: an arc of radius `R` from `(S + t, 0)` about `(S + t, R)` onto the
 *   step's leg, straight along the leg, then an arc about `(S − run − t, depth − R)` to
 *   `(S − run − t, depth)`. The share of the depth taken, `p(s)`, is 0 nose-ward of `S + t`, 1
 *   tail-ward of `S − run − t`, and follows the polyline between.
 * - Construction A: `hw(s) − Σ depthᵢ · pᵢ(s) · fadeᵢ(s)`, `fade` linear from 1 at the wing's
 *   inner corner to 0 at the tail pod, clamped to `[0, widepoint half-width]`.
 *
 * Ported line for line from the sketch's own curve code, kept unedited at
 * `reference/sketches/013-wings-curves.js` (`stepLeg`, `turnAngle`, `maxRadius`,
 * `effectiveRadius`, `wingShape`, `stepProfile`, `exactHalfWidthAt`, `wingedHalfWidth` variant
 * "a", `wingedPoints`, `wingReadouts`). The sketch works in inches; this port works in
 * millimetres. Every dimensionless constant is kept as is (the `1e-9` in `maxRadius`, the arc
 * count rule, the 60 bisection steps); every inch constant goes through `inchesToMm` (the tangent
 * floor, the share floor, the hair, the 0.02" grid). `lib/geometry/wings.test.ts` checks this file
 * against the sketch's own numbers at every recorded station (CLAUDE.md Rule 1, D10).
 *
 * The founder's rulings after walking the first build (quick 261015-hz7, 2026-10-15), each a pure
 * function below the step's maths:
 * - **Slots (D1).** "Only wing 1 gets lock to front fins option." "Wing 2 can lock to rear if it's a
 *   quad setup, otherwise no lock." "Fin edge should always be to trailing edge for the lock, so we
 *   can get rid of that selector." So wing 1 may hold only `"front-trailing"` and wing 2 only
 *   `"rear-trailing"` (`wingLockFitsSlot`, `slotWingLocks`), and a lock follows that fin group's
 *   trailing edge plus the wing's offset (`wingLockEdge`).
 * - **Order (D2).** "Wing 2 has to be closer to the tail than wing 1, and can't get any closer than
 *   1/2" or 2x the run along the stringer from wing 1 (whichever is larger)." Wing 2's apex sits at
 *   least `wingOrderGap` = max(1/2", 2 × wing 1's run) behind wing 1's apex, and never under 2" — the
 *   2" floor wins when the two disagree (`clampWingStations`). Wing 1 is now the forward wing (the
 *   front fins, or a stinger), wing 2 the aft one (a quad's rear fins, or by hand) — the reverse of
 *   the first build, which added wing 2 4 1/2" nose-ward.
 * - **Top (D3).** "The wing's position off tail should be limited by center or the widepoint,
 *   whichever is closer to the tail." Every position runs from 2" to `wingPositionTop`.
 * - **Defaults (D5).** "Drop the default wing to 3/16"": both wings are added 3/16" deep, so neither
 *   opens with the fin-box warning (`wingFinBoxDistance`, D4).
 * Saved wings out of order or past the top are corrected when the board is drawn (`placedWings`,
 * and the store's `resolveWingStations`), never rewritten on open (rule 7 of design-snapshot.ts).
 *
 * Pure: types only from `./board` and `./outline`, values only from `./units` (CLAUDE.md Rule 1).
 */

import type { OutlinePoint, OutlineSpec } from "./board";
import type { OutlineGeometry } from "./outline";
import { inchesToMm, mm, mmToInches, type Mm, type UnitsSystem } from "./units";

/**
 * What a wing is locked to, or `null` for a wing placed by hand (quick 261015-hz7, D1): wing 1 may
 * follow the front fins' trailing edge, wing 2 a quad's rear fins' trailing edge. (The first build's
 * `"front-leading"` reads as `"front-trailing"` when a saved board opens — design-snapshot.ts, rule 7.)
 */
export type WingLock = "front-trailing" | "rear-trailing" | null;

/**
 * One wing, stored on the outline (P1). `station` is the wing's OUTER corner from the tail —
 * where the step leaves the curve the shaper drew. `radius` is the corner radius ASKED for; the
 * step uses `effectiveWingRadius`, never more than fits. `finOffset` is positive toward the nose
 * and only read while `lock` is set; `station` is then the last resolved one (P2), which is what
 * unlocking keeps.
 */
export interface Wing {
  station: Mm;
  depth: Mm;
  run: Mm;
  radius: Mm;
  lock: WingLock;
  finOffset: Mm;
}

/** The trailing edges a wing can lock to, measured from the tail: the front fins' and a quad's rear
 * fins', each `null` when the fin setup has none — declared here so this file never imports
 * `fins.ts` (`wing-lock.ts` fills it in from FINS' own marks; D1). */
export interface WingFinEdges {
  front: Mm | null;
  rear: Mm | null;
}

/** No fins to lock to — every wing placed by hand. */
export const NO_FIN_EDGES: WingFinEdges = { front: null, rear: null };

/** Up to two wings per board (D2). */
export const MAX_WINGS = 2;
/** The nearest a wing may sit to the tail, in inches. */
export const WING_POSITION_MIN_IN = 2;
/** A wing's depth toward the stringer, in inches (D2). */
export const WING_DEPTH_RANGE_IN = { min: 1 / 16, max: 1 } as const;
/** A wing's run along the stringer, in inches — 0 is a square step (D2). */
export const WING_RUN_RANGE_IN = { min: 0, max: 2 } as const;
/** A locked wing's offset from its fin edge, in inches, positive toward the nose (D2). */
export const WING_FIN_OFFSET_RANGE_IN = { min: -3, max: 3 } as const;
/** Every wing number moves in 1/16" steps in Imperial ... */
export const WING_STEP_IN = 1 / 16;
/** ... and 1 mm steps in Metric (D2, D9). */
export const WING_STEP_MM = 1;

/** A new wing's depth, in inches — the founder (2026-10-15): "drop the default wing to 3/16"" (D5). */
export const WING_DEFAULT_DEPTH_IN = 3 / 16;
/** Wing 2's apex sits at least this far behind wing 1's, in inches ... (D2) */
export const WING_ORDER_MIN_GAP_IN = 1 / 2;
/** ... or this many times wing 1's run, whichever is larger (D2). */
export const WING_ORDER_RUN_TIMES = 2;
/** A second wing placed by hand is added this far behind wing 1, in inches, or the gap if larger (D5). */
export const WING_SECOND_BY_HAND_IN = 3;
/** The founder's scaling rule (D4): a wing no deeper than this, in inches, needs no fin-box room ... */
export const WING_FIN_BOX_FREE_DEPTH_IN = 3 / 16;
/** ... and a deeper one wants its apex `2 × depth − this` behind a fin's trailing edge, in inches. */
export const WING_FIN_BOX_TRIM_IN = 1 / 4;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The geometry a wing's position limits read: the board's length and its widepoint station. */
export type WingPlacementGeometry = Pick<OutlineGeometry, "length" | "widePointStation">;

/**
 * The furthest from the tail a wing may sit (D3): the board's centre or its widepoint, whichever is
 * nearer the tail. The widepoint is the outline's own `widePointStation`, the same with or without
 * wings.
 */
export function wingPositionTop(g: WingPlacementGeometry): Mm {
  return mm(Math.min(g.length / 2, g.widePointStation));
}

/** The position slider's plain range, in inches: 2" to `wingPositionTop` (D3). */
export function wingPositionRangeIn(g: WingPlacementGeometry): { min: number; max: number } {
  return { min: WING_POSITION_MIN_IN, max: Math.max(WING_POSITION_MIN_IN, mmToInches(wingPositionTop(g))) };
}

/** How far behind wing 1's apex wing 2's apex must sit (D2): the larger of 1/2" and twice wing 1's
 * run, so a flat of at least one run lies between wing 1's inner corner and wing 2's apex. */
export function wingOrderGap(first: Pick<Wing, "run">): Mm {
  return mm(Math.max(inchesToMm(WING_ORDER_MIN_GAP_IN), WING_ORDER_RUN_TIMES * Math.max(0, first.run)));
}

/** The tolerance the room test compares with, in millimetres (sums of inch figures carry float dust). */
const ORDER_EPS_MM = 1e-9;

/**
 * Every wing's station kept inside 2" … `wingPositionTop` (D3), then wing 2 kept at least
 * `wingOrderGap` behind wing 1 and never under 2" — the 2" floor wins when there is no room (D2).
 * Applied after the locks resolve. Never drops a wing. Returns the SAME array when nothing moves, and
 * the same objects for the wings that do not move.
 */
export function clampWingStations(wings: readonly Wing[], g: WingPlacementGeometry): readonly Wing[] {
  const lo = inchesToMm(WING_POSITION_MIN_IN);
  const top = wingPositionTop(g);
  let changed = false;
  const out = wings.map((w) => {
    const station = clamp(w.station, lo, top);
    if (station === w.station) return w;
    changed = true;
    return { ...w, station: mm(station) };
  });
  if (out.length >= 2) {
    const limit = Math.max(lo, out[0].station - wingOrderGap(out[0]));
    if (out[1].station > limit) {
      out[1] = { ...out[1], station: mm(limit) };
      changed = true;
    }
  }
  return changed ? out : wings;
}

/**
 * Where wing 2 may sit at most (D2): wing 1's station (kept under the top) less the gap — `null`
 * with no wing — and whether that leaves no room above the 2" floor.
 */
export function wingOrderState(
  wings: readonly Wing[],
  g: WingPlacementGeometry,
): { limit: Mm | null; noRoom: boolean } {
  const first = wings[0];
  if (!first) return { limit: null, noRoom: false };
  const lo = inchesToMm(WING_POSITION_MIN_IN);
  const limit = mm(clamp(first.station, lo, wingPositionTop(g)) - wingOrderGap(first));
  return { limit, noRoom: limit < lo - ORDER_EPS_MM };
}

/**
 * A wing's position slider range, in inches, for its slot (D2, D3). Wing 1 alone: 2" to the top.
 * Wing 1 with a wing 2: from 2" plus the gap (never above the top), so wing 2 always has room.
 * Wing 2: 2" to wing 1 less the gap. With no room for wing 2, the plain range — its row is disabled.
 */
export function wingPositionRangeForSlot(
  wings: readonly Wing[],
  index: number,
  g: WingPlacementGeometry,
): { min: number; max: number } {
  const plain = wingPositionRangeIn(g);
  const state = wingOrderState(wings, g);
  if (wings.length < 2 || state.limit === null || state.noRoom) return plain;
  if (index === 0) {
    return { min: Math.min(plain.max, WING_POSITION_MIN_IN + mmToInches(wingOrderGap(wings[0]))), max: plain.max };
  }
  return { min: plain.min, max: clamp(mmToInches(state.limit), plain.min, plain.max) };
}

/** Whether "+ Add wing 2" can add one (D2): exactly one wing, far enough from the tail for a wing 2
 * to sit the gap behind it and still 2" from the tail. */
export function canAddSecondWing(wings: readonly Wing[], g: WingPlacementGeometry): boolean {
  return wings.length === 1 && !wingOrderState(wings, g).noRoom;
}

/** Whether a lock fits a wing's slot (D1): wing 1 only the front fins', wing 2 only the rear fins'. */
export function wingLockFitsSlot(index: number, lock: WingLock): boolean {
  if (lock === null) return true;
  return (index === 0 && lock === "front-trailing") || (index === 1 && lock === "rear-trailing");
}

/** Each wing whose lock its slot may not hold, read as placed by hand at its own station (D1, D10).
 * The SAME array when every lock fits; new objects only where a lock is dropped. */
export function slotWingLocks(wings: readonly Wing[]): Wing[] {
  let changed = false;
  const out = wings.map((w, i) => {
    if (wingLockFitsSlot(i, w.lock)) return w;
    changed = true;
    return { ...w, lock: null };
  });
  return changed ? out : (wings as Wing[]);
}

/** The wings list with one removed; a wing 2 that becomes wing 1 drops its rear lock and keeps its
 * station (D1). */
export function removeWing(wings: readonly Wing[], index: number): Wing[] {
  return slotWingLocks(wings.filter((_, i) => i !== index));
}

/**
 * The trailing edge a wing follows (D1): wing 1 locked to the front fins, or wing 2 locked to a
 * quad's rear fins, when those fins exist — else `null`, and the wing sits at its own station (a
 * lock its slot may not hold, or a lock on a fin setup without those fins, is inert).
 */
export function wingLockEdge(w: Pick<Wing, "lock">, index: number, edges: WingFinEdges): Mm | null {
  if (index === 0 && w.lock === "front-trailing") return edges.front;
  if (index === 1 && w.lock === "rear-trailing") return edges.rear;
  return null;
}

/**
 * The founder's scaling rule (D4, 2026-10-15): "If Wing Depth is > 3/16", recommend a distance using
 * the formula Distance Behind Trailing Edge = (2 × Wing Depth) − 0.25"" — 3/8" deep wants 1/2", 1/2"
 * wants 3/4", 1" wants 1 3/4".
 */
export function wingFinBoxDistance(depth: Mm): Mm {
  return mm(2 * depth - inchesToMm(WING_FIN_BOX_TRIM_IN));
}

/** The sketch's `wingShape` floor on the tangent length, 1e-9 inch. */
const TANGENT_FLOOR_MM = inchesToMm(1e-9);
/** The sketch's `stepProfile` floor on a polyline piece's length along the board, 1e-12 inch. */
const SHARE_FLOOR_MM = inchesToMm(1e-12);
/** The hair either side of a corner (1e-6 inch), so a square step draws vertical. */
const HAIR_MM = inchesToMm(1e-6);
/** The 0.02" grid through each step. */
const STEP_GRID_MM = inchesToMm(0.02);
/** The sketch's arc count: one segment per 5° of turn, never fewer than six. */
const ARC_STEP_RADIANS = Math.PI / 36;
const MIN_ARC_SEGMENTS = 6;
/** The exact curve's bisection steps — the sketch's own 60. */
const BISECTION_STEPS = 60;

function stepLeg(w: Pick<Wing, "run" | "depth">): number {
  return Math.hypot(w.run, w.depth);
}

function turnAngle(w: Pick<Wing, "run" | "depth">): number {
  return Math.atan2(w.depth, Math.max(w.run, 0));
}

/**
 * The largest corner radius whose two rounds fit on this step (the sketch's `maxRadius`). A
 * square 3/8" step takes 3/16" (half the depth — a square turn is 90°); a 1" run takes about 3".
 */
export function maxWingRadius(w: Pick<Wing, "run" | "depth">): Mm {
  const tanHalf = Math.tan(turnAngle(w) / 2);
  return mm(tanHalf > 1e-9 ? stepLeg(w) / 2 / tanHalf : 0);
}

/** The corner radius the step actually uses: the one asked for, never more than fits. */
export function effectiveWingRadius(w: Pick<Wing, "run" | "depth" | "radius">): Mm {
  return mm(Math.max(0, Math.min(w.radius || 0, maxWingRadius(w))));
}

/** One point of the step: a station along the board and how far in from the curve. */
export interface WingStepPoint {
  station: number;
  inward: number;
}

export interface WingStepShape {
  /** From where the step leaves the curve (nose-most) to where it settles at full depth. */
  points: WingStepPoint[];
  /** The corner rounds' tangent length, 0 for sharp corners. */
  tangent: number;
  /** The radius the rounds are drawn at, 0 for sharp corners. */
  radius: number;
}

/** The step as a polyline in (station, inward) millimetres — the sketch's `wingShape`. */
export function wingStepShape(w: Pick<Wing, "station" | "run" | "depth" | "radius">): WingStepShape {
  const S = w.station;
  const r = w.run;
  const d = w.depth;
  const R = effectiveWingRadius(w);
  const L = stepLeg(w);
  const u = L > 0 ? { x: -r / L, y: d / L } : { x: 0, y: 1 };
  const t = R * Math.tan(turnAngle(w) / 2);
  const c1 = { x: S, y: 0 };
  const c2 = { x: S - r, y: d };
  if (t <= TANGENT_FLOOR_MM) {
    return {
      points: [
        { station: c1.x, inward: c1.y },
        { station: c2.x, inward: c2.y },
      ],
      tangent: 0,
      radius: 0,
    };
  }
  const A1 = { x: S + t, y: 0 };
  const B1 = { x: c1.x + t * u.x, y: c1.y + t * u.y };
  const B2 = { x: c2.x - t * u.x, y: c2.y - t * u.y };
  const A2 = { x: S - r - t, y: d };
  const C1 = { x: S + t, y: R };
  const C2 = { x: S - r - t, y: d - R };
  const arc = (C: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const a0 = Math.atan2(from.y - C.y, from.x - C.x);
    const a1 = Math.atan2(to.y - C.y, to.x - C.x);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const n = Math.max(MIN_ARC_SEGMENTS, Math.ceil(Math.abs(da) / ARC_STEP_RADIANS));
    const out: WingStepPoint[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (da * i) / n;
      out.push({ station: C.x + R * Math.cos(a), inward: C.y + R * Math.sin(a) });
    }
    return out;
  };
  return { points: [...arc(C1, A1, B1), ...arc(C2, B2, A2)], tangent: t, radius: R };
}

export interface WingFootprint {
  /** Where the step leaves the curve — the wing's station, or a tangent length nose-ward of it when rounded. */
  stepStart: Mm;
  /** Where the step reaches full depth — the inner corner, or a tangent length past it when rounded. */
  inner: Mm;
  shape: WingStepShape;
}

function footprintOf(shape: WingStepShape): WingFootprint {
  return {
    stepStart: mm(shape.points[0].station),
    inner: mm(shape.points[shape.points.length - 1].station),
    shape,
  };
}

/** How far along the board the step reaches (the sketch's `wingFootprint`). */
export function wingFootprint(w: Pick<Wing, "station" | "run" | "depth" | "radius">): WingFootprint {
  return footprintOf(wingStepShape(w));
}

function shareFromShape(shape: WingStepShape, depth: number, s: number): number {
  const pts = shape.points;
  if (s >= pts[0].station) return 0;
  if (s <= pts[pts.length - 1].station) return 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (s <= a.station && s >= b.station) {
      const f = a.station - b.station > SHARE_FLOOR_MM ? (a.station - s) / (a.station - b.station) : 1;
      return clamp((a.inward + (b.inward - a.inward) * f) / depth, 0, 1);
    }
  }
  return 1;
}

/** The share of the wing's depth taken at station `s`: 0 ahead of the step, 1 behind it, following
 * the rounded step through it (the sketch's `stepProfile`). */
export function wingStepShare(w: Pick<Wing, "station" | "run" | "depth" | "radius">, s: Mm): number {
  return shareFromShape(wingStepShape(w), w.depth, s);
}

/**
 * The curve the shaper drew, exactly, at any station — not the 161-point polyline (the sketch's
 * `exactHalfWidthAt`). Solves the Bézier span for its station by bisection (the spans are monotone
 * in station), clamped to `[0, widepoint half-width]`; the tail block's half-width at or behind the
 * tail pod; 0 at or past the nose.
 */
export function curveHalfWidthAt(g: OutlineGeometry, station: Mm): Mm {
  if (station <= g.tailPodStation) return g.halfTailBlockWidth;
  if (station >= g.length) return mm(0);
  const seg = station <= g.widePointStation ? g.segments[0] : g.segments[1];
  const bez = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (bez(seg.p0.x, seg.c0.x, seg.c1.x, seg.p1.x, mid) < station) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return mm(clamp(bez(seg.p0.y, seg.c0.y, seg.c1.y, seg.p1.y, t), 0, g.halfWidePointWidth));
}

/** A wing with its step worked out once, so a whole board's worth of stations never rebuilds it (F17). */
interface PreparedWing {
  depth: number;
  shape: WingStepShape;
  inner: number;
}

function prepare(wings: readonly Wing[]): PreparedWing[] {
  const out: PreparedWing[] = [];
  for (const w of wings) {
    // A wing with no depth takes nothing — and the share divides by it.
    if (!(w.depth > 0)) continue;
    const shape = wingStepShape(w);
    out.push({ depth: w.depth, shape, inner: shape.points[shape.points.length - 1].station });
  }
  return out;
}

/** Σ depth · share · fade at station `s` — what construction A takes off the curve there. */
function takeAt(g: OutlineGeometry, prepared: readonly PreparedWing[], s: number): number {
  if (s <= g.tailPodStation) return 0;
  let take = 0;
  for (const p of prepared) {
    const share = shareFromShape(p.shape, p.depth, s);
    const fade =
      p.inner > g.tailPodStation ? clamp((s - g.tailPodStation) / (p.inner - g.tailPodStation), 0, 1) : 0;
    take += p.depth * share * fade;
  }
  return take;
}

function wingedFromPrepared(g: OutlineGeometry, prepared: readonly PreparedWing[], s: number): number {
  const base = curveHalfWidthAt(g, mm(s));
  if (s <= g.tailPodStation) return base;
  return clamp(base - takeAt(g, prepared, s), 0, g.halfWidePointWidth);
}

/**
 * The half-width at station `s` with the wings applied, construction A (the sketch's
 * `wingedHalfWidth(g, wings, "a", s)`): the exact curve, less each wing's depth times its share
 * at `s` times its fade toward the tail pod. `g` may be the winged or the bare geometry — both
 * carry the same Bézier spans.
 */
export function wingedHalfWidthAt(g: OutlineGeometry, wings: readonly Wing[], station: Mm): Mm {
  return mm(wingedFromPrepared(g, prepare(wings), station));
}

/** The wings as the board draws them: a wing without depth dropped (defensive — the share divides
 * by the depth, and a saved board is read forgivingly), then every station kept inside 2" … the
 * top and wing 2 behind wing 1 (`clampWingStations`, D2, D3) — so every reader of `buildOutline`
 * (the rack, the prints, the tiles) draws the board the screen shows. */
export function placedWings(wings: readonly Wing[], g: WingPlacementGeometry): readonly Wing[] {
  const kept = wings.every((w) => w.depth > 0) ? wings : wings.filter((w) => w.depth > 0);
  return clampWingStations(kept, g);
}

/** Today's `sampleOutline` rule (outline.ts's `interpolateHalfWidth`), for the 12" widths. */
function interpolateHalfWidth(points: readonly OutlinePoint[], station: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (station >= p0.station && station <= p1.station) {
      const t = p1.station > p0.station ? (station - p0.station) / (p1.station - p0.station) : 0;
      return p0.halfWidth + (p1.halfWidth - p0.halfWidth) * t;
    }
  }
  return points[points.length - 1].halfWidth;
}

/**
 * The board's outline with its wings applied (D1). The base's own 161 points carry the take at
 * their stations (a point the wings never reach is returned as the SAME object, so everything
 * nose-ward of the steps stays bit-identical), plus exact samples through each step — every
 * corner point, a hair either side of it so a square step draws vertical, and the 0.02" grid from
 * the inner corner to the step's start — sorted by station. The area and the two 12" widths are
 * worked out again with today's rules; the knots, handles, spans and everything else are the
 * base's, unchanged.
 */
export function applyWings(base: OutlineGeometry, wings: readonly Wing[]): OutlineGeometry {
  const placed = placedWings(wings, base);
  if (placed.length === 0) return base;
  const prepared = prepare(placed);
  const length = base.length;

  const points: OutlinePoint[] = base.points.map((p) => {
    const take = takeAt(base, prepared, p.station);
    if (take === 0) return p;
    return { station: p.station, halfWidth: mm(clamp(p.halfWidth - take, 0, base.halfWidePointWidth)) };
  });

  const baseStations = new Set<number>(base.points.map((p) => p.station));
  const extra = new Set<number>();
  const addStation = (s: number) => {
    if (s < 0 || s > length || baseStations.has(s)) return;
    extra.add(s);
  };
  for (const p of prepared) {
    for (const pt of p.shape.points) {
      addStation(pt.station);
      addStation(pt.station - HAIR_MM);
      addStation(pt.station + HAIR_MM);
    }
    const from = p.inner;
    const to = p.shape.points[0].station;
    for (let k = 0; from + k * STEP_GRID_MM <= to; k++) addStation(from + k * STEP_GRID_MM);
  }
  for (const s of extra) {
    points.push({ station: mm(s), halfWidth: mm(wingedFromPrepared(base, prepared, s)) });
  }
  points.sort((a, b) => a.station - b.station);

  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += ((points[i].halfWidth + points[i + 1].halfWidth) / 2) * (points[i + 1].station - points[i].station);
  }
  area *= 2;

  const measure = inchesToMm(12);
  return {
    ...base,
    points,
    area,
    tailWidthAt12in: mm(2 * interpolateHalfWidth(points, Math.min(measure, length))),
    noseWidthAt12in: mm(2 * interpolateHalfWidth(points, Math.max(0, length - measure))),
  };
}

export interface WingReadout {
  station: Mm;
  stepStart: Mm;
  inner: Mm;
  depth: Mm;
  /** FULL width just nose-ward of where the step leaves the curve. */
  widthAhead: Mm;
  /** FULL width just tail-ward of the step's inner corner. */
  widthBehind: Mm;
}

/** The numbers each wing's callouts read (the sketch's `wingReadouts`): the widths a hair either
 * side of the step, with every wing on the board applied. */
export function wingReadouts(g: OutlineGeometry, wings: readonly Wing[]): WingReadout[] {
  const prepared = prepare(wings);
  return wings.map((w) => {
    const f = wingFootprint(w);
    return {
      station: w.station,
      stepStart: f.stepStart,
      inner: f.inner,
      depth: w.depth,
      widthAhead: mm(2 * wingedFromPrepared(g, prepared, f.stepStart + HAIR_MM)),
      widthBehind: mm(2 * wingedFromPrepared(g, prepared, f.inner - HAIR_MM)),
    };
  });
}

/** The 1/16" or 1 mm grid a wing number moves on. */
function gridMm(system: UnitsSystem): number {
  return system === "metric" ? WING_STEP_MM : inchesToMm(WING_STEP_IN);
}

/**
 * The corner-radius slider's top (P8): the largest radius that fits, floored onto the system's
 * grid, never below one step (so a slider always has somewhere to go).
 */
export function wingRadiusTop(w: Pick<Wing, "run" | "depth">, system: UnitsSystem): Mm {
  const grid = gridMm(system);
  const steps = Math.floor(maxWingRadius(w) / grid + 1e-9);
  return mm(Math.max(1, steps) * grid);
}

/** A station floored onto the system's grid (1/16" or a whole millimetre), with `wingRadiusTop`'s
 * nudge, so a by-hand default never lands a hair past a limit. */
function floorToGrid(station: number, system: UnitsSystem): number {
  const grid = gridMm(system);
  return Math.floor(station / grid + 1e-9) * grid;
}

/**
 * The wing "+ Add a wing" adds (D5, quick 261015-hz7). The first sits at the front fins' trailing
 * edge, locked, offset 0 — or at 11" placed by hand on a fin setup with no front fins — inside 2" …
 * the top; 3/16" deep, a 1/4" run, sharp corners. The second sits BEHIND it (D2): on a quad, locked
 * to the rear fins' trailing edge, offset 0, then held by the order rule; otherwise by hand at wing 1
 * less the larger of the gap and 3", floored onto the grid and never under 2"; 3/16" deep, a 1/2"
 * run, its corners rounded as far as they fit. Neither trips the fin-box warning (3/16" is not
 * deeper than 3/16").
 */
export function nextWing(
  wings: readonly Wing[],
  edges: WingFinEdges,
  g: WingPlacementGeometry,
  system: UnitsSystem,
): Wing {
  const lo = inchesToMm(WING_POSITION_MIN_IN);
  const top = wingPositionTop(g);
  const depth = inchesToMm(WING_DEFAULT_DEPTH_IN);
  if (wings.length === 0) {
    return {
      station: mm(clamp(edges.front ?? inchesToMm(11), lo, top)),
      depth,
      run: inchesToMm(1 / 4),
      radius: mm(0),
      lock: edges.front !== null ? "front-trailing" : null,
      finOffset: mm(0),
    };
  }
  const first = wings[0];
  const gap = wingOrderGap(first);
  const firstStation = clamp(first.station, lo, top);
  const limit = Math.max(lo, firstStation - gap);
  const shape = { depth, run: inchesToMm(1 / 2) };
  const radius = wingRadiusTop(shape, system);
  if (edges.rear !== null) {
    return {
      station: mm(Math.min(limit, clamp(edges.rear, lo, top))),
      ...shape,
      radius,
      lock: "rear-trailing",
      finOffset: mm(0),
    };
  }
  const byHand = floorToGrid(firstStation - Math.max(gap, inchesToMm(WING_SECOND_BY_HAND_IN)), system);
  return {
    station: mm(clamp(byHand, lo, limit)),
    ...shape,
    radius,
    lock: null,
    finOffset: mm(0),
  };
}

/** The outline with no wings — the curve the shaper drew — for the close-up's dashed line. The
 * same object when it never had a `wings` key. */
export function outlineWithoutWings(outline: OutlineSpec): OutlineSpec {
  if (!("wings" in outline)) return outline;
  const copy = { ...outline };
  delete copy.wings;
  return copy;
}
