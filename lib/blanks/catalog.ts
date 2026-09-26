/**
 * Blank catalogue mapping: CSV rows (as `parseCsv` returns them) → `BlankRecord`s.
 *
 * The three vendor catalogues print inches; this is the one place those inches become the app's
 * millimetres, through `lib/geometry/units.ts` (CLAUDE.md Rule 2). Every cell is checked strictly:
 * the header must be exactly `BLANK_CSV_COLUMNS`, every row must have exactly that many fields, a
 * non-empty number cell must be a plain decimal number, and an EMPTY cell becomes `null` — never
 * 0, because a station the catalogue did not print is not a station at height or thickness zero
 * (R10). Flag text is kept verbatim.
 *
 * No React/browser/database import — the same mapping serves the seed script, the tests, the
 * browser-test fallback and the preset generator (see `seed-files.ts`).
 */
import { z } from "zod";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { inchesToMm, litres, type Mm } from "@/lib/geometry/units";

/** The catalogue CSV header, verbatim and in order — identical in all three files. */
export const BLANK_CSV_COLUMNS = [
  "vendor",
  "blank_name",
  "station",
  "station_in_from_tail",
  "rocker_in",
  "thickness_in",
  "width_in",
  "length_in",
  "deck_length_in",
  "volume_l",
  "catalog_slug",
  "pdf_page",
  "flag",
] as const;

type Column = (typeof BLANK_CSV_COLUMNS)[number];

const COLUMN_INDEX = Object.fromEntries(
  BLANK_CSV_COLUMNS.map((name, index) => [name, index]),
) as Record<Column, number>;

/** A plain decimal number as the catalogues write them: `72`, `0.0`, `-0.252`, `69.312`. */
const DECIMAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Maps one catalogue file's rows (header first) to blank records, grouped by vendor + blank name
 * in file order. `sourceName` names the file in every error, with the 1-based line and column.
 */
export function rowsToBlankRecords(rows: string[][], sourceName: string): BlankRecord[] {
  if (rows.length === 0) throw new Error(`${sourceName}: the file is empty (no header)`);
  const header = rows[0];
  if (
    header.length !== BLANK_CSV_COLUMNS.length ||
    header.some((name, index) => name !== BLANK_CSV_COLUMNS[index])
  ) {
    throw new Error(
      `${sourceName} line 1: the header is not the blank catalogue header (${BLANK_CSV_COLUMNS.join(",")})`,
    );
  }

  const blanks = new Map<string, BlankRecord>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const line = r + 1;
    if (row.length !== BLANK_CSV_COLUMNS.length) {
      throw new Error(
        `${sourceName} line ${line}: expected ${BLANK_CSV_COLUMNS.length} fields, found ${row.length}`,
      );
    }
    const cell = (column: Column) => row[COLUMN_INDEX[column]];
    const number = (column: Column): number | null => {
      const text = cell(column);
      if (text === "") return null;
      if (!DECIMAL.test(text) || !Number.isFinite(Number(text))) {
        throw new Error(`${sourceName} line ${line} column ${column}: "${text}" is not a number`);
      }
      return Number(text);
    };
    const required = (column: Column): number => {
      const value = number(column);
      if (value === null) {
        throw new Error(`${sourceName} line ${line} column ${column}: this cell must not be empty`);
      }
      return value;
    };
    const inches = (column: Column): Mm | null => {
      const value = number(column);
      return value === null ? null : inchesToMm(value);
    };
    const text = (column: Column): string => {
      const value = cell(column);
      if (value === "") {
        throw new Error(`${sourceName} line ${line} column ${column}: this cell must not be empty`);
      }
      return value;
    };

    const vendor = text("vendor");
    const name = text("blank_name");
    const key = `${vendor}\u0000${name}`;
    let blank = blanks.get(key);
    if (!blank) {
      const volume = number("volume_l");
      const pdfPage = required("pdf_page");
      if (!Number.isInteger(pdfPage)) {
        throw new Error(`${sourceName} line ${line} column pdf_page: "${cell("pdf_page")}" is not a page number`);
      }
      blank = {
        vendor,
        name,
        catalogSlug: text("catalog_slug"),
        pdfPage,
        lengthMm: inchesToMm(required("length_in")),
        deckLengthMm: inches("deck_length_in"),
        volumeLitres: volume === null ? null : litres(volume),
        stations: [],
      };
      blanks.set(key, blank);
    }

    const station: BlankStation = {
      label: text("station"),
      fromTailMm: inchesToMm(required("station_in_from_tail")),
      rockerMm: inches("rocker_in"),
      thicknessMm: inches("thickness_in"),
      widthMm: inches("width_in"),
      flag: cell("flag") === "" ? null : cell("flag"),
    };
    blank.stations.push(station);
  }

  return [...blanks.values()];
}

/**
 * A blank can be picked for a board only if the maths has what it needs: a thickness at its
 * centre station (labelled `C` — the scale ratio needs a centre) and at its first and last
 * stations (so the scaled foil spans the whole blank without extrapolating), plus at least two
 * rocker and two width values to draw a curve through. A rule, not a list of names (R9): on the
 * seeded catalogues it leaves out exactly four stand-up paddleboard blanks whose printed pages
 * are missing those thicknesses.
 */
export function isPickable(record: BlankRecord): boolean {
  const { stations } = record;
  if (stations.length < 2) return false;
  const centre = stations.find((station) => station.label === "C");
  if (!centre || centre.thicknessMm === null) return false;
  if (stations[0].thicknessMm === null || stations[stations.length - 1].thicknessMm === null) {
    return false;
  }
  const count = (pick: (station: BlankStation) => Mm | null) =>
    stations.filter((station) => pick(station) !== null).length;
  return count((station) => station.rockerMm) >= 2 && count((station) => station.widthMm) >= 2;
}

/* -- the one shape rule for an untrusted blank (WR-04) --------------------------------------- */

/** A blank's longest identity string (vendor, name, catalogue slug). The longest in the seeded
 * catalogues is well under half this. */
const BLANK_TEXT_MAX = 120;
/** A catalogue flag's longest text. The longest seeded flag is 262 characters. */
const BLANK_FLAG_MAX = 400;
/** A blank's most stations. The seeded catalogues print 5 to 15. */
const BLANK_STATIONS_MAX = 32;
/** A station label's longest text (`T12`, `N0`, `C`, …). */
const BLANK_LABEL_MAX = 16;
/** The longest blank (and the furthest station from its tail) the parser accepts, in mm (~16'5"). */
const BLANK_LENGTH_MAX_MM = 5000;
/** The widest range a station's rocker, thickness or width may take, in mm either side of zero. */
const BLANK_VALUE_MAX_MM = 1000;
const blankValueSchema = z.number().min(-BLANK_VALUE_MAX_MM).max(BLANK_VALUE_MAX_MM).nullable();

/** One catalogue station, bounded. An empty catalogue cell is `null`, never 0 (R10). */
const blankStationSchema = z.object({
  label: z.string().max(BLANK_LABEL_MAX),
  fromTailMm: z.number().min(0).max(BLANK_LENGTH_MAX_MM),
  rockerMm: blankValueSchema,
  thicknessMm: blankValueSchema,
  widthMm: blankValueSchema,
  flag: z.string().max(BLANK_FLAG_MAX).nullable(),
});

/** A catalogue blank record, bounded, whose stations run strictly tail to nose — the blank's
 * curves are fitted through them in that order and could not be drawn otherwise (pchip throws on a
 * repeated or backward station). The ONE shape rule for a blank from anywhere untrusted: a saved
 * board's copy (`lib/models/design-snapshot.ts` adds `isPickable` on top) and every row the
 * catalogue read hands the ROCKER page (`lib/db/blanks.ts`, through `isWellFormedBlankRecord`). */
export const blankRecordShapeSchema = z
  .object({
    vendor: z.string().max(BLANK_TEXT_MAX),
    name: z.string().max(BLANK_TEXT_MAX),
    catalogSlug: z.string().max(BLANK_TEXT_MAX),
    pdfPage: z.number().int().min(0).max(10000),
    lengthMm: z.number().gt(0).max(BLANK_LENGTH_MAX_MM),
    deckLengthMm: z.number().min(0).max(BLANK_LENGTH_MAX_MM).nullable(),
    volumeLitres: z.number().min(0).max(1000).nullable(),
    stations: z.array(blankStationSchema).min(2).max(BLANK_STATIONS_MAX),
  })
  .refine(
    (record) =>
      record.stations.every((station, i) => i === 0 || station.fromTailMm > record.stations[i - 1].fromTailMm),
    { message: "a blank's stations must run strictly from tail to nose" },
  );

/**
 * True when `value` is a blank record the blank maths can safely fit: every field the right kind,
 * finite and inside its bounds, and its stations strictly tail to nose. Says nothing about whether
 * the blank is pickable — the catalogue read applies `isPickable` itself, separately, because a
 * well-formed blank nobody can pick (a SUP blank) is not a broken row.
 */
export function isWellFormedBlankRecord(value: unknown): value is BlankRecord {
  return blankRecordShapeSchema.safeParse(value).success;
}
