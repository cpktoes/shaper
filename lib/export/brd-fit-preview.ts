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
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import {
  BRD_FIT_TIP_SKIP_MM,
  BRD_STRAIGHTEDGE_MM,
  brdFileStations,
  brdFileWidths,
  fitOutlineWidths,
  lineLowestAt,
  outlineGapSide,
  type BrdFit,
  type BrdFileStation,
  type BrdOutlineWidths,
  type Closeness,
} from "../geometry/brd-fit";
import type { SectionHeight } from "../geometry/bottom-draw";
import { formatControlNumber, formatDim, formatMark, formatMarkOrLess, formatSignedDim, stationLabel } from "../geometry/measure-display";
import type { RockerStationKey } from "../geometry/rocker";
import {
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  inchesToMm,
  mm,
  type Mm,
  type UnitsSystem,
} from "../geometry/units";
import { BOARD_NAME_MAX_LENGTH } from "../models/board-file";
import { BRD_PREVIEW_PAD_X, BRD_PREVIEW_PAD_Y } from "./brd-preview";
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

function closeWords(c: Closeness, length: Mm, side: BrdFitCloseWords["side"], system: UnitsSystem): BrdFitCloseWords {
  return {
    largest: formatMarkOrLess(c.largest, system),
    typical: formatMarkOrLess(c.typical, system),
    at: formatDim(c.at, system),
    where: c.at <= length / 2 ? `${formatDim(c.at, system)} from the tail` : `${formatDim(mm(length - c.at), system)} from the nose`,
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
  notRead: "Rails, bottom contours and wings or flyers aren't read from the file. Add these by hand once the board is open.",
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

/** A figure that starts with `<` ("less than the smallest step") read as words: `<1/16"` becomes `less than 1/16"`. */
function lessThan(figure: string): string {
  return figure.startsWith("<") ? `less than ${figure.slice(1)}` : figure;
}

/**
 * How close one curve gets, as a sentence. A figure under the smallest step reads "less than", never "within <1/16"" (the
 * awkward wording 261113-d9b shipped, ruled on by the founder 2026-11-13): this is the one place that rule lives. The outline
 * also says which way the file lies from ours at its widest gap, since that is where a wing or a tweak belongs.
 */
export function closenessSentence(what: "Outline" | "Rocker" | "Thickness", w: BrdFitCloseWords): string {
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
  closeness: { outline: string; rocker: string; thickness: string };
  tipsNote: string;
  tables: BrdFitTable[];
  /** One line per tip that comes to a point, nose first. */
  pointNotes: string[];
  rockerUse: string;
  controls: { outline: string; nose: string; tail: string; rocker: string; thickness: string };
  notRead: string;
}

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
  return {
    title: BRD_FIT_COPY.title,
    from: BRD_FIT_COPY.from(cutName),
    size: BRD_FIT_COPY.size(words.size),
    closeness: {
      outline: closenessSentence("Outline", words.outline),
      rocker: closenessSentence("Rocker", words.rocker),
      thickness: closenessSentence("Thickness", words.thickness),
    },
    tipsNote: BRD_FIT_COPY.tipsNote(words.tipSkip),
    tables: [
      widthsTable(brdFileWidths(board), fitOutlineWidths(fit.outline), system),
      sideTable("rocker", stations, (key) => (key === "center" ? mm(0) : fit.rocker[key]), system),
      sideTable("thickness", stations, (key) => fit.foil[key], system),
    ],
    pointNotes,
    rockerUse: BRD_FIT_COPY.rockerUse,
    controls: {
      outline: BRD_FIT_COPY.outlineLine(w.length, w.width, w.offset),
      nose: BRD_FIT_COPY.noseLine(w.noseAngle, w.noseFullness, w.noseRail),
      tail: BRD_FIT_COPY.tailLine(w.tail, w.tailBlock, w.tailAngle, w.tailFullness, w.tailRail),
      rocker: BRD_FIT_COPY.rockerLine(w.rocker.noseTip, w.rocker.nose12, w.rocker.tail12, w.rocker.tailTip, w.station),
      thickness: BRD_FIT_COPY.thicknessLine(w.thickness.noseTip, w.thickness.nose12, w.thickness.center, w.thickness.tail12, w.thickness.tailTip, w.station),
    },
    notRead: BRD_FIT_COPY.notRead,
  };
}
