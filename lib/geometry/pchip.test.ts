import { describe, expect, it } from "vitest";
import { pchipMinimum, pchipSlopes, preparePchip, samplePchip, type SplinePoint } from "./pchip";

// The same three curves monotone-spline.test.ts uses, so every assertion there carries over.
const INCREASING: SplinePoint[] = [
  { x: 0, y: 0 },
  { x: 12, y: 1.25 },
  { x: 36, y: 4 },
  { x: 60, y: 9 },
];

const DECREASING: SplinePoint[] = [
  { x: 0, y: 9 },
  { x: 12, y: 5 },
  { x: 36, y: 2 },
  { x: 60, y: 0 },
];

const FLAT: SplinePoint[] = [
  { x: 0, y: 2.5 },
  { x: 20, y: 2.5 },
];

const xsOf = (points: SplinePoint[]) => points.map((p) => p.x);
const ysOf = (points: SplinePoint[]) => points.map((p) => p.y);

function expectSlopes(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((slope, k) => expect(Math.abs(slope - expected[k])).toBeLessThan(1e-12));
}

describe("pchipSlopes — digit parity with SciPy's PchipInterpolator (D-13)", () => {
  // The six hand-worked cases from 11-RESEARCH.md "Code Examples": exact rationals, checked
  // against SciPy 1.13.1. The old Fritsch–Carlson sampler (monotone-spline.ts) gives DIFFERENT
  // numbers for the 4- and 5-point cases — [0.1041667, 0.1097074, 0.1478495, 0.2083333] and
  // [−0.1354167, −0.0257482, 0, 0.08125, 0.2708333] — because its circle clamp rescales valid
  // pchip tangents; that is exactly why this sampler replaces it.

  it("matches the 4-point case", () => {
    expectSlopes(pchipSlopes(xsOf(INCREASING), ysOf(INCREASING)), [29 / 288, 33 / 304, 55 / 372, 49 / 192]);
  });

  it("matches the 5-point hand fallback rocker", () => {
    expectSlopes(
      pchipSlopes([0, 12, 36, 60, 72], [2, 0.375, 0, 1.25, 4.5]),
      [-101 / 576, -117 / 3808, 0, 65 / 688, 11 / 32],
    );
  });

  it("clamps the start tangent to three times the end secant when the secants turn", () => {
    expectSlopes(pchipSlopes([0, 3, 4], [0, 3, 0]), [3, 0, -4]);
  });

  it("clamps the far-end tangent the same way, mirrored", () => {
    expectSlopes(pchipSlopes([0, 1, 4], [0, 3, 0]), [4, 0, -3]);
  });

  it("zeroes the tangents either side of a flat secant", () => {
    expectSlopes(pchipSlopes([0, 10, 20, 30], [1, 2, 2, 5]), [0.15, 0, 0, 0.45]);
  });

  it("draws a straight line through two points", () => {
    expectSlopes(pchipSlopes([0, 20], [1, 3]), [0.1, 0.1]);
  });

  it("returns [] for no points and [0] for one", () => {
    expect(pchipSlopes([], [])).toEqual([]);
    expect(pchipSlopes([5], [2])).toEqual([0]);
  });

  it("returns a tangent per point, all non-negative for a strictly increasing sequence", () => {
    const slopes = pchipSlopes(xsOf(INCREASING), ysOf(INCREASING));
    expect(slopes).toHaveLength(INCREASING.length);
    for (const s of slopes) expect(s).toBeGreaterThanOrEqual(0);
  });

  it("returns a tangent per point, all non-positive for a strictly decreasing sequence", () => {
    for (const s of pchipSlopes(xsOf(DECREASING), ysOf(DECREASING))) expect(s).toBeLessThanOrEqual(0);
  });

  it("zeroes both tangents across a flat pair", () => {
    expect(pchipSlopes(xsOf(FLAT), ysOf(FLAT))).toEqual([0, 0]);
  });
});

describe("samplePchip / preparePchip", () => {
  it("returns the exact y at each supplied x for an increasing set of points", () => {
    for (const p of INCREASING) expect(samplePchip(INCREASING, p.x)).toBe(p.y);
  });

  it("never overshoots between two increasing points", () => {
    const curve = preparePchip(INCREASING);
    for (let k = 0; k < INCREASING.length - 1; k++) {
      const [p0, p1] = [INCREASING[k], INCREASING[k + 1]];
      for (let t = 0; t <= 1; t += 0.05) {
        const y = curve.sample(p0.x + t * (p1.x - p0.x));
        expect(y).toBeGreaterThanOrEqual(p0.y - 1e-9);
        expect(y).toBeLessThanOrEqual(p1.y + 1e-9);
      }
    }
  });

  it("never overshoots between two decreasing points", () => {
    const curve = preparePchip(DECREASING);
    for (let k = 0; k < DECREASING.length - 1; k++) {
      const [p0, p1] = [DECREASING[k], DECREASING[k + 1]];
      for (let t = 0; t <= 1; t += 0.05) {
        const y = curve.sample(p0.x + t * (p1.x - p0.x));
        expect(y).toBeLessThanOrEqual(p0.y + 1e-9);
        expect(y).toBeGreaterThanOrEqual(p1.y - 1e-9);
      }
    }
  });

  it("samples flat across the whole interval for a flat pair", () => {
    for (let x = 0; x <= 20; x += 2) expect(samplePchip(FLAT, x)).toBeCloseTo(2.5, 9);
  });

  it("returns the first point's y before the first x, and the last point's y after the last x", () => {
    expect(samplePchip(INCREASING, -100)).toBe(INCREASING[0].y);
    expect(samplePchip(INCREASING, 1000)).toBe(INCREASING[INCREASING.length - 1].y);
  });

  it("returns the first point's y for a non-finite x rather than not-a-number", () => {
    expect(samplePchip(INCREASING, NaN)).toBe(INCREASING[0].y);
    expect(samplePchip(INCREASING, Infinity)).toBe(INCREASING[0].y);
    expect(samplePchip(INCREASING, -Infinity)).toBe(INCREASING[0].y);
  });

  it("samples one point as that point's y everywhere, and no points as 0", () => {
    expect(samplePchip([{ x: 3, y: 7 }], 100)).toBe(7);
    expect(samplePchip([], 5)).toBe(0);
  });

  it("matches the Hermite cubic built from its own tangents mid-interval", () => {
    const curve = preparePchip(INCREASING);
    // Midpoint of [12, 36]: h00 = h01 = 1/2, h10 = 1/8, h11 = −1/8.
    const h = 24;
    const expected = 0.5 * 1.25 + 0.5 * 4 + (h / 8) * (curve.slopes[1] - curve.slopes[2]);
    expect(curve.sample(24)).toBeCloseTo(expected, 12);
  });

  it("throws, naming the index, on a knot that is not a finite number", () => {
    expect(() => preparePchip([{ x: 0, y: 0 }, { x: 1, y: NaN }])).toThrow(/knot 1/);
    expect(() => preparePchip([{ x: Infinity, y: 0 }])).toThrow(/knot 0/);
  });

  it("throws on knots that do not run strictly left to right", () => {
    expect(() => preparePchip([{ x: 0, y: 0 }, { x: 0, y: 1 }])).toThrow(/knot 1/);
  });

  it("keeps its own copy of the knots, so changing the caller's points changes nothing (R14)", () => {
    const points = INCREASING.map((p) => ({ ...p }));
    const curve = preparePchip(points);
    const before = [0, 6, 24, 48, 60].map((x) => curve.sample(x));
    points[1].y = 100;
    points.push({ x: 80, y: -5 });
    expect([0, 6, 24, 48, 60].map((x) => curve.sample(x))).toEqual(before);
  });
});

describe("pchipMinimum", () => {
  const VALLEY: SplinePoint[] = [
    { x: 0, y: 3 },
    { x: 10, y: 1 },
    { x: 20, y: 0.5 },
    { x: 30, y: 2 },
  ];

  it("finds a knot strictly inside the stretch", () => {
    expect(pchipMinimum(preparePchip(VALLEY), 5, 25)).toBe(0.5);
  });

  it("uses an end of the stretch when no lower knot lies inside it", () => {
    const curve = preparePchip(VALLEY);
    expect(pchipMinimum(curve, 22, 28)).toBe(curve.sample(22));
    expect(pchipMinimum(curve, 28, 22)).toBe(curve.sample(22));
  });

  it("agrees with a dense search", () => {
    const curve = preparePchip(VALLEY);
    let dense = Infinity;
    for (let x = 3; x <= 17; x += 0.001) dense = Math.min(dense, curve.sample(x));
    expect(pchipMinimum(curve, 3, 17)).toBeLessThanOrEqual(dense + 1e-12);
    expect(pchipMinimum(curve, 3, 17)).toBeCloseTo(dense, 6);
  });
});
