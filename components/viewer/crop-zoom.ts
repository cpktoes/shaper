/**
 * The 3D canvas's zoom and slide (Phase 16, plan 09, UI-SPEC §4–§5, D-13, D-28): a crop of the picture the fixed
 * camera takes, never a move of the camera. The camera stands where it always stands and the room's lights shine
 * from where they always shine, so zooming in on a rail or sliding the board across the window can never change
 * how the foam is lit; all that changes is which part of the camera's picture fills the window
 * (`PerspectiveCamera.setViewOffset`, research Pattern 6).
 *
 * It speaks the 2D viewers' zoom vocabulary (`zoom-math.ts`): the same 1x to 10x in half steps, the same
 * snapping, the same "the point under the pointer stays under it", and a pinch worked out from where it started.
 * One difference, which UI-SPEC §5 asks for: the board may be slid at 1x too. How far it may go (`clamped`):
 * - Up to 2x, the picture's centre — where the board's centre sits at its 1x framing — stays inside the window, so
 *   the board can be moved aside but never lost (§5: "the board's centre can't leave the canvas").
 * - From 2x on, the window stays inside the 1x picture, which is the 2D viewers' own rule ("the view never leaves
 *   the drawing"): the nose and the tail can be zoomed right into, and the board is never lost either, since the 1x
 *   picture is framed on it. Held to the centre alone, the tips could not be reached past 2x at all. The two rules
 *   meet at exactly 2x, so the limit never jumps.
 *
 * The crop is kept as fractions of the picture (`CropView`), so a window that changes size (Wide view, a phone
 * turned) keeps the same zoom and the same slide on the new canvas. Pure: no React, no DOM, no three.
 */

import { DEFAULT_MAX_ZOOM, MIN_ZOOM, snapZoom, stepZoom } from "./zoom-math";

/**
 * How far in, and where. `cx`, `cy` are the crop's centre measured from the picture's middle, as fractions of the
 * picture's width and height (right and down positive), so the same view fits any canvas size.
 */
export interface CropView {
  zoom: number;
  cx: number;
  cy: number;
}

/** The whole picture, centred: the camera's own picture, uncropped. */
export const AT_ONE_CROP: CropView = { zoom: MIN_ZOOM, cx: 0, cy: 0 };

/** The four numbers `setViewOffset` takes after the full size: the crop's corner and size, in picture pixels. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const finite = (...values: number[]) => values.every(Number.isFinite);
const measured = (width: number, height: number) => finite(width, height) && width > 0 && height > 0;

/** True when `view` is the whole picture, centred (nothing to undo). */
export function isAtOneCrop(view: CropView): boolean {
  return view.zoom <= MIN_ZOOM && view.cx === 0 && view.cy === 0;
}

/**
 * How far the crop's centre may sit from the picture's middle, as a share of the picture, at zoom z: half a crop
 * (the picture's centre stays in the window), or the room left inside the picture (the window stays in the picture),
 * whichever is further — the first up to 2x, the second from 2x on.
 */
export function cropLimit(zoom: number): number {
  return Math.max(1 / (2 * zoom), 0.5 - 1 / (2 * zoom));
}

/** Holds the crop within `cropLimit` of the picture's middle on each axis. */
function clamped(zoom: number, cx: number, cy: number): CropView {
  const limit = cropLimit(zoom);
  const hold = (v: number) => Math.min(Math.max(v, -limit), limit) + 0;
  return { zoom, cx: hold(cx), cy: hold(cy) };
}

/** The part of a `width` × `height` picture the window shows at `view`. */
export function cropRect(view: CropView, width: number, height: number): CropRect {
  const w = width / view.zoom;
  const h = height / view.zoom;
  return {
    x: width / 2 + view.cx * width - w / 2,
    y: height / 2 + view.cy * height - h / 2,
    width: w,
    height: h,
  };
}

/**
 * Zooms to `newZoom` (snapped to a half step in [1, maxZoom]) about the window point (px, py): the part of the
 * picture under it stays under it, unless that would carry the crop past `cropLimit`, where it stops. The same level, a non-finite input or an unmeasured window leaves the view exactly as it was.
 */
export function cropZoomAt(
  view: CropView,
  width: number,
  height: number,
  newZoom: number,
  px: number,
  py: number,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropView {
  if (!measured(width, height) || !finite(newZoom, px, py)) return view;
  const zoom = snapZoom(newZoom, maxZoom);
  if (zoom === view.zoom) return view;
  const r = cropRect(view, width, height);
  // The picture point under the pointer, then the crop that puts it there at the new zoom.
  const picX = r.x + px / view.zoom;
  const picY = r.y + py / view.zoom;
  const centreX = picX - px / zoom + width / (2 * zoom);
  const centreY = picY - py / zoom + height / (2 * zoom);
  return clamped(zoom, (centreX - width / 2) / width, (centreY - height / 2) / height);
}

/** `steps` half steps in (positive) or out (negative), about the window's centre — the zoom row's buttons and keys. */
export function cropStep(view: CropView, width: number, height: number, steps: number, maxZoom = DEFAULT_MAX_ZOOM): CropView {
  if (!finite(steps)) return view;
  return cropZoomAt(view, width, height, stepZoom(view.zoom, steps, maxZoom), width / 2, height / 2, maxZoom);
}

/**
 * Slides the board by (dx, dy) window dots: it follows the pointer exactly, at any zoom including 1x, until the
 * crop reaches `cropLimit`, where it stops.
 */
export function cropSlide(view: CropView, width: number, height: number, dx: number, dy: number): CropView {
  if (!measured(width, height) || !finite(dx, dy)) return view;
  return clamped(view.zoom, view.cx - dx / (view.zoom * width), view.cy - dy / (view.zoom * height));
}

/**
 * Two fingers: the level follows the fingers' spread from where the pinch started (snapped, in [1, maxZoom]) and
 * the picture point that was between them when they landed stays between them — so moving both slides. Always
 * worked out from the pinch's start, never step by step, so nothing drifts. A starting distance under a dot is
 * ignored.
 */
export function cropPinch(
  start: CropView,
  width: number,
  height: number,
  startMid: { x: number; y: number },
  startDist: number,
  mid: { x: number; y: number },
  dist: number,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropView {
  if (!measured(width, height) || !(startDist >= 1) || !finite(startDist, dist, startMid.x, startMid.y, mid.x, mid.y)) {
    return start;
  }
  const zoom = snapZoom((start.zoom * dist) / startDist, maxZoom);
  const r = cropRect(start, width, height);
  const picX = r.x + startMid.x / start.zoom;
  const picY = r.y + startMid.y / start.zoom;
  const centreX = picX - mid.x / zoom + width / (2 * zoom);
  const centreY = picY - mid.y / zoom + height / (2 * zoom);
  return clamped(zoom, (centreX - width / 2) / width, (centreY - height / 2) / height);
}
