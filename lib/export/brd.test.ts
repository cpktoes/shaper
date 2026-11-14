import { describe, expect, it } from "vitest";
import { bezierDeviation, bezierPoint, type P2 } from "../geometry/bezier-fit";
import {
  boardFileOutlineLoop,
  boardRailHalfOutline,
  boardSectionHalves,
  boardProfileLines,
  boardStringerLines,
  buildBoardSurface,
  SURFACE_POINTS,
  type BoardSurface,
} from "../geometry/board-surface";
import {
  DEFAULT_BOTTOM,
  resolveBottom,
  startingChannels,
  startingCut,
  switchChannelCount,
  type BoardBottom,
  type BottomBoard,
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
import { brdFinFields } from "../geometry/brd-fins";
import { DEFAULT_FIN_PLACEMENT_SPEC, FIN_SYSTEMS, resetAdvanced, type FinSetup } from "../geometry/fins";
import { buildOutline } from "../geometry/outline";
import { inchesToMm, mm, mmToCentimetres } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import {
  BRD_BLEND_TARGET_MM,
  BRD_KNOT_GAP_MM,
  BRD_MACHINE_FIELDS,
  BRD_SECTION_SPACING_IN,
  BRD_SECTION_TARGET_MM,
  BRD_SECTIONS_MAX,
  BRD_WALL_LEAN_MM,
  BRD_WALL_LEAN_PER_HEIGHT,
  BRD_WALL_LEAN_ROOM,
  BRD_WALL_SECTION_SPACING_IN,
  brdBottomStations,
  brdFinHeaderFields,
  brdBlendStray,
  brdCurves,
  brdFile,
  brdFileBottom,
  brdLeavesChannelsOut,
  brdOutlineCurve,
  brdTailWrittenSquare,
  brdText,
  formatBrdNumber,
  readBrdText,
  type BrdCurves,
  type BrdOptions,
} from "./brd";
import { BRD_MAGIC, unscrambleBrd } from "./brd-scramble";

/**
 * The .brd writer on three boards: the flat Shortboard, the Fish (a swallow) and the Shortboard with a Deep Single
 * Concave and four channels. Every expected figure is the surface's own, read through its readers; never a typed
 * number (Rule 1). The surfaces and curves are built once, at module scope or per describe.
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
  const resolved = resolveBottom(bottom, board);
  return { surface, deepest: resolved.center.deepest, resolved, bottom, board, geometry, profile, rails, fields };
}

/** A surface and its file's text the way the 3D page's Export .brd File makes them: from `bottom` as it is handed. */
function surfaceAndText(cutOf: ReturnType<typeof cutSurface>, bottom: BoardBottom) {
  const { board, geometry, profile, rails, fields } = cutOf;
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const options: BrdOptions = { bottomStations: brdBottomStations(resolveBottom(bottom, board)) };
  return { surface, options, text: brdText(surface, options).text, curves: brdCurves(surface, options) };
}

const shortboard = flatSurface(fieldsOf("shortboard|asis|hard"));
const fish = flatSurface(fieldsOf("fish|asis|hard"));
const cut = cutSurface(fieldsOf("shortboard|asis|hard"));
const cutOptions: BrdOptions = { bottomStations: brdBottomStations(cut.resolved) };

const CASES: [string, BoardSurface, BrdOptions][] = [
  ["the flat Shortboard", shortboard, {}],
  ["the Fish (a swallow)", fish, {}],
  ["the Shortboard with a Deep Single and 4 channels", cut.surface, cutOptions],
];

describe.each(CASES)("the surface readers on %s", (_label, surface) => {
  const { halves, walls, bottomEdge, widest } = boardSectionHalves(surface);

  it("boardSectionHalves gives one half per full ring, tail to nose, every slot kept, bottom at the stringer first", () => {
    const full = surface.rings.filter(
      (ring) => ring.pieces.length === 1 && Math.max(...ring.right.map((v) => Math.abs(surface.positions[3 * v + 1]))) > 1e-9,
    );
    expect(halves.map((h) => h.station)).toEqual(full.map((ring) => ring.station));
    halves.forEach((half, i) => {
      const ring = full[i];
      expect(half.points.length).toBe(ring.right.length);
      expect(Math.abs(half.points[0][1])).toBeLessThan(1e-9);
      expect(Math.abs(half.points[half.points.length - 1][1])).toBeLessThan(1e-9);
      expect(half.points[0][2]).toBeLessThan(half.points[half.points.length - 1][2]);
      // Slot k is the ring's own vertex, counted from the bottom.
      const vertex = ring.right[ring.right.length - 1 - bottomEdge];
      expect(half.points[bottomEdge]).toEqual([surface.positions[3 * vertex], surface.positions[3 * vertex + 1], surface.positions[3 * vertex + 2]]);
      const furthest = Math.max(...half.points.map((p) => Math.abs(p[1])));
      expect(Math.abs(half.points[widest][1])).toBeCloseTo(furthest, 9);
    });
    for (let i = 1; i < halves.length; i++) expect(halves[i].station).toBeGreaterThan(halves[i - 1].station);
  });

  it("boardSectionHalves puts the bottom edge on the surface's own row, 78 counted from the deck", () => {
    const n = halves[0].points.length;
    expect(bottomEdge).toBe(n - 1 - (SURFACE_POINTS.deck + SURFACE_POINTS.rail - 2));
    expect(widest).toBe(n - SURFACE_POINTS.deck);
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

  it("the walls are empty without channels and two with four, innermost first, the foot just under the top", () => {
    expect(surface.channelWallRows.length).toBe(walls.length);
    if (surface !== cut.surface) {
      expect(walls).toEqual([]);
      return;
    }
    expect(walls.length).toBe(2);
    for (const wall of walls) expect(wall.foot).toBe(wall.top - 1);
    expect(walls[0].top).toBeLessThan(walls[1].foot);
    // Counted from the deck, the innermost wall sits lowest in the ring, so its slot counted from the bottom is smallest.
    expect(surface.channelWallRows[0]).toBeGreaterThan(surface.channelWallRows[1]);
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

  it("on the Deep Single board a wall stands on some rings (foot and top at one distance across) and is welded on others", () => {
    const { halves, walls } = boardSectionHalves(cut.surface);
    const standing = halves.filter((h) => {
      const foot = h.points[walls[0].foot];
      const top = h.points[walls[0].top];
      return Math.abs(Math.abs(foot[1]) - Math.abs(top[1])) < 1e-9 && Math.abs(top[2] - foot[2]) > 1e-6;
    });
    const welded = halves.filter((h) => h.points[walls[0].foot][1] === h.points[walls[0].top][1] && h.points[walls[0].foot][2] === h.points[walls[0].top][2]);
    expect(standing.length).toBeGreaterThan(0);
    expect(welded.length).toBeGreaterThan(0);
  });

  it("on the Fish the rail outline starts at x = 0, as wide as the swallow's points", () => {
    const half = boardRailHalfOutline(fish);
    const ring = fish.rings[0];
    const widest = Math.max(...ring.right.map((v) => Math.abs(fish.positions[3 * v + 1])));
    expect(half[0][0]).toBeCloseTo(0, 9);
    expect(half[0][1]).toBeCloseTo(widest, 9);
    expect(half[0][1]).toBeGreaterThan(0);
  });
});

describe.each(CASES)("boardRailHalfOutline on %s", (_label, surface) => {
  const half = boardRailHalfOutline(surface);

  it("has one point per ring, tail to nose, each the ring's widest vertex, x only rising, the last at the length", () => {
    expect(half.length).toBe(surface.rings.length);
    half.forEach((p, i) => {
      const ring = surface.rings[i];
      const across = Math.max(...ring.pieces.flatMap((piece) => Array.from({ length: piece.count }, (_, k) => Math.abs(surface.positions[3 * (piece.first + k) + 1]))));
      expect(Math.abs(p[1])).toBeCloseTo(across, 9);
      if (i > 0) expect(p[0]).toBeGreaterThanOrEqual(half[i - 1][0]);
    });
    expect(half[half.length - 1][0]).toBeCloseTo(surface.length, 6);
  });

  it("is as wide as the file outline loop's widest", () => {
    const loop = boardFileOutlineLoop(surface);
    expect(Math.max(...half.map((p) => Math.abs(p[1])))).toBeCloseTo(Math.max(...loop.map((p) => Math.abs(p[1]))), 9);
  });
});

describe("brdBottomStations", () => {
  it("is every start, deepest and end of the cuts with depth and of the channels, sorted, no repeats", () => {
    const { resolved } = cut;
    const stations = brdBottomStations(resolved);
    const expected = new Set<number>();
    for (const c of [resolved.nose, resolved.center, resolved.tail]) {
      if (c.kind !== "flat" && c.depth > 0) [c.start, c.deepest, c.end].forEach((v) => expected.add(v));
    }
    [resolved.channels.start, resolved.channels.deepest, resolved.channels.end].forEach((v) => expected.add(v));
    expect(stations).toEqual([...expected].sort((a, b) => a - b));
    expect(stations.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < stations.length; i++) expect(stations[i]).toBeGreaterThan(stations[i - 1]);
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

/** A point's distance to a polyline. */
function distanceToPolyline(p: P2, line: readonly P2[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const squared = dx * dx + dy * dy;
    const t = squared > 0 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / squared)) : 0;
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

describe.each(CASES)("the .brd of %s", (_label, surface, options) => {
  const written = brdText(surface, options);
  const read = readBrdText(written.text);
  const curves = brdCurves(surface, options);
  const { halves } = boardSectionHalves(surface);
  const header = new Map(read.header);
  const num = (name: string) => Number(header.get(name));
  const length = surface.length;

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
    expect(num("p01")).toBeCloseTo(mmToCentimetres(length), 9);
    expect(num("p04")).toBeCloseTo(mmToCentimetres(surface.width), 9);
    const { deck, bottom } = boardStringerLines(surface);
    const thickest = Math.max(...deck.map((p, i) => p[2] - bottom[i][2]));
    expect(num("p03")).toBeCloseTo(mmToCentimetres(mm(thickest)), 9);
    expect(num("p02")).toBeGreaterThan(num("p01"));
  });

  it("closes each tip with a one-knot all-zero section, the curves' sections between, all numbers finite", () => {
    expect(read.sections.length).toBe(curves.sections.length + 2);
    expect(read.sections[0].station).toBe(0);
    expect(read.sections[read.sections.length - 1].station).toBeCloseTo(mmToCentimetres(length), 9);
    for (const end of [read.sections[0], read.sections[read.sections.length - 1]]) {
      expect(end.knots.length).toBe(1);
      expect([...end.knots[0].point, ...end.knots[0].before, ...end.knots[0].after]).toEqual([0, 0, 0, 0, 0, 0]);
      expect(end.knots[0].smooth).toBe(false);
    }
    read.sections.forEach((s, i) => {
      if (i > 0) expect(s.station).toBeGreaterThan(read.sections[i - 1].station);
    });
    curves.sections.forEach((section, i) => {
      const written = read.sections[i + 1];
      expect(written.station).toBeCloseTo(mmToCentimetres(section.station), 9);
      expect(written.knots.length).toBe(curves.sectionKnotRoles.length);
    });
    const all = [read.outline, read.bottom, read.deck, ...read.sections.map((s) => s.knots)].flat();
    for (const knot of all) for (const v of [...knot.point, ...knot.before, ...knot.after]) expect(Number.isFinite(v)).toBe(true);
  });

  it("puts the outline's widest knot exactly at the widest point of the outline, within 0.05 mm of half the width", () => {
    const widest = Math.max(...boardRailHalfOutline(surface).map((p) => p[1]));
    const knotWidest = Math.max(...read.outline.map((k) => k.point[1]));
    expect(knotWidest).toBeCloseTo(mmToCentimetres(mm(widest)), 9);
    expect(Math.abs(knotWidest - num("p04") / 2)).toBeLessThan(0.005);
  });

  it("fits the outline, rocker and deck within 0.5 mm with fewer than 40 knots, and every section within 1 mm", () => {
    for (const curve of [curves.outline, curves.bottom, curves.deck]) {
      expect(curve.knots.length).toBeLessThan(40);
      expect(bezierDeviation(curve.points, curve.knots)).toBeLessThanOrEqual(0.5);
    }
    for (const section of curves.sections) {
      expect(bezierDeviation(section.points, section.knots)).toBeLessThanOrEqual(BRD_SECTION_TARGET_MM);
    }
  });

  it("gives every section the same knots in the same order: the stringer's bottom first, its deck last, no two neighbours on one point", () => {
    const roles = curves.sectionKnotRoles;
    expect(roles[0]).toBe("bottomStringer");
    expect(roles[roles.length - 1]).toBe("deckStringer");
    expect(roles.slice(-4)).toEqual(["bottomEdge", "widest", "shoulder", "deckStringer"]);
    const walls = roles.filter((r) => r === "wallFoot" || r === "wallTop");
    expect(walls).toEqual(surface === cut.surface ? ["wallFoot", "wallTop", "wallFoot", "wallTop"] : []);
    if (surface !== cut.surface) expect(roles.length).toBe(5);
    for (const section of curves.sections) {
      expect(section.knots.length).toBe(roles.length);
      expect(section.knots[0].point[0]).toBeCloseTo(0, 9);
      expect(section.knots[0].point[1]).toBeCloseTo(0, 9);
      expect(section.knots[section.knots.length - 1].point[0]).toBeCloseTo(0, 9);
      for (let i = 1; i < section.knots.length; i++) {
        const a = section.knots[i - 1].point;
        const b = section.knots[i].point;
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1e-6);
      }
    }
  });

  it("stands its sections strictly inside the board at the tips' 1\", the 12\" marks, the wide point and no more than 8\" apart", () => {
    const stations = curves.sections.map((s) => s.station);
    stations.forEach((s, i) => {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(length);
      if (i > 0) expect(s).toBeGreaterThan(stations[i - 1]);
    });
    const nearestHalf = (target: number) =>
      halves.reduce((best, h) => (Math.abs(h.station - target) < Math.abs(best.station - target) ? h : best), halves[0]).station;
    expect(stations).toContain(nearestHalf(inchesToMm(1)));
    expect(stations).toContain(nearestHalf(inchesToMm(12)));
    expect(stations).toContain(nearestHalf(length - inchesToMm(12)));
    expect(stations).toContain(nearestHalf(length - inchesToMm(1)));
    const wide = halves.reduce((best, h) => (Math.max(...h.points.map((p) => Math.abs(p[1]))) > Math.max(...best.points.map((p) => Math.abs(p[1]))) + 1e-9 ? h : best), halves[0]);
    expect(stations).toContain(wide.station);
    for (let i = 1; i < stations.length; i++) expect(stations[i] - stations[i - 1]).toBeLessThanOrEqual(inchesToMm(BRD_SECTION_SPACING_IN + 0.5));
    // Enough sections that the contours stay true between them, never more than the cap; a board with channels stands
    // them 1 1/2" apart where a wall stands.
    const walls = boardSectionHalves(surface).walls;
    const walled = halves.filter((h) => walls.some((w) => Math.hypot(h.points[w.foot][1] - h.points[w.top][1], h.points[w.foot][2] - h.points[w.top][2]) >= BRD_KNOT_GAP_MM));
    expect(stations.length).toBeGreaterThanOrEqual(16);
    expect(stations.length).toBeLessThanOrEqual(BRD_SECTIONS_MAX);
    // Never two within an inch (give or take a ring), and between two neighbours a blend of the two stays on the board.
    for (let i = 1; i < stations.length; i++) expect(stations[i] - stations[i - 1]).toBeGreaterThanOrEqual(inchesToMm(0.9));
    if (walled.length === 0) expect(brdBlendStray(surface, curves)).toBeLessThanOrEqual(BRD_BLEND_TARGET_MM + 0.25);
    if (walled.length > 0) {
      const first = Math.max(walled[0].station, nearestHalf(inchesToMm(1)));
      const last = walled[walled.length - 1].station;
      const inRun = stations.filter((s) => s >= first && s <= last);
      // 1 1/2" apart, give or take a ring and the inch kept clear of a station already standing.
      for (let i = 1; i < inRun.length; i++) expect(inRun[i] - inRun[i - 1]).toBeLessThanOrEqual(inchesToMm(BRD_WALL_SECTION_SPACING_IN + 1.5));
      expect(inRun.length).toBeGreaterThan(8);
    }
  });

  it("keeps each anchor knot's share of the width and of the thickness within a fifth from one section to the next", () => {
    const roles = curves.sectionKnotRoles;
    const shares = curves.sections.map((section) => {
      const across = Math.max(...section.points.map((p) => p[0]));
      const height = section.points[section.points.length - 1][1];
      return section.knots.map((k) => [k.point[0] / across, k.point[1] / height]);
    });
    roles.forEach((role, i) => {
      if (role === "wallFoot" || role === "wallTop" || role === "added") return;
      // On the cut board the concave itself carries the bottom edge up and down against the stringer, 0.29 of the
      // thickness between 4" and 12" — real shape, not a jump — so only the flat bottoms are held to a fifth there.
      if (surface === cut.surface && role === "bottomEdge") return;
      for (let s = 1; s < shares.length; s++) {
        expect(Math.abs(shares[s][i][0] - shares[s - 1][i][0])).toBeLessThanOrEqual(0.2);
        expect(Math.abs(shares[s][i][1] - shares[s - 1][i][1])).toBeLessThanOrEqual(0.2);
      }
    });
  });

  it("writes the same bytes twice, named from the board", () => {
    const a = brdFile(surface, `Fish 5'10"`, options);
    const b = brdFile(surface, `Fish 5'10"`, options);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
    expect(a.name).toBe("Fish 5'10.brd");
    expect(brdFile(surface, "", options).name).toBe("Untitled Board.brd");
    expect(a.sectionCount).toBe(curves.sections.length);
    expect(a.sectionCount).toBe(written.sectionCount);
    expect(String.fromCharCode(...a.data.subarray(0, 12))).toBe(BRD_MAGIC);
    expect(unscrambleBrd(a.data)).toBe(written.text);
  });
});

/** The five-knot sections of a board with no channels, and what makes one smooth or sharp. */
describe("the flat Shortboard's sections (the known-good file stays at least as smooth)", () => {
  const curves = brdCurves(shortboard);

  it("has five knots a section, at most one corner a section and only ever at the bottom edge", () => {
    expect(curves.sectionKnotRoles.length).toBe(5);
    for (const section of curves.sections) {
      expect(section.knots.length).toBe(5);
      const sharp = section.knots.map((k, i) => (k.smooth ? -1 : i)).filter((i) => i >= 0);
      expect(sharp.length).toBeLessThanOrEqual(1);
      for (const i of sharp) expect(curves.sectionKnotRoles[i]).toBe("bottomEdge");
    }
  });

  it("holds every smooth knot's two handles in one straight line through it", () => {
    checkSmoothHandles(curves);
  });
});

function checkSmoothHandles(curves: BrdCurves): void {
  for (const section of curves.sections) {
    for (const k of section.knots) {
      if (!k.smooth) continue;
      const a: P2 = [k.point[0] - k.before[0], k.point[1] - k.before[1]];
      const b: P2 = [k.after[0] - k.point[0], k.after[1] - k.point[1]];
      const cross = a[0] * b[1] - a[1] * b[0];
      expect(Math.abs(cross)).toBeLessThanOrEqual(1e-6 * Math.max(Math.hypot(...a) * Math.hypot(...b), 1e-9));
    }
  }
}

describe("the channel walls on the Deep Single + 4 channels board keep their knot numbers", () => {
  const curves = brdCurves(cut.surface, cutOptions);
  const { halves, walls } = boardSectionHalves(cut.surface);
  const roles = curves.sectionKnotRoles;
  const footAt = (wall: number) => roles.findIndex((r, i) => r === "wallFoot" && roles.slice(0, i).filter((q) => q === "wallFoot").length === wall);
  const topAt = (wall: number) => roles.findIndex((r, i) => r === "wallTop" && roles.slice(0, i).filter((q) => q === "wallTop").length === wall);

  it("puts both knots of a standing wall on the wall as corners, and both of a missing wall smooth on the bottom, apart", () => {
    let standingSections = 0;
    let missingSections = 0;
    let fullLeans = 0;
    for (const section of curves.sections) {
      const half = halves.find((h) => h.station === section.station)!;
      const baseZ = half.points[0][2];
      walls.forEach((wall, w) => {
        const foot = section.knots[footAt(w)];
        const top = section.knots[topAt(w)];
        const footPoint = half.points[wall.foot];
        const topPoint = half.points[wall.top];
        const height = topPoint[2] - footPoint[2];
        const standing = Math.hypot(topPoint[1] - footPoint[1], topPoint[2] - footPoint[2]) >= BRD_KNOT_GAP_MM;
        if (standing) {
          standingSections++;
          expect(foot.smooth).toBe(false);
          expect(top.smooth).toBe(false);
          expect(foot.point[0]).toBeCloseTo(Math.abs(footPoint[1]), 6);
          // The wall leans (BRD_WALL_LEAN_MM): its lower end is written toward the rail, never straight under the upper.
          const lean = top.point[0] - foot.point[0];
          const wanted = Math.max(BRD_WALL_LEAN_MM, Math.abs(height) * BRD_WALL_LEAN_PER_HEIGHT);
          const room = section.knots[topAt(w) + 1].point[0] - Math.abs(topPoint[1]);
          expect(lean).toBeGreaterThan(0);
          expect(lean).toBeLessThanOrEqual(wanted + 1e-6);
          if (room * BRD_WALL_LEAN_ROOM > wanted + 1) {
            fullLeans++;
            expect(lean).toBeCloseTo(wanted, 6);
          }
          expect(foot.point[1]).toBeCloseTo(footPoint[2] - baseZ, 6);
          expect(top.point[1] - foot.point[1]).toBeCloseTo(height, 6);
        } else {
          missingSections++;
          expect(foot.smooth).toBe(true);
          expect(top.smooth).toBe(true);
          expect(distanceToPolyline(foot.point, section.points)).toBeLessThan(1e-6);
          expect(distanceToPolyline(top.point, section.points)).toBeLessThan(1e-6);
        }
      });
      for (let i = 1; i < section.knots.length; i++) {
        const gap = Math.hypot(section.knots[i].point[0] - section.knots[i - 1].point[0], section.knots[i].point[1] - section.knots[i - 1].point[1]);
        expect(gap).toBeGreaterThan(1e-6);
      }
      section.knots.forEach((k, i) => {
        if (!k.smooth) expect(["wallFoot", "wallTop", "bottomEdge"]).toContain(roles[i]);
      });
    }
    expect(standingSections).toBeGreaterThan(0);
    expect(missingSections).toBeGreaterThan(0);
    expect(fullLeans).toBeGreaterThan(0);
  });

  it("never runs straight up between the stringer and the rail: x rises along the whole bottom of every section (AkuShaper takes the first upright for the rail)", () => {
    const edge = roles.indexOf("bottomEdge");
    for (const section of curves.sections) {
      let x = -Infinity;
      for (let i = 0; i < edge; i++) {
        for (let k = 0; k <= 64; k++) {
          const p = bezierPoint(section.knots[i], section.knots[i + 1], k / 64);
          if (k > 0) expect(p[0]).toBeGreaterThan(x);
          x = p[0];
        }
      }
    }
  });

  it("keeps the wall knots that sit on the bottom at least half a millimetre from each other and from their neighbours", () => {
    for (const section of curves.sections) {
      walls.forEach((_, w) => {
        for (const i of [footAt(w), topAt(w)]) {
          const knot = section.knots[i];
          if (knot.smooth) {
            for (const j of [i - 1, i + 1]) {
              const other = section.knots[j].point;
              expect(Math.hypot(knot.point[0] - other[0], knot.point[1] - other[1])).toBeGreaterThanOrEqual(BRD_KNOT_GAP_MM - 1e-6);
            }
          }
        }
      });
    }
  });

  it("holds every smooth knot's two handles in one straight line, as on the flat board", () => {
    checkSmoothHandles(curves);
  });
});

describe("the Fish's sections", () => {
  it("every Fish section starts and ends on the stringer, the first at the crotch's ring", () => {
    const curves = brdCurves(fish);
    const { halves } = boardSectionHalves(fish);
    expect(curves.sections[0].station).toBe(halves[0].station);
    for (const section of curves.sections) {
      expect(section.knots[0].point[0]).toBeCloseTo(0, 9);
      expect(section.knots[section.knots.length - 1].point[0]).toBeCloseTo(0, 9);
    }
  });
});

/** Every step of a curve sampled 64 times a span: x never goes backwards by more than a millionth of a millimetre. */
function curveNeverTurnsBack(knots: BrdCurves["outline"]["knots"]): boolean {
  let x = -Infinity;
  for (let i = 0; i + 1 < knots.length; i++) {
    for (let k = 0; k <= 64; k++) {
      const p = bezierPoint(knots[i], knots[i + 1], k / 64);
      if (p[0] < x - 1e-6) return false;
      x = Math.max(x, p[0]);
    }
  }
  return true;
}

describe("a swallow is written as a wide square tail at its points", () => {
  const curves = brdCurves(fish);
  const half = boardRailHalfOutline(fish);

  it("starts the outline (0, 0) to (0, half the points' width) as a corner, then up the rail, x never going backwards", () => {
    const [first, second] = curves.outline.knots;
    expect(first.point).toEqual([0, 0]);
    expect(second.point[0]).toBeCloseTo(0, 9);
    expect(second.point[1]).toBeCloseTo(Math.abs(half[0][1]), 9);
    expect(second.smooth).toBe(false);
    curves.outline.knots.forEach((k, i) => {
      if (i > 0) expect(k.point[0]).toBeGreaterThanOrEqual(curves.outline.knots[i - 1].point[0]);
    });
    expect(curveNeverTurnsBack(curves.outline.knots)).toBe(true);
    expect(bezierDeviation(curves.outline.points, curves.outline.knots)).toBeLessThanOrEqual(0.5);
    const widest = Math.max(...half.map((p) => Math.abs(p[1])));
    expect(Math.max(...curves.outline.knots.map((k) => k.point[1]))).toBeCloseTo(widest, 9);
  });

  it("carries the rocker and the deck back to x = 0 at the points' bottom and deck, and stands no section in the notch", () => {
    const { deck, bottom } = boardStringerLines(fish);
    expect(curves.bottom.knots[0].point[0]).toBeCloseTo(0, 9);
    expect(curves.bottom.knots[0].point[1]).toBeCloseTo(bottom[0][2], 9);
    expect(curves.deck.knots[0].point[0]).toBeCloseTo(0, 9);
    expect(curves.deck.points[1][1]).toBeCloseTo(deck[0][2], 9);
    const crotch = boardSectionHalves(fish).halves[0].station;
    for (const section of curves.sections) expect(section.station).toBeGreaterThanOrEqual(crotch);
  });
});

describe("the outline never turns back, on every preset as it opens and re-cut with a swallow and a diamond", () => {
  const labels = ["shortboard", "fish", "midlength", "longboard"].flatMap((id) => ["asis", "swallow", "diamond"].map((tail) => `${id}|${tail}|hard`));
  const available = labels.filter((label) => BOARDS.some((b) => b.label === label));

  it("covers twelve boards", () => {
    expect(available.length).toBe(12);
  });

  describe.each(available)("%s", (label) => {
    it("writes an outline from (0, 0) whose x never decreases, square exactly when the tail is a swallow, a diamond's own rail untouched", () => {
      const fields = fieldsOf(label);
      const surface = flatSurface(fields);
      const outline = brdOutlineCurve(surface);
      expect(outline.knots[0].point).toEqual([0, 0]);
      expect(curveNeverTurnsBack(outline.knots)).toBe(true);
      const swallow = fields.outline.tail.kind === "swallow";
      expect(brdTailWrittenSquare(surface)).toBe(swallow);
      if (fields.outline.tail.kind === "diamond") {
        const rail = boardRailHalfOutline(surface).map((p): P2 => [p[0], Math.abs(p[1])]);
        expect(outline.points.slice(rail[0][1] > 1e-6 ? 1 : 0, rail.length + (rail[0][1] > 1e-6 ? 1 : 0))).toEqual(rail);
      }
    });
  });
});

describe("brdTailWrittenSquare", () => {
  it("is true for the Fish and false for the flat Shortboard and the Deep Single board", () => {
    expect(brdTailWrittenSquare(fish)).toBe(true);
    expect(brdTailWrittenSquare(shortboard)).toBe(false);
    expect(brdTailWrittenSquare(cut.surface)).toBe(false);
  });
});

describe("what the cut adds to the file", () => {
  it("the cut board's sections go below the stringer's bottom", () => {
    const read = readBrdText(brdText(cut.surface, cutOptions).text);
    expect(read.sections.some((s) => s.knots.some((k) => k.point[1] < -1e-6))).toBe(true);
  });

  it("a section's ends are level, with the mirrored handle across the stringer", () => {
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

describe("the file leaves the channels out (quick 261112-c2d)", () => {
  const board: BottomBoard = cut.board;
  const withChannels = cut.bottom;
  const channelsNone: BoardBottom = { ...withChannels, channels: switchChannelCount(withChannels.channels, 0, board) };
  const deepSingleNone: BoardBottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: withChannels.center,
    channels: switchChannelCount(DEFAULT_BOTTOM.channels, 0, board),
  };
  const fileBottom = brdFileBottom(withChannels, board);
  const written = surfaceAndText(cut, fileBottom);
  const none = surfaceAndText(cut, channelsNone);
  const read = readBrdText(written.text);

  it("says a bottom with 4, 6 or 8 channels and depth leaves them out, and one without does not", () => {
    for (const count of [4, 6, 8] as const) {
      const bottom: BoardBottom = { ...withChannels, channels: startingChannels(count, board, DEFAULT_BOTTOM.channels) };
      expect(brdLeavesChannelsOut(bottom)).toBe(true);
    }
    expect(brdLeavesChannelsOut(DEFAULT_BOTTOM)).toBe(false);
    expect(brdLeavesChannelsOut(channelsNone)).toBe(false);
    expect(brdLeavesChannelsOut({ ...withChannels, channels: { ...withChannels.channels, depth: mm(0) } })).toBe(false);
  });

  it("hands a bottom without channels back as the very same object", () => {
    expect(brdFileBottom(DEFAULT_BOTTOM, board)).toBe(DEFAULT_BOTTOM);
    expect(brdFileBottom(deepSingleNone, board)).toBe(deepSingleNone);
  });

  it("keeps every cut and the wing rule and only switches the channels off, the way None does", () => {
    expect(fileBottom.channels).toEqual(switchChannelCount(withChannels.channels, 0, board));
    expect(fileBottom.nose).toEqual(withChannels.nose);
    expect(fileBottom.center).toEqual(withChannels.center);
    expect(fileBottom.tail).toEqual(withChannels.tail);
    expect(fileBottom.wingRule).toEqual(withChannels.wingRule);
  });

  it("writes the board with channels as the same file as the same board with Channels None", () => {
    expect(written.text).toBe(none.text);
  });

  it("writes the flat board's five knot places a section, plus the knots the concave needs, with no wall knots and a corner only at the bottom edge", () => {
    // The concave is a bend the five base knots cannot follow within the section target, so the writer adds a knot
    // board-wide (BRD_ADDED_KNOTS_MAX); the channels' wall feet and tops are what is gone.
    const roles = written.curves.sectionKnotRoles;
    const flatRoles = brdCurves(shortboard).sectionKnotRoles;
    expect(roles.filter((r) => r !== "added")).toEqual(flatRoles);
    expect(roles).not.toContain("wallFoot");
    expect(roles).not.toContain("wallTop");
    for (const section of written.curves.sections) {
      expect(section.knots.length).toBe(roles.length);
      const sharp = section.knots.map((k, i) => (k.smooth ? -1 : i)).filter((i) => i >= 0);
      expect(sharp.length).toBeLessThanOrEqual(1);
      for (const i of sharp) expect(roles[i]).toBe("bottomEdge");
    }
  });

  it("keeps the concave: some section goes below the stringer's bottom", () => {
    expect(read.sections.some((s) => s.knots.some((k) => k.point[1] < -1e-6))).toBe(true);
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

describe("the fins in the file's header (quick 261113-qyz)", () => {
  const fields = fieldsOf("shortboard|asis|hard");
  const finsOf = (setup: FinSetup, system: (typeof FIN_SYSTEMS)[number]["value"] = "futures") => {
    const spec = { ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: setup, advanced: resetAdvanced(setup, "upright") };
    return brdFinFields(designFinPlacement({ outline: fields.outline, fins: spec, finsImportTemplate: true }), system);
  };
  const plain = brdText(shortboard);

  it("with no fins option writes the header it always wrote: no p51, p50 all zeros", () => {
    const read = readBrdText(plain.text);
    expect(read.header.map(([k]) => k)).not.toContain("p51");
    expect(new Map(read.header).get("p50")).toBe("[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]");
    expect(brdText(shortboard, { fins: null }).text).toBe(plain.text);
    expect(brdText(shortboard, {}).text).toBe(plain.text);
  });

  it("a thruster's file has p51 just before p50, p50's nine figures through the file's number format, and no other header change", () => {
    const fins = finsOf("thruster")!;
    const text = brdText(shortboard, { fins }).text;
    const read = readBrdText(text);
    const keys = read.header.map(([k]) => k);
    expect(keys).toEqual([
      "p01", "p02", "p03", "p04",
      ...BRD_MACHINE_FIELDS.map(([k]) => k).flatMap((k) => (k === "p50" ? ["p51", "p50"] : [k])),
    ]);
    const header = new Map(read.header);
    expect(header.get("p51")).toBe("Futures");
    expect(header.get("p50")).toBe(`[${fins.p50.map(formatBrdNumber).join(",")}]`);
    expect(header.get("p50")!.split(",")).toHaveLength(9);
    for (const [k, v] of BRD_MACHINE_FIELDS) if (k !== "p50") expect(header.get(k)).toBe(v);
    expect(/^[\x20-\x7e\n]*$/.test(text)).toBe(true);
  });

  it("every curve and section line is exactly the no-fins text's", () => {
    const withFins = brdText(shortboard, { fins: finsOf("twin")! }).text.split("\n");
    const without = plain.text.split("\n");
    const from = (lines: string[]) => lines.slice(lines.indexOf("p32 : ("));
    expect(from(withFins)).toEqual(from(without));
    expect(withFins.length).toBe(without.length + 1);
  });

  it("the header fields are p51's word then p50's line, from the same figures", () => {
    const fins = finsOf("single", "lokbox")!;
    expect(brdFinHeaderFields(fins)).toEqual([
      ["p51", "Lokbox"],
      ["p50", `[${fins.p50.map(formatBrdNumber).join(",")}]`],
    ]);
  });

  it("a quad writes no fins at all: the file is today's bytes", () => {
    expect(finsOf("quad")).toBeNull();
    expect(brdText(shortboard, { fins: finsOf("quad") }).text).toBe(plain.text);
  });

  it("a file with fins is the same locked file as ever: scrambled and read back", () => {
    const file = brdFile(shortboard, "My Board", { fins: finsOf("thruster")! });
    expect(readBrdText(unscrambleBrd(file.data)).header.map(([k]) => k)).toContain("p51");
    expect(brdFile(shortboard, "My Board").data).toEqual(brdFile(shortboard, "My Board", { fins: null }).data);
  });
});
