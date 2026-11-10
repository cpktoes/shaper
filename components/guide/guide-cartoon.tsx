"use client";

import { createContext, memo, useContext, useId, type CSSProperties } from "react";
import { RAIL_APEX_CENTER_COLOR, RAIL_SEGMENT_COLORS } from "@/components/rails/rail-section-plot";
import { DimensionLine } from "@/components/viewer/callout-primitives";
import { GUIDE_TEXT_PX, GUIDE_VIEWBOX_WIDTH, type GuideFigure, type GuidePrim, type GuideRole, type GuideTextPart } from "@/lib/geometry/guide-card";

/**
 * The one painter for every page's GUIDE drawings (Phase 18, D-06 to D-08, D-18; UI-SPEC §4 and Color): the
 * whole board in a strip at the top with a dash-dot window on the part a card is about, then that part
 * closer in a framed detail under it, the one setting pushed in muted dashes beside the board as it is.
 *
 * It paints a `GuideFigure` exactly as the page's builder in `lib/geometry/guide-*.ts` worked it out — no
 * arithmetic here beyond the text size (CLAUDE.md Rule 1). Every colour is one of the viewers' own drawing
 * tokens, every line keeps one dot wide however wide the card draws, and the drawing's words are pinned at
 * 10 screen dots by dividing by the drawing's own fit, which `GuideTab` measures once for the whole tab.
 *
 * The picture says nothing a screen reader needs (the card's words say it), so it is hidden from one.
 */

/** Screen dots per drawing unit for every cartoon in the open GUIDE (`GuideTab` measures it). */
export const GuideFitContext = createContext(1);

/** How each role is stroked and filled: the viewers' tokens and dashes only (UI-SPEC Color). */
const ROLE: Record<GuideRole, { stroke?: string; fill?: string; dash?: string; width?: number; round?: boolean }> = {
  board: { stroke: "var(--outline-ink)", fill: "var(--outline-board-fill)" },
  shade: { stroke: "var(--outline-ink)", fill: "var(--outline-board-fill)" },
  foam: { stroke: "var(--outline-blank-line)", fill: "var(--outline-foam-shade)" },
  railFill: { fill: "var(--outline-board-fill)" },
  baseline: { stroke: "var(--outline-station-line)", dash: "4 3" },
  station: { stroke: "var(--outline-station-line)", dash: "5 4" },
  mark: { stroke: "var(--outline-station-line)", dash: "5 4" },
  thinning: { stroke: "var(--outline-station-line)", dash: "4 3" },
  reference: { stroke: "var(--outline-station-line)", dash: "3 3" },
  frame: { stroke: "var(--outline-station-line)" },
  extension: { stroke: "var(--outline-station-line)" },
  stringer: { stroke: "var(--outline-station-line)", dash: "12 3 3 3" },
  widepoint: { stroke: "var(--outline-widepoint-line)", dash: "2 3" },
  window: { stroke: "var(--outline-ink)", dash: "7 2.5 1.5 2.5" },
  cut: { stroke: "var(--outline-ink)", dash: "7 2.5 1.5 2.5" },
  push: { stroke: "var(--outline-push-line)", dash: "3 2", width: 1.2 },
  fin: { stroke: "var(--color-surf-accent-ink)", width: 1.5, round: true },
  rail: { stroke: "var(--outline-ink)", round: true },
  band: {},
  apex: { stroke: RAIL_APEX_CENTER_COLOR },
};

/** The order things are painted in, so a push is never under the board's fill: the board and its fills,
 * then the reference lines, then the push, then the dimensions, then the words. */
function layerOf(prim: GuidePrim): number {
  switch (prim.kind) {
    case "dim":
      return 3;
    case "text":
      return 4;
    case "dot":
      return prim.role === "pushDot" ? 2 : 1;
    case "rect":
      return 1;
    default:
      if (prim.role === "push") return 2;
      if (prim.role === "board" || prim.role === "shade" || prim.role === "foam" || prim.role === "railFill") return 0;
      return 1;
  }
}

function inLayers(prims: readonly GuidePrim[]): GuidePrim[] {
  return prims
    .map((prim, i) => ({ prim, i, layer: layerOf(prim) }))
    .sort((a, b) => a.layer - b.layer || a.i - b.i)
    .map((entry) => entry.prim);
}

function Parts({ parts }: { parts: readonly GuideTextPart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        part.figure ? (
          // A figure keeps its unit in its own case: `13 mm`, never `13 MM`.
          <tspan key={i} className="normal-case tracking-normal">
            {part.text}
          </tspan>
        ) : (
          <tspan key={i}>{part.text}</tspan>
        ),
      )}
    </>
  );
}

function textStyle(role: "name" | "value" | "valueMuted" | "note" | "dim", size: number): CSSProperties {
  const base: CSSProperties = { fontSize: size, fontFamily: "var(--font-body)" };
  switch (role) {
    case "name":
      return { ...base, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fill: "var(--outline-callout-label)" };
    case "valueMuted":
    case "note":
      return { ...base, fontWeight: 600, fontVariantNumeric: "tabular-nums", fill: "var(--outline-callout-label)" };
    default:
      return { ...base, fontWeight: 600, fontVariantNumeric: "tabular-nums", fill: "var(--outline-dim-ink)" };
  }
}

function Prim({ prim, size }: { prim: GuidePrim; size: number }) {
  switch (prim.kind) {
    case "path": {
      const look = ROLE[prim.role];
      const stroke = prim.role === "band" && prim.band ? RAIL_SEGMENT_COLORS[prim.band] : look.stroke;
      return (
        <>
          <path
            d={prim.d}
            fill={look.fill ?? "none"}
            stroke={stroke ?? "none"}
            strokeWidth={look.width ?? 1}
            strokeDasharray={look.dash}
            strokeLinecap={look.round ? "round" : undefined}
            strokeLinejoin={look.round ? "round" : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {prim.role === "shade" && <path d={prim.d} fill="var(--outline-foam-shade)" stroke="none" />}
        </>
      );
    }
    case "line": {
      const look = ROLE[prim.role];
      return (
        <line
          x1={prim.x1}
          y1={prim.y1}
          x2={prim.x2}
          y2={prim.y2}
          stroke={look.stroke ?? "var(--outline-ink)"}
          strokeWidth={look.width ?? 1}
          strokeDasharray={look.dash}
          strokeLinecap={look.round ? "round" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "rect": {
      const look = ROLE[prim.role];
      return (
        <rect
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          rx={prim.role === "frame" ? 3 : undefined}
          fill="none"
          stroke={look.stroke}
          strokeDasharray={look.dash}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "dim":
      return (
        <>
          <DimensionLine x1={prim.x1} y1={prim.y1} x2={prim.x2} y2={prim.y2} />
          <text x={prim.lx} y={prim.ly} dy={prim.dy ? `${prim.dy}em` : undefined} textAnchor={prim.anchor} style={textStyle("dim", size)}>
            <Parts parts={prim.parts} />
          </text>
        </>
      );
    case "text":
      return (
        <text x={prim.x} y={prim.y} dy={prim.dy ? `${prim.dy}em` : undefined} textAnchor={prim.anchor} style={textStyle(prim.role, size)}>
          <Parts parts={prim.parts} />
        </text>
      );
    case "dot":
      return (
        <circle
          cx={prim.x}
          cy={prim.y}
          r={prim.r}
          fill={prim.role === "pushDot" ? "var(--outline-push-line)" : "var(--outline-ink)"}
        />
      );
  }
}

export const GuideCartoon = memo(function GuideCartoon({ figure }: { figure: GuideFigure }) {
  const clipBase = useId();
  const fit = useContext(GuideFitContext);
  const size = GUIDE_TEXT_PX / fit;
  return (
    <svg
      data-guide-cartoon
      viewBox={`0 0 ${GUIDE_VIEWBOX_WIDTH} ${figure.height}`}
      aria-hidden="true"
      focusable="false"
      className="block h-auto w-full overflow-visible"
      fill="none"
    >
      {inLayers(figure.strip).map((prim, i) => (
        <Prim key={`s${i}`} prim={prim} size={size} />
      ))}
      {figure.windows.map((win, w) => {
        const clipId = `${clipBase}-w${w}`;
        return (
          <g key={`w${w}`}>
            <defs>
              <clipPath id={clipId}>
                <rect x={win.box.x} y={win.box.y} width={win.box.w} height={win.box.h} rx={3} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {inLayers(win.prims).map((prim, i) => (
                <Prim key={i} prim={prim} size={size} />
              ))}
            </g>
            <Prim prim={{ kind: "rect", role: "frame", x: win.box.x, y: win.box.y, w: win.box.w, h: win.box.h }} size={size} />
          </g>
        );
      })}
    </svg>
  );
});
