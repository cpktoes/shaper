/**
 * Template tile-layout math.
 *
 * New project logic layered on top of the existing `OutlineGeometry` data
 * (lib/geometry/outline.ts) — this is not a port of anything in reference/project/, since the
 * prototype never had a printable-template feature. Computes where each sheet of paper sits over
 * the half outline so a shaper can tape sheets together into a full-size cutting template
 * (TMPL-01).
 *
 * Pure — no jsPDF import, no React, no browser API. The one module that draws this layout onto an
 * actual PDF is `components/template/build-template-pdf.ts`; this file only produces the numbers.
 */

import { MEASURE_STATION_MM, type OutlineGeometry, sampleOutline } from "./outline";
import { type Mm, inchesToMm, mm } from "./units";

/** The board name + dims block's fixed width (D-08) — kept here, next to
 * `nameBlockPlacement`, rather than in the drawing module, so the geometry that decides WHERE the
 * box goes and the size that decides WHETHER it fits stay a single source of truth (post-checkpoint
 * fix, defect 3: the box must be verifiably contained inside the outline, not just placed). Widened
 * from the box's original 45mm to hold the full order-form dimensions row (length, nose,
 * widepoint, offset, tail, thickness, volume) alongside the board name, per the coordinator's
 * refinement to defect 3. */
export const NAME_BOX_WIDTH_MM = 74;
/** The box's height when it holds only the board name and no dims row — a lower bound used as
 * `nameBlockPlacement`'s default; the real drawn box is taller (the drawing module computes its
 * actual height from however many lines the dims row wraps to, and passes that in explicitly). */
export const NAME_BOX_HEIGHT_MM = 20;
/** How far the box's left edge sits out from the stringer (half-width 0). */
export const NAME_BOX_CLEARANCE_MM = 4;

/** Paper sizes this phase supports — a closed compile-time union, never a validated free string
 * (RESEARCH.md V5). */
export type PaperSize = "letter" | "a4";

/** Physical paper dimensions in millimetres, portrait orientation (height is the long edge on
 * both sizes) — the long edge tiles the station (nose-to-tail) axis, the short edge tiles the
 * half-width (stringer-to-rail) axis, matching `computeTemplateLayout`'s row/column mapping. */
export const PAPER_MM: Record<PaperSize, { width: Mm; height: Mm }> = {
  letter: { width: mm(215.9), height: mm(279.4) },
  a4: { width: mm(210), height: mm(297) },
};

/** Printable margin kept blank on every edge of every page. */
export const TEMPLATE_MARGIN_MM = mm(10);
/** Overlap between adjacent tiles in both directions — D-09 grants the exact size to Claude's
 * discretion; named here so it is never inlined as a magic number at a call site. */
export const TEMPLATE_OVERLAP_MM = inchesToMm(0.5);

/** One page of the tile grid — the station and half-width range of the board it covers, in the
 * reading order the shaper tapes them in. */
export interface TemplatePage {
  /** 0-based reading order: nose row first, then stringer-outward within each row. */
  index: number;
  /** 0 = the nose-most station band; rows advance toward the tail. */
  row: number;
  /** 0 = the column touching the stringer (half-width 0); columns advance outward. */
  col: number;
  /** [start, end] in millimetres along the station axis (0 = tail, geometry.length = nose). May
   * run slightly past 0 or `geometry.length` on an end page — that's blank paper past the
   * board's own edge, not a gap in coverage. */
  stationRange: [Mm, Mm];
  /** [start, end] in millimetres along the half-width axis (0 = stringer). */
  halfWidthRange: [Mm, Mm];
  /** "Page {n} of {total} — nose to tail". */
  label: string;
}

/** The complete tile grid for one board at one paper size. */
export interface TemplateLayout {
  pages: TemplatePage[];
  columns: number;
  rows: number;
  paper: PaperSize;
  margin: Mm;
  overlap: Mm;
}

/** The four measuring-station marks a future plan draws onto the template (D-09) — computed here
 * because they come from the same `OutlineGeometry` this module already reads, even though this
 * plan's PDF renderer does not draw them yet. */
export interface TemplateMarks {
  noseTwelve: Mm;
  tailTwelve: Mm;
  center: Mm;
  widepoint: Mm;
  /** The squared tail-block cut line's station — the outline curve's own tail knot
   * (`geometry.tailPodStation`), where the rail curve meets the tailblock's own half-width before
   * a real board would close that edge off square to the stringer. Present only when the tail
   * actually has a squared block (`geometry.halfTailBlockWidth > 0`) — a pin or round tail's curve
   * already narrows to meet the stringer at station 0 on its own, so there is no separate block
   * edge to mark (round 2 post-checkpoint fix, defect 1: "the tip of the tail... is not
   * printing"). */
  tailBlock?: Mm;
}

/** How many fixed-size, constant-step tiles of `usable` millimetres (each overlapping the next by
 * exactly `overlap`) it takes to cover a span of `span` millimetres. A single tile always
 * suffices when `usable` already covers the whole span. */
function tileCount(span: number, usable: number, overlap: number): number {
  if (span <= usable) return 1;
  const step = usable - overlap;
  return Math.ceil((span - usable) / step) + 1;
}

/** Builds `count` fixed-size windows of `usable` millimetres, stepped by `usable - overlap`, so
 * every consecutive pair overlaps by exactly `overlap`. `fromEnd` flips the walk so index 0 sits
 * flush with `span` (used for the station axis, so row 0 is nose-most) instead of flush with 0
 * (used for the half-width axis, so column 0 touches the stringer). The final window in either
 * direction may run past the opposite edge — that is blank paper past the board's own edge, not a
 * gap in coverage. */
function buildWindows(
  span: number,
  usable: number,
  overlap: number,
  count: number,
  fromEnd: boolean,
): [number, number][] {
  const step = usable - overlap;
  const windows: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const start = fromEnd ? span - usable - i * step : i * step;
    windows.push([start, start + usable]);
  }
  return windows;
}

/**
 * Tiles the rectangle spanning station 0..geometry.length by half-width 0..geometry.halfWidePointWidth
 * into a two-dimensional page grid — never a one-column list, because
 * `WIDEPOINT_WIDTH_RANGE_IN.max` (25in, half-width 12.5in) genuinely exceeds one page's usable
 * width on both supported paper sizes. Page order runs nose to tail, row-major: row 0 is the
 * nose-most station band, and within a row, column 0 is the one touching the stringer.
 */
export function computeTemplateLayout(
  geometry: OutlineGeometry,
  paper: PaperSize,
  margin: Mm = TEMPLATE_MARGIN_MM,
  overlap: Mm = TEMPLATE_OVERLAP_MM,
): TemplateLayout {
  const paperSize = PAPER_MM[paper];
  const usableStation = paperSize.height - 2 * margin;
  const usableHalfWidth = paperSize.width - 2 * margin;

  const rows = tileCount(geometry.length, usableStation, overlap);
  const columns = tileCount(geometry.halfWidePointWidth, usableHalfWidth, overlap);

  const stationWindows = buildWindows(geometry.length, usableStation, overlap, rows, true);
  const halfWidthWindows = buildWindows(geometry.halfWidePointWidth, usableHalfWidth, overlap, columns, false);

  const total = rows * columns;
  const pages: TemplatePage[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      const [stationStart, stationEnd] = stationWindows[row];
      const [halfStart, halfEnd] = halfWidthWindows[col];
      pages.push({
        index,
        row,
        col,
        stationRange: [mm(stationStart), mm(stationEnd)],
        halfWidthRange: [mm(halfStart), mm(halfEnd)],
        label: `Page ${index + 1} of ${total} — nose to tail`,
      });
    }
  }

  return { pages, columns, rows, paper, margin, overlap };
}

/** The four measuring-station marks, expressed on this board's own station axis — plus the
 * tailblock mark (round 2 post-checkpoint fix, defect 1) when this tail actually has a squared
 * block to close off. */
export function computeTemplateMarks(geometry: OutlineGeometry): TemplateMarks {
  const marks: TemplateMarks = {
    tailTwelve: MEASURE_STATION_MM,
    noseTwelve: mm(geometry.length - MEASURE_STATION_MM),
    center: mm(geometry.length / 2),
    widepoint: geometry.widePointStation,
  };
  if (geometry.halfTailBlockWidth > 0) {
    marks.tailBlock = geometry.tailPodStation;
  }
  return marks;
}

/** The label text printed beside each working mark's tick (D-06 — the four station marks, no
 * every-12in ladder — plus "Tail Block" for tails that have a squared end to close off). */
const MARK_LABELS: Record<keyof TemplateMarks, string> = {
  noseTwelve: 'Nose 12"',
  tailTwelve: 'Tail 12"',
  center: "Centre",
  widepoint: "Wide point",
  tailBlock: "Tail Block",
};

/** Where one working mark's tick is drawn, in the drawing module's own coordinate inputs — a page
 * index plus the same absolute-station/half-width values `stationToY`/`halfWidthToX` already
 * consume for the outline curve, so the drawing module still computes no page arithmetic of its
 * own (only jsPDF calls). */
export interface TemplateMarkPlacement {
  mark: keyof TemplateMarks;
  /** Index into `TemplateLayout.pages` whose `stationRange` contains this mark's station. */
  pageIndex: number;
  /** The mark's station, in the board's own absolute station frame (0 = tail). */
  station: Mm;
  /** How far the tick spans out from the stringer (half-width 0) to the outline curve at this
   * station — `sampleOutline(geometry, station)`. */
  halfWidthExtent: Mm;
  label: string;
}

/**
 * Places the four working marks (D-06) onto the pages that carry them. Only column-0 pages carry
 * marks — a tick always starts at the stringer (half-width 0), which only column 0 touches. When a
 * mark's station falls inside a row overlap band it belongs to two pages, so it is returned twice
 * (once per page) rather than being lost when the shaper trims one of the overlapping edges.
 */
export function markPlacements(
  layout: TemplateLayout,
  marks: TemplateMarks,
  geometry: OutlineGeometry,
): TemplateMarkPlacement[] {
  const placements: TemplateMarkPlacement[] = [];
  const markNames = Object.keys(marks) as (keyof TemplateMarks)[];

  for (const markName of markNames) {
    const station = marks[markName];
    if (station === undefined) continue; // tailBlock is absent for a pin/round tail
    const halfWidthExtent = sampleOutline(geometry, station);
    const pages = layout.pages.filter(
      (page) => page.col === 0 && station >= page.stationRange[0] && station <= page.stationRange[1],
    );
    for (const page of pages) {
      placements.push({
        mark: markName,
        pageIndex: page.index,
        station,
        halfWidthExtent,
        label: MARK_LABELS[markName],
      });
    }
  }

  return placements;
}

/**
 * One page's own alignment box, in the board's own absolute station/half-width frame — the trim
 * line a shaper lines sheets up against, drawn on every page (round 2 post-checkpoint fix,
 * defect 2: match-mark crosshairs replaced by a border, per the iShaper reference template).
 *
 * The box is NOT a hard clip boundary — the outline curve and the stringer line still draw all
 * the way out to the page's own full printable edge (`TemplatePage.stationRange` /
 * `halfWidthRange`), past the box line, into the overlap strip it shares with a neighbouring
 * page. That strip is the point: taping two sheets together means sliding one under the other
 * until the curve drawn in each sheet's own overlap strip lines up with the neighbour's, which is
 * only possible if the curve keeps drawing past the box line rather than stopping at it.
 *
 * On any edge with a neighbouring page in that direction, the box line sits `layout.overlap`
 * inset from this page's own printable edge — the strip between the box line and the printable
 * edge is exactly the shared duplicate-content zone. On an edge with no neighbour (an outer edge
 * of the whole grid), the box line sits flush with the printable edge itself — nothing to
 * duplicate there.
 */
export interface TemplatePageBox {
  pageIndex: number;
  /** [start, end] station bounds of this page's own alignment box. */
  stationRange: [Mm, Mm];
  /** [start, end] half-width bounds of this page's own alignment box. */
  halfWidthRange: [Mm, Mm];
  /** True only for a column-0 page — its left edge (half-width 0) IS the stringer, the board's
   * own centreline, drawn dashed; every other edge on every page is a plain solid trim line. */
  stringerEdge: boolean;
}

/** Builds every page's own alignment box (see `TemplatePageBox`) from the layout's existing tile
 * grid and overlap — a page's box is inset from its own printable edge by `layout.overlap` on any
 * side that borders another page, and flush with the printable edge on any side that doesn't. */
export function templatePageBoxes(layout: TemplateLayout): TemplatePageBox[] {
  return layout.pages.map((page) => {
    const hasNoseNeighbor = page.row > 0;
    const hasTailNeighbor = page.row < layout.rows - 1;
    const hasInwardNeighbor = page.col > 0;
    const hasOutwardNeighbor = page.col < layout.columns - 1;

    const stationTop = page.stationRange[1] - (hasNoseNeighbor ? layout.overlap : 0);
    const stationBottom = page.stationRange[0] + (hasTailNeighbor ? layout.overlap : 0);
    const halfWidthLeft = page.halfWidthRange[0] + (hasInwardNeighbor ? layout.overlap : 0);
    const halfWidthRight = page.halfWidthRange[1] - (hasOutwardNeighbor ? layout.overlap : 0);

    return {
      pageIndex: page.index,
      stationRange: [mm(stationBottom), mm(stationTop)],
      halfWidthRange: [mm(halfWidthLeft), mm(halfWidthRight)],
      stringerEdge: page.col === 0,
    };
  });
}

const NAME_BLOCK_SEARCH_STEP_MM = 1;
/** Interior samples checked across the box's own height, so a non-monotonic taper can't sneak a
 * narrow point between two endpoint samples. */
const NAME_BLOCK_HEIGHT_SAMPLES = 5;

function minHalfWidthOverStationSpan(geometry: OutlineGeometry, top: number, bottom: number): number {
  let min = Infinity;
  for (let i = 0; i <= NAME_BLOCK_HEIGHT_SAMPLES; i++) {
    const station = bottom + ((top - bottom) * i) / NAME_BLOCK_HEIGHT_SAMPLES;
    min = Math.min(min, sampleOutline(geometry, mm(station)));
  }
  return min;
}

/** Where the board name + dims block's top-left corner goes on page 0 (the nose page) — the
 * station of its nose-most edge, and its left edge's clearance from the stringer. Chosen so every
 * corner of the fixed-size box lands inside the outline (post-checkpoint fix, defect 3: "the Board
 * Name and dimension box needs to be contained INSIDE the board outline on page 1"), scanning down
 * from the nose tip until the outline is wide enough, over the box's whole height, to hold it.
 *
 * Also keeps the box's bottom edge clear of the row-overlap band page 0 shares with the next page
 * down — that band is the shared duplicate-content strip `templatePageBoxes` marks off with its
 * own box line, so the name block's own furniture never sits inside it either.
 */
export interface NameBlockPlacement {
  pageIndex: number;
  /** The box's nose-most (top) edge, in the board's own absolute station frame. */
  topStation: Mm;
  /** The box's left edge, measured out from the stringer (half-width 0). */
  halfWidthStart: Mm;
}

export function nameBlockPlacement(
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  boxWidthMm: number = NAME_BOX_WIDTH_MM,
  boxHeightMm: number = NAME_BOX_HEIGHT_MM,
  clearanceMm: number = NAME_BOX_CLEARANCE_MM,
): NameBlockPlacement {
  const page = layout.pages.find((p) => p.index === 0) ?? layout.pages[0];
  const halfWidthStart = mm(clearanceMm);
  const requiredHalfWidth = clearanceMm + boxWidthMm;

  const overlapReserve = layout.rows > 1 ? layout.overlap : 0;
  const searchFloor = page.stationRange[0] + overlapReserve;
  const searchCeiling = Math.min(page.stationRange[1], geometry.length);

  for (
    let candidate = searchCeiling;
    candidate - boxHeightMm >= searchFloor;
    candidate -= NAME_BLOCK_SEARCH_STEP_MM
  ) {
    const bottom = candidate - boxHeightMm;
    if (minHalfWidthOverStationSpan(geometry, candidate, bottom) >= requiredHalfWidth) {
      return { pageIndex: page.index, topStation: mm(candidate), halfWidthStart };
    }
  }

  // No station band on page 0 clears the box at full width (an unusually narrow-nosed board) —
  // fall back to the widest band searched, deepest into page 0, rather than the narrowest.
  const fallbackTop = Math.max(searchFloor + boxHeightMm, searchCeiling);
  return { pageIndex: page.index, topStation: mm(fallbackTop), halfWidthStart };
}
