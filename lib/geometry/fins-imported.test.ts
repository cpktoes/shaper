/**
 * Imported-template branch — quick 260928-p45 (Phase 13 item 6).
 *
 * Golden parity against lib/geometry/__fixtures__/prototype-fins-imported-golden.json, generated
 * by executing the prototype's own `renderVals`, `effectiveHalfWidthAt`,
 * `outlineOffTailAtHalfWidth`, `syncFromTemplate` and `importedOutlinePath` on the app's own
 * `buildOutline` output for 9 real outlines and 32 fin-setup cases
 * (scripts/extract-prototype-fins-golden.mjs). Never hand-copy or retype the prototype's math —
 * that would silently validate a wrong port against a second hand-transcription instead of
 * against the prototype itself.
 *
 * lib/geometry/fins.test.ts (the fallback-branch golden suite) is left untouched by this task —
 * this is a separate file, checked separately, so the two suites can never be confused about
 * which branch they are proving.
 */
import { describe, expect, it } from "vitest";
import {
  computeFinPlacement,
  importedFinTailFromOutline,
  tailHalfWidthAt,
  tailOffTailAtHalfWidth,
  type FinAdvancedSpec,
  type FinPlacementSpec,
  type FinSetup,
  type FinTailShape,
  type QuadRearModel,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "./fins";
import { formatInchesFraction, inchesToMm, mm, mmToInches, type Mm } from "./units";
import { buildOutline } from "./outline";
import type { OutlineSpec } from "./board";
import importedGolden from "./__fixtures__/prototype-fins-imported-golden.json";
import fallbackGolden from "./__fixtures__/prototype-fins-golden.json";

// ---- Copied verbatim from lib/geometry/fins.test.ts lines 24-90 (test files export nothing, so
// this file cannot import them from there) ---------------------------------------------------

const TOLERANCE_IN = 1e-9;

function expectCloseIn(actual: number, expected: number, tol: number = TOLERANCE_IN) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

interface GoldenAdvancedState {
  baseLenForward: number;
  baseLenForwardOverridden: boolean;
  baseLenRear: number;
  baseLenRearOverridden: boolean;
  baseLenCenter: number;
  baseLenCenterOverridden: boolean;
  centerPositionOffset: number;
  forwardPositionOffset: number;
  forwardToeOverride: number | null;
  rearPositionOffset: number;
  rearToeOverride: number | null;
  quadRearOffRailOverride: number | null;
  quadRearOffTailOverride: number | null;
  quadRearOffTailOverridden: boolean;
}

interface GoldenState extends GoldenAdvancedState {
  lengthIn: number;
  w12: number;
  tailShape: FinTailShape;
  finSetup: FinSetup;
  frontModel: ThrusterFrontModel;
  quadRearModel: QuadRearModel;
  twinType: TwinTemplate;
  quadCenterFinOn: boolean;
}

function optIn(v: number | null): Mm | null {
  return v === null ? null : inchesToMm(v);
}

function toSpec(state: GoldenState): FinPlacementSpec {
  const advanced: FinAdvancedSpec = {
    baseLenForward: inchesToMm(state.baseLenForward),
    baseLenForwardOverridden: state.baseLenForwardOverridden,
    baseLenRear: inchesToMm(state.baseLenRear),
    baseLenRearOverridden: state.baseLenRearOverridden,
    baseLenCenter: inchesToMm(state.baseLenCenter),
    baseLenCenterOverridden: state.baseLenCenterOverridden,
    centerPositionOffset: inchesToMm(state.centerPositionOffset),
    forwardPositionOffset: inchesToMm(state.forwardPositionOffset),
    forwardToeOverride: optIn(state.forwardToeOverride),
    rearPositionOffset: inchesToMm(state.rearPositionOffset),
    rearToeOverride: optIn(state.rearToeOverride),
    quadRearOffRailOverride: optIn(state.quadRearOffRailOverride),
    quadRearOffTailOverride: optIn(state.quadRearOffTailOverride),
    quadRearOffTailOverridden: state.quadRearOffTailOverridden,
  };
  return {
    boardLength: inchesToMm(state.lengthIn),
    tailWidth12: inchesToMm(state.w12),
    tailShape: state.tailShape,
    finSetup: state.finSetup,
    frontModel: state.frontModel,
    quadRearModel: state.quadRearModel,
    twinTemplate: state.twinType,
    quadCenterFinOn: state.quadCenterFinOn,
    advanced,
  };
}

// ---- This file's own fixture shapes -----------------------------------------------------------

interface ImportedTailGeomFixture {
  points: [number, number][];
  podX: number;
  podY: number;
  connector: { x: number; y: number } | null;
}

interface ImportedTemplateValuesFixture {
  available: boolean;
  lengthIn: number;
  tailShape: FinTailShape;
  w12: number;
  tailGeom: ImportedTailGeomFixture;
}

interface ImportedOutlineFixture {
  source: string;
  outlineSpec: unknown;
  templateValues: ImportedTemplateValuesFixture;
  halfWidthProbes: { y: number; halfWidth: number }[];
  offTailProbes: { targetHw: number; offTail: number }[];
}

interface ImportedCaseValsFixture {
  summarySections: {
    label: string;
    groups: {
      heading: string;
      rows: { label: string; value: string }[];
      fullSpreadNote?: string;
    }[];
  }[];
  legendBaseLens: { label: string; value: string; dasharray: string }[];
  modelHeader: string;
  isModified: boolean;
  centerFinalDisplay: string;
  forwardToeDisplay: string;
  rearToeDisplay: string;
  quadRearOffRailDisplayValue: string;
  quadRearOffTailInputValue: number | null;
  frontFinalDisplay: string;
  pairFinalDisplay: string;
}

interface ImportedCaseFixture {
  outline: string;
  state: GoldenState;
  vals: ImportedCaseValsFixture;
  marksInches: { teOffTail: number; teLateral: number; leOffTail: number; leLateral: number }[];
}

const importedOutlines = importedGolden.outlines as unknown as Record<string, ImportedOutlineFixture>;
const importedCases = importedGolden.cases as unknown as Record<string, ImportedCaseFixture>;
const importedOutlineEntries = Object.entries(importedOutlines);
const importedCaseEntries = Object.entries(importedCases);

const fallbackFixtures = fallbackGolden as unknown as Record<string, { state: GoldenState }>;
const fallbackEntries = Object.entries(fallbackFixtures);

describe("importedFinTailFromOutline reproduces the prototype's own template geometry", () => {
  for (const [name, outlineFixture] of importedOutlineEntries) {
    it(`outline: ${name}`, () => {
      const outlineSpec = outlineFixture.outlineSpec as unknown as OutlineSpec;
      const geometry = buildOutline(outlineSpec);
      const tail = importedFinTailFromOutline(geometry);
      const expectedPoints = outlineFixture.templateValues.tailGeom.points;
      expect(tail.points.length).toBe(expectedPoints.length);
      tail.points.forEach((p, i) => {
        const [expectedStation, expectedHalfWidth] = expectedPoints[i];
        expectCloseIn(mmToInches(p.y), expectedStation);
        expectCloseIn(mmToInches(p.x), expectedHalfWidth);
      });
      expectCloseIn(mmToInches(tail.podStation), outlineFixture.templateValues.tailGeom.podY);
    });
  }
});

describe("tailHalfWidthAt / tailOffTailAtHalfWidth follow the real drawn tail", () => {
  for (const [name, outlineFixture] of importedOutlineEntries) {
    it(`outline: ${name}`, () => {
      const outlineSpec = outlineFixture.outlineSpec as unknown as OutlineSpec;
      const geometry = buildOutline(outlineSpec);
      const tail = importedFinTailFromOutline(geometry);
      const shape = outlineFixture.templateValues.tailShape;
      const w12 = inchesToMm(outlineFixture.templateValues.w12);

      for (const probe of outlineFixture.halfWidthProbes) {
        const actual = tailHalfWidthAt(shape, w12, inchesToMm(probe.y), tail);
        expectCloseIn(mmToInches(actual), probe.halfWidth);
      }
      for (const probe of outlineFixture.offTailProbes) {
        const actual = tailOffTailAtHalfWidth(shape, w12, inchesToMm(probe.targetHw), tail);
        expectCloseIn(mmToInches(actual), probe.offTail);
      }
    });
  }
});

describe("computeFinPlacement imported-template golden parity", () => {
  for (const [name, caseFixture] of importedCaseEntries) {
    describe(`case: ${name}`, () => {
      const outlineFixture = importedOutlines[caseFixture.outline];
      const outlineSpec = outlineFixture.outlineSpec as unknown as OutlineSpec;
      const geometry = buildOutline(outlineSpec);
      const tail = importedFinTailFromOutline(geometry);
      const spec = toSpec(caseFixture.state);
      const result = computeFinPlacement(spec, tail);

      it("the fixture's state is the store's effectiveFins (boardLength/tailWidth12 come from the outline)", () => {
        expectCloseIn(spec.boardLength, outlineSpec.length, 1e-9);
        expectCloseIn(spec.tailWidth12, buildOutline(outlineSpec).tailWidthAt12in, 1e-9);
      });

      it("matches fin mark count and per-mark off-tail/lateral/leading off-tail/leading lateral", () => {
        const goldenMarks = caseFixture.marksInches;
        expect(result.marks.length).toBe(goldenMarks.length);
        result.marks.forEach((mark, i) => {
          const g = goldenMarks[i];
          expectCloseIn(mmToInches(mark.offTail), g.teOffTail);
          expectCloseIn(mmToInches(mark.lateral), g.teLateral);
          expectCloseIn(mmToInches(mark.leadingOffTail), g.leOffTail);
          expectCloseIn(mmToInches(mark.leadingLateral), g.leLateral);
        });
      });

      it("matches summarySections structurally and by formatted value, including Full Spread", () => {
        const goldenSections = caseFixture.vals.summarySections;
        expect(result.sections.length).toBe(goldenSections.length);
        result.sections.forEach((sec, si) => {
          const gs = goldenSections[si];
          expect(sec.label).toBe(gs.label);
          expect(sec.groups.length).toBe(gs.groups.length);
          sec.groups.forEach((grp, gi) => {
            const gg = gs.groups[gi];
            expect(grp.heading).toBe(gg.heading);
            expect(grp.rows.length).toBe(gg.rows.length);
            grp.rows.forEach((row, ri) => {
              const gr = gg.rows[ri];
              expect(row.label).toBe(gr.label);
              expect(formatInchesFraction(row.value, 16)).toBe(gr.value);
            });
            if (gg.fullSpreadNote != null) {
              expect(grp.fullSpread).not.toBeNull();
              expect(formatInchesFraction(grp.fullSpread as Mm, 16)).toBe(gg.fullSpreadNote);
            } else {
              expect(grp.fullSpread).toBeNull();
            }
          });
        });
      });

      it("matches modelHeader, isModified and legend", () => {
        expect(result.modelHeader).toBe(caseFixture.vals.modelHeader);
        expect(result.isModified).toBe(caseFixture.vals.isModified);

        const goldenLegend = caseFixture.vals.legendBaseLens;
        expect(result.legend.length).toBe(goldenLegend.length);
        result.legend.forEach((entry, i) => {
          const g = goldenLegend[i];
          expect(entry.label).toBe(g.label);
          expect(entry.dash).toBe(g.dasharray);
          expect(formatInchesFraction(entry.baseLength, 16)).toBe(g.value);
        });
      });

      it("matches resolved display values", () => {
        const v = caseFixture.vals;
        expect(formatInchesFraction(result.resolved.centerOffTail, 16)).toBe(v.centerFinalDisplay);
        expect(formatInchesFraction(result.resolved.forwardToe, 16)).toBe(v.forwardToeDisplay);
        expect(formatInchesFraction(result.resolved.rearToe, 16)).toBe(v.rearToeDisplay);
        expect(formatInchesFraction(result.resolved.quadRearOffRail, 16)).toBe(v.quadRearOffRailDisplayValue);
        expectCloseIn(mmToInches(result.resolved.quadRearOffTailBase), v.quadRearOffTailInputValue as number);

        const isTwoPlusOne = spec.finSetup === "2plus1";
        const isTwin = spec.finSetup === "twin";
        const frontFinalMm = isTwoPlusOne
          ? result.resolved.sideOffTail
          : isTwin
            ? result.resolved.twinOffTail
            : result.resolved.frontOffTail;
        expect(formatInchesFraction(frontFinalMm, 16)).toBe(v.frontFinalDisplay);

        const isQuad = spec.finSetup === "quad";
        const pairFinalMm = isQuad
          ? result.resolved.rearOffTail
          : isTwoPlusOne
            ? result.resolved.sideOffTail
            : result.resolved.frontOffTail;
        expect(formatInchesFraction(pairFinalMm, 16)).toBe(v.pairFinalDisplay);
      });
    });
  }
});

describe("with no imported tail, output is unchanged (the standalone calculator)", () => {
  for (const [name, fixture] of fallbackEntries) {
    it(`fixture: ${name} — null and an empty tail both match the fallback-only call`, () => {
      const spec = toSpec(fixture.state);
      const baseline = computeFinPlacement(spec);
      const withNull = computeFinPlacement(spec, null);
      const withEmpty = computeFinPlacement(spec, { points: [], podStation: mm(0) });
      expect(withNull).toEqual(baseline);
      expect(withEmpty).toEqual(baseline);
    });
  }
});

describe("no written fin number moves with the real tail", () => {
  for (const [name, caseFixture] of importedCaseEntries) {
    it(`case: ${name} — sections deep-equal with and without the real tail`, () => {
      const outlineFixture = importedOutlines[caseFixture.outline];
      const outlineSpec = outlineFixture.outlineSpec as unknown as OutlineSpec;
      const tail = importedFinTailFromOutline(buildOutline(outlineSpec));
      const spec = toSpec(caseFixture.state);
      const withTail = computeFinPlacement(spec, tail);
      const withoutTail = computeFinPlacement(spec);
      expect(withTail.sections).toEqual(withoutTail.sections);
    });
  }
});

describe("the change is real, not vacuous", () => {
  it("preset-fish and preset-mid-length each move at least one rail-referenced mark by more than 0.1in", () => {
    for (const caseName of ["preset-fish", "preset-mid-length"]) {
      const caseFixture = importedCases[caseName];
      const outlineFixture = importedOutlines[caseFixture.outline];
      const outlineSpec = outlineFixture.outlineSpec as unknown as OutlineSpec;
      const tail = importedFinTailFromOutline(buildOutline(outlineSpec));
      const spec = toSpec(caseFixture.state);
      const withTail = computeFinPlacement(spec, tail);
      const withoutTail = computeFinPlacement(spec);
      const moved = withTail.marks.some(
        (markWithTail, i) =>
          markWithTail.lateralKind === "rail" &&
          Math.abs(mmToInches(markWithTail.lateral) - mmToInches(withoutTail.marks[i].lateral)) > 0.1,
      );
      expect(moved).toBe(true);
    }
  });
});
