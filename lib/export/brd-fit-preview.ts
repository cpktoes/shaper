/**
 * What the closest-fit preview draws and says (quick 261113-d9b, the founder's ruling R1): a board read from a `.brd` file in
 * solid ink with the closest board the app's own controls can make laid over it, dashed. The dialog only paints what is
 * worked out here, the way `brd-preview.ts` serves the Board file preview, and draws nose-left with its pads (the same x
 * rule as `brdStationX`) so the two previews draw alike.
 *
 * Every figure a shaper reads goes through `lib/geometry/units.ts` and `measure-display.ts` (Rule 2): dims (a size, a
 * distance along the board) and marks (a gap, a rocker height, a thickness) read in their own families, in the system the
 * shaper picked. Rounding happens here, for display only; the fit itself keeps actual values.
 *
 * Quick 261113-et0 (the founder, 2026-11-13) makes the preview something a shaper keeps and builds from: `BRD_FIT_COPY` holds
 * every word of the preview AND of the one-page overview that prints from it, and `brdFitSheet` builds every line and table
 * row once, so the dialog and the paper say the same things in the same figures. The rocker and thickness tables show the
 * file's own figures at the app's five stations (E3) beside our fit's.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { P2 } from "../geometry/bezier-fit";
import { formatBottomStation } from "../geometry/blank-reasons";
import {
  DEFAULT_BOTTOM,
  cutKind,
  resolveBottom,
  resolveCut,
  stationFromNearestTip,
  type BottomCutSpec,
  type BottomSectionKey,
} from "../geometry/bottom";
import {
  brdFittedBottomBoard,
  brdStringerLift,
  fitBottomToBrd,
  measureBrdBottom,
  type BrdBottomFit,
  type BrdBottomSection,
} from "../geometry/brd-bottom";
import { fitBrdFins, type BrdFinMarkKey, type BrdFinsFit } from "../geometry/brd-fins";
import {
  BRD_RAIL_FIRST_GAIN_MM,
  BRD_RAIL_FIRST_TRY_MM,
  BRD_RAIL_SAMPLE_STEPS,
  BRD_RAIL_STRIP_MM,
  brdAnchorSections,
  brdRailBegins,
  brdRailBoard,
  brdRailWholeValue,
  brdRailWindows,
  brdRailsSpec,
  fitBrdRails,
  measureBrdRails,
  type BrdRailGap,
  type BrdRailLine,
  type BrdRailSection,
  type BrdRailsFit,
} from "../geometry/brd-rails";
import {
  BRD_FIT_TIP_SKIP_MM,
  BRD_STRAIGHTEDGE_MM,
  brdFileStations,
  brdFileWidths,
  fitBoardToBrd,
  fitOutlineWidths,
  lineLowestAt,
  outlineGapSide,
  type BrdFit,
  type BrdFileStation,
  type BrdOutlineWidths,
  type Closeness,
} from "../geometry/brd-fit";
import { sectionHeightLabel, type SectionHeight } from "../geometry/bottom-draw";
import { bottomRailLift, designFinPlacement, railsOnTheBottom } from "../geometry/design";
import { FIN_SYSTEMS, type FinPlacementResult, type FinPlacementSpec } from "../geometry/fins";
import {
  formatControlNumber,
  formatDim,
  formatMark,
  formatMarkOrLess,
  formatSignedDim,
  formatSignedMark,
  stationLabel,
} from "../geometry/measure-display";
import {
  RAIL_NUDGE_KEYS,
  RAIL_NUDGE_NAMES,
  computeRailBands,
  railFamilyLabel,
  railPlotBounds,
  type RailBandsOutput,
  type RailSectionKey,
} from "../geometry/rail-bands";
import type { RockerStationKey } from "../geometry/rocker";
import {
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  mm,
  type Mm,
  type UnitsSystem,
} from "../geometry/units";
import { effectiveWingRadius } from "../geometry/wings";
import { BOARD_NAME_MAX_LENGTH } from "../models/board-file";
import { BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y, sampleKnots } from "./brd-preview";
import { brdLengthWords, lengthWords } from "./brd-length-words";
import type { ReadBrdBoard } from "./brd-read";

export { brdLengthWords };

/**
 * The file as read and our closest fit to it: all the preview holds. `bottom` is the closest bottom BOTTOM's cuts make to the
 * file's cross-sections (null when the file has no section the fit can use), and `planedBottom` the file's bottom line less the
 * concaves' lift at the stringer: what the board is planed to before the concaves are cut (the file's own line when nothing
 * lifts the stringer). `rails` is the closest rails RAILS' controls make to the same cross-sections, measured on the board that
 * opens (quick 261113-kvo); null with the bottom, when the file has no section to read.
 */
export interface BrdFitLook {
  board: ReadBrdBoard;
  fit: BrdFit;
  bottom: BrdBottomFit | null;
  planedBottom: P2[];
  rails: BrdRailsFit | null;
  /**
   * The fins FINS' controls make closest to the file's, on the board that opens (quick 261113-qyz); null when the file has no
   * fin the reader kept, and the board then opens with a new board's fins. The bottom and the rails were fitted on the board
   * with these fins in place.
   */
  fins: BrdFinsFit | null;
}

/** How many stations along the board the stringer's lift is looked for, to decide whether any concave lifts it at all. */
const LIFT_PROBES = 200;

type FitLines = Pick<ReadBrdBoard, "length" | "outline" | "bottom" | "deck">;
type BottomStep = Pick<BrdFitLook, "fit" | "bottom" | "planedBottom"> & { bottom: BrdBottomFit };

/**
 * The bottom's cuts fitted to the file's cross-sections on the board `first` makes (read out to `windows` where a section's
 * reading width was narrowed to where our rail begins, else to nine-tenths of the way), and, only when a fitted concave lifts
 * the stringer anywhere, the rocker and foil fitted again to the file's stringer less that lift (the founder, 2026-11-13:
 * "for concaves the stringer rocker will always be more, and with flat, vee or belly the stringer rocker will always match").
 * Under a flat, vee or belly the first fit stands untouched, to the last digit. The bottom's figures are finally measured on
 * the board that opens, so what is shown is what a shaper gets. Null when no section can be used.
 */
function bottomOn(
  board: ReadBrdBoard,
  lines: FitLines,
  first: BrdFit,
  fins: FinPlacementSpec | undefined,
  windows?: readonly (Mm | undefined)[],
): BottomStep | null {
  const board0 = brdFittedBottomBoard(first, fins);
  const found = fitBottomToBrd(board.sections, board0, windows);
  if (!found) return null;
  const lift = brdStringerLift(found.bottom, board0);
  let lifted = false;
  for (let i = 0; i <= LIFT_PROBES && !lifted; i++) if (lift(mm((board0.length * i) / LIFT_PROBES)) > 0) lifted = true;
  if (!lifted) return { fit: first, bottom: measureBrdBottom(found.bottom, found.sections, board0), planedBottom: board.bottom };
  const fit = fitBoardToBrd(lines, lift, first);
  return {
    fit,
    bottom: measureBrdBottom(found.bottom, found.sections, brdFittedBottomBoard(fit, fins)),
    planedBottom: board.bottom.map(([x, y]): P2 => [x, y - lift(mm(x))]),
  };
}

/** The file's sections the rails are read from: the bottom's own (the usable ones), each as its half at 48 steps a span, with where it stands in `board.sections`. */
export function brdRailLines(board: ReadBrdBoard): { lines: BrdRailLine[]; index: number[] } {
  const lines: BrdRailLine[] = [];
  const index: number[] = [];
  const near = BRD_FIT_TIP_SKIP_MM - 0.5;
  board.sections.forEach((section, i) => {
    if (section.points.length < 2 || section.station < near || section.station > board.length - near) return;
    const points = sampleKnots(section.knots, BRD_RAIL_SAMPLE_STEPS);
    if (points.length < 2 || !(Math.max(...points.map((p) => p[0])) > 0)) return;
    lines.push({ station: section.station, points });
    index.push(i);
  });
  return { lines, index };
}

/**
 * The whole look at a read board, worked out once when a `.brd` is picked (quick 261113-gwr, 261113-kvo): the outline, rocker
 * and foil fit (`fitBoardToBrd`), the bottom's cuts fitted to the file's cross-sections on the board that fit makes, and the
 * rails RAILS' controls make closest to them on the board that opens, bottom and all. Two orders, the closer wins:
 *
 *  - **Bottom first** (always): the bottom as it has always been read (to nine-tenths of the way out), the rails fitted on it,
 *    and, where our fitted rail begins more than 1/4" inside a section's reading width, the bottom read again on the widths
 *    that stop there and the rails polished on the board that makes. On the founder's four AkuShaper files no width narrows, so
 *    their bottoms are what they were.
 *  - **Rails first** (only when bottom-first leaves some whole section, bottom and rail together, more than 4 mm off AND its
 *    bottom holds a vee or a belly): the rails fitted on a flat bottom, the bottom read out to where those rails begin, and the
 *    rails polished on it; chosen only when it is at least 0.25 mm closer over the whole sections. The order decides who claims
 *    a rise near the rail: a bottom read first takes a soft 50/50 rail for a belly (the founder's longboard), a rail fitted
 *    first takes a rolled-in bottom edge for rail (the Scoop Noserider: 3.22 mm became 7.58 mm), so the bottom's reading is kept
 *    unless the rail's is clearly closer.
 *
 * The stringer is never moved by the rails: the rocker and thickness are fitted to the file's stringer before the rails exist,
 * and only the bottom's concaves plan the board lower (the founder's rule above).
 */
export function brdFitLook(board: ReadBrdBoard): BrdFitLook {
  const lines = { length: board.length, outline: board.outline, bottom: board.bottom, deck: board.deck };
  const first = fitBoardToBrd(lines);
  // The fins come first (quick 261113-qyz): a tail cut's Deepest At is stored from the front fins, so a bottom fitted on a
  // board with a new board's fins would open, on the file's own fins, at a different station than the preview measured. The
  // outline is never refitted after `first` (every later fit reuses it), so this one fin fit holds for every board below.
  const finsFit = fitBrdFins(board.fins, board.outline, first.outline);
  const fins = finsFit?.spec;
  const none: BrdFitLook = { board, fit: first, bottom: null, planedBottom: board.bottom, rails: null, fins: finsFit };
  if (board.sections.length === 0) return none;
  const asRead = bottomOn(board, lines, first, fins);
  if (!asRead) return none;
  const { lines: railLines, index } = brdRailLines(board);
  if (railLines.length === 0) return { ...asRead, board, rails: null, fins: finsFit };

  const stations = railLines.map((line) => line.station);
  const sectionWindows = (windows: readonly (Mm | undefined)[]): (Mm | undefined)[] => {
    const all: (Mm | undefined)[] = board.sections.map(() => undefined);
    windows.forEach((w, k) => (all[index[k]] = w));
    return all;
  };
  const read = brdAnchorSections(railLines, board.length);
  const readAt = { nose: read.nose?.station ?? null, center: read.center?.station ?? null, tail: read.tail?.station ?? null };
  const onBoard = (step: BottomStep) => brdRailBoard(step.fit, step.bottom.bottom, fins);

  // Bottom first.
  let current = asRead;
  let settings = fitBrdRails(railLines, onBoard(current));
  const found = brdRailWindows(railLines, brdRailBegins(current.fit, brdRailsSpec(settings, current.fit.foil), stations));
  if (found.narrowed) {
    const again = bottomOn(board, lines, first, fins, sectionWindows(found.windows));
    if (again) {
      current = again;
      settings = fitBrdRails(railLines, onBoard(current), settings);
    }
  }
  const narrowed = found.narrowed;
  const bottomFirst = measureBrdRails(railLines, onBoard(current), settings, { order: "bottom-first", read: readAt, narrowed });
  const whole = brdRailWholeValue(railLines, onBoard(current), bottomFirst.rails);
  const kinds = BOTTOM_KEYS.map((key) => cutKind(current.bottom.bottom[key].name));
  const result: BrdFitLook = { board, fit: current.fit, bottom: current.bottom, planedBottom: current.planedBottom, rails: bottomFirst, fins: finsFit };
  if (!(whole.largest > BRD_RAIL_FIRST_TRY_MM) || !kinds.some((kind) => kind === "vee" || kind === "belly")) return result;

  // Rails first, on a flat bottom.
  const flat = brdRailBoard(first, null, fins);
  const flatSettings = fitBrdRails(railLines, flat);
  const flatWindows = brdRailWindows(railLines, brdRailBegins(first, brdRailsSpec(flatSettings, flat.foil), stations));
  if (!flatWindows.narrowed) return result;
  const railsFirst = bottomOn(board, lines, first, fins, sectionWindows(flatWindows.windows));
  if (!railsFirst) return result;
  const polished = fitBrdRails(railLines, onBoard(railsFirst), flatSettings);
  const measured = measureBrdRails(railLines, onBoard(railsFirst), polished, { order: "rails-first", read: readAt, narrowed: true });
  const wholeFirst = brdRailWholeValue(railLines, onBoard(railsFirst), measured.rails);
  if (!(wholeFirst.value <= whole.value - BRD_RAIL_FIRST_GAIN_MM)) return result;
  return { board, fit: railsFirst.fit, bottom: railsFirst.bottom, planedBottom: railsFirst.planedBottom, rails: measured, fins: finsFit };
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
    /**
     * One short line per fin, from its trailing edge to its leading edge (a pair mirrored): the file's own fins, and ours as
     * FINS places them on the board that opens (quick 261113-qyz). Both empty when the file has no fins.
     */
    fins: { file: [P2, P2][]; fit: [P2, P2][] };
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

/**
 * The fins as short lines on the top view (quick 261113-qyz): the file's own, each from its back end to its front end with a
 * side pair mirrored about the stringer and a centre fin on it, and ours, from FINS' own marks on the board that opens
 * (`designFinPlacement` on the fit's outline with the fitted fin spec, the same call the bottom was fitted on). A file with no
 * fins draws none.
 */
function finSegments(look: BrdFitLook, sx: (station: number) => number, centre: number, scale: number): { file: [P2, P2][]; fit: [P2, P2][] } {
  if (!look.fins) return { file: [], fit: [] };
  const file: [P2, P2][] = [];
  const { side, centre: middle } = look.board.fins;
  if (side) {
    for (const sign of [-1, 1]) {
      file.push([
        [sx(side.back[0]), centre + sign * side.back[1] * scale],
        [sx(side.front[0]), centre + sign * side.front[1] * scale],
      ]);
    }
  }
  if (middle) file.push([[sx(middle.back), centre], [sx(middle.front), centre]]);
  const placed = finPlacementOf(look);
  const fit = (placed?.marks ?? []).map((m): [P2, P2] => [
    [sx(m.offTail), centre + m.lateral * scale],
    [sx(m.leadingOffTail), centre + m.leadingLateral * scale],
  ]);
  return { file, fit };
}

/** FINS' own placement on the board that opens, or null when the file carries no fins. */
function finPlacementOf(look: BrdFitLook): FinPlacementResult | null {
  return look.fins ? designFinPlacement({ outline: look.fit.outline, fins: look.fins.spec, finsImportTemplate: true }) : null;
}

/** The board's own extremes, shared by every layout: the widest half-width and the highest and lowest the side view reaches. */
function extremes(look: BrdFitLook): { half: number; high: number; low: number } {
  const { board, fit } = look;
  return {
    half: Math.max(...board.outline.map(([, y]) => y), ...fit.lines.outline.map(([, y]) => y)),
    high: Math.max(...board.deck.map(([, h]) => h), ...fit.lines.deck.map(([, h]) => h)),
    low: Math.min(...board.bottom.map(([, h]) => h), ...fit.lines.bottom.map(([, h]) => h)),
  };
}

/**
 * Both views at `scale` dots to a millimetre, the nose at the left. `padX` is the room at each end and `padY` above and below
 * each drawing; the side view is `height` times true height.
 */
function framesAt(look: BrdFitLook, scale: number, padX: number, padY: number, height: SectionHeight, width: number): BrdFitFrames {
  const { board, fit } = look;
  const length = board.length;
  const sx = (station: number) => padX + (length - station) * scale;
  const { half, high, low } = extremes(look);
  const centre = padY + half * scale;
  const sy = (h: number) => padY + (high - h) * scale * height;
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
      fins: finSegments(look, sx, centre, scale),
    },
    side: {
      height: 2 * padY + (high - low) * scale * height,
      heightFactor: height,
      file: [...line(board.bottom), ...line(board.deck).reverse()],
      fitBottom: line(fit.lines.bottom),
      fitDeck: line(fit.lines.deck),
    },
  };
}

/** Lays the preview out for a box `width` dots wide, the side view `height` times true height. */
export function brdFitFrames(look: BrdFitLook, width: number, height: SectionHeight = 1): BrdFitFrames {
  const scale = Math.max(width - 2 * BRD_PREVIEW_PAD_X, 1) / look.board.length;
  return framesAt(look, scale, BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y, height, width);
}

/**
 * Lays both views out inside a box of `box.width` by `box.height` (millimetres on paper), the top view, a `gap`, then the side
 * view, with no pad. The scale is the largest at which the board fits across the box AND the two views and the gap fit down it,
 * so a tall side view (Height x8) shrinks both views together rather than running off the sheet.
 */
export function brdFitFramesInBox(
  look: BrdFitLook,
  box: { width: number; height: number },
  height: SectionHeight,
  gap: number,
): BrdFitFrames {
  const length = look.board.length;
  const { half, high, low } = extremes(look);
  const tall = 2 * half + (high - low) * height;
  const byWidth = box.width / length;
  const scale = tall > 0 ? Math.min(byWidth, (box.height - gap) / tall) : byWidth;
  return framesAt(look, scale, (box.width - length * scale) / 2, 0, height, box.width);
}

/** How close one curve gets, as words: the largest gap and a typical one as marks, where the largest is as a dim from the tail. */
export interface BrdFitCloseWords {
  largest: string;
  typical: string;
  at: string;
  /** Where the widest gap is, from the nearer end: `7" from the tail` or `3/8" from the nose`. */
  where: string;
  /** The outline only: which way the file lies from our fit at the widest gap; null for rocker and thickness, or when they agree. */
  side: "wider" | "narrower" | null;
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

/** Where a gap sits, from the nearer end: `7" from the tail` or `3/8" from the nose` (a dim, in the shaper's system). */
export function gapWhere(at: Mm, length: Mm, system: UnitsSystem): string {
  return at <= length / 2 ? `${formatDim(at, system)} from the tail` : `${formatDim(mm(length - at), system)} from the nose`;
}

function closeWords(c: Closeness, length: Mm, side: BrdFitCloseWords["side"], system: UnitsSystem): BrdFitCloseWords {
  return {
    largest: formatMarkOrLess(c.largest, system),
    typical: formatMarkOrLess(c.typical, system),
    at: formatDim(c.at, system),
    where: gapWhere(c.at, length, system),
    side,
  };
}

const percent = (value: number) => `${formatControlNumber(value)}%`;
const degreesWords = (value: number) => `${formatControlNumber(value)}°`;

/** Every word of the preview, in `system`. */
export function brdFitWords(look: BrdFitLook, system: UnitsSystem): BrdFitWords {
  const { board, fit } = look;
  const width = board.width ?? mm(2 * Math.max(...board.outline.map(([, y]) => y)));
  const thickness = board.thickness ?? mm(thickestOf(board));
  const { outline: o, rocker: r, foil: f } = fit;
  return {
    size: sizeWords(board.length, width, thickness, system),
    outline: closeWords(
      fit.closeness.outline,
      board.length,
      outlineGapSide(board.outline, fit.lines.outline, fit.closeness.outline.at),
      system,
    ),
    rocker: closeWords(fit.closeness.rocker, board.length, null, system),
    thickness: closeWords(fit.closeness.thickness, board.length, null, system),
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

// ---------------------------------------------------------------------------------------------------------------------
// The words, and the one sheet the dialog and the paper both read
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Every word of the preview and of the printed overview (quick 261113-et0): a shaper's words, ours to be reworded after the
 * founder's look. They live here, in `lib/`, so one builder feeds the dialog and the paper.
 */
export const BRD_FIT_COPY = {
  title: "Board file — our closest fit",
  description:
    "The file in solid lines, our closest fit dashed. Print the overview to keep beside you — it isn't kept with the board — then open our fit as a new board and fine-tune it. Nothing is saved until you press Save.",
  from: (fileName: string) => `From ${fileName}`,
  keyFile: "The file",
  keyOurs: "Our closest fit",
  size: (dims: string) => `The file: ${dims}`,
  howClose: "HOW CLOSE",
  tipsNote: (tipSkip: string) =>
    `The rocker and thickness gaps leave out the last ${tipSkip} at each end, where a file may round its tips over; our side view ends square.`,
  controls: "OUR CLOSEST FIT",
  outlineLine: (length: string, width: string, offset: string) => `Length ${length} · Width ${width} · Offset ${offset}`,
  noseLine: (angle: string, fullness: string, rail: string) => `Nose Angle ${angle} · Fullness ${fullness} · Nose Rail ${rail}`,
  tailLine: (name: string, block: string | null, angle: string, fullness: string, rail: string) =>
    `${name} tail${block === null ? "" : ` · Tail Block ${block}`} · Tail Angle ${angle} · Fullness ${fullness} · Tail Rail ${rail}`,
  rockerLine: (noseTip: string, nose12: string, tail12: string, tailTip: string, station: string) =>
    `Rocker: nose ${noseTip} · nose ${station} ${nose12} · tail ${station} ${tail12} · tail ${tailTip}`,
  thicknessLine: (noseTip: string, nose12: string, center: string, tail12: string, tailTip: string, station: string) =>
    `Thickness: nose ${noseTip} · nose ${station} ${nose12} · centre ${center} · tail ${station} ${tail12} · tail ${tailTip}`,
  notRead: "Rails and bottom contours aren't read from the file. Add these by hand once the board is open.",
  /** The line when the bottom WAS read but the rails were not: rails are what is left to add by hand. */
  notReadAfterBottom: "Rails aren't read from the file. Add these by hand once the board is open.",
  /**
   * The fins part of the not-read line (quick 261113-qyz; before it, the rails-read line said "Fins aren't read from the file"):
   * after the sections part. A file with fins: what a .brd cannot carry. A file with none, or whose fin figures do not sit on
   * the board: the board opens with a new board's fins.
   */
  notReadFins: (depth: string | null, splay: string | null) => {
    const rear = "A quad's rear fins aren't read from a file yet.";
    if (depth === null && splay === null) return `A fin's depth and splay angle (cant) aren't read: FINS has no control for either. ${rear}`;
    if (depth !== null && splay !== null) {
      return `The file's side fins are ${depth} deep at a splay angle (cant) of ${splay}: FINS has no control for either, so they aren't read. ${rear}`;
    }
    if (depth !== null) return `The file's side fins are ${depth} deep: FINS has no control for a fin's depth, so it isn't read. ${rear}`;
    return `The file's side fins are at a splay angle (cant) of ${splay}: FINS has no control for a splay angle, so it isn't read. ${rear}`;
  },
  noFins: "The file has no fins: the board opens with the fins a new board starts with.",
  finsDontSit: "The file's fin figures don't sit on the board, so it opens with the fins a new board starts with.",
  /**
   * The FINS block (quick 261113-qyz). The control words are FINS' own (`components/fins/fin-controls.tsx`), copied because `lib/`
   * cannot import a component; a test holds each to that file's text.
   */
  finsCaption: "FINS",
  finRowLabels: {
    sideOffTail: "Side fins — off the tail",
    sideInFromRail: "Side fins — in from the rail",
    sideToeIn: "Side fins — toe-in",
    sideBase: "Side fins — base length",
    centreOffTail: "Centre fin — off the tail",
    centreBase: "Centre fin — base length",
  } as const satisfies Record<BrdFinMarkKey, string>,
  finWords: {
    aftForward: "Aft/Forward position",
    offRail: "Off-Rail",
    toeIn: "Toe-In",
    baseLength: "Fin Base Length",
    boxLength: "Fin Box Length",
  } as const,
  /** Which mark the widest gap is, as words after "the widest gap". */
  finGapWhich: {
    sideOffTail: "the side fins' distance off the tail",
    sideInFromRail: "the side fins' distance in from the rail",
    sideToeIn: "the side fins' toe-in",
    sideBase: "the side fins' base length",
    centreOffTail: "the centre fin's distance off the tail",
    centreBase: "the centre fin's base length",
  } as const satisfies Record<BrdFinMarkKey, string>,
  finsClose: (largest: string, which: string) => (largest.startsWith("<") ? `Fins: ${lessThan(largest)} off` : `Fins: within ${largest}, the widest gap ${which}`),
  finsLine: (model: string, system: string, forward: string | null, centre: string | null) =>
    `Fins: ${model} · ${system}${forward === null ? "" : ` · Forward fins: ${forward}`}${centre === null ? "" : ` · Centre fin: ${centre}`}`,
  /** A control that stopped at the end of its range: what it left, and the farthest FINS' own control goes. */
  finHold: (subject: string, by: string, direction: string, control: string, limit: string) =>
    `${subject} ${by} ${direction} the file's: FINS' ${control} goes no further than ${limit}.`,
  finHoldSubjects: { side: "Our side fins sit", centre: "Our centre fin sits", sideToe: "Our side fins toe in", sideBase: "Our side fins' base is", centreBase: "Our centre fin's base is" } as const,
  finHoldDirections: {
    nearerTail: "nearer the tail than",
    furtherTail: "further from the tail than",
    nearerRail: "nearer the rail than",
    furtherRail: "further from the rail than",
    less: "less than",
    more: "more than",
    shorter: "shorter than",
    longer: "longer than",
  } as const,
  finToeOut: "The file's side fins point out toward the rail at the front, which FINS can't do: they open with no toe-in.",
  finSystemQuoted: (word: string) => `The file names its fin system "${word}", which FINS doesn't have: the board opens on FCS II.`,
  finSystemUnnamed: "The file doesn't name a fin system FINS has, so the board opens on FCS II.",
  finsPartDropped: "Part of the file's fin line didn't sit on the board and was left out.",
  /** A wing's corners when they are sharp, or rounded too slightly for the file's drawing to tell (quick 261113-m5w). */
  wingSharpCorners: "sharp corners",
  /** The file's corners when it clearly rounds them: the radius as the rounded wing that fits its step best measured. */
  wingFileRounded: (radius: string) => `corners rounded about ${radius}`,
  /** Our wing's corners when it opens rounded: the Corner radius the WINGS tab will hold. */
  wingOursRounded: (radius: string) => `${radius} corner radius`,
  /**
   * One wing the file draws beside the one we fitted (quick 261113-hyy): where it stands off the tail, how deep it is, how long its
   * run is along the stringer, and its corners (quick 261113-m5w), the file's as measured and ours as fitted. A run that reads as
   * nothing is a square step.
   */
  wingLine: (n: number, file: BrdWingWords, ours: BrdWingWords) => {
    const how = (w: BrdWingWords, along: string) =>
      `${w.depth} deep ${w.run === null ? "in a square step" : `over a ${w.run} run${along}`}, ${w.off} off the tail, ${w.corners}`;
    return `Wing ${n} — the file: ${how(file, " along the stringer")}. Ours: ${how(ours, "")}.`;
  },
  /**
   * The BOTTOM block (quick 261113-gwr). The slider words are BOTTOM's own (`components/bottom/bottom-copy.ts`), copied because
   * `lib/` cannot import a component; a test holds the two equal.
   */
  bottomCaption: "BOTTOM",
  bottomSectionsCaption: (heightLabel: string) => `CROSS-SECTIONS · ${heightLabel}`,
  bottomSectionCaption: (where: string, width: string) => `${where} · ${width} wide`,
  bottomColumns: { nose: "Nose", center: "Centre", tail: "Tail" } as const satisfies Record<BottomSectionKey, string>,
  bottomRowLabels: { at: "Read at", file: "The file", fit: "Our fit", stations: "Start · Deepest At · End", across: "Across" } as const,
  bottomSliderWords: { start: "Start", deepestAt: "Deepest At", end: "End", offRail: "Off Rail", offStringer: "Off Stringer", troughAt: "Trough At" } as const,
  fromNose: (list: string) => `${list} from the nose`,
  fromTail: (list: string) => `${list} from the tail`,
  noValue: "—",
  noSection: "No section here",
  bottomKinds: { flat: "Flat", belly: "Belly", vee: "Vee", single: "Single concave", double: "Double concave" } as const,
  bottomWindowNote:
    "The bottom is read across each of the file's cross-sections, from the stringer to nine-tenths of the way out to the rail, or less where our fitted rail begins (the rail is read below). A section that is all but flat reads as flat.",
  sectionsRead: (used: number, total: number, tipSkip: string) =>
    `Read from ${used} of the file's ${total} cross-sections; the ones within ${tipSkip} of a tip are left out.`,
  bottomUnread: "The file's bottom couldn't be read: it has no cross-sections we could use, so the board opens with a flat bottom.",
  bottomLine: (nose: string, center: string, tail: string) => `Bottom: ${nose} · ${center} · ${tail}`,
  /**
   * The RAILS block (quick 261113-kvo). The control words are RAILS' own (`components/rails/rail-controls.tsx`), copied because
   * `lib/` cannot import a component; a test holds each to that file's text. The nudge names come from `RAIL_NUDGE_NAMES`.
   */
  railsCaption: "RAILS",
  railSectionsCaption: (heightLabel: string) => `CROSS-SECTIONS · ${heightLabel}`,
  railSectionCaption: (where: string, width: string) => `${where} · ${width} wide`,
  railColumns: { nose: "Nose", center: "Centre", tail: "Tail" } as const satisfies Record<RailSectionKey, string>,
  railRowLabels: { at: "Read at", deck: "Deck Profile", shape: "Family · Ratio", ticked: "Ticked", advanced: "Advanced", close: "How close" } as const,
  railWords: {
    deckProfile: "Deck Profile",
    family: "Family",
    ratio: "Ratio",
    symmetrical: "Symmetrical",
    hardEdge: "Hard Edge",
    scaledFromCenter: "Scaled from center by",
    singleTuck: "Use Single Tuck",
    sharpBottomTuck: "Sharp Bottom Tuck",
  } as const,
  /** Where a rail's widest gap sits, as words: `at the rail`, `on the deck 4 3/8" in from the rail`. */
  railAtRail: "at the rail",
  railOnDeck: (inFromRail: string) => `on the deck ${inFromRail} in from the rail`,
  railOnBottom: (inFromRail: string) => `on the bottom ${inFromRail} in from the rail`,
  railWhereSection: (station: string, where: string) => `at the section ${station}, ${where}`,
  railCellClose: (largest: string, typical: string) => `${largest.startsWith("<") ? lessThan(largest) : `within ${largest}`}, typically ${lessThan(typical)}`,
  railRegionNote: (strip: string) =>
    `Each rail is read from the outer ${strip} of the file's bottom, round the rail and over the deck to the stringer, against our board's own cross-section at the same place — our bottom included. Between the three, RAILS blends one rail into the next.`,
  railsFirstNote: "This file's rail rolls in from well off the rail, so its rails were fitted first and its bottom read only out to where our rail begins.",
  railBlendNote: "Tail Rail Blends From and Ends At are left where a new board puts them.",
  railsUnread: "The file's rails couldn't be read: it has no cross-sections we could use, so the board opens with a new board's rails.",
  railLine: (nose: string, center: string, tail: string) => `Rails: Nose ${nose} · Centre ${center} · Tail ${tail}`,
  rockerLines:
    "The file's rocker is the finished board's, along the stringer; ours is the board before contours. Under a concave the finished rocker reads more, by the concave's depth there; under a flat, vee or belly the two are the same line.",
  stringerNote: (lift: string, station: string) =>
    `Our fit's concaves lift its stringer by up to ${lift} (at ${station}): the figures above are the finished stringer's. The board is planed that much lower there, and ROCKER shows the rocker before contours once the board is open.`,
  close: "Close",
  topName: "The board file from above, with our closest fit",
  sideName: "The board file from the side, with our closest fit",
  captions: { widths: "WIDTHS", rocker: "ROCKER", thickness: "THICKNESS" },
  columnFile: "The file",
  columnFit: "Our fit",
  rows: {
    noseTip: "Nose tip",
    center: "Centre",
    tailTip: "Tail tip",
    nose12: (station: string) => `Nose ${station}`,
    tail12: (station: string) => `Tail ${station}`,
    wide: "Wide point",
    wideAt: "Wide point sits",
    tailEnd: "Tail end",
  },
  noFlatEnd: "No flat end",
  atCentre: "at centre",
  forward: (dim: string) => `${dim} forward`,
  back: (dim: string) => `${dim} back`,
  pointNote: (tip: "nose" | "tail", far: string, near: string, lift: string, thickness: string) =>
    `${tip === "nose" ? "Nose" : "Tail"} tip: the file's ${tip} comes to a point, so its rocker and thickness here are read with a straightedge along the bottom and the deck from ${far} to ${near} in. At the very point the bottom stands ${lift} and the board is ${thickness} thick.`,
  rockerUse: "To match the file's rocker exactly, pick a blank on ROCKER and use Customize Rocker to bring it to these figures.",
  print: "Print Overview",
  printing: "Preparing…",
  openBoard: "Open as a Board",
  printProblem: "The overview couldn't be made. Try again.",
} as const;

/** One wing's figures and corners, worded for the sheet: `run` is null for a square step (a run that reads as nothing). */
export interface BrdWingWords {
  off: string;
  depth: string;
  run: string | null;
  /** Its corners: "sharp corners", or the radius when they are rounded. */
  corners: string;
}

/** A figure that starts with `<` ("less than the smallest step") read as words: `<1/16"` becomes `less than 1/16"`. */
export function lessThan(figure: string): string {
  return figure.startsWith("<") ? `less than ${figure.slice(1)}` : figure;
}

/**
 * How close one curve gets, as a sentence. A figure under the smallest step reads "less than", never "within <1/16"" (the
 * awkward wording 261113-d9b shipped, ruled on by the founder 2026-11-13): this is the one place that rule lives. The outline
 * also says which way the file lies from ours at its widest gap, since that is where a wing or a tweak belongs.
 */
export function closenessSentence(what: "Outline" | "Rocker" | "Thickness" | "Bottom" | "Rails", w: BrdFitCloseWords): string {
  const head = w.largest.startsWith("<") ? `${what}: ${lessThan(w.largest)} off` : `${what}: within ${w.largest}`;
  const side = w.side === null ? "" : `, where the file is ${w.side} than our fit`;
  return `${head}, typically ${lessThan(w.typical)} — the widest gap ${w.where}${side}`;
}

/** One row of a table: what it is, the file's figure and our fit's. */
export interface BrdFitRow {
  key: string;
  label: string;
  file: string;
  fit: string;
}

/** One table of the sheet. */
export interface BrdFitTable {
  kind: "widths" | "rocker" | "thickness";
  caption: string;
  rows: BrdFitRow[];
}

/** Every line and row the preview and the printed overview show: built once, so the screen and the paper cannot disagree. */
export interface BrdFitSheet {
  title: string;
  from: string;
  size: string;
  /** `bottom` is null when the file's cross-sections could not be read. */
  closeness: { outline: string; rocker: string; thickness: string; bottom: string | null; rails: string | null; fins: string | null };
  /** One line per wing the file draws, nose-most first: the file's wing as measured beside ours as fitted. Empty for a file with no wing. */
  wings: string[];
  tipsNote: string;
  tables: BrdFitTable[];
  /** One line per tip that comes to a point, nose first. */
  pointNotes: string[];
  rockerUse: string;
  /** What the two rockers are (always shown under the rocker table). */
  rockerLines: string;
  /** Where our concaves lift the finished stringer, and by how much; null when none does. */
  stringerNote: string | null;
  controls: { outline: string; nose: string; tail: string; rocker: string; thickness: string; bottom: string | null; rails: string | null; fins: string | null };
  /** The BOTTOM block: the table of what the file measures and what we fitted, or the one line saying it could not be read. */
  bottom: BrdFitBottomBlock;
  /** The RAILS block (quick 261113-kvo): the same, for the rails. */
  rails: BrdFitRailsBlock;
  /** The FINS block (quick 261113-qyz): the file's fins beside ours, as marks; null when the file has none the reader kept. */
  fins: BrdFitFinsBlock | null;
  notRead: string;
}

/** The FINS block: a caption, one row per mark the file has (the file's figure and ours), and its notes. */
export interface BrdFitFinsBlock {
  caption: string;
  rows: BrdFitRow[];
  notes: string[];
}

/** One column of the RAILS table: a section key, its heading, and the caption of the drawing above it (null: no section here). */
export interface BrdFitRailColumn {
  key: RailSectionKey;
  label: string;
  drawingCaption: string | null;
}

/** One row of the RAILS table: its words, then the nose, centre and tail cells in that order. */
export interface BrdFitRailRow {
  key: "at" | "deck" | "shape" | "ticked" | "advanced" | "close";
  label: string;
  cells: [string, string, string];
}

export type BrdFitRailsBlock =
  | { read: true; caption: string; drawingsCaption: string; columns: BrdFitRailColumn[]; rows: BrdFitRailRow[]; notes: string[] }
  | { read: false; caption: string; line: string };

/** One column of the BOTTOM table: a section key, its heading, and the caption of the drawing above it (null: no section here). */
export interface BrdFitBottomColumn {
  key: BottomSectionKey;
  label: string;
  drawingCaption: string | null;
}

/** One row of the BOTTOM table: its words, then the nose, centre and tail cells in that order. */
export interface BrdFitBottomRow {
  key: "at" | "file" | "fit" | "stations" | "across";
  label: string;
  cells: [string, string, string];
}

export type BrdFitBottomBlock =
  | { read: true; caption: string; columns: BrdFitBottomColumn[]; rows: BrdFitBottomRow[]; notes: string[] }
  | { read: false; caption: string; line: string };

/** Where the wide point sits, as words: its distance forward or back of the middle, or "at centre". */
function wideAtWords(offset: Mm, system: UnitsSystem): string {
  const magnitude = formatDim(mm(Math.abs(offset)), system);
  if (magnitude === formatDim(mm(0), system)) return BRD_FIT_COPY.atCentre;
  return offset > 0 ? BRD_FIT_COPY.forward(magnitude) : BRD_FIT_COPY.back(magnitude);
}

/** The side tables' rows in the order they are read: nose tip down to tail tip. */
const SIDE_ROWS: RockerStationKey[] = ["noseTip", "nose12", "center", "tail12", "tailTip"];

function sideLabel(key: RockerStationKey, system: UnitsSystem): string {
  const station = stationLabel(system);
  switch (key) {
    case "noseTip":
      return BRD_FIT_COPY.rows.noseTip;
    case "nose12":
      return BRD_FIT_COPY.rows.nose12(station);
    case "center":
      return BRD_FIT_COPY.rows.center;
    case "tail12":
      return BRD_FIT_COPY.rows.tail12(station);
    case "tailTip":
      return BRD_FIT_COPY.rows.tailTip;
  }
}

function widthsTable(file: BrdOutlineWidths, ours: BrdOutlineWidths, system: UnitsSystem): BrdFitTable {
  const station = stationLabel(system);
  const end = (w: BrdOutlineWidths) => (w.tailEnd === null ? BRD_FIT_COPY.noFlatEnd : formatDim(w.tailEnd, system));
  return {
    kind: "widths",
    caption: BRD_FIT_COPY.captions.widths,
    rows: [
      { key: "nose12", label: BRD_FIT_COPY.rows.nose12(station), file: formatDim(file.nose12, system), fit: formatDim(ours.nose12, system) },
      { key: "wide", label: BRD_FIT_COPY.rows.wide, file: formatDim(file.wide, system), fit: formatDim(ours.wide, system) },
      { key: "wideAt", label: BRD_FIT_COPY.rows.wideAt, file: wideAtWords(file.wideOffset, system), fit: wideAtWords(ours.wideOffset, system) },
      { key: "tail12", label: BRD_FIT_COPY.rows.tail12(station), file: formatDim(file.tail12, system), fit: formatDim(ours.tail12, system) },
      { key: "tailEnd", label: BRD_FIT_COPY.rows.tailEnd, file: end(file), fit: end(ours) },
    ],
  };
}

function sideTable(
  kind: "rocker" | "thickness",
  stations: BrdFileStation[],
  ours: (key: RockerStationKey) => Mm,
  system: UnitsSystem,
): BrdFitTable {
  return {
    kind,
    caption: BRD_FIT_COPY.captions[kind],
    rows: SIDE_ROWS.map((key) => {
      const file = stations.find((st) => st.key === key)!;
      return {
        key,
        label: sideLabel(key, system),
        file: formatMark(kind === "rocker" ? file.lift : file.thickness, system),
        fit: formatMark(ours(key), system),
      };
    }),
  };
}

/** The stringer note: where our concaves lift the finished stringer most, and by how much; null when none lifts it at a station. */
function stringerNoteWords(fit: BrdFit, system: UnitsSystem): string | null {
  let best: { key: RockerStationKey; lift: Mm } | null = null;
  for (const key of SIDE_ROWS) {
    const lift = fit.stringerLift[key];
    if (lift > 0 && (!best || lift > best.lift)) best = { key, lift };
  }
  return best ? BRD_FIT_COPY.stringerNote(formatMark(best.lift, system), sideLabel(best.key, system)) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The BOTTOM block (quick 261113-gwr)
// ---------------------------------------------------------------------------------------------------------------------

const BOTTOM_KEYS: readonly BottomSectionKey[] = ["nose", "center", "tail"];

/** A column of the BOTTOM block: which of the file's sections is read for a key, or none. */
export interface BrdBottomRow {
  key: BottomSectionKey;
  section: BrdBottomSection | null;
}

/**
 * The three sections the BOTTOM block shows, one per key: the file's own sections nearest 12" from the nose, the middle of the
 * board and 12" from the tail, each section used once (the nearest pair is given first). A file with fewer sections leaves a
 * row with none; a look with no bottom has three.
 */
export function brdBottomRows(look: BrdFitLook): BrdBottomRow[] {
  const chosen = brdAnchorSections(look.bottom?.sections ?? [], look.board.length);
  return BOTTOM_KEYS.map((key) => ({ key, section: chosen[key] }));
}

/** The drawings' own width in drawing units; the dialog and the paper scale it to their box. */
export const BRD_BOTTOM_DRAWING_WIDTH = 1000;
/** The air either side of the widest window, the pad above and below the lines, and the tallest the drawings may stand (units). */
const BOTTOM_DRAWING = { air: 30, pad: 16, tallest: 260 } as const;

/** One cross-section drawn: the file's bottom and ours, mirrored about the stringer, with the straightedge and the stringer. */
export interface BrdBottomDrawing {
  key: BottomSectionKey;
  file: P2[];
  fit: P2[];
  straightedge: { x1: number; x2: number; y: number };
  stringer: { x: number; y1: number; y2: number };
}

export interface BrdBottomFrames {
  width: number;
  height: number;
  /** The Height pick, and the factor actually drawn (less than asked when the cut would not fit its room). */
  heightAsked: SectionHeight;
  heightDrawn: number;
  /** Nose, centre, tail, for the rows that have a section. */
  drawings: BrdBottomDrawing[];
}

/**
 * The cross-sections as drawings, `BRD_BOTTOM_DRAWING_WIDTH` units wide: the bottom only, over the part that is read (the
 * stringer to nine-tenths of the way to the rail, mirrored rail to rail), the file solid and ours dashed. One scale across for
 * all three (the widest window fills the width less the air); up is exaggerated by the Height pick, less where that would
 * leave the room. Heights are measured against the height at the stringer, so a concave hangs its rails below it and a vee lifts
 * them above (up is up).
 */
export function brdBottomFrames(rows: readonly BrdBottomRow[], height: SectionHeight): BrdBottomFrames {
  const { air, pad, tallest } = BOTTOM_DRAWING;
  const drawn = rows.filter((row): row is { key: BottomSectionKey; section: BrdBottomSection } => row.section !== null && row.section.ours.length > 0);
  const windowMax = Math.max(0, ...drawn.map((row) => row.section.across[row.section.across.length - 1]));
  if (drawn.length === 0 || !(windowMax > 0)) {
    return { width: BRD_BOTTOM_DRAWING_WIDTH, height: 2 * pad, heightAsked: height, heightDrawn: height, drawings: [] };
  }
  const kx = (BRD_BOTTOM_DRAWING_WIDTH - 2 * air) / (2 * windowMax);
  const values = drawn.flatMap((row) => [...row.section.file, ...row.section.ours]);
  const up = Math.max(1, ...values);
  const down = Math.max(1, -Math.min(...values));
  let ky = kx * height;
  if ((up + down) * ky > tallest - 2 * pad) ky = (tallest - 2 * pad) / (up + down);
  const y0 = pad + up * ky;
  const mirroredLine = (across: readonly number[], values: readonly number[]): P2[] => {
    const right = across.map((a, j): P2 => [BRD_BOTTOM_DRAWING_WIDTH / 2 + a * kx, y0 - values[j] * ky]);
    const left = across.map((a, j): P2 => [BRD_BOTTOM_DRAWING_WIDTH / 2 - a * kx, y0 - values[j] * ky]);
    return [...left.slice(1).reverse(), ...right];
  };
  return {
    width: BRD_BOTTOM_DRAWING_WIDTH,
    height: 2 * pad + (up + down) * ky,
    heightAsked: height,
    heightDrawn: ky / kx,
    drawings: drawn.map(({ key, section }) => ({
      key,
      // The left half runs from the section's far end back to the stringer's neighbour, so the whole line is one run, left to right.
      file: mirroredLine(section.across, section.file),
      fit: mirroredLine(section.across, section.ours),
      straightedge: { x1: BRD_BOTTOM_DRAWING_WIDTH / 2 - windowMax * kx - 10, x2: BRD_BOTTOM_DRAWING_WIDTH / 2 + windowMax * kx + 10, y: y0 },
      stringer: { x: BRD_BOTTOM_DRAWING_WIDTH / 2, y1: y0 - up * ky, y2: y0 + down * ky },
    })),
  };
}

const cutWords = (spec: BottomCutSpec, system: UnitsSystem): string =>
  cutKind(spec.name) === "flat" ? spec.name : `${spec.name} ${formatMark(spec.depth, system)}`;

/** A fitted cut's across marks as BOTTOM words them: Off Rail (a single or a double), Trough At and Off Stringer; none for a vee, a belly or a flat. */
function acrossWords(spec: BottomCutSpec, system: UnitsSystem): string {
  const w = BRD_FIT_COPY.bottomSliderWords;
  const kind = cutKind(spec.name);
  const mark = (word: string, value: Mm) => `${word} ${formatMark(value, system)}`;
  if (kind === "double") {
    const parts = [mark(w.troughAt, spec.troughAt), mark(w.offRail, spec.offRail)];
    if (spec.offStringer > 0) parts.push(mark(w.offStringer, spec.offStringer));
    return parts.join(" · ");
  }
  if (kind === "single") return mark(w.offRail, spec.offRail);
  if (spec.name === "Tri-Plane Hull Center") return mark(w.offStringer, spec.offStringer);
  return BRD_FIT_COPY.noValue;
}

/** The bottom's lines and block for `brdFitSheet`, all null or "unread" when the file's bottom could not be read. */
function bottomSheetParts(look: BrdFitLook, system: UnitsSystem): { block: BrdFitBottomBlock; closeness: string | null; controls: string | null } {
  const c = BRD_FIT_COPY;
  const found = look.bottom;
  if (!found) return { block: { read: false, caption: c.bottomCaption, line: c.bottomUnread }, closeness: null, controls: null };
  const length = look.board.length;
  const board = brdFittedBottomBoard(look.fit, look.fins?.spec);
  const rows = brdBottomRows(look);
  const cells = <T,>(make: (key: BottomSectionKey, row: BrdBottomRow) => T): [T, T, T] =>
    [make("nose", rows[0]), make("center", rows[1]), make("tail", rows[2])];
  const cut = (key: BottomSectionKey): BottomCutSpec => found.bottom[key];
  const stations = (key: BottomSectionKey): string => {
    const spec = cut(key);
    if (cutKind(spec.name) === "flat") return c.noValue;
    const resolved = resolveCut(key, spec, board);
    const list = [resolved.start, resolved.deepest, resolved.end].map((s) => formatBottomStation(stationFromNearestTip(key, s, board), system)).join(" · ");
    return key === "nose" ? c.fromNose(list) : c.fromTail(list);
  };
  const fileWords = (row: BrdBottomRow): string => {
    if (!row.section) return c.noValue;
    const { kind, depth } = row.section.reads;
    return kind === "flat" ? c.bottomKinds.flat : `${c.bottomKinds[kind]} ${formatMark(depth, system)}`;
  };
  const w = closeWordsOf(found, length, system);
  return {
    block: {
      read: true,
      caption: c.bottomCaption,
      columns: BOTTOM_KEYS.map((key, k) => ({
        key,
        label: c.bottomColumns[key],
        drawingCaption: rows[k].section
          ? c.bottomSectionCaption(gapWhere(rows[k].section.station, length, system), formatDim(mm(2 * rows[k].section.reach), system))
          : null,
      })),
      rows: [
        { key: "at", label: c.bottomRowLabels.at, cells: cells((_k, row) => (row.section ? gapWhere(row.section.station, length, system) : c.noSection)) },
        { key: "file", label: c.bottomRowLabels.file, cells: cells((_k, row) => fileWords(row)) },
        { key: "fit", label: c.bottomRowLabels.fit, cells: cells((key) => cutWords(cut(key), system)) },
        { key: "stations", label: c.bottomRowLabels.stations, cells: cells((key) => stations(key)) },
        { key: "across", label: c.bottomRowLabels.across, cells: cells((key) => acrossWords(cut(key), system)) },
      ],
      notes: [c.bottomWindowNote, c.sectionsRead(found.sections.length, look.board.sections.length, formatDim(BRD_FIT_TIP_SKIP_MM, system))],
    },
    closeness: closenessSentence("Bottom", w),
    controls: c.bottomLine(...cells((key) => cutWords(cut(key), system))),
  };
}

/** How close the bottom is, as the other HOW CLOSE lines: the widest gap is in a section, so it says which, and how far out. */
function closeWordsOf(found: BrdBottomFit, length: Mm, system: UnitsSystem): BrdFitCloseWords {
  const { largest, typical, station, across } = found.closeness;
  return {
    largest: formatMarkOrLess(largest, system),
    typical: formatMarkOrLess(typical, system),
    at: formatDim(station, system),
    where: `at the section ${gapWhere(station, length, system)}, ${formatMark(across, system)} out from the stringer`,
    side: null,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The RAILS block (quick 261113-kvo)
// ---------------------------------------------------------------------------------------------------------------------

const RAIL_KEYS: readonly RailSectionKey[] = ["nose", "center", "tail"];

/** A column of the RAILS block: which of the file's sections the rail was fitted to there, as it was measured, or none. */
export interface BrdRailRow {
  key: RailSectionKey;
  section: BrdRailSection | null;
}

/**
 * The three sections the RAILS block shows, one per key: the file section each rail was fitted to (`BrdRailsFit.read`), measured
 * on the board that opens. A look with no rails has three nulls.
 */
export function brdRailRows(look: BrdFitLook): BrdRailRow[] {
  const rails = look.rails;
  return RAIL_KEYS.map((key) => ({ key, section: rails && rails.read[key] !== null ? (rails.sections.find((s) => s.station === rails.read[key]) ?? null) : null }));
}

/** RAILS' own outputs for the rails that open, as the design store makes them: the rails standing on the bottom the cuts leave. */
function railOutputs(look: BrdFitLook): RailBandsOutput {
  const rails = look.rails!.rails;
  const board = brdFittedBottomBoard(look.fit, look.fins?.spec);
  const resolved = resolveBottom(look.bottom?.bottom ?? DEFAULT_BOTTOM, board);
  const { anchors } = brdRailBoard(look.fit, look.bottom?.bottom ?? null, look.fins?.spec);
  return computeRailBands(railsOnTheBottom(rails, bottomRailLift(resolved, board), anchors));
}

/** One cross-section's rail drawn: the file's and ours, the rail at the right, running in toward the stringer at the left. */
export interface BrdRailDrawing {
  key: RailSectionKey;
  file: P2[];
  fit: P2[];
  /** The height of the bottom at the stringer, across the span: the line the rail's bottom turns up from. */
  bottomLine: { x1: number; x2: number; y: number };
}

export interface BrdRailFrames {
  width: number;
  height: number;
  /** How far in from the widest point the drawings run (millimetres): the stretch RAILS' own plot shows, never past the stringer. */
  span: Mm;
  /** Nose, centre, tail, for the rows that have a section. */
  drawings: BrdRailDrawing[];
}

/** The part of a polyline at or beyond `xMin`, cut cleanly at it. */
function clipFrom(points: readonly P2[], xMin: number): P2[] {
  const out: P2[] = [];
  for (let k = 0; k < points.length; k++) {
    const [x, y] = points[k];
    if (x >= xMin) {
      if (out.length === 0 && k > 0 && points[k - 1][0] < xMin) {
        const [px, py] = points[k - 1];
        out.push([xMin, py + ((y - py) * (xMin - px)) / (x - px)]);
      }
      out.push([x, y]);
    } else if (k + 1 < points.length && points[k + 1][0] >= xMin && out.length > 0) {
      const [nx, ny] = points[k + 1];
      out.push([xMin, y + ((ny - y) * (xMin - x)) / (nx - x)]);
    }
  }
  return out;
}

/**
 * The cross-sections as drawings, `BRD_BOTTOM_DRAWING_WIDTH` units wide, the way RAILS draws a rail: true proportions (one scale
 * both ways, no Height pick), the rail at the right with the stringer toward the left, the file solid and ours dashed. All three
 * share one scale; the span in from the widest point is the widest stretch RAILS' own plot shows for our fitted rails (2" beyond
 * the Domed Deck Band, `railPlotBounds`), never past the stringer, and fills the width less the air. Heights are measured from the
 * stringer's bottom, so a concave hangs the rail's bottom below it and a vee lifts it above.
 */
export function brdRailFrames(rows: readonly BrdRailRow[], look: BrdFitLook): BrdRailFrames {
  const { air, pad } = BOTTOM_DRAWING;
  const drawn = rows.filter((row): row is { key: RailSectionKey; section: BrdRailSection } => row.section !== null && row.section.ours.length > 0 && row.section.file.length > 0);
  if (drawn.length === 0 || !look.rails) return { width: BRD_BOTTOM_DRAWING_WIDTH, height: 2 * pad, span: mm(0), drawings: [] };
  const outputs = railOutputs(look);
  const reachOf = (half: readonly P2[]) => Math.max(...half.map((p) => p[0]));
  const widestPlot = Math.max(...drawn.map((row) => -railPlotBounds(outputs[row.key].result).xAxisMin));
  const widestReach = Math.max(...drawn.map((row) => reachOf(row.section.file)));
  const span = mm(Math.min(widestPlot, widestReach));
  const kx = (BRD_BOTTOM_DRAWING_WIDTH - 2 * air) / span;
  const right = BRD_BOTTOM_DRAWING_WIDTH - air;
  const cut = (row: { key: RailSectionKey; section: BrdRailSection }) => {
    const reach = reachOf(row.section.file);
    const xMin = Math.max(0, reach - span);
    return { reach, file: clipFrom(row.section.file, xMin), fit: clipFrom(row.section.ours, xMin) };
  };
  const cuts = drawn.map((row) => ({ row, ...cut(row) }));
  const values = cuts.flatMap((c) => [...c.file, ...c.fit].map((p) => p[1]));
  const up = Math.max(1, ...values);
  const down = Math.max(0, -Math.min(0, ...values));
  const y0 = pad + up * kx;
  return {
    width: BRD_BOTTOM_DRAWING_WIDTH,
    height: 2 * pad + (up + down) * kx,
    span,
    drawings: cuts.map(({ row, reach, file, fit }) => {
      const x = (v: number) => right - (reach - v) * kx;
      const line = (points: readonly P2[]): P2[] => points.map(([a, h]): P2 => [x(a), y0 - h * kx]);
      return {
        key: row.key,
        file: line(file),
        fit: line(fit),
        bottomLine: { x1: Math.max(air - 10, x(Math.max(0, reach - span)) - 10), x2: right + 10, y: y0 },
      };
    }),
  };
}

/** Which of RAILS' boxes a rail has ticked, in RAILS' own words. */
function tickedWords(key: RailSectionKey, look: BrdFitLook): string[] {
  const w = BRD_FIT_COPY.railWords;
  const rails = look.rails!.rails;
  const section = rails[key];
  const hard = key === "tail" && rails.tailHardEdge;
  return [
    ...(section.symmetrical && !hard ? [w.symmetrical] : []),
    ...(hard ? [w.hardEdge] : []),
    ...(section.singleTuck && !hard ? [w.singleTuck] : []),
    ...(section.sharpBottomTuck && !hard ? [w.sharpBottomTuck] : []),
  ];
}

/** What is moved in the Advanced menu: Scaled from center by (a tip, off 1.00), then each nudge off its formula. */
function advancedWords(key: RailSectionKey, look: BrdFitLook, system: UnitsSystem): string[] {
  const section = look.rails!.rails[key];
  const out: string[] = [];
  if (key !== "center" && Math.abs(section.scaleFromCenter - 1) > 1e-9) out.push(`${BRD_FIT_COPY.railWords.scaledFromCenter} ${section.scaleFromCenter.toFixed(2)}`);
  for (const nudge of RAIL_NUDGE_KEYS) if (Math.abs(section.nudges[nudge]) > 1e-9) out.push(`${RAIL_NUDGE_NAMES[nudge]} ${formatSignedMark(section.nudges[nudge], system)}`);
  return out;
}

/** Where a rail's widest gap sits, in words. */
function railWhereWords(where: BrdRailGap["where"], inFromRail: Mm, system: UnitsSystem): string {
  if (where === "rail") return BRD_FIT_COPY.railAtRail;
  const inFrom = formatMark(inFromRail, system);
  return where === "deck" ? BRD_FIT_COPY.railOnDeck(inFrom) : BRD_FIT_COPY.railOnBottom(inFrom);
}

/** The rails' lines and block for `brdFitSheet`, all null or "unread" when the file's rails could not be read. */
function railsSheetParts(look: BrdFitLook, system: UnitsSystem): { block: BrdFitRailsBlock; closeness: string | null; controls: string | null } {
  const c = BRD_FIT_COPY;
  const found = look.rails;
  if (!found) return { block: { read: false, caption: c.railsCaption, line: c.railsUnread }, closeness: null, controls: null };
  const length = look.board.length;
  const rows = brdRailRows(look);
  const outputs = railOutputs(look);
  const cells = <T,>(make: (key: RailSectionKey, row: BrdRailRow) => T): [T, T, T] => [make("nose", rows[0]), make("center", rows[1]), make("tail", rows[2])];
  const settingOf = (key: RailSectionKey) => found.rails[key];
  const shape = (key: RailSectionKey) => `${railFamilyLabel(settingOf(key).family)} ${settingOf(key).ratioTopPercent}/${100 - settingOf(key).ratioTopPercent}`;
  const list = (words: string[]) => (words.length > 0 ? words.join(" · ") : c.noValue);
  const { closeness } = found;
  const w: BrdFitCloseWords = {
    largest: formatMarkOrLess(closeness.largest, system),
    typical: formatMarkOrLess(closeness.typical, system),
    at: formatDim(closeness.station, system),
    where: c.railWhereSection(gapWhere(closeness.station, length, system), railWhereWords(closeness.where, closeness.inFromRail, system)),
    side: null,
  };
  const reachOf = (half: readonly P2[]) => Math.max(...half.map((p) => p[0]));
  const notes = [c.railRegionNote(formatDim(BRD_RAIL_STRIP_MM, system)), c.sectionsRead(found.sections.length, look.board.sections.length, formatDim(BRD_FIT_TIP_SKIP_MM, system))];
  if (found.order === "rails-first") notes.push(c.railsFirstNote);
  notes.push(c.railBlendNote);
  return {
    block: {
      read: true,
      caption: c.railsCaption,
      drawingsCaption: c.railSectionsCaption(sectionHeightLabel({ heightAsked: 1, heightDrawn: 1 })),
      columns: RAIL_KEYS.map((key, k) => ({
        key,
        label: c.railColumns[key],
        drawingCaption: rows[k].section
          ? c.railSectionCaption(gapWhere(rows[k].section.station, length, system), formatDim(mm(2 * reachOf(rows[k].section.file)), system))
          : null,
      })),
      rows: [
        { key: "at", label: c.railRowLabels.at, cells: cells((_k, row) => (row.section ? gapWhere(row.section.station, length, system) : c.noSection)) },
        { key: "deck", label: c.railRowLabels.deck, cells: cells((key) => formatMark(outputs[key].railThicknessClamped, system)) },
        { key: "shape", label: c.railRowLabels.shape, cells: cells((key) => shape(key)) },
        { key: "ticked", label: c.railRowLabels.ticked, cells: cells((key) => list(tickedWords(key, look))) },
        { key: "advanced", label: c.railRowLabels.advanced, cells: cells((key) => list(advancedWords(key, look, system))) },
        {
          key: "close",
          label: c.railRowLabels.close,
          cells: cells((_k, row) =>
            row.section ? c.railCellClose(formatMarkOrLess(row.section.gap.largest, system), formatMarkOrLess(row.section.gap.mean, system)) : c.noValue,
          ),
        },
      ],
      notes,
    },
    closeness: closenessSentence("Rails", w),
    controls: c.railLine(
      ...cells((key) => {
        const ticked = tickedWords(key, look);
        return ticked.length > 0 ? `${shape(key)}, ${ticked.join(" · ")}` : shape(key);
      }),
    ),
  };
}

/** The mark's figure as the sheet shows it: a mark, whole millimetres in Metric. */
const finMark = (value: Mm, system: UnitsSystem): string => formatMark(value, system);

/**
 * The fins' lines and block for `brdFitSheet` (quick 261113-qyz), all null when the file holds no fin the reader kept. The rows
 * are the marks FINS shows (off the tail, in from the rail, toe-in, base length; for a centre fin, off the tail and base
 * length), the file's beside ours on the board that opens; the controls line is FINS' own words with the figure each of its
 * labels shows; and every control that stopped at the end of its range says by how much it fell short.
 */
function finsSheetParts(look: BrdFitLook, system: UnitsSystem): { block: BrdFitFinsBlock | null; closeness: string | null; controls: string | null } {
  const c = BRD_FIT_COPY;
  const found = look.fins;
  if (!found) return { block: null, closeness: null, controls: null };
  const { file, ours } = found;
  const rows: BrdFitRow[] = [];
  const row = (key: BrdFinMarkKey, fileValue: Mm | undefined, ourValue: Mm | undefined) => {
    if (fileValue === undefined) return;
    rows.push({ key, label: c.finRowLabels[key], file: finMark(fileValue, system), fit: ourValue === undefined ? c.noValue : finMark(ourValue, system) });
  };
  row("sideOffTail", file.side?.offTail, ours.side?.offTail);
  row("sideInFromRail", file.side?.inFromRail, ours.side?.inFromRail);
  row("sideToeIn", file.side?.toeIn, ours.side?.toeIn);
  row("sideBase", file.side?.base, ours.side?.base);
  row("centreOffTail", file.centre?.offTail, ours.centre?.offTail);
  row("centreBase", file.centre?.base, ours.centre?.base);

  // What FINS' own labels show on the board that opens.
  const placement = finPlacementOf(look)!;
  const resolved = placement.resolved;
  const spec = found.spec;
  const system0 = FIN_SYSTEMS.find((o) => o.value === found.finSystem)!.label;
  const w = c.finWords;
  const forwardOffTail = spec.finSetup === "2plus1" ? resolved.sideOffTail : spec.finSetup === "twin" ? resolved.twinOffTail : resolved.frontOffTail;
  const forward = placement.flags.hasForwardSection
    ? [
        `${w.aftForward} — ${finMark(forwardOffTail, system)}`,
        `${w.offRail} — ${finMark(resolved.forwardOffRail, system)}`,
        `${w.toeIn} — ${finMark(resolved.forwardToe, system)}`,
        `${w.baseLength} — ${finMark(spec.advanced.baseLenForward, system)}`,
      ].join(" · ")
    : null;
  const centre = placement.flags.hasCenterSection
    ? [
        `${w.aftForward} — ${finMark(resolved.centerOffTail, system)}`,
        `${placement.flags.centerBaseLenFieldLabel} — ${finMark(spec.advanced.baseLenCenter, system)}`,
      ].join(" · ")
    : null;
  const modelHeader = placement.modelHeader;

  const notes: string[] = [];
  const hold = c.finHoldDirections;
  const subject = c.finHoldSubjects;
  for (const { control, by } of found.short) {
    const size = lessThan(formatMarkOrLess(by, system));
    const o = ours.side;
    const oc = ours.centre;
    const f = file.side;
    const fc = file.centre;
    switch (control) {
      case "forwardPosition":
        if (o && f) notes.push(c.finHold(subject.side, size, o.offTail < f.offTail ? hold.nearerTail : hold.furtherTail, w.aftForward, `${finMark(o.offTail, system)} off the tail`));
        break;
      case "centrePosition":
        if (oc && fc) notes.push(c.finHold(subject.centre, size, oc.offTail < fc.offTail ? hold.nearerTail : hold.furtherTail, w.aftForward, `${finMark(oc.offTail, system)} off the tail`));
        break;
      case "offRail":
        if (o && f) notes.push(c.finHold(subject.side, size, o.inFromRail < f.inFromRail ? hold.nearerRail : hold.furtherRail, w.offRail, finMark(o.inFromRail, system)));
        break;
      case "toeIn":
        if (o && f) notes.push(c.finHold(subject.sideToe, size, o.toeIn < f.toeIn ? hold.less : hold.more, w.toeIn, finMark(o.toeIn, system)));
        break;
      case "forwardBase":
        if (o && f) notes.push(c.finHold(subject.sideBase, size, o.base < f.base ? hold.shorter : hold.longer, w.baseLength, finMark(o.base, system)));
        break;
      case "centreBase":
        if (oc && fc) notes.push(c.finHold(subject.centreBase, size, oc.base < fc.base ? hold.shorter : hold.longer, placement.flags.centerBaseLenFieldLabel, finMark(oc.base, system)));
        break;
    }
  }
  if (found.toeOut) notes.push(c.finToeOut);
  if (!found.systemNamed) notes.push(found.fileWord === null ? c.finSystemUnnamed : c.finSystemQuoted(found.fileWord));
  if (look.board.fins.dropped) notes.push(c.finsPartDropped);

  // A fit that lands on the file's marks exactly leaves a gap of nothing, which is still "less than the smallest step" (a figure of
  // nothing is read as that, never as "within 0").
  const largest = formatMarkOrLess(mm(Math.max(found.largest.gap, 1e-6)), system);
  return {
    block: { caption: c.finsCaption, rows, notes },
    closeness: c.finsClose(largest, c.finGapWhich[found.largest.which]),
    controls: c.finsLine(modelHeader, system0, forward, centre),
  };
}

/** The not-read line: the sections part (nothing when the rails were read), then the fins part. */
function notReadWords(look: BrdFitLook, bottomRead: boolean, system: UnitsSystem): string {
  const c = BRD_FIT_COPY;
  const sections = look.rails ? null : bottomRead ? c.notReadAfterBottom : c.notRead;
  const file = look.board.fins;
  const fins = look.fins
    ? c.notReadFins(file.depth === null ? null : formatMark(file.depth, system), file.splay === null ? null : degreesWords(file.splay))
    : file.dropped
      ? c.finsDontSit
      : c.noFins;
  return sections === null ? fins : `${sections} ${fins}`;
}

/**
 * The sheet's wing lines (quick 261113-hyy): for each wing found in the file, the file's own wing beside the one our fit drew,
 * in the shaper's system. A wing's place off the tail is a dim (a distance along the board) and its depth, run and corner radius
 * are marks (the small figures a tape reads), as the WINGS tab shows them. Wing k of the file is wing k of ours (the fit keeps
 * the order), and its corners (quick 261113-m5w) are read from the same index. A file whose corners are clearly rounded is
 * worded by the rounded wing that fit its step best (the finder's raw run counts the rounds, so it is not the one to quote);
 * any other file's wing is worded as the finder measured it, with sharp corners.
 */
function wingLines(fit: BrdFit, system: UnitsSystem): string[] {
  const ours = fit.outline.wings ?? [];
  const nothing = formatMark(mm(0), system);
  const words = (w: { station: Mm; depth: Mm; run: Mm }, corners: string): BrdWingWords => ({
    off: formatDim(w.station, system),
    depth: lessThan(formatMarkOrLess(w.depth, system)),
    run: formatMark(w.run, system) === nothing ? null : lessThan(formatMarkOrLess(w.run, system)),
    corners,
  });
  const count = Math.min(fit.fileWings.length, fit.fileWingCorners.length, ours.length);
  const lines: string[] = [];
  for (let k = 0; k < count; k++) {
    const corner = fit.fileWingCorners[k];
    const file = corner.rounded
      ? words(corner.measured, BRD_FIT_COPY.wingFileRounded(formatMark(corner.measured.radius, system)))
      : words(fit.fileWings[k], BRD_FIT_COPY.wingSharpCorners);
    const radius = effectiveWingRadius(ours[k]);
    const mine = words(ours[k], radius > 0 ? BRD_FIT_COPY.wingOursRounded(formatMark(radius, system)) : BRD_FIT_COPY.wingSharpCorners);
    lines.push(BRD_FIT_COPY.wingLine(k + 1, file, mine));
  }
  return lines;
}

/**
 * Every line and table of the preview and the printed overview, in `system`. Dims (widths, where the wide point sits) read in
 * their own family and marks (rocker heights, thicknesses) in theirs (Rule 2). A tip that comes to a point gets a note line
 * after the tables: its table figures are read with a straightedge, and the note gives the point's own.
 */
export function brdFitSheet(look: BrdFitLook, fileName: string, system: UnitsSystem): BrdFitSheet {
  const { board, fit } = look;
  const words = brdFitWords(look, system);
  const stations = brdFileStations(board);
  const w = words.controls;
  const cutName = Array.from(fileName).slice(0, BOARD_NAME_MAX_LENGTH).join("");
  const pointNotes: string[] = [];
  for (const key of ["noseTip", "tailTip"] as const) {
    const point = stations.find((st) => st.key === key)?.point;
    if (!point) continue;
    pointNotes.push(
      BRD_FIT_COPY.pointNote(
        key === "noseTip" ? "nose" : "tail",
        formatDim(BRD_STRAIGHTEDGE_MM.far, system),
        formatDim(BRD_STRAIGHTEDGE_MM.near, system),
        formatMark(point.lift, system),
        lessThan(formatMarkOrLess(point.thickness, system)),
      ),
    );
  }
  const bottom = bottomSheetParts(look, system);
  const rails = railsSheetParts(look, system);
  const fins = finsSheetParts(look, system);
  return {
    title: BRD_FIT_COPY.title,
    from: BRD_FIT_COPY.from(cutName),
    size: BRD_FIT_COPY.size(words.size),
    closeness: {
      outline: closenessSentence("Outline", words.outline),
      rocker: closenessSentence("Rocker", words.rocker),
      thickness: closenessSentence("Thickness", words.thickness),
      bottom: bottom.closeness,
      rails: rails.closeness,
      fins: fins.closeness,
    },
    wings: wingLines(fit, system),
    tipsNote: BRD_FIT_COPY.tipsNote(words.tipSkip),
    tables: [
      widthsTable(brdFileWidths(board), fitOutlineWidths(fit.outline), system),
      // Our FINISHED stringer: the planed rocker plus our concaves' lift there, from the centre's own (nothing changes without a concave).
      sideTable("rocker", stations, (key) => (key === "center" ? mm(0) : mm(fit.rocker[key] + fit.stringerLift[key] - fit.stringerLift.center)), system),
      sideTable("thickness", stations, (key) => mm(fit.foil[key] - fit.stringerLift[key]), system),
    ],
    pointNotes,
    rockerUse: BRD_FIT_COPY.rockerUse,
    rockerLines: BRD_FIT_COPY.rockerLines,
    stringerNote: stringerNoteWords(fit, system),
    controls: {
      outline: BRD_FIT_COPY.outlineLine(w.length, w.width, w.offset),
      nose: BRD_FIT_COPY.noseLine(w.noseAngle, w.noseFullness, w.noseRail),
      tail: BRD_FIT_COPY.tailLine(w.tail, w.tailBlock, w.tailAngle, w.tailFullness, w.tailRail),
      rocker: BRD_FIT_COPY.rockerLine(w.rocker.noseTip, w.rocker.nose12, w.rocker.tail12, w.rocker.tailTip, w.station),
      thickness: BRD_FIT_COPY.thicknessLine(w.thickness.noseTip, w.thickness.nose12, w.thickness.center, w.thickness.tail12, w.thickness.tailTip, w.station),
      bottom: bottom.controls,
      rails: rails.controls,
      fins: fins.controls,
    },
    bottom: bottom.block,
    rails: rails.block,
    fins: fins.block,
    notRead: notReadWords(look, bottom.block.read, system),
  };
}
