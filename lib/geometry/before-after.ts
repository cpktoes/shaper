/**
 * A board's figures under the live rules — its five station thicknesses, five rocker numbers, litres
 * and "fits" verdict — read through the one pipeline every screen reads (`buildBoardProfile` for the
 * stations, `summarizeDesignWith` for the litres, `fitAt` for the verdict), never a second
 * calculation that could drift from what a shaper sees. Each board is worked out with its own stored
 * Thinning Starts, through `thinningStartsOf`.
 *
 * The file is named for the Phase 14 before-and-after comparison it held (D-15, D-18): the curves
 * and the 12" blend the site used before Phase 14, and the reports and pictures that compared them
 * with the live ones, were retired after the Oct 10 showing (quick 261018-dvu). What is left reads
 * the live side only, for `scripts/phase14-before-after.ts` (the curve samples behind the Arctic
 * tape check) and thinning-start-paths.test.ts.
 *
 * Pure: no React, browser API or database import (CLAUDE.md Rule 1), unit-tested in
 * before-after.test.ts.
 */
import { fitAt, thinningStartsOf } from "./blank-fit";
import type { FitSettings } from "./blank";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { prepareBoardBlank } from "./custom-rocker";
import { summarizeDesignWith, type DesignRules, type DesignSummaryFields } from "./design";
import type { FoilStationKey } from "./foil";
import { buildOutline, sampleOutline } from "./outline";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import type { Mm } from "./units";

/** One board's figures under one set of rules. */
export interface BoardFigures {
  /** The five station thicknesses — what RAILS reads. */
  thicknessMm: Record<FoilStationKey, Mm>;
  /** The rocker at the five stations. */
  rockerMm: Record<FoilStationKey, Mm>;
  /** The litres the board's cards and VOLUME quote. */
  litres: number;
  /** Whether the board fits its blank where it sits; null for a board with no blank. */
  fits: boolean | null;
}

/**
 * The board's side profile under a chosen set of rules — exactly the profile `summarizeDesignWith`
 * builds for the same board and rules, so stations, litres and pictures all describe one board.
 */
export function boardProfileWith(fields: DesignSummaryFields, rules: DesignRules): BoardSideProfile {
  const { blank } = fields;
  return buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
    foil: fields.foil,
    blank: blank
      ? {
          prepared: prepareBoardBlank(blank, rules.prepare),
          placement: blank.placement,
          nose12Offset: blank.nose12Offset,
          tail12Offset: blank.tail12Offset,
          deckSkin: blank.deckSkin,
          tipStyle: blank.tipStyle,
          fineTuneSurface: blank.fineTuneSurface,
          ...thinningStartsOf(blank),
        }
      : null,
  });
}

/**
 * A board's five thicknesses, five rocker numbers, litres and fit verdict under `rules`. The verdict
 * is judged at the board's own placement (clamped on read, as every screen does) with `settings`'
 * width margin and planer depth; a board with no blank has no verdict.
 */
export function boardFigures(fields: DesignSummaryFields, rules: DesignRules, settings: FitSettings): BoardFigures {
  const profile = boardProfileWith(fields, rules);
  let fits: boolean | null = null;
  if (profile.blank) {
    const outline = buildOutline(fields.outline);
    fits = fitAt(profile.blank.onBlank, (s) => sampleOutline(outline, s), outline.widePointStation, settings).fits;
  }
  return {
    thicknessMm: { ...profile.effectiveFoil },
    rockerMm: { ...profile.stationRocker },
    litres: summarizeDesignWith(fields, rules).volumeLitres,
    fits,
  };
}
