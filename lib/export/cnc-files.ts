/**
 * The CNC files for one board (Phase 16, D-14, D-16, D-24, D-26), from the surface the 3D screen draws
 * (`buildBoardSurface`, 16-03): one zip a shaper downloads and gives to Shape3D. The bare board only —
 * the shaped foam, never the fins or the blank (D-16) — in millimetres, in Shape3D's axes: x along the
 * board toward the nose with the tail at x = 0, y across, z up toward the deck, z = 0 at the lowest point
 * of the bottom. The surface already carries those axes and units, so nothing here converts a number.
 *
 * Every file is named from the board's name through `boardFileStem`, the same stem Save board as file…
 * uses, so the two downloads can never name a board differently; and every entry is that stem plus a fixed
 * suffix, so no entry can name a folder or climb out of one (T-16-10).
 *
 * Nothing here knows about WebGL, the screen or the browser: the files are pure functions of the surface.
 */
import { boardSlices, type BoardSurface } from "../geometry/board-surface";
import { boardFileStem } from "../models/board-file";
import { stlHeader, writeStl } from "./stl";
import { writeZip } from "./zip";

/** One file of the export: its name inside the zip and its bytes. */
export interface CncFile {
  name: string;
  data: Uint8Array;
}

/**
 * The export's files for one board's surface, and how many slices they carry (the number the 3D screen's
 * done line quotes — from here, never typed).
 */
export function cncFiles(surface: BoardSurface, boardName: string): { files: CncFile[]; sliceCount: number } {
  const stem = boardFileStem(boardName);
  const files: CncFile[] = [
    { name: `${stem}.stl`, data: writeStl(surface.positions, surface.indices, stlHeader(stem)) },
  ];
  return { files, sliceCount: boardSlices(surface).length };
}

/** The export as its one download: `{stem}-3d.zip`, store-only, the same board always the same bytes. */
export function cncZip(surface: BoardSurface, boardName: string): { name: string; data: Uint8Array; sliceCount: number } {
  const { files, sliceCount } = cncFiles(surface, boardName);
  return { name: `${boardFileStem(boardName)}-3d.zip`, data: writeZip(files), sliceCount };
}
