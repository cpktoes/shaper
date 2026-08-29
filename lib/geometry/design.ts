/**
 * Shared design derivation — the one composition a rack card's summary numbers and the Volume
 * screen's own numbers both read, so they can never disagree (RESEARCH.md "key_links": a rack
 * card's volume figure must never diverge from the Volume screen's).
 *
 * `deriveTemplateValues`, `deriveRailValues` and `deriveEffectiveVolume` are the exact bodies of
 * `components/design/design-store.tsx`'s `templateValues`, `railValues` and `effectiveVolume`
 * `useMemo`s, moved here verbatim (this is an extraction, not a rewrite) so a formula never lives
 * only inside a component (CLAUDE.md Rule 1). The store now calls these instead of holding the
 * arithmetic inline; its `useMemo`s and their dependency arrays are unchanged, so recompute
 * granularity on every design screen stays exactly what it was before this file existed.
 *
 * No React, browser API or database imports — this file is pure geometry composition, verifiable
 * in isolation exactly like every other module under lib/geometry/.
 */

import type { OutlineSpec } from "./board";
import type { FoilSpec } from "./foil";
import type { OutlineGeometry } from "./outline";
import { buildOutline, sampleOutline } from "./outline";
import { computeRailBands, type RailBandSpec, type RailBandsOutput } from "./rail-bands";
import {
  computeCrossSectionVolume,
  computeVolume,
  type CrossSectionVolumeResult,
  type VolumeRailValues,
  type VolumeResult,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "./volume";
import type { Litres, Mm } from "./units";

/** Same shape as `design-store.tsx`'s `templateValues` memo. */
export function deriveTemplateValues(outline: OutlineSpec, geometry: OutlineGeometry): VolumeTemplateValues {
  return {
    area: geometry.area,
    length: outline.length,
    widePointWidth: outline.widePointWidth,
    noseWidthAt12: geometry.noseWidthAt12in,
    tailWidthAt12: geometry.tailWidthAt12in,
  };
}

/** Same shape as `design-store.tsx`'s `railValues` memo. */
export function deriveRailValues(railBands: RailBandsOutput): VolumeRailValues {
  return {
    noseThickness: railBands.nose.boardThickness,
    centerThickness: railBands.center.boardThickness,
    tailThickness: railBands.tail.boardThickness,
    noseProfile: railBands.nose.profile,
    centerProfile: railBands.center.profile,
    tailProfile: railBands.tail.profile,
  };
}

/**
 * Same shape as `design-store.tsx`'s `effectiveVolume` memo — the derived-value equivalent of the
 * prototype's `syncFromTemplate`: `volume` with length/width/centerThickness overridden per the
 * import toggles, produced without an effect that writes back into state.
 */
export function deriveEffectiveVolume(
  volume: VolumeSpec,
  templateValues: VolumeTemplateValues,
  railValues: VolumeRailValues,
): VolumeSpec {
  if (!volume.importTemplateDimensions) return volume;
  const centerThickness = volume.importRailThickness ? railValues.centerThickness : volume.centerThickness;
  return {
    ...volume,
    length: templateValues.length,
    width: templateValues.widePointWidth,
    centerThickness,
  };
}

/**
 * The one place thickness flows from the foil (ROCKER screen) into the rail bands (RAILS screen)
 * — D-09. With the link on, each of the three rail sections' `boardThickness` is replaced by the
 * matching foil station: `foil.nose12` -> `rails.nose`, `foil.center` -> `rails.center`,
 * `foil.tail12` -> `rails.tail` (the planner note limiting RAILS to three of the foil's five
 * stations). The two tip stations never appear here — they exist only for the side profile and
 * the volume integration.
 *
 * Deliberately takes no rocker argument (D-11): adjusting the rocker line alone can never move a
 * rail band number, because this function has nothing rocker-shaped to read. There is no
 * rocker-to-rail formula to invent.
 *
 * With the link off, `rails` is returned untouched — same shape as `deriveEffectiveVolume` above:
 * a derived read, never a write back into state.
 */
export function deriveEffectiveRails(
  rails: RailBandSpec,
  foil: FoilSpec,
  importFoilThickness: boolean,
): RailBandSpec {
  if (!importFoilThickness) return rails;
  return {
    ...rails,
    nose: { ...rails.nose, boardThickness: foil.nose12 },
    center: { ...rails.center, boardThickness: foil.center },
    tail: { ...rails.tail, boardThickness: foil.tail12 },
  };
}

/** The subset of a stored design `summarizeDesign` needs to produce a rack card's four numbers. */
export interface DesignSummaryFields {
  outline: OutlineSpec;
  rails: RailBandSpec;
  foil: FoilSpec;
  railsImportFoilThickness: boolean;
  volume: VolumeSpec;
}

/**
 * The one rule deciding which of the two litres figures the app quotes (CONTEXT.md D-13's
 * transparency half): a board importing its drawn template dimensions is a board designed in the
 * app, so it gets the accurate cross-section figure; a board with the import toggle off is the
 * Volume screen being used as a standalone quick estimator, so it gets the estimator's own figure.
 * One rule, one place, read by every consumer (the Volume screen, rack cards, the Summary order
 * form, the printed template) — the thing that must never happen is two different litres for one
 * board shown on two different screens (threat T-04-11).
 */
export function deriveQuotedVolumeLitres(
  estimator: VolumeResult,
  crossSection: CrossSectionVolumeResult,
  importingTemplate: boolean,
): Litres {
  return importingTemplate ? crossSection.volumeLitres : estimator.volumeLitres;
}

/** The four numbers a rack card shows (D-12): length x width x thickness, plus volume in litres. */
export interface DesignSummary {
  length: Mm;
  widePointWidth: Mm;
  centerThickness: Mm;
  volumeLitres: Litres;
}

/**
 * Composes `buildOutline` -> `deriveEffectiveRails` -> `computeRailBands` -> the three
 * derivations above -> `computeVolume` and `computeCrossSectionVolume` -> `deriveQuotedVolumeLitres`,
 * so a rack card's summary numbers are produced by the exact same pipeline the RAILS and Volume
 * screens show, not a second parallel calculation that could drift from either.
 */
export function summarizeDesign(fields: DesignSummaryFields): DesignSummary {
  const outlineGeometry = buildOutline(fields.outline);
  const effectiveRails = deriveEffectiveRails(fields.rails, fields.foil, fields.railsImportFoilThickness);
  const railBands = computeRailBands(effectiveRails);
  const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
  const railValues = deriveRailValues(railBands);
  const effectiveVolume = deriveEffectiveVolume(fields.volume, templateValues, railValues);
  const volumeResult = computeVolume(effectiveVolume, templateValues, railValues);
  const crossSectionVolume = computeCrossSectionVolume({
    halfWidthAt: (station) => sampleOutline(outlineGeometry, station),
    foil: fields.foil,
    rails: effectiveRails,
    length: fields.outline.length,
  });
  const quotedVolumeLitres = deriveQuotedVolumeLitres(volumeResult, crossSectionVolume, volumeResult.importingTemplate);

  return {
    length: templateValues.length,
    widePointWidth: templateValues.widePointWidth,
    centerThickness: railValues.centerThickness,
    volumeLitres: quotedVolumeLitres,
  };
}
