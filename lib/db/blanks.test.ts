import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  blankRecordToRow,
  blankRowToRecord,
  loadPickableBlanks,
  type BlankReadRow,
} from "./blanks";

/**
 * The blank catalogue's database boundary (11-05). Every expected count and every expected blank
 * comes from the committed CSVs through the tested reader (`readSeedCatalog`) — never typed in
 * (RESEARCH Pitfall 12) — so a catalogue correction moves these expectations with it.
 */

const catalog = readSeedCatalog();
const pickable = catalog.filter(isPickable);

/** What jsonb and float8 hand back: the row after one trip through JSON text. */
function throughJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A stored row as the database returns it — the insert shape through JSON. */
function storedRow(record: BlankRecord): BlankReadRow {
  return throughJson(blankRecordToRow(record)) as BlankReadRow;
}

describe("blankRecordToRow / blankRowToRecord", () => {
  it("round-trips every seeded blank unchanged, through JSON as jsonb stores it", () => {
    const mismatches = catalog.filter(
      (record) => JSON.stringify(blankRowToRecord(storedRow(record))) !== JSON.stringify(record),
    );
    expect(mismatches.map((record) => `${record.vendor} ${record.name}`)).toEqual([]);
    for (const record of catalog) {
      expect(blankRowToRecord(storedRow(record))).toEqual(record);
    }
  });

  it("round-trips a 5-station blank and a 15-station blank station for station", () => {
    const counts = catalog.map((record) => record.stations.length);
    const five = catalog.find((record) => record.stations.length === Math.min(...counts));
    const fifteen = catalog.find((record) => record.stations.length === Math.max(...counts));
    expect(five?.stations.length).toBe(5);
    expect(fifteen?.stations.length).toBe(15);
    for (const record of [five!, fifteen!]) {
      const back = blankRowToRecord(storedRow(record));
      expect(back).toEqual(record);
      expect(back.stations.map((station) => station.label)).toEqual(
        record.stations.map((station) => station.label),
      );
    }
  });

  it("keeps an empty catalogue cell as null, never 0", () => {
    const withGap = catalog.find((record) =>
      record.stations.some((station) => station.thicknessMm === null || station.widthMm === null),
    );
    expect(withGap).toBeDefined();
    const row = storedRow(withGap!);
    const back = blankRowToRecord(row);
    withGap!.stations.forEach((station, index) => {
      expect(row.stations[index].thicknessMm).toBe(station.thicknessMm);
      expect(row.stations[index].widthMm).toBe(station.widthMm);
      expect(back.stations[index].thicknessMm).toBe(station.thicknessMm);
      expect(back.stations[index].widthMm).toBe(station.widthMm);
    });
  });

  it("writes only the catalogue's own columns — no id, no timestamps, no station columns", () => {
    expect(Object.keys(blankRecordToRow(catalog[0])).sort()).toEqual(
      [
        "catalogSlug",
        "deckLengthMm",
        "lengthMm",
        "name",
        "pdfPage",
        "stations",
        "vendor",
        "volumeLitres",
      ].sort(),
    );
  });
});

describe("loadPickableBlanks", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reads the committed CSVs when the browser-test source is switched on", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "seed-csv");
    const result = await loadPickableBlanks();
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.blanks.length).toBe(pickable.length);
    expect(result.blanks.length).toBeLessThan(catalog.length);
    expect(result.blanks.every(isPickable)).toBe(true);
    expect(result.blanks).toEqual(pickable);
  });

  it("returns only the pickable blanks from the rows it reads", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    const rows = catalog.map(storedRow);
    const result = await loadPickableBlanks({ readRows: async () => rows });
    expect(result).toEqual({ status: "ok", blanks: pickable });
  });

  it("is unavailable when the table is empty (migrated but not yet seeded)", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    await expect(loadPickableBlanks({ readRows: async () => [] })).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("is unavailable, never a rejection, when the read fails", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    const result = await loadPickableBlanks({
      readRows: async () => {
        throw new Error('relation "blanks" does not exist');
      },
    });
    expect(result).toEqual({ status: "unavailable" });
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("drops a row whose stations are not station-shaped, and keeps the good ones", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    const good = storedRow(pickable[0]);
    const station = good.stations[0];
    const broken: unknown[] = [
      { ...good, name: "not a list", stations: "T0,C,N0" },
      { ...good, name: "text number", stations: [{ ...station, thicknessMm: "12.7" }] },
      { ...good, name: "text distance", stations: [{ ...station, fromTailMm: "900" }] },
      { ...good, name: "text length", lengthMm: "1828.8" },
      { ...good, name: "fractional page", pdfPage: 1.5 },
      { ...good, name: "no label", stations: [{ ...station, label: 7 }] },
      { ...good, name: "missing field", stations: [{ label: "C", fromTailMm: 900 }] },
      { ...good, name: "not finite", stations: [{ ...station, rockerMm: Number.POSITIVE_INFINITY }] },
      { ...good, name: "a null station", stations: [null] },
      null,
    ];
    const result = await loadPickableBlanks({
      readRows: async () => [...broken, good] as BlankReadRow[],
    });
    expect(result).toEqual({ status: "ok", blanks: [pickable[0]] });
  });

  it("is unavailable when every row is malformed", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    const good = storedRow(pickable[0]);
    const result = await loadPickableBlanks({
      readRows: async () => [{ ...good, stations: {} }] as unknown as BlankReadRow[],
    });
    expect(result).toEqual({ status: "unavailable" });
  });

  it("is unavailable when every row it reads is a blank nobody can pick", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    const unpickable = catalog.filter((record) => !isPickable(record));
    expect(unpickable.length).toBeGreaterThan(0);
    const result = await loadPickableBlanks({ readRows: async () => unpickable.map(storedRow) });
    expect(result).toEqual({ status: "unavailable" });
  });

  it("is unavailable, not a crash, with no database connection configured", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "");
    vi.stubEnv("DATABASE_URL", undefined);
    await expect(loadPickableBlanks()).resolves.toEqual({ status: "unavailable" });
  });
});
