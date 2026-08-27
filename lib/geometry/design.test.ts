import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_VOLUME_SPEC } from "./volume";
import { summarizeDesign } from "./design";

describe("summarizeDesign", () => {
  it.each(BOARD_PRESETS)("$id: reports the outline's own length and widepoint width unchanged", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(summary.length).toBe(preset.outline.length);
    expect(summary.widePointWidth).toBe(preset.outline.widePointWidth);
  });

  it.each(BOARD_PRESETS)("$id: reports the centre section's board thickness", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(summary.centerThickness).toBe(preset.rails.center.boardThickness);
  });

  it.each(BOARD_PRESETS)("$id: returns a finite, positive litres figure", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(Number.isFinite(summary.volumeLitres)).toBe(true);
    expect(summary.volumeLitres).toBeGreaterThan(0);
  });
});
