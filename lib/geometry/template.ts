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
