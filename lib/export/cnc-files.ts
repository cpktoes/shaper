/**
 * The CNC files for one board (Phase 16, D-14, D-16, D-24, D-26), from the surface the 3D screen draws
 * (`buildBoardSurface`, 16-03): one zip a shaper downloads and gives to Shape3D. The bare board only —
 * the shaped foam, never the fins or the blank (D-16) — in millimetres, in Shape3D's axes: x along the
 * board toward the nose with the tail at x = 0, y across, z up toward the deck, z = 0 at the lowest point
 * of the bottom. The surface already carries those axes and units, so nothing here converts a number.
 *
 * Three forms of the same board (D-14), in this order inside the zip:
 * - `{stem}.dxf` — the wireframe: the outline (layer OUTLINE, closed), the stringer's deck and bottom lines
 *   (PROFILE-DECK, PROFILE-BOTTOM, open, tail to nose) and every slice (SLICES, each loop closed — two loops
 *   for a slice inside a swallow's notch);
 * - `{stem}.stl` — the very triangles the screen draws;
 * - the text set: `{stem}-outline.txt`, `{stem}-profile.txt` (the deck line, one blank line, the bottom
 *   line) and one `{stem}-slice-NN.txt` per slice, counted from the tail (D-24: the litres' own stations with
 *   foam; `NN` two digits, three only past 99).
 * Every curve is read off the drawn mesh (`boardSlices`, `boardOutlineLoop`, `boardProfileLines`), so a file
 * can never describe a different board from the one on screen.
 *
 * Every file is named from the board's name through `boardFileStem`, the same stem Save board as file…
 * uses, so the two downloads can never name a board differently; and every entry is that stem plus a fixed
 * suffix, so no entry can name a folder or climb out of one (T-16-10).
 *
 * Nothing here knows about WebGL, the screen or the browser: the files are pure functions of the surface.
 */
import { boardOutlineLoop, boardProfileLines, boardSlices, type BoardSurface } from "../geometry/board-surface";
import { boardFileStem } from "../models/board-file";
import { writeDxf, type DxfPolyline } from "./dxf";
import { stlHeader, writeStl } from "./stl";
import { writeXyz } from "./xyz";
import { writeZip } from "./zip";

/** One file of the export: its name inside the zip and its bytes. */
export interface CncFile {
  name: string;
  data: Uint8Array;
}

/** The DXF's layers, one per family of curve. */
export const CNC_LAYERS = {
  outline: "OUTLINE",
  deck: "PROFILE-DECK",
  bottom: "PROFILE-BOTTOM",
  slices: "SLICES",
} as const;

/**
 * Slice `index` (0 nearest the tail) of `count`, as its file is named: `{stem}-slice-01.txt` and on, two
 * digits — three for every slice once a board has more than 99.
 */
export function sliceFileName(stem: string, index: number, count: number): string {
  return `${stem}-slice-${String(index + 1).padStart(count > 99 ? 3 : 2, "0")}.txt`;
}

/**
 * The export's files for one board's surface, and how many slices they carry (the number the 3D screen's
 * done line quotes — from here, never typed).
 */
export function cncFiles(surface: BoardSurface, boardName: string): { files: CncFile[]; sliceCount: number } {
  const stem = boardFileStem(boardName);
  const outline = boardOutlineLoop(surface);
  const profile = boardProfileLines(surface);
  const slices = boardSlices(surface);
  const encoder = new TextEncoder();

  const polylines: DxfPolyline[] = [
    { layer: CNC_LAYERS.outline, points: outline, closed: true },
    { layer: CNC_LAYERS.deck, points: profile.deck, closed: false },
    { layer: CNC_LAYERS.bottom, points: profile.bottom, closed: false },
    ...slices.flatMap((slice) => slice.loops.map((loop) => ({ layer: CNC_LAYERS.slices, points: loop, closed: true }))),
  ];

  const files: CncFile[] = [
    { name: `${stem}.dxf`, data: encoder.encode(writeDxf(polylines)) },
    { name: `${stem}.stl`, data: writeStl(surface.positions, surface.indices, stlHeader(stem)) },
    { name: `${stem}-outline.txt`, data: encoder.encode(writeXyz([outline])) },
    { name: `${stem}-profile.txt`, data: encoder.encode(writeXyz([profile.deck, profile.bottom])) },
    ...slices.map((slice, i) => ({
      name: sliceFileName(stem, i, slices.length),
      data: encoder.encode(writeXyz(slice.loops)),
    })),
  ];
  return { files, sliceCount: slices.length };
}

/** The export as its one download: `{stem}-3d.zip`, store-only, the same board always the same bytes. */
export function cncZip(surface: BoardSurface, boardName: string): { name: string; data: Uint8Array; sliceCount: number } {
  const { files, sliceCount } = cncFiles(surface, boardName);
  return { name: `${boardFileStem(boardName)}-3d.zip`, data: writeZip(files), sliceCount };
}
