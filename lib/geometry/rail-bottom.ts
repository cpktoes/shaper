/**
 * The rail on the bottom it stands on (Phase 17, D-41 — the founder at 17-03's look: "This should represent the angle
 * in the bottom of the displayed rail in the viewer to represent the real rail shape, post bottom contouring … i.e.
 * contour before rail shaping").
 *
 * A vee or a belly is cut before the rails are shaped. It lifts the bottom at the rail by the rail lift and lifts it
 * less toward the stringer, so the rail RAILS bands is thinner (`railsOnTheBottom` in `design.ts`) and the planed
 * bottom under it falls away toward the stringer at the cut's own angle. RAILS draws each rail in its own frame — x in
 * from the apex (0) toward the stringer, y up from the rail's bottom at its edge — so the rail itself stays exactly
 * where RAILS has always drawn it, and only the bottom inboard of it, and the marks that stand on that bottom, follow
 * the cut down.
 *
 * Every drawn point goes through one map, `railPointOnBottom`: a point is moved down by the bottom's fall at its own
 * distance in from the rail, scaled from all of it on the bottom (y = 0) to none of it on the deck (y = the rail's
 * thickness). So a bottom tuck sits ON the planed bottom (never above it), the deck and everything on the apex's own
 * column (where the fall is 0) stay put, and with no `bottom` nothing moves at all.
 *
 * Pure: no React, browser or database import. A section with no `bottom` is never passed here by the plot.
 */

import type { Point2D } from "./board";
import type { FinishedRail, FinishedRailStep } from "./finished-rail";
import type { RailSectionBottom, RailSectionOutput } from "./rail-bands";
import { inchesToMm, mm, type Mm } from "./units";

/** How finely the bottom is sampled across: every 1/8". A vee is straight; a belly's curve reads smooth at this. */
export const RAIL_BOTTOM_STEP: Mm = inchesToMm(1 / 8);

/** How far past a section's own plot edge the bottom is sampled, so a plot drawn on the three sections' shared axis
 * (whose left edge can sit further in than this section's own) still finds its bottom there. */
export const RAIL_BOTTOM_REACH: Mm = inchesToMm(6);

/** A straight run of the finished rail is drawn as this many pieces on the bottom, so it follows a belly's curve. */
export const RAIL_BOTTOM_LINE_PIECES = 24;

/**
 * One section's bottom: the rail lift there, and the bottom across from `RAIL_BOTTOM_REACH` inboard of the plot's own
 * left edge out to the apex, from `liftIn` — the foam the bottom takes off this far in from the rail (`design.ts`
 * reads it off `foamOff`, the one number, D-05).
 */
export function railSectionBottom(output: RailSectionOutput, lift: Mm, liftIn: (inFromRail: Mm) => Mm): RailSectionBottom {
  const reach = -output.bounds.xAxisMin + RAIL_BOTTOM_REACH;
  const count = Math.ceil(reach / RAIL_BOTTOM_STEP);
  const across: Point2D[] = [];
  for (let k = count; k >= 1; k--) {
    const inFromRail = mm((reach * k) / count);
    across.push({ x: mm(-inFromRail), y: mm(liftIn(inFromRail) - lift) });
  }
  across.push({ x: mm(0), y: mm(0) });
  return { lift, across };
}

/** How far the planed bottom stands below the rail's own bottom at `x` (negative under a vee or a belly), read
 * straight between the samples and held at the end sample beyond them. */
export function railBottomFall(bottom: RailSectionBottom, x: Mm): Mm {
  const { across } = bottom;
  if (x <= across[0].x) return across[0].y;
  const last = across[across.length - 1];
  if (x >= last.x) return last.y;
  let lo = 0;
  let hi = across.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (across[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = across[lo];
  const b = across[hi];
  const t = (x - a.x) / (b.x - a.x);
  return mm(a.y + (b.y - a.y) * t);
}

/**
 * A point of the rail's drawing, moved onto the bottom it stands on: down by the bottom's fall at its own x, all of it
 * on the bottom (y = 0), none of it at `thickness` (the deck), in proportion between.
 */
export function railPointOnBottom(bottom: RailSectionBottom, thickness: Mm, p: Point2D): Point2D {
  const fall = railBottomFall(bottom, p.x);
  if (fall === 0) return p;
  const share = thickness > 0 ? 1 - p.y / thickness : 1;
  return { x: p.x, y: mm(p.y + fall * share) };
}

/** The planed bottom as a drawn line from `from` to `to` (both x, `from` the further inboard): the two ends and every
 * sample between them. */
export function railBottomLine(bottom: RailSectionBottom, from: Mm, to: Mm): Point2D[] {
  const line: Point2D[] = [{ x: from, y: railBottomFall(bottom, from) }];
  for (const p of bottom.across) if (p.x > from && p.x < to) line.push(p);
  line.push({ x: to, y: railBottomFall(bottom, to) });
  return line;
}

/** The lowest the bottom falls anywhere from `from` out to the apex — 0 when it never falls below the rail's own
 * bottom — so a plot can make room for it. */
export function railBottomLowest(bottom: RailSectionBottom, from: Mm): Mm {
  let lowest = Math.min(0, railBottomFall(bottom, from));
  for (const p of bottom.across) if (p.x >= from) lowest = Math.min(lowest, p.y);
  return mm(lowest);
}

/**
 * The finished rail standing on the bottom: every point through `railPointOnBottom`, and every straight run cut into
 * `RAIL_BOTTOM_LINE_PIECES` so the flat along the bottom follows the cut rather than cutting across it. Its curves
 * keep their own steps, their control points moved by the same map (the map is all but straight over a blend's few
 * millimetres).
 */
export function finishedRailOnBottom(rail: FinishedRail, bottom: RailSectionBottom, thickness: Mm): FinishedRail {
  const on = (p: Point2D) => railPointOnBottom(bottom, thickness, p);
  const steps: FinishedRailStep[] = [];
  let at = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") {
      for (let k = 1; k <= RAIL_BOTTOM_LINE_PIECES; k++) {
        const t = k / RAIL_BOTTOM_LINE_PIECES;
        steps.push({ kind: "line", to: on({ x: mm(at.x + (step.to.x - at.x) * t), y: mm(at.y + (step.to.y - at.y) * t) }) });
      }
    } else if (step.kind === "quad") {
      steps.push({ kind: "quad", control: on(step.control), to: on(step.to) });
    } else {
      steps.push({ kind: "cubic", c1: on(step.c1), c2: on(step.c2), to: on(step.to) });
    }
    at = step.to;
  }
  return { start: on(rail.start), steps, samples: rail.samples.map(on), chain: rail.chain.map(on) };
}
