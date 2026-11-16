/**
 * The two small facts about a `.brd` that the home page's Open a board file… button needs BEFORE any file is picked:
 * how big a file may be and whether a name says it is one (quick 261114-118, the go-live
 * review's WR-04). They live apart from `brd-read.ts` on purpose: that reader pulls in the preview and the fitting
 * library, and the home page must not download those for everybody, only for a shaper who picks a `.brd`.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */

/** The most bytes a `.brd` may be before it is not read at all. */
export const BRD_READ_MAX_BYTES = 2 * 1024 * 1024;

/** Whether a picked file's name says it is a `.brd`. */
export function isBrdFileName(name: string): boolean {
  return /\.brd$/i.test(name);
}
