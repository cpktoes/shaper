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
 * its height (D-08: outside the thing measured, the value beside it). */
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
    lx: x + (side === "right" ? 5 : -5),
    ly: (t + b) / 2,
    dy: 0.35,
    anchor: side === "right" ? "start" : "end",
  };
}

/** A horizontal dimension line at `y` from `xa` to `xb`, its label above or below it. */
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
  return { kind: "dim", x1: l, y1: y, x2: r, y2: y, parts, lx, ly: above ? y - 3 : y + 3, dy: above ? 0 : 0.85, anchor };
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
