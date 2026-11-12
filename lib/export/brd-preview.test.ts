import { describe, expect, it } from "vitest";
import {
  buildBoardSurface,
  type BoardSurface,
} from "../geometry/board-surface";
import {
  DEFAULT_BOTTOM,
  BOTTOM_DATA_DEPTH_SHOWN,
  pickCut,
  resolveBottom,
  startingChannels,
  startingCut,
  type BoardBottom,
  type BottomBoard,
} from "../geometry/bottom";
import { sideProfileAt, sideProfileLines } from "../geometry/side-profile";
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
  mm,
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
  BRD_PREVIEW_SIDE_HEIGHT,
  BRD_PREVIEW_PAD_Y,
  brdFileWithPreview,
  brdPreview,
  brdPreviewProfile,
  brdPreviewFrames,
  brdPreviewWords,
  brdSliceNearest,
  brdStationAtX,
  brdStationX,
  type BrdPreview,
  type BrdSideProfileInput,
} from "./brd-preview";
import type { SectionHeight } from "../geometry/bottom-draw";

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

/** What the board maths needs beside a file (the bottom the file was written from, the board, the planed side profile). */
function sidesOf(fields: DesignSummaryFields, bottom: BoardBottom = DEFAULT_BOTTOM): BrdSideProfileInput {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  return { resolved: resolveBottom(brdFileBottom(bottom, board), board), board, profile };
}

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

/** A Shortboard with one cut picked (and channels if asked), made the way the 3D page makes its file. */
function cutBoard(fields: DesignSummaryFields, pick: (board: BottomBoard) => BoardBottom): { surface: BoardSurface; options: BrdOptions; sides: BrdSideProfileInput } {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = pick(board);
  const fileBottom = brdFileBottom(bottom, board);
  const resolved = resolveBottom(fileBottom, board);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom: fileBottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return { surface, options: { bottomStations: brdBottomStations(resolved) }, sides: { resolved, board, profile } };
}

function deepSingle(fields: DesignSummaryFields): { surface: BoardSurface; options: BrdOptions; sides: BrdSideProfileInput } {
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
  return { surface, options: { bottomStations: brdBottomStations(resolveBottom(fileBottom, board)) }, sides: { resolved: resolveBottom(fileBottom, board), board, profile } };
}

const deep = deepSingle(fieldsOf("shortboard|asis|hard"));
const vee = cutBoard(fieldsOf("shortboard|asis|hard"), (board) => pickCut(DEFAULT_BOTTOM, "tail", "Rolled Vee", board));

const CASES: [string, BoardSurface, BrdOptions, BrdSideProfileInput][] = [
  ["the flat Shortboard", flatSurface(fieldsOf("shortboard|asis|hard")), {}, sidesOf(fieldsOf("shortboard|asis|hard"))],
  ["the Fish", flatSurface(fieldsOf("fish|asis|hard")), {}, sidesOf(fieldsOf("fish|asis|hard"))],
  ["the Deep Single Shortboard", deep.surface, deep.options, deep.sides],
];

/** The slice nearest half the length: where a Deep Single is deepest. */
function middleSlice(preview: BrdPreview) {
  return preview.slices[brdSliceNearest(preview, preview.length / 2)];
}

describe.each(CASES)("the board file preview on %s", (_label, surface, options, sides) => {
  const made = brdFileWithPreview(surface, "Test Board", options, sides);
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
    const preview = brdFileWithPreview(deep.surface, "Deep", deep.options, deep.sides).preview;
    const lowest = Math.min(...middleSlice(preview).section.map(([, up]) => up));
    expect(lowest).toBeLessThan(-1);
  });

  it("stays flat on the flat Shortboard, none lower than half a millimetre below", () => {
    const preview = brdFileWithPreview(CASES[0][1], "Flat", {}, CASES[0][3]).preview;
    const lowest = Math.min(...middleSlice(preview).section.map(([, up]) => up));
    expect(lowest).toBeGreaterThan(-0.5);
  });
});

describe("brdSliceNearest", () => {
  const { preview } = brdFileWithPreview(CASES[0][1], "Flat", {}, CASES[0][3]);
  it("finds each slice from its own station and one past either end", () => {
    preview.slices.forEach((s, i) => expect(brdSliceNearest(preview, s.station)).toBe(i));
    expect(brdSliceNearest(preview, -1e6)).toBe(0);
    expect(brdSliceNearest(preview, 1e6)).toBe(preview.slices.length - 1);
  });
});

/** Widths a phone and a computer give the drawings (dots). */
const WIDTHS = [330, 760, 1000];

describe.each(CASES)("the preview's drawings on %s", (_label, surface, options, sides) => {
  const { preview, profile } = brdFileWithPreview(surface, "Test Board", options, sides);

  it.each(WIDTHS)("keeps every point inside its box at %i dots wide", (width) => {
    const f = brdPreviewFrames(preview, width, { railBottom: profile.railBottom });
    const inside = (points: readonly (readonly [number, number])[], height: number) =>
      points.every(([x, y]) => x >= -1e-9 && x <= width + 1e-9 && y >= -1e-9 && y <= height + 1e-9);
    expect(inside(f.top.outline, f.top.height)).toBe(true);
    expect(inside(f.side.outline, f.side.height)).toBe(true);
    expect(inside(f.side.rail ?? [], f.side.height)).toBe(true);
    expect(inside(f.side.slices.flatMap((line) => [[line.x, line.y1], [line.x, line.y2]] as [number, number][]), f.side.height)).toBe(true);
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

describe.each(CASES)("the preview's words on %s", (_label, surface, options, sides) => {
  const { preview, profile } = brdFileWithPreview(surface, "Test Board", options, sides);

  it("writes Imperial dims each with its own mark, both thicknesses, and every station and the gap as dims", () => {
    const words = brdPreviewWords(preview, "imperial", profile.maxThickness);
    expect(words.dims).toBe(`${formatFeetInches(preview.length)} × ${formatInchesFraction(preview.width)}`);
    expect(words.stringer).toBe(formatDim(preview.thickness, "imperial"));
    expect(words.profileMax).toBe(formatDim(profile.maxThickness, "imperial"));
    expect(words.gap).toBe(formatDim(preview.widestGap, "imperial"));
    expect(words.stations).toEqual(preview.slices.map((slice) => formatDim(slice.station, "imperial")));
  });

  it("writes Metric dims in centimetres to one decimal with cm once at the end, the thicknesses as dims", () => {
    const words = brdPreviewWords(preview, "metric", profile.maxThickness);
    expect(words.dims).toBe(`${formatCentimetres(preview.length)} × ${formatCentimetres(preview.width)} cm`);
    expect(words.stringer).toBe(formatDim(preview.thickness, "metric"));
    expect(words.profileMax).toBe(formatDim(profile.maxThickness, "metric"));
    expect(words.gap).toBe(formatDim(preview.widestGap, "metric"));
    expect(words.stations).toEqual(preview.slices.map((slice) => formatDim(slice.station, "metric")));
  });

  it("has a station for every slice in every system", () => {
    for (const system of UNITS_SYSTEMS) expect(brdPreviewWords(preview, system, profile.maxThickness).stations.length).toBe(preview.slices.length);
  });
});

describe("the two thickness words", () => {
  it("differ on the Deep Single, 2 1/8 inches at the stringer and 2 1/4 side profile max", () => {
    const { preview, profile } = brdFileWithPreview(deep.surface, "Deep", deep.options, deep.sides);
    const words = brdPreviewWords(preview, "imperial", profile.maxThickness);
    expect(words.stringer).not.toBe(words.profileMax);
    expect(words.stringer).toBe(`2 1/8"`);
    expect(words.profileMax).toBe(`2 1/4"`);
  });

  it("are equal on the flat Shortboard", () => {
    const [, surface, options, sides] = CASES[0];
    const { preview, profile } = brdFileWithPreview(surface, "Flat", options, sides);
    const words = brdPreviewWords(preview, "imperial", profile.maxThickness);
    expect(words.stringer).toBe(words.profileMax);
  });
});

describe.each(CASES)("the side view's Height on %s", (_label, surface, options, sides) => {
  const { preview, profile } = brdFileWithPreview(surface, "Test Board", options, sides);
  const extras = (height: SectionHeight) => ({ railBottom: profile.railBottom, height });
  const HEIGHTS: SectionHeight[] = [1, 2, 4, 8];

  it("opens at ×4", () => {
    expect(BRD_PREVIEW_SIDE_HEIGHT).toBe(4);
  });

  it.each(HEIGHTS)("stretches only the side view's height, ×%i, and keeps the top view's frame", (height) => {
    const one = brdPreviewFrames(preview, 760, extras(1));
    const f = brdPreviewFrames(preview, 760, extras(height));
    expect(f.side.heightFactor).toBe(height);
    expect(f.side.height - 2 * BRD_PREVIEW_PAD_Y).toBeCloseTo(height * (one.side.height - 2 * BRD_PREVIEW_PAD_Y), 9);
    expect(f.top).toEqual(one.top);
    f.side.slices.forEach((line, i) => expect(line.x).toBe(f.top.slices[i].x));
  });

  it.each(WIDTHS.flatMap((width) => HEIGHTS.map((height): [number, SectionHeight] => [width, height])))(
    "keeps every side, slice-line and rail point inside its box at %i dots wide, ×%i",
    (width, height) => {
      const f = brdPreviewFrames(preview, width, extras(height));
      const inside = (points: readonly (readonly [number, number])[]) =>
        points.every(([x, y]) => x >= -1e-9 && x <= width + 1e-9 && y >= -1e-9 && y <= f.side.height + 1e-9);
      expect(inside(f.side.outline)).toBe(true);
      expect(inside(f.side.rail ?? [])).toBe(true);
      expect(inside(f.side.slices.flatMap((line) => [[line.x, line.y1], [line.x, line.y2]] as [number, number][]))).toBe(true);
    },
  );
});

describe("the preview's rail line (quick 261112-lmr)", () => {
  const flat = CASES[0];
  const fish = CASES[1];

  it.each([flat, fish])("is not drawn on %s, and the maximum is the file's own thickness", (_label, surface, options, sides) => {
    const made = brdFileWithPreview(surface, "Flat", options, sides);
    expect(made.profile.railBottom).toBeNull();
    expect(Math.abs(made.profile.maxThickness - made.preview.thickness)).toBeLessThan(0.1);
  });

  describe("on the Deep Single", () => {
    const made = brdFileWithPreview(deep.surface, "Deep", deep.options, deep.sides);
    const { preview, profile } = made;
    const { resolved, board, profile: planed } = deep.sides;

    it("runs along the file's own bottom, moved by the rail's foam off less the stringer's", () => {
      expect(profile.railBottom).not.toBeNull();
      const rail = profile.railBottom ?? [];
      expect(rail.map(([x]) => x)).toEqual(preview.bottom.map(([x]) => x));
      rail.forEach(([x, h], i) => {
        const at = sideProfileAt(resolved, board, planed, mm(x));
        expect(Math.abs(h - (preview.bottom[i][1] + at.railFoamOff - at.stringerFoamOff))).toBeLessThan(1e-9);
      });
    });

    it("lies more than a millimetre under the stringer's bottom at the middle slice", () => {
      const middle = middleSlice(preview);
      const rail = profile.railBottom ?? [];
      const at = rail.reduce((best, p) => (Math.abs(p[0] - middle.station) < Math.abs(best[0] - middle.station) ? p : best));
      expect(middle.bottom - at[1]).toBeGreaterThan(1);
    });

    it("quotes a maximum from the board maths, thicker than the file's own by more than a millimetre", () => {
      expect(profile.maxThickness).toBe(sideProfileLines(resolved, board, planed).maxThickness);
      expect(profile.maxThickness - preview.thickness).toBeGreaterThan(1);
    });

    it("agrees with every slice's own thickness, deck less stringer bottom, within 0.05 mm", () => {
      for (const slice of preview.slices) {
        const at = sideProfileAt(resolved, board, planed, slice.station);
        expect(Math.abs(slice.thickness - (at.deck - at.stringerBottom))).toBeLessThan(0.05);
      }
    });
  });

  it("is drawn above the stringer's bottom on a Rolled Vee, at the tail cut's deepest station", () => {
    const made = brdFileWithPreview(vee.surface, "Vee", vee.options, vee.sides);
    const rail = made.profile.railBottom ?? [];
    expect(rail.length).toBeGreaterThan(0);
    const at = vee.sides.resolved.tail.deepest;
    const nearest = rail.reduce((best, p, i) => (Math.abs(p[0] - at) < Math.abs(rail[best][0] - at) ? i : best), 0);
    expect(rail[nearest][1] - made.preview.bottom[nearest][1]).toBeGreaterThan(BOTTOM_DATA_DEPTH_SHOWN);
  });

  it("is the same list brdPreviewProfile gives for the read file", () => {
    const made = brdFileWithPreview(deep.surface, "Deep", deep.options, deep.sides);
    expect(brdPreviewProfile(made.preview, deep.sides)).toEqual(made.profile);
  });

  it("changes nothing in the drawings when there is no rail line", () => {
    const { preview } = brdFileWithPreview(flat[1], "Flat", flat[2], flat[3]);
    const plain = brdPreviewFrames(preview, 760);
    expect(brdPreviewFrames(preview, 760, { railBottom: null })).toEqual(plain);
    expect(plain.side.rail).toBeNull();
  });
});
