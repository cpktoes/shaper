import { describe, expect, it } from "vitest";
import { buildOutline } from "./outline";
import { computeOverviewDrawingBox, computeOverviewOutlineScale } from "./overview-layout";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm } from "./units";

describe("computeOverviewOutlineScale", () => {
  it.each(BOARD_PRESETS)(
    "$id: scales the outline to fit inside the box on both axes, with no distortion",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const drawWidthMm = 150;
      const drawHeightMm = 250;

      const scale = computeOverviewOutlineScale(geometry, drawWidthMm, drawHeightMm);

      const boardWidthMm = geometry.halfWidePointWidth * 2;
      expect(boardWidthMm * scale).toBeLessThanOrEqual(drawWidthMm + 1e-9);
      expect(geometry.length * scale).toBeLessThanOrEqual(drawHeightMm + 1e-9);
    },
  );

  it("picks the width-bound scale for a wide, short box (long board, narrow box)", () => {
    // A long, narrow board (length dominates) inside a wide-but-short box: height is the
    // binding constraint.
    const geometry = buildOutline({
      ...BOARD_PRESETS[0].outline,
      length: inchesToMm(108),
      widePointWidth: inchesToMm(16),
    });

    const scale = computeOverviewOutlineScale(geometry, 300, 100);

    // Height-bound: scale * length should land exactly on the height budget.
    expect(geometry.length * scale).toBeCloseTo(100, 6);
    expect(geometry.halfWidePointWidth * 2 * scale).toBeLessThan(300);
  });

  it("picks the height-bound scale for a tall, narrow box (wide board, narrow box)", () => {
    // A short, wide board inside a tall-but-narrow box: width is the binding constraint.
    const geometry = buildOutline({
      ...BOARD_PRESETS[0].outline,
      length: inchesToMm(66),
      widePointWidth: inchesToMm(25),
    });

    const scale = computeOverviewOutlineScale(geometry, 100, 400);

    expect(geometry.halfWidePointWidth * 2 * scale).toBeCloseTo(100, 6);
    expect(geometry.length * scale).toBeLessThan(400);
  });

  it("scales up a small box's worth of board to exactly fill the tighter axis (never leaves it short)", () => {
    const geometry = buildOutline(BOARD_PRESETS[0].outline);
    const scale = computeOverviewOutlineScale(geometry, 120, 200);
    const boardWidthMm = geometry.halfWidePointWidth * 2;
    const widthFill = boardWidthMm * scale;
    const heightFill = geometry.length * scale;
    // Exactly one axis is flush with its own budget — the definition of "largest scale that fits".
    const flushWidth = Math.abs(widthFill - 120) < 1e-6;
    const flushHeight = Math.abs(heightFill - 200) < 1e-6;
    expect(flushWidth || flushHeight).toBe(true);
  });
});

describe(
  'computeOverviewDrawingBox (round 3 post-checkpoint fix, defect 4: "the board can be larger on the page" — the spec column is short, so the drawing can claim more width and the full page height minus margins)',
  () => {
    it("subtracts the spec column, its gap, and both label reserves from the page width", () => {
      const box = computeOverviewDrawingBox(215.9, 279.4, 10, 60, 8, 41, 16, 40);
      // columnX0 = 10 + 60 + 8 = 78; columnWidth = 215.9 - 10 - 78 = 127.9
      expect(box.x0).toBeCloseTo(78 + 16, 6);
      expect(box.width).toBeCloseTo(127.9 - 16 - 40, 6);
    });

    it("reserves the full page height below drawingTopMm, down to the bottom margin", () => {
      const box = computeOverviewDrawingBox(215.9, 279.4, 10, 60, 8, 41, 16, 40);
      expect(box.height).toBeCloseTo(279.4 - 10 - 41, 6);
    });

    it("never returns a negative width or height when the reserves exceed the available space", () => {
      const box = computeOverviewDrawingBox(100, 100, 10, 60, 8, 90, 16, 40);
      expect(box.width).toBeGreaterThanOrEqual(0);
      expect(box.height).toBeGreaterThanOrEqual(0);
    });

    it.each(BOARD_PRESETS)(
      "$id: the reclaimed box (60mm spec column, 16/40mm label reserves) scales the outline up over the previous, cramped layout (85mm spec column, 24/36mm label reserves)",
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const newBox = computeOverviewDrawingBox(215.9, 279.4, 10, 60, 8, 41, 16, 40);
        const oldBox = computeOverviewDrawingBox(215.9, 279.4, 10, 85, 10, 41, 24, 36);

        const newScale = computeOverviewOutlineScale(geometry, newBox.width, newBox.height);
        const oldScale = computeOverviewOutlineScale(geometry, oldBox.width, oldBox.height);

        expect(newScale).toBeGreaterThan(oldScale);
      },
    );
  },
);
