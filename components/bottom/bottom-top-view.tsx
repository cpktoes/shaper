"use client";

import { memo, useId, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import { TAP_MAX_TRAVEL_PX } from "@/components/viewer/drag-selection";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import {
  bottomContourLines,
  bottomFinLines,
  bottomPencilLines,
  bottomShadeBands,
  placeRailLabels,
  polylinesPathData,
  shadePathData,
  stationAtPointer,
  topViewFrame,
  topViewMap,
  topViewMarks,
  topViewX,
  topViewY,
  type BottomCutKey,
  type RailMark,
  type TopViewFrame,
} from "@/lib/geometry/bottom-draw";
import { formatLength } from "@/lib/geometry/measure-display";
import { silhouette } from "@/lib/geometry/screen-tiles";
import { mm, type Mm } from "@/lib/geometry/units";
import { placedWings } from "@/lib/geometry/wings";
import { BOTTOM_COPY, wingWords } from "./bottom-copy";
import { useSectionStation, useSetSectionStation } from "./section-station";

/** The shade's strength per 1/32" level on the top view (UI-SPEC § Color; a GUIDE cartoon's is 5%). */
const SHADE_OPACITY = 0.04;
/** The drawing's words, in screen dots (the sketch's `.lab` 9 and `.val` 11). */
const LABEL_DOTS = 9;
const VALUE_DOTS = 11;

/**
 * A word's width in screen dots, for keeping the rails' labels apart (`placeRailLabels`). The sketch's own estimate —
 * 6.4 dots a letter of a spaced capital name, 6.2 a figure — rather than a browser measurement, so the first paint and
 * every later one lay the labels out the same way.
 */
function labelWidth(mark: Pick<RailMark, "name" | "value">, joined: boolean): number {
  return mark.name.length * 6.4 + (mark.value.length + (joined ? 3 : 1)) * 6.2;
}

interface BottomTopViewProps {
  live: BottomCutKey;
  /** The board's name as the tab band shows it, for the drawing's spoken name. */
  boardName: string;
}

/** The gesture under way: where it was pressed (in client dots) and whether it has travelled far enough to be a drag. */
interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  dragging: boolean;
}

/**
 * The bottom from below (Phase 17, D-12, D-31; UI-SPEC §3.2): nose left like ROCKER's top view, the board with its
 * stringer, wide point and front fins; the shade, one path per 1/32" level, clipped to the board; a contour line at
 * every 1/16"; the pencil lines a shaper would rule, the live cut's in ink; FINS' own base lines; the wide point and the
 * front fins named on the upper rail and the live cut's START · DEEPEST · END on the lower; and the section's cutting
 * line with its grab dot. Press anywhere on the board, drag or tap, and the section follows (D-12, 17-10).
 *
 * The picture takes its own box's shape (a viewBox 1000 wide and as tall as the box) and every stroke, dash and word is
 * written in screen dots — `px` drawing units a dot — so a 1-dot line is 1 dot on any box (`useSvgClientSize`, the
 * drawing's own box, never the device). Nothing is drawn until the box is measured, so the server and the first client
 * paint agree. Every shape is `bottom-draw.ts`'s; this only paints (CLAUDE.md Rule 1). The shade and the lines are
 * worked out once per bottom, never per station (17-07: 45-85 ms a board).
 */
export function BottomTopView({ live, boardName }: BottomTopViewProps) {
  const { system } = useUnits();
  // A press, drag or tap moves the section (from the tail, clamped to the board); only the cutting line reads it back.
  const setStation = useSetSectionStation();
  const onStation = (at: Mm) => setStation({ at });
  const { bottomBoard: board, resolvedBottom: resolved, outlineGeometry, finPlacement, outline } = useDesign();
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<SVGGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const box = useSvgClientSize(svgRef);
  const clipId = useId();

  const shade = useMemo(() => bottomShadeBands(resolved, board), [resolved, board]);
  const contours = useMemo(() => bottomContourLines(resolved, board), [resolved, board]);
  const pencil = useMemo(() => bottomPencilLines(resolved, board, live), [resolved, board, live]);
  const fins = useMemo(() => bottomFinLines(finPlacement), [finPlacement]);
  const marks = useMemo(() => topViewMarks(board, resolved, live, finPlacement, system), [board, resolved, live, finPlacement, system]);

  const measured = box.width > 40 && box.height > 20;
  const frame = useMemo(() => (measured ? topViewFrame(board, box.width, box.height) : null), [measured, board, box.width, box.height]);
  const paths = useMemo(() => {
    if (!frame) return null;
    const map = topViewMap(frame);
    const edge = silhouette(outlineGeometry).map(({ station: s, w }) => [s, w] as const);
    return {
      board: `${polylinesPathData([edge], map)}Z`,
      shade: shade.map((level) => ({ index: level.index, d: shadePathData(level.rects, map) })),
      contours: contours.map((level) => ({ index: level.index, d: polylinesPathData(level.lines, map) })),
      pencil: pencil.map((line) => ({ key: `${line.column}:${line.kind}`, kind: line.kind, live: line.live, d: polylinesPathData(line.runs, map) })),
    };
  }, [frame, outlineGeometry, shade, contours, pencil]);

  /** The pointer's x in drawing units, from the drawing group's own screen matrix (TEMPLATE's `toBoardPoint`). */
  function pointerStation(event: ReactPointerEvent<HTMLDivElement>): Mm | null {
    const el = drawingRef.current ?? svgRef.current;
    const ctm = el?.getScreenCTM();
    if (!frame || !ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return stationAtPointer(local.x, frame);
  }

  // D-12: press anywhere on the top view and the section jumps there; drag and it follows the pointer. A press that
  // moves less than `TAP_MAX_TRAVEL_PX` is a tap, so a finger's wobble leaves the section where it landed.
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !frame) return;
    const at = pointerStation(event);
    if (at === null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    onStation(at);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= TAP_MAX_TRAVEL_PX) return;
    gesture.dragging = true;
    const at = pointerStation(event);
    if (at !== null) onStation(at);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="flex min-h-0 flex-[1.25] flex-col">
      {/* The caption row (UI-SPEC §3.1); on an upright phone it is hidden — width alone. */}
      <div className="flex flex-none items-center justify-between gap-2 pb-1 max-shell:hidden">
        <span className="text-[10px] font-bold uppercase tracking-architectural text-surf-ink-muted">{BOTTOM_COPY.topViewCaption}</span>
        {/* On a winged board the caption names the wings too (D-19): a depth is a mark, a station a dim. */}
        <span data-bottom-top-view-note className="text-xs text-surf-ink-muted">
          {BOTTOM_COPY.topViewNoseLeft(formatLength(outline.length, system), wingWords(placedWings(outline.wings ?? [], outlineGeometry), system))}
        </span>
      </div>
      <div
        data-bottom-top-view-press
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        // The cutting line is pointer-only; its keyboard path is `Section at` (UI-SPEC §12). View-only, so a locked board
        // keeps it (UI-SPEC §7).
        data-lock-exempt
      >
        <svg
          ref={svgRef}
          data-bottom-top-view
          role="img"
          aria-label={BOTTOM_COPY.topViewName(boardName)}
          viewBox={frame ? `0 0 ${frame.width} ${frame.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full touch-none select-none"
        >
          {frame && paths && (
            <g ref={drawingRef}>
              <TopViewDrawing frame={frame} paths={paths} clipId={clipId} board={board} marks={marks} fins={fins} />
            </g>
          )}
        </svg>
        {/* The cutting line on a layer of its own, the same box and viewBox over the drawing: a drag moves only this
            layer, so the shade (16 paths and 100 KB of path data on a fully cut Longboard) is never painted again
            while a finger moves — measured, the repaint was most of a drag step's cost. */}
        <svg
          aria-hidden
          data-bottom-cut-layer
          viewBox={frame ? `0 0 ${frame.width} ${frame.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 block h-full w-full touch-none select-none [will-change:transform]"
        >
          {frame && <CuttingLine frame={frame} board={board} />}
        </svg>
      </div>
    </div>
  );
}

/** Everything on the top view but the cutting line — memoised, so a drag (which moves only the line) never redraws the
 * shade, the lines or the names. */
const TopViewDrawing = memo(function TopViewDrawing({
  frame,
  paths,
  clipId,
  board,
  marks,
  fins,
}: {
  frame: ReturnType<typeof topViewFrame>;
  paths: {
    board: string;
    shade: { index: number; d: string }[];
    contours: { index: number; d: string }[];
    pencil: { key: string; kind: string; live: boolean; d: string }[];
  };
  clipId: string;
  board: ReturnType<typeof useDesign>["bottomBoard"];
  marks: ReturnType<typeof topViewMarks>;
  fins: ReturnType<typeof bottomFinLines>;
}) {
  const { px, height } = frame;
  const X = (s: number) => topViewX(frame, s);
  const Y = (y: number) => topViewY(frame, y);
  const edgeAt = (s: number) => board.railAt(mm(s));
  const dash = (token: `--${string}`) => zoomDashToken(token, px);
  const labelStyle = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    fill: "var(--outline-callout-label)",
    fontSize: LABEL_DOTS * px,
  } as const;
  const valueStyle = { fontWeight: 500, letterSpacing: 0, fontSize: VALUE_DOTS * px, fill: "var(--outline-callout-label)" } as const;

  const boxWidth = frame.width / px;
  const yRail = frame.padTop - 6 * px;
  const yLow = height - frame.padBottom + 6 * px;
  const upper = placeRailLabels(
    marks.upper.map((m) => ({ x: X(m.station) / px, text: `${m.name} · ${m.value}` })),
    boxWidth,
    (text) => labelWidth({ name: text, value: "" }, false),
  );
  const lower = marks.lower
    ? placeRailLabels(
        marks.lower.marks.map((m) => ({ x: X(m.station) / px, text: m.name })),
        boxWidth,
        (text) => labelWidth({ name: text, value: marks.lower!.marks.find((m) => m.name === text)!.value }, false),
      )
    : [];

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={paths.board} />
        </clipPath>
      </defs>
      <path d={paths.board} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1 * px} />
      <g clipPath={`url(#${clipId})`}>
        {/* The shade (D-12): one path per 1/32" level, stacked, so a 1/4" cut is eight levels deep. */}
        <g data-bottom-shade fill="var(--outline-bottom-shade)" fillOpacity={SHADE_OPACITY}>
          {paths.shade.map((level) => (
            <path key={level.index} d={level.d} />
          ))}
        </g>
        {/* A contour line at every 1/16", over the shade. */}
        <g fill="none" stroke="var(--outline-station-line)" strokeWidth={px}>
          {paths.contours.map((level) => (
            <path key={level.index} data-bottom-contour={level.index} d={level.d} />
          ))}
        </g>
        {/* The stringer and the two reference stations, as every plan view draws them. */}
        <line
          x1={X(board.length)}
          y1={frame.cy}
          x2={X(0)}
          y2={frame.cy}
          stroke="var(--outline-station-line)"
          strokeWidth={px}
          strokeDasharray={dash("--outline-stringer-dash")}
        />
        <line
          x1={X(board.widePoint)}
          y1={Y(-edgeAt(board.widePoint))}
          x2={X(board.widePoint)}
          y2={Y(edgeAt(board.widePoint))}
          stroke="var(--outline-widepoint-line)"
          strokeWidth={px}
          strokeDasharray={dash("--outline-widepoint-dash")}
        />
        <line
          x1={X(board.frontFins)}
          y1={Y(-edgeAt(board.frontFins))}
          x2={X(board.frontFins)}
          y2={Y(edgeAt(board.frontFins))}
          stroke="var(--outline-station-line)"
          strokeWidth={px}
          strokeDasharray={dash("--outline-station-dash")}
        />
        {/* The pencil lines (D-12): the live cut's in ink, the others in pencil; a double's trough dotted. */}
        {paths.pencil.map((line) =>
          line.kind === "trough" ? (
            <path
              key={line.key}
              data-bottom-pencil={line.kind}
              d={line.d}
              fill="none"
              stroke="var(--outline-station-line)"
              strokeWidth={px}
              strokeDasharray={dash("--outline-trough-dash")}
            />
          ) : (
            <path
              key={line.key}
              data-bottom-pencil={line.kind}
              data-live={line.live ? "" : undefined}
              d={line.d}
              fill="none"
              stroke={line.live ? "var(--outline-ink)" : "var(--outline-pencil-line)"}
              strokeWidth={(line.live ? 1.1 : 1) * px}
            />
          ),
        )}
        {/* The live cut's Deepest, dotted across the board. */}
        {marks.lower && (
          <line
            x1={X(marks.lower.deepest)}
            y1={Y(-edgeAt(marks.lower.deepest))}
            x2={X(marks.lower.deepest)}
            y2={Y(edgeAt(marks.lower.deepest))}
            stroke="var(--outline-station-line)"
            strokeWidth={px}
            strokeDasharray={dash("--outline-trough-dash")}
          />
        )}
      </g>
      {/* The fins (D-31): FINS' own base lines, solid, no dots or dimensions. */}
      <g data-bottom-fins stroke="var(--color-surf-accent-ink)" strokeWidth={2.5 * px} strokeLinecap="round">
        {fins.map((fin, i) => (
          <line key={i} x1={X(fin.from[0])} y1={Y(fin.from[1])} x2={X(fin.to[0])} y2={Y(fin.to[1])} />
        ))}
      </g>
      {/* The upper rail: the wide point and the front fins, ticked from the board's edge. */}
      {marks.upper.map((m, i) => (
        <g key={m.key} data-bottom-rail-mark={m.key}>
          <line
            x1={X(m.station)}
            y1={Y(-edgeAt(m.station)) - 3 * px}
            x2={X(m.station)}
            y2={yRail + 3 * px}
            stroke="var(--outline-callout-label)"
            strokeWidth={px}
          />
          {upper[i].show && (
            <text x={upper[i].textX * px} y={yRail} textAnchor={upper[i].anchor} style={labelStyle}>
              {upper[i].text}
            </text>
          )}
        </g>
      ))}
      {/* The lower rail: the live cut's START · DEEPEST · END, each from that cut's nearest tip, the value muted. */}
      {marks.lower &&
        marks.lower.marks.map((m, i) => (
          <g key={m.key} data-bottom-rail-mark={m.key}>
            <line
              x1={X(m.station)}
              y1={Y(edgeAt(m.station)) + 3 * px}
              x2={X(m.station)}
              y2={yLow + 2 * px}
              stroke="var(--outline-callout-label)"
              strokeWidth={px}
            />
            {lower[i].show && (
              <text x={lower[i].textX * px} y={yLow + 13 * px} textAnchor={lower[i].anchor} style={labelStyle}>
                {m.name}{" "}
                <tspan style={valueStyle}>{m.value}</tspan>
              </text>
            )}
          </g>
        ))}
    </>
  );
});

/**
 * The section's cutting line (D-12; UI-SPEC §3.2): the drawing convention's dash-dot from 8 dots above the board to the
 * lower rail, its accent grab dot (r 7) 30 dots under the rail, and over both a 44-dot invisible grab zone that takes the
 * `ew-resize` cursor. The press itself is the SVG's (anywhere on the top view moves the section); the zone only says
 * where the line can be taken.
 */
function CuttingLine({ frame, board }: { frame: TopViewFrame; board: ReturnType<typeof useDesign>["bottomBoard"] }) {
  const station = useSectionStation();
  const { px, height } = frame;
  const x = topViewX(frame, station);
  const yTop = topViewY(frame, -board.railAt(mm(station))) - 8 * px;
  const yLow = height - frame.padBottom + 6 * px;
  return (
    <g data-bottom-cut-at={station.toFixed(1)}>
      <line
        data-bottom-cut-line
        x1={x}
        y1={yTop}
        x2={x}
        y2={yLow + 2 * px}
        stroke="var(--outline-ink)"
        strokeWidth={1.1 * px}
        strokeDasharray={zoomDashToken("--outline-cut-dash", px)}
      />
      <circle data-bottom-grab cx={x} cy={yLow + 30 * px} r={7 * px} fill="var(--surf-accent)" stroke="var(--outline-ink)" strokeWidth={px} />
      <rect
        data-bottom-grab-zone
        x={x - 22 * px}
        y={yTop}
        width={44 * px}
        height={yLow + 40 * px - yTop}
        fill="transparent"
        className="pointer-events-auto cursor-ew-resize"
      />
    </g>
  );
}
