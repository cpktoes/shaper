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
 * it measures. That is the `"full"` grammar (`callouts="full"`, the default).
 *
 * A third grammar, `"compact"` (quick task 260829-vus), is the Summary order form's own: the box
 * it prints into is 0.92in tall, far too short for a card's own two-row stack at a printed 9pt, so
 * every reading there is a bare value instead — no card surface, no station name. Which figure is
 * which is carried by position (five stations along the board) and by side (deck = thickness,
 * bottom = rocker) instead of a name row, reinforced by the order form's own caption on the box.
 * `rocker-view-frame.ts`'s `compactRows`/`compactRailReadingXs`/`compactValuePrintPx` decide every
 * band depth, row baseline, type size and reading x position this grammar needs; this component
 * derives none of them (Rule 1).
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
import { CALLOUT_PX, CalloutChipFrame, DimensionTick, useSvgFitScale, type ViewerOrientation } from "@/components/viewer/callout-primitives";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil, type FoilSpec } from "@/lib/geometry/foil";
import {
  sideProfileDragPoints,
  solveSideProfileDrag,
  type SideProfileDragPoint,
  type SideProfileDragTarget,
} from "@/lib/geometry/rocker-drag";
import { buildRocker, ROCKER_LIFT_RANGE_IN, sampleRocker, type RockerSpec } from "@/lib/geometry/rocker";
import { formatInchesFraction, inchesToMm, type Mm, mmToInches } from "@/lib/geometry/units";
import {
  cardPinScale,
  COMPACT_BASELINE_DASH,
  COMPACT_BASELINE_WIDTH,
  COMPACT_LEADER_WIDTH,
  COMPACT_TICK_SIZE,
  COMPACT_VALUE_SIZE,
  compactRailReadingXs,
  compactValueWidth,
  PAD_X,
  type RockerCardType,
  type RockerCompactRow,
  rockerViewLayout,
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
  /**
   * Which rail grammar this viewer draws (04-05 Task 2, widened to a third mode by quick task
   * 260829-vus) — mirrors `RockerStationRails` in `rocker-view-frame.ts`, passed straight through
   * as that module's own `stationRails`. `"full"` (the default) draws the two card rails
   * `rocker-editor.tsx` uses. `"none"` suppresses both rails, their tick lines and the
   * board-length label, leaving only the closed board shape and baseline — mirrors
   * `outline-viewer.tsx`'s `hideCallouts`. `"compact"` draws the Summary order form's own
   * bare-value rails instead: five thickness readings above the board, four rocker readings
   * below, no card surface and no station name (this plan's `<design_decision>` section 2).
   *
   * Whichever non-`"full"` mode is chosen, no `onDrag` is ever passed to that consumer, so the
   * construction overlay's drag targets are already absent regardless of this prop (`dragTargets`
   * is built only `onDrag ? ... : []`). This prop also decides whether the layout module reserves
   * a band on either side of the board at all (`stationRails`, quick task 260829-uue) — a
   * consumer that never draws a rail is not paying for the band that rail would need.
   */
  callouts?: "full" | "compact" | "none";
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
   * The frame's scale rule (`rocker-view-frame.ts`'s `RockerViewLayoutInput.fitToBoard`): `true`
   * scales every board's own length to fill the drawing's long axis, so a short board no longer
   * draws small with blank space beside it. Defaults to `false`, which keeps the fixed
   * range-derived frame every board has always shared. A per-consumer choice, not an editor-only
   * one (quick task 260829-uue) — `components/rocker/rocker-editor.tsx` passes `true` so a
   * shaper's own board fills the editor panel, and `components/summary/order-form.tsx` now opts
   * in too, for the same reason on the printed sheet: its own frame carries no card rail to size
   * around (`callouts="compact"` is already set there), so nothing about the print path's
   * stability depends on this staying fixed the way `outline-viewer.tsx`'s `fixedFrame` still does.
   */
  fitToBoard?: boolean;
  /**
   * Paints the board silhouette with the usual `--outline-board-fill` wash when `true` (the
   * default, every editor view). The Summary order form passes `false` so its printed profile is
   * an outline-only drawing — the sheet's boxes are ink-frugal by standing decision (260826-lg8),
   * and an unfilled profile keeps the compact readings' leaders legible against paper.
   */
  boardFill?: boolean;
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
  type,
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
  /** The card's own type stack, scaled by `cardScale` together with the card box — the layout
   * module's own field, so this component derives no arithmetic of its own (Rule 1). */
  type: RockerCardType;
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
            y={rail + type.cardNameDy}
            textAnchor="middle"
            style={{ fontSize: type.nameSize, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
          <text
            x={x}
            y={rail + type.cardValueDy}
            textAnchor="middle"
            style={{ fontSize: type.valueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
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
  type,
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
  /** The card's own type stack, scaled by `cardScale` together with the card box — the layout
   * module's own field, so this component derives no arithmetic of its own (Rule 1). */
  type: RockerCardType;
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
            y={rail + type.readoutValueDy}
            textAnchor="middle"
            style={{ fontSize: type.valueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
            fill={valueColor}
          >
            {value}
          </text>
          <text
            x={x}
            y={rail + type.readoutNameDy}
            textAnchor="middle"
            style={{ fontSize: type.nameSize, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
        </g>
      </Upright>
    </g>
  );
}

/**
 * A bare compact reading (quick task 260829-vus, `callouts="compact"` only): no card surface, no
 * station name — position (which of the five stations) and side (deck = thickness, bottom =
 * rocker) carry what a card's own name text used to (this plan's `<design_decision>` section 2).
 *
 * `textX` is wherever `compactRailReadingXs`' separation sweep placed this reading, which may not
 * be `stationX` (the point it actually measures) — so the leader doglegs, `(textX, leaderStartY)`
 * to `(stationX, kneeY)` to `(stationX, curveY)`, keeping the reading pointed at the exact place
 * on the curve it measures even when the sweep nudged its type off that station.
 *
 * The tick is drawn inline at `COMPACT_TICK_SIZE` rather than through `DimensionTick` — that
 * component's own tick is a fixed module constant (`CALLOUT_TICK_SIZE`) with no size parameter,
 * and `CALLOUT_TICK_SIZE`'s 4 units would print as a 4px dot at this drawing's printed scale, too
 * small to read as a tick.
 */
function CompactReading({
  textX,
  stationX,
  row,
  curveY,
  value,
}: {
  /** Where the separation sweep placed this reading's own type. */
  textX: number;
  /** The station this reading actually measures, in the frame's own canonical x. */
  stationX: number;
  row: RockerCompactRow;
  curveY: number;
  value: string;
}) {
  return (
    <g>
      <polyline
        points={`${textX.toFixed(2)},${row.leaderStartY.toFixed(2)} ${stationX.toFixed(2)},${row.kneeY.toFixed(2)} ${stationX.toFixed(2)},${curveY.toFixed(2)}`}
        stroke="var(--outline-station-line)"
        strokeWidth={COMPACT_LEADER_WIDTH}
        fill="none"
      />
      <line
        x1={stationX - COMPACT_TICK_SIZE}
        y1={curveY + COMPACT_TICK_SIZE}
        x2={stationX + COMPACT_TICK_SIZE}
        y2={curveY - COMPACT_TICK_SIZE}
        stroke="var(--outline-dim-ink)"
        strokeWidth={1.1}
      />
      <text
        x={textX}
        y={row.textY}
        textAnchor="middle"
        style={{ fontSize: COMPACT_VALUE_SIZE, fontWeight: 700, fontFamily: "var(--font-body)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
    </g>
  );
}

export function RockerViewer({
  rocker,
  foil,
  length,
  callouts = "full",
  orientation = "horizontal",
  showConstruction = false,
  onDrag,
  fitToBoard = false,
  boardFill = true,
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

  // Pure-inches sampling, no projection — split out from the drawing loop below so the deck
  // envelope (`"compact"` mode's own `maxDeckIn`) can be derived BEFORE the layout, and therefore
  // the scale, is built.
  const samples: { stationIn: number; rockerLiftIn: number; thicknessIn: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const stationIn = (lengthIn * i) / SAMPLES;
    const stationMm = inchesToMm(stationIn);
    samples.push({
      stationIn,
      rockerLiftIn: mmToInches(sampleRocker(geometry, stationMm)),
      thicknessIn: mmToInches(sampleFoil(foil, length, stationMm)),
    });
  }

  // The tallest a drawn board can ever get: the highest rocker lift plus the thickest foil, so
  // the deck curve can never be clipped by the frame regardless of what a shaper dials in. Every
  // mode but `"compact"` reserves this constant on the frame's cross axis regardless of the
  // board actually loaded (`rocker-view-frame.ts`'s own `maxDeckIn` contract).
  const worstCaseDeckIn = ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max;
  // `"compact"` reserves only the LOADED board's own deck envelope instead (this plan's
  // `<design_decision>` section 3) — the order form's box is short and wide, so an empty reserved
  // unit comes straight out of the printed type. Falls back to the worst-case constant on a
  // corrupt/non-finite envelope (threat T-VUS-01), mirroring `rocker-view-frame.ts`'s own
  // `resolveEffectiveLengthIn` fallback.
  let maxDeckIn = worstCaseDeckIn;
  if (callouts === "compact") {
    const deckEnvelopeIn = Math.max(...samples.map((s) => s.rockerLiftIn + s.thicknessIn));
    maxDeckIn = Number.isFinite(deckEnvelopeIn) && deckEnvelopeIn > 0 ? deckEnvelopeIn : worstCaseDeckIn;
  }

  // Frame pass: the same pure layout function, evaluated first only to read the frame dimensions
  // `useSvgFitScale` measures against. Safe to read before the card scale is even known because
  // every frame extent (`width`/`height`, and therefore `viewBox`) is reserved at the pin's own
  // CEILING (`maxCardPinScale`), never at the live card scale (`rocker-view-frame.ts`'s own
  // T-03J-02 note) — so this pass hands `useSvgFitScale` the exact same numbers the drawing pass
  // below will, whatever card scale that second pass resolves to (Task 2's own frame-invariance
  // suite pins this equality by test).
  const framePass = rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard, stationRails: callouts });
  const fitScale = useSvgFitScale(svgRef, framePass.width, framePass.height);
  // The card-pin scale (quick task 260830-03j): 1 (unpinned) whenever this call's own
  // `stationRails` never draws a card at all (`cardPinScale`/`maxCardPinScale`'s own ceiling
  // forces that), so the Summary order form's `"compact"`/`"none"` paths are unaffected no matter
  // what this resolves to.
  const cardScale = cardPinScale(fitScale, CALLOUT_PX.value, orientation);

  // The drawing pass: the one place the drawing's scale and frame are decided
  // (`rocker-view-frame.ts`) — `scale`, `viewH`, `baselineY` and the frame below all come from
  // here, so `pxX`/`pxY` and the drag inverse can never solve against a different scale than the
  // drawing was made with.
  const layout = rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard, stationRails: callouts, cardScale });
  const {
    scale,
    baselineY,
    railY,
    tickEndY,
    deckRailY,
    deckTickEndY,
    cardDy,
    cardWidth,
    cardHeight,
    cardType,
    compactRows,
  } = layout;

  // Nose on the left: station = length (nose tip) draws at the frame's left pad; station = 0
  // (tail tip) draws further right. A shorter board's tail simply lands further left, leaving
  // blank frame on the right rather than changing scale.
  const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * scale;
  const pxY = (heightIn: number) => baselineY - heightIn * scale;

  // The same pure-inches samples above, now projected exactly as before this task.
  const bottomPoints: { x: number; y: number }[] = samples.map((s) => ({
    x: pxX(s.stationIn),
    y: pxY(s.rockerLiftIn),
  }));
  const deckPoints: { x: number; y: number }[] = samples.map((s) => ({
    x: pxX(s.stationIn),
    y: pxY(s.rockerLiftIn + s.thicknessIn),
  }));

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

  // `"compact"` mode's two reading rows (quick task 260829-vus). `pxX` puts the nose at the
  // frame's left, so ascending x runs nose to tail — the reverse of `stations`' own tail-to-nose
  // build order above. Every band depth, row baseline, type size and x position these lists hand
  // to `CompactReading` comes off `layout`/`compactRailReadingXs`; nothing here is computed
  // that this component doesn't already need to project the curve itself (Rule 1).
  const ascendingStations = [...stations].reverse();
  // Deck row: all five stations (D-01 — every thickness figure is a slider-set input).
  const compactDeckList = ascendingStations.map((s) => ({
    stationX: pxX(s.stationIn),
    width: compactValueWidth(s.thicknessValue),
  }));
  const compactDeckXs = compactRailReadingXs(layout, compactDeckList);
  // Bottom row: all four rocker figures (D-02) — tips and @ 12" alike — on ONE shared baseline,
  // through ONE sweep, so the separation between a tip and its 12in neighbour is the sweep's own
  // guarantee rather than a staggered second row's. The centre station's own rocker figure — the
  // curve's own zero — is deliberately absent.
  const compactBottomStations = ascendingStations.filter((s) => s.rockerValue !== null);
  const compactBottomList = compactBottomStations.map((s) => ({
    stationX: pxX(s.stationIn),
    width: compactValueWidth(s.rockerValue ?? ""),
  }));
  const compactBottomXs = compactRailReadingXs(layout, compactBottomList);

  // The viewBox string comes straight off the layout — the one place this drawing's frame is
  // decided. The vertical frame is built from its own rotated content (the nose card's near edge
  // to the tail card's far edge on the long axis, the card rail's own outer edge to the baseline
  // on the cross axis), NOT a transposition of the horizontal frame — the defect quick task
  // 260825-w8d fixed on the outline viewer. `fitScale` itself was already measured against the
  // frame pass above, before this (drawing-pass) layout even existed.
  const { viewBox } = layout;
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
            faint and dashed, spanning only the drawn board's own length. Compact draws it at its
            own heavier stroke and longer dash (`COMPACT_BASELINE_*`): the 1-unit line washes out
            entirely at the order form's printed scale, the same wash-out COMPACT_LEADER_WIDTH
            already corrects for the leaders. */}
        <line
          x1={tailX}
          y1={baselineY}
          x2={noseX}
          y2={baselineY}
          stroke="var(--outline-station-line)"
          strokeWidth={callouts === "compact" ? COMPACT_BASELINE_WIDTH : 1}
          strokeDasharray={callouts === "compact" ? COMPACT_BASELINE_DASH : "4 3"}
        />
        <path
          d={boardPath}
          fill={boardFill ? "var(--outline-board-fill)" : "none"}
          stroke="var(--outline-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {callouts === "full" && (
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
                    type={cardType}
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
                      type={cardType}
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
                      type={cardType}
                      valueColor={s.rockerValue !== null ? "var(--outline-ink)" : "var(--outline-callout-label)"}
                    />
                  )}
                </g>
              );
            })}
          </>
        )}

        {/* Compact rails (quick task 260829-vus): two rows of bare readings, no card surface and
            no station name. Every position, band and type size these draw at comes off `layout`
            and the two lists built above; this branch only zips a reading's own value onto the x
            the separation sweep chose for it. */}
        {callouts === "compact" && (
          <>
            {ascendingStations.map((s, i) => (
              <CompactReading
                key={`compact-deck-${s.key}`}
                textX={compactDeckXs[i]}
                stationX={pxX(s.stationIn)}
                row={compactRows.deck}
                curveY={pxY(s.deckHeightIn)}
                value={s.thicknessValue}
              />
            ))}
            {compactBottomStations.map((s, i) => (
              <CompactReading
                key={`compact-bottom-${s.key}`}
                textX={compactBottomXs[i]}
                stationX={pxX(s.stationIn)}
                row={compactRows.bottom}
                curveY={pxY(s.rockerHeightIn)}
                value={s.rockerValue ?? ""}
              />
            ))}
          </>
        )}

        {showConstruction && (
          <>
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
