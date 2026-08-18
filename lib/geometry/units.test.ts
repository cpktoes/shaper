import { describe, expect, it } from "vitest";
import {
  MM_PER_INCH,
  cubicMmToLitres,
  formatFeetInches,
  formatInchesFraction,
  inchesToMm,
  mmToInches,
  parseImperial,
} from "./units";

describe("units boundary", () => {
  it("round-trips inches through mm", () => {
    expect(mmToInches(inchesToMm(19))).toBeCloseTo(19, 9);
  });

  it("exposes MM_PER_INCH as 25.4", () => {
    expect(MM_PER_INCH).toBe(25.4);
  });

  it("computes litres from cubic millimetres", () => {
    expect(cubicMmToLitres(1_000_000)).toBe(1);
  });

  describe("formatInchesFraction", () => {
    it("formats a whole inch with no fraction", () => {
      expect(formatInchesFraction(inchesToMm(19))).toBe('19"');
    });

    it("reduces a fraction rather than leaving it unreduced", () => {
      expect(formatInchesFraction(inchesToMm(18.5))).toBe('18 1/2"');
    });

    it("formats a sixteenth", () => {
      expect(formatInchesFraction(inchesToMm(19.0625))).toBe('19 1/16"');
    });

    it("rounds up to a whole inch and carries", () => {
      expect(formatInchesFraction(inchesToMm(18.96875))).toBe('19"');
    });

    it("formats a negative value", () => {
      expect(formatInchesFraction(inchesToMm(-0.5))).toBe('-1/2"');
    });

    it("formats zero", () => {
      expect(formatInchesFraction(inchesToMm(0))).toBe('0"');
    });

    it("honours a denominator argument", () => {
      expect(formatInchesFraction(inchesToMm(0.03125), 32)).toBe('1/32"');
    });
  });

  describe("formatFeetInches", () => {
    it("formats an even 6 feet without float drift", () => {
      expect(formatFeetInches(inchesToMm(72))).toBe(`6'0"`);
    });

    it("formats 6'6\"", () => {
      expect(formatFeetInches(inchesToMm(78))).toBe(`6'6"`);
    });

    it("formats 5'0\"", () => {
      expect(formatFeetInches(inchesToMm(60))).toBe(`5'0"`);
    });
  });

  describe("parseImperial", () => {
    it("parses feet and inches", () => {
      expect(mmToInches(parseImperial(`6'0"`)!)).toBeCloseTo(72, 9);
    });

    it("parses feet only", () => {
      expect(mmToInches(parseImperial(`6'`)!)).toBeCloseTo(72, 9);
    });

    it("parses a whole and fraction", () => {
      expect(mmToInches(parseImperial("19 1/2")!)).toBeCloseTo(19.5, 9);
    });

    it("parses a decimal with a trailing quote", () => {
      expect(mmToInches(parseImperial('18.5"')!)).toBeCloseTo(18.5, 9);
    });

    it("parses a bare fraction", () => {
      expect(mmToInches(parseImperial("1/2")!)).toBeCloseTo(0.5, 9);
    });

    it("returns null for an empty string", () => {
      expect(parseImperial("")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(parseImperial("   ")).toBeNull();
    });

    it("returns null for unparseable text", () => {
      expect(parseImperial("abc")).toBeNull();
    });
  });
});
