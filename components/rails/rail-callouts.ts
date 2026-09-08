/**
 * Rail mark callout layout — pure diagram math, no React (D-17). This is *layout*, not shaping
 * geometry, so it lives under `components/`, not `lib/geometry/`, which CLAUDE.md Rule 1 reserves
 * for real shaping formulas. The ten anchor positions are ported from the prototype's own
 * `buildPlot` (reference/project/Rails.dc.html lines 1093-1132), copied character-for-character
 * rather than re-derived from `RailSegment` endpoints by inspection — Corner Cut's own `y` is
 * deliberately `railMark1`, not its segment's own p2 (RESEARCH.md Pitfall 1: that is the
 * prototype's design, not a bug to correct).
 *
 * The de-overlap pass below is a deliberate DEPARTURE from the prototype's own code (quick task
 * 260908-bk1). The prototype's comment at Rails.dc.html line 1106 says the true intent plainly:
 * "Only labels whose text would actually occupy overlapping horizontal space need vertical
 * separation." But its code never checked the text — it clustered labels by how close their
 * anchors sat on the x-axis (`BUCKET_PX`, 95px), and its labels were HTML spans that could quietly
 * overflow their box, hiding the consequence an SVG `<text>` clipped at the viewBox edge makes
 * obvious. On the real example rail, six same-side names chained into one 95px-bucket column even
 * though most of their text could never touch; that column overflowed the bottom axis rule, and
 * lifting the WHOLE column carried "Deck 3" clean off the top of the drawing. `deOverlapCallouts`
 * now estimates each label's actual text extent and competes labels only when those extents
 * overlap, and lifts only the competing pair that overflowed the ceiling — never the whole side.
 * Do not "restore parity" with the prototype's anchor-x chaining; that is what reintroduces this
 * bug.
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
/** Estimated viewBox width of one character at the pinned 11px bold callout face, measured
 * against "Domed Taper" (11 characters, 83 viewBox px at render scale 0.893, i.e. about 74 px at
 * scale 1) — roughly 6.7 viewBox px per character. Safe to use as an estimate at any render scale:
 * the face is pinned in *screen* px (components/viewer/callout-primitives.tsx's pinnedCalloutSizes),
 * so a label's viewBox width shrinks as the plot renders larger, making this scale-1 calibration
 * conservative (over-wide, never under-wide) on bigger renders, such as the order form's third
 * sheet at roughly scale 2.3. */
export const RAIL_CALLOUT_CHAR_PX = 6.7;
/** The gap between an anchor and the start of its drawn text. This mirrors the function-local
 * `CALLOUT_TEXT_GAP` inside `RailSectionPlot`'s own render (components/rails/rail-section-plot.tsx),
 * which is not exported — the two must stay equal, or the estimated text extents below stop
 * matching what is actually drawn. */
export const RAIL_CALLOUT_TEXT_GAP = 4;

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

/** Slack folded into the text-overlap test below, to cover the fact that `RAIL_CALLOUT_CHAR_PX` is
 * an estimate, not a measured width — two extents that merely touch within this margin are treated
 * as competing. This is slack for the estimate, not a design gap; it has no effect on how far apart
 * two competing labels are stacked (that is `minGap`, below). */
const RAIL_CALLOUT_OVERLAP_MARGIN = 2;

/** Estimates one label's horizontal text extent in viewBox px, mirroring how `RailSectionPlot`
 * actually draws it: `textAnchor="start"` growing rightward from `x + gap` on side 1, `"end"`
 * growing leftward from `x - gap` on side −1. */
function calloutTextExtent(c: Pick<RailCallout, "x" | "side" | "name">): readonly [number, number] {
  const width = c.name.length * RAIL_CALLOUT_CHAR_PX;
  return c.side >= 0
    ? [c.x + RAIL_CALLOUT_TEXT_GAP, c.x + RAIL_CALLOUT_TEXT_GAP + width]
    : [c.x - RAIL_CALLOUT_TEXT_GAP - width, c.x - RAIL_CALLOUT_TEXT_GAP];
}

/** Two labels compete for vertical space only when they are on the same `side` AND their estimated
 * text extents overlap (within `RAIL_CALLOUT_OVERLAP_MARGIN`). Anchor x-proximity plays no part —
 * this is the whole point of the rewrite (see the file's top comment). */
function calloutsCompete(a: RailCallout, b: RailCallout): boolean {
  if (a.side !== b.side) return false;
  const [aLo, aHi] = calloutTextExtent(a);
  const [bLo, bHi] = calloutTextExtent(b);
  return aLo <= bHi + RAIL_CALLOUT_OVERLAP_MARGIN && bLo <= aHi + RAIL_CALLOUT_OVERLAP_MARGIN;
}

/**
 * De-overlap pass keyed on estimated TEXT collision, not anchor-x proximity (quick task
 * 260908-bk1 — see the file's top comment for why this departs from the prototype's own code).
 * The two sides are processed independently; only labels whose estimated text extents actually
 * overlap ever move because of each other. Returns a new array of shallow copies in the SAME order
 * as `callouts` — only `y` changes.
 *
 * **Stacking pass (top-down):** each side's labels are visited in ascending y (stable for ties,
 * preserving input order). Each label's y becomes the max of its own y and `(y + minGap)` of every
 * earlier-visited label it competes with. A label with no competitors never moves.
 *
 * **Ceiling pass (bottom-up, only when `maxY` is supplied):** restores the prototype's own axis
 * ceiling (Rails.dc.html line 1113, `maxAllowedY = py(0) - 10`) without its "shift the whole
 * cluster" side effect. Each side's labels (in the same ascending-y order the stacking pass used)
 * are visited from the bottom up. A label past `maxY` is clamped to it; then any *competing* label
 * that sat earlier in the order and now sits less than `minGap` above the clamped label is pulled
 * up to `(y - minGap)`. This only ever touches the specific pair that overflowed — a label with no
 * competitor at the ceiling never moves, which is what keeps "Deck 3" on the plot even when
 * "Bottom Tuck 1"/"Bottom Tuck 3" overflow the axis rule two columns away.
 */
export function deOverlapCallouts(callouts: RailCallout[], minGap: number, maxY?: number): RailCallout[] {
  const working = callouts.map((c) => ({ ...c }));

  for (const sideVal of [1, -1] as const) {
    const bySide = working
      .map((c, originalIndex) => ({ c, originalIndex }))
      .filter((entry) => entry.c.side === sideVal)
      .sort((p, q) => p.c.y - q.c.y || p.originalIndex - q.originalIndex)
      .map((entry) => entry.c);

    // Stacking pass, top-down.
    for (let i = 0; i < bySide.length; i++) {
      const cur = bySide[i];
      let target = cur.y;
      for (let j = 0; j < i; j++) {
        const earlier = bySide[j];
        if (calloutsCompete(cur, earlier)) {
          target = Math.max(target, earlier.y + minGap);
        }
      }
      cur.y = target;
    }

    // Ceiling pass, bottom-up — only when a ceiling is supplied.
    if (maxY !== undefined) {
      for (let i = bySide.length - 1; i >= 0; i--) {
        const cur = bySide[i];
        if (cur.y > maxY) cur.y = maxY;
        for (let j = i - 1; j >= 0; j--) {
          const earlier = bySide[j];
          if (calloutsCompete(cur, earlier) && cur.y - earlier.y < minGap) {
            earlier.y = cur.y - minGap;
          }
        }
      }
    }
  }

  return working;
}
