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
 * Drafting grammar, per `.planning/sketches/MANIFEST.md`: the flat reference line is a faint
 * dashed line drawn only INSIDE the drawn shape's own extent; the rocker/thickness values read
 * out to an output rail below the baseline, outside the shape.
 *
 * Orientation (D-03): the toolbar's rotate-in-place button flips this viewer between "horizontal"
 * (the default, nose left) and "vertical" (nose up, so the five stations read top-to-bottom the
 * way a blank datasheet's columns do) — the OPPOSITE of the Template viewer's own default. Every
 * physical element (the baseline, the board silhouette, the station tick lines, the outline
 * reference) is drawn once in the canonical horizontal coordinate space and lives inside one
 * rotated `<g>`, per the technique quick task 260825-vot proved on the outline viewer — no
 * projector call site is ever duplicated for the second orientation. Only the label TEXT
 * counter-rotates (`Upright` below), so it always reads upright on screen regardless of which way
 * the board is turned.
 *
 * Outline reference (D-07/D-08): when `showOutlineReference` is on and an `outlineGeometry` is
 * given, a faint dashed curve traces the drawn outline's own half-width at each station, on the
 * same vertical (height) axis and scale as the deck curve, drawn BEHIND the solid board path so
 * it is naturally read as a reference rather than as an editable curve — it belongs to the
 * Template screen (D-07), and the toolbar's hide-outline toggle removes it entirely.
 *
 * Construction-line overlay and tip dragging (quick task 260829-snm, on top of Task 3's original
 * 260829-rda work): when `showConstruction` is on, the drawing gains the same construction-line
 * grammar the TEMPLATE viewer already draws — one line, from `geometry.handles`, out of each
 * curve point to the handle that steers the curve there, ending in a small plain dot, with a
 * plain dot on the fixed centre knot too. There are always four lines: the rocker curve is two
 * Bezier segments joined at the centre, and each segment has a steering handle at both of its
 * ends. A plain dot means "this shows you the shape, you cannot grab it" — only the two tips
 * carry a round three-part grab target; the five deck (thickness) points that used to sit on the
 * curve above are gone from the drawing entirely, since the five Thickness sliders in the sidebar
 * are now the only way to set thickness. When `onDrag` is also given, the two tip points
 * `sideProfileDragPoints` enumerates draw as grab targets — the same three-part accent treatment
 * `outline-viewer.tsx`'s drag targets use, counter-scaled to a constant on-screen size — plus
 * faint full-height station lines marking the five measured stations the output rail reads out.
 * Pointer handling converts a screen event to board coordinates through the rotated content
 * group's own `getScreenCTM`, the technique that already makes dragging work in both orientations
 * on the Template screen, then calls `solveSideProfileDrag` and hands the patch straight up — the
 * caller (`rocker-editor.tsx`) passes it straight to `updateRocker`.
 */

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from "react";
import { useSvgFitScale, type ViewerOrientation } from "@/components/viewer/callout-primitives";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil, type FoilSpec } from "@/lib/geometry/foil";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { sampleOutline } from "@/lib/geometry/outline";
import {
  sideProfileDragPoints,
  solveSideProfileDrag,
  type SideProfileDragPoint,
  type SideProfileDragTarget,
} from "@/lib/geometry/rocker-drag";
import { buildRocker, ROCKER_LIFT_RANGE_IN, sampleRocker, type RockerSpec } from "@/lib/geometry/rocker";
import { formatFeetInches, formatInchesFraction, inchesToMm, type Mm, mmToInches } from "@/lib/geometry/units";

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

const VIEW_W = 900;
const PAD_X = 40;
/**
 * Pixels per inch, shared by BOTH axes — a shaper checks a rocker line with a straightedge on a
 * flat floor, so the drawing keeps the board's real proportions rather than exaggerating the
 * vertical axis for legibility. Derived once from the longest board this app can produce
 * (`BOARD_LENGTH_RANGE_IN.max`), so every shorter board draws at the same scale and simply
 * leaves blank frame to its right — the same fixed-frame treatment `outline-viewer.tsx`'s
 * `fixedFrame` gives the outline viewer (quick task 260823-h6l), so this window never resizes
 * around whichever board happens to be loaded.
 */
const PX_PER_INCH = (VIEW_W - PAD_X * 2) / BOARD_LENGTH_RANGE_IN.max;
const PAD_TOP = 26;
/** Gap between the baseline and the output rail's tick marks. */
const RAIL_GAP = 20;
/** Room for the output rail's three stacked text lines (rocker value, thickness value, station
 * name) below the baseline. */
const RAIL_LABEL_HEIGHT = 58;
const BOTTOM_PAD = RAIL_GAP + RAIL_LABEL_HEIGHT;
/** Curve sampling density — enough to read as smooth at this frame's scale, well past the five
 * knots the monotone splines are built from. */
const SAMPLES = 60;

export interface RockerViewerProps {
  rocker: RockerSpec;
  foil: FoilSpec;
  length: Mm;
  /** The compact mode (04-05 Task 2): suppresses the output rail, station tick lines and
   * board-length label, leaving only the closed board shape and baseline — mirrors
   * `outline-viewer.tsx`'s `hideCallouts`. This is what the Summary order form's rocker box
   * renders: no `onDrag` is ever passed there, so the construction overlay's drag targets are
   * already absent regardless of this flag (`dragTargets` is built only `onDrag ? ... : []`).
   * The frame this component draws in is already fixed regardless of `hideCallouts` — `viewH` is
   * derived from `ROCKER_LIFT_RANGE_IN.max` + `FOIL_THICKNESS_RANGE_IN.max`, the worst case any
   * board can dial in, not from this board's own values — so a box sized to hold it never clips
   * at the extremes. Defaults to `false`. */
  hideCallouts?: boolean;
  /** D-03: `"horizontal"` (nose left, the default) or `"vertical"` (nose up, stations read
   * top-to-bottom). Driven by the toolbar's rotate button, never persisted. */
  orientation?: ViewerOrientation;
  /** D-08: draws the faint plan-view width reference (below) when true and `outlineGeometry` is
   * given. Defaults to `true` so a caller that never wires the toggle still gets the reference. */
  showOutlineReference?: boolean;
  /** D-07/D-08: the drawn outline, sampled through `sampleOutline` to trace the board's own
   * half-width at each station. Optional — a consumer with no outline context (e.g. a future
   * Summary rocker box) simply renders no reference. */
  outlineGeometry?: OutlineGeometry;
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

export function RockerViewer({
  rocker,
  foil,
  length,
  hideCallouts = false,
  orientation = "horizontal",
  showOutlineReference = true,
  outlineGeometry,
  showConstruction = false,
  onDrag,
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
  const viewH = PAD_TOP + maxDeckIn * PX_PER_INCH + BOTTOM_PAD;
  const baselineY = viewH - BOTTOM_PAD;

  // Nose on the left: station = length (nose tip) draws at the frame's left pad; station = 0
  // (tail tip) draws further right. A shorter board's tail simply lands further left, leaving
  // blank frame on the right rather than changing scale.
  const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * PX_PER_INCH;
  const pxY = (heightIn: number) => baselineY - heightIn * PX_PER_INCH;

  const bottomPoints: { x: number; y: number }[] = [];
  const deckPoints: { x: number; y: number }[] = [];
  // The plan-view outline's own half-width at each sampled station, drawn on the SAME axis/scale
  // as the deck curve above — a faint reference behind the board, never a second editable curve.
  const outlineRefPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const stationIn = (lengthIn * i) / SAMPLES;
    const stationMm = inchesToMm(stationIn);
    const rockerLiftIn = mmToInches(sampleRocker(geometry, stationMm));
    const thicknessIn = mmToInches(sampleFoil(foil, length, stationMm));
    bottomPoints.push({ x: pxX(stationIn), y: pxY(rockerLiftIn) });
    deckPoints.push({ x: pxX(stationIn), y: pxY(rockerLiftIn + thicknessIn) });
    if (outlineGeometry) {
      const halfWidthIn = mmToInches(sampleOutline(outlineGeometry, stationMm));
      outlineRefPoints.push({ x: pxX(stationIn), y: pxY(halfWidthIn) });
    }
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

  const outlineRefPath =
    outlineRefPoints.length > 0
      ? [
          `M ${outlineRefPoints[0].x.toFixed(2)} ${outlineRefPoints[0].y.toFixed(2)}`,
          ...outlineRefPoints.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
        ].join(" ")
      : null;

  const noseX = pxX(lengthIn);
  const tailX = pxX(0);

  const stations: {
    key: string;
    name: string;
    stationIn: number;
    rockerValue: string | null;
    thicknessValue: string;
  }[] = [
    {
      key: "tailTip",
      name: "Tail Tip",
      stationIn: 0,
      rockerValue: formatInchesFraction(rocker.tailLift),
      thicknessValue: formatInchesFraction(foil.tailTip),
    },
    {
      key: "tail12",
      name: 'Tail @ 12"',
      stationIn: 12,
      rockerValue: formatInchesFraction(geometry.tailLiftAt12in),
      thicknessValue: formatInchesFraction(foil.tail12),
    },
    {
      key: "center",
      name: "Center",
      stationIn: lengthIn / 2,
      rockerValue: null,
      thicknessValue: formatInchesFraction(foil.center),
    },
    {
      key: "nose12",
      name: 'Nose @ 12"',
      stationIn: lengthIn - 12,
      rockerValue: formatInchesFraction(geometry.noseLiftAt12in),
      thicknessValue: formatInchesFraction(foil.nose12),
    },
    {
      key: "noseTip",
      name: "Nose Tip",
      stationIn: lengthIn,
      rockerValue: formatInchesFraction(rocker.noseLift),
      thicknessValue: formatInchesFraction(foil.noseTip),
    },
  ];

  const railY = baselineY + RAIL_GAP;

  // Canonical (horizontal) viewBox is the drawing exactly as computed above. Rotating the content
  // group `rotate(90)` maps canonical (x, y) -> (-y, x): the station axis (canonical x, spanning
  // [0, VIEW_W]) becomes the new vertical axis running top (nose) to bottom (tail), and the
  // height axis (canonical y, spanning roughly [0, viewH]) becomes the new horizontal axis,
  // negated. So the rotated frame is `-viewH 0 viewH VIEW_W` — width and height swap, and the new
  // minX sits at -viewH to keep every rotated point's x non-negative-bounded (a small blank
  // margin near 0 is the trade, cheaper than measuring the drawn content's exact bounds).
  const viewBox = vertical ? `${(-viewH).toFixed(2)} 0 ${viewH.toFixed(2)} ${VIEW_W}` : `0 0 ${VIEW_W} ${viewH.toFixed(2)}`;
  const vbW = vertical ? viewH : VIEW_W;
  const vbH = vertical ? VIEW_W : viewH;
  const fitScale = useSvgFitScale(svgRef, vbW, vbH);
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
  // handle at both ends), from `geometry.handles`, plus a plain dot at every line's terminus and
  // at the centre knot (the curve's own fixed zero). Every coordinate comes straight off
  // `buildRocker`'s own knots/handles, in the same canonical space pxX/pxY draw everything else
  // in — no formula added here, only projection.
  const constructionLines = geometry.handles.map((h) => ({
    x1: pxX(mmToInches(h.from.x)),
    y1: pxY(mmToInches(h.from.y)),
    x2: pxX(mmToInches(h.to.x)),
    y2: pxY(mmToInches(h.to.y)),
  }));
  const constructionDots = [
    { cx: pxX(mmToInches(geometry.knots[1].point.x)), cy: pxY(mmToInches(geometry.knots[1].point.y)) },
    ...geometry.handles.map((h) => ({ cx: pxX(mmToInches(h.to.x)), cy: pxY(mmToInches(h.to.y)) })),
  ];

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
    const stationIn = lengthIn - (local.x - PAD_X) / PX_PER_INCH;
    const heightIn = (baselineY - local.y) / PX_PER_INCH;
    return { station: inchesToMm(stationIn), height: inchesToMm(heightIn) };
  }

  function handleDragMove(event: ReactPointerEvent<SVGElement>) {
    if (!draggingRef.current || !onDrag) return;
    const boardPoint = toBoardPoint(event);
    if (!boardPoint) return;
    // Every move writes the spec and the redraw arrives back through props — nothing here is
    // cached across renders, which is what keeps the sliders and the datasheet cells in step
    // with the drawing mid-drag.
    onDrag(solveSideProfileDrag(draggingRef.current, boardPoint));
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
        {showOutlineReference && outlineRefPath && (
          <path d={outlineRefPath} fill="none" stroke="var(--outline-station-line)" strokeWidth={1} strokeDasharray="4 3" />
        )}
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
              return (
                <g key={s.key}>
                  <line
                    x1={x}
                    y1={baselineY}
                    x2={x}
                    y2={railY}
                    stroke="var(--outline-station-line)"
                    strokeWidth={1}
                  />
                  <Upright x={x} y={railY} vertical={vertical}>
                    {s.rockerValue !== null && (
                      <text
                        x={x}
                        y={railY + 12}
                        textAnchor="middle"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-body)" }}
                        fill="var(--outline-callout-label)"
                      >
                        R {s.rockerValue}
                      </text>
                    )}
                    <text
                      x={x}
                      y={railY + 26}
                      textAnchor="middle"
                      style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}
                      fill="var(--outline-ink)"
                    >
                      T {s.thicknessValue}
                    </text>
                    <text
                      x={x}
                      y={railY + 40}
                      textAnchor="middle"
                      style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
                      fill="var(--outline-callout-label)"
                    >
                      {s.name}
                    </text>
                  </Upright>
                </g>
              );
            })}
            <Upright x={PAD_X} y={PAD_TOP - 8} vertical={vertical}>
              <text
                x={PAD_X}
                y={PAD_TOP - 8}
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
            {/* Plain marker dots: one at every construction line's terminus, plus one on the
                centre knot — the curve's own fixed zero. Deliberately plain, not a grab target:
                these show the shape, they are not draggable. */}
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
                three-part treatment `outline-viewer.tsx` draws its own drag targets with. Only
                the two tips ever appear here now. pointer-events:none throughout — the
                transparent hit circles below own every pointer interaction. */}
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
