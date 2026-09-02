/**
 * The Paper Saver strip — the second jsPDF drawing module in this codebase, alongside
 * `build-template-pdf.ts`. Draws the strip layout `lib/geometry/template.ts`'s
 * `computeStripLayout` and its siblings already compute onto an actual multi-page PDF. Computes
 * nothing itself: every number here either comes from `StripLayout` / `StripRegistrationLine` /
 * `StripMarkSegment` / `StripLabelRow` / `StripPageZeroFurniture` or is a fixed drawing constant
 * (line weights, dash patterns, the 2in scale square, the name/dims box sizing) — no page
 * arithmetic happens in this file.
 *
 * What makes this drawing module different from the tiled template's is that every page carries
 * its OWN sideways slide (`page.halfWidthRange[0]`, computed in `lib/geometry/template.ts`) rather
 * than a fixed column start, which is what lets a single landscape column follow the curve across
 * the whole board instead of tiling it across a two-column grid.
 */

import jsPDF from "jspdf";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import {
  NAME_BOX_WIDTH_MM,
  type PaperSize,
  type StripFurniturePlacement,
  type StripLabelRow,
  type StripLayout,
  type StripMarkSegment,
  type StripPage,
  type StripRegistrationLine,
  type TemplateMarks,
  stripLabelRows,
  stripMarkSegments,
  stripPageZeroFurniture,
  stripRegistrationLines,
} from "@/lib/geometry/template";
import { inchesToMm } from "@/lib/geometry/units";
import {
  nameBlockContent,
  rectContains,
  rectsOverlap,
  templateNameBlockText,
  type BuildTemplatePdfOptions,
  type TemplateFurnitureRect,
} from "@/components/template/build-template-pdf";

/** Every input `buildStripPdf` needs, fixed complete now — `dims` is the SAME seven-value shape
 * `BuildTemplatePdfOptions.dims` carries, so the export dialog builds one object and hands it to
 * whichever branch the shaper picked, never two copies that could drift apart. */
export interface BuildStripPdfOptions {
  layout: StripLayout;
  marks: TemplateMarks;
  geometry: OutlineGeometry;
  paper: PaperSize;
  boardName: string;
  dims: BuildTemplatePdfOptions["dims"];
}

const OUTLINE_LINE_WEIGHT_MM = 0.5;
const STRINGER_LINE_WEIGHT_MM = 0.35;
const STRINGER_DASH_PATTERN = [16, 4, 4, 4];
const REGISTRATION_LINE_WEIGHT_MM = 0.25;

/** The five working marks' own tick weight and dash grammar — identical to the tiled template's
 * own `MARK_TICK_LINE_WEIGHT_MM`/dash constants, declared fresh here rather than imported since
 * `build-template-pdf.ts` doesn't export them (CLAUDE.md Rule 1: the strip performs no page
 * arithmetic of its own, but a drawing constant is not page arithmetic — it's still allowed to
 * duplicate a fixed number rather than reach into a sibling file for it). */
const MARK_TICK_LINE_WEIGHT_MM = 0.25;
const MARK_STATION_DASH_PATTERN = [5, 4];
const MARK_WIDEPOINT_DASH_PATTERN = [2, 3];
const MARK_TAILBLOCK_LINE_WEIGHT_MM = OUTLINE_LINE_WEIGHT_MM;

/** Exactly 2in x 2in (locked decision) — the printed scale check page 1 rests on, declared here
 * rather than importing `build-template-pdf.ts`'s own (unexported) constant of the same value —
 * the same call `overviewFileName` already makes for its own file-naming sibling. */
const SCALE_SQUARE_MM = inchesToMm(2);
const SCALE_SQUARE_LINE_WEIGHT_MM = 0.35;
const SCALE_SQUARE_CAPTION_GAP_MM = 5;
const SCALE_SQUARE_CAPTION_HEIGHT_MM = 3;
const SCALE_SQUARE_CAPTION_TEXT = '2" x 2" — measure before taping';
/** Gap kept between the scale square's own caption and the name block beneath it. */
const FURNITURE_GAP_MM = 6;

const NAME_BOX_LINE_WEIGHT_MM = 0.25;
const NAME_BOX_PADDING_MM = 3;
const NAME_TEXT_WIDTH_LIMIT_MM = NAME_BOX_WIDTH_MM - 2 * NAME_BOX_PADDING_MM;
const NAME_FONT_SIZE_PT = 14;
const NAME_BOX_NAME_LINE_HEIGHT_MM = 8;
const NAME_BOX_DIMS_TOP_GAP_MM = 2;
const NAME_BOX_DIMS_FONT_SIZE_PT = 8;
const NAME_BOX_DIMS_LINE_HEIGHT_MM = 4.2;

/** The fixed column, from the printable left edge, the big page numeral owns — every label row
 * starts to the right of it, so a numeral can never sit under a label (locked decision: page
 * furniture). */
export const STRIP_PAGE_NUMBER_COLUMN_MM = 22;
const STRIP_PAGE_NUMBER_FONT_SIZE_PT = 36;
const STRIP_LABEL_FONT_SIZE_PT = 9;

/** Converts a page-local station to a page-local y (mm from the page's top edge): the page's own
 * nose-most edge (`stationRange[1]`) sits at the top, and y grows toward the tail — mirrors
 * `build-template-pdf.ts`'s own (unexported) `stationToY`, re-declared here since the strip's
 * pages are landscape, not portrait, but the mapping itself is identical. */
function stationToY(station: number, page: StripPage, margin: number): number {
  return margin + (page.stationRange[1] - station);
}

/** Converts a page-local half-width to a page-local x (mm from the page's left edge): a page's own
 * slid `halfWidthRange[0]` sits at the left printable edge, and x grows outward. */
function halfWidthToX(halfWidth: number, page: StripPage, margin: number): number {
  return margin + (halfWidth - page.halfWidthRange[0]);
}

/** The run of sampled outline points that cover this page, plus the one sample immediately
 * outside each end of its `stationRange` — mirrors `build-template-pdf.ts`'s own `pointsForPage`,
 * so the curve reaches the page's own edge rather than stopping a fraction short of it. */
function pointsForPage(points: OutlineGeometry["points"], page: StripPage): OutlineGeometry["points"] {
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

function drawOutlineCurve(doc: jsPDF, geometry: OutlineGeometry, page: StripPage, margin: number): void {
  const pagePoints = pointsForPage(geometry.points, page);
  if (pagePoints.length < 2) return;
  doc.setDrawColor(0);
  doc.setLineWidth(OUTLINE_LINE_WEIGHT_MM);
  doc.setLineDashPattern([], 0);
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

/** The dashed stringer centreline — drawn only on the pages whose own slid window reaches the
 * stringer (`page.stringerOnPage`), which is the nose page and the tail pages on a real board,
 * exactly matching the founder's reference. */
function drawStringer(doc: jsPDF, page: StripPage, margin: number): void {
  if (!page.stringerOnPage) return;
  const x = halfWidthToX(0, page, margin);
  const yTop = stationToY(page.stationRange[1], page, margin);
  const yBottom = stationToY(page.stationRange[0], page, margin);
  doc.setDrawColor(0);
  doc.setLineWidth(STRINGER_LINE_WEIGHT_MM);
  doc.setLineDashPattern(STRINGER_DASH_PATTERN, 0);
  doc.line(x, yTop, x, yBottom);
  doc.setLineDashPattern([], 0);
}

/** The two registration lines a page carries, solid across its own full printable half-width —
 * `stripRegistrationLines` already decided which pages get which lines and at what station, so
 * this only converts board space into page-local mm. */
function drawRegistrationLines(
  doc: jsPDF,
  page: StripPage,
  margin: number,
  lines: StripRegistrationLine[],
): void {
  const pageLines = lines.filter((line) => line.pageIndex === page.index);
  if (pageLines.length === 0) return;

  const xStart = halfWidthToX(page.halfWidthRange[0], page, margin);
  const xEnd = halfWidthToX(page.halfWidthRange[1], page, margin);

  doc.setDrawColor(0);
  doc.setLineWidth(REGISTRATION_LINE_WEIGHT_MM);
  doc.setLineDashPattern([], 0);
  for (const line of pageLines) {
    const y = stationToY(line.station, page, margin);
    doc.line(xStart, y, xEnd, y);
  }
}

/** The working-mark ticks on this page, in the tiled template's own grammar — widepoint dotted,
 * every other station mark dashed, the tail block solid at the outline's own weight. */
function drawMarkTicks(doc: jsPDF, page: StripPage, margin: number, segments: StripMarkSegment[]): void {
  const pageSegments = segments.filter((segment) => segment.pageIndex === page.index);
  if (pageSegments.length === 0) return;

  doc.setDrawColor(0);
  for (const segment of pageSegments) {
    const y = stationToY(segment.station, page, margin);
    const xStart = halfWidthToX(segment.halfWidthRange[0], page, margin);
    const xEnd = halfWidthToX(segment.halfWidthRange[1], page, margin);

    if (segment.mark === "tailBlock") {
      doc.setLineWidth(MARK_TAILBLOCK_LINE_WEIGHT_MM);
      doc.setLineDashPattern([], 0);
    } else if (segment.mark === "widepoint") {
      doc.setLineWidth(MARK_TICK_LINE_WEIGHT_MM);
      doc.setLineDashPattern(MARK_WIDEPOINT_DASH_PATTERN, 0);
    } else {
      doc.setLineWidth(MARK_TICK_LINE_WEIGHT_MM);
      doc.setLineDashPattern(MARK_STATION_DASH_PATTERN, 0);
    }
    doc.line(xStart, y, xEnd, y);
    doc.setLineDashPattern([], 0);
  }
}

/** Every printed text row on this page — registration labels and mark labels alike, at their own
 * final baseline station (`stripLabelRows` already de-collided them), left-aligned to the right of
 * the page-numeral column so a numeral can never sit under a label. */
function drawLabelRows(doc: jsPDF, page: StripPage, margin: number, rows: StripLabelRow[]): void {
  const pageRows = rows.filter((row) => row.pageIndex === page.index);
  if (pageRows.length === 0) return;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(STRIP_LABEL_FONT_SIZE_PT);
  doc.setTextColor(0);
  const x = margin + STRIP_PAGE_NUMBER_COLUMN_MM;
  for (const row of pageRows) {
    const y = stationToY(row.baselineStation, page, margin);
    doc.text(row.text, x, y);
  }
}

/** The big page numeral — the reference's own idiom, a large number rather than a caption —
 * vertically centred in the page's own registration band, left-aligned at the printable edge. */
function drawPageNumber(doc: jsPDF, page: StripPage, margin: number): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(STRIP_PAGE_NUMBER_FONT_SIZE_PT);
  doc.setTextColor(0);
  const y = stationToY(page.pageNumberStation, page, margin);
  doc.text(page.pageNumber, margin, y, { baseline: "middle" });
}

function drawScaleSquare(doc: jsPDF, page: StripPage, margin: number, placement: StripFurniturePlacement): void {
  const x = halfWidthToX(placement.halfWidthStart, page, margin);
  const y = stationToY(placement.topStation, page, margin);

  doc.setDrawColor(0);
  doc.setLineWidth(SCALE_SQUARE_LINE_WEIGHT_MM);
  doc.rect(x, y, SCALE_SQUARE_MM, SCALE_SQUARE_MM, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(SCALE_SQUARE_CAPTION_TEXT, x + SCALE_SQUARE_MM / 2, y + SCALE_SQUARE_MM + SCALE_SQUARE_CAPTION_GAP_MM, {
    align: "center",
  });
}

function drawNameBlock(
  doc: jsPDF,
  page: StripPage,
  margin: number,
  placement: StripFurniturePlacement,
  boardName: string,
  dims: BuildStripPdfOptions["dims"],
): void {
  const { dimsLines, height } = nameBlockContent(doc, dims);
  const x = halfWidthToX(placement.halfWidthStart, page, margin);
  const y = stationToY(placement.topStation, page, margin);

  doc.setDrawColor(0);
  doc.setLineWidth(NAME_BOX_LINE_WEIGHT_MM);
  doc.rect(x, y, NAME_BOX_WIDTH_MM, height, "S");

  const displayName = templateNameBlockText(boardName, NAME_TEXT_WIDTH_LIMIT_MM, doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(NAME_FONT_SIZE_PT);
  doc.setTextColor(0);
  doc.text(displayName, x + NAME_BOX_PADDING_MM, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(NAME_BOX_DIMS_FONT_SIZE_PT);
  dimsLines.forEach((line, i) => {
    doc.text(
      line,
      x + NAME_BOX_PADDING_MM,
      y + NAME_BOX_NAME_LINE_HEIGHT_MM + NAME_BOX_DIMS_TOP_GAP_MM + (i + 1) * NAME_BOX_DIMS_LINE_HEIGHT_MM,
    );
  });
}

/** Page 0's own furniture placements, in board station/half-width space — computed once so
 * `buildStripPdf` and `stripPageZeroFurnitureRects` (the pure-test half of "furniture stays inside
 * the page and never overlaps") always agree on exactly the same boxes. */
function computePageZeroFurniture(
  doc: jsPDF,
  layout: StripLayout,
  dims: BuildStripPdfOptions["dims"],
): { scaleSquare: StripFurniturePlacement; nameBlock: StripFurniturePlacement; nameBoxHeight: number } {
  const { height: nameBoxHeight } = nameBlockContent(doc, dims);
  const furniture = stripPageZeroFurniture(layout, {
    scaleSquareMm: SCALE_SQUARE_MM,
    scaleCaptionMm: SCALE_SQUARE_CAPTION_GAP_MM + SCALE_SQUARE_CAPTION_HEIGHT_MM,
    nameBoxWidthMm: NAME_BOX_WIDTH_MM,
    nameBoxHeightMm: nameBoxHeight,
    gapMm: FURNITURE_GAP_MM,
  });
  return { scaleSquare: furniture.scaleSquare, nameBlock: furniture.nameBlock, nameBoxHeight };
}

/** Builds the multi-page jsPDF document for one `StripLayout` — a landscape page per station band,
 * each one slid sideways onto the curve. Iterates data handed to it; nothing in this function
 * computes strip geometry of its own. */
export function buildStripPdf(options: BuildStripPdfOptions): jsPDF {
  const { layout, marks, geometry, paper, boardName, dims } = options;
  const margin = layout.margin;

  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "landscape" });
  doc.setDrawColor(0);
  doc.setTextColor(0);

  const lines = stripRegistrationLines(layout, geometry);
  const segments = stripMarkSegments(layout, marks, geometry);
  const rows = stripLabelRows(layout, marks, geometry);
  const { scaleSquare, nameBlock } = computePageZeroFurniture(doc, layout, dims);

  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper, "landscape");

    drawOutlineCurve(doc, geometry, page, margin);
    drawStringer(doc, page, margin);
    drawRegistrationLines(doc, page, margin, lines);
    drawMarkTicks(doc, page, margin, segments);
    drawLabelRows(doc, page, margin, rows);
    drawPageNumber(doc, page, margin);

    if (page.index === 0) {
      drawScaleSquare(doc, page, margin, scaleSquare);
      drawNameBlock(doc, page, margin, nameBlock, boardName, dims);
    }
  });

  return doc;
}

/** Page 0's own scale square and name block, converted into page-local millimetre rectangles — the
 * pure-test half of "furniture stays inside the page and the two pieces never overlap," mirroring
 * `templatePageZeroFurnitureRects`'s own contract for the tiled template. */
export function stripPageZeroFurnitureRects(options: BuildStripPdfOptions): TemplateFurnitureRect[] {
  const { layout, dims, paper } = options;
  const margin = layout.margin;
  const page0 = layout.pages[0];
  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "landscape" });

  const { scaleSquare, nameBlock, nameBoxHeight } = computePageZeroFurniture(doc, layout, dims);

  const toRect = (name: string, placement: StripFurniturePlacement, width: number, height: number): TemplateFurnitureRect => ({
    name,
    x: halfWidthToX(placement.halfWidthStart, page0, margin),
    y: stationToY(placement.topStation, page0, margin),
    width,
    height,
  });

  return [
    toRect(
      "scale-square",
      scaleSquare,
      SCALE_SQUARE_MM,
      SCALE_SQUARE_MM + SCALE_SQUARE_CAPTION_GAP_MM + SCALE_SQUARE_CAPTION_HEIGHT_MM,
    ),
    toRect("name-block", nameBlock, NAME_BOX_WIDTH_MM, nameBoxHeight),
  ];
}

/** Page 0's own printable rectangle, in the same page-local millimetre space
 * `stripPageZeroFurnitureRects` returns — so a test can assert both pieces of furniture are fully
 * contained inside it (`rectContains`) without re-deriving the station/half-width-to-mm
 * conversion. Exported for testability alongside the re-exported `rectContains`/`rectsOverlap`. */
export function stripPageZeroPrintableRect(layout: StripLayout): TemplateFurnitureRect {
  const page0 = layout.pages[0];
  const margin = layout.margin;
  const left = halfWidthToX(page0.halfWidthRange[0], page0, margin);
  const right = halfWidthToX(page0.halfWidthRange[1], page0, margin);
  const top = stationToY(page0.stationRange[1], page0, margin);
  const bottom = stationToY(page0.stationRange[0], page0, margin);
  return { name: "printable-rect", x: left, y: top, width: right - left, height: bottom - top };
}

export { rectContains, rectsOverlap };

/** Slugifies a board name into a safe file-name fragment — identical rule to
 * `build-template-pdf.ts`'s own `templateFileName` and `build-overview-pdf.ts`'s own
 * `overviewFileName`, kept as a sibling function rather than an import for the same reason
 * `overviewFileName`'s own header comment gives: this module's download naming doesn't reach into
 * a sibling file for a one-line string transform (T-cj5-01). */
export function stripFileName(boardName: string): string {
  const slug = boardName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? `${slug}-paper-saver.pdf` : "board-paper-saver.pdf";
}

/** Builds the document then saves it under the browser's normal download flow — mirrors
 * `downloadTemplatePdf`/`downloadOverviewPdf`'s own one call site. */
export function downloadStripPdf(options: BuildStripPdfOptions): void {
  const doc = buildStripPdf(options);
  doc.save(stripFileName(options.boardName));
}
