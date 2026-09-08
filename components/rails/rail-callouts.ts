/**
 * Rail mark callout layout — pure diagram math, no React (D-17). This is *layout*, not shaping
 * geometry, so it lives under `components/`, not `lib/geometry/`, which CLAUDE.md Rule 1 reserves
 * for real shaping formulas.
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
 *
 * This file otherwise ports the prototype's own `buildPlot` anchor list (Rails.dc.html lines
 * 1093-1132), with four deliberate departures from it (quick task 260908-cme):
 *
 * (a) Corner Cut's anchor moved from the prototype's `(-cornerCutDeck, railMark1)` to its own
 * segment's apex end `(0, cornerCutRail)`, and its side from −1 to 1. At the prototype's anchor,
 * "Corner Cut" and "Rail Mk1" printed on one line about 20px apart either side of the apex and
 * read as one run of text — the shaper's own report. Corner Cut's apex end is 3.5px below Rail
 * Mk1 on the real example rail, so it genuinely IS an apex-column mark, and its name now stacks
 * in that column under Rail Mk1, in the marks' own top-to-bottom order. This is a layout change
 * only: `buildSegmentDefsInches` still draws the cornerCut segment between exactly the same two
 * endpoints it always has.
 *
 * (b) Bottom Tuck 2 is a name the prototype's list never had, although the point and its own
 * coloured `tuck2` line have always been drawn — added here so no drawn mark on the teaching
 * figure is left unnamed.
 *
 * (c) Bottom Tuck 1 and Bottom Tuck 3 are marks ON the bottom axis, so their names now hang below
 * it, centred under their own mark with a leader line up, rather than being lifted above it where
 * they land beside marks that are not theirs.
 */

import { CALLOUT_CHAR_PX } from "@/components/viewer/callout-primitives";
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
/** The per-character text-width estimate for the pinned callout face now lives in
 * `components/viewer/callout-primitives.tsx` as `CALLOUT_CHAR_PX`, beside the pinned face it was
 * measured against — the rail plot's own axis-tick labels (08-08) read from that same shared
 * estimate, so it moved rather than staying a second private copy in this file. */
/** The gap between an anchor and the start of its drawn text. This mirrors the function-local
 * `CALLOUT_TEXT_GAP` inside `RailSectionPlot`'s own render (components/rails/rail-section-plot.tsx),
 * which is not exported — the two must stay equal, or the estimated text extents below stop
 * matching what is actually drawn. */
export const RAIL_CALLOUT_TEXT_GAP = 4;
/** How far Bottom Tuck 2's name is lifted off its own point, because that point is where the Rail
 * Tuck 1 and Rail Tuck 2 lines meet — a name centred on it would print across both. The plot's y
 * grows downward, so the lift is applied as a negative `dy` on the anchor, the same way
 * `RAIL_CALLOUT_EDGE_LIFT` is. */
export const RAIL_CALLOUT_TUCK2_LIFT = 6;
/** How far below the bottom axis the first row of below-axis names (Bottom Tuck 1, Bottom Tuck 3)
 * sits: the plot's own module-private `AXIS_LABEL_PAD` (20 — the band the row of axis numbers
 * occupies) plus 8 of clearance, so a name below the axis clears those numbers rather than landing
 * among them, which is the fault quick task 260908-b35 fixed. Unlike `RAIL_CALLOUT_EDGE_LIFT`, this
 * is applied as a POSITIVE `dy` — the plot's y grows downward, so pushing a name further down the
 * page adds to it rather than subtracting. */
export const RAIL_CALLOUT_BELOW_AXIS_OFFSET = 28;

/** `1` reads rightward from its own point (the apex column); `-1` reads leftward back toward the
 * plot's own left margin; `0` reads centred BELOW the x-axis, with a thin leader line running up
 * to the mark it names. */
export type RailCalloutSide = 1 | 0 | -1;

/** One named mark on the example rail. Carries a name only — never a numeric value (D-19); the
 * DATA tab is where a shaper reads the actual measurements. */
export interface RailCallout {
  key: string;
  name: string;
  x: number;
  y: number;
  side: RailCalloutSide;
  color: string;
  /** The mark's own projected position — where the mark actually IS, as opposed to `x`/`y`, which
   * is where its NAME ends up after the de-overlap pass has moved it. Optional because
   * `deOverlapCallouts` accepts any `RailCallout[]`, including the synthetic ones built by hand in
   * this file's own tests; `buildRailCallouts` always sets both. */
  anchorX?: number;
  anchorY?: number;
}

/** The eleven marks' fixed identity — key, name and side never change with geometry, only their
 * `x`/`y` position does (ten on a rail with no second tuck line — Bottom Tuck 2 is filtered out
 * by `buildRailCallouts` when `hasTuck2` is false). Exported so a name/side/order assertion never
 * needs a full geometry fixture to check against.
 *
 * Corner Cut must come immediately after Rail Mk1: the two anchors start 3.5px apart on the real
 * example rail, and the de-overlap pass's stable sort falls back to input order, so this array
 * position is what fixes Corner Cut under Rail Mk1 rather than over it.
 *
 * `dy` (viewBox units, optional) now has three jobs, not one: a negative lift off a drawn line
 * (Deck 3, Deck 1, `-RAIL_CALLOUT_EDGE_LIFT`), a negative lift off the two tuck lines that cross at
 * a point (Bottom Tuck 2, `-RAIL_CALLOUT_TUCK2_LIFT`), and a positive push below the axis for the
 * two side-0 names (Bottom Tuck 1, Bottom Tuck 3, `+RAIL_CALLOUT_BELOW_AXIS_OFFSET`). Every other
 * entry carries no `dy` at all. */
export const RAIL_CALLOUT_ANCHORS: readonly { key: string; name: string; side: RailCalloutSide; dy?: number }[] = [
  { key: "apex", name: "Apex", side: 1 },
  { key: "domedTaper", name: "Domed Taper", side: 1 },
  { key: "railMk1", name: "Rail Mk1", side: 1 },
  { key: "cornerCut", name: "Corner Cut", side: 1 },
  { key: "deck3", name: "Deck 3", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
  { key: "deck2", name: "Deck 2", side: -1 },
  { key: "deck1", name: "Deck 1", side: -1, dy: -RAIL_CALLOUT_EDGE_LIFT },
  { key: "tuck1", name: "Tuck 1", side: 1 },
  { key: "bottomTuck1", name: "Bottom Tuck 1", side: 0, dy: RAIL_CALLOUT_BELOW_AXIS_OFFSET },
  { key: "bottomTuck2", name: "Bottom Tuck 2", side: -1, dy: -RAIL_CALLOUT_TUCK2_LIFT },
  { key: "bottomTuck3", name: "Bottom Tuck 3", side: 0, dy: RAIL_CALLOUT_BELOW_AXIS_OFFSET },
] as const;

export interface RailCalloutProjection {
  /** Projects an inches-domain x (board-relative, 0 at the rail apex, negative inboard) to the
   * plot's own pixel space — the same `px()` closure `RailSectionPlot` already builds. */
  px: (xIn: number) => number;
  /** Projects an inches-domain y to the plot's own pixel space — the same `py()` closure. */
  py: (yIn: number) => number;
}

/**
 * Builds the eleven mark callouts for one rail section's output (ten on a rail with no second
 * tuck line — a single-tuck or hard-edged section has no Bottom Tuck 2 point to name).
 * `thickness` is the section's own effective thickness (`output.thicknessEff`) — the same value
 * `buildRailSegments` was called with — because Deck 1 and Deck 3 sit at that height, not at the
 * domed-aware "blank thickness" the plot's reference lines use.
 *
 * Every anchor's `dy` — the edge lift, the tuck-2 lift, or the below-axis push — is applied here,
 * before any de-overlap pass runs, so the axis ceiling `deOverlapCallouts` restores still has the
 * final say on where the moved names end up once clustering is done.
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
  // "tuck2" at all (rail-bands.ts). This decides both Bottom Tuck 3's colour and, now, whether
  // Bottom Tuck 2 is emitted at all — a rail with no tuck2 line has no such point to name.
  const hasTuck2 = !r.hardEdge && !r.singleTuck;

  const positionsIn: Record<string, { x: number; y: number }> = {
    apex: { x: 0, y: mmToInches(r.apexCenter) },
    domedTaper: { x: 0, y: domedTaperYIn },
    railMk1: { x: 0, y: mmToInches(r.railMark1) },
    // Corner Cut's anchor is its own segment's apex end (0, cornerCutRail) — the `cornerCut`
    // segment's own p1 in buildSegmentDefsInches (rail-bands.ts) — not the deck end and not
    // Rail Mk1's height. `?? r.railMark1` covers the `removeCornerCut` case where `cornerCutRail`
    // is null and no cornerCut segment is drawn at all, reproducing exactly where the name sat
    // before this anchor moved.
    cornerCut: { x: 0, y: mmToInches(r.cornerCutRail ?? r.railMark1) },
    deck3: { x: -mmToInches(r.deckMark3), y: thicknessIn },
    deck2: { x: -deckMark2In, y: deck2YIn },
    deck1: { x: -deckMark1In, y: thicknessIn },
    tuck1: { x: 0, y: mmToInches(r.railTuck1) },
    bottomTuck1: { x: -mmToInches(r.bottomTuck1), y: 0 },
    // The `tuck2` segment's own p1 in buildSegmentDefsInches — read from that same expression
    // rather than inventing a second way to locate the point, so the name and the line it labels
    // can never drift apart.
    bottomTuck2: { x: -mmToInches(r.bottomTuck2), y: mmToInches(r.railTuck1) / 2 },
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
    bottomTuck2: RAIL_SEGMENT_COLORS.tuck2,
    bottomTuck3: hasTuck2 ? RAIL_SEGMENT_COLORS.tuck2 : RAIL_SEGMENT_COLORS.hardEdge,
  };

  // Bottom Tuck 2 is emitted only when its own line is drawn (hasTuck2) — a single-tuck or
  // hard-edged section simply produces no such callout, ten instead of eleven.
  const anchors = RAIL_CALLOUT_ANCHORS.filter((a) => a.key !== "bottomTuck2" || hasTuck2);

  return anchors.map((anchor) => {
    const pos = positionsIn[anchor.key];
    return {
      key: anchor.key,
      name: anchor.name,
      side: anchor.side,
      color: colors[anchor.key],
      x: px(pos.x),
      // The tick (or leader-line target) and the name are drawn from this same position
      // (rail-section-plot.tsx), so the lift moves both together — intended, since the mark's own
      // real position is already drawn as the coloured dot the plot puts at every segment
      // endpoint, and no leader line points at a name's own resting spot.
      y: py(pos.y) + (anchor.dy ?? 0),
      // The mark's own position with no `dy` folded in, so a below-axis leader line points at the
      // mark rather than at wherever the name ended up.
      anchorX: px(pos.x),
      anchorY: py(pos.y),
    };
  });
}

/** Slack folded into the text-overlap test below, to cover the fact that `CALLOUT_CHAR_PX` is an
 * estimate, not a measured width — two extents that merely touch within this margin are treated as
 * competing. This is slack for the estimate, not a design gap; it has no effect on how far apart
 * two competing labels are stacked (that is `minGap`, below). */
const RAIL_CALLOUT_OVERLAP_MARGIN = 2;

/** Estimates one label's horizontal text extent in viewBox px, mirroring how `RailSectionPlot`
 * actually draws it: `textAnchor="start"` growing rightward from `x + gap` on side 1, `"end"`
 * growing leftward from `x - gap` on side −1, and `"middle"` centred on `x` with no gap on side 0
 * — a centred label has no anchor to stand off from. Exported so a test can check a label's real
 * estimated box against the plot's real bounds using this same estimate, rather than a second copy
 * that can drift. */
export function calloutTextExtent(c: Pick<RailCallout, "x" | "side" | "name">): readonly [number, number] {
  const width = c.name.length * CALLOUT_CHAR_PX;
  if (c.side === 0) return [c.x - width / 2, c.x + width / 2];
  return c.side > 0
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
 * cluster" side effect. Runs for sides 1 and −1 only — this ceiling means "stay clear of the row
 * of numbers under the plot", and a side-0 name that lives below those numbers by design has
 * nothing to clear; applying it there would yank the two below-axis names straight back above the
 * axis. Each side's labels (in the same ascending-y order the stacking pass used) are visited from
 * the bottom up. A label past `maxY` is clamped to it; then any *competing* label that sat earlier
 * in the order and now sits less than `minGap` above the clamped label is pulled up to
 * `(y - minGap)`. This only ever touches the specific pair that overflowed — a label with no
 * competitor at the ceiling never moves, which is what keeps "Deck 3" on the plot even when
 * "Bottom Tuck 1"/"Bottom Tuck 3" overflow the axis rule two columns away.
 */
export function deOverlapCallouts(callouts: RailCallout[], minGap: number, maxY?: number): RailCallout[] {
  const working = callouts.map((c) => ({ ...c }));

  for (const sideVal of [1, -1, 0] as const) {
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

    // Ceiling pass is for sides 1 and −1 only (see the doc comment above); side 0 skips straight
    // past it.
    if (sideVal === 0) continue;

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
