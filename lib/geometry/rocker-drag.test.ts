import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC } from "./board";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, type FoilStationKey } from "./foil";
import { ROCKER_LIFT_RANGE_IN, rockerStationPoints, type RockerSpec } from "./rocker";
import {
  SIDE_PROFILE_DRAG_LIMITS,
  sideProfileDragPoints,
  solveSideProfileDrag,
  type SideProfileDragTarget,
} from "./rocker-drag";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

const ROCKER: RockerSpec = DEFAULT_BOARD_SPEC.rocker;
const FOIL: FoilSpec = DEFAULT_BOARD_SPEC.foil;
const LENGTH: Mm = DEFAULT_BOARD_SPEC.outline.length;

/** The four rocker-line targets — every station except the fixed-zero centre. */
const ROCKER_STATIONS: Exclude<FoilStationKey, "center">[] = ["tailTip", "tail12", "nose12", "noseTip"];
/** All five deck-curve targets. */
const ALL_STATIONS: FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

function findPoint(
  rocker: RockerSpec,
  foil: FoilSpec,
  curve: "rocker" | "deck",
  station: FoilStationKey,
) {
  const point = sideProfileDragPoints(rocker, foil, LENGTH).find(
    (p) => p.target.curve === curve && p.target.station === station,
  );
  if (!point) throw new Error(`no ${curve} drag point for ${station}`);
  return point;
}

describe("sideProfileDragPoints", () => {
  it("returns nine points for any board length in range: four on the rocker line, five on the deck curve", () => {
    for (const lengthIn of [60, 90, 120]) {
      const length = inchesToMm(lengthIn);
      const points = sideProfileDragPoints(ROCKER, FOIL, length);
      expect(points).toHaveLength(9);

      const rockerPoints = points.filter((p) => p.target.curve === "rocker");
      const deckPoints = points.filter((p) => p.target.curve === "deck");
      expect(rockerPoints).toHaveLength(4);
      expect(deckPoints).toHaveLength(5);
      expect(rockerPoints.map((p) => p.target.station).sort()).toEqual([...ROCKER_STATIONS].sort());
      expect(deckPoints.map((p) => p.target.station).sort()).toEqual([...ALL_STATIONS].sort());
      // The centre is the fixed zero (D-05), never a rocker-line target.
      expect(rockerPoints.some((p) => p.target.station === "center")).toBe(false);
    }
  });
});

describe("round trip — rocker line", () => {
  for (const station of ROCKER_STATIONS) {
    it(`${station}: merging the solved patch and re-enumerating lands on the solve's own value`, () => {
      const target: SideProfileDragTarget = { curve: "rocker", station };
      const before = findPoint(ROCKER, FOIL, "rocker", station);
      const dragged = { station: before.point.station, height: mm(before.point.height + inchesToMm(0.75)) };

      const patch = solveSideProfileDrag(target, dragged, ROCKER, FOIL, LENGTH);
      expect(patch.foil).toBeUndefined();
      const solvedValue = patch.rocker?.[station] as Mm;

      const nextRocker = { ...ROCKER, ...patch.rocker };
      const after = findPoint(nextRocker, FOIL, "rocker", station);
      expect(mmToInches(after.point.height)).toBeCloseTo(mmToInches(solvedValue), 9);
    });
  }
});

describe("round trip — deck curve", () => {
  for (const station of ALL_STATIONS) {
    it(`${station}: dragging a deck point changes only the foil station under it, leaving rocker untouched`, () => {
      const target: SideProfileDragTarget = { curve: "deck", station };
      const before = findPoint(ROCKER, FOIL, "deck", station);
      const dragged = { station: before.point.station, height: mm(before.point.height + inchesToMm(0.5)) };

      const patch = solveSideProfileDrag(target, dragged, ROCKER, FOIL, LENGTH);
      expect(patch.rocker).toBeUndefined();
      expect(Object.keys(patch.foil ?? {})).toEqual([station]);
      const solvedValue = patch.foil?.[station] as Mm;

      const nextFoil = { ...FOIL, ...patch.foil };
      const after = findPoint(ROCKER, nextFoil, "deck", station);
      const liftAtStation = rockerStationPoints(ROCKER, LENGTH).find((p) => p.key === station)?.lift ?? mm(0);
      expect(mmToInches(after.point.height)).toBeCloseTo(mmToInches(liftAtStation) + mmToInches(solvedValue), 6);

      // The rocker line itself is untouched by a deck drag — only the thickness moved.
      if (station !== "center") {
        const rockerBefore = findPoint(ROCKER, FOIL, "rocker", station);
        const rockerAfter = findPoint(ROCKER, nextFoil, "rocker", station);
        expect(rockerAfter.point.height).toBe(rockerBefore.point.height);
      }
    });
  }
});

describe("every solved value is slider-representable", () => {
  it("rocker targets land on the ROCKER_LIFT_RANGE_IN step and within bounds", () => {
    for (const station of ROCKER_STATIONS) {
      const target: SideProfileDragTarget = { curve: "rocker", station };
      const patch = solveSideProfileDrag(
        target,
        { station: mm(0), height: inchesToMm(3.1234) },
        ROCKER,
        FOIL,
        LENGTH,
      );
      const inches = mmToInches(patch.rocker?.[station] as Mm);
      const steps = inches / SIDE_PROFILE_DRAG_LIMITS.rocker.step;
      expect(steps).toBeCloseTo(Math.round(steps), 9);
      expect(inches).toBeGreaterThanOrEqual(SIDE_PROFILE_DRAG_LIMITS.rocker.min);
      expect(inches).toBeLessThanOrEqual(SIDE_PROFILE_DRAG_LIMITS.rocker.max);
    }
  });

  it("deck targets land on the FOIL_THICKNESS_RANGE_IN step and within bounds", () => {
    for (const station of ALL_STATIONS) {
      const target: SideProfileDragTarget = { curve: "deck", station };
      const patch = solveSideProfileDrag(
        target,
        { station: mm(0), height: inchesToMm(4.777) },
        ROCKER,
        FOIL,
        LENGTH,
      );
      const inches = mmToInches(patch.foil?.[station] as Mm);
      const steps = inches / SIDE_PROFILE_DRAG_LIMITS.foil.step;
      expect(steps).toBeCloseTo(Math.round(steps), 9);
      expect(inches).toBeGreaterThanOrEqual(SIDE_PROFILE_DRAG_LIMITS.foil.min);
      expect(inches).toBeLessThanOrEqual(SIDE_PROFILE_DRAG_LIMITS.foil.max);
    }
  });
});

describe("dragging a deck point below its own rocker line", () => {
  it("clamps thickness to the range minimum rather than going negative", () => {
    const station: FoilStationKey = "noseTip";
    const target: SideProfileDragTarget = { curve: "deck", station };
    // Well under the rocker lift at this station — an impossible negative thickness if unclamped.
    const patch = solveSideProfileDrag(target, { station: mm(0), height: mm(-1000) }, ROCKER, FOIL, LENGTH);
    const inches = mmToInches(patch.foil?.[station] as Mm);
    expect(inches).toBe(FOIL_THICKNESS_RANGE_IN.min);
  });
});

describe("non-finite input", () => {
  it("returns the range minimum for both curves, matching quantise's own fallback", () => {
    const rockerPatch = solveSideProfileDrag(
      { curve: "rocker", station: "noseTip" },
      { station: mm(Number.NaN), height: mm(Number.NaN) },
      ROCKER,
      FOIL,
      LENGTH,
    );
    expect(mmToInches(rockerPatch.rocker?.noseTip as Mm)).toBeCloseTo(ROCKER_LIFT_RANGE_IN.min, 9);

    const deckPatch = solveSideProfileDrag(
      { curve: "deck", station: "center" },
      { station: mm(Number.NaN), height: mm(Number.NaN) },
      ROCKER,
      FOIL,
      LENGTH,
    );
    expect(mmToInches(deckPatch.foil?.center as Mm)).toBeCloseTo(FOIL_THICKNESS_RANGE_IN.min, 9);
  });
});

describe("solving never changes a station other than the one dragged", () => {
  for (const station of ROCKER_STATIONS) {
    it(`rocker ${station} touches only that field`, () => {
      const target: SideProfileDragTarget = { curve: "rocker", station };
      const patch = solveSideProfileDrag(target, { station: mm(0), height: inchesToMm(2) }, ROCKER, FOIL, LENGTH);
      expect(Object.keys(patch.rocker ?? {})).toEqual([station]);
      expect(patch.foil).toBeUndefined();
    });
  }

  for (const station of ALL_STATIONS) {
    it(`deck ${station} touches only that field`, () => {
      const target: SideProfileDragTarget = { curve: "deck", station };
      const patch = solveSideProfileDrag(target, { station: mm(0), height: inchesToMm(2) }, ROCKER, FOIL, LENGTH);
      expect(Object.keys(patch.foil ?? {})).toEqual([station]);
      expect(patch.rocker).toBeUndefined();
    });
  }
});
