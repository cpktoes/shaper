import { describe, expect, it } from "vitest";
import { PHASE14_TODAY } from "./__fixtures__/phase14-today";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBoardProfile } from "./board-profile";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions } from "./rocker";
import { mm } from "./units";

// Every expected number below is the live site's own output (commit ed39f4a), recorded in the
// generated fixture by scripts/extract-phase14-today-golden.ts — never typed here (CLAUDE.md Rule 1).
// The board is the store's DEFAULT_DESIGN_STATE: the default outline, the default foil and hand-set
// rocker, no blank. Its litres are recorded in the pin but asserted by plan 14-05.

describe("the first board a visitor sees, pinned before the curves change (D-26)", () => {
  it("reproduces the default hand-set board's five thicknesses, five rocker numbers and its 1\" sweep", () => {
    const { handSet } = PHASE14_TODAY;
    const length = DEFAULT_BOARD_SPEC.outline.length;
    expect(length).toBe(handSet.boardLengthMm);
    const profile = buildBoardProfile({ length, rocker: DEFAULT_FALLBACK_ROCKER, foil: DEFAULT_FOIL_SPEC, blank: null });
    for (const { key, station } of rockerStationPositions(length)) {
      expect(profile.thicknessAt(station), `thickness ${key}`).toBe(handSet.thicknessMm[key]);
      expect(profile.rockerAt(station), `rocker ${key}`).toBe(handSet.rockerMm[key]);
    }
    for (const point of handSet.sweep) {
      expect(profile.rockerAt(mm(point.s)), `rocker at ${point.s}`).toBe(point.rocker);
      expect(profile.thicknessAt(mm(point.s)), `thickness at ${point.s}`).toBe(point.thickness);
    }
  });
});
