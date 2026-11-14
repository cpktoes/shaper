/**
 * How wide and how far off-centre a board of a given length may be — the size rules the Width and
 * Offset sliders, the drag, the guide cards and the board-file fit all read (quick 261113-si7).
 *
 * The founder, 2026-11-13: boards go from 4'0" to 12'0", and "width extended to 31 inches for boards
 * over 8 ft", with "8'0" included in the wider range". So the widest a board may be depends on its
 * length, and that dependency lives in ONE function here (`widePointWidthRangeIn`) — never a second
 * literal 25 or 31 beside a slider.
 *
 * Pure TypeScript with no heavy imports on purpose: `outline.ts` needs the end margin below, and
 * `board.ts` (which re-exports all of this) reaches `outline.ts` through `rocker.ts`, so these rules
 * cannot live in either of them without an import loop. Only units and TYPES come in here.
 *
 * Inches in the numbers, `Mm` at the edges — the same convention `BOARD_LENGTH_RANGE_IN` has.
 */

import type { OutlineSpec } from "./board";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

/**
 * The widest a board UNDER 8'0" can be, and the narrowest any board can be, at the widepoint, in
 * inches. (Until quick si7 this was every board's range; a board of 8'0" or longer may reach
 * `WIDE_BOARD_WIDEPOINT_MAX_IN` — ask `widePointWidthRangeIn`, never read this for a particular board.)
 * Its readers (`drag-spacing`, the template and print tests, the outline viewer's frame) mean "the
 * widest a short board can be", which is why the constant keeps its value.
 */
export const WIDEPOINT_WIDTH_RANGE_IN = { min: 16, max: 25 } as const;

/** A board this long or longer — 8'0", itself included (the founder, 2026-11-13) — may be wider. */
export const WIDE_BOARD_FROM_LENGTH_IN = 96;

/** The widest a board of `WIDE_BOARD_FROM_LENGTH_IN` or longer can be at the widepoint, in inches. */
export const WIDE_BOARD_WIDEPOINT_MAX_IN = 31;

/**
 * How far in from each end `buildOutline` keeps the widest point, in inches — the one place the 16"
 * lives (`outline.ts` reads it, so the Offset window below can never disagree with the drawing).
 */
export const WIDEPOINT_END_MARGIN_IN = 16;

/** The widest Offset window, in inches either side of the board's centre, and its slider step. */
export const WIDEPOINT_OFFSET_MAX_IN = 12;
export const WIDEPOINT_OFFSET_STEP_IN = 0.25;

/** Float slack when asking "is this board 8'0" or longer": 8'0" itself is 2438.4 mm and must count. */
const LENGTH_SLACK_MM = 1e-6;
/** The same slack for "is this width/offset past its limit". */
const VALUE_SLACK_MM = 1e-6;

/**
 * The Width range for a board of this length, in inches: 16" up to 25" under 8'0", up to 31" from
 * 8'0" (96", included) on. A non-finite length reads as a board under 8'0".
 */
export function widePointWidthRangeIn(length: Mm): { min: number; max: number } {
  const wide = Number.isFinite(length) && length >= inchesToMm(WIDE_BOARD_FROM_LENGTH_IN) - LENGTH_SLACK_MM;
  return {
    min: WIDEPOINT_WIDTH_RANGE_IN.min,
    max: wide ? WIDE_BOARD_WIDEPOINT_MAX_IN : WIDEPOINT_WIDTH_RANGE_IN.max,
  };
}

/**
 * The Offset window for a board of this length, in inches either side of centre: ±12", or — on a
 * board short enough that the drawing keeps the widest point `WIDEPOINT_END_MARGIN_IN` from each end —
 * as far as the widest point can actually go (±8" on a 4'0", ±11" on a 4'6"; 4'8" and up is the full
 * ±12"). On the slider's own 1/4" grid and never below zero, so the label never says more than the
 * drawing shows.
 */
export function widePointOffsetRangeIn(length: Mm): { min: number; max: number } {
  const lengthIn = Number.isFinite(length) ? mmToInches(length) : 0;
  const room = lengthIn / 2 - WIDEPOINT_END_MARGIN_IN;
  // The small nudge keeps 54" from reading 10.999999… and landing a step short.
  const stepped = Math.floor(room / WIDEPOINT_OFFSET_STEP_IN + 1e-9) * WIDEPOINT_OFFSET_STEP_IN;
  const max = Math.max(0, Math.min(WIDEPOINT_OFFSET_MAX_IN, stepped));
  return { min: max === 0 ? 0 : -max, max };
}

/**
 * A board's outline as the screen should read it for its length: a Width above the length's top comes
 * back at that top, and — only on a board so short that the window is narrower than ±12" — an Offset
 * outside the window comes back at its edge (quick 261113-si7, the founder's call 2 and 3).
 *
 * The board keeps what was stored; this is how the stored board is READ. The store applies it where
 * it resolves wings, so a 7'0" board that was 28" wide as a 9'0" board draws, labels and saves 25",
 * and gets its 28" back the moment it is lengthened again — until the shaper moves the Width slider
 * itself. A width is never raised, and an Offset on a board of 4'8" or longer is never touched
 * (today's boards draw exactly as before). Returns the SAME object when nothing moves, which is every
 * preset and every board inside the sizes the app made before 4'0" and 31" existed.
 */
export function holdOutlineToLength(spec: OutlineSpec): OutlineSpec {
  const widthMax = inchesToMm(widePointWidthRangeIn(spec.length).max);
  const width = spec.widePointWidth > widthMax + VALUE_SLACK_MM ? mm(widthMax) : spec.widePointWidth;

  const offsetWindow = widePointOffsetRangeIn(spec.length).max;
  let offset = spec.widePointOffset;
  if (offsetWindow < WIDEPOINT_OFFSET_MAX_IN) {
    const edge = inchesToMm(offsetWindow);
    if (offset > edge + VALUE_SLACK_MM) offset = mm(edge);
    else if (offset < -edge - VALUE_SLACK_MM) offset = mm(-edge);
  }

  if (width === spec.widePointWidth && offset === spec.widePointOffset) return spec;
  return { ...spec, widePointWidth: width, widePointOffset: offset };
}
