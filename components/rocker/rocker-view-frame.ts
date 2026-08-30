/**
 * The rocker/foil side-profile viewer's scale and frame — the ONE place this drawing's scale and
 * frame are decided, for both orientations, and for BOTH card rails (quick task 260829-uue). Pure
 * geometry, no React import (per `import type` only for the orientation-shaped literal below), so
 * it can be verified in `rocker-view-frame.test.ts` in isolation from `rocker-viewer.tsx`.
 *
 * Two rails, symmetric about the board: a deck rail above the board (thickness read-outs) and a
 * bottom rail below it (rocker read-outs) — see `deckRailY`/`railY` below. `rocker-viewer.tsx`
 * draws from the `RockerViewLayout` this module produces; it derives no scale, band or type-stack
 * arithmetic of its own (quick task 260829-tmj, extended by 260829-uue).
 */

import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";

/** Which way the rocker drawing is currently turned — mirrors `ViewerOrientation` in
 * `callout-primitives.tsx`, kept as its own literal union here so this module carries no
 * React-shaped import. */
export type RockerViewOrientation = "horizontal" | "vertical";

/** Which rail a station card belongs to: `"deck"` (thickness, above the board) or `"bottom"`
 * (rocker, below the board). */
export type RockerCardSide = "deck" | "bottom";

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
   * A per-consumer scale choice, not an editor-only one (planner finding 7, revised by quick
   * task 260829-uue). `true` scales every board's own length to fill the frame's long axis, so a
   * 5'0" board and a 10'0" board both draw at the same share of the panel — both
   * `components/rocker/rocker-editor.tsx` and, now, the Summary order form's card-less rocker box
   * (`components/summary/order-form.tsx`) pass this. `false` keeps the fixed range-derived scale
   * this viewer has always used, the same precedent 260823-h6l set for the outline viewer's own
   * `fixedFrame` — still the right default for a consumer whose frame must never resize around
   * whichever board happens to be loaded.
   */
  fitToBoard: boolean;
  /**
   * Whether either rail is actually drawn (quick task 260829-uue). A band is reserved on the
   * frame's cross axis only when a consumer will draw read-outs into it — a compact consumer
   * (the Summary order form) is not paying for a rail it never renders, and its frame is the
   * board plus a hairline of pad (`BARE_PAD`) instead. No default: every call site has to say
   * which it is.
   */
  showStationCards: boolean;
}

export interface RockerViewLayout {
  /** User units per inch, shared by BOTH axes — a shaper checks a rocker line with a
   * straightedge, so the drawing never exaggerates the vertical axis for legibility (one `scale`
   * field is what makes that true by construction, not by convention). */
  scale: number;
  viewH: number;
  baselineY: number;
  /** Where a bottom-rail station tick line stops — always `baselineY + RAIL_GAP`, in both
   * orientations, so a tick still stops at the card's own near edge rather than running into its
   * middle once the vertical rail moves off this same value (see `railY`). */
  tickEndY: number;
  /** The bottom (rocker) rail's own anchor. `baselineY + RAIL_GAP` in horizontal; in vertical a
   * rotated card presents its WIDTH across the rail rather than its height, so the anchor clears
   * the baseline by `RAIL_GAP + cardWidth / 2` instead. */
  railY: number;
  /** Where a deck-rail station tick line stops — the mirror of `tickEndY` on the board's other
   * side, always `deckTopY - RAIL_GAP` in both orientations. */
  deckTickEndY: number;
  /** The deck (thickness) rail's own anchor. In horizontal a deck card hangs UP from the rail, so
   * the anchor is its own top edge (`deckTickEndY - cardHeight`); in vertical the anchor is the
   * card's cross-axis centre, the same convention `railY` uses (`deckTickEndY - cardWidth / 2`). */
  deckRailY: number;
  /** Extra offset applied to a card's own position along the rotated station axis — 0 in
   * horizontal; `-cardHeight / 2` in vertical, centring each card on the station it names. Shared
   * by both rails. */
  cardDy: number;
  cardWidth: number;
  cardHeight: number;
  /** The board-length label's own anchor, in canonical coordinates — horizontal keeps the
   * original `(PAD_X, PAD_TOP - 8)`; vertical moves it clear of the deck rail's nose-station
   * cards (see `LENGTH_LABEL_GAP`). Always the horizontal values when `showStationCards` is
   * false, since the label is never drawn there and the field must never be `NaN`. */
  labelX: number;
  labelY: number;
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
/** Gap between the baseline (or the worst-case deck line) and a rail's tick marks. */
export const RAIL_GAP = 20;
/** Each station card's height, in SVG user units — room for a station-name row over a single
 * value row at this drawing's existing type scale (quick task 260829-uue: a card now holds one
 * value instead of two, so this dropped from 50). */
export const STATION_CARD_HEIGHT = 35;
/** Gutter left between neighbouring cards on a rail, and between a rail's outer edge and the
 * frame — named so it is one constant everywhere instead of a bare literal repeated at each use. */
export const CARD_GUTTER = 8;
/** The pad a compact, card-less frame leaves around the board so a stroked edge is not
 * half-clipped. */
export const BARE_PAD = 8;

/** The rocker rail's type scale, in SVG user units — the sizes `rocker-viewer.tsx` used to
 * hard-code inline. */
export const STATION_NAME_SIZE = 10;
export const STATION_VALUE_SIZE = 13;
/** A card's two stacked rows (an INPUT, per the TEMPLATE screen's grammar): name over value,
 * both measured from the card's own rail anchor. */
export const CARD_NAME_DY = 13;
export const CARD_VALUE_DY = 28;
/** A plain reading's two stacked rows (a DERIVED value, per the TEMPLATE screen's grammar): value
 * over station name, the reverse stacking of a card — centred in the same band depth a card
 * occupies at the same rail anchor, so a card containment proof carries a plain reading with it. */
export const READOUT_VALUE_DY = STATION_CARD_HEIGHT / 2 - 2;
export const READOUT_NAME_DY = READOUT_VALUE_DY + STATION_VALUE_SIZE;
/** The board-length label's own font size, used only to reserve its type band on the frame. */
export const LENGTH_LABEL_SIZE = 12;
/** Gap left between the board-length label's own band and the nose station's cards, nose-up. */
export const LENGTH_LABEL_GAP = 6;

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
 * The gutter between neighbouring cards only ever grows as the board gets shorter.
 */
export const STATION_CARD_WIDTH = 12 * FIXED_SCALE - CARD_GUTTER;

/**
 * How deep a card band has to be on a rail — a band has to be as deep as the card actually
 * presents across it: its own height nose-left, its own width nose-up (a rotated card presents
 * its WIDTH across the rail, planner finding 4). One band per side, sized for a card, even when
 * only some of that rail's figures are on cards (planner finding 9 / plan finding 6) — a card is
 * the deepest thing either rail carries, so a shallower band would save the frame nothing, and
 * one shared anchor is what keeps a card and a plain reading line up along the same rail.
 */
export function cardBandDepth(orientation: RockerViewOrientation): number {
  return RAIL_GAP + (orientation === "horizontal" ? STATION_CARD_HEIGHT : STATION_CARD_WIDTH) + CARD_GUTTER;
}

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
 * rotated content — both rails' own outer edges on the cross axis, the label's own band to the
 * tail card's far edge on the long axis — rather than a transposition of the horizontal frame,
 * the defect quick task 260825-w8d fixed on the outline viewer.
 */
export function rockerViewLayout({
  lengthIn,
  maxDeckIn,
  orientation,
  fitToBoard,
  showStationCards,
}: RockerViewLayoutInput): RockerViewLayout {
  const scale = resolveScale(lengthIn, fitToBoard);
  const cardWidth = STATION_CARD_WIDTH;
  const cardHeight = STATION_CARD_HEIGHT;
  const horizontal = orientation === "horizontal";

  // Bands and baseline, symmetric about the board. A band is reserved on EITHER side only when
  // cards are actually drawn there — a compact consumer's frame is the board plus a hairline of
  // pad instead (planner behaviour bullet 2).
  const topPad = showStationCards ? PAD_TOP : BARE_PAD;
  const band = showStationCards ? cardBandDepth(orientation) : 0;
  // The worst-case deck reference — the y the tallest board this app can dial in would reach.
  const deckTopY = topPad + band;
  const baselineY = deckTopY + maxDeckIn * scale;
  const viewH = baselineY + (showStationCards ? cardBandDepth(orientation) : BARE_PAD);

  // Bottom (rocker) rail — unchanged in shape from before this task.
  const tickEndY = baselineY + RAIL_GAP;
  const railY = horizontal ? tickEndY : tickEndY + cardWidth / 2;

  // Deck (thickness) rail — the mirror of the bottom rail on the board's other side.
  const deckTickEndY = deckTopY - RAIL_GAP;
  const deckRailY = horizontal ? deckTickEndY - cardHeight : deckTickEndY - cardWidth / 2;

  // Centres each card on the station it names (planner_assumptions #4), shared by both rails.
  const cardDy = horizontal ? 0 : -cardHeight / 2;

  // Length label anchor. Horizontal keeps today's value byte-identical. Vertical moves it clear
  // of the deck rail's nose-station cards (finding 6) — but only when cards are actually drawn;
  // otherwise the label is never rendered, and the horizontal values keep the field finite.
  let labelX: number;
  let labelY: number;
  if (horizontal || !showStationCards) {
    labelX = PAD_X;
    labelY = PAD_TOP - 8;
  } else {
    labelX = PAD_X + cardDy - LENGTH_LABEL_GAP;
    labelY = deckRailY - cardWidth / 2;
  }

  const boardSpan = resolveEffectiveLengthIn(lengthIn) * scale;

  let minX: number;
  let minY: number;
  let width: number;
  let height: number;

  if (horizontal) {
    minX = 0;
    minY = 0;
    width = VIEW_W;
    height = viewH;
  } else {
    // Cross axis (rotated "width"): from the bottom rail's own outer edge to the deck rail's own
    // outer edge — both rails now, rather than only the bottom one. Without cards there is no
    // rail to clear, so the cross axis falls back to the board's own worst-case box plus a
    // hairline of pad on each side.
    const crossFar = showStationCards ? railY + cardWidth / 2 + CARD_GUTTER : baselineY + BARE_PAD;
    const crossNear = showStationCards ? deckRailY - cardWidth / 2 - CARD_GUTTER : deckTopY - BARE_PAD;
    minX = -crossFar;
    width = crossFar - crossNear;

    // Long axis (rotated "height"): from the label's own type band (with cards) or a hairline pad
    // (without) to the tail card's own far edge, mirrored off the same `PAD_X`/`cardHeight` terms.
    if (showStationCards) {
      minY = labelX - LENGTH_LABEL_SIZE - 4;
      const maxY = PAD_X + boardSpan + cardHeight / 2 + 4;
      height = maxY - minY;
    } else {
      minY = PAD_X - BARE_PAD;
      const maxY = PAD_X + boardSpan + BARE_PAD;
      height = maxY - minY;
    }
  }

  const viewBox = `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;

  return {
    scale,
    viewH,
    baselineY,
    tickEndY,
    railY,
    deckTickEndY,
    deckRailY,
    cardDy,
    cardWidth,
    cardHeight,
    labelX,
    labelY,
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
 * A station card's rect, in the frame's own coordinate space, on the given rail (`side`).
 *
 * In horizontal that is `{ x: stationX - cardWidth / 2, y: rail }` — a card straddles its
 * station and sits at its own rail's anchor. `stationX` is the station's own already-projected x
 * (the canonical `pxX(stationIn)` the caller computed with this SAME layout's `scale`).
 *
 * In vertical, apply the `Upright` composition identity (planner finding 4): the content group
 * carries `rotate(90)`, so a rect drawn at canonical `(x_s - W/2, rail)` with size `W x H` lands,
 * in the rotated frame, at `x` in `[-rail - W/2, -rail + W/2]`, `y` in `[x_s, x_s + H]` — the
 * card's WIDTH now lies across the rail. `cardDy` (0 in horizontal, `-cardHeight / 2` in
 * vertical) shifts the card along the rotated station axis, which is how it gets centred on the
 * station it names.
 */
export function stationCardRect(
  layout: RockerViewLayout,
  stationX: number,
  orientation: RockerViewOrientation,
  side: RockerCardSide,
): StationCardRect {
  const rail = side === "deck" ? layout.deckRailY : layout.railY;
  if (orientation === "horizontal") {
    return {
      x: stationX - layout.cardWidth / 2,
      y: rail,
      width: layout.cardWidth,
      height: layout.cardHeight,
    };
  }
  return {
    x: -rail - layout.cardWidth / 2,
    y: stationX + layout.cardDy,
    width: layout.cardWidth,
    height: layout.cardHeight,
  };
}
