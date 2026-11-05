import { cncZip } from "@/lib/export/cnc-files";
import type { BoardSurface } from "@/lib/geometry/board-surface";

/**
 * Export for CNC… (Phase 16, D-14, D-15 as amended by D-23, D-16): the 3D screen's one download — the board's DXF,
 * STL and text set in one zip, built from the very surface the screen draws, so the files can never describe a
 * different board from the one on screen. The bare board only (D-16): it reads the surface and the board's name and
 * nothing else, so the Fins, Blank and Contour Stripes switches can never reach the files.
 *
 * Plain and synchronous on purpose, and called straight from the tap: Safari, an iPhone's above all, refuses a
 * download that starts after the tap has gone stale, so nothing is waited for and nothing is fetched on demand
 * before the link is clicked (research Pitfall 6). The download is the board file's own hidden-link idiom
 * (`components/setup/board-file-download.ts`): the bytes in a Blob, a browser address for it, a hidden link that
 * names the file, clicked once and removed, the address let go a minute later because Safari needs it alive while
 * the download starts.
 *
 * It imports the writers in `lib/export` and never the scene, so the files are made in a browser that can't draw in
 * 3D as well ("the files don't need the drawing"). Any error is left to the caller, which says so on the status line.
 */
export function exportForCnc(surface: BoardSurface, boardName: string): { fileName: string; sliceCount: number } {
  const zip = cncZip(surface, boardName);
  const blob = new Blob([zip.data as Uint8Array<ArrayBuffer>], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zip.name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { fileName: zip.name, sliceCount: zip.sliceCount };
}
