"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CalloutChip,
  CalloutSizeProvider,
  DimensionLine,
  MIN_PINNED_FIT_SCALE,
  OutputRail,
  ViewerOrientationProvider,
  pinnedCalloutSizes,
  useSvgClientSize,
  useSvgFitScale,
} from "@/components/viewer/callout-primitives";
import { useCoarsePointer } from "@/components/design/use-viewer-media";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import { useUnits } from "@/components/units-provider";
import type { OutlineSpec } from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import { formatDim, formatMark, stationLabel } from "@/lib/geometry/measure-display";
import {
  OUTLINE_DRAG_HIT_COARSE_PX,
  OUTLINE_DRAG_HIT_PX,
  WING_GRAB_DROP_PX,
  nearestWingDragTarget,
  solveWingDrag,
  wingDragPoints,
  type OutlineDragPoint,
  type WingDragTarget,
} from "@/lib/geometry/outline-drag";
import { MEASURE_STATION_MM, sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import { inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";
import { wingFinEdges } from "@/lib/geometry/wing-lock";
import {
  NO_FIN_EDGES,
  placedWings,
  wingLockEdge,
  wingReadouts,
  wingedHalfWidthAt,
  type Wing,
  type WingFinEdges,
} from "@/lib/geometry/wings";
import { DRAG_TARGET_CORE_PX, DRAG_TARGET_OUTER_PX, DRAG_TARGET_RING_PX } from "./outline-viewer";
import {
  CLOSE_UP,
  closeUpFrame,
  spreadApart,
  useCompactFrame,
  widestHalfWidthIn,
  wingWindow,
} from "./wing-view-layout";

/**
 * The WINGS tab's drawing: the last 26" of the tail, about two and a half times closer than the
 * VIEWER, with each wing's step and its dimensions (quick 261014-wii, 2026-10-14, D3, D6, P4; sketch
 * 014 B's `closeUpSvg` is the spec, its pictures beside it the look). A sibling of `OutlineViewer`,
 * not a prop on it: it shares the callout primitives (`CalloutChip`, `OutputRail`, `DimensionLine`,
 * the pinned callout sizes) and the drafting grammar — nothing inside the board but faint lines,
 * input chips in the left gutter, outputs on one right rail, read-outs pushed apart with an L leader
 * keeping the true station, the toolbar's corner kept clear (the frame's `padTop`).
 *
 * Always drawn tail-down: the window is near-square, so turning it buys nothing. No zoom: the
 * sketch's WINGS toolbar has only the construction and wide-view buttons. Its frame maths is pure in
 * `wing-view-layout.ts`.
 *
 * The grab points (plan 02, 2026-10-15, D5, P11): with Show construction on and an
 * `onWingsChange` handler, each wing draws two points exactly as the VIEWER draws its drag targets
 * — the outer one at the step's outer corner, the inner one hung 22 dots below the inner corner on
 * the depth dimension's line. A press picks one with `nearestWingDragTarget` (one delegated handler
 * on the svg, as the VIEWER's), every move solves with `solveWingDrag`, and the whole new wings list
 * goes up. **The window holds still from press to lift**: in the sketch's own check, a window that
 * re-framed mid-drag carried the wing 4 1/2" from a 1" pull, so the window in force at the press is
 * kept in state until the pointer lifts, and only then does the window rule apply again.
 *
 * On a phone, either way up, and in a computer window too narrow for the full frame, the close-up
 * draws its COMPACT frame (P13): chosen by the drawing's own room — the full frame's fit against
 * the pinned-callout floor — never by width or pointer, so CLAUDE.md's three switches stay
 * separate. The compact frame draws no station dimensions. A finger gets the coarse hit radius,
 * and the svg is `touch-none select-none`, so a thumb on a grab point drags the wing rather than
 * scrolling the page (P14).
 *
 * Every number a shaper reads goes through `measure-display.ts` (CLAUDE.md Rule 2, D9): a wing's
 * position and every width is a DIM (`formatDim`), its depth and run are MARKS (`formatMark`). The
 * drawing itself works in inches of board, like `OutlineViewer`'s.
 */
export interface WingCloseUpProps {
  /** The board's outline with its wings applied. */
  geometry: OutlineGeometry;
  /** The curve the shaper drew, without wings — drawn dashed behind the board. */
  baseGeometry: OutlineGeometry;
  /** The (resolved) outline, for its wings. */
  outline: OutlineSpec;
  finMarks: readonly FinMark[];
  showFins: boolean;
  showConstruction: boolean;
  /** A window to draw instead of `wingWindow`'s — the close-up holds its own still during a drag. */
  window?: { lo: Mm; hi: Mm };
  /** The whole new wings list from a grab-point drag. Omitted on a locked board, which then draws
   * no grab points and attaches no handlers (the VIEWER's own rule for `onOutlineDrag`). */
  onWingsChange?: (wings: Wing[]) => void;
  /** The fins' trailing edges as the store places them, for a locked wing's offset drag (D1). */
  edges?: WingFinEdges;
}

/** The hair either side of a corner the sketch reads widths at (1e-6"). */
const HAIR_MM = inchesToMm(1e-6);
/** How far past the left rail a locked wing's fin-edge line reaches, in drawing units. */
const FIN_EDGE_LINE_REACH = 34;
/** Room left between two read-outs, in multiples of one read-out's two text lines (the sketch's 40 at 17 + 12). */
const READOUT_GAP_FACTOR = 1.4;
/** Room left between two WING chips (the sketch's 6). */
const CHIP_GAP = 6;
/** A station dimension's value sits midway when the span is taller than this, else above it. */
const STATION_DIM_MIDWAY_MIN = 26;

/** A polyline through the outline's points in the window, with the window's own cut at `hi`. */
function windowPoints(g: OutlineGeometry, loIn: number, hiIn: number, fromStationIn: number): [number, number][] {
  const out: [number, number][] = [];
  for (const p of g.points) {
    const s = mmToInches(p.station);
    if (s < Math.max(loIn, fromStationIn) - 1e-9 || s > hiIn + 1e-9) continue;
    out.push([s, mmToInches(p.halfWidth)]);
  }
  const last = out[out.length - 1];
  if (last && last[0] < hiIn - 1e-9) {
    out.push([hiIn, mmToInches(sampleOutline(g, inchesToMm(hiIn)))]);
  }
  return out;
}

export function WingCloseUp({
  geometry,
  baseGeometry,
  outline,
  finMarks,
  showFins,
  showConstruction,
  window: frozenWindow,
  onWingsChange,
  edges: storeEdges = NO_FIN_EDGES,
}: WingCloseUpProps) {
  const { system } = useUnits();
  const svgRef = useRef<SVGSVGElement>(null);
  /** The live grab, from press to lift: which point, and the drop it was drawn with. */
  const dragRef = useRef<{ target: WingDragTarget; dropMm: Mm } | null>(null);
  /** The window in force at the press, held until the lift (D5). */
  const [heldWindow, setHeldWindow] = useState<{ lo: Mm; hi: Mm } | null>(null);

  const wings = placedWings(outline.wings ?? [], geometry);
  const hasWings = wings.length > 0;
  const win = frozenWindow ?? heldWindow ?? wingWindow(geometry.length, wings.map((w) => w.station));
  const loIn = mmToInches(win.lo);
  const hiIn = mmToInches(win.hi);
  const widest = widestHalfWidthIn(hasWings ? [geometry.points, baseGeometry.points] : [geometry.points], loIn, hiIn);
  // P13: the full frame's width is fixed for a given window, so reading it to choose never loops.
  const box = useSvgClientSize(svgRef);
  const fullFrame = closeUpFrame(loIn, hiIn, widest);
  const compact = useCompactFrame(box.width, box.height, fullFrame.width, MIN_PINNED_FIT_SCALE);
  const frame = compact ? closeUpFrame(loIn, hiIn, widest, true) : fullFrame;
  const { toX, toY } = frame;
  const coarsePointer = useCoarsePointer();
  const fit = useSvgFitScale(svgRef, frame.width, frame.height);
  const sizes = pinnedCalloutSizes(fit);

  // The grab points (D5, P11). Screen-pixel sizes are divided by the live fit, so a point keeps its
  // screen size in every window, as the VIEWER's do; the drop and the hit radius are converted to
  // board millimetres at the same scale before the pure solve sees them.
  const allWings = outline.wings ?? [];
  const grabbing = showConstruction && onWingsChange !== undefined;
  const handleUnit = fit > 0 ? 1 / fit : 1;
  const unitsToMm = (units: number) => inchesToMm(units / frame.unitsPerInch);
  const dropMm = unitsToMm(WING_GRAB_DROP_PX * handleUnit);
  const hitRadiusUnits = (coarsePointer ? OUTLINE_DRAG_HIT_COARSE_PX : OUTLINE_DRAG_HIT_PX) * handleUnit;
  const hitRadiusMm = unitsToMm(hitRadiusUnits);
  const grabPoints = grabbing ? wingDragPoints(geometry, allWings, dropMm) : [];

  /** A pointer's board position: the root svg's own matrix (the close-up is never turned or zoomed),
   * then the frame's `toX`/`toY` run backwards. */
  function toBoardPoint(event: ReactPointerEvent<SVGSVGElement>): OutlineDragPoint | null {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {
      station: inchesToMm(loIn + (frame.toY(loIn) - local.y) / frame.unitsPerInch),
      halfWidth: inchesToMm((local.x - frame.cx) / frame.unitsPerInch),
    };
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!grabbing) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    const hit = nearestWingDragTarget(grabPoints, boardPoint, hitRadiusMm);
    if (!hit) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { target: hit, dropMm };
    setHeldWindow(win);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || !onWingsChange) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    onWingsChange(solveWingDrag(geometry, allWings, drag.target, boardPoint, drag.dropMm, storeEdges, system));
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // The window rule applies again from here: a wing carried past 24" now grows the window.
    setHeldWindow(null);
  }

  const lengthIn = mmToInches(geometry.length);
  const podIn = mmToInches(geometry.tailPodStation);
  const cwIn = mmToInches(geometry.halfWidePointWidth);
  const inWindow = (sIn: number) => sIn >= loIn - 1e-9 && sIn <= hiIn + 1e-9;
  /** The board's half-width in inches at a station in inches, wings and all — the exact construction. */
  const hwAt = (sIn: number) => mmToInches(wingedHalfWidthAt(geometry, wings, inchesToMm(sIn)));
  const path = (pts: [number, number][]) => pts.map(([s, hw], i) => `${i ? "L" : "M"} ${toX(hw).toFixed(2)} ${toY(s).toFixed(2)}`);

  // 1-2. The curve without wings (dashed), then the winged board: its fill, then an ink line up each
  // side and across the tail — never across the window's own cut at `hi`.
  const outlineFillPath = (g: OutlineGeometry) => {
    const pts = windowPoints(g, loIn, hiIn, podIn);
    const up = path(pts);
    const down = pts
      .slice()
      .reverse()
      .map(([s, hw]) => `L ${toX(-hw).toFixed(2)} ${toY(s).toFixed(2)}`);
    const closeIn = Math.min(mmToInches(g.centreCloseStation), hiIn);
    return `${up.join(" ")} ${down.join(" ")} L ${toX(0).toFixed(2)} ${toY(closeIn).toFixed(2)} Z`;
  };
  const vis = windowPoints(geometry, loIn, hiIn, podIn);
  const right = path(vis).join(" ");
  const left = path(vis.map(([s, hw]) => [s, -hw] as [number, number])).join(" ");
  const centreCloseIn = mmToInches(geometry.centreCloseStation);
  const tailClose =
    loIn <= 0 && vis.length > 0
      ? `M ${toX(-vis[0][1]).toFixed(2)} ${toY(vis[0][0]).toFixed(2)} L ${toX(0).toFixed(2)} ${toY(centreCloseIn).toFixed(2)} L ${toX(vis[0][1]).toFixed(2)} ${toY(vis[0][0]).toFixed(2)}`
      : "";

  // 3. Reference lines across the board, each spanning its winged width there.
  const tail12In = mmToInches(MEASURE_STATION_MM);
  const nose12In = lengthIn - tail12In;
  const centreIn = lengthIn / 2;
  const wpIn = mmToInches(geometry.widePointStation);
  const stationLines: { sIn: number; dash: `--${string}` }[] = [];
  if (inWindow(tail12In)) stationLines.push({ sIn: tail12In, dash: "--outline-station-dash" });
  if (inWindow(centreIn)) stationLines.push({ sIn: centreIn, dash: "--outline-stringer-dash" });
  if (inWindow(nose12In)) stationLines.push({ sIn: nose12In, dash: "--outline-station-dash" });

  // The fins' trailing edges, for a locked wing's fin-edge line (front for wing 1, rear for wing 2).
  const edges = wingFinEdges(finMarks);

  // 6-7. Per wing: its read-outs, and the right rail they join.
  const readouts = wingReadouts(geometry, wings);
  const outputs: { sIn: number; edgeX: number; value: string; station: string }[] = [];
  if (inWindow(tail12In)) {
    outputs.push({
      sIn: tail12In,
      edgeX: toX(mmToInches(sampleOutline(geometry, MEASURE_STATION_MM))),
      value: formatDim(geometry.tailWidthAt12in, system),
      station: `Tail @ ${stationLabel(system)}`,
    });
  }
  if (!geometry.tailBlockPinned && inWindow(podIn)) {
    outputs.push({
      sIn: podIn,
      edgeX: toX(mmToInches(geometry.halfTailBlockWidth)),
      value: formatDim(mm(geometry.halfTailBlockWidth * 2), system),
      station: "Tail block",
    });
  }
  if (inWindow(centreIn) && hiIn > 30) {
    outputs.push({
      sIn: centreIn,
      edgeX: toX(hwAt(centreIn)),
      value: formatDim(mm(2 * inchesToMm(hwAt(centreIn))), system),
      station: "Center",
    });
  }
  if (inWindow(nose12In)) {
    outputs.push({
      sIn: nose12In,
      edgeX: toX(mmToInches(sampleOutline(geometry, inchesToMm(nose12In)))),
      value: formatDim(geometry.noseWidthAt12in, system),
      station: `Nose @ ${stationLabel(system)}`,
    });
  }
  readouts.forEach((r, i) => {
    outputs.push({
      sIn: mmToInches(r.stepStart),
      edgeX: toX(mmToInches(r.widthAhead) / 2),
      value: formatDim(r.widthAhead, system),
      station: `Ahead of wing ${i + 1}`,
    });
    outputs.push({
      sIn: mmToInches(r.inner),
      edgeX: toX(mmToInches(r.widthBehind) / 2),
      value: formatDim(r.widthBehind, system),
      station: `Behind wing ${i + 1}`,
    });
  });
  const outputYs = spreadApart(
    outputs.map((o) => ({ y: toY(o.sIn), half: 0 })),
    READOUT_GAP_FACTOR * (sizes.value + sizes.name),
  );

  // 8. The left gutter: a chip per wing.
  const chips = wings.map((w, i) => {
    // `WING n · FIN` only for a lock its slot holds with its fins present (D1).
    const locked = wingLockEdge(w, i, edges) !== null;
    return {
      key: i,
      y: toY(mmToInches(w.station)),
      name: locked ? `WING ${i + 1} · FIN` : `WING ${i + 1}`,
      nameColor: locked ? "var(--color-surf-accent-ink)" : undefined,
      value: `${formatMark(w.depth, system)} @ ${formatDim(w.station, system)}`,
      leaderToX: toX(-mmToInches(wingedHalfWidthAt(geometry, wings, mm(w.station + HAIR_MM)))),
    };
  });
  const chipYs = spreadApart(
    chips.map((c) => ({ y: c.y, half: 0 })),
    sizes.chipH + CHIP_GAP,
  );

  return (
    <CalloutSizeProvider value={sizes}>
      <ViewerOrientationProvider value="vertical">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="xMidYMid meet"
          // P14, as TEMPLATE's VIEWER svg: `touch-none` so a thumb drag shapes the wing instead of
          // scrolling the page, `select-none` and the callout suppression against iOS's long press.
          className="absolute inset-0 block h-full w-full select-none touch-none"
          style={{ WebkitTouchCallout: "none" }}
          data-wing-close-up
          data-frame={compact ? "compact" : "full"}
          data-window-lo-in={loIn.toFixed(3)}
          data-window-hi-in={hiIn.toFixed(3)}
          data-units-per-inch={frame.unitsPerInch.toFixed(4)}
          data-held={heldWindow ? "true" : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          role="img"
          aria-label="The tail close up, with each wing's step"
        >
          {hasWings && (
            <path
              data-wing-base-outline
              d={outlineFillPath(baseGeometry)}
              fill="none"
              stroke="var(--outline-ghost)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          <path d={outlineFillPath(geometry)} fill="var(--outline-board-fill)" stroke="none" />
          <path
            data-board-silhouette="wings"
            d={`${right} ${left} ${tailClose}`}
            fill="none"
            stroke="var(--outline-ink)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Interior: faint lines only, never text (D6). */}
          <line
            x1={frame.cx}
            y1={toY(hiIn) - 6}
            x2={frame.cx}
            y2={toY(loIn) + 6}
            stroke="var(--outline-station-line)"
            strokeDasharray={zoomDashToken("--outline-stringer-dash", 1)}
          />
          {stationLines.map(({ sIn, dash }) => (
            <line
              key={sIn}
              x1={toX(-hwAt(sIn))}
              y1={toY(sIn)}
              x2={toX(hwAt(sIn))}
              y2={toY(sIn)}
              stroke="var(--outline-station-line)"
              strokeDasharray={zoomDashToken(dash, 1)}
            />
          ))}
          {inWindow(wpIn) && (
            <>
              <line
                x1={toX(-cwIn)}
                y1={toY(wpIn)}
                x2={toX(cwIn)}
                y2={toY(wpIn)}
                stroke="var(--outline-widepoint-line)"
                strokeDasharray={zoomDashToken("--outline-widepoint-dash", 1)}
              />
              <circle cx={toX(-cwIn)} cy={toY(wpIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
              <circle cx={toX(cwIn)} cy={toY(wpIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
            </>
          )}

          {/* 4. With Show construction: each wing's two grab points, drawn as the VIEWER draws a drag
              target — board-fill disc, accent ring, warning core — or, with no handler (a locked
              board), plain dots at the step's start and inner corner. */}
          {grabbing &&
            allWings.map((_, i) => (
              <g key={i} data-wing-construction={i + 1} pointerEvents="none">
                {grabPoints
                  .filter((p) => p.target.wing === i)
                  .map((p) => {
                    const x = toX(mmToInches(p.point.halfWidth));
                    const y = toY(mmToInches(p.point.station));
                    return (
                      <g key={p.target.point}>
                        <circle
                          cx={x}
                          cy={y}
                          r={DRAG_TARGET_OUTER_PX * handleUnit}
                          fill="var(--outline-board-fill)"
                          stroke="var(--color-surf-accent-ink)"
                          strokeWidth={DRAG_TARGET_RING_PX * handleUnit}
                        />
                        <circle cx={x} cy={y} r={DRAG_TARGET_CORE_PX * handleUnit} fill="var(--color-surf-warning)" />
                      </g>
                    );
                  })}
              </g>
            ))}
          {showConstruction &&
            !grabbing &&
            readouts.map((r, i) => (
              <g key={i} data-wing-construction={i + 1}>
                <circle
                  cx={toX(mmToInches(r.widthAhead) / 2)}
                  cy={toY(mmToInches(r.stepStart))}
                  r={3.5}
                  fill="var(--outline-construction)"
                />
                <circle
                  cx={toX(mmToInches(r.widthBehind) / 2)}
                  cy={toY(mmToInches(r.inner))}
                  r={3.5}
                  fill="var(--outline-construction)"
                />
              </g>
            ))}

          {/* 5. With Show fins: the fins where FINS puts them, marks only, no dims (D4). */}
          {showFins &&
            finMarks.map((m, i) => {
              const x1 = toX(mmToInches(m.lateral));
              const y1 = toY(mmToInches(m.offTail));
              const x2 = toX(mmToInches(m.leadingLateral));
              const y2 = toY(mmToInches(m.leadingOffTail));
              return (
                <g key={i} data-fin-mark>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-surf-accent-ink)" strokeWidth={2} />
                  <circle cx={x1} cy={y1} r={3.5} fill="var(--outline-ink)" />
                  <circle cx={x2} cy={y2} r={3.5} fill="var(--outline-ink)" />
                </g>
              );
            })}

          {/* 6. Per wing: the faint extension lines, the depth, the run, and a locked wing's fin edge. */}
          {wings.map((w, i) => {
            const r = readouts[i];
            const aheadIn = mmToInches(r.widthAhead) / 2;
            const behindIn = mmToInches(r.widthBehind) / 2;
            const stepStartIn = mmToInches(r.stepStart);
            const innerIn = mmToInches(r.inner);
            const yd = toY(innerIn) + CLOSE_UP.depthDimDrop;
            const xAhead = toX(aheadIn);
            const xBehind = toX(behindIn);
            const stationIn = mmToInches(w.station);
            const runY0 = toY(stationIn);
            const runY1 = toY(stationIn - mmToInches(w.run));
            const runX = frame.extensionEndX + 2;
            const finEdge = wingLockEdge(w, i, edges);
            return (
              <g key={i} data-wing-dims={i + 1}>
                <line x1={xAhead} y1={toY(stepStartIn)} x2={xAhead} y2={yd + 5} stroke="var(--outline-station-line)" />
                <line x1={xBehind} y1={toY(innerIn)} x2={xBehind} y2={yd + 5} stroke="var(--outline-station-line)" />
                <g data-wing-depth-dim={i + 1}>
                  <DimensionLine
                    x1={Math.min(xAhead, xBehind)}
                    y1={yd}
                    x2={Math.max(xAhead, xBehind)}
                    y2={yd}
                    value={formatMark(w.depth, system)}
                    labelX={Math.max(xAhead, xBehind) + 8}
                    labelY={yd + sizes.dim * 0.32}
                    labelAnchor="start"
                  />
                </g>
                {w.run > 0 && runY1 - runY0 >= CLOSE_UP.runDimMinUnits && (
                  <g data-wing-run-dim={i + 1}>
                    <DimensionLine
                      x1={runX}
                      y1={runY0}
                      x2={runX}
                      y2={runY1}
                      value={formatMark(w.run, system)}
                      labelX={runX + 7}
                      labelY={(runY0 + runY1) / 2 + sizes.dim * 0.32}
                      labelAnchor="start"
                    />
                  </g>
                )}
                {finEdge !== null && showFins && (
                  <line
                    data-wing-fin-edge={i + 1}
                    x1={toX(0)}
                    y1={toY(mmToInches(finEdge))}
                    x2={toX(-aheadIn) - FIN_EDGE_LINE_REACH}
                    y2={toY(mmToInches(finEdge))}
                    stroke="var(--color-surf-accent-ink)"
                    strokeDasharray="2 3"
                  />
                )}
              </g>
            );
          })}

          {/* 7. The right rail: every read-out at one x, pushed apart when two would touch. */}
          {outputs.map((o, i) => (
            <OutputRail
              key={o.station}
              valueX={frame.valueX}
              edgeX={o.edgeX}
              y={toY(o.sIn)}
              readoutY={outputYs[i]}
              value={o.value}
              station={o.station}
            />
          ))}

          {/* 8. The left gutter: a chip per wing, its leader kept on the wing's own station. */}
          {chips.map((c, i) => (
            <CalloutChip
              key={c.key}
              x={frame.chipRightX}
              y={chipYs[i]}
              name={c.name}
              value={c.value}
              nameColor={c.nameColor}
              leaderToX={c.leaderToX}
              leaderAtY={c.y}
            />
          ))}

          {/* 9. Each wing's station from the tail, at the far left — on the full frame only; the
              compact frame has no room beside its chip column (F20, P13). */}
          {!compact &&
            loIn <= 0 &&
            wings.map((w, i) => {
              const x = frame.stationDimX(i);
              const top = toY(mmToInches(w.station));
              const bottom = toY(0);
              const midway = bottom - top > STATION_DIM_MIDWAY_MIN;
              return (
                <g key={i} data-wing-station-dim={i + 1}>
                  <DimensionLine
                    x1={x}
                    y1={top}
                    x2={x}
                    y2={bottom}
                    value={formatDim(w.station, system)}
                    labelX={x + 7}
                    labelY={midway ? (top + bottom) / 2 + sizes.dim * 0.32 : top - 5}
                    labelAnchor="start"
                  />
                </g>
              );
            })}

          {/* 10. The grab areas, last so they sit above everything they cover. No press handler of
              their own — the svg's one delegated handler picks (as the VIEWER's); these are the
              cursor and the `data-wing-grab` test hook. */}
          {grabPoints.map((p) => (
            <circle
              key={`${p.target.wing}-${p.target.point}`}
              data-wing-grab={p.target.point}
              data-wing={p.target.wing + 1}
              cx={toX(mmToInches(p.point.halfWidth))}
              cy={toY(mmToInches(p.point.station))}
              r={hitRadiusUnits}
              fill="transparent"
              className="cursor-grab touch-none select-none active:cursor-grabbing"
              style={{ WebkitTouchCallout: "none" }}
            />
          ))}
        </svg>
      </ViewerOrientationProvider>
    </CalloutSizeProvider>
  );
}
