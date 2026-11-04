/**
 * The 3D screen's turns and framing as plain numbers (Phase 16, UI-SPEC §3 and §14). The board turns under a
 * fixed camera and fixed lights (D-10): dragging, a preset view or Reset View changes only the board's own turn,
 * held here as a quaternion, and the camera and the lights never move — so the highlights move across the foam
 * instead of riding along with it.
 *
 * Three sets of axes, all right-handed, all millimetres:
 * - **The board's** (the surface's, `board-surface.ts`): x along the board from the tail toward the nose, y
 *   across (the rails at ±y), z up toward the deck.
 * - **The room's**: X to the shaper's right, Y up, Z toward the shaper. The camera stands on the room's +Z side,
 *   `ROOM_CAMERA.elevationDeg` above the floor, looking at the board.
 * - **The camera's**: right, up and forward (into the picture), worked out once from the elevation.
 *
 * `BOARD_TO_ROOM` lays the board in the room at rest — nose to the left (room −X), deck up (room +Y), the near
 * rail (board +y) toward the camera (room +Z) — and a turn is applied in the room after it, so the board's full
 * orientation is `turn × BOARD_TO_ROOM`. `REST_TURN` is no turn at all: the first view (UI-SPEC §3), the side
 * view with the deck turned 50° toward the shaper.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser or `three` import.
 */

import type { Vec3 } from "./board-surface";

/** A rotation as a unit quaternion, (x, y, z, w). */
export type Quat = readonly [number, number, number, number];

/** The Hamilton product a·b: the turn b first, then a. */
export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/** The quaternion scaled to unit length (the identity for a zero quaternion). */
export function quatNormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!(l > 0) || !Number.isFinite(l)) return [0, 0, 0, 1];
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** A turn of `radians` about `axis` (any length but zero), right-handed. */
export function quatFromAxisAngle(axis: Vec3, radians: number): Quat {
  const l = Math.hypot(axis[0], axis[1], axis[2]);
  if (!(l > 0)) return [0, 0, 0, 1];
  const s = Math.sin(radians / 2) / l;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(radians / 2)];
}

/** The vector v turned by the unit quaternion q. */
export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // t = 2 (q.xyz × v); v' = v + w t + q.xyz × t
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

/**
 * The board laid in the room at rest: board +x (toward the nose) → room −X (nose left), board +z (the deck) →
 * room +Y (up), board +y (the near rail) → room +Z (toward the camera). Half a turn about (0, 1, 1)/√2.
 */
export const BOARD_TO_ROOM: Quat = [0, Math.SQRT1_2, Math.SQRT1_2, 0];

/** No turn: the first view (UI-SPEC §3) — flat, deck up, nose left. */
export const REST_TURN: Quat = [0, 0, 0, 1];

/** The room's one camera (UI-SPEC §3): 50° above the floor, a 30° field of view top to bottom. It never moves. */
export const ROOM_CAMERA = { elevationDeg: 50, fovDeg: 30 } as const;

/** How much of the canvas's tighter direction the board fills at 1x (UI-SPEC §3). */
export const FRAME_FILL = 0.85;

/**
 * The camera's three axes in the room: `forward` into the picture (down and away from the shaper at the
 * camera's elevation), `up` the picture's up, `right` the picture's right (room +X).
 */
export function roomCameraAxes(): { right: Vec3; up: Vec3; forward: Vec3 } {
  const e = (ROOM_CAMERA.elevationDeg * Math.PI) / 180;
  return {
    right: [1, 0, 0],
    up: [0, Math.cos(e), -Math.sin(e)],
    forward: [0, -Math.sin(e), -Math.cos(e)],
  };
}

/** Where the board's turning centre sits relative to the camera, along its axes. */
export interface Frame {
  /** How far in front of the camera, along its view axis. */
  distance: number;
  /** How far to the picture's right of the view axis. */
  right: number;
  /** How far up the picture from the view axis. */
  up: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Where to put the board so that, turned by `turn`, its picture is centred and its box fills `fill` of the
 * canvas in whichever direction is tighter ("1x", UI-SPEC §3). `points` are the board's points relative to its
 * turning centre, in the board's axes; `aspect` is the canvas's width over its height. The camera stays where it
 * is: the answer is the board's place in front of it.
 *
 * Perspective makes this a little non-linear, so it is solved, not guessed: for a given distance each direction
 * is centred by bisection (a point's place on the picture only grows as the board slides that way), and the
 * distance is refined until the tighter direction's half-extent is `fill`.
 */
export function frameAtOne(points: readonly Vec3[], turn: Quat, aspect: number, fill: number = FRAME_FILL): Frame {
  if (points.length === 0 || !(aspect > 0) || !(fill > 0)) return { distance: 1, right: 0, up: 0 };
  const { right, up, forward } = roomCameraAxes();
  const q = quatMultiply(turn, BOARD_TO_ROOM);
  const n = points.length;
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  const c = new Float64Array(n);
  let radius = 0;
  for (let i = 0; i < n; i++) {
    const p = rotateVec(q, points[i]);
    a[i] = dot(p, right);
    b[i] = dot(p, up);
    c[i] = dot(p, forward);
    radius = Math.max(radius, Math.hypot(p[0], p[1], p[2]));
  }
  if (!(radius > 0)) radius = 1;
  const tanV = Math.tan((ROOM_CAMERA.fovDeg * Math.PI) / 360);
  const tanH = tanV * aspect;

  /** For a distance: the offset that centres one direction, and that direction's half-extent on the picture. */
  const centre = (coord: Float64Array, tan: number, distance: number): { offset: number; half: number } => {
    const extent = (offset: number) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < n; i++) {
        const v = (coord[i] + offset) / ((distance + c[i]) * tan);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      return { lo, hi };
    };
    let lo = -2 * radius;
    let hi = 2 * radius;
    for (let k = 0; k < 64; k++) {
      const mid = (lo + hi) / 2;
      const e = extent(mid);
      if (e.lo + e.hi > 0) hi = mid;
      else lo = mid;
    }
    const offset = (lo + hi) / 2;
    const e = extent(offset);
    return { offset, half: (e.hi - e.lo) / 2 };
  };

  // Start where an orthographic picture would put it, then refine: the half-extent goes almost exactly as one
  // over the distance, so scaling the distance by half/fill converges in a few rounds.
  let distance = 4 * radius;
  let result = { distance, right: 0, up: 0 };
  for (let round = 0; round < 40; round++) {
    const x = centre(a, tanH, distance);
    const y = centre(b, tanV, distance);
    result = { distance, right: x.offset, up: y.offset };
    const half = Math.max(x.half, y.half);
    const next = Math.max(distance * (half / fill), radius * 1.0001);
    if (Math.abs(next - distance) <= 1e-9 * distance) break;
    distance = next;
  }
  return result;
}

/**
 * The points the screen frames a surface by, and its turning centre: the middle of the surface's box, and the
 * surface's vertices relative to it — every `stride`-th vertex, so a resize stays quick, plus the six that reach
 * furthest along each axis, so the board's tips and widest points are always among them.
 */
export function framePointsOf(positions: ArrayLike<number>, maxPoints = 6000): { centre: Vec3; points: Vec3[] } {
  const count = Math.floor(positions.length / 3);
  if (count === 0) return { centre: [0, 0, 0], points: [] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const minAt = [0, 0, 0];
  const maxAt = [0, 0, 0];
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) {
      const value = positions[3 * v + k];
      if (value < min[k]) {
        min[k] = value;
        minAt[k] = v;
      }
      if (value > max[k]) {
        max[k] = value;
        maxAt[k] = v;
      }
    }
  }
  const centre: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const stride = Math.max(1, Math.ceil(count / maxPoints));
  const chosen = new Set<number>([...minAt, ...maxAt]);
  for (let v = 0; v < count; v += stride) chosen.add(v);
  const points: Vec3[] = [...chosen]
    .sort((p, q) => p - q)
    .map((v) => [positions[3 * v] - centre[0], positions[3 * v + 1] - centre[1], positions[3 * v + 2] - centre[2]]);
  return { centre, points };
}

// ---------------------------------------------------------------------------------------------------------------
// Turning the board (16-07, UI-SPEC §3 and §5). Every turn below is a turn in the ROOM, applied before the board's
// own lie (`turn × BOARD_TO_ROOM`), and every one returns only the board's new turn: none of them takes, reads or
// returns the camera or a light, so nothing but the board can ever move (D-10).
// ---------------------------------------------------------------------------------------------------------------

/** The camera's axes in the room: the picture's right, its up, and the way back toward the camera. */
export function cameraAxes(): { right: Vec3; up: Vec3; toCamera: Vec3 } {
  const { right, up, forward } = roomCameraAxes();
  return { right, up, toCamera: [-forward[0], -forward[1], -forward[2]] };
}

/** The opposite turn of a unit quaternion. */
export function quatConjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

/** The turn that takes the three axes (1,0,0), (0,1,0), (0,0,1) onto `x`, `y`, `z` (a right-handed unit frame). */
export function quatFromBasis(x: Vec3, y: Vec3, z: Vec3): Quat {
  // The rotation matrix's columns are x, y, z; Shepperd's method divides by the largest of the four terms.
  const [m00, m10, m20] = x;
  const [m01, m11, m21] = y;
  const [m02, m12, m22] = z;
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s];
  }
  return quatNormalize(q);
}

/** The five preset views (D-13), in the panel's order. */
export type ViewName = "deck" | "bottom" | "side" | "nose" | "tail";
export const VIEW_NAMES: readonly ViewName[] = ["deck", "bottom", "side", "nose", "tail"];

const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

/**
 * Where each view puts the board's own three axes (x toward the nose, y the near rail, z the deck) among the
 * camera's (UI-SPEC §3's table): Deck — the deck square to the camera, nose left; Bottom — turned over along its
 * length, nose left; Side — the near rail square on, deck up, nose left; Nose — the nose tip toward the camera, deck
 * up; Tail — the tail toward the camera, deck up. The third axis of each follows from the other two (a right-handed
 * frame), so a view can never mirror the board.
 */
function viewFrame(name: ViewName): [Vec3, Vec3, Vec3] {
  const { right, up, toCamera } = cameraAxes();
  switch (name) {
    case "deck":
      return [neg(right), neg(up), toCamera];
    case "bottom":
      return [neg(right), up, neg(toCamera)];
    case "side":
      return [neg(right), toCamera, up];
    case "nose":
      return [toCamera, right, up];
    case "tail":
      return [neg(toCamera), neg(right), up];
  }
}

/** Each preset view as the board's turn in the room: the turn that, after the board's lie, gives that view. */
export const VIEW_TURNS: Readonly<Record<ViewName, Quat>> = Object.fromEntries(
  VIEW_NAMES.map((name) => {
    const [x, y, z] = viewFrame(name);
    return [name, quatNormalize(quatMultiply(quatFromBasis(x, y, z), quatConjugate(BOARD_TO_ROOM)))];
  }),
) as Record<ViewName, Quat>;

/** How long a view button's turn takes (UI-SPEC §5), eased with the rack's settle curve; instant under reduced motion. */
export const VIEW_TURN_MS = 400;

/** How long a let-go board keeps turning before it comes to rest (D-13). */
export const GLIDE_MS = 600;

/** How far one arrow key turns the board (UI-SPEC §5). */
export const KEY_TURN_DEG = 15;

/**
 * The board after a drag of (dx, dy) screen dots (y down, as a pointer reports it), like a ball under the hand: a
 * sideways drag turns it about the picture's up-down axis, an up-down drag about its left-right axis, any mix about
 * the axis square to the drag — and the length of the canvas's shorter side (`shortSide`) is half a turn. One turn
 * about one axis, so dragging straight back undoes it exactly.
 */
export function dragTurn(turn: Quat, dx: number, dy: number, shortSide: number): Quat {
  const length = Math.hypot(dx, dy);
  if (!(length > 0) || !(shortSide > 0) || !Number.isFinite(length)) return quatNormalize(turn);
  const { right, up } = cameraAxes();
  const axis: Vec3 = [up[0] * dx + right[0] * dy, up[1] * dx + right[1] * dy, up[2] * dx + right[2] * dy];
  return quatNormalize(quatMultiply(quatFromAxisAngle(axis, (Math.PI * length) / shortSide), turn));
}

/** The board after one arrow key: 15° about the picture's up-down axis (← →) or its left-right axis (↑ ↓). */
export function keyTurn(turn: Quat, key: "left" | "right" | "up" | "down"): Quat {
  const { right, up } = cameraAxes();
  const angle = (KEY_TURN_DEG * Math.PI) / 180;
  const step =
    key === "right"
      ? quatFromAxisAngle(up, angle)
      : key === "left"
        ? quatFromAxisAngle(up, -angle)
        : key === "down"
          ? quatFromAxisAngle(right, angle)
          : quatFromAxisAngle(right, -angle);
  return quatNormalize(quatMultiply(step, turn));
}

/**
 * The turn `t` of the way from `a` to `b` (0 to 1) along the shorter way round: a quaternion and its negative are
 * the same turn, so `b` is negated when the two point apart, and the board never swings the long way to a view.
 */
export function slerpShortest(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    [bx, by, bz, bw] = [-bx, -by, -bz, -bw];
    cos = -cos;
  }
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));
  let wa: number;
  let wb: number;
  if (cos > 1 - 1e-9) {
    wa = 1 - k;
    wb = k;
  } else {
    const angle = Math.acos(Math.min(1, cos));
    const sin = Math.sin(angle);
    wa = Math.sin((1 - k) * angle) / sin;
    wb = Math.sin(k * angle) / sin;
  }
  return quatNormalize([wa * a[0] + wb * bx, wa * a[1] + wb * by, wa * a[2] + wb * bz, wa * a[3] + wb * bw]);
}

/** The angle between two turns, the shorter way round (radians, 0 to π). */
export function turnAngle(a: Quat, b: Quat): number {
  const cos = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, cos));
}

/** The fastest a let-go board may spin (radians per millisecond), so a flick can never send it round and round. */
export const GLIDE_MAX_SPEED = 0.01;

/**
 * How much further a let-go board has turned `elapsedMs` after release, from its turning speed then
 * (`angularVelocity`: a room axis whose length is radians per millisecond). The speed falls smoothly to nothing at
 * `GLIDE_MS` — as (1 − t/T)² — so the extra turn grows quickly, then settles, totalling a third of the speed times
 * `GLIDE_MS`; `done` once it has stopped.
 */
export function glideAt(angularVelocity: Vec3, elapsedMs: number): { turnSince: Quat; done: boolean } {
  const raw = Math.hypot(angularVelocity[0], angularVelocity[1], angularVelocity[2]);
  if (!(raw > 0) || !Number.isFinite(raw)) return { turnSince: REST_TURN, done: true };
  const speed = Math.min(raw, GLIDE_MAX_SPEED);
  const t = Math.min(1, Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs / GLIDE_MS : 1));
  const angle = ((speed * GLIDE_MS) / 3) * (1 - (1 - t) ** 3);
  return { turnSince: quatFromAxisAngle(angularVelocity, angle), done: !(elapsedMs < GLIDE_MS) };
}
