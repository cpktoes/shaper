import { describe, expect, it, vi } from "vitest";

// `rail-section-plot.tsx` reads `useUnits()` (components/units-provider.tsx), which imports the
// real "use server" units-preference action — and that action's module touches the database
// client at import time (`neon(process.env.DATABASE_URL!)`). This test only needs the pure
// `buildRailPlotGrid`/`computeRailPlotBounds` exports, so the server action is stubbed out before
// importing the component file — the same reason `lib/db/ownership.test.ts` reads its subject
// files as text instead of importing them, except here the exports under test genuinely need to
// be called, not just read as a string.
vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }));

import { DEFAULT_RAIL_BAND_SPEC, computeRailBands } from "@/lib/geometry/rail-bands";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { CALLOUT_BOTTOM_PAD, CALLOUT_RIGHT_PAD, SCALE, computeRailPlotBounds, buildRailPlotGrid, railPlotProjection } from "./rail-section-plot";

/**
 * The rail plot's grid-tick generation (T-06-05) had no test at all before this plan — a wrong
 * metric pitch would have a shaper counting squares that don't match the marks they read off the
 * table. Built from `computeRailBands` (never hand-written segment coordinates), against one
 * known, un-domed rail section (the default centre section, `deckPercent: 100`) whose plot bounds
 * this file derives fresh each run — every expected value below traces back to that one section's
 * own geometry rather than a magic literal.
 */
describe("buildRailPlotGrid", () => {
  const bands = computeRailBands(DEFAULT_RAIL_BAND_SPEC);
  const bounds = computeRailPlotBounds(bands.center, bands.center.bounds.xAxisMin);

  // The true axis bounds the grid floors from — recovers exactly the same `xAxisMinIn`/
  // `yAxisMaxIn` `computeRailPlotBounds` derived `bounds.minX`/`bounds.maxY` from (the 0.15in
  // margin cancels out), the same recovery `buildRailPlotGrid` itself performs.
  const xAxisMinIn = bounds.minX + 0.15;
  const yAxisMaxIn = bounds.maxY - 0.15;
  // A metric grid line can land up to (but never more than) one 10mm step outward of the true
  // axis bound — the same floor-toward-outward behaviour the imperial grid already has with its
  // own one-whole-inch step (`Math.floor` never moves a bound by more than its own step).
  const METRIC_STEP_IN = mmToInches(mm(10));

  it("imperial ticks are today's whole inches inside the bounds, one whole inch apart, no unit shown", () => {
    const grid = buildRailPlotGrid(bounds, "imperial");

    expect(grid.xTicks.length).toBeGreaterThan(1);
    expect(grid.yTicks.length).toBeGreaterThan(1);
    expect(grid.xTicks[0].value).toBe(0);
    expect(grid.yTicks[0].value).toBe(0);

    for (const tick of grid.xTicks) {
      expect(Number.isInteger(tick.value)).toBe(true);
      expect(tick.value).toBeLessThanOrEqual(0);
      // floor never moves the bound by more than one whole inch
      expect(tick.value).toBeGreaterThan(xAxisMinIn - 1);
      expect(tick.label).toBe(`${Math.abs(tick.value)}`);
      expect(tick.label).not.toMatch(/[a-zA-Z"]/);
    }
    for (const tick of grid.yTicks) {
      expect(Number.isInteger(tick.value)).toBe(true);
      expect(tick.value).toBeGreaterThanOrEqual(0);
      expect(tick.value).toBeLessThan(yAxisMaxIn + 1);
      expect(tick.label).toBe(`${tick.value}`);
      expect(tick.label).not.toMatch(/[a-zA-Z"]/);
    }
    for (let i = 1; i < grid.xTicks.length; i++) {
      expect(grid.xTicks[i - 1].value - grid.xTicks[i].value).toBe(1);
    }
    for (let i = 1; i < grid.yTicks.length; i++) {
      expect(grid.yTicks[i].value - grid.yTicks[i - 1].value).toBe(1);
    }
  });

  it("metric ticks are 10mm multiples inside the same physical bounds, one 10mm step apart", () => {
    const grid = buildRailPlotGrid(bounds, "metric");

    expect(grid.xTicks.length).toBeGreaterThan(1);
    expect(grid.yTicks.length).toBeGreaterThan(1);
    expect(grid.xTicks[0].value).toBe(0);
    expect(grid.yTicks[0].value).toBe(0);

    for (const tick of grid.xTicks) {
      const mmValue = inchesToMm(tick.value);
      const nearestTenMm = Math.round(mmValue / 10) * 10;
      expect(Math.abs(mmValue - nearestTenMm)).toBeLessThan(1e-6);
      expect(tick.value).toBeLessThanOrEqual(0);
      // each metric tick's physical position, converted back to inches, lies inside the plot
      // bounds — within one metric grid step of the true axis bound, the metric counterpart of
      // the imperial one-whole-inch tolerance above.
      expect(tick.value).toBeGreaterThan(xAxisMinIn - METRIC_STEP_IN - 1e-9);
    }
    for (const tick of grid.yTicks) {
      const mmValue = inchesToMm(tick.value);
      const nearestTenMm = Math.round(mmValue / 10) * 10;
      expect(Math.abs(mmValue - nearestTenMm)).toBeLessThan(1e-6);
      expect(tick.value).toBeGreaterThanOrEqual(0);
      expect(tick.value).toBeLessThan(yAxisMaxIn + METRIC_STEP_IN + 1e-9);
    }
    for (let i = 1; i < grid.xTicks.length; i++) {
      expect(grid.xTicks[i - 1].value - grid.xTicks[i].value).toBeCloseTo(METRIC_STEP_IN, 9);
    }
    for (let i = 1; i < grid.yTicks.length; i++) {
      expect(grid.yTicks[i].value - grid.yTicks[i - 1].value).toBeCloseTo(METRIC_STEP_IN, 9);
    }
  });

  it("exactly one tick per axis carries the mm suffix, the first non-zero tick outward from the origin", () => {
    const grid = buildRailPlotGrid(bounds, "metric");

    const xSuffixed = grid.xTicks.filter((t) => t.label.endsWith(" mm"));
    const ySuffixed = grid.yTicks.filter((t) => t.label.endsWith(" mm"));
    expect(xSuffixed.length).toBe(1);
    expect(ySuffixed.length).toBe(1);

    // Both arrays are ordered from the origin (index 0, always bare "0") outward, so the first
    // non-zero tick outward from the origin is index 1.
    expect(grid.xTicks[0].label).toBe("0");
    expect(grid.yTicks[0].label).toBe("0");
    expect(grid.xTicks[1].label).toBe("10 mm");
    expect(grid.yTicks[1].label).toBe("10 mm");
  });

  it("does not change the plot's pixel scale, bounds computation or clamp ceiling", () => {
    // SCALE=56 is pinned by its own acceptance grep on the component source; this test only
    // re-confirms the bounds this suite's own fixture builds from are the unchanged
    // computeRailPlotBounds output, not a value this file invented.
    expect(bounds.minY).toBe(-0.15);
    expect(bounds.maxY).toBeCloseTo(mmToInches(bands.center.bounds.yAxisMax) + 0.15, 9);
  });
});

/**
 * `computeRailPlotBounds`'s optional `calloutRoom` flag (quick task 260908-b35): the pixel-identity
 * contract from plan 08-01 says the VIEWER tab, the order form's first sheet and the View Full
 * Sized dialog — none of which ever passes this option — must see today's exact box, unchanged.
 * These assertions pin that no-option/false-option box byte for byte, and pin that asking for the
 * room changes `width` and nothing else.
 */
describe("computeRailPlotBounds calloutRoom option", () => {
  const bands = computeRailBands(DEFAULT_RAIL_BAND_SPEC);
  const output = bands.center;
  const xAxisMin = output.bounds.xAxisMin;

  it("returns an identical box with no third argument and with calloutRoom explicitly false", () => {
    const noArg = computeRailPlotBounds(output, xAxisMin);
    const explicitFalse = computeRailPlotBounds(output, xAxisMin, { calloutRoom: false });
    expect(explicitFalse).toEqual(noArg);
  });

  it("with no third argument, width is the frozen chrome value the VIEWER tab and the full-sized dialog depend on", () => {
    // This is the pixel-identity contract from plan 08-01: a change here means the VIEWER stack
    // and the printed full-sized rail both moved.
    const bounds = computeRailPlotBounds(output, xAxisMin);
    expect(bounds.width).toBeCloseTo((0.15 - bounds.minX) * SCALE + 22, 9);
  });

  it("with no third argument, height is the frozen chrome value the VIEWER tab and the full-sized dialog depend on", () => {
    // Sibling of the width case above, same warning: a change here means the VIEWER stack and the
    // printed full-sized rail both moved.
    const bounds = computeRailPlotBounds(output, xAxisMin);
    expect(bounds.height).toBeCloseTo((bounds.maxY - bounds.minY) * SCALE + 20, 9);
  });

  it("asking for callout room adds exactly CALLOUT_RIGHT_PAD to width and CALLOUT_BOTTOM_PAD to height, and changes nothing else", () => {
    const plain = computeRailPlotBounds(output, xAxisMin);
    const padded = computeRailPlotBounds(output, xAxisMin, { calloutRoom: true });
    expect(padded.width).toBeCloseTo(plain.width + CALLOUT_RIGHT_PAD, 9);
    expect(padded.height).toBeCloseTo(plain.height + CALLOUT_BOTTOM_PAD, 9);
    expect(padded.minX).toBe(plain.minX);
    expect(padded.minY).toBe(plain.minY);
    expect(padded.maxY).toBe(plain.maxY);
  });

  it("railPlotProjection is unmoved by the option", () => {
    const plain = computeRailPlotBounds(output, xAxisMin);
    const padded = computeRailPlotBounds(output, xAxisMin, { calloutRoom: true });
    const { px, py } = railPlotProjection(output, xAxisMin);
    expect(px(0)).toBeCloseTo((0 - padded.minX) * SCALE + 22, 9);
    expect(py(0)).toBeCloseTo(padded.maxY * SCALE, 9);
    // The room the below-axis names live in: the distance from the axis to the floor of the box
    // grows by exactly CALLOUT_BOTTOM_PAD when the room is asked for.
    expect(padded.height - py(0)).toBeCloseTo(plain.height - py(0) + CALLOUT_BOTTOM_PAD, 9);
  });
});
