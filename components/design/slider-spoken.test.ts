import { describe, expect, it } from "vitest";
import { LABEL_VALUE_SEPARATOR, spokenSlider } from "./slider-spoken";

describe("spokenSlider — a slider's name and value as its label prints them (quick 261115-dv3)", () => {
  it("reads a bare name with its value beside it", () => {
    expect(spokenSlider({ label: "Nose Angle", displayValue: "55°" })).toEqual({ name: "Nose Angle", valueText: "55°" });
    expect(spokenSlider({ label: "Width", displayValue: "51.4 cm" })).toEqual({ name: "Width", valueText: "51.4 cm" });
  });

  it("splits a label that folds the value in after the house separator", () => {
    expect(spokenSlider({ label: `Center Thickness${LABEL_VALUE_SEPARATOR}2 1/2"` })).toEqual({
      name: "Center Thickness",
      valueText: '2 1/2"',
    });
    // Only the first separator splits; the value keeps anything after it, exactly as printed.
    expect(spokenSlider({ label: "Deck Profile — 1 1/4\" (Tapered Thickness)" })).toEqual({
      name: "Deck Profile",
      valueText: '1 1/4" (Tapered Thickness)',
    });
    expect(spokenSlider({ label: "Placement — pick a blank first" })).toEqual({ name: "Placement", valueText: "pick a blank first" });
  });

  it("speaks a value box as the value", () => {
    expect(spokenSlider({ label: "Nose Tip", valueBox: '5/8"' })).toEqual({ name: "Nose Tip", valueText: '5/8"' });
  });

  it("lets a row say something else, and keeps the two apart", () => {
    expect(spokenSlider({ label: "", valueBox: '5/8"', sliderLabel: "Nose Tip rocker", sliderValueText: "16 mm" })).toEqual({
      name: "Nose Tip rocker",
      valueText: "16 mm",
    });
    expect(spokenSlider({ label: "Tail Thinning Starts — 12\"", sliderLabel: "Tail Thinning Starts" })).toEqual({
      name: "Tail Thinning Starts",
      valueText: '12"',
    });
  });

  it("speaks the name alone when the row prints no value, and nothing for an empty label", () => {
    expect(spokenSlider({ label: "Board Type" })).toEqual({ name: "Board Type", valueText: undefined });
    expect(spokenSlider({ label: "" })).toEqual({ name: undefined, valueText: undefined });
    // A hyphen or an unspaced dash is part of a name, never the separator.
    expect(spokenSlider({ label: "Toe-In" })).toEqual({ name: "Toe-In", valueText: undefined });
  });
});
