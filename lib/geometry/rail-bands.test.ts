import { describe, expect, it } from "vitest";
import {
  buildRailDataGroups,
  computeRailBands,
  computeRailSection,
  mergeRailDataTable,
  MIN_BOTTOM_TUCK_SEPARATION_IN,
  railFamilyLabel,
  type ComputeRailSectionInput,
  type RailBandSpec,
  type RailFamily,
  type RailSectionKey,
  type RailSectionSpec,
} from "./rail-bands";
import { type Mm, formatInchesFraction, inchesToMm, mmToInches, roundToSixteenthInch } from "./units";
import golden from "./__fixtures__/prototype-rails-golden.json";

const TOLERANCE_IN = 1e-9;

function expectCloseIn(actual: number, expected: number, tol: number = TOLERANCE_IN) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

interface GoldenState {
  units: string;
  centerDeckPercent: number;
  centerBoardThickness: number;
  centerFamily: number;
  centerRatioTop: number;
  centerSymmetrical: boolean;
  noseDeckPercent: number;
  noseFamily: number;
  noseRatioTop: number;
  noseSymmetrical: boolean;
  tailDeckPercent: number;
  tailFamily: number;
  tailRatioTop: number;
  tailSymmetrical: boolean;
  noseThickness: number;
  tailThickness: number;
  noseCornerCutOffsetOverride: number | null;
  centerCornerCutOffsetOverride: number | null;
  tailCornerCutOffsetOverride: number | null;
  noseRemoveCornerCut: boolean;
  centerRemoveCornerCut: boolean;
  tailRemoveCornerCut: boolean;
  noseSingleTuck: boolean;
  centerSingleTuck: boolean;
  tailSingleTuck: boolean;
  noseBottomTuck3Override: number | null;
  centerBottomTuck3Override: number | null;
  tailBottomTuck3Override: number | null;
  tailHardEdge: boolean;
}

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_BOARD_THICKNESS_KEY: Record<RailSectionKey, keyof GoldenState> = {
  nose: "noseThickness",
  center: "centerBoardThickness",
  tail: "tailThickness",
};

function toSectionSpec(state: GoldenState, section: RailSectionKey): RailSectionSpec {
  const overrideKey = `${section}CornerCutOffsetOverride` as keyof GoldenState;
  const tuck3Key = `${section}BottomTuck3Override` as keyof GoldenState;
  const overrideVal = state[overrideKey] as number | null;
  const tuck3Val = state[tuck3Key] as number | null;
  return {
    boardThickness: inchesToMm(state[SECTION_BOARD_THICKNESS_KEY[section]] as number),
    deckPercent: state[`${section}DeckPercent` as keyof GoldenState] as number,
    family: state[`${section}Family` as keyof GoldenState] as RailFamily,
    ratioTopPercent: state[`${section}RatioTop` as keyof GoldenState] as number,
    symmetrical: state[`${section}Symmetrical` as keyof GoldenState] as boolean,
    cornerCutOffsetOverride: overrideVal === null ? null : inchesToMm(overrideVal),
    removeCornerCut: state[`${section}RemoveCornerCut` as keyof GoldenState] as boolean,
    singleTuck: state[`${section}SingleTuck` as keyof GoldenState] as boolean,
    bottomTuck3Override: tuck3Val === null ? null : inchesToMm(tuck3Val),
  };
}

function toRailBandSpec(state: GoldenState): RailBandSpec {
  return {
    nose: toSectionSpec(state, "nose"),
    center: toSectionSpec(state, "center"),
    tail: toSectionSpec(state, "tail"),
    tailHardEdge: state.tailHardEdge,
  };
}

const NUMERIC_RESULT_FIELDS = [
  "thickness",
  "apexLenRange",
  "apexCenter",
  "railMark1",
  "railTuck1",
  "domedDeckBand",
  "deckMark1",
  "deckMark2",
  "deckMark3",
  "bottomTuck1",
  "bottomTuck2",
  "bottomTuck3",
] as const;
const NULLABLE_RESULT_FIELDS = ["cornerCutRail", "cornerCutOffset", "cornerCutDeck"] as const;

const goldenEntries = Object.entries(golden) as [string, (typeof golden)[keyof typeof golden]][];

describe("computeRailBands golden parity", () => {
  for (const [name, fixture] of goldenEntries) {
    describe(`fixture: ${name}`, () => {
      const spec = toRailBandSpec(fixture.state as GoldenState);
      const bands = computeRailBands(spec);

      for (const section of SECTION_KEYS) {
        describe(`section: ${section}`, () => {
          const goldenSection = fixture.sections[section];
          const output = bands[section];

          it("matches computeSection result fields", () => {
            const rIn = goldenSection.result as Record<string, number | boolean | null | undefined>;
            const r = output.result as unknown as Record<string, Mm | boolean | null>;

            for (const field of NUMERIC_RESULT_FIELDS) {
              expectCloseIn(mmToInches(r[field] as Mm), rIn[field] as number);
            }
            for (const field of NULLABLE_RESULT_FIELDS) {
              const expectedNull = rIn[field] === null || rIn[field] === undefined;
              if (expectedNull) {
                expect(r[field]).toBeNull();
              } else {
                expect(r[field]).not.toBeNull();
                expectCloseIn(mmToInches(r[field] as Mm), rIn[field] as number);
              }
            }
            expect(output.result.hardEdge).toBe(!!rIn.hardEdge);
            expect(output.result.removeCornerCut).toBe(!!rIn.removeCornerCut);
            expect(output.result.singleTuck).toBe(!!rIn.singleTuck);
          });

          it("matches buildProfilePoints profile length, order and coordinates", () => {
            const goldenProfile = goldenSection.profile as [number, number][];
            expect(output.profile.length).toBe(goldenProfile.length);
            output.profile.forEach((p, i) => {
              expectCloseIn(mmToInches(p.x), goldenProfile[i][0]);
              expectCloseIn(mmToInches(p.y), goldenProfile[i][1]);
            });
          });

          it("matches buildSegmentDefs segment key sequence and endpoints", () => {
            const goldenSegments = goldenSection.segments as {
              key: string;
              label: string;
              p1: [number, number];
              p2: [number, number];
            }[];
            expect(output.segments.map((s) => s.key)).toEqual(goldenSegments.map((s) => s.key));
            expect(output.segments.map((s) => s.label)).toEqual(goldenSegments.map((s) => s.label));
            output.segments.forEach((s, i) => {
              const g = goldenSegments[i];
              expectCloseIn(mmToInches(s.p1.x), g.p1[0]);
              expectCloseIn(mmToInches(s.p1.y), g.p1[1]);
              expectCloseIn(mmToInches(s.p2.x), g.p2[0]);
              expectCloseIn(mmToInches(s.p2.y), g.p2[1]);
            });
          });

          it("matches cardFromResult data groups label-for-label and value-for-value once formatted", () => {
            const goldenCard = goldenSection.card as {
              groups: { heading: string; rows: { label: string; value: string }[] }[];
            };
            expect(output.dataGroups.length).toBe(goldenCard.groups.length);
            output.dataGroups.forEach((g, gi) => {
              const gg = goldenCard.groups[gi];
              expect(g.heading).toBe(gg.heading);
              expect(g.rows.length).toBe(gg.rows.length);
              g.rows.forEach((row, ri) => {
                const goldenRow = gg.rows[ri];
                expect(row.label).toBe(goldenRow.label);
                const formatted =
                  row.value === "hard-edge"
                    ? "Hard Edge"
                    : row.value === null
                      ? "—"
                      : formatInchesFraction(row.value, 16);
                expect(formatted).toBe(goldenRow.value);
              });
            });
          });
        });
      }
    });
  }
});

describe("computeRailSection null alignment", () => {
  const base: ComputeRailSectionInput = {
    thickness: inchesToMm(2.5),
    ratioTopPercent: 60,
    family: 3,
    domedBandBase: inchesToMm(6),
    scale: 1,
    cornerCutOffsetOverride: null,
    removeCornerCut: false,
    singleTuck: false,
    bottomTuck3Override: null,
    symmetrical: false,
    hardEdge: false,
  };

  it("leaves cornerCutRail/cornerCutOffset/cornerCutDeck as numbers when Remove is off", () => {
    const r = computeRailSection(base);
    expect(r.cornerCutRail).not.toBeNull();
    expect(r.cornerCutOffset).not.toBeNull();
    expect(r.cornerCutDeck).not.toBeNull();
  });

  it("nulls cornerCutRail/cornerCutOffset/cornerCutDeck together when Remove is on", () => {
    const r = computeRailSection({ ...base, removeCornerCut: true });
    expect(r.cornerCutRail).toBeNull();
    expect(r.cornerCutOffset).toBeNull();
    expect(r.cornerCutDeck).toBeNull();
  });
});

describe("Bottom Tuck 3 override floor", () => {
  // family=3, scale=1, ratioTopPercent=60, thickness=2.5in (same shape as the center section
  // defaults). Derived values by hand: apexLenRange=0.75, apexCenter=1.0, railTuck1=0.625,
  // bottomTuck1(non-sym)=0.3125, bottomTuck1(sym)=deckMark1=2.5, deckMark3=4.0. These match the
  // measured repro in the todo (Bottom Tuck 1 = 2 1/2", Bottom Tuck 3 derived = 4" when symmetrical).
  const baseInput: ComputeRailSectionInput = {
    thickness: inchesToMm(2.5),
    ratioTopPercent: 60,
    family: 3,
    domedBandBase: inchesToMm(6),
    scale: 1,
    cornerCutOffsetOverride: null,
    removeCornerCut: false,
    singleTuck: false,
    bottomTuck3Override: null,
    symmetrical: false,
    hardEdge: false,
  };

  it("floors a symmetrical override below Bottom Tuck 1 to Bottom Tuck 1 + MIN_BOTTOM_TUCK_SEPARATION_IN (strictly greater, never inverts or collapses)", () => {
    // Reproduces the exact reported bug: Sym on, slider touched down to 1.5" (below the 2.5"
    // Bottom Tuck 1), must floor to strictly above Bottom Tuck 1, not collapse onto it.
    const r = computeRailSection({ ...baseInput, symmetrical: true, bottomTuck3Override: inchesToMm(1.5) });
    expectCloseIn(mmToInches(r.bottomTuck1), 2.5);
    expectCloseIn(mmToInches(r.bottomTuck3), 2.5 + MIN_BOTTOM_TUCK_SEPARATION_IN);
    expect(r.bottomTuck3).toBeGreaterThan(r.bottomTuck1);
  });

  it("floors a non-symmetrical override below Bottom Tuck 1 to Bottom Tuck 1 + MIN_BOTTOM_TUCK_SEPARATION_IN", () => {
    const r = computeRailSection({ ...baseInput, symmetrical: false, bottomTuck3Override: inchesToMm(0.1) });
    expectCloseIn(mmToInches(r.bottomTuck1), 0.3125);
    expectCloseIn(mmToInches(r.bottomTuck3), 0.3125 + MIN_BOTTOM_TUCK_SEPARATION_IN);
    expect(r.bottomTuck3).toBeGreaterThan(r.bottomTuck1);
  });

  it("passes a symmetrical override above the floor through unchanged", () => {
    const r = computeRailSection({ ...baseInput, symmetrical: true, bottomTuck3Override: inchesToMm(3.0) });
    expectCloseIn(mmToInches(r.bottomTuck3), 3.0);
  });

  it("passes a non-symmetrical override above the floor through unchanged", () => {
    const r = computeRailSection({ ...baseInput, symmetrical: false, bottomTuck3Override: inchesToMm(0.5) });
    expectCloseIn(mmToInches(r.bottomTuck3), 0.5);
  });

  it("still yields exactly 0 for hardEdge even with an override present, including bottomTuck3Derived", () => {
    const symmetricalHardEdge = computeRailSection({
      ...baseInput,
      symmetrical: true,
      hardEdge: true,
      bottomTuck3Override: inchesToMm(5),
    });
    expect(symmetricalHardEdge.bottomTuck3).toBe(0);
    expect(symmetricalHardEdge.bottomTuck3Derived).toBe(0);

    const nonSymmetricalHardEdge = computeRailSection({
      ...baseInput,
      symmetrical: false,
      hardEdge: true,
      bottomTuck3Override: inchesToMm(5),
    });
    expect(nonSymmetricalHardEdge.bottomTuck3).toBe(0);
    expect(nonSymmetricalHardEdge.bottomTuck3Derived).toBe(0);
  });

  it("holds bottomTuck3 > bottomTuck1 strictly (or exactly 0 under hardEdge) for every section across every golden fixture", () => {
    for (const [, fixture] of goldenEntries) {
      const spec = toRailBandSpec(fixture.state as GoldenState);
      const bands = computeRailBands(spec);
      for (const section of SECTION_KEYS) {
        const r = bands[section].result;
        if (r.hardEdge) {
          expect(r.bottomTuck3).toBe(0);
        } else {
          expect(r.bottomTuck3).toBeGreaterThan(r.bottomTuck1);
        }
      }
    }
  });

  it("bottomTuck3Derived equals the un-overridden value in both modes, unaffected by an override's presence", () => {
    const symmetricalNoOverride = computeRailSection({ ...baseInput, symmetrical: true, bottomTuck3Override: null });
    const symmetricalWithOverride = computeRailSection({
      ...baseInput,
      symmetrical: true,
      bottomTuck3Override: inchesToMm(1.5),
    });
    expectCloseIn(mmToInches(symmetricalNoOverride.bottomTuck3Derived), 4.0);
    expectCloseIn(mmToInches(symmetricalWithOverride.bottomTuck3Derived), 4.0);
    // With no override, bottomTuck3 itself equals the derived value.
    expectCloseIn(mmToInches(symmetricalNoOverride.bottomTuck3), mmToInches(symmetricalNoOverride.bottomTuck3Derived));

    const nonSymmetricalNoOverride = computeRailSection({
      ...baseInput,
      symmetrical: false,
      bottomTuck3Override: null,
    });
    const nonSymmetricalWithOverride = computeRailSection({
      ...baseInput,
      symmetrical: false,
      bottomTuck3Override: inchesToMm(0.1),
    });
    expectCloseIn(mmToInches(nonSymmetricalNoOverride.bottomTuck3Derived), 0.625);
    expectCloseIn(mmToInches(nonSymmetricalWithOverride.bottomTuck3Derived), 0.625);
    expectCloseIn(
      mmToInches(nonSymmetricalNoOverride.bottomTuck3),
      mmToInches(nonSymmetricalNoOverride.bottomTuck3Derived),
    );
  });
});

describe("roundToSixteenthInch", () => {
  it("snaps 2.5in x 80% to exactly 2in", () => {
    const snapped = roundToSixteenthInch(inchesToMm(2.5 * 0.8));
    expect(mmToInches(snapped)).toBeCloseTo(2, 9);
  });

  it("snaps 1.31in x 72% to the nearest sixteenth", () => {
    const snapped = roundToSixteenthInch(inchesToMm(1.31 * 0.72));
    expect(mmToInches(snapped)).toBeCloseTo(15 / 16, 9);
  });
});

describe("railFamilyLabel", () => {
  it("names all five families", () => {
    expect(railFamilyLabel(1)).toBe("boxy");
    expect(railFamilyLabel(2)).toBe("boxy/med");
    expect(railFamilyLabel(3)).toBe("med");
    expect(railFamilyLabel(4)).toBe("med/knifey");
    expect(railFamilyLabel(5)).toBe("knifey");
  });
});

describe("mergeRailDataTable", () => {
  it("emits the canonical row order and fills absent cells with null (em dash) regardless of open sections", () => {
    const defaultFixture = golden.default as (typeof golden)["default"];
    const spec = toRailBandSpec(defaultFixture.state as GoldenState);
    const bands = computeRailBands(spec);

    // Tail defaults to Hard Edge on, so it lacks a "Rail Tuck 1" row and the Bottom Tuck 1/2 rows
    // that nose (hard edge off) carries — mergeRailDataTable must still emit those canonical rows,
    // with the tail's cell filled in as null.
    const merged = mergeRailDataTable([
      { key: "nose", dataGroups: bands.nose.dataGroups },
      { key: "tail", dataGroups: bands.tail.dataGroups },
    ]);

    const railSide = merged.find((g) => g.heading === "Rail Side")!;
    expect(railSide.rows.map((r) => r.label)).toEqual([
      "Board Thickness",
      "Tapered Rail Thickness",
      "Apex Thickness",
      "Apex Center",
      "Rail Mark 1",
      "Rail Tuck 1",
      "Corner Cut (Rail)",
    ]);
    const railTuck1Row = railSide.rows.find((r) => r.label === "Rail Tuck 1")!;
    expect(railTuck1Row.cells[0]).not.toBeNull(); // nose
    expect(railTuck1Row.cells[1]).toBeNull(); // tail (hard edge — no row)

    const bottom = merged.find((g) => g.heading === "Bottom")!;
    expect(bottom.rows.map((r) => r.label)).toEqual(["Bottom Tuck 1", "Bottom Tuck 2", "Bottom Tuck 3"]);
    const bottomTuck1Row = bottom.rows.find((r) => r.label === "Bottom Tuck 1")!;
    expect(bottomTuck1Row.cells[0]).not.toBeNull(); // nose
    expect(bottomTuck1Row.cells[1]).toBeNull(); // tail (hard edge — no row)
    const bottomTuck3Row = bottom.rows.find((r) => r.label === "Bottom Tuck 3")!;
    expect(bottomTuck3Row.cells[0]).not.toBeNull(); // nose: a real value
    expect(bottomTuck3Row.cells[1]).toBe("hard-edge"); // tail: the hard-edge sentinel
  });
});

describe("buildRailDataGroups row inclusion", () => {
  it("drops Board Thickness's flat label and includes it only when domed", () => {
    const flat = buildRailDataGroups(
      computeRailSection({
        thickness: inchesToMm(2.5),
        ratioTopPercent: 60,
        family: 3,
        domedBandBase: inchesToMm(6),
        scale: 1,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
        symmetrical: false,
        hardEdge: false,
      }),
      { domed: false, boardThickness: inchesToMm(2.5) },
    );
    const railSide = flat.find((g) => g.heading === "Rail Side")!;
    expect(railSide.rows[0].label).toBe("Board Thickness");
    expect(railSide.rows.filter((r) => r.label === "Board Thickness").length).toBe(1);
  });
});
