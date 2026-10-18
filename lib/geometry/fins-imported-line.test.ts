import { describe, expect, it } from "vitest";
import type { TailShape } from "./board";
import { finsImportedLine } from "./fins-imported-line";
import { inchesToMm } from "./units";

const length = inchesToMm(72);
const tailWidth12 = inchesToMm(14.75);
const diamondDepth = inchesToMm(3);

function line(tail: TailShape, system: "imperial" | "metric", depth = diamondDepth) {
  return finsImportedLine({ length, tailWidth12, tail, diamondDepth: depth }, system);
}

describe("finsImportedLine — FINS' INPUTS line while Import Designed Board is ticked", () => {
  it("squash: the tail block, no depth", () => {
    const tail: TailShape = { kind: "squash", endWidth: inchesToMm(4) };
    expect(line(tail, "imperial")).toBe(
      `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail · 4" tail block`,
    );
    expect(line(tail, "metric")).toBe(
      "TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Squash tail · 10.2 cm tail block",
    );
  });

  it("diamond: the tail block and the depth, depth read as a mark", () => {
    const tail: TailShape = { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) };
    expect(line(tail, "imperial")).toBe(
      `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Diamond tail · 10" tail block · 3" deep`,
    );
    expect(line(tail, "metric")).toBe(
      "TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Diamond tail · 25.4 cm tail block · 76 mm deep",
    );
  });

  it("diamond prints the clamped depth it is passed, never the stored one", () => {
    const tail: TailShape = { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) };
    expect(line(tail, "imperial", inchesToMm(2))).toMatch(/ · 2" deep$/);
    expect(line(tail, "imperial", inchesToMm(2))).not.toContain(`3" deep`);
  });

  it("swallow: the tail block and its crotch depth", () => {
    const tail: TailShape = { kind: "swallow", endWidth: inchesToMm(8), crotchDepth: inchesToMm(1.5) };
    expect(line(tail, "imperial")).toBe(
      `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Swallow tail · 8" tail block · 1 1/2" deep`,
    );
    expect(line(tail, "metric")).toBe(
      "TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Swallow tail · 20.3 cm tail block · 38 mm deep",
    );
  });

  it("pin: ends at the tail name, no tail block", () => {
    const tail: TailShape = { kind: "pin" };
    expect(line(tail, "imperial")).toBe(`TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Pin tail`);
    expect(line(tail, "metric")).toBe(
      "TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Pin tail",
    );
    expect(line(tail, "imperial")).not.toContain("tail block");
  });

  it("round: ends at the tail name, no tail block", () => {
    const tail: TailShape = { kind: "round" };
    expect(line(tail, "imperial")).toBe(`TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Round tail`);
    expect(line(tail, "metric")).toBe(
      "TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Round tail",
    );
    expect(line(tail, "metric")).not.toContain("tail block");
  });
});
