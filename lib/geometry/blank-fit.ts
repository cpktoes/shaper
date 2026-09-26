/**
 * A board laid on a real foam blank (Phase 11): the blank's own rocker, thickness and width
 * fitted with pchip, the rocker levelled so its low point reads zero, and the board's rocker read
 * off the blank at any placement.
 *
 * How a board sits on a blank (D-08): board station `s` (0 = the board's tail tip) lies at blank
 * station u(s) = Lb/2 + p + s − L/2, where L is the board's length, Lb the blank's, and p the
 * placement — the board's centre relative to the blank's centre, positive toward the nose. At
 * L = Lb and p = 0 that is u = s exactly, so the board IS the blank.
 *
 * No React/browser/database import — pure geometry, unit-tested in blank-fit.test.ts, per
 * CLAUDE.md Rule 1. Every length is millimetres.
 */
import type { BlankRecord, BlankStation } from "./blank";
import { pchipMinimum, preparePchip, type PreparedPchip } from "./pchip";
import { mm, type Mm } from "./units";

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

/** The board's own settings that shape its profile on a blank. All millimetres. */
export interface BoardOnBlankInput {
  length: Mm;
  centerThickness: Mm;
  noseTip: Mm;
  tailTip: Mm;
  nose12Offset: Mm;
  tail12Offset: Mm;
}

/** A board laid on a prepared blank at one placement. Every function only samples. */
export interface BoardOnBlank {
  prepared: PreparedBlank;
  board: BoardOnBlankInput;
  placement: Mm;
  /** The crop's own low point, as a height above the blank's levelled low point. */
  cropMinimum: number;
  /** The board's bottom rocker at board station `s`, re-levelled so the board's low point is 0. */
  rockerAt(s: number): number;
  /** The blank's import-levelled rocker under board station `s`. */
  blankRockerAt(s: number): number;
  /** The blank's thickness under board station `s`. */
  blankThicknessAt(s: number): number;
  /** The board's thickness at board station `s`. */
  thicknessAt(s: number): number;
}

/** Lays a board on a prepared blank at `placement` and reads its profile off the blank. */
export function boardOnBlank(
  prepared: PreparedBlank,
  board: BoardOnBlankInput,
  placement: Mm,
): BoardOnBlank {
  const L = board.length;
  const Lb = prepared.lengthMm;
  const u = (s: number) => blankStationOf(mm(s), placement, L, Lb);
  // The crop re-level (R11): the same levelling function, over the stretch under the board.
  const crop = levelCurve(prepared.rocker.curve, u(0), u(L));
  const blankThicknessAt = (s: number) => prepared.thickness.sample(u(s));
  return {
    prepared,
    board,
    placement,
    cropMinimum: crop.minimum - prepared.rocker.minimum,
    rockerAt: (s) => crop.sample(u(s)),
    blankRockerAt: (s) => prepared.rocker.sample(u(s)),
    blankThicknessAt,
    thicknessAt: blankThicknessAt,
  };
}
