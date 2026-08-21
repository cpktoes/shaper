/**
 * Rail band geometry engine.
 *
 * Ported statement-for-statement from the prototype's `computeSection`, `buildProfilePoints`,
 * `buildSegmentDefs` and `cardFromResult` (reference/project/Rails.dc.html lines 690-960), with
 * these deliberate changes and no others:
 *
 * 1. INCH-DOMAIN CORE. Unlike outline.ts, where only four constants carried a unit, nearly
 *    every constant in these formulas is an inch measurement. Converting each one individually
 *    would multiply the chance of a silent transcription error in the exact code whose
 *    correctness is the product's Core Value. So this module keeps private inch-domain
 *    functions that are statement-for-statement ports of the prototype (`computeSectionInches`,
 *    `buildProfilePointsInches`, `buildSegmentDefsInches`, `buildRailDataGroupsInches`, and the
 *    four band helpers), each carrying the prototype's own spreadsheet-cell comments, and the
 *    exported functions convert Mm in and Mm out at the boundary. The public surface is
 *    millimetres only; the inch core is never exported.
 * 2. DEAD CODE. The prototype declares `railTuck1For` (line 695) and `cornerCutDeckFor` (line
 *    698) but `computeSection` never calls them — it derives Rail Tuck 1 from
 *    `apexCenter - apexLenRange / 2` and Corner Cut (Deck) from `railMark1 - cornerCutRail`.
 *    Neither helper is ported.
 * 3. HARD EDGE DEFAULTING. The prototype omits `hardEdge` on its nose and center
 *    `computeSection` calls, leaving it `undefined` and therefore falsy at every read. This
 *    port passes an explicit `false`, which is behaviourally identical.
 * 4. PRESENTATION SPLIT. `buildSegmentDefs` carries `color` and `dash` on each segment. Colours
 *    are a UI concern and every prototype dash is `'none'`, so the exported segment type
 *    carries `key`, `label`, `p1`, `p2` only; the plot component owns a colour map keyed by
 *    `key`.
 */

import type { Point2D } from "./board";
import { type Mm, inchesToMm, mm, mmToInches, roundToSixteenthInch } from "./units";

export type RailFamily = 1 | 2 | 3 | 4 | 5;
export type RailSectionKey = "nose" | "center" | "tail";

// GSD product decision (NOT a source-workbook formula): the minimum meaningful gap between
// Bottom Tuck 3 and Bottom Tuck 1 when Bottom Tuck 3 is user-overridden. Tied to the app's 1/16"
// fractional-inch display/slider granularity, so a strictly-greater floor is always representable
// rather than an unexplainable floating-point epsilon.
export const MIN_BOTTOM_TUCK_SEPARATION_IN = 1 / 16;

/** Parametric controls for one rail section — the single place a section's sidebar writes to. */
export interface RailSectionSpec {
  boardThickness: Mm;
  deckPercent: number;
  family: RailFamily;
  ratioTopPercent: number;
  symmetrical: boolean;
  cornerCutOffsetOverride: Mm | null;
  removeCornerCut: boolean;
  singleTuck: boolean;
  bottomTuck3Override: Mm | null;
}

/** The three rail sections plus the tail-only Hard Edge flag. */
export interface RailBandSpec {
  nose: RailSectionSpec;
  center: RailSectionSpec;
  tail: RailSectionSpec;
  tailHardEdge: boolean;
}

/** `scale` and `domedBandBase` per section — ported verbatim from syncSnapshot's own call-site wiring. */
export const RAIL_SECTION_CONSTANTS: Record<RailSectionKey, { scale: number; domedBandBase: Mm }> = {
  nose: { scale: 0.75, domedBandBase: inchesToMm(4.5) },
  center: { scale: 1, domedBandBase: inchesToMm(6) },
  tail: { scale: 0.75, domedBandBase: inchesToMm(4.5) },
};

const DEFAULT_SECTION_COMMON = {
  deckPercent: 100,
  family: 3 as RailFamily,
  ratioTopPercent: 60,
  symmetrical: false,
  cornerCutOffsetOverride: null,
  removeCornerCut: false,
  singleTuck: false,
  bottomTuck3Override: null,
};

/** Ported from the prototype's state defaults (Rails.dc.html lines 507-527). */
export const DEFAULT_RAIL_BAND_SPEC: RailBandSpec = {
  nose: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(1.31) },
  center: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(2.5) },
  tail: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(1.56) },
  tailHardEdge: true,
};

/** Every field `computeSection` returns. `cornerCutRail`/`cornerCutOffset`/`cornerCutDeck` are
 * null exactly when the section's Corner Cut has been removed. */
export interface RailSectionResult {
  thickness: Mm;
  apexLenRange: Mm;
  apexCenter: Mm;
  railMark1: Mm;
  railTuck1: Mm;
  cornerCutRail: Mm | null;
  cornerCutOffset: Mm | null;
  domedDeckBand: Mm;
  deckMark1: Mm;
  deckMark2: Mm;
  deckMark3: Mm;
  cornerCutDeck: Mm | null;
  hardEdge: boolean;
  bottomTuck1: Mm;
  bottomTuck2: Mm;
  bottomTuck3: Mm;
  /** GSD-added (not part of the source workbook): the value bottomTuck3 would take with no
   * override present, including the hardEdge rule. Lets the UI offer this as the Bottom Tuck 3
   * slider's reachable max without recomputing symmetrical/hardEdge derivation logic itself. */
  bottomTuck3Derived: Mm;
  removeCornerCut: boolean;
  singleTuck: boolean;
}

export type RailSegmentKey =
  | "domedBand"
  | "band1"
  | "band2"
  | "cornerCut"
  | "hardEdge"
  | "tuck1"
  | "tuck2"
  | "boardConn"
  | "bottomConn"
  | "railConn";

/** One drawn segment of the cross-section, colour/dash-free (see deviation 4 above). */
export interface RailSegment {
  key: RailSegmentKey;
  label: string;
  p1: Point2D;
  p2: Point2D;
}

export type RailDataHeading = "Rail Side" | "Deck Side" | "Bottom";
/** A row's value: a real measurement, `null` when its magnitude snaps below 1/16" (renders as
 * an em dash), or the `"hard-edge"` sentinel for the single Bottom Tuck 3 row when hard edge is on. */
export type RailDataValue = Mm | null | "hard-edge";

export interface RailDataRow {
  label: string;
  value: RailDataValue;
}

export interface RailDataGroup {
  heading: RailDataHeading;
  rows: RailDataRow[];
}

// ---------------------------------------------------------------------------------------------
// Private inch-domain core — statement-for-statement ports of the prototype. Never exported.
// ---------------------------------------------------------------------------------------------

interface RailSectionResultInches {
  thickness: number;
  apexLenRange: number;
  apexCenter: number;
  railMark1: number;
  railTuck1: number;
  cornerCutRail: number | null;
  cornerCutOffset: number | null;
  domedDeckBand: number;
  deckMark1: number;
  deckMark2: number;
  deckMark3: number;
  cornerCutDeck: number | null;
  hardEdge: boolean;
  bottomTuck1: number;
  bottomTuck2: number;
  bottomTuck3: number;
  bottomTuck3Derived: number;
  removeCornerCut: boolean;
  singleTuck: boolean;
}

// ---- Rail Bands equations, from "Chris's Rails" (Center / Nose & Tail) ----
function apexLenRangeForInches(x: number): number {
  return -0.125 * x + 1.125;
}
function cornerCutRailOffsetForInches(x: number): number {
  const table: Record<number, number> = { 1: 0.125, 2: (0.125 + 0.0625) / 2, 3: 0.0625, 4: 0.0625 / 2, 5: 0 };
  return table[Math.round(x)] ?? 0;
}
function deckMark1ForInches(x: number): number {
  return 0.25 * x + 1.75;
}
function deckMark3ForInches(x: number): number {
  return 0.25 * x + 3.25;
}

const RAIL_FAMILY_NAMES: Record<number, string> = {
  1: "boxy",
  2: "boxy/med",
  3: "med",
  4: "med/knifey",
  5: "knifey",
};

/** Ported from the prototype's `familyLabel`. */
export function railFamilyLabel(x: number): string {
  return RAIL_FAMILY_NAMES[Math.round(x)] ?? String(x);
}

interface ComputeSectionInchesInput {
  thicknessIn: number;
  ratioTopPct: number;
  family: RailFamily;
  domedBandBaseIn: number;
  scale: number;
  cornerCutOffsetOverrideIn: number | null;
  removeCornerCut: boolean;
  singleTuck: boolean;
  bottomTuck3OverrideIn: number | null;
  symmetrical: boolean;
  hardEdge: boolean;
}

// Formulas below are transcribed from column C's live <f> cells in the source workbook (Chriss
// Rails Center / Chriss Rails Nose&Tail). `scale` = the sheet's "Scaled from center by" constant
// (1 for Center, 0.75 for Nose&Tail). Corner Cut (Rail) uses the user-supplied IFS offset table
// off Rail Mark 1.
function computeSectionInches(input: ComputeSectionInchesInput): RailSectionResultInches {
  const bottomRatio = 1 - input.ratioTopPct / 100; // C5: =100%-C4
  const apexLenRange = apexLenRangeForInches(input.family) * input.scale; // C13: =-0.125*C12+1.125 [*C3 for Nose&Tail]
  const apexCenter = input.thicknessIn * bottomRatio; // C14: =C11*C5
  const railMark1 = apexCenter + apexLenRange / 2; // C15: =C14+C13/2
  const railTuck1 = apexCenter - apexLenRange / 2; // C16: =C14-C13/2
  // Corner Cut offset: distance the mark falls BELOW Rail Mark 1 (0 = lands on Rail Mark 1 itself).
  const cornerCutOffset = input.removeCornerCut
    ? null
    : (input.cornerCutOffsetOverrideIn ?? cornerCutRailOffsetForInches(input.family));
  const cornerCutRail = input.removeCornerCut ? null : railMark1 - (cornerCutOffset as number);
  const domedDeckBand = input.domedBandBaseIn; // C18: plain constant, always on (visibility is a display concern)
  const deckMark1 = deckMark1ForInches(input.family) * input.scale; // C19: =(0.25*C12+1.75) [*C3 for Nose&Tail]
  const deckMark2 = deckMark1 / 2; // C20: =C19/2
  const deckMark3 = deckMark3ForInches(input.family) * input.scale; // C21: =0.25*C12+3.25 [*C3 for Nose&Tail]
  const cornerCutDeck = input.removeCornerCut ? null : railMark1 - (cornerCutRail as number); // C22: =C15-C17
  const bottomTuck1 = input.symmetrical ? deckMark1 : railTuck1 / 2; // C23: =IF(Symmetrical,C19,C16/2)
  const bottomTuck2 = bottomTuck1 / 2; // C24: =C23/2
  const bottomTuck3NoOverride = input.symmetrical ? deckMark3 : railTuck1; // C25 derivation itself
  const bottomTuck3 = input.hardEdge // C25: =IF(Symmetrical,C21,C16)
    ? 0
    : input.bottomTuck3OverrideIn === null
      ? bottomTuck3NoOverride
      : // GSD-added guard (not part of the source workbook): floor a user-supplied override at
        // Bottom Tuck 1 plus MIN_BOTTOM_TUCK_SEPARATION_IN so it can never sit at or below it and
        // invert/collapse the bottom marks. The derived branch above already satisfies
        // bottomTuck3 > bottomTuck1 by construction and is never floored — only the override is
        // guarded.
        Math.max(input.bottomTuck3OverrideIn, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN);
  // GSD-added (not part of the source workbook): the value bottomTuck3 would take with NO
  // override, including the hardEdge rule — exposed so the UI can offer it as the slider's
  // reachable max without recomputing symmetrical/hardEdge logic in the component.
  const bottomTuck3Derived = input.hardEdge ? 0 : bottomTuck3NoOverride;
  return {
    thickness: input.thicknessIn,
    apexLenRange,
    apexCenter,
    railMark1,
    railTuck1,
    cornerCutRail,
    cornerCutOffset,
    domedDeckBand,
    deckMark1,
    deckMark2,
    deckMark3,
    cornerCutDeck,
    hardEdge: input.hardEdge,
    bottomTuck1,
    bottomTuck2,
    bottomTuck3,
    bottomTuck3Derived,
    removeCornerCut: !!input.removeCornerCut,
    singleTuck: !!input.singleTuck,
  };
}

interface InchesProfileOpts {
  boardThicknessIn?: number;
  railThicknessValIn?: number;
  domedBandBaseIn?: number;
}

// Ordered cross-section profile for volume/geometry math: the true point-to-point path of foam
// removed by the rail bands at one station, from the innermost deck point (where the board is
// still full/board thickness) over the rail apex to the innermost bottom point. x=0 is the rail
// apex; x runs negative moving inboard toward the stringer; y is height off the bottom.
function buildProfilePointsInches(
  r: RailSectionResultInches,
  thicknessIn: number,
  domed: boolean,
  opts: InchesProfileOpts,
): [number, number][] {
  const bt = domed ? (opts.boardThicknessIn ?? thicknessIn) : thicknessIn;
  const rt = domed ? (opts.railThicknessValIn ?? thicknessIn) : thicknessIn;
  const bandWidth = domed
    ? r.domedDeckBand || opts.domedBandBaseIn || 1
    : opts.domedBandBaseIn || Math.max(r.deckMark3, 1);
  const domedY = (x: number) => (bt === rt ? thicknessIn : rt + (bt - rt) * Math.min(1, Math.max(0, -x / bandWidth)));
  const band1EndY = domedY(-r.deckMark1);
  const band1Y = (x: number) => {
    const t = r.deckMark1 > 0 ? -x / r.deckMark1 : 0;
    return r.railMark1 + (band1EndY - r.railMark1) * t;
  };
  const pts: [number, number][] = [
    [-bandWidth, bt],
    [-r.deckMark3, domedY(-r.deckMark3)],
    [-r.deckMark2, band1Y(-r.deckMark2)],
    [-r.deckMark1, domedY(-r.deckMark1)],
    [0, r.railMark1],
    [0, r.railTuck1],
  ];
  if (r.hardEdge) pts.push([0, 0]);
  else if (r.singleTuck) pts.push([-r.bottomTuck3, 0]);
  else {
    pts.push([-r.bottomTuck2, r.railTuck1 / 2]);
    pts.push([-r.bottomTuck3, 0]);
  }
  return pts;
}

interface RailSegmentInches {
  key: RailSegmentKey;
  label: string;
  p1: [number, number];
  p2: [number, number];
}

// ---- Rail band cross-section segments, following the sheet's chart segments ----
function buildSegmentDefsInches(
  r: RailSectionResultInches,
  thicknessIn: number,
  domed: boolean,
  opts: InchesProfileOpts,
): RailSegmentInches[] {
  const segs: RailSegmentInches[] = [];
  // Domed deck line: tapered rail thickness at the apex (x=0, right) sloping to full board
  // thickness inboard (left).
  const bt = domed ? (opts.boardThicknessIn ?? thicknessIn) : thicknessIn;
  const rt = domed ? (opts.railThicknessValIn ?? thicknessIn) : thicknessIn;
  const bandWidth = domed
    ? r.domedDeckBand || opts.domedBandBaseIn || 1
    : opts.domedBandBaseIn || Math.max(r.deckMark3, 1);
  const domedY = (x: number) => (bt === rt ? thicknessIn : rt + (bt - rt) * Math.min(1, Math.max(0, -x / bandWidth)));
  segs.push({ key: "domedBand", label: "Domed Deck Band", p1: [0, rt], p2: [-bandWidth, bt] });
  segs.push({ key: "band1", label: "Rail Band 1", p1: [0, r.railMark1], p2: [-r.deckMark1, domedY(-r.deckMark1)] });
  // Deck Mark 2 must sit exactly on the Rail Band 1 line at its own X position.
  const band1EndY = domedY(-r.deckMark1);
  const band1Y = (x: number) => {
    const t = r.deckMark1 > 0 ? -x / r.deckMark1 : 0;
    return r.railMark1 + (band1EndY - r.railMark1) * t;
  };
  segs.push({
    key: "band2",
    label: "Rail Band 2",
    p1: [-r.deckMark2, band1Y(-r.deckMark2)],
    p2: [-r.deckMark3, domedY(-r.deckMark3)],
  });
  // Corner Cut (Deck) also lands exactly on the Rail Band 1 line at its own X value.
  if (!r.removeCornerCut) {
    segs.push({
      key: "cornerCut",
      label: "Corner Cut",
      p1: [0, r.cornerCutRail as number],
      p2: [-(r.cornerCutDeck as number), band1Y(-(r.cornerCutDeck as number))],
    });
  }
  const leftEdge = -(bandWidth + 2);
  if (r.hardEdge) {
    segs.push({ key: "hardEdge", label: "Hard Edge", p1: [0, r.railTuck1], p2: [0, 0] });
  } else if (r.singleTuck) {
    // Single Tuck: Bottom Tuck 1/2 removed — Rail Tuck 1 connects straight to Bottom Tuck 3.
    segs.push({ key: "tuck1", label: "Rail Tuck 1", p1: [0, r.railTuck1], p2: [-r.bottomTuck3, 0] });
  } else {
    segs.push({ key: "tuck1", label: "Rail Tuck 1", p1: [0, r.railTuck1], p2: [-r.bottomTuck1, 0] });
    // Bottom Tuck 2 always sits on the midpoint of the Rail Tuck 1 line (0,railTuck1)→(-bottomTuck1,0).
    segs.push({
      key: "tuck2",
      label: "Rail Tuck 2",
      p1: [-r.bottomTuck2, r.railTuck1 / 2],
      p2: [-r.bottomTuck3, 0],
    });
  }
  // Reference connectors, always drawn.
  segs.push({ key: "boardConn", label: "Board Thickness", p1: [leftEdge, bt], p2: [-bandWidth, bt] });
  segs.push({ key: "bottomConn", label: "Left Edge → Bottom Tuck 3", p1: [leftEdge, 0], p2: [-r.bottomTuck3, 0] });
  segs.push({ key: "railConn", label: "Rail Mark 1 → Tuck 1", p1: [0, r.railMark1], p2: [0, r.railTuck1] });
  return segs;
}

/** True when a value's magnitude rounds below 1/16 inch — the prototype's `d()` em-dash rule. */
function inchesNearZero(valueIn: number): boolean {
  return Math.round(Math.abs(valueIn) * 16) / 16 < 1 / 16;
}

interface BuildRailDataGroupsInchesOpts {
  domed: boolean;
  boardThicknessIn: number;
}

function buildRailDataGroupsInches(
  r: RailSectionResultInches,
  opts: BuildRailDataGroupsInchesOpts,
): { heading: RailDataHeading; rows: { label: string; value: number | null | "hard-edge" }[] }[] {
  const d = (v: number): number | null => (inchesNearZero(v) ? null : v);

  const railRows: { label: string; value: number | null | "hard-edge" }[] = [];
  if (opts.domed) railRows.push({ label: "Board Thickness", value: d(opts.boardThicknessIn) });
  railRows.push(
    { label: opts.domed ? "Tapered Rail Thickness" : "Board Thickness", value: d(r.thickness) },
    { label: "Apex Thickness", value: d(r.apexLenRange) },
    { label: "Apex Center", value: d(r.apexCenter) },
    { label: "Rail Mark 1", value: d(r.railMark1) },
  );
  if (!r.hardEdge) railRows.push({ label: "Rail Tuck 1", value: d(r.railTuck1) });
  if (!r.removeCornerCut) railRows.push({ label: "Corner Cut (Rail)", value: d(r.cornerCutRail as number) });

  const deckRows: { label: string; value: number | null | "hard-edge" }[] = [];
  if (opts.domed) deckRows.push({ label: "Domed Deck Band", value: d(r.domedDeckBand) });
  deckRows.push(
    { label: "Deck Mark 1", value: d(r.deckMark1) },
    { label: "Deck Mark 2", value: d(r.deckMark2) },
    { label: "Deck Mark 3", value: d(r.deckMark3) },
  );
  if (!r.removeCornerCut) deckRows.push({ label: "Corner Cut (Deck)", value: d(r.cornerCutDeck as number) });

  const bottomRows: { label: string; value: number | null | "hard-edge" }[] = r.hardEdge
    ? [{ label: "Bottom Tuck 3", value: "hard-edge" }]
    : (r.singleTuck
        ? []
        : [
            { label: "Bottom Tuck 1", value: d(r.bottomTuck1) },
            { label: "Bottom Tuck 2", value: d(r.bottomTuck2) },
          ]
      ).concat([{ label: "Bottom Tuck 3", value: d(r.bottomTuck3) }]);

  return [
    { heading: "Rail Side", rows: railRows },
    { heading: "Deck Side", rows: deckRows },
    { heading: "Bottom", rows: bottomRows },
  ];
}

// ---------------------------------------------------------------------------------------------
// Public Mm boundary
// ---------------------------------------------------------------------------------------------

function resultToInches(r: RailSectionResult): RailSectionResultInches {
  return {
    thickness: mmToInches(r.thickness),
    apexLenRange: mmToInches(r.apexLenRange),
    apexCenter: mmToInches(r.apexCenter),
    railMark1: mmToInches(r.railMark1),
    railTuck1: mmToInches(r.railTuck1),
    cornerCutRail: r.cornerCutRail === null ? null : mmToInches(r.cornerCutRail),
    cornerCutOffset: r.cornerCutOffset === null ? null : mmToInches(r.cornerCutOffset),
    domedDeckBand: mmToInches(r.domedDeckBand),
    deckMark1: mmToInches(r.deckMark1),
    deckMark2: mmToInches(r.deckMark2),
    deckMark3: mmToInches(r.deckMark3),
    cornerCutDeck: r.cornerCutDeck === null ? null : mmToInches(r.cornerCutDeck),
    hardEdge: r.hardEdge,
    bottomTuck1: mmToInches(r.bottomTuck1),
    bottomTuck2: mmToInches(r.bottomTuck2),
    bottomTuck3: mmToInches(r.bottomTuck3),
    bottomTuck3Derived: mmToInches(r.bottomTuck3Derived),
    removeCornerCut: r.removeCornerCut,
    singleTuck: r.singleTuck,
  };
}

export interface ComputeRailSectionInput {
  thickness: Mm;
  ratioTopPercent: number;
  family: RailFamily;
  domedBandBase: Mm;
  scale: number;
  cornerCutOffsetOverride: Mm | null;
  removeCornerCut: boolean;
  singleTuck: boolean;
  bottomTuck3Override: Mm | null;
  symmetrical: boolean;
  hardEdge: boolean;
}

/** Mm-boundary port of the prototype's `computeSection`. */
export function computeRailSection(input: ComputeRailSectionInput): RailSectionResult {
  const rIn = computeSectionInches({
    thicknessIn: mmToInches(input.thickness),
    ratioTopPct: input.ratioTopPercent,
    family: input.family,
    domedBandBaseIn: mmToInches(input.domedBandBase),
    scale: input.scale,
    cornerCutOffsetOverrideIn:
      input.cornerCutOffsetOverride === null ? null : mmToInches(input.cornerCutOffsetOverride),
    removeCornerCut: input.removeCornerCut,
    singleTuck: input.singleTuck,
    bottomTuck3OverrideIn: input.bottomTuck3Override === null ? null : mmToInches(input.bottomTuck3Override),
    symmetrical: input.symmetrical,
    hardEdge: input.hardEdge,
  });
  return {
    thickness: inchesToMm(rIn.thickness),
    apexLenRange: inchesToMm(rIn.apexLenRange),
    apexCenter: inchesToMm(rIn.apexCenter),
    railMark1: inchesToMm(rIn.railMark1),
    railTuck1: inchesToMm(rIn.railTuck1),
    cornerCutRail: rIn.cornerCutRail === null ? null : inchesToMm(rIn.cornerCutRail),
    cornerCutOffset: rIn.cornerCutOffset === null ? null : inchesToMm(rIn.cornerCutOffset),
    domedDeckBand: inchesToMm(rIn.domedDeckBand),
    deckMark1: inchesToMm(rIn.deckMark1),
    deckMark2: inchesToMm(rIn.deckMark2),
    deckMark3: inchesToMm(rIn.deckMark3),
    cornerCutDeck: rIn.cornerCutDeck === null ? null : inchesToMm(rIn.cornerCutDeck),
    hardEdge: rIn.hardEdge,
    bottomTuck1: inchesToMm(rIn.bottomTuck1),
    bottomTuck2: inchesToMm(rIn.bottomTuck2),
    bottomTuck3: inchesToMm(rIn.bottomTuck3),
    bottomTuck3Derived: inchesToMm(rIn.bottomTuck3Derived),
    removeCornerCut: rIn.removeCornerCut,
    singleTuck: rIn.singleTuck,
  };
}

export interface RailProfileOpts {
  boardThickness?: Mm;
  railThicknessVal?: Mm;
  domedBandBase?: Mm;
}

function toInchesOpts(opts: RailProfileOpts): InchesProfileOpts {
  return {
    boardThicknessIn: opts.boardThickness !== undefined ? mmToInches(opts.boardThickness) : undefined,
    railThicknessValIn: opts.railThicknessVal !== undefined ? mmToInches(opts.railThicknessVal) : undefined,
    domedBandBaseIn: opts.domedBandBase !== undefined ? mmToInches(opts.domedBandBase) : undefined,
  };
}

/** The cross-section profile as one continuous point path — pinned now for Volume to consume later. */
export function buildRailProfile(
  result: RailSectionResult,
  thickness: Mm,
  domed: boolean,
  opts: RailProfileOpts = {},
): Point2D[] {
  const ptsIn = buildProfilePointsInches(resultToInches(result), mmToInches(thickness), domed, toInchesOpts(opts));
  return ptsIn.map(([x, y]) => ({ x: mm(inchesToMm(x)), y: mm(inchesToMm(y)) }));
}

/** The cross-section drawn as separate labeled segments (mirrors `buildRailProfile`'s points). */
export function buildRailSegments(
  result: RailSectionResult,
  thickness: Mm,
  domed: boolean,
  opts: RailProfileOpts = {},
): RailSegment[] {
  const segsIn = buildSegmentDefsInches(resultToInches(result), mmToInches(thickness), domed, toInchesOpts(opts));
  return segsIn.map((s) => ({
    key: s.key,
    label: s.label,
    p1: { x: mm(inchesToMm(s.p1[0])), y: mm(inchesToMm(s.p1[1])) },
    p2: { x: mm(inchesToMm(s.p2[0])), y: mm(inchesToMm(s.p2[1])) },
  }));
}

export interface RailPlotBoundsOpts {
  domed: boolean;
  thickness: Mm;
  boardThickness?: Mm;
  domedBandBase?: Mm;
  xAxisMinShared?: Mm;
}

/** Axis range for one section's plot, ported from `buildPlot`'s axis math only (no pixel math here). */
export function railPlotBounds(result: RailSectionResult, opts: RailPlotBoundsOpts): { xAxisMin: Mm; yAxisMax: Mm } {
  const thicknessIn = mmToInches(opts.thickness);
  const blankThicknessIn = opts.domed ? (opts.boardThickness !== undefined ? mmToInches(opts.boardThickness) : thicknessIn) : thicknessIn;
  const domedBandBaseIn = opts.domedBandBase !== undefined ? mmToInches(opts.domedBandBase) : undefined;
  const bandWidthIn = opts.domed
    ? mmToInches(result.domedDeckBand) || domedBandBaseIn || 1
    : domedBandBaseIn || Math.max(mmToInches(result.deckMark3), 1);
  const xAxisMinIn = Math.min(-(bandWidthIn + 2), opts.xAxisMinShared !== undefined ? mmToInches(opts.xAxisMinShared) : 0);
  const yAxisMaxIn = blankThicknessIn + 0.25;
  return { xAxisMin: mm(inchesToMm(xAxisMinIn)), yAxisMax: mm(inchesToMm(yAxisMaxIn)) };
}

export interface BuildRailDataGroupsOpts {
  domed: boolean;
  boardThickness: Mm;
}

/** Mm-boundary port of `cardFromResult`'s group structure, with values as data rather than strings. */
export function buildRailDataGroups(result: RailSectionResult, opts: BuildRailDataGroupsOpts): RailDataGroup[] {
  const groupsIn = buildRailDataGroupsInches(resultToInches(result), {
    domed: opts.domed,
    boardThicknessIn: mmToInches(opts.boardThickness),
  });
  return groupsIn.map((g) => ({
    heading: g.heading,
    rows: g.rows.map((row) => ({
      label: row.label,
      value: row.value === null || row.value === "hard-edge" ? row.value : mm(inchesToMm(row.value)),
    })),
  }));
}

export interface RailSectionOutput {
  domed: boolean;
  boardThickness: Mm;
  railThicknessClamped: Mm;
  thicknessEff: Mm;
  result: RailSectionResult;
  profile: Point2D[];
  segments: RailSegment[];
  bounds: { xAxisMin: Mm; yAxisMax: Mm };
  dataGroups: RailDataGroup[];
}

export interface RailBandsOutput {
  nose: RailSectionOutput;
  center: RailSectionOutput;
  tail: RailSectionOutput;
}

/** The `syncSnapshot` orchestration: taper-clamp each section, then compute its full output. */
export function computeRailBands(spec: RailBandSpec): RailBandsOutput {
  const build = (key: RailSectionKey, sectionSpec: RailSectionSpec, hardEdge: boolean): RailSectionOutput => {
    const { scale, domedBandBase } = RAIL_SECTION_CONSTANTS[key];
    const domed = sectionSpec.deckPercent < 100;
    const railThicknessClamped = roundToSixteenthInch(
      mm((sectionSpec.boardThickness * sectionSpec.deckPercent) / 100),
    );
    const thicknessEff = domed ? railThicknessClamped : sectionSpec.boardThickness;

    const result = computeRailSection({
      thickness: thicknessEff,
      ratioTopPercent: sectionSpec.ratioTopPercent,
      family: sectionSpec.family,
      domedBandBase,
      scale,
      cornerCutOffsetOverride: sectionSpec.cornerCutOffsetOverride,
      removeCornerCut: sectionSpec.removeCornerCut,
      singleTuck: sectionSpec.singleTuck,
      bottomTuck3Override: sectionSpec.bottomTuck3Override,
      symmetrical: sectionSpec.symmetrical,
      hardEdge,
    });

    const profileOpts: RailProfileOpts = {
      boardThickness: sectionSpec.boardThickness,
      railThicknessVal: railThicknessClamped,
      domedBandBase,
    };
    const profile = buildRailProfile(result, thicknessEff, domed, profileOpts);
    const segments = buildRailSegments(result, thicknessEff, domed, profileOpts);
    const bounds = railPlotBounds(result, {
      domed,
      thickness: thicknessEff,
      boardThickness: sectionSpec.boardThickness,
      domedBandBase,
    });
    const dataGroups = buildRailDataGroups(result, { domed, boardThickness: sectionSpec.boardThickness });

    return {
      domed,
      boardThickness: sectionSpec.boardThickness,
      railThicknessClamped,
      thicknessEff,
      result,
      profile,
      segments,
      bounds,
      dataGroups,
    };
  };

  return {
    nose: build("nose", spec.nose, false),
    center: build("center", spec.center, false),
    tail: build("tail", spec.tail, spec.tailHardEdge),
  };
}

export const RAIL_DATA_HEADINGS = ["Rail Side", "Deck Side", "Bottom"] as const;

/** Fixed canonical row order per heading (matches `cardFromResult`'s own push order) — rows
 * never shuffle based on which sections are open or which flags are set. */
export const RAIL_DATA_LABEL_ORDER: Record<RailDataHeading, string[]> = {
  "Rail Side": [
    "Board Thickness",
    "Tapered Rail Thickness",
    "Apex Thickness",
    "Apex Center",
    "Rail Mark 1",
    "Rail Tuck 1",
    "Corner Cut (Rail)",
  ],
  "Deck Side": ["Domed Deck Band", "Deck Mark 1", "Deck Mark 2", "Deck Mark 3", "Corner Cut (Deck)"],
  Bottom: ["Bottom Tuck 1", "Bottom Tuck 2", "Bottom Tuck 3"],
};

export interface RailDataColumn {
  key: RailSectionKey;
  dataGroups: RailDataGroup[];
}

export interface MergedRailDataRow {
  label: string;
  cells: RailDataValue[];
}

export interface MergedRailDataGroup {
  heading: RailDataHeading;
  rows: MergedRailDataRow[];
}

/** A single merged table (mark name + one value column per open section) instead of three
 * separate per-section groups, since all three share the same mark names. Emits rows in the
 * fixed canonical order regardless of which sections are open, filling absent cells with null
 * (renders as an em dash). */
export function mergeRailDataTable(columns: RailDataColumn[]): MergedRailDataGroup[] {
  return RAIL_DATA_HEADINGS.map((heading) => {
    const labelOrder = RAIL_DATA_LABEL_ORDER[heading];
    const rows: MergedRailDataRow[] = labelOrder.map((label) => ({
      label,
      cells: columns.map((col) => {
        const group = col.dataGroups.find((g) => g.heading === heading);
        const row = group ? group.rows.find((r) => r.label === label) : undefined;
        return row ? row.value : null;
      }),
    }));
    return { heading, rows };
  });
}
