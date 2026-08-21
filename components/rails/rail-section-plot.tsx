/**
 * Live SVG cross-section plot for one rail section, ported from the prototype's `buildPlot`
 * pixel math (reference/project/Rails.dc.html lines 1027-1147) restricted to a single, always-
 * expanded plot: no `cropXMin`/actual-size handling, no callouts (those belong to the
 * out-of-scope Instructions page). Colours and dot/legend visibility rules live here, since
 * lib/geometry/rail-bands.ts's segments are colour-free (see that module's port-header
 * deviation 4).
 */

import type { RailSectionKey, RailSectionOutput, RailSegmentKey } from "@/lib/geometry/rail-bands";
import { type Mm, mmToInches } from "@/lib/geometry/units";

const SCALE = 56; // px per inch, matches buildPlot's default scale for all output-card plots
const LEFT_PAD = 22;
const AXIS_LABEL_PAD = 20; // room for the x-axis tick labels below the plot

export const RAIL_SEGMENT_COLORS: Record<RailSegmentKey, string> = {
  domedBand: "#6b8e4e",
  band1: "var(--outline-accent)",
  band2: "#b5563a",
  cornerCut: "#4d8a86",
  hardEdge: "#1c1b19",
  tuck1: "#7d5ba6",
  tuck2: "#3a6ea5",
  boardConn: "#1c1b19",
  bottomConn: "#1c1b19",
  railConn: "#1c1b19",
};

const LEGEND_HIDDEN_KEYS = new Set<RailSegmentKey>(["bottomConn", "railConn"]);
const NO_DOT_BASE_KEYS = new Set<RailSegmentKey>(["boardConn", "bottomConn", "railConn"]);

export interface RailLegendEntry {
  label: string;
  color: string;
}

/** Apex Center, then each segment's label except the two hidden connectors, then Tapered Rail
 * Thickness when the section is domed — built from whichever section's output is passed in. */
export function buildRailLegend(output: RailSectionOutput): RailLegendEntry[] {
  const legend: RailLegendEntry[] = [{ label: "Apex Center", color: "#a8425f" }];
  for (const seg of output.segments) {
    if (LEGEND_HIDDEN_KEYS.has(seg.key)) continue;
    legend.push({ label: seg.label, color: RAIL_SEGMENT_COLORS[seg.key] });
  }
  if (output.domed) legend.push({ label: "Tapered Rail Thickness", color: "#6b8e4e" });
  return legend;
}

interface RailSectionPlotProps {
  sectionKey: RailSectionKey;
  output: RailSectionOutput;
  /** The smallest xAxisMin across all open sections, so every plot shares one axis. */
  xAxisMin: Mm;
  /** "width" (default): the SVG sizes from the available width — today's exact, unchanged
   * behaviour. "height": sizes from the available height instead. The Summary dashboard's Rail
   * Plots row is the grid's 15fr row (roughly 100px tall) at a third of the screen's width each —
   * a width-driven plot there wants about twice that height and would overflow the row, so the
   * three compact plots there fit to height instead. */
  fit?: "width" | "height";
}

/**
 * The plot's viewBox bounds and pixel dimensions, computed from the same inputs the SVG render
 * uses. Exported so callers (rail-band-editor.tsx) can learn a section's natural height — driven
 * by its thickness, same as the rendered plot — without duplicating this geometry-free layout
 * math or reaching into `lib/` for it (this is diagram sizing, not shaping geometry).
 */
export function computeRailPlotBounds(output: RailSectionOutput, xAxisMin: Mm) {
  const xAxisMinIn = mmToInches(xAxisMin);
  const yAxisMaxIn = mmToInches(output.bounds.yAxisMax);
  const minX = xAxisMinIn - 0.15;
  const minY = -0.15;
  const maxY = yAxisMaxIn + 0.15;
  const width = (0.15 - minX) * SCALE + LEFT_PAD;
  const height = (maxY - minY) * SCALE + AXIS_LABEL_PAD;
  return { minX, minY, maxY, width, height };
}

export function RailSectionPlot({ output, xAxisMin, fit = "width" }: RailSectionPlotProps) {
  const { result, segments, domed, boardThickness, thicknessEff } = output;
  const blankThicknessIn = domed ? mmToInches(boardThickness) : mmToInches(thicknessEff);

  const { minX, minY, maxY, width, height } = computeRailPlotBounds(output, xAxisMin);
  const xAxisMinIn = minX + 0.15;
  const yAxisMaxIn = maxY - 0.15;
  const px = (x: number) => (x - minX) * SCALE + LEFT_PAD;
  const py = (y: number) => (maxY - y) * SCALE;

  const xGridMin = Math.max(-40, Number.isFinite(Math.floor(xAxisMinIn)) ? Math.floor(xAxisMinIn) : 0);
  const yGridMax = Math.min(40, Number.isFinite(Math.floor(yAxisMaxIn)) ? Math.floor(yAxisMaxIn) : 0);

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i >= xGridMin; i--) gridLines.push({ x1: px(i), y1: py(minY), x2: px(i), y2: py(maxY) });
  for (let j = 0; j <= yGridMax; j++) gridLines.push({ x1: px(xGridMin), y1: py(j), x2: px(0), y2: py(j) });

  const refLines = [
    { x1: px(minX), y1: py(0), x2: px(0.1), y2: py(0) },
    { x1: px(minX), y1: py(blankThicknessIn), x2: px(0.1), y2: py(blankThicknessIn) },
  ];
  const apexLine = { x1: px(0), y1: py(-0.35), x2: px(0), y2: py(blankThicknessIn + 0.35) };

  const segmentLines = segments.map((seg) => ({
    key: seg.key,
    x1: px(mmToInches(seg.p1.x)),
    y1: py(mmToInches(seg.p1.y)),
    x2: px(mmToInches(seg.p2.x)),
    y2: py(mmToInches(seg.p2.y)),
    color: RAIL_SEGMENT_COLORS[seg.key],
  }));

  const noDotKeys = new Set(NO_DOT_BASE_KEYS);
  if (result.hardEdge) noDotKeys.add("hardEdge");
  const dots: { cx: number; cy: number; color: string }[] = [];
  segments.forEach((seg) => {
    if (noDotKeys.has(seg.key)) return;
    const color = RAIL_SEGMENT_COLORS[seg.key];
    dots.push({ cx: px(mmToInches(seg.p1.x)), cy: py(mmToInches(seg.p1.y)), color });
    dots.push({ cx: px(mmToInches(seg.p2.x)), cy: py(mmToInches(seg.p2.y)), color });
  });
  dots.push({ cx: px(0), cy: py(mmToInches(result.apexCenter)), color: "#a8425f" });
  if (domed) {
    const domedBandSeg = segments.find((s) => s.key === "domedBand");
    if (domedBandSeg) dots.push({ cx: px(0), cy: py(mmToInches(domedBandSeg.p1.y)), color: "#6b8e4e" });
  }

  const xTicks: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }[] = [];
  for (let i = 0; i >= xGridMin; i--) {
    xTicks.push({ x1: px(i), y1: py(0) - 4, x2: px(i), y2: py(0) + 4, label: `${Math.abs(i)}`, lx: px(i), ly: py(0) + 16 });
  }
  const yTicks: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }[] = [];
  for (let j = 0; j <= yGridMax; j++) {
    yTicks.push({
      x1: px(minX) - 4,
      y1: py(j),
      x2: px(minX) + 4,
      y2: py(j),
      label: `${j}`,
      lx: px(minX) - 8,
      ly: py(j) + 3,
    });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={
        fit === "height"
          ? { height: "100%", width: "auto", maxWidth: "100%", aspectRatio: `${width} / ${height}` }
          : { width: "100%", aspectRatio: `${width} / ${height}` }
      }
      className="block"
    >
      {gridLines.map((gl, i) => (
        <line key={`g${i}`} x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2} stroke="#ece5d4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {refLines.map((rl, i) => (
        <line key={`r${i}`} x1={rl.x1} y1={rl.y1} x2={rl.x2} y2={rl.y2} stroke="#cbbf9e" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={apexLine.x1} y1={apexLine.y1} x2={apexLine.x2} y2={apexLine.y2} stroke="#cbbf9e" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      {segmentLines.map((sg) => (
        <line key={sg.key} x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke={sg.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
      {dots.map((dt, i) => (
        <circle key={`d${i}`} cx={dt.cx} cy={dt.cy} r={2.75} fill={dt.color} />
      ))}
      {xTicks.map((tk, i) => (
        <g key={`xt${i}`}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="#8a8272" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={tk.lx} y={tk.ly} fontSize={10} fill="#6b6355" textAnchor="middle">
            {tk.label}
          </text>
        </g>
      ))}
      {yTicks.map((tk, i) => (
        <g key={`yt${i}`}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="#8a8272" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={tk.lx} y={tk.ly} fontSize={10} fill="#6b6355" textAnchor="end">
            {tk.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
