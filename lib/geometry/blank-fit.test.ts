import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLANK_CSV_COLUMNS, isPickable } from "@/lib/blanks/catalog";
import { parseCsv } from "@/lib/blanks/csv";
import { readSeedCatalog, SEED_CSV_DIR } from "@/lib/blanks/seed-files";
import type { BlankRecord, BlankStation } from "./blank";
import {
  blankStationOf,
  boardOnBlank,
  levelCurve,
  prepareBlank,
  type BoardOnBlankInput,
} from "./blank-fit";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { preparePchip } from "./pchip";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm, mmToInches } from "./units";

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

  it("pchip never overshoots between two stations on any seeded blank", () => {
    const attributes = [
      (s: BlankStation) => s.rockerMm,
      (s: BlankStation) => s.thicknessMm,
      (s: BlankStation) => s.widthMm,
    ];
    let intervals = 0;
    let outside = 0;
    for (const blank of CATALOG) {
      for (const pick of attributes) {
        // Each attribute over its OWN stations: an empty cell is not a knot (R10).
        const knots = blank.stations
          .filter((s) => pick(s) !== null)
          .map((s) => ({ x: s.fromTailMm as number, y: pick(s) as number }));
        if (knots.length < 2) continue;
        const curve = preparePchip(knots);
        for (let k = 0; k < knots.length - 1; k++) {
          intervals++;
          const [a, b] = [knots[k], knots[k + 1]];
          const lo = Math.min(a.y, b.y) - 1e-9;
          const hi = Math.max(a.y, b.y) + 1e-9;
          for (let i = 0; i <= 200; i++) {
            const y = curve.sample(a.x + ((b.x - a.x) * i) / 200);
            if (y < lo || y > hi) outside++;
          }
        }
      }
    }
    expect(intervals).toBeGreaterThan(CATALOG.length * 3);
    expect(outside).toBe(0);
  });

  it("levelling puts the curve's minimum at exactly 0", () => {
    // 1. Every seeded blank, pickable or not: the whole-blank minimum of the levelled rocker —
    //    its two ends and every knot, which is exact because pchip is monotone between knots —
    //    is exactly 0.
    for (const blank of CATALOG) {
      const knots = blank.stations
        .filter((s) => s.rockerMm !== null)
        .map((s) => ({ x: s.fromTailMm as number, y: s.rockerMm as number }));
      const levelled = levelCurve(preparePchip(knots), 0, blank.lengthMm);
      const lowest = Math.min(
        levelled.sample(0),
        levelled.sample(blank.lengthMm),
        ...knots.map((k) => levelled.sample(k.x)),
      );
      expect(lowest, `${blank.vendor} ${blank.name}`).toBe(0);
    }

    // 2. The four blanks whose printed rocker never reaches 0 (a datum drift in the catalogue):
    //    their lowest printed rocker, read from the CSV, is not 0 — and after levelling it is.
    const datumBlanks = [
      `Wakesurf Regular`,
      `5'3" Foil`,
      `10'2" M`,
      `10'2" M Thick`,
    ].map((name) => findBlank(MARKO_VENDOR, name));
    for (const blank of datumBlanks) {
      const printed = blank.stations
        .filter((s) => s.rockerMm !== null)
        .map((s) => csvNumber(MARKO_FILE, MARKO_VENDOR, blank.name, s.label, "rocker_in"));
      const lowestPrinted = Math.min(...printed);
      expect(lowestPrinted, blank.name).not.toBe(0);
      const prepared = prepareBlank(blank);
      expect(mmToInches(mm(prepared.rocker.minimum))).toBeCloseTo(lowestPrinted, 9);
      const lowest = Math.min(...blank.stations.map((s) => prepared.rocker.sample(s.fromTailMm)));
      expect(lowest, blank.name).toBe(0);
    }

    // 3. An off-centre crop re-levels to its own low point. A board 6" shorter than each blank
    //    at its most nose-ward placement, and the shortest board the app allows at both ends of
    //    its range (which is what actually moves the low point off the blank's own), each read
    //    rocker ≥ 0 under the whole board with a minimum of 0.
    const buffer = inchesToMm(0.5);
    let reLevelled = 0;
    for (const blank of CATALOG.filter(isPickable)) {
      const prepared = prepareBlank(blank);
      const cases: { length: number; placement: number }[] = [];
      const sixShorter = blank.lengthMm - inchesToMm(6);
      cases.push({ length: sixShorter, placement: (blank.lengthMm - sixShorter) / 2 - buffer });
      const shortest = inchesToMm(BOARD_LENGTH_RANGE_IN.min);
      const reach = (blank.lengthMm - shortest) / 2 - buffer;
      if (reach > 0) cases.push({ length: shortest, placement: reach }, { length: shortest, placement: -reach });
      for (const { length, placement } of cases) {
        const onBlank = boardOnBlank(prepared, { ...plainBoard(blank), length: mm(length) }, mm(placement));
        if (onBlank.cropMinimum > 1e-9) reLevelled++;
        // A dense 1/16" sweep, plus both ends and every blank station under the board (the only
        // places the crop's low point can sit).
        const stations = new Set<number>([0, length]);
        for (let s = 0; s <= length; s += inchesToMm(1 / 16)) stations.add(s);
        const tailOnBlank = blankStationOf(mm(0), mm(placement), mm(length), blank.lengthMm);
        for (const knot of prepared.rocker.curve.xs) {
          const s = knot - tailOnBlank;
          if (s > 0 && s < length) stations.add(s);
        }
        let lowest = Infinity;
        for (const s of stations) lowest = Math.min(lowest, onBlank.rockerAt(s));
        // Never below 0 anywhere under the board, and 0 at its low point.
        expect(Math.abs(lowest), `${blank.vendor} ${blank.name} @ ${placement}`).toBeLessThanOrEqual(1e-9);
      }
    }
    expect(reLevelled).toBeGreaterThan(0);
  });
});
