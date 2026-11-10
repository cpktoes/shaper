/**
 * ROCKER's GUIDE input for a preset, worked out with the same library calls the design store makes: the
 * board a preset card opens (`presetDesignFields`), and its side profile through `designSideProfile`, the
 * one recipe the store's own `sideProfile` memo mirrors. A patch to the board's blank (another blank, a
 * slide, an ordered rocker, a Thinning Start) is applied before the profile is built, as the store would.
 * Nothing here is a typed number: every value comes out of the app's maths or the board itself.
 */
import { presetDesignFields } from "../../blanks/preset-blanks";
import type { BoardBlank } from "../blank";
import { designSideProfile, LIVE_DESIGN_RULES } from "../design";
import type { RockerGuideFields, RockerGuideInput } from "../guide-rocker";
import { BOARD_PRESETS, type BoardPreset } from "../presets";

/** The store's ROCKER inputs for a board's fields: the fields themselves and their one side profile. */
export function rockerGuideInputFromFields(fields: RockerGuideFields): RockerGuideInput {
  return { ...fields, sideProfile: designSideProfile(fields, LIVE_DESIGN_RULES) };
}

/** The store's ROCKER inputs for a preset as its card opens it, with an optional change to its blank. */
export function guideRockerInput(presetId: BoardPreset["id"], blank: Partial<BoardBlank> = {}): RockerGuideInput {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  const fields = presetDesignFields(preset);
  return rockerGuideInputFromFields({
    outline: fields.outline,
    rocker: fields.rocker,
    foil: fields.foil,
    blank: fields.blank ? { ...fields.blank, ...blank } : null,
  });
}
