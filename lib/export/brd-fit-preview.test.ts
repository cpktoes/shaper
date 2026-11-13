import { describe, expect, it } from "vitest";
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { buildBoardSurface } from "../geometry/board-surface";
import { BRD_STRAIGHTEDGE_MM, brdFileStations, brdFileWidths, fitBoardToBrd, fitOutlineWidths, outlineGapSide } from "../geometry/brd-fit";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "../geometry/design";
import { formatDim, formatMark, formatMarkOrLess, formatSignedDim, stationLabel } from "../geometry/measure-display";
import { buildOutline } from "../geometry/outline";
import { formatCentimetres, formatFeetInches, formatInchesFraction, inchesToMm, mm } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { brdText } from "./brd";
import { BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y, brdStationX } from "./brd-preview";
import {
  BRD_FIT_COPY,
  brdFitFrames,
  brdFitFramesInBox,
  brdFitSheet,
  brdFitWords,
  brdLengthWords,
  closenessSentence,
  type BrdFitLook,
} from "./brd-fit-preview";
import { BOARD_NAME_MAX_LENGTH } from "../models/board-file";
import { readAnyBrd } from "./brd-read";

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
const look: BrdFitLook = {
  board,
  fit: fitBoardToBrd({ length: board.length, outline: board.outline, bottom: board.bottom, deck: board.deck }),
};

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

  it("writes angles and percentages rounded for display only", () => {
    const words = brdFitWords(look, "imperial");
    expect(words.controls.noseAngle).toBe(`${Math.round(look.fit.outline.noseAngle)}°`);
    expect(words.controls.tailFullness).toBe(`${Math.round(look.fit.outline.tailFullness)}%`);
    expect(words.controls.noseRail).toBe(`${Math.round(look.fit.outline.noseRailLength)}%`);
  });

  it("names the tail and gives a squash its block and a pointed tail none", () => {
    const squash = brdFitWords(look, "imperial").controls;
    expect(look.fit.outline.tail.kind).toBe("squash");
    expect(squash.tail).toBe("Squash");
    expect(squash.tailBlock).toBe(formatDim((look.fit.outline.tail as { endWidth: number }).endWidth as never, "imperial"));
    const pointed = brdFitWords({ board, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "pin" } } } }, "imperial").controls;
    expect(pointed.tail).toBe("Pin");
    expect(pointed.tailBlock).toBeNull();
    const round = brdFitWords({ board, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "round" } } } }, "imperial").controls;
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
      board,
      fit: { ...look.fit, closeness: { ...look.fit.closeness, outline: { largest: mm(largest), typical: mm(largest), at: mm(0) } } },
    });
    expect(brdFitWords(tiny(0.3), "metric").outline.largest).toBe("<1 mm");
    expect(brdFitWords(tiny(0), "metric").outline.largest).toBe("0 mm");
    expect(brdFitWords(tiny(0.3), "imperial").outline.largest).toBe('<1/16"');
  });

  it("falls back to the lines for a file with no size fields", () => {
    const bare = { board: { ...board, width: null, thickness: null }, fit: look.fit };
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
      board,
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
  const made = { length: mm(L), width: mm(2 * half), thickness: mm(60), outline, bottom, deck };
  return { board: made, fit: fitBoardToBrd({ length: made.length, outline, bottom, deck }) };
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
    const centred = brdFitSheet({ board, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: mm(0) } } }, "x.brd", "imperial");
    expect(wideAt(centred).fit).toBe(BRD_FIT_COPY.atCentre);
    const forward = brdFitSheet({ board, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: inchesToMm(2) } } }, "x.brd", "imperial");
    expect(wideAt(forward).fit).toBe(BRD_FIT_COPY.forward(formatDim(inchesToMm(2), "imperial")));
    const back = brdFitSheet({ board, fit: { ...look.fit, outline: { ...look.fit.outline, widePointOffset: inchesToMm(-2) } } }, "x.brd", "metric");
    expect(wideAt(back).fit).toBe(BRD_FIT_COPY.back(formatDim(inchesToMm(2), "metric")));
  });

  it("reads a tail that closes to the stringer as having no flat end", () => {
    const widths = brdFileWidths(board);
    const tailEnd = (s: typeof imperial) => s.tables[0].rows.find((r) => r.key === "tailEnd")!;
    if (widths.tailEnd === null) expect(tailEnd(imperial).file).toBe(BRD_FIT_COPY.noFlatEnd);
    const pointed = brdFitSheet({ board, fit: { ...look.fit, outline: { ...look.fit.outline, tail: { kind: "round" } } } }, "x.brd", "imperial");
    expect(tailEnd(pointed).fit).toBe(BRD_FIT_COPY.noFlatEnd);
  });

  it("has no point notes for the app's own Shortboard, and one per pointed tip, nose first, for a board that has them", () => {
    expect(imperial.pointNotes).toEqual([]);
    const bottom: P2[] = [[0, 50], [1000, 0], [1993.65, 79.492], [2000, 99.492]];
    const deck: P2[] = [[0, 100], [1000, 50], [1993.65, 129.492], [2000, 99.492]];
    const outline: P2[] = [[0, 0], [0, 120], [700, 240], [1000, 260], [1500, 200], [2000, 0]];
    const made = { length: mm(2000), width: null, thickness: null, outline, bottom, deck };
    const pointed = brdFitSheet({ board: made, fit: look.fit }, "Egg.brd", "imperial");
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
    expect(imperial.notRead).toBe(BRD_FIT_COPY.notRead);
    expect(imperial.controls).toEqual({
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
