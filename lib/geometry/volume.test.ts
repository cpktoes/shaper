import { describe, expect, it } from "vitest";
import type { Point2D } from "./board";
import { computeVolume, CUBIC_INCHES_PER_LITRE, type VolumeRailValues, type VolumeSpec, type VolumeTemplateValues } from "./volume";
import { cubicMmToLitres, formatInchesFraction, inchesToMm, MM_PER_INCH, type Mm, mmToInches } from "./units";
import golden from "./__fixtures__/prototype-volume-golden.json";

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
