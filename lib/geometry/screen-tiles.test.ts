import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import type { Point2D } from "./board";
import { prepareBlank, thinningStartsOf } from "./blank-fit";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { deriveEffectiveRails } from "./design";
import { computeFinPlacement, importedFinTailFromOutline, type FinMark } from "./fins";
import { buildOutline, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { computeRailBands, railPlotDots, type RailSectionOutput } from "./rail-bands";
import {
  TILE_ART_FRAME,
  boxOfPoints,
  finsTileArt,
  formatTileLitres,
  meetScale,
  outlineTileArt,
  padBox,
  polylinePath,
  railsTileArt,
  rockerTileArt,
  screenTileLines,
  summaryTileArt,
  viewBoxOf,
} from "./screen-tiles";
import { presetSummary } from "./summary-line";
import { mm } from "./units";

/**
 * Each preset's board exactly as the design store builds it once the preset is opened
 * (components/design/design-store.tsx's memos: outline, side profile in its blank, effective rails
 * read off the foil, fins importing the template, the fin tail with the store's connector rule).
 */
function presetBoard(preset: BoardPreset) {
  const fields = presetDesignFields(preset);
  const outline = buildOutline(fields.outline);
  const sideProfile = buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker,
    foil: fields.foil,
    blank: {
      prepared: prepareBlank(fields.blank.copy),
      placement: fields.blank.placement,
      nose12Offset: fields.blank.nose12Offset,
      tail12Offset: fields.blank.tail12Offset,
      deckSkin: fields.blank.deckSkin,
      tipStyle: fields.blank.tipStyle,
      fineTuneSurface: fields.blank.fineTuneSurface,
      ...thinningStartsOf(fields.blank),
    },
  });
  const railBands = computeRailBands(deriveEffectiveRails(fields.rails, sideProfile.effectiveFoil, true));
  const effectiveFins = {
    ...fields.fins,
    boardLength: fields.outline.length,
    tailWidth12: outline.tailWidthAt12in,
    tailShape: fields.outline.tail.kind,
  };
  const importedTail = importedFinTailFromOutline(outline);
  const finPlacement = computeFinPlacement(effectiveFins, importedTail);
  const tailKind = fields.outline.tail.kind;
  const connector: Point2D | null =
    tailKind === "diamond"
      ? { x: mm(0), y: mm(0) }
      : tailKind === "swallow"
        ? { x: mm(0), y: outline.centreCloseStation }
        : null;
  return {
    fields,
    outline,
    sideProfile,
    railBands,
    finSetup: effectiveFins.finSetup,
    finTail: { points: importedTail.points, connector },
    marks: finPlacement.marks,
  };
}

const PRESET = Object.fromEntries(BOARD_PRESETS.map((preset) => [preset.id, preset])) as Record<
  BoardPreset["id"],
  BoardPreset
>;
const shortboard = presetBoard(PRESET.shortboard);

/** Every coordinate pair in a path written by `polylinePath` ("M x y L x y … [Z]"). */
function pathPoints(d: string): { x: number; y: number }[] {
  const numbers = d
    .replace(/[MLZ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < numbers.length; i += 2) out.push({ x: numbers[i], y: numbers[i + 1] });
  return out;
}

function parseViewBox(viewBox: string) {
  const [minX, minY, width, height] = viewBox.split(" ").map(Number);
  return { minX, minY, width, height };
}

function span(values: number[]) {
  return Math.max(...values) - Math.min(...values);
}

function expectInside(points: { x: number; y: number }[], viewBox: string) {
  const vb = parseViewBox(viewBox);
  for (const p of points) {
    expect(p.x).toBeGreaterThanOrEqual(vb.minX - 0.01);
    expect(p.x).toBeLessThanOrEqual(vb.minX + vb.width + 0.01);
    expect(p.y).toBeGreaterThanOrEqual(vb.minY - 0.01);
    expect(p.y).toBeLessThanOrEqual(vb.minY + vb.height + 0.01);
  }
}

describe("the small box helpers", () => {
  it("boxOfPoints is the tight box around the points", () => {
    expect(
      boxOfPoints([
        { x: 1, y: 2 },
        { x: 5, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toEqual({ minX: 1, minY: 0, width: 4, height: 4 });
  });

  it("padBox pads every side by the fraction of the longer side", () => {
    // A 4 × 2 box, 10% of its longer side (4) is 0.4 on every side.
    const padded = padBox({ minX: 0, minY: 0, width: 4, height: 2 }, 0.1);
    expect(padded.minX).toBeCloseTo(-0.4, 10);
    expect(padded.minY).toBeCloseTo(-0.4, 10);
    expect(padded.width).toBeCloseTo(4.8, 10);
    expect(padded.height).toBeCloseTo(2.8, 10);
  });

  it("viewBoxOf writes four numbers to two decimals", () => {
    expect(viewBoxOf({ minX: -1.234, minY: 0, width: 10, height: 2.5 })).toBe("-1.23 0.00 10.00 2.50");
  });

  it("meetScale is the smaller of the two fits, as preserveAspectRatio meet does", () => {
    expect(meetScale({ minX: 0, minY: 0, width: 100, height: 50 }, 108, 46)).toBeCloseTo(0.92, 10);
    expect(meetScale({ minX: 0, minY: 0, width: 10, height: 50 }, 108, 46)).toBeCloseTo(0.92, 10);
  });

  it("polylinePath writes M then L, two decimals, Z when closed", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ];
    expect(polylinePath(pts, true)).toBe("M 0.00 0.00 L 1.00 2.00 Z");
    expect(polylinePath(pts, false)).toBe("M 0.00 0.00 L 1.00 2.00");
  });

  it("the art frame is an upright iPhone's tile picture box", () => {
    expect(TILE_ART_FRAME).toEqual({ width: 108, height: 46 });
  });
});

describe("outlineTileArt — TEMPLATE's silhouette", () => {
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: lying down, nose left, the board's length by its widest width`, () => {
      const { outline, fields } = presetBoard(preset);
      const art = outlineTileArt(outline, "lying");
      const pts = pathPoints(art.board);
      expect(art.board.endsWith("Z")).toBe(true);
      expect(Math.abs(span(pts.map((p) => p.x)) - fields.outline.length)).toBeLessThan(0.5);
      expect(Math.abs(span(pts.map((p) => p.y)) - 2 * outline.halfWidePointWidth)).toBeLessThan(0.5);
      // The nose (the largest station) is the left end; the tail sits at x = 0.
      const noseX = -Math.max(...outline.points.map((p) => p.station));
      expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(noseX, 1);
      expect(Math.max(...pts.map((p) => p.x))).toBeLessThanOrEqual(0.005);
      expectInside(pts, art.viewBox);
    });
  }

  it("standing up, nose at the top, the board's width by its length", () => {
    const { outline, fields } = shortboard;
    const art = outlineTileArt(outline, "standing");
    const pts = pathPoints(art.board);
    expect(Math.abs(span(pts.map((p) => p.y)) - fields.outline.length)).toBeLessThan(0.5);
    expect(Math.abs(span(pts.map((p) => p.x)) - 2 * outline.halfWidePointWidth)).toBeLessThan(0.5);
    const noseY = -Math.max(...outline.points.map((p) => p.station));
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(noseY, 1);
    expectInside(pts, art.viewBox);
  });

  it("follows the silhouette order TEMPLATE draws: right half tail to nose, left half back, the stringer close", () => {
    const { outline } = shortboard;
    const pts = pathPoints(outlineTileArt(outline, "lying").board);
    const n = outline.points.length;
    expect(pts.length).toBe(2 * n + 1);
    expect(pts[0].x).toBeCloseTo(-outline.points[0].station, 1);
    expect(pts[0].y).toBeCloseTo(outline.points[0].halfWidth, 1);
    expect(pts[n].y).toBeCloseTo(-outline.points[n - 1].halfWidth, 1);
    expect(pts[2 * n].x).toBeCloseTo(-outline.centreCloseStation, 1);
    expect(pts[2 * n].y).toBeCloseTo(0, 5);
  });
});

/** The board's own 60-sample bottom and deck, as ROCKER samples it. */
function profileSamples(profile: BoardSideProfile) {
  const out: { station: number; bottom: number; deck: number }[] = [];
  for (let i = 0; i <= 60; i++) {
    const station = mm((profile.length * i) / 60);
    out.push({ station, bottom: profile.rockerAt(station), deck: profile.deckAt(station) });
  }
  return out;
}

describe("rockerTileArt — ROCKER's side profile in its blank", () => {
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: nose left, levelled, true proportions, the blank behind it`, () => {
      const { sideProfile } = presetBoard(preset);
      const art = rockerTileArt(sideProfile);
      const pts = pathPoints(art.board);
      expect(art.board.endsWith("Z")).toBe(true);
      expect(pts.length).toBe(2 * 61);
      // Length along x, nose (station = length) on the left.
      expect(Math.abs(span(pts.map((p) => p.x)) - sideProfile.length)).toBeLessThan(0.5);
      expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(-sideProfile.length, 1);
      // Up is negative y in a picture: the board's lowest bottom point reads 0.
      expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(0, 1);
      // True proportions: the box's height over its width is the board's own rise over its length.
      const samples = profileSamples(sideProfile);
      const rise = Math.max(...samples.map((s) => s.deck)) - Math.min(...samples.map((s) => s.bottom));
      const box = boxOfPoints(pts);
      expect(box.height / box.width).toBeCloseTo(rise / sideProfile.length, 4);

      const blank = sideProfile.blank!;
      expect(art.blank).not.toBeNull();
      const blankPts = pathPoints(art.blank!);
      expect(blankPts.length).toBe(2 * 121);
      expect(Math.abs(span(blankPts.map((p) => p.x)) - (blank.end - blank.start))).toBeLessThan(0.5);
      expectInside(blankPts, art.viewBox);
      expectInside(pts, art.viewBox);
    });
  }

  it("a hand-set board has no blank, and the picture frames the board", () => {
    const profile: BoardSideProfile = { ...shortboard.sideProfile, blank: null };
    const art = rockerTileArt(profile);
    expect(art.blank).toBeNull();
    const pts = pathPoints(art.board);
    const box = boxOfPoints(pts);
    const vb = parseViewBox(art.viewBox);
    expectInside(pts, art.viewBox);
    // Framed around the board alone: the view is only a little wider than the board.
    expect(vb.width).toBeLessThan(box.width * 1.1);
  });
});

describe("railsTileArt — RAILS' centre section", () => {
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: every band as a line, the plot's own dots, y turned up`, () => {
      const section: RailSectionOutput = presetBoard(preset).railBands.center;
      const art = railsTileArt(section);
      expect(art.lines.map((l) => l.key)).toEqual(section.segments.map((s) => s.key));
      art.lines.forEach((line, i) => {
        const seg = section.segments[i];
        expect(line).toEqual({ key: seg.key, x1: seg.p1.x, y1: -seg.p1.y, x2: seg.p2.x, y2: -seg.p2.y });
      });
      const dots = railPlotDots(section.segments, section.result, section.domed);
      expect(art.dots).toEqual(dots.map((d) => ({ key: d.key, cx: d.x, cy: -d.y })));
      const vb = parseViewBox(art.viewBox);
      expect(art.dotRadius * meetScale(vb, TILE_ART_FRAME.width, TILE_ART_FRAME.height)).toBeCloseTo(1.5, 1);
      expectInside(
        art.lines.flatMap((l) => [
          { x: l.x1, y: l.y1 },
          { x: l.x2, y: l.y2 },
        ]),
        art.viewBox,
      );
    });
  }
});

describe("finsTileArt — FINS' tail and fins, lying down, tail right", () => {
  const expectedFins: Record<BoardPreset["id"], number> = { shortboard: 3, fish: 2, midlength: 4, longboard: 1 };
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: tail end at the right, one line per fin`, () => {
      const { finTail, marks } = presetBoard(preset);
      const art = finsTileArt(finTail, marks);
      const pts = pathPoints(art.fill);
      for (const p of pts) expect(p.x).toBeLessThanOrEqual(0.005);
      expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(0, 1);
      expect(art.fill.endsWith("Z")).toBe(true);
      expect(art.outline.endsWith("Z")).toBe(false);
      expect(art.fins.length).toBe(marks.length);
      expect(marks.length).toBe(expectedFins[preset.id]);
      art.fins.forEach((fin, i) => {
        const mark: FinMark = marks[i];
        expect(fin.dashed).toBe(mark.lateralKind !== "none");
        expect(fin.x1).toBeCloseTo(-mark.offTail, 5);
        expect(fin.y1).toBeCloseTo(mark.lateral, 5);
        expect(fin.x2).toBeCloseTo(-mark.leadingOffTail, 5);
        expect(fin.y2).toBeCloseTo(mark.leadingLateral, 5);
      });
      expectInside(pts, art.viewBox);
    });
  }

  it("a swallow's connector sits between the two halves", () => {
    const points = [
      { x: mm(100), y: mm(0) },
      { x: mm(150), y: mm(300) },
    ];
    const art = finsTileArt({ points, connector: { x: mm(0), y: mm(80) } }, []);
    const pts = pathPoints(art.outline);
    // Left half reversed (−w), the connector, then the right half.
    expect(pts.map((p) => [p.x, p.y])).toEqual([
      [-300, -150],
      [0, -100],
      [-80, 0],
      [0, 100],
      [-300, 150],
    ]);
  });
});

describe("summaryTileArt — a small order form with the board standing in it", () => {
  it("the page, five rules, and the board fitted in the left column with its proportions kept", () => {
    const { outline, fields } = shortboard;
    const art = summaryTileArt(outline);
    expect(art.viewBox).toBe("0 0 100 46");
    expect(art.page).toEqual({ x: 33, y: 2, width: 34, height: 42, rx: 2 });
    expect(art.rules).toEqual([
      { x1: 50, y1: 10, x2: 63, y2: 10 },
      { x1: 50, y1: 17, x2: 63, y2: 17 },
      { x1: 50, y1: 24, x2: 60, y2: 24 },
      { x1: 50, y1: 31, x2: 63, y2: 31 },
      { x1: 50, y1: 38, x2: 58, y2: 38 },
    ]);
    const pts = pathPoints(art.board);
    const box = boxOfPoints(pts);
    expect(box.minX).toBeGreaterThanOrEqual(35 - 0.01);
    expect(box.minX + box.width).toBeLessThanOrEqual(47 + 0.01);
    expect(box.minY).toBeGreaterThanOrEqual(5 - 0.01);
    expect(box.minY + box.height).toBeLessThanOrEqual(41 + 0.01);
    // A board is far longer than wide, so it fills the column's height.
    expect(box.height).toBeCloseTo(36, 1);
    const ratio = (2 * outline.halfWidePointWidth) / fields.outline.length;
    expect(box.width / box.height).toBeCloseTo(ratio, 2);
    // Centred across the column.
    expect(box.minX + box.width / 2).toBeCloseTo(41, 1);
  });
});

describe("formatTileLitres — VOLUME's figure", () => {
  it("is each preset card's own litres to one decimal", () => {
    const expected: Record<BoardPreset["id"], string> = {
      shortboard: "29.6",
      fish: "35.3",
      midlength: "50.4",
      longboard: "75.3",
    };
    for (const preset of BOARD_PRESETS) {
      expect(formatTileLitres(presetSummary(preset).volumeLitres)).toBe(expected[preset.id]);
    }
  });
});

describe("screenTileLines — the line under each tile's name", () => {
  const expected: Record<BoardPreset["id"], { template: string; rocker: string; fins: string }> = {
    shortboard: { template: `6'2" × 18 3/4"`, rocker: `On a 6'3"RP`, fins: "Thruster" },
    fish: { template: `5'8" × 20 1/4"`, rocker: `On a 5'10"RP`, fins: "Twin" },
    midlength: { template: `7'2" × 21 1/4"`, rocker: `On a 7'4"SP`, fins: "Quad" },
    longboard: { template: `9'0" × 22 1/2"`, rocker: `On a 9'3"Y`, fins: "Single Fin" },
  };
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: its dims, its blank, its fin setup`, () => {
      const { fields, finSetup } = presetBoard(preset);
      const lines = screenTileLines({ outline: fields.outline, blank: fields.blank, finSetup, system: "imperial" });
      expect(lines).toEqual({
        template: expected[preset.id].template,
        rocker: expected[preset.id].rocker,
        rails: "Center rail",
        volume: "Estimated",
        fins: expected[preset.id].fins,
        summary: "Order form",
      });
    });
  }

  it("a hand-set board reads Hand-set", () => {
    const { fields, finSetup } = shortboard;
    expect(screenTileLines({ outline: fields.outline, blank: null, finSetup, system: "imperial" }).rocker).toBe(
      "Hand-set",
    );
  });

  it("Metric changes only the template line", () => {
    const { fields, finSetup } = shortboard;
    const imperial = screenTileLines({ outline: fields.outline, blank: fields.blank, finSetup, system: "imperial" });
    const metric = screenTileLines({ outline: fields.outline, blank: fields.blank, finSetup, system: "metric" });
    expect(metric.template).toMatch(/^\d+\.\d × \d+\.\d cm$/);
    expect({ ...metric, template: "" }).toEqual({ ...imperial, template: "" });
  });
});
