import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { boardOnBlank, judgeBlank, placementRange, prepareBlank, type BoardOnBlankInput } from "./blank-fit";
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
import { buildOutline, MEASURE_STATION_MM, sampleOutline } from "./outline";
import { DEFAULT_FALLBACK_ROCKER, ROCKER_LIFT_RANGE_IN, rockerStationPositions } from "./rocker";
import { prepareRootCurve } from "./root-curve";
import { STEADY_EPSILON_MM } from "./tip-taper";
import { inchesToMm, mm, type Mm } from "./units";
import { isPickable } from "@/lib/blanks/catalog";

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
    noseTip: DEFAULT_FOIL_SPEC.noseTip,
    tailTip: DEFAULT_FOIL_SPEC.tailTip,
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

  it("draws the foil through the five stored thicknesses with the square-root fall (Phase 14 D-13)", () => {
    const curve = prepareRootCurve(
      foilStationPoints(DEFAULT_FOIL_SPEC, length).map((p) => ({ x: p.station, y: p.thickness })),
      "fall",
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

describe("the first board a visitor sees, on the square-root rule (Phase 14 D-13)", () => {
  // The store's default board: the default length, foil and hand-set rocker, no blank. Every
  // expected number is the typed station value itself — nothing is typed here.
  const length = DEFAULT_BOARD_SPEC.outline.length;
  const profile = buildBoardProfile({ length, rocker: DEFAULT_FALLBACK_ROCKER, foil: DEFAULT_FOIL_SPEC, blank: null });

  it("the first board a visitor sees draws through its same five rocker numbers and five thicknesses, to the last bit (acceptance 8)", () => {
    for (const { key, station } of rockerStationPositions(length)) {
      expect(profile.rockerAt(station), `rocker ${key}`).toBe(key === "center" ? 0 : DEFAULT_FALLBACK_ROCKER[key]);
      expect(profile.thicknessAt(station), `thickness ${key}`).toBe(DEFAULT_FOIL_SPEC[key]);
    }
    expect(profile.effectiveFoil).toEqual(DEFAULT_FOIL_SPEC);
    expect(profile.stationRocker).toEqual({ ...DEFAULT_FALLBACK_ROCKER, center: 0 });

    // The rocker's lowest point is exactly 0 and it never dips below it: a 1/8" sweep plus the five
    // stations themselves.
    const eighth = inchesToMm(0.125);
    const readAt: Mm[] = rockerStationPositions(length).map(({ station }) => station);
    for (let s = 0; s <= length; s += eighth) readAt.push(mm(s));
    readAt.push(length);
    const lowest = Math.min(...readAt.map((s) => profile.rockerAt(s)));
    expect(lowest).toBe(0);

    // R3: the deck stays derived — rocker + thickness exactly, on a 1" sweep.
    const inch = inchesToMm(1);
    const deckMismatches: number[] = [];
    for (let s = 0; s <= length; s += inch) {
      if (profile.deckAt(mm(s)) !== profile.rockerAt(mm(s)) + profile.thicknessAt(mm(s))) deckMismatches.push(s);
    }
    expect(deckMismatches).toEqual([]);
  });

  it("is the square-root rise and fall between the stations, not today's curve", () => {
    const rise = prepareRootCurve(
      rockerStationPositions(length).map(({ key, station }) => ({
        x: station,
        y: key === "center" ? 0 : DEFAULT_FALLBACK_ROCKER[key],
      })),
      "rise",
    );
    const fall = prepareRootCurve(
      foilStationPoints(DEFAULT_FOIL_SPEC, length).map((p) => ({ x: p.station, y: p.thickness })),
      "fall",
    );
    const mismatches = sweep(length, 72).filter(
      (s) => profile.rockerAt(s) !== rise.sample(s) || profile.thicknessAt(s) !== fall.sample(s),
    );
    expect(mismatches).toEqual([]);
    const pchip = buildBoardProfile({
      length,
      rocker: DEFAULT_FALLBACK_ROCKER,
      foil: DEFAULT_FOIL_SPEC,
      blank: null,
      handSetCurve: "pchip",
    });
    const moved = sweep(length, 72).filter((s) => pchip.thicknessAt(s) !== profile.thicknessAt(s));
    expect(moved.length).toBeGreaterThan(0);
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

describe("Remove This Blank on a board whose tail sits below its centre (Phase 14 code review WR-02)", () => {
  // The review's example: the default 6'0" outline on the Arctic Foam 7'9" SBF at a 1 1/4" centre,
  // default tips, Pin deck, both starts on Automatic, laid where the fit check puts it. Under Pin
  // deck the tail's thinning comes off the bottom, which drops that tip below the board's centre.
  const record = findBlank("Arctic Foam", `7'9" SBF`);
  const prepared = prepareBlank(record);
  const length = DEFAULT_BOARD_SPEC.outline.length;
  const geometry = buildOutline(DEFAULT_BOARD_SPEC.outline);
  const foil = { ...DEFAULT_FOIL_SPEC, center: inchesToMm(1.25) };
  const verdict = judgeBlank(
    prepared,
    {
      board: {
        length,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset: mm(0),
        tail12Offset: mm(0),
        ...DEFAULT_BLANK_CUT,
      },
      halfWidthAt: (s: Mm) => sampleOutline(geometry, s),
      widePointStation: geometry.widePointStation,
    },
    toFitSettings(DEFAULT_FIT_DEFAULTS),
  );
  const onBlank = buildBoardProfile({
    length,
    rocker: DEFAULT_FALLBACK_ROCKER,
    foil,
    blank: { prepared, placement: verdict.placement, nose12Offset: mm(0), tail12Offset: mm(0), ...DEFAULT_BLANK_CUT },
  });
  const handSet = handSetFromProfile(onBlank, foil);
  const after = buildBoardProfile({ length, rocker: handSet.rocker, foil: handSet.foil, blank: null });
  const lifts: Record<FoilStationKey, Mm> = { ...handSet.rocker, center: mm(0) };
  const range = { min: inchesToMm(ROCKER_LIFT_RANGE_IN.min), max: inchesToMm(ROCKER_LIFT_RANGE_IN.max) };

  it("really is a board whose tail tip sits below its centre, so this test cannot go vacuous", () => {
    expect(onBlank.blank).not.toBeNull();
    expect(onBlank.stationRocker.tailTip - onBlank.stationRocker.center).toBeLessThan(0);
  });

  it("seeds every lift inside the hand-set range — the tail tip at the range's minimum", () => {
    for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
      expect(handSet.rocker[key], key).toBeGreaterThanOrEqual(range.min);
      expect(handSet.rocker[key], key).toBeLessThanOrEqual(range.max);
    }
    expect(handSet.rocker.tailTip).toBe(range.min);
  });

  it("the hand-set board reads exactly those five numbers, from its station rocker and from its drawing", () => {
    for (const { key, station } of after.stations) {
      expect(after.stationRocker[key], key).toBe(lifts[key]);
      expect(after.rockerAt(station), key).toBe(lifts[key]);
    }
  });
});

describe("each tip's thinning start on the side profile (Phase 14 D-02, D-12, D-24)", () => {
  // A pickable blank and a board 2" shorter than it (the stress set's own rule).
  const regular = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(regular);
  const length = mm(prepared.lengthMm - inchesToMm(2));
  const foil = { ...DEFAULT_FOIL_SPEC, center: inchesToMm(2.5) };
  const board = (starts: { noseThinningStart?: Mm; tailThinningStart?: Mm } = {}) =>
    buildBoardProfile({
      length,
      rocker: DEFAULT_FALLBACK_ROCKER,
      foil,
      blank: { prepared, placement: mm(0), nose12Offset: mm(0), tail12Offset: mm(0), ...DEFAULT_BLANK_CUT, ...starts },
    });
  // The 10'9" longboard blank: long enough for every board length below.
  const longboard = prepareBlank(findBlank("Arctic Foam", `10'9" LB`));

  /** Freezes an object and every plain object inside it — all but the shared prepared blank — so any write throws. */
  function deepFreeze<T>(value: T): T {
    if (value && typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) if (key !== "prepared") deepFreeze(inner);
      Object.freeze(value);
    }
    return value;
  }

  it("is the blank fit's own per-tip view, exactly", () => {
    expect(isPickable(regular)).toBe(true);
    const input = boardInput({ length, centerThickness: foil.center });
    const profile = buildBlankProfile(prepared, input, mm(0));
    expect(profile.blank!.tips).toEqual(boardOnBlank(prepared, input, mm(0)).tips);
    expect(board().blank!.tips).toEqual(profile.blank!.tips);
  });

  it("reads Automatic on both tips when the board stores no start, and follows Automatic's own distance", () => {
    // The board on M-Regular, and a board 2" shorter than the longboard blank slid to its tail end
    // (where the tail's Automatic start moves further in than 12").
    const longLength = mm(longboard.lengthMm - inchesToMm(2));
    const tailEnd = placementRange(longboard.lengthMm, longLength).min;
    const views = [
      board().blank!.tips,
      buildBlankProfile(longboard, boardInput({ length: longLength, centerThickness: foil.center }), tailEnd).blank!.tips,
    ].flatMap((tips) => [tips.nose, tips.tail]);
    for (const view of views) {
      expect(view.automatic).toBe(true);
      expect(view.fromTip).toBe(view.automaticStart);
      expect(view.reachesStation).toBe(view.automaticStart - MEASURE_STATION_MM > STEADY_EPSILON_MM);
    }
    // Both answers occur, so the rule above is really exercised.
    expect(views.some((view) => view.reachesStation)).toBe(true);
    expect(views.some((view) => !view.reachesStation)).toBe(true);
  });

  it('a tail start stored at 18" reads 18", set by hand, and leaves the nose\'s view alone', () => {
    const automatic = board().blank!.tips;
    const handSet = board({ tailThinningStart: inchesToMm(18) }).blank!.tips;
    expect(handSet.tail.fromTip).toBe(inchesToMm(18));
    expect(handSet.tail.automatic).toBe(false);
    expect(handSet.tail.automaticStart).toBe(automatic.tail.automaticStart);
    expect(handSet.nose).toEqual(automatic.nose);
  });

  it("a stored start further in than a shortened board's centre reads the range's far end, and comes back when the board is lengthened", () => {
    const stored = inchesToMm(36);
    const profileAt = (boardLength: Mm) => {
      const input = deepFreeze({
        length: boardLength,
        rocker: { ...DEFAULT_FALLBACK_ROCKER },
        foil: { ...foil },
        blank: {
          prepared: longboard,
          placement: mm(0),
          nose12Offset: mm(0),
          tail12Offset: mm(0),
          ...DEFAULT_BLANK_CUT,
          tailThinningStart: stored,
          noseThinningStart: stored,
        },
      });
      const profile = buildBoardProfile(input);
      // Nothing is written back: the stored starts are the ones passed in.
      expect(input.blank.tailThinningStart).toBe(stored);
      expect(input.blank.noseThinningStart).toBe(stored);
      return profile.blank!.tips;
    };

    const short = profileAt(inchesToMm(60));
    for (const view of [short.tail, short.nose]) {
      expect(view.range.max).toBeLessThan(stored);
      expect(view.fromTip).toBe(view.range.max);
      expect(view.automatic).toBe(false);
    }
    const long = profileAt(inchesToMm(96));
    expect(long.tail.fromTip).toBe(stored);
    expect(long.nose.fromTip).toBe(stored);
  });

  it("carries each tip's mark station, and a hand-set start moves only its own tip's mark", () => {
    const automatic = board().blank!.tips;
    const tailMoved = board({ tailThinningStart: inchesToMm(18) }).blank!.tips;
    const noseMoved = board({ noseThinningStart: inchesToMm(15) }).blank!.tips;
    for (const tips of [automatic, tailMoved, noseMoved]) {
      expect(tips.tail.station).toBe(tips.tail.fromTip);
      expect(tips.nose.station).toBe(length - tips.nose.fromTip);
    }
    expect(tailMoved.tail.station).not.toBe(automatic.tail.station);
    expect(tailMoved.nose.station).toBe(automatic.nose.station);
    expect(noseMoved.nose.station).not.toBe(automatic.nose.station);
    expect(noseMoved.tail.station).toBe(automatic.tail.station);
  });
});
