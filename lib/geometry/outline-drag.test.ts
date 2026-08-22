import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import {
  OUTLINE_DRAG_LIMITS,
  type OutlineDragTarget,
  outlineDragPoints,
  solveOutlineDrag,
} from "./outline-drag";
import { buildOutline } from "./outline";
import { type Mm, degrees, inchesToMm, mm, mmToInches } from "./units";

const BASE = DEFAULT_BOARD_SPEC.outline;

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
