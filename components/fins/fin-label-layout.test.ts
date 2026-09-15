import { describe, expect, it } from "vitest";
import {
  FIN_LABEL_CHAR_EM,
  FIN_LABEL_CLEARANCE_EM,
  FIN_LABEL_INK_BOTTOM_EM,
  estimateFinLabelWidth,
  layoutFinLabelBaselines,
  type FinLabelBox,
} from "./fin-label-layout";

/** Measured Mid-length trio (see PLAN.md must_haves.key_links for the source measurements). */
const midLengthLabels = (): FinLabelBox[] => [
  { text: '12"', x: 66, y: 250, lineTop: 152, lineBottom: 320 },
  { text: '6 1/4"', x: 95.347, y: 290.25, lineTop: 232.5, lineBottom: 320 },
  { text: '3 5/8"', x: 150.347, y: 288.771, lineTop: 269.25, lineBottom: 320 },
];

/** Measured default-thruster pair. */
const thrusterLabels = (): FinLabelBox[] => [
  { text: '11"', x: 66, y: 257.16, lineTop: 166, lineBottom: 320 },
  { text: '3 5/16"', x: 152.36, y: 290.81, lineTop: 273.625, lineBottom: 320 },
];

const DESKTOP_FONT = 10.93;
const ANDROID_FONT = 21.57;
const IPHONE_FONT = 32.67;

describe("layoutFinLabelBaselines", () => {
  it("1. desktop font: the Mid-length trio comes back exactly unchanged (nothing moves for a mouse)", () => {
    const input = midLengthLabels();
    const result = layoutFinLabelBaselines(input, DESKTOP_FONT);
    expect(result[0]).toBe(input[0]!.y);
    expect(result[1]).toBe(input[1]!.y);
    expect(result[2]).toBe(input[2]!.y);
  });

  it("2. desktop font: the default thruster pair also comes back exactly unchanged (screenshot-baseline guard)", () => {
    const input = thrusterLabels();
    const result = layoutFinLabelBaselines(input, DESKTOP_FONT);
    expect(result[0]).toBe(input[0]!.y);
    expect(result[1]).toBe(input[1]!.y);
  });

  it("3. Pixel 7 font: front and rear unchanged, centre moves down to ~312.90", () => {
    const input = midLengthLabels();
    const result = layoutFinLabelBaselines(input, ANDROID_FONT);
    expect(result[0]).toBe(input[0]!.y);
    expect(result[1]).toBe(input[1]!.y);
    expect(result[2]).toBeCloseTo(312.9, 1);
    // at least FIN_LABEL_CLEARANCE_EM * font below the rear
    expect(result[2]! - result[1]!).toBeGreaterThanOrEqual(FIN_LABEL_CLEARANCE_EM * ANDROID_FONT - 0.01);
    // at or above its own upper bound of 316.76
    expect(result[2]!).toBeLessThanOrEqual(316.76 + 0.01);
  });

  it("4. iPhone font: all three move apart, order holds, and each pair keeps at least the required clearance", () => {
    const input = midLengthLabels();
    const result = layoutFinLabelBaselines(input, IPHONE_FONT);
    expect(result[0]).toBeCloseTo(246.49, 1);
    expect(result[1]).toBeCloseTo(280.8, 1);
    expect(result[2]).toBeCloseTo(315.1, 1);
    // front moved up by no more than 4 units
    expect(input[0]!.y - result[0]!).toBeLessThanOrEqual(4);
    // order front < rear < centre
    expect(result[0]!).toBeLessThan(result[1]!);
    expect(result[1]!).toBeLessThan(result[2]!);
    // each adjacent pair at least FIN_LABEL_CLEARANCE_EM * font apart
    const required = FIN_LABEL_CLEARANCE_EM * IPHONE_FONT;
    expect(result[1]! - result[0]!).toBeGreaterThanOrEqual(required - 0.01);
    expect(result[2]! - result[1]!).toBeGreaterThanOrEqual(required - 0.01);
  });

  it("5. idempotence: feeding the rule its own answer returns that answer unchanged, at every font", () => {
    for (const font of [DESKTOP_FONT, ANDROID_FONT, IPHONE_FONT]) {
      const input = midLengthLabels();
      const first = layoutFinLabelBaselines(input, font);
      const second = layoutFinLabelBaselines(
        input.map((label, i) => ({ ...label, y: first[i]! })),
        font,
      );
      expect(second).toEqual(first);
    }
  });

  it("6. labels whose x-ranges are far apart never interact, whatever their baselines are", () => {
    const input: FinLabelBox[] = [
      { text: "A", x: 10, y: 100, lineTop: 0, lineBottom: 320 },
      { text: "B", x: 500, y: 101, lineTop: 0, lineBottom: 320 },
    ];
    const result = layoutFinLabelBaselines(input, 10);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(101);
  });

  it("7. bounds beat clearance: a pair whose full clearance would overshoot lineBottom stops at the bound, ink bottom still above lineBottom", () => {
    const font = 30;
    const input: FinLabelBox[] = [
      { text: "AAAA", x: 100, y: 300, lineTop: 0, lineBottom: 320 },
      { text: "BBBB", x: 100, y: 310, lineTop: 0, lineBottom: 320 },
    ];
    const result = layoutFinLabelBaselines(input, font);
    const upperBound = 320 - FIN_LABEL_INK_BOTTOM_EM * font;
    expect(result[1]!).toBeLessThanOrEqual(upperBound + 0.001);
    // ink bottom (baseline + 0.11 * font) still sits above lineBottom
    expect(result[1]! + 0.11 * font).toBeLessThanOrEqual(320 + 0.001);
  });

  it("8. never worse: a label whose input baseline already sits below its upper bound is not dragged up to that bound", () => {
    const font = 10;
    const input: FinLabelBox[] = [
      { text: "AAAA", x: 100, y: 400, lineTop: 0, lineBottom: 320 },
    ];
    const result = layoutFinLabelBaselines(input, font);
    expect(result[0]).toBe(400);
  });

  it("9. the width estimate is conservative against the measured imperial strings", () => {
    const measured: Array<[string, number]> = [
      ['6 1/4"', 2.934],
      ['3 5/8"', 3.096],
      ['12"', 1.613],
      ['3 5/16"', 3.526],
      ['1 3/16"', 3.335],
      ['1 1/4"', 2.716],
      ['11"', 1.414],
      ['3/16"', 2.667],
      ['3/8"', 2.237],
      ['1/4"', 2.048],
    ];
    // NOTE: this does NOT cover the metric "159 mm" form, which runs close to the estimate
    // rather than under it — that is why e2e/phone-fins-labels.spec.ts proves the metric case
    // in a real browser instead of trusting this estimate.
    for (const [text, measuredEm] of measured) {
      expect(estimateFinLabelWidth(text, 100)).toBeGreaterThanOrEqual(measuredEm * 100);
    }
  });
});

describe("FIN_LABEL_CHAR_EM", () => {
  it("is derived from the shared CALLOUT_CHAR_PX/CALLOUT_PX.name calibration, not a literal", () => {
    expect(FIN_LABEL_CHAR_EM).toBeCloseTo(0.6091, 4);
  });
});
