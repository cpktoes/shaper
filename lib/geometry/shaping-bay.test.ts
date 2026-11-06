import { describe, expect, it } from "vitest";
import { buildBoardSurface, type Vec3 } from "./board-surface";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "./design";
import { placedFins } from "./fin-outline";
import { phase16FinCases } from "./__fixtures__/phase16-fin-cases";
import { buildOutline } from "./outline";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  anglesBetween,
  aimAt,
  AT_REST,
  BAY,
  BAY_PAINT,
  BAY_TREATMENTS,
  bayLens,
  boardPlace,
  BOTTOM_UP,
  clampLift,
  clampViewer,
  END_VIEW_FILL,
  fillCrop,
  firstViewOutline,
  floorPatch,
  freePlace,
  isBottomUp,
  liftOfRaise,
  overPad,
  rackAngles,
  rackSeat,
  rackTurn,
  raiseArmMm,
  raiseOfLift,
  raiseSlider,
  railSightDeg,
  REST_VIEWER,
  shownAngles,
  SIGHT_LIMIT_DEG,
  standAt,
  stripEnds,
  totalRoll,
  viewerLook,
  viewerPlace,
  walkBetween,
  walkDrag,
  walkGlideAt,
  walkKey,
  WALK_VIEWS,
  wallReach,
  type RackAngles,
  type Viewer,
} from "./shaping-bay";
import { inchesToMm, mm, mmToInches } from "./units";
import {
  BOARD_TO_ROOM,
  framePointsOf,
  GLIDE_MS,
  KEY_TURN_DEG,
  quatMultiply,
  REST_TURN,
  ROOM_CAMERA,
  rotateVec,
  turnAngle,
  VIEW_NAMES,
  type Quat,
} from "./view-3d";

/**
 * The shaping bay's maths (Phase 16, D-43, D-44). Every expected figure follows from a relation, from `BAY` or from the
 * boards themselves, built exactly as the 3D screen builds them, never a typed figure (Rule 1).
 */

/** Each preset as its card opens it, and the app's longest board. */
const LABELS = ["shortboard|asis|hard", "fish|asis|hard", "midlength|asis|hard", "longboard|asis|soft"];

function testBoard(label: string, scaleLengthTo?: number) {
  const board = phase16Boards().find((b) => b.label === label);
  if (!board) throw new Error(`no ${label}`);
  const fields = scaleLengthTo ? { ...board.fields, outline: { ...board.fields.outline, length: mm(scaleLengthTo) } } : board.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const { centre, points } = framePointsOf(surface.positions);
  const all: Vec3[] = [];
  for (let v = 0; v < surface.positions.length / 3; v++) {
    all.push([surface.positions[3 * v] - centre[0], surface.positions[3 * v + 1] - centre[1], surface.positions[3 * v + 2] - centre[2]]);
  }
  return { fields, geometry, profile, surface, centre, points, all, seat: rackSeat(points) };
}

const BOARDS = LABELS.map((label) => ({ label, ...testBoard(label) }));
const LONGEST = { label: 'the 120" board', ...testBoard("longboard|asis|soft", inchesToMm(120)) };

/** The canvases the 3D screen draws on: a computer, a tall window, a Pixel, an iPhone, a 320-dot phone, a sideways phone. */
const ASPECTS: readonly [string, number][] = [
  ["computer", 804 / 615],
  ["tall window", 480 / 700],
  ["Pixel 7", 402 / 523],
  ["iPhone 14", 380 / 407],
  ["320", 288 / 330],
  ["sideways", 482 / 312],
];

/** A little seeded generator, so a failure repeats. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A board point in the room for three angles at `place`. */
function inRoom(p: Vec3, angles: RackAngles, place: Vec3): Vec3 {
  const r = rotateVec(quatMultiply(rackTurn(angles), BOARD_TO_ROOM), p);
  return [r[0] + place[0], r[1] + place[1], r[2] + place[2]];
}

/** Inside a pad, how deep: its head stands `at` from the room's middle (unswung), its top at `rackTopMm`, 50 mm thick. */
function depthInPad(p: Vec3, at: number): number {
  const across = BAY.padHalfSpanMm - Math.abs(p[2]);
  const along = BAY.padHalfDepthMm - Math.abs(Math.abs(p[0]) - at);
  const down = BAY.rackTopMm - p[1];
  const up = p[1] - (BAY.rackTopMm - 50);
  return Math.min(across, along, down, up);
}

describe("the room", () => {
  it("is the same size for every board, and a 120\" board swung square clears the sills", () => {
    const tip = inchesToMm(120) / 2;
    expect(tip).toBeLessThan(BAY.widthMm / 2 - BAY.sillDepthMm);
    expect(tip).toBeLessThan(BAY.lengthMm / 2);
  });

  it("the strip hangs under the shelf, above the sill, behind the shelf's front edge (the founder)", () => {
    expect(BAY.stripHeightMm + BAY.stripFaceMm / 2).toBeLessThan(BAY.benchTopMm - BAY.benchThickMm);
    expect(BAY.stripHeightMm - BAY.stripFaceMm / 2).toBeGreaterThan(BAY.sillTopMm);
    expect(BAY.stripInsetMm + BAY.stripFaceMm / 2).toBeLessThanOrEqual(BAY.benchDepthMm);
  });

  it("the two strips run the room's length along both side walls", () => {
    const [[a0, a1], [b0, b1]] = stripEnds();
    expect(a0[1]).toBe(BAY.stripHeightMm);
    expect(a1[0] - a0[0]).toBe(BAY.lengthMm - 2 * BAY.stripEndInsetMm);
    expect(a0[2]).toBe(-b0[2]);
    expect(a1[2]).toBe(-b1[2]);
  });

  it("the strips are pure white, the fill neutral, and only the walls are blue (D-44)", () => {
    expect(BAY_PAINT.strip).toBe("#ffffff");
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (const treatment of Object.values(BAY_TREATMENTS)) {
      const [r, g, b] = channels(treatment.fillColour);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(8);
    }
    const [wr, , wb] = channels(BAY_PAINT.wall);
    expect(wb).toBeGreaterThan(wr * 4);
  });
});

describe("rackTurn and rackAngles — three planes and one quaternion", () => {
  it("no angles is no turn", () => {
    const q = rackTurn(AT_REST);
    expect(turnAngle(q, REST_TURN)).toBeCloseTo(0, 12);
  });

  const lie = (angles: RackAngles, axis: Vec3) => rotateVec(quatMultiply(rackTurn(angles), BOARD_TO_ROOM), axis);

  it("+ roll tips the deck toward the right seen from the tail (room −Z)", () => {
    expect(lie({ ...AT_REST, roll: 30 }, [0, 0, 1])[2]).toBeLessThan(0);
  });
  it("+ lift raises the nose", () => {
    expect(lie({ ...AT_REST, lift: 30 }, [1, 0, 0])[1]).toBeGreaterThan(0);
  });
  it("+ swing takes the nose to the right seen from the tail (room −Z)", () => {
    expect(lie({ ...AT_REST, swing: 30 }, [1, 0, 0])[2]).toBeLessThan(0);
  });
  it("each plane moves itself alone", () => {
    const start: RackAngles = { swing: 25, lift: -12, roll: 70 };
    for (const key of ["swing", "lift", "roll"] as const) {
      const moved = { ...start, [key]: start[key] + 9 };
      const back = rackAngles(rackTurn(moved));
      for (const other of ["swing", "lift", "roll"] as const) expect(back[other]).toBeCloseTo(moved[other], 9);
    }
  });

  it("over 2000 seeded angles within lift ±89°, the round trip returns them to 1e-9°", () => {
    const random = seeded(16018);
    for (let i = 0; i < 2000; i++) {
      const a: RackAngles = { swing: random() * 359 - 179.5, lift: random() * 178 - 89, roll: random() * 359 - 179.5 };
      const back = rackAngles(rackTurn(a));
      expect(Math.abs(back.swing - a.swing)).toBeLessThan(1e-9);
      expect(Math.abs(back.lift - a.lift)).toBeLessThan(1e-9);
      expect(Math.abs(back.roll - a.roll)).toBeLessThan(1e-9);
    }
  });
});

describe("clampLift, shownAngles and the flip", () => {
  it("leaves a turn alone inside the limit", () => {
    const q = rackTurn({ swing: 30, lift: BAY.liftLimitDeg - 1, roll: 40 });
    expect(clampLift(q)).toBe(q);
  });

  it("past the limit keeps the swing and the roll, with the lift exactly at the limit", () => {
    for (const sign of [1, -1]) {
      const a = rackAngles(clampLift(rackTurn({ swing: 30, lift: sign * (BAY.liftLimitDeg + 15), roll: 40 })));
      expect(a.lift).toBeCloseTo(sign * BAY.liftLimitDeg, 9);
      expect(a.swing).toBeCloseTo(30, 9);
      expect(a.roll).toBeCloseTo(40, 9);
    }
  });

  it("a turn flipped by 180° from a roll of 20 reads 20 with the board flipped", () => {
    const q = rackTurn({ swing: 5, lift: 7, roll: 200 });
    expect(shownAngles(q, true).roll).toBeCloseTo(20, 9);
    expect(shownAngles(q, false)).toEqual(rackAngles(q));
  });

  it("the panel's roll and the whole roll are inverses, either face up", () => {
    for (const flipped of [false, true]) {
      for (const shown of [-170, -45, 0, 45, 120]) {
        const q = rackTurn({ ...AT_REST, roll: totalRoll(shown, flipped) });
        expect(shownAngles(q, flipped).roll).toBeCloseTo(shown, 9);
      }
    }
  });

  it("isBottomUp is the face that shows", () => {
    expect(isBottomUp(0)).toBe(false);
    expect(isBottomUp(80)).toBe(false);
    expect(isBottomUp(100)).toBe(true);
    expect(isBottomUp(-179)).toBe(true);
  });

  it("anglesBetween goes the short way round, and lands on its end", () => {
    const a: RackAngles = { swing: 170, lift: 0, roll: -170 };
    const b: RackAngles = { swing: -170, lift: 10, roll: 170 };
    expect(anglesBetween(a, b, 0.5)).toEqual({ swing: 180, lift: 5, roll: -180 });
    const end = anglesBetween(a, b, 1);
    expect(turnAngle(rackTurn(end), rackTurn(b))).toBeCloseTo(0, 6);
  });
});

describe("rackSeat and overPad — the board on its racks", () => {
  for (const { label, seat, points, surface } of BOARDS) {
    describe(label, () => {
      it("home is positive and under the board's thickness", () => {
        const thickness = Math.max(...points.map((p) => p[2])) - Math.min(...points.map((p) => p[2]));
        expect(seat.home).toBeGreaterThan(0);
        expect(seat.home).toBeLessThan(thickness);
      });

      it("the racks stand the plan's share of its length from the middle", () => {
        expect(seat.at).toBeCloseTo(BAY.rackShare * seat.length, 9);
      });

      it("at 0° overPad is home; on a rail it rises by less than half its width plus its thickness", () => {
        expect(overPad(seat, 0)).toBe(seat.home);
        const width = surface.width;
        for (const roll of [45, 90, -45, -90]) {
          expect(overPad(seat, roll)).toBeGreaterThan(seat.home);
          expect(overPad(seat, roll)).toBeLessThan(width / 2 + 2 * seat.home);
        }
        expect(overPad(seat, 180)).toBeGreaterThan(0);
      });
    });
  }

  it("an empty board returns the rest place and does no harm", () => {
    const seat = rackSeat([]);
    expect(seat.home).toBe(0);
    expect(boardPlace([], AT_REST, seat)).toEqual([0, BAY.rackTopMm, 0]);
    expect(bayLens([], seat, 1.3)).toEqual({ distanceMm: BAY.nearestMm, lensDeg: ROOM_CAMERA.fovDeg });
    expect(firstViewOutline([], [], { distanceMm: 2450, lensDeg: 62 }, seat, 100, 100).board).toBe("");
  });
});

describe("boardPlace — where the board stands for any turn", () => {
  for (const { label, seat, points, all } of [...BOARDS, LONGEST]) {
    describe(label, () => {
      it("at rest it stands on the pads, in the room's middle", () => {
        const place = boardPlace(points, AT_REST, seat);
        expect(place[0]).toBeCloseTo(0, 9);
        expect(place[2]).toBeCloseTo(0, 9);
        expect(place[1]).toBeCloseTo(BAY.rackTopMm + seat.home, 9);
        expect(freePlace(seat)).toEqual(place);
      });

      it("rolled alone, it only rises", () => {
        for (const roll of [30, 45, -60, 90, 180]) {
          const place = boardPlace(points, { ...AT_REST, roll }, seat);
          expect(place[0]).toBeCloseTo(0, 9);
          expect(place[2]).toBeCloseTo(0, 9);
          expect(place[1]).toBeCloseTo(BAY.rackTopMm + overPad(seat, roll), 9);
        }
      });

      it("nose up pivots on the tail-side rack's outer top edge, tail up on the nose-side's, the mirror", () => {
        const edge = seat.at + BAY.padHalfDepthMm;
        for (const sign of [1, -1]) {
          // The board's point over the edge at rest: on the rack's own side, at the pad's top.
          const atRest: Vec3 = [sign * edge, BAY.rackTopMm, 0];
          const start = boardPlace(points, AT_REST, seat);
          const own = rotateVec(
            [-BOARD_TO_ROOM[0], -BOARD_TO_ROOM[1], -BOARD_TO_ROOM[2], BOARD_TO_ROOM[3]],
            [atRest[0] - start[0], atRest[1] - start[1], atRest[2] - start[2]],
          );
          for (let lift = 0; lift <= BAY.liftLimitDeg; lift += 5) {
            const angles = { ...AT_REST, lift: sign * lift };
            const place = boardPlace(points, angles, seat);
            const q = quatMultiply(rackTurn(angles), BOARD_TO_ROOM);
            // Skip where the floor rule is what is acting.
            const lowest = Math.min(...points.map((p) => rotateVec(q, p)[1] + place[1]));
            if (lowest <= BAY.floorClearMm + 1e-6) continue;
            const now = inRoom(own, angles, place);
            expect(Math.hypot(now[0] - atRest[0], now[1] - atRest[1], now[2] - atRest[2])).toBeLessThan(1e-6);
          }
        }
      });

      it("swung, the board's place swings with the racks about the room's middle", () => {
        const flat = boardPlace(points, { swing: 0, lift: 30, roll: 0 }, seat);
        const swung = boardPlace(points, { swing: 90, lift: 30, roll: 0 }, seat);
        // The racks' +X end goes to +Z under a swing of +90° (`rackTurn`'s Ry(−swing)).
        expect(swung[0]).toBeCloseTo(0, 9);
        expect(swung[1]).toBeCloseTo(flat[1], 9);
        expect(swung[2]).toBeCloseTo(flat[0], 9);
      });

      it("over Raise ±60° and every roll, no vertex lies 2 mm inside a pad and the foam stays off the floor", () => {
        for (let lift = -BAY.liftLimitDeg; lift <= BAY.liftLimitDeg; lift += 10) {
          for (let roll = -180; roll < 180; roll += 15) {
            const angles = { swing: 0, lift, roll };
            const place = boardPlace(all, angles, seat);
            let deepest = -Infinity;
            let lowest = Infinity;
            for (const p of all) {
              const room = inRoom(p, angles, place);
              deepest = Math.max(deepest, depthInPad(room, seat.at));
              lowest = Math.min(lowest, room[1]);
            }
            expect(deepest).toBeLessThanOrEqual(2);
            expect(lowest).toBeGreaterThanOrEqual(BAY.floorClearMm - 1e-6);
          }
        }
      }, 120_000);
    });
  }

  it("no fin point lies inside a pad at rest, rolled 45° or swung, in any fin setup on any preset", () => {
    for (const finCase of phase16FinCases()) {
      const board = BOARDS.find((b) => b.label.startsWith(`${finCase.preset.id}|`));
      if (!board) throw new Error(finCase.label);
      const { fields, centre, points, seat } = board;
      const fins = placedFins(finCase.marks, finCase.spec.finSetup, finCase.spec.twinTemplate, fields.outline.length, finCase.rockerAt);
      expect(fins.length).toBeGreaterThan(0);
      for (const fin of fins) {
        const run: Vec3 = [fin.trailing[0] - fin.leading[0], fin.trailing[1] - fin.leading[1], 0];
        const length = Math.hypot(run[0], run[1]) || 1;
        for (const { u, v } of fin.outline.points) {
          const p: Vec3 = [
            fin.leading[0] + (run[0] / length) * u - centre[0],
            fin.leading[1] + (run[1] / length) * u - centre[1],
            fin.rootZ - v - centre[2],
          ];
          for (const angles of [
            AT_REST,
            { ...AT_REST, roll: 45 },
            { ...AT_REST, roll: -45 },
            { ...AT_REST, swing: 45 },
            { ...AT_REST, swing: 90 },
            { ...AT_REST, swing: 135 },
          ]) {
            // The racks swing with the board, so a pad is measured in the swung frame: unswing the point.
            const place = boardPlace(points, angles, seat);
            const room = inRoom(p, { ...angles, swing: 0 }, boardPlace(points, { ...angles, swing: 0 }, seat));
            expect(place[1]).toBeCloseTo(boardPlace(points, { ...angles, swing: 0 }, seat)[1], 9);
            expect(depthInPad(room, seat.at)).toBeLessThan(0);
          }
        }
      }
    }
  }, 120_000);

  it("the patch under the board follows its place and heading and shortens as an end comes up", () => {
    const { seat, points } = BOARDS[0];
    const angles = { swing: 30, lift: 40, roll: 0 };
    const patch = floorPatch(boardPlace(points, angles, seat), angles, seat);
    const flat = floorPatch(boardPlace(points, AT_REST, seat), AT_REST, seat);
    expect(patch.size[0]).toBeLessThan(flat.size[0]);
    expect(Math.hypot(...patch.axis)).toBeCloseTo(1, 12);
    expect(patch.centre[0]).toBeCloseTo(boardPlace(points, angles, seat)[0], 9);
  });
});

describe("Raise the Nose and Raise the Tail (D-44)", () => {
  for (const { label, seat, points } of BOARDS) {
    it(`${label}: the height is what the board's point over that end's rack really rises, to 1e-6 mm`, () => {
      for (const lift of [10, 30, 45, 60]) {
        const angles = { ...AT_REST, lift };
        const place = boardPlace(points, angles, seat);
        // The board's bottom over the nose-side rack at rest, in the board's own axes.
        const start = boardPlace(points, AT_REST, seat);
        const rest: Vec3 = [-seat.at - start[0], BAY.rackTopMm - start[1], 0];
        const own = rotateVec([-BOARD_TO_ROOM[0], -BOARD_TO_ROOM[1], -BOARD_TO_ROOM[2], BOARD_TO_ROOM[3]], rest);
        expect(inRoom(own, angles, place)[1] - BAY.rackTopMm).toBeCloseTo(raiseOfLift(lift, seat), 6);
      }
    });

    it(`${label}: height and lift are inverses, and the limit stands`, () => {
      for (const lift of [0, 7, 30, 59]) expect(liftOfRaise(raiseOfLift(lift, seat), seat)).toBeCloseTo(lift, 9);
      expect(liftOfRaise(raiseArmMm(seat) * 2, seat)).toBe(BAY.liftLimitDeg);
      expect(liftOfRaise(-5, seat)).toBe(0);
      expect(raiseOfLift(-30, seat)).toBe(raiseOfLift(30, seat));
    });
  }

  it("the slider reads a dim: 1/4\" steps from nothing up to the limit in Imperial, whole 5 mm steps in Metric", () => {
    const { seat } = BOARDS[0];
    const top = raiseOfLift(BAY.liftLimitDeg, seat);
    const imperial = raiseSlider(mm(inchesToMm(4)), seat, "imperial");
    expect(imperial.value).toBeCloseTo(4, 9);
    expect(imperial.min).toBe(0);
    expect(imperial.step).toBe(0.25);
    expect(imperial.max).toBeLessThanOrEqual(mmToInches(top));
    expect(mmToInches(top) - imperial.max).toBeLessThan(0.25);
    const metric = raiseSlider(mm(100), seat, "metric");
    expect(metric.step).toBe(5);
    expect(metric.max % 5).toBe(0);
    expect(metric.toMm(120)).toBe(120);
  });
});

describe("where the viewer stands", () => {
  it("stands first directly behind the tail, with no sight shift (D-44)", () => {
    expect(REST_VIEWER).toEqual({ azimuthDeg: 0, elevationDeg: ROOM_CAMERA.elevationDeg, sightDeg: 0 });
  });

  it("Nose faces the tail, Tail faces the nose, Side faces across, all from rail height (D-44)", () => {
    const lie = (axis: Vec3) => rotateVec(BOARD_TO_ROOM, axis);
    const facing = (v: Viewer) => viewerLook(v).forward;
    const near = (a: Vec3, b: Vec3) => a.forEach((c, i) => expect(c).toBeCloseTo(b[i], 9));
    const level = (v: Vec3): Vec3 => [v[0], 0, v[2]];
    const flat = (v: Viewer) => {
      const f = level(facing(v));
      const l = Math.hypot(...f);
      return [f[0] / l, 0, f[2] / l] as Vec3;
    };
    near(flat(standAt("nose", 0)), lie([-1, 0, 0]));
    near(flat(standAt("tail", 0)), lie([1, 0, 0]));
    near(facing(standAt("side", 0)), lie([0, -1, 0]));
    // Side is at rail height; at the ends the eye is a little above the board, so the outline's curve shows.
    expect(WALK_VIEWS.side.elevationDeg).toBe(0);
    expect(WALK_VIEWS.nose.elevationDeg).toBeGreaterThan(0);
    expect(WALK_VIEWS.nose.elevationDeg).toBeLessThan(REST_VIEWER.elevationDeg);
    expect(WALK_VIEWS.tail.elevationDeg).toBe(WALK_VIEWS.nose.elevationDeg);
  });

  it("with the board swung, Nose, Tail and Side go where the board's ends and rail are now", () => {
    for (const swing of [-120, -35, 40, 90, 170]) {
      const nose = rotateVec(quatMultiply(rackTurn({ ...AT_REST, swing }), BOARD_TO_ROOM), [1, 0, 0]);
      const end = Math.cos((WALK_VIEWS.nose.elevationDeg * Math.PI) / 180);
      const facing = viewerLook(standAt("nose", swing)).forward;
      expect(dot(facing, nose)).toBeCloseTo(-end, 9);
      expect(dot(viewerLook(standAt("tail", swing)).forward, nose)).toBeCloseTo(end, 9);
      const rail = rotateVec(quatMultiply(rackTurn({ ...AT_REST, swing }), BOARD_TO_ROOM), [0, 1, 0]);
      expect(dot(viewerLook(standAt("side", swing)).forward, rail)).toBeCloseTo(-1, 9);
    }
  });

  it("Deck and Bottom stand straight overhead with the nose left, whatever the swing", () => {
    for (const name of ["deck", "bottom"] as const) {
      expect(standAt(name, 40)).toEqual(WALK_VIEWS[name]);
      const { right, forward } = viewerLook(WALK_VIEWS[name]);
      expect(forward[1]).toBeCloseTo(-1, 4);
      expect(right).toEqual([expect.closeTo(1, 12), 0, expect.closeTo(0, 12)]);
      const nose = rotateVec(BOARD_TO_ROOM, [1, 0, 0]);
      expect(dot(right, nose)).toBeCloseTo(-1, 9);
    }
  });

  it("aimAt is the full share at the first view and nothing at rail height or overhead", () => {
    expect(aimAt(REST_VIEWER.elevationDeg)).toBeCloseTo(BAY.aim, 12);
    expect(aimAt(0)).toBe(0);
    expect(aimAt(90)).toBe(0);
    expect(aimAt(-10)).toBe(0);
  });

  it("wallReach stops at the nearer wall and has no lid overhead", () => {
    expect(wallReach(0, 0)).toBeCloseTo(BAY.lengthMm / 2 - BAY.viewerMarginMm, 9);
    expect(wallReach(90, 0)).toBeCloseTo(BAY.widthMm / 2 - BAY.viewerMarginMm, 9);
    expect(wallReach(0, 90)).toBe(Infinity);
  });

  describe("viewerPlace and clampViewer: the eye stays in the room", () => {
    for (const { label, seat, points } of [...BOARDS, LONGEST]) {
      it(`${label}: 200 mm off every wall and 300 mm off the floor, everywhere a walk can go`, () => {
        for (const [, aspect] of ASPECTS) {
          const lens = bayLens(points, seat, aspect);
          for (let azimuth = -180; azimuth < 180; azimuth += 5) {
            for (let elevation = -30; elevation <= 90; elevation += 5) {
              const viewer = clampViewer({ azimuthDeg: azimuth, elevationDeg: elevation, sightDeg: 0 }, seat, lens);
              const { position, axes } = viewerPlace(viewer, lens, seat);
              expect(Math.abs(position[0])).toBeLessThanOrEqual(BAY.lengthMm / 2 - BAY.viewerMarginMm + 1);
              expect(Math.abs(position[2])).toBeLessThanOrEqual(BAY.widthMm / 2 - BAY.viewerMarginMm + 1);
              expect(position[1]).toBeGreaterThanOrEqual(BAY.viewerFloorMm - 1);
              // The eye looks toward the board's side of the room.
              const pivot: Vec3 = [0, BAY.rackTopMm + seat.home, 0];
              expect(dot(axes.forward, [pivot[0] - position[0], pivot[1] - position[1], pivot[2] - position[2]])).toBeGreaterThan(0);
            }
          }
        }
      });
    }
  });

  it("clampViewer leaves a viewer inside the limits alone, holds elevation at both ends and wraps azimuth", () => {
    const { seat, points } = BOARDS[0];
    const lens = bayLens(points, seat, 1.3);
    const inside: Viewer = { azimuthDeg: 40, elevationDeg: 15, sightDeg: 3 };
    expect(clampViewer(inside, seat, lens)).toEqual(inside);
    expect(clampViewer({ ...inside, elevationDeg: 200 }, seat, lens).elevationDeg).toBeLessThan(90);
    const low = clampViewer({ ...inside, elevationDeg: -80 }, seat, lens);
    expect(low.elevationDeg).toBeLessThan(0);
    expect(viewerPlace(low, lens, seat).position[1]).toBeCloseTo(BAY.viewerFloorMm, 6);
    expect(clampViewer({ ...inside, azimuthDeg: 190 }, seat, lens).azimuthDeg).toBeCloseTo(-170, 9);
    expect(clampViewer({ ...inside, sightDeg: 99 }, seat, lens).sightDeg).toBe(SIGHT_LIMIT_DEG);
  });

  it("walkDrag: the shorter side is half a turn, and straight back undoes it exactly", () => {
    const start: Viewer = { azimuthDeg: 12, elevationDeg: 20, sightDeg: 2 };
    const moved = walkDrag(start, 400, 0, 400);
    expect(moved.azimuthDeg).toBe(192);
    expect(moved.sightDeg).toBe(2);
    const back = walkDrag(walkDrag(start, 33, -17, 400), -33, 17, 400);
    expect(back.azimuthDeg).toBeCloseTo(start.azimuthDeg, 12);
    expect(back.elevationDeg).toBeCloseTo(start.elevationDeg, 12);
    expect(walkDrag(start, 10, 10, 0)).toBe(start);
  });

  it("walkKey moves a key's worth, and the reverse key undoes it", () => {
    const start: Viewer = { azimuthDeg: 12, elevationDeg: 20, sightDeg: 0 };
    expect(walkKey(start, "right").azimuthDeg - start.azimuthDeg).toBe(KEY_TURN_DEG);
    expect(walkKey(walkKey(start, "up"), "down")).toEqual(start);
  });

  it("walkBetween takes the short way round, across ±180° too", () => {
    const a: Viewer = { azimuthDeg: 170, elevationDeg: 0, sightDeg: 0 };
    const b: Viewer = { azimuthDeg: -170, elevationDeg: 10, sightDeg: 4 };
    expect(walkBetween(a, b, 0.5)).toEqual({ azimuthDeg: 180, elevationDeg: 5, sightDeg: 2 });
    expect(walkBetween(a, b, 0)).toEqual(a);
  });

  it("walkGlideAt ends at GLIDE_MS and goes no further, and a flick is held to the glide's top speed", () => {
    const v = { azimuthDeg: 0.09, elevationDeg: 0 };
    const near = walkGlideAt(v, GLIDE_MS - 1);
    const end = walkGlideAt(v, GLIDE_MS);
    expect(near.done).toBe(false);
    expect(end.done).toBe(true);
    expect(walkGlideAt(v, GLIDE_MS * 3).azimuthDeg).toBe(end.azimuthDeg);
    expect(end.azimuthDeg).toBeCloseTo((0.09 * GLIDE_MS) / 3, 9);
    expect(walkGlideAt({ azimuthDeg: 0, elevationDeg: 0 }, 10).done).toBe(true);
    const flick = walkGlideAt({ azimuthDeg: 100, elevationDeg: 0 }, GLIDE_MS);
    expect(flick.azimuthDeg).toBeLessThan(600);
  });
});

describe("bayLens — where the viewer stands at 1x", () => {
  for (const { label, seat, points } of BOARDS) {
    for (const [name, aspect] of ASPECTS) {
      it(`${label} on a ${name} window: inside the room, and the board fits`, () => {
        const lens = bayLens(points, seat, aspect);
        expect(lens.distanceMm).toBeGreaterThanOrEqual(BAY.nearestMm);
        expect(lens.distanceMm).toBeLessThanOrEqual(wallReach(REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg) + 1e-6);
        expect(lens.lensDeg).toBeGreaterThanOrEqual(ROOM_CAMERA.fovDeg);
        for (const angles of [AT_REST, BOTTOM_UP]) {
          const crop = fillCrop(points, angles, REST_VIEWER, lens, seat, aspect, 1);
          // `fill / zoom` is the board's share of the window: the picture's box fits inside it.
          expect(1 / crop.zoom).toBeLessThanOrEqual(BAY.fit + 1e-3);
        }
      });
    }
  }
});

describe("Sight Along (D-44)", () => {
  for (const { label, seat, points, surface } of [...BOARDS, LONGEST]) {
    it(`${label}: reaches a true sight line down each rail, from the tail and from the nose`, () => {
      for (const [, aspect] of ASPECTS) {
        const lens = bayLens(points, seat, aspect);
        for (const name of ["nose", "tail"] as const) {
          const viewer = standAt(name, 0);
          const deg = railSightDeg(surface.width / 2, viewer, lens);
          expect(deg).toBeLessThan(SIGHT_LIMIT_DEG);
          // At that shift the eye stands square on the rail's own line: half the width off the stringer.
          for (const sign of [1, -1]) {
            const { position } = viewerPlace({ ...viewer, sightDeg: sign * deg }, lens, seat);
            const pivot = viewerPlace(viewer, lens, seat).position;
            // Within 2 mm: at the wall the stand-off itself shortens a hair as the eye moves off the line.
            expect(Math.abs(Math.abs(position[2] - pivot[2]) - surface.width / 2)).toBeLessThan(2);
          }
        }
      }
    });
  }

  it("+ moves the eye to the viewer's right, and only the eye", () => {
    const { seat, points } = BOARDS[0];
    const lens = bayLens(points, seat, 1.3);
    const viewer = standAt("tail", 0);
    const straight = viewerPlace(viewer, lens, seat);
    const shifted = viewerPlace({ ...viewer, sightDeg: 6 }, lens, seat);
    expect(dot(straight.axes.right, [shifted.position[0] - straight.position[0], 0, shifted.position[2] - straight.position[2]])).toBeGreaterThan(0);
  });
});

describe("fillCrop — Nose and Tail at their share of the window", () => {
  for (const { label, seat, points } of BOARDS) {
    it(`${label}: the zoom asked for brings the board to END_VIEW_FILL, centred`, () => {
      for (const [, aspect] of ASPECTS) {
        const lens = bayLens(points, seat, aspect);
        for (const name of ["nose", "tail"] as const) {
          const viewer = standAt(name, 0);
          const crop = fillCrop(points, AT_REST, viewer, lens, seat, aspect);
          expect(crop.zoom).toBeGreaterThan(1);
          // At twice the fill the zoom asks for exactly twice.
          expect(fillCrop(points, AT_REST, viewer, lens, seat, aspect, END_VIEW_FILL * 2).zoom).toBeCloseTo(2 * crop.zoom, 9);
          expect(Math.abs(crop.cx)).toBeLessThan(0.25);
          expect(Math.abs(crop.cy)).toBeLessThan(0.25);
        }
      }
    });
  }
});

describe("firstViewOutline — the loading picture", () => {
  const numbers = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

  for (const { label, seat, points } of BOARDS) {
    it(`${label}: an outline in the canvas's own dots, and the stringer inside it`, () => {
      const [width, height] = [804, 615];
      const lens = bayLens(points, seat, width / height);
      const art = firstViewOutline(points, points.slice(0, 40), lens, seat, width, height);
      const hull = numbers(art.board);
      expect(hull.length).toBeGreaterThan(8);
      for (const [x, y] of hull) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
      // Every point lies inside the convex outline, to a dot: the hull turns one way all the way round.
      let sign = 0;
      for (let i = 0; i < hull.length; i++) {
        const [a, b, c] = [hull[i], hull[(i + 1) % hull.length], hull[(i + 2) % hull.length]];
        const turn = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (Math.abs(turn) > 2) {
          sign = sign || Math.sign(turn);
          expect(Math.sign(turn)).toBe(sign);
        }
      }
      expect(art.bottom).toBeCloseTo(Math.max(...hull.map((p) => p[1])), 0);
    });
  }
});

describe("the views, as names", () => {
  it("cover every button", () => {
    for (const name of VIEW_NAMES) expect(WALK_VIEWS[name]).toBeDefined();
  });

  it("a turn is a Quat, plain numbers, so nothing here can reach the store", () => {
    const q: Quat = rackTurn(AT_REST);
    expect(q).toHaveLength(4);
  });
});
