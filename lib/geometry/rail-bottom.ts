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
 * Channels are different (G-17-6, the founder's ruling of 2026-11-10: "channels are the last cut, made after the rail
 * is shaped"). They are cut after the rail is shaped, so they never go through the map: they are cut into the drawn
 * bottom and into the finished rail, straight up at each wall's own place (`channelCut`), and wherever a channel's
 * floor stands higher than the rail it takes the rail up to it — never above the deck.
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

/** How finely the channels are sampled across, and the longest piece the finished rail is drawn in where a channel is
 * cut into it: every 1/64" (G-17-6). */
export const RAIL_CHANNEL_STEP: Mm = inchesToMm(1 / 64);

/** Either side of a wall the channels are read this close to it (millimetres): the floor at its deepest on one side,
 * the next channel's peak on the other. A pair closer than this in height is no wall at all. */
const WALL_GAP = 1e-6;

/** What the channels cut, as `design.ts` hands them over: the foam they take off this far in from the rail, and every
 * wall's distance in from the rail (both sides of the stringer). */
export interface RailSectionChannels {
  cutIn: (inFromRail: Mm) => Mm;
  wallsIn: readonly Mm[];
}

/**
 * One section's bottom: the rail lift there, and the bottom across from `RAIL_BOTTOM_REACH` inboard of the plot's own
 * left edge out to the apex, from `liftIn` — the foam the vee or belly takes off this far in from the rail (`design.ts`
 * reads it off `sectionsFoamOff`, D-05). With `channels`, the channels' cut over the same reach (`channelCut`): a
 * sample every 1/64" and two at every wall, so each wall stands straight up at its own place.
 */
export function railSectionBottom(
  output: RailSectionOutput,
  lift: Mm,
  liftIn: (inFromRail: Mm) => Mm,
  channels?: RailSectionChannels,
): RailSectionBottom {
  const reach = -output.bounds.xAxisMin + RAIL_BOTTOM_REACH;
  const count = Math.ceil(reach / RAIL_BOTTOM_STEP);
  const across: Point2D[] = [];
  for (let k = count; k >= 1; k--) {
    const inFromRail = mm((reach * k) / count);
    across.push({ x: mm(-inFromRail), y: mm(liftIn(inFromRail) - lift) });
  }
  across.push({ x: mm(0), y: mm(0) });
  if (!channels) return { lift, across };
  const channelCut = railChannelCut(reach, channels);
  return channelCut ? { lift, across, channelCut } : { lift, across };
}

/** The channels' cut over `reach` in from the rail, x ascending to the apex — or undefined when it is 0 everywhere. */
function railChannelCut(reach: number, { cutIn, wallsIn }: RailSectionChannels): Point2D[] | undefined {
  const read = (inFromRail: number) => {
    const v = cutIn(mm(inFromRail));
    return Number.isFinite(v) ? v : 0;
  };
  const walls = [...new Set(wallsIn.filter((p) => Number.isFinite(p) && p > 0 && p < reach))].sort((a, b) => b - a);
  const count = Math.ceil(reach / RAIL_CHANNEL_STEP);
  const cut: Point2D[] = [];
  let w = 0;
  // In from the rail, from the reach out to the apex: x = −inFromRail ascends. Each wall goes in before the first sample
  // outboard of it; a sample within the gap of a wall is left out (the wall's own two points stand there).
  for (let k = count; k >= 0; k--) {
    const inFromRail = (reach * k) / count;
    while (w < walls.length && walls[w] > inFromRail - WALL_GAP) {
      const p = walls[w++];
      // In x order: the side further in from the rail first (on this side of the stringer, the channel's deep floor),
      // then the side nearer the rail.
      const left = read(p + WALL_GAP);
      const right = read(p - WALL_GAP);
      if (Math.abs(left - right) > WALL_GAP) cut.push({ x: mm(-p), y: mm(left) }, { x: mm(-p), y: mm(right) });
    }
    if (walls.some((p) => Math.abs(p - inFromRail) <= WALL_GAP)) continue;
    cut.push({ x: mm(-inFromRail), y: mm(read(inFromRail)) });
  }
  return cut.some((p) => p.y !== 0) ? cut : undefined;
}

/** How far the planed bottom stands below the rail's own bottom at `x` (negative under a vee or a belly), read
 * straight between the samples and held at the end sample beyond them. */
export function railBottomFall(bottom: RailSectionBottom, x: Mm): Mm {
  return readAcross(bottom.across, x);
}

/** A line of points, x ascending, read at `x`: straight between points, held at the ends beyond them, and at a wall's
 * own x (two points at one x) its first — inboard — value. */
function readAcross(points: readonly Point2D[], x: Mm): Mm {
  if (x <= points[0].x) return points[0].y;
  const last = points[points.length - 1];
  if (x >= last.x) return last.y;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x < x) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  if (b.x === x) return b.y;
  const t = (x - a.x) / (b.x - a.x);
  return mm(a.y + (b.y - a.y) * t);
}

/** How far the channels take the bottom up above the planed bottom at `x` — 0 with no channels. */
function railChannelDepth(bottom: RailSectionBottom, x: Mm): Mm {
  return bottom.channelCut ? readAcross(bottom.channelCut, x) : mm(0);
}

/** The drawn bottom's height at `x`: the vee's or belly's fall, plus the channels cut into it. */
export function railDrawnBottom(bottom: RailSectionBottom, x: Mm): Mm {
  return mm(railBottomFall(bottom, x) + railChannelDepth(bottom, x));
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
 * sample between them — with channels, the channels' own points too, each wall two points at its own x. */
export function railBottomLine(bottom: RailSectionBottom, from: Mm, to: Mm): Point2D[] {
  const cut = bottom.channelCut;
  if (!cut) {
    const line: Point2D[] = [{ x: from, y: railBottomFall(bottom, from) }];
    for (const p of bottom.across) if (p.x > from && p.x < to) line.push(p);
    line.push({ x: to, y: railBottomFall(bottom, to) });
    return line;
  }
  const between: Point2D[] = [];
  const cutXs = new Set<number>();
  for (const p of cut) {
    if (p.x > from && p.x < to) {
      between.push({ x: p.x, y: mm(railBottomFall(bottom, p.x) + p.y) });
      cutXs.add(p.x);
    }
  }
  for (const p of bottom.across) {
    if (p.x > from && p.x < to && !cutXs.has(p.x)) between.push({ x: p.x, y: mm(p.y + railChannelDepth(bottom, p.x)) });
  }
  // Stable: a wall's two points keep their order.
  between.sort((a, b) => a.x - b.x);
  return [{ x: from, y: railDrawnBottom(bottom, from) }, ...between, { x: to, y: railDrawnBottom(bottom, to) }];
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
 *
 * Then the channels, cut last (G-17-6): every straight run of the underside that a channel reaches is drawn in pieces
 * at the channels' own 1/64" points, each raised to the channel's floor wherever the floor stands above the rail, and
 * at every wall it crosses two points at the wall's own x — walking toward the stringer, the outboard (shallow) one
 * first, then the deep one — so the wall stands straight up. Everything above the underside, and every run no channel
 * reaches, is drawn exactly as without channels.
 */
export function finishedRailOnBottom(rail: FinishedRail, bottom: RailSectionBottom, thickness: Mm): FinishedRail {
  const on = (p: Point2D) => railPointOnBottom(bottom, thickness, p);
  const span = channelSpan(bottom);
  const underside = span ? undersideFrom(rail) : rail.steps.length;
  const steps: FinishedRailStep[] = [];
  let at = rail.start;
  let pen = on(rail.start);
  const lineTo = (to: Point2D) => {
    if (to.x === pen.x && to.y === pen.y) return;
    steps.push({ kind: "line", to });
    pen = to;
  };
  rail.steps.forEach((step, index) => {
    if (span && index >= underside && step.kind === "line" && overlaps(at.x, step.to.x, span)) {
      for (const p of channelPieces(bottom, on, [at, step.to])) lineTo(p);
    } else if (step.kind === "line") {
      for (let k = 1; k <= RAIL_BOTTOM_LINE_PIECES; k++) {
        const t = k / RAIL_BOTTOM_LINE_PIECES;
        const to = on({ x: mm(at.x + (step.to.x - at.x) * t), y: mm(at.y + (step.to.y - at.y) * t) });
        steps.push({ kind: "line", to });
        pen = to;
      }
    } else if (step.kind === "quad") {
      const to = on(step.to);
      steps.push({ kind: "quad", control: on(step.control), to });
      pen = to;
    } else {
      const to = on(step.to);
      steps.push({ kind: "cubic", c1: on(step.c1), c2: on(step.c2), to });
      pen = to;
    }
    at = step.to;
  });
  return { start: on(rail.start), steps, samples: rail.samples.map(on), chain: rail.chain.map(on) };
}

/** Where the channels cut anything, as [lowest x, highest x] — from the point before the first that is not 0 to the
 * point after the last — or null when they cut nothing. */
function channelSpan(bottom: RailSectionBottom): [number, number] | null {
  const cut = bottom.channelCut;
  if (!cut) return null;
  const first = cut.findIndex((p) => p.y !== 0);
  if (first < 0) return null;
  let last = cut.length - 1;
  while (cut[last].y === 0) last--;
  return [cut[Math.max(0, first - 1)].x, cut[Math.min(cut.length - 1, last + 1)].x];
}

/** The index of the first underside step: the one after the step that ends at the curve's largest x (the apex). */
function undersideFrom(rail: FinishedRail): number {
  let best = 0;
  rail.steps.forEach((step, index) => {
    if (step.to.x > rail.steps[best].to.x) best = index;
  });
  return best + 1;
}

function overlaps(a: number, b: number, [lo, hi]: [number, number]): boolean {
  return Math.max(a, b) >= lo && Math.min(a, b) <= hi;
}

/**
 * A run of the rail (`path`, unmoved, in drawing order) cut by the channels: each point moved onto the bottom, the
 * channels' own points put in between, every point raised to the channel's floor where that stands higher, and a wall
 * crossed drawn as two points at its x, in the order the run walks.
 */
function channelPieces(bottom: RailSectionBottom, on: (p: Point2D) => Point2D, path: readonly Point2D[]): Point2D[] {
  const cut = bottom.channelCut!;
  const raised = (p: Point2D, depth: number): Point2D => {
    const moved = on(p);
    const floor = railBottomFall(bottom, p.x) + depth;
    return floor > moved.y ? { x: moved.x, y: mm(floor) } : moved;
  };
  const out: Point2D[] = [raised(path[0], railChannelDepth(bottom, path[0].x))];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    const inside = cut.filter((p) => p.x > lo && p.x < hi);
    if (b.x < a.x) inside.reverse();
    for (const p of inside) {
      const t = (p.x - a.x) / (b.x - a.x);
      out.push(raised({ x: p.x, y: mm(a.y + (b.y - a.y) * t) }, p.y));
    }
    out.push(raised(b, railChannelDepth(bottom, b.x)));
  }
  return out;
}
