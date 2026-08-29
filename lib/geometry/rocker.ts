/**
 * Rocker curve geometry — the board's bottom curve, seen from the side.
 *
 * No prototype ancestor. The prototype's own `buildSideProfile`
 * (reference/project/Rails.dc.html ~line 782, `bottomStations`) drew a fixed set of "generic
 * shortboard assumption" rocker numbers, not a curve a shaper could edit — this module is what
 * finally replaces it (CONTEXT.md's codebase-reality-check, RESEARCH.md).
 *
 * Deviation from the approved design (.planning/design/GEOMETRY-MODULE.md), numbered per this
 * codebase's convention (see `lib/geometry/volume.ts`'s header for the same pattern):
 *
 * 1. STATION MODEL. GEOMETRY-MODULE.md specifies a two-value `RockerSpec { noseRocker, tailRocker,
 *    curve }`. This file deliberately implements the later, locked five-station blank-datasheet
 *    model from CONTEXT.md D-05 instead: rocker is always measured up from the bottom, with the
 *    centre station as the zero reference, and four lift values — nose tip, nose 12", tail 12",
 *    tail tip — define the whole rocker line. The centre is not stored because it is always zero
 *    by definition.
 */

import { MEASURE_STATION_MM } from "./outline";
import { type SplinePoint, sampleMonotoneSpline } from "./monotone-spline";
import { type Mm, inchesToMm, mm } from "./units";

export type RockerStationKey = "tailTip" | "tail12" | "center" | "nose12" | "noseTip";

/** Parametric controls for the rocker line — the single place the ROCKER screen's rocker sliders
 * and typed fields write to. Four lift values; the centre is always zero by definition (D-05) and
 * so is deliberately absent here. */
export interface RockerSpec {
  noseTip: Mm;
  nose12: Mm;
  tail12: Mm;
  tailTip: Mm;
}

/** Inch-domain bounds every rocker slider, drag solve and typed field shares. One definition,
 * imported everywhere, never restated. */
export const ROCKER_LIFT_RANGE_IN = { min: 0, max: 9, step: 0.0625 } as const;

/**
 * Starting values for a new board's rocker line, authored through `inchesToMm()`.
 *
 * Provenance: mapped from the prototype's own `buildSideProfile` `bottomStations` array
 * (reference/project/Rails.dc.html ~line 784 — a 72" board, station 0 at the NOSE:
 * `{x:0,h:4.5}, {x:12,h:1.25}, {x:36,h:0}, {x:60,h:0.375}, {x:72,h:2}`), re-mapped into this
 * codebase's tail-tip-is-station-zero frame: tailTip 2", tail12 0.375", nose12 1.25", noseTip 4.5".
 * These were hard-coded generic-shortboard assumptions in the prototype; here they are merely the
 * starting values of a curve a shaper can move.
 */
export const DEFAULT_ROCKER_SPEC: RockerSpec = {
  noseTip: inchesToMm(4.5),
  nose12: inchesToMm(1.25),
  tail12: inchesToMm(0.375),
  tailTip: inchesToMm(2),
};

/**
 * The five rocker stations in ascending station order, for a board of the given length. The
 * single definition of where the five stations sit — the viewer, the drag solver (later plans)
 * and the volume integrator all read this rather than re-deriving station positions.
 */
export function rockerStationPoints(
  spec: RockerSpec,
  length: Mm,
): { key: RockerStationKey; station: Mm; lift: Mm }[] {
  return [
    { key: "tailTip", station: mm(0), lift: spec.tailTip },
    { key: "tail12", station: MEASURE_STATION_MM, lift: spec.tail12 },
    { key: "center", station: mm(length / 2), lift: mm(0) },
    { key: "nose12", station: mm(length - MEASURE_STATION_MM), lift: spec.nose12 },
    { key: "noseTip", station: length, lift: spec.noseTip },
  ];
}

/**
 * Samples the rocker line's lift at an arbitrary station. Rebuilds the five spline points fresh
 * from `rockerStationPoints` and evaluates `sampleMonotoneSpline` — nothing derived is cached, the
 * same posture `buildOutline` takes deriving its Bezier data fresh from `OutlineSpec` on every
 * call.
 */
export function sampleRocker(spec: RockerSpec, length: Mm, station: Mm): Mm {
  const points: SplinePoint[] = rockerStationPoints(spec, length).map((p) => ({
    x: p.station,
    y: p.lift,
  }));
  return mm(sampleMonotoneSpline(points, station));
}
