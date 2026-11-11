import { describe, expect, it } from "vitest";
import { bezierDeviation } from "../geometry/bezier-fit";
import {
  boardFileHalfOutline,
  boardFileOutlineLoop,
  boardHalfSlices,
  boardProfileLines,
  boardSlices,
  boardStringerLines,
  buildBoardSurface,
  type BoardSurface,
  type Vec3,
} from "../geometry/board-surface";
import { DEFAULT_BOTTOM, resolveBottom, startingChannels, startingCut } from "../geometry/bottom";
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
import { mm, mmToCentimetres } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { BRD_MACHINE_FIELDS, brdCurves, brdFile, brdText, formatBrdNumber, readBrdText } from "./brd";
import { BRD_MAGIC, unscrambleBrd } from "./brd-scramble";

/**
 * The .brd writer on three boards: the flat Shortboard, the Fish (a swallow) and the Shortboard with a Deep Single
 * Concave and four channels. Every expected figure is the surface's own, read through its readers; never a typed
 * number (Rule 1). The surfaces and files are built once per describe.
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

function cutSurface(fields: DesignSummaryFields) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: startingCut("center", "Deep Single Concave", board),
    channels: startingChannels(4, board, DEFAULT_BOTTOM.channels),
  };
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return { surface, deepest: resolveBottom(bottom, board).center.deepest };
}

const shortboard = flatSurface(fieldsOf("shortboard|asis|hard"));
const fish = flatSurface(fieldsOf("fish|asis|hard"));
const cut = cutSurface(fieldsOf("shortboard|asis|hard"));

const CASES: [string, BoardSurface][] = [
  ["the flat Shortboard", shortboard],
  ["the Fish (a swallow)", fish],
  ["the Shortboard with a Deep Single and 4 channels", cut.surface],
];

const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;

describe.each(CASES)("the surface readers on %s", (_label, surface) => {
  const slices = boardSlices(surface);
  const halves = boardHalfSlices(surface);

  it("boardHalfSlices has the slices' stations, every point from that slice, bottom to deck at one distance across", () => {
    expect(halves.map((h) => h.station)).toEqual(slices.map((s) => s.station));
    halves.forEach((half, i) => {
      const loopPoints = new Set(slices[i].loops.flat().map(key));
      for (const p of half.points) expect(loopPoints.has(key(p))).toBe(true);
      const first = half.points[0];
      const last = half.points[half.points.length - 1];
      expect(Math.abs(Math.abs(first[1]) - Math.abs(last[1]))).toBeLessThan(1e-9);
      expect(first[2]).toBeLessThan(last[2]);
      const widest = Math.max(...slices[i].loops.flat().map((p) => Math.abs(p[1])));
      expect(Math.max(...half.points.map((p) => Math.abs(p[1])))).toBeCloseTo(widest, 9);
    });
  });

  it("boardStringerLines gives one deck and one bottom point per ring, the deck never under the bottom", () => {
    const { deck, bottom } = boardStringerLines(surface);
    expect(deck.length).toBe(surface.rings.length);
    expect(bottom.length).toBe(surface.rings.length);
    surface.rings.forEach((ring, i) => {
      expect(deck[i][0]).toBeCloseTo(ring.station, 6);
      expect(bottom[i][0]).toBeCloseTo(ring.station, 6);
      expect(deck[i][2]).toBeGreaterThanOrEqual(bottom[i][2]);
    });
  });

  it("boardFileHalfOutline is the loop's right half: loop points, y >= 0, the nose last, the widest as wide as the loop", () => {
    const loop = boardFileOutlineLoop(surface);
    const loopKeys = new Set(loop.map(key));
    const half = boardFileHalfOutline(surface);
    for (const p of half) {
      expect(loopKeys.has(key(p))).toBe(true);
      expect(p[1]).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(half[half.length - 1][0]).toBeCloseTo(surface.length, 6);
    expect(Math.max(...half.map((p) => p[1]))).toBeCloseTo(Math.max(...loop.map((p) => Math.abs(p[1]))), 9);
    // From the tail's furthest point (x = 0) on, x only rises toward the nose.
    const tail = half.findIndex((p) => p[0] === Math.min(...half.map((q) => q[0])));
    for (let i = tail + 1; i < half.length; i++) expect(half[i][0]).toBeGreaterThanOrEqual(half[i - 1][0] - 1e-9);
  });
});

describe("the surface readers where the boards differ", () => {
  it("on the Deep Single board the stringer bottom at the deepest station stands well above the lowest point there", () => {
    const { surface, deepest } = cut;
    const ring = surface.rings.reduce((best, r, i) => (Math.abs(r.station - deepest) < Math.abs(surface.rings[best].station - deepest) ? i : best), 0);
    const stringer = boardStringerLines(surface).bottom[ring];
    const lowest = boardProfileLines(surface).bottom[ring];
    expect(stringer[2] - lowest[2]).toBeGreaterThan(1);
  });

  it("on the Fish the half outline starts on the stringer at the crotch and reaches x = 0 at the swallow's point", () => {
    const half = boardFileHalfOutline(fish);
    expect(half[0][1]).toBeCloseTo(0, 9);
    expect(half[0][0]).toBeGreaterThan(0);
    expect(Math.min(...half.map((p) => p[0]))).toBeCloseTo(0, 9);
  });
});

describe("formatBrdNumber", () => {
  it("prints plain decimals the way Java does", () => {
    expect(formatBrdNumber(208.28)).toBe("208.28");
    expect(formatBrdNumber(15)).toBe("15.0");
    expect(formatBrdNumber(0)).toBe("0.0");
    expect(formatBrdNumber(-0)).toBe("0.0");
    expect(formatBrdNumber(1e-7)).toBe("0.0");
    expect(formatBrdNumber(2.5e-6)).toBe("0.0000025");
    expect(formatBrdNumber(6.604007821671177)).toBe("6.604007821671177");
    expect(formatBrdNumber(-3.5)).toBe("-3.5");
  });

  it("refuses NaN and infinity", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => formatBrdNumber(bad)).toThrow();
    }
  });
});

describe.each(CASES)("the .brd of %s", (_label, surface) => {
  const written = brdText(surface);
  const read = readBrdText(written.text);
  const slices = boardSlices(surface);
  const curves = brdCurves(surface);
  const header = new Map(read.header);
  const num = (name: string) => Number(header.get(name));

  it("is ASCII with \\n line ends, ends `)\\n`, and carries exactly the proven header", () => {
    expect(/^[\x20-\x7e\n]*$/.test(written.text)).toBe(true);
    expect(written.text.includes("\r")).toBe(false);
    expect(written.text.endsWith(")\n")).toBe(true);
    expect(read.header.map(([k]) => k)).toEqual(["p01", "p02", "p03", "p04", ...BRD_MACHINE_FIELDS.map(([k]) => k)]);
    for (const [k, v] of BRD_MACHINE_FIELDS) expect(header.get(k)).toBe(v);
    for (const left of ["p08", "p10", "p45", "p48", "p49", "p51", "p54", "p58"]) expect(header.has(left)).toBe(false);
    expect(written.text.split("\n").filter((l) => /^p3[2-5] : \($/.test(l))).toEqual(["p32 : (", "p33 : (", "p34 : (", "p35 : ("]);
  });

  it("reads back the board's length, width and thickness, with the bottom's own length over it", () => {
    expect(num("p01")).toBeCloseTo(mmToCentimetres(surface.length), 9);
    expect(num("p04")).toBeCloseTo(mmToCentimetres(surface.width), 9);
    const { deck, bottom } = boardStringerLines(surface);
    const thickest = Math.max(...deck.map((p, i) => p[2] - bottom[i][2]));
    expect(num("p03")).toBeCloseTo(mmToCentimetres(mm(thickest)), 9);
    expect(num("p02")).toBeGreaterThan(num("p01"));
  });

  it("has a section at every litres station with foam, an empty one closing each pointed tip, all numbers finite", () => {
    // A squared tail or nose has its own real section at the tip, so no empty one is added beside it.
    const tailEmpty = slices[0].station > 1e-6 ? 1 : 0;
    const noseEmpty = slices[slices.length - 1].station < surface.length - 1e-6 ? 1 : 0;
    expect(read.sections.length).toBe(slices.length + tailEmpty + noseEmpty);
    expect(read.sections[0].station).toBe(0);
    expect(read.sections[read.sections.length - 1].station).toBeCloseTo(mmToCentimetres(surface.length), 9);
    read.sections.forEach((s, i) => {
      if (i > 0) expect(s.station).toBeGreaterThan(read.sections[i - 1].station);
    });
    const ends: [boolean, (typeof read.sections)[number]][] = [
      [tailEmpty === 1, read.sections[0]],
      [noseEmpty === 1, read.sections[read.sections.length - 1]],
    ];
    for (const [empty, end] of ends) {
      expect(end.knots.length > 1).toBe(!empty);
      if (!empty) continue;
      expect([...end.knots[0].point, ...end.knots[0].before, ...end.knots[0].after]).toEqual([0, 0, 0, 0, 0, 0]);
      expect(end.knots[0].smooth).toBe(false);
    }
    const all = [read.outline, read.bottom, read.deck, ...read.sections.map((s) => s.knots)].flat();
    for (const knot of all) for (const v of [...knot.point, ...knot.before, ...knot.after]) expect(Number.isFinite(v)).toBe(true);
  });

  it("puts the outline's widest knot exactly at the widest point of the outline, within 0.05 mm of half the width", () => {
    const widest = Math.max(...boardFileHalfOutline(surface).map((p) => p[1]));
    const knotWidest = Math.max(...read.outline.map((k) => k.point[1]));
    expect(knotWidest).toBeCloseTo(mmToCentimetres(mm(widest)), 9);
    expect(Math.abs(knotWidest - num("p04") / 2)).toBeLessThan(0.005);
  });

  it("fits every curve within 0.5 mm of the board, both ways, with fewer than 40 knots", () => {
    const all = [curves.outline, curves.bottom, curves.deck, ...curves.sections];
    for (const curve of all) {
      expect(curve.knots.length).toBeLessThan(40);
      expect(bezierDeviation(curve.points, curve.knots)).toBeLessThanOrEqual(0.5);
    }
  });

  it("writes the same bytes twice, named from the board", () => {
    const a = brdFile(surface, `Fish 5'10"`);
    const b = brdFile(surface, `Fish 5'10"`);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
    expect(a.name).toBe("Fish 5'10.brd");
    expect(brdFile(surface, "").name).toBe("Untitled Board.brd");
    expect(a.sectionCount).toBe(slices.length);
    expect(String.fromCharCode(...a.data.subarray(0, 12))).toBe(BRD_MAGIC);
    expect(unscrambleBrd(a.data)).toBe(written.text);
  });
});

describe("what the cut and the swallow add to the file", () => {
  it("the cut board's sections go below the stringer's bottom and carry sharp knots at the channel walls", () => {
    const read = readBrdText(brdText(cut.surface).text);
    expect(read.sections.some((s) => s.knots.some((k) => k.point[1] < -1e-6))).toBe(true);
    const sharpest = Math.max(...read.sections.map((s) => s.knots.filter((k) => !k.smooth).length));
    // Two walls a side, two corners a wall, none of them rounded off (the flat board has the rail's edge at most).
    const flat = readBrdText(brdText(shortboard).text);
    const flatSharpest = Math.max(...flat.sections.map((s) => s.knots.filter((k) => !k.smooth).length));
    expect(sharpest).toBeGreaterThanOrEqual(flatSharpest + 4);
  });

  it("the Fish's notch sections start off the stringer, and its outline starts on the stringer past the tail", () => {
    const read = readBrdText(brdText(fish).text);
    const inside = read.sections.filter((s) => s.knots.length > 1 && s.knots[0].point[0] > 1e-6);
    expect(inside.length).toBeGreaterThan(0);
    expect(read.outline[0].point[1]).toBeCloseTo(0, 9);
    expect(read.outline[0].point[0]).toBeGreaterThan(0);
    // The sharp knots of the notch: the swallow's point is a corner.
    expect(read.outline.some((k) => !k.smooth)).toBe(true);
  });

  it("a stringer section's ends are level, with the mirrored handle across the stringer", () => {
    const read = readBrdText(brdText(shortboard).text);
    const section = read.sections[Math.floor(read.sections.length / 2)];
    const first = section.knots[0];
    const last = section.knots[section.knots.length - 1];
    expect(first.point[0]).toBeCloseTo(0, 9);
    expect(first.after[1]).toBeCloseTo(first.point[1], 9);
    expect(first.before[0]).toBeCloseTo(-first.after[0], 9);
    expect(last.before[1]).toBeCloseTo(last.point[1], 9);
    expect(last.after[0]).toBeCloseTo(-last.before[0], 9);
  });
});

describe("readBrdText", () => {
  it("refuses a line it does not expect", () => {
    const { text } = brdText(shortboard);
    expect(() => readBrdText(text.replace("p32 : (", "p32 : ( "))).toThrow();
    expect(() => readBrdText(text.replace(" false)\n", " maybe)\n"))).toThrow();
    expect(() => readBrdText(text.slice(0, -2))).toThrow();
  });
});
