import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLANK_CSV_COLUMNS } from "@/lib/blanks/catalog";
import { parseCsv } from "@/lib/blanks/csv";
import { readSeedCatalog, SEED_CSV_DIR } from "@/lib/blanks/seed-files";
import type { BlankRecord } from "./blank";
import { boardOnBlank, prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import { rockerStationPositions } from "./rocker";
import { mm, mmToInches } from "./units";

// Every catalogue figure below is read from the committed CSVs — through the tested reader, or as
// the raw cell text parsed here — never typed into this file (CLAUDE.md Rule 1).
const CATALOG = readSeedCatalog();

const MARKO_FILE = "marko_foam_stations.csv";
const MARKO_VENDOR = "Marko Foam";
const M_REGULAR = `6'0" M-Regular`;

function findBlank(vendor: string, name: string): BlankRecord {
  const blank = CATALOG.find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not in the seeded catalogue`);
  return blank;
}

/** A catalogue cell exactly as the CSV prints it, parsed as a number. */
function csvNumber(file: string, vendor: string, name: string, label: string, column: string): number {
  const rows = parseCsv(readFileSync(join(SEED_CSV_DIR, file), "utf8"));
  const col = (c: string) => BLANK_CSV_COLUMNS.indexOf(c as (typeof BLANK_CSV_COLUMNS)[number]);
  const row = rows.find(
    (r) => r[col("vendor")] === vendor && r[col("blank_name")] === name && r[col("station")] === label,
  );
  if (!row) throw new Error(`${vendor} ${name} has no ${label} row in ${file}`);
  const text = row[col(column)];
  if (text === "") throw new Error(`${vendor} ${name} ${label} has an empty ${column}`);
  return Number(text);
}

/** A board with no tip or fine-tune influence — only the rocker is read in test (a). */
function plainBoard(blank: BlankRecord): BoardOnBlankInput {
  const centre = blank.stations.find((s) => s.label === "C")!.thicknessMm!;
  return {
    length: blank.lengthMm,
    centerThickness: centre,
    noseTip: mm(0),
    tailTip: mm(0),
    nose12Offset: mm(0),
    tail12Offset: mm(0),
  };
}

describe("the brief's four named tests (R16)", () => {
  it(`reproduces the catalogue rocker at the tips and 12" stations for a board exactly as long as Marko 6'0" M-Regular at placement 0`, () => {
    const blank = findBlank(MARKO_VENDOR, M_REGULAR);
    const onBlank = boardOnBlank(prepareBlank(blank), plainBoard(blank), mm(0));
    const labels = { tailTip: "T0", tail12: "T12", nose12: "N12", noseTip: "N0" } as const;
    for (const { key, station } of rockerStationPositions(blank.lengthMm)) {
      if (key === "center") continue;
      const expected = csvNumber(MARKO_FILE, MARKO_VENDOR, M_REGULAR, labels[key], "rocker_in");
      expect(mmToInches(mm(onBlank.rockerAt(station)))).toBeCloseTo(expected, 9);
    }
  });
});
