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
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_WIDTH_MM,
  PAPER_MM,
  markPlacements,
  matchMarkPositions,
  nameBlockPlacement,
  type PaperSize,
  type TemplateLayout,
  type TemplateMarkPlacement,
  type TemplateMarks,
  type TemplateMatchMark,
  type TemplatePage,
} from "@/lib/geometry/template";
import {
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  inchesToMm,
  mm,
  type Litres,
  type Mm,
} from "@/lib/geometry/units";

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
  /** The page 1 name block's own dims row — every value the Summary order form's core dimensions
   * row carries (`components/summary/order-form.tsx`'s `DimensionCell` strip), read from the same
   * design state and formatted with the same `lib/geometry/units.ts` functions, so the printed
   * template never disagrees with the order form over what a board measures (post-checkpoint fix,
   * defect 3 refinement). */
  dims: {
    length: Mm;
    widePointWidth: Mm;
    centerThickness: Mm;
    /** Full (not half) width 12in in from the nose — `OutlineGeometry.noseWidthAt12in`. */
    noseWidth12in: Mm;
    /** Full (not half) width 12in in from the tail — `OutlineGeometry.tailWidthAt12in`. */
    tailWidth12in: Mm;
    /** Signed offset of the widepoint from mid-length — positive toward the nose. */
    widePointOffset: Mm;
    volumeLitres: Litres;
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
const NAME_BOX_PADDING_MM = 3;
/** The name block's own text width budget — Print Artifact Contract #6: a name too long for the
 * box truncates with an ellipsis rather than wrapping into or overlapping the outline curve. */
const NAME_TEXT_WIDTH_LIMIT_MM = NAME_BOX_WIDTH_MM - 2 * NAME_BOX_PADDING_MM;
const NAME_FONT_SIZE_PT = 14;
/** Fallback text for an empty or whitespace-only board name — matches `board-rack-card.tsx` /
 * `continue-board-card.tsx`'s fallback wording, deliberately not `order-form.tsx`'s lower-case
 * "Unnamed board" variant for the same idea (a pre-existing, separately-scoped inconsistency). */
const UNTITLED_BOARD_NAME = "Untitled Board";
const ELLIPSIS = "…";

/** The dims row beneath the board name — every value the order form's own dimensions row carries
 * (post-checkpoint fix, defect 3 refinement). Reserved vertical space for the bold name line
 * (matches the `y + 8` baseline the name is already drawn at), then the wrapped dims text below
 * it at a smaller size, since seven values plus their labels don't fit at the name's own 14pt. */
const NAME_BOX_NAME_LINE_HEIGHT_MM = 8;
const NAME_BOX_DIMS_TOP_GAP_MM = 2;
const NAME_BOX_DIMS_FONT_SIZE_PT = 8;
const NAME_BOX_DIMS_LINE_HEIGHT_MM = 4.2;
/** The dims row's own text width budget, inside the box's border and padding. */
const NAME_BOX_DIMS_WIDTH_LIMIT_MM = NAME_BOX_WIDTH_MM - 2 * NAME_BOX_PADDING_MM;

/** The four working marks (D-06) — solid black, told apart by dash pattern alone so they survive a
 * monochrome printer. */
const MARK_TICK_LINE_WEIGHT_MM = 0.25;
const MARK_STATION_DASH_PATTERN = [5, 4];
const MARK_WIDEPOINT_DASH_PATTERN = [2, 3];
const MARK_LABEL_OFFSET_MM = 2;
/** Extra clearance kept between a mark's label and the outline curve it runs to — post-checkpoint
 * fix, defect 2: the label must never run off the tick's own paper into the curve. */
const MARK_LABEL_SAFETY_MM = 2;
/** Vertical gap between the two stacked lines when a label doesn't fit on one (name, then
 * dimension) before the tick's own curve-side end. */
const MARK_LABEL_LINE_GAP_MM = 4;

/** Overlap match-mark crosshairs (D-09) — small, solid, identical on both overlapping pages. */
const MATCH_MARK_LINE_WEIGHT_MM = 0.25;
const MATCH_MARK_SIZE_MM = 4;

/** The nose-page how-to box (D-10) — plain-bordered, 9pt regular, beside the scale square. */
const HOWTO_BOX_LINE_WEIGHT_MM = 0.25;
const HOWTO_BOX_WIDTH_MM = 70;
const HOWTO_BOX_PADDING_MM = 3;
const HOWTO_BOX_LINE_HEIGHT_MM = 5;
/** Gap below the scale-check square's own label before the how-to box begins. */
const HOWTO_BOX_TOP_GAP_MM = 8;
/** The how-to box's own text width budget, inside its border and padding — post-checkpoint fix,
 * defect 1: a line too wide for this wraps rather than running past the box's right edge. */
export const HOWTO_BOX_TEXT_WIDTH_LIMIT_MM = HOWTO_BOX_WIDTH_MM - 2 * HOWTO_BOX_PADDING_MM;

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

/** Draws the four working marks (D-06 — nose 12in, tail 12in, centre, widepoint; no every-12in
 * station ladder) that fall on this page. Each tick runs from the stringer (half-width 0) out to
 * `placement.halfWidthExtent`, at 0.25mm; the widepoint tick alone gets the dotted `2 3` pattern so
 * it is told apart from the other three by dash pattern alone, never by colour. */
/** The dimension text drawn beside each working mark — the board's own full width (both rails,
 * not just the tick's own half-width extent) at that mark's station, formatted the way a shaper
 * reads a tape measure. Exported for testability without reading the rendered page
 * (post-checkpoint fix, defect 2: "the station lines don't have a printed dimension"). */
export function templateMarkDimensionText(placement: TemplateMarkPlacement): string {
  return formatInchesFraction(mm(placement.halfWidthExtent * 2));
}

/** The mark's name plus its dimension, e.g. `Nose 12" — 15 3/4"` — the combined text drawn on one
 * line when there's room. */
export function templateMarkLabelText(placement: TemplateMarkPlacement): string {
  return `${placement.label} — ${templateMarkDimensionText(placement)}`;
}

/** Draws the four working marks (D-06 — nose 12in, tail 12in, centre, widepoint; no every-12in
 * station ladder) that fall on this page. Each tick runs from the stringer (half-width 0) out to
 * `placement.halfWidthExtent`, at 0.25mm; the widepoint tick alone gets the dotted `2 3` pattern so
 * it is told apart from the other three by dash pattern alone, never by colour. Each tick is
 * labeled with its name and the board's own width there, measured with jsPDF's own `getTextWidth`
 * against the room actually available before the curve — split onto two stacked lines rather than
 * let either run past the tick's own outer end when a narrower station doesn't have room for one
 * (post-checkpoint fix, defects 2 and 4). */
function drawMarks(doc: jsPDF, page: TemplatePage, margin: number, placements: TemplateMarkPlacement[]): void {
  const pagePlacements = placements.filter((placement) => placement.pageIndex === page.index);
  if (pagePlacements.length === 0) return;

  doc.setDrawColor(0);
  doc.setLineWidth(MARK_TICK_LINE_WEIGHT_MM);

  for (const placement of pagePlacements) {
    const dash = placement.mark === "widepoint" ? MARK_WIDEPOINT_DASH_PATTERN : MARK_STATION_DASH_PATTERN;
    const y = stationToY(placement.station, page, margin);
    const xStringer = halfWidthToX(0, page, margin);
    const xOuter = halfWidthToX(placement.halfWidthExtent, page, margin);

    doc.setLineDashPattern(dash, 0);
    doc.line(xStringer, y, xOuter, y);
    doc.setLineDashPattern([], 0);

    // Labeled on the stringer side, where there is always paper — the tick's outer end sits on
    // the outline curve itself, but the stringer end never leaves the kept area.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);

    const combined = templateMarkLabelText(placement);
    const availableWidth = Math.max(0, xOuter - xStringer - MARK_LABEL_OFFSET_MM - MARK_LABEL_SAFETY_MM);
    if (doc.getTextWidth(combined) <= availableWidth) {
      doc.text(combined, xStringer + MARK_LABEL_OFFSET_MM, y - MARK_LABEL_OFFSET_MM);
    } else {
      doc.text(placement.label, xStringer + MARK_LABEL_OFFSET_MM, y - MARK_LABEL_OFFSET_MM - MARK_LABEL_LINE_GAP_MM);
      doc.text(
        templateMarkDimensionText(placement),
        xStringer + MARK_LABEL_OFFSET_MM,
        y - MARK_LABEL_OFFSET_MM,
      );
    }
  }
}

/** Draws the small alignment crosshairs (D-09) that sit inside every overlap band this page
 * shares with a neighbour — the identical pair on both overlapping pages is what turns "lining
 * the marks up" into a positive confirmation rather than an eyeball judgement on a cut edge. */
function drawMatchMarks(doc: jsPDF, page: TemplatePage, margin: number, matchMarks: TemplateMatchMark[]): void {
  const pageMarks = matchMarks.filter((mark) => mark.pageIndex === page.index);
  if (pageMarks.length === 0) return;

  doc.setDrawColor(0);
  doc.setLineWidth(MATCH_MARK_LINE_WEIGHT_MM);
  doc.setLineDashPattern([], 0);

  const half = MATCH_MARK_SIZE_MM / 2;
  for (const mark of pageMarks) {
    const x = halfWidthToX(mark.halfWidth, page, margin);
    const y = stationToY(mark.station, page, margin);
    doc.line(x - half, y, x + half, y);
    doc.line(x, y - half, x, y + half);
  }
}

/** The how-to box's plain-English lines (D-10 / Print Artifact Contract #4), pure data — a small
 * exported helper so its line count (3 vs. 4) is testable without reading the rendered page. The
 * sideways-taping line only applies when the grid actually has more than one column; omitted
 * entirely for the common single-column case rather than printing a caveat that never applies. */
export function templateHowToLines(layout: TemplateLayout): string[] {
  const lines = [
    'Print at 100% — turn off "Fit to page."',
    'Measure the square above. It should be exactly 2" x 2".',
    "Cut out each page and tape them together, nose to tail, matching the marks.",
  ];
  if (layout.columns > 1) {
    lines.push("Tape left to right, then row to row, nose to tail.");
  }
  return lines;
}

/** Word-wraps `text` to `maxWidthMm`, measured with jsPDF's own `getTextWidth` at `doc`'s
 * currently-set font/size — never a guessed character count. Exported for testability. */
export function wrapTextToWidth(text: string, maxWidthMm: number, doc: jsPDF): string[] {
  const words = text.split(" ");
  const wrapped: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (current.length > 0 && doc.getTextWidth(candidate) > maxWidthMm) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) wrapped.push(current);
  return wrapped;
}

/** The how-to box's lines, numbered and wrapped to fit inside the box's own inner width (its
 * width less its own padding on both sides) — post-checkpoint fix, defect 1: "the instructions on
 * page 1 overrun the text box." A line too wide for one row wraps onto the next rather than
 * running past the box's printed border; continuation lines carry no number. Exported for
 * testability: every returned line's `getTextWidth` is asserted no wider than `innerWidthMm`. */
export function templateHowToWrappedLines(layout: TemplateLayout, doc: jsPDF, innerWidthMm: number): string[] {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = templateHowToLines(layout);
  const wrapped: string[] = [];
  lines.forEach((line, i) => {
    wrapped.push(...wrapTextToWidth(`${i + 1}. ${line}`, innerWidthMm, doc));
  });
  return wrapped;
}

/** The nose-page how-to box's own rectangle — computed once so the drawing function agrees with
 * itself on exactly the same box, including its height, which now varies with how many lines
 * defect 1's wrapping produced. */
function howToBoxRect(
  doc: jsPDF,
  layout: TemplateLayout,
  margin: number,
  paperWidthMm: number,
): { x: number; y: number; width: number; height: number; lines: string[] } {
  const lines = templateHowToWrappedLines(layout, doc, HOWTO_BOX_TEXT_WIDTH_LIMIT_MM);
  const height = HOWTO_BOX_PADDING_MM * 2 + lines.length * HOWTO_BOX_LINE_HEIGHT_MM;
  const x = paperWidthMm - margin - HOWTO_BOX_WIDTH_MM;
  const y = margin + SCALE_SQUARE_MM + HOWTO_BOX_TOP_GAP_MM;
  return { x, y, width: HOWTO_BOX_WIDTH_MM, height, lines };
}

/** Nose page only, beside the scale square — the one thing on the template that prevents the
 * failure a wrong print scale causes silently and expensively. */
function drawHowToBox(doc: jsPDF, layout: TemplateLayout, page: TemplatePage, margin: number, paperWidthMm: number): void {
  if (page.index !== 0) return;

  const { x, y, width, height, lines } = howToBoxRect(doc, layout, margin, paperWidthMm);

  doc.setDrawColor(0);
  doc.setLineWidth(HOWTO_BOX_LINE_WEIGHT_MM);
  doc.rect(x, y, width, height, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0);
  lines.forEach((line, i) => {
    doc.text(line, x + HOWTO_BOX_PADDING_MM, y + HOWTO_BOX_PADDING_MM + (i + 1) * HOWTO_BOX_LINE_HEIGHT_MM - 1.5);
  });
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

/** Resolves what the name block actually prints for a given `boardName`: the empty-name fallback
 * (Print Artifact Contract #5) and the long-name truncation rule (#6). Truncates with an ellipsis
 * rather than shrinking the type — shrinking risks dropping the name below the project's 9pt
 * print-legibility floor, and a template's name only has to identify which stack of pages belongs
 * to which board, not remain fully legible at any length. Measured with jsPDF's own `getTextWidth`
 * at the name block's own font (bold, `NAME_FONT_SIZE_PT`), so the truncation always reflects the
 * font actually drawn onto the page — sets that font on `doc` as a side effect of measuring, which
 * `drawNameBlock` already re-asserts before drawing. */
export function templateNameBlockText(
  boardName: string,
  widthLimitMm: number,
  doc: jsPDF,
): string {
  const trimmed = boardName.trim();
  const displayName = trimmed.length > 0 ? trimmed : UNTITLED_BOARD_NAME;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(NAME_FONT_SIZE_PT);

  if (doc.getTextWidth(displayName) <= widthLimitMm) {
    return displayName;
  }

  let truncated = displayName;
  while (truncated.length > 0 && doc.getTextWidth(`${truncated}${ELLIPSIS}`) > widthLimitMm) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}${ELLIPSIS}`;
}

/** The full dims row text, before wrapping — every value the order form's own dimensions row
 * carries (`components/summary/order-form.tsx`'s `DimensionCell` strip: Length, Nose, Widepoint,
 * Offset, Tail, Thickness, Volume), formatted with the same `lib/geometry/units.ts` functions the
 * order form uses. Exported for testability without reading the rendered page (post-checkpoint
 * fix, defect 3 refinement: "add all the station mark dims with the board name"). */
export function templateNameBlockDimsText(dims: BuildTemplatePdfOptions["dims"]): string {
  return [
    `Length ${formatFeetInches(dims.length)}`,
    `Nose ${formatInchesFraction(dims.noseWidth12in)}`,
    `Widepoint ${formatInchesFraction(dims.widePointWidth)}`,
    `Offset ${formatSignedInchesFraction(dims.widePointOffset)}`,
    `Tail ${formatInchesFraction(dims.tailWidth12in)}`,
    `Thickness ${formatInchesFraction(dims.centerThickness)}`,
    `Volume ${dims.volumeLitres.toFixed(1)} L`,
  ].join("  ·  ");
}

/** The name block's dims row, wrapped to the box's own inner width, plus the box's total height
 * given how many lines that wrapping produced — one source of truth shared by `drawNameBlock`
 * (which draws it) and anything else that needs the box's real footprint. Exported for
 * testability. */
export function nameBlockContent(
  doc: jsPDF,
  dims: BuildTemplatePdfOptions["dims"],
): { dimsLines: string[]; height: number } {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(NAME_BOX_DIMS_FONT_SIZE_PT);
  const dimsLines = wrapTextToWidth(templateNameBlockDimsText(dims), NAME_BOX_DIMS_WIDTH_LIMIT_MM, doc);
  const height =
    NAME_BOX_NAME_LINE_HEIGHT_MM +
    NAME_BOX_DIMS_TOP_GAP_MM +
    dimsLines.length * NAME_BOX_DIMS_LINE_HEIGHT_MM +
    NAME_BOX_PADDING_MM;
  return { dimsLines, height };
}

/** D-08's board name + dims block: a bordered box on page 1 (the nose page), positioned by
 * `nameBlockPlacement` so it's fully contained inside the outline's own interior there —
 * post-checkpoint fix, defect 3: "the Board Name and dimension box needs to be contained INSIDE
 * the board outline on page 1," not floated wherever the board's centre station happens to fall.
 * The box now carries every value the order form's own dimensions row does, not just three of
 * seven, so its real height (name line plus however many lines the fuller dims row wraps to) is
 * computed first and fed into `nameBlockPlacement` — containment wins over a fixed position, so a
 * board whose nose narrows fastest gets the box moved further down page 1 rather than clipped. */
function drawNameBlock(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  boardName: string,
  dims: BuildTemplatePdfOptions["dims"],
): void {
  const { dimsLines, height } = nameBlockContent(doc, dims);
  const placement = nameBlockPlacement(layout, geometry, NAME_BOX_WIDTH_MM, height, NAME_BOX_CLEARANCE_MM);
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

/** Builds the multi-page jsPDF document for one `TemplateLayout`. Iterates data handed to it —
 * every number drawn here comes from `layout`, `geometry` or a fixed drawing constant above;
 * nothing in this function computes tile geometry. */
export function buildTemplatePdf(options: BuildTemplatePdfOptions): jsPDF {
  const { layout, marks, geometry, paper, boardName, dims } = options;
  const paperDims = PAPER_MM[paper];
  const margin = layout.margin;

  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "portrait" });
  doc.setDrawColor(0);
  doc.setTextColor(0);

  const placements = markPlacements(layout, marks, geometry);
  const matchMarks = matchMarkPositions(layout);

  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper, "portrait");

    drawOutlineCurve(doc, geometry, page, margin);
    drawStringerEdge(doc, page, margin);
    drawMarks(doc, page, margin, placements);
    drawMatchMarks(doc, page, margin, matchMarks);
    drawScaleSquare(doc, page, margin, paperDims.width);
    drawHowToBox(doc, layout, page, margin, paperDims.width);
    drawPageLabel(doc, page, margin, paperDims.width, paperDims.height);
    if (page.index === 0) {
      drawNameBlock(doc, page, margin, layout, geometry, boardName, dims);
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
