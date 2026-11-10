import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { guideFigure, GUIDE_MIN_FIT, guideText, type GuideFigure, type GuidePrim } from "./guide-card";
import {
  GUIDE_HDIM_LABEL_OFF,
  GUIDE_STRIP_BAND,
  GUIDE_STRIP_MARGIN,
  GUIDE_TICK_REACH,
  GUIDE_VDIM_LABEL_OFF,
  guideDetailBox,
  guideDimTicks,
  guideFigureBounds,
  guideHalfWidthAt,
  guideHDim,
  guideInkBox,
  guideLabelCrossings,
  guideLabelHull,
  guideLabelOverlaps,
  guideLabelsInShapes,
  guidePointInShape,
  guideShapes,
  guideStrokeMeetsBox,
  guideStrokes,
  guideOutlinePath,
  guidePlanPrims,
  guideSectionPath,
  guideStripFit,
  guideStripInset,
  guideTextBox,
  guideVDim,
  guideWindowFit,
  guideX,
  guideY,
  type GuideWindowSpec,
} from "./guide-draw";
import { GUIDE_FRAME } from "./guide-push";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { mm } from "./units";

const STRIP_H = 60;

function insideBox(r: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const e = 1e-9;
  return r.x >= b.x - e && r.y >= b.y - e && r.x + r.w <= b.x + b.w + e && r.y + r.h <= b.y + b.h + e;
}

describe("guideStripFit", () => {
  it("fits every preset nose left inside the 284-wide band and the strip's height", () => {
    for (const preset of BOARD_PRESETS) {
      const g = buildOutline(preset.outline);
      const map = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
      const nose = guideX(map, g.length);
      const tail = guideX(map, 0);
      expect(nose, preset.id).toBeLessThan(tail);
      expect(nose).toBeGreaterThanOrEqual(GUIDE_STRIP_MARGIN - 1e-9);
      expect(tail).toBeLessThanOrEqual(GUIDE_STRIP_MARGIN + GUIDE_STRIP_BAND + 1e-9);
      expect(guideY(map, g.halfWidePointWidth) - guideY(map, -g.halfWidePointWidth)).toBeLessThanOrEqual(STRIP_H - 12 + 1e-9);
    }
  });
});

describe("guideWindowFit keeps every window rectangle inside the strip's 3-unit inset box (UI-SPEC §12)", () => {
  for (const id of ["shortboard", "fish", "longboard"] as const) {
    it(`on the ${id}: a whole-board window and a window at either tip`, () => {
      const preset = BOARD_PRESETS.find((p) => p.id === id)!;
      const g = buildOutline(preset.outline);
      const L = g.length;
      const hw = g.halfWidePointWidth;
      const strip = guideStripFit(L, mm(2 * hw), STRIP_H);
      const box = guideDetailBox(STRIP_H, 100);
      const f = GUIDE_FRAME.template;
      const windows: GuideWindowSpec[] = [
        { s0: -f.margin, s1: L + f.margin, across: hw + f.wholeAcross },
        { s0: L - f.tipSpan, s1: L + f.margin, across: guideHalfWidthAt(g.points, L - f.tipSpan) + f.tipAcross },
        { s0: -f.margin, s1: f.tipSpan, across: guideHalfWidthAt(g.points, f.tipSpan) + f.tailAcross },
        { s0: 0, s1: L, across: hw, half: true },
      ];
      for (const win of windows) {
        const { rect, map } = guideWindowFit(win, strip, box, { stripHeight: STRIP_H });
        expect(insideBox(rect, guideStripInset(STRIP_H)), JSON.stringify(win)).toBe(true);
        expect(rect.w).toBeGreaterThan(0);
        // The window's ends land inside the detail box.
        for (const s of [win.s0, win.s1]) {
          expect(guideX(map, s)).toBeGreaterThanOrEqual(box.x - 1e-6);
          expect(guideX(map, s)).toBeLessThanOrEqual(box.x + box.w + 1e-6);
        }
      }
    });
  }

  it("a whole-board window takes the strip's own inset box top to bottom, and covers the whole board", () => {
    const g = buildOutline(BOARD_PRESETS[0].outline);
    const strip = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
    const { rect } = guideWindowFit(
      { s0: -GUIDE_FRAME.volume.planMargin, s1: g.length + GUIDE_FRAME.volume.planMargin, across: g.halfWidePointWidth + GUIDE_FRAME.volume.planAcross },
      strip,
      guideDetailBox(STRIP_H, 100),
      { stripHeight: STRIP_H },
    );
    const inset = guideStripInset(STRIP_H);
    expect(rect.y).toBe(inset.y);
    expect(rect.h).toBe(inset.h);
    expect(rect.x).toBeLessThan(guideX(strip, g.length));
    expect(rect.x + rect.w).toBeGreaterThan(guideX(strip, 0));
  });
});

describe("guideHalfWidthAt and guideOutlinePath", () => {
  const g = buildOutline(BOARD_PRESETS[0].outline);

  it("reads the outline's own points and nothing beyond the nose", () => {
    const p = g.points[Math.floor(g.points.length / 2)];
    expect(guideHalfWidthAt(g.points, p.station)).toBeCloseTo(p.halfWidth, 9);
    expect(guideHalfWidthAt(g.points, g.length + 100)).toBe(0);
    expect(guideHalfWidthAt(g.points, -10)).toBe(g.points[0].halfWidth);
  });

  it("closes both rails into one path", () => {
    const map = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
    const d = guideOutlinePath(g.points, map, g.centreCloseStation);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.split("L").length).toBe(2 * g.points.length);
    const prims = guidePlanPrims(g, map);
    expect(prims.map((p) => (p.kind === "path" || p.kind === "line" ? p.role : p.kind))).toEqual(["board", "stringer"]);
    expect(guidePlanPrims(g, map, "push").length).toBe(1);
  });

  it("mirrors a rail into a whole cross-section", () => {
    const rail = [
      { x: mm(-100), y: mm(50) },
      { x: mm(0), y: mm(25) },
      { x: mm(-100), y: mm(0) },
    ];
    const map = { k: 1, kx: 1, ky: -1, ox: 150, oy: 100 };
    const d = guideSectionPath(rail, 200, map);
    expect(d).toBe("M150 50L250 50L350 75L250 100L50 100L-50 75L50 50Z");
  });
});

describe("dimensions and labels", () => {
  it("place a vertical dimension's label beside it and a horizontal one's above or below", () => {
    const v = guideVDim(100, 80, 40, [guideFigure('2 1/4"')]);
    expect(v).toMatchObject({ kind: "dim", y1: 40, y2: 80, lx: 100 + GUIDE_VDIM_LABEL_OFF, ly: 60, anchor: "start" });
    const h = guideHDim(200, 50, 90, [guideFigure('6\'2"')], false);
    expect(h).toMatchObject({ kind: "dim", x1: 50, x2: 200, lx: 125, ly: 90 + GUIDE_HDIM_LABEL_OFF, anchor: "middle" });
  });

  it("keeps a dimension's own label off its own end ticks, at every text size", () => {
    const dims = [
      guideVDim(100, 80, 40, [guideFigure('2 1/4"')]),
      guideVDim(100, 80, 40, [guideFigure('2 1/4"')], "left"),
      guideVDim(100, 46, 40, [guideFigure("6 mm")]),
      guideHDim(200, 50, 90, [guideFigure('6\'2"')]),
      guideHDim(200, 50, 90, [guideFigure('6\'2"')], false),
      guideHDim(60, 50, 90, [guideFigure("305 mm")], false),
      guideHDim(60, 50, 90, [guideFigure("305 mm")], true, "start"),
    ];
    for (const dim of dims) {
      for (const fit of [GUIDE_MIN_FIT, 0.79, 1, 1.26]) {
        const figure: GuideFigure = { height: 200, strip: [dim], windows: [] };
        expect(guideLabelCrossings(figure, fit), JSON.stringify(dim)).toEqual([]);
      }
    }
  });

  it("estimates a label's box at 10 screen dots whatever the fit", () => {
    const label: GuidePrim = { kind: "text", role: "value", x: 100, y: 50, parts: [guideText("ABCDE")], anchor: "start" };
    const atOne = guideTextBox(label, 1)!;
    const atHalf = guideTextBox(label, 0.5)!;
    expect(atOne.h).toBeCloseTo(10, 9);
    expect(atOne.w).toBeCloseTo(5 * 0.62 * 10, 9);
    expect(atHalf.h).toBeCloseTo(20, 9);
    expect(guideTextBox({ kind: "line", role: "board", x1: 0, y1: 0, x2: 1, y2: 1 }, 1)).toBeNull();
  });

  it("lists overlapping labels and labels that leave their window", () => {
    const box = { x: 8, y: 66, w: 284, h: 100 };
    const figure: GuideFigure = {
      height: 166,
      strip: [],
      windows: [
        {
          box,
          prims: [
            { kind: "text", role: "value", x: 20, y: 100, parts: [guideText("one")], anchor: "start" },
            { kind: "text", role: "value", x: 24, y: 102, parts: [guideText("two")], anchor: "start" },
            { kind: "text", role: "value", x: 200, y: 140, parts: [guideText("far")], anchor: "start" },
            { kind: "text", role: "value", x: 290, y: 140, parts: [guideText("out of the box")], anchor: "start" },
          ],
        },
      ],
    };
    expect(guideLabelOverlaps(figure, 1)).toEqual([
      [0, 1],
      [3, -1],
    ]);
  });

  it("bounds a figure by everything it draws", () => {
    const figure: GuideFigure = {
      height: 100,
      strip: [{ kind: "path", role: "board", d: "M10 20L30 40Z" }],
      windows: [{ box: { x: 8, y: 50, w: 100, h: 40 }, prims: [{ kind: "line", role: "push", x1: 0, y1: 60, x2: 5, y2: 95 }] }],
    };
    expect(guideFigureBounds(figure)).toEqual({ x: 0, y: 20, w: 108, h: 75 });
  });
});

describe("a label and the lines around it", () => {
  const label = (x: number, y: number, text: string): GuidePrim => ({ kind: "text", role: "value", x, y, parts: [guideText(text)], anchor: "start" });

  it("draws a dimension's end tick the size the viewers draw theirs", () => {
    const source = readFileSync(join(__dirname, "../../components/viewer/callout-primitives.tsx"), "utf8");
    const size = /export const CALLOUT_TICK_SIZE = (\d+(?:\.\d+)?);/.exec(source);
    expect(size).not.toBeNull();
    expect(GUIDE_TICK_REACH).toBe(Number(size![1]));
  });

  it("gives a dimension two 45° slashes, one through each end", () => {
    const dim = guideHDim(50, 200, 90, [guideFigure('6\'2"')]);
    if (dim.kind !== "dim") throw new Error("not a dimension");
    expect(guideDimTicks(dim)).toEqual([
      { x1: 46, y1: 94, x2: 54, y2: 86, by: "tick", faint: false },
      { x1: 196, y1: 94, x2: 204, y2: 86, by: "tick", faint: false },
    ]);
  });

  it("reads every drawn line as straight pieces: a path's runs, a closed run's last side, a rectangle, a dimension and its ticks", () => {
    const strokes = guideStrokes([
      { kind: "path", role: "board", d: "M0 0L10 0L10 10ZM20 20L30 20" },
      { kind: "path", role: "railFill", d: "M0 0L10 0L10 10Z" },
      { kind: "line", role: "baseline", x1: 0, y1: 50, x2: 100, y2: 50 },
      { kind: "rect", role: "window", x: 0, y: 0, w: 10, h: 5 },
      guideHDim(50, 200, 90, [guideFigure("1")]),
    ]);
    // Three sides of the triangle and one open piece; nothing for the fill; one baseline; four sides; a line and two ticks.
    expect(strokes.map((s) => s.by)).toEqual([
      "board", "board", "board", "board",
      "baseline",
      "window", "window", "window", "window",
      "dimension", "tick", "tick",
    ]);
    expect(strokes[2]).toMatchObject({ x1: 10, y1: 10, x2: 0, y2: 0 });
    expect(strokes.filter((s) => s.faint).map((s) => s.by)).toEqual(["baseline"]);
  });

  it("knows whether a straight piece passes through a box, and how near counts", () => {
    const box = { x: 10, y: 10, w: 20, h: 10 };
    expect(guideStrokeMeetsBox({ x1: 0, y1: 15, x2: 40, y2: 15 }, box)).toBe(true);
    expect(guideStrokeMeetsBox({ x1: 0, y1: 0, x2: 40, y2: 30 }, box)).toBe(true);
    expect(guideStrokeMeetsBox({ x1: 12, y1: 12, x2: 14, y2: 14 }, box)).toBe(true);
    expect(guideStrokeMeetsBox({ x1: 0, y1: 22, x2: 40, y2: 22 }, box)).toBe(false);
    expect(guideStrokeMeetsBox({ x1: 0, y1: 22, x2: 40, y2: 22 }, box, 2.5)).toBe(true);
    expect(guideStrokeMeetsBox({ x1: 0, y1: 15, x2: 8, y2: 15 }, box)).toBe(false);
    expect(guideStrokeMeetsBox({ x1: 5, y1: 0, x2: 5, y2: 40 }, box)).toBe(false);
  });

  it("measures a label's ink shorter than its line of text, and deeper for a letter with a tail", () => {
    const plain = guideInkBox(label(100, 50, "12 mm"), 1)!;
    const tailed = guideInkBox(label(100, 50, "by eye"), 1)!;
    const text = guideTextBox(label(100, 50, "12 mm"), 1)!;
    expect(plain.y).toBeCloseTo(text.y + 0.3, 9);
    expect(plain.h).toBeCloseTo(7.2, 9);
    expect(tailed.h).toBeCloseTo(9.5, 9);
    expect(guideInkBox({ kind: "line", role: "board", x1: 0, y1: 0, x2: 1, y2: 1 }, 1)).toBeNull();
  });

  it("gives a label the room it takes at any text size: its biggest ink, stretched to where it is hung from", () => {
    const hung = guideHDim(50, 200, 90, [guideFigure("305")], false);
    const hull = guideLabelHull(hung)!;
    for (const fit of [GUIDE_MIN_FIT, 0.79, 1, 1.26]) {
      const ink = guideInkBox(hung, fit)!;
      expect(ink.y).toBeGreaterThanOrEqual(hull.y - 1e-9);
      expect(ink.y + ink.h).toBeLessThanOrEqual(hull.y + hull.h + 1e-9);
    }
    expect(hull.y).toBeCloseTo(90 + GUIDE_HDIM_LABEL_OFF, 9);
  });

  it("lists a label lying on a drawn line, says which line, and tells a faint line from an inked one", () => {
    const figure: GuideFigure = {
      height: 200,
      strip: [
        { kind: "line", role: "board", x1: 0, y1: 47, x2: 300, y2: 47 },
        { kind: "line", role: "baseline", x1: 0, y1: 146, x2: 300, y2: 146 },
        label(100, 50, "on the board"),
        label(100, 100, "in the clear"),
        label(100, 150, "on the baseline"),
      ],
      windows: [{ box: { x: 0, y: 160, w: 300, h: 40 }, prims: [label(100, 50, "other window")] }],
    };
    expect(guideLabelCrossings(figure, 1)).toEqual([
      { text: "on the board", by: "board", faint: false, where: "strip" },
      { text: "on the baseline", by: "baseline", faint: true, where: "strip" },
    ]);
  });

  it("finds each closed outline of a path, and whether a point is inside one", () => {
    const shapes = guideShapes([
      { kind: "path", role: "board", d: "M0 0L100 0L100 40L0 40ZM200 0L260 0L260 40Z" },
      { kind: "path", role: "push", d: "M0 60L100 60L100 80" },
      { kind: "line", role: "board", x1: 0, y1: 0, x2: 1, y2: 1 },
    ]);
    expect(shapes.map((s) => [s.role, s.points.length])).toEqual([
      ["board", 4],
      ["board", 3],
    ]);
    expect(guidePointInShape(50, 20, shapes[0])).toBe(true);
    expect(guidePointInShape(150, 20, shapes[0])).toBe(false);
    expect(guidePointInShape(250, 10, shapes[1])).toBe(true);
    expect(guidePointInShape(210, 30, shapes[1])).toBe(false);
  });

  it("lists a label drawn inside a board, by its centre or a corner, and none drawn beside it", () => {
    const board: GuidePrim = { kind: "path", role: "board", d: "M0 40L300 40L300 80L0 80Z" };
    const figure: GuideFigure = {
      height: 200,
      strip: [board, label(100, 65, "inside"), label(100, 30, "above"), label(100, 84, "a corner in")],
      windows: [{ box: { x: 0, y: 100, w: 300, h: 60 }, prims: [label(100, 65, "another window's")] }],
    };
    expect(guideLabelsInShapes(figure, 1)).toEqual([
      { text: "inside", in: "board", where: "strip" },
      { text: "a corner in", in: "board", where: "strip" },
    ]);
  });
});

