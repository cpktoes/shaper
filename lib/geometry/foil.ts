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
 */

import { rockerStationPoints } from "./rocker";
import { type SplinePoint, sampleMonotoneSpline } from "./monotone-spline";
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

/** Inch-domain bounds every foil slider, drag solve and typed field shares. One definition,
 * imported everywhere, never restated. */
export const FOIL_THICKNESS_RANGE_IN = { min: 0.125, max: 5, step: 0.0625 } as const;

/**
 * Starting values for a new board's foil, authored through `inchesToMm()`.
 *
 * `nose12`, `center` and `tail12` are the EXACT values `DEFAULT_RAIL_BAND_SPEC` already carries
 * (`lib/geometry/rail-bands.ts`'s nose/center/tail `boardThickness`) and `DEFAULT_VOLUME_SPEC`'s
 * own `centerThickness` — so a default board's foil, rails and volume-estimator centre thickness
 * all agree by construction, before rocker/foil are even linked to rails (that link is a later
 * plan's job; this file only guarantees the numbers already match).
 *
 * `noseTip` (5/16") and `tailTip` (1/4") are a planner choice, not derived from any cited source:
 * CONTEXT.md's discretion note explicitly defers "tip-thickness defaults for a finished board"
 * (presets set their own in a later plan). Sized thinner than the Arctic Foam 7'3" SBF blank's own
 * 1 1/2"/1 5/8" tips, on the reasoning that a finished, glassed board's foil tip is thinner than a
 * rough blank's — flagged in 04-01's `<planner_assumptions>` for the founder's own sanity check.
 */
export const DEFAULT_FOIL_SPEC: FoilSpec = {
  noseTip: inchesToMm(0.3125),
  nose12: inchesToMm(1.31),
  center: inchesToMm(2.5),
  tail12: inchesToMm(1.56),
  tailTip: inchesToMm(0.25),
};

/**
 * The five foil stations in ascending station order, for a board of the given length. Reuses
 * `rockerStationPoints`' station positions (tail tip, tail 12", centre, nose 12", nose tip) so the
 * two curves are always sampled at the identical five stations — one definition of where they sit.
 */
export function foilStationPoints(
  spec: FoilSpec,
  length: Mm,
): { key: FoilStationKey; station: Mm; thickness: Mm }[] {
  // rockerStationPoints only needs `length` to place the stations — the RockerSpec passed here is
  // never read for its lift values, so any complete spec works; the four zero-lift stations are
  // simplest.
  const stations = rockerStationPoints(
    { noseTip: mm(0), nose12: mm(0), tail12: mm(0), tailTip: mm(0) },
    length,
  );
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
 * Samples the deck's thickness at an arbitrary station. Rebuilds the five spline points fresh
 * from `foilStationPoints` and evaluates `sampleMonotoneSpline` — nothing derived is cached, the
 * same posture `sampleRocker` takes.
 */
export function sampleFoil(spec: FoilSpec, length: Mm, station: Mm): Mm {
  const points: SplinePoint[] = foilStationPoints(spec, length).map((p) => ({
    x: p.station,
    y: p.thickness,
  }));
  return mm(sampleMonotoneSpline(points, station));
}
