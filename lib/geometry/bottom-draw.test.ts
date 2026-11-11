import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import { phase17ChannelBoards } from "./__fixtures__/phase17-channel-boards";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  BOTTOM_SHADE_STEP,
  bottomDataRows,
  bottomLayoutMarks,
  channelStart,
  channelWallKey,
  deepestCutAt,
  DEFAULT_BOTTOM,
  foamOff,
  pickCut,
  resolveBottom,
  resolveCut,
  sectionsFoamOff,
  startingChannels,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
  type ChannelCount,
} from "./bottom";
import {
  BOTTOM_CONTOUR_STEP,
  BOTTOM_SHADE_REACH,
  bottomContourLines,
  bottomFinLines,
  bottomPencilLines,
  bottomSection,
  bottomShadeBands,
  builtSectionAt,
  cutAlone,
  DRAWING_WIDTH,
  GAUGE_BESIDE_ROOM,
  gaugeReads,
  ghostRail,
  ghostRailPath,
  guideCartoon,
  placeRailLabels,
  SECTION_AIR,
  sectionGauges,
  sectionHeightLabel,
  sectionRuler,
  sectionOpeningStation,
  shadePathData,
  stationAtPointer,
  topViewFrame,
  topViewMap,
  topViewMarks,
  topViewX,
  TOP_VIEW_GRID,
  type BottomCutKey,
  type GuideCartoonKey,
  type SectionDrawing,
  type ShadeRect,
} from "./bottom-draw";
import { bottomPrintCuts } from "./bottom-print";
import { formatBottomStation } from "./blank-reasons";
import type { DesignSummaryFields } from "./design";
import { deriveEffectiveRails, designBottomBoard, designCrossSectionInput, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import type { FinPlacementResult } from "./fins";
import { buildOutline, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { formatMarkBare } from "./measure-display";
import { inchesToMm, mm, UNITS_SYSTEMS, type Mm } from "./units";
import { boardSections } from "./volume";

/*
 * Every expected figure here is the app's own: the one number (`foamOff`), the cuts' own starting numbers
 * (`startingCut`, `startingChannels`, `channelStart`), the fins' own placement — as relations, never typed (CLAUDE.md
 * Rule 1). The boards are the four presets as their cards open them (the Phase 16 set), built through the app.
 */

interface TestBoard {
  id: string;
  fields: DesignSummaryFields;
  geometry: OutlineGeometry;
  placement: FinPlacementResult;
  board: BottomBoard;
}

function presetBoards(): TestBoard[] {
  const all = phase16Boards();
  return BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    const fields = all.find((b) => b.label === label)!.fields;
    const geometry = buildOutline(fields.outline);
    const placement = designFinPlacement(fields);
    const board = designBottomBoard(fields.outline, geometry, designSideProfile(fields, LIVE_DESIGN_RULES), placement);
    return { id: preset.id, fields, geometry, placement, board };
  });
}

const BOARDS = presetBoards();
const byId = (id: string) => BOARDS.find((b) => b.id === id)!;

/** A bottom with the named sections on their starting numbers, and channels picked as the store picks them. */
function bottomOf(board: BottomBoard, names: Partial<Record<BottomSectionKey, BottomCutName>>, count: ChannelCount | 0 = 0): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name, board);
  }
  if (count > 0) bottom.channels = startingChannels(count as ChannelCount, board, bottom.channels);
  return bottom;
}

/** The sketch's opening cuts on each preset (sketch 021's `STARTS`). */
const OPENINGS: Record<string, Partial<Record<BottomSectionKey, BottomCutName>>> = {
  shortboard: { center: "Deep Single Concave" },
  fish: { tail: "Panel Vee" },
  midlength: { nose: "Blended Nose Concave", center: "Shallow Single Concave", tail: "Spiral Vee" },
  longboard: { nose: "Teardrop Nose Concave", center: "Continuous Belly / Rolled Mid", tail: "Rolled Vee" },
};

const FLAT = (board: BottomBoard) => resolveBottom(DEFAULT_BOTTOM, board);

function overlaps(a: ShadeRect, b: ShadeRect): boolean {
  const eps = 1e-9;
  return a.s0 < b.s1 - eps && b.s0 < a.s1 - eps && a.y0 < b.y1 - eps && b.y0 < a.y1 - eps;
}

describe("a flat bottom draws nothing but the fins", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s", (_id, t) => {
    const flat = FLAT(t.board);
    expect(bottomShadeBands(flat, t.board)).toEqual([]);
    expect(bottomContourLines(flat, t.board)).toEqual([]);
    expect(bottomPencilLines(flat, t.board, "center")).toEqual([]);
    expect(bottomFinLines(t.placement)).toHaveLength(t.placement.marks.length);
    expect(topViewMarks(t.board, flat, "center", t.placement, "imperial").lower).toBeNull();
  });
});

describe("the shade (D-12): one level every 1/32\", one path per level", () => {
  const t = byId("shortboard");
  const resolved = resolveBottom(bottomOf(t.board, OPENINGS.shortboard), t.board);
  const levels = bottomShadeBands(resolved, t.board);

  it("the Shortboard's Deep Single at 1/4\" is eight levels deep — the cut's own depth over 1/32\"", () => {
    const depth = resolved.center.depth;
    expect(levels.at(-1)!.index).toBe(Math.floor(depth / BOTTOM_SHADE_STEP + 1e-9));
    levels.forEach((level, q) => {
      expect(level.index).toBe(q + 1);
      expect(level.depth).toBeCloseTo(level.index * BOTTOM_SHADE_STEP, 12);
    });
  });

  it("every rectangle of a level stands where the foam off reaches that level, at its column's centre", () => {
    for (const level of levels) {
      for (const r of level.rects.slice(0, 400)) {
        const s = mm((r.s0 + r.s1) / 2);
        const y = mm(Math.abs((r.y0 + r.y1) / 2));
        // the sample nearest the rect's middle is at or past the level (a run's edges stand halfway between samples)
        const W = t.board.railAt(s);
        const dy = W / TOP_VIEW_GRID.across;
        const near = [y - dy / 2, y, y + dy / 2].map((v) => foamOff(resolved, t.board, s, mm(Math.max(0, Math.min(W, v)))));
        expect(Math.max(...near)).toBeGreaterThanOrEqual(level.depth - BOTTOM_SHADE_REACH);
      }
    }
  });

  it("within one level no two rectangles overlap", () => {
    for (const level of levels) {
      const rects = level.rects;
      for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) expect(overlaps(rects[a], rects[b])).toBe(false);
    }
  });

  it("shadePathData joins a level into one path, a sub-path per rectangle", () => {
    const map = topViewMap(topViewFrame(t.board, 800, 300));
    const paths = levels.map((level) => shadePathData(level.rects, map));
    expect(paths).toHaveLength(levels.length);
    paths.forEach((d, q) => expect(d.match(/M/g)!.length).toBe(levels[q].rects.length));
  });

  it("the Longboard with its three opening cuts and 8 channels has no more than 48 shade paths (T-17-11)", () => {
    const lb = byId("longboard");
    const worst = resolveBottom(bottomOf(lb.board, OPENINGS.longboard, 8), lb.board);
    const shade = bottomShadeBands(worst, lb.board);
    expect(shade.length).toBeGreaterThan(0);
    expect(shade.length).toBeLessThanOrEqual(48);
  });
});

describe("the contour lines (D-12): a line at every 1/16\"", () => {
  it.each(Object.keys(OPENINGS).map((id) => [id] as const))("%s: every point of every line sits where the foam off crosses its level, within the grid", (id) => {
    const t = byId(id);
    const resolved = resolveBottom(bottomOf(t.board, OPENINGS[id], 6), t.board);
    const contours = bottomContourLines(resolved, t.board);
    expect(contours.length).toBeGreaterThan(0);
    contours.forEach((c) => expect(c.depth).toBeCloseTo(c.index * BOTTOM_CONTOUR_STEP, 12));
    for (const level of contours) {
      for (const line of level.lines) {
        expect(line.length).toBeGreaterThan(1);
        for (const [s, ySigned] of line) {
          const y = Math.abs(ySigned);
          const W = t.board.railAt(mm(s));
          const inner = t.board.notchInner(mm(s));
          // the two grid samples either side of the point: the foam off at one is under the level, at the other over it
          const span = (W - inner) / TOP_VIEW_GRID.across;
          const j = Math.min(TOP_VIEW_GRID.across - 1, Math.max(0, Math.floor((y - inner) / span + 1e-9)));
          const either = [j, j + 1].map((q) => foamOff(resolved, t.board, mm(s), mm(inner + span * q)));
          expect(Math.min(...either)).toBeLessThanOrEqual(level.depth + 1e-9);
          expect(Math.max(...either)).toBeGreaterThanOrEqual(level.depth - 1e-9);
          expect(y).toBeGreaterThanOrEqual(inner + span * j - 1e-6);
          expect(y).toBeLessThanOrEqual(inner + span * (j + 1) + 1e-6);
        }
      }
    }
  });
});

describe("the pencil lines (D-12)", () => {
  const t = byId("shortboard");

  it("each cut's lines carry its kind, its cut, and whether it is live; each runs from its own Start to End", () => {
    const resolved = resolveBottom(bottomOf(t.board, { nose: "Blended Nose Concave", center: "Early Double Concave", tail: "Panel Vee" }), t.board);
    const lines = bottomPencilLines(resolved, t.board, "center");
    expect(lines.map((l) => [l.cut, l.kind, l.live])).toEqual([
      ["nose", "edge", false],
      ["center", "flat", true],
      ["center", "trough", true],
      ["center", "edge", true],
    ]);
    for (const line of lines) {
      const cut = resolved[line.cut as BottomSectionKey];
      for (const run of line.runs) for (const [s] of run) {
        expect(s).toBeGreaterThanOrEqual(cut.end - 1e-9);
        expect(s).toBeLessThanOrEqual(cut.start + 1e-9);
      }
      // both sides of the stringer
      expect(line.runs.some((run) => run[0][1] > 0)).toBe(true);
      expect(line.runs.some((run) => run[0][1] < 0)).toBe(true);
    }
  });

  it("a Tri-Plane's panel line stands at its Off Stringer", () => {
    const resolved = resolveBottom(bottomOf(t.board, { center: "Tri-Plane Hull Center" }), t.board);
    const [panel] = bottomPencilLines(resolved, t.board, "center");
    expect(panel.kind).toBe("panel");
    for (const run of panel.runs) for (const [, y] of run) expect(Math.abs(y)).toBeCloseTo(resolved.center.offStringer, 9);
  });

  it("a staggered 6-channel set's walls start at each channel's own start, so the fronts step", () => {
    const resolved = resolveBottom(bottomOf(t.board, {}, 6), t.board);
    const ch = resolved.channels;
    const walls = bottomPencilLines(resolved, t.board, "channels").filter((l) => l.kind === "wall");
    expect(walls).toHaveLength(3);
    const step = (ch.start - ch.end) / 160;
    const fronts = walls.map((w) => Math.max(...w.runs.flatMap((run) => run.map(([s]) => s))));
    walls.forEach((_w, j) => {
      const start = channelStart(ch, j);
      // the first ruled point: just behind the channel's own start, where its fade passes 0.4%
      expect(fronts[j]).toBeLessThanOrEqual(start + 1e-9);
      expect(fronts[j]).toBeGreaterThan(start - 0.05 * (start - ch.deepest) - step);
    });
    // the outer pair is longest: each wall out from the stringer starts further toward the nose
    expect(fronts[2]).toBeGreaterThan(fronts[1]);
    expect(fronts[1]).toBeGreaterThan(fronts[0]);
  });
});

describe("the fins (D-31): FINS' own base lines", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: one line per fin, its ends the mark's trailing and leading points", (_id, t) => {
    const lines = bottomFinLines(t.placement);
    expect(lines).toHaveLength(t.placement.marks.length);
    lines.forEach((line, q) => {
      const m = t.placement.marks[q];
      expect(line.from).toEqual([m.offTail, m.lateral]);
      expect(line.to).toEqual([m.leadingOffTail, m.leadingLateral]);
      // on its own side of the stringer, as FINS draws it
      if (m.side !== 0) expect(Math.sign(line.from[1])).toBe(m.side);
    });
  });
});

describe("the rails of marks (D-12, D-07)", () => {
  it.each(UNITS_SYSTEMS)("%s: the upper rail names the wide point and the front fins; the lower the live cut's three stations from its nearest tip", (system) => {
    const t = byId("shortboard");
    const resolved = resolveBottom(bottomOf(t.board, { nose: "Blended Nose Concave", center: "Deep Single Concave" }), t.board);
    const center = topViewMarks(t.board, resolved, "center", t.placement, system);
    expect(center.upper.map((m) => [m.name, m.value])).toEqual([
      ["WIDE POINT", formatBottomStation(t.board.widePoint, system)],
      ["FRONT FINS", formatBottomStation(t.board.frontFins, system)],
    ]);
    expect(center.lower!.marks.map((m) => [m.name, m.value])).toEqual([
      ["START", formatBottomStation(resolved.center.start, system)],
      ["DEEPEST", formatBottomStation(resolved.center.deepest, system)],
      ["END", formatBottomStation(resolved.center.end, system)],
    ]);
    expect(center.lower!.deepest).toBe(resolved.center.deepest);
    const nose = topViewMarks(t.board, resolved, "nose", t.placement, system);
    expect(nose.lower!.marks.map((m) => m.value)).toEqual(
      [resolved.nose.start, resolved.nose.deepest, resolved.nose.end].map((s) => formatBottomStation(mm(t.board.length - s), system)),
    );
    // the live tail is flat: nothing on the lower rail
    expect(topViewMarks(t.board, resolved, "tail", t.placement, system).lower).toBeNull();
  });

  it("a board with no front pair names its single fin", () => {
    const lb = byId("longboard");
    expect(lb.placement.marks.some((m) => m.role === "front")).toBe(false);
    expect(topViewMarks(lb.board, FLAT(lb.board), null, lb.placement, "imperial").upper[1].name).toBe("FIN");
  });

  const measure = (text: string) => text.length * 6.4;
  const cases: [string, number, number[]][] = [
    ["apart", 800, [100, 400, 700]],
    ["two touching", 800, [300, 330]],
    ["three touching", 800, [300, 320, 340]],
    ["at the right edge", 400, [380, 396]],
    ["at the left edge", 400, [2, 20, 200]],
    ["a narrow box", 120, [10, 60, 110]],
  ];
  it.each(cases)("placeRailLabels, %s: no two drawn labels overlap, none passes the box", (_name, box, xs) => {
    const texts = ['START 58"', 'DEEPEST 23 7/16"', 'END 4"'];
    const placed = placeRailLabels(xs.map((x, q) => ({ x, text: texts[q % 3] })), box, measure);
    expect(placed).toHaveLength(xs.length);
    const spans = placed
      .filter((p) => p.show)
      .map((p) => {
        const w = measure(p.text);
        return p.anchor === "middle" ? [p.textX - w / 2, p.textX + w / 2] : p.anchor === "end" ? [p.textX - w, p.textX] : [p.textX, p.textX + w];
      })
      .sort((a, b) => a[0] - b[0]);
    for (const [left, right] of spans) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(box);
    }
    for (let q = 1; q < spans.length; q++) expect(spans[q][0]).toBeGreaterThanOrEqual(spans[q - 1][1]);
    // the first label always draws; two apart stay centred on their ticks
    expect(placed.some((p) => p.show)).toBe(true);
    if (_name === "apart") placed.forEach((p) => expect([p.anchor, p.textX]).toEqual(["middle", p.x]));
    if (_name === "two touching") expect(placed.map((p) => p.anchor)).toEqual(["end", "start"]);
  });
});

describe("the cutting line (D-12)", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: a pointer maps to a station, the nose at the left, clamped to the board; the section opens at the wide point", (_id, t) => {
    for (const [w, h] of [[800, 300], [360, 220], [1200, 260]] as const) {
      const frame = topViewFrame(t.board, w, h);
      expect(stationAtPointer(topViewX(frame, t.board.length), frame)).toBeCloseTo(t.board.length, 6);
      expect(stationAtPointer(topViewX(frame, 0), frame)).toBeCloseTo(0, 6);
      expect(stationAtPointer(topViewX(frame, t.board.widePoint), frame)).toBeCloseTo(t.board.widePoint, 6);
      expect(stationAtPointer(-50, frame)).toBe(t.board.length);
      expect(stationAtPointer(frame.width + 50, frame)).toBe(0);
      // the board stays inside the box, between the two rails' room
      expect(topViewX(frame, t.board.length)).toBeGreaterThanOrEqual(0);
      expect(topViewX(frame, 0)).toBeLessThanOrEqual(frame.width);
      expect(frame.cy - (t.board.widePointWidth / 2) * frame.k).toBeGreaterThanOrEqual(frame.padTop - 1e-9);
      expect(frame.cy + (t.board.widePointWidth / 2) * frame.k).toBeLessThanOrEqual(frame.height - frame.padBottom + 1e-9);
    }
    expect(sectionOpeningStation(t.board)).toBe(t.board.widePoint);
  });
});

describe("no foam off is worked out here (D-05)", () => {
  it("the shade reads the one number: a bottom whose foam off is doubled draws twice the levels", () => {
    const t = byId("shortboard");
    const once = resolveBottom(bottomOf(t.board, OPENINGS.shortboard), t.board);
    const twice = { ...once, center: { ...once.center, depth: mm(once.center.depth * 2) as Mm } };
    expect(bottomShadeBands(twice, t.board).length).toBe(Math.floor((2 * once.center.depth) / BOTTOM_SHADE_STEP + 1e-9));
    expect(inchesToMm(1 / 32)).toBe(BOTTOM_SHADE_STEP);
  });
});

/* ============ Task 2: the section, its gauges, the ruler, the ghost, the cartoons ============ */

/** The section's box in a 1280 × 800 window: the window less the panel and the column's, folder's and card's gutters
 * (548 dots at 1024, so 804 at 1280 — D-30), and 165 dots tall under the top view, as sketch 021's section stands in
 * its own 1280 × 800 picture (`desktop-tail-channels.png`). */
const BOX_1280 = { width: 804, height: 165 };
const measureValue = (text: string) => text.length * 6.2;

function sectionsOf(t: TestBoard, bottom: BoardBottom, stations?: Mm[]) {
  const profile = designSideProfile(t.fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(t.fields.rails, profile.effectiveFoil, t.fields.railsImportFoilThickness);
  return boardSections(designCrossSectionInput(t.geometry, profile, rails, t.fields.outline.length, { bottom, board: t.board }), stations);
}

describe("the section (D-13): one scale at every station", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: the wide point's section spans the box less 20 dots a side; nearer the tail it is narrower at the same scale", (_id, t) => {
    const resolved = resolveBottom(bottomOf(t.board, OPENINGS[t.id]), t.board);
    for (const box of [BOX_1280, { width: 548, height: 260 }, { width: 344, height: 200 }]) {
      const wide = bottomSection(resolved, t.board, t.board.widePoint, 4, box, { live: "center" });
      const px = DRAWING_WIDTH / box.width;
      expect(wide.kx).toBeCloseTo((DRAWING_WIDTH - 2 * SECTION_AIR * px) / t.board.widePointWidth, 12);
      // the outline at the wide point is the wide point's width, so its slab spans the box less the air
      const span = 2 * t.board.railAt(t.board.widePoint) * wide.kx;
      expect(span).toBeCloseTo(DRAWING_WIDTH - 2 * SECTION_AIR * px, 6);
      expect(wide.widthAtStation).toBeCloseTo(2 * t.board.railAt(t.board.widePoint), 9);
      const back = bottomSection(resolved, t.board, mm(t.board.frontFins), 4, box, { live: "center" });
      expect(back.kx).toBe(wide.kx);
      expect(back.railEdge).toBeLessThan(wide.railEdge);
    }
  });

  it("at Height ×8 on the Longboard's belly the cut is fitted, and the factor drawn is below 8", () => {
    const t = byId("longboard");
    const resolved = resolveBottom(bottomOf(t.board, { center: "Continuous Belly / Rolled Mid" }), t.board);
    const sec = bottomSection(resolved, t.board, resolved.center.deepest, 8, BOX_1280, { live: "center" });
    expect(sec.fitted).toBe(true);
    expect(sec.heightDrawn).toBeLessThan(8);
    expect(sectionHeightLabel(sec)).toBe(`HEIGHT ×${sec.heightDrawn.toFixed(1)}`);
    const shallow = bottomSection(resolved, t.board, resolved.center.deepest, 1, BOX_1280, { live: "center" });
    expect(shallow.fitted).toBe(false);
    expect(sectionHeightLabel(shallow)).toBe("TRUE HEIGHT");
    expect(sectionHeightLabel(bottomSection(resolved, t.board, resolved.center.deepest, 2, BOX_1280, { live: "center" }))).toBe("HEIGHT ×2");
  });

  it("the slab's bottom is the one number at every point, held at its top; a slab that would not fit has a break line", () => {
    const t = byId("shortboard");
    const resolved = resolveBottom(bottomOf(t.board, OPENINGS.shortboard), t.board);
    const s = resolved.center.deepest;
    const sec = bottomSection(resolved, t.board, s, 4, BOX_1280, { live: "center" });
    for (const y of [0, 20, 80, 150]) expect(sec.bottomAt(y)).toBe(Math.min(foamOff(resolved, t.board, s, mm(y)), t.board.thicknessAt(s)));
    expect(sec.pieces).toHaveLength(1);
    // the planed thickness at ×4 does not fit a 300-dot box: the slab breaks
    expect(sec.breakLine).toBe(sec.y0 - t.board.thicknessAt(s) * sec.ky < Math.min(24 * sec.px, sec.height * 0.14));
    expect(sec.breakPath !== null).toBe(sec.breakLine);
    // the straightedge overhangs each rail, never past the box
    expect(sec.straightedge.x1).toBeLessThan(sec.cx - sec.railEdge * sec.kx);
    expect(sec.straightedge.x2).toBeGreaterThan(sec.cx + sec.railEdge * sec.kx);
    expect(sec.straightedge.x2).toBeLessThanOrEqual(DRAWING_WIDTH);
    // the foot sits 92 dots up with the ruler under it, 44 without
    expect(sec.ruler).toBe(true);
    expect(sec.height - sec.y0).toBeCloseTo(Math.min(92 * sec.px, sec.height * 0.42), 9);
    const bare = bottomSection(resolved, t.board, s, 4, { width: 500, height: 300 }, { live: "center" });
    expect(bare.ruler).toBe(false);
    expect(bare.height - bare.y0).toBeCloseTo(Math.min(44 * bare.px, bare.height * 0.26), 9);
  });

  it("a swallow's tail is two pieces; the nose tip has no slab at all", () => {
    const t = byId("fish");
    const resolved = resolveBottom(bottomOf(t.board, OPENINGS.fish), t.board);
    const notch = [inchesToMm(1 / 2), inchesToMm(1)].map(mm).find((s) => t.board.notchInner(s) > 0.5)!;
    expect(notch).toBeDefined();
    expect(bottomSection(resolved, t.board, notch, 4, BOX_1280, { live: "tail" }).pieces).toHaveLength(2);
    const tip = bottomSection(resolved, t.board, t.board.length, 4, BOX_1280, { live: "tail" });
    expect(tip.pieces).toEqual([]);
    expect(tip.widthAtStation).toBe(0);
    expect(sectionGauges(tip, resolved, t.board, "imperial")).toEqual([]);
  });

  it("D-40: where a vee lifts the tail to the deck the foam ends at the seam's knife edge — no lip, nothing above the slab", () => {
    const t = byId("fish");
    const bottom = bottomOf(t.board, OPENINGS.fish);
    bottom.tail = { ...bottom.tail, depth: inchesToMm(1 / 2) };
    const resolved = resolveBottom(bottom, t.board);
    const edged = sectionsOf(t, bottom).filter((sec) => sec.railEdgeAt !== undefined && sec.station > 1);
    expect(edged.length).toBeGreaterThan(0);
    for (const seam of edged) {
      const sec = bottomSection(resolved, t.board, seam.station, 4, BOX_1280, { live: "tail", seam });
      expect(sec.railEdge).toBeLessThanOrEqual(t.board.notchInner(seam.station) + seam.railEdgeAt! + 1e-9);
      expect(sec.railEdge).toBeLessThan(t.board.railAt(seam.station));
      for (const d of sec.pieces) {
        for (const [, y] of d.matchAll(/[ML][-\d.]+ ([-\d.]+)/g)) expect(Number(y)).toBeGreaterThanOrEqual(sec.yTop - 0.1);
      }
    }
  });

  it("D-40: a lift deeper than the slab ends the slab where the cut reaches its top — a knife edge, never a lip", () => {
    const t = byId("shortboard");
    const bottom = bottomOf(t.board, { tail: "Panel Vee" });
    const s = mm(t.board.frontFins);
    bottom.tail = { ...bottom.tail, depth: mm(t.board.thicknessAt(s) * 1.5) };
    const resolved = resolveBottom(bottom, t.board);
    const sec = bottomSection(resolved, t.board, s, 1, { width: 804, height: 400 }, { live: "tail" });
    expect(sec.railEdge).toBeLessThan(t.board.railAt(s));
    expect(foamOff(resolved, t.board, s, sec.railEdge)).toBeGreaterThanOrEqual(t.board.thicknessAt(s) - 1e-6);
    expect(foamOff(resolved, t.board, s, mm(sec.railEdge - 0.01))).toBeLessThan(t.board.thicknessAt(s));
    expect(sec.bottomAt(t.board.railAt(s))).toBe(t.board.thicknessAt(s));
  });
});

describe("WR-03: a drawn section ends its foam where the litres end it (builtSectionAt, the code review 2026-11-10)", () => {
  const inputOf = (t: TestBoard, bottom?: BoardBottom) => {
    const profile = designSideProfile(t.fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(t.fields.rails, profile.effectiveFoil, t.fields.railsImportFoilThickness);
    return designCrossSectionInput(t.geometry, profile, rails, t.fields.outline.length, bottom ? { bottom, board: t.board } : undefined);
  };
  /** Every stock starting bottom of a board: each named cut alone, the sketch's opening set, and each count of channels. */
  const startingBottoms = (t: TestBoard): [name: string, bottom: BoardBottom][] => [
    ...BOTTOM_SECTIONS.flatMap((section) => BOTTOM_CUT_NAMES[section].map((name): [string, BoardBottom] => [name, bottomOf(t.board, { [section]: name })])),
    ["the opening set", bottomOf(t.board, OPENINGS[t.id])],
    ...([4, 6, 8] as const).map((count): [string, BoardBottom] => [`${count} channels`, bottomOf(t.board, {}, count)]),
  ];
  /** Every inch from the tail to the nose, and the stations the Bottom Contours sheet prints its sections at. */
  const drawnStations = (t: TestBoard, bottom: BoardBottom): Mm[] => {
    const out: Mm[] = [];
    for (let s = 0; s <= t.board.length; s += inchesToMm(1)) out.push(mm(s));
    return [...out, ...bottomPrintCuts(resolveBottom(bottom, t.board)).map((cut) => cut.deepest)];
  };
  /** A drawing as its numbers and paths: its one function is read across the station instead. */
  const drawn = ({ bottomAt, ...rest }: SectionDrawing) => ({ ...rest, across: Array.from({ length: 9 }, (_, k) => bottomAt((rest.railEdge * k) / 8)) });
  /** The two box sizes the Bottom Contours sheet draws a section in (one cut alone, and two side by side). */
  const PRINT_BOXES = [
    { width: 650, height: 120 },
    { width: 322, height: 100 },
  ];

  it("is the litres' own section: at each of the litres' stations the very section their list holds, and at any other the one boardSections builds there", () => {
    for (const t of BOARDS) {
      const bottom = bottomOf(t.board, OPENINGS[t.id], 6);
      const input = inputOf(t, bottom);
      const list = boardSections(input);
      expect(list.length).toBeGreaterThan(0);
      for (const section of list) expect(builtSectionAt(input, section.station), `${t.id} at ${section.station}`).toEqual(section);
      for (const s of drawnStations(t, bottom)) expect(builtSectionAt(input, s), `${t.id} at ${s}`).toEqual(boardSections(input, [s])[0]);
    }
  });

  it("a flat bottom builds no section at all, and its drawing is its own", () => {
    for (const t of BOARDS) {
      const flat = structuredClone(DEFAULT_BOTTOM);
      const resolved = resolveBottom(flat, t.board);
      for (const input of [inputOf(t), inputOf(t, flat), inputOf(t, bottomOf(t.board, { nose: "Flat Entry", center: "Flat Center", tail: "Flat Exit" }))]) {
        expect(input.foamOffAt).toBeUndefined();
        for (const s of drawnStations(t, flat)) expect(builtSectionAt(input, s)).toBeNull();
      }
      // with nothing handed over the drawing is the one it has always been
      for (const s of drawnStations(t, flat)) {
        expect(drawn(bottomSection(resolved, t.board, s, 4, BOX_1280, { live: null, seam: null }))).toEqual(drawn(bottomSection(resolved, t.board, s, 4, BOX_1280, { live: null })));
      }
    }
  });

  it.each(BOARDS.map((b) => [b.id, b] as const))(
    "%s: on every stock starting bottom the section is the same drawing, point for point, wherever the litres' section has no knife edge — and every printed section is one of those",
    (_id, t) => {
      let same = 0;
      for (const [name, bottom] of startingBottoms(t)) {
        const resolved = resolveBottom(bottom, t.board);
        const input = inputOf(t, bottom);
        const printed = bottomPrintCuts(resolved).map((cut) => cut.deepest);
        for (const s of drawnStations(t, bottom)) {
          const seam = builtSectionAt(input, s);
          if (seam?.railEdgeAt !== undefined) {
            // a starting bottom ends the foam only by a tip, never where the sheet prints a section
            expect(printed, `${name}: a printed section with a knife edge at ${s}`).not.toContain(s);
            continue;
          }
          // the screen's box at every inch; at a printed station the sheet's two boxes as well, with each live cut
          const looks: [box: { width: number; height: number }, live: BottomCutKey | null][] = [[BOX_1280, null]];
          if (printed.includes(s)) for (const box of PRINT_BOXES) for (const live of [null, "center", "channels"] as const) looks.push([box, live]);
          for (const [box, live] of looks) {
            const without = bottomSection(resolved, t.board, s, 4, box, { live });
            const withSeam = bottomSection(resolved, t.board, s, 4, box, { live, seam });
            expect(drawn(withSeam), `${name} at ${s}`).toEqual(drawn(without));
            expect(sectionGauges(withSeam, resolved, t.board, "imperial")).toEqual(sectionGauges(without, resolved, t.board, "imperial"));
          }
          same++;
        }
      }
      expect(same).toBeGreaterThan(0);
    },
    120_000,
  );

  it("where the litres end the foam the drawing ends it there too, never at its own later estimate", () => {
    const SETS: [id: string, name: string, bottom: (t: TestBoard) => BoardBottom][] = [
      ["shortboard", "six channels 1/2\" deep", (t) => ({ ...bottomOf(t.board, {}, 6), channels: { ...startingChannels(6, t.board, DEFAULT_BOTTOM.channels), depth: inchesToMm(1 / 2) } })],
      ["midlength", "six channels 1/2\" deep", (t) => ({ ...bottomOf(t.board, {}, 6), channels: { ...startingChannels(6, t.board, DEFAULT_BOTTOM.channels), depth: inchesToMm(1 / 2) } })],
      ["shortboard", "a Rolled Vee lifted 1/2\"", (t) => ({ ...bottomOf(t.board, { tail: "Rolled Vee" }), tail: { ...startingCut("tail", "Rolled Vee", t.board), veeLift: inchesToMm(1 / 2) } })],
      ["fish", "a Panel Vee 1/2\" deep", (t) => ({ ...bottomOf(t.board, OPENINGS.fish), tail: { ...startingCut("tail", "Panel Vee", t.board), depth: inchesToMm(1 / 2) } })],
    ];
    for (const [id, name, make] of SETS) {
      const t = byId(id);
      const bottom = make(t);
      const resolved = resolveBottom(bottom, t.board);
      const input = inputOf(t, bottom);
      let ended = 0;
      let earlier = 0;
      for (let s = 0; s <= inchesToMm(8); s += inchesToMm(1 / 4)) {
        const seam = builtSectionAt(input, mm(s));
        if (seam?.railEdgeAt === undefined) continue;
        ended++;
        const litresEdge = t.board.notchInner(mm(s)) + seam.railEdgeAt;
        const without = bottomSection(resolved, t.board, mm(s), 4, BOX_1280, { live: null });
        const withSeam = bottomSection(resolved, t.board, mm(s), 4, BOX_1280, { live: null, seam });
        // the litres' edge, unless the drawing's own slab already ended further in
        expect(withSeam.railEdge, `${id} · ${name} at ${s}`).toBe(Math.min(without.railEdge, litresEdge));
        expect(withSeam.railEdge).toBeLessThanOrEqual(t.board.railAt(mm(s)));
        expect(withSeam.widthAtStation).toBe(without.widthAtStation);
        if (withSeam.railEdge < without.railEdge) {
          earlier++;
          expect(withSeam.railEdge).toBe(litresEdge);
          // the straightedge still overhangs the rail the drawing now ends at
          expect(withSeam.straightedge.x2).toBeGreaterThan(withSeam.cx + withSeam.railEdge * withSeam.kx);
        }
      }
      expect(ended, `${id} · ${name}: sections the litres end early`).toBeGreaterThan(0);
      expect(earlier, `${id} · ${name}: drawings that used to run past the litres' edge`).toBeGreaterThan(0);
    }
  });
});

describe("the section's gauges (D-13, D-30)", () => {
  const t = byId("shortboard");
  const resolved = resolveBottom(bottomOf(t.board, OPENINGS.shortboard), t.board);
  const s = resolved.center.deepest;

  it("a flat station has no gauge", () => {
    const flat = resolveBottom(DEFAULT_BOTTOM, t.board);
    expect(sectionGauges(bottomSection(flat, t.board, s, 4, BOX_1280, { live: "center" }), flat, t.board, "imperial").filter((g) => g.kind !== "stringerLeft")).toEqual([]);
  });

  it.each(UNITS_SYSTEMS)("%s: the Deep Single at its Deepest reads the gap at the stringer, the one number there", (system) => {
    const sec = bottomSection(resolved, t.board, s, 4, BOX_1280, { live: "center" });
    const stringer = sectionGauges(sec, resolved, t.board, system).find((g) => g.kind === "stringer")!;
    expect(stringer.value).toBe(foamOff(resolved, t.board, s, mm(0)));
    expect(stringer.lines[0].y2 - stringer.lines[0].y1).toBeCloseTo(stringer.value * sec.ky, 9);
  });

  it("a value that would read 0 draws no gauge: under half a millimetre in Metric, under 1/32\" in Imperial", () => {
    for (const [depth, system, shows] of [
      [0.4, "metric", false],
      [0.6, "metric", true],
      [0.6, "imperial", false],
      [1.0, "imperial", true],
    ] as const) {
      const b = bottomOf(t.board, OPENINGS.shortboard);
      b.center = { ...b.center, depth: mm(depth) };
      const r = resolveBottom(b, t.board);
      const sec = bottomSection(r, t.board, r.center.deepest, 4, BOX_1280, { live: "center" });
      expect(sectionGauges(sec, r, t.board, system).some((g) => g.kind === "stringer")).toBe(shows);
      expect(gaugeReads(depth, system)).toBe(shows);
    }
    expect(gaugeReads(0, "imperial")).toBe(false);
  });

  it("the words go with the values from a 625-dot box: none in 600, all in 700", () => {
    const tailVee = resolveBottom(bottomOf(t.board, { center: "Deep Single Concave", tail: "Panel Vee" }), t.board);
    const at = mm(t.board.frontFins);
    for (const [width, words] of [[600, false], [700, true]] as const) {
      const gauges = sectionGauges(bottomSection(tailVee, t.board, at, 4, { width, height: 300 }, { live: "tail" }), tailVee, t.board, "imperial");
      expect(gauges.length).toBeGreaterThan(0);
      for (const g of gauges.filter((q) => q.kind === "railLift" || q.kind === "stringerLeft" || q.kind === "stringer")) expect(g.words).toBe(words);
    }
  });

  it("the rail lift reads beside the rail with room past it, under the straightedge without", () => {
    const vee = resolveBottom(bottomOf(t.board, { tail: "Panel Vee" }), t.board);
    // nearer the tail the board is narrow: room past the rail
    const back = bottomSection(vee, t.board, mm(t.board.frontFins), 4, BOX_1280, { live: "tail" });
    const roomBack = (DRAWING_WIDTH - (back.cx + back.railEdge * back.kx)) / back.px;
    const liftBack = sectionGauges(back, vee, t.board, "imperial").find((g) => g.kind === "railLift")!;
    expect(roomBack).toBeGreaterThan(GAUGE_BESIDE_ROOM.words);
    expect(liftBack.placement).toBe("beside");
    expect(liftBack.value).toBe(sectionsFoamOff(vee, t.board, back.station, t.board.railAt(back.station)));
    // a vee peaking at the wide point: no room past the rail there
    const atWide = { ...vee, tail: { ...vee.tail, start: t.board.length, deepest: t.board.widePoint } };
    const wide = bottomSection(atWide, t.board, t.board.widePoint, 4, BOX_1280, { live: "tail" });
    const roomWide = (DRAWING_WIDTH - (wide.cx + wide.railEdge * wide.kx)) / wide.px;
    expect(roomWide).toBeLessThan(GAUGE_BESIDE_ROOM.words);
    expect(sectionGauges(wide, atWide, t.board, "imperial").find((g) => g.kind === "railLift")!.placement).toBe("under");
    // in a box under 625 the room asked is 60 dots
    const small = bottomSection(vee, t.board, mm(t.board.frontFins), 4, { width: 560, height: 300 }, { live: "tail" });
    const roomSmall = (DRAWING_WIDTH - (small.cx + small.railEdge * small.kx)) / small.px;
    expect(sectionGauges(small, vee, t.board, "imperial").find((g) => g.kind === "railLift")!.placement).toBe(roomSmall > GAUGE_BESIDE_ROOM.bare ? "beside" : "under");
  });

  it("a double's trough and a channel's floor read on their own lines", () => {
    const dbl = resolveBottom(bottomOf(t.board, { center: "Early Double Concave" }), t.board);
    const atDouble = bottomSection(dbl, t.board, dbl.center.deepest, 4, BOX_1280, { live: "center" });
    const trough = sectionGauges(atDouble, dbl, t.board, "imperial").find((g) => g.kind === "trough");
    expect(trough).toBeDefined();
    expect(trough!.value).toBeGreaterThan(foamOff(dbl, t.board, dbl.center.deepest, mm(0)));
    const six = resolveBottom(bottomOf(t.board, {}, 6), t.board);
    const atChannels = bottomSection(six, t.board, six.channels.deepest, 4, BOX_1280, { live: "channels" });
    const floor = sectionGauges(atChannels, six, t.board, "imperial").find((g) => g.kind === "channel");
    expect(floor).toBeDefined();
    expect(floor!.value).toBeCloseTo(deepestCutAt(six, t.board, six.channels.deepest), 0);
  });
});

/*
 * The founder's answer of 2026-11-11 at his look at 17-21, "Match DATA": the section's rail-lift gauge reads what DATA's
 * Rail lift column reads — the vee's or belly's lift at the rail alone (`sectionsFoamOff` at `board.railAt`), held at
 * the slab's thickness as every gauge is. A channel is cut after the rail is shaped and never counts, even one that
 * runs out through the rail; a flat tail or a concave shows no rail lift. Every expected figure is DATA's own row and
 * the drawing's own scale (Rule 1).
 */
describe("the section's rail lift is the vee's or belly's alone, as DATA reads it (the founder, 2026-11-11: \"Match DATA\")", () => {
  const GAUGE_CUTS: [BottomSectionKey, BottomCutName][] = [
    ["tail", "Panel Vee"],
    ["tail", "Spiral Vee"],
    ["tail", "Rolled Vee"],
    ["tail", "Double Concave Exit"],
    ["tail", "Extending Single Concave"],
    ["center", "Continuous Belly / Rolled Mid"],
  ];
  const builtBoard = (fields: DesignSummaryFields): BottomBoard =>
    designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
  const cases: { label: string; fields: DesignSummaryFields }[] = phase17ChannelBoards().map((b) => ({ label: `p17 ${b.label}`, fields: b.fields }));
  const all16 = phase16Boards();
  for (const preset of BOARD_PRESETS) {
    for (const edge of ["hard", "soft"] as const) {
      const base = all16.find((b) => b.label === `${preset.id}|asis|${edge}`)!.fields;
      const board = builtBoard(base);
      for (const [section, name] of GAUGE_CUTS) {
        for (const count of [0, 4, 6, 8] as const) {
          let bottom: BoardBottom = pickCut(structuredClone(DEFAULT_BOTTOM), section, name, board);
          if (count > 0) bottom = { ...bottom, channels: startingChannels(count as ChannelCount, board, bottom.channels) };
          cases.push({ label: `${preset.id}|${edge}|${name}|${count}`, fields: { ...base, bottom } });
        }
      }
    }
  }

  function setUp(fields: DesignSummaryFields) {
    const board = builtBoard(fields);
    const resolved = resolveBottom(fields.bottom ?? DEFAULT_BOTTOM, board);
    return { board, resolved, rows: bottomDataRows(resolved, board) };
  }
  const railLifts = (drawing: SectionDrawing, resolved: ReturnType<typeof resolveBottom>, board: BottomBoard) =>
    sectionGauges(drawing, resolved, board, "imperial").filter((g) => g.kind === "railLift");

  it.each(cases.map((c) => [c.label, c] as const))("%s: at every DATA station the gauge is DATA's Rail lift, or none", (_label, c) => {
    const { board, resolved, rows } = setUp(c.fields);
    for (const row of rows) {
      const drawing = bottomSection(resolved, board, row.station, 4, BOX_1280, { live: "tail" });
      const want = Math.min(row.railLift, drawing.thickness);
      const lifts = railLifts(drawing, resolved, board);
      if (!gaugeReads(want, "imperial")) {
        expect(lifts, `${row.station}: no rail lift where DATA's reads none`).toEqual([]);
        continue;
      }
      expect(lifts, `${row.station}: one rail-lift gauge`).toHaveLength(1);
      expect(lifts[0].value).toBe(want);
      for (const line of lifts[0].lines) {
        expect(line.y2).toBeCloseTo(drawing.y0, 9);
        expect(line.y1).toBeCloseTo(drawing.y0 - want * drawing.ky, 9);
      }
    }
  }, 60_000);

  const tailOf = (label: string) => {
    const { board, resolved, rows } = setUp(phase17ChannelBoards().find((b) => b.label === label)!.fields);
    const tail = rows[0];
    expect(tail.label).toBe("tail");
    const drawing = bottomSection(resolved, board, tail.station, 4, BOX_1280, { live: "tail" });
    const drawnGap = Math.min(foamOff(resolved, board, tail.station, drawing.railEdge), drawing.thickness);
    return { board, resolved, drawing, drawnGap };
  };

  it("the Fish, flat tail, eight channels, at the tail: the channel at the rail would read as a gauge, and no rail lift is drawn", () => {
    const { board, resolved, drawing, drawnGap } = tailOf("fish|hard|flat|8");
    expect(gaugeReads(drawnGap, "imperial"), "the drawn gap at the rail edge reads (non-vacuity)").toBe(true);
    expect(railLifts(drawing, resolved, board)).toEqual([]);
  });

  it("the Fish, Rolled Vee, eight channels, at the tail: the rail lift reads the vee alone, below the drawn gap", () => {
    const { board, resolved, drawing, drawnGap } = tailOf("fish|hard|rolled-vee|8");
    const lifts = railLifts(drawing, resolved, board);
    expect(lifts).toHaveLength(1);
    expect(lifts[0].value).toBeLessThan(drawnGap);
  });
});

describe("the section's ruler (D-14, D-30)", () => {
  const t = byId("shortboard");

  it("nothing in a 500-dot box, bare ticks in 560, the caption from 625; its ticks are DATA's marks for the live cut", () => {
    const resolved = resolveBottom(bottomOf(t.board, { center: "Early Double Concave" }), t.board);
    const s = resolved.center.deepest;
    const ruler = (width: number, system: "imperial" | "metric" = "imperial") =>
      sectionRuler(bottomSection(resolved, t.board, s, 4, { width, height: 300 }, { live: "center" }), resolved, t.board, "center", system, measureValue);
    expect(ruler(500)).toBeNull();
    expect(ruler(560)!.caption).toBeNull();
    expect(ruler(700)!.caption).toBe("OFF THE STRINGER");
    expect(ruler(700, "metric")!.caption).toBe("OFF THE STRINGER · mm");
    const { columns, rows } = bottomLayoutMarks(resolved, t.board, [s]);
    const expected = columns.map((c, q) => ({ column: c.key, across: rows[0].cells[q] })).filter((m) => m.across !== null && m.column.startsWith("center:"));
    const ticks = ruler(700)!.ticks;
    expect(ticks.map((k) => [k.column, k.across]).sort()).toEqual(expected.map((m) => [m.column, m.across]).sort());
    for (const k of ticks) expect(k.text).toBe(formatMarkBare(k.across, "imperial"));
    // with no live cut, or a live flat, no ruler
    expect(sectionRuler(bottomSection(resolved, t.board, s, 4, BOX_1280, { live: "tail" }), resolved, t.board, "tail", "imperial", measureValue)).toBeNull();
  });

  it("a channel wall appears on the ruler only past its own channel's start", () => {
    const six = resolveBottom(bottomOf(t.board, {}, 6), t.board);
    const ch = six.channels;
    // between the outer wall's start and the inner wall's start, only the outer channels have begun
    const between = mm((channelStart(ch, 0) + channelStart(ch, 2)) / 2);
    const r = sectionRuler(bottomSection(six, t.board, between, 4, BOX_1280, { live: "channels" }), six, t.board, "channels", "imperial", measureValue)!;
    expect(r.ticks.map((k) => k.column)).toContain(channelWallKey(3));
    expect(r.ticks.map((k) => k.column)).not.toContain(channelWallKey(1));
  });

  it("values that would touch take the second row", () => {
    const six = resolveBottom(bottomOf(t.board, {}, 8), t.board);
    const r = sectionRuler(bottomSection(six, t.board, six.channels.deepest, 4, { width: 560, height: 300 }, { live: "channels" }), six, t.board, "channels", "imperial", (text) => text.length * 20)!;
    expect(r.ticks.some((k) => k.row === 1)).toBe(true);
  });
});

describe("the ghost (D-13, research §C)", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: the ghost is the station's own bottomed ring from boardSections", (_id, t) => {
    const bottom = bottomOf(t.board, OPENINGS[t.id]);
    const s = t.board.widePoint;
    const sections = sectionsOf(t, bottom, [s]);
    const ring = ghostRail(sections, s)!;
    expect(ring).toBe(sections[0].drawn ?? sections[0].blended);
    expect(ring.length).toBeGreaterThan(10);
    const path = ghostRailPath(ring, bottomSection(resolveBottom(bottom, t.board), t.board, s, 4, BOX_1280, { live: "center" }));
    expect(path.match(/M/g)).toHaveLength(2);
  });
});

describe("the GUIDE cartoons (D-17)", () => {
  const t = byId("shortboard");
  const keys: GuideCartoonKey[] = [
    ...BOTTOM_SECTIONS.flatMap((section) => BOTTOM_CUT_NAMES[section].map((name) => ({ section, name }) as GuideCartoonKey)),
    { section: "channels" },
  ];

  it.each(keys.map((k) => ["name" in k ? k.name : "Channels", k] as const))("%s: one cut alone at its starting numbers, the section where it is deepest", (_n, key) => {
    const cartoon = guideCartoon(key, t.board, t.geometry);
    const alone = cutAlone(key, t.board);
    expect(cartoon.viewBox).toBe("0 0 300 154");
    if (key.section === "channels") {
      expect(alone.channels.count).toBe(6);
      for (const section of BOTTOM_SECTIONS) expect(alone[section].kind).toBe("flat");
    } else {
      expect(alone[key.section].name).toBe(key.name);
      expect(alone[key.section]).toEqual(resolveCut(key.section, startingCut(key.section, key.name, t.board), t.board));
      for (const other of BOTTOM_SECTIONS.filter((q) => q !== key.section)) expect(alone[other].kind).toBe("flat");
      expect(alone.channels.count).toBe(0);
    }
    const cut = key.section === "channels" ? alone.channels : alone[key.section];
    const on = key.section === "channels" || (alone[key.section].kind !== "flat" && alone[key.section].depth > 0);
    const clear = inchesToMm(3);
    expect(cartoon.station).toBeCloseTo(on ? Math.max(clear, Math.min(t.board.length - clear, cut.deepest)) : t.board.widePoint, 9);
    expect(cartoon.shade.length > 0).toBe(on);
    expect(cartoon.section.pieces.length).toBeGreaterThan(0);
  });

  it("the five vees draw five different sections", () => {
    const vees: GuideCartoonKey[] = [
      { section: "nose", name: "Reverse Vee Nose" },
      { section: "center", name: "Tri-Plane Hull Center" },
      { section: "tail", name: "Panel Vee" },
      { section: "tail", name: "Spiral Vee" },
      { section: "tail", name: "Rolled Vee" },
    ];
    const profiles = vees.map((k) => guideCartoon(k, t.board, t.geometry).section.pieces.join(""));
    expect(new Set(profiles).size).toBe(5);
  });

  it("the channels' card draws six channels: three walls a side", () => {
    const cartoon = guideCartoon({ section: "channels" }, t.board, t.geometry);
    const walls = bottomPencilLines(cutAlone({ section: "channels" }, t.board), t.board, "channels").filter((l) => l.kind === "wall");
    expect(walls).toHaveLength(3);
    expect(cartoon.pencil.match(/M/g)!.length).toBe(walls.flatMap((w) => w.runs).length);
  });

  it("a deep cut's section is fitted at ×8 when it would leave the card", () => {
    const lb = byId("longboard");
    const belly = guideCartoon({ section: "center", name: "Continuous Belly / Rolled Mid" }, lb.board, lb.geometry);
    expect(belly.section.heightDrawn).toBeLessThanOrEqual(8 + 1e-9);
    expect(belly.section.fitted).toBe(belly.section.heightDrawn < 8 - 1e-9);
  });
});
