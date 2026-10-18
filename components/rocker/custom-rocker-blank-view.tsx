"use client";

/**
 * The Customize Rocker popup's drawing with Show my board off (quick 261016-mkb, P-3, D-07): the
 * blank alone, bent by the draft, on its bottom plane, with ALL its dimensions at its own five
 * stations — its printed thickness as chips on one rail, its rocker as ordered on the other, the
 * natural figure small where it differs — and the overlay (the natural rocker dashed, a mark where
 * each bend starts, the first change red and the second blue).
 *
 * Every number and every position comes from `lib/geometry/custom-rocker-art.ts` (Rule 1): the
 * stations from `blankAloneStations`, the frame, the rails and the labels from `blankAloneLayout`,
 * the overlay from `blankFrameOverlay` — each fed the SAME bent blank and the SAME draft spec
 * (one spec in, one drawing out). This component only turns them into SVG.
 *
 * The svg measures its own box (`useSvgClientSize`), so one drawing unit is one CSS pixel at 1x and
 * the type sizes are plain pixels; until it is measured it draws nothing. The page's zoom works on it
 * (`useViewerZoom`, D-07): strokes and dashes keep their screen size through the zoom unit, and every
 * label is held at its screen size about the end of its own leader (`ScreenSizeGroup`).
 *
 * The blank's maker and name reach the drawing only as its accessible name, a plain React attribute;
 * every label is SVG text through JSX (T-mkb-07).
 */

import { useMemo, useRef } from "react";
import { CalloutChipFrame, useSvgClientSize } from "@/components/viewer/callout-primitives";
import { ScreenSizeGroup, useViewerZoom } from "@/components/viewer/zoom-viewport";
import { scaleDash } from "@/components/viewer/zoom-math";
import { useUnits } from "@/components/units-provider";
import type { PreparedBlank } from "@/lib/geometry/blank-fit";
import { blankDisplayName, type BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import {
  blankAloneLayout,
  blankAloneStations,
  blankFrameOverlay,
  type BoardInBlank,
  type LayoutText,
  type RockerOverlayLines,
} from "@/lib/geometry/custom-rocker-art";
import { BLANK_LINE_PX, THINNING_MARK_DASH, THINNING_MARK_OVERSHOOT } from "./rocker-view-frame";

/** How densely the foam's outline is sampled — a drawing parameter only. */
const SAMPLES = 160;

const FILL: Record<LayoutText["role"], string> = {
  value: "var(--outline-ink)",
  name: "var(--outline-callout-label)",
  natural: "var(--outline-callout-label)",
  title: "var(--outline-callout-label)",
};

/**
 * The Customize Rocker popup's overlay (quick 261016-mkb, D-07, P-14) — the popup's alone: since quick
 * 261017-ojc (P-15, 2026-10-17) the popup draws one picture in both states and never mounts the page's
 * viewer, so this layer moved here from `rocker-viewer.tsx`, body unchanged. `project` turns a point of the overlay
 * (millimetres along the frame and up) into the drawing's own units. Every element carries
 * `data-rocker-overlay` so a browser test can prove where it is, and where it is not (the page).
 *
 * The natural rocker is the blank's line colour, dashed (`5 4`, the stations' dash — a reference
 * line, never a second blank); each span's bottom and deck in the change's own colour, the second
 * change after the first so blue sits on red where they stack; each bend mark in the Thinning Starts
 * mark's grammar, pushed `overshoot` past the bottom and the deck. Strokes and dashes keep their
 * screen size through `zoomUnit`.
 */
export function RockerOverlayLayer({
  overlay,
  project,
  zoomUnit,
  overshoot,
}: {
  overlay: RockerOverlayLines;
  project: (s: number, h: number) => { x: number; y: number };
  zoomUnit: number;
  overshoot: number;
}) {
  const line = (pts: { s: number; h: number }[]) =>
    pts
      .map((p) => {
        const q = project(p.s, p.h);
        return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;
      })
      .join(" ");
  const spans = [...overlay.spans].sort((a, b) => a.order - b.order);
  return (
    <g pointerEvents="none">
      {overlay.natural.length > 1 && (
        <polyline
          data-rocker-overlay="natural"
          points={line(overlay.natural)}
          fill="none"
          stroke="var(--outline-blank-line)"
          strokeWidth={zoomUnit}
          strokeDasharray={scaleDash("5 4", zoomUnit)}
        />
      )}
      {spans.map((span) => (
        <g key={`${span.end}-${span.order}`} data-rocker-overlay={`span-${span.order}`} data-rocker-overlay-end={span.end}>
          {[span.bottom, span.deck].map((pts, i) => (
            <polyline
              key={i}
              points={line(pts)}
              fill="none"
              stroke={span.order === 1 ? "var(--rocker-adjust-1)" : "var(--rocker-adjust-2)"}
              strokeWidth={1.6 * zoomUnit}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
      {overlay.bendMarks.map((mark) => {
        const bottom = project(mark.s, mark.bottom);
        const deck = project(mark.s, mark.deck);
        // Along the line from the bottom to the deck, pushed `overshoot` past each end.
        const len = Math.hypot(deck.x - bottom.x, deck.y - bottom.y) || 1;
        const ux = (deck.x - bottom.x) / len;
        const uy = (deck.y - bottom.y) / len;
        return (
          <line
            key={mark.s}
            data-rocker-overlay="bend-mark"
            x1={bottom.x - ux * overshoot}
            y1={bottom.y - uy * overshoot}
            x2={deck.x + ux * overshoot}
            y2={deck.y + uy * overshoot}
            stroke="var(--outline-blank-line)"
            strokeWidth={zoomUnit}
            strokeDasharray={scaleDash(THINNING_MARK_DASH, zoomUnit)}
          />
        );
      })}
    </g>
  );
}

function SvgText({ t }: { t: LayoutText }) {
  return (
    <text
      x={t.x}
      y={t.y}
      textAnchor={t.anchor}
      style={{
        fontSize: t.size,
        fontWeight: t.weight,
        fontFamily: "var(--font-body)",
        letterSpacing: t.role === "title" ? "0.08em" : undefined,
      }}
      fill={FILL[t.role]}
    >
      {t.text}
    </text>
  );
}

export interface CustomRockerBlankViewProps {
  /** The blank bent by `spec` — the draft's, never the board's own (one spec in, one drawing out). */
  bent: PreparedBlank;
  spec: BlankRockerSpec;
  orientation: "horizontal" | "vertical";
  /** With Show my board on, the board carried into the blank's frame (`boardInBlankFrame`, quick
   * 261017-ojc), drawn inside the same picture; null or absent with it off. */
  board?: BoardInBlank | null;
}

export function CustomRockerBlankView({ bent, spec, orientation, board = null }: CustomRockerBlankViewProps) {
  const { system } = useUnits();
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useSvgClientSize(svgRef);

  const samples = useMemo(() => {
    const L = bent.lengthMm;
    return Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const x = (L * i) / SAMPLES;
      const bottom = bent.rocker.sample(x);
      return { x, bottom, deck: bottom + bent.thickness.sample(x) };
    });
  }, [bent]);
  const stations = useMemo(() => blankAloneStations(bent, spec, system), [bent, spec, system]);
  const overlay = useMemo(() => blankFrameOverlay(spec, bent), [spec, bent]);
  // Whole pixels (quick 261017-ojc): the box's first measure reads `clientHeight` (rounded) and the
  // resize observer's the fractional size half a pixel off it, so a drawing remounted by a switch
  // would otherwise change its frame by half a pixel a moment after it first draws.
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  const layout = useMemo(
    () =>
      width > 0 && height > 0
        ? blankAloneLayout({ width, height, orientation, lengthMm: bent.lengthMm, samples, stations })
        : null,
    [width, height, orientation, bent.lengthMm, samples, stations],
  );

  const baseViewBox = layout?.viewBox ?? "0 0 1 1";
  const { viewBox, zoomUnit, svgProps } = useViewerZoom(svgRef, baseViewBox, { touch: "pan" });

  const outlinePath = layout
    ? `${layout.outline.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")} Z`
    : "";
  // The board inside the blank (quick 261017-ojc, D-01): its bottom tail to nose, its deck back.
  const boardPath =
    layout && board
      ? `${[...board.outline.map((p) => layout.point(p.x, p.bottom)), ...[...board.outline].reverse().map((p) => layout.point(p.x, p.deck))]
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(" ")} Z`
      : "";

  return (
    <svg
      ref={svgRef}
      data-blank-alone
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      {...svgProps}
      className="absolute inset-0 block h-full w-full select-none"
      style={{ WebkitTouchCallout: "none", ...svgProps.style }}
      role="img"
      aria-label={`Side view of the ${bent.record.vendor} ${blankDisplayName(bent.record, spec)} blank on its own, with its thickness and its rocker as ordered at its five stations`}
    >
      {layout && (
        <>
          {/* The bottom plane the blank sits on — the rocker's zero, dashed like the page's. */}
          <line
            x1={layout.baseline.from.x}
            y1={layout.baseline.from.y}
            x2={layout.baseline.to.x}
            y2={layout.baseline.to.y}
            stroke="var(--outline-station-line)"
            strokeWidth={zoomUnit}
            strokeDasharray={scaleDash("4 3", zoomUnit)}
          />
          <path
            data-blank-silhouette
            d={outlinePath}
            fill="var(--outline-foam-shade)"
            stroke="var(--outline-blank-line)"
            strokeWidth={BLANK_LINE_PX * zoomUnit}
            strokeLinejoin="round"
          />
          <RockerOverlayLayer
            overlay={overlay}
            project={(s, h) => layout.point(s, h)}
            zoomUnit={zoomUnit}
            overshoot={THINNING_MARK_OVERSHOOT}
          />
          {boardPath && (
            <path
              data-board-silhouette="profile"
              d={boardPath}
              fill="var(--outline-board-fill)"
              stroke="var(--outline-ink)"
              strokeWidth={2 * zoomUnit}
              strokeLinejoin="round"
            />
          )}
          {layout.stations.map((st) => (
            <g key={st.key}>
              {[st.chip.leader, st.reading.leader].map((leader, i) => (
                <line
                  key={i}
                  x1={leader.rail.x}
                  y1={leader.rail.y}
                  x2={leader.curve.x}
                  y2={leader.curve.y}
                  stroke="var(--outline-station-line)"
                  strokeWidth={zoomUnit}
                />
              ))}
              <ScreenSizeGroup x={st.chip.leader.rail.x} y={st.chip.leader.rail.y}>
                <g data-blank-alone-chip={st.key}>
                  <CalloutChipFrame x={st.chip.box.x} y={st.chip.box.y} width={st.chip.box.width} height={st.chip.box.height} />
                  {st.chip.texts.map((t, i) => (
                    <SvgText key={i} t={t} />
                  ))}
                </g>
              </ScreenSizeGroup>
              <ScreenSizeGroup x={st.reading.leader.rail.x} y={st.reading.leader.rail.y}>
                <g data-blank-alone-reading={st.key}>
                  {st.reading.texts.map((t, i) => (
                    <SvgText key={i} t={t} />
                  ))}
                </g>
              </ScreenSizeGroup>
            </g>
          ))}
          {layout.titles.map((title) => (
            <ScreenSizeGroup key={title.text.text} x={title.text.x} y={title.text.y}>
              <SvgText t={title.text} />
            </ScreenSizeGroup>
          ))}
        </>
      )}
    </svg>
  );
}
