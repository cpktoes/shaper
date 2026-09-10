"use client";

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
 *
 * Every measurement string drawn here reads through `lib/geometry/measure-display.ts` with the
 * shaper's chosen system (Phase 6, D-09) — this file never formats a value on its own. `system`
 * is read once via `useUnits()` and threaded as a plain argument into this file's own local
 * helpers, never added to `OutlineViewer`'s own props (which would ripple into `order-form.tsx`
 * and Phase 7's printed paths before they are ready for it).
 */

import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import {
  BOARD_LENGTH_RANGE_IN,
  WIDEPOINT_WIDTH_RANGE_IN,
  type OutlineSpec,
} from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import type { OutlineDragPoint, OutlineDragTarget } from "@/lib/geometry/outline-drag";
import {
  nearestOutlineDragTarget,
  outlineDragPoints,
  OUTLINE_DRAG_HIT_COARSE_PX,
  OUTLINE_DRAG_HIT_PX,
  solveOutlineDrag,
} from "@/lib/geometry/outline-drag";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { sampleOutline } from "@/lib/geometry/outline";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { formatDim, formatLength, formatSignedDim, stationLabel } from "@/lib/geometry/measure-display";
import { useUnits } from "@/components/units-provider";
import { useCoarsePointer } from "@/components/design/use-viewer-media";
import {
  nextSelection,
  remoteDragPoint,
  type DragSelectionEvent,
} from "@/components/viewer/drag-selection";
import {
  boardSection,
  placeReadoutClearOfBoard,
  type Rect as ReadoutRect,
} from "@/components/viewer/readout-placement";
import {
  CALLOUT_CHAR_PX,
  CALLOUT_PX,
  CalloutChip,
  CalloutChipFrame,
  MIN_PINNED_FIT_SCALE,
  OUTLINE_CHIP_HEIGHT,
  OutputRail,
  outlineViewFrame,
  CalloutSizeProvider,
  UNPINNED_CALLOUT_SIZES,
  pinnedCalloutSizes,
  useSvgClientSize,
  useSvgFitScale,
  ViewerOrientationProvider,
  type ViewerOrientation,
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
/** The picked-point halo ring (D-07, 260909-ktq): one extra concentric circle, drawn only around
 * whichever point is currently picked, in the same accent stroke the drag-target ring already
 * uses. Only ever drawn on a touch pick, so a mouse-driven desktop screenshot cannot change. */
const DRAG_SELECTED_HALO_PX = 11;
/** Fixed reference knots — deliberately plain, so only grabbable points look grabbable. */
const KNOT_DOT_PX = 3;
/**
 * The drag readout chip (D-17), in CSS pixels: the small card that reads a slider row back while
 * a finger drags the point that drives it. `READOUT_GAP_PX` is the standing clearance between the
 * touched point and the chip's own bottom edge, so the chip never sits under the fingertip;
 * `READOUT_ROW_PX`/`READOUT_PAD_PX` size the card to however many driven fields the touched
 * target owns (one or two).
 */
const READOUT_GAP_PX = 24;
const READOUT_ROW_PX = 18;
const READOUT_PAD_PX = 8;
/** How far the static stringer/centreline overhangs the board's own tip/tail — a drafting nicety
 * (sketch 004's reference render), not load-bearing geometry. */
const STRINGER_OVERHANG = 8;

/**
 * Ceiling on a callout's rendered size, in SVG user units — the largest a chip or the output
 * text can ever draw at, across both sizing modes.
 *
 * `pinnedCalloutSizes` grows a pinned callout as the fit scale falls and floors that growth at
 * `MIN_PINNED_FIT_SCALE`, so evaluating it AT the floor gives the ceiling for a pinned viewer.
 * A viewer that does not pin draws `UNPINNED_CALLOUT_SIZES` instead, so the true bound is the
 * larger of the two.
 *
 * This MUST stay a module constant, evaluated once from `CALLOUT_PX` / `UNPINNED_CALLOUT_SIZES`
 * / `MIN_PINNED_FIT_SCALE`. The reach constants below size the horizontal frame, the frame feeds
 * `useSvgFitScale`, and the fit scale is what produces the live, render-time `calloutSizes` — so
 * sizing the frame from that live value would close the loop: frame -> fit scale -> callout size
 * -> frame, a resize feedback loop (threat T-VOT-04, still on the record). Measuring the
 * rendered content (`getBBox()`) and resizing the frame from the measurement has exactly the
 * same defect plus an extra measure-render pass, so it is not an alternative either.
 */
const MAX_CALLOUT_SIZES = (() => {
  const pinned = pinnedCalloutSizes(MIN_PINNED_FIT_SCALE);
  return {
    chipW: Math.max(pinned.chipW, UNPINNED_CALLOUT_SIZES.chipW),
    chipH: Math.max(pinned.chipH, UNPINNED_CALLOUT_SIZES.chipH),
    name: Math.max(pinned.name, UNPINNED_CALLOUT_SIZES.name),
    value: Math.max(pinned.value, UNPINNED_CALLOUT_SIZES.value),
  };
})();

/** Long-axis reach, in view units: rotated, `CalloutChip` centres its box on the anchor along
 * the board (`rectX = x - chipW / 2`), so a chip at an extreme station overhangs that station by
 * half a chip. */
const HORIZONTAL_CHIP_REACH = MAX_CALLOUT_SIZES.chipW / 2;
/** Short-axis reach past the output rail, in view units: `OutputRail` stacks its value line
 * `name * 1.15` above the anchor baseline in horizontal, and the value's own ascender rises
 * further from there. The ascender is bounded by the full font size — conservative by roughly a
 * quarter of a line, and cheap. */
const HORIZONTAL_OUTPUT_REACH = MAX_CALLOUT_SIZES.name * 1.15 + MAX_CALLOUT_SIZES.value;
/** Short-axis reach past the chip rail, in view units: a chip hangs a full `chipH` away from its
 * anchor, and the leaderless WP OFFSET chip sits a second row further out at
 * `chipH + CHIP_STACK_GAP`. */
const HORIZONTAL_CHIP_RAIL_REACH = 2 * MAX_CALLOUT_SIZES.chipH + CHIP_STACK_GAP;

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
  /**
   * Template-screen view state (see `components/outline/outline-editor.tsx`'s rotate button):
   * `"horizontal"` turns the whole drawing 90° so the board lies nose-left in the panel it
   * already occupies, driven by a click, never persisted. Defaults to `"vertical"`, which is
   * what makes the Summary sheet, the order form's template windows, the print path and the
   * preset-card thumbnails vertical BY CONSTRUCTION — none of them ever pass this prop — rather
   * than by a guard anyone could forget to add.
   */
  orientation?: ViewerOrientation;
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
  orientation = "vertical",
}: OutlineViewerProps) {
  const { system } = useUnits();
  const horizontal = orientation === "horizontal";
  const coarsePointer = useCoarsePointer();
  const svgRef = useRef<SVGSVGElement>(null);
  /** The content group carrying the rotation, in horizontal — see `toBoardPoint` below for why
   * the drag matrix must be read off this instead of the SVG root. */
  const contentRef = useRef<SVGGElement>(null);
  /** The active gesture, if any. A ref, not state: it changes on pointerdown and is read on
   * pointermove, and re-rendering for it would be a wasted pass.
   *
   * `remote` and `pointStart` are what let a touch shape a point from across the drawing
   * (260909-ktq, D-03): `pointStart` is the picked point's own board position at touch-down —
   * never re-read live — and `fingerStart`/`fingerClientStart` are the finger's own board and CSS
   * pixel position at that same instant. `maxTravelPx` is the gesture's running distance travelled
   * in CSS pixels, read once on lift to tell a tap on empty canvas from a small remote drag
   * (D-09). A mouse or pen only ever sets `target`/`pointStart`/`fingerStart`/`fingerClientStart`
   * with `remote: false` — it never becomes a remote gesture (PHON-05). */
  const draggingRef = useRef<{
    target: OutlineDragTarget;
    remote: boolean;
    pointStart: OutlineDragPoint;
    fingerStart: OutlineDragPoint;
    fingerClientStart: { x: number; y: number };
    maxTravelPx: number;
  } | null>(null);
  /** Which point a TOUCH gesture is dragging, if any — state, not a ref, because the drag
   * readout chip (09-07 Task 2) has to re-render when this starts and stops. Stays `null` for a
   * mouse or pen at every viewport width (D-17, PHON-05): only `handlePointerDown`'s own
   * `pointerType === "touch"` check ever sets it. */
  const [touchDragTarget, setTouchDragTarget] = useState<OutlineDragTarget | null>(null);
  /** Which point is PICKED (260909-ktq, D-02): set by a touch tap or a touch drag-start, and it
   * survives a lift — that is what lets a shaper drag a point directly once and then keep shaping
   * it from anywhere else on the drawing. Drives the halo ring and the `data-selected` hook. Stays
   * `null` for a mouse or pen at every viewport width (PHON-05). */
  const [selectedTarget, setSelectedTarget] = useState<OutlineDragTarget | null>(null);
  /** The finger's own live board position during a touch gesture (260909-ktq, D-06) — the drag
   * readout chip's anchor, so the card follows the THUMB rather than the point. `null` whenever no
   * touch gesture is live. */
  const [touchFingerBoard, setTouchFingerBoard] = useState<OutlineDragPoint | null>(null);
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
      : `${formatDim(inchesToMm(Math.abs(wpFromCenterIn)), system)} ${
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

  // Imperial keeps the dual feet-and-inches / total-inches form; Metric has no equivalent
  // duality, so it reads a single centimetre figure. Composed from formatLength/formatDim
  // rather than calling the raw imperial units.ts formatters directly — both still produce
  // exactly the same imperial strings internally, but routing through the display boundary
  // keeps this file out of the banned-formatter list the units-isolation ledger checks.
  const lengthCalloutText =
    system === "metric"
      ? formatLength(geometry.length, system)
      : `${formatLength(geometry.length, "imperial")} (${formatDim(geometry.length, "imperial")})`;

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
  // handler is present, so every other consumer renders exactly what it did before. Kept in its
  // raw (board-mm) shape too — `dragPointsAt` — so the delegated pick below and this view-space
  // mapping read the exact same five points, never two separately-derived copies.
  const dragPointsAt = onOutlineDrag ? outlineDragPoints(geometry) : [];
  const dragTargets = dragPointsAt.map((d) => ({
    target: d.target,
    cx: pxX(CONSTRUCTION_SIDE * mmToInches(d.point.halfWidth)),
    cy: lenToY(mmToInches(d.point.station)),
  }));

  /** Screen point -> board coordinates: undo the SVG transform, then invert pxX/lenToY.
   *
   * The matrix comes off the content group, not the SVG root, falling back to the root only if
   * the group ref is not yet attached. A root `getScreenCTM()` stops at the viewport and does
   * not include a child group's own transform — so in horizontal it would miss the `rotate(-90)`
   * entirely and a drag would solve against the wrong axis. Read off the group, the point comes
   * back in the canonical (vertical, unrotated) drawing space the pxX/lenToY inversion below was
   * written for, so that inversion is correct — and unchanged — in both orientations. */
  function toBoardPoint(event: ReactPointerEvent<SVGElement>): OutlineDragPoint | null {
    const el = contentRef.current ?? svgRef.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {
      station: inchesToMm((tailPy - local.y) / scale),
      // Negated back off the left side, so the solver always sees a positive half-width.
      halfWidth: inchesToMm(CONSTRUCTION_SIDE * ((local.x - centerlineX) / scale)),
    };
  }

  /**
   * Every move writes the spec and the redraw arrives back through props — the viewer keeps no
   * copy of the geometry, which is what keeps the sliders in step with the drawing mid-drag.
   *
   * A DIRECT gesture (thumb, mouse, or pen on the point itself) passes the finger's own board
   * point straight through, exactly as it always has. A REMOTE gesture (260909-ktq, D-03: a touch
   * picked a point, then moved from elsewhere on the drawing) instead asks `remoteDragPoint` for
   * the picked point's OWN board position at touch-down plus the finger's travel since then — never
   * the finger's own live position, which would teleport the point onto wherever the thumb happens
   * to be. `remoteDragPoint` is axis-neutral, so the mapping into/out of it is `{x: station, y:
   * halfWidth}` here and `{x: station, y: height}` in the rocker viewer.
   */
  function handleDragMove(event: ReactPointerEvent<SVGElement>) {
    const gesture = draggingRef.current;
    if (!gesture || !onOutlineDrag) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;

    gesture.maxTravelPx = Math.max(
      gesture.maxTravelPx,
      Math.hypot(
        event.clientX - gesture.fingerClientStart.x,
        event.clientY - gesture.fingerClientStart.y,
      ),
    );

    const dragTo = gesture.remote
      ? (() => {
          const moved = remoteDragPoint(
            { x: gesture.pointStart.station, y: gesture.pointStart.halfWidth },
            { x: gesture.fingerStart.station, y: gesture.fingerStart.halfWidth },
            { x: boardPoint.station, y: boardPoint.halfWidth },
          );
          return { station: mm(moved.x), halfWidth: mm(moved.y) };
        })()
      : boardPoint;

    onOutlineDrag(solveOutlineDrag(geometry, gesture.target, dragTo));

    // The readout chip (D-06/D-17) follows the finger, so this is set on every move a touch makes
    // — direct or remote — and never for a mouse or pen (PHON-05).
    if (event.pointerType === "touch") setTouchFingerBoard(boardPoint);
  }

  /**
   * The one delegated drag-start pick (D-15, RESEARCH.md Pitfall 2): a press anywhere on the
   * drawing converts to board coordinates and asks `nearestOutlineDragTarget` which of the five
   * points, if any, is within reach — never which hit-circle happened to catch the browser's own
   * (paint-order) hit-test. One pointer path for both a mouse and a touch (D-16): a gesture starts
   * on pointer-down with no movement threshold, because the drawing is pinned inside the phone
   * shell and can never be mistaken for a page scroll.
   *
   * A mouse or pen (260909-ktq, PHON-05) keeps today's path byte-for-byte: no hit, nothing
   * happens; a hit starts a direct drag exactly as it always has. It never reaches `nextSelection`
   * and never sets `selectedTarget` or `touchFingerBoard` — picking, the halo ring and the readout
   * chip following the finger are touch-only.
   *
   * A touch asks `nextSelection` what the press means: a hit always picks that point and starts a
   * direct drag (D-02, D-04 — even mid-pick, a newly touched point wins); empty canvas with a
   * point already picked starts a remote drag on it (D-03); empty canvas with nothing picked does
   * nothing at all; and takes no pointer capture — exactly as it always has (D-05).
   */
  function handlePointerDown(event: ReactPointerEvent<SVGElement>) {
    if (!onOutlineDrag) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    const hit = nearestOutlineDragTarget(dragPointsAt, boardPoint, hitRadiusMm);

    if (event.pointerType !== "touch") {
      if (!hit) return;
      event.preventDefault();
      draggingRef.current = {
        target: hit,
        remote: false,
        pointStart: boardPoint,
        fingerStart: boardPoint,
        fingerClientStart: { x: event.clientX, y: event.clientY },
        maxTravelPx: 0,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const decision = nextSelection({ selected: selectedTarget, mode: "idle" }, { type: "touchDown", hit });
    if (decision.mode === "idle" || decision.selected === null) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const remote = decision.mode === "remote";
    // A remote gesture's `pointStart` is the picked target's own entry in `dragPointsAt` — the
    // same array the pick itself was made against, so there is one source of truth for where the
    // points are. A direct gesture's `pointStart` is unused (`dragTo` takes the finger's live
    // point in that branch of `handleDragMove`), so the finger's own board point stands in for it.
    const pointStart = remote
      ? (dragPointsAt.find((d) => d.target === decision.selected)?.point ?? boardPoint)
      : boardPoint;
    draggingRef.current = {
      target: decision.selected,
      remote,
      pointStart,
      fingerStart: boardPoint,
      fingerClientStart: { x: event.clientX, y: event.clientY },
      maxTravelPx: 0,
    };
    setSelectedTarget(decision.selected);
    setTouchDragTarget(decision.selected);
    setTouchFingerBoard(boardPoint);
  }

  /**
   * Split from a genuine lift (260909-ktq): a lift asks `nextSelection` whether the gesture was a
   * tap on empty space (releases the pick, D-05) or a drag (the pick survives, D-02); a cancelled
   * gesture always leaves the pick exactly where it was (D-05). Both clear the live gesture,
   * the readout chip's own state, and pointer capture exactly as before. A mouse or pen never
   * reaches `nextSelection` (PHON-05).
   */
  function handleDragEnd(event: ReactPointerEvent<SVGElement>, cancelled: boolean) {
    const gesture = draggingRef.current;
    if (gesture && event.pointerType === "touch") {
      const dragEvent: DragSelectionEvent<OutlineDragTarget> = cancelled
        ? { type: "cancel" }
        : { type: "touchUp", travelPx: gesture.maxTravelPx };
      const result = nextSelection(
        { selected: selectedTarget, mode: gesture.remote ? "remote" : "direct" },
        dragEvent,
      );
      setSelectedTarget(result.selected);
    }
    draggingRef.current = null;
    if (touchDragTarget !== null) setTouchDragTarget(null);
    if (touchFingerBoard !== null) setTouchFingerBoard(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The readout chip's own words (D-17): `SliderRow`'s own `label — displayValue` composition
   * (`components/design/slider-row.tsx`) for the field or fields the touched target drives, read
   * off the live `outline` spec (never the raw pointer position), so a point clamped against
   * `OUTLINE_DRAG_LIMITS` shows the clamped value, not a stale pre-clamp number. The widepoint is
   * the one exception to "only the fields this target owns" (`solveOutlineDrag` only returns
   * `widePointOffset` for it): the sidebar always shows Width grouped directly above Offset
   * (sketch 004), so the chip shows both, exactly as `outline-controls.tsx` does.
   */
  function outlineReadoutLines(target: OutlineDragTarget): { label: string; value: string }[] {
    switch (target) {
      case "widepoint":
        return [
          { label: "Width", value: formatDim(outline.widePointWidth, system) },
          { label: "Offset", value: formatSignedDim(outline.widePointOffset, system) },
        ];
      case "tailRailHandle":
        return [{ label: "Tail Rail", value: `${outline.tailRailLength}%` }];
      case "noseRailHandle":
        return [{ label: "Nose Rail", value: `${outline.noseRailLength}%` }];
      case "tailHandle":
        // A diamond tail's angle is pinned (its slider is greyed out and `solveOutlineDrag` never
        // writes it), so the card names only the field this drag can actually change.
        return geometry.tailAnglePinned
          ? [{ label: "Fullness", value: `${outline.tailFullness}%` }]
          : [
              { label: "Tail Angle", value: `${outline.tailAngle}°` },
              { label: "Fullness", value: `${outline.tailFullness}%` },
            ];
      case "noseHandle":
        return [
          { label: "Nose Angle", value: `${outline.noseAngle}°` },
          { label: "Fullness", value: `${outline.noseFullness}%` },
        ];
    }
  }

  /**
   * A point drawn in this viewer's canonical (pre-rotation) space, mapped to where it lands in
   * the outer, rendered viewBox space — the exact inverse of the content group's own
   * `rotate(-90)` in horizontal (identity in vertical). `rotate(-90)` (about the origin, so this
   * is a pure linear map with no translation to account for) sends canonical `(x, y)` to rendered
   * `(y, -x)` — see the file header's own note on the content group above. Used only to place the
   * readout chip, which is drawn OUTSIDE the rotated content group (a plain sibling `<g>`) so its
   * text is always screen-upright with no counter-rotation of its own to get wrong.
   */
  function toViewBoxPoint(x: number, y: number): { x: number; y: number } {
    return horizontal ? { x: y, y: -x } : { x, y };
  }

  // Inputs: left gutter chips. Length sits at the nose tip; Widepoint leaders to the rail at its
  // own station; WP Offset carries no leader (grouped beneath Widepoint — sketch 004); Tail Block
  // only exists for tail shapes that actually have one (pin/round have none).
  const lengthChipY = tipPy;
  const widepointChipY = lenToY(wpYIn);
  const tailPodStationIn = mmToInches(geometry.tailPodStation);
  const tailBlockChipY = lenToY(tailPodStationIn);
  const halfTailBlockWidthIn = mmToInches(geometry.halfTailBlockWidth);
  const tailBlockValue = `${formatDim(mm(geometry.halfTailBlockWidth * 2), system)} wide`;

  // The fixed frame, centred on the stringer. Constant for every board, by construction.
  const fixedMinX = centerlineX - FIXED_FRAME_HALF_W;
  const fixedWidth = 2 * FIXED_FRAME_HALF_W;

  // The canonical (vertical) viewBox, kept character-for-character the expression it always
  // was — renamed, not rewritten, so the default path's viewBox string cannot drift.
  const verticalViewBox = hideCallouts
    ? fixedFrame
      ? `${fixedMinX.toFixed(2)} 0 ${fixedWidth.toFixed(2)} ${VIEW_H}`
      : `0 0 ${VIEW_W} ${VIEW_H}`
    : `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`;

  const baseMinX = hideCallouts ? (fixedFrame ? fixedMinX : 0) : frame.minX;
  const baseMinY = hideCallouts ? 0 : frame.minY;
  const baseW = hideCallouts ? (fixedFrame ? fixedWidth : VIEW_W) : frame.width;
  const baseH = hideCallouts ? VIEW_H : frame.height;

  // The horizontal viewBox: the group below draws `rotate(-90)`, which maps (x, y) -> (y, -x), so
  // canonical y is the rotated LONG axis (along the board) and canonical x is the rotated SHORT
  // axis, negated (across it). Both axes below are fitted to what is actually drawn, not
  // transposed from the vertical frame.
  //
  // Why the ends are padded asymmetrically, and only partly. The frame already reaches past the
  // board at both ends — `tipPy - baseMinY` at the nose, `baseMinY + baseH - tailPy` at the tail
  // — so only the shortfall against `HORIZONTAL_CHIP_REACH` needs adding. Paying the full
  // half-chip at both ends (the previous constant) bought margin the frame already had. Zero
  // under `hideCallouts`, which draws no chips to clip.
  const noseEndPad = hideCallouts
    ? 0
    : Math.max(0, HORIZONTAL_CHIP_REACH - (tipPy - baseMinY));
  const tailEndPad = hideCallouts
    ? 0
    : Math.max(0, HORIZONTAL_CHIP_REACH - (baseMinY + baseH - tailPy));

  // Why the short axis is built from the rails, not the vertical frame's width. The vertical
  // frame's width holds a chip gutter and an output rail side by side; rotated, those two stack
  // across the short axis far more compactly, so carrying the vertical width over leaves roughly
  // 195 units of empty air. `frame.chipRightX` and `frame.outputValueX` already carry this
  // board's overflow (a wide board pushes both rails outward), so building the short axis from
  // them widens the rotated frame correctly with no second overflow term.
  //
  // What the Math.min / Math.max are for: a guard, not a live input. At these constants the two
  // rails bound the board by 139 and 77 units, so they never bind today. They exist so a future
  // rail change cannot silently start clipping the drawing.
  const crossMinX = hideCallouts
    ? baseMinX
    : Math.min(frame.chipRightX - HORIZONTAL_CHIP_RAIL_REACH, pxX(-wpHalfWidthIn));
  const crossMaxX = hideCallouts
    ? baseMinX + baseW
    : Math.max(frame.outputValueX + HORIZONTAL_OUTPUT_REACH, pxX(wpHalfWidthIn));

  const horizW = baseH + noseEndPad + tailEndPad;
  const horizH = crossMaxX - crossMinX;
  const horizontalViewBox =
    `${(baseMinY - noseEndPad).toFixed(2)} ${(-crossMaxX).toFixed(2)}` +
    ` ${horizW.toFixed(2)} ${horizH.toFixed(2)}`;

  // What this is worth, and where. At a 1280x820 window the panel is 804 x 631 and the drawing
  // is width-bound, so the gain — about +9% drawn board length — comes entirely from the long
  // axis above. The short axis pays when the container is wider than the viewBox aspect (a
  // large monitor or a short panel), and meanwhile it stops the content sitting off-centre. The
  // panel does not size itself from the frame; deriving its ratio was tried and reverted, see
  // `outline-editor.tsx`.

  const viewBox = horizontal ? horizontalViewBox : verticalViewBox;
  // In vertical, vbW/vbH are the same numbers they always were, so useSvgFitScale returns the
  // same scale and every pinned callout is sized identically to before. useSvgFitScale MUST
  // receive these swapped dimensions in horizontal — passing the canonical (unswapped) pair
  // would size every pinned callout against the wrong axis.
  const vbW = horizontal ? horizW : baseW;
  const vbH = horizontal ? horizH : baseH;
  const fitScale = useSvgFitScale(svgRef, vbW, vbH);
  // The svg's own rendered client size (quick task 260909-oge): measured the same way
  // `fitScale` is, in a `useLayoutEffect` rather than read off the ref during render, so the
  // drag readout chip's placement bounds below can use a plain number. Called unconditionally,
  // every render, even though it is only ever READ inside the touch-drag block further down.
  const svgClientSize = useSvgClientSize(svgRef);
  const calloutSizes = pinCalloutText ? pinnedCalloutSizes(fitScale) : UNPINNED_CALLOUT_SIZES;
  /** User units per CSS pixel — what the px-denominated handle sizes above are drawn in. */
  const handleUnit = fitScale > 0 ? 1 / fitScale : 1;

  /**
   * One hit radius drives both what is drawn (the hit circles below) and what the delegated pick
   * tests against — never two numbers that could drift apart (RESEARCH.md Pitfall 2's own
   * warning). `OUTLINE_DRAG_HIT_COARSE_PX` is the 09-06 measured phone radius; a fine pointer
   * keeps the historic 15px unchanged (PHON-05). Converted once, here, from CSS px to board
   * millimetres at THIS render's own scale, since `nearestOutlineDragTarget` takes millimetres —
   * it never sees a pixel.
   */
  const hitRadiusPx = coarsePointer ? OUTLINE_DRAG_HIT_COARSE_PX : OUTLINE_DRAG_HIT_PX;
  const hitRadiusUserUnits = hitRadiusPx * handleUnit;
  const hitRadiusMm = inchesToMm(hitRadiusUserUnits / scale);

  /**
   * The drag readout chip's own box (D-17), computed here — not inside the JSX below — so it
   * reads like every other layout constant in this file. `null` whenever no touch drag is live,
   * which is what keeps the chip absent for a mouse at every viewport width (PHON-05): only
   * `handlePointerDown`'s own `pointerType === "touch"` check ever sets `touchDragTarget`.
   *
   * Anchored on the FINGER, not the point (260909-ktq, D-06): `touchFingerBoard` is projected
   * through the same `pxX`/`lenToY` the drag targets themselves use, so it lands in exactly the
   * content-group pixel the finger is touching — during a direct drag that is where the point
   * already is, so nothing looks different; during a remote drag it rides out to the thumb,
   * wherever on the drawing that is.
   *
   * Sized and positioned entirely in rendered viewBox space (`toViewBoxPoint` above), which is
   * exactly the space `viewBox`'s own four numbers describe — so the clamp below ("never clipped
   * by the drawing's own edge") is an exact bounds check, not an approximation across two
   * coordinate spaces. `CALLOUT_CHAR_PX` is calibrated in the same screen-px terms `CALLOUT_PX`
   * is (`callout-primitives.tsx`'s own doc comment), so both are multiplied by `handleUnit` once,
   * at the end, the same conversion `pinnedCalloutSizes` performs.
   */
  let readoutChip:
    | { lines: { label: string; value: string }[]; x: number; y: number; width: number; height: number }
    | null = null;
  if (touchDragTarget && touchFingerBoard) {
    const lines = outlineReadoutLines(touchDragTarget);
    const longestChars = Math.max(...lines.map((l) => `${l.label} — ${l.value}`.length));
    const widthPx = Math.max(CALLOUT_PX.chipW, longestChars * CALLOUT_CHAR_PX + READOUT_PAD_PX * 2);
    const heightPx = lines.length * READOUT_ROW_PX + READOUT_PAD_PX * 2;
    const width = widthPx * handleUnit;
    const height = heightPx * handleUnit;
    const [vbMinX, vbMinY, vbWidth, vbHeight] = viewBox.split(" ").map(Number);
    const fingerCx = pxX(CONSTRUCTION_SIDE * mmToInches(touchFingerBoard.halfWidth));
    const fingerCy = lenToY(mmToInches(touchFingerBoard.station));
    const anchor = toViewBoxPoint(fingerCx, fingerCy);
    let boxBottom = anchor.y - READOUT_GAP_PX * handleUnit;
    let boxTop = boxBottom - height;
    let boxLeft = anchor.x - width / 2;
    let boxRight = boxLeft + width;
    if (boxLeft < vbMinX) {
      boxLeft = vbMinX;
      boxRight = boxLeft + width;
    }
    if (boxRight > vbMinX + vbWidth) {
      boxRight = vbMinX + vbWidth;
      boxLeft = boxRight - width;
    }
    if (boxTop < vbMinY) {
      boxTop = vbMinY;
      boxBottom = boxTop + height;
    }
    if (boxBottom > vbMinY + vbHeight) {
      boxBottom = vbMinY + vbHeight;
      boxTop = boxBottom - height;
    }

    // Keep the card clear of the board itself (quick task 260909-oge): the founder's own
    // complaint, shaping directly on a point, was that the card above sits right on top of the
    // outline it is reading. The board's silhouette is the outline's own rail edges, mapped into
    // this same rendered viewBox space through `toViewBoxPoint` — comparing a card in rendered
    // space against a board in canonical space would silently be wrong the moment this drawing is
    // rotated. `alongAxis` is `"x"` in horizontal (the rotated content group sends the board's
    // long axis onto rendered x) and `"y"` in vertical, the identity map.
    const boardSections = geometry.points.map((p) => {
      const stationPy = lenToY(mmToInches(p.station));
      const edgeA = toViewBoxPoint(pxX(mmToInches(p.halfWidth)), stationPy);
      const edgeB = toViewBoxPoint(pxX(-mmToInches(p.halfWidth)), stationPy);
      return boardSection(edgeA, edgeB, horizontal ? "x" : "y");
    });
    // The tail's closing triangle (D-08) counts as board too — a degenerate section, both edges
    // the same point, so a card anchored right at the tail still sees it.
    const tailClosePoint = toViewBoxPoint(pxX(0), lenToY(centerCloseIn));
    boardSections.push(boardSection(tailClosePoint, tailClosePoint, horizontal ? "x" : "y"));

    // The card may use the whole VISIBLE drawing, not just the viewBox (D-07): both viewers draw
    // `xMidYMid meet`, so the letterbox slack either side of the fitted drawing is real, paintable
    // space. `svgClientSize` is measured the same way `fitScale` is (a `useLayoutEffect`, never a
    // ref read during render) and is only ever USED here, inside the touch-drag block, so this
    // bounds calculation only ever matters while a finger is actually down on a touch device.
    // Falls back to the four viewBox numbers if the element or the scale is not yet readable.
    let placementBounds: ReadoutRect = { x: vbMinX, y: vbMinY, width: vbWidth, height: vbHeight };
    if (fitScale > 0 && svgClientSize.width > 0 && svgClientSize.height > 0) {
      const drawnW = svgClientSize.width / fitScale;
      const drawnH = svgClientSize.height / fitScale;
      const vbCenterX = vbMinX + vbWidth / 2;
      const vbCenterY = vbMinY + vbHeight / 2;
      placementBounds = {
        x: vbCenterX - drawnW / 2,
        y: vbCenterY - drawnH / 2,
        width: drawnW,
        height: drawnH,
      };
    }

    const placed = placeReadoutClearOfBoard(
      { x: boxLeft, y: boxTop, width, height },
      { alongAxis: horizontal ? "x" : "y", sections: boardSections },
      READOUT_GAP_PX * handleUnit,
      placementBounds,
      anchor,
    );

    readoutChip = { lines, x: placed.x, y: placed.y, width, height };
  }

  // WP Offset is grouped with Widepoint (sketch 004) and carries no leader. In vertical it sits
  // directly beneath Widepoint in the same gutter column — stepping down by a chip height. Read
  // `calloutSizes`, so these two declarations live here rather than beside `widepointChipY`
  // above (they are used only in the returned JSX, so the move is safe).
  //
  // Rotated, that gutter column becomes the bottom rail running ALONG the station axis, so
  // stepping "along" it by a chip height would land WP Offset on top of Widepoint — chips are
  // `chipW` wide across that axis, and the vertical step is a chip HEIGHT. Move it one row
  // further OUT from the board instead, at the same station: the honest reading of "directly
  // beneath" once the rail itself has turned 90 degrees.
  const wpOffsetChipX = horizontal
    ? frame.chipRightX - calloutSizes.chipH - CHIP_STACK_GAP
    : frame.chipRightX;
  const wpOffsetChipY = horizontal
    ? widepointChipY
    : widepointChipY + OUTLINE_CHIP_HEIGHT + CHIP_STACK_GAP;

  return (
    <CalloutSizeProvider value={calloutSizes}>
    <ViewerOrientationProvider value={orientation}>
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
      // `touch-none` here too, not only on the hit circles: a real touch drag routinely moves
      // past the original circle's own small radius (pointer capture is what keeps the SAME
      // target receiving those moves), and once a touch strays onto a part of the SVG with no
      // `touch-action: none` of its own the browser can still hand the gesture to native
      // scrolling — cancelling the drag with a `pointercancel` even though `preventDefault()` was
      // already called on the pointerdown. Confirmed with a real (CDP) touch drag, not assumed.
      // `select-none` is the defensive iOS long-press callout suppression (PHON-04, RESEARCH.md
      // Pitfall 3): the SVG text drawn near a drag point can start a selection too, not only the
      // hit circles themselves — both places get the same suppression.
      className="absolute inset-0 block h-full w-full select-none touch-none"
      style={{ WebkitTouchCallout: "none" }}
      onPointerDown={showConstruction && onOutlineDrag ? handlePointerDown : undefined}
      onPointerMove={onOutlineDrag ? handleDragMove : undefined}
      onPointerUp={onOutlineDrag ? (event) => handleDragEnd(event, false) : undefined}
      onPointerCancel={onOutlineDrag ? (event) => handleDragEnd(event, true) : undefined}
    >
      {/* Every child below is drawn in the canonical (vertical) coordinate space, untouched —
          the rotation lives on this ONE group, so every projector (pxX, lenToY) and its ~40
          call sites keep drawing the layout they always drew. React omits an `undefined`
          attribute, so in vertical this is a plain pass-through container with no transform;
          `app/globals.css` has no `svg` descendant selectors, so an extra group cannot change
          what any existing consumer draws either way. */}
      <g ref={contentRef} transform={horizontal ? "rotate(-90)" : undefined}>
      <path
        data-board-silhouette="outline"
        d={outlinePath}
        fill="var(--outline-board-fill)"
        stroke="var(--outline-ink)"
        strokeWidth={2}
      />

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
          {/* The drag targets themselves: board-fill disc, accent ring, orange core — plus, for
              whichever point is picked (260909-ktq, D-07), a halo ring drawn one size further out.
              pointer-events:none throughout — the transparent hit circles below own every pointer
              interaction, and a visual that swallowed a pointerdown would break the drag at the
              exact spot the shaper aimed for. */}
          {dragTargets.map((d) => (
            <g key={`t-${d.target}`} pointerEvents="none">
              {d.target === selectedTarget && (
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={DRAG_SELECTED_HALO_PX * handleUnit}
                  fill="none"
                  stroke="var(--color-surf-accent-ink)"
                  strokeWidth={DRAG_TARGET_RING_PX * handleUnit}
                />
              )}
              <circle
                cx={d.cx}
                cy={d.cy}
                r={DRAG_TARGET_OUTER_PX * handleUnit}
                fill="var(--outline-board-fill)"
                stroke="var(--color-surf-accent-ink)"
                strokeWidth={DRAG_TARGET_RING_PX * handleUnit}
              />
              <circle
                cx={d.cx}
                cy={d.cy}
                r={DRAG_TARGET_CORE_PX * handleUnit}
                fill="var(--color-surf-warning)"
              />
            </g>
          ))}
          {/* Transparent grab areas, last so they sit above everything they cover. No press
              handler of their own — the root `<svg>`'s one delegated handler owns every
              drag-start pick (D-15); these circles are the visual/cursor affordance and the
              `data-drag-target` test hook only. `touch-action:none` stops a touch drag scrolling
              the page instead of shaping the board; `select-none` plus the inline
              `WebkitTouchCallout` suppression stop iOS's long-press text-selection popup
              (PHON-04, RESEARCH.md Pitfall 3) from interrupting a drag mid-gesture. `data-selected`
              (260909-ktq) is `undefined` — not `"false"` — when the point is not picked, so React
              omits it entirely and the phone specs that count `[data-drag-target]` elements stay
              exact. */}
          {dragTargets.map((d) => (
            <circle
              key={d.target}
              data-drag-target={d.target}
              data-selected={d.target === selectedTarget ? "true" : undefined}
              cx={d.cx}
              cy={d.cy}
              r={hitRadiusUserUnits}
              fill="transparent"
              className="cursor-grab touch-none select-none active:cursor-grabbing"
              style={{ WebkitTouchCallout: "none" }}
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
              stroke="var(--color-surf-accent-ink)"
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
            value={formatDim(geometry.noseWidthAt12in, system)}
            station={`Nose @ ${stationLabel(system)}`}
          />
          <OutputRail
            valueX={frame.outputValueX}
            edgeX={pxX(midHalfWidthIn)}
            y={lenToY(lengthIn / 2)}
            value={formatDim(mm(inchesToMm(centerWidthAtStationIn)), system)}
            station="Center"
          />
          <OutputRail
            valueX={frame.outputValueX}
            edgeX={pxX(tailHalfWidthIn)}
            y={lenToY(tailStationIn)}
            value={formatDim(geometry.tailWidthAt12in, system)}
            station={`Tail @ ${stationLabel(system)}`}
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
                value={formatDim(outline.widePointWidth, system)}
                nameColor="var(--outline-widepoint-knot)"
                leaderToX={pxX(-wpHalfWidthIn)}
              />
              <CalloutChip x={wpOffsetChipX} y={wpOffsetChipY} name="WP OFFSET" value={wpOffsetText} />
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
      </g>
      {/* The drag readout chip (D-17): a sibling of the rotated content group above, not a
          child of it, so its box and text are always drawn screen-upright in the outer viewBox
          space directly — no counter-rotation needed. Touch-only (`readoutChip` is `null` for a
          mouse at every viewport width, PHON-05); `pointerEvents="none"` so it can never itself
          swallow the pointermove that is still steering the drag underneath it. */}
      {readoutChip && (
        <g data-readout-chip={touchDragTarget} pointerEvents="none">
          <CalloutChipFrame x={readoutChip.x} y={readoutChip.y} width={readoutChip.width} height={readoutChip.height} />
          {readoutChip.lines.map((line, i) => (
            <text
              key={line.label}
              x={readoutChip.x + readoutChip.width / 2}
              y={readoutChip.y + READOUT_PAD_PX * handleUnit + READOUT_ROW_PX * handleUnit * (i + 0.75)}
              textAnchor="middle"
            >
              <tspan
                style={{ fontSize: CALLOUT_PX.name * handleUnit, fontWeight: 700, fontFamily: "var(--font-body)" }}
                fill="var(--outline-callout-label)"
              >
                {line.label} —{" "}
              </tspan>
              <tspan
                style={{ fontSize: CALLOUT_PX.value * handleUnit, fontWeight: 700, fontFamily: "var(--font-body)" }}
                fill="var(--color-surf-accent-ink)"
              >
                {line.value}
              </tspan>
            </text>
          ))}
        </g>
      )}
    </svg>
    </ViewerOrientationProvider>
    </CalloutSizeProvider>
  );
}
