/**
 * Rocker/foil side-profile viewer.
 *
 * Drawn horizontal, nose on the LEFT (D-03) — this screen's own default, unlike the outline
 * viewer's vertical default. All SVG geometry comes from numbers computed in `lib/geometry`,
 * written into JSX attributes; never string-built markup, and never raw HTML injection (threat
 * T-QO-01, same posture as `outline-viewer.tsx`).
 *
 * The board draws as one closed, solid shape — deck-over-bottom construction (D-01): the bottom
 * curve is the rocker line, and the deck curve is the rocker line plus the foil thickness at each
 * sampled station, closed at both tips so the two curves read as a single board silhouette.
 *
 * Drafting grammar, per `.planning/sketches/MANIFEST.md`: the flat reference line is a faint
 * dashed line drawn only INSIDE the drawn shape's own extent; the rocker/thickness values read
 * out to an output rail below the baseline, outside the shape.
 */

import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import { FOIL_THICKNESS_RANGE_IN, sampleFoil, type FoilSpec } from "@/lib/geometry/foil";
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
  /** Suppresses the output rail and board-length label, leaving only the closed board shape and
   * baseline — mirrors `outline-viewer.tsx`'s `hideCallouts`, for a future thumbnail-scale
   * consumer (e.g. a preset card). Defaults to `false`. */
  hideCallouts?: boolean;
}

export function RockerViewer({ rocker, foil, length, hideCallouts = false }: RockerViewerProps) {
  const lengthIn = mmToInches(length);
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
  for (let i = 0; i <= SAMPLES; i++) {
    const stationIn = (lengthIn * i) / SAMPLES;
    const stationMm = inchesToMm(stationIn);
    const rockerLiftIn = mmToInches(sampleRocker(rocker, length, stationMm));
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
      rockerValue: formatInchesFraction(rocker.tailTip),
      thicknessValue: formatInchesFraction(foil.tailTip),
    },
    {
      key: "tail12",
      name: 'Tail @ 12"',
      stationIn: 12,
      rockerValue: formatInchesFraction(rocker.tail12),
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
      rockerValue: formatInchesFraction(rocker.nose12),
      thicknessValue: formatInchesFraction(foil.nose12),
    },
    {
      key: "noseTip",
      name: "Nose Tip",
      stationIn: lengthIn,
      rockerValue: formatInchesFraction(rocker.noseTip),
      thicknessValue: formatInchesFraction(foil.noseTip),
    },
  ];

  const railY = baselineY + RAIL_GAP;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH.toFixed(2)}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label="Side profile of the board, showing the rocker line and deck thickness"
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
