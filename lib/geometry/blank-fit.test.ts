import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLANK_CSV_COLUMNS, isPickable } from "@/lib/blanks/catalog";
import { parseCsv } from "@/lib/blanks/csv";
import { readSeedCatalog, SEED_CSV_DIR } from "@/lib/blanks/seed-files";
import type { BlankRecord, BlankStation } from "./blank";
import {
  BLANK_PLACEMENT_BUFFER_MM,
  blankStationOf,
  boardOnBlank,
  clampPlacement,
  FIT_SAMPLE_STEP_MM,
  fitAt,
  levelCurve,
  placementRange,
  prepareBlank,
  TIP_EASE_WINDOW_MM,
  type BoardOnBlank,
  type BoardOnBlankInput,
} from "./blank-fit";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { preparePchip } from "./pchip";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm, mmToInches, type Mm } from "./units";

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

  it("the fit check rejects a board thicker than the blank near the nose even when the centre fits", () => {
    const blank = findBlank(MARKO_VENDOR, M_REGULAR);
    const prepared = prepareBlank(blank);
    const noseTipCsv = csvNumber(MARKO_FILE, MARKO_VENDOR, M_REGULAR, "N0", "thickness_in");
    const board: BoardOnBlankInput = {
      ...plainBoard(blank),
      centerThickness: inchesToMm(2.5),
      tailTip: inchesToMm(1 / 4),
      noseTip: inchesToMm(noseTipCsv + 1 / 16),
    };
    const onBlank = boardOnBlank(prepared, board, mm(0));
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(board.length / 2), inchesToMm(1));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
    expect(board.length - result.worst.station).toBeLessThanOrEqual(inchesToMm(1));
    expect(result.worst.amount).toBeGreaterThan(0);
    // The centre itself fits: the board is thinner than the blank there.
    const centre = board.length / 2;
    expect(onBlank.thicknessAt(centre)).toBeLessThan(onBlank.blankThicknessAt(centre));
  });
});

/** A board outline `by` narrower than the blank under it at every station (half-width, ≥ 0). */
function narrowerBy(onBlank: BoardOnBlank, by: number) {
  return (s: Mm) => Math.max(0, (onBlank.blankWidthAt(s) - by) / 2);
}

/** Default tip settings (5/16" nose, 1/4" tail) — inputs, not expected values. */
function defaultBoard(blank: BlankRecord, length: number, centre: number): BoardOnBlankInput {
  return {
    ...plainBoard(blank),
    length: mm(length),
    centerThickness: mm(centre),
    noseTip: inchesToMm(5 / 16),
    tailTip: inchesToMm(1 / 4),
  };
}

describe("prepareBlank (R14)", () => {
  it("keeps its own copy, so changing the record afterwards changes nothing it samples", () => {
    const record = structuredClone(findBlank(MARKO_VENDOR, M_REGULAR));
    const prepared = prepareBlank(record);
    const xs = [0, 100, 500, 915, 1500, record.lengthMm];
    const before = xs.map((x) => [prepared.rocker.sample(x), prepared.thickness.sample(x), prepared.width.sample(x)]);
    record.stations[3].thicknessMm = mm(0);
    record.stations[1].rockerMm = mm(500);
    record.stations.push({ ...record.stations[0], fromTailMm: mm(record.lengthMm + 100) });
    expect(xs.map((x) => [prepared.rocker.sample(x), prepared.thickness.sample(x), prepared.width.sample(x)])).toEqual(before);
  });

  it("fits each attribute over its own stations only — a width-only row is not a rocker or thickness knot (R10)", () => {
    const blank = CATALOG.find((b) => isPickable(b) && b.stations.some((s) => s.widthMm !== null && s.thicknessMm === null))!;
    const prepared = prepareBlank(blank);
    const count = (pick: (s: BlankStation) => unknown) => blank.stations.filter((s) => pick(s) !== null).length;
    expect(prepared.thickness.xs).toHaveLength(count((s) => s.thicknessMm));
    expect(prepared.rocker.curve.xs).toHaveLength(count((s) => s.rockerMm));
    expect(prepared.width.xs).toHaveLength(count((s) => s.widthMm));
    expect(prepared.width.xs.length).toBeGreaterThan(prepared.thickness.xs.length);
  });

  it("reads the blank's own centre-station thickness", () => {
    const blank = findBlank(MARKO_VENDOR, M_REGULAR);
    expect(mmToInches(prepareBlank(blank).centerThicknessMm)).toBeCloseTo(
      csvNumber(MARKO_FILE, MARKO_VENDOR, M_REGULAR, "C", "thickness_in"),
      9,
    );
  });
});

describe("placement on the blank (R3, D-08)", () => {
  const blank = findBlank(MARKO_VENDOR, M_REGULAR);
  const Lb = blank.lengthMm;
  const csvLength = csvNumber(MARKO_FILE, MARKO_VENDOR, M_REGULAR, "C", "length_in");

  it("slides a 70\" board half the spare length less a half inch either way", () => {
    const range = placementRange(Lb, inchesToMm(70));
    const expected = (csvLength - 70) / 2 - 0.5;
    expect(mmToInches(range.max)).toBeCloseTo(expected, 9);
    expect(range.min).toBe(-range.max);
  });

  it("gives a board as long as its blank no room to slide", () => {
    expect(placementRange(Lb, Lb)).toEqual({ min: 0, max: 0 });
    expect(placementRange(Lb, mm(Lb + inchesToMm(4)))).toEqual({ min: 0, max: 0 });
  });

  it("puts the board's centre on the blank's centre at placement 0, and moves toward the nose when positive", () => {
    const L = inchesToMm(70);
    expect(blankStationOf(mm(L / 2), mm(0), L, Lb)).toBeCloseTo(Lb / 2, 9);
    expect(blankStationOf(mm(L / 2), inchesToMm(0.25), L, Lb)).toBeCloseTo(Lb / 2 + inchesToMm(0.25), 9);
  });

  it("clamps an out-of-range placement to the nearer end, and a non-finite one to centre", () => {
    const L = inchesToMm(70);
    const { min, max } = placementRange(Lb, L);
    expect(clampPlacement(inchesToMm(10), Lb, L)).toBe(max);
    expect(clampPlacement(inchesToMm(-10), Lb, L)).toBe(min);
    expect(clampPlacement(inchesToMm(0.25), Lb, L)).toBe(inchesToMm(0.25));
    expect(clampPlacement(mm(NaN), Lb, L)).toBe(0);
  });

  it("clamps a stored placement on read without changing what was passed in (Pitfall 8)", () => {
    const L = inchesToMm(70);
    const stored = inchesToMm(10);
    const onBlank = boardOnBlank(prepareBlank(blank), defaultBoard(blank, L, inchesToMm(2.5)), stored);
    expect(onBlank.placement).toBe(placementRange(Lb, L).max);
    expect(stored).toBe(inchesToMm(10));
  });
});

describe("the board's foil, scaled from the blank (D-10, D-17, D-18, D-11)", () => {
  const blank = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(blank);
  const L = inchesToMm(70);
  const centre = inchesToMm(2.5);
  const board = defaultBoard(blank, L, centre);
  const { min, max } = placementRange(blank.lengthMm, L);
  const W = TIP_EASE_WINDOW_MM;

  it("scales to the blank's thickness under the board's centre, so the centre equals the target at every placement (D-18)", () => {
    for (const p of [min, mm(0), max]) {
      const onBlank = boardOnBlank(prepared, board, p);
      expect(onBlank.ratio).toBeCloseTo(centre / onBlank.blankThicknessAt(L / 2), 12);
      expect(Math.abs(onBlank.thicknessAt(L / 2) - centre)).toBeLessThanOrEqual(1e-9);
    }
  });

  it("puts both tips exactly on their settings and leaves the 12\" stations purely blank-scaled (D-17)", () => {
    for (const p of [min, mm(0), max]) {
      const onBlank = boardOnBlank(prepared, board, p);
      expect(onBlank.thicknessAt(0)).toBe(board.tailTip);
      expect(onBlank.thicknessAt(L)).toBe(board.noseTip);
      expect(onBlank.derivedThicknessAt(W)).toBeCloseTo(onBlank.ratio * onBlank.blankThicknessAt(W), 9);
      expect(onBlank.derivedThicknessAt(L - W)).toBeCloseTo(onBlank.ratio * onBlank.blankThicknessAt(L - W), 9);
    }
  });

  it("is continuous across both 12\" stations", () => {
    const onBlank = boardOnBlank(prepared, board, mm(0));
    for (const s of [W, L - W]) {
      expect(Math.abs(onBlank.thicknessAt(s - 1e-6) - onBlank.thicknessAt(s + 1e-6))).toBeLessThanOrEqual(1e-6);
    }
  });

  it("never dips below a tip setting inside that tip's window", () => {
    const thickTips = { ...board, noseTip: inchesToMm(1), tailTip: inchesToMm(1) };
    const onBlank = boardOnBlank(prepared, thickTips, mm(0));
    for (let s = 0; s <= W; s += inchesToMm(1 / 16)) {
      expect(onBlank.thicknessAt(s)).toBeGreaterThanOrEqual(thickTips.tailTip);
      expect(onBlank.thicknessAt(L - s)).toBeGreaterThanOrEqual(thickTips.noseTip);
    }
  });

  it("adds a 12\" fine-tune exactly at its station, leaving tips and centre alone, at any placement (D-11)", () => {
    const offset = inchesToMm(1 / 16);
    for (const p of [min, mm(0), max]) {
      const plain = boardOnBlank(prepared, board, p);
      const tuned = boardOnBlank(prepared, { ...board, nose12Offset: offset }, p);
      expect(tuned.thicknessAt(L - W)).toBe(tuned.derivedThicknessAt(L - W) + offset);
      expect(tuned.thicknessAt(0)).toBe(plain.thicknessAt(0));
      expect(tuned.thicknessAt(L)).toBe(plain.thicknessAt(L));
      expect(tuned.thicknessAt(L / 2)).toBe(plain.thicknessAt(L / 2));
      expect(tuned.thicknessAt(W)).toBe(plain.thicknessAt(W));
    }
    const tail = boardOnBlank(prepared, { ...board, tail12Offset: mm(-offset) }, mm(0));
    expect(tail.thicknessAt(W)).toBe(tail.derivedThicknessAt(W) - offset);
  });

  it("lets the fit check see the fine-tune: enough extra foam at the nose 12\" turns a fitting board into a thin failure there", () => {
    const outline = (onBlank: BoardOnBlank) => narrowerBy(onBlank, inchesToMm(2));
    const plain = boardOnBlank(prepared, board, mm(0));
    expect(fitAt(plain, outline(plain), mm(L / 2), inchesToMm(1)).fits).toBe(true);
    const spare = plain.blankThicknessAt(L - W) - plain.derivedThicknessAt(L - W);
    const tuned = boardOnBlank(prepared, { ...board, nose12Offset: mm(spare + inchesToMm(1 / 16)) }, mm(0));
    const result = fitAt(tuned, outline(tuned), mm(L / 2), inchesToMm(1));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
    expect(Math.abs(result.worst.station - (L - W))).toBeLessThanOrEqual(inchesToMm(1));
  });

  it("never goes below zero, holds the centre and keeps both tips on or above their settings on every pickable blank (R13)", () => {
    const quarter = inchesToMm(1 / 4);
    let boards = 0;
    const problems: string[] = [];
    for (const record of CATALOG.filter(isPickable)) {
      const blankPrepared = prepareBlank(record);
      const lengths = [record.lengthMm, Math.max(record.lengthMm - inchesToMm(6), inchesToMm(BOARD_LENGTH_RANGE_IN.min))];
      for (const length of lengths) {
        const range = placementRange(record.lengthMm, mm(length));
        for (let c: number = inchesToMm(1.75); c <=blankPrepared.centerThicknessMm - inchesToMm(3 / 8) + 1e-9; c += quarter) {
          const input = defaultBoard(record, length, c);
          for (const p of [range.min, mm(0), range.max]) {
            boards++;
            const onBlank = boardOnBlank(blankPrepared, input, p);
            const where = `${record.vendor} ${record.name} L=${length} c=${c} p=${p}`;
            if (Math.abs(onBlank.thicknessAt(length / 2) - c) > 1e-9) problems.push(`${where}: centre`);
            for (let s = 0; s <= length; s += quarter) {
              const t = onBlank.thicknessAt(s);
              if (t < 0) problems.push(`${where}: below zero at ${s}`);
              if (s <= TIP_EASE_WINDOW_MM && t < input.tailTip) problems.push(`${where}: under tail tip at ${s}`);
              if (s >= length - TIP_EASE_WINDOW_MM && t < input.noseTip) problems.push(`${where}: under nose tip at ${s}`);
            }
          }
        }
      }
    }
    expect(boards).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});

describe("the fit check (R12, D-05)", () => {
  const blank = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(blank);
  const L = blank.lengthMm;
  const margin = inchesToMm(1);

  it("passes the M-Regular at full length with default tips and an outline 2\" narrower everywhere", () => {
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, L, inchesToMm(2.5)), mm(0));
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(L / 2), margin);
    expect(result.fits).toBe(true);
    expect(result.worst.amount).toBeLessThanOrEqual(0);
  });

  it("fails wide by the missing clearance where the board is only 1/2\" narrower than the blank", () => {
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, L, inchesToMm(2.5)), mm(0));
    const tight = L / 2;
    const narrow = narrowerBy(onBlank, inchesToMm(2));
    const halfWidthAt = (s: Mm) => (s === tight ? onBlank.blankWidthAt(s) / 2 - inchesToMm(1 / 4) : narrow(s));
    const result = fitAt(onBlank, halfWidthAt, mm(tight), margin);
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("wide");
    expect(result.worst.station).toBe(tight);
    expect(result.worst.amount).toBeCloseTo(margin - inchesToMm(1 / 2), 9);
  });

  it("never checks width where the board has none — a rounded-nose blank's zero-width tip is not a failure", () => {
    const rounded = CATALOG.find((b) => isPickable(b) && b.stations[b.stations.length - 1].widthMm === 0)!;
    expect(rounded).toBeDefined();
    const roundedPrepared = prepareBlank(rounded);
    const Lr = rounded.lengthMm;
    const first = rounded.stations[0].thicknessMm!;
    const last = rounded.stations[rounded.stations.length - 1].thicknessMm!;
    const input: BoardOnBlankInput = {
      ...defaultBoard(rounded, Lr, roundedPrepared.centerThicknessMm - inchesToMm(1 / 2)),
      tailTip: mm(first / 2),
      noseTip: mm(last / 2),
    };
    const onBlank = boardOnBlank(roundedPrepared, input, mm(0));
    expect(onBlank.blankWidthAt(Lr)).toBe(0);
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(Lr / 2), margin);
    expect(result.fits).toBe(true);
  });

  it("fails a board longer than its blank, where there is no foam at all (Pitfall 8)", () => {
    const longer = mm(L + inchesToMm(2));
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, longer, inchesToMm(2.5)), mm(0));
    expect(onBlank.blankThicknessAt(0)).toBe(0);
    expect(onBlank.blankWidthAt(longer)).toBe(0);
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(longer / 2), margin);
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
  });

  it("samples every quarter inch", () => {
    expect(FIT_SAMPLE_STEP_MM).toBe(inchesToMm(1 / 4));
    expect(BLANK_PLACEMENT_BUFFER_MM).toBe(inchesToMm(1 / 2));
  });
});
