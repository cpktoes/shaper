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
