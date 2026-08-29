import { describe, expect, it } from "vitest";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "./fins";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil } from "./foil";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { ROCKER_LIFT_RANGE_IN, sampleRocker } from "./rocker";
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

  it.each(BOARD_PRESETS)("$id: carries a rocker with all four lift keys and a foil with all five thickness keys, each finite", (preset) => {
    for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
      expect(Number.isFinite(preset.rocker[key])).toBe(true);
    }
    for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
      expect(Number.isFinite(preset.foil[key])).toBe(true);
    }
  });

  it.each(BOARD_PRESETS)("$id: every rocker lift sits inside ROCKER_LIFT_RANGE_IN and every foil thickness inside FOIL_THICKNESS_RANGE_IN", (preset) => {
    for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
      const lift = mmToInches(preset.rocker[key]);
      expect(lift).toBeGreaterThanOrEqual(ROCKER_LIFT_RANGE_IN.min);
      expect(lift).toBeLessThanOrEqual(ROCKER_LIFT_RANGE_IN.max);
    }
    for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
      const thickness = mmToInches(preset.foil[key]);
      expect(thickness).toBeGreaterThanOrEqual(FOIL_THICKNESS_RANGE_IN.min);
      expect(thickness).toBeLessThanOrEqual(FOIL_THICKNESS_RANGE_IN.max);
    }
  });

  it.each(BOARD_PRESETS)("$id: nose-tip lift exceeds tail-tip lift — every board carries more nose rocker than tail rocker", (preset) => {
    expect(preset.rocker.noseTip).toBeGreaterThan(preset.rocker.tailTip);
  });

  it.each(BOARD_PRESETS)("$id: nose-12in lift exceeds tail-12in lift, and both are below their own tip's lift", (preset) => {
    expect(preset.rocker.nose12).toBeGreaterThan(preset.rocker.tail12);
    expect(preset.rocker.nose12).toBeLessThan(preset.rocker.noseTip);
    expect(preset.rocker.tail12).toBeLessThan(preset.rocker.tailTip);
  });

  it.each(BOARD_PRESETS)("$id: the centre is the thickest foil station, and each tip is thinner than the 12in station beside it", (preset) => {
    expect(preset.foil.center).toBeGreaterThan(preset.foil.nose12);
    expect(preset.foil.center).toBeGreaterThan(preset.foil.tail12);
    expect(preset.foil.noseTip).toBeLessThan(preset.foil.nose12);
    expect(preset.foil.tailTip).toBeLessThan(preset.foil.tail12);
  });

  it("the four presets differ from one another: no two share an identical rocker object or an identical foil object", () => {
    const rockers = BOARD_PRESETS.map((p) => JSON.stringify(p.rocker));
    const foils = BOARD_PRESETS.map((p) => JSON.stringify(p.foil));
    expect(new Set(rockers).size).toBe(rockers.length);
    expect(new Set(foils).size).toBe(foils.length);
  });

  it("the Fish's centre thickness divided by its length exceeds the Shortboard's — a fish is proportionally thicker", () => {
    const fish = BOARD_PRESETS.find((p) => p.id === "fish")!;
    const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    const fishRatio = fish.foil.center / fish.outline.length;
    const shortboardRatio = shortboard.foil.center / shortboard.outline.length;
    expect(fishRatio).toBeGreaterThan(shortboardRatio);
  });

  it("the Longboard's nose-tip lift exceeds the Shortboard's — a longboard carries more nose lift", () => {
    const longboard = BOARD_PRESETS.find((p) => p.id === "longboard")!;
    const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    expect(longboard.rocker.noseTip).toBeGreaterThan(shortboard.rocker.noseTip);
  });

  it.each(BOARD_PRESETS)("$id: sampleRocker and sampleFoil run over the preset at its own length without a fold-back or a negative thickness", (preset) => {
    const { length } = preset.outline;
    const samples = 40;
    // The rocker line dips to zero at the centre by definition (D-05) — it is a V shape from the
    // tail tip down to zero and back up to the nose tip, not monotone across the whole board — so
    // "no fold-back" here means every sample stays finite and inside a sane envelope (no spline
    // overshoot past the drafted lift plus a small tolerance), not that lift is non-decreasing.
    const maxLiftIn = Math.max(
      mmToInches(preset.rocker.noseTip),
      mmToInches(preset.rocker.tailTip),
    );
    for (let i = 0; i <= samples; i++) {
      const stationIn = (mmToInches(length) * i) / samples;
      const station = inchesToMm(stationIn);
      const rockerIn = mmToInches(sampleRocker(preset.rocker, length, station));
      const foilIn = mmToInches(sampleFoil(preset.foil, length, station));
      expect(Number.isFinite(rockerIn)).toBe(true);
      expect(Number.isFinite(foilIn)).toBe(true);
      expect(foilIn).toBeGreaterThan(0);
      expect(rockerIn).toBeGreaterThanOrEqual(-1e-6);
      expect(rockerIn).toBeLessThanOrEqual(maxLiftIn + 1e-6);
    }
  });
});
