/**
 * The shaping bay as plain numbers (Phase 16, D-43, D-44): the room the 3D board lies in, its racks, how the board
 * rests on them for any turn, and where the viewer may stand.
 *
 * The board's turn stays one quaternion (`view-3d.ts`, D-13). A shaper thinks of it in three planes, so `rackTurn` and
 * `rackAngles` are exact inverses between that turn and three angles, and every control in the panel writes through
 * them: Swing about the vertical, the Raise controls' lift, and Rotate on Side about the board's own line.
 *
 * Room axes as `view-3d.ts` has them: X along the room with the tail end at +X, Y up off the floor, Z across, the
 * floor at Y = 0 and the room's middle at X = Z = 0. Everything is in millimetres and degrees. Every figure here is a
 * view of the board: none of them ever reaches the litres, the files or a saved board (D-16, D-17).
 *
 * Pure (CLAUDE.md Rule 1): no React, browser or `three` import.
 */

import type { Vec3 } from "./board-surface";
import { measureSlider, type MeasureSliderView } from "./measure-display";
import { mm, mmToInches, type Mm, type UnitsSystem } from "./units";
import {
  BOARD_TO_ROOM,
  GLIDE_MAX_SPEED,
  GLIDE_MS,
  KEY_TURN_DEG,
  quatFromAxisAngle,
  quatMultiply,
  quatNormalize,
  ROOM_CAMERA,
  rotateVec,
  viewerAxes,
  type Quat,
  type ViewerAxes,
  type ViewName,
} from "./view-3d";

const RAD = Math.PI / 180;

/** The room and what stands in it: one size for every board, so a 6'2" reads shorter than a 9'0". */
export const BAY = {
  lengthMm: 6400,
  widthMm: 4000,
  heightMm: 2700,
  /** The shelf: its top off the floor, how far it stands out from the wall, and its thickness. */
  benchTopMm: 960,
  benchDepthMm: 200,
  benchThickMm: 30,
  /** The strip hangs under the shelf's front edge (the founder: "the side lights should be UNDER the shelfs"). */
  stripHeightMm: 900,
  stripInsetMm: 170,
  stripFaceMm: 40,
  stripEndInsetMm: 150,
  /** The sill below the strip, which catches its light as the long bright band in his photo. */
  sillTopMm: 840,
  sillDepthMm: 330,
  sillThickMm: 30,
  /** The racks: pad tops off the floor, and each rack's distance from the board's middle as a share of its length. */
  rackTopMm: 740,
  rackShare: 0.18,
  padHalfDepthMm: 40,
  padHalfSpanMm: 220,
  /** How close the foam may come to the floor. */
  floorClearMm: 40,
  /** How close the viewer's eye may come to a wall, and to the floor. */
  viewerMarginMm: 200,
  viewerFloorMm: 300,
  /** The nearest the viewer stands at 1x, the share of the window the views stay inside, and how low the board sits. */
  nearestMm: 2450,
  fit: 0.95,
  aim: 0.12,
  /** How far either end can be raised: the board never stands on end. */
  liftLimitDeg: 60,
} as const;

/** The room's own colours, the same in every theme (D-43); the fins' too (the founder at 16-10: "Keep them dark"). */
export const BAY_PAINT = {
  wall: "#0a2f66",
  floor: "#62636f",
  ceiling: "#04142e",
  bench: "#c6c5c2",
  strip: "#ffffff",
  rack: "#4a4f5a",
  pad: "#8b8f98",
  fin: "#2b3442",
  hemisphereSky: "#8f949c",
  hemisphereGround: "#d8d6d2",
} as const;

/**
 * One way of lighting the bay. `strip` is each strip's strength on the board; `fill` and `fillColour` stand for the
 * light coming back off the room; `bounce` for the floor's; the rest are the room's own paint: its base and how much
 * of the strip it catches, for the walls, the floor and the sill.
 */
export interface BayTreatment {
  strip: number;
  fill: number;
  fillColour: string;
  bounce: number;
  wallBase: number;
  wallGlow: number;
  floorBase: number;
  floorGlow: number;
  sillBase: number;
  sillGlow: number;
  floor: string;
}

/**
 * A is the one in force. The founder (D-44): "Shadows should be more grey than blue. Bright light should show very
 * white." So the strips are pure white and the fill and bounce neutral: the walls stay blue, the foam does not take it.
 */
export const BAY_TREATMENTS: Record<"A" | "B" | "C", BayTreatment> = {
  A: {
    strip: 34,
    fill: 0.8,
    fillColour: "#d9dbdf",
    bounce: 0.08,
    wallBase: 0.72,
    wallGlow: 2.6,
    floorBase: 0.66,
    floorGlow: 2.4,
    sillBase: 0.5,
    sillGlow: 7,
    floor: BAY_PAINT.floor,
  },
  B: {
    strip: 24,
    fill: 1.5,
    fillColour: "#e4e5e8",
    bounce: 0.1,
    wallBase: 0.72,
    wallGlow: 2.6,
    floorBase: 0.66,
    floorGlow: 2.4,
    sillBase: 0.5,
    sillGlow: 7,
    floor: "#7f7f82",
  },
  C: {
    strip: 24,
    fill: 0.7,
    fillColour: "#d9dbdf",
    bounce: 0.04,
    wallBase: 0.55,
    wallGlow: 2.6,
    floorBase: 0.5,
    floorGlow: 2.4,
    sillBase: 0.4,
    sillGlow: 7,
    floor: BAY_PAINT.floor,
  },
};

/** The two strips' ends in the room, each a pair: the side of the room at −Z first. */
export function stripEnds(): [[Vec3, Vec3], [Vec3, Vec3]] {
  const x = BAY.lengthMm / 2 - BAY.stripEndInsetMm;
  const z = BAY.widthMm / 2 - BAY.stripInsetMm;
  const y = BAY.stripHeightMm;
  return [
    [
      [-x, y, -z],
      [x, y, -z],
    ],
    [
      [-x, y, z],
      [x, y, z],
    ],
  ];
}

/**
 * The board's lie in three planes, in degrees. `swing`: + the nose to the right, seen from the tail. `lift`: + the nose
 * up, − the tail up. `roll`: + the deck tipping to the right, seen from the tail.
 */
export interface RackAngles {
  swing: number;
  lift: number;
  roll: number;
}

/** Flat on the racks, deck up, straight down the room. */
export const AT_REST: RackAngles = { swing: 0, lift: 0, roll: 0 };

/** Flat on the racks, bottom up. */
export const BOTTOM_UP: RackAngles = { swing: 0, lift: 0, roll: 180 };

/** The turn for three angles: the roll first, about the board's own line, then the lift, then the swing. */
export function rackTurn(a: RackAngles): Quat {
  const swing = quatFromAxisAngle([0, 1, 0], -a.swing * RAD);
  const lift = quatFromAxisAngle([0, 0, 1], -a.lift * RAD);
  const roll = quatFromAxisAngle([1, 0, 0], -a.roll * RAD);
  return quatNormalize(quatMultiply(swing, quatMultiply(lift, roll)));
}

/**
 * The three angles of a turn, the exact inverse of `rackTurn` while the lift stays short of ±90°: lift within ±90°,
 * the other two within (−180°, 180°].
 */
export function rackAngles(turn: Quat): RackAngles {
  const x = rotateVec(turn, [1, 0, 0]);
  const y = rotateVec(turn, [0, 1, 0]);
  const z = rotateVec(turn, [0, 0, 1]);
  return {
    swing: -Math.atan2(-x[2], x[0]) / RAD + 0,
    lift: -Math.asin(Math.max(-1, Math.min(1, x[1]))) / RAD + 0,
    roll: -Math.atan2(-z[1], y[1]) / RAD + 0,
  };
}

/** An angle wrapped into (−180°, 180°]. */
function wrap(deg: number): number {
  const w = ((deg % 360) + 360) % 360;
  return w > 180 ? w - 360 : w;
}

/** The three angles as the panel shows them: with the board flipped, the roll is read from bottom up (D-43). */
export function shownAngles(turn: Quat, flipped: boolean): RackAngles {
  const a = rackAngles(turn);
  return flipped ? { ...a, roll: wrap(a.roll - 180) } : a;
}

/** The whole roll to write for the roll the panel shows. */
export function totalRoll(shown: number, flipped: boolean): number {
  return flipped ? wrap(shown + 180) : shown;
}

/** Whether a whole roll has the board bottom up. */
export function isBottomUp(roll: number): boolean {
  return Math.abs(wrap(roll)) > 90;
}

/**
 * Keeps a turn within the lift the racks allow: unchanged inside the limit; past it, the same swing and roll at the
 * limit. On every hand path, because `rackAngles` breaks down at ±90° and the sliders would jump.
 */
export function clampLift(turn: Quat): Quat {
  const a = rackAngles(turn);
  if (Math.abs(a.lift) <= BAY.liftLimitDeg) return turn;
  return rackTurn({ ...a, lift: Math.sign(a.lift) * BAY.liftLimitDeg });
}

/** `k` of the way from `a` to `b`, the short way round for the swing and the roll. */
export function anglesBetween(a: RackAngles, b: RackAngles, k: number): RackAngles {
  return {
    swing: a.swing + wrap(b.swing - a.swing) * k,
    lift: a.lift + (b.lift - a.lift) * k,
    roll: a.roll + wrap(b.roll - a.roll) * k,
  };
}

/** How the board sits over its racks. */
export interface RackSeat {
  /** How far each rack stands from the board's middle. */
  at: number;
  length: number;
  /** The board's points over a pad, in the board's axes, relative to its turning centre. */
  band: Vec3[];
  /** How far the board's centre stands above the pad tops at rest. */
  home: number;
}

/** How far the board's centre stands above the pad tops rolled by `rollDeg`: it rests on its lowest point over a pad. */
export function overPad(seat: Pick<RackSeat, "band">, rollDeg: number): number {
  const c = Math.cos(rollDeg * RAD);
  const s = Math.sin(rollDeg * RAD);
  let need = -Infinity;
  for (const p of seat.band) {
    if (Math.abs(p[1] * c - p[2] * s) <= BAY.padHalfSpanMm) need = Math.max(need, -(p[2] * c + p[1] * s));
  }
  return Number.isFinite(need) ? need : 0;
}

/** The sampled points are coarser than a pad is deep, so the band reaches this far either side of it. */
const BAND_REACH_MM = 45;

/** The seat of a board on its racks, from its points relative to its turning centre (`framePointsOf`). */
export function rackSeat(points: readonly Vec3[]): RackSeat {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    if (p[0] < lo) lo = p[0];
    if (p[0] > hi) hi = p[0];
  }
  const length = points.length > 0 ? hi - lo : 0;
  const at = BAY.rackShare * length;
  const band = points.filter((p) => Math.abs(Math.abs(p[0]) - at) <= BAY.padHalfDepthMm + BAND_REACH_MM);
  const seat = { at, length, band, home: 0 };
  return { ...seat, home: overPad(seat, 0) };
}

/**
 * The board's centre in the room for three angles. Rolled, it rests on its lowest point over the pads. Raised, it tips
 * over the outer top edge of the far rack's pad, so the far end stays on its rack and no pad enters the foam: nose up
 * over the tail-side rack, which stands at room +X, tail up over the nose-side rack. The foam never comes nearer the
 * floor than `floorClearMm`, and the racks swing with the board about the room's middle.
 */
export function boardPlace(points: readonly Vec3[], angles: RackAngles, seat: RackSeat): Vec3 {
  const h = overPad(seat, angles.roll);
  const a = Math.abs(angles.lift) * RAD;
  const sign = angles.lift < 0 ? -1 : 1;
  const reach = seat.at + BAY.padHalfDepthMm;
  const x = sign * (reach - reach * Math.cos(a) + h * Math.sin(a));
  let y = BAY.rackTopMm + reach * Math.sin(a) + h * Math.cos(a);
  const q = quatMultiply(rackTurn(angles), BOARD_TO_ROOM);
  let lowest = Infinity;
  for (const p of points) {
    const up = rotateVec(q, p)[1];
    if (up < lowest) lowest = up;
  }
  if (Number.isFinite(lowest)) y += Math.max(0, BAY.floorClearMm - (y + lowest));
  const s = angles.swing * RAD;
  return [x * Math.cos(s), y, x * Math.sin(s)];
}

/** Where the board's centre stands with no racks: at its home, so turning the room off moves nothing. */
export function freePlace(seat: RackSeat): Vec3 {
  return [0, BAY.rackTopMm + seat.home, 0];
}

/** The soft dark patch under the board: the room's middle-of-floor place for it, its half-sizes and its heading. */
export function floorPatch(
  place: Vec3,
  angles: RackAngles,
  seat: Pick<RackSeat, "length">,
): { centre: [number, number]; size: [number, number]; axis: [number, number] } {
  const s = angles.swing * RAD;
  const along = 0.62 * seat.length * Math.cos(angles.lift * RAD);
  return { centre: [place[0], place[2]], size: [Math.max(1, along), PATCH_HALF_SPAN_MM], axis: [Math.cos(s), Math.sin(s)] };
}

/** How far the dark patch reaches either side of the board's line. */
const PATCH_HALF_SPAN_MM = 420;

// ---------------------------------------------------------------------------------------------------------------
// Raising an end (the founder, D-44): "Raise the nose control controlls how high off the rack to raise the nose (tail
// side pivots on rack)." The height is measured where the board sat on that end's rack, so at rest it reads nothing.
// ---------------------------------------------------------------------------------------------------------------

/** From the pivot to the raised end's rack, along the board. */
export function raiseArmMm(seat: Pick<RackSeat, "at">): number {
  return 2 * seat.at + BAY.padHalfDepthMm;
}

/** How high an end stands off its rack at `liftDeg` (either sign). */
export function raiseOfLift(liftDeg: number, seat: Pick<RackSeat, "at">): Mm {
  return mm(raiseArmMm(seat) * Math.sin(Math.abs(liftDeg) * RAD));
}

/** The lift, unsigned, that raises an end `heightMm` off its rack, stopping at the limit. */
export function liftOfRaise(heightMm: number, seat: Pick<RackSeat, "at">): number {
  const arm = raiseArmMm(seat);
  if (!(arm > 0) || !(heightMm > 0)) return 0;
  return Math.min(BAY.liftLimitDeg, Math.asin(Math.min(1, heightMm / arm)) / RAD);
}

/** A raise slider's steps: 1/4", and 5 mm in Metric. */
const RAISE_STEP_IN = 0.25;
const RAISE_STEP_MM = 5;

/** The slider for how high an end stands off its rack (a dim, D-44): from on the rack up to the 60° limit. */
export function raiseSlider(value: Mm, seat: Pick<RackSeat, "at">, system: UnitsSystem): MeasureSliderView {
  const maxIn = mmToInches(raiseOfLift(BAY.liftLimitDeg, seat));
  const range = { min: 0, max: Math.floor(maxIn / RAISE_STEP_IN) * RAISE_STEP_IN };
  return measureSlider(value, range, RAISE_STEP_IN, RAISE_STEP_MM, system);
}

// ---------------------------------------------------------------------------------------------------------------
// Where the viewer stands.
// ---------------------------------------------------------------------------------------------------------------

/**
 * Where the viewer stands: round the room from the tail end, above the board, and how far Sight Along has shifted the
 * eye off that line, + to the viewer's right. Sight Along moves the eye round the board and nothing else.
 */
export interface Viewer {
  azimuthDeg: number;
  elevationDeg: number;
  sightDeg: number;
}

/** The first view. */
export const REST_VIEWER: Viewer = {
  azimuthDeg: ROOM_CAMERA.azimuthDeg,
  elevationDeg: ROOM_CAMERA.elevationDeg,
  sightDeg: 0,
};

/** How far Sight Along shifts the eye either way: past the widest rail's own line from anywhere the viewer stands. */
export const SIGHT_LIMIT_DEG = 15;
/** Sight Along's step: about 13 mm of eye at the end of the room, finer than a rail's line needs. */
export const SIGHT_STEP_DEG = 0.25;

const OVERHEAD_DEG = 89.9;

/** Each view's place at no swing: Deck and Bottom straight overhead with the nose left, the rest at rail height. */
export const WALK_VIEWS: Readonly<Record<ViewName, Viewer>> = {
  deck: { azimuthDeg: 90, elevationDeg: OVERHEAD_DEG, sightDeg: 0 },
  bottom: { azimuthDeg: 90, elevationDeg: OVERHEAD_DEG, sightDeg: 0 },
  side: { azimuthDeg: 90, elevationDeg: 0, sightDeg: 0 },
  nose: { azimuthDeg: 180, elevationDeg: 0, sightDeg: 0 },
  tail: { azimuthDeg: 0, elevationDeg: 0, sightDeg: 0 },
};

/** Where a view stands with the board swung: Side, Nose and Tail go where the board's rail and ends are now. */
export function standAt(name: ViewName, swingDeg: number): Viewer {
  const view = WALK_VIEWS[name];
  if (name === "deck" || name === "bottom") return view;
  return { ...view, azimuthDeg: wrap(view.azimuthDeg + swingDeg) };
}

/** The viewer's own axes. */
export function viewerLook(viewer: Viewer): ViewerAxes {
  return viewerAxes(viewer.azimuthDeg - viewer.sightDeg, viewer.elevationDeg);
}

/** From the pivot, how far the viewer can stand this way before the nearer wall, each brought in by the margin. */
export function wallReach(azimuthDeg: number, elevationDeg: number): number {
  const a = azimuthDeg * RAD;
  const e = elevationDeg * RAD;
  const dx = Math.abs(Math.cos(e) * Math.cos(a));
  const dz = Math.abs(Math.cos(e) * Math.sin(a));
  const x = dx > 1e-9 ? (BAY.lengthMm / 2 - BAY.viewerMarginMm) / dx : Infinity;
  const z = dz > 1e-9 ? (BAY.widthMm / 2 - BAY.viewerMarginMm) / dz : Infinity;
  return Math.min(x, z);
}

/**
 * The share of the half-picture the board sits low: `BAY.aim` at the first view, nothing straight on and straight
 * down, so a view from rail height or from overhead is centred.
 */
export function aimAt(elevationDeg: number): number {
  const rest = ROOM_CAMERA.elevationDeg;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return BAY.aim * clamp(elevationDeg / rest) * clamp((90 - elevationDeg) / (90 - rest));
}

/** What the viewer's place comes from: the stand-off and lens `bayLens` worked out for a window. */
export interface BayLens {
  distanceMm: number;
  lensDeg: number;
}

/** The point the viewer looks at: the board's home. */
function pivotOf(seat: RackSeat): Vec3 {
  return [0, BAY.rackTopMm + seat.home, 0];
}

/** The eye `rho` from the pivot along a viewer's line, shifted up by the aim, wall or no wall. */
function eyeAt(viewer: Viewer, rho: number, lensDeg: number, seat: RackSeat): Vec3 {
  const axes = viewerLook(viewer);
  const shift = aimAt(viewer.elevationDeg) * Math.tan((lensDeg * RAD) / 2) * rho;
  const pivot = pivotOf(seat);
  return [
    pivot[0] - axes.forward[0] * rho + axes.up[0] * shift,
    pivot[1] - axes.forward[1] * rho + axes.up[1] * shift,
    pivot[2] - axes.forward[2] * rho + axes.up[2] * shift,
  ];
}

/** The eye's place and axes for a viewer, inside the room. */
export function viewerPlace(viewer: Viewer, lens: BayLens, seat: RackSeat): { position: Vec3; axes: ViewerAxes; lensDeg: number } {
  const rho = Math.min(lens.distanceMm, wallReach(viewer.azimuthDeg - viewer.sightDeg, viewer.elevationDeg));
  return { position: eyeAt(viewer, rho, lens.lensDeg, seat), axes: viewerLook(viewer), lensDeg: lens.lensDeg };
}

/** A point's place on the picture: right and up in −1…1 of the window, and how far ahead of the eye it is. */
function project(p: Vec3, eye: Vec3, axes: ViewerAxes, tanV: number, aspect: number): [number, number, number] {
  const rx = p[0] - eye[0];
  const ry = p[1] - eye[1];
  const rz = p[2] - eye[2];
  const depth = rx * axes.forward[0] + ry * axes.forward[1] + rz * axes.forward[2];
  const x = (rx * axes.right[0] + ry * axes.right[1] + rz * axes.right[2]) / (depth * tanV * aspect);
  const y = (rx * axes.up[0] + ry * axes.up[1] + rz * axes.up[2]) / (depth * tanV);
  return [x, y, depth];
}

/** The most `bayLens` reads of a board: the fit only needs its shape, and it runs on a new board or a new size. */
const LENS_SAMPLE = 300;

function sampleOf(points: readonly Vec3[]): Vec3[] {
  const stride = Math.max(1, Math.ceil(points.length / LENS_SAMPLE));
  return points.filter((_, i) => i % stride === 0);
}

/** A pose of the board in the room: its points turned and placed. */
function posed(points: readonly Vec3[], all: readonly Vec3[], angles: RackAngles, seat: RackSeat): Vec3[] {
  const q = quatMultiply(rackTurn(angles), BOARD_TO_ROOM);
  const place = boardPlace(all, angles, seat);
  return points.map((p) => {
    const r = rotateVec(q, p);
    return [r[0] + place[0], r[1] + place[1], r[2] + place[2]];
  });
}

/** The poses the first view must show whole: deck up, bottom up and each end raised 45°. */
const FIT_POSES: readonly RackAngles[] = [AT_REST, BOTTOM_UP, { ...AT_REST, lift: 45 }, { ...AT_REST, lift: -45 }];

/**
 * Where the viewer stands at 1x for a window: as near as `nearestMm`, or the nearest spot where the first view shows
 * every fit pose inside `BAY.fit` of the window, never past the wall; only if the room is too small does the lens
 * widen. Bounded work: a 300-point sample and 48 rounds at most.
 */
export function bayLens(points: readonly Vec3[], seat: RackSeat, aspect: number): BayLens {
  const base: number = ROOM_CAMERA.fovDeg;
  if (points.length === 0 || !(aspect > 0)) return { distanceMm: BAY.nearestMm, lensDeg: base };
  const sample = sampleOf(points);
  const poses = FIT_POSES.map((angles) => posed(sample, sample, angles, seat));
  const axes = viewerLook(REST_VIEWER);
  const fits = (rho: number, lensDeg: number) => {
    const eye = eyeAt(REST_VIEWER, rho, lensDeg, seat);
    const tanV = Math.tan((lensDeg * RAD) / 2);
    return poses.every((pose) =>
      pose.every((p) => {
        const [x, y, depth] = project(p, eye, axes, tanV, aspect);
        return depth >= 50 && Math.abs(x) <= BAY.fit && Math.abs(y) <= BAY.fit;
      }),
    );
  };
  let lo = 500;
  let hi = 14000;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (fits(mid, base)) hi = mid;
    else lo = mid;
  }
  const wall = wallReach(REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg);
  const distanceMm = Math.min(wall, Math.max(hi, BAY.nearestMm));
  if (fits(distanceMm, base)) return { distanceMm, lensDeg: base };
  let a = base;
  let c = 120;
  for (let k = 0; k < 24; k++) {
    const mid = (a + c) / 2;
    if (fits(distanceMm, mid)) c = mid;
    else a = mid;
  }
  return { distanceMm, lensDeg: c };
}

/**
 * Holds a viewer in the room: above the floor by `viewerFloorMm` at the stand-off, up to straight overhead, the azimuth
 * wrapped, Sight Along within its limit. There is no lid overhead to stop at.
 */
export function clampViewer(viewer: Viewer, seat: RackSeat, lens: BayLens): Viewer {
  const pivot = pivotOf(seat)[1];
  const lowest = -Math.asin(Math.max(0, Math.min(1, (pivot - BAY.viewerFloorMm) / lens.distanceMm))) / RAD;
  return {
    azimuthDeg: wrap(viewer.azimuthDeg),
    elevationDeg: Math.min(OVERHEAD_DEG, Math.max(lowest, viewer.elevationDeg)),
    sightDeg: Math.min(SIGHT_LIMIT_DEG, Math.max(-SIGHT_LIMIT_DEG, viewer.sightDeg)),
  };
}

/** Walk Around: a drag of the canvas's shorter side is half a turn round the board, the room swinging under the hand. */
export function walkDrag(viewer: Viewer, dx: number, dy: number, shortSide: number): Viewer {
  if (!(shortSide > 0)) return viewer;
  return {
    ...viewer,
    azimuthDeg: viewer.azimuthDeg + (180 * dx) / shortSide,
    elevationDeg: viewer.elevationDeg + (180 * dy) / shortSide,
  };
}

/** Walk Around: one arrow key, as far as a key turns the board. */
export function walkKey(viewer: Viewer, key: "left" | "right" | "up" | "down"): Viewer {
  const [da, de] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[key];
  return {
    ...viewer,
    azimuthDeg: viewer.azimuthDeg + da * KEY_TURN_DEG,
    elevationDeg: viewer.elevationDeg + de * KEY_TURN_DEG,
  };
}

/** `k` of the way from `a` to `b`, the short way round. */
export function walkBetween(a: Viewer, b: Viewer, k: number): Viewer {
  return {
    azimuthDeg: a.azimuthDeg + wrap(b.azimuthDeg - a.azimuthDeg) * k,
    elevationDeg: a.elevationDeg + (b.elevationDeg - a.elevationDeg) * k,
    sightDeg: a.sightDeg + (b.sightDeg - a.sightDeg) * k,
  };
}

/**
 * How much further a let-go walk has gone `elapsedMs` after release, from its speed then (degrees a millisecond): the
 * glide's own curve (`glideAt`), slowing to rest at `GLIDE_MS`.
 */
export function walkGlideAt(
  velocity: { azimuthDeg: number; elevationDeg: number },
  elapsedMs: number,
): { azimuthDeg: number; elevationDeg: number; done: boolean } {
  const limit = GLIDE_MAX_SPEED / RAD;
  const speed = Math.hypot(velocity.azimuthDeg, velocity.elevationDeg);
  if (!(speed > 0) || !Number.isFinite(speed)) return { azimuthDeg: 0, elevationDeg: 0, done: true };
  const scale = Math.min(1, limit / speed);
  const t = Math.min(1, Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs / GLIDE_MS : 1));
  const travel = (scale * GLIDE_MS * (1 - (1 - t) ** 3)) / 3;
  return {
    azimuthDeg: velocity.azimuthDeg * travel,
    elevationDeg: velocity.elevationDeg * travel,
    done: !(elapsedMs < GLIDE_MS),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Sighting and framing.
// ---------------------------------------------------------------------------------------------------------------

/**
 * The Sight Along shift that stands the eye square on a rail's own line, from where the viewer stands along the board:
 * `halfWidthMm` out from the stringer and parallel to it, so the rail's widest point lies on the line of sight and the
 * outline peels away from that line toward both tips.
 */
export function railSightDeg(halfWidthMm: number, viewer: Viewer, lens: BayLens): number {
  const rho = Math.min(lens.distanceMm, wallReach(viewer.azimuthDeg, viewer.elevationDeg));
  return Math.asin(Math.min(1, halfWidthMm / rho)) / RAD;
}

/**
 * How much of the window Nose and Tail show the board at (the founder: "Zoom in but not quite as far as currently
 * set"). His eye at the look decides; this is the one figure to change.
 */
export const END_VIEW_FILL = 0.6;

/** The crop that shows the board at `fill` of the window: the zoom it asks for, and the crop's centre, as `CropView` has it. */
export function fillCrop(
  points: readonly Vec3[],
  angles: RackAngles,
  viewer: Viewer,
  lens: BayLens,
  seat: RackSeat,
  aspect: number,
  fill: number = END_VIEW_FILL,
): { zoom: number; cx: number; cy: number } {
  if (points.length === 0 || !(aspect > 0)) return { zoom: 1, cx: 0, cy: 0 };
  const { position, axes } = viewerPlace(viewer, lens, seat);
  const tanV = Math.tan((lens.lensDeg * RAD) / 2);
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const p of posed(sampleOf(points), points, angles, seat)) {
    const [x, y, depth] = project(p, position, axes, tanV, aspect);
    if (!(depth > 0)) continue;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  if (!(x1 >= x0)) return { zoom: 1, cx: 0, cy: 0 };
  const share = Math.max((x1 - x0) / 2, (y1 - y0) / 2);
  return { zoom: share > 0 ? fill / share : 1, cx: (x0 + x1) / 4, cy: -(y0 + y1) / 4 };
}

/** An SVG path through dots. */
function pathOf(points: readonly [number, number][], close: boolean): string {
  const body = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return close ? `${body} Z` : body;
}

/** The convex outline of dots, by the monotone chain. */
function convexHull(dots: readonly [number, number][]): [number, number][] {
  const sorted = [...dots].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (from: [number, number][]) => {
    const chain: [number, number][] = [];
    for (const p of from) {
      while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], p) <= 0) chain.pop();
      chain.push(p);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * The first view's loading picture (16-11): the board's convex outline and the deck's stringer line, projected as the
 * lit board will be, in the canvas's own dots, and how far down the outline reaches. `points` and `deck` are relative
 * to the board's turning centre.
 */
export function firstViewOutline(
  points: readonly Vec3[],
  deck: readonly Vec3[],
  lens: BayLens,
  seat: RackSeat,
  width: number,
  height: number,
): { board: string; stringer: string; bottom: number } {
  if (points.length === 0 || !(width > 0) || !(height > 0)) return { board: "", stringer: "", bottom: 0 };
  const { position, axes } = viewerPlace(REST_VIEWER, lens, seat);
  const tanV = Math.tan((lens.lensDeg * RAD) / 2);
  const aspect = width / height;
  const place = boardPlace(points, AT_REST, seat);
  const dot = (p: Vec3): [number, number] => {
    const r = rotateVec(BOARD_TO_ROOM, p);
    const [x, y] = project([r[0] + place[0], r[1] + place[1], r[2] + place[2]], position, axes, tanV, aspect);
    return [((x + 1) * width) / 2, ((1 - y) * height) / 2];
  };
  const hull = convexHull(points.map(dot));
  return {
    board: pathOf(hull, true),
    stringer: pathOf(deck.map(dot), false),
    bottom: hull.reduce((low, p) => Math.max(low, p[1]), 0),
  };
}
