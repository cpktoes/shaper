/**
 * The Board Rack's layout (Phase 15, R2): where every board stands on the home page's rack.
 *
 * Every board is drawn at ONE true scale on one floor line, so a shaper sees their quiver the way
 * it stands against a wall — the tallest board sets that scale, and it is never set below a 7'0"
 * reference, so a lone 5'2" fish still looks short. On a computer (the hover rack) the boards stand
 * in balanced rows of 48-dot slots; on a phone (the swipe rack) they stand on one long sideways
 * track of 40-dot slots that snaps a board to the middle. Dashed height lines mark every foot from
 * 4' (every 50 cm from 150 cm in Metric) behind them.
 *
 * Every figure here comes from 15-UI-SPEC.md §3 and the sketches (009, 010, 011 —
 * `.claude/skills/sketch-findings-shaper/references/board-rack.md`), and each is a start point the
 * founder may tune on a real device: change it here once and the whole rack follows.
 *
 * Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database
 * imports, so the layout can be checked in isolation. Every distance along the board goes through
 * `./units` (CLAUDE.md Rule 2) — no conversion factor is typed here.
 */

import { centimetresToMm, inchesToMm, type Mm, type UnitsSystem } from "./units";

/** The shortest "tallest board" the rack is ever scaled to: 7'0". Below it, a short quiver is drawn
 * short rather than stretched to fill the rack. */
export const RACK_REFERENCE_LENGTH_MM = inchesToMm(84);

/** One board's width at rest on the hover rack (a computer). */
export const HOVER_SLOT = 48;
/** One board's width at rest on the swipe rack (a phone or an iPad) — a board, not a control, so
 * it may sit under the 44-dot touch box (UI-SPEC "Exceptions"). */
export const SWIPE_SLOT = 40;
/** Room at the left of the floor for the height-line labels. */
export const LABEL_GUTTER = 28;
/** The tallest board's drawn height when every board fits in one row. */
export const HOVER_ONE_ROW_HEIGHT = 380;
/** The tallest board's drawn height once the rack wraps to two or more rows. */
export const HOVER_MULTI_ROW_HEIGHT = 288;
/** Room above each row's tallest board (the carried board lifts into it). */
export const HOVER_ROW_TOP_ROOM = 24;
/** The band under each row's floor line: the 24-dot drop-mark strip plus the 92-dot caption. Every
 * row reserves it, so moving between rows never moves the page. */
export const HOVER_ROW_BAND = 116;
/** The strip under the floor line where the accent drop mark shows the gap. */
export const DROP_STRIP = 24;
/** The swipe rack's room above its tallest board. */
export const SWIPE_TOP_PAD = 16;
/** The swipe rack's caption block under the floor (its Open This Board is a 44-tall tap box). */
export const SWIPE_CAPTION_HEIGHT = 118;
/** The swipe rack's tallest board is never drawn shorter than this, nor taller than the max. */
export const SWIPE_MIN_HEIGHT = 220;
export const SWIPE_MAX_HEIGHT = 420;
/** How far a carried board lifts above the floor. */
export const CARRY_LIFT = 12;
/** The accent mark under the floor that shows where a carried board will drop. */
export const DROP_MARK_WIDTH = 28;
/** The hover rack's caption width, centred under the turned board. */
export const HOVER_CAPTION_WIDTH = 272;
/** The space between a board's name and its card line in the vertical words. */
export const SPINE_WORD_GAP = 8;
/** The smallest the vertical words ever get before the name is cut. */
export const SPINE_FLOOR_SIZE = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Dots per millimetre for a rack `rackHeight` dots tall whose longest board is `longestMm`: the
 * tallest board fills the rack, unless it is shorter than 7'0", in which case 7'0" would.
 */
export function rackScale(rackHeight: number, longestMm: number): number {
  return rackHeight / Math.max(longestMm, RACK_REFERENCE_LENGTH_MM);
}

/** The hover rack's rows, worked out once for a list of boards and a width. */
export interface HoverRackLayout {
  /** How many boards stand on the rack. */
  count: number;
  /** How many rows they stand in. */
  rows: number;
  /** How many boards stand in the fullest row; the rows differ by at most one board. */
  perRow: number;
  /** The tallest board's drawn height, in dots. */
  rackHeight: number;
  /** The ONE scale every board of every row is drawn at, in dots per millimetre. */
  scale: number;
  /** Room kept free beside each row so the widest board can turn fully without leaving the rack. */
  reserve: number;
  /** One board's width at rest. */
  slot: number;
  /** Room at the left for the height-line labels. */
  gutter: number;
  /** One row's whole height: top room, drawing and band. */
  rowBlock: number;
  /** The width the rack was laid out in. */
  contentWidth: number;
}

/**
 * Lays the hover rack out: one row at the 380-dot height if every board fits, else balanced rows
 * at the 288-dot height (30 boards make 15 + 15, never 19 + 11). A row holds as many 48-dot slots
 * as fit beside the label gutter and the room the widest board needs to turn fully.
 */
export function hoverRackLayout(input: {
  count: number;
  contentWidth: number;
  longestMm: number;
  widestHalfMm: number;
}): HoverRackLayout {
  const { contentWidth, longestMm, widestHalfMm } = input;
  const count = Math.max(0, Math.floor(input.count));
  const slot = HOVER_SLOT;
  const gutter = LABEL_GUTTER;

  const fit = (rackHeight: number) => {
    const scale = rackScale(rackHeight, longestMm);
    const reserve = Math.max(0, 2 * widestHalfMm * scale - slot);
    const cap = Math.max(1, Math.floor((contentWidth - gutter - reserve) / slot));
    return { rackHeight, scale, reserve, cap };
  };

  let chosen = fit(HOVER_ONE_ROW_HEIGHT);
  let rows = 1;
  if (chosen.cap < count) {
    chosen = fit(HOVER_MULTI_ROW_HEIGHT);
    // The 288 height belongs to two or more rows: a quiver that just misses one row at 380 is
    // split in two rather than drawn as one shrunken row (UI-SPEC "380 for one row, 288 for two or
    // more").
    rows = Math.max(2, Math.ceil(count / chosen.cap));
  }
  const perRow = Math.max(1, Math.ceil(count / rows));

  return {
    count,
    rows,
    perRow,
    rackHeight: chosen.rackHeight,
    scale: chosen.scale,
    reserve: chosen.reserve,
    slot,
    gutter,
    rowBlock: HOVER_ROW_TOP_ROOM + chosen.rackHeight + HOVER_ROW_BAND,
    contentWidth,
  };
}

/**
 * How many boards stand in `row`. The rows are balanced: they differ by at most one board, the
 * fuller rows first (100 boards in six rows are 17, 17, 17, 17, 16, 16 — never five of 17 and a
 * last row of 15).
 */
function hoverRowCount(layout: HoverRackLayout, row: number): number {
  const base = Math.floor(layout.count / layout.rows);
  const fuller = layout.count - base * layout.rows;
  return row < fuller ? base + 1 : base;
}

/** The index of the first board in `row`. */
function hoverRowStart(layout: HoverRackLayout, row: number): number {
  const base = Math.floor(layout.count / layout.rows);
  const fuller = layout.count - base * layout.rows;
  return row * base + Math.min(row, fuller);
}

/** Where board `index` stands: its row and column, the centre of its slot, its row's floor line
 * and the top of its row's drawing. */
export function hoverSlotPosition(
  layout: HoverRackLayout,
  index: number,
): { row: number; col: number; x: number; floorY: number; topY: number } {
  let row = 0;
  while (row < layout.rows - 1 && index >= hoverRowStart(layout, row + 1)) row++;
  const col = index - hoverRowStart(layout, row);
  const x = layout.gutter + layout.reserve / 2 + col * layout.slot + layout.slot / 2;
  const topY = row * layout.rowBlock + HOVER_ROW_TOP_ROOM;
  return { row, col, x, floorY: topY + layout.rackHeight, topY };
}

function hoverRowAt(layout: HoverRackLayout, y: number): number {
  return clamp(Math.floor(y / layout.rowBlock), 0, Math.max(0, layout.rows - 1));
}

/**
 * Which board a pointer at (`x`, `y`) is over: its row (a pointer in a row's band, below its floor
 * line, still belongs to that row) and the nearest column, clamped to the boards in that row.
 */
export function hoverSlotAt(layout: HoverRackLayout, x: number, y: number): number {
  if (layout.count === 0) return 0;
  const row = hoverRowAt(layout, y);
  const firstCentre = layout.gutter + layout.reserve / 2 + layout.slot / 2;
  const col = clamp(Math.round((x - firstCentre) / layout.slot), 0, hoverRowCount(layout, row) - 1);
  return clamp(hoverRowStart(layout, row) + col, 0, layout.count - 1);
}

/**
 * Whether a pointer at height `y` is over a row's drawing (from the row's top down to its floor
 * line — the boards turn) or its band (below the floor — the rack holds still so the shaper can
 * reach the caption).
 */
export function hoverPointerZone(
  layout: HoverRackLayout,
  y: number,
): { row: number; zone: "drawing" | "band" } {
  const row = hoverRowAt(layout, y);
  const floorY = row * layout.rowBlock + HOVER_ROW_TOP_ROOM + layout.rackHeight;
  return { row, zone: y <= floorY ? "drawing" : "band" };
}

/** The hover rack's whole height, every row's band reserved (one row: 24 + 380 + 116 = 520). */
export function hoverRackHeight(layout: HoverRackLayout): number {
  return layout.rows * layout.rowBlock;
}

/** One dashed height line behind the boards: how high it stands, and its label. */
export interface RackHeightLine {
  heightMm: Mm;
  label: string;
}

/**
 * The dashed height lines behind the boards, up to the taller of the longest board and 7'0":
 * every foot from 4' in Imperial (`4′`, `5′`, ... with a prime), every 50 cm from 150 cm in Metric
 * (bare `150`, `200`, ... — the unit is said once elsewhere).
 */
export function rackHeightLines(system: UnitsSystem, longestMm: number): RackHeightLine[] {
  const top = Math.max(longestMm, RACK_REFERENCE_LENGTH_MM);
  const lines: RackHeightLine[] = [];
  if (system === "metric") {
    for (let cm = 150; centimetresToMm(cm) <= top; cm += 50) {
      lines.push({ heightMm: centimetresToMm(cm), label: `${cm}` });
    }
  } else {
    for (let feet = 4; inchesToMm(12 * feet) <= top; feet++) {
      lines.push({ heightMm: inchesToMm(12 * feet), label: `${feet}′` });
    }
  }
  return lines;
}

/**
 * How far a board turns, in radians, from edge-on (0) to showing its whole outline (PI/2): it
 * follows the board's `distance` from the cursor (or the middle of the phone's track) with no lag,
 * fully turned at 0 and edge-on from `reach` away. Two boards with the cursor exactly between them
 * are both at 45 degrees (UI-SPEC §2 "Angle follows distance").
 */
export function turnAngle(distance: number, reach: number): number {
  if (!(reach > 0)) return distance === 0 ? Math.PI / 2 : 0;
  return (Math.PI / 2) * clamp(1 - Math.abs(distance) / reach, 0, 1);
}

/** The extra width a board needs while it turns: how much wider than its slot its picture is
 * (`halfExtentPx` is half the picture's width at its current turn), and never less than nothing. */
export function boardExtra(halfExtentPx: number, slot: number): number {
  return Math.max(0, 2 * halfExtentPx - slot);
}

/**
 * How far each board steps aside so the rack opens around a turning board (UI-SPEC §1): every
 * board left of a widened board moves left by half that board's extra width, every board right of
 * it moves right by the same, and the widened board itself stays where it is. `extras[k]` is board
 * k's `boardExtra`; the result is each board's sideways offset in dots.
 */
export function rackRoomOffsets(extras: readonly number[]): number[] {
  const total = extras.reduce((sum, extra) => sum + extra, 0);
  const offsets: number[] = [];
  let before = 0;
  for (const extra of extras) {
    const after = total - before - extra;
    offsets.push(before / 2 - after / 2);
    before += extra;
  }
  return offsets;
}

/** The phone track's padding at each end, so the first and last boards can reach the middle. */
export function swipePadding(viewportWidth: number, slot: number = SWIPE_SLOT): number {
  return (viewportWidth - slot) / 2;
}

/** The phone track's whole width: both paddings plus one slot per board. */
export function swipeTrackWidth(count: number, viewportWidth: number, slot: number = SWIPE_SLOT): number {
  return 2 * swipePadding(viewportWidth, slot) + count * slot;
}

/** The centre of board `index` along the phone's track. */
export function swipeSlotCentre(index: number, viewportWidth: number, slot: number = SWIPE_SLOT): number {
  return swipePadding(viewportWidth, slot) + index * slot + slot / 2;
}

/** The scroll position that puts board `index` in the middle of the screen. */
export function swipeScrollLeftFor(index: number, slot: number = SWIPE_SLOT): number {
  return index * slot;
}

/** Which board is nearest the middle of the screen at scroll position `scrollLeft`. */
export function swipeMiddleIndex(scrollLeft: number, count: number, slot: number = SWIPE_SLOT): number {
  if (count <= 0) return 0;
  return clamp(Math.round(scrollLeft / slot), 0, count - 1);
}

/** Which board a tap at `trackX` (measured along the whole track) lands on. */
export function swipeSlotAt(
  trackX: number,
  count: number,
  viewportWidth: number,
  slot: number = SWIPE_SLOT,
): number {
  if (count <= 0) return 0;
  return clamp(Math.floor((trackX - swipePadding(viewportWidth, slot)) / slot), 0, count - 1);
}

/** The tallest board's drawn height on the phone, from the scroller's measured height less its top
 * pad and the drop-mark strip under the floor. */
export function swipeRackHeightFromScroller(scrollerClientHeight: number): number {
  return Math.max(0, scrollerClientHeight - SWIPE_TOP_PAD - DROP_STRIP);
}

/** How a board's vertical words fit beside it: the size they draw at, the name as drawn, and
 * whether the name had to be cut. */
export interface SpineFit {
  fontSize: number;
  name: string;
  cut: boolean;
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  // Older browsers without Intl.Segmenter: whole code points, so an emoji's two halves stay together.
  return Array.from(text);
}

/**
 * Fits a board's vertical words — its name (weight 600), a gap, then its card line (weight 400) —
 * into `maxLength` dots. The words shrink from `baseSize` in half-point steps down to the floor
 * size (10); if they still do not fit there, only the NAME is cut, to the longest run of whole
 * letters (graphemes, so an accent or an emoji is never split) plus "…" that fits. The card line's
 * numbers are never shortened. `measure` is the browser's text measure, passed in so this stays
 * pure. Both loops are bounded — the shrink by the number of half-point steps, the cut by the
 * name's length — so a name of any length is safe (T-15-03).
 */
export function fitSpineWords(input: {
  name: string;
  line: string;
  maxLength: number;
  baseSize: number;
  floorSize?: number;
  step?: number;
  gap?: number;
  measure: (text: string, fontSize: number, weight: 600 | 400) => number;
}): SpineFit {
  const { name, line, maxLength, baseSize, measure } = input;
  const floorSize = input.floorSize ?? SPINE_FLOOR_SIZE;
  const gap = input.gap ?? SPINE_WORD_GAP;
  const step = input.step !== undefined && input.step > 0 ? input.step : 0.5;
  const fits = (words: string, size: number) =>
    measure(words, size, 600) + gap + measure(line, size, 400) <= maxLength;

  let size = baseSize;
  for (;;) {
    if (fits(name, size)) return { fontSize: size, name, cut: false };
    if (size <= floorSize) break;
    size = Math.max(floorSize, size - step);
  }

  const letters = splitGraphemes(name);
  // A one-letter (or empty) name has nothing to cut; it draws whole at the floor size.
  if (letters.length <= 1) return { fontSize: size, name, cut: false };
  for (let keep = letters.length - 1; keep >= 1; keep--) {
    const cutName = `${letters.slice(0, keep).join("")}…`;
    if (fits(cutName, size)) return { fontSize: size, name: cutName, cut: true };
  }
  return { fontSize: size, name: `${letters[0]}…`, cut: true };
}
