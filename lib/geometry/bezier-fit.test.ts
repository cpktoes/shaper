import { describe, expect, it } from "vitest";
import { bezierDeviation, bezierPoint, fitBezierKnots, fitBezierSpan, type BezierKnot, type P2 } from "./bezier-fit";

/** Synthetic curves only: every expected value comes from the geometry of a circle, a line, a corner or a parabola. */

const quarterCircle = Array.from({ length: 200 }, (_, i): P2 => {
  const angle = (i / 199) * (Math.PI / 2);
  return [100 * Math.cos(angle), 100 * Math.sin(angle)];
});

describe("fitBezierKnots", () => {
  it("fits a quarter circle of radius 100 within 0.5 both ways with at most 6 knots, ends exact", () => {
    const knots = fitBezierKnots(quarterCircle, { tolerance: 0.5 });
    expect(knots.length).toBeLessThanOrEqual(6);
    expect(knots[0].point).toEqual(quarterCircle[0]);
    expect(knots[knots.length - 1].point).toEqual(quarterCircle[199]);
    expect(bezierDeviation(quarterCircle, knots)).toBeLessThanOrEqual(0.5);
  });

  it("makes exactly one sharp knot where two straight runs meet at 90 degrees, with no deviation", () => {
    const points: P2[] = [
      ...Array.from({ length: 11 }, (_, i): P2 => [i * 10, 0]),
      ...Array.from({ length: 10 }, (_, i): P2 => [100, (i + 1) * 10]),
    ];
    const knots = fitBezierKnots(points, { tolerance: 0.5 });
    const sharp = knots.filter((k) => !k.smooth && k.point !== knots[0].point && k.point !== knots[knots.length - 1].point);
    expect(sharp.length).toBe(1);
    expect(sharp[0].point).toEqual([100, 0]);
    expect(bezierDeviation(points, knots)).toBeLessThan(1e-9);
  });

  it("gives a straight line two knots", () => {
    const points = Array.from({ length: 30 }, (_, i): P2 => [i * 3, i * 1.5]);
    const knots = fitBezierKnots(points, { tolerance: 0.5 });
    expect(knots.length).toBe(2);
    expect(bezierDeviation(points, knots)).toBeLessThan(1e-9);
  });

  it("keeps a knot exactly at a parabola's top when it is named level, with both handles at the top's height", () => {
    const points = Array.from({ length: 41 }, (_, i): P2 => [i * 5, 100 - (i * 5 - 100) ** 2 / 100]);
    const top = 20;
    expect(points[top][1]).toBe(100);
    const knots = fitBezierKnots(points, { tolerance: 0.5, level: [top] });
    const at = knots.find((k) => k.point[0] === 100);
    expect(at).toBeDefined();
    expect(at!.point[1]).toBe(100);
    expect(at!.before[1]).toBeCloseTo(100, 9);
    expect(at!.after[1]).toBeCloseTo(100, 9);
    expect(at!.before[0]).toBeLessThan(100);
    expect(at!.after[0]).toBeGreaterThan(100);
    expect(bezierDeviation(points, knots)).toBeLessThanOrEqual(0.5);
  });

  it("drops a repeated point and moves a named index to the copy that is kept", () => {
    const points: P2[] = [
      [0, 0],
      [10, 0],
      [10, 0],
      [20, 0],
      [30, 0],
    ];
    // Index 2 repeats index 1; naming it must make the kept copy (10, 0) a knot.
    const knots = fitBezierKnots(points, { tolerance: 0.5, keep: [2] });
    expect(knots.map((k) => k.point)).toEqual([
      [0, 0],
      [10, 0],
      [30, 0],
    ]);
  });

  it("throws on a non-finite input", () => {
    expect(() => fitBezierKnots([[0, 0], [Number.NaN, 1]], { tolerance: 0.5 })).toThrow();
    expect(() => fitBezierKnots([[0, 0], [1, Number.POSITIVE_INFINITY]], { tolerance: 0.5 })).toThrow();
  });

  it("is deterministic", () => {
    expect(fitBezierKnots(quarterCircle, { tolerance: 0.5 })).toEqual(fitBezierKnots(quarterCircle, { tolerance: 0.5 }));
  });
});

describe("bezierPoint", () => {
  it("starts at the first knot's point and ends at the second's", () => {
    const [a, b] = fitBezierKnots(
      [
        [0, 0],
        [10, 5],
        [20, 0],
      ],
      { tolerance: 0.01 },
    );
    expect(bezierPoint(a, b, 0)).toEqual(a.point);
    expect(bezierPoint(a, b, 1)).toEqual(b.point);
  });
});

describe("fitBezierSpan", () => {
  const ends = (points: readonly P2[], outgoing: P2, incoming: P2): [BezierKnot, BezierKnot] => {
    const { after, before } = fitBezierSpan(points, outgoing, incoming);
    const first = points[0];
    const last = points[points.length - 1];
    return [
      { point: first, before: first, after, smooth: true },
      { point: last, before, after: last, smooth: true },
    ];
  };

  it("sits a quarter circle of radius 100 within 0.1 of the circle both ways, given its exact end directions", () => {
    // The circle runs from (100, 0) going up to (0, 100) going left.
    const knots = ends(quarterCircle, [0, 1], [-1, 0]);
    expect(bezierDeviation(quarterCircle, knots)).toBeLessThanOrEqual(0.1);
  });

  it("fits a straight run to within 1e-9 with both handles on the line", () => {
    const line = Array.from({ length: 12 }, (_, i): P2 => [i * 10, i * 5]);
    const size = Math.hypot(10, 5);
    const direction: P2 = [10 / size, 5 / size];
    const knots = ends(line, direction, direction);
    expect(bezierDeviation(line, knots)).toBeLessThan(1e-9);
    for (const handle of [knots[0].after, knots[1].before]) {
      expect(Math.abs(handle[1] - handle[0] / 2)).toBeLessThan(1e-9);
    }
  });

  it("with only its two end points puts each handle a third of the chord along its direction", () => {
    const { after, before } = fitBezierSpan(
      [
        [0, 0],
        [30, 0],
      ],
      [1, 0],
      [1, 0],
    );
    expect(after[0]).toBeCloseTo(10, 9);
    expect(after[1]).toBeCloseTo(0, 9);
    expect(before[0]).toBeCloseTo(20, 9);
    expect(before[1]).toBeCloseTo(0, 9);
  });

  it("gives both handles at the point for a zero chord", () => {
    const point: P2 = [4, 7];
    expect(fitBezierSpan([point, point, point], [1, 0], [0, 1])).toEqual({ after: point, before: point });
  });

  it("refuses a point that is not a finite number", () => {
    expect(() => fitBezierSpan([[0, 0], [Number.NaN, 1], [2, 2]], [1, 0], [1, 0])).toThrow();
    expect(() => fitBezierSpan([[0, 0], [1, Number.POSITIVE_INFINITY]], [1, 0], [1, 0])).toThrow();
  });

  it("is deterministic", () => {
    expect(fitBezierSpan(quarterCircle, [0, 1], [-1, 0])).toEqual(fitBezierSpan(quarterCircle, [0, 1], [-1, 0]));
  });
});
