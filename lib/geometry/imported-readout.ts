/**
 * The "imported dimensions" readouts (quick 261018-fg1): what ROCKER, RAILS, VOLUME and FINS say, in
 * their INPUTS section, about the board they are working from — as data, not as a sentence.
 *
 * The founder, 2026-10-18, on every screen that imports: "can we make the inputs 'imported
 * dimensions' stand out more. Right now they are actually smaller text", then, choosing from
 * sketch 017: "Go with C readout card, figures in accent = off". Each screen used to end its INPUTS
 * block with one small run-on sentence; it now draws a small card — a caption, then each figure
 * large with its name under it. This file builds what goes IN the card; the card itself is
 * `components/design/imported-readout-card.tsx`, one component for all four screens so they never
 * drift apart.
 *
 * Every figure is written through `measure-display.ts` (CLAUDE.md Rule 2). Each figure stands alone
 * in its own cell, so in Metric each one carries its own unit (`182.9 cm`, `33 mm`) — a unit is
 * carried once per line of running text, and a value standing alone in its own box carries its own.
 * The station label (`12"` / `30.5 cm`) sits in the figure's NAME, the way the old sentences wrote
 * it. Nothing here changes a number: the figures are exactly what the old sentences showed.
 *
 * The caption and every name are the sketch's wording and live here, so a wording change is one edit.
 * `key` is a stable machine name that is never shown (React and the browser tests use it).
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { TailShape } from "./board";
import { formatDim, formatLength, formatMark, stationLabel } from "./measure-display";
import type { Mm, UnitsSystem } from "./units";

/** One figure in the card. */
export interface ImportedReadoutItem {
  /** A stable machine name, never shown: `length`, `width`, `nose`, `center`, `tail`, `tailWidth`, `tailBlock`, `depth`, `thickness`. */
  key: string;
  /** The name drawn under the figure. */
  label: string;
  /** The figure, carrying its own unit in Metric. */
  value: string;
}

/** What one screen's card says. */
export interface ImportedReadout {
  /** The card's caption, e.g. `From TEMPLATE` (drawn in capitals by the card's own style). */
  caption: string;
  /** The figures, in the order they are drawn. */
  items: ImportedReadoutItem[];
  /** A line under a faint rule at the foot of the card, or null (only VOLUME has one). */
  foot: string | null;
}

/** The board FINS places its fins on, as the readout needs it. */
export interface FinsImportedBoard {
  /** The board's overall length. */
  length: Mm;
  /** The board's full width at the 12" station from the tail. */
  tailWidth12: Mm;
  /** The board's tail shape. */
  tail: TailShape;
  /** A diamond tail's depth as drawn (clamped to the tail block); unused for other tails. */
  diamondDepth: Mm;
}

const TAIL_NAME: Record<TailShape["kind"], string> = {
  pin: "Pin",
  round: "Round",
  diamond: "Diamond",
  squash: "Squash",
  swallow: "Swallow",
};

const FROM_TEMPLATE = "From TEMPLATE";
const FROM_ROCKER_AND_FOIL = "From ROCKER & FOIL";
/** VOLUME's caption names both screens it draws from: the length and width come from TEMPLATE, the
 * centre thickness from ROCKER's foil (the founder, 2026-10-18: "imported from Template and Rocker
 * & Foil"). */
const FROM_TEMPLATE_AND_ROCKER_AND_FOIL = "From TEMPLATE and ROCKER & FOIL";

/**
 * ROCKER: the template's length and width. `Length 6'0"`, `Width 19"`; Metric `182.9 cm`, `48.3 cm`.
 * The length reads through `formatLength` (the same formatter a blank's length reads through, so the
 * two compare directly), the width through `formatDim`.
 */
export function rockerImportedReadout(length: Mm, width: Mm, system: UnitsSystem): ImportedReadout {
  return {
    caption: FROM_TEMPLATE,
    items: [
      { key: "length", label: "Length", value: formatLength(length, system) },
      { key: "width", label: "Width", value: formatDim(width, system) },
    ],
    foot: null,
  };
}

/**
 * RAILS: the foil's thickness at the nose and tail stations and the board's centre thickness — all
 * three marks (whole millimetres in Metric). Nose first, centre, tail last.
 *
 * @param nose12 the foil's nose thickness at the 12" station
 * @param center the board's centre thickness
 * @param tail12 the foil's tail thickness at the 12" station
 */
export function railsImportedReadout(nose12: Mm, center: Mm, tail12: Mm, system: UnitsSystem): ImportedReadout {
  const station = stationLabel(system);
  return {
    caption: FROM_ROCKER_AND_FOIL,
    items: [
      { key: "nose", label: `Nose @ ${station}`, value: formatMark(nose12, system) },
      { key: "center", label: "Center", value: formatMark(center, system) },
      { key: "tail", label: `Tail @ ${station}`, value: formatMark(tail12, system) },
    ],
    foot: null,
  };
}

/**
 * FINS: the board the fins are placed on — its length, its tail width at the 12" station, its tail
 * shape's name and, for the tails that have one, the tail block and its depth. The tail block is a
 * dim and the depth a mark, exactly as TEMPLATE's own sidebar reads them. A diamond prints the
 * clamped depth the drawing actually uses (the caller passes `effectiveDiamondDepth`), never the raw
 * stored one; a swallow prints its crotch depth. Pin and round have no tail block and no depth.
 */
export function finsImportedReadout(board: FinsImportedBoard, system: UnitsSystem): ImportedReadout {
  const { tail } = board;
  const items: ImportedReadoutItem[] = [
    { key: "length", label: "Length", value: formatLength(board.length, system) },
    { key: "tailWidth", label: `Tail @ ${stationLabel(system)}`, value: formatDim(board.tailWidth12, system) },
    { key: "tail", label: "Tail", value: TAIL_NAME[tail.kind] },
  ];
  if (tail.kind === "squash" || tail.kind === "diamond" || tail.kind === "swallow") {
    items.push({ key: "tailBlock", label: "Tail block", value: formatDim(tail.endWidth, system) });
  }
  if (tail.kind === "diamond") {
    items.push({ key: "depth", label: "Depth", value: formatMark(board.diamondDepth, system) });
  }
  if (tail.kind === "swallow") {
    items.push({ key: "depth", label: "Depth", value: formatMark(tail.crotchDepth, system) });
  }
  return { caption: FROM_TEMPLATE, items, foot: null };
}

/**
 * VOLUME: the board the litres are measured from — length and width (from TEMPLATE) and centre
 * thickness (from ROCKER's foil), all dims, so Metric reads them in centimetres to one decimal —
 * captioned with both screens, with a foot line saying the rail shapes come from RAILS.
 */
export function volumeImportedReadout(length: Mm, width: Mm, centre: Mm, system: UnitsSystem): ImportedReadout {
  return {
    caption: FROM_TEMPLATE_AND_ROCKER_AND_FOIL,
    items: [
      { key: "length", label: "Length", value: formatLength(length, system) },
      { key: "width", label: "Width", value: formatDim(width, system) },
      { key: "thickness", label: "Thickness", value: formatDim(centre, system) },
    ],
    foot: "Rail shapes from RAILS",
  };
}

/** How many columns a card draws its figures in. */
export type ImportedReadoutColumns = 1 | 2 | 3;

/**
 * How many columns a card's figures are designed to sit in: 2 for two, 3 for three, 2 x 2 for four,
 * and 3 then 2 for five (the rows wrap, so five in three columns is a row of three over a row of two).
 */
export function importedReadoutColumns(count: number): 2 | 3 {
  return count === 2 || count === 4 ? 2 : 3;
}

/**
 * How many columns a card can actually draw: the designed count when its figures fit side by side,
 * otherwise one fewer, down to a single column (fast task 178, 2026-10-18). In the narrowest computer
 * sidebar — an 820-dot window, where the card's list is 233 dots wide — VOLUME's three Metric figures
 * and their names (`182.9 cm`, `48.3 cm`, and THICKNESS under `6.4 cm`) need 243 dots in three
 * content-sized columns, so the third ran 10 dots into the card's padding; two columns, the third
 * figure under the first, fit. `overflowsAt(columns)` says whether the list overflows at that count —
 * the card measures that in the browser, this only decides — and is never asked about fewer than two.
 */
export function importedReadoutColumnsThatFit(
  designed: 2 | 3,
  overflowsAt: (columns: ImportedReadoutColumns) => boolean,
): ImportedReadoutColumns {
  let columns: ImportedReadoutColumns = designed;
  while (columns > 1 && overflowsAt(columns)) columns = columns === 3 ? 2 : 1;
  return columns;
}
