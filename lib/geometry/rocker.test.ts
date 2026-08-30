import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM } from "./outline";
import {
  buildRocker,
  DEFAULT_ROCKER_SPEC,
  migrateLegacyRocker,
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_LIFT_RANGE_IN,
  ROCKER_SMOOTHNESS_RANGE,
  rockerStationPositions,
  sampleRocker,
  type RockerSpec,
} from "./rocker";
import { inchesToMm, mm, mmToInches, degrees } from "./units";

const LENGTH = inchesToMm(72);

function specAt(overrides: Partial<RockerSpec> = {}): RockerSpec {
  return { ...DEFAULT_ROCKER_SPEC, ...overrides };
}

describe("buildRocker — knot interpolation", () => {
  it("sampled at station 0 returns tailLift, at length returns noseLift, at length/2 returns exactly zero", () => {
    for (const lengthIn of [BOARD_LENGTH_RANGE_IN.min, 72, BOARD_LENGTH_RANGE_IN.max]) {
      const length = inchesToMm(lengthIn);
      const spec = DEFAULT_ROCKER_SPEC;
      const geometry = buildRocker(spec, length);
      expect(mmToInches(sampleRocker(geometry, mm(0)))).toBeCloseTo(mmToInches(spec.tailLift), 6);
      expect(mmToInches(sampleRocker(geometry, length))).toBeCloseTo(mmToInches(spec.noseLift), 6);
      expect(mmToInches(sampleRocker(geometry, mm(length / 2)))).toBeCloseTo(0, 6);
    }
  });
});

describe("buildRocker — tangent direction matches the spec's angle", () => {
  it("the tail knot's tangent equals (cos(tailAngle), -sin(tailAngle))", () => {
    const spec = specAt({ tailAngle: degrees(37) });
    const geometry = buildRocker(spec, LENGTH);
    const rad = (37 * Math.PI) / 180;
    expect(geometry.knots[0].tangent.x).toBeCloseTo(Math.cos(rad), 6);
    expect(geometry.knots[0].tangent.y).toBeCloseTo(-Math.sin(rad), 6);
  });

  it("the nose knot's tangent equals (cos(noseAngle), sin(noseAngle)) — the opposite sign from the tail", () => {
    const spec = specAt({ noseAngle: degrees(52) });
    const geometry = buildRocker(spec, LENGTH);
    const rad = (52 * Math.PI) / 180;
    expect(geometry.knots[2].tangent.x).toBeCloseTo(Math.cos(rad), 6);
    expect(geometry.knots[2].tangent.y).toBeCloseTo(Math.sin(rad), 6);
  });

  it("the centre knot's tangent is purely along the station axis", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    expect(geometry.knots[1].tangent).toEqual({ x: 1, y: 0 });
  });
});

describe("buildRocker — the two segments meet the centre flat and tangent", () => {
  it("both of the centre's own control points sit at exactly zero lift", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    // segments[0] arrives at the centre (its p1/c1 handle), segments[1] leaves the centre (its
    // p0/c0 handle) — both handles attached to the centre knot must carry zero lift, which is
    // what makes the curve read horizontal (C1-continuous) across the join.
    expect(geometry.segments[0].p1.y).toBe(0);
    expect(geometry.segments[0].c1.y).toBe(0);
    expect(geometry.segments[1].p0.y).toBe(0);
    expect(geometry.segments[1].c0.y).toBe(0);
  });
});

function assertNoFoldBack(spec: RockerSpec, length: number = LENGTH) {
  const geometry = buildRocker(spec, mm(length));
  const centerStation = length / 2;
  const SAMPLES = 200;
  const stations: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) stations.push((length * i) / SAMPLES);

  let prev = sampleRocker(geometry, mm(centerStation));
  for (const s of stations.filter((s) => s >= centerStation)) {
    const lift = sampleRocker(geometry, mm(s));
    expect(lift).toBeGreaterThanOrEqual(prev - 1e-6);
    prev = lift;
  }
  prev = sampleRocker(geometry, mm(centerStation));
  for (const s of stations.filter((s) => s <= centerStation).reverse()) {
    const lift = sampleRocker(geometry, mm(s));
    expect(lift).toBeGreaterThanOrEqual(prev - 1e-6);
    prev = lift;
  }
}

function assertNeverNegative(spec: RockerSpec, length: number = LENGTH) {
  const geometry = buildRocker(spec, mm(length));
  for (const p of geometry.points) {
    expect(p.lift).toBeGreaterThanOrEqual(0);
  }
}

const EXTREME_SPECS: { name: string; spec: RockerSpec }[] = [
  {
    name: "all-min",
    spec: {
      noseLift: inchesToMm(ROCKER_LIFT_RANGE_IN.min),
      tailLift: inchesToMm(ROCKER_LIFT_RANGE_IN.min),
      noseAngle: degrees(ROCKER_ANGLE_RANGE_DEG.min),
      tailAngle: degrees(ROCKER_ANGLE_RANGE_DEG.min),
      noseSmoothness: ROCKER_SMOOTHNESS_RANGE.min,
      tailSmoothness: ROCKER_SMOOTHNESS_RANGE.min,
      noseFlatness: ROCKER_FLATNESS_RANGE.min,
      tailFlatness: ROCKER_FLATNESS_RANGE.min,
    },
  },
  {
    name: "all-max",
    spec: {
      noseLift: inchesToMm(ROCKER_LIFT_RANGE_IN.max),
      tailLift: inchesToMm(ROCKER_LIFT_RANGE_IN.max),
      noseAngle: degrees(ROCKER_ANGLE_RANGE_DEG.max),
      tailAngle: degrees(ROCKER_ANGLE_RANGE_DEG.max),
      noseSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
      tailSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
      noseFlatness: ROCKER_FLATNESS_RANGE.max,
      tailFlatness: ROCKER_FLATNESS_RANGE.max,
    },
  },
  { name: "default", spec: DEFAULT_ROCKER_SPEC },
  {
    name: "max angle with max smoothness",
    spec: specAt({
      noseAngle: degrees(ROCKER_ANGLE_RANGE_DEG.max),
      tailAngle: degrees(ROCKER_ANGLE_RANGE_DEG.max),
      noseSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
      tailSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
    }),
  },
  {
    name: "zero angle with zero smoothness",
    spec: specAt({
      noseAngle: degrees(ROCKER_ANGLE_RANGE_DEG.min),
      tailAngle: degrees(ROCKER_ANGLE_RANGE_DEG.min),
      noseSmoothness: ROCKER_SMOOTHNESS_RANGE.min,
      tailSmoothness: ROCKER_SMOOTHNESS_RANGE.min,
    }),
  },
  {
    name: "max flatness with max smoothness",
    spec: specAt({
      noseFlatness: ROCKER_FLATNESS_RANGE.max,
      tailFlatness: ROCKER_FLATNESS_RANGE.max,
      noseSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
      tailSmoothness: ROCKER_SMOOTHNESS_RANGE.max,
    }),
  },
];

describe("buildRocker — no fold-back and never negative, over the whole control range", () => {
  for (const { name, spec } of EXTREME_SPECS) {
    for (const lengthIn of [BOARD_LENGTH_RANGE_IN.min, 72, BOARD_LENGTH_RANGE_IN.max]) {
      it(`${name} at ${lengthIn}" produces a curve with no fold-back`, () => {
        assertNoFoldBack(spec, inchesToMm(lengthIn));
      });
      it(`${name} at ${lengthIn}" never goes negative`, () => {
        assertNeverNegative(spec, inchesToMm(lengthIn));
      });
    }
  }
});

describe("sampleRocker — past-the-end clamping and sorted stations", () => {
  it("stations ascend and are sorted", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    for (let i = 1; i < geometry.points.length; i++) {
      expect(geometry.points[i].station).toBeGreaterThanOrEqual(geometry.points[i - 1].station);
    }
  });

  it("clamps to the tail's own lift past station 0, and to the nose's own lift past length", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    expect(mmToInches(sampleRocker(geometry, mm(-100)))).toBeCloseTo(
      mmToInches(DEFAULT_ROCKER_SPEC.tailLift),
      6,
    );
    expect(mmToInches(sampleRocker(geometry, mm(LENGTH + 100)))).toBeCloseTo(
      mmToInches(DEFAULT_ROCKER_SPEC.noseLift),
      6,
    );
  });
});

describe("the 12in figures have one definition", () => {
  it("geometry.noseLiftAt12in equals sampleRocker at length - MEASURE_STATION_MM, and tailLiftAt12in at MEASURE_STATION_MM", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    expect(geometry.noseLiftAt12in).toBe(sampleRocker(geometry, mm(LENGTH - MEASURE_STATION_MM)));
    expect(geometry.tailLiftAt12in).toBe(sampleRocker(geometry, MEASURE_STATION_MM));
  });
});

describe("control-does-what-its-label-says properties", () => {
  it("raising noseSmoothness never lowers noseLiftAt12in", () => {
    let prev = -Infinity;
    for (let s = ROCKER_SMOOTHNESS_RANGE.min; s <= ROCKER_SMOOTHNESS_RANGE.max; s += 4) {
      const geometry = buildRocker(specAt({ noseSmoothness: s }), LENGTH);
      expect(geometry.noseLiftAt12in).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = geometry.noseLiftAt12in;
    }
  });

  it("raising tailSmoothness never lowers tailLiftAt12in", () => {
    let prev = -Infinity;
    for (let s = ROCKER_SMOOTHNESS_RANGE.min; s <= ROCKER_SMOOTHNESS_RANGE.max; s += 4) {
      const geometry = buildRocker(specAt({ tailSmoothness: s }), LENGTH);
      expect(geometry.tailLiftAt12in).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = geometry.tailLiftAt12in;
    }
  });

  it("raising noseFlatness never raises noseLiftAt12in", () => {
    let prev = Infinity;
    for (let f = ROCKER_FLATNESS_RANGE.min; f <= ROCKER_FLATNESS_RANGE.max; f += 4) {
      const geometry = buildRocker(specAt({ noseFlatness: f }), LENGTH);
      expect(geometry.noseLiftAt12in).toBeLessThanOrEqual(prev + 1e-9);
      prev = geometry.noseLiftAt12in;
    }
  });

  it("raising tailFlatness never raises tailLiftAt12in", () => {
    let prev = Infinity;
    for (let f = ROCKER_FLATNESS_RANGE.min; f <= ROCKER_FLATNESS_RANGE.max; f += 4) {
      const geometry = buildRocker(specAt({ tailFlatness: f }), LENGTH);
      expect(geometry.tailLiftAt12in).toBeLessThanOrEqual(prev + 1e-9);
      prev = geometry.tailLiftAt12in;
    }
  });

  // Deliberately NOT asserted: monotonicity in ANGLE. The tip's own handle-length cap shrinks as
  // the angle steepens (rockerTipHandleMaxLength's OVERSHOOT branch), so angle and handle length
  // pull against each other and the relationship is not guaranteed monotone. The tangent-direction
  // assertions above are what pin the angle control.
});

describe("migrateLegacyRocker", () => {
  it("carries the legacy noseTip/tailTip through unchanged, and the six shape controls come from DEFAULT_ROCKER_SPEC", () => {
    const legacy = {
      noseTip: inchesToMm(5).valueOf(),
      nose12: inchesToMm(1.5).valueOf(),
      tail12: inchesToMm(0.5).valueOf(),
      tailTip: inchesToMm(2.25).valueOf(),
    };
    const migrated = migrateLegacyRocker(legacy);
    expect(migrated.noseLift).toBe(legacy.noseTip);
    expect(migrated.tailLift).toBe(legacy.tailTip);
    expect(migrated.noseAngle).toBe(DEFAULT_ROCKER_SPEC.noseAngle);
    expect(migrated.tailAngle).toBe(DEFAULT_ROCKER_SPEC.tailAngle);
    expect(migrated.noseSmoothness).toBe(DEFAULT_ROCKER_SPEC.noseSmoothness);
    expect(migrated.tailSmoothness).toBe(DEFAULT_ROCKER_SPEC.tailSmoothness);
    expect(migrated.noseFlatness).toBe(DEFAULT_ROCKER_SPEC.noseFlatness);
    expect(migrated.tailFlatness).toBe(DEFAULT_ROCKER_SPEC.tailFlatness);
  });

  it("builds a curve that passes the no-fold-back and non-negative assertions", () => {
    const migrated = migrateLegacyRocker({
      noseTip: inchesToMm(6).valueOf(),
      nose12: inchesToMm(2).valueOf(),
      tail12: inchesToMm(0.75).valueOf(),
      tailTip: inchesToMm(3).valueOf(),
    });
    assertNoFoldBack(migrated);
    assertNeverNegative(migrated);
  });
});

describe("rockerStationPositions", () => {
  it("returns five positions in ascending station order for any board length in BOARD_LENGTH_RANGE_IN", () => {
    for (const lengthIn of [BOARD_LENGTH_RANGE_IN.min, 72, BOARD_LENGTH_RANGE_IN.max]) {
      const length = inchesToMm(lengthIn);
      const positions = rockerStationPositions(length);
      expect(positions).toHaveLength(5);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].station).toBeGreaterThan(positions[i - 1].station);
      }
      const center = positions.find((p) => p.key === "center");
      expect(center?.station).toBe(mm(length / 2));
    }
  });
});

describe("DEFAULT_ROCKER_SPEC's derived 12in figures land within 1/4in of today's stored figures", () => {
  it("nose12 is within 1/4in of 1 1/4in, tail12 is within 1/4in of 3/8in, on the default 72in board", () => {
    const geometry = buildRocker(DEFAULT_ROCKER_SPEC, LENGTH);
    expect(Math.abs(mmToInches(geometry.noseLiftAt12in) - 1.25)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(mmToInches(geometry.tailLiftAt12in) - 0.375)).toBeLessThanOrEqual(0.25);
  });
});
