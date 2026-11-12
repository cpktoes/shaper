/**
 * Rail band geometry engine — the founder's "Chris Rails v2" sheets (quick 261102-gec, 2026-11-02).
 *
 * Every rail's marks come from the founder's two v2 sheets, "Chris Center Rail v2" and "Chris Nose&Tail
 * Rail v2" in Chris Rails v2.xlsx (Google Drive, the 10:03 save of 2026-11-02), as the reference page
 * the founder signed off works them out: `reference/sketches/018-chris-rails-v2.js`, its `sheetV2` and
 * `segments`, whose own numbers are this module's golden (`__fixtures__/rails-v2-golden.json`, written by
 * `scripts/extract-rails-v2-golden.ts`). The prototype's rules (Rails.dc.html, with its Corner Cut and its
 * per-section constants table) are retired on this branch; its golden stays only because the VOLUME
 * estimator's own golden generator reads it (PC9).
 *
 * The sheet, in plain words (t = the thickness the sheet works from — the board thickness on a flat deck,
 * the tapered rail thickness, rounded to the 1/16", on a domed one; T = the board thickness; s = "Scaled
 * from center by", always 1 on the centre and, since fast task 189, 1 by default on the nose and tail too):
 * - Apex Thickness (the sheet's "Apex Length") = (-0.125 x Family + 1.375) x t x 0.35 x s; the Apex Center
 *   sits at t x the bottom part of the Ratio, with Rail Mark 1 half the apex above it and Rail Tuck 1 half
 *   below.
 * - The Domed Deck Band is 2.4 x T and is never scaled; Deck Mark 1 = T x s, Deck Mark 2 always half of it,
 *   Deck Mark 3 = 1.8 x T x s.
 * - Bottom Tuck 1 = Rail Tuck 1 x 0.577 (Fred's 30° tool), or Deck Mark 1 with Sym on; Bottom Tuck 2 always
 *   half of it; Bottom Tuck 3 = Rail Tuck 1, or Deck Mark 3 with Sym on.
 * - There is no Corner Cut, and no rounding inside the rules (marks show to the 1/16" or whole mm as
 *   usual).
 *
 * What the app adds that the sheet does not (the plan's rules 1-13 and its planner's choices; the
 * reference page leaves all of them out, so each is proven by a rule test rather than the golden):
 * - HELD INPUTS (R7, PC6). The engine reads Deck Profile as at least 75% (the sheet's minimum rail
 *   thickness), Ratio as 20-80, the scale as 0.50-1.00 (the centre always 1) and each nudge inside its
 *   window (±2" on the Domed Deck Band, ±1/2" on the deck marks, ±1/4" on the others). A stored value is
 *   never rewritten.
 * - NUDGES (PC1, amended by plan 04's PC25, R17 and R18, 2026-11-02). Each rail stores six plus-or-minus
 *   amounts, one per mark the founder can tweak, all 0 on a new board: Apex Thickness, Deck Mark 1, Deck
 *   Mark 3, the Domed Deck Band, Bottom Tuck 1 and Bottom Tuck 3. Deck Mark 2 and Bottom Tuck 2 have none:
 *   the founder, "Always in the middle is great" — each is always half its (nudged) parent mark. A mark
 *   that depends on another reads that one's final value first and then adds its own nudge (rule 8).
 * - THE APEX TRIM (R4, PC3). Where the apex would run off the rail — Family 1 at either end of the Ratio —
 *   Apex Thickness shrinks evenly about the Apex Center until Rail Tuck 1 sits 1/16" above the bottom and
 *   Rail Mark 1 1/16" below the deck, and the result says it was trimmed.
 * - THE FLOORS (R9, PC4, PC5, PC26). No mark under 1/16"; Deck Mark 2 inside Deck Mark 1 and Bottom Tuck 2
 *   inside Bottom Tuck 1; Deck Mark 3 at least 1/16" beyond Deck Mark 1; the Domed Deck Band at least 1/16"
 *   beyond Deck Mark 3 (the founder's final ruling, R18: "never let it equal Deck Mark 3"); Bottom Tuck 3 at
 *   least `MIN_BOTTOM_TUCK_SEPARATION_IN` beyond Bottom Tuck 1.
 * - SINGLE TUCK and the tail's HARD EDGE, exactly as before (R14).
 *
 * INCH-DOMAIN CORE. Nearly every constant here is an inch figure from the sheet, so the private functions
 * below work in inches with the sheet's own cell names in their comments (C5, C11-C21), and the exported
 * functions convert Mm in and Mm out at the boundary. The public surface is millimetres only; the inch
 * core is never exported. Colours are a UI concern: a drawn segment carries `key`, `label`, `p1`, `p2`
 * only and the plot owns a colour map keyed by `key`.
 */

import type { Point2D } from "./board";
import { type Mm, inchesToMm, mm, mmToInches, roundToSixteenthInch } from "./units";

export type RailFamily = 1 | 2 | 3 | 4 | 5;
export type RailSectionKey = "nose" | "center" | "tail";

// GSD product decision (NOT a source-workbook formula): the minimum meaningful gap between Bottom Tuck
// 3 and Bottom Tuck 1. Tied to the app's 1/16" fractional-inch display/slider granularity, so a
// strictly-greater floor is always representable rather than an unexplainable floating-point epsilon.
export const MIN_BOTTOM_TUCK_SEPARATION_IN = 1 / 16;

/** The smallest any rail mark may be, in inches (R9): the app's 1/16" step. */
export const MIN_RAIL_MARK_IN = 1 / 16;

/** The lowest Deck Profile the rules read (R7): the founder's sheet notes "Min Rail Thickness = Board
 * thickness *.75". A board saved below it draws at 75% without its stored number changing. */
export const DECK_PERCENT_MIN = 75;

/** The Ratio's window and step (R8): 20/80 to 80/20 in halves, so 62.5/37.5 is reachable. */
export const RAIL_RATIO_RANGE = { min: 20, max: 80, step: 0.5 } as const;

/** "Scaled from center by" (R10): nose and tail only, 0.50 to 1.00 in 0.05 steps. */
export const RAIL_SCALE_RANGE = { min: 0.5, max: 1, step: 0.05 } as const;

/** The nose's and tail's "Scaled from center by" on a new board, and on a board saved before it existed.
 * 1.00 since fast task 189 (R20, the founder, 2026-11-02: "Go with 1.00 as the default") — it was the sheet's
 * 0.75 until the founder asked whether that multiplier was redundant beside marks that already follow the
 * thickness at 12": it was. Greenlight's charts need their "75% at 12"" because their deck marks are fixed
 * inches that do not know the tip is thinner; these marks read the tip's own thickness, which on an ordinary
 * foil already puts them near 70% of the centre's, so 0.75 on top made the tips about half the centre's. At
 * 1.00 the tips follow the foil alone, and the slider stays as a deliberate extra tightening — the only one
 * a board with no foil would get. A board saved with 0.75 keeps it (the value is stored, not the default). */
export const DEFAULT_TIP_RAIL_SCALE = 1;

/** The six marks a shaper can nudge off its formula, in the Advanced menu's order (PC1, amended by quick
 * 261102-gec plan 04's PC25, 2026-11-02) — the one list the sliders, Reset, volume's blend, the saved-board
 * reader and the "Copy preset values" printer all walk. Deck Mark 2 and Bottom Tuck 2 left it (R17: "Deck
 * mark 2 and Bottom Tuck 2 don't need sliders. Always in the middle is great.") and the Domed Deck Band
 * joined it, right after Deck Mark 3 (R18: "I would like to add an advanced slider for the domed deck
 * mark though."). */
export const RAIL_NUDGE_KEYS = [
  "apexThickness",
  "deckMark1",
  "deckMark3",
  "domedDeckBand",
  "bottomTuck1",
  "bottomTuck3",
] as const;
export type RailNudgeKey = (typeof RAIL_NUDGE_KEYS)[number];
export type RailMarkNudges = Record<RailNudgeKey, Mm>;

/** How far each nudge may move its mark either way, in inches: the Domed Deck Band ±2" (R18, the founder:
 * "Let's keep the ±2" slider"), Bottom Tuck 3 ±3/4" (R19, the founder, 2026-11-02: "bottom tuck 3 tweak should
 * go to ±3/4""), the deck marks ±1/2", Apex Thickness and Bottom Tuck 1 ±1/4". A −3/4" Bottom Tuck 3 still stops
 * 1/16" beyond Bottom Tuck 1 (the floor in `computeRailSectionInches`), as any nudge of it always has. */
export const RAIL_NUDGE_LIMIT_IN: Readonly<Record<RailNudgeKey, number>> = {
  apexThickness: 0.25,
  deckMark1: 0.5,
  deckMark3: 0.5,
  domedDeckBand: 2,
  bottomTuck1: 0.25,
  bottomTuck3: 0.75,
};

/** Every nudge at 0 — every mark exactly on its formula. */
export const ZERO_RAIL_NUDGES: RailMarkNudges = {
  apexThickness: mm(0),
  deckMark1: mm(0),
  deckMark3: mm(0),
  domedDeckBand: mm(0),
  bottomTuck1: mm(0),
  bottomTuck3: mm(0),
};

/**
 * A rail's nudges as exactly the six keys, in menu order (quick 261102-gec plan 04, PC29, 2026-11-02): a
 * missing nudge, or one that is not a finite number, reads 0, and any other key — a Deck Mark 2 or Bottom
 * Tuck 2 amount from a board saved before the founder's ruling, "Always in the middle is great" (R17) — is
 * dropped. Saved boards already reach the app through the reader, which does the same; this covers a board
 * that was in memory before the Domed Deck Band nudge existed (R18, "Let's keep the ±2" slider, but never
 * let it equal Deck Mark 3."), so it never draws a mark that is not a number and never carries a retired
 * amount into a save.
 */
export function railNudgesOf(nudges: Partial<Record<string, unknown>> | null | undefined): RailMarkNudges {
  return Object.fromEntries(
    RAIL_NUDGE_KEYS.map((k) => {
      const v = nudges?.[k];
      return [k, mm(typeof v === "number" && Number.isFinite(v) ? v : 0)];
    }),
  ) as RailMarkNudges;
}

/** Each nudge's name on the Advanced menu's sliders (quick 261102-gec plan 02, PC18, 2026-11-02) — the DATA
 * tab's own words for the mark it moves, so a shaper reads the same name in both places. */
export const RAIL_NUDGE_NAMES: Readonly<Record<RailNudgeKey, string>> = {
  apexThickness: "Apex Thickness",
  deckMark1: "Deck Mark 1",
  deckMark3: "Deck Mark 3",
  domedDeckBand: "Domed Deck Band",
  bottomTuck1: "Bottom Tuck 1",
  bottomTuck3: "Bottom Tuck 3",
};

/** A nudge slider's step in inches (the founder's brief: "in 1/16" or 1 mm steps"; PC24). Metric steps a
 * whole millimetre through `measureSlider`. */
export const RAIL_NUDGE_STEP_IN = 1 / 16;

/** What a rail's Advanced settings are on a new board (PC20): every nudge 0, Single Tuck off, Sharp Bottom
 * Edge off (quick 261102-gec plan 05, R22/PC37), and "Scaled from center by" `DEFAULT_TIP_RAIL_SCALE` (1 since
 * fast task 189) on the nose and tail, 1 on the centre. Reset Advanced Settings puts a rail back to
 * exactly these (and the tail's Hard Edge back on, which lives on the whole spec, not the section). */
export function defaultRailAdvanced(
  key: RailSectionKey,
): Pick<RailSectionSpec, "scaleFromCenter" | "nudges" | "singleTuck" | "sharpBottomTuck"> {
  return {
    scaleFromCenter: key === "center" ? 1 : DEFAULT_TIP_RAIL_SCALE,
    nudges: ZERO_RAIL_NUDGES,
    singleTuck: false,
    sharpBottomTuck: false,
  };
}

/** The Deck Profile slider's step (R7, PC23), moved here from the sidebar so it can be tested: about one
 * 1/16" of rail thickness per step (the prototype's `deckProfileFor` rule), rounded to a whole number of
 * steps over the 75-100% range so both ends — Flat at 100% and the founder's 75% floor — stay exactly
 * reachable at any thickness. It was over the old 66-100% range (34 points); the floor moved to 75%. */
export function deckProfileSliderStep(thicknessIn: number): number {
  const span = 100 - DECK_PERCENT_MIN;
  const rawStep = Math.max(0.01, (0.0625 / thicknessIn) * 100);
  const steps = Math.max(1, Math.round(span / rawStep));
  return span / steps;
}

/** Parametric controls for one rail section — the single place a section's sidebar writes to.
 *
 * `cornerCutOffsetOverride`, `removeCornerCut` and `bottomTuck3Override` are LEGACY (PC2, R12): the v2
 * rules have no Corner Cut and work Bottom Tuck 3 out themselves, so nothing reads them. They stay in the
 * stored board, carried exactly as read, because the saved-board reader on `main` still requires them —
 * so a board saved on this branch still opens there and on a rolled-back deployment. */
export interface RailSectionSpec {
  boardThickness: Mm;
  deckPercent: number;
  family: RailFamily;
  ratioTopPercent: number;
  symmetrical: boolean;
  cornerCutOffsetOverride: Mm | null;
  removeCornerCut: boolean;
  singleTuck: boolean;
  /** Sharp Bottom Tuck (quick 261102-gec plan 05, R22 — the founder, 2026-11-02: "an advanced checkbox for
   * leaving the bottom edge fairly sharp (follow the angle at bottom tuck 3)"). On, the finished rail keeps
   * the corner at Bottom Tuck 3 as the cut leaves it instead of rolling it away; the cuts, the marks and the
   * DATA rows never change. Off on a new board and after Reset; a board saved without it reads off. */
  sharpBottomTuck: boolean;
  bottomTuck3Override: Mm | null;
  /** "Scaled from center by" (R10). Read as 1 on the centre whatever is stored. */
  scaleFromCenter: number;
  /** How far each mark is nudged off its formula (PC1), in millimetres. */
  nudges: RailMarkNudges;
}

/** The three rail sections plus the tail-only Hard Edge flag and the tail rail's two blend settings. Since
 * D-32 (plan 16-15) those two settings bound the tail's WHOLE rail character — Hard Edge, Family,
 * Symmetrical, Single Tuck and Sharp Bottom Tuck — fading into the centre's, Hard Edge ticked or not; the
 * nose's blend is automatic and stores nothing. */
export interface RailBandSpec {
  nose: RailSectionSpec;
  center: RailSectionSpec;
  tail: RailSectionSpec;
  tailHardEdge: boolean;
  /**
   * Tail Rail Blends From (Phase 16, D-30, the founder 2026-11-04; named Hard Edge Blends From until D-32):
   * where the tail's rail starts blending into the centre's, measured from the tail tip — the tail's rail as
   * set is full at and behind it. Since D-32 it governs the tail's whole rail character, not only the hard
   * edge; the field keeps its name because saved boards carry it. Absent on every board saved before D-30
   * and on every preset, which read `DEFAULT_HARD_EDGE_BLENDS_FROM_IN` (18"); always read through
   * `hardEdgeBlendsFrom`, which forgives anything outside its window.
   */
  tailHardEdgeBlendsFrom?: Mm;
  /**
   * Tail Rail Ends At (Phase 16, D-20/D-30; named Hard Edge Ends At until D-32): where the rail has fully
   * blended into the centre's rail as set — since D-32 its whole character, Family and tucks alike —
   * measured from the tail tip; the field keeps its name because saved boards carry it. Absent on every
   * board saved before Phase 16 and on every preset, which read the board's own `defaultHardEdgeEndsAt`
   * (L/3 − 18 inches short of the centre: 30" on a 6'0"); always read
   * through `hardEdgeEndsAt`, which keeps it at least `HARD_EDGE_MIN_BLEND_IN` past Blends From and never past
   * the board's centre.
   */
  tailHardEdgeEndsAt?: Mm;
}

/**
 * The range and step, in inches, a tail's Hard Edge Blends From may be set to (D-30). It never goes below the
 * 12" mark, so RAILS' tail plot at its own station is always a full hard edge; on a board too short for 30",
 * its top is the centre less `HARD_EDGE_MIN_BLEND_IN`.
 */
export const HARD_EDGE_BLENDS_FROM_RANGE_IN = { min: 12, max: 30, step: 0.5 } as const;

/** Where a tail's hard edge starts blending when the board says nothing else, in inches from the tail tip. */
export const DEFAULT_HARD_EDGE_BLENDS_FROM_IN = 18;

/** The least distance, in inches, between Hard Edge Blends From and Hard Edge Ends At (D-30). */
export const HARD_EDGE_MIN_BLEND_IN = 2;

/**
 * Hard Edge Ends At's step, in inches (D-20/D-30). Its bounds are not fixed numbers: it runs from
 * Blends From + `HARD_EDGE_MIN_BLEND_IN` to the board's centre station ("all the way to the centre of the
 * board", the founder), so they come from `hardEdgeWindows`.
 */
export const HARD_EDGE_ENDS_AT_RANGE_IN = { step: 0.5 } as const;

/** The 18 in the founder's default-end rule, L/3 − 18 inches short of the centre (D-30). Its own number, not the
 * default start's: "Two independent values." */
export const DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN = 18;

/**
 * Where a tail's hard edge has fully blended into the centre's tucked rail when the board says nothing else, in
 * millimetres from the tail tip (Phase 16, D-30). The founder's rule, in his words: "Default start = 18". Default
 * end at = L/3 − 18. Two independent values." — and L/3 − 18 is "Inches short of the centre". So, with L the
 * board's length in inches, the default end sits L/2 − (L/3 − 18) = L/6 + 18 inches from the tail, rounded to the
 * nearest 1/2" (the slider's step): 30" on a 6'0", 29 1/2" on a 5'8", 30 1/2" on a 6'2", 32 1/2" on a 7'2" and 36"
 * on a 9'0". It never reads the start (the two defaults are independent); `hardEdgeEndsAt` clamps it into
 * [Blends From + 2", centre] like any value.
 */
export function defaultHardEdgeEndsAt(length: Mm): Mm {
  const lengthIn = mmToInches(length);
  const shortOfCentreIn = lengthIn / 3 - DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN;
  const fromTailIn = lengthIn / 2 - shortOfCentreIn;
  const { step } = HARD_EDGE_ENDS_AT_RANGE_IN;
  return inchesToMm(Math.round(fromTailIn / step) * step);
}

/** A window in millimetres from the tail tip. */
export interface HardEdgeWindow {
  min: Mm;
  max: Mm;
}

/** True when `stored` is a finite number inside `window`. */
function storedInside(stored: unknown, window: HardEdgeWindow): stored is number {
  return typeof stored === "number" && Number.isFinite(stored) && stored >= window.min && stored <= window.max;
}

function clampInto(value: number, window: HardEdgeWindow): Mm {
  return mm(Math.min(window.max, Math.max(window.min, value)));
}

/** Where Blends From may sit on a board of this length: 12" to 30", and never closer than 2" to the centre. */
function blendsFromWindow(length: Mm): HardEdgeWindow {
  const min = inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min);
  const top = Math.min(
    inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.max),
    length / 2 - inchesToMm(HARD_EDGE_MIN_BLEND_IN),
  );
  return { min, max: mm(Math.max(min, top)) };
}

/** Where Ends At may sit once Blends From is known: at least 2" past it, and no further than the centre. */
function endsAtWindow(blendsFrom: Mm, length: Mm): HardEdgeWindow {
  const min = mm(blendsFrom + inchesToMm(HARD_EDGE_MIN_BLEND_IN));
  return { min, max: mm(Math.max(min, length / 2)) };
}

/**
 * Hard Edge Blends From, read forgivingly (Phase 16, D-30; threat T-16-01): the stored
 * `tailHardEdgeBlendsFrom` when it is a finite number inside 12" to min(30", centre − 2"), and otherwise 18"
 * clamped into that same window (so a short board's default still leaves room to blend before the centre).
 * `length` is the board's length; its centre is half of it, the litres' own centre station. Since D-32 it
 * is Tail Rail Blends From, where the tail's whole rail character starts blending into the centre's.
 */
export function hardEdgeBlendsFrom(rails: Pick<RailBandSpec, "tailHardEdgeBlendsFrom">, length: Mm): Mm {
  const window = blendsFromWindow(length);
  const stored = rails.tailHardEdgeBlendsFrom;
  if (storedInside(stored, window)) return mm(stored);
  return clampInto(inchesToMm(DEFAULT_HARD_EDGE_BLENDS_FROM_IN), window);
}

/**
 * Hard Edge Ends At — where the rail has fully blended into the centre's tucked rail — read forgivingly
 * (Phase 16, D-20/D-30; threat T-16-01): Blends From is resolved first, then the stored `tailHardEdgeEndsAt`
 * is kept when it is a finite number from Blends From + 2" to the board's centre, and otherwise the board's
 * own default end (`defaultHardEdgeEndsAt`, L/3 − 18 inches short of the centre) is clamped into that window.
 * So the two can never cross, and a crafted or stale pair always reads as a valid pair. Since D-32 it is Tail
 * Rail Ends At, where the tail's whole rail character has blended into the centre's.
 */
export function hardEdgeEndsAt(
  rails: Pick<RailBandSpec, "tailHardEdgeBlendsFrom" | "tailHardEdgeEndsAt">,
  length: Mm,
): Mm {
  const window = endsAtWindow(hardEdgeBlendsFrom(rails, length), length);
  const stored = rails.tailHardEdgeEndsAt;
  if (storedInside(stored, window)) return mm(stored);
  return clampInto(defaultHardEdgeEndsAt(length), window);
}

/**
 * Where the Hard Edge Blends From slider may go while Ends At sits at `endsAt` (D-30): 12" up to
 * min(30", Ends At − 2", centre − 2"), so the start can never be dragged within 2" of the end. Pass the
 * readers' values, which always sit inside their windows.
 */
export function hardEdgeBlendsFromWindow(endsAt: Mm, length: Mm): HardEdgeWindow {
  const own = blendsFromWindow(length);
  const top = Math.min(own.max, endsAt - inchesToMm(HARD_EDGE_MIN_BLEND_IN));
  return { min: own.min, max: mm(Math.max(own.min, top)) };
}

/**
 * Where the Hard Edge Ends At slider may go while Blends From sits at `blendsFrom` (D-30): from
 * Blends From + 2" to the board's centre ("all the way to the centre of the board", the founder).
 */
export function hardEdgeEndsAtWindow(blendsFrom: Mm, length: Mm): HardEdgeWindow {
  return endsAtWindow(blendsFrom, length);
}

const DEFAULT_SECTION_COMMON = {
  deckPercent: 100,
  family: 3 as RailFamily,
  ratioTopPercent: 60,
  symmetrical: false,
  cornerCutOffsetOverride: null,
  removeCornerCut: false,
  singleTuck: false,
  sharpBottomTuck: false,
  bottomTuck3Override: null,
  nudges: ZERO_RAIL_NUDGES,
};

/** A new board's rails: today's values ("a new board starts with today's values", the founder), the tips
 * at `DEFAULT_TIP_RAIL_SCALE` from the centre (1 since fast task 189), every nudge 0. */
export const DEFAULT_RAIL_BAND_SPEC: RailBandSpec = {
  nose: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(1.31), scaleFromCenter: DEFAULT_TIP_RAIL_SCALE },
  center: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(2.5), scaleFromCenter: 1 },
  tail: { ...DEFAULT_SECTION_COMMON, boardThickness: inchesToMm(1.56), scaleFromCenter: DEFAULT_TIP_RAIL_SCALE },
  tailHardEdge: true,
};

/** Every mark one rail section works out. `thickness` is t (the rail-side thickness), `boardThickness`
 * T; `scale` the scale the rules used (held, the centre's 1); `apexTrimmed` true when the apex had to
 * shrink to fit on the rail (R4). */
export interface RailSectionResult {
  thickness: Mm;
  boardThickness: Mm;
  scale: number;
  apexLenRange: Mm;
  apexTrimmed: boolean;
  apexCenter: Mm;
  railMark1: Mm;
  railTuck1: Mm;
  domedDeckBand: Mm;
  deckMark1: Mm;
  deckMark2: Mm;
  deckMark3: Mm;
  hardEdge: boolean;
  bottomTuck1: Mm;
  bottomTuck2: Mm;
  bottomTuck3: Mm;
  singleTuck: boolean;
  /** Carried for the finished rail (plan 05, R22): keep the Bottom Tuck 3 corner sharp. No mark reads it. */
  sharpBottomTuck: boolean;
}

export type RailSegmentKey =
  | "domedBand"
  | "band1"
  | "band2"
  | "hardEdge"
  | "tuck1"
  | "tuck2"
  | "boardConn"
  | "bottomConn"
  | "railConn";

/** One drawn segment of the cross-section, colour/dash-free (the plot owns the colours). */
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

/** The Deck Profile the rules read: a stored value held to 75-100% (R7). The stored value is never
 * rewritten — only the slider writes it. */
export function effectiveDeckPercent(deckPercent: number): number {
  return Math.min(100, Math.max(DECK_PERCENT_MIN, deckPercent));
}

// ---------------------------------------------------------------------------------------------
// Private inch-domain core. Never exported.
// ---------------------------------------------------------------------------------------------

interface RailSectionResultInches {
  thickness: number;
  boardThickness: number;
  scale: number;
  apexLenRange: number;
  apexTrimmed: boolean;
  apexCenter: number;
  railMark1: number;
  railTuck1: number;
  domedDeckBand: number;
  deckMark1: number;
  deckMark2: number;
  deckMark3: number;
  hardEdge: boolean;
  bottomTuck1: number;
  bottomTuck2: number;
  bottomTuck3: number;
  singleTuck: boolean;
  sharpBottomTuck: boolean;
}

interface ComputeSectionInchesInput {
  thicknessIn: number;
  boardThicknessIn: number;
  ratioTopPct: number;
  family: RailFamily;
  scale: number;
  nudgesIn: Record<RailNudgeKey, number>;
  symmetrical: boolean;
  singleTuck: boolean;
  sharpBottomTuck: boolean;
  hardEdge: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** How far past the room the wanted apex must be before it counts as trimmed (rule 3): a billionth of an
 * inch, so floating-point noise at the exact edge never reads as a trim. */
const APEX_TRIM_TOLERANCE_IN = 1e-9;

// The sheets' column C, cell for cell (the reference page's `sheetV2`), with the app's held inputs,
// nudges, trim and floors (the plan's rules 1-8).
function computeSectionInches(input: ComputeSectionInchesInput): RailSectionResultInches {
  const MIN = MIN_RAIL_MARK_IN;
  const t = input.thicknessIn;
  const T = input.boardThicknessIn;
  // Rule 1: held inputs (PC6). The centre's scale of 1 is applied by the caller (R10).
  const s = clamp(input.scale, RAIL_SCALE_RANGE.min, RAIL_SCALE_RANGE.max);
  const ratioTop = clamp(input.ratioTopPct, RAIL_RATIO_RANGE.min, RAIL_RATIO_RANGE.max);
  const n = Object.fromEntries(
    RAIL_NUDGE_KEYS.map((k) => [k, clamp(input.nudgesIn[k], -RAIL_NUDGE_LIMIT_IN[k], RAIL_NUDGE_LIMIT_IN[k])]),
  ) as Record<RailNudgeKey, number>;

  const bottomRatio = 1 - ratioTop / 100; // C5: =100%-C4
  const apexFormula = (-0.125 * input.family + 1.375) * t * 0.35 * s; // C11 (Nose & Tail: xC3)
  const apexCenter = t * bottomRatio; // C12: =C9*C5
  // Rule 3 (R4, PC3): the nudged apex, floored at 1/16", then trimmed to fit on the rail — the trim wins.
  const wanted = Math.max(apexFormula + n.apexThickness, MIN);
  const room = Math.max(0, Math.min(2 * (apexCenter - MIN), 2 * (t - MIN - apexCenter)));
  const apexLenRange = Math.min(wanted, room);
  const apexTrimmed = wanted > room + APEX_TRIM_TOLERANCE_IN;
  const railMark1 = apexCenter + apexLenRange / 2; // C13: =C12+C11/2
  const railTuck1 = apexCenter - apexLenRange / 2; // C14: =C12-C11/2
  // Rule 6 (PC4, PC26): each deck mark reads its parent's final value, then adds its own nudge. Deck Mark 2
  // has no nudge of its own (R17, "Always in the middle is great"): always half the (nudged) Deck Mark 1.
  const deckMark1 = Math.max(T * s + n.deckMark1, MIN); // C16: =(1*C7)*C3
  const deckMark2 = Math.max(MIN, Math.min(deckMark1 / 2, deckMark1 - MIN)); // C17: =C16/2
  const deckMark3 = Math.max(1.8 * T * s + n.deckMark3, deckMark1 + MIN); // C18: =(1.8*C7)*C3
  // C15: =2.4*C7 — the board thickness, never scaled — plus its own nudge (R18, ±2"), worked out after Deck
  // Mark 3 is settled and held at least 1/16" beyond it: the founder's final ruling (2026-11-02), "Let's keep
  // the ±2" slider, but never let it equal Deck Mark 3." The same rule Bottom Tuck 3 keeps against Bottom
  // Tuck 1. Un-nudged it never holds anything (PC27): 2.4T - 1.8T x s is at least 0.6T, far more than 1/16"
  // on any rail the app can carry, so every un-nudged dome is exactly 2.4 x T and only the slider is held.
  const domedDeckBand = Math.max(2.4 * T + n.domedDeckBand, deckMark3 + MIN);
  // Rule 7 (R9, PC5, R14): Fred's 30° tool; Sym follows the (nudged) deck marks. Bottom Tuck 2 has no nudge
  // of its own (R17): always half the (nudged) Bottom Tuck 1.
  const bottomTuck1 = Math.max((input.symmetrical ? deckMark1 : railTuck1 * 0.577) + n.bottomTuck1, MIN); // C19
  const bottomTuck2 = Math.max(MIN, Math.min(bottomTuck1 / 2, bottomTuck1 - MIN)); // C20: =C19/2
  const bottomTuck3 = input.hardEdge // C21: =IF(C2,C18,C14)
    ? 0
    : Math.max(
        (input.symmetrical ? deckMark3 : railTuck1) + n.bottomTuck3,
        bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN,
      );
  return {
    thickness: t,
    boardThickness: T,
    scale: s,
    apexLenRange,
    apexTrimmed,
    apexCenter,
    railMark1,
    railTuck1,
    domedDeckBand,
    deckMark1,
    deckMark2,
    deckMark3,
    hardEdge: input.hardEdge,
    bottomTuck1,
    bottomTuck2,
    bottomTuck3,
    singleTuck: input.singleTuck,
    sharpBottomTuck: input.sharpBottomTuck,
  };
}

/** Rule 9: the deck line — t at the rail, T at the Domed Deck Band, flat beyond it. */
function deckYFor(r: RailSectionResultInches): (x: number) => number {
  const T = r.boardThickness;
  const t = r.thickness;
  return (x: number) => (T === t ? t : t + (T - t) * Math.min(1, Math.max(0, -x / r.domedDeckBand)));
}

/** Rail Band 1's line, from Rail Mark 1 on the rail to the deck at Deck Mark 1. */
function band1YFor(r: RailSectionResultInches, deckY: (x: number) => number): (x: number) => number {
  const endY = deckY(-r.deckMark1);
  return (x: number) => r.railMark1 + (endY - r.railMark1) * (-x / r.deckMark1);
}

/** Rail Tuck 1's line, from Rail Tuck 1 on the rail to the bottom at Bottom Tuck 1. */
function tuck1YFor(r: RailSectionResultInches): (x: number) => number {
  return (x: number) => r.railTuck1 * (1 - -x / r.bottomTuck1);
}

// Rule 11: the cut, faceted cross-section volume integrates — from the deck at the Domed Deck Band
// (PC8: on a flat deck too; there the start does not change the area) over the rail to the bottom.
// x = 0 is the rail; x runs negative toward the stringer; y is height off the bottom.
function buildProfilePointsInches(r: RailSectionResultInches): [number, number][] {
  const deckY = deckYFor(r);
  const band1Y = band1YFor(r, deckY);
  const pts: [number, number][] = [
    [-r.domedDeckBand, r.boardThickness],
    [-r.deckMark3, deckY(-r.deckMark3)],
    [-r.deckMark2, band1Y(-r.deckMark2)],
    [-r.deckMark1, deckY(-r.deckMark1)],
    [0, r.railMark1],
    [0, r.railTuck1],
  ];
  if (r.hardEdge) pts.push([0, 0]);
  else if (r.singleTuck) pts.push([-r.bottomTuck3, 0]);
  else {
    pts.push([-r.bottomTuck2, tuck1YFor(r)(-r.bottomTuck2)]);
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

// Rule 10: the drawn segments, following the sheets' chart series (the reference page's `segments`).
// Band 2 starts ON Band 1's line at Deck Mark 2 and Tuck 2 ON Tuck 1's line at Bottom Tuck 2. Both are
// always halfway (plan 04, R17), so Tuck 2 starts at exactly half of Rail Tuck 1, as the page draws it, and
// Band 2 at Band 1's midpoint. The Domed Deck Band (nudged ±2" and held 1/16" past Deck Mark 3, R18) sets
// the deck line, the dome line's far end, the Board Thickness connector and the drawing's left edge.
function buildSegmentDefsInches(r: RailSectionResultInches): RailSegmentInches[] {
  const deckY = deckYFor(r);
  const band1Y = band1YFor(r, deckY);
  const T = r.boardThickness;
  const segs: RailSegmentInches[] = [];
  segs.push({ key: "domedBand", label: "Domed Deck Band", p1: [0, r.thickness], p2: [-r.domedDeckBand, T] });
  segs.push({ key: "band1", label: "Rail Band 1", p1: [0, r.railMark1], p2: [-r.deckMark1, deckY(-r.deckMark1)] });
  segs.push({
    key: "band2",
    label: "Rail Band 2",
    p1: [-r.deckMark2, band1Y(-r.deckMark2)],
    p2: [-r.deckMark3, deckY(-r.deckMark3)],
  });
  const leftEdge = -(r.domedDeckBand + 2);
  if (r.hardEdge) {
    segs.push({ key: "hardEdge", label: "Hard Edge", p1: [0, r.railTuck1], p2: [0, 0] });
  } else if (r.singleTuck) {
    // Single Tuck: Bottom Tuck 1/2 removed — Rail Tuck 1 connects straight to Bottom Tuck 3.
    segs.push({ key: "tuck1", label: "Rail Tuck 1", p1: [0, r.railTuck1], p2: [-r.bottomTuck3, 0] });
  } else {
    segs.push({ key: "tuck1", label: "Rail Tuck 1", p1: [0, r.railTuck1], p2: [-r.bottomTuck1, 0] });
    segs.push({
      key: "tuck2",
      label: "Rail Tuck 2",
      p1: [-r.bottomTuck2, tuck1YFor(r)(-r.bottomTuck2)],
      p2: [-r.bottomTuck3, 0],
    });
  }
  // Reference connectors, always drawn.
  segs.push({ key: "boardConn", label: "Board Thickness", p1: [leftEdge, T], p2: [-r.domedDeckBand, T] });
  segs.push({ key: "bottomConn", label: "Left Edge → Bottom Tuck 3", p1: [leftEdge, 0], p2: [-r.bottomTuck3, 0] });
  segs.push({ key: "railConn", label: "Rail Mark 1 → Tuck 1", p1: [0, r.railMark1], p2: [0, r.railTuck1] });
  return segs;
}

/** True when a value's magnitude rounds below 1/16 inch — the prototype's `d()` em-dash rule. */
function inchesNearZero(valueIn: number): boolean {
  return Math.round(Math.abs(valueIn) * 16) / 16 < 1 / 16;
}

type RailDataRowInches = { label: string; value: number | null | "hard-edge" };

// Rule 13: the DATA rows, as before with both Corner Cut rows gone. Apex Thickness shows the trimmed
// value (the "trimmed to fit" words live on plan 02's Advanced slider label — PC11).
function buildRailDataGroupsInches(
  r: RailSectionResultInches,
  domed: boolean,
): { heading: RailDataHeading; rows: RailDataRowInches[] }[] {
  const d = (v: number): number | null => (inchesNearZero(v) ? null : v);

  const railRows: RailDataRowInches[] = [];
  if (domed) railRows.push({ label: "Board Thickness", value: d(r.boardThickness) });
  railRows.push(
    { label: domed ? "Tapered Rail Thickness" : "Board Thickness", value: d(r.thickness) },
    { label: "Apex Thickness", value: d(r.apexLenRange) },
    { label: "Apex Center", value: d(r.apexCenter) },
    { label: "Rail Mark 1", value: d(r.railMark1) },
  );
  if (!r.hardEdge) railRows.push({ label: "Rail Tuck 1", value: d(r.railTuck1) });

  const deckRows: RailDataRowInches[] = [];
  if (domed) deckRows.push({ label: "Domed Deck Band", value: d(r.domedDeckBand) });
  deckRows.push(
    { label: "Deck Mark 1", value: d(r.deckMark1) },
    { label: "Deck Mark 2", value: d(r.deckMark2) },
    { label: "Deck Mark 3", value: d(r.deckMark3) },
  );

  const bottomRows: RailDataRowInches[] = r.hardEdge
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
    boardThickness: mmToInches(r.boardThickness),
    scale: r.scale,
    apexLenRange: mmToInches(r.apexLenRange),
    apexTrimmed: r.apexTrimmed,
    apexCenter: mmToInches(r.apexCenter),
    railMark1: mmToInches(r.railMark1),
    railTuck1: mmToInches(r.railTuck1),
    domedDeckBand: mmToInches(r.domedDeckBand),
    deckMark1: mmToInches(r.deckMark1),
    deckMark2: mmToInches(r.deckMark2),
    deckMark3: mmToInches(r.deckMark3),
    hardEdge: r.hardEdge,
    bottomTuck1: mmToInches(r.bottomTuck1),
    bottomTuck2: mmToInches(r.bottomTuck2),
    bottomTuck3: mmToInches(r.bottomTuck3),
    singleTuck: r.singleTuck,
    sharpBottomTuck: r.sharpBottomTuck,
  };
}

export interface ComputeRailSectionInput {
  /** t — the rail-side thickness: the board thickness on a flat deck, the 1/16"-rounded tapered rail
   * thickness on a domed one. */
  thickness: Mm;
  /** T — the board thickness. */
  boardThickness: Mm;
  ratioTopPercent: number;
  family: RailFamily;
  /** "Scaled from center by" — pass 1 for the centre (R10). */
  scale: number;
  nudges: RailMarkNudges;
  singleTuck: boolean;
  /** Sharp Bottom Tuck (plan 05, R22): passed through to the result for the finished rail. */
  sharpBottomTuck: boolean;
  symmetrical: boolean;
  hardEdge: boolean;
}

/** One rail section's marks, worked out from the v2 sheets (rules 1-8). */
export function computeRailSection(input: ComputeRailSectionInput): RailSectionResult {
  const rIn = computeSectionInches({
    thicknessIn: mmToInches(input.thickness),
    boardThicknessIn: mmToInches(input.boardThickness),
    ratioTopPct: input.ratioTopPercent,
    family: input.family,
    scale: input.scale,
    nudgesIn: Object.fromEntries(
      Object.entries(railNudgesOf(input.nudges)).map(([k, v]) => [k, mmToInches(v)]),
    ) as Record<
      RailNudgeKey,
      number
    >,
    symmetrical: input.symmetrical,
    singleTuck: input.singleTuck,
    sharpBottomTuck: input.sharpBottomTuck,
    hardEdge: input.hardEdge,
  });
  return {
    thickness: inchesToMm(rIn.thickness),
    boardThickness: inchesToMm(rIn.boardThickness),
    scale: rIn.scale,
    apexLenRange: inchesToMm(rIn.apexLenRange),
    apexTrimmed: rIn.apexTrimmed,
    apexCenter: inchesToMm(rIn.apexCenter),
    railMark1: inchesToMm(rIn.railMark1),
    railTuck1: inchesToMm(rIn.railTuck1),
    domedDeckBand: inchesToMm(rIn.domedDeckBand),
    deckMark1: inchesToMm(rIn.deckMark1),
    deckMark2: inchesToMm(rIn.deckMark2),
    deckMark3: inchesToMm(rIn.deckMark3),
    hardEdge: rIn.hardEdge,
    bottomTuck1: inchesToMm(rIn.bottomTuck1),
    bottomTuck2: inchesToMm(rIn.bottomTuck2),
    bottomTuck3: inchesToMm(rIn.bottomTuck3),
    singleTuck: rIn.singleTuck,
    sharpBottomTuck: rIn.sharpBottomTuck,
  };
}

/** The cut, faceted cross-section as one continuous point path — what VOLUME integrates (rule 11, R5). */
export function buildRailProfile(result: RailSectionResult): Point2D[] {
  return buildProfilePointsInches(resultToInches(result)).map(([x, y]) => ({
    x: mm(inchesToMm(x)),
    y: mm(inchesToMm(y)),
  }));
}

/** The cross-section drawn as separate labeled segments (rule 10). */
export function buildRailSegments(result: RailSectionResult): RailSegment[] {
  return buildSegmentDefsInches(resultToInches(result)).map((s) => ({
    key: s.key,
    label: s.label,
    p1: { x: mm(inchesToMm(s.p1[0])), y: mm(inchesToMm(s.p1[1])) },
    p2: { x: mm(inchesToMm(s.p2[0])), y: mm(inchesToMm(s.p2[1])) },
  }));
}

/** One dot the RAILS plot draws on a cross-section: which band (or the apex centre) it marks, and
 * where, in the section's own millimetres (x 0 at the rail, negative toward the stringer; y up from
 * the bottom). */
export interface RailPlotDot {
  key: RailSegmentKey | "apexCenter";
  x: Mm;
  y: Mm;
}

/** The three connector lines that close the drawing — never a mark, so never a dot. */
const NO_DOT_KEYS: ReadonlySet<RailSegmentKey> = new Set<RailSegmentKey>(["boardConn", "bottomConn", "railConn"]);

/**
 * Which rail marks get a dot on a cross-section, in the order the RAILS plot draws them: both ends of
 * every band except the three connector lines (and the hard edge when the section has one, which is
 * an edge rather than a band), then the apex centre on the rail line, then — on a domed deck — the
 * top of the dome on the rail line. The one rule for those dots, read by the RAILS plot itself and
 * by the RAILS picture in the phone menu (quick 261003-q2f), so the two can never disagree.
 */
export function railPlotDots(
  segments: readonly RailSegment[],
  result: RailSectionResult,
  domed: boolean,
): RailPlotDot[] {
  const dots: RailPlotDot[] = [];
  for (const seg of segments) {
    if (NO_DOT_KEYS.has(seg.key)) continue;
    if (result.hardEdge && seg.key === "hardEdge") continue;
    dots.push({ key: seg.key, x: seg.p1.x, y: seg.p1.y });
    dots.push({ key: seg.key, x: seg.p2.x, y: seg.p2.y });
  }
  dots.push({ key: "apexCenter", x: mm(0), y: result.apexCenter });
  if (domed) {
    const domedBand = segments.find((seg) => seg.key === "domedBand");
    if (domedBand) dots.push({ key: "domedBand", x: mm(0), y: domedBand.p1.y });
  }
  return dots;
}

export interface RailPlotBoundsOpts {
  xAxisMinShared?: Mm;
}

/** Axis range for one section's plot (rule 12): 2" beyond the Domed Deck Band (or the shared minimum),
 * and 1/4" above the board thickness. */
export function railPlotBounds(result: RailSectionResult, opts: RailPlotBoundsOpts = {}): { xAxisMin: Mm; yAxisMax: Mm } {
  const xAxisMinIn = Math.min(
    -(mmToInches(result.domedDeckBand) + 2),
    opts.xAxisMinShared !== undefined ? mmToInches(opts.xAxisMinShared) : 0,
  );
  const yAxisMaxIn = mmToInches(result.boardThickness) + 0.25;
  return { xAxisMin: mm(inchesToMm(xAxisMinIn)), yAxisMax: mm(inchesToMm(yAxisMaxIn)) };
}

export interface BuildRailDataGroupsOpts {
  domed: boolean;
}

/** The DATA tab's rows for one section (rule 13), with values as data rather than strings. */
export function buildRailDataGroups(result: RailSectionResult, opts: BuildRailDataGroupsOpts): RailDataGroup[] {
  return buildRailDataGroupsInches(resultToInches(result), opts.domed).map((g) => ({
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
  /** The bottom under this rail (Phase 17, D-41) — set only by `design.ts`'s `railBandsOnTheBottom`, wherever the
   * vees, bellies and concaves leave a bottom that is not flat within the section's reach, or channels are cut into
   * it. Under a vee or a belly `lift` is the rail lift; under a concave `lift` is 0 and `across` stands above 0 toward
   * the stringer (the founder, 2026-11-11: "Always draw it"); on a flat bottom with channels `lift` is 0, `across` flat
   * and only the channels are drawn into it ("Show channels too"). Absent (a section whose bottom is flat there with no
   * channels, every section `computeRailSectionOutput` builds): the rail stands on a flat bottom, exactly as it always
   * has. */
  bottom?: RailSectionBottom;
}

/**
 * The bottom the vees, bellies and concaves leave under one rail (Phase 17, D-41 — the founder: "represent the angle
 * in the bottom of the displayed rail … the real rail shape, post bottom contouring"), in the section's own frame: x in
 * from the rail's apex (0) toward the stringer (negative), y up from the rail's own bottom at its edge. Under a vee or
 * a belly the section's bands are worked out for the rail the lift leaves (`railsOnTheBottom`), and this says how the
 * planed bottom falls away under it toward the stringer. Under a concave nothing is lifted at the rail, so `lift` is
 * 0, the bands are the flat board's own, and `across` hollows up above 0 toward the stringer (the founder, 2026-11-11:
 * "Always draw it"). On a flat bottom into which a channel is cut, `lift` is 0 and `across` is flat — the planed bottom
 * RAILS has always drawn. Either way `channelCut` carries the channels, cut last (the founder, 2026-11-11: "Show
 * channels too"). Read by `lib/geometry/rail-bottom.ts`.
 */
export interface RailSectionBottom {
  /** The rail lift at this section's station: the foam the bottom takes off at the rail. */
  lift: Mm;
  /** The bottom across, x ascending from well inboard of the plot to the apex (x = 0, y = 0): at each x, the foam
   * off there less the lift — below 0 under a vee or a belly, which takes less off toward the stringer; above 0 under a
   * concave, which takes more. */
  across: Point2D[];
  /** The channels, cut last — after the vee or belly and after the rail is shaped (G-17-6, the founder's ruling of
   * 2026-11-10) — in the section's own frame: at each x, how far they take the bottom up above `across`. x ascending
   * over the same reach, out to the apex; 0 between channels; every standing wall two points at its own x, the
   * channel's floor at its deepest first (inboard), then the next channel's peak. Absent when no channel is cut within
   * the section's reach. */
  channelCut?: Point2D[];
}

export interface RailBandsOutput {
  nose: RailSectionOutput;
  center: RailSectionOutput;
  tail: RailSectionOutput;
}

/**
 * One rail section's full output — the one per-rail builder `computeRailBands` and the INSTRUCTIONS
 * example both use. Deck Profile is held at 75% or more (R7) before the tapered rail thickness is
 * rounded to the 1/16" (as the reference page's `thicknesses()` does with its `r16`); the centre's scale
 * is always 1 (R10); a section saved before the scale and nudges existed reads their defaults.
 */
export function computeRailSectionOutput(
  key: RailSectionKey,
  sectionSpec: RailSectionSpec,
  hardEdge: boolean,
): RailSectionOutput {
  const deckPercent = effectiveDeckPercent(sectionSpec.deckPercent);
  const domed = deckPercent < 100;
  const railThicknessClamped = roundToSixteenthInch(mm((sectionSpec.boardThickness * deckPercent) / 100));
  const thicknessEff = domed ? railThicknessClamped : sectionSpec.boardThickness;
  const result = computeRailSection({
    thickness: thicknessEff,
    boardThickness: sectionSpec.boardThickness,
    ratioTopPercent: sectionSpec.ratioTopPercent,
    family: sectionSpec.family,
    scale: key === "center" ? 1 : (sectionSpec.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE),
    nudges: railNudgesOf(sectionSpec.nudges),
    singleTuck: sectionSpec.singleTuck,
    // A section held in memory from before plan 05 (Fast Refresh) has no box: it reads off (T-gec-20).
    sharpBottomTuck: sectionSpec.sharpBottomTuck === true,
    symmetrical: sectionSpec.symmetrical,
    hardEdge,
  });
  return {
    domed,
    boardThickness: sectionSpec.boardThickness,
    railThicknessClamped,
    thicknessEff,
    result,
    profile: buildRailProfile(result),
    segments: buildRailSegments(result),
    bounds: railPlotBounds(result),
    dataGroups: buildRailDataGroups(result, { domed }),
  };
}

/** Every rail section's output: the nose and centre never have a hard edge; the tail's follows the flag. */
export function computeRailBands(spec: RailBandSpec): RailBandsOutput {
  return {
    nose: computeRailSectionOutput("nose", spec.nose, false),
    center: computeRailSectionOutput("center", spec.center, false),
    tail: computeRailSectionOutput("tail", spec.tail, spec.tailHardEdge),
  };
}

export const RAIL_DATA_HEADINGS = ["Rail Side", "Deck Side", "Bottom"] as const;

/** Fixed canonical row order per heading — rows never shuffle based on which sections are open or
 * which flags are set. The v2 sheets have no Corner Cut, so neither does the table. */
export const RAIL_DATA_LABEL_ORDER: Record<RailDataHeading, string[]> = {
  "Rail Side": ["Board Thickness", "Tapered Rail Thickness", "Apex Thickness", "Apex Center", "Rail Mark 1", "Rail Tuck 1"],
  "Deck Side": ["Domed Deck Band", "Deck Mark 1", "Deck Mark 2", "Deck Mark 3"],
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
