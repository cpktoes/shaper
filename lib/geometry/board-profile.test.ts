import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { boardOnBlank, placementRange, prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import {
  buildBlankProfile,
  buildBoardProfile,
  buildFallbackProfile,
  handSetFromProfile,
  type BoardSideProfile,
} from "./board-profile";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { DEFAULT_BOARD_SPEC } from "./board";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_FOIL_SPEC, foilStationPoints, sampleFoil, type FoilStationKey } from "./foil";
import { MEASURE_STATION_MM } from "./outline";
import { preparePchip } from "./pchip";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions } from "./rocker";
import { inchesToMm, mm, type Mm } from "./units";

// Every blank figure below is read from the committed CSVs through the tested reader, and every
// expected number is computed by the functions under test — never typed (CLAUDE.md Rule 1).
const CATALOG = readSeedCatalog();
const MARKO_VENDOR = "Marko Foam";
const M_REGULAR = `6'0" M-Regular`;
const KEYS: FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

function findBlank(vendor: string, name: string): BlankRecord {
  const blank = CATALOG.find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not in the seeded catalogue`);
  return blank;
}

const BOARD_LENGTH = inchesToMm(70);

function boardInput(overrides: Partial<BoardOnBlankInput> = {}): BoardOnBlankInput {
  return {
    length: BOARD_LENGTH,
    centerThickness: inchesToMm(2.5),
    noseTip: inchesToMm(0.3125),
    tailTip: inchesToMm(0.25),
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
    ...overrides,
  };
}

/** `count + 1` evenly spaced stations from tail tip to nose tip. */
function sweep(length: Mm, count: number): Mm[] {
  const out: Mm[] = [];
  for (let i = 0; i <= count; i++) out.push(mm((length * i) / count));
  return out;
}

function expectDeckIsDerived(profile: BoardSideProfile) {
  // R10: the deck is rocker + thickness at every point, never a third interpolated curve.
  const mismatches = sweep(profile.length, 199).filter(
    (s) => profile.deckAt(s) !== profile.rockerAt(s) + profile.thicknessAt(s),
  );
  expect(mismatches).toEqual([]);
}

describe("the fallback profile — a board with no blank (D-14)", () => {
  const length = inchesToMm(72);
  const profile = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, DEFAULT_FOIL_SPEC, length);

  it("carries the stored foil exactly, so RAILS numbers do not move for a board without a blank", () => {
    for (const key of KEYS) expect(profile.effectiveFoil[key]).toBe(DEFAULT_FOIL_SPEC[key]);
    expect(profile.effectiveFoil).not.toBe(DEFAULT_FOIL_SPEC);
  });

  it("reads the typed rocker exactly at the five stations, centre 0", () => {
    expect(profile.stationRocker).toEqual({ ...DEFAULT_FALLBACK_ROCKER, center: 0 });
    for (const { key, station } of profile.stations) {
      expect(profile.rockerAt(station)).toBe(profile.stationRocker[key]);
    }
  });

  it("lists the five stations where rockerStationPositions puts them", () => {
    expect(profile.stations).toEqual(rockerStationPositions(length));
    expect(profile.length).toBe(length);
  });

  it("draws the foil through the five stored thicknesses on the one pchip sampler", () => {
    const curve = preparePchip(
      foilStationPoints(DEFAULT_FOIL_SPEC, length).map((p) => ({ x: p.station, y: p.thickness })),
    );
    const mismatches = sweep(length, 72).filter((s) => profile.thicknessAt(s) !== curve.sample(s));
    expect(mismatches).toEqual([]);
  });

  it("reads exactly what sampleFoil reads, on a 1in sweep", () => {
    const mismatches = sweep(length, 72).filter(
      (s) => profile.thicknessAt(s) !== sampleFoil(DEFAULT_FOIL_SPEC, length, s),
    );
    expect(mismatches).toEqual([]);
  });

  it("has no blank", () => {
    expect(profile.blank).toBeNull();
  });

  it("derives the deck as rocker + thickness at 200 stations (R10)", () => {
    expectDeckIsDerived(profile);
  });
});

describe("the blank profile — a board sitting in a real blank", () => {
  const record = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(record);
  const L = BOARD_LENGTH;
  const board = boardInput();
  const profile = buildBlankProfile(prepared, board, mm(0));
  const view = profile.blank!;

  it("hits the target centre and both tip settings", () => {
    expect(view).not.toBeNull();
    expect(profile.thicknessAt(mm(L / 2))).toBeCloseTo(board.centerThickness, 9);
    expect(profile.thicknessAt(mm(0))).toBe(board.tailTip);
    expect(profile.thicknessAt(L)).toBe(board.noseTip);
  });

  it("reads rocker and thickness straight off boardOnBlank — never re-splined from five stations", () => {
    const onBlank = boardOnBlank(prepared, board, mm(0));
    const mismatches = sweep(L, 199).filter(
      (s) => profile.rockerAt(s) !== onBlank.rockerAt(s) || profile.thicknessAt(s) !== onBlank.thicknessAt(s),
    );
    expect(mismatches).toEqual([]);
  });

  it("reads stationRocker and effectiveFoil off the profile's own curves at the five stations", () => {
    for (const { key, station } of profile.stations) {
      expect(profile.stationRocker[key]).toBe(profile.rockerAt(station));
      expect(profile.effectiveFoil[key]).toBe(profile.thicknessAt(station));
    }
  });

  it("derives the deck as rocker + thickness at 200 stations (R10)", () => {
    expectDeckIsDerived(profile);
  });

  it("gives the foam to come off the deck and off the bottom at each station — the skin and the centre gap at the centre (R4, D-03)", () => {
    const skin = board.deckSkin;
    expect(view.cut).toEqual(DEFAULT_BLANK_CUT);
    expect(view.centerGap).toBe(view.onBlank.centerGap);
    expect(view.centerGap).toBeCloseTo(view.onBlank.blankThicknessAt(L / 2) - skin - board.centerThickness, 9);
    expect(view.foamOffDeck.center).toBeCloseTo(skin, 9);
    expect(view.foamOffBottom.center).toBeCloseTo(view.centerGap, 9);
    for (const { key, station } of profile.stations) {
      expect(view.foamOffDeck[key]).toBe(view.onBlank.deckOffAt(station));
      expect(view.foamOffBottom[key]).toBe(view.onBlank.bottomOffAt(station));
      // Off the deck plus off the bottom is all the foam that comes off: the blank's thickness
      // there less the board's.
      expect(view.foamOffDeck[key] + view.foamOffBottom[key]).toBeCloseTo(
        view.onBlank.blankThicknessAt(station) - profile.thicknessAt(station),
        9,
      );
    }
  });

  it("holds the 12in thicknesses before any fine-tune: the blank's there less the skin and the gap (R3, D-11)", () => {
    expect(view.derived12.nose12).toBe(view.onBlank.derivedThicknessAt(L - MEASURE_STATION_MM));
    expect(view.derived12.tail12).toBe(view.onBlank.derivedThicknessAt(MEASURE_STATION_MM));
    for (const [key, station] of [
      ["nose12", L - MEASURE_STATION_MM],
      ["tail12", MEASURE_STATION_MM],
    ] as const) {
      expect(view.derived12[key]).toBeCloseTo(
        view.onBlank.blankThicknessAt(station) - board.deckSkin - view.centerGap,
        9,
      );
    }
  });

  it("places the blank's silhouette in the board's own coordinates", () => {
    const Lb = prepared.lengthMm;
    expect(view.start).toBe(L / 2 - Lb / 2 - view.placement);
    expect(view.end).toBe(view.start + Lb);
    expect(view.record.name).toBe(M_REGULAR);
  });

  it("sits the blank's bottom the foam off the bottom under the board's, and the blank's deck is never below its bottom", () => {
    // The blank's bottom is the board's bottom less the foam off the bottom there, and so the
    // blank's deck less its own thickness.
    const along = sweep(L, 199).filter(
      (s) =>
        view.bottomAt(s) !== profile.rockerAt(s) - view.onBlank.bottomOffAt(s) ||
        Math.abs(view.bottomAt(s) - (view.deckAt(s) - view.onBlank.blankThicknessAt(s))) > 1e-9,
    );
    expect(along).toEqual([]);
    // Parallel to the board's un-thinned bottom: the centre gap below it wherever the tips are not
    // thinned, the gap plus the Pin deck thinning where they are (Phase 12 R2).
    const gap = sweep(L, 199).filter(
      (s) => Math.abs(profile.rockerAt(s) - view.bottomAt(s) - (view.centerGap + view.onBlank.tipThinningAt(s))) > 1e-9,
    );
    expect(gap).toEqual([]);
    const wholeBlank = sweep(mm(view.end - view.start), 400).map((d) => mm(view.start + d));
    // bottomAt is the blank's import-levelled rocker less the crop's low point (Pattern 3), less
    // the centre gap.
    const formula = wholeBlank.filter(
      (s) =>
        Math.abs(
          view.bottomAt(s) - (view.onBlank.blankRockerAt(s) - view.onBlank.cropMinimum - view.centerGap),
        ) > 1e-9,
    );
    expect(formula).toEqual([]);
    const inverted = wholeBlank.filter((s) => view.deckAt(s) < view.bottomAt(s));
    expect(inverted).toEqual([]);
    const deckFormula = wholeBlank.filter(
      (s) => view.deckAt(s) !== view.bottomAt(s) + view.onBlank.blankThicknessAt(s),
    );
    expect(deckFormula).toEqual([]);
  });

  it("carries every station the catalogue measured for rocker and for thickness, in board coordinates", () => {
    const rockerCells = record.stations.filter((s) => s.rockerMm !== null);
    const thicknessCells = record.stations.filter((s) => s.thicknessMm !== null);
    expect(view.measuredStations.rocker).toHaveLength(rockerCells.length);
    expect(view.measuredStations.thickness).toHaveLength(thicknessCells.length);
    rockerCells.forEach((cell, i) => {
      expect(view.measuredStations.rocker[i]).toBe(view.start + cell.fromTailMm);
    });
    thicknessCells.forEach((cell, i) => {
      expect(view.measuredStations.thickness[i]).toBe(view.start + cell.fromTailMm);
    });
  });

  it("gives the blank's own numbers under each of the board's five stations — the DATASHEET's blank rows (D-16)", () => {
    const Lb = prepared.lengthMm;
    const u = (s: number) => s + (Lb - L) / 2 + view.placement;
    expect(view.blankAtStations.center.rocker).toBe(prepared.rocker.sample(u(L / 2)));
    for (const { key, station } of profile.stations) {
      expect(view.blankAtStations[key].rocker).toBe(view.onBlank.blankRockerAt(station));
      expect(view.blankAtStations[key].thickness).toBe(view.onBlank.blankThicknessAt(station));
      expect(view.blankAtStations[key].width).toBe(view.onBlank.blankWidthAt(station));
    }
  });
});

describe("the 12in fine-tune survives a placement change (R5, D-11)", () => {
  const prepared = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
  const offset = inchesToMm(1 / 16);
  const board = boardInput({ nose12Offset: offset });
  const { max } = placementRange(prepared.lengthMm, BOARD_LENGTH);

  it("reads derived + offset at nose 12in at placement 0 and at the range's far end", () => {
    expect(max).toBeGreaterThan(0);
    for (const placement of [mm(0), max]) {
      const profile = buildBlankProfile(prepared, board, placement);
      const view = profile.blank!;
      expect(view.placement).toBe(placement);
      expect(profile.effectiveFoil.nose12).toBeCloseTo(view.derived12.nose12 + offset, 9);
      expect(profile.effectiveFoil.tail12).toBeCloseTo(view.derived12.tail12, 9);
    }
  });
});

describe("placement is clamped on read and nothing passed in is changed", () => {
  const record = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(record);
  const board = boardInput();
  const { min, max } = placementRange(prepared.lengthMm, BOARD_LENGTH);

  it("pulls a placement past either end back to that end", () => {
    expect(buildBlankProfile(prepared, board, mm(max + inchesToMm(3))).blank!.placement).toBe(max);
    expect(buildBlankProfile(prepared, board, mm(min - inchesToMm(3))).blank!.placement).toBe(min);
  });

  it("does not mutate the board input, the prepared blank or its record", () => {
    const boardBefore = structuredClone(board);
    const recordBefore = structuredClone(prepared.record);
    buildBlankProfile(prepared, board, mm(max + inchesToMm(3)));
    expect(board).toEqual(boardBefore);
    expect(prepared.record).toEqual(recordBefore);
  });
});

describe("buildBoardProfile — one entry point for both kinds of board", () => {
  const prepared = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
  const foil = { ...DEFAULT_FOIL_SPEC, center: inchesToMm(2.5) };

  it("builds the fallback when there is no blank", () => {
    const profile = buildBoardProfile({ length: BOARD_LENGTH, rocker: DEFAULT_FALLBACK_ROCKER, foil, blank: null });
    const expected = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, foil, BOARD_LENGTH);
    expect(profile.blank).toBeNull();
    expect(profile.effectiveFoil).toEqual(expected.effectiveFoil);
    expect(profile.stationRocker).toEqual(expected.stationRocker);
  });

  it("with a blank, feeds the foil's centre and tips, the two offsets and the board's own cut into the blank profile", () => {
    const nose12Offset = inchesToMm(1 / 16);
    const tail12Offset = inchesToMm(-1 / 32);
    const cuts = [
      DEFAULT_BLANK_CUT,
      { deckSkin: inchesToMm(3 / 16), tipStyle: "bottom", fineTuneSurface: "bottom" },
    ] as const;
    const profiles = cuts.map((cut) => {
      const profile = buildBoardProfile({
        length: BOARD_LENGTH,
        rocker: DEFAULT_FALLBACK_ROCKER,
        foil,
        blank: { prepared, placement: mm(0), nose12Offset, tail12Offset, ...cut },
      });
      const expected = buildBlankProfile(
        prepared,
        {
          length: BOARD_LENGTH,
          centerThickness: foil.center,
          noseTip: foil.noseTip,
          tailTip: foil.tailTip,
          nose12Offset,
          tail12Offset,
          ...cut,
        },
        mm(0),
      );
      expect(profile.blank).not.toBeNull();
      expect(profile.blank!.cut).toEqual(cut);
      expect(profile.effectiveFoil).toEqual(expected.effectiveFoil);
      expect(profile.stationRocker).toEqual(expected.stationRocker);
      expect(profile.blank!.foamOffDeck).toEqual(expected.blank!.foamOffDeck);
      expect(profile.blank!.foamOffBottom).toEqual(expected.blank!.foamOffBottom);
      return profile;
    });
    // The cut really reaches the maths: a thicker skin leaves less foam off the bottom.
    expect(profiles[1].blank!.centerGap).toBeLessThan(profiles[0].blank!.centerGap);
  });
});

describe("Remove This Blank keeps the five stations exactly (WR-01)", () => {
  // Every board below sits in Marko 6'0" M-Regular at placement 0 and 1/2" toward the nose, with a
  // pair of non-zero 12" fine-tunes so the FINAL foil (derived + offset) is what is recorded. The
  // four presets also sit in their own blanks at their own placement (and 1/2" off it).
  const marko = findBlank(MARKO_VENDOR, M_REGULAR);
  const halfInch = inchesToMm(0.5);
  const cases: { label: string; length: Mm; foil: typeof DEFAULT_FOIL_SPEC; record: BlankRecord; placement: Mm }[] = [];
  for (const preset of BOARD_PRESETS) {
    const fields = presetDesignFields(preset);
    for (const extra of [0, halfInch]) {
      cases.push({ label: `${preset.name} in M-Regular +${extra}mm`, length: fields.outline.length, foil: fields.foil, record: marko, placement: mm(extra) });
      cases.push({
        label: `${preset.name} in its own blank +${extra}mm`,
        length: fields.outline.length,
        foil: fields.foil,
        record: fields.blank.copy,
        placement: mm(fields.blank.placement + extra),
      });
    }
  }
  for (const extra of [0, halfInch]) {
    cases.push({
      label: `default board in M-Regular +${extra}mm`,
      length: DEFAULT_BOARD_SPEC.outline.length,
      foil: DEFAULT_FOIL_SPEC,
      record: marko,
      placement: mm(extra),
    });
  }

  const results = cases.map((c) => {
    const onBlank = buildBoardProfile({
      length: c.length,
      rocker: DEFAULT_FALLBACK_ROCKER,
      foil: c.foil,
      blank: {
        prepared: prepareBlank(c.record),
        placement: c.placement,
        nose12Offset: inchesToMm(1 / 16),
        tail12Offset: inchesToMm(-1 / 32),
        ...DEFAULT_BLANK_CUT,
      },
    });
    const handSet = handSetFromProfile(onBlank, c.foil);
    const after = buildBoardProfile({ length: c.length, rocker: handSet.rocker, foil: handSet.foil, blank: null });
    return { c, onBlank, handSet, after };
  });

  it("covers at least one board whose centre rocker is not zero, so the rebase is really exercised", () => {
    expect(results.some(({ onBlank }) => Math.abs(onBlank.stationRocker.center) > 1e-3)).toBe(true);
  });

  it.each(results.map((r) => [r.c.label, r] as const))("%s: thickness at all five stations is unchanged", (_label, r) => {
    for (const { station } of r.onBlank.stations) {
      expect(Math.abs(r.after.thicknessAt(station) - r.onBlank.thicknessAt(station))).toBeLessThan(1e-6);
    }
  });

  it.each(results.map((r) => [r.c.label, r] as const))(
    "%s: rocker at the four non-centre stations is the old rocker less the old centre rocker; the centre reads 0",
    (_label, r) => {
      const centre = r.onBlank.rockerAt(mm(r.c.length / 2));
      for (const { key, station } of r.onBlank.stations) {
        const expected = key === "center" ? 0 : r.onBlank.rockerAt(station) - centre;
        expect(Math.abs(r.after.rockerAt(station) - expected)).toBeLessThan(1e-6);
        expect(Math.abs(r.after.stationRocker[key] - expected)).toBeLessThan(1e-6);
      }
    },
  );

  it.each(results.map((r) => [r.c.label, r] as const))("%s: foil.center stays the one stored centre", (_label, r) => {
    expect(r.handSet.foil.center).toBe(r.c.foil.center);
    expect(r.handSet.foil.noseTip).toBe(r.c.foil.noseTip);
    expect(r.handSet.foil.tailTip).toBe(r.c.foil.tailTip);
  });
});
