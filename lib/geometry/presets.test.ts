import { describe, expect, it } from "vitest";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { inchesToMm, mmToInches } from "./units";

describe("BOARD_PRESETS", () => {
  it("has exactly 4 entries with the four unique board-type ids", () => {
    expect(BOARD_PRESETS.length).toBe(4);
    const ids = BOARD_PRESETS.map((p) => p.id);
    expect(new Set(ids)).toEqual(new Set(["shortboard", "fish", "midlength", "longboard"]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BOARD_PRESETS)("$id: buildOutline() does not throw and returns non-empty points", (preset) => {
    let geometry: ReturnType<typeof buildOutline> | undefined;
    expect(() => {
      geometry = buildOutline(preset.outline);
    }).not.toThrow();
    expect(geometry?.points.length).toBeGreaterThan(0);
  });

  it.each(BOARD_PRESETS)("$id: every OutlineSpec field lies inside its OutlineControls slider range", (preset) => {
    const { outline } = preset;

    const lengthIn = mmToInches(outline.length);
    expect(lengthIn).toBeGreaterThanOrEqual(60);
    expect(lengthIn).toBeLessThanOrEqual(120);

    const widePointWidthIn = mmToInches(outline.widePointWidth);
    expect(widePointWidthIn).toBeGreaterThanOrEqual(16);
    expect(widePointWidthIn).toBeLessThanOrEqual(25);

    const widePointOffsetIn = mmToInches(outline.widePointOffset);
    expect(widePointOffsetIn).toBeGreaterThanOrEqual(-12);
    expect(widePointOffsetIn).toBeLessThanOrEqual(12);

    expect(outline.noseAngle).toBeGreaterThanOrEqual(35);
    expect(outline.noseAngle).toBeLessThanOrEqual(90);

    expect(outline.tailAngle).toBeGreaterThanOrEqual(30);
    expect(outline.tailAngle).toBeLessThanOrEqual(90);

    expect(outline.tailRailLength).toBeGreaterThanOrEqual(0);
    expect(outline.tailRailLength).toBeLessThanOrEqual(100);
    expect(outline.noseRailLength).toBeGreaterThanOrEqual(0);
    expect(outline.noseRailLength).toBeLessThanOrEqual(100);

    expect(outline.noseFullness).toBeGreaterThanOrEqual(0);
    expect(outline.noseFullness).toBeLessThanOrEqual(100);

    expect(outline.tailFullness).toBeGreaterThanOrEqual(0);
    expect(outline.tailFullness).toBeLessThanOrEqual(100);
  });

  it.each(BOARD_PRESETS)("$id: tail-shape fields lie inside their own slider ranges", (preset) => {
    const { tail } = preset.outline;

    switch (tail.kind) {
      case "squash":
      case "diamond":
      case "swallow": {
        const endWidthIn = mmToInches(tail.endWidth);
        expect(endWidthIn).toBeGreaterThanOrEqual(0);
        expect(endWidthIn).toBeLessThanOrEqual(16);
        break;
      }
      default:
        break;
    }

    if (tail.kind === "swallow") {
      const crotchDepthIn = mmToInches(tail.crotchDepth);
      expect(crotchDepthIn).toBeGreaterThanOrEqual(1);
      expect(crotchDepthIn).toBeLessThanOrEqual(8);
    }

    if (tail.kind === "diamond") {
      const depthIn = mmToInches(tail.depth);
      expect(depthIn).toBeGreaterThanOrEqual(1);
      expect(depthIn).toBeLessThanOrEqual(5);
    }
  });

  it.each(BOARD_PRESETS)("$id: length/widePointWidth/widePointOffset round-trip inchesToMm to within 1e-9in", (preset) => {
    const { outline } = preset;
    for (const value of [outline.length, outline.widePointWidth, outline.widePointOffset]) {
      const asInches = mmToInches(value);
      const roundTripped = mmToInches(inchesToMm(asInches));
      expect(Math.abs(roundTripped - asInches)).toBeLessThan(1e-9);
    }
  });

  it.each(BOARD_PRESETS)("$id: has non-empty name and descriptor copy", (preset) => {
    expect(preset.name.length).toBeGreaterThan(0);
    expect(preset.descriptor.length).toBeGreaterThan(0);
  });

  it.each(BOARD_PRESETS)("$id: carries a complete, structurally valid rails spec", (preset) => {
    expect(preset.rails).toEqual(DEFAULT_RAIL_BAND_SPEC);
    expect(() => computeRailBands(preset.rails)).not.toThrow();
  });

  it.each(BOARD_PRESETS)("$id: carries a complete, structurally valid fins spec", (preset) => {
    expect(preset.fins).toEqual(DEFAULT_FIN_PLACEMENT_SPEC);
  });
});
