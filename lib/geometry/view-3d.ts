/**
 * The 3D screen's turns as plain numbers (Phase 16, UI-SPEC §3 and §14). The board turns under fixed lights (D-10):
 * a drag, a key or a control in the panel changes only the board's own turn, held here as a quaternion, so the
 * highlights move across the foam instead of riding along with it. Where the viewer stands is its own matter
 * (`viewerAxes` here, the shaping bay's room in `shaping-bay.ts`).
 *
 * Three sets of axes, all right-handed, all millimetres:
 * - **The board's** (the surface's, `board-surface.ts`): x along the board from the tail toward the nose, y
 *   across (the rails at ±y), z up toward the deck.
 * - **The room's**: X along the room (the tail end at +X), Y up, Z across it.
 * - **The viewer's**: right, up and forward (into the picture), worked out from where the viewer stands.
 *
 * `BOARD_TO_ROOM` lays the board in the room at rest — the nose toward room −X, the deck up (room +Y), board +y
 * toward room +Z — and a turn is applied in the room after it, so the board's full orientation is
 * `turn × BOARD_TO_ROOM`. `REST_TURN` is no turn at all: deck up on the racks.
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

/**
 * Where the viewer first stands (the founder, D-44: "directly behind the tail, looking forward toward the nose, deck
 * up"): `azimuthDeg` is measured round the vertical from room +X (the tail end at rest) toward +Z, so 0 is on the
 * stringer's line behind the tail; `elevationDeg` is how far above the board the eye looks down; `fovDeg` the lens,
 * top to bottom.
 */
export const ROOM_CAMERA = { azimuthDeg: 0, elevationDeg: 20, fovDeg: 62 } as const;

/** Three unit axes in the room: the picture's right, its up, and forward into the picture. */
export interface ViewerAxes {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

/**
 * The viewer's axes standing at `azimuthDeg` round the room and `elevationDeg` above the board, looking at it.
 * `right` is level whatever the elevation, straight overhead too, so a view never rolls; `up` follows from it.
 */
export function viewerAxes(azimuthDeg: number, elevationDeg: number): ViewerAxes {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const forward: Vec3 = [-Math.cos(el) * Math.cos(az), -Math.sin(el), -Math.cos(el) * Math.sin(az)];
  const right: Vec3 = [Math.sin(az), 0, -Math.cos(az)];
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  return { right, up, forward };
}

/** The viewer's axes at the first view. */
export function roomCameraAxes(): ViewerAxes {
  return viewerAxes(ROOM_CAMERA.azimuthDeg, ROOM_CAMERA.elevationDeg);
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
// own lie (`turn × BOARD_TO_ROOM`), and every one returns only the board's new turn: none of them moves the viewer or
// a light, so nothing but the board can move (D-10). The viewer's axes are read, so a drag feels like a ball under
// the hand from wherever the viewer stands.
// ---------------------------------------------------------------------------------------------------------------

/** The viewer's axes as a drag reads them: the picture's right, its up, and the way back toward the viewer. */
export function cameraAxes(axes: ViewerAxes = roomCameraAxes()): { right: Vec3; up: Vec3; toCamera: Vec3 } {
  const { right, up, forward } = axes;
  return { right, up, toCamera: [-forward[0], -forward[1], -forward[2]] };
}

/** The opposite turn of a unit quaternion. */
export function quatConjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

/** The five view buttons (D-13, D-44), in the panel's order. */
export type ViewName = "deck" | "bottom" | "side" | "nose" | "tail";
export const VIEW_NAMES: readonly ViewName[] = ["deck", "bottom", "side", "nose", "tail"];

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
export function dragTurn(
  turn: Quat,
  dx: number,
  dy: number,
  shortSide: number,
  axes: { right: Vec3; up: Vec3 } = roomCameraAxes(),
): Quat {
  const length = Math.hypot(dx, dy);
  if (!(length > 0) || !(shortSide > 0) || !Number.isFinite(length)) return quatNormalize(turn);
  const { right, up } = axes;
  const axis: Vec3 = [up[0] * dx + right[0] * dy, up[1] * dx + right[1] * dy, up[2] * dx + right[2] * dy];
  return quatNormalize(quatMultiply(quatFromAxisAngle(axis, (Math.PI * length) / shortSide), turn));
}

/** The board after one arrow key: 15° about the picture's up-down axis (← →) or its left-right axis (↑ ↓). */
export function keyTurn(
  turn: Quat,
  key: "left" | "right" | "up" | "down",
  axes: { right: Vec3; up: Vec3 } = roomCameraAxes(),
): Quat {
  const { right, up } = axes;
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
