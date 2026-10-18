import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { boardFigures, boardProfileWith } from "./before-after";
import { fitAt, prepareBlank } from "./blank-fit";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBoardProfile } from "./board-profile";
import { LIVE_DESIGN_RULES, summarizeDesign, type DesignSummaryFields } from "./design";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { inchesToMm } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";

// A board's live figures are exactly what every screen shows. Every expected number is computed
// here from the app's own functions — never typed (CLAUDE.md Rule 1). The comparisons with the
// curves and the 12" blend the site used before Phase 14 were retired with those rules after the
// Oct 10 showing (quick 261018-dvu).

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);

/** A preset as the store opens it and its card summarises it (`presetSummary`). */
function presetFields(preset: (typeof BOARD_PRESETS)[number]): DesignSummaryFields {
  return { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
}

/** The first board a visitor sees: the store's DEFAULT_DESIGN_STATE, no blank — the pin's own fields. */
const DEFAULT_FIELDS: DesignSummaryFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rails: DEFAULT_RAIL_BAND_SPEC,
  foil: DEFAULT_FOIL_SPEC,
  railsImportFoilThickness: true,
  volume: DEFAULT_VOLUME_SPEC,
  rocker: DEFAULT_FALLBACK_ROCKER,
  blank: null,
};

describe("the live rules are exactly what every screen shows", () => {
  const boards: { label: string; fields: DesignSummaryFields }[] = [
    ...BOARD_PRESETS.map((preset) => ({ label: preset.name, fields: presetFields(preset) })),
    { label: "the first board a visitor sees", fields: DEFAULT_FIELDS },
  ];

  for (const { label, fields } of boards) {
    it(`${label}: figures equal summarizeDesign and the live side profile`, () => {
      const figures = boardFigures(fields, LIVE_DESIGN_RULES, SETTINGS);
      expect(figures.litres).toBe(summarizeDesign(fields).volumeLitres);
      const blank = fields.blank;
      const live = buildBoardProfile({
        length: fields.outline.length,
        rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
        foil: fields.foil,
        blank: blank
          ? {
              prepared: prepareBlank(blank.copy),
              placement: blank.placement,
              nose12Offset: blank.nose12Offset,
              tail12Offset: blank.tail12Offset,
              deckSkin: blank.deckSkin,
              tipStyle: blank.tipStyle,
              fineTuneSurface: blank.fineTuneSurface,
            }
          : null,
      });
      expect(figures.thicknessMm).toEqual(live.effectiveFoil);
      expect(figures.rockerMm).toEqual(live.stationRocker);
      if (live.blank) {
        const outline = buildOutline(fields.outline);
        const expected = fitAt(live.blank.onBlank, (s) => sampleOutline(outline, s), outline.widePointStation, SETTINGS);
        expect(figures.fits).toBe(expected.fits);
      } else {
        expect(figures.fits).toBeNull();
      }

      // boardProfileWith is that same profile, read along the whole board.
      const profile = boardProfileWith(fields, LIVE_DESIGN_RULES);
      for (let i = 0; inchesToMm(i) <= fields.outline.length; i++) {
        const s = inchesToMm(i);
        expect(profile.rockerAt(s), `rocker at ${i}"`).toBe(live.rockerAt(s));
        expect(profile.thicknessAt(s), `thickness at ${i}"`).toBe(live.thicknessAt(s));
      }
    });
  }
});
