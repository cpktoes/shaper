/**
 * Rocker side-profile viewer.
 *
 * Drawn horizontal, nose on the LEFT (D-03) — this screen's own default, unlike the outline
 * viewer's vertical default. All SVG geometry comes from numbers computed in `lib/geometry`,
 * written into JSX attributes; never string-built markup, and never raw HTML injection (threat
 * T-QO-01, same posture as `outline-viewer.tsx`).
 *
 * 04-01 Task 1 draws the bottom curve only — the rocker line — plus the flat reference surface
 * it is measured from. 04-01 Task 2 adds the deck curve (rocker + foil thickness) on top.
 *
 * Drafting grammar, per `.planning/sketches/MANIFEST.md`: the flat reference line is a faint
 * dashed line drawn only INSIDE the drawn shape's own extent; the rocker/thickness values read
 * out to an output rail below the baseline, outside the shape.
 */

import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import { ROCKER_LIFT_RANGE_IN, sampleRocker, type RockerSpec } from "@/lib/geometry/rocker";
import { formatFeetInches, formatInchesFraction, inchesToMm, type Mm, mmToInches } from "@/lib/geometry/units";

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
/** Room for the output rail's two stacked text lines (value, station name) below the baseline. */
const RAIL_LABEL_HEIGHT = 46;
const BOTTOM_PAD = RAIL_GAP + RAIL_LABEL_HEIGHT;
/** Curve sampling density — enough to read as smooth at this frame's scale, well past the five
 * knots the monotone spline is built from. */
const SAMPLES = 60;

export interface RockerViewerProps {
  rocker: RockerSpec;
  length: Mm;
  /** Suppresses the output rail and board-length label, leaving only the curve, fill and
   * baseline — mirrors `outline-viewer.tsx`'s `hideCallouts`, for a future thumbnail-scale
   * consumer (e.g. a preset card). Defaults to `false`. */
  hideCallouts?: boolean;
}

export function RockerViewer({ rocker, length, hideCallouts = false }: RockerViewerProps) {
  const lengthIn = mmToInches(length);
  const maxLiftIn = ROCKER_LIFT_RANGE_IN.max;
  const viewH = PAD_TOP + maxLiftIn * PX_PER_INCH + BOTTOM_PAD;
  const baselineY = viewH - BOTTOM_PAD;

  // Nose on the left: station = length (nose tip) draws at the frame's left pad; station = 0
  // (tail tip) draws further right. A shorter board's tail simply lands further left, leaving
  // blank frame on the right rather than changing scale.
  const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * PX_PER_INCH;
  const pxY = (liftIn: number) => baselineY - liftIn * PX_PER_INCH;

  const bottomPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const stationIn = (lengthIn * i) / SAMPLES;
    const liftIn = mmToInches(sampleRocker(rocker, length, inchesToMm(stationIn)));
    bottomPoints.push({ x: pxX(stationIn), y: pxY(liftIn) });
  }
  const bottomPath = `M ${bottomPoints.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")}`;

  const noseX = pxX(lengthIn);
  const tailX = pxX(0);

  const stations: { key: string; name: string; stationIn: number; value: string }[] = [
    { key: "tailTip", name: "Tail Tip", stationIn: 0, value: formatInchesFraction(rocker.tailTip) },
    { key: "tail12", name: 'Tail @ 12"', stationIn: 12, value: formatInchesFraction(rocker.tail12) },
    { key: "nose12", name: 'Nose @ 12"', stationIn: lengthIn - 12, value: formatInchesFraction(rocker.nose12) },
    { key: "noseTip", name: "Nose Tip", stationIn: lengthIn, value: formatInchesFraction(rocker.noseTip) },
  ];

  const railY = baselineY + RAIL_GAP;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH.toFixed(2)}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label="Side profile of the board, showing the rocker line"
    >
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
      <path d={bottomPath} fill="none" stroke="var(--outline-ink)" strokeWidth={2} strokeLinejoin="round" />

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
                <text
                  x={x}
                  y={railY + 14}
                  textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}
                  fill="var(--outline-ink)"
                >
                  {s.value}
                </text>
                <text
                  x={x}
                  y={railY + 28}
                  textAnchor="middle"
                  style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
                  fill="var(--outline-callout-label)"
                >
                  {s.name}
                </text>
              </g>
            );
          })}
          <text
            x={PAD_X}
            y={PAD_TOP - 8}
            style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
            fill="var(--outline-ink)"
          >
            {formatFeetInches(length)}
          </text>
        </>
      )}
    </svg>
  );
}
