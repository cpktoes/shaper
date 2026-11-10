/**
 * The GUIDE cartoons' layout arithmetic (Phase 18, D-06 to D-08; UI-SPEC §4 and §12), ported from sketch
 * 022's `cardFrame`: the whole board nose left in a strip at the top, a dash-dot window on the part a card
 * is about, and that part again closer in a detail box under it.
 *
 * Every number here is layout — where a line or a label sits in the 300-wide drawing — never a board
 * figure: the board's own numbers come in already worked out by the app's maths, and every label arrives
 * already formatted. Pure; no React, browser or database (CLAUDE.md Rule 1).
 */
import type { OutlinePoint, Point2D } from "./board";
import {
  GUIDE_MIN_FIT,
  GUIDE_TEXT_PX,
  GUIDE_VIEWBOX_WIDTH,
  type GuideBox,
  type GuideFigure,
  type GuideRole,
  type GuidePrim,
  type GuideTextPart,
} from "./guide-card";
import type { OutlineGeometry } from "./outline";
import type { Mm } from "./units";

/** The strip's side margin and the width the board is fitted into. */
export const GUIDE_STRIP_MARGIN = 8;
export const GUIDE_STRIP_BAND = GUIDE_VIEWBOX_WIDTH - 2 * GUIDE_STRIP_MARGIN;
/** The gap between the strip and the detail under it. */
export const GUIDE_DETAIL_GAP = 6;
/** How far inside the strip a window's dash-dot rectangle is kept (UI-SPEC §12). */
export const GUIDE_WINDOW_INSET = 3;
/** The tallest a line of drawing text ever is, in drawing units: 10 screen dots on the narrowest card. */
export const GUIDE_TEXT_UNITS_MAX = GUIDE_TEXT_PX / GUIDE_MIN_FIT;

/**
 * A mapping from board millimetres to drawing units: `x = ox + s · kx`, `y = oy + a · ky`. A plan nose
 * left has a negative `kx` (the station grows toward the nose, drawn leftward); a cross-section standing
 * on its bottom has a negative `ky`. `k` is the scale, units per millimetre.
 */
export type GuideMap = { k: number; kx: number; ky: number; ox: number; oy: number };

/** Where a board station or an across-the-board offset lands. */
export function guideX(map: GuideMap, s: number): number {
  return map.ox + s * map.kx;
}
export function guideY(map: GuideMap, a: number): number {
  return map.oy + a * map.ky;
}

/**
 * The strip: the whole board from above, nose left, fitted into the 284-wide band between 8-unit margins
 * and into the strip's height less 12 (the sketch's `k = min(284 / L, (h − 12) / wideWidth)`), centred.
 */
export function guideStripFit(length: Mm, wideWidth: Mm, stripHeight: number): GuideMap {
  const k = Math.min(GUIDE_STRIP_BAND / length, (stripHeight - 12) / (wideWidth || 1));
  const ox = GUIDE_STRIP_MARGIN + length * k + (GUIDE_STRIP_BAND - length * k) / 2;
  return { k, kx: -k, ky: k, ox, oy: stripHeight / 2 };
}

/**
 * A window on the board: along it from `s0` to `s1` (millimetres from the tail), and across it `across`
 * either side of the stringer — or, with `half`, from the stringer out to one rail only.
 */
export type GuideWindowSpec = { s0: number; s1: number; across: number; half?: boolean };

/**
 * A window zoomed into its detail box: `kz = min(w / span, (h − top − bottom) / across)` (the sketch's
 * `min(w / span, (hDet − 14) / across)` with its 7 and 7 made the caller's gutters), centred in the band
 * the gutters leave, nose left like the strip. The dash-dot rectangle it returns is the window drawn on the
 * strip, three units beyond the window as the sketch drew it, **clamped three units inside the strip** — so
 * a whole-board window is the strip's own inset box and never reaches the card's name (UI-SPEC §12).
 */
export function guideWindowFit(
  win: GuideWindowSpec,
  strip: GuideMap,
  box: GuideBox,
  options: { stripHeight: number; top?: number; bottom?: number } = { stripHeight: 60 },
): { map: GuideMap; rect: GuideBox } {
  const top = options.top ?? 7;
  const bottom = options.bottom ?? 7;
  const span = Math.max(win.s1 - win.s0, 1e-9);
  const acrossAll = (win.half ? 1 : 2) * Math.max(win.across, 1e-9);
  const band = box.h - top - bottom;
  const kz = Math.min(box.w / span, band / acrossAll);
  const mid = (win.s0 + win.s1) / 2;
  const ox = box.x + box.w / 2 + mid * kz;
  const map: GuideMap = win.half
    ? { k: kz, kx: -kz, ky: -kz, ox, oy: box.y + top + band / 2 + (win.across * kz) / 2 }
    : { k: kz, kx: -kz, ky: kz, ox, oy: box.y + top + band / 2 };

  const x0 = Math.min(guideX(strip, win.s0), guideX(strip, win.s1));
  const x1 = Math.max(guideX(strip, win.s0), guideX(strip, win.s1));
  const y0 = guideY(strip, -win.across) - 3;
  const y1 = guideY(strip, win.across) + 3;
  return { map, rect: clampBox({ x: x0, y: Math.min(y0, y1), w: x1 - x0, h: Math.abs(y1 - y0) }, guideStripInset(options.stripHeight)) };
}

/** The strip's own box, three units in on every side: every window rectangle stays inside it. */
export function guideStripInset(stripHeight: number): GuideBox {
  return {
    x: GUIDE_WINDOW_INSET,
    y: GUIDE_WINDOW_INSET,
    w: GUIDE_VIEWBOX_WIDTH - 2 * GUIDE_WINDOW_INSET,
    h: stripHeight - 2 * GUIDE_WINDOW_INSET,
  };
}

function clampBox(b: GuideBox, inside: GuideBox): GuideBox {
  const x0 = Math.max(b.x, inside.x);
  const y0 = Math.max(b.y, inside.y);
  const x1 = Math.min(b.x + b.w, inside.x + inside.w);
  const y1 = Math.min(b.y + b.h, inside.y + inside.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** The detail box under a strip: 8 units in from each side, 6 under the strip, `detailHeight` tall. */
export function guideDetailBox(stripHeight: number, detailHeight: number): GuideBox {
  return { x: GUIDE_STRIP_MARGIN, y: stripHeight + GUIDE_DETAIL_GAP, w: GUIDE_STRIP_BAND, h: detailHeight };
}

/** The outline's half width at a station, straight between its points; the first point's beyond the tail,
 * nothing beyond the nose (the sketch's `halfAt`). */
export function guideHalfWidthAt(points: readonly OutlinePoint[], station: number): number {
  if (points.length === 0) return 0;
  if (station <= points[0].station) return points[0].halfWidth;
  for (let j = 1; j < points.length; j++) {
    if (points[j].station >= station) {
      const a = points[j - 1];
      const b = points[j];
      const run = b.station - a.station || 1;
      return a.halfWidth + (b.halfWidth - a.halfWidth) * ((station - a.station) / run);
    }
  }
  return 0;
}

const f1 = (v: number) => Math.round(v * 10) / 10;

/**
 * A closed outline from above: one rail tail to nose, the other back, and — where the tail closes on the
 * stringer somewhere else than its first point (a swallow's crotch, a diamond's tip) — the close to it.
 */
export function guideOutlinePath(points: readonly OutlinePoint[], map: GuideMap, centreCloseStation?: number): string {
  if (points.length === 0) return "";
  let d = "";
  for (const p of points) d += `${d ? "L" : "M"}${f1(guideX(map, p.station))} ${f1(guideY(map, p.halfWidth))}`;
  for (let j = points.length - 1; j >= 0; j--) d += `L${f1(guideX(map, points[j].station))} ${f1(guideY(map, -points[j].halfWidth))}`;
  if (centreCloseStation !== undefined && Math.abs(centreCloseStation - points[0].station) > 0.5) {
    d += `L${f1(guideX(map, centreCloseStation))} ${f1(guideY(map, 0))}`;
  }
  return `${d}Z`;
}

/**
 * A cross-section through the whole board from one rail's own points (`x` from the drawing's left edge
 * to the apex at 0, `y` up off the bottom), mirrored to the other rail: the deck across, over the rail,
 * along the bottom and back up the other rail. `halfWidth` is the board's half width there, so each
 * rail's apex lands on the outline's edge.
 */
export function guideSectionPath(rail: readonly Point2D[], halfWidth: number, map: GuideMap): string {
  if (rail.length === 0) return "";
  const at = (x: number, y: number) => `${f1(guideX(map, x))} ${f1(guideY(map, y))}`;
  let d = `M${at(0, rail[0].y)}`;
  for (const p of rail) d += `L${at(halfWidth + p.x, p.y)}`;
  for (let j = rail.length - 1; j >= 0; j--) d += `L${at(-(halfWidth + rail[j].x), rail[j].y)}`;
  return `${d}Z`;
}

/**
 * The board from above as every plan in a card draws it: the closed outline (`role`, the board itself
 * unless the card shades it or pushes it) and, for the board as it is, its stringer, `reach` units past
 * the nose and past where the tail closes. The stringer is the viewers' long-and-three-short dash.
 */
export function guidePlanPrims(
  geometry: Pick<OutlineGeometry, "points" | "length" | "centreCloseStation">,
  map: GuideMap,
  role: "board" | "shade" | "push" = "board",
  reach = 4,
): GuidePrim[] {
  const prims: GuidePrim[] = [{ kind: "path", role, d: guideOutlinePath(geometry.points, map, geometry.centreCloseStation) }];
  if (role !== "push") {
    const xNose = guideX(map, geometry.length);
    const xTail = guideX(map, Math.max(0, geometry.centreCloseStation));
    const dir = Math.sign(xTail - xNose) || 1;
    prims.push({
      kind: "line",
      role: "stringer",
      x1: f1(xNose - dir * reach),
      y1: f1(guideY(map, 0)),
      x2: f1(xTail + dir * reach),
      y2: f1(guideY(map, 0)),
    });
  }
  return prims;
}

/** A vertical dimension line at `x` from `ya` to `yb`, its label beside it on the given side, centred on
 * its height (D-08: outside the thing measured, the value beside it) and clear of the end ticks. */
export function guideVDim(
  x: number,
  ya: number,
  yb: number,
  parts: readonly GuideTextPart[],
  side: "right" | "left" = "right",
): GuidePrim {
  const t = Math.min(ya, yb);
  const b = Math.max(ya, yb);
  return {
    kind: "dim",
    x1: x,
    y1: t,
    x2: x,
    y2: b,
    parts,
    lx: x + (side === "right" ? GUIDE_VDIM_LABEL_OFF : -GUIDE_VDIM_LABEL_OFF),
    ly: (t + b) / 2,
    dy: 0.35,
    anchor: side === "right" ? "start" : "end",
  };
}

/** A horizontal dimension line at `y` from `xa` to `xb`, its label above or below it, clear of the end ticks. */
export function guideHDim(
  xa: number,
  xb: number,
  y: number,
  parts: readonly GuideTextPart[],
  above = true,
  anchor: "start" | "middle" | "end" = "middle",
): GuidePrim {
  const l = Math.min(xa, xb);
  const r = Math.max(xa, xb);
  const lx = anchor === "end" ? r : anchor === "start" ? l : (l + r) / 2;
  return { kind: "dim", x1: l, y1: y, x2: r, y2: y, parts, lx, ly: above ? y - GUIDE_HDIM_LABEL_OFF : y + GUIDE_HDIM_LABEL_OFF, dy: above ? 0 : 0.85, anchor };
}

/** A window's name in its detail's top-left corner, clear of the frame. */
export function guideWindowName(box: GuideBox, parts: readonly GuideTextPart[]): GuidePrim {
  return { kind: "text", role: "name", x: box.x + 4, y: box.y + 3, dy: 0.85, parts, anchor: "start" };
}

/** Of an em, how wide a character draws: Inter's figures and lower case at 0.62, the tracked capitals of
 * a name at 0.62 plus their 0.12 em of tracking. */
const CHAR_EM = 0.62;
const NAME_CHAR_EM = CHAR_EM + 0.12;

/**
 * The box a label takes at a fit (screen dots per drawing unit): its text is `10 / fit` units tall and
 * each character about 0.62 of that wide, so the estimate is the same one the browser test then checks.
 * `null` for a prim that is not a label.
 */
export function guideTextBox(prim: GuidePrim, fit: number): GuideBox | null {
  if (prim.kind !== "text" && prim.kind !== "dim") return null;
  const size = GUIDE_TEXT_PX / Math.max(fit, 1e-6);
  const chars = prim.parts.reduce((n, part) => n + part.text.length, 0);
  const em = prim.kind === "text" && prim.role === "name" ? NAME_CHAR_EM : CHAR_EM;
  const w = chars * em * size;
  const x = prim.kind === "text" ? prim.x : prim.lx;
  const baseline = (prim.kind === "text" ? prim.y : prim.ly) + (prim.dy ?? 0) * size;
  const left = prim.anchor === "start" ? x : prim.anchor === "end" ? x - w : x - w / 2;
  return { x: left, y: baseline - 0.75 * size, w, h: size };
}

function overlaps(a: GuideBox, b: GuideBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(a: GuideBox, b: GuideBox): boolean {
  const e = 0.01;
  return a.x >= b.x - e && a.y >= b.y - e && a.x + a.w <= b.x + b.w + e && a.y + a.h <= b.y + b.h + e;
}

/**
 * Every pair of labels that overlap at a fit, by their index in the figure's labels (the strip's first,
 * then each window's in turn), and every label that leaves its own box as `[i, -1]` — a window's label its
 * window, a strip label the drawing. An empty list is a drawing whose words never collide.
 */
export function guideLabelOverlaps(figure: GuideFigure, fit: number): readonly [number, number][] {
  const stripBox: GuideBox = { x: 0, y: 0, w: GUIDE_VIEWBOX_WIDTH, h: figure.windows[0]?.box.y ?? figure.height };
  const labels: { box: GuideBox; within: GuideBox }[] = [];
  for (const prim of figure.strip) {
    const box = guideTextBox(prim, fit);
    if (box) labels.push({ box, within: stripBox });
  }
  for (const win of figure.windows) {
    for (const prim of win.prims) {
      const box = guideTextBox(prim, fit);
      if (box) labels.push({ box, within: win.box });
    }
  }
  const out: [number, number][] = [];
  labels.forEach((label, i) => {
    if (!inside(label.box, label.within)) out.push([i, -1]);
    for (let j = i + 1; j < labels.length; j++) if (overlaps(label.box, labels[j].box)) out.push([i, j]);
  });
  return out;
}

function pathPoints(d: string): number[][] {
  const nums = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number) ?? [];
  const pts: number[][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

/** The figure's extent over every drawn point (labels' anchors included), for the check that a drawing
 * is finite and sits inside its own viewBox. Paths are read as the absolute `M`/`L`/`Q`/`C` pairs every
 * builder writes. */
export function guideFigureBounds(figure: GuideFigure): GuideBox {
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  const walk = (prim: GuidePrim) => {
    switch (prim.kind) {
      case "path":
        for (const [x, y] of pathPoints(prim.d)) add(x, y);
        break;
      case "line":
      case "dim":
        add(prim.x1, prim.y1);
        add(prim.x2, prim.y2);
        if (prim.kind === "dim") add(prim.lx, prim.ly);
        break;
      case "rect":
        add(prim.x, prim.y);
        add(prim.x + prim.w, prim.y + prim.h);
        break;
      case "text":
      case "dot":
        add(prim.x, prim.y);
        break;
    }
  };
  for (const prim of figure.strip) walk(prim);
  for (const win of figure.windows) {
    add(win.box.x, win.box.y);
    add(win.box.x + win.box.w, win.box.y + win.box.h);
    for (const prim of win.prims) walk(prim);
  }
  if (xs.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

/**
 * How far a dimension line's end tick reaches from the line's end, each way, in drawing units: the viewers'
 * own 45° slash (`CALLOUT_TICK_SIZE` in `components/viewer/callout-primitives.tsx`, which a GUIDE drawing
 * paints at one unit to the unit). A test holds the two to the same number.
 */
export const GUIDE_TICK_REACH = 4;
/** The least clear space, in drawing units, kept between a label's ink and a dimension's tick or line. */
export const GUIDE_LABEL_CLEAR = 1.5;
/** A horizontal dimension's label: this far above the line to its baseline, or below the line to the point
 * its capitals hang from (`dy` 0.85 em), so its ink clears the end ticks at any text size. */
export const GUIDE_HDIM_LABEL_OFF = GUIDE_TICK_REACH + GUIDE_LABEL_CLEAR;
/** A vertical dimension's label: this far beside the line, clear of the end ticks. */
export const GUIDE_VDIM_LABEL_OFF = GUIDE_TICK_REACH + GUIDE_LABEL_CLEAR;

/** The lines a label may never lie on: the board, a blank, a push, a fin, a rail, a window's dash-dot. The
 * rest of the vocabulary is the faint reference lines (a baseline, a station, the stringer, an extension). */
const INK_ROLES: ReadonlySet<GuideRole> = new Set<GuideRole>([
  "board",
  "shade",
  "foam",
  "window",
  "cut",
  "push",
  "fin",
  "rail",
  "band",
  "apex",
  "mark",
]);

/** A drawn line a label is checked against: its two ends, what it is, and whether it is only a faint
 * reference line. */
export type GuideStroke = { x1: number; y1: number; x2: number; y2: number; by: string; faint: boolean };

/** Every `M`…`L`… run of a path as its own list of points, closed where the run ends in `Z`. */
function pathRuns(d: string): number[][][] {
  const runs: number[][][] = [];
  for (const piece of d.split(/(?=M)/)) {
    const pts = pathPoints(piece);
    if (pts.length === 0) continue;
    if (/Z\s*$/i.test(piece) && pts.length > 1) pts.push(pts[0]);
    runs.push(pts);
  }
  return runs;
}

/** A closed outline a drawing fills or dashes (the board, its blank, a push), as its corner points. */
export type GuideShape = { role: GuideRole; points: readonly (readonly number[])[] };

/** Every closed outline a list of prims draws: each `M`…`Z` run of a path, with the path's role. */
export function guideShapes(prims: readonly GuidePrim[]): GuideShape[] {
  const out: GuideShape[] = [];
  for (const prim of prims) {
    if (prim.kind !== "path") continue;
    for (const piece of prim.d.split(/(?=M)/)) {
      if (!/Z\s*$/i.test(piece)) continue;
      const points = pathPoints(piece);
      if (points.length > 2) out.push({ role: prim.role, points });
    }
  }
  return out;
}

/** Whether a point lies inside a closed outline (a ray cast to the right, counting the sides it crosses). */
export function guidePointInShape(x: number, y: number, shape: GuideShape): boolean {
  const pts = shape.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The two end ticks of a dimension line, as the painter draws them: a 45° slash through each end. */
export function guideDimTicks(prim: Extract<GuidePrim, { kind: "dim" }>): GuideStroke[] {
  const t = GUIDE_TICK_REACH;
  return [
    { x1: prim.x1 - t, y1: prim.y1 + t, x2: prim.x1 + t, y2: prim.y1 - t, by: "tick", faint: false },
    { x1: prim.x2 - t, y1: prim.y2 + t, x2: prim.x2 + t, y2: prim.y2 - t, by: "tick", faint: false },
  ];
}

/** Every line a list of prims draws, as straight pieces: paths, lines, a window's rectangle, and each
 * dimension's own line and end ticks. Fills are not lines; a `railFill` draws none. */
export function guideStrokes(prims: readonly GuidePrim[]): GuideStroke[] {
  const out: GuideStroke[] = [];
  for (const prim of prims) {
    switch (prim.kind) {
      case "path": {
        if (prim.role === "railFill") break;
        const faint = !INK_ROLES.has(prim.role);
        for (const run of pathRuns(prim.d)) {
          for (let i = 1; i < run.length; i++) {
            out.push({ x1: run[i - 1][0], y1: run[i - 1][1], x2: run[i][0], y2: run[i][1], by: prim.role, faint });
          }
        }
        break;
      }
      case "line":
        out.push({ x1: prim.x1, y1: prim.y1, x2: prim.x2, y2: prim.y2, by: prim.role, faint: !INK_ROLES.has(prim.role) });
        break;
      case "rect": {
        const faint = prim.role === "frame";
        const [x0, y0, x1, y1] = [prim.x, prim.y, prim.x + prim.w, prim.y + prim.h];
        out.push({ x1: x0, y1: y0, x2: x1, y2: y0, by: prim.role, faint }, { x1: x1, y1: y0, x2: x1, y2: y1, by: prim.role, faint });
        out.push({ x1: x1, y1: y1, x2: x0, y2: y1, by: prim.role, faint }, { x1: x0, y1: y1, x2: x0, y2: y0, by: prim.role, faint });
        break;
      }
      case "dim":
        out.push({ x1: prim.x1, y1: prim.y1, x2: prim.x2, y2: prim.y2, by: "dimension", faint: false }, ...guideDimTicks(prim));
        break;
      default:
        break;
    }
  }
  return out;
}

/** The box a label's ink takes at a fit: `guideTextBox` without the room under the baseline that only a
 * descender uses, which figures and most of the drawings' words do not have. */
export function guideInkBox(prim: GuidePrim, fit: number): GuideBox | null {
  const box = guideTextBox(prim, fit);
  if (!box || (prim.kind !== "text" && prim.kind !== "dim")) return null;
  const descends = prim.parts.some((part) => /[gjpqy,]/.test(part.text));
  return { x: box.x, y: box.y + 0.03 * box.h, w: box.w, h: (descends ? 0.95 : 0.72) * box.h };
}

/** The room a label's ink can take at any text size: its ink box at the narrowest card, where the text is
 * biggest in drawing units, stretched to the point it is hung from, which a smaller text closes in on. A
 * place that is clear for this box is clear on every card. */
export function guideLabelHull(prim: GuidePrim): GuideBox | null {
  const box = guideInkBox(prim, GUIDE_MIN_FIT);
  if (!box || (prim.kind !== "text" && prim.kind !== "dim")) return null;
  const at = prim.kind === "dim" ? prim.ly : prim.y;
  const top = Math.min(box.y, at);
  const bottom = Math.max(box.y + box.h, at);
  return { x: box.x, y: top, w: box.w, h: bottom - top };
}

/** Whether a straight piece passes through a box grown by `gap` on every side (Liang–Barsky). */
export function guideStrokeMeetsBox(s: Pick<GuideStroke, "x1" | "y1" | "x2" | "y2">, box: GuideBox, gap = 0): boolean {
  const [x0, y0, x1, y1] = [box.x - gap, box.y - gap, box.x + box.w + gap, box.y + box.h + gap];
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
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
  return clip(-dx, s.x1 - x0) && clip(dx, x1 - s.x1) && clip(-dy, s.y1 - y0) && clip(dy, y1 - s.y1) && t0 <= t1;
}

/** A label lying on a drawn line: which label (its words), what it lies on, and whether that is only a
 * faint reference line. */
export type GuideCrossing = { text: string; by: string; faint: boolean; where: "strip" | number };

/**
 * Every label that lies on a drawn line at a fit — the board's edge, a push, a fin, another dimension, or
 * the end ticks of its own. Labels in a window are checked against that window's lines, the strip's against
 * the strip's. An empty list (faint lines aside) is a drawing whose every figure can be read.
 */
export function guideLabelCrossings(figure: GuideFigure, fit: number, gap = 0.4): GuideCrossing[] {
  const out: GuideCrossing[] = [];
  const scan = (prims: readonly GuidePrim[], where: "strip" | number) => {
    const strokes = guideStrokes(prims);
    for (const prim of prims) {
      const box = guideInkBox(prim, fit);
      if (!box || (prim.kind !== "text" && prim.kind !== "dim")) continue;
      const text = prim.parts.map((part) => part.text).join("");
      const seen = new Set<string>();
      for (const stroke of strokes) {
        if (seen.has(stroke.by) || !guideStrokeMeetsBox(stroke, box, gap)) continue;
        seen.add(stroke.by);
        out.push({ text, by: stroke.by, faint: stroke.faint, where });
      }
    }
  };
  scan(figure.strip, "strip");
  figure.windows.forEach((win, i) => scan(win.prims, i));
  return out;
}

/** A label drawn inside a closed outline: which label (its words) and what it sits in. */
export type GuideInside = { text: string; in: GuideRole; where: "strip" | number };

/**
 * Every label that sits inside a drawn outline at a fit — the board, its blank, a push — by its ink box's
 * centre or any corner. The drafting rule is that nothing but faint lines goes inside a board, so an empty
 * list is a drawing that keeps it. Labels in a window are checked against that window's outlines, the
 * strip's against the strip's.
 */
export function guideLabelsInShapes(figure: GuideFigure, fit: number): GuideInside[] {
  const out: GuideInside[] = [];
  const scan = (prims: readonly GuidePrim[], where: "strip" | number) => {
    const shapes = guideShapes(prims);
    if (shapes.length === 0) return;
    for (const prim of prims) {
      const box = guideInkBox(prim, fit);
      if (!box || (prim.kind !== "text" && prim.kind !== "dim")) continue;
      const corners = [
        [box.x + box.w / 2, box.y + box.h / 2],
        [box.x, box.y],
        [box.x + box.w, box.y],
        [box.x, box.y + box.h],
        [box.x + box.w, box.y + box.h],
      ];
      for (const shape of shapes) {
        if (corners.some(([x, y]) => guidePointInShape(x, y, shape))) {
          out.push({ text: prim.parts.map((part) => part.text).join(""), in: shape.role, where });
        }
      }
    }
  };
  scan(figure.strip, "strip");
  figure.windows.forEach((win, i) => scan(win.prims, i));
  return out;
}
