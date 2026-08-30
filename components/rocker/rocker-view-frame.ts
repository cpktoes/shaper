/**
 * The rocker/foil side-profile viewer's scale and frame — the ONE place this drawing's scale and
 * frame are decided, for both orientations. Pure geometry, no React import (per `import type`
 * only for the orientation-shaped literal below), so it can be verified in `rocker-view-frame.test.ts`
 * in isolation from `rocker-viewer.tsx`.
 *
 * `rocker-viewer.tsx` draws from the `RockerViewLayout` this module produces; it derives no
 * scale or frame arithmetic of its own (quick task 260829-tmj).
 */

import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";

/** Which way the rocker drawing is currently turned — mirrors `ViewerOrientation` in
 * `callout-primitives.tsx`, kept as its own literal union here so this module carries no
 * React-shaped import. */
export type RockerViewOrientation = "horizontal" | "vertical";

export interface RockerViewLayoutInput {
  /** The board's own length, in inches. May be a corrupt/degenerate value carried by a saved
   * design (0, negative, `NaN`) — see the fallback rule on `scale` below (threat T-TMJ-02). */
  lengthIn: number;
  /** The worst-case deck height (rocker lift + foil thickness) any board this app can produce,
   * in inches. Reserved on the frame's cross axis regardless of scale — see the header comment
   * on `PX_PER_INCH`'s replacement, `scale`, for why this stays a constant rather than fitting
   * to this board's own values (planner finding 3: the drawing is long-axis-bound in every
   * realistic panel, so trimming this reserve would only grow the empty band, not shrink it). */
  maxDeckIn: number;
  orientation: RockerViewOrientation;
  /**
   * The editor-only frame gate (planner finding 7). `true` scales every board's own length to
   * fill the frame's long axis, so a 5'0" board and a 10'0" board both draw at the same share of
   * the panel. `false` (the Summary order form's path, `components/summary/order-form.tsx` line
   * 341) keeps the fixed range-derived scale this viewer has always used — the order form's
   * frame must never resize around whichever board happens to be loaded (quick task 260823-h6l
   * set that precedent for the outline viewer's own `fixedFrame`).
   */
  fitToBoard: boolean;
}

export interface RockerViewLayout {
  /** User units per inch, shared by BOTH axes — a shaper checks a rocker line with a
   * straightedge, so the drawing never exaggerates the vertical axis for legibility (one `scale`
   * field is what makes that true by construction, not by convention). */
  scale: number;
  viewH: number;
  baselineY: number;
  /** Where a station tick line stops — always `baselineY + RAIL_GAP`, in both orientations, so a
   * tick still stops at the card's own near edge rather than running into its middle once the
   * vertical rail moves off this same value (see `railY`). */
  tickEndY: number;
  /** The card rail's own anchor. `baselineY + RAIL_GAP` in horizontal; in vertical a rotated card
   * presents its WIDTH across the rail rather than its height, so the anchor clears the baseline
   * by `RAIL_GAP + cardWidth / 2` instead. */
  railY: number;
  /** Extra offset applied to a card's own position along the rotated station axis — 0 in
   * horizontal; `-cardHeight / 2` in vertical, centring each card on the station it names. */
  cardDy: number;
  cardWidth: number;
  cardHeight: number;
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** The four frame numbers above, each at two decimals, ready for an svg `viewBox` attribute. */
  viewBox: string;
}

/** The drawing's own canonical width, in SVG user units — unchanged by `fitToBoard`; what grows
 * or shrinks per board is `scale`, never this frame constant. */
export const VIEW_W = 900;
/** Left/right pad inside `VIEW_W` the board's own drawn span sits within. */
export const PAD_X = 40;
export const PAD_TOP = 26;
/** Gap between the baseline and the output rail's tick marks. */
export const RAIL_GAP = 20;
/** Each station card's height, in SVG user units — room for its three stacked rows (station
 * name, then the two values) at this drawing's existing type scale. */
export const STATION_CARD_HEIGHT = 50;

/** The range-derived fixed scale — `PX_PER_INCH` before this module existed, and still what
 * `fitToBoard: false` (the order form's path) resolves to for every board length alike. */
const FIXED_SCALE = (VIEW_W - PAD_X * 2) / BOARD_LENGTH_RANGE_IN.max;

/**
 * Each station card's width, in SVG user units — derived from the rail's own narrowest column
 * pitch, the 12in tip-to-station span, rather than written as a literal, so the relationship
 * that keeps neighbouring cards apart survives any future change to the frame's scale.
 *
 * Under `fitToBoard`, the scale is `820 / lengthIn`, which is SMALLEST at the longest board — so
 * the narrowest 12in column pitch any board can produce is still `12 * FIXED_SCALE`, the same
 * worst case this expression already encoded before `fitToBoard` existed (planner finding 6).
 * The gutter between neighbouring cards only ever grows as the board gets shorter. An 8-unit
 * gutter is left between neighbouring cards.
 */
export const STATION_CARD_WIDTH = 12 * FIXED_SCALE - 8;
/** Room below the baseline for one station card — re-expressed off `STATION_CARD_HEIGHT` so it
 * still evaluates to 58 and `viewH` (and every consumer's box aspect, including the Summary
 * order form's rocker box) is numerically unchanged. */
export const RAIL_LABEL_HEIGHT = STATION_CARD_HEIGHT + 8;
const BOTTOM_PAD = RAIL_GAP + RAIL_LABEL_HEIGHT;

/**
 * A corrupt saved board must not blank the screen (threat T-TMJ-02): a zero, negative or
 * non-finite length falls back to `BOARD_LENGTH_RANGE_IN.max` (the same board `FIXED_SCALE`
 * itself is derived from) rather than propagating a `NaN`; any finite positive length is clamped
 * into `BOARD_LENGTH_RANGE_IN` first, so a value outside the app's own slider range still
 * produces a sane frame. Shared by `scale` and the vertical frame's own long-axis span below, so
 * the two never disagree about how long the drawn board actually is.
 */
function resolveEffectiveLengthIn(lengthIn: number): number {
  if (!Number.isFinite(lengthIn) || lengthIn <= 0) return BOARD_LENGTH_RANGE_IN.max;
  return Math.min(Math.max(lengthIn, BOARD_LENGTH_RANGE_IN.min), BOARD_LENGTH_RANGE_IN.max);
}

/**
 * The fit-to-board scale rule, mirroring `outlineViewMetrics`'s `lengthFitScale`
 * (`components/outline/outline-viewer.tsx`): every board's nose-to-tail spans the full
 * `VIEW_W - 2 * PAD_X` (820-unit) drawing area, instead of every board sharing one scale derived
 * from the longest board this app can produce.
 */
function resolveScale(lengthIn: number, fitToBoard: boolean): number {
  if (!fitToBoard) return FIXED_SCALE;
  return (VIEW_W - PAD_X * 2) / resolveEffectiveLengthIn(lengthIn);
}

/**
 * The rocker drawing's scale and frame, for a given board and orientation — the single source
 * `rocker-viewer.tsx` reads `pxX`, `pxY` and `toBoardPoint`'s inverse from, so a drag can never
 * solve against a different scale than the drawing was made with (planner finding 9).
 *
 * The horizontal frame is built from its own formulas. The vertical frame is built from its own
 * rotated content — the nose card's near edge to the tail card's far edge on the long axis, the
 * card rail's own outer edge to the baseline on the cross axis — rather than a transposition of
 * the horizontal frame, the defect quick task 260825-w8d fixed on the outline viewer.
 */
export function rockerViewLayout({
  lengthIn,
  maxDeckIn,
  orientation,
  fitToBoard,
}: RockerViewLayoutInput): RockerViewLayout {
  const scale = resolveScale(lengthIn, fitToBoard);
  const viewH = PAD_TOP + maxDeckIn * scale + BOTTOM_PAD;
  const baselineY = viewH - BOTTOM_PAD;
  const cardWidth = STATION_CARD_WIDTH;
  const cardHeight = STATION_CARD_HEIGHT;
  const horizontal = orientation === "horizontal";

  let minX: number;
  let minY: number;
  let width: number;
  let height: number;
  let railY: number;
  let tickEndY: number;
  let cardDy: number;

  if (horizontal) {
    minX = 0;
    minY = 0;
    width = VIEW_W;
    height = viewH;
    railY = baselineY + RAIL_GAP;
    tickEndY = railY;
    cardDy = 0;
  } else {
    // A rotated card presents its WIDTH across the rail (finding 4), so the rail anchor has to
    // clear the baseline by the card's own half-width, not its half-height — that is the fix for
    // the 17-unit overlap the un-rotated `baselineY + RAIL_GAP` formula left. `tickEndY` stays at
    // that un-rotated value in BOTH orientations, so a station tick still stops at the card's own
    // near edge rather than running into its middle.
    railY = baselineY + RAIL_GAP + cardWidth / 2;
    tickEndY = baselineY + RAIL_GAP;
    // Centres each card on the station it names (planner_assumptions #4) — a side effect this
    // also halves the tail card's own overhang past its station, which is most of what closes the
    // frame's long axis onto the tail card below.
    cardDy = -cardHeight / 2;

    // Cross axis (rotated "width"): from the card rail's own outer edge — `railY + cardWidth / 2`
    // — out to the baseline/rail side (canonical x = 0 there, unchanged since Task 1), with the
    // same 8-unit gutter `STATION_CARD_WIDTH`'s own comment already reserves between neighbours.
    const crossMinX = -(railY + cardWidth / 2) - 8;
    minX = crossMinX;
    width = -crossMinX;

    // Long axis (rotated "height"): from the nose card's own near edge to the tail card's own far
    // edge, mirrored off the SAME `PAD_X`/`cardHeight`/small-pad terms at both ends — nose sits at
    // canonical station x = PAD_X (finding: "nose on the left... draws at the frame's left pad"),
    // tail at PAD_X + boardSpan. `boardSpan` reads the SAME `scale` `pxX` draws the board with,
    // clamped through `resolveEffectiveLengthIn` so a corrupt length still yields a finite span.
    const boardSpan = resolveEffectiveLengthIn(lengthIn) * scale;
    minY = PAD_X - cardHeight / 2 - 4;
    const maxY = PAD_X + boardSpan + cardHeight / 2 + 4;
    height = maxY - minY;
  }

  const viewBox = `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;

  return {
    scale,
    viewH,
    baselineY,
    tickEndY,
    railY,
    cardDy,
    cardWidth,
    cardHeight,
    minX,
    minY,
    width,
    height,
    viewBox,
  };
}

export interface StationCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A station card's rect, in the frame's own coordinate space.
 *
 * In horizontal that is `{ x: stationX - cardWidth / 2, y: railY }` — a card straddles its
 * station and hangs below the rail. `stationX` is the station's own already-projected x (the
 * canonical `pxX(stationIn)` the caller computed with this SAME layout's `scale`).
 *
 * In vertical, apply the `Upright` composition identity (planner finding 4): the content group
 * carries `rotate(90)`, so a rect drawn at canonical `(x_s - W/2, railY)` with size `W x H` lands,
 * in the rotated frame, at `x` in `[-railY - W/2, -railY + W/2]`, `y` in `[x_s, x_s + H]` — the
 * card's WIDTH now lies across the rail, and the card hangs from its station toward the tail.
 * `cardDy` (0 in horizontal, `-cardHeight / 2` in vertical) shifts the card along the rotated
 * station axis, which is how it gets centred on the station it names.
 */
export function stationCardRect(
  layout: RockerViewLayout,
  stationX: number,
  orientation: RockerViewOrientation,
): StationCardRect {
  if (orientation === "horizontal") {
    return {
      x: stationX - layout.cardWidth / 2,
      y: layout.railY,
      width: layout.cardWidth,
      height: layout.cardHeight,
    };
  }
  return {
    x: -layout.railY - layout.cardWidth / 2,
    y: stationX + layout.cardDy,
    width: layout.cardWidth,
    height: layout.cardHeight,
  };
}
