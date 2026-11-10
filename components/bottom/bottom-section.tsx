"use client";

import { useId, useMemo, useRef, type CSSProperties } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DimensionLine, useSvgClientSize, ViewerZoomUnitProvider } from "@/components/viewer/callout-primitives";
import { zoomDashToken } from "@/components/viewer/zoom-viewport";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  bottomSection,
  ghostRail,
  ghostRailPath,
  sectionGauges,
  sectionHeightLabel,
  sectionRuler,
  SECTION_WORDS_MIN_BOX,
  type BottomCutKey,
  type Gauge,
  type GaugeLabel,
  type SectionHeight,
  type SectionRuler,
} from "@/lib/geometry/bottom-draw";
import { formatDim, formatMark } from "@/lib/geometry/measure-display";
import { mm, type UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BOTTOM_COPY } from "./bottom-copy";
import { useSectionStation } from "./section-station";

/** The drawing's words, in screen dots (the sketch's `.lab` 9 and `.val` 11). */
const LABEL_DOTS = 9;
const VALUE_DOTS = 11;

/** The four Height picks (D-13). */
const HEIGHTS: readonly SectionHeight[] = [1, 2, 4, 8];

/** A ruler value's width in dots — the sketch's own estimate, 6.2 dots a figure (sketch line 787), so every paint lays the
 * values out the same way. */
const rulerValueWidth = (text: string) => text.length * 6.2;

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
  height: SectionHeight;
  onHeight: (height: SectionHeight) => void;
  /** The live cut: its layout marks are the ruler's (D-14). */
  live: BottomCutKey;
  /** The finished rail from RAILS, drawn over the slab (D-13). */
  showFinishedRail: boolean;
}

/**
 * The cross-section at the cutting line (Phase 17, D-13; UI-SPEC §3.3): the planed slab with square rails, its bottom
 * the cut, on the dashed straightedge (the planed bottom), the stringer's centreline, and the gauge readings where a
 * shaper would hold a gauge — the gap at the stringer, the lift at the rails, a double's trough or a channel's floor,
 * the stringer left — each drawn with the app's `DimensionLine` and its 45° tick, never `0"`.
 *
 * One scale for every station (the wide point's section spans the box less 20 dots a side) and the height at the
 * Height pick — `HEIGHT ×4`, `TRUE HEIGHT` at ×1 — fitted when a deep cut would leave the box, the factor actually drawn
 * then written (`HEIGHT ×2.3`), with a break line across the slab's top when it would not fit. Under the straightedge
 * the ruler of the live cut's layout marks off the stringer (D-14, D-30): bare from a 548-dot box, its caption and the
 * gauge words from 625, none below 548. The finished rail from RAILS (D-13, D-41), when ticked, is the station's own
 * bottomed ring from the store's `bottomSections` — the rail RAILS bands, lifted and thinned by the cut — clipped to the
 * slab.
 *
 * Like the top view the picture takes its own box's shape and every stroke and word is written in screen dots; the only
 * size question is this box's own (`useSvgClientSize`), never the window or the device. Every shape is
 * `bottom-draw.ts`'s (CLAUDE.md Rule 1).
 */
export function BottomSection({ height, onHeight, live, showFinishedRail }: BottomSectionProps) {
  const { system } = useUnits();
  // Where the section is taken, from the tail: the cutting line's station (`section-station.ts`).
  const station = useSectionStation();
  const { bottomBoard: board, resolvedBottom: resolved, bottomSections } = useDesign();
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(svgRef);
  const clipId = useId();
  const measured = box.width > 40 && box.height > 20;

  const drawing = useMemo(
    () => (measured ? bottomSection(resolved, board, mm(station), height, { width: box.width, height: box.height }, { live }) : null),
    [measured, resolved, board, station, height, box.width, box.height, live],
  );
  const gauges = useMemo(() => (drawing ? sectionGauges(drawing, resolved, board, system) : []), [drawing, resolved, board, system]);
  const ruler = useMemo(
    () => (drawing ? sectionRuler(drawing, resolved, board, live, system, rulerValueWidth) : null),
    [drawing, resolved, board, live, system],
  );
  const ghost = useMemo(() => {
    if (!showFinishedRail || !drawing || drawing.pieces.length === 0) return null;
    const ring = ghostRail(bottomSections, mm(station));
    return ring ? ghostRailPath(ring, drawing) : null;
  }, [showFinishedRail, drawing, bottomSections, station]);

  const stationText = formatBottomStation(mm(station), system);
  const widthText = drawing ? formatDim(drawing.widthAtStation, system) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between gap-2 pb-1">
        <span className="block min-w-0 truncate text-[10px] font-bold tracking-architectural text-surf-ink-muted">
          {BOTTOM_COPY.sectionCaption(stationText)}
          {widthText !== null && <span className="max-shell:hidden">{BOTTOM_COPY.sectionCaptionWidth(widthText)}</span>}
        </span>
        <HeightPicker height={height} onHeight={onHeight} />
      </div>
      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          data-bottom-section
          data-height={drawing ? drawing.heightDrawn.toFixed(2) : undefined}
          role="img"
          aria-label={BOTTOM_COPY.sectionName(stationText, widthText ?? "")}
          viewBox={drawing ? `0 0 ${drawing.width} ${drawing.height}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full select-none"
        >
          {drawing && (
            // Every DimensionLine and its tick in screen dots: one dot is `px` drawing units.
            <ViewerZoomUnitProvider value={drawing.px}>
              <SectionDrawingParts drawing={drawing} gauges={gauges} ruler={ruler} ghost={ghost} clipId={clipId} system={system} />
            </ViewerZoomUnitProvider>
          )}
        </svg>
      </div>
    </div>
  );
}

/** The Height buttons' touch box on a touch screen — see `HeightPicker`. */
const HEIGHT_TOUCH_BOX =
  "coarse:relative coarse:min-w-8 coarse:after:absolute coarse:after:-inset-x-[7px] coarse:after:-top-[6px] coarse:after:z-10 coarse:after:h-11 coarse:after:content-['']";

/**
 * The Height control (D-13; UI-SPEC §3.5): the word `Height` on a computer, then `×1` `×2` `×4` `×8`, the pick pressed.
 * ×4 when the page opens; kept while on the page, never saved. View-only, so a locked board keeps it. On a touch screen
 * each button is drawn as small as ever inside an invisible touch box 44 dots square: the buttons stand a little
 * further apart there so the four boxes sit side by side without covering one another, 5 dots of each box reach up
 * into the gap under the top view and the rest hangs over the cross-section's empty top margin. (The zoom row's own
 * touch box adds 5 dots all round, which makes 44 of a 34-dot icon and only 27 of a button this small.)
 */
function HeightPicker({ height, onHeight }: { height: SectionHeight; onHeight: (height: SectionHeight) => void }) {
  return (
    <div role="group" aria-label={BOTTOM_COPY.height} data-lock-exempt data-bottom-height className="flex flex-none items-center gap-2 coarse:pr-1.5">
      <span className="text-xs text-surf-ink-muted font-normal max-shell:hidden [@media(max-height:500px)]:hidden">{BOTTOM_COPY.height}</span>
      <div className="flex gap-1 coarse:gap-3">
        {HEIGHTS.map((factor) => {
          const pressed = factor === height;
          return (
            <button
              key={factor}
              type="button"
              data-lock-exempt
              aria-label={BOTTOM_COPY.heightButtonName(factor)}
              aria-pressed={pressed}
              onClick={() => onHeight(factor)}
              className={cn(
                "focus-ring-accent cursor-pointer rounded border px-2 text-[10px] font-bold tracking-[0.05em]",
                HEIGHT_TOUCH_BOX,
                pressed ? "border-surf-line text-surf-ink" : "border-transparent text-surf-ink-muted",
              )}
            >
              {BOTTOM_COPY.heightButton(factor)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionDrawingParts({
  drawing,
  gauges,
  ruler,
  ghost,
  clipId,
  system,
}: {
  drawing: ReturnType<typeof bottomSection>;
  gauges: Gauge[];
  ruler: SectionRuler | null;
  ghost: string | null;
  clipId: string;
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
      {/* On a phone the box is short enough that the slab's break line rises to the label's own line, so there the
          label sits 5 dots higher, clear of it. Behind the layout's width line — a computer's label is drawn where
          it always was. The lift is in the drawing's own units, a dot being `px`. */}
      <text
        data-bottom-height-label
        x={8 * px}
        y={14 * px}
        style={{ ...labelStyle, "--bottom-height-label-lift": `${-5 * px}px` } as CSSProperties}
        className="max-shell:[transform:translateY(var(--bottom-height-label-lift))]"
      >
        {sectionHeightLabel(drawing)}
      </text>
      {drawing.pieces.map((d, i) => (
        <path key={i} d={d} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1 * px} />
      ))}
      {ghost && (
        // The finished rail from RAILS (D-13), sitting on what the contour left, clipped to the slab.
        <>
          <defs>
            <clipPath id={clipId}>
              {drawing.pieces.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </clipPath>
          </defs>
          <path data-bottom-ghost d={ghost} fill="none" stroke="var(--outline-ghost)" strokeWidth={px} clipPath={`url(#${clipId})`} />
        </>
      )}
      {drawing.breakPath && (
        <>
          <path d={drawing.breakPath} fill="none" stroke="var(--surf-panel)" strokeWidth={7 * px} />
          <path data-bottom-break d={drawing.breakPath} fill="none" stroke="var(--outline-ink)" strokeWidth={px} />
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
      {ruler && <RulerParts ruler={ruler} px={px} labelStyle={labelStyle} />}
    </>
  );
}

/**
 * The ruler of layout marks (D-14, D-30; UI-SPEC §3.3; sketch lines 782–791): 40 dots under the straightedge, an ink line
 * from the stringer to the farthest mark, a 10-dot origin tick, an 8-dot tick and its bare value (11/600) at every mark of
 * the live cut, the values alternating two rows where they would touch, and `OFF THE STRINGER` left of the origin from
 * a 625-dot box. Every position is `sectionRuler`'s.
 */
function RulerParts({ ruler, px, labelStyle }: { ruler: SectionRuler; px: number; labelStyle: Record<string, string | number> }) {
  const valueStyle = {
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fill: "var(--outline-ink)",
    fontSize: VALUE_DOTS * px,
    fontVariantNumeric: "tabular-nums",
  } as const;
  return (
    <g data-bottom-ruler={ruler.caption === null ? "bare" : "captioned"}>
      <line x1={ruler.x1} y1={ruler.y} x2={ruler.x2} y2={ruler.y} stroke="var(--outline-ink)" strokeWidth={px} />
      <line x1={ruler.x1} y1={ruler.y - 5 * px} x2={ruler.x1} y2={ruler.y + 5 * px} stroke="var(--outline-ink)" strokeWidth={px} />
      {ruler.caption !== null && (
        <text data-bottom-ruler-caption x={ruler.x1 - 8 * px} y={ruler.y + 3 * px} textAnchor="end" style={labelStyle}>
          {ruler.caption}
        </text>
      )}
      {ruler.ticks.map((tick) => (
        <g key={tick.column} data-bottom-ruler-tick={tick.column}>
          <line x1={tick.x} y1={ruler.y - 4 * px} x2={tick.x} y2={ruler.y + 4 * px} stroke="var(--outline-ink)" strokeWidth={px} />
          <text x={tick.x} y={ruler.y + (16 + 11 * tick.row) * px} textAnchor="middle" style={valueStyle}>
            {tick.text}
          </text>
        </g>
      ))}
    </g>
  );
}
