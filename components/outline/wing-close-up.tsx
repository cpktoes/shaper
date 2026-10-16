"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CALLOUT_PX,
  CalloutSizeProvider,
  MIN_PINNED_FIT_SCALE,
  ViewerOrientationProvider,
  pinnedCalloutSizes,
  useSvgClientSize,
} from "@/components/viewer/callout-primitives";
import { useCoarsePointer } from "@/components/design/use-viewer-media";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import { useUnits } from "@/components/units-provider";
import type { OutlineSpec } from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import { formatDim, formatMark, formatSignedMark, stationLabel } from "@/lib/geometry/measure-display";
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
  effectiveWingRadius,
  placedWings,
  wingLockEdge,
  wingReadouts,
  wingedHalfWidthAt,
  type Wing,
  type WingFinEdges,
} from "@/lib/geometry/wings";
import { DRAG_TARGET_CORE_PX, DRAG_TARGET_OUTER_PX, DRAG_TARGET_RING_PX } from "./outline-viewer";
import { WingDataCard, type WingDataCardRow } from "./wing-data-card";
import {
  CLOSE_UP_CORNER_PX,
  closeUpFrame,
  spreadApart,
  widestHalfWidthIn,
  wingCardHeightPx,
  wingWindow,
} from "./wing-view-layout";

/**
 * The WINGS tab's drawing: the last 26" of the tail, close up, with each wing's step (quick
 * 261014-wii, 2026-10-14, D3, D6, P4; sketch 014 B's `closeUpSvg` is the spec, its pictures beside
 * it the look). A sibling of `OutlineViewer`, not a prop on it: it shares the callout primitives
 * (the card surface, the pinned callout sizes) and the drafting grammar — nothing inside the board
 * but faint lines, cards in the left gutter with a leader to what they name, cards pushed apart with
 * an L leader keeping the true station.
 *
 * **Every wing number in its card on the left, nothing on the right** (quick 261015-my3, 2026-10-15,
 * D2–D5). The founder: "I don't think we need any dims on the right. Lets put all the wing data in
 * the data cards on the left (add a Run and Radius value to each card and an offset from fin when
 * locked to the fin too). Tail block can be written directly under the tail itself … This should
 * allow the wing view to be as large as possible." And after: "the tail @ 12" data can also be on
 * the left. Nothing on the right." So each wing's card reads its depth and position, then RUN,
 * RADIUS (the one drawn) and, locked, OFFSET from its fin; the tail's width at 12" is a card of its
 * own; the tail block's width is written on one line under the tail; and the read-out rail, the
 * depth and run dimensions and the station dimensions at the far left are gone — "we also don't need
 * the off tail callouts since that info is now in the cards." This departs from the drawing grammar's
 * "outputs on one right rail" for THIS view only; the VIEWER keeps its rail.
 *
 * **One frame, as large as the panel allows** (D6): `closeUpFrame` sizes the gutter to the card at
 * the drawing's own fit, keeps the board's top clear of the toolbar corner, and when bound by height
 * hands all the spare width to the right, under the toolbar. It reads the svg's box and the pointer —
 * the drawing fitting itself, never a layout choice, so CLAUDE.md's three switches stay separate.
 *
 * Always drawn tail-down: the window is near-square, so turning it buys nothing.
 *
 * The grab points (plan 02, 2026-10-15, D5, P11): with Show construction on and an
 * `onWingsChange` handler, each wing draws two points exactly as the VIEWER draws its drag targets
 * — the outer one at the step's outer corner, the inner one hung 22 dots below the inner corner. A
 * press picks one with `nearestWingDragTarget` (one delegated handler on the svg, as the VIEWER's),
 * every move solves with `solveWingDrag`, and the whole new wings list goes up. **The window holds
 * still from press to lift**: in the sketch's own check, a window that re-framed mid-drag carried
 * the wing 4 1/2" from a 1" pull, so the window in force at the press is kept in state until the
 * pointer lifts, and only then does the window rule apply again. A finger gets the coarse hit
 * radius, and the svg is `touch-none select-none`, so a thumb on a grab point drags the wing rather
 * than scrolling the page (P14).
 *
 * Every number a shaper reads goes through `measure-display.ts` (CLAUDE.md Rule 2, D9): a wing's
 * position and every width is a DIM (`formatDim`), its depth, run, radius and offset are MARKS
 * (`formatMark`, `formatSignedMark`). The drawing itself works in inches of board, like
 * `OutlineViewer`'s.
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
/** Room left between two cards (the sketch's 6). */
const CHIP_GAP = 6;
/** The tail block's words: the gap under the tail and a capital's height, in screen px (D3, F6). */
const TAIL_BLOCK_WORDS_GAP_PX = 4;
const CAP_HEIGHT_EM = 0.73;

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
  const coarsePointer = useCoarsePointer();
  // D6: the one frame, from the window and the svg's own box — never from the frame it builds.
  const box = useSvgClientSize(svgRef);
  const frame = closeUpFrame(loIn, hiIn, widest, {
    tailBlock: !geometry.tailBlockPinned,
    box,
    corner: coarsePointer ? CLOSE_UP_CORNER_PX.coarse : CLOSE_UP_CORNER_PX.fine,
    minFit: MIN_PINNED_FIT_SCALE,
  });
  const { toX, toY } = frame;
  /** Screen px per drawing unit: the frame's own `meet` fit for the box, 1 until it is measured. */
  const fit = frame.fit > 0 ? frame.fit : 1;
  const sizes = pinnedCalloutSizes(fit);
  /** Drawing units per screen pixel at the pinned callout size — the cards' and words' unit. */
  const pxUnit = sizes.value / CALLOUT_PX.value;

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
  const readouts = wingReadouts(geometry, wings);

  // 6. The left gutter (D4, D5): a data card per wing holding every number of it, and the tail's
  // width at 12" — spread apart in station order, each whole inside the drawing.
  const cards: {
    key: string;
    y: number;
    name: string;
    nameColor?: string;
    value: string;
    rows: WingDataCardRow[];
    leaderToX: number;
  }[] = wings.map((w, i) => {
    // `WING n · FIN` only for a lock its slot holds with its fins present (D1).
    const locked = wingLockEdge(w, i, edges) !== null;
    const rows: WingDataCardRow[] = [
      { key: "run", label: "RUN", value: formatMark(w.run, system) },
      // The radius actually drawn — never more than fits.
      { key: "radius", label: "RADIUS", value: formatMark(effectiveWingRadius(w), system) },
    ];
    if (locked) rows.push({ key: "offset", label: "OFFSET", value: formatSignedMark(w.finOffset, system) });
    return {
      key: `wing-${i}`,
      y: toY(mmToInches(w.station)),
      name: locked ? `WING ${i + 1} · FIN` : `WING ${i + 1}`,
      nameColor: locked ? "var(--color-surf-accent-ink)" : undefined,
      value: `${formatMark(w.depth, system)} @ ${formatDim(w.station, system)}`,
      rows,
      leaderToX: toX(-mmToInches(wingedHalfWidthAt(geometry, wings, mm(w.station + HAIR_MM)))),
    };
  });
  if (inWindow(tail12In)) {
    cards.push({
      key: "tail-12",
      y: toY(tail12In),
      name: `TAIL @ ${stationLabel(system)}`,
      value: formatDim(geometry.tailWidthAt12in, system),
      rows: [],
      leaderToX: toX(-mmToInches(sampleOutline(geometry, MEASURE_STATION_MM))),
    });
  }
  const cardYs = spreadApart(
    cards.map((c) => ({ y: c.y, half: (wingCardHeightPx(c.rows.length) * pxUnit) / 2 })),
    CHIP_GAP,
    [],
    // Every card whole inside the drawing, 2 units clear of each edge.
    { top: 2, bottom: frame.height - 2 },
  );

  // 7. The tail block's width, written under the tail on one line (D3); a pin or round tail has none.
  const tailBlockWords = geometry.tailBlockPinned ? null : formatDim(mm(geometry.halfTailBlockWidth * 2), system);

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
          data-window-lo-in={loIn.toFixed(3)}
          data-window-hi-in={hiIn.toFixed(3)}
          data-units-per-inch={frame.unitsPerInch.toFixed(4)}
          data-pad-top={frame.padTop.toFixed(2)}
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
            data-wing-stringer
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

          {/* 5. With Show fins: the fins where FINS puts them, marks only, no dims (D4) — and a locked
              wing's fin-edge line, out past the left rail toward its card. */}
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
          {showFins &&
            wings.map((w, i) => {
              const finEdge = wingLockEdge(w, i, edges);
              if (finEdge === null) return null;
              const aheadIn = mmToInches(readouts[i].widthAhead) / 2;
              return (
                <line
                  key={i}
                  data-wing-fin-edge={i + 1}
                  x1={toX(0)}
                  y1={toY(mmToInches(finEdge))}
                  x2={toX(-aheadIn) - FIN_EDGE_LINE_REACH}
                  y2={toY(mmToInches(finEdge))}
                  stroke="var(--color-surf-accent-ink)"
                  strokeDasharray="2 3"
                />
              );
            })}

          {/* 6. The left gutter: the cards, each leader kept on its own station. */}
          {cards.map((c, i) => (
            <WingDataCard
              key={c.key}
              x={frame.chipRightX}
              y={cardYs[i]}
              name={c.name}
              nameColor={c.nameColor}
              value={c.value}
              rows={c.rows}
              leaderToX={c.leaderToX}
              leaderAtY={c.y}
            />
          ))}

          {/* 7. The tail block's width under the tail, centred on the stringer (D3). */}
          {tailBlockWords !== null && (
            <text
              data-tail-block-words
              x={frame.cx}
              y={toY(0) + (TAIL_BLOCK_WORDS_GAP_PX + CAP_HEIGHT_EM * CALLOUT_PX.value) * pxUnit}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-body)", fontWeight: 700, whiteSpace: "pre" }}
            >
              <tspan style={{ fontSize: sizes.name, letterSpacing: "0.12em" }} fill="var(--outline-callout-label)">
                TAIL BLOCK
              </tspan>
              <tspan style={{ fontSize: sizes.value }} fill="var(--outline-ink)">
                {` ${tailBlockWords}`}
              </tspan>
            </text>
          )}

          {/* 8. The grab areas, last so they sit above everything they cover. No press handler of
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
