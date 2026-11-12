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
import { centimetresToMm, inchesToMm } from "../geometry/units";
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
import { brdFileWithPreview, brdPreview, brdSliceNearest, type BrdPreview } from "./brd-preview";

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
