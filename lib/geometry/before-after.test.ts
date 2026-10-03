import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { buildStressSet, STRESS_FIT_SETTINGS, type StressCase } from "./__fixtures__/phase14-stress-set";
import { PHASE14_TODAY } from "./__fixtures__/phase14-today";
import {
  boardFigures,
  boardProfileWith,
  compareFigures,
  movesReportLines,
  RULES_BEFORE_CURVES,
  RULES_BEFORE_TIPS,
  RULES_LIVE,
  summarizeMoves,
  tipsReportLines,
  type BoardFigures,
  type BoardMove,
} from "./before-after";
import { fitAt, prepareBlank, prepareBlankPchip } from "./blank-fit";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBoardProfile } from "./board-profile";
import { summarizeDesign, type DesignSummaryFields } from "./design";
import type { FoilStationKey } from "./foil";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { formatMark } from "./measure-display";
import { buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { inchesToMm, mm, type Mm } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";

// Every expected number is either the live site's own output pinned by
// scripts/extract-phase14-today-golden.ts (commit ed39f4a), or computed here from the app's own
// functions — never typed (CLAUDE.md Rule 1).

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const STATION_KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/** A preset as the store opens it and its card summarises it (`presetSummary`). */
function presetFields(preset: (typeof BOARD_PRESETS)[number]): DesignSummaryFields {
  return { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
}

/** The first board a visitor sees: the store's DEFAULT_DESIGN_STATE, no blank — the pin's own fields. */
const DEFAULT_FIELDS: DesignSummaryFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rails: DEFAULT_RAIL_BAND_SPEC,
  foil: DEFAULT_FOIL_SPEC,
  railsImportFoilThickness: true,
  volume: DEFAULT_VOLUME_SPEC,
  rocker: DEFAULT_FALLBACK_ROCKER,
  blank: null,
};

describe("today's rules, kept by name, reproduce the pin (D-25, D-26)", () => {
  it("names today's blank preparation and hand-set curve, and the live ones", () => {
    expect(RULES_BEFORE_CURVES.prepare).toBe(prepareBlankPchip);
    expect(RULES_BEFORE_CURVES.handSetCurve).toBe("pchip");
    expect(RULES_LIVE.prepare).toBe(prepareBlank);
    expect(RULES_LIVE.handSetCurve).toBe("root");
  });

  for (const preset of BOARD_PRESETS) {
    it(`reproduces the ${preset.name} preset's five thicknesses, five rocker numbers and litres`, () => {
      const pinned = PHASE14_TODAY.presets.find((entry) => entry.id === preset.id);
      expect(pinned, `the pin carries ${preset.id}`).toBeDefined();
      const figures = boardFigures(presetFields(preset), RULES_BEFORE_CURVES, SETTINGS);
      for (const key of STATION_KEYS) {
        expect(figures.thicknessMm[key], `thickness ${key}`).toBe(pinned!.thicknessMm[key]);
        expect(figures.rockerMm[key], `rocker ${key}`).toBe(pinned!.rockerMm[key]);
      }
      expect(figures.litres).toBe(pinned!.litres);
      expect(typeof figures.fits).toBe("boolean");
    });
  }

  it("reproduces the first board a visitor sees: its litres, five thicknesses and five rocker numbers", () => {
    const figures = boardFigures(DEFAULT_FIELDS, RULES_BEFORE_CURVES, SETTINGS);
    expect(figures.litres).toBe(PHASE14_TODAY.handSet.litres);
    for (const key of STATION_KEYS) {
      expect(figures.thicknessMm[key], `thickness ${key}`).toBe(PHASE14_TODAY.handSet.thicknessMm[key]);
      expect(figures.rockerMm[key], `rocker ${key}`).toBe(PHASE14_TODAY.handSet.rockerMm[key]);
    }
    expect(figures.fits).toBeNull();
  });
});

describe("the live rules are exactly what every screen shows", () => {
  const boards: { label: string; fields: DesignSummaryFields }[] = [
    ...BOARD_PRESETS.map((preset) => ({ label: preset.name, fields: presetFields(preset) })),
    { label: "the first board a visitor sees", fields: DEFAULT_FIELDS },
  ];

  for (const { label, fields } of boards) {
    it(`${label}: figures equal summarizeDesign and the live side profile`, () => {
      const figures = boardFigures(fields, RULES_LIVE, SETTINGS);
      expect(figures.litres).toBe(summarizeDesign(fields).volumeLitres);
      const blank = fields.blank;
      const live = buildBoardProfile({
        length: fields.outline.length,
        rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
        foil: fields.foil,
        blank: blank
          ? {
              prepared: prepareBlank(blank.copy),
              placement: blank.placement,
              nose12Offset: blank.nose12Offset,
              tail12Offset: blank.tail12Offset,
              deckSkin: blank.deckSkin,
              tipStyle: blank.tipStyle,
              fineTuneSurface: blank.fineTuneSurface,
            }
          : null,
      });
      expect(figures.thicknessMm).toEqual(live.effectiveFoil);
      expect(figures.rockerMm).toEqual(live.stationRocker);
      if (live.blank) {
        const outline = buildOutline(fields.outline);
        const expected = fitAt(live.blank.onBlank, (s) => sampleOutline(outline, s), outline.widePointStation, SETTINGS);
        expect(figures.fits).toBe(expected.fits);
      } else {
        expect(figures.fits).toBeNull();
      }

      // boardProfileWith is that same profile, read along the whole board.
      const profile = boardProfileWith(fields, RULES_LIVE);
      for (let i = 0; inchesToMm(i) <= fields.outline.length; i++) {
        const s = inchesToMm(i);
        expect(profile.rockerAt(s), `rocker at ${i}"`).toBe(live.rockerAt(s));
        expect(profile.thicknessAt(s), `thickness at ${i}"`).toBe(live.thicknessAt(s));
      }
    });
  }

  it("boardProfileWith on today's rules draws a hand-set board with today's curve", () => {
    const pchip = buildBoardProfile({
      length: DEFAULT_FIELDS.outline.length,
      rocker: DEFAULT_FALLBACK_ROCKER,
      foil: DEFAULT_FOIL_SPEC,
      blank: null,
      handSetCurve: "pchip",
    });
    const profile = boardProfileWith(DEFAULT_FIELDS, RULES_BEFORE_CURVES);
    for (const point of PHASE14_TODAY.handSet.sweep) {
      expect(profile.rockerAt(mm(point.s))).toBe(pchip.rockerAt(mm(point.s)));
      expect(profile.thicknessAt(mm(point.s))).toBe(point.thickness);
    }
  });
});

/** Five numbers from one function of the station index — constructed inputs, never pinned values. */
function five(read: (index: number) => number): Record<FoilStationKey, Mm> {
  const out = {} as Record<FoilStationKey, Mm>;
  STATION_KEYS.forEach((key, index) => {
    out[key] = mm(read(index));
  });
  return out;
}

describe("compareFigures", () => {
  const before: BoardFigures = {
    thicknessMm: five((i) => 20 + i * 5),
    rockerMm: five((i) => 40 - i * 3),
    litres: 30,
    fits: true,
    reachesStation: { nose: false, tail: false },
  };

  it("reports the largest move of the ten station numbers, either way", () => {
    const thicknessShift = [0.2, -0.7, 0, 0.1, 0];
    const rockerShift = [0, 0.3, -1.1, 0, 0.4];
    const after: BoardFigures = {
      ...before,
      thicknessMm: five((i) => before.thicknessMm[STATION_KEYS[i]] + thicknessShift[i]),
      rockerMm: five((i) => before.rockerMm[STATION_KEYS[i]] + rockerShift[i]),
    };
    const expected = Math.max(
      ...STATION_KEYS.map((key) => Math.abs(after.thicknessMm[key] - before.thicknessMm[key])),
      ...STATION_KEYS.map((key) => Math.abs(after.rockerMm[key] - before.rockerMm[key])),
    );
    expect(compareFigures(before, after).stationMoveMm).toBe(expected);
    expect(compareFigures(before, before).stationMoveMm).toBe(0);
  });

  it("reports the litres change as a fraction of the before figure, signed", () => {
    const more = { ...before, litres: before.litres * 1.02 };
    const less = { ...before, litres: before.litres * 0.99 };
    expect(compareFigures(before, more).litresChange).toBe((more.litres - before.litres) / before.litres);
    expect(compareFigures(before, less).litresChange).toBe((less.litres - before.litres) / before.litres);
    expect(compareFigures(before, less).litresChange).toBeLessThan(0);
  });

  it("names what happened to the fit verdict", () => {
    const refused = { ...before, fits: false };
    const handSet = { ...before, fits: null };
    expect(compareFigures(before, before).verdict).toBe("same");
    expect(compareFigures(refused, refused).verdict).toBe("same");
    expect(compareFigures(before, refused).verdict).toBe("nowRefused");
    expect(compareFigures(refused, before).verdict).toBe("nowFits");
    expect(compareFigures(handSet, handSet).verdict).toBe("noBlank");
    expect(compareFigures(before, handSet).verdict).toBe("noBlank");
  });

  it("counts the tips that start further in than 12\" after, and none for a board with no blank", () => {
    const one = { ...before, reachesStation: { nose: false, tail: true } };
    const both = { ...before, reachesStation: { nose: true, tail: true } };
    const handSet = { ...before, fits: null, reachesStation: null };
    expect(compareFigures(before, before).startsPastStation).toBe(0);
    expect(compareFigures(before, one).startsPastStation).toBe(1);
    expect(compareFigures(both, one).startsPastStation).toBe(1);
    expect(compareFigures(before, both).startsPastStation).toBe(2);
    expect(compareFigures(handSet, handSet).startsPastStation).toBe(0);
  });

  it("takes the larger rise of the two 12\" thicknesses, after less before", () => {
    const tailUp = 0.9;
    const noseDown = -0.4;
    const after: BoardFigures = {
      ...before,
      thicknessMm: { ...before.thicknessMm, tail12: mm(before.thicknessMm.tail12 + tailUp), nose12: mm(before.thicknessMm.nose12 + noseDown) },
    };
    const expected = Math.max(
      after.thicknessMm.tail12 - before.thicknessMm.tail12,
      after.thicknessMm.nose12 - before.thicknessMm.nose12,
    );
    expect(compareFigures(before, after).twelveRiseMm).toBe(expected);
    expect(compareFigures(after, before).twelveRiseMm).toBe(
      Math.max(before.thicknessMm.tail12 - after.thicknessMm.tail12, before.thicknessMm.nose12 - after.thicknessMm.nose12),
    );
    expect(compareFigures(before, before).twelveRiseMm).toBe(0);
  });
});

describe("summarizeMoves", () => {
  const sixteenth = inchesToMm(1 / 16);
  const thirtySecond = inchesToMm(1 / 32);
  const moves: BoardMove[] = [
    { stationMoveMm: sixteenth * 2, litresChange: 0.015, verdict: "same", startsPastStation: 2, twelveRiseMm: sixteenth },
    { stationMoveMm: sixteenth, litresChange: -0.004, verdict: "nowRefused", startsPastStation: 0, twelveRiseMm: -thirtySecond },
    { stationMoveMm: thirtySecond * 1.5, litresChange: -0.02, verdict: "nowFits", startsPastStation: 1, twelveRiseMm: thirtySecond * 1.5 },
    { stationMoveMm: thirtySecond / 2, litresChange: 0.001, verdict: "noBlank", startsPastStation: 0, twelveRiseMm: 0 },
    { stationMoveMm: 0, litresChange: 0.008, verdict: "same", startsPastStation: 0, twelveRiseMm: 0 },
  ];

  it("counts boards, maxima and thresholds — a move exactly on a threshold is not over it", () => {
    const report = summarizeMoves(moves);
    expect(report.boards).toBe(moves.length);
    expect(report.withBlank).toBe(moves.filter((move) => move.verdict !== "noBlank").length);
    expect(report.maxStationMoveMm).toBe(Math.max(...moves.map((move) => move.stationMoveMm)));
    expect(report.overSixteenth).toBe(moves.filter((move) => move.stationMoveMm > sixteenth).length);
    expect(report.overThirtySecond).toBe(moves.filter((move) => move.stationMoveMm > thirtySecond).length);
    expect(report.overSixteenth).toBe(1);
    expect(report.overThirtySecond).toBe(3);
    expect(report.overOnePct).toBe(moves.filter((move) => Math.abs(move.litresChange) * 100 > 1).length);
    expect(report.nowRefused).toBe(1);
    expect(report.nowFits).toBe(1);
  });

  it("counts boards with a thinning start further in than 12\" and takes the largest 12\" rise", () => {
    const report = summarizeMoves(moves);
    expect(report.boardsWithStartPastStation).toBe(moves.filter((move) => move.startsPastStation > 0).length);
    expect(report.boardsWithStartPastStation).toBe(2);
    expect(report.maxTwelveRiseMm).toBe(Math.max(...moves.map((move) => move.twelveRiseMm)));
    // A report where every 12" thickness fell says nothing rose.
    const fell = summarizeMoves([{ ...moves[1] }]);
    expect(fell.maxTwelveRiseMm).toBe(0);
  });

  it("takes the median and largest size of the litres change, either way, in percent", () => {
    const sizes = moves.map((move) => Math.abs(move.litresChange) * 100).sort((a, b) => a - b);
    const report = summarizeMoves(moves);
    expect(report.litresMedianPct).toBe(sizes[2]);
    expect(report.litresMaxPct).toBe(sizes[sizes.length - 1]);

    const even = summarizeMoves(moves.slice(0, 4));
    const evenSizes = moves
      .slice(0, 4)
      .map((move) => Math.abs(move.litresChange) * 100)
      .sort((a, b) => a - b);
    expect(even.litresMedianPct).toBe((evenSizes[1] + evenSizes[2]) / 2);
  });

  it("reports zeros for no boards", () => {
    expect(summarizeMoves([])).toEqual({
      boards: 0,
      withBlank: 0,
      maxStationMoveMm: 0,
      overSixteenth: 0,
      overThirtySecond: 0,
      litresMedianPct: 0,
      litresMaxPct: 0,
      overOnePct: 0,
      nowRefused: 0,
      nowFits: 0,
      boardsWithStartPastStation: 0,
      maxTwelveRiseMm: 0,
    });
  });
});

describe("movesReportLines", () => {
  const HEADING = "Boards in a blank, today's curves → the new curves";
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /** An Imperial mark as `formatMark` prints one: whole inches and/or a reduced fraction, then `"`. */
  const INCHES = String.raw`-?(?:\d+|\d+ \d+/\d+|\d+/\d+)"`;
  const PATTERNS = [
    new RegExp(`^${escape(HEADING)}: \\d+ boards compared \\(\\d+ with a blank both ways\\)$`),
    new RegExp(
      `^  largest move of any station number: ${INCHES}; boards moving more than 1/16": \\d+; more than 1/32": \\d+$`,
    ),
    /^ {2}litres change: median \d+\.\d{2}%, largest \d+\.\d{2}%; boards moving more than 1%: \d+$/,
    /^ {2}fit verdicts: fits before, refused now: \d+; refused before, fits now: \d+$/,
  ];

  it("prints only counts, an Imperial length and percentages, in fixed sentences", () => {
    const moves: BoardMove[] = [
      { stationMoveMm: inchesToMm(0.3), litresChange: 0.0123, verdict: "same", startsPastStation: 0, twelveRiseMm: 0 },
      { stationMoveMm: inchesToMm(0.02), litresChange: -0.031, verdict: "nowRefused", startsPastStation: 0, twelveRiseMm: 0 },
    ];
    for (const report of [summarizeMoves(moves), summarizeMoves([])]) {
      const lines = movesReportLines(HEADING, report);
      expect(lines).toHaveLength(PATTERNS.length);
      lines.forEach((line, index) => expect(line).toMatch(PATTERNS[index]));
    }
  });

  it("carries the report's own numbers", () => {
    const moves: BoardMove[] = [
      { stationMoveMm: inchesToMm(0.3), litresChange: 0.0123, verdict: "nowFits", startsPastStation: 0, twelveRiseMm: 0 },
    ];
    const report = summarizeMoves(moves);
    const text = movesReportLines(HEADING, report).join("\n");
    expect(text).toContain(formatMark(mm(report.maxStationMoveMm), "imperial"));
    expect(text).toContain(`median ${report.litresMedianPct.toFixed(2)}%`);
    expect(text).toContain(`refused before, fits now: ${report.nowFits}`);
  });
});

/** A stress board (a blank, the board cut from it, where it sits) as the stored design a card reads. */
function stressFields(entry: StressCase): DesignSummaryFields {
  return {
    outline: { ...DEFAULT_BOARD_SPEC.outline, length: entry.board.length },
    rails: DEFAULT_RAIL_BAND_SPEC,
    foil: {
      ...DEFAULT_FOIL_SPEC,
      center: entry.board.centerThickness,
      noseTip: entry.board.noseTip,
      tailTip: entry.board.tailTip,
    },
    railsImportFoilThickness: true,
    volume: DEFAULT_VOLUME_SPEC,
    rocker: DEFAULT_FALLBACK_ROCKER,
    blank: {
      copy: entry.record,
      placement: entry.placement,
      nose12Offset: entry.board.nose12Offset,
      tail12Offset: entry.board.tail12Offset,
      deckSkin: entry.board.deckSkin,
      tipStyle: entry.board.tipStyle,
      fineTuneSurface: entry.board.fineTuneSurface,
    },
  };
}

describe("the tips step: what is live after go-live 1 against what will be live after go-live 2 (D-18, D-25, D-27)", () => {
  it("names the 12\" blend on the new curves", () => {
    expect(RULES_BEFORE_TIPS.prepare).toBe(prepareBlank);
    expect(RULES_BEFORE_TIPS.handSetCurve).toBe("root");
    expect(RULES_BEFORE_TIPS.tipRule).toBe("blend");
    // The only difference from the live rules is the tip rule.
    expect({ ...RULES_BEFORE_TIPS, tipRule: RULES_LIVE.tipRule }).toEqual(RULES_LIVE);
  });

  it("moves no preset's station number (all eight starts are 12\") and moves the litres", () => {
    const moves = BOARD_PRESETS.map((preset) =>
      compareFigures(
        boardFigures(presetFields(preset), RULES_BEFORE_TIPS, SETTINGS),
        boardFigures(presetFields(preset), RULES_LIVE, SETTINGS),
      ),
    );
    for (const move of moves) {
      expect(move.stationMoveMm).toBe(0);
      expect(move.startsPastStation).toBe(0);
      expect(move.twelveRiseMm).toBe(0);
    }
    expect(moves.some((move) => move.litresChange !== 0)).toBe(true);
  });

  it("the board on the 10'9\" longboard blank slid to the tail end starts further in than 12\", and its 12\" thickness rises", () => {
    const longboard = readSeedCatalog().filter((record) => record.vendor === "Arctic Foam" && record.name === `10'9" LB`);
    expect(longboard).toHaveLength(1);
    const cases = buildStressSet(longboard, prepareBlank).filter((entry) => entry.place === "tail");
    expect(cases.length).toBeGreaterThan(0);
    const moves = cases.map((entry) =>
      compareFigures(
        boardFigures(stressFields(entry), RULES_BEFORE_TIPS, STRESS_FIT_SETTINGS),
        boardFigures(stressFields(entry), RULES_LIVE, STRESS_FIT_SETTINGS),
      ),
    );
    const atTwoAndAHalf = moves[cases.findIndex((entry) => entry.centreIn === 2.5)];
    expect(atTwoAndAHalf, 'the 2 1/2" centre board is in the set').toBeDefined();
    expect(atTwoAndAHalf.startsPastStation).toBeGreaterThanOrEqual(1);
    expect(atTwoAndAHalf.twelveRiseMm).toBeGreaterThan(0);
    // The blend never reads a start further in than 12", so the before side has none.
    const before = boardFigures(stressFields(cases[0]), RULES_BEFORE_TIPS, STRESS_FIT_SETTINGS);
    expect(before.reachesStation).toEqual({ nose: false, tail: false });
  });
});

describe("tipsReportLines", () => {
  /** An Imperial mark as `formatMark` prints one: whole inches and/or a reduced fraction, then `"`. */
  const INCHES = String.raw`-?(?:\d+|\d+ \d+/\d+|\d+/\d+)"`;
  const PATTERNS = [
    /^ {2}tips: boards with a thinning start further in than 12": \d+ of \d+ with a blank$/,
    new RegExp(`^  largest rise of a 12" thickness: ${INCHES}$`),
  ];
  const moves: BoardMove[] = [
    { stationMoveMm: inchesToMm(0.1), litresChange: 0.004, verdict: "same", startsPastStation: 1, twelveRiseMm: inchesToMm(0.07) },
    { stationMoveMm: 0, litresChange: 0.001, verdict: "same", startsPastStation: 0, twelveRiseMm: 0 },
    { stationMoveMm: 0, litresChange: 0, verdict: "noBlank", startsPastStation: 0, twelveRiseMm: 0 },
  ];

  it("prints only fixed words, counts and one Imperial length", () => {
    for (const report of [summarizeMoves(moves), summarizeMoves([])]) {
      const lines = tipsReportLines(report);
      expect(lines).toHaveLength(PATTERNS.length);
      lines.forEach((line, index) => expect(line).toMatch(PATTERNS[index]));
    }
  });

  it("carries the report's own numbers", () => {
    const report = summarizeMoves(moves);
    const text = tipsReportLines(report).join("\n");
    expect(text).toContain(`${report.boardsWithStartPastStation} of ${report.withBlank} with a blank`);
    expect(text).toContain(formatMark(mm(report.maxTwelveRiseMm), "imperial"));
  });
});
