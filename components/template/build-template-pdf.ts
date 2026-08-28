/**
 * The one module in this codebase that imports jsPDF.
 *
 * New project logic — draws the tile layout `lib/geometry/template.ts` computes onto an actual
 * PDF page. Computes nothing itself: every number here either comes from `TemplateLayout` /
 * `OutlineGeometry` or is a fixed drawing constant (line weights, the 2in scale square, dims-block
 * sizing). Constructed with jsPDF's own `unit: "mm"` mode and the caller's `PaperSize` as its page
 * format, so the geometry's own millimetres are drawn 1:1 with no second conversion layer — the
 * physical scale a shaper measures with a ruler IS the millimetre value this module writes into
 * the PDF content stream (T-03-01).
 */

import jsPDF from "jspdf";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import {
  PAPER_MM,
  type PaperSize,
  type TemplateLayout,
  type TemplateMarks,
  type TemplatePage,
} from "@/lib/geometry/template";
import { formatFeetInches, formatInchesFraction, inchesToMm, type Mm } from "@/lib/geometry/units";

/** Every input `buildTemplatePdf` needs, fixed complete now, so later plans (the preview dialog,
 * working match marks) extend the drawing without touching a call site. */
export interface BuildTemplatePdfOptions {
  layout: TemplateLayout;
  /** Computed alongside `layout` for every caller (`computeTemplateMarks`) — not yet drawn onto
   * the page by this plan; wired through so the drawing gains match marks later without a
   * call-site change. */
  marks: TemplateMarks;
  geometry: OutlineGeometry;
  paper: PaperSize;
  boardName: string;
  dims: {
    length: Mm;
    widePointWidth: Mm;
    centerThickness: Mm;
  };
}

/** Exactly 2in x 2in (D-07) — the printed scale check the whole export rests on. Derived through
 * `inchesToMm`, never a bare millimetre literal, per CLAUDE.md Rule 2. */
const SCALE_SQUARE_MM = inchesToMm(2);
const OUTLINE_LINE_WEIGHT_MM = 0.5;
const STRINGER_LINE_WEIGHT_MM = 0.35;
const STRINGER_DASH_PATTERN = [16, 4, 4, 4];
const SCALE_SQUARE_LINE_WEIGHT_MM = 0.35;
const NAME_BOX_LINE_WEIGHT_MM = 0.25;
const NAME_BOX_WIDTH_MM = 45;
const NAME_BOX_HEIGHT_MM = 20;
const NAME_BOX_PADDING_MM = 3;
const NAME_BOX_CLEARANCE_MM = 4;

/** Converts a page-local station to a page-local y (mm from the page's top edge): the page's own
 * nose-most edge (`stationRange[1]`) sits at the top, and y grows toward the tail — matching how
 * the pages tape together top-to-bottom, nose to tail. */
function stationToY(station: number, page: TemplatePage, margin: number): number {
  return margin + (page.stationRange[1] - station);
}

/** Converts a page-local half-width to a page-local x (mm from the page's left edge): the
 * stringer (half-width 0) sits at column 0's own left edge, and x grows outward, matching the
 * column reading order. */
function halfWidthToX(halfWidth: number, page: TemplatePage, margin: number): number {
  return margin + (halfWidth - page.halfWidthRange[0]);
}

/** The run of sampled outline points that cover this page, plus the one sample immediately
 * outside each end of its `stationRange` — so the drawn curve reaches the page edge rather than
 * stopping a fraction of a millimetre short of it (points are ordered by ascending station). */
function pointsForPage(points: OutlineGeometry["points"], page: TemplatePage): OutlineGeometry["points"] {
  const [start, end] = page.stationRange;
  let firstIndex = points.findIndex((point) => point.station >= start);
  if (firstIndex === -1) firstIndex = points.length - 1;
  if (firstIndex > 0) firstIndex -= 1;

  let lastIndex = points.length - 1;
  for (let i = firstIndex; i < points.length; i++) {
    if (points[i].station > end) {
      lastIndex = i;
      break;
    }
  }
  return points.slice(firstIndex, lastIndex + 1);
}

function drawOutlineCurve(doc: jsPDF, geometry: OutlineGeometry, page: TemplatePage, margin: number): void {
  const pagePoints = pointsForPage(geometry.points, page);
  if (pagePoints.length < 2) return;
  doc.setDrawColor(0);
  doc.setLineWidth(OUTLINE_LINE_WEIGHT_MM);
  for (let i = 0; i < pagePoints.length - 1; i++) {
    const a = pagePoints[i];
    const b = pagePoints[i + 1];
    doc.line(
      halfWidthToX(a.halfWidth, page, margin),
      stationToY(a.station, page, margin),
      halfWidthToX(b.halfWidth, page, margin),
      stationToY(b.station, page, margin),
    );
  }
}

/** The straight stringer edge — D-05's half/spin-template spine. Only column 0 touches the
 * stringer (half-width 0), so only those pages draw it. */
function drawStringerEdge(doc: jsPDF, page: TemplatePage, margin: number): void {
  if (page.col !== 0) return;
  const x = halfWidthToX(0, page, margin);
  const yTop = stationToY(page.stationRange[1], page, margin);
  const yBottom = stationToY(page.stationRange[0], page, margin);
  doc.setDrawColor(0);
  doc.setLineWidth(STRINGER_LINE_WEIGHT_MM);
  doc.setLineDashPattern(STRINGER_DASH_PATTERN, 0);
  doc.line(x, yTop, x, yBottom);
  doc.setLineDashPattern([], 0);
}

/** D-07's 2in x 2in scale-check square — nose page only, in the top-outward corner the curve
 * never reaches (near the nose tip the outline hugs the stringer, so that corner is always
 * clear). */
function drawScaleSquare(doc: jsPDF, page: TemplatePage, margin: number, paperWidthMm: number): void {
  if (page.index !== 0) return;
  const x = paperWidthMm - margin - SCALE_SQUARE_MM;
  const y = margin;
  doc.setDrawColor(0);
  doc.setLineWidth(SCALE_SQUARE_LINE_WEIGHT_MM);
  doc.rect(x, y, SCALE_SQUARE_MM, SCALE_SQUARE_MM, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text('2" x 2" — measure before taping', x + SCALE_SQUARE_MM / 2, y + SCALE_SQUARE_MM + 5, { align: "center" });
}

function drawPageLabel(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  paperWidthMm: number,
  paperHeightMm: number,
): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(page.label, paperWidthMm / 2, paperHeightMm - margin / 2, { align: "center" });
}

/** The page whose `stationRange` contains the board's centre station — the D-08 name/dims block
 * lands there, restricted to column 0 so it always has stringer-side room clear of the curve. */
function findCentrePage(layout: TemplateLayout, geometry: OutlineGeometry): TemplatePage {
  const centre = geometry.length / 2;
  const match = layout.pages.find(
    (page) => page.col === 0 && centre >= page.stationRange[0] && centre <= page.stationRange[1],
  );
  return match ?? layout.pages[0];
}

/** D-08's board name + dims block: a bordered box in the board's own interior (between the
 * stringer edge and the outline curve), never in a page margin. */
function drawNameBlock(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  geometry: OutlineGeometry,
  boardName: string,
  dims: BuildTemplatePdfOptions["dims"],
): void {
  const displayName = boardName.trim().length > 0 ? boardName : "Untitled Board";
  const centreStation = Math.min(Math.max(geometry.length / 2, page.stationRange[0]), page.stationRange[1]);
  const x = halfWidthToX(0, page, margin) + NAME_BOX_CLEARANCE_MM;
  const y = stationToY(centreStation, page, margin) - NAME_BOX_HEIGHT_MM / 2;

  doc.setDrawColor(0);
  doc.setLineWidth(NAME_BOX_LINE_WEIGHT_MM);
  doc.rect(x, y, NAME_BOX_WIDTH_MM, NAME_BOX_HEIGHT_MM, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(displayName, x + NAME_BOX_PADDING_MM, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dimsLine = `${formatFeetInches(dims.length)} · ${formatInchesFraction(dims.widePointWidth)} · ${formatInchesFraction(dims.centerThickness)}`;
  doc.text(dimsLine, x + NAME_BOX_PADDING_MM, y + 16);
}

/** Builds the multi-page jsPDF document for one `TemplateLayout`. Iterates data handed to it —
 * every number drawn here comes from `layout`, `geometry` or a fixed drawing constant above;
 * nothing in this function computes tile geometry. */
export function buildTemplatePdf(options: BuildTemplatePdfOptions): jsPDF {
  const { layout, geometry, paper, boardName, dims } = options;
  const paperDims = PAPER_MM[paper];
  const margin = layout.margin;

  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "portrait" });
  doc.setDrawColor(0);
  doc.setTextColor(0);

  const centrePage = findCentrePage(layout, geometry);

  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper, "portrait");

    drawOutlineCurve(doc, geometry, page, margin);
    drawStringerEdge(doc, page, margin);
    drawScaleSquare(doc, page, margin, paperDims.width);
    drawPageLabel(doc, page, margin, paperDims.width, paperDims.height);
    if (page.index === centrePage.index) {
      drawNameBlock(doc, page, margin, geometry, boardName, dims);
    }
  });

  return doc;
}

/** Slugifies a board name into a safe file-name fragment (alphanumerics and hyphens only) — a
 * name containing a path separator or other punctuation can never shape the download path
 * (T-03-02). Falls back to a fixed name when the input is empty or slugifies to nothing. */
export function templateFileName(boardName: string): string {
  const slug = boardName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? `${slug}-template.pdf` : "board-template.pdf";
}

/** Builds the document then saves it under the browser's normal download flow — the one call
 * site every consumer (this plan's toolbar button, plan 04's preview dialog) uses. */
export function downloadTemplatePdf(options: BuildTemplatePdfOptions): void {
  const doc = buildTemplatePdf(options);
  doc.save(templateFileName(options.boardName));
}
