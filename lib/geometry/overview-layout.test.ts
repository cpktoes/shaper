import { describe, expect, it } from "vitest";
import { buildOutline } from "./outline";
import { computeOverviewOutlineScale } from "./overview-layout";
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
