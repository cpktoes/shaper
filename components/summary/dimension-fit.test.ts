import { describe, expect, it } from "vitest";
import { DIMENSION_FIT_STEPS, dimensionValueFitClass } from "./dimension-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, WIDEPOINT_WIDTH_RANGE_IN } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { formatDim, formatLength, formatSignedDim } from "@/lib/geometry/measure-display";
import { inchesToMm, mm, mmToInches, type UnitsSystem } from "@/lib/geometry/units";
import { AREA_FACTORS, computeVolume } from "@/lib/geometry/volume";

/**
 * Every worst-case string below is DERIVED — from the app's own board-dimension ranges
 * (`lib/geometry/board.ts`) and rail-band thickness bounds, run through the display boundary's own
 * formatters (`lib/geometry/measure-display.ts`) — never hand-typed, per this plan's own
 * `<test_runner_constraint>` and CLAUDE.md Rule 1's "never hand-transcribe an expected number."
 */
const SYSTEMS: readonly UnitsSystem[] = ["imperial", "metric"];

/** The order form's own centre-thickness slider bounds (`rail-controls.tsx`'s
 * `CENTER_THICKNESS_BOUNDS`), copied here as inches only — the widest range either thickness
 * slider (nose/tail/center) allows, so sampling it covers every Thickness cell value the order
 * form can print. */
const CENTER_THICKNESS_RANGE_IN = { min: 1.75, max: 3.5 } as const;

function sampleInches(min: number, max: number, step = 1 / 16): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

/** Every string the Length cell can print across the app's own board-length range, both systems. */
function lengthStrings(): string[] {
  return sampleInches(BOARD_LENGTH_RANGE_IN.min, BOARD_LENGTH_RANGE_IN.max).flatMap((l) =>
    SYSTEMS.map((sys) => formatLength(mm(inchesToMm(l)), sys)),
  );
}

/** Every string a `formatDim`-family cell (Widepoint, Thickness) can print across a given
 * inch-domain range, both systems. */
function dimStrings(min: number, max: number): string[] {
  return sampleInches(min, max).flatMap((v) => SYSTEMS.map((sys) => formatDim(mm(inchesToMm(v)), sys)));
}

/** Every string the Offset cell can print across the outline editor's own -12in..12in range,
 * both systems (`components/outline/outline-controls.tsx`'s own `measureSlider` bounds). */
function offsetStrings(): string[] {
  return sampleInches(-12, 12).flatMap((o) => SYSTEMS.map((sys) => formatSignedDim(mm(inchesToMm(o)), sys)));
}

/** Every string the Nose/Tail cells can print, sampled across the board's own length x widepoint
 * width grid and run through `buildOutline()` — the exact function the order form itself calls,
 * never a hand-typed geometry result. */
function noseAndTailStrings(): { nose: string[]; tail: string[] } {
  const nose: string[] = [];
  const tail: string[] = [];
  for (const l of sampleInches(BOARD_LENGTH_RANGE_IN.min, BOARD_LENGTH_RANGE_IN.max, 5)) {
    for (const w of sampleInches(WIDEPOINT_WIDTH_RANGE_IN.min, WIDEPOINT_WIDTH_RANGE_IN.max, 1)) {
      const geometry = buildOutline({
        ...DEFAULT_BOARD_SPEC.outline,
        length: mm(inchesToMm(l)),
        widePointWidth: mm(inchesToMm(w)),
      });
      for (const sys of SYSTEMS) {
        nose.push(formatDim(geometry.noseWidthAt12in, sys));
        tail.push(formatDim(geometry.tailWidthAt12in, sys));
      }
    }
  }
  return { nose, tail };
}

/** Every string every dimension cell this app can produce, across both systems — the full set
 * `<behavior>`'s "longest string each of the seven cells can produce" bullet is checked against.
 * Volume is composed with no `system` argument (it reads the same in both systems) and is a plain
 * `.toFixed(1)` figure with no realistic upper bound worth deriving here, so it is asserted
 * separately in the plan's Task 3 test below, against the app's own extreme board presets. */
function allDimensionCellStrings(): string[] {
  const { nose, tail } = noseAndTailStrings();
  return [
    ...lengthStrings(),
    ...dimStrings(WIDEPOINT_WIDTH_RANGE_IN.min, WIDEPOINT_WIDTH_RANGE_IN.max),
    ...offsetStrings(),
    ...dimStrings(CENTER_THICKNESS_RANGE_IN.min, CENTER_THICKNESS_RANGE_IN.max),
    ...nose,
    ...tail,
  ];
}

describe("dimensionValueFitClass", () => {
  it("returns the base class for a string short enough to fit at the sheet's normal size", () => {
    expect(dimensionValueFitClass("40.6 cm")).toBe("order-form-dim");
  });

  it("returns a stepped-down class for a string long enough to overrun", () => {
    expect(dimensionValueFitClass("24 15/16\"")).not.toBe("order-form-dim");
  });

  it("returns a further step for a string longer still", () => {
    const firstStep = dimensionValueFitClass("24 15/16\"");
    const secondStep = dimensionValueFitClass("5'10 11/16\"");
    expect(secondStep).not.toBe(firstStep);
    expect(secondStep).not.toBe("order-form-dim");
  });

  it("never returns a step whose floor can fall below the sheet's 12px print-legibility minimum", () => {
    for (const step of DIMENSION_FIT_STEPS) {
      expect(step.minPx, `${step.className}'s floor is below the 12px print minimum`).toBeGreaterThanOrEqual(12);
    }
  });

  it("a string exactly at the base step's fit limit still returns the base class, not a stepped-down one", () => {
    const baseStep = DIMENSION_FIT_STEPS[0];
    const exactlyAtLimit = "x".repeat(baseStep.maxLength);
    expect(dimensionValueFitClass(exactlyAtLimit)).toBe(baseStep.className);
  });

  it("is a pure function of the string alone — its own signature takes no units system", () => {
    expect(dimensionValueFitClass.length).toBe(1);
    const value = "24 15/16\"";
    expect(dimensionValueFitClass(value)).toBe(dimensionValueFitClass(value));
  });

  it("two strings of equal length select the same class regardless of which system produced them", () => {
    // "63.5 cm" (metric widepoint) and "24 15/16\"" differ in length and are expected to differ in
    // class; two SAME-length strings from different systems must not.
    const metricOffset = formatSignedDim(mm(inchesToMm(-6)), "metric"); // "-15.2 cm" (8 chars)
    const metricLength = formatLength(mm(inchesToMm(60)), "metric"); // "152.4 cm" (8 chars)
    expect(metricOffset.length).toBe(metricLength.length);
    expect(dimensionValueFitClass(metricOffset)).toBe(dimensionValueFitClass(metricLength));
  });

  it("keeps every real dimension-cell string this app can produce within a defined step's ceiling", () => {
    for (const value of allDimensionCellStrings()) {
      const cls = dimensionValueFitClass(value);
      const step = DIMENSION_FIT_STEPS.find((s) => s.className === cls);
      expect(step, `dimensionValueFitClass returned an unrecognised class "${cls}" for "${value}"`).toBeDefined();
      expect(
        value.length,
        `"${value}" (${value.length} chars) overruns its own step "${cls}"'s ${step!.maxLength}-character ceiling`,
      ).toBeLessThanOrEqual(step!.maxLength);
    }
  });

  it("every Metric dimension-cell string fits the base class (no Metric string needs a step-down)", () => {
    const metricValues = allDimensionCellStrings().filter((_, i) => i % SYSTEMS.length === SYSTEMS.indexOf("metric"));
    for (const value of metricValues) {
      expect(
        dimensionValueFitClass(value),
        `Metric value "${value}" (${value.length} chars) unexpectedly needed a step-down`,
      ).toBe("order-form-dim");
    }
  });
});

/**
 * The Metric print audit's automatable half (D-10, Task 3). Phase 6's UAT deferred the print
 * audit into this phase by name; the part a test can hold is the two extremes of the app's own
 * dimension ranges — the longest board and the widest board the outline editor allows — proving
 * every one of the seven dimension cells' values still selects a class that keeps it inside its
 * cell, in both systems. The part that genuinely needs eyes on a print preview (the compact rail
 * table's section headers, the fin placement panel's fixed-height box) is recorded below as a
 * `<human-check>`, harvested into the SUMMARY per `workflow.human_verify_mode: end-of-phase`.
 */
describe("the Metric print audit's automatable half — extremes of the app's own dimension ranges", () => {
  /** Every value's own extreme is pushed to its own range's edge simultaneously — the longest
   * board is also given the widest offset and thickest rail band, so this is a genuine worst case
   * rather than one dimension at a time. */
  const DEFAULT_LENGTH_IN = mmToInches(DEFAULT_BOARD_SPEC.outline.length);
  const DEFAULT_WIDEPOINT_WIDTH_IN = mmToInches(DEFAULT_BOARD_SPEC.outline.widePointWidth);
  const EXTREME_PRESETS: { name: string; lengthIn: number; widePointWidthIn: number }[] = [
    { name: "the longest board", lengthIn: BOARD_LENGTH_RANGE_IN.max, widePointWidthIn: DEFAULT_WIDEPOINT_WIDTH_IN },
    { name: "the widest board", lengthIn: DEFAULT_LENGTH_IN, widePointWidthIn: WIDEPOINT_WIDTH_RANGE_IN.max },
  ];

  it.each(EXTREME_PRESETS)(
    "every dimension cell fits its cell for $name, in both systems",
    ({ lengthIn, widePointWidthIn }) => {
      const length = mm(inchesToMm(lengthIn));
      const widePointWidth = mm(inchesToMm(widePointWidthIn));
      const widePointOffset = mm(inchesToMm(12)); // the offset slider's own extreme (outline-controls.tsx)
      const boardThickness = mm(inchesToMm(3.5)); // CENTER_THICKNESS_BOUNDS's own max (rail-controls.tsx)

      const geometry = buildOutline({
        ...DEFAULT_BOARD_SPEC.outline,
        length,
        widePointWidth,
        widePointOffset,
      });

      const maxAreaFactorIndex = AREA_FACTORS.indexOf(Math.max(...AREA_FACTORS) as (typeof AREA_FACTORS)[number]);
      const volume = computeVolume(
        {
          length,
          width: widePointWidth,
          centerThickness: boardThickness,
          boardTypeIndex: maxAreaFactorIndex,
          importTemplateDimensions: false,
          importRailThickness: false,
        },
        null,
        null,
      );

      for (const system of SYSTEMS) {
        const cellValues = [
          formatLength(length, system),
          formatDim(geometry.noseWidthAt12in, system),
          formatDim(widePointWidth, system),
          formatSignedDim(widePointOffset, system),
          formatDim(geometry.tailWidthAt12in, system),
          formatDim(boardThickness, system),
          `${volume.volumeLitres.toFixed(1)} L`,
        ];
        for (const value of cellValues) {
          const cls = dimensionValueFitClass(value);
          const step = DIMENSION_FIT_STEPS.find((s) => s.className === cls);
          expect(step, `dimensionValueFitClass returned an unrecognised class "${cls}" for "${value}"`).toBeDefined();
          expect(
            value.length,
            `"${value}" (${value.length} chars, ${system}) overruns "${cls}"'s ${step!.maxLength}-character ceiling`,
          ).toBeLessThanOrEqual(step!.maxLength);
        }
      }
    },
  );
});
