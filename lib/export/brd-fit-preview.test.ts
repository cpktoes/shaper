import { describe, expect, it } from "vitest";
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { buildBoardSurface } from "../geometry/board-surface";
import { fitBoardToBrd } from "../geometry/brd-fit";
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
import { brdFitFrames, brdFitWords, brdLengthWords, type BrdFitLook } from "./brd-fit-preview";
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
