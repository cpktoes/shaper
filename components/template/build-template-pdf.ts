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
  computeTailClosure,
  howToBoxPlacement,
  markLineSegments,
  markPlacements,
  nameBlockPlacement,
  tailClosureSegments,
  type HowToBoxPlacement,
  type NameBlockPlacement,
  type PaperSize,
  type TailClosureSegment,
  type TemplateLayout,
  type TemplateMarkLineSegment,
  type TemplateMarkPlacement,
  type TemplateMarks,
  type TemplatePage,
  type TemplatePageBox,
  templatePageBoxes,
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

/** Every input `buildTemplatePdf` needs, fixed complete now, so later plans (the preview dialog)
 * extend the drawing without touching a call site. */
export interface BuildTemplatePdfOptions {
  layout: TemplateLayout;
  /** Computed alongside `layout` for every caller (`computeTemplateMarks`) — the working marks
   * `drawMarks` draws (nose 12in, tail 12in, centre, widepoint, and Tail Block when the tail has
   * a squared block). */
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
/** Room reserved below the scale square for its own caption text (round 3 post-checkpoint fix,
 * defect 2: "the 2in box and instructions are not inside the margin/line up lines") — split into a
 * gap and a text-height allowance so the scale-square furniture rectangle's own bottom edge lands
 * exactly where the how-to box begins (`SCALE_SQUARE_CAPTION_GAP_MM + SCALE_SQUARE_CAPTION_HEIGHT_MM`
 * equals `HOWTO_BOX_TOP_GAP_MM` below), never overlapping it even after this round's containment
 * fix. */
const SCALE_SQUARE_CAPTION_GAP_MM = 5;
const SCALE_SQUARE_CAPTION_HEIGHT_MM = 3;
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

/** The five working marks (D-06 base four, plus Tail Block) — solid black, told apart by dash
 * pattern alone so they survive a monochrome printer. */
const MARK_TICK_LINE_WEIGHT_MM = 0.25;
const MARK_STATION_DASH_PATTERN = [5, 4];
const MARK_WIDEPOINT_DASH_PATTERN = [2, 3];
/** The tailblock's own tick is a real cut edge, not a measurement reference — drawn solid, at the
 * outline curve's own line weight, rather than dashed like the other four (round 2 post-checkpoint
 * fix, defect 1: "the tailblock cut line... must print"). */
const MARK_TAILBLOCK_LINE_WEIGHT_MM = OUTLINE_LINE_WEIGHT_MM;
const MARK_LABEL_OFFSET_MM = 2;
/** Extra clearance kept between a mark's label and the outline curve it runs to — post-checkpoint
 * fix, defect 2: the label must never run off the tick's own paper into the curve. */
const MARK_LABEL_SAFETY_MM = 2;
/** Vertical gap between the two stacked lines when a label doesn't fit on one (name, then
 * dimension) before the tick's own curve-side end. */
const MARK_LABEL_LINE_GAP_MM = 4;
/** Approximate printed height (millimetres) of one 9pt label line — used only by `markLabelRect`
 * to build a testable collision rectangle for the CENTER/WIDEPOINT stacking fix (round 4
 * post-checkpoint fix, defect 1), not by the actual `doc.text()` draw call, which needs no height
 * (jsPDF text is drawn from a baseline, not a box). */
const MARK_LABEL_TEXT_HEIGHT_MM = 3.5;

/** Every page's own alignment box (D-09, round 2 post-checkpoint fix, defect 2) — a plain thin
 * trim line, matching the how-to box's own weight; the stringer-side edge on a column-0 page is
 * drawn at the stringer's own dashed weight/pattern instead, since that edge IS the stringer. */
const BOX_LINE_WEIGHT_MM = 0.25;

/** The nose-page how-to box — plain-bordered, 9pt regular. Beside the scale square by default
 * (D-10), the same spot it's always occupied; but on a wide-nosed board the rail curve can run
 * straight through that spot, so quick task 260903-fqv moved the DECISION of where it goes into
 * `lib/geometry/template.ts`'s `howToBoxPlacement` — this module only converts that decision into
 * page-local millimetres (`howToBoxRect`, below). When the curve doesn't clear the outboard spot
 * by `NAME_BOX_CLEARANCE_MM`, the box moves inside the outline instead, directly under the board
 * name + dims block. */
const HOWTO_BOX_LINE_WEIGHT_MM = 0.25;
const HOWTO_BOX_WIDTH_MM = 70;
const HOWTO_BOX_PADDING_MM = 3;
const HOWTO_BOX_LINE_HEIGHT_MM = 5;
/** Gap below the scale-check square's own label before the how-to box begins — used only to build
 * the OUTBOARD candidate `howToBoxPlacement` may or may not accept; the box's real position can
 * differ from this when the curve doesn't clear it (quick task 260903-fqv). */
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

/** Every page's own alignment box (D-05's stringer spine folded into it on column-0 pages;
 * D-09's tiling-registration device everywhere else) — drawn as four independent segments, not a
 * single `doc.rect`, because the stringer-side edge needs its own dashed style while the other
 * three stay solid. The box is NOT a clip boundary: the outline curve and the stringer line both
 * keep drawing past it, all the way to the page's own printable edge, so the strip between the box
 * line and that edge shows the same content the neighbouring page also prints in its own strip —
 * that duplicated content is what confirms correct registration when two sheets are taped
 * together (round 2 post-checkpoint fix, defect 2: match-mark crosshairs replaced by this border,
 * per the iShaper reference template; RESEARCH correction — the tile layout keeps its existing
 * overlap, it is not zero-overlap). */
function drawPageBox(doc: jsPDF, page: TemplatePage, box: TemplatePageBox, margin: number): void {
  const top = stationToY(box.stationRange[1], page, margin);
  const bottom = stationToY(box.stationRange[0], page, margin);
  const left = halfWidthToX(box.halfWidthRange[0], page, margin);
  const right = halfWidthToX(box.halfWidthRange[1], page, margin);

  doc.setDrawColor(0);

  doc.setLineWidth(BOX_LINE_WEIGHT_MM);
  doc.setLineDashPattern([], 0);
  doc.line(left, top, right, top); // top
  doc.line(right, top, right, bottom); // right
  doc.line(left, bottom, right, bottom); // bottom

  if (box.stringerEdge) {
    // The board's own centreline, not a taping seam — dashed, per the user's own instruction to
    // keep the stringer dashed.
    doc.setLineWidth(STRINGER_LINE_WEIGHT_MM);
    doc.setLineDashPattern(STRINGER_DASH_PATTERN, 0);
    doc.line(left, top, left, bottom);
    doc.setLineDashPattern([], 0);
  } else {
    doc.setLineWidth(BOX_LINE_WEIGHT_MM);
    doc.line(left, top, left, bottom);
  }
}

/** Converts one page's own alignment box (`TemplatePageBox`, the board's absolute
 * station/half-width space) into this page's own local millimetre rectangle — the same x/y space
 * `TemplateFurnitureRect` and every `doc.rect`/`doc.text` call already draw into. Round 3
 * post-checkpoint fix, defect 2: every piece of page-0 furniture is now anchored to this
 * rectangle's own edges, not the page's raw printable edge, so a multi-column board's overlap
 * inset never pushes the scale square or how-to box out into the strip a neighbouring sheet gets
 * taped over. */
function pageBoxRect(box: TemplatePageBox, page: TemplatePage, margin: number): TemplateFurnitureRect {
  const left = halfWidthToX(box.halfWidthRange[0], page, margin);
  const right = halfWidthToX(box.halfWidthRange[1], page, margin);
  const top = stationToY(box.stationRange[1], page, margin);
  const bottom = stationToY(box.stationRange[0], page, margin);
  return { name: "alignment-box", x: left, y: top, width: right - left, height: bottom - top };
}

/** The scale square's own rectangle, including its caption's reserved height — anchored to the
 * page's own alignment box (round 3 post-checkpoint fix, defect 2: "the 2in box... [is] not
 * inside the margin/line up lines"), matches `drawScaleSquare`'s placement exactly, so the
 * furniture-avoidance and containment checks below are built from the real drawn area. */
function scaleSquareRect(box: TemplatePageBox, page: TemplatePage, margin: number): TemplateFurnitureRect {
  const boxRect = pageBoxRect(box, page, margin);
  return {
    name: "scale-square",
    x: boxRect.x + boxRect.width - SCALE_SQUARE_MM,
    y: boxRect.y,
    width: SCALE_SQUARE_MM,
    height: SCALE_SQUARE_MM + SCALE_SQUARE_CAPTION_GAP_MM + SCALE_SQUARE_CAPTION_HEIGHT_MM,
  };
}

/** D-07's 2in x 2in scale-check square — nose page only, in the alignment box's own top-outward
 * corner (round 3 post-checkpoint fix, defect 2), a corner the curve never reaches (near the nose
 * tip the outline hugs the stringer, so that corner is always clear). */
function drawScaleSquare(doc: jsPDF, page: TemplatePage, margin: number, box: TemplatePageBox): void {
  if (page.index !== 0) return;
  const { x, y } = scaleSquareRect(box, page, margin);
  doc.setDrawColor(0);
  doc.setLineWidth(SCALE_SQUARE_LINE_WEIGHT_MM);
  doc.rect(x, y, SCALE_SQUARE_MM, SCALE_SQUARE_MM, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text('2" x 2" — measure before taping', x + SCALE_SQUARE_MM / 2, y + SCALE_SQUARE_MM + SCALE_SQUARE_CAPTION_GAP_MM, {
    align: "center",
  });
}

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

/** Draws the working marks that fall on this page (D-06 — nose 12in, tail 12in, centre,
 * widepoint; no every-12in station ladder — plus Tail Block when this tail has one). Each mark's
 * line is drawn from `segments` (`markLineSegments`, which no longer carries `tailBlock` — its own
 * true closing edge is drawn separately by `drawTailClosure`, round 4 post-checkpoint fix, defect
 * 2), one clipped call per page it touches — a board wide enough to tile more than one column has
 * its widepoint (and, at the row-overlap band, possibly its other marks too) span more than one
 * page, and every one of those pages draws its own portion of the stringer-to-curve line, never
 * stopping short of the curve just because the curve itself lives on a further column's sheet
 * (round 3 post-checkpoint fix, defect 1: "the center and widepoint lines don't extend to the
 * edge" — the actual bug was the line vanishing partway across a multi-column board, not the line
 * failing to reach the printable edge). The widepoint gets the dotted `2 3` pattern, everything
 * else the dashed `5 4` pattern. The printed dimension label is drawn once per mark, from
 * `placements` (`markPlacements` — CENTER and WIDEPOINT may carry a `labelOffsetMm` nudge when
 * they sit close together, round 4 post-checkpoint fix, defect 1), measured with jsPDF's own
 * `getTextWidth` against the room actually available before the curve — split onto two stacked
 * lines rather than let either run past the tick's own outer end when a narrower station doesn't
 * have room for one (post-checkpoint fix, defects 2 and 4). */
function drawMarks(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  placements: TemplateMarkPlacement[],
  segments: TemplateMarkLineSegment[],
): void {
  const pageSegments = segments.filter((segment) => segment.pageIndex === page.index);
  const pagePlacements = placements.filter((placement) => placement.pageIndex === page.index);
  if (pageSegments.length === 0 && pagePlacements.length === 0) return;

  doc.setDrawColor(0);

  for (const segment of pageSegments) {
    const dash = segment.mark === "widepoint" ? MARK_WIDEPOINT_DASH_PATTERN : MARK_STATION_DASH_PATTERN;
    const y = stationToY(segment.station, page, margin);
    const xStart = halfWidthToX(segment.halfWidthRange[0], page, margin);
    const xEnd = halfWidthToX(segment.halfWidthRange[1], page, margin);

    doc.setLineWidth(MARK_TICK_LINE_WEIGHT_MM);
    doc.setLineDashPattern(dash, 0);
    doc.line(xStart, y, xEnd, y);
    doc.setLineDashPattern([], 0);
  }

  // Labeled on the stringer side, where there is always paper — always the column-0 page, inside
  // the box region, regardless of how many further pages this mark's own line continues across.
  for (const placement of pagePlacements) {
    const y = stationToY(placement.station, page, margin) + placement.labelOffsetMm;
    const xStringer = halfWidthToX(0, page, margin);
    const xOuter = halfWidthToX(placement.halfWidthExtent, page, margin);

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

/** The rectangle one working mark's printed label occupies, in this page's own local millimetre
 * frame — mirrors `drawMarks`' own single-line label placement (name+dimension combined onto one
 * row) exactly, so a test can assert two labels never overlap without re-deriving the drawing
 * math. Covers the common single-line case only — the rarer two-line stacked fallback (when even
 * the combined text doesn't fit before the curve) is a distinct, pre-existing overlap concern this
 * rect does not need to reproduce for the CENTER/WIDEPOINT collision fix (round 4 post-checkpoint
 * fix, defect 1) this function exists to test. Exported for testability. */
export function markLabelRect(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  placement: TemplateMarkPlacement,
): TemplateFurnitureRect {
  const y = stationToY(placement.station, page, margin) + placement.labelOffsetMm;
  const xStringer = halfWidthToX(0, page, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const width = doc.getTextWidth(templateMarkLabelText(placement));

  return {
    name: `${placement.mark}-label`,
    x: xStringer + MARK_LABEL_OFFSET_MM,
    y: y - MARK_LABEL_OFFSET_MM - MARK_LABEL_TEXT_HEIGHT_MM,
    width,
    height: MARK_LABEL_TEXT_HEIGHT_MM,
  };
}

/** Draws the tail's true closing edge (round 4 post-checkpoint fix, defect 2: "Swallow and
 * diamond tail appears like a squash") — the diagonal cut `computeTailClosure` /
 * `tailClosureSegments` compute from the rail corner to the stringer, following the actual tail
 * shape rather than the old single-station straight tick. Solid, at the outline curve's own line
 * weight, matching the old tick's own weight — it is a real cut edge, not a measurement
 * reference. */
function drawTailClosure(doc: jsPDF, page: TemplatePage, margin: number, segments: TailClosureSegment[]): void {
  const pageSegments = segments.filter((segment) => segment.pageIndex === page.index);
  if (pageSegments.length === 0) return;

  doc.setDrawColor(0);
  doc.setLineWidth(MARK_TAILBLOCK_LINE_WEIGHT_MM);
  doc.setLineDashPattern([], 0);
  for (const segment of pageSegments) {
    doc.line(
      halfWidthToX(segment.from.halfWidth, page, margin),
      stationToY(segment.from.station, page, margin),
      halfWidthToX(segment.to.halfWidth, page, margin),
      stationToY(segment.to.station, page, margin),
    );
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
    "Lay each page so its edge lines up on the next page's border line — the curve should match where they overlap — then tape.",
  ];
  if (layout.columns > 1) {
    lines.push("Line up left to right first, then row by row, nose to tail.");
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

/** The how-to box's own placement (`HowToBoxPlacement` — the board's own station/half-width
 * frame, not page-local millimetres) plus its box width, box height and wrapped lines — the ONE
 * computation `howToBoxRect` converts to page-local mm and `templateHowToBoxPlacement` (exported,
 * below) hands straight to a test. Builds the outboard candidate exactly the way the box has
 * always been drawn (right-anchored to the alignment box, `HOWTO_BOX_TOP_GAP_MM` below the scale
 * square), then asks `howToBoxPlacement` whether the curve actually clears it — beside the scale
 * square when it does (D-10), otherwise inside the outline under the board name + dims block
 * (quick task 260903-fqv). */
function computeHowToBoxPlacement(
  doc: jsPDF,
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  box: TemplatePageBox,
  nameBlock: ResolvedNameBlock,
): { placement: HowToBoxPlacement; boxWidthMm: number; boxHeightMm: number; lines: string[] } {
  const lines = templateHowToWrappedLines(layout, doc, HOWTO_BOX_TEXT_WIDTH_LIMIT_MM);
  const boxHeightMm = HOWTO_BOX_PADDING_MM * 2 + lines.length * HOWTO_BOX_LINE_HEIGHT_MM;

  // Today's outboard rect, in the board's own station/half-width frame rather than page-local mm
  // — the same affine map regrouped, so converting it back through stationToY/halfWidthToX
  // reproduces the historical x/y to floating-point noise (see the buildTemplatePdf test that
  // proves this round trip).
  const candidate = {
    topStation: box.stationRange[1] - SCALE_SQUARE_MM - HOWTO_BOX_TOP_GAP_MM,
    halfWidthStart: box.halfWidthRange[1] - HOWTO_BOX_WIDTH_MM,
  };

  const placement = howToBoxPlacement(
    layout,
    geometry,
    candidate,
    HOWTO_BOX_WIDTH_MM,
    boxHeightMm,
    nameBlock.placement,
    nameBlock.content.height,
    NAME_BOX_CLEARANCE_MM,
  );

  return { placement, boxWidthMm: HOWTO_BOX_WIDTH_MM, boxHeightMm, lines };
}

/** The nose-page how-to box's own rectangle — computed once so the drawing function and the
 * furniture-collision math in `templatePageZeroFurnitureRects` agree on exactly the same box,
 * including its height, which varies with how many lines defect 1's wrapping produced, AND its
 * position, which now varies with whether the curve clears the outboard spot (quick task
 * 260903-fqv). Converts `computeHowToBoxPlacement`'s station/half-width answer through
 * `stationToY`/`halfWidthToX`, exactly as `drawNameBlock` already does — no placement arithmetic
 * of its own beyond that conversion. */
function howToBoxRect(
  doc: jsPDF,
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  box: TemplatePageBox,
  page: TemplatePage,
  margin: number,
  nameBlock: ResolvedNameBlock,
): { x: number; y: number; width: number; height: number; lines: string[]; position: HowToBoxPlacement["position"] } {
  const { placement, boxWidthMm, boxHeightMm, lines } = computeHowToBoxPlacement(doc, layout, geometry, box, nameBlock);
  return {
    x: halfWidthToX(placement.halfWidthStart, page, margin),
    y: stationToY(placement.topStation, page, margin),
    width: boxWidthMm,
    height: boxHeightMm,
    lines,
    position: placement.position,
  };
}

/** Nose page only. Beside the scale square when the curve clears it (D-10, the founder's chosen
 * spot, costing the board no drawing area); inside the outline under the board name + dims block
 * when it doesn't (quick task 260903-fqv — the blank paper outside the curve on this page is a
 * wedge that only narrows toward the tail, so on a wide-nosed board there is no outboard spot a
 * 70mm box fits into at all). Either way, this is the one thing on the template that prevents the
 * failure a wrong print scale causes silently and expensively. */
function drawHowToBox(
  doc: jsPDF,
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  page: TemplatePage,
  margin: number,
  box: TemplatePageBox,
  nameBlock: ResolvedNameBlock,
): void {
  if (page.index !== 0) return;

  const { x, y, width, height, lines } = howToBoxRect(doc, layout, geometry, box, page, margin, nameBlock);

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
 * (which draws it) and `templatePageZeroFurnitureRects` (which needs the box's real footprint for
 * containment and overlap checks). Exported for testability. */
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

/** Page 0's board name + dims block, resolved ONCE — its content (`nameBlockContent`) and its
 * placement (`nameBlockPlacement`) together — and handed to every drawing path that needs it
 * (quick task 260903-fqv, T-fqv-02). The how-to box now stacks directly under this block, so if
 * the drawing path and a second, independently computed placement ever disagreed, the printed box
 * and the tested box could silently drift apart. `buildTemplatePdf` computes this once per page 0,
 * before its page loop, and passes the same object to both `drawHowToBox` and `drawNameBlock`. */
interface ResolvedNameBlock {
  placement: NameBlockPlacement;
  content: { dimsLines: string[]; height: number };
}

/** Resolves page 0's name block content and placement together (see `ResolvedNameBlock`'s own doc
 * comment for why). `templateHowToWrappedLines` (called by `computeHowToBoxPlacement`, below) and
 * `nameBlockContent` each set their own font family and size before measuring, so calling this
 * ahead of the how-to box's own computation is safe — neither depends on the other's leftover font
 * state; do not "fix" the order back on the assumption that it matters. */
function resolvePageZeroNameBlock(
  doc: jsPDF,
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  dims: BuildTemplatePdfOptions["dims"],
): ResolvedNameBlock {
  const content = nameBlockContent(doc, dims);
  const placement = nameBlockPlacement(layout, geometry, NAME_BOX_WIDTH_MM, content.height, NAME_BOX_CLEARANCE_MM);
  return { placement, content };
}

/** D-08's board name + dims block: a bordered box on page 1 (the nose page), positioned by
 * `nameBlockPlacement` so it's fully contained inside the outline's own interior there —
 * post-checkpoint fix, defect 3: "the Board Name and dimension box needs to be contained INSIDE
 * the board outline on page 1," not floated wherever the board's centre station happens to fall.
 * The box now carries every value the order form's own dimensions row does, not just three of
 * seven, so its real height (name line plus however many lines the fuller dims row wraps to) is
 * computed first and fed into `nameBlockPlacement` — containment wins over a fixed position, so a
 * board whose nose narrows fastest gets the box moved further down page 1 rather than clipped.
 * Takes the already-`resolvePageZeroNameBlock`-resolved block (quick task 260903-fqv) rather than
 * computing its own — the how-to box shares this exact same computation, so the drawn block and
 * the box stacked beneath it can never silently disagree about where the block's bottom edge is. */
function drawNameBlock(
  doc: jsPDF,
  page: TemplatePage,
  margin: number,
  nameBlock: ResolvedNameBlock,
  boardName: string,
): void {
  const { dimsLines, height } = nameBlock.content;
  const { placement } = nameBlock;
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
  const segments = markLineSegments(layout, marks, geometry);
  const tailClosure = computeTailClosure(geometry);
  const tailClosureSeg = tailClosure ? tailClosureSegments(layout, tailClosure) : [];
  const boxes = templatePageBoxes(layout);
  // Resolved once, before the page loop (quick task 260903-fqv): the how-to box now stacks under
  // the name block, so a second, independently computed name placement could put the drawn box
  // and the tested box in different places (T-fqv-02). Safe to hoist ahead of the how-to box's own
  // font measurements — templateHowToWrappedLines and nameBlockContent each set their own font
  // family and size before measuring, so neither depends on the other's leftover font state.
  const nameBlock = resolvePageZeroNameBlock(doc, layout, geometry, dims);

  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper, "portrait");

    drawOutlineCurve(doc, geometry, page, margin);
    drawPageBox(doc, page, boxes[i], margin);
    drawMarks(doc, page, margin, placements, segments);
    drawTailClosure(doc, page, margin, tailClosureSeg);
    drawScaleSquare(doc, page, margin, boxes[i]);
    drawHowToBox(doc, layout, geometry, page, margin, boxes[i], nameBlock);
    drawPageLabel(doc, page, margin, paperDims.width, paperDims.height);
    if (page.index === 0) {
      drawNameBlock(doc, page, margin, nameBlock, boardName);
    }
  });

  return doc;
}

/** A rectangle of drawn page furniture, in one page's own local millimetre frame (the same x/y
 * space `doc.rect`/`doc.text` draw into) — the pure-test half of "furniture never overlaps
 * furniture" (post-checkpoint fix, defect 4). */
export interface TemplateFurnitureRect {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Every piece of fixed furniture the nose page (page 0) draws — scale square, how-to box, and
 * name block — computed exactly the way `buildTemplatePdf` computes them, so a test can assert
 * none of them overlap without re-deriving the drawing math itself. Match marks no longer exist
 * (round 2 post-checkpoint fix, defect 2: replaced by the per-page alignment box), so this list is
 * shorter than it once was. */
export function templatePageZeroFurnitureRects(options: BuildTemplatePdfOptions): TemplateFurnitureRect[] {
  const { layout, geometry, dims, paper } = options;
  const margin = layout.margin;
  const page = layout.pages[0];
  const box = templatePageBoxes(layout)[0];
  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "portrait" });

  const rects: TemplateFurnitureRect[] = [];

  rects.push(scaleSquareRect(box, page, margin));

  // The same resolved name block buildTemplatePdf uses, so the how-to box and the name block this
  // function reports are exactly the ones actually drawn (quick task 260903-fqv, T-fqv-02).
  const nameBlock = resolvePageZeroNameBlock(doc, layout, geometry, dims);

  const howTo = howToBoxRect(doc, layout, geometry, box, page, margin, nameBlock);
  rects.push({ name: "how-to-box", x: howTo.x, y: howTo.y, width: howTo.width, height: howTo.height });

  rects.push({
    name: "name-block",
    x: halfWidthToX(nameBlock.placement.halfWidthStart, page, margin),
    y: stationToY(nameBlock.placement.topStation, page, margin),
    width: NAME_BOX_WIDTH_MM,
    height: nameBlock.content.height,
  });

  return rects;
}

/** The how-to box's placement, box width, box height and wrapped lines, in the board's own
 * station/half-width frame — exported for testability (mirrors `templatePageZeroBoxRect` and
 * `markLabelRect`'s own "exported for testability" pattern) so a test can assert the box clears
 * the curve directly against `sampleOutline` without re-deriving `stationToY`/`halfWidthToX`'s own
 * millimetre conversion. Backed by the exact same `computeHowToBoxPlacement` the drawing path
 * uses. */
export function templateHowToBoxPlacement(
  options: BuildTemplatePdfOptions,
): { placement: HowToBoxPlacement; boxWidthMm: number; boxHeightMm: number; lines: string[] } {
  const { layout, geometry, dims, paper } = options;
  const box = templatePageBoxes(layout)[0];
  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "portrait" });
  const nameBlock = resolvePageZeroNameBlock(doc, layout, geometry, dims);
  return computeHowToBoxPlacement(doc, layout, geometry, box, nameBlock);
}

/** Page 0's own alignment box, converted into the same local millimetre rectangle space
 * `TemplateFurnitureRect` uses — exported so a test can assert every piece of furniture from
 * `templatePageZeroFurnitureRects` is fully contained inside it (round 3 post-checkpoint fix,
 * defect 2: "the 2in box and instructions are not inside the margin/line up lines"), without
 * re-deriving the box's own station/half-width-to-mm conversion. */
export function templatePageZeroBoxRect(layout: TemplateLayout): TemplateFurnitureRect {
  const page = layout.pages[0];
  const box = templatePageBoxes(layout)[0];
  return pageBoxRect(box, page, layout.margin);
}

/** Floating-point slack for `rectContains`' and `rectsOverlap`'s own edge-flush comparisons —
 * furniture anchored flush against another piece's edge (the scale square's bottom edge meeting
 * the how-to box's top edge, or a rect flush with the alignment box's own edge) can land a few
 * ULPs on either side purely from accumulated millimetre arithmetic, not a real containment or
 * overlap. Far smaller than anything a printed page could register. Widened in scope by quick task
 * 260903-fqv: converting the how-to box's outboard position through `howToBoxPlacement`'s
 * station/half-width frame and back is the SAME affine map the old fixed formula used, regrouped —
 * algebraically identical, but two arithmetic paths to the same touching edge can still disagree
 * by a few ULPs (e.g. 68.799999999999997 vs. 68.799999999999954), which used to be enough to trip
 * `rectsOverlap`'s strict inequality even though nothing moved at jsPDF's own 2-decimal-place
 * output precision. */
const RECT_EDGE_EPSILON_MM = 1e-6;

/** True when `inner` is fully contained inside `outer` (within `RECT_EDGE_EPSILON_MM`) — the
 * containment counterpart to `rectsOverlap`'s "these two never touch" check (round 3
 * post-checkpoint fix, defect 2). */
export function rectContains(outer: TemplateFurnitureRect, inner: TemplateFurnitureRect): boolean {
  return (
    inner.x >= outer.x - RECT_EDGE_EPSILON_MM &&
    inner.y >= outer.y - RECT_EDGE_EPSILON_MM &&
    inner.x + inner.width <= outer.x + outer.width + RECT_EDGE_EPSILON_MM &&
    inner.y + inner.height <= outer.y + outer.height + RECT_EDGE_EPSILON_MM
  );
}

/** Axis-aligned rectangle overlap test — exported so the test file can assert on
 * `templatePageZeroFurnitureRects`' output without reimplementing this check itself. Two rects
 * that only TOUCH (edges flush, within `RECT_EDGE_EPSILON_MM`) are never "overlapping" — shrinking
 * each rect inward by that epsilon before comparing keeps a real, many-millimetre overlap reported
 * exactly as before, while a same-edge pair that only disagrees by a few ULPs of floating-point
 * noise (quick task 260903-fqv — see `RECT_EDGE_EPSILON_MM`'s own doc comment) reads as touching,
 * not overlapping. */
export function rectsOverlap(a: TemplateFurnitureRect, b: TemplateFurnitureRect): boolean {
  return (
    a.x < b.x + b.width - RECT_EDGE_EPSILON_MM &&
    a.x + a.width > b.x + RECT_EDGE_EPSILON_MM &&
    a.y < b.y + b.height - RECT_EDGE_EPSILON_MM &&
    a.y + a.height > b.y + RECT_EDGE_EPSILON_MM
  );
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
