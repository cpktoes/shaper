import { describe, expect, it } from "vitest";
import { formatDim, formatDimBare, formatLength } from "./measure-display";
import { inchesToMm } from "./units";
import { volumeImportedLine } from "./volume-imported-line";

describe("volumeImportedLine — VOLUME's INPUTS line while Import Designed Board is ticked", () => {
  const length = inchesToMm(72);
  const width = inchesToMm(19);
  const centre = inchesToMm(2.5);

  it("reads the default board in Imperial", () => {
    expect(volumeImportedLine(length, width, centre, "imperial")).toBe(
      `Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`,
    );
  });

  it("reads the default board in Metric, carrying the unit once at the end", () => {
    expect(volumeImportedLine(length, width, centre, "metric")).toBe(
      "Board details are imported: 182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS.",
    );
  });

  it("is the template filled from the display formatters, never its own numbers", () => {
    const l = inchesToMm(74.25);
    const w = inchesToMm(20.375);
    const c = inchesToMm(2.6875);
    expect(volumeImportedLine(l, w, c, "imperial")).toBe(
      `Board details are imported: ${formatLength(l, "imperial")} × ${formatDim(w, "imperial")} × ${formatDim(c, "imperial")}, and the rail shapes from RAILS.`,
    );
    expect(volumeImportedLine(l, w, c, "metric")).toBe(
      `Board details are imported: ${formatDimBare(l, "metric")} × ${formatDimBare(w, "metric")} × ${formatDim(c, "metric")}, and the rail shapes from RAILS.`,
    );
  });
});
