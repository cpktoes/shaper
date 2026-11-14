import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky. A case with its own, longer limit keeps it.
vi.setConfig({ testTimeout: 60_000 });
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { buildFallbackProfile } from "../geometry/board-profile";
import { buildBoardSurface } from "../geometry/board-surface";
import { DEFAULT_BOTTOM, cutKind, resolveBottom, resolveCut, startingCut, stationFromNearestTip, type BoardBottom, type BottomBoard, type BottomCutName } from "../geometry/bottom";
import { brdFittedBottomBoard, brdStringerLift, measureBrdBottom } from "../geometry/brd-bottom";
import { fitBrdFins, noBrdFins } from "../geometry/brd-fins";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "../geometry/fins";
import { formatBottomStation } from "../geometry/blank-reasons";
import { RAIL_NUDGE_NAMES, DEFAULT_RAIL_BAND_SPEC, computeRailSectionOutput, railFamilyLabel } from "../geometry/rail-bands";
import { brdOurRailHalf, brdRailBoard } from "../geometry/brd-rails";
import { BRD_FIT_TIP_SKIP_MM, BRD_STRAIGHTEDGE_MM, brdFileStations, brdFileWidths, fitBoardToBrd, fitOutlineWidths, outlineGapSide } from "../geometry/brd-fit";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "../geometry/design";
import { formatControlNumber, formatDim, formatMark, formatMarkOrLess, formatSignedDim, formatSignedMark, stationLabel } from "../geometry/measure-display";
import { MEASURE_STATION_MM, buildOutline } from "../geometry/outline";
import { formatCentimetres, formatFeetInches, formatInchesFraction, inchesToMm, mm } from "../geometry/units";
import { effectiveWingRadius, wingRadiusTop } from "../geometry/wings";
import { phase16Boards, phase16RailCharacterBoards, phase16WingBoards } from "../geometry/__fixtures__/phase16-boards";
import { brdBottomStations, brdFinHeaderFields, brdText } from "./brd";
import { BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y, brdStationX } from "./brd-preview";
import {
  BRD_FIT_COPY,
  brdFitFrames,
  brdFitFramesInBox,
  brdFitSheet,
  brdFitWords,
  brdLengthWords,
  closenessSentence,
  gapWhere,
  lessThan,
  BRD_BOTTOM_DRAWING_WIDTH,
  brdBottomFrames,
  brdBottomRows,
  brdFitLook,
  brdRailFrames,
  brdRailRows,
  type BrdFitLook,
} from "./brd-fit-preview";
import { BOTTOM_COPY } from "@/components/bottom/bottom-copy";
import { BOARD_NAME_MAX_LENGTH } from "../models/board-file";
import { readAnyBrd, type ReadBrdBoard } from "./brd-read";

/**
 * The closest-fit preview's layout and words (quick 261113-d9b), on a round-trip Shortboard: the app's own file, read back
 * and fitted. Expected strings are built from the same display functions the words use, over the look's own values.
 */

const fields = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const geometry = buildOutline(fields.outline);
const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
const surface = buildBoardSurface({
  sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
  geometry,
  rockerAt: profile.rockerAt,
});
const read = readAnyBrd(Uint8Array.from(brdText(surface).text, (ch) => ch.charCodeAt(0)));
if (!read.ok) throw new Error("the app's own file would not read");
const board = read.board;
const look: BrdFitLook = brdFitLook(board);

const spread = (points: readonly P2[], axis: 0 | 1) => {
  const values = points.map((p) => p[axis]);
  return Math.max(...values) - Math.min(...values);
};

describe("brdFitFrames", () => {
  const frames = brdFitFrames(look, 700);

  it("draws the nose left of the tail, through the Board file preview's own mapping", () => {
    const at = { scale: frames.scale, length: board.length };
    expect(brdStationX(at, board.length)).toBeLessThan(brdStationX(at, 0));
    expect(frames.top.stringer.x1).toBeCloseTo(brdStationX(at, board.length), 9);
    expect(frames.top.stringer.x2).toBeCloseTo(brdStationX(at, 0), 9);
    expect(frames.top.stringer.x1).toBeLessThan(frames.top.stringer.x2);
    expect(frames.scale).toBeCloseTo((700 - 2 * BRD_PREVIEW_PAD_X) / board.length, 12);
  });

  it("draws the file and the fit at one scale: their widest half-widths agree within a dot", () => {
    expect(Math.abs(spread(frames.top.file, 1) - spread(frames.top.fit, 1)) / 2).toBeLessThan(1);
    expect(spread(frames.top.file, 0)).toBeCloseTo(board.length * frames.scale, 6);
  });

  it("makes the side view's drawing four times as tall at ×4 as at ×1, the pads aside", () => {
    const one = brdFitFrames(look, 700, 1);
    const four = brdFitFrames(look, 700, 4);
    expect(four.side.heightFactor).toBe(4);
    expect(four.side.height - 2 * BRD_PREVIEW_PAD_Y).toBeCloseTo(4 * (one.side.height - 2 * BRD_PREVIEW_PAD_Y), 9);
    expect(four.top.height).toBe(one.top.height);
  });

  it("keeps the board's own lines inside the side view", () => {
    for (const [, y] of [...frames.side.file, ...frames.side.fitBottom, ...frames.side.fitDeck]) {
      expect(y).toBeGreaterThanOrEqual(BRD_PREVIEW_PAD_Y - 1e-9);
      expect(y).toBeLessThanOrEqual(frames.side.height - BRD_PREVIEW_PAD_Y + 1e-9);
    }
  });
});

describe("brdFitWords", () => {
  it("writes the Imperial size line and marks", () => {
    const words = brdFitWords(look, "imperial");
    expect(words.size).toBe(
      `${formatFeetInches(board.length)} × ${formatInchesFraction(board.width!)} × ${formatInchesFraction(board.thickness!)}`,
    );
    const c = look.fit.closeness;
    expect(words.outline).toEqual({
      largest: formatMarkOrLess(c.outline.largest, "imperial"),
      typical: formatMarkOrLess(c.outline.typical, "imperial"),
      at: formatDim(c.outline.at, "imperial"),
      where: expect.stringMatching(/ from the (tail|nose)$/),
      side: outlineGapSide(board.outline, look.fit.lines.outline, c.outline.at),
    });
    expect(words.rocker.at).toBe(formatDim(c.rocker.at, "imperial"));
    expect(words.thickness.largest).toBe(formatMarkOrLess(c.thickness.largest, "imperial"));
    expect(words.tipSkip).toBe(formatDim(inchesToMm(1), "imperial"));
    expect(words.controls.station).toBe(stationLabel("imperial"));
    expect(words.controls.length).toBe(formatFeetInches(look.fit.outline.length));
    expect(words.controls.rocker.tail12).toBe(formatMark(look.fit.rocker.tail12, "imperial"));
    expect(words.controls.thickness.center).toBe(formatMark(look.fit.foil.center, "imperial"));
    expect(words.controls.offset).toBe(formatSignedDim(look.fit.outline.widePointOffset, "imperial"));
  });

  it("writes angles and percentages the way the opened board's own labels will read them", () => {
    const words = brdFitWords(look, "imperial");
    expect(words.controls.noseAngle).toBe(`${formatControlNumber(look.fit.outline.noseAngle)}°`);
    expect(words.controls.tailFullness).toBe(`${formatControlNumber(look.fit.outline.tailFullness)}%`);
    expect(words.controls.noseRail).toBe(`${formatControlNumber(look.fit.outline.noseRailLength)}%`);
    // Two decimals at most, never the raw value.
    expect(words.controls.noseAngle).toMatch(/^\d+(\.\d{1,2})?°$/);
  });

  it("names the tail and gives a squash its block and a pointed tail none", () => {
    const squash = brdFitWords(look, "imperial").controls;
    expect(look.fit.outline.tail.kind).toBe("squash");
    expect(squash.tail).toBe("Squash");
    expect(squash.tailBlock).toBe(formatDim((look.fit.outline.tail as { endWidth: number }).endWidth as never, "imperial"));
    const pointed = brdFitWords({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "pin" } } } }, "imperial").controls;
    expect(pointed.tail).toBe("Pin");
    expect(pointed.tailBlock).toBeNull();
    const round = brdFitWords({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "round" } } } }, "imperial").controls;
    expect(round.tail).toBe("Round");
  });

  it("writes Metric: the unit once at the end of the size line, whole-millimetre gaps, centimetre distances", () => {
    const words = brdFitWords(look, "metric");
    expect(words.size).toBe(`${[board.length, board.width!, board.thickness!].map(formatCentimetres).join(" × ")} cm`);
    expect(words.size.match(/cm/g)).toHaveLength(1);
    expect(words.outline.largest).toMatch(/^(<1|\d+) mm$/);
    expect(words.outline.at).toBe(`${formatCentimetres(look.fit.closeness.outline.at)} cm`);
    expect(words.controls.station).toBe(stationLabel("metric"));
    expect(words.controls.rocker.nose12).toMatch(/^\d+ mm$/);
  });

  it("says less than a millimetre for a gap that is there but under half one, and 0 for none", () => {
    const tiny = (largest: number) => ({
      ...look,
      fit: { ...look.fit, closeness: { ...look.fit.closeness, outline: { largest: mm(largest), typical: mm(largest), at: mm(0) } } },
    });
    expect(brdFitWords(tiny(0.3), "metric").outline.largest).toBe("<1 mm");
    expect(brdFitWords(tiny(0), "metric").outline.largest).toBe("0 mm");
    expect(brdFitWords(tiny(0.3), "imperial").outline.largest).toBe('<1/16"');
  });

  it("falls back to the lines for a file with no size fields", () => {
    const bare = { ...look, board: { ...board, width: null, thickness: null } };
    const words = brdFitWords(bare, "metric");
    expect(words.size).toMatch(/^\d+\.\d × \d+\.\d × \d+\.\d cm$/);
  });
});

describe("brdLengthWords", () => {
  it("gives a length and the app's shortest and longest board in each system", () => {
    expect(brdLengthWords(mm(4000), "imperial")).toEqual([
      formatFeetInches(mm(4000)),
      formatFeetInches(inchesToMm(BOARD_LENGTH_RANGE_IN.min)),
      formatFeetInches(inchesToMm(BOARD_LENGTH_RANGE_IN.max)),
    ]);
    expect(brdLengthWords(mm(4000), "metric")).toEqual([
      formatDim(mm(4000), "metric"),
      formatDim(inchesToMm(BOARD_LENGTH_RANGE_IN.min), "metric"),
      formatDim(inchesToMm(BOARD_LENGTH_RANGE_IN.max), "metric"),
    ]);
  });
});

describe("closenessSentence", () => {
  const words = { largest: '1/8"', typical: '1/16"', at: '7"', where: '7" from the tail', side: "narrower" as const };

  it("reads the widest gap, and which way the file lies when it is the outline", () => {
    expect(closenessSentence("Outline", words)).toBe(
      'Outline: within 1/8", typically 1/16" — the widest gap 7" from the tail, where the file is narrower than our fit',
    );
    expect(closenessSentence("Outline", { ...words, side: "wider" })).toMatch(/, where the file is wider than our fit$/);
    expect(closenessSentence("Rocker", { ...words, side: null })).toBe('Rocker: within 1/8", typically 1/16" — the widest gap 7" from the tail');
  });

  it("says less than, never within <, for a figure under the smallest step", () => {
    const s = closenessSentence("Rocker", { ...words, largest: '<1/16"', typical: '<1/16"', side: null });
    expect(s).toBe('Rocker: less than 1/16" off, typically less than 1/16" — the widest gap 7" from the tail');
    expect(s).not.toContain("within <");
    expect(closenessSentence("Thickness", { ...words, largest: "<1 mm", typical: "<1 mm", where: "17.9 cm from the nose", side: null })).toBe(
      "Thickness: less than 1 mm off, typically less than 1 mm — the widest gap 17.9 cm from the nose",
    );
    expect(closenessSentence("Outline", { ...words, largest: "2 mm", typical: "<1 mm" })).toMatch(/^Outline: within 2 mm, typically less than 1 mm — /);
  });
});

describe("brdFitWords where the widest gap is", () => {
  it("measures from the nearer end", () => {
    const at = (station: number) => ({
      ...look,
      fit: { ...look.fit, closeness: { ...look.fit.closeness, outline: { largest: mm(3), typical: mm(1), at: mm(station) } } },
    });
    const near = brdFitWords(at(inchesToMm(7)), "imperial").outline;
    expect(near.where).toBe(`${formatDim(inchesToMm(7), "imperial")} from the tail`);
    const far = brdFitWords(at(board.length - inchesToMm(7)), "imperial").outline;
    expect(far.where).toBe(`${formatDim(mm(board.length - (board.length - inchesToMm(7))), "imperial")} from the nose`);
    expect(brdFitWords(at(board.length / 2), "imperial").outline.where).toMatch(/ from the tail$/);
    expect(brdFitWords(at(inchesToMm(7)), "metric").outline.where).toBe(`${formatCentimetres(inchesToMm(7))} cm from the tail`);
  });

  it("says which way for the outline alone", () => {
    const w = brdFitWords(look, "imperial");
    expect(w.rocker.side).toBeNull();
    expect(w.thickness.side).toBeNull();
    expect(w.outline.side).toBe(outlineGapSide(board.outline, look.fit.lines.outline, look.fit.closeness.outline.at));
  });
});

/** A made-up board: a pointed nose, a square tail, a gentle rocker, written as the lines a reader would hand over. */
function madeUp(lengthIn: number, widthIn: number): BrdFitLook {
  const L = inchesToMm(lengthIn);
  const half = inchesToMm(widthIn) / 2;
  const outline: P2[] = [[0, 0], [0, half * 0.5], [L * 0.2, half * 0.9], [L * 0.45, half], [L * 0.8, half * 0.75], [L, 0]];
  const bottom: P2[] = [[0, 60], [L * 0.1, 20], [L / 2, 0], [L * 0.9, 25], [L, 90]];
  const deck: P2[] = bottom.map(([x, y]): P2 => [x, y + (x === 0 || x === L ? 25 : 60)]);
  const made = { length: mm(L), width: mm(2 * half), thickness: mm(60), outline, bottom, deck, sections: [], fins: noBrdFins() };
  return { board: made, fit: fitBoardToBrd({ length: made.length, outline, bottom, deck }), bottom: null, planedBottom: bottom, rails: null, fins: null };
}

describe("brdFitFramesInBox", () => {
  const shapes: [string, BrdFitLook][] = [["the Shortboard", look], ["a made-up 5'0\" x 25\" board", madeUp(60, 25)]];

  it.each(shapes)("fits both views and the gap inside the box for %s", (_name, l) => {
    for (const height of [1, 2, 4, 8] as const) {
      const box = { width: 600, height: 700 };
      const gap = 24;
      const f = brdFitFramesInBox(l, box, height, gap);
      expect(f.top.height + gap + f.side.height).toBeLessThanOrEqual(box.height + 1e-9);
      expect(f.scale).toBeLessThanOrEqual(box.width / l.board.length + 1e-12);
      for (const [x] of [...f.top.file, ...f.top.fit, ...f.side.file, ...f.side.fitBottom, ...f.side.fitDeck]) {
        expect(x).toBeGreaterThanOrEqual(-1e-9);
        expect(x).toBeLessThanOrEqual(box.width + 1e-9);
      }
      expect(f.top.stringer.x1).toBeLessThan(f.top.stringer.x2);
    }
  });

  it("uses the whole width when the box is tall enough, and shrinks both views together when it is not", () => {
    const wide = brdFitFramesInBox(look, { width: 600, height: 5000 }, 2, 20);
    expect(wide.scale).toBeCloseTo(600 / look.board.length, 12);
    const short = brdFitFramesInBox(look, { width: 600, height: 120 }, 2, 20);
    expect(short.scale).toBeLessThan(wide.scale);
    expect(short.top.height + 20 + short.side.height).toBeCloseTo(120, 6);
  });

  it("leaves brdFitFrames exactly as it was", () => {
    const f = brdFitFrames(look, 700, 2);
    expect(f.scale).toBeCloseTo((700 - 2 * BRD_PREVIEW_PAD_X) / board.length, 12);
    expect(f.top.height).toBeCloseTo(2 * (BRD_PREVIEW_PAD_Y + Math.max(...board.outline.map(([, y]) => y), ...look.fit.lines.outline.map(([, y]) => y)) * f.scale), 9);
  });
});

describe("brdFitSheet", () => {
  const imperial = brdFitSheet(look, "Shortboard.brd", "imperial");
  const metric = brdFitSheet(look, "Shortboard.brd", "metric");
  const rowKeys = (s: typeof imperial, kind: string) => s.tables.find((t) => t.kind === kind)!.rows.map((r) => r.key);

  it("holds three tables of five rows, widths then rocker then thickness, nose first for the side tables", () => {
    expect(imperial.tables.map((t) => t.kind)).toEqual(["widths", "rocker", "thickness"]);
    expect(imperial.tables.map((t) => t.rows.length)).toEqual([5, 5, 5]);
    expect(rowKeys(imperial, "widths")).toEqual(["nose12", "wide", "wideAt", "tail12", "tailEnd"]);
    expect(rowKeys(imperial, "rocker")).toEqual(["noseTip", "nose12", "center", "tail12", "tailTip"]);
    expect(rowKeys(imperial, "thickness")).toEqual(["noseTip", "nose12", "center", "tail12", "tailTip"]);
    expect(imperial.tables.map((t) => t.caption)).toEqual([BRD_FIT_COPY.captions.widths, BRD_FIT_COPY.captions.rocker, BRD_FIT_COPY.captions.thickness]);
  });

  it("labels the rocker rows with the station in the shaper's system", () => {
    const labels = (s: typeof imperial) => s.tables[1].rows.map((r) => r.label);
    expect(labels(imperial)).toEqual([BRD_FIT_COPY.rows.noseTip, BRD_FIT_COPY.rows.nose12(stationLabel("imperial")), BRD_FIT_COPY.rows.center, BRD_FIT_COPY.rows.tail12(stationLabel("imperial")), BRD_FIT_COPY.rows.tailTip]);
    expect(labels(metric)[1]).toContain(stationLabel("metric"));
  });

  it("writes rocker and thickness as marks and widths as dims, from the file and from our fit", () => {
    const stations = brdFileStations(board);
    const row = (kind: string, key: string, s = imperial) => s.tables.find((t) => t.kind === kind)!.rows.find((r) => r.key === key)!;
    const nose = stations.find((st) => st.key === "noseTip")!;
    expect(row("rocker", "noseTip").file).toBe(formatMark(nose.lift, "imperial"));
    expect(row("rocker", "noseTip").fit).toBe(formatMark(look.fit.rocker.noseTip, "imperial"));
    expect(row("rocker", "center").file).toBe(formatMark(mm(0), "imperial"));
    expect(row("rocker", "center").fit).toBe(formatMark(mm(0), "imperial"));
    expect(row("thickness", "center").file).toBe(formatMark(stations.find((st) => st.key === "center")!.thickness, "imperial"));
    expect(row("thickness", "tailTip").fit).toBe(formatMark(look.fit.foil.tailTip, "imperial"));
    const widths = brdFileWidths(board);
    const fitWidths = fitOutlineWidths(look.fit.outline);
    expect(row("widths", "nose12").file).toBe(formatDim(widths.nose12, "imperial"));
    expect(row("widths", "tail12").fit).toBe(formatDim(fitWidths.tail12, "imperial"));
    expect(row("widths", "wide").file).toBe(formatDim(widths.wide, "imperial"));
    // Metric: rocker in whole millimetres, widths in centimetres to one decimal.
    expect(row("rocker", "noseTip", metric).file).toBe(formatMark(nose.lift, "metric"));
    expect(row("rocker", "noseTip", metric).file).toMatch(/^\d+ mm$/);
    expect(row("widths", "wide", metric).file).toBe(formatDim(widths.wide, "metric"));
    expect(row("widths", "wide", metric).file).toMatch(/^\d+\.\d cm$/);
  });

  it("says where the wide point sits as forward, back or at centre", () => {
    const wideAt = (s: typeof imperial) => s.tables[0].rows.find((r) => r.key === "wideAt")!;
    expect(wideAt(imperial).file).toMatch(/ (forward|back)$|^at centre$/);
    const centred = brdFitSheet({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: mm(0) } } }, "x.brd", "imperial");
    expect(wideAt(centred).fit).toBe(BRD_FIT_COPY.atCentre);
    const forward = brdFitSheet({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: inchesToMm(2) } } }, "x.brd", "imperial");
    expect(wideAt(forward).fit).toBe(BRD_FIT_COPY.forward(formatDim(inchesToMm(2), "imperial")));
    const back = brdFitSheet({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: inchesToMm(-2) } } }, "x.brd", "metric");
    expect(wideAt(back).fit).toBe(BRD_FIT_COPY.back(formatDim(inchesToMm(2), "metric")));
  });

  it("reads a tail that closes to the stringer as having no flat end", () => {
    const widths = brdFileWidths(board);
    const tailEnd = (s: typeof imperial) => s.tables[0].rows.find((r) => r.key === "tailEnd")!;
    if (widths.tailEnd === null) expect(tailEnd(imperial).file).toBe(BRD_FIT_COPY.noFlatEnd);
    const pointed = brdFitSheet({ ...look, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "round" } } } }, "x.brd", "imperial");
    expect(tailEnd(pointed).fit).toBe(BRD_FIT_COPY.noFlatEnd);
  });

  it("has no point notes for the app's own Shortboard, and one per pointed tip, nose first, for a board that has them", () => {
    expect(imperial.pointNotes).toEqual([]);
    const bottom: P2[] = [[0, 50], [1000, 0], [1993.65, 79.492], [2000, 99.492]];
    const deck: P2[] = [[0, 100], [1000, 50], [1993.65, 129.492], [2000, 99.492]];
    const outline: P2[] = [[0, 0], [0, 120], [700, 240], [1000, 260], [1500, 200], [2000, 0]];
    const made = { length: mm(2000), width: null, thickness: null, outline, bottom, deck, sections: [], fins: noBrdFins() };
    const pointed = brdFitSheet({ ...look, board: made }, "Egg.brd", "imperial");
    expect(pointed.pointNotes).toHaveLength(1);
    const stations = brdFileStations(made);
    const nose = stations.find((st) => st.key === "noseTip")!;
    expect(nose.point).not.toBeNull();
    expect(pointed.pointNotes[0]).toBe(
      BRD_FIT_COPY.pointNote(
        "nose",
        formatDim(BRD_STRAIGHTEDGE_MM.far, "imperial"),
        formatDim(BRD_STRAIGHTEDGE_MM.near, "imperial"),
        formatMark(nose.point!.lift, "imperial"),
        '0"',
      ),
    );
    expect(pointed.pointNotes[0]).not.toContain("<");
  });

  it("carries the words, the size line, the closeness lines and the five control lines", () => {
    const words = brdFitWords(look, "imperial");
    const w = words.controls;
    expect(imperial.title).toBe(BRD_FIT_COPY.title);
    expect(imperial.from).toBe(BRD_FIT_COPY.from("Shortboard.brd"));
    expect(imperial.size).toBe(BRD_FIT_COPY.size(words.size));
    expect(imperial.closeness.outline).toBe(closenessSentence("Outline", words.outline));
    expect(imperial.closeness.rocker).toBe(closenessSentence("Rocker", words.rocker));
    expect(imperial.closeness.thickness).toBe(closenessSentence("Thickness", words.thickness));
    expect(imperial.tipsNote).toBe(BRD_FIT_COPY.tipsNote(words.tipSkip));
    expect(imperial.rockerUse).toBe(BRD_FIT_COPY.rockerUse);
    // The bottom and the rails were read, so the sections part is gone; the file has no fins, which the line now says (quick 261113-qyz)…
    expect(imperial.notRead).toBe(BRD_FIT_COPY.noFins);
    expect(imperial.notRead).not.toMatch(/bottom|rail/i);
    expect(imperial.controls).toMatchObject({
      outline: BRD_FIT_COPY.outlineLine(w.length, w.width, w.offset),
      nose: BRD_FIT_COPY.noseLine(w.noseAngle, w.noseFullness, w.noseRail),
      tail: BRD_FIT_COPY.tailLine(w.tail, w.tailBlock, w.tailAngle, w.tailFullness, w.tailRail),
      rocker: BRD_FIT_COPY.rockerLine(w.rocker.noseTip, w.rocker.nose12, w.rocker.tail12, w.rocker.tailTip, w.station),
      thickness: BRD_FIT_COPY.thicknessLine(w.thickness.noseTip, w.thickness.nose12, w.thickness.center, w.thickness.tail12, w.thickness.tailTip, w.station),
    });
  });

  it("cuts a very long file name to the board name limit in the From line", () => {
    const long = brdFitSheet(look, `${"é".repeat(300)}.brd`, "imperial");
    expect(Array.from(long.from)).toHaveLength(Array.from(BRD_FIT_COPY.from("")).length + BOARD_NAME_MAX_LENGTH);
  });

  it("writes the Metric size line with the unit once", () => {
    expect(metric.size.match(/cm/g)).toHaveLength(1);
  });
});

/**
 * The whole look (quick 261113-gwr): the side fit, the bottom fitted to the file's cross-sections, and the board planed lower
 * under a concave. Boards with a known bottom are written by the app's own writer and read back.
 */
describe("brdFitLook", () => {
  const LONG = 120_000;
  const writeWith = (label: string, make: (b: BottomBoard) => BoardBottom): ReadBrdBoard => {
    const f = phase16Boards().find((b) => b.label === label)!.fields;
    const g = buildOutline(f.outline);
    const p = designSideProfile(f, LIVE_DESIGN_RULES);
    const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
    const board0 = designBottomBoard(f.outline, g, p, designFinPlacement(f));
    const bottom = make(board0);
    const s = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length, { bottom, board: board0 }), geometry: g, rockerAt: p.rockerAt });
    const text = brdText(s, { bottomStations: brdBottomStations(resolveBottom(bottom, board0)) }).text;
    const back = readAnyBrd(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
    if (!back.ok) throw new Error("the app's own file would not read");
    return back.board;
  };
  const cutBottom = (cuts: Partial<Record<"nose" | "center" | "tail", [BottomCutName, number]>>) => (b: BottomBoard): BoardBottom => {
    const bottom = structuredClone(DEFAULT_BOTTOM);
    for (const key of ["tail", "center", "nose"] as const) {
      const c = cuts[key];
      if (c) bottom[key] = { ...startingCut(key, c[0], b, key === "center" ? cuts.tail?.[0] : undefined), depth: inchesToMm(c[1] / 16) };
    }
    return bottom;
  };
  const linesOf = (b: ReadBrdBoard) => ({ length: b.length, outline: b.outline, bottom: b.bottom, deck: b.deck });
  const hasConcave = (bottom: BoardBottom) => (["nose", "center", "tail"] as const).some((k) => ["single", "double"].includes(cutKind(bottom[k].name)));

  it("a board with no section reads with no bottom, and the look is the side fit alone", () => {
    const bare = { ...board, sections: [] };
    const bareLook = brdFitLook(bare);
    expect(bareLook.bottom).toBeNull();
    expect(bareLook.fit).toEqual(fitBoardToBrd(linesOf(bare)));
    expect(bareLook.planedBottom).toBe(bare.bottom);
  });

  it("reads the rails of a file with sections: bottom-first with no window narrowed, measured on every usable section (quick 261113-kvo)", () => {
    expect(look.rails).not.toBeNull();
    expect(look.rails!.order).toBe("bottom-first");
    expect(look.rails!.narrowed).toBe(false);
    expect(look.rails!.sections.length).toBeGreaterThan(10);
    expect(look.rails!.sections.map((s) => s.station)).toEqual([...look.rails!.sections.map((s) => s.station)].sort((a, b) => a - b));
    expect(look.rails!.read.center).not.toBeNull();
    expect(look.rails!.closeness.largest).toBeLessThan(3);
    expect(look.rails!.closeness.typical).toBeLessThan(look.rails!.closeness.largest);
    // the look's fit and bottom are what they were: the rails never move the rocker, the thickness or the bottom
    expect(look.fit).toEqual(fitBoardToBrd(linesOf(board)));
    expect(look.planedBottom).toBe(board.bottom);
  });

  it("a board with no section has no rails either (quick 261113-kvo)", () => {
    expect(brdFitLook({ ...board, sections: [] }).rails).toBeNull();
  });

  it("is, for the flat Shortboard and for a vee and a belly, exactly the side fit as before, with the file's own bottom line planed to", () => {
    const flat = brdFitLook(board);
    expect(flat.bottom).not.toBeNull();
    expect((["nose", "center", "tail"] as const).every((k) => cutKind(flat.bottom!.bottom[k].name) === "flat")).toBe(true);
    for (const file of [board, writeWith("shortboard|asis|hard", cutBottom({ tail: ["Panel Vee", 3] })), writeWith("shortboard|asis|hard", cutBottom({ center: ["Continuous Belly / Rolled Mid", 4] }))]) {
      const out = brdFitLook(file);
      expect(out.bottom).not.toBeNull();
      expect(hasConcave(out.bottom!.bottom)).toBe(false);
      expect(out.fit).toEqual(fitBoardToBrd(linesOf(file)));
      expect(out.planedBottom).toBe(file.bottom);
      expect(Object.values(out.fit.stringerLift)).toEqual([0, 0, 0, 0, 0]);
    }
    expect(Math.max(...[board].map((b) => brdFitLook(b).bottom!.closeness.largest))).toBeLessThan(1);
  }, LONG);

  describe("a Shortboard with a 1/4\" Deep Single Concave, written and read back", () => {
    const file = writeWith("shortboard|asis|hard", cutBottom({ center: ["Deep Single Concave", 4] }));
    const out = brdFitLook(file);
    const first = fitBoardToBrd(linesOf(file));
    const first0 = brdFittedBottomBoard(first);
    const lift = brdStringerLift(out.bottom!.bottom, first0);

    it("fits a single concave 4 steps deep in the center", () => {
      expect(cutKind(out.bottom!.bottom.center.name)).toBe("single");
      expect(Math.round(out.bottom!.bottom.center.depth / inchesToMm(1 / 16))).toBe(4);
      expect(cutKind(out.bottom!.bottom.nose.name)).toBe("flat");
      expect(cutKind(out.bottom!.bottom.tail.name)).toBe("flat");
    }, LONG);

    it("plans the board lower by the lift: planedBottom is the file's line less the lift, at every point of it", () => {
      expect(out.planedBottom).toHaveLength(file.bottom.length);
      let underConcave = 0;
      out.planedBottom.forEach(([x, y], i) => {
        expect(x).toBe(file.bottom[i][0]);
        expect(y).toBeCloseTo(file.bottom[i][1] - lift(mm(x)), 9);
        if (lift(mm(x)) > 1) underConcave++;
      });
      expect(underConcave).toBeGreaterThan(5);
      expect(lift(mm(0))).toBe(0);
      expect(lift(mm(file.length))).toBe(0);
    }, LONG);

    it("draws the finished stringer: our bottom line less the planed rocker line is the lift at every drawn station", () => {
      const profile = buildFallbackProfile(out.fit.rocker, out.fit.foil, out.fit.outline.length);
      const centre = out.fit.lines.bottom[100][1] - lift(mm(file.length / 2)) - profile.rockerAt(mm(file.length / 2));
      out.fit.lines.bottom.forEach(([s, y]) => expect(y - (centre + profile.rockerAt(mm(s)))).toBeCloseTo(lift(mm(s)), 9));
    }, LONG);

    it("comes back within a millimetre of the same board written flat, at every station: rocker and foil", () => {
      const flatLook = brdFitLook(board);
      const L = file.length;
      const ours = buildFallbackProfile(out.fit.rocker, out.fit.foil, mm(L));
      const flat = buildFallbackProfile(flatLook.fit.rocker, flatLook.fit.foil, mm(L));
      for (let i = 0; i <= 100; i++) {
        const s = mm((L * i) / 100);
        expect(Math.abs(ours.rockerAt(s) - flat.rockerAt(s))).toBeLessThan(1);
        expect(Math.abs(ours.thicknessAt(s) - flat.thicknessAt(s))).toBeLessThan(1);
      }
    }, LONG);

    it("measures the bottom on the board that opens, and says the stringer is lifted in its station figures", () => {
      expect(out.fit.stringerLift.center).toBeGreaterThan(1);
      expect(out.bottom!.sections.length).toBeGreaterThan(10);
      expect(out.bottom!.closeness.largest).toBeLessThan(1.5);
    }, LONG);
  });
});

describe("the BOTTOM block's rows and drawings (quick 261113-gwr)", () => {
  const LONG = 120_000;
  const concaveFile = (() => {
    const f = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
    const g = buildOutline(f.outline);
    const p = designSideProfile(f, LIVE_DESIGN_RULES);
    const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
    const board0 = designBottomBoard(f.outline, g, p, designFinPlacement(f));
    const bottom = {
      ...structuredClone(DEFAULT_BOTTOM),
      center: { ...startingCut("center", "Deep Single Concave", board0), depth: inchesToMm(4 / 16) },
      tail: { ...startingCut("tail", "Double Concave Exit", board0), depth: inchesToMm(2 / 16), troughAt: inchesToMm(4.5) },
    };
    const s = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length, { bottom, board: board0 }), geometry: g, rockerAt: p.rockerAt });
    const back = readAnyBrd(Uint8Array.from(brdText(s, { bottomStations: brdBottomStations(resolveBottom(bottom, board0)) }).text, (ch) => ch.charCodeAt(0)));
    if (!back.ok) throw new Error("the app's own file would not read");
    return back.board;
  })();
  const concave = brdFitLook(concaveFile);

  it("assigns the file's own sections nearest 12\" from the nose, the middle and 12\" from the tail, each used once", () => {
    const rows = brdBottomRows(concave);
    expect(rows.map((r) => r.key)).toEqual(["nose", "center", "tail"]);
    const L = concave.board.length;
    const near = (target: number) => concave.bottom!.sections.reduce((a, b) => (Math.abs(a.station - target) <= Math.abs(b.station - target) ? a : b));
    expect(rows[0].section).toBe(near(L - MEASURE_STATION_MM));
    expect(rows[1].section).toBe(near(L / 2));
    expect(rows[2].section).toBe(near(MEASURE_STATION_MM));
    expect(new Set(rows.map((r) => r.section)).size).toBe(3);
  }, LONG);

  it("leaves exactly one row with no section for a file with two, and three for a look with no bottom", () => {
    const two = { ...concave, bottom: { ...concave.bottom!, sections: concave.bottom!.sections.slice(0, 2) } };
    expect(brdBottomRows(two).filter((r) => r.section === null)).toHaveLength(1);
    expect(brdBottomRows({ ...concave, bottom: null }).every((r) => r.section === null)).toBe(true);
    expect(brdBottomRows({ ...concave, bottom: null })).toHaveLength(3);
  }, LONG);

  it("draws nose, center and tail, mirrored about the middle, over the window of each section, at one scale", () => {
    const frames = brdBottomFrames(brdBottomRows(concave), 4);
    expect(frames.drawings.map((d) => d.key)).toEqual(["nose", "center", "tail"]);
    expect(frames.width).toBe(BRD_BOTTOM_DRAWING_WIDTH);
    for (const d of frames.drawings) {
      for (const line of [d.file, d.fit]) {
        expect(line[0][0]).toBeCloseTo(BRD_BOTTOM_DRAWING_WIDTH - line[line.length - 1][0], 9);
        expect(line).toHaveLength(49);
        expect(line[24][0]).toBeCloseTo(BRD_BOTTOM_DRAWING_WIDTH / 2, 9);
      }
      expect(d.stringer.x).toBe(BRD_BOTTOM_DRAWING_WIDTH / 2);
      expect(d.straightedge.x1).toBeLessThan(d.file[0][0]);
    }
    const widest = Math.max(...frames.drawings.map((d) => d.file[48][0] - d.file[0][0]));
    expect(widest).toBeCloseTo(BRD_BOTTOM_DRAWING_WIDTH - 60, 6);
  }, LONG);

  it("opens at four times the height unless capped, and a flat file still has a height", () => {
    const rows = brdBottomRows(concave);
    const one = brdBottomFrames(rows, 1);
    const four = brdBottomFrames(rows, 4);
    expect(one.heightDrawn).toBeCloseTo(1, 9);
    expect(four.heightDrawn).toBeLessThanOrEqual(4 + 1e-9);
    const eight = brdBottomFrames(rows, 8);
    expect(eight.heightDrawn).toBeLessThanOrEqual(8 + 1e-9);
    expect(eight.height).toBeLessThanOrEqual(260 + 1e-9);
    const flat = brdBottomFrames(brdBottomRows(look), 4);
    expect(flat.height).toBeGreaterThan(32);
    expect(brdBottomFrames([], 4).drawings).toEqual([]);
  }, LONG);

  it("draws a concave below the stringer and a vee above it (up is up), the straightedge at the stringer's level", () => {
    const frames = brdBottomFrames(brdBottomRows(concave), 4);
    const center = frames.drawings.find((d) => d.key === "center")!;
    const rail = center.file[center.file.length - 1];
    expect(rail[1]).toBeGreaterThan(center.straightedge.y);
    expect(center.file[24][1]).toBeCloseTo(center.straightedge.y, 9);
  }, LONG);

  describe("in the sheet", () => {
    for (const system of ["imperial", "metric"] as const) {
      it(`words every cell from the fit, in ${system}`, () => {
        const sheet = brdFitSheet(concave, "Concave.brd", system);
        const block = sheet.bottom;
        if (!block.read) throw new Error("expected a read bottom");
        expect(block.caption).toBe(BRD_FIT_COPY.bottomCaption);
        expect(block.columns.map((c) => c.label)).toEqual(["Nose", "Centre", "Tail"]);
        expect(block.rows.map((r) => r.key)).toEqual(["at", "file", "fit", "stations", "across"]);
        expect(block.rows.map((r) => r.label)).toEqual(Object.values(BRD_FIT_COPY.bottomRowLabels));
        const rows = brdBottomRows(concave);
        const board = brdFittedBottomBoard(concave.fit);
        const row = (key: string) => block.rows.find((r) => r.key === key)!;
        ["nose", "center", "tail"].forEach((key, k) => {
          const section = rows[k].section!;
          expect(row("at").cells[k]).toBe(gapWhere(section.station, concave.board.length, system));
          expect(block.columns[k].drawingCaption).toBe(
            BRD_FIT_COPY.bottomSectionCaption(gapWhere(section.station, concave.board.length, system), formatDim(mm(2 * section.reach), system)),
          );
          const spec = concave.bottom!.bottom[key as "nose" | "center" | "tail"];
          const flat = cutKind(spec.name) === "flat";
          expect(row("fit").cells[k]).toBe(flat ? spec.name : `${spec.name} ${formatMark(spec.depth, system)}`);
          if (flat) {
            expect(row("stations").cells[k]).toBe("—");
            expect(row("across").cells[k]).toBe("—");
          } else {
            const r = resolveCut(key as "nose" | "center" | "tail", spec, board);
            const list = [r.start, r.deepest, r.end]
              .map((s) => formatBottomStation(stationFromNearestTip(key as "nose" | "center" | "tail", s, board), system))
              .join(" · ");
            expect(row("stations").cells[k]).toBe(key === "nose" ? `${list} from the nose` : `${list} from the tail`);
          }
        });
        expect(row("file").cells[1]).toMatch(/^Single concave /);
        expect(row("across").cells[1]).toBe(`Off Rail ${formatMark(concave.bottom!.bottom.center.offRail, system)}`);
        expect(block.notes).toHaveLength(2);
        expect(block.notes[0]).toBe(BRD_FIT_COPY.bottomWindowNote);
        expect(block.notes[1]).toBe(
          BRD_FIT_COPY.sectionsRead(concave.bottom!.sections.length, concave.board.sections.length, formatDim(BRD_FIT_TIP_SKIP_MM, system)),
        );
      });
    }

    it("has a Bottom HOW CLOSE line with the section and how far out, and the Bottom control line", () => {
      const sheet = brdFitSheet(concave, "Concave.brd", "imperial");
      const c = concave.bottom!.closeness;
      expect(sheet.closeness.bottom).toBe(
        closenessSentence("Bottom", {
          largest: formatMarkOrLess(c.largest, "imperial"),
          typical: formatMarkOrLess(c.typical, "imperial"),
          at: formatDim(c.station, "imperial"),
          where: `at the section ${gapWhere(c.station, concave.board.length, "imperial")}, ${formatMark(c.across, "imperial")} out from the stringer`,
          side: null,
        }),
      );
      expect(sheet.closeness.bottom).toMatch(/^Bottom: (within|less than)/);
      expect(sheet.closeness.bottom).toContain("out from the stringer");
      expect(sheet.controls.bottom).toMatch(/^Bottom: .* · .* · /);
      expect(sheet.controls.bottom).toContain("Deep Single Concave");
    }, LONG);

    it("uses BOTTOM's own words for the sliders", () => {
      expect(BRD_FIT_COPY.bottomSliderWords).toEqual({
        start: BOTTOM_COPY.start,
        deepestAt: BOTTOM_COPY.deepestAt,
        end: BOTTOM_COPY.end,
        offRail: BOTTOM_COPY.offRail,
        offStringer: BOTTOM_COPY.offStringer,
        troughAt: BOTTOM_COPY.troughAt,
      });
      expect(BRD_FIT_COPY.bottomRowLabels.stations).toBe(`${BOTTOM_COPY.start} · ${BOTTOM_COPY.deepestAt} · ${BOTTOM_COPY.end}`);
    });

    it("always says what the two rockers are, and notes the lift only when a concave lifts the stringer; the rocker table's Our fit is the finished stringer's", () => {
      const sheet = brdFitSheet(concave, "Concave.brd", "imperial");
      expect(sheet.rockerLines).toBe(BRD_FIT_COPY.rockerLines);
      expect(sheet.stringerNote).not.toBeNull();
      const largest = Object.entries(concave.fit.stringerLift).reduce((a, b) => (b[1] > a[1] ? b : a));
      expect(sheet.stringerNote).toContain(formatMark(largest[1] as never, "imperial"));
      const flat = brdFitSheet(look, "Shortboard.brd", "imperial");
      expect(flat.rockerLines).toBe(BRD_FIT_COPY.rockerLines);
      expect(flat.stringerNote).toBeNull();
      // Our fit is the planed rocker plus the lift, from the centre's own; the thickness is the planed thickness less the lift.
      const rocker = sheet.tables.find((t) => t.kind === "rocker")!;
      const thickness = sheet.tables.find((t) => t.kind === "thickness")!;
      const fit = concave.fit;
      for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
        expect(rocker.rows.find((r) => r.key === key)!.fit).toBe(formatMark(mm(fit.rocker[key] + fit.stringerLift[key] - fit.stringerLift.center), "imperial"));
      }
      for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
        expect(thickness.rows.find((r) => r.key === key)!.fit).toBe(formatMark(mm(fit.foil[key] - fit.stringerLift[key]), "imperial"));
      }
      expect(rocker.rows.find((r) => r.key === "center")!.fit).toBe(formatMark(mm(0), "imperial"));
    }, LONG);

    it("says the bottom could not be read, and keeps the older not-read line, for a look with no bottom", () => {
      const bare = { ...look, bottom: null, rails: null };
      const sheet = brdFitSheet(bare, "Bare.brd", "imperial");
      expect(sheet.bottom).toEqual({ read: false, caption: BRD_FIT_COPY.bottomCaption, line: BRD_FIT_COPY.bottomUnread });
      expect(sheet.closeness.bottom).toBeNull();
      expect(sheet.controls.bottom).toBeNull();
      expect(sheet.notRead).toBe(`${BRD_FIT_COPY.notRead} ${BRD_FIT_COPY.noFins}`);
    });

    it("leaves the flat Shortboard's rocker and thickness tables as they were: Our fit is the fit's own figures", () => {
      const sheet = brdFitSheet(look, "Shortboard.brd", "imperial");
      for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
        expect(sheet.tables[1].rows.find((r) => r.key === key)!.fit).toBe(formatMark(look.fit.rocker[key], "imperial"));
      }
      for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
        expect(sheet.tables[2].rows.find((r) => r.key === key)!.fit).toBe(formatMark(look.fit.foil[key], "imperial"));
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The wing lines (quick 261113-hyy)
// ---------------------------------------------------------------------------------------------------------------------

/** A winged board written by the app's own writer, read back and looked at. */
function wingedLook(label: string): BrdFitLook {
  const f = phase16WingBoards().find((b) => b.label === label)!.fields;
  const g = buildOutline(f.outline);
  const p = designSideProfile(f, LIVE_DESIGN_RULES);
  const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
  const surf = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length), geometry: g, rockerAt: p.rockerAt });
  const got = readAnyBrd(Uint8Array.from(brdText(surf).text, (ch) => ch.charCodeAt(0)));
  if (!got.ok) throw new Error("the app's own file would not read");
  return brdFitLook(got.board);
}

describe("brdFitSheet's wing lines", () => {
  const one = wingedLook("wing|shortboard|one");
  const two = wingedLook("wing|shortboard|two");
  const square = wingedLook("wing|shortboard|square");

  /** The three figures of a wing as the sheet words them, built from the app's own display functions. */
  const figures = (w: { station: number; depth: number; run: number }, system: "imperial" | "metric") => ({
    off: formatDim(mm(w.station), system),
    depth: formatMarkOrLess(mm(w.depth), system),
    run: formatMark(mm(w.run), system),
  });

  it("says nothing for a file with no wing, and every other field as before", () => {
    const sheet = brdFitSheet(look, "Shortboard.brd", "imperial");
    expect(sheet.wings).toEqual([]);
    expect(look.fit.fileWings).toEqual([]);
  });

  it("gives one line per wing, nose-most first: the file's wing as measured beside ours as fitted", () => {
    for (const system of ["imperial", "metric"] as const) {
      const sheet = brdFitSheet(two, "Two.brd", system);
      expect(sheet.wings).toHaveLength(2);
      sheet.wings.forEach((line, k) => {
        const file = figures(two.fit.fileWings[k], system);
        const ours = figures(two.fit.outline.wings![k], system);
        expect(line.startsWith(`Wing ${k + 1} — the file: `)).toBe(true);
        expect(line).toBe(
          `Wing ${k + 1} — the file: ${file.depth} deep over a ${file.run} run along the stringer, ${file.off} off the tail, sharp corners. ` +
            `Ours: ${ours.depth} deep over a ${ours.run} run, ${ours.off} off the tail, sharp corners.`,
        );
      });
    }
  });

  it("reads the place off the tail as a dim and depth and run as marks: centimetres and whole millimetres in Metric", () => {
    const line = brdFitSheet(one, "One.brd", "metric").wings[0];
    expect(line).toMatch(/\d+\.\d cm off the tail/);
    expect(line).toMatch(/\d+ mm deep over a \d+ mm run along the stringer/);
    const imperial = brdFitSheet(one, "One.brd", "imperial").wings[0];
    expect(imperial).toContain('"');
    expect(imperial).not.toContain(" cm");
  });

  it("reads a step with no run as a square step, the file's and ours alike", () => {
    const line = brdFitSheet(square, "Square.brd", "imperial").wings[0];
    expect(line).toContain("in a square step");
    expect(line).not.toContain("run");
  });

  it("never says anything about wings or flyers in the not-read line, which is about the fins now the rails are read (a file with none says so)", () => {
    for (const sheet of [brdFitSheet(one, "One.brd", "imperial"), brdFitSheet(look, "Plain.brd", "imperial"), brdFitSheet({ ...look, bottom: null }, "Plain.brd", "imperial")]) {
      expect(sheet.notRead).not.toMatch(/wing|flyer/i);
      expect(sheet.notRead).toBe(BRD_FIT_COPY.noFins);
    }
  });

  it("draws the winged fit: the dashed outline, the widths table and HOW CLOSE all come from the fit that holds the wings", () => {
    const sheet = brdFitSheet(one, "One.brd", "imperial");
    expect(one.fit.outline.wings).toHaveLength(1);
    expect(one.fit.lines.outline).toEqual(
      (() => {
        const points = buildOutline(one.fit.outline).points.map((p): P2 => [p.station, p.halfWidth]);
        return points[0][1] > 1e-6 ? [[points[0][0], 0], ...points] : points;
      })(),
    );
    const widths = fitOutlineWidths(one.fit.outline);
    expect(sheet.tables[0].rows.find((r) => r.key === "tail12")!.fit).toBe(formatDim(widths.tail12, "imperial"));
    expect(sheet.closeness.outline).toBe(closenessSentence("Outline", brdFitWords(one, "imperial").outline));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The corners on both sides of the wing line (quick 261113-m5w)
// ---------------------------------------------------------------------------------------------------------------------

/** The Shortboard's wing 1 made 1 inch deep over a 1 inch run, rounded as far as the slider goes: written by the app's writer, read back and looked at. */
function roundedLook(): BrdFitLook {
  const f = phase16WingBoards().find((b) => b.label === "wing|shortboard|one")!.fields;
  const step = { depth: inchesToMm(1), run: inchesToMm(1) };
  const fields = { ...f, outline: { ...f.outline, wings: [{ ...f.outline.wings![0], ...step, radius: wingRadiusTop(step, "imperial") }] } };
  const g = buildOutline(fields.outline);
  const p = designSideProfile(fields, LIVE_DESIGN_RULES);
  const r = deriveEffectiveRails(fields.rails, p.effectiveFoil, fields.railsImportFoilThickness);
  const surf = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, fields.outline.length), geometry: g, rockerAt: p.rockerAt });
  const got = readAnyBrd(Uint8Array.from(brdText(surf).text, (ch) => ch.charCodeAt(0)));
  if (!got.ok) throw new Error("the app's own file would not read");
  return brdFitLook(got.board);
}

describe("brdFitSheet's wing lines say the corners on both sides", () => {
  const sharpLooks = ["wing|shortboard|one", "wing|shortboard|two", "wing|shortboard|square"].map((label) => [label, wingedLook(label)] as const);
  const rounded = roundedLook();

  const figures = (w: { station: number; depth: number; run: number }, system: "imperial" | "metric") => ({
    off: formatDim(mm(w.station), system),
    depth: formatMarkOrLess(mm(w.depth), system),
    run: formatMark(mm(w.run), system),
    square: formatMark(mm(w.run), system) === formatMark(mm(0), system),
  });
  const how = (f: ReturnType<typeof figures>, along: string) =>
    `${f.depth} deep ${f.square ? "in a square step" : `over a ${f.run} run${along}`}, ${f.off} off the tail`;

  it.each(sharpLooks)("%s: a file with sharp corners reads sharp corners beside both the file's wing and ours, in both systems", (_label, sharp) => {
    for (const system of ["imperial", "metric"] as const) {
      const sheet = brdFitSheet(sharp, "Wing.brd", system);
      expect(sheet.wings).toHaveLength(sharp.fit.fileWings.length);
      sheet.wings.forEach((line, k) => {
        const file = figures(sharp.fit.fileWings[k], system);
        const ours = figures(sharp.fit.outline.wings![k], system);
        expect(sharp.fit.fileWingCorners[k].rounded).toBe(false);
        expect(line).toBe(`Wing ${k + 1} — the file: ${how(file, " along the stringer")}, sharp corners. Ours: ${how(ours, "")}, sharp corners.`);
      });
    }
  });

  it("a file with clearly rounded corners reads the measured rounded wing's figures and radius, and ours with its corner radius", () => {
    expect(rounded.fit.fileWingCorners[0].rounded).toBe(true);
    for (const system of ["imperial", "metric"] as const) {
      const measured = rounded.fit.fileWingCorners[0].measured;
      const ours = rounded.fit.outline.wings![0];
      const file = figures(measured, system);
      const mine = figures(ours, system);
      const line = brdFitSheet(rounded, "Rounded.brd", system).wings[0];
      expect(line).toBe(
        `Wing 1 — the file: ${how(file, " along the stringer")}, corners rounded about ${formatMark(measured.radius, system)}. ` +
          `Ours: ${how(mine, "")}, ${formatMark(effectiveWingRadius(ours), system)} corner radius.`,
      );
    }
  });

  it("reads the radius as a whole-millimetre mark and the place off the tail in centimetres in Metric, inches in Imperial", () => {
    const metric = brdFitSheet(rounded, "Rounded.brd", "metric").wings[0];
    expect(metric).toMatch(/corners rounded about \d+ mm\./);
    expect(metric).toMatch(/, \d+ mm corner radius\.$/);
    expect(metric).toMatch(/\d+\.\d cm off the tail/);
    const imperial = brdFitSheet(rounded, "Rounded.brd", "imperial").wings[0];
    expect(imperial).toMatch(/corners rounded about [\d /]+"\./);
    expect(imperial).toMatch(/, [\d /]+" corner radius\.$/);
  });

  it("keeps the sheet's words in plain spaces: no no-break space (the dialog adds them as it draws)", () => {
    for (const [, sharp] of sharpLooks) for (const system of ["imperial", "metric"] as const) expect(brdFitSheet(sharp, "Wing.brd", system).wings.join("")).not.toContain("\u00a0");
    for (const system of ["imperial", "metric"] as const) expect(brdFitSheet(rounded, "Rounded.brd", system).wings.join("")).not.toContain("\u00a0");
  });

  it("leaves a wingless look with no wing line and every other field as before", () => {
    const sheet = brdFitSheet(look, "Plain.brd", "imperial");
    expect(sheet.wings).toEqual([]);
    expect(look.fit.fileWingCorners).toEqual([]);
  });
});

/**
 * The RAILS block (quick 261113-kvo): a board with the tail's Use Single Tuck and Sharp Bottom Tuck ticked and Hard Edge off, a
 * nose scaled and a nudge on the centre, written by the app's own writer, read back and fitted. The words are the sheet's own.
 */
describe("the RAILS block's rows, drawings and words (quick 261113-kvo)", () => {
  const LONG = 120_000;
  const stock = phase16RailCharacterBoards().find((b) => b.label === "stock|hard")!.fields;
  const tuckedFile = (() => {
    const f = { ...stock, rails: { ...stock.rails, tailHardEdge: false, tail: { ...stock.rails.tail, singleTuck: true, sharpBottomTuck: true }, center: { ...stock.rails.center, deckPercent: 85 } } };
    const g = buildOutline(f.outline);
    const p = designSideProfile(f, LIVE_DESIGN_RULES);
    const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
    const sf = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length), geometry: g, rockerAt: p.rockerAt });
    const back = readAnyBrd(Uint8Array.from(brdText(sf).text, (ch) => ch.charCodeAt(0)));
    if (!back.ok) throw new Error("the app's own file would not read");
    return back.board;
  })();
  const tucked = brdFitLook(tuckedFile);

  it("brdRailRows: nose, centre, tail, each the section its rail was fitted to; three nulls without rails", () => {
    const rows = brdRailRows(tucked);
    expect(rows.map((r) => r.key)).toEqual(["nose", "center", "tail"]);
    for (const row of rows) expect(row.section?.station).toBe(tucked.rails!.read[row.key]);
    expect(brdRailRows({ ...tucked, rails: null }).map((r) => r.section)).toEqual([null, null, null]);
  });

  it("brdRailFrames: one scale across, true height, the rail at the right and the lines only over the span", () => {
    const rows = brdRailRows(tucked);
    const frames = brdRailFrames(rows, tucked);
    expect(frames.drawings.map((d) => d.key)).toEqual(["nose", "center", "tail"]);
    expect(frames.width).toBe(BRD_BOTTOM_DRAWING_WIDTH);
    const kx = (BRD_BOTTOM_DRAWING_WIDTH - 60) / frames.span;
    for (const drawing of frames.drawings) {
      const section = rows.find((r) => r.key === drawing.key)!.section!;
      const reach = Math.max(...section.file.map((p) => p[0]));
      // the widest point sits at the right edge, 30 units in
      expect(Math.max(...drawing.file.map((p) => p[0]))).toBeCloseTo(BRD_BOTTOM_DRAWING_WIDTH - 30, 6);
      // true height: the same scale up as along, between the widest point and the point after it on the deck (the stretch the span keeps)
      const apex = section.file.findIndex((p) => p[0] === reach);
      const here = (i: number) => {
        const x = BRD_BOTTOM_DRAWING_WIDTH - 30 - (reach - section.file[i][0]) * kx;
        return drawing.file.find((p) => Math.abs(p[0] - x) < 1e-6)!;
      };
      const a = here(apex);
      const b = here(apex + 1);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(b[0] - a[0]).toBeCloseTo((section.file[apex + 1][0] - section.file[apex][0]) * kx, 6);
      expect(b[1] - a[1]).toBeCloseTo(-(section.file[apex + 1][1] - section.file[apex][1]) * kx, 6);
      // each line runs only over the span, never past the stringer
      for (const [x] of [...drawing.file, ...drawing.fit]) expect(x).toBeGreaterThanOrEqual(30 - 1e-6);
      expect(Math.min(...drawing.file.map((p) => p[0]))).toBeGreaterThanOrEqual(BRD_BOTTOM_DRAWING_WIDTH - 30 - reach * kx - 1e-6);
      for (const [, y] of [...drawing.file, ...drawing.fit]) {
        expect(y).toBeGreaterThanOrEqual(-1e-6);
        expect(y).toBeLessThanOrEqual(frames.height + 1e-6);
      }
      expect(drawing.bottomLine.x2).toBeGreaterThan(BRD_BOTTOM_DRAWING_WIDTH - 30);
    }
    expect(brdRailFrames(brdRailRows({ ...tucked, rails: null }), { ...tucked, rails: null }).drawings).toEqual([]);
  }, LONG);

  it("words the RAILS block in both systems: columns, six rows, the ticked boxes in RAILS' own words, and the closeness sentence", () => {
    for (const system of ["imperial", "metric"] as const) {
      const sheet = brdFitSheet(tucked, "Tucked.brd", system);
      expect(sheet.rails.read).toBe(true);
      if (!sheet.rails.read) throw new Error("unreachable");
      expect(sheet.rails.caption).toBe("RAILS");
      expect(sheet.rails.drawingsCaption).toBe("CROSS-SECTIONS · TRUE HEIGHT");
      expect(sheet.rails.columns.map((c) => c.label)).toEqual(["Nose", "Centre", "Tail"]);
      expect(sheet.rails.rows.map((r) => r.key)).toEqual(["at", "deck", "shape", "ticked", "advanced", "close"]);
      const row = (key: string) => sheet.rails.read && sheet.rails.rows.find((r) => r.key === key)!;
      const rails = tucked.rails!.rails;
      // the tapered thickness RAILS' own Deck Profile label shows, as a mark
      (["nose", "center", "tail"] as const).forEach((key, i) => {
        const out = computeRailSectionOutput(key, rails[key], key === "tail" && rails.tailHardEdge);
        expect((row("deck") as { cells: string[] }).cells[i]).toBe(formatMark(out.railThicknessClamped, system));
        const s = rails[key];
        expect((row("shape") as { cells: string[] }).cells[i]).toBe(`${railFamilyLabel(s.family)} ${s.ratioTopPercent}/${100 - s.ratioTopPercent}`);
      });
      expect((row("ticked") as { cells: string[] }).cells[2]).toBe("Use Single Tuck · Sharp Bottom Tuck");
      expect((row("ticked") as { cells: string[] }).cells[1]).toBe(BRD_FIT_COPY.noValue);
      expect((row("close") as { cells: string[] }).cells.every((c) => /^(within|less than) /.test(c))).toBe(true);
      expect(sheet.closeness.rails).toMatch(/^Rails: (within|less than) /);
      expect(sheet.closeness.rails).toMatch(/at the rail|on the (deck|bottom) .+ in from the rail/);
      expect(sheet.controls.rails).toMatch(/^Rails: Nose .+ · Centre .+ · Tail .+, Use Single Tuck · Sharp Bottom Tuck$/);
      expect(sheet.rails.notes[0]).toBe(BRD_FIT_COPY.railRegionNote(formatDim(inchesToMm(3), system)));
      expect(sheet.rails.notes[sheet.rails.notes.length - 1]).toBe(BRD_FIT_COPY.railBlendNote);
      expect(sheet.notRead).toBe(BRD_FIT_COPY.noFins);
    }
  }, LONG);

  it("words the Advanced menu's moved settings: Scaled from center by on a tip, then each nudge as a signed mark", () => {
    const base = brdFitSheet(tucked, "T.brd", "imperial");
    const moved = {
      ...tucked,
      rails: {
        ...tucked.rails!,
        rails: {
          ...tucked.rails!.rails,
          nose: { ...tucked.rails!.rails.nose, scaleFromCenter: 0.85 },
          center: { ...tucked.rails!.rails.center, nudges: { ...tucked.rails!.rails.center.nudges, domedDeckBand: inchesToMm(1), bottomTuck3: inchesToMm(-1 / 4) } },
        },
      },
    };
    for (const system of ["imperial", "metric"] as const) {
      const sheet = brdFitSheet(moved, "T.brd", system);
      if (!sheet.rails.read || !base.rails.read) throw new Error("unreachable");
      const advanced = sheet.rails.rows.find((r) => r.key === "advanced")!.cells;
      expect(advanced[0]).toBe("Scaled from center by 0.85");
      expect(advanced[1]).toBe(`${RAIL_NUDGE_NAMES.domedDeckBand} ${formatSignedMark(inchesToMm(1), system)} · ${RAIL_NUDGE_NAMES.bottomTuck3} ${formatSignedMark(inchesToMm(-1 / 4), system)}`);
    }
  });

  it("is, for a look with no rails, one unread line, no closeness sentence and no control line, and the older not-read line when the bottom is unread too", () => {
    const none = { ...tucked, rails: null };
    const sheet = brdFitSheet(none, "T.brd", "imperial");
    expect(sheet.rails).toEqual({ read: false, caption: "RAILS", line: BRD_FIT_COPY.railsUnread });
    expect(sheet.closeness.rails).toBeNull();
    expect(sheet.controls.rails).toBeNull();
    expect(sheet.notRead).toBe(`${BRD_FIT_COPY.notReadAfterBottom} ${BRD_FIT_COPY.noFins}`);
    expect(brdFitSheet({ ...none, bottom: null }, "T.brd", "imperial").notRead).toBe(`${BRD_FIT_COPY.notRead} ${BRD_FIT_COPY.noFins}`);
  });

  it("says the rail region in the shaper's system, never a bare inch figure in Metric", () => {
    const metric = brdFitSheet(tucked, "T.brd", "metric");
    if (!metric.rails.read) throw new Error("unreachable");
    expect(metric.rails.notes[0]).toContain(formatDim(inchesToMm(3), "metric"));
    expect(metric.rails.notes[0]).not.toContain('3"');
    expect(brdFitSheet(tucked, "T.brd", "imperial").rails.read && (brdFitSheet(tucked, "T.brd", "imperial").rails as { notes: string[] }).notes[0]).toContain('3"');
  });

  it("the rails-first note appears only when the rails were fitted first", () => {
    const sheet = brdFitSheet(tucked, "T.brd", "imperial");
    if (!sheet.rails.read) throw new Error("unreachable");
    expect(sheet.rails.notes).not.toContain(BRD_FIT_COPY.railsFirstNote);
    const first = brdFitSheet({ ...tucked, rails: { ...tucked.rails!, order: "rails-first" } }, "T.brd", "imperial");
    if (!first.rails.read) throw new Error("unreachable");
    expect(first.rails.notes).toContain(BRD_FIT_COPY.railsFirstNote);
  });

  it("uses each of RAILS' own words as rail-controls.tsx writes them", () => {
    const source = readFileSync(join(__dirname, "../../components/rails/rail-controls.tsx"), "utf8");
    for (const word of Object.values(BRD_FIT_COPY.railWords)) expect(source).toContain(word);
    expect(BRD_FIT_COPY.railColumns).toEqual({ nose: "Nose", center: "Centre", tail: "Tail" });
  });
});

const TWIN = [24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 5.4];
/** The stock Shortboard with a Panel Vee tail, written by the app, its fin line and word set the way the writer sets them. */
const withFins = (nine: readonly number[], word: string | null): ReadBrdBoard => {
  const f = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
  const g = buildOutline(f.outline);
  const p = designSideProfile(f, LIVE_DESIGN_RULES);
  const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
  const board0 = designBottomBoard(f.outline, g, p, designFinPlacement(f));
  const bottom = { ...structuredClone(DEFAULT_BOTTOM), tail: { ...startingCut("tail", "Panel Vee", board0), depth: inchesToMm(3 / 16) } };
  const s = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length, { bottom, board: board0 }), geometry: g, rockerAt: p.rockerAt });
  const plain = brdText(s, { bottomStations: brdBottomStations(resolveBottom(bottom, board0)) }).text;
  const fields = brdFinHeaderFields({ p50: nine, p51: word ?? "" });
  const text = plain
    .split("\n")
    .flatMap((line) => (line.startsWith("p50 : ") ? fields.filter(([k]) => word !== null || k === "p50").map(([k, v]) => `${k} : ${v}`) : [line]))
    .join("\n");
  const back = readAnyBrd(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  if (!back.ok) throw new Error("the app's own file would not read");
  return back.board;
};

describe("brdFitLook fits the fins first, then the bottom and the rails on the board with those fins (quick 261113-qyz)", () => {
  const twinFile = withFins(TWIN, "Futures");
  const twin = brdFitLook(twinFile);
  const bare = brdFitLook(withFins([0, 0, 0, 0, 0, 0, 0, 0, 0], null));

  it("a file with fins gets them fitted on the outline that opens: a twin, Modern/Upright, the system from its word", () => {
    expect(twin.fins).not.toBeNull();
    expect(twin.fins!.spec.finSetup).toBe("twin");
    expect(twin.fins!.spec.twinTemplate).toBe("upright");
    expect(twin.fins!.finSystem).toBe("futures");
    // the outline is the one fit once, the fins fitted on it
    expect(twin.fins).toEqual(fitBrdFins(twinFile.fins, twinFile.outline, twin.fit.outline));
  });

  it("a file with no fins has none fitted and the look is otherwise the same as a file whose fins were never in it", () => {
    expect(bare.fins).toBeNull();
    // fitted with no fins argument, a new board's fins are what the bottom was measured on, exactly as before
    const first = fitBoardToBrd({ length: bare.board.length, outline: bare.board.outline, bottom: bare.board.bottom, deck: bare.board.deck });
    expect(brdFittedBottomBoard(first).frontFins).toBe(brdFittedBottomBoard(first, undefined).frontFins);
    expect(brdFittedBottomBoard(first).frontFins).toBe(
      brdFittedBottomBoard(first, DEFAULT_FIN_PLACEMENT_SPEC).frontFins,
    );
  });

  it("measures the bottom on the board with the file's fins in place, the board that opens", () => {
    expect(twin.bottom).not.toBeNull();
    const withFinsBoard = brdFittedBottomBoard(twin.fit, twin.fins!.spec);
    // the closeness the look quotes is the one measured on the board that opens
    const measured = measureBrdBottom(twin.bottom!.bottom, twin.bottom!.sections, withFinsBoard);
    expect(measured.closeness.largest).toBeCloseTo(twin.bottom!.closeness.largest, 9);
    expect(measured.closeness.typical).toBeCloseTo(twin.bottom!.closeness.typical, 9);
  });

  it("opens the same bottom the preview showed: its tail cut stands where the preview measured, not where a new board's fins would put it", () => {
    const spec = twin.fins!.spec;
    const mine = brdFittedBottomBoard(twin.fit, spec);
    const newBoards = brdFittedBottomBoard(twin.fit);
    // the file's twin fins stand nearer the tail than a new board's thruster
    expect(mine.frontFins).toBeLessThan(newBoards.frontFins - inchesToMm(1));
    const stored = twin.bottom!.bottom;
    const stationOnMine = resolveCut("tail", stored.tail, mine);
    const stationOnNew = resolveCut("tail", stored.tail, newBoards);
    expect(stationOnMine.deepest).not.toBeCloseTo(stationOnNew.deepest, 3);
  });

  it("the rails are measured on the same board: with the fins in place the finished rail at the tail is the one the bottom's cut shapes there", () => {
    expect(twin.rails).not.toBeNull();
    const onFins = brdRailBoard(twin.fit, twin.bottom!.bottom, twin.fins!.spec);
    const onNew = brdRailBoard(twin.fit, twin.bottom!.bottom);
    const at = (b: ReturnType<typeof brdRailBoard>, inches: number) => JSON.stringify(brdOurRailHalf(b, DEFAULT_RAIL_BAND_SPEC, mm(inchesToMm(inches))));
    // somewhere along the tail the two boards' bottoms part (the fins stand 2" apart), so their finished rails do
    expect([1, 2, 3, 4, 6, 8, 10, 12].some((inches) => at(onFins, inches) !== at(onNew, inches))).toBe(true);
    expect(onFins.length).toBe(twin.fit.outline.length);
    // and with no fins argument a rail board is a new board's, as it always was
    expect(at(brdRailBoard(twin.fit, twin.bottom!.bottom, undefined), 4)).toBe(at(onNew, 4));
  });

  it("survives structured clone with nothing lost", () => {
    expect(structuredClone(twin.fins)).toEqual(twin.fins);
  });
});

describe("the FINS block, its lines and its drawing (quick 261113-qyz)", () => {
  const twin = brdFitLook(withFins(TWIN, "Futures"));
  const none = brdFitLook(withFins([0, 0, 0, 0, 0, 0, 0, 0, 0], null));
  const keel = brdFitLook(withFins([15.24, 10.16, 30.48, 7.62, 0, 0, 0, 0, 5.4], "Futures"));
  const tri = brdFitLook(withFins([24.13, 13.208, 35.814, 12.7, 8.89, 20.32, 0, 0, 0], "Futures"));
  const single = brdFitLook(withFins([0, 0, 0, 0, 15.24, 35.56, 0, 0, 0], null));
  const c = BRD_FIT_COPY;

  it("has rows for exactly the fins the file has: a side pair's four marks, a centre fin's two", () => {
    expect(brdFitSheet(twin, "T.brd", "imperial").fins!.rows.map((r) => r.key)).toEqual(["sideOffTail", "sideInFromRail", "sideToeIn", "sideBase"]);
    expect(brdFitSheet(tri, "T.brd", "imperial").fins!.rows.map((r) => r.key)).toEqual(["sideOffTail", "sideInFromRail", "sideToeIn", "sideBase", "centreOffTail", "centreBase"]);
    expect(brdFitSheet(single, "T.brd", "imperial").fins!.rows.map((r) => r.key)).toEqual(["centreOffTail", "centreBase"]);
  });

  it("says the file's marks and ours as marks: the founder's twin figures in Imperial, whole millimetres in Metric", () => {
    const imperial = brdFitSheet(twin, "T.brd", "imperial").fins!;
    expect(imperial.caption).toBe(c.finsCaption);
    const off = imperial.rows.find((r) => r.key === "sideOffTail")!;
    expect(off.label).toBe(c.finRowLabels.sideOffTail);
    expect(off.file).toBe(formatMark(twin.fins!.file.side!.offTail, "imperial"));
    expect(off.fit).toBe(formatMark(twin.fins!.ours.side!.offTail, "imperial"));
    expect(off.file).toBe(off.fit);
    const metric = brdFitSheet(twin, "T.brd", "metric").fins!;
    for (const row of metric.rows) {
      for (const figure of [row.file, row.fit]) expect(figure, row.key).toMatch(/^\d+ mm$/);
    }
    expect(metric.rows.find((r) => r.key === "sideOffTail")!.file).toBe(formatMark(twin.fins!.file.side!.offTail, "metric"));
  });

  it("says how close, by the one less-than rule, and names the widest gap when it is wider", () => {
    expect(brdFitSheet(twin, "T.brd", "imperial").closeness.fins).toBe(`Fins: ${lessThan(formatMarkOrLess(mm(Math.max(twin.fins!.largest.gap, 1e-6)), "imperial"))} off`);
    expect(brdFitSheet(twin, "T.brd", "imperial").closeness.fins).toBe('Fins: less than 1/16" off');
    expect(brdFitSheet(twin, "T.brd", "metric").closeness.fins).toBe("Fins: less than 1 mm off");
    // the Keel pattern's toe-in stops at FINS' 1/2" top, which leaves the toe-in as the widest gap
    const wide = brdFitSheet(keel, "K.brd", "imperial").closeness.fins!;
    expect(wide).toBe(c.finsClose(formatMarkOrLess(keel.fins!.largest.gap, "imperial"), c.finGapWhich[keel.fins!.largest.which]));
    expect(wide).toMatch(/^Fins: within .+, the widest gap the side fins' toe-in$/);
  });

  it("writes the controls line in FINS' own words and figures: the model, the system, then each label's figure", () => {
    const line = brdFitSheet(twin, "T.brd", "imperial").controls.fins!;
    expect(line).toBe(
      `Fins: Twin — Modern/Upright · Futures · Forward fins: Aft/Forward position — ${formatMark(twin.fins!.ours.side!.offTail, "imperial")} · Off-Rail — ${formatMark(twin.fins!.ours.side!.inFromRail, "imperial")} · Toe-In — ${formatMark(twin.fins!.ours.side!.toeIn, "imperial")} · Fin Base Length — ${formatMark(twin.fins!.ours.side!.base, "imperial")}`,
    );
    const centre = brdFitSheet(tri, "T.brd", "imperial").controls.fins!;
    expect(centre).toMatch(/ · Centre fin: Aft\/Forward position — .+ · Fin (Base|Box) Length — /);
    expect(brdFitSheet(single, "S.brd", "imperial").controls.fins).toMatch(/^Fins: Single Fin · FCS II · Centre fin: Aft\/Forward position — .+ · Fin Box Length — /);
  });

  it("uses FINS' own control words as fin-controls.tsx writes them", () => {
    const source = readFileSync(join(__dirname, "../../components/fins/fin-controls.tsx"), "utf8") + readFileSync(join(__dirname, "../geometry/fins.ts"), "utf8");
    for (const word of Object.values(c.finWords)) expect(source).toContain(word);
  });

  it("says a control that stopped short: the Keel pattern's toe-in, by how much, and the farthest FINS goes", () => {
    const notes = brdFitSheet(keel, "K.brd", "imperial").fins!.notes;
    const hold = keel.fins!.short.find((s) => s.control === "toeIn")!;
    expect(hold).toBeDefined();
    expect(notes).toContain(
      c.finHold(c.finHoldSubjects.sideToe, lessThan(formatMarkOrLess(hold.by, "imperial")), c.finHoldDirections.less, c.finWords.toeIn, formatMark(keel.fins!.ours.side!.toeIn, "imperial")),
    );
    expect(brdFitSheet(twin, "T.brd", "imperial").fins!.notes.filter((n) => n.includes("goes no further than"))).toEqual([]);
  });

  it("says a toe-out, and an unnamed system with the file's word only when it is a plain one", () => {
    const out = brdFitLook(withFins([24.13, 12.7, 35.814, 13.208, 0, 0, 0, 0, 0], "Futures"));
    expect(brdFitSheet(out, "O.brd", "imperial").fins!.notes).toContain(c.finToeOut);
    const quoted = brdFitLook(withFins(TWIN, "Thunderbolt"));
    expect(brdFitSheet(quoted, "Q.brd", "imperial").fins!.notes).toContain(c.finSystemQuoted("Thunderbolt"));
    expect(brdFitSheet(single, "S.brd", "imperial").fins!.notes).toContain(c.finSystemUnnamed);
    // a named system says nothing about it
    expect(brdFitSheet(twin, "T.brd", "imperial").fins!.notes.join(" ")).not.toMatch(/fin system/);
  });

  it("a file with no fins has no block, no closeness line, no controls line, no fin lines, and says so in the not-read line", () => {
    const sheet = brdFitSheet(none, "N.brd", "imperial");
    expect(sheet.fins).toBeNull();
    expect(sheet.closeness.fins).toBeNull();
    expect(sheet.controls.fins).toBeNull();
    expect(sheet.notRead).toBe(c.noFins);
    const frames = brdFitFrames(none, 800);
    expect(frames.top.fins).toEqual({ file: [], fit: [] });
  });

  it("the not-read line: a fin's depth and splay angle (cant) and a quad's rear fins when the file has fins; the fins don't sit when they were refused", () => {
    // the founder's twin figures carry a splay angle of 5.4 degrees (slot 8) and no depth
    expect(brdFitSheet(twin, "T.brd", "imperial").notRead).toBe(c.notReadFins(null, "5.4°"));
    const plain = brdFitLook(withFins([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 0], "Futures"));
    expect(brdFitSheet(plain, "P.brd", "imperial").notRead).toBe(c.notReadFins(null, null));
    expect(c.notReadFins(null, null)).toMatch(/^A fin's depth and splay angle \(cant\) aren't read: FINS has no control for either\./);
    expect(c.notReadFins(null, null)).toMatch(/A quad's rear fins aren't read from a file yet\.$/);
    expect(c.notReadFins(null, null)).not.toMatch(/no room|can't/);
    const refused = brdFitLook(withFins([35.814, 13.208, 24.13, 12.7, 0, 0, 0, 0, 0], null));
    expect(refused.fins).toBeNull();
    expect(brdFitSheet(refused, "R.brd", "imperial").notRead).toBe(c.finsDontSit);
    // the sections part still comes first when the rails were not read
    expect(brdFitSheet({ ...twin, rails: null }, "T.brd", "imperial").notRead).toBe(`${c.notReadAfterBottom} ${c.notReadFins(null, "5.4°")}`);
  });

  it("quotes the file's fin depth and splay angle when it has them (slots 7 and 8, as AkuShaper's own panel names them), never fitted", () => {
    const deep = brdFitLook(withFins([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 9.5, 5.4], "Futures"));
    const imperial = brdFitSheet(deep, "D.brd", "imperial").notRead;
    expect(imperial).toBe(c.notReadFins('3 3/4"', "5.4°"));
    expect(imperial).toBe(`The file's side fins are 3 3/4" deep at a splay angle (cant) of 5.4°: FINS has no control for either, so they aren't read. A quad's rear fins aren't read from a file yet.`);
    expect(brdFitSheet(deep, "D.brd", "metric").notRead).toContain("95 mm deep at a splay angle (cant) of 5.4°");
    // neither figure moves the fit
    expect(deep.fins).toEqual(twin.fins);
    const splayOnly = brdFitLook(withFins([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 5.4], "Futures"));
    expect(brdFitSheet(splayOnly, "S.brd", "imperial").notRead).toBe(c.notReadFins(null, "5.4°"));
    expect(c.notReadFins('3 3/4"', null)).toMatch(/is not$|isn't read\./);
  });

  it("draws one line per fin on the top view, a pair mirrored: the file's two and ours two, inside the drawing, nose at the left", () => {
    const frames = brdFitFrames(twin, 800);
    expect(frames.top.fins.file).toHaveLength(2);
    expect(frames.top.fins.fit).toHaveLength(2);
    for (const [a, b] of [...frames.top.fins.file, ...frames.top.fins.fit]) {
      for (const [x, y] of [a, b]) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(frames.width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(frames.top.height);
      }
      // the back end is nearer the tail, so further right
      expect(a[0]).toBeGreaterThan(b[0]);
    }
    const centreY = frames.top.stringer.y;
    const [above, below] = frames.top.fins.file;
    expect(above[0][1] + below[0][1]).toBeCloseTo(2 * centreY, 6);
    // the file's back end stands where the file says, through the same station transform as the outline
    expect(above[0][0]).toBeCloseTo(BRD_PREVIEW_PAD_X + (twin.board.length - twin.board.fins.side!.back[0]) * frames.scale, 6);
    // our fins are FINS' own marks
    const ours = frames.top.fins.fit.map(([a]) => a[0]);
    expect(ours[0]).toBeCloseTo(BRD_PREVIEW_PAD_X + (twin.board.length - twin.fins!.ours.side!.offTail) * frames.scale, 6);
  });

  it("draws a centre fin on the stringer and a thruster's three fins for a side-and-centre file", () => {
    const frames = brdFitFrames(tri, 800);
    expect(frames.top.fins.file).toHaveLength(3);
    const onStringer = frames.top.fins.file.filter(([a, b]) => a[1] === frames.top.stringer.y && b[1] === frames.top.stringer.y);
    expect(onStringer).toHaveLength(1);
    expect(frames.top.fins.fit).toHaveLength(3);
  });

  it("lays the fin lines out in a box on paper through the same transform", () => {
    const frames = brdFitFramesInBox(twin, { width: 180, height: 120 }, 1, 6);
    expect(frames.top.fins.file).toHaveLength(2);
    for (const [a, b] of frames.top.fins.file) {
      expect(a[0]).toBeLessThanOrEqual(180 + 1e-9);
      expect(b[0]).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});
