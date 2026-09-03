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
import { type Mm, formatInchesFraction, inchesToMm, mm } from "./units";

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
/** The 4mm-of-daylight rule for page-0 furniture generally (quick task 260903-18d — "give the 4mm
 * of clearance on both template prints" — broadened by quick task 260903-fqv to also govern the
 * how-to box): a box's inboard edge sits this far out from the stringer (half-width 0), AND the
 * outline curve itself must clear a box's outboard edge by this same distance, so a shaper
 * cutting the template along the curve never slices through it. One constant, one rule, used the
 * same way at every call site — `nameBlockPlacement` and `howToBoxPlacement` (the tiled sheet) and
 * `scanPagesForNameBlock` (the Paper Saver strip). */
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
  /** Extra vertical nudge (millimetres, added on top of the label's normal tick-relative
   * position — positive moves the label toward the tail, negative toward the nose) applied only
   * when this placement's own station sits close enough to another mark's that the two printed
   * labels would otherwise overprint (round 4 post-checkpoint fix, defect 1: "Center and
   * widepoint dims overlap when close to eachother or equal"). Zero for every mark except CENTER
   * and WIDEPOINT when `resolveCenterWidepointLabelCollision` finds them within
   * `MARK_LABEL_COLLISION_THRESHOLD_MM`. */
  labelOffsetMm: Mm;
}

/** How close the CENTER and WIDEPOINT marks' own stations can sit, in millimetres, before their
 * printed dimension labels risk visually overlapping — a shaper's own widepoint-offset input can
 * push these two arbitrarily close together (unlike the fixed 12in stations, which never move),
 * so this pair alone needs collision handling (round 4 post-checkpoint fix, defect 1). Sized
 * comfortably above one printed label line's own height plus its tick offset (9pt text is
 * roughly 3.2mm tall; `MARK_LABEL_OFFSET_MM` in `build-template-pdf.ts` adds another 2mm), so
 * pushing each label half this distance away from the pair's shared station (see
 * `resolveCenterWidepointLabelCollision`) always leaves the two label rows clear of each other. */
export const MARK_LABEL_COLLISION_THRESHOLD_MM = 10;
/** Below this separation, two stations are the same station for print purposes — the widepoint
 * sitting dead-on centre (a zero offset) is the common case, and floating-point arithmetic on an
 * exact zero offset can still leave a few ULPs of "difference" that would otherwise dodge a
 * strict `=== 0` check. */
const MARK_LABEL_COINCIDENT_EPSILON_MM = 1e-6;

/**
 * Places the four working marks (D-06) onto the pages that carry them. Only column-0 pages carry
 * marks — a tick always starts at the stringer (half-width 0), which only column 0 touches. When a
 * mark's station falls inside a row overlap band it belongs to two pages, so it is returned twice
 * (once per page) rather than being lost when the shaper trims one of the overlapping edges.
 *
 * CENTER and WIDEPOINT run through `resolveCenterWidepointLabelCollision` before returning (round
 * 4 post-checkpoint fix, defect 1) — every other mark's placement is unaffected.
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
        labelOffsetMm: mm(0),
      });
    }
  }

  return resolveCenterWidepointLabelCollision(placements);
}

/**
 * Merges or stacks the CENTER and WIDEPOINT labels when their stations sit close enough that the
 * printed labels `drawMarks` draws (`components/template/build-template-pdf.ts`) would otherwise
 * overprint each other (round 4 post-checkpoint fix, defect 1: "Center and widepoint dims overlap
 * when close to eachother or equal"). Runs per page, since a mark straddling a row-overlap band
 * produces one placement per page it touches (`markPlacements`, above) and each page's own pair
 * needs its own, independent resolution:
 *
 * - **Coincident** (station difference below `MARK_LABEL_COINCIDENT_EPSILON_MM` — a widepoint
 *   offset of exactly zero is the common case): the two marks are, for print purposes, the same
 *   station, so they merge into one combined placement, labeled `"Widepoint / Center"` — the same
 *   pairing and ordering the Overview Sheet's own coincident case already uses
 *   (`build-overview-pdf.ts`'s `"WIDEPOINT / CENTER"` line), just in this file's own Title Case
 *   label style. The WIDEPOINT placement is dropped entirely; the CENTER placement carries the
 *   merged label forward (an arbitrary but consistent choice — both stations, and therefore both
 *   dimensions, are identical at this point).
 * - **Close** (within `MARK_LABEL_COLLISION_THRESHOLD_MM` but not coincident): both labels stay,
 *   each nudged half the threshold away from the pair's shared station via `labelOffsetMm` — the
 *   more nose-ward mark (the larger station — station 0 is the tail) moves further toward the
 *   nose, the other further toward the tail — so the two rows of text end up separated by exactly
 *   the threshold distance regardless of how small their true station difference is.
 * - **Far apart**: both placements pass through unchanged — their natural tick-relative positions
 *   already have room.
 */
function resolveCenterWidepointLabelCollision(
  placements: TemplateMarkPlacement[],
): TemplateMarkPlacement[] {
  const byPage = new Map<number, TemplateMarkPlacement[]>();
  for (const placement of placements) {
    const list = byPage.get(placement.pageIndex);
    if (list) {
      list.push(placement);
    } else {
      byPage.set(placement.pageIndex, [placement]);
    }
  }

  const result: TemplateMarkPlacement[] = [];
  for (const pagePlacements of byPage.values()) {
    const center = pagePlacements.find((p) => p.mark === "center");
    const widepoint = pagePlacements.find((p) => p.mark === "widepoint");
    for (const placement of pagePlacements) {
      if (placement.mark !== "center" && placement.mark !== "widepoint") result.push(placement);
    }

    if (!center || !widepoint) {
      if (center) result.push(center);
      if (widepoint) result.push(widepoint);
      continue;
    }

    const diff = Math.abs(center.station - widepoint.station);
    if (diff < MARK_LABEL_COINCIDENT_EPSILON_MM) {
      result.push({ ...center, label: "Widepoint / Center" });
      continue;
    }

    if (diff < MARK_LABEL_COLLISION_THRESHOLD_MM) {
      const half = mm(MARK_LABEL_COLLISION_THRESHOLD_MM / 2);
      const centerIsNoseward = center.station >= widepoint.station;
      result.push({ ...center, labelOffsetMm: mm(centerIsNoseward ? -half : half) });
      result.push({ ...widepoint, labelOffsetMm: mm(centerIsNoseward ? half : -half) });
      continue;
    }

    result.push(center, widepoint);
  }

  return result;
}

/** One page's own clipped portion of a working mark's stringer-to-curve line (round 3
 * post-checkpoint fix, defect 1: "the station lines should terminate at the outline curve" — the
 * earlier attempt at extending the dashed lines all the way to the page's own printable edge was
 * the wrong fix; the real bug was that a wide board's line, which needs to keep going from the
 * stringer out to the curve across MORE than one column's page, only ever got drawn on the
 * column-0 page, so it visually stopped at that page's own edge well short of the curve, which
 * lives on the neighbouring column's sheet). */
export interface TemplateMarkLineSegment {
  mark: keyof TemplateMarks;
  /** Which page this segment is drawn on. */
  pageIndex: number;
  /** The mark's station, in the board's own absolute station frame. */
  station: Mm;
  /** [start, end] half-width bounds of THIS page's own portion of the full stringer (0) to curve
   * (`halfWidthExtent`) span, clipped to this page's own printable half-width range — including
   * into the overlap strip it shares with a column neighbour, exactly like the outline curve
   * itself is clipped per page. Never runs past `halfWidthExtent` into blank paper on the last
   * page a mark's line touches. */
  halfWidthRange: [Mm, Mm];
  /** True only for the column-0 page — the one page in a mark's span whose printed dimension
   * label stays inside the box region, never following the line out into a further column's
   * overlap strip. */
  hasLabel: boolean;
  /** The board's own full half-width at this mark's station (`sampleOutline`) — the line's true,
   * unclipped end point; the same value on every segment this mark produces. */
  halfWidthExtent: Mm;
  label: string;
}

/**
 * Splits every working mark's full stringer-to-curve line into the one or more page-local
 * segments needed to draw it in full across a multi-column board — a tick always starts at the
 * stringer (half-width 0, which only column 0 touches) and always ends exactly at the curve
 * (`sampleOutline` at that station), but on a board wide enough to tile more than one column (the
 * widepoint, by definition the board's widest point, routinely is), that span crosses into a
 * second or third column's own page. Each page this span touches gets its own clipped segment
 * here; `hasLabel` marks the single column-0 segment that also carries the printed dimension
 * text. A mark whose station falls inside a row-overlap band produces this same set of segments
 * once per overlapping row, exactly as `markPlacements` already does for the label placement
 * itself.
 *
 * `tailBlock` is deliberately excluded (round 4 post-checkpoint fix, defect 2: "Swallow and
 * diamond tail appears like a squash") — a straight stringer-to-curve tick at a single station is
 * only correct for a squash tail; diamond and swallow need the genuinely diagonal cut
 * `computeTailClosure` / `tailClosureSegments` produce instead. The tailBlock mark's LABEL still
 * comes from `markPlacements`, unaffected — only this line-drawing function skips it.
 */
export function markLineSegments(
  layout: TemplateLayout,
  marks: TemplateMarks,
  geometry: OutlineGeometry,
): TemplateMarkLineSegment[] {
  const segments: TemplateMarkLineSegment[] = [];
  const markNames = Object.keys(marks) as (keyof TemplateMarks)[];

  for (const markName of markNames) {
    if (markName === "tailBlock") continue; // drawn separately by tailClosureSegments
    const station = marks[markName];
    if (station === undefined) continue; // tailBlock is absent for a pin/round tail
    const halfWidthExtent = sampleOutline(geometry, station);

    const rows = layout.pages
      .filter((page) => page.col === 0 && station >= page.stationRange[0] && station <= page.stationRange[1])
      .map((page) => page.row);

    for (const row of rows) {
      const rowPages = layout.pages.filter((page) => page.row === row).sort((a, b) => a.col - b.col);

      for (const page of rowPages) {
        const start = Math.max(page.halfWidthRange[0], 0);
        const end = Math.min(page.halfWidthRange[1], halfWidthExtent);
        if (end <= start) {
          if (page.halfWidthRange[0] >= halfWidthExtent) break; // no further column reaches the curve
          continue;
        }
        segments.push({
          mark: markName,
          pageIndex: page.index,
          station,
          halfWidthRange: [mm(start), mm(end)],
          hasLabel: page.col === 0,
          halfWidthExtent,
          label: MARK_LABELS[markName],
        });
      }
    }
  }

  return segments;
}

/** Guard against dividing by a direction component that is (numerically) zero, when clipping the
 * tail closure line against a page's own rectangle — matches `outline.ts`'s own `EPSILON`. */
const TAIL_CLOSURE_EPSILON = 1e-6;

/** One endpoint of the tail-closure line, in the board's own absolute station/half-width frame. */
export interface TailClosurePoint {
  station: Mm;
  halfWidth: Mm;
}

/** The tail's true closing edge — the actual cut a shaper makes between the rail corner (where
 * the outline curve itself starts, `geometry.tailPodStation`) and the stringer (half-width 0).
 * `undefined` for a pin or round tail (`geometry.halfTailBlockWidth === 0`) — the curve already
 * narrows to meet the stringer at the tail on its own, with no separate closing edge to cut. */
export interface TailClosure {
  /** The rail corner — where the outline curve's own tail knot sits. */
  corner: TailClosurePoint;
  /** The stringer point the corner closes to — half-width 0, at the tip's own station. */
  tip: TailClosurePoint;
}

/**
 * The tail's true closing edge (round 4 post-checkpoint fix, defect 2: "Swallow and diamond tail
 * appears like a squash — it doesn't reflect the depth"). The earlier template drew a single
 * straight tick at `geometry.tailPodStation`, from the stringer to the curve — correct only for a
 * squash tail, whose corner and tip genuinely share one station. A diamond's corner sits FORWARD
 * of its own tip (the point extends aft, past the corners, to the stringer); a swallow's notch
 * point sits forward of ITS corner (the V cuts back toward the nose at the stringer). Using the
 * corner's own station for both ends — what the old tick did — silently erased that depth on
 * both shapes, printing them like a squash.
 *
 * No `TailShape`/`OutlineSpec` import needed here: `OutlineGeometry` already carries the right
 * station in the right field for every tail kind, by construction of `buildOutline`
 * (`lib/geometry/outline.ts`):
 * - `tailPodStation` — the corner's own station. Zero for squash and swallow (the curve's tail
 *   knot sits flush with the tail edge); the diamond's own capped depth for diamond (the P0 knot
 *   `buildOutline` places at `effectiveDiamondDepth`).
 * - `centreCloseStation` — the tip's own station. Zero for squash and diamond (the tip sits at
 *   the tail edge); the swallow's own crotch depth for swallow.
 *
 * A squash tail's corner and tip both resolve to station 0, so this collapses back to the same
 * straight cut the old code drew — no behaviour change there.
 */
export function computeTailClosure(geometry: OutlineGeometry): TailClosure | undefined {
  if (geometry.halfTailBlockWidth <= 0) return undefined; // pin/round — no separate block to close
  return {
    corner: { station: geometry.tailPodStation, halfWidth: geometry.halfTailBlockWidth },
    tip: { station: geometry.centreCloseStation, halfWidth: mm(0) },
  };
}

/** One page's own clipped portion of the tail closure line — mirrors `TemplateMarkLineSegment`'s
 * own per-page splitting, but for a genuinely diagonal line (a wide tail block's corner can sit
 * more than one column out from the stringer) rather than a horizontal tick. */
export interface TailClosureSegment {
  pageIndex: number;
  from: TailClosurePoint;
  to: TailClosurePoint;
}

/** Clips a straight line segment (in station/half-width space) to a page's own printable
 * rectangle — standard Liang-Barsky parametric clipping, since (unlike every other line this
 * module draws) the tail closure line is not axis-aligned. Returns `null` when the segment never
 * crosses the rectangle at all. */
function clipSegmentToPageRect(
  from: TailClosurePoint,
  to: TailClosurePoint,
  stationRange: [Mm, Mm],
  halfWidthRange: [Mm, Mm],
): [TailClosurePoint, TailClosurePoint] | null {
  let t0 = 0;
  let t1 = 1;
  const dStation = to.station - from.station;
  const dHalfWidth = to.halfWidth - from.halfWidth;

  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < TAIL_CLOSURE_EPSILON) return q >= 0; // parallel to this boundary
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  const accepted =
    clip(-dStation, from.station - stationRange[0]) &&
    clip(dStation, stationRange[1] - from.station) &&
    clip(-dHalfWidth, from.halfWidth - halfWidthRange[0]) &&
    clip(dHalfWidth, halfWidthRange[1] - from.halfWidth);

  if (!accepted || t1 < t0) return null;

  return [
    { station: mm(from.station + t0 * dStation), halfWidth: mm(from.halfWidth + t0 * dHalfWidth) },
    { station: mm(from.station + t1 * dStation), halfWidth: mm(from.halfWidth + t1 * dHalfWidth) },
  ];
}

/**
 * Splits the tail's true closing edge (`computeTailClosure`) into the one or more page-local
 * segments needed to draw it in full — every page whose own printable rectangle the line actually
 * crosses gets its own clipped segment, so a wide tail block's corner (more than one column out
 * from the stringer) still draws its full closing cut across every sheet it touches, the same way
 * `markLineSegments` already does for the other working marks.
 */
export function tailClosureSegments(layout: TemplateLayout, closure: TailClosure): TailClosureSegment[] {
  const segments: TailClosureSegment[] = [];
  for (const page of layout.pages) {
    const clipped = clipSegmentToPageRect(closure.corner, closure.tip, page.stationRange, page.halfWidthRange);
    if (!clipped) continue;
    const [from, to] = clipped;
    const degenerate =
      Math.abs(from.station - to.station) < TAIL_CLOSURE_EPSILON &&
      Math.abs(from.halfWidth - to.halfWidth) < TAIL_CLOSURE_EPSILON;
    if (degenerate) continue;
    segments.push({ pageIndex: page.index, from, to });
  }
  return segments;
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
 * from the nose tip until the outline is wide enough, over the box's whole height, to hold the box
 * AND leave `NAME_BOX_CLEARANCE_MM` of daylight between the box's own right (outboard) edge and
 * the curve — the same clearance the box's left (inboard) edge already keeps off the stringer
 * (quick task 260903-18d — "give the 4mm of clearance on both template prints").
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
  // Reserves clearanceMm on BOTH sides of the box: the existing inboard gap off the stringer
  // (already baked into halfWidthStart, added here again as the left edge's own contribution to
  // the required span) plus a second, outboard clearanceMm the curve itself must clear past the
  // box's own right edge (quick task 260903-18d — "give the 4mm of clearance on both template
  // prints"). The stringer-side clearance itself is unchanged; only this required-half-width total
  // grew, from `clearanceMm + boxWidthMm` to `clearanceMm + boxWidthMm + clearanceMm`.
  const requiredHalfWidth = clearanceMm + boxWidthMm + clearanceMm;

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
  // fall back to the widest band searched, deepest into page 0, rather than the narrowest: that's
  // the candidate whose bottom edge sits exactly at searchFloor, i.e. topStation = searchFloor +
  // boxHeightMm (WR-03 fix — this used to be Math.max, which picked searchCeiling instead, the
  // SAME nose-tip-most/narrowest band the loop above had already tried and rejected first).
  //
  // Clamp to searchCeiling (page 0's own nose-most printable edge) for the rarer case where the
  // box is taller than the ENTIRE available band (searchFloor + boxHeightMm > searchCeiling) —
  // unclamped, that candidate would sit partly or fully past the page's own printable range, i.e.
  // off the sheet. Clamping accepts the box may then run a little past searchFloor at the bottom
  // instead, which is the lesser problem: that edge only borders the shared overlap strip with the
  // next page down, not the edge of the printed sheet itself.
  const fallbackTop = Math.min(searchFloor + boxHeightMm, searchCeiling);
  return { pageIndex: page.index, topStation: mm(fallbackTop), halfWidthStart };
}

/** Fine sampling step for `howToBoxPlacement`'s own outboard-clearance and interior-containment
 * checks (quick task 260903-fqv) — a named constant so the step is never inlined as a bare `1`.
 * The existing `NAME_BLOCK_HEIGHT_SAMPLES` (5 samples) is deliberately NOT reused here: five
 * samples across a 46mm-tall how-to box are roughly 9mm apart, which is fine for a MINIMUM (a
 * narrow point missed between two samples only makes the check more conservative than it needs to
 * be) but wrong in the unsafe direction for a MAXIMUM — the curve's true widest point, hiding
 * between two 9mm-apart samples, could sit outside the box while a coarse scan reports the box
 * clear. */
const HOWTO_BOX_FINE_SAMPLE_STEP_MM = 1;

/** The minimum AND maximum outline half-width over a station span, sampled every
 * `HOWTO_BOX_FINE_SAMPLE_STEP_MM` millimetres and folding in both endpoints explicitly — a
 * floating-point `station += step` accumulation can stop a fraction short of `top`, silently
 * skipping the exact sample a maximum check depends on. Used by `howToBoxPlacement` and
 * `scaleSquarePlacement` (quick task 260903-h7t); the existing `minHalfWidthOverStationSpan` above
 * keeps its original 5-sample coarseness for `nameBlockPlacement`, unmodified. */
function minMaxHalfWidthOverStationSpanFine(
  geometry: OutlineGeometry,
  top: number,
  bottom: number,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let station = bottom; station < top; station += HOWTO_BOX_FINE_SAMPLE_STEP_MM) {
    const halfWidth = sampleOutline(geometry, mm(station));
    min = Math.min(min, halfWidth);
    max = Math.max(max, halfWidth);
  }
  // Fold in both endpoints explicitly, regardless of where the loop above stopped.
  const bottomHalfWidth = sampleOutline(geometry, mm(bottom));
  const topHalfWidth = sampleOutline(geometry, mm(top));
  min = Math.min(min, bottomHalfWidth, topHalfWidth);
  max = Math.max(max, bottomHalfWidth, topHalfWidth);
  return { min, max };
}

/** Where the how-to instruction box goes on page 0 (quick task 260903-fqv) — beside the scale
 * square by default (D-10), or inside the outline under the board name + dims block when the
 * outline curve runs through the outboard spot instead. */
export interface HowToBoxPlacement {
  pageIndex: number;
  /** The box's nose-most (top) edge, in the board's own absolute station frame. */
  topStation: Mm;
  /** The box's left edge, measured out from the stringer (half-width 0). */
  halfWidthStart: Mm;
  /** Which of the two placements this is — kept on the result so a caller (and a test) can name
   * the branch without re-deriving the clearance check. */
  position: "outboard" | "interior";
}

/**
 * Decides where the how-to instruction box goes on page 0 (quick task 260903-fqv — the rail curve
 * was running straight through it on a wide-nosed board). `candidate` is the caller's outboard
 * proposal — today's fixed spot beside the scale square, expressed in the board's own
 * station/half-width frame rather than page-local millimetres.
 *
 * **Outboard is preferred** (D-10 — "beside the scale square" — costs the board no drawing area):
 * kept whenever the outline curve's MAXIMUM half-width anywhere across the candidate's own station
 * span clears the candidate's own curve-side edge by at least `clearanceMm`. The maximum, not the
 * minimum, because clearance is measured from the box's edge inward — the curve's single widest
 * point anywhere in the box's height is the one point that can reach into it.
 *
 * **Interior is the fallback**: on a wide nose there is no outboard position on page 0 that a
 * 70mm box fits into at all — the blank paper outside the curve on that page is a wedge that only
 * narrows toward the tail, so a narrower or taller box only makes it worse. The box instead stacks
 * directly under the board name + dims block (`nameBlockPlacement`'s own result), `clearanceMm`
 * below its bottom edge and `clearanceMm` off the stringer, then scans toward the tail in
 * `NAME_BLOCK_SEARCH_STEP_MM` steps — exactly the way `nameBlockPlacement` itself scans — until a
 * station band clears the curve by `clearanceMm` on both sides over the box's whole height.
 *
 * Last resort (a pathological board no real preset can produce): the deepest band whose bottom
 * sits at page 0's own search floor, clamped so the box's top never rises back above the interior
 * ceiling (the name block's bottom minus the gap) or page 0's own printable range. This branch
 * does not prove containment — only that the box stays on the sheet and below the name block.
 */
export function howToBoxPlacement(
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  candidate: { topStation: number; halfWidthStart: number },
  boxWidthMm: number,
  boxHeightMm: number,
  nameBlock: NameBlockPlacement,
  nameBlockHeightMm: number,
  clearanceMm: number = NAME_BOX_CLEARANCE_MM,
): HowToBoxPlacement {
  const page = layout.pages.find((p) => p.index === 0) ?? layout.pages[0];

  const candidateBottom = candidate.topStation - boxHeightMm;
  const { max: outboardCurveMax } = minMaxHalfWidthOverStationSpanFine(
    geometry,
    candidate.topStation,
    candidateBottom,
  );
  if (candidate.halfWidthStart - outboardCurveMax >= clearanceMm) {
    return {
      pageIndex: page.index,
      topStation: mm(candidate.topStation),
      halfWidthStart: mm(candidate.halfWidthStart),
      position: "outboard",
    };
  }

  // Interior: stacked under the name block, clearanceMm off the stringer.
  const halfWidthStart = clearanceMm;
  const requiredHalfWidth = clearanceMm + boxWidthMm + clearanceMm;
  const interiorCeiling = nameBlock.topStation - nameBlockHeightMm - clearanceMm;

  const overlapReserve = layout.rows > 1 ? layout.overlap : 0;
  const searchFloor = page.stationRange[0] + overlapReserve;
  const pageCeiling = Math.min(page.stationRange[1], geometry.length);
  const searchCeiling = Math.min(interiorCeiling, pageCeiling);

  for (
    let top = searchCeiling;
    top - boxHeightMm >= searchFloor;
    top -= NAME_BLOCK_SEARCH_STEP_MM
  ) {
    const bottom = top - boxHeightMm;
    const { min } = minMaxHalfWidthOverStationSpanFine(geometry, top, bottom);
    if (min >= requiredHalfWidth) {
      return {
        pageIndex: page.index,
        topStation: mm(top),
        halfWidthStart: mm(halfWidthStart),
        position: "interior",
      };
    }
  }

  // No station band under the name block clears the box at full width (a pathological board) —
  // fall back to the deepest band searched, mirroring nameBlockPlacement's own last-resort
  // posture, clamped so the box's top never rises back above the interior ceiling or page 0's own
  // printable range. Does not prove containment — only that the box stays on the sheet and below
  // the name block.
  const fallbackTop = Math.min(searchFloor + boxHeightMm, searchCeiling);
  return {
    pageIndex: page.index,
    topStation: mm(fallbackTop),
    halfWidthStart: mm(halfWidthStart),
    position: "interior",
  };
}

/** The founder's own trigger for keeping the 2in x 2in scale-check square in its top-outward
 * corner spot on page 0 (quick task 260903-h7t — the corner was previously believed to be "a
 * corner the curve never reaches", which measured false on the widest longboard and a
 * 100%-nose-fullness longboard). This is a DECISION, not a formula: the founder chose to keep the
 * corner whenever the curve merely touches the square's own footprint (clearance >= 0), rather
 * than requiring the same `NAME_BOX_CLEARANCE_MM` (4mm) of daylight every other page-0 box
 * requires — specifically so the plain longboard preset keeps its corner square on both paper
 * sizes, where its measured clearance is only 2.5mm at A4. A later tidy-up that folds this into
 * `NAME_BOX_CLEARANCE_MM` would silently move the longboard's square off the corner at A4. Keep
 * this its own named constant. */
export const SCALE_SQUARE_CORNER_CLEARANCE_MM = 0;

/** Where the 2in x 2in scale-check square goes on page 0 (quick task 260903-h7t) — its usual
 * top-outward corner spot by default, or stacked inside the outline under whichever piece of
 * page-0 furniture is currently lowest, on the boards where the curve actually reaches into the
 * corner spot's own footprint. */
export interface ScaleSquarePlacement {
  pageIndex: number;
  /** The square's nose-most (top) edge, in the board's own absolute station frame. */
  topStation: Mm;
  /** The square's left edge, measured out from the stringer (half-width 0). */
  halfWidthStart: Mm;
  /** Which of the two placements this is — kept on the result so a caller (and a test) can name
   * the branch without re-deriving the clearance check. */
  position: "corner" | "interior";
}

/**
 * Decides where the 2in x 2in scale-check square goes on page 0. `candidate` is the caller's
 * corner proposal — today's fixed top-outward-corner spot, expressed in the board's own
 * station/half-width frame rather than page-local millimetres.
 *
 * **The corner is preferred** (it is the founder's chosen spot, D-07, and it costs the board no
 * drawing area): kept whenever the outline curve's MAXIMUM half-width anywhere across the
 * candidate's own footprint span clears the candidate's own curve-side edge by at least
 * `cornerClearanceMm` — the founder's deliberately loose 0mm trigger
 * (`SCALE_SQUARE_CORNER_CLEARANCE_MM`), not the stricter 4mm `NAME_BOX_CLEARANCE_MM` every other
 * page-0 box uses. The maximum, not the minimum, because clearance is measured from the square's
 * own curve-side edge inward — the curve's single widest point anywhere in the footprint's height
 * is the one point that can reach into it.
 *
 * **Interior is the fallback**, on the rare board where the curve genuinely reaches the corner
 * spot: the square stacks under whatever furniture is already lowest on page 0 — the how-to box's
 * bottom edge when the how-to box is interior, otherwise the name block's bottom edge, since on
 * every board that reaches this branch the how-to box is provably interior already (the outline
 * only widens from the tip outward, and the how-to box's own outboard spot is both deeper on the
 * page and further inboard than the square's corner spot, so the curve reaches the box's spot
 * first). The square's top starts `clearanceMm` below that bottom edge and `clearanceMm` off the
 * stringer, then scans toward the tail in `NAME_BLOCK_SEARCH_STEP_MM` steps — exactly the way
 * `howToBoxPlacement`'s own interior branch scans — until a station band clears the curve by
 * `clearanceMm` on both sides over the square's own width.
 *
 * Last resort (a pathological board no real preset can produce): the deepest band whose bottom
 * sits at page 0's own search floor, clamped so the square's top never rises back above the
 * stacking ceiling or page 0's own printable range. This branch does not prove containment — only
 * that the square stays on the sheet and below the furniture already above it.
 */
export function scaleSquarePlacement(
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  candidate: { topStation: number; halfWidthStart: number },
  squareMm: number,
  footprintHeightMm: number,
  howToBox: HowToBoxPlacement,
  howToBoxHeightMm: number,
  nameBlock: NameBlockPlacement,
  nameBlockHeightMm: number,
  clearanceMm: number = NAME_BOX_CLEARANCE_MM,
  cornerClearanceMm: number = SCALE_SQUARE_CORNER_CLEARANCE_MM,
): ScaleSquarePlacement {
  const page = layout.pages.find((p) => p.index === 0) ?? layout.pages[0];

  const candidateBottom = candidate.topStation - footprintHeightMm;
  const { max: cornerCurveMax } = minMaxHalfWidthOverStationSpanFine(
    geometry,
    candidate.topStation,
    candidateBottom,
  );
  if (candidate.halfWidthStart - cornerCurveMax >= cornerClearanceMm) {
    return {
      pageIndex: page.index,
      topStation: mm(candidate.topStation),
      halfWidthStart: mm(candidate.halfWidthStart),
      position: "corner",
    };
  }

  // Interior: stacked under whichever piece of page-0 furniture is currently lowest,
  // clearanceMm off the stringer. Built from squareMm — NEVER from footprintHeightMm, which is
  // numerically equal to this required-half-width total today (58.8mm both) purely by
  // coincidence: the footprint height is the square's own vertical reach including its caption,
  // while this is the square's WIDTH plus a clearance gap on each side. The two must never be
  // conflated even though today's numbers happen to agree.
  const halfWidthStart = clearanceMm;
  const requiredHalfWidth = clearanceMm + squareMm + clearanceMm;
  const stackingBottomEdge =
    howToBox.position === "interior"
      ? howToBox.topStation - howToBoxHeightMm
      : nameBlock.topStation - nameBlockHeightMm;

  const overlapReserve = layout.rows > 1 ? layout.overlap : 0;
  const searchFloor = page.stationRange[0] + overlapReserve;
  const pageCeiling = Math.min(page.stationRange[1], geometry.length);
  const searchCeiling = Math.min(stackingBottomEdge - clearanceMm, pageCeiling);

  for (
    let top = searchCeiling;
    top - footprintHeightMm >= searchFloor;
    top -= NAME_BLOCK_SEARCH_STEP_MM
  ) {
    const bottom = top - footprintHeightMm;
    const { min } = minMaxHalfWidthOverStationSpanFine(geometry, top, bottom);
    if (min >= requiredHalfWidth) {
      return {
        pageIndex: page.index,
        topStation: mm(top),
        halfWidthStart: mm(halfWidthStart),
        position: "interior",
      };
    }
  }

  // No station band under the stacking ceiling clears the square at full width (a pathological
  // board) — fall back to the deepest band searched, mirroring howToBoxPlacement's own
  // last-resort posture, clamped so the square's top never rises back above the stacking ceiling
  // or page 0's own printable range. Does not prove containment — only that the square stays on
  // the sheet and below the furniture already above it.
  const fallbackTop = Math.min(searchFloor + footprintHeightMm, searchCeiling);
  return {
    pageIndex: page.index,
    topStation: mm(fallbackTop),
    halfWidthStart: mm(halfWidthStart),
    position: "interior",
  };
}

/**
 * Paper Saver strip layout math (quick task 260902-cj5).
 *
 * The tiled template above spends a whole second column of paper on the flat middle of a board
 * where nothing is drawn. This is the alternative a shaper can pick instead: one continuous,
 * single-column strip of LANDSCAPE pages, each one slid sideways so only the rail-curve region
 * uses paper, with the two registration lines every page carries labelled so the curve can be
 * faired by hand between any two marks. Nothing here draws anything — `computeStripLayout` and
 * its siblings below hand finished numbers and finished strings to
 * `components/template/build-strip-pdf.ts`, which performs no page arithmetic of its own, exactly
 * the same contract `computeTemplateLayout` already keeps with `build-template-pdf.ts`.
 */

/** How far the anchored end of a page's slid curve sits inside its own printable edge — the
 * mechanism (`computeStripLayout`, below) that both slides the page onto the curve AND decides
 * whether the stringer lands on it, from one shared expression. */
export const STRIP_RAIL_INSET_MM = inchesToMm(0.5);

/** Minimum station distance kept between any two printed label rows on one strip page — below
 * this, two rows of text read as one smear rather than two legible lines. Named the same way
 * `MARK_LABEL_COLLISION_THRESHOLD_MM` above already is: a print-legibility constant that belongs
 * in this pure module, not a drawing-module magic number, since the drawing module draws whatever
 * baseline this file hands it with no arithmetic of its own. */
export const STRIP_LABEL_MIN_SEPARATION_MM = 6;

/** Clear space kept between the stringer (half-width 0) and the start of the page-numeral column,
 * on the pages where the stringer actually prints (`stringerOnPage`). Without it, the numeral
 * column sits at the printable left edge on those pages too, and the dashed stringer — drawn at
 * half-width 0, which the sideways slide can put up to `STRIP_RAIL_INSET_MM` to the right of that
 * edge — runs straight through the numeral. A two-digit numeral at 36pt bold is roughly 14mm wide,
 * so 4mm of daylight past the stringer clears the whole glyph without pushing the numeral far
 * enough right to crowd a page's own label column (`STRIP_PAGE_NUMBER_COLUMN_MM` in
 * `build-strip-pdf.ts`, which measures its own width from wherever this places the numeral). This
 * is the same rule's consequence as `stringerOnPage` itself — see `StripPage.pageNumberHalfWidth`
 * below. */
export const STRIP_NUMERAL_STRINGER_GAP_MM = 4;

/** How far inside its own registration line or mark tick a strip label's baseline sits — the
 * fixed "interior gap" every row keeps clear of the line it belongs to, before any de-collision
 * nudge is added on top. */
export const STRIP_LABEL_INTERIOR_GAP_MM = 3;

/** Clear space kept between the board name + dims block and any printed label row's own baseline
 * station, on whichever page the block lands on — the row gap the block's placement scan reserves
 * on top of the shared registration-overlap band it already keeps clear of (`design_decision` §1 of
 * quick task 260902-kon: moving the name block inside the outline). The label column starts to the
 * right of the numeral (`STRIP_PAGE_NUMBER_COLUMN_MM` in `build-strip-pdf.ts`), which is inside the
 * block's own horizontal span, so a working mark's label row — which can land at any station on a
 * fallback page — would otherwise print straight through the box. Named the same size as
 * `STRIP_LABEL_MIN_SEPARATION_MM`, the distance below which two printed rows stop reading as two
 * things. */
export const STRIP_FURNITURE_ROW_GAP_MM = 6;

/** Clear space kept between the board name + dims block's own station band and the big page
 * numeral's own baseline station (`page.pageNumberStation`), on whichever page the block lands on
 * (`design_decision` §2 of quick task 260902-kon). The block's left edge stays hard against the
 * stringer at `NAME_BOX_CLEARANCE_MM` on every page, and the numeral's own placement rule is never
 * touched, so the two always overlap horizontally — this station exclusion is the one rule keeping
 * them from also overlapping vertically. Sized as roughly half the numeral's own cap height (~4.6mm
 * at 36pt bold) plus 5.4mm of daylight, not a full-page-height corridor: reserving the numeral's
 * whole column width — the alternative the plan rejected — would cost the block 22mm of the
 * outline's own half-width, on the one axis it has none to spare. */
export const STRIP_FURNITURE_NUMERAL_GAP_MM = 10;

/** One landscape page of the Paper Saver strip — the station band it covers, the sideways-slid
 * half-width band it prints, and the big page numeral it carries. Reading order runs nose to
 * tail, matching the tiled template's own row order: index 0 is the nose tip. */
export interface StripPage {
  /** 0-based reading order — nose first. */
  index: number;
  /** [start, end] in millimetres along the station axis (0 = tail, geometry.length = nose). May
   * run slightly past 0 on the final page — that's blank paper past the board's own tail tip, not
   * a gap in coverage, exactly like `TemplatePage.stationRange`'s own doc explains. */
  stationRange: [Mm, Mm];
  /** [start, end] in millimetres along the half-width axis, already slid sideways onto the curve
   * (see the module doc comment above) — 0 is the stringer, so a page whose range starts at or
   * below 0 is the one that prints it. */
  halfWidthRange: [Mm, Mm];
  /** The true minimum half-width the outline curve reaches over this page's own station band —
   * exposed so a test can prove the whole curve stays on the paper rather than assuming it. */
  minHalfWidth: Mm;
  /** The true maximum half-width the outline curve reaches over this page's own station band —
   * the value the sideways slide is computed from. */
  maxHalfWidth: Mm;
  /** True when this page's own slid window reaches all the way to the stringer (half-width 0),
   * so the dashed centreline is drawn on it. */
  stringerOnPage: boolean;
  /** Where the page-numeral column begins, in board half-width space: this page's own left
   * printable edge (`halfWidthRange[0]`) when the stringer is NOT on it, or
   * `STRIP_NUMERAL_STRINGER_GAP_MM` to the right of the stringer itself (half-width 0) when it IS
   * — the same rule's consequence as `stringerOnPage` above, so the big numeral can never sit
   * where the dashed centreline runs through it. */
  pageNumberHalfWidth: Mm;
  /** The big printed page numeral's own text — just the number, e.g. `"7"`. */
  pageNumber: string;
  /** The page numeral's own baseline station — the midpoint of the page's own registration
   * band, so the numeral sits centred between whichever of its two lines are actually drawn. */
  pageNumberStation: Mm;
}

/** The complete Paper Saver strip for one board at one paper size. */
export interface StripLayout {
  pages: StripPage[];
  paper: PaperSize;
  margin: Mm;
  overlap: Mm;
  /** The printable span of the station axis, on this paper's own SHORT edge (the vertical extent
   * of a landscape page) — see the module doc comment above for why the axis assignment is
   * reversed from the tiled template's own portrait layout. */
  usableStation: Mm;
  /** The printable span of the half-width axis, on this paper's own LONG edge (the horizontal
   * extent of a landscape page). */
  usableHalfWidth: Mm;
}

/**
 * Tiles the board's own station axis (0..geometry.length) into a single column of landscape
 * pages, then slides each page's half-width window sideways so only the curve's own region uses
 * paper (locked decision: print every page — no straightness rule, no skipping). Reuses the tiled
 * template's own `tileCount`/`buildWindows` helpers (same file, no edit to either) with
 * `fromEnd = true`, so page 0 sits flush with the nose tip exactly the way the tiled template's
 * own row 0 does.
 *
 * The slide is one expression with two readings (`<design_decision>` section 3 of the plan):
 * pin the stringer half an inch inside the left printable edge when the whole board fits across
 * the page at this station (the stringer prints), otherwise pin the outermost rail point half an
 * inch inside the RIGHT printable edge and let the page slide out past the stringer (the stringer
 * does not print). No page ever looks at a neighbour — it is a pure function of its own station
 * band and the paper.
 */
export function computeStripLayout(
  geometry: OutlineGeometry,
  paper: PaperSize,
  margin: Mm = TEMPLATE_MARGIN_MM,
  overlap: Mm = TEMPLATE_OVERLAP_MM,
): StripLayout {
  const paperSize = PAPER_MM[paper];
  // Landscape: the paper's own SHORT edge (its stored portrait `width`) becomes the page's
  // vertical extent, tiling the station axis; the paper's own LONG edge (stored portrait
  // `height`) becomes the page's horizontal extent, tiling the half-width axis.
  const usableStation = paperSize.width - 2 * margin;
  const usableHalfWidth = paperSize.height - 2 * margin;

  const count = tileCount(geometry.length, usableStation, overlap);
  const stationWindows = buildWindows(geometry.length, usableStation, overlap, count, true);

  const pages: StripPage[] = stationWindows.map(([stationStart, stationEnd], index) => {
    const clampedStart = Math.max(stationStart, 0);
    const clampedEnd = Math.min(stationEnd, geometry.length);

    let min = Math.min(
      sampleOutline(geometry, mm(clampedStart)),
      sampleOutline(geometry, mm(clampedEnd)),
    );
    let max = Math.max(
      sampleOutline(geometry, mm(clampedStart)),
      sampleOutline(geometry, mm(clampedEnd)),
    );
    for (const point of geometry.points) {
      if (point.station >= stationStart && point.station <= stationEnd) {
        min = Math.min(min, point.halfWidth);
        max = Math.max(max, point.halfWidth);
      }
    }

    const halfWidthStart = Math.max(-STRIP_RAIL_INSET_MM, max + STRIP_RAIL_INSET_MM - usableHalfWidth);
    const stringerOnPage = halfWidthStart <= 0;

    return {
      index,
      stationRange: [mm(stationStart), mm(stationEnd)],
      halfWidthRange: [mm(halfWidthStart), mm(halfWidthStart + usableHalfWidth)],
      minHalfWidth: mm(min),
      maxHalfWidth: mm(max),
      stringerOnPage,
      pageNumberHalfWidth: mm(stringerOnPage ? STRIP_NUMERAL_STRINGER_GAP_MM : halfWidthStart),
      pageNumber: `${index + 1}`,
      pageNumberStation: mm((stationStart + stationEnd) / 2),
    };
  });

  return {
    pages,
    paper,
    margin,
    overlap,
    usableStation: mm(usableStation),
    usableHalfWidth: mm(usableHalfWidth),
  };
}

/** One page's own printed registration line — the alignment device a shaper marks against the
 * neighbouring sheet, labelled with its own station and the rail's half-width there so the same
 * label can be read off either page it appears on. */
export interface StripRegistrationLine {
  pageIndex: number;
  station: Mm;
  /** Which of this page's two printable edges the line sits near — `"nose"` for the one shared
   * with the previous (more nose-ward) page, `"tail"` for the one shared with the next. */
  edge: "nose" | "tail";
  halfWidth: Mm;
  label: string;
}

/** The registration line's own printed text — station and rail half-width, both through
 * `formatInchesFraction` (CLAUDE.md Rule 2), e.g. `36" from tail — rail 10 3/4"` (locked
 * decision). */
function stripRegistrationLabel(station: Mm, halfWidth: Mm): string {
  return `${formatInchesFraction(station)} from tail — rail ${formatInchesFraction(halfWidth)}`;
}

/**
 * The two registration lines every interior page carries (one each for the nose-ward and
 * tail-ward pages of the strip's own single column), computed ONCE per shared page boundary and
 * handed to both of the pages that border it — so page N's `"tail"` line and page N+1's `"nose"`
 * line are the same station and the same label BY CONSTRUCTION, never by two separate
 * computations that happen to agree. Page 0 gets no `"nose"` line (nothing borders it toward the
 * nose) and the final page gets no `"tail"` line (nothing borders it toward the tail) — a
 * registration line's only job is to align against a neighbouring sheet.
 */
export function stripRegistrationLines(layout: StripLayout, geometry: OutlineGeometry): StripRegistrationLine[] {
  const { pages, overlap } = layout;
  const halfOverlap = overlap / 2;
  const lines: StripRegistrationLine[] = [];

  for (let i = 0; i < pages.length - 1; i++) {
    const noseward = pages[i];
    const tailward = pages[i + 1];
    const station = mm(noseward.stationRange[0] + halfOverlap);
    const halfWidth = sampleOutline(geometry, station);
    const label = stripRegistrationLabel(station, halfWidth);

    lines.push({ pageIndex: noseward.index, station, edge: "tail", halfWidth, label });
    lines.push({ pageIndex: tailward.index, station, edge: "nose", halfWidth, label });
  }

  return lines;
}

/** One page's own clipped portion of a working mark's stringer-to-curve tick — mirrors
 * `TemplateMarkLineSegment`'s own per-page splitting for the tiled template, but clipped to the
 * strip page's own SLID half-width window rather than a fixed column. */
export interface StripMarkSegment {
  pageIndex: number;
  mark: keyof TemplateMarks;
  /** The mark's station, in the board's own absolute station frame. */
  station: Mm;
  /** [start, end] half-width bounds of this page's own portion of the mark's full stringer (0) to
   * curve (`halfWidthExtent`) span, clipped to this page's own slid half-width window. */
  halfWidthRange: [Mm, Mm];
  /** The board's own full half-width at this mark's station (`sampleOutline`) — the tick's true,
   * unclipped end point. */
  halfWidthExtent: Mm;
  label: string;
}

/**
 * The working marks (nose 12in, tail 12in, centre, widepoint, and the tail block on a squared
 * tail), clipped to whichever page's own station band and slid half-width window they fall on —
 * a mark inside a shared overlap band appears once per page, matching `markPlacements`'s own
 * behaviour for the tiled template.
 */
export function stripMarkSegments(
  layout: StripLayout,
  marks: TemplateMarks,
  geometry: OutlineGeometry,
): StripMarkSegment[] {
  const segments: StripMarkSegment[] = [];
  const markNames = Object.keys(marks) as (keyof TemplateMarks)[];

  for (const markName of markNames) {
    const station = marks[markName];
    if (station === undefined) continue; // tailBlock is absent for a pin/round tail
    const halfWidthExtent = sampleOutline(geometry, station);
    const label = `${MARK_LABELS[markName]} — ${formatInchesFraction(mm(halfWidthExtent * 2))}`;

    for (const page of layout.pages) {
      if (station < page.stationRange[0] || station > page.stationRange[1]) continue;

      const clippedStart = Math.max(0, page.halfWidthRange[0]);
      const clippedEnd = Math.min(halfWidthExtent, page.halfWidthRange[1]);
      if (clippedEnd <= clippedStart) continue; // this page's own slid window never reaches the mark

      segments.push({
        pageIndex: page.index,
        mark: markName,
        station,
        halfWidthRange: [mm(clippedStart), mm(clippedEnd)],
        halfWidthExtent,
        label,
      });
    }
  }

  return segments;
}

/** One printed text row on one strip page — a registration line's label or a working mark's
 * label, already placed at its final baseline station so the drawing module performs no
 * arithmetic of its own converting it to a y coordinate. */
export interface StripLabelRow {
  pageIndex: number;
  kind: "registration" | "mark";
  baselineStation: Mm;
  text: string;
}

/**
 * Every printed text row across the whole strip, de-collided per page. Registration rows are
 * pinned at their line's own station, offset by the fixed `STRIP_LABEL_INTERIOR_GAP_MM` toward
 * the page's own interior — they never move, because the identical label on two neighbouring
 * pages (the whole point of the registration mechanism) must always read at the same distance
 * from its own line. A mark row starts at its own default position (just above its tick, `station
 * + STRIP_LABEL_INTERIOR_GAP_MM`) and is nudged to the opposite side only when that default would
 * sit closer than `STRIP_LABEL_MIN_SEPARATION_MM` to an already-placed row on the same page.
 */
export function stripLabelRows(
  layout: StripLayout,
  marks: TemplateMarks,
  geometry: OutlineGeometry,
): StripLabelRow[] {
  const lines = stripRegistrationLines(layout, geometry);
  const segments = stripMarkSegments(layout, marks, geometry);
  const gap = STRIP_LABEL_INTERIOR_GAP_MM;

  const rows: StripLabelRow[] = [];
  const byPage = new Map<number, StripLabelRow[]>();

  const place = (row: StripLabelRow) => {
    rows.push(row);
    const list = byPage.get(row.pageIndex);
    if (list) list.push(row);
    else byPage.set(row.pageIndex, [row]);
  };

  // Registration rows first and pinned — every mark row's de-collision check sees the full set.
  for (const line of lines) {
    const baselineStation = mm(line.edge === "nose" ? line.station - gap : line.station + gap);
    place({ pageIndex: line.pageIndex, kind: "registration", baselineStation, text: line.label });
  }

  for (const segment of segments) {
    const above = segment.station + gap; // the default: "just above its tick"
    const below = segment.station - gap;
    const existing = byPage.get(segment.pageIndex) ?? [];

    // Push a candidate baseline away from every row it currently sits too close to, walking
    // outward (in the given direction) from whichever offending row is nearest, until nothing on
    // the page sits within STRIP_LABEL_MIN_SEPARATION_MM of it. Bounded iteration count: there are
    // only ever a handful of rows on one page (two registration lines plus a few marks), so this
    // settles in well under the cap; the cap itself only guards against a pathological input ever
    // looping forever.
    const settle = (start: number, direction: 1 | -1): number => {
      let candidate = start;
      for (let i = 0; i < 20; i++) {
        const colliding = existing.filter(
          (row) => Math.abs(row.baselineStation - candidate) < STRIP_LABEL_MIN_SEPARATION_MM,
        );
        if (colliding.length === 0) return candidate;
        const nearest = colliding.reduce((closest, row) =>
          Math.abs(row.baselineStation - candidate) < Math.abs(closest.baselineStation - candidate) ? row : closest,
        );
        candidate = nearest.baselineStation + direction * STRIP_LABEL_MIN_SEPARATION_MM;
      }
      return candidate;
    };

    const settledAbove = settle(above, 1);
    const settledBelow = settle(below, -1);
    // Keep whichever side needed the smaller total nudge away from the tick's own natural
    // position — the side "further from the row it collides with" per <design_decision>, without
    // travelling further than necessary once it IS clear.
    const baselineStation = mm(
      Math.abs(settledBelow - below) < Math.abs(settledAbove - above) ? settledBelow : settledAbove,
    );

    place({ pageIndex: segment.pageIndex, kind: "mark", baselineStation, text: segment.label });
  }

  return rows;
}

/** Where one piece of strip furniture goes — its own nose-most (top) station edge, its own left
 * edge measured out from the stringer, and which page of the strip carries it. Mirrors
 * `NameBlockPlacement`'s own shape, plus `pageIndex`: the scale square's is always 0 (locked
 * founder decision), but the name block's placement scan (`stripFurniture`, below) can move the
 * block to a later page when a narrow nose won't hold it on page 1, so the field can't be
 * assumed. */
export interface StripFurniturePlacement {
  pageIndex: number;
  topStation: Mm;
  halfWidthStart: Mm;
}

/** The strip's two pieces of fixed furniture. Named for what each one is, not for where it lives —
 * after quick task 260902-kon the name block is no longer guaranteed to be page-0 furniture, and
 * this repo does not leave a name lying about what the thing is. */
export interface StripFurniture {
  /** Anchored to page 1's own printable top-right corner — the blank paper outside the nose taper
   * — by locked founder decision ("the 2in box is good," quick task 260902-kon). `pageIndex` is
   * always 0 and the two lines of arithmetic below are deliberately untouched by that task. */
  scaleSquare: StripFurniturePlacement;
  /** Scanned into the first station band, on the first page, that sits fully inside the outline
   * and clears that page's own registration-overlap band, every label row on it, and the
   * numeral's own station (`stripFurniture`'s own doc comment has the full rule). Supersedes quick
   * task 260902-cj5's decision to anchor this to the same outboard corner as the scale square, on
   * the founder's instruction: the printed template is cut out along the outline curve, so
   * anything outboard of it is offcut, and the board's own name and dims should not be thrown away
   * with the offcut. */
  nameBlock: StripFurniturePlacement;
}

/** True when the station band `[bottom, top]` clears an exclusion zone of `gap` millimetres on
 * either side of `center` — the one shape behind both the label-row and the numeral exclusions
 * `scanPagesForNameBlock` applies to a candidate band. `gap` is a MINIMUM separation, so a band
 * sitting exactly `gap` away (top exactly at `center - gap`, or bottom exactly at `center + gap`)
 * already clears it — the comparisons are inclusive, not strict. */
function bandClearsExclusionZone(top: number, bottom: number, center: number, gap: number): boolean {
  return top <= center - gap || bottom >= center + gap;
}

/**
 * Scans the strip's pages nose-to-tail for the first station band, on the first page, that holds
 * the board name + dims block fully inside the outline — clearing `clearanceMm` of daylight past
 * BOTH the stringer (inboard) and the curve (outboard, quick task 260903-18d — "give the 4mm of
 * clearance on both template prints") — while clearing whichever furniture constraints
 * `requireFurnitureClearance` asks for. One function serves the first two of `stripFurniture`'s
 * three fallback tiers: Tier 1 calls it with `requireFurnitureClearance: true` (containment plus
 * label-row and numeral clearance); Tier 2 calls it again with `false` (containment only), reached
 * only when no page satisfies Tier 1 — unreachable for any board the outline editor can produce.
 *
 * Within a page, the left edge is the greater of zero and the page's own left printable edge, plus
 * `clearanceMm` — on a page whose own slid window still reaches the stringer (the common case),
 * that resolves to exactly `clearanceMm` off the true stringer; on a page that doesn't reach it,
 * the box stays `clearanceMm` off wherever the page's own printable window starts instead, never
 * closer to the true stringer than that (`design_decision` §2 of quick task 260902-kon). The
 * required half-width the box's station band must clear over its whole height is
 * `leftEdge + boxWidthMm + clearanceMm` — the box's own left edge, its width, and a second
 * `clearanceMm` reserved past the box's right (outboard) edge, so the outline curve keeps the same
 * daylight there that the stringer side already gets. That trailing clearance term belongs only to
 * this outline-containment check — the separate paper-fit guard just below, which asks only
 * whether the box's own drawn footprint fits the page at all, is deliberately NOT widened by it
 * (`design_decision` §2 of quick task 260903-18d's plan: folding it in would skip a page for want
 * of 4mm of paper that nothing is ever drawn on). The search floor and ceiling reserve
 * `layout.overlap` on whichever of the page's own station edges border a neighbouring page — the
 * same shared duplicate-content strip a registration line and its label already keep clear of, so
 * furniture never belongs there either (`design_decision` §1 of quick task 260902-kon) — and the
 * ceiling is clamped to the board's own length.
 */
function scanPagesForNameBlock(
  layout: StripLayout,
  geometry: OutlineGeometry,
  labelRows: StripLabelRow[],
  boxWidthMm: number,
  boxHeightMm: number,
  clearanceMm: number,
  requireFurnitureClearance: boolean,
): StripFurniturePlacement | undefined {
  for (const page of layout.pages) {
    const leftEdge = Math.max(0, page.halfWidthRange[0]) + clearanceMm;
    // The box's own drawn footprint — used ONLY by the paper-fit guard immediately below, which
    // compares it against the page's own printable right edge, never against the outline curve.
    // Named separately from `requiredHalfWidth` below so the two quantities can never be merged by
    // accident: the outboard clearance term is a property of the curve-containment check alone
    // (`design_decision` §2 of quick task 260903-18d's plan).
    const boxFootprintRightEdge = leftEdge + boxWidthMm;
    if (boxFootprintRightEdge > page.halfWidthRange[1]) continue; // this page can't hold the box at full width at all

    // The curve-containment requirement: the box's own left edge, its width, and a second
    // clearanceMm past its outboard edge, so the curve keeps the same daylight past the box that
    // the stringer already keeps before it (quick task 260903-18d — "give the 4mm of clearance on
    // both template prints"). Written out from `leftEdge` again (rather than reused from
    // `boxFootprintRightEdge` above) so this expression reads as one rule with
    // `nameBlockPlacement`'s own `clearanceMm + boxWidthMm + clearanceMm`, not as an
    // implementation detail of the paper-fit guard.
    const requiredHalfWidth = leftEdge + boxWidthMm + clearanceMm;

    const hasNosewardNeighbor = page.index > 0;
    const hasTailwardNeighbor = page.index < layout.pages.length - 1;
    const floor = page.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
    const ceiling = Math.min(page.stationRange[1] - (hasNosewardNeighbor ? layout.overlap : 0), geometry.length);

    const pageRows = requireFurnitureClearance ? labelRows.filter((row) => row.pageIndex === page.index) : [];

    for (let candidate = ceiling; candidate - boxHeightMm >= floor; candidate -= NAME_BLOCK_SEARCH_STEP_MM) {
      const bottom = candidate - boxHeightMm;

      if (requireFurnitureClearance) {
        const clearsRows = pageRows.every((row) =>
          bandClearsExclusionZone(candidate, bottom, row.baselineStation, STRIP_FURNITURE_ROW_GAP_MM),
        );
        if (!clearsRows) continue;

        const clearsNumeral = bandClearsExclusionZone(
          candidate,
          bottom,
          page.pageNumberStation,
          STRIP_FURNITURE_NUMERAL_GAP_MM,
        );
        if (!clearsNumeral) continue;
      }

      if (minHalfWidthOverStationSpan(geometry, candidate, bottom) >= requiredHalfWidth) {
        return { pageIndex: page.index, topStation: mm(candidate), halfWidthStart: mm(leftEdge) };
      }
    }
  }
  return undefined;
}

/**
 * Places the strip's two pieces of fixed furniture (see `StripFurniture`'s own doc comment for
 * what each one is and why).
 *
 * The scale square's two lines of arithmetic are exactly what they were before quick task
 * 260902-kon — anchored to page 1's own printable top-right corner, `pageIndex` fixed at 0 —
 * because the founder reviewed the rendered strip and ruled the 2in box is good exactly where it
 * is.
 *
 * The name block is placed by a three-tier fallback (`design_decision` §3), so the function is
 * total and never throws:
 * - **Tier 1**: `scanPagesForNameBlock` with every constraint — inside the outline over the box's
 *   whole height, clear of the page's own registration-overlap band, clear of every label row on
 *   that page by `STRIP_FURNITURE_ROW_GAP_MM`, and clear of the numeral's own station by
 *   `STRIP_FURNITURE_NUMERAL_GAP_MM`. This tier finds a home for every preset at both paper sizes,
 *   and for a legal needle-nosed board on a later page of the same template.
 * - **Tier 2**: the same scan with the label-row and numeral clearances dropped, keeping the one
 *   constraint that never relaxes — the block still lands fully inside the outline, clear of the
 *   curve by `NAME_BOX_CLEARANCE_MM` on its outboard edge as well as its inboard one (quick task
 *   260903-18d). Unreachable for any board the outline editor can produce: the widepoint's own
 *   minimum half-width (`WIDEPOINT_WIDTH_RANGE_IN.min`, 16in full width, 203.2mm half-width) is
 *   always comfortably clear of the required half-width, which after this task's two-sided
 *   clearance change rises from 78mm to 82mm (`NAME_BOX_CLEARANCE_MM` x2 + `NAME_BOX_WIDTH_MM` =
 *   4 + 74 + 4) — so a fitting band always exists somewhere on the strip.
 * - **Tier 3**: page 0's own deepest searchable band, mirroring `nameBlockPlacement`'s own fallback
 *   posture for the tiled template. Also unreachable for any real board; it exists only so this
 *   function has a defined answer for every input.
 */
export function stripFurniture(
  layout: StripLayout,
  geometry: OutlineGeometry,
  labelRows: StripLabelRow[],
  sizes: {
    scaleSquareMm: number;
    nameBoxWidthMm: number;
    nameBoxHeightMm: number;
  },
  clearanceMm: number = NAME_BOX_CLEARANCE_MM,
): StripFurniture {
  const page0 = layout.pages[0];
  const rightEdge = page0.halfWidthRange[1];
  const topEdge = page0.stationRange[1];

  const scaleSquare: StripFurniturePlacement = {
    pageIndex: 0,
    topStation: mm(topEdge),
    halfWidthStart: mm(rightEdge - sizes.scaleSquareMm),
  };

  let nameBlock = scanPagesForNameBlock(
    layout,
    geometry,
    labelRows,
    sizes.nameBoxWidthMm,
    sizes.nameBoxHeightMm,
    clearanceMm,
    true,
  );
  if (!nameBlock) {
    // Tier 2 — unreachable for any board the outline editor can produce; see this function's own
    // doc comment.
    nameBlock = scanPagesForNameBlock(
      layout,
      geometry,
      labelRows,
      sizes.nameBoxWidthMm,
      sizes.nameBoxHeightMm,
      clearanceMm,
      false,
    );
  }
  if (!nameBlock) {
    // Tier 3 — also unreachable for any real board; mirrors `nameBlockPlacement`'s own deepest-band
    // fallback so this function always returns a defined answer.
    const leftEdge = Math.max(0, page0.halfWidthRange[0]) + clearanceMm;
    const hasTailwardNeighbor = layout.pages.length > 1;
    const floor = page0.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
    const ceiling = Math.min(page0.stationRange[1], geometry.length);
    const fallbackTop = Math.min(floor + sizes.nameBoxHeightMm, ceiling);
    nameBlock = { pageIndex: 0, topStation: mm(fallbackTop), halfWidthStart: mm(leftEdge) };
  }

  return { scaleSquare, nameBlock };
}
