import { describe, expect, it } from "vitest";
import {
  BOARD_LENGTH_RANGE_IN,
  DEFAULT_BOARD_SPEC,
  TAIL_PRESETS,
  WIDEPOINT_WIDTH_RANGE_IN,
  type OutlineSpec,
} from "./board";
import {
  OUTLINE_DRAG_HIT_PX,
  OUTLINE_DRAG_LIMITS,
  type OutlineDragPoint,
  type OutlineDragPointAt,
  type OutlineDragTarget,
  type WingDragPointAt,
  type WingDragTarget,
  nearestOutlineDragTarget,
  nearestWingDragTarget,
  outlineDragPoints,
  solveOutlineDrag,
  solveWingDrag,
  wingDragPoints,
} from "./outline-drag";
import { deriveEffectiveFins } from "./design";
import { DEFAULT_FIN_PLACEMENT_SPEC, computeFinPlacement, importedFinTailFromOutline } from "./fins";
import { buildOutline } from "./outline";
import {
  MM_PER_INCH,
  type Mm,
  degrees,
  inchesToMm,
  mm,
  mmToInches,
  roundToSixteenthInch,
  roundToWholeMm,
} from "./units";
import { wingFinEdges } from "./wing-lock";
import {
  NO_FIN_EDGES,
  WING_DEPTH_RANGE_IN,
  WING_FIN_OFFSET_RANGE_IN,
  WING_POSITION_MIN_IN,
  WING_RUN_RANGE_IN,
  nextWing,
  wingOrderGap,
  wingPositionTop,
  wingRadiusTop,
  wingReadouts,
  type Wing,
} from "./wings";

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

  it("a touch with a NaN coordinate picks nothing, however large the radius (T-09-17 / T-09-24)", () => {
    // A touch converted from a stale or detached pointer can arrive as NaN. The pick compares
    // squared distances with strict `<`/`<=`, which every NaN fails both ways, so no point can be
    // grabbed and the drag never starts — the property the phase-9 threat register relies on.
    const sample = points[0].point;
    for (const key of Object.keys(sample) as (keyof typeof sample)[]) {
      const touch = { ...sample, [key]: mm(NaN) } as typeof sample;
      expect(nearestOutlineDragTarget(points, touch, mm(50))).toBeNull();
      expect(nearestOutlineDragTarget(points, touch, mm(Number.POSITIVE_INFINITY))).toBeNull();
    }
    const allNaN = Object.fromEntries(Object.keys(sample).map((k) => [k, mm(NaN)])) as unknown as typeof sample;
    expect(nearestOutlineDragTarget(points, allNaN, mm(1e9))).toBeNull();
  });

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

describe("a diamond tail's angle is pinned under the drag point, exactly as its slider is", () => {
  // The tail-shape button applies the preset (30°, 30% fullness) — the same numbers the prototype
  // set — and greys the Tail Angle slider out. The drag point has to honour the same lock, on a
  // desktop mouse and a phone thumb alike, or the drawing can be dragged into a shape no control can
  // ever reproduce.
  const DIAMOND: OutlineSpec = { ...BASE, ...TAIL_PRESETS.diamond };

  it("marks a diamond's geometry pinned at the angle it was built with, and a squash unpinned", () => {
    const diamond = buildOutline(DIAMOND);
    expect(diamond.tailAnglePinned).toBe(true);
    expect(diamond.tailAngle).toBe(TAIL_PRESETS.diamond.tailAngle);
    expect(buildOutline(BASE).tailAnglePinned).toBe(false);
  });

  it("dragging the tail handle never writes tailAngle back", () => {
    const { geometry, point } = pointFor(DIAMOND, "tailHandle");
    const dragged = { station: mm(point.station + 20), halfWidth: mm(point.halfWidth + 10) };
    expect(Object.keys(solveOutlineDrag(geometry, "tailHandle", dragged))).toEqual(["tailFullness"]);
  });

  it("an undragged tail handle round-trips its own fullness", () => {
    const { geometry, point } = pointFor(DIAMOND, "tailHandle");
    expect(solveOutlineDrag(geometry, "tailHandle", point).tailFullness).toBeCloseTo(DIAMOND.tailFullness, 6);
  });

  it("only travel along the pinned direction changes fullness; sideways travel is ignored", () => {
    const { geometry, point } = pointFor(DIAMOND, "tailHandle");
    const rad = (DIAMOND.tailAngle * Math.PI) / 180;
    const along = { x: Math.cos(rad), y: Math.sin(rad) };
    const across = { x: -Math.sin(rad), y: Math.cos(rad) };
    const sideways = solveOutlineDrag(geometry, "tailHandle", {
      station: mm(point.station + across.x * 15),
      halfWidth: mm(point.halfWidth + across.y * 15),
    });
    expect(sideways.tailFullness).toBeCloseTo(DIAMOND.tailFullness, 6);
    const further = solveOutlineDrag(geometry, "tailHandle", {
      station: mm(point.station + along.x * 25),
      halfWidth: mm(point.halfWidth + along.y * 25),
    });
    expect(further.tailFullness).toBeGreaterThan(DIAMOND.tailFullness);
    expect(further.tailAngle).toBeUndefined();
  });

  it("a squash tail keeps both degrees of freedom", () => {
    const { geometry, point } = pointFor(BASE, "tailHandle");
    const patch = solveOutlineDrag(geometry, "tailHandle", {
      station: mm(point.station + 20),
      halfWidth: mm(point.halfWidth + 10),
    });
    expect(Object.keys(patch).sort()).toEqual(["tailAngle", "tailFullness"]);
  });
});

// ---------------------------------------------------------------------------------------------
// Wing grab points (quick 261014-wii, 2026-10-15, D2, D5, P11, P12). Every expected value is read
// off the app's own functions — `wingReadouts`, `wingRadiusTop`, `roundToSixteenthInch`,
// `roundToWholeMm` — never typed (CLAUDE.md Rule 1).
// ---------------------------------------------------------------------------------------------

describe("wing grab points — two per wing, beside the outline's own five", () => {
  const BARE = buildOutline(BASE);
  /** The default board's two wings as "+ Add a wing" makes them, both placed by hand (quick
   * 261015-hz7, D5: wing 1 at 11", wing 2 3" behind it). */
  const WING_1 = nextWing([], NO_FIN_EDGES, BARE, "imperial");
  const WING_2 = nextWing([WING_1], NO_FIN_EDGES, BARE, "imperial");
  const WINGS: Wing[] = [WING_1, WING_2];
  const winged = buildOutline({ ...BASE, wings: WINGS });
  /** The drop the close-up converts its 22 screen dots to — any positive length will do here. */
  const DROP = inchesToMm(1);
  const FIN_EDGES = wingFinEdges(
    computeFinPlacement(
      deriveEffectiveFins(DEFAULT_FIN_PLACEMENT_SPEC, true, BASE, BARE),
      importedFinTailFromOutline(BARE),
    ).marks,
  );

  function at(target: WingDragTarget) {
    const entry = wingDragPoints(winged, WINGS, DROP).find(
      (p) => p.target.wing === target.wing && p.target.point === target.point,
    );
    if (!entry) throw new Error(`no grab point for wing ${target.wing} ${target.point}`);
    return entry.point;
  }

  it("the outer point sits at the wing's station on the rail ahead; the inner hangs the drop below the inner corner on the rail behind", () => {
    const readouts = wingReadouts(winged, WINGS);
    const points = wingDragPoints(winged, WINGS, DROP);
    expect(points.map((p) => p.target)).toEqual([
      { wing: 0, point: "outer" },
      { wing: 0, point: "inner" },
      { wing: 1, point: "outer" },
      { wing: 1, point: "inner" },
    ]);
    WINGS.forEach((w, i) => {
      expect(points[2 * i].point.station).toBe(w.station);
      expect(points[2 * i].point.halfWidth).toBe(readouts[i].widthAhead / 2);
      expect(points[2 * i + 1].point.station).toBe(w.station - w.run - DROP);
      expect(points[2 * i + 1].point.halfWidth).toBe(readouts[i].widthBehind / 2);
    });
  });

  it("a sharp square step's two points are never closer than the drop", () => {
    const square: Wing = { ...WING_1, run: mm(0) };
    const g = buildOutline({ ...BASE, wings: [square] });
    const [outer, inner] = wingDragPoints(g, [square], DROP).map((p) => p.point);
    expect(Math.hypot(outer.station - inner.station, outer.halfWidth - inner.halfWidth)).toBeGreaterThanOrEqual(DROP);
  });

  it("an unlocked wing's outer point slides the wing along the curve, on the 1/16 inch grid", () => {
    const p = at({ wing: 1, point: "outer" });
    const pulled = { ...p, station: mm(p.station + inchesToMm(1)) };
    const next = solveWingDrag(winged, WINGS, { wing: 1, point: "outer" }, pulled, DROP, FIN_EDGES, "imperial");
    expect(next[1].station).toBe(roundToSixteenthInch(mm(WING_2.station + inchesToMm(1))));
    expect(next[1].depth).toBe(WING_2.depth);
    expect(next[1].run).toBe(WING_2.run);
  });

  it("past the top wing 1 clamps to the top; wing 2 stops the gap behind wing 1; at the tail 2 inches", () => {
    const far0 = solveWingDrag(winged, [WING_1], { wing: 0, point: "outer" }, { ...at({ wing: 0, point: "outer" }), station: mm(BASE.length) }, DROP, NO_FIN_EDGES, "imperial");
    expect(far0[0].station).toBe(wingPositionTop(winged));
    const p = at({ wing: 1, point: "outer" });
    const target: WingDragTarget = { wing: 1, point: "outer" };
    const far = solveWingDrag(winged, WINGS, target, { ...p, station: mm(BASE.length) }, DROP, NO_FIN_EDGES, "imperial");
    expect(far[1].station).toBe(WING_1.station - wingOrderGap(WING_1));
    const tail = solveWingDrag(winged, WINGS, target, { ...p, station: mm(0) }, DROP, NO_FIN_EDGES, "imperial");
    expect(tail[1].station).toBe(inchesToMm(WING_POSITION_MIN_IN));
  });

  it("with a wing 2 present, wing 1's outer point stops at 2 inches plus the gap (D2)", () => {
    const p = at({ wing: 0, point: "outer" });
    const next = solveWingDrag(winged, WINGS, { wing: 0, point: "outer" }, { ...p, station: mm(0) }, DROP, NO_FIN_EDGES, "imperial");
    expect(next[0].station).toBe(inchesToMm(WING_POSITION_MIN_IN + mmToInches(wingOrderGap(WING_1))));
  });

  it("in Metric the outer point lands on a whole millimetre", () => {
    const p = at({ wing: 1, point: "outer" });
    const station = mm(p.station + 17.3);
    const next = solveWingDrag(winged, WINGS, { wing: 1, point: "outer" }, { ...p, station }, DROP, NO_FIN_EDGES, "metric");
    expect(next[1].station).toBe(roundToWholeMm(station));
    expect(Number.isInteger(next[1].station)).toBe(true);
  });

  it("a locked wing 1's outer point sets its offset from the front fins' trailing edge, never its station", () => {
    const front = FIN_EDGES.front!;
    const locked: Wing[] = [{ ...WING_1, lock: "front-trailing" }, WING_2];
    const g = buildOutline({ ...BASE, wings: locked });
    const p = wingDragPoints(g, locked, DROP)[0].point;
    const station = mm(front + inchesToMm(1.3));
    const next = solveWingDrag(g, locked, { wing: 0, point: "outer" }, { ...p, station }, DROP, FIN_EDGES, "imperial");
    expect(next[0].finOffset).toBe(roundToSixteenthInch(mm(station - front)));
    expect(next[0].station).toBe(locked[0].station);

    const back = solveWingDrag(g, locked, { wing: 0, point: "outer" }, { ...p, station: mm(front - inchesToMm(9)) }, DROP, FIN_EDGES, "imperial");
    expect(back[0].finOffset).toBe(inchesToMm(WING_FIN_OFFSET_RANGE_IN.min));
  });

  it("a rear-locked wing 2's outer point sets its offset from the rear fins' trailing edge, never its station", () => {
    const edges = { front: FIN_EDGES.front, rear: inchesToMm(6.25) };
    const locked: Wing[] = [WING_1, { ...WING_2, lock: "rear-trailing" }];
    const g = buildOutline({ ...BASE, wings: locked });
    const p = wingDragPoints(g, locked, DROP)[2].point;
    const station = mm(edges.rear + inchesToMm(0.7));
    const next = solveWingDrag(g, locked, { wing: 1, point: "outer" }, { ...p, station }, DROP, edges, "imperial");
    expect(next[1].finOffset).toBe(roundToSixteenthInch(mm(station - edges.rear)));
    expect(next[1].station).toBe(locked[1].station);
  });

  it("a lock with no fin to follow, or in the wrong slot, drags like a wing placed by hand", () => {
    const locked: Wing[] = [{ ...WING_1, lock: "front-trailing" }];
    const g = buildOutline({ ...BASE, wings: locked });
    const p = wingDragPoints(g, locked, DROP)[0].point;
    const station = mm(p.station + inchesToMm(2));
    const next = solveWingDrag(g, locked, { wing: 0, point: "outer" }, { ...p, station }, DROP, NO_FIN_EDGES, "imperial");
    expect(next[0].station).toBe(roundToSixteenthInch(station));
    expect(next[0].finOffset).toBe(WING_1.finOffset);
    const wrong: Wing[] = [{ ...WING_1, lock: "rear-trailing" }];
    const moved = solveWingDrag(g, wrong, { wing: 0, point: "outer" }, { ...p, station }, DROP, { front: FIN_EDGES.front, rear: inchesToMm(6) }, "imperial");
    expect(moved[0].station).toBe(roundToSixteenthInch(station));
  });

  it("the inner point, pressed and not moved, gives the wing back as it is", () => {
    for (const wing of [0, 1]) {
      const p = at({ wing, point: "inner" });
      const next = solveWingDrag(winged, WINGS, { wing, point: "inner" }, p, DROP, NO_FIN_EDGES, "imperial");
      expect(next[wing].depth).toBe(roundToSixteenthInch(WINGS[wing].depth));
      expect(next[wing].run).toBe(roundToSixteenthInch(WINGS[wing].run));
    }
  });

  it("the inner point moved 1/8 inch toward the stringer deepens the wing by 1/8; moved 1/2 inch tail-ward it lengthens the run by 1/2", () => {
    const p = at({ wing: 0, point: "inner" });
    const target: WingDragTarget = { wing: 0, point: "inner" };
    const deeper = solveWingDrag(winged, WINGS, target, { ...p, halfWidth: mm(p.halfWidth - inchesToMm(1 / 8)) }, DROP, NO_FIN_EDGES, "imperial");
    expect(deeper[0].depth).toBe(roundToSixteenthInch(mm(WING_1.depth + inchesToMm(1 / 8))));
    expect(deeper[0].run).toBe(roundToSixteenthInch(WING_1.run));
    const longer = solveWingDrag(winged, WINGS, target, { ...p, station: mm(p.station - inchesToMm(1 / 2)) }, DROP, NO_FIN_EDGES, "imperial");
    expect(longer[0].run).toBe(roundToSixteenthInch(mm(WING_1.run + inchesToMm(1 / 2))));
    expect(longer[0].depth).toBe(roundToSixteenthInch(WING_1.depth));
  });

  it("depth stays between 1/16 and 1 inch and run between 0 and 2 inches", () => {
    const p = at({ wing: 0, point: "inner" });
    const target: WingDragTarget = { wing: 0, point: "inner" };
    const wild = solveWingDrag(winged, WINGS, target, { station: mm(-500), halfWidth: mm(-500) }, DROP, NO_FIN_EDGES, "imperial");
    expect(wild[0].depth).toBe(inchesToMm(WING_DEPTH_RANGE_IN.max));
    expect(wild[0].run).toBe(inchesToMm(WING_RUN_RANGE_IN.max));
    const out = solveWingDrag(
      winged,
      WINGS,
      target,
      { station: mm(p.station + 500), halfWidth: mm(p.halfWidth + 500) },
      DROP,
      NO_FIN_EDGES,
      "imperial",
    );
    expect(out[0].depth).toBe(inchesToMm(WING_DEPTH_RANGE_IN.min));
    expect(out[0].run).toBe(inchesToMm(WING_RUN_RANGE_IN.min));
  });

  it("non-finite pointer input falls back to each range's minimum, as the outline's own solve does", () => {
    const bad = { station: mm(NaN), halfWidth: mm(Infinity) };
    const inner = solveWingDrag(winged, WINGS, { wing: 0, point: "inner" }, bad, DROP, NO_FIN_EDGES, "imperial");
    expect(inner[0].depth).toBe(inchesToMm(WING_DEPTH_RANGE_IN.min));
    expect(inner[0].run).toBe(inchesToMm(WING_RUN_RANGE_IN.min));
    const outer = solveWingDrag(winged, WINGS, { wing: 0, point: "outer" }, bad, DROP, NO_FIN_EDGES, "imperial");
    // Wing 1 with a wing 2 present: its range starts at 2" plus the gap (D2).
    expect(outer[0].station).toBe(inchesToMm(WING_POSITION_MIN_IN + mmToInches(wingOrderGap(WING_1))));
  });

  it("in Metric a drag lands depth and run on whole millimetres", () => {
    const p = at({ wing: 0, point: "inner" });
    const dragged = { station: mm(p.station - 3.3), halfWidth: mm(p.halfWidth - 2.6) };
    const next = solveWingDrag(winged, WINGS, { wing: 0, point: "inner" }, dragged, DROP, NO_FIN_EDGES, "metric");
    expect(Number.isInteger(next[0].depth)).toBe(true);
    expect(Number.isInteger(next[0].run)).toBe(true);
    expect(next[0].depth).toBe(roundToWholeMm(mm(WING_1.depth + 2.6)));
  });

  it("the corner radius never sits above what fits the step after the drag", () => {
    // Wing 2 starts rounded as far as it fits; a shorter, shallower step fits less.
    const p = at({ wing: 1, point: "inner" });
    const dragged = { station: mm(p.station + inchesToMm(1 / 4)), halfWidth: mm(p.halfWidth + inchesToMm(1 / 8)) };
    const next = solveWingDrag(winged, WINGS, { wing: 1, point: "inner" }, dragged, DROP, NO_FIN_EDGES, "imperial");
    expect(next[1].radius).toBeLessThanOrEqual(wingRadiusTop(next[1], "imperial"));
    expect(next[1].radius).toBeLessThan(WING_2.radius);
  });

  it("only the dragged wing changes: same length, the other wing the very same object", () => {
    const p = at({ wing: 1, point: "inner" });
    const dragged = { ...p, halfWidth: mm(p.halfWidth - 3) };
    const next = solveWingDrag(winged, WINGS, { wing: 1, point: "inner" }, dragged, DROP, NO_FIN_EDGES, "imperial");
    expect(next).toHaveLength(WINGS.length);
    expect(next[0]).toBe(WINGS[0]);
    expect(next).not.toBe(WINGS);
  });

  it("nearestWingDragTarget: nothing out of reach, the nearer point in reach, the earlier one on a tie", () => {
    const points = wingDragPoints(winged, WINGS, DROP);
    const outer0 = points[0].point;
    expect(nearestWingDragTarget(points, { station: mm(outer0.station + 100), halfWidth: outer0.halfWidth }, mm(10))).toBeNull();
    expect(nearestWingDragTarget(points, { station: mm(outer0.station + 1), halfWidth: outer0.halfWidth }, mm(10))).toEqual({
      wing: 0,
      point: "outer",
    });
    const twin: WingDragPointAt[] = [
      { target: { wing: 0, point: "outer" }, point: outer0 },
      { target: { wing: 1, point: "outer" }, point: outer0 },
    ];
    expect(nearestWingDragTarget(twin, outer0, mm(1))).toEqual({ wing: 0, point: "outer" });
  });
});
