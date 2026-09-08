"use client";

/**
 * Live SVG cross-section plot for one rail section, ported from the prototype's `buildPlot`
 * pixel math (reference/project/Rails.dc.html lines 1027-1147) restricted to a single, always-
 * expanded plot: no `cropXMin`/actual-size handling. Colours and dot/legend visibility rules live
 * here, since lib/geometry/rail-bands.ts's segments are colour-free (see that module's port-header
 * deviation 4). Callouts (the INSTRUCTIONS tab's named marks, D-17) render through the optional
 * `callouts` prop below — the plot itself stays the single component every rail drawing shares.
 */

import { useRef } from "react";
import type { RailCallout } from "./rail-callouts";
import { CALLOUT_PX, DimensionTick, pinnedCalloutSizes, useSvgFitScale } from "@/components/viewer/callout-primitives";
import { useUnits } from "@/components/units-provider";
import { formatMarkBare } from "@/lib/geometry/measure-display";
import type { RailSectionKey, RailSectionOutput, RailSegmentKey } from "@/lib/geometry/rail-bands";
import { inchesToMm, mm, type Mm, mmToInches, type UnitsSystem } from "@/lib/geometry/units";

// px per inch, matches buildPlot's default scale for all output-card plots. Exported so a caller
// that needs the plot's TRUE physical size (the "View Full Sized" dialog, 08-04) can convert this
// component's own viewBox units back to real inches — `computeRailPlotBounds`'s returned
// width/height are expressed in this same unit, and multiplying that by a measured px-per-inch
// without knowing this constant would either invent a second, possibly-drifting copy of it or
// guess. `LEFT_PAD`/`AXIS_LABEL_PAD` stay module-private: they are chrome padding for the axis
// tick labels, already folded into the same unit space as SCALE, so scaling the whole viewBox
// (width and height together, as the dialog does) reproduces them at the correct physical size
// without a caller ever needing their individual values.
export const SCALE = 56;
const LEFT_PAD = 22;
const AXIS_LABEL_PAD = 20; // room for the x-axis tick labels below the plot

// Room reserved to the right of the apex column for the mark names that read rightward from it
// (D-17), so the widest of them (Domed Taper) sits inside the box instead of being clipped by the
// SVG's own overflow. 96 viewBox units comes from a real measurement, not a guess: on the
// INSTRUCTIONS card the widest right-hand name ended 79 units past the box's 486.8-unit right
// edge, so 96 clears that worst measured case with about 17 units to spare — in the same range as
// the prototype's own comparable allowance (120px of label extent budgeted to the right of the
// apex column when centring the scroll view, Rails.dc.html line 1141).
//
// The caveat worth keeping in mind: the callout font is pinned to a screen-pixel size
// (`pinnedCalloutSizes`), so it grows in viewBox units as the drawing's own fit scale shrinks. 96
// units covers the widest name down to a fit scale of roughly 0.78; the INSTRUCTIONS card sits at
// about 0.89 today.
//
// Exported — unlike its two neighbours above, which stay module-private — so a test can assert
// the exact difference asking for the room makes, instead of restating 96 in a second place. The
// View Full Sized dialog's true-physical-size math is unaffected: that dialog draws no callouts,
// so it never asks for this room (see `computeRailPlotBounds`'s `calloutRoom` option below).
export const CALLOUT_RIGHT_PAD = 96;

// Room reserved BELOW the x-axis tick-label band for the mark names that read below the axis
// (Bottom Tuck 1 and Bottom Tuck 3, D-17), so they sit inside the box instead of being clipped by
// the SVG's own overflow. The arithmetic: two label rows one RAIL_CALLOUT_MIN_GAP (17) apart,
// beneath the existing AXIS_LABEL_PAD (20) band of axis numbers — a first row centred at
// `py(0) + 28` and a second at `py(0) + 45`. The plain box already extends `0.15 * SCALE + 20` ≈
// 28.4 units past the axis, so 34 more puts the box floor at about `py(0) + 62`, leaving the lower
// of the two rows about 11 units of clearance below its own text.
//
// Exported, unlike LEFT_PAD and AXIS_LABEL_PAD, for the same stated reason CALLOUT_RIGHT_PAD is
// exported: so a test can assert the exact difference asking for the room makes, instead of
// restating 34 in a second place.
export const CALLOUT_BOTTOM_PAD = 34;

/**
 * Categorical colours for the rail-band plot. These are signal/data colours held
 * deliberately outside the brand palette — a band's colour identifies *which band it is*,
 * so it must not drift toward meaning "selected" or "warning". The six hues below stay
 * hardcoded for that reason, and all six clear the 3:1 graphical bar on both the light and
 * the dark ground (lowest is tuck1 at 3.44:1 in dark).
 *
 * The four structural keys are the exception, and are not categorical at all: hardEdge and
 * the three `*Conn` connectors draw the board's own edge, which is an *ink* role, not a data
 * hue. They were `#1c1b19`, which is 17.21:1 on white but **1.07:1** on the dark ground —
 * the board outline simply vanished when the dark theme landed. Pointing them at the ink
 * token fixes that and is imperceptible in light (17.21:1 → 18.88:1, both near-black).
 */
export const RAIL_SEGMENT_COLORS: Record<RailSegmentKey, string> = {
  domedBand: "#6b8e4e",
  band1: "var(--color-surf-accent-ink)",
  band2: "#b5563a",
  cornerCut: "#4d8a86",
  hardEdge: "var(--color-surf-ink)",
  tuck1: "#7d5ba6",
  tuck2: "#3a6ea5",
  boardConn: "var(--color-surf-ink)",
  bottomConn: "var(--color-surf-ink)",
  railConn: "var(--color-surf-ink)",
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
  /** Named mark labels (D-17), built by `buildRailCallouts`/`deOverlapCallouts` in
   * `./rail-callouts`. Absent (the default): the plot renders exactly as it always has — the
   * VIEWER tab's three plots are pixel-identical with no callouts. */
  callouts?: RailCallout[];
}

/**
 * The plot's viewBox bounds and pixel dimensions, computed from the same inputs the SVG render
 * uses. Exported so callers (rail-band-editor.tsx) can learn a section's natural height — driven
 * by its thickness, same as the rendered plot — without duplicating this geometry-free layout
 * math or reaching into `lib/` for it (this is diagram sizing, not shaping geometry).
 *
 * The optional `calloutRoom` flag exists for the one caller that draws mark names
 * (`RailSectionPlot`, when it has callouts to render): asking for it adds `CALLOUT_RIGHT_PAD` to
 * the returned `width` and `CALLOUT_BOTTOM_PAD` to the returned `height` — `minX`, `minY` and
 * `maxY` never move, so not one drawn coordinate shifts and `railPlotProjection` is untouched.
 * Every other caller (the VIEWER tab's `rail-band-editor.tsx`, the View Full Sized dialog) omits
 * the option and gets today's exact box, unchanged.
 */
export function computeRailPlotBounds(output: RailSectionOutput, xAxisMin: Mm, options?: { calloutRoom?: boolean }) {
  const xAxisMinIn = mmToInches(xAxisMin);
  const yAxisMaxIn = mmToInches(output.bounds.yAxisMax);
  const minX = xAxisMinIn - 0.15;
  const minY = -0.15;
  const maxY = yAxisMaxIn + 0.15;
  const width = (0.15 - minX) * SCALE + LEFT_PAD + (options?.calloutRoom ? CALLOUT_RIGHT_PAD : 0);
  const height = (maxY - minY) * SCALE + AXIS_LABEL_PAD + (options?.calloutRoom ? CALLOUT_BOTTOM_PAD : 0);
  return { minX, minY, maxY, width, height };
}

/**
 * The exact inches-to-pixel projection the component's own `px()`/`py()` closures use, exported
 * so a caller building callouts (`rail-instructions.tsx` via `buildRailCallouts`) computes anchor
 * positions in the SAME pixel space the plot itself draws in, rather than a second projection that
 * could drift from this one.
 */
export function railPlotProjection(output: RailSectionOutput, xAxisMin: Mm): { px: (xIn: number) => number; py: (yIn: number) => number } {
  const { minX, maxY } = computeRailPlotBounds(output, xAxisMin);
  return {
    px: (x: number) => (x - minX) * SCALE + LEFT_PAD,
    py: (y: number) => (maxY - y) * SCALE,
  };
}

/** A grid/axis tick, expressed in the same display domain (inches) the component's own `px()`/
 * `py()` pixel projection already works in — so the projection code stays completely local to the
 * component and unchanged by this function's Metric branch. */
export interface RailPlotTick {
  value: number;
  label: string;
}

export interface RailPlotGrid {
  /** Vertical grid-line x positions (inches domain), from the apex (0) outward to the leftmost
   * line — descending, matching the order the component's own loop drew them in before this
   * extraction. */
  xGridPositions: number[];
  /** Horizontal grid-line y positions (inches domain), from the bottom (0) upward — ascending. */
  yGridPositions: number[];
  /** The leftmost vertical grid-line position — horizontal grid lines span from here to the apex
   * (x=0), exactly as the component's own render loop already spans them. */
  xGridMin: number;
  xTicks: RailPlotTick[];
  yTicks: RailPlotTick[];
}

// Sanity ceiling only (today's inline `40`/`-40` literals) — stops the grid running away on an
// extreme section; never a binding constraint in practice.
const MAX_GRID_EXTENT_IN = 40;

/**
 * The rail plot's grid pitch and tick labels (D-11) — the one place in this phase where Metric is
 * a real algorithm change, not a formatter swap. Extracted so it is callable from a test without
 * rendering React; works entirely in the DISPLAY domain (inches) `px()`/`py()` already expect, so
 * the caller's pixel projection is completely unchanged — only the positions and labels handed
 * back differ per system.
 *
 * Imperial reproduces today's exact loop and clamp: one grid line and tick per whole inch inside
 * the same `[-40, 40]` sanity ceiling, labelled with today's bare absolute number, no unit shown.
 *
 * Metric iterates on a 10mm pitch across the SAME physical bounds — converted with
 * `mmToInches`/`inchesToMm` rather than restating a factor (CLAUDE.md Rule 2), never touching the
 * bounds themselves — labelling each tick with its absolute millimetre value through
 * `formatMarkBare` (a tick's position is a real physical length, the same "mark" family every rail
 * band mark reads in, so it flows through the same display boundary rather than a hand-rolled
 * `String(v)`), and appending `" mm"` to the first non-zero tick outward from the origin on each
 * axis (the UI-SPEC's own assumption for where a shaper's eye starts reading outward from the
 * board's corner).
 */
export function buildRailPlotGrid(
  bounds: { minX: number; minY: number; maxY: number },
  system: UnitsSystem,
): RailPlotGrid {
  const xAxisMinIn = bounds.minX + 0.15;
  const yAxisMaxIn = bounds.maxY - 0.15;

  if (system === "imperial") {
    const xGridMin = Math.max(-MAX_GRID_EXTENT_IN, Number.isFinite(Math.floor(xAxisMinIn)) ? Math.floor(xAxisMinIn) : 0);
    const yGridMax = Math.min(MAX_GRID_EXTENT_IN, Number.isFinite(Math.floor(yAxisMaxIn)) ? Math.floor(yAxisMaxIn) : 0);
    const xGridPositions: number[] = [];
    for (let i = 0; i >= xGridMin; i--) xGridPositions.push(i);
    const yGridPositions: number[] = [];
    for (let j = 0; j <= yGridMax; j++) yGridPositions.push(j);
    return {
      xGridPositions,
      yGridPositions,
      xGridMin,
      xTicks: xGridPositions.map((i) => ({ value: i, label: `${Math.abs(i)}` })),
      yTicks: yGridPositions.map((j) => ({ value: j, label: `${j}` })),
    };
  }

  const xAxisMinMm = inchesToMm(xAxisMinIn);
  const yAxisMaxMm = inchesToMm(yAxisMaxIn);
  const maxExtentMm = inchesToMm(MAX_GRID_EXTENT_IN);
  const xGridMinMm = Number.isFinite(xAxisMinMm)
    ? Math.max(-maxExtentMm, Math.floor(xAxisMinMm / 10) * 10)
    : 0;
  const yGridMaxMm = Number.isFinite(yAxisMaxMm)
    ? Math.min(maxExtentMm, Math.floor(yAxisMaxMm / 10) * 10)
    : 0;

  const xPositionsMm: number[] = [];
  for (let i = 0; i >= xGridMinMm; i -= 10) xPositionsMm.push(i);
  const yPositionsMm: number[] = [];
  for (let j = 0; j <= yGridMaxMm; j += 10) yPositionsMm.push(j);

  // The first non-zero tick outward from the origin on each axis — [ASSUMPTION] per the UI-SPEC,
  // chosen because it's the tick nearest where a shaper's eye starts reading outward from the
  // board's corner. Both arrays are ordered from 0 outward, so this is simply the first non-zero
  // element.
  const firstNonZeroX = xPositionsMm.find((v) => v !== 0);
  const firstNonZeroY = yPositionsMm.find((v) => v !== 0);

  // Bare mm labels route through the display boundary's own `formatMarkBare` — a tick's absolute
  // position is a real physical length on the board, the same "mark" family every rail band mark
  // reads in — rather than a hand-rolled `String(v)` that would drift out of step with how every
  // other mm-family bare number in the app is produced.
  return {
    xGridPositions: xPositionsMm.map((v) => mmToInches(mm(v))),
    yGridPositions: yPositionsMm.map((v) => mmToInches(mm(v))),
    xGridMin: mmToInches(mm(xGridMinMm)),
    xTicks: xPositionsMm.map((v) => {
      const bare = formatMarkBare(mm(Math.abs(v)), "metric");
      return { value: mmToInches(mm(v)), label: v === firstNonZeroX ? `${bare} mm` : bare };
    }),
    yTicks: yPositionsMm.map((v) => {
      const bare = formatMarkBare(mm(Math.abs(v)), "metric");
      return { value: mmToInches(mm(v)), label: v === firstNonZeroY ? `${bare} mm` : bare };
    }),
  };
}

export function RailSectionPlot({ output, xAxisMin, fit = "width", callouts }: RailSectionPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { system } = useUnits();
  const { result, segments, domed, boardThickness, thicknessEff } = output;
  const blankThicknessIn = domed ? mmToInches(boardThickness) : mmToInches(thicknessEff);

  const { minX, minY, maxY, width, height } = computeRailPlotBounds(output, xAxisMin, {
    calloutRoom: !!callouts && callouts.length > 0,
  });
  const px = (x: number) => (x - minX) * SCALE + LEFT_PAD;
  const py = (y: number) => (maxY - y) * SCALE;

  const grid = buildRailPlotGrid({ minX, minY, maxY }, system);

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const i of grid.xGridPositions) gridLines.push({ x1: px(i), y1: py(minY), x2: px(i), y2: py(maxY) });
  for (const j of grid.yGridPositions) gridLines.push({ x1: px(grid.xGridMin), y1: py(j), x2: px(0), y2: py(j) });

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

  const xTicks: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }[] =
    grid.xTicks.map((tick) => ({
      x1: px(tick.value),
      y1: py(0) - 4,
      x2: px(tick.value),
      y2: py(0) + 4,
      label: tick.label,
      lx: px(tick.value),
      ly: py(0) + 16,
    }));
  const yTicks: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }[] =
    grid.yTicks.map((tick) => ({
      x1: px(minX) - 4,
      y1: py(tick.value),
      x2: px(minX) + 4,
      y2: py(tick.value),
      label: tick.label,
      lx: px(minX) - 8,
      ly: py(tick.value) + 3,
    }));

  // Axis tick labels counter the plot's fit so they read at the same on-screen size as every
  // other callout in the app, rather than tracking however wide the plot happens to render.
  const fitScale = useSvgFitScale(svgRef, width, height);
  const axisFontSize = fitScale > 0 ? CALLOUT_PX.name / fitScale : 10;
  // Mark-name callouts (D-17) pin to the same Label-role size the plot's own axis ticks already
  // use, via the shared primitive rather than a second ad-hoc ternary.
  const calloutFontSize = pinnedCalloutSizes(fitScale).name;
  const CALLOUT_TEXT_GAP = 4;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={
        fit === "height"
          ? { height: "100%", width: "auto", maxWidth: "100%", aspectRatio: `${width} / ${height}` }
          : { width: "100%", aspectRatio: `${width} / ${height}` }
      }
      className="block"
    >
      {gridLines.map((gl, i) => (
        <line key={`g${i}`} x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2} stroke="color-mix(in srgb, var(--color-surf-ink-muted) 12%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {refLines.map((rl, i) => (
        <line key={`r${i}`} x1={rl.x1} y1={rl.y1} x2={rl.x2} y2={rl.y2} stroke="color-mix(in srgb, var(--color-surf-ink-muted) 30%, transparent)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={apexLine.x1} y1={apexLine.y1} x2={apexLine.x2} y2={apexLine.y2} stroke="color-mix(in srgb, var(--color-surf-ink-muted) 30%, transparent)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      {segmentLines.map((sg) => (
        <line key={sg.key} x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke={sg.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
      {dots.map((dt, i) => (
        <circle key={`d${i}`} cx={dt.cx} cy={dt.cy} r={2.75} fill={dt.color} />
      ))}
      {xTicks.map((tk, i) => (
        <g key={`xt${i}`}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="var(--color-surf-ink-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={tk.lx} y={tk.ly} fontSize={axisFontSize} fill="var(--color-surf-ink-muted)" textAnchor="middle">
            {tk.label}
          </text>
        </g>
      ))}
      {yTicks.map((tk, i) => (
        <g key={`yt${i}`}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="var(--color-surf-ink-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={tk.lx} y={tk.ly} fontSize={axisFontSize} fill="var(--color-surf-ink-muted)" textAnchor="end">
            {tk.label}
          </text>
        </g>
      ))}
      {callouts?.map((c) => {
        // side 1 (Apex, Domed Taper, Rail Mk1, Corner Cut, Tuck 1) sits near the apex (x=0, the
        // drawing's rightmost structure) and reads rightward from its own point; side -1 (every
        // deck/bottom-tuck-2 mark, further left) reads leftward, back toward the plot's own left
        // margin; side 0 (Bottom Tuck 1, Bottom Tuck 3) reads centred BELOW the x-axis, joined to
        // its own mark by a thin leader line rather than the drafting-tick either side draws.
        const isBelow = c.side === 0;
        const textAnchor = isBelow ? "middle" : c.side > 0 ? "start" : "end";
        const textX = isBelow ? c.x : c.side > 0 ? c.x + CALLOUT_TEXT_GAP : c.x - CALLOUT_TEXT_GAP;
        // The start gap clears the mark's own coloured dot; the end gap clears the cap height of a
        // name whose `y` is its vertical middle. The `?? c.x`/`?? c.y` fallbacks let this render
        // compile and pass on its own, before `buildRailCallouts` (Task 2) starts populating
        // `anchorX`/`anchorY` — they are never exercised once that task lands.
        const CALLOUT_LEADER_START_GAP = 2;
        const CALLOUT_LEADER_END_GAP = 7;
        return (
          <g key={c.key}>
            {isBelow ? (
              <line
                x1={c.anchorX ?? c.x}
                y1={(c.anchorY ?? c.y) + CALLOUT_LEADER_START_GAP}
                x2={c.x}
                y2={c.y - CALLOUT_LEADER_END_GAP}
                stroke={c.color}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <DimensionTick x={c.x} y={c.y} color={c.color} />
            )}
            <text
              x={textX}
              y={c.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fill={c.color}
              style={{
                fontSize: calloutFontSize,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 3px var(--outline-page-bg), 0 0 3px var(--outline-page-bg), 0 0 5px var(--outline-page-bg)",
              }}
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
