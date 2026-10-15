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
 * The close-up's frame, in its own viewBox units — the sketch's numbers. `padTop` leaves the
 * toolbar's row clear (D6); `gutterLeft` holds the WING chips and the station dimensions;
 * `railRight` holds the read-outs.
 */
export const CLOSE_UP = {
  height: 620,
  padTop: 56,
  padBottom: 16,
  gutterLeft: 214,
  railRight: 240,
  sideRoom: 20,
  chipInset: 14,
  valueOffset: 124,
  extensionReach: 50,
  stationDimX0: 22,
  stationDimStep: 30,
  depthDimDrop: 18,
  runDimMinUnits: 10,
} as const;

/**
 * The compact frame (plan 02, 2026-10-15, P13; sketch 014's own compact numbers, its chip gutter
 * widened): a shorter top pad, narrower gutters, the read-outs closer in, and no station
 * dimensions. Drawn whenever the full frame would fit its box below the pinned-callout floor — a
 * phone either way up, or a narrow computer window — so the chips and read-outs keep their pinned
 * size and stay inside the drawing.
 *
 * The left gutter is 180, not the sketch's 150: at the pinned floor the app's WING chip is 157.6
 * units wide (`pinnedCalloutSizes(MIN_PINNED_FIT_SCALE).chipW`), so 150 put its left edge at −21.6,
 * clipped (measured F27); 14 inset + 158 + 8 to spare is 180.
 *
 * Two of the plan's numbers moved when the phones were run (2026-10-15): the right rail stays the
 * full frame's 240, not 190 — at the pinned floor the read-out "AHEAD OF WING 1", letter-spaced,
 * ran 37–39 units past 190 on an upright phone and at 1024 × 768 — and the bottom pad is 24, not
 * 16, because the tail block's name line, drawn a name's height under its station, ran 2.2 dots
 * below the drawing on a phone held sideways.
 */
export const CLOSE_UP_COMPACT = {
  ...CLOSE_UP,
  padTop: 16,
  padBottom: 24,
  gutterLeft: 180,
  railRight: 240,
  valueOffset: 96,
} as const;

/**
 * Whether the close-up draws its compact frame (P13): when the FULL frame, fitted into the svg's
 * box, would sit below the pinned-callout floor `minFit` (pass `MIN_PINNED_FIT_SCALE` — this file
 * never imports React, and that constant lives beside the callout components). It reads the full
 * frame's width, a fixed number for a given window, never the frame it chooses, so the choice can
 * never feed back into itself (the VIEWER's T-VOT-04 rule). An unmeasured box (0 × 0, before the
 * first layout) keeps the full frame.
 *
 * A pure function despite its name (the plan's interface): it is the drawing fitting itself, like
 * RAILS' plot fit, never a layout choice — width still picks the layout, pointer the sizing.
 */
export function useCompactFrame(boxWidth: number, boxHeight: number, fullWidth: number, minFit: number): boolean {
  if (!(boxWidth > 0) || !(boxHeight > 0) || !(fullWidth > 0)) return false;
  return Math.min(boxWidth / fullWidth, boxHeight / CLOSE_UP.height) < minFit;
}

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
  /** Where every read-out's value text begins — the one right rail. */
  valueX: number;
  /** Where the faint extension lines stop. */
  extensionEndX: number;
  /** Every WING chip's right edge. */
  chipRightX: number;
  /** The i-th wing's station dimension, at the far left. */
  stationDimX: (i: number) => number;
}

/** The sketch's `closeUpSvg` frame: the window fills the height below the toolbar's row; the
 * width is the board's widest half-width each side of the stringer plus the two gutters. `compact`
 * builds it from `CLOSE_UP_COMPACT` instead (P13). */
export function closeUpFrame(loIn: number, hiIn: number, widestIn: number, compact = false): CloseUpFrame {
  const c = compact ? CLOSE_UP_COMPACT : CLOSE_UP;
  const span = Math.max(hiIn - loIn, 1e-6);
  const u = (c.height - c.padTop - c.padBottom) / span;
  const cx = c.gutterLeft + widestIn * u + c.sideRoom;
  const width = Math.ceil(cx + widestIn * u + c.sideRoom + c.railRight);
  const toY = (s: number) => c.height - c.padBottom - (s - loIn) * u;
  const toX = (hw: number) => cx + hw * u;
  return {
    width,
    height: c.height,
    unitsPerInch: u,
    cx,
    toY,
    toX,
    valueX: toX(widestIn) + c.valueOffset,
    extensionEndX: toX(widestIn) + c.extensionReach,
    chipRightX: c.gutterLeft - c.chipInset,
    stationDimX: (i: number) => c.stationDimX0 + c.stationDimStep * i,
  };
}

/**
 * Pushes labels apart so none touches the next (the sketch's `spread`, grown for the VIEWER's
 * gutter, P5). Items are placed from the largest y (nearest the tail) upward: each sits at its own
 * y, or `gap` above the one placed before it, whichever is higher. An item that would overlap a
 * fixed block (within `gap`) jumps above it. Items only ever move up; the result is in input order.
 * `half` is each item's half-height (0 treats `gap` as a centre-to-centre distance, as the sketch
 * does).
 */
export function spreadApart(
  items: readonly { y: number; half: number }[],
  gap: number,
  fixed: readonly { top: number; bottom: number }[] = [],
): number[] {
  const order = items.map((item, i) => ({ i, ...item })).sort((a, b) => b.y - a.y);
  const blocks = [...fixed].sort((a, b) => b.bottom - a.bottom);
  const out = new Array<number>(items.length);
  let prevTop: number | null = null;
  for (const o of order) {
    let y = o.y;
    if (prevTop !== null) y = Math.min(y, prevTop - gap - o.half);
    for (const block of blocks) {
      if (y - o.half < block.bottom + gap && y + o.half > block.top - gap) y = block.top - gap - o.half;
    }
    out[o.i] = y;
    prevTop = y - o.half;
  }
  return out;
}
