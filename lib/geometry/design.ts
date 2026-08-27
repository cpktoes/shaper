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
import type { OutlineGeometry } from "./outline";
import { buildOutline } from "./outline";
import { computeRailBands, type RailBandSpec, type RailBandsOutput } from "./rail-bands";
import {
  computeVolume,
  type VolumeRailValues,
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

/** The subset of a stored design `summarizeDesign` needs to produce a rack card's four numbers. */
export interface DesignSummaryFields {
  outline: OutlineSpec;
  rails: RailBandSpec;
  volume: VolumeSpec;
}

/** The four numbers a rack card shows (D-12): length x width x thickness, plus volume in litres. */
export interface DesignSummary {
  length: Mm;
  widePointWidth: Mm;
  centerThickness: Mm;
  volumeLitres: Litres;
}

/**
 * Composes `buildOutline` -> `computeRailBands` -> the three derivations above ->
 * `computeVolume`, so a rack card's summary numbers are produced by the exact same pipeline the
 * Volume screen runs, not a second parallel calculation that could drift from it.
 */
export function summarizeDesign(fields: DesignSummaryFields): DesignSummary {
  const outlineGeometry = buildOutline(fields.outline);
  const railBands = computeRailBands(fields.rails);
  const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
  const railValues = deriveRailValues(railBands);
  const effectiveVolume = deriveEffectiveVolume(fields.volume, templateValues, railValues);
  const volumeResult = computeVolume(effectiveVolume, templateValues, railValues);

  return {
    length: templateValues.length,
    widePointWidth: templateValues.widePointWidth,
    centerThickness: railValues.centerThickness,
    volumeLitres: volumeResult.volumeLitres,
  };
}
