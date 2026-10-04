/**
 * The one place a `DesignSummary` becomes the text a shaper reads on a card or a menu row.
 *
 * Both `board-rack-card.tsx`'s existing rack card line and the settings menu's Units row
 * examples read through this module, so the same four numbers are composed the same way in
 * both systems no matter where they show up. Pure — no React, browser API or database imports
 * (CLAUDE.md Rule 1) — so the composition itself can be verified in isolation, exactly like
 * every other module under `lib/geometry/`.
 */

import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { summarizeDesign, type DesignSummary } from "./design";
import type { BoardPreset } from "./presets";
import { formatCentimetres, formatFeetInches, formatInchesFraction, type Mm, type UnitsSystem } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";

/**
 * The full four-number line a rack or preset card shows: length, width, thickness, then
 * volume in litres. Imperial composes exactly the string `CardMetadataLine` renders today —
 * `formatFeetInches`, two `formatInchesFraction` widths, then litres to one decimal followed
 * by " L", joined by " · " (U+00B7 middle dot) — byte-identical until a shaper touches the
 * chooser (D-03's "everyone sees Imperial exactly as they do now"). Metric composes the same
 * three dimensions through `formatCentimetres`, joined by " × " (U+00D7 multiplication sign),
 * then a single " cm" for the whole triplet, then the identical litres part (D-01, D-02's dims
 * family, D-03: the unit is carried once, at the end).
 */
export function formatSummaryLine(summary: DesignSummary, system: UnitsSystem): string {
  const litresPart = `${summary.volumeLitres.toFixed(1)} L`;
  if (system === "metric") {
    const dims = [
      formatCentimetres(summary.length),
      formatCentimetres(summary.widePointWidth),
      formatCentimetres(summary.centerThickness),
    ].join(" × ");
    return `${dims} cm · ${litresPart}`;
  }
  const dims = [
    formatFeetInches(summary.length),
    formatInchesFraction(summary.widePointWidth),
    formatInchesFraction(summary.centerThickness),
  ].join(" · ");
  return `${dims} · ${litresPart}`;
}

/**
 * The same three dimensions as `formatSummaryLine`, with the litres part omitted — the D-06
 * live example shown under each Units row in the gear menu ("look at what you'll get before
 * you pick it"), not a board's full summary line.
 */
export function formatDimsExample(summary: DesignSummary, system: UnitsSystem): string {
  if (system === "metric") {
    return `${[
      formatCentimetres(summary.length),
      formatCentimetres(summary.widePointWidth),
      formatCentimetres(summary.centerThickness),
    ].join(" × ")} cm`;
  }
  return [
    formatFeetInches(summary.length),
    formatInchesFraction(summary.widePointWidth),
    formatInchesFraction(summary.centerThickness),
  ].join(" · ");
}

/**
 * A board's length by its widest width, on one line — the TEMPLATE tile's line in the phone menu's
 * screen pictures (quick 261003-q2f). Imperial reads `6'2" × 18 3/4"`, each value carrying its own
 * mark as everywhere in Imperial; Metric reads `188.0 × 47.6 cm`, centimetres to one decimal with the
 * unit once at the end (CLAUDE.md Rule 2: dims, one unit per line of running text). Built from the
 * same formatters as `formatSummaryLine`, so the tile and the preset card never disagree.
 */
export function formatLengthByWidth(length: Mm, width: Mm, system: UnitsSystem): string {
  if (system === "metric") return `${formatCentimetres(length)} × ${formatCentimetres(width)} cm`;
  return `${formatFeetInches(length)} × ${formatInchesFraction(width)}`;
}

/**
 * The `DesignSummary` a preset card shows — the exact numbers a shaper would get by clicking
 * that preset, not a second, divergent computation (D-13). `applyPreset`
 * (`components/design/design-store.tsx`) rebuilds the store as `{ ...DEFAULT_DESIGN_STATE,
 * ...presetDesignFields(preset), boardStarted: true, dirty: true }` — the preset's outline, foil,
 * rails, fins, hand-set rocker and its blank (D-03) from ONE pure mapping
 * (`lib/blanks/preset-blanks.ts`), and every field that mapping does not set (crucially
 * `railsImportFoilThickness: true` and `volume: DEFAULT_VOLUME_SPEC`) from `DEFAULT_DESIGN_STATE`.
 * This function spreads the same mapping, so a preset card's numbers — its litres built from the
 * same side profile, in the same blank — and a freshly-applied preset's rack card and VOLUME screen
 * always agree. Guarded by a source-contract test in `summary-line.test.ts` that reads
 * `design-store.tsx` itself and fails if either default field it assumes ever changes.
 */
export function presetSummary(preset: BoardPreset): DesignSummary {
  return summarizeDesign({
    ...presetDesignFields(preset),
    railsImportFoilThickness: true,
    volume: DEFAULT_VOLUME_SPEC,
  });
}
