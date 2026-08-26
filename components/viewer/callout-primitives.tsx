"use client";

import { createContext, useContext, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Shared callout-system primitives for the plan-view board viewers (outline-viewer.tsx,
 * fin-viewer.tsx). Diagram layout, not board geometry — deliberately lives under `components/`,
 * not `lib/geometry/`, which is reserved for pure geometry math (CLAUDE.md).
 *
 * Implements the grammar locked in `.planning/sketches/` 001-004 (see MANIFEST.md): dimension
 * callouts read as drafting dimension lines, every one snapped to a fixed rail; inputs are named
 * chips in a left gutter; outputs read out to an aligned right rail. The organising idea (sketch
 * 001's README) is that arbitrary placement is the enemy — a new label must join a rail or define
 * one, never land at a per-call offset. That is why the rail/gutter positions below are module
 * CONSTANTS, not props: nothing in this file accepts an arbitrary x/y gutter offset as an argument.
 */

/**
 * Callout type scale, in SVG user units.
 *
 * These were scattered literals (9, 10, 11, 13) with hand-tuned baseline offsets beside
 * them. They are constants for the same reason the rails below are: the drawing scales
 * uniformly to fit its box, so a size chosen per-call is a size that means something
 * different in every render.
 *
 * Sized up from the original scale after review — the outline drawing is height-bound and
 * was rendering at 0.71, which put dimension values on screen at 9.2px and station names
 * at 6.4px. The stack offsets below are derived from these rather than re-tuned by hand,
 * so the scale stays one edit.
 */
export const CALLOUT_FONT_VALUE = 17;
export const CALLOUT_FONT_NAME = 12;
export const CALLOUT_FONT_DIM = 14;
/** Baseline offsets for a name-over-value stack, derived from the scale above. */
export const CALLOUT_STACK_NAME_DY = -CALLOUT_FONT_VALUE * 0.34;
export const CALLOUT_STACK_VALUE_DY = CALLOUT_FONT_VALUE * 0.76;

/**
 * Target on-screen sizes, in CSS pixels, for a viewer that pins its callout text.
 *
 * The board outline is geometry and must scale with the drawing — a template cannot fake
 * proportion. A dimension *label* is not geometry, it is UI, and should read the same
 * whether the drawing is large or small. Sizes in SVG user units cannot do that: what
 * lands on screen is `units x fitScale`, and each viewer has a different fit scale that
 * moves with window height. Measured at 1280x800 the same callout rendered 18.4px on the
 * outline, 23.9px on fins and 11.2px on the rail plots.
 *
 * `value` matches the data in the tables (`text-sm`), which is what the founder asked
 * these to equal; `name` sits a step below so a chip does not become the loudest thing on
 * the drawing. Both stay under the 18px screen title.
 */
export const CALLOUT_PX = { value: 14, name: 11, dim: 14, chipW: 104, chipH: 32 } as const;

/** Callout metrics in SVG user units, resolved for one viewer's current fit. */
export interface CalloutSizes {
  value: number;
  name: number;
  dim: number;
  chipW: number;
  chipH: number;
  stackNameDy: number;
  stackValueDy: number;
}

/** `CALLOUT_PX` converted into the user units that render at those pixel sizes under `fitScale`. */
export function pinnedCalloutSizes(fitScale: number): CalloutSizes {
  const effective = Math.max(fitScale, MIN_PINNED_FIT_SCALE);
  const u = effective > 0 ? 1 / effective : 1; // user units per CSS pixel
  const value = CALLOUT_PX.value * u;
  return {
    value,
    name: CALLOUT_PX.name * u,
    dim: CALLOUT_PX.dim * u,
    chipW: CALLOUT_PX.chipW * u,
    chipH: CALLOUT_PX.chipH * u,
    stackNameDy: -value * 0.34,
    stackValueDy: value * 0.76,
  };
}

/**
 * The px-per-user-unit an svg's `preserveAspectRatio="…meet"` fit is currently applying.
 *
 * Returns 1 until the element is measured. Callers divide their target pixel sizes by this
 * to counter the drawing's scale.
 */
export function useSvgFitScale(
  ref: RefObject<SVGSVGElement | null>,
  viewBoxWidth: number,
  viewBoxHeight: number,
): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || viewBoxWidth <= 0 || viewBoxHeight <= 0) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = Math.min(rect.width / viewBoxWidth, rect.height / viewBoxHeight);
      // Quantise before storing: sub-pixel jitter from a resize would otherwise re-render
      // every callout on every observer tick for a change nobody can see.
      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, viewBoxWidth, viewBoxHeight]);

  return scale;
}

/** Half-length of a `DimensionTick`'s 45-degree slash, in SVG user units. */
export const CALLOUT_TICK_SIZE = 4;
/** Gap left between an extension line's far end and where its value text begins. */
export const CALLOUT_VALUE_GAP = 6;

/**
 * Outline viewer's canonical rails and gutters (sketch 004, "Layout Constants (revision 2)").
 * Every input chip's right edge sits on `OUTLINE_CHIP_RIGHT_X`; every derived value's text starts
 * at `OUTLINE_OUTPUT_VALUE_X`. Neither is ever passed in by a caller.
 */
export const OUTLINE_CHIP_WIDTH = 112;
export const OUTLINE_CHIP_RIGHT_X = 58;
export const OUTLINE_CHIP_HEIGHT = 38;
export const OUTLINE_GUTTER_GAP = 36.5;
export const OUTLINE_OUTPUT_VALUE_X = 282;

/** The unit-based scale — what a viewer gets when it does not pin its text. */
export const UNPINNED_CALLOUT_SIZES: CalloutSizes = {
  value: CALLOUT_FONT_VALUE,
  name: CALLOUT_FONT_NAME,
  dim: CALLOUT_FONT_DIM,
  chipW: OUTLINE_CHIP_WIDTH,
  chipH: OUTLINE_CHIP_HEIGHT,
  stackNameDy: CALLOUT_STACK_NAME_DY,
  stackValueDy: CALLOUT_STACK_VALUE_DY,
};

const CalloutSizeContext = createContext<CalloutSizes>(UNPINNED_CALLOUT_SIZES);

/** Wraps a viewer's SVG content so every primitive inside reads one resolved size set —
 * `outline-viewer.tsx` alone has a dozen callout call sites, none of which should have to
 * carry sizing props. */
export const CalloutSizeProvider = CalloutSizeContext.Provider;

export function useCalloutSizes(): CalloutSizes {
  return useContext(CalloutSizeContext);
}

/**
 * Which way a viewer's board is currently drawn — vertical (nose up, the canonical layout) or
 * horizontal (nose left, `outline-viewer.tsx`'s Template-only rotation).
 *
 * A context, not a prop, for the same reason `CalloutSizeContext` is: `CalloutChip` and
 * `OutputRail` need to know the rotation to counter-rotate their own text, but nothing about
 * their own call signature should carry it — a per-call orientation argument is one more thing
 * every one of the ~dozen call sites in `outline-viewer.tsx` could get wrong or forget. The
 * default is `"vertical"`, the canonical orientation, so a consumer that never renders inside a
 * `ViewerOrientationProvider` (the fin viewer, today) gets exactly what it got before.
 */
export type ViewerOrientation = "vertical" | "horizontal";

const ViewerOrientationContext = createContext<ViewerOrientation>("vertical");
export const ViewerOrientationProvider = ViewerOrientationContext.Provider;
export function useViewerOrientation(): ViewerOrientation {
  return useContext(ViewerOrientationContext);
}

/** Widened viewBox (sketch 004) that gives the two gutters room outside the board's own
 * unchanged 340x620 coordinate space — the board's own scale/centreline math never changes. */
/* Gutters are wider than the chip strictly needs because a pinned chip grows in user units as
   the fit scale falls (a 104px chip is 104 units at scale 1.0 but 147 at 0.707), and a chip that
   overruns minX is clipped — measured happening at a 560px-tall window with minX at -84. Costs
   nothing: these drawings are height-bound, so horizontal slack never shrinks the board. The
   right gutter carries the same allowance for the output rail's value text. */
export const OUTLINE_VIEW_MIN_X = -104;
export const OUTLINE_VIEW_MIN_Y = -16;
export const OUTLINE_VIEW_WIDTH = 514;

/**
 * Floor on the fit scale used for pinning. Below this a pinned chip would outgrow even the
 * widened gutter above; in a window that short the drawing is small anyway, so letting the
 * callouts scale down with it is a better failure mode than clipping one. Derived from the
 * gutter budget: OUTLINE_CHIP_RIGHT_X - OUTLINE_VIEW_MIN_X, less a small margin, against
 * CALLOUT_PX.chipW.
 */
export const MIN_PINNED_FIT_SCALE = 0.66;
export const OUTLINE_VIEW_HEIGHT = 638;

/** The maximum half-width (in px, from the board's centreline) the outline may render at before
 * it would collide with the output rail's extension lines — `OUTLINE_OUTPUT_VALUE_X` minus the
 * gutter gap minus the board's own centreline x. Callers use this to bound their scale factor
 * instead of picking their own padding constant. */
export function outlineMaxHalfWidthPx(centerlineX: number): number {
  return OUTLINE_OUTPUT_VALUE_X - OUTLINE_GUTTER_GAP - centerlineX;
}

/** The outline drawing's frame: the viewBox plus the two rails everything else hangs off. */
export interface OutlineViewFrame {
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** Shared right edge for every input chip. */
  chipRightX: number;
  /** Shared x where every output value's text begins. */
  outputValueX: number;
  /** How far past the baseline half-width budget this board reaches. Zero for boards that fit. */
  overflow: number;
}

/**
 * The frame for a board of a given drawn half-width.
 *
 * The constants above dimension a board that fits inside `outlineMaxHalfWidthPx` — which, at the
 * board's own 340-unit coordinate space, works out at almost exactly a 19" board. A wider board used
 * to be handled by shrinking the whole drawing to fit, which meant a 25" board rendered 24% SHORTER
 * than a 19" one: uniform scale is right (a template cannot fake proportion) but the frame was
 * sized for one board.
 *
 * So the frame grows instead. The board keeps its length-fit scale at any width, and the overflow
 * pushes the viewBox out on both sides while carrying both rails with it. Every sketch-004
 * relationship is preserved — the gutter gap between the board's edge and each rail is unchanged;
 * there is simply more frame. A board that fits gets `overflow: 0` and the original numbers back,
 * unchanged.
 */
export function outlineViewFrame(halfWidthPx: number, centerlineX: number): OutlineViewFrame {
  const overflow = Math.max(0, halfWidthPx - outlineMaxHalfWidthPx(centerlineX));
  return {
    minX: OUTLINE_VIEW_MIN_X - overflow,
    minY: OUTLINE_VIEW_MIN_Y,
    width: OUTLINE_VIEW_WIDTH + 2 * overflow,
    height: OUTLINE_VIEW_HEIGHT,
    chipRightX: OUTLINE_CHIP_RIGHT_X - overflow,
    outputValueX: OUTLINE_OUTPUT_VALUE_X + overflow,
    overflow,
  };
}

/** A single 45-degree drafting tick, centred on the measured point `(x, y)`. */
export function DimensionTick({
  x,
  y,
  color = "var(--outline-dim-ink)",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <line
      x1={x - CALLOUT_TICK_SIZE}
      y1={y + CALLOUT_TICK_SIZE}
      x2={x + CALLOUT_TICK_SIZE}
      y2={y - CALLOUT_TICK_SIZE}
      stroke={color}
      strokeWidth={1.1}
    />
  );
}

export interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Optional value text, rendered at an explicit position so the caller can place it in a break
   * in the line or outside the ticks when the span is too short to hold it (sketch 001's rule). */
  value?: string;
  labelX?: number;
  labelY?: number;
  labelAnchor?: "start" | "middle" | "end";
  color?: string;
  /** Background colour behind the value, so it reads over the line/board instead of colliding
   * with it — the halo technique standing in for a literal break in the line. */
  haloColor?: string;
}

/** A two-tick drafting dimension line: a straight line between the two measured points, a tick at
 * each end, and an optional value label. Used for fin-viewer's per-mark dimension callouts. */
export function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  value,
  labelX,
  labelY,
  labelAnchor = "middle",
  color = "var(--outline-dim-ink)",
  haloColor,
}: DimensionLineProps) {
  const sizes = useCalloutSizes();
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} />
      <DimensionTick x={x1} y={y1} color={color} />
      <DimensionTick x={x2} y={y2} color={color} />
      {value !== undefined && labelX !== undefined && labelY !== undefined && (
        <text
          x={labelX}
          y={labelY}
          textAnchor={labelAnchor}
          style={{
            fontSize: sizes.dim,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            fill: "var(--outline-ink)",
            ...(haloColor
              ? { textShadow: `0 0 3px ${haloColor}, 0 0 3px ${haloColor}, 0 0 5px ${haloColor}` }
              : {}),
          }}
        >
          {value}
        </text>
      )}
    </g>
  );
}

export interface CalloutChipProps {
  /** The chip's right edge — every chip in a gutter shares this one x, per `OUTLINE_CHIP_RIGHT_X`. */
  x: number;
  /** Vertical centre of the chip. */
  y: number;
  name: string;
  value: string;
  nameColor?: string;
  /** When given, draws a horizontal leader from the chip's right edge to this x at the chip's own
   * y — every input leader in this system is horizontal (sketch 004, decision 5), so there is no
   * y2 parameter to get wrong. Omit for a chip with no single point on the board (e.g. WP offset,
   * grouped under the Widepoint chip instead). */
  leaderToX?: number;
}

/** A named input chip: a bordered box holding a name + value pair, optionally leadered to its
 * target station. Chips carry their own name so no value is ever unlabelled (sketch 004). */
export function CalloutChip({ x, y, name, value, nameColor = "var(--outline-callout-label)", leaderToX }: CalloutChipProps) {
  const sizes = useCalloutSizes();
  const rectX = x - sizes.chipW;
  const rectY = y - sizes.chipH / 2;
  const centerX = x - sizes.chipW / 2;
  return (
    <g>
      {leaderToX !== undefined && (
        <line x1={x} y1={y} x2={leaderToX} y2={y} stroke="var(--outline-station-line)" strokeWidth={1} />
      )}
      <rect
        x={rectX}
        y={rectY}
        width={sizes.chipW}
        height={sizes.chipH}
        rx={4}
        fill="var(--outline-page-bg)"
        stroke="var(--border)"
      />
      <text
        x={centerX}
        y={y + sizes.stackNameDy}
        textAnchor="middle"
        style={{ fontSize: sizes.name, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.12em" }}
        fill={nameColor}
      >
        {name}
      </text>
      <text
        x={centerX}
        y={y + sizes.stackValueDy}
        textAnchor="middle"
        style={{ fontSize: sizes.value, fontWeight: 700, fontFamily: "var(--font-body)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
    </g>
  );
}

export interface OutputRailProps {
  /** Where the value's extension line begins — the board edge at the measured station. */
  edgeX: number;
  y: number;
  value: string;
  station: string;
  /**
   * Where this rail's value text begins. Still one shared rail, never a per-call choice: it must
   * come from the drawing's `OutlineViewFrame`, so every output in a drawing lands on the same x.
   * Defaults to the baseline constant for a board that needs no extra frame.
   */
  valueX?: number;
}

/** A derived value read out to the shared output rail: extension line from the board edge, a tick
 * at the measured point, the value, and the station name beneath it — every output in the system
 * lands its value at the same `OUTLINE_OUTPUT_VALUE_X`, never a per-call x. */
export function OutputRail({ edgeX, y, value, station, valueX = OUTLINE_OUTPUT_VALUE_X }: OutputRailProps) {
  const sizes = useCalloutSizes();
  const reachX = valueX - CALLOUT_VALUE_GAP;
  return (
    <g>
      <line x1={edgeX} y1={y} x2={reachX} y2={y} stroke="var(--outline-station-line)" strokeWidth={1} />
      <DimensionTick x={edgeX} y={y} color="var(--outline-dim-ink)" />
      <text
        x={valueX}
        y={y - 2}
        style={{ fontSize: sizes.value, fontWeight: 700, fontFamily: "var(--font-body)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
      <text
        x={valueX}
        y={y + sizes.name}
        style={{ fontSize: sizes.name, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
        fill="var(--outline-callout-label)"
      >
        {station}
      </text>
    </g>
  );
}
