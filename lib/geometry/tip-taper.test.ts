import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { blankStationOf, placementRange, prepareBlank } from "./blank-fit";
import { MEASURE_STATION_MM } from "./outline";
import {
  automaticStart,
  canRunDownSteadily,
  pullThinningStart,
  SHARP_BEND_SLOPE,
  STEADY_EPSILON_MM,
  steadyTaper,
  THINNING_START_MIN_MM,
  THINNING_START_STEP_MM,
  thinningStartRange,
  tipFlag,
  tipView,
  type PlanerCut,
} from "./tip-taper";
import { inchesToMm, mm, mmToInches, type Mm } from "./units";

// The tips step's maths (Phase 14 D-01 to D-05, D-21, D-23). Every expected value is an identity of
// the maths (T(0) = tip, T(W) = P(W), T′(W) = m), a grid membership, or computed here from the
// catalogue through the app's own blank preparation — never a typed number (CLAUDE.md Rule 1).
const CATALOG = readSeedCatalog();

/** Whether `value` is a whole number of half inches (UI-SPEC §3 guarantee 1). */
function onHalfInchGrid(value: number): boolean {
  const steps = value / THINNING_START_STEP_MM;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/** `d = 0, step, 2·step, …` up to and including `to`. */
function sweep(to: number, step: number): number[] {
  const points: number[] = [];
  for (let k = 0; k * step <= to; k++) points.push(k * step);
  return points;
}

/**
 * The level planer cut at a board's TAIL, the board slid to the tail end of the blank, read off the
 * blank the way the board reads it: the blank's thickness under each station, dropped so the board's
 * centre reads its own centre thickness. `d` is the board station itself at the tail, and `u` has unit
 * slope in it, so the cut's slope is the blank's.
 */
function tailPlanerCut(vendor: string, name: string, length: Mm, centre: Mm): PlanerCut {
  const record = CATALOG.find((blank) => blank.vendor === vendor && blank.name === name);
  if (!record) throw new Error(`${vendor} ${name} is not in the seed catalogue`);
  const prepared = prepareBlank(record);
  const placement = placementRange(prepared.lengthMm, length).min;
  const u = (d: number) => blankStationOf(mm(d), placement, length, prepared.lengthMm);
  const drop = prepared.thickness.sample(u(length / 2)) - centre;
  return {
    at: (d) => prepared.thickness.sample(u(d)) - drop,
    slopeAt: (d) => prepared.thickness.slopeAt(u(d)),
  };
}

describe("the tracer: a real blank whose tail would hump today (D-01, D-03, D-05)", () => {
  // The founder's reference board (D-27): 10'0" on the Arctic Foam 10'9" LB, slid to the tail end,
  // 2 1/2" centre, the out-of-the-box 5/8" tail tip.
  const length = inchesToMm(120);
  const tip = inchesToMm(5 / 8);
  const cut = tailPlanerCut("Arctic Foam", `10'9" LB`, length, inchesToMm(2.5));

  it("Automatic finds a steady start further in than 12\", on the half-inch grid", () => {
    const { start, found } = automaticStart(cut, tip, length);
    expect(found).toBe(true);
    expect(start).toBeGreaterThan(MEASURE_STATION_MM);
    expect(onHalfInchGrid(start)).toBe(true);
  });

  it("the steady taper from there reads the tip exactly and never dips under it", () => {
    const { start } = automaticStart(cut, tip, length);
    const taper = steadyTaper(cut, tip, start);
    expect(taper(0)).toBe(tip);
    for (const d of sweep(start, inchesToMm(1 / 16))) {
      expect(taper(d)).toBeGreaterThanOrEqual(tip - 1e-9);
    }
  });

  it("a start set by hand at 12\" on the same board is flagged with a thin spot below the tip", () => {
    const { view } = tipView({ cut, tip, length, stored: MEASURE_STATION_MM, end: "tail" });
    expect(view.automatic).toBe(false);
    expect(view.flag?.kind).toBe("thin");
    if (view.flag?.kind !== "thin") return;
    expect(view.flag.thinnest).toBeLessThan(tip);
  });
});

// ---------------------------------------------------------------------------------------------------
// Constructed planer cuts. Their shapes are typed INPUTS, written in inches and read through
// `inchesToMm`; every expectation below is computed from them or follows from the maths.
// ---------------------------------------------------------------------------------------------------

/** A planer cut written in inches: thickness `f(d)` and its slope `df/dd` (a plain ratio). */
function cutFromInches(f: (d: number) => number, df: (d: number) => number): PlanerCut {
  return {
    at: (d) => inchesToMm(f(mmToInches(mm(d)))),
    slopeAt: (d) => df(mmToInches(mm(d))),
  };
}

/** A straight cut reading `thicknessAt12In` at the 12" station with slope `slope` (a plain ratio). */
function straightCut(thicknessAt12In: number, slope: number): PlanerCut {
  const at12 = inchesToMm(thicknessAt12In);
  return {
    at: (d) => at12 + slope * (d - MEASURE_STATION_MM),
    slopeAt: () => slope,
  };
}

const TIP = inchesToMm(5 / 8);
const TIP_IN = mmToInches(TIP);
const LENGTH = inchesToMm(72);

/** Rises from the tip and bends upward: can run down steadily from anywhere. */
const STEADY_CUT = cutFromInches(
  (d) => TIP_IN + 0.05 * d + 0.002 * d * d,
  (d) => 0.05 + 0.004 * d,
);

/** Thinner than the tip at 12", rising and flattening further in (a steady start exists further in). */
const THIN_CUT = cutFromInches(
  (d) => 1.5 - 3 * Math.exp(-d / 10),
  (d) => 0.3 * Math.exp(-d / 10),
);

/** The average slope from the 12" station to the tip on a cut reading `thicknessAt12In` there. */
const secAt12 = (thicknessAt12In: number) => (inchesToMm(thicknessAt12In) - TIP) / MEASURE_STATION_MM;

/** Thick enough at 12" but leaving it too steeply: twice the average slope plus two bends' worth. */
const STEEP_CUT = straightCut(TIP_IN + 0.5, 2 * secAt12(TIP_IN + 0.5) + 2 * SHARP_BEND_SLOPE);

/** Getting thicker toward the tip at 12" (its low point is 18" in), D-23. */
const THICKENING_CUT = cutFromInches(
  (d) => TIP_IN + 1 + 0.01 * (d - 18) ** 2,
  (d) => 0.02 * (d - 18),
);

/** Both thinner than the tip at 12" and rising steeply from there. */
const THIN_AND_STEEP_CUT = straightCut(TIP_IN - 0.1, 0.2);

/** Built for the purpose: thinner than the tip everywhere, so no start can run down steadily. */
const NO_START_CUT = cutFromInches(
  () => TIP_IN / 2,
  () => 0,
);

const CUTS: { name: string; cut: PlanerCut }[] = [
  { name: "steady", cut: STEADY_CUT },
  { name: `thin at 12"`, cut: THIN_CUT },
  { name: `steep at 12"`, cut: STEEP_CUT },
  { name: `thickening at 12"`, cut: THICKENING_CUT },
  { name: `thin and steep at 12"`, cut: THIN_AND_STEEP_CUT },
  { name: "no steady start", cut: NO_START_CUT },
];

/** The slope the taper leaves the planer cut along at W (D-01). */
function leavingSlope(cut: PlanerCut, tip: Mm, W: number): number {
  const sec = (cut.at(W) - tip) / W;
  return Math.max(0, Math.min(cut.slopeAt(W), 2 * sec));
}

/** Every grid start Automatic tries before `start`: the 12" station, then 12 1/2", 13", … */
function gridStartsBefore(start: number): number[] {
  const starts: number[] = [MEASURE_STATION_MM];
  for (let k = 25; k * THINNING_START_STEP_MM < start - 1e-9; k++) starts.push(k * THINNING_START_STEP_MM);
  return starts;
}

/** Every grid start Automatic tries on a board of `length`: the 12" station, then on to the range's end. */
function everyGridStart(length: Mm): number[] {
  return gridStartsBefore(thinningStartRange(length).max + THINNING_START_STEP_MM);
}

describe("the steady taper (D-01)", () => {
  const starts = (cut: PlanerCut) => [
    MEASURE_STATION_MM,
    THINNING_START_MIN_MM,
    automaticStart(cut, TIP, LENGTH).start,
    thinningStartRange(LENGTH).max,
  ];

  it("reads the tip setting exactly at the tip and meets the planer cut at the start, on every cut", () => {
    for (const { name, cut } of CUTS) {
      for (const W of starts(cut)) {
        const taper = steadyTaper(cut, TIP, W);
        expect(taper(0), `${name} from ${W}`).toBe(TIP);
        expect(Math.abs(taper(W) - cut.at(W)), `${name} from ${W}`).toBeLessThan(1e-9);
      }
    }
  });

  it("leaves the planer cut along slope m (its own slope, held between 0 and twice the average)", () => {
    // A second-order backward difference: exact on a parabola up to rounding.
    const h = 1e-3;
    for (const { name, cut } of CUTS) {
      for (const W of starts(cut)) {
        const taper = steadyTaper(cut, TIP, W);
        const slope = (3 * taper(W) - 4 * taper(W - h) + taper(W - 2 * h)) / (2 * h);
        expect(Math.abs(slope - leavingSlope(cut, TIP, W)), `${name} from ${W}`).toBeLessThan(1e-6);
      }
    }
  });

  it("is the planer cut itself from the start inward", () => {
    for (const { name, cut } of CUTS) {
      const W = automaticStart(cut, TIP, LENGTH).start;
      const taper = steadyTaper(cut, TIP, W);
      for (const d of sweep(LENGTH / 2, inchesToMm(1 / 16)).filter((d) => d >= W)) {
        expect(taper(d), `${name} at ${d}`).toBe(cut.at(d));
      }
    }
  });

  it("from a start that can run down steadily, rises steadily from the tip and is never below it", () => {
    let checked = 0;
    for (const { name, cut } of CUTS) {
      const { start, found } = automaticStart(cut, TIP, LENGTH);
      if (!found) continue;
      expect(canRunDownSteadily(cut, TIP, start)).toBe(true);
      const taper = steadyTaper(cut, TIP, start);
      let previous = taper(0);
      for (const d of sweep(start, inchesToMm(1 / 16))) {
        const value = taper(d);
        expect(value, `${name} at ${d}`).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(value, `${name} at ${d}`).toBeGreaterThanOrEqual(TIP - 1e-9);
        previous = value;
      }
      checked++;
    }
    expect(checked).toBe(CUTS.length - 1);
  });
});

describe(`Automatic: 12" unless the board cannot run down steadily, then the first half inch that can (D-03, D-23)`, () => {
  it("can run down steadily exactly when all three conditions hold, and not when any one fails alone", () => {
    const W = MEASURE_STATION_MM;
    const point = (thickness: number, slope: number): PlanerCut => ({
      at: () => thickness,
      slopeAt: () => slope,
    });
    const thick = TIP + inchesToMm(1);
    const sec = (thick - TIP) / W;
    // All three hold.
    expect(canRunDownSteadily(point(thick, sec), TIP, W)).toBe(true);
    // Only the first fails: the planer cut at the start is thinner than the tip (a flat slope there is
    // still not thickening, and still within twice the average with the slack).
    const thin = TIP - 2 * STEADY_EPSILON_MM;
    expect(0).toBeLessThanOrEqual(2 * ((thin - TIP) / W) + STEADY_EPSILON_MM);
    expect(canRunDownSteadily(point(thin, 0), TIP, W)).toBe(false);
    // Only the second fails: the planer cut is getting thicker toward the tip there (D-23).
    expect(canRunDownSteadily(point(thick, -2 * STEADY_EPSILON_MM), TIP, W)).toBe(false);
    // Only the third fails: its slope there is more than twice the average slope to the tip.
    expect(canRunDownSteadily(point(thick, 2 * sec + 2 * STEADY_EPSILON_MM), TIP, W)).toBe(false);
    // Each comparison allows the 1e-6 mm slack.
    expect(canRunDownSteadily(point(TIP - STEADY_EPSILON_MM / 2, 0), TIP, W)).toBe(true);
    expect(canRunDownSteadily(point(thick, -STEADY_EPSILON_MM / 2), TIP, W)).toBe(true);
    expect(canRunDownSteadily(point(thick, 2 * sec + STEADY_EPSILON_MM / 2), TIP, W)).toBe(true);
  });

  it(`is the 12" station itself when the board can run down steadily from there`, () => {
    expect(automaticStart(STEADY_CUT, TIP, LENGTH)).toEqual({ start: MEASURE_STATION_MM, found: true });
    expect(automaticStart(STEADY_CUT, TIP, LENGTH).start).toBe(MEASURE_STATION_MM);
  });

  it("otherwise is the first half inch further in that can, every earlier one failing", () => {
    for (const { name, cut } of CUTS) {
      if (cut === STEADY_CUT || cut === NO_START_CUT) continue;
      const { start, found } = automaticStart(cut, TIP, LENGTH);
      expect(found, name).toBe(true);
      expect(start, name).toBeGreaterThan(MEASURE_STATION_MM);
      expect(start, name).toBeLessThanOrEqual(thinningStartRange(LENGTH).max);
      expect(canRunDownSteadily(cut, TIP, start), name).toBe(true);
      for (const earlier of gridStartsBefore(start)) {
        expect(canRunDownSteadily(cut, TIP, earlier), `${name} at ${earlier}`).toBe(false);
      }
    }
  });

  it(`falls back to the 12" station, quietly, when no start in the range can run down steadily`, () => {
    expect(automaticStart(NO_START_CUT, TIP, LENGTH)).toEqual({ start: MEASURE_STATION_MM, found: false });
    for (const W of everyGridStart(LENGTH)) {
      expect(canRunDownSteadily(NO_START_CUT, TIP, W), `at ${W}`).toBe(false);
    }
  });

  it("is always a whole number of half inches from the tip, inside the range, and the same board gives the same start", () => {
    for (const length of [inchesToMm(60), LENGTH, inchesToMm(70.75), inchesToMm(120)]) {
      const range = thinningStartRange(length);
      for (const { name, cut } of CUTS) {
        const first = automaticStart(cut, TIP, length);
        expect(onHalfInchGrid(first.start), name).toBe(true);
        expect(first.start, name).toBeGreaterThanOrEqual(MEASURE_STATION_MM);
        expect(first.start, name).toBeLessThanOrEqual(range.max);
        expect(automaticStart(cut, TIP, length)).toEqual(first);
      }
    }
  });
  // That Automatic ignores the fine-tune, Deck Skin and Tip Style (D-04) is proven on the stress set in
  // tip-flow.test.ts, by comparing its starts across those settings.
});

describe("the slider's reach, pulled on read (D-02, D-11)", () => {
  it(`runs from 6" to half the length rounded inward to the half inch`, () => {
    for (const lengthIn of [60, 70, 70.75, 120]) {
      const range = thinningStartRange(inchesToMm(lengthIn));
      expect(range.min).toBe(inchesToMm(6));
      const expected = inchesToMm(Math.floor(lengthIn / 2 / 0.5) * 0.5);
      expect(Math.abs(range.max - expected), `${lengthIn}"`).toBeLessThan(1e-9);
      expect(onHalfInchGrid(range.max)).toBe(true);
      expect(range.max).toBeLessThanOrEqual(inchesToMm(lengthIn) / 2 + 1e-9);
    }
  });

  it(`pulls a start under 6" up to 6", one past the centre in to the range's end, and leaves one inside alone`, () => {
    const length = inchesToMm(70);
    const range = thinningStartRange(length);
    expect(pullThinningStart(inchesToMm(3), length)).toBe(range.min);
    expect(pullThinningStart(length / 2 + inchesToMm(1), length)).toBe(range.max);
    const inside = inchesToMm(20);
    expect(pullThinningStart(inside, length)).toBe(inside);
    const { view } = tipView({ cut: STEADY_CUT, tip: TIP, length, stored: inchesToMm(3), end: "tail" });
    expect(view.fromTip).toBe(range.min);
  });

  it("pulls every value that is not a finite number to the range's minimum, Infinity as well as NaN", () => {
    const length = inchesToMm(70);
    const { min } = thinningStartRange(length);
    for (const stored of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(pullThinningStart(stored, length), String(stored)).toBe(min);
    }
  });

  it("a start set past the centre of a shortened board reads the range's end, and lengthening brings it back", () => {
    const stored = inchesToMm(34);
    const shorter = inchesToMm(60);
    const longer = inchesToMm(70);
    expect(pullThinningStart(stored, shorter)).toBe(thinningStartRange(shorter).max);
    expect(pullThinningStart(stored, longer)).toBe(stored);
    const { view } = tipView({ cut: STEADY_CUT, tip: TIP, length: shorter, stored, end: "tail" });
    expect(view.fromTip).toBe(thinningStartRange(shorter).max);
    expect(view.range).toEqual(thinningStartRange(shorter));
  });

  it("a stored start that is absent or not a number reads as Automatic (D-24)", () => {
    for (const stored of [undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const { view } = tipView({ cut: THIN_CUT, tip: TIP, length: LENGTH, stored, end: "tail" });
      expect(view.automatic, String(stored)).toBe(true);
      expect(view.fromTip).toBe(automaticStart(THIN_CUT, TIP, LENGTH).start);
      expect(view.automaticStart).toBe(view.fromTip);
    }
  });

  it(`the start in force reaches past the 12" station only when it is further in (D-07)`, () => {
    const reaches = (stored: number) =>
      tipView({ cut: STEADY_CUT, tip: TIP, length: LENGTH, stored, end: "tail" }).view.reachesStation;
    expect(reaches(MEASURE_STATION_MM)).toBe(false);
    expect(reaches(MEASURE_STATION_MM + THINNING_START_STEP_MM)).toBe(true);
  });

  it("measures the same point from the tail tip: the start itself at the tail, the length less it at the nose", () => {
    const stored = inchesToMm(20);
    const tail = tipView({ cut: STEADY_CUT, tip: TIP, length: LENGTH, stored, end: "tail" }).view;
    const nose = tipView({ cut: STEADY_CUT, tip: TIP, length: LENGTH, stored, end: "nose" }).view;
    expect(tail.station).toBe(tail.fromTip);
    expect(nose.station).toBe(LENGTH - nose.fromTip);
  });
});

describe("a start set by hand too close is drawn as set and flagged (D-05, D-21)", () => {
  const handSet = (cut: PlanerCut, stored: number = MEASURE_STATION_MM) =>
    tipView({ cut, tip: TIP, length: LENGTH, stored, end: "tail" });

  it("a planer cut thinner than the tip at the start is drawn as set and flagged with where it is thinnest", () => {
    const { view, taper } = handSet(THIN_CUT);
    const W = view.fromTip;
    expect(W).toBe(MEASURE_STATION_MM);
    expect(view.automaticFound).toBe(true);
    // Drawn exactly as set: the taper from that start, thin spot included.
    expect(taper(0)).toBe(TIP);
    expect(Math.abs(taper(W) - THIN_CUT.at(W))).toBeLessThan(1e-9);
    expect(view.flag?.kind).toBe("thin");
    if (view.flag?.kind !== "thin") return;
    expect(view.flag.thinnest).toBeLessThan(TIP);
    expect(view.flag.at).toBeGreaterThanOrEqual(0);
    expect(view.flag.at).toBeLessThanOrEqual(W);
    expect(view.flag.thinnest).toBe(taper(view.flag.at));
    for (const d of [...sweep(W, inchesToMm(1 / 8)), W]) {
      expect(view.flag.thinnest).toBeLessThanOrEqual(taper(d));
    }
  });

  it(`a bend just above 1/32" per inch is flagged steep, and one just below is not`, () => {
    const thicknessIn = TIP_IN + 0.5;
    const steady = 2 * secAt12(thicknessIn);
    const above = straightCut(thicknessIn, steady + SHARP_BEND_SLOPE + 1e-4);
    const below = straightCut(thicknessIn, steady + SHARP_BEND_SLOPE - 1e-4);
    expect(handSet(above).view.automaticFound).toBe(true);
    expect(handSet(below).view.automaticFound).toBe(true);
    expect(handSet(above).view.flag).toEqual({ kind: "steep" });
    // Not a steady start either, but its bend is under the line's threshold.
    expect(canRunDownSteadily(below, TIP, MEASURE_STATION_MM)).toBe(false);
    expect(handSet(below).view.flag).toBeNull();
  });

  it("a planer cut getting thicker toward the tip at the start is a bend by the same measure", () => {
    expect(THICKENING_CUT.slopeAt(MEASURE_STATION_MM)).toBeLessThan(-SHARP_BEND_SLOPE);
    expect(THICKENING_CUT.at(MEASURE_STATION_MM)).toBeGreaterThan(TIP);
    const { view } = handSet(THICKENING_CUT);
    expect(view.automaticFound).toBe(true);
    expect(view.flag).toEqual({ kind: "steep" });
  });

  it("the thin spot wins when the start is both thin and steep", () => {
    const W = MEASURE_STATION_MM;
    expect(THIN_AND_STEEP_CUT.at(W)).toBeLessThan(TIP);
    const bend = Math.abs(THIN_AND_STEEP_CUT.slopeAt(W) - leavingSlope(THIN_AND_STEEP_CUT, TIP, W));
    expect(bend).toBeGreaterThan(SHARP_BEND_SLOPE);
    const { view } = handSet(THIN_AND_STEEP_CUT);
    expect(view.automaticFound).toBe(true);
    expect(view.flag?.kind).toBe("thin");
  });

  it("is never flagged on Automatic, nor by hand where Automatic found no steady start", () => {
    for (const { name, cut } of CUTS) {
      for (const end of ["nose", "tail"] as const) {
        const { view } = tipView({ cut, tip: TIP, length: LENGTH, stored: undefined, end });
        expect(view.flag, `${name} ${end}`).toBeNull();
      }
    }
    const { view } = handSet(NO_START_CUT);
    expect(view.automaticFound).toBe(false);
    expect(canRunDownSteadily(NO_START_CUT, TIP, view.fromTip)).toBe(false);
    expect(view.flag).toBeNull();
  });

  it("a start that can run down steadily is not flagged", () => {
    const W = MEASURE_STATION_MM;
    expect(tipFlag(STEADY_CUT, TIP, W, steadyTaper(STEADY_CUT, TIP, W))).toBeNull();
    expect(handSet(STEADY_CUT, inchesToMm(20)).view.flag).toBeNull();
  });
});
