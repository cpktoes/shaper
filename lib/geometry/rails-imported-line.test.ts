import { describe, expect, it } from "vitest";
import { formatMark, stationLabel } from "./measure-display";
import { railsImportedLine } from "./rails-imported-line";
import { inchesToMm } from "./units";

describe("railsImportedLine — RAILS' Inputs line", () => {
  const nose = inchesToMm(1.31);
  const center = inchesToMm(2.5);
  const tail = inchesToMm(1.56);

  it("reads the canvas's own Imperial line for the default board", () => {
    expect(railsImportedLine(nose, center, tail, "imperial")).toBe(
      `Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center · 1 9/16" tail @ 12"`,
    );
  });

  it("reads the canvas's own Metric line: whole millimetres, each figure with its unit, station in cm", () => {
    expect(railsImportedLine(nose, center, tail, "metric")).toBe(
      "Thickness details are imported: 33 mm nose @ 30.5 cm · 64 mm center · 40 mm tail @ 30.5 cm",
    );
  });

  it("is built from formatMark and stationLabel, never its own numbers, in both systems", () => {
    const a = inchesToMm(0.97);
    const b = inchesToMm(3.125);
    const c = inchesToMm(2.04);
    for (const system of ["imperial", "metric"] as const) {
      const station = stationLabel(system);
      expect(railsImportedLine(a, b, c, system)).toBe(
        `Thickness details are imported: ${formatMark(a, system)} nose @ ${station}` +
          ` · ${formatMark(b, system)} center · ${formatMark(c, system)} tail @ ${station}`,
      );
    }
  });

  it("puts the three values in nose, center, tail order (three different values, no swap)", () => {
    const line = railsImportedLine(inchesToMm(1), inchesToMm(3), inchesToMm(2), "imperial");
    expect(line).toBe(`Thickness details are imported: 1" nose @ 12" · 3" center · 2" tail @ 12"`);
  });
});
