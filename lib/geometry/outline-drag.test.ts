import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "./board";
import {
  OUTLINE_DRAG_HIT_PX,
  OUTLINE_DRAG_LIMITS,
  type OutlineDragPoint,
  type OutlineDragPointAt,
  type OutlineDragTarget,
  nearestOutlineDragTarget,
  outlineDragPoints,
  solveOutlineDrag,
} from "./outline-drag";
import { buildOutline } from "./outline";
import { MM_PER_INCH, type Mm, degrees, inchesToMm, mm, mmToInches } from "./units";

const BASE = DEFAULT_BOARD_SPEC.outline;

/** The tightest realistic board this app can produce — shortest length, widest widepoint,
 * everything else default (the same board `components/viewer/drag-spacing.test.ts` measures). */
const TIGHT_SPEC: OutlineSpec = {
  ...BASE,
  length: inchesToMm(BOARD_LENGTH_RANGE_IN.min),
  widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
};

function pointFor(spec: OutlineSpec, target: OutlineDragTarget) {
  const geometry = buildOutline(spec);
  const entry = outlineDragPoints(geometry).find((p) => p.target === target);
  if (!entry) throw new Error(`no drag point for ${target}`);
  return { geometry, ...entry };
}

const ALL_TARGETS: OutlineDragTarget[] = [
  "widepoint",
  "tailHandle",
  "tailRailHandle",
  "noseRailHandle",
  "noseHandle",
];

describe("outlineDragPoints", () => {
  it("reports one grabbable point per target", () => {
    const points = outlineDragPoints(buildOutline(BASE));
    expect(points.map((p) => p.target).sort()).toEqual([...ALL_TARGETS].sort());
  });

  it("puts the widepoint knot at the widepoint station and half-width", () => {
    const geometry = buildOutline(BASE);
    const { point } = pointFor(BASE, "widepoint");
    expect(point.station).toBeCloseTo(geometry.widePointStation, 9);
    expect(point.halfWidth).toBeCloseTo(geometry.halfWidePointWidth, 9);
  });

  it("anchors each rail handle to the widepoint, one toward the tail and one toward the nose", () => {
    const geometry = buildOutline(BASE);
    const tail = pointFor(BASE, "tailRailHandle");
    const nose = pointFor(BASE, "noseRailHandle");
    expect(tail.anchor.station).toBeCloseTo(geometry.widePointStation, 9);
    expect(nose.anchor.station).toBeCloseTo(geometry.widePointStation, 9);
    expect(tail.point.station).toBeLessThan(geometry.widePointStation);
    expect(nose.point.station).toBeGreaterThan(geometry.widePointStation);
  });
});

/**
 * The load-bearing property: take where a control point IS for a given spec, drag it exactly
 * nowhere, and the solve must hand back the spec's own values. Any disagreement between the forward
 * pass and the inverse shows up here first.
 */
describe("round trip — solving an undragged point returns the spec it came from", () => {
  const specs: [string, OutlineSpec][] = [
    ["default", BASE],
    [
      "asymmetric rails",
      { ...BASE, tailRailLength: 25, noseRailLength: 75 },
    ],
    [
      "steep angles, full ends",
      {
        ...BASE,
        tailAngle: degrees(80),
        noseAngle: degrees(75),
        tailFullness: 90,
        noseFullness: 60,
      },
    ],
    [
      "wide board, widepoint forward",
      { ...BASE, widePointWidth: inchesToMm(22.5), widePointOffset: inchesToMm(4.75) },
    ],
    ["pin tail", { ...BASE, tail: { kind: "pin" } }],
  ];

  for (const [name, spec] of specs) {
    describe(name, () => {
      it("widepoint returns its offset", () => {
        const { geometry, point } = pointFor(spec, "widepoint");
        const patch = solveOutlineDrag(geometry, "widepoint", point);
        expect(mmToInches(patch.widePointOffset as Mm)).toBeCloseTo(
          mmToInches(spec.widePointOffset),
          6,
        );
      });

      it("rail handles return their own percentages", () => {
        const tail = pointFor(spec, "tailRailHandle");
        expect(solveOutlineDrag(tail.geometry, "tailRailHandle", tail.point).tailRailLength).toBeCloseTo(
          spec.tailRailLength,
          6,
        );
        const nose = pointFor(spec, "noseRailHandle");
        expect(solveOutlineDrag(nose.geometry, "noseRailHandle", nose.point).noseRailLength).toBeCloseTo(
          spec.noseRailLength,
          6,
        );
      });

      it("end handles return their own angle and fullness", () => {
        const tail = pointFor(spec, "tailHandle");
        const tailPatch = solveOutlineDrag(tail.geometry, "tailHandle", tail.point);
        expect(tailPatch.tailAngle).toBeCloseTo(spec.tailAngle, 6);
        expect(tailPatch.tailFullness).toBeCloseTo(spec.tailFullness, 6);

        const nose = pointFor(spec, "noseHandle");
        const nosePatch = solveOutlineDrag(nose.geometry, "noseHandle", nose.point);
        expect(nosePatch.noseAngle).toBeCloseTo(spec.noseAngle, 6);
        expect(nosePatch.noseFullness).toBeCloseTo(spec.noseFullness, 6);
      });
    });
  }

  it("survives a full round trip through buildOutline — drag nothing, redraw the same board", () => {
    const spec: OutlineSpec = { ...BASE, tailRailLength: 30, noseRailLength: 85 };
    const { geometry, point } = pointFor(spec, "noseRailHandle");
    const next = { ...spec, ...solveOutlineDrag(geometry, "noseRailHandle", point) };
    const redrawn = buildOutline(next);
    expect(mmToInches(redrawn.noseWidthAt12in)).toBeCloseTo(mmToInches(geometry.noseWidthAt12in), 6);
    expect(mmToInches(redrawn.tailWidthAt12in)).toBeCloseTo(mmToInches(geometry.tailWidthAt12in), 6);
  });
});

describe("each target writes only its own fields", () => {
  const owned: Record<OutlineDragTarget, string[]> = {
    widepoint: ["widePointOffset"],
    tailRailHandle: ["tailRailLength"],
    noseRailHandle: ["noseRailLength"],
    tailHandle: ["tailAngle", "tailFullness"],
    noseHandle: ["noseAngle", "noseFullness"],
  };

  for (const target of ALL_TARGETS) {
    it(`${target} touches only ${owned[target].join(", ")}`, () => {
      const { geometry, point } = pointFor(BASE, target);
      const dragged = { station: mm(point.station + 20), halfWidth: mm(point.halfWidth + 10) };
      const patch = solveOutlineDrag(geometry, target, dragged);
      expect(Object.keys(patch).sort()).toEqual([...owned[target]].sort());
    });
  }
});

describe("station-axis targets ignore the cross-board component", () => {
  it("rail handles give the same answer however far off-axis the drag strays", () => {
    const { geometry, point } = pointFor(BASE, "tailRailHandle");
    const onAxis = solveOutlineDrag(geometry, "tailRailHandle", point);
    const wayOff = solveOutlineDrag(geometry, "tailRailHandle", {
      station: point.station,
      halfWidth: mm(point.halfWidth + 200),
    });
    expect(wayOff.tailRailLength).toBe(onAxis.tailRailLength);
  });

  it("the widepoint knot slides along the board without ever widening it", () => {
    const { geometry, point } = pointFor(BASE, "widepoint");
    const dragged = solveOutlineDrag(geometry, "widepoint", {
      station: mm(point.station + inchesToMm(3)),
      halfWidth: mm(point.halfWidth + inchesToMm(4)), // hauled well off the rail
    });
    // Width is a slider-only input: the drag must not return it at all.
    expect(dragged.widePointWidth).toBeUndefined();
    expect(mmToInches(dragged.widePointOffset as Mm)).toBeCloseTo(
      mmToInches(BASE.widePointOffset) + 3,
      6,
    );
    // And the redrawn board is exactly as wide as it was.
    const redrawn = buildOutline({ ...BASE, ...dragged });
    expect(mmToInches(redrawn.halfWidePointWidth)).toBeCloseTo(
      mmToInches(geometry.halfWidePointWidth),
      9,
    );
  });
});

describe("clamping and snapping keep every result slider-representable", () => {
  it("clamps a widepoint dragged far past its legal offset", () => {
    const { geometry, point } = pointFor(BASE, "widepoint");
    const patch = solveOutlineDrag(geometry, "widepoint", {
      station: mm(point.station + 10_000),
      halfWidth: point.halfWidth,
    });
    expect(mmToInches(patch.widePointOffset as Mm)).toBeCloseTo(
      OUTLINE_DRAG_LIMITS.widePointOffsetIn.max,
      6,
    );
  });

  it("clamps a rail handle dragged backwards through its own knot to zero", () => {
    const { geometry, point } = pointFor(BASE, "tailRailHandle");
    // Past the widepoint entirely — a negative handle length, which has no meaning.
    const patch = solveOutlineDrag(geometry, "tailRailHandle", {
      station: mm(geometry.widePointStation + 500),
      halfWidth: point.halfWidth,
    });
    expect(patch.tailRailLength).toBe(OUTLINE_DRAG_LIMITS.railLength.min);
  });

  it("clamps end-handle angles to their slider bounds", () => {
    const { geometry } = pointFor(BASE, "tailHandle");
    const straightUp = solveOutlineDrag(geometry, "tailHandle", {
      station: mm(geometry.tailPodStation),
      halfWidth: mm(geometry.halfTailBlockWidth + 100),
    });
    expect(straightUp.tailAngle).toBeLessThanOrEqual(OUTLINE_DRAG_LIMITS.tailAngle.max);
    expect(straightUp.tailAngle).toBeGreaterThanOrEqual(OUTLINE_DRAG_LIMITS.tailAngle.min);
  });

  it("snaps an off-grid drag onto the slider's own step", () => {
    const { geometry, point } = pointFor(BASE, "widepoint");
    const patch = solveOutlineDrag(geometry, "widepoint", {
      // 2.837" forward of centre — nothing like a quarter.
      station: mm(geometry.length / 2 + inchesToMm(2.837)),
      halfWidth: point.halfWidth,
    });
    const offsetIn = mmToInches(patch.widePointOffset as Mm);
    const steps = offsetIn / OUTLINE_DRAG_LIMITS.widePointOffsetIn.step;
    expect(steps).toBeCloseTo(Math.round(steps), 9);
    expect(offsetIn).toBeCloseTo(2.75, 9);
  });

  it("never returns a non-finite field, even for a nonsense drag", () => {
    for (const target of ALL_TARGETS) {
      const { geometry } = pointFor(BASE, target);
      const patch = solveOutlineDrag(geometry, target, {
        station: mm(Number.NaN),
        halfWidth: mm(Number.NaN),
      });
      for (const value of Object.values(patch)) {
        expect(Number.isFinite(value as number)).toBe(true);
      }
    }
  });
});

describe("dragging actually moves the board", () => {
  it("sliding the widepoint toward the nose moves the drawn widepoint station", () => {
    const { geometry, point } = pointFor(BASE, "widepoint");
    const patch = solveOutlineDrag(geometry, "widepoint", {
      station: mm(point.station + inchesToMm(4)),
      halfWidth: point.halfWidth,
    });
    const moved = buildOutline({ ...BASE, ...patch });
    expect(mmToInches(moved.widePointStation)).toBeCloseTo(
      mmToInches(geometry.widePointStation) + 4,
      6,
    );
  });

  it("pulling the nose rail handle further forward lengthens that rail", () => {
    const { geometry, point } = pointFor(BASE, "noseRailHandle");
    const patch = solveOutlineDrag(geometry, "noseRailHandle", {
      station: mm(point.station + inchesToMm(3)),
      halfWidth: point.halfWidth,
    });
    expect(patch.noseRailLength as number).toBeGreaterThan(BASE.noseRailLength);
    // A longer nose rail carries width further forward, so the nose measures wider.
    const pulled = buildOutline({ ...BASE, ...patch });
    expect(mmToInches(pulled.noseWidthAt12in)).toBeGreaterThan(mmToInches(geometry.noseWidthAt12in));
  });
});

/** A board-space point, built from plain numbers — a local test-only counterpart to the file's own
 * (unexported) `point` helper. */
function point(station: number, halfWidth: number): OutlineDragPoint {
  return { station: mm(station), halfWidth: mm(halfWidth) };
}

/** Euclidean distance between two board-space points, in mm — the same metric
 * `nearestOutlineDragTarget` compares against, used here only to build test fixtures. */
function distanceMm(a: OutlineDragPoint, b: OutlineDragPoint): number {
  return Math.hypot(a.station - b.station, a.halfWidth - b.halfWidth);
}

/** The globally closest pair among a set of drag points, by board-mm distance — computed, not
 * assumed, so the overlap/tie fixtures below stay correct if the geometry ever shifts which pair
 * is nearest. */
function closestPair(points: OutlineDragPointAt[]): [OutlineDragPointAt, OutlineDragPointAt] {
  let best: [OutlineDragPointAt, OutlineDragPointAt] | null = null;
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
function lerp(a: OutlineDragPoint, b: OutlineDragPoint, t: number): OutlineDragPoint {
  return {
    station: mm(a.station + (b.station - a.station) * t),
    halfWidth: mm(a.halfWidth + (b.halfWidth - a.halfWidth) * t),
  };
}

describe("nearestOutlineDragTarget", () => {
  const geometry = buildOutline(BASE);
  const points = outlineDragPoints(geometry);

  it("a touch exactly on one point's centre returns that point, for each of the five targets", () => {
    for (const entry of points) {
      expect(nearestOutlineDragTarget(points, entry.point, mm(50))).toBe(entry.target);
    }
  });

  it("a touch inside two overlapping circles returns whichever centre is nearer, both ways round", () => {
    const [a, b] = closestPair(points);
    // A radius comfortably larger than the whole gap between the closest pair — big enough that
    // both circles genuinely overlap at every point tested below.
    const bigRadius = mm(distanceMm(a.point, b.point) + 1);

    const nearA = lerp(a.point, b.point, 0.1);
    expect(nearestOutlineDragTarget(points, nearA, bigRadius)).toBe(a.target);

    const nearB = lerp(a.point, b.point, 0.9);
    expect(nearestOutlineDragTarget(points, nearB, bigRadius)).toBe(b.target);
  });

  it("a touch exactly equidistant from two points returns the one earlier in outlineDragPoints' order — the widepoint wins any tie it is in", () => {
    // Hand-built, not derived from real board geometry: real coordinates are irrational enough
    // that an interpolated midpoint can land a few floating-point ULPs off dead centre (squaring
    // is not perfectly symmetric under IEEE754 rounding for arbitrary values), which would test
    // rounding noise rather than the tie rule itself. Clean round numbers make the tie exact. This
    // is about the ENUMERATION ORDER rule, which does not depend on which real board produced the
    // points — the five targets are listed in outlineDragPoints' own order: widepoint, tailHandle,
    // tailRailHandle, noseRailHandle, noseHandle.
    const synthetic: OutlineDragPointAt[] = [
      { target: "widepoint", point: point(0, 0), anchor: point(0, 0) },
      { target: "tailHandle", point: point(100, 0), anchor: point(0, 0) },
      { target: "tailRailHandle", point: point(500, 0), anchor: point(0, 0) },
      { target: "noseRailHandle", point: point(1000, 0), anchor: point(0, 0) },
      { target: "noseHandle", point: point(1500, 0), anchor: point(0, 0) },
    ];
    // Exactly 50mm from both the widepoint (station 0) and tailHandle (station 100) — 50*50 is
    // IEEE754-exact on both sides, so this is a genuine tie, not an approximation of one.
    const touch = point(50, 0);
    expect(nearestOutlineDragTarget(synthetic, touch, mm(1000))).toBe("widepoint");
  });

  it("a touch outside every circle returns null", () => {
    const farAway: OutlineDragPoint = { station: mm(999_999), halfWidth: mm(999_999) };
    expect(nearestOutlineDragTarget(points, farAway, mm(1))).toBeNull();
  });

  it("an empty point list returns null for any touch and any radius", () => {
    expect(nearestOutlineDragTarget([], points[0].point, mm(1000))).toBeNull();
  });

  it("a zero radius returns null unless the touch is exactly on a centre", () => {
    expect(nearestOutlineDragTarget(points, points[0].point, mm(0))).toBe(points[0].target);
    const justOff: OutlineDragPoint = {
      station: mm(points[0].point.station + 0.001),
      halfWidth: points[0].point.halfWidth,
    };
    expect(nearestOutlineDragTarget(points, justOff, mm(0))).toBeNull();
  });

  it("the desktop invariant (PHON-05): at the existing 15px radius converted to mm, the pick returns exactly the target under the cursor, for every point, on the default board and the tightest realistic board", () => {
    // Mirrors outline-viewer.tsx's own outlineViewMetrics length-fit scale (VIEW_H 620, PAD_Y 24),
    // at fitScale 1 — the desktop sidebar canvas is generously sized, so this is the same
    // no-additional-shrink desktop case components/viewer/drag-spacing.test.ts checks.
    const DESKTOP_VIEW_H = 620;
    const DESKTOP_PAD_Y = 24;
    for (const spec of [BASE, TIGHT_SPEC]) {
      const geom = buildOutline(spec);
      const pts = outlineDragPoints(geom);
      const lengthIn = mmToInches(geom.length);
      const scale = (DESKTOP_VIEW_H - DESKTOP_PAD_Y * 2) / lengthIn;
      const hitRadiusMm = mm((OUTLINE_DRAG_HIT_PX * MM_PER_INCH) / scale);
      for (const entry of pts) {
        expect(nearestOutlineDragTarget(pts, entry.point, hitRadiusMm)).toBe(entry.target);
      }
    }
  });

  it("is pure — calling it twice with the same inputs returns the same target, and it does not mutate the points array", () => {
    const snapshot = points.map((p) => ({ ...p, point: { ...p.point }, anchor: { ...p.anchor } }));
    const target = points[2].target;
    const touch = points[2].point;
    const first = nearestOutlineDragTarget(points, touch, mm(50));
    const second = nearestOutlineDragTarget(points, touch, mm(50));
    expect(first).toBe(target);
    expect(second).toBe(first);
    expect(points).toEqual(snapshot);
  });
});
