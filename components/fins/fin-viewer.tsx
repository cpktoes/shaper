"use client";

/**
 * The dimensioned tail diagram — the only place `buildFinMark`'s dimension-arrow layout lives
 * (deviation 3 in lib/geometry/fins.ts: this is diagram layout in a fixed 530x370 pixel space,
 * not board geometry). Ported from reference/project/Fins.dc.html lines 845-942 (`buildFinMark`
 * geometry), 1133-1162 (the tier-stacking pass that precedes it) and 379-446 (the VIEWER markup).
 *
 * `buildFinMark`'s tier-stacking pass groups dimension kinds by the prototype's `finSetup`
 * directly. This component instead groups by the distinct `FinRole`s actually present in
 * `result.marks` — functionally identical for every real configuration, with one narrow,
 * cosmetics-only difference: the prototype always reserves a phantom "stringer" tier for a quad
 * with the Basic-Off-Rail rear model (whose rear pair is actually `'rail'`-kind), which this
 * port does not reserve. No layout ever overlaps either way; the only effect is marginally
 * tighter horizontal spacing in that one case.
 *
 * Callout grammar follows the system locked in `.planning/sketches/` 001-004: this page shows
 * outputs only (fin positions from tail, toe, off-rail) — the tail-width input already lives in
 * the sidebar, so its label pair is not repeated here. Every dimension line is ticked with the
 * shared `DimensionTick` primitive instead of an arrowhead marker, every callout leader/extension/
 * dimension line is solid ink (no more ad hoc dashes), and the two reference lines (the centreline
 * and the tail-width-12" line) use the two shared dash tokens instead of both reusing one
 * non-descript pattern. All labels are SVG `<text>` — there is no absolutely-positioned HTML
 * overlay. The one dash that survives outside this system is the fin mark's own line, which stays
 * keyed to `result.legend`'s Front/Rear/Center dash — see the inline comment at that line.
 */

import { useMemo } from "react";
import type { FinMark, FinPlacementResult, FinRole, FinTailShape, FinLateralKind } from "@/lib/geometry/fins";
import { tailHalfWidthAt, tailOffTailAtHalfWidth, tailOutlineHalfPoints } from "@/lib/geometry/fins";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";
import type { Point2D } from "@/lib/geometry/board";
import { DimensionTick } from "@/components/viewer/callout-primitives";

const SCALE = 14;
const ORIGIN_X = 260;
const TAIL_Y = 320;
const VIEW_TOP_MARGIN = 0.6;

/**
 * The drawing frame.
 *
 * `VIEW_MIN_Y` is negative because the drawing's own top edge is: `svgTopY` works out at -7.6 for
 * every board (all four terms above are constants), the tail outline's stroke reaches about -15.7,
 * and the compact heading sits higher again at roughly -25. A viewBox starting at zero clipped all
 * three — on the Summary the heading was never visible at all. The value below clears the highest
 * of them with margin to spare, including room for `--summary-font-label` being restyled for print.
 */
const VIEW_MIN_Y = -36;
const VIEW_WIDTH = 530;
const VIEW_HEIGHT = 370 - VIEW_MIN_Y;
/** The halo colour behind callout text, so it reads over the tinted board fill instead of
 * colliding with the line it sits on — the halo stands in for a literal break in the line.
 * Matches the white viewer-card background this diagram always sits on. */
const HALO = "var(--background)";
/** Small correction so a label's SVG baseline lands roughly where a CSS `-50%` vertical
 * transform used to centre it. */
const LABEL_BASELINE_NUDGE = 4;

function toPxX(xIn: number): number {
  return ORIGIN_X + xIn * SCALE;
}
function toPxY(offTailIn: number): number {
  return TAIL_Y - offTailIn * SCALE;
}

/** Ported from `catmullPath` (Fins.dc.html lines 753-766). */
function catmullPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function buildOutlinePaths(
  shape: FinTailShape,
  tailWidth12: Mm,
  outlineOverride?: { points: Point2D[]; connector: Point2D | null },
): { filled: string; open: string } {
  const { points, connector } = outlineOverride ?? tailOutlineHalfPoints(shape, tailWidth12);
  const mapPt = (p: Point2D): [number, number] => [toPxX(mmToInches(p.x)), toPxY(mmToInches(p.y))];
  const negSide = points
    .slice()
    .reverse()
    .map((p) => ({ x: mm(-p.x), y: p.y }));
  const negMapped = negSide.map(mapPt);
  const posMapped = points.map(mapPt);
  let d = catmullPath(negMapped);
  if (connector) {
    const cm = mapPt(connector);
    d += ` L ${cm[0].toFixed(2)} ${cm[1].toFixed(2)}`;
  }
  d += ` L ${posMapped[0][0].toFixed(2)} ${posMapped[0][1].toFixed(2)}`;
  const posPath = catmullPath(posMapped);
  d += posPath.substring(posPath.indexOf(" C"));
  return { filled: `${d} Z`, open: d };
}

interface PlainDim {
  kind: "plain";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  extTopX1: number;
  extTopX2: number;
  extTopY: number;
  extBotX1: number;
  extBotX2: number;
  extBotY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  text: string;
}
interface BelowDim {
  kind: "below";
  extLeftX: number;
  extLeftY1: number;
  extLeftY2: number;
  extRightX: number;
  extRightY1: number;
  extRightY2: number;
  dimX1: number;
  dimX2: number;
  dimY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  text: string;
}
interface RailVDim {
  kind: "railV";
  x1: number;
  y1: number;
  x2a: number;
  x2b: number;
  extAX: number;
  extBX: number;
  extY1: number;
  extY2: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  text: string;
}
type FinDim = PlainDim | BelowDim | RailVDim;

interface MarkGeom {
  mark: FinMark;
  teX: number;
  teY: number;
  leX: number;
  leY: number;
}

const KIND_ORDER: FinLateralKind[] = ["none", "stringer", "rail"];

/** Ported from the tier-stacking pass (Fins.dc.html lines 1133-1162), grouped by FinRole — see
 * the header note above for the one narrow difference from the prototype's own setup-driven
 * grouping. */
function useSharedTierLayout(marks: FinMark[], tailShape: FinTailShape, tailWidth12: Mm) {
  return useMemo(() => {
    const rolesPresent = Array.from(new Set(marks.map((m) => m.role))) as FinRole[];
    const roleReps = rolesPresent
      .map((role) => marks.find((m) => m.role === role))
      .filter((m): m is FinMark => m !== undefined);

    const kindsPresent = KIND_ORDER.filter((k) => roleReps.some((m) => m.lateralKind === k));
    const tierRank: Partial<Record<FinLateralKind, number>> = {};
    kindsPresent.forEach((k, i) => {
      tierRank[k] = i;
    });
    const maxLeftTier = Math.max(0, kindsPresent.length - 1);

    const offTailsIn = roleReps.map((m) => mmToInches(m.offTail));
    const sharedMaxOffTailIn = offTailsIn.length ? Math.max(...offTailsIn) : 0;

    let sharedBoundaryPx = 0;
    for (let i = 0; i <= 6; i++) {
      const yIn = (sharedMaxOffTailIn * i) / 6;
      const hwIn = mmToInches(tailHalfWidthAt(tailShape, tailWidth12, inchesToMm(yIn)));
      sharedBoundaryPx = Math.max(sharedBoundaryPx, hwIn * SCALE);
    }
    const availableSpan = Math.max(0, ORIGIN_X - sharedBoundaryPx - 4 - 70);
    const leftTierStackPx = maxLeftTier > 0 ? Math.min(55, availableSpan / maxLeftTier) : 0;

    return { tierRank, sharedBoundaryPx, leftTierStackPx, maxLeftTier };
  }, [marks, tailShape, tailWidth12]);
}

/** Ported from `buildFinMark`'s dimension branches (Fins.dc.html lines 845-942, minus the
 * tier-stacking pass which lives in `useSharedTierLayout` above). */
function dimsForMark(
  geom: MarkGeom,
  tailShape: FinTailShape,
  tailWidth12: Mm,
  tierRank: Partial<Record<FinLateralKind, number>>,
  sharedBoundaryPx: number,
  leftTierStackPx: number,
  maxLeftTier: number,
): FinDim[] {
  const { mark, teX, teY, leX, leY } = geom;
  const dims: FinDim[] = [];
  const offTailIn = mmToInches(mark.offTail);
  const w12In = mmToInches(tailWidth12);
  const toeDisplay = formatInchesFraction(mark.toe, 16);
  const lateralValueDisplay = mark.lateralValue !== null ? formatInchesFraction(mark.lateralValue, 16) : "";
  const offTailDisplay = formatInchesFraction(mark.offTail, 16);
  const dimsSide: -1 | 1 = mark.role === "rear" ? 1 : -1;

  if (mark.side === dimsSide || mark.side === 0) {
    const tier = tierRank[mark.lateralKind] ?? 0;
    const GAP = 4;
    let boundaryPx = sharedBoundaryPx + tier * leftTierStackPx;
    if (offTailIn >= 9 && offTailIn <= 15) {
      boundaryPx = Math.min(
        Math.max(boundaryPx, (w12In / 2 + 0.4) * SCALE + tier * leftTierStackPx + leftTierStackPx),
        ORIGIN_X - GAP - 70,
      );
    }
    const dimX = ORIGIN_X - boundaryPx - GAP;
    // Centers the position-callout label on its own dimension line regardless of how many
    // tiers are actually stacked (fixed 01-04 checkpoint feedback: the ported prototype
    // formula `(tier - 1) * 20` assumed a line was always drawn among >=2 tiers, so the
    // common single-tier case landed the label a full 20px off the line's true midpoint).
    // Offsetting around the tier set's own midpoint keeps the multi-tier anti-overlap stagger
    // (still +/-20px apart at the extremes) while landing perfectly centered when there is
    // only one tier.
    const midY = (TAIL_Y + teY) / 2 + (tier - maxLeftTier / 2) * 20;
    const topEdgeXIn = mmToInches(tailHalfWidthAt(tailShape, tailWidth12, mm(0)));
    const topEdgeX = ORIGIN_X - topEdgeXIn * SCALE;
    const botEdgeXIn = mmToInches(tailHalfWidthAt(tailShape, tailWidth12, mark.offTail));
    const botEdgeX = ORIGIN_X - botEdgeXIn * SCALE;
    dims.push({
      kind: "plain",
      x1: dimX,
      y1: TAIL_Y,
      x2: dimX,
      y2: teY,
      extTopX1: dimX,
      extTopX2: Math.max(dimX, topEdgeX),
      extTopY: TAIL_Y,
      extBotX1: dimX,
      extBotX2: Math.max(dimX, botEdgeX),
      extBotY: teY,
      labelX: dimX - 4,
      labelY: midY + LABEL_BASELINE_NUDGE,
      labelAnchor: "end",
      text: offTailDisplay,
    });
  }

  if (mark.lateralKind === "stringer" && mark.side === -1 && toeDisplay) {
    const aboveRowY = Math.min(teY, leY) - 16;
    const midXAbove = (teX + leX) / 2;
    dims.push({
      kind: "below",
      extLeftX: teX,
      extLeftY1: teY - 3,
      extLeftY2: aboveRowY - 4,
      extRightX: leX,
      extRightY1: leY - 3,
      extRightY2: aboveRowY - 4,
      dimX1: teX,
      dimX2: leX,
      dimY: aboveRowY,
      labelX: midXAbove,
      labelY: aboveRowY - 13 + LABEL_BASELINE_NUDGE,
      labelAnchor: "middle",
      text: toeDisplay,
    });
  }

  if (mark.lateralKind === "stringer" && mark.side === 1) {
    // dimRowOffset is always 38 in the prototype: it's only ever passed for the quad rear pair,
    // the sole role whose lateralKind is 'stringer'.
    const rowY = TAIL_Y + 38;
    const midX = (ORIGIN_X + teX) / 2;
    const edgeOffTailRightIn = mmToInches(tailOffTailAtHalfWidth(tailShape, tailWidth12, mark.lateral));
    const edgeYRight = TAIL_Y - edgeOffTailRightIn * SCALE;
    dims.push({
      kind: "below",
      extLeftX: ORIGIN_X,
      extLeftY1: TAIL_Y,
      extLeftY2: rowY + 4,
      extRightX: teX,
      extRightY1: edgeYRight,
      extRightY2: rowY + 4,
      dimX1: ORIGIN_X,
      dimX2: teX,
      dimY: rowY,
      labelX: midX,
      labelY: rowY - 13 + LABEL_BASELINE_NUDGE,
      labelAnchor: "middle",
      text: lateralValueDisplay,
    });
  }

  if (mark.lateralKind === "rail" && mark.side === -1 && toeDisplay) {
    const aboveRowY = Math.min(teY, leY) - 16;
    const midXAbove = (teX + leX) / 2;
    dims.push({
      kind: "below",
      extLeftX: teX,
      extLeftY1: teY - 3,
      extLeftY2: aboveRowY - 4,
      extRightX: leX,
      extRightY1: leY - 3,
      extRightY2: aboveRowY - 4,
      dimX1: teX,
      dimX2: leX,
      dimY: aboveRowY,
      labelX: midXAbove,
      labelY: aboveRowY - 13 + LABEL_BASELINE_NUDGE,
      labelAnchor: "middle",
      text: toeDisplay,
    });
  }

  if (mark.lateralKind === "rail" && mark.side === 1) {
    const edgeHwIn = mmToInches(tailHalfWidthAt(tailShape, tailWidth12, mark.offTail));
    const edgeHwPx = edgeHwIn * SCALE;
    const railEdgeX = ORIGIN_X + edgeHwPx;
    const GAP2 = 4;
    const STACK2 = 14;
    let railEnd = ORIGIN_X + edgeHwPx + GAP2;
    if (offTailIn >= 9 && offTailIn <= 15) {
      railEnd = Math.max(railEnd, ORIGIN_X + (w12In / 2 + 0.4) * SCALE + STACK2 + GAP2 + 65);
    }
    dims.push({
      kind: "railV",
      x1: railEnd,
      y1: teY,
      x2a: railEdgeX,
      x2b: teX,
      extAX: railEdgeX,
      extBX: teX,
      extY1: teY - 4,
      extY2: teY + 4,
      labelX: railEnd + 4,
      labelY: teY + LABEL_BASELINE_NUDGE,
      labelAnchor: "start",
      text: lateralValueDisplay,
    });
  }

  return dims;
}

interface FinViewerProps {
  result: FinPlacementResult;
  tailShape: FinTailShape;
  tailWidth12: Mm;
  showCallouts: boolean;
  /** The real designed outline (from the shared design store), drawn behind the fin marks in
   * place of the polynomial tail-shape fallback, when the fins screen is importing template
   * values. `null`/`undefined` falls back to `tailOutlineHalfPoints`. */
  outlineOverride?: { points: Point2D[]; connector: Point2D | null } | null;
  /** Embedding-only display used by the Summary dashboard's Fin Placement card (Fins.dc.html
   * lines 25-72, 1363-1373): drops the legend column, adds a top-centre length heading, and
   * shrinks the dimension callouts to the shared `--summary-font-*` scale. Defaults to `false`,
   * the Fins screen's own unchanged full viewer. */
  compact?: boolean;
  /** The board length, needed only for the compact heading's `6'0" · 12 1/4" tail` text
   * (`compactLengthText`, Fins.dc.html line 1364). Unused when `compact` is `false`. */
  boardLength?: Mm;
}

export function FinViewer({
  result,
  tailShape,
  tailWidth12,
  showCallouts,
  outlineOverride,
  compact = false,
  boardLength,
}: FinViewerProps) {
  const { filled, open } = useMemo(
    () => buildOutlinePaths(tailShape, tailWidth12, outlineOverride ?? undefined),
    [tailShape, tailWidth12, outlineOverride],
  );

  const marksGeom: MarkGeom[] = useMemo(
    () =>
      result.marks.map((mark) => ({
        mark,
        teX: toPxX(mmToInches(mark.lateral)),
        teY: toPxY(mmToInches(mark.offTail)),
        leX: toPxX(mmToInches(mark.leadingLateral)),
        leY: toPxY(mmToInches(mark.leadingOffTail)),
      })),
    [result.marks],
  );

  const { tierRank, sharedBoundaryPx, leftTierStackPx, maxLeftTier } = useSharedTierLayout(
    result.marks,
    tailShape,
    tailWidth12,
  );

  const marksWithDims = useMemo(
    () =>
      marksGeom.map((geom) => ({
        geom,
        dims: dimsForMark(geom, tailShape, tailWidth12, tierRank, sharedBoundaryPx, leftTierStackPx, maxLeftTier),
      })),
    [marksGeom, tailShape, tailWidth12, tierRank, sharedBoundaryPx, leftTierStackPx, maxLeftTier],
  );

  const w12In = mmToInches(tailWidth12);
  const svgTopY = TAIL_Y - (24 - VIEW_TOP_MARGIN) * SCALE;
  const w12LineY = TAIL_Y - 12 * SCALE;
  const w12LineX1 = ORIGIN_X - (w12In / 2) * SCALE;
  const w12LineX2 = ORIGIN_X + (w12In / 2) * SCALE;

  const valueFontSize = compact ? "var(--summary-font-callout, 10px)" : 14;

  return (
    // `h-full` as well as `flex-1`: the Summary card's body is a block, not a flex container, so
    // flex-1 alone resolves to zero height there. It went unnoticed while the svg carried an
    // intrinsic size and propped the height up from below.
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center gap-4">
      {/* The SVG is pinned to the whole available box and `meet` scales the drawing to fit inside
          it. Sizing is the container's job; `preserveAspectRatio` keeps the proportion.

          `absolute inset-0` rather than `h-full w-full`: with no width/height attributes the svg
          carries its viewBox's intrinsic ratio, so a percentage width makes the height follow the
          ratio instead of the box. In a tall cell that reads as "fills the box"; in a short wide
          one — the Summary's fin banner — it computes a height far taller than the cell and the
          drawing is clipped. Pinning to the edges removes the ratio from the box calculation
          entirely, leaving it to do the one job it should: scaling the drawing inside. */}
      <div className="relative flex min-h-0 w-full flex-1 justify-center">
        <svg
          viewBox={`0 ${VIEW_MIN_Y} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full"
        >
            <path d={filled} fill="var(--outline-board-fill)" stroke="none" />
            <path d={open} fill="none" stroke="var(--outline-ink)" strokeWidth={2} />
            {/* Reference lines: the centreline is static (stringer dash); the tail-width-12"
                line is a derived station (station dash) — the input value itself lives in the
                sidebar, not repeated here (outputs only, sketch 002). */}
            <line
              x1={ORIGIN_X}
              y1={svgTopY}
              x2={ORIGIN_X}
              y2={TAIL_Y}
              stroke="var(--outline-station-line)"
              strokeWidth={1}
              strokeDasharray="var(--outline-stringer-dash)"
            />
            <line
              x1={w12LineX1}
              y1={w12LineY}
              x2={w12LineX2}
              y2={w12LineY}
              stroke="var(--outline-station-line)"
              strokeWidth={1}
              strokeDasharray="var(--outline-station-dash)"
            />

            {marksWithDims.map(({ geom, dims }, mi) => (
              <g key={mi}>
                <line
                  x1={geom.teX}
                  y1={geom.teY}
                  x2={geom.leX}
                  y2={geom.leY}
                  stroke="var(--outline-accent)"
                  strokeWidth={2.5}
                  // Not a "leader line" — this is the fin mark itself. Its dash keys the same
                  // Front/Rear/Center grouping as `result.legend`'s dash-per-role swatches below
                  // the diagram, so it stays even though every callout leader/extension/dimension
                  // line above has collapsed to the two shared reference-line dash tokens.
                  strokeDasharray={
                    geom.mark.lateralKind === "none" ? "none" : geom.mark.lateralKind === "stringer" ? "2 3" : "8 4"
                  }
                />
                {showCallouts &&
                  dims.map((d, di) => {
                    if (d.kind === "railV") {
                      return (
                        <g key={di}>
                          <line x1={d.x1} y1={d.y1} x2={d.x2a} y2={d.y1} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <line x1={d.x1} y1={d.y1} x2={d.x2b} y2={d.y1} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <DimensionTick x={d.x2a} y={d.y1} />
                          <DimensionTick x={d.x2b} y={d.y1} />
                          <line x1={d.extAX} y1={d.extY1} x2={d.extAX} y2={d.extY2} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <line x1={d.extBX} y1={d.extY1} x2={d.extBX} y2={d.extY2} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                        </g>
                      );
                    }
                    if (d.kind === "below") {
                      return (
                        <g key={di}>
                          <line x1={d.extLeftX} y1={d.extLeftY1} x2={d.extLeftX} y2={d.extLeftY2} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <line x1={d.extRightX} y1={d.extRightY1} x2={d.extRightX} y2={d.extRightY2} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <line x1={d.dimX1} y1={d.dimY} x2={d.dimX2} y2={d.dimY} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                          <DimensionTick x={d.dimX1} y={d.dimY} />
                          <DimensionTick x={d.dimX2} y={d.dimY} />
                        </g>
                      );
                    }
                    return (
                      <g key={di}>
                        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                        <DimensionTick x={d.x1} y={d.y1} />
                        <DimensionTick x={d.x2} y={d.y2} />
                        <line x1={d.extTopX1} y1={d.extTopY} x2={d.extTopX2} y2={d.extTopY} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                        <line x1={d.extBotX1} y1={d.extBotY} x2={d.extBotX2} y2={d.extBotY} stroke="var(--outline-dim-ink)" strokeWidth={1} />
                      </g>
                    );
                  })}
                <circle cx={geom.teX} cy={geom.teY} r={3.5} fill="var(--outline-ink)" />
                <circle cx={geom.leX} cy={geom.leY} r={3.5} fill="var(--outline-ink)" />
              </g>
            ))}

            {compact && boardLength !== undefined && (
              // The Summary dashboard's compact length heading (Fins.dc.html line 1364's
              // `compactLengthText`).
              <text
                x={ORIGIN_X}
                y={svgTopY - 6}
                textAnchor="middle"
                style={{
                  fontSize: "var(--summary-font-label, 12px)",
                  fontWeight: 800,
                  fill: "var(--outline-ink)",
                  textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}`,
                }}
              >
                {`${formatFeetInches(boardLength)} · ${formatInchesFraction(tailWidth12, 16)} tail`}
              </text>
            )}
            {showCallouts &&
              marksWithDims.map(({ dims }, mi) =>
                dims.map((d, di) => (
                  <text
                    key={`${mi}-${di}`}
                    x={d.labelX}
                    y={d.labelY}
                    textAnchor={d.labelAnchor}
                    style={{
                      fontSize: valueFontSize,
                      fontWeight: 700,
                      fill: "var(--outline-ink)",
                      textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}, 0 0 5px ${HALO}`,
                    }}
                  >
                    {d.text}
                  </text>
                )),
              )}
        </svg>
      </div>
      {!compact && (
        <div className="flex flex-none flex-col gap-1 text-[11px] text-muted-foreground">
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--outline-ink)]" />
            Trailing &amp; Leading Edges
          </span>
          {result.legend.map((entry) => (
            <span key={entry.label} className="flex items-center">
              <svg width={16} height={4} className="mr-1">
                <line x1={0} y1={2} x2={16} y2={2} stroke="var(--outline-accent)" strokeWidth={3} strokeDasharray={entry.dash} />
              </svg>
              Base Length ({entry.label}):&nbsp;{formatInchesFraction(entry.baseLength, 16)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
