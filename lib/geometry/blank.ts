/**
 * Foam blank types (Phase 11) — the shapes a vendor's catalogue blank and a board's chosen blank
 * take everywhere in the app. Types only: the maths lives in `lib/geometry/blank-fit.ts`, the
 * catalogue reading in `lib/blanks/`.
 *
 * Every length is millimetres (CLAUDE.md Rule 2) — the catalogues print inches, and they are
 * converted once, at the units boundary, when the CSV is read.
 */
import type { Litres, Mm } from "./units";

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
 * A board's chosen blank (D-01): the board carries its blank's rows BY VALUE, so a later catalogue
 * correction can never silently move a saved board, plus where the board sits on it and the two
 * 12" fine-tunes.
 */
export interface BoardBlank {
  /** The blank's record exactly as it was when picked. */
  copy: BlankRecord;
  /** Board centre relative to the blank centre, positive toward the nose (D-08). */
  placement: Mm;
  /** Signed fine-tune added to the derived thickness at the nose 12" station (D-11). */
  nose12Offset: Mm;
  /** Signed fine-tune added to the derived thickness at the tail 12" station (D-11). */
  tail12Offset: Mm;
}

/** The shaper's fit settings (the third account preference, D-09). */
export interface FitSettings {
  /** How much longer than the board a blank must be to be listed. */
  extraLength: Mm;
  /** How much thicker than the target centre a blank's centre must be to be listed. */
  extraCenterThickness: Mm;
  /** How much narrower than the blank the board must be at every station (D-05; default 1"). */
  widthMargin: Mm;
}

/**
 * The worst place a board sits on (or pokes out of) its blank. `station` is measured from the
 * board's tail tip; `amount > 0` means it does not fit there by that much, `amount <= 0` is the
 * spare foam at the tightest place.
 */
export interface BlankShortfall {
  kind: "thin" | "wide";
  station: Mm;
  amount: Mm;
}

/** The fit verdict: whether the board fits, and its tightest (or failing) place either way. */
export interface FitResult {
  fits: boolean;
  worst: BlankShortfall;
}
