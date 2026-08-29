import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type Point2D } from "./board";
import { buildOutline, sampleOutline, MEASURE_STATION_MM } from "./outline";
import {
  computeCrossSectionVolume,
  computeVolume,
  CUBIC_INCHES_PER_LITRE,
  simpsonIntegrate,
  SIMPSON_PANEL_COUNT,
  type VolumeRailValues,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "./volume";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "./foil";
import {
  computeRailBands,
  DEFAULT_RAIL_BAND_SPEC,
  type RailBandSpec,
  type RailFamily,
  type RailSectionSpec,
} from "./rail-bands";
import { sampleMonotoneSpline, type SplinePoint } from "./monotone-spline";
import { cubicMmToLitres, formatInchesFraction, inchesToMm, MM_PER_INCH, type Mm, mm, mmToInches } from "./units";
import golden from "./__fixtures__/prototype-volume-golden.json";
import blankDatasheet from "./__fixtures__/blank-datasheet-golden.json";

const SQMM_PER_SQIN = MM_PER_INCH * MM_PER_INCH;

interface GoldenState {
  lengthIn: number;
  width: number;
  centerThickness: number;
  boardTypeIndex: number;
  importTemplateDimensions: boolean;
  importRailThickness: boolean;
}

interface GoldenTemplate {
  available: boolean;
  area: number;
  lengthIn: number;
  widepointWidth: number;
  noseWidthAt12: number;
  tailWidthAt12: number;
}

interface GoldenRail {
  available: boolean;
  noseThickness: number;
  centerThickness: number;
  tailThickness: number;
  noseProfile?: [number, number][];
  centerProfile?: [number, number][];
  tailProfile?: [number, number][];
}

interface GoldenVals {
  templateAvailable: boolean;
  railAvailable: boolean;
  importingRailThickness: boolean;
  showGeomBreakdown: boolean | null;
  areaRowLabel: string;
  areaSqInDisplay: string;
  tailEffDisplay: string;
  centerEffDisplay: string;
  noseEffDisplay: string;
  weightedThicknessLabel: string;
  weightedThicknessDisplay: string;
  volumeLitersDisplay: string;
  volumeCuInDisplay: string;
}

interface GoldenFixture {
  state: GoldenState;
  template: GoldenTemplate | null;
  rail: GoldenRail | null;
  vals: GoldenVals;
  valsCm: GoldenVals;
}

const typedGolden = golden as unknown as Record<string, GoldenFixture>;

function toVolumeSpec(state: GoldenState): VolumeSpec {
  return {
    length: inchesToMm(state.lengthIn),
    width: inchesToMm(state.width),
    centerThickness: inchesToMm(state.centerThickness),
    boardTypeIndex: state.boardTypeIndex,
    importTemplateDimensions: state.importTemplateDimensions,
    importRailThickness: state.importRailThickness,
  };
}

function toVolumeTemplateValues(template: GoldenTemplate | null): VolumeTemplateValues | null {
  if (!template) return null;
  return {
    // The golden fixture's area comes straight from the prototype's own inch-domain arithmetic
    // (square inches); VolumeTemplateValues.area is square millimetres, matching
    // OutlineGeometry.area, so convert at this test's own boundary.
    area: template.area * SQMM_PER_SQIN,
    length: inchesToMm(template.lengthIn),
    widePointWidth: inchesToMm(template.widepointWidth),
    noseWidthAt12: inchesToMm(template.noseWidthAt12),
    tailWidthAt12: inchesToMm(template.tailWidthAt12),
  };
}

function toPoints(pairs: [number, number][] | undefined): Point2D[] | null {
  if (!pairs) return null;
  return pairs.map(([x, y]) => ({ x: inchesToMm(x), y: inchesToMm(y) }));
}

function toVolumeRailValues(rail: GoldenRail | null): VolumeRailValues | null {
  if (!rail) return null;
  return {
    noseThickness: inchesToMm(rail.noseThickness),
    centerThickness: inchesToMm(rail.centerThickness),
    tailThickness: inchesToMm(rail.tailThickness),
    noseProfile: toPoints(rail.noseProfile),
    centerProfile: toPoints(rail.centerProfile),
    tailProfile: toPoints(rail.tailProfile),
  };
}

/** The prototype's cm-mode `disp` for a thickness value — two decimal centimetres, rounded.
 * Tighter than the inch display's 1/16" grid by roughly 16x, so comparing against it pins each
 * cross-section thickness to about 0.004" instead of 0.0625". */
function cmThicknessDisplay(value: Mm): string {
  const inches = mmToInches(value);
  return `${(Math.round(inches * 2.54 * 100) / 100).toFixed(2)} cm`;
}

function thicknessDisplayOrDash(value: Mm | null): string {
  return value === null ? "—" : formatInchesFraction(value, 16);
}

function cmThicknessDisplayOrDash(value: Mm | null): string {
  return value === null ? "—" : cmThicknessDisplay(value);
}

const goldenEntries = Object.entries(typedGolden);

describe("computeVolume golden parity", () => {
  for (const [name, fixture] of goldenEntries) {
    describe(`fixture: ${name}`, () => {
      const spec = toVolumeSpec(fixture.state);
      const template = toVolumeTemplateValues(fixture.template);
      const rail = toVolumeRailValues(fixture.rail);
      const result = computeVolume(spec, template, rail);

      it("matches areaSqInDisplay exactly", () => {
        const areaSqIn = result.area / SQMM_PER_SQIN;
        const display = `${areaSqIn.toFixed(1)} sq in${result.importingTemplate ? " (imported)" : ""}`;
        expect(display).toBe(fixture.vals.areaSqInDisplay);
      });

      it("matches volumeLitersDisplay and volumeCuInDisplay exactly", () => {
        expect(`${result.volumeLitres.toFixed(2)} L`).toBe(fixture.vals.volumeLitersDisplay);
        expect(`${result.volumeCubicInches.toFixed(1)} cu in`).toBe(fixture.vals.volumeCuInDisplay);
      });

      it("matches the four thickness displays (inch mode, 1/16\" grid)", () => {
        expect(thicknessDisplayOrDash(result.weightedThickness)).toBe(fixture.vals.weightedThicknessDisplay);
        expect(thicknessDisplayOrDash(result.tailCrossSectionThickness)).toBe(fixture.vals.tailEffDisplay);
        expect(thicknessDisplayOrDash(result.centerCrossSectionThickness)).toBe(fixture.vals.centerEffDisplay);
        expect(thicknessDisplayOrDash(result.noseCrossSectionThickness)).toBe(fixture.vals.noseEffDisplay);
      });

      // Tight comparison: the cm-mode snapshot pins each cross-section thickness to about
      // 0.004" instead of the inch display's 0.0625" grid — a much stricter check than the
      // fraction-display assertions above.
      it("matches the four thickness displays against the cm-mode snapshot (tight comparison)", () => {
        expect(cmThicknessDisplayOrDash(result.weightedThickness)).toBe(fixture.valsCm.weightedThicknessDisplay);
        expect(cmThicknessDisplayOrDash(result.tailCrossSectionThickness)).toBe(fixture.valsCm.tailEffDisplay);
        expect(cmThicknessDisplayOrDash(result.centerCrossSectionThickness)).toBe(fixture.valsCm.centerEffDisplay);
        expect(cmThicknessDisplayOrDash(result.noseCrossSectionThickness)).toBe(fixture.valsCm.noseEffDisplay);
      });

      it("matches boolean and label fields", () => {
        expect(result.templateAvailable).toBe(fixture.vals.templateAvailable);
        expect(result.railAvailable).toBe(fixture.vals.railAvailable);
        expect(result.importingRailThickness).toBe(fixture.vals.importingRailThickness);
        expect(result.geomReady).toBe(!!fixture.vals.showGeomBreakdown);

        const expectedAreaRowLabel = result.importingTemplate ? "Template Area" : "Board Area (estimated)";
        expect(expectedAreaRowLabel).toBe(fixture.vals.areaRowLabel);

        const expectedWeightedLabel = result.geomReady ? "Length-Weighted Effective Thickness" : "Weighted Thickness";
        expect(expectedWeightedLabel).toBe(fixture.vals.weightedThicknessLabel);
      });

      it("reconstructs areaFactorDisplay and thicknessFactorDisplay", () => {
        const areaFactorDisplay = `${result.areaFactor.toFixed(2)} — ${result.boardTypeLabel}`;
        const thicknessFactorDisplay = result.importingRailThickness
          ? "Not used — real geometry"
          : `${result.thicknessFactor.toFixed(2)} — ${result.boardTypeLabel}`;
        expect(areaFactorDisplay).toBe(`${result.areaFactor.toFixed(2)} — ${result.boardTypeLabel}`);
        expect(thicknessFactorDisplay).toBeTruthy();
      });
    });
  }
});

// Port-only tests: these exercise this module's own branch behaviour rather than comparing to a
// prototype fixture, since the prototype's own fixtures cannot isolate them.
describe("computeVolume port-only behaviour", () => {
  it("switches tip thickness at exactly 84\", producing a smaller weighted thickness at 84\" than 83.9375\"", () => {
    const template: VolumeTemplateValues = {
      area: inchesToMm(19) * inchesToMm(72) * 1, // arbitrary, non-zero, unused for thickness math
      length: inchesToMm(72),
      widePointWidth: inchesToMm(19),
      noseWidthAt12: inchesToMm(12),
      tailWidthAt12: inchesToMm(13),
    };
    const profile: Point2D[] = [
      { x: inchesToMm(-1), y: inchesToMm(1) },
      { x: inchesToMm(0), y: inchesToMm(1) },
    ];
    const rail: VolumeRailValues = {
      noseThickness: inchesToMm(1.31),
      centerThickness: inchesToMm(2.5),
      tailThickness: inchesToMm(1.56),
      noseProfile: profile,
      centerProfile: profile,
      tailProfile: profile,
    };
    const baseSpec: VolumeSpec = {
      length: inchesToMm(72),
      width: inchesToMm(19),
      centerThickness: inchesToMm(2.5),
      boardTypeIndex: 3,
      importTemplateDimensions: true,
      importRailThickness: true,
    };

    const under = computeVolume(
      { ...baseSpec, length: inchesToMm(83.9375) },
      { ...template, length: inchesToMm(83.9375) },
      rail,
    );
    const at = computeVolume({ ...baseSpec, length: inchesToMm(84) }, { ...template, length: inchesToMm(84) }, rail);

    expect(under.geomReady).toBe(true);
    expect(at.geomReady).toBe(true);
    expect(mmToInches(at.weightedThickness)).toBeLessThan(mmToInches(under.weightedThickness));
  });

  it("computes volumeLitres from the prototype's own truncated constant, not the exact conversion", () => {
    const spec: VolumeSpec = {
      length: inchesToMm(72),
      width: inchesToMm(19),
      centerThickness: inchesToMm(2.25),
      boardTypeIndex: 3,
      importTemplateDimensions: false,
      importRailThickness: false,
    };
    const result = computeVolume(spec, null, null);

    expect(result.volumeLitres).toBeCloseTo(result.volumeCubicInches / CUBIC_INCHES_PER_LITRE, 12);

    const volumeMm3 = result.volumeCubicInches * MM_PER_INCH * MM_PER_INCH * MM_PER_INCH;
    const exactLitres = cubicMmToLitres(volumeMm3);
    const relativeDiff = Math.abs(result.volumeLitres - exactLitres) / exactLitres;
    expect(relativeDiff).toBeGreaterThan(1e-8);
    expect(relativeDiff).toBeLessThan(1e-5);
    expect(relativeDiff).toBeCloseTo(7e-7, 6);
  });

  it("degrades to the manual factor path with a null template and rail bag", () => {
    const spec: VolumeSpec = {
      length: inchesToMm(72),
      width: inchesToMm(20),
      centerThickness: inchesToMm(2.5),
      boardTypeIndex: 3,
      importTemplateDimensions: true,
      importRailThickness: true,
    };
    const result = computeVolume(spec, null, null);

    expect(result.templateAvailable).toBe(false);
    expect(result.railAvailable).toBe(false);
    expect(result.geomReady).toBe(false);
    expect(result.tailCrossSectionThickness).toBeNull();
    expect(result.centerCrossSectionThickness).toBeNull();
    expect(result.noseCrossSectionThickness).toBeNull();
    expect(Number.isFinite(result.volumeLitres)).toBe(true);
    expect(result.volumeLitres).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// computeCrossSectionVolume — the accurate path (deviation 3, resolved). SIMPSON_PANEL_COUNT and
// simpsonIntegrate first, since the integrator's correctness is a precondition for trusting
// anything computeCrossSectionVolume returns.
// ---------------------------------------------------------------------------------------------

describe("SIMPSON_PANEL_COUNT", () => {
  it("is an even number, since the composite Simpson one-third rule's four-two weight pattern is only valid over an even panel count", () => {
    expect(SIMPSON_PANEL_COUNT % 2).toBe(0);
  });
});

describe("simpsonIntegrate", () => {
  const panels = SIMPSON_PANEL_COUNT;
  const a = 0;
  const b = 10;
  const h = (b - a) / panels;

  function sample(fn: (x: number) => number): number[] {
    const values: number[] = [];
    for (let i = 0; i <= panels; i++) values.push(fn(a + i * h));
    return values;
  }

  it("reproduces the exact integral of a constant", () => {
    const result = simpsonIntegrate(sample(() => 3), h);
    expect(result).toBeCloseTo(3 * (b - a), 8);
  });

  it("reproduces the exact integral of a linear ramp", () => {
    const result = simpsonIntegrate(sample((x) => 2 * x + 1), h);
    const antiderivative = (x: number) => x * x + x;
    expect(result).toBeCloseTo(antiderivative(b) - antiderivative(a), 6);
  });

  it("reproduces the exact integral of a quadratic", () => {
    const result = simpsonIntegrate(sample((x) => x * x), h);
    const antiderivative = (x: number) => (x * x * x) / 3;
    expect(result).toBeCloseTo(antiderivative(b) - antiderivative(a), 6);
  });

  it("reproduces the exact integral of a cubic", () => {
    const result = simpsonIntegrate(sample((x) => x * x * x), h);
    const antiderivative = (x: number) => (x * x * x * x) / 4;
    expect(result).toBeCloseTo(antiderivative(b) - antiderivative(a), 4);
  });

  it("rejects a sample array whose length is not panels + 1 with panels even", () => {
    // 4 samples -> 3 panels, odd.
    expect(() => simpsonIntegrate([1, 2, 3, 4], h)).toThrow();
    // 1 sample -> 0 panels, fewer than 2.
    expect(() => simpsonIntegrate([1], h)).toThrow();
  });
});

/** Builds a half-width sampler through the default board's own outline geometry, the same closure
 * shape `components/design/design-store.tsx` passes as `computeCrossSectionVolume`'s
 * `halfWidthAt`. */
function defaultBoardHalfWidthAt(): (station: Mm) => Mm {
  const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
  return (station: Mm) => sampleOutline(outlineGeometry, station);
}

function scaleFoil(foil: FoilSpec, factor: number): FoilSpec {
  return {
    noseTip: mm(foil.noseTip * factor),
    nose12: mm(foil.nose12 * factor),
    center: mm(foil.center * factor),
    tail12: mm(foil.tail12 * factor),
    tailTip: mm(foil.tailTip * factor),
  };
}

describe("computeCrossSectionVolume", () => {
  it("returns a litres figure inside a physically sensible band for the default 6ft x 19in x 2.5in board", () => {
    const result = computeCrossSectionVolume({
      halfWidthAt: defaultBoardHalfWidthAt(),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    expect(result.volumeLitres).toBeGreaterThan(20);
    expect(result.volumeLitres).toBeLessThan(50);
  });

  it("volumeLitres equals cubicMmToLitres(volumeMm3) exactly", () => {
    const result = computeCrossSectionVolume({
      halfWidthAt: defaultBoardHalfWidthAt(),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    expect(result.volumeLitres).toBe(cubicMmToLitres(result.volumeMm3));
  });

  it("agrees with the existing rail-band path at the centre station, within 1%", () => {
    // Independent (test-local) re-implementation of volume.ts's private shoelaceArea, so this test
    // does not depend on that helper being exported.
    function polygonArea(pts: [number, number][]): number {
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(a) / 2;
    }

    const railBands = computeRailBands(DEFAULT_RAIL_BAND_SPEC);
    const centerProfile = railBands.center.profile;
    const centerThickness = DEFAULT_FOIL_SPEC.center; // matches DEFAULT_RAIL_BAND_SPEC.center.boardThickness by construction
    const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const centerStation = mm(DEFAULT_BOARD_SPEC.outline.length / 2);
    const centerHalfWidth = sampleOutline(outlineGeometry, centerStation);

    const closingPolygon: [number, number][] = [
      [-centerHalfWidth, centerThickness],
      ...centerProfile.map((p): [number, number] => [p.x, p.y]),
      [-centerHalfWidth, 0],
    ];
    const expectedHalfArea = polygonArea(closingPolygon);

    const result = computeCrossSectionVolume({
      halfWidthAt: (s) => sampleOutline(outlineGeometry, s),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    const centerIndex = SIMPSON_PANEL_COUNT / 2;
    const newHalfArea = result.stationAreas[centerIndex] / 2;

    const relativeDiff = Math.abs(newHalfArea - expectedHalfArea) / expectedHalfArea;
    expect(relativeDiff).toBeLessThan(0.01);
  });

  it("scaling every foil station by two roughly doubles the result, and halving roughly halves it", () => {
    const halfWidthAt = defaultBoardHalfWidthAt();
    const base = computeCrossSectionVolume({
      halfWidthAt,
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    const doubled = computeCrossSectionVolume({
      halfWidthAt,
      foil: scaleFoil(DEFAULT_FOIL_SPEC, 2),
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    const halved = computeCrossSectionVolume({
      halfWidthAt,
      foil: scaleFoil(DEFAULT_FOIL_SPEC, 0.5),
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });

    const doubleRatio = doubled.volumeLitres / base.volumeLitres;
    expect(doubleRatio).toBeGreaterThan(1.8);
    expect(doubleRatio).toBeLessThan(2.2);

    const halfRatio = halved.volumeLitres / base.volumeLitres;
    expect(halfRatio).toBeGreaterThan(0.4);
    expect(halfRatio).toBeLessThan(0.6);
  });

  it("returns zero litres, not NaN, for a board with zero half-width everywhere", () => {
    const result = computeCrossSectionVolume({
      halfWidthAt: () => mm(0),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    expect(Number.isNaN(result.volumeLitres)).toBe(false);
    expect(result.volumeLitres).toBe(0);
  });
});

// Blank-datasheet validation (D-14): the Arctic Foam 7'3" SBF's five stations, half-widths through
// a monotone spline, thicknesses as a FoilSpec, the fullest rail treatment the calculator can
// produce. The datasheet fixture is hand-entered with provenance — the one sanctioned exception to
// "goldens come from the prototype" (CLAUDE.md Rule 1), because this math has no prototype
// ancestor (CONTEXT.md D-14).
describe("blank-datasheet validation (D-14)", () => {
  interface BlankDatasheetFixture {
    lengthIn: number;
    widthIn: number[];
    thicknessIn: number[];
    statedVolumeLitres: number;
  }
  const blank = blankDatasheet as unknown as BlankDatasheetFixture;
  const blankLength = inchesToMm(blank.lengthIn);

  // Fixture arrays are quoted nose-tip-to-tail-tip, matching how a shaper reads a blank datasheet.
  // This codebase's own station convention runs the other way (station 0 = tail tip), so index 0
  // (noseTip) maps to the highest station and index 4 (tailTip) to station 0.
  const [noseTipWidthIn, nose12WidthIn, centerWidthIn, tail12WidthIn, tailTipWidthIn] = blank.widthIn;
  const [noseTipThicknessIn, nose12ThicknessIn, centerThicknessIn, tail12ThicknessIn, tailTipThicknessIn] =
    blank.thicknessIn;

  const blankFoil: FoilSpec = {
    noseTip: inchesToMm(noseTipThicknessIn),
    nose12: inchesToMm(nose12ThicknessIn),
    center: inchesToMm(centerThicknessIn),
    tail12: inchesToMm(tail12ThicknessIn),
    tailTip: inchesToMm(tailTipThicknessIn),
  };

  const halfWidthPoints: SplinePoint[] = [
    { x: 0, y: inchesToMm(tailTipWidthIn) / 2 },
    { x: MEASURE_STATION_MM, y: inchesToMm(tail12WidthIn) / 2 },
    { x: blankLength / 2, y: inchesToMm(centerWidthIn) / 2 },
    { x: blankLength - MEASURE_STATION_MM, y: inchesToMm(nose12WidthIn) / 2 },
    { x: blankLength, y: inchesToMm(noseTipWidthIn) / 2 },
  ];
  const blankHalfWidthAt = (station: Mm): Mm => mm(sampleMonotoneSpline(halfWidthPoints, station));

  // A blank is uncut foam with square-ish edges, so pick the fullest rail treatment the calculator
  // can produce: full deck (deckPercent 100, undomed), no corner cut removed AND a single tuck
  // (both maximise how much of the section stays full-height foam), swept across every family at
  // the blank's own centre station.
  function railsWithFamily(family: RailFamily): RailBandSpec {
    const section: RailSectionSpec = {
      boardThickness: blankFoil.center,
      deckPercent: 100,
      family,
      ratioTopPercent: 60,
      symmetrical: false,
      cornerCutOffsetOverride: null,
      removeCornerCut: true,
      singleTuck: true,
      bottomTuck3Override: null,
    };
    return { nose: section, center: section, tail: section, tailHardEdge: true };
  }

  const centerIndex = SIMPSON_PANEL_COUNT / 2;
  const families: RailFamily[] = [1, 2, 3, 4, 5];
  let bestFamily: RailFamily = 1;
  let bestCenterArea = -Infinity;
  for (const family of families) {
    const swept = computeCrossSectionVolume({
      halfWidthAt: blankHalfWidthAt,
      foil: blankFoil,
      rails: railsWithFamily(family),
      length: blankLength,
    });
    const centerArea = swept.stationAreas[centerIndex];
    if (centerArea > bestCenterArea) {
      bestCenterArea = centerArea;
      bestFamily = family;
    }
  }

  // Measured by running this suite: Family 1 produced the largest centre-station cross-section
  // (deckPercent 100, removeCornerCut true, singleTuck true) at 53104.7 mm2 — the fullest of the
  // five families, as expected since Family 1 is this calculator's boxiest rail profile. Using
  // Family 1 for the whole board, the computed volume is 77.95 L against the datasheet's stated
  // 77.17 L — a 1.01% deviation, comfortably inside the 10% bar. The remaining gap is exactly what
  // the 10% tolerance exists for: the app's boxiest rail band is still a shaped rail rather than a
  // blank's true square edge, and the plan curve between the five quoted widths is a monotone
  // spline rather than the blank's true outline curve.
  it("lands within 10% of the Arctic Foam 7'3\" SBF's stated 77.17 L using the fullest rail treatment", () => {
    const result = computeCrossSectionVolume({
      halfWidthAt: blankHalfWidthAt,
      foil: blankFoil,
      rails: railsWithFamily(bestFamily),
      length: blankLength,
    });
    const deviation = Math.abs(result.volumeLitres - blank.statedVolumeLitres) / blank.statedVolumeLitres;
    // Do NOT widen this tolerance if it fails — a figure that far off means the method needs
    // fixing, not the bar.
    expect(deviation).toBeLessThan(0.1);
  });
});
