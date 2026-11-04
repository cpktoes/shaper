import { describe, expect, it } from "vitest";
import { buildBoardSurface, type Vec3 } from "./board-surface";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "./design";
import { buildOutline } from "./outline";
import {
  BOARD_TO_ROOM,
  FRAME_FILL,
  frameAtOne,
  framePointsOf,
  quatFromAxisAngle,
  quatMultiply,
  quatNormalize,
  REST_TURN,
  ROOM_CAMERA,
  rotateVec,
  type Frame,
  type Quat,
} from "./view-3d";
import { phase16Boards } from "./__fixtures__/phase16-boards";

/**
 * The 3D screen's turns and framing (Phase 16, UI-SPEC §3, §14). The framing is checked by projecting the very
 * points it framed through a camera built here from first principles — the elevation and the field of view read
 * from `ROOM_CAMERA`, never a typed figure (Rule 1).
 */

const close = (a: readonly number[], b: readonly number[], tol = 1e-12) =>
  a.forEach((v, i) => expect(v).toBeCloseTo(b[i], -Math.log10(tol)));

describe("quaternions", () => {
  it("the identity changes nothing and the product with it is the other quaternion", () => {
    const q = quatNormalize([0.3, -0.2, 0.5, 0.7]);
    close(quatMultiply(REST_TURN, q), q);
    close(quatMultiply(q, REST_TURN), q);
    close(rotateVec(REST_TURN, [1, 2, 3]), [1, 2, 3]);
  });

  it("a quarter turn about z takes x to y; the product turns by b first, then a", () => {
    const qz = quatFromAxisAngle([0, 0, 2], Math.PI / 2);
    close(rotateVec(qz, [1, 0, 0]), [0, 1, 0]);
    const qx = quatFromAxisAngle([1, 0, 0], Math.PI / 2);
    const v: Vec3 = [1, 0, 0];
    close(rotateVec(quatMultiply(qx, qz), v), rotateVec(qx, rotateVec(qz, v)));
  });

  it("quatNormalize gives unit length, and the identity for nothing", () => {
    const q = quatNormalize([1, 2, 3, 4]);
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    expect(quatNormalize([0, 0, 0, 0])).toEqual([0, 0, 0, 1]);
  });

  it("a turn keeps lengths", () => {
    const q = quatFromAxisAngle([0.2, -1, 0.4], 1.234);
    const v: Vec3 = [3, -4, 12];
    expect(Math.hypot(...rotateVec(q, v))).toBeCloseTo(13, 12);
  });
});

describe("BOARD_TO_ROOM", () => {
  it("lays the board nose left, deck up, near rail toward the camera", () => {
    close(rotateVec(BOARD_TO_ROOM, [1, 0, 0]), [-1, 0, 0]);
    close(rotateVec(BOARD_TO_ROOM, [0, 0, 1]), [0, 1, 0]);
    close(rotateVec(BOARD_TO_ROOM, [0, 1, 0]), [0, 0, 1]);
  });

  it("is a proper rotation: unit length, and the three images form a right-handed frame", () => {
    expect(Math.hypot(...BOARD_TO_ROOM)).toBeCloseTo(1, 15);
    const x = rotateVec(BOARD_TO_ROOM, [1, 0, 0]);
    const y = rotateVec(BOARD_TO_ROOM, [0, 1, 0]);
    const z = rotateVec(BOARD_TO_ROOM, [0, 0, 1]);
    const cross: Vec3 = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    close(cross, z);
  });

  it("the room camera is the contract's: 50° up, 30° field of view", () => {
    expect(ROOM_CAMERA).toEqual({ elevationDeg: 50, fovDeg: 30 });
    expect(FRAME_FILL).toBe(0.85);
  });
});

/** The Shortboard as its card opens it, built exactly as the screen builds it. */
function shortboardPoints() {
  const board = phase16Boards().find((b) => b.label === "shortboard|asis|hard");
  if (!board) throw new Error("no shortboard");
  const geometry = buildOutline(board.fields.outline);
  const profile = designSideProfile(board.fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(board.fields.rails, profile.effectiveFoil, board.fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, board.fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return { surface, ...framePointsOf(surface.positions) };
}

/** The picture's box of `points`, in the canvas's own -1…1 units, from a camera built from first principles. */
function projectedBox(points: readonly Vec3[], turn: Quat, frame: Frame, aspect: number) {
  const e = (ROOM_CAMERA.elevationDeg * Math.PI) / 180;
  const right: Vec3 = [1, 0, 0];
  const up: Vec3 = [0, Math.cos(e), -Math.sin(e)];
  const forward: Vec3 = [0, -Math.sin(e), -Math.cos(e)];
  const tanV = Math.tan(((ROOM_CAMERA.fovDeg / 2) * Math.PI) / 180);
  const dot = (p: Vec3, q: Vec3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const q = quatMultiply(turn, BOARD_TO_ROOM);
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const p of points) {
    const r = rotateVec(q, p);
    const depth = frame.distance + dot(r, forward);
    const x = (dot(r, right) + frame.right) / (depth * tanV * aspect);
    const y = (dot(r, up) + frame.up) / (depth * tanV);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, x1, y0, y1 };
}

describe("frameAtOne", () => {
  const { points, centre, surface } = shortboardPoints();

  it("framePointsOf keeps the surface's reach on every axis, about its box's centre", () => {
    const n = surface.positions.length / 3;
    for (let k = 0; k < 3; k++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let v = 0; v < n; v++) {
        lo = Math.min(lo, surface.positions[3 * v + k]);
        hi = Math.max(hi, surface.positions[3 * v + k]);
      }
      expect(centre[k]).toBeCloseTo((lo + hi) / 2, 9);
      expect(Math.min(...points.map((p) => p[k]))).toBeCloseTo(lo - centre[k], 9);
      expect(Math.max(...points.map((p) => p[k]))).toBeCloseTo(hi - centre[k], 9);
    }
    expect(points.length).toBeLessThanOrEqual(6006);
  });

  for (const aspect of [1.6, 0.6]) {
    it(`at rest on a ${aspect} canvas the board fills 85% of the tighter direction, centred`, () => {
      const frame = frameAtOne(points, REST_TURN, aspect);
      const box = projectedBox(points, REST_TURN, frame, aspect);
      const halfX = (box.x1 - box.x0) / 2;
      const halfY = (box.y1 - box.y0) / 2;
      expect(Math.max(halfX, halfY)).toBeCloseTo(0.85, 4);
      expect(Math.abs(box.x0 + box.x1) / 2).toBeLessThan(1e-4);
      expect(Math.abs(box.y0 + box.y1) / 2).toBeLessThan(1e-4);
      // A board is long: on both canvases its length is the tighter direction at rest, nose to tail across.
      expect(halfX).toBeGreaterThan(halfY);
      expect(frame.distance).toBeGreaterThan(0);
    });
  }

  it("a turned board is framed the same way, and a smaller fill puts it further away", () => {
    const turn = quatFromAxisAngle([0.3, 1, 0.2], 0.9);
    const frame = frameAtOne(points, turn, 1.2);
    const box = projectedBox(points, turn, frame, 1.2);
    expect(Math.max((box.x1 - box.x0) / 2, (box.y1 - box.y0) / 2)).toBeCloseTo(0.85, 4);
    expect(Math.abs(box.x0 + box.x1) / 2).toBeLessThan(1e-4);
    expect(Math.abs(box.y0 + box.y1) / 2).toBeLessThan(1e-4);
    expect(frameAtOne(points, turn, 1.2, 0.5).distance).toBeGreaterThan(frame.distance);
  });
});
