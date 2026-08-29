import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROCKER_SPEC,
  ROCKER_LIFT_RANGE_IN,
  rockerStationPoints,
  sampleRocker,
  type RockerSpec,
} from "./rocker";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { inchesToMm, mm, mmToInches } from "./units";

const LENGTH = inchesToMm(72);

describe("sampleRocker", () => {
  it("returns each station's own lift exactly at that station", () => {
    expect(mmToInches(sampleRocker(DEFAULT_ROCKER_SPEC, LENGTH, mm(0)))).toBeCloseTo(
      mmToInches(DEFAULT_ROCKER_SPEC.tailTip),
      6,
    );
    expect(mmToInches(sampleRocker(DEFAULT_ROCKER_SPEC, LENGTH, inchesToMm(12)))).toBeCloseTo(
      mmToInches(DEFAULT_ROCKER_SPEC.tail12),
      6,
    );
    expect(mmToInches(sampleRocker(DEFAULT_ROCKER_SPEC, LENGTH, mm(LENGTH / 2)))).toBeCloseTo(0, 6);
    expect(
      mmToInches(sampleRocker(DEFAULT_ROCKER_SPEC, LENGTH, mm(LENGTH - inchesToMm(12)))),
    ).toBeCloseTo(mmToInches(DEFAULT_ROCKER_SPEC.nose12), 6);
    expect(mmToInches(sampleRocker(DEFAULT_ROCKER_SPEC, LENGTH, LENGTH))).toBeCloseTo(
      mmToInches(DEFAULT_ROCKER_SPEC.noseTip),
      6,
    );
  });

  function assertNoFoldBack(spec: RockerSpec, length = LENGTH) {
    const stations: number[] = [];
    const SAMPLES = 200;
    for (let i = 0; i <= SAMPLES; i++) {
      stations.push((length * i) / SAMPLES);
    }
    const centerStation = length / 2;
    // Nose-ward from centre: lift never decreases.
    let prev = sampleRocker(spec, length, mm(centerStation));
    for (const s of stations.filter((s) => s >= centerStation)) {
      const lift = sampleRocker(spec, length, mm(s));
      expect(lift).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = lift;
    }
    // Tail-ward from centre: lift never decreases as station moves away from centre toward 0.
    prev = sampleRocker(spec, length, mm(centerStation));
    for (const s of stations.filter((s) => s <= centerStation).reverse()) {
      const lift = sampleRocker(spec, length, mm(s));
      expect(lift).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = lift;
    }
  }

  it("produces a curve with no fold-back for DEFAULT_ROCKER_SPEC", () => {
    assertNoFoldBack(DEFAULT_ROCKER_SPEC);
  });

  it("produces a curve with no fold-back for the extreme in-range spec", () => {
    const maxIn = ROCKER_LIFT_RANGE_IN.max;
    assertNoFoldBack({
      noseTip: inchesToMm(maxIn),
      nose12: inchesToMm(maxIn),
      tail12: inchesToMm(maxIn),
      tailTip: inchesToMm(maxIn),
    });
  });

  it("produces a curve with no fold-back for the all-zero spec", () => {
    assertNoFoldBack({
      noseTip: inchesToMm(0),
      nose12: inchesToMm(0),
      tail12: inchesToMm(0),
      tailTip: inchesToMm(0),
    });
  });
});

describe("rockerStationPoints", () => {
  it("returns five points in ascending station order for any board length in BOARD_LENGTH_RANGE_IN, with the centre point's lift equal to zero", () => {
    for (const lengthIn of [BOARD_LENGTH_RANGE_IN.min, 72, BOARD_LENGTH_RANGE_IN.max]) {
      const length = inchesToMm(lengthIn);
      const points = rockerStationPoints(DEFAULT_ROCKER_SPEC, length);
      expect(points).toHaveLength(5);
      for (let i = 1; i < points.length; i++) {
        expect(points[i].station).toBeGreaterThan(points[i - 1].station);
      }
      const center = points.find((p) => p.key === "center");
      expect(center?.lift).toBe(0);
    }
  });
});
