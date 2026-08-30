import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC } from "./board";
import {
  buildRocker,
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_SMOOTHNESS_RANGE,
  type RockerSpec,
} from "./rocker";
import { sideProfileDragPoints, solveSideProfileDrag, type SideProfileDragTarget } from "./rocker-drag";
import { type Mm, inchesToMm, mm } from "./units";

const ROCKER: RockerSpec = DEFAULT_BOARD_SPEC.rocker;
const LENGTH: Mm = DEFAULT_BOARD_SPEC.outline.length;
const GEOMETRY = buildRocker(ROCKER, LENGTH);

/** The four control-point targets, in `buildRocker`'s own handle order. */
const TARGETS: SideProfileDragTarget[] = ["tailTipHandle", "tailFlatHandle", "noseFlatHandle", "noseTipHandle"];

/** A deliberately off-default spec, so identity properties are not accidentally true only at the
 * defaults. */
const OFF_DEFAULT_ROCKER: RockerSpec = {
  ...ROCKER,
  tailAngle: 12 as RockerSpec["tailAngle"],
  noseAngle: 47 as RockerSpec["noseAngle"],
  tailSmoothness: 15,
  noseSmoothness: 88,
  tailFlatness: 30,
  noseFlatness: 92,
};

function findPoint(geometry: ReturnType<typeof buildRocker>, target: SideProfileDragTarget) {
  const found = sideProfileDragPoints(geometry).find((p) => p.target === target);
  if (!found) throw new Error(`no drag point for ${target}`);
  return found;
}

describe("sideProfileDragPoints", () => {
  it("returns exactly four control points for any board length in range, and nothing else", () => {
    for (const lengthIn of [60, 90, 120]) {
      const length = inchesToMm(lengthIn);
      const geometry = buildRocker(ROCKER, length);
      const points = sideProfileDragPoints(geometry);
      expect(points).toHaveLength(4);
      expect(points.map((p) => p.target)).toEqual(["tailTipHandle", "tailFlatHandle", "noseFlatHandle", "noseTipHandle"]);
    }
  });

  it("each entry equals the geometry's own handle at the same index — the overlay and the drag targets share one source", () => {
    const points = sideProfileDragPoints(GEOMETRY);
    for (let i = 0; i < 4; i++) {
      expect(points[i].point.station).toBe(GEOMETRY.handles[i].to.x);
      expect(points[i].point.height).toBe(GEOMETRY.handles[i].to.y);
      expect(points[i].anchor.station).toBe(GEOMETRY.handles[i].from.x);
      expect(points[i].anchor.height).toBe(GEOMETRY.handles[i].from.y);
    }
  });

  it("no returned target is a tip knot, and no solve ever returns a lift field", () => {
    for (const target of TARGETS) {
      const point = findPoint(GEOMETRY, target);
      const patch = solveSideProfileDrag(GEOMETRY, target, point.point);
      expect(patch).not.toHaveProperty("noseLift");
      expect(patch).not.toHaveProperty("tailLift");
    }
  });
});

describe("identity: solving at a target's own current point returns its own current value", () => {
  for (const spec of [ROCKER, OFF_DEFAULT_ROCKER]) {
    describe(spec === ROCKER ? "default spec" : "off-default spec", () => {
      const geometry = buildRocker(spec, LENGTH);

      it("tailTipHandle recovers tailAngle and tailSmoothness", () => {
        const p = findPoint(geometry, "tailTipHandle");
        const patch = solveSideProfileDrag(geometry, "tailTipHandle", p.point);
        expect(patch.tailAngle).toBeCloseTo(spec.tailAngle, 0);
        expect(Math.abs((patch.tailSmoothness as number) - spec.tailSmoothness)).toBeLessThanOrEqual(
          ROCKER_SMOOTHNESS_RANGE.step + 1e-6,
        );
      });

      it("noseTipHandle recovers noseAngle and noseSmoothness", () => {
        const p = findPoint(geometry, "noseTipHandle");
        const patch = solveSideProfileDrag(geometry, "noseTipHandle", p.point);
        expect(patch.noseAngle).toBeCloseTo(spec.noseAngle, 0);
        expect(Math.abs((patch.noseSmoothness as number) - spec.noseSmoothness)).toBeLessThanOrEqual(
          ROCKER_SMOOTHNESS_RANGE.step + 1e-6,
        );
      });

      it("tailFlatHandle recovers tailFlatness", () => {
        const p = findPoint(geometry, "tailFlatHandle");
        const patch = solveSideProfileDrag(geometry, "tailFlatHandle", p.point);
        expect(patch.tailFlatness).toBeCloseTo(spec.tailFlatness, 1);
      });

      it("noseFlatHandle recovers noseFlatness", () => {
        const p = findPoint(geometry, "noseFlatHandle");
        const patch = solveSideProfileDrag(geometry, "noseFlatHandle", p.point);
        expect(patch.noseFlatness).toBeCloseTo(spec.noseFlatness, 1);
      });
    });
  }
});

describe("round trip", () => {
  it("tailTipHandle: drag both coordinates, solve, rebuild, re-solve — second patch equals first", () => {
    const before = findPoint(GEOMETRY, "tailTipHandle");
    const dragged = {
      station: mm(before.point.station + inchesToMm(0.4)),
      height: mm(before.point.height + inchesToMm(0.6)),
    };
    const patch1 = solveSideProfileDrag(GEOMETRY, "tailTipHandle", dragged);
    const nextRocker = { ...ROCKER, ...patch1 };
    const nextGeometry = buildRocker(nextRocker, LENGTH);
    const after = findPoint(nextGeometry, "tailTipHandle");
    const patch2 = solveSideProfileDrag(nextGeometry, "tailTipHandle", after.point);
    expect(patch2.tailAngle).toBeCloseTo(patch1.tailAngle as number, 6);
    expect(patch2.tailSmoothness).toBeCloseTo(patch1.tailSmoothness as number, 6);
  });

  it("noseTipHandle: drag both coordinates, solve, rebuild, re-solve — second patch equals first", () => {
    const before = findPoint(GEOMETRY, "noseTipHandle");
    const dragged = {
      station: mm(before.point.station - inchesToMm(0.5)),
      height: mm(before.point.height + inchesToMm(0.7)),
    };
    const patch1 = solveSideProfileDrag(GEOMETRY, "noseTipHandle", dragged);
    const nextRocker = { ...ROCKER, ...patch1 };
    const nextGeometry = buildRocker(nextRocker, LENGTH);
    const after = findPoint(nextGeometry, "noseTipHandle");
    const patch2 = solveSideProfileDrag(nextGeometry, "noseTipHandle", after.point);
    expect(patch2.noseAngle).toBeCloseTo(patch1.noseAngle as number, 6);
    expect(patch2.noseSmoothness).toBeCloseTo(patch1.noseSmoothness as number, 6);
  });

  it("tailFlatHandle: drag the station, solve, rebuild, re-solve — second patch equals first", () => {
    const before = findPoint(GEOMETRY, "tailFlatHandle");
    const dragged = { station: mm(before.point.station - inchesToMm(1.5)), height: before.point.height };
    const patch1 = solveSideProfileDrag(GEOMETRY, "tailFlatHandle", dragged);
    const nextRocker = { ...ROCKER, ...patch1 };
    const nextGeometry = buildRocker(nextRocker, LENGTH);
    const after = findPoint(nextGeometry, "tailFlatHandle");
    const patch2 = solveSideProfileDrag(nextGeometry, "tailFlatHandle", after.point);
    expect(patch2.tailFlatness).toBeCloseTo(patch1.tailFlatness as number, 6);
  });

  it("noseFlatHandle: drag the station, solve, rebuild, re-solve — second patch equals first", () => {
    const before = findPoint(GEOMETRY, "noseFlatHandle");
    const dragged = { station: mm(before.point.station + inchesToMm(1.5)), height: before.point.height };
    const patch1 = solveSideProfileDrag(GEOMETRY, "noseFlatHandle", dragged);
    const nextRocker = { ...ROCKER, ...patch1 };
    const nextGeometry = buildRocker(nextRocker, LENGTH);
    const after = findPoint(nextGeometry, "noseFlatHandle");
    const patch2 = solveSideProfileDrag(nextGeometry, "noseFlatHandle", after.point);
    expect(patch2.noseFlatness).toBeCloseTo(patch1.noseFlatness as number, 6);
  });
});

describe("constrained axis: the two centre handles ignore the height component of a drag", () => {
  it("tailFlatHandle: two drags that differ only in height produce identical patches", () => {
    const p = findPoint(GEOMETRY, "tailFlatHandle");
    const a = { station: mm(p.point.station - inchesToMm(1)), height: mm(0) };
    const b = { station: mm(p.point.station - inchesToMm(1)), height: inchesToMm(50) };
    expect(solveSideProfileDrag(GEOMETRY, "tailFlatHandle", a)).toEqual(
      solveSideProfileDrag(GEOMETRY, "tailFlatHandle", b),
    );
  });

  it("noseFlatHandle: two drags that differ only in height produce identical patches", () => {
    const p = findPoint(GEOMETRY, "noseFlatHandle");
    const a = { station: mm(p.point.station + inchesToMm(1)), height: mm(0) };
    const b = { station: mm(p.point.station + inchesToMm(1)), height: inchesToMm(-50) };
    expect(solveSideProfileDrag(GEOMETRY, "noseFlatHandle", a)).toEqual(
      solveSideProfileDrag(GEOMETRY, "noseFlatHandle", b),
    );
  });
});

describe("every solved value is slider-representable", () => {
  const awkward: Record<SideProfileDragTarget, SideProfileDragPointLike> = {
    tailTipHandle: { station: inchesToMm(3.1234), height: inchesToMm(4.5678) },
    noseTipHandle: { station: inchesToMm(65.4321), height: inchesToMm(3.9999) },
    tailFlatHandle: { station: inchesToMm(-500), height: mm(0) },
    noseFlatHandle: { station: inchesToMm(5000), height: mm(0) },
  };

  for (const target of TARGETS) {
    it(`${target}: an awkward, out-of-envelope drag still lands on-step and in-bounds`, () => {
      const patch = solveSideProfileDrag(GEOMETRY, target, awkward[target]);
      for (const [key, value] of Object.entries(patch)) {
        const range =
          key === "tailAngle" || key === "noseAngle"
            ? ROCKER_ANGLE_RANGE_DEG
            : key === "tailSmoothness" || key === "noseSmoothness"
              ? ROCKER_SMOOTHNESS_RANGE
              : ROCKER_FLATNESS_RANGE;
        const steps = (value as number) / range.step;
        expect(steps).toBeCloseTo(Math.round(steps), 6);
        expect(value as number).toBeGreaterThanOrEqual(range.min);
        expect(value as number).toBeLessThanOrEqual(range.max);
      }
    });
  }
});

interface SideProfileDragPointLike {
  station: Mm;
  height: Mm;
}

describe("direction of effect: dragging further from the tip lowers smoothness", () => {
  it("tailTipHandle: further along the same direction lowers smoothness; a zero-length drag returns the maximum", () => {
    const tip = GEOMETRY.knots[0].point;
    const dirAngleRad = Math.atan2(-(GEOMETRY.handles[0].to.y - tip.y), GEOMETRY.handles[0].to.x - tip.x);
    const dir = { x: Math.cos(dirAngleRad), y: -Math.sin(dirAngleRad) };
    const near = { station: mm(tip.x + dir.x * inchesToMm(0.5)), height: mm(tip.y + dir.y * inchesToMm(0.5)) };
    const far = { station: mm(tip.x + dir.x * inchesToMm(4)), height: mm(tip.y + dir.y * inchesToMm(4)) };

    const nearSmoothness = solveSideProfileDrag(GEOMETRY, "tailTipHandle", near).tailSmoothness as number;
    const farSmoothness = solveSideProfileDrag(GEOMETRY, "tailTipHandle", far).tailSmoothness as number;
    expect(farSmoothness).toBeLessThan(nearSmoothness);

    const zero = solveSideProfileDrag(GEOMETRY, "tailTipHandle", { station: tip.x, height: tip.y });
    expect(zero.tailSmoothness).toBe(ROCKER_SMOOTHNESS_RANGE.max);
    expect(zero).not.toHaveProperty("tailAngle");
  });

  it("noseTipHandle: further along the same direction lowers smoothness; a zero-length drag returns the maximum", () => {
    const tip = GEOMETRY.knots[2].point;
    const handleTo = GEOMETRY.handles[3].to;
    const vx = handleTo.x - tip.x;
    const vy = handleTo.y - tip.y;
    const len = Math.hypot(vx, vy);
    const dir = { x: vx / len, y: vy / len };
    const near = { station: mm(tip.x + dir.x * inchesToMm(0.5)), height: mm(tip.y + dir.y * inchesToMm(0.5)) };
    const far = { station: mm(tip.x + dir.x * inchesToMm(4)), height: mm(tip.y + dir.y * inchesToMm(4)) };

    const nearSmoothness = solveSideProfileDrag(GEOMETRY, "noseTipHandle", near).noseSmoothness as number;
    const farSmoothness = solveSideProfileDrag(GEOMETRY, "noseTipHandle", far).noseSmoothness as number;
    expect(farSmoothness).toBeLessThan(nearSmoothness);

    const zero = solveSideProfileDrag(GEOMETRY, "noseTipHandle", { station: tip.x, height: tip.y });
    expect(zero.noseSmoothness).toBe(ROCKER_SMOOTHNESS_RANGE.max);
    expect(zero).not.toHaveProperty("noseAngle");
  });
});

describe("degenerate input", () => {
  for (const target of TARGETS) {
    it(`${target}: non-finite coordinates return values inside every relevant range and do not throw`, () => {
      const patch = solveSideProfileDrag(GEOMETRY, target, { station: mm(Number.NaN), height: mm(Number.NaN) });
      expect(() => patch).not.toThrow();
      for (const [key, value] of Object.entries(patch)) {
        const range =
          key === "tailAngle" || key === "noseAngle"
            ? ROCKER_ANGLE_RANGE_DEG
            : key === "tailSmoothness" || key === "noseSmoothness"
              ? ROCKER_SMOOTHNESS_RANGE
              : ROCKER_FLATNESS_RANGE;
        expect(Number.isFinite(value as number)).toBe(true);
        expect(value as number).toBeGreaterThanOrEqual(range.min);
        expect(value as number).toBeLessThanOrEqual(range.max);
      }
    });
  }
});

describe("patch keys: a solved patch touches only the fields its own target owns", () => {
  it("tailTipHandle returns exactly tailAngle and tailSmoothness", () => {
    const p = findPoint(GEOMETRY, "tailTipHandle");
    const dragged = { station: mm(p.point.station - inchesToMm(1)), height: mm(p.point.height + inchesToMm(1)) };
    const patch = solveSideProfileDrag(GEOMETRY, "tailTipHandle", dragged);
    expect(Object.keys(patch).sort()).toEqual(["tailAngle", "tailSmoothness"]);
  });

  it("noseTipHandle returns exactly noseAngle and noseSmoothness", () => {
    const p = findPoint(GEOMETRY, "noseTipHandle");
    const dragged = { station: mm(p.point.station + inchesToMm(1)), height: mm(p.point.height + inchesToMm(1)) };
    const patch = solveSideProfileDrag(GEOMETRY, "noseTipHandle", dragged);
    expect(Object.keys(patch).sort()).toEqual(["noseAngle", "noseSmoothness"]);
  });

  it("tailFlatHandle returns exactly tailFlatness", () => {
    const p = findPoint(GEOMETRY, "tailFlatHandle");
    const dragged = { station: mm(p.point.station - inchesToMm(1)), height: p.point.height };
    const patch = solveSideProfileDrag(GEOMETRY, "tailFlatHandle", dragged);
    expect(Object.keys(patch)).toEqual(["tailFlatness"]);
  });

  it("noseFlatHandle returns exactly noseFlatness", () => {
    const p = findPoint(GEOMETRY, "noseFlatHandle");
    const dragged = { station: mm(p.point.station + inchesToMm(1)), height: p.point.height };
    const patch = solveSideProfileDrag(GEOMETRY, "noseFlatHandle", dragged);
    expect(Object.keys(patch)).toEqual(["noseFlatness"]);
  });
});
