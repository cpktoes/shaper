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
 * The five stations are fixed by D-05, so a drag on either curve has exactly one degree of
 * freedom — the station coordinate of the drag is always discarded, deliberately, not
 * approximated:
 *
 * - A rocker-line target's dragged HEIGHT *is* the lift at that station.
 * - A deck-curve target's dragged height minus the rocker lift already at that station *is* the
 *   thickness — the deck height is rocker plus thickness by construction (D-01), and only the
 *   thickness is free to move (the rocker line itself is untouched by a deck drag).
 */

import { type FoilSpec, type FoilStationKey, FOIL_THICKNESS_RANGE_IN, foilStationPoints } from "./foil";
import { type RockerSpec, ROCKER_LIFT_RANGE_IN, rockerStationPoints } from "./rocker";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

/**
 * The nine grabbable points: four on the rocker line (every station except the fixed-zero
 * centre) and five on the deck curve (all five stations — the deck's own thickness is defined
 * everywhere, including both tips).
 */
export interface SideProfileDragTarget {
  curve: "rocker" | "deck";
  station: FoilStationKey;
}

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
 * draws its nine grab targets from, built on `rockerStationPoints`/`foilStationPoints` so the
 * station positions have exactly one definition.
 */
export function sideProfileDragPoints(
  rocker: RockerSpec,
  foil: FoilSpec,
  length: Mm,
): SideProfileDragPointAt[] {
  const rockerPoints = rockerStationPoints(rocker, length);
  const foilPoints = foilStationPoints(foil, length);
  const liftByStation = new Map(rockerPoints.map((p) => [p.key, p]));

  const rockerTargets: SideProfileDragPointAt[] = rockerPoints
    .filter((p) => p.key !== "center")
    .map((p) => ({
      target: { curve: "rocker", station: p.key },
      point: { station: p.station, height: p.lift },
    }));

  const deckTargets: SideProfileDragPointAt[] = foilPoints.map((f) => {
    const lift = liftByStation.get(f.key)?.lift ?? mm(0);
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
  rocker: RockerSpec,
  foil: FoilSpec,
  length: Mm,
): { rocker?: Partial<RockerSpec>; foil?: Partial<FoilSpec> } {
  if (target.curve === "rocker") {
    // The dragged height IS the lift at this station — the rocker line's own zero reference (the
    // centre) never reaches this branch, since sideProfileDragPoints never emits it as a target.
    const liftIn = quantise(mmToInches(dragged.height), LIMITS.rocker);
    return { rocker: { [target.station]: inchesToMm(liftIn) } as Partial<RockerSpec> };
  }

  // Deck target: thickness = dragged height minus the rocker lift ALREADY at that station. The
  // station coordinate of the drag is discarded — the five stations are fixed by D-05, so this
  // drag has one degree of freedom.
  const liftAtStation = rockerStationPoints(rocker, length).find((p) => p.key === target.station)?.lift ?? mm(0);
  const thicknessIn = quantise(mmToInches(dragged.height) - mmToInches(liftAtStation), LIMITS.foil);
  return { foil: { [target.station]: inchesToMm(thicknessIn) } as Partial<FoilSpec> };
}

/** Exported for tests and for any UI that wants to show a field's legal range. */
export const SIDE_PROFILE_DRAG_LIMITS = LIMITS;
