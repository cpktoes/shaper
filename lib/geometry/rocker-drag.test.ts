import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC } from "./board";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import {
  ROCKER_LIFT_RANGE_IN,
  buildRocker,
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_SMOOTHNESS_RANGE,
  type RockerSpec,
} from "./rocker";
import {
  SIDE_PROFILE_DRAG_HIT_PX,
  nearestSideProfileDragTarget,
  sideProfileDragPoints,
  solveSideProfileDrag,
  type SideProfileDragPointAt,
  type SideProfileDragTarget,
} from "./rocker-drag";
import { MM_PER_INCH, type Mm, inchesToMm, mm, mmToInches } from "./units";
import { rockerViewLayout } from "@/components/rocker/rocker-view-frame";

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

/** A board-space point, built from plain numbers. */
function point(station: number, height: number): { station: Mm; height: Mm } {
  return { station: mm(station), height: mm(height) };
}

/** Euclidean distance between two board-space points, in mm — the same metric
 * `nearestSideProfileDragTarget` compares against, used here only to build test fixtures. */
function distanceMm(a: { station: Mm; height: Mm }, b: { station: Mm; height: Mm }): number {
  return Math.hypot(a.station - b.station, a.height - b.height);
}

/** The globally closest pair among a set of drag points, by board-mm distance — computed, not
 * assumed. */
function closestPair(points: SideProfileDragPointAt[]): [SideProfileDragPointAt, SideProfileDragPointAt] {
  let best: [SideProfileDragPointAt, SideProfileDragPointAt] | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = distanceMm(points[i].point, points[j].point);
      if (d < bestDist) {
        bestDist = d;
        best = [points[i], points[j]];
      }
    }
  }
  if (!best) throw new Error("need at least two points to find a closest pair");
  return best;
}

/** A point a fraction `t` of the way from `a` to `b`. */
function lerp(a: { station: Mm; height: Mm }, b: { station: Mm; height: Mm }, t: number): { station: Mm; height: Mm } {
  return point(a.station + (b.station - a.station) * t, a.height + (b.height - a.height) * t);
}

describe("nearestSideProfileDragTarget", () => {
  const points = sideProfileDragPoints(GEOMETRY);

  it("a touch with a NaN coordinate picks nothing, however large the radius (T-09-17 / T-09-24)", () => {
    // A touch converted from a stale or detached pointer can arrive as NaN. The pick compares
    // squared distances with strict `<`/`<=`, which every NaN fails both ways, so no point can be
    // grabbed and the drag never starts — the property the phase-9 threat register relies on.
    const sample = points[0].point;
    for (const key of Object.keys(sample) as (keyof typeof sample)[]) {
      const touch = { ...sample, [key]: mm(NaN) } as typeof sample;
      expect(nearestSideProfileDragTarget(points, touch, mm(50))).toBeNull();
      expect(nearestSideProfileDragTarget(points, touch, mm(Number.POSITIVE_INFINITY))).toBeNull();
    }
    const allNaN = Object.fromEntries(Object.keys(sample).map((k) => [k, mm(NaN)])) as unknown as typeof sample;
    expect(nearestSideProfileDragTarget(points, allNaN, mm(1e9))).toBeNull();
  });

  it("a touch exactly on one handle's centre returns that handle, for each of the four targets", () => {
    for (const entry of points) {
      expect(nearestSideProfileDragTarget(points, entry.point, mm(50))).toBe(entry.target);
    }
  });

  it("a touch inside two overlapping circles returns whichever centre is nearer, both ways round", () => {
    const [a, b] = closestPair(points);
    const bigRadius = mm(distanceMm(a.point, b.point) + 1);

    const nearA = lerp(a.point, b.point, 0.1);
    expect(nearestSideProfileDragTarget(points, nearA, bigRadius)).toBe(a.target);

    const nearB = lerp(a.point, b.point, 0.9);
    expect(nearestSideProfileDragTarget(points, nearB, bigRadius)).toBe(b.target);
  });

  it("a touch exactly equidistant from two points returns the one earlier in sideProfileDragPoints' own order — tailTipHandle wins a tie against tailFlatHandle", () => {
    // Hand-built, not derived from real board geometry, for the same reason
    // outline-drag.test.ts's own tie test is: clean round numbers make the tie exact in floating
    // point, where an interpolated real-geometry midpoint can land a few ULPs off centre.
    // sideProfileDragPoints' own construction order (read off the file, not assumed from the type
    // union's declaration order) is tailTipHandle, tailFlatHandle, noseFlatHandle, noseTipHandle.
    const synthetic: SideProfileDragPointAt[] = [
      { target: "tailTipHandle", point: point(0, 0), anchor: point(0, 0) },
      { target: "tailFlatHandle", point: point(100, 0), anchor: point(0, 0) },
      { target: "noseFlatHandle", point: point(500, 0), anchor: point(0, 0) },
      { target: "noseTipHandle", point: point(1000, 0), anchor: point(0, 0) },
    ];
    const touch = point(50, 0); // exactly 50mm from both station 0 and station 100
    expect(nearestSideProfileDragTarget(synthetic, touch, mm(1000))).toBe("tailTipHandle");
  });

  it("a touch outside every circle returns null", () => {
    const farAway = point(999_999, 999_999);
    expect(nearestSideProfileDragTarget(points, farAway, mm(1))).toBeNull();
  });

  it("an empty point list returns null for any touch and any radius", () => {
    expect(nearestSideProfileDragTarget([], points[0].point, mm(1000))).toBeNull();
  });

  it("a zero radius returns null unless the touch is exactly on a centre", () => {
    expect(nearestSideProfileDragTarget(points, points[0].point, mm(0))).toBe(points[0].target);
    const justOff = point(points[0].point.station + 0.001, points[0].point.height);
    expect(nearestSideProfileDragTarget(points, justOff, mm(0))).toBeNull();
  });

  it("the desktop invariant (PHON-05): at the existing 15px radius converted to mm, the pick returns exactly the target under the cursor, for all four handles, on the default board", () => {
    // Mirrors rocker-editor.tsx's own desktop inputs (fitToBoard, stationRails "full", the
    // worst-case deck reserve `rocker-viewer.tsx` always uses for "full") at fitScale 1 — the
    // same no-additional-shrink desktop case components/viewer/drag-spacing.test.ts checks.
    // `scale` does not depend on orientation, so this holds for either.
    const maxDeckIn = ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max;
    const layout = rockerViewLayout({
      lengthIn: mmToInches(LENGTH),
      maxDeckIn,
      orientation: "horizontal",
      fitToBoard: true,
      stationRails: "full",
    });
    const hitRadiusMm = mm((SIDE_PROFILE_DRAG_HIT_PX * MM_PER_INCH) / layout.scale);
    for (const entry of points) {
      expect(nearestSideProfileDragTarget(points, entry.point, hitRadiusMm)).toBe(entry.target);
    }
  });

  it("is pure — calling it twice with the same inputs returns the same target, and it does not mutate the points array", () => {
    const snapshot = points.map((p) => ({ ...p, point: { ...p.point }, anchor: { ...p.anchor } }));
    const target = points[2].target;
    const touch = points[2].point;
    const first = nearestSideProfileDragTarget(points, touch, mm(50));
    const second = nearestSideProfileDragTarget(points, touch, mm(50));
    expect(first).toBe(target);
    expect(second).toBe(first);
    expect(points).toEqual(snapshot);
  });
});
