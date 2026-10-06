/**
 * The small pictures in the phone menu's six screen tiles (quick 261003-q2f, sketch 007's C1).
 *
 * Each picture is a label-free copy of that screen's own drawing of the CURRENT board — TEMPLATE's
 * outline lying down, ROCKER's side profile in its blank, RAILS' centre section with its marks, FINS'
 * tail with its fins, and a small order form with the board standing in it — built from the same
 * numbers the screen itself draws from, never a stock icon. Every coordinate here is in the board's
 * own millimetres (y turned so up is up in a picture); the browser fits each picture into its tile
 * with `preserveAspectRatio="xMidYMid meet"`, which keeps the proportions true — what stops a rocker
 * reading as a U (the founder, 2026-10-03).
 *
 * Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database
 * imports, so every picture can be checked against the presets in isolation.
 */

import type { OutlineSpec, Point2D } from "./board";
import type { BoardSideProfile } from "./board-profile";
import { FIN_SETUPS, type FinMark, type FinSetup } from "./fins";
import type { OutlineGeometry } from "./outline";
import { railPlotDots, type RailPlotDot, type RailSectionOutput, type RailSegmentKey } from "./rail-bands";
import { formatLengthByWidth } from "./summary-line";
import { type Litres, type Mm, type UnitsSystem, mm } from "./units";

/** A plain box: its top-left corner and its size, in the picture's own units. */
export interface ArtBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface XY {
  x: number;
  y: number;
}

/** The tight box around a set of points. */
export function boxOfPoints(points: readonly XY[]): ArtBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** The box grown on every side by `fraction` of its longer side — a little air round a picture. */
export function padBox(box: ArtBox, fraction: number): ArtBox {
  const pad = fraction * Math.max(box.width, box.height);
  return { minX: box.minX - pad, minY: box.minY - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
}

/** An SVG `viewBox` for the box: four numbers to two decimals, space-separated. */
export function viewBoxOf(box: ArtBox): string {
  return [box.minX, box.minY, box.width, box.height].map((v) => v.toFixed(2)).join(" ");
}

/** How much a box is scaled to fit a frame keeping its proportions — the smaller of the two ratios,
 * exactly what `preserveAspectRatio` meet does. */
export function meetScale(box: ArtBox, frameWidth: number, frameHeight: number): number {
  return Math.min(frameWidth / box.width, frameHeight / box.height);
}

/** A path through the points, straight segments, two decimals, closed with " Z" when asked. */
export function polylinePath(points: readonly XY[], closed: boolean): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const parts = [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`, ...rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)];
  return closed ? `${parts.join(" ")} Z` : parts.join(" ");
}

/** The picture box on an upright iPhone's tile, in CSS dots — used only to size the RAILS dots so
 * they draw about 1.5 dots across, like the sketch. */
export const TILE_ART_FRAME = { width: 108, height: 46 } as const;

/** The TEMPLATE silhouette in its own millimetres, in the order TEMPLATE draws it
 * (`outline-viewer.tsx`'s `silhouettePath`): the right half tail to nose, the left half back nose to
 * tail, then the stringer point where the tail closes. (station, half-width) pairs. */
export function silhouette(geometry: OutlineGeometry): { station: number; w: number }[] {
  const right = geometry.points.map((p) => ({ station: p.station, w: p.halfWidth }));
  const left = geometry.points
    .slice()
    .reverse()
    .map((p) => ({ station: p.station, w: -p.halfWidth }));
  return [...right, ...left, { station: geometry.centreCloseStation, w: 0 }];
}

function standingPoints(geometry: OutlineGeometry): XY[] {
  return silhouette(geometry).map(({ station, w }) => ({ x: w, y: -station }));
}

/** TEMPLATE's outline, lying down (nose left, tail right — the menu's TEMPLATE tile) or standing
 * (nose up — the board on the SUMMARY tile's little order form). */
export function outlineTileArt(
  geometry: OutlineGeometry,
  pose: "lying" | "standing",
): { viewBox: string; board: string } {
  const points =
    pose === "lying"
      ? silhouette(geometry).map(({ station, w }) => ({ x: -station, y: w }))
      : standingPoints(geometry);
  return { viewBox: viewBoxOf(padBox(boxOfPoints(points), 0.04)), board: polylinePath(points, true) };
}

/** ROCKER's own sampling: 60 steps along the board, 120 along the blank (`rocker-viewer.tsx`). */
const ROCKER_SAMPLES = 60;
const BLANK_SAMPLES = 120;

/** A closed side silhouette: the bottom tail to nose, then the deck nose to tail — ROCKER's own
 * `closedProfilePath` construction — mapped nose left, deck up. */
export function sidePoints(start: number, end: number, steps: number, bottomAt: (s: Mm) => Mm, deckAt: (s: Mm) => Mm): XY[] {
  const bottom: XY[] = [];
  const deck: XY[] = [];
  for (let i = 0; i <= steps; i++) {
    const station = mm(start + ((end - start) * i) / steps);
    bottom.push({ x: -station, y: -bottomAt(station) });
    deck.push({ x: -station, y: -deckAt(station) });
  }
  return [...bottom, ...deck.reverse()];
}

/** ROCKER's side profile, nose left and deck up, at ONE scale for both directions (the board's true
 * proportions), with its blank behind it — or no blank for a hand-set board. Framed around the blank
 * when there is one (it reaches past the board), else around the board. */
export function rockerTileArt(profile: BoardSideProfile): { viewBox: string; board: string; blank: string | null } {
  const board = sidePoints(0, profile.length, ROCKER_SAMPLES, profile.rockerAt, profile.deckAt);
  const blankView = profile.blank;
  const blank = blankView
    ? sidePoints(blankView.start, blankView.end, BLANK_SAMPLES, blankView.bottomAt, blankView.deckAt)
    : null;
  return {
    viewBox: viewBoxOf(padBox(boxOfPoints(blank ?? board), 0.03)),
    board: polylinePath(board, true),
    blank: blank ? polylinePath(blank, true) : null,
  };
}

/** RAILS' centre section: every band as a line in its own colour key, and the plot's own dots
 * (`railPlotDots`), with y turned so the deck is up. `dotRadius` is in the picture's own units, sized
 * so a dot draws 1.5 dots across in a tile `frame` big. */
export function railsTileArt(
  section: RailSectionOutput,
  frame: { width: number; height: number } = TILE_ART_FRAME,
): {
  viewBox: string;
  lines: { key: RailSegmentKey; x1: number; y1: number; x2: number; y2: number }[];
  dots: { key: RailPlotDot["key"]; cx: number; cy: number }[];
  dotRadius: number;
} {
  const lines = section.segments.map((seg) => ({
    key: seg.key,
    x1: seg.p1.x as number,
    y1: -seg.p1.y,
    x2: seg.p2.x as number,
    y2: -seg.p2.y,
  }));
  const dots = railPlotDots(section.segments, section.result, section.domed).map((dot) => ({
    key: dot.key,
    cx: dot.x as number,
    cy: -dot.y,
  }));
  const box = padBox(
    boxOfPoints([
      ...lines.flatMap((l) => [
        { x: l.x1, y: l.y1 },
        { x: l.x2, y: l.y2 },
      ]),
      ...dots.map((d) => ({ x: d.cx, y: d.cy })),
    ]),
    0.06,
  );
  return { viewBox: viewBoxOf(box), lines, dots, dotRadius: 1.5 / meetScale(box, frame.width, frame.height) };
}

/** FINS' tail and fins, lying down with the tail on the right: a tail point (half-width w, off-tail t)
 * lands at (−t, w). The outline runs in FINS' own order (`fin-viewer.tsx`'s `buildOutlinePaths`): the
 * far half reversed, the connector when the tail has one, then the near half. Straight segments
 * between the tail's own closely spaced points, where FINS smooths a curve through them — at a tile's
 * size the two draw the same line. `outline` is open (FINS leaves the tail end open), `fill` is
 * closed. Each fin runs from its trailing edge to its leading edge, dashed when it is measured in
 * from the rail or the stringer, as on FINS. */
export function finsTileArt(
  tail: { points: readonly Point2D[]; connector: Point2D | null },
  marks: readonly FinMark[],
): {
  viewBox: string;
  fill: string;
  outline: string;
  fins: { x1: number; y1: number; x2: number; y2: number; dashed: boolean }[];
} {
  const lay = (p: { x: number; y: number }): XY => ({ x: -p.y, y: p.x });
  const far = tail.points
    .slice()
    .reverse()
    .map((p) => lay({ x: -p.x, y: p.y }));
  const near = tail.points.map(lay);
  const points = [...far, ...(tail.connector ? [lay(tail.connector)] : []), ...near];
  const outline = polylinePath(points, false);
  const fins = marks.map((mark) => ({
    x1: -mark.offTail,
    y1: mark.lateral as number,
    x2: -mark.leadingOffTail,
    y2: mark.leadingLateral as number,
    dashed: mark.lateralKind !== "none",
  }));
  return { viewBox: viewBoxOf(padBox(boxOfPoints(points), 0.05)), fill: `${outline} Z`, outline, fins };
}

/** The SUMMARY tile's little order form, in its own 100 × 46 units: a page, the board standing in
 * the page's left column, five rules for the lines of text. */
const SUMMARY_PAGE = { x: 33, y: 2, width: 34, height: 42, rx: 2 } as const;
const SUMMARY_BOARD_BOX = { minX: 35, minY: 5, width: 12, height: 36 } as const;
const SUMMARY_RULES = [
  { x1: 50, y1: 10, x2: 63, y2: 10 },
  { x1: 50, y1: 17, x2: 63, y2: 17 },
  { x1: 50, y1: 24, x2: 60, y2: 24 },
  { x1: 50, y1: 31, x2: 63, y2: 31 },
  { x1: 50, y1: 38, x2: 58, y2: 38 },
] as const;

export function summaryTileArt(geometry: OutlineGeometry): {
  viewBox: string;
  page: { x: number; y: number; width: number; height: number; rx: number };
  board: string;
  rules: { x1: number; y1: number; x2: number; y2: number }[];
} {
  const points = standingPoints(geometry);
  const box = boxOfPoints(points);
  const scale = meetScale(box, SUMMARY_BOARD_BOX.width, SUMMARY_BOARD_BOX.height);
  const offsetX = SUMMARY_BOARD_BOX.minX + (SUMMARY_BOARD_BOX.width - box.width * scale) / 2;
  const offsetY = SUMMARY_BOARD_BOX.minY + (SUMMARY_BOARD_BOX.height - box.height * scale) / 2;
  const fitted = points.map((p) => ({ x: offsetX + (p.x - box.minX) * scale, y: offsetY + (p.y - box.minY) * scale }));
  return {
    viewBox: "0 0 100 46",
    page: { ...SUMMARY_PAGE },
    board: polylinePath(fitted, true),
    rules: SUMMARY_RULES.map((rule) => ({ ...rule })),
  };
}

/** VOLUME's figure: the board's own litres to one decimal, the preset card's own rounding — always
 * the real estimate, never a made-up number. */
export function formatTileLitres(litres: Litres): string {
  return litres.toFixed(1);
}

export type ScreenTileKind = "template" | "rocker" | "rails" | "volume" | "fins" | "summary";

/** The one line under each tile's name: TEMPLATE the length × width in the shaper's units, ROCKER
 * the blank the board sits in (or Hand-set), FINS the setup's name as the FINS screen's own picker
 * spells it. */
export function screenTileLines(input: {
  outline: Pick<OutlineSpec, "length" | "widePointWidth">;
  blank: { copy: { name: string } } | null;
  finSetup: FinSetup;
  system: UnitsSystem;
}): Record<ScreenTileKind, string> {
  const finLabel = FIN_SETUPS.find((setup) => setup.value === input.finSetup)?.label ?? "";
  return {
    template: formatLengthByWidth(input.outline.length, input.outline.widePointWidth, input.system),
    rocker: input.blank ? `On a ${input.blank.copy.name}` : "Hand-set",
    rails: "Center rail",
    volume: "Estimated",
    fins: finLabel,
    summary: "Order form",
  };
}
