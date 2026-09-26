import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { mmToInches, type Mm } from "@/lib/geometry/units";
import { BLANK_CSV_COLUMNS, isPickable, rowsToBlankRecords } from "./catalog";
import { parseCsv } from "./csv";
import { readSeedCatalog, SEED_CSV_DIR, SEED_CSV_FILES } from "./seed-files";

// Every expectation below is the catalogue's own text, read from the committed CSVs — never a
// number typed into this file. The only literals are the counts R7 names in the spec.

type Column = (typeof BLANK_CSV_COLUMNS)[number];
const col = (c: Column) => BLANK_CSV_COLUMNS.indexOf(c);

const RAW = SEED_CSV_FILES.map((file) => ({
  file,
  rows: parseCsv(readFileSync(join(SEED_CSV_DIR, file), "utf8")),
}));
const CATALOG = readSeedCatalog();

/** Every CSV data row beside the station it became, walked in file order. */
function pairedRows(): { file: string; line: number; row: string[]; blank: BlankRecord; station: BlankStation }[] {
  const out: ReturnType<typeof pairedRows> = [];
  for (const { file, rows } of RAW) {
    const records = rowsToBlankRecords(rows, file);
    const next = new Map<BlankRecord, number>();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const blank = records.find((b) => b.vendor === row[col("vendor")] && b.name === row[col("blank_name")])!;
      const index = next.get(blank) ?? 0;
      next.set(blank, index + 1);
      out.push({ file, line: r + 1, row, blank, station: blank.stations[index] });
    }
  }
  return out;
}
const PAIRS = pairedRows();
/** The blanks PAIRS points at, in file order — the same objects, so `p.blank === blank` works. */
const PAIRED_BLANKS = [...new Set(PAIRS.map((p) => p.blank))];

/** The CSV's figure, compared at the CSV's own precision (Pitfall 2: never toBe on raw mm→in). */
function expectInchesMatch(value: Mm | null, cell: string, where: string) {
  if (cell === "") {
    expect(value, where).toBeNull();
    return;
  }
  expect(value, where).not.toBeNull();
  expect(Number(mmToInches(value as Mm).toFixed(4)), where).toBe(Number(cell));
}

describe("the three seeded catalogues (R7)", () => {
  it("reads 101 US Blanks, 33 Arctic Foam and 28 Marko Foam blanks — 162 in all", () => {
    const count = (vendor: string) => CATALOG.filter((b) => b.vendor === vendor).length;
    expect(count("US Blanks")).toBe(101);
    expect(count("Arctic Foam")).toBe(33);
    expect(count("Marko Foam")).toBe(28);
    expect(CATALOG).toHaveLength(162);
  });

  it("makes one blank per distinct vendor + name in the files, and one station per row", () => {
    const names = new Set<string>();
    let rowCount = 0;
    for (const { rows } of RAW) {
      for (const row of rows.slice(1)) names.add(`${row[col("vendor")]}|${row[col("blank_name")]}`);
      rowCount += rows.length - 1;
    }
    expect(CATALOG).toHaveLength(names.size);
    expect(CATALOG.reduce((n, b) => n + b.stations.length, 0)).toBe(rowCount);
  });

  it("converts every station value back to its CSV figure at the CSV's own precision", () => {
    for (const { file, line, row, station } of PAIRS) {
      const where = `${file} line ${line}`;
      expect(station.label, where).toBe(row[col("station")]);
      expectInchesMatch(station.fromTailMm, row[col("station_in_from_tail")], where);
      expectInchesMatch(station.rockerMm, row[col("rocker_in")], where);
      expectInchesMatch(station.thicknessMm, row[col("thickness_in")], where);
      expectInchesMatch(station.widthMm, row[col("width_in")], where);
    }
  });

  it("takes each blank's length, deck length, volume, slug and page from its rows", () => {
    for (const { file, line, row, blank } of PAIRS) {
      const where = `${file} line ${line}`;
      expectInchesMatch(blank.lengthMm, row[col("length_in")], where);
      expectInchesMatch(blank.deckLengthMm, row[col("deck_length_in")], where);
      const volume = row[col("volume_l")];
      if (volume === "") expect(blank.volumeLitres, where).toBeNull();
      else expect(blank.volumeLitres, where).toBe(Number(volume));
      expect(blank.catalogSlug, where).toBe(row[col("catalog_slug")]);
      expect(blank.pdfPage, where).toBe(Number(row[col("pdf_page")]));
    }
  });
});

describe("empty cells and flags (R8, R9, edge coverage)", () => {
  it("stores an empty cell as null, never 0 — Arctic Foam 7'8\" E's N3 row is width-only", () => {
    const pair = PAIRS.find(
      (p) => p.blank.vendor === "Arctic Foam" && p.blank.name === `7'8" E` && p.station.label === "N3",
    )!;
    expect(pair.row[col("rocker_in")]).toBe("");
    expect(pair.row[col("thickness_in")]).toBe("");
    expect(pair.station.rockerMm).toBeNull();
    expect(pair.station.thicknessMm).toBeNull();
    expectInchesMatch(pair.station.widthMm, pair.row[col("width_in")], "7'8\" E N3");
    // And across the whole catalogue: an empty cell is null, a printed cell is a number.
    for (const { row, station } of PAIRS) {
      expect(station.rockerMm === null).toBe(row[col("rocker_in")] === "");
      expect(station.thicknessMm === null).toBe(row[col("thickness_in")] === "");
      expect(station.widthMm === null).toBe(row[col("width_in")] === "");
    }
  });

  it("keeps every non-empty flag verbatim, curly quotes and commas included", () => {
    let withComma = 0;
    for (const { row, station } of PAIRS) {
      const flag = row[col("flag")];
      expect(station.flag).toBe(flag === "" ? null : flag);
      if (flag.includes(",")) withComma++;
    }
    expect(withComma).toBeGreaterThan(0);
  });

  it("loads the 11 literal rocker 0 rows flagged not printed as the number 0, not null", () => {
    const literalZeros = PAIRS.filter(
      (p) => p.row[col("flag")].includes("not printed") && p.row[col("rocker_in")] !== "" && Number(p.row[col("rocker_in")]) === 0,
    );
    expect(literalZeros).toHaveLength(11);
    for (const { station, row } of literalZeros) {
      expect(station.rockerMm).toBe(0);
      expect(station.flag).toBe(row[col("flag")]);
    }
  });

  it("gives a 5-station and a 15-station blank exactly 5 and 15 stations", () => {
    for (const size of [5, 15]) {
      const blank = PAIRED_BLANKS.find((b) => PAIRS.filter((p) => p.blank === b).length === size);
      expect(blank, `a ${size}-station blank`).toBeDefined();
      expect(blank!.stations).toHaveLength(size);
      // No station-numbered fields on the record: stations is the only per-station data.
      expect(Object.keys(blank!).sort()).toEqual(
        ["catalogSlug", "deckLengthMm", "lengthMm", "name", "pdfPage", "stations", "vendor", "volumeLitres"],
      );
    }
  });

  it("leaves volume and deck length null on every Marko blank and exactly where US Blanks leaves them empty", () => {
    for (const blank of PAIRED_BLANKS.filter((b) => b.vendor === "Marko Foam")) {
      expect(blank.volumeLitres).toBeNull();
      expect(blank.deckLengthMm).toBeNull();
    }
    const usWithoutVolume = PAIRED_BLANKS.filter((b) => b.vendor === "US Blanks" && b.volumeLitres === null);
    expect(usWithoutVolume.length).toBeGreaterThan(0);
    for (const blank of usWithoutVolume) {
      const first = PAIRS.find((p) => p.blank === blank)!;
      expect(first.row[col("volume_l")]).toBe("");
    }
  });
});

describe("isPickable (R9 — a rule, not a list of names)", () => {
  it("picks 158 blanks and leaves out exactly four, every one a Marko MK-SUP-STD", () => {
    const left = CATALOG.filter((b) => !isPickable(b));
    expect(CATALOG.filter(isPickable)).toHaveLength(158);
    expect(left).toHaveLength(4);
    for (const blank of left) {
      expect(blank.vendor).toBe("Marko Foam");
      expect(blank.name).toContain("MK-SUP-STD");
    }
  });

  it("keeps the shortest MK-SUP-STD (the 8'0\") pickable", () => {
    const sups = CATALOG.filter((b) => b.name.includes("MK-SUP-STD")).sort((a, b) => a.lengthMm - b.lengthMm);
    expect(sups.length).toBeGreaterThan(4);
    expect(sups[0].name.startsWith(`8'0"`)).toBe(true);
    expect(isPickable(sups[0])).toBe(true);
  });

  it("says why: each left-out blank is missing a thickness at C, its first or its last station", () => {
    for (const blank of CATALOG.filter((b) => !isPickable(b))) {
      const first = blank.stations[0];
      const last = blank.stations[blank.stations.length - 1];
      const centre = blank.stations.find((s) => s.label === "C");
      expect([centre?.thicknessMm ?? null, first.thicknessMm, last.thicknessMm]).toContain(null);
    }
  });
});

describe("rowsToBlankRecords rejects a malformed file (threat T-11-01)", () => {
  const header = [...BLANK_CSV_COLUMNS];
  const good = RAW[2].rows[1];

  it("throws on the wrong header, naming the file", () => {
    expect(() => rowsToBlankRecords([header.slice(1), good], "bad.csv")).toThrow(/bad\.csv line 1/);
  });

  it("throws on a short row, naming the file and line", () => {
    expect(() => rowsToBlankRecords([header, good, good.slice(0, 12)], "short.csv")).toThrow(/short\.csv line 3/);
  });

  it("throws on a cell that is not a plain number, naming the file, line and column", () => {
    const bad = [...good];
    bad[col("rocker_in")] = "1.2in";
    expect(() => rowsToBlankRecords([header, bad], "x.csv")).toThrow(/x\.csv line 2 column rocker_in/);
    bad[col("rocker_in")] = "0x10";
    expect(() => rowsToBlankRecords([header, bad], "x.csv")).toThrow(/column rocker_in/);
  });

  it("throws on an empty station position or length", () => {
    const bad = [...good];
    bad[col("station_in_from_tail")] = "";
    expect(() => rowsToBlankRecords([header, bad], "x.csv")).toThrow(/station_in_from_tail/);
  });
});
