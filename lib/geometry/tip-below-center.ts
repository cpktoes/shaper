/**
 * A tip that would sit below the board's own centre (quick 261115-dhq; the to-do of 2026-10-02 from Phase 14's
 * review, WR-02 part 2; the founder's pick of 2026-11-14: "Steer it").
 *
 * Under Pin tips to Deck a thin board in a thick blank keeps each tip as thick as its setting, so the thinning
 * starts further in and the foam that is not taken off the deck comes back on the bottom: the tip's bottom
 * drops (Phase 14, D-20). On a thin enough board with a thick enough tip it drops below the board's own centre,
 * and the rocker reads negative there — a board that would rock on its tail. The blank keeps fitting (the
 * numbers and the drawing say honestly what the cut gives); this file is the one place that notices it, and
 * the words that steer the shaper to Bottom, where the deck rises instead and it never happens.
 *
 * Read off the side profile every screen reads (`BoardSideProfile.stationRocker`, levelled so the lowest point
 * is 0): an end is below the centre when its tip or its 12" station reads under the centre's rocker by more
 * than float noise. The amount reported is the deeper of the two, in millimetres, for `formatMark`.
 */

import type { BoardSideProfile } from "./board-profile";
import { formatMark } from "./measure-display";
import { mm, type Mm, type UnitsSystem } from "./units";

/** Float noise in a levelled rocker never counts as a drop (the same slack the fit floors use). */
export const TIP_BELOW_CENTER_EPSILON_MM = 1e-6;

/** How far each end sits below the centre — null where it does not. */
export interface TipsBelowCenter {
  nose: Mm | null;
  tail: Mm | null;
}

export function tipsBelowCenter(profile: Pick<BoardSideProfile, "stationRocker">): TipsBelowCenter {
  const r = profile.stationRocker;
  const drop = (tip: Mm, station12: Mm): Mm | null => {
    const by = r.center - Math.min(tip, station12);
    return by > TIP_BELOW_CENTER_EPSILON_MM ? mm(by) : null;
  };
  return { nose: drop(r.noseTip, r.nose12), tail: drop(r.tailTip, r.tail12) };
}

/**
 * The steer line under Pin tips to (the founder's ruling): which end would sit below the centre and by how
 * much, then the suggestion. Two sentences, each with its full stop, like the too-close line. The amount reads
 * through `formatMark`; an end whose drop prints as nothing in the shaper's system is left out, so the line
 * never says what the readings beside it cannot show — and null when neither end is left.
 */
export function tipBelowCenterLine(below: TipsBelowCenter, system: UnitsSystem): string | null {
  const nothing = formatMark(mm(0), system);
  const printed = (by: Mm | null): string | null => {
    if (by === null) return null;
    const text = formatMark(by, system);
    return text === nothing ? null : text;
  };
  const nose = printed(below.nose);
  const tail = printed(below.tail);
  if (nose === null && tail === null) return null;
  const where =
    nose !== null && tail !== null
      ? `The nose would sit ${nose} and the tail ${tail} below the board's center.`
      : nose !== null
        ? `The nose would sit ${nose} below the board's center.`
        : `The tail would sit ${tail} below the board's center.`;
  return `${where} Pin tips to Bottom to keep the rocker above it.`;
}
