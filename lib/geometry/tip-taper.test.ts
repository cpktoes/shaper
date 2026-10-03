import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { blankStationOf, placementRange, prepareBlank } from "./blank-fit";
import { MEASURE_STATION_MM } from "./outline";
import {
  automaticStart,
  steadyTaper,
  THINNING_START_STEP_MM,
  tipView,
  type PlanerCut,
} from "./tip-taper";
import { inchesToMm, mm, type Mm } from "./units";

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
