/**
 * Fin-placement geometry engine.
 *
 * Ported statement-for-statement from the prototype's `renderVals` and its helpers
 * (reference/project/Fins.dc.html lines 970-1286, plus the reference-guide equation methods at
 * lines 944-968), with these deliberate changes and no others:
 *
 * 1. INCH-DOMAIN CORE. Every constant in these placement equations is an inch measurement, and
 *    the equations themselves are fitted polynomials whose coefficients are meaningless outside
 *    inches. Converting each individually would multiply the chance of a silent transcription
 *    error in the exact code whose correctness is the product's Core Value. So this module
 *    keeps a private inch-domain core that is a statement-for-statement port of `renderVals`
 *    and its helpers, and the exported functions convert `Mm` in and `Mm` out at the boundary.
 *    The public surface is millimetres only; the inch core is never exported. Same posture as
 *    rail-bands.ts.
 * 2. PRESENTATION SPLIT. The prototype's `renderVals` returns display strings built by `disp`.
 *    This module returns `Mm` values and lets the caller format through `formatInchesFraction`,
 *    which is already the port of `toFrac`. Nothing here formats a number.
 * 3. VIEW CODE EXCLUDED. `buildFinMark`'s arrow, extension-line and callout placement,
 *    `catmullPath`, `outlinePath`'s SVG string assembly, `finGlyph` and `straightFinGlyph` are
 *    diagram layout in a fixed 530x370 pixel space, not board geometry; they live in
 *    `components/fins/`. This module exposes the geometry those need —
 *    `tailOutlineHalfPoints`, `tailHalfWidthAt`, `tailOffTailAtHalfWidth` — as coordinates, not
 *    paths.
 * 4. DEAD TERM PRESERVED AND NEUTRALISED. Line 1023's rear-shortboard expression contains the
 *    term `(isPintail ? narrowShiftGunFront * 0 : 0)`, which is zero on both branches. It is
 *    recorded in a comment and contributes nothing, exactly as in the prototype. It is not
 *    "fixed" into `narrowShiftGunFront`.
 * 5. IMPORTED-TEMPLATE BRANCH OMITTED. `effectiveHalfWidthAt` chooses between imported template
 *    geometry and the polynomial fallback. Cross-screen template import is not built yet, so
 *    only the fallback branch is ported; `tailHalfWidthAt` is the single seam where the
 *    imported branch will be added later.
 * 6. CM BRANCH OMITTED. Every `unitBounds` call and `toU`/`fromU` pair collapses to its inch
 *    branch; this module has no unit mode.
 */

import type { Point2D } from "./board";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";
import { TOE_AIM_TABLE, TOE_AIM_TABLE_COLUMNS, type ToeAimTableRowKey } from "./toe-aim-tables";

export type FinSetup = "single" | "twin" | "thruster" | "2plus1" | "quad";
export type ThrusterFrontModel = "proportional" | "basic" | "mckeeSB" | "mckeeGun";
export type QuadRearModel = "basic" | "basicOffRail" | "mckeeSB" | "mckeeLB";
export type TwinTemplate = "upright" | "keel" | "trailer";
export type FinTailShape = "pin" | "round" | "diamond" | "squash" | "swallow";
export type FinRole = "front" | "rear" | "center";
export type FinLateralKind = "none" | "rail" | "stringer";

/** Per-fin-group manual overrides. All lengths/offsets are `Mm`; toe/position overrides are
 * `null` when the group is following its model default. */
export interface FinAdvancedSpec {
  baseLenForward: Mm;
  baseLenForwardOverridden: boolean;
  baseLenRear: Mm;
  baseLenRearOverridden: boolean;
  baseLenCenter: Mm;
  baseLenCenterOverridden: boolean;
  centerPositionOffset: Mm;
  forwardPositionOffset: Mm;
  forwardToeOverride: Mm | null;
  rearPositionOffset: Mm;
  rearToeOverride: Mm | null;
  quadRearOffRailOverride: Mm | null;
  quadRearOffTailOverride: Mm | null;
  quadRearOffTailOverridden: boolean;
}

/** The single place a fin screen's sidebar writes to. */
export interface FinPlacementSpec {
  boardLength: Mm;
  tailWidth12: Mm;
  tailShape: FinTailShape;
  finSetup: FinSetup;
  frontModel: ThrusterFrontModel;
  quadRearModel: QuadRearModel;
  twinTemplate: TwinTemplate;
  quadCenterFinOn: boolean;
  advanced: FinAdvancedSpec;
}

/** Ported from the prototype's state defaults (Fins.dc.html lines 583-600). */
export const DEFAULT_FIN_PLACEMENT_SPEC: FinPlacementSpec = {
  boardLength: inchesToMm(72),
  tailWidth12: inchesToMm(13),
  tailShape: "squash",
  finSetup: "thruster",
  frontModel: "mckeeSB",
  quadRearModel: "mckeeSB",
  twinTemplate: "upright",
  quadCenterFinOn: false,
  advanced: {
    baseLenForward: inchesToMm(4.5),
    baseLenForwardOverridden: false,
    baseLenRear: inchesToMm(4.5),
    baseLenRearOverridden: false,
    baseLenCenter: inchesToMm(4.5),
    baseLenCenterOverridden: false,
    centerPositionOffset: mm(0),
    forwardPositionOffset: mm(0),
    forwardToeOverride: null,
    rearPositionOffset: mm(0),
    rearToeOverride: null,
    quadRearOffRailOverride: null,
    quadRearOffTailOverride: null,
    quadRearOffTailOverridden: false,
  },
};

/** One drawn fin, trailing-edge convention. `lateral` is signed from the stringer (negative =
 * left of centre); `lateralValue` is the off-rail distance when `lateralKind` is `'rail'`, the
 * half spread when `'stringer'`, and `null` when `'none'`. */
export interface FinMark {
  role: FinRole;
  side: -1 | 0 | 1;
  offTail: Mm;
  lateral: Mm;
  leadingOffTail: Mm;
  leadingLateral: Mm;
  baseLength: Mm;
  toe: Mm;
  lateralKind: FinLateralKind;
  lateralValue: Mm | null;
}

export interface FinSummaryRow {
  label: string;
  value: Mm;
}

export interface FinSummaryGroup {
  heading: "Trailing Edge" | "Leading Edge";
  rows: FinSummaryRow[];
  /** The quad rear group's Full Spread line (`spread * 2`, printed after rounding — see
   * `<behavior>` in the plan: the printed full spread can exceed twice the printed half
   * spread). `null` everywhere else, including the Basic-Off-Rail quad rear model. */
  fullSpread: Mm | null;
}

export interface FinSummarySection {
  label: string;
  groups: FinSummaryGroup[];
}

export interface FinLegendEntry {
  label: string;
  baseLength: Mm;
  dash: "none" | "8 4" | "2 3";
}

/** Every value the sidebar/viewer/data panel read, pre-resolved so nothing recomputes the math
 * a second time. */
export interface FinPlacementResolved {
  centerOffTail: Mm;
  frontOffTail: Mm;
  rearOffTail: Mm;
  sideOffTail: Mm;
  twinOffTail: Mm;
  pairOffTail: Mm;
  forwardToe: Mm;
  rearToe: Mm;
  frontOffRail: Mm;
  twinOffRail: Mm;
  sideOffRail: Mm;
  quadRearOffRail: Mm;
  quadRearOffTailBase: Mm;
  rearHalfSpread: Mm;
}

export interface FinPlacementFlags {
  hasCenterSection: boolean;
  hasForwardSection: boolean;
  hasRearSection: boolean;
  quadCenterFinAvailable: boolean;
  isLongboardQuad: boolean;
  isBasicOffRail: boolean;
  showFrontToeTableLink: boolean;
  showRearToeTableLink: boolean;
  showRearOffRailSlider: boolean;
  showRearOffTailOverride: boolean;
  centerSectionLabel: string;
  forwardSectionLabel: string;
  rearSectionLabel: string;
  centerBaseLenFieldLabel: string;
}

export interface FinPlacementResult {
  marks: FinMark[];
  sections: FinSummarySection[];
  legend: FinLegendEntry[];
  modelHeader: string;
  notes: string[];
  isModified: boolean;
  resolved: FinPlacementResolved;
  flags: FinPlacementFlags;
}

export interface ToeAimTableView {
  columns: readonly number[];
  rowLabel: string;
  front: readonly number[];
  rear: readonly number[];
  highlightIndex: number;
}

export const THRUSTER_FRONT_MODELS: { value: ThrusterFrontModel; label: string }[] = [
  { value: "proportional", label: "Proportional" },
  { value: "basic", label: "Basic (Half Rate)" },
  { value: "mckeeSB", label: "McKee Shortboard" },
  { value: "mckeeGun", label: "McKee Gun" },
];

export const QUAD_REAR_MODELS: { value: QuadRearModel; label: string }[] = [
  { value: "basic", label: "Basic - Spread" },
  { value: "basicOffRail", label: "Basic - Off-Rail" },
  { value: "mckeeSB", label: "McKee SB/Gun" },
  { value: "mckeeLB", label: "McKee Longboard" },
];

export const TWIN_TEMPLATES: { value: TwinTemplate; label: string }[] = [
  { value: "upright", label: "Modern/Upright" },
  { value: "keel", label: "Keel" },
  { value: "trailer", label: "Upright + Trailer" },
];

export const FIN_SETUPS: { value: FinSetup; label: string }[] = [
  { value: "single", label: "Single Fin" },
  { value: "twin", label: "Twin" },
  { value: "thruster", label: "Thruster" },
  { value: "2plus1", label: "2+1" },
  { value: "quad", label: "Quad" },
];

/**
 * The fin *box* system — which manufacturer's plug the fins drop into. Purely a glassing/ordering
 * choice: it names the hardware the glasser installs and has no effect on any placement number
 * `computeFinPlacement` produces, which is why it lives beside `FIN_SETUPS` as a plain option list
 * rather than entering `FinPlacementSpec`. The board summary's order form is its only reader.
 */
export type FinSystem = "fcs2" | "fcsOriginal" | "futures" | "lokbox" | "probox" | "glassOn";

export const FIN_SYSTEMS: { value: FinSystem; label: string }[] = [
  { value: "fcs2", label: "FCS II" },
  { value: "fcsOriginal", label: "FCS (Original)" },
  { value: "futures", label: "Futures" },
  { value: "lokbox", label: "Lokbox" },
  { value: "probox", label: "Probox" },
  { value: "glassOn", label: "Glass-On" },
];

// ============================================================================================
// Inch-domain core — private. Statement-for-statement port; never exported.
// ============================================================================================

/** Non-diamond base shapes `xBaseAt` is fitted against. */
type BaseTailShape = "pin" | "round" | "squash" | "swallow";

/** Ported from `xBaseAt` (Fins.dc.html lines 768-777). */
function xBaseAtInches(shape: BaseTailShape, y: number): number {
  const yy = Math.max(0, y);
  switch (shape) {
    case "pin":
      return 1.125 * yy - 0.0586 * yy * yy + 0.001214 * yy * yy * yy;
    case "squash":
      return 2.25 + 0.6708 * yy - 0.0285 * yy * yy + 0.000539 * yy * yy * yy;
    case "round":
      return 2.5119 * Math.sqrt(yy) - 0.134 * yy;
    case "swallow":
      return 4.1078 + 0.3237 * yy - 0.00573 * yy * yy;
    default:
      return 1.125 * yy - 0.0586 * yy * yy + 0.001214 * yy * yy * yy;
  }
}

/** Ported from `scaleFactor` (Fins.dc.html lines 779-782). */
function scaleFactorInches(shape: FinTailShape, w12: number): number {
  const baseShape: BaseTailShape = shape === "diamond" ? "round" : shape;
  return w12 / 2 / xBaseAtInches(baseShape, 12);
}

/** Ported from `halfWidthAt` (Fins.dc.html lines 811-820) — the polynomial-fallback branch of
 * `effectiveHalfWidthAt` only (deviation 5: the imported-template branch is not ported here). */
function tailHalfWidthAtInches(shape: FinTailShape, w12: number, y: number): number {
  const yy = Math.max(0, Math.min(24, y));
  const S = scaleFactorInches(shape, w12);
  if (shape === "diamond") {
    if (yy >= 2) return S * xBaseAtInches("round", yy);
    const x2 = S * xBaseAtInches("round", 2);
    return x2 * (yy / 2);
  }
  return S * xBaseAtInches(shape, yy);
}

/** Ported from `outlineOffTailAtHalfWidth` (Fins.dc.html lines 822-830) — bisection capped at 24
 * iterations (see threat T-mr2-02: no reachable input can make this loop hang). */
function tailOffTailAtHalfWidthInches(shape: FinTailShape, w12: number, targetHw: number): number {
  if (tailHalfWidthAtInches(shape, w12, 0) >= targetHw) return 0;
  let lo = 0;
  let hi = 24;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (tailHalfWidthAtInches(shape, w12, mid) < targetHw) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Ported from the `outlinePath` sample loop and connector rule (Fins.dc.html lines 784-809),
 * minus the SVG string assembly (deviation 3). Returns the positive-x half of the outline as
 * `[halfWidth, offTail]` inch pairs, plus the tail-centre connector point used to close the
 * shape for diamond/swallow tails. */
function tailOutlineHalfPointsInches(
  shape: FinTailShape,
  w12: number,
  diamondDepthMult: number,
  yMax: number,
): { points: [number, number][]; connector: [number, number] | null } {
  const baseShape: BaseTailShape = shape === "diamond" ? "round" : shape;
  const S = scaleFactorInches(shape, w12);
  const yLow = shape === "diamond" ? 2 * diamondDepthMult : 0;
  const N = 48;
  const points: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    // The hardcoded 20 (not `yMax`) is the prototype's own geometric sampling cap, ported verbatim.
    const y = yLow + (Math.min(yMax, 20) - yLow) * (i / N);
    points.push([S * xBaseAtInches(baseShape, y), y]);
  }
  const connector: [number, number] | null = shape === "diamond" ? [0, 0] : shape === "swallow" ? [0, 2.5] : null;
  return { points, connector };
}

// ---- Reference-guide equations (Fins.dc.html lines 945-955) --------------------------------

function quadFrontLongboard(L: number): number {
  return L <= 105 ? 0.1125 * L + 3.9125 : 0.10625 * L + 5.2125;
}
function quadRearLongboard(L: number): number {
  return L <= 105 ? 0.1125 * L - 2.8375 : 0.110417 * L - 1.9375;
}
function quadSpreadLongboard(L: number, W: number): number {
  let s = 0.5 * W - 0.625;
  if (L > 108) s += (1 / 16) * ((L - 108) / 3);
  return s;
}
function quadFrontMcKeeShortboard(L: number): number {
  return 0.05714286 * L + 6.8625;
}
function quadFrontMcKeeGun(L: number): number {
  return -0.000364 * L * L + 0.165468 * L + 0.862036;
}
function quadRearShortboard(L: number): number {
  return L <= 83 ? 0.0339 * L + 2.6625 : 0.0651 * L + 0.1599;
}
function quadSpreadSBGun(W: number): number {
  return W <= 13.5 ? 0.35 * W + 0.6 : 0.748162 * W - 4.724724;
}
function quadRearBasic(L: number): number {
  return Math.max(4.75, 4.75 + 0.25 * Math.ceil((L - 68) / 5));
}
function quadSpreadBasic(W: number): number {
  return W > 13.35 ? 0.75 * W - 4.6125 : 0.25 * W + 1.875;
}
function mckeeFrontToe(L: number): number {
  return Math.round(16 * (-0.00375 * L + 0.6661)) / 16;
}
function aimToe(baseLen: number, halfSpread: number, xMinus: number): number {
  return baseLen * Math.sin(Math.atan(halfSpread / xMinus));
}

interface FinMarkInches {
  role: FinRole;
  side: -1 | 0 | 1;
  offTail: number;
  lateral: number;
  leadingOffTail: number;
  leadingLateral: number;
  baseLength: number;
  toe: number;
  lateralKind: FinLateralKind;
  lateralValue: number | null;
}

/** The geometric core of `buildFinMark` (Fins.dc.html lines 845-942), minus every dimension-arrow
 * / callout / stacking computation (deviation 3 — those live in components/fins/fin-viewer.tsx). */
function buildFinMarkInches(args: {
  role: FinRole;
  offTailIn: number;
  spreadIn: number;
  baseLenIn: number;
  toeDeltaIn: number;
  lateralKind: FinLateralKind;
  lateralValueIn: number | null;
}): FinMarkInches {
  const side: -1 | 0 | 1 = args.spreadIn > 0.01 ? 1 : args.spreadIn < -0.01 ? -1 : 0;
  return {
    role: args.role,
    side,
    offTail: args.offTailIn,
    lateral: args.spreadIn,
    leadingOffTail: args.offTailIn + args.baseLenIn,
    leadingLateral: args.spreadIn - side * args.toeDeltaIn,
    baseLength: args.baseLenIn,
    toe: args.toeDeltaIn,
    lateralKind: args.lateralKind,
    lateralValue: args.lateralValueIn,
  };
}

interface FinPlacementSpecInches {
  boardLength: number;
  tailWidth12: number;
  tailShape: FinTailShape;
  finSetup: FinSetup;
  frontModel: ThrusterFrontModel;
  quadRearModel: QuadRearModel;
  twinTemplate: TwinTemplate;
  quadCenterFinOn: boolean;
  advanced: {
    baseLenForward: number;
    baseLenForwardOverridden: boolean;
    baseLenRear: number;
    baseLenRearOverridden: boolean;
    baseLenCenter: number;
    baseLenCenterOverridden: boolean;
    centerPositionOffset: number;
    forwardPositionOffset: number;
    forwardToeOverride: number | null;
    rearPositionOffset: number;
    rearToeOverride: number | null;
    quadRearOffRailOverride: number | null;
    quadRearOffTailOverride: number | null;
    quadRearOffTailOverridden: boolean;
  };
}

interface FinSummaryRowInches {
  label: string;
  value: number;
}
interface FinSummaryGroupInches {
  heading: "Trailing Edge" | "Leading Edge";
  rows: FinSummaryRowInches[];
  fullSpread: number | null;
}
interface FinSummarySectionInches {
  label: string;
  groups: FinSummaryGroupInches[];
}
interface FinLegendEntryInches {
  label: string;
  baseLength: number;
  dash: "none" | "8 4" | "2 3";
}
interface FinPlacementResultInches {
  marks: FinMarkInches[];
  sections: FinSummarySectionInches[];
  legend: FinLegendEntryInches[];
  modelHeader: string;
  notes: string[];
  isModified: boolean;
  resolved: {
    centerOffTail: number;
    frontOffTail: number;
    rearOffTail: number;
    sideOffTail: number;
    twinOffTail: number;
    pairOffTail: number;
    forwardToe: number;
    rearToe: number;
    frontOffRail: number;
    twinOffRail: number;
    sideOffRail: number;
    quadRearOffRail: number;
    quadRearOffTailBase: number;
    rearHalfSpread: number;
  };
  flags: FinPlacementFlags;
}

/** Statement-for-statement port of `renderVals`'s placement math (Fins.dc.html lines 970-1286).
 * Keeps the prototype's own section comments (§5-§9). */
function computeFinPlacementInches(spec: FinPlacementSpecInches): FinPlacementResultInches {
  const L = spec.boardLength;
  const w12 = spec.tailWidth12;
  const adv = spec.advanced;
  const clampToe = (v: number) => Math.max(0, Math.min(0.5, v));
  const clampOffRail = (v: number) => Math.max(1, Math.min(2, v));

  const isThruster = spec.finSetup === "thruster";
  const isQuad = spec.finSetup === "quad";
  const isTwin = spec.finSetup === "twin";
  const isTwoPlusOne = spec.finSetup === "2plus1";
  const isSingle = spec.finSetup === "single";
  const isPintail = spec.tailShape === "pin";
  const isLongboardQuad = isQuad && spec.quadRearModel === "mckeeLB";
  const quadCenterFinAvailable = isQuad && !isLongboardQuad;
  const hasCenterSection =
    isThruster ||
    isSingle ||
    isTwoPlusOne ||
    (isQuad && spec.quadCenterFinOn && quadCenterFinAvailable) ||
    (isTwin && spec.twinTemplate === "trailer");
  const hasForwardSection = isThruster || isQuad || isTwoPlusOne || isTwin;
  const hasRearSection = isQuad;

  // ---- Thruster front + center (§8) ----
  const narrowShiftShortboard = w12 <= 12.5 ? -0.4 * w12 + 5.2875 : 0;
  const narrowShiftGunFront = w12 <= 12.5 ? 0.0625 * w12 * w12 - 1.15 * w12 + 5.517969 : 0;

  const frontProportional = 0.15625 * L;
  const frontBasicSS = Math.round(8 * (0.08020177 * L + 5.11156999)) / 8;
  const frontMcKeeSB = quadFrontMcKeeShortboard(L) + narrowShiftShortboard;
  const frontMcKeeGun = quadFrontMcKeeGun(L) + narrowShiftGunFront;
  const centerProportional = 0.0486111 * L;
  const centerBasicSS = Math.round(8 * (0.01680328 * L + 2.16434426)) / 8;
  const centerMcKee = L / 48 + 1.8125 + narrowShiftShortboard; // McKee SB & Gun share this eq

  const thrusterFrontModels: Record<
    ThrusterFrontModel,
    { front: number; center: number; offRail: number; toe: number }
  > = {
    proportional: { front: frontProportional, center: centerProportional, offRail: 1.125, toe: 0.25 },
    basic: { front: frontBasicSS, center: centerBasicSS, offRail: 1.1875, toe: 0.25 },
    mckeeSB: { front: frontMcKeeSB, center: centerMcKee, offRail: 1.1875, toe: mckeeFrontToe(L) },
    mckeeGun: { front: frontMcKeeGun, center: centerMcKee, offRail: 1.125, toe: mckeeFrontToe(L) },
  };

  // ---- Quad rear (§9) ----
  const pintailRearAdd = isPintail ? 0.1875 : 0;
  const quadShortboardCluster = w12 <= 12.5 ? narrowShiftShortboard : 0;
  const quadPintailGunCluster = w12 <= 12.5 ? -0.2875 * w12 + 3.884375 : 0;

  const rearBasicBase = quadRearBasic(L) + pintailRearAdd;
  const rearSBBase =
    quadRearShortboard(L) +
    // Deviation 4: dead term, always zero on both branches — preserved and neutralised, not
    // "fixed" into narrowShiftGunFront.
    (isPintail ? narrowShiftGunFront * 0 : 0) +
    pintailRearAdd +
    (isPintail ? quadPintailGunCluster : quadShortboardCluster);
  const rearLBBase = quadRearLongboard(L) + pintailRearAdd;

  const spreadBasic = quadSpreadBasic(w12);
  const spreadSBGun = quadSpreadSBGun(w12);
  const spreadLB = quadSpreadLongboard(L, w12);

  const quadModels: Record<QuadRearModel, { rear: number | null; spread: number | null; front: number; offRail: number | null }> = {
    basic: { rear: rearBasicBase, spread: spreadBasic, front: frontBasicSS, offRail: null },
    basicOffRail: { rear: null, spread: null, front: frontBasicSS, offRail: null },
    mckeeSB: {
      rear: rearSBBase,
      spread: spreadSBGun,
      front: isPintail ? frontMcKeeGun : frontMcKeeSB,
      offRail: isPintail ? 1.125 : 1.1875,
    },
    mckeeLB: { rear: rearLBBase, spread: spreadLB, front: quadFrontLongboard(L), offRail: 1.3125 },
  };

  const isBasicOffRail = spec.quadRearModel === "basicOffRail";
  const activeThrusterModel = thrusterFrontModels[spec.frontModel];
  const frontOffRail = isThruster ? activeThrusterModel.offRail : (quadModels[spec.quadRearModel].offRail ?? 1.1875);
  const frontBase = isThruster ? activeThrusterModel.front : (quadModels[spec.quadRearModel].front ?? frontMcKeeSB);
  // Load-bearing order (Fins.dc.html line 1052): basicOffRail's rear must be derived AFTER
  // frontBase resolves, since it depends on the Basic model's own front.
  if (isBasicOffRail) {
    quadModels.basicOffRail.rear = adv.quadRearOffTailOverride ?? frontBase / 2 + 0.25;
  }
  const frontFinal = frontBase + (isThruster || isQuad ? adv.forwardPositionOffset : 0);
  // frontSpread turns an off-rail distance into a lateral position through the outline half
  // width at the fin's OWN off-tail, not at the tail or at 12".
  const frontSpread = tailHalfWidthAtInches(spec.tailShape, w12, frontFinal) - frontOffRail;

  const centerSuggestedThruster = activeThrusterModel.center;

  const rearBase = quadModels[spec.quadRearModel].rear ?? 0;
  const rearFinal = rearBase + (isQuad ? adv.rearPositionOffset : 0);
  const quadRearOffRailValue = clampOffRail(adv.quadRearOffRailOverride ?? 1.25);
  // spread is a HALF spread: for basicOffRail it comes from half width minus off-rail; for
  // every other model it is the model's own full spread divided by two.
  const spread = isBasicOffRail
    ? tailHalfWidthAtInches(spec.tailShape, w12, rearFinal) - quadRearOffRailValue
    : (quadModels[spec.quadRearModel].spread ?? 0) / 2;

  // ---- Twin (§6) ----
  const mainOffTailBase = spec.twinTemplate === "keel" ? 6.25 : spec.twinTemplate === "trailer" ? 10 : 7.5;
  const mainOffTail = mainOffTailBase + (isTwin ? adv.forwardPositionOffset : 0);
  const mainOffRail = 1.25;
  const twinToeFixed = spec.twinTemplate === "keel" ? 0.125 : 0.1875;
  const trailerOffTail = 4.0;

  // ---- Single / 2+1 / twin-trailer center box (§5) ----
  const centerSuggested =
    isThruster || (isQuad && spec.quadCenterFinOn && quadCenterFinAvailable)
      ? centerSuggestedThruster
      : isSingle || isTwoPlusOne
        ? 5.5
        : isTwin && spec.twinTemplate === "trailer"
          ? trailerOffTail
          : 0;
  const centerFinal = centerSuggested + (hasCenterSection ? adv.centerPositionOffset : 0);

  // ---- 2+1 side bites (§7) ----
  const sideBase = L / 48 + 13.5;
  const sideFinal = sideBase + (isTwoPlusOne ? adv.forwardPositionOffset : 0);
  const activeSideOffRail = 1.25;
  const sideToeFixedDefault = 0.1875;

  const pairFinalOffTail = isQuad ? rearFinal : isTwoPlusOne ? sideFinal : frontFinal;

  const forwardToeFixed = isThruster
    ? activeThrusterModel.toe
    : isTwoPlusOne
      ? sideToeFixedDefault
      : isTwin
        ? twinToeFixed
        : isQuad
          ? spec.quadRearModel === "mckeeLB"
            ? 0.1875
            : spec.quadRearModel === "basic" || isBasicOffRail
              ? 0.25
              : mckeeFrontToe(L)
          : 0;
  const forwardToeValue = clampToe(adv.forwardToeOverride ?? forwardToeFixed);

  let rearToeFixed = 0;
  if (isQuad) {
    if (spec.quadRearModel === "basic") rearToeFixed = 0.125;
    else if (isBasicOffRail) rearToeFixed = 0.1875;
    else if (spec.quadRearModel === "mckeeSB") rearToeFixed = aimToe(adv.baseLenRear, spread, L - 12);
    else if (spec.quadRearModel === "mckeeLB") rearToeFixed = aimToe(adv.baseLenRear, spread, L - 18);
  }
  const rearToeValue = clampToe(adv.rearToeOverride ?? rearToeFixed);

  const forwardSectionLabel = isThruster ? "Front Pair" : isQuad ? "Front Pair" : isTwoPlusOne ? "Side Bites" : "";
  const rearSectionLabel = "Rear Pair";
  const centerSectionLabel = isThruster ? "Center Fin" : isQuad ? "5th/Center Fin" : "Center Fin Box Position";

  const showFrontToeTableLink =
    (isThruster && (spec.frontModel === "mckeeSB" || spec.frontModel === "mckeeGun")) ||
    (isQuad && spec.quadRearModel === "mckeeSB");
  const showRearToeTableLink = isQuad && (spec.quadRearModel === "mckeeSB" || spec.quadRearModel === "mckeeLB");

  // ---- fin marks ----
  const marks: FinMarkInches[] = [];
  if (isThruster || isQuad) {
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: frontFinal,
        spreadIn: -frontSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: frontOffRail,
      }),
    );
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: frontFinal,
        spreadIn: frontSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: frontOffRail,
      }),
    );
  }
  if (isThruster || (isQuad && spec.quadCenterFinOn && quadCenterFinAvailable)) {
    marks.push(
      buildFinMarkInches({
        role: "center",
        offTailIn: centerFinal,
        spreadIn: 0,
        baseLenIn: adv.baseLenCenter,
        toeDeltaIn: 0,
        lateralKind: "none",
        lateralValueIn: null,
      }),
    );
  }
  if (isQuad) {
    // The quad 5th-fin centre position (above) comes from activeThrusterModel.center, i.e. it
    // depends on `frontModel` — a field the quad sidebar never exposes. Ported faithfully; it
    // is a real quirk of the prototype, not a bug to fix.
    const rearLateralKind: FinLateralKind = isBasicOffRail ? "rail" : "stringer";
    const rearLateralValue = isBasicOffRail ? quadRearOffRailValue : spread;
    marks.push(
      buildFinMarkInches({
        role: "rear",
        offTailIn: rearFinal,
        spreadIn: -spread,
        baseLenIn: adv.baseLenRear,
        toeDeltaIn: rearToeValue,
        lateralKind: rearLateralKind,
        lateralValueIn: rearLateralValue,
      }),
    );
    marks.push(
      buildFinMarkInches({
        role: "rear",
        offTailIn: rearFinal,
        spreadIn: spread,
        baseLenIn: adv.baseLenRear,
        toeDeltaIn: rearToeValue,
        lateralKind: rearLateralKind,
        lateralValueIn: rearLateralValue,
      }),
    );
  }
  if (isTwin) {
    const tSpread = tailHalfWidthAtInches(spec.tailShape, w12, mainOffTail) - mainOffRail;
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: mainOffTail,
        spreadIn: -tSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: mainOffRail,
      }),
    );
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: mainOffTail,
        spreadIn: tSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: mainOffRail,
      }),
    );
    if (spec.twinTemplate === "trailer") {
      marks.push(
        buildFinMarkInches({
          role: "center",
          offTailIn: centerFinal,
          spreadIn: 0,
          baseLenIn: adv.baseLenCenter,
          toeDeltaIn: 0,
          lateralKind: "none",
          lateralValueIn: null,
        }),
      );
    }
  }
  if (isTwoPlusOne) {
    marks.push(
      buildFinMarkInches({
        role: "center",
        offTailIn: centerFinal,
        spreadIn: 0,
        baseLenIn: adv.baseLenCenter,
        toeDeltaIn: 0,
        lateralKind: "none",
        lateralValueIn: null,
      }),
    );
    const sSpread = tailHalfWidthAtInches(spec.tailShape, w12, sideFinal) - activeSideOffRail;
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: sideFinal,
        spreadIn: -sSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: activeSideOffRail,
      }),
    );
    marks.push(
      buildFinMarkInches({
        role: "front",
        offTailIn: sideFinal,
        spreadIn: sSpread,
        baseLenIn: adv.baseLenForward,
        toeDeltaIn: forwardToeValue,
        lateralKind: "rail",
        lateralValueIn: activeSideOffRail,
      }),
    );
  }
  if (isSingle) {
    marks.push(
      buildFinMarkInches({
        role: "center",
        offTailIn: centerFinal,
        spreadIn: 0,
        baseLenIn: adv.baseLenCenter,
        toeDeltaIn: 0,
        lateralKind: "none",
        lateralValueIn: null,
      }),
    );
  }

  const isModified =
    adv.baseLenForwardOverridden ||
    adv.baseLenRearOverridden ||
    adv.baseLenCenterOverridden ||
    adv.centerPositionOffset !== 0 ||
    adv.forwardPositionOffset !== 0 ||
    adv.forwardToeOverride !== null ||
    adv.rearPositionOffset !== 0 ||
    adv.rearToeOverride !== null ||
    adv.quadRearOffTailOverridden;

  const frontModelLabel = THRUSTER_FRONT_MODELS.find((o) => o.value === spec.frontModel)!.label;
  const modelHeader = isThruster
    ? `Thruster — ${frontModelLabel}`
    : isQuad
      ? `Quad — ${QUAD_REAR_MODELS.find((o) => o.value === spec.quadRearModel)!.label}${
          spec.quadCenterFinOn && quadCenterFinAvailable ? " + Center (Five-fin)" : ""
        }`
      : isTwin
        ? `Twin — ${spec.twinTemplate === "keel" ? "Keel" : spec.twinTemplate === "trailer" ? "Upright + Trailer" : "Modern/Upright"}`
        : isTwoPlusOne
          ? "2+1"
          : "Single Fin";

  const legend: FinLegendEntryInches[] = [];
  if (hasCenterSection) {
    legend.push({
      label: isTwin && spec.twinTemplate === "trailer" ? "Center Trailer" : "Center",
      baseLength: adv.baseLenCenter,
      dash: "none",
    });
  }
  if (hasForwardSection) {
    legend.push({
      label: isTwoPlusOne ? "Side Bites" : isTwin ? "Main Twins" : "Front",
      baseLength: adv.baseLenForward,
      dash: "8 4",
    });
  }
  if (hasRearSection) {
    legend.push({ label: "Rear", baseLength: adv.baseLenRear, dash: "2 3" });
  }

  const sections: FinSummarySectionInches[] = [];
  if (hasCenterSection) {
    sections.push({
      label: centerSectionLabel,
      groups: [
        { heading: "Trailing Edge", rows: [{ label: "Off-Tail", value: centerFinal }], fullSpread: null },
        {
          heading: "Leading Edge",
          rows: [
            {
              label: isSingle || isTwoPlusOne ? "Fin Box Length" : "Fin Base Length",
              value: adv.baseLenCenter,
            },
          ],
          fullSpread: null,
        },
      ],
    });
  }
  if (hasForwardSection) {
    const label = isTwoPlusOne ? "Front Fins (Side Bites)" : isTwin ? "Front Fins (Main Twins)" : "Front Fins";
    const offTail = isTwoPlusOne ? sideFinal : isTwin ? mainOffTail : frontFinal;
    const offRail = isTwoPlusOne ? activeSideOffRail : isTwin ? mainOffRail : frontOffRail;
    sections.push({
      label,
      groups: [
        {
          heading: "Trailing Edge",
          rows: [
            { label: "Off-Tail", value: offTail },
            { label: "Off-Rail", value: offRail },
          ],
          fullSpread: null,
        },
        {
          heading: "Leading Edge",
          rows: [
            { label: "Toe-In", value: forwardToeValue },
            { label: "Fin Base Length", value: adv.baseLenForward },
          ],
          fullSpread: null,
        },
      ],
    });
  }
  if (hasRearSection) {
    sections.push({
      label: "Rear Fins",
      groups: [
        {
          heading: "Trailing Edge",
          rows: [
            { label: "Off-Tail", value: rearFinal },
            {
              label: isBasicOffRail ? "Off-Rail" : "Off-Stringer (1/2 Spread)",
              value: isBasicOffRail ? quadRearOffRailValue : spread,
            },
          ],
          fullSpread: isBasicOffRail ? null : spread * 2,
        },
        {
          heading: "Leading Edge",
          rows: [
            { label: "Toe-In", value: rearToeValue },
            { label: "Fin Base Length", value: adv.baseLenRear },
          ],
          fullSpread: null,
        },
      ],
    });
  }

  // Ported verbatim from notesItems (Fins.dc.html lines 1256-1286), including the empty string
  // the prototype pushes for the thruster mckeeSB model — filtered out at the very end so this
  // still diffs one-to-one against the source.
  const notesItems: string[] = [];
  if (isSingle) {
    notesItems.push(
      `Single fin: one model, one range for all lengths — no length equation. Off-tail (box trailing edge) 4.5–6" (default 5.5"), centered, 0° toe/cant. Fin box 10.5" standard (8" boxes also exist); fore/aft is tuned by sliding in the box, not routing.`,
    );
  }
  if (isTwoPlusOne) {
    notesItems.push(
      `2+1: center box uses the single-fin range (4.5–6", default 5.5"). Side bites off-tail = x/48 + 13.5 (≈15.75" @ 9', 15–16.5" typical), off-rail 1¼", toe 3⁄16" — scaled off a 9' anchor.`,
    );
  }
  if (isTwin) {
    if (spec.twinTemplate === "upright")
      notesItems.push(
        `Twin — Modern/Upright: off-tail 7–8" (default 7.5"), base ≈5–5.5"; off-rail 1⅛–1¼" (default 1.25"); toe 3⁄16–¼" (default 0.1875"). No length equation — move the cluster back for wide tails, forward for narrow.`,
      );
    if (spec.twinTemplate === "keel")
      notesItems.push(
        `Twin — Keel: off-tail 6–6.5" (default 6.25"); off-rail 1⅛–1¼" (default 1.25"); toe ⅛" (default 0.125"). Keel's longer base sets the trailing edge back roughly 1" versus upright.`,
      );
    if (spec.twinTemplate === "trailer")
      notesItems.push(
        `Twin — Upright + Trailer: mains fixed at 10" off-tail, 1.25" off-rail, 3⁄16" toe. The center trailer sits at 4" off-tail — a smaller anchor fin than a thruster center, not scaled by length.`,
      );
  }
  if (isThruster) {
    if (spec.frontModel === "proportional")
      notesItems.push(
        `Thruster — Proportional: center y=0.0486111·x, front y=0.15625·x — a straight proportional fit, not ideal for long boards. Off-rail 1.125", toe ¼" (range ⅛–3⁄8").`,
      );
    if (spec.frontModel === "basic")
      notesItems.push(
        `Thruster — Basic (Shaper Supply): center and front each rounded to the nearest ⅛" per the source table's own convention. Off-rail 1.1875", toe ¼".`,
      );
    if (spec.frontModel === "mckeeSB") notesItems.push(``);
    if (spec.frontModel === "mckeeGun")
      notesItems.push(
        `Thruster — McKee Gun: center shares the Shortboard equation; front is a quadratic fit, best for pin-tail guns 7'–11'. Off-rail 1.125"; toe from the McKee front equation.`,
      );
  }
  if (isQuad) {
    if (spec.quadRearModel === "basic")
      notesItems.push(
        `Quad — Basic - Spread rear: off-tail steps in ¼" increments from a 4.75" floor as length increases; toe fixed ⅛"; spread breaks at W=13.35".`,
      );
    if (isBasicOffRail)
      notesItems.push(
        `Quad — Basic - Off-Rail rear: off-tail is half the front pair's off-tail distance; off-rail defaults to 1.25" (adjustable up to 2"); toe fixed 3⁄16" — less than the front pair's toe.`,
      );
    if (spec.quadRearModel === "mckeeSB")
      notesItems.push(
        `Quad — McKee SB/Gun rear: off-tail formula breaks at 83" length; toe is the nose-aim equation (≈1⁄16" for typical tails, or read it off the precise aim table); spread breaks at W=13.5". Fronts follow the matching McKee thruster front formula.`,
      );
    if (isLongboardQuad)
      notesItems.push(
        `Quad — McKee Longboard: dedicated front AND rear formulas (best ≥8'), no center-fin option. Spread gains 1⁄16" per 3" of length over 9'; rear toe aims 10cm aft of the nose (denominator x−18 vs. x−12 for SB/Gun).`,
      );
  }
  if (w12 <= 12.5 && (isThruster || (isQuad && spec.quadRearModel !== "mckeeLB" && spec.quadRearModel !== "basic"))) {
    notesItems.push(
      `Tail width is at or under 12.5" — the McKee narrow-tail forward cluster shift is applied automatically to keep the fins from crowding the tail.`,
    );
  }
  if (isPintail && isQuad) {
    notesItems.push(`Pintail shape adds 3⁄16" to the quad rear off-tail across all rear models, per the standard pintail correction.`);
  }
  notesItems.push(`All measurements round to the nearest 1/16" (0.1 cm in cm units) — expect a hair of play when routing to these numbers.`);

  const flags: FinPlacementFlags = {
    hasCenterSection,
    hasForwardSection,
    hasRearSection,
    quadCenterFinAvailable,
    isLongboardQuad,
    isBasicOffRail,
    showFrontToeTableLink,
    showRearToeTableLink,
    showRearOffRailSlider: isBasicOffRail,
    showRearOffTailOverride: isBasicOffRail,
    centerSectionLabel,
    forwardSectionLabel,
    rearSectionLabel,
    centerBaseLenFieldLabel: isSingle || isTwoPlusOne ? "Fin Box Length" : "Fin Base Length",
  };

  return {
    marks,
    sections,
    legend,
    modelHeader,
    notes: notesItems.filter((n) => n.length > 0),
    isModified,
    resolved: {
      centerOffTail: centerFinal,
      frontOffTail: frontFinal,
      rearOffTail: rearFinal,
      sideOffTail: sideFinal,
      twinOffTail: mainOffTail,
      pairOffTail: pairFinalOffTail,
      forwardToe: forwardToeValue,
      rearToe: rearToeValue,
      frontOffRail,
      twinOffRail: mainOffRail,
      sideOffRail: activeSideOffRail,
      quadRearOffRail: quadRearOffRailValue,
      quadRearOffTailBase: rearBase,
      rearHalfSpread: spread,
    },
    flags,
  };
}

// ============================================================================================
// Public (Mm) surface
// ============================================================================================

export function tailHalfWidthAt(shape: FinTailShape, tailWidth12: Mm, offTail: Mm): Mm {
  return inchesToMm(tailHalfWidthAtInches(shape, mmToInches(tailWidth12), mmToInches(offTail)));
}

export function tailOffTailAtHalfWidth(shape: FinTailShape, tailWidth12: Mm, targetHalfWidth: Mm): Mm {
  return inchesToMm(tailOffTailAtHalfWidthInches(shape, mmToInches(tailWidth12), mmToInches(targetHalfWidth)));
}

export function tailOutlineHalfPoints(
  shape: FinTailShape,
  tailWidth12: Mm,
  opts?: { diamondDepthMult?: number; yMax?: Mm },
): { points: Point2D[]; connector: Point2D | null } {
  const diamondDepthMult = opts?.diamondDepthMult ?? 1;
  const yMaxIn = opts?.yMax !== undefined ? mmToInches(opts.yMax) : 24;
  const { points, connector } = tailOutlineHalfPointsInches(shape, mmToInches(tailWidth12), diamondDepthMult, yMaxIn);
  return {
    points: points.map(([x, y]) => ({ x: inchesToMm(x), y: inchesToMm(y) })),
    connector: connector ? { x: inchesToMm(connector[0]), y: inchesToMm(connector[1]) } : null,
  };
}

/** Ported from `centerDefaultFor` (Fins.dc.html lines 734-737). */
export function defaultCenterBaseLength(setup: FinSetup): Mm {
  return inchesToMm(setup === "single" || setup === "2plus1" ? 10.5 : 4.5);
}

/** Ported from `resetAdvancedPatch` (Fins.dc.html lines 739-751). */
export function resetAdvanced(setup: FinSetup): FinAdvancedSpec {
  return {
    baseLenForward: inchesToMm(4.5),
    baseLenForwardOverridden: false,
    baseLenRear: inchesToMm(4.5),
    baseLenRearOverridden: false,
    baseLenCenter: defaultCenterBaseLength(setup),
    baseLenCenterOverridden: false,
    centerPositionOffset: mm(0),
    forwardPositionOffset: mm(0),
    forwardToeOverride: null,
    rearPositionOffset: mm(0),
    rearToeOverride: null,
    quadRearOffRailOverride: null,
    quadRearOffTailOverride: null,
    quadRearOffTailOverridden: false,
  };
}

/** Ported from `toeTableData` (Fins.dc.html lines 957-968). */
export function toeAimTableFor(boardLength: Mm, tailWidth12: Mm): ToeAimTableView {
  const L = mmToInches(boardLength);
  const W = mmToInches(tailWidth12);
  const rowKey = (L >= 72 ? "72+" : String(Math.round(L))) as ToeAimTableRowKey;

  let highlightIndex = 0;
  TOE_AIM_TABLE_COLUMNS.forEach((c, i) => {
    if (Math.abs(c - W) < Math.abs(TOE_AIM_TABLE_COLUMNS[highlightIndex] - W)) highlightIndex = i;
  });

  const front = TOE_AIM_TABLE.front[rowKey] ?? TOE_AIM_TABLE.front["72+"];
  const rear = TOE_AIM_TABLE.rear[rowKey] ?? TOE_AIM_TABLE.rear["72+"];

  return { columns: TOE_AIM_TABLE_COLUMNS, rowLabel: rowKey, front, rear, highlightIndex };
}

export function computeFinPlacement(spec: FinPlacementSpec): FinPlacementResult {
  const inchesSpec: FinPlacementSpecInches = {
    boardLength: mmToInches(spec.boardLength),
    tailWidth12: mmToInches(spec.tailWidth12),
    tailShape: spec.tailShape,
    finSetup: spec.finSetup,
    frontModel: spec.frontModel,
    quadRearModel: spec.quadRearModel,
    twinTemplate: spec.twinTemplate,
    quadCenterFinOn: spec.quadCenterFinOn,
    advanced: {
      baseLenForward: mmToInches(spec.advanced.baseLenForward),
      baseLenForwardOverridden: spec.advanced.baseLenForwardOverridden,
      baseLenRear: mmToInches(spec.advanced.baseLenRear),
      baseLenRearOverridden: spec.advanced.baseLenRearOverridden,
      baseLenCenter: mmToInches(spec.advanced.baseLenCenter),
      baseLenCenterOverridden: spec.advanced.baseLenCenterOverridden,
      centerPositionOffset: mmToInches(spec.advanced.centerPositionOffset),
      forwardPositionOffset: mmToInches(spec.advanced.forwardPositionOffset),
      forwardToeOverride:
        spec.advanced.forwardToeOverride !== null ? mmToInches(spec.advanced.forwardToeOverride) : null,
      rearPositionOffset: mmToInches(spec.advanced.rearPositionOffset),
      rearToeOverride: spec.advanced.rearToeOverride !== null ? mmToInches(spec.advanced.rearToeOverride) : null,
      quadRearOffRailOverride:
        spec.advanced.quadRearOffRailOverride !== null ? mmToInches(spec.advanced.quadRearOffRailOverride) : null,
      quadRearOffTailOverride:
        spec.advanced.quadRearOffTailOverride !== null ? mmToInches(spec.advanced.quadRearOffTailOverride) : null,
      quadRearOffTailOverridden: spec.advanced.quadRearOffTailOverridden,
    },
  };

  const core = computeFinPlacementInches(inchesSpec);

  return {
    marks: core.marks.map((m) => ({
      role: m.role,
      side: m.side,
      offTail: inchesToMm(m.offTail),
      lateral: inchesToMm(m.lateral),
      leadingOffTail: inchesToMm(m.leadingOffTail),
      leadingLateral: inchesToMm(m.leadingLateral),
      baseLength: inchesToMm(m.baseLength),
      toe: inchesToMm(m.toe),
      lateralKind: m.lateralKind,
      lateralValue: m.lateralValue !== null ? inchesToMm(m.lateralValue) : null,
    })),
    sections: core.sections.map((sec) => ({
      label: sec.label,
      groups: sec.groups.map((g) => ({
        heading: g.heading,
        rows: g.rows.map((r) => ({ label: r.label, value: inchesToMm(r.value) })),
        fullSpread: g.fullSpread !== null ? inchesToMm(g.fullSpread) : null,
      })),
    })),
    legend: core.legend.map((l) => ({ label: l.label, baseLength: inchesToMm(l.baseLength), dash: l.dash })),
    modelHeader: core.modelHeader,
    notes: core.notes,
    isModified: core.isModified,
    resolved: {
      centerOffTail: inchesToMm(core.resolved.centerOffTail),
      frontOffTail: inchesToMm(core.resolved.frontOffTail),
      rearOffTail: inchesToMm(core.resolved.rearOffTail),
      sideOffTail: inchesToMm(core.resolved.sideOffTail),
      twinOffTail: inchesToMm(core.resolved.twinOffTail),
      pairOffTail: inchesToMm(core.resolved.pairOffTail),
      forwardToe: inchesToMm(core.resolved.forwardToe),
      rearToe: inchesToMm(core.resolved.rearToe),
      frontOffRail: inchesToMm(core.resolved.frontOffRail),
      twinOffRail: inchesToMm(core.resolved.twinOffRail),
      sideOffRail: inchesToMm(core.resolved.sideOffRail),
      quadRearOffRail: inchesToMm(core.resolved.quadRearOffRail),
      quadRearOffTailBase: inchesToMm(core.resolved.quadRearOffTailBase),
      rearHalfSpread: inchesToMm(core.resolved.rearHalfSpread),
    },
    flags: core.flags,
  };
}
