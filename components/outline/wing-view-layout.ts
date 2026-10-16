/**
 * The WINGS tab's view maths (quick 261014-wii, 2026-10-14, D3, D6, P4) — pure, no React, so every
 * number the close-up is framed by can be checked in isolation (the precedent is
 * `components/viewer/readout-placement.ts`).
 *
 * Ported from sketch 014's own page (`.planning/sketches/014-wings-tab/index.html`): `windowFor`
 * (variant B, the founder's pick — "B, window grows with wing placement"), the frame arithmetic of
 * `closeUpSvg`, and its `spread`, which pushes read-outs apart when they would touch. Distances along
 * the board are in inches here because the drawing is: every value a shaper reads still goes through
 * `measure-display.ts` in the component.
 */

import type { OutlinePoint } from "@/lib/geometry/board";
import { inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";

/** The close-up shows the last 26" of the tail ... */
export const TAIL_WINDOW_IN = 26;
/** ... until a wing's position passes 24" ... */
export const WINDOW_GROWS_PAST_IN = 24;
/** ... and then grows to hold the furthest wing with 3" of room. */
export const WINDOW_ROOM_IN = 3;

/**
 * The close-up's frame, in its own viewBox units (quick 261015-my3, 2026-10-15, D6). One frame
 * replaces the full and compact pair. The founder: "I don't think we need any dims on the right.
 * Lets put all the wing data in the data cards on the left … This should allow the wing view to be
 * as large as possible." So nothing is drawn to the right of the board, the left gutter holds only
 * the cards, and the pads are cut to what is left:
 *
 * - `padTop` 8 — the toolbar's row no longer has its own pad; the corner rule in `closeUpFrame`
 *   moves the board down only when the toolbar and the zoom row would sit over it.
 * - `padBottom` 16, or `padBottomTailBlock` 32 when the board has a tail block, whose width is
 *   written on one line under the tail (D3, F6: 19.6 px at the pinned 14 px, 29.7 units at the
 *   0.66 floor).
 * - `sideRoom` 20 each side of the board; no right rail.
 * - `chipInset` 14 between the gutter's left edge and the cards' left edges, `cardMargin` 8 between
 *   the cards' right edges and the board's side room.
 * - `cornerClearPx` 4 — the screen pixels kept between the toolbar corner and the board.
 *
 * Retired with the old pair: the 56-unit toolbar pad, the 268-unit read-out rail and its value
 * offset, the station dimensions at the far left, the depth and run dimensions (D2).
 */
export const CLOSE_UP = {
  height: 620,
  padTop: 8,
  padBottom: 16,
  padBottomTailBlock: 32,
  sideRoom: 20,
  chipInset: 14,
  cardMargin: 8,
  cornerClearPx: 4,
} as const;

/**
 * The close-up's data card, in screen pixels at the pinned callout size (D4): 120 wide, a 32 px head
 * (the chip's own name-over-value), then 16 px rows and a 6 px foot. The width holds every common
 * value at the full 14 px and the Metric `TAIL @ 30.5 cm` name (F2); only rare extremes are set
 * smaller (F3: the radius can reach 64").
 */
export const WING_CARD_PX = { width: 120, head: 32, row: 16, foot: 6, inset: 6, labelGap: 6 } as const;

/** The rows' labels at 11 px bold, 0.12em letter-spaced, as measured in Chromium (F2). */
export const WING_CARD_LABEL_PX = { RUN: 27.62, RADIUS: 49.66, OFFSET: 50.55 } as const;

/** A card's height in screen pixels: the head alone (the TAIL @ 12" card, a chip's own 32), or the
 * head, a row per value and the foot — 70 unlocked (RUN, RADIUS), 86 locked (and OFFSET). */
export function wingCardHeightPx(rows: number): number {
  return rows > 0 ? WING_CARD_PX.head + WING_CARD_PX.row * rows + WING_CARD_PX.foot : WING_CARD_PX.head;
}

/**
 * The toolbar's corner, in screen pixels from the svg box's top-right (F4): on a fine pointer the
 * WINGS toolbar's two buttons (74 wide, 34 tall) with the zoom row under them (168 wide, down to
 * 74); on a coarse pointer the toolbar alone, the zoom row being hidden at 1x on a touch screen.
 */
export const CLOSE_UP_CORNER_PX = {
  fine: { width: 168, height: 74 },
  coarse: { width: 74, height: 34 },
} as const;

/**
 * The stretch of the board the close-up shows, from the tail: the last 26" (or the whole board,
 * if shorter) while every wing sits at or under 24"; once one passes it, out to that wing plus 3",
 * never past the nose. The tail and the fins never leave the picture (sketch 014 B).
 */
export function wingWindow(length: Mm, stations: readonly Mm[]): { lo: Mm; hi: Mm } {
  const furthest = stations.length ? Math.max(...stations) : 0;
  if (furthest <= inchesToMm(WINDOW_GROWS_PAST_IN)) {
    return { lo: mm(0), hi: mm(Math.min(inchesToMm(TAIL_WINDOW_IN), length)) };
  }
  return { lo: mm(0), hi: mm(Math.min(length, furthest + inchesToMm(WINDOW_ROOM_IN))) };
}

/** The widest half-width, in inches, any of the given outlines reaches inside the window — never
 * under half an inch, so a pin tail's window still has a width to frame. */
export function widestHalfWidthIn(
  pointSets: readonly (readonly OutlinePoint[])[],
  loIn: number,
  hiIn: number,
): number {
  let widest = 0.5;
  for (const points of pointSets) {
    for (const p of points) {
      const s = mmToInches(p.station);
      if (s < loIn - 1e-9 || s > hiIn + 1e-9) continue;
      widest = Math.max(widest, mmToInches(p.halfWidth));
    }
  }
  return widest;
}

export interface CloseUpFrame {
  width: number;
  height: number;
  /** viewBox units per inch of board. */
  unitsPerInch: number;
  /** The stringer's x. */
  cx: number;
  /** A station from the tail, in inches, to its y — the tail at the bottom. */
  toY: (stationIn: number) => number;
  /** A half-width in inches (negative for the left rail) to its x. */
  toX: (halfWidthIn: number) => number;
  /** Every card's right edge. */
  chipRightX: number;
  /** The room above the board — 8, or more where the toolbar corner would sit over it. */
  padTop: number;
  /** The room under the tail — 16, or 32 with the tail block's words. */
  padBottom: number;
  /** The left gutter the cards live in, sized to the card at this frame's fit. */
  gutterLeft: number;
  /** The fit the svg's box gives this frame (`meet`), or 0 for an unmeasured box. */
  fit: number;
}

export interface CloseUpFrameOptions {
  /** The board has a tail block, whose width is written under the tail (D3). */
  tailBlock: boolean;
  /** The svg's laid-out box in CSS pixels; absent or 0 × 0 before the first measure. */
  box?: { width: number; height: number };
  /** The toolbar's corner block in CSS pixels (`CLOSE_UP_CORNER_PX`), from the box's top-right. */
  corner?: { width: number; height: number };
  /** The pinned-callout floor (`MIN_PINNED_FIT_SCALE` — this file never imports React). */
  minFit: number;
}

/**
 * The close-up's one frame (quick 261015-my3, 2026-10-15, D6) — "as large as possible", in the
 * founder's words. The window fills the height; the width is the cards' gutter, the board's widest
 * half-width each side of the stringer and 20 units of side room each side.
 *
 * **The gutter is sized to the card at the fit, in two passes, never circularly.** A card is 120 px
 * on screen, so in units it is `120 / fit` — wider the smaller the drawing. Pass 1 builds the frame
 * with the gutter at the pinned floor (`14 + 120 / minFit + 8`, about 203.8) and reads its fit for
 * the box; pass 2 sizes the gutter to the card at that fit, which can only make the frame narrower,
 * so the final fit is never below pass 1's and a card drawn at the final fit is never wider than its
 * gutter. Both passes read only fixed inputs (the window, the box), so nothing feeds back.
 *
 * **The toolbar corner.** The toolbar sits flush at the box's top-right with the zoom row under it
 * on a mouse (F4). When the room right of the board is narrower than that block (plus 4 px), the
 * board's top moves down below it — `padTop` becomes the block's height in units — and the frame is
 * rebuilt, narrower again, so its fit only rises.
 *
 * **The board hugs the gutter.** When the frame is bound by the box's height, it is widened to the
 * box's own shape with all the spare width on the RIGHT, under the toolbar and the zoom row, rather
 * than centred — the same size of board, and the toolbar's corner left free with no top pad in most
 * computer windows. Centred, the 1280 × 800 26" windows needed a 79-unit top pad and grew only
 * 3.9–6.4%; hugging, they grow 17.7–21.6% (F5: 18.2–18.8 → 22.1 px per inch). The svg keeps
 * `xMidYMid meet`, which the shared zoom's maths assumes.
 *
 * An unmeasured box builds pass 1 alone, with no corner rule.
 */
export function closeUpFrame(loIn: number, hiIn: number, widestIn: number, opts: CloseUpFrameOptions): CloseUpFrame {
  const c = CLOSE_UP;
  const span = Math.max(hiIn - loIn, 1e-6);
  const padBottom = opts.tailBlock ? c.padBottomTailBlock : c.padBottom;
  const gutterAt = (fit: number) => c.chipInset + WING_CARD_PX.width / Math.max(fit, opts.minFit) + c.cardMargin;
  const unitsPerInch = (padTop: number) => (c.height - padTop - padBottom) / span;
  const frameWidth = (gutter: number, u: number) => gutter + 2 * widestIn * u + 2 * c.sideRoom;
  const box = opts.box;
  const measured = box !== undefined && box.width > 0 && box.height > 0;
  const fitOf = (w: number) => (measured ? Math.min(box.width / w, box.height / c.height) : 0);

  let padTop: number = c.padTop;
  let gutter = gutterAt(0);
  let u = unitsPerInch(padTop);
  let w = frameWidth(gutter, u);
  let fit = fitOf(w);
  if (measured) {
    // Pass 2: the gutter sized to the card at pass 1's fit — narrower, so the fit only rises.
    gutter = gutterAt(fit);
    w = frameWidth(gutter, u);
    fit = fitOf(w);
    // The toolbar corner: the board's top moves below it only when the board would reach under it.
    const corner = opts.corner;
    if (corner) {
      const roomRight = box.width - (w - c.sideRoom) * fit;
      if (roomRight < corner.width + c.cornerClearPx) {
        padTop = Math.max(c.padTop, (corner.height + c.cornerClearPx) / fit);
        u = unitsPerInch(padTop);
        w = frameWidth(gutter, u);
        fit = fitOf(w);
      }
    }
  }
  // The board at the left, the spare on the right (the "hug"), cut to two decimals for the viewBox
  // string — down, never up, so the fit can only rise (by a hair) and every rule above still holds;
  // the hundredth of a unit comes off the 20 units of side room.
  const width = Math.floor((measured ? Math.max(w, box.width / fit) : w) * 100) / 100;
  if (measured) fit = fitOf(width);

  const cx = gutter + widestIn * u + c.sideRoom;
  const toY = (s: number) => c.height - padBottom - (s - loIn) * u;
  const toX = (hw: number) => cx + hw * u;
  return {
    width,
    height: c.height,
    unitsPerInch: u,
    cx,
    toY,
    toX,
    chipRightX: gutter - c.chipInset,
    padTop,
    padBottom,
    gutterLeft: gutter,
    fit,
  };
}

/** A fixed block `spreadApart` keeps clear of, by its top and bottom y. */
export interface SpreadBlock {
  top: number;
  bottom: number;
}

/**
 * Pushes labels apart so none touches the next (the sketch's `spread`, grown for the VIEWER's
 * gutter, P5). Items are placed from the largest y (nearest the tail) upward: each sits at its own
 * y, or `gap` above the one placed before it, whichever is higher. `half` is each item's half-height
 * (0 treats `gap` as a centre-to-centre distance, as the sketch does). The result is in input order,
 * and the items stay in their station order.
 *
 * Quick 261015-hz7 (2026-10-15, D7, D9) taught it two things, and items now move down only for
 * these:
 * - **The nearer side of a block.** An item that would overlap a fixed block (within `gap`) moves to
 *   whichever side of the block is nearer its own y — below only when there it still sits above
 *   every item already placed, inside `bounds.bottom` and clear of every block (ties go below);
 *   otherwise above, as before. (On the VIEWER a WING chip at the widepoint's tail end used to jump
 *   the whole WIDEPOINT / WP OFFSET pair.)
 * - **The drawing's bounds.** Nothing is placed below `bounds.bottom`; and when the chain would pass
 *   `bounds.top`, it is laid down again from the top in order, each item at least `gap` below the one
 *   before it and below any block it would then overlap — so a stinger with wing 2 just behind it
 *   keeps every read-out inside the close-up (F10: "Center" and "Ahead of wing 1" ran 16 and 43 px
 *   off the top of an upright iPhone).
 */
export function spreadApart(
  items: readonly { y: number; half: number }[],
  gap: number,
  fixed: readonly SpreadBlock[] = [],
  bounds: { top?: number; bottom?: number } = {},
): number[] {
  const order = items.map((item, i) => ({ i, ...item })).sort((a, b) => b.y - a.y);
  const blocks = [...fixed].sort((a, b) => b.bottom - a.bottom);
  const overlaps = (y: number, half: number, block: SpreadBlock) =>
    y - half < block.bottom + gap && y + half > block.top - gap;
  const out = new Array<number>(items.length);
  let prevTop: number | null = null;
  for (const o of order) {
    // The highest y this item may take: above everything already placed, inside the bottom bound.
    let limit = Infinity;
    if (prevTop !== null) limit = prevTop - gap - o.half;
    if (bounds.bottom !== undefined) limit = Math.min(limit, bounds.bottom - o.half);
    let y = Math.min(o.y, limit);
    for (const block of blocks) {
      if (!overlaps(y, o.half, block)) continue;
      const above = block.top - gap - o.half;
      const below = block.bottom + gap + o.half;
      const belowFits = below <= limit + 1e-9 && blocks.every((b) => b === block || !overlaps(below, o.half, b));
      y = belowFits && Math.abs(below - o.y) <= Math.abs(above - o.y) ? below : above;
    }
    out[o.i] = y;
    prevTop = y - o.half;
  }

  if (bounds.top !== undefined && order.some((o) => out[o.i] - o.half < bounds.top! - 1e-9)) {
    const down = [...order].sort((a, b) => out[a.i] - out[b.i]);
    const blocksDown = [...fixed].sort((a, b) => a.top - b.top);
    let prevBottom = bounds.top - gap;
    for (const o of down) {
      let y = Math.max(out[o.i], prevBottom + gap + o.half);
      for (const block of blocksDown) {
        if (overlaps(y, o.half, block)) y = block.bottom + gap + o.half;
      }
      out[o.i] = y;
      prevBottom = y + o.half;
    }
  }
  return out;
}
