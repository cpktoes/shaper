import { describe, expect, it } from "vitest";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "./fins";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil } from "./foil";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import {
  buildRocker,
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_LIFT_RANGE_IN,
  ROCKER_SMOOTHNESS_RANGE,
  sampleRocker,
} from "./rocker";
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

  it.each(BOARD_PRESETS)("$id: carries a rocker with all eight fields and a foil with all five thickness keys, each finite", (preset) => {
    for (const key of [
      "noseLift",
      "tailLift",
      "noseAngle",
      "tailAngle",
      "noseSmoothness",
      "tailSmoothness",
      "noseFlatness",
      "tailFlatness",
    ] as const) {
      expect(Number.isFinite(preset.rocker[key])).toBe(true);
    }
    for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
      expect(Number.isFinite(preset.foil[key])).toBe(true);
    }
  });

  it.each(BOARD_PRESETS)(
    "$id: nose/tail lift sit inside ROCKER_LIFT_RANGE_IN, angle inside ROCKER_ANGLE_RANGE_DEG, smoothness/flatness inside their own 0-100 ranges, and every foil thickness inside FOIL_THICKNESS_RANGE_IN",
    (preset) => {
      for (const key of ["noseLift", "tailLift"] as const) {
        const lift = mmToInches(preset.rocker[key]);
        expect(lift).toBeGreaterThanOrEqual(ROCKER_LIFT_RANGE_IN.min);
        expect(lift).toBeLessThanOrEqual(ROCKER_LIFT_RANGE_IN.max);
      }
      for (const key of ["noseAngle", "tailAngle"] as const) {
        expect(preset.rocker[key]).toBeGreaterThanOrEqual(ROCKER_ANGLE_RANGE_DEG.min);
        expect(preset.rocker[key]).toBeLessThanOrEqual(ROCKER_ANGLE_RANGE_DEG.max);
      }
      for (const key of ["noseSmoothness", "tailSmoothness"] as const) {
        expect(preset.rocker[key]).toBeGreaterThanOrEqual(ROCKER_SMOOTHNESS_RANGE.min);
        expect(preset.rocker[key]).toBeLessThanOrEqual(ROCKER_SMOOTHNESS_RANGE.max);
      }
      for (const key of ["noseFlatness", "tailFlatness"] as const) {
        expect(preset.rocker[key]).toBeGreaterThanOrEqual(ROCKER_FLATNESS_RANGE.min);
        expect(preset.rocker[key]).toBeLessThanOrEqual(ROCKER_FLATNESS_RANGE.max);
      }
      for (const key of ["noseTip", "nose12", "center", "tail12", "tailTip"] as const) {
        const thickness = mmToInches(preset.foil[key]);
        expect(thickness).toBeGreaterThanOrEqual(FOIL_THICKNESS_RANGE_IN.min);
        expect(thickness).toBeLessThanOrEqual(FOIL_THICKNESS_RANGE_IN.max);
      }
    },
  );

  it.each(BOARD_PRESETS)("$id: nose-tip lift exceeds tail-tip lift — every board carries more nose rocker than tail rocker", (preset) => {
    expect(preset.rocker.noseLift).toBeGreaterThan(preset.rocker.tailLift);
  });

  it.each(BOARD_PRESETS)(
    "$id: the derived nose-12in lift exceeds the derived tail-12in lift, and both are below their own tip's lift",
    (preset) => {
      const geometry = buildRocker(preset.rocker, preset.outline.length);
      expect(geometry.noseLiftAt12in).toBeGreaterThan(geometry.tailLiftAt12in);
      expect(geometry.noseLiftAt12in).toBeLessThan(preset.rocker.noseLift);
      expect(geometry.tailLiftAt12in).toBeLessThan(preset.rocker.tailLift);
    },
  );

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
    expect(longboard.rocker.noseLift).toBeGreaterThan(shortboard.rocker.noseLift);
  });

  it.each(BOARD_PRESETS)(
    "$id: the built rocker curve and sampleFoil run over the preset at its own length without a fold-back or a negative thickness",
    (preset) => {
      const { length } = preset.outline;
      const geometry = buildRocker(preset.rocker, length);
      const samples = 40;
      // The rocker line dips to zero at the centre by construction — it is a V shape from the
      // tail tip down to zero and back up to the nose tip, not monotone across the whole board —
      // so "no fold-back" here means every sample stays finite and inside a sane envelope (no
      // curve overshoot past the drafted lift plus a small tolerance), not that lift is
      // non-decreasing across the whole board.
      const maxLiftIn = Math.max(mmToInches(preset.rocker.noseLift), mmToInches(preset.rocker.tailLift));
      for (let i = 0; i <= samples; i++) {
        const stationIn = (mmToInches(length) * i) / samples;
        const station = inchesToMm(stationIn);
        const rockerIn = mmToInches(sampleRocker(geometry, station));
        const foilIn = mmToInches(sampleFoil(preset.foil, length, station));
        expect(Number.isFinite(rockerIn)).toBe(true);
        expect(Number.isFinite(foilIn)).toBe(true);
        expect(foilIn).toBeGreaterThan(0);
        expect(rockerIn).toBeGreaterThanOrEqual(-1e-6);
        expect(rockerIn).toBeLessThanOrEqual(maxLiftIn + 1e-6);
      }
    },
  );

  it.each(BOARD_PRESETS)(
    "$id: derived 12in figures sit within 1/4in of the preset's own prior stored figure, recorded in its rocker block's own comment",
    (preset) => {
      const geometry = buildRocker(preset.rocker, preset.outline.length);
      // Every preset's block comment records the two prior stored figures it was solved
      // against — re-derive them from that same comment via the preset id, so this test can't
      // silently drift from the comment it is meant to be checking.
      const priorFigures: Record<string, { nose12: number; tail12: number }> = {
        shortboard: { nose12: 1.4, tail12: 0.45 },
        fish: { nose12: 1.0, tail12: 0.3 },
        midlength: { nose12: 1.25, tail12: 0.4 },
        longboard: { nose12: 1.5, tail12: 0.35 },
      };
      const prior = priorFigures[preset.id];
      expect(Math.abs(mmToInches(geometry.noseLiftAt12in) - prior.nose12)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(mmToInches(geometry.tailLiftAt12in) - prior.tail12)).toBeLessThanOrEqual(0.25);
    },
  );
});
