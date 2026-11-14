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
 * The corners (quick 261113-m5w, the founder, 2026-11-13: "Fit the corner radius too ... only round a corner when the file
 * clearly has one"). A step's radius trades against its position and run: a short step with big rounds and a long step with
 * small rounds draw nearly the same S. So a wing is searched by its FOOTPRINT instead (`wingFromFootprint`: where the step
 * leaves the curve, where it reaches full depth, its depth, and the radius as a share of the most that fits), which the file
 * shows plainly, and only the share is subtle. The share can only be read where the file really holds it. Through this app's
 * own writer a sharp corner turning more than 30 degrees stays a corner, and every gentler one is smoothed by curves within
 * half a millimetre, so a radius that moves the corner by less than about a millimetre cannot honestly be told from sharp.
 * The evidence is the corner's INSET (`wingCornerInset`): how far the best rounded wing's corner sits inside the sharp corner
 * it rounds. Sharp corners measured at most 0.43 mm (the Fryer's flyer 0.02 mm); clearly rounded ones 1.35 mm and up; the
 * line is 1.1 mm (`BRD_WING_ROUND_INSET_MIN_MM`), 0.67 mm above every sharp corner and 0.05 mm over the slightest rounded
 * one that cannot be told. The rounded wing must also fit the step 0.1 mm closer than the best sharp one
 * (`BRD_WING_ROUND_BETTER_MIN_MM`): sharp corners gain at most 0.03 mm, every wing that came back rounded 0.12 mm or more. A
 * corner between the two lines opens sharp, as ever: a gentle step's radius is nearly always below them (the app's own
 * "+ Add wing 2" sits about 0.4 mm inside through the writer).
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1); all lengths are millimetres. It must not import
 * `brd-fit.ts` (that file imports this one), so it carries its own half-width reader.
 */
import type { P2 } from "./bezier-fit";
import { inchesToMm, mm, type Mm } from "./units";
import { MAX_WINGS, WING_RUN_RANGE_IN, effectiveWingRadius, maxWingRadius, type Wing } from "./wings";

/** The shallowest dip under a straightedge that is called a wing: 1/32", 25 times above the largest wobble measured on a wingless board. */
export const BRD_WING_POCKET_MIN_MM = inchesToMm(1 / 32);

/** The longest step a wing may take, measured along the stringer: the longest run (2") plus an inch for rounded corners. */
export const BRD_WING_STEP_MAX_MM = inchesToMm(WING_RUN_RANGE_IN.max + 1);

/** The stretch a wing's corners are fitted on: from the file wing's inner point less this to its outer corner plus this (1 1/2": the step, its rounds and room for the curve either side). */
export const BRD_WING_CORNER_WINDOW_MM = inchesToMm(1.5);

/** How far past the step the evidence for a rounded corner is read: a quarter inch either side, so the curve's own misfit further out never counts. */
export const BRD_WING_CORNER_PAD_MM = inchesToMm(1 / 4);

/** A corner reads as rounded only when it sits at least this far inside the sharp one: 0.67 mm above every sharp corner measured (at most 0.43 mm), 0.05 mm over the slightest rounded one that cannot be told. */
export const BRD_WING_ROUND_INSET_MIN_MM = 1.1;

/** ... and only when the rounded wing fits the step at least this much closer than the best sharp one: sharp corners gain at most 0.03 mm, every wing that came back rounded 0.12 mm or more. */
export const BRD_WING_ROUND_BETTER_MIN_MM = 0.1;

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

/**
 * How far a wing's rounded corner sits inside the sharp corner it rounds: R (1 / cos(turn / 2) - 1), R the radius the step
 * actually uses (never more than fits) and turn the step's own turn, atan2(depth, run). Nothing for a sharp wing; for a
 * square step R (square root of 2, less 1). It is the evidence a file's corner is rounded: it measured 0.17 mm for a true
 * 0.17 mm, 1.55 for 1.70, 3.08 for 3.53 on outlines drawn exactly.
 */
export function wingCornerInset(w: Pick<Wing, "depth" | "run" | "radius">): Mm {
  const radius = effectiveWingRadius(w);
  const turn = Math.atan2(w.depth, Math.max(w.run, 0));
  return mm(radius * (1 / Math.cos(turn / 2) - 1));
}

/**
 * A wing from its footprint: the inverse of `wingFootprint`. `stepStart` is where the step leaves the curve (nose-most),
 * `inner` where it reaches full depth, and `share` (0 to 1) the corner radius as a share of the most that fits: 0 is the
 * sharp wing from `stepStart` to `inner`, 1 the step rounded as far as it fits. With F the footprint and k = 1 - share^2, the
 * run is (F - share sqrt(F^2 + k depth^2)) / k (or (F^2 - depth^2) / 2F as k reaches 0), nothing when the footprint is
 * shorter than the rounds, and is held inside the WINGS tab's run range. Everything else about `base` (its lock and fin
 * offset) is kept.
 */
export function wingFromFootprint(stepStart: number, inner: number, depth: number, share: number, base: Wing): Wing {
  const footprint = Math.max(0, stepStart - inner);
  const k = 1 - share * share;
  const raw =
    footprint <= 0 ? 0 : k < 1e-9 ? (footprint * footprint - depth * depth) / (2 * footprint) : (footprint - share * Math.sqrt(footprint * footprint + k * depth * depth)) / k;
  const run = Math.min(inchesToMm(WING_RUN_RANGE_IN.max), Math.max(inchesToMm(WING_RUN_RANGE_IN.min), raw));
  const radius = share * maxWingRadius({ depth: mm(depth), run: mm(run) });
  const tangent = (share * Math.hypot(run, depth)) / 2;
  return { ...base, station: mm(stepStart - tangent), depth: mm(depth), run: mm(run), radius: mm(radius) };
}

/** A file wing's corners as the fit measured them (see `wingCornerInset`). */
export interface BrdWingCorner {
  /** The rule in the header: the file's corners are clearly rounded. When false they read as sharp, however slightly rounded. */
  rounded: boolean;
  /** The rounded wing that fits the file's step best with our curve held, in the WINGS tab's terms. */
  measured: { station: Mm; depth: Mm; run: Mm; radius: Mm };
  /** `wingCornerInset` of `measured`. */
  inset: Mm;
  /** How much closer the rounded wing fits the step than the best sharp one, at the step's widest gap. */
  better: Mm;
}
