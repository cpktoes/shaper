/**
 * FINS' INPUTS line (quick 261017-vdh, BRIEF 4a): while "Import Designed Board" is ticked, one line
 * lists the board the fins are placed on — its length, its tail width at the 12" station, its tail
 * shape and, for the tails that have one, the tail block and its depth — in place of the three
 * controls it hides (Board Length, Tail Width @ 12", Tail Shape).
 *
 * Each figure carries its own unit (the parts are separated by ` · `, not run together). The tail block
 * is a dim and the depth a mark, exactly as TEMPLATE's own sidebar reads them: Metric `10.2 cm tail
 * block`, `38 mm deep`. The station is `stationLabel`, `12"` or `30.5 cm`. A diamond prints the
 * clamped depth the drawing actually uses (the caller passes `effectiveDiamondDepth`), never the raw
 * stored one; a swallow prints its crotch depth. Pin and round have no tail block.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { TailShape } from "./board";
import { formatDim, formatLength, formatMark, stationLabel } from "./measure-display";
import type { Mm, UnitsSystem } from "./units";

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

/**
 * `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail · 4" tail block`
 * Metric: `TEMPLATE details are imported: 182.9 cm · 37.5 cm tail @ 30.5 cm · Squash tail · 10.2 cm tail block`
 */
export function finsImportedLine(board: FinsImportedBoard, system: UnitsSystem): string {
  const { tail } = board;
  const parts = [
    formatLength(board.length, system),
    `${formatDim(board.tailWidth12, system)} tail @ ${stationLabel(system)}`,
    `${TAIL_NAME[tail.kind]} tail`,
  ];
  if (tail.kind === "squash" || tail.kind === "diamond" || tail.kind === "swallow") {
    parts.push(`${formatDim(tail.endWidth, system)} tail block`);
  }
  if (tail.kind === "diamond") parts.push(`${formatMark(board.diamondDepth, system)} deep`);
  if (tail.kind === "swallow") parts.push(`${formatMark(tail.crotchDepth, system)} deep`);
  return `TEMPLATE details are imported: ${parts.join(" · ")}`;
}
