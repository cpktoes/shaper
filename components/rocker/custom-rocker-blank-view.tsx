"use client";

/**
 * The Customize Rocker popup's one drawing (quick 261017-ojc, 2026-10-17; D-01, D-02, D-03, D-07): the
 * blank bent by the draft, on its bottom plane, in the same grammar whether or not the board is shown
 * (the founder: "I prefer the on view. Can we make the off view match it?"). Above the foam, a card at
 * each of the blank's five stations with its printed thickness — and with Show my board on, a second
 * line with the board's own thickness at the board's station of that name, each line with its own
 * leader (P-2). Under the foam, the rocker figures stacked at each station: NAT, CUSTOM once any change
 * is set (P-4), BOARD with the board shown (P-3). The page viewer's chip look, its tick marks and its
 * two titles, Thickness and Rocker (P-7). The overlay as it was (D-05): the natural rocker dashed, a
 * mark where each bend starts, the first change red and the second blue. With Dimensions off (a phone
 * only, D-07) every card, figure, title and tick goes and the foam (and the board) fills the drawing.
 *
 * Every number and every position comes from `lib/geometry/custom-rocker-art.ts` (Rule 1): the
 * stations from `blankViewStations`, the frame and every label from `blankViewLayout`, the overlay from
 * `blankFrameOverlay` — each fed the SAME bent blank and the SAME draft spec (one spec in, one drawing
 * out). This component only turns them into SVG.
 *
 * The svg measures its own box (`useSvgClientSize`), so one drawing unit is one CSS pixel at 1x and the
 * type sizes are plain pixels; until it is measured it draws nothing. The page's zoom works on it
 * (`useViewerZoom`, D-05): strokes and dashes keep their screen size through the zoom unit, and every
 * card, stack and title is held at its screen size about its own leader's start (`ScreenSizeGroup`).
 *
 * The blank's maker and name reach the drawing only as its accessible name, a plain React attribute;
 * every label is SVG text through JSX (T-ojc-01).
 */

import { useMemo, useRef } from "react";
import { CalloutChipFrame, DimensionTick, useSvgClientSize } from "@/components/viewer/callout-primitives";
import { ScreenSizeGroup, useViewerZoom } from "@/components/viewer/zoom-viewport";
import { scaleDash } from "@/components/viewer/zoom-math";
import { useUnits } from "@/components/units-provider";
import type { PreparedBlank } from "@/lib/geometry/blank-fit";
import type { BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import {
  blankFrameOverlay,
  blankViewLayout,
  blankViewStations,
  type BlankViewText,
  type BlankViewType,
  type BoardInBlank,
  type RockerOverlayLines,
} from "@/lib/geometry/custom-rocker-art";
import { blankViewName } from "@/lib/geometry/custom-rocker-text";
import { BLANK_LINE_PX, THINNING_MARK_DASH, THINNING_MARK_OVERSHOOT } from "./rocker-view-frame";

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

/** How densely the foam's outline is sampled — a drawing parameter only. */
const SAMPLES = 160;

const INK = "var(--outline-ink)";
const LABEL = "var(--outline-callout-label)";
const TRACKED = "0.08em";

/** A name or a title: bold, tracked, in the label colour. */
function WordText({ t, size }: { t: BlankViewText; size: number }) {
  return (
    <text
      x={t.x}
      y={t.y}
      textAnchor={t.anchor}
      style={{ fontSize: size, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: TRACKED }}
      fill={LABEL}
    >
      {t.text}
    </text>
  );
}

/**
 * A line of figures: ONE svg text, each figure a tspan (`data-figure`) holding its tag — small,
 * tracked, in the label colour — and, after the tag gap, its value in the ink (a `—` in the label
 * colour, as the page draws its centre dash). Two figures on one line (standing) sit the pair gap apart.
 */
function FigureText({ t, type }: { t: BlankViewText; type: BlankViewType }) {
  return (
    <text x={t.x} y={t.y} textAnchor={t.anchor} style={{ fontWeight: 700, fontFamily: "var(--font-body)" }}>
      {t.figures.map((f, i) => (
        <tspan key={f.key} data-figure={f.key}>
          {f.tag !== null && (
            <tspan
              data-figure-tag
              dx={i > 0 ? type.pairGap : undefined}
              style={{ fontSize: type.tag, letterSpacing: TRACKED }}
              fill={LABEL}
            >
              {f.tag}
            </tspan>
          )}
          <tspan
            data-figure-value
            dx={f.tag !== null ? type.tagGap : i > 0 ? type.pairGap : undefined}
            style={{ fontSize: type.value }}
            fill={f.muted ? LABEL : INK}
          >
            {f.value}
          </tspan>
        </tspan>
      ))}
    </text>
  );
}

function polylinePoints(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function closedPath(points: { x: number; y: number }[]): string {
  return `${points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")} Z`;
}

export interface CustomRockerBlankViewProps {
  /** The blank bent by `spec` — the draft's, never the board's own (one spec in, one drawing out). */
  bent: PreparedBlank;
  spec: BlankRockerSpec;
  /** With Show my board on, the board carried into the blank's frame (`boardInBlankFrame`); null off. */
  board: BoardInBlank | null;
  orientation: "horizontal" | "vertical";
  /** D-07: false clears every card, stack, title and tick so the foam fills the drawing. */
  dimensions: boolean;
  /** P-9: a short screen — the drawing keeps the width's scale and grows taller, the column scrolling. */
  scroll: boolean;
}

export function CustomRockerBlankView({ bent, spec, board, orientation, dimensions, scroll }: CustomRockerBlankViewProps) {
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
  const stations = useMemo(() => blankViewStations(bent, spec, system, board), [bent, spec, system, board]);
  const overlay = useMemo(() => blankFrameOverlay(spec, bent), [spec, bent]);
  // Whole pixels: the box's first measure reads `clientHeight` (rounded) and the resize observer's the
  // fractional size half a pixel off it, so a drawing remounted by a switch would otherwise change its
  // frame by half a pixel a moment after it first draws.
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  const layout = useMemo(
    () =>
      width > 0 && height > 0
        ? blankViewLayout({
            width,
            height,
            orientation,
            lengthMm: bent.lengthMm,
            blank: samples,
            board: board?.outline ?? null,
            overlay,
            stations,
            dimensions,
            scroll,
          })
        : null,
    [width, height, orientation, bent.lengthMm, samples, board, overlay, stations, dimensions, scroll],
  );

  const baseViewBox = layout?.viewBox ?? "0 0 1 1";
  const { viewBox, zoomUnit, svgProps } = useViewerZoom(svgRef, baseViewBox, { touch: "pan" });

  return (
    <>
      {/* P-9: on a short screen the box grows to what the drawing needs, so the column scrolls. */}
      {scroll && layout && layout.neededHeight > 0 && <div aria-hidden data-blank-view-room style={{ height: layout.neededHeight }} />}
      <svg
        ref={svgRef}
        data-blank-view
        data-blank-view-label-scale={layout?.labelScale}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        {...svgProps}
        className="absolute inset-0 block h-full w-full select-none"
        style={{ WebkitTouchCallout: "none", ...svgProps.style }}
        role="img"
        aria-label={blankViewName(bent.record, spec, board !== null)}
      >
        {layout && (
          <>
            {/* The bottom plane the blank sits on — the rocker's zero, dashed like the page's; it
                stays with Dimensions off, a reference line rather than a dimension (P-16). */}
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
              d={closedPath(layout.blankOutline)}
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
            {/* The board inside the blank (D-01), after the overlay so it stays the subject on top.
                Its Thinning Starts marks are not drawn here (P-12): the only dashed marks across the
                foam are the bend marks. */}
            {layout.boardOutline && (
              <path
                data-board-silhouette="profile"
                d={closedPath(layout.boardOutline)}
                fill="var(--outline-board-fill)"
                stroke={INK}
                strokeWidth={2 * zoomUnit}
                strokeLinejoin="round"
              />
            )}
            {[...layout.cards, ...layout.stacks].map((label, n) => (
              <g key={`leaders-${n}`}>
                {label.leaders.map((leader, i) => (
                  <polyline
                    key={i}
                    points={polylinePoints(leader)}
                    fill="none"
                    stroke="var(--outline-station-line)"
                    strokeWidth={zoomUnit}
                  />
                ))}
                {label.ticks.map((tick, i) => (
                  <DimensionTick key={i} x={tick.x} y={tick.y} />
                ))}
              </g>
            ))}
            {layout.cards.map((card) => (
              <ScreenSizeGroup key={card.key} x={card.anchor.x} y={card.anchor.y}>
                <g data-blank-view-card={card.key}>
                  <CalloutChipFrame x={card.box.x} y={card.box.y} width={card.box.width} height={card.box.height} />
                  {card.texts.map((t, i) =>
                    t.kind === "figures" ? <FigureText key={i} t={t} type={layout.type} /> : <WordText key={i} t={t} size={layout.type.name} />,
                  )}
                </g>
              </ScreenSizeGroup>
            ))}
            {layout.stacks.map((stack) => (
              <ScreenSizeGroup key={stack.key} x={stack.anchor.x} y={stack.anchor.y}>
                <g data-blank-view-rocker={stack.key}>
                  {stack.texts.map((t, i) => (
                    <FigureText key={i} t={t} type={layout.type} />
                  ))}
                </g>
              </ScreenSizeGroup>
            ))}
            {layout.titles.map((title) => (
              <ScreenSizeGroup key={title.key} x={title.text.x} y={title.text.y}>
                <g data-blank-view-title={title.key}>
                  <WordText t={title.text} size={layout.type.title} />
                </g>
              </ScreenSizeGroup>
            ))}
          </>
        )}
      </svg>
    </>
  );
}
