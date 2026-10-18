import { describe, expect, it } from "vitest";
import { keepFiguresTogether } from "./keep-figures-together";

const NBSP = " ";

describe("keepFiguresTogether — a figure never splits across two lines", () => {
  it("joins a whole number to its fraction", () => {
    expect(keepFiguresTogether(`1 5/16" nose @ 12" · 2 1/2" center`)).toBe(`1${NBSP}5/16" nose @ 12" · 2${NBSP}1/2" center`);
  });

  it("joins a number to its unit in Metric", () => {
    expect(keepFiguresTogether("33 mm nose @ 30.5 cm · 30.1 L")).toBe(`33${NBSP}mm nose @ 30.5${NBSP}cm · 30.1${NBSP}L`);
  });

  it("leaves every other space alone, so the line still wraps between words", () => {
    const line = `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail`;
    const kept = keepFiguresTogether(line);
    expect(kept.replaceAll(NBSP, " ")).toBe(line);
    expect(kept.split(NBSP)).toHaveLength(2);
  });

  it("does not join a number to a following word that only starts like a unit", () => {
    expect(keepFiguresTogether("2 mmx 3 Lane")).toBe("2 mmx 3 Lane");
  });
});
