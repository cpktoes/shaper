"use client";

/**
 * The grid a drawing grows as the shaper zooms in (quick 261007-fnz, 2026-10-07, D5): plain lines
 * at the finest of 1", 1/2", 1/4", 1/8", 1/16" (Metric 2 cm, 1 cm, 5 mm, 2 mm, 1 mm) that leaves
 * at least 20 screen pixels between them, the 1" (2 cm) lines in the station-line ink and the finer
 * ones lighter — so a shaper zoomed in on a nose can read a distance off the drawing the way they
 * would off a cutting mat.
 *
 * The viewer owns the grid's origin, orientation and units — ROCKER anchors it at the board's tail
 * tip along the board and at the rocker baseline across it — while this component owns only the
 * spacing rule (`gridStep` in `zoom-math.ts`) and draws the lines in the viewer's own frame,
 * clipped to the drawing's frame and to what is on screen.
 *
 * No grid at exactly 1x, ever (P7): FINS already reads 18.66 px per inch at 1x on a 1280×800
 * computer, just under the 20-pixel line, so a bigger window would otherwise put a grid on it at 1x
 * and change a picture the founder has already approved. The grid is never drawn in print either
 * (no print path has a zoom provider). Because it is new and never at 1x, it uses the founder's own
 * mechanism for a hairline, `vector-effect: non-scaling-stroke` at 1 pixel, rather than the zoom
 * unit the rest of the drawing uses. A viewer draws it FIRST in its content group, so it sits
 * behind the drawing and shows around the board and through a blank's foam, not across the board
 * (P8).
 */

import type { UnitsSystem } from "@/lib/geometry/units";
import { gridPositions, gridStep, type ViewRect } from "./zoom-math";

/** The finer lines: the station-line ink at half strength. */
const DEFAULT_MINOR_INK = "color-mix(in srgb, var(--outline-station-line) 50%, transparent)";

export interface ZoomGridProps {
  zoom: number;
  /** The viewer's screen pixels per drawing unit at 1x. */
  fitScale: number;
  /** Drawing units per inch. */
  unitsPerInch: number;
  /** A point every grid line is counted from, in the viewer's own frame. */
  anchor: { x: number; y: number };
  /** The drawing's frame, in the viewer's own frame: no line runs outside it. */
  bounds: ViewRect;
  /** What is on screen, in the viewer's own frame. */
  visible: ViewRect | null;
  system: UnitsSystem;
  /** The darker lines' spacing in inches, when a viewer wants its own (plan 02's RAILS). */
  majorIn?: number;
  majorInk?: string;
  minorInk?: string;
}

export function ZoomGrid({
  zoom,
  fitScale,
  unitsPerInch,
  anchor,
  bounds,
  visible,
  system,
  majorIn,
  majorInk = "var(--outline-station-line)",
  minorInk = DEFAULT_MINOR_INK,
}: ZoomGridProps) {
  if (!(zoom > 1) || !visible) return null;
  const step = gridStep(unitsPerInch * fitScale * zoom, system, majorIn);
  if (!step) return null;
  const x0 = Math.max(bounds.x, visible.x);
  const x1 = Math.min(bounds.x + bounds.width, visible.x + visible.width);
  const y0 = Math.max(bounds.y, visible.y);
  const y1 = Math.min(bounds.y + bounds.height, visible.y + visible.height);
  if (!(x1 > x0) || !(y1 > y0)) return null;
  const stepUnits = step.stepIn * unitsPerInch;
  const majorEvery = Math.round(step.majorIn / step.stepIn);
  const across = gridPositions(anchor.x, stepUnits, x0, x1, majorEvery);
  const along = gridPositions(anchor.y, stepUnits, y0, y1, majorEvery);
  const line = (key: string, major: boolean, ax: number, ay: number, bx: number, by: number) => (
    <line
      key={key}
      x1={ax}
      y1={ay}
      x2={bx}
      y2={by}
      stroke={major ? majorInk : minorInk}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      data-major={major ? "" : undefined}
    />
  );
  return (
    <g data-zoom-grid pointerEvents="none">
      {across.map((p) => line(`x${p.at}`, p.major, p.at, y0, p.at, y1))}
      {along.map((p) => line(`y${p.at}`, p.major, x0, p.at, x1, p.at))}
    </g>
  );
}
