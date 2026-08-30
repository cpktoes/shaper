/**
 * Rocker/foil side-profile viewer.
 *
 * Drawn horizontal, nose on the LEFT by default (D-03) — this screen's own default, unlike the
 * outline viewer's vertical default. All SVG geometry comes from numbers computed in
 * `lib/geometry`, written into JSX attributes; never string-built markup, and never raw HTML
 * injection (threat T-QO-01, same posture as `outline-viewer.tsx`).
 *
 * The board draws as one closed, solid shape — deck-over-bottom construction (D-01): the bottom
 * curve is the rocker line, and the deck curve is the rocker line plus the foil thickness at each
 * sampled station, closed at both tips so the two curves read as a single board silhouette.
 *
 * Drafting grammar, per `.planning/sketches/MANIFEST.md` and quick task 260829-uue: each
 * station's read-outs split across TWO rails, one on each side of the board — a rocker rail below
 * the baseline (the bottom curve it measures) and a thickness rail above the deck curve (the deck
 * it measures) — drawn in the TEMPLATE screen's own two-part grammar (`callout-primitives.tsx`):
 * a filled card (`CalloutChipFrame`) for a figure the shaper sets with its own slider, and a plain
 * reading — no card, a 45-degree `DimensionTick` on the curve instead — for a figure measured off
 * the drawn curve. On the rocker rail only the two tips are inputs; all five thickness figures
 * are. Every read-out, either kind, is leadered from its own rail to the exact point on the curve
 * it measures.
 *
 * Orientation (D-03): the toolbar's rotate-in-place button flips this viewer between "horizontal"
 * (the default, nose left) and "vertical" (nose up, so the five stations read top-to-bottom the
 * way a blank datasheet's columns do) — the OPPOSITE of the Template viewer's own default. Every
 * physical element (the baseline, the board silhouette, the station tick lines) is drawn once in
 * the canonical horizontal coordinate space and lives inside one rotated `<g>`, per the technique
 * quick task 260825-vot proved on the outline viewer — no projector call site is ever duplicated
 * for the second orientation. Only the label TEXT counter-rotates (`Upright` below), so it always
 * reads upright on screen regardless of which way the board is turned.
 *
 * Construction-line overlay and control-point dragging (quick task 260829-t47, on top of
 * 260829-snm's own move from seven grab points to two): when `showConstruction` is on, the
 * drawing gains the same construction-line grammar the TEMPLATE viewer already draws — one line,
 * from `geometry.handles`, out of each curve point to the handle that steers the curve there.
 * There are always four lines: the rocker curve is two Bezier segments joined at the centre, and
 * each segment has a steering handle at both of its ends. The three KNOTS — tail tip, centre,
 * nose tip — draw as small plain dots: "this shows you the shape, you cannot grab it." Both tips
 * are fixed because a tip's own rocker is a headline number set from its slider and its typed
 * DATASHEET cell, not something to eyeball by dragging; the centre is the curve's own zero by
 * definition. The four HANDLE TERMINI — the far end of each steering line — are the drawing's
 * only grab targets, when `onDrag` is also given: `sideProfileDragPoints` enumerates them in
 * `geometry.handles`' own order, the same three-part accent treatment `outline-viewer.tsx`'s drag
 * targets use, counter-scaled to a constant on-screen size. Dragging the tail or nose tip's own
 * handle sets that tip's Angle and Smoothness together; dragging either of the two centre handles
 * sets that side's Flatness alone, and moving it off its own station-only tangent carries no
 * information (the constrained-axis behaviour `rocker-drag.ts`'s own tests pin down). Pointer
 * handling converts a screen event to board coordinates through the rotated content group's own
 * `getScreenCTM`, the technique that already makes dragging work in both orientations on the
 * Template screen, then calls `solveSideProfileDrag` (passed the live geometry) and hands the
 * patch straight up — the caller (`rocker-editor.tsx`) passes it straight to `updateRocker`.
 */

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from "react";
import { CalloutChipFrame, DimensionTick, useSvgFitScale, type ViewerOrientation } from "@/components/viewer/callout-primitives";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil, type FoilSpec } from "@/lib/geometry/foil";
import {
  sideProfileDragPoints,
  solveSideProfileDrag,
  type SideProfileDragPoint,
  type SideProfileDragTarget,
} from "@/lib/geometry/rocker-drag";
import { buildRocker, ROCKER_LIFT_RANGE_IN, sampleRocker, type RockerSpec } from "@/lib/geometry/rocker";
import { formatFeetInches, formatInchesFraction, inchesToMm, type Mm, mmToInches } from "@/lib/geometry/units";
import {
  CARD_NAME_DY,
  CARD_VALUE_DY,
  PAD_X,
  READOUT_NAME_DY,
  READOUT_VALUE_DY,
  rockerViewLayout,
  STATION_NAME_SIZE,
  STATION_VALUE_SIZE,
} from "./rocker-view-frame";

/**
 * Drag-target and construction-marker sizing, in CSS pixels — copied from `outline-viewer.tsx`'s
 * own constants (a grab handle or a marker dot is a UI affordance, not board geometry, so it
 * holds a constant on-screen size rather than scaling with the drawing). Divided by the live fit
 * scale at render.
 */
const DRAG_TARGET_OUTER_PX = 7;
const DRAG_TARGET_RING_PX = 1.6;
const DRAG_TARGET_CORE_PX = 2.6;
/** Fixed reference knots and construction-line termini — deliberately plain, so only grabbable
 * points look grabbable. */
const KNOT_DOT_PX = 3;
const DRAG_HIT_PX = 15;

/** Curve sampling density — enough to read as smooth at this frame's scale, well past the five
 * knots the monotone splines are built from. */
const SAMPLES = 60;

export interface RockerViewerProps {
  rocker: RockerSpec;
  foil: FoilSpec;
  length: Mm;
  /** The compact mode (04-05 Task 2): suppresses both card rails, their tick lines and the
   * board-length label, leaving only the closed board shape and baseline — mirrors
   * `outline-viewer.tsx`'s `hideCallouts`. This is what the Summary order form's rocker box
   * renders: no `onDrag` is ever passed there, so the construction overlay's drag targets are
   * already absent regardless of this flag (`dragTargets` is built only `onDrag ? ... : []`).
   * This flag now ALSO decides whether the layout module reserves a card band on either side of
   * the board at all (`showStationCards`, quick task 260829-uue) — a consumer that never draws a
   * rail is not paying for the band that rail would need, so its frame is the board plus a
   * hairline of pad instead. Defaults to `false`. */
  hideCallouts?: boolean;
  /** D-03: `"horizontal"` (nose left, the default) or `"vertical"` (nose up, stations read
   * top-to-bottom). Driven by the toolbar's rotate button, never persisted. */
  orientation?: ViewerOrientation;
  /** Draws the four construction lines and their plain marker dots (plus, when `onDrag` is also
   * given, the two tip drag targets and faint station lines) when true. Defaults to `false`. */
  showConstruction?: boolean;
  /**
   * Direct manipulation: called with the rocker-spec patch a dragged tip implies, on every
   * pointer move. Omitted means no hit targets and no handlers at all — a consumer with no
   * design-state mutator (a future Summary rocker box) renders exactly the same as before this
   * prop existed. The solve itself lives in `lib/geometry/rocker-drag.ts`; this component only
   * converts screen coordinates into board coordinates and passes the result up.
   */
  onDrag?: (patch: Partial<RockerSpec>) => void;
  /**
   * The editor-only frame gate (`rocker-view-frame.ts`'s `RockerViewLayoutInput.fitToBoard`):
   * `true` scales every board's own length to fill the drawing's long axis, so a short board no
   * longer draws small with blank space beside it. Defaults to `false`, which keeps the fixed
   * range-derived frame this viewer has always drawn — `components/summary/order-form.tsx` never
   * passes this prop, so the order form's rocker box keeps today's frame BY CONSTRUCTION (the
   * same posture 260823-h6l gave the outline viewer's own `fixedFrame`), rather than by a guard
   * anyone could forget to add. Only `components/rocker/rocker-editor.tsx` passes `true`.
   */
  fitToBoard?: boolean;
}

/**
 * Wraps callout text so it reads screen-upright even when the content group is rotated, without
 * needing per-call rotation math. Mirrors `callout-primitives.tsx`'s `UprightAt` — see that
 * component's comment for the full linear-algebra argument (a child rotated by the NEGATIVE of
 * the parent's rotation, about the same anchor, composes to a pure translation). This viewer's
 * parent rotates `rotate(90)` for vertical (rather than the outline viewer's `rotate(-90)` for
 * horizontal), so the child here undoes it with `rotate(-90 x y)`.
 */
function Upright({
  x,
  y,
  vertical,
  children,
}: {
  x: number;
  y: number;
  vertical: boolean;
  children: ReactNode;
}) {
  if (!vertical) return <>{children}</>;
  return <g transform={`rotate(-90 ${x.toFixed(2)} ${y.toFixed(2)})`}>{children}</g>;
}

/**
 * A named input card, mirroring the TEMPLATE screen's own `CalloutChip` (finding 8): a bordered
 * box on `CalloutChipFrame` holding the station name over its value, leadered — no tick, which is
 * how the template's own grammar marks an input's leader — from the rail's near edge to the exact
 * point on the curve it measures.
 */
function StationCard({
  x,
  rail,
  tickEnd,
  curveY,
  cardDy,
  cardWidth,
  cardHeight,
  vertical,
  name,
  value,
  valueColor = "var(--outline-ink)",
}: {
  x: number;
  rail: number;
  tickEnd: number;
  curveY: number;
  cardDy: number;
  cardWidth: number;
  cardHeight: number;
  vertical: boolean;
  name: string;
  value: string;
  valueColor?: string;
}) {
  const cardX = x - cardWidth / 2;
  return (
    <g>
      <line x1={x} y1={tickEnd} x2={x} y2={curveY} stroke="var(--outline-station-line)" strokeWidth={1} />
      <Upright x={x} y={rail} vertical={vertical}>
        {/* `cardDy` (0 in horizontal, a no-op) shifts the card along the rotated station axis in
            vertical, centring it on the station it names — the outer composition is a pure
            translation (finding 4), so this inner `translate(0, dy)` lands exactly there. */}
        <g transform={`translate(0, ${cardDy.toFixed(2)})`}>
          <CalloutChipFrame x={cardX} y={rail} width={cardWidth} height={cardHeight} />
          <text
            x={x}
            y={rail + CARD_NAME_DY}
            textAnchor="middle"
            style={{ fontSize: STATION_NAME_SIZE, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
          <text
            x={x}
            y={rail + CARD_VALUE_DY}
            textAnchor="middle"
            style={{ fontSize: STATION_VALUE_SIZE, fontWeight: 700, fontFamily: "var(--font-body)" }}
            fill={valueColor}
          >
            {value}
          </text>
        </g>
      </Upright>
    </g>
  );
}

/**
 * A derived reading, mirroring the TEMPLATE screen's own `OutputRail` (finding 8): no card
 * surface at all — a leader to the measured point, a 45-degree `DimensionTick` there, then the
 * value over the station name, the reverse of a card's own stacking. Rides the same rail anchor
 * and the same card-sized band a `StationCard` would, so the two line up along one rail and a
 * card's own containment proof carries this one with it.
 */
function StationReadout({
  x,
  rail,
  tickEnd,
  curveY,
  cardDy,
  vertical,
  name,
  value,
  valueColor = "var(--outline-ink)",
}: {
  x: number;
  rail: number;
  tickEnd: number;
  curveY: number;
  cardDy: number;
  vertical: boolean;
  name: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <g>
      <line x1={x} y1={tickEnd} x2={x} y2={curveY} stroke="var(--outline-station-line)" strokeWidth={1} />
      <DimensionTick x={x} y={curveY} />
      <Upright x={x} y={rail} vertical={vertical}>
        <g transform={`translate(0, ${cardDy.toFixed(2)})`}>
          <text
            x={x}
            y={rail + READOUT_VALUE_DY}
            textAnchor="middle"
            style={{ fontSize: STATION_VALUE_SIZE, fontWeight: 700, fontFamily: "var(--font-body)" }}
            fill={valueColor}
          >
            {value}
          </text>
          <text
            x={x}
            y={rail + READOUT_NAME_DY}
            textAnchor="middle"
            style={{ fontSize: STATION_NAME_SIZE, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
        </g>
      </Upright>
    </g>
  );
}

export function RockerViewer({
  rocker,
  foil,
  length,
  hideCallouts = false,
  orientation = "horizontal",
  showConstruction = false,
  onDrag,
  fitToBoard = false,
}: RockerViewerProps) {
  const vertical = orientation === "vertical";
  const svgRef = useRef<SVGSVGElement>(null);
  /** The content group carrying the rotation, in vertical — see `toBoardPoint` below for why the
   * drag matrix must be read off this instead of the SVG root. */
  const contentRef = useRef<SVGGElement>(null);
  /** Which grab target the active gesture owns, if any. A ref, not state: it changes on
   * pointerdown and is read on pointermove, and re-rendering for it would be a wasted pass. */
  const draggingRef = useRef<SideProfileDragTarget | null>(null);
  const lengthIn = mmToInches(length);
  // Built once per render and shared by the sampling loop, the drag-target enumerator and the
  // solver below, the same posture `rocker-editor.tsx` takes building it once for the controls,
  // the datasheet and this viewer to all share.
  const geometry = buildRocker(rocker, length);
  // The tallest a drawn board can ever get: the highest rocker lift plus the thickest foil, so
  // the deck curve can never be clipped by the frame regardless of what a shaper dials in.
  const maxDeckIn = ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max;
  // The one place the drawing's scale and frame are decided (`rocker-view-frame.ts`) — `scale`,
  // `viewH`, `baselineY` and the frame below all come from here, so `pxX`/`pxY` and the drag
  // inverse can never solve against a different scale than the drawing was made with.
  const layout = rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard, showStationCards: !hideCallouts });
  const { scale, baselineY, railY, tickEndY, deckRailY, deckTickEndY, cardDy, cardWidth, cardHeight, labelX, labelY } = layout;

  // Nose on the left: station = length (nose tip) draws at the frame's left pad; station = 0
  // (tail tip) draws further right. A shorter board's tail simply lands further left, leaving
  // blank frame on the right rather than changing scale.
  const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * scale;
  const pxY = (heightIn: number) => baselineY - heightIn * scale;

  const bottomPoints: { x: number; y: number }[] = [];
  const deckPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const stationIn = (lengthIn * i) / SAMPLES;
    const stationMm = inchesToMm(stationIn);
    const rockerLiftIn = mmToInches(sampleRocker(geometry, stationMm));
    const thicknessIn = mmToInches(sampleFoil(foil, length, stationMm));
    bottomPoints.push({ x: pxX(stationIn), y: pxY(rockerLiftIn) });
    deckPoints.push({ x: pxX(stationIn), y: pxY(rockerLiftIn + thicknessIn) });
  }

  // One closed shape: the bottom curve tail-to-nose, a vertical edge closing the nose tip, the
  // deck curve nose-to-tail, and an implicit closing edge back to the start at the tail tip —
  // the deck-over-bottom construction (D-01) drawn as a single solid board silhouette, the same
  // way `outline-viewer.tsx`'s own board path closes plan-view left and right halves.
  const boardPath = [
    `M ${bottomPoints[0].x.toFixed(2)} ${bottomPoints[0].y.toFixed(2)}`,
    ...bottomPoints.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ...deckPoints
      .slice()
      .reverse()
      .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    "Z",
  ].join(" ");

  const noseX = pxX(lengthIn);
  const tailX = pxX(0);

  /** Sampled at the same `stationIn` the drawing loop above already samples, so a card and the
   * curve it leaders to can never disagree about where that station's point sits. `rockerKind`
   * names the founder's own split (planner finding 9), visible here in one place: the two tips
   * have their own sliders and get a card; the other three rocker figures are measured off the
   * drawn curve and get a plain reading. Every thickness figure is a slider, so the deck side
   * needs no such field — it is a card at all five stations. */
  const stationInputs: {
    key: string;
    name: string;
    stationIn: number;
    rockerValue: string | null;
    thicknessValue: string;
    rockerKind: "input" | "derived";
  }[] = [
    {
      key: "tailTip",
      name: "Tail Tip",
      stationIn: 0,
      rockerValue: formatInchesFraction(rocker.tailLift),
      thicknessValue: formatInchesFraction(foil.tailTip),
      rockerKind: "input",
    },
    {
      key: "tail12",
      name: 'Tail @ 12"',
      stationIn: 12,
      rockerValue: formatInchesFraction(geometry.tailLiftAt12in),
      thicknessValue: formatInchesFraction(foil.tail12),
      rockerKind: "derived",
    },
    {
      key: "center",
      name: "Center",
      stationIn: lengthIn / 2,
      rockerValue: null,
      thicknessValue: formatInchesFraction(foil.center),
      rockerKind: "derived",
    },
    {
      key: "nose12",
      name: 'Nose @ 12"',
      stationIn: lengthIn - 12,
      rockerValue: formatInchesFraction(geometry.noseLiftAt12in),
      thicknessValue: formatInchesFraction(foil.nose12),
      rockerKind: "derived",
    },
    {
      key: "noseTip",
      name: "Nose Tip",
      stationIn: lengthIn,
      rockerValue: formatInchesFraction(rocker.noseLift),
      thicknessValue: formatInchesFraction(foil.noseTip),
      rockerKind: "input",
    },
  ];
  const stations = stationInputs.map((s) => {
    const stationMm = inchesToMm(s.stationIn);
    const rockerHeightIn = mmToInches(sampleRocker(geometry, stationMm));
    const deckHeightIn = rockerHeightIn + mmToInches(sampleFoil(foil, length, stationMm));
    return { ...s, rockerHeightIn, deckHeightIn };
  });

  // Both the viewBox string and its frame width/height come straight off the layout — the one
  // place this drawing's frame is decided. The vertical frame is built from its own rotated
  // content (the nose card's near edge to the tail card's far edge on the long axis, the card
  // rail's own outer edge to the baseline on the cross axis), NOT a transposition of the
  // horizontal frame — the defect quick task 260825-w8d fixed on the outline viewer.
  const { viewBox, width: frameWidth, height: frameHeight } = layout;
  const fitScale = useSvgFitScale(svgRef, frameWidth, frameHeight);
  /** User units per CSS pixel — what the px-denominated drag-target sizes above are drawn in. */
  const handleUnit = fitScale > 0 ? 1 / fitScale : 1;

  // Grabbable points, in the same canonical space pxX/pxY draw everything else in. Only built
  // when a drag handler is present, so a consumer with no `onDrag` renders exactly what it did
  // before this prop existed.
  const dragTargets = onDrag
    ? sideProfileDragPoints(geometry).map((d) => ({
        target: d.target,
        cx: pxX(mmToInches(d.point.station)),
        cy: pxY(mmToInches(d.point.height)),
      }))
    : [];

  // The construction overlay: one line per handle (four, always — two Bezier segments each with a
  // handle at both ends), from `geometry.handles`. Every coordinate comes straight off
  // `buildRocker`'s own knots/handles, in the same canonical space pxX/pxY draw everything else
  // in — no formula added here, only projection.
  const constructionLines = geometry.handles.map((h) => ({
    x1: pxX(mmToInches(h.from.x)),
    y1: pxY(mmToInches(h.from.y)),
    x2: pxX(mmToInches(h.to.x)),
    y2: pxY(mmToInches(h.to.y)),
  }));
  // Plain dots: all three knots — tail tip, centre, nose tip. Fixed, ungrabbable, showing the
  // shape only; the four handle termini below are the drawing's only grab targets now.
  const constructionDots = geometry.knots.map((k) => ({
    cx: pxX(mmToInches(k.point.x)),
    cy: pxY(mmToInches(k.point.y)),
  }));

  /** Screen point -> board coordinates: undo the SVG transform, then invert pxX/pxY.
   *
   * The matrix comes off the content group, not the SVG root, falling back to the root only if
   * the group ref is not yet attached — the same reasoning `outline-viewer.tsx`'s own
   * `toBoardPoint` uses. In vertical the content group carries `rotate(90)`; reading the CTM off
   * it (rather than the un-rotated root) means the inversion below always lands back in the
   * canonical (horizontal) space pxX/pxY were written for, correct in both orientations.
   */
  function toBoardPoint(event: ReactPointerEvent<SVGElement>): SideProfileDragPoint | null {
    const el = contentRef.current ?? svgRef.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const stationIn = lengthIn - (local.x - PAD_X) / scale;
    const heightIn = (baselineY - local.y) / scale;
    return { station: inchesToMm(stationIn), height: inchesToMm(heightIn) };
  }

  function handleDragMove(event: ReactPointerEvent<SVGElement>) {
    if (!draggingRef.current || !onDrag) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    // Every move writes the spec and the redraw arrives back through props — nothing here is
    // cached across renders, which is what keeps the sliders and the datasheet cells in step
    // with the drawing mid-drag.
    onDrag(solveSideProfileDrag(geometry, draggingRef.current, boardPoint));
  }

  function handleDragStart(target: SideProfileDragTarget, event: ReactPointerEvent<SVGElement>) {
    if (!onDrag) return;
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

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      // Absolutely positioned to fill its container — `outline-viewer.tsx`'s own svg takes the
      // same treatment, and for the same reason: a box must never take its height from the
      // drawing inside it, or a fixed-size panel (the Summary order form's rocker box) inflates
      // to the drawing's own aspect ratio instead of holding still. The immediate parent supplies
      // both `relative` and a definite size in every consumer of this component.
      className="absolute inset-0 block h-full w-full"
      role="img"
      aria-label="Side profile of the board, showing the rocker line and deck thickness"
      onPointerMove={onDrag ? handleDragMove : undefined}
      onPointerUp={onDrag ? handleDragEnd : undefined}
      onPointerCancel={onDrag ? handleDragEnd : undefined}
    >
      {/* Every child below is drawn in the canonical (horizontal, nose-left) coordinate space,
          untouched — the rotation lives on this ONE group, so pxX/pxY and their call sites keep
          drawing the layout they always drew. React omits an `undefined` attribute, so in
          horizontal this is a plain pass-through container with no transform. */}
      <g ref={contentRef} transform={vertical ? "rotate(90)" : undefined}>
        {/* The flat surface the board sits on — the rocker's own zero reference, bottom-up — drawn
            faint and dashed, spanning only the drawn board's own length. */}
        <line
          x1={tailX}
          y1={baselineY}
          x2={noseX}
          y2={baselineY}
          stroke="var(--outline-station-line)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <path
          d={boardPath}
          fill="var(--outline-board-fill)"
          stroke="var(--outline-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {!hideCallouts && (
          <>
            {stations.map((s) => {
              const x = pxX(s.stationIn);
              const deckCurveY = pxY(s.deckHeightIn);
              const rockerCurveY = pxY(s.rockerHeightIn);
              return (
                <g key={s.key}>
                  {/* Deck side: every thickness figure has its own slider, so every station
                      draws as a card. */}
                  <StationCard
                    x={x}
                    rail={deckRailY}
                    tickEnd={deckTickEndY}
                    curveY={deckCurveY}
                    cardDy={cardDy}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    vertical={vertical}
                    name={s.name}
                    value={s.thicknessValue}
                  />
                  {/* Bottom side: a card at the two tips (their own sliders), a plain reading
                      everywhere else — measured off the drawn curve rather than set directly.
                      The centre keeps its em-dash, now as a plain reading rather than a card, in
                      the muted label colour — it stands in for a value that is zero by
                      construction rather than one that was measured. */}
                  {s.rockerKind === "input" ? (
                    <StationCard
                      x={x}
                      rail={railY}
                      tickEnd={tickEndY}
                      curveY={rockerCurveY}
                      cardDy={cardDy}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      vertical={vertical}
                      name={s.name}
                      value={s.rockerValue ?? ""}
                    />
                  ) : (
                    <StationReadout
                      x={x}
                      rail={railY}
                      tickEnd={tickEndY}
                      curveY={rockerCurveY}
                      cardDy={cardDy}
                      vertical={vertical}
                      name={s.name}
                      value={s.rockerValue ?? "—"}
                      valueColor={s.rockerValue !== null ? "var(--outline-ink)" : "var(--outline-callout-label)"}
                    />
                  )}
                </g>
              );
            })}
            <Upright x={labelX} y={labelY} vertical={vertical}>
              <text
                x={labelX}
                y={labelY}
                // Vertical only: the label's anchor sits near the frame's rail-side edge (final x
                // near 0), so a start-anchored run overshoots straight past the frame's max x
                // (today's defect — finding 5). End-anchoring makes it run back INTO the frame
                // from its own anchor instead. Horizontal is untouched.
                textAnchor={vertical ? "end" : undefined}
                style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
                fill="var(--outline-ink)"
              >
                {formatFeetInches(length)}
              </text>
            </Upright>
          </>
        )}

        {showConstruction && (
          <>
            {/* Faint full-height station lines. They no longer mark grab points — the deck
                curve carries none any more — but they still mark the five measured stations the
                output rail reads out, so the shaper can see which station is which even with the
                rail's own shorter ticks hidden by a hideCallouts consumer. */}
            {stations.map((s) => (
              <line
                key={`construction-${s.key}`}
                x1={pxX(s.stationIn)}
                y1={baselineY}
                x2={pxX(s.stationIn)}
                y2={pxY(maxDeckIn)}
                stroke="var(--outline-construction)"
                strokeWidth={1}
              />
            ))}
            {/* The construction lines: one per handle, out of each curve point toward the handle
                that steers the curve there — always four, since the rocker curve is two Bezier
                segments joined at the centre and each segment has a handle at both of its ends. */}
            {constructionLines.map((cl, i) => (
              <line
                key={`construction-line-${i}`}
                x1={cl.x1}
                y1={cl.y1}
                x2={cl.x2}
                y2={cl.y2}
                stroke="var(--outline-construction)"
                strokeWidth={1.5}
              />
            ))}
            {/* Plain marker dots: the three knots — tail tip, centre, nose tip. Deliberately
                plain, not a grab target: these show the shape, they are not draggable. A tip's
                own rocker is set from its slider and its typed DATASHEET cell instead. */}
            {constructionDots.map((dt, i) => (
              <circle
                key={`construction-dot-${i}`}
                cx={dt.cx}
                cy={dt.cy}
                r={KNOT_DOT_PX * handleUnit}
                fill="var(--outline-ink)"
              />
            ))}
            {/* The drag targets themselves: board-fill disc, accent ring, warning core — the same
                three-part treatment `outline-viewer.tsx` draws its own drag targets with. The
                four control-point handle termini appear here — the two tip knots and the centre
                knot are never among them. pointer-events:none throughout — the transparent hit
                circles below own every pointer interaction. */}
            {dragTargets.map((d) => (
              <g key={`target-${d.target}`} pointerEvents="none">
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={DRAG_TARGET_OUTER_PX * handleUnit}
                  fill="var(--outline-board-fill)"
                  stroke="var(--color-surf-accent-ink)"
                  strokeWidth={DRAG_TARGET_RING_PX * handleUnit}
                />
                <circle cx={d.cx} cy={d.cy} r={DRAG_TARGET_CORE_PX * handleUnit} fill="var(--color-surf-warning)" />
              </g>
            ))}
            {/* Transparent grab areas, last so they sit above everything they cover.
                touch-action:none stops a touch drag scrolling the page instead of shaping the
                board. */}
            {dragTargets.map((d) => (
              <circle
                key={`hit-${d.target}`}
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
      </g>
    </svg>
  );
}
