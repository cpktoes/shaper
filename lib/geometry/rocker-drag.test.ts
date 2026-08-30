import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildRocker, ROCKER_LIFT_RANGE_IN, type RockerSpec } from "./rocker";
import { sideProfileDragPoints, solveSideProfileDrag, type SideProfileDragTarget } from "./rocker-drag";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

const ROCKER: RockerSpec = DEFAULT_BOARD_SPEC.rocker;
const LENGTH: Mm = DEFAULT_BOARD_SPEC.outline.length;
const GEOMETRY = buildRocker(ROCKER, LENGTH);

/** The rocker line's only two grab targets — the centre is the fixed zero and never reachable. */
const TIPS: SideProfileDragTarget[] = ["tailTip", "noseTip"];

function findPoint(geometry: ReturnType<typeof buildRocker>, target: SideProfileDragTarget) {
  const point = sideProfileDragPoints(geometry).find((p) => p.target === target);
  if (!point) throw new Error(`no drag point for ${target}`);
  return point;
}

describe("sideProfileDragPoints", () => {
  it("returns exactly two points for any board length in range: the tail tip and the nose tip, nothing else", () => {
    for (const lengthIn of [60, 90, 120]) {
      const length = inchesToMm(lengthIn);
      const geometry = buildRocker(ROCKER, length);
      const points = sideProfileDragPoints(geometry);
      expect(points).toHaveLength(2);
      expect(points.map((p) => p.target).sort()).toEqual(["noseTip", "tailTip"]);
    }
  });

  it("each point equals the geometry's own tip knot — the overlay and the drag targets share one source", () => {
    const tail = findPoint(GEOMETRY, "tailTip");
    expect(tail.point.station).toBe(GEOMETRY.knots[0].point.x);
    expect(tail.point.height).toBe(GEOMETRY.knots[0].point.y);

    const nose = findPoint(GEOMETRY, "noseTip");
    expect(nose.point.station).toBe(GEOMETRY.knots[2].point.x);
    expect(nose.point.height).toBe(GEOMETRY.knots[2].point.y);
  });
});

describe("round trip", () => {
  for (const target of TIPS) {
    it(`${target}: dragging 0.75in higher, solving and rebuilding lands the tip at the dragged (snapped, clamped) height`, () => {
      const before = findPoint(GEOMETRY, target);
      const dragged = { station: before.point.station, height: mm(before.point.height + inchesToMm(0.75)) };

      const patch = solveSideProfileDrag(target, dragged);
      const field = target === "noseTip" ? "noseLift" : "tailLift";
      const solvedValue = patch[field] as Mm;

      const nextRocker = { ...ROCKER, ...patch };
      const nextGeometry = buildRocker(nextRocker, LENGTH);
      const after = findPoint(nextGeometry, target);
      expect(mmToInches(after.point.height)).toBeCloseTo(mmToInches(solvedValue), 9);
    });
  }
});

describe("every solved value is slider-representable", () => {
  for (const target of TIPS) {
    it(`${target}: dragging to an awkward height lands on the ROCKER_LIFT_RANGE_IN step and within bounds`, () => {
      const patch = solveSideProfileDrag(target, { station: mm(0), height: inchesToMm(3.1234) });
      const field = target === "noseTip" ? "noseLift" : "tailLift";
      const inches = mmToInches(patch[field] as Mm);
      const steps = inches / ROCKER_LIFT_RANGE_IN.step;
      expect(steps).toBeCloseTo(Math.round(steps), 9);
      expect(inches).toBeGreaterThanOrEqual(ROCKER_LIFT_RANGE_IN.min);
      expect(inches).toBeLessThanOrEqual(ROCKER_LIFT_RANGE_IN.max);
    });
  }
});

describe("non-finite input", () => {
  it("returns the range minimum, matching quantise's own fallback", () => {
    const patch = solveSideProfileDrag("noseTip", { station: mm(Number.NaN), height: mm(Number.NaN) });
    expect(mmToInches(patch.noseLift as Mm)).toBeCloseTo(ROCKER_LIFT_RANGE_IN.min, 9);
  });
});

describe("a solved patch carries exactly one key", () => {
  for (const target of TIPS) {
    it(`${target} touches only its own field — noseLift for the nose tip, tailLift for the tail tip`, () => {
      const patch = solveSideProfileDrag(target, { station: mm(0), height: inchesToMm(2) });
      expect(Object.keys(patch)).toEqual([target === "noseTip" ? "noseLift" : "tailLift"]);
    });
  }
});
