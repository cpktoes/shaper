import { describe, expect, it, vi } from "vitest";

// `rail-callouts.ts` imports `RAIL_SEGMENT_COLORS` from `./rail-section-plot`, which reads
// `useUnits()` (components/units-provider.tsx) -> the real "use server" units-preference action
// -> the database client at import time. Stubbed the same way rail-section-plot.test.ts already
// does, since this file only needs the pure colour map and layout functions, never a render.
vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }));

import { buildRailSegments, computeRailSection, type RailSectionOutput } from "@/lib/geometry/rail-bands";
import { inchesToMm } from "@/lib/geometry/units";
import {
  buildRailCallouts,
  deOverlapCallouts,
  RAIL_CALLOUT_ANCHORS,
  RAIL_CALLOUT_AXIS_CLEARANCE,
  RAIL_CALLOUT_MIN_GAP,
  type RailCallout,
} from "./rail-callouts";
import { CALLOUT_RIGHT_PAD, computeRailPlotBounds, railPlotProjection } from "./rail-section-plot";

/** The same fixed example-rail inputs rail-instructions.tsx's ExampleRailFigure uses (D-20),
 * Flat state — real geometry so Deck 2's band1-interpolated y and Corner Cut's non-obvious
 * railMark1 y (Pitfall 1) are exercised with genuine values, not a hand-built stub. */
function buildExampleOutput(domed: boolean): RailSectionOutput {
  const thicknessIn = domed ? 3 : 3.5;
  const thickness = inchesToMm(thicknessIn);
  const domedBandBase = inchesToMm(6);
  const result = computeRailSection({
    thickness,
    ratioTopPercent: 60,
    family: 3,
    domedBandBase,
    scale: 1,
    cornerCutOffsetOverride: null,
    removeCornerCut: false,
    singleTuck: false,
    bottomTuck3Override: null,
    symmetrical: false,
    hardEdge: false,
  });
  const opts = { boardThickness: inchesToMm(3.5), railThicknessVal: inchesToMm(3), domedBandBase };
  const segments = buildRailSegments(result, thickness, domed, opts);
  return {
    domed,
    boardThickness: opts.boardThickness,
    railThicknessClamped: opts.railThicknessVal,
    thicknessEff: thickness,
    result,
    profile: [],
    segments,
    bounds: { xAxisMin: inchesToMm(-8), yAxisMax: inchesToMm(4) },
    dataGroups: [],
  };
}

const identityProjection = { px: (x: number) => x, py: (y: number) => y };

describe("RAIL_CALLOUT_ANCHORS", () => {
  it("names ten anchors in the prototype's own order", () => {
    expect(RAIL_CALLOUT_ANCHORS.map((a) => a.name)).toEqual([
      "Apex",
      "Domed Taper",
      "Rail Mk1",
      "Corner Cut",
      "Deck 3",
      "Deck 2",
      "Deck 1",
      "Tuck 1",
      "Bottom Tuck 1",
      "Bottom Tuck 3",
    ]);
  });
});

describe("buildRailCallouts", () => {
  const output = buildExampleOutput(false);
  const callouts = buildRailCallouts(output, output.thicknessEff, identityProjection);

  it("returns exactly ten entries, in the prototype's own order", () => {
    expect(callouts).toHaveLength(10);
    expect(callouts.map((c) => c.name)).toEqual([
      "Apex",
      "Domed Taper",
      "Rail Mk1",
      "Corner Cut",
      "Deck 3",
      "Deck 2",
      "Deck 1",
      "Tuck 1",
      "Bottom Tuck 1",
      "Bottom Tuck 3",
    ]);
  });

  it("carries side 1 on Apex, Domed Taper, Rail Mk1 and Tuck 1, and side -1 on the other six", () => {
    const sideOneNames = new Set(["Apex", "Domed Taper", "Rail Mk1", "Tuck 1"]);
    for (const c of callouts) {
      expect(c.side).toBe(sideOneNames.has(c.name) ? 1 : -1);
    }
  });

  it("gives every entry a non-empty name and no numeric value field", () => {
    for (const c of callouts) {
      expect(c.name.length).toBeGreaterThan(0);
      expect((c as unknown as Record<string, unknown>).value).toBeUndefined();
    }
  });

  it("also builds a consistent ten entries for the Domed state", () => {
    const domedOutput = buildExampleOutput(true);
    const domedCallouts = buildRailCallouts(domedOutput, domedOutput.thicknessEff, identityProjection);
    expect(domedCallouts).toHaveLength(10);
  });
});

describe("deOverlapCallouts", () => {
  function callout(overrides: Partial<RailCallout>): RailCallout {
    return { key: "k", name: "N", x: 0, y: 0, side: -1, color: "#000", ...overrides };
  }

  it("pushes two same-side entries closer than minGap apart to at least minGap", () => {
    const input = [callout({ key: "a", x: 0, y: 0 }), callout({ key: "b", x: 5, y: 5 })];
    const result = deOverlapCallouts(input, 17);
    const a = result.find((c) => c.key === "a")!;
    const b = result.find((c) => c.key === "b")!;
    expect(Math.abs(b.y - a.y)).toBeGreaterThanOrEqual(17);
  });

  it("keeps input order when two same-side entries share the same y (stable sort)", () => {
    const input = [callout({ key: "a", x: 0, y: 10 }), callout({ key: "b", x: 5, y: 10 })];
    const result = deOverlapCallouts(input, 17);
    expect(result.map((c) => c.key)).toEqual(["a", "b"]);
  });

  it("never moves an entry because of one on the opposite side", () => {
    const input = [callout({ key: "a", x: 0, y: 0, side: 1 }), callout({ key: "b", x: 0, y: 2, side: -1 })];
    const result = deOverlapCallouts(input, 17);
    expect(result.find((c) => c.key === "a")!.y).toBe(0);
    expect(result.find((c) => c.key === "b")!.y).toBe(2);
  });

  it("leaves entries already further apart than minGap unchanged", () => {
    const input = [callout({ key: "a", x: 0, y: 0 }), callout({ key: "b", x: 5, y: 100 })];
    const result = deOverlapCallouts(input, 17);
    expect(result.find((c) => c.key === "a")!.y).toBe(0);
    expect(result.find((c) => c.key === "b")!.y).toBe(100);
  });

  it("shifts a whole cluster up when its stacked lowest entry would fall past the ceiling", () => {
    const input = [callout({ key: "a", x: 0, y: 0 }), callout({ key: "b", x: 5, y: 5 })];
    const maxY = 10;
    const result = deOverlapCallouts(input, 17, maxY);
    const a = result.find((c) => c.key === "a")!;
    const b = result.find((c) => c.key === "b")!;
    // Stacked first: a=0, b=17 (17 gap). b is the lowest and falls 7 past maxY=10, so both are
    // shifted up by 7: a=-7, b=10.
    expect(b.y).toBe(maxY);
    expect(b.y - a.y).toBeCloseTo(17, 9);
  });

  it("leaves a cluster that already sits above the ceiling untouched", () => {
    const input = [callout({ key: "a", x: 0, y: 0 }), callout({ key: "b", x: 5, y: 5 })];
    const result = deOverlapCallouts(input, 17, 1000);
    expect(result.find((c) => c.key === "a")!.y).toBe(0);
    expect(result.find((c) => c.key === "b")!.y).toBe(17);
  });

  it("with no ceiling supplied, stacking still pushes the lower entry past where a ceiling would have held it", () => {
    const input = [callout({ key: "a", x: 0, y: 0 }), callout({ key: "b", x: 5, y: 5 })];
    const result = deOverlapCallouts(input, 17);
    const b = result.find((c) => c.key === "b")!;
    expect(b.y).toBe(17);
    expect(b.y).toBeGreaterThan(10); // past where the maxY=10 case above held it
  });

  it("the real example rail: no callout ends up below the axis ceiling, and none runs off the right edge", () => {
    const output = buildExampleOutput(false);
    const paddedBounds = computeRailPlotBounds(output, output.bounds.xAxisMin, { calloutRoom: true });
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    expect(result).toHaveLength(10);
    for (const c of result) {
      expect(c.y).toBeLessThanOrEqual(maxY + 1e-9);
    }

    // The pure-function half of "nothing runs off the right edge": every callout's x sits inside
    // the plot's own drawn box (pixel space runs from 0 to the box's own width), and the box built
    // with callout room leaves at least CALLOUT_RIGHT_PAD of space beyond the rightmost anchor. The
    // drawn text width itself is left to the browser check.
    const rightmostAnchorX = Math.max(...result.map((c) => c.x));
    for (const c of result) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(paddedBounds.width);
    }
    expect(paddedBounds.width - rightmostAnchorX).toBeGreaterThanOrEqual(CALLOUT_RIGHT_PAD);
  });
});
