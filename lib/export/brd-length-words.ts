/**
 * A board's length in the shaper's own system, and the app's shortest and longest board in the same words (quick
 * 261114-118, the go-live review's WR-04). The home page needs these for the "that board is too long or too short" line
 * under the Open a board file… button, so they live apart from `brd-fit-preview.ts`, whose fitting library the home page
 * must not download until a `.brd` is picked. `brd-fit-preview.ts` re-exports `brdLengthWords` and uses `lengthWords`.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { formatDim } from "../geometry/measure-display";
import { formatFeetInches, inchesToMm, type Mm, type UnitsSystem } from "../geometry/units";

/** A length the way a size line writes it: feet and inches, or centimetres with their unit. */
export const lengthWords = (value: Mm, system: UnitsSystem): string => (system === "metric" ? formatDim(value, system) : formatFeetInches(value));

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
