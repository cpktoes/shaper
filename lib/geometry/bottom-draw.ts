/**
 * The drawings of the bottom (Phase 17, D-12, D-13, D-17, D-31; UI-SPEC §3, §5, §15) — every shape BOTTOM's VIEWER,
 * its GUIDE cartoons, FINS and the printed page draw, worked out here so a component only paints.
 *
 * Every shape comes from the one number in `bottom.ts` (`foamOff`, D-05): no drawing, and no component, computes foam
 * off itself. The shade, the contour lines, the section's bottom and every gauge reading are `foamOff` sampled; the
 * pencil lines are the same marks DATA prints (`cutHalfWidth`, `doubleMarks`, `channelMarks`); the ruler is DATA's own
 * layout marks (`bottomLayoutMarks`) at the station.
 *
 * Two kinds of coordinate:
 * - **board millimetres** — a station from the tail and a distance across from the stringer (signed: + one side,
 *   − the other), as every `lib/geometry` shape is; the shade, the contour lines, the pencil lines and the fins come
 *   back in these, and the caller maps them into its own drawing;
 * - **drawing units** — the sketch's box (sketch 021, template.html 555–563): a picture 1000 units wide and as tall as
 *   its box is, where `px = 1000 / boxWidth` is one screen dot — so every line, tick, gap and word is written in dots
 *   and a phone and a computer draw the same 1-dot lines around pictures of very different sizes. The top view's
 *   frame and the section come back in these.
 *
 * The drawing grammar is the sketch-findings skill's (`.claude/skills/sketch-findings-shaper`): faint lines inside the
 * outline, ink for what is measured, one shade (D-12's exception) — the colours are the component's tokens, never here.
 *
 * Nothing here reads a window or a device (C3): a box's size is always an argument.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser or database import. Every length is millimetres (Rule 2); every inch
 * figure is written through `inchesToMm`.
 */
import {
  BOTTOM_MARK_FADE_MIN,
  BOTTOM_SHADE_STEP,
  bottomLayoutMarks,
  CHANNEL_FLAT_KEY,
  channelFoamOff,
  channelMarks,
  cutHalfWidth,
  deepestCutAt,
  DEFAULT_BOTTOM,
  doubleMarks,
  fadeAt,
  foamOff,
  resolveBottom,
  startingChannels,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
  type BottomWingRule,
  type ChannelCount,
  type ResolvedBottom,
  type ResolvedChannels,
  type ResolvedCut,
} from "./bottom";
import { formatBottomStation } from "./blank-reasons";
import { sampledFinishedRail, type HalfSectionPoints } from "./finished-rail";
import type { FinMark, FinPlacementResult, FinRole } from "./fins";
import { formatMark, formatMarkBare } from "./measure-display";
import type { OutlineGeometry } from "./outline";
import { silhouette } from "./screen-tiles";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "./units";
import { boardSections, type BoardSection, type CrossSectionVolumeInput } from "./volume";

/* ============ shared shapes ============ */

/** A point in board millimetres: a station from the tail, and a distance across from the stringer (signed). */
export type BoardXY = readonly [station: number, across: number];

/** Which cut a drawing belongs to: one of the three sections, or the channels. */
export type BottomCutKey = BottomSectionKey | "channels";

/** How finely a drawing samples the bottom: columns along the board, and spans across each half. */
export interface BottomGrid {
  columns: number;
  across: number;
}

/** The top view's sampling (D-12; the sketch's 120 columns × 64 spans, template.html 597). */
export const TOP_VIEW_GRID: BottomGrid = { columns: 120, across: 64 };
/** The ☰ tile's sampling (UI-SPEC §9): coarse, 40 × 12. */
export const TILE_GRID: BottomGrid = { columns: 40, across: 12 };
/** A GUIDE cartoon's sampling (the sketch's `cartoon`, template.html 911): 72 × 18. */
export const CARTOON_GRID: BottomGrid = { columns: 72, across: 18 };

/** The contour lines step every 1/16" of depth (D-12, the founder's 2026-11-06 word). */
export const BOTTOM_CONTOUR_STEP: Mm = inchesToMm(1 / 16);

/** The bottom's numbers along one column of a grid: where it stands, and the foam off at each sample across. */
interface GridColumn {
  /** The column's centre station, and its two ends. */
  s: number;
  sLo: number;
  sHi: number;
  /** The samples across, from the notch's inside wall (0 elsewhere) out to the rail — `foamOff` at each. */
  ys: number[];
  fs: number[];
}

/** The one number sampled on a grid (the sketch's `grid`, template.html 598–604): `foamOff` and nothing else. */
function sampleBottom(resolved: ResolvedBottom, board: BottomBoard, grid: BottomGrid): GridColumn[] {
  const L = board.length;
  const out: GridColumn[] = [];
  for (let a = 0; a < grid.columns; a++) {
    const s = ((a + 0.5) / grid.columns) * L;
    const W = board.railAt(mm(s));
    const inner = board.notchInner(mm(s));
    if (!(W - inner > 0)) continue;
    const ys: number[] = [];
    const fs: number[] = [];
    for (let j = 0; j <= grid.across; j++) {
      const y = inner + ((W - inner) * j) / grid.across;
      ys.push(y);
      fs.push(foamOff(resolved, board, mm(s), mm(y)));
    }
    out.push({ s, sLo: s - L / grid.columns / 2, sHi: s + L / grid.columns / 2, ys, fs });
  }
  return out;
}

/** The levels a depth reaches, counted every `step` (1 at the first step). */
function levelsUnder(depth: number, step: number): number {
  return Math.floor(depth / step + 1e-9);
}

/**
 * A depth this close under a shade level still draws that level: a thousandth of an inch, which no one can see. The
 * grid's columns stand between stations, so a cut whose deepest is one station reads its full depth a hair shy on the
 * grid (measured on the starting singles, vees and bellies of the four presets: at most 0.0011 mm), and a 1/4" cut
 * would otherwise shade seven levels deep, not eight. A double's trough, and the Spiral Vee's, can also fall between
 * two samples across and read up to 0.24 mm shy; the reach does not try to close that. Display only — the shade is a
 * tone, the numbers are elsewhere (UI-SPEC § Color).
 */
export const BOTTOM_SHADE_REACH: Mm = inchesToMm(1 / 1000);

/* ============ the shade (D-12) ============ */

/** One rectangle of shade, in board millimetres: stations `s0 < s1`, across `y0 < y1` (signed). */
export interface ShadeRect {
  s0: Mm;
  s1: Mm;
  y0: Mm;
  y1: Mm;
}

/** One 1/32" level of shade: every rectangle where the foam off reaches `depth`, both sides. */
export interface ShadeLevel {
  /** 1 at the first 1/32", 8 at 1/4". */
  index: number;
  depth: Mm;
  rects: ShadeRect[];
}

/**
 * The shade (D-12; the sketch's bands, template.html 605–620): along each column of `grid`, for every 1/32" of depth
 * the column reaches, one rectangle per run of samples at or past that level (within `BOTTOM_SHADE_REACH`), mirrored
 * about the stringer — so the shade is stacked, a 1/4" cut eight levels deep. Each run's edges stand halfway between
 * the samples either side.
 *
 * Grouped by level: within one level no two rectangles overlap (the columns are side by side, the runs of a column
 * apart, the two sides either side of the stringer), so one level paints as ONE path (`shadePathData`) and the drawing
 * has one shade node per level, never one per band (research §I, T-17-11). A flat bottom has no level.
 */
export function bottomShadeBands(resolved: ResolvedBottom, board: BottomBoard, grid: BottomGrid = TOP_VIEW_GRID): ShadeLevel[] {
  const step = BOTTOM_SHADE_STEP;
  const levels = new Map<number, ShadeRect[]>();
  for (const g of sampleBottom(resolved, board, grid)) {
    const m = g.ys.length - 1;
    const reach = BOTTOM_SHADE_REACH;
    const top = levelsUnder(Math.max(...g.fs) + reach, step);
    for (let k = 1; k <= top; k++) {
      const lv = k * step;
      let j = 0;
      while (j <= m) {
        if (g.fs[j] >= lv - reach) {
          let j2 = j;
          while (j2 + 1 <= m && g.fs[j2 + 1] >= lv - reach) j2++;
          const ya = j > 0 ? (g.ys[j - 1] + g.ys[j]) / 2 : g.ys[0];
          const yb = j2 < m ? (g.ys[j2] + g.ys[j2 + 1]) / 2 : g.ys[m];
          if (yb > ya) {
            const rects = levels.get(k) ?? [];
            rects.push({ s0: mm(g.sLo), s1: mm(g.sHi), y0: mm(ya), y1: mm(yb) }, { s0: mm(g.sLo), s1: mm(g.sHi), y0: mm(-yb), y1: mm(-ya) });
            levels.set(k, rects);
          }
          j = j2 + 1;
        } else j++;
      }
    }
  }
  return [...levels.entries()].sort((a, b) => a[0] - b[0]).map(([index, rects]) => ({ index, depth: mm(index * step), rects }));
}

/** A map from board millimetres into a drawing's own units. It must keep lines along the board and across it
 * straight and square — a scale, a flip, a shift — as every BOTTOM drawing's map does. */
export type BoardToDrawing = (station: number, across: number) => { x: number; y: number };

/**
 * One level's rectangles joined into one SVG path's `d` (research §I): `M x y h w v h h −w z` per rectangle, in the
 * drawing's units through `map`, two decimals. Rectangles of one level never overlap, so the joined path paints
 * exactly what the rectangles would.
 */
export function shadePathData(rects: readonly ShadeRect[], map: BoardToDrawing): string {
  let d = "";
  for (const r of rects) {
    const a = map(r.s0, r.y0);
    const b = map(r.s1, r.y1);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    d += `M${x.toFixed(2)} ${y.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h${(-w).toFixed(2)}z`;
  }
  return d;
}

/* ============ the contour lines (D-12) ============ */

/** The contour line at one depth: every run of it, both sides, in board millimetres. */
export interface ContourLevel {
  /** 1 at 1/16", 4 at 1/4". */
  index: number;
  depth: Mm;
  lines: BoardXY[][];
}

/**
 * A line at every 1/16" of depth (D-12; the sketch's `iso`, template.html 621–635), marched on the shade's own grid:
 * in each column, the points across where the foam off crosses the level (read straight between two samples), joined
 * to the next column's when the two have as many crossings — mirrored about the stringer. One level's runs are one
 * path. A flat bottom has none.
 */
export function bottomContourLines(resolved: ResolvedBottom, board: BottomBoard, grid: BottomGrid = TOP_VIEW_GRID): ContourLevel[] {
  const columns = sampleBottom(resolved, board, grid);
  let deepest = 0;
  for (const g of columns) for (const f of g.fs) deepest = Math.max(deepest, f);
  const step = BOTTOM_CONTOUR_STEP;
  const out: ContourLevel[] = [];
  const top = levelsUnder(deepest, step);
  for (let k = 1; k <= top; k++) {
    const lv = k * step;
    const crossings = (g: GridColumn): number[] => {
      const xs: number[] = [];
      for (let j = 1; j < g.fs.length; j++) {
        const f0 = g.fs[j - 1];
        const f1 = g.fs[j];
        if (f0 < lv !== f1 < lv) xs.push(g.ys[j - 1] + ((g.ys[j] - g.ys[j - 1]) * (lv - f0)) / (f1 - f0));
      }
      return xs;
    };
    const lines: BoardXY[][] = [];
    let open: BoardXY[][] = [];
    let prev: number[] | null = null;
    for (const g of columns) {
      const xs = crossings(g);
      if (prev && prev.length === xs.length && xs.length > 0) {
        xs.forEach((y, q) => open[q].push([g.s, y]));
      } else {
        for (const run of open) if (run.length > 1) lines.push(run);
        open = xs.map((y) => [[g.s, y] as BoardXY]);
      }
      prev = xs;
    }
    for (const run of open) if (run.length > 1) lines.push(run);
    const mirrored = lines.flatMap((run) => [run, run.map(([s, y]) => [s, -y] as BoardXY)]);
    if (mirrored.length > 0) out.push({ index: k, depth: mm(lv), lines: mirrored });
  }
  return out;
}

/** A run of points joined into an SVG path's `d` through `map` (one decimal), each run its own `M`. */
export function polylinesPathData(runs: readonly (readonly BoardXY[])[], map: BoardToDrawing): string {
  let d = "";
  for (const run of runs) {
    run.forEach(([s, y], q) => {
      const p = map(s, y);
      d += `${q === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
  }
  return d;
}

/* ============ the pencil lines (D-12) ============ */

/** What a pencil line is: a single's or double's edge (Off Rail), a double's flat (Off Stringer) and its trough, a
 * Tri-Plane's (or any vee's) panel line, a channel wall, or a channel set's flat edge. */
export type PencilKind = "edge" | "flat" | "trough" | "panel" | "wall" | "flatEdge";

/** One line a shaper would rule on the blank, both sides, in board millimetres. */
export interface PencilLine {
  kind: PencilKind;
  cut: BottomCutKey;
  /** The live cut's lines draw in ink (UI-SPEC §3.2). */
  live: boolean;
  /** DATA's layout-mark key for the same mark (`center:edge`, `channels:wall:2`). */
  column: string;
  runs: BoardXY[][];
}

/** How many steps a pencil line takes from a cut's End to its Start (the sketch's `runLine`: 200, a channel's 160,
 * a panel's 100). */
const PENCIL_STEPS = { cut: 200, channel: 160, panel: 100 } as const;
/** A mark this close to the stringer, or this far past the rail, is not drawn (the sketch's 0.5). */
const PENCIL_EDGE: Mm = mm(0.5);

/**
 * One line along the board from End to Start, wherever the cut is on (faded past 0.4% — the sketch's 0.004, the same
 * share that rules a mark in DATA) and the mark `yAt(s)` stands inside the rail; mirrored. The sketch's `runLine`.
 */
function runLine(start: number, end: number, steps: number, on: (s: number) => boolean, yAt: (s: number) => number | null, board: BottomBoard): BoardXY[][] {
  const runs: BoardXY[][] = [];
  let run: BoardXY[] | null = null;
  for (let a = 0; a <= steps; a++) {
    const s = end + ((start - end) * a) / steps;
    const y = yAt(s);
    const W = board.railAt(mm(s));
    if (on(s) && y !== null && y > PENCIL_EDGE && y < W + PENCIL_EDGE) {
      if (!run) {
        run = [];
        runs.push(run);
      }
      run.push([s, y]);
    } else run = null;
  }
  return runs.flatMap((r) => [r, r.map(([s, y]) => [s, -y] as BoardXY)]);
}

function cutPencilLines(cut: ResolvedCut, board: BottomBoard, resolved: ResolvedBottom, live: boolean): PencilLine[] {
  if (cut.kind === "flat" || cut.depth <= 0) return [];
  const rule = resolved.wingRule;
  const on = (s: number) => fadeAt(cut.start, cut.deepest, cut.end, s, board.length) > BOTTOM_MARK_FADE_MIN;
  const line = (kind: PencilKind, mark: string, yAt: (s: number) => number | null, steps: number): PencilLine => ({
    kind,
    cut: cut.section,
    live,
    column: `${cut.section}:${mark}`,
    runs: runLine(cut.start, cut.end, steps, on, yAt, board),
  });
  const C = (s: number) => cutHalfWidth(cut, board, rule, mm(s));
  if (cut.kind === "single") return [line("edge", "edge", C, PENCIL_STEPS.cut)];
  if (cut.kind === "double") {
    return [
      line("flat", "flat", (s) => doubleMarks(cut, C(s)).flat, PENCIL_STEPS.cut),
      line("trough", "trough", (s) => doubleMarks(cut, C(s)).trough, PENCIL_STEPS.cut),
      line("edge", "edge", C, PENCIL_STEPS.cut),
    ];
  }
  if (cut.offStringer > 0) return [line("panel", "flat", () => cut.offStringer, PENCIL_STEPS.panel)];
  return [];
}

function channelPencilLines(ch: ResolvedChannels, board: BottomBoard, resolved: ResolvedBottom, live: boolean): PencilLine[] {
  if (ch.count < 4 || ch.depth <= 0) return [];
  const rule = resolved.wingRule;
  const on = (s: number) => fadeAt(ch.start, ch.deepest, ch.end, s, board.length) > BOTTOM_MARK_FADE_MIN;
  // every wall, and the flat's edge, each from its own channel's start — so a staggered set's fronts step
  return channelMarks(ch, board, rule, ch.deepest).map(({ column }) => ({
    kind: column === CHANNEL_FLAT_KEY ? ("flatEdge" as const) : ("wall" as const),
    cut: "channels" as const,
    live,
    column,
    runs: runLine(ch.start, ch.end, PENCIL_STEPS.channel, on, (s) => {
      const m = channelMarks(ch, board, rule, mm(s)).find((q) => q.column === column);
      return m && m.on ? m.across : null;
    }, board),
  }));
}

/**
 * The lines a shaper would rule (D-12; the sketch's pencil lines, template.html 641–658), each from its own cut's
 * Start to End: a single's edge; a double's flat, trough and edge; a vee's panel line where it has a flat panel (the
 * Tri-Plane); every channel wall and a channel set's flat edge, each from its own channel's start. In shop order;
 * `live` marks the cut being edited. A flat bottom has none.
 */
export function bottomPencilLines(resolved: ResolvedBottom, board: BottomBoard, live: BottomCutKey | null): PencilLine[] {
  return [
    ...cutPencilLines(resolved.nose, board, resolved, live === "nose"),
    ...cutPencilLines(resolved.center, board, resolved, live === "center"),
    ...cutPencilLines(resolved.tail, board, resolved, live === "tail"),
    ...channelPencilLines(resolved.channels, board, resolved, live === "channels"),
  ];
}

/* ============ the fins (D-31) ============ */

/** One fin's base on the top view: from its trailing edge to its leading edge, in board millimetres. */
export interface FinLine {
  role: FinRole;
  side: FinMark["side"];
  from: BoardXY;
  to: BoardXY;
}

/**
 * The fins on BOTTOM's top view (D-31): FINS' own base lines — every fin of the placement on its own side, from
 * `(offTail, lateral)` to `(leadingOffTail, leadingLateral)` (`lib/geometry/fins.ts` `FinMark`), no dots, no
 * dimensions. A flat bottom draws them too.
 */
export function bottomFinLines(placement: Pick<FinPlacementResult, "marks">): FinLine[] {
  return placement.marks.map((m) => ({ role: m.role, side: m.side, from: [m.offTail, m.lateral], to: [m.leadingOffTail, m.leadingLateral] }));
}

/* ============ the top view's frame and its two rails of marks (D-12, D-07) ============ */

/** The top view's frame in drawing units (UI-SPEC §3.2; the sketch's `drawTop`, template.html 580–586). */
export interface TopViewFrame {
  /** The picture is always 1000 units wide, and as tall as its box. */
  width: number;
  height: number;
  /** One screen dot, in drawing units. */
  px: number;
  /** Drawing units per board millimetre. */
  k: number;
  /** The stringer's height in the picture. */
  cy: number;
  /** Room above the board for the upper rail, and below it for the lower rail and the grab dot. */
  padTop: number;
  padBottom: number;
  length: Mm;
}

/** The drawing's width in units (the sketch's 1000). */
export const DRAWING_WIDTH = 1000;
/** The board's length spans at most this many units of the 1000, centred (the sketch's 900). */
const TOP_VIEW_LENGTH_UNITS = 900;
/** Dots above the board for the upper rail, and below it for the lower rail and the grab dot (sketch line 583). */
export const TOP_VIEW_ROOM_ABOVE = 30;
export const TOP_VIEW_ROOM_BELOW = 46;

/**
 * The top view's frame for a box `boxWidth × boxHeight` dots: nose left, the board centred, as large as the box allows
 * — the length at most 900 of the 1000 units, the width inside the box less the two rails' room. (The sketch wrote
 * the height's share as `max(1, …)`, which never lets the height bind; here a short box shrinks the board so it never
 * spills into the rails.)
 */
export function topViewFrame(board: Pick<BottomBoard, "length" | "widePointWidth">, boxWidth: number, boxHeight: number): TopViewFrame {
  const px = DRAWING_WIDTH / boxWidth;
  const height = Math.round((DRAWING_WIDTH * boxHeight) / boxWidth);
  const padTop = TOP_VIEW_ROOM_ABOVE * px;
  const padBottom = TOP_VIEW_ROOM_BELOW * px;
  const room = Math.max(0, height - padTop - padBottom);
  const k = Math.min(TOP_VIEW_LENGTH_UNITS / board.length, room / board.widePointWidth);
  return { width: DRAWING_WIDTH, height, px, k, cy: padTop + room / 2, padTop, padBottom, length: board.length };
}

/** A station's x in the top view: nose left (the sketch's `X`). */
export function topViewX(frame: TopViewFrame, station: number): number {
  return DRAWING_WIDTH / 2 + (frame.length / 2 - station) * frame.k;
}

/** A distance across's y in the top view (the sketch's `Y`). */
export function topViewY(frame: TopViewFrame, across: number): number {
  return frame.cy + across * frame.k;
}

/** The top view's map from board millimetres, for `shadePathData` and `polylinesPathData`. */
export function topViewMap(frame: TopViewFrame): BoardToDrawing {
  return (s, y) => ({ x: topViewX(frame, s), y: topViewY(frame, y) });
}

/**
 * Where a press, drag or tap on the top view puts the section (D-12; the sketch's `stationAt`, template.html
 * 1137–1141): the pointer's x in drawing units turned back into a station, clamped to the board, 0 to L.
 */
export function stationAtPointer(x: number, frame: TopViewFrame): Mm {
  return mm(Math.max(0, Math.min(frame.length, frame.length / 2 - (x - DRAWING_WIDTH / 2) / frame.k)));
}

/** Where the section opens: the wide point (sketch line 437). */
export function sectionOpeningStation(board: Pick<BottomBoard, "widePoint">): Mm {
  return board.widePoint;
}

/** One label on a rail of the top view: its words, its value and the station it ticks. */
export interface RailMark {
  key: "wide" | "fins" | "start" | "deepest" | "end";
  name: string;
  value: string;
  station: Mm;
}

/** The two rails of marks on the top view. */
export interface TopViewMarks {
  /** Above the board: the wide point and the front fins (a single fin's own word). */
  upper: [RailMark, RailMark];
  /** Below the board: the live cut's Start, Deepest and End, and the dotted line across at Deepest — none on a flat. */
  lower: { deepest: Mm; marks: [RailMark, RailMark, RailMark] } | null;
}

/** The live cut's three stations from the tail, or null when it cuts nothing. */
function liveStations(resolved: ResolvedBottom, live: BottomCutKey | null): { start: Mm; deepest: Mm; end: Mm } | null {
  if (live === null) return null;
  if (live === "channels") {
    const ch = resolved.channels;
    return ch.count >= 4 && ch.depth > 0 ? { start: ch.start, deepest: ch.deepest, end: ch.end } : null;
  }
  const cut = resolved[live];
  return cut.kind !== "flat" && cut.depth > 0 ? { start: cut.start, deepest: cut.deepest, end: cut.end } : null;
}

/**
 * The words on the top view's two rails (D-12, D-07; UI-SPEC § "On the drawings"): above, `WIDE POINT · 36"` and
 * `FRONT FINS · 10 7/8"` (a board with no front pair, `FIN · 14"`); below, the live cut's `START`, `DEEPEST` and `END`,
 * each taped from that cut's nearest tip — a Nose cut from the nose, every other from the tail — through
 * `formatBottomStation`. Nothing below on a flat or with no live cut.
 */
export function topViewMarks(
  board: BottomBoard,
  resolved: ResolvedBottom,
  live: BottomCutKey | null,
  placement: Pick<FinPlacementResult, "marks">,
  system: UnitsSystem,
): TopViewMarks {
  const finName = placement.marks.some((m) => m.role === "front") ? "FRONT FINS" : "FIN";
  const upper: [RailMark, RailMark] = [
    { key: "wide", name: "WIDE POINT", value: formatBottomStation(board.widePoint, system), station: board.widePoint },
    { key: "fins", name: finName, value: formatBottomStation(board.frontFins, system), station: board.frontFins },
  ];
  const at = liveStations(resolved, live);
  if (!at) return { upper, lower: null };
  const taped = (s: Mm) => formatBottomStation(live === "nose" ? mm(board.length - s) : s, system);
  return {
    upper,
    lower: {
      deepest: at.deepest,
      marks: [
        { key: "start", name: "START", value: taped(at.start), station: at.start },
        { key: "deepest", name: "DEEPEST", value: taped(at.deepest), station: at.deepest },
        { key: "end", name: "END", value: taped(at.end), station: at.end },
      ],
    },
  };
}

/** A rail label to place: its tick's x and its text, in screen dots. */
export interface RailLabelInput {
  x: number;
  text: string;
}

/** A rail label placed: where its text anchors, and whether it draws (its tick always does). */
export interface PlacedRailLabel {
  x: number;
  text: string;
  anchor: "start" | "middle" | "end";
  /** The text's anchor point, in screen dots. */
  textX: number;
  show: boolean;
}

/** How labels on a rail keep apart (the sketch's lower rail, template.html 680–684): a text anchored to one side of
 * its tick stands this far off it; two texts closer than this touch; no text comes nearer the box's edge than this. */
export const RAIL_LABEL_SPACING = { offset: 3, gap: 6, margin: 2 } as const;

/**
 * Places labels on one rail of the top view (UI-SPEC §3.2; sketch lines 660–687), in screen dots so a box of any
 * size reads the same: each label centred on its tick; two that would touch anchor away from each other (the left
 * one's text ends at its tick, the right one's starts there); no label passes either edge of the box; and a label
 * that still touches the one before it is not drawn (its tick stays). `measure` gives a text's width in dots, so no
 * browser is read. Returned in the order given.
 */
export function placeRailLabels(labels: readonly RailLabelInput[], boxWidth: number, measure: (text: string) => number): PlacedRailLabel[] {
  const { offset, gap, margin } = RAIL_LABEL_SPACING;
  const items = labels.map((l, order) => ({ ...l, order, w: measure(l.text), anchor: "middle" as PlacedRailLabel["anchor"], textX: l.x, show: true }));
  const span = (l: (typeof items)[number]): [number, number] =>
    l.anchor === "middle" ? [l.textX - l.w / 2, l.textX + l.w / 2] : l.anchor === "end" ? [l.textX - l.w, l.textX] : [l.textX, l.textX + l.w];
  const setAnchor = (l: (typeof items)[number], anchor: PlacedRailLabel["anchor"]) => {
    l.anchor = anchor;
    l.textX = anchor === "middle" ? l.x : anchor === "end" ? l.x - offset : l.x + offset;
  };
  const sorted = [...items].sort((a, b) => a.x - b.x);
  for (let q = 0; q < sorted.length - 1; q++) {
    if (span(sorted[q])[1] + gap > span(sorted[q + 1])[0]) {
      setAnchor(sorted[q], "end");
      setAnchor(sorted[q + 1], "start");
    }
  }
  for (const l of sorted) {
    if (span(l)[1] > boxWidth - margin) {
      l.anchor = "end";
      l.textX = boxWidth - margin;
    }
    if (span(l)[0] < margin) {
      l.anchor = "start";
      l.textX = margin;
    }
    if (l.w > boxWidth - 2 * margin) l.show = false;
  }
  let lastRight = -Infinity;
  for (const l of sorted) {
    if (!l.show) continue;
    const [left, right] = span(l);
    if (left < lastRight + gap) l.show = false;
    else lastRight = right;
  }
  return items.map(({ x, text, anchor, textX, show }) => ({ x, text, anchor, textX, show }));
}

/* ============ the section (D-13) ============ */

/** The Height pick (D-13): ×1, ×2, ×4 or ×8 — ×4 when the page opens, ×8 in a GUIDE cartoon. */
export type SectionHeight = 1 | 2 | 4 | 8;

/** A drawing's box, in screen dots. */
export interface DrawingBox {
  width: number;
  height: number;
}

/** The section box sizes the gauges and the ruler read (D-14, D-30): the ruler, bare, from a 548-dot box (a 1024
 * window); its caption, the gauge words and `PLANED BOTTOM` from 625 dots. */
export const SECTION_RULER_MIN_BOX = 548;
export const SECTION_WORDS_MIN_BOX = 625;

/** The air either side of the wide point's section, in dots: it spans the box less this a side (95%, D-13). */
export const SECTION_AIR = 20;
/** Where the slab's foot sits above the box's bottom, in dots or as a share of the box — with the ruler under it, and
 * without (UI-SPEC §3.3, sketch line 715). */
const SECTION_FOOT = { ruler: { dots: 92, share: 0.42 }, bare: { dots: 44, share: 0.26 } } as const;
/** The slab is broken (a break line across its top) when it would rise past this, in dots or as a share of the box. */
const SECTION_TOP_ROOM = { dots: 24, share: 0.14 } as const;
/** The cut's own room under the break: the height is fitted to it when the Height pick would push the cut out. */
const SECTION_CUT_ROOM = { min: 4, clear: 10 } as const;
/** Below this deepest foam off (mm) the height is never fitted (the sketch's 0.3). */
const SECTION_FIT_MIN: Mm = mm(0.3);
/** The straightedge overhangs each rail by up to this, at least the second, in dots. */
const STRAIGHTEDGE_OVERHANG = { max: 30, min: 6, clear: 2 } as const;
/** The break line: a zig-zag ±3 dots over 28 steps, overhanging each rail by 8 (sketch line 732–735). */
const BREAK_LINE = { amplitude: 3, steps: 28, overhang: 8 } as const;
/** Points along the slab's bottom (the sketch's 220). */
const SECTION_POINTS = 220;
/** A station narrower than this (mm a side) has no slab: the nose tip, `· 0" WIDE` (the sketch's 0.5). */
const SECTION_MIN_HALF: Mm = mm(0.5);

/** One station's section, laid in drawing units (D-13; the sketch's `drawSec`, template.html 707–753). */
export interface SectionDrawing {
  /** The picture: 1000 units wide, as tall as its box; one dot is `px` units. */
  width: number;
  height: number;
  px: number;
  station: Mm;
  /** The board's width there, both sides (the caption's `· 18 3/4" WIDE`; 0 at the nose tip). */
  widthAtStation: Mm;
  /** Where the foam ends a side, from the stringer: the rail, or — where a lift met the deck (D-40) — the knife edge
   * the seam records (`BoardSection.railEdgeAt`) or the slab's own, whichever is further in. */
  railEdge: Mm;
  /** A swallow's notch wall (0 elsewhere): the slab is two pieces, from it out to each rail. */
  inner: Mm;
  thickness: Mm;
  /** Drawing units per board millimetre: across (one scale for every station), and up (exaggerated). */
  kx: number;
  ky: number;
  /** The stringer's x, the straightedge's (the planed bottom's) y and the slab's top's y. */
  cx: number;
  y0: number;
  yTop: number;
  /** The slab, closed paths: one, or a swallow's two. None at the nose tip. */
  pieces: string[];
  /** The planed bottom: a straightedge rail to rail. */
  straightedge: { x1: number; x2: number; y: number };
  /** The stringer, a faint centreline down a whole slab. */
  stringer: { x: number; y1: number; y2: number } | null;
  /** The slab would not fit: its top is a break line (`breakPath`). */
  breakLine: boolean;
  breakPath: string | null;
  heightAsked: SectionHeight;
  /** The height factor actually drawn: the pick, or less when the cut was fitted into the box. */
  heightDrawn: number;
  fitted: boolean;
  /** Whether the ruler draws under it (a 548-dot box and the live cut has marks here). */
  ruler: boolean;
  /** The foam off across the station, `foamOff` held at the slab's top. */
  bottomAt: (across: number) => number;
}

/** What a section is drawn for: the live cut (its marks are the ruler's), and the station's own built section
 * (`builtSectionAt`; its `railEdgeAt`, D-40) — the screen's section and the printed sheet's both hand it in. */
export interface SectionOptions {
  live: BottomCutKey | null;
  seam?: Pick<BoardSection, "railEdgeAt"> | null;
}

/**
 * The litres' own section at one drawn station, for a section drawing's `seam` (the code review's WR-03, 2026-11-10):
 * `boardSections` over the very input the litres, the 3D board and the CNC files read, at this one station — so the
 * section on the screen and the one printed on the Bottom Contours sheet end their foam exactly where those end it
 * (D-40), never at the drawing's own estimate. A section costs well under a millisecond to build.
 *
 * Null on a bottom that cuts nothing (an input with no `foamOffAt`): no section of such a board can end before its
 * rail, so none is built and the drawing is its own, point for point.
 */
export function builtSectionAt(input: CrossSectionVolumeInput, station: Mm): BoardSection | null {
  if (!input.foamOffAt) return null;
  return boardSections(input, [station])[0] ?? null;
}

/** The live cut's layout marks at a station — DATA's own (`bottomLayoutMarks`), the columns of that cut. */
function liveMarksAt(resolved: ResolvedBottom, board: BottomBoard, live: BottomCutKey | null, station: Mm): { column: string; across: Mm }[] {
  if (live === null) return [];
  const { columns, rows } = bottomLayoutMarks(resolved, board, [station]);
  const out: { column: string; across: Mm }[] = [];
  columns.forEach((c, q) => {
    const v = rows[0].cells[q];
    if (c.section === live && v !== null) out.push({ column: c.key, across: v });
  });
  return out;
}

/**
 * Where a lift met the deck (D-40): walking out from the inside edge, the first place the foam off reaches the slab's
 * top, found by halving — the slab's own knife edge — or the rail.
 */
function slabEdge(off: (y: number) => number, inner: number, W: number, T: number): number {
  const n = SECTION_POINTS;
  let prev = inner;
  for (let j = 1; j <= n; j++) {
    const y = inner + ((W - inner) * j) / n;
    if (off(y) >= T) {
      let lo = prev;
      let hi = y;
      for (let q = 0; q < 40; q++) {
        const mid = (lo + hi) / 2;
        if (off(mid) >= T) hi = mid;
        else lo = mid;
      }
      return hi;
    }
    prev = y;
  }
  return W;
}

interface SectionLayout {
  cx: number;
  kx: number;
  y0: number;
  /** The slab breaks when its top would rise past this y. */
  topLimit: number;
  /** The cut's room above the straightedge. */
  room: number;
  height: number;
  points: number;
  breakLine: { amplitude: number; steps: number; overhang: number };
  stringerGap: { top: number; bottom: number };
}

/** The slab at one station on a given layout: the VIEWER's section and a GUIDE cartoon's share this. */
function layoutSection(
  resolved: ResolvedBottom,
  board: BottomBoard,
  station: Mm,
  layout: SectionLayout,
  seam: Pick<BoardSection, "railEdgeAt"> | null | undefined,
) {
  const s = station;
  const W = board.railAt(s);
  const inner = W > SECTION_MIN_HALF ? board.notchInner(s) : 0;
  const T = board.thicknessAt(s);
  const off = (y: number) => foamOff(resolved, board, s, mm(Math.abs(y)));
  const bottomAt = (y: number) => Math.min(off(y), T);
  const { cx, kx, y0 } = layout;
  // the height exaggerated by the pick — unless that would push the cut out of its room, when it is fitted instead
  const deepestHere = deepestCutAt(resolved, board, s);
  let ky = kx * layout.height;
  const fitted = deepestHere > SECTION_FIT_MIN && deepestHere * ky > layout.room;
  if (fitted) ky = layout.room / deepestHere;
  const slabTop = y0 - T * ky;
  const broken = slabTop < layout.topLimit;
  const yTop = broken ? layout.topLimit : slabTop;
  const xOf = (y: number) => cx + y * kx;
  const hOf = (y: number) => y0 - bottomAt(y) * ky;
  // D-40: where a lift met the deck the foam ends — the seam's knife edge, or the slab's own
  const seamEdge = seam?.railEdgeAt !== undefined ? inner + seam.railEdgeAt : Infinity;
  const edge = W > SECTION_MIN_HALF ? Math.min(W, seamEdge, slabEdge(off, inner, W, T)) : 0;
  const pieces: string[] = [];
  const piece = (yA: number, yB: number) => {
    let d = `M${xOf(yA).toFixed(1)} ${yTop.toFixed(1)}L${xOf(yB).toFixed(1)} ${yTop.toFixed(1)}`;
    for (let j = 0; j <= layout.points; j++) {
      const y = yB - ((yB - yA) * j) / layout.points;
      d += `L${xOf(y).toFixed(1)} ${hOf(y).toFixed(1)}`;
    }
    return `${d}Z`;
  };
  let breakPath: string | null = null;
  let stringer: SectionDrawing["stringer"] = null;
  if (edge > SECTION_MIN_HALF) {
    if (inner > SECTION_MIN_HALF) pieces.push(piece(inner, edge), piece(-edge, -inner));
    else pieces.push(piece(-edge, edge));
    if (broken) {
      const { amplitude, steps, overhang } = layout.breakLine;
      const x0 = xOf(-edge) - overhang;
      const span = 2 * edge * kx + 2 * overhang;
      let z = `M${x0.toFixed(1)} ${yTop.toFixed(1)}`;
      for (let j = 1; j <= steps; j++) z += `L${(x0 + (span * j) / steps).toFixed(1)} ${(yTop + (j % 2 ? -amplitude : amplitude)).toFixed(1)}`;
      breakPath = z;
    }
    if (inner <= SECTION_MIN_HALF) stringer = { x: cx, y1: yTop + layout.stringerGap.top, y2: hOf(0) - layout.stringerGap.bottom };
  }
  return { s, W, inner, T, edge, ky, fitted, yTop, broken, pieces, breakPath, stringer, xOf, bottomAt };
}

/**
 * The section at a station (D-13; UI-SPEC §3.3; the sketch's `drawSec`, template.html 707–753), in a box of
 * `box.width × box.height` dots:
 *
 * - **one scale across for every station**, set so the wide point's section spans the box less 20 dots a side (95%);
 *   the height exaggerated by the pick, or fitted — with the factor drawn — when the cut would leave its room;
 * - the planed slab with square rails, its bottom the cut (`foamOff`), a swallow's two pieces; at the nose tip no slab
 *   at all (`widthAtStation` 0, `· 0" WIDE`);
 * - D-40: where a lift met the deck the foam ends at its knife edge (`railEdge`) — the thinned rail, never a lip;
 * - the break line when the slab would not fit; the straightedge overhanging each rail by up to 30 dots; the stringer;
 * - the slab's foot 92 dots above the box's bottom (or 42% of it) when the ruler draws under it, else 44 (or 26%).
 */
export function bottomSection(
  resolved: ResolvedBottom,
  board: BottomBoard,
  station: Mm,
  height: SectionHeight,
  box: DrawingBox,
  options: SectionOptions,
): SectionDrawing {
  const px = DRAWING_WIDTH / box.width;
  const H = Math.round((DRAWING_WIDTH * box.height) / box.width);
  const kx = (DRAWING_WIDTH - 2 * SECTION_AIR * px) / board.widePointWidth;
  const marks = liveMarksAt(resolved, board, options.live, station);
  const ruler = box.width >= SECTION_RULER_MIN_BOX && marks.length > 0;
  const foot = ruler ? SECTION_FOOT.ruler : SECTION_FOOT.bare;
  const y0 = H - Math.min(foot.dots * px, H * foot.share);
  const topLimit = Math.min(SECTION_TOP_ROOM.dots * px, H * SECTION_TOP_ROOM.share);
  const room = Math.max(SECTION_CUT_ROOM.min * px, y0 - topLimit - SECTION_CUT_ROOM.clear * px);
  const laid = layoutSection(resolved, board, station, {
    cx: DRAWING_WIDTH / 2,
    kx,
    y0,
    topLimit,
    room,
    height,
    points: SECTION_POINTS,
    breakLine: { amplitude: BREAK_LINE.amplitude * px, steps: BREAK_LINE.steps, overhang: BREAK_LINE.overhang * px },
    stringerGap: { top: 2 * px, bottom: 2 * px },
  }, options.seam);
  const rail = Math.max(laid.edge, 0);
  const roomOut = DRAWING_WIDTH - laid.xOf(rail);
  const over = Math.max(STRAIGHTEDGE_OVERHANG.min * px, Math.min(STRAIGHTEDGE_OVERHANG.max * px, roomOut - STRAIGHTEDGE_OVERHANG.clear * px));
  return {
    width: DRAWING_WIDTH,
    height: H,
    px,
    station,
    widthAtStation: mm(laid.W > SECTION_MIN_HALF ? 2 * laid.W : 0),
    railEdge: mm(rail),
    inner: mm(laid.inner),
    thickness: mm(laid.T),
    kx,
    ky: laid.ky,
    cx: DRAWING_WIDTH / 2,
    y0,
    yTop: laid.yTop,
    pieces: laid.pieces,
    straightedge: { x1: laid.xOf(-rail) - over, x2: laid.xOf(rail) + over, y: y0 },
    stringer: laid.stringer,
    breakLine: laid.broken && laid.pieces.length > 0,
    breakPath: laid.breakPath,
    heightAsked: height,
    heightDrawn: laid.ky / kx,
    fitted: laid.fitted,
    ruler,
    bottomAt: laid.bottomAt,
  };
}

/**
 * The words in the section's top-left corner (UI-SPEC § "On the drawings"): `TRUE HEIGHT` at ×1 shown, `HEIGHT ×4`
 * at the pick, `HEIGHT ×2.3` — the factor actually drawn, to one decimal — when the cut had to be fitted.
 */
export function sectionHeightLabel(drawing: Pick<SectionDrawing, "heightAsked" | "heightDrawn">): string {
  const shown = drawing.heightDrawn;
  if (shown < 1.01) return "TRUE HEIGHT";
  return `HEIGHT ×${Math.abs(shown - drawing.heightAsked) < 0.01 ? drawing.heightAsked : shown.toFixed(1)}`;
}

/* ============ the gauges (D-13, D-30) ============ */

/** What a gauge reads (D-13): the gap under the straightedge at the stringer, the lift at the rails, a double's
 * trough or a channel's floor, and the foam left at the stringer. */
export type GaugeKind = "stringer" | "railLift" | "trough" | "channel" | "stringerLeft";

/** One dimension line, as `DimensionLine` draws it: an upright line with a tick at each end, in drawing units. */
export interface GaugeLine {
  x: number;
  y1: number;
  y2: number;
}

/** An extension line from the drawing out to a dimension line. */
export interface GaugeExtension {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A gauge's value on the drawing: where it anchors, and whether its words go with it (`rail lift`). */
export interface GaugeLabel {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  words: boolean;
}

/** A gauge reading, placed (D-13). Its value is a mark (`formatMark`); the component words it. */
export interface Gauge {
  kind: GaugeKind;
  value: Mm;
  /** The rail lift reads beside the rail with room past it, else under the straightedge at the right rail. */
  placement: "beside" | "under";
  /** Whether the box is wide enough for the words (`3/8" rail lift`) — 625 dots (D-30). */
  words: boolean;
  lines: GaugeLine[];
  extensions: GaugeExtension[];
  labels: GaugeLabel[];
}

/** A gauge's room past the right rail for its value beside the rail, in dots: with its words, and without (D-13). */
export const GAUGE_BESIDE_ROOM = { words: 110, bare: 60 } as const;
/** The stringer-left gauge needs this much room past the rail, in dots (D-13). */
export const GAUGE_STRINGER_LEFT_ROOM = 70;
/** A trough or channel floor is gauged when it stands this far (mm) inside the stringer and the rail, and is this
 * much (mm) deeper than the stringer's gap (the sketch's 3 and 0.25). */
const GAUGE_DEEPEST_INSET: Mm = mm(3);
const GAUGE_DEEPEST_OVER: Mm = mm(0.25);
/** The deepest gap off the stringer is looked for at 81 points across (the sketch's 80 spans). */
const GAUGE_DEEPEST_SPANS = 80;

/** Whether a gauge reading is drawn: only when it reads at least 1/16" (1 mm) — `0"` is never drawn (D-13). */
export function gaugeReads(value: number, system: UnitsSystem): boolean {
  return value > 0 && formatMark(mm(value), system) !== formatMark(mm(0), system);
}

/**
 * The gauge readings at the section (D-13, D-30; UI-SPEC §3.3; the sketch's dimension lines, template.html 754–780),
 * each the one number read where a gauge would sit:
 *
 * - the gap at the stringer, its value below (a swallow's notch has none: the stringer is air);
 * - the lift at the rail edge that remains (D-40), at each rail with extension lines — beside the rail (the value
 *   right of the right one) when there are 110 dots of room past it (60 in a box under 625), else the two lines just
 *   outside the rails and one value under the straightedge at the right rail;
 * - a double's trough or a channel's floor, the deepest gap off the stringer, on its own line (a second line under the
 *   stringer's when both draw);
 * - the stringer left, on the right, only for a whole slab with 70+ dots past the rail.
 *
 * A gauge draws only when it reads at least 1/16" in Imperial or 1 mm in Metric (`gaugeReads`); a flat station has
 * none. The words go with the values only in a box of 625 dots or more.
 */
export function sectionGauges(drawing: SectionDrawing, resolved: ResolvedBottom, board: BottomBoard, system: UnitsSystem): Gauge[] {
  const { px, cx, y0, ky, kx, yTop, station: s } = drawing;
  const Wo = drawing.railEdge;
  if (Wo <= SECTION_MIN_HALF) return [];
  const boxWidth = DRAWING_WIDTH / px;
  const words = boxWidth >= SECTION_WORDS_MIN_BOX;
  const xOf = (y: number) => cx + y * kx;
  const inner = drawing.inner;
  const off = (y: number) => Math.min(foamOff(resolved, board, s, mm(y)), drawing.thickness);
  const gauges: Gauge[] = [];
  const tick = (x: number, a: number, b: number): GaugeLine => ({ x, y1: Math.min(a, b), y2: Math.max(a, b) });
  const below = (x: number, y: number, line: number, anchor: GaugeLabel["anchor"], w: boolean): GaugeLabel => ({ x, y: y + (2 + 13 * line) * px, anchor, words: w });

  const d0 = inner <= SECTION_MIN_HALF ? off(0) : 0;
  const stringerShows = gaugeReads(d0, system);
  if (stringerShows) {
    gauges.push({ kind: "stringer", value: mm(d0), placement: "beside", words, lines: [tick(cx, y0, y0 - d0 * ky)], extensions: [], labels: [below(cx, y0, 1, "middle", words)] });
  }

  const dR = off(Wo);
  const roomRight = DRAWING_WIDTH - xOf(Wo);
  const beside = roomRight > (words ? GAUGE_BESIDE_ROOM.words : GAUGE_BESIDE_ROOM.bare) * px;
  const railShows = gaugeReads(dR, system);
  if (railShows) {
    const yt = y0 - dR * ky;
    if (beside) {
      const xr = xOf(Wo) + 16 * px;
      const xl = xOf(-Wo) - 16 * px;
      gauges.push({
        kind: "railLift",
        value: mm(dR),
        placement: "beside",
        words,
        lines: [tick(xr, y0, yt), tick(xl, y0, yt)],
        extensions: [
          { x1: xOf(Wo), y1: yt, x2: xOf(Wo) + 22 * px, y2: yt },
          { x1: xOf(-Wo), y1: yt, x2: xOf(-Wo) - 22 * px, y2: yt },
        ],
        labels: [
          { x: xr + 7 * px, y: (yt + y0) / 2 + 4 * px, anchor: "start", words },
          { x: xl - 7 * px, y: (yt + y0) / 2 + 4 * px, anchor: "end", words: false },
        ],
      });
    } else {
      const xd = xOf(Wo) + 8 * px;
      const xl = xOf(-Wo) - 8 * px;
      gauges.push({
        kind: "railLift",
        value: mm(dR),
        placement: "under",
        words,
        lines: [tick(xl, y0, yt), tick(xd, y0, yt)],
        extensions: [
          { x1: xOf(Wo), y1: yt, x2: xd + 6 * px, y2: yt },
          { x1: xOf(-Wo), y1: yt, x2: xl - 6 * px, y2: yt },
        ],
        labels: [below(xd, y0, 1, "end", words)],
      });
    }
  }

  const T = drawing.thickness;
  const left = T - d0;
  if (!drawing.breakLine && inner <= SECTION_MIN_HALF && T * ky > 30 * px && roomRight > GAUGE_STRINGER_LEFT_ROOM * px && (roomRight > 150 * px || !railShows) && gaugeReads(left, system)) {
    const reach = dR > 0.25 ? (words ? 110 : 60) : words ? 50 : 30;
    const xr = Math.min(DRAWING_WIDTH - (words ? 90 : 40) * px, xOf(Wo) + reach * px);
    const yb = y0 - d0 * ky;
    gauges.push({
      kind: "stringerLeft",
      value: mm(left),
      placement: "beside",
      words,
      lines: [tick(xr - 5 * px, yTop, yb)],
      extensions: [
        { x1: cx, y1: yTop, x2: xr, y2: yTop },
        { x1: cx, y1: yb, x2: xr, y2: yb },
      ],
      labels: [{ x: xr - 5 * px + 7 * px, y: (yTop + yb) / 2 + 4 * px, anchor: "start", words }],
    });
  }

  // the deepest gap off the stringer (a double's trough, a channel's floor), when it is not at the stringer
  let best = 0;
  let yBest = 0;
  for (let j = 0; j <= GAUGE_DEEPEST_SPANS; j++) {
    const y = (Wo * j) / GAUGE_DEEPEST_SPANS;
    const f = off(y);
    if (f > best + 1e-9) {
      best = f;
      yBest = y;
    }
  }
  if (yBest > GAUGE_DEEPEST_INSET && yBest < Wo - GAUGE_DEEPEST_INSET && best > d0 + GAUGE_DEEPEST_OVER && gaugeReads(best, system)) {
    const ch = resolved.channels;
    const inChannel = channelFoamOff(ch, board, resolved.wingRule, s, mm(yBest)) > 0;
    gauges.push({
      kind: inChannel ? "channel" : "trough",
      value: mm(best),
      placement: "beside",
      words: true,
      lines: [tick(xOf(yBest), y0, y0 - best * ky)],
      extensions: [],
      labels: [below(xOf(yBest), y0, stringerShows ? 2 : 1, "middle", true)],
    });
  }
  return gauges;
}

/* ============ the ruler (D-14, D-30) ============ */

/** One tick of the ruler: a layout mark of the live cut, off the stringer. */
export interface RulerTick {
  column: string;
  across: Mm;
  x: number;
  /** The value, bare (`1 3/4"`; Metric `44`). */
  text: string;
  /** 0 on the first row; 1 where it would touch the value before it. */
  row: 0 | 1;
}

/** The ruler of layout marks under the section (D-14, D-30). */
export interface SectionRuler {
  y: number;
  /** From the stringer to the farthest mark. */
  x1: number;
  x2: number;
  /** `OFF THE STRINGER` (Metric `OFF THE STRINGER · mm`), from a 625-dot box; none between 548 and 625. */
  caption: string | null;
  ticks: RulerTick[];
}

/**
 * The ruler (D-14, D-30; UI-SPEC §3.3; sketch lines 782–791): 40 dots under the straightedge, from the stringer to the
 * farthest mark, a tick and its bare value at every layout mark of the live cut at the station — DATA's own marks
 * (`bottomLayoutMarks`), so a channel wall appears only from its own channel's start — values alternating two rows
 * when they would touch (`measure` gives a value's width in dots). In a box of 548 dots or more, the caption from 625;
 * nothing below 548 or where the live cut has no mark.
 */
export function sectionRuler(
  drawing: SectionDrawing,
  resolved: ResolvedBottom,
  board: BottomBoard,
  live: BottomCutKey | null,
  system: UnitsSystem,
  measure: (text: string) => number,
): SectionRuler | null {
  const boxWidth = DRAWING_WIDTH / drawing.px;
  if (boxWidth < SECTION_RULER_MIN_BOX) return null;
  const marks = liveMarksAt(resolved, board, live, drawing.station);
  if (marks.length === 0) return null;
  const { px, cx, kx } = drawing;
  const xOf = (y: number) => cx + y * kx;
  const sorted = [...marks].sort((a, b) => a.across - b.across);
  let lastRight = -Infinity;
  let row: 0 | 1 = 0;
  const ticks: RulerTick[] = sorted.map((m) => {
    const x = xOf(m.across);
    const text = formatMarkBare(m.across, system);
    const w = measure(text) * px;
    row = x - w / 2 < lastRight + 4 * px ? (row ? 0 : 1) : 0;
    if (row === 0) lastRight = x + w / 2;
    return { column: m.column, across: m.across, x, text, row };
  });
  const caption = boxWidth >= SECTION_WORDS_MIN_BOX ? `OFF THE STRINGER${system === "metric" ? " · mm" : ""}` : null;
  return { y: drawing.y0 + 40 * px, x1: cx, x2: xOf(Math.max(...sorted.map((m) => m.across))), caption, ticks };
}

/* ============ the ghost (D-13, research §C) ============ */

/**
 * The finished rail from RAILS as it sits on what the bottom left (D-13; research §C): the station's own bottomed
 * ring from `boardSections` — the very `drawn` half the litres count and the 3D board draws — so the ghost can never
 * disagree with the 3D board. The section nearest `station` among `sections` (build them at the station itself —
 * `boardSections(input, [station])` — for the exact ring); its points across from the section's inside edge (add a
 * swallow's notch wall, `ghostRailPath`), up from the planed bottom. `null` where there is no foam.
 */
export function ghostRail(sections: readonly BoardSection[], station: Mm): HalfSectionPoints | null {
  let nearest: BoardSection | null = null;
  for (const sec of sections) if (!nearest || Math.abs(sec.station - station) < Math.abs(nearest.station - station)) nearest = sec;
  if (!nearest || !nearest.result || nearest.halfWidth <= 0) return null;
  return nearest.drawn ?? nearest.blended ?? sampledFinishedRail(nearest.result, nearest.domed, nearest.halfWidth);
}

/** The ghost's two halves as one SVG path's `d` on the section drawing, moved out by the swallow's notch wall. */
export function ghostRailPath(ring: HalfSectionPoints, drawing: Pick<SectionDrawing, "cx" | "kx" | "ky" | "y0" | "inner">): string {
  let d = "";
  for (const sign of [1, -1]) {
    ring.forEach(([y, h], q) => {
      d += `${q === 0 ? "M" : "L"}${(drawing.cx + sign * (drawing.inner + y) * drawing.kx).toFixed(1)} ${(drawing.y0 - h * drawing.ky).toFixed(1)}`;
    });
  }
  return d;
}

/* ============ the GUIDE cartoon (D-17) ============ */

/** A GUIDE cartoon's box (sketch lines 896–899): 300 wide, the top view 76 tall, 6 between, the section 72. */
export const CARTOON = { width: 300, top: 76, gap: 6, section: 72 } as const;
/** The cartoon's section is drawn at Height ×8 (D-13, D-17). */
export const CARTOON_HEIGHT: SectionHeight = 8;
/** The cartoon's section is taken at the cut's deepest, kept this far inside either tip (the sketch's 3"). */
export const CARTOON_TIP_CLEAR: Mm = inchesToMm(3);
/** The shade's strength in a cartoon, per 1/32" (UI-SPEC § Color: 5%; the top view's is 4%). */
export const CARTOON_SHADE_OPACITY = 0.05;

/** What a GUIDE card names: one of the eighteen cuts in its section, or the channels. */
export type GuideCartoonKey = { section: BottomSectionKey; name: BottomCutName } | { section: "channels"; count?: ChannelCount };

/** One GUIDE card's cartoon, in its own 300 × 154 units. */
export interface GuideCartoon {
  viewBox: string;
  /** The board from above: its outline, its shade (one path a level, shallowest first), its pencil lines, a double's
   * trough line, the stringer and the cutting line. */
  board: string;
  shade: string[];
  pencil: string;
  trough: string;
  stringer: { x1: number; y1: number; x2: number; y2: number };
  cutLine: { x: number; y1: number; y2: number };
  /** Where the section is taken, from the tail. */
  station: Mm;
  section: {
    pieces: string[];
    breakPath: string | null;
    stringer: { x: number; y1: number; y2: number } | null;
    straightedge: { x1: number; x2: number; y: number };
    heightDrawn: number;
    fitted: boolean;
  };
}

/** The open board with one cut alone at its starting numbers (D-17): every other section flat, no channels — or the
 * channels alone, six unless asked. */
export function cutAlone(key: GuideCartoonKey, board: BottomBoard, rule: BottomWingRule = DEFAULT_BOTTOM.wingRule): ResolvedBottom {
  const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
  bottom.wingRule = rule;
  if (key.section === "channels") bottom.channels = startingChannels(key.count ?? 6, board, bottom.channels);
  else bottom[key.section] = startingCut(key.section, key.name, board);
  return resolveBottom(bottom, board);
}

/**
 * A GUIDE card's cartoon (D-17; UI-SPEC §5; the sketch's `cartoon`, template.html 896–952): the cut named, alone, at
 * its starting numbers on the board the shaper has open (`cutAlone`) — from above, its shade (5% per 1/32") and its
 * pencil lines, the trough dashed, the stringer, and the cutting line where the cut is deepest (kept 3" inside either
 * tip; a flat at the wide point); 6 below, the section there at Height ×8 over the straightedge, with the break line
 * when the slab would not fit. The channels' card is six channels. `geometry` is the board's outline, for its edge.
 */
export function guideCartoon(key: GuideCartoonKey, board: BottomBoard, geometry: OutlineGeometry, rule: BottomWingRule = DEFAULT_BOTTOM.wingRule): GuideCartoon {
  const resolved = cutAlone(key, board, rule);
  const L = board.length;
  const Wmax = board.widePointWidth / 2;
  const kt = Math.min(284 / L, (CARTOON.top - 10) / (2 * Wmax));
  const cy = CARTOON.top / 2;
  const X = (s: number) => CARTOON.width / 2 + (L / 2 - s) * kt;
  const Y = (y: number) => cy + y * kt;
  const map: BoardToDrawing = (s, y) => ({ x: X(s), y: Y(y) });
  const outline = silhouette(geometry).map(({ station, w }) => ({ x: X(station), y: Y(w) }));
  const boardPath = outline.map((p, q) => `${q === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z";
  const shade = bottomShadeBands(resolved, board, CARTOON_GRID).map((level) => shadePathData(level.rects, map));
  const lines = bottomPencilLines(resolved, board, key.section);
  const pencil = polylinesPathData(lines.filter((l) => l.kind !== "trough").flatMap((l) => l.runs), map);
  const trough = polylinesPathData(lines.filter((l) => l.kind === "trough").flatMap((l) => l.runs), map);
  const at = key.section === "channels" ? liveStations(resolved, "channels") : liveStations(resolved, key.section);
  const station = mm(at ? Math.max(CARTOON_TIP_CLEAR, Math.min(L - CARTOON_TIP_CLEAR, at.deepest)) : board.widePoint);
  const halfThere = board.railAt(station);
  const top0 = CARTOON.top + CARTOON.gap;
  const y0 = top0 + CARTOON.section - 12;
  const budget = 8;
  const laid = layoutSection(resolved, board, station, {
    cx: CARTOON.width / 2,
    kx: 284 / (2 * Wmax),
    y0,
    topLimit: top0 + budget,
    room: y0 - top0 - budget - 4,
    height: CARTOON_HEIGHT,
    points: 90,
    breakLine: { amplitude: 2, steps: 24, overhang: 6 },
    stringerGap: { top: 2, bottom: 1.5 },
  }, null);
  const rail = Math.max(laid.edge, 0);
  return {
    viewBox: `0 0 ${CARTOON.width} ${CARTOON.top + CARTOON.gap + CARTOON.section}`,
    board: boardPath,
    shade,
    pencil,
    trough,
    stringer: { x1: X(L), y1: cy, x2: X(Math.max(0, geometry.centreCloseStation)), y2: cy },
    cutLine: { x: X(station), y1: Y(-halfThere) - 5, y2: Y(halfThere) + 5 },
    station,
    section: {
      pieces: laid.pieces,
      breakPath: laid.broken && laid.pieces.length > 0 ? laid.breakPath : null,
      stringer: laid.stringer,
      straightedge: { x1: laid.xOf(-rail) - 14, x2: laid.xOf(rail) + 14, y: y0 },
      heightDrawn: laid.ky / (284 / (2 * Wmax)),
      fitted: laid.fitted,
    },
  };
}
