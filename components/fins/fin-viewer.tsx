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
 */

import { useMemo } from "react";
import type { FinMark, FinPlacementResult, FinRole, FinTailShape, FinLateralKind } from "@/lib/geometry/fins";
import { tailHalfWidthAt, tailOffTailAtHalfWidth, tailOutlineHalfPoints } from "@/lib/geometry/fins";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";
import type { Point2D } from "@/lib/geometry/board";

const SCALE = 14;
const ORIGIN_X = 260;
const TAIL_Y = 320;
const VIEW_TOP_MARGIN = 0.6;
/** The halo color behind callout text, so it reads over the tinted board fill. Matches the
 * white viewer-card background this diagram always sits on. */
const HALO = "#fff";

function pct(px: number, total: number): string {
  return `${((px / total) * 100).toFixed(3)}%`;
}

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
  pctLeft: string;
  pctTop: string;
  transformX: string;
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
  pctLeft: string;
  pctTop: string;
  transformX: string;
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
  pctLeft: string;
  pctTop: string;
  transformX: string;
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
      pctLeft: pct(dimX, 530),
      pctTop: pct(midY, 370),
      transformX: "-100%",
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
      pctLeft: pct(midXAbove, 530),
      pctTop: pct(aboveRowY - 13, 370),
      transformX: "-50%",
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
      pctLeft: pct(midX, 530),
      pctTop: pct(rowY - 13, 370),
      transformX: "-50%",
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
      pctLeft: pct(midXAbove, 530),
      pctTop: pct(aboveRowY - 13, 370),
      transformX: "-50%",
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
      pctLeft: pct(railEnd, 530),
      pctTop: pct(teY, 370),
      transformX: "0%",
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
   * lines 25-72, 1363-1373): drops the legend column and the "Tail @ 12"" label pair, adds a
   * top-centre length heading, and shrinks the dimension callouts to the shared
   * `--summary-font-*` scale. Defaults to `false`, the Fins screen's own unchanged full viewer. */
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
  const w12GapPx = (w12In / 2 + 0.4) * SCALE;
  const w12NamePctLeft = pct(ORIGIN_X + w12GapPx, 530);
  const w12ValuePctLeft = pct(ORIGIN_X - w12GapPx, 530);
  const w12LabelPctTop = pct(w12LineY, 370);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4">
      <div className="relative flex min-h-0 flex-1 w-full justify-center">
        <div className="relative aspect-[530/370] h-auto max-h-full w-auto max-w-full">
          <svg width={530} height={370} viewBox="0 0 530 370" className="block h-full w-full">
            <defs>
              <marker id="finViewerArrow" markerWidth={8} markerHeight={7} refX={7} refY={3.5} orient="auto-start-reverse">
                <path d="M0,0 L8,3.5 L0,7 Z" fill="#4472C4" />
              </marker>
            </defs>
            <path d={filled} fill="var(--outline-board-fill)" stroke="none" />
            <path d={open} fill="none" stroke="#1c1b19" strokeWidth={2} />
            <line x1={ORIGIN_X} y1={svgTopY} x2={ORIGIN_X} y2={TAIL_Y} stroke="#4472C4" strokeWidth={1} strokeDasharray="6 4" />
            <line x1={w12LineX1} y1={w12LineY} x2={w12LineX2} y2={w12LineY} stroke="#4472C4" strokeWidth={1} strokeDasharray="6 4" />

            {marksWithDims.map(({ geom, dims }, mi) => (
              <g key={mi}>
                <line
                  x1={geom.teX}
                  y1={geom.teY}
                  x2={geom.leX}
                  y2={geom.leY}
                  stroke="var(--outline-accent)"
                  strokeWidth={2.5}
                  strokeDasharray={
                    geom.mark.lateralKind === "none" ? "none" : geom.mark.lateralKind === "stringer" ? "2 3" : "8 4"
                  }
                />
                {showCallouts &&
                  dims.map((d, di) => {
                    if (d.kind === "railV") {
                      return (
                        <g key={di}>
                          <line x1={d.x1} y1={d.y1} x2={d.x2a} y2={d.y1} stroke="#4472C4" strokeWidth={1} markerEnd="url(#finViewerArrow)" />
                          <line x1={d.x1} y1={d.y1} x2={d.x2b} y2={d.y1} stroke="#4472C4" strokeWidth={1} markerEnd="url(#finViewerArrow)" />
                          <line x1={d.extAX} y1={d.extY1} x2={d.extAX} y2={d.extY2} stroke="#4472C4" strokeWidth={1} />
                          <line x1={d.extBX} y1={d.extY1} x2={d.extBX} y2={d.extY2} stroke="#4472C4" strokeWidth={1} />
                        </g>
                      );
                    }
                    if (d.kind === "below") {
                      return (
                        <g key={di}>
                          <line x1={d.extLeftX} y1={d.extLeftY1} x2={d.extLeftX} y2={d.extLeftY2} stroke="#4472C4" strokeWidth={1} strokeDasharray="2 2" />
                          <line x1={d.extRightX} y1={d.extRightY1} x2={d.extRightX} y2={d.extRightY2} stroke="#4472C4" strokeWidth={1} strokeDasharray="2 2" />
                          <line x1={d.dimX1} y1={d.dimY} x2={d.dimX2} y2={d.dimY} stroke="#4472C4" strokeWidth={1} markerStart="url(#finViewerArrow)" markerEnd="url(#finViewerArrow)" />
                        </g>
                      );
                    }
                    return (
                      <g key={di}>
                        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#4472C4" strokeWidth={1} markerStart="url(#finViewerArrow)" markerEnd="url(#finViewerArrow)" />
                        <line x1={d.extTopX1} y1={d.extTopY} x2={d.extTopX2} y2={d.extTopY} stroke="#4472C4" strokeWidth={1} strokeDasharray="2 2" />
                        <line x1={d.extBotX1} y1={d.extBotY} x2={d.extBotX2} y2={d.extBotY} stroke="#4472C4" strokeWidth={1} strokeDasharray="2 2" />
                      </g>
                    );
                  })}
                <circle cx={geom.teX} cy={geom.teY} r={3.5} fill="#1c1b19" />
                <circle cx={geom.leX} cy={geom.leY} r={3.5} fill="#1c1b19" />
              </g>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0">
            {!compact && (
              <>
                <span
                  className="absolute font-bold tracking-wide uppercase"
                  style={{
                    left: w12ValuePctLeft,
                    top: w12LabelPctTop,
                    transform: "translate(-100%,-50%)",
                    whiteSpace: "nowrap",
                    paddingRight: 6,
                    lineHeight: 1,
                    fontSize: 14,
                    color: "#3a5f9e",
                    textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}`,
                  }}
                >
                  {formatInchesFraction(tailWidth12, 16)}
                </span>
                <span
                  className="absolute font-bold tracking-wide uppercase"
                  style={{
                    left: w12NamePctLeft,
                    top: w12LabelPctTop,
                    transform: "translate(0,-50%)",
                    whiteSpace: "nowrap",
                    paddingLeft: 6,
                    lineHeight: 1,
                    fontSize: 13,
                    color: "#3a5f9e",
                    textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}`,
                  }}
                >
                  Tail @ 12&quot;
                </span>
              </>
            )}
            {compact && boardLength !== undefined && (
              // The Summary dashboard's compact length heading (Fins.dc.html line 1364's
              // `compactLengthText`), replacing the "Tail @ 12"" label pair above.
              <span
                className="absolute font-extrabold"
                style={{
                  left: pct(ORIGIN_X, 530),
                  top: pct(svgTopY, 370),
                  transform: "translate(-50%, calc(-100% - 6px))",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  fontSize: "var(--summary-font-label, 12px)",
                  color: "#1c1b19",
                  textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}`,
                }}
              >
                {`${formatFeetInches(boardLength)} · ${formatInchesFraction(tailWidth12, 16)} tail`}
              </span>
            )}
            {showCallouts &&
              marksWithDims.map(({ dims }, mi) =>
                dims.map((d, di) => (
                  <span
                    key={`${mi}-${di}`}
                    className="absolute font-bold"
                    style={{
                      left: d.pctLeft,
                      top: d.pctTop,
                      transform: `translate(${d.transformX},-50%)`,
                      fontSize: compact ? "var(--summary-font-callout, 10px)" : 14,
                      lineHeight: 1,
                      color: "#1c1b19",
                      whiteSpace: "nowrap",
                      textShadow: `0 0 3px ${HALO}, 0 0 3px ${HALO}, 0 0 5px ${HALO}`,
                    }}
                  >
                    {d.text}
                  </span>
                )),
              )}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-none flex-col gap-1 text-[11px] text-[#8a8272]">
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#1c1b19]" />
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
