/**
 * Live SVG outline viewer, ported from the prototype's render math
 * (reference/project/Template.dc.html lines 651-728) but computed in
 * millimetres and converted to inches only where the prototype's own scale
 * math expects inches.
 *
 * All SVG geometry is rendered through JSX attributes holding numbers
 * computed from lib/geometry — never string-built markup, never
 * `dangerouslySetInnerHTML`, no `document.write`/`window.open` (threat
 * T-QO-01; the prototype's print paths are out of scope for this screen).
 *
 * The callout system (chips, output rail, reference lines) implements the grammar locked in
 * `.planning/sketches/` 001-004: nothing inside the outline but faint lines, computed values read
 * out to the shared right-hand rail, and every input a named chip in the left gutter. All labels
 * are SVG `<text>` — there is no absolutely-positioned HTML overlay. Rails/gutters are canonical
 * constants imported from `components/viewer/callout-primitives.tsx`, never invented per call.
 */

import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import {
  BOARD_LENGTH_RANGE_IN,
  WIDEPOINT_WIDTH_RANGE_IN,
  type OutlineSpec,
} from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import type { OutlineDragPoint, OutlineDragTarget } from "@/lib/geometry/outline-drag";
import { outlineDragPoints, solveOutlineDrag } from "@/lib/geometry/outline-drag";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { sampleOutline } from "@/lib/geometry/outline";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import {
  CalloutChip,
  OUTLINE_CHIP_HEIGHT,
  OutputRail,
  outlineViewFrame,
  CalloutSizeProvider,
  UNPINNED_CALLOUT_SIZES,
  pinnedCalloutSizes,
  useSvgFitScale,
} from "@/components/viewer/callout-primitives";

const VIEW_W = 340;
const VIEW_H = 620;
const PAD_Y = 24;
/** The board's own historic half-width bound (from the centreline), used only when the callout
 * system is hidden entirely (`hideCallouts`) — this keeps preset-card thumbnails pixel-identical
 * to their pre-callout-system rendering; nothing about the board's own coordinate space changed. */
const LEGACY_MAX_HALF_WIDTH_PX = VIEW_W / 2 - 30;
/** Breathing room left either side of the board inside `fixedFrame`, in view units. */
const CROP_PAD_X = 14;

/**
 * Half the `fixedFrame` viewBox, in view units — the widest half-width any board can DRAW at.
 *
 * Note which extreme this is taken from. The per-board scale fits the board to the view's height,
 * so it is highest for the SHORTEST board; the widest thing ever rendered is therefore the
 * shortest-and-widest board, not the widest one. Sizing from `max` length instead would produce a
 * frame that a 5'0" x 25" board overflows.
 */
const FIXED_FRAME_HALF_W =
  (WIDEPOINT_WIDTH_RANGE_IN.max / 2) *
    ((VIEW_H - PAD_Y * 2) / BOARD_LENGTH_RANGE_IN.min) +
  CROP_PAD_X;
/** Vertical gap between the Widepoint chip and the leaderless WP Offset chip stacked beneath it. */
const CHIP_STACK_GAP = 6;
/** Which rail the construction overlay draws on: -1 is the left, the input side (see the overlay
 * build below). Negative because `pxX` puts positive half-widths on the right. */
const CONSTRUCTION_SIDE = -1;
/**
 * Drag-handle and knot sizing, in CSS pixels.
 *
 * A grab handle is a UI affordance, not board geometry, so it holds a constant on-screen size
 * rather than scaling with the drawing — the same reasoning that pinned the callout text. At
 * unit sizes a handle is a different physical size in every window, and a hit target that
 * changes size with the window is a usability problem, not only a cosmetic one. Divided by the
 * live fit scale at render.
 */
const DRAG_TARGET_OUTER_PX = 7;
const DRAG_TARGET_RING_PX = 1.6;
const DRAG_TARGET_CORE_PX = 2.6;
/** Fixed reference knots — deliberately plain, so only grabbable points look grabbable. */
const KNOT_DOT_PX = 3;
/** Invisible grab radius: comfortably larger than the drawn target, for a thumb as well as a mouse. */
const DRAG_HIT_PX = 15;
/** How far the static stringer/centreline overhangs the board's own tip/tail — a drafting nicety
 * (sketch 004's reference render), not load-bearing geometry. */
const STRINGER_OVERHANG = 8;

interface OutlineViewerProps {
  geometry: OutlineGeometry;
  outline: OutlineSpec;
  showConstruction: boolean;
  /** The calculated fin marks, drawn on the template as one accent line per fin from trailing to
   * leading edge, with a dot at each end (Template.dc.html lines 178-182). Optional so the
   * viewer still renders standalone before fins are wired up. */
  finMarks?: FinMark[];
  /** Thumbnail-scale-only display sizing used by the setup screen's preset cards
   * (components/setup/preset-card.tsx): when true, suppresses the entire callout system (chips,
   * output rail, reference lines, widepoint dots), leaving the SVG board outline path,
   * construction lines, and fin marks untouched, and keeps the board's original tight viewBox so
   * the thumbnail's scale/position never changes. Defaults to `false`, every existing screen's
   * unchanged callout and station-line overlay. */
  hideCallouts?: boolean;
  /** Outline-editor-only display gate (components/outline/outline-editor.tsx): when true, skips
   * drawing the calculated fin-mark lines/dots on the board outline, leaving the outline curve,
   * callouts, and construction lines untouched. Fin marks are still relevant on the printed
   * template (components/summary/board-summary.tsx) and the setup-screen thumbnails, so this is
   * an additive per-consumer gate, not a change to `finMarksSvg` itself. Defaults to `false`. */
  hideFinMarks?: boolean;
  /**
   * Framing gate for the `hideCallouts` path, used by the order form's template window
   * (components/summary/order-form.tsx): replaces the 340-unit thumbnail frame with one sized from
   * the board RANGE (`lib/geometry/board.ts`) — wide enough for any board the editor can produce,
   * and no wider.
   *
   * Two problems, one frame. The thumbnail frame is mostly empty air: a 19" board draws 151 units
   * inside 340, so 55% of the width is padding, and since `preserveAspectRatio="xMidYMid meet"`
   * fits the whole frame, padding included, the order form's board came out at 43% of the height it
   * had available. Cropping to the board's own width fixed that but introduced a second problem —
   * the frame then changed shape with every board, so the printed window resized itself around
   * whichever board happened to be loaded.
   *
   * A range-sized frame is fixed. The board's own scale is untouched (it still fits the view's
   * height, so every board prints as large as the window allows); what stops moving is the window
   * around it. A narrower or shorter board simply leaves more blank paper inside the frame — which
   * on the order form is the space the colour design is drawn in.
   *
   * Only meaningful with `hideCallouts` — the callout frame has its own derivation, and the
   * callouts need that width. Defaults to `false`, every existing consumer's unchanged framing.
   */
  fixedFrame?: boolean;
  /**
   * Draws the faint interior lines — stringer, mid-length centreline, the nose and tail 12"
   * stations, and the widepoint station with its two rail knots — even when `hideCallouts` is on.
   *
   * Those lines and the callouts are separate things that happened to share one gate, because
   * until now every consumer wanted both or neither. The order form wants the lines without the
   * callouts: it carries its dimensions in their own row, but a shaper marking a blank still needs
   * to see where the stations fall. Redundant when callouts are shown (they are drawn anyway);
   * defaults to `false`, so the preset-card thumbnails stay bare.
   */
  showStationLines?: boolean;
  /** Editor-screen display gate: when true, callout text and chips hold a constant on-screen
   * size (CALLOUT_PX) instead of scaling with the drawing, by countering the svg's fit scale.
   * The board itself always scales — a template cannot fake proportion — but a dimension label
   * is UI, and at unit sizes the same callout measured 18.4px here and 23.9px on the fin
   * viewer at one viewport. Off by default so the Summary's cards, which render this viewer at
   * roughly half scale into a small cell, keep their own proportional sizing. */
  pinCalloutText?: boolean;
  /**
   * Direct manipulation, outline-editor only: called with the spec fields a dragged control point
   * implies, on every pointer move. Omitted (Summary, preset cards) means no hit targets and no
   * handlers at all — those consumers render exactly what they rendered before.
   *
   * Only reachable while `showConstruction` is on, since the control points are the construction
   * overlay. The solve itself lives in `lib/geometry/outline-drag.ts`; this component only converts
   * screen coordinates into board coordinates and passes the result up.
   */
  onOutlineDrag?: (patch: Partial<OutlineSpec>) => void;
}

/**
 * The drawing's scale and frame, for a given board.
 *
 * Exported because the containers that host this SVG have to size themselves to the same frame —
 * a wide board produces a wider viewBox (see `outlineViewFrame`), so a hardcoded aspect ratio would
 * letterbox or squash it. One definition, called by the component and by its consumers.
 *
 * **Two different fits, deliberately.** The `hideCallouts` path (preset-card thumbnails) keeps the
 * original two-way fit so those renders stay pixel-identical. Every other render fits on LENGTH
 * alone and lets the frame widen instead: fitting on width too meant a 25" board drew 24% shorter
 * than a 19" one, because the gutters' share of a fixed frame grew with the board.
 */
export function outlineViewMetrics(geometry: OutlineGeometry, hideCallouts = false) {
  const lengthIn = mmToInches(geometry.length);
  const cwIn = mmToInches(geometry.halfWidePointWidth);
  const centerlineX = VIEW_W / 2;
  const lengthFitScale = (VIEW_H - PAD_Y * 2) / lengthIn;
  const scale = hideCallouts
    ? Math.min(LEGACY_MAX_HALF_WIDTH_PX / cwIn, lengthFitScale)
    : lengthFitScale;
  return {
    lengthIn,
    centerlineX,
    scale,
    frame: outlineViewFrame(cwIn * scale, centerlineX),
    tailPy: VIEW_H - PAD_Y,
    tipPy: PAD_Y,
  };
}

export function OutlineViewer({
  geometry,
  outline,
  showConstruction,
  finMarks = [],
  hideCallouts = false,
  hideFinMarks = false,
  fixedFrame = false,
  showStationLines = false,
  onOutlineDrag,
  pinCalloutText = false,
}: OutlineViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** Which control point the active gesture owns, if any. A ref, not state: it changes on
   * pointerdown and is read on pointermove, and re-rendering for it would be a wasted pass. */
  const draggingRef = useRef<OutlineDragTarget | null>(null);
  const { lengthIn, centerlineX, scale, frame, tailPy, tipPy } = outlineViewMetrics(
    geometry,
    hideCallouts,
  );
  const lenToY = (stationIn: number) => tailPy - stationIn * scale;
  const pxX = (halfWidthIn: number) => centerlineX + halfWidthIn * scale;

  const rightPx = geometry.points.map((p) => [
    pxX(mmToInches(p.halfWidth)),
    lenToY(mmToInches(p.station)),
  ]);
  const leftPx = geometry.points
    .slice()
    .reverse()
    .map((p) => [pxX(-mmToInches(p.halfWidth)), lenToY(mmToInches(p.station))]);
  const centerCloseIn = mmToInches(geometry.centreCloseStation);
  const centerClosePx = `${pxX(0).toFixed(2)} ${lenToY(centerCloseIn).toFixed(2)}`;
  const outlinePath = `M ${rightPx.map((p) => p.map((v) => v.toFixed(2)).join(" ")).join(" L ")} L ${leftPx
    .map((p) => p.map((v) => v.toFixed(2)).join(" "))
    .join(" L ")} L ${centerClosePx} Z`;

  const xAtStationIn = (stationIn: number) =>
    mmToInches(sampleOutline(geometry, inchesToMm(stationIn)));

  const wpYIn = mmToInches(geometry.widePointStation);
  const wpHalfWidthIn = xAtStationIn(wpYIn);
  const midHalfWidthIn = xAtStationIn(lengthIn / 2);
  const noseStationIn = lengthIn - 12;
  const tailStationIn = 12;
  const noseHalfWidthIn = xAtStationIn(noseStationIn);
  const tailHalfWidthIn = xAtStationIn(tailStationIn);

  const centerWidthAtStationIn = 2 * midHalfWidthIn;
  const wpFromCenterIn = wpYIn - lengthIn / 2;
  const wpOffsetText =
    Math.abs(wpFromCenterIn) < 1e-9
      ? "At center"
      : `${formatInchesFraction(inchesToMm(Math.abs(wpFromCenterIn)))} ${
          wpFromCenterIn > 0 ? "forward" : "back"
        }`;

  // Ported from the prototype's finMarksSvg (Template.dc.html lines 777-779): a line from
  // (pxX(lateral), lenToY(offTail)) to (pxX(leadingLateral), lenToY(leadingOffTail)) per fin mark.
  const finMarksSvg = finMarks.map((m) => ({
    x1: pxX(mmToInches(m.lateral)),
    y1: lenToY(mmToInches(m.offTail)),
    x2: pxX(mmToInches(m.leadingLateral)),
    y2: lenToY(mmToInches(m.leadingOffTail)),
  }));

  const lengthCalloutText = `${formatFeetInches(geometry.length)} (${formatInchesFraction(geometry.length)})`;

  // The construction overlay draws on the INPUT side only — the left rail, where the input chips
  // already live (outputs read out to the right rail). The board is symmetric, so a mirrored copy
  // showed nothing the left one did not, and two grabbable dots per control is two places to grab
  // for one effect. CONSTRUCTION_SIDE is negative because pxX puts positive half-widths on the
  // right.
  // Knots 0 and 2 (tail pod, nose tip) are fixed anchors; knot 1 (widepoint) and every
  // handle end are draggable and get the target treatment below instead. Only the fixed
  // pair is drawn as a plain dot, so a round target always means "you can grab this" and a
  // plain dot never does — previously all seven looked identical and only five moved.
  const FIXED_KNOT_INDICES = [0, 2];
  const constructionDots: { cx: number; cy: number; color: string }[] = [];
  const constructionLines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];

  FIXED_KNOT_INDICES.forEach((i) => {
    const k = geometry.knots[i];
    if (!k) return;
    constructionDots.push({
      cx: pxX(CONSTRUCTION_SIDE * mmToInches(k.point.y)),
      cy: lenToY(mmToInches(k.point.x)),
      color: "var(--outline-ink)",
    });
  });
  geometry.handles.forEach((h) => {
    constructionLines.push({
      x1: pxX(CONSTRUCTION_SIDE * mmToInches(h.from.y)),
      y1: lenToY(mmToInches(h.from.x)),
      x2: pxX(CONSTRUCTION_SIDE * mmToInches(h.to.y)),
      y2: lenToY(mmToInches(h.to.x)),
      color: "var(--outline-construction)",
    });
  });

  // Grabbable points, in the same left-side px space as the dots above. Only built when a drag
  // handler is present, so every other consumer renders exactly what it did before.
  const dragTargets = onOutlineDrag
    ? outlineDragPoints(geometry).map((d) => ({
        target: d.target,
        cx: pxX(CONSTRUCTION_SIDE * mmToInches(d.point.halfWidth)),
        cy: lenToY(mmToInches(d.point.station)),
      }))
    : [];

  /** Screen point -> board coordinates: undo the SVG transform, then invert pxX/lenToY. */
  function toBoardPoint(event: ReactPointerEvent<SVGElement>): OutlineDragPoint | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {
      station: inchesToMm((tailPy - local.y) / scale),
      // Negated back off the left side, so the solver always sees a positive half-width.
      halfWidth: inchesToMm(CONSTRUCTION_SIDE * ((local.x - centerlineX) / scale)),
    };
  }

  function handleDragMove(event: ReactPointerEvent<SVGElement>) {
    if (!draggingRef.current || !onOutlineDrag) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    // Every move writes the spec and the redraw arrives back through props — the viewer keeps no
    // copy of the geometry, which is what keeps the sliders in step with the drawing mid-drag.
    onOutlineDrag(solveOutlineDrag(geometry, draggingRef.current, boardPoint));
  }

  function handleDragStart(target: OutlineDragTarget, event: ReactPointerEvent<SVGElement>) {
    if (!onOutlineDrag) return;
    event.preventDefault();
    draggingRef.current = target;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragEnd(event: ReactPointerEvent<SVGElement>) {
    draggingRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // Inputs: left gutter chips. Length sits at the nose tip; Widepoint leaders to the rail at its
  // own station; WP Offset carries no leader (grouped beneath Widepoint — sketch 004); Tail Block
  // only exists for tail shapes that actually have one (pin/round have none).
  const lengthChipY = tipPy;
  const widepointChipY = lenToY(wpYIn);
  const wpOffsetChipY = widepointChipY + OUTLINE_CHIP_HEIGHT + CHIP_STACK_GAP;
  const tailPodStationIn = mmToInches(geometry.tailPodStation);
  const tailBlockChipY = lenToY(tailPodStationIn);
  const halfTailBlockWidthIn = mmToInches(geometry.halfTailBlockWidth);
  const tailBlockValue = `${formatInchesFraction(mm(geometry.halfTailBlockWidth * 2))} wide`;

  // The fixed frame, centred on the stringer. Constant for every board, by construction.
  const fixedMinX = centerlineX - FIXED_FRAME_HALF_W;
  const fixedWidth = 2 * FIXED_FRAME_HALF_W;

  const viewBox = hideCallouts
    ? fixedFrame
      ? `${fixedMinX.toFixed(2)} 0 ${fixedWidth.toFixed(2)} ${VIEW_H}`
      : `0 0 ${VIEW_W} ${VIEW_H}`
    : `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`;

  const vbW = hideCallouts ? (fixedFrame ? fixedWidth : VIEW_W) : frame.width;
  const vbH = hideCallouts ? VIEW_H : frame.height;
  const fitScale = useSvgFitScale(svgRef, vbW, vbH);
  const calloutSizes = pinCalloutText ? pinnedCalloutSizes(fitScale) : UNPINNED_CALLOUT_SIZES;
  /** User units per CSS pixel — what the px-denominated handle sizes above are drawn in. */
  const handleUnit = fitScale > 0 ? 1 / fitScale : 1;

  return (
    <CalloutSizeProvider value={calloutSizes}>
    <svg
      ref={svgRef}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      // No width/height attributes: they give the svg an intrinsic size, which makes a percentage
      // width resolve the height from the viewBox ratio instead of from the box it is in. On the
      // Summary that turned the Template card into the tallest thing on the sheet — it demanded
      // 809px inside a 585px cell, and since the grid's `fr` rows go content-proportional when the
      // grid sizes itself, that one card inflated every other row and forced the printed sheet down
      // to 70% of the page width. Filling the box and letting `meet` scale the drawing inside it
      // keeps the card honest about how much height it needs, which is none in particular.
      className="absolute inset-0 block h-full w-full"
      onPointerMove={onOutlineDrag ? handleDragMove : undefined}
      onPointerUp={onOutlineDrag ? handleDragEnd : undefined}
      onPointerCancel={onOutlineDrag ? handleDragEnd : undefined}
    >
      <path d={outlinePath} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={2} />

      {(!hideCallouts || showStationLines) && (
        <>
          {/* Interior: faint lines only, never text (sketch 004). Stringer and the mid-length
              centreline are both static, so they share one dash; nose/tail 12" stations are
              derived, so they get the shorter uniform dash. The widepoint is an INPUT, so its
              station line carries the widepoint colour and its own dotted dash — on a board whose
              widepoint sits near centre the two lines are only a few pixels apart, so colour, not
              dash, is what actually tells them apart. */}
          <line
            x1={centerlineX}
            y1={tipPy - STRINGER_OVERHANG}
            x2={centerlineX}
            y2={tailPy + STRINGER_OVERHANG}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-stringer-dash)"
          />
          <line
            x1={pxX(-midHalfWidthIn)}
            y1={lenToY(lengthIn / 2)}
            x2={pxX(midHalfWidthIn)}
            y2={lenToY(lengthIn / 2)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-stringer-dash)"
          />
          <line
            x1={pxX(-noseHalfWidthIn)}
            y1={lenToY(noseStationIn)}
            x2={pxX(noseHalfWidthIn)}
            y2={lenToY(noseStationIn)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-station-dash)"
          />
          <line
            x1={pxX(-tailHalfWidthIn)}
            y1={lenToY(tailStationIn)}
            x2={pxX(tailHalfWidthIn)}
            y2={lenToY(tailStationIn)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-station-dash)"
          />
          <line
            x1={pxX(-wpHalfWidthIn)}
            y1={lenToY(wpYIn)}
            x2={pxX(wpHalfWidthIn)}
            y2={lenToY(wpYIn)}
            stroke="var(--outline-widepoint-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-widepoint-dash)"
          />
          <circle cx={pxX(-wpHalfWidthIn)} cy={lenToY(wpYIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
          <circle cx={pxX(wpHalfWidthIn)} cy={lenToY(wpYIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
        </>
      )}

      {showConstruction && (
        <>
          {constructionLines.map((cl, i) => (
            <line key={i} x1={cl.x1} y1={cl.y1} x2={cl.x2} y2={cl.y2} stroke={cl.color} strokeWidth={1.5} />
          ))}
          {constructionDots.map((dt, i) => (
            <circle key={i} cx={dt.cx} cy={dt.cy} r={KNOT_DOT_PX * handleUnit} fill={dt.color} />
          ))}
          {/* The drag targets themselves: board-fill disc, accent ring, orange core. Three
              concentric parts so a grabbable point reads as a target rather than as one more
              dot on the drawing. pointer-events:none throughout — the transparent hit circles
              below own every pointer interaction, and a visual that swallowed a pointerdown
              would break the drag at the exact spot the shaper aimed for. */}
          {dragTargets.map((d) => (
            <g key={`t-${d.target}`} pointerEvents="none">
              <circle
                cx={d.cx}
                cy={d.cy}
                r={DRAG_TARGET_OUTER_PX * handleUnit}
                fill="var(--outline-board-fill)"
                stroke="var(--color-surf-accent-cyan-ink)"
                strokeWidth={DRAG_TARGET_RING_PX * handleUnit}
              />
              <circle
                cx={d.cx}
                cy={d.cy}
                r={DRAG_TARGET_CORE_PX * handleUnit}
                fill="var(--color-surf-accent-orange)"
              />
            </g>
          ))}
          {/* Transparent grab areas, last so they sit above everything they cover.
              touch-action:none stops a touch drag scrolling the page instead of shaping the board. */}
          {dragTargets.map((d) => (
            <circle
              key={d.target}
              cx={d.cx}
              cy={d.cy}
              r={DRAG_HIT_PX * handleUnit}
              fill="transparent"
              className="cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={(event) => handleDragStart(d.target, event)}
            />
          ))}
        </>
      )}
      {!hideFinMarks &&
        finMarksSvg.map((fm, i) => (
          <g key={i}>
            <line
              x1={fm.x1}
              y1={fm.y1}
              x2={fm.x2}
              y2={fm.y2}
              stroke="var(--color-surf-accent-cyan-ink)"
              strokeWidth={2}
            />
            <circle cx={fm.x1} cy={fm.y1} r={3.5} fill="var(--outline-ink)" />
            <circle cx={fm.x2} cy={fm.y2} r={3.5} fill="var(--outline-ink)" />
          </g>
        ))}

      {!hideCallouts && (
        <>
          {/* Outputs: one shared right rail — the derived widths appear nowhere else on the
              Summary dashboard, so these stay even in compact mode. */}
          <OutputRail
            valueX={frame.outputValueX}
            edgeX={pxX(noseHalfWidthIn)}
            y={lenToY(noseStationIn)}
            value={formatInchesFraction(geometry.noseWidthAt12in)}
            station={'Nose @ 12"'}
          />
          <OutputRail
            valueX={frame.outputValueX}
            edgeX={pxX(midHalfWidthIn)}
            y={lenToY(lengthIn / 2)}
            value={formatInchesFraction(mm(inchesToMm(centerWidthAtStationIn)))}
            station="Centre"
          />
          <OutputRail
            valueX={frame.outputValueX}
            edgeX={pxX(tailHalfWidthIn)}
            y={lenToY(tailStationIn)}
            value={formatInchesFraction(geometry.tailWidthAt12in)}
            station={'Tail @ 12"'}
          />

          {/* Inputs: left gutter chips, each naming its own value (sketch 004). Shown in compact
              too — the Summary sheet is read at the blank, where the sidebar is not available, so
              the shaper needs the settings on the drawing itself. */}
          <>
              <CalloutChip
                x={frame.chipRightX}
                y={lengthChipY}
                name="LENGTH"
                value={lengthCalloutText}
                leaderToX={centerlineX}
              />
              <CalloutChip
                x={frame.chipRightX}
                y={widepointChipY}
                name="WIDEPOINT"
                value={formatInchesFraction(outline.widePointWidth)}
                nameColor="var(--outline-widepoint-knot)"
                leaderToX={pxX(-wpHalfWidthIn)}
              />
              <CalloutChip x={frame.chipRightX} y={wpOffsetChipY} name="WP OFFSET" value={wpOffsetText} />
              {!geometry.tailBlockPinned && (
                <CalloutChip
                  x={frame.chipRightX}
                  y={tailBlockChipY}
                  name="TAIL BLOCK"
                  value={tailBlockValue}
                  leaderToX={pxX(-halfTailBlockWidthIn)}
                />
              )}
          </>
        </>
      )}
    </svg>
    </CalloutSizeProvider>
  );
}
