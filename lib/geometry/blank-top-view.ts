/**
 * The picked blank seen from above, with the board's outline on it (quick 261006-qfm) — the small
 * reference drawing ROCKER shows in the corner of its VIEWER panel on a computer and in its own
 * TOP VIEW tab on a phone.
 *
 * The founder asked for it on 2026-10-02: "I think I want to show a miniature version of the blank
 * outline (with 12" stations, center, and stringer line) on the rocker viewer page. Ideally, with
 * the board outline also shown (no station marks) so a user can see that part of the board visually
 * too." On 2026-10-06 they settled the size: "The blank/board top view does not need to be the same
 * scale. It can be a mini display, it's really just for reference only." The side view shows the
 * fit from the side; this shows the one part of the fit the side view cannot — width — so a shaper
 * sees where the board lands on the blank's own marks and how much foam is left outside the rails.
 *
 * Everything here is in millimetres in the BOARD's coordinates (0 = the board's tail tip, the
 * board's length = its nose tip), the same frame `BlankSideView.start`/`end` already use:
 *
 * - The blank's outline runs through the catalogue's printed widths. Every half-width is
 *   `onBlank.blankWidthAt(s) / 2` — the same square-root width curve the fit check reads — sampled
 *   evenly from the blank's tail tip to its nose tip AND at every station whose width is printed, so
 *   the outline passes exactly through each printed number. A tip printed 0 wide is drawn ROUND, by
 *   the width curve's own rule (sketch 012 C, `round-tip.ts`, quick 261007-c3h) — which turns fastest
 *   right at the tip, so each tip's last printed segment gets extra samples (`TIP_SEGMENT_SAMPLES`)
 *   and the drawn line follows the round right up to the stringer; a tip printed wider still closes
 *   square. One half-width per station: mirror-symmetric about the stringer by construction.
 * - The board's outline is TEMPLATE's own silhouette (`silhouette`, the shape the phone's TEMPLATE
 *   tile and the Board Rack draw), notch and all, so a swallow shows its crotch and a diamond its
 *   point. The board never moves in its own coordinates; the Placement slider moves the blank.
 * - The blank's marks, as a shaper finds them pencilled on the foam: its centre (half the blank's
 *   length) and the two 12" marks, 12" in from each BLANK tip. Its stringer runs tip to tip.
 * - `widthDots` are the measuring points: one per printed width, at exactly half of it.
 *
 * With no blank picked (D-02), it is the board's outline alone — the stringer and the marks belong
 * to the blank.
 *
 * Every blank width comes from `blankWidthAt` and the board's shape from `silhouette`; no formula is
 * repeated here. Inches happen in the drawing, through `mmToInches`.
 *
 * No React/browser/database import — pure geometry, unit-tested in blank-top-view.test.ts, per
 * CLAUDE.md Rule 1.
 */
import type { BlankSideView } from "./board-profile";
import { MEASURE_STATION_MM, type OutlineGeometry } from "./outline";
import { silhouette } from "./screen-tiles";
import { mm, type Mm } from "./units";

/** One point on the blank's outline: a station and the half-width either side of the stringer. */
export interface TopViewSample {
  station: Mm;
  halfWidth: Mm;
}

/** One point on the board's closed outline: a station and a SIGNED half-width (+ one rail, − the
 * other), in the order TEMPLATE draws it. */
export interface TopViewBoardPoint {
  station: Mm;
  w: Mm;
}

/** The blank's three marks, tail to nose. */
export type TopViewMarkLabel = "T12" | "C" | "N12";

/** A line across the blank's full width at `station`. */
export interface TopViewMark {
  label: TopViewMarkLabel;
  station: Mm;
  halfWidth: Mm;
}

/** Everything the top view draws, in millimetres in the board's coordinates. */
export interface BlankTopView {
  /** The blank's outline, tail tip to nose tip; empty with no blank. */
  blankOutline: TopViewSample[];
  /** The board's closed outline, TEMPLATE's own silhouette. */
  boardOutline: TopViewBoardPoint[];
  /** T12, C, N12; empty with no blank. */
  marks: TopViewMark[];
  /** The blank's stringer, tip to tip; null with no blank. */
  stringer: { from: Mm; to: Mm } | null;
  /** The measuring points: one per printed width, at exactly half of it. */
  widthDots: TopViewSample[];
  /** The widest half-width anywhere in the drawing, blank or board. */
  halfWidthMax: Mm;
  /** The drawn length: the board's own 0 to length, stretched to wherever the blank reaches past
   * either tip (D-12). */
  extent: { from: Mm; to: Mm };
}

export interface BlankTopViewInput {
  blank: BlankSideView | null;
  geometry: OutlineGeometry;
  length: Mm;
  /** How many even steps the BLANK's outline is sampled in — a drawing parameter only. The board's
   * shape comes from TEMPLATE's own points. */
  samples: number;
}

/** Stations closer than this are one station — the printed stations land on the even grid at the
 * tips, and a duplicate would only add a zero-length segment. */
const SAME_STATION_MM = 1e-6;

/**
 * How many extra samples each tip's last printed segment gets (quick 261007-c3h, D6), spaced evenly
 * in the SQUARE ROOT of the distance from the tip. A round nose is a parabola from the tip, and a
 * parabola turns fastest right at its tip, so even steps in the square root crowd the samples exactly
 * where the curve needs them. Measured on the blank's own outline (perpendicular distance from the
 * true curve to the drawn line): with 24 steps the line strays 0.074 mm on the 7'4"SP, 0.073 mm on
 * the 9'4"B and 0.145 mm at worst over every rounded blank a shaper can pick; 16 would be 0.17 mm,
 * 12 would be 0.29 mm, and the old even spacing alone left a visible flat facet of 5 to 8 mm. A
 * drawing parameter only, always on at both tips: on a square or a pointed tip the extra points just
 * sit on the curve and change nothing a shaper can see.
 */
export const TIP_SEGMENT_SAMPLES = 24;

/** A corrupt width (NaN, ∞, or below zero) reads as no foam there, never a broken path. */
function halfWidthOf(fullWidth: number): Mm {
  const half = fullWidth / 2;
  return mm(Number.isFinite(half) && half > 0 ? half : 0);
}

/** The blank and the board seen from above (quick 261006-qfm). */
export function buildBlankTopView({ blank, geometry, length, samples }: BlankTopViewInput): BlankTopView {
  const boardOutline: TopViewBoardPoint[] = silhouette(geometry).map(({ station, w }) => ({
    station: mm(station),
    w: mm(w),
  }));
  const boardMax = boardOutline.reduce((max, p) => Math.max(max, Math.abs(p.w)), 0);

  if (!blank) {
    return {
      blankOutline: [],
      boardOutline,
      marks: [],
      stringer: null,
      widthDots: [],
      halfWidthMax: mm(Number.isFinite(boardMax) ? boardMax : 0),
      extent: { from: mm(0), to: length },
    };
  }

  const { start, end, onBlank, record } = blank;
  const steps = Number.isFinite(samples) ? Math.max(2, Math.floor(samples)) : 2;
  const widthAt = (s: number) => halfWidthOf(onBlank.blankWidthAt(mm(s)));

  const printed = record.stations.filter((station) => station.widthMm !== null);
  const candidates: number[] = [];
  for (let i = 0; i <= steps; i++) candidates.push(i === steps ? end : start + ((end - start) * i) / steps);
  for (const station of printed) candidates.push(start + station.fromTailMm);
  if (printed.length >= 2) {
    // The last printed segment at each tip, closer together toward the tip (D6): the round nose is a
    // parabola from the tip, so even steps in √(distance from the tip) follow it closely.
    const tail = printed[0].fromTailMm;
    const tailReach = printed[1].fromTailMm - tail;
    const nose = printed[printed.length - 1].fromTailMm;
    const noseReach = nose - printed[printed.length - 2].fromTailMm;
    for (let i = 1; i < TIP_SEGMENT_SAMPLES; i++) {
      const d = (i / TIP_SEGMENT_SAMPLES) ** 2;
      candidates.push(start + tail + d * tailReach);
      candidates.push(start + nose - d * noseReach);
    }
  }
  candidates.sort((a, b) => a - b);
  const stations: number[] = [];
  for (const s of candidates) {
    if (stations.length === 0 || s - stations[stations.length - 1] > SAME_STATION_MM) stations.push(s);
  }

  const blankOutline: TopViewSample[] = stations.map((s) => ({ station: mm(s), halfWidth: widthAt(s) }));

  const markAt = (label: TopViewMarkLabel, s: number): TopViewMark => ({
    label,
    station: mm(s),
    halfWidth: widthAt(s),
  });
  const marks: TopViewMark[] = [
    markAt("T12", start + MEASURE_STATION_MM),
    markAt("C", (start + end) / 2),
    markAt("N12", end - MEASURE_STATION_MM),
  ];

  const widthDots: TopViewSample[] = printed.map((station) => ({
    station: mm(start + station.fromTailMm),
    halfWidth: mm(station.widthMm! / 2),
  }));

  const blankMax = blankOutline.reduce((max, s) => Math.max(max, s.halfWidth), 0);
  const halfWidthMax = Math.max(blankMax, boardMax);

  return {
    blankOutline,
    boardOutline,
    marks,
    stringer: { from: start, to: end },
    widthDots,
    halfWidthMax: mm(Number.isFinite(halfWidthMax) ? halfWidthMax : 0),
    extent: { from: mm(Math.min(0, start)), to: mm(Math.max(length, end)) },
  };
}
