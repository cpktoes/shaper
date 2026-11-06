import { describe, expect, it } from "vitest";
import { boardOutlineLoop, boardProfileLines, buildBoardSurface, type Vec3 } from "./board-surface";
import { silhouette } from "./screen-tiles";
import { inchesToMm, type Mm } from "./units";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "./design";
import { buildOutline } from "./outline";
import {
  BOARD_TO_ROOM,
  cameraAxes,
  dragTurn,
  framePointsOf,
  GLIDE_MAX_SPEED,
  GLIDE_MS,
  glideAt,
  KEY_TURN_DEG,
  keyTurn,
  quatConjugate,
  quatFromAxisAngle,
  quatMultiply,
  quatNormalize,
  REST_TURN,
  ROOM_CAMERA,
  roomCameraAxes,
  viewerAxes,
  rotateVec,
  slerpShortest,
  turnAngle,
  type Quat,
} from "./view-3d";
import { phase16Boards } from "./__fixtures__/phase16-boards";

/**
 * The 3D screen's turns (Phase 16, UI-SPEC §3, §14, D-43, D-44): every expected figure follows from a relation or from
 * `ROOM_CAMERA`, never a typed figure (Rule 1).
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

  it("the viewer stands first directly behind the tail, on the stringer's line (the founder, D-44)", () => {
    expect(ROOM_CAMERA.azimuthDeg).toBe(0);
    expect(ROOM_CAMERA.elevationDeg).toBeGreaterThan(0);
    expect(ROOM_CAMERA.fovDeg).toBe(62);
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

describe("framePointsOf", () => {
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

});

/** The same turn: a quaternion and its negative turn a board identically. */
function sameTurn(a: Quat, b: Quat, tol = 1e-12) {
  const sign = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
  close(a, b.map((v) => sign * v), tol);
}

/** The turn's axis and angle, read back from the quaternion. */
function axisAngle(q: Quat): { axis: Vec3; angle: number } {
  const [x, y, z, w] = q[3] < 0 ? q.map((v) => -v) : q;
  const s = Math.hypot(x, y, z);
  return { axis: s > 0 ? [x / s, y / s, z / s] : [0, 0, 0], angle: 2 * Math.atan2(s, w) };
}

const unit = (q: Quat) => expect(Math.hypot(...q)).toBeCloseTo(1, 12);

describe("viewerAxes — where the viewer stands in the room", () => {
  const dotOf = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  it("three unit, square, right-handed axes at any azimuth and elevation, straight overhead too", () => {
    for (const azimuth of [-170, -90, -13, 0, 12, 90, 135, 180]) {
      for (const elevation of [-11, 0, 20, 50, 89.9, 90]) {
        const { right, up, forward } = viewerAxes(azimuth, elevation);
        for (const axis of [right, up, forward]) expect(Math.hypot(...axis)).toBeCloseTo(1, 12);
        expect(dotOf(right, up)).toBeCloseTo(0, 12);
        expect(dotOf(right, forward)).toBeCloseTo(0, 12);
        expect(dotOf(up, forward)).toBeCloseTo(0, 12);
        const cross: Vec3 = [
          right[1] * up[2] - right[2] * up[1],
          right[2] * up[0] - right[0] * up[2],
          right[0] * up[1] - right[1] * up[0],
        ];
        close(cross, [-forward[0], -forward[1], -forward[2]]);
        // The picture's right is level, so a view never rolls.
        expect(right[1]).toBe(0);
      }
    }
  });

  it("at azimuth 90° it is the camera the room used to have, for any elevation", () => {
    for (const elevation of [0, 20, 50]) {
      const e = (elevation * Math.PI) / 180;
      const { right, up, forward } = viewerAxes(90, elevation);
      close(right, [1, 0, 0]);
      close(up, [0, Math.cos(e), -Math.sin(e)]);
      close(forward, [0, -Math.sin(e), -Math.cos(e)]);
    }
  });

  it("at azimuth 0 the viewer stands behind the tail looking along the board toward the nose", () => {
    const { right, forward } = viewerAxes(0, 0);
    const lie = (axis: Vec3) => rotateVec(BOARD_TO_ROOM, axis);
    close(forward, lie([1, 0, 0]));
    // The board's right rail, seen from the tail, is on the picture's right.
    close(right, lie([0, -1, 0]));
  });

  it("the room's axes are the first view's", () => {
    close(roomCameraAxes().forward, viewerAxes(ROOM_CAMERA.azimuthDeg, ROOM_CAMERA.elevationDeg).forward);
  });

  it("a drag and a key read the axes they are given, and the first view's without any", () => {
    const axes = viewerAxes(70, 10);
    const start = quatFromAxisAngle([1, 2, 3], 0.8);
    expect(dragTurn(start, 30, 12, 400)).toEqual(dragTurn(start, 30, 12, 400, roomCameraAxes()));
    expect(dragTurn(start, 30, 12, 400, axes)).not.toEqual(dragTurn(start, 30, 12, 400));
    expect(keyTurn(start, "left", axes)).not.toEqual(keyTurn(start, "left"));
  });
});

describe("cameraAxes", () => {
  it("is the room camera's own frame, right-handed, the way back toward the camera opposite its view", () => {
    const { right, up, toCamera } = cameraAxes();
    const { forward } = roomCameraAxes();
    close(toCamera, [-forward[0], -forward[1], -forward[2]]);
    const cross: Vec3 = [
      right[1] * up[2] - right[2] * up[1],
      right[2] * up[0] - right[0] * up[2],
      right[0] * up[1] - right[1] * up[0],
    ];
    close(cross, toCamera);
  });
});

describe("dragTurn — the board turns like a ball under the hand", () => {
  const short = 480;
  const { right, up } = cameraAxes();

  it("a sideways drag the length of the shorter side is half a turn about the picture's up-down axis", () => {
    const q = dragTurn(REST_TURN, short, 0, short);
    unit(q);
    const { axis, angle } = axisAngle(q);
    expect(angle).toBeCloseTo(Math.PI, 12);
    close(axis.map(Math.abs), up.map(Math.abs));
  });

  it("an up-down drag of half the shorter side is a quarter turn about its left-right axis", () => {
    const start = quatFromAxisAngle([0.2, 0.5, -0.4], 0.7);
    const q = dragTurn(start, 0, short / 2, short);
    unit(q);
    const step = quatMultiply(q, quatConjugate(start));
    const { axis, angle } = axisAngle(step);
    expect(angle).toBeCloseTo(Math.PI / 2, 12);
    close(axis, right);
  });

  it("drags right, the near face goes right; drags down, it goes down", () => {
    const { toCamera } = cameraAxes();
    const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(rotateVec(dragTurn(REST_TURN, 10, 0, short), toCamera), right)).toBeGreaterThan(0);
    expect(dot(rotateVec(dragTurn(REST_TURN, 0, 10, short), toCamera), up)).toBeLessThan(0);
  });

  it("dragging back by the same amount comes back to the start", () => {
    const start = quatFromAxisAngle([1, -0.3, 0.6], 1.1);
    for (const [dx, dy] of [
      [37, 0],
      [0, -91],
      [123, -45],
      [-7.5, 300],
    ]) {
      sameTurn(dragTurn(dragTurn(start, dx, dy, short), -dx, -dy, short), start);
    }
  });

  it("no drag, or no canvas, is no turn", () => {
    const start = quatFromAxisAngle([0, 1, 0], 0.4);
    sameTurn(dragTurn(start, 0, 0, short), start);
    sameTurn(dragTurn(start, 50, 50, 0), start);
    sameTurn(dragTurn(start, Number.NaN, 5, short), start);
  });

  it("returns a model turn only: the camera and the lights are not among its inputs or its answer", () => {
    // The answer is one quaternion — the board's turn — and the camera is read, never written.
    const before = JSON.stringify({ camera: cameraAxes(), room: ROOM_CAMERA });
    const q = dragTurn(REST_TURN, 40, -25, short);
    expect(q).toHaveLength(4);
    expect(JSON.stringify({ camera: cameraAxes(), room: ROOM_CAMERA })).toBe(before);
  });
});

describe("glideAt — a let-go board slows to rest", () => {
  const v: Vec3 = [0, 0.002, -0.001];

  it("starts with no extra turn", () => {
    sameTurn(glideAt(v, 0).turnSince, REST_TURN);
    expect(glideAt(v, 0).done).toBe(false);
  });

  it("the extra turn grows, slows, and stops by GLIDE_MS, about the drag's own axis", () => {
    let last = 0;
    let lastStep = Infinity;
    for (let t = 50; t <= GLIDE_MS; t += 50) {
      const { turnSince } = glideAt(v, t);
      unit(turnSince);
      const { axis, angle } = axisAngle(turnSince);
      expect(angle).toBeGreaterThan(last);
      expect(angle - last).toBeLessThanOrEqual(lastStep + 1e-12);
      const l = Math.hypot(...v);
      close(axis, v.map((c) => c / l) as unknown as Vec3, 1e-9);
      lastStep = angle - last;
      last = angle;
    }
    expect(glideAt(v, GLIDE_MS).done).toBe(true);
    const total = axisAngle(glideAt(v, GLIDE_MS).turnSince).angle;
    expect(Number.isFinite(total)).toBe(true);
    expect(axisAngle(glideAt(v, GLIDE_MS * 3).turnSince).angle).toBeCloseTo(total, 12);
    expect(total).toBeCloseTo((Math.hypot(...v) * GLIDE_MS) / 3, 12);
  });

  it("a flick is capped, and no speed is no glide", () => {
    const flick = glideAt([0, 1, 0], GLIDE_MS);
    expect(axisAngle(flick.turnSince).angle).toBeCloseTo((GLIDE_MAX_SPEED * GLIDE_MS) / 3, 12);
    expect(glideAt([0, 0, 0], 10)).toEqual({ turnSince: REST_TURN, done: true });
  });
});

/** A board from the Phase 16 test set, built exactly as the 3D screen builds it, with its outline and side. */
function testBoard(label: string) {
  const board = phase16Boards().find((b) => b.label === label);
  if (!board) throw new Error(`no ${label}`);
  const geometry = buildOutline(board.fields.outline);
  const profile = designSideProfile(board.fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(board.fields.rails, profile.effectiveFoil, board.fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, board.fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return { geometry, profile, surface, length: board.fields.outline.length };
}

/** A point of the board at rest as a viewer sees it: across the picture to the right, and up it (orthographic). */
function seen(axes: { right: Vec3; up: Vec3 }, p: Vec3): [number, number] {
  const r = rotateVec(BOARD_TO_ROOM, p);
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return [dot(r, axes.right), dot(r, axes.up)];
}

/** Every pair of (got, want) differs by one and the same shift, to `tol` millimetres. */
function sameUpToShift(got: [number, number][], want: [number, number][], tol = 1e-9) {
  expect(got.length).toBe(want.length);
  expect(got.length).toBeGreaterThan(10);
  const a = got[0][0] - want[0][0];
  const b = got[0][1] - want[0][1];
  let worst = 0;
  for (let i = 0; i < got.length; i++) {
    worst = Math.max(worst, Math.abs(got[i][0] - want[i][0] - a), Math.abs(got[i][1] - want[i][1] - b));
  }
  expect(worst).toBeLessThan(tol);
}

describe("the board as the viewer sees it from overhead and from the rail (UI-SPEC §3, D-44)", () => {
  for (const label of ["shortboard|asis|hard", "fish|asis|hard", "midlength|asis|hard", "longboard|asis|soft", "fish|swallow|hard"]) {
    describe(label, () => {
      const { geometry, profile, surface, length } = testBoard(label);

      it("straight overhead shows TEMPLATE's outline lying nose-left, exactly, up to a shift", () => {
        // TEMPLATE lying (screen-tiles' outlineTileArt): x = −station across, w down the picture.
        const template = silhouette(geometry);
        sameUpToShift(
          template.map(({ station, w }) => {
            const [x, y] = seen(viewerAxes(90, 90), [station, w, 0]);
            return [x, -y];
          }),
          template.map(({ station, w }) => [-station, w]),
        );
        // The drawn board's own outline, every vertex of it, the same way round.
        const loop = boardOutlineLoop(surface);
        sameUpToShift(
          loop.map((p) => {
            const [x, y] = seen(viewerAxes(90, 90), p);
            return [x, -y];
          }),
          loop.map((p) => [-p[0], p[1]]),
        );
      });

      it("from the rail shows ROCKER's side view, nose left and deck up, exactly, up to a shift, between the 12\" stations", () => {
        const from = inchesToMm(12);
        const to = length - inchesToMm(12);
        const { deck, bottom } = boardProfileLines(surface);
        for (const [line, heightAt] of [
          [deck, profile.deckAt],
          [bottom, profile.rockerAt],
        ] as const) {
          const inside = line.filter((p) => p[0] >= from && p[0] <= to);
          // As drawn: ROCKER's own picture is x = −station across and the height up (screen-tiles' sidePoints).
          sameUpToShift(
            inside.map((p) => seen(viewerAxes(90, 0), p)),
            inside.map((p) => [-p[0], heightAt(p[0] as Mm)]),
            1e-6,
          );
        }
      });
    });
  }
});

const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

describe("slerpShortest — a view is reached the short way round", () => {
  const a = quatFromAxisAngle([0.3, 1, -0.2], 0.4);
  const b = quatFromAxisAngle([-0.5, 0.2, 1], 2.1);

  it("starts at a and ends at b", () => {
    sameTurn(slerpShortest(a, b, 0), a);
    sameTurn(slerpShortest(a, b, 1), b);
  });

  it("never takes the long way, even when b is written the other way round", () => {
    const flipped: Quat = [-b[0], -b[1], -b[2], -b[3]];
    const whole = turnAngle(a, b);
    for (const target of [b, flipped]) {
      const mid = slerpShortest(a, target, 0.5);
      unit(mid);
      expect(turnAngle(a, mid)).toBeCloseTo(whole / 2, 10);
      expect(turnAngle(mid, b)).toBeCloseTo(whole / 2, 10);
    }
  });

});

describe("keyTurn — the arrow keys", () => {
  const { right, up } = cameraAxes();
  const start = quatFromAxisAngle([1, 2, 3], 0.8);

  it("→ is 15° about the picture's up-down axis, ← the same back; ↓ and ↑ about its left-right axis", () => {
    const step = (key: "left" | "right" | "up" | "down") => axisAngle(quatMultiply(keyTurn(start, key), quatConjugate(start)));
    const deg = (KEY_TURN_DEG * Math.PI) / 180;
    for (const [key, axis] of [
      ["right", up],
      ["left", neg(up)],
      ["down", right],
      ["up", neg(right)],
    ] as const) {
      const { axis: got, angle } = step(key);
      expect(angle).toBeCloseTo(deg, 12);
      close(got, axis);
    }
    sameTurn(keyTurn(keyTurn(start, "right"), "left"), start);
  });

  it("four presses of → make 60°", () => {
    let q: Quat = REST_TURN;
    for (let i = 0; i < 4; i++) q = keyTurn(q, "right");
    expect(turnAngle(REST_TURN, q)).toBeCloseTo((4 * KEY_TURN_DEG * Math.PI) / 180, 12);
  });
});
