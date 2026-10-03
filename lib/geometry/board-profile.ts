/**
 * The board's side profile (Phase 11, Pattern 5) — ONE description of the board seen from the
 * side, whether it sits in a real foam blank or is still hand-set, read by every consumer: the
 * ROCKER drawing, the DATASHEET, RAILS (through `effectiveFoil`), the cross-section volume
 * (through `thicknessAt`) and the Summary.
 *
 * - A board with no blank (D-14) draws its rocker through the five hand-set stations with the
 *   square-root rise and its foil through the five stored thicknesses with the square-root fall —
 *   the same rule a blank's curves are drawn with, PCHIP inside (Phase 14 D-13). Both are exact at
 *   the five stations. Its `effectiveFoil` is the stored foil exactly and its `stationRocker` the
 *   typed rocker exactly, so nothing RAILS shows moves for a board without a blank.
 * - A board in a blank (D-01; cut from it as a planer does, Phase 12) reads its rocker and foil off
 *   `boardOnBlank`, and also carries the blank's own silhouette in the board's coordinates — its
 *   deck the skin above the board's deck, its bottom the centre gap below the board's un-thinned
 *   bottom — the foam to come off the deck and off the bottom at each station, the blank's own
 *   printed numbers at its catalogue's five stations (the DATASHEET's blank rows), and each tip's Thinning Starts point as
 *   `boardOnBlank` resolved it (`tips`, Phase 14 D-12) — so every screen reads where each tip's
 *   thinning starts, and why, without working anything out itself.
 *
 * In both, the deck is DERIVED (R10): `deckAt(s)` is exactly `rockerAt(s) + thicknessAt(s)`, never
 * a third interpolated curve. Every curve is prepared once when the profile is built and only
 * sampled afterwards (R14); a blank is prepared once per blank copy (`prepareBlank`) before it
 * gets here, so building a profile never refits the catalogue's raw stations.
 *
 * Stations are measured from the board's tail tip (0) to its nose tip (`length`), in millimetres.
 *
 * No React/browser/database import — pure geometry, unit-tested in board-profile.test.ts, per
 * CLAUDE.md Rule 1.
 */
import type { BlankCut, BlankRecord, FineTuneSurface, TipStyle } from "./blank";
import {
  boardOnBlank,
  levelCurve,
  thinningStartsOf,
  type BoardOnBlank,
  type BoardOnBlankInput,
  type PreparedBlank,
  type TipRule,
} from "./blank-fit";
import { type FoilSpec, type FoilStationKey, foilStationPoints } from "./foil";
import { preparePchip } from "./pchip";
import { type FiveStationRocker, ROCKER_LIFT_RANGE_IN, fallbackRockerPoints, rockerStationPositions } from "./rocker";
import { type CurveRule, prepareRootCurve } from "./root-curve";
import type { TipView } from "./tip-taper";
import { type Mm, inchesToMm, mm } from "./units";

/**
 * The catalogue's own station names, and the DATASHEET column each one fills: N0 is the nose tip,
 * N12 is 12 inches in from it, C is the centre, T12 is 12 inches in from the tail tip and T0 is the
 * tail tip itself.
 */
export const CATALOG_STATION_LABELS: Record<FoilStationKey, string> = {
  noseTip: "N0",
  nose12: "N12",
  center: "C",
  tail12: "T12",
  tailTip: "T0",
};

/**
 * One blank station's numbers exactly as the catalogue prints them: rocker before any levelling,
 * thickness, and the full width. Null where the catalogue prints no number.
 */
export interface PrintedBlankValues {
  rocker: Mm | null;
  thickness: Mm | null;
  width: Mm | null;
}

/**
 * The blank's own printed rocker, thickness and width at the catalogue's N0 / N12 / C / T12 / T0
 * stations, picked by label from the record — no arithmetic, no estimate from the curve. The
 * DATASHEET's BLANK block shows the page's own numbers whatever the board's length or placement
 * (the founder's call, 2026-10-03). All three are null when the blank has no such station (Marko
 * Foam's 10'2" M prints no N12 or T12) or the cell is empty; a stored 0 stays 0.
 */
export function printedBlankStations(record: BlankRecord): Record<FoilStationKey, PrintedBlankValues> {
  const out = {} as Record<FoilStationKey, PrintedBlankValues>;
  for (const key of Object.keys(CATALOG_STATION_LABELS) as FoilStationKey[]) {
    const station = record.stations.find((s) => s.label === CATALOG_STATION_LABELS[key]);
    out[key] = station
      ? { rocker: station.rockerMm, thickness: station.thicknessMm, width: station.widthMm }
      : { rocker: null, thickness: null, width: null };
  }
  return out;
}

/** A board's blank as the side view and the DATASHEET need it — every station in the BOARD's
 * coordinates (0 = the board's tail tip). */
export interface BlankSideView {
  /** The blank the board sits in (the prepared blank's private copy of it). */
  record: BlankRecord;
  /** The placement actually used — the requested one clamped into range on read. */
  placement: Mm;
  /** The board laid on the blank, for anything that needs a curve this view doesn't carry. */
  onBlank: BoardOnBlank;
  /** Where the blank's tail tip falls in board coordinates (negative when it overhangs the tail). */
  start: Mm;
  /** Where the blank's nose tip falls in board coordinates: `start` + the blank's length. */
  end: Mm;
  /** The cut the board was derived with (Phase 12): deck skin, Tip Style, fine-tune surface. */
  cut: BlankCut;
  /** The foam planed off the bottom at the board's centre (Phase 12 D-03). */
  centerGap: Mm;
  /** The blank's bottom, in the board's rocker frame: the board's bottom less the foam off the
   * bottom there. Along the board it runs parallel to the board's un-thinned bottom, the centre gap
   * below it (Phase 12 R2) — no longer the board's bottom itself. */
  bottomAt(s: Mm): Mm;
  /** The blank's deck: its bottom plus its own thickness there. */
  deckAt(s: Mm): Mm;
  /** The 12" thicknesses before any fine-tune (D-11): the blank's thickness there less the deck
   * skin and the centre gap (Phase 12 R3) — unless that tip's thinning starts further in than 12",
   * when the 12" thickness is the steady taper's (Phase 14 D-07). */
  derived12: { nose12: Mm; tail12: Mm };
  /** Foam off the deck at each of the board's five stations (`BoardOnBlank.deckOffAt`). */
  foamOffDeck: Record<FoilStationKey, Mm>;
  /** Foam off the bottom at each of the board's five stations (`BoardOnBlank.bottomOffAt`). */
  foamOffBottom: Record<FoilStationKey, Mm>;
  /** The blank's own printed numbers at its catalogue's N0 / N12 / C / T12 / T0 stations — the
   * DATASHEET's blank rows. Independent of the board's length and placement, and read from this
   * view's own `record`, never the blank table. */
  printed: Record<FoilStationKey, PrintedBlankValues>;
  /** Every station the catalogue measured for rocker and for thickness, tail to nose, in board
   * coordinates — the measuring-points overlay's blank dots (D-15). */
  measuredStations: { rocker: Mm[]; thickness: Mm[] };
  /**
   * Each tip's Thinning Starts point (Phase 14 D-02, D-12; UI-SPEC §4), exactly as `boardOnBlank`
   * resolved it: the start in force, in from that tip (`fromTip`), and its mark's station along the
   * board (`station`); whether it is Automatic or set by hand; what Automatic picks; the slider's
   * reach; whether it starts further in than the 12" station; and the too-close flag. The sidebar,
   * the drawing's mark, the DATASHEET and the order form read these and work nothing out (Rule 1).
   * The per-tip distance is `fromTip`, never `start` — `start` above already means where the blank's
   * tail tip falls.
   */
  tips: { nose: TipView; tail: TipView };
}

/** The one side profile every screen reads (Pattern 5). */
export interface BoardSideProfile {
  length: Mm;
  /** The board's bottom rocker, levelled so its lowest point reads 0. */
  rockerAt(s: Mm): Mm;
  /** The board's final thickness. */
  thicknessAt(s: Mm): Mm;
  /** The deck: exactly `rockerAt(s) + thicknessAt(s)` (R10). */
  deckAt(s: Mm): Mm;
  /** The board's five stations, tail to nose. */
  stations: { key: FoilStationKey; station: Mm }[];
  /** The rocker at the five stations. */
  stationRocker: Record<FoilStationKey, Mm>;
  /** The thickness at the five stations — what RAILS reads. */
  effectiveFoil: FoilSpec;
  /** The blank the board sits in, or null for a hand-set board. */
  blank: BlankSideView | null;
}

function stationRecord<T>(
  stations: { key: FoilStationKey; station: Mm }[],
  read: (station: Mm) => T,
): Record<FoilStationKey, T> {
  const out = {} as Record<FoilStationKey, T>;
  for (const { key, station } of stations) out[key] = read(station);
  return out;
}

/**
 * The hand-set profile (D-14): the rocker through the five typed stations with the square-root rise
 * and the foil through the five stored thicknesses with the square-root fall, PCHIP inside both
 * (Phase 14 D-13) — the same rule a blank's curves are drawn with. Still exact at the five stations.
 * The rocker is levelled over the board, which leaves it untouched: every typed lift is at least
 * the centre's 0, and a rise never reads below its lowest station, so the lowest point is exactly 0.
 */
export function buildFallbackProfile(rocker: FiveStationRocker, foil: FoilSpec, length: Mm): BoardSideProfile {
  return fallbackProfileWith(rocker, foil, length, "root");
}

/**
 * `buildFallbackProfile` under a chosen curve rule: `"root"` is the live rule; `"pchip"` is the
 * curve every hand-set board was drawn with before Phase 14, kept by name for the reports and
 * pictures only (D-25).
 */
function fallbackProfileWith(
  rocker: FiveStationRocker,
  foil: FoilSpec,
  length: Mm,
  curve: CurveRule,
): BoardSideProfile {
  const rockerPoints = fallbackRockerPoints(rocker, length);
  const rockerCurve = levelCurve(
    curve === "pchip" ? preparePchip(rockerPoints) : prepareRootCurve(rockerPoints, "rise"),
    0,
    length,
  );
  const foilPoints = foilStationPoints(foil, length).map((point) => ({ x: point.station, y: point.thickness }));
  const foilCurve = curve === "pchip" ? preparePchip(foilPoints) : prepareRootCurve(foilPoints, "fall");
  const rockerAt = (s: Mm) => mm(rockerCurve.sample(s));
  const thicknessAt = (s: Mm) => mm(foilCurve.sample(s));

  return {
    length,
    rockerAt,
    thicknessAt,
    deckAt: (s) => mm(rockerAt(s) + thicknessAt(s)),
    stations: rockerStationPositions(length),
    stationRocker: {
      tailTip: rocker.tailTip,
      tail12: rocker.tail12,
      center: mm(0),
      nose12: rocker.nose12,
      noseTip: rocker.noseTip,
    },
    effectiveFoil: { ...foil },
    blank: null,
  };
}

/**
 * The profile of a board laid on a prepared blank at `placement` (clamped on read, never written
 * back). Rocker and thickness come straight from `boardOnBlank`, sampled densely wherever they are
 * read — never re-splined from five stations (Anti-Patterns). The five station numbers are read
 * off those same curves.
 */
export function buildBlankProfile(
  prepared: PreparedBlank,
  board: BoardOnBlankInput,
  placement: Mm,
): BoardSideProfile {
  const onBlank = boardOnBlank(prepared, board, placement);
  const length = board.length;
  const stations = rockerStationPositions(length);
  const rockerAt = (s: Mm) => mm(onBlank.rockerAt(s));
  const thicknessAt = (s: Mm) => mm(onBlank.thicknessAt(s));

  const start = mm(length / 2 - prepared.lengthMm / 2 - onBlank.placement);
  const measured = (pick: (station: BlankRecord["stations"][number]) => Mm | null) =>
    prepared.record.stations.filter((station) => pick(station) !== null).map((station) => mm(start + station.fromTailMm));

  // The blank's bottom is the board's bottom less the foam planed off the bottom there: the Pin
  // deck thinning and a Bottom fine-tune appear in both and cancel, leaving the blank's own rocker
  // (levelled with the board's) the centre gap below the board's un-thinned bottom.
  const bottomAt = (s: Mm) => mm(onBlank.rockerAt(s) - onBlank.bottomOffAt(s));
  const tail12 = stations.find((station) => station.key === "tail12")!.station;
  const nose12 = stations.find((station) => station.key === "nose12")!.station;

  const blank: BlankSideView = {
    record: prepared.record,
    placement: onBlank.placement,
    onBlank,
    start,
    end: mm(start + prepared.lengthMm),
    cut: onBlank.cut,
    centerGap: mm(onBlank.centerGap),
    bottomAt,
    deckAt: (s) => mm(bottomAt(s) + onBlank.blankThicknessAt(s)),
    derived12: {
      nose12: mm(onBlank.derivedThicknessAt(nose12)),
      tail12: mm(onBlank.derivedThicknessAt(tail12)),
    },
    foamOffDeck: stationRecord(stations, (s) => mm(onBlank.deckOffAt(s))),
    foamOffBottom: stationRecord(stations, (s) => mm(onBlank.bottomOffAt(s))),
    printed: printedBlankStations(prepared.record),
    measuredStations: {
      rocker: measured((station) => station.rockerMm),
      thickness: measured((station) => station.thicknessMm),
    },
    tips: onBlank.tips,
  };

  return {
    length,
    rockerAt,
    thicknessAt,
    deckAt: (s) => mm(rockerAt(s) + thicknessAt(s)),
    stations,
    stationRocker: stationRecord(stations, rockerAt),
    effectiveFoil: stationRecord(stations, thicknessAt),
    blank,
  };
}

/**
 * What "Remove This Blank" (UI-SPEC §7) leaves behind: the hand-set rocker and foil seeded from the
 * board's profile as it is on screen at that moment, so the five station numbers do not move (but for
 * a tip below the centre, as the Rocker point says).
 *
 * - Rocker: the four lifts are the profile's rocker at those stations LESS its centre rocker. The
 *   hand-set rocker's centre is 0 by definition (D-14), and a board in a blank can have a non-zero
 *   centre rocker (its crop's low point need not sit at the centre, e.g. at an off-centre
 *   placement), so each lift is rebased on the centre rather than copied — the board keeps the
 *   same shape at the five stations, with its centre as the zero. Each lift is then pulled into
 *   `ROCKER_LIFT_RANGE_IN`, so a tip that sat below the centre (a reverse-rocker tail under Pin deck)
 *   becomes 0: the hand-set rocker fixes the centre at 0 and cannot keep a tip below it, and a lift
 *   kept below 0 would make the drawing level on that tip and disagree with these numbers.
 * - Foil: the two 12" thicknesses are the profile's FINAL ones (blank-derived plus any fine-tune),
 *   read off `effectiveFoil`. The centre and both tips stay the stored foil's own — they already
 *   are what the blank profile reads there, and `foil.center` stays the one stored centre.
 *
 * Between the stations the hand-set curve is the square-root rule through these five numbers (Phase
 * 14 D-13) — the same rule a blank's curves use, but through five numbers rather than the blank's
 * dense curve, so the drawing between stations (and the litres, a little) can move. That is what
 * the sidebar's hint says.
 */
export function handSetFromProfile(
  profile: BoardSideProfile,
  foil: FoilSpec,
): { rocker: FiveStationRocker; foil: FoilSpec } {
  const { stationRocker, effectiveFoil } = profile;
  const centre = stationRocker.center;
  const lowest = inchesToMm(ROCKER_LIFT_RANGE_IN.min);
  const highest = inchesToMm(ROCKER_LIFT_RANGE_IN.max);
  const lift = (at: Mm) => mm(Math.min(highest, Math.max(lowest, at - centre)));
  return {
    rocker: {
      noseTip: lift(stationRocker.noseTip),
      nose12: lift(stationRocker.nose12),
      tail12: lift(stationRocker.tail12),
      tailTip: lift(stationRocker.tailTip),
    },
    foil: { ...foil, nose12: effectiveFoil.nose12, tail12: effectiveFoil.tail12 },
  };
}

/** What `buildBoardProfile` needs: the board's hand-set rocker and stored foil, and its blank. */
export interface BoardProfileInput {
  length: Mm;
  /** The hand-set rocker — used only when there is no blank. */
  rocker: FiveStationRocker;
  /** The stored foil. With a blank, only `center` and the two tips are read. */
  foil: FoilSpec;
  /** The board's blank, where it sits, its two fine-tunes and (Phase 12) its own cut. */
  blank: {
    prepared: PreparedBlank;
    placement: Mm;
    nose12Offset: Mm;
    tail12Offset: Mm;
    deckSkin: Mm;
    tipStyle: TipStyle;
    fineTuneSurface: FineTuneSurface;
    /**
     * Which tip rule cuts the tips (`BoardOnBlankInput.tipRule`): absent is the live steady taper;
     * `"blend"` is the 12" S-blend kept by name for the reports and the pin only (D-25).
     */
    tipRule?: TipRule;
    /**
     * The board's own stored Thinning Starts (Phase 14 D-24), in mm in from each tip. Absent is
     * Automatic. They reach `boardOnBlank` through `thinningStartsOf`, the one helper every place
     * that builds a board from its stored blank uses, so no path can drop them.
     */
    noseThinningStart?: Mm;
    tailThinningStart?: Mm;
  } | null;
  /**
   * Which rule draws a board with no blank between its five stations. Absent is the live
   * square-root rule (Phase 14 D-13); `"pchip"` is the curve hand-set boards were drawn with before
   * Phase 14, kept by name only for the reports and pictures (D-25) and removed after the showing.
   * Ignored when a blank is picked.
   */
  handSetCurve?: CurveRule;
}

/**
 * The board's side profile, whichever kind of board it is. With a blank, the foil's centre is the
 * target thickness and its two tips the tip settings, cut from the blank with the board's own deck
 * skin, Tip Style and fine-tune surface; the foil's stored 12" values are the hand-set fallback's
 * own and are ignored while a blank is picked.
 */
export function buildBoardProfile(input: BoardProfileInput): BoardSideProfile {
  const { length, rocker, foil, blank } = input;
  if (!blank) return fallbackProfileWith(rocker, foil, length, input.handSetCurve ?? "root");
  return buildBlankProfile(
    blank.prepared,
    {
      length,
      centerThickness: foil.center,
      noseTip: foil.noseTip,
      tailTip: foil.tailTip,
      nose12Offset: blank.nose12Offset,
      tail12Offset: blank.tail12Offset,
      deckSkin: blank.deckSkin,
      tipStyle: blank.tipStyle,
      fineTuneSurface: blank.fineTuneSurface,
      ...(blank.tipRule === undefined ? {} : { tipRule: blank.tipRule }),
      ...thinningStartsOf(blank),
    },
    blank.placement,
  );
}
