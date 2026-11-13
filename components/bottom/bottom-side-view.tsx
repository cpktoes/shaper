"use client";

import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useUnits } from "@/components/units-provider";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import { sectionHeightLabel, stationAtPointer, type SectionHeight } from "@/lib/geometry/bottom-draw";
import {
  sideProfileParts,
  sideViewFrame,
  sideViewPaths,
  sideViewStationSpan,
  type BottomViewerSplit,
} from "@/lib/geometry/bottom-side-view";
import type { BottomBoard } from "@/lib/geometry/bottom";
import { formatDim } from "@/lib/geometry/measure-display";
import type { Mm } from "@/lib/geometry/units";
import type { SideProfileLines } from "@/lib/geometry/side-profile";
import { BOTTOM_COPY } from "./bottom-copy";
import { HeightPicker } from "./bottom-section";
import { railLineProps, SideProfileKey } from "./side-profile-key";
import { useSectionStation } from "./section-station";
import { useStationPress } from "./station-press";

interface BottomSideViewProps {
  /** The board's two side profiles (`sideProfileLines` on the store's bottom), worked out once by the editor. */
  lines: SideProfileLines;
  board: Pick<BottomBoard, "length" | "widePoint" | "frontFins">;
  /** The three boxes' heights and the board from below's scale, from `useViewerSplit`; null until measured. */
  split: BottomViewerSplit | null;
  height: SectionHeight;
  onHeight: (height: SectionHeight) => void;
  /** The board's name as the tab band shows it, for the drawing's spoken name. */
  boardName: string;
}

/**
 * SIDE VIEW (quick 261112-ogx; the founder, 2026-11-12, on sketch 023): under the cross-section, the board from the side —
 * the deck as one line, the bottom along the stringer as the board's ink edge, and the bottom at the rail before the
 * rails are shaped, dashed, drawn where it parts from the stringer's line. Nose left, at the board from below's own length
 * scale, so the section's dash-dot station line runs straight through both drawings.
 *
 * It opens at Height ×1 — true proportions, the least height — and BOTTOM's own Height buttons stretch it. Every shape is
 * `bottom-side-view.ts`'s; this only paints (CLAUDE.md Rule 1). Like the other two drawings it takes its box's own shape
 * and every stroke is written in screen dots.
 */
export function BottomSideView({ lines, board, split, height, onHeight, boardName }: BottomSideViewProps) {
  const { system } = useUnits();
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(svgRef);
  const measured = split !== null && box.width > 40 && box.height > 20;
  const frame = useMemo(
    () => (measured ? sideViewFrame(lines, { kDots: split.kDots, length: board.length }, { width: box.width, height: box.height }, height) : null),
    [measured, split, lines, board.length, box.width, box.height, height],
  );
  const paths = useMemo(() => (frame ? sideViewPaths(lines, frame) : null), [lines, frame]);
  const twoLines = useMemo(() => sideProfileParts(lines), [lines]);
  const heightLabel = sectionHeightLabel({ heightAsked: height, heightDrawn: frame?.heightDrawn ?? height });

  /** The pointer's x in drawing units, from the drawing's own screen matrix, turned into a station (as the board from below does). */
  function pointerStation(event: ReactPointerEvent<HTMLDivElement>): Mm | null {
    const ctm = svgRef.current?.getScreenCTM();
    if (!frame || !ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return stationAtPointer(local.x, frame);
  }
  // A press, drag or tap along the side view moves the section exactly as the board from below does.
  const press = useStationPress(pointerStation);

  return (
    <div className="flex min-h-0 flex-col" style={{ flex: "0 1 auto" }}>
      <div className="flex flex-none items-center justify-between gap-2 pb-1">
        <span data-bottom-side-caption className="block min-w-0 truncate text-[10px] font-bold tracking-architectural text-surf-ink-muted">
          {BOTTOM_COPY.sideViewAt(heightLabel)}
        </span>
        <HeightPicker height={height} onHeight={onHeight} which="side" />
      </div>
      <div
        data-bottom-box="side"
        // Looking only: the press moves the section's station, never the board, so a locked board keeps it (UI-SPEC §7).
        data-lock-exempt
        className="relative min-h-0 touch-none select-none"
        style={{ flex: `0 1 ${split?.side ?? 0}px` }}
        onPointerDown={press.onPointerDown}
        onPointerMove={press.onPointerMove}
        onPointerUp={press.onPointerUp}
        onPointerCancel={press.onPointerCancel}
      >
        <svg
          ref={svgRef}
          data-bottom-side-view
          data-height={frame ? frame.heightDrawn.toFixed(2) : undefined}
          role="img"
          aria-label={BOTTOM_COPY.sideViewName(boardName, twoLines, heightLabel)}
          viewBox={frame ? `0 0 ${frame.width} ${frame.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full touch-none select-none"
        >
          {frame && paths && (
            <>
              <path
                data-bottom-side-line="stringer"
                d={paths.board}
                fill="var(--outline-board-fill)"
                stroke="var(--outline-ink)"
                strokeWidth={1.1 * frame.px}
                strokeLinejoin="round"
              />
              {paths.rail && <path data-bottom-side-line="rail" d={paths.rail} fill="none" {...railLineProps(frame.px)} />}
              {/* The wide point and the front fins, faint, as the board from below draws them. */}
              {[
                { key: "widepoint", station: board.widePoint, stroke: "var(--outline-widepoint-line)", dash: "--outline-widepoint-dash" as const },
                { key: "fins", station: board.frontFins, stroke: "var(--outline-station-line)", dash: "--outline-station-dash" as const },
              ].map((mark) => {
                const span = sideViewStationSpan(lines, frame, mark.station);
                return (
                  <line
                    key={mark.key}
                    data-bottom-side-station={mark.key}
                    x1={span.x}
                    y1={span.yDeck}
                    x2={span.x}
                    y2={span.yBottom}
                    stroke={mark.stroke}
                    strokeWidth={frame.px}
                    strokeDasharray={zoomDashToken(mark.dash, frame.px)}
                  />
                );
              })}
            </>
          )}
        </svg>
        {/* The station line on a layer of its own over the drawing, as the board from below keeps its cutting line. */}
        <svg
          aria-hidden
          viewBox={frame ? `0 0 ${frame.width} ${frame.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 block h-full w-full touch-none select-none"
        >
          {frame && <SideStationLine lines={lines} frame={frame} />}
        </svg>
      </div>
      <div data-bottom-side-key className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surf-ink-muted">
        <SideProfileKey twoLines={twoLines} railWord={BOTTOM_COPY.sideKeyRail} />
      </div>
      <div data-bottom-side-facts className="mt-1 text-xs text-surf-ink">
        {BOTTOM_COPY.sideFacts(formatDim(lines.stringerThickness, system), formatDim(lines.maxThickness, system))}
      </div>
    </div>
  );
}

/** The section's station on the side view: the drawing convention's dash-dot, from 8 dots above the deck to 8 below the bottom. */
function SideStationLine({ lines, frame }: { lines: SideProfileLines; frame: NonNullable<ReturnType<typeof sideViewFrame>> }) {
  const station = useSectionStation();
  const { px } = frame;
  const span = sideViewStationSpan(lines, frame, station);
  return (
    <g data-bottom-side-cut-at={station.toFixed(1)}>
      <line
        data-bottom-side-cut-line
        x1={span.x}
        y1={span.yDeck - 8 * px}
        x2={span.x}
        y2={span.yBottom + 8 * px}
        stroke="var(--outline-ink)"
        strokeWidth={1.1 * px}
        strokeDasharray={zoomDashToken("--outline-cut-dash", px)}
      />
      {/* A 44-dot invisible grab zone round the line, the box's full height: it says where the line can be taken. The press
          itself is the box's (anywhere on the side view moves the section). */}
      <rect
        data-bottom-side-grab-zone
        x={span.x - 22 * px}
        y={0}
        width={44 * px}
        height={frame.height}
        fill="transparent"
        className="pointer-events-auto cursor-ew-resize"
      />
    </g>
  );
}
