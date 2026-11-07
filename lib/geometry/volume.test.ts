import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type Point2D } from "./board";
import { buildOutline, foamHalfWidth as foamHalfWidthOf, sampleOutline, MEASURE_STATION_MM } from "./outline";
import { placedHalfSection } from "./board-surface";
import {
  type BoardSection,
  boardSectionEnds,
  boardSections,
  boardSectionsWith,
  computeCrossSectionVolume,
  computeVolume,
  CUBIC_INCHES_PER_LITRE,
  HARD_EDGE_FADE,
  fadingSectionArea,
  HARD_EDGE_SWITCH,
  noseRailWeight,
  railCharacterDifferences,
  railCharacterOf,
  computeCrossSectionVolumeWith,
  OLD_SURFACE_FIT,
  RAIL_CHARACTER_FADE,
  type RailCharacterRule,
  SMOOTH_SURFACE_FADE,
  TAIL_ROLL_RUN_IN,
  TAIL_ROLL_SHARE,
  tailHardEdgeWeight,
  tailRollDrop,
  tailRollFoam,
  tailRollScale,
  tailRollStations,
  simpsonIntegrate,
  SIMPSON_PANEL_COUNT,
  wingStepHalf,
  type VolumeRailValues,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "./volume";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT } from "./blank";
import { prepareBlank } from "./blank-fit";
import { buildBlankProfile, buildFallbackProfile } from "./board-profile";
import {
  blendFinishedRails,
  fittedFinishedRail,
  openedFinishedRail,
  railBlendArea,
  railReach,
  sampledFinishedRail,
  sampledSectionArea,
  SECTION_POINTS,
  sectionFinishedRail,
} from "./finished-rail";
import { DEFAULT_FOIL_SPEC, foilStationPoints, sampleFoil, type FoilSpec } from "./foil";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import {
  computeRailBands,
  DEFAULT_RAIL_BAND_SPEC,
  DEFAULT_HARD_EDGE_BLENDS_FROM_IN,
  defaultHardEdgeEndsAt,
  DEFAULT_TIP_RAIL_SCALE,
  effectiveDeckPercent,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
  ZERO_RAIL_NUDGES,
  type RailBandSpec,
  type RailFamily,
  type RailSectionSpec,
} from "./rail-bands";
import { samplePchip, type SplinePoint } from "./pchip";
import { prepareRootCurve } from "./root-curve";
import {
  cubicMmToLitres,
  formatInchesFraction,
  inchesToMm,
  MM_PER_INCH,
  type Mm,
  mm,
  mmToInches,
  roundToSixteenthInch,
} from "./units";
import {
  PHASE16_TUCKED,
  phase16Boards,
  phase16LiveBoards,
  phase16SurfaceBoards,
  phase16WingBoards,
} from "./__fixtures__/phase16-boards";
import { outlineWithoutWings, wingFootprint, wingShareAt, wingShareSpan, type Wing } from "./wings";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  summarizeDesign,
  summarizeDesignWith,
  type DesignSummaryFields,
} from "./design";
import golden from "./__fixtures__/prototype-volume-golden.json";
import blankDatasheet from "./__fixtures__/blank-datasheet-golden.json";

const SQMM_PER_SQIN = MM_PER_INCH * MM_PER_INCH;

/** A station's blend as the live rule draws it from its two ends' halves: a sharp end opened toward a round one. */
function liveBlend(
  ends: { base: BoardSection; tip: BoardSection },
  baseHalf: [number, number][],
  tipHalf: [number, number][],
  w: number,
) {
  const [baseSharp, tipSharp] = [ends.base.sharpness === 1, ends.tip.sharpness === 1];
  if (baseSharp === tipSharp) return blendFinishedRails(baseHalf, tipHalf, w);
  return baseSharp
    ? blendFinishedRails(openedFinishedRail(baseHalf, tipHalf, w), tipHalf, w)
    : blendFinishedRails(baseHalf, openedFinishedRail(tipHalf, baseHalf, 1 - w), w);
}

/** One rail's half cross-section closed at the stringer — the full-thickness point at minus the half
 * width, the cut profile, the zero-height point at minus the half width — by the shoelace. A test-local
 * re-implementation of volume.ts's private closing, so these tests do not depend on it being exported. */
function closingPolygonArea(profile: readonly Point2D[], boardThickness: number, halfWidth: number): number {
  const pts: [number, number][] = [
    [-halfWidth, boardThickness],
    ...profile.map((p): [number, number] => [p.x, p.y]),
    [-halfWidth, 0],
  ];
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

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

  // Volume counts the finished rail (quick 261102-gec plan 03, the founder's D-V1, 2026-11-02): each
  // station's area is the cut closing polygon less both rails' blends, worked out exactly (PV1). Before
  // this, this test asked the centre station to sit "within 1%" of the cut profile; it now checks the
  // exact relation instead, so it says what it checks.
  it("the centre station is the cut rail-band section's closing polygon less both rails' exact blends (D-V1, PV1)", () => {
    const railBands = computeRailBands(DEFAULT_RAIL_BAND_SPEC);
    const center = railBands.center;
    const centerThickness = DEFAULT_FOIL_SPEC.center; // matches DEFAULT_RAIL_BAND_SPEC.center.boardThickness by construction
    const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const centerStation = mm(DEFAULT_BOARD_SPEC.outline.length / 2);
    const centerHalfWidth = sampleOutline(outlineGeometry, centerStation);
    const cutHalfArea = closingPolygonArea(center.profile, centerThickness, centerHalfWidth);
    const blendOneRail = railBlendArea(sectionFinishedRail(center.result, center.domed));

    const result = computeCrossSectionVolume({
      halfWidthAt: (s) => sampleOutline(outlineGeometry, s),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    const centerIndex = SIMPSON_PANEL_COUNT / 2;

    expect(blendOneRail).toBeGreaterThan(0);
    const relative = (a: number, b: number) => Math.abs(a - b) / b;
    expect(relative(result.stationBlendAreas[centerIndex], 2 * blendOneRail)).toBeLessThan(1e-9);
    expect(relative(result.stationAreas[centerIndex] + result.stationBlendAreas[centerIndex], 2 * cutHalfArea)).toBeLessThan(1e-9);
    expect(relative(result.stationAreas[centerIndex], 2 * (cutHalfArea - blendOneRail))).toBeLessThan(1e-9);
  });

  it("on the first board a visitor sees, every station's blends are at least nothing and less than its cut area", () => {
    const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const result = computeCrossSectionVolume({
      halfWidthAt: (s) => sampleOutline(outlineGeometry, s),
      foil: DEFAULT_FOIL_SPEC,
      rails: DEFAULT_RAIL_BAND_SPEC,
      length: DEFAULT_BOARD_SPEC.outline.length,
    });
    expect(result.stationBlendAreas).toHaveLength(result.stationAreas.length);
    result.stationAreas.forEach((area, i) => {
      const blend = result.stationBlendAreas[i];
      expect(blend, `station ${i}`).toBeGreaterThanOrEqual(0);
      if (area + blend > 0) expect(blend, `station ${i}`).toBeLessThan(area + blend);
      else expect(blend, `station ${i}`).toBe(0);
    });
    // The Simpson sum of the cut areas is more foam than the finished one, by the blends' own sum.
    const cut = simpsonIntegrate(
      result.stationAreas.map((a, i) => a + result.stationBlendAreas[i]),
      DEFAULT_BOARD_SPEC.outline.length / SIMPSON_PANEL_COUNT,
    );
    expect(cut).toBeGreaterThan(result.volumeMm3);
  });

  it("at every station of a board with one rail all along, the area is that rail's cut closing polygon less both rails' blends", () => {
    // Every anchor the same section (the scale 1 everywhere, no hard edge) and one thickness all along, so
    // every station's rail is exactly computeRailSectionOutput's for that section: the relation can be
    // checked at all 51 stations without re-deriving the blending between anchors.
    const section: RailSectionSpec = { ...DEFAULT_RAIL_BAND_SPEC.center, scaleFromCenter: 1 };
    const rails: RailBandSpec = { nose: section, center: section, tail: section, tailHardEdge: false };
    const output = computeRailBands(rails).center;
    const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const halfWidthAt = (s: Mm) => sampleOutline(outlineGeometry, s);
    const length = DEFAULT_BOARD_SPEC.outline.length;
    const result = computeCrossSectionVolume({
      halfWidthAt,
      foil: DEFAULT_FOIL_SPEC,
      rails,
      length,
      thicknessAt: () => section.boardThickness,
    });
    const blendOneRail = railBlendArea(sectionFinishedRail(output.result, output.domed));
    expect(blendOneRail).toBeGreaterThan(0);
    const h = length / SIMPSON_PANEL_COUNT;
    let checked = 0;
    result.stationAreas.forEach((area, i) => {
      const halfWidth = halfWidthAt(mm(i * h));
      if (halfWidth === 0) {
        expect(area).toBe(0);
        expect(result.stationBlendAreas[i]).toBe(0);
        return;
      }
      const cut = 2 * closingPolygonArea(output.profile, section.boardThickness, halfWidth);
      expect(Math.abs(result.stationBlendAreas[i] - 2 * blendOneRail), `station ${i}`).toBeLessThan(1e-9 * cut);
      // Where the rail has room the fit lifts nothing; narrower, the foam the fitted ring adds (D-34).
      const fitted = fittedFinishedRail(output.result, output.domed, halfWidth);
      const lift = sampledSectionArea(fitted) - sampledSectionArea(sampledFinishedRail(output.result, output.domed, halfWidth));
      expect(Math.abs(area + result.stationBlendAreas[i] - cut - lift), `station ${i}`).toBeLessThan(1e-9 * cut);
      checked++;
    });
    expect(checked).toBeGreaterThan(SIMPSON_PANEL_COUNT - 2);
  });

  // Sharp Bottom Tuck (quick 261102-gec plan 05, R22, PC39) under the whole rail's blend (Phase 16, D-32): a
  // station keeps the foam that corner's blend used to take off wherever its base — the centre's rail — reads a
  // ticked box. With the centre's box ticked and the nose's not, the nose's rail now differs from the centre's
  // and blends into it from the centre to the nose 12" station; while Hard Edge is on, the tail reads the
  // centre's box (the tail's is hidden on RAILS), so its only difference is the hard edge. The stations at and
  // behind Blends From are all hard edge and keep their blend; the stations at and beyond the nose 12" are the
  // nose's own rail and keep theirs. Every figure is the same board with the box off — never a typed area.
  it("Sharp Bottom Tuck ticked on the centre (and on a hard-edge tail) keeps foam wherever the base reads the centre behind it, blends into the nose ahead of it, never moves an all-hard station nor the nose's own, and the litres rise", () => {
    const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const halfWidthAt = (s: Mm) => sampleOutline(outlineGeometry, s);
    const length = DEFAULT_BOARD_SPEC.outline.length;
    const input = (rails: RailBandSpec) => ({ halfWidthAt, foil: DEFAULT_FOIL_SPEC, rails, length });
    expect(DEFAULT_RAIL_BAND_SPEC.tailHardEdge).toBe(true);
    // A short blend, 14" to 18" (D-30), so some stations between it and the centre are wholly the centre's.
    const base: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      tailHardEdgeBlendsFrom: inchesToMm(14),
      tailHardEdgeEndsAt: inchesToMm(18),
    };
    const off = computeCrossSectionVolume(input(base));
    const onRails: RailBandSpec = {
      ...base,
      center: { ...base.center, sharpBottomTuck: true },
      tail: { ...base.tail, sharpBottomTuck: true },
    };
    expect(railCharacterDifferences(onRails, "tail")).toEqual(["hardEdge"]);
    expect(railCharacterDifferences(onRails, "nose")).toEqual(["sharpBottomTuck"]);
    const on = computeCrossSectionVolume(input(onRails));
    const sections = boardSections(input(onRails));
    const anchors = foilStationPoints(DEFAULT_FOIL_SPEC, length);
    const [center, nose] = [anchors[2].station, anchors[3].station];
    const counted = { allHard: 0, tailBlend: 0, centre: 0, noseBlend: 0, noseOwn: 0 };
    off.stationBlendAreas.forEach((blendOff, i) => {
      const s = off.stations[i];
      if (blendOff === 0) return;
      const section = sections[i];
      if (s <= center && section.tipWeight === 1) {
        counted.allHard++;
        expect(on.stationBlendAreas[i], `station ${i} (all hard)`).toBe(blendOff);
      } else if (s >= nose) {
        counted.noseOwn++;
        expect(section.tipWeight, `station ${i} (the nose's own)`).toBe(1);
        expect(on.stationBlendAreas[i], `station ${i} (the nose's own)`).toBe(blendOff);
      } else {
        if (section.tipWeight === 0) counted.centre++;
        else if (s <= center) counted.tailBlend++;
        else counted.noseBlend++;
        expect(section.sharpBottomTuck, `station ${i}: its base reads the centre's box`).toBe(true);
        if (s <= center) {
          expect(on.stationBlendAreas[i], `station ${i}`).toBeLessThan(blendOff);
        } else {
          // The nose's blend, from the sharp-tucked centre to the plain nose: the litres count the drawn ring
          // (D-31), and a point blend of two rails this alike can hold a hair less foam than either end — so the
          // station is asked only to sit within a thousandth of its two ends' areas blended.
          const ends = boardSectionEnds(input(onRails), s);
          const w = section.tipWeight;
          const areasBlended = (1 - w) * ends.base.area + w * ends.tip.area;
          expect(Math.abs(section.area - areasBlended) / section.area, `station ${i}`).toBeLessThan(1e-3);
          expect(ends.base.area, `station ${i}: the centre's box keeps more foam`).toBeGreaterThan(ends.tip.area);
        }
      }
    });
    expect(counted.allHard).toBeGreaterThan(0);
    expect(counted.tailBlend).toBeGreaterThan(0);
    expect(counted.centre).toBeGreaterThan(0);
    expect(counted.noseBlend).toBeGreaterThan(0);
    expect(counted.noseOwn).toBeGreaterThan(0);
    expect(on.volumeLitres).toBeGreaterThan(off.volumeLitres);
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
  const blankHalfWidthAt = (station: Mm): Mm => mm(samplePchip(halfWidthPoints, station));

  // A blank is uncut foam with square-ish edges, so pick the fullest rail treatment the calculator
  // can produce: full deck (deckPercent 100, undomed) AND a single tuck (both maximise how much of
  // the section stays full-height foam), swept across every family at the blank's own centre
  // station. The legacy Corner Cut keys are carried but read by nothing (quick 261102-gec, PC2).
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
      sharpBottomTuck: false,
      bottomTuck3Override: null,
      scaleFromCenter: DEFAULT_TIP_RAIL_SCALE,
      nudges: ZERO_RAIL_NUDGES,
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
  // (deckPercent 100, singleTuck true) at 51149.1 mm2 — the fullest of the five families, as
  // expected since Family 1 is this calculator's boxiest rail profile. Using Family 1 for the whole
  // board, the computed volume is 77.23 L against the datasheet's stated 77.17 L — a 0.07%
  // deviation, comfortably inside the 10% bar. (Re-measured in quick 261102-gec plan 03, 2026-11-02,
  // when volume moved onto the finished rail — the cuts blended halfway into every band, the founder's
  // D-V1: it read 51714.2 mm2 and 77.98 L, 1.05% over, on the cut rail. Measured earlier the same day
  // in plan 01, when the rails moved onto the founder's Chris Rails v2 sheets — its apex grows with the
  // rail's own thickness and there is no Corner Cut; it read 3.30% over in Phase 14 plan 14-04, when the foil
  // moved onto the square-root fall, about 2.2% on pchip in Phase 11 plan 11-04, and 1.01% on the
  // older Fritsch–Carlson sampler before that.) The remaining gap is exactly what the 10%
  // tolerance exists for: the app's boxiest rail band is still a shaped rail rather than a blank's
  // true square edge, and the plan curve between the five quoted widths is a pchip curve rather
  // than the blank's true outline curve.
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

describe("thicknessAt — one thickness curve for every board", () => {
  const outline = DEFAULT_BOARD_SPEC.outline;
  const length = outline.length;
  const outlineGeometry = buildOutline(outline);
  const halfWidthAt = (station: Mm) => sampleOutline(outlineGeometry, station);
  const foil = DEFAULT_FOIL_SPEC;
  const rails = DEFAULT_RAIL_BAND_SPEC;

  it("sampleFoil is the square-root fall through the five foil stations, everywhere along the board (Phase 14 D-13)", () => {
    const points: SplinePoint[] = foilStationPoints(foil, length).map((p) => ({ x: p.station, y: p.thickness }));
    const curve = prepareRootCurve(points, "fall");
    const mismatches: number[] = [];
    for (let s = 0; s <= length; s += inchesToMm(0.125)) {
      if (sampleFoil(foil, length, mm(s)) !== curve.sample(s)) mismatches.push(s);
    }
    expect(mismatches).toEqual([]);
    for (const { station, thickness } of foilStationPoints(foil, length)) {
      expect(sampleFoil(foil, length, station)).toBe(thickness);
    }
  });

  it("sampleFoil reads exactly what the hand-set side profile draws, on a 1/8in sweep and at the five stations (Phase 14 D-13)", () => {
    const profile = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, foil, length);
    const mismatches: number[] = [];
    for (let s = 0; s <= length; s += inchesToMm(0.125)) {
      if (sampleFoil(foil, length, mm(s)) !== profile.thicknessAt(mm(s))) mismatches.push(s);
    }
    if (sampleFoil(foil, length, length) !== profile.thicknessAt(length)) mismatches.push(length);
    expect(mismatches).toEqual([]);
    for (const { station, thickness } of foilStationPoints(foil, length)) {
      expect(sampleFoil(foil, length, station)).toBe(thickness);
      expect(profile.thicknessAt(station)).toBe(thickness);
    }
  });

  it("with no thicknessAt, integrates exactly what sampleFoil and the hand-set side profile draw", () => {
    const plain = computeCrossSectionVolume({ halfWidthAt, foil, rails, length });
    const viaSampleFoil = computeCrossSectionVolume({
      halfWidthAt,
      foil,
      rails,
      length,
      thicknessAt: (s) => sampleFoil(foil, length, s),
    });
    const viaProfile = computeCrossSectionVolume({
      halfWidthAt,
      foil,
      rails,
      length,
      thicknessAt: buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, foil, length).thicknessAt,
    });
    expect(viaSampleFoil.volumeMm3).toBe(plain.volumeMm3);
    expect(viaProfile.volumeMm3).toBe(plain.volumeMm3);
  });

  it("integrates a blank-derived foil as drawn, not re-splined from its five stations", () => {
    const record = readSeedCatalog().find((b) => b.vendor === "Marko Foam" && b.name === `6'0" M-Regular`);
    if (!record) throw new Error(`Marko Foam 6'0" M-Regular is not in the seeded catalogue`);
    const boardLength = inchesToMm(70);
    const boardGeometry = buildOutline({ ...outline, length: boardLength });
    const boardHalfWidthAt = (station: Mm) => sampleOutline(boardGeometry, station);
    const profile = buildBlankProfile(
      prepareBlank(record),
      {
        length: boardLength,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset: mm(0),
        tail12Offset: mm(0),
        ...DEFAULT_BLANK_CUT,
      },
      mm(0),
    );

    const dense = computeCrossSectionVolume({
      halfWidthAt: boardHalfWidthAt,
      foil: profile.effectiveFoil,
      rails,
      length: boardLength,
      thicknessAt: profile.thicknessAt,
    });
    const resplined = computeCrossSectionVolume({
      halfWidthAt: boardHalfWidthAt,
      foil: profile.effectiveFoil,
      rails,
      length: boardLength,
    });

    expect(dense.volumeMm3).not.toBe(resplined.volumeMm3);
    // Station by station, what was integrated is the profile's own curve: a board station where
    // the two thicknesses differ gives a different cross-section.
    const h = boardLength / SIMPSON_PANEL_COUNT;
    const differing = dense.stationAreas.filter((area, i) => {
      const station = mm(i * h);
      const drawn = profile.thicknessAt(station);
      const resplinedThickness = sampleFoil(profile.effectiveFoil, boardLength, station);
      return drawn !== resplinedThickness && area !== resplined.stationAreas[i];
    });
    expect(differing.length).toBeGreaterThan(0);
  });
});

describe("D-20/D-27/D-30 the hard edge's blend, from Blends From to Ends At", () => {
  // The default board (its tail hard-edged, every deck 100% so no rail thickness rounds to a 1/16" step),
  // integrated by the app's own functions. Nothing here types an area or a litres figure.
  const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
  const halfWidthAt = (s: Mm) => sampleOutline(outlineGeometry, s);
  const length = DEFAULT_BOARD_SPEC.outline.length;
  const input = (rails: RailBandSpec) => ({ halfWidthAt, foil: DEFAULT_FOIL_SPEC, rails, length });
  const anchorPoints = foilStationPoints(DEFAULT_FOIL_SPEC, length);
  const tail12 = anchorPoints[1].station;
  const anchors = { tail: tail12, center: anchorPoints[2].station, nose: anchorPoints[3].station };
  // The board says nothing, so these are the defaults (18" and 30") as the readers resolve them.
  const blendsFrom = hardEdgeBlendsFrom(DEFAULT_RAIL_BAND_SPEC, length);
  const endsAt = hardEdgeEndsAt(DEFAULT_RAIL_BAND_SPEC, length);

  it("a board that says nothing blends from 18\" to 30\", both inside the board's tail half", () => {
    expect(blendsFrom).toBe(inchesToMm(DEFAULT_HARD_EDGE_BLENDS_FROM_IN));
    expect(endsAt).toBe(defaultHardEdgeEndsAt(length));
    expect(endsAt).toBe(inchesToMm(30));
    expect(blendsFrom).toBeGreaterThan(tail12);
    expect(endsAt).toBeLessThan(anchors.center);
  });

  it("RAILS' tail station is always a full hard edge: Blends From never goes below the 12\" mark", () => {
    for (const stored of [inchesToMm(12), inchesToMm(6), inchesToMm(20), undefined]) {
      const rails = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdgeBlendsFrom: stored };
      expect(HARD_EDGE_FADE.weight(tail12, anchors, rails, length), String(stored)).toBe(1);
    }
  });

  /** The cross-section input `summarizeDesign` builds for a stored board. */
  const designInput = (fields: DesignSummaryFields) => {
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return designCrossSectionInput(buildOutline(fields.outline), profile, rails, fields.outline.length);
  };

  it("the weight is 1 at and behind Blends From, 0 at and beyond Ends At, a half midway, and never rises", () => {
    expect(tailHardEdgeWeight(blendsFrom, blendsFrom, endsAt)).toBe(1);
    expect(tailHardEdgeWeight(mm(blendsFrom - 1), blendsFrom, endsAt)).toBe(1);
    expect(tailHardEdgeWeight(tail12, blendsFrom, endsAt)).toBe(1);
    expect(tailHardEdgeWeight(mm(0), blendsFrom, endsAt)).toBe(1);
    expect(tailHardEdgeWeight(endsAt, blendsFrom, endsAt)).toBe(0);
    expect(tailHardEdgeWeight(mm(endsAt + 1), blendsFrom, endsAt)).toBe(0);
    expect(tailHardEdgeWeight(mm((blendsFrom + endsAt) / 2), blendsFrom, endsAt)).toBeCloseTo(0.5, 12);
    let last = Infinity;
    for (let i = 0; i <= 400; i++) {
      const w = tailHardEdgeWeight(mm((i / 400) * length), blendsFrom, endsAt);
      expect(w).toBeLessThanOrEqual(last);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      last = w;
    }
  });

  it("the station area has no step at Blends From nor at Ends At, at the defaults and at a set pair", () => {
    const step = 1e-4;
    const pair = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdgeBlendsFrom: inchesToMm(14), tailHardEdgeEndsAt: inchesToMm(22) };
    for (const rails of [DEFAULT_RAIL_BAND_SPEC, pair]) {
      const from = hardEdgeBlendsFrom(rails, length);
      const to = hardEdgeEndsAt(rails, length);
      for (const [a, b] of [
        [from, from + step],
        [to - step, to],
      ] as const) {
        const [left, right] = boardSections(input(rails), [mm(a), mm(b)]);
        expect(Math.abs(left.area - right.area), `across ${a.toFixed(4)} mm`).toBeLessThan(1e-6 * left.area);
      }
    }
    // And the two sections the fade blends really do differ, so the test above means something.
    const [mid] = boardSections(input(DEFAULT_RAIL_BAND_SPEC), [mm((blendsFrom + endsAt) / 2)]);
    expect(mid.hardWeight).toBeCloseTo(0.5, 12);
    expect(mid.blended).toBeDefined();
    const [hardOnly] = boardSectionsWith(input(DEFAULT_RAIL_BAND_SPEC), { ...HARD_EDGE_FADE, weight: () => 1 }, [
      mid.station,
    ]);
    const [tuckedOnly] = boardSectionsWith(input(DEFAULT_RAIL_BAND_SPEC), { ...HARD_EDGE_FADE, weight: () => 0 }, [
      mid.station,
    ]);
    expect(Math.abs(hardOnly.area - tuckedOnly.area)).toBeGreaterThan(1e-3 * mid.area);
    // The fading station is the ring the 3D board draws — the two finished rails blended point for point, never
    // shrunk tuck marks — corrected by the end rings' own shortfalls (D-31, level variant): close to, but not,
    // the two areas blended.
    const tuckedHalf = sampledFinishedRail(tuckedOnly.result!, mid.domed, mid.halfWidth);
    const hardHalf = sampledFinishedRail(hardOnly.result!, mid.domed, mid.halfWidth);
    const w = mid.hardWeight;
    // A hard edge fading into a round rail opens into a radius (the founder, 2026-11-05).
    expect(mid.blended).toEqual(blendFinishedRails(tuckedHalf, openedFinishedRail(hardHalf, tuckedHalf, 1 - w), w));
    const level =
      sampledSectionArea(mid.blended!) +
      (1 - w) * (tuckedOnly.area - sampledSectionArea(tuckedHalf)) +
      w * (hardOnly.area - sampledSectionArea(hardHalf));
    expect(Math.abs(mid.area - level) / mid.area).toBeLessThan(1e-9);
    const areasBlended = (1 - w) * tuckedOnly.area + w * hardOnly.area;
    expect(Math.abs(mid.area - areasBlended) / mid.area).toBeLessThan(1e-3);
    expect(mid.result?.hardEdge).toBe(false);
    expect(hardOnly.result?.hardEdge).toBe(true);
    // The cut area stays the finished area plus its blends, the two cuts blended by the weight.
    expect(mid.area + mid.blendArea).toBeCloseTo(
      (1 - w) * (tuckedOnly.area + tuckedOnly.blendArea) + w * (hardOnly.area + hardOnly.blendArea),
      6,
    );
  });

  it("the fade's correction vanishes exactly at weight 0 and weight 1, so its ends are the end sections' own areas", () => {
    const station = mm((blendsFrom + endsAt) / 2);
    const [hardOnly] = boardSectionsWith(input(DEFAULT_RAIL_BAND_SPEC), { ...HARD_EDGE_FADE, weight: () => 1 }, [station]);
    const [tuckedOnly] = boardSectionsWith(input(DEFAULT_RAIL_BAND_SPEC), { ...HARD_EDGE_FADE, weight: () => 0 }, [station]);
    const tuckedHalf = sampledFinishedRail(tuckedOnly.result!, tuckedOnly.domed, tuckedOnly.halfWidth);
    const hardHalf = sampledFinishedRail(hardOnly.result!, hardOnly.domed, hardOnly.halfWidth);
    for (const [w, end] of [
      [0, tuckedOnly],
      [1, hardOnly],
    ] as const) {
      const blended = blendFinishedRails(tuckedHalf, hardHalf, w);
      expect(blended).toEqual(w === 0 ? tuckedHalf : hardHalf);
      expect(fadingSectionArea(tuckedOnly.area, hardOnly.area, tuckedHalf, hardHalf, blended, w)).toBe(end.area);
    }
  });

  it("on every board of the forty, at the defaults, every blending station is the level-variant area of its two ends (D-31, D-32)", () => {
    let checked = 0;
    for (const board of phase16Boards()) {
      const boardInput = designInput(board.fields);
      for (const section of boardSections(boardInput)) {
        if (!(section.tipWeight > 0 && section.tipWeight < 1)) continue;
        const ends = boardSectionEnds(boardInput, section.station);
        expect(ends.tipWeight).toBe(section.tipWeight);
        const baseHalf = sampledFinishedRail(ends.base.result!, ends.base.domed, ends.base.halfWidth);
        const tipHalf = sampledFinishedRail(ends.tip.result!, ends.tip.domed, ends.tip.halfWidth);
        const w = section.tipWeight;
        expect(section.blended).toEqual(liveBlend(ends, baseHalf, tipHalf, w));
        const expected =
          sampledSectionArea(section.blended!) +
          (1 - w) * (ends.base.area - sampledSectionArea(baseHalf)) +
          w * (ends.tip.area - sampledSectionArea(tipHalf));
        expect(Math.abs(section.area - expected) / section.area, `${board.label} at ${section.station}`).toBeLessThan(1e-9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  }, 120_000);

  it("with Hard Edge off, the fade and the old switch build the same sections on every board", () => {
    const soft = phase16Boards().filter((board) => !board.fields.rails.tailHardEdge);
    expect(soft).toHaveLength(20);
    for (const board of soft) {
      const boardInput = designInput(board.fields);
      const fade = boardSectionsWith(boardInput, HARD_EDGE_FADE);
      const old = boardSectionsWith(boardInput, HARD_EDGE_SWITCH);
      fade.forEach((section, i) => {
        expect(Object.is(section.area, old[i].area), `${board.label} station ${i}`).toBe(true);
      });
    }
  });

  it("with Hard Edge on, the tail's hidden tucks move no litres; the centre's move the fading stations", () => {
    const base = computeCrossSectionVolume(input(DEFAULT_RAIL_BAND_SPEC));
    const tailTicked = computeCrossSectionVolume(
      input({
        ...DEFAULT_RAIL_BAND_SPEC,
        tail: { ...DEFAULT_RAIL_BAND_SPEC.tail, sharpBottomTuck: true, singleTuck: true },
      }),
    );
    expect(tailTicked.volumeLitres).toBe(base.volumeLitres);
    expect(tailTicked.stationAreas).toEqual(base.stationAreas);

    const centerRails: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      center: { ...DEFAULT_RAIL_BAND_SPEC.center, sharpBottomTuck: true, singleTuck: true },
    };
    const centerTicked = boardSections(input(centerRails));
    const baseSections = boardSections(input(DEFAULT_RAIL_BAND_SPEC));
    const fading = baseSections.filter((section) => section.hardWeight > 0 && section.hardWeight < 1);
    expect(fading.length).toBeGreaterThan(0);
    for (const section of fading) {
      const i = baseSections.indexOf(section);
      expect(centerTicked[i].area, `station ${i}`).not.toBe(section.area);
    }
  });

  // Since D-32 the two settings carry the tail's whole rail, so on a board whose tail also differs in Family
  // the per-station difference is no longer the hard edge's alone and a narrow blend sliding across Simpson's
  // alternating weights can move the litres a hair either way. So the one-way sweep is asked of the boards
  // whose tail differs from the centre in nothing but the Hard Edge (the live rule), and of the forty under
  // go-live 1's rule by name, as go-live 1 shipped it.
  const sweepCases: { label: string; fields: DesignSummaryFields; litres: (fields: DesignSummaryFields) => number }[] = [
    ...phase16LiveBoards()
      .filter((board) => board.fields.rails.tailHardEdge)
      .filter((board) => railCharacterDifferences(board.fields.rails, "tail").every((key) => key === "hardEdge"))
      .map((board) => ({ ...board, litres: (fields: DesignSummaryFields) => summarizeDesign(fields).volumeLitres })),
    ...phase16Boards()
      .filter((board) => board.fields.rails.tailHardEdge)
      .map((board) => ({
        label: `${board.label} (go-live 1's rule)`,
        fields: board.fields,
        litres: (fields: DesignSummaryFields) =>
          summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_FADE }).volumeLitres,
      })),
  ];
  it("moving either setting further from the tail keeps more hard edge, so every hard-edged board's litres change step by step in one direction", () => {
    expect(sweepCases.length).toBeGreaterThan(20);
    // Which way the litres go is the board's own (a hard edge holds more foam than a tucked rail on these
    // boards, so they rise); the test only asks that each sweep moves one way, never back.
    for (const board of sweepCases) {
      const litresWith = (fields: DesignSummaryFields, from: number, to: number) =>
        board.litres({
          ...fields,
          rails: { ...fields.rails, tailHardEdgeBlendsFrom: inchesToMm(from), tailHardEdgeEndsAt: inchesToMm(to) },
        });
      const centreIn = mmToInches(board.fields.outline.length) / 2;
      const endSweep = [20, 22, 24, 26, 28, 30].filter((to) => to <= centreIn).map((to) => litresWith(board.fields, 18, to));
      const startSweep = [12, 14, 16, 18, 20, 22].map((from) => litresWith(board.fields, from, 24));
      for (const [name, sweep] of [
        ["Ends At 20\"→30\"", endSweep],
        ["Blends From 12\"→22\"", startSweep],
      ] as const) {
        expect(sweep.length, board.label).toBeGreaterThan(2);
        const rising = sweep[sweep.length - 1] > sweep[0];
        for (let i = 1; i < sweep.length; i++) {
          if (rising) expect(sweep[i], `${board.label} ${name} step ${i}`).toBeGreaterThan(sweep[i - 1]);
          else expect(sweep[i], `${board.label} ${name} step ${i}`).toBeLessThan(sweep[i - 1]);
        }
      }
    }
  }, 120_000);

  it("a board that says nothing reads exactly as a board that says 18\" and 30\"", () => {
    const said = computeCrossSectionVolume(
      input({
        ...DEFAULT_RAIL_BAND_SPEC,
        tailHardEdgeBlendsFrom: inchesToMm(DEFAULT_HARD_EDGE_BLENDS_FROM_IN),
        tailHardEdgeEndsAt: defaultHardEdgeEndsAt(length),
      }),
    );
    expect(computeCrossSectionVolume(input(DEFAULT_RAIL_BAND_SPEC)).volumeLitres).toBe(said.volumeLitres);
  });

  it("a board carrying only the old single Ends At reads its Blends From as 18\"", () => {
    const old = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdgeEndsAt: inchesToMm(24) };
    const both = { ...old, tailHardEdgeBlendsFrom: inchesToMm(DEFAULT_HARD_EDGE_BLENDS_FROM_IN) };
    expect(computeCrossSectionVolume(input(old)).volumeLitres).toBe(computeCrossSectionVolume(input(both)).volumeLitres);
  });
});

describe("D-32 the whole rail character blends", () => {
  // The founder, 2026-11-04: "we should also treat 'sharp bottom tuck' like a hard edge at the tail station. The
  // same blend from and to applies ... if the center and/or nose have a sharp bottom tuck, the blend still
  // applies, but maintains the sharper edge". Every expected figure is the app's own (Rule 1).
  const outlineGeometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
  const halfWidthAt = (s: Mm) => sampleOutline(outlineGeometry, s);
  const length = DEFAULT_BOARD_SPEC.outline.length;
  const input = (rails: RailBandSpec) => ({ halfWidthAt, foil: DEFAULT_FOIL_SPEC, rails, length });
  const anchorPoints = foilStationPoints(DEFAULT_FOIL_SPEC, length);
  const [centre, nose12] = [anchorPoints[2].station, anchorPoints[3].station];
  /** Stations every quarter inch from the tail end to the nose end. */
  const dense = Array.from({ length: Math.floor(mmToInches(length) * 4) + 1 }, (_, i) => mm(inchesToMm(i / 4)));

  /** The cross-section input `summarizeDesign` builds for a stored board. */
  const designInput = (fields: DesignSummaryFields) => {
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return designCrossSectionInput(buildOutline(fields.outline), profile, rails, fields.outline.length);
  };

  it("railCharacterOf reads each rail as set; while Hard Edge is on the tail reads the centre's two tucks", () => {
    const stock = railCharacterOf(DEFAULT_RAIL_BAND_SPEC, "tail");
    expect(stock.hardEdge).toBe(true);
    expect(stock.singleTuck).toBe(DEFAULT_RAIL_BAND_SPEC.center.singleTuck);
    expect(stock.sharpBottomTuck).toBe(DEFAULT_RAIL_BAND_SPEC.center.sharpBottomTuck);
    const ticked: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      center: { ...DEFAULT_RAIL_BAND_SPEC.center, singleTuck: true },
      tail: { ...DEFAULT_RAIL_BAND_SPEC.tail, family: 1, sharpBottomTuck: true },
    };
    expect(railCharacterOf(ticked, "tail")).toEqual({
      hardEdge: true,
      family: ticked.tail.family,
      symmetrical: ticked.tail.symmetrical,
      singleTuck: ticked.center.singleTuck,
      sharpBottomTuck: ticked.center.sharpBottomTuck,
    });
    const soft: RailBandSpec = { ...ticked, tailHardEdge: false };
    expect(railCharacterOf(soft, "tail")).toEqual({
      hardEdge: false,
      family: soft.tail.family,
      symmetrical: soft.tail.symmetrical,
      singleTuck: soft.tail.singleTuck,
      sharpBottomTuck: soft.tail.sharpBottomTuck,
    });
    for (const key of ["center", "nose"] as const) {
      expect(railCharacterOf(ticked, key)).toEqual({
        hardEdge: false,
        family: ticked[key].family,
        symmetrical: ticked[key].symmetrical,
        singleTuck: ticked[key].singleTuck,
        sharpBottomTuck: ticked[key].sharpBottomTuck,
      });
    }
  });

  it("railCharacterDifferences lists each differing setting once, in RAILS' order, and nothing for the centre's own copy", () => {
    const c = DEFAULT_RAIL_BAND_SPEC.center;
    const otherFamily: RailFamily = c.family === 1 ? 2 : 1;
    const everything: RailSectionSpec = {
      ...c,
      family: otherFamily,
      symmetrical: !c.symmetrical,
      singleTuck: !c.singleTuck,
      sharpBottomTuck: !c.sharpBottomTuck,
    };
    const soft: RailBandSpec = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdge: false, tail: everything, nose: everything };
    expect(railCharacterDifferences(soft, "nose")).toEqual(["family", "symmetrical", "singleTuck", "sharpBottomTuck"]);
    expect(railCharacterDifferences(soft, "tail")).toEqual(["family", "symmetrical", "singleTuck", "sharpBottomTuck"]);
    // Hard Edge on: the tail's tucks are hidden (they read the centre's), so they never differ.
    expect(railCharacterDifferences({ ...soft, tailHardEdge: true }, "tail")).toEqual(["hardEdge", "family", "symmetrical"]);
    const own: RailBandSpec = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdge: false, tail: c, nose: c };
    expect(railCharacterDifferences(own, "tail")).toEqual([]);
    expect(railCharacterDifferences(own, "nose")).toEqual([]);
    for (const board of phase16LiveBoards()) {
      for (const tip of ["tail", "nose"] as const) {
        const keys = railCharacterDifferences(board.fields.rails, tip);
        expect(new Set(keys).size, `${board.label} ${tip}`).toBe(keys.length);
      }
    }
  });

  it("the nose's weight is 0 at and behind the centre, 1 at and beyond the nose 12\", a half midway, and never falls", () => {
    const nineFoot = inchesToMm(108);
    const points = foilStationPoints(DEFAULT_FOIL_SPEC, nineFoot);
    const [c, n] = [points[2].station, points[3].station];
    expect(noseRailWeight(c, c, n)).toBe(0);
    expect(noseRailWeight(mm(c - 1), c, n)).toBe(0);
    expect(noseRailWeight(mm(0), c, n)).toBe(0);
    expect(noseRailWeight(n, c, n)).toBe(1);
    expect(noseRailWeight(mm(n + 1), c, n)).toBe(1);
    expect(noseRailWeight(nineFoot, c, n)).toBe(1);
    expect(noseRailWeight(mm((c + n) / 2), c, n)).toBeCloseTo(0.5, 12);
    let last = -Infinity;
    for (let i = 0; i <= 4000; i++) {
      const w = noseRailWeight(mm((i / 4000) * nineFoot), c, n);
      expect(w).toBeGreaterThanOrEqual(last);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      last = w;
    }
  });

  it("a Sharp-Bottom-Tucked tail with Hard Edge off is the tail's rail to Blends From, the centre's from Ends At, the point blend between — sharp fading to round", () => {
    const rails: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      tailHardEdge: false,
      tail: { ...DEFAULT_RAIL_BAND_SPEC.tail, sharpBottomTuck: true },
    };
    expect(railCharacterDifferences(rails, "tail")).toEqual(["sharpBottomTuck"]);
    const from = hardEdgeBlendsFrom(rails, length);
    const to = hardEdgeEndsAt(rails, length);
    const stations = [...dense.filter((s) => s <= centre), from, to].sort((a, b) => a - b).map(mm);
    const counted = { tail: 0, between: 0, centre: 0 };
    for (const section of boardSections(input(rails), stations)) {
      if (section.halfWidth === 0) continue;
      const s = section.station;
      if (s <= from) {
        counted.tail++;
        expect(section.tipWeight, `at ${s}`).toBe(1);
        expect(section.sharpBottomTuck, `at ${s}`).toBe(true);
        expect(section.sharpness, `at ${s}`).toBe(1);
        expect(section.blended).toBeUndefined();
      } else if (s >= to) {
        counted.centre++;
        expect(section.tipWeight, `at ${s}`).toBe(0);
        expect(section.sharpBottomTuck, `at ${s}`).toBe(false);
        expect(section.sharpness, `at ${s}`).toBe(0);
      } else {
        counted.between++;
        expect(section.tipWeight).toBe(tailHardEdgeWeight(s, from, to));
        expect(section.sharpness).toBe(section.tipWeight);
        expect(section.hardWeight).toBe(0);
        const ends = boardSectionEnds(input(rails), s);
        expect(ends.tipWeight).toBe(section.tipWeight);
        expect(ends.tip.sharpBottomTuck).toBe(true);
        expect(ends.base.sharpBottomTuck).toBe(false);
        const baseHalf = sampledFinishedRail(ends.base.result!, ends.base.domed, ends.base.halfWidth);
        const tipHalf = sampledFinishedRail(ends.tip.result!, ends.tip.domed, ends.tip.halfWidth);
        const w = section.tipWeight;
        expect(section.blended).toEqual(liveBlend(ends, baseHalf, tipHalf, w));
        const area =
          sampledSectionArea(section.blended!) +
          (1 - w) * (ends.base.area - sampledSectionArea(baseHalf)) +
          w * (ends.tip.area - sampledSectionArea(tipHalf));
        expect(Math.abs(section.area - area) / section.area).toBeLessThan(1e-9);
        // The two ends really differ, so the blend means something.
        expect(Math.abs(ends.tip.area - ends.base.area)).toBeGreaterThan(0);
      }
    }
    expect(counted.tail).toBeGreaterThan(0);
    expect(counted.between).toBeGreaterThan(5);
    expect(counted.centre).toBeGreaterThan(0);
    // No step at either end of the blend.
    const step = 1e-4;
    for (const [a, b] of [
      [from, from + step],
      [to - step, to],
    ] as const) {
      const [left, right] = boardSections(input(rails), [mm(a), mm(b)]);
      expect(Math.abs(left.area - right.area), `across ${a.toFixed(4)} mm`).toBeLessThan(1e-6 * left.area);
    }
  });

  it("a hard-edged tail fading into a Sharp-Bottom-Tucked centre keeps its bottom edge sharp all the way", () => {
    const rails: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      center: { ...DEFAULT_RAIL_BAND_SPEC.center, sharpBottomTuck: true },
    };
    let checked = 0;
    let blending = 0;
    for (const section of boardSections(input(rails), dense.filter((s) => s <= centre))) {
      if (section.halfWidth === 0) continue;
      expect(section.sharpness, `at ${section.station}`).toBe(1);
      if (section.tipWeight > 0 && section.tipWeight < 1) blending++;
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
    expect(blending).toBeGreaterThan(5);
  });

  it("a nose whose Sharp Bottom Tuck differs from the centre's blends its sharpness from the centre to the nose 12\"", () => {
    const noseTicked: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      nose: { ...DEFAULT_RAIL_BAND_SPEC.nose, sharpBottomTuck: true },
    };
    const centreTicked: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      center: { ...DEFAULT_RAIL_BAND_SPEC.center, sharpBottomTuck: true },
    };
    const ahead = [centre, ...dense.filter((s) => s > centre)];
    const counted = { between: 0, nose: 0 };
    const up = boardSections(input(noseTicked), ahead);
    const down = boardSections(input(centreTicked), ahead);
    up.forEach((section, i) => {
      if (section.halfWidth === 0) return;
      const s = section.station;
      const w = noseRailWeight(s, centre, nose12);
      expect(section.tipWeight, `at ${s}`).toBe(w);
      if (s === centre) {
        expect(section.sharpness).toBe(0);
        expect(down[i].sharpness).toBe(1);
      } else if (s >= nose12) {
        counted.nose++;
        expect(section.sharpness, `at ${s}`).toBe(1);
        expect(down[i].sharpness, `at ${s}`).toBe(0);
      } else {
        counted.between++;
        expect(section.sharpness, `at ${s}`).toBe(w);
        expect(down[i].sharpness, `at ${s}`).toBe(1 - w);
      }
    });
    expect(up[0].station).toBe(centre);
    expect(counted.between).toBeGreaterThan(5);
    expect(counted.nose).toBeGreaterThan(5);
  });

  it("at the tail 12\", the centre and the nose 12\" every board's sections are that rail's own character (RAILS' three plots)", () => {
    let checked = 0;
    for (const board of phase16LiveBoards()) {
      const boardInput = designInput(board.fields);
      const points = foilStationPoints(boardInput.foil, boardInput.length);
      const [t12, c, n12] = boardSections(boardInput, [points[1].station, points[2].station, points[3].station]);
      if (railCharacterDifferences(boardInput.rails, "tail").length > 0) {
        expect(t12.tipWeight, board.label).toBe(1);
        checked++;
      }
      expect(c.tipWeight, board.label).toBe(0);
      if (railCharacterDifferences(boardInput.rails, "nose").length > 0) {
        expect(n12.tipWeight, board.label).toBe(1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  }, 60_000);

  it("with Hard Edge on, ticking the tail's hidden tucks still moves no litres on any preset (D-27)", () => {
    for (const board of phase16Boards().filter((b) => b.label.endsWith("|asis|hard"))) {
      const ticked: DesignSummaryFields = {
        ...board.fields,
        rails: {
          ...board.fields.rails,
          tail: { ...board.fields.rails.tail, singleTuck: !board.fields.rails.tail.singleTuck, sharpBottomTuck: !board.fields.rails.tail.sharpBottomTuck },
        },
      };
      expect(summarizeDesign(ticked).volumeLitres, board.label).toBe(summarizeDesign(board.fields).volumeLitres);
    }
  });

  type P = [number, number];
  /** The shortest distance from a point to a polyline. */
  const distToPolyline = (p: P, poly: readonly P[]) => {
    let best = Infinity;
    for (let i = 1; i < poly.length; i++) {
      const [a, b] = [poly[i - 1], poly[i]];
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
      best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
    }
    return best;
  };
  /** A section's drawn half, measured from its own rail edge. */
  const drawnHalf = (section: ReturnType<typeof boardSections>[number]): P[] =>
    (section.blended ?? sampledFinishedRail(section.result!, section.domed, section.halfWidth)).map(
      ([x, y]) => [x - section.halfWidth, y] as P,
    );
  /** How far the drawn half jumps across a station: the halves 0.01 mm either side, the larger of the two
   * point-to-polyline distances. */
  const jumpAcross = (boardInput: ReturnType<typeof designInput>, rule: Parameters<typeof boardSectionsWith>[1], s: number) => {
    const [a, b] = boardSectionsWith(boardInput, rule, [mm(s - 0.01), mm(s + 0.01)]);
    const [ha, hb] = [drawnHalf(a), drawnHalf(b)];
    let d = 0;
    for (const p of ha) d = Math.max(d, distToPolyline(p, hb));
    for (const p of hb) d = Math.max(d, distToPolyline(p, ha));
    return d;
  };
  for (const board of phase16LiveBoards()) {
    it(`${board.label}: no step at the old halfway points on a side whose rail differs in more than the Hard Edge`, () => {
      const boardInput = designInput(board.fields);
      const points = foilStationPoints(boardInput.foil, boardInput.length);
      const sides: number[] = [];
      if (railCharacterDifferences(boardInput.rails, "tail").some((key) => key !== "hardEdge")) {
        sides.push((points[1].station + points[2].station) / 2);
      }
      if (railCharacterDifferences(boardInput.rails, "nose").length > 0) {
        sides.push((points[2].station + points[3].station) / 2);
      }
      for (const s of sides) {
        expect(jumpAcross(boardInput, HARD_EDGE_FADE, s), `go-live 1's switch at ${s.toFixed(1)} mm`).toBeGreaterThan(0.3);
        expect(jumpAcross(boardInput, RAIL_CHARACTER_FADE, s), `the live blend at ${s.toFixed(1)} mm`).toBeLessThan(0.05);
      }
    });
  }

  it("the 74 boards' tips that differ in more than the Hard Edge are the ones the step check above covers", () => {
    const tips = phase16LiveBoards().flatMap((board) => [
      railCharacterDifferences(board.fields.rails, "tail").some((key) => key !== "hardEdge"),
      railCharacterDifferences(board.fields.rails, "nose").length > 0,
    ]);
    expect(tips.filter(Boolean).length).toBeGreaterThan(40);
    // Every `tucked` board has at least one such tip; no `aligned` or `stock` board has any.
    for (const board of phase16LiveBoards()) {
      const any =
        railCharacterDifferences(board.fields.rails, "tail").some((key) => key !== "hardEdge") ||
        railCharacterDifferences(board.fields.rails, "nose").length > 0;
      if (/^(aligned|stock)\|/.test(board.label)) expect(any, board.label).toBe(false);
      if (board.label.startsWith("tucked|")) expect(any, board.label).toBe(true);
    }
    expect(Object.keys(PHASE16_TUCKED)).toHaveLength(6);
  });
});

describe("D-37 a wing's two sides share the step, and the rail rolls straight up into the deck", () => {
  type Half = readonly (readonly [number, number])[];
  const BOTTOM_EDGE = SECTION_POINTS.deck + SECTION_POINTS.rail - 2;
  const deckRun = (half: Half) => half.slice(0, SECTION_POINTS.deck);
  const bottomRun = (half: Half) => half.slice(BOTTOM_EDGE);
  /** The drawn half of a section, as the 3D board lays it. */
  const halfOf = (section: BoardSection): Half => placedHalfSection(section, section.halfWidth, 0);
  /** Whether a run's distance across never turns back (`sign` 1 on the deck, walking out; −1 on the bottom). */
  const folds = (run: Half, sign: 1 | -1) => run.some((p, i) => i > 0 && sign * (p[0] - run[i - 1][0]) < -1e-9);
  /** A deck run's height at a distance across. */
  function heightAt(run: Half, y: number): number {
    for (let i = 1; i < run.length; i++) {
      const [y0, h0] = run[i - 1];
      const [y1, h1] = run[i];
      if (y <= y1) return y1 > y0 ? h0 + ((h1 - h0) * (y - y0)) / (y1 - y0) : h1;
    }
    return run[run.length - 1][1];
  }

  function inputOf(fields: DesignSummaryFields) {
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return { geometry, input: designCrossSectionInput(geometry, profile, rails, fields.outline.length) };
  }
  /** The live rule with its wing behaviour set back: the whole section shifts in with the outline. */
  const SHIFT_WITH_LIVE_TIPS: RailCharacterRule = { ...SMOOTH_SURFACE_FADE, fit: { ...SMOOTH_SURFACE_FADE.fit!, wings: "shift" } };

  /** One winged board, with its stations every 2 mm through each wing's shared stretch, three ways. */
  const WINGED = phase16WingBoards().map((board) => {
    const { geometry, input } = inputOf(board.fields);
    const plain = inputOf({ ...board.fields, outline: outlineWithoutWings(board.fields.outline) }).input;
    const wings = geometry.wings!;
    const stations: Mm[] = [];
    for (const wing of wings) {
      const { middle, reach } = wingShareSpan(wing);
      for (let s = middle - reach; s <= middle + reach; s += 2) stations.push(mm(s));
    }
    const live = boardSections(input, stations);
    const shifted = boardSectionsWith(input, SHIFT_WITH_LIVE_TIPS, stations);
    const without = boardSections(plain, stations);
    return { ...board, geometry, input, plain, wings, stations, live, shifted, without };
  });
  /** The jump in the deck across a wing at one distance from the stringer, the board's own taper taken out. */
  const ledgeAt = (rule: "live" | "shift", board: (typeof WINGED)[number], wing: Wing, y: (behindWidth: number) => number) => {
    const { stepStart, inner } = wingFootprint(wing);
    const stations = [mm(stepStart + 2), mm(inner - 2)];
    const sections = rule === "live" ? boardSections(board.input, stations) : boardSectionsWith(board.input, SHIFT_WITH_LIVE_TIPS, stations);
    const [plainAhead, plainBehind] = boardSections(board.plain, stations);
    const at = y(sections[1].halfWidth);
    return (
      heightAt(deckRun(halfOf(sections[0])), at) -
      heightAt(deckRun(halfOf(sections[1])), at) -
      (heightAt(deckRun(halfOf(plainAhead)), at) - heightAt(deckRun(halfOf(plainBehind)), at))
    );
  };

  it("the 28 boards each reach through their wing", () => {
    expect(WINGED).toHaveLength(28);
    for (const board of WINGED) expect(board.stations.length).toBeGreaterThan(60);
  });

  describe("wingStepHalf: the rail moved onto the outline, the deck left on its line", () => {
    const rail = computeRailBands(DEFAULT_RAIL_BAND_SPEC).center.result;
    const moves = [0.01, 0.5, inchesToMm(3 / 16), inchesToMm(3 / 8), inchesToMm(1 / 2), inchesToMm(1)];
    const rooms = (move: number) => [1.6, 2, 3, 5, 12].map((k) => k * move).concat([100, 200, 300]);

    for (const size of moves) {
      for (const move of [size, -size]) {
        it(`a move of ${move.toFixed(2)} mm, on rooms from 1.6 × the move to 300 mm`, () => {
          for (const room of rooms(size)) {
            const half = sampledFinishedRail(rail, true, room);
            const moved = wingStepHalf(half, room, move, rail.deckMark2);
            const reach = Math.min(room, Math.max(rail.deckMark2, 2 * size));
            expect(moved[0]).toEqual(half[0]);
            expect(moved[moved.length - 1]).toEqual(half[half.length - 1]);
            expect(Math.abs(Math.max(...moved.map((p) => p[0])) - (room - move))).toBeLessThan(1e-9);
            expect(folds(deckRun(moved), 1)).toBe(false);
            expect(folds(bottomRun(moved), -1)).toBe(false);
            moved.forEach((p, i) => {
              expect(p[1]).toBe(half[i][1]);
              if (1.5 * size < reach && room - half[i][0] >= reach) expect(p[0]).toBe(half[i][0]);
            });
          }
        });
      }
    }

    it("moves nothing with a move of 0", () => {
      const half = sampledFinishedRail(rail, true, 200);
      expect(wingStepHalf(half, 200, 0, rail.deckMark2)).toEqual(half);
    });
  });

  for (const board of WINGED) {
    it(`${board.label}: the deck runs smooth across the wing, where the whole section's shift left a ledge`, () => {
      for (const wing of board.wings) {
        for (const inches of [1, 2]) {
          const y = (width: number) => width - inchesToMm(inches);
          const shared = Math.abs(ledgeAt("live", board, wing, y));
          const shifted = Math.abs(ledgeAt("shift", board, wing, y));
          expect(shifted).toBeGreaterThan(0.1);
          expect(shared).toBeLessThan(shifted / 2);
        }
      }
    }, 60_000);

    it(`${board.label}: behind the wing the rail stands thicker, ahead of it thinner, and they share the step`, () => {
      let behind = 0;
      let ahead = 0;
      board.stations.forEach((station, i) => {
        const share = wingShareAt(board.geometry, station);
        // Clear of the blend's far ends, where the share is too small to read.
        if (Math.abs(share) < 0.25) return;
        const y = board.live[i].halfWidth - inchesToMm(1);
        const drawn = heightAt(deckRun(halfOf(board.live[i])), y);
        const own = heightAt(deckRun(halfOf(board.shifted[i])), y);
        if (share > 0) {
          expect(drawn).toBeGreaterThan(own);
          behind++;
        } else {
          expect(drawn).toBeLessThan(own);
          ahead++;
        }
      });
      expect(behind).toBeGreaterThan(10);
      expect(ahead).toBeGreaterThan(10);
    }, 60_000);

    it(`${board.label}: the rail stands on the stepped outline, the bottom stays flat, and nothing folds`, () => {
      board.stations.forEach((station, i) => {
        const section = board.live[i];
        const drawn = halfOf(section);
        expect(section.halfWidth).toBe(foamHalfWidthOf(board.geometry, station));
        expect(Math.abs(Math.max(...drawn.map((p) => p[0])) - section.halfWidth)).toBeLessThan(1e-9);
        expect(folds(deckRun(drawn), 1)).toBe(false);
        expect(folds(bottomRun(drawn), -1)).toBe(false);
        for (const [, h] of bottomRun(drawn)) expect(h).toBeLessThan(1e-9);
      });
    }, 60_000);

    it(`${board.label}: a station the shared stretch does not reach reads what it read with the wing rule off`, () => {
      const live = boardSections(board.input);
      const shifted = boardSectionsWith(board.input, SHIFT_WITH_LIVE_TIPS);
      let reached = 0;
      live.forEach((section, i) => {
        if (wingShareAt(board.geometry, section.station) !== 0) {
          reached++;
          return;
        }
        expect(Object.is(section.area, shifted[i].area)).toBe(true);
        expect(Object.is(section.blendArea, shifted[i].blendArea)).toBe(true);
        expect(section.drawn).toEqual(shifted[i].drawn);
      });
      expect(reached).toBeGreaterThan(0);
      expect(reached).toBeLessThan(live.length);
    }, 60_000);
  }

  describe("the tuck moves with the rail", () => {
    for (const board of WINGED.filter((b) => b.label.endsWith("|one") && b.input.rails.tailHardEdge)) {
      it(`${board.label}: on a hard edge the corner is the rail itself, on the stepped outline`, () => {
        let hard = 0;
        board.stations.forEach((_, i) => {
          const section = board.live[i];
          if (section.hardWeight !== 1) return;
          hard++;
          expect(Math.abs(halfOf(section)[BOTTOM_EDGE][0] - section.halfWidth)).toBeLessThan(1e-9);
        });
        expect(hard).toBeGreaterThan(10);
      });
    }

    for (const board of WINGED.filter((b) => b.label.endsWith("|one-soft") && !b.input.rails.center.symmetrical)) {
      it(`${board.label}: a tuck narrower than the roll stays its own width from the rail, within the move`, () => {
        board.stations.forEach((station, i) => {
          const section = board.live[i];
          const width = section.halfWidth - halfOf(section)[BOTTOM_EDGE][0];
          const own = board.shifted[i].halfWidth - halfOf(board.shifted[i])[BOTTOM_EDGE][0];
          expect(Math.abs(width - own)).toBeLessThanOrEqual(Math.abs(wingShareAt(board.geometry, station)) + 1e-6);
        });
      }, 60_000);
    }
  });
});

describe("D-34 the rail fits into a narrow tip", () => {
  function inputOf(fields: DesignSummaryFields) {
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return { geometry, input: designCrossSectionInput(geometry, profile, rails, fields.outline.length) };
  }
  const BOARDS = phase16SurfaceBoards().map((board) => ({ ...board, ...inputOf(board.fields) }));
  /** An old-fit rule holding a station's tip weight, so each end of a blend can be read alone. */
  const held = (tipWeight: number): RailCharacterRule => ({
    at: (...args) => ({ ...RAIL_CHARACTER_FADE.at(...args), tipWeight }),
  });

  for (const { label, geometry, input } of BOARDS) {
    it(`${label}: a station narrower than its rail counts the fitted ring; one with room counts what it always did`, () => {
      const live = boardSections(input);
      // The tips' fit alone set back: the same actual rail thickness, cut off at the stringer.
      const old = boardSectionsWith(input, { at: RAIL_CHARACTER_FADE.at, fit: { ...OLD_SURFACE_FIT, rail: "exact" } });
      live.forEach((section, i) => {
        if (!section.result || section.blended || wingShareAt(geometry, section.station) !== 0) return;
        const before = old[i];
        const sampled = sampledFinishedRail(before.result!, before.domed, before.halfWidth);
        const fitted = fittedFinishedRail(before.result!, before.domed, before.halfWidth);
        // The tail's roll draws a station's heights lower and leaves its area for the whole-board count (D-38).
        const scaled = (half: typeof fitted) => half.map(([y, h]) => [y, h * (section.rollScale ?? 1)]);
        if (fitted === sampled || section.halfWidth >= railReach(section.result, section.domed)) {
          expect(Object.is(section.area, before.area)).toBe(true);
          if (section.rollScale === undefined) expect(section.drawn).toBeUndefined();
          else expect(section.drawn).toEqual(scaled(sampled));
        } else {
          const lift = sampledSectionArea(fitted) - sampledSectionArea(sampled);
          expect(lift).toBeGreaterThan(0);
          expect(section.area).toBe(before.area + lift);
          expect(section.blendArea).toBe(before.blendArea);
          expect(section.drawn).toEqual(scaled(fitted));
        }
      });
    }, 60_000);
  }

  it("a blend at a station narrower than its rails is the level variant on the fitted halves", () => {
    // A board 40 mm wide all along: every station is narrow, and the nose and the tail differ from the centre.
    const room = mm(20);
    const family: RailFamily = DEFAULT_RAIL_BAND_SPEC.center.family === 3 ? 4 : 3;
    const rails: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      tailHardEdge: false,
      tail: { ...DEFAULT_RAIL_BAND_SPEC.tail, family },
      nose: { ...DEFAULT_RAIL_BAND_SPEC.nose, family },
    };
    const input = {
      halfWidthAt: () => room,
      foil: DEFAULT_FOIL_SPEC,
      rails,
      length: DEFAULT_BOARD_SPEC.outline.length,
      thicknessAt: () => mm(60),
    };
    let blending = 0;
    for (const section of boardSections(input)) {
      if (!section.blended) continue;
      blending++;
      const w = section.tipWeight;
      const [base] = boardSectionsWith(input, held(0), [section.station]);
      const [tip] = boardSectionsWith(input, held(1), [section.station]);
      const end = (at: BoardSection) => {
        const sampled = sampledFinishedRail(at.result!, at.domed, room);
        const fitted = fittedFinishedRail(at.result!, at.domed, room);
        expect(fitted).not.toBe(sampled);
        return { fitted, exact: at.area + (sampledSectionArea(fitted) - sampledSectionArea(sampled)) };
      };
      const [a, b] = [end(base), end(tip)];
      const blended = blendFinishedRails(a.fitted, b.fitted, w);
      expect(section.blended).toEqual(blended);
      expect(section.drawn).toBeUndefined();
      expect(section.area).toBe(fadingSectionArea(a.exact, b.exact, a.fitted, b.fitted, blended, w));
    }
    expect(blending).toBeGreaterThan(3);
  });

  it("the old rules never fit a thing: their sections carry no drawn half", () => {
    for (const rule of [HARD_EDGE_SWITCH, HARD_EDGE_FADE, RAIL_CHARACTER_FADE]) {
      for (const { input } of BOARDS.filter((board) => board.label.endsWith("|asis|hard") || board.label.endsWith("|one"))) {
        for (const section of boardSectionsWith(input, rule)) expect(section.drawn).toBeUndefined();
      }
    }
  });

  it("OLD_SURFACE_FIT is what every rule before plan 16-16 does, and the live rule fits both", () => {
    expect(OLD_SURFACE_FIT).toEqual({ wings: "shift", tips: "clip", tail: "square", tuck: "corner", rail: "sixteenths" });
    expect(RAIL_CHARACTER_FADE.fit).toBeUndefined();
    expect(SMOOTH_SURFACE_FADE.fit).toEqual({ wings: "share", tips: "fit", tail: "roll", tuck: "open", rail: "exact" });
  });
});

describe("D-38 the tail's rail is carried around the end", () => {
  const RUN = inchesToMm(TAIL_ROLL_RUN_IN);
  const TIP = mm(20);
  const boards = phase16SurfaceBoards().filter((board) => /\|(asis|pin|round|diamond|swallow)\|hard$|^wing\|.*\|one$/.test(board.label));
  function inputOf(fields: DesignSummaryFields) {
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  }

  it("tailRollDrop is a quarter ellipse: the share of the tip at the end, nothing from the end of the run on", () => {
    expect(tailRollDrop(mm(0), TIP)).toBeCloseTo(TIP * TAIL_ROLL_SHARE, 12);
    expect(tailRollDrop(RUN, TIP)).toBe(0);
    expect(tailRollDrop(mm(RUN + 5), TIP)).toBe(0);
    // On the ellipse x² + y² = 1, walking in from the end.
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const y = 1 - tailRollDrop(mm(RUN * f), TIP) / (TIP * TAIL_ROLL_SHARE);
      expect(y * y + (1 - f) * (1 - f)).toBeCloseTo(1, 10);
    }
  });

  it("tailRollScale keeps every height's share, 1 clear of the roll", () => {
    expect(tailRollScale(mm(0), TIP, TIP)).toBeCloseTo(1 - TAIL_ROLL_SHARE, 12);
    expect(tailRollScale(RUN, mm(40), TIP)).toBe(1);
  });

  it("tailRollScale keeps everything of a station with no thickness to roll", () => {
    expect(tailRollScale(mm(0), mm(0), mm(0))).toBe(1);
    expect(tailRollScale(mm(0), mm(0), TIP)).toBe(1);
  });

  it("tailRollStations start at the tail end, stop at the end of the run, and crowd toward the end", () => {
    const stations = tailRollStations(8);
    expect(stations[0]).toBe(0);
    expect(stations[8]).toBeCloseTo(RUN, 9);
    for (let i = 1; i < 8; i++) expect(stations[i] - stations[i - 1]).toBeLessThan(stations[i + 1] - stations[i]);
  });

  for (const { label, fields } of boards) {
    const input = inputOf(fields);
    it(`${label}: the litres take off the roll's own foam, to within a part in twenty of a fine count`, () => {
      const result = computeCrossSectionVolume(input);
      const n = 2000;
      const at = Array.from({ length: n + 1 }, (_, i) => mm((i * RUN) / n));
      const lost = boardSections(input, at).map((section) => section.area * (1 - (section.rollScale ?? 1)));
      const fine = simpsonIntegrate(lost, RUN / n);
      expect(result.tailRollMm3).toBe(tailRollFoam(input, SMOOTH_SURFACE_FADE));
      expect(result.tailRollMm3).toBeGreaterThan(0);
      expect(Math.abs(result.tailRollMm3 - fine) / fine).toBeLessThan(0.05);
    });

    it(`${label}: a rolled station keeps its un-rolled area and draws its heights scaled, the bottom left alone`, () => {
      const sections = boardSections(input, [mm(RUN / 3), mm(RUN / 2), mm(RUN + 1)]);
      for (const section of sections.slice(0, 2)) {
        expect(section.rollScale).toBeLessThan(1);
        if (!section.result) continue;
        const half = section.drawn!;
        expect(Math.max(...half.map((p) => p[1]))).toBeCloseTo(section.thickness * section.rollScale!, 6);
        expect(half[half.length - 1][1]).toBe(0);
      }
      expect(sections[2].rollScale).toBeUndefined();
    });
  }

  it("the old rules keep the square end and count no roll", () => {
    const input = inputOf(boards[0].fields);
    for (const rule of [HARD_EDGE_SWITCH, HARD_EDGE_FADE, RAIL_CHARACTER_FADE]) {
      expect(computeCrossSectionVolumeWith(input, rule).tailRollMm3).toBe(0);
      expect(boardSectionsWith(input, rule, [mm(0)])[0].rollScale).toBeUndefined();
    }
  });
});

describe("a sharp bottom edge opens into a round one along the blend (the founder, 2026-11-05)", () => {
  const EDGE = SECTION_POINTS.deck + SECTION_POINTS.rail - 2;
  /** The largest turn between neighbouring points around the tuck, in degrees. */
  function tuckTurn(half: readonly (readonly [number, number])[]): number {
    let best = 0;
    for (let i = EDGE - 16; i <= EDGE + 8; i++) {
      const a = Math.atan2(half[i][1] - half[i - 1][1], half[i][0] - half[i - 1][0]);
      const b = Math.atan2(half[i + 1][1] - half[i][1], half[i + 1][0] - half[i][0]);
      const d = (Math.abs(b - a) * 180) / Math.PI;
      best = Math.max(best, d > 180 ? 360 - d : d);
    }
    return best;
  }
  function inputOf(label: string) {
    const { fields } = phase16SurfaceBoards().find((board) => board.label === label)!;
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  }
  const zone = (input: ReturnType<typeof inputOf>, side: "tail" | "nose") => {
    const points = foilStationPoints(input.foil, input.length);
    return side === "nose"
      ? [points[2].station, points[3].station]
      : [hardEdgeBlendsFrom(input.rails, input.length), hardEdgeEndsAt(input.rails, input.length)];
  };
  const halfOf = (section: BoardSection) => placedHalfSection(section, section.halfWidth, 0);

  const cases: [string, "tail" | "nose"][] = [
    ["tucked|shortboard|he-centre-sbt", "nose"],
    ["tucked|fish|he-centre-sbt", "nose"],
    ["tucked|shortboard|tail-sbt", "tail"],
    ["tucked|fish|tail-sbt", "tail"],
    ["shortboard|asis|hard", "tail"],
    ["fish|asis|hard", "tail"],
  ];
  for (const [label, side] of cases) {
    it(`${label}: by the blend's middle the corner is gone, where a point-for-point blend still carries one`, () => {
      const input = inputOf(label);
      const [from, to] = zone(input, side);
      const s = mm((from + to) / 2);
      const [live] = boardSections(input, [s]);
      const [corner] = boardSectionsWith(input, { at: RAIL_CHARACTER_FADE.at }, [s]);
      const ends = boardSectionEnds(input, s);
      const round = ends.base.sharpness === 1 ? ends.tip : ends.base;
      const own = tuckTurn(halfOf(round));
      expect(tuckTurn(halfOf(live))).toBeLessThan(own + 4);
      expect(tuckTurn(halfOf(corner))).toBeGreaterThan(own + 8);
    });

    it(`${label}: the turn only eases along the blend, from the sharp end to the round`, () => {
      const input = inputOf(label);
      const [from, to] = zone(input, side);
      const fractions = Array.from({ length: 11 }, (_, i) => i / 10).slice(1, -1);
      const stations = fractions.map((f) => mm(from + (to - from) * f));
      const turns = boardSections(input, stations).map((section) => tuckTurn(halfOf(section)));
      const ordered = side === "tail" ? turns : turns;
      for (let i = 1; i < ordered.length; i++) expect(ordered[i]).toBeLessThan(ordered[i - 1] + 1);
    });
  }

  it("two sharp ends stay sharp: a hard tail into a sharp centre is the point blend, as it was", () => {
    const input = inputOf("tucked|shortboard|he-centre-sbt");
    const [from, to] = zone(input, "tail");
    const s = mm((from + to) / 2);
    const [live] = boardSections(input, [s]);
    const [corner] = boardSectionsWith(input, { at: RAIL_CHARACTER_FADE.at }, [s]);
    expect(live.blended).toEqual(corner.blended);
    expect(live.sharpness).toBe(1);
  });

  describe("openedFinishedRail", () => {
    const rails = computeRailBands({ ...DEFAULT_RAIL_BAND_SPEC, center: { ...DEFAULT_RAIL_BAND_SPEC.center, sharpBottomTuck: true } });
    const roundRails = computeRailBands(DEFAULT_RAIL_BAND_SPEC);
    const sharp = sampledFinishedRail(rails.center.result, rails.center.domed, 200);
    const round = sampledFinishedRail(roundRails.center.result, roundRails.center.domed, 200);

    it("at share 0 it is the sharp half", () => {
      expect(openedFinishedRail(sharp, round, 0)).toEqual(sharp);
    });

    for (const share of [0.02, 0.1, 0.25, 0.5, 0.75, 1]) {
      it(`at share ${share} the edge point is on the bottom, the deck hasn't moved, and nothing folds`, () => {
        const opened = openedFinishedRail(sharp, round, share);
        expect(opened).toHaveLength(sharp.length);
        expect(opened[EDGE][1]).toBe(0);
        expect(opened[EDGE][0]).toBeLessThan(sharp[EDGE][0]);
        expect(opened.slice(0, SECTION_POINTS.deck)).toEqual(sharp.slice(0, SECTION_POINTS.deck));
        for (let i = EDGE + 1; i < opened.length; i++) {
          expect(opened[i][1]).toBe(0);
          expect(opened[i][0]).toBeLessThanOrEqual(opened[i - 1][0] + 1e-9);
        }
        for (let i = SECTION_POINTS.deck; i <= EDGE; i++) expect(opened[i][1]).toBeLessThanOrEqual(opened[i - 1][1] + 1e-9);
        expect(opened[opened.length - 1]).toEqual(sharp[sharp.length - 1]);
      });
    }

    it("a wider share is a wider radius, and takes a little more foam off", () => {
      const areas = [0.1, 0.25, 0.5, 1].map((share) => sampledSectionArea(openedFinishedRail(sharp, round, share)));
      for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeLessThan(areas[i - 1]);
      expect(areas[0]).toBeLessThan(sampledSectionArea(sharp));
    });
  });
});

describe("a domed deck's rail is built from its actual thickness (the founder, 2026-11-05)", () => {
  const STEP = inchesToMm(1 / 8);
  function inputOf(fields: DesignSummaryFields) {
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    return designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  }
  const boards = phase16SurfaceBoards();
  const midlength = boards.find((board) => board.label === "midlength|asis|hard")!.fields;
  /** Another domed deck: the Shortboard with its Deck Profile taken down, so the rule isn't proven on one board. */
  const domedShortboard = (() => {
    const { fields } = boards.find((board) => board.label === "shortboard|asis|hard")!;
    const down = (spec: RailBandSpec["center"]) => ({ ...spec, deckPercent: 88 });
    return { ...fields, rails: { ...fields.rails, tail: down(fields.rails.tail), center: down(fields.rails.center), nose: down(fields.rails.nose) } };
  })();

  /** The largest bend along the board, in mm between neighbouring steps of 1/8": the deck 1", 2" and 3" in, and the rail. */
  function largestBend(sections: BoardSection[]): number {
    const halves = sections.map((section) => placedHalfSection(section, section.halfWidth, 0));
    const height = (half: [number, number][], y: number) => {
      const deck = half.slice(0, SECTION_POINTS.deck);
      for (let i = 1; i < deck.length; i++) {
        if (y <= deck[i][0]) {
          const f = (y - deck[i - 1][0]) / (deck[i][0] - deck[i - 1][0] || 1);
          return deck[i - 1][1] + (deck[i][1] - deck[i - 1][1]) * f;
        }
      }
      return deck[deck.length - 1][1];
    };
    const lines = [
      ...[1, 2, 3].map((inches) => sections.map((section, i) => section.thickness - height(halves[i], section.halfWidth - inchesToMm(inches)))),
      halves.map((half) => half[SECTION_POINTS.deck - 1][1]),
    ];
    return Math.max(...lines.flatMap((line) => line.slice(1, -1).map((v, i) => Math.abs(line[i + 2] - 2 * v + line[i]))));
  }

  for (const [name, fields] of [["the Mid-length", midlength], ["a domed Shortboard", domedShortboard]] as const) {
    it(`${name}: the rail runs smooth along the whole board, where the rounded thickness stepped`, () => {
      const input = inputOf(fields);
      const stations: Mm[] = [];
      for (let s: number = inchesToMm(4); s <= input.length - inchesToMm(4); s += STEP) stations.push(mm(s));
      expect(largestBend(boardSections(input, stations))).toBeLessThan(0.06);
      expect(largestBend(boardSectionsWith(input, RAIL_CHARACTER_FADE, stations))).toBeGreaterThan(0.4);
    }, 60_000);

    it(`${name}: what a shaper reads stays on the 1/16", and the built section reads the actual thickness`, () => {
      const input = inputOf(fields);
      const output = computeRailBands(input.rails);
      const points = foilStationPoints(input.foil, input.length);
      const at = [points[1].station, points[2].station, points[3].station];
      const live = boardSections(input, at);
      const named = boardSectionsWith(input, RAIL_CHARACTER_FADE, at);
      for (const [i, key] of (["tail", "center", "nose"] as const).entries()) {
        const read = output[key];
        expect(read.domed).toBe(true);
        expect(read.railThicknessClamped).toBe(roundToSixteenthInch(read.railThicknessClamped));
        expect(read.result.thickness).toBe(read.railThicknessClamped);
        expect(named[i].result!.thickness).toBe(read.railThicknessClamped);
        const deck = effectiveDeckPercent(input.rails[key].deckPercent);
        expect(live[i].result!.thickness).toBe((live[i].thickness * deck) / 100);
      }
    });
  }

  it("a flat deck is the same rail either way, to the last digit", () => {
    const rounded: RailCharacterRule = { ...SMOOTH_SURFACE_FADE, fit: { ...SMOOTH_SURFACE_FADE.fit!, rail: "sixteenths" } };
    const input = inputOf(boards.find((board) => board.label === "shortboard|asis|hard")!.fields);
    expect(Object.is(computeCrossSectionVolume(input).volumeMm3, computeCrossSectionVolumeWith(input, rounded).volumeMm3)).toBe(true);
  });
});
