/**
 * The blank catalogue read — the ONE public, owner-less, read-only database query in the app.
 *
 * Every statement in `lib/db/queries.ts` must scope by the owning shaper (`lib/db/ownership.test.ts`,
 * "every Drizzle statement touching an owned table constrains on the owning-user column"). The
 * vendor catalogues belong to nobody, so this read lives in its own file instead, and the ownership
 * test holds it to a stricter contract of its own: it only ever SELECTs, only from `blanks`, and
 * takes no shaper identity at all.
 *
 * `loadPickableBlanks` never rejects. The ROCKER page calls it without awaiting (it streams the
 * list), and the deployed code goes live before the founder migrates and seeds production (11-13),
 * so a missing table, a failed read, a missing connection string and an EMPTY table (the window
 * between the production migration and the production seed) all resolve to
 * `{ status: "unavailable" }` — the screen then says "The blank catalog didn't load" (UI-SPEC E4),
 * and a board that already has a blank keeps working from its own copy (D-01). Reporting an empty
 * table as "ok, no blanks" would show "No blank is long enough" instead, which would be false.
 *
 * Browser tests have no database (RESEARCH Pitfall 3): `playwright.config.ts` sets
 * `SHAPER_BLANKS_SOURCE=seed-csv` for its own dev server, and this file then reads the committed
 * CSVs through the same tested reader the seed uses. That variable is never set anywhere else.
 */

import path from "node:path";
import { isPickable, isWellFormedBlankRecord } from "@/lib/blanks/catalog";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { litres, mm, type Mm } from "@/lib/geometry/units";
import { blanks, type BlankRow } from "./schema";

/** What the ROCKER page receives: every pickable blank, or word that the catalogue didn't load. */
export type BlankCatalogResult = { status: "ok"; blanks: BlankRecord[] } | { status: "unavailable" };

/** The columns the read selects — a stored blank without its id and timestamps. */
export type BlankReadRow = Omit<BlankRow, "id" | "createdAt" | "updatedAt">;

/** The insert shape the seed writes: the catalogue's own columns, raw stations only (R8). */
export type BlankInsertRow = BlankReadRow;

const UNAVAILABLE: BlankCatalogResult = { status: "unavailable" };

/**
 * A catalogue record as a table row. Nothing is computed or interpolated: the stations go in
 * exactly as the reader produced them, `null` for every empty cell (never 0).
 */
export function blankRecordToRow(record: BlankRecord): BlankInsertRow {
  return {
    vendor: record.vendor,
    name: record.name,
    lengthMm: record.lengthMm,
    deckLengthMm: record.deckLengthMm,
    volumeLitres: record.volumeLitres,
    catalogSlug: record.catalogSlug,
    pdfPage: record.pdfPage,
    stations: record.stations.map((station) => ({ ...station })),
  };
}

const optionalMm = (value: number | null): Mm | null => (value === null ? null : mm(value));

/** A stored row back as a catalogue record, lengths re-branded as millimetres and litres. */
export function blankRowToRecord(row: BlankReadRow): BlankRecord {
  return {
    vendor: row.vendor,
    name: row.name,
    catalogSlug: row.catalogSlug,
    pdfPage: row.pdfPage,
    lengthMm: mm(row.lengthMm),
    deckLengthMm: optionalMm(row.deckLengthMm),
    volumeLitres: row.volumeLitres === null ? null : litres(row.volumeLitres),
    stations: row.stations.map(
      (station): BlankStation => ({
        label: station.label,
        fromTailMm: mm(station.fromTailMm),
        rockerMm: optionalMm(station.rockerMm),
        thicknessMm: optionalMm(station.thicknessMm),
        widthMm: optionalMm(station.widthMm),
        flag: station.flag,
      }),
    ),
  };
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isFiniteOrNull = (value: unknown) => value === null || isFiniteNumber(value);
const isTextOrNull = (value: unknown) => value === null || typeof value === "string";

function isStation(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const station = value as Record<string, unknown>;
  return (
    typeof station.label === "string" &&
    isFiniteNumber(station.fromTailMm) &&
    isFiniteOrNull(station.rockerMm) &&
    isFiniteOrNull(station.thicknessMm) &&
    isFiniteOrNull(station.widthMm) &&
    isTextOrNull(station.flag)
  );
}

/**
 * A stored row the maths can safely read: every column the right kind, `stations` a list of
 * station-shaped objects with finite-or-null numbers, AND the same shape rule a saved board's own
 * copy of a blank is held to (`isWellFormedBlankRecord` in `lib/blanks/catalog.ts`, which the saved-
 * board parser builds on, so the two untrusted-input boundaries can't drift apart) — bounded, and stations strictly from
 * tail to nose, because the blank's curves can't be fitted through a repeated or backward station.
 * The `stations` column is jsonb, so the database itself promises nothing about its contents — a
 * row that fails is dropped, with a server-side warning naming it, never shown (WR-04).
 */
function isUsableRow(value: unknown): value is BlankReadRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.vendor === "string" &&
    typeof row.name === "string" &&
    typeof row.catalogSlug === "string" &&
    Number.isInteger(row.pdfPage) &&
    isFiniteNumber(row.lengthMm) &&
    isFiniteOrNull(row.deckLengthMm) &&
    isFiniteOrNull(row.volumeLitres) &&
    Array.isArray(row.stations) &&
    row.stations.every(isStation) &&
    isWellFormedBlankRecord(row)
  );
}

/** The blank's own name for the warning, as far as the row lets us read one. */
function describeRow(value: unknown): string {
  if (typeof value !== "object" || value === null) return "an unreadable row";
  const row = value as Record<string, unknown>;
  const vendor = typeof row.vendor === "string" ? row.vendor : "an unknown vendor";
  const name = typeof row.name === "string" ? row.name : "an unnamed blank";
  return `${vendor} ${name}`;
}

/** The rows that pass `isUsableRow`, as records; each one dropped is named in a server-side warning. */
function usableRecords(rows: readonly unknown[]): BlankRecord[] {
  const records: BlankRecord[] = [];
  for (const row of rows) {
    if (isUsableRow(row)) records.push(blankRowToRecord(row));
    else console.warn(`Shaper: dropped a blank catalogue row that can't be drawn: ${describeRow(row)}`);
  }
  return records;
}

/** Every stored blank, every column named — at most one row per catalogue blank. */
async function readBlankRows(): Promise<BlankReadRow[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("no database connection string is configured");
  }
  // Imported here, not at the top: the client reads DATABASE_URL the moment it loads, and the
  // browser-test path above must never touch it.
  const { db } = await import("./client");
  return db
    .select({
      vendor: blanks.vendor,
      name: blanks.name,
      lengthMm: blanks.lengthMm,
      deckLengthMm: blanks.deckLengthMm,
      volumeLitres: blanks.volumeLitres,
      catalogSlug: blanks.catalogSlug,
      pdfPage: blanks.pdfPage,
      stations: blanks.stations,
    })
    .from(blanks);
}

/**
 * Every blank a shaper can pick (the SUP rule from `isPickable`, applied here at read time so no
 * stored flag can drift from it). Never rejects — see the file header.
 */
export async function loadPickableBlanks(
  options: { readRows?: () => Promise<BlankReadRow[]> } = {},
): Promise<BlankCatalogResult> {
  try {
    let records: BlankRecord[];
    if (process.env.SHAPER_BLANKS_SOURCE === "seed-csv") {
      // Browser tests only. Imported lazily so Node's `fs` stays out of every other path, and
      // given its directory from the working directory: inside the Next server bundle
      // `import.meta.url` points at the built chunk, not the source file.
      const { readSeedCatalog } = await import("@/lib/blanks/seed-files");
      records = usableRecords(readSeedCatalog(path.join(process.cwd(), "db", "seed", "blanks")));
    } else {
      const rows: unknown[] = await (options.readRows ?? readBlankRows)();
      records = usableRecords(rows);
    }
    const pickable = records.filter(isPickable);
    // No usable blank at all is a catalogue that didn't load, not "no blank is long enough".
    if (pickable.length === 0) return UNAVAILABLE;
    return { status: "ok", blanks: pickable };
  } catch (error) {
    console.error("Shaper: failed to load the blank catalog", error);
    return UNAVAILABLE;
  }
}
