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
  bayBackLogo,
  bayLens,
  baySideLogo,
  boardPlace,
  BOTTOM_UP,
  clampLift,
  clampViewer,
  firstViewOutline,
  headingOf,
  floorPatch,
  freePlace,
  isBottomUp,
  isRaised,
  liftOfRaise,
  lookOfSwing,
  overPad,
  rackAngles,
  rackDrag,
  rackKey,
  rackNudge,
  rackSeat,
  rackTurn,
  raiseArmMm,
  raiseOfLift,
  raiseSlider,
  railSightDeg,
  REST_VIEWER,
  settleOnRacks,
  shownAngles,
  SIGHT_LIMIT_DEG,
  sightShown,
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
  type BayLens,
  type RackAngles,
  type RackSeat,
  type Viewer,
} from "./shaping-bay";
import { inchesToMm, mm, mmToInches } from "./units";
import {
  BOARD_TO_ROOM,
  dragTurn,
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

/** Inside a pad, how deep: its head stands `at` from the room's middle, its top at `rackTopMm`, 50 mm thick. */
function depthInPad(p: Vec3, at: number): number {
  const across = BAY.padHalfSpanMm - Math.abs(p[2]);
  const along = BAY.padHalfDepthMm - Math.abs(Math.abs(p[0]) - at);
  const down = BAY.rackTopMm - p[1];
  const up = p[1] - (BAY.rackTopMm - 50);
  return Math.min(across, along, down, up);
}

describe("the room", () => {
  it("is the same size for every board, and the app's longest board fits down it", () => {
    expect(inchesToMm(120) / 2).toBeLessThan(BAY.lengthMm / 2);
  });

  it("each strip hangs under its one shelf, behind the shelf's front edge (the founder)", () => {
    expect(BAY.stripHeightMm + BAY.stripFaceMm / 2).toBeLessThan(BAY.benchTopMm - BAY.benchThickMm);
    expect(BAY.stripInsetMm + BAY.stripFaceMm / 2).toBeLessThanOrEqual(BAY.benchDepthMm);
    expect(Object.keys(BAY).filter((key) => key.startsWith("sill"))).toEqual([]);
  });

  it("a standing eye at the first view sees the strip below the shelf's front edge, on every preset", () => {
    for (const { seat, points } of BOARDS) {
      for (const [, aspect] of ASPECTS) {
        const { position } = viewerPlace(REST_VIEWER, bayLens(points, seat, aspect), seat);
        // The line from the eye to the strip's lower front corner, read where it passes under the shelf's front edge.
        const lipZ = BAY.widthMm / 2 - BAY.benchDepthMm;
        const stripZ = BAY.widthMm / 2 - BAY.stripInsetMm - BAY.stripFaceMm / 2;
        const stripY = BAY.stripHeightMm - BAY.stripFaceMm / 2;
        const atLip = position[1] + ((stripY - position[1]) * (lipZ - position[2])) / (stripZ - position[2]);
        expect(atLip).toBeLessThan(BAY.benchTopMm - BAY.benchThickMm);
      }
    }
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

describe("a hand on the racks: the board moves, the racks never do", () => {
  const FROM_TAIL = REST_VIEWER;
  const FROM_NOSE: Viewer = standAt("nose", 0);
  const FROM_RAIL: Viewer = standAt("side", 0);
  const start: RackAngles = { swing: 0, lift: 12, roll: 20 };
  const endForEnd: RackAngles = { swing: 180, lift: 12, roll: 20 };

  it("a sideways drag from behind the tail is Rotate on Side, to the hand's right, at a drag's full rate", () => {
    expect(rackNudge(start, 30, 0, FROM_TAIL)).toEqual({ swing: 0, lift: 12, roll: expect.closeTo(50, 9) });
  });

  it("from the nose the same drag rolls the other way: the hand still goes to the picture's right", () => {
    expect(rackNudge(start, 30, 0, FROM_NOSE).roll).toBeCloseTo(-10, 9);
  });

  it("with the board end for end the hand gets the same answer from the one view as standing at the nose", () => {
    const turned = rackNudge(endForEnd, 30, 10, FROM_TAIL);
    const walked = rackNudge(start, 30, 10, FROM_NOSE);
    expect(turned.roll).toBeCloseTo(walked.roll, 9);
    expect(turned.lift).toBeCloseTo(walked.lift, 9);
    // A drag down lifts the far end: on a board end for end that is the tail.
    expect(rackNudge({ ...AT_REST, swing: 180 }, 0, 30, FROM_TAIL).lift).toBeCloseTo(-30, 9);
  });

  it("from the rail a sideways drag tips the board end over end, and a drag down rolls it", () => {
    const across = rackNudge(start, 30, 0, FROM_RAIL);
    expect(across.lift).toBeCloseTo(42, 9);
    expect(across.roll).toBeCloseTo(20, 9);
    const down = rackNudge(start, 0, 30, FROM_RAIL);
    expect(down.roll).toBeCloseTo(-10, 9);
    expect(down.lift).toBeCloseTo(12, 9);
  });

  it("a drag down from behind the tail raises the nose, as it always has", () => {
    expect(rackNudge(start, 0, 30, FROM_TAIL).lift).toBeCloseTo(42, 9);
  });

  it("a vertical drag matches a free drag exactly on a board at rest", () => {
    const short = 400;
    const free = dragTurn(REST_TURN, 0, 80, short, viewerLook(FROM_TAIL));
    expect(turnAngle(rackTurn(rackDrag(AT_REST, 0, 80, short, FROM_TAIL)), free)).toBeLessThan(1e-9);
  });

  it("no drag from anywhere, of any size, ever changes the board's heading, and the lift stops at its limit", () => {
    const random = seeded(16118);
    for (const heading of [0, 180, 7, -12]) {
      let angles: RackAngles = { ...AT_REST, swing: heading };
      for (let i = 0; i < 700; i++) {
        const viewer: Viewer = { azimuthDeg: random() * 360 - 180, elevationDeg: random() * 90, sightDeg: random() * 12 - 6 };
        angles = rackDrag(angles, (random() - 0.5) * 300, (random() - 0.5) * 300, 400, viewer);
        expect(angles.swing).toBe(heading);
        expect(Math.abs(angles.lift)).toBeLessThanOrEqual(BAY.liftLimitDeg);
      }
    }
  });

  it("a drag straight back undoes it, inside the limit", () => {
    const there = rackDrag(start, 33, -17, 400, FROM_TAIL);
    const back = rackDrag(there, -33, 17, 400, FROM_TAIL);
    expect(back.lift).toBeCloseTo(start.lift, 9);
    expect(back.roll).toBeCloseTo(start.roll, 9);
    expect(rackDrag(start, 33, 17, 0, FROM_TAIL)).toBe(start);
  });

  it("the arrow keys take the same road, a key's worth at a time", () => {
    expect(rackKey(AT_REST, "right", FROM_TAIL).roll).toBeCloseTo(KEY_TURN_DEG, 9);
    expect(rackKey(AT_REST, "left", FROM_TAIL).roll).toBeCloseTo(-KEY_TURN_DEG, 9);
    expect(rackKey(AT_REST, "down", FROM_TAIL).lift).toBeCloseTo(KEY_TURN_DEG, 9);
    expect(rackKey(AT_REST, "up", FROM_TAIL).lift).toBeCloseTo(-KEY_TURN_DEG, 9);
  });

  it("a free-spun board settles back straight down the room, whichever end is nearer, inside the limit, its roll kept", () => {
    const near = rackAngles(settleOnRacks(rackTurn({ swing: 70, lift: 80, roll: 30 })));
    expect(Math.abs(near.swing)).toBeLessThan(1e-9);
    expect(near.lift).toBeCloseTo(BAY.liftLimitDeg, 9);
    expect(near.roll).toBeCloseTo(30, 9);
    const far = rackAngles(settleOnRacks(rackTurn({ swing: 120, lift: 10, roll: 30 })));
    expect(Math.abs(far.swing)).toBeCloseTo(180, 9);
  });

  it("headingOf reads which end lies toward the first view, and lookOfSwing how far the board stands off it", () => {
    expect(headingOf(0)).toBe(0);
    expect(headingOf(14)).toBe(0);
    expect(headingOf(170)).toBe(180);
    expect(headingOf(-179)).toBe(180);
    expect(lookOfSwing(6, 0)).toBe(6);
    expect(lookOfSwing(186, 180)).toBe(6);
    expect(lookOfSwing(-174, 180)).toBe(6);
    expect(lookOfSwing(90, 0)).toBe(SIGHT_LIMIT_DEG);
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

      it("turned over the pads it rests on what the pad's corners reach, and square to them it reads as it always has", () => {
        for (const roll of [0, 45, 90, 150, 180]) {
          expect(overPad(seat, roll, 0)).toBe(overPad(seat, roll));
          expect(overPad(seat, roll, 180)).toBeCloseTo(overPad(seat, roll), 6);
          expect(overPad(seat, roll, SIGHT_LIMIT_DEG)).toBeGreaterThanOrEqual(overPad(seat, roll));
        }
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

      it("end for end on the same racks: the board tips over the rack on its own far side, which stands at the other end", () => {
        const here = boardPlace(points, { swing: 0, lift: 30, roll: 0 }, seat);
        const turned = boardPlace(points, { swing: 180, lift: 30, roll: 0 }, seat);
        expect(turned[0]).toBeCloseTo(-here[0], 6);
        expect(turned[1]).toBeCloseTo(here[1], 9);
        expect(turned[2]).toBeCloseTo(0, 6);
      });

      it("end for end or turned a few degrees, no vertex lies 2 mm inside a pad, raised or rolled", () => {
        for (const swing of [180, -SIGHT_LIMIT_DEG, SIGHT_LIMIT_DEG, 180 - SIGHT_LIMIT_DEG, 180 + SIGHT_LIMIT_DEG]) {
          for (const lift of [-60, -30, 0, 30, 60]) {
            // Every 30°: a coarser grid stepped over a board nearly bottom up, 4.6 mm into a pad at roll 150.
            for (let roll = -180; roll < 180; roll += 30) {
              const angles = { swing, lift, roll };
              const place = boardPlace(all, angles, seat);
              let deepest = -Infinity;
              for (const p of all) deepest = Math.max(deepest, depthInPad(inRoom(p, angles, place), seat.at));
              expect(deepest, `swing ${swing}, lift ${lift}, roll ${roll}`).toBeLessThanOrEqual(2);
            }
          }
        }
      }, 120_000);

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

  it("no fin point lies inside a pad at rest, rolled 45°, end for end or turned for Look Down the Rail, in any fin setup on any preset", () => {
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
            { ...AT_REST, swing: 180 },
            { ...AT_REST, swing: SIGHT_LIMIT_DEG },
            { ...AT_REST, swing: -SIGHT_LIMIT_DEG },
            { ...AT_REST, swing: 180 + SIGHT_LIMIT_DEG },
            { ...AT_REST, swing: 180 - SIGHT_LIMIT_DEG },
            { swing: SIGHT_LIMIT_DEG, lift: 0, roll: 45 },
            { swing: -SIGHT_LIMIT_DEG, lift: 0, roll: -45 },
            { swing: SIGHT_LIMIT_DEG, lift: BAY.liftLimitDeg, roll: 0 },
            { swing: -SIGHT_LIMIT_DEG, lift: -BAY.liftLimitDeg, roll: 0 },
          ]) {
            expect(depthInPad(inRoom(p, angles, boardPlace(points, angles, seat)), seat.at)).toBeLessThan(0);
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

  it("a speck of lift from reading a turn back is not a raise; a real one is", () => {
    expect(isRaised(1e-13)).toBe(false);
    expect(isRaised(0)).toBe(false);
    expect(isRaised(0.5)).toBe(true);
    expect(isRaised(Math.max(0, -rackAngles(rackTurn({ swing: 6, lift: 0, roll: 30 })).lift))).toBe(false);
  });

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

  it("with a free-spun board, Nose, Tail and Side go where its ends and rail are now", () => {
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

  it("Deck and Bottom stand directly above the board, nose toward the back wall, tail toward the first view", () => {
    for (const name of ["deck", "bottom"] as const) {
      expect(standAt(name, 40)).toEqual(WALK_VIEWS[name]);
      const { up, forward } = viewerLook(WALK_VIEWS[name]);
      expect(forward[1]).toBeCloseTo(-1, 4);
      const nose = rotateVec(BOARD_TO_ROOM, [1, 0, 0]);
      // The picture's up runs from the tail to the nose: the back wall is at the top.
      expect(dot(up, nose)).toBeCloseTo(1, 4);
      expect(WALK_VIEWS[name].azimuthDeg).toBe(REST_VIEWER.azimuthDeg);
    }
  });

  it("Side stands square to the board, with a strip on the wall behind it", () => {
    const { position, axes } = viewerPlace(standAt("side", 0), bayLens(BOARDS[0].points, BOARDS[0].seat, 1.3), BOARDS[0].seat);
    expect(axes.forward[2]).toBeCloseTo(-1, 9);
    expect(position[2]).toBeGreaterThan(0);
    expect(stripEnds()[0][0][2]).toBeLessThan(0);
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

  it("the Look Down the Rail limit is the founder's 25°", () => {
    expect(SIGHT_LIMIT_DEG).toBe(25);
  });

  for (const { label, seat, points } of [...BOARDS, LONGEST]) {
    it(`${label}: at the full Look Down the Rail from either end the eye stays in the room, on every window`, () => {
      for (const [, aspect] of ASPECTS) {
        const lens = bayLens(points, seat, aspect);
        for (const name of ["nose", "tail"] as const) {
          for (const sightDeg of [-SIGHT_LIMIT_DEG, SIGHT_LIMIT_DEG]) {
            const viewer = clampViewer({ ...standAt(name, 0), sightDeg }, seat, lens);
            expect(viewer.sightDeg).toBe(sightDeg);
            const { position, axes } = viewerPlace(viewer, lens, seat);
            expect(Math.abs(position[0])).toBeLessThanOrEqual(BAY.lengthMm / 2 - BAY.viewerMarginMm + 1);
            expect(Math.abs(position[2])).toBeLessThanOrEqual(BAY.widthMm / 2 - BAY.viewerMarginMm + 1);
            expect(position[1]).toBeGreaterThanOrEqual(BAY.viewerFloorMm - 1);
            expect(dot(axes.forward, [-position[0], BAY.rackTopMm + seat.home - position[1], -position[2]])).toBeGreaterThan(0);
          }
        }
      }
    });
  }

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

/** How far from the window's middle a pose reaches at the first view, as a share of the half-window. */
function reachInWindow(points: readonly Vec3[], angles: RackAngles, lens: BayLens, seat: RackSeat, aspect: number): number {
  const { position, axes } = viewerPlace(REST_VIEWER, lens, seat);
  const place = boardPlace(points, angles, seat);
  const tanV = Math.tan((lens.lensDeg * Math.PI) / 360);
  let reach = 0;
  for (const p of points) {
    const room = inRoom(p, angles, place);
    const r: Vec3 = [room[0] - position[0], room[1] - position[1], room[2] - position[2]];
    const depth = dot(r, axes.forward);
    reach = Math.max(reach, Math.abs(dot(r, axes.right)) / (depth * tanV * aspect), Math.abs(dot(r, axes.up)) / (depth * tanV));
  }
  return reach;
}

describe("bayLens — where the viewer stands at 1x", () => {
  for (const { label, seat, points } of BOARDS) {
    for (const [name, aspect] of ASPECTS) {
      it(`${label} on a ${name} window: inside the room, and the board fits`, () => {
        const lens = bayLens(points, seat, aspect);
        expect(lens.distanceMm).toBeGreaterThanOrEqual(BAY.nearestMm);
        expect(lens.distanceMm).toBeLessThanOrEqual(wallReach(REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg) + 1e-6);
        expect(lens.lensDeg).toBeGreaterThanOrEqual(ROOM_CAMERA.fovDeg);
        for (const angles of [AT_REST, BOTTOM_UP]) {
          expect(reachInWindow(points, angles, lens, seat, aspect)).toBeLessThanOrEqual(BAY.fit + 1e-3);
        }
      });
    }
  }
});

describe("the logos on the walls (the founder, 2026-11-06)", () => {
  it("the circle takes 40% of the side wall above the lights, centred in that space", () => {
    const space = BAY.heightMm - BAY.benchTopMm;
    const { sizeMm, centreYMm } = baySideLogo();
    expect(sizeMm).toBeCloseTo(0.4 * space, 9);
    expect(centreYMm - BAY.benchTopMm).toBeCloseTo(BAY.heightMm - centreYMm, 9);
  });

  it("a line logo that fits is 20% of the wall tall, its top 20% of the wall down", () => {
    const { heightMm, centreYMm } = bayBackLogo(4);
    expect(heightMm).toBeCloseTo(0.2 * BAY.heightMm, 9);
    expect(BAY.heightMm - (centreYMm + heightMm / 2)).toBeCloseTo(0.2 * BAY.heightMm, 9);
  });

  it("the real line logo would run off the wall at 20%, so it stops at 90% of the wall across with its top in the same place", () => {
    const aspect = 806.1 / 100;
    expect(0.2 * BAY.heightMm * aspect).toBeGreaterThan(BAY.widthMm);
    const { widthMm, heightMm, centreYMm } = bayBackLogo(aspect);
    expect(widthMm).toBeCloseTo(0.9 * BAY.widthMm, 9);
    expect(widthMm / heightMm).toBeCloseTo(aspect, 9);
    expect(BAY.heightMm - (centreYMm + heightMm / 2)).toBeCloseTo(0.2 * BAY.heightMm, 9);
  });
});

describe("Look Down the Rail (D-44)", () => {
  it("the panel shows the nearest half degree, the same either side, and a hair off the stringer reads as on it", () => {
    expect(sightShown(5.684341886080802e-14)).toBe(0); // the reading the founder saw, 2026-11-06
    expect(sightShown(-5.684341886080802e-14)).toBe(0);
    expect(sightShown(0.2)).toBe(0);
    expect(sightShown(6.25)).toBe(6.5);
    expect(sightShown(-6.25)).toBe(-6.5);
    expect(sightShown(6.5)).toBe(6.5);
    expect(sightShown(-SIGHT_LIMIT_DEG)).toBe(-SIGHT_LIMIT_DEG);
  });

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
