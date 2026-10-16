"use client";

import {
  CALLOUT_PX,
  CalloutChipFrame,
  useCalloutSizes,
  useViewerZoomUnit,
} from "@/components/viewer/callout-primitives";
import { CHIP_VALUE_INSET_PX, fitTextSize } from "@/components/viewer/chip-value-fit";
import { WING_CARD_LABEL_PX, WING_CARD_PX, wingCardHeightPx } from "./wing-view-layout";

/** How far the head's name sits below a chip's own name line, in screen px. */
const NAME_NUDGE_PX = 1;
/** The head value's room is divided by this before its value is fitted (see the head below). */
const HEAD_VALUE_ALLOWANCE = 1.05;

/** One labelled row under a card's head: `RUN 1/2"`, `RADIUS 15/16"`, `OFFSET +1/4"`. */
export interface WingDataCardRow {
  key: "run" | "radius" | "offset";
  label: keyof typeof WING_CARD_LABEL_PX;
  value: string;
}

export interface WingDataCardProps {
  /** The card's right edge — every card in the close-up's gutter shares this one x. */
  x: number;
  /** The card's vertical centre. */
  y: number;
  /** `WING 1`, `WING 1 · FIN`, `TAIL @ 12"` — also the `data-callout-chip` hook the specs read. */
  name: string;
  nameColor?: string;
  /** The head's value: `3/8" @ 20 1/2"`, or the tail's width at 12". */
  value: string;
  rows: readonly WingDataCardRow[];
  /** A level leader from the card's right edge to this x (the wing's apex, the board's edge). */
  leaderToX?: number;
  /** Where the leader lands when the card has been spread off its own station: an L, as
   * `CalloutChip`'s. */
  leaderAtY?: number;
}

/**
 * The WINGS close-up's data card (quick 261015-my3, 2026-10-15, D4) — the founder: "Lets put all the
 * wing data in the data cards on the left (add a Run and Radius value to each card and an offset from
 * fin when locked to the fin too)." The close-up only; the VIEWER's WING chips are untouched.
 *
 * Drawn on the system's one card surface (`CalloutChipFrame`), 120 px wide at the pinned callout
 * size, so it reads as the same family as every chip:
 *
 * - **The head**, 32 px — a `CalloutChip`'s, the name 1 px lower: the name (accent ink when the wing is locked)
 *   over the value, both centred, the value set smaller only when it would pass the card less 4 px
 *   a side (the hz7 rule).
 * - **A hairline** across the card under the head, in the frame's own `var(--border)`.
 * - **Rows**, 16 px apart: the label at the left in the chip-name style, the value right-aligned in
 *   the value style, each value fitted to the room its label leaves (`fitTextSize`) — the radius can
 *   reach 64" on a 2"-run, 1/16"-deep wing (F3). Then a 6 px foot.
 *
 * Every pixel size is converted to the drawing's units by the caller's pinned sizes
 * (`sizes.value / CALLOUT_PX.value`), so the card keeps its screen size at any fit and any zoom; the
 * hairline and the leader read the zoom-unit context as the frame does. The close-up is never
 * turned, so there is no orientation handling here.
 */
export function WingDataCard({ x, y, name, nameColor = "var(--outline-callout-label)", value, rows, leaderToX, leaderAtY }: WingDataCardProps) {
  const sizes = useCalloutSizes();
  const u = useViewerZoomUnit();
  /** Drawing units per screen pixel at the pinned size. */
  const k = sizes.value / CALLOUT_PX.value;
  const width = WING_CARD_PX.width * k;
  const height = wingCardHeightPx(rows.length) * k;
  const left = x - width;
  const top = y - height / 2;
  const headCentreY = top + (WING_CARD_PX.head / 2) * k;
  const centreX = x - width / 2;
  // The head's room, less a 5% allowance: on a phone held sideways (the drawing below the pinned
  // floor) Safari drew the two longest values 4.4% wider than the measured table, 1.1 px from the
  // card's edge (quick 261015-my3); the allowance keeps them 4 px of the card inside each side.
  const headValueSize = fitTextSize(value, sizes.value, (width - 2 * CHIP_VALUE_INSET_PX * k) / HEAD_VALUE_ALLOWANCE);
  const nameStyle = { fontSize: sizes.name, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.12em" };
  const inset = WING_CARD_PX.inset * k;

  return (
    <g data-callout-chip={name}>
      {leaderToX !== undefined &&
        (leaderAtY !== undefined && Math.abs(leaderAtY - y) >= 0.5 ? (
          <path
            d={`M ${x} ${y} L ${leaderToX - 12 * u} ${y} L ${leaderToX - 12 * u} ${leaderAtY} L ${leaderToX} ${leaderAtY}`}
            fill="none"
            stroke="var(--outline-station-line)"
            strokeWidth={u}
          />
        ) : (
          <line x1={x} y1={y} x2={leaderToX} y2={y} stroke="var(--outline-station-line)" strokeWidth={u} />
        ))}
      <CalloutChipFrame x={left} y={top} width={width} height={height} />
      <text
        x={centreX}
        // A chip's own name line, 1 px lower: on a chip the name's text box (its font's full ascent)
        // reaches within 0.2 px of the top edge; the card keeps every word's box 1 px inside it.
        y={headCentreY + sizes.stackNameDy + NAME_NUDGE_PX * k}
        textAnchor="middle"
        style={nameStyle}
        fill={nameColor}
      >
        {name}
      </text>
      <text
        x={centreX}
        y={headCentreY + sizes.stackValueDy}
        textAnchor="middle"
        style={{ fontSize: headValueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
      {rows.length > 0 && (
        <line
          data-wing-card-rule
          x1={left}
          y1={top + WING_CARD_PX.head * k}
          x2={x}
          y2={top + WING_CARD_PX.head * k}
          stroke="var(--border)"
          strokeWidth={u}
        />
      )}
      {rows.map((row, i) => {
        // A row's baseline sits so a 14 px value's capitals are centred in its 16 px band.
        const baseline = top + (WING_CARD_PX.head + WING_CARD_PX.row * i + WING_CARD_PX.row / 2 + 0.365 * CALLOUT_PX.value) * k;
        const room = WING_CARD_PX.width - 2 * WING_CARD_PX.inset - WING_CARD_LABEL_PX[row.label] - WING_CARD_PX.labelGap;
        const valueSize = fitTextSize(row.value, CALLOUT_PX.value, room) * k;
        return (
          <g key={row.key} data-wing-card-row={row.key}>
            <text x={left + inset} y={baseline} style={nameStyle} fill="var(--outline-callout-label)">
              {row.label}
            </text>
            <text
              x={x - inset}
              y={baseline}
              textAnchor="end"
              style={{ fontSize: valueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
              fill="var(--outline-ink)"
            >
              {row.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}
