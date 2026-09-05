import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN, WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM } from "./outline";
import {
  commitTypedMeasure,
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatMarkBare,
  formatSignedDim,
  measureSlider,
  stationLabel,
  columnUnitSuffix,
} from "./measure-display";
import {
  UNITS_SYSTEMS,
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  inchesToMm,
  mm,
  type UnitsSystem,
} from "./units";

describe("formatDim", () => {
  it("imperial branch is formatInchesFraction, unchanged", () => {
    expect(formatDim(inchesToMm(20.25), "imperial")).toBe(formatInchesFraction(inchesToMm(20.25)));
  });

  it("metric branch is formatCentimetres plus its own unit (D-09)", () => {
    // 20.25in * 25.4 = 514.35mm, which formatCentimetres reads as "51.4" (units.test.ts pins this).
    expect(formatDim(inchesToMm(20.25), "metric")).toBe("51.4 cm");
  });
});

describe("formatDimBare", () => {
  it("metric branch has no unit suffix (D-10)", () => {
    expect(formatDimBare(inchesToMm(20.25), "metric")).toBe("51.4");
  });

  it("imperial branch keeps its inch mark (D-10: only metric drops the suffix in a table)", () => {
    expect(formatDimBare(inchesToMm(20.25), "imperial")).toBe('20 1/4"');
  });
});

describe("formatMark", () => {
  it("imperial branch is formatInchesFraction, unchanged", () => {
    expect(formatMark(inchesToMm(2.625), "imperial")).toBe(formatInchesFraction(inchesToMm(2.625)));
  });

  it("metric branch is formatWholeMm plus its own unit (D-09)", () => {
    // 2.625in * 25.4 = 66.675mm, which formatWholeMm reads as "67" (units.test.ts pins this).
    expect(formatMark(inchesToMm(2.625), "metric")).toBe("67 mm");
  });

  it("reads the same stored value formatDim reads as centimetres — the D-01 worked example", () => {
    const centreThickness = inchesToMm(2.625);
    expect(formatMark(centreThickness, "metric")).toBe("67 mm");
    expect(formatDim(centreThickness, "metric")).toBe("6.7 cm");
  });
});

describe("formatMarkBare", () => {
  it("metric branch has no unit suffix", () => {
    expect(formatMarkBare(inchesToMm(2.625), "metric")).toBe("67");
  });

  it("imperial branch keeps its inch mark", () => {
    expect(formatMarkBare(inchesToMm(2.625), "imperial")).toBe('2 5/8"');
  });
});

describe("formatSignedDim", () => {
  it("imperial branch is formatSignedInchesFraction, unchanged", () => {
    expect(formatSignedDim(inchesToMm(2.25), "imperial")).toBe(formatSignedInchesFraction(inchesToMm(2.25)));
  });

  it("metric prefixes a positive value with an ASCII +", () => {
    // A widepoint 51mm toward the nose: formatCentimetres(51) = "5.1" (5.1cm), so "+5.1 cm".
    expect(formatSignedDim(mm(51), "metric")).toBe("+5.1 cm");
  });

  it("metric keeps the minus on a negative value rather than doubling it", () => {
    // 25mm toward the tail: formatCentimetres(-25) = "-2.5".
    expect(formatSignedDim(mm(-25), "metric")).toBe("-2.5 cm");
  });

  it("metric leaves zero unsigned, mirroring imperial's unsigned 0\"", () => {
    expect(formatSignedDim(mm(0), "metric")).toBe("0 cm");
  });

  it("metric signs off the PRINTED value, so a hair off zero prints an unsigned 0 cm", () => {
    // 0.04mm rounds to "0.0" at formatCentimetres's one-decimal precision.
    expect(formatSignedDim(mm(0.04), "metric")).toBe("0 cm");
    expect(formatSignedDim(mm(-0.04), "metric")).toBe("0 cm");
  });

  it("uses ASCII +/-, never a typographic minus (the flagged encoding decision)", () => {
    const positive = formatSignedDim(mm(51), "metric");
    const negative = formatSignedDim(mm(-25), "metric");
    expect(positive.startsWith("+")).toBe(true);
    expect(negative.charCodeAt(0)).toBe("-".charCodeAt(0));
  });
});

describe("formatLength", () => {
  it("imperial branch is formatFeetInches, unchanged", () => {
    expect(formatLength(mm(1880), "imperial")).toBe(formatFeetInches(mm(1880)));
  });

  it("metric branch is formatCentimetres plus cm, no dual form", () => {
    expect(formatLength(mm(1880), "metric")).toBe("188.0 cm");
  });
});

describe("stationLabel", () => {
  it("imperial is the literal 12\"", () => {
    expect(stationLabel("imperial")).toBe('12"');
  });

  it("metric is the honest conversion off MEASURE_STATION_MM, never a hand-typed 30 cm (D-03)", () => {
    expect(stationLabel("metric")).toBe(`${formatCentimetres(MEASURE_STATION_MM)} cm`);
    expect(stationLabel("metric")).toBe("30.5 cm");
  });
});

describe("columnUnitSuffix", () => {
  it("imperial is always the empty string, for either family", () => {
    expect(columnUnitSuffix("dim", "imperial")).toBe("");
    expect(columnUnitSuffix("mark", "imperial")).toBe("");
  });

  it("metric dim family suffixes ' (cm)', with its own leading space", () => {
    expect(columnUnitSuffix("dim", "metric")).toBe(" (cm)");
  });

  it("metric mark family suffixes ' (mm)', with its own leading space", () => {
    expect(columnUnitSuffix("mark", "metric")).toBe(" (mm)");
  });
});

describe("measureSlider", () => {
  it("imperial view reproduces today's call site exactly", () => {
    const view = measureSlider(inchesToMm(20.25), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "imperial");
    expect(view.value).toBeCloseTo(20.25, 9);
    expect(view.min).toBe(WIDEPOINT_WIDTH_RANGE_IN.min);
    expect(view.max).toBe(WIDEPOINT_WIDTH_RANGE_IN.max);
    expect(view.step).toBe(0.125);
  });

  it("imperial toMm clamps a drag into rangeIn and converts to Mm", () => {
    const view = measureSlider(inchesToMm(20), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "imperial");
    expect(view.toMm(30)).toBe(inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max));
    expect(view.toMm(0)).toBe(inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.min));
  });

  it("imperial toMm treats non-finite input as the minimum, the sidebars' own clampFinite", () => {
    const view = measureSlider(inchesToMm(20), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "imperial");
    expect(view.toMm(NaN)).toBe(inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.min));
  });

  it("metric view derives its bounds from metricSliderRange", () => {
    const view = measureSlider(mm(514), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "metric");
    expect(view.min).toBe(407);
    expect(view.max).toBe(635);
    expect(view.step).toBe(1);
    expect(view.value).toBe(514);
  });

  it("metric toMm clamps a drag into the metric bounds and snaps to whole mm", () => {
    const view = measureSlider(mm(514), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "metric");
    expect(view.toMm(999)).toBe(mm(635));
    expect(view.toMm(-5)).toBe(mm(407));
    expect(view.toMm(500.6)).toBe(mm(501));
  });

  it("D-07: a stored value below the metric minimum pins the display without writing back", () => {
    // A 60in board is 1524mm, below the 1530mm metric floor (60-120in at a 10mm step).
    const stored = mm(1524);
    const view = measureSlider(stored, BOARD_LENGTH_RANGE_IN, 1, 10, "metric");
    expect(view.min).toBe(1530);
    expect(view.value).toBe(1530);
    // Nothing in constructing the view calls toMm — only an actual drag does, so the flip itself
    // never touches the store (the caller only writes on onValueChange, never on render).
  });
});

describe("commitTypedMeasure", () => {
  it("imperial: a readable typed value is clamped, snapped and committed", () => {
    const result = commitTypedMeasure({
      typed: "20 1/4",
      current: mm(0),
      family: "dim",
      min: WIDEPOINT_WIDTH_RANGE_IN.min,
      max: WIDEPOINT_WIDTH_RANGE_IN.max,
      system: "imperial",
      bare: false,
    });
    expect(result.error).toBeNull();
    expect(result.value).toBe(inchesToMm(20.25));
    expect(result.display).toBe('20 1/4"');
  });

  it("imperial: an unreadable typed value reverts to current and shows the exact ImperialField error line", () => {
    const current = inchesToMm(20);
    const result = commitTypedMeasure({
      typed: "abc",
      current,
      family: "dim",
      min: WIDEPOINT_WIDTH_RANGE_IN.min,
      max: WIDEPOINT_WIDTH_RANGE_IN.max,
      system: "imperial",
      bare: false,
    });
    expect(result.value).toBe(current);
    expect(result.display).toBe(formatDim(current, "imperial"));
    expect(result.error).toBe(
      "Couldn't read 'abc' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2.",
    );
  });

  it("metric mark-family: a readable typed millimetre value is clamped and snapped", () => {
    const result = commitTypedMeasure({
      typed: "67",
      current: mm(0),
      family: "mark",
      min: 4,
      max: 127,
      system: "metric",
      bare: false,
    });
    expect(result.error).toBeNull();
    expect(result.value).toBe(mm(67));
    expect(result.display).toBe("67 mm");
  });

  it("metric mark-family: bare mode omits the unit suffix (D-12, in-table cells)", () => {
    const result = commitTypedMeasure({
      typed: "67",
      current: mm(0),
      family: "mark",
      min: 4,
      max: 127,
      system: "metric",
      bare: true,
    });
    expect(result.display).toBe("67");
  });

  it("metric mark-family: an unreadable value shows the exact millimetre error line", () => {
    const current = mm(66);
    const result = commitTypedMeasure({
      typed: "5 1/2",
      current,
      family: "mark",
      min: 4,
      max: 127,
      system: "metric",
      bare: false,
    });
    expect(result.value).toBe(current);
    expect(result.error).toBe(
      "Couldn't read '5 1/2' as millimetres — try a whole number like 67, or centimetres like 6.7 cm.",
    );
  });

  it("metric mark-family: an out-of-range value clamps to the bound before snapping", () => {
    const result = commitTypedMeasure({
      typed: "999",
      current: mm(0),
      family: "mark",
      min: 4,
      max: 127,
      system: "metric",
      bare: false,
    });
    expect(result.value).toBe(mm(127));
  });

  it("metric length-family (D-08): a readable typed centimetre value is clamped and snapped to whole mm", () => {
    const result = commitTypedMeasure({
      typed: "188",
      current: mm(0),
      family: "length",
      min: 153,
      max: 304,
      system: "metric",
      bare: false,
    });
    expect(result.error).toBeNull();
    expect(result.value).toBe(mm(1880));
    expect(result.display).toBe("188.0 cm");
  });

  it("metric length-family: an explicit mm suffix overrides the field's own cm unit (D-04)", () => {
    const result = commitTypedMeasure({
      typed: "1880 mm",
      current: mm(0),
      family: "length",
      min: 153,
      max: 304,
      system: "metric",
      bare: false,
    });
    expect(result.error).toBeNull();
    expect(result.value).toBe(mm(1880));
  });

  it("metric length-family: an unreadable value shows the exact centimetre error line", () => {
    const current = mm(1880);
    const result = commitTypedMeasure({
      typed: "abc",
      current,
      family: "length",
      min: 153,
      max: 304,
      system: "metric",
      bare: false,
    });
    expect(result.value).toBe(current);
    expect(result.error).toBe(
      "Couldn't read 'abc' as centimetres — try a decimal like 188.0, or millimetres like 1880 mm.",
    );
  });

  it("never accepts and stores an unreadable value (T-05-15 extended to Metric)", () => {
    for (const typed of ["5 1/2", "51,4", "abc"]) {
      const current = mm(500);
      const result = commitTypedMeasure({
        typed,
        current,
        family: "dim",
        min: 40.7,
        max: 63.5,
        system: "metric",
        bare: false,
      });
      expect(result.value).toBe(current);
      expect(result.error).not.toBeNull();
    }
  });
});

describe("UNITS_SYSTEMS invariant — a dropped branch fails here rather than falling back to Imperial", () => {
  it("every value-taking formatter returns a non-empty, distinct string per system", () => {
    const value = mm(514);
    const formatters: Array<(system: UnitsSystem) => string> = [
      (system) => formatDim(value, system),
      (system) => formatDimBare(value, system),
      (system) => formatMark(value, system),
      (system) => formatMarkBare(value, system),
      (system) => formatSignedDim(value, system),
      (system) => formatLength(value, system),
      (system) => stationLabel(system),
    ];
    for (const formatter of formatters) {
      const outputs = UNITS_SYSTEMS.map((system) => formatter(system));
      for (const output of outputs) {
        expect(output.length).toBeGreaterThan(0);
      }
      expect(new Set(outputs).size).toBe(UNITS_SYSTEMS.length);
    }
  });

  it("columnUnitSuffix differs per system for both families, even though imperial is empty", () => {
    for (const family of ["dim", "mark"] as const) {
      const outputs = UNITS_SYSTEMS.map((system) => columnUnitSuffix(family, system));
      expect(new Set(outputs).size).toBe(UNITS_SYSTEMS.length);
    }
  });

  it("measureSlider's bounds and step differ per system for the same slider", () => {
    for (const system of UNITS_SYSTEMS) {
      const view = measureSlider(mm(514), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, system);
      expect(Number.isFinite(view.min)).toBe(true);
      expect(Number.isFinite(view.max)).toBe(true);
      expect(view.max).toBeGreaterThan(view.min);
    }
    const imperialView = measureSlider(mm(514), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "imperial");
    const metricView = measureSlider(mm(514), WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, "metric");
    expect(imperialView.step).not.toBe(metricView.step);
  });
});
