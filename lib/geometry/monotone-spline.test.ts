import { describe, expect, it } from "vitest";
import { monotoneSlopes, sampleMonotoneSpline, type SplinePoint } from "./monotone-spline";

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

describe("sampleMonotoneSpline", () => {
  it("returns the exact y at each supplied x for an increasing set of points", () => {
    for (const p of INCREASING) {
      expect(sampleMonotoneSpline(INCREASING, p.x)).toBeCloseTo(p.y, 9);
    }
  });

  it("never overshoots between two increasing points", () => {
    for (let k = 0; k < INCREASING.length - 1; k++) {
      const [p0, p1] = [INCREASING[k], INCREASING[k + 1]];
      for (let t = 0; t <= 1; t += 0.05) {
        const x = p0.x + t * (p1.x - p0.x);
        const y = sampleMonotoneSpline(INCREASING, x);
        expect(y).toBeGreaterThanOrEqual(p0.y - 1e-9);
        expect(y).toBeLessThanOrEqual(p1.y + 1e-9);
      }
    }
  });

  it("never overshoots between two decreasing points", () => {
    for (let k = 0; k < DECREASING.length - 1; k++) {
      const [p0, p1] = [DECREASING[k], DECREASING[k + 1]];
      for (let t = 0; t <= 1; t += 0.05) {
        const x = p0.x + t * (p1.x - p0.x);
        const y = sampleMonotoneSpline(DECREASING, x);
        expect(y).toBeLessThanOrEqual(p0.y + 1e-9);
        expect(y).toBeGreaterThanOrEqual(p1.y - 1e-9);
      }
    }
  });

  it("samples flat across the whole interval for a flat pair", () => {
    for (let x = 0; x <= 20; x += 2) {
      expect(sampleMonotoneSpline(FLAT, x)).toBeCloseTo(2.5, 9);
    }
  });

  it("returns the first point's y before the first x, and the last point's y after the last x", () => {
    expect(sampleMonotoneSpline(INCREASING, -100)).toBeCloseTo(INCREASING[0].y, 9);
    expect(sampleMonotoneSpline(INCREASING, 1000)).toBeCloseTo(INCREASING[INCREASING.length - 1].y, 9);
  });

  it("returns the first point's y for a non-finite x rather than not-a-number", () => {
    expect(sampleMonotoneSpline(INCREASING, NaN)).toBe(INCREASING[0].y);
    expect(sampleMonotoneSpline(INCREASING, Infinity)).toBe(INCREASING[0].y);
    expect(sampleMonotoneSpline(INCREASING, -Infinity)).toBe(INCREASING[0].y);
  });
});

describe("monotoneSlopes", () => {
  it("returns a tangent per point, all non-negative for a strictly increasing sequence", () => {
    const tangents = monotoneSlopes(INCREASING);
    expect(tangents).toHaveLength(INCREASING.length);
    for (const t of tangents) {
      expect(t).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns a tangent per point, all non-positive for a strictly decreasing sequence", () => {
    const tangents = monotoneSlopes(DECREASING);
    for (const t of tangents) {
      expect(t).toBeLessThanOrEqual(0);
    }
  });

  it("zeroes both flanking tangents across a flat secant", () => {
    const tangents = monotoneSlopes(FLAT);
    expect(tangents[0]).toBe(0);
    expect(tangents[1]).toBe(0);
  });
});
