import { describe, expect, it } from "vitest";
import { BOTTOM_COPY, bottomDepthCell } from "@/components/bottom/bottom-copy";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import { formatBottomStation } from "./blank-reasons";
import {
  BOTTOM_DEPTH_RANGE_IN,
  BOTTOM_DEPTH_STEP_IN,
  BOTTOM_DEPTH_STEP_MM,
  BOTTOM_MARK_STEP_IN,
  DEFAULT_BOTTOM,
  resolveBottom,
  startingChannels,
  startingCut,
  type BoardBottom,
} from "./bottom";
import { bottomPrintLines } from "./bottom-print";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import {
  formatBottomDepth,
  formatBottomDepthBare,
  formatMark,
  formatMarkBare,
  formatMarkOrLess,
  formatMarkOrLessBare,
  measureSlider,
} from "./measure-display";
import { buildOutline } from "./outline";
import {
  UNITS_SYSTEMS,
  formatInchesFraction,
  formatInchesFractionOrLessFine,
  formatTenthMm,
  formatTenthMmOrLess,
  inchesToMm,
  mm,
  mmToInches,
  roundToTenthMm,
  type UnitsSystem,
} from "./units";

/*
 * BOTTOM's depths step and read in 1/64" (0.1 mm in Metric) everywhere a depth is shown (quick 261116-tqs, D-09, the
 * founder, 2026-11-16: "1/64" (or .1mm) for depth"), while the marks across the board stay 1/16" (1 mm) and the stations
 * along it 1/2" (10 mm) (D-10). Every expected reading is the app's own formatter's; only inch inputs are typed.
 */

const I = inchesToMm;

describe("the 1/64\" fraction and the tenth of a millimetre", () => {
  it("formatInchesFraction at 64 reduces: 3/64\", 1/8\", 1 1/32\"", () => {
    expect(formatInchesFraction(I(3 / 64), 64)).toBe('3/64"');
    expect(formatInchesFraction(I(8 / 64), 64)).toBe('1/8"');
    expect(formatInchesFraction(I(1 + 2 / 64), 64)).toBe('1 1/32"');
    expect(formatInchesFraction(I(1), 64)).toBe('1"');
  });

  it("every 1/16\" step reads in Imperial exactly as the old depth reader read it", () => {
    for (let sixteenths = 1; sixteenths <= 8; sixteenths++) {
      const depth = I(sixteenths / 16);
      expect(formatBottomDepth(depth, "imperial")).toBe(formatMarkOrLess(depth, "imperial"));
      expect(formatBottomDepthBare(depth, "imperial")).toBe(formatMarkOrLessBare(depth, "imperial"));
    }
  });

  it("a depth that is there never reads as nothing: <1/64\" and <0.1 mm; an actual zero reads zero", () => {
    expect(formatInchesFractionOrLessFine(mm(0.1))).toBe('<1/64"');
    expect(formatBottomDepth(mm(0.1), "imperial")).toBe('<1/64"');
    expect(formatTenthMmOrLess(mm(0.04))).toBe("<0.1");
    expect(formatBottomDepth(mm(0.04), "metric")).toBe("<0.1 mm");
    expect(formatBottomDepthBare(mm(0.04), "metric")).toBe("<0.1");
    expect(formatBottomDepth(mm(0), "imperial")).toBe('0"');
    expect(formatBottomDepth(mm(0), "metric")).toBe(`${formatTenthMm(mm(0))} mm`);
  });

  it("Metric reads to a tenth of a millimetre: 1/8\" reads 3.2 mm", () => {
    expect(formatBottomDepth(I(1 / 8), "metric")).toBe(`${formatTenthMm(I(1 / 8))} mm`);
    expect(formatBottomDepth(I(1 / 8), "metric")).toBe("3.2 mm");
    expect(formatBottomDepthBare(I(1 / 8), "metric")).toBe("3.2");
  });

  it("roundToTenthMm lands on the tenth and agrees with what is read", () => {
    for (const v of [0, 0.04, 0.05, 3.14159, 6.35, 12.7]) {
      const snapped = roundToTenthMm(mm(v));
      expect(Math.abs(snapped * 10 - Math.round(snapped * 10))).toBeLessThan(1e-9);
      expect(formatTenthMm(snapped)).toBe(formatTenthMm(mm(v)));
    }
  });
});

describe("the Depth slider's step", () => {
  const range = BOTTOM_DEPTH_RANGE_IN;

  it("is 1/64\" in Imperial and 0.1 mm in Metric, and the marks' own step stays 1/16\"", () => {
    expect(BOTTOM_DEPTH_STEP_IN).toBe(1 / 64);
    expect(BOTTOM_MARK_STEP_IN).toBe(1 / 16);
    const imperial = measureSlider(I(3 / 16), range, BOTTOM_DEPTH_STEP_IN, BOTTOM_DEPTH_STEP_MM, "imperial");
    expect(imperial.step).toBe(1 / 64);
    expect(imperial.value).toBeCloseTo(3 / 16, 9);
    const metric = measureSlider(I(3 / 16), range, BOTTOM_DEPTH_STEP_IN, BOTTOM_DEPTH_STEP_MM, "metric");
    expect(metric.step).toBe(BOTTOM_DEPTH_STEP_MM);
  });

  it("a Metric drag lands on the 0.1 mm grid, inside the range", () => {
    const view = measureSlider(I(3 / 16), range, BOTTOM_DEPTH_STEP_IN, BOTTOM_DEPTH_STEP_MM, "metric");
    for (const dragged of [0, 0.04, 3.14159, 6.35, 12.7, 99]) {
      const stored = view.toMm(dragged);
      expect(Math.abs(stored * 10 - Math.round(stored * 10)), `${dragged}`).toBeLessThan(1e-9);
      expect(stored).toBeGreaterThanOrEqual(view.min - 1e-9);
      expect(stored).toBeLessThanOrEqual(view.max + 1e-9);
    }
  });

  it("every slider that steps a whole millimetre is unchanged: a drag still lands on a whole millimetre", () => {
    const view = measureSlider(I(3), { min: 0, max: 6 }, BOTTOM_MARK_STEP_IN, 1, "metric");
    for (const dragged of [0.4, 3.4, 3.6, 100.2]) expect(view.toMm(dragged) % 1).toBe(0);
    expect(view.step).toBe(1);
  });
});

describe("every reader of a bottom depth, at an off-step depth", () => {
  const fields = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
  const board = designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
  const OFF = I(0.11);
  const bottom: BoardBottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: { ...startingCut("center", "Deep Single Concave", board), depth: OFF },
    tail: { ...startingCut("tail", "Panel Vee", board), depth: I(0.2031) },
  };
  bottom.channels = { ...startingChannels(4, board, bottom.channels), depth: I(0.0937) };

  it.each(UNITS_SYSTEMS)("%s: DATA's and the printed sheet's depth cell reads the 1/64\" form", (system: UnitsSystem) => {
    expect(bottomDepthCell(OFF, system)).toBe(formatBottomDepthBare(OFF, system));
  });

  it.each(UNITS_SYSTEMS)("%s: the printed sentences carry a cut's and the channels' depth in the 1/64\" form", (system: UnitsSystem) => {
    const lines = bottomPrintLines(resolveBottom(bottom, board), board, system).join("\n");
    expect(lines).toContain(formatBottomDepth(bottom.center.depth, system));
    expect(lines).toContain(formatBottomDepth(bottom.tail.depth, system));
    expect(lines).toContain(`${formatBottomDepth(bottom.channels.depth, system)} deep`);
  });

  it("in Imperial an off-step depth reads between 1/16\"s where the old reader would have rounded to a sixteenth", () => {
    expect(formatBottomDepth(OFF, "imperial")).not.toBe(formatMarkOrLess(OFF, "imperial"));
    expect(mmToInches(OFF)).toBeGreaterThan(0.1);
  });

  it("a station, an across mark and DATA's layout marks at off-step values read exactly what the same reader gives the value rounded to its own step", () => {
    // Across marks round to 1/16" (1 mm); the readers are unchanged by the finer depth.
    const off = I(1.3713);
    expect(formatMark(off, "imperial")).toBe(formatMark(I(Math.round(1.3713 * 16) / 16), "imperial"));
    expect(formatMarkBare(off, "metric")).toBe(formatMarkBare(mm(Math.round(off)), "metric"));
    // A station is a dim, read to its own 1/16" (0.1 cm): the stored value is never snapped on the way to the page.
    expect(formatBottomStation(I(37.3), "imperial")).toBe(formatBottomStation(I(Math.round(37.3 * 16) / 16), "imperial"));
    expect(BOTTOM_COPY.emptyCell.length).toBeGreaterThan(0);
  });
});
