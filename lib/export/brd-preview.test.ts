import { describe, expect, it } from "vitest";
import {
  buildBoardSurface,
  type BoardSurface,
} from "../geometry/board-surface";
import {
  DEFAULT_BOTTOM,
  resolveBottom,
  startingChannels,
  startingCut,
} from "../geometry/bottom";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../geometry/design";
import { buildOutline } from "../geometry/outline";
import { formatDim } from "../geometry/measure-display";
import {
  centimetresToMm,
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  inchesToMm,
  UNITS_SYSTEMS,
} from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import {
  BRD_SECTION_SPACING_IN,
  brdBottomStations,
  brdFile,
  brdFileBottom,
  readBrdText,
  type BrdOptions,
} from "./brd";
import { unscrambleBrd } from "./brd-scramble";
import {
  BRD_PREVIEW_PAD_X,
  BRD_PREVIEW_PAD_Y,
  brdFileWithPreview,
  brdPreview,
  brdPreviewFrames,
  brdPreviewWords,
  brdSliceNearest,
  brdStationAtX,
  brdStationX,
  type BrdPreview,
} from "./brd-preview";

/**
 * The preview on three boards: the flat Shortboard, the Fish and the Shortboard with a Deep Single Concave and four
 * channels, the last made the way the 3D page makes it (channels left out through `brdFileBottom`). Boards are built
 * once, at module scope: a fit takes seconds. Every expected number is the file's own, read through its own readers.
 */
const BOARDS = phase16Boards();
const fieldsOf = (label: string): DesignSummaryFields => {
  const board = BOARDS.find((b) => b.label === label);
  if (!board) throw new Error(`no board ${label}`);
  return board.fields;
};

function flatSurface(fields: DesignSummaryFields): BoardSurface {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  return buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
}

function deepSingle(fields: DesignSummaryFields): { surface: BoardSurface; options: BrdOptions } {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: startingCut("center", "Deep Single Concave", board),
    channels: startingChannels(4, board, DEFAULT_BOTTOM.channels),
  };
  const fileBottom = brdFileBottom(bottom, board);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom: fileBottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return { surface, options: { bottomStations: brdBottomStations(resolveBottom(fileBottom, board)) } };
}

const deep = deepSingle(fieldsOf("shortboard|asis|hard"));

const CASES: [string, BoardSurface, BrdOptions][] = [
  ["the flat Shortboard", flatSurface(fieldsOf("shortboard|asis|hard")), {}],
  ["the Fish", flatSurface(fieldsOf("fish|asis|hard")), {}],
  ["the Deep Single Shortboard", deep.surface, deep.options],
];

/** The slice nearest half the length: where a Deep Single is deepest. */
function middleSlice(preview: BrdPreview) {
  return preview.slices[brdSliceNearest(preview, preview.length / 2)];
}

describe.each(CASES)("the board file preview on %s", (_label, surface, options) => {
  const made = brdFileWithPreview(surface, "Test Board", options);
  const plain = brdFile(surface, "Test Board", options);
  const read = readBrdText(unscrambleBrd(made.data));
  const { preview } = made;

  it("saves the very bytes brdFile writes, and its name and count", () => {
    expect(Buffer.from(made.data).equals(Buffer.from(plain.data))).toBe(true);
    expect(made.name).toBe(plain.name);
    expect(made.sectionCount).toBe(plain.sectionCount);
  });

  it("has one slice for every fitted section the file carries", () => {
    expect(preview.slices.length).toBe(made.sectionCount);
    expect(preview.slices.length).toBe(read.sections.filter((s) => s.knots.length > 1).length);
    expect(preview.slices.map((s) => s.number)).toEqual(preview.slices.map((_, i) => i + 1));
  });

  it("stands every slice line as wide as the outline there, within half a millimetre of the slice's own reach", () => {
    for (const slice of preview.slices) expect(Math.abs(slice.halfWidth - slice.reach)).toBeLessThan(0.5);
  });

  it("stands every upright line as tall as the slice's own thickness, within half a millimetre", () => {
    for (const slice of preview.slices) expect(Math.abs(slice.deck - slice.bottom - slice.thickness)).toBeLessThan(0.5);
  });

  it("is made of finite numbers, with stations rising from the tail to the nose", () => {
    const numbers: number[] = [preview.length, preview.width, preview.thickness, preview.widestGap, preview.openingSlice];
    for (const line of [preview.outline, preview.bottom, preview.deck]) numbers.push(...line.flat());
    for (const s of preview.slices) {
      numbers.push(s.station, s.halfWidth, s.reach, s.bottom, s.deck, s.thickness, ...s.section.flat(), ...s.knots.flat());
    }
    expect(numbers.every(Number.isFinite)).toBe(true);
    preview.slices.forEach((s, i) => {
      if (i > 0) expect(s.station).toBeGreaterThan(preview.slices[i - 1].station);
    });
  });

  it("reads length, width and thickness from the header, in millimetres", () => {
    const field = (key: string) => Number(read.header.find(([k]) => k === key)?.[1]);
    expect(preview.length).toBe(centimetresToMm(field("p01")));
    expect(preview.width).toBe(centimetresToMm(field("p04")));
    expect(preview.thickness).toBe(centimetresToMm(field("p03")));
  });

  it("reports the widest gap between neighbouring sections, ends included, within the file's own spacing", () => {
    let widest = 0;
    for (let i = 1; i < read.sections.length; i++) {
      widest = Math.max(widest, centimetresToMm(read.sections[i].station - read.sections[i - 1].station));
    }
    expect(preview.widestGap).toBe(widest);
    expect(preview.widestGap).toBeLessThanOrEqual(inchesToMm(BRD_SECTION_SPACING_IN) + 1e-6);
  });

  it("opens on the slice nearest the outline's widest knot", () => {
    const widest = read.outline.reduce((best, knot) => (knot.point[1] > best.point[1] ? knot : best));
    const at = centimetresToMm(widest.point[0]);
    const nearest = preview.slices.reduce((best, s, i) =>
      Math.abs(s.station - at) < Math.abs(preview.slices[best].station - at) ? i : best, 0);
    expect(preview.openingSlice).toBe(nearest);
  });

  it("brdPreview of the read file equals the preview made with it", () => {
    expect(brdPreview(read)).toEqual(preview);
  });
});

describe("the preview's middle slice", () => {
  it("dips below the stringer on the Deep Single by more than a millimetre", () => {
    const preview = brdFileWithPreview(deep.surface, "Deep", deep.options).preview;
    const lowest = Math.min(...middleSlice(preview).section.map(([, up]) => up));
    expect(lowest).toBeLessThan(-1);
  });

  it("stays flat on the flat Shortboard, none lower than half a millimetre below", () => {
    const preview = brdFileWithPreview(CASES[0][1], "Flat").preview;
    const lowest = Math.min(...middleSlice(preview).section.map(([, up]) => up));
    expect(lowest).toBeGreaterThan(-0.5);
  });
});

describe("brdSliceNearest", () => {
  const { preview } = brdFileWithPreview(CASES[0][1], "Flat");
  it("finds each slice from its own station and one past either end", () => {
    preview.slices.forEach((s, i) => expect(brdSliceNearest(preview, s.station)).toBe(i));
    expect(brdSliceNearest(preview, -1e6)).toBe(0);
    expect(brdSliceNearest(preview, 1e6)).toBe(preview.slices.length - 1);
  });
});

/** Widths a phone and a computer give the drawings (dots). */
const WIDTHS = [330, 760, 1000];

describe.each(CASES)("the preview's drawings on %s", (_label, surface, options) => {
  const { preview } = brdFileWithPreview(surface, "Test Board", options);

  it.each(WIDTHS)("keeps every point inside its box at %i dots wide", (width) => {
    const f = brdPreviewFrames(preview, width);
    const inside = (points: readonly (readonly [number, number])[], height: number) =>
      points.every(([x, y]) => x >= -1e-9 && x <= width + 1e-9 && y >= -1e-9 && y <= height + 1e-9);
    expect(inside(f.top.outline, f.top.height)).toBe(true);
    expect(inside(f.side.outline, f.side.height)).toBe(true);
    for (const slice of f.slices) {
      expect(inside(slice.outline, f.sliceHeight)).toBe(true);
      expect(inside(slice.knots, f.sliceHeight)).toBe(true);
    }
  });

  it("stands each slice line in the top view exactly above its line in the side view, nose at the left", () => {
    const f = brdPreviewFrames(preview, 760);
    f.top.slices.forEach((line, i) => {
      expect(line.x).toBe(f.side.slices[i].x);
      expect(line.number).toBe(preview.slices[i].number);
    });
    expect(brdStationX(f, preview.length)).toBeCloseTo(BRD_PREVIEW_PAD_X, 9);
    expect(brdStationX(f, 0)).toBeCloseTo(760 - BRD_PREVIEW_PAD_X, 9);
    // Station rises toward the nose, so x falls: the tail's slice 1 is the right-most.
    expect(f.top.slices[0].x).toBeGreaterThan(f.top.slices[f.top.slices.length - 1].x);
  });

  it("draws the side view at true height: one scale for both axes", () => {
    const f = brdPreviewFrames(preview, 760);
    const high = Math.max(...preview.deck.map(([, h]) => h));
    const low = Math.min(...preview.bottom.map(([, h]) => h));
    const trueRatio = (high - low) / preview.length;
    const drawnRatio = (f.side.height - 2 * BRD_PREVIEW_PAD_Y) / (760 - 2 * BRD_PREVIEW_PAD_X);
    expect(Math.abs(drawnRatio / trueRatio - 1)).toBeLessThan(0.01);
  });

  it("draws each slice mirrored about the stringer at one scale, the widest filling the width", () => {
    const f = brdPreviewFrames(preview, 760);
    const reachMax = Math.max(...preview.slices.map((s) => s.reach));
    expect(f.sliceScale * 2 * reachMax).toBeCloseTo(760 - 2 * BRD_PREVIEW_PAD_X, 9);
    f.slices.forEach((slice, i) => {
      const half = slice.outline.length / 2;
      for (let k = 0; k < half; k++) {
        const right = slice.outline[k];
        const left = slice.outline[slice.outline.length - 1 - k];
        expect(left[0]).toBeCloseTo(760 - right[0], 9);
        expect(left[1]).toBeCloseTo(right[1], 9);
      }
      // Its knot dots sit on its right half.
      for (const [x] of slice.knots) expect(x).toBeGreaterThanOrEqual(760 / 2 - 1e-9);
      expect(slice.number).toBe(preview.slices[i].number);
    });
  });

  it("turns an x back into the station it was drawn from, within a millionth of a millimetre", () => {
    const f = brdPreviewFrames(preview, 760);
    for (const slice of preview.slices) expect(Math.abs(brdStationAtX(f, brdStationX(f, slice.station)) - slice.station)).toBeLessThan(1e-6);
  });
});

describe.each(CASES)("the preview's words on %s", (_label, surface, options) => {
  const { preview } = brdFileWithPreview(surface, "Test Board", options);

  it("writes Imperial dims each with its own mark, and every station and the gap as dims", () => {
    const words = brdPreviewWords(preview, "imperial");
    expect(words.dims).toBe(
      `${formatFeetInches(preview.length)} × ${formatInchesFraction(preview.width)} × ${formatInchesFraction(preview.thickness)}`,
    );
    expect(words.gap).toBe(formatDim(preview.widestGap, "imperial"));
    expect(words.stations).toEqual(preview.slices.map((slice) => formatDim(slice.station, "imperial")));
  });

  it("writes Metric dims in centimetres to one decimal with cm once at the end", () => {
    const words = brdPreviewWords(preview, "metric");
    expect(words.dims).toBe(
      `${formatCentimetres(preview.length)} × ${formatCentimetres(preview.width)} × ${formatCentimetres(preview.thickness)} cm`,
    );
    expect(words.gap).toBe(formatDim(preview.widestGap, "metric"));
    expect(words.stations).toEqual(preview.slices.map((slice) => formatDim(slice.station, "metric")));
  });

  it("has a station for every slice in every system", () => {
    for (const system of UNITS_SYSTEMS) expect(brdPreviewWords(preview, system).stations.length).toBe(preview.slices.length);
  });
});
