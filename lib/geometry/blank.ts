/**
 * Foam blank types (Phase 11) — the shapes a vendor's catalogue blank and a board's chosen blank
 * take everywhere in the app — plus the one out-of-the-box cut a board is made with (Phase 12).
 * Types and that one constant only: the maths lives in `lib/geometry/blank-fit.ts`, the catalogue
 * reading in `lib/blanks/`.
 *
 * Every length is millimetres (CLAUDE.md Rule 2) — the catalogues print inches, and they are
 * converted once, at the units boundary, when the CSV is read.
 */
import { inchesToMm, type Litres, type Mm } from "./units";

/**
 * One measured station on a blank, exactly as the catalogue printed it. An empty catalogue cell is
 * `null`, never 0: a station missing a value is simply not a knot of that attribute's curve (R10).
 */
export interface BlankStation {
  /** The catalogue's own station label: `T0`, `T12`, `C`, `N12`, `N0`, `N3`, … */
  label: string;
  /** Distance from the blank's tail tip. */
  fromTailMm: Mm;
  /** Bottom rocker height at this station, as printed (before levelling), or null if not printed. */
  rockerMm: Mm | null;
  /** Blank thickness at this station, or null if not printed. */
  thicknessMm: Mm | null;
  /** Full blank width at this station (not half-width), or null if not printed. */
  widthMm: Mm | null;
  /** The catalogue transcriber's note on this row, verbatim, or null when there is none. */
  flag: string | null;
}

/** One vendor blank: its identity, provenance and every station in tail-to-nose order. */
export interface BlankRecord {
  /** The vendor as the catalogue names it, e.g. `Marko Foam`. */
  vendor: string;
  /** The blank's catalogue name, e.g. `6'0" M-Regular`. */
  name: string;
  /** The catalogue page slug the rows were read from (provenance). */
  catalogSlug: string;
  /** The page of the catalogue PDF the rows were read from (provenance). */
  pdfPage: number;
  /** Tip-to-tip length. */
  lengthMm: Mm;
  /** Deck length where the catalogue prints one, else null. */
  deckLengthMm: Mm | null;
  /** Catalogue volume where printed, else null. */
  volumeLitres: Litres | null;
  /** Every station, tail to nose — however many the catalogue printed (5 to 15). */
  stations: BlankStation[];
}

/**
 * Where the tip thinning comes off (Phase 12 D-04): `pinDeck` takes it off the bottom, so the tip
 * rocker grows (or falls, when the tip needs more foam than the cut leaves — D-16); `bottom` takes
 * it off the deck, so the rocker stays the blank's own.
 */
export type TipStyle = "pinDeck" | "bottom";

/**
 * Which surface a 12" fine-tune moves (Phase 12 D-13), chosen per board independently of the Tip
 * Style: on the `deck` the rocker never moves; on the `bottom` the bottom re-levels on its own low
 * point, so every rocker number can shift.
 */
export type FineTuneSurface = "deck" | "bottom";

/** How a board is cut from its blank (Phase 12): the deck skin, the Tip Style, the fine-tune surface. */
export interface BlankCut {
  /** Foam planed off the blank's deck everywhere (D-01, D-02). */
  deckSkin: Mm;
  tipStyle: TipStyle;
  fineTuneSurface: FineTuneSurface;
}

/**
 * The cut a board has out of the box: a 1/8" deck skin — about one planer pass (Phase 12 D-02) —
 * Pin deck tips (D-04), fine-tunes on the Deck (D-13). A preset opens with exactly this cut rather
 * than the account's default (D-17), and a board carried over from Phase 11 takes its skin from
 * here (D-07/D-14).
 */
export const DEFAULT_BLANK_CUT: BlankCut = {
  deckSkin: inchesToMm(1 / 8),
  tipStyle: "pinDeck",
  fineTuneSurface: "deck",
};

/**
 * A board's chosen blank (D-01): the board carries its blank's rows BY VALUE, so a later catalogue
 * correction can never silently move a saved board, plus where the board sits on it, the two
 * 12" fine-tunes and (Phase 12) how it is cut from the blank.
 */
export interface BoardBlank {
  /** The blank's record exactly as it was when picked. */
  copy: BlankRecord;
  /** Board centre relative to the blank centre, positive toward the nose (D-08). */
  placement: Mm;
  /** Signed fine-tune at the nose 12" station, on the board's fine-tune surface (D-11, D-13). */
  nose12Offset: Mm;
  /** Signed fine-tune at the tail 12" station, on the board's fine-tune surface (D-11, D-13). */
  tail12Offset: Mm;
  /** The board's own deck skin (Phase 12 D-01). */
  deckSkin: Mm;
  /** The board's own Tip Style (Phase 12 D-04). */
  tipStyle: TipStyle;
  /** The board's own fine-tune surface (Phase 12 D-13). */
  fineTuneSurface: FineTuneSurface;
  /**
   * Where the nose's thinning starts, in millimetres in from the nose tip (Phase 14 D-02, D-24).
   * Absent means Automatic. Set only by the Thinning Starts slider and removed by its Automatic
   * button. Not part of `BlankCut`, and not counted by the cut's "all three or none" rule.
   */
  noseThinningStart?: Mm;
  /**
   * Where the tail's thinning starts, in millimetres in from the tail tip (Phase 14 D-02, D-24).
   * Absent means Automatic. Set only by the Thinning Starts slider and removed by its Automatic
   * button. Not part of `BlankCut`, and not counted by the cut's "all three or none" rule.
   */
  tailThinningStart?: Mm;
}

/** The shaper's fit settings (the third account preference, D-09). */
export interface FitSettings {
  /** How much longer than the board a blank must be to be listed. */
  extraLength: Mm;
  /**
   * How deep the shaper's planer cuts in one pass (Phase 12 D-03). Half of the centre floor
   * (D-10): a blank is listed only when its printed centre is at least the target centre plus the
   * board's Deck Skin plus one pass of this depth — room for one deck pass and at least one bottom
   * pass. It replaced Phase 11's Extra Center Thickness.
   */
  planerMaxDepth: Mm;
  /** How much narrower than the blank the board must be at every station (D-05; default 1"). */
  widthMargin: Mm;
}

/**
 * Why a `runsOut` shortfall happened (Phase 13 item 4, FD-4) — classified from values the fit check
 * already holds, no new geometry:
 *
 * - `thinCenter`: the blank is so much thicker than the target centre that the parallel cut leaves
 *   too little foam somewhere. The wording every runs-out had before the other causes existed, and
 *   what a runs-out with no cause at all still reads as.
 * - `fineTune`: a negative 12" fine-tune — typed just now, or carried over from a Phase 11 board —
 *   took that spot under the floor when the board would have had enough foam there without it.
 * - `offBlank`: the station is past the end of the blank, where the blank reads 0 thick.
 * - `tipSetting`: that end's own tip is set under the floor — only an older saved board or a stored
 *   default can hold one now, since no control offers a thinner tip.
 * - `thinningStart` (Phase 14 D-05): a Thinning Starts point set by hand too close to the tip took
 *   that spot under the floor, when the tip setting itself is fine and the board would have had
 *   enough foam there on Automatic. Not a new way to fail — the floor already refused such a board;
 *   this only gives the refusal its true reason.
 */
export type RunsOutCause = "thinCenter" | "fineTune" | "offBlank" | "tipSetting" | "thinningStart";

/**
 * The worst place a board sits on (or pokes out of) its blank. `station` is measured from the
 * board's tail tip; `amount > 0` means it does not fit there by that much, `amount <= 0` is the
 * spare foam at the tightest place.
 *
 * `thin`: the board pokes out through the deck or the bottom, or leaves less than one bottom pass
 * under its centre. `wide`: it is too wide for the blank plus the width margin. `runsOut` (Phase 12
 * D-18): the board itself would be less than the floor thick there. `cause` is set by `fitAt` on
 * every `runsOut` worst (never on `thin` or `wide`) — see `RunsOutCause`.
 */
export interface BlankShortfall {
  kind: "thin" | "wide" | "runsOut";
  station: Mm;
  amount: Mm;
  cause?: RunsOutCause;
}

/** The fit verdict: whether the board fits, and its tightest (or failing) place either way. */
export interface FitResult {
  fits: boolean;
  worst: BlankShortfall;
}
