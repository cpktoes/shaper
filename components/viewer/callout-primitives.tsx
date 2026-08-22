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

/** Half-length of a `DimensionTick`'s 45-degree slash, in SVG user units. */
export const CALLOUT_TICK_SIZE = 4;
/** Gap left between an extension line's far end and where its value text begins. */
export const CALLOUT_VALUE_GAP = 6;

/**
 * Outline viewer's canonical rails and gutters (sketch 004, "Layout Constants (revision 2)").
 * Every input chip's right edge sits on `OUTLINE_CHIP_RIGHT_X`; every derived value's text starts
 * at `OUTLINE_OUTPUT_VALUE_X`. Neither is ever passed in by a caller.
 */
export const OUTLINE_CHIP_WIDTH = 96;
export const OUTLINE_CHIP_RIGHT_X = 58;
export const OUTLINE_CHIP_HEIGHT = 31;
export const OUTLINE_GUTTER_GAP = 36.5;
export const OUTLINE_OUTPUT_VALUE_X = 282;

/** Widened viewBox (sketch 004) that gives the two gutters room outside the board's own
 * unchanged 340x620 coordinate space — the board's own scale/centreline math never changes. */
export const OUTLINE_VIEW_MIN_X = -50;
export const OUTLINE_VIEW_MIN_Y = -16;
export const OUTLINE_VIEW_WIDTH = 410;
export const OUTLINE_VIEW_HEIGHT = 638;

/** The maximum half-width (in px, from the board's centreline) the outline may render at before
 * it would collide with the output rail's extension lines — `OUTLINE_OUTPUT_VALUE_X` minus the
 * gutter gap minus the board's own centreline x. Callers use this to bound their scale factor
 * instead of picking their own padding constant. */
export function outlineMaxHalfWidthPx(centerlineX: number): number {
  return OUTLINE_OUTPUT_VALUE_X - OUTLINE_GUTTER_GAP - centerlineX;
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
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
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
  const rectX = x - OUTLINE_CHIP_WIDTH;
  const rectY = y - OUTLINE_CHIP_HEIGHT / 2;
  const centerX = x - OUTLINE_CHIP_WIDTH / 2;
  return (
    <g>
      {leaderToX !== undefined && (
        <line x1={x} y1={y} x2={leaderToX} y2={y} stroke="var(--outline-station-line)" strokeWidth={1} />
      )}
      <rect
        x={rectX}
        y={rectY}
        width={OUTLINE_CHIP_WIDTH}
        height={OUTLINE_CHIP_HEIGHT}
        rx={4}
        fill="var(--outline-page-bg)"
        stroke="var(--border)"
      />
      <text
        x={centerX}
        y={y - 2.5}
        textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-sans)", letterSpacing: "0.12em" }}
        fill={nameColor}
      >
        {name}
      </text>
      <text
        x={centerX}
        y={y + 10.5}
        textAnchor="middle"
        style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)" }}
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
}

/** A derived value read out to the shared output rail: extension line from the board edge, a tick
 * at the measured point, the value, and the station name beneath it — every output in the system
 * lands its value at the same `OUTLINE_OUTPUT_VALUE_X`, never a per-call x. */
export function OutputRail({ edgeX, y, value, station }: OutputRailProps) {
  const reachX = OUTLINE_OUTPUT_VALUE_X - CALLOUT_VALUE_GAP;
  return (
    <g>
      <line x1={edgeX} y1={y} x2={reachX} y2={y} stroke="var(--outline-station-line)" strokeWidth={1} />
      <DimensionTick x={edgeX} y={y} color="var(--outline-dim-ink)" />
      <text
        x={OUTLINE_OUTPUT_VALUE_X}
        y={y - 2}
        style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
      <text
        x={OUTLINE_OUTPUT_VALUE_X}
        y={y + 10}
        style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-sans)", letterSpacing: "0.1em" }}
        fill="var(--outline-callout-label)"
      >
        {station}
      </text>
    </g>
  );
}
