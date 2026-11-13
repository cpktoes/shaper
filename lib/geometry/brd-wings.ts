/**
 * Finding a wing, or a flyer, in the outline of a board read from a `.brd` file (quick 261113-hyy, the founder, 2026-11-13: "on
 * outlines with wings, like the Flyer, let's try to fit the tail block and the outline above the wing as best as possible").
 *
 * A `.brd` carries free curves, not controls, so a wing is never named in it: it is only a place where the outline steps
 * inward on the way to the tail. This tells such a step from a smooth outline, and measures it in the terms the WINGS tab
 * uses (`wings.ts`): where it is off the tail, how deep it is and how long its run is along the stringer.
 *
 * The rule, measured before it was written down. A board's tail half without a wing only ever turns one way: lay a
 * straightedge across any stretch of it and the rail stands on or above the straightedge. A wing makes a dip, because the
 * rail steps in and then climbs back out faster than the curve either side of it. So: lay the tightest straightedges over
 * the tail half (the upper hull of its points), and a wing is a dip at least 1/32" deep under one, whose step (from the
 * dip's deepest point to where the rail meets the straightedge again) is no longer than 3" (the longest run a wing has,
 * 2", plus an inch for rounded corners). After the deepest is taken, the same search runs on the outline either side of
 * its step, for the second wing the app can hold.
 *
 * The margin that rule leaves, measured on real and made boards: no AkuShaper file without a wing has a dip at all (the
 * hull is the outline); all 40 of the app's own exported wingless boards (4 presets x 5 tails x Hard Edge on and off) dip
 * 0.03 mm at the most, and the writer's wobble beside a rounded wing 0.15 mm; smooth hand-made hips (1/32" to 1/4" over 2"
 * to 12") none. That is 25 times under the 1/32" line (0.79 mm). The flyer on a real Fryer squash twin dips 4.77 mm and the
 * app's own exported wings 2.79 mm (a 3/16" wing 2, rounded as far as it fits) to 23.9 mm (a 1" wing): at least 3.5 times
 * over it. Honest limit: a 1/16"-deep wing with a 1" to 2" run bends the rail by less than 1/32" and reads as part of the
 * curve; the fit's outline gap then shows it, at most about 1/16".
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1); all lengths are millimetres. It must not import
 * `brd-fit.ts` (that file imports this one), so it carries its own half-width reader.
 */
import type { P2 } from "./bezier-fit";
import { inchesToMm, mm, type Mm } from "./units";
import { MAX_WINGS, WING_RUN_RANGE_IN } from "./wings";

/** The shallowest dip under a straightedge that is called a wing: 1/32", 25 times above the largest wobble measured on a wingless board. */
export const BRD_WING_POCKET_MIN_MM = inchesToMm(1 / 32);

/** The longest step a wing may take, measured along the stringer: the longest run (2") plus an inch for rounded corners. */
export const BRD_WING_STEP_MAX_MM = inchesToMm(WING_RUN_RANGE_IN.max + 1);

/** How far past the outer corner the outline's own slope is read, to take the curve's climb out of the depth. */
const SLOPE_READ_MM = inchesToMm(1);

/** A wing as the file draws it, in the WINGS tab's terms. */
export interface BrdFileWing {
  /** The outer corner's distance from the tail: where the step leaves the curve. */
  station: Mm;
  /** The inner corner's distance from the tail (the station less the run). */
  inner: Mm;
  /** How much of the step lies along the stringer, outer corner to inner. */
  run: Mm;
  /** How far the step takes the outline in, the curve's own climb across the run taken out. */
  depth: Mm;
  /** How far the step's deepest point lies under the straightedge across it: what made it a wing. */
  dip: Mm;
  /** Indices into the tail half's points (the file's points up to its wide point, in file order). */
  innerIndex: number;
  outerIndex: number;
}

/** The highest the outline stands at a station: a vertical segment gives both ends, a station off the line reads the nearer end. */
function halfWidthAt(outline: readonly P2[], s: number): number {
  let found = -Infinity;
  for (let i = 0; i + 1 < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[i + 1];
    if (s < Math.min(x0, x1) - 1e-9 || s > Math.max(x0, x1) + 1e-9) continue;
    if (Math.abs(x1 - x0) < 1e-9) found = Math.max(found, y0, y1);
    else found = Math.max(found, y0 + ((y1 - y0) * (s - x0)) / (x1 - x0));
  }
  if (found !== -Infinity) return found;
  if (outline.length === 0) return 0;
  const first = outline[0];
  const last = outline[outline.length - 1];
  return Math.abs(s - first[0]) <= Math.abs(s - last[0]) ? first[1] : last[1];
}

interface Pocket {
  dip: number;
  innerIndex: number;
  outerIndex: number;
}

/** The deepest dip under the upper hull of `pts[lo..hi]`, within a step no longer than the limit, or null when there is none. */
function deepestPocket(pts: readonly P2[], lo: number, hi: number): Pocket | null {
  const sub = pts.slice(lo, hi + 1);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const hull: number[] = [];
  for (let i = 0; i < sub.length; i++) {
    while (hull.length >= 2 && cross(sub[hull[hull.length - 2]], sub[hull[hull.length - 1]], sub[i]) >= 0) hull.pop();
    hull.push(i);
  }
  let best: Pocket | null = null;
  for (let h = 0; h + 1 < hull.length; h++) {
    const a = sub[hull[h]];
    const b = sub[hull[h + 1]];
    if (hull[h + 1] - hull[h] < 2 || b[0] - a[0] < 1e-9) continue;
    const slope = (b[1] - a[1]) / (b[0] - a[0]);
    for (let i = hull[h] + 1; i < hull[h + 1]; i++) {
      if (b[0] - sub[i][0] > BRD_WING_STEP_MAX_MM) continue;
      const dip = a[1] + slope * (sub[i][0] - a[0]) - sub[i][1];
      if (!best || dip > best.dip) best = { dip, innerIndex: lo + i, outerIndex: lo + hull[h + 1] };
    }
  }
  return best;
}

/**
 * The wings in a file's outline (the right half, tail to nose), up to the app's two, nose-most first as wing 1 is on the
 * WINGS tab. Empty for an outline with none: a smooth hip, a drawing's wobble or a squash tail's end is never a wing.
 * `innerIndex` and `outerIndex` index the outline's points up to the wide point (the first largest half-width), in file
 * order, which is the tail half `fitOutline` fits.
 */
export function findBrdWings(outline: readonly P2[]): BrdFileWing[] {
  let half = 0;
  let wideAt = 0;
  for (const [x, y] of outline) {
    if (y > half) {
      half = y;
      wideAt = x;
    }
  }
  const pts = outline.filter(([x]) => x <= wideAt + 1e-6);
  const found: BrdFileWing[] = [];
  const stretches: [number, number][] = [[0, pts.length - 1]];
  while (found.length < MAX_WINGS && stretches.length > 0) {
    let pick: { pocket: Pocket; stretch: number } | null = null;
    stretches.forEach(([lo, hi], stretch) => {
      const pocket = deepestPocket(pts, lo, hi);
      if (pocket && pocket.dip >= BRD_WING_POCKET_MIN_MM && (!pick || pocket.dip > pick.pocket.dip)) pick = { pocket, stretch };
    });
    if (!pick) break;
    const { pocket, stretch } = pick as { pocket: Pocket; stretch: number };
    const inner = pts[pocket.innerIndex];
    const outer = pts[pocket.outerIndex];
    const run = outer[0] - inner[0];
    const slopeAhead = (halfWidthAt(outline, outer[0] + SLOPE_READ_MM) - outer[1]) / SLOPE_READ_MM;
    found.push({
      station: mm(outer[0]),
      inner: mm(inner[0]),
      run: mm(run),
      depth: mm(Math.max(0, outer[1] - inner[1] - slopeAhead * run)),
      dip: mm(pocket.dip),
      innerIndex: pocket.innerIndex,
      outerIndex: pocket.outerIndex,
    });
    const [lo, hi] = stretches[stretch];
    stretches.splice(stretch, 1, [lo, pocket.innerIndex], [pocket.outerIndex, hi]);
  }
  return found.sort((a, b) => b.station - a.station);
}
