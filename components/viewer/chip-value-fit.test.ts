import { describe, expect, it } from "vitest";
import { CALLOUT_PX, UNPINNED_CALLOUT_SIZES, pinnedCalloutSizes } from "./callout-primitives";
import { CHIP_VALUE_INSET_PX, CHIP_VALUE_UNKNOWN_EM, chipValueEm, chipValueFontSize, fitTextSize } from "./chip-value-fit";

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

// Quick 261015-my3 (D4, F2): the WINGS close-up's data card rows. Widths measured at 14 px in Chromium.
describe("fitTextSize — a card row's value fits the room its label leaves", () => {
  it.each([
    ['+1/4"', 38.17],
    ['-2 15/16"', 61.42],
    ['+2 15/16"', 64.38],
    ["+76 mm", 54.98],
  ])("%s: the estimate, with the measured + and - widths, is within 1.5 px of the measured %f px", (value, measured) => {
    expect(Math.abs(chipValueEm(value) * 14 - measured)).toBeLessThanOrEqual(1.5);
  });

  it("the signs are in the table, not counted as unknown", () => {
    expect(chipValueEm("+")).toBe(0.658);
    expect(chipValueEm("-")).toBe(0.446);
    expect(chipValueEm('+1/4"')).toBeCloseTo(0.658 + 0.433 + 0.389 + 0.677 + 0.553, 9);
    expect(chipValueEm('-1/2"')).toBeCloseTo(0.446 + 0.433 + 0.389 + 0.631 + 0.553, 9);
  });

  it("a value that fits keeps the full size", () => {
    expect(fitTextSize('15/16"', 14, 48.3)).toBe(14);
  });

  it("a value too long is set just small enough to fit", () => {
    const size = fitTextSize('2 15/16"', 14, 48.3);
    expect(size).toBeLessThan(14);
    expect(chipValueEm('2 15/16"') * size).toBeLessThanOrEqual(48.3 + 1e-9);
  });

  it("an empty value or no room keeps the full size", () => {
    expect(fitTextSize("", 14, 48.3)).toBe(14);
    expect(fitTextSize('1/2"', 14, 0)).toBe(14);
  });

  it("chipValueFontSize is unchanged by the new widths (the VIEWER's WING values carry no sign)", () => {
    const pinned = pinnedCalloutSizes(1);
    expect(chipValueFontSize('3/16" @ 11"', pinned)).toBe(pinned.value);
  });
});
