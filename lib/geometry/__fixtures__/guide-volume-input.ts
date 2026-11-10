/**
 * VOLUME's GUIDE input for a preset, worked out with the same library calls the design store makes
 * (`components/design/design-store.tsx`'s derived memos, and `summarizeDesignWith`, which mirrors them):
 * the board a preset card opens (`presetDesignFields`) with the store's own defaults for a fresh board —
 * the default quick-estimate settings with Import Designed Board ticked, and the rails taking their
 * thicknesses from the foil. Nothing here is a typed number: every value comes out of the app's maths.
 */
import { presetDesignFields } from "../../blanks/preset-blanks";
import {
  deriveEffectiveRails,
  deriveEffectiveVolume,
  deriveQuotedVolumeLitres,
  deriveRailValues,
  deriveTemplateValues,
  designCrossSectionInput,
  designSideProfile,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../design";
import type { VolumeGuideInput } from "../guide-volume";
import { buildOutline } from "../outline";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import { computeRailBands } from "../rail-bands";
import { computeCrossSectionVolume, computeVolume, DEFAULT_VOLUME_SPEC, type VolumeSpec } from "../volume";

/** The store's VOLUME inputs for a board's fields, memo for memo, with the stored quick-estimate settings. */
export function volumeGuideInputFromFields(
  fields: Pick<DesignSummaryFields, "outline" | "rocker" | "foil" | "blank" | "rails">,
  volume: Partial<VolumeSpec> = {},
): VolumeGuideInput {
  const storedVolume: VolumeSpec = { ...DEFAULT_VOLUME_SPEC, ...volume };
  const outlineGeometry = buildOutline(fields.outline);
  const sideProfile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const effectiveRails = deriveEffectiveRails(fields.rails, sideProfile.effectiveFoil, true);
  const railBands = computeRailBands(effectiveRails);
  const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
  const railValues = deriveRailValues(railBands);
  const effectiveVolume = deriveEffectiveVolume(storedVolume, templateValues, railValues);
  const volumeResult = computeVolume(effectiveVolume, templateValues, railValues);
  const crossSection = computeCrossSectionVolume(
    designCrossSectionInput(outlineGeometry, sideProfile, effectiveRails, fields.outline.length),
  );
  return {
    outline: fields.outline,
    outlineGeometry,
    effectiveRails,
    railBands,
    effectiveVolume,
    volumeResult,
    quotedVolumeLitres: deriveQuotedVolumeLitres(volumeResult, crossSection, volumeResult.importingTemplate),
    importing: storedVolume.importTemplateDimensions,
  };
}

/** The store's VOLUME inputs for a preset as its card opens it, with an optional change to the stored
 * quick-estimate settings (Import Designed Board unticked, a slider moved). */
export function guideVolumeInput(presetId: BoardPreset["id"], volume: Partial<VolumeSpec> = {}): VolumeGuideInput {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  return volumeGuideInputFromFields(presetDesignFields(preset), volume);
}
