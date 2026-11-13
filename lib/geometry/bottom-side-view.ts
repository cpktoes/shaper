/**
 * The side view on BOTTOM's VIEWER (quick 261112-ogx; the founder, 2026-11-12, on sketch 023: "Bottom, crossection, side,
 * with sides default scaling to 1x to minimize distortion of the rocker and use up the least amount of space").
 *
 * Three drawings share the VIEWER's card, top to bottom: the board from below, the cross-section, and the side view — the
 * deck as one line, the bottom along the stringer as the board's ink edge, and the bottom at the rail before the rails are
 * shaped, dashed where it parts from the stringer's. This file works out the two things the drawings need that no single
 * drawing can: how the card's height is split between the three, and the side view's own frame, which keeps the board
 * from below's length scale so a station stands at the same dot in both.
 *
 * The split is one pure function of the room the three share, because the side view must take its height from the length
 * scale and the length scale depends on the height the board from below is given — solving them together here means the
 * scale never chases its own tail.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { BOTTOM_DATA_DEPTH_SHOWN, type BottomBoard } from "./bottom";
import {
  DRAWING_WIDTH,
  TOP_VIEW_LENGTH_UNITS,
  TOP_VIEW_ROOM_ABOVE,
  TOP_VIEW_ROOM_BELOW,
  topViewFrame,
  topViewX,
  type SectionHeight,
  type TopViewFrame,
} from "./bottom-draw";
import type { SideProfileLines, SideProfilePoint } from "./side-profile";
import { mm, type Mm } from "./units";

/**
 * Screen dots of room above the highest deck point and below the lowest bottom point in the side view's box: the station
 * line's 8-dot overshoot, and on a touch screen the Height buttons' touch boxes, which hang about 18 dots below their
 * caption row, so the tail's deck stays clear of them.
 */
export const SIDE_VIEW_ROOM_ABOVE = 12;
export const SIDE_VIEW_ROOM_BELOW = 12;
/** Today's 1.25 : 1 between the board from below and the cross-section, as the board from below's share of the two. */
export const TOP_VIEW_SHARE = 1.25 / 2.25;
/** The side view's box takes at most this share of what the three boxes share. */
export const SIDE_VIEW_MOST = 0.4;
/** Where the rail line parts from the stringer's (sketch 023's own threshold). */
export const SIDE_PROFILE_APART: Mm = mm(0.05);

/** The highest deck point less the lowest of the two bottom lines: the height the side view's drawing must hold. */
export function sideProfileRise(lines: SideProfileLines): Mm {
  let high = -Infinity;
  let low = Infinity;
  for (const p of lines.points) {
    high = Math.max(high, p.deck);
    low = Math.min(low, p.stringerBottom, p.railBottom);
  }
  return mm(Math.max(0, high - low));
}

/** True when the two bottom lines are two lines on this board — the Board file preview's own "one line or two" rule. */
export function sideProfileParts(lines: SideProfileLines): boolean {
  return lines.points.some((p) => Math.abs(p.railBottom - p.stringerBottom) > BOTTOM_DATA_DEPTH_SHOWN);
}

/**
 * The stretches of the board where the rail line is drawn: runs of consecutive points where the point or either neighbour
 * parts from the stringer by more than `SIDE_PROFILE_APART`, so each run starts and ends on the stringer's own line.
 * Empty on a board whose two lines are one.
 */
export function sideProfileRailRuns(lines: SideProfileLines): SideProfilePoint[][] {
  if (!sideProfileParts(lines)) return [];
  const { points } = lines;
  const apart = (i: number) => i >= 0 && i < points.length && Math.abs(points[i].railBottom - points[i].stringerBottom) > SIDE_PROFILE_APART;
  const runs: SideProfilePoint[][] = [];
  let run: SideProfilePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (apart(i - 1) || apart(i) || apart(i + 1)) run.push(points[i]);
    else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/** What the three drawings are given. */
export interface BottomViewerSplit {
  /** The three boxes' heights in screen dots: they sum to the height shared. */
  top: number;
  side: number;
  section: number;
  /** The board from below's frame in the top box, and the length scale it draws at, in dots per millimetre. */
  frame: TopViewFrame;
  kDots: number;
}

/**
 * Splits `height` dots between the board from below, the cross-section and the side view, for boxes `width` dots wide.
 *
 * The side view takes what its drawing needs at the Height picked — the rise at the board from below's length scale, times
 * the factor, plus its room above and below — and never more than `SIDE_VIEW_MOST` of the height. The board from below
 * takes what its board needs when the length is the limit (never taller than that), or else the 1.25 : 1 share of what
 * the side view leaves; the cross-section has the rest. Null when there is no room to draw in.
 */
export function bottomViewerSplit(input: {
  width: number;
  height: number;
  board: Pick<BottomBoard, "length" | "widePointWidth">;
  rise: number;
  factor: SectionHeight;
}): BottomViewerSplit | null {
  const { width, height, board, rise, factor } = input;
  if (width <= 40 || height <= 60 || rise <= 0) return null;
  const rails = TOP_VIEW_ROOM_ABOVE + TOP_VIEW_ROOM_BELOW;
  const pad = SIDE_VIEW_ROOM_ABOVE + SIDE_VIEW_ROOM_BELOW;
  const cap = SIDE_VIEW_MOST * height;
  // Dots per millimetre when the board's length fills 900 of the 1000 units: the scale when the width is the limit.
  const kw = ((TOP_VIEW_LENGTH_UNITS / DRAWING_WIDTH) * width) / board.length;
  const sideAt = (k: number) => Math.min(rise * k * factor + pad, cap);

  let top: number;
  const need = board.widePointWidth * kw + rails;
  if (need <= TOP_VIEW_SHARE * (height - sideAt(kw))) {
    top = Math.ceil(need);
  } else {
    const k = (TOP_VIEW_SHARE * (height - pad) - rails) / (board.widePointWidth + TOP_VIEW_SHARE * rise * factor);
    top = rise * k * factor + pad > cap ? Math.floor(TOP_VIEW_SHARE * (height - cap)) : Math.floor(TOP_VIEW_SHARE * (height - (rise * k * factor + pad)));
  }
  if (!(top > rails)) return null;

  const frame = topViewFrame(board, width, top);
  const kDots = frame.k / frame.px;
  if (!(kDots > 0)) return null;
  const side = Math.min(Math.ceil(rise * kDots * factor + pad), Math.floor(cap));
  const section = height - top - side;
  if (!(section > 0)) return null;
  return { top, side, section, frame, kDots };
}

/** The side view's frame: its box's own shape in units (1000 wide), one screen dot `px` units, nose left. */
export interface SideViewFrame {
  width: number;
  height: number;
  px: number;
  /** Units per millimetre along the board: the board from below's, so `x` agrees with `topViewX`. */
  k: number;
  /** Units per millimetre of height: `k` times the factor drawn. */
  ky: number;
  length: Mm;
  heightAsked: number;
  heightDrawn: number;
  /** A station's x, and a height above the lowest bottom point as a y. */
  x: (station: number) => number;
  y: (heightMm: number) => number;
}

/**
 * The side view's frame in a box `box.width × box.height` dots. Along the board it keeps the board from below's scale
 * (`scale.kDots`, dots per millimetre), so a station is at the same x in both. Its height is the scale times the factor,
 * fitted to the room when the block would overflow it by more than 2% (the factor actually drawn is `heightDrawn`), the
 * block centred in the room between the 12 dots above and below.
 */
export function sideViewFrame(
  lines: SideProfileLines,
  scale: { kDots: number; length: Mm },
  box: { width: number; height: number },
  factor: SectionHeight,
): SideViewFrame {
  const px = DRAWING_WIDTH / box.width;
  const height = Math.round((DRAWING_WIDTH * box.height) / box.width);
  const k = scale.kDots * px;
  const rise = sideProfileRise(lines);
  const roomAbove = SIDE_VIEW_ROOM_ABOVE * px;
  const room = Math.max(0, height - (SIDE_VIEW_ROOM_ABOVE + SIDE_VIEW_ROOM_BELOW) * px);
  const wanted = k * factor;
  const ky = rise > 0 && rise * wanted > room * 1.02 ? room / rise : wanted;
  const block = rise * ky;
  const yBase = roomAbove + (room - block) / 2 + block;
  let low = Infinity;
  for (const p of lines.points) low = Math.min(low, p.stringerBottom, p.railBottom);
  const x = (station: number) => topViewX({ k, length: scale.length }, station);
  return {
    width: DRAWING_WIDTH,
    height,
    px,
    k,
    ky,
    length: scale.length,
    heightAsked: factor,
    heightDrawn: ky / k,
    x,
    y: (heightMm) => yBase - (heightMm - low) * ky,
  };
}

/** Rounds to one decimal, as `polylinesPathData` writes. */
const num = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * The side view's two paths: `board`, one closed path along the deck tail to nose and back along the stringer's bottom
 * nose to tail, and `rail`, the bottom at the rail where it parts from the stringer's (null when it never does).
 */
export function sideViewPaths(lines: SideProfileLines, frame: SideViewFrame): { board: string; rail: string | null } {
  const at = (s: number, h: number) => `${num(frame.x(s))} ${num(frame.y(h))}`;
  const deck = lines.points.map((p, i) => `${i === 0 ? "M" : "L"}${at(p.station, p.deck)}`);
  const back = [...lines.points].reverse().map((p) => `L${at(p.station, p.stringerBottom)}`);
  const runs = sideProfileRailRuns(lines);
  const rail = runs.length === 0 ? null : runs.map((run) => run.map((p, i) => `${i === 0 ? "M" : "L"}${at(p.station, p.railBottom)}`).join("")).join("");
  return { board: `${deck.join("")}${back.join("")}Z`, rail };
}

/** Where the station line stands: x, the deck's y and the lower of the two bottom lines' y at that station. */
export function sideViewStationSpan(lines: SideProfileLines, frame: SideViewFrame, station: number): { x: number; yDeck: number; yBottom: number } {
  const { points } = lines;
  const s = Math.min(Math.max(station, 0), frame.length);
  let hi = points.findIndex((p) => p.station >= s);
  if (hi < 0) hi = points.length - 1;
  const lo = Math.max(0, hi - 1);
  const a = points[lo];
  const b = points[hi];
  const t = b.station > a.station ? (s - a.station) / (b.station - a.station) : 0;
  const between = (u: number, v: number) => u + (v - u) * t;
  const deck = between(a.deck, b.deck);
  const bottom = between(Math.min(a.stringerBottom, a.railBottom), Math.min(b.stringerBottom, b.railBottom));
  return { x: frame.x(s), yDeck: frame.y(deck), yBottom: frame.y(bottom) };
}
