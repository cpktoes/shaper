import { describe, expect, it } from "vitest";
import { CALLOUT_PX, UNPINNED_CALLOUT_SIZES, pinnedCalloutSizes } from "./callout-primitives";
import { CHIP_VALUE_INSET_PX, CHIP_VALUE_UNKNOWN_EM, chipValueEm, chipValueFontSize } from "./chip-value-fit";

// A long chip value drawn small enough to sit inside its chip (quick 261015-hz7, D8). The measured
// widths below are F9's: each string's `getComputedTextLength` at the pinned 14 px value size, bold
// Inter, in Chromium — measurements of the browser, not board numbers.
const MEASURED_14PX: [string, number][] = [
  ['1/4" @ 30 9/16"', 108.7],
  ['15/16" @ 35 15/16"', 128.0],
  ['15/16" @ 59 15/16"', 128.06],
  ['13/16" @ 47 13/16"', 128.52],
  ["24 mm @ 91.3 cm", 120.64],
  ["25 mm @ 152.4 cm", 129.28],
];

describe("chipValueFontSize — a long wing value fits its chip (D8, F9)", () => {
  const pinned = pinnedCalloutSizes(1);
  const room = (sizes: { chipW: number }) => sizes.chipW * (1 - (2 * CHIP_VALUE_INSET_PX) / CALLOUT_PX.chipW);

  it.each(MEASURED_14PX)("%s: the estimate is within 1.5 px of the measured %f px", (value, measured) => {
    expect(Math.abs(chipValueEm(value) * CALLOUT_PX.value - measured)).toBeLessThanOrEqual(1.5);
  });

  it("a short value keeps the pinned value size", () => {
    expect(chipValueFontSize('3/16" @ 11"', pinned)).toBe(pinned.value);
  });

  it.each(['1/4" @ 30 9/16"', '15/16" @ 59 15/16"', "25 mm @ 152.4 cm"])(
    "%s draws small enough to sit 4 px inside each side of the chip",
    (value) => {
      const size = chipValueFontSize(value, pinned);
      expect(size).toBeLessThan(pinned.value);
      expect(chipValueEm(value) * size).toBeLessThanOrEqual(room(pinned) + 1e-9);
    },
  );

  it("scales with the sizes: at the pinned floor and unpinned (17 on a 112 chip) alike", () => {
    const value = '15/16" @ 59 15/16"';
    const floor = pinnedCalloutSizes(0.66);
    expect(chipValueEm(value) * chipValueFontSize(value, floor)).toBeLessThanOrEqual(room(floor) + 1e-9);
    expect(chipValueFontSize(value, floor) / floor.value).toBeCloseTo(chipValueFontSize(value, pinned) / pinned.value, 12);
    const unpinned = UNPINNED_CALLOUT_SIZES;
    expect(chipValueEm(value) * chipValueFontSize(value, unpinned)).toBeLessThanOrEqual(room(unpinned) + 1e-9);
  });

  it("an unknown character counts as 1.02 em", () => {
    expect(chipValueEm("é")).toBe(CHIP_VALUE_UNKNOWN_EM);
    expect(CHIP_VALUE_UNKNOWN_EM).toBe(1.02);
  });
});
