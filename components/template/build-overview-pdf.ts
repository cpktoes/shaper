/**
 * The Overview Sheet — a single portrait page titled "Surfboard Template Specs": every input
 * parameter down the left in a plain-text list, and the full outline scaled to fit the page on
 * the right, with the same dashed reference stations the outline screen and rail-band calculator
 * already draw. Modeled on the prototype's own "Print Specs" popup
 * (`reference/project/Template.dc.html`'s `onPrintSpecs`, lines 868-936) — ported, not invented —
 * but drawn with jsPDF onto a real PDF page instead of a print-preview HTML window, alongside the
 * full tiled template `build-template-pdf.ts` already builds.
 *
 * This is a "recreate this board" reference, not a cutting template: the outline is scaled to fit
 * one page (`lib/geometry/overview-layout.ts`), never drawn 1:1 the way the tiled template is.
 *
 * Reuses the SAME sampled outline points (`OutlineGeometry.points`) and knot stations
 * (`centreCloseStation`) `components/outline/outline-viewer.tsx`'s own closed-path construction
 * reads — no curve math is duplicated here, only the coordinate transform into this page's own
 * millimetre space differs (jsPDF `unit: "mm"` instead of an SVG viewBox).
 */

import jsPDF from "jspdf";
import type { OutlineSpec } from "@/lib/geometry/board";
import { MEASURE_STATION_MM, type OutlineGeometry, sampleOutline } from "@/lib/geometry/outline";
import { computeOverviewOutlineScale } from "@/lib/geometry/overview-layout";
import { PAPER_MM, TEMPLATE_MARGIN_MM, type PaperSize } from "@/lib/geometry/template";
import {
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  mm,
  squareMmToSquareInches,
  type Mm,
} from "@/lib/geometry/units";
import { wrapTextToWidth } from "@/components/template/build-template-pdf";

export interface BuildOverviewPdfOptions {
  geometry: OutlineGeometry;
  outline: OutlineSpec;
  paper: PaperSize;
  boardName: string;
}

const TITLE_FONT_SIZE_PT = 18;
const TITLE_TOP_GAP_MM = 7;
const BOARD_NAME_FONT_SIZE_PT = 11;
const BOARD_NAME_GAP_MM = 7;
const CONTENT_TOP_GAP_MM = 8;

const SPEC_FONT_SIZE_PT = 9;
const SPEC_LINE_HEIGHT_MM = 5;
const SPEC_COLUMN_WIDTH_MM = 85;
const COLUMN_GAP_MM = 10;

const OUTLINE_LINE_WEIGHT_MM = 0.5;
const STRINGER_LINE_WEIGHT_MM = 0.35;
const STRINGER_DASH_PATTERN = [10, 3];
const STATION_LINE_WEIGHT_MM = 0.3;
const STATION_DASH_PATTERN = [4, 3];
const STATION_VALUE_FONT_SIZE_PT = 9;
const STATION_LABEL_FONT_SIZE_PT = 7;
const STATION_TEXT_GAP_MM = 2;

const LENGTH_LABEL_FONT_SIZE_PT = 11;
/** Vertical room reserved above the drawn outline for the length label — post-checkpoint addition
 * (03-04): "the length label at the top" (e.g. `6'0" - 72"`), never overlapping the nose tip. */
const LENGTH_LABEL_TOP_RESERVE_MM = 9;
/** Horizontal room reserved either side of the drawn outline itself for the station lines' own
 * dimension value (left) and small-caps name (right) — the outline is scaled to fit inside the
 * space left over, not the full column width, so neither label ever runs off the page. */
const LABEL_RESERVE_LEFT_MM = 24;
const LABEL_RESERVE_RIGHT_MM = 36;

/**
 * Capitalizes a tail-shape union tag for display — every `TailShape["kind"]` value
 * (`lib/geometry/board.ts`) is a single lower-case word, so a first-letter uppercase is the whole
 * transform; matches `order-form.tsx`'s tail-shape label the same way before that panel was
 * replaced by the calculated outline (see this file's own header comment).
 */
function tailShapeLabel(kind: OutlineSpec["tail"]["kind"]): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * The Overview Sheet's own spec list — every parameter line the prototype's `specLines` (Template.dc.html
 * lines 751-765) prints, ported field-for-field onto this app's design state:
 *
 * - The prototype's single `Rail Length` control is this app's two independent `tailRailLength` /
 *   `noseRailLength` sliders (`outline-controls.tsx`'s "Tail Rail" / "Nose Rail" rows) — printed as
 *   both values rather than guessing which one the prototype's single control corresponded to.
 * - `Swallow Depth` / `Diamond Depth` are still conditional on the tail's own kind, exactly as the
 *   prototype's `...(s.tailType === 'swallow' ? [...] : [])` spread does.
 * - `Diamond Depth` prints the geometry's own `effectiveDiamondDepth` (the depth after the
 *   5in cap the outline engine enforces), not the raw input, matching the prototype's own
 *   `g.diamondDepthEff` — so this sheet never claims a depth the drawn outline doesn't have.
 *
 * Exported for testability without rendering the page (matches `templateHowToLines` /
 * `templateNameBlockDimsText`'s own pattern in `build-template-pdf.ts`).
 */
export function overviewSpecLines(outline: OutlineSpec, geometry: OutlineGeometry): string[] {
  const lines = [
    `Length: ${formatFeetInches(outline.length)}`,
    `Nose Angle: ${outline.noseAngle}°  ·  Fullness: ${outline.noseFullness}%`,
    `Nose Width @12" (calculated): ${formatInchesFraction(geometry.noseWidthAt12in)}`,
    `Widepoint Width: ${formatInchesFraction(outline.widePointWidth)}`,
    `WP Offset: ${formatSignedInchesFraction(outline.widePointOffset)}`,
    `Rail Length: Tail ${outline.tailRailLength}%  ·  Nose ${outline.noseRailLength}%`,
    `Tail Shape: ${tailShapeLabel(outline.tail.kind)}`,
    `Tail Block: ${formatInchesFraction(mm(geometry.halfTailBlockWidth * 2))}`,
  ];
  if (outline.tail.kind === "swallow") {
    lines.push(`Swallow Depth: ${formatInchesFraction(outline.tail.crotchDepth)}`);
  }
  if (outline.tail.kind === "diamond") {
    lines.push(`Diamond Depth: ${formatInchesFraction(geometry.effectiveDiamondDepth)}`);
  }
  lines.push(`Tail Angle: ${outline.tailAngle}°  ·  Fullness: ${outline.tailFullness}%`);
  lines.push(`Tail Width @12" (calculated): ${formatInchesFraction(geometry.tailWidthAt12in)}`);
  const areaSqIn = squareMmToSquareInches(geometry.area);
  lines.push(`Template Area: ${areaSqIn.toFixed(1)} sq in (${(areaSqIn / 144).toFixed(2)} sq ft)`);
  return lines;
}

/** The length callout printed above the drawn outline, e.g. `6'0" - 72"` — feet-and-inches plus
 * the same total in a plain inch fraction, matching the prototype's own `printLengthText`
 * (`${lengthFeet}'${lengthInches}" - ${this.disp(L)}`). Exported for testability. */
export function overviewLengthLabelText(length: Mm): string {
  return `${formatFeetInches(length)} - ${formatInchesFraction(length)}`;
}

interface OverviewStationLine {
  /** Small-caps name printed to the right of the dashed line. */
  label: string;
  station: Mm;
}

/**
 * The three dashed reference stations drawn across the outline — nose @ 12", the widepoint
 * (merged with centre into one line and label, since a shaper looking at a recreate-me reference
 * sheet needs one station there, not two that usually sit a few millimetres apart), and tail @
 * 12". Exported for testability. `sampleOutline` (not a fixed half-width) is used for every
 * station's drawn width, exactly as `lib/geometry/template.ts`'s own `markPlacements` samples the
 * widepoint the same way rather than trusting `halfWidePointWidth` to always be exactly at that
 * station.
 */
export function overviewStationLines(geometry: OutlineGeometry): OverviewStationLine[] {
  return [
    { label: 'NOSE @ 12"', station: mm(geometry.length - MEASURE_STATION_MM) },
    { label: "WIDEPOINT/CENTER", station: geometry.widePointStation },
    { label: 'TAIL @ 12"', station: MEASURE_STATION_MM },
  ];
}

/** One page-space point, in this page's own millimetre frame. */
interface PagePoint {
  x: number;
  y: number;
}

/**
 * Draws the full closed outline (both rails) as a run of line segments — the same right-ascending
 * / left-reversed / centre-close construction `outline-viewer.tsx`'s own `outlinePath` uses for
 * its SVG `<path>`, replayed here as individual `doc.line()` calls the way `build-template-pdf.ts`'s
 * `drawOutlineCurve` already draws its own (right-half-only) curve — no new curve math, only a
 * different rendering back end.
 */
function drawClosedOutline(
  doc: jsPDF,
  geometry: OutlineGeometry,
  stationToY: (station: number) => number,
  halfWidthToX: (halfWidth: number, side: 1 | -1) => number,
): void {
  const rightPoints: PagePoint[] = geometry.points.map((p) => ({
    x: halfWidthToX(p.halfWidth, 1),
    y: stationToY(p.station),
  }));
  const leftPoints: PagePoint[] = geometry.points
    .slice()
    .reverse()
    .map((p) => ({ x: halfWidthToX(p.halfWidth, -1), y: stationToY(p.station) }));
  const centreClose: PagePoint = {
    x: halfWidthToX(0, 1),
    y: stationToY(geometry.centreCloseStation),
  };
  const loop = [...rightPoints, ...leftPoints, centreClose, rightPoints[0]];

  doc.setDrawColor(0);
  doc.setLineWidth(OUTLINE_LINE_WEIGHT_MM);
  for (let i = 0; i < loop.length - 1; i++) {
    doc.line(loop[i].x, loop[i].y, loop[i + 1].x, loop[i + 1].y);
  }
}

/**
 * Builds the one-page Overview Sheet: title, board name (when set), the full spec list, and the
 * scaled outline with its three labeled dashed stations. Every number drawn here comes from
 * `geometry`, `outline`, or a fixed drawing constant above — nothing in this function computes
 * outline geometry of its own, matching `buildTemplatePdf`'s own contract.
 */
export function buildOverviewPdf(options: BuildOverviewPdfOptions): jsPDF {
  const { geometry, outline, paper, boardName } = options;
  const paperDims = PAPER_MM[paper];
  const margin = TEMPLATE_MARGIN_MM;

  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "portrait" });
  doc.setDrawColor(0);
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_FONT_SIZE_PT);
  const titleY = margin + TITLE_TOP_GAP_MM;
  doc.text("Surfboard Template Specs", margin, titleY);

  let contentTop = titleY + CONTENT_TOP_GAP_MM;
  const trimmedName = boardName.trim();
  if (trimmedName.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BOARD_NAME_FONT_SIZE_PT);
    doc.text(trimmedName, margin, contentTop);
    contentTop += BOARD_NAME_GAP_MM;
  }

  // Spec column — courier, matching the prototype's own monospace <pre> block, so every line's
  // label and value stay column-aligned the way a shaper reads a spec sheet.
  doc.setFont("courier", "normal");
  doc.setFontSize(SPEC_FONT_SIZE_PT);
  const wrappedSpecLines = overviewSpecLines(outline, geometry).flatMap((line) =>
    wrapTextToWidth(line, SPEC_COLUMN_WIDTH_MM, doc),
  );
  doc.setFont("courier", "normal");
  doc.setFontSize(SPEC_FONT_SIZE_PT);
  wrappedSpecLines.forEach((line, i) => {
    doc.text(line, margin, contentTop + (i + 1) * SPEC_LINE_HEIGHT_MM);
  });

  // Outline drawing region — right of the spec column, filling the rest of the page.
  const drawingX0 = margin + SPEC_COLUMN_WIDTH_MM + COLUMN_GAP_MM;
  const drawingWidth = paperDims.width - margin - drawingX0;
  const outlineBoxWidth = drawingWidth - LABEL_RESERVE_LEFT_MM - LABEL_RESERVE_RIGHT_MM;
  const drawingTop = contentTop + LENGTH_LABEL_TOP_RESERVE_MM;
  const outlineBoxHeight = paperDims.height - margin - drawingTop;

  const scale = computeOverviewOutlineScale(geometry, outlineBoxWidth, outlineBoxHeight);
  const boardWidthPage = geometry.halfWidePointWidth * 2 * scale;
  const boardHeightPage = geometry.length * scale;

  // Centered within its own reserved box on whichever axis has slack — one of the two is already
  // flush with its own budget by construction of `computeOverviewOutlineScale`.
  const outlineLeft = drawingX0 + LABEL_RESERVE_LEFT_MM + (outlineBoxWidth - boardWidthPage) / 2;
  const centerX = outlineLeft + boardWidthPage / 2;
  const outlineTop = drawingTop + (outlineBoxHeight - boardHeightPage) / 2;

  const stationToY = (station: number) => outlineTop + (geometry.length - station) * scale;
  const halfWidthToX = (halfWidth: number, side: 1 | -1) => centerX + side * halfWidth * scale;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(LENGTH_LABEL_FONT_SIZE_PT);
  doc.text(overviewLengthLabelText(geometry.length), centerX, outlineTop - 3, { align: "center" });

  drawClosedOutline(doc, geometry, stationToY, halfWidthToX);

  // Stringer centreline — dashed, spanning the drawn outline's full length.
  doc.setDrawColor(0);
  doc.setLineWidth(STRINGER_LINE_WEIGHT_MM);
  doc.setLineDashPattern(STRINGER_DASH_PATTERN, 0);
  doc.line(centerX, outlineTop, centerX, outlineTop + boardHeightPage);
  doc.setLineDashPattern([], 0);

  // The three labeled reference stations — dashed line, dimension value on the left, small-caps
  // name on the right (post-checkpoint addition, per the user's own iShaper reference).
  for (const line of overviewStationLines(geometry)) {
    const halfWidth = sampleOutline(geometry, line.station);
    const y = stationToY(line.station);
    const xLeft = halfWidthToX(halfWidth, -1);
    const xRight = halfWidthToX(halfWidth, 1);

    doc.setDrawColor(0);
    doc.setLineWidth(STATION_LINE_WEIGHT_MM);
    doc.setLineDashPattern(STATION_DASH_PATTERN, 0);
    doc.line(xLeft, y, xRight, y);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(STATION_VALUE_FONT_SIZE_PT);
    doc.text(formatInchesFraction(mm(halfWidth * 2)), xLeft - STATION_TEXT_GAP_MM, y, {
      align: "right",
      baseline: "middle",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(STATION_LABEL_FONT_SIZE_PT);
    doc.text(line.label, xRight + STATION_TEXT_GAP_MM, y, { baseline: "middle" });
  }

  return doc;
}

/** Slugifies a board name into a safe file-name fragment — identical rule to
 * `build-template-pdf.ts`'s own `templateFileName`, kept as a sibling function rather than an
 * import so this module's download naming doesn't reach into the tiled template's own file for a
 * one-line string transform. */
export function overviewFileName(boardName: string): string {
  const slug = boardName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? `${slug}-overview.pdf` : "board-overview.pdf";
}

/** Builds the document then saves it under the browser's normal download flow — mirrors
 * `downloadTemplatePdf`'s own one call site, so the export dialog's Download button calls exactly
 * one function regardless of which artifact the shaper picked. */
export function downloadOverviewPdf(options: BuildOverviewPdfOptions): void {
  const doc = buildOverviewPdf(options);
  doc.save(overviewFileName(options.boardName));
}
