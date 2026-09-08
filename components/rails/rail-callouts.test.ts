import { describe, expect, it, vi } from "vitest";

// `rail-callouts.ts` imports `RAIL_SEGMENT_COLORS` from `./rail-section-plot`, which reads
// `useUnits()` (components/units-provider.tsx) -> the real "use server" units-preference action
// -> the database client at import time. Stubbed the same way rail-section-plot.test.ts already
// does, since this file only needs the pure colour map and layout functions, never a render.
vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }));

import { buildRailSegments, computeRailSection, type RailSectionOutput } from "@/lib/geometry/rail-bands";
import { inchesToMm, mmToInches } from "@/lib/geometry/units";
import {
  buildRailCallouts,
  calloutTextExtent,
  deOverlapCallouts,
  RAIL_CALLOUT_ANCHORS,
  RAIL_CALLOUT_AXIS_CLEARANCE,
  RAIL_CALLOUT_BELOW_AXIS_OFFSET,
  RAIL_CALLOUT_EDGE_LIFT,
  RAIL_CALLOUT_MIN_GAP,
  RAIL_CALLOUT_TUCK2_LIFT,
  type RailCallout,
} from "./rail-callouts";
import { CALLOUT_RIGHT_PAD, computeRailPlotBounds, railPlotProjection } from "./rail-section-plot";

/** The same fixed example-rail inputs rail-instructions.tsx's ExampleRailFigure uses (D-20),
 * Flat state — real geometry so Deck 2's band1-interpolated y and Corner Cut's own apex-end y are
 * exercised with genuine values, not a hand-built stub. `singleTuck` builds the same section with
 * Bottom Tuck 1/2 removed, for the tests that need a rail with no second tuck line. */
function buildExampleOutput(domed: boolean, options?: { singleTuck?: boolean }): RailSectionOutput {
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
    singleTuck: options?.singleTuck ?? false,
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
  it("names eleven anchors in the new order", () => {
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
      "Bottom Tuck 2",
      "Bottom Tuck 3",
    ]);
  });

  it("carries the negated edge lift on Deck 3/Deck 1, the negated tuck2 lift on Bottom Tuck 2, the positive below-axis push on Bottom Tuck 1/3, and none on the other six", () => {
    const edgeLiftNames = new Set(["Deck 3", "Deck 1"]);
    const belowAxisNames = new Set(["Bottom Tuck 1", "Bottom Tuck 3"]);
    for (const anchor of RAIL_CALLOUT_ANCHORS) {
      if (edgeLiftNames.has(anchor.name)) {
        expect(anchor.dy).toBe(-RAIL_CALLOUT_EDGE_LIFT);
      } else if (anchor.name === "Bottom Tuck 2") {
        expect(anchor.dy).toBe(-RAIL_CALLOUT_TUCK2_LIFT);
      } else if (belowAxisNames.has(anchor.name)) {
        expect(anchor.dy).toBe(RAIL_CALLOUT_BELOW_AXIS_OFFSET);
      } else {
        expect(anchor.dy).toBeUndefined();
      }
    }
  });
});

describe("buildRailCallouts", () => {
  const output = buildExampleOutput(false);
  const callouts = buildRailCallouts(output, output.thicknessEff, identityProjection);

  it("returns eleven entries, in the new order", () => {
    expect(callouts).toHaveLength(11);
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
      "Bottom Tuck 2",
      "Bottom Tuck 3",
    ]);
  });

  it("carries side 1 on Apex, Domed Taper, Rail Mk1, Corner Cut and Tuck 1; side -1 on Deck 3, Deck 2, Deck 1 and Bottom Tuck 2; and side 0 on Bottom Tuck 1 and Bottom Tuck 3", () => {
    const sideOneNames = new Set(["Apex", "Domed Taper", "Rail Mk1", "Corner Cut", "Tuck 1"]);
    const sideZeroNames = new Set(["Bottom Tuck 1", "Bottom Tuck 3"]);
    for (const c of callouts) {
      if (sideOneNames.has(c.name)) {
        expect(c.side).toBe(1);
      } else if (sideZeroNames.has(c.name)) {
        expect(c.side).toBe(0);
      } else {
        expect(c.side).toBe(-1);
      }
    }
  });

  it("gives every entry a non-empty name and no numeric value field", () => {
    for (const c of callouts) {
      expect(c.name.length).toBeGreaterThan(0);
      expect((c as unknown as Record<string, unknown>).value).toBeUndefined();
    }
  });

  it("also builds a consistent eleven entries for the Domed state", () => {
    const domedOutput = buildExampleOutput(true);
    const domedCallouts = buildRailCallouts(domedOutput, domedOutput.thicknessEff, identityProjection);
    expect(domedCallouts).toHaveLength(11);
  });

  it("Corner Cut's raw anchor is its own segment's apex end, (px(0), py(mmToInches(r.cornerCutRail)))", () => {
    const r = output.result;
    const cornerCut = callouts.find((c) => c.name === "Corner Cut")!;
    expect(cornerCut.anchorX).toBeCloseTo(0, 9);
    expect(cornerCut.anchorY).toBeCloseTo(mmToInches(r.cornerCutRail!), 9);
    // No dy on Corner Cut, so its resting y is its raw anchor y.
    expect(cornerCut.y).toBeCloseTo(mmToInches(r.cornerCutRail!), 9);
  });

  it("lifts Deck 3/Deck 1 one lift above the section's own thickness, lifts Bottom Tuck 2 one lift above its own midpoint, and pushes Bottom Tuck 1/3 one offset below zero", () => {
    const r = output.result;
    const thicknessIn = mmToInches(output.thicknessEff);
    const deck3 = callouts.find((c) => c.name === "Deck 3")!;
    const deck1 = callouts.find((c) => c.name === "Deck 1")!;
    const bottomTuck1 = callouts.find((c) => c.name === "Bottom Tuck 1")!;
    const bottomTuck2 = callouts.find((c) => c.name === "Bottom Tuck 2")!;
    const bottomTuck3 = callouts.find((c) => c.name === "Bottom Tuck 3")!;

    // Identity projection: py(y) = y, so the callout's y should equal the geometry's own y minus
    // the lift (the plot's y grows downward, so lifting off the line subtracts) or plus the
    // below-axis push (the plot's y grows downward, so pushing further down adds).
    expect(deck3.y).toBeCloseTo(thicknessIn - RAIL_CALLOUT_EDGE_LIFT, 9);
    expect(deck1.y).toBeCloseTo(thicknessIn - RAIL_CALLOUT_EDGE_LIFT, 9);
    expect(bottomTuck2.y).toBeCloseTo(mmToInches(r.railTuck1) / 2 - RAIL_CALLOUT_TUCK2_LIFT, 9);
    expect(bottomTuck1.y).toBeCloseTo(0 + RAIL_CALLOUT_BELOW_AXIS_OFFSET, 9);
    expect(bottomTuck3.y).toBeCloseTo(0 + RAIL_CALLOUT_BELOW_AXIS_OFFSET, 9);
  });

  it("leaves the three unmoved marks exactly on their own geometry with no lift applied", () => {
    const r = output.result;
    const apex = callouts.find((c) => c.name === "Apex")!;
    const railMk1 = callouts.find((c) => c.name === "Rail Mk1")!;
    const tuck1 = callouts.find((c) => c.name === "Tuck 1")!;

    expect(apex.y).toBeCloseTo(mmToInches(r.apexCenter), 9);
    expect(railMk1.y).toBeCloseTo(mmToInches(r.railMark1), 9);
    expect(tuck1.y).toBeCloseTo(mmToInches(r.railTuck1), 9);
  });

  it("a single-tuck section yields ten callouts and no Bottom Tuck 2, while a normal section yields eleven and does contain it", () => {
    const singleTuckOutput = buildExampleOutput(false, { singleTuck: true });
    const singleTuckCallouts = buildRailCallouts(singleTuckOutput, singleTuckOutput.thicknessEff, identityProjection);
    expect(singleTuckCallouts).toHaveLength(10);
    expect(singleTuckCallouts.map((c) => c.name)).not.toContain("Bottom Tuck 2");

    expect(callouts).toHaveLength(11);
    expect(callouts.map((c) => c.name)).toContain("Bottom Tuck 2");
  });

  it("every callout carries an anchorX/anchorY pair, the mark's own position with no dy folded in", () => {
    for (const c of callouts) {
      expect(c.anchorX).not.toBeUndefined();
      expect(c.anchorY).not.toBeUndefined();
    }
    // The two below-axis names never move sideways off their mark — x equals anchorX exactly.
    const bottomTuck1 = callouts.find((c) => c.name === "Bottom Tuck 1")!;
    const bottomTuck3 = callouts.find((c) => c.name === "Bottom Tuck 3")!;
    expect(bottomTuck1.x).toBe(bottomTuck1.anchorX);
    expect(bottomTuck3.x).toBe(bottomTuck3.anchorX);
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

  it("the real example rail: no side-1/-1 callout ends up below the axis ceiling, the two side-0 callouts sit below it by design, and none runs off the right edge", () => {
    const output = buildExampleOutput(false);
    const paddedBounds = computeRailPlotBounds(output, output.bounds.xAxisMin, { calloutRoom: true });
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    expect(result).toHaveLength(11);
    for (const c of result) {
      if (c.side === 0) {
        expect(c.y).toBeGreaterThan(projection.py(0));
      } else {
        expect(c.y).toBeLessThanOrEqual(maxY + 1e-9);
      }
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

  // Quick task 260908-bk1: the six left-hand names on the example rail used to chain into one
  // column because the old rule grouped by anchor-x proximity (95px), not by whether the drawn
  // *text* could ever touch. These five cases pin the replacement text-collision rule.

  it("(a) far-apart short names are both left alone: their anchors are 84px apart (inside the old 95px bucket) but their text can never touch", () => {
    const input = [
      callout({ key: "deck3", name: "Deck 3", x: 250, y: 100, side: -1 }),
      callout({ key: "deck1", name: "Deck 1", x: 334, y: 100, side: -1 }),
    ];
    const result = deOverlapCallouts(input, RAIL_CALLOUT_MIN_GAP);
    expect(result.find((c) => c.key === "deck3")!.y).toBe(100);
    expect(result.find((c) => c.key === "deck1")!.y).toBe(100);
  });

  it("(b) the same two anchors with long names ARE stacked, since their estimated text really does overlap", () => {
    const input = [
      callout({ key: "a", name: "Bottom Tuck 3", x: 250, y: 100, side: -1 }),
      callout({ key: "b", name: "Bottom Tuck 1", x: 334, y: 100, side: -1 }),
    ];
    const result = deOverlapCallouts(input, RAIL_CALLOUT_MIN_GAP);
    const a = result.find((c) => c.key === "a")!;
    const b = result.find((c) => c.key === "b")!;
    expect(Math.abs(b.y - a.y)).toBeGreaterThanOrEqual(RAIL_CALLOUT_MIN_GAP);
  });

  it("(c) the ceiling moves only the competing pair, not a name that doesn't compete with either", () => {
    const input = [
      callout({ key: "deck3", name: "Deck 3", x: 250, y: 11.6, side: -1 }),
      callout({ key: "bt3", name: "Bottom Tuck 3", x: 421, y: 213, side: -1 }),
      callout({ key: "bt1", name: "Bottom Tuck 1", x: 450, y: 213, side: -1 }),
    ];
    const result = deOverlapCallouts(input, 17, 211);
    expect(result.find((c) => c.key === "deck3")!.y).toBe(11.6);
    expect(result.find((c) => c.key === "bt1")!.y).toBe(211);
    expect(result.find((c) => c.key === "bt3")!.y).toBe(194);
  });

  it("(d) the real example rail, Flat and Domed: every side-1/-1 callout stays on the plot, Deck 3/Deck 1 are unshifted by the pass, and both side-0 callouts sit below the axis", () => {
    for (const domed of [false, true]) {
      const output = buildExampleOutput(domed);
      const projection = railPlotProjection(output, output.bounds.xAxisMin);
      const raw = buildRailCallouts(output, output.thicknessEff, projection);
      const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
      const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

      for (const c of result) {
        if (c.side === 0) {
          expect(c.y).toBeGreaterThan(projection.py(0));
        } else {
          expect(c.y).toBeGreaterThan(0);
          expect(c.y).toBeLessThanOrEqual(maxY + 1e-9);
        }
      }

      const expectedDeckY = projection.py(mmToInches(output.thicknessEff)) - RAIL_CALLOUT_EDGE_LIFT;
      expect(result.find((c) => c.name === "Deck 3")!.y).toBeCloseTo(expectedDeckY, 9);
      expect(result.find((c) => c.name === "Deck 1")!.y).toBeCloseTo(expectedDeckY, 9);
    }
  });

  it("(e) the apex column still stacks: the five side-1 callouts (all anchored at the same x) end up at least RAIL_CALLOUT_MIN_GAP apart from their nearest neighbour", () => {
    const output = buildExampleOutput(false);
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    const sideOne = result.filter((c) => c.side === 1).sort((a, b) => a.y - b.y);
    expect(sideOne).toHaveLength(5);
    for (let i = 1; i < sideOne.length; i++) {
      expect(sideOne[i].y - sideOne[i - 1].y).toBeGreaterThanOrEqual(RAIL_CALLOUT_MIN_GAP - 1e-9);
    }
  });

  it("(f) after the de-overlap pass, the apex column reads Rail Mk1, then Corner Cut, then Apex, then Tuck 1, in ascending y with every adjacent gap at least RAIL_CALLOUT_MIN_GAP", () => {
    const output = buildExampleOutput(false);
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    const apexColumnOrder = ["Rail Mk1", "Corner Cut", "Apex", "Tuck 1"];
    const byName = new Map(result.map((c) => [c.name, c]));
    const ordered = apexColumnOrder.map((name) => byName.get(name)!);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].y).toBeGreaterThan(ordered[i - 1].y);
      expect(ordered[i].y - ordered[i - 1].y).toBeGreaterThanOrEqual(RAIL_CALLOUT_MIN_GAP - 1e-9);
    }
  });

  it("(g) Bottom Tuck 2 is unmoved by the de-overlap pass: its y before and after is anchorY - RAIL_CALLOUT_TUCK2_LIFT", () => {
    const output = buildExampleOutput(false);
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    const rawBottomTuck2 = raw.find((c) => c.name === "Bottom Tuck 2")!;
    const resultBottomTuck2 = result.find((c) => c.name === "Bottom Tuck 2")!;
    expect(rawBottomTuck2.anchorX).toBeCloseTo(projection.px(-mmToInches(output.result.bottomTuck2)), 9);
    expect(rawBottomTuck2.anchorY).toBeCloseTo(projection.py(mmToInches(output.result.railTuck1) / 2), 9);
    expect(rawBottomTuck2.y).toBeCloseTo(rawBottomTuck2.anchorY! - RAIL_CALLOUT_TUCK2_LIFT, 9);
    expect(resultBottomTuck2.y).toBeCloseTo(rawBottomTuck2.anchorY! - RAIL_CALLOUT_TUCK2_LIFT, 9);
  });

  it("(h) Bottom Tuck 1 and Bottom Tuck 3 come out of the pass at py(0) + RAIL_CALLOUT_BELOW_AXIS_OFFSET and one RAIL_CALLOUT_MIN_GAP below that, each still at its own mark's x", () => {
    const output = buildExampleOutput(false);
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    const bottomTuck1 = result.find((c) => c.name === "Bottom Tuck 1")!;
    const bottomTuck3 = result.find((c) => c.name === "Bottom Tuck 3")!;
    expect(bottomTuck1.y).toBeCloseTo(projection.py(0) + RAIL_CALLOUT_BELOW_AXIS_OFFSET, 9);
    expect(bottomTuck3.y).toBeCloseTo(bottomTuck1.y + RAIL_CALLOUT_MIN_GAP, 9);
    expect(bottomTuck1.x).toBe(bottomTuck1.anchorX);
    expect(bottomTuck3.x).toBe(bottomTuck3.anchorX);
  });

  it("(i) every callout on the example rail carries an anchorX/anchorY pair, and the de-overlap pass returns them untouched", () => {
    const output = buildExampleOutput(false);
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    for (let i = 0; i < raw.length; i++) {
      expect(raw[i].anchorX).not.toBeUndefined();
      expect(raw[i].anchorY).not.toBeUndefined();
      expect(result[i].anchorX).toBe(raw[i].anchorX);
      expect(result[i].anchorY).toBe(raw[i].anchorY);
    }
  });

  it("(j) every callout's estimated text box lies inside the padded bounds", () => {
    const output = buildExampleOutput(false);
    const paddedBounds = computeRailPlotBounds(output, output.bounds.xAxisMin, { calloutRoom: true });
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    const maxY = projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE;
    const result = deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, maxY);

    for (const c of result) {
      const [lo, hi] = calloutTextExtent(c);
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(paddedBounds.width);
      // Half a row gap as a conservative stand-in for a line's half-height, rather than inventing
      // a new constant.
      expect(c.y + RAIL_CALLOUT_MIN_GAP / 2).toBeLessThanOrEqual(paddedBounds.height);
    }
  });
});
