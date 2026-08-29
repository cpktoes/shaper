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
