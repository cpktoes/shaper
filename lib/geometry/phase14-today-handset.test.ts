import { describe, expect, it } from "vitest";
import { PHASE14_TODAY } from "./__fixtures__/phase14-today";
import { DEFAULT_BOARD_SPEC } from "./board";
import { prepareBlank } from "./blank-fit";
import { buildBoardProfile } from "./board-profile";
import { summarizeDesignWith, type DesignSummaryFields } from "./design";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions } from "./rocker";
import { mm } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";

// Every expected number below is the live site's own output (commit ed39f4a), recorded in the
// generated fixture by scripts/extract-phase14-today-golden.ts — never typed here (CLAUDE.md Rule 1).
// The board is the store's DEFAULT_DESIGN_STATE: the default outline, the default foil and hand-set
// rocker, no blank. From Phase 14 (D-13) the live app draws it with the square-root rule; the curve
// the pin was recorded with stays callable by name (`handSetCurve: "pchip"`, D-25), and these tests
// prove that name still reproduces every pinned number exactly.

/** The fields the pin's generator summarised: the store's DEFAULT_DESIGN_STATE. */
const DEFAULT_BOARD_FIELDS: DesignSummaryFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rails: DEFAULT_RAIL_BAND_SPEC,
  foil: DEFAULT_FOIL_SPEC,
  railsImportFoilThickness: true,
  volume: DEFAULT_VOLUME_SPEC,
  rocker: DEFAULT_FALLBACK_ROCKER,
  blank: null,
};

describe("the first board a visitor sees, reproduced by today's curve kept by name (D-25, D-26)", () => {
  it("reproduces the default hand-set board's five thicknesses, five rocker numbers and its 1\" sweep", () => {
    const { handSet } = PHASE14_TODAY;
    const length = DEFAULT_BOARD_SPEC.outline.length;
    expect(length).toBe(handSet.boardLengthMm);
    const profile = buildBoardProfile({
      length,
      rocker: DEFAULT_FALLBACK_ROCKER,
      foil: DEFAULT_FOIL_SPEC,
      blank: null,
      handSetCurve: "pchip",
    });
    for (const { key, station } of rockerStationPositions(length)) {
      expect(profile.thicknessAt(station), `thickness ${key}`).toBe(handSet.thicknessMm[key]);
      expect(profile.rockerAt(station), `rocker ${key}`).toBe(handSet.rockerMm[key]);
    }
    for (const point of handSet.sweep) {
      expect(profile.rockerAt(mm(point.s)), `rocker at ${point.s}`).toBe(point.rocker);
      expect(profile.thicknessAt(mm(point.s)), `thickness at ${point.s}`).toBe(point.thickness);
    }
  });

  it("reproduces the default hand-set board's pinned litres through the one pipeline, on today's curve by name", () => {
    const summary = summarizeDesignWith(DEFAULT_BOARD_FIELDS, { prepare: prepareBlank, handSetCurve: "pchip" });
    expect(summary.volumeLitres).toBe(PHASE14_TODAY.handSet.litres);
  });

  it("moves the default hand-set board's litres on the live square-root rule (the curve between stations moved)", () => {
    const summary = summarizeDesignWith(DEFAULT_BOARD_FIELDS, { prepare: prepareBlank, handSetCurve: "root" });
    expect(Number.isFinite(summary.volumeLitres)).toBe(true);
    expect(summary.volumeLitres).not.toBe(PHASE14_TODAY.handSet.litres);
  });
});
