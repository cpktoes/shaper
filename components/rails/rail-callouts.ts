/**
 * Rail mark callout layout — pure diagram math, no React (D-17). This is *layout*, not shaping
 * geometry, so it lives under `components/`, not `lib/geometry/`, which CLAUDE.md Rule 1 reserves
 * for real shaping formulas. The ten anchor positions and the cluster-and-push de-overlap pass
 * below are ported from the prototype's own `buildPlot` (reference/project/Rails.dc.html lines
 * 1093-1132), copied character-for-character rather than re-derived from `RailSegment` endpoints
 * by inspection — Corner Cut's own `y` is deliberately `railMark1`, not its segment's own p2
 * (RESEARCH.md Pitfall 1: that is the prototype's design, not a bug to correct).
 */

import { RAIL_SEGMENT_COLORS } from "./rail-section-plot";
import type { RailSectionOutput } from "@/lib/geometry/rail-bands";
import { mmToInches, type Mm } from "@/lib/geometry/units";

/** Matches `rail-section-plot.tsx`'s own inline Apex Center dot colour — not exported there as a
 * named constant, so it is repeated here rather than reached into that file's dot-drawing loop. */
const APEX_CENTER_COLOR = "#a8425f";

/** The prototype's own minimum vertical gap between two labels stacked in the same column
 * (Rails.dc.html line 1111, `MIN_GAP`). */
export const RAIL_CALLOUT_MIN_GAP = 17;
/** The prototype's own x-proximity threshold for clustering labels into one stack before applying
 * the minimum gap (Rails.dc.html line 1112, `BUCKET_PX`). */
export const RAIL_CALLOUT_BUCKET_PX = 95;
/** The prototype's own gap between the lowest a label may sit and the x-axis (Rails.dc.html line
 * 1113, `py(0) - 10`). This is what keeps the row of axis numbers under the plot a row of numbers
 * — with it, no mark name gets pushed down into the axis tick labels. */
export const RAIL_CALLOUT_AXIS_CLEARANCE = 10;
/** How far a mark name that's anchored exactly on a drawn line (Deck 3 and Deck 1 on the top deck
 * line, Bottom Tuck 1 and Bottom Tuck 3 on the bottom axis) is lifted off it, in viewBox units.
 * Without this, those four names used to print straight through both the line and their own
 * coloured dot; now they read just above the line instead. The plot's y grows downward, so the
 * lift is applied as a negative `dy` on the anchor. */
export const RAIL_CALLOUT_EDGE_LIFT = 8;

export type RailCalloutSide = 1 | -1;

/** One named mark on the example rail. Carries a name only — never a numeric value (D-19); the
 * DATA tab is where a shaper reads the actual measurements. */
export interface RailCallout {
  key: string;
  name: string;
  x: number;
  y: number;
  side: RailCalloutSide;
  color: string;
}

/** The ten marks' fixed identity — key, name and side never change with geometry, only their
 * `x`/`y` position does. Exported so a name/side/order assertion never needs a full geometry
 * fixture to check against (the prototype's own `raw` array order, lines 1093-1103).
 *
 * `dy` (viewBox units, optional) is set only on the four marks anchored exactly on a drawn line —
 * Deck 3 and Deck 1 on the top deck line, Bottom Tuck 1 and Bottom Tuck 3 on the bottom axis — as
 * the negated `RAIL_CALLOUT_EDGE_LIFT`, so the name reads just above the line instead of straddling
 * it and its own dot. Every other entry carries no `dy` at all. */
export const RAIL_CALLOUT_ANCHORS: readonly { key: string; name: string; side: RailCalloutSide; dy?: number }[] = [
  { key: "apex", name: "Apex", side: 1 },
  { key: "domedTaper", name: "Domed Taper", side: 1 },
  { key: "railMk1", name: "Rail Mk1", side: 1 },
  { key: "cornerCut", name: "Corner Cut", side: -1 },
  { key: "deck3", name: "Deck 3", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
  { key: "deck2", name: "Deck 2", side: -1 },
  { key: "deck1", name: "Deck 1", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
  { key: "tuck1", name: "Tuck 1", side: 1 },
  { key: "bottomTuck1", name: "Bottom Tuck 1", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
  { key: "bottomTuck3", name: "Bottom Tuck 3", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
] as const;

export interface RailCalloutProjection {
  /** Projects an inches-domain x (board-relative, 0 at the rail apex, negative inboard) to the
   * plot's own pixel space — the same `px()` closure `RailSectionPlot` already builds. */
  px: (xIn: number) => number;
  /** Projects an inches-domain y to the plot's own pixel space — the same `py()` closure. */
  py: (yIn: number) => number;
}

/**
 * Builds the ten mark callouts for one rail section's output, in the prototype's own fixed order.
 * `thickness` is the section's own effective thickness (`output.thicknessEff`) — the same value
 * `buildRailSegments` was called with — because Deck 1 and Deck 3 sit at that height, not at the
 * domed-aware "blank thickness" the plot's reference lines use.
 *
 * The four line-anchored marks' `dy` lift (`RAIL_CALLOUT_EDGE_LIFT`) is applied here, before any
 * de-overlap pass runs, so the axis ceiling `deOverlapCallouts` restores still has the final say
 * on where the two bottom-edge names end up once clustering is done.
 */
export function buildRailCallouts(
  output: RailSectionOutput,
  thickness: Mm,
  projection: RailCalloutProjection,
): RailCallout[] {
  const { px, py } = projection;
  const r = output.result;
  const thicknessIn = mmToInches(thickness);

  const band1 = output.segments.find((s) => s.key === "band1");
  const domedBand = output.segments.find((s) => s.key === "domedBand");

  const deckMark1In = mmToInches(r.deckMark1);
  const deckMark2In = mmToInches(r.deckMark2);
  // Deck 2's y sits exactly on the Rail Band 1 line at its own x, interpolated between that
  // segment's own two endpoints — the same relationship buildSegmentDefsInches already enforces
  // when it draws the "band2" segment's own p1 (rail-bands.ts's own band1Y), read here from the
  // already-built segment rather than recomputing the geometry a second time.
  const deck2T = deckMark1In > 0 ? deckMark2In / deckMark1In : 0;
  const band1P1YIn = band1 ? mmToInches(band1.p1.y) : 0;
  const band1P2YIn = band1 ? mmToInches(band1.p2.y) : 0;
  const deck2YIn = band1P1YIn + (band1P2YIn - band1P1YIn) * deck2T;

  const domedTaperYIn = domedBand ? mmToInches(domedBand.p1.y) : mmToInches(r.apexCenter);
  // A second bottom tuck line (Rail Tuck 2, key "tuck2") exists whenever the rail isn't hard-edged
  // or single-tucked — the same condition buildSegmentDefsInches uses to decide whether it draws
  // "tuck2" at all (rail-bands.ts). Bottom Tuck 3 reads that segment's own colour when present.
  const hasTuck2 = !r.hardEdge && !r.singleTuck;

  const positionsIn: Record<string, { x: number; y: number }> = {
    apex: { x: 0, y: mmToInches(r.apexCenter) },
    domedTaper: { x: 0, y: domedTaperYIn },
    railMk1: { x: 0, y: mmToInches(r.railMark1) },
    // Corner Cut's y is railMark1, not the cornerCut segment's own p2 (Pitfall 1) — the prototype's
    // own raw[3] entry reads `py(r.railMark1)`, not `py(band1Y(-r.cornerCutDeck))`.
    cornerCut: { x: -mmToInches(r.cornerCutDeck ?? (0 as Mm)), y: mmToInches(r.railMark1) },
    deck3: { x: -mmToInches(r.deckMark3), y: thicknessIn },
    deck2: { x: -deckMark2In, y: deck2YIn },
    deck1: { x: -deckMark1In, y: thicknessIn },
    tuck1: { x: 0, y: mmToInches(r.railTuck1) },
    bottomTuck1: { x: -mmToInches(r.bottomTuck1), y: 0 },
    bottomTuck3: { x: -mmToInches(r.bottomTuck3), y: 0 },
  };

  const colors: Record<string, string> = {
    apex: APEX_CENTER_COLOR,
    domedTaper: RAIL_SEGMENT_COLORS.domedBand,
    railMk1: RAIL_SEGMENT_COLORS.band1,
    cornerCut: RAIL_SEGMENT_COLORS.cornerCut,
    deck3: RAIL_SEGMENT_COLORS.band1,
    deck2: RAIL_SEGMENT_COLORS.band1,
    deck1: RAIL_SEGMENT_COLORS.band1,
    tuck1: RAIL_SEGMENT_COLORS.tuck1,
    bottomTuck1: RAIL_SEGMENT_COLORS.hardEdge,
    bottomTuck3: hasTuck2 ? RAIL_SEGMENT_COLORS.tuck2 : RAIL_SEGMENT_COLORS.hardEdge,
  };

  return RAIL_CALLOUT_ANCHORS.map((anchor) => {
    const pos = positionsIn[anchor.key];
    return {
      key: anchor.key,
      name: anchor.name,
      side: anchor.side,
      color: colors[anchor.key],
      x: px(pos.x),
      // The tick and the name are drawn at this same position (rail-section-plot.tsx), so the
      // lift moves both together — intended, since the mark's own real position is already drawn
      // as the coloured dot the plot puts at every segment endpoint, and no leader line is added.
      y: py(pos.y) + (anchor.dy ?? 0),
    };
  });
}

/**
 * The prototype's own cluster-and-push de-overlap pass (Rails.dc.html lines 1104-1132): split by
 * `side`, sort by x and chain into clusters wherever consecutive x values are within `BUCKET_PX`,
 * then within each cluster sort by y and push any entry closer than `minGap` to the previous one
 * down to exactly that gap. The two sides are processed independently. Returns a new array of
 * shallow copies in the SAME order as `callouts` — only `y` changes — because clustering sorts
 * temporary per-side arrays, never the returned array itself (matching the prototype's own
 * `raw.map(...)` at the end, which reads the original array order after the pass has mutated each
 * entry's `y` in place).
 *
 * The optional third parameter `maxY` restores the one step the port had dropped: the prototype's
 * own axis ceiling (Rails.dc.html line 1113, `maxAllowedY = py(0) - 10`). After a cluster has been
 * stacked, if its lowest (largest-y) entry falls past `maxY`, the WHOLE cluster is shifted up by
 * that same overflow — never an individual label, which would re-collapse the gaps the stacking
 * loop just created (Rails.dc.html lines 1122-1124). Without it, two bottom-edge marks whose
 * anchors are close enough to cluster get pushed down into the axis tick labels. Absent `maxY`
 * there is no ceiling and the pass behaves exactly as it always has, which is what keeps the
 * existing callers and tests passing unedited.
 */
export function deOverlapCallouts(callouts: RailCallout[], minGap: number, maxY?: number): RailCallout[] {
  const working = callouts.map((c) => ({ ...c }));

  for (const sideVal of [1, -1] as const) {
    const bySide = working.filter((c) => c.side === sideVal).sort((a, b) => a.x - b.x);
    let cluster: RailCallout[] = [];
    const flush = () => {
      if (cluster.length === 0) return;
      cluster.sort((a, b) => a.y - b.y);
      for (let i = 1; i < cluster.length; i++) {
        if (cluster[i].y - cluster[i - 1].y < minGap) {
          cluster[i].y = cluster[i - 1].y + minGap;
        }
      }
      if (maxY !== undefined) {
        const overflow = cluster[cluster.length - 1].y - maxY;
        if (overflow > 0) {
          for (const c of cluster) c.y -= overflow;
        }
      }
      cluster = [];
    };
    bySide.forEach((c, i) => {
      if (i > 0 && c.x - bySide[i - 1].x > RAIL_CALLOUT_BUCKET_PX) flush();
      cluster.push(c);
    });
    flush();
  }

  return working;
}
