/**
 * What the closest-fit preview draws and says (quick 261113-d9b, the founder's ruling R1): a board read from a `.brd` file in
 * solid ink with the closest board the app's own controls can make laid over it, dashed. The dialog only paints what is
 * worked out here, the way `brd-preview.ts` serves the Board file preview, and uses its nose-left layout (`brdStationX`)
 * and its pads so the two previews draw alike.
 *
 * Every figure a shaper reads goes through `lib/geometry/units.ts` and `measure-display.ts` (Rule 2): dims (a size, a
 * distance along the board) and marks (a gap, a rocker height, a thickness) read in their own families, in the system the
 * shaper picked. Rounding happens here, for display only; the fit itself keeps actual values.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { BRD_FIT_TIP_SKIP_MM, lineLowestAt, type BrdFit, type Closeness } from "../geometry/brd-fit";
import type { SectionHeight } from "../geometry/bottom-draw";
import { formatDim, formatMark, formatMarkOrLess, formatSignedDim, stationLabel } from "../geometry/measure-display";
import {
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  inchesToMm,
  mm,
  type Mm,
  type UnitsSystem,
} from "../geometry/units";
import { BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y, brdStationX } from "./brd-preview";
import type { ReadBrdBoard } from "./brd-read";

/** The file as read and our closest fit to it: all the preview holds. */
export interface BrdFitLook {
  board: ReadBrdBoard;
  fit: BrdFit;
}

/** The top and side views laid out for a box this wide, nose at the left, one scale along the board. */
export interface BrdFitFrames {
  width: number;
  /** Dots to a millimetre along the board, shared by both views; the side view's height is this times its Height pick. */
  scale: number;
  length: number;
  top: {
    height: number;
    /** The file's outline, closed: the right half tail to nose, then the left half back. */
    file: P2[];
    /** Our closest fit's outline, closed the same way. */
    fit: P2[];
    stringer: { x1: number; x2: number; y: number };
  };
  side: {
    height: number;
    /** How many times true height the side view is drawn. */
    heightFactor: SectionHeight;
    /** The file's board, closed: along the bottom, back along the deck. */
    file: P2[];
    /** Our closest fit's two lines. */
    fitBottom: P2[];
    fitDeck: P2[];
  };
}

const mirrored = (right: readonly P2[], centre: number, scale: number, x: (station: number) => number): P2[] => [
  ...right.map(([station, half]): P2 => [x(station), centre - half * scale]),
  ...right.map(([station, half]): P2 => [x(station), centre + half * scale]).reverse(),
];

/** Lays the preview out for a box `width` dots wide, the side view `height` times true height. */
export function brdFitFrames(look: BrdFitLook, width: number, height: SectionHeight = 1): BrdFitFrames {
  const { board, fit } = look;
  const length = board.length;
  const scale = Math.max(width - 2 * BRD_PREVIEW_PAD_X, 1) / length;
  const at = { scale, length };
  const sx = (station: number) => brdStationX(at, station);

  const half = Math.max(...board.outline.map(([, y]) => y), ...fit.lines.outline.map(([, y]) => y));
  const centre = BRD_PREVIEW_PAD_Y + half * scale;

  const high = Math.max(...board.deck.map(([, h]) => h), ...fit.lines.deck.map(([, h]) => h));
  const low = Math.min(...board.bottom.map(([, h]) => h), ...fit.lines.bottom.map(([, h]) => h));
  const sy = (h: number) => BRD_PREVIEW_PAD_Y + (high - h) * scale * height;
  const line = (points: readonly P2[]): P2[] => points.map(([station, h]): P2 => [sx(station), sy(h)]);

  return {
    width,
    scale,
    length,
    top: {
      height: 2 * centre,
      file: mirrored(board.outline, centre, scale, sx),
      fit: mirrored(fit.lines.outline, centre, scale, sx),
      stringer: { x1: sx(length), x2: sx(0), y: centre },
    },
    side: {
      height: 2 * BRD_PREVIEW_PAD_Y + (high - low) * scale * height,
      heightFactor: height,
      file: [...line(board.bottom), ...line(board.deck).reverse()],
      fitBottom: line(fit.lines.bottom),
      fitDeck: line(fit.lines.deck),
    },
  };
}

/** How close one curve gets, as words: the largest gap and a typical one as marks, where the largest is as a dim from the tail. */
export interface BrdFitCloseWords {
  largest: string;
  typical: string;
  at: string;
}

/** Every figure the dialog shows, in the system the shaper picked. */
export interface BrdFitWords {
  /** The file's own size line: length × width × thickness. */
  size: string;
  outline: BrdFitCloseWords;
  rocker: BrdFitCloseWords;
  thickness: BrdFitCloseWords;
  /** How far in from each end the rocker and thickness figures start, as a dim. */
  tipSkip: string;
  controls: {
    length: string;
    width: string;
    offset: string;
    noseAngle: string;
    noseFullness: string;
    noseRail: string;
    tail: "Squash" | "Pin" | "Round";
    /** The squash tail's end width as a dim; null for a pointed tail, which has none. */
    tailBlock: string | null;
    tailAngle: string;
    tailFullness: string;
    tailRail: string;
    rocker: { noseTip: string; nose12: string; tail12: string; tailTip: string };
    thickness: { noseTip: string; nose12: string; center: string; tail12: string; tailTip: string };
    /** The 12" station's own label in this system (`12"`, or `30.5 cm`). */
    station: string;
  };
}

/** A length the way a size line writes it: feet and inches, or centimetres with their unit. */
const lengthWords = (value: Mm, system: UnitsSystem): string => (system === "metric" ? formatDim(value, system) : formatFeetInches(value));

/**
 * A board's size line: length × width × thickness. Imperial `6'2" × 18 3/4" × 2 1/2"`; Metric `188.0 × 51.4 × 6.7 cm`, the
 * unit carried once at the end (a running line of text, CLAUDE.md Rule 2).
 */
function sizeWords(length: Mm, width: Mm, thickness: Mm, system: UnitsSystem): string {
  return system === "metric"
    ? `${[length, width, thickness].map(formatCentimetres).join(" × ")} cm`
    : [formatFeetInches(length), formatInchesFraction(width), formatInchesFraction(thickness)].join(" × ");
}

/** The thickest the file stands over its bottom, along the stringer. */
function thickestOf(board: ReadBrdBoard): number {
  return Math.max(...board.deck.map(([x, h]) => h - lineLowestAt(board.bottom, x)));
}

function closeWords(c: Closeness, system: UnitsSystem): BrdFitCloseWords {
  return { largest: formatMarkOrLess(c.largest, system), typical: formatMarkOrLess(c.typical, system), at: formatDim(c.at, system) };
}

const percent = (value: number) => `${Math.round(value)}%`;
const degreesWords = (value: number) => `${Math.round(value)}°`;

/** Every word of the preview, in `system`. */
export function brdFitWords(look: BrdFitLook, system: UnitsSystem): BrdFitWords {
  const { board, fit } = look;
  const width = board.width ?? mm(2 * Math.max(...board.outline.map(([, y]) => y)));
  const thickness = board.thickness ?? mm(thickestOf(board));
  const { outline: o, rocker: r, foil: f } = fit;
  return {
    size: sizeWords(board.length, width, thickness, system),
    outline: closeWords(fit.closeness.outline, system),
    rocker: closeWords(fit.closeness.rocker, system),
    thickness: closeWords(fit.closeness.thickness, system),
    tipSkip: formatDim(BRD_FIT_TIP_SKIP_MM, system),
    controls: {
      length: lengthWords(o.length, system),
      width: formatDim(o.widePointWidth, system),
      offset: formatSignedDim(o.widePointOffset, system),
      noseAngle: degreesWords(o.noseAngle),
      noseFullness: percent(o.noseFullness),
      noseRail: percent(o.noseRailLength),
      tail: o.tail.kind === "squash" ? "Squash" : o.tail.kind === "pin" ? "Pin" : "Round",
      tailBlock: o.tail.kind === "squash" ? formatDim(o.tail.endWidth, system) : null,
      tailAngle: degreesWords(o.tailAngle),
      tailFullness: percent(o.tailFullness),
      tailRail: percent(o.tailRailLength),
      rocker: {
        noseTip: formatMark(r.noseTip, system),
        nose12: formatMark(r.nose12, system),
        tail12: formatMark(r.tail12, system),
        tailTip: formatMark(r.tailTip, system),
      },
      thickness: {
        noseTip: formatMark(f.noseTip, system),
        nose12: formatMark(f.nose12, system),
        center: formatMark(f.center, system),
        tail12: formatMark(f.tail12, system),
        tailTip: formatMark(f.tailTip, system),
      },
      station: stationLabel(system),
    },
  };
}

/**
 * A length, and the app's shortest and longest board, in the shaper's system: the three words the "that board is too long
 * or too short" line needs, in that order.
 */
export function brdLengthWords(length: Mm, system: UnitsSystem): [string, string, string] {
  return [
    lengthWords(length, system),
    lengthWords(inchesToMm(BOARD_LENGTH_RANGE_IN.min), system),
    lengthWords(inchesToMm(BOARD_LENGTH_RANGE_IN.max), system),
  ];
}
