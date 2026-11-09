"use client";

import { useMemo, useRef } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DimensionLine, useSvgClientSize, ViewerZoomUnitProvider } from "@/components/viewer/callout-primitives";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  bottomSection,
  sectionGauges,
  sectionHeightLabel,
  SECTION_WORDS_MIN_BOX,
  type Gauge,
  type GaugeLabel,
  type SectionHeight,
} from "@/lib/geometry/bottom-draw";
import { formatDim, formatMark } from "@/lib/geometry/measure-display";
import { mm, type UnitsSystem } from "@/lib/geometry/units";
import { BOTTOM_COPY } from "./bottom-copy";

/** The drawing's words, in screen dots (the sketch's `.lab` 9 and `.val` 11). */
const LABEL_DOTS = 9;
const VALUE_DOTS = 11;

/** A gauge's words (UI-SPEC § On the drawings): with them in a box of 625 dots or more, the value alone below it. */
function gaugeText(gauge: Gauge, label: GaugeLabel, system: UnitsSystem): string {
  const value = formatMark(gauge.value, system);
  if (!label.words) return value;
  switch (gauge.kind) {
    case "stringer":
      return BOTTOM_COPY.gaugeAtStringer(value);
    case "railLift":
      return BOTTOM_COPY.gaugeRailLift(value);
    case "stringerLeft":
      return BOTTOM_COPY.gaugeStringerLeft(value);
    case "channel":
      return BOTTOM_COPY.gaugeInChannel(value);
    case "trough":
      return BOTTOM_COPY.gaugeInTrough(value);
  }
}

interface BottomSectionProps {
  /** Where the section is taken, from the tail. */
  station: number;
  height: SectionHeight;
}

/**
 * The cross-section at the cutting line (Phase 17, D-13; UI-SPEC §3.3): the planed slab with square rails, its bottom
 * the cut, on the dashed straightedge (the planed bottom), the stringer's centreline, and the gauge readings where a
 * shaper would hold a gauge — the gap at the stringer, the lift at the rails, a double's trough or a channel's floor,
 * the stringer left — each drawn with the app's `DimensionLine` and its 45° tick, never `0"`.
 *
 * One scale for every station (the wide point's section spans the box less 20 dots a side) and the height at the
 * Height pick, fitted when a deep cut would leave the box. Like the top view the picture takes its own box's shape and
 * every stroke and word is written in screen dots; the only size question is this box's own (`useSvgClientSize`) — the
 * gauges' words and `PLANED BOTTOM` from 625 dots (D-30). Every shape is `bottom-draw.ts`'s (CLAUDE.md Rule 1). The ruler
 * of layout marks and the finished rail from RAILS join in 17-10 — until then the section is drawn with no live cut,
 * so `bottomSection` leaves no room for a ruler under it.
 */
export function BottomSection({ station, height }: BottomSectionProps) {
  const { system } = useUnits();
  const { bottomBoard: board, resolvedBottom: resolved } = useDesign();
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(svgRef);
  const measured = box.width > 40 && box.height > 20;

  const drawing = useMemo(
    () => (measured ? bottomSection(resolved, board, mm(station), height, { width: box.width, height: box.height }, { live: null }) : null),
    [measured, resolved, board, station, height, box.width, box.height],
  );
  const gauges = useMemo(() => (drawing ? sectionGauges(drawing, resolved, board, system) : []), [drawing, resolved, board, system]);

  const stationText = formatBottomStation(mm(station), system);
  const widthText = drawing ? formatDim(drawing.widthAtStation, system) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between gap-2 pb-1">
        <span className="text-[10px] font-bold tracking-architectural text-surf-ink-muted">
          {BOTTOM_COPY.sectionCaption(stationText)}
          {widthText !== null && <span className="max-shell:hidden">{BOTTOM_COPY.sectionCaptionWidth(widthText)}</span>}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          data-bottom-section
          role="img"
          aria-label={BOTTOM_COPY.sectionName(stationText, widthText ?? "")}
          viewBox={drawing ? `0 0 ${drawing.width} ${drawing.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full select-none"
        >
          {drawing && (
            // Every DimensionLine and its tick in screen dots: one dot is `px` drawing units.
            <ViewerZoomUnitProvider value={drawing.px}>
              <SectionDrawingParts drawing={drawing} gauges={gauges} system={system} />
            </ViewerZoomUnitProvider>
          )}
        </svg>
      </div>
    </div>
  );
}

function SectionDrawingParts({
  drawing,
  gauges,
  system,
}: {
  drawing: ReturnType<typeof bottomSection>;
  gauges: Gauge[];
  system: UnitsSystem;
}) {
  const { px } = drawing;
  const words = drawing.width / px >= SECTION_WORDS_MIN_BOX;
  const labelStyle = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    fill: "var(--outline-callout-label)",
    fontSize: LABEL_DOTS * px,
  } as const;
  const valueStyle = {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    fill: "var(--outline-ink)",
    fontSize: VALUE_DOTS * px,
    fontVariantNumeric: "tabular-nums",
  } as const;
  const dash = (token: `--${string}`) => zoomDashToken(token, px);

  return (
    <>
      <text x={8 * px} y={14 * px} style={labelStyle}>
        {sectionHeightLabel(drawing)}
      </text>
      {drawing.pieces.map((d, i) => (
        <path key={i} d={d} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1 * px} />
      ))}
      {drawing.breakPath && (
        <>
          <path d={drawing.breakPath} fill="none" stroke="var(--surf-panel)" strokeWidth={7 * px} />
          <path d={drawing.breakPath} fill="none" stroke="var(--outline-ink)" strokeWidth={px} />
        </>
      )}
      {drawing.stringer && (
        <line
          x1={drawing.stringer.x}
          y1={drawing.stringer.y1}
          x2={drawing.stringer.x}
          y2={drawing.stringer.y2}
          stroke="var(--outline-station-line)"
          strokeWidth={px}
          strokeDasharray={dash("--outline-stringer-dash")}
        />
      )}
      {/* The straightedge: the planed bottom, laid rail to rail. */}
      <line
        data-bottom-straightedge
        x1={drawing.straightedge.x1}
        y1={drawing.straightedge.y}
        x2={drawing.straightedge.x2}
        y2={drawing.straightedge.y}
        stroke="var(--outline-ink)"
        strokeWidth={px}
        strokeDasharray={dash("--outline-station-dash")}
      />
      {words && (
        <text x={drawing.straightedge.x1} y={drawing.y0 + 13 * px} style={labelStyle}>
          {BOTTOM_COPY.planedBottom}
        </text>
      )}
      {gauges.map((gauge, g) => (
        <g key={`${gauge.kind}-${g}`} data-gauge={gauge.kind}>
          {gauge.extensions.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--outline-station-line)" strokeWidth={px} />
          ))}
          {gauge.lines.map((line, i) => (
            <DimensionLine key={i} x1={line.x} y1={line.y1} x2={line.x} y2={line.y2} />
          ))}
          {gauge.labels.map((label, i) => (
            <text key={i} x={label.x} y={label.y} textAnchor={label.anchor} style={valueStyle}>
              {gaugeText(gauge, label, system)}
            </text>
          ))}
        </g>
      ))}
    </>
  );
}
