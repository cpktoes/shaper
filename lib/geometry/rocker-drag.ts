/**
 * Inverse of the rocker/foil geometry: turns a dragged side-profile point back into the spec
 * field it implies. Mirrors `lib/geometry/outline-drag.ts` file-for-file — see that file's own
 * header for the full argument; the same two rules hold this solve together:
 *
 * 1. **One definition per formula.** The bounds are imported from `rocker.ts`/`foil.ts`
 *    (`ROCKER_LIFT_RANGE_IN`, `FOIL_THICKNESS_RANGE_IN`), never restated here. A drag that
 *    clamped differently from the sliders would let the drawing and the sidebar disagree, which
 *    is the exact failure this module exists to prevent.
 * 2. **Every result is slider-representable.** Each field snaps to its slider's step and clamps
 *    to its bounds, so a drag can never reach a value the sidebar cannot show or the shaper
 *    cannot then adjust by hand.
 *
 * Seven grabbable points, not nine (quick task 260829-rda): the rocker line's own three-knot
 * construction (`rocker.ts`) no longer stores a lift at the two 12" stations or the centre — the
 * 12" figures are now derived read-outs and the centre is the fixed zero — so the rocker line
 * offers exactly ONE grab target per tip (`noseTip`/`tailTip`). The deck curve still offers all
 * five foil stations, since the foil spec is untouched by this quick task. A rocker drag's
 * remaining degree of freedom is still exactly one (the height; the station coordinate of the
 * drag is still discarded), but the reason is now that a tip knot's station is fixed by the
 * board's own ends, not by the old five-station D-05 model.
 *
 * - A rocker-line target's dragged HEIGHT *is* the lift at that tip.
 * - A deck-curve target's dragged height minus the rocker lift already at that station *is* the
 *   thickness — the deck height is rocker plus thickness by construction (D-01), and only the
 *   thickness is free to move (the rocker line itself is untouched by a deck drag). The lift
 *   beneath a deck station now comes from `sampleRocker` against the built `RockerGeometry`,
 *   since a per-station lift is no longer stored on the spec.
 */

import { type FoilSpec, type FoilStationKey, FOIL_THICKNESS_RANGE_IN, foilStationPoints } from "./foil";
import {
  type RockerGeometry,
  type RockerSpec,
  ROCKER_LIFT_RANGE_IN,
  rockerStationPositions,
  sampleRocker,
} from "./rocker";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

/** A rocker-line target is one of the two tips — the centre is the fixed zero and never
 * reachable, and the two 12" stations are derived, not draggable. A deck-curve target is any of
 * the five foil stations. A discriminated union so an unreachable target (e.g. a rocker drag at
 * "center") cannot even be constructed. */
export type SideProfileDragTarget =
  | { curve: "rocker"; station: "noseTip" | "tailTip" }
  | { curve: "deck"; station: FoilStationKey };

/** A point on the side profile, in board coordinates — station along the length, height measured
 * up from the flat surface the board sits on (the approved rocker convention). */
export interface SideProfileDragPoint {
  station: Mm;
  height: Mm;
}

export interface SideProfileDragPointAt {
  target: SideProfileDragTarget;
  point: SideProfileDragPoint;
}

/**
 * Slider bounds and steps, imported from the rocker/foil geometry modules rather than restated —
 * see rule 1 above.
 */
const LIMITS = {
  rocker: ROCKER_LIFT_RANGE_IN,
  foil: FOIL_THICKNESS_RANGE_IN,
} as const;

interface Limit {
  min: number;
  max: number;
  step: number;
}

/** Snap to the slider's step, then clamp to its bounds. Non-finite input falls back to the minimum. */
function quantise(value: number, limit: Limit): number {
  if (!Number.isFinite(value)) return limit.min;
  const snapped = Math.round(value / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));
  // Re-round to kill the float dust that a 0.0625 step accumulates.
  return Math.round(clamped / limit.step) * limit.step;
}

/**
 * Where the grabbable points currently are, in board coordinates — the enumerator the viewer
 * draws its seven grab targets from. Takes the already-built `RockerGeometry` (not a `RockerSpec`)
 * because a deck target's height needs the rocker lift sampled off the curve, and building the
 * curve is the caller's job (`rocker-editor.tsx` builds it once per render for the controls, the
 * datasheet and the viewer all to share).
 */
export function sideProfileDragPoints(
  geometry: RockerGeometry,
  foil: FoilSpec,
  length: Mm,
): SideProfileDragPointAt[] {
  const stationPositions = rockerStationPositions(length);
  const tailTipStation = stationPositions.find((s) => s.key === "tailTip")!.station;
  const noseTipStation = stationPositions.find((s) => s.key === "noseTip")!.station;
  const foilPoints = foilStationPoints(foil, length);

  const rockerTargets: SideProfileDragPointAt[] = [
    {
      target: { curve: "rocker", station: "tailTip" },
      point: { station: tailTipStation, height: sampleRocker(geometry, tailTipStation) },
    },
    {
      target: { curve: "rocker", station: "noseTip" },
      point: { station: noseTipStation, height: sampleRocker(geometry, noseTipStation) },
    },
  ];

  const deckTargets: SideProfileDragPointAt[] = foilPoints.map((f) => {
    const lift = sampleRocker(geometry, f.station);
    return {
      target: { curve: "deck", station: f.key },
      point: { station: f.station, height: mm(lift + f.thickness) },
    };
  });

  return [...rockerTargets, ...deckTargets];
}

/**
 * Solve a dragged side-profile position back to the spec field it implies.
 *
 * Returns only the one field the target owns — a rocker-line target returns `{ rocker }`, a
 * deck-curve target returns `{ foil }`, never both — so the caller can merge it straight into
 * whichever store mutator (`updateRocker`/`updateFoil`) the returned key names.
 */
export function solveSideProfileDrag(
  target: SideProfileDragTarget,
  dragged: SideProfileDragPoint,
  geometry: RockerGeometry,
  foil: FoilSpec,
  length: Mm,
): { rocker?: Partial<RockerSpec>; foil?: Partial<FoilSpec> } {
  if (target.curve === "rocker") {
    // The dragged height IS the lift at this tip.
    const liftIn = quantise(mmToInches(dragged.height), LIMITS.rocker);
    const field: keyof RockerSpec = target.station === "noseTip" ? "noseLift" : "tailLift";
    return { rocker: { [field]: inchesToMm(liftIn) } as Partial<RockerSpec> };
  }

  // Deck target: thickness = dragged height minus the rocker lift ALREADY at that station,
  // sampled off the built curve. The station coordinate of the drag is discarded — a deck drag
  // has one degree of freedom.
  const stationMm = rockerStationPositions(length).find((s) => s.key === target.station)!.station;
  const liftAtStation = sampleRocker(geometry, stationMm);
  const thicknessIn = quantise(mmToInches(dragged.height) - mmToInches(liftAtStation), LIMITS.foil);
  return { foil: { [target.station]: inchesToMm(thicknessIn) } as Partial<FoilSpec> };
}

/** Exported for tests and for any UI that wants to show a field's legal range. */
export const SIDE_PROFILE_DRAG_LIMITS = LIMITS;
