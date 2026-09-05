import { describe, expect, it } from "vitest";
import {
  MM_PER_CM,
  MM_PER_INCH,
  centimetresToMm,
  cubicMmToLitres,
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  formatWholeMm,
  inchesToMm,
  mm,
  mmToCentimetres,
  mmToInches,
  parseImperial,
  parseMetric,
  roundToWholeMm,
  squareMmToSquareInches,
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

  it("converts square millimetres to square inches", () => {
    // A 1in x 1in square is 25.4mm x 25.4mm = 645.16 sq mm, and should read back as 1 sq in.
    expect(squareMmToSquareInches(MM_PER_INCH * MM_PER_INCH)).toBeCloseTo(1, 9);
    // A board-scale area (roughly a 74in x 19in outline's rough bounding box) round-trips too.
    expect(squareMmToSquareInches(0)).toBe(0);
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

  describe("formatSignedInchesFraction", () => {
    it("prefixes a positive value with +", () => {
      expect(formatSignedInchesFraction(inchesToMm(2.25))).toBe('+2 1/4"');
    });

    it("keeps the minus on a negative value rather than doubling it", () => {
      expect(formatSignedInchesFraction(inchesToMm(-1.5))).toBe('-1 1/2"');
    });

    it("leaves zero unsigned — dead centre has no direction to report", () => {
      expect(formatSignedInchesFraction(inchesToMm(0))).toBe('0"');
    });

    it("signs on the ROUNDED value, so a hair off zero prints a bare 0", () => {
      // 1/64" rounds to 0 at the default sixteenths; a `+` here would claim a nose-side offset
      // the printed number does not show.
      expect(formatSignedInchesFraction(inchesToMm(0.015625))).toBe('0"');
      expect(formatSignedInchesFraction(inchesToMm(-0.015625))).toBe('0"');
    });

    it("honours a denominator argument", () => {
      expect(formatSignedInchesFraction(inchesToMm(0.03125), 32)).toBe('+1/32"');
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

  describe("formatCentimetres", () => {
    it("keeps a trailing .0 rather than stripping it", () => {
      expect(formatCentimetres(mm(1880))).toBe("188.0");
    });

    it("formats a width converted from inches", () => {
      expect(formatCentimetres(inchesToMm(20.25))).toBe("51.4");
    });

    it("formats a thickness converted from inches", () => {
      expect(formatCentimetres(inchesToMm(2.625))).toBe("6.7");
    });

    it("rounds a value on the half-millimetre boundary away from zero, not on float noise", () => {
      expect(formatCentimetres(mm(514.05))).toBe("51.4");
    });

    it("signs the nudge for a negative value", () => {
      expect(formatCentimetres(mm(-514.05))).toBe("-51.4");
    });

    it("formats zero with a trailing .0", () => {
      expect(formatCentimetres(mm(0))).toBe("0.0");
    });
  });

  describe("mmToCentimetres / centimetresToMm", () => {
    it("round-trips a millimetre value through centimetres", () => {
      expect(mmToCentimetres(mm(1880))).toBe(188);
      expect(centimetresToMm(188)).toBe(1880);
    });

    it("exposes MM_PER_CM as 10", () => {
      expect(MM_PER_CM).toBe(10);
    });
  });

  // D-02's marks family — rail band marks, rocker heights and the five foil station
  // thicknesses — read in whole millimetres, a nearest-rule the same signed-epsilon
  // discipline as formatCentimetres, so the two formatters never disagree about the
  // same value. Expected values below are computed from the known conversion (ten
  // millimetres to the centimetre / 25.4mm to the inch) — there is no prototype
  // ancestor for the metric side, so there is no golden fixture to extract.
  describe("formatWholeMm", () => {
    it("formats a whole millimetre value with no decimal", () => {
      expect(formatWholeMm(mm(67))).toBe("67");
    });

    it("rounds up to the nearest whole millimetre", () => {
      expect(formatWholeMm(mm(66.6))).toBe("67");
    });

    it("rounds down to the nearest whole millimetre", () => {
      expect(formatWholeMm(mm(66.4))).toBe("66");
    });

    it("reads the same value formatCentimetres reads as 6.7 — a thickness reads 67 as a mark", () => {
      // 2.625in * 25.4 = 66.675mm, which formatCentimetres reads as "6.7" (6.675cm rounded).
      expect(formatWholeMm(inchesToMm(2.625))).toBe("67");
      expect(formatCentimetres(inchesToMm(2.625))).toBe("6.7");
    });

    it("rounds a value exactly on the half-millimetre boundary away from zero", () => {
      // Matches formatCentimetres's tie-break discipline, so the two never disagree.
      expect(formatWholeMm(mm(66.5))).toBe("67");
    });

    it("signs the nudge for a negative half-millimetre boundary", () => {
      expect(formatWholeMm(mm(-66.5))).toBe("-67");
    });

    it("formats zero with no decimal point and no minus sign", () => {
      expect(formatWholeMm(mm(0))).toBe("0");
    });
  });

  describe("roundToWholeMm", () => {
    it("snaps up to the nearest whole millimetre", () => {
      expect(roundToWholeMm(mm(66.6))).toBe(mm(67));
    });

    it("snaps down to the nearest whole millimetre", () => {
      expect(roundToWholeMm(mm(66.4))).toBe(mm(66));
    });

    it("leaves an already-whole value unchanged", () => {
      expect(roundToWholeMm(mm(67))).toBe(mm(67));
    });

    it("agrees with formatWholeMm — snapping first never changes the printed value", () => {
      const table = [mm(66.6), mm(66.4), mm(66.5), mm(-66.5), mm(0), inchesToMm(2.625)];
      for (const value of table) {
        expect(formatWholeMm(roundToWholeMm(value))).toBe(formatWholeMm(value));
      }
    });
  });

  describe("parseMetric", () => {
    it("reads a bare number as the field's own unit — cm field", () => {
      expect(parseMetric("51.4", "cm")).toBe(mm(514));
    });

    it("reads a bare number as the field's own unit — mm field", () => {
      expect(parseMetric("67", "mm")).toBe(mm(67));
    });

    it("an explicit mm suffix overrides a cm field", () => {
      expect(parseMetric("514 mm", "cm")).toBe(mm(514));
    });

    it("an explicit cm suffix (no space) overrides a mm field", () => {
      expect(parseMetric("6.7cm", "mm")).toBe(mm(67));
    });

    it("tolerates case and surrounding whitespace on the suffix", () => {
      expect(parseMetric("51.4 CM", "mm")).toBe(mm(514));
      expect(parseMetric(" 51.4cm ", "mm")).toBe(mm(514));
    });

    it("does not accept a comma decimal separator", () => {
      expect(parseMetric("51,4", "cm")).toBeNull();
    });

    it("keeps the sign on a negative value", () => {
      expect(parseMetric("-5.1", "cm")).toBe(mm(-51));
    });

    it("returns null for an empty string", () => {
      expect(parseMetric("", "cm")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(parseMetric("   ", "cm")).toBeNull();
    });

    it("returns null for a suffix with no number", () => {
      expect(parseMetric("cm", "cm")).toBeNull();
    });

    it("returns null for unparseable text", () => {
      expect(parseMetric("abc", "cm")).toBeNull();
    });

    it("returns null for an imperial fraction typed into a metric field", () => {
      expect(parseMetric("5 1/2", "cm")).toBeNull();
    });

    it("returns null for a second decimal point", () => {
      expect(parseMetric("5.1.2", "cm")).toBeNull();
    });

    it("round-trips through formatCentimetres within half a millimetre", () => {
      const table = [mm(514.35), mm(1880), mm(66.7), mm(3.2)];
      for (const value of table) {
        const parsed = parseMetric(formatCentimetres(value), "cm")!;
        expect(Math.abs(parsed - value)).toBeLessThanOrEqual(0.5);
      }
    });

    it("round-trips through formatWholeMm within half a millimetre", () => {
      const table = [mm(514.35), mm(1880), mm(66.7), mm(3.2)];
      for (const value of table) {
        const parsed = parseMetric(formatWholeMm(value), "mm")!;
        expect(Math.abs(parsed - value)).toBeLessThanOrEqual(0.5);
      }
    });
  });
});
