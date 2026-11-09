import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_SECTIONS,
  BOTTOM_SHADE_STEP,
  channelStart,
  DEFAULT_BOTTOM,
  foamOff,
  resolveBottom,
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
  bottomShadeBands,
  placeRailLabels,
  sectionOpeningStation,
  shadePathData,
  stationAtPointer,
  topViewFrame,
  topViewMap,
  topViewMarks,
  topViewX,
  TOP_VIEW_GRID,
  type ShadeRect,
} from "./bottom-draw";
import { formatBottomStation } from "./blank-reasons";
import type { DesignSummaryFields } from "./design";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import type { FinPlacementResult } from "./fins";
import { buildOutline, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS, type Mm } from "./units";

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
