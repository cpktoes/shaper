import { describe, expect, it } from "vitest";
import { hasFineTune } from "./blank";
import { inchesToMm, mm } from "./units";

// hasFineTune is the one test for "this board carries a Nose or Tail @ 12" tweak" (quick 261019-gqo, plan 03,
// P-18): the Reset Fine-Tune button's live state and FOIL's Advanced fold both read it.
describe("hasFineTune", () => {
  it("is false with both 12\" tweaks at zero", () => {
    expect(hasFineTune({ nose12Offset: mm(0), tail12Offset: mm(0) })).toBe(false);
  });

  it("is true with only the nose tweak set", () => {
    expect(hasFineTune({ nose12Offset: inchesToMm(1 / 16), tail12Offset: mm(0) })).toBe(true);
  });

  it("is true with only the tail tweak set", () => {
    expect(hasFineTune({ nose12Offset: mm(0), tail12Offset: inchesToMm(1 / 16) })).toBe(true);
  });

  it("is true with both set", () => {
    expect(hasFineTune({ nose12Offset: inchesToMm(1 / 16), tail12Offset: inchesToMm(-1 / 8) })).toBe(true);
  });

  it("is true for a negative tweak", () => {
    expect(hasFineTune({ nose12Offset: inchesToMm(-1 / 16), tail12Offset: mm(0) })).toBe(true);
  });
});
