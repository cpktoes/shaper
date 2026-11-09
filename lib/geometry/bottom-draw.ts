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
  CHANNEL_FLAT_KEY,
  channelMarks,
  cutHalfWidth,
  doubleMarks,
  fadeAt,
  foamOff,
  type BottomBoard,
  type BottomSectionKey,
  type ResolvedBottom,
  type ResolvedChannels,
  type ResolvedCut,
} from "./bottom";
import type { FinMark, FinPlacementResult, FinRole } from "./fins";
import { formatBottomStation } from "./blank-reasons";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "./units";

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
 * grid (measured on every starting cut of the four presets: under 0.02 mm), and a 1/4" cut would otherwise shade
 * seven levels deep, not eight. Display only — the shade is a tone, the numbers are elsewhere (UI-SPEC § Color).
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
