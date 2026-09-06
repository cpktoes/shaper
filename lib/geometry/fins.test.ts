import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  MIN_MCKEE_LONGBOARD_QUAD_LENGTH,
  computeFinPlacement,
  defaultCenterBaseLength,
  effectiveQuadRearModel,
  isQuadRearModelAvailable,
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
import { formatInchesFraction, inchesToMm, type Mm, mmToInches } from "./units";
import { formatDim, formatDimBare, formatMark } from "./measure-display";
import { TOE_AIM_TABLE, TOE_AIM_TABLE_COLUMNS } from "./toe-aim-tables";
import golden from "./__fixtures__/prototype-fins-golden.json";

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

  it("metric: every column/cell is one-decimal centimetres derived from the inch table constant, and the row label keeps its '+' marker", () => {
    const view = toeAimTableFor(boardLength, tailWidth12, "metric");
    // Provenance: every expected metric value below is the SAME inch number the imperial
    // assertion above reads off TOE_AIM_TABLE_COLUMNS/TOE_AIM_TABLE, run through
    // inchesToMm -> formatDimBare("metric") — never a hand-transcribed centimetre figure.
    expect(view.columns).toEqual(TOE_AIM_TABLE_COLUMNS.map((c) => formatDimBare(inchesToMm(c), "metric")));
    expect(view.front).toEqual(TOE_AIM_TABLE.front["72+"].map((v) => formatDimBare(inchesToMm(v), "metric")));
    expect(view.rear).toEqual(TOE_AIM_TABLE.rear["72+"].map((v) => formatDimBare(inchesToMm(v), "metric")));
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
