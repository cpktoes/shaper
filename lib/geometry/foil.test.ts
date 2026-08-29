import { describe, expect, it } from "vitest";
import { DEFAULT_FOIL_SPEC, foilStationPoints, sampleFoil } from "./foil";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { DEFAULT_VOLUME_SPEC } from "./volume";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { inchesToMm, mm, mmToInches } from "./units";

const LENGTH = inchesToMm(72);

describe("sampleFoil", () => {
  it("returns each station's own thickness exactly at that station, all five including both tips", () => {
    expect(mmToInches(sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, mm(0)))).toBeCloseTo(
      mmToInches(DEFAULT_FOIL_SPEC.tailTip),
      6,
    );
    expect(mmToInches(sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, inchesToMm(12)))).toBeCloseTo(
      mmToInches(DEFAULT_FOIL_SPEC.tail12),
      6,
    );
    expect(mmToInches(sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, mm(LENGTH / 2)))).toBeCloseTo(
      mmToInches(DEFAULT_FOIL_SPEC.center),
      6,
    );
    expect(mmToInches(sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, mm(LENGTH - inchesToMm(12))))).toBeCloseTo(
      mmToInches(DEFAULT_FOIL_SPEC.nose12),
      6,
    );
    expect(mmToInches(sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, LENGTH))).toBeCloseTo(
      mmToInches(DEFAULT_FOIL_SPEC.noseTip),
      6,
    );
  });

  it("agrees with DEFAULT_RAIL_BAND_SPEC's three thicknesses exactly", () => {
    expect(DEFAULT_FOIL_SPEC.nose12).toBe(DEFAULT_RAIL_BAND_SPEC.nose.boardThickness);
    expect(DEFAULT_FOIL_SPEC.center).toBe(DEFAULT_RAIL_BAND_SPEC.center.boardThickness);
    expect(DEFAULT_FOIL_SPEC.tail12).toBe(DEFAULT_RAIL_BAND_SPEC.tail.boardThickness);
  });

  it("agrees with DEFAULT_VOLUME_SPEC's centre thickness exactly", () => {
    expect(DEFAULT_FOIL_SPEC.center).toBe(DEFAULT_VOLUME_SPEC.centerThickness);
  });

  it("never returns a negative thickness and never overshoots the station bounds when sampled densely", () => {
    const values = DEFAULT_FOIL_SPEC;
    const minStation = Math.min(values.tailTip, values.tail12, values.center, values.nose12, values.noseTip);
    const maxStation = Math.max(values.tailTip, values.tail12, values.center, values.nose12, values.noseTip);
    for (let i = 0; i <= 200; i++) {
      const station = mm((LENGTH * i) / 200);
      const thickness = sampleFoil(DEFAULT_FOIL_SPEC, LENGTH, station);
      expect(thickness).toBeGreaterThanOrEqual(0);
      expect(thickness).toBeGreaterThanOrEqual(minStation - 1e-6);
      expect(thickness).toBeLessThanOrEqual(maxStation + 1e-6);
    }
  });

  it("both tip thicknesses are strictly greater than zero", () => {
    expect(DEFAULT_FOIL_SPEC.noseTip).toBeGreaterThan(0);
    expect(DEFAULT_FOIL_SPEC.tailTip).toBeGreaterThan(0);
  });
});

describe("foilStationPoints", () => {
  it("returns five points in ascending station order for any board length in BOARD_LENGTH_RANGE_IN", () => {
    for (const lengthIn of [BOARD_LENGTH_RANGE_IN.min, 72, BOARD_LENGTH_RANGE_IN.max]) {
      const length = inchesToMm(lengthIn);
      const points = foilStationPoints(DEFAULT_FOIL_SPEC, length);
      expect(points).toHaveLength(5);
      for (let i = 1; i < points.length; i++) {
        expect(points[i].station).toBeGreaterThan(points[i - 1].station);
      }
    }
  });
});
