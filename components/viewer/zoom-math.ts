/**
 * The view maths behind zooming a drawing viewer (quick 261007-fnz, 2026-10-07): how far in the
 * shaper has zoomed, which part of the drawing that shows, and how the wheel, a pinch, a drag and
 * the zoom buttons move it.
 *
 * This decides what part of a picture the screen shows, never what shape a board is, so it lives
 * here beside `readout-placement.ts` rather than under `lib/geometry/` (D10; CLAUDE.md's Rule 1
 * keeps that directory for the formulas that decide a board). No React and no DOM, so every rule
 * below is tested on its own in `zoom-math.test.ts`.
 *
 * The client-aspect view (P1). A viewer draws its frame (its "base" viewBox) with
 * `preserveAspectRatio="xMidYMid meet"`, so at 1x the whole frame fits the box and the spare room
 * on one axis is left empty. Zoomed in, the visible rectangle takes the BOX's shape instead, sized
 * box ÷ (fit × zoom), so the drawing fills the box edge to edge and one drawing unit is exactly
 * fit × zoom screen pixels on both axes. That rectangle is then kept inside the frame on every axis
 * where it is smaller than the frame, and centred on the frame where it is still wider — so the
 * view never leaves the drawing (D3). At exactly 1x the base itself is used, untouched, so today's
 * picture is today's picture.
 *
 * The wheel (P6). A mouse notch is one step, whatever size the browser reports it as: the first
 * wheel event after `WHEEL_BURST_GAP_MS` of quiet takes one half step in its direction. A trackpad
 * scroll arrives as a stream of small events, so after that first one every `WHEEL_STEP_PX` of
 * scrolling in the same burst takes one more step. A trackpad pinch (ctrl+wheel in Chrome and
 * Firefox) zooms proportionally instead, by `exp(-delta × PINCH_WHEEL_RATE)` per event. All four
 * numbers are named here so they can be tuned by feel without touching a component.
 *
 * The grid (D5). Zoomed in, a grid appears behind the drawing: the finest of 1", 1/2", 1/4", 1/8",
 * 1/16" (Metric 2 cm, 1 cm, 5 mm, 2 mm, 1 mm) that leaves at least `GRID_MIN_GAP_PX` screen pixels
 * between lines, with the 1" (2 cm) lines darker. This module owns only that spacing rule and where
 * the lines fall; each viewer decides the grid's origin, orientation and units.
 */

import { mm, mmToInches, type UnitsSystem } from "@/lib/geometry/units";

/** The whole drawing. Below this nothing happens (D3). */
export const MIN_ZOOM = 1;
/** Every level is a half step: 1x, 1.5x, 2x … (the founder's brief: "1x to 10x in 0.5 steps"). */
export const ZOOM_STEP = 0.5;
/** The furthest a viewer zooms unless it sets its own `maxZoom` (plan 02's FINS stops at 4x). */
export const DEFAULT_MAX_ZOOM = 10;
/** A grid line is drawn only where the next one is at least this many screen pixels away (D5). */
export const GRID_MIN_GAP_PX = 20;
/** A wheel event after this much quiet starts a new burst, and takes one step on its own (P6). */
export const WHEEL_BURST_GAP_MS = 150;
/** Inside a burst, this many pixels of scrolling take one step (a trackpad scroll, P6). */
export const WHEEL_STEP_PX = 100;
/** A trackpad pinch's proportional rate: each event zooms by `exp(-deltaY × rate)` (P6). */
export const PINCH_WHEEL_RATE = 0.01;
/** Two taps within this long of each other are a double-tap, which goes back to 1x. */
export const DOUBLE_TAP_MS = 300;
/** …and within this many screen pixels of each other. */
export const DOUBLE_TAP_SLOP_PX = 30;

/** A rectangle in a drawing's own units, y down — the four numbers of an svg `viewBox`. */
export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An svg's laid-out box, in CSS pixels. */
export interface ClientSize {
  width: number;
  height: number;
}

/**
 * How far in, and where. A `null` centre is the middle of the base frame.
 *
 * `anchor` is the zoom's short memory: the box pixel the last zoom step was aimed at and the
 * drawing point it meant to hold there. Near the frame's edge (or while an axis is still wider than
 * the frame) the clamp moves the view and the point slides off the pointer; without this memory
 * every later step held the slid point instead, so the slip grew with every step (measured on
 * ROCKER's nose dot with a blank, 2026-10-07: 22 px off the pointer at 6x). With it, the next step
 * at the same pointer aims at the original point again, and once the clamp lets go it is back
 * under the pointer. A pan, or a step aimed somewhere else, forgets it.
 */
export interface ZoomState {
  zoom: number;
  center: { x: number; y: number } | null;
  anchor?: { px: number; py: number; x: number; y: number };
}

/** How far (in box pixels) the pointer may wander between two zoom steps and still count as
 * aiming at the same point. */
const ANCHOR_SLOP_PX = 2;

function maxLevel(maxZoom: number): number {
  if (!Number.isFinite(maxZoom)) return DEFAULT_MAX_ZOOM;
  return Math.max(MIN_ZOOM, Math.floor(maxZoom / ZOOM_STEP) * ZOOM_STEP);
}

/** The nearest half step, inside [1, maxZoom]. A non-finite level is 1; a `maxZoom` that is not a
 * half step is floored to one. */
export function snapZoom(z: number, maxZoom: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  const snapped = Math.round(z / ZOOM_STEP) * ZOOM_STEP;
  return Math.min(Math.max(snapped, MIN_ZOOM), maxLevel(maxZoom));
}

/** `steps` half steps in (positive) or out (negative) from `z`. */
export function stepZoom(z: number, steps: number, maxZoom: number): number {
  return snapZoom(snapZoom(z, maxZoom) + steps * ZOOM_STEP, maxZoom);
}

/** The level as the control shows it: "1x", "2.5x", "10x". */
export function formatZoomLevel(z: number): string {
  return `${Math.round(z / ZOOM_STEP) * ZOOM_STEP}x`;
}

/** An svg `viewBox` string's four numbers, or null when it is not four finite numbers with a
 * positive width and height. */
export function parseViewBox(s: string): ViewRect | null {
  const parts = s.trim().split(/[\s,]+/);
  if (parts.length !== 4) return null;
  const [x, y, width, height] = parts.map(Number);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function fmt(v: number): string {
  return String(Number(v.toFixed(4)));
}

/** A rectangle as an svg `viewBox` string. */
export function formatViewBox(r: ViewRect): string {
  return `${fmt(r.x)} ${fmt(r.y)} ${fmt(r.width)} ${fmt(r.height)}`;
}

/** Screen pixels per drawing unit at 1x — the `meet` fit — or 0 while the box is unmeasured. */
export function baseFit(base: ViewRect, client: ClientSize): number {
  if (!(client.width > 0) || !(client.height > 0) || !(base.width > 0) || !(base.height > 0)) return 0;
  return Math.min(client.width / base.width, client.height / base.height);
}

/** One axis of the view: kept inside the frame where it is smaller, centred where it is wider. */
function clampAxis(start: number, size: number, baseStart: number, baseSize: number): number {
  if (size >= baseSize) return baseStart + (baseSize - size) / 2;
  return Math.min(Math.max(start, baseStart), baseStart + baseSize - size);
}

/**
 * The part of the drawing the box shows at `state`. At zoom 1 (or while the box is unmeasured) it
 * is `base` itself; above 1, the box-shaped rectangle described in this module's header.
 */
export function zoomedView(base: ViewRect, client: ClientSize, state: ZoomState): ViewRect {
  const fit = baseFit(base, client);
  if (!(state.zoom > MIN_ZOOM) || fit <= 0) return base;
  const scale = fit * state.zoom;
  const width = client.width / scale;
  const height = client.height / scale;
  const cx = state.center?.x ?? base.x + base.width / 2;
  const cy = state.center?.y ?? base.y + base.height / 2;
  return {
    x: clampAxis(cx - width / 2, width, base.x, base.width),
    y: clampAxis(cy - height / 2, height, base.y, base.height),
    width,
    height,
  };
}

/** The drawing point under a box pixel, through the `xMidYMid meet` mapping — right for the
 * letterboxed base and for a zoomed view alike. */
export function clientToUser(viewBox: ViewRect, client: ClientSize, px: number, py: number): { x: number; y: number } {
  const s = baseFit(viewBox, client);
  if (s <= 0) return { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 };
  const offX = (client.width - viewBox.width * s) / 2;
  const offY = (client.height - viewBox.height * s) / 2;
  return { x: viewBox.x + (px - offX) / s, y: viewBox.y + (py - offY) / s };
}

function centerOf(r: ViewRect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** The state with its centre moved to where the clamp actually puts the view, so a pan that runs
 * into the frame's edge never leaves a dead zone to drag back through. */
function settled(base: ViewRect, client: ClientSize, zoom: number, center: { x: number; y: number }): ZoomState {
  return { zoom, center: centerOf(zoomedView(base, client, { zoom, center })) };
}

/** The view centre that puts drawing point `p` under box pixel (px, py) at `zoom`, before the
 * clamp. */
function centreHolding(client: ClientSize, scale: number, p: { x: number; y: number }, px: number, py: number) {
  return { x: p.x + (client.width / 2 - px) / scale, y: p.y + (client.height / 2 - py) / scale };
}

/**
 * Zooms to `newZoom` about the box pixel (px, py): the drawing point under it stays under it,
 * unless keeping the view inside the frame moves it (D3) — and then the next step at the same
 * pointer aims at that same point again (`ZoomState.anchor`). `newZoom` of 1 or less is the whole
 * drawing again.
 */
export function zoomAt(
  base: ViewRect,
  client: ClientSize,
  state: ZoomState,
  newZoom: number,
  px: number,
  py: number,
): ZoomState {
  if (!(newZoom > MIN_ZOOM)) return { zoom: MIN_ZOOM, center: null };
  const fit = baseFit(base, client);
  if (fit <= 0) return state;
  const a = state.anchor;
  const p =
    a && Math.abs(a.px - px) <= ANCHOR_SLOP_PX && Math.abs(a.py - py) <= ANCHOR_SLOP_PX
      ? { x: a.x, y: a.y }
      : clientToUser(zoomedView(base, client, state), client, px, py);
  const next = settled(base, client, newZoom, centreHolding(client, fit * newZoom, p, px, py));
  return { ...next, anchor: { px, py, x: p.x, y: p.y } };
}

/**
 * Drags the drawing by (dx, dy) box pixels: the view moves the other way by the same distance in
 * drawing units, and stops at the frame's edge (D3). Nothing moves at 1x.
 */
export function panBy(base: ViewRect, client: ClientSize, state: ZoomState, dxPx: number, dyPx: number): ZoomState {
  if (!(state.zoom > MIN_ZOOM)) return state;
  const scale = baseFit(base, client) * state.zoom;
  if (!(scale > 0)) return state;
  const c = centerOf(zoomedView(base, client, state));
  return settled(base, client, state.zoom, { x: c.x - dxPx / scale, y: c.y - dyPx / scale });
}

/**
 * Two fingers (D6): the level follows the spread of the fingers from where the pinch started,
 * snapped to half steps (P5) and kept inside [1, maxZoom], and the drawing point that was between
 * the fingers when they landed stays between them — so moving both fingers together pans. Always
 * worked out from the pinch's start, never step by step, so nothing drifts over a long pinch. A
 * starting distance under a pixel is ignored.
 */
export function pinchState(
  base: ViewRect,
  client: ClientSize,
  start: ZoomState,
  startMid: { x: number; y: number },
  startDist: number,
  mid: { x: number; y: number },
  dist: number,
  maxZoom: number,
): ZoomState {
  if (!(startDist >= 1) || !Number.isFinite(dist)) return start;
  const zoom = snapZoom((start.zoom * dist) / startDist, maxZoom);
  if (!(zoom > MIN_ZOOM)) return { zoom: MIN_ZOOM, center: null };
  const fit = baseFit(base, client);
  if (fit <= 0) return start;
  const p = clientToUser(zoomedView(base, client, start), client, startMid.x, startMid.y);
  return settled(base, client, zoom, centreHolding(client, fit * zoom, p, mid.x, mid.y));
}

/**
 * The transform that keeps a symbol (a card, a reading, a title) at its own screen size about its
 * anchor (x, y) while the drawing around it is zoomed: scale by the zoom unit (`1 / zoom`) about
 * that point. `undefined` at exactly 1, so the 1x markup — and every printed drawing — carries no
 * transform attribute at all (P1).
 */
export function zoomUnitTransform(x: number, y: number, zoomUnit: number): string | undefined {
  if (zoomUnit === 1) return undefined;
  return `translate(${fmt(x)} ${fmt(y)}) scale(${fmt(zoomUnit)}) translate(${fmt(-x)} ${fmt(-y)})`;
}

/** A dash pattern at the zoom unit, so its dashes keep their screen length; the same string (or
 * `undefined`) at exactly 1 (P1). */
export function scaleDash(dash: string | undefined, zoomUnit: number): string | undefined {
  if (dash === undefined || zoomUnit === 1) return dash;
  return dash
    .trim()
    .split(/[\s,]+/)
    .map((part) => fmt(Number(part) * zoomUnit))
    .join(" ");
}

/** The grid's rungs, coarse to fine (D5): 1", 1/2", 1/4", 1/8", 1/16". */
const IMPERIAL_GRID_IN = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16];
/** Metric's rungs in millimetres (D5): 2 cm, 1 cm, 5 mm, 2 mm, 1 mm — read into inches through the
 * units module, never by a hand-typed 25.4 (CLAUDE.md Rule 2). */
const METRIC_GRID_MM = [20, 10, 5, 2, 1];

/**
 * The grid's spacing for a drawing at `screenPxPerInch` (D5): the finest rung that leaves at least
 * `GRID_MIN_GAP_PX` screen pixels between lines, or `null` when not even the coarsest does (no grid).
 * `majorIn`, the darker lines' spacing, is the ladder's first rung — 1" (Imperial) or 2 cm (Metric)
 * — unless a viewer gives its own, which also starts the ladder there (plan 02's RAILS starts
 * Metric at 1 cm, its own plot pitch). Every value is in inches.
 */
export function gridStep(
  screenPxPerInch: number,
  system: UnitsSystem,
  majorIn?: number,
): { stepIn: number; majorIn: number } | null {
  if (!(screenPxPerInch > 0) || !Number.isFinite(screenPxPerInch)) return null;
  const full = system === "metric" ? METRIC_GRID_MM.map((v) => mmToInches(mm(v))) : IMPERIAL_GRID_IN;
  const ladder = majorIn === undefined ? full : full.filter((rung) => rung <= majorIn * (1 + 1e-9));
  if (ladder.length === 0) return null;
  const major = majorIn ?? ladder[0];
  let step: number | null = null;
  for (const rung of ladder) {
    if (rung * screenPxPerInch >= GRID_MIN_GAP_PX * (1 - 1e-9)) step = rung;
  }
  return step === null ? null : { stepIn: step, majorIn: major };
}

/**
 * Where a grid's lines fall along one axis: every `anchor + k × step` inside [lo, hi], in order,
 * `major` where k is a multiple of `majorEvery` (so the anchor itself is always a major line),
 * never more than `cap` of them (T-fnz-01). A bad step or an empty range draws nothing.
 */
export function gridPositions(
  anchor: number,
  step: number,
  lo: number,
  hi: number,
  majorEvery: number,
  cap = 4000,
): { at: number; major: boolean }[] {
  if (!(step > 0) || !Number.isFinite(step) || !Number.isFinite(anchor) || !(hi >= lo)) return [];
  const every = Math.max(1, Math.round(majorEvery));
  const eps = 1e-9;
  const first = Math.ceil((lo - anchor) / step - eps);
  const last = Math.floor((hi - anchor) / step + eps);
  const out: { at: number; major: boolean }[] = [];
  for (let k = first; k <= last && out.length < cap; k++) {
    out.push({ at: anchor + k * step, major: ((k % every) + every) % every === 0 });
  }
  return out;
}

/**
 * A rectangle of a viewer's outer frame, expressed in the frame of a content group drawn with
 * `rotate(rotation)` (ROCKER nose-up draws `rotate(90)`, TEMPLATE nose-left `rotate(-90)`), so a
 * grid drawn inside the turned group can be clipped to what is on screen.
 */
export function rectInContentFrame(rect: ViewRect, rotation: 0 | 90 | -90): ViewRect {
  if (rotation === 90) return { x: rect.y, y: -(rect.x + rect.width), width: rect.height, height: rect.width };
  if (rotation === -90) return { x: -(rect.y + rect.height), y: rect.x, width: rect.height, height: rect.width };
  return rect;
}

/** A wheel delta in pixels: lines are 16 px, pages the page's height. */
export function normaliseWheelDelta(deltaY: number, deltaMode: number, pageHeightPx: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * pageHeightPx;
  return deltaY;
}

/** The wheel's running total inside a burst, and when its last event came. */
export interface WheelAccumulator {
  sum: number;
  lastMs: number;
}

/**
 * One wheel event's half steps (P6): positive zooms in (the wheel turned away from the shaper,
 * a negative delta). The first event after `WHEEL_BURST_GAP_MS` of quiet is one step in its
 * direction; later events in the same burst add up, one step per `WHEEL_STEP_PX`.
 */
export function wheelStep(acc: WheelAccumulator, deltaPx: number, nowMs: number): { acc: WheelAccumulator; steps: number } {
  if (!(nowMs - acc.lastMs <= WHEEL_BURST_GAP_MS)) {
    return { acc: { sum: 0, lastMs: nowMs }, steps: -Math.sign(deltaPx) || 0 };
  }
  const sum = acc.sum + deltaPx;
  const n = Math.trunc(sum / WHEEL_STEP_PX);
  return { acc: { sum: sum - n * WHEEL_STEP_PX, lastMs: nowMs }, steps: -n || 0 };
}
