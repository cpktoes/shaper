import { brdFile } from "@/lib/export/brd";
import { cncZip } from "@/lib/export/cnc-files";
import type { BoardSurface } from "@/lib/geometry/board-surface";

/**
 * Starts a download of `data` as `name`. Plain and synchronous on purpose, and called straight from the tap: Safari, an
 * iPhone's above all, refuses a download that starts after the tap has gone stale, so nothing is waited for and nothing is
 * fetched on demand before the link is clicked (research Pitfall 6). It is the board file's own hidden-link idiom
 * (`components/setup/board-file-download.ts`): the bytes in a Blob, a browser address for it, a hidden link that names the
 * file, clicked once and removed, the address let go a minute later because Safari needs it alive while the download starts.
 */
function download(name: string, data: Uint8Array, type: string): void {
  const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Export .brd File (quick 261110-tvk; the founder, 2026-11-10: "let's only export the .brd file for now"): the 3D
 * screen's one download — the board as an AkuShaper `.brd` file, built from the very surface the screen draws, so the
 * file can never describe a different board from the one on screen. The bare board only (D-16): it reads the surface and
 * the board's name and nothing else, so the Fins, Blank and Contour Stripes switches can never reach the file.
 *
 * It imports the writers in `lib/export` and never the scene, so the file is made in a browser that can't draw in 3D as
 * well ("the file doesn't need the drawing"). Any error is left to the caller, which says so on the status line.
 * `sliceCount` is the number of cross-sections the file carries beside the two empty ends.
 */
export function exportBrd(surface: BoardSurface, boardName: string): { fileName: string; sliceCount: number } {
  const file = brdFile(surface, boardName);
  download(file.name, file.data, "application/octet-stream");
  return { fileName: file.name, sliceCount: file.sectionCount };
}

/**
 * Export for CNC… (Phase 16, D-14, D-15 as amended by D-23, D-16): the board's DXF, STL and text set in one zip, built
 * from the same surface. The 3D screen's button no longer calls it (since 2026-11-10, the founder: only the .brd for now);
 * it is kept, with every writer behind it and their tests, for when the zip comes back.
 */
export function exportForCnc(surface: BoardSurface, boardName: string): { fileName: string; sliceCount: number } {
  const zip = cncZip(surface, boardName);
  download(zip.name, zip.data, "application/zip");
  return { fileName: zip.name, sliceCount: zip.sliceCount };
}
