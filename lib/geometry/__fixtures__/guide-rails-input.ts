/**
 * RAILS' GUIDE input for a preset, worked out with the same library calls the design store makes
 * (`components/design/design-store.tsx`'s `effectiveRails` and `railBands` memos): the board a preset card opens
 * (`presetDesignFields`), its rails taking their thicknesses from the foil as a fresh board does (Import Rocker &
 * Foil Values ticked). Nothing here is a typed number: every value comes out of the app's maths.
 */
import { presetDesignFields } from "../../blanks/preset-blanks";
import { deriveEffectiveRails, designSideProfile, LIVE_DESIGN_RULES } from "../design";
import type { RailsGuideInput } from "../guide-rails";
import { buildOutline } from "../outline";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import { computeRailBands, type RailBandSpec } from "../rail-bands";

/** The store's RAILS inputs for a board's fields: the rails as stored, the foil they may import from. */
export function railsGuideInputFromFields(
  fields: ReturnType<typeof presetDesignFields>,
  railsImportFoilThickness = true,
): RailsGuideInput {
  const outlineGeometry = buildOutline(fields.outline);
  const sideProfile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const effectiveRails = deriveEffectiveRails(fields.rails, sideProfile.effectiveFoil, railsImportFoilThickness);
  return {
    effectiveRails,
    railBands: computeRailBands(effectiveRails),
    railsImportFoilThickness,
    outlineGeometry,
    boardLength: fields.outline.length,
  };
}

/** A preset as its card opens it, with an optional change to its stored rails (a box ticked, a slider moved). */
export function guideRailsInput(
  presetId: BoardPreset["id"],
  rails: (stored: RailBandSpec) => RailBandSpec = (stored) => stored,
  railsImportFoilThickness = true,
): RailsGuideInput {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  const fields = presetDesignFields(preset);
  return railsGuideInputFromFields({ ...fields, rails: rails(fields.rails) }, railsImportFoilThickness);
}
