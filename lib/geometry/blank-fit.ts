/**
 * A board laid on a real foam blank (Phase 11): the blank's own rocker, thickness and width
 * drawn through its printed stations with the square-root rule (Phase 14 D-13, `root-curve.ts`,
 * today's pchip inside it), the rocker levelled so its low point reads zero, the board's rocker and
 * foil read off the blank at any placement, and the check that the board fits inside the foam.
 * Today's rule — pchip straight through the printed values — survives only as `prepareBlankPchip`.
 * On the live rule the width's 0-wide tips are round, not pointed (sketch 012 C, `round-tip.ts`,
 * quick 261007-c3h): inside the last printed station before such a tip the width is a parabola from
 * the tip, so the drawing and the fit check both see the foam a real round nose has.
 *
 * How a board sits on a blank (D-08): board station `s` (0 = the board's tail tip) lies at blank
 * station u(s) = Lb/2 + p + s − L/2, where L is the board's length, Lb the blank's, and p the
 * placement — the board's centre relative to the blank's centre, positive toward the nose. At
 * L = Lb and p = 0 that is u = s exactly, so the board IS the blank.
 *
 * How a board is cut from its blank (Phase 12): the way a planer takes foam off. A constant deck
 * skin comes off the top, so the board's deck is the blank's deck lowered by the skin; the bottom
 * is planed flat down until the centre reads the target, so the board's bottom is the blank's
 * bottom raised by one constant centre gap and the rocker is the blank's own; and the tips are
 * thinned last, off the bottom (Pin deck) or off the deck (Bottom). From Phase 14 (D-01) each tip runs
 * down steadily from its own Thinning Starts point — 12" unless the board cannot run down steadily from
 * there, or wherever the shaper set it (`tip-taper.ts`) — along one smooth curve to the tip setting.
 * Phase 12's S-shaped ease over the last 12" survives only by name (`tipRule: "blend"`) for the
 * before-and-after reports (D-25). Phase 11 scaled the blank's thickness by one ratio instead; that
 * formula survives only in `phase11-foil.ts`, to carry Phase 11's saved boards across.
 *
 * Judging the catalogue (11-03): the two floors that hide a blank (D-04), the best-placement
 * search that decides whether a blank fits anywhere along its length (D-07), the list's two groups
 * (D-06), the "closest blank that fits" offer and the "Move to Where It Fits" rescue (D-08).
 *
 * No React/browser/database import — pure geometry, unit-tested in blank-fit.test.ts, per
 * CLAUDE.md Rule 1. Every length is millimetres.
 */
import { isPickable } from "../blanks/catalog";
import {
  type BlankCut,
  type BlankRecord,
  type BlankShortfall,
  type BlankStation,
  type FineTuneSurface,
  type FitResult,
  type FitSettings,
  type RunsOutCause,
  type TipStyle,
} from "./blank";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { MEASURE_STATION_MM } from "./outline";
import { pchipMinimum, preparePchip, type PreparedPchip } from "./pchip";
import { rockerStationPositions } from "./rocker";
import { prepareRootCurve, type CurveRule, type RootKind } from "./root-curve";
import { roundZeroTips } from "./round-tip";
import { thinningStartRange, tipView, type PlanerCut, type TipView } from "./tip-taper";
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

/**
 * The stretch Phase 12's S-shaped ease ran over — tip to the 12" station (D-17). Since Phase 14 it
 * is used only by `tipRule: "blend"` (today's rule, kept by name for the reports, D-25); it is also
 * the same distance as the 12" station Phase 11's conversion reads.
 */
export const TIP_EASE_WINDOW_MM = MEASURE_STATION_MM;

/**
 * The least foam a board may be anywhere, tips included (Phase 12 D-18, raised to 1/4" by the
 * founder on 2026-09-28, Phase 13 item 4): a board that would be thinner than this somewhere does
 * not fit — and the reason is that the blank is too thick for this centre, not too thin. Every
 * thickness control (ROCKER's Center Thickness, tips and 12" stations, and the Fit & Tip Defaults
 * dialog's tip boxes) starts at this same figure — `FOIL_THICKNESS_RANGE_IN.min` — so only an older
 * saved board or stored default can hold a thinner tip, and such a board opens flagged, never
 * quietly raised.
 */
export const MIN_FOIL_THICKNESS_MM = inchesToMm(FOIL_THICKNESS_RANGE_IN.min);

/** A board fits when its worst shortfall is no more than this — float noise, not foam. */
export const FIT_EPSILON_MM = 1e-6;

/**
 * A prepared curve with its minimum over some stretch subtracted, so that stretch's lowest point
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
 * and every knot strictly inside (`pchipMinimum`), not merely the lowest printed station value.
 * Exact on both rules, because each runs steadily between two knots: pchip is monotone there, and
 * the square-root rule stays between its two neighbouring printed values — so the minimum is always
 * a knot or an end.
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
  /**
   * Full width (not half-width). On the live rule a tip printed 0 wide is round — the parabola
   * from the tip inside the last printed station (sketch 012 C, `round-tip.ts`); everywhere else it
   * is the square-root fall through the printed widths, and every printed width reads exactly.
   */
  width: PreparedPchip;
}

/**
 * The curve through one attribute's OWN non-empty stations — an empty cell is not a knot (R10) —
 * drawn by `rule`: `"pchip"` is today's pchip straight through the printed values, `"root"` the
 * square-root rule running the way `kind` says (a bottom rises from its lowest station, a thickness
 * or width falls from its highest).
 */
function attributeCurve(
  stations: readonly BlankStation[],
  pick: (station: BlankStation) => Mm | null,
  rule: CurveRule,
  kind: RootKind,
): PreparedPchip {
  const points: { x: number; y: number }[] = [];
  for (const station of stations) {
    const value = pick(station);
    if (value !== null) points.push({ x: station.fromTailMm, y: value });
  }
  return rule === "pchip" ? preparePchip(points) : prepareRootCurve(points, kind);
}

/**
 * Fits a blank once (R14) on one rule: one curve per attribute over that attribute's own stations,
 * the rocker levelled over the whole blank. The record is copied first, so changing it afterwards
 * changes nothing the prepared blank returns.
 *
 * Throws if the blank has no thickness at its `C` station — such a blank is not pickable
 * (`isPickable`), because the list's centre floor reads that printed centre (D-04).
 */
function prepareBlankWith(record: BlankRecord, rule: CurveRule): PreparedBlank {
  const copy: BlankRecord = {
    ...record,
    stations: record.stations.map((station) => ({ ...station })),
  };
  const centre = copy.stations.find((station) => station.label === "C");
  if (!centre || centre.thicknessMm === null) {
    throw new Error(`${copy.vendor} ${copy.name} has no thickness at its centre station`);
  }
  const rockerCurve = attributeCurve(copy.stations, (station) => station.rockerMm, rule, "rise");
  const widthCurve = attributeCurve(copy.stations, (station) => station.widthMm, rule, "fall");
  return {
    record: copy,
    lengthMm: copy.lengthMm,
    centerThicknessMm: centre.thicknessMm,
    rocker: levelCurve(rockerCurve, 0, copy.lengthMm),
    thickness: attributeCurve(copy.stations, (station) => station.thicknessMm, rule, "fall"),
    // A tip printed 0 wide is drawn round on the live rule only (D3): the "pchip" rule stays as it
    // was, for the boards recorded before Phase 14.
    width: rule === "root" ? roundZeroTips(widthCurve) : widthCurve,
  };
}

/**
 * Fits a blank on the live rule — the one every screen, the blank list, the flag, the rack and
 * preset cards and the saved-boards check use (Phase 14 D-13): the bottom drawn with the
 * square-root rise from its lowest station, the thickness and width with the square-root fall from
 * their highest, every printed station read exactly.
 *
 * Throws if the blank has no thickness at its `C` station (see `prepareBlankWith`).
 */
export function prepareBlank(record: BlankRecord): PreparedBlank {
  return prepareBlankWith(record, "root");
}

/**
 * Fits a blank on today's rule — pchip straight through the printed values — kept callable by NAME
 * only for the Phase 11 conversion, the pin's own test, the saved-boards reports and the
 * before-and-after pictures (Phase 14 D-25). It is a separate function rather than a second argument
 * on `prepareBlank` because `.map(prepareBlank)` would pass the index as that argument (Pitfall 4).
 * Removed after the showing.
 *
 * Throws if the blank has no thickness at its `C` station (see `prepareBlankWith`).
 */
export function prepareBlankPchip(record: BlankRecord): PreparedBlank {
  return prepareBlankWith(record, "pchip");
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
  /** The board's own deck skin (Phase 12 D-01). */
  deckSkin: Mm;
  /** The board's own Tip Style (Phase 12 D-04). */
  tipStyle: TipStyle;
  /** The board's own fine-tune surface (Phase 12 D-13). */
  fineTuneSurface: FineTuneSurface;
  /**
   * Where the nose's thinning starts, in mm in from the nose tip, set by hand (Phase 14 D-02).
   * Absent (or not a number) is Automatic; a finite value is pulled into the range on read.
   */
  noseThinningStart?: Mm;
  /** Where the tail's thinning starts, in mm in from the tail tip — as `noseThinningStart`. */
  tailThinningStart?: Mm;
  /**
   * Which tip rule cuts the tips. Absent is `"steady"`, the live rule (D-01). `"blend"` is Phase 12's
   * S-shaped ease over the last 12", kept by name only for the pin, the before-side rule sets and the
   * reports (D-25), and removed after the showing; it ignores both Thinning Starts.
   */
  tipRule?: TipRule;
}

/**
 * How a board's tips are thinned: `"steady"` runs each tip down steadily from its own Thinning
 * Starts point (Phase 14 D-01, the live rule); `"blend"` is Phase 12's S-shaped ease over the last
 * 12" at each end, kept by name for the reports only (D-25).
 */
export type TipRule = "steady" | "blend";

/**
 * A blank's two stored Thinning Starts, ready to spread into a `BoardOnBlankInput`: only the starts
 * that are actually stored come back, so an Automatic tip never carries an `undefined` key. The ONE
 * helper every place that builds a board from a stored blank uses.
 */
export function thinningStartsOf(
  blank: { noseThinningStart?: Mm; tailThinningStart?: Mm } | null | undefined,
): { noseThinningStart?: Mm; tailThinningStart?: Mm } {
  const starts: { noseThinningStart?: Mm; tailThinningStart?: Mm } = {};
  if (blank?.noseThinningStart !== undefined) starts.noseThinningStart = blank.noseThinningStart;
  if (blank?.tailThinningStart !== undefined) starts.tailThinningStart = blank.tailThinningStart;
  return starts;
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
  /** The cut the board was derived with — its own, or the out-of-the-box one where it has none. */
  cut: BlankCut;
  /**
   * The foam planed off the bottom at the board's centre (Phase 12 D-03): the blank's thickness
   * under the board's centre less the deck skin less the target centre. Below zero means the
   * blank is too thin there for this centre and skin.
   */
  centerGap: number;
  /** The crop's own low point, as a height above the blank's levelled low point. */
  cropMinimum: number;
  /**
   * The board's bottom rocker, levelled on the un-thinned bottom so it is the blank's own rocker
   * wherever there is no Pin deck thinning (R3, R5). Under Pin deck the tip thinning lifts it
   * (or drops it, when the thinning is negative — D-16). A fine-tune on the Bottom (D-13) lowers
   * it by the tweak and the whole curve re-levels on its own low point.
   */
  rockerAt(s: number): number;
  /** The blank's import-levelled rocker under board station `s`. */
  blankRockerAt(s: number): number;
  /** The blank's thickness under board station `s`; 0 where the board runs past the blank. */
  blankThicknessAt(s: number): number;
  /** The blank's full width under board station `s`; 0 where the board runs past the blank. */
  blankWidthAt(s: number): number;
  /**
   * Whether board station `s` lies over the blank (within `FIT_EPSILON_MM` of either end); where
   * it does not, `blankThicknessAt` and `blankWidthAt` read 0 (Phase 13 item 4: what a runs-out
   * cause of `"offBlank"` means).
   */
  onFoamAt(s: number): boolean;
  /**
   * The signed tip thinning at `s` (D-05, D-16): the planer cut less the board's thickness before any
   * fine-tune — 0 at and inward of each tip's Thinning Starts point, the un-thinned tip thickness less
   * the tip setting at each tip, and the planer cut less the steady taper between. Negative where the
   * taper runs above the planer cut (a tip setting thicker than the parallel foil there).
   */
  tipThinningAt(s: number): number;
  /**
   * The board's thickness before any fine-tune: the blank's thickness less the skin and the centre
   * gap (so the centre is the target), and inside each tip's start the steady taper down to the tip
   * setting — each tip reads its setting exactly.
   */
  derivedThicknessAt(s: number): number;
  /**
   * The thickness before any fine-tune with BOTH tips on Automatic, whatever is stored — what the
   * board would be if the shaper put both starts back to Automatic.
   */
  automaticThicknessAt(s: number): number;
  /** Each tip's Thinning Starts point resolved (`tip-taper.ts` `tipView`). */
  tips: { nose: TipView; tail: TipView };
  /** The tip rule the board was cut with. */
  tipRule: TipRule;
  /** The board's final thickness: derived plus the 12" fine-tunes (D-11), on either surface. */
  thicknessAt(s: number): number;
  /**
   * Foam off the deck at `s`: the skin, plus the tip thinning under Bottom, less a fine-tune on the
   * Deck. Below zero means the board's deck rises above the blank's deck there.
   */
  deckOffAt(s: number): number;
  /**
   * Foam off the bottom at `s`: the centre gap, plus the tip thinning under Pin deck, less a
   * fine-tune on the Bottom. Below zero means the board's bottom drops below the blank's there.
   */
  bottomOffAt(s: number): number;
}

/** 0 at w = 0, 1 at w = 1, flat at both ends — so the tip ease joins the 12" station with no kink. */
function smoothstep(w: number): number {
  const t = Math.min(1, Math.max(0, w));
  return t * t * (3 - 2 * t);
}

/**
 * Lays a board on a prepared blank and derives its rocker and foil the way a planer cuts it.
 *
 * - Deck (R1): the blank's deck less the deck skin, everywhere.
 * - Bottom (R2, D-03): planed parallel to the blank's bottom, the centre gap above it, where
 *   centre gap = the blank's thickness under the board's centre − skin − target centre. So the
 *   thickness is the blank's less (skin + gap) — the blank's less (its thickness under the board's
 *   centre − the target), the skin cancelling out — and the centre equals the target at every
 *   placement (R3).
 * - Rocker (R3, R5): the blank's levelled rocker under the board, levelled again over the crop
 *   (R11). The gap is one constant, so levelling the un-thinned bottom gives exactly that curve.
 * - Tips (Phase 14 D-01 to D-03, D-23): each tip resolves its own Thinning Starts point through
 *   `tipView` — the planer cut seen from that tip being the un-thinned thickness, its slope the
 *   blank's own thickness slope (sign flipped at the nose), both read 0 where the board runs off the
 *   blank — Automatic unless the board stores a start. Inside the start the thickness is the steady
 *   taper down to the tip setting, which it reads exactly at the tip; at and inward of the start it is
 *   the planer cut untouched. The thinning (planer cut less taper) comes off the bottom under Pin deck
 *   (lifting the tip rocker) or the deck under Bottom (D-05, D-16). Under `tipRule: "blend"` the old
 *   S-shaped ease over the last 12" is used instead, line for line as Phase 12 wrote it (D-25).
 * - Fine-tunes (D-11, D-13): a signed offset through a three-knot pchip hump per half — 0 at the
 *   tip, the offset at the 12" station, 0 at the centre — added to the thickness and taken off the
 *   surface the board chose. On the Deck the rocker never moves. On the Bottom the bottom drops by
 *   the hump and the rocker re-levels on its own low point, found over every 1/16" plus the five
 *   stations and every blank rocker knot under the board: exact when both tweaks are zero,
 *   otherwise within 1e-3 mm of the true low point — far under one printed step.
 *
 * The placement is clamped on read (never written back). Where the board runs past either end of
 * the blank, the blank's thickness and width read 0, so the fit fails instead of lying (Pitfall 8).
 */
export function boardOnBlank(
  prepared: PreparedBlank,
  board: BoardOnBlankInput,
  placement: Mm,
): BoardOnBlank {
  const cut: BlankCut = {
    deckSkin: board.deckSkin,
    tipStyle: board.tipStyle,
    fineTuneSurface: board.fineTuneSurface,
  };
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

  // The 12" station: where the fine-tune hump peaks (D-04, D-11), whatever the tips do.
  const S12 = MEASURE_STATION_MM;
  const underCentre = blankThicknessAt(L / 2);
  const centerGap = underCentre - cut.deckSkin - board.centerThickness;
  // Skin + gap: all the foam the parallel cut takes off, whatever the skin.
  const drop = underCentre - board.centerThickness;
  const unthinned = (s: number) => blankThicknessAt(s) - drop;

  const rule: TipRule = board.tipRule ?? "steady";
  let tipThinningAt: (s: number) => number;
  let derivedThicknessAt: (s: number) => number;
  let automaticThicknessAt: (s: number) => number;
  let tips: { nose: TipView; tail: TipView };

  if (rule === "steady") {
    // The planer cut seen from each tip (D-23): `d` mm in from that tip, its slope the blank's own
    // thickness slope there (the drop is one constant), flipped at the nose because d runs the
    // other way. Where the board runs off the blank only the slope reads 0; the planer cut there
    // reads the blank's 0 thickness less the drop, `0 − drop`, a negative thickness.
    const blankSlopeAt = (s: number) => {
      const x = u(s);
      return onFoam(x) ? prepared.thickness.slopeAt(x) : 0;
    };
    const tailCut: PlanerCut = { at: (d) => unthinned(d), slopeAt: (d) => blankSlopeAt(d) };
    const noseCut: PlanerCut = { at: (d) => unthinned(L - d), slopeAt: (d) => -blankSlopeAt(L - d) };
    const resolve = (tailStored: number | undefined, noseStored: number | undefined) => {
      const tail = tipView({ cut: tailCut, tip: board.tailTip, length: L, stored: tailStored, end: "tail" });
      const nose = tipView({ cut: noseCut, tip: board.noseTip, length: L, stored: noseStored, end: "nose" });
      // Inside a tip's start the taper; at and inward of both starts the planer cut itself, read
      // through the same `unthinned` so nothing there moves by a bit.
      const thickness = (s: number) => {
        if (s < tail.view.fromTip) return tail.taper(s);
        if (s > L - nose.view.fromTip) return nose.taper(L - s);
        return unthinned(s);
      };
      return { tail, nose, thickness };
    };

    const live = resolve(board.tailThinningStart, board.noseThinningStart);
    tips = { tail: live.tail.view, nose: live.nose.view };
    derivedThicknessAt = live.thickness;
    tipThinningAt = (s) => {
      if (s < live.tail.view.fromTip || s > L - live.nose.view.fromTip) return unthinned(s) - live.thickness(s);
      return 0;
    };
    automaticThicknessAt =
      live.tail.view.automatic && live.nose.view.automatic ? live.thickness : resolve(undefined, undefined).thickness;
  } else {
    // Phase 12's S-shaped ease over the last 12", line for line (D-25): kept by name for the pin,
    // the before-side rule sets and the reports only.
    const W = TIP_EASE_WINDOW_MM;
    const tailUn = unthinned(0);
    const noseUn = unthinned(L);

    tipThinningAt = (s: number) => {
      let thinning = 0;
      if (s < W) thinning += (tailUn - board.tailTip) * smoothstep(1 - s / W);
      if (s > L - W) thinning += (noseUn - board.noseTip) * smoothstep(1 - (L - s) / W);
      return thinning;
    };

    derivedThicknessAt = (s: number) => {
      let value = unthinned(s);
      // Written as unthinned − unthinnedAtTip·w + tip·w so that at the tip (w = 1) the first two
      // terms cancel exactly and the tip reads its setting to the last bit.
      if (s < W) {
        const w = smoothstep(1 - s / W);
        value = value - tailUn * w + board.tailTip * w;
      }
      if (s > L - W) {
        const w = smoothstep(1 - (L - s) / W);
        value = value - noseUn * w + board.noseTip * w;
      }
      return value;
    };
    automaticThicknessAt = derivedThicknessAt;

    const blendView = (end: "nose" | "tail"): TipView => ({
      fromTip: W,
      station: end === "tail" ? W : mm(L - W),
      automatic: true,
      automaticStart: W,
      automaticFound: true,
      range: thinningStartRange(L),
      reachesStation: false,
      flag: null,
    });
    tips = { tail: blendView("tail"), nose: blendView("nose") };
  }

  const tailHump = preparePchip([
    { x: 0, y: 0 },
    { x: S12, y: board.tail12Offset },
    { x: L / 2, y: 0 },
  ]);
  const noseHump = preparePchip([
    { x: L / 2, y: 0 },
    { x: L - S12, y: board.nose12Offset },
    { x: L, y: 0 },
  ]);
  const offsetAt = (s: number) => (s <= L / 2 ? tailHump.sample(s) : noseHump.sample(s));

  const pinDeck = cut.tipStyle === "pinDeck";
  const onDeck = cut.fineTuneSurface === "deck";

  // The un-thinned bottom, as a rocker height: the crop itself, less a Bottom fine-tune (which
  // lowers the bottom by the tweak), re-levelled on its own low point.
  const untuned = (s: number) => crop.sample(u(s));
  let rockerAt: (s: number) => number;
  if (onDeck) {
    rockerAt = pinDeck ? (s) => untuned(s) + tipThinningAt(s) : untuned;
  } else {
    const tuned = (s: number) => untuned(s) - offsetAt(s);
    let level = 0;
    if (board.nose12Offset !== 0 || board.tail12Offset !== 0) {
      const candidates = [0, S12, L / 2, L - S12, L];
      const step = inchesToMm(1 / 16);
      for (let s = 0; s < L; s += step) candidates.push(s);
      const tailOnBlank = u(0);
      for (const knot of prepared.rocker.curve.xs) {
        const s = knot - tailOnBlank;
        if (s > 0 && s < L) candidates.push(s);
      }
      level = Math.min(...candidates.map(tuned));
    }
    rockerAt = pinDeck ? (s) => tuned(s) - level + tipThinningAt(s) : (s) => tuned(s) - level;
  }

  return {
    prepared,
    board,
    placement: p,
    cut,
    centerGap,
    cropMinimum: crop.minimum - prepared.rocker.minimum,
    rockerAt,
    blankRockerAt: (s) => prepared.rocker.sample(u(s)),
    blankThicknessAt,
    blankWidthAt,
    onFoamAt: (s) => onFoam(u(s)),
    tipThinningAt,
    derivedThicknessAt,
    automaticThicknessAt,
    tips,
    tipRule: rule,
    thicknessAt: (s) => derivedThicknessAt(s) + offsetAt(s),
    deckOffAt: (s) => cut.deckSkin + (pinDeck ? 0 : tipThinningAt(s)) - (onDeck ? offsetAt(s) : 0),
    bottomOffAt: (s) => centerGap + (pinDeck ? tipThinningAt(s) : 0) - (onDeck ? 0 : offsetAt(s)),
  };
}

/**
 * Why a runs-out shortfall at `station` happened (Phase 13 item 4, FD-4) — classification only, no
 * new geometry: reads only values `onBlank` already holds. First match wins:
 *
 * - not on the foam at all (`!onBlank.onFoamAt(station)`) → `"offBlank"`: the board runs past the
 *   end of the blank there.
 * - `station` sits inside a tip's thinning (strictly nearer the tail tip than that tip's own
 *   Thinning Starts point, `onBlank.tips.tail.fromTip`, or strictly nearer the nose tip than
 *   `onBlank.tips.nose.fromTip` — that tip's OWN start, however far in it is, never the 12" station)
 *   and that end's own tip setting (`board.tailTip` / `board.noseTip`) is itself under
 *   `MIN_FOIL_THICKNESS_MM − FIT_EPSILON_MM` → `"tipSetting"`.
 * - `station` sits in the stretch a start set by hand decides: that tip's start is set by hand
 *   (`!tips.<end>.automatic`) nearer the tip than Automatic's (`fromTip < automaticStart`), and the
 *   station is nearer that tip than Automatic's start — the hand-set taper and the hand-set start
 *   itself, where the planer cut is usually thinnest; that tip's setting is not under the floor; and
 *   before any fine-tune the board is under the floor there with its own start
 *   (`derivedThicknessAt(station)`) but would have had enough foam there on Automatic
 *   (`automaticThicknessAt(station)` at least the floor) → `"thinningStart"` (Phase 14 D-05,
 *   UI-SPEC §10): the start set too close to the tip is what took that spot under the floor. Reading
 *   both sides before any fine-tune keeps a negative 12" fine-tune's own blame with `"fineTune"`.
 * - that half's 12" fine-tune (`board.tail12Offset` for `station <= L / 2`, `board.nose12Offset`
 *   above — the same split the fine-tune hump uses) is negative, and the board would have had
 *   enough foam there WITHOUT it (`derivedThicknessAt(station)` is at least
 *   `MIN_FOIL_THICKNESS_MM − FIT_EPSILON_MM`) → `"fineTune"`.
 * - otherwise → `"thinCenter"`: the blank itself is too thick for this target centre — the wording
 *   every runs-out had before the other causes existed, and what a runs-out with no cause at all
 *   still reads as.
 */
export function runsOutCause(onBlank: BoardOnBlank, station: number): RunsOutCause {
  const { board, tips } = onBlank;
  const L = board.length;
  if (!onBlank.onFoamAt(station)) return "offBlank";
  const floor = MIN_FOIL_THICKNESS_MM - FIT_EPSILON_MM;
  const inTail = station < tips.tail.fromTip;
  const inNose = station > L - tips.nose.fromTip;
  if (inTail && board.tailTip < floor) return "tipSetting";
  if (inNose && board.noseTip < floor) return "tipSetting";
  // Where that tip's start set by hand, nearer the tip than Automatic's, decides the thickness.
  const startDecides = (view: TipView, tip: number, fromThatTip: number) =>
    !view.automatic && tip >= floor && view.fromTip < view.automaticStart && fromThatTip < view.automaticStart;
  const byHand = startDecides(tips.tail, board.tailTip, station) || startDecides(tips.nose, board.noseTip, L - station);
  if (
    byHand &&
    onBlank.derivedThicknessAt(station) < floor &&
    onBlank.automaticThicknessAt(station) >= floor
  ) {
    return "thinningStart";
  }
  const halfOffset = station <= L / 2 ? board.tail12Offset : board.nose12Offset;
  if (halfOffset < 0 && onBlank.derivedThicknessAt(station) >= floor) return "fineTune";
  return "thinCenter";
}

/**
 * Does the board fit inside its blank? (R12, D-05, Phase 12 D-09, D-15, D-18)
 *
 * Samples every `FIT_SAMPLE_STEP_MM` from tail tip to nose tip, plus the five board stations and
 * the widepoint. At each: the THIN amount is how far the board pokes out of the blank through
 * either surface — the smaller of the foam off the deck and the foam off the bottom, negated — so a
 * deck above the blank's deck and a bottom below the blank's bottom both fail (D-09), and together
 * they cover a board thicker than the blank; and, only where the board itself has width
 * (`halfWidthAt(s) > 0`), the WIDE amount is the board's full width plus `rules.widthMargin` minus
 * the blank's width. Width is never checked where the board has none — a rounded-nose blank is 0
 * wide at its very tip by design, and the board's own outline reaches 0 there too. And at every
 * station, tip windows included, the RUNS-OUT amount is how much thinner than
 * `MIN_FOIL_THICKNESS_MM` the board itself would be there (D-18); a runs-out worst has its cause
 * (`runsOutCause`, Phase 13 item 4) attached before it is returned.
 *
 * One more THIN amount at the board's centre (D-15): at least one pass of the shaper's
 * `rules.planerMaxDepth` must come off the bottom under the board's centre WHERE IT SITS — the
 * placement half of "one pass on the deck and one on the bottom as a minimum". The list's floor
 * (`floorCheck`) reads the blank's printed centre; this reads the foam actually under the board's
 * centre at this placement, which can be less when the board slides toward a thinner end. A
 * failure is reported at the centre by exactly how much less than one pass would come off there.
 *
 * `halfWidthAt` is the board outline's HALF-width (what `sampleOutline` returns). `worst` is the
 * largest amount found, with its station and kind; the board fits when that is no more than
 * `FIT_EPSILON_MM`.
 */
export function fitAt(
  onBlank: BoardOnBlank,
  halfWidthAt: (station: Mm) => number,
  widePointStation: Mm,
  rules: Pick<FitSettings, "widthMargin" | "planerMaxDepth">,
): FitResult {
  const L = onBlank.board.length;
  const stations: number[] = [];
  const steps = Math.floor(L / FIT_SAMPLE_STEP_MM + 1e-9);
  for (let i = 0; i <= steps; i++) stations.push(i * FIT_SAMPLE_STEP_MM);
  stations.push(L);
  for (const { station } of rockerStationPositions(L)) stations.push(station);
  stations.push(Math.min(L, Math.max(0, widePointStation)));

  const thinBy = (s: number) => Math.max(-onBlank.deckOffAt(s), -onBlank.bottomOffAt(s));
  let worst: BlankShortfall = { kind: "thin", station: mm(0), amount: mm(thinBy(0)) };
  const consider = (kind: BlankShortfall["kind"], station: number, amount: number) => {
    if (amount > worst.amount) worst = { kind, station: mm(station), amount: mm(amount) };
  };
  for (const s of stations) {
    consider("thin", s, thinBy(s));
    consider("runsOut", s, MIN_FOIL_THICKNESS_MM - onBlank.thicknessAt(s));
    const half = halfWidthAt(mm(s));
    if (half > 0) consider("wide", s, 2 * half + rules.widthMargin - onBlank.blankWidthAt(s));
  }
  // D-15: one bottom pass must survive under the board's centre where it sits.
  consider("thin", L / 2, rules.planerMaxDepth - onBlank.bottomOffAt(L / 2));
  const result: BlankShortfall =
    worst.kind === "runsOut" ? { ...worst, cause: runsOutCause(onBlank, worst.station) } : worst;
  return { fits: result.amount <= FIT_EPSILON_MM, worst: result };
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
 * The two floors that hide a blank from the list (Phase 11 D-04, Phase 12 D-10): the blank must be
 * at least Extra Length longer than the board, and its own centre-station thickness (Phase 11
 * D-18: the floor keeps the printed `C` value) must leave room above the target centre for the
 * board's Deck Skin — one deck pass — plus at least one bottom pass of the shaper's Planer Max
 * Depth. The amounts come from the board's own cut and `settings` — never a literal here. A failed
 * floor reports by how much it is short.
 */
export function floorCheck(
  prepared: PreparedBlank,
  board: { length: Mm; centerThickness: Mm; deckSkin: Mm },
  settings: FitSettings,
): { passes: boolean; lengthShortBy: Mm | null; centerShortBy: Mm | null } {
  const lengthShort = board.length + settings.extraLength - prepared.lengthMm;
  const centerShort =
    board.centerThickness + board.deckSkin + settings.planerMaxDepth - prepared.centerThicknessMm;
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
        settings,
      );
      results.set(index, result);
    }
    return result;
  };
}

/**
 * True when no blank can take this board at any placement, read off the board alone: a 12"
 * fine-tune on the Deck bigger than the Deck Skin lifts the board's deck above the blank's deck at
 * that station — the fine-tune hump peaks there — and `fitAt` samples that station. D-13 says such a
 * tweak is honestly flagged "too thin there"; this is what lets the list and the flag say so at once
 * instead of confirming it one placement at a time (a full catalogue scan ran 1.3 s in Node and about
 * 40 s on WebKit per keystroke — 12-08).
 *
 * It relies on no tip thinning coming off the deck at a 12" station, so the deck sits at most
 * `deckSkin − offset` below the blank's deck there — above it, for a tweak over the skin — at every
 * placement on every blank. That holds:
 * - under Tip Style Pin deck always — the thinning comes off the bottom, never the deck;
 * - on Automatic under either Tip Style — Automatic starts at 12" (no thinning reaches the station)
 *   or moves a start in only where the taper adds foam at 12" rather than taking it, so the deck
 *   there is never lowered (tested in tip-flow.test.ts, plan 14-13, on the whole stress set).
 *
 * It is conservative in one corner (Phase 14): Tip Style Bottom, a Deck tweak over the skin, and that
 * tip's start set by hand further in than 12". There the taper takes extra foam off the deck at the
 * 12" station, so some placements could fit, and this still refuses the board everywhere — because
 * searching every placement in that corner costs about 30 s per change in Node. Recorded for the
 * founder to decide after the showing, in the pending todo for retiring today's curve and 12" blend.
 * Its answer never depends on the starts: it reads only the surface, the two tweaks and the skin.
 */
export function tweakExceedsDeckSkin(board: BoardOnBlankInput): boolean {
  if (board.fineTuneSurface !== "deck") return false;
  return Math.max(board.nose12Offset, board.tail12Offset) - board.deckSkin > FIT_EPSILON_MM;
}

/** The search itself, on a context whose half-width is already memoised. */
function judgeWith(prepared: PreparedBlank, ctx: BoardFitContext, settings: FitSettings): BlankVerdict {
  const { lo, hi } = placementIndexRange(prepared, ctx.board.length);
  const fitAtIndex = fitterFor(prepared, ctx, settings);
  const verdict = (index: number): BlankVerdict => {
    const { fits, worst } = fitAtIndex(index);
    return { prepared, fits, placement: blankPlacementAt(prepared, ctx.board.length, index), worst };
  };
  // A board no blank can take anywhere is read once, at the centre placement (its worst there is
  // the same over-skin shortfall every placement shows), not searched.
  if (tweakExceedsDeckSkin(ctx.board)) return verdict(0);

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
 * The blank list for a board (D-04, D-06): pickable blanks only; a blank failing either floor
 * (`floorCheck` — the centre floor reads the board's own Deck Skin from `ctx.board`, Phase 12
 * D-10) is hidden; the rest are judged (`judgeBlank`) into FITS and WON'T FIT, each ordered by length then
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
    const floor = floorCheck(blank, ctx.board, settings);
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
    fitAt(boardOnBlank(prepared, ctx.board, placement), halfWidthAt, ctx.widePointStation, settings).fits;

  if (tweakExceedsDeckSkin(ctx.board)) return null;
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
