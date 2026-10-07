"use client";

/**
 * ROCKER's top view (quick 261006-qfm): the picked blank seen from above, with the board's own
 * outline on it — the one part of the fit the side view cannot show, width.
 *
 * The founder asked for it on 2026-10-02 ("a miniature version of the blank outline (with 12"
 * stations, center, and stringer line) on the rocker viewer page ... with the board outline also
 * shown (no station marks)") and settled its form on 2026-10-06: "On a large desktop screen, the
 * mini blank/board image can be turned on/off by another button. ON smaller screens where theres no
 * room with the rocker/blank view, let's make a new viewer tab." And later the same day: "The
 * blank/board top view does not need to be the same scale. It can be a mini display, it's really
 * just for reference only."
 *
 * What a shaper sees:
 * - On a computer (the desktop layout, taller than 500 dots), `TopViewInset` — a small drawing on
 *   its own plate over the VIEWER panel's top-left corner, beside the side view rather than at its
 *   scale (D-03). A toolbar button hides and shows it; it turns nose-up with the Rotate button.
 * - On an upright phone, a phone held sideways, or any narrow or short window, `RockerTopView`
 *   fills its own TOP VIEW tab instead, standing up or lying flat with the board (D-04).
 *
 * Both draw the SAME `TopViewShapes` in the SAME frame (`topViewFrame`, from
 * `rocker-view-frame.ts`'s `rockerTopViewLayout`): the blank in the foam shade with a hairline edge,
 * the board's TEMPLATE outline on it where the Placement slider puts it, the blank's stringer
 * (dash-dot, on top of the board), its centre mark and its two 12" marks (D-01). With no blank
 * picked, the board's outline alone (D-02). No text and no figures anywhere: it is a reference
 * picture, and the numbers live in the side view and the DATASHEET. Every line weight and dash is
 * pinned to screen pixels (D-17), because the mini display draws at about a quarter of a pixel per
 * unit, where a drawing-unit line would vanish.
 *
 * This file paints only. Every number comes from `buildBlankTopView` (`lib/geometry/blank-top-view.ts`,
 * CLAUDE.md Rule 1) and the frame module; millimetres become inches through `mmToInches`.
 */

import { useRef } from "react";
import { useUnits } from "@/components/units-provider";
import { useSvgFitScale, type ViewerOrientation } from "@/components/viewer/callout-primitives";
import type { BlankTopView } from "@/lib/geometry/blank-top-view";
import type { BlankSideView } from "@/lib/geometry/board-profile";
import { stationLabel } from "@/lib/geometry/measure-display";
import { mmToInches, type Mm } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import {
  BLANK_LINE_PX,
  KNOT_DOT_PX,
  PAD_X,
  rockerTopViewLayout,
  TOP_VIEW_BOARD_LINE_PX,
  TOP_VIEW_MARK_LINE_PX,
  TOP_VIEW_STATION_DASH_PX,
  TOP_VIEW_STRINGER_DASH_PX,
  type RockerTopViewLayout,
} from "./rocker-view-frame";

/** The blank outline's sampling density along the blank — a drawing parameter only, like the side
 * view's `BLANK_SAMPLES`. The board's shape comes from TEMPLATE's own points, never from this. */
export const TOP_VIEW_SAMPLES = 120;

/**
 * The top view's frame, for the drawing and the mini display's box alike — the one place both get
 * it, so the box's aspect ratio and the drawing inside it can never disagree. The blank's reach
 * past each tip comes off `topView.extent` (D-12); the half-width is the widest thing drawn.
 */
export function topViewFrame(topView: BlankTopView, length: Mm, orientation: ViewerOrientation): RockerTopViewLayout {
  return rockerTopViewLayout({
    lengthIn: mmToInches(length),
    halfWidthIn: mmToInches(topView.halfWidthMax),
    tailOverhangIn: mmToInches(-topView.extent.from as Mm),
    noseOverhangIn: mmToInches((topView.extent.to - length) as Mm),
    orientation,
  });
}

/** A screen-pinned dash list, in this drawing's own units. */
function dashOf(pattern: readonly number[], handleUnit: number): string {
  return pattern.map((value) => (value * handleUnit).toFixed(2)).join(" ");
}

export interface TopViewShapesProps {
  topView: BlankTopView;
  /** A station in inches from the board's tail tip → x, in the canonical (nose-left) frame. */
  pxX: (stationIn: number) => number;
  centerY: number;
  /** User units per inch. */
  scale: number;
  /** User units per CSS pixel: what every pinned weight, dash and dot is multiplied by. */
  handleUnit: number;
  showMeasuringPoints: boolean;
}

/** The blank, the board, the stringer, the three marks and the measuring points, in paint order. */
export function TopViewShapes({ topView, pxX, centerY, scale, handleUnit, showMeasuringPoints }: TopViewShapesProps) {
  const at = (station: Mm) => pxX(mmToInches(station));
  const across = (halfWidth: Mm) => mmToInches(halfWidth) * scale;

  // The blank: up its +half-width side tail to nose, back down the −half-width side, closed — a
  // tip printed 0 wide comes to a point, a wider one closes square.
  const blankPath =
    topView.blankOutline.length > 0
      ? [
          ...topView.blankOutline.map(
            (s, i) => `${i === 0 ? "M" : "L"} ${at(s.station).toFixed(2)} ${(centerY - across(s.halfWidth)).toFixed(2)}`,
          ),
          ...topView.blankOutline
            .slice()
            .reverse()
            .map((s) => `L ${at(s.station).toFixed(2)} ${(centerY + across(s.halfWidth)).toFixed(2)}`),
          "Z",
        ].join(" ")
      : null;

  // The board: TEMPLATE's own signed polygon, straight through, so a swallow's notch or a
  // diamond's point comes with it.
  const boardPath = [
    ...topView.boardOutline.map(
      (p, i) => `${i === 0 ? "M" : "L"} ${at(p.station).toFixed(2)} ${(centerY - mmToInches(p.w) * scale).toFixed(2)}`,
    ),
    "Z",
  ].join(" ");

  const markWidth = TOP_VIEW_MARK_LINE_PX * handleUnit;
  const stringerDash = dashOf(TOP_VIEW_STRINGER_DASH_PX, handleUnit);
  const stationDash = dashOf(TOP_VIEW_STATION_DASH_PX, handleUnit);

  return (
    <g data-top-view>
      {blankPath && (
        <path
          data-top-view-blank
          d={blankPath}
          fill="var(--outline-foam-shade)"
          stroke="var(--outline-blank-line)"
          strokeWidth={BLANK_LINE_PX * handleUnit}
          strokeLinejoin="round"
        />
      )}
      <path
        data-top-view-board
        d={boardPath}
        fill="var(--outline-board-fill)"
        stroke="var(--outline-ink)"
        strokeWidth={TOP_VIEW_BOARD_LINE_PX * handleUnit}
        strokeLinejoin="round"
      />
      {topView.stringer && (
        <line
          data-top-view-stringer
          x1={at(topView.stringer.from)}
          y1={centerY}
          x2={at(topView.stringer.to)}
          y2={centerY}
          stroke="var(--outline-station-line)"
          strokeWidth={markWidth}
          strokeDasharray={stringerDash}
        />
      )}
      {topView.marks.map((mark) => (
        <line
          key={mark.label}
          data-top-view-mark={mark.label}
          x1={at(mark.station)}
          y1={centerY - across(mark.halfWidth)}
          x2={at(mark.station)}
          y2={centerY + across(mark.halfWidth)}
          stroke="var(--outline-station-line)"
          strokeWidth={markWidth}
          strokeDasharray={mark.label === "C" ? stringerDash : stationDash}
        />
      ))}
      {showMeasuringPoints && topView.widthDots.length > 0 && (
        <g data-top-view-points pointerEvents="none">
          {topView.widthDots.flatMap((dot, i) => [
            <circle
              key={`${i}-a`}
              cx={at(dot.station)}
              cy={centerY - across(dot.halfWidth)}
              r={KNOT_DOT_PX * handleUnit}
              fill="var(--outline-blank-line)"
            />,
            <circle
              key={`${i}-b`}
              cx={at(dot.station)}
              cy={centerY + across(dot.halfWidth)}
              r={KNOT_DOT_PX * handleUnit}
              fill="var(--outline-blank-line)"
            />,
          ])}
        </g>
      )}
    </g>
  );
}

export interface RockerTopViewProps {
  topView: BlankTopView;
  length: Mm;
  blank?: BlankSideView;
  orientation: ViewerOrientation;
  showMeasuringPoints: boolean;
}

/** The drawing's spoken name (D-11) — one name for the mini display and the tab, never containing
 * the side view's "Side profile" or its thinning sentence, so no lookup can find two pictures. */
function topViewName(blank: BlankSideView | undefined, system: ReturnType<typeof useUnits>["system"]): string {
  if (!blank) return "The board's outline seen from above";
  const marks = system === "metric" ? `${stationLabel("metric")} marks` : "12-inch marks";
  return `The board's outline seen from above, on the ${blank.record.vendor} ${blank.record.name} blank, with its stringer, centre mark and ${marks}`;
}

/**
 * The top view as one fitted `<svg>`, filling whatever box holds it — the TOP VIEW tab's panel on a
 * phone, the mini display's plate on a computer. Nose-up is one `rotate(90)` group over the
 * canonical drawing, its frame built from its own turned content.
 */
export function RockerTopView({ topView, length, blank, orientation, showMeasuringPoints }: RockerTopViewProps) {
  const { system } = useUnits();
  const svgRef = useRef<SVGSVGElement>(null);
  const vertical = orientation === "vertical";
  const frame = topViewFrame(topView, length, orientation);
  const fitScale = useSvgFitScale(svgRef, frame.width, frame.height);
  /** User units per CSS pixel — what every pinned weight is drawn in, guarded as the side view's. */
  const handleUnit = fitScale > 0 ? 1 / fitScale : 1;
  const lengthIn = mmToInches(length);
  const pxX = (stationIn: number) => PAD_X + frame.boardOffsetX + (lengthIn - stationIn) * frame.scale;

  return (
    <svg
      ref={svgRef}
      viewBox={frame.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 block h-full w-full select-none"
      style={{ WebkitTouchCallout: "none" }}
      role="img"
      aria-label={topViewName(blank, system)}
    >
      <g transform={vertical ? "rotate(90)" : undefined}>
        <TopViewShapes
          topView={topView}
          pxX={pxX}
          centerY={frame.centerY}
          scale={frame.scale}
          handleUnit={handleUnit}
          showMeasuringPoints={showMeasuringPoints}
        />
      </g>
    </svg>
  );
}

/**
 * The mini display (D-03, D-18): the top view on its own small plate over the VIEWER panel's
 * top-left corner, on a computer only. The founder, 2026-10-06: "The blank/board top view does not
 * need to be the same scale. It can be a mini display, it's really just for reference only."
 *
 * - The top-LEFT corner, because the toolbar row owns the top-right. Positioned like that row
 *   (`absolute top-0`): the panel card's own padding is the inset, so no further offset.
 * - An opaque plate — the toolbar button's own ground and padding, with no border since the founder's
 *   review (2026-10-06: "lose the border around the mini board") — so the side view's lines never run
 *   under the little drawing while nothing frames it; on every theme the ground matches the panel.
 * - `pointer-events-none`: it is a picture, so it never takes a click, a drag or a long press meant
 *   for the drawing beneath it.
 * - 43% of the panel's width (at most 432 dots) nose-left; 54% of its height (at most 540) nose-up,
 *   standing in the free column beside the upright side view — 20% up from the 36% / 45% it first
 *   shipped at, at the founder's review (2026-10-06: "make it 20% bigger"). Inside the plate a
 *   `relative` box carries the frame's own aspect ratio, so the drawing fills it with no wasted plate.
 * - On a very wide, short window it may overlap the side view's nose-tip card, the way the toolbar
 *   may overlap the top-right. That is accepted; it is what the toggle is for.
 * - Fallback if a browser ever collapses the nose-up box's width (its width comes from its height
 *   through `aspect-ratio`, inside a plate that shrinks to fit): put the size class and the inline
 *   aspect ratio on the plate itself instead, accepting a few dots of letterbox from its padding.
 */
export function TopViewInset(props: RockerTopViewProps) {
  const vertical = props.orientation === "vertical";
  const frame = topViewFrame(props.topView, props.length, props.orientation);
  return (
    <div
      data-top-view-inset
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-10 bg-surf-ground p-1",
        vertical ? "h-[54%] max-h-[540px]" : "w-[43%] max-w-[432px]",
      )}
    >
      <div
        className={cn("relative", vertical ? "h-full" : "w-full")}
        style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
      >
        <RockerTopView {...props} />
      </div>
    </div>
  );
}
