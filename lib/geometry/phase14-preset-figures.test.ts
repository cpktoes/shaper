import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import record from "./__fixtures__/phase14-preset-figures.json";
import { PHASE14_TODAY } from "./__fixtures__/phase14-today";
import { prepareBlank } from "./blank-fit";
import { buildBoardProfile } from "./board-profile";
import type { FoilStationKey } from "./foil";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { presetSummary } from "./summary-line";
import { inchesToMm } from "./units";

/**
 * The four preset cards' figures, recorded from the app by scripts/extract-phase14-preset-figures.ts
 * (Phase 14 acceptance 5, D-27). Nothing here types a figure: the record is generated from the live
 * app at each go-live, and today's numbers come from the generated pin (`PHASE14_TODAY`).
 */

const KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/** What a card shows today: the board clicking it opens, read the way the generator reads it. */
function liveFigures(preset: BoardPreset) {
  const fields = presetDesignFields(preset);
  const profile = buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker,
    foil: fields.foil,
    blank: {
      prepared: prepareBlank(fields.blank.copy),
      placement: fields.blank.placement,
      nose12Offset: fields.blank.nose12Offset,
      tail12Offset: fields.blank.tail12Offset,
      deckSkin: fields.blank.deckSkin,
      tipStyle: fields.blank.tipStyle,
      fineTuneSurface: fields.blank.fineTuneSurface,
    },
  });
  return {
    thicknessMm: profile.effectiveFoil,
    rockerMm: profile.stationRocker,
    litres: presetSummary(preset).volumeLitres,
  };
}

function recorded(id: string) {
  const row = record.presets.find((preset) => preset.id === id);
  if (!row) throw new Error(`${id} is not in phase14-preset-figures.json — re-run the generator.`);
  return row;
}

function pinned(id: string) {
  const row = PHASE14_TODAY.presets.find((preset) => preset.id === id);
  if (!row) throw new Error(`${id} is not in phase14-today-golden.json — re-run its generator.`);
  return row;
}

describe("the four preset cards, recorded from the app (acceptance 5, D-27)", () => {
  it("records exactly the four presets, in the cards' order", () => {
    expect(record.presets.map((preset) => preset.id)).toEqual(BOARD_PRESETS.map((preset) => preset.id));
    expect(["curves", "tips"]).toContain(record.step);
  });

  // A failure here means a rule moved the cards: re-run the generator, never edit the record.
  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: the live five thicknesses, five rocker numbers and litres are the record's`, () => {
      const live = liveFigures(preset);
      const row = recorded(preset.id);
      for (const key of KEYS) {
        expect(live.thicknessMm[key], `thickness at ${key}`).toBe(row.thicknessMm[key]);
        expect(live.rockerMm[key], `rocker at ${key}`).toBe(row.rockerMm[key]);
      }
      expect(live.litres).toBe(row.litres);
    });
  }
});

describe("no preset station number moves more than the brief's 0.015\" from today's (acceptance 5)", () => {
  // The brief's own bound, compared against the generated pin — never tightened, never rounded (D-27).
  const BRIEF_BOUND = inchesToMm(0.015);

  for (const preset of BOARD_PRESETS) {
    it(`${preset.id}: all five thicknesses and five rocker numbers are within the bound`, () => {
      const live = liveFigures(preset);
      const today = pinned(preset.id);
      for (const key of KEYS) {
        expect(Math.abs(live.thicknessMm[key] - today.thicknessMm[key]), `thickness at ${key}`).toBeLessThanOrEqual(
          BRIEF_BOUND,
        );
        expect(Math.abs(live.rockerMm[key] - today.rockerMm[key]), `rocker at ${key}`).toBeLessThanOrEqual(
          BRIEF_BOUND,
        );
      }
    });
  }
});
