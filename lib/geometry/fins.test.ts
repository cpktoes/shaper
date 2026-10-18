import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  MIN_MCKEE_LONGBOARD_QUAD_LENGTH,
  OFF_RAIL_TUNER_STEP_IN,
  computeFinPlacement,
  defaultCenterBaseLength,
  effectiveQuadRearModel,
  finRoundingGrain,
  finRoundingNote,
  fullSpreadRoundingAside,
  forwardFinsHeading,
  importedFinTailFromOutline,
  isQuadRearModelAvailable,
  offRailTunerRangeIn,
  offRailTunerWindow,
  resetAdvanced,
  toeAimTableFor,
  type FinAdvancedSpec,
  type FinPlacementSpec,
  type FinSetup,
  type FinTailShape,
  type QuadRearModel,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "./fins";
import { formatInchesFraction, inchesToMm, mm, type Mm, mmToInches, parseImperial, parseMetric } from "./units";
import { formatDim, formatDimBare, formatMark, formatMarkBare, measureSlider } from "./measure-display";
import { TOE_AIM_TABLE, TOE_AIM_TABLE_COLUMNS } from "./toe-aim-tables";
import golden from "./__fixtures__/prototype-fins-golden.json";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { deriveEffectiveFins } from "./design";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { wingFootprint, wingStepShare, type Wing } from "./wings";

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
    // The prototype has no off-rail tuner, so no golden state carries one: both sit at zero.
    forwardOffRailNudge: mm(0),
    rearOffRailNudge: mm(0),
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

const goldenEntries = Object.entries(golden) as [string, (typeof golden)[keyof typeof golden]][];

describe("computeFinPlacement golden parity", () => {
  for (const [name, fixture] of goldenEntries) {
    describe(`fixture: ${name}`, () => {
      const spec = toSpec(fixture.state as GoldenState);
      const result = computeFinPlacement(spec);

      it("matches fin mark count and per-mark off-tail/lateral/leading off-tail/leading lateral", () => {
        const goldenMarks = fixture.marksInches as {
          teOffTail: number;
          teLateral: number;
          leOffTail: number;
          leLateral: number;
        }[];
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
        const goldenSections = fixture.vals.summarySections as {
          label: string;
          groups: {
            heading: string;
            rows: { label: string; value: string }[];
            fullSpreadNote?: string;
          }[];
        }[];
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
        expect(result.modelHeader).toBe(fixture.vals.modelHeader);
        expect(result.isModified).toBe(fixture.vals.isModified);

        const goldenLegend = fixture.vals.legendBaseLens as { label: string; value: string; dasharray: string }[];
        expect(result.legend.length).toBe(goldenLegend.length);
        result.legend.forEach((entry, i) => {
          const g = goldenLegend[i];
          expect(entry.label).toBe(g.label);
          expect(entry.dash).toBe(g.dasharray);
          expect(formatInchesFraction(entry.baseLength, 16)).toBe(g.value);
        });
      });

      it("matches every flag", () => {
        const v = fixture.vals;
        expect(result.flags.hasCenterSection).toBe(v.hasCenterSection);
        expect(result.flags.hasForwardSection).toBe(v.hasForwardSection);
        expect(result.flags.hasRearSection).toBe(v.hasRearSection);
        expect(result.flags.quadCenterFinAvailable).toBe(v.quadCenterFinAvailable);
        expect(result.flags.isLongboardQuad).toBe(v.isLongboardQuad);
        expect(result.flags.showFrontToeTableLink).toBe(v.showFrontToeTableLink);
        expect(result.flags.showRearToeTableLink).toBe(v.showRearToeTableLink);
        expect(result.flags.showRearOffRailSlider).toBe(v.showRearOffRailSlider);
        expect(result.flags.showRearOffTailOverride).toBe(v.showRearOffTailOverride);
        expect(result.flags.centerSectionLabel).toBe(v.centerSectionLabel);
        expect(result.flags.forwardSectionLabel).toBe(v.forwardSectionLabel);
        expect(result.flags.rearSectionLabel).toBe(v.rearSectionLabel);
        expect(result.flags.centerBaseLenFieldLabel).toBe(v.centerBaseLenFieldLabel);
      });

      it("matches resolved display values", () => {
        const v = fixture.vals;
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
        const pairFinalMm = isQuad ? result.resolved.rearOffTail : isTwoPlusOne ? result.resolved.sideOffTail : result.resolved.frontOffTail;
        expect(formatInchesFraction(pairFinalMm, 16)).toBe(v.pairFinalDisplay);
      });

      if (fixture.vals.toeTable) {
        it("matches the golden toe-in aim table view", () => {
          // Imperial: toeAimTableFor now returns display-ready strings, so a golden numeric
          // value is compared against its own stringified form rather than the raw number.
          const view = toeAimTableFor(spec.boardLength, spec.tailWidth12, "imperial");
          const goldenTable = fixture.vals.toeTable as {
            cols: { value: number; hiStyle: string }[];
            rowLabel: string;
            front: { value: number; hiStyle: string }[];
            rear: { value: number; hiStyle: string }[];
          };
          expect(view.rowLabel).toBe(goldenTable.rowLabel);
          expect(view.columns).toEqual(goldenTable.cols.map((c) => String(c.value)));
          expect(view.front).toEqual(goldenTable.front.map((c) => String(c.value)));
          expect(view.rear).toEqual(goldenTable.rear.map((c) => String(c.value)));
          const expectedHighlight = goldenTable.cols.findIndex((c) => c.hiStyle.includes("var(--accent)"));
          expect(view.highlightIndex).toBe(expectedHighlight);
        });
      }
    });
  }
});

describe("pinned default-state reference values", () => {
  it("reproduces the prototype's default 6'0\" x 13\" squash thruster placement", () => {
    const result = computeFinPlacement(DEFAULT_FIN_PLACEMENT_SPEC);
    expect(formatInchesFraction(result.resolved.frontOffTail, 16)).toBe('11"');
    expect(formatInchesFraction(result.resolved.centerOffTail, 16)).toBe('3 5/16"');
    expect(formatInchesFraction(result.resolved.frontOffRail, 16)).toBe('1 3/16"');
    expect(formatInchesFraction(result.resolved.forwardToe, 16)).toBe('3/8"');
  });
});

describe("narrow-tail shift boundary", () => {
  it("fires at exactly 12.5in and not at 12.625in — the 12.5in board's cluster sits further forward (larger off-tail)", () => {
    const at125 = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      tailWidth12: inchesToMm(12.5),
    });
    const at12625 = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      tailWidth12: inchesToMm(12.625),
    });
    expect(mmToInches(at125.resolved.frontOffTail)).toBeGreaterThan(mmToInches(at12625.resolved.frontOffTail));
  });
});

describe("pintail quad rear shift", () => {
  it("moves the rear pair 3/16in further off the tail than the same board with a squash tail", () => {
    const squashSpec: FinPlacementSpec = {
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      finSetup: "quad",
      quadRearModel: "mckeeSB",
      tailShape: "squash",
    };
    const pinSpec: FinPlacementSpec = { ...squashSpec, tailShape: "pin" };
    const squashResult = computeFinPlacement(squashSpec);
    const pinResult = computeFinPlacement(pinSpec);
    expectCloseIn(
      mmToInches(pinResult.resolved.rearOffTail) - mmToInches(squashResult.resolved.rearOffTail),
      0.1875,
    );
  });
});

describe("defaultCenterBaseLength", () => {
  it("returns 10.5in for single and 2plus1, 4.5in for everything else", () => {
    expectCloseIn(mmToInches(defaultCenterBaseLength("single")), 10.5);
    expectCloseIn(mmToInches(defaultCenterBaseLength("2plus1")), 10.5);
    expectCloseIn(mmToInches(defaultCenterBaseLength("twin")), 4.5);
    expectCloseIn(mmToInches(defaultCenterBaseLength("thruster")), 4.5);
    expectCloseIn(mmToInches(defaultCenterBaseLength("quad")), 4.5);
  });
});

describe("resetAdvanced", () => {
  const setups: FinSetup[] = ["single", "twin", "thruster", "2plus1", "quad"];
  for (const setup of setups) {
    it(`clears every override for ${setup}`, () => {
      const advanced = resetAdvanced(setup);
      expect(advanced.baseLenForwardOverridden).toBe(false);
      expect(advanced.baseLenRearOverridden).toBe(false);
      expect(advanced.baseLenCenterOverridden).toBe(false);
      expect(advanced.forwardToeOverride).toBeNull();
      expect(advanced.rearToeOverride).toBeNull();
      expect(advanced.quadRearOffRailOverride).toBeNull();
      expect(advanced.quadRearOffTailOverride).toBeNull();
      expect(advanced.quadRearOffTailOverridden).toBe(false);
      expectCloseIn(mmToInches(advanced.centerPositionOffset), 0);
      expectCloseIn(mmToInches(advanced.forwardPositionOffset), 0);
      expectCloseIn(mmToInches(advanced.rearPositionOffset), 0);
      expectCloseIn(mmToInches(advanced.baseLenForward), 4.5);
      expectCloseIn(mmToInches(advanced.baseLenRear), 4.5);
      const expectedCenter = setup === "single" || setup === "2plus1" ? 10.5 : 4.5;
      expectCloseIn(mmToInches(advanced.baseLenCenter), expectedCenter);
    });
  }
});

describe("toeAimTableFor row selection", () => {
  // Below 60in the table has no row of its own — the label reads the raw rounded length (a
  // faithfully-ported prototype quirk, not a bug: see toeTableData, Fins.dc.html lines 957-968)
  // while the row VALUES still fall back to the '72+' data via `table[rowKey] ?? table['72+']`.
  it.each([
    [59, "59"],
    [60, "60"],
    [71, "71"],
    [72, "72+"],
    [120, "72+"],
  ])("board length %iin selects row %s", (lengthIn, expectedRow) => {
    const view = toeAimTableFor(inchesToMm(lengthIn), inchesToMm(13), "imperial");
    expect(view.rowLabel).toBe(expectedRow);
  });

  it("falls back to the 72+ row's values when the length is below the table's own rows", () => {
    const below = toeAimTableFor(inchesToMm(59), inchesToMm(13), "imperial");
    const at72 = toeAimTableFor(inchesToMm(72), inchesToMm(13), "imperial");
    expect(below.front).toEqual(at72.front);
    expect(below.rear).toEqual(at72.rear);
  });
});

describe("toe-aim-tables row-length consistency", () => {
  it("every front and rear row has the same length as TOE_AIM_TABLE_COLUMNS", () => {
    for (const row of Object.values(TOE_AIM_TABLE.front)) {
      expect(row.length).toBe(TOE_AIM_TABLE_COLUMNS.length);
    }
    for (const row of Object.values(TOE_AIM_TABLE.rear)) {
      expect(row.length).toBe(TOE_AIM_TABLE_COLUMNS.length);
    }
  });
});

describe("McKee Longboard quad model needs an eight-foot board", () => {
  const OTHER_QUAD_REAR_MODELS: QuadRearModel[] = ["basic", "basicOffRail", "mckeeSB"];
  const LENGTHS_TRIED_IN = [60, 90, 96, 120];

  function quadSpec(overrides: Partial<FinPlacementSpec>): FinPlacementSpec {
    return { ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "quad", ...overrides };
  }

  describe("the rule on its own", () => {
    it("the eight-foot cutoff constant equals inchesToMm(96)", () => {
      expect(MIN_MCKEE_LONGBOARD_QUAD_LENGTH).toBe(inchesToMm(96));
    });

    it('the longboard model is unavailable at 7\'6" and at one sixteenth under the cutoff', () => {
      expect(isQuadRearModelAvailable("mckeeLB", inchesToMm(90))).toBe(false);
      expect(isQuadRearModelAvailable("mckeeLB", inchesToMm(95.9375))).toBe(false);
    });

    it("the longboard model IS available at exactly 96in, and at 108in", () => {
      expect(isQuadRearModelAvailable("mckeeLB", inchesToMm(96))).toBe(true);
      expect(isQuadRearModelAvailable("mckeeLB", inchesToMm(108))).toBe(true);
    });

    it.each(OTHER_QUAD_REAR_MODELS)("%s is available at every length tried", (model) => {
      for (const lengthIn of LENGTHS_TRIED_IN) {
        expect(isQuadRearModelAvailable(model, inchesToMm(lengthIn))).toBe(true);
      }
    });

    it("resolves the longboard model to McKee SB/Gun at 90in, and returns it unchanged at 96in", () => {
      expect(effectiveQuadRearModel("mckeeLB", inchesToMm(90))).toBe("mckeeSB");
      expect(effectiveQuadRearModel("mckeeLB", inchesToMm(96))).toBe("mckeeLB");
    });

    it.each(OTHER_QUAD_REAR_MODELS)("%s resolves to itself at every length tried", (model) => {
      for (const lengthIn of LENGTHS_TRIED_IN) {
        expect(effectiveQuadRearModel(model, inchesToMm(lengthIn))).toBe(model);
      }
    });
  });

  describe("the fallback, through the public engine", () => {
    it('a 7\'6" board storing the longboard model produces the SAME resolved numbers as the same board storing McKee SB/Gun', () => {
      const fallenBack = computeFinPlacement(quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeLB" }));
      const trueSbGun = computeFinPlacement(quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeSB" }));

      expectCloseIn(mmToInches(fallenBack.resolved.frontOffTail), mmToInches(trueSbGun.resolved.frontOffTail));
      expectCloseIn(mmToInches(fallenBack.resolved.rearOffTail), mmToInches(trueSbGun.resolved.rearOffTail));
      expectCloseIn(mmToInches(fallenBack.resolved.rearHalfSpread), mmToInches(trueSbGun.resolved.rearHalfSpread));
      expectCloseIn(mmToInches(fallenBack.resolved.rearToe), mmToInches(trueSbGun.resolved.rearToe));
      expectCloseIn(mmToInches(fallenBack.resolved.quadRearOffRail), mmToInches(trueSbGun.resolved.quadRearOffRail));
      expect(fallenBack.modelHeader).toBe(trueSbGun.modelHeader);
      expect(fallenBack.marks.length).toBe(trueSbGun.marks.length);
    });

    it('the same 7\'6" spec does NOT match the numbers the longboard formulas would have given', () => {
      const fallenBack = computeFinPlacement(quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeLB" }));
      const trueLongboard = computeFinPlacement(quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeLB" }));

      expect(
        Math.abs(mmToInches(fallenBack.resolved.rearOffTail) - mmToInches(trueLongboard.resolved.rearOffTail)),
      ).toBeGreaterThan(0.1);
    });

    it('an 8\'0" board storing the longboard model keeps the longboard numbers', () => {
      const onLongboard = computeFinPlacement(quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeLB" }));
      const onSbGun = computeFinPlacement(quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeSB" }));

      expect(
        Math.abs(mmToInches(onLongboard.resolved.rearOffTail) - mmToInches(onSbGun.resolved.rearOffTail)),
      ).toBeGreaterThan(0.01);
      expect(onLongboard.modelHeader).toContain("Longboard");
    });

    it("flags.isLongboardQuad is false at 7'6\" with the longboard model stored, and true at 8'0\"", () => {
      const short = computeFinPlacement(quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeLB" }));
      const long = computeFinPlacement(quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeLB" }));
      expect(short.flags.isLongboardQuad).toBe(false);
      expect(long.flags.isLongboardQuad).toBe(true);
    });

    it("flags.quadCenterFinAvailable is true at 7'6\" with the longboard model stored, and false at 8'0\"", () => {
      const short = computeFinPlacement(quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeLB" }));
      const long = computeFinPlacement(quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeLB" }));
      expect(short.flags.quadCenterFinAvailable).toBe(true);
      expect(long.flags.quadCenterFinAvailable).toBe(false);
    });

    it("with quadCenterFinOn true and the longboard model stored at 7'6\", the fifth fin really is produced", () => {
      const shortLongboard = computeFinPlacement(
        quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeLB", quadCenterFinOn: true }),
      );
      const shortSbGun = computeFinPlacement(
        quadSpec({ boardLength: inchesToMm(90), quadRearModel: "mckeeSB", quadCenterFinOn: true }),
      );
      expect(shortLongboard.marks.filter((m) => m.role === "center").length).toBe(1);
      expect(shortLongboard.marks.filter((m) => m.role === "center").length).toBe(
        shortSbGun.marks.filter((m) => m.role === "center").length,
      );

      const longAtEightFeet = computeFinPlacement(
        quadSpec({ boardLength: inchesToMm(96), quadRearModel: "mckeeLB", quadCenterFinOn: true }),
      );
      expect(longAtEightFeet.marks.filter((m) => m.role === "center").length).toBe(0);
    });
  });
});

describe("FinSummaryRow.family and FinSummaryGroup.fullSpreadFamily (every DATA-tab row is mark, superseding D-01 for fin placement per 2026-09-05 UAT gaps G-06-12/G-06-15)", () => {
  it("thruster: every row (Off-Tail included, alongside Off-Rail, Toe-In, Fin Base/Box Length) is mark", () => {
    const result = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "thruster" });
    let sawOffTail = false;
    for (const section of result.sections) {
      for (const group of section.groups) {
        for (const row of group.rows) {
          if (row.label === "Off-Tail") sawOffTail = true;
          expect(row.family).toBe("mark");
        }
      }
    }
    expect(sawOffTail).toBe(true);
  });

  it("quad (McKee SB/Gun rear): the rear pair's Off-Tail, Off-Stringer and Toe-In rows are all mark", () => {
    const result = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      finSetup: "quad",
      quadRearModel: "mckeeSB",
    });
    const rearSection = result.sections.find((s) => s.label === "Rear Fins");
    expect(rearSection).toBeDefined();
    const trailing = rearSection!.groups.find((g) => g.heading === "Trailing Edge")!;
    const leading = rearSection!.groups.find((g) => g.heading === "Leading Edge")!;
    const offTailRow = trailing.rows.find((r) => r.label === "Off-Tail")!;
    const offStringerRow = trailing.rows.find((r) => r.label === "Off-Stringer (1/2 Spread)")!;
    const toeRow = leading.rows.find((r) => r.label === "Toe-In")!;
    expect(offTailRow.family).toBe("mark");
    expect(offStringerRow.family).toBe("mark");
    expect(toeRow.family).toBe("mark");
  });

  it("quad rear's Off-Tail stays mark even under the Basic-Off-Rail model, whose row label switches to Off-Rail", () => {
    const result = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      finSetup: "quad",
      quadRearModel: "basicOffRail",
    });
    const rearSection = result.sections.find((s) => s.label === "Rear Fins")!;
    const trailing = rearSection.groups.find((g) => g.heading === "Trailing Edge")!;
    const offTailRow = trailing.rows.find((r) => r.label === "Off-Tail")!;
    const offRailRow = trailing.rows.find((r) => r.label === "Off-Rail")!;
    expect(offTailRow.family).toBe("mark");
    expect(offRailRow.family).toBe("mark");
  });

  it("every group with a non-null fullSpread has a non-null fullSpreadFamily of 'mark'; every null-fullSpread group has a null fullSpreadFamily", () => {
    const result = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      finSetup: "quad",
      quadRearModel: "mckeeSB",
    });
    let sawNonNullFullSpread = false;
    for (const section of result.sections) {
      for (const group of section.groups) {
        if (group.fullSpread !== null) {
          sawNonNullFullSpread = true;
          expect(group.fullSpreadFamily).toBe("mark");
        } else {
          expect(group.fullSpreadFamily).toBeNull();
        }
      }
    }
    expect(sawNonNullFullSpread).toBe(true);
  });

  it("the Basic-Off-Rail quad rear model has no Full Spread line, so its group's fullSpreadFamily is null too", () => {
    const result = computeFinPlacement({
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      finSetup: "quad",
      quadRearModel: "basicOffRail",
    });
    const rearSection = result.sections.find((s) => s.label === "Rear Fins")!;
    const trailing = rearSection.groups.find((g) => g.heading === "Trailing Edge")!;
    expect(trailing.fullSpread).toBeNull();
    expect(trailing.fullSpreadFamily).toBeNull();
  });

  it("re-tagging an off-tail row from dim to mark cannot move its Imperial string, because formatMark and formatDim both call formatInchesFraction on the imperial branch", () => {
    const result = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "thruster" });
    expect(formatMark(result.resolved.frontOffTail, "imperial")).toBe(formatDim(result.resolved.frontOffTail, "imperial"));
  });
});

describe("toeAimTableFor is system-aware (D-01, D-10)", () => {
  // A 6'0" board with a 13in tail width @12" — same board as DEFAULT_FIN_PLACEMENT_SPEC — lands
  // on the open-ended "72+" row and highlights column index 9 (13in is TOE_AIM_TABLE_COLUMNS[9]).
  const boardLength = inchesToMm(72);
  const tailWidth12 = inchesToMm(13);

  it("imperial: every returned string is today's raw inch number stringified, and the row label is the bare key", () => {
    const view = toeAimTableFor(boardLength, tailWidth12, "imperial");
    expect(view.columns).toEqual(TOE_AIM_TABLE_COLUMNS.map((c) => String(c)));
    expect(view.front).toEqual(TOE_AIM_TABLE.front["72+"].map((v) => String(v)));
    expect(view.rear).toEqual(TOE_AIM_TABLE.rear["72+"].map((v) => String(v)));
    expect(view.rowLabel).toBe("72+");
    expect(view.identicalFromLabel).toBe('72"');
  });

  it("metric: columns and the row label are one-decimal centimetres (board dims), while front/rear cells are whole millimetres (aim-distance marks) — both derived from the same inch table constant", () => {
    const view = toeAimTableFor(boardLength, tailWidth12, "metric");
    // Provenance: every expected metric value below is the SAME inch number the imperial
    // assertion above reads off TOE_AIM_TABLE_COLUMNS/TOE_AIM_TABLE — columns/rowLabel/
    // identicalFromLabel run through inchesToMm -> formatDimBare/formatDim("metric") (board
    // dims), front/rear cells run through inchesToMm -> formatMarkBare("metric") (aim-distance
    // marks) — never a hand-transcribed figure either way.
    expect(view.columns).toEqual(TOE_AIM_TABLE_COLUMNS.map((c) => formatDimBare(inchesToMm(c), "metric")));
    expect(view.front).toEqual(TOE_AIM_TABLE.front["72+"].map((v) => formatMarkBare(inchesToMm(v), "metric")));
    expect(view.rear).toEqual(TOE_AIM_TABLE.rear["72+"].map((v) => formatMarkBare(inchesToMm(v), "metric")));
    // rowLabel "72+" -> the honest cm conversion of 72in, with the trailing "+" preserved.
    expect(view.rowLabel).toBe(`${formatDimBare(inchesToMm(72), "metric")}+`);
    expect(view.identicalFromLabel).toBe(formatDim(inchesToMm(72), "metric"));
  });

  it("metric: a row key with no '+' (a board under 60in) converts without adding one", () => {
    const view = toeAimTableFor(inchesToMm(59), tailWidth12, "metric");
    expect(view.rowLabel).toBe(formatDimBare(inchesToMm(59), "metric"));
  });

  it("highlightIndex is identical in both systems for the same board", () => {
    const imperial = toeAimTableFor(boardLength, tailWidth12, "imperial");
    const metric = toeAimTableFor(boardLength, tailWidth12, "metric");
    expect(imperial.highlightIndex).toBe(metric.highlightIndex);
    expect(imperial.highlightIndex).toBe(9);
  });
});

describe("finRoundingNote — the fin notes' rounding line in the shaper's own units (quick 260928-vpi)", () => {
  it('finRoundingNote("imperial") reads the em-dash sentence with a straight inch mark', () => {
    expect(finRoundingNote("imperial")).toBe(
      'All measurements round to the nearest 1/16" — expect a hair of play when routing to these numbers.',
    );
  });

  it('finRoundingNote("metric") reads the same sentence in whole millimetres', () => {
    expect(finRoundingNote("metric")).toBe(
      "All measurements round to the nearest millimetre — expect a hair of play when routing to these numbers.",
    );
  });

  it("finRoundingGrain names the grain per system, with no bracketed centimetre aside", () => {
    expect(finRoundingGrain("imperial")).toBe('1/16"');
    expect(finRoundingGrain("metric")).toBe("millimetre");
    expect(finRoundingGrain("imperial")).not.toMatch(/cm/);
    expect(finRoundingGrain("metric")).not.toMatch(/cm/);
  });

  it("fullSpreadRoundingAside names the same grain, per system, inside the Full Spread aside", () => {
    expect(fullSpreadRoundingAside("imperial")).toBe('(*Full spread may be >2x due to 1/16" rounding)');
    expect(fullSpreadRoundingAside("metric")).toBe("(*Full spread may be >2x due to millimetre rounding)");
    expect(fullSpreadRoundingAside("imperial")).toContain(finRoundingGrain("imperial"));
    expect(fullSpreadRoundingAside("metric")).toContain(finRoundingGrain("metric"));
  });

  it("every golden fixture's notes carry no rounding line and no 0.1 cm aside — the display layer appends it, not the geometry", () => {
    for (const [, fixture] of goldenEntries) {
      const spec = toSpec(fixture.state as GoldenState);
      const result = computeFinPlacement(spec);
      for (const note of result.notes) {
        expect(note).not.toMatch(/round to the nearest/);
        expect(note).not.toMatch(/0\.1 cm/);
      }
    }
  });

  it("both wordings are true of the printed fin numbers over every golden fixture: every mark row and full-spread value round-trips to a whole sixteenth (Imperial) and a whole millimetre (Metric)", () => {
    let checked = 0;
    for (const [, fixture] of goldenEntries) {
      const spec = toSpec(fixture.state as GoldenState);
      const result = computeFinPlacement(spec);
      const values: Mm[] = [];
      for (const section of result.sections) {
        for (const group of section.groups) {
          for (const row of group.rows) {
            if (row.family === "mark") values.push(row.value);
          }
          if (group.fullSpread !== null) values.push(group.fullSpread);
        }
      }
      for (const v of values) {
        const metricStr = formatMark(v, "metric");
        const metricMm = parseMetric(metricStr, "mm");
        expect(metricMm).not.toBeNull();
        expect(Number.isInteger(Math.round((metricMm as number) * 1e9) / 1e9)).toBe(true);

        const imperialStr = formatMark(v, "imperial");
        const imperialMm = parseImperial(imperialStr);
        expect(imperialMm).not.toBeNull();
        const sixteenths = mmToInches(imperialMm as Mm) * 16;
        expect(Math.abs(sixteenths - Math.round(sixteenths))).toBeLessThanOrEqual(1e-9);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("fins listen to the real rail beside them — wings (quick 261014-wii, D8, the founder's rule)", () => {
  // "Fins listen to the closest piece of physical rail next to them." With Import Template ticked
  // the fins are placed on the WINGED outline, exactly as on any drawn outline: the 12" width they
  // read is the winged one, and every in-from-the-rail is the real rail at the fin's own station.
  // Every expected value is worked out through the app's own wing and fin functions.
  const OUTLINE = DEFAULT_BOARD_SPEC.outline;
  const FINS = DEFAULT_FIN_PLACEMENT_SPEC;

  function place(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true) {
    const g = buildOutline(outline);
    return computeFinPlacement(
      deriveEffectiveFins(fins, importTemplate, outline, g),
      importTemplate ? importedFinTailFromOutline(g) : null,
    );
  }

  function wingAt(station: number): Wing {
    return {
      station: mm(station),
      depth: inchesToMm(3 / 8),
      run: inchesToMm(1 / 4),
      radius: mm(0),
      lock: null,
      finOffset: mm(0),
    };
  }

  const bare = place(OUTLINE, FINS);
  const front = bare.marks.find((m) => m.role === "front")!;

  it("a wing ahead of the front fin moves it inboard by exactly the depth taken at its station", () => {
    const wing = wingAt(front.offTail + inchesToMm(1));
    const winged = place({ ...OUTLINE, wings: [wing] }, FINS);
    const moved = winged.marks.find((m) => m.role === "front" && m.side === front.side)!;
    const g = buildOutline(OUTLINE);
    const inner = wingFootprint(wing).inner;
    const fade = Math.min(1, Math.max(0, (front.offTail - g.tailPodStation) / (inner - g.tailPodStation)));
    const take = wing.depth * wingStepShare(wing, front.offTail) * fade;
    // Inboard: toward the stringer, whichever side the fin is on.
    const inboard = (a: number, b: number) => Math.abs(a) - Math.abs(b);
    expect(Math.abs(inboard(moved.lateral, front.lateral) + take)).toBeLessThan(1e-6);
    expect(moved.offTail).toBe(front.offTail);
    // The leading mark moves the same, so the toe rule holds.
    expect(
      Math.abs(inboard(moved.leadingLateral, front.leadingLateral) - inboard(moved.lateral, front.lateral)),
    ).toBeLessThan(1e-9);
  });

  it("a wing AT the front fin's trailing edge leaves its trailing mark on the wider rail", () => {
    const wing = wingAt(front.offTail);
    const winged = place({ ...OUTLINE, wings: [wing] }, FINS);
    const moved = winged.marks.find((m) => m.role === "front" && m.side === front.side)!;
    const shift = Math.abs(moved.lateral) - Math.abs(front.lateral);
    // Measured 0.0103 mm: the rail is now read from an exact sample at the step, not a chord.
    expect(Math.abs(shift)).toBeLessThan(0.02);
    expect(shift).toBeGreaterThan(-wing.depth / 2);
  });

  it("a quad's rear spread reads the winged 12-inch width when a wing crosses the 12-inch station", () => {
    const quad: FinPlacementSpec = { ...FINS, finSetup: "quad", quadRearModel: "mckeeSB" };
    const winged: OutlineSpec = { ...OUTLINE, wings: [wingAt(inchesToMm(15.5))] };
    const g0 = buildOutline(OUTLINE);
    const gW = buildOutline(winged);
    const effective = deriveEffectiveFins(quad, true, winged, gW);
    expect(effective.tailWidth12).toBe(gW.tailWidthAt12in);
    expect(gW.tailWidthAt12in).toBeLessThan(g0.tailWidthAt12in);

    const before = place(OUTLINE, quad).resolved.rearHalfSpread;
    const after = place(winged, quad).resolved.rearHalfSpread;
    expect(after).toBeLessThan(before);
    // Fed the no-wing width instead, the spread would not move: it is the winged width that moves it.
    const noWingWidth = computeFinPlacement(
      { ...effective, tailWidth12: g0.tailWidthAt12in },
      importedFinTailFromOutline(gW),
    ).resolved.rearHalfSpread;
    expect(noWingWidth).toBe(before);
  });

  it("with Import Template off a wing changes nothing — the standalone calculator never sees it", () => {
    const winged: OutlineSpec = { ...OUTLINE, wings: [wingAt(front.offTail + inchesToMm(1))] };
    expect(place(winged, FINS, false).marks).toEqual(place(OUTLINE, FINS, false).marks);
  });
});

describe("forwardFinsHeading — FINS Advanced names the Twin's block (quick 261017-sru)", () => {
  const twinTemplates: TwinTemplate[] = ["upright", "keel", "trailer"];

  it.each(twinTemplates)("a Twin (%s template) heads its block Forward Fins — Main Twins, though its section label is empty", (twinTemplate) => {
    const result = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "twin", twinTemplate });
    expect(result.flags.forwardSectionLabel).toBe("");
    expect(forwardFinsHeading("twin", result.flags.forwardSectionLabel)).toBe("Forward Fins — Main Twins");
  });

  it("the Twin's heading names the pair exactly as the twin result's own key and DATA group do", () => {
    const result = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "twin", twinTemplate: "upright" });
    const keyLabels = result.legend.map((l) => l.label);
    expect(keyLabels).toContain("Main Twins");
    expect(forwardFinsHeading("twin", "").endsWith("— Main Twins")).toBe(true);
    expect(result.sections.some((section) => section.label === "Front Fins (Main Twins)")).toBe(true);
  });

  it("Thruster, Quad and 2+1 read exactly as before", () => {
    const heading = (finSetup: FinSetup) =>
      forwardFinsHeading(finSetup, computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup }).flags.forwardSectionLabel);
    expect(heading("thruster")).toBe("Forward Fins — Front Pair");
    expect(heading("quad")).toBe("Forward Fins — Front Pair");
    expect(heading("2plus1")).toBe("Forward Fins — Side Bites");
  });
});

// ============================================================================================
// The Off-Rail fine tuner (quick 261018-dw6, the founder 2026-10-18, D-01..D-03 with D-02b)
// ============================================================================================

/** The same spec with some advanced fields changed. */
function withAdvanced(spec: FinPlacementSpec, patch: Partial<FinAdvancedSpec>): FinPlacementSpec {
  return { ...spec, advanced: { ...spec.advanced, ...patch } };
}

/** Every setup that has a forward or side pair, each model and template of it. */
function forwardPairSetups(): { name: string; spec: FinPlacementSpec }[] {
  const base = DEFAULT_FIN_PLACEMENT_SPEC;
  const out: { name: string; spec: FinPlacementSpec }[] = [];
  for (const frontModel of ["proportional", "basic", "mckeeSB", "mckeeGun"] as ThrusterFrontModel[]) {
    out.push({ name: `thruster ${frontModel}`, spec: { ...base, finSetup: "thruster", frontModel } });
  }
  for (const twinTemplate of ["upright", "keel", "trailer"] as TwinTemplate[]) {
    out.push({ name: `twin ${twinTemplate}`, spec: { ...base, finSetup: "twin", twinTemplate } });
  }
  out.push({ name: "2+1", spec: { ...base, finSetup: "2plus1" } });
  for (const quadRearModel of ["basic", "basicOffRail", "mckeeSB", "mckeeLB"] as QuadRearModel[]) {
    const boardLength = inchesToMm(quadRearModel === "mckeeLB" ? 100 : 72);
    out.push({ name: `quad ${quadRearModel}`, spec: { ...base, finSetup: "quad", quadRearModel, boardLength } });
  }
  out.push({
    name: "quad mckeeSB on a pin tail",
    spec: { ...base, finSetup: "quad", quadRearModel: "mckeeSB", tailShape: "pin" },
  });
  return out;
}

/** A preset's board as FINS reads it with Import Designed Board ticked (what deriveEffectiveFins does,
 * written out here so this suite leans on no other module's wiring). */
function importedPresetBoard(preset: (typeof BOARD_PRESETS)[number]) {
  const g = buildOutline(preset.outline);
  const spec: FinPlacementSpec = {
    ...preset.fins,
    boardLength: preset.outline.length,
    tailWidth12: g.tailWidthAt12in,
    tailShape: preset.outline.tail.kind,
  };
  return { spec, tail: importedFinTailFromOutline(g) };
}

describe("the Off-Rail tuner's window (D-02 for the front and side fins, D-02b for the stringer-placed quad rears)", () => {
  const win = (t: number, pair: "forward" | "rear") => {
    const w = offRailTunerWindow(inchesToMm(t), pair);
    return { min: mmToInches(w.min), max: mmToInches(w.max) };
  };

  it("front and side fins: a template inside 7/8\"-2\" gives exactly 7/8\" and 2\"", () => {
    for (const t of [1.125, 1.1875, 1.25, 1.3125]) {
      const w = win(t, "forward");
      expectCloseIn(w.min, 0.875);
      expectCloseIn(w.max, 2);
    }
  });

  it("front and side fins: a template past either end stretches the window to hold it", () => {
    expectCloseIn(win(2.5, "forward").max, 2.5);
    expectCloseIn(win(2.5, "forward").min, 0.875);
    expectCloseIn(win(0.6, "forward").min, 0.6);
    expectCloseIn(win(0.6, "forward").max, 2);
  });

  it("rear fins: 1/2\" either way from the template (2.17\" gives 1.67\" to 2.67\")", () => {
    const w = win(2.17, "rear");
    expectCloseIn(w.min, 1.67);
    expectCloseIn(w.max, 2.67);
  });

  it("rear fins: never closer than 7/8\" to the rail — 1.0\" gives 7/8\" to 1 1/2\"", () => {
    const w = win(1.0, "rear");
    expectCloseIn(w.min, 0.875);
    expectCloseIn(w.max, 1.5);
  });

  it("rear fins: a template under 7/8\" is itself the lower end (0.62\" gives 0.62\" to 1.12\")", () => {
    const w = win(0.62, "rear");
    expectCloseIn(w.min, 0.62);
    expectCloseIn(w.max, 1.12);
  });

  it("rear fins: exactly 7/8\" gives 7/8\" to 1 3/8\"; -1/2\" gives -1/2\" to 0", () => {
    const a = win(0.875, "rear");
    expectCloseIn(a.min, 0.875);
    expectCloseIn(a.max, 1.375);
    const b = win(-0.5, "rear");
    expectCloseIn(b.min, -0.5);
    expectCloseIn(b.max, 0);
  });

  it("both windows always contain the template, whatever it is", () => {
    for (let t = -1; t <= 6; t += 0.0375) {
      for (const pair of ["forward", "rear"] as const) {
        const w = win(t, pair);
        expect(w.min).toBeLessThanOrEqual(t + 1e-9);
        expect(w.max).toBeGreaterThanOrEqual(t - 1e-9);
      }
    }
  });
});

describe("the forward Off-Rail tuner moves the front, twin and side fins (D-01, D-03a)", () => {
  const EIGHTH = inchesToMm(0.125);
  type Result = ReturnType<typeof computeFinPlacement>;
  const front = (r: Result) => r.marks.filter((m) => m.role === "front");
  const offRailRow = (r: Result) =>
    r.sections.find((s) => s.label.startsWith("Front Fins"))!.groups[0].rows.find((row) => row.label === "Off-Rail")!;

  for (const { name, spec } of forwardPairSetups()) {
    describe(name, () => {
      const zero = computeFinPlacement(spec);

      it("at zero the fins sit on the template", () => {
        expect(zero.resolved.forwardOffRail).toBe(zero.resolved.forwardOffRailTemplate);
        expect(zero.resolved.forwardOffRailNudge).toBe(0);
        expect(zero.isModified).toBe(false);
      });

      it("a nudge of +1/8\" puts the fins 1/8\" further from the rail, everywhere it is shown", () => {
        const moved = computeFinPlacement(withAdvanced(spec, { forwardOffRailNudge: EIGHTH }));
        expectCloseIn(
          mmToInches(moved.resolved.forwardOffRail),
          mmToInches(moved.resolved.forwardOffRailTemplate) + 0.125,
        );
        expectCloseIn(mmToInches(moved.resolved.forwardOffRailNudge), 0.125);
        expectCloseIn(mmToInches(offRailRow(moved).value), mmToInches(moved.resolved.forwardOffRail));
        expect(front(moved).length).toBe(front(zero).length);
        front(moved).forEach((mark, i) => {
          const was = front(zero)[i];
          expectCloseIn(mmToInches(mark.lateralValue as Mm), mmToInches(moved.resolved.forwardOffRail));
          expectCloseIn(Math.abs(mmToInches(was.lateral)) - Math.abs(mmToInches(mark.lateral)), 0.125);
          expect(mark.offTail).toBe(was.offTail);
          expect(mark.toe).toBe(was.toe);
          expect(mark.baseLength).toBe(was.baseLength);
        });
        expect(moved.isModified).toBe(true);
      });

      it("a nudge of -1/8\" puts them 1/8\" closer to the rail", () => {
        const moved = computeFinPlacement(withAdvanced(spec, { forwardOffRailNudge: mm(-EIGHTH) }));
        front(moved).forEach((mark, i) => {
          const was = front(zero)[i];
          expectCloseIn(Math.abs(mmToInches(was.lateral)) - Math.abs(mmToInches(mark.lateral)), -0.125);
        });
      });

      it("is held at 7/8\" and 2\" from the rail however far it is pushed", () => {
        const closer = computeFinPlacement(withAdvanced(spec, { forwardOffRailNudge: inchesToMm(-2) }));
        const further = computeFinPlacement(withAdvanced(spec, { forwardOffRailNudge: inchesToMm(2) }));
        expectCloseIn(mmToInches(closer.resolved.forwardOffRail), 0.875);
        expectCloseIn(mmToInches(further.resolved.forwardOffRail), 2);
        expectCloseIn(
          mmToInches(closer.resolved.forwardOffRailNudge),
          0.875 - mmToInches(closer.resolved.forwardOffRailTemplate),
        );
        expectCloseIn(
          mmToInches(further.resolved.forwardOffRailNudge),
          2 - mmToInches(further.resolved.forwardOffRailTemplate),
        );
      });

      it("a crazy stored value never breaks the board", () => {
        const wild = computeFinPlacement(withAdvanced(spec, { forwardOffRailNudge: mm(1e12) }));
        expectCloseIn(mmToInches(wild.resolved.forwardOffRail), 2);
      });

      it("shows the tuner", () => {
        expect(zero.flags.showForwardOffRailTuner).toBe(true);
      });
    });
  }

  it("a single fin has no forward pair, so no tuner and no effect", () => {
    const single: FinPlacementSpec = { ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "single" };
    const zero = computeFinPlacement(single);
    const nudged = computeFinPlacement(withAdvanced(single, { forwardOffRailNudge: inchesToMm(0.5) }));
    expect(zero.flags.showForwardOffRailTuner).toBe(false);
    expect(nudged.marks).toEqual(zero.marks);
    expect(nudged.isModified).toBe(false);
  });

  it("the template figures are the ones the models state (thruster 1 1/8\" and 1 3/16\", twin and 2+1 1 1/4\")", () => {
    const at = (patch: Partial<FinPlacementSpec>) =>
      mmToInches(computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, ...patch }).resolved.forwardOffRailTemplate);
    expectCloseIn(at({ frontModel: "proportional" }), 1.125);
    expectCloseIn(at({ frontModel: "basic" }), 1.1875);
    expectCloseIn(at({ frontModel: "mckeeGun" }), 1.125);
    expectCloseIn(at({ finSetup: "twin" }), 1.25);
    expectCloseIn(at({ finSetup: "twin", twinTemplate: "keel" }), 1.25);
    expectCloseIn(at({ finSetup: "2plus1" }), 1.25);
    expectCloseIn(at({ finSetup: "quad", quadRearModel: "mckeeSB" }), 1.1875);
    expectCloseIn(at({ finSetup: "quad", quadRearModel: "mckeeSB", tailShape: "pin" }), 1.125);
    expectCloseIn(at({ finSetup: "quad", quadRearModel: "mckeeLB", boardLength: inchesToMm(100) }), 1.3125);
  });
});

describe("with both nudges at zero nothing about the fins changes (D-01)", () => {
  const SETUPS: FinSetup[] = ["single", "twin", "thruster", "2plus1", "quad"];
  const SHAPES: FinTailShape[] = ["pin", "round", "diamond", "squash", "swallow"];
  const MODELS: ThrusterFrontModel[] = ["proportional", "basic", "mckeeSB", "mckeeGun"];
  const QUADS: QuadRearModel[] = ["basic", "basicOffRail", "mckeeSB", "mckeeLB"];
  const TWINS: TwinTemplate[] = ["upright", "keel", "trailer"];

  it("the fins sit exactly on their template across every setup, model, tail shape and size", () => {
    let seen = 0;
    for (const finSetup of SETUPS) {
      for (const frontModel of MODELS) {
        for (const quadRearModel of QUADS) {
          for (const twinTemplate of TWINS) {
            for (const tailShape of SHAPES) {
              for (const L of [60, 72, 96, 120]) {
                for (const W of [11, 13, 15]) {
                  const spec: FinPlacementSpec = {
                    ...DEFAULT_FIN_PLACEMENT_SPEC,
                    finSetup,
                    frontModel,
                    quadRearModel,
                    twinTemplate,
                    tailShape,
                    boardLength: inchesToMm(L),
                    tailWidth12: inchesToMm(W),
                  };
                  const r = computeFinPlacement(spec);
                  expect(r.resolved.forwardOffRail).toBe(r.resolved.forwardOffRailTemplate);
                  expect(r.resolved.forwardOffRailNudge).toBe(0);
                  expect(r.resolved.rearOffRail).toBe(r.resolved.rearOffRailTemplate);
                  expect(r.resolved.rearOffRailNudge).toBe(0);
                  expect(r.isModified).toBe(false);
                  seen++;
                }
              }
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(5000);
  });

  it("and with a preset's own drawn tail imported", () => {
    for (const preset of BOARD_PRESETS) {
      const { spec, tail } = importedPresetBoard(preset);
      for (const finSetup of SETUPS) {
        const r = computeFinPlacement({ ...spec, finSetup }, tail);
        expect(r.resolved.forwardOffRail).toBe(r.resolved.forwardOffRailTemplate);
        expect(r.resolved.forwardOffRailNudge).toBe(0);
        // (A preset's captured offsets may already mark it Modified; the tuner at zero adds nothing.)
        expect(computeFinPlacement({ ...spec, finSetup }, tail).isModified).toBe(
          spec.advanced.forwardPositionOffset !== 0 ||
            spec.advanced.rearPositionOffset !== 0 ||
            spec.advanced.centerPositionOffset !== 0 ||
            spec.advanced.forwardToeOverride !== null ||
            spec.advanced.rearToeOverride !== null ||
            spec.advanced.quadRearOffTailOverridden ||
            spec.advanced.baseLenForwardOverridden ||
            spec.advanced.baseLenRearOverridden ||
            spec.advanced.baseLenCenterOverridden,
        );
      }
    }
  });

  it("every default carries both nudges at zero: the default spec, every reset and every preset", () => {
    expect(DEFAULT_FIN_PLACEMENT_SPEC.advanced.forwardOffRailNudge).toBe(0);
    expect(DEFAULT_FIN_PLACEMENT_SPEC.advanced.rearOffRailNudge).toBe(0);
    for (const setup of SETUPS) {
      expect(resetAdvanced(setup).forwardOffRailNudge).toBe(0);
      expect(resetAdvanced(setup).rearOffRailNudge).toBe(0);
    }
    for (const preset of BOARD_PRESETS) {
      expect(preset.fins.advanced.forwardOffRailNudge).toBe(0);
      expect(preset.fins.advanced.rearOffRailNudge).toBe(0);
    }
  });

  it("the tuner is offered on every setup that has a forward pair, and only those", () => {
    for (const finSetup of SETUPS) {
      const r = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup });
      expect(r.flags.showForwardOffRailTuner).toBe(finSetup !== "single");
    }
  });
});

describe("the Off-Rail slider's range (offRailTunerRangeIn through measureSlider)", () => {
  const SYSTEMS = ["imperial", "metric"] as const;
  const CASES: { pair: "forward" | "rear"; t: number }[] = [
    ...[1.125, 1.1875, 1.25, 1.3125, 0.62, 2.5].map((t) => ({ pair: "forward" as const, t })),
    ...[0.62, 1.0, 2.2135, 3.78].map((t) => ({ pair: "rear" as const, t })),
  ];
  /** What the engine does with a nudge: hold the result inside the pair's window. */
  const held = (t: number, nudge: Mm, pair: "forward" | "rear") => {
    const w = offRailTunerWindow(inchesToMm(t), pair);
    return Math.max(mmToInches(w.min), Math.min(mmToInches(w.max), t + mmToInches(nudge)));
  };
  const viewFor = (t: number, pair: "forward" | "rear", system: "imperial" | "metric") =>
    measureSlider(mm(0), offRailTunerRangeIn(inchesToMm(t), pair, system), OFF_RAIL_TUNER_STEP_IN, 1, system);

  for (const system of SYSTEMS) {
    for (const { pair, t } of CASES) {
      it(`${system}, ${pair} pair, template ${t}": zero sits on a step and both ends reach the window`, () => {
        const view = viewFor(t, pair, system);
        const stepsToZero = (0 - view.min) / view.step;
        expect(Math.abs(Math.round(stepsToZero) - stepsToZero)).toBeLessThan(1e-9);
        const stepsAcross = (view.max - view.min) / view.step;
        expect(Math.abs(Math.round(stepsAcross) - stepsAcross)).toBeLessThan(1e-9);
        const w = offRailTunerWindow(inchesToMm(t), pair);
        expectCloseIn(held(t, view.toMm(view.min), pair), mmToInches(w.min));
        expectCloseIn(held(t, view.toMm(view.max), pair), mmToInches(w.max));
        if (system === "metric") {
          for (let v = view.min; v <= view.max; v += view.step) {
            expect(Number.isInteger(view.toMm(v))).toBe(true);
          }
        }
      });
    }

    it(`${system}: the front window's ends print as the founder's figures`, () => {
      const view = viewFor(1.1875, "forward", system);
      const lo = formatMark(inchesToMm(held(1.1875, view.toMm(view.min), "forward")), system);
      const hi = formatMark(inchesToMm(held(1.1875, view.toMm(view.max), "forward")), system);
      expect(lo).toBe(system === "imperial" ? '7/8"' : "22 mm");
      expect(hi).toBe(system === "imperial" ? '2"' : "51 mm");
    });

    it(`${system}: the rear window's ends on the default board's 2.2135" print as measured at plan time`, () => {
      const view = viewFor(2.2135, "rear", system);
      const lo = formatMark(inchesToMm(held(2.2135, view.toMm(view.min), "rear")), system);
      const hi = formatMark(inchesToMm(held(2.2135, view.toMm(view.max), "rear")), system);
      expect(lo).toBe(system === "imperial" ? '1 11/16"' : "44 mm");
      expect(hi).toBe(system === "imperial" ? '2 11/16"' : "69 mm");
    });
  }

  it("Metric: one step from zero prints the template's whole-millimetre figure plus one", () => {
    for (const { pair, t } of CASES) {
      const view = viewFor(t, pair, "metric");
      expect(view.step).toBe(1);
      // A template past the window's top (2.5" on the front pair) has no room to step toward the stringer.
      if (view.max < 1) continue;
      const up = Math.round(inchesToMm(held(t, view.toMm(1), pair)));
      expect(up).toBe(Math.round(inchesToMm(t)) + 1);
    }
  });

  it("Imperial: the range is a whole number of sixteenths, 7/8\" to 2\" on a 1 3/16\" template", () => {
    const r = offRailTunerRangeIn(inchesToMm(1.1875), "forward", "imperial");
    expectCloseIn(r.min, -0.3125);
    expectCloseIn(r.max, 0.8125);
  });
});
