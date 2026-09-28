/**
 * Foil geometry — thickness distribution along the board's length, stacked on the rocker line to
 * form the deck curve.
 *
 * No prototype ancestor. The prototype's own thickness model was three typed values (nose/
 * center/tail) plus a fixed `tipThickness = 0.3` constant shared by both ends
 * (reference/project/Rails.dc.html's `buildSideProfile`) — not a five-station curve a shaper
 * could edit with real tip thicknesses. This module is what replaces it (CONTEXT.md D-05).
 *
 * Deviation from the approved design (.planning/design/GEOMETRY-MODULE.md), numbered per this
 * codebase's convention (see `lib/geometry/volume.ts`'s header for the same pattern):
 *
 * 1. STATION MODEL. GEOMETRY-MODULE.md specifies a curve-plus-max-thickness-station `FoilSpec
 *    { curve, maxThicknessStation }`. This file deliberately implements the later, locked
 *    five-station blank-datasheet model from CONTEXT.md D-05 instead: thickness is defined at
 *    all five stations, including both tips, so a drawn board never comes to a knife edge and the
 *    real tip thicknesses finally replace `volume.ts`'s hard-coded 1/2"/3/8" tip assumptions.
 * 2. ONE MONOTONE SAMPLER (Phase 11 D-13). The curve through the five stations is now drawn with
 *    textbook pchip (`lib/geometry/pchip.ts`) — the app's one monotone sampler, the same one a
 *    real foam blank's rocker, thickness and width go through — instead of the older
 *    Fritsch–Carlson sampler with its circle-of-radius-three clamp. So a hand-set deck and a deck
 *    read off a blank are the same maths. Every station still reads its own thickness exactly;
 *    only the curve between stations moved, by a hair (the default board's cross-section volume
 *    went from about 29.79 L to 29.94 L).
 */

import { preparePchip, type SplinePoint } from "./pchip";
import { rockerStationPositions } from "./rocker";
import { type Mm, inchesToMm, mm } from "./units";

export type FoilStationKey = "tailTip" | "tail12" | "center" | "nose12" | "noseTip";

/** Parametric controls for the deck curve — the single place the ROCKER screen's thickness
 * sliders and typed fields write to. Five thickness values, including both tips (D-05). */
export interface FoilSpec {
  noseTip: Mm;
  nose12: Mm;
  center: Mm;
  tail12: Mm;
  tailTip: Mm;
}

/**
 * Inch-domain bounds every foil slider, drag solve and typed field shares — one definition,
 * imported everywhere, never restated. `min` is the least foam a board may be anywhere on its
 * blank, tips included: 1/4", raised from 1/8" by the founder on 2026-09-28 (Phase 13 item 4:
 * "no boards should have a 1/8" tip anyway"). `MIN_FOIL_THICKNESS_MM` in blank-fit.ts is this same
 * figure in millimetres (`inchesToMm(FOIL_THICKNESS_RANGE_IN.min)`), so a control can never offer a
 * thickness the fit check refuses. The ROCKER view frame reads only `max`.
 */
export const FOIL_THICKNESS_RANGE_IN = { min: 0.25, max: 5, step: 0.0625 } as const;

/**
 * Starting values for a new board's foil, authored through `inchesToMm()`.
 *
 * `nose12`, `center` and `tail12` are the EXACT values `DEFAULT_RAIL_BAND_SPEC` already carries
 * (`lib/geometry/rail-bands.ts`'s nose/center/tail `boardThickness`) and `DEFAULT_VOLUME_SPEC`'s
 * own `centerThickness` — so a default board's foil, rails and volume-estimator centre thickness
 * all agree by construction, before rocker/foil are even linked to rails (that link is a later
 * plan's job; this file only guarantees the numbers already match).
 *
 * `noseTip` and `tailTip` — a 1/2" nose tip and a 5/8" tail tip — are the founder's own choice of
 * 2026-09-26 (quick task 260926-uub), the numbers he actually shapes to. They replace a thinner
 * placeholder pair a planner picked in 04-01. Presets set their own tips (Phase 11 D-19), and a
 * shaper's own Fit & Tip Defaults, once chosen, still win over these for every new board.
 */
export const DEFAULT_FOIL_SPEC: FoilSpec = {
  noseTip: inchesToMm(0.5),
  nose12: inchesToMm(1.31),
  center: inchesToMm(2.5),
  tail12: inchesToMm(1.56),
  tailTip: inchesToMm(0.625),
};

/**
 * The five foil stations in ascending station order, for a board of the given length. Reuses
 * `rockerStationPositions`' station positions (tail tip, tail 12", centre, nose 12", nose tip) so
 * the two curves are always sampled at the identical five stations — one definition of where they
 * sit.
 */
export function foilStationPoints(
  spec: FoilSpec,
  length: Mm,
): { key: FoilStationKey; station: Mm; thickness: Mm }[] {
  const stations = rockerStationPositions(length);
  const thicknessByKey: Record<FoilStationKey, Mm> = {
    tailTip: spec.tailTip,
    tail12: spec.tail12,
    center: spec.center,
    nose12: spec.nose12,
    noseTip: spec.noseTip,
  };
  return stations.map((s) => ({ key: s.key, station: s.station, thickness: thicknessByKey[s.key] }));
}

/**
 * Samples the board's thickness at an arbitrary station: pchip through the five points from
 * `foilStationPoints` (D-13). Fitted fresh on every call — five points, cheap — so nothing derived
 * is cached. Anything that samples the same foil many times (the side profile,
 * `lib/geometry/board-profile.ts`) prepares the identical curve once instead.
 */
export function sampleFoil(spec: FoilSpec, length: Mm, station: Mm): Mm {
  const points: SplinePoint[] = foilStationPoints(spec, length).map((p) => ({
    x: p.station,
    y: p.thickness,
  }));
  return mm(preparePchip(points).sample(station));
}
