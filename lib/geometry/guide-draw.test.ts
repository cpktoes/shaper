import { describe, expect, it } from "vitest";
import { guideFigure, guideText, type GuideFigure, type GuidePrim } from "./guide-card";
import {
  GUIDE_STRIP_BAND,
  GUIDE_STRIP_MARGIN,
  guideDetailBox,
  guideFigureBounds,
  guideHalfWidthAt,
  guideHDim,
  guideLabelOverlaps,
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
    expect(v).toMatchObject({ kind: "dim", y1: 40, y2: 80, lx: 105, ly: 60, anchor: "start" });
    const h = guideHDim(200, 50, 90, [guideFigure('6\'2"')], false);
    expect(h).toMatchObject({ kind: "dim", x1: 50, x2: 200, lx: 125, ly: 93, anchor: "middle" });
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
