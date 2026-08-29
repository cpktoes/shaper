/**
 * Overview-sheet outline scaling.
 *
 * New project logic, not a port — the prototype's own "Print Specs" popup
 * (`reference/project/Template.dc.html`'s `onPrintSpecs`) computes its scale inline against a
 * fixed pixel budget; this is the same idea (fit the whole outline, both rails, nose to tail,
 * inside one page) ported as a pure function so it is testable independently of jsPDF, the same
 * separation `lib/geometry/template.ts` already keeps between its own tile-layout math and
 * `components/template/build-template-pdf.ts`'s drawing calls (CLAUDE.md Rule 1).
 *
 * The overview sheet is deliberately NOT drawn 1:1 like the tiled template — it is a
 * recreate-this-board reference, not a cutting template, so the whole board has to fit one page.
 */

import type { OutlineGeometry } from "./outline";

/**
 * The largest uniform scale factor (page millimetres per board millimetre) that fits the full
 * outline — both rails (`2 * halfWidePointWidth`, the widest point by definition) and the full
 * nose-to-tail length — inside a `drawWidthMm` x `drawHeightMm` box, without distorting the
 * shape. Always the smaller of the two per-axis bounds: a board scaled independently in X and Y
 * would draw a shape that no longer matches what the outline screen shows, and the whole point of
 * this sheet is a shaper being able to trust the drawing as the board.
 */
export function computeOverviewOutlineScale(
  geometry: OutlineGeometry,
  drawWidthMm: number,
  drawHeightMm: number,
): number {
  const boardWidthMm = geometry.halfWidePointWidth * 2;
  const widthScale = drawWidthMm / boardWidthMm;
  const heightScale = drawHeightMm / geometry.length;
  return Math.min(widthScale, heightScale);
}

/** The outline's own drawing region on the Overview Sheet — the page's own real estate left over
 * once the spec column, the gap after it, and the station-line label reserves either side of the
 * drawing are subtracted (round 3 post-checkpoint fix, defect 4: "the board can be larger on the
 * page" — the spec list is short, 11 lines, so it does not need anywhere near the width it was
 * previously given, and the drawing was left with barely a fifth of the page as a result). Pure
 * millimetre arithmetic, kept here rather than inline in the drawing module (CLAUDE.md Rule 1) so
 * the box the outline scales into is independently testable, the same separation
 * `computeOverviewOutlineScale` itself already keeps from `build-overview-pdf.ts`'s jsPDF calls.
 */
export interface OverviewDrawingBox {
  /** Left edge of the region actually reserved for the outline curve, in page mm (after the spec
   * column, its gap, and the left-side dimension-label reserve). */
  x0: number;
  /** Width of the region actually reserved for the outline curve itself (both label reserves
   * already subtracted) — the value `computeOverviewOutlineScale`'s own `drawWidthMm` takes. */
  width: number;
  /** Height of the region actually reserved for the outline curve itself, from the drawing's own
   * top (below the title/board-name/length-label block) down to the bottom margin — the value
   * `computeOverviewOutlineScale`'s own `drawHeightMm` takes. */
  height: number;
}

export function computeOverviewDrawingBox(
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm: number,
  specColumnWidthMm: number,
  columnGapMm: number,
  drawingTopMm: number,
  labelReserveLeftMm: number,
  labelReserveRightMm: number,
): OverviewDrawingBox {
  const columnX0 = marginMm + specColumnWidthMm + columnGapMm;
  const columnWidth = paperWidthMm - marginMm - columnX0;
  return {
    x0: columnX0 + labelReserveLeftMm,
    width: Math.max(0, columnWidth - labelReserveLeftMm - labelReserveRightMm),
    height: Math.max(0, paperHeightMm - marginMm - drawingTopMm),
  };
}
