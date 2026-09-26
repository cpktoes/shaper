/**
 * A board laid on a real foam blank (Phase 11): the blank's own rocker, thickness and width
 * fitted with pchip, the rocker levelled so its low point reads zero, the board's rocker and foil
 * read off the blank at any placement, and the check that the board fits inside the foam.
 *
 * How a board sits on a blank (D-08): board station `s` (0 = the board's tail tip) lies at blank
 * station u(s) = Lb/2 + p + s − L/2, where L is the board's length, Lb the blank's, and p the
 * placement — the board's centre relative to the blank's centre, positive toward the nose. At
 * L = Lb and p = 0 that is u = s exactly, so the board IS the blank.
 *
 * Judging the catalogue (11-03): the two floors that hide a blank (D-04), the best-placement
 * search that decides whether a blank fits anywhere along its length (D-07), the list's two groups
 * (D-06), the "closest blank that fits" offer and the "Move to Where It Fits" rescue (D-08).
 *
 * No React/browser/database import — pure geometry, unit-tested in blank-fit.test.ts, per
 * CLAUDE.md Rule 1. Every length is millimetres.
 */
import { isPickable } from "../blanks/catalog";
import type { BlankRecord, BlankShortfall, BlankStation, FitResult, FitSettings } from "./blank";
import { MEASURE_STATION_MM } from "./outline";
import { pchipMinimum, preparePchip, type PreparedPchip } from "./pchip";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm, type Mm } from "./units";

/** How far the board's tips stay inside the blank's tips at either end of the slider (D-08). */
export const BLANK_PLACEMENT_BUFFER_MM = inchesToMm(0.5);

/**
 * The fit check's sampling step. 11-RESEARCH.md measured verdicts identical at 1", 1/4" and
 * 1/16" steps for the default board, and no verdict flip between 1/4" and 1/64" steps in the last
 * 3" of the nose for any preset or the default board (a rounded-nose board's own width goes to 0
 * continuously at its tip), so a quarter inch is fine enough.
 */
export const FIT_SAMPLE_STEP_MM = inchesToMm(0.25);

/** Each tip eases into its tip setting over this stretch — tip to 12" station (D-17). */
export const TIP_EASE_WINDOW_MM = MEASURE_STATION_MM;

/** A board fits when its worst shortfall is no more than this — float noise, not foam. */
export const FIT_EPSILON_MM = 1e-6;

/**
 * A pchip curve with its minimum over some stretch subtracted, so that stretch's lowest point
 * reads exactly 0 (R11).
 */
export interface LevelledCurve {
  /** The curve before levelling. */
  curve: PreparedPchip;
  /** The value subtracted — the curve's exact minimum over the levelled stretch. */
  minimum: number;
  /** The levelled value at `x`: `curve.sample(x) − minimum`. */
  sample(x: number): number;
}

/**
 * The ONE levelling function (R11), used on import (the whole blank) and again on the crop under
 * the board: subtracts the curve's exact minimum over `[from, to]` — the lowest of the two ends
 * and every knot strictly inside, exact because pchip is monotone between knots (`pchipMinimum`),
 * not merely the lowest printed station value.
 */
export function levelCurve(curve: PreparedPchip, from: number, to: number): LevelledCurve {
  const minimum = pchipMinimum(curve, from, to);
  return { curve, minimum, sample: (x: number) => curve.sample(x) - minimum };
}

/** A blank fitted once: every curve prepared, the rocker levelled over the whole blank. */
export interface PreparedBlank {
  /** A private copy of the record the curves were fitted to. */
  record: BlankRecord;
  lengthMm: Mm;
  /** The blank's own thickness at its `C` station, as printed. */
  centerThicknessMm: Mm;
  /** Bottom rocker, levelled over [0, Lb] so its lowest point reads exactly 0. */
  rocker: LevelledCurve;
  thickness: PreparedPchip;
  /** Full width (not half-width). */
  width: PreparedPchip;
}

/** The curve through one attribute's OWN non-empty stations — an empty cell is not a knot (R10). */
function attributeCurve(
  stations: readonly BlankStation[],
  pick: (station: BlankStation) => Mm | null,
): PreparedPchip {
  const points: { x: number; y: number }[] = [];
  for (const station of stations) {
    const value = pick(station);
    if (value !== null) points.push({ x: station.fromTailMm, y: value });
  }
  return preparePchip(points);
}

/**
 * Fits a blank once (R14): one pchip per attribute over that attribute's own stations, the rocker
 * levelled over the whole blank. The record is copied first, so changing it afterwards changes
 * nothing the prepared blank returns.
 *
 * Throws if the blank has no thickness at its `C` station — such a blank is not pickable
 * (`isPickable`), because the board's foil is scaled from that centre.
 */
export function prepareBlank(record: BlankRecord): PreparedBlank {
  const copy: BlankRecord = {
    ...record,
    stations: record.stations.map((station) => ({ ...station })),
  };
  const centre = copy.stations.find((station) => station.label === "C");
  if (!centre || centre.thicknessMm === null) {
    throw new Error(`${copy.vendor} ${copy.name} has no thickness at its centre station`);
  }
  const rockerCurve = attributeCurve(copy.stations, (station) => station.rockerMm);
  return {
    record: copy,
    lengthMm: copy.lengthMm,
    centerThicknessMm: centre.thicknessMm,
    rocker: levelCurve(rockerCurve, 0, copy.lengthMm),
    thickness: attributeCurve(copy.stations, (station) => station.thicknessMm),
    width: attributeCurve(copy.stations, (station) => station.widthMm),
  };
}

/**
 * Where board station `s` lies on the blank: u(s) = Lb/2 + p + s − L/2 (D-08). Written as
 * s + (Lb − L)/2 + p so a board exactly as long as its blank at placement 0 maps with no rounding
 * at all.
 */
export function blankStationOf(boardStation: Mm, placement: Mm, boardLength: Mm, blankLength: Mm): Mm {
  return mm(boardStation + (blankLength - boardLength) / 2 + placement);
}

/**
 * How far the board may slide either way from centre on a blank (D-08, R3): each end sits at
 * (blank length − board length) / 2 − 1/2", positive toward the nose; zero when the board is too
 * long to slide at all.
 */
export function placementRange(blankLength: Mm, boardLength: Mm): { min: Mm; max: Mm } {
  const reach = Math.max(0, (blankLength - boardLength) / 2 - BLANK_PLACEMENT_BUFFER_MM);
  return { min: mm(reach === 0 ? 0 : -reach), max: mm(reach) };
}

/**
 * A placement pulled inside `placementRange` — to the nearer end when outside it, to centre when
 * it is not a number at all. Used on READ: a stored placement is never rewritten by this.
 */
export function clampPlacement(placement: Mm, blankLength: Mm, boardLength: Mm): Mm {
  if (!Number.isFinite(placement)) return mm(0);
  const { min, max } = placementRange(blankLength, boardLength);
  return mm(Math.min(max, Math.max(min, placement)));
}

/** The board's own settings that shape its profile on a blank. All millimetres. */
export interface BoardOnBlankInput {
  length: Mm;
  /** The target centre thickness (the design's one `foil.center`). */
  centerThickness: Mm;
  noseTip: Mm;
  tailTip: Mm;
  /** Signed fine-tune at the nose 12" station (D-11). */
  nose12Offset: Mm;
  /** Signed fine-tune at the tail 12" station (D-11). */
  tail12Offset: Mm;
}

/**
 * A board laid on a prepared blank at one placement. Every curve is built once when this is made;
 * every function here only samples (R14). Stations `s` are measured from the board's tail tip.
 */
export interface BoardOnBlank {
  prepared: PreparedBlank;
  board: BoardOnBlankInput;
  /** The placement actually used — the requested one clamped into range (Pitfall 8). */
  placement: Mm;
  /** Target centre ÷ the blank's thickness under the board's centre (D-18). */
  ratio: number;
  /** The crop's own low point, as a height above the blank's levelled low point. */
  cropMinimum: number;
  /** The board's bottom rocker, re-levelled so the board's own low point is 0. */
  rockerAt(s: number): number;
  /** The blank's import-levelled rocker under board station `s`. */
  blankRockerAt(s: number): number;
  /** The blank's thickness under board station `s`; 0 where the board runs past the blank. */
  blankThicknessAt(s: number): number;
  /** The blank's full width under board station `s`; 0 where the board runs past the blank. */
  blankWidthAt(s: number): number;
  /** The blank's foil scaled by `ratio`, eased into the tip settings (D-10, D-17) — no fine-tune. */
  derivedThicknessAt(s: number): number;
  /** The board's final thickness: derived plus the 12" fine-tunes (D-11). */
  thicknessAt(s: number): number;
}

/** 0 at w = 0, 1 at w = 1, flat at both ends — so the ease joins the scaled foil smoothly. */
function smoothstep(w: number): number {
  const t = Math.min(1, Math.max(0, w));
  return t * t * (3 - 2 * t);
}

/**
 * Lays a board on a prepared blank and derives its rocker and foil.
 *
 * - Rocker: the blank's levelled rocker under the board, levelled again over the crop (R11).
 * - Foil (D-10, D-18): the blank's own thickness times `ratio` = target centre ÷ the blank's
 *   thickness under the board's centre, so the centre equals the target at every placement.
 *   Never a subtracted constant.
 * - Tips (D-17): between each 12" station and its tip the scaled foil eases into the tip setting
 *   with a smoothstep weight w that is 0 at the 12" station and 1 at the tip:
 *   t = scaled − scaledAtTip·w + tipSetting·w, so the tip EQUALS its setting, the 12" station
 *   stays purely blank-scaled, and the curve is continuous. Inside each tip window only, a
 *   never-below guard holds the thickness at or above the tip setting; outside the windows there
 *   is no guard, so the centre stays exactly the target.
 * - Fine-tunes (D-11): a signed offset added through a three-knot pchip hump per half — 0 at the
 *   tip, the offset at the 12" station, 0 at the centre — so tips and centre stay exact and the
 *   12" reading is derived + offset. The same tip-window guard applies after it.
 *
 * The placement is clamped on read (never written back). Where the board runs past either end of
 * the blank, the blank's thickness and width read 0, so the fit fails instead of lying (Pitfall 8).
 */
export function boardOnBlank(
  prepared: PreparedBlank,
  board: BoardOnBlankInput,
  placement: Mm,
): BoardOnBlank {
  const L = board.length;
  const Lb = prepared.lengthMm;
  const p = clampPlacement(placement, Lb, L);
  const u = (s: number) => blankStationOf(mm(s), p, L, Lb);
  const onFoam = (x: number) => x >= -FIT_EPSILON_MM && x <= Lb + FIT_EPSILON_MM;

  // The crop re-level (R11): the same levelling function, over the stretch under the board.
  const crop = levelCurve(prepared.rocker.curve, u(0), u(L));

  const blankThicknessAt = (s: number) => {
    const x = u(s);
    return onFoam(x) ? prepared.thickness.sample(x) : 0;
  };
  const blankWidthAt = (s: number) => {
    const x = u(s);
    return onFoam(x) ? prepared.width.sample(x) : 0;
  };

  const underCentre = blankThicknessAt(L / 2);
  const ratio = underCentre > 0 ? board.centerThickness / underCentre : 0;
  const scaledTail = ratio * blankThicknessAt(0);
  const scaledNose = ratio * blankThicknessAt(L);
  const W = TIP_EASE_WINDOW_MM;

  /** The tip-window never-below guard, applied to any thickness at `s`. */
  const guard = (s: number, value: number) => {
    let out = value;
    if (s <= W) out = Math.max(out, board.tailTip);
    if (s >= L - W) out = Math.max(out, board.noseTip);
    return out;
  };

  const derivedThicknessAt = (s: number) => {
    let value = ratio * blankThicknessAt(s);
    // Written as scaled − scaledAtTip·w + tip·w so that at the tip (w = 1, scaled = scaledAtTip)
    // the first two terms cancel exactly and the tip reads its setting to the last bit.
    if (s < W) {
      const w = smoothstep(1 - s / W);
      value = value - scaledTail * w + board.tailTip * w;
    }
    if (s > L - W) {
      const w = smoothstep(1 - (L - s) / W);
      value = value - scaledNose * w + board.noseTip * w;
    }
    return guard(s, value);
  };

  const tailHump = preparePchip([
    { x: 0, y: 0 },
    { x: W, y: board.tail12Offset },
    { x: L / 2, y: 0 },
  ]);
  const noseHump = preparePchip([
    { x: L / 2, y: 0 },
    { x: L - W, y: board.nose12Offset },
    { x: L, y: 0 },
  ]);
  const offsetAt = (s: number) => (s <= L / 2 ? tailHump.sample(s) : noseHump.sample(s));

  return {
    prepared,
    board,
    placement: p,
    ratio,
    cropMinimum: crop.minimum - prepared.rocker.minimum,
    rockerAt: (s) => crop.sample(u(s)),
    blankRockerAt: (s) => prepared.rocker.sample(u(s)),
    blankThicknessAt,
    blankWidthAt,
    derivedThicknessAt,
    thicknessAt: (s) => guard(s, derivedThicknessAt(s) + offsetAt(s)),
  };
}

/**
 * Does the board fit inside its blank? (R12, D-05)
 *
 * Samples every `FIT_SAMPLE_STEP_MM` from tail tip to nose tip, plus the five board stations and
 * the widepoint. At each: the THIN amount is the board's final thickness minus the blank's
 * thickness there; and, only where the board itself has width (`halfWidthAt(s) > 0`), the WIDE
 * amount is the board's full width plus `widthMargin` minus the blank's width. Width is never
 * checked where the board has none — a rounded-nose blank is 0 wide at its very tip by design, and
 * the board's own outline reaches 0 there too.
 *
 * `halfWidthAt` is the board outline's HALF-width (what `sampleOutline` returns). `worst` is the
 * largest amount found, with its station and kind; the board fits when that is no more than
 * `FIT_EPSILON_MM`.
 */
export function fitAt(
  onBlank: BoardOnBlank,
  halfWidthAt: (station: Mm) => number,
  widePointStation: Mm,
  widthMargin: Mm,
): FitResult {
  const L = onBlank.board.length;
  const stations: number[] = [];
  const steps = Math.floor(L / FIT_SAMPLE_STEP_MM + 1e-9);
  for (let i = 0; i <= steps; i++) stations.push(i * FIT_SAMPLE_STEP_MM);
  stations.push(L);
  for (const { station } of rockerStationPositions(L)) stations.push(station);
  stations.push(Math.min(L, Math.max(0, widePointStation)));

  let worst: BlankShortfall = {
    kind: "thin",
    station: mm(0),
    amount: mm(onBlank.thicknessAt(0) - onBlank.blankThicknessAt(0)),
  };
  const consider = (kind: BlankShortfall["kind"], station: number, amount: number) => {
    if (amount > worst.amount) worst = { kind, station: mm(station), amount: mm(amount) };
  };
  for (const s of stations) {
    consider("thin", s, onBlank.thicknessAt(s) - onBlank.blankThicknessAt(s));
    const half = halfWidthAt(mm(s));
    if (half > 0) consider("wide", s, 2 * half + widthMargin - onBlank.blankWidthAt(s));
  }
  return { fits: worst.amount <= FIT_EPSILON_MM, worst };
}

// ---------------------------------------------------------------------------------------------
// Judging the catalogue (D-04, D-06, D-07, D-08)
// ---------------------------------------------------------------------------------------------

/**
 * Everything about the board a verdict depends on — and nothing about the slider. A verdict never
 * takes a placement (R14): it is recomputed only when the board's dims, centre, tips, fine-tunes
 * or the shaper's settings change.
 */
export interface BoardFitContext {
  board: BoardOnBlankInput;
  /** The board outline's HALF-width at a station (what `sampleOutline` returns). */
  halfWidthAt: (station: Mm) => Mm;
  widePointStation: Mm;
}

/**
 * One blank judged for one board (D-07). For a fitting blank, `placement` is the fitting placement
 * closest to centre — where the slider lands when the blank is picked — and `worst` is the
 * tightest place there. For a blank that fits nowhere, `placement` is where its worst shortfall is
 * smallest (its "nearly fits" reading) and `worst` is that shortfall: the station and amount the
 * reason line reports (D-06).
 */
export interface BlankVerdict {
  prepared: PreparedBlank;
  fits: boolean;
  placement: Mm;
  worst: BlankShortfall;
}

/** The list (D-06): both groups by length then name, and why it is empty when it is. */
export interface BlankListResult {
  fits: BlankVerdict[];
  wontFit: BlankVerdict[];
  /**
   * Null when anything is listed. Otherwise `length` when no pickable blank is long enough (the
   * first obstacle, reported even if the centre floor fails too), `thickness` when none is thick
   * enough at its centre, and `both` when each floor alone leaves blanks but no blank passes both.
   */
  emptyReason: null | "length" | "thickness" | "both";
}

/**
 * The floors compare in millimetres with this much slack, so a board typed to exactly a blank's
 * length less Extra Length is not flipped off the list by float noise from the inch conversion
 * (Pitfall 6).
 */
export const FLOOR_EPSILON_MM = 1e-6;

/** The fine step of every placement search: the imperial slider's own 1/16". */
const PLACEMENT_STEP_MM = inchesToMm(1 / 16);
/** The coarse search step (1/4") in fine steps. */
const COARSE_STEPS = 4;

/**
 * The two floors that hide a blank from the list (D-04): the blank must be at least Extra Length
 * longer than the board, and its own centre-station thickness (D-18: the floor keeps the printed
 * `C` value) at least Extra Center Thickness thicker than the target centre. Both amounts come
 * from `settings` — never a literal here. A failed floor reports by how much it is short.
 */
export function floorCheck(
  prepared: PreparedBlank,
  boardLength: Mm,
  centerThickness: Mm,
  settings: FitSettings,
): { passes: boolean; lengthShortBy: Mm | null; centerShortBy: Mm | null } {
  const lengthShort = boardLength + settings.extraLength - prepared.lengthMm;
  const centerShort = centerThickness + settings.extraCenterThickness - prepared.centerThicknessMm;
  const lengthShortBy = lengthShort > FLOOR_EPSILON_MM ? mm(lengthShort) : null;
  const centerShortBy = centerShort > FLOOR_EPSILON_MM ? mm(centerShort) : null;
  return { passes: lengthShortBy === null && centerShortBy === null, lengthShortBy, centerShortBy };
}

/**
 * The board's outline is sampled at the same stations for every placement and every blank, so its
 * half-width is worked out once per station and reused (11-RESEARCH.md: "width does not depend on
 * placement or centre").
 */
function memoiseHalfWidth(halfWidthAt: (station: Mm) => Mm): (station: Mm) => Mm {
  const cache = new Map<number, Mm>();
  return (station: Mm) => {
    let value = cache.get(station);
    if (value === undefined) {
      value = halfWidthAt(station);
      cache.set(station, value);
    }
    return value;
  };
}

/** Placement `index` fine steps from centre, positive toward the nose; never a negative zero. */
function placementAt(index: number): Mm {
  return mm(index === 0 ? 0 : index * PLACEMENT_STEP_MM);
}

/** The first and last fine-step index inside the slider's range (the range is symmetric). */
function placementIndexRange(prepared: PreparedBlank, boardLength: Mm): { lo: number; hi: number } {
  const { min, max } = placementRange(prepared.lengthMm, boardLength);
  const lo = Math.ceil(min / PLACEMENT_STEP_MM - 1e-9);
  const hi = Math.floor(max / PLACEMENT_STEP_MM + 1e-9);
  return { lo: lo === 0 ? 0 : lo, hi: hi === 0 ? 0 : hi };
}

/**
 * Placement `index` fine steps from centre for this blank, clamped into its range exactly as
 * `boardOnBlank` would read it — so the outermost step, which can sit a float's width past the
 * range end, is stored as the placement the fit was actually checked at.
 */
function blankPlacementAt(prepared: PreparedBlank, boardLength: Mm, index: number): Mm {
  return clampPlacement(placementAt(index), prepared.lengthMm, boardLength);
}

/** The fit check for one blank at placement indices, each worked out once. */
function fitterFor(prepared: PreparedBlank, ctx: BoardFitContext, settings: FitSettings) {
  const results = new Map<number, FitResult>();
  return (index: number): FitResult => {
    let result = results.get(index);
    if (result === undefined) {
      result = fitAt(
        boardOnBlank(prepared, ctx.board, blankPlacementAt(prepared, ctx.board.length, index)),
        ctx.halfWidthAt,
        ctx.widePointStation,
        settings.widthMargin,
      );
      results.set(index, result);
    }
    return result;
  };
}

/** The search itself, on a context whose half-width is already memoised. */
function judgeWith(prepared: PreparedBlank, ctx: BoardFitContext, settings: FitSettings): BlankVerdict {
  const { lo, hi } = placementIndexRange(prepared, ctx.board.length);
  const fitAtIndex = fitterFor(prepared, ctx, settings);
  const verdict = (index: number): BlankVerdict => {
    const { fits, worst } = fitAtIndex(index);
    return { prepared, fits, placement: blankPlacementAt(prepared, ctx.board.length, index), worst };
  };

  // Coarse: 0, then 1/4" steps outward, the nose side first at each distance, then the outermost
  // 1/16" placement each side when the range does not end on a quarter inch.
  const coarse: number[] = [0];
  for (let k = COARSE_STEPS; k <= hi; k += COARSE_STEPS) coarse.push(k, -k);
  if (hi % COARSE_STEPS !== 0) coarse.push(hi, lo);

  const firstFit = coarse.find((index) => fitAtIndex(index).fits);
  if (firstFit !== undefined) {
    if (firstFit === 0) return verdict(0);
    // Refine back toward centre in 1/16" steps: every placement nearer centre than the last coarse
    // step that failed, from the nearest outward, nose side first — the first that fits is the
    // fitting placement closest to centre on the coarse search's terms.
    const reach = Math.abs(firstFit);
    const from = Math.ceil(reach / COARSE_STEPS) * COARSE_STEPS - COARSE_STEPS + 1;
    for (let distance = from; distance <= reach; distance++) {
      for (const index of [distance, -distance]) {
        if (index >= lo && index <= hi && fitAtIndex(index).fits) return verdict(index);
      }
    }
    return verdict(firstFit);
  }

  // Nothing fits: the coarse placement with the smallest worst shortfall (the nearer centre on a
  // tie), refined 1/16" either side up to the neighbouring coarse steps.
  let best = coarse[0];
  for (const index of coarse) {
    if (fitAtIndex(index).worst.amount < fitAtIndex(best).worst.amount) best = index;
  }
  const centre = best;
  for (let step = 1; step < COARSE_STEPS; step++) {
    for (const index of [centre + step, centre - step]) {
      if (index < lo || index > hi) continue;
      if (fitAtIndex(index).worst.amount < fitAtIndex(best).worst.amount) best = index;
    }
  }
  return verdict(best);
}

/**
 * Judges one blank for one board at its best placement (D-07): it fits if any placement in the
 * slider's range fits, searched 1/4" at a time outward from centre (both ways, nose first) and
 * refined back toward centre 1/16" at a time. A blank that fits nowhere is read where its worst
 * shortfall is smallest. Every try is `fitAt` on a `boardOnBlank` of the prepared blank — no
 * refit of the raw stations. Bounded by the placement range and fixed steps (T-11-07).
 *
 * Takes no placement: the slider cannot change a verdict (R14).
 */
export function judgeBlank(prepared: PreparedBlank, ctx: BoardFitContext, settings: FitSettings): BlankVerdict {
  return judgeWith(prepared, { ...ctx, halfWidthAt: memoiseHalfWidth(ctx.halfWidthAt) }, settings);
}

/** Shortest first; the same length by name, then vendor, so the order never depends on input. */
function byLengthThenName(a: BlankVerdict, b: BlankVerdict): number {
  const ra = a.prepared.record;
  const rb = b.prepared.record;
  if (a.prepared.lengthMm !== b.prepared.lengthMm) return a.prepared.lengthMm - b.prepared.lengthMm;
  if (ra.name !== rb.name) return ra.name < rb.name ? -1 : 1;
  if (ra.vendor !== rb.vendor) return ra.vendor < rb.vendor ? -1 : 1;
  return 0;
}

/**
 * The blank list for a board (D-04, D-06): pickable blanks only; a blank failing either floor is
 * hidden; the rest are judged (`judgeBlank`) into FITS and WON'T FIT, each ordered by length then
 * name. An empty list says which floor emptied it. Takes no placement (R14).
 */
export function listBlanks(
  prepared: readonly PreparedBlank[],
  ctx: BoardFitContext,
  settings: FitSettings,
): BlankListResult {
  const shared: BoardFitContext = { ...ctx, halfWidthAt: memoiseHalfWidth(ctx.halfWidthAt) };
  const fits: BlankVerdict[] = [];
  const wontFit: BlankVerdict[] = [];
  let anyLongEnough = false;
  let anyThickEnough = false;
  for (const blank of prepared) {
    if (!isPickable(blank.record)) continue;
    const floor = floorCheck(blank, ctx.board.length, ctx.board.centerThickness, settings);
    if (floor.lengthShortBy === null) anyLongEnough = true;
    if (floor.centerShortBy === null) anyThickEnough = true;
    if (!floor.passes) continue;
    const verdict = judgeWith(blank, shared, settings);
    (verdict.fits ? fits : wontFit).push(verdict);
  }
  fits.sort(byLengthThenName);
  wontFit.sort(byLengthThenName);
  let emptyReason: BlankListResult["emptyReason"] = null;
  if (fits.length === 0 && wontFit.length === 0) {
    emptyReason = !anyLongEnough ? "length" : !anyThickEnough ? "thickness" : "both";
  }
  return { fits, wontFit, emptyReason };
}

/**
 * The offer beside a flag (D-08, R6): of the fitting verdicts, the blank of ANY vendor whose length
 * is closest to the current blank's; on a tie, the one with less spare foam at the centre (its
 * centre-station thickness minus the target). Never the current blank itself (matched by vendor and
 * name), never a verdict that does not fit, and null when nothing is left to offer (F5).
 */
export function nearestFit(
  current: Pick<BlankRecord, "vendor" | "name" | "lengthMm">,
  fits: readonly BlankVerdict[],
  targetCenter: Mm,
): BlankVerdict | null {
  let best: BlankVerdict | null = null;
  let bestGap = Infinity;
  let bestSpare = Infinity;
  for (const verdict of fits) {
    const { record } = verdict.prepared;
    if (!verdict.fits) continue;
    if (record.vendor === current.vendor && record.name === current.name) continue;
    const gap = Math.abs(verdict.prepared.lengthMm - current.lengthMm);
    const spare = verdict.prepared.centerThicknessMm - targetCenter;
    const closer = gap < bestGap - FLOOR_EPSILON_MM;
    const tiedButLeaner = Math.abs(gap - bestGap) <= FLOOR_EPSILON_MM && spare < bestSpare - FLOOR_EPSILON_MM;
    if (best === null || closer || tiedButLeaner) {
      best = verdict;
      bestGap = gap;
      bestSpare = spare;
    }
  }
  return best;
}

/**
 * "Move to Where It Fits" (11-UI-SPEC F2): the fitting placement on this blank nearest to `from`.
 * `from` is clamped into the slider's range first and returned as it is when the board already fits
 * there; otherwise every 1/16" placement in the range is tried nearest-first (the nose side first
 * at an equal distance) and the first that fits is returned. Null when the board fits nowhere on
 * this blank. The candidates include every placement `judgeBlank` tries, so a blank judged to fit
 * always has somewhere to move to. Bounded by the placement range (T-11-07).
 */
export function nearestFittingPlacement(
  prepared: PreparedBlank,
  ctx: BoardFitContext,
  settings: FitSettings,
  from: Mm,
): Mm | null {
  const L = ctx.board.length;
  const halfWidthAt = memoiseHalfWidth(ctx.halfWidthAt);
  const fitsAt = (placement: Mm) =>
    fitAt(boardOnBlank(prepared, ctx.board, placement), halfWidthAt, ctx.widePointStation, settings.widthMargin)
      .fits;

  const start = clampPlacement(from, prepared.lengthMm, L);
  if (fitsAt(start)) return start;

  const { lo, hi } = placementIndexRange(prepared, L);
  const candidates: Mm[] = [];
  for (let index = lo; index <= hi; index++) candidates.push(blankPlacementAt(prepared, L, index));
  candidates.sort((a, b) => Math.abs(a - start) - Math.abs(b - start) || b - a);
  return candidates.find(fitsAt) ?? null;
}

/**
 * The longest pickable blank and the thickest pickable centre — the catalogue's best, which the
 * empty-list messages name (E1, E2). Both 0 for a catalogue with no pickable blank.
 */
export function catalogueExtremes(prepared: readonly PreparedBlank[]): { longest: Mm; thickestCenter: Mm } {
  let longest = 0;
  let thickestCenter = 0;
  for (const blank of prepared) {
    if (!isPickable(blank.record)) continue;
    longest = Math.max(longest, blank.lengthMm);
    thickestCenter = Math.max(thickestCenter, blank.centerThicknessMm);
  }
  return { longest: mm(longest), thickestCenter: mm(thickestCenter) };
}
